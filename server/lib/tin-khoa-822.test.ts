// #822 / #823 — Ba Mẹ khoá máy từ web / mở khẩn cấp: máy Con khoá (đúng trình tự test 28/11: đặt giới hạn chơi rồi mới khoá) và bé có dòng
// thông báo («Ba Mẹ đã khoá máy» / «Ba Mẹ mở máy cho con đến hh:mm») — khay báo cùng đường với các tin khác. Hạn khoá đặt xa mốc hiện tại (±giờ), không phụ thuộc tốc độ máy.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { tinCho, tinKhoaMo } = await import("./hoc-vien.ts");
const qg = await import("./quy-gio.ts");
const { one } = await import("./db.ts");

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

test("chữ tin khoá / mở khẩn cấp theo giờ gia đình", () => {
  const tz = "Asia/Ho_Chi_Minh";
  assert.deepEqual(tinKhoaMo("khoa_ngay", { den: "2026-11-28T01:53:32.403Z" }, tz),
    { tieu: "Ba Mẹ đã khoá máy", noi: "Máy mở lại lúc 08:53. Con vẫn xem được nhiệm vụ và xin Ba Mẹ mở." });
  assert.deepEqual(tinKhoaMo("khoa_ngay", {}, tz), { tieu: "Ba Mẹ đã khoá máy", noi: "Khi Ba Mẹ mở máy, con học và chơi tiếp nhé." });
  assert.equal(tinKhoaMo("khoa_may", { ten: "AIIGROW-CON" }, tz)?.tieu, "Ba Mẹ đã khoá máy AIIGROW-CON");
  assert.deepEqual(tinKhoaMo("mo_khan_cap", { den: "2026-11-28T02:40:06.256Z", phut: 15 }, tz),
    { tieu: "Ba Mẹ mở máy cho con đến 09:40", noi: "Con chơi và học thoải mái tới lúc đó nhé." });
  assert.equal(tinKhoaMo("mo_khan_cap", {}, tz), null, "không có hạn ⇒ không báo giờ sai");
});

test("đặt giới hạn chơi rồi khoá 30 phút ⇒ máy khoá, Hôm nay «đang khoá tới», bé có tin khoá; mở khẩn cấp ⇒ tin «mở máy cho con đến»", async () => {
  const { fam, bm } = await taoNha("Mẹ Nghi");
  const con = await g.taoCon(fam, { ten: "Máy ảo" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "AIIGROW-CON");
  // trình tự test 28/11: Ba Mẹ đổi «Giờ chơi» trước (ghi vào children.cau_hinh) rồi mới khoá
  await qg.datGioChoi(fam, con, { gioiHanNgayThuong: 45, gioiHanCuoiTuan: 90, phutMoiLuot: 0 }, bm);
  const cfg = await one<{ t: string }>(`select jsonb_typeof(cau_hinh) as t from children where id = $1`, [con]);
  assert.equal(cfg?.t, "object", "cau_hinh phải là object — mảng thì mọi khoá Con bị bỏ qua");

  const den = new Date(Date.now() + 30 * 60_000).toISOString();
  assert.equal((await m(`con/${con}/khoa`, { tok, body: { khoa: true, den } })).status, 200);
  const w = (await dv("dong-bo", { tok: may.token, body: {} })).body;
  assert.deepEqual([w.windows.locked, w.windows.mode, w.windows.lockReason], [true, "khoa", "khoa"], "máy Con khoá ở lượt đồng bộ kế");
  const ct = (await m(`con/${con}`, { tok })).body;
  assert.deepEqual([ct.khoaNgay, ct.khoaDen], [true, den], "Hôm nay hiện «Đang khoá tới hh:mm» + nút Mở khoá");

  const tin = (await tinCho(con, null, may.deviceId)).ds;
  assert.equal(tin.filter((x) => x.loai === "khoa_ngay").length, 1);
  assert.equal(tin.find((x) => x.loai === "khoa_ngay")?.tieu, "Ba Mẹ đã khoá máy");

  // Mở lại ⇒ tin khoá không còn đúng, không báo; Hoàn tác (bật lại khoá) ⇒ máy khoá lại, đúng MỘT tin khoá (lượt cũ không lặp)
  await m(`con/${con}/khoa`, { tok, body: { khoa: false } });
  assert.equal((await tinCho(con, null, may.deviceId)).ds.filter((x) => x.loai === "khoa_ngay").length, 0, "đã mở lại ⇒ không báo khoá");
  await m(`con/${con}/khoa`, { tok, body: { khoa: true, hoanTac: true } });
  assert.equal((await tinCho(con, null, may.deviceId)).ds.filter((x) => x.loai === "khoa_ngay").length, 1, "hoàn tác ⇒ khoá lại có tin");
  // đổi hạn khoá ⇒ chỉ lượt mới (giờ mới), không còn «mở lại lúc» cũ
  const den2 = new Date(Date.now() + 5 * 3_600_000).toISOString();
  await m(`con/${con}/khoa`, { tok, body: { khoa: true, den: den2 } });
  const k2 = (await tinCho(con, null, may.deviceId)).ds.filter((x) => x.loai === "khoa_ngay");
  assert.equal(k2.length, 1, "đổi hạn ⇒ một tin");
  await m(`con/${con}/khoa`, { tok, body: { khoa: false } });
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.locked, false);

  const may2 = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop 2");
  const kc = await m(`may/${may.deviceId}/mo-khan-cap`, { tok, body: { phut: 15 } });
  assert.equal(kc.status, 200);
  assert.equal((await tinCho(con, null, may2.deviceId)).ds.filter((x) => x.loai === "mo_khan_cap").length, 0, "máy khác của bé không đổi ⇒ không báo");
  const moKc = (await tinCho(con, null, may.deviceId)).ds.find((x) => x.loai === "mo_khan_cap");
  assert.ok(moKc && /^Ba Mẹ mở máy cho con đến \d\d:\d\d$/.test(moKc.tieu), `tin mở khẩn cấp: ${moKc?.tieu}`);
  const w2 = (await dv("dong-bo", { tok: may.token, body: {} })).body.windows;
  assert.equal(w2.mode, "tu_do");
  assert.ok(w2.grantEndsAt, "khay có hạn mở để báo bé");
  // Ba Mẹ «Khoá lại ngay» (huỷ mở khẩn cấp) ⇒ tin mở không còn
  assert.equal((await m(`may/${may.deviceId}/mo-khan-cap/huy`, { tok, body: {} })).status, 200);
  assert.equal((await tinCho(con, null, may.deviceId)).ds.filter((x) => x.loai === "mo_khan_cap").length, 0);
});

