// Đăng nhập Google / Facebook cho app Ba Mẹ (thiết kế chốt 05/11, màn Chào / Đăng ký / Đăng nhập). Hướng dẫn tạo app OAuth: docs/OAUTH.md.
//   · Google: app gửi id_token (JWT RS256) ⇒ kiểm chữ ký bằng JWKS của Google, `iss`, `aud` ∈ GOOGLE_CLIENT_IDS (web, iOS, Android — dấu phẩy),
//     hạn, `email_verified`.
//   · Facebook: app gửi access token ⇒ Graph `debug_token` (khoá app = FACEBOOK_APP_ID|FACEBOOK_APP_SECRET) phải hợp lệ, đúng app ⇒ `/me` lấy id
//     (+ email nếu có — chỉ tham khảo).
// Danh tính = (nguồn, mã người dùng của Google/Facebook) trong bảng ba_me_mxh. Lần đầu (chưa gắn):
//   · Google: email (đã xác minh) chưa có tài khoản ⇒ tạo nhà mới + Ba Mẹ là người tạo nhà (L7), không mật khẩu, định danh = email.
//     Email ĐÃ có tài khoản ⇒ 409, KHÔNG tự gắn theo email (email đăng ký bằng OTP chưa chắc của chủ thật — OTP thử trả mã thẳng).
//   · Facebook: email Graph KHÔNG chắc đã xác minh (ai cũng tạo được Facebook mang email người khác) ⇒ tài khoản mới mang định danh RIÊNG
//     `fb:<id Facebook>`; email chỉ lưu tham khảo ở ba_me_mxh.email, không khớp / không giữ chỗ / không chặn ai đăng ký email đó.
// Gắn Google / Facebook vào tài khoản có sẵn: chỉ khi ĐANG đăng nhập tài khoản đó (POST lien-ket/:nguon › lienKetMxh). Tài khoản không mật khẩu đặt mật khẩu bằng
// `dat-mat-khau` (xác minh lại bằng Google/Facebook) — gỡ máy, xoá tài khoản, gỡ trên máy Con đều cần mật khẩu.
// Lời mời theo email (loiMoiChoToi / moi/nhan {id}): Google khớp được (chỉ nhận id_token có email_verified); tài khoản Facebook KHÔNG khớp
// (Graph không cam kết email đã xác minh) — chỉ nhận lời mời qua link (token `ma`). Chặn ở lib/thanh-vien.ts.
// Giới hạn lượt (bảng pin_sai, khung 15 phút cố định như ghép máy): đăng nhập MXH theo IP (chỉ lượt hỏng) + theo tài khoản MXH;
// dat-mat-khau theo Ba Mẹ + theo IP. Bộ đếm khung cũ dọn trong cron hằng ngày (donBoDemMxh).
// Thiếu env ⇒ 503 `mxh_chua_bat` (app đọc `GET cau-hinh-dang-nhap` để ẩn nút).
// Mạng gọi qua globalThis.fetch — test thay bằng JWKS / Graph giả (dang-nhap-mxh.test.ts).
import { createHmac, createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { one, q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { SQL_CHUYEN_FB } from "./schema.ts";
import { bamMatKhau, chuanDinhDanh, dungMatKhau, taoNha, TIEN_TO_FB, type BaMe } from "./auth.ts";

const JWKS_GOOGLE = "https://www.googleapis.com/oauth2/v3/certs";
const ISS_GOOGLE = new Set(["accounts.google.com", "https://accounts.google.com"]);
const GRAPH = "https://graph.facebook.com/v21.0";
const LECH_GIAY = 60;                                  // lệch đồng hồ cho phép khi kiểm exp / iat

export type NguonMxh = "google" | "facebook";
type DanhTinh = { nguon: NguonMxh; sub: string; email: string; ten: string };

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
let taiLuc = 0;                                     // lần tải JWKS gần nhất — kid lạ chỉ được tải lại tối đa 1 lần / phút (endpoint công khai)
/** Xoá bộ nhớ JWKS (test). */
export const _xoaJwks = () => { jwks = null; taiLuc = 0; };

async function khoaGoogle(kid: string) {
  const tim = () => jwks && jwks.het > Date.now() ? jwks.keys.find((k) => k.kid === kid) : undefined;
  let k = tim();
  if (k) return k;
  // chưa có / hết hạn / kid lạ (Google xoay khoá) ⇒ tải lại một lần — kid lạ mà bộ nhớ còn hạn và vừa tải < 60 giây thì thôi
  if (jwks && jwks.het > Date.now() && Date.now() - taiLuc < 60_000) throw sai("Google");
  taiLuc = Date.now();
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
  // OIDC: nhiều aud ⇒ azp (bên được cấp token) phải là client của mình
  if ((aud.length > 1 || tai.azp !== undefined) && !ds.includes(String(tai.azp ?? ""))) throw sai("Google");
  if (typeof tai.exp !== "number" || tai.exp + LECH_GIAY < bay || (typeof tai.iat === "number" && tai.iat - LECH_GIAY > bay)) throw sai("Google");
  if (tai.email_verified !== true && tai.email_verified !== "true") throw new LoiNghiepVu("mxh_khong_email", "Email Google này chưa xác minh — dùng số điện thoại / email nhé", 400);
  if (!tai.sub) throw sai("Google");
  return { nguon: "google", sub: String(tai.sub), email: String(tai.email ?? ""), ten: String(tai.name ?? tai.given_name ?? "") };
}

// ---------------------------------------------------------------- Facebook

/** access token Facebook ⇒ {sub, email (có thể rỗng — chỉ tham khảo), ten}. Token của app khác / hết hạn ⇒ 401. */
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
  if (!me.j?.id || String(me.j.id) !== String(d.user_id ?? "")) throw sai("Facebook");
  return { nguon: "facebook", sub: String(me.j.id), email: String(me.j.email ?? ""), ten: String(me.j.name ?? "") };
}

// ---------------------------------------------------------------- tìm / tạo Ba Mẹ

const TEN_MAC_DINH = "Ba Mẹ";
const TEN_NGUON: Record<NguonMxh, string> = { google: "Google", facebook: "Facebook" };
const xacMinh = (nguon: NguonMxh, b: Record<string, unknown>) => (nguon === "google" ? xacMinhGoogle(b.idToken) : xacMinhFacebook(b.accessToken));
const theoMxh = (dt: DanhTinh) => one<{ id: string }>(
  `select p.id from ba_me_mxh m join parents p on p.id = m.parent_id where m.nguon = $1 and m.sub = $2 and p.vai <> 'roi'`, [dt.nguon, dt.sub]);

/** Định danh riêng của tài khoản tạo bằng Facebook. chuanDinhDanh chỉ nhận SĐT / email ⇒ không ai gõ được nó để đăng nhập / đăng ký. */
export const dinhDanhFb = (sub: string) => `${TIEN_TO_FB}${sub}`;
/** Email để LƯU tham khảo (không dùng khớp / khoá tài khoản). */
const emailThamKhao = (e: string) => { const d = chuanDinhDanh(e); return d?.includes("@") ? d : null; };

/** Danh tính đã xác minh ⇒ {id, moi}. `moi` = vừa tạo nhà (app đưa vào Lần đầu, hoặc màn Lời mời nếu có lời mời chờ). */
export async function vaoBangMxh(dt: DanhTinh): Promise<{ id: string; moi: boolean }> {
  const da = await theoMxh(dt);
  if (da) return { id: da.id, moi: false };
  const fb = dt.nguon === "facebook";
  const d = fb ? dinhDanhFb(dt.sub) : chuanDinhDanh(dt.email);
  if (!d || (!fb && !d.includes("@"))) throw new LoiNghiepVu("mxh_khong_email", "Tài khoản này không có email hợp lệ — dùng số điện thoại nhé", 400);
  const trung = async () => {
    if (fb) return;                                    // fb:<id> không trùng ai ngoài chính tài khoản Facebook này (bắt lại bằng theoMxh)
    const p = await one<{ id: string; co_mk: boolean; nguon: string | null }>(
      `select p.id, p.pass_hash is not null as co_mk, (select nguon from ba_me_mxh where parent_id = p.id order by lien_ket, created_at limit 1) as nguon from parents p where p.dinh_danh = $1`, [d]);
    if (!p) return;
    const cach = p.co_mk ? "email + mật khẩu" : p.nguon === "google" || p.nguon === "facebook" ? TEN_NGUON[p.nguon] : "cách đã dùng lần trước";
    throw new LoiNghiepVu("mxh_da_co_tai_khoan", `Email ${d} đã có tài khoản AiiGrow — đăng nhập bằng ${cach} nhé`, 409);
  };
  await trung();
  const ten = (dt.ten.normalize("NFC").trim().replace(/\s+/g, " ") || TEN_MAC_DINH).slice(0, 40);
  try {
    const id = await tx(async (t) => {
      const id = await taoNha(t, d, ten, null);
      await t(`insert into ba_me_mxh(nguon, sub, parent_id, email) values ($1, $2, $3, $4)`, [dt.nguon, dt.sub, id, emailThamKhao(dt.email)]);
      return id;
    });
    return { id, moi: true };
  } catch (e) {
    // bấm hai lần / hai máy cùng lúc: lần kia vừa tạo xong (khoá chính nguồn+sub, dinh_danh unique) ⇒ dùng đúng tài khoản đó
    const lai = await theoMxh(dt);
    if (lai) return { id: lai.id, moi: false };
    await trung();
    throw e;
  }
}

// ---------------------------------------------------------------- giới hạn lượt

export const KHUNG_PHUT = 15;
/** Trần mỗi khung 15 phút. IP rộng hơn tài khoản (nhiều người chung NAT / wifi quán). */
export const TRAN = { dangNhapIp: 30, dangNhapTk: 10, datMkIp: 10, datMkTk: 5, lienKetIp: 10, lienKetTk: 5, doiMkTk: 5 } as const;
const khung = (now: number) => Math.floor(now / (KHUNG_PHUT * 60_000));
const TIEN_TO = ["mxh_ip", "mxh_tk", "dat_mk_ip", "dat_mk_tk", "lien_ket_ip", "lien_ket_tk", "doi_mk_tk"];
/** Dọn tài khoản Facebook bản cũ tạo (trước bản vá, hoặc bản cũ chạy song song lúc deploy sau khi SCHEMA_S2 đã chạy). Lỗi không chặn cron. */
export async function chuyenFbCu() {
  try { for (const c of SQL_CHUYEN_FB) await q(c); } catch (e) { console.error("chuyenFbCu", e); }
}

/** Xoá bộ đếm của các khung đã qua — chạy trong cron hằng ngày (/api/cron/don-kiem-toan), không trên đường đăng nhập. → số dòng xoá.
 *  Kèm chuyenFbCu (dọn tài khoản Facebook do bản cũ tạo trong lúc deploy). */
export async function donBoDemMxh(now = Date.now()) {
  await chuyenFbCu();
  const k = khung(now);
  return (await q(`delete from pin_sai where split_part(khoa, ':', 1) = any($1::text[]) and split_part(khoa, ':', -1) not in ($2, $3) returning 1`,
    [TIEN_TO, String(k), String(k - 1)])).length;
}
// trả lượt không được làm hỏng lỗi gốc ⇒ nuốt lỗi DB ở đây
const traLuot = (khoa: string) => q(`update pin_sai set so_lan = greatest(so_lan - 1, 0) where khoa = $1`, [khoa]).catch(() => undefined);
/** Giữ chỗ một lượt TRƯỚC khi làm (một upsert nguyên tử — gửi song song cũng chỉ ≤ `tran` lượt lọt); quá trần ⇒ 429 tới hết khung. */
async function giuLuot(khoa: string, k: number, tran: number) {
  khoa = `${khoa}:${k}`;
  const s = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan) values ($1, 1)
    on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0];
  if (s.so_lan > tran) throw new LoiNghiepVu("qua_nhieu_lan", `Thử nhiều lần quá — đợi ${KHUNG_PHUT} phút rồi thử lại nhé`, 429);
  return khoa;
}

