// Đăng nhập Google / Facebook cho app Ba Mẹ (thiết kế chốt 05/11, màn Chào / Đăng ký / Đăng nhập). Hướng dẫn tạo app OAuth: docs/OAUTH.md.
//   · Google: app gửi id_token (JWT RS256) ⇒ kiểm chữ ký bằng JWKS của Google, `iss`, `aud` ∈ GOOGLE_CLIENT_IDS (web, iOS, Android — dấu phẩy),
//     hạn, `email_verified`.
//   · Facebook: app gửi access token ⇒ Graph `debug_token` (khoá app = FACEBOOK_APP_ID|FACEBOOK_APP_SECRET) phải hợp lệ, đúng app ⇒ `/me` lấy email.
// Danh tính = email (chữ thường). Có tài khoản cùng email (đăng ký bằng email + OTP trước đó, hoặc lần trước đăng nhập MXH) ⇒ vào tài khoản đó;
// chưa có ⇒ tạo nhà mới + Ba Mẹ là người tạo nhà (L7: chỉ phụ huynh đăng ký), không mật khẩu. Lời mời gửi tới đúng email này hiện qua
// `loiMoiChoToi` như đăng nhập thường. Thiếu env ⇒ 503 `mxh_chua_bat` (app đọc `GET cau-hinh-dang-nhap` để ẩn nút).
// Mạng gọi qua globalThis.fetch — test thay bằng JWKS / Graph giả (dang-nhap-mxh.test.ts).
import { createHmac, createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { one, tx, newId } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { chuanDinhDanh } from "./auth.ts";

const JWKS_GOOGLE = "https://www.googleapis.com/oauth2/v3/certs";
const ISS_GOOGLE = new Set(["accounts.google.com", "https://accounts.google.com"]);
const GRAPH = "https://graph.facebook.com/v21.0";
const LECH_GIAY = 60;                                  // lệch đồng hồ cho phép khi kiểm exp / iat

export type NguonMxh = "google" | "facebook";
type DanhTinh = { email: string; ten: string };

const dsClientGoogle = () => (process.env.GOOGLE_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const fbApp = () => {
  const id = process.env.FACEBOOK_APP_ID?.trim(), bi = process.env.FACEBOOK_APP_SECRET?.trim();
  return id && bi ? { id, bi } : null;
};

/** Cấu hình công khai: nút nào bật (không lộ client id / secret — app lấy client id lúc dựng, docs/OAUTH.md). */
export const cauHinhMxh = () => ({ google: dsClientGoogle().length > 0, facebook: !!fbApp() });

const chuaBat = (ten: string) => new LoiNghiepVu("mxh_chua_bat", `Đăng nhập bằng ${ten} chưa bật — Ba Mẹ dùng số điện thoại / email nhé`, 503);
const sai = (ten: string) => new LoiNghiepVu("mxh_sai", `Không xác minh được tài khoản ${ten} — thử lại`, 401);
const loiMang = (ten: string) => new LoiNghiepVu("mxh_mang", `Chưa liên lạc được với ${ten} — thử lại sau ít phút`, 502);

async function layJson(url: string, ten: string): Promise<{ ok: boolean; status: number; j: any; cacheControl: string | null }> {
  let r: Response;
  try { r = await fetch(url, { signal: AbortSignal.timeout(8000) }); } catch { throw loiMang(ten); }
  const j = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, j, cacheControl: r.headers.get("cache-control") };
}

// ---------------------------------------------------------------- Google

let jwks: { keys: (JsonWebKey & { kid?: string })[]; het: number } | null = null;
/** Xoá bộ nhớ JWKS (test). */
export const _xoaJwks = () => { jwks = null; };

async function khoaGoogle(kid: string) {
  const tim = () => jwks && jwks.het > Date.now() ? jwks.keys.find((k) => k.kid === kid) : undefined;
  let k = tim();
  if (k) return k;
  // chưa có / hết hạn / kid lạ (Google xoay khoá) ⇒ tải lại một lần
  const { ok, j, cacheControl } = await layJson(JWKS_GOOGLE, "Google");
  if (!ok || !Array.isArray(j?.keys)) throw loiMang("Google");
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl ?? "")?.[1] ?? 3600);
  jwks = { keys: j.keys, het: Date.now() + Math.min(Math.max(maxAge, 60), 86_400) * 1000 };
  k = tim();
  if (!k) throw sai("Google");
  return k;
}

const b64 = (s: string) => Buffer.from(s, "base64url");

