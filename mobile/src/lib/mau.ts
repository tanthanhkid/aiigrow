import { Platform } from "react-native";

// Token màu + chữ của AiiGrow phía Ba Mẹ. Bảng hiện hành: «Navy» (17/11, ghi chú bên dưới; trước đó hướng A «than chì & ngọc lục bảo» 24/10). Một màu nhấn xanh ngọc;
// vàng CHỈ dùng cho điểm. Tương phản WCAG đo lại 24/10 (review PR #66): chu/nen 17:1 · chu3/nen 5,66 · chinh/trắng 6,41 · trắng/nut 18,7 ·
// chinhInk/chinhSoft 7,72 · tim/trắng 5,94 · viền ô nhập #8a8f8c trên trắng 3,29.
export const M = {
  // 17/11 bàn thiết kế chốt «mẫu 1 Navy» cho TOÀN BỘ màn Ba Mẹ (màn mẫu bm2-trang-chu v36, issue #363): nền kem, chữ + nút + điểm nhấn navy,
  // vàng mật CHỈ cho sao, cam cho huy hiệu số, ô liu cho «xong / đã kết nối». Phía Con KHÔNG dùng bảng này (diu.ts).
  // Tương phản (WCAG): chu #0A1629 / nen 15,9:1 · chu3 #5a5a5a / nen 6,0:1 · trắng / chinh 17,9:1 · canh #a84505 / canhSoft 5,0:1 (bàn #b34a06 chỉ 4,5:1 — sẫm hơn một chút cho đạt cổng) · loi #b81f1f / loiSoft 5,6:1.
  // «Ánh kim» (phong cách E): neumorphism mỏng — mặt thẻ CÙNG màu nền kem #ECE4D9, nổi / lõm bằng bóng đôi (clay.ts); chữ phụ nâu ấm.
  // Tương phản trên #ECE4D9: chu 14,4 · chu2 9,0 · chu3 #5f554b 5,8 (mẫu E dùng #7c7166 chỉ 3,8 ⇒ sẫm hơn) · lienKet #7a5a1f 5,0 · canh 4,7.
  nen: "#ECE4D9", the: "#ECE4D9", vien: "#ddd2c4", vien2: "#e2d8cb", oNhap: "#8a8478",
  chu: "#0A1629", chu2: "#3a3a3a", chu3: "#5f554b",
  chinh: "#0A1629", chinhDam: "#0A1629", chinhInk: "#0A1629", chinhSoft: "#E3D9CB", chinhSang: "#7ED957",
  // chữ liên kết / «Tất cả ›» vàng đồng sẫm (mẫu E #8a6a2b chỉ 4,0:1)
  lienKet: "#7a5a1f",
  // dấu sách trước tiêu đề mục: đồng kim (giữa dải vàng kim `MEN.vang`)
  dauSach: "#C9973B",
  // nút chính: viên navy (gradient #1b2b47 → #0A1629 ở MEN.toi)
  nut: "#0A1629", nutDam: "#1b2b47",
  diem: "#F4C76A", diemInk: "#0A1629", diemSoft: "#fbf0d6",
  canh: "#a84505", canhSoft: "#ffe6d6", loi: "#b81f1f", loiSoft: "#ffe1e1", huy: "#b81f1f",
  // huy hiệu số (chuông, tab, tiêu đề mục): «Ánh kim» vàng chữ navy (11,4:1) — trước là cam #FF751F
  badge: "#F4C76A",
  // «xong / đã kết nối / Không tính phút»: ô liu, nền nhạt chữ navy
  ok: "#7ED957", okSoft: "#e4f5da",
  lam: "#1d4ed8", lamSoft: "#e1e9fb", xamSoft: "#E3D9CB", tim: "#5b4fd6", timSoft: "#ecebfb",
  // màu mục của biểu đồ Thời gian màn hình: cam video, hồng video ngắn, rêu giải trí khác
  camDam: "#c2410c", hong: "#be185d", reu: "#4d7c0f",
  // rãnh lõm của biểu đồ / thanh tiến độ
  ranh: "#E4DACD",
  // nền đầu màn (gradient 300px): Ba Mẹ phẳng kem (Ánh kim — trước là #e8ddcf → nền kem), Con Nhí vàng nhạt, Teen xanh lam xám (Con không đổi)
  dauBaMe: "#ECE4D9", dauNhi: "#fff0c7", dauTeen: "#e8ecf7",
} as const;

export const BO = { nho: 12, vua: 18, the: 24 } as const;

/** Be Vietnam Pro (17/11, thay Inter — bàn Navy #363). iOS gọi theo tên PostScript trong tệp font nhúng (BeVietnamPro-Regular…); Android theo tên tệp
 * trong assets/fonts (plugin expo-font); web theo tên @font-face mà useFonts đặt (phong-chu.web.ts). Cả ba trỏ cùng bốn tệp assets/fonts/BeVietnamPro_*.ttf. */
export const F = Platform.OS === "ios"
  ? ({ thuong: "BeVietnamPro-Regular", dam: "BeVietnamPro-SemiBold", rat: "BeVietnamPro-ExtraBold", den: "BeVietnamPro-ExtraBold", dam7: "BeVietnamPro-Bold", tieu: "Fraunces-SemiBold", tieu7: "Fraunces-Bold" } as const)
  : ({ thuong: "BeVietnamPro_400Regular", dam: "BeVietnamPro_600SemiBold", rat: "BeVietnamPro_800ExtraBold", den: "BeVietnamPro_800ExtraBold", dam7: "BeVietnamPro_700Bold", tieu: "Fraunces_600SemiBold", tieu7: "Fraunces_700Bold" } as const);
// `tieu` / `tieu7`: Fraunces 600 / 700 — CHỈ cho tiêu đề màn / mục, chữ cái avatar, số lớn ở thẻ hero («Ánh kim»); nút và tên dòng giữ Be Vietnam Pro.
// 14/11: chữ đậm 800 ở phần lớn chỗ (tiêu đề, tên dòng, nút, số) ⇒ `rat` = ExtraBold 800; `den` giữ tên riêng cho chỗ cố ý 800; `dam7` = Bold 700.
