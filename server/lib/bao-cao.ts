// Báo cáo (FR-06.01–06.03, 06.05): bảng «Hôm nay» theo Con, báo cáo tuần (thời gian theo nhóm, top mục, điểm kiếm theo nhóm nhiệm vụ,
// điểm tiêu theo loại, tỷ lệ duyệt, so tuần trước) với câu chú giải đời thường. Chỉ tên mục + thời lượng, không nội dung.
// 15/11 (#264–#266): báo cáo theo SAO — sao kiếm / sao vay / sao tiêu (chơi 1 sao = 1 phút + đổi quà) / trả nợ; «ngoại lệ» bỏ (= số lần cho vay).
// #262: «Giờ học» ⇒ «Không tính phút» (phutKhongTinhPhut / khongTinhPhutTheoNgay; dungNhieu[].nhom tinh_phut | khong_tinh_phut).
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { congNgay, dauNgayUtc, dauTuan, gioDiaPhuong } from "./gio.ts";
import { tomTatVi } from "./vi.ts";
import { conTheoTran } from "./phien.ts";
import { thongKeSao } from "./so-sao.ts";
import { tenDoc } from "./man-hinh.ts";
import { nhomTuLoai } from "./chan-co-ban.ts";

const NHOM_NV_CHU: Record<string, string> = { doc_sach: "đọc sách", viec_nha: "việc nhà", hoc_tap: "học tập", van_dong: "vận động", ky_nang: "kỹ năng", khac: "việc khác" };

/** Hai câu đọc của `homNay` — tách hằng để GET gia-dinh gộp theo cả nhà rồi nạp đệm đúng khoá (lib/gia-dinh-tong-hop.ts). */
export const SQL_HOM_NAY_DEM = `select (select count(*)::int from submissions where child_id = $1 and trang_thai = 'cho_duyet') as nv_cho,
            (select count(*)::int from requests where child_id = $1 and trang_thai = 'cho' and het_han > now()) as yc_cho,
            (select count(*)::int from redemptions where child_id = $1 and trang_thai = 'giu') as phieu_cho,
            (select count(*)::int from submissions where child_id = $1 and trang_thai = 'duoc_duyet' and duyet_luc >= $2) as xong`;
export const SQL_HOM_NAY_XONG = `select t.ten from submissions s join tasks t on t.id = s.task_id where s.child_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2
     order by s.duyet_luc desc limit 3`;

export async function homNay(fam: string, con: string, now = new Date()) {
  const [f0, c0] = await Promise.all([one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]),
    one<{ ten: string; cau_hinh: Record<string, unknown>; family_id: string }>(`select ten, cau_hinh, family_id from children where id = $1`, [con])]);
  if (!f0 || !c0 || c0.family_id !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const f = f0, c = c0;
  const ngay = gioDiaPhuong(now, f.tz).ngay;
  const tu = dauNgayUtc(ngay, f.tz);
  const ts = thamSo(f.cau_hinh, c.cau_hinh);
  const [r0, tc, vi, tran] = await Promise.all([one<{ nv_cho: number; yc_cho: number; phieu_cho: number; xong: number }>(SQL_HOM_NAY_DEM, [con, tu]),
    q<{ ten: string }>(SQL_HOM_NAY_XONG, [con, tu]), tomTatVi(con), conTheoTran(q, con, ts, f.tz, now)]);
  const r = r0!, tichCuc = tc.map((x) => x.ten);
  const conPhut = tran.conPhut;
  // 15/11: tranNgay (cũ) = phút còn + đã dùng · `quy` (hình dạng cũ, conPhut = sao tiêu được) · `phutChoi` = phút «Tính phút» đã dùng hôm nay
  return { ...vi, phutChoi: tran.daChoi, tranNgay: tran.quy.tongPhut, quy: tran.quy,
    /** phút giải trí còn được chơi hôm nay theo trần ngày lẫn tuần (đã cộng thêm giờ) — như conNgay/conTuan của xetMoPhien */ conPhut, nhiemVuCho: r.nv_cho, yeuCauCho: r.yc_cho, phieuCho: r.phieu_cho, nhiemVuXong: r.xong,
    homNayConDa: tichCuc,
    /** «≈ X phút chơi»: điểm hiện có đổi được bao nhiêu phút trò chơi (giá gia_game, phần nghìn điểm / phút), không quá phần trần còn lại
     *  SAU phút thêm giờ chưa dùng (phiên tiêu thêm giờ trước, như xetMoPhien) */
    // 05/11: sao hiện có đổi được bao nhiêu phút (10 sao = phut_10_sao phút), không quá phần Con còn được tự đổi hôm nay
    // 15/11: 1 sao = 1 phút ⇒ phút «đổi được» = phút còn chơi (sao tiêu được)
    phutDoiDuoc: vi.phutCon };
}

