// node --test src/lib/doi-ma-google.test.ts — đổi mã Google thất bại phải ném lỗi có câu báo rõ, không im lặng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { layIdTokenGoogle, LoiDoiMa, LOI_DOI_MA } from "./doi-ma-google.ts";

const khongGoi = async () => { throw new Error("không được gọi đổi mã"); };

test("đã có id_token (web) ⇒ trả luôn, không đổi mã", async () => {
  assert.equal(await layIdTokenGoogle({ params: { id_token: "tok" } }, khongGoi), "tok");
  assert.equal(await layIdTokenGoogle({ params: {}, authentication: { idToken: "tok2" } }, khongGoi), "tok2");
});

test("có code ⇒ đổi mã lấy id_token", async () => {
  let ma = "";
  assert.equal(await layIdTokenGoogle({ params: { code: "c1" } }, async (c) => { ma = c; return { idToken: "id-1" }; }), "id-1");
  assert.equal(ma, "c1");
});

test("đổi mã lỗi / không có id_token / quá giờ / thiếu code ⇒ LoiDoiMa với câu báo rõ", async () => {
  const kiem = (p: Promise<unknown>) => assert.rejects(p, (e: unknown) => e instanceof LoiDoiMa && (e as Error).message === LOI_DOI_MA);
  await kiem(layIdTokenGoogle({ params: { code: "c" } }, async () => { throw new Error("invalid_grant"); }));
  await kiem(layIdTokenGoogle({ params: { code: "c" } }, async () => ({})));
  await kiem(layIdTokenGoogle({ params: { code: "c" } }, () => new Promise(() => {}), 20));
  await kiem(layIdTokenGoogle({ params: {} }, khongGoi));
});
