// Báo cáo tuần «Dùng nhiều nhất» + giờ học theo ngày (bm-bao-cao) và «Tự động duyệt hôm nay» (bm-cho-duyet).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const bc = await import("./bao-cao.ts");
const nv = await import("./nhiem-vu.ts");
const g = await import("./gia-dinh.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);

async function dung(con: string, ngay: string, muc: string, loai: string, phut: number, may = "may-1") {
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1, $2, $3, $4, $5, $6)`, [may, con, ngay, muc, loai, phut]);
}

test("báo cáo tuần: giờ học theo ngày, «Dùng nhiều nhất» gồm học + giải trí, % so tuần trước", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  // tuần trước (T2 12/10) và tuần này (T2 19/10)
  await dung(con, "2026-10-14", "roblox.exe", "giai_tri", 200);
  await dung(con, "2026-10-14", "aiirob", "hoc", 100);
  await dung(con, "2026-10-20", "roblox.exe", "giai_tri", 150);
  await dung(con, "2026-10-21", "aiirob", "hoc", 90);
  await dung(con, "2026-10-21", "aiirob", "hoc", 40, "may-2");
  await dung(con, "2026-10-21", "khanacademy.org", "hoc", 20);
  const r = await bc.baoCaoTuan(fam, con, VN("2026-10-22T10:00:00"));
  assert.deepEqual(r.tuanNay.hocTheoNgay.map((x) => x.phut), [0, 0, 130 + 20, 0, 0, 0, 0]);
  const top = r.tuanNay.dungNhieu;
  assert.equal(top[0].muc, "roblox.exe");
  assert.equal(top[0].lech, -25);
  assert.equal(top[1].muc, "aiirob");
  assert.equal(top[1].loai, "hoc");
  assert.equal(top[1].lech, 30);
  assert.equal(top.find((x) => x.muc === "khanacademy.org")!.lech, null, "mục mới tuần này không có %");
});

test("Chờ duyệt: «Tự động duyệt hôm nay» chỉ lượt AiiRob/tự duyệt hôm nay, đúng gia đình", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const khac = await taoNha();
  const conKhac = await g.taoCon(khac.fam, { ten: "Bin" });
  assert.ok(await nv.ketQuaAiiRob(con, { maBai: "PS-4", tenBai: "Phân số bài 4", diemSo: 92 }));
  assert.ok(await nv.ketQuaAiiRob(conKhac, { maBai: "PS-4", tenBai: "Phân số bài 4", diemSo: 95 }));
  const ds = await nv.tuDongHomNay(fam);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].ten_con, "Ken");
  assert.equal(ds[0].nguon, "aiirob");
  assert.equal((await nv.tuDongHomNay(fam, new Date(Date.now() + 2 * 86400_000))).length, 0, "ngày sau không còn trong «hôm nay»");
});