test("khoá riêng một máy ⇒ bé của máy đó có tin «Ba Mẹ đã khoá máy <tên>»", async () => {
  const { fam, bm } = await taoNha("Mẹ D");
  const con = await g.taoCon(fam, { ten: "Bé D" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop D");
  assert.equal((await m(`may/${may.deviceId}/khoa`, { tok, body: { khoa: true } })).status, 200);
  assert.equal((await tinCho(con, null, may.deviceId)).ds.find((x) => x.loai === "khoa_may")?.tieu, "Ba Mẹ đã khoá máy Laptop D");
  assert.equal((await tinCho(con, null, "may-khac")).ds.filter((x) => x.loai === "khoa_may").length, 0, "chỉ máy bị khoá");
  // tin tới đúng máy qua đường khay thật (device/hoc-vien/tin)
  assert.ok((await dv("hoc-vien/tin", { tok: may.token })).body.ds.some((x: { loai: string }) => x.loai === "khoa_may"));
  await m(`may/${may.deviceId}/khoa`, { tok, body: { khoa: false } });
  assert.equal((await tinCho(con, null, may.deviceId)).ds.filter((x) => x.loai === "khoa_may").length, 0, "đã mở ⇒ không báo");
});

test("máy dùng chung (sự kiện không gắn bé): khoá riêng máy vẫn tới bé đang dùng máy đó; hạn khoá đã qua ⇒ không báo", async () => {
  const { fam, bm } = await taoNha("Mẹ E");
  const a = await g.taoCon(fam, { ten: "Bé A" });
  const b = await g.taoCon(fam, { ten: "Bé B" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, a, "windows"), "windows", "Máy cả nhà");
  const { q } = await import("./db.ts");
  await q(`update devices set child_id = null, dung_chung = true where id = $1`, [may.deviceId]);
  assert.equal((await m(`may/${may.deviceId}/khoa`, { tok, body: { khoa: true } })).status, 200);
  assert.equal((await tinCho(b, null, may.deviceId)).ds.find((x) => x.loai === "khoa_may")?.tieu, "Ba Mẹ đã khoá máy Máy cả nhà");
  await m(`may/${may.deviceId}/khoa`, { tok, body: { khoa: false } });
  // khoá có hạn đã qua: đặt mốc sự kiện về quá khứ (không đổi đồng hồ)
  const den = new Date(Date.now() + 3_600_000);
  await m(`con/${a}/khoa`, { tok, body: { khoa: true, den: den.toISOString() } });
  await q(`update events set chi_tiet = jsonb_set(chi_tiet, '{den}', to_jsonb($2::text)) where child_id = $1 and loai = 'khoa_ngay'`, [a, new Date(Date.now() - 3_600_000).toISOString()]);
  assert.equal((await tinCho(a, null, may.deviceId)).ds.filter((x) => x.loai === "khoa_ngay").length, 0);
});
