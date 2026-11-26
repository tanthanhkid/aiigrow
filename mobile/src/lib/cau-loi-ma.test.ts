// node --test src/lib/cau-loi-ma.test.ts — #694: câu lỗi theo mã, không lộ mã HTTP; lỗi ảnh native không lọt tiếng Anh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauLoiAnh, cauLoiMa } from "./cau-loi-ma.ts";

test("cauLoiMa: mỗi nhóm mã một câu nói phải làm gì, không có số mã", () => {
  for (const ma of [400, 401, 403, 404, 405, 408, 413, 429, 500, 502, 503]) {
    const c = cauLoiMa(ma);
    assert.ok(!c.includes(String(ma)), `${ma}: ${c}`);
    assert.ok(!/mã/.test(c), c);
  }
  assert.match(cauLoiMa(413), /quá lớn/);
  assert.match(cauLoiMa(429), /đợi/);
  assert.match(cauLoiMa(404), /cập nhật app/);
  assert.match(cauLoiMa(502), /bận/);
  assert.match(cauLoiMa(401, true), /Ba Mẹ ghép lại/);
  assert.doesNotMatch(cauLoiMa(403), /đăng nhập/);
});

test("cauLoiAnh: câu tiếng Việt giữ, lỗi native ⇒ câu cố định", () => {
  assert.equal(cauLoiAnh(new Error("Cần quyền dùng Camera để chụp ảnh")), "Cần quyền dùng Camera để chụp ảnh");
  for (const e of [new Error("Camera not available"), new Error("Failed to read image"), new Error("Caméra non disponible"), new Error("Kamera nicht verfügbar"), "x", null]) assert.match(cauLoiAnh(e), /^Chưa lấy được ảnh/);
});
