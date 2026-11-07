// node --test src/lib/con-diu.test.ts — luật thuần phía Con bản «Dịu» (QR ghép máy, lỗi ghép, PIN theo bé, đổi sao, quà).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chipDoiSao, chuAvt, choTuHoSo, ketQuaPin, loaiLoiGhep, maTuQr, nhanQua, phuQua, quaGanNhat, thuGio } from "./con-diu.ts";

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

test("chip đổi sao: 10 sao = 10 phút; thiếu sao / quá phần còn đổi được hôm nay", () => {
  assert.deepEqual(chipDoiSao(30, { sao: 10, phut: 10 }, 60), [
    { sao: 10, phut: 10, thieu: false, quaHan: false }, { sao: 20, phut: 20, thieu: false, quaHan: false }, { sao: 30, phut: 30, thieu: false, quaHan: false }]);
  const c = chipDoiSao(15, { sao: 10, phut: 5 }, 10);
  assert.deepEqual(c.map((x) => [x.phut, x.thieu, x.quaHan]), [[5, false, false], [10, true, false], [15, true, true]]);
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
