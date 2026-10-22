import { test } from "node:test";
import assert from "node:assert/strict";
import { BUOC_GIAY, kiemMaOffline, maOffline, taoBiMatOffline } from "./ma-offline.ts";

test("mã đúng độ dài, toàn số", () => {
  const s = taoBiMatOffline();
  const m = maOffline(s, new Date(1_700_000_000_000));
  assert.equal(m.length, 6);
  assert.match(m, /^\d{6}$/);
});

test("kiểm đúng mã của chính mốc thời gian đó", () => {
  const s = taoBiMatOffline();
  const t = new Date(1_700_000_123_000);
  assert.equal(kiemMaOffline(s, maOffline(s, t), t), true);
});

test("dung sai ±1 bước: mã bước trước vẫn chấp nhận trong bước sau", () => {
  const s = taoBiMatOffline();
  const t = new Date(1_700_000_000_000);
  const sau = new Date(t.getTime() + BUOC_GIAY * 1000);   // 1 bước sau
  assert.equal(kiemMaOffline(s, maOffline(s, t), sau), true);
});

test("mã cách 2 bước thì hết hiệu lực", () => {
  const s = taoBiMatOffline();
  const t = new Date(1_700_000_000_000);
  const xa = new Date(t.getTime() + BUOC_GIAY * 1000 * 3);
  assert.equal(kiemMaOffline(s, maOffline(s, t), xa), false);
});

test("bí mật khác ⇒ mã khác, không khớp", () => {
  const t = new Date(1_700_000_000_000);
  const a = taoBiMatOffline(), b = taoBiMatOffline();
  assert.equal(kiemMaOffline(b, maOffline(a, t), t), false);
});

test("mã rác / sai định dạng ⇒ false", () => {
  const s = taoBiMatOffline();
  const t = new Date();
  assert.equal(kiemMaOffline(s, "", t), false);
  assert.equal(kiemMaOffline(s, "abc", t), false);
  assert.equal(kiemMaOffline(s, "12345", t), false);
});

// Vector cố định: agent C# (MaOffline.cs) phải cho RA ĐÚNG "781646" với cùng bí mật + cùng mốc (chốt chéo hai ngôn ngữ).
test("vector cố định cho đối chiếu C#", () => {
  assert.equal(maOffline("test-secret-aiigrow", new Date(1_700_000_000_000)), "781646");
});
