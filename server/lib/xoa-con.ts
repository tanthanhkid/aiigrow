// Xoá hồ sơ Con ngay trong app Ba Mẹ (trước 14/11 phải nhắn hỗ trợ) — POST /api/m/con/:id/xoa {xacNhan: true}.
// Theo nếp xoá đang có (xoa-tai-khoan.ts › xoá cả gia đình): XOÁ HẲN trong MỘT giao dịch, không xoá mềm — mọi bảng dữ liệu của Con có khoá
// ngoại `on delete cascade` tới children (nhiệm vụ giao riêng, bài nộp + ảnh, điểm, quà đã đổi, phiên chơi, lời xin, phút dùng, phiên Con…).
// Bảng KHÔNG có khoá ngoại xoá tay: app_rules / alerts / events / web_nhat_ky (child_id), pin_sai («<máy>:<con>»), quà chỉ áp cho riêng Con này
// (rewards.ap_cho = [con]; quà áp cho nhiều Con ⇒ chỉ bỏ id này); goi_cai / dns_thiet_bi ⇒ bỏ gắn Con.
// Máy đã ghép của Con (devices.child_id) KHÔNG gỡ (gỡ cần lệnh an toàn tới agent — lenh-may.ts): chuyển thành máy DÙNG CHUNG (bé khác chọn tên
// đăng nhập; chưa ai đăng nhập ⇒ chặn «chỉ app được phép» như mọi máy dùng chung) + trả danh sách để app gợi ý «Gắn cho Con khác / Gỡ máy».
// Con CUỐI CÙNG của nhà mà còn máy ⇒ 409 con_may (máy dùng chung không còn bé nào để chọn): gỡ máy hoặc thêm Con khác trước.
// Ghi: sự kiện «xoa_con» (nhật ký gia đình, không gắn child_id — dòng gắn Con đã xoá theo) + kiểm toán (audit) «xoa_con» như «xoa_gia_dinh».
import { tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { damBaoBang, ghiKiemToan } from "./admin.ts";
import { bangM4b } from "./tuan-thu.ts";
import { bangMang } from "./dns-gia-dinh.ts";

export type KetQuaXoaCon = { ok: true; ten: string; mayChuyenDungChung: { id: string; ten: string }[] };

export async function xoaCon(fam: string, con: string, b: { xacNhan?: unknown }, nguoi: string): Promise<KetQuaXoaCon> {
  if (b.xacNhan !== true) throw new LoiNghiepVu("can_xac_nhan", "Xác nhận xoá hồ sơ (gửi xacNhan: true) — xoá rồi không lấy lại được", 400);
  // bảng tạo lười phải có trước giao dịch (PGlite một kết nối: không chạy DDL qua q() khi đang trong tx) — như xoa-tai-khoan.ts
  await bangM4b(); await bangMang(); await damBaoBang();
  return tx(async (t: Q) => {
    // khoá dòng gia đình ⇒ không chạy song song với ghép máy / xoá Con khác (đếm «Con cuối» đúng)
    await t(`select id from families where id = $1 for update`, [fam]);
    const c = (await t<{ ten: string }>(`select ten from children where id = $1 and family_id = $2 for update`, [con, fam]))[0];
    if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    const may = await t<{ id: string; name: string }>(`select id, name from devices where family_id = $1 and child_id = $2 order by created_at`, [fam, con]);
    const conKhac = (await t(`select 1 from children where family_id = $1 and id <> $2 limit 1`, [fam, con])).length > 0;
    if (may.length && !conKhac) throw new LoiNghiepVu("con_may",
      `${c.ten} còn ${may.length} máy đã ghép: ${may.map((m) => m.name).join(", ")}. Gỡ máy trước (mở máy › Gỡ máy này) hoặc thêm Con khác rồi mới xoá hồ sơ.`, 409);
    // máy riêng ⇒ dùng chung (chọn tên); máy dùng chung đang có bé này đăng nhập ⇒ thả ra
    await t(`update devices set child_id = null, dung_chung = true where family_id = $1 and child_id = $2`, [fam, con]);
    await t(`update devices set con_dang_dung = null, dang_nhap_luc = null where family_id = $1 and con_dang_dung = $2`, [fam, con]);
    await t(`update goi_cai set child_id = null where family_id = $1 and child_id = $2`, [fam, con]);
    await t(`update dns_thiet_bi set child_id = null where family_id = $1 and child_id = $2`, [fam, con]);
    await t(`delete from app_rules where family_id = $1 and child_id = $2`, [fam, con]);
    await t(`delete from alerts where family_id = $1 and child_id = $2`, [fam, con]);
    await t(`delete from events where family_id = $1 and child_id = $2`, [fam, con]);
    await t(`delete from web_nhat_ky where child_id = $1`, [con]);
    await t(`delete from pin_sai where split_part(khoa, ':', 2) = $1`, [con]);
    // quà chỉ áp cho riêng Con này ⇒ xoá; áp cho nhiều Con ⇒ bỏ id này khỏi danh sách
    await t(`delete from rewards where family_id = $1 and ap_cho is not null and ap_cho ? $2 and jsonb_array_length(ap_cho) = 1`, [fam, con]);
    await t(`update rewards set ap_cho = ap_cho - $2 where family_id = $1 and ap_cho is not null and ap_cho ? $2`, [fam, con]);
    await t(`delete from children where id = $1 and family_id = $2`, [con, fam]);
    await ghiSuKien(fam, "xoa_con", { ten: c.ten, so_may: may.length }, { nguoi }, t);
    await ghiKiemToan(null, "xoa_con", { con, soMay: may.length, nguoi }, fam, t);
    return { ok: true as const, ten: c.ten, mayChuyenDungChung: may.map((m) => ({ id: m.id, ten: m.name })) };
  });
}
