// Đăng nhập Google / Facebook (lib/dang-nhap-mxh.ts) — JWKS Google và Graph Facebook là bản giả (thay globalThis.fetch), không gọi mạng thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
delete process.env.GOOGLE_CLIENT_IDS; delete process.env.FACEBOOK_APP_ID; delete process.env.FACEBOOK_APP_SECRET;
const { xuLyM } = await import("./api-m.ts");
const mxh = await import("./dang-nhap-mxh.ts");
const { one, q } = await import("./db.ts");
const { sha } = await import("./auth.ts");

// mỗi lời gọi một IP riêng (trừ khi test chỉ định) — không để giới hạn theo IP làm lệch các test khác
let soIp = 0;
const goi = async (duong: string, o: { tok?: string; body?: unknown; ip?: string } = {}) => {
  const req = new Request(`http://x/api/m/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-real-ip": o.ip ?? `10.0.${Math.floor(++soIp / 250)}.${soIp % 250}`,
      ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
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
  "fb-moi": { app: FB_ID, user: "80", email: "fb.moi@vidu.vn", name: "Cô Út" },
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

test("Facebook KHÔNG khớp lời mời theo email (email chưa chắc đã xác minh) — chỉ nhận qua link mời", async () => {
  process.env.FACEBOOK_APP_ID = FB_ID; process.env.FACEBOOK_APP_SECRET = FB_BI;
  const otp = await goi("otp", { body: { dinhDanh: "0907000003" } });
  const chu = (await goi("dang-ky", { body: { dinhDanh: "0907000003", ma: otp.body.ma, ten: "Mẹ Thu", matKhau: "matkhau123" } })).body.token;
  const moi = await goi("thanh-vien/moi", { tok: chu, body: { dinhDanh: "fb.moi@vidu.vn", quyen: "ba_me" } });
  assert.equal(moi.status, 200, JSON.stringify(moi.body));
  const v = await goi("dang-nhap/facebook", { body: { accessToken: "fb-moi" } });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  assert.deepEqual(v.body.loiMoi, []);                                         // không lộ lời mời theo email
  assert.deepEqual((await goi("moi/cho-toi", { tok: v.body.token })).body.ds, []);
  const theoId = await goi("moi/nhan", { tok: v.body.token, body: { id: moi.body.id } });
  assert.equal(theoId.status, 403); assert.equal(theoId.body.error, "can_link_moi");
  // bấm link mời (token `ma`) ⇒ nhận được
  const theoLink = await goi("moi/nhan", { tok: v.body.token, body: { ma: moi.body.ma } });
  assert.equal(theoLink.status, 200, JSON.stringify(theoLink.body));
});

test("giới hạn lượt: đăng nhập MXH theo IP (30/15 phút) và theo tài khoản (10/15 phút)", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  for (let i = 1; i <= mxh.TRAN.dangNhapIp; i++)
    assert.equal((await goi("dang-nhap/google", { ip: "7.7.7.7", body: { idToken: "rac" } })).status, 401, `lượt ${i}`);
  const qua = await goi("dang-nhap/google", { ip: "7.7.7.7", body: { idToken: jwt({ email: "luot.tk@gmail.com", sub: "g50" }) } });
  assert.equal(qua.status, 429); assert.equal(qua.body.error, "qua_nhieu_lan");
  assert.equal((await goi("dang-nhap/google", { ip: "7.7.7.8", body: { idToken: jwt({ email: "luot.tk@gmail.com", sub: "g50" }) } })).status, 200);   // IP khác vẫn vào (lượt 1 của tài khoản g50)
  // theo tài khoản: đổi IP liên tục vẫn bị chặn sau 10 lượt (đã dùng 1 lượt ở trên)
  for (let i = 2; i <= mxh.TRAN.dangNhapTk; i++) assert.equal((await goi("dang-nhap/google", { body: { idToken: jwt({ email: "luot.tk@gmail.com", sub: "g50" }) } })).status, 200);
  const tk = await goi("dang-nhap/google", { body: { idToken: jwt({ email: "luot.tk@gmail.com", sub: "g50" }) } });
  assert.equal(tk.status, 429); assert.equal(tk.body.error, "qua_nhieu_lan");
  // khung 15 phút sau ⇒ mở lại
  assert.equal((await mxh.dangNhapMxh("google", { idToken: jwt({ email: "luot.tk@gmail.com", sub: "g50" }) }, "7.7.7.7", Date.now() + 15 * 60_000)).moi, false);
});

test("giới hạn lượt: dat-mat-khau theo tài khoản (5/15 phút) và theo IP (10/15 phút)", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  const tok = (await goi("dang-nhap/google", { body: { idToken: jwt({ email: "gioi.han@gmail.com", sub: "g30" }) } })).body.token;
  for (let i = 1; i <= mxh.TRAN.datMkTk; i++)
    assert.equal((await goi("dat-mat-khau", { tok, body: { matKhauMoi: "matkhau123", idToken: "rac" } })).status, 401, `lượt ${i}`);
  const qua = await goi("dat-mat-khau", { tok, body: { matKhauMoi: "matkhau123", idToken: jwt({ email: "gioi.han@gmail.com", sub: "g30" }) } });
  assert.equal(qua.status, 429); assert.equal(qua.body.error, "qua_nhieu_lan");
  // theo IP: nhiều tài khoản từ cùng một IP
  const bm = (id: string) => ({ id, family_id: "x", dinh_danh: "x", ten: "x", vai: "ba_me" }) as const;
  for (let i = 1; i <= mxh.TRAN.datMkIp; i++)
    await assert.rejects(mxh.datMatKhauMxh(bm(`gia-${i}`), { matKhauMoi: "matkhau123", idToken: "rac" }, "8.8.8.8"), { ma: "mxh_sai" });
  await assert.rejects(mxh.datMatKhauMxh(bm("gia-moi"), { matKhauMoi: "matkhau123", idToken: "rac" }, "8.8.8.8"), { ma: "qua_nhieu_lan" });
});

test("quên mật khẩu không đặt được mật khẩu cho tài khoản Google / Facebook chưa từng có mật khẩu", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  await goi("dang-nhap/google", { body: { idToken: jwt({ email: "chi.mxh@gmail.com", sub: "g40" }) } });
  // không phát mã (trả y như số/email không có tài khoản)
  const otp = await goi("otp", { body: { dinhDanh: "chi.mxh@gmail.com", mucDich: "quen_mk" } });
  assert.equal(otp.status, 200); assert.equal(otp.body.ma, undefined);
  // mã quen_mk lọt vào bằng đường nào đó (phát trước khi tài khoản đổi, chế độ thử…) ⇒ vẫn từ chối, mật khẩu vẫn trống
  await q(`insert into otp(dinh_danh, ma_hash, muc_dich, het) values ($1, $2, 'quen_mk', now() + interval '10 minutes')
           on conflict (dinh_danh) do update set ma_hash = excluded.ma_hash, muc_dich = excluded.muc_dich, het = excluded.het, so_lan = 0`,
    ["chi.mxh@gmail.com", sha("chi.mxh@gmail.com:123456")]);
  const r = await goi("quen-mat-khau", { body: { dinhDanh: "chi.mxh@gmail.com", ma: "123456", matKhauMoi: "matkhau123" } });
  assert.equal(r.status, 409); assert.equal(r.body.error, "chua_co_mat_khau");
  assert.equal((await one<{ pass_hash: string | null }>(`select pass_hash from parents where dinh_danh = 'chi.mxh@gmail.com'`))!.pass_hash, null);
  // mã đã bị tiêu (không rollback) ⇒ đặt mật khẩu bằng MXH xong, dùng lại mã cũ cũng không chiếm được
  const tokMxh = (await goi("dang-nhap/google", { body: { idToken: jwt({ email: "chi.mxh@gmail.com", sub: "g40" }) } })).body.token;
  assert.equal((await goi("dat-mat-khau", { tok: tokMxh, body: { matKhauMoi: "matkhau123", idToken: jwt({ email: "chi.mxh@gmail.com", sub: "g40" }) } })).status, 200);
  const lai = await goi("quen-mat-khau", { body: { dinhDanh: "chi.mxh@gmail.com", ma: "123456", matKhauMoi: "chiem12345" } });
  assert.equal(lai.status, 400); assert.equal(lai.body.error, "otp_het_han");
  // tài khoản có mật khẩu: quên mật khẩu vẫn chạy như cũ
  const o2 = await goi("otp", { body: { dinhDanh: "0907000004" } });
  await goi("dang-ky", { body: { dinhDanh: "0907000004", ma: o2.body.ma, ten: "Ba Tư", matKhau: "matkhau123" } });
  const o3 = await goi("otp", { body: { dinhDanh: "0907000004", mucDich: "quen_mk" } });
  assert.match(o3.body.ma, /^\d{6}$/);
  assert.equal((await goi("quen-mat-khau", { body: { dinhDanh: "0907000004", ma: o3.body.ma, matKhauMoi: "matkhau999" } })).status, 200);
});

test("giới hạn lượt: đăng nhập đúng trả lại lượt IP (nhiều người chung NAT); khung cũ tự dọn", async () => {
  process.env.GOOGLE_CLIENT_IDS = WEB;
  for (let i = 0; i < mxh.TRAN.dangNhapIp + 5; i++) {
    const r = await goi("dang-nhap/google", { ip: "5.5.5.5", body: { idToken: jwt({ email: `nat${i}@gmail.com`, sub: `nat${i}` }) } });
    assert.equal(r.status, 200, `người ${i}: ${JSON.stringify(r.body)}`);
  }
  const k = Math.floor(Date.now() / (mxh.KHUNG_PHUT * 60_000));
  assert.ok(await one(`select 1 from pin_sai where khoa = $1`, [`mxh_tk:google:nat0:${k}`]));
  await mxh.dangNhapMxh("google", { idToken: jwt({ email: "nat0@gmail.com", sub: "nat0" }) }, "5.5.5.5", Date.now() + 2 * mxh.KHUNG_PHUT * 60_000);
  assert.equal(await one(`select 1 from pin_sai where khoa = $1`, [`mxh_tk:google:nat0:${k}`]), undefined);
});
