// #550: mã ghép máy sinh bằng CSPRNG (crypto.randomInt), chế độ «bị dò» toàn cục, trần theo khối IPv6 /48, chuẩn hoá nguồn gọi.
// Lib: mốc giờ truyền vào. API (xuLyMay tự lấy giờ): đặt bộ đếm cho cả khung hiện tại lẫn khung kế để không lệch khi qua khung.
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
const sai = (ma: string, i: number) => String((Number(ma) + 1 + i) % 1_000_000).padStart(6, "0");
/** Chỉ để lại mã `ma` trong pair_codes — mã «sai» sinh liên tiếp không vô tình trùng một mã còn sống khác. */
const chiConMa = (ma: string) => q(`delete from pair_codes where code <> $1`, [ma]);

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

test("nguồn gọi: IPv4 ánh xạ IPv6 / kèm cổng ⇒ IPv4 trần; [IPv6]:cổng ⇒ /64; khối /48", () => {
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "::ffff:1.2.3.4" })), "1.2.3.4");
  assert.equal(g.nguonGoi(new Headers({ "x-forwarded-for": "1.2.3.4:5678, 10.0.0.1" })), "1.2.3.4");
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "[2001:db8:1:2::9]:443" })), "2001:db8:1:2");
  assert.equal(g.khoi48("2001:db8:1:2"), "2001:db8:1");
  assert.equal(g.khoi48("1.2.3.4"), null);
});

test("IPv6: khối /48 tối đa 30 lượt sai / khung (xoay /64 không được thêm), khối khác không ảnh hưởng", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const { fam } = await taoNha();
  const ma = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Bi" }), "windows");
  await chiConMa(ma);
  for (let i = 0; i < 30; i++) await loi(g.ghepMay(sai(ma, i), "windows", "X", `2001:db8:aa:${i.toString(16)}`, T + i), "ma_sai");
  await loi(g.ghepMay(ma, "windows", "X", "2001:db8:aa:ffff", T + 100), "ghep_tam_khoa");
  assert.ok((await g.ghepMay(ma, "windows", "PC Bi", "2001:db8:bb:1", T + 101)).token, "khối /48 khác vẫn ghép được");
});

test("bị dò phân tán: tổng lượt sai > 200 ⇒ mỗi nguồn còn 1 lượt; người gõ đúng lần đầu vẫn ghép được; khung mới trở lại bình thường", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const { fam } = await taoNha();
  const ma = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Cu" }), "windows");
  await chiConMa(ma);
  const t = T + 15 * 60_000;
  for (let i = 0; i < g.GHEP_SAI_TONG; i++) await loi(g.ghepMay(sai(ma, i), "windows", "X", `10.${Math.floor(i / 5)}.0.1`, t + i), "ma_sai");
  // nguồn đã sai trong khung (dưới 10 lượt) giờ bị chặn
  await loi(g.ghepMay(sai(ma, 500), "windows", "X", "10.0.0.1", t + 300), "ghep_tam_khoa");
  // nguồn mới: 1 lượt sai, lượt 2 chặn
  await loi(g.ghepMay(sai(ma, 501), "windows", "X", "10.251.0.1", t + 301), "ma_sai");
  await loi(g.ghepMay(sai(ma, 502), "windows", "X", "10.251.0.1", t + 302), "ghep_tam_khoa");
  // người dùng thật ở nguồn mới gõ đúng ngay: ghép được
  assert.ok((await g.ghepMay(ma, "windows", "PC Cu", "10.250.0.1", t + 303)).token);
  // khung mới: nguồn cũ lại có 10 lượt
  const ma2 = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Cu2" }), "windows");
  await chiConMa(ma2);
  for (let i = 0; i < 3; i++) await loi(g.ghepMay(sai(ma2, i), "windows", "X", "10.251.0.1", t + 15 * 60_000 + i), "ma_sai");
});

test("lượt bị chặn không cộng vào tổng; ghép đúng / mã đã dùng không tính", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const { fam } = await taoNha();
  const ma = await g.taoMaGhep(fam, await g.taoCon(fam, { ten: "Do" }), "windows");
  await chiConMa(ma);
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

test("API POST /api/may/ghep: đang bị dò, nguồn đã sai 1 lần ⇒ 429 ghep_tam_khoa", async () => {
  await q(`delete from pin_sai where khoa like 'ghep%'`);
  const k = Math.floor(Date.now() / 900_000);
  for (const kk of [k, k + 1])
    await q(`insert into pin_sai(khoa, so_lan) values ($1, $2), ($3, 1)`, [`ghep_tong:${kk}`, g.GHEP_SAI_TONG, `ghep:203.0.113.9:${kk}`]);
  const r = await xuLyMay(new Request("http://x/api/may/ghep", {
    method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.9" },
    body: JSON.stringify({ ma: "123456", nen: "windows", tenMay: "X" }),
  }), ["ghep"]);
  assert.equal(r.status, 429);
  assert.equal((await r.json() as { error?: string }).error, "ghep_tam_khoa");
});
