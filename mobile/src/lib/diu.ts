import { Platform } from "react-native";

// Token phía Con trên điện thoại. Tên token giữ như bản «Dịu» (06/11, `docs/thiet-ke-chot/con-dt-*`) nhưng GIÁ TRỊ đã sang phong cách E «Ánh kim»
// (18/11, #396 #397 — khớp agent-android `maycon/Diu.kt` bản E): nền kem neumorphism #ECE4D9, thẻ CÙNG màu nền nổi bằng bóng đôi, ô nhập / ô chọn lõm,
// nút chính vàng kim chữ navy, giờ ngủ nền navy; tiêu đề + số Fraunces 600, chữ thường Be Vietnam Pro. `xanh` (màu «chính») nay là navy.
// Không đụng token Ba Mẹ (mau.ts / clay.ts) — bóng / gradient chép lại ở đây để hai phía sửa độc lập.
// Tương phản (WCAG 2.2) trên nền #ECE4D9: chu #0A1629 14,4:1 · chu2 #3B352E 9,6:1 · chu3 #5F554B 5,8:1 (trên kem lõm #E2D6C4 5,1:1) · loi #A2412C 5,0:1
// · navy / vàng kim (điểm sẫm nhất #C9973B) 6,9:1 · vàng #F4C76A / navy 11,4:1 · demChu2 #D4C9BA / dem 11,1:1 · chu3 / tat #DDD3C6 4,9:1 · avatar: vàng #F4C76A / navy 11,4:1.

export const D = {
  nen: "#ECE4D9", the: "#ECE4D9", vien: "#D9CDBC", vien2: "#C2B5A3", xamNhat: "#E3D9CB", ic: "#E3D9CB",
  chu: "#0A1629", chu2: "#3B352E", chu3: "#5F554B",
  // «chính» = navy (chấm PIN đã gõ, ô đang gõ…); xanhN = ô chọn / thẻ nhấn kem sẫm (lõm); xanhD = chữ nhấn navy
  xanh: "#0A1629", xanhN: "#E2D6C4", xanhD: "#0A1629",
  // sao / thưởng: thẻ kem ánh vàng, viền vàng mảnh; chữ sao navy (≥ 6,6:1 cả trên vàng kim)
  vang: "#F1E2BF", vangVien: "#D9AE57", sao: "#F4C76A", saoInk: "#0A1629",
  // chờ (⏳ chờ duyệt / chờ trao) — chữ trung tính trên kem lõm, không thêm màu nhấn
  cho: "#5F554B",
  loi: "#A2412C", loiN: "#FDECEA",
  // giờ ngủ / khoá: nền navy, thẻ navy sáng hơn, chữ kem
  dem: "#0A1629", demThe: "#14233D", demChu: "#F2EBE3", demChu2: "#D4C9BA",
  // vòng giờ / thanh tiến độ: rãnh kem sẫm, cung đồng kim
  ranh: "#E2D6C4", kimDam: "#C9973B",
  // ô nhập lõm, nút tắt (nền đặc — không giảm opacity)
  lom: "#E5DCCF", tat: "#DDD3C6",
  // sáng kem (bóng sáng lệch lên-trái)
  sang: "#FFFBF5",
  // chạy thử (chỉ hiện ở bản dev): viền cam đứt
  thu: "#983E04",
  // (cũ) màu riêng từng bé — avatar «Ánh kim» nay mọi bé navy chữ vàng (AvtD); giữ để không vỡ chỗ gọi mauAvt
  avt: ["#F5A957", "#6AA9E9", "#B48CDE", "#E98AA9", "#5CB88A", "#E8B54F"],
} as const;

/** Chữ: `dam` = Be Vietnam Pro 400 (thân), `rat` = Be Vietnam Pro 700 (dòng tiêu, nút), `den` = Fraunces 600 (tiêu đề màn, số to).
 *  Tệp phông nhúng sẵn lúc build (plugin expo-font trong app.json); web nạp @font-face ở phong-chu.web.ts. iOS gọi theo tên PostScript. */
export const FD = Platform.OS === "ios"
  ? ({ dam: "BeVietnamPro-Regular", rat: "BeVietnamPro-Bold", den: "Fraunces-SemiBold" } as const)
  : ({ dam: "BeVietnamPro_400Regular", rat: "BeVietnamPro_700Bold", den: "Fraunces_600SemiBold" } as const);

/** Kích thước chuẩn: nút chính cao 52, thẻ bo 24, lề màn 16, khoảng giữa khối 12. */
export const KT = { nut: 52, nutNho: 46, bo: 24, boNut: 26, le: 16, khoang: 12, tab: 64 } as const;

/** Bóng «Ánh kim» (boxShadow — RN 0.76+ có ở cả native lẫn web): bóng đôi nâu ấm lệch xuống-phải + sáng kem lệch lên-trái. */
export const BONG_D = {
  /** thẻ / khối lớn nổi */
  the: "8px 8px 16px rgba(120,98,70,0.28), -8px -8px 16px #FFFBF5",
  /** nút vàng kim: nổi đôi + chỉ sáng mép trên */
  nut: "4px 4px 10px rgba(120,98,70,0.28), -4px -4px 10px #FFFBF5, inset 0px 1px 0px rgba(255,255,255,0.6)",
  /** nút nhỏ / phím / chip nổi */
  phim: "4px 4px 9px rgba(120,98,70,0.28), -4px -4px 9px #FFFBF5",
  /** thanh tab / lớp nổi */
  noi: "0px -6px 24px -12px rgba(120,98,70,0.35), 0px 16px 26px -10px rgba(120,98,70,0.40), inset 0px 1px 0px #FFFBF5",
  /** lõm: ô nhập, nút phụ, ô đang chọn, rãnh */
  lom: "inset 4px 4px 8px rgba(120,98,70,0.28), inset -4px -4px 8px #FFFBF5",
  /** khối navy trên kem (giờ ngủ, nút chụp): nổi đôi + viền trong vàng mảnh */
  dem: "5px 6px 14px rgba(120,98,70,0.30), -4px -4px 10px #FFFBF5, inset 0px 0px 0px 1px rgba(244,199,106,0.35)",
} as const;

/** Lớp gradient (backgroundImage) — luôn đặt kèm `backgroundColor` đặc gần màu giữa để tương phản tính đúng khi gradient không vẽ. */
export const MEN_D = {
  /** vàng kim loại 135° (mẫu E `--kim`) */
  kim: "linear-gradient(135deg, #FBE7B0 0%, #F4C76A 38%, #C9973B 72%, #F2D48C 100%)",
  /** navy loang (khối tối) */
  dem: "radial-gradient(90% 70% at 85% 10%, #1d3158 0%, #0A1629 100%)",
} as const;

/** Màu avatar theo thứ tự bé (Bảo Anh cam, Bảo Minh lam…). */
export const mauAvt = (i: number) => D.avt[((i % D.avt.length) + D.avt.length) % D.avt.length];
