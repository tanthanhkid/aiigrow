// node --test src/lib/s3.test.ts — logic màn Ba Mẹ thiết kế 06/11: PIN 4 số, quà bảng giá, mã mở máy, chuông.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boTheoTuoi, buocGia, CHIP_TUOI, cauDatPin, cauDoiSau, cauHanVoucher, cauLuuQuaLanDau, cauNgayDoi, cauThemQua, chiaMa, doiChonMau, icQua, kiemPin, locPin, loiGuiMa, phuQua,
  namTuChipTuoi, saoMoiNgay, soTrenChuong, suKienMoMa, thanSuaQua,
} from "./s3.ts";

test("PIN: chỉ giữ 4 chữ số", () => {
  assert.equal(locPin("4a8-21 9"), "4821");
  assert.equal(locPin(""), "");
});

test("PIN: bỏ trống hợp lệ, thiếu số / không khớp / trùng năm sinh bị chặn", () => {
  assert.equal(kiemPin("", ""), null);
  assert.equal(kiemPin("", null), null);
  assert.equal(kiemPin("482", "482"), "PIN cần đủ 4 số.");
  assert.equal(kiemPin("4821", "48"), "Nhập lại PIN cho đủ 4 số.");
  assert.equal(kiemPin("4821", "4812"), "Hai lần nhập PIN chưa khớp.");
  assert.equal(kiemPin("2017", "2017", 2017), "Đừng dùng năm sinh làm PIN — dễ đoán.");
  assert.equal(kiemPin("4821", "4821", 2017), null);
  assert.equal(kiemPin("4821", null), null);                  // màn Đặt lại PIN không có ô nhập lại
});

test("PIN: «Đặt lần cuối dd/mm»", () => {
  assert.equal(cauDatPin(null), "Chưa đặt PIN");
  assert.equal(cauDatPin("xx"), "Chưa đặt PIN");
  const t = new Date(2026, 10, 6, 19, 30);
  assert.equal(cauDatPin(t.toISOString()), "Đặt lần cuối 06/11");
});

const q0 = { moTa: null, chiCuoiTuan: false, tonKho: null, toiDaThang: null, canXacNhan: false, laVoucher: false, menhGia: null };
test("quà: dòng phụ theo điều kiện (thiết kế them-473f52w6)", () => {
  assert.deepEqual(phuQua({ ...q0, moTa: "Con chọn, Ba Mẹ nấu" }), { chu: "Con chọn, Ba Mẹ nấu", nhan: false });
  assert.deepEqual(phuQua({ ...q0, moTa: "Ba Mẹ trao" }), { chu: "Ba Mẹ trao", nhan: true });
  assert.deepEqual(phuQua({ ...q0, moTa: "Chỉ cuối tuần", chiCuoiTuan: true }), { chu: "Chỉ cuối tuần", nhan: true });
  assert.deepEqual(phuQua({ ...q0, moTa: "Còn 1 bộ", tonKho: 1 }), { chu: "Còn 1 bộ", nhan: true });
  assert.deepEqual(phuQua({ ...q0, moTa: "Còn 1 bộ", tonKho: 3 }), { chu: "Còn 3 bộ", nhan: true });
  assert.deepEqual(phuQua({ ...q0, tonKho: 0 }), { chu: "Hết hàng · con chưa đổi được", nhan: true });
  assert.deepEqual(phuQua({ ...q0, toiDaThang: 4 }), { chu: "Tối đa 4 lần/tháng", nhan: true });
  assert.deepEqual(phuQua({ ...q0, laVoucher: true }), { chu: "Voucher QR · 60 ngày", nhan: false });
  assert.deepEqual(phuQua(q0), { chu: "", nhan: false });
});

test("quà: icon theo hình máy chủ, không có thì theo loại", () => {
  assert.equal(icQua({ hinh: "kem", loai: "dac_quyen" }), "coc");
  assert.equal(icQua({ hinh: "aiicafe", loai: "voucher" }), "the_qua");
  assert.equal(icQua({ hinh: null, loai: "voucher" }), "the_qua");
  assert.equal(icQua({ hinh: "la", loai: "tiet_kiem" }), "xu");
  assert.equal(icQua({ hinh: null, loai: "phut" }), "qua");
  assert.equal(icQua({ hinh: null, loai: "dac_quyen", ten: "Đi ăn kem" }), "coc");          // phiếu chờ trao chỉ có tên
  assert.equal(icQua({ hinh: "kem", loai: "qua", ten: "Bộ Lego" }), "coc");                 // hình Ba Mẹ chọn thắng tên
});

