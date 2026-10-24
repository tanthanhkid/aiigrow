// Đồng bộ thiết bị Con (agent) ↔ máy chủ: agent gửi trạng thái + phút dùng theo mục, nhận Policy để thực thi (FR-02, FR-01.05, BRD 6.7).
// Giờ thật luôn là giờ MÁY CHỦ (`serverTime`); agent gửi `clientTime` để máy chủ đo lệch — lệch quá `lech_gio_phut` ⇒ Policy khoá phần
// giải trí (`gioMaySai`) và báo Ba Mẹ một lần mỗi ngày. Nhãn ngày phút dùng tin theo giờ máy chủ (cách AiiControl #38: «hôm nay theo đồng hồ
// máy» quy về hôm nay thật; ngày tương lai ⇒ hôm nay; cũ hơn 35 ngày bỏ).
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { dangKhoa, khoaDen, khoaGoc, lichCua, moTamDen, nhipToiKhoaLai, thamSo } from "./cau-hinh.ts";
import { congNgay, gioDiaPhuong } from "./gio.ts";
import { allowlistHieuLuc, dsLuat, phanLoai } from "./luat-app.ts";
import { giaPhut, phienDang } from "./phien.ts";
import { soDu } from "./vi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import type { May } from "./gia-dinh.ts";
// M4 agent Windows (phiên web cho khung Kid, sự kiện, bù phút offline, gỡ có mật khẩu Ba Mẹ)
import { newId, tx, type Q } from "./db.ts";
import { chuanDinhDanh, dungMatKhau, sha, taoToken } from "./auth.ts";
import { chuanMuc } from "./luat-app.ts";
import { ghiDiem, khoaCon } from "./vi.ts";
import { dauNgayUtc } from "./gio.ts";

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
      // Mac báo bundle id giữ chữ hoa (com.roblox.RobloxPlayer) mà luật luôn chữ thường (luat-app.ts › chuanMuc) ⇒ hạ chữ thường để «Chưa xếp» khớp luật
      const muc = may.platform === "mac" ? String(u.muc).toLowerCase() : String(u.muc);
      const pl = await phanLoai(may.family_id, con, muc);
      await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,$5,$6)
               on conflict (device_id, ngay, muc) do update set phut = greatest(usage.phut, excluded.phut), loai = excluded.loai`,
        [may.id, con, ngay, muc.slice(0, 200), pl.loai, Math.max(0, Math.min(1440, Math.round(u.phut)))]);
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
  /** đang mở tạm (yeu-cau.ts › dongY): khoá trở lại lúc này (ISO); hạn khoá hiện tại — agent đồng bộ đúng các mốc đó */ khoaLaiLuc?: string | null; khoaHetLuc?: string | null;
  phien: { id: string; muc: string; conPhut: number } | null;
  // M4 agent Windows — chỉ thêm: múi giờ gia đình (agent tự xét khung giờ / giờ ngủ khi mất mạng), ngưỡng lệch giờ, phiên tối đa.
  tz: string; lechGioPhut: number; phienToiDa: number;
  /** Web: true = «chỉ cho phép» (chặn mọi trang trừ trang được cho phép), false = «mở» (chỉ chặn trang Ba Mẹ chặn). tham số web_chi_cho_phep. */
  webChiChoPhep?: boolean;
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
    serverTime: now.toISOString(), nextCheckSec: nhipToiKhoaLai(ph ? 30 : 120, [moTamDen(c?.cau_hinh, now), khoaDen(c?.cau_hinh, now)], now), gioMaySai: o.gioMaySai,
    con: c ? { id: c.id, ten: c.ten, nhom: c.nhom } : null, canChonCon: !c && may.dung_chung,
    allowlistHeThong: allowlistHieuLuc(),
    luat: [...theoMuc.values()].map((l) => ({ muc: l.muc, loai: l.loai, nhom: l.loai === "giai_tri" ? l.nhom : null,
      giaPhanNghin: l.loai === "giai_tri" ? giaPhut(ts, l.nhom) : null })),
    lich: lichCua(c?.lich as never), khoaNgay: dangKhoa(c?.cau_hinh, now), khoaLaiLuc: moTamDen(c?.cau_hinh, now), khoaHetLuc: khoaDen(c?.cau_hinh, now), soDu: c ? await soDu(c.id) : 0,
    phien: ph ? { id: ph.id, muc: ph.muc, conPhut: Math.max(0, Math.ceil(ph.toi_da_phut - ph.phut_dung)) } : null,
    tz: f.tz, lechGioPhut: ts.lech_gio_phut, phienToiDa: ts.phien_toi_da, webChiChoPhep: ts.web_chi_cho_phep === 1,
  };
}

/** Ba Mẹ «Khoá ngay» / «Mở lại» (FR-02.04) — có hiệu lực ở lần đồng bộ / nhịp kế tiếp của mọi thiết bị của Con. */
/** `hoanTac`: Hoàn tác «Mở lại máy» ⇒ bật lại cờ khoá, giữ nguyên hạn khoá + mốc mở tạm ĐANG LƯU trên máy chủ (Mở lại chỉ bỏ cờ, không xoá chúng;
 *  không có cờ thì khoaGoc false nên chúng vô hiệu). Không dựa dữ liệu màn của Ba Mẹ — người khác có thể vừa đổi. Hạn đã qua ⇒ khoá lại cũng tự hết. */
export async function khoaNgay(fam: string, con: string, khoa: boolean, nguoi: string, hanVao: Date | "sang" | null = null, now = new Date(), hoanTac = false) {
  let den: Date | null = null;
  if (khoa && hoanTac) { /* Hoàn tác không cần giờ: máy chủ dùng hạn đang lưu */ }
  else if (khoa && hanVao === "sang") den = sangMaiCua((await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))?.tz ?? "Asia/Ho_Chi_Minh", now);
  else if (khoa && hanVao instanceof Date) {
    if (Number.isNaN(hanVao.getTime())) throw new LoiNghiepVu("sai_gio", "Giờ mở lại không hợp lệ", 400);
    if (!(hanVao.getTime() > now.getTime())) throw new LoiNghiepVu("sai_gio", "Giờ mở lại phải ở sau bây giờ", 400);
    den = hanVao;
  }
  // khoá mới thay hạn và xoá phần «mở tạm» của lần duyệt thêm giờ trước (yeu-cau.ts › dongY)
  const r = await q(`update children set cau_hinh = case when not $3 then cau_hinh - 'khoa_ngay'
                       when $5 then cau_hinh || '{"khoa_ngay": true}'::jsonb
                       else (cau_hinh - 'khoa_den' - 'khoa_mo_tam_den') || jsonb_strip_nulls(jsonb_build_object('khoa_ngay', true, 'khoa_den', $4::text)) end
                     where id = $1 and family_id = $2 returning id, cau_hinh as c`, [con, fam, khoa, den?.toISOString() ?? null, khoa && hoanTac]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  // Hoàn tác: ghi đúng khoá đã khôi phục; hạn đã qua thì không có gì để khoá lại ⇒ không ghi «Khoá máy» giả
  const c = (r[0] as { c: Record<string, unknown> }).c;
  if (khoa && hoanTac && !khoaGoc(c, now)) return;
  const hd = khoa && hoanTac ? khoaDen(c, now) : den?.toISOString() ?? null;
  await ghiSuKien(fam, khoa ? "khoa_ngay" : "mo_lai", { ...(hd ? { den: hd } : {}), ...(khoa && hoanTac ? { hoanTac: true } : {}) }, { con, nguoi });
}

/** «Tới sáng mai»: 7:00 kế tiếp theo múi giờ GIA ĐÌNH (không theo giờ máy Ba Mẹ — Ba Mẹ đi nước ngoài vẫn đúng giờ của Con). */
export function sangMaiCua(tz: string, now = new Date()) {
  const g = gioDiaPhuong(now, tz);
  const ngay = g.phut < 7 * 60 ? g.ngay : congNgay(g.ngay, 1);
  const t = new Date(dauNgayUtc(ngay, tz).getTime() + 7 * 3600_000);
  return new Date(t.getTime() + (7 * 60 - gioDiaPhuong(t, tz).phut) * 60_000);   // ngày đổi giờ mùa hè: nửa đêm + 7h lệch 1 giờ ⇒ chỉnh về đúng 7:00
}


// ================================================================ M4 — agent Windows (chỉ thêm; hợp đồng cũ giữ nguyên)

// ---------------------------------------------------------------- phiên web cho khung Kid (WebView2 trên máy Con)
/** Agent xin phiên Con (12 giờ) để mở màn Con web trong khung Kid — khay KHÔNG cầm token máy. */
export async function taoPhienWeb(may: May, con: string) {
  const tok = taoToken();
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1,$2,$3, now() + interval '12 hours')`, [sha(tok), con, may.id]);
  return { phienCon: tok, het: new Date(Date.now() + 12 * 3600_000).toISOString() };
}

