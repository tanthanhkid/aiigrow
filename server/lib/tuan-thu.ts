// M4b — NHỊP (heartbeat) + TUÂN THỦ (compliance) của máy Con. Cách tổ chức học từ Intune (compliance policy + «Mark device noncompliant»
// + hành động theo lịch), Workspace ONE (luật «Device Last Seen», «Compromised»), Jamf (nhóm thông minh theo lần kiểm kê cuối):
//   · agent gửi nhịp: còn sống, phiên bản, trạng thái khoá, giờ máy, tài khoản đang đăng nhập + nhóm quản trị, app quản lý còn bật không;
//   · máy chủ chấm «điểm tuân thủ» (100 − tổng điểm trừ của vấn đề đang có); dưới ngưỡng ⇒ KHOÁ giải trí (fail-closed);
//   · mất nhịp quá ngưỡng (ngung_chay_phut; điện thoại: mat_nhip_di_dong_phut) ⇒ «ngoài vòng kiểm soát» + cảnh báo Ba Mẹ MỘT lần / lần mất;
//   · Ba Mẹ mở khẩn cấp qua app (có hạn, ghi nhật ký). Không có «chế độ cục bộ»: mọi nới lỏng chỉ do Ba Mẹ duyệt qua máy chủ.
// Máy chưa từng gửi nhịp (agent M4 cũ chỉ dong-bo) ⇒ «chua_co_nhip»: không khoá (tương thích), Ba Mẹ thấy rõ trạng thái này.
import { one, q, type Q, sanSang } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo, type ThamSo } from "./cau-hinh.ts";
import { gioDiaPhuong } from "./gio.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import type { May } from "./gia-dinh.ts";
import type { TrangThaiTuanThu, TuanThu, VanDeTuanThu } from "./chinh-sach.ts";
import { laDiDong } from "./chuyen-doi.ts";

let coBang = false;
/** Tạo lười bảng M4b (schema.ts › SCHEMA_M4B). Gọi NGOÀI tx (PGlite một kết nối). */
export async function bangM4b() {
  if (coBang) return;
  await sanSang();                       // bảng M4b tạo trong db.ts cùng lược đồ chung
  coBang = true;
}

export type NhipVao = {
  phienBan?: unknown; clientTime?: unknown; trangThaiKhoa?: unknown;
  taiKhoan?: { ten?: unknown; laAdmin?: unknown } | null;   // tài khoản đang đăng nhập
  taiKhoanAdmin?: unknown;                                  // mọi tài khoản trong nhóm quản trị cục bộ (Windows / macOS)
  appQuanLyBat?: unknown;                                   // app / dịch vụ quản lý còn bật
  thanhPhan?: unknown;                                      // { dichVu, khay, quyenQuanLy (Device Owner / FamilyControls) … }: false = tắt
  matKetNoiPhut?: unknown;                                  // agent đo: không tới được máy chủ bao lâu trước nhịp này
  nguon?: unknown;                                          // "bat" | "sap_tat" | "sap_ngu"
};

export const TRU: Record<VanDeTuanThu["loai"], number> = { gio_sai: 40, app_tat: 50, admin_la: 40, khong_toi_may_chu: 30, ngoai_vong: 100 };

const chuanTen = (s: unknown) => String(s ?? "").trim().toLowerCase().slice(0, 80);

