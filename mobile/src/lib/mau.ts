// Token màu + chữ của AiiGrow — lấy NGUYÊN từ bản thiết kế đã duyệt (aiigrow-thiet-ke/tinh/app.css, khối `.man`), tương phản đo WCAG ở đó:
// nút #0B7A6E chữ trắng 5,33:1 · chữ #075E55 trên #DDF3EE 6,9:1 · chữ phụ #5F6B68 trên #FFFBF4 5,2:1 · điểm #7A4A00 trên #FFF1C9 7,4:1 ·
// lỗi #B42318 trên #FEF0EE 5,9:1 · viền ô nhập #8C9693 3,1:1. Một màu nhấn: xanh ngọc (mầm cây «Grow»); vàng CHỈ dùng cho điểm.
export const M = {
  nen: "#fffbf4", the: "#ffffff", vien: "#efe7da", vien2: "#e2d9ca", oNhap: "#8c9693",
  chu: "#10231f", chu2: "#44524f", chu3: "#5f6b68",
  chinh: "#0b7a6e", chinhDam: "#075e55", chinhInk: "#075e55", chinhSoft: "#ddf3ee", chinhSang: "#2bb7a3",
  diem: "#f5b70a", diemInk: "#7a4a00", diemSoft: "#fff1c9",
  canh: "#92400e", canhSoft: "#fff4e0", loi: "#b42318", loiSoft: "#fef0ee", huy: "#c03a2b",
  lam: "#1d4ed8", lamSoft: "#e8f0ff", xamSoft: "#f3efe8", tim: "#6c5ce7", timSoft: "#eeeafe",
  // nền đầu màn (gradient 300px): Ba Mẹ xanh ngọc nhạt, Con Nhí vàng nhạt, Teen xanh lam xám
  dauBaMe: "#e3f5f0", dauNhi: "#fff0c7", dauTeen: "#e8ecf7",
} as const;

export const BO = { nho: 12, vua: 18, the: 24 } as const;

export const F = { thuong: "Nunito_500Medium", dam: "Nunito_700Bold", rat: "Nunito_800ExtraBold" } as const;
