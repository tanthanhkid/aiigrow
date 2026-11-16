// node --test src/lib/gioi-han.test.ts — #302 «Giờ chơi»: giới hạn tối đa mỗi ngày + mỗi lượt tối đa (khớp server/lib/gioi-han-choi.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chipLuot, chipNgay, docPhut, dongGioiHanTre, GIOI_HAN_MD, KHOANG_LUOT, moTaGioiHan, thanGioiHan, tomTatGioiHan } from "./gioi-han.ts";
import { thanThietLap } from "./thiet-lap.ts";

test("dòng giải thích khớp máy chủ", () => {
  assert.equal(moTaGioiHan({ ngayThuong: 60, cuoiTuan: 60, moiLuot: 30 }), "Mỗi ngày tối đa 60 phút · mỗi lượt 30 phút rồi nghỉ 30 phút · chơi bằng sao");
  assert.equal(moTaGioiHan({ ngayThuong: 60, cuoiTuan: 90, moiLuot: 0 }), "Mỗi ngày tối đa 60 phút (T7, CN 90 phút) · mỗi lượt không giới hạn · chơi bằng sao");
  assert.equal(moTaGioiHan({ ngayThuong: 0, cuoiTuan: 0, moiLuot: 0 }), "Mỗi ngày không giới hạn · mỗi lượt không giới hạn · chơi bằng sao");
});

test("chip đang chọn + ô Tự chọn", () => {
  assert.equal(chipNgay(GIOI_HAN_MD), 1, "mặc định 60p · T7, CN 90p");
  assert.equal(chipNgay({ ngayThuong: 45, cuoiTuan: 90, moiLuot: 0 }), "tu_chon");
  assert.deepEqual([chipLuot({ ngayThuong: 0, cuoiTuan: 0, moiLuot: 0 }), chipLuot({ ngayThuong: 0, cuoiTuan: 0, moiLuot: 20 })], [0, "tu_chon"]);
  assert.deepEqual(docPhut("", KHOANG_LUOT), { phut: 0, loi: null }, "trống = không giới hạn");
  assert.deepEqual(docPhut("20", KHOANG_LUOT), { phut: 20, loi: null });
  assert.equal(docPhut("2", KHOANG_LUOT).loi, "Từ 5 đến 240 phút");
});

test("Lần đầu gửi giới hạn khi Ba Mẹ đã qua bước Giờ chơi; hồ sơ con tóm tắt", () => {
  assert.equal("gioiHanNgayThuong" in thanThietLap({ conId: "c1" }), false);
  const b = thanThietLap({ conId: "c1", gioiHan: { ngayThuong: 120, cuoiTuan: 120, moiLuot: 30 } });
  assert.deepEqual([b.gioiHanNgayThuong, b.gioiHanCuoiTuan, b.phutMoiLuot], [120, 120, 30]);
  assert.deepEqual(thanGioiHan(GIOI_HAN_MD), { gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90, phutMoiLuot: 0 });
  assert.deepEqual(tomTatGioiHan({ ngayThuong: 60, cuoiTuan: 60, moiLuot: 30 }), { tren: "60 phút/ngày", duoi: "mỗi lượt 30 phút" });
  assert.deepEqual(tomTatGioiHan({ ngayThuong: 0, cuoiTuan: 0, moiLuot: 0 }), { tren: "Không giới hạn" });
});

test("màn Con /tre: còn X phút hôm nay · đang nghỉ tới HH:MM · hết hôm nay", () => {
  const g = { apDung: true, conNgay: 25.4, dangNghi: false, nghiDen: null, nghiDenGio: null, hetNgay: false, lyDoKhoa: null, luotPhut: 30, conLuot: 10, cau: null };
  assert.deepEqual(dongGioiHanTre(g), { tieu: "Còn 25 phút hôm nay", phu: "Lượt này còn 10 phút rồi nghỉ 30 phút" });
  assert.deepEqual(dongGioiHanTre({ ...g, dangNghi: true, nghiDenGio: "16:30", lyDoKhoa: "dang_nghi" }),
    { tieu: "Đang nghỉ tới 16:30", phu: "Nghỉ một chút · chơi tiếp lúc 16:30" });
  assert.equal(dongGioiHanTre({ ...g, hetNgay: true, lyDoKhoa: "het_gio_ngay", cau: "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé" })?.tieu, "Hôm nay chơi đủ rồi");
  assert.equal(dongGioiHanTre({ ...g, apDung: false }), null);
  assert.equal(dongGioiHanTre(null), null);
});
