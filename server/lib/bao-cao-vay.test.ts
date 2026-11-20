// #492: phút chơi bằng sao vay theo ngày (vayTheoNgay) — thuần hàm, không DB.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { vayTheoNgay } = await import("./bao-cao.ts");

test("không nợ ⇒ không phút vay", () => {
  assert.deepEqual(vayTheoNgay({ s: 50, d: 0 }, [{ net: -30, no: 0, choi: 30 }, { net: 0, no: 0, choi: 0 }]), [0, 0]);
});
test("vay 20 sao rồi chơi hết 50 ⇒ 20 phút bằng sao vay (sao kiếm tiêu trước)", () => {
  // trước: 30 sao kiếm; hôm nay Ba Mẹ cho vay +20 (net +20, no +20), chơi 50 ⇒ net = +20 − 50
  assert.deepEqual(vayTheoNgay({ s: 30, d: 0 }, [{ net: -30, no: 20, choi: 50 }]), [20]);
});
test("chơi ít hơn sao kiếm ⇒ 0 vay; nợ còn nguyên sang ngày sau không tính lại", () => {
  assert.deepEqual(vayTheoNgay({ s: 60, d: 20 }, [{ net: -10, no: 0, choi: 10 }, { net: -10, no: 0, choi: 10 }]), [0, 0]);
});
test("vay còn lại bị tiêu dần qua hai ngày, không đếm đôi", () => {
  // s=20 toàn sao vay (d=20): ngày 1 chơi 15 ⇒ 15 vay; ngày 2 chơi 10 (chỉ còn 5 sao) ⇒ chơi tối đa 5 vay
  assert.deepEqual(vayTheoNgay({ s: 20, d: 20 }, [{ net: -15, no: 0, choi: 15 }, { net: -5, no: 0, choi: 5 }]), [15, 5]);
});
