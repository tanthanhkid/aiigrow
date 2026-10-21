// M4b kiểm soát MẠNG — phần có DB: thiết bị đi qua resolver lọc của gia đình (máy có agent + «máy con loại mạng»: TV, console),
// hồ sơ DNS theo thiết bị, chính sách DNS cho resolver, nhật ký TÓM TẮT (tên miền + đếm), báo Ba Mẹ khi thiết bị mạng vượt giờ hoặc
// không còn đi qua resolver (mất truy vấn quá `dns_mat_truy_van_phut`). Phần thuần: lib/ho-so-dns.ts, dữ liệu hướng dẫn: huong-dan-mang.ts.
import { newId, one, q } from "./db.ts";
import { SCHEMA_M4B_MANG } from "./schema.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { gioDiaPhuong } from "./gio.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import { conCua, type May } from "./gia-dinh.ts";
import { chinhSachChung } from "./chinh-sach.ts";
import { tongHop, tuanThuMay } from "./tuan-thu.ts";
import { chuanMac } from "./chuyen-doi.ts";
import { taoToken } from "./auth.ts";
import {
  LOAI_THIET_BI_DNS, chinhSachDns, chuanTenMien, hoSoAndroid, mauDohWindows, nextDns, taoMobileconfig, tuHost,
  type ChinhSachDns, type DongNhatKy, type LoaiThietBiDns, type NhaCungCapDns,
} from "./ho-so-dns.ts";
import { CHI_MOT_LAN, GIOI_HAN_DNS, HUONG_DAN_ROUTER, HUONG_DAN_TV } from "./huong-dan-mang.ts";

let coBang = false;
export async function bangMang() {
  if (coBang) return;
  for (const c of SCHEMA_M4B_MANG) await q(c);
  coBang = true;
}

export type ThietBiDns = {
  id: string; family_id: string; child_id: string | null; device_id: string | null; ten: string; loai: LoaiThietBiDns; mac: string | null;
  nhan: string; truy_van_cuoi: Date | null; mat_bao_luc: Date | null; created_at: Date;
};

const taoNhan = () => taoToken().replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10);

/** Nhà cung cấp DNS của gia đình (mặc định: tự host). NextDNS: mã hồ sơ do Ba Mẹ tự nhập; khoá API chỉ từ biến môi trường, không lưu. */
export async function nhaCungCap(fam: string): Promise<NhaCungCapDns> {
  await bangMang();
  const r = await one<{ nha_cung_cap: string; ho_so_ngoai: string | null }>(`select nha_cung_cap, ho_so_ngoai from dns_gia_dinh where family_id = $1`, [fam]);
  return r?.nha_cung_cap === "nextdns" && r.ho_so_ngoai ? nextDns({ hoSo: r.ho_so_ngoai }) : tuHost();
}

export async function datNhaCungCap(fam: string, b: { loai?: unknown; hoSo?: unknown }, nguoi: string) {
  await bangMang();
  const loai = b.loai === "nextdns" ? "nextdns" : "tu_host";
  const hoSo = loai === "nextdns" ? String(b.hoSo ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 20) : null;
  if (loai === "nextdns" && !hoSo) throw new LoiNghiepVu("thieu_ho_so", "Nhập mã hồ sơ NextDNS của Ba Mẹ (6 ký tự trong trang NextDNS)");
  await q(`insert into dns_gia_dinh(family_id, nha_cung_cap, ho_so_ngoai) values ($1,$2,$3)
           on conflict (family_id) do update set nha_cung_cap = excluded.nha_cung_cap, ho_so_ngoai = excluded.ho_so_ngoai, updated_at = now()`, [fam, loai, hoSo]);
  await ghiSuKien(fam, "dns_nha_cung_cap", { loai, hoSo }, { nguoi });
  return { loai, hoSo };
}

