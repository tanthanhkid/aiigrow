// QUỸ GIỜ CHƠI + SAO (thiết kế chốt 05/11, docs/KE-HOACH-KHOP-THIET-KE-0511.md L1–L3). Thay mô hình cũ «phiên điểm có giá theo nhóm app,
// trần ngày/tuần, khung giờ chơi»:
//   • Mỗi ngày Con có một QUỸ phút chơi (ngày thường / T7–CN riêng — quy_ngay_thuong, quy_cuoi_tuan). MỌI app/web Giải trí Ba Mẹ cho phép
//     dùng chung quỹ; phút dùng = phút Giải trí thật trên mọi máy (usage + web_nhat_ky + phiên cũ) — app Học không tính.
//   • Quỹ hôm nay = quỹ ngày + phút cộng thêm hôm nay (grants: xin — Ba Mẹ duyệt lời xin · doi_sao — Con tự đổi sao · ba_me — Ba Mẹ bấm
//     «Cho thêm giờ»). Sao = điểm cũ (cột `diem` giữ tên): 10 sao = `phut_10_sao` phút (mặc định 10).
//   • Giờ ngủ / Ba Mẹ khoá / giờ học: KHÔNG thêm giờ được — Con chỉ «Xin Ba Mẹ mở ngoại lệ» (1 app hoặc cả máy, có hạn phút, không trừ quỹ,
//     không trừ sao) — grants.nguon = ngoai_le (lib/yeu-cau.ts › dongY).
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { dangKhoa, lichCua, sachCauHinh, thamSo, type GioHoc, type Lich, type ThamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan, phutCua, trongKhung, type Khung } from "./gio.ts";
import { ghiDiem, khoaCon, soDu } from "./vi.ts";
import { khoaSo } from "./luat-app.ts";
import { ghiSuKien } from "./nhat-ky.ts";

/** Đổi `phut` phút chơi cần bao nhiêu sao (làm tròn lên). */
export const saoChoPhut = (ts: Pick<ThamSo, "phut_10_sao">, phut: number) => Math.ceil((phut * 10) / ts.phut_10_sao);
/** `sao` sao đổi được bao nhiêu phút (làm tròn xuống). */
export const phutChoSao = (ts: Pick<ThamSo, "phut_10_sao">, sao: number) => Math.floor((Math.max(0, sao) * ts.phut_10_sao) / 10);

export const quyNgayCua = (ts: Pick<ThamSo, "quy_ngay_thuong" | "quy_cuoi_tuan">, thu: number) => (laCuoiTuan(thu) ? ts.quy_cuoi_tuan : ts.quy_ngay_thuong);

/** Đang trong giờ học lúc (thu, phut)? Khung qua nửa đêm tính theo ngày bắt đầu (hiếm — giờ học thường trong ngày). */
export function trongGioHoc(hoc: GioHoc | null | undefined, thu: number, phut: number) {
  return !!hoc && hoc.thu.includes(thu) && trongKhung(phut, hoc);
}

/** Phút từ `phut` tới mốc `hhmm` kế tiếp (0 < x ≤ 1440). */
const toiMoc = (phut: number, hhmm: string) => ((phutCua(hhmm) - phut + 1440) % 1440) || 1440;

export type BoiCanhCon = { fam: string; tz: string; ts: ThamSo; lich: Lich; cfg: Record<string, unknown> };

export async function boiCanhCon(con: string, t: Q = q): Promise<BoiCanhCon> {
  const r = (await t<{ family_id: string; tz: string; fcfg: Record<string, unknown>; ccfg: Record<string, unknown>; lich: Record<string, unknown> }>(
    `select c.family_id, f.tz, f.cau_hinh as fcfg, c.cau_hinh as ccfg, c.lich from children c join families f on f.id = c.family_id where c.id = $1`, [con]))[0];
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return { fam: r.family_id, tz: r.tz, ts: thamSo(r.fcfg, r.ccfg), lich: lichCua(r.lich as never), cfg: r.ccfg ?? {} };
}

/** Phút Giải trí đã dùng hôm nay trên mọi máy. Mỗi máy lấy LỚN HƠN của (phút phiên chơi cũ mở trên máy đó) và (phút app Giải trí agent báo
 *  + phút trang web Giải trí) — cùng một lần chơi có thể vừa nằm trong phiên vừa nằm trong usage, nên không cộng hai nguồn của một máy. */
