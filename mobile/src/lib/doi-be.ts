// #824: «Đổi người / Đăng xuất» của bé. Thuần (không React) để test được.
// - Chỉ máy có token thiết bị (máy dùng chung đã ghép) mới có màn chọn tên để quay về; khung Kid do agent mở (chỉ phiên Con) không có ⇒ không hiện nút.
// - Ra khỏi máy: gọi máy chủ (lỗi mạng vẫn xoá trên máy), rồi LUÔN về màn chọn tên — không để lỗi nào chặn bước chuyển màn.
// - Tấm trượt (Modal) phải đóng hẳn rồi mới chuyển màn: chuyển ngay khi Modal đang đóng, iOS bỏ qua lệnh điều hướng ⇒ bấm không có tác dụng.
export const TRE_DONG_TAM_MS = 350;

// Chỉ khung web không token (agent mở bằng ?phien=) mới ẩn nút; app native có phiên từ link sâu vẫn đăng xuất được.
export const coTheDoiBe = (coTokenMay: boolean, laWeb = false) => coTokenMay || !laWeb;

export type PhuThuocRa = {
  coTokenMay: boolean;
  roiMay: () => Promise<unknown>;     // POST device/dang-xuat
  raPhienCon: () => Promise<unknown>; // POST kid/dang-xuat
  xoaPhienCon: () => Promise<unknown>;
  veManChonTen: () => void;
};

export async function raKhoiMay(p: PhuThuocRa): Promise<void> {
  try {
    if (p.coTokenMay) { try { await p.roiMay(); } catch { /* mất mạng: vẫn xoá trên máy */ } }
    try { await p.raPhienCon(); } catch { /* vẫn xoá trên máy */ }
    try { await p.xoaPhienCon(); } catch { /* bỏ qua */ }
  } finally {
    p.veManChonTen();
  }
}
