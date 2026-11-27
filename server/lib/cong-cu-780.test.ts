// #780: công cụ hệ thống không lẫn vào «Thêm app»; Notepad / Paint thêm được; AiiGrow không thành app đã dùng; trình duyệt nhận cờ; VioEdu không chờ máy tính báo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const la = await import("./luat-app.ts");
const am = await import("./app-may.ts");

test("#780 công cụ hệ thống: Command Prompt, Registry Editor, Task Manager, Resource Monitor, Remote Desktop, Internet Explorer bị loại", () => {
  for (const [muc, ten] of [["cmd.exe", "Command Prompt"], ["regedit.exe", "Registry Editor"], ["taskmgr.exe", "Task Manager"], ["resmon.exe", "Resource Monitor"],
    ["mstsc.exe", "Remote Desktop Connection"], ["iexplore.exe", "Internet Explorer"], ["x", "Remote Desktop"]])
    assert.equal(la.laCongCuHeThong(muc, ten), true, `${muc} ${ten}`);
  for (const [muc, ten] of [["notepad.exe", "Notepad"], ["mspaint.exe", "Paint"], ["msedge.exe", "Microsoft Edge"], ["roblox.exe", "Roblox"]])
    assert.equal(la.laCongCuHeThong(muc, ten), false, `${muc} ${ten}`);
});

test("#780 bảng phía bé (agent-win XinThem.cs) khớp bảng máy chủ", () => {
  const cs = readFileSync(new URL("../../agent-win/src/AiiGrow.Core/XinThem.cs", import.meta.url), "utf8");
  const khoi = cs.slice(cs.indexOf("class CongCuHeThongView"), cs.indexOf("public static bool La("));
  const muc = [...khoi.matchAll(/"([a-z0-9-]+\.(?:exe|msc))"/g)].map((m) => m[1]);
  assert.ok(muc.length >= 25, String(muc.length));
  for (const m of muc) assert.equal(la.laCongCuHeThong(m), true, `${m} thiếu ở máy chủ`);
  const ten = [...khoi.matchAll(/"([a-z ]+)"/g)].map((m) => m[1]).filter((t) => !muc.includes(t) && t.includes(" "));
  for (const t of ten) assert.equal(la.laCongCuHeThong("", t), true, `«${t}» thiếu ở máy chủ`);
});

test("#780 Notepad / Paint không còn là hệ thống: hiện ở danh sách để Ba Mẹ thêm; Task Manager / cmd vẫn ẩn", () => {
  assert.equal(am.trangThaiApp("notepad.exe", "c1", [], la.allowlistHieuLuc(), "Notepad").trangThai, "chua_xep");
  assert.equal(am.trangThaiApp("mspaint.exe", "c1", [], la.allowlistHieuLuc(), "Paint").trangThai, "chua_xep");
  assert.equal(am.trangThaiApp("taskmgr.exe", "c1", [], la.allowlistHieuLuc(), "Task Manager").trangThai, "he_thong");
  assert.equal(am.trangThaiApp("mstsc.exe", "c1", [], la.allowlistHieuLuc(), "Remote Desktop Connection").trangThai, "he_thong");
});

test("#780 laTrinhDuyet nhận Edge / Chrome, không nhận Notepad", () => {
  assert.equal(la.laTrinhDuyet("msedge.exe"), true);
  assert.equal(la.laTrinhDuyet("notepad.exe"), false);
});
