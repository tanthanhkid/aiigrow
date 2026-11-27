// #810: cùng một ngày, cùng một Con / máy / app ⇒ mọi màn ra CÙNG số phút (Trang chủ «đã dùng gì», trang máy, danh sách app-web, app bé).
// Bảng nguồn số (sau #810) — tất cả đọc qua lib/phut-dung.ts (docDongDung + laDongTinhPhut):
//   «Đã dùng gì» / nhật ký / Trang chủ  → homNayDung.dung[].phut        (app + web, gộp mọi máy)
//   trang máy «Hôm nay N phút»          → conMay().ds[].phutHomNay      (cùng tập dòng, chỉ máy đó)
//   danh sách app-web của Con           → danhSachCon().app|web[].phutHomNay
//   app bé «N phút · −N sao»            → appHomNayCon()                (= homNayDung; sao = sổ points loại choi)
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { datLuat } = await import("./luat-app.ts");
const { q } = await import("./db.ts");
const { gioDiaPhuong } = await import("./gio.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { homNayDung, appHomNayCon } = await import("./hom-nay-dung.ts");
const { conMay } = await import("./may-nhieu-con.ts");
const { danhSachCon } = await import("./che-do-chan.ts");

test("#810: trình duyệt + tiến trình hệ thống không làm lệch số; trang máy = «Đã dùng gì» = danh sách app-web", async () => {
  const { fam } = await taoNha("Mẹ Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const may = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop")).deviceId;
  const now = new Date();
  const n = gioDiaPhuong(now, "Asia/Ho_Chi_Minh").ngay;
  await datLuat(fam, { con, muc: "youtube.com", ten: "youtube.com", loai: "giai_tri" });
  await datLuat(fam, { con, muc: "robloxplayerbeta.exe", ten: "Roblox", loai: "giai_tri" });
  const dung = (muc: string, loai: string, phut: number) =>
    q(`insert into usage(device_id, child_id, ngay, muc, loai, phut, dau_luc) values ($1,$2,$3,$4,$5,$6, now() - interval '1 hour')`, [may, con, n, muc, loai, phut]);
  await dung("robloxplayerbeta.exe", "giai_tri", 15);
  await dung("msedge.exe", "chua_phan_loai", 33);      // trình duyệt: phút đã nằm ở dòng web ⇒ không cộng lần hai
  await dung("system", "he_thong", 20);
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1,$2,$3,'youtube.com',3,3180, now() - interval '1 hour')`, [may, con, n]);   // 53 phút

  const hn = await homNayDung(fam, con, now);
  const yt = hn.dung.find((x) => x.muc === "youtube.com")!, rb = hn.dung.find((x) => x.muc === "robloxplayerbeta.exe")!;
  assert.equal(yt.phut, 53);
  assert.equal(rb.phut, 15);
  assert.ok(!hn.dung.some((x) => x.muc === "msedge.exe" || x.muc === "system"), "trình duyệt / hệ thống không có dòng");

  // trang máy: 15 + 53 = 68 (trước #810: + 33 Edge + 20 hệ thống, không có web)
  const cm = await conMay(fam, may, now);
  assert.equal(cm.ds.find((x) => x.id === con)!.phutHomNay, 68);

  // danh sách app-web: Roblox 15, youtube.com 53, không dòng Edge
  const ds = await danhSachCon(fam, con, now);
  assert.equal(ds.app.tinhPhut.find((x) => x.ten === "Roblox")!.phutHomNay, 15);
  assert.equal(ds.web.tinhPhut.find((x) => x.ten === "youtube.com")!.phutHomNay, 53);

  // app bé dùng cùng nguồn phút
  const be = await appHomNayCon(con, now);
  assert.equal(be.find((x) => x.muc === "youtube.com")!.phut, 53);
  assert.equal(be.find((x) => x.muc === "robloxplayerbeta.exe")!.phut, 15);
});
