#!/usr/bin/env node
// Máy chủ cục bộ của bàn brainstorm: phục vụ web/, ảnh AiiGrow trong repo, và ghi biến thể đã ghim vào da-luu/.
// Chỉ nghe 127.0.0.1. KHÔNG ghi log nội dung yêu cầu; key Claude không bao giờ đi qua đây (trình duyệt gọi thẳng api.anthropic.com).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(GOC, '../..');
const WEB = path.join(GOC, 'web');
const DA_LUU = path.join(GOC, 'da-luu');
const THU_MUC = {
  '/assets/icon3d/': path.join(REPO, 'mobile/assets/icon3d'),
  '/assets/rob/': path.join(REPO, 'mobile/assets/linh-vat'),
  // asset thật của app gốc — dùng cho màn native dựng khớp ảnh chụp
  '/assets/win/fluent/': path.join(REPO, 'agent-win/src/AiiGrow.Tray/Assets/fluent'),
  '/assets/win/mascot/': path.join(REPO, 'agent-win/src/AiiGrow.Tray/Assets/mascot'),
  '/assets/mac/fluent/': path.join(REPO, 'agent-mac/Sources/AiiGrowTray/Fluent'),
  '/assets/mac/mascot/': path.join(REPO, 'agent-mac/Sources/AiiGrowTray/Mascot'),
  '/assets/android/': path.join(REPO, 'agent-android/app/src/main/res/drawable-nodpi'),
};
const TEP = {
  '/assets/logo.png': path.join(REPO, 'server/public/logo.png'),
  '/assets/clay-kit.css': path.join(WEB, 'kit/clay-kit.css'),
  '/vendor/html-to-image.js': path.join(GOC, 'node_modules/html-to-image/dist/html-to-image.js'),
};
const LOAI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
const ANH = /\.(png|webp)$/i;
// Lớp «ảnh thật» để đối chiếu: ảnh chụp trong thư mục thiết kế cạnh repo (chỉ vài thư mục con, chỉ ảnh).
const THIET_KE = process.env.BS_THIET_KE || path.join(process.env.HOME || '', 'OFFLINE_FILES/Code/aiigrow-thiet-ke');
const REF_DIR = new Set(['chinchu-ios', 'chinchu-ios/hieu-nang-2/sau', 'man-mac-2510', 'man-win-2510', 'man-android-2510', 'man-dienthoai-2510']);
const ANH_REF = /\.(png|jpe?g|webp)$/i;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' data: blob: https://api.anthropic.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "frame-src 'self' about: data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

let cong = Number(process.env.PORT) || 5178;

function gui(res, ma, kieu, noiDung, them = {}) {
  res.writeHead(ma, { 'Content-Type': kieu, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...them });
  res.end(noiDung);
}
const json = (res, ma, obj) => gui(res, ma, 'application/json; charset=utf-8', JSON.stringify(obj));

function guiTep(res, tep) {
  fs.readFile(tep, (loi, buf) => {
    if (loi) return gui(res, 404, 'text/plain; charset=utf-8', 'Không có');
    const kieu = LOAI[path.extname(tep).toLowerCase()] || 'application/octet-stream';
    gui(res, 200, kieu, buf, kieu.startsWith('text/html') ? { 'Content-Security-Policy': CSP } : {});
  });
}

// Đường dẫn an toàn: chỉ tên tệp trơn trong thư mục cho phép.
function trongThuMuc(thuMuc, ten) {
  if (!/^[\w.-]+$/.test(ten) || ten.startsWith('.')) return null;
  const p = path.join(thuMuc, ten);
  return p.startsWith(thuMuc + path.sep) ? p : null;
}

function docThan(req, gioiHan = 8 * 1024 * 1024) {
  return new Promise((ok, hong) => {
    let n = 0; const phan = [];
    let qua = false;
    req.on('data', (c) => { n += c.length; if (n > gioiHan) qua = true; else phan.push(c); });
    req.on('end', () => (qua ? hong(Object.assign(new Error('quá lớn'), { ma: 413 })) : ok(Buffer.concat(phan).toString('utf8'))));
    req.on('error', hong);
  });
}

function hopLeNguon(req) {
  const o = req.headers.origin;
  return o === `http://127.0.0.1:${cong}` || o === `http://localhost:${cong}`;
}

