// Lớp DB mỏng: Postgres thật khi có DATABASE_URL, không thì PGlite (Postgres chạy trong tiến trình, lưu ở .data/pg).
// Chỉ dùng SQL tham số $1, $2… — cùng một câu chạy được trên cả hai.
// Ghi cột jsonb luôn bằng `$n::text::jsonb` + JSON.stringify: postgres.js qua pooler Neon biết kiểu jsonb và bọc chuỗi lần nữa.
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { SCHEMA, SCHEMA_APP_WEB, SCHEMA_M4B, SCHEMA_M5, SCHEMA_S2, SCHEMA_S3, SCHEMA_SAO, SCHEMA_TV_TB } from "./schema.ts";
import { napHeThong } from "./he-thong.ts";

export type Row = Record<string, any>;
export type Q = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

/** LISTEN một kênh Postgres. `khiNghe` gọi mỗi lần (re)LISTEN xong — postgres.js tự nối lại kết nối nghe; báo rơi trong lúc rớt mạng thì mất ⇒ bên dùng tự đọc lại DB. */
export type Nghe = (kenh: string, khiBao: (payload: string) => void, khiNghe?: () => void) => Promise<void>;
type Db = { q: Q; tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>; nghe: Nghe };

const BAM_LUOC_DO = createHash("sha256").update([SCHEMA, SCHEMA_M5, ...SCHEMA_M4B, ...SCHEMA_TV_TB, ...SCHEMA_S2, ...SCHEMA_S3, ...SCHEMA_SAO, ...SCHEMA_APP_WEB].join("\n;\n")).digest("hex").slice(0, 16);

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
      for (const c of [...SCHEMA_TV_TB, ...SCHEMA_S2, ...SCHEMA_S3, ...SCHEMA_SAO, ...SCHEMA_APP_WEB]) await sql.unsafe(c);      // S2 (L4–L8) sửa loi_moi ⇒ bảng thành viên phải có trước
      await sql.unsafe(`create table if not exists _luoc_do (id int primary key, bam text not null, luc timestamptz not null default now());
        insert into _luoc_do(id, bam) values (1, '${BAM_LUOC_DO}') on conflict (id) do update set bam = excluded.bam, luc = now()`);
    }
    napHeThong(await q(`select khoa, gia_tri from he_thong`));
    return {
      q,
      tx: (fn) => sql.begin((t) => fn(async (s, p = []) => (await t.unsafe(s, p as any[])) as any)) as any,
      // postgres.js giữ MỘT kết nối riêng cho mọi LISTEN (ngoài hồ max 5), tự nối lại rồi gọi lại khiNghe
      nghe: async (kenh, khiBao, khiNghe) => { await sql.listen(kenh, khiBao, khiNghe); },
    };
  }
  // Vercel/serverless không có đĩa bền: thiếu DATABASE_URL thì báo rõ, đừng lặng lẽ ghi vào thư mục tạm rồi mất dữ liệu.
  if (process.env.VERCEL || process.env.AIIGROW_BAT_BUOC_DB === "1") throw new Error("Thiếu DATABASE_URL — prod (Vercel/VPS) phải dùng Postgres thật (Neon/Supabase…)");
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || (process.env.NODE_ENV === "test" ? undefined : ".data/pg");
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const pg = dir ? new PGlite(dir) : new PGlite();
  await pg.exec(SCHEMA);
  await pg.exec(SCHEMA_M5);
  for (const c of SCHEMA_M4B) await pg.exec(c);
  for (const c of [...SCHEMA_TV_TB, ...SCHEMA_S2, ...SCHEMA_S3, ...SCHEMA_SAO, ...SCHEMA_APP_WEB]) await pg.exec(c);
  const q: Q = async (s, p = []) => (await pg.query(s, p as any[])).rows as any;
  napHeThong(await q(`select khoa, gia_tri from he_thong`));
  return {
    q,
    tx: (fn) => pg.transaction((t) => fn(async (s, p = []) => (await t.query(s, p as any[])).rows as any)),
    nghe: async (kenh, khiBao, khiNghe) => { await pg.listen(kenh, khiBao); khiNghe?.(); },
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
// Bộ nhớ đệm TRONG MỘT YÊU CẦU (api-may dong-bo / nhip bọc bằng `trongYeuCau`): câu `select` giống hệt (cùng SQL + tham số) chỉ chạy một lần,
// lần sau trả bản sao. Câu đọc MỘT BẢNG THEO ID (`select tz, cau_hinh from families where id = $1`) được quy về một câu `select * … where id = $1`
// rồi chọn cột ở bộ nhớ ⇒ mọi nơi đọc cột khác nhau của cùng một hàng chỉ tốn một vòng tới DB. Câu ghi xoá các mục đệm có nhắc tới bảng bị ghi
// (không phân tích được ⇒ xoá hết); giao dịch xoá hết trước và sau ⇒ đọc sau ghi luôn thấy dữ liệu mới. Ngoài `trongYeuCau` không có gì đổi.
// Khoá `for update` / hàm có tác dụng phụ không bao giờ vào đệm.
type DemYeuCau = { cache: Map<string, { sql: string; kq: Promise<Row[]> }> };
const als = new AsyncLocalStorage<DemYeuCau>();
/** Đang trong `trongYeuCau` (có bộ nhớ đệm) — chỗ tách một câu JOIN thành các đọc theo id chỉ có lợi khi có đệm. */
export const coDemYeuCau = () => als.getStore() !== undefined;
export const trongYeuCau = <T>(fn: () => Promise<T>): Promise<T> => als.run({ cache: new Map() }, fn);
const DOC_DUOC_DEM = /^\s*select\b/i, CAM_DEM = /\bfor\s+(update|share|no\s+key)|nextval|setval|random\(|pg_advisory|clock_timestamp/i;
const THEO_ID = /^\s*select\s+([\w\s,*]+?)\s+from\s+(families|children|devices)\s+where\s+id\s*=\s*\$1\s*;?\s*$/i;
const GHI = /^\s*(?:insert\s+into|update)\s+(?:\w+\.)?(\w+)/i;   // delete (kéo theo cascade sang bảng khác) ⇒ xoá hết đệm
/** Thăm dò đếm câu SQL (chỉ test): đặt `globalThis.__aiigDemCau = []` rồi đọc lại. */
const dem = (s: string) => { (globalThis as unknown as { __aiigDemCau?: string[] }).__aiigDemCau?.push(s); };
function chonCot(rows: Row[], cot: string): Row[] | null {
  const ds = cot.split(",").map((x) => x.trim().split(/\s+as\s+/i).map((y) => y.trim()));
  if (ds.some((d) => !d[0] || d[0] === "*" || d.length > 2 || /\s/.test(d[0]) || (d[1] !== undefined && /\s/.test(d[1])))) return null;
  return rows.map((r) => Object.fromEntries(ds.map(([c, an]) => [an ?? c, r[c]])));
}
const xoaTheoBang = (st: DemYeuCau, bang: string) => {
  const re = new RegExp(`\\b${bang}\\b`, "i");
  for (const [k, v] of st.cache) if (re.test(v.sql)) st.cache.delete(k);
};
export const q: Q = async (s, p) => {
  const st = als.getStore();
  if (!st) { dem(s); return (await db()).q(s, p); }
  if (!DOC_DUOC_DEM.test(s) || CAM_DEM.test(s)) {
    const bang = GHI.exec(s)?.[1];
    if (bang) xoaTheoBang(st, bang); else st.cache.clear();
    dem(s);
    const r = await (await db()).q(s, p);
    if (bang) xoaTheoBang(st, bang); else st.cache.clear();
    return r;
  }
  const m = THEO_ID.exec(s);
  const sql = m ? `select * from ${m[2].toLowerCase()} where id = $1` : s;
  let key: string;
  try { key = sql + "\u0000" + JSON.stringify(p ?? []); } catch { dem(s); return (await db()).q(s, p); }
  let hit = st.cache.get(key);
  if (!hit) { dem(sql); hit = { sql, kq: db().then((d) => d.q(sql, p)) }; st.cache.set(key, hit); hit.kq.catch(() => st.cache.delete(key)); }
  const rows = await hit.kq;
  const ra = m ? chonCot(rows, m[1]) : rows;
  return structuredClone(ra ?? rows) as any;
};
export const tx = async <T>(fn: (q: Q) => Promise<T>) => {
  const st = als.getStore();
  st?.cache.clear();
  try { return await (await db()).tx((t) => { dem("tx"); return fn(async (s, p) => { dem(s); return t(s, p); }); }); } finally { st?.cache.clear(); }
};
export const nghe: Nghe = async (k, f, n) => (await db()).nghe(k, f, n);
export const one = async <T = Row>(s: string, p?: unknown[]) => (await q<T>(s, p))[0] as T | undefined;

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
