// node --test src/lib/con-diu.test.ts — luật thuần phía Con bản «Dịu» (QR ghép máy, lỗi ghép, PIN theo bé, sổ sao 15/11, quà).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauNo, cauPhut, cauVay, chuAvt, choTuHoSo, ketQuaPin, loaiLoiGhep, maTuQr, nhanQua, phuQua, quaGanNhat, saoTuMayChu, soSao, soVN, thuGio, tiVong, traNoKhiDuyet, dongLichSu } from "./con-diu.ts";

test("QR ghép máy: link cài có mã 6 số / chỉ token gói / 6 số trần / QR lạ", () => {
  assert.deepEqual(maTuQr("https://aiigrow.aiilab.vn/tai?g=abc_123&ma=482913"), { ma: "482913", goi: "abc_123" });
  assert.deepEqual(maTuQr("https://aiigrow.aiilab.vn/tai?g=tok"), { goi: "tok" });
  assert.deepEqual(maTuQr(" 482 913 "), { ma: "482913" });
  assert.equal(maTuQr("https://evil.vn/x"), null);
  assert.equal(maTuQr("xin chào"), null);
  assert.equal(maTuQr(null), null);
});

test("lỗi ghép máy ⇒ đúng màn (sai / hết hạn / mất mạng / khoá)", () => {
  assert.equal(loaiLoiGhep("ma_sai"), "sai");
  assert.equal(loaiLoiGhep("ma_het_han"), "het_han");
  assert.equal(loaiLoiGhep("ma_da_dung"), "het_han");
  assert.equal(loaiLoiGhep("mat_mang"), "mat_mang");
  assert.equal(loaiLoiGhep("ghep_tam_khoa"), "khoa");
  assert.equal(loaiLoiGhep("loi"), "khac");
});

test("PIN theo bé: vào / sai còn N lần / sai 5 lần chờ 15 giây / cần PIN", () => {
  const now = Date.parse("2026-11-06T12:30:00Z");
  assert.deepEqual(ketQuaPin(null), { loai: "vao" });
  assert.deepEqual(ketQuaPin({ ma: "pin_sai", them: { conLan: 3 } }), { loai: "sai", conLan: 3 });
  assert.deepEqual(ketQuaPin({ ma: "pin_tam_khoa", them: { choGiay: 15, khoaDen: "2026-11-06T12:32:15.000Z" } }, now), { loai: "cho", denMs: now + 15_000 });   // đồng hồ máy lệch 2 phút: vẫn 15 giây
  assert.deepEqual(ketQuaPin({ ma: "pin_tam_khoa", them: { khoaDen: "2026-11-06T12:30:15.000Z" } }, now), { loai: "cho", denMs: now + 15_000 });
  assert.deepEqual(ketQuaPin({ ma: "pin_tam_khoa", them: { choGiay: 11 } }, now), { loai: "cho", denMs: now + 11_000 });
  assert.deepEqual(ketQuaPin({ ma: "can_pin" }), { loai: "can_pin" });
  assert.equal(ketQuaPin({ ma: "khong_thay", message: "Không thấy hồ sơ này trên máy" }).loai, "loi");
});

test("ho-so: bé đang bị chờ ⇒ mốc hết chờ", () => {
  const now = Date.parse("2026-11-06T12:30:00Z");
  assert.equal(choTuHoSo({ khoaDen: "2026-11-06T12:30:15.000Z" }, now), now + 15_000);
  assert.equal(choTuHoSo({ khoaDen: "2026-11-06T12:40:00.000Z", choGiay: 9 }, now), now + 9_000);
  assert.equal(choTuHoSo({ khoaDen: "2026-11-06T12:29:00.000Z" }, now), null);
  assert.equal(choTuHoSo({ choGiay: 5 }, now), now + 5_000);
  assert.equal(choTuHoSo({}, now), null);
});

test("sổ sao 15/11: số âm có dấu − thật, câu phút / nợ, suy từ kid/quy khi máy chủ cũ", () => {
  assert.equal(soSao(-20), "\u221220 sao");
  assert.equal(soSao(1020), "1.020 sao");
  assert.equal(soVN(-1020), "\u22121.020");
  assert.equal(cauPhut(18), "còn 18 sao = 18 phút chơi");
  assert.equal(cauPhut(-5), "còn 0 sao = 0 phút chơi");
  assert.equal(cauNo(0), null);
  assert.equal(cauNo(20), "Đang nợ Ba Mẹ 20 sao");
  // máy chủ mới
  const m = saoTuMayChu({ sao: -20, no: 20, phutCon: 0, hetSao: true, mucVay: [10, 15, 30], vayMacDinh: 15 }, { quy: { daDung: 42, khoa: false } });
  assert.equal(m.sao, 0, "#745: sao khả dụng không âm"); assert.equal(m.no, 20); assert.equal(m.hetSao, true); assert.equal(m.phutHomNay, 42);
  assert.equal(m.cau.soDu, "0 sao"); assert.equal(m.cau.no, "Đang nợ Ba Mẹ 20 sao"); assert.equal(m.vayMacDinh, 15);
  // vừa vay 30 ở 0 sao: số dư 0, còn 30 phút, chưa hết sao
  const v = saoTuMayChu({ sao: 0, no: 30, phutCon: 30, hetSao: false }, null);
  assert.equal(v.hetSao, false); assert.equal(v.cau.phut, "còn 30 sao = 30 phút chơi");
  // máy chủ cũ: không có kid/sao ⇒ sao + conPhut từ kid/quy, không nợ
  const c = saoTuMayChu(null, { sao: 40, quy: { conPhut: 18, daDung: 42, khoa: true } });
  assert.deepEqual([c.sao, c.no, c.phutCon, c.hetSao, c.khoa], [40, 0, 18, false, true]);
  assert.deepEqual(c.mucVay, [10, 15, 30]);
  assert.equal(saoTuMayChu(null, null).hetSao, true);
});

