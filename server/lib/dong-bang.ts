// «Đóng băng chuỗi ngày» (FR-03.06): Ba Mẹ giữ chuỗi ngày của Con cho MỘT ngày Con không làm được nhiệm vụ nào (ốm, đi chơi xa…),
// tối đa 1 lần mỗi tuần (thứ Hai → Chủ nhật, theo giờ gia đình). Ngày đóng băng không làm đứt chuỗi nhưng cũng không cộng thêm ngày.
// Không quy ra điểm (huy hiệu / chuỗi không phá cân bằng điểm).
// Ghi ngày đóng băng: đường POST con/:id/dong-bang-chuoi đã bỏ (#568 — app Ba Mẹ không còn nút từ thiết kế 05/11); vẫn đọc ngày đã lưu.
import { q } from "./db.ts";
import { congNgay, dauTuan, gioDiaPhuong } from "./gio.ts";
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

/** Ngày Con làm (nộp) nhiệm vụ được duyệt — cùng cách tính với thanh-tich.ts › ngayDuyet (#433 B4: ngày nộp, không ngày duyệt). */
async function ngayLam(con: string, tz: string) {
  return new Set((await q<{ luc: Date }>(
    `select coalesce(nop_luc, duyet_luc) as luc from submissions where child_id = $1 and trang_thai = 'duoc_duyet'
        and coalesce(nop_luc, duyet_luc) > now() - interval '400 days'`, [con]))
    .map((r) => gioDiaPhuong(new Date(r.luc), tz).ngay));
}

/** Trạng thái đóng băng (chỉ đọc — đường ghi đã bỏ ở #568): ngày đã đóng băng; `ngay`/`duocDung` tính theo luật 1 lần/tuần cũ. */
export async function trangThaiDongBang(con: string, tz: string, now = new Date()) {
  const bang = await ngayDongBang(con), lam = await ngayLam(con, tz);
  const homNay = gioDiaPhuong(now, tz).ngay, homQua = congNgay(homNay, -1);
  const tuanCua = (ngay: string) => [...bang].some((x) => dauTuan(x) === dauTuan(ngay));
  // hôm qua bỏ lỡ (mà trước đó còn chuỗi) ⇒ giữ hôm qua; không thì giữ hôm nay (nếu hôm nay chưa có nhiệm vụ)
  const truocHomQua = demChuoi(lam, bang, congNgay(homQua, -1));
  const ngay = !lam.has(homQua) && !bang.has(homQua) && truocHomQua > 0 ? homQua : !lam.has(homNay) && !bang.has(homNay) ? homNay : null;
  return { ngay, duocDung: !!ngay && !tuanCua(ngay), daDung: [...bang].sort().slice(-5) };
}
