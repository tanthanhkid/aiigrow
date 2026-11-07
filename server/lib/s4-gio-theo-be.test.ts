// S4 (L13 «giờ tính theo bé»): hai bé dùng chung một máy + cùng một app — phút dùng ghi riêng từng bé, không gộp theo khoá máy.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const g = await import("./gia-dinh.ts");
const { q } = await import("./db.ts");
const { quyHomNay } = await import("./quy-gio.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");
const { gioDiaPhuong } = await import("./gio.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) =>
  async (tok: string, duong: string, body?: unknown) => {
    const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), duong.split("?")[0].split("/"));
    return { status: r.status, body: (await r.json()) as any };
  };
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");

test("S4 hai bé một máy, cùng app Giải trí: usage ghi riêng từng bé, quỹ phút tính theo bé", async () => {
  const { fam, bm } = await taoNha();
  const tokBm = await taoPhien(bm);
  const anh = (await m(tokBm, "con", { ten: "Bảo Anh", pin: "4821" })).body.id as string;
  const minh = (await m(tokBm, "con", { ten: "Bảo Minh", pin: "1357" })).body.id as string;
  for (const c of [anh, minh]) await q(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom) values ($1,'',$2,$2,'giai_tri','khac') on conflict do nothing`, [fam, "roblox.exe"]).catch(() => {});
  const chung = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC phòng khách");
  const tok = chung.token as string, id = chung.deviceId as string;

  await dv(tok, "dang-nhap-be", { con: anh, pin: "4821" });
  await dv(tok, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 20 }] });
  await dv(tok, "dang-nhap-be", { con: minh, pin: "1357" });
  await dv(tok, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 7 }] });
  // agent gửi lại số tích luỹ của bé trước (không đổi) + thêm cho bé sau ⇒ chỉ tăng đúng bé đó
  await dv(tok, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 9 }] });

  const hang = await q<{ child_id: string; phut: number }>(`select child_id, phut from usage where device_id = $1 order by phut desc`, [id]);
  assert.deepEqual(hang.map((x) => [x.child_id, x.phut]), [[anh, 20], [minh, 9]]);

  const now = new Date();
  const ngay = gioDiaPhuong(now, "Asia/Ho_Chi_Minh").ngay;
  const ra = async (c: string) => (await q<{ p: number }>(`select coalesce(sum(phut),0)::int as p from usage where child_id = $1 and ngay = $2`, [c, ngay]))[0].p;
  assert.equal(await ra(anh), 20);
  assert.equal(await ra(minh), 9);
  const qa = await quyHomNay(anh, now), qm = await quyHomNay(minh, now);
  assert.equal(qa.daDung, 20);
  assert.equal(qm.daDung, 9);
  assert.equal(qa.conPhut - qm.conPhut, -11, "quỹ còn của hai bé lệch đúng 11 phút");
});

test("S4 Ba Mẹ đang dùng máy: không ghi phút cho bé nào", async () => {
  const { fam, bm } = await taoNha();
  const tokBm = await taoPhien(bm);
  const anh = (await m(tokBm, "con", { ten: "Bảo Anh", pin: "4821" })).body.id as string;
  const chung = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC");
  await dv(chung.token, "dang-nhap-be", { con: anh, pin: "4821" });
  const ma = (await m(tokBm, `may/${chung.deviceId}/ma-offline?phut=15`)).body.ma;
  await dv(chung.token, "ba-me-mo", { ma });
  await dv(chung.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 30 }] });
  assert.equal((await q(`select 1 from usage where device_id = $1`, [chung.deviceId])).length, 0);
});

test("S4 migration: khoá usage gồm child_id và chạy lại được", async () => {
  const { SCHEMA_S3 } = await import("./schema.ts");
  const mig = SCHEMA_S3.find((s) => s.includes("usage_pkey"))!;
  await q(mig);
  const cot = await q<{ attname: string }>(`select a.attname from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.conrelid = 'usage'::regclass and c.contype = 'p'`);
  assert.deepEqual(cot.map((x) => x.attname).sort(), ["child_id", "device_id", "muc", "ngay"]);
});
