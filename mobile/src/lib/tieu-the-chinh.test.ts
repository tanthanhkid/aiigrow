// node --test src/lib/tieu-the-chinh.test.ts — #672: «Hôm nay» không mâu thuẫn «Đã dùng».
import { test } from "node:test";
import assert from "node:assert/strict";
import { tieuTheChinh } from "./da-dung.ts";

test("đã chơi 21 phút, không đang chơi ⇒ «Đã dùng 21 phút», không «Chưa dùng máy»", () => {
  assert.equal(tieuTheChinh({ khoa: false, daChoiPhut: 21 }), "Đã dùng 21 phút");
});
test("chưa chơi phút nào ⇒ «Chưa dùng máy»", () => assert.equal(tieuTheChinh({ khoa: false, daChoiPhut: 0 }), "Chưa dùng máy"));
test("đang chơi thắng; khoá thắng tất cả", () => {
  assert.equal(tieuTheChinh({ khoa: false, dangChoi: "Roblox", daChoiPhut: 21 }), "Đang chơi Roblox");
  assert.equal(tieuTheChinh({ khoa: true, dangChoi: "Roblox", daChoiPhut: 21 }), "Khoá tới khi Ba Mẹ mở");
  assert.equal(tieuTheChinh({ khoa: true, mo: "19:00", daChoiPhut: 0 }), "Mở lại lúc 19:00");
});
