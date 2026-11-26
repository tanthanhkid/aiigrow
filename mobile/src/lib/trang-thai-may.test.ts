import assert from "node:assert/strict";
import { test } from "node:test";
import { canSuaMay, maMay, mayCanDeY } from "./trang-thai-may.ts";

test("máy chủ gửi hienThi thì dùng đúng", () => assert.equal(maMay({ hienThi: "mat_mang", baoVe: "mot_phan" }), "mat_mang"));
test("máy chủ cũ: cùng luật — mất mạng không phải cần sửa", () => {
  assert.equal(maMay({ trangThai: "ngoai_vong", baoVe: "mot_phan" }), "mat_mang");
  assert.equal(maMay({ trangThai: "tuan_thu", baoVe: "day_du", matMang: true }), "mat_mang");
  assert.equal(canSuaMay({ trangThai: "ngoai_vong", baoVe: "mot_phan" }), false);
  assert.equal(canSuaMay({ trangThai: "tuan_thu", baoVe: "mot_phan" }), true);
  assert.equal(maMay({ trangThai: "tat_may", baoVe: "day_du" }), "tat");
  assert.equal(maMay({ trangThai: "tuan_thu", baoVe: "day_du" }), "bao_ve");
});
test("#701: «Cần Ba Mẹ để ý» chỉ máy «Cần sửa» đã từng kết nối — máy tắt / mất mạng / chưa báo quyền không vào", () => {
  const ls = "2026-11-26T08:00:00Z";
  assert.equal(mayCanDeY({ hienThi: "can_sua", baoVe: "mot_phan", lanCuoi: ls }), true);
  assert.equal(mayCanDeY({ hienThi: "tat", baoVe: "mot_phan", lanCuoi: ls }), false);
  assert.equal(mayCanDeY({ hienThi: "mat_mang", baoVe: "mot_phan", lanCuoi: ls }), false);
  assert.equal(mayCanDeY({ hienThi: "bao_ve", baoVe: "chua", lanCuoi: ls }), false);
  assert.equal(mayCanDeY({ trangThai: "tuan_thu", baoVe: "mot_phan", lanCuoi: null }), false);
  assert.equal(mayCanDeY({ trangThai: "lech_chuan", baoVe: "day_du", lanCuoi: ls }), false, "đủ quyền mà lệch chuẩn: không phải «chưa được bảo vệ» (như can-de-y.ts)");
});