/** Chấm vấn đề từ một nhịp — hàm thuần. */
export function danhGiaNhip(b: NhipVao, o: { now: Date; lechGioPhut: number; matKetNoiToiDaPhut: number; adminTinCay: string[] }): VanDeTuanThu[] {
  const ra: VanDeTuanThu[] = [];
  const gm = b.clientTime !== undefined && b.clientTime !== null ? new Date(b.clientTime as string) : null;
  if (gm && Number.isFinite(gm.getTime())) {
    const lechGiay = Math.round((gm.getTime() - o.now.getTime()) / 1000);
    if (Math.abs(lechGiay) > o.lechGioPhut * 60)
      ra.push({ loai: "gio_sai", tru: TRU.gio_sai, chiTiet: { lechGiay }, cauBaMe: "Giờ trên máy lệch so với giờ thật",
        cauCon: "Giờ máy chưa đúng — giải trí tạm khoá tới khi giờ đúng lại" });
  }
  const tp = b.thanhPhan && typeof b.thanhPhan === "object" ? (b.thanhPhan as Record<string, unknown>) : {};
  const tat = Object.entries(tp).filter(([, v]) => v === false).map(([k]) => k.slice(0, 40));
  if (b.appQuanLyBat === false || tat.length)
    ra.push({ loai: "app_tat", tru: TRU.app_tat, chiTiet: { tat }, cauBaMe: `AiiGrow trên máy bị tắt một phần${tat.length ? ` (${tat.join(", ")})` : ""}`,
      cauCon: "AiiGrow trên máy đang bị tắt — giải trí tạm khoá, nhờ Ba Mẹ bật lại" });
  const tin = new Set(o.adminTinCay.map(chuanTen));
  const admins = new Set((Array.isArray(b.taiKhoanAdmin) ? b.taiKhoanAdmin : []).slice(0, 50).map(chuanTen).filter(Boolean));
  const dang = b.taiKhoan && typeof b.taiKhoan === "object" ? chuanTen(b.taiKhoan.ten) : "";
  if (dang && b.taiKhoan?.laAdmin === true) admins.add(dang);
  const la = [...admins].filter((a) => !tin.has(a)).sort();
  if (la.length)
    ra.push({ loai: "admin_la", tru: TRU.admin_la, chiTiet: { taiKhoan: la, dangDung: la.includes(dang) ? dang : null },
      cauBaMe: `Có tài khoản quản trị chưa được Ba Mẹ xác nhận: ${la.join(", ")}`,
      cauCon: "Máy có tài khoản quản trị lạ — giải trí tạm khoá tới khi Ba Mẹ kiểm tra" });
  const mk = Number(b.matKetNoiPhut);
  if (Number.isFinite(mk) && mk > o.matKetNoiToiDaPhut)
    ra.push({ loai: "khong_toi_may_chu", tru: TRU.khong_toi_may_chu, chiTiet: { matKetNoiPhut: Math.round(mk) },
      cauBaMe: `Máy không tới được máy chủ AiiGrow trong ${Math.round(mk)} phút (mạng bị chặn / VPN / proxy?)`,
      cauCon: "Máy không kết nối được AiiGrow — giải trí tạm khoá" });
  return ra;
}

/** Điểm + có khoá giải trí không — hàm thuần. Mở khẩn cấp còn hạn ⇒ không khoá vì tuân thủ (khoá ngay / giờ ngủ vẫn giữ). */
export function tongHop(vanDe: VanDeTuanThu[], nguong: number, moKhanCapDen: Date | null, now: Date, trangThai?: TrangThaiTuanThu): TuanThu {
  const diem = Math.max(0, 100 - vanDe.reduce((s, v) => s + v.tru, 0));
  const moKC = moKhanCapDen && moKhanCapDen > now ? moKhanCapDen : null;
  const tt: TrangThaiTuanThu = trangThai ?? (vanDe.length ? "lech_chuan" : "tuan_thu");
  const khongTT = tt === "ngoai_vong" || diem < nguong;
  return { trangThai: tt, diem, vanDe, khoaGiaiTri: khongTT && !moKC, moKhanCapDen: moKC ? moKC.toISOString() : null };
}

type DongTT = {
  device_id: string; family_id: string; nhip_cuoi: Date | null; phien_ban: string | null; nhip: Record<string, unknown>; van_de: VanDeTuanThu[];
  diem: number; tat_luc: Date | null; ngoai_vong_tu: Date | null; mo_khan_cap_den: Date | null; mo_khan_cap_nguoi: string | null;
  mo_khan_cap_ly_do: string | null; admin_tin_cay: string[];
};

const thamSoMay = async (may: Pick<May, "family_id" | "child_id">, t: Q = q): Promise<ThamSo> => {
  const r = (await t<{ f: Record<string, unknown>; c: Record<string, unknown> | null }>(
    `select f.cau_hinh as f, c.cau_hinh as c from families f left join children c on c.id = $2 where f.id = $1`, [may.family_id, may.child_id]))[0];
  return thamSo(r?.f, r?.c);
};

/** Ngưỡng mất nhịp (phút) theo nền tảng: máy tính ngung_chay_phut, điện thoại mat_nhip_di_dong_phut (nhịp thưa vì OS giới hạn chạy nền). */
export const nguongMatNhip = (nen: string, ts: ThamSo) => (laDiDong(nen) ? ts.mat_nhip_di_dong_phut : ts.ngung_chay_phut);