/** POST dang-nhap/google {idToken} | dang-nhap/facebook {accessToken} ⇒ {id, moi}. `ip` = nguồn gọi (gia-dinh.ts › nguonGoi).
 *  Đếm theo IP trước khi gọi Google / Facebook (chặn dội token rác) — xác minh được thì TRẢ lượt IP (như ghép máy: chỉ lượt hỏng bị tính,
 *  nhiều người chung NAT / wifi quán vẫn vào được); rồi theo tài khoản MXH sau khi xác minh. */
export async function dangNhapMxh(nguon: NguonMxh, b: Record<string, unknown>, ip = "?", now = Date.now()) {
  const k = khung(now);
  const khoaIp = await giuLuot(`mxh_ip:${ip}`, k, TRAN.dangNhapIp);
  let dt: DanhTinh;
  try { dt = await xacMinh(nguon, b); } catch (e) {
    // chỉ «chưa bật» (không gọi ra ngoài) được trả lượt; token hỏng, không email, lỗi mạng đều đã tốn lời gọi Google / Facebook ⇒ tính
    if (e instanceof LoiNghiepVu && e.ma === "mxh_chua_bat") await traLuot(khoaIp);
    throw e;
  }
  // trả lượt IP chỉ SAU khi qua trần tài khoản — không thì xen token đúng (đã hết lượt) với token rác sẽ giữ bộ đếm IP ở 0
  await giuLuot(`mxh_tk:${dt.nguon}:${dt.sub}`, k, TRAN.dangNhapTk);
  await traLuot(khoaIp);
  return vaoBangMxh(dt);
}

