// Policy dịch cho agent Windows: chỉ app được phép chạy; app giải trí chỉ khi có phiên điểm đúng app; khoá ngay / giờ ngủ ⇒ khoá.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chinhSachWindows, nhipDongBo, TRINH_DUYET } from "./agent-windows.ts";
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
  assert.deepEqual(w.playChoices, ["roblox.exe"]);   // 0.2.6: Rob liệt kê app Giải trí cho nút «Chơi bằng điểm»
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

test("«Mở» có hạn (mở khẩn cấp / thêm giờ): mode tu_do + grantEndsAt ⇒ agent thả AppLocker; khoá ngay / giờ ngủ vẫn thắng", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  const den = new Date(now.getTime() + 30 * 60000);
  const w = chinhSachWindows(goc(), undefined, "chan", { moDen: den });
  assert.equal(w.mode, "tu_do");
  assert.equal(w.locked, false);
  assert.equal(w.grantEndsAt, den.toISOString());
  // hết hạn ⇒ trả lại «hoc»
  const het = chinhSachWindows(goc(), undefined, "chan", { moDen: new Date(now.getTime() - 1000) });
  assert.equal(het.mode, "hoc"); assert.equal(het.grantEndsAt, undefined);
  // khoá ngay thắng
  const k = chinhSachWindows(goc({ khoaNgay: true }), undefined, "chan", { moDen: den });
  assert.equal(k.mode, "khoa"); assert.equal(k.grantEndsAt, undefined);
  // giờ ngủ thắng (22:00 giờ VN)
  const ngu = chinhSachWindows(goc({ serverTime: "2026-10-21T15:00:00.000Z" }), undefined, "chan", { moDen: new Date("2026-10-21T16:00:00.000Z") });
  assert.equal(ngu.mode, "khoa"); assert.equal(ngu.lockReason, "ngu");
});

test("nhịp đồng bộ: nhàn rỗi 120s; có phiên / đang mở 30s; đang mở thì không quá hạn mở (trả chặn đúng giờ); không dưới 10s", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  assert.equal(nhipDongBo({ coPhien: false, now }), 120);
  assert.equal(nhipDongBo({ coPhien: true, now }), 30);
  assert.equal(nhipDongBo({ coPhien: false, now, conThuong: 15 }), 30);
  assert.equal(nhipDongBo({ coPhien: false, now, moDen: new Date(now.getTime() + 600_000) }), 30);
  assert.equal(nhipDongBo({ coPhien: false, now, moDen: new Date(now.getTime() + 5_000) }), 10);
  assert.equal(chinhSachWindows(goc()).nextCheckSec, 120);
  assert.equal(chinhSachWindows(goc({ phien: { id: "p1", muc: "roblox.exe", conPhut: 20 } })).nextCheckSec, 30);
});

test("Con 0 điểm nhưng Ba Mẹ đã cho thêm giờ ⇒ khay vẫn hiện «Dùng điểm để chơi» (canExchangePoints)", () => {
  assert.equal(chinhSachWindows(goc({ soDu: 0 })).canExchangePoints, false);
  assert.equal(chinhSachWindows(goc({ soDu: 0 }), undefined, undefined, { conThuong: 30 }).canExchangePoints, true);
});

test("phiên chơi cho WEBSITE giải trí ⇒ cho trình duyệt agent lọc được (Chrome/Edge/Brave) chạy, KHÔNG mở Firefox/Opera", () => {
  const p = goc({ luat: [{ muc: "youtube.com", loai: "giai_tri", nhom: "video_ngan", giaPhanNghin: 1000 }], phien: { id: "p1", muc: "youtube.com", conPhut: 20 } });
  const w = chinhSachWindows(p);
  for (const b of TRINH_DUYET) assert.ok(w.allowedApps.includes(b), b);
  assert.ok(!chinhSachWindows(goc({ luat: p.luat })).allowedApps.includes("chrome.exe"), "không có phiên ⇒ trình duyệt vẫn bị chặn");
  assert.ok(!w.allowedApps.includes("firefox.exe") && !w.allowedApps.includes("opera.exe"), "trình duyệt không lọc được thì không mở");
});

test("«Mở» có hạn ⇒ trang Giải trí mở trong trình duyệt, trang Ba Mẹ chặn vẫn chặn; hết hạn ⇒ giải trí chặn lại", () => {
  const luat = [{ muc: "youtube.com", loai: "giai_tri" as const, nhom: "video_ngan", giaPhanNghin: 1000 }, { muc: "gamek.vn", loai: "chan" as const, nhom: null, giaPhanNghin: null }];
  const now = new Date("2026-10-21T10:00:00.000Z");
  const mo = chinhSachWindows(goc({ luat }), undefined, "chan", { moDen: new Date(now.getTime() + 600_000) });
  assert.deepEqual(mo.web.chan, ["gamek.vn"]);
  assert.ok(mo.web.cho.includes("youtube.com"));
  const het = chinhSachWindows(goc({ luat }), undefined, "chan", { moDen: new Date(now.getTime() - 1000) });
  assert.deepEqual(het.web.chan, ["gamek.vn", "youtube.com"]);
});
