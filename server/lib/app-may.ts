// Danh sách APP ĐÃ CÀI THẬT trên từng máy Con (Thanh 25/10: «danh sách ứng dụng load trực tiếp từ máy thực tế để phụ huynh chọn đúng app
// muốn chặn, không chặn chủ quan từ trên app xuống»). Agent quét máy (Windows: registry Uninstall + Start Menu + gói Store của tài khoản Con ·
// macOS: /Applications + ~/Applications · Android: app có biểu tượng) rồi gửi lên `POST /api/device/ung-dung` — đủ hoặc phần đổi.
// Ba Mẹ mở «Ứng dụng trên máy <tên>» (GET /api/m/may/<id>/ung-dung), chọn Cho phép / Học tập / Giải trí / Chặn cho từng app: máy chủ lấy
// `muc` THẬT từ danh sách của máy (tên exe chính / tên gói Store / bundle id / package) — không tin chữ app gửi — rồi ghi luật như luồng xếp loại
// cũ (app_rules). Agent Windows/Mac nhận thêm `windows.blockedApps` (đường dẫn, thư mục cài, SHA-256, Team ID của chính máy đó) để chặn đúng app.
// Hợp đồng: docs/API.md › «Danh sách app thật».
import { createHash } from "node:crypto";
import { one, q, tx, type Q } from "./db.ts";
import type { May } from "./gia-dinh.ts";
import { LoiNghiepVu } from "./loi.ts";
import { allowlistHieuLuc, datLuat, dsLuat, khoaSo, luatHienCo, xoaLuat, NHOM_GT, type LoaiMuc, type NhomGiaiTri } from "./luat-app.ts";
import { kieuMuc } from "./chinh-sach.ts";

export const TOI_DA_APP = 1500;
export const TOI_DA_ICON = 16_384;       // ký tự base64 (~12 KB PNG) — icon 32–48 px thường 1–5 KB
const NGUON = new Set(["registry", "start", "store", "applications", "user-applications", "launcher"]);
const BAM = /^[0-9a-f]{16,128}$/i;
const HEX64 = /^[0-9a-f]{64}$/i;
const B64 = /^[A-Za-z0-9+/]+=*$/;

export type AppVao = {
  khoa?: unknown; muc?: unknown; ten?: unknown; nguon?: unknown; nhaPhatHanh?: unknown; teamId?: unknown;
  duongDan?: unknown; thuMuc?: unknown; phienBan?: unknown; sha256?: unknown; icon?: unknown;
};
type AppSach = {
  khoa: string; muc: string; ten: string; nguon: string | null; nha_phat_hanh: string | null; team_id: string | null;
  duong_dan: string | null; thu_muc: string | null; phien_ban: string | null; sha256: string | null; icon: string | null;
};
export type DongApp = AppSach & { device_id: string; thay_luc: Date };

const chu = (v: unknown, n = 300) => {
  const t = String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
  return t ? t.slice(0, n) : null;
};

/** Mục để xếp / chặn: chữ thường (như app_rules.muc), không khoảng trắng, không «/» — Android/Mac/Windows đều thoả. */
export function mucApp(v: unknown, giuHoa = false): string | null {
  const g = String(v ?? "").trim();
  const t = g.toLowerCase();
  return /^[a-z0-9][a-z0-9 ._()+\-]{0,199}$/.test(t) && !t.includes("..") ? (giuHoa ? g : t) : null;
}

