import { Platform } from "react-native";

// Token màu + chữ của AiiGrow phía Ba Mẹ. Bảng hiện hành: «Navy» (17/11, ghi chú bên dưới; trước đó hướng A «than chì & ngọc lục bảo» 24/10). Một màu nhấn xanh ngọc;
// vàng CHỈ dùng cho điểm. Tương phản WCAG đo lại 24/10 (review PR #66): chu/nen 17:1 · chu3/nen 5,66 · chinh/trắng 6,41 · trắng/nut 18,7 ·
// chinhInk/chinhSoft 7,72 · tim/trắng 5,94 · viền ô nhập #8a8f8c trên trắng 3,29.
export const M = {
  // 17/11 bàn thiết kế chốt «mẫu 1 Navy» cho TOÀN BỘ màn Ba Mẹ (màn mẫu bm2-trang-chu v36, issue #363): nền kem, chữ + nút + điểm nhấn navy,
  // vàng mật CHỈ cho sao, cam cho huy hiệu số, ô liu cho «xong / đã kết nối». Phía Con KHÔNG dùng bảng này (diu.ts).
  // Tương phản (WCAG): chu #0A1629 / nen 15,9:1 · chu3 #5a5a5a / nen 6,0:1 · trắng / chinh 17,9:1 · canh #983e04 / canhSoft #F0DCC8 5,2:1 (Ánh kim — kem pha đất nung, thay đào #ffe6d6), trên chinhSoft/xamSoft #E3D9CB 5,0:1, trên chonSoft #F1E2BF 5,4:1 (Ánh kim — #a84505 chỉ 4,3 trên kem lõm) · loi #b81f1f / loiSoft 5,6:1.
  // «Ánh kim» (phong cách E): neumorphism mỏng — mặt thẻ CÙNG màu nền kem #ECE4D9, nổi / lõm bằng bóng đôi (clay.ts); chữ phụ nâu ấm.
  // Tương phản trên #ECE4D9: chu 14,4 · chu2 9,0 · chu3 #5f554b 5,8 (mẫu E dùng #7c7166 chỉ 3,8 ⇒ sẫm hơn) · lienKet #7a5a1f 5,0 · canh 4,7.
  // chinhSoft = mặt trung tính kem lõm #E3D9CB (như trước Ánh kim). Trạng thái ĐANG CHỌN (cặp bật/tắt) dùng riêng chonSoft #F1E2BF (kem ánh vàng), không dùng chinhSoft.
  nen: "#ECE4D9", the: "#ECE4D9", vien: "#ddd2c4", vien2: "#e2d8cb", oNhap: "#8a8478",
  chu: "#0A1629", chu2: "#3a3a3a", chu3: "#5f554b",
  chinh: "#0A1629", chinhDam: "#0A1629", chinhInk: "#0A1629", chinhSoft: "#E3D9CB", chinhSang: "#7ED957",
  chonSoft: "#F1E2BF",
  // nút tắt (Nut tat): nền đặc không giảm opacity — #DDD3C6 / navy 12,3:1, chữ chu3 #5f554b / #DDD3C6 4,9:1
  tatNen: "#DDD3C6",
  // chấm nhóm ở nút quyết «Thêm vào danh sách» (≥3:1 trên nền nút): Tính phút cam #A94A07 / vàng #F4C76A 3,6:1 · Không tính phút ô liu #3F7D1F / kem #ECE4D9 4,0:1
  chamTinh: "#A94A07", chamKhong: "#3F7D1F",
  // chữ liên kết / «Tất cả ›» vàng đồng sẫm (mẫu E #8a6a2b chỉ 4,0:1)
  lienKet: "#7a5a1f",
  // dấu sách trước tiêu đề mục: đồng kim (giữa dải vàng kim `MEN.vang`)
  dauSach: "#C9973B",
  // icon tab đang chọn: vàng kim đồng (mẫu E `.tab div.on svg` #9C7428 — 3,4:1 trên kem lõm, đạt ngưỡng 3:1 cho hình đồ hoạ) — #417
  kimIcon: "#9C7428",
  // số âm / nợ trên thẻ hero navy: cam san hô (8,8:1 trên #0A1629) — nợ vẫn phải trông như cảnh báo
  noHero: "#FF9B6B",
  // nút chính: viên navy (gradient #1b2b47 → #0A1629 ở MEN.toi)
  nut: "#0A1629", nutDam: "#1b2b47",
  diem: "#F4C76A", diemInk: "#0A1629", diemSoft: "#fbf0d6",
  canh: "#983e04", canhSoft: "#F0DCC8", loi: "#b81f1f", loiSoft: "#ffe1e1", huy: "#b81f1f",
  // huy hiệu số (chuông, tab, tiêu đề mục): «Ánh kim» vàng chữ navy (11,4:1) — trước là cam #FF751F
  badge: "#F4C76A",
  // «xong / đã kết nối / Không tính phút»: ô liu, nền nhạt chữ navy
  ok: "#7ED957", okSoft: "#e4f5da",
  // «Ánh kim» (#386 G4): bỏ lam/tím lạnh — giữ TÊN token (nhiều màn dùng), đổi giá trị sang bảng E: «lam» = navy nhạt #1b2b47 trên kem lõm (10,2:1),
  // «tim» = đồng sẫm #7a5a1f trên kem ánh vàng #F1E2BF (5,0:1); chữ đậm trên timSoft dùng timInk #6b4e17 (6,0:1).
  lam: "#1b2b47", lamSoft: "#E3D9CB", xamSoft: "#E3D9CB", tim: "#7a5a1f", timSoft: "#F1E2BF", timInk: "#6b4e17",
  // màu mục của biểu đồ Thời gian màn hình: cam video, hồng video ngắn, rêu giải trí khác
  camDam: "#c2410c", hong: "#be185d", reu: "#4d7c0f",
  // rãnh lõm của biểu đồ / thanh tiến độ
  ranh: "#E4DACD",
  // nền đầu màn (gradient 300px): Ba Mẹ phẳng kem (Ánh kim — trước là #e8ddcf → nền kem), Con Nhí vàng nhạt, Teen xanh lam xám (Con không đổi)
  dauBaMe: "#ECE4D9", dauNhi: "#fff0c7", dauTeen: "#e8ecf7",
} as const;

