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
