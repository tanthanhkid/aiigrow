// Xoá HẲN một gia đình (cascade mọi bảng có family_id) kèm dọn bộ đếm / khoá liên quan + mốc audit «xoa_gia_dinh» (mốc tính 90 ngày dọn audit,
// lib/xoa-tai-khoan.ts › donKiemToanGiaDinhDaXoa). Dùng chung cho «Xoá tài khoản» (người tạo nhà, người lớn cuối) và «Bỏ nhà cũ» khi nhận lời mời
// (lib/thanh-vien.ts › nhanLoiMoi). Gọi TRONG giao dịch; người lớn còn trong nhà lúc gọi sẽ bị xoá theo (đã chuyển mình đi trước nếu là nhận lời mời).
import { goKhoaTaiKhoan } from "./gioi-han-dang-nhap.ts";
import { type Q } from "./db.ts";
import { ghiKiemToan } from "./admin.ts";

export async function xoaGiaDinhTrongTx(t: Q, fam: string, them: Record<string, unknown> = {}): Promise<{ soCon: number }> {
  const con = (await t<{ id: string }>(`select id from children where family_id = $1`, [fam])).map((x) => x.id);
  // máy của gia đình, kể cả máy đã gỡ trước đó (dòng devices đã mất, id còn trong sự kiện / lệnh / gói cài)
  const may = (await t<{ id: string }>(`select device_id as id from events where family_id = $1 and device_id is not null
      union select device_id from lenh_may where family_id = $1 union select device_id from goi_cai where family_id = $1 and device_id is not null`,
    [fam])).map((x) => x.id);
  await t(`delete from pin_sai where khoa = any($1::text[]) or split_part(khoa, ':', 1) = any($2::text[]) or split_part(khoa, ':', 2) = any($3::text[])`,
    [may.map((id) => `go:${id}`), may, con]);
  await t(`delete from may_log where family_id = $1`, [fam]);
  // người đã «mời ra» có định danh «<gốc>#roi:<id>» ⇒ lấy phần gốc
  await t(`delete from otp where dinh_danh in (select split_part(dinh_danh, '#roi:', 1) from parents where family_id = $1)`, [fam]);
  await goKhoaTaiKhoan("bm", (await t<{ d: string }>(`select split_part(dinh_danh, '#roi:', 1) as d from parents where family_id = $1`,
    [fam])).map((x) => x.d), t);                                 // bộ đếm / khoá / nguồn quen đăng nhập (#553)
  await t(`delete from pin_sai where split_part(khoa, ':', 1) in ('xoa_tk', 'dat_mk_tk') and split_part(khoa, ':', 2) in (select id from parents where family_id = $1)`, [fam]);
  await t(`delete from families where id = $1`, [fam]);
  await ghiKiemToan(null, "xoa_gia_dinh", { soCon: con.length, ...them }, fam, t);
  return { soCon: con.length };
}
