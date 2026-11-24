// Giới hạn lượt đăng nhập bằng mật khẩu (Ba Mẹ: auth.ts › dangNhap; Nhân viên / Admin: admin.ts › dangNhapNv) — issue #553.
// Trước đây khoá CỨNG tài khoản sau 5 lần sai ⇒ ai biết SĐT/email/tên đăng nhập cũng giữ được tài khoản người khác bị khoá mãi, và không có
// trần theo nguồn gọi nên một IP dò được vô hạn tài khoản (mỗi lần tốn một scrypt trên VPS 1 vCPU). Nay:
//   · Trần theo IP (IPv6 gộp /64 — gia-dinh.ts › nguonGoi), khung 15 phút cố định, giữ chỗ TRƯỚC scrypt (upsert nguyên tử): ≤ TRAN_IP lượt
//     HỎNG (đăng nhập đúng trả lại lượt của chính nó — nhiều người chung NAT / wifi quán không vướng nhau) và ≤ TRAN_IP_TONG lượt mọi loại.
//   · Khoá theo CẶP (tài khoản, IP): giữ chỗ lượt của cặp TRƯỚC scrypt (gửi song song cũng chỉ ≤ SAI_KHOA lượt lọt); sai đủ SAI_KHOA lần liền ⇒
//     chỉ nguồn đó bị khoá với tài khoản đó, luỹ tiến 15 phút → 1 giờ → 24 giờ (bậc nhớ GIU_BAC_MS kể từ lần khoá cuối).
//   · Trần theo tài khoản trên MỌI nguồn (chống dò phân tán qua nhiều IP): ≥ TRAN_TK lượt sai / giờ ⇒ chỉ chặn nguồn LẠ; nguồn đã từng đăng
//     nhập đúng tài khoản đó trong TIN_MS («nguồn quen») vẫn vào ⇒ kẻ lạ không khoá được chủ tài khoản ở nhà / quầy.
//   · Đếm theo định danh đã chuẩn hoá, CÓ hay KHÔNG có tài khoản như nhau (không lộ số/email nào tồn tại qua việc bị khoá).
// Bộ đếm nằm ở bảng pin_sai (khoa, so_lan, khoa_den, cap_nhat). Dọn trong cron hằng ngày (donBoDemDangNhap). Mốc giờ truyền vào (test).
import { q, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

type LoaiDn = "bm" | "nv";                    // Ba Mẹ | Nhân viên / Admin — bộ đếm tách nhau
const KHUNG_PHUT = 15;
export const TRAN_IP = 30;                           // lượt hỏng / IP / khung 15 phút
export const TRAN_IP_TONG = 120;                     // MỌI lượt (cả đúng) / IP / khung — chặn gửi dồn đăng nhập đúng để đốt scrypt
export const SAI_KHOA = 5;                           // sai liền từ một nguồn ⇒ khoá cặp (tài khoản, nguồn)
const BAC_PHUT = [15, 60, 24 * 60] as const;  // khoá luỹ tiến
export const TRAN_TK = 30;                           // lượt sai / tài khoản / giờ trên mọi nguồn ⇒ nguồn lạ còn 1 lượt / 15 phút
export const TRAN_TK_CUNG = 300;                     // lượt sai / tài khoản / giờ ⇒ chỉ nguồn quen (trần tuyệt đối chống dò phân tán)
const GIU_BAC_MS = 72 * 3_600_000;                   // dài hơn khoá 24 giờ — hết khoá 24 giờ không tụt về 15 phút
const SAI_CU_MS = KHUNG_PHUT * 60_000;               // lần sai cũ hơn 15 phút không cộng dồn
const TK_KHUNG_MS = 3_600_000;
const TIN_MS = 30 * 86_400_000;                      // nguồn quen: đăng nhập đúng trong 30 ngày

const khung = (now: number) => Math.floor(now / SAI_CU_MS);
const khoaIp = (loai: LoaiDn, ip: string, now: number) => `dn_ip:${loai}:${ip}:${khung(now)}`;
const khoaIpTong = (loai: LoaiDn, ip: string, now: number) => `dn_ipt:${loai}:${ip}:${khung(now)}`;
const khoaTk = (loai: LoaiDn, tk: string, now: number) => `dn_tk:${loai}:${tk}|:${Math.floor(now / TK_KHUNG_MS)}`;
const khoaCap = (loai: LoaiDn, tk: string, ip: string) => `dn_cap:${loai}:${tk}|${ip}`;
const khoaBac = (loai: LoaiDn, tk: string, ip: string) => `dn_bac:${loai}:${tk}|${ip}`;
const khoaTin = (loai: LoaiDn, tk: string, ip: string) => `dn_tin:${loai}:${tk}|${ip}`;
const khoaQuenTong = (loai: LoaiDn, tk: string, ip: string, now: number) => `dn_qt:${loai}:${tk}|${ip}:${khung(now)}`;
const tienToKhoa = (loai: LoaiDn, tk: string) => [`dn_cap:${loai}:${tk}|`, `dn_bac:${loai}:${tk}|`, `dn_tk:${loai}:${tk}|`, `dn_tin:${loai}:${tk}|`, `dn_qt:${loai}:${tk}|`];

const chuCho = (ms: number) => { const p = Math.max(1, Math.ceil(ms / 60_000)); return p >= 120 ? `${Math.ceil(p / 60)} giờ` : `${p} phút`; };
const tamKhoa = (ms: number, goiY: string) =>
  new LoiNghiepVu("tam_khoa", `Sai mật khẩu nhiều lần — thử lại sau ${chuCho(ms)}${goiY}`, 429);
const tang = async (khoa: string) => (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan) values ($1, 1)
  on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0].so_lan;

