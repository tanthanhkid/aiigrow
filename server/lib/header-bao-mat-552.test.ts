// #552 — header bảo mật: danh sách trang Next khớp server/app, CSP SPA không nới, API không tải gì, header chung trên mọi đường.
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import config, { TRANG_NEXT, csp } from "../next.config.ts";

const thuMucApp = fileURLToPath(new URL("../app/", import.meta.url));

test("TRANG_NEXT phủ mọi thư mục route ở server/app (trừ api, thư mục riêng _x, nhóm (x))", () => {
  const ds = new Set(TRANG_NEXT.replaceAll("\\", "").split("|"));
  const thieu = readdirSync(thuMucApp)
    .filter((t) => statSync(thuMucApp + t).isDirectory() && t !== "api" && !t.startsWith("_") && !t.startsWith("("))
    .filter((t) => !ds.has(t));
  assert.deepEqual(thieu, []);
  });

test("CSP SPA: không unsafe-inline/unsafe-eval cho script, chặn nhúng khung", () => {
  const spa = csp(false);
  assert.match(spa, /script-src 'self';/);
  assert.doesNotMatch(spa, /unsafe-eval/);
  assert.match(spa, /frame-ancestors 'none'/);
  assert.match(spa, /object-src 'none'/);
  assert.match(csp(true), /script-src 'self' 'unsafe-inline'/);
  });

test("thứ tự quy tắc: chung → trang Next → API (quy tắc sau ghi đè CSP)", async () => {
  const r = await config.headers!();
  const coCsp = r.filter((x) => x.headers.some((h) => h.key === "Content-Security-Policy"));
  assert.deepEqual(coCsp.map((x) => x.source), ["/:duong*", `/:trang(${TRANG_NEXT})/:duong*`, "/api/:duong*"]);
  assert.equal(coCsp[2].headers[0].value, "default-src 'none'; frame-ancestors 'none'");
  const chung = coCsp[0].headers.map((h) => h.key);
  for (const k of ["Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"])
    assert.ok(chung.includes(k), k);
  const pp = coCsp[0].headers.find((h) => h.key === "Permissions-Policy")!.value;
  assert.match(pp, /camera=\(self\)/);
  assert.match(pp, /microphone=\(self\)/);
  });