test("quà: −/+ 10 sao, chặn dưới 10", () => {
  assert.equal(buocGia(100, 1), 110);
  assert.equal(buocGia(100, -1), 90);
  assert.equal(buocGia(10, -1), 10);
  assert.equal(buocGia(55, 1), 70);                            // làm tròn về bội 10 (65 ⇒ 70)
  assert.equal(buocGia(100_000, 1), 100_000);
});

test("quà: sao mỗi ngày + câu «N ngày đổi được»", () => {
  const nv = [
    { diem: 10, bat: true, giao_cho: null, lap_lai: "hang_ngay" }, { diem: 20, bat: true, giao_cho: "c1", lap_lai: null },
    { diem: 30, bat: true, giao_cho: "c2", lap_lai: "hang_ngay" }, { diem: 30, bat: false, giao_cho: null, lap_lai: "hang_ngay" },
    { diem: 30, bat: true, giao_cho: null, lap_lai: "cuoi_tuan" }, { diem: 30, bat: true, giao_cho: null, lap_lai: "ngay_thuong" },
  ];
  // 10 + 20 (mỗi ngày) + 30·2/7 (cuối tuần) + 30·5/7 (ngày thường) = 60 trung bình
  assert.equal(saoMoiNgay(nv, "c1"), 60);
  assert.equal(saoMoiNgay([{ diem: 14, bat: true, giao_cho: null, lap_lai: "thu:6,0" }, { diem: 50, bat: true, giao_cho: null, lap_lai: "mot_lan" }], "c1"), 4);
  assert.equal(cauNgayDoi("Bảo Anh", 100, 60), "Bảo Anh làm đủ việc được khoảng 60 sao/ngày → 2 ngày đổi được.");
  assert.equal(cauNgayDoi("Bảo Anh", 50, 60), "Bảo Anh làm đủ việc được khoảng 60 sao/ngày → 1 ngày là đổi được.");
  assert.equal(cauNgayDoi("Bảo Anh", 50, 0), null);
});

test("quà: thân lưu — áp cho đủ mọi con ⇒ null; quà mới có loại", () => {
  const f = { ten: " Đi ăn kem ", sao: 100, hinh: "kem", chiCuoiTuan: false, toiDa: 4, tonKho: null, canXacNhan: true, apCho: ["c1", "c2"], moiCon: ["c1", "c2"] };
  assert.deepEqual(thanSuaQua(f, false), { ten: "Đi ăn kem", sao: 100, hinh: "kem", chiCuoiTuan: false, toiDaThang: 4, tonKho: null, canXacNhan: true, apCho: null });
  assert.deepEqual(thanSuaQua({ ...f, apCho: ["c2"] }, true).apCho, ["c2"]);
  assert.equal(thanSuaQua({ ...f, apCho: [] }, true).apCho, null);
  assert.equal(thanSuaQua(f, true).loai, "qua");
});

test("thư viện: «Đã có» không chọn được, bấm lại thì bỏ", () => {
  assert.deepEqual(doiChonMau([], { ma: "a", daCo: false }), ["a"]);
  assert.deepEqual(doiChonMau(["a"], { ma: "a", daCo: false }), []);
  assert.deepEqual(doiChonMau(["a"], { ma: "b", daCo: true }), ["a"]);
  assert.equal(cauThemQua(2, "Bảo Anh"), "Thêm 2 quà cho Bảo Anh");
  assert.equal(cauThemQua(0, "Bảo Anh"), "Chọn quà để thêm");
  assert.equal(cauLuuQuaLanDau(7), "Lưu 7 quà, sang giờ chơi");
  assert.equal(cauLuuQuaLanDau(0), "Chưa cần quà, sang giờ chơi");
});