export async function phutDaDung(t: Q, con: string, fam: string, ngay: string, tz: string): Promise<number> {
  const tu = dauNgayUtc(ngay, tz);
  const phien = await t<{ may: string; p: number }>(
    `select coalesce(device_id, '') as may, coalesce(sum(phut_dung), 0)::real as p from play_sessions where child_id = $1 and bat_dau >= $2 group by 1`, [con, tu]);
  const app = await t<{ may: string; p: number }>(
    `select device_id as may, coalesce(sum(phut), 0)::real as p from usage where child_id = $1 and ngay = $2 and loai = 'giai_tri' group by 1`, [con, ngay]);
  const web = await t<{ may: string; ten_mien: string; giay: number }>(
    `select device_id as may, ten_mien, giay from web_nhat_ky where child_id = $1 and ngay = $2 and giay > 0`, [con, ngay]);
  const theoMay = new Map<string, { phien: number; khac: number }>();
  const lay = (m: string) => { let x = theoMay.get(m); if (!x) theoMay.set(m, (x = { phien: 0, khac: 0 })); return x; };
  for (const r of phien) lay(r.may).phien += Number(r.p);
  for (const r of app) lay(r.may).khac += Number(r.p);
  if (web.length) {
    // luật web Giải trí của Con: luật riêng Con thắng luật cả nhà; tên miền con khớp luật tên miền cha (như luat-app.ts › phanLoai)
    const luat = await t<{ child_id: string; muc: string; loai: string }>(
      `select child_id, muc, loai from app_rules where family_id = $1 and child_id in ('', $2) and (het is null or het > now())`, [fam, con]);
    const loai = new Map<string, string>();
    for (const l of luat.sort((a, b) => (a.child_id ? 1 : 0) - (b.child_id ? 1 : 0))) loai.set(l.muc, l.loai);
    for (const r of web) {
      const k = khoaSo(r.ten_mien).find((x) => loai.has(x));
      if (k && loai.get(k) === "giai_tri") lay(r.may).khac += Number(r.giay) / 60;
    }
  }
  let tong = 0;
  for (const x of theoMay.values()) tong += Math.max(x.phien, x.khac);
  return Math.round(tong * 10) / 10;
}

/** Phút cộng vào quỹ hôm nay (mọi nguồn trừ ngoại lệ; cửa sổ mở cũ `cua_so_den` không tính) + riêng phần Con tự đổi sao. */
async function phutThem(t: Q, con: string, ngay: string) {
  return (await t<{ them: number; doi: number }>(
    `select coalesce(sum(phut), 0)::int as them, coalesce(sum(phut) filter (where nguon = 'doi_sao'), 0)::int as doi
     from grants where child_id = $1 and ngay = $2 and cua_so_den is null and coalesce(nguon, '') <> 'ngoai_le'`, [con, ngay]))[0];
}

export type NgoaiLeMo = { id: string; den: string; muc: string | null; nhom: string };

/** Ngoại lệ đang mở của Con (hạn > now). `muc` null = cả máy. `nhom`: nhóm máy được mở (chuyen-doi.ts › nhomCuaSo). */
export async function ngoaiLeDangMo(con: string, now = new Date(), t: Q = q): Promise<NgoaiLeMo[]> {
  const r = await t<{ id: string; den: Date; muc: string | null; nhom: string | null }>(
    `select id, den, muc, nhom_cua_so as nhom from grants where child_id = $1 and nguon = 'ngoai_le' and den > $2 order by den`, [con, now]);
  return r.map((x) => ({ id: x.id, den: new Date(x.den).toISOString(), muc: x.muc, nhom: x.nhom ?? "may_tinh" }));
}

export type Quy = {
  ngay: string; cuoiTuan: boolean;
  /** quỹ của ngày (theo thứ) · phút cộng thêm hôm nay (gồm đổi sao) · phần đổi sao · phút Giải trí đã dùng · còn lại (≥ 0, làm tròn xuống) */
  quyNgayPhut: number; themPhut: number; doiSaoPhut: number; daDung: number; conPhut: number;
  tongPhut: number;
  dangNgu: boolean; dangHoc: boolean; khoa: boolean;
  gioNgu: Khung; gioHoc: GioHoc | null;
  /** phút tới giờ ngủ kế tiếp / tới khi giờ học hôm nay bắt đầu (null = hôm nay không có giờ học phía trước) */
  phutToiNgu: number; phutToiHoc: number | null;
  /** «10 sao = X phút» */ tyLe: { sao: 10; phut: number };
  doiSao: { bat: boolean; toiDaNgay: number; conDoiDuoc: number };
  choXinThem: boolean;
};

