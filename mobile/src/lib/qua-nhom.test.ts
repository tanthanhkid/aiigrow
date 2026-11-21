// node --test src/lib/qua-nhom.test.ts — #524: không món nào hiện ở cả «Ba Mẹ mua» và «Quà nhà».
import { test } from "node:test";
import assert from "node:assert/strict";
import { quaNha } from "./qua-nhom.ts";

const ds = [
  { id: "1", loai: "qua", mau: "lego", bat: true },        // Lego Ba Mẹ mua (đếm số lượng)
  { id: "2", loai: "voucher", mau: "aiicafe_50k", bat: true },
  { id: "3", loai: "qua", mau: "xem_phim", bat: true },     // quà nhà từ mẫu
  { id: "4", loai: "qua", mau: null, bat: true },           // quà nhà tự thêm
  { id: "5", loai: "qua", mau: "xem_phim", bat: false },    // đã cất
];

test("Lego (mẫu ba_me_mua) không nằm trong Quà nhà", () => {
  const nha = quaNha(ds, ["lego", "aiicafe_50k"]);
  assert.deepEqual(nha.map((x) => x.id), ["3", "4"]);
});

test("không món nào ở cả hai nhóm", () => {
  const mua = ["lego", "aiicafe_50k"];
  const nha = quaNha(ds, mua);
  assert.ok(nha.every((x) => !(x.mau && mua.includes(x.mau))));
});
