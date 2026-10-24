// Phiên giải trí trừ điểm theo phút (FR-04.02, BRD 6.3, Phụ lục A.3). Máy chủ là sổ sách: agent gửi NHỊP mỗi phút kèm «đang dùng thật»
// (app ở nền trước, màn hình mở); máy chủ tính phút theo ĐỒNG HỒ MÁY CHỦ giữa hai nhịp (giờ máy Con sai không ảnh hưởng), trừ điểm, và
// quyết định dừng. Một Con chỉ một phiên đang chạy trên mọi thiết bị (chỉ mục unique play_mot_phien).
// Giá theo nhóm (phần nghìn điểm/phút): trừ phần nguyên dần theo từng phút, phần lẻ cuối phiên làm tròn LÊN (không cho chơi miễn phí phần lẻ).
// Phút «thêm giờ» Ba Mẹ đã cho hôm nay (grants) được dùng TRƯỚC và không trừ điểm.
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { NHOM_GIA, dangKhoa, lichCua, thamSo, type ThamSo } from "./cau-hinh.ts";
import { dauNgayUtc, dauTuan, gioDiaPhuong, laCuoiTuan, phutCua, trongKhung, type Khung } from "./gio.ts";
import { ghiDiem, khoaCon, soDu } from "./vi.ts";
import { phanLoai, type NhomGiaiTri } from "./luat-app.ts";
import { ghiSuKien } from "./nhat-ky.ts";

export type LyDoTuChoi = "khong_phai_giai_tri" | "bi_chan" | "chua_phan_loai" | "gio_ngu" | "ngoai_khung" | "dang_nghi" | "dat_tran_ngay"
  | "dat_tran_tuan" | "het_diem" | "phien_khac" | "ba_me_khoa" | "gio_may_sai" | "khong_tuan_thu"
  | "may_dang_choi";

type BoiCanh = { fam: string; tz: string; ts: ThamSo; lich: ReturnType<typeof lichCua>; khoa: boolean };

async function boiCanh(t: Q, con: string, now = new Date()): Promise<BoiCanh> {
  const r = (await t<{ family_id: string; tz: string; fcfg: Record<string, unknown>; ccfg: Record<string, unknown>; lich: Record<string, unknown> }>(
    `select c.family_id, f.tz, f.cau_hinh as fcfg, c.cau_hinh as ccfg, c.lich from children c join families f on f.id = c.family_id where c.id = $1`, [con]))[0];
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return { fam: r.family_id, tz: r.tz, ts: thamSo(r.fcfg, r.ccfg), lich: lichCua(r.lich as never), khoa: dangKhoa(r.ccfg, now) };
}

export const giaPhut = (ts: ThamSo, nhom: NhomGiaiTri | null) => ts[NHOM_GIA[nhom ?? "khac"] ?? "gia_khac"];

/** Phút giải trí đã dùng (mọi thiết bị) từ thời điểm `tu`. */
const daDungTu = async (t: Q, con: string, tu: Date) =>
  (await t<{ p: number }>(`select coalesce(sum(phut_dung), 0)::int as p from play_sessions where child_id = $1 and bat_dau >= $2`, [con, tu]))[0].p;

const thuongHomNay = async (t: Q, con: string, ngay: string) =>
  (await t<{ p: number }>(`select coalesce(sum(phut), 0)::int as p from grants where child_id = $1 and ngay = $2 and cua_so_den is null`, [con, ngay]))[0].p;

/** Phút giải trí còn được chơi theo trần (ngày lẫn tuần, đã cộng phút thưởng hôm nay) — đúng như xetMoPhien tính `conNgay` / `conTuan`.
 *  Dùng chung cho «≈ X phút chơi» ở app Ba Mẹ để con số không lệch với lúc Con thật sự mở phiên. */
