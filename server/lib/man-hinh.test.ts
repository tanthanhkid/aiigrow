// Thời gian màn hình theo tuần: app + web gộp theo mục, trình duyệt không đếm hai lần, luật Ba Mẹ đè gợi ý, tuần trước / trung bình ngày.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const mh = await import("./man-hinh.ts");
const { datLuat } = await import("./luat-app.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);

async function nha() {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Ken");
  return { fam, con, may: ghep.deviceId };
}
const app = (may: string, con: string, ngay: string, muc: string, phut: number, loai = "chua_phan_loai") =>
  q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,$5,$6)`, [may, con, ngay, muc, loai, phut]);
const web = (may: string, con: string | null, ngay: string, mien: string, giay: number, soLan = 1) =>
  q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay) values ($1,$2,$3,$4,$5,$6)`, [may, con, ngay, mien, soLan, giay]);

test("xếp mục: gợi ý theo bản chất, tên miền con, luật Giải trí cụ thể của Ba Mẹ thắng, chưa biết ⇒ chưa xếp", () => {
  assert.equal(mh.xepMuc("robloxplayerbeta.exe", []).muc, "game");
  assert.equal(mh.xepMuc("m.youtube.com", []).muc, "video");
  assert.equal(mh.xepMuc("vi.wikipedia.org", []).muc, "hoc");
  assert.equal(mh.xepMuc("lammoi.exe", []).muc, "chua_xep");
  assert.equal(mh.xepMuc("lammoi.exe", [{ child_id: "", muc: "lammoi.exe", ten: "Làm mới", loai: "hoc", nhom: "khac" }]).muc, "hoc");
  assert.equal(mh.xepMuc("youtube.com", [{ child_id: "c", muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video_ngan" }]).muc, "video_ngan");
  // Ba Mẹ «Cho phép» YouTube (loai hoc) — vẫn là Video theo bản chất
  assert.equal(mh.xepMuc("youtube.com", [{ child_id: "", muc: "youtube.com", ten: "youtube.com", loai: "hoc", nhom: "khac" }]).muc, "video");
  assert.equal(mh.xepMuc("calc.exe", []).muc, "tien_ich", "allowlist hệ thống ⇒ công cụ");
  assert.equal(mh.tenDoc("robloxplayerbeta.exe", "app"), "Roblox");
  assert.equal(mh.tenDoc("com.zing.zalo", "app"), "Zalo");
  assert.equal(mh.tenDoc("paint3d.exe", "app"), "Paint3d");
});

test("tuần: app + web theo mục và theo ngày, trình duyệt chỉ giữ phần dư, tuần trước, trung bình ngày đã qua", async () => {
  const { fam, con, may } = await nha();
  // tuần này bắt đầu T2 19/10; hôm nay T4 21/10
  await app(may, con, "2026-10-19", "robloxplayerbeta.exe", 60, "giai_tri");
  await app(may, con, "2026-10-19", "chrome.exe", 50);
  await web(may, con, "2026-10-19", "youtube.com", 30 * 60, 4);
  await web(may, con, "2026-10-19", "khanacademy.org", 10 * 60, 2);
  await app(may, con, "2026-10-20", "lammoi.exe", 15);
  await web(may, null, "2026-10-20", "facebook.com", 20 * 60, 3);   // máy của Ken, chưa gắn Con ⇒ vẫn tính
  await app(may, con, "2026-10-12", "robloxplayerbeta.exe", 40, "giai_tri"); // tuần trước
  await datLuat(fam, { con, muc: "lammoi.exe", ten: "Làm Mới", loai: "hoc" });

  const r = await mh.thoiGianManHinh(fam, con, 0, VN("2026-10-21T09:00:00"));
  assert.equal(r.dau, "2026-10-19");
  assert.equal(r.cuoi, "2026-10-25");
  assert.equal(r.ten, "Ken");
  const tim = (id: string) => r.ds.find((x) => x.id === id);
  assert.equal(tim("robloxplayerbeta.exe")!.ten, "Roblox");
  assert.equal(tim("chrome.exe")!.phut, 10, "50 phút Chrome − 40 phút đã tính cho trang web");
  assert.equal(tim("youtube.com")!.soLan, 4);
  assert.equal(tim("lammoi.exe")!.ten, "Làm Mới");
  assert.equal(tim("lammoi.exe")!.muc, "hoc");
  assert.deepEqual(r.theoNgay.map((d) => d.phut), [60 + 10 + 30 + 10, 15 + 20, 0, 0, 0, 0, 0]);
  assert.deepEqual(r.theoNgay[0].theoMuc, { game: 60, tien_ich: 10, video: 30, hoc: 10 });
  assert.equal(r.tongPhut, 145);
  assert.equal(r.theoMuc[0].muc, "game");
  assert.equal(r.theoMuc.find((x) => x.muc === "hoc")!.phut, 25);
  assert.equal(r.tbNgay, Math.round(145 / 3), "chia cho 3 ngày đã qua (T2–T4)");
  assert.equal(r.tuanTruocPhut, 40);

  const truoc = await mh.thoiGianManHinh(fam, con, 1, VN("2026-10-21T09:00:00"));
  assert.equal(truoc.dau, "2026-10-12");
  assert.equal(truoc.tongPhut, 40);
  assert.equal(truoc.tbNgay, 6);
});

test("trình duyệt: lịch sử web nhiều hơn giờ mở trình duyệt ⇒ app trình duyệt về 0, không âm; Con nhà khác không lẫn", async () => {
  const a = await nha(), b = await nha();
  await app(a.may, a.con, "2026-10-19", "msedge.exe", 5);
  await web(a.may, a.con, "2026-10-19", "tiktok.com", 12 * 60);
  await web(b.may, b.con, "2026-10-19", "roblox.com", 99 * 60);
  const r = await mh.thoiGianManHinh(a.fam, a.con, 0, VN("2026-10-21T09:00:00"));
  assert.equal(r.ds.find((x) => x.id === "msedge.exe"), undefined);
  assert.deepEqual(r.theoMuc.map((x) => [x.muc, x.phut]), [["video_ngan", 12]]);
  assert.equal(r.ds.some((x) => x.id === "roblox.com"), false);
});
