// Token màu + chữ của AiiGrow. Bảng hiện hành: hướng A «than chì & ngọc lục bảo» (24/10, ghi chú bên dưới). Một màu nhấn xanh ngọc;
// vàng CHỈ dùng cho điểm. Tương phản WCAG đo lại 24/10 (review PR #66): chu/nen 17:1 · chu3/nen 5,66 · chinh/trắng 6,41 · trắng/nut 18,7 ·
// chinhInk/chinhSoft 7,72 · tim/trắng 5,94 · viền ô nhập #8a8f8c trên trắng 3,29.
export const M = {
  // 24/10 Thanh chọn hướng A «than chì & ngọc lục bảo» (kiểu Apple/Linear): nền xám ấm trung tính, chữ gần đen, nút chính màu mực,
  // xanh ngọc đậm chỉ làm điểm nhấn; vàng vẫn CHỈ dùng cho điểm. Tương phản: chu3 #5c625f trên #f4f4f2 5,7:1 · chinh #0f6b5c trên trắng 6,4:1.
  nen: "#f4f4f2", the: "#ffffff", vien: "#e7e7e3", vien2: "#d9d9d4", oNhap: "#8a8f8c",
  chu: "#0f1312", chu2: "#3f4542", chu3: "#5c625f",
  chinh: "#0f6b5c", chinhDam: "#0a5246", chinhInk: "#0a5246", chinhSoft: "#e3efeb", chinhSang: "#2bb7a3",
  nut: "#0f1312", nutDam: "#000000",
  diem: "#f5b70a", diemInk: "#7a4a00", diemSoft: "#fff1c9",
  canh: "#92400e", canhSoft: "#fff4e0", loi: "#b42318", loiSoft: "#fef0ee", huy: "#c03a2b",
  lam: "#1d4ed8", lamSoft: "#e8f0ff", xamSoft: "#ebebe7", tim: "#5b4fd6", timSoft: "#ecebfb",
  // nền đầu màn (gradient 300px): Ba Mẹ xám ngọc rất nhạt, Con Nhí vàng nhạt, Teen xanh lam xám
  dauBaMe: "#e6ece9", dauNhi: "#fff0c7", dauTeen: "#e8ecf7",
} as const;

export const BO = { nho: 12, vua: 18, the: 24 } as const;

export const F = { thuong: "Inter_400Regular", dam: "Inter_600SemiBold", rat: "Inter_700Bold" } as const;
