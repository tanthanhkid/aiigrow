// 17/11 (#363): bóng + men đổi theo bàn Navy (bóng ám navy rgba(10,22,41), nút tối navy #1b2b47 → #0A1629, nút vàng mật #f8d68e → #F4C76A).
// Chất liệu «Clay A · màu gốc · bóng gương» (Thanh chốt 24/10 — docs/THIET-KE-CLAY.md, mẫu docs/clay/clay-a-goc-guong.css).
// MÀU vẫn là token của mau.ts; file này chỉ giữ CHẤT: bóng kép (ngoài mềm lệch xuống + inset sáng trên / tối dưới) và lớp men
// (dải sáng cong mép trên thẻ, mảng men trắng sắc nửa trên nút/chip). Chuỗi CSS dùng thẳng cho `boxShadow` / `backgroundImage`
// của React Native ≥ 0.80 (kiến trúc mới) và react-native-web — một nguồn cho cả app lẫn bản web.
import type { ViewStyle } from "react-native";

/** Bóng kép. Bóng ngoài của nút/chip ngắn (≤ 10px) để hai nút xếp sát (khoảng 8) không chồng bóng lên nhau (TestFlight build 6: «nặng»).
 * `the`: thẻ/khối lớn · `nho`: nút sáng, chip, viên icon · `lom`: lòng chảo ấn lõm (rãnh tiến độ, ô nhập, hàng việc). */
export const BONG = {
  /** «Ánh kim»: bóng đôi neumorphism — tối nâu ấm lệch xuống-phải, sáng kem lệch lên-trái (mẫu E: 8/16 thẻ, 5/10 nút nhỏ). */
  the: "8px 8px 16px rgba(120,98,70,0.28), -8px -8px 16px #FFFBF5",
  nho: "4px 4px 9px rgba(120,98,70,0.28), -4px -4px 9px #FFFBF5",
  /** lõm: hai bóng inset (ô nhập, rãnh tiến độ, nút phụ, ô đang chọn) */
  lom: "inset 4px 4px 8px rgba(120,98,70,0.28), inset -4px -4px 8px #FFFBF5",
  /** khối TỐI đặc (toast, bảng mạng, nút xoá đỏ): bóng navy đậm hơn xuống-phải + sáng kem lên-trái, chỉ sáng mép trên (không viền vàng) */
  toi: "5px 6px 14px rgba(10,22,41,0.34), -4px -4px 10px #FFFBF5, inset 0px 1px 0px rgba(255,255,255,0.14)",
  /** ô nhấn navy đang bật (chip / nút «Duyệt» / viên tick): như `toi` nhưng bóng nâu ấm của E + viền trong vàng mảnh */
  ngoc: "4px 4px 10px rgba(120,98,70,0.32), -4px -4px 10px #FFFBF5, inset 0px 0px 0px 1px rgba(244,199,106,0.35)",
  /** vàng kim: nổi đôi + chỉ sáng mép trên (mẫu E `.nut`) */
  vang: "4px 4px 10px rgba(120,98,70,0.28), -4px -4px 10px #FFFBF5, inset 0px 1px 0px rgba(255,255,255,0.6)",
  do: "4px 4px 10px rgba(120,98,70,0.30), -4px -4px 10px #FFFBF5, inset 0px 1px 0px rgba(255,255,255,0.35)",
  /** cột / thanh / chấm chú giải của biểu đồ: bóng ngắn (cột xếp sát 3px) */
  cot: "2px 2px 4px rgba(120,98,70,0.30), inset 0px 1px 0px rgba(255,255,255,0.45)",
  /** TRÊN NỀN TỐI (hero navy): chỉ bóng tối + viền vàng mảnh, KHÔNG quầng sáng kem (quầng #FFFBF5 thành vệt trắng trên navy) */
  heroThe: "5px 6px 14px rgba(0,0,0,0.45), inset 0px 0px 0px 1px rgba(244,199,106,0.35)",
  heroNho: "3px 4px 9px rgba(0,0,0,0.45), inset 0px 0px 0px 1px rgba(244,199,106,0.35)",
  /** nút vàng kim trên nền tối: bóng tối + sáng mép trên */
  heroVang: "3px 4px 9px rgba(0,0,0,0.45), inset 0px 1px 0px rgba(255,255,255,0.6)",
  /** bảng trượt / lớp nổi: bóng nâu ấm hai phía */
  noi: "0px -6px 24px -12px rgba(120,98,70,0.35), 0px 16px 26px -10px rgba(120,98,70,0.40), inset 0px 1px 0px #FFFBF5",
} as const;

/** Lớp men (backgroundImage) phủ trên màu nền của khối. */
export const MEN = {
  /** thẻ sáng: «Ánh kim» là mặt kem phẳng nổi bằng bóng — không phủ men (chuỗi rỗng ⇒ LopMen không vẽ lớp) */
  the: "",
  /** nút sáng / chip / viên xám: phẳng như thẻ (Ánh kim) */
  sang: "",
  /** viên màu (xanh, vàng, cam…): đốm men trên + phản chiếu đáy */
  vien: "radial-gradient(60% 34% at 50% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%), radial-gradient(50% 20% at 50% 92%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)",
  /** nút tối than chì — kẹo bọc đường: mảng men cắt sắc ở 1/4 trên */
  toi: "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 26%), radial-gradient(60% 40% at 50% 105%, rgba(120,140,190,0.30) 0%, rgba(0,0,0,0) 100%), linear-gradient(180deg, #1b2b47 0%, #0A1629 100%)",
  /** nút / chip navy đang bật: mảng men trên + quầng vàng kim ở đáy (tông E, không còn quầng ô liu) */
  ngoc: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 26%), radial-gradient(60% 40% at 50% 105%, rgba(244,199,106,0.22) 0%, rgba(0,0,0,0) 100%), linear-gradient(180deg, #0A1629 0%, #0A1629 100%)",
  /** vàng kim loại (mẫu E `--kim`) */
  vang: "linear-gradient(135deg, #FBE7B0 0%, #F4C76A 38%, #C9973B 72%, #F2D48C 100%)",
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
  /** trên hero navy: khối / viên nhỏ chỉ bóng tối (không quầng sáng) */
  heroThe: { boxShadow: BONG.heroThe } as ViewStyle,
  heroNho: { boxShadow: BONG.heroNho } as ViewStyle,
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
  /** «Ánh kim»: hộp trang sức navy nổi đôi trên kem + viền trong vàng mảnh (mẫu E `.gio`) */
  bong: "8px 8px 18px rgba(120,98,70,0.28), -6px -6px 14px #FFFBF5, inset 0px 0px 0px 1px rgba(244,199,106,0.35)",
  chu: "#ffffff", phu: "#F4C76A", vien: "rgba(255,255,255,0.1)",
} as const;
/** Khối hero dựng sẵn (thẻ, sân minh hoạ có Grow). */
export const KHOI_HERO = { backgroundColor: HERO.nen, backgroundImage: HERO.anh, boxShadow: HERO.bong } as ViewStyle;
