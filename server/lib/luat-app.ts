// Phân loại ứng dụng / website (FR-02.01–02.03): Allowlist hệ thống (Admin, Ba Mẹ không bỏ được) → luật riêng của Con → luật gia đình.
// Chưa phân loại ⇒ CHẶN, gợi ý «Xin phép Ba Mẹ» (an toàn mặc định). Website so theo tên miền, gồm cả tên miền con (m.youtube.com ⇒ youtube.com).
import { q, one, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export type LoaiMuc = "hoc" | "giai_tri" | "chan";
export type NhomGiaiTri = "game" | "video_ngan" | "mxh" | "phim_gd" | "khac";
export const NHOM_GT: NhomGiaiTri[] = ["game", "video_ngan", "mxh", "phim_gd", "khac"];

/** Allowlist hệ thống mặc định (Phụ lục B, trích) — định danh thấp: tên tệp chạy Windows/macOS, gói Android, tên miền. */
export const ALLOWLIST_HE_THONG: string[] = [
  // Windows
  "explorer.exe", "systemsettings.exe", "calculatorapp.exe", "calc.exe", "notepad.exe", "mspaint.exe", "photos.exe", "windowscamera.exe",
  "snippingtool.exe", "taskmgr.exe", "winword.exe", "excel.exe", "powerpnt.exe", "onenote.exe", "ms-teams.exe", "teams.exe",
  "aiigrow.kid.exe", "aiigrow.tray.exe",
  // macOS
  "com.apple.finder", "com.apple.systempreferences", "com.apple.calculator", "com.apple.notes", "com.apple.preview", "com.apple.photos",
  "com.microsoft.word", "com.microsoft.excel", "com.microsoft.powerpoint", "com.apple.iwork.pages", "com.apple.iwork.numbers", "com.apple.iwork.keynote",
  // Android
  "com.android.settings", "com.google.android.calculator", "com.google.android.deskclock", "com.google.android.apps.docs",
  "com.google.android.apps.docs.editors.docs", "com.google.android.apps.docs.editors.sheets", "com.google.android.apps.docs.editors.slides",
  "com.microsoft.office.word", "com.microsoft.office.excel", "vn.aiilab.aiigrow",
  // web học tập + AiiRob
  "aiirob.aiilab.vn", "aiilab.vn", "classroom.google.com", "docs.google.com", "office.com", "teams.microsoft.com", "zoom.us",
];

/** Chuẩn hoá: chữ thường; URL ⇒ tên miền không «www.». */
export function chuanMuc(s: unknown): string {
  let t = String(s ?? "").trim().toLowerCase();
  if (!t) return "";
  if (/^[a-z]+:\/\//.test(t) || (/\.[a-z]{2,}(\/|$)/.test(t) && !t.endsWith(".exe") && !/^[a-z0-9_]+(\.[a-z0-9_]+){2,}$/.test(t) && t.includes("/"))) {
    try { t = new URL(t.includes("://") ? t : `https://${t}`).hostname; } catch { /* giữ nguyên */ }
  }
  return t.replace(/^www\./, "").slice(0, 200);
}

/** Các khoá để so: chính mục + các tên miền cha (a.b.youtube.com ⇒ b.youtube.com ⇒ youtube.com). */
function khoaSo(muc: string) {
  const ds = [muc];
  if (muc.includes(".") && !muc.endsWith(".exe")) {
    const p = muc.split(".");
    for (let i = 1; i < p.length - 1; i++) ds.push(p.slice(i).join("."));
  }
  return ds;
}

export type KetQuaLuat = { loai: LoaiMuc | "he_thong" | "chua_phan_loai"; nhom: NhomGiaiTri | null; nguon: "he_thong" | "con" | "gia_dinh" | null };

export async function phanLoai(fam: string, con: string, mucTho: unknown, t: Q = q): Promise<KetQuaLuat> {
  const muc = chuanMuc(mucTho);
  const khoa = khoaSo(muc);
  if (khoa.some((k) => ALLOWLIST_HE_THONG.includes(k))) return { loai: "he_thong", nhom: null, nguon: "he_thong" };
  const ds = await t<{ child_id: string; muc: string; loai: LoaiMuc; nhom: NhomGiaiTri }>(
    `select child_id, muc, loai, nhom from app_rules where family_id = $1 and child_id in ('', $2) and muc = any($3::text[]) and (het is null or het > now())`,
    [fam, con, khoa]);
  // khớp cụ thể hơn thắng (mục dài hơn), luật riêng của Con thắng luật gia đình
  ds.sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0));
  const r = ds[0];
  return r ? { loai: r.loai, nhom: r.loai === "giai_tri" ? r.nhom : null, nguon: r.child_id ? "con" : "gia_dinh" } : { loai: "chua_phan_loai", nhom: null, nguon: null };
}

/** Ba Mẹ phân loại (FR-02.02). `con` '' = cả gia đình. `het` = hết hạn (phê duyệt Lần này / Hôm nay). */
export async function datLuat(fam: string, b: { con?: string; muc: unknown; ten?: unknown; loai: unknown; nhom?: unknown; het?: Date | null }, t: Q = q) {
  const muc = chuanMuc(b.muc);
  if (!muc) throw new LoiNghiepVu("thieu_muc", "Thiếu tên ứng dụng hoặc website");
  if (khoaSo(muc).some((k) => ALLOWLIST_HE_THONG.includes(k))) throw new LoiNghiepVu("he_thong", "Mục này thuộc danh sách hệ thống, luôn được dùng", 409);
  const loai = ["hoc", "giai_tri", "chan"].includes(String(b.loai)) ? String(b.loai) : null;
  if (!loai) throw new LoiNghiepVu("loai_sai", "Chọn Học tập, Giải trí hoặc Chặn");
  const nhom = (NHOM_GT as string[]).includes(String(b.nhom)) ? String(b.nhom) : "khac";
  const con = b.con ?? "";
  if (con && !(await t(`select 1 from children where id = $1 and family_id = $2`, [con, fam])).length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  await t(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom, het) values ($1,$2,$3,$4,$5,$6,$7)
           on conflict (family_id, child_id, muc) do update set ten = excluded.ten, loai = excluded.loai, nhom = excluded.nhom, het = excluded.het`,
    [fam, con, muc, String(b.ten ?? muc).slice(0, 80), loai, nhom, b.het ?? null]);
  return muc;
}

export const dsLuat = (fam: string) =>
  q<{ child_id: string; muc: string; ten: string; loai: LoaiMuc; nhom: NhomGiaiTri; het: Date | null }>(
    `select child_id, muc, ten, loai, nhom, het from app_rules where family_id = $1 and (het is null or het > now()) order by ten`, [fam]);
