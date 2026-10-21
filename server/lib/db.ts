// Lớp DB mỏng: Postgres thật khi có DATABASE_URL, không thì PGlite (Postgres chạy trong tiến trình, lưu ở .data/pg).
// Chỉ dùng SQL tham số $1, $2… — cùng một câu chạy được trên cả hai.
// Ghi cột jsonb luôn bằng `$n::text::jsonb` + JSON.stringify: postgres.js qua pooler Neon biết kiểu jsonb và bọc chuỗi lần nữa.
import { createHash } from "node:crypto";
import { SCHEMA, SCHEMA_M4B, SCHEMA_M5 } from "./schema.ts";
import { napHeThong } from "./he-thong.ts";

export type Row = Record<string, any>;
export type Q = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

type Db = { q: Q; tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T> };

const BAM_LUOC_DO = createHash("sha256").update([SCHEMA, SCHEMA_M5, ...SCHEMA_M4B].join("\n;\n")).digest("hex").slice(0, 16);

const g = globalThis as unknown as { __aiigDb?: Promise<Db> };

async function mo(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false, onnotice: () => {} });
    const q: Q = async (s, p = []) => (await sql.unsafe(s, p as any[])) as any;
    // Lược đồ chỉ chạy khi mã băm đổi (deploy mới): mỗi lần khởi động lạnh trước đây chạy cả trăm câu DDL qua mạng tới Neon.
    const cu = await sql.unsafe(`select bam from _luoc_do where id = 1`).catch(() => [] as { bam: string }[]);
    if (cu[0]?.bam !== BAM_LUOC_DO) {
      await sql.unsafe(SCHEMA);
      await sql.unsafe(SCHEMA_M5);
      for (const c of SCHEMA_M4B) await sql.unsafe(c);
      await sql.unsafe(`create table if not exists _luoc_do (id int primary key, bam text not null, luc timestamptz not null default now());
        insert into _luoc_do(id, bam) values (1, '${BAM_LUOC_DO}') on conflict (id) do update set bam = excluded.bam, luc = now()`);
    }
    napHeThong(await q(`select khoa, gia_tri from he_thong`));
    return {
      q,
      tx: (fn) => sql.begin((t) => fn(async (s, p = []) => (await t.unsafe(s, p as any[])) as any)) as any,
    };
  }
  // Vercel/serverless không có đĩa bền: thiếu DATABASE_URL thì báo rõ, đừng lặng lẽ ghi vào thư mục tạm rồi mất dữ liệu.
  if (process.env.VERCEL) throw new Error("Thiếu DATABASE_URL — trên Vercel phải dùng Postgres thật (Neon/Supabase…)");
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || (process.env.NODE_ENV === "test" ? undefined : ".data/pg");
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const pg = dir ? new PGlite(dir) : new PGlite();
  await pg.exec(SCHEMA);
  await pg.exec(SCHEMA_M5);
  for (const c of SCHEMA_M4B) await pg.exec(c);
  const q: Q = async (s, p = []) => (await pg.query(s, p as any[])).rows as any;
  napHeThong(await q(`select khoa, gia_tri from he_thong`));
  return {
    q,
    tx: (fn) => pg.transaction((t) => fn(async (s, p = []) => (await t.query(s, p as any[])).rows as any)),
  };
}

function db() {
  g.__aiigDb ??= mo().catch((e) => {
    g.__aiigDb = undefined; // lần sau thử mở lại
    throw e;
  });
  return g.__aiigDb;
}

/** DB đã mở và đủ bảng (mọi lược đồ chạy trong mo()) — thay cho các hàm tạo bảng lười cũ. */
export const sanSang = async () => { await db(); };
export const q: Q = async (s, p) => (await db()).q(s, p);
export const tx = async <T>(fn: (q: Q) => Promise<T>) => (await db()).tx(fn);
export const one = async <T = Row>(s: string, p?: unknown[]) => (await q<T>(s, p))[0] as T | undefined;

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