export async function conTheoTran(t: Q, con: string, ts: ThamSo, tz: string, now = new Date()) {
  const ngay = gioDiaPhuong(now, tz).ngay;
  const [thuong, homNay, tuanNay] = await Promise.all([thuongHomNay(t, con, ngay), daDungTu(t, con, dauNgayUtc(ngay, tz)),
    daDungTu(t, con, dauNgayUtc(dauTuan(ngay), tz))]);
  return { thuong, daChoi: homNay, conNgay: ts.tran_ngay + thuong - homNay, conTuan: ts.tran_tuan + thuong - tuanNay };
}

/** Phút còn lại tới hết khung giờ chơi hiện tại (null = đang ngoài khung). */
function conTrongKhung(lich: BoiCanh["lich"], thu: number, phut: number) {
  const ds: Khung[] = laCuoiTuan(thu) ? lich.cuoiTuan : lich.ngayThuong;
  for (const k of ds) if (trongKhung(phut, k)) return ((phutCua(k.den) - phut + 1440) % 1440) || 1440;
  return null;
}

export type XetPhien = { duoc: boolean; lyDo?: LyDoTuChoi; nhom?: NhomGiaiTri; giaPhanNghin?: number; phutToiDa?: number; soDu?: number;
  nghiDen?: string; moLai?: string };

/** Xét mở phiên cho `muc` lúc `now` (chưa ghi gì). Thứ tự lý do theo BRD: khoá / ngủ / ngoài khung / nghỉ / trần / điểm / phiên khác. */
export async function xetMoPhien(con: string, mucTho: string, o: { gioMaySai?: boolean; mayId?: string | null } = {}, now = new Date(), t: Q = q): Promise<XetPhien> {
  const b = await boiCanh(t, con, now);
  const pl = await phanLoai(b.fam, con, mucTho, t);
  if (pl.loai === "chan") return { duoc: false, lyDo: "bi_chan" };
  if (pl.loai === "chua_phan_loai") return { duoc: false, lyDo: "chua_phan_loai" };
  if (pl.loai !== "giai_tri") return { duoc: false, lyDo: "khong_phai_giai_tri" };
  if (b.khoa) return { duoc: false, lyDo: "ba_me_khoa" };
  if (o.gioMaySai) return { duoc: false, lyDo: "gio_may_sai" };
  const g = gioDiaPhuong(now, b.tz);
  if (trongKhung(g.phut, b.lich.ngu)) return { duoc: false, lyDo: "gio_ngu" };
  const conKhung = conTrongKhung(b.lich, g.thu, g.phut);
  if (conKhung === null) return { duoc: false, lyDo: "ngoai_khung" };
  const nghi = (await t<{ nghi_den: Date }>(`select nghi_den from play_sessions where child_id = $1 and nghi_den > $2 order by nghi_den desc limit 1`, [con, now]))[0];
  if (nghi) return { duoc: false, lyDo: "dang_nghi", nghiDen: new Date(nghi.nghi_den).toISOString() };
  const khac = (await t<{ device_id: string | null }>(`select device_id from play_sessions where child_id = $1 and trang_thai in ('chay', 'tam')`, [con]))[0];
  if (khac && khac.device_id !== (o.mayId ?? null)) return { duoc: false, lyDo: "phien_khac" };
  // máy dùng chung: một máy chỉ một phiên — bạn khác đang chơi trên máy này thì phải dừng / «Đổi người» trước
  if (o.mayId && (await t(`select 1 from play_sessions where device_id = $1 and child_id <> $2 and trang_thai in ('chay', 'tam') limit 1`, [o.mayId, con])).length)
    return { duoc: false, lyDo: "may_dang_choi" };
  const thuong = await thuongHomNay(t, con, g.ngay);
  const homNay = await daDungTu(t, con, dauNgayUtc(g.ngay, b.tz));
  const conNgay = b.ts.tran_ngay + thuong - homNay;
  if (conNgay <= 0) return { duoc: false, lyDo: "dat_tran_ngay" };
  const conTuan = b.ts.tran_tuan + thuong - (await daDungTu(t, con, dauNgayUtc(dauTuan(g.ngay), b.tz)));
  if (conTuan <= 0) return { duoc: false, lyDo: "dat_tran_tuan" };
  const gia = giaPhut(b.ts, pl.nhom);
  const du = await soDu(con, t);
  const conThuong = await conThuongHomNay(t, con, g.ngay, b.tz);
  const phutBangDiem = gia > 0 ? Math.floor((du * 1000) / gia) : 24 * 60;
  if (phutBangDiem + conThuong <= 0) return { duoc: false, lyDo: "het_diem", soDu: du };
  const phutToiDa = Math.max(1, Math.min(b.ts.phien_toi_da + conThuong, phutBangDiem + conThuong, conNgay, conTuan, conKhung));
  return { duoc: true, nhom: pl.nhom ?? "khac", giaPhanNghin: gia, phutToiDa, soDu: du };
}

