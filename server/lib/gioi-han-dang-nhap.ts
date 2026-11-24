// Giới hạn lượt đăng nhập bằng mật khẩu (Ba Mẹ: auth.ts › dangNhap; Nhân viên / Admin: admin.ts › dangNhapNv) — issue #553.
// Trước đây khoá CỨNG tài khoản sau 5 lần sai ⇒ ai biết SĐT/email/tên đăng nhập cũng giữ được tài khoản người khác bị khoá mãi, và không có
// trần theo nguồn gọi nên một IP dò được vô hạn tài khoản (mỗi lần tốn một scrypt trên VPS 1 vCPU). Nay:
//   · Trần theo IP (IPv6 gộp /64 — gia-dinh.ts › nguonGoi): ≤ TRAN_IP lượt HỎNG / khung 15 phút cố định, giữ chỗ TRƯỚC scrypt (upsert
//     nguyên tử, gửi song song cũng chỉ ≤ trần lượt lọt). Đăng nhập đúng ⇒ trả lượt (nhiều người chung NAT / wifi quán không vướng nhau).
//   · Khoá theo CẶP (tài khoản, IP): sai liền SAI_KHOA lần từ cùng một nguồn ⇒ chỉ nguồn đó bị khoá với tài khoản đó, luỹ tiến
//     15 phút → 1 giờ → 24 giờ (bậc giữ trong 24 giờ kể từ lần khoá cuối). Chủ tài khoản ở mạng khác vẫn vào được.
//   · Đếm theo định danh đã chuẩn hoá, CÓ hay KHÔNG có tài khoản như nhau (không lộ số/email nào tồn tại qua việc bị khoá).
// Bộ đếm nằm ở bảng pin_sai (khoa, so_lan, khoa_den, cap_nhat). Dọn trong cron hằng ngày (donBoDemDangNhap). Mốc giờ truyền vào (test).
import { q, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export type LoaiDn = "bm" | "nv";                    // Ba Mẹ | Nhân viên / Admin — bộ đếm tách nhau
export const KHUNG_PHUT = 15;
export const TRAN_IP = 30;                           // lượt hỏng / IP / khung 15 phút
export const TRAN_IP_TONG = 120;                     // MỌI lượt (cả đúng) / IP / khung — chặn gửi dồn đăng nhập đúng để đốt scrypt
export const SAI_KHOA = 5;                           // sai liền từ một nguồn ⇒ khoá cặp (tài khoản, nguồn)
export const BAC_PHUT = [15, 60, 24 * 60] as const;  // khoá luỹ tiến
const GIU_BAC_MS = 24 * 3_600_000;
const SAI_CU_MS = KHUNG_PHUT * 60_000;               // lần sai cũ hơn 15 phút không cộng dồn

const khung = (now: number) => Math.floor(now / SAI_CU_MS);
const khoaIp = (loai: LoaiDn, ip: string, now: number) => `dn_ip:${loai}:${ip}:${khung(now)}`;
const khoaIpTong = (loai: LoaiDn, ip: string, now: number) => `dn_ipt:${loai}:${ip}:${khung(now)}`;
const khoaCap = (loai: LoaiDn, tk: string, ip: string) => `dn_cap:${loai}:${tk}|${ip}`;
const khoaBac = (loai: LoaiDn, tk: string, ip: string) => `dn_bac:${loai}:${tk}|${ip}`;
const tienToTk = (loai: LoaiDn, tk: string) => [`dn_cap:${loai}:${tk}|`, `dn_bac:${loai}:${tk}|`];

const phutCon = (den: Date, now: number) => Math.max(1, Math.ceil((den.getTime() - now) / 60_000));
const chuCho = (phut: number) => (phut >= 120 ? `${Math.ceil(phut / 60)} giờ` : `${phut} phút`);

/** Gọi TRƯỚC khi kiểm mật khẩu. Quá trần IP ⇒ 429 qua_nhieu_lan; cặp (tk, ip) đang khoá ⇒ 429 tam_khoa (`goiY` nối sau câu báo).
 *  → khoá bộ đếm IP (đưa lại cho dangNhapDung / dangNhapSai). */
export async function truocDangNhap(loai: LoaiDn, tk: string, ip: string, now: number, goiY = "") {
  const k = khoaIp(loai, ip, now);
  const [hong, tong] = await Promise.all([k, khoaIpTong(loai, ip, now)].map(async (khoa) => (await q<{ so_lan: number }>(
    `insert into pin_sai(khoa, so_lan) values ($1, 1) on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0].so_lan));
  if (hong > TRAN_IP || tong > TRAN_IP_TONG)
    throw new LoiNghiepVu("qua_nhieu_lan", `Thử đăng nhập nhiều lần quá — đợi ${KHUNG_PHUT} phút rồi thử lại nhé`, 429);
  const c = (await q<{ khoa_den: Date | null }>(`select khoa_den from pin_sai where khoa = $1`, [khoaCap(loai, tk, ip)]))[0];
  if (c?.khoa_den && new Date(c.khoa_den).getTime() > now)
    throw new LoiNghiepVu("tam_khoa", `Sai mật khẩu nhiều lần — thử lại sau ${chuCho(phutCon(new Date(c.khoa_den), now))}${goiY}`, 429);
  return k;
}

/** Đăng nhập đúng: trả lượt IP, xoá bộ đếm + bậc khoá của cặp. */
export async function dangNhapDung(loai: LoaiDn, tk: string, ip: string, kIp: string) {
  await q(`update pin_sai set so_lan = greatest(so_lan - 1, 0) where khoa = $1`, [kIp]);
  await q(`delete from pin_sai where khoa = any($1::text[])`, [[khoaCap(loai, tk, ip), khoaBac(loai, tk, ip)]]);
}

/** Đăng nhập sai: cộng lần sai của cặp; đủ SAI_KHOA ⇒ khoá cặp theo bậc. → số phút khoá (0 = chưa khoá). */
export async function dangNhapSai(loai: LoaiDn, tk: string, ip: string, now: number): Promise<number> {
  const luc = new Date(now), cu = new Date(now - SAI_CU_MS);
  const r = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan, cap_nhat) values ($1, 1, $2)
    on conflict (khoa) do update set
      so_lan = case when (pin_sai.khoa_den is not null and pin_sai.khoa_den <= $2) or coalesce(pin_sai.cap_nhat, $2) < $3 then 1
                    else pin_sai.so_lan + 1 end,
      khoa_den = case when pin_sai.khoa_den <= $2 then null else pin_sai.khoa_den end,
      cap_nhat = $2
    returning so_lan`, [khoaCap(loai, tk, ip), luc, cu]))[0];
  if (r.so_lan < SAI_KHOA) return 0;
  const b = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan, cap_nhat) values ($1, 1, $2)
    on conflict (khoa) do update set so_lan = case when coalesce(pin_sai.cap_nhat, $2) < $3 then 1 else pin_sai.so_lan + 1 end, cap_nhat = $2
    returning so_lan`, [khoaBac(loai, tk, ip), luc, new Date(now - GIU_BAC_MS)]))[0];
  const phut = BAC_PHUT[Math.min(b.so_lan, BAC_PHUT.length) - 1];
  await q(`update pin_sai set so_lan = 0, khoa_den = $2 where khoa = $1`, [khoaCap(loai, tk, ip), new Date(now + phut * 60_000)]);
  return phut;
}

/** Đặt lại / đổi mật khẩu (chủ tài khoản đã chứng minh được) ⇒ gỡ mọi khoá của tài khoản ở mọi nguồn. */
export async function goKhoaTaiKhoan(loai: LoaiDn, tk: string, t: Q = q) {
  const [a, b] = tienToTk(loai, tk);
  await t(`delete from pin_sai where left(khoa, length($1)) = $1 or left(khoa, length($2)) = $2`, [a, b]);
}

/** Cron hằng ngày (xoa-tai-khoan.ts › chayDonKiemToan): xoá bộ đếm IP của khung đã qua, cặp hết khoá + hết sai, bậc quá 24 giờ. → số dòng. */
export async function donBoDemDangNhap(now = Date.now()) {
  const k = khung(now), luc = new Date(now);
  return (await q(`delete from pin_sai where
      ((khoa like 'dn\\_ip:%' or khoa like 'dn\\_ipt:%') and split_part(khoa, ':', -1) not in ($1, $2))
   or (khoa like 'dn\\_cap:%' and (khoa_den is null or khoa_den <= $3) and coalesce(cap_nhat, '-infinity') < $4)
   or (khoa like 'dn\\_bac:%' and coalesce(cap_nhat, '-infinity') < $5)
   returning 1`, [String(k), String(k - 1), luc, new Date(now - SAI_CU_MS), new Date(now - GIU_BAC_MS)])).length;
}