/** Làm sạch một app agent gửi; sai ⇒ null (bỏ qua, không làm hỏng cả lô). */
/** `giuHoa`: máy Android — package phân biệt hoa thường (com.UCMobile.intl) ⇒ giữ nguyên `muc` và `khoa`; so luật vẫn không phân biệt. */
export function sachApp(a: AppVao, giuHoa = false): AppSach | null {
  if (!a || typeof a !== "object") return null;
  const k = chu(a.khoa, 300);
  const khoa = giuHoa ? k : k?.toLowerCase();
  const muc = mucApp(a.muc, giuHoa);
  const ten = chu(a.ten, 120);
  if (!khoa || !muc || !ten) return null;
  const icon = typeof a.icon === "string" && a.icon.length <= TOI_DA_ICON && B64.test(a.icon) ? a.icon : null;
  const sha = typeof a.sha256 === "string" && HEX64.test(a.sha256) ? a.sha256.toLowerCase() : null;
  const team = chu(a.teamId, 20);
  return {
    khoa, muc, ten, nguon: NGUON.has(String(a.nguon)) ? String(a.nguon) : null, nha_phat_hanh: chu(a.nhaPhatHanh, 160),
    team_id: team && /^[A-Z0-9]{4,20}$/i.test(team) ? team.toUpperCase() : null,
    duong_dan: chu(a.duongDan, 400), thu_muc: chu(a.thuMuc, 400), phien_ban: chu(a.phienBan, 60), sha256: sha, icon,
  };
}

const COT = ["khoa", "muc", "ten", "nguon", "nha_phat_hanh", "team_id", "duong_dan", "thu_muc", "phien_ban", "sha256", "icon"] as const;

async function ghiApp(t: Q, mayId: string, ds: AppSach[]) {
  // gộp trùng khoa trong một lô (bản sau thắng) rồi ghi theo khúc 200 dòng (giới hạn tham số của Postgres: 65535)
  const theoKhoa = new Map(ds.map((a) => [a.khoa, a]));
  const tat = [...theoKhoa.values()];
  for (let i = 0; i < tat.length; i += 200) {
    const khuc = tat.slice(i, i + 200);
    const ts: unknown[] = [mayId];
    const vals = khuc.map((a) => `($1, ${COT.map((c) => { ts.push(a[c]); return `$${ts.length}`; }).join(", ")}, now())`);
    await t(`insert into app_may(device_id, ${COT.join(", ")}, thay_luc) values ${vals.join(", ")}
             on conflict (device_id, khoa) do update set ${COT.filter((c) => c !== "khoa").map((c) => `${c} = excluded.${c}`).join(", ")}, thay_luc = now()`, ts);
  }
  return tat.length;
}

/** Agent gửi danh sách app (đủ hoặc phần đổi). Phần đổi chỉ nhận khi `bamTruoc` khớp bam máy chủ đang giữ — lệch ⇒ 409 «can_gui_du». */
export async function nhanDanhSachApp(may: May, b: Record<string, unknown>) {
  const bam = typeof b.bam === "string" && BAM.test(b.bam) ? b.bam.toLowerCase() : null;
  if (!bam) throw new LoiNghiepVu("bam_sai", "Thiếu mã băm danh sách app", 400);
  const du = b.du === true;
  const giuHoa = may.platform === "android";
  const lay = (v: unknown) => (Array.isArray(v) ? v : []).slice(0, TOI_DA_APP).map((x) => sachApp(x as AppVao, giuHoa)).filter((x): x is AppSach => !!x);
  return tx(async (t) => {
    // khoá theo máy: hai lượt gửi chồng nhau (dịch vụ khởi động lại) không đan xen xoá/ghi
    await t(`select pg_advisory_xact_lock(hashtext($1))`, [`app-may:${may.id}`]);
    const cu = (await t<{ app_bam: string | null }>(`select app_bam from devices where id = $1`, [may.id]))[0];
    if (du) {
      const ds = lay(b.ds);
      await t(`delete from app_may where device_id = $1`, [may.id]);
      await ghiApp(t, may.id, ds);
    } else {
      const truoc = typeof b.bamTruoc === "string" ? b.bamTruoc.toLowerCase() : "";
      if (!cu?.app_bam || cu.app_bam !== truoc) throw new LoiNghiepVu("can_gui_du", "Máy chủ cần danh sách đầy đủ", 409);
      const bo = (Array.isArray(b.bo) ? b.bo : []).slice(0, TOI_DA_APP).map((x) => (giuHoa ? chu(x, 300) : chu(x, 300)?.toLowerCase())).filter((x): x is string => !!x);
      if (bo.length) await t(`delete from app_may where device_id = $1 and khoa = any($2::text[])`, [may.id, bo]);
      await ghiApp(t, may.id, lay(b.them));
      // vượt trần sau khi cộng phần đổi ⇒ đòi gửi đủ (danh sách đủ đã cắt ở TOI_DA_APP)
      const n = (await t<{ n: number }>(`select count(*)::int as n from app_may where device_id = $1`, [may.id]))[0].n;
      if (n > TOI_DA_APP) throw new LoiNghiepVu("can_gui_du", "Máy chủ cần danh sách đầy đủ", 409);
    }
    await t(`update devices set app_bam = $2, app_luc = now() where id = $1`, [may.id, bam]);
    const n = (await t<{ n: number }>(`select count(*)::int as n from app_may where device_id = $1`, [may.id]))[0].n;
    return { ok: true, bam, soApp: n };
  });
}

