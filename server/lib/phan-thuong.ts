// Cửa hàng phần thưởng (FR-04.01, 04.04, 04.05) + phiếu quà AiiCafe (FR-04.03, FR-09.02, Phụ lục A.4).
// Phút chơi KHÔNG bán ở cửa hàng: phiên giải trí trừ điểm theo phút thực dùng (lib/phien.ts); cửa hàng chỉ hiện bảng giá phút cho Con xem.
// Quà / đặc quyền: chọn là TRỪ điểm ngay (giữ chỗ) với phiếu «Chờ Ba Mẹ trao»; Ba Mẹ xác nhận đã trao, hoặc huỷ ⇒ hoàn điểm + trả tồn kho.
// Voucher AiiCafe (mô hình trả trước — mặc định, KE-HOACH 5.5): quỹ gia đình phải đủ mệnh giá; phát hành trừ điểm + trừ quỹ; mệnh giá
// ≥ `voucher_xac_nhan_tu` thì chờ Ba Mẹ xác nhận (điểm giữ, quỹ chưa trừ). Quầy quét: dùng MỘT lần (update có điều kiện, nguyên tử).
import { randomInt } from "node:crypto";
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan } from "./gio.ts";
import { ghiDiem, khoaCon, soDu } from "./vi.ts";
import { ghiSuKien } from "./nhat-ky.ts";

export const LOAI_QUA = ["voucher", "qua", "dac_quyen", "tiet_kiem"] as const;

export type Qua = { id: string; family_id: string; ten: string; loai: string; diem: number; menh_gia: number | null; ton_kho: number | null;
  toi_da_thang: number | null; chi_cuoi_tuan: boolean; can_xac_nhan: boolean; bat: boolean };

export const MAU_QUA = [
  { ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50_000 },
  { ten: "Phiếu quà AiiCafe 20.000đ", loai: "voucher", diem: 200, menh_gia: 20_000 },
  { ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, chi_cuoi_tuan: true },
  { ten: "Chọn thực đơn bữa tối", loai: "dac_quyen", diem: 50, toi_da_thang: 4 },
  { ten: "Một món đồ chơi nhỏ", loai: "qua", diem: 400, ton_kho: 1 },
  { ten: "Thêm 10.000đ vào heo đất", loai: "tiet_kiem", diem: 100 },
];

function kiemQua(b: Record<string, unknown>) {
  const ten = String(b.ten ?? "").trim().slice(0, 60);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Đặt tên phần thưởng");
  const loai = (LOAI_QUA as readonly string[]).includes(String(b.loai)) ? String(b.loai) : "qua";
  const diem = Math.round(Number(b.diem));
  if (!Number.isInteger(diem) || diem < 1 || diem > 100_000) throw new LoiNghiepVu("diem_sai", "Giá điểm là số nguyên từ 1");
  const menh = loai === "voucher" ? Math.round(Number(b.menh_gia)) : null;
  if (loai === "voucher" && !(menh! >= 1000)) throw new LoiNghiepVu("menh_gia_sai", "Phiếu quà cần mệnh giá");
  const so = (v: unknown) => (v === null || v === undefined || v === "" ? null : Math.max(0, Math.round(Number(v)) || 0));
  return { ten, loai, diem, menh_gia: menh, ton_kho: so(b.ton_kho), toi_da_thang: so(b.toi_da_thang),
    chi_cuoi_tuan: b.chi_cuoi_tuan === true, can_xac_nhan: b.can_xac_nhan === true };
}

