// Trạng thái trình hướng dẫn 5 bước (BRD 6.1) giữa các màn: Con vừa tạo, loại thiết bị đã chọn.
// Web: giữ trong sessionStorage — F5 / mở lại tab ở bước Ghép không làm mất Con (trước đây mã ghép ra «máy dùng chung», lịch bỏ im lặng).
type TL = { conId?: string; tenCon?: string; nhom?: "nhi" | "teen"; nen?: "windows" | "mac" | "ios" | "android" };
const KHOA = "aiigrow.thiet-lap";
const kho = () => { try { return globalThis.sessionStorage ?? null; } catch { return null; } };
let tl: TL = (() => { try { return JSON.parse(kho()?.getItem(KHOA) ?? "{}") as TL; } catch { return {}; } })();
export const datTl = (x: TL) => {
  tl = { ...tl, ...x };
  try { kho()?.setItem(KHOA, JSON.stringify(tl)); } catch { /* chế độ riêng tư: chỉ giữ trong bộ nhớ */ }
};
export const layTl = () => tl;
