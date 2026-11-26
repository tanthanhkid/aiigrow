// node --test src/lib/so-hom-nay.test.ts — #705 / #700: màn Đã dùng, Báo cáo, Trang chủ đọc số «hôm nay» của máy chủ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { soHomNay } from "./so-hom-nay.ts";

test("#705: Ba Mẹ cho vay 20 sao sau khi chơi đủ 60 ⇒ 60 / 80 · còn 20 (không tự tính 60 − 60 = 0)", () => {
  assert.deepEqual(soHomNay({ daChoi: 60, gioiHanNgay: 80, conNgay: 20 }), { daChoi: 60, tran: 80, con: 20 });
  assert.deepEqual(soHomNay({ daChoi: 0, gioiHanNgay: null, conNgay: null }), { daChoi: 0, tran: null, con: null }, "không giới hạn");
});

test("#700: đã chơi là số nguyên; máy chủ cũ (chỉ có daDung lẻ) ⇒ làm tròn, không giới hạn", () => {
  assert.deepEqual(soHomNay(undefined, 12.1), { daChoi: 12, tran: null, con: null });
  assert.deepEqual(soHomNay({ daChoi: 12 }, 12.4), { daChoi: 12, tran: null, con: null });
});