/** Trạng thái hiện tại của một máy (đọc, không ghi). */
export function trangThaiMay(may: Pick<May, "platform" | "last_seen">, r: DongTT | undefined, ts: ThamSo, now: Date): TuanThu {
  if (!r) return { trangThai: "chua_co_nhip", diem: 100, vanDe: [], khoaGiaiTri: false, moKhanCapDen: null };
  const ls = may.last_seen ? new Date(may.last_seen) : r.nhip_cuoi ? new Date(r.nhip_cuoi) : null;
  const moKC = r.mo_khan_cap_den ? new Date(r.mo_khan_cap_den) : null;
  if (r.tat_luc && ls && ls.getTime() <= new Date(r.tat_luc).getTime() + 60_000) return tongHop([], ts.tuan_thu_nguong, moKC, now, "tat_may");
  if (!ls || now.getTime() - ls.getTime() > nguongMatNhip(may.platform, ts) * 60_000) {
    const phut = ls ? Math.round((now.getTime() - ls.getTime()) / 60_000) : null;
    return tongHop([...r.van_de, { loai: "ngoai_vong", tru: TRU.ngoai_vong, chiTiet: { matNhipPhut: phut },
      cauBaMe: `Máy không gửi nhịp ${phut ?? "?"} phút — có thể AiiGrow đã bị tắt hoặc máy rời mạng`,
      cauCon: "Máy mất liên lạc với AiiGrow — giải trí tạm khoá" }], ts.tuan_thu_nguong, moKC, now, "ngoai_vong");
  }
  return tongHop(r.van_de ?? [], ts.tuan_thu_nguong, moKC, now);
}

const dongTT = (mayId: string, t: Q = q) => t<DongTT>(`select * from tuan_thu_may where device_id = $1`, [mayId]).then((r) => r[0]);

/** Hết hạn mở khẩn cấp ⇒ ghi nhật ký + xoá (khoá lại tự động vì tongHop không còn thấy hạn). */
async function donHetHan(r: DongTT | undefined, may: Pick<May, "id" | "family_id" | "child_id">, now: Date) {
  if (!r?.mo_khan_cap_den || new Date(r.mo_khan_cap_den) > now) return r;
  const xoa = await q(`update tuan_thu_may set mo_khan_cap_den = null, mo_khan_cap_nguoi = null, mo_khan_cap_ly_do = null
                       where device_id = $1 and mo_khan_cap_den = $2::timestamptz returning device_id`, [may.id, r.mo_khan_cap_den]);
  if (xoa.length) await ghiSuKien(may.family_id, "het_mo_khan_cap", { den: new Date(r.mo_khan_cap_den).toISOString() }, { con: may.child_id, may: may.id });
  return { ...r, mo_khan_cap_den: null, mo_khan_cap_nguoi: null, mo_khan_cap_ly_do: null };
}

/** Tuân thủ hiện tại của máy (dọn mở khẩn cấp hết hạn trước). */
export async function tuanThuMay(may: May, now = new Date()): Promise<TuanThu> {
  await bangM4b();
  const r = await donHetHan(await dongTT(may.id), may, now);
  return trangThaiMay(may, r, await thamSoMay(may), now);
}

/** Dùng ở /api/device trước phien/xet · phien/mo · phien/nhip: máy KHÔNG tuân thủ ⇒ không mở / dừng phiên giải trí. */
export async function khoaTuanThu(may: May, now = new Date()) {
  const tt = await tuanThuMay(may, now);
  return { khoa: tt.khoaGiaiTri, tuanThu: tt, cau: tt.vanDe[0]?.cauCon ?? "Máy đang chưa đúng quy tắc — giải trí tạm khoá, nhờ Ba Mẹ kiểm tra" };
}

// ---------------------------------------------------------------- nhận nhịp
export type KetNhip = { tuanThu: TuanThu; trangThaiTruoc: TrangThaiTuanThu; troLai: boolean };

