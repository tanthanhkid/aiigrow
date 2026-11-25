// #657: một trạng thái hiển thị cho mỗi máy, một nguồn số «cần sửa», cảnh báo chỉ để biết không tính, hết dòng lặp.
import assert from "node:assert/strict";
import { test } from "node:test";
import { hienThiMay, canSuaCanhBao } from "./hien-thi-may.ts";
import { boLapCanhBao } from "./nhat-ky.ts";

test("máy mất mạng: không còn «Đang bảo vệ» / «Cần sửa» dù baoVe đủ hay thiếu", () => {
  assert.equal(hienThiMay({ trangThai: "tuan_thu", baoVe: "day_du", matMang: true }), "mat_mang");
  assert.equal(hienThiMay({ trangThai: "ngoai_vong", baoVe: "mot_phan" }), "mat_mang");
});
test("thứ tự ưu tiên", () => {
  assert.equal(hienThiMay({ trangThai: "tuan_thu", baoVe: "mot_phan", dangGo: true, matMang: true }), "dang_go");
  assert.equal(hienThiMay({ trangThai: "tat_may", baoVe: "mot_phan", matMang: true }), "tat");
  assert.equal(hienThiMay({ trangThai: "chua_co_nhip", baoVe: "day_du" }), "tat");
  assert.equal(hienThiMay({ trangThai: "tuan_thu", baoVe: "mot_phan" }), "can_sua");
  assert.equal(hienThiMay({ trangThai: "lech_chuan", baoVe: "day_du" }), "can_sua");
  assert.equal(hienThiMay({ trangThai: "tuan_thu", baoVe: "day_du" }), "bao_ve");
});
const now = new Date("2026-11-25T08:00:00Z");
const cb = (loai: string, muc = "chu_y", o: Record<string, unknown> = {}) => ({ loai, muc, da_doc: false, created_at: new Date("2026-11-24T08:00:00Z"), ...o });
test("cảnh báo chỉ để biết không tính vào «cần sửa»", () => {
  assert.equal(canSuaCanhBao(cb("go_may"), now), false);
  assert.equal(canSuaCanhBao(cb("may_ngoai_vong", "nghiem_trong"), now), false);
  assert.equal(canSuaCanhBao(cb("may_thu_go", "nghiem_trong"), now), true);
  assert.equal(canSuaCanhBao(cb("quen_pin", "thong_tin"), now), true);
  assert.equal(canSuaCanhBao(cb("may_thu_go", "thong_tin"), now), false);
});
test("đã đọc hoặc quá 7 ngày thì không tính", () => {
  assert.equal(canSuaCanhBao(cb("may_thu_go", "chu_y", { da_doc: true }), now), false);
  assert.equal(canSuaCanhBao(cb("may_thu_go", "chu_y", { created_at: new Date("2026-10-24T08:00:00Z") }), now), false);
});
test("bỏ dòng lặp: cùng loại + nội dung + Con giữ dòng mới nhất", () => {
  const x = (id: string, t: string, nd = "Đã xoá hẳn DESKTOP-M01CK08") => ({ id, loai: "go_may", noi_dung: nd, child_id: "c1", created_at: new Date(t) });
  const r = boLapCanhBao([x("a", "2026-11-20T00:00:00Z"), x("b", "2026-11-24T00:00:00Z"), x("c", "2026-11-22T00:00:00Z"), x("d", "2026-11-21T00:00:00Z", "Khác")]);
  assert.deepEqual(r.map((y) => y.id), ["b", "d"]);
});
