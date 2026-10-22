// Đồng bộ thiết bị Con (agent) ↔ máy chủ: agent gửi trạng thái + phút dùng theo mục, nhận Policy để thực thi (FR-02, FR-01.05, BRD 6.7).
// Giờ thật luôn là giờ MÁY CHỦ (`serverTime`); agent gửi `clientTime` để máy chủ đo lệch — lệch quá `lech_gio_phut` ⇒ Policy khoá phần
// giải trí (`gioMaySai`) và báo Ba Mẹ một lần mỗi ngày. Nhãn ngày phút dùng tin theo giờ máy chủ (cách AiiControl #38: «hôm nay theo đồng hồ
// máy» quy về hôm nay thật; ngày tương lai ⇒ hôm nay; cũ hơn 35 ngày bỏ).
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { lichCua, thamSo } from "./cau-hinh.ts";
import { congNgay, gioDiaPhuong } from "./gio.ts";
import { allowlistHieuLuc, dsLuat, phanLoai } from "./luat-app.ts";
import { giaPhut, phienDang } from "./phien.ts";
import { soDu } from "./vi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import type { May } from "./gia-dinh.ts";
// M4 agent Windows (ghép QR, phiên web cho khung Kid, sự kiện, bù phút offline, gỡ có mật khẩu Ba Mẹ)
import QRCode from "qrcode";
import { newId, tx, type Q } from "./db.ts";
import { chuanDinhDanh, dungMatKhau, sha, taoToken } from "./auth.ts";
import { chuanMuc } from "./luat-app.ts";
import { ghiDiem, khoaCon } from "./vi.ts";
import { dauNgayUtc } from "./gio.ts";
import { NEN_TANG, TEN_NEN_TANG, type NenTang } from "./gia-dinh.ts";

export type DongBoVao = {
  status?: Record<string, unknown>;
  clientTime?: string | number;
  usage?: { muc: string; phut: number; day?: string }[];
  conDangDung?: string | null;               // máy dùng chung: Con đang đăng nhập bằng PIN
};

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

export function ngayGhi(day: string | undefined, nay: string, tz: string, gioMay: Date | null): string | null {
  if (!day || !NGAY.test(day)) return nay;
  if (gioMay && day === gioDiaPhuong(gioMay, tz).ngay) return nay;
  if (day > nay) return nay;
  if (day < congNgay(nay, -35)) return null;
  return day;
}

