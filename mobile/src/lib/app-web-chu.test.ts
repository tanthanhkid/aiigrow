// node --test src/lib/app-web-chu.test.ts — «App & web» 15/11 (#262 / #258): chế độ cũ ⇒ mới, câu phụ một hàng danh sách.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cheDoTu, hangCua, phuHomNay, TEN_CHE_DO, TEN_NHOM, type DanhSach, type DongDs } from "./app-web-chu.ts";

test("chế độ: mo_het giữ; chi_app_duoc_phep / null / thiếu ⇒ Theo danh sách", () => {
  assert.equal(cheDoTu({ cheDo: "mo_het" }), "mo_het");
  assert.equal(cheDoTu({ cheDoChan: "mo_het" }), "mo_het");
  assert.equal(cheDoTu({ cheDoChan: "chi_app_duoc_phep" }), "theo_danh_sach");
  assert.equal(cheDoTu(null), "theo_danh_sach");
  assert.equal(TEN_CHE_DO.theo_danh_sach, "Theo danh sách");
  assert.equal(TEN_NHOM.khong_tinh_phut, "Không tính phút");
});

const h = (x: Partial<DongDs>): DongDs => ({ ten: "Roblox", kieu: "app", nhom: "tinh_phut", muc: ["roblox.exe"], phutHomNay: 0, theoCaNha: false, ...x });

test("câu phụ: Tính phút ghi cả số sao bị trừ; Không tính phút chỉ ghi phút; chưa dùng; chờ khớp", () => {
  assert.equal(phuHomNay(h({ phutHomNay: 39 })), "Hôm nay trừ 39 phút · −39 sao");
  assert.equal(phuHomNay(h({ nhom: "khong_tinh_phut", phutHomNay: 25 })), "Hôm nay 25 phút");
  assert.equal(phuHomNay(h({})), "Hôm nay chưa dùng");
  assert.equal(phuHomNay(h({}), true), "Hôm nay chưa vào");
  assert.equal(phuHomNay(h({ choKhop: true, phutHomNay: 5 })), "Chờ máy của con báo app này");
});

test("hangCua: Tính phút trước, rồi Không tính phút", () => {
  const ds = { app: { tinhPhut: [h({ ten: "A" })], khongTinhPhut: [h({ ten: "B", nhom: "khong_tinh_phut" })] }, web: { tinhPhut: [], khongTinhPhut: [] } } as unknown as DanhSach;
  assert.deepEqual(hangCua(ds, "app").map((x) => x.ten), ["A", "B"]);
  assert.deepEqual(hangCua(ds, "web"), []);
});
