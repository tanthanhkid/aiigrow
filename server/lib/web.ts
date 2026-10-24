// Giám sát + lọc WEB trên máy Con (Windows trước). Ba phần cùng một kho luật:
//   1) agent đọc LỊCH SỬ trình duyệt của Con rồi gửi về TỔNG theo (ngày, tên miền): số lần mở + số giây ở trang  → POST /api/device/web/lich-su
//   2) Ba Mẹ xem THỐNG KÊ (top trang, theo ngày) và đặt từng trang Cho phép / Chặn / Mặc định         → GET/POST /api/m/con/:id/web…
//   3) máy chủ dịch luật tên miền sang `windows.web` (lib/agent-windows.ts) để agent ghi chính sách Chrome/Edge (URLBlocklist/URLAllowlist).
// Kho luật là app_rules sẵn có (muc = tên miền): Cho phép = loai «hoc», Chặn = «chan», «Giải trí» = giai_tri (mở khi có phiên điểm đúng trang).
// Chỉ lưu TÊN MIỀN GỐC (bỏ www) + đếm — không URL, không tiêu đề, không nội dung (đúng cam kết riêng tư của nhật ký DNS).
import { coTacTu } from "./chuyen-doi.ts";
import { q } from "./db.ts";
import { congNgay, gioDiaPhuong } from "./gio.ts";
import { allowlistHieuLuc, chuanMuc, datLuat, phanLoai } from "./luat-app.ts";
import { kieuMuc } from "./chinh-sach.ts";
import { LoiNghiepVu } from "./loi.ts";
import { cheDoCua } from "./lenh-may.ts";
import type { May } from "./gia-dinh.ts";
import type { Policy } from "./may-con.ts";

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const TEN_MIEN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
export const GIU_NGAY = 90;
const TOI_DA_MOT_LAN = 500;

export type DongWeb = { ngay?: unknown; tenMien?: unknown; soLan?: unknown; giay?: unknown; lanCuoi?: unknown };

/** Tên miền hợp lệ (không IP, không localhost) hoặc null. */
export function tenMienSach(v: unknown): string | null {
  const m = chuanMuc(v);
  return m.length <= 100 && TEN_MIEN.test(m) && !/^\d+(\.\d+)+$/.test(m) ? m : null;
}