/**
 * #492: phút chơi mỗi ngày được trả bằng SAO VAY (đọc, không migration). Mô hình như «trong đó N sao Ba Mẹ cho vay» của bảng trao quà:
 * sao tiêu được S = sao kiếm + sao vay còn lại; nợ D (vay + trả nợ). Sao kiếm được tiêu trước, sao vay chưa tiêu = min(S, D).
 * Mỗi ngày: áp mọi biến động (trừ chơi) rồi chơi x phút ⇒ phần vay đã tiêu = min(S, D) − min(S − x, D).
 * `dau` = {s, d} trước ngày đầu; `ngay[i]` = {net: tổng delta cả ngày (gồm chơi), no: delta loại vay/tra_no, choi: phút chơi}.
 */
export function vayTheoNgay(dau: { s: number; d: number }, ngay: { net: number; no: number; choi: number }[]): number[] {
  let s = dau.s, d = dau.d;
  return ngay.map((x) => {
    s += x.net + x.choi; d += x.no;           // trước khi chơi: net đã gồm −choi nên cộng lại
    const chiVay = Math.max(0, Math.min(s, d) - Math.min(s - x.choi, d));
    s -= x.choi;
    return Math.max(0, Math.min(x.choi, chiVay));   // choi âm (hoàn nhiều hơn chơi) ⇒ 0
  });
}

