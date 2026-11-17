// 17/11 (#363): bóng + men đổi theo bàn Navy (bóng ám navy rgba(10,22,41), nút tối navy #1b2b47 → #0A1629, nút vàng mật #f8d68e → #F4C76A).
// Chất liệu «Clay A · màu gốc · bóng gương» (Thanh chốt 24/10 — docs/THIET-KE-CLAY.md, mẫu docs/clay/clay-a-goc-guong.css).
// MÀU vẫn là token của mau.ts; file này chỉ giữ CHẤT: bóng kép (ngoài mềm lệch xuống + inset sáng trên / tối dưới) và lớp men
// (dải sáng cong mép trên thẻ, mảng men trắng sắc nửa trên nút/chip). Chuỗi CSS dùng thẳng cho `boxShadow` / `backgroundImage`
// của React Native ≥ 0.80 (kiến trúc mới) và react-native-web — một nguồn cho cả app lẫn bản web.
import type { ViewStyle } from "react-native";

/** Bóng kép. Bóng ngoài của nút/chip ngắn (≤ 10px) để hai nút xếp sát (khoảng 8) không chồng bóng lên nhau (TestFlight build 6: «nặng»).
 * `the`: thẻ/khối lớn · `nho`: nút sáng, chip, viên icon · `lom`: lòng chảo ấn lõm (rãnh tiến độ, ô nhập, hàng việc). */
export const BONG = {
  the: "0px 16px 24px -14px rgba(10,22,41,0.26), 0px 4px 8px -5px rgba(10,22,41,0.14), inset 0px 1.5px 0px rgba(255,255,255,1), inset 0px -2px 0px rgba(255,255,255,0.7), inset 0px -10px 16px -8px rgba(10,22,41,0.12)",
  nho: "0px 6px 10px -6px rgba(10,22,41,0.26), 0px 2px 3px -1px rgba(10,22,41,0.14), inset 0px 1.5px 0px rgba(255,255,255,1), inset 0px -6px 10px -5px rgba(10,22,41,0.14)",
  lom: "inset 0px 4px 8px rgba(10,22,41,0.13), inset 0px -1.5px 0px rgba(255,255,255,0.95)",
  toi: "0px 6px 10px -5px rgba(10,22,41,0.40), 0px 2px 3px -1px rgba(10,22,41,0.24), inset 0px 1px 0px rgba(255,255,255,0.45), inset 0px -2px 3px rgba(0,0,0,0.4)",
  ngoc: "0px 6px 10px -5px rgba(10,22,41,0.44), 0px 2px 3px -1px rgba(10,22,41,0.24), inset 0px 1px 0px rgba(255,255,255,0.5), inset 0px -2px 3px rgba(0,0,0,0.4)",
  vang: "0px 6px 10px -5px rgba(150,100,0,0.38), 0px 2px 3px -1px rgba(150,100,0,0.22), inset 0px 1px 0px rgba(255,255,255,0.7), inset 0px -2px 3px rgba(120,70,0,0.35)",
  do: "0px 5px 9px -4px rgba(165,31,20,0.6), inset 0px 1px 0px rgba(255,255,255,0.4), inset 0px -2px 3px rgba(0,0,0,0.25)",
  /** cột / thanh / chấm chú giải của biểu đồ: bóng ngắn (cột xếp sát 3px) + viền men trên, chân tối */
  cot: "0px 3px 5px -2px rgba(10,22,41,0.32), inset 0px 1px 0px rgba(255,255,255,0.5), inset 0px -2px 3px rgba(0,0,0,0.22)",
  noi: "0px -6px 24px -12px rgba(10,22,41,0.25), 0px 16px 26px -10px rgba(10,22,41,0.34), inset 0px 1.5px 0px rgba(255,255,255,1), inset 0px -8px 14px -8px rgba(10,22,41,0.12)",
} as const;

