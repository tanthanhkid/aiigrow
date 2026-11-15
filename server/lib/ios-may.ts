// Phần `ios` app iPhone/iPad gửi kèm nhịp (agent-ios/CAN-SERVER.md mục 3): {soAppHoc, soAppGiaiTri, soAppChan, soDanhMucGiaiTri, phutDaDung, uyQuyen}.
// Lưu vào devices.status.ios để app Ba Mẹ hiện «đã chọn N app giải trí, hôm nay dùng M phút». Con tự bỏ chọn app trong FamilyActivityPicker
// ⇒ số app giải trí / chặn GIẢM so với lần trước ⇒ cảnh báo Ba Mẹ (cơ chế canhBao có khoá chống trùng — mỗi lần giảm cùng mức chỉ báo một lần/ngày, số dao động không thành bão cảnh báo).
import type { May } from "./gia-dinh.ts";
import { q, tx, type Q } from "./db.ts";
import { canhBao } from "./nhat-ky.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { laMoHetCon, tinhPhutChoi } from "./so-sao.ts";
import { khoaCon } from "./vi.ts";

export type IosNhip = { soAppHoc: number; soAppGiaiTri: number; soAppChan: number; soDanhMucGiaiTri: number; phutDaDung: number; uyQuyen: string; luc: string;
  /** phút lúc máy mở bằng mã hôm nay (cộng dồn từ `phutBoiMa` app gửi phần chênh) — chỉ để hiện, không trừ sao */ boiMaHomNay?: number;
  /** MỐC trừ sao: phutDaDung + lúc của lần đã tính sao gần nhất (chỉ đổi khi trừ xong / quyết định chỉ lấy mốc — lỗi thì giữ mốc cũ) */
  mocPhut?: number; mocLuc?: string };

const so = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(100000, Math.round(Number(v))) : 0);

/** Làm sạch phần ios của nhịp; không phải object ⇒ null (máy không phải iOS / app cũ không gửi). */
export function chuanIos(v: unknown, now: Date): IosNhip | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  return { soAppHoc: so(o.soAppHoc), soAppGiaiTri: so(o.soAppGiaiTri), soAppChan: so(o.soAppChan), soDanhMucGiaiTri: so(o.soDanhMucGiaiTri),
    phutDaDung: so(o.phutDaDung), uyQuyen: String(o.uyQuyen ?? "").slice(0, 30), luc: now.toISOString() };
}

/** Gộp một khoá vào devices.status (dùng chung `ios` / `android`). */
export const luuStatusKhoa = (mayId: string, khoa: string, giaTri: unknown, t: Q = q) =>
  t(`update devices set status = coalesce(status, '{}'::jsonb) || jsonb_build_object($2::text, $3::text::jsonb) where id = $1`, [mayId, khoa, JSON.stringify(giaTri)]);

/** Agent iOS ≥ 0.2.0 (#272): `phutDaDung` đã bỏ phút mở bằng mã. Nhận ra qua trường `phutBoiMa` (Swift bỏ trường khi nil ⇒ chỉ có lúc > 0)
 *  hoặc `phienBan` «ios-x.y.z» ≥ 0.2.0. Agent cũ ⇒ không trừ sao theo phutDaDung (giữ hành vi cũ — khoá tại máy theo quỹ). */
export function laIosMoi(b: { phutBoiMa?: unknown; phienBan?: unknown }) {
  if (b.phutBoiMa !== undefined && b.phutBoiMa !== null) return true;
  const m = /^ios-(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(b.phienBan ?? ""));
  return !!m && (Number(m[1]) > 0 || Number(m[2]) >= 2);
}

type MayIos = Pick<May, "id" | "family_id" | "child_id" | "name" | "platform" | "status"> & { ba_me_den?: Date | string | null };
export type NhipIosVao = { ios?: unknown; phutBoiMa?: unknown; phienBan?: unknown; clientTime?: unknown };

/** Lưu `ios` vào status máy + trừ sao (truSaoIos) + cảnh báo khi số app giải trí / chặn giảm. Trả về các mục đã giảm. Chỉ máy platform «ios».
 *  `con` = bé đang dùng máy theo nhịp (null ⇒ không trừ, chỉ lấy mốc). Đọc mốc + trừ + ghi mốc trong MỘT giao dịch có khoá dòng máy
 *  (`select … for update`) ⇒ hai nhịp song song không trừ đôi; trừ lỗi ⇒ cả giao dịch lùi, ghi lại status với mốc CŨ (lần sau trừ lại). */
