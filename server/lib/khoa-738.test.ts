// #738 — «Khoá máy» từ web áp xuống máy đã ghép: lệnh khoá tới agent ở lượt đồng bộ kế (và đánh thức long-poll), trạng thái khoá theo MỐC GIỜ truyền vào,
// khởi động lại (đồng bộ lại) vẫn khoá tới hết hạn, mở khoá thì mở, Con chưa có máy ⇒ `soMay: 0` để app báo Ba Mẹ.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { phienBanDoi } = await import("./cho-thay-doi.ts");
const mc = await import("./may-con.ts");
const { khoaGoc, khoaDen, dangKhoa } = await import("./cau-hinh.ts");

async function goi(f: typeof xuLyM, goc: string, duong: string, o: { tok?: string; body?: unknown } = {}) {
  const r = await f(new Request(`http://app.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);
const dv = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyMay, "device", d, o);

test("con/:id/khoa 30 phút ⇒ máy đã ghép khoá ở lượt đồng bộ kế, đồng bộ lại (khởi động lại) vẫn khoá, mở khoá ⇒ máy mở; trang chủ có khoaNgay + khoaDen", async () => {
  const { fam, bm } = await taoNha("Mẹ Lan");
  const con = await g.taoCon(fam, { ten: "Máy ảo" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "VM Win10");
  const truoc = await phienBanDoi(fam);
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.locked, false);

  const den = new Date(Date.now() + 30 * 60_000).toISOString();
  const k = await m(`con/${con}/khoa`, { tok, body: { khoa: true, den } });
  assert.equal(k.status, 200);
  assert.deepEqual([k.body.ok, k.body.soMay], [true, 1], "báo số máy lệnh khoá tới");
  assert.ok((await phienBanDoi(fam)) > truoc, "đánh thức máy đang chờ (long-poll cho-thay-doi)");

  const ct = (await m(`con/${con}`, { tok })).body;
  assert.equal(ct.khoaNgay, true);
  assert.equal(ct.khoaDen, den, "trang chủ hiện «Đang khoá tới HH:MM»");
  for (let i = 0; i < 2; i++) {   // lần 2 = máy vừa khởi động lại, đồng bộ lại từ đầu
    const w = (await dv("dong-bo", { tok: may.token, body: {} })).body;
    assert.deepEqual([w.khoaNgay, w.khoaHetLuc, w.windows.locked, w.windows.mode, w.windows.lockReason], [true, den, true, "khoa", "khoa"]);
  }
  assert.equal((await m(`con/${con}/khoa`, { tok, body: { khoa: false } })).status, 200);
  assert.equal((await m(`con/${con}`, { tok })).body.khoaNgay, false);
  const w = (await dv("dong-bo", { tok: may.token, body: {} })).body;
  assert.deepEqual([w.khoaNgay, w.windows.locked], [false, false]);
});

test("trạng thái khoá theo thời điểm truyền vào: trước hạn khoá, đúng/sau hạn tự mở; không hạn khoá mãi; taoPolicy theo `now`", async () => {
  const cfg = { khoa_ngay: true, khoa_den: "2026-11-27T07:16:00.000Z" };
  assert.deepEqual([khoaGoc(cfg, new Date("2026-11-27T06:46:00Z")), khoaDen(cfg, new Date("2026-11-27T06:46:00Z"))], [true, "2026-11-27T07:16:00.000Z"]);
  assert.equal(dangKhoa(cfg, new Date("2026-11-27T07:15:59Z")), true);
  assert.equal(dangKhoa(cfg, new Date("2026-11-27T07:16:00Z")), false, "đúng hạn ⇒ mở");
  assert.equal(khoaDen(cfg, new Date("2026-11-27T07:30:00Z")), null);
  assert.equal(dangKhoa({ khoa_ngay: true }, new Date("2030-01-01T00:00:00Z")), true, "không hạn ⇒ khoá tới khi Ba Mẹ mở");

  const { fam, bm } = await taoNha("Mẹ B");
  const con = await g.taoCon(fam, { ten: "Bé B" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  const mayRow = (await import("./db.ts")).one<any>;
  const row = await mayRow(`select * from devices where id = $1`, [may.deviceId]);
  const t0 = new Date();
  await m(`con/${con}/khoa`, { tok, body: { khoa: true, den: new Date(t0.getTime() + 15 * 60_000).toISOString() } });
  assert.equal((await mc.taoPolicy(row, con, { gioMaySai: false }, t0)).khoaNgay, true);
  assert.equal((await mc.taoPolicy(row, con, { gioMaySai: false }, new Date(t0.getTime() + 16 * 60_000))).khoaNgay, false, "quá hạn ⇒ Policy mở");
});

test("Con chưa ghép máy nào: khoá vẫn lưu nhưng trả soMay 0 để app báo Ba Mẹ", async () => {
  const { fam, bm } = await taoNha("Mẹ C");
  const con = await g.taoCon(fam, { ten: "Bé C" });
  const tok = await taoPhien(bm);
  const k = await m(`con/${con}/khoa`, { tok, body: { khoa: true } });
  assert.deepEqual([k.status, k.body.ok, k.body.soMay], [200, true, 0]);
  assert.equal((await m(`con/${con}`, { tok })).body.khoaNgay, true);
});

// #772 — khoá THEO BÉ hiện ở trang máy: khoaBe + nhật ký máy có «khoa_ngay» / «mo_lai» của bé trên máy; mở khoá theo bé mở máy.
test("trang máy: khoaBe + nhật ký khoá/mở khoá theo bé (mốc giờ truyền vào)", async () => {
  const { dsTuanThu, chiTietTuanThu } = await import("./tuan-thu.ts");
  const { fam, bm } = await taoNha("Mẹ D");
  const con = await g.taoCon(fam, { ten: "Bé D" });
  const khac = await g.taoCon(fam, { ten: "Bé E" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop D");
  const t0 = new Date();
  const den = new Date(t0.getTime() + 60 * 60_000).toISOString();
  await m(`con/${con}/khoa`, { tok, body: { khoa: true, den } });
  await m(`con/${khac}/khoa`, { tok, body: { khoa: true } });   // bé khác không dùng máy này
  const ds = await dsTuanThu(fam, t0);
  const mm = ds.find((x) => x.id === may.deviceId)!;
  assert.deepEqual(mm.khoaBe.map((b) => [b.id, b.den]), [[con, den]]);
  assert.equal(ds.find((x) => x.id === may.deviceId)!.khoaMay.khoa, false, "khoá theo bé không giả làm khoá theo máy");
  const ct = await chiTietTuanThu(fam, may.deviceId, t0);
  assert.deepEqual((ct.suKien as { loai: string }[]).map((x) => x.loai), ["khoa_ngay"], "nhật ký máy chỉ có khoá của bé trên máy");
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.locked, true);
  await m(`con/${con}/khoa`, { tok, body: { khoa: false } });
  assert.deepEqual((await dsTuanThu(fam, new Date())).find((x) => x.id === may.deviceId)!.khoaBe, []);
  assert.deepEqual(((await chiTietTuanThu(fam, may.deviceId, new Date())).suKien as { loai: string }[]).map((x) => x.loai), ["mo_lai", "khoa_ngay"]);
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.locked, false);
  // khoá theo MÁY độc lập: khoá máy rồi mở khoá ⇒ trạng thái theo mốc giờ truyền vào
  assert.equal((await m(`may/${may.deviceId}/khoa`, { tok, body: { khoa: true, den: new Date(t0.getTime() + 15 * 60_000).toISOString() } })).status, 200);
  const hai = (now: Date) => dsTuanThu(fam, now).then((d) => d.find((x) => x.id === may.deviceId)!.khoaMay.khoa);
  assert.deepEqual([await hai(t0), await hai(new Date(t0.getTime() + 16 * 60_000))], [true, false]);
  assert.equal((await m(`may/${may.deviceId}/khoa`, { tok, body: { khoa: false } })).status, 200);
  assert.equal(await hai(t0), false);
});