export async function nhanNhip(may: May, b: NhipVao, now = new Date()): Promise<KetNhip> {
  await bangM4b();
  const ts = await thamSoMay(may);
  const f = (await one<{ tz: string }>(`select tz from families where id = $1`, [may.family_id]))!;
  const cu = await donHetHan(await dongTT(may.id), may, now);
  const truoc = trangThaiMay(may, cu, ts, now);
  const vanDe = danhGiaNhip(b, { now, lechGioPhut: ts.lech_gio_phut, matKetNoiToiDaPhut: ts.ngung_chay_phut, adminTinCay: cu?.admin_tin_cay ?? [] });
  const tt = tongHop(vanDe, ts.tuan_thu_nguong, cu?.mo_khan_cap_den ? new Date(cu.mo_khan_cap_den) : null, now);
  const nguon = String(b.nguon ?? "bat");
  const sach = {
    phienBan: String(b.phienBan ?? "").slice(0, 40) || null, trangThaiKhoa: String(b.trangThaiKhoa ?? "").slice(0, 40) || null,
    clientTime: b.clientTime ?? null, taiKhoan: b.taiKhoan && typeof b.taiKhoan === "object" ? { ten: chuanTen(b.taiKhoan.ten), laAdmin: b.taiKhoan.laAdmin === true } : null,
    appQuanLyBat: b.appQuanLyBat !== false, matKetNoiPhut: Number.isFinite(Number(b.matKetNoiPhut)) ? Number(b.matKetNoiPhut) : null, nguon,
  };
  await q(`insert into tuan_thu_may(device_id, family_id, nhip_cuoi, phien_ban, nhip, van_de, diem, tat_luc, updated_at)
           values ($1,$2,$3,$4,$5::text::jsonb,$6::text::jsonb,$7,$8,$3)
           on conflict (device_id) do update set nhip_cuoi = excluded.nhip_cuoi, phien_ban = excluded.phien_ban, nhip = excluded.nhip,
             van_de = excluded.van_de, diem = excluded.diem, tat_luc = excluded.tat_luc, ngoai_vong_tu = null, updated_at = excluded.updated_at`,
    [may.id, may.family_id, now, sach.phienBan, JSON.stringify(sach), JSON.stringify(vanDe), tt.diem, nguon === "sap_tat" || nguon === "sap_ngu" ? now : null]);
  await q(`update devices set last_seen = $2 where id = $1`, [may.id, now]);

  const o = { con: may.child_id, may: may.id };
  const troLai = truoc.trangThai === "ngoai_vong" && !!cu;
  if (troLai) {
    const ls = may.last_seen ? new Date(may.last_seen) : null;
    await ghiSuKien(may.family_id, "may_tro_lai", { vangPhut: ls ? Math.round((now.getTime() - ls.getTime()) / 60000) : null }, o);
  }
  // sự kiện khi vấn đề MỚI xuất hiện / hết; cảnh báo Ba Mẹ có khoá chống trùng (mỗi loại / máy / ngày)
  const cuLoai = new Set((cu?.van_de ?? []).map((v) => v.loai));
  const nay = gioDiaPhuong(now, f.tz).ngay;
  for (const v of vanDe) {
    if (!cuLoai.has(v.loai)) await ghiSuKien(may.family_id, "tuan_thu_lech", { loai: v.loai, tru: v.tru, diem: tt.diem, ...(v.chiTiet ?? {}) }, o);
    if (v.loai === "gio_sai")   // cùng khoá với dongBo (may-con.ts) ⇒ không báo đôi
      await canhBao(may.family_id, "lech_gio", "chu_y", `Có dấu hiệu đổi giờ hệ thống trên ${may.name}`, { ...o, khoa: `lech_gio:${nay}:${may.id}`, chiTiet: v.chiTiet });
    else
      await canhBao(may.family_id, `tuan_thu_${v.loai}`, "nghiem_trong", `${v.cauBaMe} — ${may.name}. Giải trí trên máy này đang khoá.`,
        { ...o, khoa: `tuan_thu:${v.loai}:${may.id}:${nay}`, chiTiet: { ...(v.chiTiet ?? {}), diem: tt.diem } });
  }
  if (cu && cuLoai.size && !vanDe.length) await ghiSuKien(may.family_id, "tuan_thu_on", { diem: tt.diem }, o);
  await quetMatNhip(may.family_id, now);
  return { tuanThu: tt, trangThaiTruoc: truoc.trangThai, troLai };
}