async function tuan(con: string, tz: string, dau: string) {
  const tu = dauNgayUtc(dau, tz), den = dauNgayUtc(congNgay(dau, 7), tz), het = congNgay(dau, 7);
  const ngayDs = Array.from({ length: 7 }, (_, i) => congNgay(dau, i));
  // 11 câu độc lập (gồm 2 câu #492 cho phần sao vay theo ngày) ⇒ chạy song song (mỗi câu là một vòng mạng tới DB)
  const [dung, choi, kiem, tieu, duyet0, sao, top, dungNhieu, xin0, soDau, soNgay] = await Promise.all([
    q<{ ngay: string; loai: string; phut: number }>(
      `select ngay, loai, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 group by ngay, loai`, [con, dau, het]),
    // #433 B10: MỘT nguồn phút chơi = sổ sao (1 sao = 1 phút, cách đếm cửa sổ chống trừ đôi của phần A) — không đọc play_sessions song song nữa
    // (cùng lượt chơi nằm cả ở phiên lẫn sổ ⇒ hai số lệch nhau). Cùng bộ lọc với thongKeSao ⇒ tổng giải trí = saoTieuChoi.
    q<{ ngay: string; phut: number }>(
      `select to_char(created_at at time zone $4, 'YYYY-MM-DD') as ngay, coalesce(-sum(delta), 0)::int as phut from points
        where child_id = $1 and created_at >= $2 and created_at < $3 and (loai in ('choi', 'phien', 'doi_gio')
          or (loai = 'hoan' and delta > 0 and coalesce(ref, '') not in (select id from redemptions where child_id = $1)
              and coalesce(ref, '') not in (select id from submissions where child_id = $1))) group by 1`, [con, tu, den, tz]),
    q<{ nhom: string; diem: number; n: number }>(
      `select t.nhom, sum(s.diem)::int as diem, count(*)::int as n from submissions s join tasks t on t.id = s.task_id
       where s.child_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2 and s.duyet_luc < $3 group by t.nhom order by diem desc`, [con, tu, den]),
    q<{ loai: string; diem: number }>(
      // #433 B10: «tiêu» chỉ là Con dùng sao (chơi, đổi quà, Ba Mẹ trừ tay) — không gom trả nợ, rút lại sao vay, hoàn tác duyệt
      `select loai, -sum(delta)::int as diem from points where child_id = $1 and delta < 0 and loai not in ('tra_no', 'vay', 'hoan')
         and created_at >= $2 and created_at < $3 group by loai`, [con, tu, den]),
    // #433 B10: tỷ lệ duyệt đếm đủ kết cục — được duyệt / từ chối / nhờ làm lại (cần bổ sung) / hết hạn chưa duyệt
    one<{ duoc: number; tu_choi: number; lam_lai: number; het_han: number }>(
      `select count(*) filter (where trang_thai = 'duoc_duyet')::int as duoc, count(*) filter (where trang_thai = 'tu_choi')::int as tu_choi,
              count(*) filter (where trang_thai in ('can_bo_sung', 'lam_lai'))::int as lam_lai, count(*) filter (where trang_thai = 'het_han')::int as het_han
       from submissions where child_id = $1 and duyet_luc >= $2 and duyet_luc < $3`, [con, tu, den]),
    thongKeSao(con, tu, den),
    q<{ muc: string; phut: number }>(
      `select muc, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 and loai = 'giai_tri' group by muc order by phut desc limit 5`,
      [con, dau, het]),
    q<{ muc: string; loai: string; phut: number; may: string | null }>(
      // máy = máy có TỔNG phút (cả 7 ngày) lớn nhất cho app đó — cộng theo (app, máy) trước rồi mới lấy máy lớn nhất
      `with m as (select u.muc, u.device_id, max(u.loai) as loai, sum(u.phut)::int as phut from usage u
                   where u.child_id = $1 and u.ngay >= $2 and u.ngay < $3 and u.loai in ('hoc', 'giai_tri') group by u.muc, u.device_id)
       select m.muc, max(m.loai) as loai, sum(m.phut)::int as phut, (array_agg(d.name order by m.phut desc))[1] as may
         from m left join devices d on d.id = m.device_id group by m.muc order by phut desc limit 5`, [con, dau, het]),
    // 14/11 «Sao và giờ thêm» ⇒ 15/11: số lần con xin vay sao (gồm lời xin thêm giờ cũ) / Ba Mẹ cho
    one<{ so: number; cho: number; sao: number }>(`select count(*)::int as so, count(*) filter (where trang_thai in ('dong_y', 'da_thuc_thi'))::int as cho,
         (select coalesce(sum(delta), 0)::int from points where child_id = $1 and delta > 0 and loai <> 'hoan' and created_at >= $2 and created_at < $3) as sao
       from requests where child_id = $1 and loai in ('vay_sao', 'them_gio', 'ngoai_le', 'ngoai_gio') and created_at >= $2 and created_at < $3`, [con, tu, den]),
    // #492: số dư + nợ trước tuần và biến động từng ngày ⇒ phút chơi bằng sao vay theo ngày (vayTheoNgay)
    one<{ s: number; d: number }>(`select coalesce(sum(delta), 0)::int as s, coalesce(sum(delta) filter (where loai in ('vay', 'tra_no')), 0)::int as d from points where child_id = $1 and created_at < $2`, [con, tu]),
    q<{ ngay: string; net: number; no: number }>(
      `select to_char(created_at at time zone $4, 'YYYY-MM-DD') as ngay, coalesce(sum(delta), 0)::int as net, coalesce(sum(delta) filter (where loai in ('vay', 'tra_no')), 0)::int as no
         from points where child_id = $1 and created_at >= $2 and created_at < $3 group by 1`, [con, tu, den, tz]),
  ]);
  const d0 = duyet0!, tong = d0.duoc + d0.tu_choi + d0.lam_lai + d0.het_han;
  const duyet = { ...d0, tong, tyLe: tong ? Math.round((d0.duoc / tong) * 100) : null };
  const giaiTriNgay = Object.fromEntries(ngayDs.map((d) => [d, 0]));
  const choiTho: Record<string, number> = {};   // chưa chặn âm: khớp với `net` của sổ sao khi tính phần vay
  for (const p of choi) if (p.ngay in giaiTriNgay) { giaiTriNgay[p.ngay] = Math.max(0, p.phut); choiTho[p.ngay] = p.phut; }
  const vayNgay = vayTheoNgay(soDau ?? { s: 0, d: 0 }, ngayDs.map((dd) => {
    const r = soNgay.find((x) => x.ngay === dd);
    return { net: r?.net ?? 0, no: r?.no ?? 0, choi: choiTho[dd] ?? 0 };
  }));
  const hoc = dung.filter((x) => x.loai === "hoc" || x.loai === "he_thong").reduce((a, x) => a + x.phut, 0);
  const hocNgay = Object.fromEntries(ngayDs.map((d) => [d, 0]));
  for (const x of dung) if (x.loai === "hoc" || x.loai === "he_thong") hocNgay[x.ngay] = (hocNgay[x.ngay] ?? 0) + x.phut;
  const khongTinhPhutTheoNgay = ngayDs.map((d) => ({ ngay: d, phut: hocNgay[d] }));
  // #262: ô «Giờ học» ⇒ «Không tính phút» (app / web nhóm Không tính phút + app hệ thống). hocTheoNgay / phutHoc (cũ) = cùng số, giữ cho app cũ.
  return { dau, khongTinhPhutTheoNgay, phutKhongTinhPhut: hoc, hocTheoNgay: khongTinhPhutTheoNgay, dungNhieu, giaiTriTheoNgay: ngayDs.map((d, i) => ({ ngay: d, phut: giaiTriNgay[d], /** #492: phút trong đó trả bằng sao vay (cột hai màu) */ vay: vayNgay[i] })), tongGiaiTri: Object.values(giaiTriNgay).reduce((a, b) => a + b, 0),
    phutHoc: hoc, diemKiemTheoNhom: kiem, diemTieuTheoLoai: tieu, duyet,
    /** (cũ) ngoại lệ — đã bỏ; giữ trường = số lần Ba Mẹ cho vay để app cũ không vỡ */ ngoaiLe: sao.lanVay, top,
    xinThemGio: { so: xin0?.so ?? 0, cho: xin0?.cho ?? 0 }, xinVay: { so: xin0?.so ?? 0, cho: xin0?.cho ?? 0 },
    /** 15/11 báo cáo theo sao: sao kiếm / vay (số lần) / tiêu (chơi + đổi quà) / trả nợ · phút chơi = sao tiêu cho chơi */
    saoKiem: sao.saoKiem, saoVay: sao.saoVay, lanVay: sao.lanVay, saoTieu: sao.saoTieu, saoTieuChoi: sao.saoTieuChoi, saoTieuQua: sao.saoTieuQua, saoTraNo: sao.saoTraNo };
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
  if (nay.lanVay) cau.push(`Ba Mẹ cho ${c.ten} vay ${nay.lanVay} lần · ${nay.saoVay} sao`);
  // «Dùng nhiều nhất» kèm % so tuần trước (thiết kế bm-bao-cao); mục mới tuần này ⇒ lech null
  const dungNhieu = nay.dungNhieu.map((x) => { const cu = truoc.dungNhieu.find((y) => y.muc === x.muc)?.phut;
    return { ...x, ten: tenDoc(x.muc, "app"), nhom: nhomTuLoai(x.loai), lech: cu ? Math.round(((x.phut - cu) / cu) * 100) : null }; });
  return { ten: c.ten, tuanNay: { ...nay, dungNhieu }, tuanTruoc: truoc, chuGiai: cau.slice(0, 4) };
}