test("được duyệt khi đang nợ: sao nhiệm vụ trả nợ trước", () => {
  assert.deepEqual(traNoKhiDuyet(-10, 10), { truoc: -20, traNo: 10, conNo: 10 });
  assert.deepEqual(traNoKhiDuyet(5, 10), { truoc: -5, traNo: 5, conNo: 0 });
  assert.deepEqual(traNoKhiDuyet(40, 10), { truoc: 30, traNo: 0, conNo: 0 });
  assert.equal(cauVay(15), "= 15 phút chơi hoặc đổi quà · con sẽ nợ 15 sao");
  assert.equal(cauVay(15, 20), "= 15 phút chơi hoặc đổi quà · con sẽ nợ 35 sao");
});

test("kid/sao máy chủ mới: lichSu + appHomNay + phutChoiHomNay; thiếu ⇒ null", () => {
  const m = saoTuMayChu({ sao: -20, no: 20, phutCon: 0, phutChoiHomNay: 42, lichSu: [
    { id: "1", loai: "vay", kieu: "vay", sao: 50, luc: "x", chuThich: "Chọn món bữa tối", tenNguoi: "Mẹ Lan" },
    { id: "2", loai: "tra_no", kieu: "tra_no", sao: -20, luc: "x", chuThich: "Dọn phòng" },
    { id: "3", loai: "choi", kieu: "choi", sao: -20, luc: "x", chuThich: "Chơi Roblox 20 phút" }], appHomNay: [] }, null);
  assert.equal(m.phutHomNay, 42);
  assert.deepEqual(m.lichSu!.map(dongLichSu), [
    { chu: "Mẹ Lan cho vay 50 sao · Chọn món bữa tối", so: "\u221250" }, { chu: "Trả nợ 20 sao · Dọn phòng", so: "+20" },
    { chu: "Chơi Roblox 20 phút", so: "\u221220" }]);
  assert.deepEqual(m.appHomNay, []);
  assert.equal(saoTuMayChu({ sao: 3 }, null).lichSu, null);
  assert.equal(tiVong({ phutCon: 28, phutHomNay: 42 }), 0.4);
});

test("quà gần nhất + dòng phụ + nhãn điều kiện", () => {
  const qua = [{ ten: "Bộ Lego", diem: 800 }, { ten: "Chọn món bữa tối", diem: 50 }, { ten: "Đi ăn kem", diem: 100 }];
  assert.deepEqual(quaGanNhat(qua, 40), { ten: "Chọn món bữa tối", diem: 50, conThieu: 10 });
  assert.deepEqual(quaGanNhat(qua, 900), { ten: "Chọn món bữa tối", diem: 50, conThieu: 0 });
  assert.equal(quaGanNhat([], 10), null);
  assert.equal(phuQua({ diem: 50, du: true, conThieu: 0 }), "Đủ sao rồi! Bấm để đổi");
  assert.equal(phuQua({ diem: 200, du: false, conThieu: 150 }), "Còn thiếu 150 sao");
  assert.equal(phuQua({ diem: 100, du: false, conThieu: 60, choTraoTu: "2026-11-06" }), "Đang giữ 100 sao · chờ Ba Mẹ trao");
  assert.equal(nhanQua({ loai: "voucher" }), "Mã QR");
  assert.equal(nhanQua({ loai: "dac_quyen", chiCuoiTuan: true }), "T7, CN");
  assert.equal(nhanQua({ loai: "qua", tonKho: 1 }), "Còn 1 bộ");
  assert.equal(nhanQua({ loai: "qua", tonKho: null }), null);
});

test("dòng thứ · giờ", () => {
  assert.equal(thuGio(new Date(2026, 10, 5, 19, 30)), "Thứ Năm · 19:30");
});

test("chữ avatar: chữ đầu tên; trùng chữ đầu với bé khác ⇒ chữ đầu tiếng cuối", () => {
  assert.equal(chuAvt("Bảo Anh"), "B");
  assert.equal(chuAvt("Bảo Anh", ["Bảo Anh", "Minh Khôi"]), "B");
  assert.equal(chuAvt("Bảo Anh", ["Bảo Anh", "Bảo Minh"]), "A");
  assert.equal(chuAvt("Bảo Minh", ["Bảo Anh", "Bảo Minh"]), "M");
  assert.equal(chuAvt("  "), "?");
});
