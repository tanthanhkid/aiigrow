// 11/11 «hai nhà một máy»: agent gửi maMay (SHA-256 hex định danh máy) lúc ghép ⇒ ghép lại cùng maMay ở nhà khác thu hồi bản ghi cũ
// (token cũ 401, máy biến mất khỏi danh sách / An toàn nhà cũ, nhà cũ có sự kiện + cảnh báo «may_chuyen_nha», không lộ nhà mới).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const lm = await import("./lenh-may.ts");
const tt = await import("./tuan-thu.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

async function dv(duong: string, o: { tok?: string; body?: unknown } = {}) {
  const req = new Request(`http://app.test/api/device/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyMay(req, duong.split("/"));
  return { status: r.status, body: await r.json() as any };
}
async function nha(ten: string) {
  const { fam } = await taoNha(ten);
  const con = await g.taoCon(fam, { ten: "Bé " + ten });
  return { fam, con };
}
const MA = "a".repeat(64), MA2 = "b".repeat(64);

test("ghép lại cùng maMay sang nhà khác ⇒ máy cũ bị thu hồi (token 401, biến mất) + nhà cũ có sự kiện, cảnh báo", async () => {
  const A = await nha("A"), B = await nha("B");
  const cu = (await dv("ghep", { body: { ma: await g.taoMaGhep(A.fam, A.con, "windows"), nen: "windows", tenMay: "PC nhà A", maMay: MA.toUpperCase() } })).body;
  assert.ok(cu.token);
  assert.equal((await dv("dong-bo", { tok: cu.token, body: {} })).status, 200);
  assert.equal((await q(`select ma_may from devices where id = $1`, [cu.deviceId]))[0].ma_may, MA, "lưu dạng thường");
  assert.equal((await tt.dsTuanThu(A.fam)).length, 1);

  // ghép sang nhà B bằng gói cài (ghep-goi)
  const gc = await lm.taoGoiCai(B.fam, { con: B.con, nen: "windows" }, "https://app.test");
  const moi = (await dv("ghep-goi", { body: { token: gc.token, nen: "windows", tenMay: "PC nhà B", maMay: MA } })).body;
  assert.ok(moi.token && moi.deviceId !== cu.deviceId);

  assert.equal((await dv("dong-bo", { tok: cu.token, body: {} })).status, 401, "token cũ hết hiệu lực như khi gỡ");
  assert.equal((await dv("dong-bo", { tok: moi.token, body: {} })).status, 200);
  assert.equal((await q(`select 1 from devices where family_id = $1`, [A.fam])).length, 0, "nhà A không còn máy");
  assert.equal((await tt.dsTuanThu(A.fam)).length, 0, "An toàn nhà A không còn máy");
  assert.equal((await tt.dsTuanThu(B.fam)).length, 1);

  const sk = await q<{ loai: string; chi_tiet: any; device_id: string }>(`select loai, chi_tiet, device_id from events where family_id = $1 and loai = 'may_chuyen_nha'`, [A.fam]);
  assert.equal(sk.length, 1);
  assert.equal(sk[0].device_id, cu.deviceId);
  assert.deepEqual(sk[0].chi_tiet, { ten: "PC nhà A" }, "không lộ thông tin nhà mới");
  const cb = await q<{ noi_dung: string; muc: string }>(`select noi_dung, muc from alerts where family_id = $1 and loai = 'may_chuyen_nha'`, [A.fam]);
  assert.equal(cb.length, 1);
  assert.match(cb[0].noi_dung, /đã ghép sang tài khoản khác/);
  assert.ok(!cb[0].noi_dung.includes("B"), "không nêu tên nhà mới");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'may_chuyen_nha'`, [B.fam])).length, 0);
});

test("ghép lại cùng maMay trong cùng nhà ⇒ bản cũ bị bỏ, chỉ còn một máy; maMay khác không đụng nhau", async () => {
  const A = await nha("C");
  const m1 = (await dv("ghep", { body: { ma: await g.taoMaGhep(A.fam, A.con, "windows"), nen: "windows", tenMay: "PC", maMay: MA2 } })).body;
  const khac = (await dv("ghep", { body: { ma: await g.taoMaGhep(A.fam, A.con, "windows"), nen: "windows", tenMay: "PC khác", maMay: "c".repeat(64) } })).body;
  const m2 = (await dv("ghep", { body: { ma: await g.taoMaGhep(A.fam, A.con, "windows"), nen: "windows", tenMay: "PC", maMay: MA2 } })).body;
  assert.equal((await dv("dong-bo", { tok: m1.token, body: {} })).status, 401);
  assert.equal((await dv("dong-bo", { tok: khac.token, body: {} })).status, 200);
  assert.equal((await dv("dong-bo", { tok: m2.token, body: {} })).status, 200);
  assert.deepEqual((await q<{ id: string }>(`select id from devices where family_id = $1 order by name`, [A.fam])).map((r) => r.id).sort(), [khac.deviceId, m2.deviceId].sort());
  const cb = await q<{ muc: string }>(`select muc from alerts where family_id = $1 and loai = 'may_chuyen_nha'`, [A.fam]);
  assert.deepEqual(cb.map((r) => r.muc), ["thong_tin"]);
});

test("không gửi maMay (hoặc sai dạng) ⇒ hành vi cũ: hai bản ghi cùng tồn tại, không sự kiện chuyển nhà", async () => {
  const A = await nha("D"), B = await nha("E");
  const a = (await dv("ghep", { body: { ma: await g.taoMaGhep(A.fam, A.con, "windows"), nen: "windows", tenMay: "PC" } })).body;
  const b = (await dv("ghep", { body: { ma: await g.taoMaGhep(B.fam, B.con, "windows"), nen: "windows", tenMay: "PC" } })).body;
  const c = (await dv("ghep", { body: { ma: await g.taoMaGhep(B.fam, B.con, "windows"), nen: "windows", tenMay: "PC", maMay: "khong-phai-hex" } })).body;
  const d = (await dv("ghep", { body: { ma: await g.taoMaGhep(B.fam, B.con, "windows"), nen: "windows", tenMay: "PC", maMay: "khong-phai-hex" } })).body;
  for (const x of [a, b, c, d]) assert.equal((await dv("dong-bo", { tok: x.token, body: {} })).status, 200);
  assert.equal((await q(`select ma_may from devices where id = $1`, [c.deviceId]))[0].ma_may, null);
  assert.equal((await q(`select 1 from events where family_id in ($1, $2) and loai = 'may_chuyen_nha'`, [A.fam, B.fam])).length, 0);
  assert.equal(g.maMayHopLe(" " + "F".repeat(64) + " "), "f".repeat(64));
  assert.equal(g.maMayHopLe("f".repeat(65)), null);
  assert.equal(g.maMayHopLe(undefined), null);
});
