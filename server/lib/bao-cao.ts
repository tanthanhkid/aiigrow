// Báo cáo (FR-06.01–06.03, 06.05): bảng «Hôm nay» theo Con, báo cáo tuần (thời gian theo nhóm, top mục, điểm kiếm theo nhóm nhiệm vụ,
// điểm tiêu theo loại, tỷ lệ duyệt, ngoại lệ, so tuần trước) với câu chú giải đời thường. Chỉ tên mục + thời lượng, không nội dung.
import { one, q } from "./db.ts";
import { thamSo } from "./cau-hinh.ts";
import { congNgay, dauNgayUtc, dauTuan, gioDiaPhuong } from "./gio.ts";
import { tomTatVi } from "./vi.ts";
import { conTheoTran } from "./phien.ts";
import { phutChoSao } from "./quy-gio.ts";
import { tenDoc } from "./man-hinh.ts";

const NHOM_NV_CHU: Record<string, string> = { doc_sach: "đọc sách", viec_nha: "việc nhà", hoc_tap: "học tập", van_dong: "vận động", ky_nang: "kỹ năng", khac: "việc khác" };

export async function homNay(fam: string, con: string, now = new Date()) {
  const [f0, c0] = await Promise.all([one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]),
    one<{ ten: string; cau_hinh: Record<string, unknown> }>(`select ten, cau_hinh from children where id = $1 and family_id = $2`, [con, fam])]);
  const f = f0!, c = c0!;
  const ngay = gioDiaPhuong(now, f.tz).ngay;
  const tu = dauNgayUtc(ngay, f.tz);
  const ts = thamSo(f.cau_hinh, c.cau_hinh);
  const [r0, tc, vi, tran] = await Promise.all([one<{ nv_cho: number; yc_cho: number; phieu_cho: number; xong: number }>(
    `select (select count(*)::int from submissions where child_id = $1 and trang_thai = 'cho_duyet') as nv_cho,
            (select count(*)::int from requests where child_id = $1 and trang_thai = 'cho' and het_han > now()) as yc_cho,
            (select count(*)::int from redemptions where child_id = $1 and trang_thai = 'giu') as phieu_cho,
            (select count(*)::int from submissions where child_id = $1 and trang_thai = 'duoc_duyet' and duyet_luc >= $2) as xong`, [con, tu]),
    q<{ ten: string }>(
    `select t.ten from submissions s join tasks t on t.id = s.task_id where s.child_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2
     order by s.duyet_luc desc limit 3`, [con, tu]), tomTatVi(con), conTheoTran(q, con, ts, f.tz, now)]);
  const r = r0!, tichCuc = tc.map((x) => x.ten);
  const conPhut = tran.conPhut;
  // 05/11: tranNgay = quỹ hôm nay (quỹ ngày + phút cộng thêm) · `quy` đủ chi tiết (lib/quy-gio.ts)
  return { ...vi, phutChoi: tran.daChoi, tranNgay: tran.quy.tongPhut, quy: tran.quy,
    /** phút giải trí còn được chơi hôm nay theo trần ngày lẫn tuần (đã cộng thêm giờ) — như conNgay/conTuan của xetMoPhien */ conPhut, nhiemVuCho: r.nv_cho, yeuCauCho: r.yc_cho, phieuCho: r.phieu_cho, nhiemVuXong: r.xong,
    homNayConDa: tichCuc,
    /** «≈ X phút chơi»: điểm hiện có đổi được bao nhiêu phút trò chơi (giá gia_game, phần nghìn điểm / phút), không quá phần trần còn lại
     *  SAU phút thêm giờ chưa dùng (phiên tiêu thêm giờ trước, như xetMoPhien) */
    // 05/11: sao hiện có đổi được bao nhiêu phút (10 sao = phut_10_sao phút), không quá phần Con còn được tự đổi hôm nay
    phutDoiDuoc: tran.quy.doiSao.bat ? Math.max(0, Math.min(phutChoSao(ts, vi.soDu), tran.quy.doiSao.conDoiDuoc)) : 0 };
}