const quaNhieu = (now: number) => new LoiNghiepVu("qua_nhieu_lan",
  `Thử đăng nhập nhiều lần quá — đợi ${chuCho((khung(now) + 1) * SAI_CU_MS - now)} rồi thử lại nhé`, 429);

type Luot = { kIp: string | null; loai: LoaiDn; tk: string; ip: string; now: number };

/** Gọi TRƯỚC khi kiểm mật khẩu: giữ chỗ lượt IP + lượt của cặp. Quá trần IP ⇒ 429 qua_nhieu_lan (nguồn quen của tài khoản này dùng trần
 *  riêng, không đụng bộ đếm chung của IP — kẻ lạ chung wifi quán / CGNAT không chặn được quầy, Ba Mẹ đã quen mạng, và ngược lại); cặp đang
 *  khoá / hết lượt ⇒ 429 tam_khoa (`goiY` nối sau câu báo; lượt bị từ chối không ghi gì — không kéo dài thời gian chờ).
 *  Tài khoản đang bị dò từ nhiều nguồn: ≥ TRAN_TK lượt sai / giờ ⇒ nguồn LẠ chỉ còn 1 lượt / 15 phút (chủ ở mạng mới gõ đúng vẫn vào);
 *  ≥ TRAN_TK_CUNG ⇒ chỉ nguồn quen tới hết giờ (trần tuyệt đối số lượt đoán trên một tài khoản). → lượt (cho dangNhapDung / dangNhapSai / huyLuot). */
