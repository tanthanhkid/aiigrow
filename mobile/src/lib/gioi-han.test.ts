// node --test src/lib/gioi-han.test.ts — #302 «Giờ chơi»: giới hạn tối đa mỗi ngày + mỗi lượt tối đa (khớp server/lib/gioi-han-choi.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buocPhut, docPhut, dongGioiHanTre, GIOI_HAN_MD, KHOANG_LUOT, KHOANG_NGAY, quyRaTieng, thanGioiHan, tomTatGioiHan } from "./gioi-han.ts";
import { doiSaoKhoiDau } from "./sao-khoi-dau.ts";
import { thanThietLap } from "./thiet-lap.ts";

test("ô số phút (#306): gõ trực tiếp, − / + 15 phút, quy ra tiếng", () => {
  assert.deepEqual(docPhut("", KHOANG_LUOT), { phut: 0, loi: null }, "trống = không giới hạn");
  assert.deepEqual(docPhut("20", KHOANG_LUOT), { phut: 20, loi: null });
  assert.equal(docPhut("2", KHOANG_LUOT).loi, "Từ 5 đến 240 phút");
  assert.equal(docPhut("721", KHOANG_NGAY).loi, "Từ 10 đến 720 phút");
  assert.equal(docPhut("720", KHOANG_NGAY).loi, null, "khớp máy chủ GH_NGAY 10–720");
  assert.equal(docPhut("240", KHOANG_LUOT).loi, null, "khớp máy chủ GH_LUOT 5–240");
  assert.deepEqual([buocPhut(60, 1, KHOANG_NGAY), buocPhut(60, -1, KHOANG_NGAY), buocPhut(10, -1, KHOANG_NGAY), buocPhut(720, 1, KHOANG_NGAY)], [75, 45, 10, 720]);
  assert.deepEqual([buocPhut(30, 1, KHOANG_LUOT), buocPhut(30, -1, KHOANG_LUOT), buocPhut(5, -1, KHOANG_LUOT), buocPhut(240, 1, KHOANG_LUOT), buocPhut(0, 1, KHOANG_LUOT), buocPhut(0, -1, KHOANG_LUOT)], [45, 15, 5, 240, 15, 5]);
  assert.deepEqual([buocPhut(0, 1, KHOANG_NGAY), buocPhut(0, -1, KHOANG_NGAY)], [15, 10], "ô ngày trống: về đầu khoảng, không còn «không giới hạn»");
  assert.deepEqual([docPhut("", KHOANG_NGAY, true).loi, docPhut("0", KHOANG_NGAY, true).loi], ["Từ 10 đến 720 phút", "Từ 10 đến 720 phút"], "ô ngày bắt buộc (bàn v21)");
  assert.deepEqual([30, 60, 90, 120, 150, 45, 75, 0].map(quyRaTieng), ["nửa tiếng", "1 tiếng", "1 tiếng rưỡi", "2 tiếng", "2 tiếng rưỡi", "45 phút", "1 tiếng 15 phút", "không giới hạn"]);
  assert.deepEqual(GIOI_HAN_MD, { ngayThuong: 60, cuoiTuan: 90, moiLuot: 30 }, "Con mới: chơi liền 30 phút");
});

test("quà khởi đầu (#306): − / + bước 10, kẹp 0…200", () => {
  assert.deepEqual([doiSaoKhoiDau(30, 1), doiSaoKhoiDau(30, -1), doiSaoKhoiDau(0, -1), doiSaoKhoiDau(200, 1), doiSaoKhoiDau(190, 1), doiSaoKhoiDau(25, 1)], [40, 20, 0, 200, 200, 40]);
});

test("Lần đầu gửi giới hạn khi Ba Mẹ đã qua bước Giờ chơi; hồ sơ con tóm tắt", () => {
  assert.equal("gioiHanNgayThuong" in thanThietLap({ conId: "c1" }), false);
  const b = thanThietLap({ conId: "c1", gioiHan: { ngayThuong: 120, cuoiTuan: 120, moiLuot: 30 } });
  assert.deepEqual([b.gioiHanNgayThuong, b.gioiHanCuoiTuan, b.phutMoiLuot], [120, 120, 30]);
  assert.deepEqual(thanGioiHan(GIOI_HAN_MD), { gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90, phutMoiLuot: 30 });
  assert.deepEqual(tomTatGioiHan({ ngayThuong: 60, cuoiTuan: 60, moiLuot: 30 }), { tren: "1 giờ/ngày", duoi: "mỗi lượt 30 phút" });
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

test("hồ sơ Con tóm tắt: cuối tuần không giới hạn ghi rõ", () => {
  assert.deepEqual(tomTatGioiHan({ ngayThuong: 60, cuoiTuan: 0, moiLuot: 0 }), { tren: "1 giờ ngày thường · cuối tuần không giới hạn" });
});
