// Phần `ios` app iPhone/iPad gửi kèm nhịp (agent-ios/CAN-SERVER.md mục 3): {soAppHoc, soAppGiaiTri, soAppChan, soDanhMucGiaiTri, phutDaDung, uyQuyen}.
// Lưu vào devices.status.ios để app Ba Mẹ hiện «đã chọn N app giải trí, hôm nay dùng M phút». Con tự bỏ chọn app trong FamilyActivityPicker
// ⇒ số app giải trí / chặn GIẢM so với lần trước ⇒ cảnh báo Ba Mẹ (cơ chế canhBao có khoá chống trùng — mỗi lần giảm cùng mức chỉ báo một lần/ngày, số dao động không thành bão cảnh báo).
import type { May } from "./gia-dinh.ts";
import { q } from "./db.ts";
import { canhBao } from "./nhat-ky.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { truPhutChoi } from "./so-sao.ts";

export type IosNhip = { soAppHoc: number; soAppGiaiTri: number; soAppChan: number; soDanhMucGiaiTri: number; phutDaDung: number; uyQuyen: string; luc: string;
  /** phút lúc máy mở bằng mã hôm nay (cộng dồn từ `phutBoiMa` app gửi phần chênh) — chỉ để hiện, không trừ sao */ boiMaHomNay?: number };

const so = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(100000, Math.round(Number(v))) : 0);

/** Làm sạch phần ios của nhịp; không phải object ⇒ null (máy không phải iOS / app cũ không gửi). */
export function chuanIos(v: unknown, now: Date): IosNhip | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  return { soAppHoc: so(o.soAppHoc), soAppGiaiTri: so(o.soAppGiaiTri), soAppChan: so(o.soAppChan), soDanhMucGiaiTri: so(o.soDanhMucGiaiTri),
    phutDaDung: so(o.phutDaDung), uyQuyen: String(o.uyQuyen ?? "").slice(0, 30), luc: now.toISOString() };
}

/** Gộp một khoá vào devices.status (dùng chung `ios` / `android`). */
export const luuStatusKhoa = (mayId: string, khoa: string, giaTri: unknown) =>
  q(`update devices set status = coalesce(status, '{}'::jsonb) || jsonb_build_object($2::text, $3::text::jsonb) where id = $1`, [mayId, khoa, JSON.stringify(giaTri)]);

/** Lưu `ios` vào status máy + cảnh báo khi số app giải trí / chặn giảm. Trả về các mục đã giảm (rỗng = không báo). Chỉ máy platform «ios». */
export async function luuIosNhip(may: Pick<May, "id" | "family_id" | "child_id" | "name" | "platform" | "status">, ios: unknown, now = new Date(),
  o: { phutBoiMa?: unknown } = {}) {
  if (may.platform !== "ios") return [];
  const moi = chuanIos(ios, now);
  if (!moi) return [];
  const cu = (may.status?.ios ?? null) as Partial<IosNhip> | null;
  const tz = (await q<{ tz: string }>(`select tz from families where id = $1`, [may.family_id]))[0]?.tz ?? "Asia/Ho_Chi_Minh";
  const cungNgay = !!cu?.luc && gioDiaPhuong(new Date(cu.luc), tz).ngay === gioDiaPhuong(now, tz).ngay;
  const bm = so(o.phutBoiMa);
  if (bm > 0 || cungNgay) moi.boiMaHomNay = (cungNgay ? so(cu?.boiMaHomNay) : 0) + bm;
  await luuStatusKhoa(may.id, "ios", moi);
  // lỗi trừ sao không làm hỏng nhịp (app vẫn cần chính sách) — phút đã lưu vào status, lần sau không tính lại
  try { await truSaoIos(may, cu, moi, tz, now); } catch (e) { console.error("nhip ios: trừ sao phút chơi lỗi", e); }
  const giam: { muc: string; truoc: number; sau: number }[] = [];
  if (cu) {
    if (typeof cu.soAppGiaiTri === "number" && moi.soAppGiaiTri < cu.soAppGiaiTri) giam.push({ muc: "app giải trí", truoc: cu.soAppGiaiTri, sau: moi.soAppGiaiTri });
    if (typeof cu.soAppChan === "number" && moi.soAppChan < cu.soAppChan) giam.push({ muc: "app bị chặn", truoc: cu.soAppChan, sau: moi.soAppChan });
  }
  for (const g of giam)
    await canhBao(may.family_id, "ios_giam_app", "chu_y",
      `Số ${g.muc} được chọn trên ${may.name} giảm từ ${g.truoc} xuống ${g.sau} — Con có thể đã tự bỏ chọn trong Screen Time.`,
      { con: may.child_id, may: may.id, khoa: `ios_giam_app:${may.id}:${g.muc}:${g.truoc}-${g.sau}:${now.toISOString().slice(0, 10)}`, chiTiet: { muc: g.muc, truoc: g.truoc, sau: g.sau } });
  return giam;
}

