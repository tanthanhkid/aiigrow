/** Ô số nguyên (sao, phút): gõ «45.5» / «2,5» chỉ giữ phần nguyên (45 / 2), không dính phần lẻ thành «455» / «25». */
export const soNguyenGo = (t: string): string => t.split(/[.,]/)[0].replace(/\D/g, "");
