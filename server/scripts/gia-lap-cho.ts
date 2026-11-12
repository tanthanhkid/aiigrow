// Giả lập N máy Con cùng giữ long-poll /api/device/cho-thay-doi (đo cách A, 12/11).
// Chạy: DATABASE_URL=postgres://… BASE=http://127.0.0.1:3310 N=1000 GIAY=30 [SERVER_PID=…] node --import ./lib/test-fixtures/next-esm.mjs scripts/gia-lap-cho.ts
// Đo: (1) lúc yên — số giao dịch DB / giây, RAM máy chủ, số lần quá tải; (2) Ba Mẹ bấm «Khoá ngay» (qua API thật) ở 50 nhà — thời gian máy nhận.
// Nhà thử tạo mới mỗi lần chạy (tên «Nhà Giả lập …»). KHÔNG chạy trên prod.
import { execSync } from "node:child_process";

const BASE = process.env.BASE || "http://127.0.0.1:3310";
const N = Number(process.env.N || 1000);
const GIAY = Number(process.env.GIAY || 30);
const SO_KHOA = Number(process.env.SO_KHOA || 50);
if (!process.env.DATABASE_URL) throw new Error("cần DATABASE_URL (Postgres thật, không phải prod)");

const { q, one } = await import("../lib/db.ts");
const g = await import("../lib/gia-dinh.ts");
const { taoPhien } = await import("../lib/auth.ts");
const { taoNha } = await import("../lib/test-fixtures/nha.ts");

type May = { fam: string; con: string; tok: string; bmTok: string; ver: number; cho?: (v: number) => void };
console.log(`tạo ${N} nhà thử…`);
const may: May[] = [];
for (let i = 0; i < N; i += 25) {
  may.push(...await Promise.all(Array.from({ length: Math.min(25, N - i) }, async (_, j) => {
    const { fam, bm } = await taoNha(`Giả lập ${i + j}`);
    const con = await g.taoCon(fam, { ten: `Bé ${i + j}` });
    const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", `Máy giả ${i + j}`, `gia-lap-${Date.now()}-${i + j}`);
    return { fam, con, tok: ghep.token, bmTok: await taoPhien(bm), ver: 0 };
  })));
}

let dung = false, soTra = 0, soQuaTai = 0, soLoi = 0;
async function vong(m: May) {
  while (!dung) {
    try {
      const r = await fetch(`${BASE}/api/device/cho-thay-doi?ver=${m.ver}`, { headers: { authorization: `Bearer ${m.tok}` } });
      const b = await r.json() as { phienBanThayDoi: number; doi: boolean; quaTai?: boolean };
      soTra++;
      if (b.quaTai) { soQuaTai++; await new Promise((x) => setTimeout(x, 2000)); continue; }
      if (b.doi) m.cho?.(b.phienBanThayDoi);
      m.ver = b.phienBanThayDoi;
    } catch { soLoi++; await new Promise((x) => setTimeout(x, 1000)); }
  }
}

const xact = async () => Number((await one<{ n: string }>(`select xact_commit + xact_rollback as n from pg_stat_database where datname = current_database()`))!.n);
const ram = () => { const pid = process.env.SERVER_PID; if (!pid) return "?"; try { return Math.round(Number(execSync(`powershell -NoProfile -c "(Get-Process -Id ${pid}).WorkingSet64"`).toString().trim()) / 1048576) + " MB"; } catch { return "?"; } };

console.log(`mở ${N} long-poll…`);
const chay = may.map(vong);
await new Promise((x) => setTimeout(x, 5000));   // đợi mọi máy lấy mốc
const x0 = await xact(), t0 = Date.now(), ram0 = ram();
await new Promise((x) => setTimeout(x, GIAY * 1000));
const x1 = await xact(), dt = (Date.now() - t0) / 1000;
const ketQuaYen = { may: N, giay: Math.round(dt), giaoDichDbMoiGiay: Math.round((x1 - x0) / dt), ramMayChu: `${ram0} → ${ram()}`, quaTai: soQuaTai, loi: soLoi };
console.log("YÊN:", JSON.stringify(ketQuaYen));

// Ba Mẹ bấm «Khoá ngay» ở SO_KHOA nhà, qua API Ba Mẹ thật
const chon = may.filter((_, i) => i % Math.max(1, Math.floor(N / SO_KHOA)) === 0).slice(0, SO_KHOA);
const tre: number[] = [];
await Promise.all(chon.map(async (m) => {
  const nhan = new Promise<number>((xong) => { m.cho = () => xong(Date.now()); });
  const bd = Date.now();
  const r = await fetch(`${BASE}/api/m/con/${m.con}/khoa`, { method: "POST", headers: { authorization: `Bearer ${m.bmTok}`, "content-type": "application/json" }, body: JSON.stringify({ khoa: true }) });
  if (!r.ok) { soLoi++; return; }
  const het = await Promise.race([nhan, new Promise<number>((x) => setTimeout(() => x(-1), 30_000))]);
  if (het > 0) tre.push(het - bd);
}));
tre.sort((a, b) => a - b);
const pc = (p: number) => tre[Math.min(tre.length - 1, Math.floor(p * tre.length))];
console.log("KHOÁ:", JSON.stringify({ baMeBam: chon.length, mayNhan: tre.length, p50ms: pc(0.5), p95ms: pc(0.95), maxms: tre.at(-1) }));

dung = true;
await q(`select 1`);
console.log("xong — dừng các vòng (tối đa ~25 giây)");
await Promise.race([Promise.all(chay), new Promise((x) => setTimeout(x, 30_000))]);
process.exit(0);
