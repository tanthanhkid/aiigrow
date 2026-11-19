// #433 A3 (báo trễ ≠ báo trùng: agent gửi kèm `cuoiLuc` = mốc cuối của khung giờ chơi) + B10 (báo cáo dùng MỘT nguồn phút = sổ sao).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const v = await import("./vi.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const { dongBo } = await import("./may-con.ts");
const bc = await import("./bao-cao.ts");
const { q } = await import("./db.ts");
const { gioDiaPhuong } = await import("./gio.ts");
const { newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

type MayRow = Parameters<typeof dongBo>[0];

async function nha(sao = 60) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  await v.dieuChinhTay(fam, con, sao, "Sao thử", bm);
  const ghep = async (ten: string) => (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", ten)).deviceId;
  const a = await ghep("Máy A"), b = await ghep("Máy B");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const may = async (id: string) => (await q<Record<string, unknown>>(`select * from devices where id = $1`, [id]))[0] as MayRow;
  return { fam, bm, con, a, b, may };
}
const phut = (n: number, s: Date) => new Date(s.getTime() + n * 60_000);

test("A3: máy B báo TRỄ phần chơi trước (có cuoiLuc) khi máy A đã báo phần chơi sau ⇒ trừ đủ cả hai, không coi là trùng", async () => {
  const { con, a, b, may } = await nha(60);
  const t0 = new Date(Date.now() - 20 * 60_000);
  const ngay = gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;
  // 10:00–10:05 chơi trên B (chưa báo), 10:05–10:10 chơi trên A, A báo đúng lúc
  await dongBo(await may(a), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay, cuoiLuc: phut(10, t0).toISOString() }] }, phut(10, t0));
  assert.equal(await v.soDu(con), 55);
  // B mất mạng, 10:10 mới báo 5 phút của khung kết thúc 10:05
  await dongBo(await may(b), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay, cuoiLuc: phut(5, t0).toISOString() }] }, phut(10, t0));
  assert.equal(await v.soDu(con), 50, "5 phút của B là thời gian khác ⇒ trừ thêm 5");
});

test("A3/A9: cùng một lượt chơi báo qua hai máy, cuoiLuc trùng khung ⇒ chỉ trừ một lần (song song)", async () => {
  const { con, a, b, may } = await nha(60);
  const t0 = new Date(Date.now() - 20 * 60_000);
  const ngay = gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;
  const den = phut(5, t0).toISOString();
  await dongBo(await may(a), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay, cuoiLuc: den }] }, phut(5, t0));
  await dongBo(await may(b), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay, cuoiLuc: den }] }, phut(9, t0));   // báo trễ nhưng cùng khung
  assert.equal(await v.soDu(con), 55);
});

test("A3: agent cũ không gửi cuoiLuc ⇒ giữ hành vi cũ (cửa sổ theo giờ máy chủ)", async () => {
  const { con, a, b, may } = await nha(60);
  const t0 = new Date(Date.now() - 20 * 60_000);
  const ngay = gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;
  await dongBo(await may(a), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay }] }, phut(10, t0));
  await dongBo(await may(b), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay }] }, phut(10, t0));
  assert.equal(await v.soDu(con), 55, "như cũ: hai lần báo cùng lúc coi là song song");
});

test("A3: cuoiLuc ở tương lai / vô lý bị bỏ qua (kẹp về giờ máy chủ)", async () => {
  const { con, a, may } = await nha(60);
  const now = new Date();
  const ngay = gioDiaPhuong(now, "Asia/Ho_Chi_Minh").ngay;
  await dongBo(await may(a), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay, cuoiLuc: phut(600, now).toISOString() }] }, now);
  assert.equal(await v.soDu(con), 55);
  const row = (await q<{ luc: Date }>(`select luc from choi_tru where child_id = $1`, [con]))[0];
  assert.ok(new Date(row.luc).getTime() <= now.getTime());
});

test("B10: báo cáo tuần lấy phút chơi từ SỔ SAO — không từ play_sessions (một nguồn, khớp saoTieuChoi)", async () => {
  const { fam, con, a, may } = await nha(60);
  const now = new Date();
  const ngay = gioDiaPhuong(now, "Asia/Ho_Chi_Minh").ngay;
  await dongBo(await may(a), { usage: [{ muc: "roblox.exe", phut: 8, day: ngay }] }, now);
  // phiên chơi cũ ghi phut_dung khác hẳn (cùng lượt chơi đã vào sổ sao) — không được cộng thêm vào báo cáo
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut, phut_dung, trang_thai, bat_dau)
           values ($1,$2,$3,'roblox.exe','game',1000,60,30,'ket_thuc',$4)`, [newId(), con, a, now]);
  const r = await bc.baoCaoTuan(fam, con, now, true);
  assert.equal(r.tuanNay.saoTieuChoi, 8);
  assert.equal(r.tuanNay.tongGiaiTri, 8, "tổng giải trí = sao tiêu cho chơi (1 sao = 1 phút)");
  assert.equal(r.tuanNay.giaiTriTheoNgay.find((x) => x.ngay === ngay)?.phut, 8);
});
