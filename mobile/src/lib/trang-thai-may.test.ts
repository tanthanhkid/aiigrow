import assert from "node:assert/strict";
import { test } from "node:test";
import { canSuaMay, maMay } from "./trang-thai-may.ts";

test("máy chủ gửi hienThi thì dùng đúng", () => assert.equal(maMay({ hienThi: "mat_mang", baoVe: "mot_phan" }), "mat_mang"));
test("máy chủ cũ: cùng luật — mất mạng không phải cần sửa", () => {
  assert.equal(maMay({ trangThai: "ngoai_vong", baoVe: "mot_phan" }), "mat_mang");
  assert.equal(maMay({ trangThai: "tuan_thu", baoVe: "day_du", matMang: true }), "mat_mang");
  assert.equal(canSuaMay({ trangThai: "ngoai_vong", baoVe: "mot_phan" }), false);
  assert.equal(canSuaMay({ trangThai: "tuan_thu", baoVe: "mot_phan" }), true);
  assert.equal(maMay({ trangThai: "tat_may", baoVe: "day_du" }), "tat");
  assert.equal(maMay({ trangThai: "tuan_thu", baoVe: "day_du" }), "bao_ve");
});
