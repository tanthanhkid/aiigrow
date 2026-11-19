// #433 B3 — thứ tự khoá: Con nộp (khoá Con → khoá lượt) và Ba Mẹ duyệt / hoàn tác duyệt cùng lúc không được deadlock.
// Cần Postgres THẬT nhiều kết nối (PGlite một kết nối không tái hiện được): đặt AIIGROW_TEST_PG_URL=postgres://… (CSDL thử riêng) — không đặt thì bỏ qua.
import { test } from "node:test";
import assert from "node:assert/strict";

const URL_PG = process.env.AIIGROW_TEST_PG_URL;
(process.env as Record<string, string>).NODE_ENV = "test";
if (URL_PG) process.env.DATABASE_URL = URL_PG; else delete process.env.DATABASE_URL;

const ngu = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Một giao dịch riêng giữ khoá theo thứ tự của `nop` (Con trước, lượt sau), chen giữa lúc `chay()` đang khoá. → lỗi của hai bên (null = ổn). */
async function chenKhoa(con: string, sub: string, chay: () => Promise<unknown>) {
  const { default: postgres } = await import("postgres");
  const sql = postgres(URL_PG!, { max: 1, onnotice: () => {} });
  let loiChen: unknown = null, loiChay: unknown = null;
  try {
    const ben = sql.begin(async (t) => {
      await t`select 1 from children where id = ${con} for update`;
      await ngu(300);                                             // để `chay()` kịp khoá phần của nó
      await t`select 1 from submissions where id = ${sub} for update`;
    }).catch((e) => { loiChen = e; });
    await ngu(50);
    await chay().catch((e) => { loiChay = e; });
    await ben;
  } finally { await sql.end(); }
  return { loiChen, loiChay };
}

test("B3: Con nộp và Ba Mẹ duyệt / hoàn tác cùng lúc ⇒ không deadlock (cùng thứ tự khoá Con → lượt)", { skip: !URL_PG && "cần AIIGROW_TEST_PG_URL" }, async () => {
  const nv = await import("./nhiem-vu.ts");
  const g = await import("./gia-dinh.ts");
  const { taoNha, anhGia } = await import("./test-fixtures/nha.ts");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Rửa chén", diem: 10, nhom: "viec_nha", bang_chung: "anh" });
  const s = await nv.batDau(con, t);
  await nv.nop(con, s, { anh: [anhGia(`dl-${s}`)] });
  const a = await chenKhoa(con, s, () => nv.duyet(fam, s, bm));
  assert.equal((a.loiChen as { code?: string } | null)?.code, undefined, String(a.loiChen));
  assert.equal(a.loiChay, null, String(a.loiChay));
  const b = await chenKhoa(con, s, () => nv.hoanTacDuyet(fam, s, bm));
  assert.equal((b.loiChen as { code?: string } | null)?.code, undefined, String(b.loiChen));
  assert.equal(b.loiChay, null, String(b.loiChay));
  process.exit(0);                                                // hồ kết nối postgres.js của db.ts giữ tiến trình
});