/** Tín hiệu cho agent trong phản hồi dong-bo / nhip: bam máy chủ đang giữ + yêu cầu «Làm mới» của Ba Mẹ (chuỗi mờ, đổi mỗi lần bấm). */
export async function tinHieuDanhSachApp(mayId: string) {
  const r = await one<{ app_bam: string | null; app_yeu_cau: Date | null }>(`select app_bam, app_yeu_cau from devices where id = $1`, [mayId]);
  return { bam: r?.app_bam ?? null, yeuCau: r?.app_yeu_cau ? new Date(r.app_yeu_cau).toISOString() : null };
}

type LuatGon = { child_id: string; muc: string; loai: LoaiMuc; nhom: string; ten?: string; het?: Date | null };
export type TrangThaiApp = "he_thong" | "cho_phep" | "hoc" | "giai_tri" | "chan" | "chua_xep";

/** Trạng thái của một app trên máy của Con `con` ('' = máy dùng chung ⇒ chỉ luật cả nhà) — cùng thứ tự với phanLoai:
 *  Allowlist hệ thống → luật riêng của Con → luật cả nhà. */
export function trangThaiApp(mucTho: string, con: string, luat: LuatGon[], allow: string[] = allowlistHieuLuc()) {
  const khoa = khoaSo(mucTho.toLowerCase());
  if (khoa.some((k) => allow.includes(k))) return { trangThai: "he_thong" as TrangThaiApp, nhom: null, theoCaNha: false };
  const r = luat.filter((l) => khoa.includes(l.muc) && (l.child_id === "" || (con && l.child_id === con)))
    .sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0))[0];
  if (!r) return { trangThai: "chua_xep" as TrangThaiApp, nhom: null, theoCaNha: false };
  const tt: TrangThaiApp = r.loai === "hoc" ? (r.nhom === "cho_phep" ? "cho_phep" : "hoc") : r.loai;
  return { trangThai: tt, nhom: r.loai === "giai_tri" ? r.nhom : null, theoCaNha: !r.child_id && !!con, tamThoi: !!r.het };
}

async function mayCua(fam: string, mayId: string) {
  const may = await one<May & { app_luc: Date | null; app_yeu_cau: Date | null }>(`select * from devices where id = $1 and family_id = $2`, [mayId, fam]);
  if (!may) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  return may;
}