/** Phút «thêm giờ» còn lại hôm nay = phút Ba Mẹ cho (grants của ngày) − phút thưởng các phiên hôm nay đã dùng (cột phut_thuong). */
async function conThuongHomNay(t: Q, con: string, ngay: string, tz: string) {
  const da = (await t<{ p: number }>(`select coalesce(sum(phut_thuong), 0)::real as p from play_sessions where child_id = $1 and bat_dau >= $2`,
    [con, dauNgayUtc(ngay, tz)]))[0].p;
  return Math.max(0, (await thuongHomNay(t, con, ngay)) - da);
}

/** Phút «thưởng» (thêm giờ) còn lại hôm nay của Con — dùng để khay Windows vẫn hiện «Dùng điểm để chơi» khi Con 0 điểm nhưng Ba Mẹ đã cho thêm giờ. */
export async function thuongConLai(con: string, now = new Date()) {
  const b = await boiCanh(q, con, now);
  return conThuongHomNay(q, con, gioDiaPhuong(now, b.tz).ngay, b.tz);
}

export async function moPhien(con: string, mayId: string | null, muc: string, o: { gioMaySai?: boolean } = {}, now = new Date()) {
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const x = await xetMoPhien(con, muc, { ...o, mayId }, now, t);
    if (!x.duoc) throw Object.assign(new LoiNghiepVu("khong_mo_duoc", lyDoChu(x), 409), { chiTiet: x });
    const dang = (await t<{ id: string }>(`select id from play_sessions where child_id = $1 and trang_thai in ('chay', 'tam')`, [con]))[0];
    if (dang) return { id: dang.id, ...x, moi: false };                  // cùng thiết bị mở lại ⇒ tiếp phiên đang chạy
    const id = newId();
    await t(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut, bat_dau, nhip_cuoi) values ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [id, con, mayId, muc, x.nhom, x.giaPhanNghin, x.phutToiDa, now]);
    await ghiSuKien(fam, "mo_phien", { muc, toi_da: x.phutToiDa }, { con, may: mayId }, t);
    return { id, ...x, moi: true };
  });
}

export type KetNhip = { trangThai: "chay" | "tam" | "ket_thuc"; phutDung: number; conPhut: number; diemTru: number; soDu: number;
  canhBao: 5 | 1 | null; lyDoKet?: string; nghiDen?: string };

const NHIP_TOI_DA_PHUT = 2;      // một nhịp không tính quá 2 phút (mất mạng lâu rồi gửi nhịp: không «bù» hàng giờ, phần thiếu do agent khoá cục bộ)

/** Nhịp từ agent. `dangDung` false = khoá màn hình / chuyển sang app học ⇒ tạm dừng đếm; tạm dừng quá `tu_dong_dong` phút ⇒ đóng phiên.
 *  `o.phut` (agent Windows 0.2.4 — `status.playSeconds`): số phút chơi THẬT agent đếm được từ lần đồng bộ trước ⇒ tính đúng chừng đó
 *  (kẹp theo thời gian thật đã trôi và NHIP_TOI_DA_PHUT), kể cả khi nhịp trước đang «tạm» — không mất phút khi tiền cảnh đổi qua lại. */