/** Thêm «máy con loại mạng» (TV, console…). */
export async function themThietBiMang(fam: string, b: { con?: unknown; ten?: unknown; loai?: unknown; mac?: unknown }, nguoi?: string) {
  await bangMang();
  const con = b.con ? String(b.con).slice(0, 40) : null;
  if (con) await conCua(fam, con);
  const loai = (["tv", "console", "khac"] as string[]).includes(String(b.loai)) ? (String(b.loai) as LoaiThietBiDns) : "tv";
  const ten = String(b.ten ?? "").trim().slice(0, 60) || (loai === "console" ? "Máy chơi game" : "TV");
  const id = newId();
  await q(`insert into dns_thiet_bi(id, family_id, child_id, ten, loai, mac, nhan) values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, fam, con, ten, loai, chuanMac(b.mac), taoNhan()]);
  await ghiSuKien(fam, "dns_them_thiet_bi", { ten, loai }, { con, nguoi });
  return id;
}

/** Máy có agent: một dòng dns_thiet_bi (loai agent) gắn device_id, tạo lười. */
export async function thietBiChoMay(may: Pick<May, "id" | "family_id" | "child_id" | "name">) {
  await bangMang();
  await q(`insert into dns_thiet_bi(id, family_id, child_id, device_id, ten, loai, nhan) values ($1,$2,$3,$4,$5,'agent',$6)
           on conflict (device_id) do nothing`, [newId(), may.family_id, may.child_id, may.id, may.name, taoNhan()]);
  return (await one<ThietBiDns>(`select * from dns_thiet_bi where device_id = $1`, [may.id]))!;
}

async function thietBiCua(fam: string, id: string) {
  await bangMang();
  const t = await one<ThietBiDns>(`select * from dns_thiet_bi where id = $1 and family_id = $2`, [id, fam]);
  if (!t) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  return t;
}

export async function xoaThietBiMang(fam: string, id: string, nguoi: string) {
  const t = await thietBiCua(fam, id);
  await q(`delete from dns_thiet_bi where id = $1`, [t.id]);
  await ghiSuKien(fam, "dns_xoa_thiet_bi", { ten: t.ten }, { con: t.child_id, nguoi });
}

/** Chính sách DNS cho thiết bị (resolver kéo theo nhãn). */
export async function chinhSachDnsThietBi(t: ThietBiDns, now = new Date()): Promise<ChinhSachDns> {
  const may = t.device_id ? await one<May>(`select * from devices where id = $1`, [t.device_id]) : undefined;
  const gia: May = may ?? { id: `dns:${t.id}`, child_id: t.child_id, family_id: t.family_id, platform: "android", name: t.ten, dung_chung: false,
    status: {}, last_seen: null, created_at: t.created_at };
  const tt = may ? await tuanThuMay(may, now) : tongHop([], 0, null, now);
  const cs = await chinhSachChung(gia, gia.child_id, tt, now);
  return chinhSachDns(cs, { nhan: t.nhan, ten: t.ten, loai: t.loai });
}

export async function chinhSachTheoNhan(nhan: string, now = new Date()) {
  await bangMang();
  const t = await one<ThietBiDns>(`select * from dns_thiet_bi where nhan = $1`, [String(nhan ?? "")]);
  if (!t) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  return chinhSachDnsThietBi(t, now);
}

/** Hồ sơ DNS gia đình cho một thiết bị: .mobileconfig, Private DNS Android, mẫu DoH Windows, DNS thường (IP) cho router / TV. */
export async function hoSoDns(t: ThietBiDns) {
  const ncc = await nhaCungCap(t.family_id);
  const d = ncc.diemCuoi(t);
  const f = (await one<{ ten: string }>(`select ten from families where id = $1`, [t.family_id]))!;
  return {
    thietBi: { id: t.id, ten: t.ten, loai: t.loai, nhan: t.nhan }, nhaCungCap: ncc.loai, diemCuoi: d,
    apple: { mobileconfig: taoMobileconfig({ nhan: t.nhan, tenThietBi: t.ten, tenGiaDinh: f.ten, dohUrl: d.dohUrl }), tep: `AiiGrow-DNS-${t.nhan}.mobileconfig` },
    android: hoSoAndroid(d), windows: mauDohWindows(d),
    dnsThuong: { ipv4: d.ipv4, ghiChu: d.ghiChu, chiMotLan: CHI_MOT_LAN },
  };
}

export const hoSoDnsThietBi = async (fam: string, id: string) => hoSoDns(await thietBiCua(fam, id));

export async function dayChinhSach(fam: string, id: string) {
  const t = await thietBiCua(fam, id);
  return (await nhaCungCap(fam)).dayChinhSach(await chinhSachDnsThietBi(t));
}

// ---------------------------------------------------------------- nhật ký tóm tắt + báo Ba Mẹ
/** Resolver gửi nhật ký tóm tắt (webhook / adapter NextDNS). Chỉ tên miền + số lần; gửi lại cùng lô cộng dồn theo lần gửi (resolver gửi phần mới). */
export async function nhanNhatKy(nhan: string, ds: unknown, now = new Date()) {
  await bangMang();
  const t = await one<ThietBiDns>(`select * from dns_thiet_bi where nhan = $1`, [String(nhan ?? "")]);
  if (!t) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const f = (await one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [t.family_id]))!;
  const c = t.child_id ? await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [t.child_id]) : undefined;
  const ts = thamSo(f.cau_hinh, c?.cau_hinh);
  const ngay = gioDiaPhuong(now, f.tz).ngay;
  const so = (v: unknown) => Math.max(0, Math.min(1_000_000, Math.round(Number(v) || 0)));
  let n = 0;
  for (const x of (Array.isArray(ds) ? ds : []).slice(0, 2000) as Partial<DongNhatKy>[]) {
    const tm = chuanTenMien(x?.tenMien);
    if (!/^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/.test(tm)) continue;
    await q(`insert into dns_nhat_ky(thiet_bi_id, ngay, ten_mien, so_lan, so_lan_chan, ngoai_gio) values ($1,$2,$3,$4,$5,$6)
             on conflict (thiet_bi_id, ngay, ten_mien) do update set so_lan = dns_nhat_ky.so_lan + excluded.so_lan,
             so_lan_chan = dns_nhat_ky.so_lan_chan + excluded.so_lan_chan, ngoai_gio = dns_nhat_ky.ngoai_gio + excluded.ngoai_gio`,
      [t.id, ngay, tm, so(x.soLan), so(x.soLanChan), so(x.ngoaiGio)]);
    n++;
  }
  const traLai = t.mat_bao_luc && (!t.truy_van_cuoi || new Date(t.mat_bao_luc) >= new Date(t.truy_van_cuoi));
  await q(`update dns_thiet_bi set truy_van_cuoi = $2 where id = $1`, [t.id, now]);
  const o = { con: t.child_id, may: t.device_id };
  if (traLai) await ghiSuKien(t.family_id, "dns_tro_lai", { ten: t.ten }, o);
  // vượt giờ: số truy vấn ngoài lịch mở trong ngày ≥ ngưỡng ⇒ báo một lần / ngày / thiết bị
  const ng = (await one<{ s: number }>(`select coalesce(sum(ngoai_gio), 0)::int as s from dns_nhat_ky where thiet_bi_id = $1 and ngay = $2`, [t.id, ngay]))!.s;
  if (t.loai !== "agent" && ng >= ts.dns_vuot_gio_nguong)
    await canhBao(t.family_id, "dns_vuot_gio", "chu_y", `${t.ten} đang được dùng ngoài giờ chơi (${ng} lượt truy cập bị chặn hôm nay)`,
      { ...o, khoa: `dns_vuot_gio:${t.id}:${ngay}`, chiTiet: { ngoaiGio: ng } });
  return n;
}

/** Thiết bị đã từng đi qua resolver mà im lặng quá ngưỡng ⇒ báo MỘT lần mỗi lần mất (có thể TV tắt, hoặc DNS bị đổi tay). */
export async function quetMatTruyVan(fam: string | null, now = new Date()) {
  await bangMang();
  const ds = await q<ThietBiDns & { fcfg: Record<string, unknown> }>(
    `select t.*, f.cau_hinh as fcfg from dns_thiet_bi t join families f on f.id = t.family_id
     where ($1::text is null or t.family_id = $1) and t.truy_van_cuoi is not null`, [fam]);
  const moi: string[] = [];
  for (const t of ds) {
    const ts = thamSo(t.fcfg);
    const cuoi = new Date(t.truy_van_cuoi!);
    if (now.getTime() - cuoi.getTime() <= ts.dns_mat_truy_van_phut * 60_000) continue;
    if (t.mat_bao_luc && new Date(t.mat_bao_luc) >= cuoi) continue;
    const phut = Math.round((now.getTime() - cuoi.getTime()) / 60_000);
    await canhBao(t.family_id, "dns_mat_truy_van", "chu_y",
      `${t.ten} đã ${phut} phút không đi qua bộ lọc DNS gia đình — nếu thiết bị đang bật, có thể DNS đã bị đổi`,
      { con: t.child_id, may: t.device_id, khoa: `dns_mat:${t.id}:${cuoi.getTime()}`, chiTiet: { phut } });
    await q(`update dns_thiet_bi set mat_bao_luc = $2 where id = $1`, [t.id, now]);
    await ghiSuKien(t.family_id, "dns_mat_truy_van", { ten: t.ten, phut }, { con: t.child_id, may: t.device_id });
    moi.push(t.id);
  }
  return moi;
}

export async function dsThietBiDns(fam: string, now = new Date()) {
  await quetMatTruyVan(fam, now);
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]))!;
  const ts = thamSo(f.cau_hinh);
  const ds = await q<ThietBiDns>(`select * from dns_thiet_bi where family_id = $1 order by created_at`, [fam]);
  return ds.map((t) => ({
    id: t.id, ten: t.ten, loai: t.loai, con: t.child_id, mayId: t.device_id, mac: t.mac, nhan: t.nhan,
    truyVanCuoi: t.truy_van_cuoi ? new Date(t.truy_van_cuoi).toISOString() : null,
    trangThai: !t.truy_van_cuoi ? "chua_thay" : now.getTime() - new Date(t.truy_van_cuoi).getTime() > ts.dns_mat_truy_van_phut * 60_000 ? "mat_truy_van" : "qua_bo_loc",
  }));
}

/** Nhật ký tóm tắt một ngày (mặc định hôm nay): tên miền + số lần, nhiều nhất trước. */
export async function tomTatNhatKy(fam: string, id: string, ngay?: string | null) {
  const t = await thietBiCua(fam, id);
  const f = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))!;
  const d = ngay && /^\d{4}-\d{2}-\d{2}$/.test(ngay) ? ngay : gioDiaPhuong(new Date(), f.tz).ngay;
  const ds = await q<{ ten_mien: string; so_lan: number; so_lan_chan: number; ngoai_gio: number }>(
    `select ten_mien, so_lan, so_lan_chan, ngoai_gio from dns_nhat_ky where thiet_bi_id = $1 and ngay = $2 order by so_lan desc, ten_mien limit 100`, [t.id, d]);
  return { ngay: d, thietBi: { id: t.id, ten: t.ten }, ds: ds.map((x) => ({ tenMien: x.ten_mien, soLan: x.so_lan, soLanChan: x.so_lan_chan, ngoaiGio: x.ngoai_gio })),
    tong: ds.reduce((s, x) => s + x.so_lan, 0) };
}

export const huongDanMang = () => ({ chiMotLan: CHI_MOT_LAN, router: HUONG_DAN_ROUTER, tv: HUONG_DAN_TV, gioiHan: GIOI_HAN_DNS, loaiThietBi: LOAI_THIET_BI_DNS });
