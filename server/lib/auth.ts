// Ba Mẹ: đăng ký bằng số điện thoại hoặc email + OTP (FR-01.01), mật khẩu băm scrypt, phiên Bearer (app Ba Mẹ giữ token trong SecureStore).
// Không đụng next/headers ở đây — route tự đọc header, lib test được thẳng bằng node --test.
// OTP: CHƯA có nhà cung cấp SMS/email (CẦN ANH, KE-HOACH mục 5.1) ⇒ `guiOtp` trả mã về ở chế độ thử (AIIGROW_OTP_THU=1 hoặc không phải
// production); có nhà cung cấp thì gửi thật ở đây và bỏ trả mã.
import { createHash, randomBytes, randomInt, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { one, q, tx, newId, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, n: number) => Promise<Buffer>;
export const PHIEN_NGAY = 90;
const OTP_PHUT = 10;
const OTP_SAI_TOI_DA = 5;
const SAI_KHOA = 5;          // khoá đăng nhập sau 5 lần sai liền (BRD mục 9)
const KHOA_PHUT = 15;

export const sha = (s: string) => createHash("sha256").update(s).digest("base64url");
export const taoToken = () => randomBytes(32).toString("base64url");

export async function bamMatKhau(mk: string) {
  const muoi = randomBytes(16);
  return `s1$${muoi.toString("base64url")}$${(await scrypt(mk, muoi, 32)).toString("base64url")}`;
}

export async function dungMatKhau(mk: string, bam: string) {
  const [, muoi, h] = bam.split("$");
  const a = await scrypt(mk, Buffer.from(muoi, "base64url"), 32);
  const b = Buffer.from(h, "base64url");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Email (chữ thường) hoặc SĐT Việt Nam về dạng 0xxxxxxxxx (+84 / 84 / dấu cách / chấm đều nhận). null = không hợp lệ. */
export function chuanDinhDanh(s: unknown): string | null {
  const t = String(s ?? "").trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) return t.toLowerCase();
  let so = t.replace(/[\s.\-()]/g, "");
  if (so.startsWith("+84")) so = "0" + so.slice(3);
  else if (/^84\d{9}$/.test(so)) so = "0" + so.slice(2);
  return /^0\d{9}$/.test(so) ? so : null;
}

const cheDoThu = () => process.env.AIIGROW_OTP_THU === "1" || process.env.NODE_ENV !== "production";

/** Gửi mã 6 số (hạn 10 phút). → {guiDen, ma?} — `ma` chỉ có ở chế độ thử. */
export async function guiOtp(dinhDanh: unknown, mucDich: "dang_ky" | "quen_mk") {
  const d = chuanDinhDanh(dinhDanh);
  if (!d) throw new LoiNghiepVu("dinh_danh_sai", "Nhập số điện thoại (10 số) hoặc email");
  const co = await one(`select 1 from parents where dinh_danh = $1`, [d]);
  if (mucDich === "dang_ky" && co) throw new LoiNghiepVu("da_co_tai_khoan", "Số/email này đã có tài khoản — chọn Đăng nhập", 409);
  // Mã thử trả thẳng trong phản hồi: với quên mật khẩu, ai biết số/email cũng chiếm được tài khoản ⇒ prod chặn tới khi có kênh SMS/mail thật.
  // Chặn TRƯỚC khi xét có tài khoản: cùng một câu trả lời cho mọi số/email (không dò được số nào có tài khoản).
  if (mucDich === "quen_mk" && process.env.NODE_ENV === "production")
    throw new LoiNghiepVu("otp_chua_mo", "Chưa gửi được mã xác thực — AiiLab đang mở kênh gửi mã", 503);
  if (mucDich === "quen_mk" && !co) return { guiDen: d };          // không lộ số/email nào có tài khoản
  if (!cheDoThu()) throw new LoiNghiepVu("otp_chua_mo", "Chưa gửi được mã xác thực — AiiLab đang mở kênh gửi mã", 503);
  const ma = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await q(`insert into otp(dinh_danh, ma_hash, muc_dich, het) values ($1, $2, $3, now() + make_interval(mins => $4))
           on conflict (dinh_danh) do update set ma_hash = excluded.ma_hash, muc_dich = excluded.muc_dich, het = excluded.het, so_lan = 0`,
    [d, sha(`${d}:${ma}`), mucDich, OTP_PHUT]);
  return { guiDen: d, ma };
}

async function dungOtp(t: Q, d: string, ma: unknown, mucDich: string) {
  const r = (await t<{ ma_hash: string; muc_dich: string; het: Date; so_lan: number }>(
    `select ma_hash, muc_dich, het, so_lan from otp where dinh_danh = $1 for update`, [d]))[0];
  if (!r || r.muc_dich !== mucDich || new Date(r.het) < new Date()) throw new LoiNghiepVu("otp_het_han", "Mã đã hết hạn — gửi lại mã mới");
  if (r.so_lan >= OTP_SAI_TOI_DA) throw new LoiNghiepVu("otp_qua_so_lan", "Nhập sai quá nhiều lần — gửi lại mã mới");
  if (r.ma_hash !== sha(`${d}:${String(ma ?? "").trim()}`)) {
    await t(`update otp set so_lan = so_lan + 1 where dinh_danh = $1`, [d]);
    return false;
  }
  await t(`delete from otp where dinh_danh = $1`, [d]);
  return true;
}

/** Đăng ký: OTP đúng ⇒ tạo gia đình + Ba Mẹ là Chủ gia đình. → id Ba Mẹ. */
export async function dangKy(b: { dinhDanh?: unknown; ma?: unknown; ten?: unknown; matKhau?: unknown }) {
  const d = chuanDinhDanh(b.dinhDanh);
  if (!d) throw new LoiNghiepVu("dinh_danh_sai", "Nhập số điện thoại (10 số) hoặc email");
  const ten = String(b.ten ?? "").trim().slice(0, 40);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi của Ba/Mẹ");
  const mk = String(b.matKhau ?? "");
  if (mk.length < 8) throw new LoiNghiepVu("mk_ngan", "Mật khẩu cần ít nhất 8 ký tự");
  const bam = await bamMatKhau(mk);
  const kq = await tx(async (t) => {
    if (!(await dungOtp(t, d, b.ma, "dang_ky"))) return null;          // lần sai vẫn được ghi (không rollback)
    if ((await t(`select 1 from parents where dinh_danh = $1`, [d])).length)
      throw new LoiNghiepVu("da_co_tai_khoan", "Số/email này đã có tài khoản — chọn Đăng nhập", 409);
    const fam = newId(), id = newId();
    await t(`insert into families(id, ten) values ($1, $2)`, [fam, `Nhà ${ten}`]);
    await t(`insert into parents(id, family_id, dinh_danh, ten, vai, pass_hash) values ($1, $2, $3, $4, 'chu', $5)`, [id, fam, d, ten, bam]);
    return id;
  });
  if (!kq) throw new LoiNghiepVu("otp_sai", "Mã chưa đúng");
  return kq;
}

/** Đăng nhập → id Ba Mẹ. Sai 5 lần liền ⇒ khoá 15 phút. Không lộ số/email nào có tài khoản. */
export async function dangNhap(dinhDanh: unknown, mk: unknown) {
  const d = chuanDinhDanh(dinhDanh);
  const p = d ? await one<{ id: string; pass_hash: string | null; khoa_den: Date | null }>(
    `select id, pass_hash, khoa_den from parents where dinh_danh = $1`, [d]) : undefined;
  if (p?.khoa_den && new Date(p.khoa_den) > new Date())
    throw new LoiNghiepVu("tam_khoa", `Sai mật khẩu nhiều lần — thử lại sau ${KHOA_PHUT} phút. hoặc bấm «Quên mật khẩu» để đặt lại bằng mã OTP`, 429);
  const dung = p?.pass_hash ? await dungMatKhau(String(mk ?? ""), p.pass_hash) : (await bamMatKhau(String(mk ?? "")), false);
  if (!p || !dung) {
    if (p) await q(`update parents set sai_lien = sai_lien + 1,
                      khoa_den = case when sai_lien + 1 >= $2 then now() + make_interval(mins => $3) else null end where id = $1`,
      [p.id, SAI_KHOA, KHOA_PHUT]);
    throw new LoiNghiepVu("sai_dang_nhap", "Số điện thoại/email hoặc mật khẩu chưa đúng", 401);
  }
  await q(`update parents set sai_lien = 0, khoa_den = null where id = $1`, [p.id]);
  return p.id;
}

/** Quên mật khẩu: OTP đúng ⇒ đặt mật khẩu mới, đăng xuất mọi máy. */
export async function datLaiMatKhau(dinhDanh: unknown, ma: unknown, mkMoi: unknown) {
  const d = chuanDinhDanh(dinhDanh);
  if (!d) throw new LoiNghiepVu("dinh_danh_sai", "Nhập số điện thoại (10 số) hoặc email");
  const mk = String(mkMoi ?? "");
  if (mk.length < 8) throw new LoiNghiepVu("mk_ngan", "Mật khẩu cần ít nhất 8 ký tự");
  const bam = await bamMatKhau(mk);
  const dung = await tx(async (t) => {
    if (!(await dungOtp(t, d, ma, "quen_mk"))) return false;
    const p = (await t<{ id: string }>(`update parents set pass_hash = $2, sai_lien = 0, khoa_den = null where dinh_danh = $1 returning id`, [d, bam]))[0];
    if (p) await t(`delete from sessions where parent_id = $1`, [p.id]);
    return true;
  });
  if (!dung) throw new LoiNghiepVu("otp_sai", "Mã chưa đúng");
}

export type BaMe = { id: string; family_id: string; dinh_danh: string; ten: string; vai: "chu" | "duyet" | "xem" };

export async function taoPhien(parentId: string, ngay = PHIEN_NGAY) {
  const t = taoToken();
  await q(`insert into sessions(id, parent_id, expires_at) values ($1, $2, now() + make_interval(days => $3))`, [sha(t), parentId, ngay]);
  return t;
}

export const baMeTuToken = async (t: string) =>
  (await one<BaMe>(`select p.id, p.family_id, p.dinh_danh, p.ten, p.vai from sessions s join parents p on p.id = s.parent_id
                    where s.id = $1 and s.expires_at > now()`, [sha(t)])) ?? null;

export const xoaPhien = (t: string) => q(`delete from sessions where id = $1`, [sha(t)]);

export const bearer = (req: Request) => /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim() ?? null;

/** Bearer của request → Ba Mẹ (hoặc null). */
export async function baMeGoi(req: Request) {
  const t = bearer(req);
  return t ? baMeTuToken(t) : null;
}

// ---- chỉ thêm: thành viên gia đình (lib/thanh-vien.ts) đăng ký bằng lời mời cần đúng bước kiểm OTP của đăng ký thường.
/** Kiểm OTP trong giao dịch `t` (sai ⇒ false và tăng số lần sai; đúng ⇒ xoá mã). */
export const kiemOtp = (t: Q, dinhDanh: string, ma: unknown, mucDich: "dang_ky" | "quen_mk") => dungOtp(t, dinhDanh, ma, mucDich);
