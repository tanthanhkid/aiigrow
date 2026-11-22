// #557: trần số câu SQL của dong-bo / nhip lúc máy rảnh (mỗi câu = một vòng mạng tới Neon). Trước: 28 câu mỗi lượt. Hạ thêm = hạ trần ở đây.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoNha, luonChoiDuoc } = await import("./test-fixtures/nha.ts");

const goi = async (tok: string, duong: string, body: unknown) => {
  const r = await xuLyMay(new Request(`http://x/api/device/${duong}`, { method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }), duong.split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const dem = async <T>(fn: () => Promise<T>) => {
  const ds: string[] = [];
  (globalThis as any).__aiigDemCau = ds;
  try { const kq = await fn(); return { kq, n: ds.length, ds }; } finally { delete (globalThis as any).__aiigDemCau; }
};

async function nhaWin() {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Mi" });
  await luonChoiDuoc(con);
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Mi");
  return { fam, con, tok: r.token };
}

test("nhịp rảnh Windows: ≤ 15 câu SQL (trước 28)", async () => {
  const { tok } = await nhaWin();
  await goi(tok, "nhip", {});
  const { kq, n, ds } = await dem(() => goi(tok, "nhip", {}));
  assert.equal(kq.status, 200);
  assert.ok(n <= 15, `nhip ${n} câu:\n${ds.join("\n")}`);
});

test("dong-bo rảnh Windows: ≤ 14 câu SQL (trước 28)", async () => {
  const { tok } = await nhaWin();
  await goi(tok, "dong-bo", { status: {}, usage: [] });
  const { kq, n, ds } = await dem(() => goi(tok, "dong-bo", { status: {}, usage: [] }));
  assert.equal(kq.status, 200);
  assert.ok(n <= 14, `dong-bo ${n} câu:\n${ds.join("\n")}`);
});

test("dong-bo có usage: số câu không tăng theo số app; usage ghi đúng, dòng trùng gộp", async () => {
  const { tok, con } = await nhaWin();
  const { q } = await import("./db.ts");
  const usage = [{ muc: "chrome.exe", phut: 3 }, { muc: "roblox.exe", phut: 4 }, { muc: "roblox.exe", phut: 6 }];
  const { kq, n } = await dem(() => goi(tok, "dong-bo", { status: {}, usage }));
  assert.equal(kq.status, 200);
  const rows = await q<{ muc: string; phut: number }>(`select muc, phut from usage where child_id = $1 order by muc`, [con]);
  assert.deepEqual(rows.map((x) => [x.muc, Number(x.phut)]), [["chrome.exe", 3], ["roblox.exe", 6]]);
  const nhieu = Array.from({ length: 8 }, (_, i) => ({ muc: `app${i}.exe`, phut: i + 1 }));
  const r2 = await dem(() => goi(tok, "dong-bo", { status: {}, usage: nhieu }));
  assert.ok(r2.n <= n + 1, `8 app ${r2.n} câu so với 3 dòng ${n} câu`);
});

test("bộ nhớ đệm yêu cầu: đọc sau ghi (cùng bảng, delete, giao dịch) luôn thấy dữ liệu mới; đọc lặp thì không tốn thêm câu", async () => {
  const { trongYeuCau, q, tx, one } = await import("./db.ts");
  const { fam } = await nhaWin();
  await trongYeuCau(async () => {
    const dem0 = async () => (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))!.tz;
    const a = await dem0();
    const { n } = await dem(async () => { await dem0(); await one(`select cau_hinh from families where id = $1`, [fam]); });
    assert.equal(n, 0, "đọc lặp cùng hàng không xuống DB");
    await q(`update families set tz = 'Asia/Tokyo' where id = $1`, [fam]);
    assert.equal(await dem0(), "Asia/Tokyo");
    await tx(async (t) => { await t(`update families set tz = $2 where id = $1`, [fam, a]); });
    assert.equal(await dem0(), a);
    // sửa kết quả trả về không làm bẩn đệm
    const h = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))!; h.tz = "x";
    assert.equal(await dem0(), a);
  });
});
