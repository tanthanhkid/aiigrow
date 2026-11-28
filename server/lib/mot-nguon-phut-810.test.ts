// #810: cùng một ngày, cùng một Con / máy / app ⇒ mọi màn ra CÙNG số phút (Trang chủ «đã dùng gì», trang máy, danh sách app-web, app bé).
// Bảng nguồn số (sau #810) — tất cả đọc qua lib/phut-dung.ts (docDongDung + laDongTinhPhut):
//   «Đã dùng gì» / nhật ký / Trang chủ  → homNayDung.dung[].phut        (app + web, gộp mọi máy)
//   trang máy «N phút trên máy này»     → conMay().ds[].phutHomNay      (test 28/11: phút ĐÃ CHƠI trừ sao trên máy đó — sổ `choi` theo device_id;
//                                                                       phutDungHomNay = mọi phút đo được, cùng tập dòng)
//   cột «−N sao» của «Đã dùng gì»       → homNayDung.dung[].sao         (sổ `choi` theo mục — không còn ước 1 phút = 1 sao ở app)
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

  // trang máy: phút đo 15 + 53 = 68 (trước #810: + 33 Edge + 20 hệ thống, không có web); phút đã chơi (sổ) = 0 vì chưa trừ sao
  const cm = await conMay(fam, may, now);
  assert.equal(cm.ds.find((x) => x.id === con)!.phutDungHomNay, 68);
  assert.equal(cm.ds.find((x) => x.id === con)!.phutHomNay, 0);

  // danh sách app-web: Roblox 15, youtube.com 53, không dòng Edge
  const ds = await danhSachCon(fam, con, now);
  assert.equal(ds.app.tinhPhut.find((x) => x.ten === "Roblox")!.phutHomNay, 15);
  assert.equal(ds.web.tinhPhut.find((x) => x.ten === "youtube.com")!.phutHomNay, 53);

  // app bé dùng cùng nguồn phút
  const be = await appHomNayCon(con, now);
  assert.equal(be.find((x) => x.muc === "youtube.com")!.phut, 53);
  assert.equal(be.find((x) => x.muc === "robloxplayerbeta.exe")!.phut, 15);
});

test("#810 test 28/11: app Con, «Đã dùng gì», trang máy, Hôm nay cùng số phút đã chơi / sao trừ; sau vay trang máy cùng số sao khả dụng", async () => {
  const { fam, bm } = await taoNha("Mẹ Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const ss = await import("./so-sao.ts");
  const { quyHomNay, soHomNay } = await import("./quy-gio.ts");
  const may = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop")).deviceId;
  const may2 = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC phòng khách")).deviceId;
  await ss.tangSaoKhoiDau(con, 9, bm);
  await datLuat(fam, { con, muc: "youtube.com", ten: "youtube.com", loai: "giai_tri" });
  await datLuat(fam, { con, muc: "powershell.exe", ten: "PowerShell", loai: "giai_tri" });
  const now = new Date(Date.now() - 60_000);
  const n = gioDiaPhuong(now, "Asia/Ho_Chi_Minh").ngay;
  // đo: PowerShell 8′ + Explorer 3′ (tiến trình nền, không luật) trên Laptop; youtube 16′ trên Laptop (một phần chơi song song PowerShell)
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut, dau_luc) values ($1,$2,$3,'powershell.exe','giai_tri',8, now() - interval '30 minutes'),
     ($1,$2,$3,'explorer.exe','chua_phan_loai',3, now() - interval '30 minutes')`, [may, con, n]);
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1,$2,$3,'youtube.com',2,960, now() - interval '20 minutes')`, [may, con, n]);
  // sổ: trừ 6 sao PowerShell + 3 sao youtube trên Laptop (hết 9 sao ⇒ phần youtube còn lại không trừ)
  for (let i = 0; i < 6; i++) await ss.truPhutChoi(con, 1, new Date(now.getTime() - (20 - i) * 60_000), { muc: "powershell.exe", may });
  for (let i = 0; i < 5; i++) await ss.truPhutChoi(con, 1, new Date(now.getTime() - (10 - i) * 60_000), { muc: "youtube.com", may });

  const qy = await quyHomNay(con, now);
  const daChoi = soHomNay(qy).daChoi;
  assert.equal(daChoi, 9, "Hôm nay «Đã dùng 9 phút» = sổ");
  const hn = await homNayDung(fam, con, now);
  const yt = hn.dung.find((x) => x.muc === "youtube.com")!, ps = hn.dung.find((x) => x.muc === "powershell.exe")!;
  assert.deepEqual([yt.phut, yt.sao, ps.phut, ps.sao], [16, 3, 8, 6], "«Đã dùng gì»: phút đo + sao trừ thật theo sổ (không ước −16 sao)");
  assert.equal(hn.dung.reduce((a, x) => a + x.sao, 0), daChoi, "tổng sao các dòng = Hôm nay");
  // app Con: CÙNG danh sách
  const be = await appHomNayCon(con, now);
  assert.deepEqual(be.map((x) => [x.muc, x.phut, x.sao]).sort(), hn.dung.map((x) => [x.muc, x.phut, x.sao]).sort());
  // trang máy: phút đã chơi trên Laptop = 9 = Hôm nay; máy kia 0
  const cm = await conMay(fam, may, now);
  assert.equal(cm.ds.find((x) => x.id === con)!.phutHomNay, daChoi);
  assert.equal((await conMay(fam, may2, now)).ds.find((x) => x.id === con)!.phutHomNay, 0);
  // khay Windows: Policy › sao.appHomNay = cùng danh sách sổ, tổng = phutChoiHomNay
  const { appTheoSo } = await import("./phut-dung.ts");
  const { dauNgayUtc } = await import("./gio.ts");
  const khay = await appTheoSo(con, n, dauNgayUtc(n, "Asia/Ho_Chi_Minh"), [{ muc: "powershell.exe", ten: "PowerShell" }]);
  assert.deepEqual(khay.map((x) => [x.ten, x.sao]), [["PowerShell", 6], ["youtube.com", 3]]);

  // sổ cũ chưa ghi máy (trước bản này) ⇒ suy theo máy dùng mục đó nhiều nhất hôm nay
  await q(`update points set device_id = null where child_id = $1 and loai = 'choi'`, [con]);
  assert.equal((await conMay(fam, may, now)).ds.find((x) => x.id === con)!.phutHomNay, daChoi);

  // #812: hết sao, Ba Mẹ cho vay 10 ⇒ trang máy, Hôm nay, khay cùng «10 sao = 10 phút»
  await ss.choVay(fam, con, 10, bm, { mucDich: "choi" });
  const st = (await quyHomNay(con)).soSao;
  assert.deepEqual([st.sao, st.phutCon, st.no], [10, 10, 10]);
  assert.equal((await conMay(fam, may)).ds.find((x) => x.id === con)!.sao, 10, "trang máy dùng sao khả dụng, không «0 sao»");
});