const tenTep = (s) => (s || 'bien-the').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bien-the';

const may = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);

    if (p === '/api/luu' && req.method === 'POST') {
      if (!hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { loi: 'Nguồn không hợp lệ' });
      let than;
      try { than = await docThan(req); } catch (e) { return json(res, e.ma || 400, { loi: e.ma === 413 ? 'Tệp quá lớn (>8 MB) — dùng Tải HTML' : 'Không đọc được yêu cầu' }); }
      const { ten, html } = JSON.parse(than);
      if (typeof html !== 'string' || !html.trim()) return json(res, 400, { loi: 'Thiếu HTML' });
      fs.mkdirSync(DA_LUU, { recursive: true });
      const d = new Date(); const pad = (x) => String(x).padStart(2, '0');
      const ma = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
      let tep;
      for (let i = 0; ; i++) {
        tep = path.join(DA_LUU, `${ma}-${tenTep(ten)}${i ? '-' + i : ''}.html`);
        try { fs.writeFileSync(tep, html, { flag: 'wx' }); break; } catch (e) { if (e.code !== 'EEXIST' || i > 50) throw e; }
      }
      return json(res, 200, { tep: path.relative(REPO, tep) });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return gui(res, 405, 'text/plain', 'Không hỗ trợ');

    if (p === '/api/assets') {
      const ds = (d) => { try { return fs.readdirSync(d).filter((f) => ANH.test(f)).sort(); } catch { return []; } };
      return json(res, 200, { icon3d: ds(THU_MUC['/assets/icon3d/']), rob: ds(THU_MUC['/assets/rob/']) });
    }
    if (TEP[p]) return guiTep(res, TEP[p]);
    if (p.startsWith('/ref/')) {
      // /ref/<thư mục>/<tệp> hoặc /ref/<thư mục>/<thư mục con>/<tệp> (vd. man-win-2510/100/app-hom-nay.png);
      // thư mục nhiều cấp có trong REF_DIR (vd. chinchu-ios/hieu-nang-2/sau) thì khớp nguyên cụm.
      const phan = p.slice(5).split('/'); const ten = phan.pop() || ''; const [thu, ...con] = phan;
      const tep = REF_DIR.has(phan.join('/')) ? trongThuMuc(path.join(THIET_KE, ...phan), ten)
        : con.length <= 1 && REF_DIR.has(thu) && con.every((c) => /^[\w.%-]+$/.test(c) && !c.startsWith('.')) ? trongThuMuc(path.join(THIET_KE, thu, ...con), ten) : null;
      return tep && ANH_REF.test(tep) ? guiTep(res, tep) : gui(res, 404, 'text/plain', 'Không có');
    }
    for (const [tienTo, thuMuc] of Object.entries(THU_MUC)) {
      if (p.startsWith(tienTo)) {
        const tep = trongThuMuc(thuMuc, p.slice(tienTo.length));
        return tep && ANH.test(tep) ? guiTep(res, tep) : gui(res, 404, 'text/plain', 'Không có');
      }
    }
    const ten = p === '/' ? 'index.html' : p.slice(1);
    const tep = path.resolve(WEB, ten);
    if (!tep.startsWith(WEB + path.sep)) return gui(res, 404, 'text/plain', 'Không có');
    return guiTep(res, tep);
  } catch {
    // Không in nội dung yêu cầu ra log.
    return json(res, 500, { loi: 'Lỗi máy chủ cục bộ' });
  }
});

may.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && cong < (Number(process.env.PORT) || 5178) + 20) { cong += 1; may.listen(cong, '127.0.0.1'); return; }
  console.error('Không mở được máy chủ:', e.message); process.exit(1);
});
may.on('listening', () => {
  if (!fs.existsSync(TEP['/vendor/html-to-image.js'])) console.warn('! Chưa có node_modules/html-to-image — chạy `npm install` để xuất PNG.');
  console.log(`\n  Bàn brainstorm AiiGrow đang chạy:  http://127.0.0.1:${cong}/\n  (thử không cần key: http://127.0.0.1:${cong}/?mock=1)  ·  Ctrl+C để tắt\n`);
});
may.listen(cong, '127.0.0.1');
