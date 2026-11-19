// node --test src/lib/sao-433a.test.ts — #433 A5 (câu lỗi Hoàn tác), A12 (dải mất mạng của Con khi đang nợ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauMatMangTre } from "./con-diu.ts";
import { cauLoiHoanTac } from "./hoan-tac.ts";

class LoiGia extends Error { ma: string; constructor(ma: string, msg: string) { super(msg); this.ma = ma; } }

test("A5: hoàn tác duyệt khi Con đã tiêu sao ⇒ nói Con đã dùng sao, không «quá thời gian»", () => {
  assert.equal(cauLoiHoanTac(new LoiGia("khong_du_diem", "Con còn 0 sao, cần 10 sao"), "Bảo Anh"), "Bảo Anh đã dùng số sao này rồi — không hoàn tác được");
  assert.equal(cauLoiHoanTac(new LoiGia("het_hoan_tac", "Đã quá thời gian hoàn tác"), "Bảo Anh"), "Đã quá thời gian hoàn tác");
  assert.equal(cauLoiHoanTac(new LoiGia("da_tieu", "x"), "Bin"), "Bin đã dùng sao vay rồi — không hoàn tác được");
  assert.equal(cauLoiHoanTac(new LoiGia("khong_thay", "Không thấy nhiệm vụ này"), "Bin"), "Không thấy nhiệm vụ này");
  assert.equal(cauLoiHoanTac(new TypeError("Failed to fetch"), "Bin", "Đã quá 60 giây — không hoàn tác được"), "Đã quá 60 giây — không hoàn tác được");
});

test("A12: mất mạng khi đang nợ ⇒ không hiện «vẫn có −15 sao»", () => {
  assert.equal(cauMatMangTre("Bin", { sao: -15, no: 15, phutCon: 0 }), "Mất mạng rồi — Bin đang nợ Ba Mẹ 15 sao. Bài nộp tự gửi khi có mạng.");
  assert.equal(cauMatMangTre("Bin", { sao: -5, no: 20, phutCon: 15 }), "Mất mạng rồi — Bin đang nợ Ba Mẹ 20 sao, còn 15 sao để chơi. Bài nộp tự gửi khi có mạng.");
  assert.equal(cauMatMangTre("Bin", { sao: 30, no: 0, phutCon: 30 }), "Mất mạng rồi — Bin vẫn có 30 sao. Bài nộp tự gửi khi có mạng.");
  assert.ok(!cauMatMangTre("Bin", { sao: -15, no: 15, phutCon: 0 }).includes("−"));
});
