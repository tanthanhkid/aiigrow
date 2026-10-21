// Đếm ngoại lệ + cảnh báo (FR-07.01, BRD 6.6): ngoại lệ = thêm giờ không trừ điểm, mở app/web ngoài quy tắc (Lần này / Hôm nay), điều
// chỉnh điểm tay. Ngưỡng mặc định: > 3/tuần hoặc > 10/tháng ⇒ cảnh báo mềm; > 6/tuần ⇒ cảnh báo mạnh kèm gợi ý chỉnh cấu hình.
// Lệch người duyệt: một người cho ngoại lệ ≥ 3 lần người kia (và ≥ 3 lần) ⇒ gợi ý thống nhất quy tắc. Cảnh báo KHÔNG chặn phê duyệt.
import { newId, one, q, type Q } from "./db.ts";
import { thamSo } from "./cau-hinh.ts";
import { dauNgayUtc, dauTuan, gioDiaPhuong } from "./gio.ts";
import { canhBao } from "./nhat-ky.ts";

export type LoaiNgoaiLe = "them_gio_khong_tru" | "mo_ngoai_quy_tac" | "dieu_chinh_tay" | "ngoai_gio";

// PGlite một kết nối: trong giao dịch phải truy vấn qua `t` của giao dịch đó (gọi `q` toàn cục là tự khoá chết).
async function moc(fam: string, now: Date, t: Q = q) {
  const f = (await t<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))[0];
  const ngay = gioDiaPhuong(now, f.tz).ngay;
  return { ts: thamSo(f.cau_hinh), maTuan: dauTuan(ngay), dauTuan: dauNgayUtc(dauTuan(ngay), f.tz), dauThang: dauNgayUtc(`${ngay.slice(0, 8)}01`, f.tz) };
}

export async function demNgoaiLe(fam: string, con: string, now = new Date()) {
  const m = await moc(fam, now);
  const r = (await one<{ tuan: number; thang: number }>(
    `select count(*) filter (where created_at >= $3)::int as tuan, count(*) filter (where created_at >= $4)::int as thang
     from exceptions where family_id = $1 and child_id = $2`, [fam, con, m.dauTuan, m.dauThang]))!;
  return { ...r, ...m };
}

export type XemTruoc = { mucCanhBao: "khong" | "mem" | "manh"; soTuan: number; soThang: number; cau: string | null };

/** Trước khi Ba Mẹ xác nhận một ngoại lệ MỚI: nếu duyệt thì số đếm thành bao nhiêu, có vượt ngưỡng không (BRD: «trước khi xác nhận, hiện
 * cảnh báo mềm với số liệu»). */
export async function xemTruoc(fam: string, con: string, tenCon: string, now = new Date()): Promise<XemTruoc> {
  const d = await demNgoaiLe(fam, con, now);
  const tuan = d.tuan + 1, thang = d.thang + 1;
  if (tuan > d.ts.ngoai_le_manh_tuan)
    return { mucCanhBao: "manh", soTuan: tuan, soThang: thang,
      cau: `Đây là lần ngoại lệ thứ ${tuan} trong tuần cho ${tenCon}. Thử tăng điểm nhiệm vụ hoặc giảm giá phần thưởng thay vì cho thêm ngoại lệ.` };
  if (tuan > d.ts.ngoai_le_mem_tuan || thang > d.ts.ngoai_le_mem_thang)
    return { mucCanhBao: "mem", soTuan: tuan, soThang: thang,
      cau: `Tuần này Ba Mẹ đã cho ngoại lệ ${tuan} lần — ${tenCon} có thể mất động lực tích điểm.` };
  return { mucCanhBao: "khong", soTuan: tuan, soThang: thang, cau: null };
}

/** Ghi một ngoại lệ (trong giao dịch `t` của phê duyệt) rồi kiểm ngưỡng và lệch người duyệt — mỗi loại cảnh báo một lần mỗi tuần mỗi Con. */
export async function ghiNgoaiLe(fam: string, con: string, nguoi: string | null, loai: LoaiNgoaiLe, ref: string | null, t: Q = q, now = new Date()) {
  await t(`insert into exceptions(id, family_id, child_id, parent_id, loai, ref, created_at) values ($1,$2,$3,$4,$5,$6,$7)`, [newId(), fam, con, nguoi, loai, ref, now]);
  const m = await moc(fam, now, t);
  const r = (await t<{ tuan: number; thang: number }>(
    `select count(*) filter (where created_at >= $3)::int as tuan, count(*) filter (where created_at >= $4)::int as thang
     from exceptions where family_id = $1 and child_id = $2`, [fam, con, m.dauTuan, m.dauThang]))[0];
  const ten = (await t<{ ten: string }>(`select ten from children where id = $1`, [con]))[0]?.ten ?? "Con";
  if (r.tuan > m.ts.ngoai_le_manh_tuan)
    await canhBao(fam, "ngoai_le_manh", "chu_y", `Tuần này ${ten} đã được ${r.tuan} ngoại lệ. Gợi ý: tăng điểm nhiệm vụ hoặc giảm giá phần thưởng.`,
      { con, khoa: `ngoai_le_manh:${m.maTuan}:${con}`, chiTiet: { tuan: r.tuan, goi_y: ["tang_diem_nhiem_vu", "giam_gia_phut"] } }, t);
  else if (r.tuan > m.ts.ngoai_le_mem_tuan || r.thang > m.ts.ngoai_le_mem_thang)
    await canhBao(fam, "ngoai_le_mem", "thong_tin", `Tuần này Ba Mẹ đã cho ${ten} ${r.tuan} ngoại lệ — con có thể mất động lực tích điểm.`,
      { con, khoa: `ngoai_le_mem:${m.maTuan}:${con}`, chiTiet: { tuan: r.tuan, thang: r.thang } }, t);
  const theo = await t<{ parent_id: string; n: number }>(
    `select parent_id, count(*)::int as n from exceptions where family_id = $1 and parent_id is not null and created_at >= $2 group by parent_id order by n desc`,
    [fam, m.dauThang]);
  if (theo.length >= 2 && theo[0].n >= 3 && theo[0].n >= 3 * theo[theo.length - 1].n)
    await canhBao(fam, "lech_nguoi_duyet", "thong_tin", "Một người trong nhà đang cho ngoại lệ nhiều hơn hẳn người kia — Ba Mẹ thống nhất quy tắc chung nhé.",
      { khoa: `lech_duyet:${m.maTuan}`, chiTiet: { theo } }, t);
}