/** BẢNG MÀU HỒ SƠ CON DUY NHẤT (avatar «mau-<số>»): [màu chọn ở Lần đầu, nền nhạt thẻ hồ sơ, tông đậm cho avatar chữ trắng ở Hằng ngày
 *  (bàn them-h60stad7, bm2-trang-chu `.av.a/.m/.n/.k` — đủ tương phản)]. Lần đầu / Sửa hồ sơ đọc [0][1]; lib/hang-ngay › mauCon đọc [2]. */
// «Ánh kim» (#386 G1): avatar MỌI người là viên navy chữ cái vàng kim, vòng vàng (mẫu E `.be.on .av`) — `Avt` tự vẽ, không đọc màu truyền vào.
// Bảng còn 5 chấm màu E (navy · vàng kim · đồng · ô liu · mận) cho ô «Màu của con»; [1] thẻ hồ sơ = kem phẳng (G5); [2] tông avatar = navy.
export const MAU_HO_SO: [string, string, string][] = [["#0A1629", "#ECE4D9", "#0A1629"], ["#C9973B", "#ECE4D9", "#0A1629"], ["#9C5B2E", "#ECE4D9", "#0A1629"],
  ["#4F6B2A", "#ECE4D9", "#0A1629"], ["#6E3B4E", "#ECE4D9", "#0A1629"]];

export const BO = { nho: 12, vua: 18, the: 24 } as const;

/** Be Vietnam Pro (17/11, thay Inter — bàn Navy #363). iOS gọi theo tên PostScript trong tệp font nhúng (BeVietnamPro-Regular…); Android theo tên tệp
 * trong assets/fonts (plugin expo-font); web theo tên @font-face mà useFonts đặt (phong-chu.web.ts). Cả ba trỏ cùng bốn tệp assets/fonts/BeVietnamPro_*.ttf. */
export const F = Platform.OS === "ios"
  ? ({ thuong: "BeVietnamPro-Regular", dam: "BeVietnamPro-SemiBold", rat: "BeVietnamPro-ExtraBold", den: "BeVietnamPro-ExtraBold", dam7: "BeVietnamPro-Bold", tieu: "BeVietnamPro-ExtraBold", tieu7: "BeVietnamPro-ExtraBold", logo: "Fraunces-SemiBold" } as const)
  : ({ thuong: "BeVietnamPro_400Regular", dam: "BeVietnamPro_600SemiBold", rat: "BeVietnamPro_800ExtraBold", den: "BeVietnamPro_800ExtraBold", dam7: "BeVietnamPro_700Bold", tieu: "BeVietnamPro_800ExtraBold", tieu7: "BeVietnamPro_800ExtraBold", logo: "Fraunces_600SemiBold" } as const);
// `tieu` / `tieu7`: tiêu đề màn / mục, chữ cái avatar, số lớn ở thẻ hero — Be Vietnam Pro ExtraBold theo bộ thương hiệu đã chốt (#417, thay Fraunces).
// `logo`: Fraunces 600 — CHỈ cho chữ logo.
// 14/11: chữ đậm 800 ở phần lớn chỗ (tiêu đề, tên dòng, nút, số) ⇒ `rat` = ExtraBold 800; `den` giữ tên riêng cho chỗ cố ý 800; `dam7` = Bold 700.