/** Màn «Ứng dụng trên máy <tên>» của Ba Mẹ. */
export async function dsAppMay(fam: string, mayId: string) {
  const may = await mayCua(fam, mayId);
  const [rows, luat] = await Promise.all([
    q<DongApp>(`select * from app_may where device_id = $1 order by lower(ten), khoa`, [may.id]),
    dsLuat(fam),
  ]);
  const con = may.dung_chung ? "" : may.child_id ?? "";
  const allow = allowlistHieuLuc();
  return {
    may: { id: may.id, ten: may.name, nen: may.platform, dungChung: may.dung_chung, con: con || null },
    capNhatLuc: may.app_luc ? new Date(may.app_luc).toISOString() : null,
    yeuCauLuc: may.app_yeu_cau ? new Date(may.app_yeu_cau).toISOString() : null,
    ds: rows.map((a) => ({
      khoa: a.khoa, muc: a.muc, ten: a.ten, nguon: a.nguon, nhaPhatHanh: a.nha_phat_hanh, teamId: a.team_id, duongDan: a.duong_dan,
      phienBan: a.phien_ban, icon: a.icon, ...trangThaiApp(a.muc, con, luat, allow),
    })),
  };
}

export const TRANG_THAI_DAT = ["cho_phep", "hoc", "giai_tri", "chan", "bo"] as const;

/** Ba Mẹ đặt trạng thái một app CỦA MÁY NÀY (theo `khoa` trong danh sách máy gửi). Máy riêng của Con ⇒ luật riêng của Con đó; máy dùng chung ⇒ luật cả nhà.
 *  «bo» = bỏ luật (về «chưa xếp»). Trả luật cũ để app «Hoàn tác». */
export async function datTrangThaiApp(fam: string, mayId: string, b: Record<string, unknown>) {
  const may = await mayCua(fam, mayId);
  const tt = String(b.trangThai ?? "");
  if (!(TRANG_THAI_DAT as readonly string[]).includes(tt)) throw new LoiNghiepVu("trang_thai_sai", "Chọn Cho phép, Học tập, Giải trí hoặc Chặn");
  const app = await one<DongApp>(`select * from app_may where device_id = $1 and khoa = $2`, [may.id, may.platform === "android" ? String(b.khoa ?? "") : String(b.khoa ?? "").toLowerCase()]);
  if (!app) throw new LoiNghiepVu("khong_thay_app", "Máy này không còn app đó — bấm Làm mới để lấy danh sách mới", 404);
  const con = may.dung_chung ? "" : may.child_id ?? "";
  return tx(async (t) => {
    const truoc = await luatHienCo(fam, con, app.muc, t, true);
    if (tt === "bo") await xoaLuat(fam, { con, muc: app.muc }, t);
    else {
      const nhom = tt === "cho_phep" ? "cho_phep" : tt === "giai_tri" ? ((NHOM_GT as string[]).includes(String(b.nhom)) ? String(b.nhom) : "game") : "khac";
      await datLuat(fam, { con, muc: app.muc, ten: app.ten, loai: tt === "cho_phep" ? "hoc" : tt, nhom }, t);
    }
    return { muc: app.muc, con, truoc: truoc && { con, muc: truoc.muc, ten: truoc.ten, loai: truoc.loai, nhom: truoc.nhom, het: truoc.het } };
  });
}

/** Ba Mẹ bấm «Làm mới»: lần đồng bộ kế agent thấy `danhSachApp.yeuCau` đổi ⇒ quét + gửi đủ. */
export async function yeuCauLamMoi(fam: string, mayId: string) {
  const may = await mayCua(fam, mayId);
  const r = await one<{ app_yeu_cau: Date }>(`update devices set app_yeu_cau = now() where id = $1 returning app_yeu_cau`, [may.id]);
  return { yeuCauLuc: new Date(r!.app_yeu_cau).toISOString() };
}

/** Mọi `muc` app thật của cả nhà (chữ thường) — để biết «microsoft.minecraftuwp», «ru.keepcoder.telegram»… là APP chứ không phải tên miền. */
export async function mucAppThat(fam: string): Promise<Set<string>> {
  const r = await q<{ muc: string }>(`select distinct a.muc from app_may a join devices d on d.id = a.device_id where d.family_id = $1`, [fam]);
  return new Set(r.map((x) => x.muc.toLowerCase()));
}