/** Quỹ giờ chơi hôm nay của Con — một chỗ tính cho Policy agent, màn Con, khay Windows, app Ba Mẹ. */
export async function quyHomNay(con: string, now = new Date(), t: Q = q, b0?: BoiCanhCon): Promise<Quy> {
  const b = b0 ?? (await boiCanhCon(con, t));
  const g = gioDiaPhuong(now, b.tz);
  const quyNgay = quyNgayCua(b.ts, g.thu);
  const th = await phutThem(t, con, g.ngay);
  const daDung = await phutDaDung(t, con, b.fam, g.ngay, b.tz);
  const tong = quyNgay + th.them;
  const hoc = b.lich.hoc ?? null;
  const dangHoc = trongGioHoc(hoc, g.thu, g.phut);
  const phutToiHoc = hoc && hoc.thu.includes(g.thu) && !dangHoc && phutCua(hoc.tu) > g.phut ? phutCua(hoc.tu) - g.phut : null;
  return {
    ngay: g.ngay, cuoiTuan: laCuoiTuan(g.thu),
    quyNgayPhut: quyNgay, themPhut: th.them, doiSaoPhut: th.doi, daDung, conPhut: Math.max(0, Math.floor(tong - daDung)), tongPhut: tong,
    dangNgu: trongKhung(g.phut, b.lich.ngu), dangHoc, khoa: dangKhoa(b.cfg, now),
    gioNgu: b.lich.ngu, gioHoc: hoc, phutToiNgu: toiMoc(g.phut, b.lich.ngu.tu), phutToiHoc,
    tyLe: { sao: 10, phut: b.ts.phut_10_sao },
    doiSao: { bat: b.ts.doi_sao_bat === 1, toiDaNgay: b.ts.doi_sao_toi_da_ngay, conDoiDuoc: Math.max(0, b.ts.doi_sao_toi_da_ngay - th.doi) },
    choXinThem: b.ts.cho_xin_them_gio === 1,
  };
}

/** Lúc này Con có được thêm giờ không (đổi sao / xin thêm giờ)? Giờ ngủ / Ba Mẹ khoá / giờ học ⇒ chỉ xin ngoại lệ (thiết kế con-het-gio). */
export function lyDoKhongThemGio(qy: Pick<Quy, "dangNgu" | "khoa" | "dangHoc">): { ma: string; cau: string } | null {
  if (qy.khoa) return { ma: "ba_me_khoa", cau: "Ba Mẹ đang khoá máy — con xin Ba Mẹ mở ngoại lệ nhé" };
  if (qy.dangNgu) return { ma: "gio_ngu", cau: "Đến giờ ngủ rồi — con chỉ xin Ba Mẹ mở ngoại lệ được thôi" };
  if (qy.dangHoc) return { ma: "gio_hoc", cau: "Đang giờ học — con xin Ba Mẹ mở ngoại lệ nhé" };
  return null;
}

/** Con tự đổi sao lấy phút chơi (con-xin «Đổi sao lấy giờ»): trừ sao, phút cộng vào quỹ hôm nay. */
export async function doiSaoLayGio(con: string, phutVao: unknown, mayId: string | null = null, now = new Date()) {
  const phut = Math.round(Number(phutVao));
  if (!Number.isInteger(phut) || phut < 1 || phut > 240) throw new LoiNghiepVu("phut_sai", "Chọn số phút muốn đổi (1–240)");
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const b = await boiCanhCon(con, t);
    if (b.ts.doi_sao_bat !== 1) throw new LoiNghiepVu("khong_cho_doi", "Ba Mẹ chưa bật đổi sao lấy giờ — con xin Ba Mẹ thêm giờ nhé", 409);
    const qy = await quyHomNay(con, now, t, b);
    const chan = lyDoKhongThemGio(qy);
    if (chan) throw new LoiNghiepVu("khong_them_gio", chan.cau, 409);
    if (phut > qy.doiSao.conDoiDuoc)
      throw new LoiNghiepVu("vuot_toi_da_doi", qy.doiSao.conDoiDuoc > 0 ? `Hôm nay con còn đổi được ${qy.doiSao.conDoiDuoc} phút thôi`
        : `Hôm nay con đã đổi đủ ${qy.doiSao.toiDaNgay} phút rồi`, 409);
    const sao = saoChoPhut(b.ts, phut);
    const du = await soDu(con, t);
    if (du < sao) throw new LoiNghiepVu("khong_du_sao", `Đổi ${phut} phút cần ${sao} sao — con có ${du} sao, còn thiếu ${sao - du} sao`, 409);
    const id = newId();
    await ghiDiem(t, con, -sao, "doi_gio", `Đổi ${sao} sao lấy ${phut} phút chơi`, { ref: id });
    await t(`insert into grants(id, child_id, phut, ngoai_le, ngay, nguon) values ($1,$2,$3,false,$4,'doi_sao')`, [id, con, phut, qy.ngay]);
    await ghiSuKien(fam, "doi_sao_lay_gio", { sao, phut }, { con, may: mayId }, t);
    return { id, phut, sao, soDu: du - sao, conPhut: qy.conPhut + phut };
  });
}