/** iPhone/iPad trừ sao (#264, 1 sao = 1 phút): app gửi `ios.phutDaDung` = phút app «Tính phút» CỘNG DỒN hôm nay trên máy, ĐÃ BỎ phút lúc
 *  mở bằng mã (agent-ios DongBo.nhipGui: phutDoTaiCho − phutBoiMa) ⇒ không trừ `phutBoiMa` lần nữa. Phút trừ = phần tăng so với lần nhịp trước
 *  CÙNG NGÀY (giờ gia đình), qua đồng hồ cửa sổ của so-sao.ts › truPhutChoi (máy khác của Con chơi cùng lúc không trừ đôi; Mở hết ⇒ không trừ).
 *  Chống trừ khống: lần đầu máy báo (chưa có mốc) chỉ lấy mốc; phần tăng kẹp ≤ thời gian thật từ lần nhịp trước (hoặc đầu ngày) — app cài lại
 *  đếm từ 0 rồi tăng lại không bị tính hai lần. Số giảm (cài lại / sang ngày trên máy) ⇒ chỉ lấy mốc mới. */
export async function truSaoIos(may: Pick<May, "id" | "child_id" | "name">, cu: Partial<IosNhip> | null, moi: IosNhip, tz: string, now = new Date()) {
  if (!may.child_id || !cu?.luc || typeof cu.phutDaDung !== "number") return { tru: 0, tinh: 0 };
  const cuLuc = new Date(cu.luc);
  if (!Number.isFinite(cuLuc.getTime())) return { tru: 0, tinh: 0 };
  const nay = gioDiaPhuong(now, tz).ngay;
  const truoc = gioDiaPhuong(cuLuc, tz).ngay === nay ? cu.phutDaDung : 0;
  const moc = Math.max(cuLuc.getTime(), dauNgayUtc(nay, tz).getTime());
  const them = Math.min(moi.phutDaDung - truoc, Math.max(0, (now.getTime() - moc) / 60_000) + 1);
  if (!(them > 0)) return { tru: 0, tinh: 0 };
  return truPhutChoi(may.child_id, them, now, { muc: `ios:${may.id}`, ten: may.name });
}

// ---------------------------------------------------------------- tác tử Android (agent-android/CAN-SERVER.md mục 3)
export type AndroidNhip = { phutDungHomNay: Record<string, number>; thanhPhan: Record<string, boolean>; luc: string };

/** Làm sạch phần Android của nhịp: `phutDungHomNay` {gói: phút} + trạng thái quyền `thanhPhan`. Không có cả hai ⇒ null (app cũ / máy khác). */
export function chuanAndroid(b: { phutDungHomNay?: unknown; thanhPhan?: unknown }, now: Date): AndroidNhip | null {
  const ph = b.phutDungHomNay && typeof b.phutDungHomNay === "object" && !Array.isArray(b.phutDungHomNay) ? (b.phutDungHomNay as Record<string, unknown>) : null;
  const tp = b.thanhPhan && typeof b.thanhPhan === "object" && !Array.isArray(b.thanhPhan) ? (b.thanhPhan as Record<string, unknown>) : null;
  if (!ph && !tp) return null;
  const phut: Record<string, number> = {};
  for (const [goi, v] of Object.entries(ph ?? {}).slice(0, 300)) { const n = so(v); if (n > 0) phut[goi.slice(0, 120)] = Math.min(1440, n); }
  const quyen: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(tp ?? {}).slice(0, 20)) if (typeof v === "boolean") quyen[k.slice(0, 40)] = v;
  return { phutDungHomNay: phut, thanhPhan: quyen, luc: now.toISOString() };
}

/** Lưu `android` vào status máy (chỉ máy platform «android»). */
export async function luuAndroidNhip(may: Pick<May, "id" | "platform">, b: { phutDungHomNay?: unknown; thanhPhan?: unknown }, now = new Date()) {
  if (may.platform !== "android") return null;
  const moi = chuanAndroid(b, now);
  if (moi) await luuStatusKhoa(may.id, "android", moi);
  return moi;
}

/** `thanhPhan` cho bộ chấm tuân thủ: `deviceOwner` chỉ là thông tin (false = đường không reset, không phải lỗi) và Trợ năng chỉ bắt buộc khi KHÔNG phải Device Owner. */
export function thanhPhanChoTuanThu(tp: unknown): unknown {
  if (!tp || typeof tp !== "object" || Array.isArray(tp)) return tp;
  const { deviceOwner, ...con } = tp as Record<string, unknown>;
  if (deviceOwner === true) delete con.troNang;
  return con;
}
