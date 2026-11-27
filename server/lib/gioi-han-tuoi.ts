// #751: trang web giới hạn 13+ (TikTok, YouTube, Instagram, Facebook, Discord…). Ba Mẹ cho phép (thêm vào danh sách, duyệt lời xin) một trang trong
// danh sách này cho bé dưới 13 tuổi ⇒ máy chủ trả 409 `can_xac_nhan_tuoi` kèm cảnh báo; app hỏi lại, Ba Mẹ vẫn xác nhận tiếp được (gửi `xacNhanTuoi: true`).
import { one } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export const TUOI_TOI_THIEU = 13;
/** Tên miền gốc (gồm mọi tên miền con) ⇒ tên hiển thị. */
const TRANG_13: [ten: string, mien: string[]][] = [
  ["TikTok", ["tiktok.com", "tiktokv.com"]],
  ["YouTube", ["youtube.com", "youtu.be"]],
  ["Instagram", ["instagram.com"]],
  ["Facebook", ["facebook.com", "fb.com", "messenger.com"]],
  ["Discord", ["discord.com", "discord.gg", "discordapp.com"]],
  ["Snapchat", ["snapchat.com"]],
  ["X (Twitter)", ["twitter.com", "x.com"]],
  ["Twitch", ["twitch.tv"]],
  ["Reddit", ["reddit.com"]],
  ["Telegram", ["telegram.org", "t.me"]],
  ["WhatsApp", ["whatsapp.com"]],
];

/** Tên miền / link ⇒ tên trang giới hạn 13+ (hoặc null). «m.tiktok.com», «https://www.youtube.com/x» đều khớp. */
export function trangGioiHan(muc: unknown): string | null {
  const m = String(muc ?? "").trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#\s]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  if (!m) return null;
  for (const [ten, miens] of TRANG_13) if (miens.some((d) => m === d || m.endsWith(`.${d}`))) return ten;
  return null;
}

/** Tuổi theo năm sinh (null = chưa biết). */
export const tuoiTuNamSinh = (namSinh: number | null | undefined, now = new Date()) => (namSinh ? now.getFullYear() - namSinh : null);

/** Các trang giới hạn 13+ trong `mucs` mà bé (theo năm sinh) chưa đủ tuổi. Chưa biết tuổi ⇒ không cảnh báo (app bắt chọn năm sinh khi thêm con). */
export function canhBaoTuoi(mucs: unknown[], namSinh: number | null | undefined, now = new Date()) {
  const tuoi = tuoiTuNamSinh(namSinh, now);
  if (tuoi === null || tuoi >= TUOI_TOI_THIEU) return [];
  const thay = new Set<string>();
  const ra: { muc: string; ten: string; tuoiToiThieu: number; tuoiCon: number }[] = [];
  for (const x of mucs) {
    const ten = trangGioiHan(x);
    if (!ten || thay.has(ten)) continue;
    thay.add(ten);
    ra.push({ muc: String(x).trim(), ten, tuoiToiThieu: TUOI_TOI_THIEU, tuoiCon: tuoi });
  }
  return ra;
}

export const cauCanhBao = (tenCon: string, cb: ReturnType<typeof canhBaoTuoi>) =>
  `${cb.map((c) => c.ten).join(", ")} ghi dành cho từ ${TUOI_TOI_THIEU} tuổi, mà ${tenCon} mới ${cb[0].tuoiCon} tuổi. Ba Mẹ vẫn có thể cho phép nếu muốn.`;

/** Chặn bằng 409 `can_xac_nhan_tuoi` khi chưa có `xacNhanTuoi: true`. Gọi TRƯỚC khi ghi gì. */
export async function kiemTuoiTruocKhiCho(con: string, mucs: unknown[], xacNhan: unknown, fam: string, now = new Date()) {
  if (xacNhan === true || !mucs.length || !mucs.some((x) => trangGioiHan(x))) return;
  const c = await one<{ ten: string; nam_sinh: number | null }>(`select ten, nam_sinh from children where id = $1 and family_id = $2`, [con, fam]);
  if (!c) return;
  const cb = canhBaoTuoi(mucs, c.nam_sinh, now);
  if (!cb.length) return;
  const e = new LoiNghiepVu("can_xac_nhan_tuoi", cauCanhBao(c.ten, cb), 409);
  e.them = { canhBao: cb };
  throw e;
}

/** Lời xin app / web: lấy Con + trang từ yêu cầu đang xử lý (thuộc nhà `fam`). */
export async function kiemTuoiLoiXin(fam: string, id: string, xacNhan: unknown, now = new Date()) {
  if (xacNhan === true) return;
  const r = await one<{ child_id: string; loai: string; gia_tri: string }>(
    `select r.child_id, r.loai, r.gia_tri from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (r && r.loai === "mo_web") await kiemTuoiTruocKhiCho(r.child_id, [r.gia_tri], xacNhan, fam, now);
}
