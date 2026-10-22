// «Đóng băng chuỗi ngày» (FR-03.06): Ba Mẹ giữ chuỗi ngày của Con cho MỘT ngày Con không làm được nhiệm vụ nào (ốm, đi chơi xa…),
// tối đa 1 lần mỗi tuần (thứ Hai → Chủ nhật, theo giờ gia đình). Ngày đóng băng không làm đứt chuỗi nhưng cũng không cộng thêm ngày.
// Không quy ra điểm (huy hiệu / chuỗi không phá cân bằng điểm).
import { one, q } from "./db.ts";
import { congNgay, dauTuan, gioDiaPhuong } from "./gio.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { bangTvTb } from "./thanh-vien.ts";

export async function ngayDongBang(con: string) {
  await bangTvTb();
  return new Set((await q<{ ngay: string }>(`select ngay from dong_bang_chuoi where child_id = $1`, [con])).map((r) => r.ngay));
}

/** Chuỗi ngày (thuần): `lam` = ngày có nhiệm vụ được duyệt, `bang` = ngày đóng băng, `homNay` = YYYY-MM-DD giờ gia đình. */
export function demChuoi(lam: Set<string>, bang: Set<string>, homNay: string) {
  let d = homNay;
  if (!lam.has(d) && !bang.has(d)) d = congNgay(d, -1);          // hôm nay chưa làm thì chuỗi vẫn tính tới hôm qua
  let n = 0;
  while (lam.has(d) || bang.has(d)) { if (lam.has(d)) n++; d = congNgay(d, -1); }
  return n;
}

async function ngayLam(con: string, tz: string) {
  return new Set((await q<{ duyet_luc: Date }>(
    `select duyet_luc from submissions where child_id = $1 and trang_thai = 'duoc_duyet' and duyet_luc > now() - interval '400 days'`, [con]))
    .map((r) => gioDiaPhuong(new Date(r.duyet_luc), tz).ngay));
}

/** Trạng thái đóng băng cho màn Ba Mẹ: tuần này còn dùng được không, ngày nào sẽ được giữ nếu bấm. */
export async function trangThaiDongBang(con: string, tz: string, now = new Date()) {
  const bang = await ngayDongBang(con), lam = await ngayLam(con, tz);
  const homNay = gioDiaPhuong(now, tz).ngay, homQua = congNgay(homNay, -1);
  const tuanCua = (ngay: string) => [...bang].some((x) => dauTuan(x) === dauTuan(ngay));
  // hôm qua bỏ lỡ (mà trước đó còn chuỗi) ⇒ giữ hôm qua; không thì giữ hôm nay (nếu hôm nay chưa có nhiệm vụ)
  const truocHomQua = demChuoi(lam, bang, congNgay(homQua, -1));
  const ngay = !lam.has(homQua) && !bang.has(homQua) && truocHomQua > 0 ? homQua : !lam.has(homNay) && !bang.has(homNay) ? homNay : null;
  return { ngay, duocDung: !!ngay && !tuanCua(ngay), daDung: [...bang].sort().slice(-5) };
}

export async function dongBangChuoi(fam: string, con: string, nguoi: string, now = new Date()) {
  const c = await one<{ tz: string }>(`select f.tz from children c join families f on f.id = c.family_id where c.id = $1 and c.family_id = $2`, [con, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const tt = await trangThaiDongBang(con, c.tz, now);
  if (!tt.ngay) throw new LoiNghiepVu("khong_can_dong_bang", "Hôm nay Con đã có nhiệm vụ được duyệt — chuỗi ngày vẫn giữ", 409);
  if (!tt.duocDung) throw new LoiNghiepVu("da_dong_bang_tuan", "Tuần này đã đóng băng chuỗi một lần rồi", 409);
  await q(`insert into dong_bang_chuoi(child_id, ngay, nguoi) values ($1, $2, $3) on conflict do nothing`, [con, tt.ngay, nguoi]);
  await ghiSuKien(fam, "dong_bang_chuoi", { ngay: tt.ngay }, { con, nguoi });
  return { ngay: tt.ngay };
}
