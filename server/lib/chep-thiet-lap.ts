// #420 «Thiết lập con thứ 2+: Giống <con trước>» (bàn bm-thiet-lap-con: them-s84hkh82 Con thứ 2, them-5t1kazz5 nhà ≥3 con chọn bé để chép).
// GET  /api/m/con/:id/chep-tu        — các Con khác trong nhà (nguồn chép) + tóm tắt luật của từng bé để màn hiện «Sẽ chép từ …».
// POST /api/m/con/:id/chep-tu {tu}   — chép luật của Con `tu` sang Con `:id` trong MỘT giao dịch, THAY luật cũ của Con đích:
//   · App & web: chế độ (Mở hết / Theo danh sách), luật app / web lâu dài (app_rules het null — cả nhóm Tính phút / Không tính phút), app theo tên đang chờ khớp;
//   · cách chơi bằng sao: cấu hình Con (giới hạn mỗi ngày / mỗi lượt, tham số — trừ khoá máy đang bật), khung giờ (lich), sao khởi đầu (chỉ tặng
//     nếu Con đích chưa được tặng — như tangSaoKhoiDau);
//   · việc mỗi ngày: việc giao riêng cho Con nguồn (đang bật, chưa hết hạn) chép thành việc mới giao cho Con đích. Việc riêng cũ của Con đích:
//     chưa có bài nộp ⇒ xoá; đã có bài nộp ⇒ tắt (giữ lịch sử). Việc chung cả nhà (giao_cho null) không đụng.
// Sau đó Ba Mẹ vẫn sửa riêng từng Con như bình thường (không còn nối gì giữa hai Con).
import { newId, one, q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { conCua } from "./gia-dinh.ts";
import { KHONG_CHEP } from "./ghep-may.ts";
import { tomTatThietLap } from "./thiet-lap.ts";
import { ghiDiem, khoaCon } from "./vi.ts";

/** Việc của Con trong «Một ngày»: đang bật, chưa hết hạn, giao riêng cho Con hoặc chung cả nhà. */
const VIEC_CON = `bat and (han is null or han > now()) and (giao_cho = $2 or giao_cho is null) and family_id = $1`;
/** Việc RIÊNG của Con sẽ được chép (đang bật, chưa hết hạn) — thẻ «Sẽ chép» đếm đúng phần này, không đếm việc chung cả nhà. */
const VIEC_RIENG = `bat and (han is null or han > now()) and giao_cho = $2 and family_id = $1`;

/** Tóm tắt một Con làm nguồn chép (màn «Giống <tên>»). */
async function tomTatNguon(fam: string, c: { id: string; ten: string; avatar: string }) {
  const [tt, viec, tinh] = await Promise.all([
    tomTatThietLap(fam, c.id),
    q<{ nhom: string; n: number }>(`select nhom, count(*)::int as n from tasks where ${VIEC_RIENG} group by nhom order by min(created_at)`, [fam, c.id]),
    // vài app / trang «Tính phút» (giai_tri) để màn ghi «YouTube, Roblox tính» — một tên một lần
    q<{ ten: string }>(`select ten from (
        select ten from app_rules where family_id = $1 and child_id = $2 and loai = 'giai_tri' and het is null
        union select ten from app_theo_ten where child_id = $2 and khop_luc is null and tinh_gio) x order by lower(ten) limit 3`, [fam, c.id]),
  ]);
  return { id: c.id, ten: c.ten, avatar: c.avatar, cheDo: tt.cheDo, soApp: tt.soApp, soWeb: tt.soWeb, tinhPhut: tinh.map((x) => x.ten),
    soViec: viec.reduce((s, x) => s + x.n, 0), nhomViec: viec.map((x) => x.nhom), saoKhoiDau: tt.saoKhoiDau,
    gioiHanNgayThuong: tt.gioiHanNgayThuong, gioiHanCuoiTuan: tt.gioiHanCuoiTuan, phutMoiLuot: tt.phutMoiLuot };
}

/** GET con/:id/chep-tu — mọi Con khác trong nhà (Con tạo trước đứng trước) kèm tóm tắt; `thu` = Con đích là con thứ mấy (nhãn «Con thứ 2»). */
export async function nguonChep(fam: string, den: string) {
  await conCua(fam, den);
  const tat = await q<{ id: string; ten: string; avatar: string }>(`select id, ten, avatar from children where family_id = $1 order by created_at, id`, [fam]);
  const ds = tat.filter((c) => c.id !== den);
  return { thu: tat.findIndex((c) => c.id === den) + 1, ds: await Promise.all(ds.map((c) => tomTatNguon(fam, c))) };
}

/** POST con/:id/chep-tu {tu} — chép luật Con `tu` sang Con `den` (cùng nhà), một giao dịch. → tóm tắt Con đích. */
export async function chepThietLap(fam: string, den: string, b: { tu?: unknown }, nguoi: string) {
  const tu = typeof b?.tu === "string" ? b.tu.trim() : "";
  if (!tu) throw new LoiNghiepVu("thieu_con", "Chọn con để chép luật");
  if (tu === den) throw new LoiNghiepVu("cung_con", "Chọn một con khác để chép luật");
  await conCua(fam, den);
  await conCua(fam, tu);                                     // khác nhà ⇒ 404 như mọi đường Con
  const kq = await tx(async (t) => {
    if ((await khoaCon(t, den)) !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    // chế độ + cấu hình (giới hạn chơi, tham số; khoá máy đang bật của Con đích giữ nguyên) + khung giờ
    await t(`update children d set che_do_chan = coalesce(s.che_do_chan, d.che_do_chan),
               lich = s.lich,
               cau_hinh = (d.cau_hinh - array(select jsonb_object_keys(d.cau_hinh) except select unnest($3::text[]))) || (s.cau_hinh - $3::text[])
             from children s where d.id = $1 and s.id = $2 and s.family_id = d.family_id`, [den, tu, KHONG_CHEP]);
    // App & web: thay luật lâu dài của Con đích bằng luật của Con nguồn (luật có hạn — duyệt tạm — giữ nguyên).
    // Lấy khoá (nhà, Con đích, mục) như datLuat / xoaLuat — xếp hàng sau lượt xếp / hoàn tác đang chạy; theo thứ tự mục để không khoá chéo
    await t(`select pg_advisory_xact_lock(hashtext('luat-app:' || $1 || ':' || $3 || ':' || muc)) from (
               select distinct muc from app_rules where family_id = $1 and child_id in ($2, $3) and het is null order by muc) x`, [fam, tu, den]);
    await t(`delete from app_rules where family_id = $1 and child_id = $2 and het is null`, [fam, den]);
    await t(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom, het)
             select family_id, $3, muc, ten, loai, nhom, null from app_rules where family_id = $1 and child_id = $2 and het is null
             on conflict (family_id, child_id, muc) do update set ten = excluded.ten, loai = excluded.loai, nhom = excluded.nhom, het = null`, [fam, tu, den]);
    await t(`delete from app_theo_ten where child_id = $1 and khop_luc is null`, [den]);
    await t(`insert into app_theo_ten(child_id, family_id, ten, ten_khoa, tinh_gio)
             select $2, family_id, ten, ten_khoa, tinh_gio from app_theo_ten where child_id = $1 and khop_luc is null
             on conflict (child_id, ten_khoa) do update set ten = excluded.ten, tinh_gio = excluded.tinh_gio, khop_luc = null`, [tu, den]);
    // việc mỗi ngày: việc riêng cũ của Con đích — chưa nộp ⇒ xoá, đã nộp ⇒ tắt; rồi chép việc riêng của Con nguồn
    await t(`delete from tasks k where k.family_id = $1 and k.giao_cho = $2 and not exists (select 1 from submissions s where s.task_id = k.id)`, [fam, den]);
    await t(`update tasks set bat = false where family_id = $1 and giao_cho = $2 and bat`, [fam, den]);
    // một câu: id mới đặt sẵn theo thứ tự việc nguồn, created_at tăng dần 1 ms ⇒ «Một ngày» của Con đích giữ đúng thứ tự như Con nguồn
    const nguon = await t<{ id: string }>(`select id from tasks where ${VIEC_RIENG} order by created_at, id`, [fam, tu]);
    const viec = nguon.map((v) => ({ cu: v.id, moi: newId() }));
    if (viec.length) await t(`insert into tasks(id, family_id, ten, mo_ta, nhom, diem, bang_chung, kieu, toi_da_ngay, toi_da_tuan, phut_toi_thieu, tu_duyet,
               giao_cho, han, bat, hinh, lap_lai, gio_nhac, bo, created_at)
             select x.moi, k.family_id, k.ten, k.mo_ta, k.nhom, k.diem, k.bang_chung, k.kieu, k.toi_da_ngay, k.toi_da_tuan, k.phut_toi_thieu, k.tu_duyet,
               $3, k.han, true, k.hinh, k.lap_lai, k.gio_nhac, k.bo, clock_timestamp() + x.n * interval '1 millisecond'
             from unnest($1::text[], $2::text[]) with ordinality as x(cu, moi, n) join tasks k on k.id = x.cu`,
      [viec.map((v) => v.cu), viec.map((v) => v.moi), den]);
    // sao khởi đầu: Con đích chưa được tặng ⇒ tặng bằng số Con nguồn đã được tặng (một lần, như tangSaoKhoiDau)
    const sao = (await t<{ s: number }>(`select coalesce(sum(delta), 0)::int as s from points where child_id = $1 and loai = 'khoi_dau'`, [tu]))[0].s;
    let daTang = 0;
    if (sao > 0 && !(await t(`select 1 from points where child_id = $1 and loai = 'khoi_dau' limit 1`, [den])).length) {
      await ghiDiem(t, den, sao, "khoi_dau", `Ba Mẹ tặng ${sao} sao khởi đầu`, { nguoi });
      daTang = sao;
    }
    await ghiSuKien(fam, "chep_thiet_lap_con", { tu_con: tu, so_viec: viec.length, sao_khoi_dau: daTang }, { con: den, nguoi }, t);
    return { soViecChep: viec.length, daTangSao: daTang };
  });
  const tt = await tomTatThietLap(fam, den);
  const soViec = (await one<{ n: number }>(`select count(*)::int as n from tasks where ${VIEC_CON}`, [fam, den]))!.n;
  return { ...tt, tu, soViec, ...kq };
}
