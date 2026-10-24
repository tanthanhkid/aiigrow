// Xoá tài khoản ngay trong app Ba Mẹ (Apple App Store 5.1.1(v)) — POST /api/m/xoa-tai-khoan {matKhau}.
// Luật (chọn cách đơn giản, không cần «chuyển quyền chủ»):
//  • Mọi vai (kể cả Chỉ xem) đều tự xoá được tài khoản của mình, sau khi nhập lại đúng mật khẩu. Bộ đếm sai RIÊNG (pin_sai «xoa_tk:<id>»,
//    5 lần ⇒ khoá 15 phút) — không dùng bộ đếm đăng nhập, để người cầm phiên mượn không khoá được chính chủ khỏi đăng nhập.
//  • Ba Mẹ KHÔNG phải chủ ⇒ xoá tài khoản mình theo cách «mời ra» (thanh-vien.ts › moiRa): vai «roi», bỏ SĐT/email (định danh đổi thành
//    «xoa:<id>», đăng ký lại được), bỏ mật khẩu, xoá mọi phiên + thiết lập thông báo. Chỉ giữ TÊN gọi trong lịch sử «ai duyệt» của gia đình.
//  • CHỦ gia đình còn người lớn khác (vai duyet/xem) ⇒ 409 con_thanh_vien: mời họ ra trước (Gia đình › Thành viên), không xoá gì.
//  • CHỦ gia đình còn MÁY đã ghép ⇒ 409 con_may: gỡ từng máy trước (Máy › Gỡ máy này — lệnh gỡ an toàn, lib/lenh-may.ts). Lý do: xoá gia đình
//    làm token máy mất hiệu lực nên lệnh «go» không tới được agent nữa; agent-win tự thôi chặn sau 6 giờ token_sai nhưng agent-mac thì không,
//    và gỡ tại máy Mac cần mật khẩu Ba Mẹ qua máy chủ ⇒ máy Con bị chặn mãi. Máy chưa đồng bộ / mất liên lạc > 7 ngày «Xoá hẳn» được ngay.
//  • CHỦ là người lớn cuối, không còn máy ⇒ xoá CẢ gia đình: `delete from families` — mọi bảng dữ liệu gia đình có khoá ngoại
//    `on delete cascade` tới families / children / devices / parents (Con, nhiệm vụ, bài nộp + ảnh bằng chứng, điểm, quà, voucher, quỹ,
//    luật app/web, phiên chơi, yêu cầu, cảnh báo, sự kiện, lời mời, lệnh máy, tuân thủ, DNS…). Bảng KHÔNG có khoá ngoại xoá tay:
//    may_log (family_id), pin_sai (khoá «xoa_tk:<người>»), otp (định danh). audit (nhật ký thao tác nhân viên AiiLab) giữ, ghi thêm
//    MỘT dòng «xoa_gia_dinh» chỉ có id gia đình + số Con — cùng giao dịch.
//  • Tất cả trong MỘT giao dịch; mọi phiên của người bị xoá mất theo.
import { one, q, tx, type Q } from "./db.ts";
import { dungMatKhau, type BaMe } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { damBaoBang, ghiKiemToan } from "./admin.ts";
import { bangM4b } from "./tuan-thu.ts";
import { bangTvTb } from "./thanh-vien.ts";
import { bangMang } from "./dns-gia-dinh.ts";
import { bangLog } from "./log-may.ts";

export const XOA_SAI_TOI_DA = 5, XOA_KHOA_PHUT = 15;
export type KetQuaXoa = { xoa: "tai_khoan" } | { xoa: "gia_dinh"; soCon: number };

