// node --test src/lib/ten-muc.test.ts — #691: tên app kỹ thuật không lọt ra màn Con / Ba Mẹ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { laMaGoi, tenMuc, tenTepCai, tenYc } from "./ten-muc.ts";

test("tenMuc: mã gói / tệp ⇒ tên người đọc được", () => {
  assert.equal(tenMuc("com.mojang.minecraftpe"), "Minecraft");
  assert.equal(tenMuc("com.supercell.clashofclans"), "Clash of Clans");
  assert.equal(tenMuc("msedge.exe"), "Microsoft Edge");
  assert.equal(tenMuc("robloxplayerbeta.exe"), "Roblox");
  assert.equal(tenMuc("com.vendor.superpuzzlepe"), "Superpuzzle", "gói lạ: khúc cuối bỏ đuôi vô nghĩa");
  assert.equal(tenMuc("game-thu.exe"), "Game thu");
  assert.equal(tenMuc("roblox.exe", "Roblox Player"), "Roblox Player", "tên máy chủ gửi thắng");
  assert.equal(tenMuc("youtube.com"), "youtube.com", "tên miền giữ nguyên");
  assert.equal(tenMuc("m.youtube.com"), "m.youtube.com");
  assert.equal(tenMuc("Minecraft bản mới"), "Minecraft bản mới", "chữ Con tự gõ giữ nguyên");
});
test("laMaGoi phân biệt mã gói với tên miền", () => {
  assert.deepEqual(["com.king.candycrushsaga", "com.roblox.client", "youtube.com", "m.youtube.com", "vtv.vn", "Roblox"].map(laMaGoi), [true, true, false, false, false, false]);
});
test("tenTepCai: tệp cài ⇒ tên app", () => {
  assert.equal(tenTepCai("SetupRoblox.exe"), "Roblox");
  assert.equal(tenTepCai("Roblox Installer (1).exe"), "Roblox");
  assert.equal(tenTepCai("Minecraft-2.exe"), "Minecraft");
  assert.equal(tenTepCai("MinecraftInstaller.exe"), "Minecraft");
  assert.equal(tenTepCai("vlc-3.0.20-win64.exe"), "VLC");
  assert.equal(tenTepCai("ZaloSetup-24.10.1.exe"), "Zalo");
  assert.equal(tenTepCai(""), "App mới");
});
test("tenYc: lời xin không có ten_app ⇒ không hiện tên tệp", () => {
  assert.equal(tenYc({ gia_tri: "robloxplayerbeta.exe" }), "Roblox");
  assert.equal(tenYc({ gia_tri: "com.king.candycrushsaga", ten_app: null }), "Candy Crush Saga");
  assert.equal(tenYc({ gia_tri: "microsoft.mspaint", ten_app: "Paint" }), "Paint");
  assert.equal(tenYc({ gia_tri: "youtube.com" }), "youtube.com");
  assert.equal(tenYc({ gia_tri: null }), null);
});
