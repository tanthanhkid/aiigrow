// #552 — header bảo mật: danh sách trang Next khớp server/app, CSP SPA không nới, header chung trên mọi đường.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import config, { TRANG_NEXT, csp } from "../next.config.ts";

const thuMucApp = fileURLToPath(new URL("../app/", import.meta.url));

// Đường gốc của mọi route Next: thư mục thường ở app/ (bỏ api, thư mục riêng _x), đi xuyên nhóm (x); tệp route ở gốc app/ không được có
// (gốc "/" là SPA — next.config rewrites) vì nó sẽ nhận CSP chặt của SPA và chết khi hydrate.
function duongGoc(thu: string): string[] {
  const ra: string[] = [];
  for (const t of readdirSync(thu)) {
    if (!statSync(thu + t).isDirectory() || t === "api" || t.startsWith("_")) continue;
    if (t.startsWith("(")) ra.push(...duongGoc(thu + t + "/"));
    else ra.push(t);
  }
  return ra;
}

test("TRANG_NEXT phủ mọi route Next ở server/app (kể cả trong nhóm (x)); gốc app/ không có tệp route", () => {
  const ds = new Set(TRANG_NEXT.replaceAll("\\", "").split("|"));
  assert.deepEqual(duongGoc(thuMucApp).filter((t) => !ds.has(t)), []);
  const tepRoute = /^(page|route|sitemap|robots|manifest|opengraph-image|twitter-image|icon|apple-icon)\.[a-z]+$/;
  assert.deepEqual(readdirSync(thuMucApp).filter((t) => tepRoute.test(t)), []);
});

test("CSP <meta> chèn vào index.html SPA (build-app.mjs) không chặt hơn header SPA — đổi csp(false) thì đổi cả meta", () => {
  const src = readFileSync(fileURLToPath(new URL("../scripts/build-app.mjs", import.meta.url)), "utf8");
  const meta = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(src)?.[1];
  assert.ok(meta, "build-app.mjs phải chèn CSP meta");
  const header = new Map(csp(false).split("; ").map((d) => [d.split(" ")[0], d]));
  for (const d of meta.split("; ")) assert.equal(d, header.get(d.split(" ")[0]), `meta «${d}» phải trùng chỉ thị cùng tên của csp(false)`);
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
  assert.equal(coCsp[2].headers[0].value, csp(true));
  const chung = coCsp[0].headers.map((h) => h.key);
  for (const k of ["Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"])
    assert.ok(chung.includes(k), k);
  const pp = coCsp[0].headers.find((h) => h.key === "Permissions-Policy")!.value;
  assert.match(pp, /camera=\(self\)/);
  assert.match(pp, /microphone=\(self\)/);
  });
