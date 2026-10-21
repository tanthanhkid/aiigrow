// Policy dịch cho agent Windows: chỉ app được phép chạy; app giải trí chỉ khi có phiên điểm đúng app; khoá ngay / giờ ngủ ⇒ khoá.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chinhSachWindows } from "./agent-windows.ts";
import type { Policy } from "./may-con.ts";

const goc = (o: Partial<Policy> = {}): Policy => ({
  serverTime: "2026-10-21T10:00:00.000Z", nextCheckSec: 300, gioMaySai: false, con: { id: "c1", ten: "Ken", nhom: "nhi" }, canChonCon: false,
  allowlistHeThong: ["explorer.exe", "WINWORD.EXE", "khanacademy.org"],
  luat: [{ muc: "scratch.exe", loai: "hoc", nhom: null, giaPhanNghin: null }, { muc: "roblox.exe", loai: "giai_tri", nhom: "game", giaPhanNghin: 1000 },
    { muc: "tiktok.exe", loai: "chan", nhom: null, giaPhanNghin: null }],
  lich: { ngayThuong: [{ tu: "16:00", den: "20:00" }], cuoiTuan: [{ tu: "08:00", den: "20:00" }], ngu: { tu: "21:30", den: "06:30" } },
  khoaNgay: false, soDu: 40, phien: null, tz: "Asia/Ho_Chi_Minh", lechGioPhut: 10, phienToiDa: 30, ...o,
});

test("bình thường: chỉ Allowlist hệ thống (.exe) + app Học tập; giải trí và app bị chặn không có trong danh sách", () => {
  const w = chinhSachWindows(goc());
  assert.equal(w.mode, "hoc");
  assert.equal(w.locked, false);
  assert.deepEqual(w.allowedApps, ["explorer.exe", "winword.exe", "scratch.exe"]);
  assert.deepEqual(w.learningApps, ["scratch.exe"]);
  assert.equal(w.minutesLeft, null);
  assert.equal(w.childName, "Ken");
});

test("đang có phiên chơi bằng điểm cho Roblox ⇒ Roblox được chạy; phiên cho app không phải giải trí thì không", () => {
  assert.ok(chinhSachWindows(goc({ phien: { id: "p1", muc: "Roblox.exe", conPhut: 20 } })).allowedApps.includes("roblox.exe"));
  assert.ok(!chinhSachWindows(goc({ phien: { id: "p1", muc: "tiktok.exe", conPhut: 20 } })).allowedApps.includes("tiktok.exe"));
});

test("Ba Mẹ «Khoá ngay» ⇒ khoá; giờ ngủ (21:30–06:30 giờ VN) ⇒ khoá lý do ngủ", () => {
  const k = chinhSachWindows(goc({ khoaNgay: true }));
  assert.equal(k.mode, "khoa"); assert.equal(k.lockReason, "khoa");
  const n = chinhSachWindows(goc({ serverTime: "2026-10-21T15:00:00.000Z" }));   // 22:00 giờ VN
  assert.equal(n.mode, "khoa"); assert.equal(n.lockReason, "ngu");
});
