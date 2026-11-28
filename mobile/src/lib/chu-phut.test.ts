// node --test src/lib/chu-phut.test.ts — #697: một hàm định dạng phút cho mọi màn (185 phút ⇒ «3 giờ 5 phút» ở mọi nơi).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuPhut } from "./chu-phut.ts";
import { dongGioiHanTre, tomTatGioiHan } from "./gioi-han.ts";
import { tieuTheChinh } from "./tieu-the-chinh.ts";

test("chuPhut: dưới 60 giữ phút, từ 60 đổi giờ", () => {
  assert.deepEqual([0, 1, 45, 59, 60, 90, 185, 240, -3, 44.6].map(chuPhut),
    ["0 phút", "1 phút", "45 phút", "59 phút", "1 giờ", "1 giờ 30 phút", "3 giờ 5 phút", "4 giờ", "0 phút", "45 phút"]);
});
test("tóm tắt giới hạn: hai số đều có đơn vị (không còn «60 · T7, CN 90 phút»)", () => {
  assert.deepEqual(tomTatGioiHan({ ngayThuong: 60, cuoiTuan: 90, moiLuot: 0 }), { tren: "T2–T6 1 giờ · T7–CN 1 giờ 30 phút" });
  assert.deepEqual(tomTatGioiHan({ ngayThuong: 180, cuoiTuan: 180, moiLuot: 30 }), { tren: "3 giờ/ngày", duoi: "mỗi lượt 30 phút" });
});
test("màn Con và thẻ Hôm nay cùng một cách viết", () => {
  const g = { apDung: true, conNgay: 135, dangNghi: false, nghiDen: null, nghiDenGio: null, hetNgay: false, lyDoKhoa: null, luotPhut: 15, conLuot: 45, cau: null };
  assert.deepEqual(dongGioiHanTre(g), { tieu: "Còn 2 giờ 15 phút hôm nay", phu: "Lượt này còn 45 phút rồi nghỉ 15 phút" });
  assert.equal(tieuTheChinh({ khoa: false, daChoiPhut: 185 }), "Đã dùng 3 giờ 5 phút");
});