// ---------------------------------------------------------------- sự kiện từ agent (gửi ngay hoặc gửi bù khi có mạng lại)
// Mỗi sự kiện có `ma` do agent sinh ⇒ gửi lại (hàng đợi offline) không ghi trùng. Không sự kiện nào đổi điểm / quyền.
/** Lệnh PowerShell gỡ TAY chỉ các luật AppLocker của AiiGrow (Name «AiiGrow: …») — GIỐNG HỆT
 *  agent-win SystemCleanup.LenhGoTayAppLocker (AnToan.cs). Không cần tệp nào của AiiGrow còn trên máy. */
export const LENH_GO_TAY_APPLOCKER =
  "$p=[xml](Get-AppLockerPolicy -Local -Xml -ErrorAction Stop); " +
  "@($p.AppLockerPolicy.RuleCollection.ChildNodes | ?{ $_.Name -like 'AiiGrow: *' }) | %{ [void]$_.ParentNode.RemoveChild($_) }; " +
  "$f=\"$env:TEMP\\aiigrow-applocker.xml\"; $p.Save($f); Set-AppLockerPolicy -XmlPolicy $f -ErrorAction Stop";

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
  go_loi_applocker: {
    muc: "chu_y",
    cau: (t) =>
      `Chưa gỡ được luật chặn (AppLocker) khi gỡ AiiGrow trên ${t} — AiiGrow đang thử lại. ` +
      `Gỡ tay: trên máy Con mở PowerShell bằng quyền quản trị (Run as administrator) và chạy: ${LENH_GO_TAY_APPLOCKER}`,
  },
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
// Offline, agent chỉ cho chơi tới `windows.playOfflineMinutes` (số điểm/phút đã đồng bộ — agent-windows.ts) rồi tự đóng; có mạng lại thì gửi
// `phien/bu` TRƯỚC dong-bo (nhip_cuoi còn là nhịp online cuối ⇒ đo được thời gian thật đã trôi). Máy dùng chung: Con lấy từ phiên (api-may). Máy chủ vẫn là sổ sách:
// phút bù không vượt thời gian thật đã trôi (đồng hồ máy chủ từ nhịp cuối), không vượt phút tối đa của phiên; trừ điểm không âm; `ma` một lần.
export type BuVao = { ma?: unknown; id?: unknown; muc?: unknown; phut?: unknown; batDau?: unknown; ketThuc?: unknown };

const thuongCon = async (t: Q, con: string, ngay: string, tz: string) => {
  const cho = (await t<{ p: number }>(`select coalesce(sum(phut), 0)::int as p from grants where child_id = $1 and ngay = $2 and cua_so_den is null`, [con, ngay]))[0].p;
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
             nhip_cuoi = $6::timestamptz,
             -- có phút chơi bù ⇒ phiên đang chơi (hết tạm dừng); không có ⇒ giữ mốc tạm dừng cũ (không kéo dài «tạm» thêm 3 phút)
             tam_tu = case when $2::real > 0 then null else tam_tu end,
             trang_thai = case when $7::boolean then 'ket_thuc' when $2::real > 0 then 'chay' else trang_thai end,
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
