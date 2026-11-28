// #876: báo người được mời — dòng thông báo «gia_dinh» + push token + bộ gửi push dùng chung (không gọi mạng thật).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { q } = await import("./db.ts");
const push = await import("./push.ts");
const { generateKeyPairSync, createVerify, verify } = await import("node:crypto");

let soIp = 0, soDt = 0;
const m = async (duong: string, o: { tok?: string; body?: unknown } = {}) => {
  const req = new Request(`http://app.vidu/api/m/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.8.0.${++soIp % 250}`, ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyM(req, duong.split("/"));
  return { status: r.status, body: await r.json() as any };
};
const sdt = () => `0944${String(++soDt).padStart(6, "0")}`;
async function dangKy(ten: string, so = sdt()) {
  const otp = await m("otp", { body: { dinhDanh: so } });
  const r = await m("dang-ky", { body: { dinhDanh: so, ma: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}
const APNS = "a".repeat(64), FCM = "f".repeat(40) + ":APA91b-token";

test("loiMoiChoToi: người được mời (đã có tài khoản) thấy dòng thông báo nhóm gia_dinh trỏ /moi/vao, chưa đọc; nhận rồi thì hết", async () => {
  const lan = await dangKy("Mẹ Lan");
  const soB = sdt();
  const b = await dangKy("Ba Tuấn", soB);
  assert.equal((await m("thong-bao", { tok: b })).body.ds.filter((x: any) => x.den === "/moi/vao").length, 0);
  assert.equal((await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: soB, quyen: "ba_me", tenGoi: "Ba Tuấn" } })).status, 200);
  const cho = (await m("moi/cho-toi", { tok: b })).body;
  assert.equal(cho.ds.length, 1);
  assert.match(cho.ds[0].moiLuc, /^\d{4}-\d\d-\d\dT/);
  const tbB = (await m("thong-bao", { tok: b })).body;
  const dong = tbB.ds.filter((x: any) => x.den === "/moi/vao");
  assert.equal(dong.length, 1);
  assert.equal(dong[0].nhom, "gia_dinh");
  assert.equal(dong[0].tieu, "Mẹ Lan mời bạn vào nhà Nhà Mẹ Lan");
  assert.equal(dong[0].moi, true);
  // người mời không thấy dòng này
  assert.equal((await m("thong-bao", { tok: lan })).body.ds.filter((x: any) => x.den === "/moi/vao").length, 0);
  // nhận lời mời ⇒ hết dòng
  assert.equal((await m("moi/nhan", { tok: b, body: { id: cho.ds[0].id } })).status, 200);
  assert.equal((await m("thong-bao", { tok: b })).body.ds.filter((x: any) => x.den === "/moi/vao").length, 0);
});

test("push-token: đăng ký apns / fcm (token sai bị từ chối), chuyển chủ khi máy đổi tài khoản, huỷ chỉ xoá của chính mình", async () => {
  const a = await dangKy("A"), b = await dangKy("B");
  assert.equal((await m("thong-bao/push-token", { tok: a, body: { token: "linh-tinh", loai: "apns" } })).body.error, "token_sai");
  assert.equal((await m("thong-bao/push-token", { tok: a, body: { token: APNS, loai: "xyz" } })).body.error, "token_sai");
  assert.equal((await m("thong-bao/push-token", { tok: a, body: { token: APNS, loai: "apns", moiTruong: "sandbox" } })).status, 200);
  const idA = (await m("toi", { tok: a })).body.baMe.id, idB = (await m("toi", { tok: b })).body.baMe.id;
  assert.deepEqual((await q(`select loai, moi_truong from push_token where parent_id = $1`, [idA])).map((x: any) => [x.loai, x.moi_truong]), [["apns", "sandbox"]]);
  await m("thong-bao/push-token", { tok: b, body: { token: APNS, loai: "apns" } });          // cùng máy, tài khoản khác
  assert.equal((await q(`select 1 from push_token where parent_id = $1`, [idA])).length, 0);
  assert.equal((await q(`select 1 from push_token where parent_id = $1`, [idB])).length, 1);
  await m("thong-bao/push-token/huy", { tok: a, body: { token: APNS } });                    // A không xoá được token của B
  assert.equal((await q(`select 1 from push_token where parent_id = $1`, [idB])).length, 1);
  await m("thong-bao/push-token/huy", { tok: b, body: { token: APNS } });
  assert.equal((await q(`select 1 from push_token where parent_id = $1`, [idB])).length, 0);
});

test("mời / gửi lại cho người đã có tài khoản + token ⇒ gửi push đúng kênh (bộ gửi giả); token chết bị xoá; không token ⇒ không gửi", async () => {
  const gui: { k: string; token: string; moi?: string; tin: any }[] = [];
  let chet = false;
  push.datBoGuiPush({
    apns: async (token, moi, tin) => { gui.push({ k: "apns", token, moi, tin }); return chet ? "chet" : "ok"; },
    fcm: async (token, tin) => { gui.push({ k: "fcm", token, tin }); return "ok"; },
  });
  try {
    const lan = await dangKy("Mẹ Lan"), soB = sdt(), b = await dangKy("Ba Tuấn", soB);
    assert.equal((await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: soB, quyen: "ba_me" } })).status, 200);
    assert.equal(gui.length, 0);                                                              // chưa đăng ký token
    await m("thong-bao/push-token", { tok: b, body: { token: APNS, loai: "apns", moiTruong: "production" } });
    await m("thong-bao/push-token", { tok: b, body: { token: FCM, loai: "fcm" } });
    const moi2 = await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: soB, quyen: "ba_me" } });
    assert.equal(moi2.status, 200);
    assert.deepEqual(gui.map((x) => x.k).sort(), ["apns", "fcm"]);
    const ap = gui.find((x) => x.k === "apns")!;
    assert.equal(ap.moi, "production");
    assert.equal(ap.tin.body, "Mẹ Lan mời bạn vào Nhà Mẹ Lan trên AiiGrow");
    assert.equal(ap.tin.data.den, "/moi/vao");
    assert.equal((await m(`thanh-vien/moi/${moi2.body.id}/gui-lai`, { tok: lan, body: {} })).status, 200);
    assert.equal(gui.length, 4);
    assert.equal((await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: sdt(), quyen: "ba_me" } })).status, 200);   // số chưa có tài khoản
    assert.equal(gui.length, 4);
    chet = true;                                                                              // APNs báo token chết ⇒ xoá, FCM giữ
    await m(`thanh-vien/moi/${moi2.body.id}/gui-lai`, { tok: lan, body: {} });
    const idB = (await m("toi", { tok: b })).body.baMe.id;
    assert.deepEqual((await q(`select loai from push_token where parent_id = $1`, [idB])).map((x: any) => x.loai), ["fcm"]);
  } finally { push.datBoGuiPush(); }
});

