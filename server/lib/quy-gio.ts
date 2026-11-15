// GIỜ CHƠI = SAO (#264, thiết kế chốt 15/11/2026 — lib/so-sao.ts). Bỏ hẳn QUỸ phút miễn phí mỗi ngày (05/11): app / web nhóm «Tính phút»
// (luật giai_tri) trả bằng sao, 1 sao = 1 phút; có sao mới chơi, hết sao thì khoá nhóm «Tính phút» (trừ khi Ba Mẹ cho vay). «Không tính phút»
// (luật hoc) và chế độ «Mở hết» không trừ sao. Không còn «đổi sao lấy giờ», «cho thêm giờ» (⇒ cho vay sao), «ngoại lệ» (#265).
// File giữ tên + hình dạng `Quy` để agent / app cũ đang chạy đọc đúng tới khi bản mới phát hành:
//   conPhut = sao tiêu được (= phút còn chơi) · daDung = phút «Tính phút» đã dùng hôm nay · quyNgayPhut = 0 · themPhut = conPhut + daDung
//   (agent cũ tính «còn» = ngayPhut + themPhut − daDung − phút máy đếm thêm sau lần đồng bộ ⇒ đúng bằng số sao còn lại).
// Giờ ngủ / giờ học còn ở đây cho tới khi #262 gỡ (không thuộc phạm vi sổ sao).
import { q, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { dangKhoa, lichCua, thamSo, type GioHoc, type Lich, type ThamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan, phutCua, trongKhung, type Khung } from "./gio.ts";
import { khoaSo } from "./luat-app.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { choVay, hoanTacVay, phutDaTruHomNay, trangThaiSao, type TrangThaiSao } from "./so-sao.ts";

/** 1 sao = 1 phút (giữ tên hàm cũ cho nơi gọi cũ). */
export const saoChoPhut = (_ts: unknown, phut: number) => Math.ceil(phut);
export const phutChoSao = (_ts: unknown, sao: number) => Math.max(0, Math.floor(sao));

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

export type Quy = {
  ngay: string; cuoiTuan: boolean;
  /** (cũ, giữ tương thích) quỹ ngày = 0 · themPhut = conPhut + daDung · doiSaoPhut = 0 · daDung = phút «Tính phút» đã dùng hôm nay · conPhut = sao tiêu được */
  quyNgayPhut: number; themPhut: number; doiSaoPhut: number; daDung: number; conPhut: number;
  tongPhut: number;
  dangNgu: boolean; dangHoc: boolean; khoa: boolean;
  gioNgu: Khung; gioHoc: GioHoc | null;
  /** phút tới giờ ngủ kế tiếp / tới khi giờ học hôm nay bắt đầu (null = hôm nay không có giờ học phía trước) */
  phutToiNgu: number; phutToiHoc: number | null;
  /** (cũ) «10 sao = 10 phút» — luôn 1:1 */ tyLe: { sao: 10; phut: number };
  /** (cũ) đổi sao lấy giờ — đã bỏ (sao chính là phút) */ doiSao: { bat: boolean; toiDaNgay: number; conDoiDuoc: number };
  /** (cũ) được xin thêm giờ — nay luôn true: lời xin thêm giờ là lời xin vay sao */ choXinThem: boolean;
  /** 15/11: sổ sao — số dư (âm được), nợ, phút còn chơi (= sao tiêu được), hết sao */ soSao: TrangThaiSao;
  /** 15/11: phút đã trừ sao hôm nay (1 sao = 1 phút) */ phutTruHomNay: number;
};

/** «Giờ chơi» của Con lúc này — một chỗ tính cho Policy agent, màn Con, khay Windows, app Ba Mẹ. Không còn quỹ ngày: còn = số sao tiêu được. */
export async function quyHomNay(con: string, now = new Date(), t: Q = q, b0?: BoiCanhCon): Promise<Quy> {
  const b = b0 ?? (await boiCanhCon(con, t));
  const g = gioDiaPhuong(now, b.tz);
  const [st, dung, tru] = await Promise.all([trangThaiSao(con, t), phutDaDung(t, con, b.fam, g.ngay, b.tz), phutDaTruHomNay(t, con, b.tz, now)]);
  // daDung ≥ phút đã trừ sao (phút dùng lúc «Mở hết» / trước khi có sao vẫn tính vào «đã dùng» để agent cũ đếm đúng phần còn)
  const daDung = Math.max(dung, tru);
  const hoc = b.lich.hoc ?? null;
  const dangHoc = trongGioHoc(hoc, g.thu, g.phut);
  const phutToiHoc = hoc && hoc.thu.includes(g.thu) && !dangHoc && phutCua(hoc.tu) > g.phut ? phutCua(hoc.tu) - g.phut : null;
  return {
    ngay: g.ngay, cuoiTuan: laCuoiTuan(g.thu),
    quyNgayPhut: 0, themPhut: st.phutCon + daDung, doiSaoPhut: 0, daDung, conPhut: st.phutCon, tongPhut: st.phutCon + daDung,
    dangNgu: trongKhung(g.phut, b.lich.ngu), dangHoc, khoa: dangKhoa(b.cfg, now),
    gioNgu: b.lich.ngu, gioHoc: hoc, phutToiNgu: toiMoc(g.phut, b.lich.ngu.tu), phutToiHoc,
    tyLe: { sao: 10, phut: 10 },
    doiSao: { bat: false, toiDaNgay: 0, conDoiDuoc: 0 },
    choXinThem: true,
    soSao: st, phutTruHomNay: tru,
  };
}

/** (cũ) «Đổi sao lấy giờ» — đã bỏ (#264: sao chính là phút). Agent / app cũ gọi ⇒ trả thành công mà không trừ gì: phút còn = số sao. */
export async function doiSaoLayGio(con: string, _phutVao: unknown, _mayId: string | null = null, now = new Date()) {
  const qy = await quyHomNay(con, now);
  return { id: null, phut: 0, sao: 0, soDu: qy.soSao.phutCon, conPhut: qy.conPhut, daBo: true,
    cau: "Không cần đổi nữa — 1 sao = 1 phút chơi" };
}

/** (cũ) Ba Mẹ «Cho thêm giờ N phút» ⇒ #265: cho vay N sao (1 sao = 1 phút). Trả thêm `quy` cho app cũ. */
export async function baMeThemGio(fam: string, con: string, phutVao: unknown, nguoi: string, now = new Date()) {
  const v = await choVay(fam, con, phutVao, nguoi, { mucDich: "choi" }, undefined, now);
  return { ...v, phut: v.soSao, quy: await quyHomNay(con, now) };
}

/** (cũ) «Hoàn tác» cho thêm giờ ⇒ hoàn tác khoản vay (id = id khoản vay trả về lúc cho). */
export const hoanTacThemGio = (fam: string, id: string, nguoi: string, now = new Date()) => hoanTacVay(fam, id, nguoi, now);

/** Cài đặt «Giờ chơi của <Con>» (bm2-gio — màn bỏ ở thiết kế 15/11): còn giờ ngủ / giờ học (#262 lo) + số sao; các ô quỹ / đổi sao trả giá trị cũ cố định. */
export async function gioChoiCua(fam: string, con: string, now = new Date()) {
  const b = await boiCanhCon(con);
  if (b.fam !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return {
    quyNgayThuong: 0, quyCuoiTuan: 0, phut10Sao: 10, doiSaoBat: false, doiSaoToiDaNgay: 0, choXinThemGio: true, ngoaiLeToiDaPhut: 0,
    gioNgu: b.lich.ngu, gioHoc: b.lich.hoc, homNay: await quyHomNay(con, now, q, b),
  };
}

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lưu giờ ngủ / giờ học (chỉ các khoá gửi lên). `gioHoc: null` = bỏ giờ học. Ô quỹ / đổi sao / ngoại lệ (cũ) gửi lên bị bỏ qua. */
export async function datGioChoi(fam: string, con: string, b: Record<string, unknown>, nguoi: string) {
  const cu = await boiCanhCon(con);
  if (cu.fam !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
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
  if (Object.keys(lich).length) {
    await q(`update children set lich = coalesce(lich, '{}'::jsonb) || $2::text::jsonb where id = $1`, [con, JSON.stringify(lich)]);
    await ghiSuKien(fam, "doi_gio_choi", lich, { con, nguoi });
  }
  return gioChoiCua(fam, con);
}