export async function luuIosNhip(may: MayIos, con: string | null, b: NhipIosVao, now = new Date()) {
  if (may.platform !== "ios") return [];
  const moi = chuanIos(b.ios, now);
  if (!moi) return [];
  const tz = (await q<{ tz: string }>(`select tz from families where id = $1`, [may.family_id]))[0]?.tz ?? "Asia/Ho_Chi_Minh";
  const ghi = async (t: Q, moc: boolean) => {
    const r = (await t<{ status: Record<string, unknown> | null; ba_me_den: Date | null }>(`select status, ba_me_den from devices where id = $1 for update`, [may.id]))[0];
    const cu = (r?.status?.ios ?? null) as Partial<IosNhip> | null;
    const cungNgay = !!cu?.luc && gioDiaPhuong(new Date(cu.luc), tz).ngay === gioDiaPhuong(now, tz).ngay;
    const bm = so(b.phutBoiMa);
    const ra: IosNhip = { ...moi };
    if (bm > 0 || cungNgay) ra.boiMaHomNay = (cungNgay ? so(cu?.boiMaHomNay) : 0) + bm;
    const mocCu = mocCua(cu);
    if (moc) {
      await truSaoIos(t, { ...may, ba_me_den: r?.ba_me_den ?? may.ba_me_den }, con, mocCu, moi, tz, now, { moi: laIosMoi(b), gioMay: b.clientTime });
      ra.mocPhut = moi.phutDaDung; ra.mocLuc = moi.luc;
    } else if (mocCu) { ra.mocPhut = mocCu.phut; ra.mocLuc = mocCu.luc; }
    await luuStatusKhoa(may.id, "ios", ra, t);
    return cu;
  };
  let cu: Partial<IosNhip> | null;
  try { cu = await tx((t) => ghi(t, true)); }
  catch (e) { console.error("nhip ios: trừ sao phút chơi lỗi — giữ mốc cũ", e); cu = await tx((t) => ghi(t, false)); }
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

/** Mốc trừ sao của status cũ (status trước bản này chưa có mocPhut ⇒ lấy phutDaDung / luc đã lưu). */
function mocCua(cu: Partial<IosNhip> | null): { phut: number; luc: string } | null {
  if (cu && typeof cu.mocPhut === "number" && cu.mocLuc) return { phut: cu.mocPhut, luc: cu.mocLuc };
  if (cu && typeof cu.phutDaDung === "number" && cu.luc) return { phut: cu.phutDaDung, luc: cu.luc };
  return null;
}

/** iPhone/iPad trừ sao (#264, 1 sao = 1 phút) — GỌI TRONG giao dịch đã khoá dòng máy. `ios.phutDaDung` = phút app «Tính phút» CỘNG DỒN hôm nay
 *  trên máy, agent ≥ 0.2.0 đã BỎ phút mở bằng mã (DongBo.nhipGui: phutDoTaiCho − phutBoiMa) ⇒ không trừ `phutBoiMa` lần nữa. Phút trừ = phần
 *  tăng so với mốc CÙNG NGÀY (giờ gia đình), qua đồng hồ cửa sổ của so-sao.ts › tinhPhutChoi (máy khác chơi cùng lúc không trừ đôi).
 *  KHÔNG trừ (chỉ lấy mốc): agent cũ · không có bé đang dùng · Ba Mẹ đang dùng máy (ba_me_den) · Mở hết · lần đầu (chưa mốc) · số giảm
 *  (cài lại app) · qua nửa đêm mà máy còn báo tổng hôm qua (ngày theo đồng hồ máy khác ngày gia đình, hoặc phutDaDung > phút từ nửa đêm + 1).
 *  Phần tăng kẹp ≤ thời gian thật từ mốc (hoặc nửa đêm) + 1 phút. */
export async function truSaoIos(t: Q, may: Pick<May, "id" | "name"> & { ba_me_den?: Date | string | null }, con: string | null,
  moc: { phut: number; luc: string } | null, moi: IosNhip, tz: string, now = new Date(), o: { moi?: boolean; gioMay?: unknown } = {}) {
  const khong = { tru: 0, tinh: 0 };
  if (!o.moi || !con || !moc) return khong;
  if (may.ba_me_den && new Date(may.ba_me_den).getTime() > now.getTime()) return khong;
  const mocLuc = new Date(moc.luc);
  if (!Number.isFinite(mocLuc.getTime())) return khong;
  const nay = gioDiaPhuong(now, tz).ngay, nuaDem = dauNgayUtc(nay, tz).getTime();
  const gm = o.gioMay !== undefined && o.gioMay !== null ? new Date(String(o.gioMay)) : null;
  if (gm && Number.isFinite(gm.getTime()) && gioDiaPhuong(gm, tz).ngay !== nay) return khong;   // máy còn ở ngày hôm qua
  const tuNuaDem = (now.getTime() - nuaDem) / 60_000;
  if (moi.phutDaDung > tuNuaDem + 1) return khong;                                               // tổng hôm qua chưa về 0
  const truoc = gioDiaPhuong(mocLuc, tz).ngay === nay ? moc.phut : 0;
  const them = Math.min(moi.phutDaDung - truoc, Math.max(0, (now.getTime() - Math.max(mocLuc.getTime(), nuaDem)) / 60_000) + 1);
  if (!(them > 0)) return khong;
  await khoaCon(t, con);
  if (await laMoHetCon(con, t)) return khong;
  return tinhPhutChoi(t, con, them, now, { muc: `ios:${may.id}`, ten: may.name, tz });
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
