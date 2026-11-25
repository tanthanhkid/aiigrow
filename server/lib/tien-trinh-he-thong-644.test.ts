// #644: tiến trình nền của phiên Windows (Shellexperiencehost, Lockapp…) không vào «Đã dùng» — kể cả dòng agent cũ đã ghi từ trước.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const { homNayDung, appHomNayCon } = await import("./hom-nay-dung.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

test("laTienTrinhNenWindows: tiến trình nền có / không đuôi .exe, hoa thường; app thật và File Explorer không bị lọc", () => {
  for (const x of ["shellexperiencehost.exe", "LockApp.exe", "StartMenuExperienceHost.exe", "searchhost", "TextInputHost.exe", "runtimebroker.exe", "ApplicationFrameHost.exe"])
    assert.equal(la.laTienTrinhNenWindows(x), true, x);
  for (const x of ["explorer.exe", "roblox.exe", "notepad.exe", "chrome.exe", "", null, "youtube.com"])
    assert.equal(la.laTienTrinhNenWindows(x), false, String(x));
});

test("«Đã dùng» (web Ba Mẹ + màn Con) bỏ tiến trình hệ thống đã ghi từ trước, giữ app thật", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Tú Linh" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "TULINH");
  const r = await xuLyMay(new Request("http://x/api/device/dong-bo", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${may.token}` },
    body: JSON.stringify({ usage: ["shellexperiencehost.exe", "lockapp.exe", "startmenuexperiencehost.exe", "searchhost.exe", "textinputhost.exe", "runtimebroker.exe",
      "applicationframehost.exe", "roblox.exe"].map((muc) => ({ muc, phut: 3 })) }),
  }), ["dong-bo"]);
  assert.equal(r.status, 200);
  const dung = (await homNayDung(fam, con)).dung.map((x) => x.muc).sort();
  assert.deepEqual(dung, ["roblox.exe"]);
  assert.deepEqual((await appHomNayCon(con)).map((x) => x.muc).sort(), ["roblox.exe"]);
});
