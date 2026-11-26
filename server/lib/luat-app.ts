// Phân loại ứng dụng / website (FR-02.01–02.03): Allowlist hệ thống (Admin, Ba Mẹ không bỏ được) → luật riêng của Con → luật gia đình.
// Website so theo tên miền, gồm cả tên miền con (m.youtube.com ⇒ youtube.com).
// #262 (15/11): app_rules chính là DANH SÁCH TRẮNG của Con — loai «giai_tri» = nhóm «Tính phút», «hoc» = «Không tính phút». Không còn luật «chan»
// (dữ liệu cũ đã xoá — schema.ts › SCHEMA_APP_WEB); ghi «chan» từ app cũ = BỎ mục khỏi danh sách. Ngoài danh sách ⇒ «chua_phan_loai»:
// «Theo danh sách» không mở (Con «Xin Ba Mẹ mở»), «Mở hết» mở.
import { q, one, type Q } from "./db.ts";
import { heThong } from "./he-thong.ts";
import { LoiNghiepVu } from "./loi.ts";

/** «chan» chỉ còn trong kiểu để đọc dữ liệu / lời gọi cũ — không ghi mới.
 *  «loai_tru» (#262): luật RIÊNG một Con đè luật cả nhà cùng mục — «mục này không nằm trong danh sách của Con này» (luật cả nhà vẫn giữ cho máy
 *  dùng chung chưa chọn Con + Con tạo sau). Mọi chỗ đọc coi như «chưa xếp». */
export type LoaiMuc = "hoc" | "giai_tri" | "chan" | "loai_tru";
export const LOAI_TRU = "loai_tru";
export type NhomGiaiTri = "game" | "video_ngan" | "mxh" | "phim_gd" | "khac";
export const NHOM_GT: NhomGiaiTri[] = ["game", "video_ngan", "mxh", "phim_gd", "khac"];

/** Allowlist hệ thống mặc định (Phụ lục B, trích) — định danh thấp: tên tệp chạy Windows/macOS, gói Android, tên miền. */
export const ALLOWLIST_HE_THONG: string[] = [
  // Windows
  "explorer.exe", "systemsettings.exe", "calculatorapp.exe", "calc.exe", "notepad.exe", "mspaint.exe", "photos.exe", "microsoft.photos.exe", "windowscamera.exe",
  "snippingtool.exe", "taskmgr.exe", "winword.exe", "excel.exe", "powerpnt.exe", "onenote.exe", "ms-teams.exe", "teams.exe",
  "aiigrow.kid.exe", "aiigrow.tray.exe",
  // gõ tiếng Việt + hỗ trợ từ xa của AiiLab (Thanh 22/10): không bị đóng khi Chặn thật
  "unikey.exe", "tvnserver.exe", "tailscale-ipn.exe",
  // macOS
  "com.apple.finder", "com.apple.systempreferences", "com.apple.calculator", "com.apple.notes", "com.apple.preview", "com.apple.photos",
  "com.microsoft.word", "com.microsoft.excel", "com.microsoft.powerpoint", "com.apple.iwork.pages", "com.apple.iwork.numbers", "com.apple.iwork.keynote",
  // hỗ trợ từ xa của AiiLab trên Mac (như tailscale-ipn.exe / tvnserver.exe bên Windows); bộ gõ tiếng Việt Mac miễn theo đường dẫn Input Methods trong tác tử
  "io.tailscale.ipn.macsys", "io.tailscale.ipn.macos", "com.teamviewer.teamviewer", "com.teamviewer.teamviewer.agent",
  // Android
  "com.android.settings", "com.google.android.calculator", "com.google.android.deskclock", "com.google.android.apps.docs",
  "com.google.android.apps.docs.editors.docs", "com.google.android.apps.docs.editors.sheets", "com.google.android.apps.docs.editors.slides",
  "com.microsoft.office.word", "com.microsoft.office.excel", "vn.aiilab.aiigrow",
  // #418: app Con Android (khay Mac báo bundle vn.aiilab.aiigrow ở trên; khay cũ Windows «aiigrow.tray.exe.cu-…» xét theo mẫu: laAppAiiGrow)
  "vn.aiilab.aiigrow.con",
  // web học tập + AiiRob
  "aiirob.aiilab.vn", "aiilab.vn", "classroom.google.com", "docs.google.com", "office.com", "teams.microsoft.com", "zoom.us",
];

