// #565: dọn dữ liệu hết hạn và giữ hạn bảng chỉ tăng — chạy trong cron hằng ngày (xoa-tai-khoan.ts › chayDonKiemToan), xoá theo lô 5000.
// Mốc giữ (ghi kèm issue #565):
//  • sessions / kid_sessions: hết hạn quá 7 ngày (phiên hết hạn đã không dùng được; 7 ngày đệm để tra lỗi đăng nhập)
//  • otp: hết hạn quá 1 ngày (mã sống 10 phút)
//  • pin_sai — CHỈ các khoá chưa có đường dọn riêng (khoá khác do module của nó dọn: otp*, dn_*, mxh/dat_mk/lien_ket/doi_mk, ghep*, tai_ghep*, pinbe):
//      pin:<máy>:<con> (sai PIN theo máy) hết khoá và không thử quá 1 ngày; bmdung:<máy>:<mã> (mã Ba Mẹ đã dùng) hết hạn quá 1 ngày;
//      go:<máy> (sai mật khẩu gỡ) hết khoá quá 1 ngày; xoa_tk:<người>:<khung 15 phút> khung đã qua quá 1 ngày
//  • events / alerts: 180 ngày. App đọc tối đa 30 ngày (nhật ký cả nhà ≤ 30, thông báo 14, cần để ý 7–14, tin học viên 7) hoặc «N mục mới
//    nhất» (tuân thủ máy 50, sự kiện / cảnh báo 100); báo cáo thời gian dùng đọc bảng usage (giữ 400 ngày — donUsageCu), không đọc events.
import { xoaTheoLo } from "./db.ts";
import { XOA_KHOA_PHUT } from "./xoa-tai-khoan.ts";

export const GIU_PHIEN_NGAY = 7, GIU_OTP_NGAY = 1, GIU_BO_DEM_NGAY = 1, GIU_SU_KIEN_NGAY = 180;

export async function donHetHan(now = new Date()) {
  const truoc = (ngay: number) => new Date(now.getTime() - ngay * 86_400_000);
  const moc = truoc(GIU_BO_DEM_NGAY);
  // mỗi bảng độc lập: một bảng lỗi / khoá lâu không chặn bảng sau (lần cron sau dọn tiếp) → -1 = lỗi
  const xoa = (bang: string, dk: string, p: unknown[]) => xoaTheoLo(bang, dk, p).catch((e) => { console.error(`cron: dọn ${bang} quá hạn lỗi`, e); return -1; });
  return {
    sessions: await xoa("sessions", "expires_at < $1", [truoc(GIU_PHIEN_NGAY)]),
    kid_sessions: await xoa("kid_sessions", "expires_at < $1", [truoc(GIU_PHIEN_NGAY)]),
    otp: await xoa("otp", "het < $1", [truoc(GIU_OTP_NGAY)]),
    pin_sai: await xoa("pin_sai", `(khoa like 'pin:%' and (khoa_den is null or khoa_den < $1) and coalesce(cap_nhat, '-infinity') < $1)
      or (khoa like 'bmdung:%' and khoa_den < $1)
      or (khoa like 'go:%' and khoa_den < $1)
      or (khoa ~ '^xoa_tk:[^:]+:[0-9]+$' and split_part(khoa, ':', 3)::bigint < $2)`,
      [moc, Math.floor(moc.getTime() / (XOA_KHOA_PHUT * 60_000))]),
    events: await xoa("events", "created_at < $1", [truoc(GIU_SU_KIEN_NGAY)]),
    alerts: await xoa("alerts", "created_at < $1", [truoc(GIU_SU_KIEN_NGAY)]),
  };
}
