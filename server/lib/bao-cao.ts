// Báo cáo (FR-06.01–06.03, 06.05): bảng «Hôm nay» theo Con, báo cáo tuần (thời gian theo nhóm, top mục, điểm kiếm theo nhóm nhiệm vụ,
// điểm tiêu theo loại, tỷ lệ duyệt, ngoại lệ, so tuần trước) với câu chú giải đời thường. Chỉ tên mục + thời lượng, không nội dung.
import { one, q } from "./db.ts";
import { thamSo } from "./cau-hinh.ts";
import { congNgay, dauNgayUtc, dauTuan, gioDiaPhuong } from "./gio.ts";
import { tomTatVi } from "./vi.ts";

const NHOM_NV_CHU: Record<string, string> = { doc_sach: "đọc sách", viec_nha: "việc nhà", hoc_tap: "học tập", van_dong: "vận động", ky_nang: "kỹ năng", khac: "việc khác" };

export async function homNay(fam: string, con: string, now = new Date()) {
  const f = (await one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))!;
  const c = (await one<{ ten: string; cau_hinh: Record<string, unknown> }>(`select ten, cau_hinh from children where id = $1 and family_id = $2`, [con, fam]))!;
  const ngay = gioDiaPhuong(now, f.tz).ngay;
  const tu = dauNgayUtc(ngay, f.tz);
  const ts = thamSo(f.cau_hinh, c.cau_hinh);
  const r = (await one<{ choi: number; nv_cho: number; yc_cho: number; xong: number }>(
    `select coalesce((select sum(phut_dung) from play_sessions where child_id = $1 and bat_dau >= $2), 0)::int as choi,
            (select count(*)::int from submissions where child_id = $1 and trang_thai = 'cho_duyet') as nv_cho,
            (select count(*)::int from requests where child_id = $1 and trang_thai = 'cho' and het_han > now()) as yc_cho,
            (select count(*)::int from submissions where child_id = $1 and trang_thai = 'duoc_duyet' and duyet_luc >= $2) as xong`, [con, tu]))!;
  const tichCuc = (await q<{ ten: string }>(
    `select t.ten from submissions s join tasks t on t.id = s.task_id where s.child_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2
     order by s.duyet_luc desc limit 3`, [con, tu])).map((x) => x.ten);
  return { ...(await tomTatVi(con)), phutChoi: r.choi, tranNgay: ts.tran_ngay, nhiemVuCho: r.nv_cho, yeuCauCho: r.yc_cho, nhiemVuXong: r.xong,
    homNayConDa: tichCuc };
}

async function tuan(con: string, tz: string, dau: string) {
  const tu = dauNgayUtc(dau, tz), den = dauNgayUtc(congNgay(dau, 7), tz);
  const ngayDs = Array.from({ length: 7 }, (_, i) => congNgay(dau, i));
  const dung = await q<{ ngay: string; loai: string; phut: number }>(
    `select ngay, loai, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 group by ngay, loai`, [con, dau, congNgay(dau, 7)]);
  const choi = await q<{ phut: number; bat_dau: Date }>(`select phut_dung as phut, bat_dau from play_sessions where child_id = $1 and bat_dau >= $2 and bat_dau < $3`, [con, tu, den]);
  const giaiTriNgay = Object.fromEntries(ngayDs.map((d) => [d, 0]));
  for (const p of choi) giaiTriNgay[gioDiaPhuong(new Date(p.bat_dau), tz).ngay] = (giaiTriNgay[gioDiaPhuong(new Date(p.bat_dau), tz).ngay] ?? 0) + Math.round(p.phut);
  const hoc = dung.filter((x) => x.loai === "hoc" || x.loai === "he_thong").reduce((a, x) => a + x.phut, 0);
  const kiem = await q<{ nhom: string; diem: number; n: number }>(
    `select t.nhom, sum(s.diem)::int as diem, count(*)::int as n from submissions s join tasks t on t.id = s.task_id
     where s.child_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2 and s.duyet_luc < $3 group by t.nhom order by diem desc`, [con, tu, den]);
  const tieu = await q<{ loai: string; diem: number }>(
    `select loai, -sum(delta)::int as diem from points where child_id = $1 and delta < 0 and created_at >= $2 and created_at < $3 group by loai`, [con, tu, den]);
  const duyet = (await one<{ duoc: number; tu_choi: number }>(
    `select count(*) filter (where trang_thai = 'duoc_duyet')::int as duoc, count(*) filter (where trang_thai = 'tu_choi')::int as tu_choi
     from submissions where child_id = $1 and duyet_luc >= $2 and duyet_luc < $3`, [con, tu, den]))!;
  const ngoaiLe = (await one<{ n: number }>(`select count(*)::int as n from exceptions where child_id = $1 and created_at >= $2 and created_at < $3`, [con, tu, den]))!.n;
  const top = await q<{ muc: string; phut: number }>(
    `select muc, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 and loai = 'giai_tri' group by muc order by phut desc limit 5`,
    [con, dau, congNgay(dau, 7)]);
  return { dau, giaiTriTheoNgay: ngayDs.map((d) => ({ ngay: d, phut: giaiTriNgay[d] })), tongGiaiTri: Object.values(giaiTriNgay).reduce((a, b) => a + b, 0),
    phutHoc: hoc, diemKiemTheoNhom: kiem, diemTieuTheoLoai: tieu, duyet, ngoaiLe, top };
}

export async function baoCaoTuan(fam: string, con: string, now = new Date()) {
  const f = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))!;
  const c = (await one<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [con, fam]))!;
  const dau = dauTuan(gioDiaPhuong(now, f.tz).ngay);
  const nay = await tuan(con, f.tz, dau), truoc = await tuan(con, f.tz, congNgay(dau, -7));
  const cau: string[] = [];
  for (const k of nay.diemKiemTheoNhom) {
    const cu = truoc.diemKiemTheoNhom.find((x) => x.nhom === k.nhom)?.n ?? 0;
    if (k.n > cu) cau.push(`Tuần này ${c.ten} ${NHOM_NV_CHU[k.nhom] ?? k.nhom} nhiều hơn tuần trước ${k.n - cu} lần`);
  }
  const lech = nay.tongGiaiTri - truoc.tongGiaiTri;
  if (truoc.tongGiaiTri && lech) cau.push(`Giờ chơi ${lech > 0 ? "tăng" : "giảm"} ${Math.abs(lech)} phút so với tuần trước`);
  if (nay.ngoaiLe) cau.push(`Có ${nay.ngoaiLe} lần ngoại lệ trong tuần`);
  return { ten: c.ten, tuanNay: nay, tuanTruoc: truoc, chuGiai: cau.slice(0, 4) };
}