async function tuan(con: string, tz: string, dau: string) {
  const tu = dauNgayUtc(dau, tz), den = dauNgayUtc(congNgay(dau, 7), tz), het = congNgay(dau, 7);
  const ngayDs = Array.from({ length: 7 }, (_, i) => congNgay(dau, i));
  // 8 câu độc lập ⇒ chạy song song (mỗi câu là một vòng mạng tới DB)
  const [dung, choi, kiem, tieu, duyet0, nl, top, dungNhieu, xin0] = await Promise.all([
    q<{ ngay: string; loai: string; phut: number }>(
      `select ngay, loai, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 group by ngay, loai`, [con, dau, het]),
    q<{ phut: number; bat_dau: Date }>(`select phut_dung as phut, bat_dau from play_sessions where child_id = $1 and bat_dau >= $2 and bat_dau < $3`, [con, tu, den]),
    q<{ nhom: string; diem: number; n: number }>(
      `select t.nhom, sum(s.diem)::int as diem, count(*)::int as n from submissions s join tasks t on t.id = s.task_id
       where s.child_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2 and s.duyet_luc < $3 group by t.nhom order by diem desc`, [con, tu, den]),
    q<{ loai: string; diem: number }>(
      `select loai, -sum(delta)::int as diem from points where child_id = $1 and delta < 0 and created_at >= $2 and created_at < $3 group by loai`, [con, tu, den]),
    one<{ duoc: number; tu_choi: number }>(
      `select count(*) filter (where trang_thai = 'duoc_duyet')::int as duoc, count(*) filter (where trang_thai = 'tu_choi')::int as tu_choi
       from submissions where child_id = $1 and duyet_luc >= $2 and duyet_luc < $3`, [con, tu, den]),
    one<{ n: number }>(`select count(*)::int as n from exceptions where child_id = $1 and created_at >= $2 and created_at < $3`, [con, tu, den]),
    q<{ muc: string; phut: number }>(
      `select muc, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 and loai = 'giai_tri' group by muc order by phut desc limit 5`,
      [con, dau, het]),
    q<{ muc: string; loai: string; phut: number; may: string | null }>(
      // máy = máy có TỔNG phút (cả 7 ngày) lớn nhất cho app đó — cộng theo (app, máy) trước rồi mới lấy máy lớn nhất
      `with m as (select u.muc, u.device_id, max(u.loai) as loai, sum(u.phut)::int as phut from usage u
                   where u.child_id = $1 and u.ngay >= $2 and u.ngay < $3 and u.loai in ('hoc', 'giai_tri') group by u.muc, u.device_id)
       select m.muc, max(m.loai) as loai, sum(m.phut)::int as phut, (array_agg(d.name order by m.phut desc))[1] as may
         from m left join devices d on d.id = m.device_id group by m.muc order by phut desc limit 5`, [con, dau, het]),
    // 14/11 «Sao và giờ thêm»: số lần con xin thêm giờ / Ba Mẹ cho
    one<{ so: number; cho: number; sao: number }>(`select count(*)::int as so, count(*) filter (where trang_thai in ('dong_y', 'da_thuc_thi'))::int as cho,
         (select coalesce(sum(delta), 0)::int from points where child_id = $1 and delta > 0 and loai <> 'hoan' and created_at >= $2 and created_at < $3) as sao
       from requests where child_id = $1 and loai = 'them_gio' and created_at >= $2 and created_at < $3`, [con, tu, den]),
  ]);
  const duyet = duyet0!, ngoaiLe = nl!.n;
  const giaiTriNgay = Object.fromEntries(ngayDs.map((d) => [d, 0]));
  for (const p of choi) giaiTriNgay[gioDiaPhuong(new Date(p.bat_dau), tz).ngay] = (giaiTriNgay[gioDiaPhuong(new Date(p.bat_dau), tz).ngay] ?? 0) + Math.round(p.phut);
  const hoc = dung.filter((x) => x.loai === "hoc" || x.loai === "he_thong").reduce((a, x) => a + x.phut, 0);
  const hocNgay = Object.fromEntries(ngayDs.map((d) => [d, 0]));
  for (const x of dung) if (x.loai === "hoc" || x.loai === "he_thong") hocNgay[x.ngay] = (hocNgay[x.ngay] ?? 0) + x.phut;
  return { dau, hocTheoNgay: ngayDs.map((d) => ({ ngay: d, phut: hocNgay[d] })), dungNhieu, giaiTriTheoNgay: ngayDs.map((d) => ({ ngay: d, phut: giaiTriNgay[d] })), tongGiaiTri: Object.values(giaiTriNgay).reduce((a, b) => a + b, 0),
    phutHoc: hoc, diemKiemTheoNhom: kiem, diemTieuTheoLoai: tieu, duyet, ngoaiLe, top, xinThemGio: { so: xin0?.so ?? 0, cho: xin0?.cho ?? 0 }, saoKiem: xin0?.sao ?? 0 };
}

/** Báo cáo tuần (thứ Hai → nay) — hoặc `bay` = 7 ngày qua tính tới hôm nay (Tab Báo cáo thiết kế 14/11: «7 ngày qua», so với 7 ngày trước đó). */
export async function baoCaoTuan(fam: string, con: string, now = new Date(), bay = false) {
  const [f0, c0] = await Promise.all([one<{ tz: string }>(`select tz from families where id = $1`, [fam]),
    one<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [con, fam])]);
  const f = f0!, c = c0!;
  const nay0 = gioDiaPhuong(now, f.tz).ngay;
  const dau = bay ? congNgay(nay0, -6) : dauTuan(nay0);
  const [nay, truoc] = await Promise.all([tuan(con, f.tz, dau), tuan(con, f.tz, congNgay(dau, -7))]);
  const cau: string[] = [];
  for (const k of nay.diemKiemTheoNhom) {
    const cu = truoc.diemKiemTheoNhom.find((x) => x.nhom === k.nhom)?.n ?? 0;
    if (k.n > cu) cau.push(`Tuần này ${c.ten} ${NHOM_NV_CHU[k.nhom] ?? k.nhom} nhiều hơn tuần trước ${k.n - cu} lần`);
  }
  const lech = nay.tongGiaiTri - truoc.tongGiaiTri;
  if (truoc.tongGiaiTri && lech) cau.push(`Giờ chơi ${lech > 0 ? "tăng" : "giảm"} ${Math.abs(lech)} phút so với tuần trước`);
  if (nay.ngoaiLe) cau.push(`Có ${nay.ngoaiLe} lần ngoại lệ trong tuần`);
  // «Dùng nhiều nhất» kèm % so tuần trước (thiết kế bm-bao-cao); mục mới tuần này ⇒ lech null
  const dungNhieu = nay.dungNhieu.map((x) => { const cu = truoc.dungNhieu.find((y) => y.muc === x.muc)?.phut;
    return { ...x, ten: tenDoc(x.muc, "app"), lech: cu ? Math.round(((x.phut - cu) / cu) * 100) : null }; });
  return { ten: c.ten, tuanNay: { ...nay, dungNhieu }, tuanTruoc: truoc, chuGiai: cau.slice(0, 4) };
}
