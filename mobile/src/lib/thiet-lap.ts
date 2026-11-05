// Trạng thái trình hướng dẫn 5 bước (BRD 6.1) giữa các màn: Con vừa tạo, loại thiết bị đã chọn.
// Web: giữ trong sessionStorage — F5 / mở lại tab ở bước Ghép không làm mất Con (trước đây mã ghép ra «máy dùng chung», lịch bỏ im lặng).
type TL = { conId?: string; tenCon?: string; nhom?: "nhi" | "teen"; nen?: "windows" | "mac" | "ios" | "android";
  /** Lần đầu (thiết kế 05/11): năm sinh + màu hồ sơ, các Con đã lưu trong lượt này, lựa chọn màn Giờ chơi / Chọn app (gửi một lần POST thiet-lap). */
  namSinh?: number | null; mau?: number; daLuu?: { id: string; ten: string }[];
  cheDoChan?: "chi_app_duoc_phep" | "mo_het"; quy?: number; ngu?: { tu: string; den: string };
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
