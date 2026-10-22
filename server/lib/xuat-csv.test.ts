import { test } from "node:test";
import assert from "node:assert/strict";
import { csvBaoCao } from "./xuat-csv.ts";

// BaoCao tối giản, nhét ô độc để kiểm chống CSV injection.
const bcDoc: any = {
  ten: "@evil", tuanNay: {
    dau: "2026-10-19", hocTheoNgay: [], giaiTriTheoNgay: [], tongGiaiTri: 0, phutHoc: 0,
    dungNhieu: [{ muc: "=HYPERLINK(1)", loai: "giai_tri", phut: 3, lech: -20 }, { muc: "-2+3", loai: "hoc", phut: 1, lech: "mới" }],
    diemKiemTheoNhom: [], duyet: { duoc: 0, tu_choi: 0 }, ngoaiLe: 0,
  }, tuanTruoc: { tongGiaiTri: 0, phutHoc: 0 }, chuGiai: ["+SUM(A1)"],
};

test("CSV injection: ô chữ bắt đầu = + - @ được chèn ' (không chạy công thức)", () => {
  const { noiDung } = csvBaoCao(bcDoc);
  assert.ok(noiDung.includes("'=HYPERLINK(1)"), "muc =HYPERLINK phải được trung hoà");
  assert.ok(noiDung.includes("'-2+3"), "muc -2+3 phải được trung hoà");
  assert.ok(noiDung.includes("'@evil"), "tên @evil phải được trung hoà");
  assert.ok(noiDung.includes("'+SUM(A1)"), "ghi chú +SUM phải được trung hoà");
  // số âm hợp lệ KHÔNG bị biến thành chữ
  assert.ok(/(^|[",\r\n])-20([",\r\n]|$)/.test(noiDung), "lệch -20 giữ nguyên là số");
});
