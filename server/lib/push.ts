// Push thật cho Ba Mẹ (#876), máy chủ gửi THẲNG, không qua Expo: iOS = APNs HTTP/2 (JWT ES256 ký bằng khoá .p8), Android = FCM HTTP v1 (OAuth2 từ service account).
// App đăng ký token GỐC (getDevicePushTokenAsync) kèm loại apns|fcm (+ môi trường apns: sandbox | production — bản TestFlight / App Store là production) ⇒ bảng push_token.
// Khoá đọc từ biến môi trường, thiếu thì bỏ qua êm (log một lần): APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8 (PEM, `\n` chữ cũng được), APNS_TOPIC (mặc định vn.aiilab.aiigrow),
// FCM_SERVICE_ACCOUNT_JSON (chuỗi JSON). Token chết (APNs 410 / BadDeviceToken, FCM UNREGISTERED) ⇒ xoá. Gửi lỗi không bao giờ làm hỏng việc chính.
import { createPrivateKey, createSign, sign as kyThang } from "node:crypto";
import { connect as http2Connect } from "node:http2";
import { q } from "./db.ts";
import { SCHEMA_TV_TB } from "./schema.ts";
import { LoiNghiepVu } from "./loi.ts";

export type TinPush = { title: string; body: string; data?: Record<string, string>; channelId?: string };
export type Loai = "apns" | "fcm";
export type KetQuaGui = "ok" | "chet" | "loi";
export type BoGui = { apns?: (token: string, moiTruong: string, tin: TinPush) => Promise<KetQuaGui>; fcm?: (token: string, tin: TinPush) => Promise<KetQuaGui> };

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const daBao = new Set<string>();
const baoMotLan = (khoa: string, msg: string) => { if (!daBao.has(khoa)) { daBao.add(khoa); console.warn(`push: ${msg}`); } };

// ---------------------------------------------------------------- đăng ký token
const TOKEN_APNS = /^[0-9a-fA-F]{64,200}$/;
export const laTokenHopLe = (loai: string, t: unknown): t is string =>
  typeof t === "string" && (loai === "apns" ? TOKEN_APNS.test(t) : loai === "fcm" ? /^[\w:.-]{30,4096}$/.test(t) : false);

let coBang = false;
async function bangPush() {
  if (coBang) return;
  for (const c of SCHEMA_TV_TB.filter((x) => x.includes("push_token"))) await q(c);
  coBang = true;
}

export async function dangKyPushToken(parentId: string, b: { token?: unknown; loai?: unknown; moiTruong?: unknown }) {
  const loai = String(b.loai);
  if (!laTokenHopLe(loai, b.token)) throw new LoiNghiepVu("token_sai", "Mã đăng ký thông báo không hợp lệ");
  const moi = loai === "apns" && b.moiTruong === "sandbox" ? "sandbox" : "production";
  await bangPush();
  await q(`insert into push_token(token, parent_id, loai, moi_truong) values ($1, $2, $3, $4)
           on conflict (token) do update set parent_id = excluded.parent_id, loai = excluded.loai, moi_truong = excluded.moi_truong, updated_at = now()`, [b.token, parentId, loai, moi]);
  return { ok: true };
}

/** Đăng xuất / tắt thông báo trên máy này: xoá token (chỉ của chính Ba Mẹ đó). */
export async function huyPushToken(parentId: string, b: { token?: unknown }) {
  await bangPush();
  if (typeof b.token === "string") await q(`delete from push_token where token = $1 and parent_id = $2`, [b.token, parentId]);
  return { ok: true };
}

// ---------------------------------------------------------------- APNs
export const taoJwtEs256 = (pem: string, keyId: string, teamId: string, iat: number) => {
  const dau = `${b64u(JSON.stringify({ alg: "ES256", kid: keyId }))}.${b64u(JSON.stringify({ iss: teamId, iat }))}`;
  return `${dau}.${b64u(kyThang("sha256", Buffer.from(dau), { key: createPrivateKey(pem), dsaEncoding: "ieee-p1363" }))}`;
};
export const dongApns = (tin: TinPush) => ({ aps: { alert: { title: tin.title, body: tin.body }, sound: "default" }, ...(tin.data ?? {}) });
/** APNs: 200 ok; 410 hoặc 400 BadDeviceToken / Unregistered / DeviceTokenNotForTopic ⇒ token chết. */
export const phanLoaiApns = (status: number, body: string): KetQuaGui => {
  if (status === 200) return "ok";
  const ly = (() => { try { return String(JSON.parse(body).reason ?? ""); } catch { return ""; } })();
  return status === 410 || (status === 400 && /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(ly)) ? "chet" : "loi";
};
let jwtApns: { jwt: string; luc: number } | null = null;
type MoApns = typeof http2Connect;
/** Gửi một tin tới APNs qua HTTP/2. `ket` tiêm được cho test. */
export function guiApns(token: string, moiTruong: string, tin: TinPush, ket: MoApns = http2Connect, nay = Date.now()): Promise<KetQuaGui> {
  const keyId = process.env.APNS_KEY_ID, teamId = process.env.APNS_TEAM_ID, pem = process.env.APNS_KEY_P8?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !pem) { baoMotLan("apns", "thiếu APNS_KEY_ID / APNS_TEAM_ID / APNS_KEY_P8 — bỏ qua push iOS"); return Promise.resolve("loi"); }
  if (!jwtApns || nay - jwtApns.luc > 40 * 60_000) jwtApns = { jwt: taoJwtEs256(pem, keyId, teamId, Math.floor(nay / 1000)), luc: nay };   // APNs: JWT sống 20–60 phút
  const jwt = jwtApns.jwt;
  return new Promise((xong) => {
    const kn = ket(moiTruong === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com");
    let da = false;
    const kt = (r: KetQuaGui) => { if (da) return; da = true; try { kn.close(); } catch { /* đã đóng */ } xong(r); };
    kn.on("error", () => kt("loi"));
    const rq = kn.request({ ":method": "POST", ":path": `/3/device/${token}`, authorization: `bearer ${jwt}`, "apns-topic": process.env.APNS_TOPIC || "vn.aiilab.aiigrow",
      "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json" });
    let status = 0, body = "";
    rq.setTimeout(8000, () => { rq.close(); kt("loi"); });
    rq.on("response", (h) => { status = Number(h[":status"]); });
    rq.on("data", (c: Buffer) => { body += c; });
    rq.on("end", () => kt(phanLoaiApns(status, body)));
    rq.on("error", () => kt("loi"));
    rq.end(JSON.stringify(dongApns(tin)));
  });
}

