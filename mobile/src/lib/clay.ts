// Chất liệu «Clay A · màu gốc · bóng gương» (Thanh chốt 24/10 — docs/THIET-KE-CLAY.md, mẫu docs/clay/clay-a-goc-guong.css).
// MÀU vẫn là token của mau.ts; file này chỉ giữ CHẤT: bóng kép (ngoài mềm lệch xuống + inset sáng trên / tối dưới) và lớp men
// (dải sáng cong mép trên thẻ, mảng men trắng sắc nửa trên nút/chip). Chuỗi CSS dùng thẳng cho `boxShadow` / `backgroundImage`
// của React Native ≥ 0.80 (kiến trúc mới) và react-native-web — một nguồn cho cả app lẫn bản web.
import type { ViewStyle } from "react-native";

/** Bóng kép. Bóng ngoài của nút/chip ngắn (≤ 10px) để hai nút xếp sát (khoảng 8) không chồng bóng lên nhau (TestFlight build 6: «nặng»).
 * `the`: thẻ/khối lớn · `nho`: nút sáng, chip, viên icon · `lom`: lòng chảo ấn lõm (rãnh tiến độ, ô nhập, hàng việc). */
export const BONG = {
  the: "0px 16px 24px -14px rgba(28,32,30,0.26), 0px 4px 8px -5px rgba(28,32,30,0.14), inset 0px 1.5px 0px rgba(255,255,255,1), inset 0px -2px 0px rgba(255,255,255,0.7), inset 0px -10px 16px -8px rgba(40,44,42,0.12)",
  nho: "0px 6px 10px -6px rgba(28,32,30,0.26), 0px 2px 3px -1px rgba(28,32,30,0.14), inset 0px 1.5px 0px rgba(255,255,255,1), inset 0px -6px 10px -5px rgba(40,44,42,0.14)",
  lom: "inset 0px 4px 8px rgba(40,44,42,0.13), inset 0px -1.5px 0px rgba(255,255,255,0.95)",
  toi: "0px 6px 10px -5px rgba(15,19,18,0.40), 0px 2px 3px -1px rgba(15,19,18,0.24), inset 0px 1px 0px rgba(255,255,255,0.45), inset 0px -2px 3px rgba(0,0,0,0.4)",
  ngoc: "0px 6px 10px -5px rgba(10,82,70,0.44), 0px 2px 3px -1px rgba(10,82,70,0.24), inset 0px 1px 0px rgba(255,255,255,0.5), inset 0px -2px 3px rgba(0,30,25,0.4)",
  vang: "0px 6px 10px -5px rgba(150,100,0,0.38), 0px 2px 3px -1px rgba(150,100,0,0.22), inset 0px 1px 0px rgba(255,255,255,0.7), inset 0px -2px 3px rgba(120,70,0,0.35)",
  do: "0px 5px 9px -4px rgba(165,31,20,0.6), inset 0px 1px 0px rgba(255,255,255,0.4), inset 0px -2px 3px rgba(0,0,0,0.25)",
  noi: "0px -6px 24px -12px rgba(28,32,30,0.25), 0px 16px 26px -10px rgba(28,32,30,0.34), inset 0px 1.5px 0px rgba(255,255,255,1), inset 0px -8px 14px -8px rgba(40,44,42,0.12)",
} as const;

/** Lớp men (backgroundImage) phủ trên màu nền của khối. */
export const MEN = {
  /** thẻ sáng: dải trắng cong sát mép trên + chân hơi tối (phản chiếu đáy) */
  the: "radial-gradient(46% 18px at 50% 3px, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 62%, rgba(255,255,255,0) 78%), linear-gradient(180deg, rgba(254,254,253,0) 26%, rgba(40,44,42,0.02) 60%, rgba(40,44,42,0.06) 100%)",
  /** nút sáng / chip / viên xám: nửa trên men trắng, chân hơi tối */
  sang: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 44%, rgba(232,231,226,0) 50%, rgba(40,44,42,0.05) 100%)",
  /** viên màu (xanh, vàng, cam…): đốm men trên + phản chiếu đáy */
  vien: "radial-gradient(60% 34% at 50% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%), radial-gradient(50% 20% at 50% 92%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)",
  /** nút tối than chì — kẹo bọc đường: mảng men cắt sắc ở 1/4 trên */
  toi: "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 26%), radial-gradient(60% 40% at 50% 105%, rgba(120,140,135,0.35) 0%, rgba(0,0,0,0) 100%), linear-gradient(180deg, #2e3533 0%, #121615 100%)",
  ngoc: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 26%), radial-gradient(60% 40% at 50% 105%, rgba(80,220,190,0.4) 0%, rgba(0,0,0,0) 100%), linear-gradient(180deg, #0f6b5c 0%, #08463d 100%)",
  vang: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0) 26%), linear-gradient(180deg, #f7c21f 0%, #e9a800 100%)",
  /** huy hiệu số đỏ / thanh tiến độ: nửa trên men */
  nua: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.12) 46%, rgba(255,255,255,0) 50%)",
  /** ô tab đang chọn: ánh sáng phản chiếu đáy */
  day: "linear-gradient(180deg, rgba(255,255,255,0) 60%, rgba(255,255,255,0.55) 100%)",
} as const;

/** Vệt men lướt chéo khi nhấn (docs/clay/M-anh-men.css › .men::after). */
export const VET = {
  toi: "linear-gradient(105deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.10) 42%, rgba(255,255,255,0.55) 49%, rgba(255,255,255,0.16) 54%, rgba(255,255,255,0) 62%)",
  sang: "linear-gradient(105deg, rgba(255,255,255,0) 34%, rgba(40,44,42,0.035) 41%, rgba(255,255,255,1) 49%, rgba(255,255,255,0.5) 54%, rgba(255,255,255,0) 62%)",
} as const;

/** Bộ style dựng sẵn: khối đất sét sáng (thẻ), viên nhỏ sáng, lòng chảo. `backgroundColor` vẫn lấy từ token. */
export const KHOI = {
  the: { boxShadow: BONG.the } as ViewStyle,
  nho: { boxShadow: BONG.nho } as ViewStyle,
  vien: { boxShadow: BONG.nho } as ViewStyle,
  lom: { boxShadow: BONG.lom } as ViewStyle,
} as const;
// Lớp men của khối CÓ CHỮ nằm trong một lớp con riêng (LopMen, chuyen-dong.tsx) chứ không đặt `backgroundImage` lên khối: màu nền của khối
// vẫn là token đặc ⇒ tương phản chữ tính đúng theo token (men chỉ là ánh trắng rất nhẹ), khối không chữ (viên icon, rãnh) dùng thẳng MEN.

/** Bo góc kiểu đất sét (to hơn bộ cũ). */
export const BO_CLAY = { the: 30, o: 26, nut: 22, nutNho: 18, vien: 22 } as const;