export async function taoQua(fam: string, b: Record<string, unknown>) {
  const v = kiemQua(b);
  const id = newId();
  await q(`insert into rewards(id, family_id, ten, loai, diem, menh_gia, ton_kho, toi_da_thang, chi_cuoi_tuan, can_xac_nhan) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, fam, v.ten, v.loai, v.diem, v.menh_gia, v.ton_kho, v.toi_da_thang, v.chi_cuoi_tuan, v.can_xac_nhan]);
  return id;
}

export async function apDungMauQua(fam: string) {
  const co = new Set((await q<{ ten: string }>(`select ten from rewards where family_id = $1`, [fam])).map((x) => x.ten));
  let n = 0;
  for (const m of MAU_QUA) if (!co.has(m.ten)) { await taoQua(fam, m); n++; }
  return n;
}

export async function suaQua(fam: string, id: string, b: Record<string, unknown>) {
  const cu = await one<Qua>(`select * from rewards where id = $1 and family_id = $2`, [id, fam]);
  if (!cu) throw new LoiNghiepVu("khong_thay", "Không thấy phần thưởng", 404);
  const v = kiemQua({ ...cu, ...b });
  await q(`update rewards set ten=$2, diem=$3, menh_gia=$4, ton_kho=$5, toi_da_thang=$6, chi_cuoi_tuan=$7, can_xac_nhan=$8, bat=$9 where id = $1`,
    [id, v.ten, v.diem, v.menh_gia, v.ton_kho, v.toi_da_thang, v.chi_cuoi_tuan, v.can_xac_nhan, b.bat === undefined ? cu.bat : b.bat === true]);
}

async function soLanThang(t: Q, con: string, qua: string, tz: string, now: Date) {
  const ngay = gioDiaPhuong(now, tz).ngay;
  return (await t<{ n: number }>(`select count(*)::int as n from redemptions where child_id = $1 and reward_id = $2 and trang_thai <> 'huy' and created_at >= $3`,
    [con, qua, dauNgayUtc(`${ngay.slice(0, 8)}01`, tz)]))[0].n;
}

/** Cửa hàng của Con: mọi phần thưởng đang bật (hết tồn kho thì ẩn), kèm «Đủ điểm» / «Còn thiếu X điểm». */
export async function cuaHang(con: string) {
  const c = await one<{ family_id: string }>(`select family_id from children where id = $1`, [con]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const du = await soDu(con);
  const ds = await q<Qua>(`select * from rewards where family_id = $1 and bat and (ton_kho is null or ton_kho > 0) order by diem`, [c.family_id]);
  return { soDu: du, qua: ds.map((x) => ({ ...x, du: du >= x.diem, conThieu: Math.max(0, x.diem - du) })) };
}

function maVoucher() {
  const CHU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return "AG" + Array.from({ length: 10 }, () => CHU[randomInt(0, CHU.length)]).join("");
}

/** Con đổi một phần thưởng. → { phieu, trang_thai, voucher? } */
export async function doiQua(con: string, quaId: string, now = new Date()) {
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const x = (await t<Qua>(`select * from rewards where id = $1 and family_id = $2 and bat for update`, [quaId, fam]))[0];
    if (!x) throw new LoiNghiepVu("khong_thay", "Không thấy phần thưởng", 404);
    const f = (await t<{ tz: string; cau_hinh: Record<string, unknown>; quy_voucher: number }>(
      `select tz, cau_hinh, quy_voucher from families where id = $1 for update`, [fam]))[0];
    if (x.ton_kho !== null && x.ton_kho <= 0) throw new LoiNghiepVu("het_hang", "Phần thưởng này đã hết", 409);
    if (x.chi_cuoi_tuan && !laCuoiTuan(gioDiaPhuong(now, f.tz).thu)) throw new LoiNghiepVu("chi_cuoi_tuan", "Phần thưởng này chỉ đổi vào cuối tuần", 409);
    if (x.toi_da_thang && (await soLanThang(t, con, x.id, f.tz, now)) >= x.toi_da_thang)
      throw new LoiNghiepVu("du_thang", `Tháng này con đã đổi đủ ${x.toi_da_thang} lần`, 409);
    const ts = thamSo(f.cau_hinh);
    const laVoucher = x.loai === "voucher";
    const canXacNhan = x.can_xac_nhan || (laVoucher && x.menh_gia! >= ts.voucher_xac_nhan_tu);
    if (laVoucher && !canXacNhan && f.quy_voucher < x.menh_gia!)
      throw new LoiNghiepVu("quy_thieu", "Quỹ phiếu quà của nhà mình chưa đủ — nhờ Ba Mẹ nạp thêm nhé", 409);
    await ghiDiem(t, con, -x.diem, laVoucher ? "voucher" : "doi_qua", `Đổi ${x.ten}`, { ref: x.id });
    if (x.ton_kho !== null) await t(`update rewards set ton_kho = ton_kho - 1 where id = $1`, [x.id]);
    const phieu = newId();
    const tt = laVoucher && !canXacNhan ? "xong" : "giu";       // quà / đặc quyền / tiết kiệm / voucher lớn: chờ Ba Mẹ
    await t(`insert into redemptions(id, child_id, reward_id, ten, loai, diem, trang_thai) values ($1,$2,$3,$4,$5,$6,$7)`,
      [phieu, con, x.id, x.ten, x.loai, x.diem, tt]);
    let voucher: { ma: string; het_han: Date } | undefined;
    if (laVoucher) {
      const ma = maVoucher();
      const het = new Date(now.getTime() + ts.voucher_han_ngay * 86_400_000);
      await t(`insert into vouchers(id, ma, family_id, child_id, redemption_id, menh_gia, diem, trang_thai, het_han) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [newId(), ma, fam, con, phieu, x.menh_gia, x.diem, canXacNhan ? "cho_xac_nhan" : "da_phat_hanh", het]);
      if (!canXacNhan) {
        await t(`update families set quy_voucher = quy_voucher - $2 where id = $1`, [fam, x.menh_gia]);
        await t(`insert into quy_gd(id, family_id, so_tien, loai, ghi_chu, ref) values ($1,$2,$3,'phat_hanh',$4,$5)`, [newId(), fam, -x.menh_gia!, x.ten, ma]);
        voucher = { ma, het_han: het };
      }
    }
    await ghiSuKien(fam, "doi_qua", { ten: x.ten, diem: x.diem, cho_xac_nhan: canXacNhan }, { con }, t);
    return { phieu, trang_thai: canXacNhan ? "cho_xac_nhan" : laVoucher ? "da_phat_hanh" : "cho_trao", voucher,
      quyConLai: laVoucher && !canXacNhan ? f.quy_voucher - x.menh_gia! : f.quy_voucher };
  });
}

