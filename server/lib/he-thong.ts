// Lớp «hệ thống» do Admin AiiLab đặt ở /admin (tham số mục 10, Allowlist thêm) — giữ trong bộ nhớ tiến trình để thamSo() / phanLoai()
// vẫn đồng bộ như cũ. Nạp lúc mở DB (db.ts) và cập nhật ngay khi Admin lưu (admin.ts). Tệp này không import gì để tránh vòng import.
// Nhiều tiến trình (serverless): tiến trình khác thấy thay đổi ở lần mở DB kế tiếp — chấp nhận cho bản thử, ghi trong KE-HOACH.
export const heThong: { thamSo: Record<string, unknown>; allowlistThem: string[] } = { thamSo: {}, allowlistThem: [] };

export function napHeThong(r: { khoa: string; gia_tri: unknown }[]) {
  for (const x of r) {
    if (x.khoa === "tham_so" && x.gia_tri && typeof x.gia_tri === "object") heThong.thamSo = x.gia_tri as Record<string, unknown>;
    if (x.khoa === "allowlist_them" && Array.isArray(x.gia_tri)) heThong.allowlistThem = x.gia_tri.map(String);
  }
}