export async function truocDangNhap(loai: LoaiDn, tk: string, ip: string, now: number, goiY = ""): Promise<Luot> {
  const kTk = khoaTk(loai, tk, now), kTin = khoaTin(loai, tk, ip), kCap = khoaCap(loai, tk, ip);
  const doc = new Map((await q<{ khoa: string; so_lan: number; cap_nhat: Date | null; khoa_den: Date | null }>(
    `select khoa, so_lan, cap_nhat, khoa_den from pin_sai where khoa = any($1::text[])`, [[kTk, kTin, kCap]])).map((r) => [r.khoa, r]));
  const tin = doc.get(kTin)?.cap_nhat;
  const quen = !!tin && new Date(tin).getTime() >= now - TIN_MS;
  const tkSai = doc.get(kTk)?.so_lan ?? 0;
  if (!quen && tkSai >= TRAN_TK_CUNG) throw tamKhoa((Math.floor(now / TK_KHUNG_MS) + 1) * TK_KHUNG_MS - now, goiY);
  const duoc = !quen && tkSai >= TRAN_TK ? 1 : SAI_KHOA;
  // xét cặp TRƯỚC khi đếm gì: đang khoá, hoặc đã dùng hết lượt trong 15 phút ⇒ từ chối, không ghi
  const cu = doc.get(kCap);
  if (cu?.khoa_den && new Date(cu.khoa_den).getTime() > now) throw tamKhoa(new Date(cu.khoa_den).getTime() - now, goiY);
  const capNhat = cu?.cap_nhat ? new Date(cu.cap_nhat).getTime() : 0;
  if (cu && !cu.khoa_den && capNhat >= now - SAI_CU_MS && cu.so_lan >= duoc) throw tamKhoa(capNhat + SAI_CU_MS - now, goiY);
  let kIp: string | null = null;
  if (quen) {
    // nguồn quen: trần riêng của cặp (không gửi dồn đăng nhập đúng để đốt scrypt)
    if ((await tang(khoaQuenTong(loai, tk, ip, now))) > TRAN_IP) throw quaNhieu(now);
  } else {
    kIp = khoaIp(loai, ip, now);
    const [hong, tong] = await Promise.all([tang(kIp), tang(khoaIpTong(loai, ip, now))]);
    if (hong > TRAN_IP || tong > TRAN_IP_TONG) throw quaNhieu(now);
  }
  const luot: Luot = { kIp, loai, tk, ip, now };
  // giữ chỗ lượt của cặp (nguyên tử): khoá đã hết hạn hoặc lần thử cuối cũ hơn 15 phút ⇒ đếm lại từ 1
  const luc = new Date(now);
  const c = (await q<{ so_lan: number; khoa_den: Date | null }>(`insert into pin_sai(khoa, so_lan, cap_nhat) values ($1, 1, $2)
    on conflict (khoa) do update set
      so_lan = case when pin_sai.khoa_den > $2 then pin_sai.so_lan
                    when pin_sai.khoa_den is not null or coalesce(pin_sai.cap_nhat, $2) < $3 then 1
                    else pin_sai.so_lan + 1 end,
      khoa_den = case when pin_sai.khoa_den > $2 then pin_sai.khoa_den else null end,
      cap_nhat = case when pin_sai.khoa_den > $2 then pin_sai.cap_nhat else $2 end
    returning so_lan, khoa_den`, [khoaCap(loai, tk, ip), luc, new Date(now - SAI_CU_MS)]))[0];
  if (c.khoa_den && new Date(c.khoa_den).getTime() > now) throw tamKhoa(new Date(c.khoa_den).getTime() - now, goiY);
  if (c.so_lan > duoc) {                    // gửi song song: các lượt đang chờ băm đã đủ — lượt này không được thử; trả lại chỗ vừa giữ
    await huyLuot(luot);
    throw tamKhoa(SAI_CU_MS, goiY);
  }
  return luot;
}

/** Lỗi bất ngờ giữa truocDangNhap và dangNhapDung / dangNhapSai (DB, scrypt…) — trả cả lượt IP lẫn lượt cặp (không để kẹt khoá). */
export async function huyLuot(l: Luot) {
  await traLuot(l);
  await q(`update pin_sai set so_lan = greatest(so_lan - 1, 0) where khoa = $1`, [khoaCap(l.loai, l.tk, l.ip)]).catch(() => undefined);
}

/** Trả lượt IP đã giữ (đăng nhập đúng / lỗi bất ngờ). */
async function traLuot(l: Luot) {
  if (l.kIp) await q(`update pin_sai set so_lan = greatest(so_lan - 1, 0) where khoa = $1`, [l.kIp]).catch(() => undefined);
}

/** Đăng nhập đúng: trả lượt IP, xoá bộ đếm + bậc khoá của cặp, ghi nhận nguồn quen. */
export async function dangNhapDung(l: Luot) {
  await traLuot(l);
  await q(`delete from pin_sai where khoa = any($1::text[])`, [[khoaCap(l.loai, l.tk, l.ip), khoaBac(l.loai, l.tk, l.ip)]]);
  await q(`insert into pin_sai(khoa, so_lan, cap_nhat) values ($1, 1, $2) on conflict (khoa) do update set cap_nhat = $2`,
    [khoaTin(l.loai, l.tk, l.ip), new Date(l.now)]);
}

