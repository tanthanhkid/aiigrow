// GIỜ CHƠI = SAO (#264, thiết kế chốt 15/11/2026 — lib/so-sao.ts). Bỏ hẳn QUỸ phút miễn phí mỗi ngày (05/11): app / web nhóm «Tính phút»
// (luật giai_tri) trả bằng sao, 1 sao = 1 phút; có sao mới chơi, hết sao thì khoá nhóm «Tính phút» (trừ khi Ba Mẹ cho vay). «Không tính phút»
// (luật hoc) và chế độ «Mở hết» không trừ sao. Không còn «đổi sao lấy giờ», «cho thêm giờ» (⇒ cho vay sao), «ngoại lệ» (#265).
// File giữ tên + hình dạng `Quy` để agent / app cũ đang chạy đọc đúng tới khi bản mới phát hành:
//   conPhut = sao tiêu được (= phút còn chơi) · daDung = phút «Tính phút» đã dùng hôm nay · quyNgayPhut = 0 · themPhut = conPhut + daDung
//   (agent cũ tính «còn» = ngayPhut + themPhut − daDung − phút máy đếm thêm sau lần đồng bộ ⇒ đúng bằng số sao còn lại).
// #258 (15/11): bỏ giờ ngủ / giờ học — lichCua luôn trả giờ ngủ «tắt» (tu = den) và giờ học null; các trường cũ (dangNgu, dangHoc, gioNgu,
// gioHoc, phutToiNgu, phutToiHoc) giữ hình dạng cho agent / app cũ: false / null / 1440.
import { coDemYeuCau, one, q, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { dangKhoa, lichCua, thamSo, type GioHoc, type Lich, type ThamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan, phutCua, trongKhung, type Khung } from "./gio.ts";
import { khoaSo } from "./luat-app.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { cauSao, choVay, hoanTacVay, trangThaiVaDaTru, type TrangThaiSao } from "./so-sao.ts";
import { cauHinhCua, gioiHanCua, phanGhi, type GioiHanChoi } from "./gioi-han-choi.ts";

/** 1 sao = 1 phút (giữ tên hàm cũ cho nơi gọi cũ). */
export const saoChoPhut = (_ts: unknown, phut: number) => Math.ceil(phut);
export const phutChoSao = (_ts: unknown, sao: number) => Math.max(0, Math.floor(sao));

/** Đang trong giờ học lúc (thu, phut)? Khung qua nửa đêm tính theo ngày bắt đầu (hiếm — giờ học thường trong ngày). */
export function trongGioHoc(hoc: GioHoc | null | undefined, thu: number, phut: number) {
  return !!hoc && hoc.thu.includes(thu) && trongKhung(phut, hoc);
}

/** Phút từ `phut` tới mốc `hhmm` kế tiếp (0 < x ≤ 1440). */
const toiMoc = (phut: number, hhmm: string) => ((phutCua(hhmm) - phut + 1440) % 1440) || 1440;
/** Phút tới giờ ngủ — giờ ngủ «tắt» (tu = den, #258) ⇒ 1440 (không có mốc nào). */
const toiNgu = (phut: number, k: Khung) => (k.tu === k.den ? 1440 : toiMoc(phut, k.tu));

export type BoiCanhCon = { fam: string; tz: string; ts: ThamSo; lich: Lich; cfg: Record<string, unknown>; moHet?: boolean };

export async function boiCanhCon(con: string, t: Q = q): Promise<BoiCanhCon> {
  // trong dong-bo / nhip (t = q): hai đọc theo id đã có sẵn trong bộ nhớ đệm yêu cầu, khỏi một câu join nữa
  if (t === q && coDemYeuCau()) {
    const c = await one<{ family_id: string; cau_hinh: Record<string, unknown>; lich: Record<string, unknown>; che_do_chan: string | null }>(`select * from children where id = $1`, [con]);
    if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    const f = await one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select * from families where id = $1`, [c.family_id]);
    if (!f) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    return { fam: c.family_id, tz: f.tz, ts: thamSo(f.cau_hinh, c.cau_hinh), lich: lichCua(c.lich as never), cfg: c.cau_hinh ?? {}, moHet: c.che_do_chan === "mo_het" };
  }
  const r = (await t<{ family_id: string; tz: string; fcfg: Record<string, unknown>; ccfg: Record<string, unknown>; lich: Record<string, unknown>; che_do_chan: string | null }>(
    `select c.family_id, f.tz, f.cau_hinh as fcfg, c.cau_hinh as ccfg, c.lich, c.che_do_chan from children c join families f on f.id = c.family_id where c.id = $1`, [con]))[0];
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return { fam: r.family_id, tz: r.tz, ts: thamSo(r.fcfg, r.ccfg), lich: lichCua(r.lich as never), cfg: r.ccfg ?? {}, moHet: r.che_do_chan === "mo_het" };
}

export const SQL_PHUT_DA_DUNG = `select 'phien' as k, coalesce(device_id, '') as may, coalesce(sum(phut_dung), 0)::real as p, null::text as ten_mien, null::real as giay
       from play_sessions where child_id = $1 and bat_dau >= $2 group by 1, 2
     union all
     select 'app', device_id, coalesce(sum(phut), 0)::real, null, null from usage where child_id = $1 and ngay = $3 and loai = 'giai_tri' group by 1, 2
     union all
     select 'web', device_id, 0, ten_mien, giay from web_nhat_ky where child_id = $1 and ngay = $3 and giay > 0`;

/** Phút Giải trí đã dùng hôm nay trên mọi máy. Mỗi máy lấy LỚN HƠN của (phút phiên chơi cũ mở trên máy đó) và (phút app Giải trí agent báo
 *  + phút trang web Giải trí) — cùng một lần chơi có thể vừa nằm trong phiên vừa nằm trong usage, nên không cộng hai nguồn của một máy. */
export async function phutDaDung(t: Q, con: string, fam: string, ngay: string, tz: string): Promise<number> {
  const tu = dauNgayUtc(ngay, tz);
  // ba nguồn (phiên · app · web) gộp một câu UNION ALL — trước đây 3 vòng tới DB mỗi lượt dong-bo / nhip
  const gop = await t<{ k: string; may: string; p: number; ten_mien: string | null; giay: number | null }>(SQL_PHUT_DA_DUNG, [con, tu, ngay]);
  const phien = gop.filter((x) => x.k === "phien"), app = gop.filter((x) => x.k === "app");
  const web = gop.filter((x) => x.k === "web").map((x) => ({ may: x.may, ten_mien: x.ten_mien ?? "", giay: Number(x.giay) }));
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
  /** #302: giới hạn ngày + mỗi lượt (lib/gioi-han-choi.ts). conPhut ở trên ĐÃ kẹp theo giới hạn: min(sao tiêu được, còn trong ngày, còn trong lượt),
   *  0 khi đang nghỉ / hết giới hạn ngày ⇒ mọi nơi khoá theo conPhut (agent cũ, phiên, khay) khoá luôn theo giới hạn. */
  gioiHan: GioiHanChoi;
};

/** «Giờ chơi» của Con lúc này — một chỗ tính cho Policy agent, màn Con, khay Windows, app Ba Mẹ. Không còn quỹ ngày: còn = số sao tiêu được. */
export async function quyHomNay(con: string, now = new Date(), t: Q = q, b0?: BoiCanhCon): Promise<Quy> {
  const b = b0 ?? (await boiCanhCon(con, t));
  const g = gioDiaPhuong(now, b.tz);
  const [{ st, tru }, dung, gh0] = await Promise.all([trangThaiVaDaTru(t, con, b.tz, now), phutDaDung(t, con, b.fam, g.ngay, b.tz),
    gioiHanCua(t, con, b.cfg, b.tz, { moHet: !!b.moHet }, now)]);
  // daDung ≥ phút đã trừ sao (phút dùng lúc «Mở hết» / trước khi có sao vẫn tính vào «đã dùng» để agent cũ đếm đúng phần còn)
  const daDung = Math.max(dung, tru);
  // lý do khoá cho máy Con: hết giới hạn ngày THẮNG hết sao (có sao hôm nay cũng không chơi được); đang nghỉ CHỈ khi còn sao thật —
  // hết sao thì máy nói «Hết sao rồi» + «Làm nhiệm vụ» (nghỉ xong vẫn không chơi được)
  const gh = gh0.lyDoKhoa === "dang_nghi" && st.hetSao ? { ...gh0, lyDoKhoa: null, cau: null } : gh0;
  const conPhut = gh.phutToiDa === null ? st.phutCon : Math.max(0, Math.min(st.phutCon, Math.floor(gh.phutToiDa + 1e-6)));
  const hoc = b.lich.hoc ?? null;
  const dangHoc = trongGioHoc(hoc, g.thu, g.phut);
  const phutToiHoc = hoc && hoc.thu.includes(g.thu) && !dangHoc && phutCua(hoc.tu) > g.phut ? phutCua(hoc.tu) - g.phut : null;
  return {
    ngay: g.ngay, cuoiTuan: laCuoiTuan(g.thu),
    quyNgayPhut: 0, themPhut: conPhut + daDung, doiSaoPhut: 0, daDung, conPhut, tongPhut: conPhut + daDung,
    dangNgu: trongKhung(g.phut, b.lich.ngu), dangHoc, khoa: dangKhoa(b.cfg, now),
    gioNgu: b.lich.ngu, gioHoc: hoc, phutToiNgu: toiNgu(g.phut, b.lich.ngu), phutToiHoc,
    tyLe: { sao: 10, phut: 10 },
    doiSao: { bat: false, toiDaNgay: 0, conDoiDuoc: 0 },
    choXinThem: true,
    soSao: st, phutTruHomNay: tru, gioiHan: gh,
  };
}

/** #302: khối `sao` cho máy Con — `phutCon` = phút CHƠI ĐƯỢC (sao tiêu được kẹp theo giới hạn ngày / lượt), `hetSao` = không chơi được nữa
 *  (agent cũ khoá nhóm «Tính phút» theo đúng cờ này), `saoTieuDuoc` = số sao thật. Số dư `sao` / nợ giữ nguyên. Không có giới hạn ⇒ như cũ. */
export function saoKepGioiHan(qy: Quy) {
  const st = qy.gioiHan.apDung ? { ...qy.soSao, phutCon: qy.conPhut, hetSao: qy.soSao.hetSao || qy.conPhut <= 0 } : qy.soSao;
  const cau = cauSao(st);
  return { ...st, saoTieuDuoc: qy.soSao.phutCon,
    cau: qy.gioiHan.lyDoKhoa ? { ...cau, phut: qy.gioiHan.cau ?? cau.phut } : cau };
}

/** #302: khối `gioiHan` gửi máy Con (bỏ phần cấu hình / mô tả chỉ app Ba Mẹ cần). */
/** Số phút gửi máy Con là SỐ NGUYÊN (agent iOS / Mac giải mã Int — số lẻ làm hỏng cả chính sách): đã chơi làm tròn, phần còn làm tròn xuống. */
const nguyen = (x: number | null) => (x === null ? null : Math.floor(x + 1e-6));
export const gioiHanMay = (g: Quy["gioiHan"]) => ({ apDung: g.apDung, ngayPhut: g.ngayPhut, daChoi: Math.round(g.daChoi), conNgay: nguyen(g.conNgay),
  luotPhut: g.luotPhut, luotDaChoi: Math.round(g.luotDaChoi), conLuot: nguyen(g.conLuot), dangNghi: g.dangNghi, nghiDen: g.nghiDen,
  nghiDenGio: g.nghiDenGio, hetNgay: g.hetNgay, lyDoKhoa: g.lyDoKhoa, phutToiDa: nguyen(g.phutToiDa), cau: g.cau });

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
    // #302: giới hạn ngày (ngày thường / T7–CN) + mỗi lượt tối đa — 0 = không giới hạn
    ...gioiHanBm(b.cfg),
  };
}

/** Phần «Giờ chơi» #302 trả cho app Ba Mẹ: giá trị đang lưu (app tự dựng ô số phút; #306 bỏ chip + dòng giải thích). */
export function gioiHanBm(cfg: Record<string, unknown>) {
  const c = cauHinhCua(cfg);
  return { gioiHanNgayThuong: c.ngayThuong, gioiHanCuoiTuan: c.cuoiTuan, phutMoiLuot: c.moiLuot };
}


/** Lưu «Giờ chơi» — #302: giới hạn ngày (gioiHanNgayThuong, gioiHanCuoiTuan) + phutMoiLuot (0 = không giới hạn; ngoài khoảng ⇒ 400).
 *  (cũ) giờ ngủ / giờ học — #258 bỏ hẳn: app cũ gửi lên được nhận mà KHÔNG lưu gì (không báo lỗi). Ô quỹ / đổi sao / ngoại lệ cũng bỏ qua. */
export async function datGioChoi(fam: string, con: string, b: Record<string, unknown>, nguoi: string) {
  const cu = await boiCanhCon(con);
  if (cu.fam !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  await luuGioiHan(fam, con, b, nguoi);
  return gioChoiCua(fam, con);
}

/** Ghi giới hạn #302 vào children.cau_hinh (chỉ khoá có gửi) + nhật ký. → có ghi gì không. */
export async function luuGioiHan(fam: string, con: string, b: Record<string, unknown>, nguoi: string | null, t: Q = q) {
  const ghi = phanGhi(b ?? {});
  if (!Object.keys(ghi).length) return false;
  await t(`update children set cau_hinh = coalesce(cau_hinh, '{}'::jsonb) || $3::jsonb where id = $1 and family_id = $2`, [con, fam, JSON.stringify(ghi)]);
  await ghiSuKien(fam, "dat_gioi_han_choi", ghi, { con, ...(nguoi ? { nguoi } : {}) }, t);
  return true;
}
