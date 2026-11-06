// Trạng thái trình hướng dẫn 5 bước (BRD 6.1) giữa các màn: Con vừa tạo, loại thiết bị đã chọn.
// Web: giữ trong sessionStorage — F5 / mở lại tab ở bước Ghép không làm mất Con (trước đây mã ghép ra «máy dùng chung», lịch bỏ im lặng).
type TL = { conId?: string; tenCon?: string; nhom?: "nhi" | "teen"; nen?: "windows" | "mac" | "ios" | "android";
  /** Lần đầu (thiết kế 05/11): năm sinh + màu hồ sơ, các Con đã lưu trong lượt này, lựa chọn màn Giờ chơi / Chọn app (gửi một lần POST thiet-lap). */
  namSinh?: number | null; mau?: number; daLuu?: { id: string; ten: string; mau?: number; namSinh?: number | null }[];
  cheDoChan?: "chi_app_duoc_phep" | "mo_het"; quy?: number; cuoiTuan?: number; ngu?: { tu: string; den: string };
  apps?: AppChon[] };
/** Một app Ba Mẹ cho Con dùng: app trong lưới (`ma`) hoặc «Thêm app khác» theo tên. */
export type AppChon = { ma: string; ten: string } | { ten: string; tinhGio: boolean };
const KHOA = "aiigrow.thiet-lap";
const kho = () => { try { return globalThis.sessionStorage ?? null; } catch { return null; } };
let tl: TL = (() => { try { return JSON.parse(kho()?.getItem(KHOA) ?? "{}") as TL; } catch { return {}; } })();
export const datTl = (x: TL) => {
  tl = { ...tl, ...x };
  try { kho()?.setItem(KHOA, JSON.stringify(tl)); } catch { /* chế độ riêng tư: chỉ giữ trong bộ nhớ */ }
};
export const layTl = () => tl;
/** Đổi phiên Ba Mẹ (đăng nhập/đăng xuất/hết phiên) ⇒ bỏ trạng thái cũ: không nhắm vào Con của gia đình khác. */
export const xoaTl = () => { tl = {}; try { kho()?.removeItem(KHOA); } catch { /* bỏ qua */ } };

/** App trong lưới (có `ma`) hay app thêm theo tên. */
export const coMa = (a: AppChon): a is { ma: string; ten: string } => "ma" in a;

/** Thân POST thiet-lap (Lần đầu, màn Giờ chơi) — hàm thuần. 06/11 (B1): chế độ chặn CHỈ gửi khi Ba Mẹ đã chọn / màn đã nạp chế độ thật của Con;
 *  trước đây thiếu thì gửi «chi_app_duoc_phep» ⇒ đi lại Lần đầu cho Con đang «Mở hết» là lặng lẽ đổi về «Chỉ app được phép» (máy Con khoá lại).
 *  Con mới tạo đã có «chi_app_duoc_phep» sẵn ở máy chủ (gia-dinh.ts › taoCon) nên bỏ trống vẫn đúng mặc định.
 *  Quỹ cuối tuần: giữ số thật đã nạp (`cuoiTuan`) tới khi Ba Mẹ chọn quỹ khác. */
export function thanThietLap(t: TL, mac: { quy: number; cuoiTuan: (p: number) => number; ngu: { tu: string; den: string } }) {
  const quy = t.quy ?? mac.quy;
  return {
    con: { id: t.conId, ten: t.tenCon },
    gioChoi: { ngayThuong: quy, cuoiTuan: t.quy != null && t.cuoiTuan != null ? t.cuoiTuan : mac.cuoiTuan(quy) },
    ngu: t.ngu ?? mac.ngu,
    ...(t.cheDoChan ? { cheDoChan: t.cheDoChan } : {}),
    ...(t.apps ? { apps: t.apps.map((a) => (coMa(a) ? { ma: a.ma } : { ten: a.ten, tinhGio: a.tinhGio })) } : {}),
  };
}
