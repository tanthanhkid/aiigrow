// Seed CI (lib/seed-ci.ts): chặn trên production / CSDL ngoài máy; seed ra đủ trạng thái và đăng nhập bằng mật khẩu (không OTP) được.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { lyDoChanSeedCi, seedCi } = await import("./seed-ci.ts");
const { xuLyM } = await import("./api-m.ts");

const env = (o: Record<string, string | undefined>) => ({ AIIGROW_CI_LOGIN: "1", NODE_ENV: "test", ...o }) as NodeJS.ProcessEnv;

test("seed CI bị chặn: thiếu cờ, production, Vercel, máy chủ thật, CSDL ngoài máy", async () => {
  assert.equal(lyDoChanSeedCi(env({})), null);
  assert.equal(lyDoChanSeedCi(env({ DATABASE_URL: "postgres://u:p@localhost:5432/aiigrow" })), null);
  assert.equal(lyDoChanSeedCi(env({ DATABASE_URL: "postgres://u:p@127.0.0.1/aiigrow" })), null);
  assert.equal(lyDoChanSeedCi(env({ DATABASE_URL: "postgres://u:p@[::1]:5432/aiigrow" })), null);
  assert.match(lyDoChanSeedCi(env({ AIIGROW_CI_LOGIN: undefined }))!, /AIIGROW_CI_LOGIN/);
  assert.match(lyDoChanSeedCi(env({ AIIGROW_CI_LOGIN: "true" }))!, /AIIGROW_CI_LOGIN/);
  assert.match(lyDoChanSeedCi(env({ NODE_ENV: "production" }))!, /production/);
  assert.match(lyDoChanSeedCi(env({ VERCEL: "1" }))!, /Vercel/);
  assert.match(lyDoChanSeedCi(env({ AIIGROW_BAT_BUOC_DB: "1" }))!, /máy chủ thật/);
  assert.match(lyDoChanSeedCi(env({ DATABASE_URL: "postgres://u:p@ep-xyz.neon.tech/db" }))!, /máy ngoài/);
  assert.match(lyDoChanSeedCi(env({ DATABASE_URL: "postgres://u:p@localhost.evil.com/db" }))!, /máy ngoài/);
  assert.match(lyDoChanSeedCi(env({ DATABASE_URL: "khong-phai-url" }))!, /không đọc được/);
  // production thật (env VPS: NODE_ENV=production + DATABASE_URL 127.0.0.1) vẫn bị chặn dù có cờ
  assert.match(lyDoChanSeedCi(env({ NODE_ENV: "production", DATABASE_URL: "postgres://u:p@127.0.0.1/aiigrow" }))!, /production/);
  await assert.rejects(seedCi({ env: env({ NODE_ENV: "production" }) }), /bị chặn/);
});

test("seed CI: nhà 3 con, máy đã ghép, việc chờ duyệt, quà, con nợ sao, lời xin web/app; đăng nhập mật khẩu ra phiên dùng được", async () => {
  const kq = await seedCi({ env: env({}) });
  const goi = async (duong: string, o: { tok?: string; body?: unknown } = {}) => {
    const r = await xuLyM(new Request(`http://x/api/m/${duong}`, { method: o.body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
      body: o.body === undefined ? undefined : JSON.stringify(o.body) }), duong.split("/"));
    return { status: r.status, body: await r.json() as any };
  };
  const dn = await goi("dang-nhap", { body: { dinhDanh: kq.dinhDanh, matKhau: kq.matKhau } });
  assert.equal(dn.status, 200);
  for (const tok of [kq.token, dn.body.token]) assert.equal((await goi("toi", { tok })).body.baMe.ten, "Mẹ Lan");
  const gd = (await goi("gia-dinh", { tok: kq.token })).body;
  assert.equal(gd.con.length, 3);
  assert.equal(kq.may.length, 3);
  const cho = (await goi("cho-duyet", { tok: kq.token })).body;
  assert.equal(cho.nhiemVu.length, 3);
  assert.deepEqual(cho.yeuCau.map((y: any) => y.loai).sort(), ["cai_app", "mo_web"]);
  assert.ok((await goi("qua", { tok: kq.token })).body.ds.length > 0);
  const { xuLyCon } = await import("./api-con.ts");
  const bill = kq.may.find((x) => x.con === kq.conNo)!;
  const toi = await (await xuLyCon(new Request("http://x/api/kid/toi", { headers: { authorization: `Bearer ${bill.token}` } }), ["toi"])).json() as any;
  assert.equal(toi.no, 15);
  // gọi lại cùng số ⇒ không tạo nhà thứ hai
  await assert.rejects(seedCi({ env: env({}) }), /da_co_tai_khoan/);
});