/** Lớp men (backgroundImage) phủ trên màu nền của khối. */
export const MEN = {
  /** thẻ sáng: dải trắng cong sát mép trên + chân hơi tối (phản chiếu đáy) */
  the: "radial-gradient(46% 18px at 50% 3px, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 62%, rgba(255,255,255,0) 78%), linear-gradient(180deg, rgba(254,254,253,0) 26%, rgba(10,22,41,0.02) 60%, rgba(10,22,41,0.06) 100%)",
  /** nút sáng / chip / viên xám: nửa trên men trắng, chân hơi tối */
  sang: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 44%, rgba(242,235,227,0) 50%, rgba(10,22,41,0.05) 100%)",
  /** viên màu (xanh, vàng, cam…): đốm men trên + phản chiếu đáy */
  vien: "radial-gradient(60% 34% at 50% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%), radial-gradient(50% 20% at 50% 92%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)",
  /** nút tối than chì — kẹo bọc đường: mảng men cắt sắc ở 1/4 trên */
  toi: "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 26%), radial-gradient(60% 40% at 50% 105%, rgba(120,140,190,0.30) 0%, rgba(0,0,0,0) 100%), linear-gradient(180deg, #1b2b47 0%, #0A1629 100%)",
  ngoc: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 26%), radial-gradient(60% 40% at 50% 105%, rgba(126,217,87,0.4) 0%, rgba(0,0,0,0) 100%), linear-gradient(180deg, #0A1629 0%, #0A1629 100%)",
  vang: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 24%, rgba(255,255,255,0) 26%), linear-gradient(180deg, #f8d68e 0%, #F4C76A 100%)",
  /** huy hiệu số đỏ / thanh tiến độ: nửa trên men */
  nua: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.12) 46%, rgba(255,255,255,0) 50%)",
  /** cột biểu đồ (đứng): ống đất sét tráng men — vệt sáng dọc bên trái, mép phải tối, chỏm trên một đốm men */
  cot: "radial-gradient(60% 9px at 50% 5px, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%), linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.42) 24%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0) 56%, rgba(0,0,0,0.12) 100%)",
  /** thanh ngang biểu đồ / tiến độ: nửa trên men trắng cắt sắc, chân tối nhẹ */
  ong: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.10) 100%)",
  /** ô tab đang chọn: ánh sáng phản chiếu đáy */
  day: "linear-gradient(180deg, rgba(255,255,255,0) 60%, rgba(255,255,255,0.55) 100%)",
} as const;

/** Vệt men lướt chéo khi nhấn (docs/clay/M-anh-men.css › .men::after). */
export const VET = {
  toi: "linear-gradient(105deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.10) 42%, rgba(255,255,255,0.55) 49%, rgba(255,255,255,0.16) 54%, rgba(255,255,255,0) 62%)",
  sang: "linear-gradient(105deg, rgba(255,255,255,0) 34%, rgba(10,22,41,0.035) 41%, rgba(255,255,255,1) 49%, rgba(255,255,255,0.5) 54%, rgba(255,255,255,0) 62%)",
  /** vệt men lướt DỌC trên cột biểu đồ (cột hẹp, vệt chéo 105° không thấy) — chạy từ chân lên đỉnh một lần khi cột mọc xong */
  doc: "linear-gradient(180deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.14) 58%, rgba(255,255,255,0) 70%)",
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

/** Thẻ nổi bật navy (bàn Navy 17/11 — `--hiBg` / `--hiSh` của bm2-trang-chu v36): nền navy loang, chữ trắng, số / dòng nhấn vàng mật.
 *  Khối hero KHÔNG phủ lớp men sáng của thẻ (dải trắng mép trên sẽ thành vệt xám trên nền tối). */
export const HERO = {
  nen: "#0A1629",
  anh: "radial-gradient(90% 70% at 85% 10%, #1d3158 0%, #0A1629 100%)",
  bong: "0px 18px 26px -14px rgba(10,22,41,0.55), inset 0px 1.5px 0px rgba(255,255,255,0.18), inset 0px -10px 16px -8px rgba(0,0,0,0.35)",
  chu: "#ffffff", phu: "#F4C76A", vien: "rgba(255,255,255,0.1)",
} as const;
/** Khối hero dựng sẵn (thẻ, sân minh hoạ có Grow). */
export const KHOI_HERO = { backgroundColor: HERO.nen, backgroundImage: HERO.anh, boxShadow: HERO.bong } as ViewStyle;