export async function nhip(con: string, phienId: string, dangDung: boolean, now = new Date(), o: { phut?: number } = {}): Promise<KetNhip> {
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const p = (await t<{ id: string; trang_thai: string; gia_phan_nghin: number; toi_da_phut: number; nhip_cuoi: Date; phut_dung: number;
      phan_nghin_tru: number; diem_tru: number; phut_thuong: number; muc: string; ly_do_ket: string | null; nghi_den: Date | null;
      tam_tu: Date | null }>(
      `select * from play_sessions where id = $1 and child_id = $2 for update`, [phienId, con]))[0];
    if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy phiên", 404);
    const b = await boiCanh(t, con, now);
    if (p.trang_thai === "ket_thuc")
      return { trangThai: "ket_thuc", phutDung: p.phut_dung, conPhut: 0, diemTru: p.diem_tru, soDu: await soDu(con, t), canhBao: null,
        lyDoKet: p.ly_do_ket ?? undefined, nghiDen: p.nghi_den ? new Date(p.nghi_den).toISOString() : undefined };
    const troi = Math.max(0, (now.getTime() - new Date(p.nhip_cuoi).getTime()) / 60000);
    let phutDung = p.phut_dung, phanNghin = p.phan_nghin_tru, diemTru = p.diem_tru, phutThuong = p.phut_thuong, ket: string | null = null;
    // tạm dừng tính từ nhịp «không dùng» đầu tiên (tam_tu), không từ nhịp cuối — nhịp tạm dừng mỗi phút không kéo dài mãi
    const tamTu = !dangDung ? (p.trang_thai === "tam" ? new Date(p.tam_tu ?? p.nhip_cuoi) : now) : null;
    if (tamTu && (now.getTime() - tamTu.getTime()) / 60000 >= b.ts.tu_dong_dong) ket = "khong_hoat_dong";
    if (!ket && dangDung && (p.trang_thai === "chay" || o.phut !== undefined)) {
      const them = o.phut !== undefined ? Math.min(NHIP_TOI_DA_PHUT, Math.round(Math.min(Math.max(0, o.phut), troi) * 100) / 100)
        : Math.min(NHIP_TOI_DA_PHUT, Math.round(troi * 10) / 10);
      const g = gioDiaPhuong(now, b.tz);
      const dungThuong = Math.min(them, await conThuongHomNay(t, con, g.ngay, b.tz));      // phút Ba Mẹ cho thêm dùng trước, không trừ điểm
      const tinhTien = them - dungThuong;
      phutThuong += dungThuong;
      phutDung = Math.round((phutDung + them) * 100) / 100;
      phanNghin += Math.round(tinhTien * p.gia_phan_nghin);
      const nguyen = Math.floor(phanNghin / 1000) - diemTru;
      if (nguyen > 0) {
        const du = await soDu(con, t);
        const tru = Math.min(nguyen, du);
        if (tru > 0) await ghiDiem(t, con, -tru, "phien", `Chơi ${p.muc}`, { ref: p.id });
        diemTru += tru;
        if (tru < nguyen) ket = "het_diem";
      }
    }
    const g = gioDiaPhuong(now, b.tz);
    if (!ket && b.khoa) ket = "ba_me_khoa";
    if (!ket && trongKhung(g.phut, b.lich.ngu)) ket = "gio_ngu";
    if (!ket && conTrongKhung(b.lich, g.thu, g.phut) === null) ket = "het_khung";
    if (!ket && phutDung >= p.toi_da_phut) ket = "het_thoi_gian";
    // hết điểm cho phút kế (tính cả phần lẻ đang nợ) và không còn phút thưởng ⇒ dừng
    if (!ket && p.gia_phan_nghin > 0 && (await soDu(con, t)) * 1000 - (phanNghin - diemTru * 1000) < p.gia_phan_nghin
        && (await conThuongHomNay(t, con, g.ngay, b.tz)) - (phutThuong - p.phut_thuong) <= 0) ket = "het_diem";
    const trangThai = ket ? "ket_thuc" : dangDung ? "chay" : "tam";
    let nghiDen: Date | null = null;
    if (ket) {
      const le = Math.ceil(phanNghin / 1000) - diemTru;                // phần lẻ cuối phiên làm tròn lên
      if (le > 0) { const du = await soDu(con, t); const tru = Math.min(le, du); if (tru > 0) await ghiDiem(t, con, -tru, "phien", `Chơi ${p.muc}`, { ref: p.id }); diemTru += tru; }
      if (["het_thoi_gian", "con_dung", "het_diem"].includes(ket)) nghiDen = new Date(now.getTime() + b.ts.nghi_giua * 60000);
    }
    await t(`update play_sessions set trang_thai = $2, phut_dung = $3, phan_nghin_tru = $4, diem_tru = $5, nhip_cuoi = $6::timestamptz,
             ly_do_ket = $7, ket_thuc = case when $7::text is null then null else $6::timestamptz end, nghi_den = $8, phut_thuong = $9,
             tam_tu = $10 where id = $1`,
      [p.id, trangThai, phutDung, phanNghin, diemTru, now, ket, nghiDen, phutThuong, trangThai === "tam" ? tamTu : null]);
    if (ket) await ghiSuKien(fam, "ket_phien", { muc: p.muc, phut: phutDung, diem: diemTru, ly_do: ket }, { con }, t);
    const conPhut = ket ? 0 : Math.max(0, Math.ceil(p.toi_da_phut - phutDung));
    return { trangThai, phutDung, conPhut, diemTru, soDu: await soDu(con, t), canhBao: conPhut > 0 && conPhut <= 1 ? 1 : conPhut > 0 && conPhut <= 5 ? 5 : null,
      lyDoKet: ket ?? undefined, nghiDen: nghiDen?.toISOString() };
  });
}

