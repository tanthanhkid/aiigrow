// #699: khay Windows «Hôm nay đã chơi N phút · −N sao» đọc số máy chủ (sao.phutChoiHomNay trong dong-bo) — mọi máy của Con, cả web,
// không mất khi dịch vụ khởi động lại. Mốc giờ cố định.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const v = await import("./vi.ts");
const mc = await import("./may-con.ts");
const ss = await import("./so-sao.ts");
const { one, q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);

test("#699: dong-bo › sao.phutChoiHomNay = phút đã trừ sao hôm nay trên MỌI máy của Con (máy A 30 phút app + máy B 12 phút web)", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  await v.dieuChinhTay(fam, con, 100, "Sao thử", bm);
  const a = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop A");
  await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC B");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const t0 = VN("2026-11-18T09:00:00");
  for (let i = 1; i <= 30; i++) await ss.truPhutChoi(con, 1, sau(t0, i), { muc: "roblox.exe" });
  const t1 = VN("2026-11-18T15:00:00");
  for (let i = 1; i <= 12; i++) await ss.truPhutChoi(con, 1, sau(t1, i), { muc: "youtube.com" });
  const may = (await one<any>(`select * from devices where id = $1`, [a.deviceId]))!;
  const p = await mc.taoPolicy(may, con, { gioMaySai: false }, sau(t1, 13));
  assert.equal(p.sao?.phutChoiHomNay, 42);
  assert.equal(p.sao?.sao, 58, "ví đã trừ 42 sao — cùng số với dòng «−42 sao»");
  // sang ngày mới (giờ gia đình) ⇒ về 0
  assert.equal((await mc.taoPolicy(may, con, { gioMaySai: false }, VN("2026-11-19T00:05:00"))).sao?.phutChoiHomNay, 0);
});

test("#703: Windows đặt múi giờ UTC, gia đình giờ Việt Nam — 5h sáng chơi app + web «Tính phút»: agent báo theo NGÀY GIA ĐÌNH (windows.tz) thì trừ sao hôm nay", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  await v.dieuChinhTay(fam, con, 100, "Sao thử", bm);
  const a = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop A");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video" });
  const may = (await one<any>(`select * from devices where id = $1`, [a.deviceId]))!;
  const now = VN("2026-11-18T05:20:00");          // = 2026-11-17 22:20 UTC — ngày máy (UTC) còn là hôm qua
  // windows.tz cho agent biết ngày gia đình
  const p = await mc.taoPolicy(may, con, { gioMaySai: false }, now);
  const { chinhSachWindows } = await import("./agent-windows.ts");
  assert.equal(chinhSachWindows(p).tz, "Asia/Ho_Chi_Minh");
  assert.equal(chinhSachWindows(p).tzPhut, 420, "độ lệch +07:00 cho tác tử không tra được tên múi");
  // agent theo ngày máy (UTC) — hành vi cũ: ghi vào hôm qua, KHÔNG trừ sao (đây là lỗi #703)
  await mc.dongBo(may, { clientTime: "2026-11-17T22:20:00+00:00", usage: [{ muc: "roblox.exe", phut: 20, day: "2026-11-17" }] } as never, now);
  assert.equal(await ss.phutDaTruHomNay(q, con, "Asia/Ho_Chi_Minh", now), 0, "ngày máy lệch ngày gia đình ⇒ không trừ (lý do agent phải theo windows.tz)");
  // agent mới theo ngày gia đình ⇒ trừ đúng hôm nay (app + web)
  await mc.dongBo(may, { clientTime: "2026-11-17T22:20:00+00:00", usage: [{ muc: "roblox.exe", phut: 20, day: "2026-11-18" }] } as never, now);
  const w = await import("./web.ts");
  await w.nhanLichSuWeb(may, con, [{ ngay: "2026-11-18", tenMien: "youtube.com", soLan: 3, giay: 600 }], sau(now, 30));   // chơi web nối tiếp sau app (không trùng cửa sổ)
  assert.equal(await ss.phutDaTruHomNay(q, con, "Asia/Ho_Chi_Minh", sau(now, 30)), 30);
});
