// #561: GET /api/m/gia-dinh (màn Ba Mẹ chính) — trần số câu SQL cho nhà 3 Con và không ghi DB trong request GET.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { xuLyM } = await import("./api-m.ts");
const { taoPhien } = await import("./auth.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const nv = await import("./nhiem-vu.ts");
const { q } = await import("./db.ts");

const demGet = async (tok: string) => {
  const ds: string[] = [];
  (globalThis as any).__aiigDemCau = ds;
  try {
    const r = await xuLyM(new Request("http://app.test/api/m/gia-dinh", { headers: { authorization: `Bearer ${tok}` } }), ["gia-dinh"]);
    return { status: r.status, body: (await r.json()) as any, ds };
  } finally { delete (globalThis as any).__aiigDemCau; }
};

test("GET gia-dinh nhà 3 Con: ≤ 15 câu SQL, không câu ghi, số liệu đúng từng Con", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const ids: string[] = [];
  for (const ten of ["An", "Bình", "Chi"]) ids.push(await g.taoCon(fam, { ten }));
  await demGet(tok);   // khởi động bảng lười
  const { status, body, ds } = await demGet(tok);
  assert.equal(status, 200);
  assert.equal(body.con.length, 3);
  assert.ok(ds.length <= 15, `gia-dinh ${ds.length} câu:\n${ds.join("\n")}`);
  const ghi = ds.filter((s) => /^\s*(insert|update|delete)\b/i.test(s));
  assert.deepEqual(ghi, [], "GET không được ghi DB");
  for (const c of body.con) { assert.ok(ids.includes(c.id)); assert.equal(c.nhiemVuCho, 0); assert.equal(typeof c.sao, "number"); }
});

test("GET gia-dinh: số liệu từng Con khớp homNay đọc riêng (có sao, vay, phiên chơi, usage, lượt chờ)", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const [a, b] = [await g.taoCon(fam, { ten: "An" }), await g.taoCon(fam, { ten: "Bình" })];
  const { newId } = await import("./db.ts");
  await q(`insert into points(id, child_id, delta, loai, ly_do) values ($1,$2,50,'tay','x'), ($3,$2,-10,'choi','chơi'), ($4,$2,20,'vay','vay')`, [newId(), a, newId(), newId()]);
  await q(`insert into points(id, child_id, delta, loai, ly_do) values ($1,$2,7,'tay','y')`, [newId(), b]);
  await q(`insert into requests(id, child_id, loai, phut, trang_thai, het_han) values ($1,$2,'them_gio',20,'cho', now() + interval '1 hour')`, [newId(), a]);
  const { homNay } = await import("./bao-cao.ts");
  const { status, body } = await demGet(tok);
  assert.equal(status, 200);
  for (const id of [a, b]) {
    const rieng = JSON.parse(JSON.stringify(await homNay(fam, id)));
    const tu = body.con.find((c: any) => c.id === id);
    for (const k of Object.keys(rieng)) assert.deepEqual(tu[k], rieng[k], `con ${id} trường ${k}`);
  }
  assert.equal(body.con.find((c: any) => c.id === a).yeuCauCho, 1);
  assert.equal(body.choDuyet, 1);
});

test("GET gia-dinh không ghi; lời xin quá hạn bị lọc, cron qua-han mới đánh dấu het_han", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const a = await g.taoCon(fam, { ten: "An" });
  const { newId } = await import("./db.ts");
  const id = newId();
  await q(`insert into requests(id, child_id, loai, phut, trang_thai, het_han) values ($1,$2,'them_gio',20,'cho', now() - interval '1 minute')`, [id, a]);
  const { body, ds } = await demGet(tok);
  assert.equal(body.choDuyet, 0);
  assert.deepEqual(ds.filter((s) => /^\s*(insert|update|delete)\b/i.test(s)), []);
  assert.equal((await q<{ trang_thai: string }>(`select trang_thai from requests where id = $1`, [id]))[0].trang_thai, "cho");
  const kq = await nv.quetQuaHan();
  assert.ok(kq.loiXinHetHan >= 1);
  assert.equal((await q<{ trang_thai: string }>(`select trang_thai from requests where id = $1`, [id]))[0].trang_thai, "het_han");
});