/** Đăng nhập sai (lượt đã giữ ở truocDangNhap): cộng trần tài khoản; lượt thứ SAI_KHOA của cặp ⇒ khoá cặp theo bậc (đúng MỘT lượt khoá
 *  thắng khi nhiều lượt sai về cùng lúc). → số phút khoá (0 = chưa khoá). */
export async function dangNhapSai(l: Luot): Promise<number> {
  const { loai, tk, ip, now } = l;
  await tang(khoaTk(loai, tk, now));
  const luc = new Date(now);
  const thang = await q(`update pin_sai set khoa_den = $2, so_lan = 0
    where khoa = $1 and so_lan >= $3 and (khoa_den is null or khoa_den <= $4) returning 1`,
    [khoaCap(loai, tk, ip), new Date(now + BAC_PHUT[0] * 60_000), SAI_KHOA, luc]);
  if (!thang.length) return 0;
  const b = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan, cap_nhat) values ($1, 1, $2)
    on conflict (khoa) do update set so_lan = case when coalesce(pin_sai.cap_nhat, $2) < $3 then 1 else pin_sai.so_lan + 1 end, cap_nhat = $2
    returning so_lan`, [khoaBac(loai, tk, ip), luc, new Date(now - GIU_BAC_MS)]))[0];
  const phut = BAC_PHUT[Math.min(b.so_lan, BAC_PHUT.length) - 1];
  if (phut !== BAC_PHUT[0]) await q(`update pin_sai set khoa_den = $2 where khoa = $1`, [khoaCap(loai, tk, ip), new Date(now + phut * 60_000)]);
  return phut;
}

/** Đặt lại / đổi / đặt mật khẩu (chủ tài khoản đã chứng minh được), xoá tài khoản ⇒ xoá mọi bộ đếm, khoá và «nguồn quen» của tài khoản
 *  (nguồn từng vào bằng mật khẩu cũ — có thể là kẻ đã lộ mật khẩu — không còn được miễn trần). */
export async function goKhoaTaiKhoan(loai: LoaiDn, tk: string | string[], t: Q = q) {
  const ds = (Array.isArray(tk) ? tk : [tk]).flatMap((x) => tienToKhoa(loai, x));
  if (ds.length) await t(`delete from pin_sai p using unnest($1::text[]) d(t) where left(p.khoa, length(d.t)) = d.t`, [ds]);
}

/** Cron hằng ngày (xoa-tai-khoan.ts › chayDonKiemToan): xoá bộ đếm IP / tài khoản của khung đã qua, cặp hết khoá + hết sai, bậc quá hạn
 *  nhớ, nguồn quen quá 30 ngày. → số dòng. */
export async function donBoDemDangNhap(now = Date.now()) {
  const k = khung(now), luc = new Date(now), gio = Math.floor(now / TK_KHUNG_MS);
  return (await q(`delete from pin_sai where
      ((khoa like 'dn\\_ip:%' or khoa like 'dn\\_ipt:%' or khoa like 'dn\\_qt:%') and split_part(khoa, ':', -1) not in ($1, $2))
   or (khoa like 'dn\\_tk:%' and split_part(khoa, ':', -1) not in ($6, $7))
   or (khoa like 'dn\\_cap:%' and (khoa_den is null or khoa_den <= $3) and coalesce(cap_nhat, '-infinity') < $4)
   or (khoa like 'dn\\_bac:%' and coalesce(cap_nhat, '-infinity') < $5)
   or (khoa like 'dn\\_tin:%' and coalesce(cap_nhat, '-infinity') < $8)
   returning 1`, [String(k), String(k - 1), luc, new Date(now - SAI_CU_MS), new Date(now - GIU_BAC_MS), String(gio), String(gio - 1),
    new Date(now - TIN_MS)])).length;
}
