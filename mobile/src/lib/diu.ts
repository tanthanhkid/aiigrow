// Token bản «Dịu» — CHỈ cho phía Con trên điện thoại (thiết kế chốt 06/11, `docs/thiet-ke-chot/con-dt-*`, kit condt-tre/kit-diu.css).
// Không đụng token Clay của Ba Mẹ (mau.ts / clay.ts). Luật: nền kem phẳng, MỘT màu nhấn xanh lá (nút chính, tab đang chọn, vòng giờ,
// thanh tiến độ); vàng CHỈ cho sao; thẻ trắng viền mảnh + bóng xám mềm, ≤ 1 thẻ màu nhạt mỗi màn; nút chính cao 52 màu đặc; chữ Nunito.
// Tương phản (WCAG 2.2): chu #1f2a37 / nen 14,3:1 · chu2 #5f6b7a / nen 5,2:1 · trắng / xanh #2f9e5f 3,3:1 (chữ ≥ 16 đậm — mức chữ lớn)
// · xanhD #1f6e42 / xanhN 6,0:1 · saoInk #8a5a00 / vang 5,4:1.

export const D = {
  nen: "#fbf8f2", the: "#ffffff", vien: "#ece7dc", vien2: "#c9c2b4", xamNhat: "#f1efe9", ic: "#f6f3ec",
  chu: "#1f2a37", chu2: "#5f6b7a", chu3: "#9aa3ae",
  xanh: "#2f9e5f", xanhN: "#e8f5ed", xanhD: "#1f6e42",
  // vàng chỉ cho sao / thưởng
  vang: "#fff5d9", vangVien: "#f5e6b8", sao: "#f5b70a", saoInk: "#8a5a00",
  // chờ (⏳ chờ duyệt / chờ trao) — xám trung tính, không thêm màu nhấn thứ hai
  cho: "#9aa3ae",
  loi: "#b42318", loiN: "#fef0ee",
  // giờ ngủ: nền tối dịu
  dem: "#1f2a44", demThe: "#2a3657", demChu: "#e8ecf7", demChu2: "#aab4cc",
  // vòng giờ: rãnh
  ranh: "#e9e5dc",
  // chạy thử (chỉ hiện ở bản dev): viền cam đứt
  thu: "#b8611a",
  avt: ["#f5a957", "#6aa5e8", "#a98be0", "#e8829b", "#5fbf8f", "#e8b54f"],
} as const;

/** Nunito — web nạp @font-face lúc chạy (phong-chu*.ts), native nạp bằng useFonts (không chờ: chưa xong thì chữ hệ thống). */
export const FD = { dam: "Nunito_700Bold", rat: "Nunito_800ExtraBold", den: "Nunito_900Black" } as const;

/** Kích thước chuẩn: nút chính cao 52, thẻ bo 24, lề màn 16, khoảng giữa khối 12. */
export const KT = { nut: 52, nutNho: 46, bo: 24, boNut: 26, le: 16, khoang: 12, tab: 64 } as const;

/** Bóng xám mềm của thẻ (boxShadow — RN 0.76+ có ở cả native lẫn web). */
export const BONG_D = {
  the: "0px 2px 8px rgba(30,30,20,0.06), 0px 1px 2px rgba(30,30,20,0.05)",
  nut: "0px 3px 8px rgba(47,158,95,0.28)",
  phim: "0px 2px 6px rgba(30,30,20,0.08)",
  noi: "0px -2px 12px rgba(30,30,20,0.06)",
} as const;

/** Màu avatar theo thứ tự bé (Bảo Anh cam, Bảo Minh lam…). */
export const mauAvt = (i: number) => D.avt[((i % D.avt.length) + D.avt.length) % D.avt.length];
