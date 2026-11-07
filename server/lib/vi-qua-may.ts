// Ví quà của bé đang đăng nhập trên MÁY CON — GET /api/device/vi-qua (màn «Quà» / «Ví quà» của Win, Mac, ĐT; thiết kế chốt 06/11 L14).
// Một lượt gom: sao + sao giữ, quà bảng giá áp cho bé (kèm điều kiện còn hợp lệ), phiếu chờ trao, quà đã trao (kèm voucher QR + hạn), huy hiệu đã đạt.
// Chỉ ĐỌC (trừ việc đánh dấu voucher quá hạn của pt.viQua), dựng trên các hàm có sẵn (phan-thuong.ts viQua / cuaHang, thanh-tich.ts HUY_HIEU) — không sửa luật đổi quà.
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan } from "./gio.ts";
import * as pt from "./phan-thuong.ts";
import { HUY_HIEU } from "./thanh-tich.ts";

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

export async function viQuaMay(con: string, now = new Date()) {
  const c = await one<{ id: string; ten: string; avatar: string; family_id: string }>(`select id, ten, avatar, family_id from children where id = $1`, [con]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [c.family_id]))!.tz;
  const ch = await pt.cuaHang(con);          // sao, saoGiu, quà đang bật + còn hàng + áp cho bé
  const vi = await pt.viQua(con);            // voucher (đã tự đánh dấu hết hạn), phiếu giữ, đã trao
  const tuThang = dauNgayUtc(`${gioDiaPhuong(now, tz).ngay.slice(0, 8)}01`, tz);
  const daDoi = new Map((await q<{ reward_id: string; n: number }>(`select reward_id, count(*)::int as n from redemptions
    where child_id = $1 and reward_id is not null and trang_thai <> 'huy' and created_at >= $2 group by reward_id`, [con, tuThang])).map((x) => [x.reward_id, x.n]));
  const cuoiTuan = laCuoiTuan(gioDiaPhuong(now, tz).thu);
  const qua = ch.qua.map((x) => {
    const n = daDoi.get(x.id) ?? 0;
    const lyDo = x.chi_cuoi_tuan && !cuoiTuan ? "chi_cuoi_tuan" : x.toi_da_thang && n >= x.toi_da_thang ? "du_thang" : null;
    return { id: x.id, ten: x.ten, loai: x.loai, sao: x.diem, hinh: x.hinh, moTa: x.mo_ta, menhGia: x.menh_gia ?? null, laVoucher: x.loai === "voucher",
      du: x.du, conThieu: x.conThieu, choTraoTu: x.choTraoTu,
      dieuKien: { chiCuoiTuan: !!x.chi_cuoi_tuan, toiDaThang: x.toi_da_thang ?? null, daDoiThang: n, tonKho: x.ton_kho ?? null },
      conHopLe: lyDo === null, lyDoKhong: lyDo,   // `chi_cuoi_tuan` | `du_thang` (hết hàng thì quà không có trong danh sách)
      doiDuoc: lyDo === null && x.du };
  });
  const vPhieu = new Map((await q<{ redemption_id: string; ma: string; menh_gia: number; trang_thai: string; het_han: Date }>(
    `select redemption_id, ma, menh_gia, trang_thai, het_han from vouchers where child_id = $1 and redemption_id is not null`, [con])).map((v) => [v.redemption_id, v]));
  const voucherRa = (v: { ma: string; menh_gia: number; trang_thai: string; het_han: Date | string }) => {
    const con = v.trang_thai === "da_phat_hanh";
    return { ma: v.ma, qr: con ? v.ma : null, menhGia: v.menh_gia, trangThai: v.trang_thai, hetHan: iso(v.het_han),
      conNgay: con ? Math.max(0, Math.ceil((new Date(v.het_han).getTime() - now.getTime()) / 86_400_000)) : 0 };
  };
  const got = (await q<{ id: string; ten: string; loai: string; diem: number; xu_ly_luc: Date }>(
    `select id, ten, loai, diem, coalesce(xu_ly_luc, created_at) as xu_ly_luc from redemptions where child_id = $1 and trang_thai in ('da_trao', 'xong') order by coalesce(xu_ly_luc, created_at) desc limit 30`, [con]));
  const huy = await q<{ ma: string; dat_luc: Date }>(`select ma, dat_luc from badges where child_id = $1 order by dat_luc desc`, [con]);
  return {
    con: { id: c.id, ten: c.ten, avatar: c.avatar },
    sao: ch.sao, saoGiu: ch.saoGiu,
    qua,
    phieuCho: vi.phieu.map((p) => ({ id: p.id, ten: p.ten, loai: p.loai, sao: p.diem, doiLuc: iso(p.created_at) })),
    daTrao: got.map((p) => { const v = vPhieu.get(p.id); const hien = v && ["da_phat_hanh", "da_dung", "het_han"].includes(v.trang_thai); return { id: p.id, ten: p.ten, loai: p.loai, sao: p.diem, traoLuc: iso(p.xu_ly_luc), voucher: hien ? voucherRa(v!) : null }; }),
    voucher: vi.voucher.map((v) => ({ ten: v.ten, ...voucherRa(v), dungLuc: iso(v.dung_luc) })),
    huyHieu: huy.filter((h) => HUY_HIEU[h.ma]).map((h) => ({ ma: h.ma, ten: HUY_HIEU[h.ma].ten, moTa: HUY_HIEU[h.ma].mo_ta, datLuc: iso(h.dat_luc) })),
  };
}
