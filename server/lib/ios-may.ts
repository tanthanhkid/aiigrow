// Phần `ios` app iPhone/iPad gửi kèm nhịp (agent-ios/CAN-SERVER.md mục 3): {soAppHoc, soAppGiaiTri, soAppChan, soDanhMucGiaiTri, phutDaDung, uyQuyen}.
// Lưu vào devices.status.ios để app Ba Mẹ hiện «đã chọn N app giải trí, hôm nay dùng M phút». Con tự bỏ chọn app trong FamilyActivityPicker
// ⇒ số app giải trí / chặn GIẢM so với lần trước ⇒ cảnh báo Ba Mẹ (cơ chế canhBao có khoá chống trùng).
import type { May } from "./gia-dinh.ts";
import { q } from "./db.ts";
import { canhBao } from "./nhat-ky.ts";

export type IosNhip = { soAppHoc: number; soAppGiaiTri: number; soAppChan: number; soDanhMucGiaiTri: number; phutDaDung: number; uyQuyen: string; luc: string };

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
export async function luuIosNhip(may: Pick<May, "id" | "family_id" | "child_id" | "name" | "platform" | "status">, ios: unknown, now = new Date()) {
  if (may.platform !== "ios") return [];
  const moi = chuanIos(ios, now);
  if (!moi) return [];
  const cu = (may.status?.ios ?? null) as Partial<IosNhip> | null;
  await luuStatusKhoa(may.id, "ios", moi);
  const giam: { muc: string; truoc: number; sau: number }[] = [];
  if (cu) {
    if (typeof cu.soAppGiaiTri === "number" && moi.soAppGiaiTri < cu.soAppGiaiTri) giam.push({ muc: "app giải trí", truoc: cu.soAppGiaiTri, sau: moi.soAppGiaiTri });
    if (typeof cu.soAppChan === "number" && moi.soAppChan < cu.soAppChan) giam.push({ muc: "app bị chặn", truoc: cu.soAppChan, sau: moi.soAppChan });
  }
  for (const g of giam)
    await canhBao(may.family_id, "ios_giam_app", "chu_y",
      `Số ${g.muc} được chọn trên ${may.name} giảm từ ${g.truoc} xuống ${g.sau} — Con có thể đã tự bỏ chọn trong Screen Time.`,
      { con: may.child_id, may: may.id, khoa: `ios_giam_app:${may.id}:${g.muc}:${g.truoc}-${g.sau}:${now.getTime()}`, chiTiet: { muc: g.muc, truoc: g.truoc, sau: g.sau } });
  return giam;
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
