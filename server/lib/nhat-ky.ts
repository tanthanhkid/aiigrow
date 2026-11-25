// Nhật ký hoạt động (FR-06.04: mọi sự kiện, ai, lúc nào) + cảnh báo cho Ba Mẹ (FR-07.02: mức Thông tin / Chú ý / Nghiêm trọng).
// Cảnh báo có `khoa` thì chỉ ghi MỘT lần cho mỗi khoá (vd «một lần mỗi tuần cho mỗi Con») — không spam Ba Mẹ.
import { newId, q, type Q } from "./db.ts";
import { canSuaCanhBao, LOAI_CHI_BIET } from "./hien-thi-may.ts";

export async function ghiSuKien(fam: string, loai: string, chiTiet: Record<string, unknown> = {},
  o: { con?: string | null; may?: string | null; nguoi?: string | null } = {}, t: Q = q) {
  await t(`insert into events(id, family_id, child_id, device_id, loai, chi_tiet, nguoi) values ($1,$2,$3,$4,$5,$6::text::jsonb,$7)`,
    [newId(), fam, o.con ?? null, o.may ?? null, loai, JSON.stringify(chiTiet), o.nguoi ?? null]);
}

type MucCanhBao = "thong_tin" | "chu_y" | "nghiem_trong";

/** Ghi cảnh báo. → true nếu ghi mới (khoá trùng ⇒ false, không ghi lại). */
export async function canhBao(fam: string, loai: string, muc: MucCanhBao, noiDung: string,
  o: { con?: string | null; may?: string | null; khoa?: string; chiTiet?: Record<string, unknown> } = {}, t: Q = q) {
  const r = await t(
    `insert into alerts(id, family_id, child_id, device_id, loai, muc, noi_dung, chi_tiet, khoa) values ($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9)
     on conflict (family_id, khoa) where khoa is not null do nothing returning id`,
    [newId(), fam, o.con ?? null, o.may ?? null, loai, muc, noiDung, JSON.stringify(o.chiTiet ?? {}), o.khoa ?? null]);
  return r.length > 0;
}

type DongCanhBao = { id: string; child_id: string | null; device_id: string | null; loai: string; muc: MucCanhBao; noi_dung: string; chi_tiet: Record<string, unknown>; da_doc: boolean; created_at: Date };

/** #657: cùng loại + cùng nội dung + cùng Con chỉ hiện một dòng (mới nhất) — «Đã xoá hẳn DESKTOP-…» không lặp 3 lần. Thuần, test được. */
export function boLapCanhBao<T extends { loai: string; noi_dung: string; child_id: string | null; created_at: Date | string }>(ds: T[]): T[] {
  const co = new Set<string>();
  return [...ds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((x) => { const k = `${x.loai}|${x.noi_dung}|${x.child_id ?? ""}`; if (co.has(k)) return false; co.add(k); return true; });
}

/** Danh sách cảnh báo (đã bỏ lặp) kèm `canSua` (hien-thi-may.ts › canSuaCanhBao — MỘT nguồn số «cần sửa») và `chiBiet`. */
export async function dsCanhBao(fam: string, chiChuaDoc = false, now = new Date()) {
  const ds = await q<DongCanhBao>(
    `select id, child_id, device_id, loai, muc, noi_dung, chi_tiet, da_doc, created_at from alerts where family_id = $1 ${chiChuaDoc ? "and not da_doc" : ""}
     order by created_at desc limit 100`, [fam]);
  return boLapCanhBao(ds).map((x) => ({ ...x, canSua: canSuaCanhBao(x, now), chiBiet: LOAI_CHI_BIET.includes(x.loai) }));
}

export const dsSuKien = (fam: string, con?: string | null, gioiHan = 100) =>
  q<{ loai: string; child_id: string | null; chi_tiet: Record<string, unknown>; nguoi: string | null; created_at: Date }>(
    `select loai, child_id, chi_tiet, nguoi, created_at from events where family_id = $1 and ($2::text is null or child_id = $2)
     order by created_at desc, seq desc limit $3`, [fam, con ?? null, gioiHan]);