test("bộ gửi push lỗi / ném lỗi không làm hỏng việc mời", async () => {
  push.datBoGuiPush({ apns: async () => { throw new Error("mat mang"); } });
  try {
    const lan = await dangKy("Mẹ Lan"), soB = sdt(), b = await dangKy("Ba", soB);
    await m("thong-bao/push-token", { tok: b, body: { token: APNS, loai: "apns" } });
    assert.equal((await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: soB, quyen: "ba_me" } })).status, 200);
  } finally { push.datBoGuiPush(); }
});

test("APNs: JWT ES256 ký đúng (ieee-p1363), payload, phân loại token chết; thiếu khoá ⇒ im lặng 'loi'", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const jwt = push.taoJwtEs256(pem, "KEY123", "TEAM456", 1700000000);
  const [h, p, sg] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "KEY123" });
  assert.deepEqual(JSON.parse(Buffer.from(p, "base64url").toString()), { iss: "TEAM456", iat: 1700000000 });
  assert.ok(verify("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(sg, "base64url")));
  assert.deepEqual(push.dongApns({ title: "T", body: "B", data: { den: "/moi/vao" } }), { aps: { alert: { title: "T", body: "B" }, sound: "default" }, den: "/moi/vao" });
  assert.equal(push.phanLoaiApns(200, ""), "ok");
  assert.equal(push.phanLoaiApns(410, '{"reason":"Unregistered"}'), "chet");
  assert.equal(push.phanLoaiApns(400, '{"reason":"BadDeviceToken"}'), "chet");
  assert.equal(push.phanLoaiApns(403, '{"reason":"InvalidProviderToken"}'), "loi");
  delete process.env.APNS_KEY_ID;
  assert.equal(await push.guiApns(APNS, "production", { title: "T", body: "B" }, (() => { throw new Error("không được kết nối"); }) as never), "loi");
});

test("FCM v1: JWT RS256 đổi lấy access token, gửi messages:send đúng dạng, UNREGISTERED ⇒ chết; thiếu khoá ⇒ 'loi'", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const jwt = push.taoJwtRs256(pem, "sa@proj.iam.gserviceaccount.com", "https://oauth2.googleapis.com/token", 1700000000);
  const [h, p, sg] = jwt.split(".");
  assert.ok(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(sg, "base64url")));
  assert.equal(JSON.parse(Buffer.from(p, "base64url").toString()).scope, "https://www.googleapis.com/auth/firebase.messaging");
  assert.equal(push.phanLoaiFcm(404, ""), "chet");
  assert.equal(push.phanLoaiFcm(400, '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}'), "chet");
  assert.equal(push.phanLoaiFcm(500, ""), "loi");
  const goi: { url: string; init: any }[] = [];
  let tra = { status: 200, body: "{}" };
  const lay = (async (url: string, init: any) => {
    goi.push({ url, init });
    return url.includes("oauth2") ? new Response(JSON.stringify({ access_token: "tok-fcm", expires_in: 3600 })) : new Response(tra.body, { status: tra.status });
  }) as unknown as typeof fetch;
  delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  assert.equal(await push.guiFcm(FCM, { title: "T", body: "B" }, lay), "loi");
  assert.equal(goi.length, 0);
  process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "sa@proj.iam.gserviceaccount.com", private_key: pem, project_id: "proj-1" });
  try {
    assert.equal(await push.guiFcm(FCM, { title: "T", body: "B", data: { den: "/moi/vao" } }, lay), "ok");
    assert.equal(goi[0].url, "https://oauth2.googleapis.com/token");
    assert.equal(goi[1].url, "https://fcm.googleapis.com/v1/projects/proj-1/messages:send");
    assert.equal(goi[1].init.headers.authorization, "Bearer tok-fcm");
    const msg = JSON.parse(goi[1].init.body).message;
    assert.deepEqual([msg.token, msg.notification.title, msg.data.den], [FCM, "T", "/moi/vao"]);
    tra = { status: 404, body: '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}' };
    assert.equal(await push.guiFcm(FCM, { title: "T", body: "B" }, lay), "chet");
    assert.equal(goi.filter((x) => x.url.includes("oauth2")).length, 1);                      // access token được giữ lại
  } finally { delete process.env.FCM_SERVICE_ACCOUNT_JSON; }
});