/** #418: mục là CHÍNH AiiGrow — không phải app Con dùng: không ghi «đã dùng», không thành «app mới chờ Ba Mẹ xếp», không trừ sao.
 *  Windows: khay / app Con, kể cả khay cũ bộ cập nhật đổi tên «AiiGrow.Tray.exe.cu-xxxxxxxx» (agent báo «aiigrow.tray.exe.cu-623a59b6.exe») mà vẫn
 *  chạy tới lần đăng nhập sau. ĐÚNG các tên này — cùng luật agent-win AppAiiGrow (UsageTracker.cs; agent mới còn kiểm tệp nằm trong thư mục cài).
 *  Máy chủ không thấy đường dẫn: game đổi tên «AiiGrow.Tray.exe.cu-…» không bị máy chủ trừ sao — CÙNG lỗ với «AiiGrow.Tray.exe» vốn đã ở
 *  ALLOWLIST_HE_THONG (agent mới vẫn không gộp tệp ngoài thư mục cài khi đếm quỹ phút tại máy); không rộng hơn lỗ cũ. Mac / Android: bundle / gói đúng tên ở ALLOWLIST_HE_THONG (vn.aiilab.aiigrow, vn.aiilab.aiigrow.con). */
const APP_AIIGROW_WIN = /^aiigrow\.(tray|kid)\.exe(\.cu-[0-9a-f]+\.exe)?$/;
export function laAppAiiGrow(mucTho: unknown) {
  const m = String(mucTho ?? "").trim().toLowerCase();
  return APP_AIIGROW_WIN.test(m) || m === "vn.aiilab.aiigrow" || m === "vn.aiilab.aiigrow.con";
}
/** #418: khay CŨ Windows «aiigrow.tray.exe.cu-<hex>.exe» — tên lạ, máy chưa cập nhật còn báo; tên thường của AiiGrow vẫn ghi «đã dùng» dạng hệ thống. */
export const laKhayCuAiiGrow = (mucTho: unknown) => laAppAiiGrow(mucTho) && String(mucTho).toLowerCase().includes(".exe.cu-");

/** #525: công cụ hệ thống / trình điều khiển / thành phần Windows — không phải app con mở để chơi, học: không hiện ở «Thêm app», không thành «app mới»,
 *  không thành lời xin. So theo mục (tên tệp / gói) + tên hiển thị, TỪ trọn vẹn (không so chuỗi con ngẫu nhiên). */
const MUC_CONG_CU = new Set(["cmd.exe", "powershell.exe", "pwsh.exe", "wt.exe", "conhost.exe", "regedit.exe", "mmc.exe", "msiexec.exe", "charmap.exe", "git-bash.exe", "git-cmd.exe",
  "storedesktopextension.exe", "gamebar.exe", "gamebarftserver.exe", "rstmwservice.exe", "msconfig.exe", "dxdiag.exe", "control.exe", "winver.exe", "wscript.exe", "cscript.exe"]);
const TEN_CONG_CU = [/^command prompt$/, /\bgit (bash|cmd|gui)\b/, /^character map$/, /\bcodec tweak/, /\blav (audio|video|filters)\b/, /\bintel\b.*\b(rapid storage|management engine|graphics command|driver)\b/,
  /\bgame bar\b/, /\bstoredesktopextension\b/, /\bpowershell\b/, /^windows (terminal|powershell|security|defender)/, /\b(registry editor|device manager|task scheduler|event viewer|resource monitor|disk cleanup|system configuration)\b/,
  /\bredistributable\b/, /^(microsoft )?\.net (desktop )?runtime/, /^(intel|realtek|nvidia|amd)\b.*\b(driver|audio|control panel)\b/, /\bwindows (software development kit|sdk)\b/];
export function laCongCuHeThong(mucTho: unknown, ten?: unknown): boolean {
  const m = String(mucTho ?? "").trim().toLowerCase();
  if (m && MUC_CONG_CU.has(m)) return true;
  const t = String(ten ?? "").trim().toLowerCase();
  if (t && TEN_CONG_CU.some((r) => r.test(t))) return true;
  return !!m && MUC_CONG_CU.has(`${m}.exe`);      // định danh chỉ có tên tệp không đuôi («storedesktopextension»)
}

