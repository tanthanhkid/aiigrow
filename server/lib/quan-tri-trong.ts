// #861 (thuộc #857): máy Con Windows còn tài khoản quản trị chưa có mật khẩu / PIN ⇒ bé tự vào tài khoản đó (hoặc bấm «Có» ở UAC) và gỡ được AiiGrow.
// Hợp đồng agent: POST /api/device/dong-bo › `status.quanTriTrong?: string[]` — tên tài khoản quản trị trống mật khẩu; `[]` = đã ổn;
// không có trường = agent cũ ⇒ không đổi gì. Danh sách lưu theo máy trong devices.status (dongBo gộp status) — trang máy đọc từ đó.
// Cảnh báo `quan_tri_trong_mat_khau` (chú ý, chỉ để biết, khoá `quan_tri_trong:<máy>`) MỘT dòng mỗi máy (danh sách đổi ⇒ sửa nội dung);
// agent báo rỗng ⇒ dòng đó đánh dấu đã đọc + bỏ khoá (lần sau còn trống lại ⇒ cảnh báo mới). «Cần Ba Mẹ để ý» tính từ trạng thái máy (can-de-y.ts).
import { q, type Q } from "./db.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";

export const LOAI_QUAN_TRI_TRONG = "quan_tri_trong_mat_khau";
const khoaQtt = (mayId: string) => `quan_tri_trong:${mayId}`;

/** Chuẩn hoá trường agent gửi. → null = không có trường (agent cũ, không đổi trạng thái) · [] = đã ổn · danh sách tên (bỏ trùng, tối đa 20). */
export function docQuanTriTrong(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const ds: string[] = [];
  for (const x of v) {
    if (ds.length >= 20) break;
    const t = typeof x === "string" ? x.trim().slice(0, 64) : "";
    if (t && !ds.includes(t)) ds.push(t);
  }
  return ds;
}

/** Danh sách tài khoản quản trị trống mật khẩu agent báo gần nhất (devices.status). Agent chưa báo ⇒ []. */
export const quanTriTrongCua = (may: { status?: Record<string, unknown> | null }): string[] => docQuanTriTrong(may.status?.quanTriTrong) ?? [];

/** Danh sách còn hiệu lực để HIỂN THỊ (trang máy, «Cần Ba Mẹ để ý»): chỉ máy Windows, máy im quá 7 ngày ⇒ thôi nhắc (không còn biết đúng sai). */
export const quanTriTrongHieuLuc = (may: { platform: string; last_seen: Date | string | null; status?: Record<string, unknown> | null }, now: Date): string[] =>
  may.platform === "windows" && may.last_seen && now.getTime() - new Date(may.last_seen).getTime() <= 7 * 86_400_000 ? quanTriTrongCua(may) : [];

/** Câu cảnh báo (cảnh báo ghi + «Cần Ba Mẹ để ý»). */
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
  const moi = await canhBao(may.family_id, LOAI_QUAN_TRI_TRONG, "chu_y", cauQuanTriTrong(may.name, ds),
    { con: may.child_id, may: may.id, khoa: khoaQtt(may.id), chiTiet: { taiKhoan: ds, mayId: may.id } }, t);
  // đã có cảnh báo đang mở ⇒ danh sách / tên máy đổi thì sửa nội dung (màn Cảnh báo đọc đúng danh sách mới nhất)
  // Ba Mẹ đã đọc rồi mà danh sách đổi (vd thêm tài khoản mới) ⇒ hiện lại là chưa đọc
  if (!moi) await t(`update alerts set noi_dung = $3, chi_tiet = $4::text::jsonb, da_doc = false where family_id = $1 and khoa = $2 and noi_dung is distinct from $3`,
    [may.family_id, khoaQtt(may.id), cauQuanTriTrong(may.name, ds), JSON.stringify({ taiKhoan: ds, mayId: may.id })]);
  if (moi) await ghiSuKien(may.family_id, "quan_tri_trong_mat_khau", { taiKhoan: ds }, { con: may.child_id, may: may.id }, t);
}
