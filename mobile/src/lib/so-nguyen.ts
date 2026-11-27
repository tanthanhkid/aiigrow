/** Ô số nguyên (sao, phút): gõ «45.5» / «2,5» chỉ giữ phần nguyên (45 / 2), không dính phần lẻ thành «455» / «25».
 *  «1.000» / «1,000» (đúng 3 số sau dấu, kiểu hàng nghìn) giữ nguyên thành 1000. */
export const soNguyenGo = (t: string): string => (/^\d{1,3}([.,]\d{3})+$/.test(t.trim()) ? t : t.split(/[.,]/)[0]).replace(/\D/g, "");
