// #550: mã ghép máy sinh bằng CSPRNG (crypto.randomInt), trần lượt sai TOÀN CỤC trên mọi nguồn, IPv6 gộp /48 khi đếm lượt ghép.
// Mốc giờ truyền vào (không dùng đồng hồ thật); đường API đi qua xuLyMay với header x-real-ip.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { xuLyMay } = await import("./api-may.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const T = Date.UTC(2031, 0, 5, 3, 0);              // đầu một khung 15 phút
const sai = (ma: string, i: number) => { const s = String((Number(ma) + 1 + i) % 1_000_000).padStart(6, "0"); return s; };

test("mã ghép sinh bằng crypto.randomInt, không còn Math.random", async () => {
  const nguon = readFileSync(new URL("./gia-dinh.ts", import.meta.url), "utf8");
  const ham = nguon.slice(nguon.indexOf("export async function taoMaGhep"), nguon.indexOf("const GHEP_SAI_TOI_DA"));
  assert.match(ham, /randomInt\(0, 1_000_000\)/);
  assert.doesNotMatch(ham, /Math\.random/);
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Na" });
  const ds = new Set<string>();
  for (let i = 0; i < 30; i++) ds.add(await g.taoMaGhep(fam, con, "windows"));
  assert.equal(ds.size, 30);
  for (const m of ds) assert.match(m, /^\d{6}$/);
});

test("IPv6: đếm lượt ghép theo khối /48 (xoay /64 trong cùng /48 không được thêm lượt)", async () => {
  assert.equal(g.nguonGhep("2001:db8:1:2"), "2001:db8:1");
  assert.equal(g.nguonGhep("1.2.3.4"), "1.2.3.4");
  const { fam } = await taoNha();
  const ma = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Bi" }), "windows");
  for (let i = 0; i < 10; i++) await loi(g.ghepMay(sai(ma, i), "windows", "X", `2001:db8:aa:${i.toString(16)}`, T + i), "ma_sai");
  await loi(g.ghepMay(ma, "windows", "X", "2001:db8:aa:ffff", T + 100), "ghep_tam_khoa");
  assert.ok((await g.ghepMay(ma, "windows", "PC Bi", "2001:db8:bb:1", T + 101)).token, "khối /48 khác vẫn ghép được");
});

test("trần toàn cục: dò phân tán từ nhiều IP (mỗi IP < 10 lượt) dừng ở GHEP_SAI_TONG lượt sai / khung; khung mới mở lại", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const { fam } = await taoNha();
  const ma = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Cu" }), "windows");
  const t = T + 15 * 60_000;
  for (let i = 0; i < g.GHEP_SAI_TONG; i++) await loi(g.ghepMay(sai(ma, i), "windows", "X", `10.${Math.floor(i / 5)}.0.1`, t + i), "ma_sai");
  // lượt kế tiếp (IP mới tinh, kể cả mã đúng) bị chặn — không được thử ⇒ không thể trúng
  await loi(g.ghepMay(ma, "windows", "X", "10.250.0.1", t + 500), "ghep_tam_khoa");
  // IP bị chặn vì trần toàn cục không bị tính lượt riêng
  const n = (await q<{ so_lan: number }>(`select so_lan from pin_sai where khoa = $1`, [`ghep:10.250.0.1:${Math.floor(t / 900_000)}`]))[0]?.so_lan ?? 0;
  assert.equal(n, 0);
  assert.ok((await g.ghepMay(ma, "windows", "PC Cu", "10.250.0.1", t + 15 * 60_000)).token, "khung mới ⇒ ghép được");
});

test("một IP đã quá trần riêng không ăn vào trần toàn cục; ghép đúng / mã đã dùng không tính", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const { fam } = await taoNha();
  const ma = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Do" }), "windows");
  const t = T + 30 * 60_000, k = Math.floor(t / 900_000);
  for (let i = 0; i < 50; i++) await assert.rejects(g.ghepMay(sai(ma, i), "windows", "X", "6.6.6.6", t + i));
  const tong = async () => (await q<{ so_lan: number }>(`select so_lan from pin_sai where khoa = $1`, [`ghep_tong:${k}`]))[0]?.so_lan ?? 0;
  assert.equal(await tong(), 10);
  assert.ok((await g.ghepMay(ma, "windows", "PC Do", "7.7.7.7", t + 100)).token);
  await loi(g.ghepMay(ma, "windows", "X", "7.7.7.7", t + 101), "ma_da_dung");
  assert.equal(await tong(), 10);
});

test("dọn bộ đếm ghép của khung đã qua", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const t = T + 60 * 60_000;
  await loi(g.ghepMay("999999", "windows", "X", "9.9.9.9", t), "ma_sai");
  assert.equal(await g.donBoDemGhep(t + 10 * 60_000), 0);
  assert.equal(await g.donBoDemGhep(t + 31 * 60_000), 2);
});

test("API POST /api/may/ghep: trần toàn cục trả 429 ghep_tam_khoa", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const k = Math.floor(Date.now() / 900_000);
  await q(`insert into pin_sai(khoa, so_lan) values ($1, $2)`, [`ghep_tong:${k}`, g.GHEP_SAI_TONG]);
  await q(`insert into pin_sai(khoa, so_lan) values ($1, $2)`, [`ghep_tong:${k + 1}`, g.GHEP_SAI_TONG]);   // khỏi lệch khi qua khung
  const r = await xuLyMay(new Request("http://x/api/may/ghep", {
    method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.9" },
    body: JSON.stringify({ ma: "123456", nen: "windows", tenMay: "X" }),
  }), ["ghep"]);
  assert.equal(r.status, 429);
  assert.equal((await r.json() as { error?: string }).error, "ghep_tam_khoa");
});