/** Đồng bộ một lần. → Policy cho agent. */
export async function dongBo(may: May, b: DongBoVao, now = new Date()) {
  const con = may.child_id ?? (b.conDangDung && (await one(`select 1 from children where id = $1 and family_id = $2`, [b.conDangDung, may.family_id])) ? b.conDangDung : null);
  const f = (await one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [may.family_id]))!;
  const c = con ? await one<{ ten: string; cau_hinh: Record<string, unknown>; lich: Record<string, unknown>; nhom: string }>(
    `select ten, cau_hinh, lich, nhom from children where id = $1`, [con]) : undefined;
  const ts = thamSo(f.cau_hinh, c?.cau_hinh);
  const gm = b.clientTime !== undefined && Number.isFinite(new Date(b.clientTime as string).getTime()) ? new Date(b.clientTime as string) : null;
  const lechGiay = gm ? Math.round((gm.getTime() - now.getTime()) / 1000) : null;
  const gioMaySai = lechGiay !== null && Math.abs(lechGiay) > ts.lech_gio_phut * 60;
  const nay = gioDiaPhuong(now, f.tz).ngay;
  if (con) {
    for (const u of (b.usage ?? []).slice(0, 300)) {
      const ngay = ngayGhi(u?.day, nay, f.tz, gm);
      if (!ngay || !u?.muc || !Number.isFinite(u.phut)) continue;
      const pl = await phanLoai(may.family_id, con, u.muc);
      await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,$5,$6)
               on conflict (device_id, ngay, muc) do update set phut = greatest(usage.phut, excluded.phut), loai = excluded.loai`,
        [may.id, con, ngay, String(u.muc).slice(0, 200), pl.loai, Math.max(0, Math.min(1440, Math.round(u.phut)))]);
    }
  }
  const status = { ...(may.status ?? {}), ...(b.status ?? {}), lechGiay: gioMaySai ? lechGiay : null };
  await q(`update devices set last_seen = $2, status = $3::text::jsonb where id = $1`, [may.id, now, JSON.stringify(status)]);
  if (gioMaySai) {
    const moi = await canhBao(may.family_id, "lech_gio", "chu_y", `Có dấu hiệu đổi giờ hệ thống trên ${may.name}${c ? ` của ${c.ten}` : ""}`,
      { con, may: may.id, khoa: `lech_gio:${nay}:${may.id}`, chiTiet: { lechGiay } });
    if (moi) await ghiSuKien(may.family_id, "lech_gio", { lech_giay: lechGiay }, { con, may: may.id });
  }
  return taoPolicy(may, con, { gioMaySai }, now);
}

export type Policy = {
  serverTime: string; nextCheckSec: number; gioMaySai: boolean; con: { id: string; ten: string; nhom: string } | null;
  canChonCon: boolean; allowlistHeThong: string[];
  luat: { muc: string; loai: "hoc" | "giai_tri" | "chan"; nhom: string | null; giaPhanNghin: number | null }[];
  lich: ReturnType<typeof lichCua>; khoaNgay: boolean; soDu: number;
  phien: { id: string; muc: string; conPhut: number } | null;
  // M4 agent Windows — chỉ thêm: múi giờ gia đình (agent tự xét khung giờ / giờ ngủ khi mất mạng), ngưỡng lệch giờ, phiên tối đa.
  tz: string; lechGioPhut: number; phienToiDa: number;
};

export async function taoPolicy(may: May, con: string | null, o: { gioMaySai: boolean }, now = new Date()): Promise<Policy> {
  const f = (await one<{ cau_hinh: Record<string, unknown>; tz: string }>(`select cau_hinh, tz from families where id = $1`, [may.family_id]))!;
  const c = con ? await one<{ id: string; ten: string; nhom: string; cau_hinh: Record<string, unknown>; lich: Record<string, unknown> }>(
    `select id, ten, nhom, cau_hinh, lich from children where id = $1`, [con]) : undefined;
  const ts = thamSo(f.cau_hinh, c?.cau_hinh);
  const luat = c ? (await dsLuat(may.family_id)).filter((l) => !l.child_id || l.child_id === c.id) : [];
  // luật riêng của Con đè luật gia đình cùng mục
  const theoMuc = new Map<string, (typeof luat)[number]>();
  for (const l of luat.sort((a, b) => (a.child_id ? 1 : 0) - (b.child_id ? 1 : 0))) theoMuc.set(l.muc, l);
  const ph = c ? await phienDang(c.id) : undefined;
  return {
    serverTime: now.toISOString(), nextCheckSec: ph ? 60 : 300, gioMaySai: o.gioMaySai,
    con: c ? { id: c.id, ten: c.ten, nhom: c.nhom } : null, canChonCon: !c && may.dung_chung,
    allowlistHeThong: allowlistHieuLuc(),
    luat: [...theoMuc.values()].map((l) => ({ muc: l.muc, loai: l.loai, nhom: l.loai === "giai_tri" ? l.nhom : null,
      giaPhanNghin: l.loai === "giai_tri" ? giaPhut(ts, l.nhom) : null })),
    lich: lichCua(c?.lich as never), khoaNgay: c?.cau_hinh?.khoa_ngay === true, soDu: c ? await soDu(c.id) : 0,
    phien: ph ? { id: ph.id, muc: ph.muc, conPhut: Math.max(0, Math.ceil(ph.toi_da_phut - ph.phut_dung)) } : null,
    tz: f.tz, lechGioPhut: ts.lech_gio_phut, phienToiDa: ts.phien_toi_da,
  };
}

/** Ba Mẹ «Khoá ngay» / «Mở lại» (FR-02.04) — có hiệu lực ở lần đồng bộ / nhịp kế tiếp của mọi thiết bị của Con. */
export async function khoaNgay(fam: string, con: string, khoa: boolean, nguoi: string) {
  const r = await q(`update children set cau_hinh = case when $3 then cau_hinh || '{"khoa_ngay": true}'::jsonb else cau_hinh - 'khoa_ngay' end
                     where id = $1 and family_id = $2 returning id`, [con, fam, khoa]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  await ghiSuKien(fam, khoa ? "khoa_ngay" : "mo_lai", {}, { con, nguoi });
}

// ================================================================ M4 — agent Windows (chỉ thêm; hợp đồng cũ giữ nguyên)

// ---------------------------------------------------------------- ghép bằng QR (máy Con hiện QR, Ba Mẹ quét bằng app)
// Cách AiiControl (ghep-qr.ts): QR chứa link `<gốc>/q/<ma>`, `ma` dùng MỘT lần, hạn 5 phút. Máy Con giữ thêm bí mật `bi` (không nằm trong
// QR) để hỏi kết quả ⇒ ai chụp được QR cũng không lấy được token máy. Token trả cho máy Con đúng một lần rồi xoá khỏi bảng.
// Mã 6 số (Ba Mẹ tạo `POST /api/m/ma-ghep`, máy nhập `POST /api/device/ghep`) vẫn là cách chính / dự phòng.
// Bảng tạo lười ở đây (không sửa schema.ts dùng chung).
export const PHUT_QR = 5;
let coBangQr = false;
async function bangQr() {
  if (coBangQr) return;
  await q(`create table if not exists pair_qr (
    ma_hash text primary key, bi_hash text not null, platform text not null, ten_may text not null, expires_at timestamptz not null,
    family_id text, child_id text, device_id text, device_token text, claimed_at timestamptz, created_at timestamptz not null default now())`);
  coBangQr = true;
}

/** Ma trận QR dạng chuỗi "0"/"1" mỗi hàng — agent tự vẽ ô, khỏi cần thư viện QR phía Windows. */
export function maTranQr(chu: string) {
  const m = QRCode.create(chu, { errorCorrectionLevel: "M" }).modules;
  const hang: string[] = [];
  for (let y = 0; y < m.size; y++) {
    let s = "";
    for (let x = 0; x < m.size; x++) s += m.get(y, x) ? "1" : "0";
    hang.push(s);
  }
  return hang;
}

/** Máy Con xin mã QR mới. `goc` = địa chỉ gốc app Ba Mẹ (link trong QR). */
export async function taoQrGhep(goc: string, nen: string, tenMay: string, now = new Date()) {
  if (!(NEN_TANG as readonly string[]).includes(nen)) throw new LoiNghiepVu("nen_tang_sai", "Chọn loại thiết bị");
  await bangQr();
  await q(`delete from pair_qr where expires_at < $1::timestamptz - interval '1 day'`, [now]);
  const ma = taoToken().slice(0, 22), bi = taoToken();
  const het = new Date(now.getTime() + PHUT_QR * 60000);
  await q(`insert into pair_qr(ma_hash, bi_hash, platform, ten_may, expires_at) values ($1,$2,$3,$4,$5)`,
    [sha(ma), sha(bi), nen, String(tenMay ?? "").trim().slice(0, 80) || TEN_NEN_TANG[nen as NenTang], het]);
  const link = `${goc.replace(/\/+$/, "")}/q/${ma}`;
  return { ma, bi, link, het: het.toISOString(), qr: maTranQr(link) };
}

type DongQr = { ma_hash: string; bi_hash: string; platform: NenTang; ten_may: string; expires_at: Date; family_id: string | null;
  child_id: string | null; device_id: string | null; device_token: string | null; claimed_at: Date | null };

/** Ba Mẹ vừa quét: máy nào đang chờ ghép (để chọn Con). Dùng cho app Ba Mẹ (nối vào /api/m khi cần). */
export async function xemQrGhep(ma: string) {
  await bangQr();
  const d = await one<DongQr>(`select * from pair_qr where ma_hash = $1`, [sha(String(ma ?? ""))]);
  if (!d) throw new LoiNghiepVu("ma_sai", "Mã QR không đúng — trên máy Con bấm «Tạo mã mới»", 404);
  return { nen: d.platform, tenMay: d.ten_may, het: new Date(d.expires_at).toISOString(), hetHan: new Date(d.expires_at) < new Date(), daDung: !!d.claimed_at };
}

/** Ba Mẹ chọn hồ sơ Con (null = máy dùng chung) ⇒ ghép ngay. Dùng cho app Ba Mẹ (nối vào /api/m khi cần). */
export async function nhanQrGhep(fam: string, ma: string, con: string | null, nguoi?: string | null) {
  await bangQr();
  return tx(async (t) => {
    const d = (await t<DongQr>(`select * from pair_qr where ma_hash = $1 for update`, [sha(String(ma ?? ""))]))[0];
    if (!d) throw new LoiNghiepVu("ma_sai", "Mã QR không đúng — trên máy Con bấm «Tạo mã mới»", 404);
    if (d.claimed_at) throw new LoiNghiepVu("ma_da_dung", "Mã này đã dùng rồi", 409);
    if (new Date(d.expires_at) < new Date()) throw new LoiNghiepVu("ma_het_han", "Mã đã hết hạn — trên máy Con bấm «Tạo mã mới»", 410);
    if (con && !(await t(`select 1 from children where id = $1 and family_id = $2`, [con, fam])).length)
      throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    const id = newId(), token = taoToken();
    await t(`insert into devices(id, child_id, family_id, platform, name, token_hash, dung_chung, last_seen) values ($1,$2,$3,$4,$5,$6,$7, now())`,
      [id, con, fam, d.platform, d.ten_may, sha(token), !con]);
    await t(`update pair_qr set claimed_at = now(), family_id = $2, child_id = $3, device_id = $4, device_token = $5 where ma_hash = $1`,
      [d.ma_hash, fam, con, id, token]);
    await ghiSuKien(fam, "ghep_may", { platform: d.platform, ten: d.ten_may, cach: "qr" }, { con, may: id, nguoi }, t);
    return { deviceId: id, tenMay: d.ten_may, nen: d.platform };
  });
}

/** Máy Con hỏi kết quả (~2 giây/lần). Ghép xong ⇒ trả token đúng một lần (như `POST ghep`). */
export async function hoiQrGhep(ma: string, bi: string) {
  await bangQr();
  return tx(async (t) => {
    const d = (await t<DongQr>(`select * from pair_qr where ma_hash = $1 for update`, [sha(String(ma ?? ""))]))[0];
    if (!d || d.bi_hash !== sha(String(bi ?? ""))) throw new LoiNghiepVu("ma_sai", "Mã không đúng", 404);
    if (d.claimed_at && d.device_token) {
      await t(`update pair_qr set device_token = null where ma_hash = $1`, [d.ma_hash]);
      return { trangThai: "xong" as const, deviceId: d.device_id!, token: d.device_token, dungChung: !d.child_id };
    }
    if (d.claimed_at) throw new LoiNghiepVu("ma_da_dung", "Mã này đã dùng rồi", 409);
    if (new Date(d.expires_at) < new Date()) return { trangThai: "het" as const };
    return { trangThai: "cho" as const, het: new Date(d.expires_at).toISOString() };
  });
}

// ---------------------------------------------------------------- phiên web cho khung Kid (WebView2 trên máy Con)
/** Agent xin phiên Con (12 giờ) để mở màn Con web trong khung Kid — khay KHÔNG cầm token máy. */
export async function taoPhienWeb(may: May, con: string) {
  const tok = taoToken();
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1,$2,$3, now() + interval '12 hours')`, [sha(tok), con, may.id]);
  return { phienCon: tok, het: new Date(Date.now() + 12 * 3600_000).toISOString() };
}

