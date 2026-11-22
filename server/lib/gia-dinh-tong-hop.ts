// #561: màn Ba Mẹ chính (GET gia-dinh) cần «Hôm nay» của MỌI Con. Trước: ~11 câu SQL cho mỗi Con. Nay: ba câu theo CẢ NHÀ (group theo child_id)
// rồi nạp vào bộ nhớ đệm yêu cầu (db.ts › napDem) đúng khoá của các câu theo từng Con ⇒ `homNay` / `tomTatVi` / `quyHomNay` chạy y nguyên, không tốn vòng DB.
// Khoá = SQL + tham số, nên hằng SQL dùng chung với nơi đọc (bao-cao.ts, vi.ts, so-sao.ts, quy-gio.ts); lệch ⇒ test gia-dinh-dem-cau báo số câu tăng.
import { napDem, q } from "./db.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { SQL_HOM_NAY_DEM, SQL_HOM_NAY_XONG } from "./bao-cao.ts";
import { KIEM_SQL, SQL_TOM_TAT_VI } from "./vi.ts";
import { SQL_TRANG_THAI_SAO } from "./so-sao.ts";
import { SQL_PHUT_DA_DUNG } from "./quy-gio.ts";

type Hang = Record<string, unknown> & { id: string };

/** `con`: các hàng `select * from children where family_id` đã đọc; `tz`: múi giờ nhà; `now`: CÙNG mốc giờ sẽ truyền cho `homNay`. */
export async function napTongHopNha(fam: string, con: Hang[], tz: string, now: Date) {
  if (!con.length) return;
  const ids = con.map((c) => c.id);
  const ngay = gioDiaPhuong(now, tz).ngay, tu = dauNgayUtc(ngay, tz);
  // bối cảnh Con (boiCanhCon): hàng `children` đã có sẵn từ danh sách
  for (const c of con) napDem(`select * from children where id = $1`, [c.id], [c]);
  const [tong, xong, dung] = await Promise.all([
    q<Record<string, unknown> & { id: string }>(
      `select c.id, d.*, v.* from children c
         left join lateral (select
            (select count(*)::int from submissions where child_id = c.id and trang_thai = 'cho_duyet') as nv_cho,
            (select count(*)::int from requests where child_id = c.id and trang_thai = 'cho' and het_han > now()) as yc_cho,
            (select count(*)::int from redemptions where child_id = c.id and trang_thai = 'giu') as phieu_cho,
            (select count(*)::int from submissions where child_id = c.id and trang_thai = 'duoc_duyet' and duyet_luc >= $2) as xong,
            coalesce((select sum(coalesce(s.diem_nop, t.diem)) from submissions s join tasks t on t.id = s.task_id
                      where s.child_id = c.id and s.trang_thai = 'cho_duyet'), 0)::int as cho,
            coalesce((select sum(diem) from redemptions where child_id = c.id and trang_thai = 'giu'), 0)::int as giu) d on true
         left join lateral (select coalesce(sum(delta), 0)::int as du,
            coalesce(sum(delta) filter (where loai in ('vay', 'tra_no')), 0)::int as no,
            coalesce(sum(delta) filter (where loai = 'vay'), 0)::int as vay,
            coalesce(-sum(delta) filter (where loai = 'tra_no'), 0)::int as tra,
            coalesce(sum(delta) filter (where ${KIEM_SQL}), 0)::int as kiem,
            coalesce(-sum(delta) filter (where loai = 'choi' and created_at >= $2), 0)::int as p
            from points where child_id = c.id) v on true
        where c.family_id = $1`, [fam, tu]),
    q<{ child_id: string; ten: string }>(
      `select child_id, ten from (select s.child_id, t.ten, row_number() over (partition by s.child_id order by s.duyet_luc desc) as rn
         from submissions s join tasks t on t.id = s.task_id
        where s.child_id = any($1::text[]) and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2) x where rn <= 3 order by child_id, rn`, [ids, tu]),
    q<{ child_id: string; k: string; may: string; p: number; ten_mien: string | null; giay: number | null }>(
      `select child_id, 'phien' as k, coalesce(device_id, '') as may, coalesce(sum(phut_dung), 0)::real as p, null::text as ten_mien, null::real as giay
         from play_sessions where child_id = any($1::text[]) and bat_dau >= $2 group by 1, 2, 3
       union all
       select child_id, 'app', device_id, coalesce(sum(phut), 0)::real, null, null from usage where child_id = any($1::text[]) and ngay = $3 and loai = 'giai_tri' group by 1, 2, 3
       union all
       select child_id, 'web', device_id, 0, ten_mien, giay from web_nhat_ky where child_id = any($1::text[]) and ngay = $3 and giay > 0`, [ids, tu, ngay]),
  ]);
  const theoCon = <T extends { child_id: string }>(xs: T[], id: string) => xs.filter((x) => x.child_id === id);
  for (const id of ids) {
    const t = tong.find((x) => x.id === id) as Record<string, unknown>;
    napDem(SQL_HOM_NAY_DEM, [id, tu], [{ nv_cho: t.nv_cho, yc_cho: t.yc_cho, phieu_cho: t.phieu_cho, xong: t.xong }]);
    napDem(SQL_HOM_NAY_XONG, [id, tu], theoCon(xong, id).map((x) => ({ ten: x.ten })));
    napDem(SQL_TOM_TAT_VI, [id], [{ du: t.du, no: t.no, vay: t.vay, tra: t.tra, kiem: t.kiem, cho: t.cho, giu: t.giu }]);
    napDem(SQL_TRANG_THAI_SAO, [id, tu], [{ s: t.du, n: t.no, p: t.p }]);
    napDem(SQL_PHUT_DA_DUNG, [id, tu, ngay], theoCon(dung, id).map(({ k, may, p, ten_mien, giay }) => ({ k, may, p, ten_mien, giay })));
  }
}
