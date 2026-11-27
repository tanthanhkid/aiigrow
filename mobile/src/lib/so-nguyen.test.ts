import assert from "node:assert/strict";
import { test } from "node:test";
import { soNguyenGo } from "./so-nguyen.ts";

test("số thập phân: chỉ giữ phần nguyên, không dính thành 455 / 25", () => {
  assert.equal(soNguyenGo("45.5"), "45");
  assert.equal(soNguyenGo("2,5"), "2");
  assert.equal(soNguyenGo("120"), "120");
  assert.equal(soNguyenGo("a1b2"), "12");
  assert.equal(soNguyenGo(".5"), "");
});