// ---------------------------------------------------------------- sự kiện từ agent (gửi ngay hoặc gửi bù khi có mạng lại)
// Mỗi sự kiện có `ma` do agent sinh ⇒ gửi lại (hàng đợi offline) không ghi trùng. Không sự kiện nào đổi điểm / quyền.
export const SU_KIEN_MAY: Record<string, { muc: "thong_tin" | "chu_y" | "nghiem_trong" | null; cau: (ten: string) => string }> = {
  lech_gio: { muc: "chu_y", cau: (t) => `Có dấu hiệu đổi giờ hệ thống trên ${t}` },
  thu_go: { muc: "nghiem_trong", cau: (t) => `Có người thử gỡ AiiGrow trên ${t}` },
  dung_dich_vu: { muc: "nghiem_trong", cau: (t) => `Dịch vụ AiiGrow trên ${t} bị dừng` },
  khay_tat: { muc: null, cau: (t) => `Biểu tượng AiiGrow trên ${t} bị tắt` },
  safe_mode: { muc: "chu_y", cau: (t) => `${t} vừa khởi động ở Chế độ an toàn` },
  tai_khoan_moi: { muc: "chu_y", cau: (t) => `Có tài khoản Windows mới trên ${t}` },
  vpn: { muc: "chu_y", cau: (t) => `Phát hiện VPN / proxy lạ trên ${t}` },
  chan_app: { muc: null, cau: (t) => `Một ứng dụng bị chặn trên ${t}` },
  chan_cai_dat: { muc: null, cau: (t) => `Đã chặn một tệp cài đặt lạ trên ${t}` },
  offline: { muc: null, cau: (t) => `${t} chạy không có mạng` },
  // Mã mở offline (agent-win MoTamOffline): Con gõ mã Ba Mẹ đọc lúc máy mất mạng — gửi bù khi có mạng lại.
  mo_ma_offline: { muc: "thong_tin", cau: (t) => `${t} đã được mở bằng mã offline của Ba Mẹ` },
  sai_ma_offline: { muc: "chu_y", cau: (t) => `Có người gõ sai mã mở offline nhiều lần trên ${t}` },
  // Có mạng lại ⇒ agent kết thúc lượt mở offline (mã chỉ dành cho lúc mất mạng); chỉ ghi nhật ký, không báo.
  het_ma_offline: { muc: null, cau: (t) => `${t} có mạng lại — kết thúc lượt mở bằng mã offline` },
  // GỠ TỪ XA gặp trục trặc (agent báo trước khi máy rời gia đình) — Ba Mẹ cần thấy để biết chưa gỡ xong sạch:
  go_loi_applocker: { muc: "chu_y", cau: (t) => `Chưa gỡ được luật chặn (AppLocker) khi gỡ AiiGrow trên ${t} — AiiGrow đang thử lại` },
  quyen_admin_loi: { muc: "chu_y", cau: (t) => `Chưa trả lại được quyền quản trị cho tài khoản của Con khi gỡ AiiGrow trên ${t}` },
};