test("voucher: hạn dùng + số ngày còn", () => {
  const now = new Date(2026, 10, 6, 12);
  assert.equal(cauHanVoucher(new Date(2027, 0, 5, 12).toISOString(), now), "Hạn dùng tới 05/01/2027 · còn 60 ngày");
  assert.equal(cauHanVoucher("x", now), "");
});

test("mã mở máy: tách số, câu đổi sau, lời gửi", () => {
  assert.deepEqual(chiaMa("731 594"), ["7", "3", "1", "5", "9", "4"]);
  assert.equal(cauDoiSau(212), "Mã đổi sau 4 phút");
  assert.equal(cauDoiSau(40), "Mã đổi sau 40 giây");
  assert.equal(cauDoiSau(-3), "Mã đổi sau 0 giây");
  assert.equal(loiGuiMa("731594", 30, "Bảo Anh", "Laptop"), "Mã mở Laptop cho Bảo Anh: 731 594 — mở được 30 phút. Máy không cần mạng vẫn nhập được.");
});

test("mã mở máy: chỉ báo sự kiện mở bằng mã MỚI hơn lúc mở màn", () => {
  const tu = Date.parse("2026-11-06T12:30:00Z");
  const ds: { loai: string; chi_tiet: Record<string, unknown>; created_at: string }[] = [
    { loai: "may_mo_ma_offline", chi_tiet: { phut: "60" }, created_at: "2026-11-06T12:00:00Z" },
    { loai: "doi_ten_may", chi_tiet: {}, created_at: "2026-11-06T12:45:00Z" },
  ];
  assert.equal(suKienMoMa(ds, tu), null);
  ds.push({ loai: "may_mo_ma_offline", chi_tiet: { phut: "30", luc: "2026-11-06T12:05:00Z" }, created_at: "2026-11-06T12:40:00Z" });
  // lúc con mở (chi_tiet.luc) khác lúc máy có mạng lại (created_at)
  assert.deepEqual(suKienMoMa(ds, tu), { luc: "2026-11-06T12:05:00Z", coMangLuc: "2026-11-06T12:40:00Z", phut: 30 });
  assert.deepEqual(suKienMoMa([{ loai: "may_mo_ma_offline", chi_tiet: {}, created_at: "2026-11-06T12:41:00Z" }], tu),
    { luc: "2026-11-06T12:41:00Z", coMangLuc: "2026-11-06T12:41:00Z", phut: null });
  // điện thoại chạy nhanh 20 giây so với máy chủ: sự kiện vẫn được nhận; sự kiện cũ hơn 30 giây (đã xem lần trước) thì không
  assert.ok(suKienMoMa([{ loai: "may_mo_ma_offline", chi_tiet: {}, created_at: "2026-11-06T12:29:40Z" }], tu));
  assert.equal(suKienMoMa([{ loai: "may_mo_ma_offline", chi_tiet: {}, created_at: "2026-11-06T12:29:00Z" }], tu), null);
});

test("chuông: soChuong thắng chuaDoc (máy chủ cũ chỉ có chuaDoc)", () => {
  assert.equal(soTrenChuong({ soChuong: 5, chuaDoc: 9 }), 5);
  assert.equal(soTrenChuong({ soChuong: 0, chuaDoc: 9 }), 0);
  assert.equal(soTrenChuong({ chuaDoc: 3 }), 3);
  assert.equal(soTrenChuong({}), 0);
});

test("Thêm con từ Cả nhà: chip tuổi ⇒ năm sinh đại diện; 10–12 rơi vào Teen (≥ 11 tuổi); chưa chọn ⇒ null (them-9ozp26pq)", () => {
  assert.deepEqual(CHIP_TUOI.map((c) => c.chu), ["4–5", "6–7", "8–9", "10–12", "13+"]);
  assert.equal(namTuChipTuoi(2, 2026), 2017);
  assert.ok(2026 - namTuChipTuoi(3, 2026)! >= 11);
  assert.equal(namTuChipTuoi(0, 2026), 2021);
  assert.equal(namTuChipTuoi(null), null);
  assert.equal(namTuChipTuoi(9), null);
  assert.deepEqual([null, 0, 2, 3, 4].map((i) => boTheoTuoi(i)), ["tu_lap", "hoc_tap", "tu_lap", "viec_nha", "viec_nha"]);
});
