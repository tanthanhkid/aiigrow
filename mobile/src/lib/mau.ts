// Token màu + chữ của AiiGrow — lấy NGUYÊN từ bản thiết kế đã duyệt (aiigrow-thiet-ke/tinh/app.css, khối `.man`), tương phản đo WCAG ở đó:
// nút #0B7A6E chữ trắng 5,33:1 · chữ #075E55 trên #DDF3EE 6,9:1 · chữ phụ #5F6B68 trên #FFFBF4 5,2:1 · điểm #7A4A00 trên #FFF1C9 7,4:1 ·
// lỗi #B42318 trên #FEF0EE 5,9:1 · viền ô nhập #8C9693 3,1:1. Một màu nhấn: xanh ngọc (mầm cây «Grow»); vàng CHỈ dùng cho điểm.
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