export type SuKienVao = { ma?: unknown; loai?: unknown; luc?: unknown; chiTiet?: unknown };

/** → số sự kiện ghi mới (bỏ qua loại lạ và `ma` đã nhận). */
export async function nhanSuKien(may: May, con: string | null, ds: SuKienVao[]) {
  let moi = 0;
  for (const e of (Array.isArray(ds) ? ds : []).slice(0, 100)) {
    const ma = String(e?.ma ?? "").slice(0, 64), loai = String(e?.loai ?? "");
    const dn = SU_KIEN_MAY[loai];
    if (!ma || !dn) continue;
    if (await one(`select 1 from events where device_id = $1 and chi_tiet->>'ma' = $2`, [may.id, ma])) continue;
    const luc = Number.isFinite(new Date(e.luc as string).getTime()) ? new Date(e.luc as string).toISOString() : null;
    let chiTiet: Record<string, unknown> = {};
    if (e.chiTiet && typeof e.chiTiet === "object" && JSON.stringify(e.chiTiet).length <= 2000) chiTiet = e.chiTiet as Record<string, unknown>;
    await ghiSuKien(may.family_id, `may_${loai}`, { ...chiTiet, ma, luc }, { con, may: may.id });
    if (dn.muc) await canhBao(may.family_id, `may_${loai}`, dn.muc, dn.cau(may.name), { con, may: may.id, khoa: `may_${loai}:${may.id}:${ma}`, chiTiet: { ...chiTiet, luc } });
    moi++;
  }
  return moi;
}

