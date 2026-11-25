import { test } from "node:test";
import assert from "node:assert/strict";
import { mucGop, tenThanThien } from "./ten-than-thien.ts";
import { tenDoc, xepMuc } from "./man-hinh.ts";

test("#659 tên thân thiện cho tên kỹ thuật", () => {
  assert.equal(tenThanThien("BingWeather"), "Thời tiết");
  assert.equal(tenThanThien("microsoft.photos.exe"), "Ảnh");
  assert.equal(tenThanThien("microsoft.microsoftsolitairecollection"), "Solitaire Collection");
  assert.equal(tenThanThien("ZuneMusic"), "Groove Music");
  assert.equal(tenThanThien("lạ.exe"), undefined);
  assert.equal(tenDoc("windowsalarms", "app"), "Báo thức & Đồng hồ");
  assert.equal(tenDoc("microsoftstickynotes", "app"), "Sticky Notes");
});

test("#659 gộp trùng OneDrive / Paint / GraphStudioNext", () => {
  assert.equal(mucGop("microsoft onedrive"), mucGop("onedrive.exe"));
  assert.equal(mucGop("mspaint.exe"), mucGop("paint"));
  assert.equal(mucGop("graphstudionext64.exe"), mucGop("graphstudionext.exe"));
  assert.equal(mucGop("roblox.exe"), "roblox.exe");
});

test("#659 nhóm game mặc định không đè bản chất Edge / công cụ", () => {
  const luat = (muc: string) => [{ child_id: "", muc, ten: muc, loai: "giai_tri", nhom: "game" as const }];
  assert.equal(xepMuc("msedge.exe", luat("msedge.exe")).muc, "tien_ich");
  assert.equal(xepMuc("explorer.exe", luat("explorer.exe")).muc, "tien_ich");
  assert.equal(xepMuc("robloxplayerbeta.exe", luat("robloxplayerbeta.exe")).muc, "game");
  assert.equal(xepMuc("unknown.exe", luat("unknown.exe")).muc, "game");
});