/** id_token Google ⇒ {email, ten}. Sai chữ ký / aud / iss / hạn / email chưa xác minh ⇒ 401 mxh_sai. */
export async function xacMinhGoogle(idToken: unknown): Promise<DanhTinh> {
  const ds = dsClientGoogle();
  if (!ds.length) throw chuaBat("Google");
  const phan = String(idToken ?? "").split(".");
  if (phan.length !== 3) throw sai("Google");
  let dau: { alg?: string; kid?: string }, tai: Record<string, any>;
  try { dau = JSON.parse(b64(phan[0]).toString("utf8")); tai = JSON.parse(b64(phan[1]).toString("utf8")); } catch { throw sai("Google"); }
  if (dau.alg !== "RS256" || !dau.kid) throw sai("Google");
  const jwk = await khoaGoogle(dau.kid);
  let dung = false;
  try { dung = verify("RSA-SHA256", Buffer.from(`${phan[0]}.${phan[1]}`), createPublicKey({ key: jwk, format: "jwk" }), b64(phan[2])); } catch { dung = false; }
  if (!dung) throw sai("Google");
  const bay = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(tai.aud) ? tai.aud : [tai.aud];
  if (!ISS_GOOGLE.has(tai.iss) || !aud.some((a: unknown) => ds.includes(String(a)))) throw sai("Google");
  if (typeof tai.exp !== "number" || tai.exp + LECH_GIAY < bay || (typeof tai.iat === "number" && tai.iat - LECH_GIAY > bay)) throw sai("Google");
  if (tai.email_verified !== true && tai.email_verified !== "true") throw new LoiNghiepVu("mxh_khong_email", "Email Google này chưa xác minh — dùng số điện thoại / email nhé", 400);
  return { email: String(tai.email ?? ""), ten: String(tai.name ?? tai.given_name ?? "") };
}

// ---------------------------------------------------------------- Facebook

/** access token Facebook ⇒ {email, ten}. Token của app khác / hết hạn ⇒ 401; tài khoản không có email ⇒ 400 mxh_khong_email. */
export async function xacMinhFacebook(accessToken: unknown): Promise<DanhTinh> {
  const app = fbApp();
  if (!app) throw chuaBat("Facebook");
  const tk = String(accessToken ?? "").trim();
  if (!tk || tk.length > 4096) throw sai("Facebook");
  const kt = await layJson(`${GRAPH}/debug_token?input_token=${encodeURIComponent(tk)}&access_token=${encodeURIComponent(`${app.id}|${app.bi}`)}`, "Facebook");
  if (!kt.ok && kt.status >= 500) throw loiMang("Facebook");
  const d = kt.j?.data;
  if (!d?.is_valid || String(d.app_id) !== app.id || (d.expires_at && d.expires_at * 1000 < Date.now())) throw sai("Facebook");
  // appsecret_proof: Graph chỉ nhận lời gọi /me kèm bằng chứng có secret (bật «Require App Secret» thì bắt buộc)
  const proof = createHmac("sha256", app.bi).update(tk).digest("hex");
  const me = await layJson(`${GRAPH}/me?fields=id,name,email&access_token=${encodeURIComponent(tk)}&appsecret_proof=${proof}`, "Facebook");
  if (!me.ok) throw me.status >= 500 ? loiMang("Facebook") : sai("Facebook");
  if (String(me.j?.id ?? "") !== String(d.user_id ?? "")) throw sai("Facebook");
  if (!me.j?.email) throw new LoiNghiepVu("mxh_khong_email", "Tài khoản Facebook này không có email (hoặc chưa cho AiiGrow xem email) — dùng số điện thoại nhé", 400);
  return { email: String(me.j.email), ten: String(me.j.name ?? "") };
}

// ---------------------------------------------------------------- tìm / tạo Ba Mẹ theo email

const TEN_MAC_DINH = "Ba Mẹ";

/** Danh tính đã xác minh ⇒ {id, moi}. `moi` = vừa tạo nhà (app đưa vào Lần đầu, hoặc màn Lời mời nếu có lời mời chờ). */
export async function vaoBangMxh(dt: DanhTinh): Promise<{ id: string; moi: boolean }> {
  const d = chuanDinhDanh(dt.email);
  if (!d || !d.includes("@")) throw new LoiNghiepVu("mxh_khong_email", "Tài khoản này không có email hợp lệ — dùng số điện thoại nhé", 400);
  const co = await one<{ id: string }>(`select id from parents where dinh_danh = $1`, [d]);
  if (co) return { id: co.id, moi: false };
  const ten = (dt.ten.normalize("NFC").trim().replace(/\s+/g, " ") || TEN_MAC_DINH).slice(0, 40);
  try {
    const id = await tx(async (t) => {
      const fam = newId(), id = newId();
      await t(`insert into families(id, ten) values ($1, $2)`, [fam, `Nhà ${ten}`]);
      // như dangKy (auth.ts): người đăng ký là «Ba Mẹ» + người tạo nhà; pass_hash null (đặt mật khẩu sau bằng «Quên mật khẩu» nếu muốn)
      await t(`insert into parents(id, family_id, dinh_danh, ten, vai, pass_hash) values ($1, $2, $3, $4, 'ba_me', null)`, [id, fam, d, ten]);
      await t(`update families set chu_id = $2 where id = $1`, [fam, id]);
      return id;
    });
    return { id, moi: true };
  } catch (e) {
    // bấm hai lần / hai máy cùng lúc: lần kia vừa tạo xong (dinh_danh unique) ⇒ dùng tài khoản đó
    const lai = await one<{ id: string }>(`select id from parents where dinh_danh = $1`, [d]);
    if (lai) return { id: lai.id, moi: false };
    throw e;
  }
}

/** POST dang-nhap/google {idToken} | dang-nhap/facebook {accessToken} ⇒ {id, moi}. */
export async function dangNhapMxh(nguon: NguonMxh, b: Record<string, unknown>) {
  return vaoBangMxh(nguon === "google" ? await xacMinhGoogle(b.idToken) : await xacMinhFacebook(b.accessToken));
}
