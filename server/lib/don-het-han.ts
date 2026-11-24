// #565: dọn dữ liệu hết hạn và giữ hạn bảng chỉ tăng — chạy trong cron hằng ngày (xoa-tai-khoan.ts › chayDonKiemToan), xoá theo lô 5000,
// tối đa 40 lô / bảng / ngày (lần đầu dồn tồn đọng thì dọn dần qua nhiều đêm, không ăn hết thời gian cron). Mốc giữ (ghi kèm issue #565):
//  • sessions / kid_sessions / staff_sessions: hết hạn quá 7 ngày (phiên hết hạn đã không dùng được; 7 ngày đệm để tra lỗi đăng nhập)
//  • otp: hết hạn quá 1 ngày (mã sống 10 phút)
//  • events / alerts: 180 ngày. App đọc tối đa 30 ngày (nhật ký cả nhà ≤ 30, thông báo 14, cần để ý 7–14, tin học viên 7) hoặc «N mục mới
//    nhất» (tuân thủ máy 50, sự kiện / cảnh báo 100); báo cáo thời gian dùng đọc bảng usage (giữ 400 ngày — donUsageCu), không đọc events.
//    Ngoại lệ của events: dòng có chi_tiet.ma (khoá chống làm lại của sự kiện / bù phiên máy gửi — may-con.ts) giữ 400 ngày;
//    «doi_nguoi_may» mới nhất của mỗi (máy, Con) giữ mãi («lần cuối dùng máy» — may-nhieu-con.ts).
// Bộ đếm pin_sai: mỗi module tự dọn khoá của mình (donBoDem* trong pin-be.ts, may-con.ts, xoa-tai-khoan.ts…).
import { xoaTheoLo } from "./db.ts";

export const GIU_PHIEN_NGAY = 7, GIU_OTP_NGAY = 1, GIU_SU_KIEN_NGAY = 180, GIU_MA_MAY_NGAY = 400;
const LO_MOI_NGAY = 40;

/** → số dòng đã xoá theo bảng; -1 = bảng đó lỗi (đã ghi console.error, lần cron sau dọn tiếp). */
export async function donHetHan(now = new Date()) {
  const truoc = (ngay: number) => new Date(now.getTime() - ngay * 86_400_000);
  const xoa = (bang: string, dk: string, p: unknown[]) =>
    xoaTheoLo(bang, dk, p, LO_MOI_NGAY).catch((e) => { console.error(`cron: dọn ${bang} quá hạn lỗi`, e); return -1; });
  return {
    sessions: await xoa("sessions", "expires_at < $1", [truoc(GIU_PHIEN_NGAY)]),
    kid_sessions: await xoa("kid_sessions", "expires_at < $1", [truoc(GIU_PHIEN_NGAY)]),
    staff_sessions: await xoa("staff_sessions", "expires_at < $1", [truoc(GIU_PHIEN_NGAY)]),
    otp: await xoa("otp", "het < $1", [truoc(GIU_OTP_NGAY)]),
    events: await xoa("events", `created_at < $1 and (not (chi_tiet ? 'ma') or created_at < $2)
      and not (loai = 'doi_nguoi_may' and not exists (select 1 from events m where m.family_id = events.family_id and m.loai = 'doi_nguoi_may'
        and m.device_id is not distinct from events.device_id and m.child_id is not distinct from events.child_id and m.created_at > events.created_at))`,
      [truoc(GIU_SU_KIEN_NGAY), truoc(GIU_MA_MAY_NGAY)]),
    alerts: await xoa("alerts", "created_at < $1", [truoc(GIU_SU_KIEN_NGAY)]),
  };
}
