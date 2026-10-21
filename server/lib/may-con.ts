// Đồng bộ thiết bị Con (agent) ↔ máy chủ: agent gửi trạng thái + phút dùng theo mục, nhận Policy để thực thi (FR-02, FR-01.05, BRD 6.7).
// Giờ thật luôn là giờ MÁY CHỦ (`serverTime`); agent gửi `clientTime` để máy chủ đo lệch — lệch quá `lech_gio_phut` ⇒ Policy khoá phần
// giải trí (`gioMaySai`) và báo Ba Mẹ một lần mỗi ngày. Nhãn ngày phút dùng tin theo giờ máy chủ (cách AiiControl #38: «hôm nay theo đồng hồ
// máy» quy về hôm nay thật; ngày tương lai ⇒ hôm nay; cũ hơn 35 ngày bỏ).
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { lichCua, thamSo } from "./cau-hinh.ts";
import { congNgay, gioDiaPhuong } from "./gio.ts";
import { ALLOWLIST_HE_THONG, dsLuat, phanLoai } from "./luat-app.ts";
import { giaPhut, phienDang } from "./phien.ts";
import { soDu } from "./vi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import type { May } from "./gia-dinh.ts";

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
};

export async function taoPolicy(may: May, con: string | null, o: { gioMaySai: boolean }, now = new Date()): Promise<Policy> {
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [may.family_id]))!;
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
    allowlistHeThong: ALLOWLIST_HE_THONG,
    luat: [...theoMuc.values()].map((l) => ({ muc: l.muc, loai: l.loai, nhom: l.loai === "giai_tri" ? l.nhom : null,
      giaPhanNghin: l.loai === "giai_tri" ? giaPhut(ts, l.nhom) : null })),
    lich: lichCua(c?.lich as never), khoaNgay: c?.cau_hinh?.khoa_ngay === true, soDu: c ? await soDu(c.id) : 0,
    phien: ph ? { id: ph.id, muc: ph.muc, conPhut: Math.max(0, Math.ceil(ph.toi_da_phut - ph.phut_dung)) } : null,
  };
}

/** Ba Mẹ «Khoá ngay» / «Mở lại» (FR-02.04) — có hiệu lực ở lần đồng bộ / nhịp kế tiếp của mọi thiết bị của Con. */
export async function khoaNgay(fam: string, con: string, khoa: boolean, nguoi: string) {
  const r = await q(`update children set cau_hinh = case when $3 then cau_hinh || '{"khoa_ngay": true}'::jsonb else cau_hinh - 'khoa_ngay' end
                     where id = $1 and family_id = $2 returning id`, [con, fam, khoa]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  await ghiSuKien(fam, khoa ? "khoa_ngay" : "mo_lai", {}, { con, nguoi });
}