// ---------------------------------------------------------------- FCM HTTP v1
export const taoJwtRs256 = (pem: string, email: string, aud: string, iat: number) => {
  const dau = `${b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64u(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud, iat, exp: iat + 3600 }))}`;
  return `${dau}.${createSign("RSA-SHA256").update(dau).sign(pem).toString("base64url")}`;
};
export const dongFcm = (token: string, tin: TinPush) => ({ message: { token, notification: { title: tin.title, body: tin.body }, data: tin.data ?? {},
  android: { priority: "HIGH", notification: { channel_id: tin.channelId ?? "gia_dinh" } } } });
/** FCM: 200 ok; UNREGISTERED / 404 ⇒ token chết. */
export const phanLoaiFcm = (status: number, body: string): KetQuaGui => {
  if (status === 200) return "ok";
  return status === 404 || /UNREGISTERED/.test(body) ? "chet" : "loi";
};
type Fetch = typeof fetch;
let dauFcm: { tok: string; het: number } | null = null;
const taiKhoanFcm = () => { try { const j = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON ?? ""); return j.client_email && j.private_key && j.project_id ? j as { client_email: string; private_key: string; project_id: string; token_uri?: string } : null; } catch { return null; } };
export async function guiFcm(token: string, tin: TinPush, lay: Fetch = fetch, nay = Date.now()): Promise<KetQuaGui> {
  const tk = taiKhoanFcm();
  if (!tk) { baoMotLan("fcm", "thiếu / sai FCM_SERVICE_ACCOUNT_JSON — bỏ qua push Android"); return "loi"; }
  const uri = tk.token_uri || "https://oauth2.googleapis.com/token";
  if (!dauFcm || nay > dauFcm.het - 60_000) {
    const r = await lay(uri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: taoJwtRs256(tk.private_key, tk.client_email, uri, Math.floor(nay / 1000)) }) });
    const j = await r.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
    if (!r.ok || !j.access_token) return "loi";
    dauFcm = { tok: j.access_token, het: nay + (j.expires_in ?? 3600) * 1000 };
  }
  const r = await lay(`https://fcm.googleapis.com/v1/projects/${tk.project_id}/messages:send`, { method: "POST", signal: AbortSignal.timeout(8000),
    headers: { "content-type": "application/json", authorization: `Bearer ${dauFcm.tok}` }, body: JSON.stringify(dongFcm(token, tin)) });
  const kq = phanLoaiFcm(r.status, await r.text().catch(() => ""));
  if (r.status === 401) dauFcm = null;
  return kq;
}

// ---------------------------------------------------------------- bộ gửi dùng chung
let bo: BoGui = {};
/** Test thay bộ gửi (không gọi mạng thật). Không đối số ⇒ về bộ gửi thật. */
export function datBoGuiPush(f?: BoGui) { bo = f ?? {}; }

/** Gửi một tin cho mọi máy của một Ba Mẹ. Token chết ⇒ xoá. Không bao giờ ném lỗi. → số máy gửi được. */
export async function guiPushChoBaMe(parentId: string, tin: TinPush): Promise<number> {
  try {
    await bangPush();
    const ds = await q<{ token: string; loai: Loai; moi_truong: string }>(`select token, loai, moi_truong from push_token where parent_id = $1`, [parentId]);
    const kq = await Promise.all(ds.map((x) => (x.loai === "apns" ? (bo.apns ?? guiApns)(x.token, x.moi_truong, tin) : (bo.fcm ?? ((t, n) => guiFcm(t, n)))(x.token, tin)).catch((): KetQuaGui => "loi")));
    const chet = ds.filter((_, i) => kq[i] === "chet").map((x) => x.token);
    if (chet.length) await q(`delete from push_token where token = any($1::text[])`, [chet]);
    return kq.filter((k) => k === "ok").length;
  } catch (e) {
    console.error("push loi:", e instanceof Error ? e.message : e);
    return 0;
  }
}
