// Quà Ba Mẹ mua (thiết kế chốt 14/11 — them-s416tfdj «Quà của Bảo Anh» tab Voucher AiiGrow, them-hn2754ce chi tiết). Bảng giá lấy nguyên văn từ thiết kế.
// Thanh toán (them-bbxb64oc / them-j1zshjyw) CHƯA có cổng — màn chi tiết dẫn Ba Mẹ nhắn AiiGrow (chờ Nghi chọn cổng thanh toán).
export type Voucher = { ma: string; e: string; ten: string; moTa: string; gia: number; sao: number };
export const VOUCHER: Voucher[] = [
  { ma: "cafe20", e: "☕", ten: "Voucher AiiCafe 20k", moTa: "Con dùng ở AiiCafe: nước, bánh, đồ chơi nhỏ.", gia: 20_000, sao: 200 },
  { ma: "cafe50", e: "☕", ten: "Voucher AiiCafe 50k", moTa: "Con dùng ở AiiCafe: nước, bánh, đồ chơi nhỏ.", gia: 50_000, sao: 500 },
  { ma: "cafe100", e: "☕", ten: "Voucher AiiCafe 100k", moTa: "Con dùng ở AiiCafe: nước, bánh, đồ chơi nhỏ.", gia: 100_000, sao: 1000 },
  { ma: "sach", e: "📗", ten: "Sách AiiLab con chọn", moTa: "Con chọn một cuốn sách ở AiiLab.", gia: 60_000, sao: 150 },
  { ma: "workshop", e: "🤖", ten: "Workshop AiiLab", moTa: "Một buổi workshop AI cho trẻ ở AiiLab.", gia: 150_000, sao: 600 },
];
/** 50000 ⇒ «50.000đ» */
export const dong = (n: number) => `${soCham(n)}đ`;
/** 1000 ⇒ «1.000» */
export const soCham = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