async function layPhieu(t: Q, fam: string, phieu: string) {
  const p = (await t<{ id: string; child_id: string; reward_id: string | null; ten: string; loai: string; diem: number; trang_thai: string }>(
    `select r.* from redemptions r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2 for update of r`, [phieu, fam]))[0];
  if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy phiếu quà", 404);
  if (p.trang_thai !== "giu") throw new LoiNghiepVu("da_xu_ly", "Phiếu này đã được xử lý", 409);
  return p;
}

/** Ba Mẹ xác nhận: quà / đặc quyền đã trao; voucher mệnh giá lớn được phát hành (trừ quỹ lúc này). */
export async function xacNhanPhieu(fam: string, phieu: string, nguoi: string) {
  return tx(async (t) => {
    const p = await layPhieu(t, fam, phieu);
    if (p.loai === "voucher") {
      const f = (await t<{ quy_voucher: number }>(`select quy_voucher from families where id = $1 for update`, [fam]))[0];
      const v = (await t<{ ma: string; menh_gia: number }>(`select ma, menh_gia from vouchers where redemption_id = $1`, [p.id]))[0];
      if (f.quy_voucher < v.menh_gia) throw new LoiNghiepVu("quy_thieu", "Quỹ phiếu quà chưa đủ — nạp thêm tại AiiCafe rồi xác nhận lại", 409);
      await t(`update vouchers set trang_thai = 'da_phat_hanh' where redemption_id = $1`, [p.id]);
      await t(`update families set quy_voucher = quy_voucher - $2 where id = $1`, [fam, v.menh_gia]);
      await t(`insert into quy_gd(id, family_id, so_tien, loai, ghi_chu, ref, nguoi) values ($1,$2,$3,'phat_hanh',$4,$5,$6)`, [newId(), fam, -v.menh_gia, p.ten, v.ma, nguoi]);
    }
    await t(`update redemptions set trang_thai = $2, xu_ly_boi = $3, xu_ly_luc = now() where id = $1`, [p.id, p.loai === "voucher" ? "xong" : "da_trao", nguoi]);
    await ghiSuKien(fam, "xac_nhan_qua", { ten: p.ten }, { con: p.child_id, nguoi }, t);
  });
}

/** Ba Mẹ huỷ phiếu đang giữ ⇒ hoàn điểm, trả tồn kho. */
export async function huyPhieu(fam: string, phieu: string, nguoi: string) {
  return tx(async (t) => {
    const p = await layPhieu(t, fam, phieu);
    await khoaCon(t, p.child_id);
    await t(`update redemptions set trang_thai = 'huy', xu_ly_boi = $2, xu_ly_luc = now() where id = $1`, [p.id, nguoi]);
    await ghiDiem(t, p.child_id, p.diem, "hoan", `Hoàn điểm ${p.ten}`, { ref: p.id, nguoi });
    if (p.reward_id) await t(`update rewards set ton_kho = ton_kho + 1 where id = $1 and ton_kho is not null`, [p.reward_id]);
    if (p.loai === "voucher") await t(`update vouchers set trang_thai = 'thu_hoi' where redemption_id = $1`, [p.id]);
    await ghiSuKien(fam, "huy_qua", { ten: p.ten, hoan: p.diem }, { con: p.child_id, nguoi }, t);
  });
}

// ---------------------------------------------------------------- quỹ + quầy AiiCafe

/** Ghi nhận Ba Mẹ nạp quỹ phiếu quà (tiền mặt / chuyển khoản tại AiiCafe — Admin hoặc quầy ghi). */
export async function napQuy(fam: string, soTien: number, ghiChu: string, nguoi: string) {
  const n = Math.round(Number(soTien));
  if (!(n >= 1000 && n <= 50_000_000)) throw new LoiNghiepVu("so_tien_sai", "Số tiền nạp chưa hợp lệ");
  return tx(async (t) => {
    const r = (await t<{ quy_voucher: number }>(`update families set quy_voucher = quy_voucher + $2 where id = $1 returning quy_voucher`, [fam, n]))[0];
    if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
    await t(`insert into quy_gd(id, family_id, so_tien, loai, ghi_chu, nguoi) values ($1,$2,$3,'nap',$4,$5)`, [newId(), fam, n, String(ghiChu ?? "").slice(0, 120), nguoi]);
    await ghiSuKien(fam, "nap_quy", { so_tien: n }, { nguoi }, t);
    return r.quy_voucher;
  });
}