// ---------------------------------------------------------------- quét mất nhịp (gọi khi có nhịp / Ba Mẹ mở màn tuân thủ / cron)
/** Máy đã từng gửi nhịp mà im lặng quá ngưỡng (không báo tắt sạch) ⇒ «ngoài vòng» + cảnh báo MỘT lần cho mỗi lần mất nhịp. → id máy mới báo. */
export async function quetMatNhip(fam: string | null, now = new Date()) {
  await bangM4b();
  const ds = await q<May & { tt: DongTT }>(
    `select d.*, to_jsonb(t) as tt from devices d join tuan_thu_may t on t.device_id = d.id where ($1::text is null or d.family_id = $1)`, [fam]);
  const moi: string[] = [];
  for (const d of ds) {
    const ts = await thamSoMay(d);
    const tt = trangThaiMay(d, { ...d.tt, mo_khan_cap_den: d.tt.mo_khan_cap_den ? new Date(d.tt.mo_khan_cap_den) : null }, ts, now);
    if (tt.trangThai !== "ngoai_vong") continue;
    const ls = d.last_seen ? new Date(d.last_seen) : null;
    const phut = ls ? Math.round((now.getTime() - ls.getTime()) / 60000) : null;
    const ghi = await canhBao(d.family_id, "may_ngoai_vong", "nghiem_trong",
      `${d.name} đã ${phut ?? "?"} phút không gửi nhịp — AiiGrow có thể đã bị tắt. Giải trí trên máy này khoá tới khi có nhịp lại.`,
      { con: d.child_id, may: d.id, khoa: `ngoai_vong:${d.id}:${ls ? ls.getTime() : 0}`, chiTiet: { matNhipPhut: phut } });
    if (ghi) {
      await q(`update tuan_thu_may set ngoai_vong_tu = $2 where device_id = $1`, [d.id, ls]);
      await ghiSuKien(d.family_id, "may_ngoai_vong", { matNhipPhut: phut }, { con: d.child_id, may: d.id });
      moi.push(d.id);
    }
  }
  return moi;
}

// ---------------------------------------------------------------- phía Ba Mẹ
async function mayCua(fam: string, mayId: string) {
  const m = await one<May>(`select * from devices where id = $1 and family_id = $2`, [mayId, fam]);
  if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  return m;
}

/** Danh sách tuân thủ mọi máy của gia đình (quét mất nhịp trước). */
export async function dsTuanThu(fam: string, now = new Date()) {
  await quetMatNhip(fam, now);
  const ds = await q<May>(`select * from devices where family_id = $1 order by created_at`, [fam]);
  return Promise.all(ds.map(async (m) => {
    const r = await dongTT(m.id);
    const tt = await tuanThuMay(m, now);
    return { id: m.id, ten: m.name, nen: m.platform, con: m.child_id, dungChung: m.dung_chung,
      lanCuoi: m.last_seen ? new Date(m.last_seen).toISOString() : null, phienBan: r?.phien_ban ?? null,
      adminTinCay: r?.admin_tin_cay ?? [], ...tt,
      lenhCho: (await q<{ id: string; loai: string }>(`select id, loai from lenh_may where device_id = $1 and trang_thai = 'cho'`, [m.id])) };
  }));
}

export async function chiTietTuanThu(fam: string, mayId: string, now = new Date()) {
  await mayCua(fam, mayId);
  const may = (await dsTuanThu(fam, now)).find((x) => x.id === mayId)!;
  const suKien = await q(`select loai, chi_tiet, nguoi, created_at from events where family_id = $1 and device_id = $2 and
      loai in ('tuan_thu_lech','tuan_thu_on','may_ngoai_vong','may_tro_lai','mo_khan_cap','huy_mo_khan_cap','het_mo_khan_cap','tin_cay_admin','lenh_go','go_may')
      order by created_at desc, seq desc limit 50`, [fam, mayId]);
  return { ...may, suKien };
}

/** Ba Mẹ mở khẩn cấp (có hạn, ghi nhật ký, báo các Ba Mẹ khác). Chỉ gỡ khoá do KHÔNG TUÂN THỦ; khoá ngay / giờ ngủ / điểm vẫn giữ. */
export async function moKhanCap(fam: string, mayId: string, b: { phut?: unknown; lyDo?: unknown }, nguoi: string, now = new Date()) {
  await bangM4b();
  const m = await mayCua(fam, mayId);
  const ts = await thamSoMay(m);
  const phut = Math.max(5, Math.min(ts.mo_khan_cap_toi_da_phut, Math.round(Number(b.phut) || 30)));
  const lyDo = String(b.lyDo ?? "").trim().slice(0, 200);
  const den = new Date(now.getTime() + phut * 60000);
  await q(`insert into tuan_thu_may(device_id, family_id, mo_khan_cap_den, mo_khan_cap_nguoi, mo_khan_cap_ly_do) values ($1,$2,$3,$4,$5)
           on conflict (device_id) do update set mo_khan_cap_den = excluded.mo_khan_cap_den, mo_khan_cap_nguoi = excluded.mo_khan_cap_nguoi,
           mo_khan_cap_ly_do = excluded.mo_khan_cap_ly_do`, [m.id, fam, den, nguoi, lyDo]);
  await ghiSuKien(fam, "mo_khan_cap", { phut, den: den.toISOString(), lyDo }, { con: m.child_id, may: m.id, nguoi });
  await canhBao(fam, "mo_khan_cap", "thong_tin", `Đã mở khẩn cấp ${m.name} trong ${phut} phút${lyDo ? ` — ${lyDo}` : ""}`,
    { con: m.child_id, may: m.id, khoa: `mo_khan_cap:${m.id}:${now.getTime()}` });
  return { den: den.toISOString(), phut };
}

