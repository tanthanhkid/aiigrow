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
