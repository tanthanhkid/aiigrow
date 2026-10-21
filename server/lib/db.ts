// Lớp DB mỏng: Postgres thật khi có DATABASE_URL, không thì PGlite (Postgres chạy trong tiến trình, lưu ở .data/pg).
// Chỉ dùng SQL tham số $1, $2… — cùng một câu chạy được trên cả hai.
// Ghi cột jsonb luôn bằng `$n::text::jsonb` + JSON.stringify: postgres.js qua pooler Neon biết kiểu jsonb và bọc chuỗi lần nữa.
import { SCHEMA } from "./schema.ts";

export type Row = Record<string, any>;
export type Q = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

type Db = { q: Q; tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T> };

const g = globalThis as unknown as { __aiigDb?: Promise<Db> };

async function mo(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false, onnotice: () => {} });
    const q: Q = async (s, p = []) => (await sql.unsafe(s, p as any[])) as any;
    await sql.unsafe(SCHEMA);
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
  const q: Q = async (s, p = []) => (await pg.query(s, p as any[])).rows as any;
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

export const q: Q = async (s, p) => (await db()).q(s, p);
export const tx = async <T>(fn: (q: Q) => Promise<T>) => (await db()).tx(fn);
export const one = async <T = Row>(s: string, p?: unknown[]) => (await q<T>(s, p))[0] as T | undefined;

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