export async function huyMoKhanCap(fam: string, mayId: string, nguoi: string) {
  await bangM4b();
  const m = await mayCua(fam, mayId);
  await q(`update tuan_thu_may set mo_khan_cap_den = null, mo_khan_cap_nguoi = null, mo_khan_cap_ly_do = null where device_id = $1`, [m.id]);
  await ghiSuKien(fam, "huy_mo_khan_cap", {}, { con: m.child_id, may: m.id, nguoi });
}

/** Ba Mẹ xác nhận / bỏ xác nhận một tài khoản quản trị trên máy là của Ba Mẹ. */
export async function tinCayAdmin(fam: string, mayId: string, b: { ten?: unknown; tinCay?: unknown }, nguoi: string) {
  await bangM4b();
  const m = await mayCua(fam, mayId);
  const ten = chuanTen(b.ten);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên tài khoản quản trị");
  const r = await dongTT(m.id);
  const ds = new Set(r?.admin_tin_cay ?? []);
  if (b.tinCay === false) ds.delete(ten); else ds.add(ten);
  const moi = [...ds].sort().slice(0, 20);
  // gỡ vấn đề admin_la đang lưu nếu mọi tài khoản lạ giờ đã được xác nhận (nhịp kế tiếp chấm lại đầy đủ)
  const vanDe = (r?.van_de ?? []).filter((v) => v.loai !== "admin_la" || ((v.chiTiet?.taiKhoan as string[]) ?? []).some((x) => !ds.has(x)));
  await q(`insert into tuan_thu_may(device_id, family_id, admin_tin_cay, van_de) values ($1,$2,$3::text::jsonb,$4::text::jsonb)
           on conflict (device_id) do update set admin_tin_cay = excluded.admin_tin_cay, van_de = excluded.van_de`,
    [m.id, fam, JSON.stringify(moi), JSON.stringify(vanDe)]);
  await ghiSuKien(fam, "tin_cay_admin", { ten, tinCay: b.tinCay !== false }, { con: m.child_id, may: m.id, nguoi });
  return { adminTinCay: moi };
}

// ---------------------------------------------------------------- Mã mở offline (lib/ma-offline.ts): bí mật chung máy ↔ máy chủ
import { BUOC_GIAY, DUNG_SAI, maOffline, taoBiMatOffline } from "./ma-offline.ts";

/** Lấy (hoặc tạo lần đầu) bí mật mã offline của một máy — dùng cả cho agent (theo deviceId) lẫn Ba Mẹ. */
export async function biMatOfflineMay(deviceId: string): Promise<string | null> {
  const r = await one<{ offline_secret: string | null }>(`select offline_secret from devices where id = $1`, [deviceId]);
  if (!r) return null;
  if (r.offline_secret) return r.offline_secret;
  const bm = taoBiMatOffline();
  // chỉ ghi nếu còn trống (tránh đè khi hai lần song song)
  const kq = await q<{ offline_secret: string }>(`update devices set offline_secret = $2 where id = $1 and offline_secret is null returning offline_secret`, [deviceId, bm]);
  return kq[0]?.offline_secret ?? bm;
}

/** Ba Mẹ xem mã mở offline của một máy (có kiểm chủ quyền + ghi nhật ký). */
export async function maOfflineChoMay(fam: string, mayId: string, nguoi: string, now = new Date(), phutMo = 60) {
  const m = await mayCua(fam, mayId);
  const bm = await biMatOfflineMay(m.id);
  if (!bm) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const ma = maOffline(bm, now);
  const conGiay = BUOC_GIAY * (DUNG_SAI + 1) - Math.floor((now.getTime() / 1000) % BUOC_GIAY);
  await ghiSuKien(fam, "xem_ma_offline", {}, { con: m.child_id, may: m.id, nguoi });
  return { ma, conGiay, hieuLucPhut: Math.round((BUOC_GIAY * (2 * DUNG_SAI + 1)) / 60), phutMo };
}
