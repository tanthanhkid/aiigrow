#!/usr/bin/env node
// Máy chủ cục bộ của bàn brainstorm: phục vụ web/, ảnh AiiGrow trong repo, và kho phiên bản màn («Thay màn»).
// Chỉ nghe 127.0.0.1. KHÔNG ghi log nội dung yêu cầu; key Claude không bao giờ đi qua đây (trình duyệt gọi thẳng api.anthropic.com).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ganRealtime, phatPhong, dsPhong, dongPhong } from './realtime.mjs';
import { taoKhoBienThe } from './kho-bien-the.mjs';
import { taoReview } from './review.mjs';
import { taoAudit } from './audit.mjs';
import { taoMcp } from './mcp.mjs';
import * as CV from './cong-vao.mjs';

const GOC = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(GOC, '../..');
const WEB = path.join(GOC, 'web');
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
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.gif': 'image/gif' };
const ANH = /\.(png|webp)$/i;
// Lớp «ảnh thật» để đối chiếu: ảnh chụp trong thư mục thiết kế cạnh repo (chỉ vài thư mục con, chỉ ảnh).
const THIET_KE = process.env.BS_THIET_KE || path.join(process.env.HOME || '', 'OFFLINE_FILES/Code/aiigrow-thiet-ke');
const REF_DIR = new Set(['chinchu-ios', 'chinchu-ios/hieu-nang-2/sau', 'man-mac-2510', 'man-win-2510', 'man-android-2510', 'man-dienthoai-2510']);
const ANH_REF = /\.(png|jpe?g|webp)$/i;
// Phiên bản màn («Thay màn»): kho ngoài git, mỗi màn một thư mục <key>/ gồm manifest.json + vN.html. v0 = bản trong mã (không ghi ra kho).
const PHIEN_BAN = process.env.BS_PHIEN_BAN || path.join(THIET_KE, 'brainstorm-ui/phien-ban');
const PB_TOI_DA = 300;               // số phiên bản tối đa mỗi màn
const PB_CO = 6 * 1024 * 1024;       // cỡ tối đa một bản HTML
// Danh sách key màn có thật: lấy từ chính các tệp hành trình (cùng nguồn với trình duyệt) — key lạ bị từ chối, không bao giờ thành đường dẫn.
// Nạp MỘT lần từ chính web/hanh-trinh/index.js (cùng danh sách tệp với trình duyệt); lỗi thì thử lại sau 10 giây. Thêm màn mới ⇒ khởi động lại máy chủ.
let KEY_MAN = new Set(), HANH_TRINH = new Map(), keyLuc = 0, keyDu = false;
async function keyMan() {
  if (keyDu || Date.now() - keyLuc < 10000) return KEY_MAN;
  keyLuc = Date.now();
  try {
    const { taiHanhTrinh } = await import('./web/hanh-trinh/index.js');
    const { ds, loi } = await taiHanhTrinh(); // fetch('/that/ds.json') trong Node lỗi ⇒ bỏ qua, key không đổi
    keyDu = !loi.some((x) => /\.js/.test(x)); // có tệp hành trình nạp lỗi: 10 giây sau thử lại
    KEY_MAN = new Set(ds.flatMap((h) => h.buoc.map((b) => b.key)).filter((k) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(k)));
    HANH_TRINH = new Map(ds.filter((h) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(h.id)).map((h) => [h.id, { id: h.id, ten: String(h.ten || h.id), buoc: h.buoc.map((b) => b.key).filter((k) => KEY_MAN.has(k)) }]));
  } catch (e) { console.error('Không đọc được danh sách màn:', e.message); }
  return KEY_MAN;
}
// Khoá liên tiến trình theo màn (nhiều máy chủ từ nhiều worktree dùng chung kho): mkdir là thao tác nguyên tử.
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
async function khoaPb(key) {
  const k = path.join(PHIEN_BAN, `.khoa-${key}`);
  fs.mkdirSync(PHIEN_BAN, { recursive: true });
  for (let i = 0; i < 100; i++) {
    try { fs.mkdirSync(k); return () => { try { fs.rmdirSync(k); } catch { /* đã gỡ */ } }; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(k).mtimeMs > 10000) fs.rmdirSync(k); } catch { /* tiến trình khác vừa gỡ */ }
      await ngu(20);
    }
  }
  throw Object.assign(new Error('bận'), { ma: 503 });
}
const thuMucPb = (key) => path.join(PHIEN_BAN, key);
// Chưa có tệp ⇒ manifest rỗng; tệp có mà hỏng ⇒ báo lỗi (không bao giờ ghi đè lịch sử bằng manifest rỗng).
function docManifest(key) {
  let tho;
  try { tho = fs.readFileSync(path.join(thuMucPb(key), 'manifest.json'), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return { key, hien: 0, ds: [] }; throw e; }
  const m = JSON.parse(tho);
  if (!m || !Array.isArray(m.ds)) throw new Error(`manifest hỏng: ${key}`);
  return m;
}
function ghiAtomic(tep, noiDung) {
  const tam = `${tep}.${process.pid}.${Date.now()}.tam`;
  fs.writeFileSync(tam, noiDung); fs.renameSync(tam, tep);
}
const HOST_TIN = ['trycloudflare.com', 'phanmemtrinity.com', 'aiilab.vn', ...(process.env.BS_HOST || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)];
const chuNgan = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

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
// Nhật ký audit (append-only, chuỗi băm): ai — tên hiển thị, vai, mã /r/, IP thật (cf-connecting-ip chỉ tin khi đến từ cloudflared loopback), user-agent rút gọn.
// Không ghi mã chủ quản (header x-bs-chu-quan không bao giờ được chép), key Claude không đi qua máy chủ này.
const audit = taoAudit({ THIET_KE });
const uaNgan = (u) => String(u || '').replace(/\s+/g, ' ').replace(/\(KHTML, like Gecko\) ?/, '').slice(0, 120);
const REQ_MCP = new WeakSet(); // yêu cầu nội bộ do MCP dựng (mcp.mjs) — audit ghi nguon: 'mcp'
function aiCua(req, them = {}) {
  let ten = ''; try { ten = decodeURIComponent(String(req.headers['x-bs-nguoi'] || '')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 40); } catch { /* tên hỏng */ }
  return { ten, vai: them.vai || review.vaiCua(req), ip: review.ipCua(req), ua: uaNgan(req.headers['user-agent']), phien: chuNgan(String(req.headers['x-bs-phien'] || ''), 40) || undefined, cong, ...(REQ_MCP.has(req) ? { nguon: 'mcp' } : {}), ...them };
}
const khoBt = taoKhoBienThe({ THIET_KE, audit, ai: (...a) => aiCua(...a), hopLeNguon: (req) => hopLeNguon(req), json: (...a) => json(...a), docThan: (...a) => docThan(...a), ghiAtomic: (...a) => ghiAtomic(...a), phat: phatPhong });
const review = taoReview({ THIET_KE, audit, ai: (...a) => aiCua(...a), hanhTrinh: async () => { await keyMan(); return HANH_TRINH; }, hopLeNguon: (req) => hopLeNguon(req), json: (...a) => json(...a),
  docThan: (...a) => docThan(...a), ghiAtomic: (...a) => ghiAtomic(...a), ghiPhienBan: (...a) => ghiPhienBan(...a), phat: phatPhong, dsPhong, dongPhong });

function gui(res, ma, kieu, noiDung, them = {}) {
  res.writeHead(ma, { 'Content-Type': kieu, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...them });
  res.end(noiDung);
}
const json = (res, ma, obj) => gui(res, ma, 'application/json; charset=utf-8', JSON.stringify(obj));

// connect-src thêm ws(s):// đúng host đang truy cập (qua tunnel là host tunnel) cho lớp realtime.
const cspCho = (req) => { const h = req.headers.host || ''; return /^[\w.-]+(:\d+)?$/.test(h) ? CSP.replace("connect-src 'self'", `connect-src 'self' ws://${h} wss://${h}`) : CSP; };
function guiTep(res, tep, csp = CSP) {
  fs.readFile(tep, (loi, buf) => {
    if (loi) return gui(res, 404, 'text/plain; charset=utf-8', 'Không có');
    const kieu = LOAI[path.extname(tep).toLowerCase()] || 'application/octet-stream';
    gui(res, 200, kieu, buf, kieu.startsWith('text/html') ? { 'Content-Security-Policy': csp } : {});
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
  if (o === `http://127.0.0.1:${cong}` || o === `http://localhost:${cong}`) return true;
  // Qua tunnel (cloudflared giữ Host gốc): chấp nhận khi Origin trùng đúng Host của yêu cầu VÀ Host thuộc tên miền tin cậy
  // (chặn DNS rebinding: trang lạ trỏ tên miền của nó về 127.0.0.1 thì Host là tên miền lạ). Thêm tên miền bằng BS_HOST=a.com,b.vn.
  if (!o || !req.headers.host || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) return false;
  try {
    const u = new URL(o); if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.host !== req.headers.host) return false;
    return HOST_TIN.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch { return false; }
}


// MCP (Streamable HTTP, /mcp): mọi thao tác đi qua chính xuLyYeuCau bên dưới bằng yêu cầu nội bộ mang quyền của người gọi MCP.
const mcp = taoMcp({ xuLyYeuCau: (...a) => xuLyYeuCau(...a), cong: () => cong, WEB, THIET_KE, HOST_TIN, hopLeNguon: (req) => hopLeNguon(req),
  json: (...a) => json(...a), docThan: (...a) => docThan(...a), danhDau: (req) => REQ_MCP.add(req), kiemMaMcp: (req) => (String(review.cauHinh().maMcp || '').length >= 8 && coPhien(req)) || review.kiemMaMcp(req) });

// ---- Cổng mật khẩu chung (cong-vao.mjs): qua tên miền, MỌI đường (trang, /api, /ref, /assets, /r/, /ws) cần đăng nhập khi chu-quan.json có
// «matKhau» + «biMatPhien». 127.0.0.1 gõ thẳng vẫn vào. /mcp nhận Bearer <maMcp> hoặc cookie phiên. Cổng đứng TRƯỚC xuLyYeuCau
// (yêu cầu nội bộ do MCP dựng không đi qua đây — /mcp đã kiểm ở cửa).
// /mcp nhận cookie chỉ khi đã đặt maMcp (chưa đặt maMcp thì /mcp qua tên miền vẫn đóng như trước).
const coPhien = (req, cq = review.cauHinh()) => CV.phienHopLe(cq, CV.docCookie(req.headers.cookie));
const daVao = (req, cq = review.cauHinh()) => review.laNoiBo(req) || (!review.cauHinhHong() && !CV.congBat(cq)) || coPhien(req, cq);
let dauCong = null;
async function congVao(req, res) {
  let u; try { u = new URL(req.url, 'http://x'); } catch { u = new URL('http://x/'); }
  let p; try { p = decodeURIComponent(u.pathname); } catch { p = ''; }
  if (review.laNoiBo(req)) return p === CV.DUONG_DANG_NHAP ? (res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' }), res.end(), true) : false;
  review.damBaoBiMatPhien();
  const cq = review.cauHinh();
  // đổi mật khẩu / biMatPhien ⇒ cắt mọi kết nối realtime đang mở (nối lại phải qua cổng với cookie mới)
  const dau = `${cq.matKhau || ''}\u0000${cq.biMatPhien || ''}`;
  if (dauCong !== null && dau !== dauCong) for (const ph of dsPhong()) dongPhong(ph);
  dauCong = dau;
  // chu-quan.json hỏng: đóng cổng (trừ /mcp và trang chụp nội bộ — tự kiểm), không lặng lẽ mở cho mọi người
  if (review.cauHinhHong() && !(p === '/mcp' || p.startsWith('/__mcp/trang/'))) { gui(res, 503, 'text/plain; charset=utf-8', 'Cấu hình quyền (chu-quan.json) đang hỏng — chủ quản sửa tệp rồi tải lại trang.'); return true; }
  const trangDn = (ma, loi, tiep) => gui(res, ma, 'text/html; charset=utf-8', CV.trangDangNhap({ loi, tiep }), { 'Content-Security-Policy': CV.CSP_DANG_NHAP, 'X-Frame-Options': 'DENY' });
  if (p === CV.DUONG_DANG_XUAT) {
    if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) { gui(res, 403, 'text/plain', 'Không hỗ trợ'); return true; } // trang lạ không đăng xuất hộ được
    res.writeHead(302, { Location: CV.DUONG_DANG_NHAP, 'Set-Cookie': CV.cookieXoa(), 'Cache-Control': 'no-store' }); res.end(); return true; }
  if (p === CV.DUONG_PHIEN) { daVao(req, cq) ? json(res, 200, { ok: true }) : json(res, 401, { loi: 'Cần đăng nhập mật khẩu chung', canDangNhap: true }); return true; }
  if (p === CV.DUONG_DANG_NHAP) {
    if (!CV.congBat(cq)) { res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' }); res.end(); return true; }
    if (req.method === 'GET' || req.method === 'HEAD') { trangDn(200, '', u.searchParams.get('tiep')); return true; }
    if (req.method !== 'POST') { gui(res, 405, 'text/plain', 'Không hỗ trợ'); return true; }
    let f; try { f = new URLSearchParams(await docThan(req, 4096)); } catch { gui(res, 413, 'text/plain', 'Quá lớn'); return true; }
    const tiep = CV.tiepAnToan(f.get('tiep'));
    if (!review.kiemMatKhau(req, f.get('mat_khau') || '')) { trangDn(401, 'Mật khẩu chưa đúng (sai nhiều lần thì chờ 1 phút).', tiep); return true; }
    res.writeHead(303, { Location: tiep, 'Set-Cookie': CV.cookieDat(CV.taoGiaTriPhien(cq)), 'Cache-Control': 'no-store' }); res.end(); return true;
  }
  if (CV.duongMien(p) || daVao(req, cq)) return false;
  if (CV.muonTrang(req.method, req.headers.accept)) {
    res.writeHead(302, { Location: `${CV.DUONG_DANG_NHAP}?tiep=${encodeURIComponent(CV.tiepAnToan(req.url))}`, 'Cache-Control': 'no-store' }); res.end(); return true;
  }
  json(res, 401, { loi: 'Cần đăng nhập mật khẩu chung', canDangNhap: true }); return true;
}
const may = http.createServer(async (req, res) => {
  try { if (await congVao(req, res)) return; } catch { if (!res.headersSent) return json(res, 500, { loi: 'Lỗi máy chủ cục bộ' }); return; }
  return xuLyYeuCau(req, res);
});
async function xuLyYeuCau(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);

    if (p === '/mcp') return await mcp.xuLy(req, res);
    if (p.startsWith('/__mcp/trang/')) return mcp.trang(req, res, p.slice(13));

    if (p === '/api/phien-ban' || p.startsWith('/api/phien-ban/')) return await apiPhienBan(req, res, p);
    if (p === '/api/bien-the' || p.startsWith('/api/bien-the/')) {
      // khoaBang: qua tên miền, ghi kho biến thể (sinh/xoá/khôi phục) cũng cần mã chủ quản; đọc thì ai mở bàn cũng được
      if (req.method === 'POST' && review.khoaBang() && !review.laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true });
      return await khoBt.xuLy(req, res, p, url);
    }
    if (p === '/api/review' || p.startsWith('/api/review/')) return await review.xuLy(req, res, p);
    if (p === '/api/audit' || p.startsWith('/api/audit/')) return await apiAudit(req, res, p, url);
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
    // trang góp ý: /r/<mã 128 bit> — mã sai/thu hồi thì chính trang báo (qua API)
    if (/^\/r\/[a-f0-9]{32}\/?$/.test(p)) return guiTep(res, path.join(WEB, 'review.html'), cspCho(req));
    const ten = p === '/' ? 'index.html' : p.slice(1);
    const tep = path.resolve(WEB, ten);
    if (!tep.startsWith(WEB + path.sep)) return gui(res, 404, 'text/plain', 'Không có');
    return guiTep(res, tep, cspCho(req));
  } catch {
    // Không in nội dung yêu cầu ra log.
    if (!res.headersSent) return json(res, 500, { loi: 'Lỗi máy chủ cục bộ' });
    try { res.end(); } catch { /* đã đóng */ }
  }
}

// GET  /api/phien-ban              → { <key>: manifest } của mọi màn đã có phiên bản
// GET  /api/phien-ban/<key>/<v>     → { html } của bản v (v ≥ 1)
// POST /api/phien-ban/<key>         → thêm bản mới và đặt làm bản hiện: { html, w, h, yTuong, nhan, nguon, model } hoặc { tu: <v cũ> } (khôi phục; 0 = bản trong mã)
async function apiPhienBan(req, res, p) {
  const [, , , key, vChu, ...du] = p.split('/');
  if (!key) {
    if (req.method !== 'GET') return json(res, 405, { loi: 'Không hỗ trợ' });
    const keys = await keyMan(); const ra = {};
    let ds = []; try { ds = fs.readdirSync(PHIEN_BAN); } catch { /* chưa có kho */ }
    for (const k of ds) if (keys.has(k)) { try { const m = docManifest(k); if (m.ds.length) ra[k] = m; } catch { /* manifest hỏng: bỏ qua màn này */ } }
    return json(res, 200, ra);
  }
  if (du.length || !(await keyMan(key)).has(key)) return json(res, 404, { loi: 'Không có màn này' });
  if (req.method === 'GET') {
    const v = Number(vChu); let m; try { m = docManifest(key); } catch { return json(res, 500, { loi: 'Manifest phiên bản hỏng' }); }
    const muc = Number.isInteger(v) && v >= 1 ? m.ds.find((x) => x.v === v) : null;
    if (!muc || !muc.tep) return json(res, 404, { loi: 'Không có bản này' });
    try { return json(res, 200, { html: fs.readFileSync(path.join(thuMucPb(key), `v${muc.tep}.html`), 'utf8') }); } catch { return json(res, 404, { loi: 'Mất tệp bản này' }); }
  }
  if (req.method !== 'POST' || vChu) return json(res, 405, { loi: 'Không hỗ trợ' });
  if (!hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { loi: 'Nguồn không hợp lệ' });
  // chu-quan.json đặt khoaBang: true ⇒ qua tên miền, Thay màn/Khôi phục cũng cần mã chủ quản
  if (review.khoaBang() && !review.laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true });
  let than;
  try { than = JSON.parse(await docThan(req, PB_CO + 64 * 1024)); } catch (e) { return json(res, e.ma || 400, { loi: e.ma === 413 ? 'Bản HTML quá lớn' : 'Không đọc được yêu cầu' }); }
  if (than && than.nguon === 'de-xuat') than.nguon = ''; // «đề xuất góp ý» chỉ ghi qua review.mjs (không giả tác giả được)
  const [ma, obj] = await ghiPhienBan(key, than, null, aiCua(req));
  if (ma === 200) { // máy chủ báo mọi bàn (không dựa vào client phát qua realtime — phòng chỉ-xem không phát được)
    let ten = ''; try { ten = decodeURIComponent(String(req.headers['x-bs-nguoi'] || '')).slice(0, 40); } catch { /* bỏ qua */ }
    phatPhong('bang', { t: 'rv', loai: 'thay', key, ten, tu: String(req.headers['x-bs-phien'] || '').slice(0, 40) });
  }
  return json(res, ma, obj);
}
// Thêm một phiên bản (dùng chung cho Thay màn, Khôi phục và «Accept changes» của đề xuất góp ý) → [mã HTTP, manifest | lỗi]
async function ghiPhienBan(key, than, tin = null, ai = null, loaiAu = '') { // tin: trường tin cậy do review.mjs đặt (tác giả + liên kết góp ý); ai: người làm (audit)
  if (!(await keyMan()).has(key)) return [404, { loi: 'Không có màn này' }];
  let moKhoa;
  try { moKhoa = await khoaPb(key); } catch { return [503, { loi: 'Kho phiên bản đang bận — thử lại' }]; }
  try {
    let m; try { m = docManifest(key); } catch { return [500, { loi: 'Manifest phiên bản hỏng — sửa tay trong kho trước khi ghi tiếp' }]; }
    if (m.ds.length >= PB_TOI_DA) return [409, { loi: `Màn này đã có ${PB_TOI_DA} phiên bản` }];
    const v = (m.ds.at(-1)?.v || 0) + 1;
    const muc = { v, t: new Date().toISOString() };
    fs.mkdirSync(thuMucPb(key), { recursive: true });
    if (than && than.tu != null) { // khôi phục: bản mới trỏ về tệp của bản cũ (không chép, không xoá gì)
      const tu = than.tu; const cu = !Number.isInteger(tu) ? null : tu === 0 ? { v: 0 } : m.ds.find((x) => x.v === tu);
      if (!Number.isInteger(tu) || !cu) return [400, { loi: 'Không có bản để khôi phục' }];
      Object.assign(muc, { tu, tep: cu.tep || 0, w: cu.w, h: cu.h, nhan: `Khôi phục v${tu}`, yTuong: cu.yTuong || '', nguon: 'khoi-phuc', bt: cu.bt });
    } else {
      const html = than?.html;
      if (typeof html !== 'string' || !html.trim() || html.length > PB_CO) return [400, { loi: 'Thiếu HTML hoặc quá lớn' }];
      const w = Math.round(Number(than.w)), h = Math.round(Number(than.h));
      Object.assign(muc, { tep: v, w: w > 0 && w < 5000 ? w : undefined, h: h > 0 && h < 20000 ? h : undefined,
        nhan: chuNgan(than.nhan, 120), yTuong: chuNgan(than.yTuong, 600), nguon: chuNgan(than.nguon, 20), model: chuNgan(than.model, 60), bt: chuNgan(than.bt, 80) });
      // đề xuất góp ý được chấp nhận: ghi tác giả + liên kết góp ý/đề xuất (chỉ review.mjs đặt các trường này)
      if (tin) Object.assign(muc, { nguon: 'de-xuat', tacGia: chuNgan(tin.tacGia, 40), gy: chuNgan(tin.gy, 40), dx: chuNgan(tin.dx, 40), suaTiep: !!tin.suaTiep });
      ghiAtomic(path.join(thuMucPb(key), `v${v}.html`), html);
    }
    const hienCu = m.hien || 0;
    m.key = key; m.ds.push(muc); m.hien = v;
    ghiAtomic(path.join(thuMucPb(key), 'manifest.json'), JSON.stringify(m, null, 1));
    if (ai) { // trước = bản đang dùng (kèm HTML), sau = bản mới (kèm HTML) — HTML vào blob theo băm
      const banCua = (vv) => { const x = vv === 0 ? { v: 0, tep: 0 } : m.ds.find((y) => y.v === vv); if (!x) return null;
        let html = ''; if (x.tep) { try { html = fs.readFileSync(path.join(thuMucPb(key), `v${x.tep}.html`), 'utf8'); } catch { /* mất tệp */ } }
        return { ...x, ...(x.tep ? { html } : { trongMa: true }) }; };
      audit.ghi({ loai: loaiAu || (muc.nguon === 'khoi-phuc' ? 'man.khoi-phuc' : muc.nguon === 'de-xuat' ? 'man.de-xuat' : 'man.thay'), dt: { key, v }, ai, truoc: banCua(hienCu), sau: banCua(v) });
    }
    return [200, m];
  } finally { moKhoa(); }
}

