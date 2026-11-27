// #727 (A2): số tiêu đề «Cần Ba Mẹ để ý» Trang chủ = số thẻ = chuông = chấm tab; luật riêng của Ba Mẹ thì lời xin tiến trình nền vẫn hiện.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { q, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const cdy = await import("./can-de-y.ts");
const yc = await import("./yeu-cau.ts");

const xin = (con: string, giaTri: string, tenApp: string | null = null) =>
  q(`insert into requests(id, child_id, loai, gia_tri, ten_app, ly_do, het_han) values ($1,$2,'cai_app',$3,$4,'', now() + interval '1 day')`, [newId(), con, giaTri, tenApp]);

test("tiêu đề Trang chủ = số thẻ = chuông = chấm tab, với lời xin hệ thống + lời xin trùng", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  await xin(con, "solitaire.exe"); await xin(con, "solitaire.exe");           // trùng
  await xin(con, "hxtsr.exe"); await xin(con, "sdxhelper.exe");               // hệ thống
  await xin(con, "microsoft.photos.exe");
  const cho = await yc.dsChoYc(fam);
  const c = await cdy.canDeY(fam);
  const the = c.ds.filter((x) => x.loai !== "nop_bai" && (!x.con || x.con === con));
  assert.equal(cho.length, 3, "Chờ duyệt: 3 lời xin thật");
  assert.equal(c.soTheoCon[con], the.length, "số tiêu đề = số thẻ");
  assert.equal(c.soTheoCon[con], cho.length, "= số lời xin ở Chờ duyệt");
  assert.equal(c.soChuong, the.length, "= chuông");
  assert.equal(c.soTab, the.length, "= chấm tab");
});

test("Ba Mẹ đã đặt luật riêng cho tiến trình nền ⇒ lời xin của nó vẫn hiện (Chờ duyệt + chuông); không luật ⇒ ẩn", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  await xin(con, "dax3api.exe"); await xin(con, "rsappui.exe");
  assert.equal((await yc.dsChoYc(fam)).length, 0);
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom) values ($1,'', 'dax3api.exe', 'Dax3api', 'giai_tri', 'game')`, [fam]);
  const cho = await yc.dsChoYc(fam);
  assert.deepEqual(cho.map((x) => x.gia_tri), ["dax3api.exe"]);
  assert.equal((await cdy.canDeY(fam)).ds.filter((x) => x.loai === "con_xin").length, 1);
});