/** Gỡ máy / xoá tài khoản cần mật khẩu: tài khoản Google / Facebook chưa có ⇒ 409 rõ ràng để app mở «Đặt mật khẩu». */
export function chuaCoMatKhau(p: { pass_hash: string | null } | undefined) {
  if (p && !p.pass_hash) throw new LoiNghiepVu("chua_co_mat_khau", "Tài khoản vào bằng Google / Facebook chưa có mật khẩu — đặt mật khẩu trước (Cả nhà › Đặt mật khẩu)", 409);
}

/** POST dat-mat-khau {matKhauMoi, idToken | accessToken}: tài khoản Google / Facebook đặt mật khẩu LẦN ĐẦU. Phiên thôi chưa đủ — phải
 *  xác minh lại bằng đúng tài khoản Google / Facebook đã gắn (người cầm máy đang mở app không tự đặt được mật khẩu để gỡ máy / xoá nhà). */
export async function datMatKhauMxh(bm: BaMe, b: Record<string, unknown>, ip = "?", now = Date.now()) {
  const mk = String(b.matKhauMoi ?? "");
  if (mk.length < 8) throw new LoiNghiepVu("mk_ngan", "Mật khẩu cần ít nhất 8 ký tự");
  const p = await one<{ pass_hash: string | null; dinh_danh: string }>(`select pass_hash, dinh_danh from parents where id = $1`, [bm.id]);
  if (p?.pass_hash) throw new LoiNghiepVu("da_co_mat_khau", p.dinh_danh.startsWith(TIEN_TO_FB)
    ? "Tài khoản đã có mật khẩu — tài khoản Facebook quên mật khẩu thì nhờ hỗ trợ AiiGrow" : "Tài khoản đã có mật khẩu — đổi bằng «Quên mật khẩu»", 409);
  // tài khoản trước: phiên đã hết lượt riêng thì không đốt tiếp lượt IP của người khác chung mạng
  await giuLuot(`dat_mk_tk:${bm.id}`, khung(now), TRAN.datMkTk);
  await giuLuot(`dat_mk_ip:${ip}`, khung(now), TRAN.datMkIp);
  const dt = await xacMinh(b.idToken ? "google" : "facebook", b);
  if ((await theoMxh(dt))?.id !== bm.id) throw new LoiNghiepVu("mxh_khong_khop", `Tài khoản ${TEN_NGUON[dt.nguon]} này không phải tài khoản đang đăng nhập`, 403);
  const bam = await bamMatKhau(mk);
  // chỉ đặt khi vẫn chưa có (hai yêu cầu cùng lúc không ghi đè nhau)
  const r = await q(`update parents set pass_hash = $2 where id = $1 and pass_hash is null returning id`, [bm.id, bam]);
  if (!r.length) throw new LoiNghiepVu("da_co_mat_khau", "Tài khoản đã có mật khẩu — đổi bằng «Quên mật khẩu»", 409);
  await q(`delete from pin_sai where khoa like $1`, [`dat_mk_tk:${bm.id}:%`]);
}

