// #702: số «lời xin» trên avatar Con (GET gia-dinh › con[].yeuCauCho, homNay) đếm cùng điều kiện với danh sách Chờ duyệt (dsChoYc):
// lời xin cài thành phần Windows cũ (#525) không hiện trong danh sách thì cũng không được đếm.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { xuLyM } = await import("./api-m.ts");
const { taoPhien } = await import("./auth.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { dsChoYc } = await import("./yeu-cau.ts");
const { homNay } = await import("./bao-cao.ts");
const { q, newId } = await import("./db.ts");

test("#702: lời xin cài «Storedesktopextension» (thành phần Windows) không hiện ở Chờ duyệt ⇒ không tính vào số lời xin của Con", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const xin = (loai: string, giaTri: string | null, tenApp: string | null) =>
    q(`insert into requests(id, child_id, loai, gia_tri, ten_app, phut, trang_thai, het_han) values ($1, $2, $3, $4, $5, 0, 'cho', now() + interval '2 days')`,
      [newId(), con, loai, giaTri, tenApp]);
  await xin("cai_app", "storedesktopextension.exe", null);
  await xin("cai_app", "gamebar", "Game Bar");
  await xin("cai_app", "roblox.exe", "Roblox");          // lời xin thật
  await xin("mo_web", "youtube.com", null);              // lời xin thật
  const ds = (await dsChoYc(fam, new Date(), { ghi: false })).filter((r) => r.child_id === con);
  assert.equal(ds.length, 2);
  const r = await xuLyM(new Request("http://app.test/api/m/gia-dinh", { headers: { authorization: `Bearer ${tok}` } }), ["gia-dinh"]);
  const body = (await r.json()) as { con: { id: string; yeuCauCho: number }[] };
  assert.equal(body.con.find((c) => c.id === con)!.yeuCauCho, ds.length, "GET gia-dinh › con[].yeuCauCho = số dòng Chờ duyệt");
  assert.equal((await homNay(fam, con)).yeuCauCho, ds.length, "homNay › yeuCauCho");
});