/** #525/#702: lời xin Ba Mẹ thấy được — lời xin cài thành phần Windows (agent cũ gửi trước #525) không hiện ở Chờ duyệt và không được đếm.
 *  MỘT điều kiện cho danh sách Chờ duyệt (yeu-cau.ts › dsChoYc) và số «lời xin» trên avatar Con (bao-cao.ts › demYcCho). */
export const loiXinHienDuoc = (r: { loai: string; gia_tri?: string | null; ten_app?: string | null }) =>
  !(r.loai === "cai_app" && laCongCuHeThong(r.gia_tri, r.ten_app ?? r.gia_tri));

/** #644: tiến trình nền / thành phần của phiên Windows (đồng bộ ProcessGuard.TienTrinhHeThongPhien ở agent-win, trừ explorer / Ảnh) — tiền cảnh thoáng qua, không phải việc Con làm:
 *  không vào «Đã dùng» (máy Con, web Ba Mẹ), kể cả dòng agent cũ đã ghi — trừ khi Ba Mẹ đã đặt luật riêng cho mục đó. KHÔNG gồm explorer.exe (File Explorer là app người dùng mở). */
const TIEN_TRINH_NEN_WIN = new Set(["shellexperiencehost.exe", "lockapp.exe", "startmenuexperiencehost.exe", "searchhost.exe", "searchapp.exe", "textinputhost.exe",
  "runtimebroker.exe", "applicationframehost.exe", "sihost.exe", "ctfmon.exe", "dwm.exe", "taskhostw.exe", "fontdrvhost.exe", "csrss.exe", "winlogon.exe", "wininit.exe",
  "smss.exe", "services.exe", "lsass.exe", "svchost.exe", "dllhost.exe", "conhost.exe", "backgroundtaskhost.exe", "securityhealthsystray.exe", "logonui.exe", "consent.exe", "userinit.exe",
  "werfault.exe", "smartscreen.exe", "shellhost.exe", "useroobebroker.exe", "searchprotocolhost.exe", "searchfilterhost.exe", "audiodg.exe", "wudfhost.exe", "dashost.exe",
  "sppsvc.exe", "hxtsr.exe", "gamebarftserver.exe", "gamebarpresencewriter.exe", "gamingservices.exe", "gamingservicesnet.exe"]);
export function laTienTrinhNenWindows(mucTho: unknown): boolean {
  const m = chuanMuc(mucTho);
  return !!m && TIEN_TRINH_NEN_WIN.has(m.endsWith(".exe") ? m : `${m}.exe`);
}

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
export function khoaSo(muc: string) {
  const ds = [muc];
  if (muc.includes(".") && !muc.endsWith(".exe")) {
    const p = muc.split(".");
    for (let i = 1; i < p.length - 1; i++) ds.push(p.slice(i).join("."));
  }
  return ds;
}

type KetQuaLuat = { loai: LoaiMuc | "he_thong" | "chua_phan_loai"; nhom: NhomGiaiTri | null; nguon: "he_thong" | "con" | "gia_dinh" | null };

export async function phanLoai(fam: string, con: string, mucTho: unknown, t: Q = q): Promise<KetQuaLuat> {
  const muc = chuanMuc(mucTho);
  const khoa = khoaSo(muc);
  if (laAppAiiGrow(muc) || khoa.some((k) => allowlistHieuLuc().includes(k))) return { loai: "he_thong", nhom: null, nguon: "he_thong" };
  const ds = await t<{ child_id: string; muc: string; loai: LoaiMuc; nhom: NhomGiaiTri }>(
    `select child_id, muc, loai, nhom from app_rules where family_id = $1 and child_id in ('', $2) and muc = any($3::text[]) and (het is null or het > now())
       and loai <> 'chan'`,
    [fam, con, khoa]);
  // khớp cụ thể hơn thắng (mục dài hơn), luật riêng của Con thắng luật gia đình
  ds.sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0));
  const r = ds[0];
  return r && r.loai !== LOAI_TRU ? { loai: r.loai, nhom: r.loai === "giai_tri" ? r.nhom : null, nguon: r.child_id ? "con" : "gia_dinh" } : { loai: "chua_phan_loai", nhom: null, nguon: null };
}