// ---------------------------------------------------------------- bù phút chơi khi mất mạng (BRD 6.7)
// Offline, agent chỉ cho chơi tới số điểm đã đồng bộ (Policy.soDu) rồi tự đóng; có mạng lại thì gửi `phien/bu`. Máy chủ vẫn là sổ sách:
// phút bù không vượt thời gian thật đã trôi (đồng hồ máy chủ từ nhịp cuối), không vượt phút tối đa của phiên; trừ điểm không âm; `ma` một lần.
export type BuVao = { ma?: unknown; id?: unknown; muc?: unknown; phut?: unknown; batDau?: unknown; ketThuc?: unknown };

const thuongCon = async (t: Q, con: string, ngay: string, tz: string) => {
  const cho = (await t<{ p: number }>(`select coalesce(sum(phut), 0)::int as p from grants where child_id = $1 and ngay = $2`, [con, ngay]))[0].p;
  const da = (await t<{ p: number }>(`select coalesce(sum(phut_thuong), 0)::real as p from play_sessions where child_id = $1 and bat_dau >= $2`,
    [con, dauNgayUtc(ngay, tz)]))[0].p;
  return Math.max(0, cho - da);
};

export type KetBu = { ma: string; phien?: string; phut: number; diemTru: number; ketThuc?: boolean; lyDo?: string; lapLai?: boolean; soDu: number };

