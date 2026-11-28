import assert from "node:assert/strict";
import { test } from "node:test";
import { canSuaMay, cauGo, lucGui, maMay, mayCanDeY } from "./trang-thai-may.ts";

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

test("#858: câu gỡ — chờ máy bật kèm giờ gửi (ngày khác kèm ngày); máy đã cài lại; máy chủ cũ không gửi choMayBat thì không đoán", () => {
  const now = new Date(2026, 10, 28, 15, 0);
  const homNay = new Date(2026, 10, 28, 9, 5).toISOString(), baHom = new Date(2026, 10, 25, 14, 5).toISOString();
  assert.equal(lucGui(homNay, now), "09:05");
  assert.equal(lucGui(baHom, now), "14:05 ngày 25/11");
  assert.equal(lucGui(new Date(2025, 10, 25, 14, 5).toISOString(), now), "14:05 ngày 25/11/2025");
  assert.equal(cauGo({ dangGo: { tu: baHom }, choMayBat: true }, now), "Chờ máy bật để gỡ (gửi lúc 14:05 ngày 25/11)");
  assert.equal(cauGo({ dangGo: { tu: homNay } }, now), null);
  assert.equal(cauGo({ dangGo: { tu: homNay }, choMayBat: false }, now), null);
  assert.equal(cauGo({ dangGo: { tu: homNay }, choMayBat: true, banMoi: { ten: "maytinh4" } }, now), "Máy đã được cài lại thành «maytinh4»");
  assert.equal(cauGo({ dangGo: null, choMayBat: true }, now), null);
});