/** phanLoai trong bộ nhớ trên `luat` đã đọc (dsLuat) — cùng thứ tự: hệ thống → khớp cụ thể hơn → luật riêng Con → cả nhà; loai_tru ⇒ chưa xếp. */
export function phanLoaiTu(luat: { child_id: string; muc: string; loai: string }[], con: string, mucTho: unknown, allow = allowlistHieuLuc()): LoaiMuc | "he_thong" | "chua_phan_loai" {
  const khoa = khoaSo(chuanMuc(mucTho));
  if (laAppAiiGrow(khoa[0]) || khoa.some((k) => allow.includes(k))) return "he_thong";
  const r = luat.filter((l) => l.loai !== "chan" && khoa.includes(l.muc) && (l.child_id === "" || l.child_id === con))
    .sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0))[0];
  return r && r.loai !== LOAI_TRU ? (r.loai as LoaiMuc) : "chua_phan_loai";
}

/** Bỏ `muc` khỏi danh sách của MỘT Con (#262): có luật cả nhà cùng mục ⇒ ghi luật riêng «loai_tru» cho Con đó (luật cả nhà giữ nguyên cho máy
 *  dùng chung + Con khác + Con tạo sau); không có ⇒ xoá luật riêng của Con. → true nếu có thay đổi. */
export async function boMucChoCon(t: Q, fam: string, con: string, mucTho: unknown) {
  const muc = chuanMuc(mucTho);
  if (!muc) return false;
  await khoaLuat(t, fam, con, muc);
  const caNha = (await t<{ ten: string }>(`select ten from app_rules where family_id = $1 and child_id = '' and muc = $2 and loai in ('hoc', 'giai_tri')
    and (het is null or het > now())`, [fam, muc]))[0];
  if (caNha) {
    const r = await t(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom, het) values ($1,$2,$3,$4,'loai_tru','khac',null)
      on conflict (family_id, child_id, muc) do update set loai = 'loai_tru', het = null where app_rules.loai <> 'loai_tru' returning muc`, [fam, con, muc, caNha.ten]);
    return r.length > 0;
  }
  return (await t(`delete from app_rules where family_id = $1 and child_id = $2 and muc = $3 and loai <> 'loai_tru' returning muc`, [fam, con, muc])).length > 0;
}

/** Ba Mẹ thêm / đổi nhóm một mục của danh sách (FR-02.02). `con` '' = cả gia đình. `het` = hết hạn (phê duyệt Lần này / Hôm nay — cũ).
 *  `loai`: giai_tri (Tính phút) | hoc (Không tính phút) | tinh_phut | khong_tinh_phut · «chan» (app cũ) ⇒ bỏ mục khỏi danh sách (#262). */
export async function datLuat(fam: string, b: { con?: string; muc: unknown; ten?: unknown; loai: unknown; nhom?: unknown; het?: Date | null }, t: Q = q) {
  const muc = chuanMuc(b.muc);
  if (!muc) throw new LoiNghiepVu("thieu_muc", "Thiếu tên ứng dụng hoặc website");
  if (khoaSo(muc).some((k) => allowlistHieuLuc().includes(k))) throw new LoiNghiepVu("he_thong", "Mục này thuộc danh sách hệ thống, luôn được dùng", 409);
  // app cũ «Chặn» = bỏ khỏi danh sách: của một Con ⇒ boMucChoCon (đè cả luật cả nhà cho Con đó); cả nhà ⇒ xoá luật cả nhà
  if (b.loai === "chan" || b.loai === LOAI_TRU) {
    if (b.con) { await boMucChoCon(t, fam, b.con, muc); return muc; }
    return xoaLuat(fam, { con: "", muc }, t);
  }
  const loai = b.loai === "tinh_phut" ? "giai_tri" : b.loai === "khong_tinh_phut" ? "hoc" : ["hoc", "giai_tri"].includes(String(b.loai)) ? String(b.loai) : null;
  if (!loai) throw new LoiNghiepVu("loai_sai", "Chọn «Tính phút» hoặc «Không tính phút»");
  // «Cho phép» (màn Ứng dụng trên máy): luật hoc + nhóm cho_phep — dùng mọi lúc, không trừ điểm; thống kê màn hình tính Tiện ích (man-hinh.ts › xepMuc)
  const nhom = loai === "hoc" && b.nhom === "cho_phep" ? "cho_phep" : (NHOM_GT as string[]).includes(String(b.nhom)) ? String(b.nhom) : "khac";
  const con = b.con ?? "";
  if (con && !(await t(`select 1 from children where id = $1 and family_id = $2`, [con, fam])).length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  await khoaLuat(t, fam, con, muc);   // mọi đường ghi (duyệt yêu cầu, web…) cũng xếp hàng sau lượt xếp / hoàn tác đang chạy; khoá lồng nhau không sao
  await t(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom, het) values ($1,$2,$3,$4,$5,$6,$7)
           on conflict (family_id, child_id, muc) do update set ten = excluded.ten, loai = excluded.loai, nhom = excluded.nhom, het = excluded.het`,
    [fam, con, muc, String(b.ten ?? muc).slice(0, 80), loai, nhom, b.het ?? null]);
  return muc;
}