/** POST doi-mat-khau {matKhau, matKhauMoi} — màn «Đổi mật khẩu» (thiết kế 14/11 bm-ca-nha/09 them-o4k6oei0): đúng mật khẩu đang dùng ⇒
 *  đặt mật khẩu mới (≥ 8 ký tự), đăng xuất các máy KHÁC (phiên đang dùng `giuPhien` giữ lại). Chưa có mật khẩu (Google / Facebook) ⇒ 409
 *  `chua_co_mat_khau`. Sai ⇒ 401 `sai_mat_khau`; bộ đếm riêng 5 lượt / 15 phút (như lien-ket — không đụng khoá đăng nhập). */
export async function doiMatKhau(bm: BaMe, b: Record<string, unknown>, giuPhien: string | null, now = Date.now()) {
  const mk = String(b.matKhauMoi ?? "");
  if (mk.length < 8) throw new LoiNghiepVu("mk_ngan", "Mật khẩu cần ít nhất 8 ký tự");
  await giuLuot(`doi_mk_tk:${bm.id}`, khung(now), TRAN.doiMkTk);
  const p = await one<{ pass_hash: string | null }>(`select pass_hash from parents where id = $1 and vai <> 'roi'`, [bm.id]);
  if (!p) throw new LoiNghiepVu("chua_dang_nhap", "Phiên đăng nhập đã hết — đăng nhập lại nhé", 401);
  chuaCoMatKhau(p);
  if (!(await dungMatKhau(String(b.matKhau ?? ""), p.pass_hash!))) throw new LoiNghiepVu("sai_mat_khau", "Mật khẩu đang dùng chưa đúng", 401);
  const bam = await bamMatKhau(mk);
  await tx(async (t) => {
    await t(`update parents set pass_hash = $2, sai_lien = 0, khoa_den = null where id = $1`, [bm.id, bam]);
    await t(`delete from sessions where parent_id = $1 and id <> $2`, [bm.id, giuPhien ?? ""]);
  });
  return { ok: true };
}

