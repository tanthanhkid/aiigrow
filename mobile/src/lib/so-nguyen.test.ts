import assert from "node:assert/strict";
import { test } from "node:test";
import { docSoNguyen, LOI_SO_NGUYEN, loiSoNguyen, soNguyenGo } from "./so-nguyen.ts";

test("#743: gõ từng phím «2» «.» «5» giữ nguyên «2.5» (không dính thành 25), báo chỉ nhập số nguyên", () => {
  let o = "";
  for (const k of "2.5") o = soNguyenGo(o + k);
  assert.equal(o, "2.5");
  assert.ok(Number.isNaN(docSoNguyen(o)));
  assert.equal(loiSoNguyen(o), LOI_SO_NGUYEN);
  o = "";
  for (const k of "45.5") o = soNguyenGo(o + k);
  assert.equal(o, "45.5");
  assert.equal(loiSoNguyen(o), LOI_SO_NGUYEN);
  assert.equal(loiSoNguyen("3."), LOI_SO_NGUYEN);
  assert.equal(loiSoNguyen("2,5"), LOI_SO_NGUYEN);
});

test("số nguyên, trống, hàng nghìn", () => {
  assert.equal(soNguyenGo("a1b2"), "12");
  assert.equal(docSoNguyen("120"), 120);
  assert.equal(docSoNguyen(""), null);
  assert.equal(docSoNguyen("1.000"), 1000);
  assert.ok(Number.isNaN(docSoNguyen("2,500")), "dấu phẩy là thập phân kiểu Việt");
  assert.equal(loiSoNguyen("25"), null);
  assert.equal(loiSoNguyen(""), null);
});
