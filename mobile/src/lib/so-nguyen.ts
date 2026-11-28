// Ô số nguyên (sao, phút). #743: gõ «2.5» trước đây mất dấu chấm NGAY từng phím («2» → «2.» → «2» → «25») nên thành 25 lặng lẽ.
// Giờ ô GIỮ dấu . , Ba Mẹ gõ (thấy đúng chữ mình gõ), còn docSoNguyen báo «Chỉ nhập số nguyên» và chặn nút Lưu / Chọn — không đổi giá trị ngầm.
// «1.000» / «1,000» (đúng 3 số sau dấu, kiểu hàng nghìn) vẫn hiểu là 1000.

/** Chữ còn lại trong ô: chữ số và dấu . , (ký tự khác bỏ). */
export const soNguyenGo = (t: string): string => t.replace(/[^\d.,]/g, "");

export const LOI_SO_NGUYEN = "Chỉ nhập số nguyên";
const NGHIN = /^\d{1,3}([.,]\d{3})+$/;

/** Chuỗi ô ⇒ số nguyên; null khi trống; NaN khi có phần lẻ («2.5», «45,5», «3.») — bên gọi báo LOI_SO_NGUYEN. */
export function docSoNguyen(t: string): number | null {
  const s = t.trim();
  if (!s) return null;
  if (NGHIN.test(s)) return Number(s.replace(/[.,]/g, ""));
  if (!/^\d+$/.test(s)) return NaN;
  return Number(s);
}

/** Câu lỗi khi ô có phần lẻ, không thì null. */
export const loiSoNguyen = (t: string): string | null => (Number.isNaN(docSoNguyen(t)) ? LOI_SO_NGUYEN : null);