/** Agent gửi TỔNG của ngày theo từng tên miền (gửi lại bao nhiêu lần cũng không cộng đôi: lấy giá trị lớn hơn). */
export async function nhanLichSuWeb(may: May, con: string | null, ds: unknown, now = new Date()) {
  if (!Array.isArray(ds)) return { nhan: 0 };
  const f = (await q<{ tz: string }>(`select tz from families where id = $1`, [may.family_id]))[0];
  const hom = gioDiaPhuong(now, f?.tz ?? "Asia/Ho_Chi_Minh").ngay;
  let n = 0;
  for (const x of (ds as DongWeb[]).slice(0, TOI_DA_MOT_LAN)) {
    const ngay = String(x?.ngay ?? "");
    const mien = tenMienSach(x?.tenMien);
    if (!NGAY.test(ngay) || !mien || ngay > congNgay(hom, 1) || ngay < congNgay(hom, -35)) continue;
    const soLan = Math.max(0, Math.min(100_000, Math.round(Number(x.soLan) || 0)));
    const giay = Math.max(0, Math.min(86_400, Math.round(Number(x.giay) || 0)));
    const lc = x.lanCuoi ? new Date(String(x.lanCuoi)) : null;
    const lanCuoi = lc && Number.isFinite(lc.getTime()) && lc.getTime() <= now.getTime() + 3_600_000 ? lc : null;
    await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, lan_cuoi) values ($1,$2,$3,$4,$5,$6,$7)
             on conflict (device_id, ngay, ten_mien) do update set so_lan = greatest(web_nhat_ky.so_lan, excluded.so_lan),
               giay = greatest(web_nhat_ky.giay, excluded.giay), child_id = coalesce(excluded.child_id, web_nhat_ky.child_id),
               lan_cuoi = greatest(web_nhat_ky.lan_cuoi, excluded.lan_cuoi)`,
      [may.id, con, ngay, mien, soLan, giay, lanCuoi]);
    n++;
  }
  await q(`delete from web_nhat_ky where device_id = $1 and ngay < $2`, [may.id, congNgay(hom, -GIU_NGAY)]);
  return { nhan: n };
}

export type TrangThaiTrang = "cho_phep" | "chan" | "giai_tri" | "he_thong" | "chua_xep";
export type TrangWeb = { tenMien: string; giay: number; soLan: number; lanCuoi: string | null; trangThai: TrangThaiTrang; nguon: "he_thong" | "con" | "gia_dinh" | null };

const doiLoai = (l: string): TrangThaiTrang => (l === "hoc" ? "cho_phep" : l === "chan" ? "chan" : l === "giai_tri" ? "giai_tri" : l === "he_thong" ? "he_thong" : "chua_xep");

/** Thống kê web của một Con trong `soNgay` ngày gần nhất (gồm hôm nay) + các luật tên miền đang áp. */
export async function thongKeWeb(fam: string, con: string, soNgay = 7, now = new Date()) {
  const sn = Math.max(1, Math.min(30, Math.round(soNgay) || 7));
  const f = (await q<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))[0];
  const hom = gioDiaPhuong(now, f?.tz ?? "Asia/Ho_Chi_Minh").ngay;
  const tu = congNgay(hom, -(sn - 1));
  const dong = await q<{ ngay: string; ten_mien: string; so_lan: number; giay: number; lan_cuoi: Date | null }>(
    `select w.ngay, w.ten_mien, sum(w.so_lan)::int as so_lan, sum(w.giay)::int as giay, max(w.lan_cuoi) as lan_cuoi
       from web_nhat_ky w left join devices d on d.id = w.device_id
      where (w.child_id = $1 or (w.child_id is null and d.child_id = $1)) and d.family_id = $2 and w.ngay >= $3
      group by w.ngay, w.ten_mien`, [con, fam, tu]);
  const theoNgayMap = new Map<string, { giay: number; soLan: number; soTrang: number }>();
  for (let i = 0; i < sn; i++) theoNgayMap.set(congNgay(tu, i), { giay: 0, soLan: 0, soTrang: 0 });
  const theoMien = new Map<string, { giay: number; soLan: number; lanCuoi: Date | null }>();
  for (const r of dong) {
    const n = theoNgayMap.get(r.ngay); if (n) { n.giay += r.giay; n.soLan += r.so_lan; n.soTrang++; }
    const m = theoMien.get(r.ten_mien) ?? { giay: 0, soLan: 0, lanCuoi: null };
    m.giay += r.giay; m.soLan += r.so_lan;
    if (r.lan_cuoi && (!m.lanCuoi || r.lan_cuoi > m.lanCuoi)) m.lanCuoi = new Date(r.lan_cuoi);
    theoMien.set(r.ten_mien, m);
  }
  const trang: TrangWeb[] = [];
  for (const [tenMien, m] of theoMien) {
    const pl = await phanLoai(fam, con, tenMien);
    trang.push({ tenMien, giay: m.giay, soLan: m.soLan, lanCuoi: m.lanCuoi ? m.lanCuoi.toISOString() : null, trangThai: doiLoai(pl.loai), nguon: pl.nguon });
  }
  trang.sort((a, b) => b.giay - a.giay || b.soLan - a.soLan || a.tenMien.localeCompare(b.tenMien));
  const luat = (await q<{ child_id: string; muc: string; loai: string }>(
    `select child_id, muc, loai from app_rules where family_id = $1 and child_id in ('', $2) and (het is null or het > $3) order by muc`, [fam, con, now]))
    .filter((r) => kieuMuc(r.muc) === "web")
    .map((r) => ({ tenMien: r.muc, trangThai: doiLoai(r.loai), nguon: r.child_id ? "con" as const : "gia_dinh" as const }));
  const c = (await q<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))[0];
  const chiChoPhep = Number(c?.cau_hinh?.web_chi_cho_phep ?? f?.cau_hinh?.web_chi_cho_phep ?? 0) === 1;
  const ngayDs = [...theoNgayMap.entries()].map(([ngay, v]) => ({ ngay, ...v }));
  const homNay = theoNgayMap.get(hom) ?? { giay: 0, soLan: 0, soTrang: 0 };
  const may = await q<{ id: string; name: string; platform: string; last_seen: Date | null; che_do: string; che_do_ba_me: boolean; status: Record<string, unknown> | null }>(
    `select id, name, platform, last_seen, che_do, che_do_ba_me, status from devices where family_id = $1 and (child_id = $2 or dung_chung)`, [fam, con]);
  return {
    soNgay: sn, homNay, theoNgay: ngayDs, tongGiay: ngayDs.reduce((a, x) => a + x.giay, 0), top: trang.slice(0, 30), tatCa: trang.length, luat,
    cheDoWeb: chiChoPhep ? "chi_cho_phep" as const : "mo" as const,
    heThong: allowlistHieuLuc().filter((x) => kieuMuc(x) === "web"),
    // chỉ máy có tác tử (Windows/Mac) lọc được web; Ba Mẹ cần biết có máy nào thực thi và đang ở chế độ nào
    mayLoc: may.filter((m) => coTacTu(m.platform)).map((m) => ({ id: m.id, ten: m.name, cheDo: cheDoCua(m as never) ?? "giam-sat", lanCuoi: m.last_seen ? new Date(m.last_seen).toISOString() : null })),
  };
}

/** Ba Mẹ đặt một trang: cho_phep | chan | mac_dinh (bỏ luật). `con` '' = cả gia đình. */
export async function datTrangWeb(fam: string, con: string, b: { muc?: unknown; trangThai?: unknown }) {
  const muc = tenMienSach(b.muc);
  if (!muc) throw new LoiNghiepVu("ten_mien_sai", "Nhập tên miền dạng ten.com (không cần https://)");
  const tt = String(b.trangThai ?? "");
  if (tt === "mac_dinh") {
    await q(`delete from app_rules where family_id = $1 and child_id = $2 and muc = $3`, [fam, con, muc]);
    return { muc, trangThai: "mac_dinh" as const };
  }
  if (tt !== "cho_phep" && tt !== "chan") throw new LoiNghiepVu("trang_thai_sai", "Chọn Cho phép, Chặn hoặc Mặc định");
  await datLuat(fam, { con, muc, ten: muc, loai: tt === "cho_phep" ? "hoc" : "chan" });
  return { muc, trangThai: tt };
}

// ---------------------------------------------------------------- dịch sang agent Windows

export type ChinhSachWeb = {
  /** mo: chỉ chặn trang trong `chan` · chi_cho_phep: chặn tất cả trừ `cho`. */
  cheDo: "mo" | "chi_cho_phep";
  /** Tên miền chặn (gồm tên miền con). */
  chan: string[];
  /** Tên miền luôn mở (đè `chan` khi cụ thể hơn): Allowlist hệ thống + trang Cho phép + trang Giải trí đang có phiên điểm. */
  cho: string[];
  /** Các mục trong `cho` chỉ mở nhờ cửa sổ «mở» có hạn (grantEndsAt) — agent chặn lại khi hết hạn lúc mất mạng. Agent cũ bỏ qua. */
  choKhiMo?: string[];
};

/** Hàm THUẦN: Policy ⇒ chính sách web cho agent. Giải trí (giai_tri) bị chặn trừ khi đang có phiên chơi bằng điểm đúng trang đó. */
export function chinhSachWebCho(p: Pick<Policy, "luat" | "allowlistHeThong" | "phien" | "webChiChoPhep">, o: { moGiaiTri?: boolean } = {}): ChinhSachWeb {
  const web = p.luat.filter((l) => kieuMuc(l.muc) === "web");
  const phien = p.phien?.muc?.toLowerCase() ?? "";
  // moGiaiTri: Ba Mẹ đang «mở» có hạn (mở khẩn cấp / thêm giờ — agent-windows.ts) ⇒ mọi trang Giải trí mở, trang «chan» vẫn chặn.
  const mo = (m: string) => !!o.moGiaiTri || phien === m.toLowerCase() || (phien !== "" && phien.endsWith("." + m.toLowerCase()));
  const chan = web.filter((l) => l.loai === "chan" || (l.loai === "giai_tri" && !mo(l.muc))).map((l) => l.muc.toLowerCase());
  const cho = [...p.allowlistHeThong.filter((x) => kieuMuc(x) === "web").map((x) => x.toLowerCase()),
    ...web.filter((l) => l.loai === "hoc" || (l.loai === "giai_tri" && mo(l.muc))).map((l) => l.muc.toLowerCase())];
  // choKhiMo: trang Giải trí chỉ mở NHỜ cửa sổ «mở» có hạn ⇒ agent tự chặn lại khi grantEndsAt qua mà máy đang mất mạng
  const theoPhien = (m: string) => phien === m.toLowerCase() || (phien !== "" && phien.endsWith("." + m.toLowerCase()));
  const choKhiMo = o.moGiaiTri ? web.filter((l) => l.loai === "giai_tri" && !theoPhien(l.muc)).map((l) => l.muc.toLowerCase()) : [];
  return { cheDo: p.webChiChoPhep ? "chi_cho_phep" : "mo", chan: [...new Set(chan)].sort(), cho: [...new Set(cho)].sort(),
    ...(choKhiMo.length ? { choKhiMo: [...new Set(choKhiMo)].sort() } : {}) };
}
