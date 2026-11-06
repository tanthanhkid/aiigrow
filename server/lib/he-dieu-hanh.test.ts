import { test } from "node:test";
import assert from "node:assert/strict";
import { heDieuHanh } from "./he-dieu-hanh.ts";

test("nhận diện máy mở trang /tai", () => {
  assert.equal(heDieuHanh("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15"), "mac");
  assert.equal(heDieuHanh("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141.0 Safari/537.36", '"macOS"'), "mac");
  assert.equal(heDieuHanh("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0", '"Windows"'), "windows");
  assert.equal(heDieuHanh("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148"), "ios");
  assert.equal(heDieuHanh("Mozilla/5.0 (Linux; Android 14; SM-A546E) Chrome/141.0 Mobile"), "android");
  assert.equal(heDieuHanh("curl/8.7.1"), "khac");
});

test("iPad cũ (UA có «iPad») ⇒ ios", () => {
  assert.equal(heDieuHanh("Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"), "ios");
});

test("máy quá cũ: Windows < 10, Mac ≤ 10.14; UA đóng băng của trình duyệt mới không bị chặn oan", async () => {
  const { mayQuaCu, tenMayCu } = await import("./he-dieu-hanh.ts");
  assert.equal(mayQuaCu("Mozilla/5.0 (Windows NT 6.3; Win64; x64) Chrome/109.0"), true);
  assert.equal(tenMayCu("Mozilla/5.0 (Windows NT 6.3; Win64; x64) Chrome/109.0"), "Windows 8.1");
  assert.equal(mayQuaCu("Mozilla/5.0 (Windows NT 6.1; WOW64) Firefox/115.0"), true);
  assert.equal(mayQuaCu("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0"), false);
  assert.equal(mayQuaCu("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) Safari/605.1.15"), true);
  assert.equal(tenMayCu("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) Safari/605.1.15"), "macOS 10.13");
  assert.equal(mayQuaCu("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141.0"), false);
  assert.equal(mayQuaCu("Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X)"), false);
  assert.equal(mayQuaCu("curl/8.7.1"), false);
});
