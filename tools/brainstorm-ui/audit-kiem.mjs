#!/usr/bin/env node
// Kiểm chuỗi băm của nhật ký audit bàn brainstorm: mọi dòng phải có p = sha256(dòng ngay trước) và i tăng đúng 1 (liền qua các ngày).
// Dùng: node tools/brainstorm-ui/audit-kiem.mjs [thư mục audit] [--blob]
//   mặc định: $BS_AUDIT hoặc $BS_THIET_KE/brainstorm-ui/audit (BS_THIET_KE mặc định ~/OFFLINE_FILES/Code/aiigrow-thiet-ke)
//   --blob: kiểm thêm mọi blob được tham chiếu có tồn tại và đúng băm.
// Thoát 0 = chuỗi nguyên vẹn; 1 = đứt chuỗi / dòng hỏng / thiếu blob (in tệp:dòng đầu tiên sai).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { sha, P0, dsTep, thuMucAudit } from './audit.mjs';

const thamSo = process.argv.slice(2);
const kiemBlob = thamSo.includes('--blob');
const DIR = thamSo.find((x) => !x.startsWith('--')) || thuMucAudit(process.env.BS_THIET_KE || path.join(process.env.HOME || '', 'OFFLINE_FILES/Code/aiigrow-thiet-ke'));
const tep = dsTep(DIR);
if (!tep.length) { console.log(`Chưa có nhật ký audit ở ${DIR}`); process.exit(0); }

let truoc = P0, iTruoc = 0, tong = 0; const loi = []; const blob = new Set();
const gomBlob = (v) => { if (!v || typeof v !== 'object') return; if (typeof v.$blob === 'string') blob.add(v.$blob); for (const x of Object.values(v)) gomBlob(x); };
for (const t of tep) {
  const noi = fs.readFileSync(path.join(DIR, t), 'utf8');
  if (noi && !noi.endsWith('\n')) loi.push(`${t}: dòng cuối không trọn (ghi dở?)`);
  const dong = noi.split('\n'); if (dong.at(-1) === '') dong.pop();
  dong.forEach((d, k) => {
    const cho = `${t}:${k + 1}`;
    let e; try { e = JSON.parse(d); } catch { loi.push(`${cho}: không phải JSON`); truoc = sha(d); iTruoc += 1; return; }
    if (e.p !== truoc) loi.push(`${cho}: ĐỨT CHUỖI — p không khớp băm dòng trước (dòng trước hoặc dòng này đã bị sửa/xoá/chèn)`);
    if (e.i !== iTruoc + 1) loi.push(`${cho}: số thứ tự ${e.i}, đáng lẽ ${iTruoc + 1} (mất hoặc chèn dòng)`);
    if (t.slice(0, 10) !== String(e.t || '').slice(0, 10) && Math.abs(Date.parse(e.t) - Date.parse(`${t.slice(0, 10)}T12:00:00`)) > 36 * 3600e3) loi.push(`${cho}: thời gian ${e.t} không thuộc ngày của tệp`);
    if (kiemBlob) { gomBlob(e.truoc); gomBlob(e.sau); }
    truoc = sha(d); iTruoc = Number.isInteger(e.i) ? e.i : iTruoc + 1; tong += 1;
  });
}
if (kiemBlob) {
  for (const h of blob) {
    const f = path.join(DIR, 'blob', `${h}.html.gz`);
    let ok = false; try { ok = sha(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8')) === h; } catch { ok = false; }
    if (!ok) loi.push(`blob ${h}: thiếu hoặc sai băm`);
  }
}
if (loi.length) {
  console.error(`✗ Audit KHÔNG nguyên vẹn (${loi.length} lỗi, ${tong} dòng trong ${tep.length} tệp ở ${DIR}):`);
  for (const x of loi.slice(0, 50)) console.error(`  - ${x}`);
  if (loi.length > 50) console.error(`  … và ${loi.length - 50} lỗi nữa`);
  process.exit(1);
}
console.log(`✓ Chuỗi băm nguyên vẹn: ${tong} sự kiện, ${tep.length} tệp (${tep[0].slice(0, 10)} → ${tep.at(-1).slice(0, 10)})${kiemBlob ? `, ${blob.size} blob đúng băm` : ''} — ${DIR}`);
console.log(`  băm dòng cuối: ${truoc}`);
