// node --test src/lib/noi-1411.test.ts — nối API PR #253: khoá riêng máy, xoá hồ sơ Con, «Trao luôn», hộp thư hỗ trợ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cachKhoa, cauCho, cauKhoaMay, chiaHopThu, loiTraoLuon, loiXoaCon, mayDangKhoa, quaTrongKho, thanKhoaMay, traoLuonDuoc } from "./noi-1411.ts";

const NOW = new Date("2026-11-14T12:00:00Z");

test("khoá riêng máy: hạn đã qua ⇒ hết khoá; không hạn ⇒ tới khi Ba Mẹ mở", () => {
  assert.equal(mayDangKhoa(undefined, NOW), false);
  assert.equal(mayDangKhoa({ khoa: false, den: null }, NOW), false);
  assert.equal(mayDangKhoa({ khoa: true, den: null }, NOW), true);
  assert.equal(mayDangKhoa({ khoa: true, den: "2026-11-14T11:00:00Z" }, NOW), false);
  assert.equal(cauKhoaMay({ khoa: true, den: null }, NOW), "Đang khoá tới khi Ba Mẹ mở");
  assert.match(cauKhoaMay({ khoa: true, den: "2026-11-14T13:30:00Z" }, NOW) ?? "", /^Đang khoá tới \d\d:30$/);
  assert.equal(cauKhoaMay({ khoa: true, den: "2026-11-14T11:00:00Z" }, NOW), null);
});

test("thân POST may/:id/khoa", () => {
  assert.deepEqual(thanKhoaMay(true, "sang"), { khoa: true, den: "sang" });
  assert.deepEqual(thanKhoaMay(true, new Date("2026-11-14T13:00:00Z")), { khoa: true, den: "2026-11-14T13:00:00.000Z" });
  assert.deepEqual(thanKhoaMay(true, null), { khoa: true });
  assert.deepEqual(thanKhoaMay(false, "sang"), { khoa: false });
});

test("chọn máy để khoá: đủ ⇒ khoá theo Con; một phần ⇒ từng máy; không máy nào ⇒ null", () => {
  assert.deepEqual(cachKhoa(["m1", "m2"], ["m2", "m1"]), { kieu: "con" });
  assert.deepEqual(cachKhoa(["m1", "m2"], ["m2"]), { kieu: "may", ids: ["m2"] });
  assert.deepEqual(cachKhoa(["m1", "m2"], ["x9"]), null);
  assert.equal(cachKhoa(["m1", "m2"], []), null);
  assert.deepEqual(cachKhoa([], []), { kieu: "con" });
});

test("lỗi xoá hồ sơ Con ⇒ câu dễ hiểu + lối đi tiếp", () => {
  assert.equal(loiXoaCon("con_may", "Bảo Anh")?.loi, "may");
  assert.match(loiXoaCon("con_may", "Bảo Anh")!.cau, /Bảo Anh là bé cuối cùng/);
  assert.equal(loiXoaCon("con_thiet_bi_mang", "Bảo Anh")?.loi, "ho_tro");
  assert.match(loiXoaCon("con_thiet_bi_mang", "Bảo Anh")!.cau, /thiết bị lọc mạng/);
  assert.equal(loiXoaCon("khong_thay", "Bảo Anh")?.loi, "ve");
  assert.equal(loiXoaCon("loi", "Bảo Anh"), null);
});

test("«Trao luôn»: voucher không trao luôn được, lỗi có câu dễ hiểu", () => {
  assert.equal(traoLuonDuoc("voucher"), false);
  assert.equal(traoLuonDuoc("qua"), true);
  assert.equal(traoLuonDuoc(undefined), false);
  assert.match(loiTraoLuon("voucher_can_thanh_toan", "Bảo Anh") ?? "", /thanh toán/);
  assert.match(loiTraoLuon("het_hang", "Bảo Anh") ?? "", /hết/);
  assert.equal(loiTraoLuon("loi", "Bảo Anh"), null);
});

test("tìm quà trong kho theo mẫu thư viện: đang bật, đúng Con", () => {
  const ds = [{ id: "q0", mau: "lego", ten: "Bộ Lego", loai: "qua", bat: false },
    { id: "q1", mau: "lego", ten: "Bộ Lego", loai: "qua", bat: true, ap_cho: ["c2"] },
    { id: "q2", mau: "lego", ten: "Bộ Lego", loai: "qua", bat: true, ap_cho: ["c1"] },
    { id: "q3", mau: null, ten: "Đi ăn kem", loai: "dac_quyen", bat: true }];
  assert.equal(quaTrongKho(ds, "lego", "Bộ Lego", "c1")?.id, "q2");
  assert.equal(quaTrongKho(ds, "lego", "Bộ Lego", "c3"), null);
  assert.equal(quaTrongKho(ds, "an_kem", "đi ăn kem", "c1")?.id, "q3");
});

test("hộp thư hỗ trợ: «Chờ N′», chia Gấp / Đang chờ giữ thứ tự", () => {
  assert.equal(cauCho(42), "Chờ 42′");
  assert.equal(cauCho(65), "Chờ 1 giờ 5′");
  assert.equal(cauCho(120), "Chờ 2 giờ");
  assert.equal(cauCho(null), null);
  const d = (id: string, gap: boolean) => ({ family_id: id, ten: id, tu: "ba_me", noi_dung: "", created_at: "", chua_tra_loi: true, gap });
  const r = chiaHopThu([d("a", true), d("b", false), d("c", true)]);
  assert.deepEqual(r.gap.map((x) => x.family_id), ["a", "c"]);
  assert.deepEqual(r.dangCho.map((x) => x.family_id), ["b"]);
});
