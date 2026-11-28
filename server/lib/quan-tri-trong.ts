// #861 (thuộc #857): máy Con Windows còn tài khoản quản trị chưa có mật khẩu / PIN ⇒ bé tự vào tài khoản đó (hoặc bấm «Có» ở UAC) và gỡ được AiiGrow.
// Hợp đồng agent: POST /api/device/dong-bo › `status.quanTriTrong?: string[]` — tên tài khoản quản trị trống mật khẩu; `[]` = đã ổn;
// không có trường = agent cũ ⇒ không đổi gì. Danh sách lưu theo máy trong devices.status (dongBo gộp status) — trang máy đọc từ đó.
// Cảnh báo `quan_tri_trong_mat_khau` (chú ý) MỘT dòng mỗi máy (khoá `quan_tri_trong:<máy>`); danh sách đổi ⇒ cập nhật nội dung dòng đó;
// agent báo rỗng ⇒ dòng tự hết (đánh dấu đã đọc + bỏ khoá, lần sau còn trống lại ⇒ cảnh báo mới).
import { newId, q, type Q } from "./db.ts";
import { ghiSuKien } from "./nhat-ky.ts";

export const LOAI_QUAN_TRI_TRONG = "quan_tri_trong_mat_khau";
const khoaQtt = (mayId: string) => `quan_tri_trong:${mayId}`;

/** Chuẩn hoá trường agent gửi. → null = không có trường (agent cũ, không đổi trạng thái) · [] = đã ổn · danh sách tên (bỏ trùng, tối đa 20). */
export function docQuanTriTrong(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const ds: string[] = [];
  for (const x of v) {
    const t = typeof x === "string" ? x.trim().slice(0, 64) : "";
    if (t && !ds.includes(t)) ds.push(t);
  }
  return ds.slice(0, 20);
}

/** Danh sách tài khoản quản trị trống mật khẩu agent báo gần nhất (devices.status). Agent chưa báo ⇒ []. */
export const quanTriTrongCua = (may: { status?: Record<string, unknown> | null }): string[] => docQuanTriTrong(may.status?.quanTriTrong) ?? [];

/** Câu cảnh báo (trang máy + «Cần Ba Mẹ để ý» dùng chung). */
export const cauQuanTriTrong = (tenMay: string, ds: readonly string[]) =>
  `${tenMay}: tài khoản quản trị chưa có mật khẩu — bé có thể tự vào và gỡ AiiGrow (${ds.join(", ")})`;

/** Gọi sau khi dongBo lưu status. `ds` = docQuanTriTrong(b.status?.quanTriTrong) — null thì không làm gì. */
export async function capNhatCanhBaoQuanTri(may: { id: string; family_id: string; name: string; child_id: string | null }, ds: string[] | null, t: Q = q) {
  if (ds === null) return;
  if (!ds.length) {
    const het = await t(`update alerts set da_doc = true, khoa = null where family_id = $1 and khoa = $2 returning id`, [may.family_id, khoaQtt(may.id)]);
    if (het.length) await ghiSuKien(may.family_id, "quan_tri_co_mat_khau", {}, { con: may.child_id, may: may.id }, t);
    return;
  }
  const noiDung = cauQuanTriTrong(may.name, ds);
  // cùng khoá ⇒ một dòng mỗi máy; danh sách đổi ⇒ sửa nội dung (giữ trạng thái đọc — Ba Mẹ đã xem thì không nhắc lại vì đổi tên tài khoản)
  const r = await t<{ moi: boolean }>(
    `insert into alerts(id, family_id, child_id, device_id, loai, muc, noi_dung, chi_tiet, khoa) values ($1,$2,$3,$4,$5,'chu_y',$6,$7::text::jsonb,$8)
     on conflict (family_id, khoa) where khoa is not null do update set noi_dung = excluded.noi_dung, chi_tiet = excluded.chi_tiet
       where alerts.noi_dung is distinct from excluded.noi_dung
     returning (xmax = 0) as moi`,
    [newId(), may.family_id, may.child_id, may.id, LOAI_QUAN_TRI_TRONG, noiDung, JSON.stringify({ taiKhoan: ds }), khoaQtt(may.id)]);
  if (r[0]?.moi) await ghiSuKien(may.family_id, "quan_tri_trong_mat_khau", { taiKhoan: ds }, { con: may.child_id, may: may.id }, t);
}