/** Nhập lại mật khẩu (bộ đếm riêng của việc xoá tài khoản). */
async function kiemMatKhau(bm: BaMe, mk: unknown) {
  const khoa = `xoa_tk:${bm.id}`;
  const s = await one<{ khoa_den: Date | null }>(`select khoa_den from pin_sai where khoa = $1`, [khoa]);
  if (s?.khoa_den && new Date(s.khoa_den) > new Date())
    throw new LoiNghiepVu("tam_khoa", `Nhập sai mật khẩu nhiều lần — thử lại sau ${XOA_KHOA_PHUT} phút`, 429);
  const p = await one<{ pass_hash: string | null }>(`select pass_hash from parents where id = $1`, [bm.id]);
  if (!p?.pass_hash || !(await dungMatKhau(String(mk ?? ""), p.pass_hash))) {
    await q(`insert into pin_sai(khoa, so_lan) values ($1, 1) on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1,
             khoa_den = case when pin_sai.so_lan + 1 >= $2 then now() + make_interval(mins => $3) else null end`, [khoa, XOA_SAI_TOI_DA, XOA_KHOA_PHUT]);
    throw new LoiNghiepVu("sai_mat_khau", "Mật khẩu chưa đúng", 401);
  }
  await q(`delete from pin_sai where khoa = $1`, [khoa]);
}

export async function xoaTaiKhoan(bm: BaMe, b: { matKhau?: unknown }): Promise<KetQuaXoa> {
  await kiemMatKhau(bm, b.matKhau);
  // bảng tạo lười phải có trước giao dịch (PGlite một kết nối: không chạy DDL qua q() khi đang trong tx)
  await bangM4b(); await bangTvTb(); await bangMang(); await bangLog(); await damBaoBang();
  return tx(async (t: Q): Promise<KetQuaXoa> => {
    // khoá dòng gia đình ⇒ không chạy song song với nhận lời mời / ghép máy / xoá lần hai
    await t(`select id from families where id = $1 for update`, [bm.family_id]);
    const toi = (await t<{ vai: string; ten: string }>(`select vai, ten from parents where id = $1 and vai <> 'roi'`, [bm.id]))[0];
    if (!toi) throw new LoiNghiepVu("khong_thay", "Tài khoản đã được xoá", 404);
    if (toi.vai !== "chu") {
      const cu = (await t<{ dinh_danh: string }>(`select dinh_danh from parents where id = $1`, [bm.id]))[0];
      await t(`update parents set vai = 'roi', dinh_danh = 'xoa:' || id, pass_hash = null, sai_lien = 0, khoa_den = null where id = $1`, [bm.id]);
      await t(`delete from sessions where parent_id = $1`, [bm.id]);
      await t(`delete from ba_me_tb where parent_id = $1`, [bm.id]);
      await t(`delete from otp where dinh_danh = $1`, [cu.dinh_danh]);
      await t(`delete from pin_sai where khoa = $1`, [`xoa_tk:${bm.id}`]);
      await ghiSuKien(bm.family_id, "thanh_vien_xoa_tai_khoan", { ten: toi.ten }, { nguoi: bm.id }, t);
      return { xoa: "tai_khoan" };
    }
    const khac = await t<{ ten: string }>(`select ten from parents where family_id = $1 and id <> $2 and vai <> 'roi' order by created_at`, [bm.family_id, bm.id]);
    if (khac.length) throw new LoiNghiepVu("con_thanh_vien",
      `Gia đình còn ${khac.map((x) => x.ten).join(", ")}. Hãy mời họ ra khỏi gia đình (Gia đình › Thành viên) rồi mới xoá tài khoản Chủ gia đình.`, 409);
    const may = await t<{ name: string }>(`select name from devices where family_id = $1 order by created_at`, [bm.family_id]);
    if (may.length) throw new LoiNghiepVu("con_may",
      `Gia đình còn ${may.length} máy đã ghép (${may.map((m) => m.name).join(", ")}). Gỡ từng máy trước (mở máy › Gỡ máy này) để AiiGrow rời máy của Con, rồi mới xoá tài khoản.`, 409);
    const soCon = (await t(`select id from children where family_id = $1`, [bm.family_id])).length;
    await t(`delete from may_log where family_id = $1`, [bm.family_id]);
    await t(`delete from otp where dinh_danh in (select dinh_danh from parents where family_id = $1)`, [bm.family_id]);
    await t(`delete from pin_sai where khoa in (select 'xoa_tk:' || id from parents where family_id = $1)`, [bm.family_id]);
    await t(`delete from families where id = $1`, [bm.family_id]);
    await ghiKiemToan(null, "xoa_gia_dinh", { soCon }, bm.family_id, t);
    return { xoa: "gia_dinh", soCon };
  });
}
