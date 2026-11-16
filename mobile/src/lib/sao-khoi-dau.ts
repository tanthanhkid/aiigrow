// Sao tặng khởi đầu (#306, bàn bm1-ob-gio v21): số nguyên 0…200, nút −/+ bước 10, mặc định 30 — khớp máy chủ server/lib/so-sao.ts › saoKhoiDauHopLe.
// Hàm thuần (node --test); lib/so-sao.tsx xuất lại.
export const SAO_KHOI_DAU_TOI_DA = 200;
export const SAO_KHOI_DAU_BUOC = 10;
export const SAO_KHOI_DAU_MD = 30;
/** Bấm −/+ ⇒ giá trị mới (làm tròn về bội của 10), kẹp trong 0…TOI_DA. */
export const doiSaoKhoiDau = (n: number, huong: 1 | -1) =>
  Math.min(SAO_KHOI_DAU_TOI_DA, Math.max(0, Math.round((n + huong * SAO_KHOI_DAU_BUOC) / SAO_KHOI_DAU_BUOC) * SAO_KHOI_DAU_BUOC));