export type KetQuaQuet = { ketQua: "hop_le" | "da_dung" | "het_han" | "chua_phat_hanh" | "thu_hoi" | "khong_thay"; menhGia?: number; dungLuc?: string; tenCon?: string };

/** Quầy quét mã: hợp lệ ⇒ đánh dấu «Đã dùng» NGAY (một lần — hai lượt quét cùng lúc chỉ một lượt hợp lệ). */
export async function quetVoucher(ma: string, quay: string): Promise<KetQuaQuet> {
  const m = String(ma ?? "").trim().toUpperCase();
  const r = (await q<{ menh_gia: number; family_id: string; ten: string }>(
    `update vouchers v set trang_thai = 'da_dung', dung_luc = now(), quay = $2 from children c
     where v.ma = $1 and v.trang_thai = 'da_phat_hanh' and v.het_han > now() and c.id = v.child_id returning v.menh_gia, v.family_id, c.ten`, [m, quay]))[0];
  if (r) {
    await ghiSuKien(r.family_id, "dung_voucher", { ma: m, menh_gia: r.menh_gia, quay });
    return { ketQua: "hop_le", menhGia: r.menh_gia, tenCon: r.ten };
  }
  const v = await one<{ trang_thai: string; het_han: Date; dung_luc: Date | null; menh_gia: number }>(`select trang_thai, het_han, dung_luc, menh_gia from vouchers where ma = $1`, [m]);
  if (!v) return { ketQua: "khong_thay" };
  if (v.trang_thai === "da_dung") return { ketQua: "da_dung", menhGia: v.menh_gia, dungLuc: new Date(v.dung_luc!).toISOString() };
  if (v.trang_thai === "thu_hoi") return { ketQua: "thu_hoi" };
  if (v.trang_thai === "cho_xac_nhan") return { ketQua: "chua_phat_hanh" };
  if (new Date(v.het_han) <= new Date()) {
    await q(`update vouchers set trang_thai = 'het_han' where ma = $1 and trang_thai = 'da_phat_hanh'`, [m]);
    return { ketQua: "het_han", menhGia: v.menh_gia };
  }
  return { ketQua: "khong_thay" };
}

/** Ví quà của Con: voucher còn dùng được / đã dùng / hết hạn + phiếu quà chờ trao. */
export async function viQua(con: string) {
  await q(`update vouchers set trang_thai = 'het_han' where child_id = $1 and trang_thai = 'da_phat_hanh' and het_han <= now()`, [con]);
  return {
    voucher: await q<{ ma: string; menh_gia: number; trang_thai: string; het_han: Date; dung_luc: Date | null }>(
      `select ma, menh_gia, trang_thai, het_han, dung_luc from vouchers where child_id = $1 order by created_at desc limit 50`, [con]),
    phieu: await q<{ id: string; ten: string; loai: string; diem: number; trang_thai: string; created_at: Date }>(
      `select id, ten, loai, diem, trang_thai, created_at from redemptions where child_id = $1 and trang_thai = 'giu' order by created_at desc`, [con]),
  };
}

/** Đối soát (FR-09.02): theo gia đình trong khoảng thời gian — nạp, phát hành, đã dùng, hết hạn. */
export async function doiSoat(fam: string | null, tu: Date, den: Date) {
  return q<{ family_id: string; nap: number; phat_hanh: number; da_dung: number; het_han: number; thu_hoi: number }>(
    `select f.id as family_id,
       coalesce((select sum(so_tien) from quy_gd g where g.family_id = f.id and g.loai = 'nap' and g.created_at between $2 and $3), 0)::int as nap,
       coalesce((select sum(menh_gia) from vouchers v where v.family_id = f.id and v.trang_thai <> 'cho_xac_nhan' and v.created_at between $2 and $3), 0)::int as phat_hanh,
       coalesce((select sum(menh_gia) from vouchers v where v.family_id = f.id and v.trang_thai = 'da_dung' and v.dung_luc between $2 and $3), 0)::int as da_dung,
       coalesce((select sum(menh_gia) from vouchers v where v.family_id = f.id and v.trang_thai = 'het_han' and v.het_han between $2 and $3), 0)::int as het_han,
       coalesce((select sum(menh_gia) from vouchers v where v.family_id = f.id and v.trang_thai = 'thu_hoi' and v.created_at between $2 and $3), 0)::int as thu_hoi
     from families f where ($1::text is null or f.id = $1)`, [fam, tu, den]);
}