// ---- Lịch sử thay đổi (audit) — CHỈ chủ quản; không có đường sửa/xoá audit.
// GET  /api/audit?tu=&den=&loai=&nguoi=&key=&ht=&id=&gioi=   → { ds, conNua } (mới nhất trước; nội dung lớn để dạng {$blob})
// GET  /api/audit/mo?ngay=&i=                                → { e, truoc, sau } đã dựng lại đủ HTML từ blob
// GET  /api/audit/xuat?tu=&den=&dang=csv|jsonl               → tệp tải về
// POST /api/audit/khoi-phuc { ngay, i, ben: 'truoc'|'sau' }  → ghi trạng thái đó thành thay đổi MỚI (biến thể/phương án/màn/góp ý)
async function apiAudit(req, res, p, url) {
  if (!review.laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true });
  const q = (k) => String(url.searchParams.get(k) || '');
  const ngay = (k) => (/^\d{4}-\d{2}-\d{2}$/.test(q(k)) ? q(k) : '');
  if (req.method === 'GET') {
    if (p === '/api/audit') {
      const ht = q('ht'); await keyMan();
      return json(res, 200, await audit.doc({ tu: ngay('tu'), den: ngay('den'), loai: q('loai').slice(0, 40), nguoi: q('nguoi').slice(0, 40), key: q('key').slice(0, 80), id: q('id').slice(0, 120),
        ht: ht.slice(0, 80), keysHt: ht && HANH_TRINH.get(ht) ? new Set(HANH_TRINH.get(ht).buoc) : null, gioi: Number(q('gioi')) || 300 }));
    }
    if (p === '/api/audit/mo') {
      const e = await audit.tim(ngay('ngay'), Number(q('i'))); if (!e) return json(res, 404, { loi: 'Không có sự kiện này' });
      const dung = (v) => { try { return { v: audit.mo(v) }; } catch (er) { return { loi: er.message }; } };
      const tr = dung(e.truoc), sa = dung(e.sau);
      return json(res, 200, { e, truoc: tr.v ?? null, sau: sa.v ?? null, loi: tr.loi || sa.loi || undefined });
    }
    if (p === '/api/audit/xuat') {
      const dang = q('dang') === 'jsonl' ? 'jsonl' : 'csv'; const tu = ngay('tu'), den = ngay('den');
      const ten = `audit-${tu || 'dau'}_${den || 'nay'}.${dang}`;
      return gui(res, 200, dang === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson; charset=utf-8', (dang === 'csv' ? '\ufeff' : '') + await audit.xuat(tu, den, dang), { 'Content-Disposition': `attachment; filename="${ten}"` });
    }
    return json(res, 404, { loi: 'Không có' });
  }
  if (req.method !== 'POST' || p !== '/api/audit/khoi-phuc') return json(res, 405, { loi: 'Không hỗ trợ' });
  if (!hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { loi: 'Nguồn không hợp lệ' });
  let t; try { t = JSON.parse(await docThan(req, 4096)); } catch { return json(res, 400, { loi: 'Không đọc được yêu cầu' }); }
  const e = await audit.tim(String(t?.ngay || ''), Number(t?.i)); if (!e) return json(res, 404, { loi: 'Không có sự kiện này' });
  const ben = t.ben === 'truoc' ? 'truoc' : 'sau';
  let st; try { st = audit.mo(e[ben]); } catch (er) { return json(res, 500, { loi: `Không dựng lại được: ${er.message}` }); }
  const nguon = `${e.ngay} #${e.i} (${ben === 'truoc' ? 'trước' : 'sau'} «${e.loai}»)`; const ai = aiCua(req);
  if (/^(bien-the|phuong-an)\./.test(e.loai)) {
    const r = khoBt.datLai(e.dt?.l, e.dt?.id, st, ai, nguon);
    return r.loi ? json(res, 409, { loi: r.loi }) : r.xungDot ? json(res, 409, { loi: 'Mục vừa bị sửa — thử lại' }) : json(res, 200, { ok: true, m: r.m });
  }
  if (/^man\./.test(e.loai)) {
    const key = e.dt?.key; if (!st) return json(res, 400, { loi: 'Không có trạng thái để khôi phục' });
    let m0; try { m0 = docManifest(key); } catch { return json(res, 500, { loi: 'Manifest phiên bản hỏng' }); }
    const con = st.v === 0 || st.trongMa ? { tu: 0 } : m0.ds.some((x) => x.v === st.v && x.tep === st.tep && fs.existsSync(path.join(thuMucPb(key), `v${x.tep}.html`))) ? { tu: st.v }
      : { html: st.html, w: st.w, h: st.h, nhan: `Khôi phục từ lịch sử ${nguon}`.slice(0, 120), yTuong: st.yTuong || '', nguon: 'lich-su' };
    const [ma, obj] = await ghiPhienBan(key, con, null, ai, 'man.khoi-phuc-lich-su');
    if (ma === 200) phatPhong('bang', { t: 'rv', loai: 'thay', key, ten: ai.ten, tu: '' });
    return json(res, ma, ma === 200 ? { ok: true, manifest: obj } : obj);
  }
  if (/^gop-y\./.test(e.loai)) {
    const r = await review.datGopY(e.dt?.ht, e.dt?.id, st, ai, nguon);
    return r.loi ? json(res, 409, { loi: r.loi }) : json(res, 200, { ok: true, m: r.m });
  }
  return json(res, 400, { loi: 'Loại sự kiện này không khôi phục được' });
}

may.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && cong < (Number(process.env.PORT) || 5178) + 20) { cong += 1; may.listen(cong, '127.0.0.1'); return; }
  console.error('Không mở được máy chủ:', e.message); process.exit(1);
});
may.on('listening', () => {
  if (!fs.existsSync(TEP['/vendor/html-to-image.js'])) console.warn('! Chưa có node_modules/html-to-image — chạy `npm install` để xuất PNG.');
  console.log(`\n  Bàn brainstorm AiiGrow đang chạy:  http://127.0.0.1:${cong}/\n  (thử không cần key: http://127.0.0.1:${cong}/?mock=1)  ·  Ctrl+C để tắt\n`);
});
// bàn chính khi khoaBang mà người nối không phải chủ quản: chỉ được con trỏ/nhìn/tên ('xem'), không phát thao tác
ganRealtime(may, (req) => hopLeNguon(req) && daVao(req), (ten, req) => (ten === 'bang' ? (review.khoaBang() && !review.laChuQuan(req) ? 'xem' : true) : /^r-[a-f0-9]{32}$/.test(ten) && review.conHieuLuc(ten.slice(2))));
may.listen(cong, '127.0.0.1');