/** POST lien-ket/google {idToken, matKhau} | lien-ket/facebook {accessToken, matKhau} (đã đăng nhập): gắn tài khoản Google / Facebook vào
 *  CHÍNH tài khoản đang đăng nhập — lần sau vào bằng nút Google / Facebook là vào tài khoản này. Không bao giờ gắn theo email.
 *  Phiên thôi chưa đủ (như dat-mat-khau): phải nhập đúng mật khẩu hiện tại — người cầm máy đang mở app không gắn được Facebook của mình vào
 *  tài khoản Ba Mẹ. Chưa có mật khẩu ⇒ 409 `chua_co_mat_khau` (đặt mật khẩu trước). Tài khoản MXH đó đã gắn chỗ khác (kể cả tài khoản tự
 *  tạo lúc bấm nút trước đây) ⇒ 409 `mxh_da_gan`; tài khoản này đã gắn một tài khoản cùng nguồn khác ⇒ 409 `mxh_da_gan_khac`.
 *  Giới hạn lượt 5 / Ba Mẹ + 10 / IP mỗi 15 phút. → {ok, nguon}. */
export async function lienKetMxh(bm: BaMe, nguon: NguonMxh, b: Record<string, unknown>, ip = "?", now = Date.now()) {
  await giuLuot(`lien_ket_tk:${bm.id}`, khung(now), TRAN.lienKetTk);
  await giuLuot(`lien_ket_ip:${ip}`, khung(now), TRAN.lienKetIp);
  // bộ đếm RIÊNG (lien_ket_tk ở trên, mọi lượt đều tính — như xoa-tai-khoan.ts › kiemMatKhau), không đụng khoá đăng nhập: người cầm máy
  // gõ sai không khoá được Ba Mẹ khỏi đăng nhập, và cũng không dò mật khẩu quá 5 lượt / 15 phút
  const p = await one<{ pass_hash: string | null }>(`select pass_hash from parents where id = $1 and vai <> 'roi'`, [bm.id]);
  if (!p) throw new LoiNghiepVu("chua_dang_nhap", "Phiên đăng nhập đã hết — đăng nhập lại nhé", 401);
  chuaCoMatKhau(p);
  if (!(await dungMatKhau(String(b.matKhau ?? ""), p.pass_hash!))) throw new LoiNghiepVu("sai_mat_khau", "Mật khẩu chưa đúng", 401);
  const dt = await xacMinh(nguon, b);
  const ten = TEN_NGUON[nguon];
  const r = await q(`insert into ba_me_mxh(nguon, sub, parent_id, email, lien_ket) values ($1, $2, $3, $4, true) on conflict do nothing returning 1`,
    [nguon, dt.sub, bm.id, emailThamKhao(dt.email)]);
  if (r.length) return { ok: true, nguon };
  // không chèn được: (nguon, sub) đã gắn ai đó, hoặc tài khoản này đã gắn một tài khoản cùng nguồn (chỉ mục ba_me_mxh_mot_nguon)
  const da = await one<{ parent_id: string }>(`select parent_id from ba_me_mxh where nguon = $1 and sub = $2`, [nguon, dt.sub]);
  if (da?.parent_id === bm.id) return { ok: true, nguon };
  if (da) throw new LoiNghiepVu("mxh_da_gan", `Tài khoản ${ten} này đã gắn với một tài khoản AiiGrow khác — xoá tài khoản kia trước rồi gắn lại`, 409);
  throw new LoiNghiepVu("mxh_da_gan_khac", `Tài khoản đã gắn một tài khoản ${ten} khác`, 409);
}