export async function buPhien(may: May, con: string, b: BuVao, now = new Date()): Promise<KetBu> {
  const ma = String(b.ma ?? "").slice(0, 64);
  if (!ma) throw new LoiNghiepVu("thieu_ma", "Thiếu mã gửi bù");
  const phutVao = Math.max(0, Math.min(240, Number(b.phut) || 0));
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const da = (await t<{ chi_tiet: Record<string, unknown> }>(
      `select chi_tiet from events where device_id = $1 and loai = 'bu_phien' and chi_tiet->>'ma' = $2`, [may.id, ma]))[0];
    if (da) return { ...(da.chi_tiet as Omit<KetBu, "soDu">), lapLai: true, soDu: await soDu(con, t) };
    const r = (await t<{ tz: string; fcfg: Record<string, unknown>; ccfg: Record<string, unknown> }>(
      `select f.tz, f.cau_hinh as fcfg, c.cau_hinh as ccfg from children c join families f on f.id = c.family_id where c.id = $1`, [con]))[0];
    const ts = thamSo(r.fcfg, r.ccfg);
    type P = { id: string; muc: string; trang_thai: string; gia_phan_nghin: number; toi_da_phut: number; nhip_cuoi: Date; phut_dung: number;
      phan_nghin_tru: number; diem_tru: number; phut_thuong: number };
    let p = b.id ? (await t<P>(`select * from play_sessions where id = $1 and child_id = $2 for update`, [String(b.id), con]))[0] : undefined;
    let them: number;
    if (p) {
      const troi = Math.max(0, (now.getTime() - new Date(p.nhip_cuoi).getTime()) / 60000);
      them = Math.min(phutVao, troi, Math.max(0, p.toi_da_phut - p.phut_dung));
    } else {
      // phiên mở khi offline (máy chủ chưa biết): tạo bản ghi rồi tính tiền như thường
      const muc = chuanMuc(b.muc);
      const pl = await phanLoai(fam, con, muc, t);
      if (!muc || pl.loai !== "giai_tri") {
        const kq = { ma, phut: 0, diemTru: 0, lyDo: "khong_phai_giai_tri" };
        await ghiSuKien(fam, "bu_phien", kq, { con, may: may.id }, t);
        return { ...kq, soDu: await soDu(con, t) };
      }
      const bdVao = new Date(b.batDau as string).getTime();
      them = Math.min(phutVao, ts.phien_toi_da);
      const bd = new Date(Number.isFinite(bdVao) ? Math.min(bdVao, now.getTime()) : now.getTime() - them * 60000);
      const gia = giaPhut(ts, pl.nhom);
      const id = newId();
      await t(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut, bat_dau, nhip_cuoi, trang_thai)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$8,'ket_thuc')`, [id, con, may.id, muc, pl.nhom ?? "khac", gia, Math.max(1, Math.ceil(them)), bd]);
      p = { id, muc, trang_thai: "ket_thuc", gia_phan_nghin: gia, toi_da_phut: Math.max(1, Math.ceil(them)), nhip_cuoi: bd, phut_dung: 0,
        phan_nghin_tru: 0, diem_tru: 0, phut_thuong: 0 };
    }
    them = Math.round(them * 10) / 10;
    const ngay = gioDiaPhuong(now, r.tz).ngay;
    const dungThuong = Math.min(them, await thuongCon(t, con, ngay, r.tz));      // phút Ba Mẹ cho thêm dùng trước, không trừ điểm
    const phanNghin = p.phan_nghin_tru + Math.round((them - dungThuong) * p.gia_phan_nghin);
    const ket = b.ketThuc === true || p.trang_thai === "ket_thuc" || p.phut_dung + them >= p.toi_da_phut;
    const can = (ket ? Math.ceil(phanNghin / 1000) : Math.floor(phanNghin / 1000)) - p.diem_tru;
    const tru = Math.max(0, Math.min(can, await soDu(con, t)));
    if (tru > 0) await ghiDiem(t, con, -tru, "phien", `Chơi ${p.muc} (khi mất mạng)`, { ref: p.id });
    await t(`update play_sessions set phut_dung = phut_dung + $2, phan_nghin_tru = $3, diem_tru = diem_tru + $4, phut_thuong = phut_thuong + $5,
             nhip_cuoi = $6::timestamptz, trang_thai = case when $7::boolean then 'ket_thuc' else trang_thai end,
             ly_do_ket = case when $7::boolean then coalesce(ly_do_ket, 'offline') else ly_do_ket end,
             ket_thuc = case when $7::boolean then coalesce(ket_thuc, $6::timestamptz) else ket_thuc end where id = $1`,
      [p.id, them, phanNghin, tru, dungThuong, now, ket]);
    const kq = { ma, phien: p.id, phut: them, diemTru: tru, ketThuc: ket };
    await ghiSuKien(fam, "bu_phien", kq, { con, may: may.id }, t);
    return { ...kq, soDu: await soDu(con, t) };
  });
}

// ---------------------------------------------------------------- gỡ agent: cần mật khẩu tài khoản AiiGrow của Ba Mẹ (cùng gia đình)
// Bộ gỡ còn đòi quyền quản trị Windows (UAC — mật khẩu Ba Mẹ). Sai 5 lần ⇒ khoá 15 phút. Mọi lần thử sai ghi nhật ký + cảnh báo.
export async function goCoMatKhau(may: May, dinhDanh: unknown, matKhau: unknown) {
  const khoa = `go:${may.id}`;
  const s = await one<{ so_lan: number; khoa_den: Date | null }>(`select so_lan, khoa_den from pin_sai where khoa = $1`, [khoa]);
  if (s?.khoa_den && new Date(s.khoa_den) > new Date()) throw new LoiNghiepVu("tam_khoa", "Nhập sai nhiều lần — đợi 15 phút", 429);
  const bm = await one<{ id: string; pass_hash: string | null; vai: string }>(
    `select id, pass_hash, vai from parents where family_id = $1 and dinh_danh = $2`, [may.family_id, chuanDinhDanh(dinhDanh) ?? ""]);
  const dung = !!bm?.pass_hash && bm.vai !== "xem" && (await dungMatKhau(String(matKhau ?? ""), bm.pass_hash));
  if (!dung) {
    await q(`insert into pin_sai(khoa, so_lan) values ($1, 1) on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1,
             khoa_den = case when pin_sai.so_lan + 1 >= 5 then now() + interval '15 minutes' else null end`, [khoa]);
    await ghiSuKien(may.family_id, "may_thu_go", { ketQua: "sai_mat_khau" }, { con: may.child_id, may: may.id });
    await canhBao(may.family_id, "may_thu_go", "nghiem_trong", `Có người thử gỡ AiiGrow trên ${may.name} (sai mật khẩu Ba Mẹ)`,
      { con: may.child_id, may: may.id, khoa: `may_thu_go:${may.id}:${new Date().toISOString().slice(0, 13)}` });
    throw new LoiNghiepVu("sai_mat_khau", "Tài khoản hoặc mật khẩu Ba Mẹ chưa đúng", 401);
  }
  await q(`delete from pin_sai where khoa = $1`, [khoa]);
  await q(`delete from devices where id = $1`, [may.id]);
  await ghiSuKien(may.family_id, "go_may", { ten: may.name, cach: "go_tren_may" }, { con: may.child_id, nguoi: bm!.id });
  await canhBao(may.family_id, "go_may", "thong_tin", `Đã gỡ AiiGrow khỏi ${may.name}`, { con: may.child_id, may: may.id });
  return { ok: true };
}