/** Package Android đúng hoa thường (luật lưu chữ thường) — chữ thường ⇒ package thật trên máy của cả nhà. */
export async function goiAndroidThat(fam: string): Promise<Map<string, string>> {
  const r = await q<{ muc: string }>(`select distinct a.muc from app_may a join devices d on d.id = a.device_id where d.family_id = $1 and d.platform = 'android' and a.muc <> lower(a.muc)`, [fam]);
  return new Map(r.map((x) => [x.muc.toLowerCase(), x.muc]));
}

export type AppChan = { muc: string; duongDan?: string; thuMuc?: string; sha256?: string; nhaPhatHanh?: string; teamId?: string };

/** `windows.blockedApps` cho agent Win/Mac: app Ba Mẹ đặt Chặn (luật hiệu lực của Con dùng máy / cả nhà), kèm định danh thật lấy từ danh sách
 *  app của CHÍNH MÁY NÀY. Luật Chặn không có trong danh sách (xếp ở màn cũ / app chưa cài) ⇒ chỉ `muc` (Windows: .exe; Mac: bundle id). */
export async function appChanCuaMay(may: Pick<May, "id" | "family_id" | "platform" | "dung_chung" | "child_id">, con: string | null): Promise<AppChan[]> {
  if (may.platform !== "windows" && may.platform !== "mac") return [];
  const ai = may.dung_chung ? con ?? "" : may.child_id ?? con ?? "";
  const [luat, rows] = await Promise.all([dsLuat(may.family_id), q<DongApp>(`select * from app_may where device_id = $1`, [may.id])]);
  const allow = allowlistHieuLuc();
  const ra = new Map<string, AppChan>();
  for (const a of rows) {
    if (trangThaiApp(a.muc, ai, luat, allow).trangThai !== "chan") continue;
    ra.set(a.khoa, { muc: a.muc, ...(a.duong_dan ? { duongDan: a.duong_dan } : {}), ...(a.thu_muc ? { thuMuc: a.thu_muc } : {}),
      ...(a.sha256 ? { sha256: a.sha256 } : {}), ...(a.nha_phat_hanh ? { nhaPhatHanh: a.nha_phat_hanh } : {}), ...(a.team_id ? { teamId: a.team_id } : {}) });
  }
  const coMuc = new Set([...ra.values()].map((x) => x.muc));
  const laAppNen = (m: string) => (may.platform === "windows" ? m.endsWith(".exe") : kieuMuc(m) === "app" && !m.endsWith(".exe"));
  for (const l of luat) {
    if (l.loai !== "chan" || coMuc.has(l.muc) || !laAppNen(l.muc)) continue;
    if (trangThaiApp(l.muc, ai, luat, allow).trangThai !== "chan") continue;     // luật riêng của Con mở lại app cả nhà chặn
    coMuc.add(l.muc);
    ra.set(`muc:${l.muc}`, { muc: l.muc });
  }
  return [...ra.values()].slice(0, 500);
}

/** Tên thật của app trên máy cho các mục (luồng «Chưa xếp» / «Đã thấy» cũ hiện tên đúng thay vì tên đoán từ tệp). */
export async function tenAppThat(fam: string): Promise<Map<string, string>> {
  const r = await q<{ muc: string; ten: string }>(
    `select distinct on (lower(a.muc)) lower(a.muc) as muc, a.ten from app_may a join devices d on d.id = a.device_id where d.family_id = $1 order by lower(a.muc), a.thay_luc desc`, [fam]);
  return new Map(r.map((x) => [x.muc, x.ten]));
}

/** Băm tham khảo (agent tự định nghĩa bam của mình; máy chủ chỉ so chuỗi) — dùng trong test. */
export const bamThamKhao = (ds: { khoa: string }[]) => createHash("sha256").update(ds.map((x) => JSON.stringify(x)).sort().join("\n")).digest("hex");

export type { NhomGiaiTri };
