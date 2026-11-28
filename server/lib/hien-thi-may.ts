// #657: MỘT trạng thái hiển thị cho mỗi máy ở mọi màn Ba Mẹ (Máy trong nhà, chi tiết máy, Hồ sơ Con, Màn hình, Cả nhà) và MỘT nguồn số «cần sửa».
// Thứ tự ưu tiên: đang gỡ · đang tắt (máy báo tắt / chưa có nhịp) · mất mạng (im quá ngưỡng, hoặc im > 10 phút hôm nay) · cần sửa (thiếu quyền bảo vệ /
// lệch chuẩn — việc Ba Mẹ làm được) · bảo vệ. Máy mất mạng / tắt KHÔNG phải «cần sửa» (không có gì để sửa trên màn Sửa).
export type HienThiMay = "dang_go" | "tat" | "mat_mang" | "can_sua" | "bao_ve";

export function hienThiMay(x: { trangThai: string; baoVe?: string | null; dangGo?: boolean; matMang?: boolean }): HienThiMay {
  if (x.dangGo) return "dang_go";
  if (x.trangThai === "tat_may" || x.trangThai === "chua_co_nhip") return "tat";
  if (x.trangThai === "ngoai_vong" || x.matMang) return "mat_mang";
  if (x.baoVe === "mot_phan" || x.trangThai === "lech_chuan") return "can_sua";
  return "bao_ve";
}

/** Cảnh báo chỉ để biết (sự việc đã xảy ra / AiiGrow đã tự xử lý / máy mất mạng đã có dòng riêng): không nút «Sửa», không tính vào «cần sửa». */
export const LOAI_CHI_BIET = ["go_may", "may_chuyen_nha", "het_han_nhiem_vu", "lech_gio", "bang_chung_trung", "doi_che_do", "mo_khan_cap", "nhac_duyet",
  "dns_vuot_gio", "may_go_chan_hosts", "may_ngoai_vong", "offline_lau"];
/** Cảnh báo CHƯA đọc, trong 7 ngày, mức chú ý / nghiêm trọng, không thuộc loại chỉ để biết ⇒ Ba Mẹ cần sửa. MỘT hàm cho chuông, Cả nhà và màn Cảnh báo. */
export function canSuaCanhBao(a: { loai: string; muc: string; da_doc: boolean; created_at: Date | string }, now = new Date()): boolean {
  if (a.da_doc || LOAI_CHI_BIET.includes(a.loai)) return false;
  // #861: «tài khoản quản trị chưa có mật khẩu» còn đúng tới khi agent báo đã ổn (lúc đó dòng tự đánh dấu đã đọc) ⇒ không hết hạn 7 ngày
  if (a.loai !== "quan_tri_trong_mat_khau" && now.getTime() - new Date(a.created_at).getTime() > 7 * 86_400_000) return false;
  return a.loai === "quen_pin" || a.loai === "pin_bi_do" || a.muc === "chu_y" || a.muc === "nghiem_trong";
}
