#!/usr/bin/env node
// Dựng thư mục tệp tĩnh cf/dist cho Worker (chạy trước `wrangler deploy`, xem README «Bản Cloudflare»):
//   web/ (trừ _cu) · ảnh asset của app trong repo (đúng các tiền tố THU_MUC của ung-dung.mjs) · /assets/logo.png · /assets/clay-kit.css ·
//   /vendor/html-to-image.js · ảnh «thật» CHỌN LỌC: chỉ những ảnh mà hành trình trỏ tới (trường anh) từ thư mục thiết kế (BS_THIET_KE) ·
//   /_cf/api-assets.json (thay cho GET /api/assets đọc thư mục).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CF = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(CF, '..');
const REPO = path.resolve(GOC, '../..');
const WEB = path.join(GOC, 'web');
const THIET_KE = process.env.BS_THIET_KE || path.join(process.env.HOME || '', 'OFFLINE_FILES/Code/aiigrow-thiet-ke');
const DIST = path.join(CF, 'dist');
const ANH = /\.(png|webp)$/i;
const THU_MUC = {
  'assets/icon3d': 'mobile/assets/icon3d', 'assets/rob': 'mobile/assets/linh-vat',
  'assets/win/fluent': 'agent-win/src/AiiGrow.Tray/Assets/fluent', 'assets/win/mascot': 'agent-win/src/AiiGrow.Tray/Assets/mascot',
  'assets/mac/fluent': 'agent-mac/Sources/AiiGrowTray/Fluent', 'assets/mac/mascot': 'agent-mac/Sources/AiiGrowTray/Mascot',
  'assets/android': 'agent-android/app/src/main/res/drawable-nodpi',
};
const TOI_DA_TEP = 25 * 1024 * 1024; // giới hạn một tệp của Workers Static Assets

fs.rmSync(DIST, { recursive: true, force: true });
let n = 0, co = 0;
function chep(tu, toi) {
  const st = fs.statSync(tu);
  if (st.size > TOI_DA_TEP) throw new Error(`Tệp quá 25 MB: ${tu}`);
  fs.mkdirSync(path.dirname(toi), { recursive: true }); fs.copyFileSync(tu, toi); n++; co += st.size;
}
function chepCay(tu, toi, loc = () => true) {
  for (const e of fs.readdirSync(tu, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === '_cu') continue;
    const a = path.join(tu, e.name), b = path.join(toi, e.name);
    if (e.isDirectory()) chepCay(a, b, loc); else if (loc(e.name)) chep(a, b);
  }
}
chepCay(WEB, DIST);
const ds = {};
for (const [dich, nguon] of Object.entries(THU_MUC)) {
  const tu = path.join(REPO, nguon); let ten = [];
  try { ten = fs.readdirSync(tu).filter((f) => ANH.test(f)).sort(); } catch { /* không có */ }
  for (const f of ten) chep(path.join(tu, f), path.join(DIST, dich, f));
  if (dich === 'assets/icon3d') ds.icon3d = ten; if (dich === 'assets/rob') ds.rob = ten;
}
chep(path.join(REPO, 'server/public/logo.png'), path.join(DIST, 'assets/logo.png'));
chep(path.join(WEB, 'kit/clay-kit.css'), path.join(DIST, 'assets/clay-kit.css'));
chep(path.join(GOC, 'node_modules/html-to-image/dist/html-to-image.js'), path.join(DIST, 'vendor/html-to-image.js'));
fs.mkdirSync(path.join(DIST, '_cf'), { recursive: true });
fs.writeFileSync(path.join(DIST, '_cf/api-assets.json'), JSON.stringify(ds));

// ảnh «thật»: đúng những ảnh hành trình dùng (giống app.js: /ref/<m.anh>)
const { taiHanhTrinh } = await import('../web/hanh-trinh/index.js');
const { ds: ht } = await taiHanhTrinh(async (u) => { const s = fs.readFileSync(path.join(WEB, String(u).replace(/^\/+/, '')), 'utf8'); return { ok: true, json: async () => JSON.parse(s), text: async () => s }; });
const anh = new Set(ht.flatMap((h) => h.buoc.map((b) => b.anh).filter(Boolean)));
let thieu = 0;
for (const a of anh) {
  if (!/^[\w./%-]+$/.test(a) || a.includes('..')) continue;
  const tu = path.join(THIET_KE, decodeURIComponent(a));
  if (!fs.existsSync(tu)) { thieu++; continue; }
  chep(tu, path.join(DIST, 'ref', decodeURIComponent(a)));
}
console.log(`cf/dist: ${n} tệp, ${(co / 1048576).toFixed(1)} MB · ảnh thật ${anh.size - thieu}/${anh.size}${thieu ? ` (thiếu ${thieu})` : ''}`);
