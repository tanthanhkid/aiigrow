// node --test src/lib/chep-con.test.ts — chữ thẻ «Sẽ chép từ …» và lọc nguồn chép (#420).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dongChep, locNguon, tomTatNguon, type NguonChep } from "./chep-con.ts";

const anh: NguonChep = { id: "a", ten: "Bảo Anh", avatar: "mau-0", cheDo: "theo_danh_sach", soApp: 6, soWeb: 4, tinhPhut: ["YouTube", "Roblox"], soViec: 5,
  nhomViec: ["hoc_tap", "van_dong", "viec_nha", "hoc_tap"], saoKhoiDau: 30 };

test("Theo danh sách: 4 dòng như bàn them-s84hkh82", () => {
  assert.deepEqual(dongChep(anh), [
    ["App & web · Theo danh sách", "6 app · 4 trang web"],
    ["Tính phút", "YouTube, Roblox tính · app học không tính"],
    ["Việc mỗi ngày", "5 việc · Học · Vận động · Giúp Ba Mẹ"],
    ["Chơi bằng sao", "1 sao = 1 phút chơi"],
  ]);
  assert.equal(tomTatNguon(anh), "Theo danh sách · 6 app · 5 việc");
});

test("Mở hết / chưa có gì tính phút / chưa có việc", () => {
  const m = { ...anh, cheDo: "mo_het" as const, soViec: 4 };
  assert.deepEqual(dongChep(m)[0], ["App & web · Mở hết", "Mở mọi app, mọi web"]);
  assert.equal(dongChep(m)[1][0], "Không tính phút");
  assert.equal(tomTatNguon(m), "Mở hết · 4 việc");
  const r = dongChep({ ...anh, tinhPhut: [], soViec: 0, nhomViec: [] });
  assert.deepEqual(r[1], ["Không tính phút", "Chưa có app, web nào tính phút"]);
  assert.deepEqual(r[2], ["Việc mỗi ngày", "Chưa có việc nào"]);
});

test("locNguon: bỏ Con còn chờ thiết lập, bé ưu tiên lên đầu; bỏ hết thì giữ cả", () => {
  const ds = ["a", "b", "c"].map((id) => ({ ...anh, id }));
  assert.deepEqual(locNguon(ds, ["b"], "c").map((x) => x.id), ["c", "a"]);
  assert.deepEqual(locNguon(ds, ["a", "b", "c"]).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(locNguon(ds).map((x) => x.id), ["a", "b", "c"]);
});
