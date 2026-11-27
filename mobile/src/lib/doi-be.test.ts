import { test } from "node:test";
import assert from "node:assert/strict";
import { coTheDoiBe, raKhoiMay } from "./doi-be.ts";

test("chỉ máy có token thiết bị mới có nút Đổi người / Đăng xuất", () => {
  assert.equal(coTheDoiBe(true), true);
  assert.equal(coTheDoiBe(false), false);
});

test("ra khỏi máy: gọi máy chủ rồi về màn chọn tên", async () => {
  const nk: string[] = [];
  await raKhoiMay({ coTokenMay: true, roiMay: async () => { nk.push("may"); }, raPhienCon: async () => { nk.push("kid"); }, xoaPhienCon: async () => { nk.push("xoa"); }, veManChonTen: () => nk.push("ve") });
  assert.deepEqual(nk, ["may", "kid", "xoa", "ve"]);
});

test("mất mạng vẫn về màn chọn tên và xoá phiên trên máy", async () => {
  const nk: string[] = [];
  const loi = async () => { throw new Error("mat_mang"); };
  await raKhoiMay({ coTokenMay: true, roiMay: loi, raPhienCon: loi, xoaPhienCon: async () => { nk.push("xoa"); }, veManChonTen: () => nk.push("ve") });
  assert.deepEqual(nk, ["xoa", "ve"]);
});

test("xoá phiên lỗi vẫn chuyển màn", async () => {
  let ve = false;
  await raKhoiMay({ coTokenMay: false, roiMay: async () => { throw new Error("x"); }, raPhienCon: async () => {}, xoaPhienCon: async () => { throw new Error("y"); }, veManChonTen: () => { ve = true; } });
  assert.equal(ve, true);
});

test("không token máy thì không gọi device/dang-xuat", async () => {
  let goi = false;
  await raKhoiMay({ coTokenMay: false, roiMay: async () => { goi = true; }, raPhienCon: async () => {}, xoaPhienCon: async () => {}, veManChonTen: () => {} });
  assert.equal(goi, false);
});