/** Khoá giao dịch theo (nhà, Con, mục) — `mục` đã chuanMuc: `for update` không khoá được dòng CHƯA tồn tại — hai lượt xếp / hoàn tác một app chưa có luật
 *  sẽ cùng đọc «chưa có» rồi đè nhau. Khoá tư vấn giữ tới hết giao dịch; mọi đường ghi (datLuat, xoaLuat) và đọc-để-hoàn-tác (luatHienCo khoa)
 *  đều lấy nó (như khoá tên Con ở gia-dinh.ts). Gọi ngoài giao dịch thì khoá nhả ngay — vô hại vì khi đó chỉ có một câu ghi. */
const khoaLuat = (t: Q, fam: string, con: string, muc: string) =>
  t(`select pg_advisory_xact_lock(hashtext($1))`, [`luat-app:${fam}:${con}:${muc}`]);

/** Luật CÒN HIỆU LỰC của đúng (Con, mục) — để «Hoàn tác» khôi phục như trước. Luật đã hết hạn coi như chưa có (Hoàn tác ⇒ luat/xoa).
 *  `khoa` (chỉ trong giao dịch): giữ khoá (nhà, Con, mục) tới hết giao dịch rồi mới đọc. */
export async function luatHienCo(fam: string, con: string, mucTho: unknown, t: Q = q, khoa = false) {
  const muc = chuanMuc(mucTho);
  if (!muc) return null;
  if (khoa) await khoaLuat(t, fam, con, muc);
  const r = await t<{ muc: string; ten: string; loai: LoaiMuc; nhom: NhomGiaiTri; het: Date | null }>(
    `select muc, ten, loai, nhom, het from app_rules where family_id = $1 and child_id = $2 and muc = $3 and (het is null or het > now())`, [fam, con, muc]);
  return r[0] ?? null;
}

/** Bỏ luật của (Con, mục) — mục quay về «chưa xếp loại». Dùng cho «Hoàn tác» khi trước đó chưa có luật. */
export async function xoaLuat(fam: string, b: { con?: string; muc: unknown }, t: Q = q) {
  const muc = chuanMuc(b.muc);
  if (!muc) throw new LoiNghiepVu("thieu_muc", "Thiếu tên ứng dụng hoặc website");
  await khoaLuat(t, fam, b.con ?? "", muc);
  await t(`delete from app_rules where family_id = $1 and child_id = $2 and muc = $3`, [fam, b.con ?? "", muc]);
  return muc;
}

export const dsLuat = (fam: string, t: Q = q) =>
  t<{ child_id: string; muc: string; ten: string; loai: LoaiMuc; nhom: NhomGiaiTri; het: Date | null }>(
    `select child_id, muc, ten, loai, nhom, het from app_rules where family_id = $1 and (het is null or het > now()) and loai <> 'chan' order by ten`, [fam]);

/** Allowlist hệ thống hiệu lực: danh sách trong mã + mục Admin AiiLab thêm ở /admin. */
export const allowlistHieuLuc = () => (heThong.allowlistThem.length ? [...ALLOWLIST_HE_THONG, ...heThong.allowlistThem] : ALLOWLIST_HE_THONG);

/** Hoàn tác kiểu cũ (`neuLoai`): luật hiện tại còn đúng loại vừa đặt? App cũ đặt «chan» (nay = bỏ khỏi danh sách) ⇒ hiện tại là «không có» hoặc
 *  «loai_tru» cũng là đúng — Hoàn tác được, không 409. */
export function dungLoaiHoanTac(hienTai: string | undefined | null, neuLoai: unknown) {
  if (neuLoai === "chan" || neuLoai === LOAI_TRU) return !hienTai || hienTai === LOAI_TRU || hienTai === "chan";
  return hienTai === neuLoai;
}