/** Con bấm «Dừng sớm» (giữ điểm còn lại) hoặc Ba Mẹ khoá ngay. */
/** `nghi`: đặt giờ nghỉ (nghi_giua) sau phiên — mặc định chỉ khi Con tự dừng; Ba Mẹ bấm «Dừng» ở Trang chủ cũng cần (không thì Con mở phiên mới ngay).
 */
export async function dungPhien(con: string, phienId: string, lyDo: "con_dung" | "ba_me_khoa" | "het_dang_nhap" = "con_dung", now = new Date(),
  o: { nghi?: boolean; nguoi?: string } = {}) {
  await nhip(con, phienId, true, now);                                 // tính nốt phút tới lúc dừng
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const p = (await t<{ trang_thai: string; phan_nghin_tru: number; diem_tru: number; muc: string; phut_dung: number }>(
      `select trang_thai, phan_nghin_tru, diem_tru, muc, phut_dung from play_sessions where id = $1 and child_id = $2 for update`, [phienId, con]))[0];
    if (!p || p.trang_thai === "ket_thuc") return false;             // nhip() vừa tự đóng phiên (hết khung / giờ ngủ / hết giờ) ⇒ người gọi biết không dừng được
    const b = await boiCanh(t, con, now);
    const le = Math.ceil(p.phan_nghin_tru / 1000) - p.diem_tru;
    const tru = le > 0 ? Math.min(le, await soDu(con, t)) : 0;
    if (tru > 0) await ghiDiem(t, con, -tru, "phien", `Chơi ${p.muc}`, { ref: phienId });
    const nghi = (o.nghi ?? lyDo === "con_dung") ? new Date(now.getTime() + b.ts.nghi_giua * 60000) : null;
    await t(`update play_sessions set trang_thai = 'ket_thuc', ly_do_ket = $2, ket_thuc = $3, nghi_den = $4, diem_tru = diem_tru + $5 where id = $1`,
      [phienId, lyDo, now, nghi, tru]);
    await ghiSuKien(fam, "ket_phien", { muc: p.muc, phut: p.phut_dung, ly_do: lyDo }, { con, ...(o.nguoi ? { nguoi: o.nguoi } : {}) }, t);
    return true;
  });
}

