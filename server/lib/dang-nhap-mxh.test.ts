// Đăng nhập Google / Facebook (lib/dang-nhap-mxh.ts) — JWKS Google và Graph Facebook là bản giả (thay globalThis.fetch), không gọi mạng thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
delete process.env.GOOGLE_CLIENT_IDS; delete process.env.FACEBOOK_APP_ID; delete process.env.FACEBOOK_APP_SECRET;
const { xuLyM } = await import("./api-m.ts");
const mxh = await import("./dang-nhap-mxh.ts");
const { one } = await import("./db.ts");

const goi = async (duong: string, o: { tok?: string; body?: unknown } = {}) => {
  const req = new Request(`http://x/api/m/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyM(req, duong.split("/"));
  return { status: r.status, body: await r.json() as any };
};

// ---- Google giả: một cặp khoá RSA, JWKS công bố khoá công khai với kid «k1»
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KHOA_LA = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
const WEB = "web-123.apps.googleusercontent.com", IOS = "ios-456.apps.googleusercontent.com";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(tai: Record<string, unknown>, o: { kid?: string; khoa?: typeof privateKey } = {}) {
  const bay = Math.floor(Date.now() / 1000);
  const dau = b64({ alg: "RS256", kid: o.kid ?? "k1", typ: "JWT" });
  const than = b64({ iss: "https://accounts.google.com", aud: WEB, sub: "g1", email: "lan@gmail.com", email_verified: true, name: "Chị Lan", iat: bay, exp: bay + 3600, ...tai });
  return `${dau}.${than}.${sign("RSA-SHA256", Buffer.from(`${dau}.${than}`), o.khoa ?? privateKey).toString("base64url")}`;
}

// ---- Facebook giả: token hợp lệ «fb-tot» (user 77, có email), «fb-khong-email», «fb-app-khac»
const FB_ID = "999", FB_BI = "bi-mat-thu";
const FB: Record<string, { app: string; user: string; email?: string; name: string }> = {
  "fb-tot": { app: FB_ID, user: "77", email: "Hung@Vidu.VN", name: "Anh Hùng" },
  "fb-khong-email": { app: FB_ID, user: "78", name: "Không Email" },
  "fb-app-khac": { app: "111", user: "79", email: "x@vidu.vn", name: "X" },
};
let soLanJwks = 0;
const fetchThat = globalThis.fetch;
globalThis.fetch = (async (vao: string | URL | Request) => {
  const u = new URL(String(vao instanceof Request ? vao.url : vao));
  const tra = (j: unknown, status = 200, hdr: Record<string, string> = {}) => new Response(JSON.stringify(j), { status, headers: { "content-type": "application/json", ...hdr } });
  if (u.host === "www.googleapis.com") { soLanJwks++; return tra({ keys: [jwk] }, 200, { "cache-control": "public, max-age=20000" }); }
  if (u.host === "graph.facebook.com") {
    if (u.pathname.endsWith("/debug_token")) {
      assert.equal(u.searchParams.get("access_token"), `${FB_ID}|${FB_BI}`);
      const t = FB[u.searchParams.get("input_token") ?? ""];
      return tra({ data: t ? { is_valid: true, app_id: t.app, user_id: t.user, expires_at: Math.floor(Date.now() / 1000) + 3600 } : { is_valid: false } });
    }
    if (u.pathname.endsWith("/me")) {
      const tk = u.searchParams.get("access_token") ?? "", t = FB[tk];
      assert.equal(u.searchParams.get("appsecret_proof"), createHmac("sha256", FB_BI).update(tk).digest("hex"));
      return t ? tra({ id: t.user, name: t.name, ...(t.email ? { email: t.email } : {}) }) : tra({ error: { message: "bad" } }, 400);
    }
  }
  throw new Error(`mạng thật bị chặn trong test: ${u}`);
}) as typeof fetch;
test.after(() => { globalThis.fetch = fetchThat; });

test("thiếu env ⇒ cấu hình công khai tắt cả hai, endpoint 503 mxh_chua_bat", async () => {
  assert.deepEqual((await goi("cau-hinh-dang-nhap")).body, { google: false, facebook: false });
  const g = await goi("dang-nhap/google", { body: { idToken: jwt({}) } });
  assert.equal(g.status, 503); assert.equal(g.body.error, "mxh_chua_bat");
  const f = await goi("dang-nhap/facebook", { body: { accessToken: "fb-tot" } });
  assert.equal(f.status, 503); assert.equal(f.body.error, "mxh_chua_bat");
});

test("Google: id_token hợp lệ ⇒ tạo nhà mới (không mật khẩu), lần sau vào đúng tài khoản; JWKS được nhớ", async () => {
  process.env.GOOGLE_CLIENT_IDS = ` ${WEB}, ${IOS} ,`;
  mxh._xoaJwks(); soLanJwks = 0;
  assert.deepEqual((await goi("cau-hinh-dang-nhap")).body, { google: true, facebook: false });
  const r = await goi("dang-nhap/google", { body: { idToken: jwt({}) } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.moi, true); assert.deepEqual(r.body.loiMoi, []);
  const toi = await goi("toi", { tok: r.body.token });
  assert.equal(toi.body.baMe.dinhDanh, "lan@gmail.com");
  assert.equal(toi.body.baMe.ten, "Chị Lan");
  assert.equal(toi.body.baMe.laChuNha, true);
  assert.equal(toi.body.baMe.coMatKhau, false);
  const p = (await one<{ pass_hash: string | null; vai: string }>(`select pass_hash, vai from parents where dinh_danh = 'lan@gmail.com'`))!;
  assert.equal(p.pass_hash, null); assert.equal(p.vai, "ba_me");
  // lần hai, aud iOS ⇒ cùng tài khoản, không tạo nhà mới
  const r2 = await goi("dang-nhap/google", { body: { idToken: jwt({ aud: IOS }) } });
  assert.equal(r2.status, 200); assert.equal(r2.body.moi, undefined);
  assert.equal((await goi("toi", { tok: r2.body.token })).body.baMe.id, toi.body.baMe.id);
  assert.equal(soLanJwks, 1);
  // tài khoản không mật khẩu: đăng nhập bằng mật khẩu không vào được
  assert.equal((await goi("dang-nhap", { body: { dinhDanh: "lan@gmail.com", matKhau: "" } })).status, 401);
});

test("Google: chữ ký sai / aud lạ / iss lạ / hết hạn / email chưa xác minh / kid lạ ⇒ bị từ chối", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  const thu = async (tok: string, ma: string, status: number) => {
    const r = await goi("dang-nhap/google", { body: { idToken: tok } });
    assert.equal(r.status, status, `${ma}: ${JSON.stringify(r.body)}`); assert.equal(r.body.error, ma);
  };
  await thu(jwt({}, { khoa: KHOA_LA }), "mxh_sai", 401);
  await thu(jwt({ aud: "khac.apps.googleusercontent.com" }), "mxh_sai", 401);
  await thu(jwt({ iss: "https://ke-gia.example" }), "mxh_sai", 401);
  await thu(jwt({ exp: Math.floor(Date.now() / 1000) - 600 }), "mxh_sai", 401);
  await thu(jwt({ email_verified: false }), "mxh_khong_email", 400);
  await thu(jwt({}, { kid: "khong-co" }), "mxh_sai", 401);
  await thu(jwt({ aud: [WEB, "khac.apps.googleusercontent.com"], azp: "khac.apps.googleusercontent.com" }), "mxh_sai", 401);   // nhiều aud ⇒ azp phải là của mình
  await thu("khong.phai.jwt", "mxh_sai", 401);
  await thu("", "mxh_sai", 401);
  // sửa payload sau khi ký (đổi email) ⇒ chữ ký không khớp
  const [d, , c] = jwt({}).split(".");
  await thu(`${d}.${b64({ iss: "accounts.google.com", aud: WEB, email: "ke-gian@gmail.com", email_verified: true, exp: 9e9 })}.${c}`, "mxh_sai", 401);
});

test("Facebook: debug_token đúng app ⇒ email từ /me; app khác / token sai / không email bị từ chối", async () => {
  process.env.FACEBOOK_APP_ID = FB_ID; process.env.FACEBOOK_APP_SECRET = FB_BI;
  assert.equal((await goi("cau-hinh-dang-nhap")).body.facebook, true);
  const r = await goi("dang-nhap/facebook", { body: { accessToken: "fb-tot" } });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.moi, true);
  assert.equal((await goi("toi", { tok: r.body.token })).body.baMe.dinhDanh, "hung@vidu.vn");
  for (const [tk, ma, st] of [["fb-app-khac", "mxh_sai", 401], ["fb-gia", "mxh_sai", 401], ["fb-khong-email", "mxh_khong_email", 400], ["", "mxh_sai", 401]] as const) {
    const x = await goi("dang-nhap/facebook", { body: { accessToken: tk } });
    assert.equal(x.status, st, tk); assert.equal(x.body.error, ma, tk);
  }
});

test("lời mời: người được mời vào bằng Google với đúng email ⇒ thấy lời mời, nhận được (tài khoản trống)", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  // Chủ nhà đăng ký bằng SĐT + OTP, mời email «ba.huy@gmail.com»
  const otp = await goi("otp", { body: { dinhDanh: "0907000001" } });
  const dk = await goi("dang-ky", { body: { dinhDanh: "0907000001", ma: otp.body.ma, ten: "Mẹ Lan", matKhau: "matkhau123" } });
  assert.equal(dk.status, 200);
  const moi = await goi("thanh-vien/moi", { tok: dk.body.token, body: { dinhDanh: "Ba.Huy@gmail.com", quyen: "ba_me" } });
  assert.equal(moi.status, 200, JSON.stringify(moi.body));
  const r = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "ba.huy@gmail.com", name: "Ba Huy", sub: "g9" }) } });
  assert.equal(r.status, 200);
  assert.equal(r.body.loiMoi.length, 1);
  assert.equal(r.body.loiMoi[0].nguoiMoi, "Mẹ Lan");
  const nhan = await goi("moi/nhan", { tok: r.body.token, body: { id: r.body.loiMoi[0].id } });
  assert.equal(nhan.status, 200, JSON.stringify(nhan.body));
  const tv = await goi("thanh-vien", { tok: dk.body.token });
  assert.ok(tv.body.ds.some((x: { ten: string }) => x.ten === "Ba Huy"));
});

test("email đã có tài khoản (mật khẩu, hoặc nhà cung cấp kia) ⇒ 409, không tự gắn theo email (chống chiếm trước tài khoản)", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  const otp = await goi("otp", { body: { dinhDanh: "hoa@gmail.com" } });
  await goi("dang-ky", { body: { dinhDanh: "hoa@gmail.com", ma: otp.body.ma, ten: "Chị Hoa", matKhau: "matkhau123" } });
  const r = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "HOA@gmail.com", sub: "g10" }) } });
  assert.equal(r.status, 409); assert.equal(r.body.error, "mxh_da_co_tai_khoan"); assert.match(r.body.message, /mật khẩu/);
  // hung@vidu.vn đã vào bằng Facebook ⇒ Google cùng email bị từ chối, chỉ đường dùng Facebook
  const g = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "hung@vidu.vn", sub: "g12" }) } });
  assert.equal(g.status, 409); assert.match(g.body.message, /Facebook/);
});

test("tài khoản không mật khẩu: gỡ máy / xoá cần mật khẩu ⇒ 409 chua_co_mat_khau; đặt mật khẩu phải xác minh lại đúng tài khoản Google", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  const r = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "xoa.thu@gmail.com", sub: "g11" }) } });
  const tok = r.body.token;
  const x = await goi("xoa-tai-khoan", { tok, body: { matKhau: "gi-cung-duoc" } });
  assert.equal(x.status, 409); assert.equal(x.body.error, "chua_co_mat_khau");
  assert.equal((await goi("dat-mat-khau", { tok, body: { matKhauMoi: "ngan", idToken: jwt({ sub: "g11" }) } })).body.error, "mk_ngan");
  const khac = await goi("dat-mat-khau", { tok, body: { matKhauMoi: "matkhau123", idToken: jwt({ email: "lan@gmail.com", sub: "g1" }) } });
  assert.equal(khac.status, 403); assert.equal(khac.body.error, "mxh_khong_khop");
  assert.equal((await goi("dat-mat-khau", { tok, body: { matKhauMoi: "matkhau123" } })).status, 401);          // không gửi token xác minh lại
  const ok = await goi("dat-mat-khau", { tok, body: { matKhauMoi: "matkhau123", idToken: jwt({ email: "xoa.thu@gmail.com", sub: "g11" }) } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal((await goi("toi", { tok })).body.baMe.coMatKhau, true);
  assert.equal((await goi("dat-mat-khau", { tok, body: { matKhauMoi: "matkhau456", idToken: jwt({ email: "xoa.thu@gmail.com", sub: "g11" }) } })).status, 409);
  const xoa = await goi("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } });
  assert.equal(xoa.status, 200, JSON.stringify(xoa.body)); assert.equal(xoa.body.xoa, "gia_dinh");
  // vào lại bằng Google ⇒ tài khoản mới tinh
  const lai = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "xoa.thu@gmail.com", sub: "g11" }) } });
  assert.equal(lai.status, 200); assert.equal(lai.body.moi, true);
});

test("người bị mời ra vào lại bằng Google ⇒ không quay về nhà cũ", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  const otp = await goi("otp", { body: { dinhDanh: "0907000002" } });
  const chu = (await goi("dang-ky", { body: { dinhDanh: "0907000002", ma: otp.body.ma, ten: "Mẹ Mai", matKhau: "matkhau123" } })).body.token;
  await goi("thanh-vien/moi", { tok: chu, body: { dinhDanh: "ba.minh@gmail.com", quyen: "ba_me" } });
  const v = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "ba.minh@gmail.com", sub: "g20" }) } });
  assert.equal((await goi("moi/nhan", { tok: v.body.token, body: { id: v.body.loiMoi[0].id } })).status, 200);
  const id = (await goi("toi", { tok: v.body.token })).body.baMe.id;
  assert.equal((await goi(`thanh-vien/${id}/moi-ra`, { tok: chu, body: {} })).status, 200);
  const lai = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "ba.minh@gmail.com", sub: "g20" }) } });
  assert.equal(lai.status, 200, JSON.stringify(lai.body)); assert.equal(lai.body.moi, true);
  assert.notEqual((await goi("toi", { tok: lai.body.token })).body.baMe.id, id);
});