/** Ba Mẹ bấm «Cho thêm giờ» (Trang chủ / bảng trượt, bm-hang-ngay «Cho thêm giờ» 15/30/60): chỉ hôm nay, cộng vào quỹ. */
export async function baMeThemGio(fam: string, con: string, phutVao: unknown, nguoi: string, now = new Date()) {
  const phut = Math.round(Number(phutVao));
  if (!Number.isInteger(phut) || phut < 5 || phut > 240) throw new LoiNghiepVu("phut_sai", "Chọn số phút cho thêm (5–240)");
  return tx(async (t) => {
    if ((await khoaCon(t, con)) !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    const b = await boiCanhCon(con, t);
    const ngay = gioDiaPhuong(now, b.tz).ngay;
    const id = newId();
    await t(`insert into grants(id, child_id, phut, ngoai_le, ngay, nguon, nguoi, created_at) values ($1,$2,$3,false,$4,'ba_me',$5,$6)`, [id, con, phut, ngay, nguoi, now]);
    await ghiSuKien(fam, "them_gio", { phut }, { con, nguoi }, t);
    const qy = await quyHomNay(con, now, t, b);
    return { id, phut, quy: qy };
  });
}

const HOAN_TAC_THEM_GIAY = 60;

/** «Hoàn tác» ngay sau «Cho thêm giờ» / duyệt thêm giờ (bm-duyet «Vừa cho thêm giờ · Hoàn tác»): xoá phút vừa cho, trong 60 giây, đúng người cho. */
export async function hoanTacThemGio(fam: string, grantId: string, nguoi: string, now = new Date()) {
  return tx(async (t) => {
    const g = (await t<{ id: string; child_id: string; phut: number; nguon: string | null; nguoi: string | null; created_at: Date; request_id: string | null }>(
      `select g.id, g.child_id, g.phut, g.nguon, g.nguoi, g.created_at, g.request_id from grants g join children c on c.id = g.child_id
       where g.id = $1 and c.family_id = $2 for update of g`, [grantId, fam]))[0];
    if (!g) throw new LoiNghiepVu("khong_thay", "Không thấy lần cho thêm giờ này", 404);
    if (!["ba_me", "xin"].includes(g.nguon ?? "") || g.nguoi !== nguoi || now.getTime() - new Date(g.created_at).getTime() > HOAN_TAC_THEM_GIAY * 1000)
      throw new LoiNghiepVu("het_hoan_tac", "Đã quá thời gian hoàn tác", 409);
    await khoaCon(t, g.child_id);
    await t(`delete from grants where id = $1`, [g.id]);
    if (g.request_id) {
      // duyệt lời xin rồi hoàn tác ⇒ trả lại đúng trạng thái trước khi duyệt: hoàn sao đã trừ («Trừ sao»), bỏ mở tạm lúc khoá, bỏ lượt đếm ngoại lệ,
      // lời xin về «chờ» để Ba Mẹ trả lời lại (duyệt lại thì trừ lại đúng một lần)
      // phần đã trừ RÒNG cho lời xin này (trừ đi các lần hoàn trước) — duyệt / hoàn tác nhiều lần không hoàn dư
      const tru = (await t<{ s: number }>(`select coalesce(-sum(delta), 0)::int as s from points where child_id = $1 and ref = $2 and loai in ('doi_gio', 'hoan')`,
        [g.child_id, g.request_id]))[0].s;
      if (tru > 0) await ghiDiem(t, g.child_id, tru, "hoan", `Hoàn ${tru} sao (hoàn tác thêm giờ)`, { ref: g.request_id, nguoi });
      const moTam = (await t(`select 1 from events where child_id = $1 and loai = 'mo_tam' and chi_tiet->>'yeu_cau' = $2`, [g.child_id, g.request_id])).length;
      if (moTam) await t(`update children set cau_hinh = cau_hinh - 'khoa_mo_tam_den' where id = $1`, [g.child_id]);
      await t(`delete from exceptions where child_id = $1 and ref = $2`, [g.child_id, g.request_id]);
      await t(`update requests set trang_thai = 'cho', nguoi_duyet = null, xu_ly_luc = null, tru_diem = null, ngoai_le = false where id = $1 and trang_thai = 'dong_y'`,
        [g.request_id]);
    }
    await ghiSuKien(fam, "hoan_tac_them_gio", { phut: g.phut }, { con: g.child_id, nguoi }, t);
    return { ok: true };
  });
}

/** Cài đặt «Giờ chơi của <Con>» (bm2-gio): quỹ ngày thường / cuối tuần, tỷ lệ sao, giờ ngủ, giờ học, khi hết giờ. */
export async function gioChoiCua(fam: string, con: string, now = new Date()) {
  const b = await boiCanhCon(con);
  if (b.fam !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return {
    quyNgayThuong: b.ts.quy_ngay_thuong, quyCuoiTuan: b.ts.quy_cuoi_tuan, phut10Sao: b.ts.phut_10_sao,
    doiSaoBat: b.ts.doi_sao_bat === 1, doiSaoToiDaNgay: b.ts.doi_sao_toi_da_ngay, choXinThemGio: b.ts.cho_xin_them_gio === 1,
    ngoaiLeToiDaPhut: b.ts.ngoai_le_toi_da_phut,
    gioNgu: b.lich.ngu, gioHoc: b.lich.hoc, homNay: await quyHomNay(con, now, q, b),
  };
}

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lưu «Giờ chơi» — chỉ các khoá gửi lên; tham số kẹp min–max như mọi cấu hình (cau-hinh.ts). `gioHoc: null` = bỏ giờ học. */
export async function datGioChoi(fam: string, con: string, b: Record<string, unknown>, nguoi: string) {
  const cu = await boiCanhCon(con);
  if (cu.fam !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const cfg: Record<string, number> = {};
  // ô bỏ trống ("") = giữ nguyên, không lưu thành 0
  const so = (k: string, v: unknown) => { if ((typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isFinite(Number(v))) cfg[k] = Number(v); };
  const bat = (k: string, v: unknown) => { if (typeof v === "boolean") cfg[k] = v ? 1 : 0; };
  so("quy_ngay_thuong", b.quyNgayThuong); so("quy_cuoi_tuan", b.quyCuoiTuan); so("phut_10_sao", b.phut10Sao);
  so("doi_sao_toi_da_ngay", b.doiSaoToiDaNgay); so("ngoai_le_toi_da_phut", b.ngoaiLeToiDaPhut);
  bat("doi_sao_bat", b.doiSaoBat); bat("cho_xin_them_gio", b.choXinThemGio);
  const moi = sachCauHinh(cfg);
  const lich: Record<string, unknown> = {};
  const ngu = b.gioNgu as Khung | undefined;
  if (ngu !== undefined) {
    if (!ngu || !GIO.test(String(ngu.tu)) || !GIO.test(String(ngu.den)) || ngu.tu === ngu.den) throw new LoiNghiepVu("gio_sai", "Giờ ngủ chưa đúng (HH:MM)");
    lich.ngu = { tu: ngu.tu, den: ngu.den };
  }
  if (b.gioHoc !== undefined) {
    if (b.gioHoc === null) lich.hoc = null;
    else {
      const h = lichCua({ hoc: b.gioHoc as GioHoc }).hoc;
      if (!h) throw new LoiNghiepVu("gio_sai", "Giờ học chưa đúng (HH:MM, chọn ít nhất một ngày)");
      lich.hoc = h;
    }
  }
  await q(`update children set cau_hinh = cau_hinh || $2::text::jsonb, lich = coalesce(lich, '{}'::jsonb) || $3::text::jsonb where id = $1`,
    [con, JSON.stringify(moi), JSON.stringify(lich)]);
  await ghiSuKien(fam, "doi_gio_choi", { ...moi, ...lich }, { con, nguoi });
  return gioChoiCua(fam, con);
}