export function lyDoChu(x: XetPhien): string {
  switch (x.lyDo) {
    case "bi_chan": return "Ba Mẹ đã chặn mục này";
    case "chua_phan_loai": return "Mục này chưa được Ba Mẹ cho phép — gửi «Xin phép Ba Mẹ» nhé";
    case "khong_phai_giai_tri": return "Mục này dùng thoải mái, không cần điểm";
    case "ba_me_khoa": return "Ba Mẹ đang tạm khoá giờ chơi";
    case "gio_may_sai": return "Giờ máy không đúng, hãy nhờ Ba Mẹ";
    case "gio_ngu": return "Đến giờ ngủ rồi — mai chơi tiếp nhé";
    case "ngoai_khung": return "Bây giờ chưa phải giờ chơi";
    case "dang_nghi": return `Nghỉ chút nhé — mở lại lúc ${x.nghiDen ? new Date(x.nghiDen).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "sau"}`;
    case "dat_tran_ngay": return "Hôm nay con đã chơi đủ giờ rồi";
    case "dat_tran_tuan": return "Tuần này con đã chơi đủ giờ rồi";
    case "het_diem": return "Con chưa đủ điểm — làm nhiệm vụ để có thêm điểm nhé";
    case "phien_khac": return "Con đang chơi trên một thiết bị khác";
    case "may_dang_choi": return "Máy này đang có bạn khác chơi — bạn ấy cần bấm «Dừng» hoặc «Đổi người» trước";
    default: return "Chưa mở được giờ chơi";
  }
}

/** agent-win KHÔNG gửi `phien/nhip` ⇒ nhịp dong-bo (30 giây khi có phiên) của CHÍNH máy Windows mở phiên là nhịp phiên — trừ điểm,
 *  hết giờ, hết điểm, giờ ngủ… như mọi nhịp. Đường chính là lib/phien-windows.ts › nhipPhienWindows: agent 0.2.4+ gửi `playSeconds`
 *  (máy chủ tính đúng chừng đó; 0 ⇒ tạm dừng, 3 phút ⇒ đóng); agent cũ chỉ có `childSessionActive` (đăng xuất / đổi người dùng ⇒ tạm dừng).
 *  Trang chơi trên khay CHỈ ĐỌC trạng thái này (choi-tre › nhipTre → trangThaiPhien), không là nguồn thứ hai. */
export async function nhipTuDongBo(mayId: string, con: string, dangDung: boolean, now = new Date()) {
  const ph = await phienDang(con);
  if (!ph || ph.device_id !== mayId) return null;
  return nhip(con, ph.id, dangDung, now);
}

/** Trạng thái phiên CHỈ ĐỌC (không nhịp, không ghi) — trang khay cho phiên của máy Windows (choi-tre › nhipTre). */
export async function trangThaiPhien(con: string, phienId: string): Promise<KetNhip> {
  const p = await one<{ trang_thai: "chay" | "tam" | "ket_thuc"; phut_dung: number; toi_da_phut: number; diem_tru: number; ly_do_ket: string | null; nghi_den: Date | null }>(
    `select trang_thai, phut_dung, toi_da_phut, diem_tru, ly_do_ket, nghi_den from play_sessions where id = $1 and child_id = $2`, [phienId, con]);
  if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy phiên", 404);
  const conPhut = p.trang_thai === "ket_thuc" ? 0 : Math.max(0, Math.ceil(p.toi_da_phut - p.phut_dung));
  return { trangThai: p.trang_thai, phutDung: p.phut_dung, conPhut, diemTru: p.diem_tru, soDu: await soDu(con),
    canhBao: conPhut > 0 && conPhut <= 1 ? 1 : conPhut > 0 && conPhut <= 5 ? 5 : null,
    lyDoKet: p.ly_do_ket ?? undefined, nghiDen: p.nghi_den ? new Date(p.nghi_den).toISOString() : undefined };
}

export const phienDang = (con: string) =>
  one<{ id: string; muc: string; device_id: string | null; toi_da_phut: number; phut_dung: number; trang_thai: string }>(
    `select id, muc, device_id, toi_da_phut, phut_dung, trang_thai from play_sessions where child_id = $1 and trang_thai in ('chay', 'tam')`, [con]);
