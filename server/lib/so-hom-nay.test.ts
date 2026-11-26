// Một nguồn số «hôm nay» cho mọi màn Ba Mẹ (#705, #700, #704): đã chơi = phút đã trừ sao hôm nay, giới hạn ngày đã cộng sao cho vay,
// còn = phần còn của giới hạn ngày (cùng số máy Con khoá theo). Mốc giờ cố định — không dùng đồng hồ thật.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const v = await import("./vi.ts");
const qg = await import("./quy-gio.ts");
const ss = await import("./so-sao.ts");
const bc = await import("./bao-cao.ts");
const { homNayDung } = await import("./hom-nay-dung.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);

async function nha(sao: number) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  if (sao) await v.dieuChinhTay(fam, con, sao, "Sao thử", bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Bảo Anh");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  return { fam, bm, con, mayId: may.deviceId as string };
}

async function choi(con: string, tu: Date, phut: number) {
  for (let i = 1; i <= phut; i++) await ss.truPhutChoi(con, 1, sau(tu, i), { muc: "roblox.exe" });
  return sau(tu, phut);
}

test("#705: giới hạn 60, chơi đủ 60, Ba Mẹ cho vay 20 ⇒ «Đã dùng» + Giờ chơi đọc 60 / 80 · còn 20 từ máy chủ", async () => {
  const { fam, bm, con } = await nha(200);
  await qg.datGioChoi(fam, con, { gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90 }, bm);
  const t0 = VN("2026-11-18T15:00:00");     // Thứ Tư
  const t1 = await choi(con, t0, 60);
  assert.equal((await qg.quyHomNay(con, sau(t1, 1))).gioiHan.hetNgay, true);
  await ss.choVay(fam, con, 20, bm, { mucDich: "choi" }, undefined, sau(t1, 2));
  const now = sau(t1, 3);
  const mong = { daChoi: 60, gioiHanNgay: 80, conNgay: 20 };
  const hn = await homNayDung(fam, con, now);
  assert.deepEqual({ daChoi: hn.choi.daChoi, gioiHanNgay: hn.choi.gioiHanNgay, conNgay: hn.choi.conNgay }, mong, "con/:id/hom-nay › choi");
  const gc = await qg.gioChoiCua(fam, con, now);
  assert.deepEqual(gc.soHomNay, { ...mong, gioiHanGoc: 60 }, "con/:id/gio-choi › soHomNay (vạch biểu đồ = giới hạn gốc, chưa cộng sao vay)");
  // Chủ nhật giờ gia đình (5h sáng VN = 22h thứ Bảy UTC): giới hạn cuối tuần theo ngày gia đình, không theo điện thoại
  const cn = VN("2026-11-22T05:00:00");
  assert.equal((await qg.gioChoiCua(fam, con, cn)).soHomNay.gioiHanNgay, 90);
  // không đặt giới hạn ⇒ null (màn hiện số sao còn như cũ)
  const k = await nha(50);
  assert.deepEqual((await qg.gioChoiCua(k.fam, k.con, now)).soHomNay, { daChoi: 0, gioiHanNgay: null, conNgay: null, gioiHanGoc: null });
});

test("#700: «đã chơi hôm nay» ở Trang chủ / Đã dùng / Hồ sơ Con = phút đã trừ sao (số nguyên), không phải phút đo lẻ", async () => {
  const { fam, con, mayId } = await nha(100);
  const t0 = VN("2026-11-18T09:00:00");
  await choi(con, t0, 12);
  await la.datLuat(fam, { muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video" });
  // phút đo được lớn hơn phút trừ sao (web 125 giây + app 3 phút lúc «Mở hết» không trừ sao)
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay) values ($1, $2, '2026-11-18', 'youtube.com', 1, 125)`, [mayId, con]);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1, $2, '2026-11-18', 'roblox.exe', 'giai_tri', 13)`, [mayId, con]);
  const now = sau(t0, 30);
  const qy = await qg.quyHomNay(con, now);
  assert.equal(qy.phutTruHomNay, 12);
  assert.ok(qy.daDung > 12 && !Number.isInteger(qy.daDung), `daDung đo lẻ: ${qy.daDung}`);
  const hn = await homNayDung(fam, con, now);
  assert.equal(hn.choi.daChoi, 12, "con/:id/hom-nay › choi.daChoi");
  assert.equal((await bc.homNay(fam, con, now)).phutChoi, 12, "gia-dinh › con[].phutChoi (Hồ sơ Con)");
});

test("#704: «Không tính phút» và số mục «Đã dùng» tính trên CẢ ngày, phút web cộng theo giây", async () => {
  const { fam, con, mayId } = await nha(0);
  await la.datLuat(fam, { muc: "baitap.vn", ten: "Bài tập", loai: "hoc", nhom: "hoc" });
  const vals: string[] = [], args: unknown[] = [mayId, con];
  for (let i = 0; i < 60; i++) {
    args.push(`s${i}.baitap.vn`, VN(`2026-11-18T${String(8 + Math.floor(i / 10)).padStart(2, "0")}:${String((i % 10) * 5).padStart(2, "0")}:00`));
    vals.push(`($1, $2, '2026-11-18', $${args.length - 1}, 1, 60, $${args.length})`);
  }
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ${vals.join(", ")}`, args);
  const now = VN("2026-11-18T20:00:00");
  const hn = await homNayDung(fam, con, now);
  assert.equal(hn.khongTinhPhut.phut, 60, "đủ 60 tên miền, không chỉ 50 dòng mới nhất");
  assert.equal(hn.soDung, 60, "số mục «Đã dùng» là cả ngày");
  assert.equal(hn.dung.length, 50, "danh sách vẫn gọn 50 dòng");
  // cùng tên miền trên hai máy, 90 giây mỗi máy ⇒ 3 phút (cộng giây rồi làm tròn), không 2 + 2
  const may2 = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC 2");
  for (const m of [mayId, may2.deviceId]) await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1, $2, '2026-11-18', 'tudien.vn', 1, 90, $3)`, [m, con, VN("2026-11-18T19:00:00")]);
  await la.datLuat(fam, { muc: "tudien.vn", ten: "Từ điển", loai: "hoc", nhom: "hoc" });
  const hn2 = await homNayDung(fam, con, now);
  assert.equal(hn2.dung.find((x) => x.muc === "tudien.vn")?.phut, 3);
  assert.equal(hn2.khongTinhPhut.phut, 63);
  // dòng dưới 30 giây mỗi máy vẫn cộng: 25 giây × 3 máy = 75 giây ⇒ 1 phút
  const may3 = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC 3");
  for (const m of [mayId, may2.deviceId, may3.deviceId]) await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1, $2, '2026-11-18', 'tracuu.vn', 1, 25, $3)`, [m, con, VN("2026-11-18T19:30:00")]);
  await la.datLuat(fam, { muc: "tracuu.vn", ten: "Tra cứu", loai: "hoc", nhom: "hoc" });
  assert.equal((await homNayDung(fam, con, now)).dung.find((x) => x.muc === "tracuu.vn")?.phut, 1);
});
