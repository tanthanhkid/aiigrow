// Xoá tài khoản ngay trong app Ba Mẹ (Apple App Store 5.1.1(v)) — POST /api/m/xoa-tai-khoan {matKhau}.
// Luật (chọn cách đơn giản, không cần «chuyển quyền chủ»):
//  • Mọi vai (kể cả Chỉ xem) đều tự xoá được tài khoản của mình, sau khi nhập lại đúng mật khẩu (cùng bộ đếm sai/khoá như đăng nhập).
//  • Ba Mẹ KHÔNG phải chủ ⇒ chỉ xoá tài khoản mình (dòng parents + phiên + thiết lập thông báo theo cascade). Gia đình, Con, máy giữ nguyên.
//  • CHỦ gia đình mà còn người lớn khác (vai duyet/xem) ⇒ 409 con_thanh_vien: mời họ ra trước (Gia đình › Thành viên), không xoá gì.
//  • CHỦ là người lớn cuối cùng ⇒ xoá CẢ gia đình: `delete from families` — mọi bảng dữ liệu gia đình có khoá ngoại `on delete cascade`
//    tới families / children / devices / parents (Con, nhiệm vụ, bài nộp + ảnh bằng chứng, điểm, quà, voucher, quỹ, luật app/web, phiên chơi,
//    yêu cầu, cảnh báo, sự kiện, lời mời, máy, lệnh máy, tuân thủ, DNS…). Bảng KHÔNG có khoá ngoại xoá tay: may_log (family_id),
//    pin_sai (khoá «<máy>:<con>»), otp (định danh). Bảng audit (nhật ký thao tác của nhân viên AiiLab) giữ lại, chỉ ghi id gia đình.
//  • Máy đã ghép: dòng devices bị xoá ⇒ token máy hết hiệu lực ngay, agent nhận 401 token_sai ⇒ sau 6 giờ liên tục tự thôi chặn (mồ côi,
//    agent-win AnToan.cs / MoCoi). Lệnh «go» KHÔNG gửi được sau khi xoá (agent chỉ lấy lệnh bằng token máy còn sống) nên không ghi lệnh giả.
//  • Tất cả trong MỘT giao dịch; mọi phiên của người bị xoá (và cả gia đình khi xoá gia đình) mất theo cascade sessions.
import { tx } from "./db.ts";
import { xacThucLai, type BaMe } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { ghiKiemToan } from "./admin.ts";
import { bangM4b } from "./tuan-thu.ts";
import { bangTvTb } from "./thanh-vien.ts";
import { bangMang } from "./dns-gia-dinh.ts";
import { bangLog } from "./log-may.ts";

export type KetQuaXoa = { xoa: "tai_khoan" } | { xoa: "gia_dinh"; soCon: number; soMay: number };

export async function xoaTaiKhoan(bm: BaMe, b: { matKhau?: unknown }): Promise<KetQuaXoa> {
  await xacThucLai(bm.id, b.matKhau);
  // bảng tạo lười phải có trước giao dịch (PGlite một kết nối: không chạy DDL qua q() khi đang trong tx)
  await bangM4b(); await bangTvTb(); await bangMang(); await bangLog();
  const kq = await tx(async (t): Promise<KetQuaXoa> => {
    // khoá dòng gia đình ⇒ không chạy song song với nhận lời mời / xoá lần hai
    await t(`select id from families where id = $1 for update`, [bm.family_id]);
    const toi = (await t<{ vai: string; ten: string; dinh_danh: string }>(`select vai, ten, dinh_danh from parents where id = $1`, [bm.id]))[0];
    if (!toi) throw new LoiNghiepVu("khong_thay", "Tài khoản đã được xoá", 404);
    if (toi.vai !== "chu") {
      await t(`delete from parents where id = $1`, [bm.id]);                       // sessions, ba_me_tb: cascade
      await t(`delete from otp where dinh_danh = $1`, [toi.dinh_danh]);
      await ghiSuKien(bm.family_id, "thanh_vien_xoa_tai_khoan", { ten: toi.ten }, {}, t);
      return { xoa: "tai_khoan" };
    }
    const khac = await t(`select 1 from parents where family_id = $1 and id <> $2 and vai <> 'roi' limit 1`, [bm.family_id, bm.id]);
    if (khac.length) throw new LoiNghiepVu("con_thanh_vien",
      "Gia đình còn Ba/Mẹ khác. Hãy mời họ ra khỏi gia đình (Gia đình › Thành viên) rồi mới xoá tài khoản Chủ gia đình.", 409);
    const soCon = (await t(`select id from children where family_id = $1`, [bm.family_id])).length;
    const may = await t<{ id: string }>(`select id from devices where family_id = $1`, [bm.family_id]);
    for (const m of may) await t(`delete from pin_sai where khoa like $1`, [`${m.id}:%`]);
    await t(`delete from may_log where family_id = $1`, [bm.family_id]);
    await t(`delete from otp where dinh_danh in (select dinh_danh from parents where family_id = $1)`, [bm.family_id]);
    await t(`delete from families where id = $1`, [bm.family_id]);
    return { xoa: "gia_dinh", soCon, soMay: may.length };
  });
  if (kq.xoa === "gia_dinh") await ghiKiemToan(null, "xoa_gia_dinh", { soCon: kq.soCon, soMay: kq.soMay }, bm.family_id);
  return kq;
}
