// Lõi máy chủ của bàn brainstorm — dùng CHUNG cho bản Mac (server.mjs: http của Node + realtime.mjs) và bản Cloudflare
// (cf/worker.mjs: Durable Object, «node:fs» = SQLite của DO qua cf/fs-do.mjs, realtime = WebSocket của DO).
// O: { GOC, REPO, WEB, THIET_KE, cong(): số cổng (Mac), phatPhong, dsPhong, dongPhong (realtime), hostThem: [tên miền tin thêm],
//      coNoiBo: false (Cloudflare: không có «127.0.0.1 = chủ quản»), motTienTrinh: true (một DO duy nhất ghi kho: bỏ fs.watch/quét chéo tiến trình),
//      mcp: { móc riêng của nền tảng cho mcp.mjs — xem đó } }
// KHÔNG ghi log nội dung yêu cầu; key Claude không bao giờ đi qua đây (trình duyệt gọi thẳng api.anthropic.com).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { taoKhoBienThe } from './kho-bien-the.mjs';
import { taoReview } from './review.mjs';
import { taoAudit } from './audit.mjs';
import { taoMcp } from './mcp.mjs';
import * as CV from './cong-vao.mjs';

import { CSP, cspChoHost } from './csp.mjs';

export function taoUngDung(O = {}) {
  const cong = O.cong || (() => 0);
  const { phatPhong, dsPhong, dongPhong } = O;
  const CHI_DOC = O.chiDoc || process.env.BS_CHI_DOC || '';
  const GOC = O.GOC || path.dirname(fileURLToPath(import.meta.url));
  const REPO = O.REPO || path.resolve(GOC, '../..');
  const WEB = O.WEB || path.join(GOC, 'web');
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
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const ANH = /\.(png|webp)$/i;
  // Lớp «ảnh thật» để đối chiếu: ảnh chụp trong thư mục thiết kế cạnh repo (chỉ vài thư mục con, chỉ ảnh).
  const THIET_KE = O.THIET_KE || process.env.BS_THIET_KE || path.join(process.env.HOME || '', 'OFFLINE_FILES/Code/aiigrow-thiet-ke');
  const REF_DIR = new Set(['chinchu-ios', 'chinchu-ios/hieu-nang-2/sau', 'man-mac-2510', 'man-win-2510', 'man-android-2510', 'man-dienthoai-2510']);
  const ANH_REF = /\.(png|jpe?g|webp)$/i;
  // Phiên bản màn («Thay màn»): kho ngoài git, mỗi màn một thư mục <key>/ gồm manifest.json + vN.html. v0 = bản trong mã (không ghi ra kho).
  const PHIEN_BAN = process.env.BS_PHIEN_BAN || path.join(THIET_KE, 'brainstorm-ui/phien-ban');
  const PB_TOI_DA = 300;               // số phiên bản tối đa mỗi màn
  const PB_CO = 6 * 1024 * 1024;       // cỡ tối đa một bản HTML
  // Danh sách key màn có thật: lấy từ chính các tệp hành trình (cùng nguồn với trình duyệt) — key lạ bị từ chối, không bao giờ thành đường dẫn.
  // Nạp MỘT lần từ chính web/hanh-trinh/index.js (cùng danh sách tệp với trình duyệt); lỗi thì thử lại sau 10 giây. Thêm màn mới ⇒ khởi động lại máy chủ.
  let KEY_MAN = new Set(), HANH_TRINH = new Map(), TEN_MAN = new Map(), keyLuc = 0, keyDu = false;
  async function keyMan() {
    if (keyDu || Date.now() - keyLuc < 10000) return KEY_MAN;
    keyLuc = Date.now();
    try {
      const { taiHanhTrinh } = await import('./web/hanh-trinh/index.js');
      const { ds, loi } = await taiHanhTrinh(); // fetch('/that/ds.json') trong Node lỗi ⇒ bỏ qua, key không đổi
      keyDu = !loi.some((x) => /\.js/.test(x)); // có tệp hành trình nạp lỗi: 10 giây sau thử lại
      KEY_MAN = new Set(ds.flatMap((h) => h.buoc.map((b) => b.key)).filter((k) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(k)));
      TEN_MAN = new Map(ds.flatMap((h) => h.buoc.map((b) => [b.key, String(b.ten || b.key)])));
      HANH_TRINH = new Map(ds.filter((h) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(h.id)).map((h) => [h.id, { id: h.id, ten: String(h.ten || h.id), buoc: h.buoc.map((b) => b.key).filter((k) => KEY_MAN.has(k)) }]));
    } catch (e) { console.error('Không đọc được danh sách màn:', e.message); }
    return KEY_MAN;
  }
  // Khoá liên tiến trình theo màn (nhiều máy chủ từ nhiều worktree dùng chung kho): mkdir là thao tác nguyên tử.
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
  async function khoaPb(key, han = 10000) { // han: khoá cũ hơn chừng này coi như kẹt (tiến trình chết) — khoá «dung-chung» giữ lâu (lan tới 20 màn) nên dài hơn
    const k = path.join(PHIEN_BAN, `.khoa-${key}`);
    fs.mkdirSync(PHIEN_BAN, { recursive: true });
    const het = Date.now() + Math.min(han / 2, 60000); // chờ tối đa nửa ngưỡng kẹt (khoá màn: 5 s; khoá nhóm: 60 s)
    while (Date.now() < het) {
      try { fs.mkdirSync(k); return () => { try { fs.rmdirSync(k); } catch { /* đã gỡ */ } }; } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try { if (Date.now() - fs.statSync(k).mtimeMs > han) fs.rmdirSync(k); } catch { /* tiến trình khác vừa gỡ */ }
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
  const HOST_TIN = ['trycloudflare.com', 'phanmemtrinity.com', 'aiilab.vn', ...(O.hostThem || []), ...(process.env.BS_HOST || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)];
  const chuNgan = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');


  // Nhật ký audit (append-only, chuỗi băm): ai — tên hiển thị, vai, mã /r/, IP thật (cf-connecting-ip chỉ tin khi đến từ cloudflared loopback), user-agent rút gọn.
  // Không ghi mã chủ quản (header x-bs-chu-quan không bao giờ được chép), key Claude không đi qua máy chủ này.
  const audit = taoAudit({ THIET_KE });
  const uaNgan = (u) => String(u || '').replace(/\s+/g, ' ').replace(/\(KHTML, like Gecko\) ?/, '').slice(0, 120);
  const REQ_MCP = new WeakSet(); // yêu cầu nội bộ do MCP dựng (mcp.mjs) — audit ghi nguon: 'mcp'
  function aiCua(req, them = {}) {
    let ten = ''; try { ten = decodeURIComponent(String(req.headers['x-bs-nguoi'] || '')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 40); } catch { /* tên hỏng */ }
    return { ten, vai: them.vai || review.vaiCua(req), ip: review.ipCua(req), ua: uaNgan(req.headers['user-agent']), phien: chuNgan(String(req.headers['x-bs-phien'] || ''), 40) || undefined, cong: cong(), ...(REQ_MCP.has(req) ? { nguon: 'mcp' } : {}), ...them };
  }
  const khoBt = taoKhoBienThe({ THIET_KE, audit, ai: (...a) => aiCua(...a), hopLeNguon: (req) => hopLeNguon(req), json: (...a) => json(...a), docThan: (...a) => docThan(...a), ghiAtomic: (...a) => ghiAtomic(...a), phat: phatPhong, motTienTrinh: O.motTienTrinh });
  const review = taoReview({ THIET_KE, audit, coNoiBo: O.coNoiBo, ai: (...a) => aiCua(...a), hanhTrinh: async () => { await keyMan(); return HANH_TRINH; }, hopLeNguon: (req) => hopLeNguon(req), json: (...a) => json(...a),
    docThan: (...a) => docThan(...a), ghiAtomic: (...a) => ghiAtomic(...a), ghiPhienBan: (...a) => ghiPhienBan(...a), phat: phatPhong, dsPhong, dongPhong });

  function gui(res, ma, kieu, noiDung, them = {}) {
    res.writeHead(ma, { 'Content-Type': kieu, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...them });
    res.end(noiDung);
  }
  const json = (res, ma, obj) => gui(res, ma, 'application/json; charset=utf-8', JSON.stringify(obj));

  // connect-src thêm ws(s):// đúng host đang truy cập (qua tunnel là host tunnel) cho lớp realtime.
  const cspCho = (req) => cspChoHost(req.headers.host);
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
    if (O.coNoiBo !== false && (o === `http://127.0.0.1:${cong()}` || o === `http://localhost:${cong()}`)) return true;
    // Qua tunnel (cloudflared giữ Host gốc): chấp nhận khi Origin trùng đúng Host của yêu cầu VÀ Host thuộc tên miền tin cậy
    // (chặn DNS rebinding: trang lạ trỏ tên miền của nó về 127.0.0.1 thì Host là tên miền lạ). Thêm tên miền bằng BS_HOST=a.com,b.vn.
    if (!o || !req.headers.host || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) return false;
    try {
      const u = new URL(o); if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.host !== req.headers.host) return false;
      return HOST_TIN.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
    } catch { return false; }
  }


  // MCP (Streamable HTTP, /mcp): mọi thao tác đi qua chính xuLyYeuCau bên dưới bằng yêu cầu nội bộ mang quyền của người gọi MCP.
  const mcp = taoMcp({ xuLyYeuCau: (...a) => xuLyYeuCau(...a), cong, WEB, THIET_KE, HOST_TIN, ...(O.mcp || {}), hopLeNguon: (req) => hopLeNguon(req),
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
  async function xuLy(req, res) {
    try { if (await congVao(req, res)) return; } catch { if (!res.headersSent) return json(res, 500, { loi: 'Lỗi máy chủ cục bộ' }); return; }
    return xuLyYeuCau(req, res);
  }
  async function xuLyYeuCau(req, res) {
    try {
      const url = new URL(req.url, 'http://x');
      const p = decodeURIComponent(url.pathname);

      // BS_CHI_DOC (bản Mac sau khi chuyển lên Cloudflare): mọi ghi kho bị từ chối, đọc vẫn được — tránh hai nơi lệch nhau
      if (CHI_DOC && req.method !== 'GET' && req.method !== 'HEAD' && (p === '/api' || p.startsWith('/api/'))) return json(res, 423, { loi: `Bản này chỉ đọc — bàn đã chuyển lên ${CHI_DOC}` });
      if (p === '/mcp') return await mcp.xuLy(req, res);
      if (p.startsWith('/__mcp/trang/')) return mcp.trang(req, res, p.slice(13));

      if (p === '/api/phien-ban' || p.startsWith('/api/phien-ban/')) return await apiPhienBan(req, res, p);
      if (p === '/api/dung-chung' || p.startsWith('/api/dung-chung/')) return await apiDungChung(req, res, p);
      if (p === '/api/bien-the' || p.startsWith('/api/bien-the/')) {
        // khoaBang: qua tên miền, ghi kho biến thể (sinh/xoá/khôi phục) cũng cần mã chủ quản; đọc thì ai mở bàn cũng được
        if (req.method === 'POST' && review.khoaBang() && !review.laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true });
        return await khoBt.xuLy(req, res, p, url);
      }
      if (p === '/api/review' || p.startsWith('/api/review/')) return await review.xuLy(req, res, p);
      if (p === '/api/audit' || p.startsWith('/api/audit/')) return await apiAudit(req, res, p, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') return gui(res, 405, 'text/plain', 'Không hỗ trợ');

      if (p === '/api/assets') {
        if (O.dsAssets) return json(res, 200, await O.dsAssets()); // Cloudflare: danh sách dựng sẵn trong tệp tĩnh
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
      // dung-chung.json hỏng: vẫn trả phiên bản của mọi màn (không kèm nhóm) — chỉ thao tác ghi của màn bị chặn tới khi sửa tệp
      let dc; try { dc = docDc(); } catch { console.error('[phien-ban] dung-chung.json hỏng — trả manifest không kèm nhóm'); dc = { nhom: {} }; }
      for (const k of ds) if (keys.has(k)) { try { const m = docManifest(k); if (m.ds.length) ra[k] = kemDc(k, m, dc); } catch { /* manifest hỏng: bỏ qua màn này */ } }
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
    if (than && /^(xoa|khoi-phuc-xoa)$/.test(than.nguon)) than.nguon = ''; // chỉ đặt qua cờ xoa / khoiPhucXoa
    if (than && /^(dung-chung|tach)$/.test(than.nguon)) than.nguon = ''; // chỉ máy chủ đặt (lan nội dung chung / tách nhóm)
    // Xoá màn khỏi hành trình / khôi phục màn đã xoá — CHỈ chủ quản (kể cả khi không khoá bảng). Màn đang bị xoá: ghiPhienBan từ chối mọi ghi khác (trong khoá).
    if ((than?.xoa === true || than?.khoiPhucXoa === true) && !review.laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true });
    if (than && 'lop' in than && than.lop != null && !lopHopLe(than.lop, await keyMan())) return json(res, 400, { loi: 'Lớp liên kết không hợp lệ' });
    const [ma, obj] = await ghiPhienBan(key, than, null, aiCua(req));
    let btXoa = null;
    if (ma === 200) { // máy chủ báo mọi bàn (không dựa vào client phát qua realtime — phòng chỉ-xem không phát được)
      let ten = ''; try { ten = decodeURIComponent(String(req.headers['x-bs-nguoi'] || '')).slice(0, 40); } catch { /* bỏ qua */ }
      const phien = String(req.headers['x-bs-phien'] || '').slice(0, 40);
      phatPhong('bang', { t: 'rv', loai: 'thay', key, ten, tu: phien });
      review.baoThayMan(key, { ten });
      // Thay màn bằng một biến thể (bt) ⇒ biến thể đó rời bàn, chỗ của nó để trống (Khôi phục/Xoá màn không có bt; thất bại thì không tới đây)
      const moi = obj.ds.find((x) => x.v === obj.hien); // chỉ nhánh «HTML mới» ghi tệp riêng (tep === v); khôi phục/xoá màn trỏ tệp cũ
      if (moi && moi.tep === moi.v && typeof than.bt === 'string' && than.bt && moi.bt === than.bt) btXoa = khoBt.goSauThay(than.bt, { key, v: obj.hien, ai: aiCua(req), phien, nguoi: ten });
    }
    return json(res, ma, btXoa ? { ...obj, btXoa } : obj);
  }
  // Thêm một phiên bản (dùng chung cho Thay màn, Khôi phục và «Accept changes» của đề xuất góp ý) → [mã HTTP, manifest | lỗi]
  // Màn đang DÙNG CHUNG (dung-chung.json): đổi nội dung ⇒ cùng lượt ghi bản đó sang mọi màn cùng nhóm (giữ khoá nhóm suốt lượt; thứ tự khoá: dung-chung → màn).
  async function ghiPhienBan(key, than, tin = null, ai = null, loaiAu = '') { // tin: trường tin cậy do review.mjs đặt (tác giả + liên kết góp ý); ai: người làm (audit)
    if (!(await keyMan()).has(key)) return [404, { loi: 'Không có màn này' }];
    for (let lan = 0; lan < 3; lan++) {
      let dc; try { dc = docDc(); } catch { return [500, { loi: 'Tệp màn dùng chung (dung-chung.json) hỏng — sửa tay trước khi ghi tiếp' }]; }
      if (!nhomCua(dc, key)) {
        const r = await ghiPhienBan0(key, than, tin, ai, loaiAu, false);
        if (r[0] !== 'lai') return r[0] === 200 ? [200, kemDc(key, r[1])] : r;
        continue; // vừa được gộp vào nhóm trong lúc chờ khoá: ghi lại theo đường dùng chung
      }
      let mo; try { mo = await khoaPb('dung-chung', KHOA_DC); } catch { return [503, { loi: 'Kho phiên bản đang bận — thử lại' }]; }
      try { return await ghiDungChung(key, than, tin, ai, loaiAu); } finally { mo(); }
    }
    return [503, { loi: 'Kho phiên bản đang bận — thử lại' }];
  }
  async function ghiPhienBan0(key, than, tin, ai, loaiAu, trongDc, dtThem = null) {
    let moKhoa;
    try { moKhoa = await khoaPb(key); } catch { return [503, { loi: 'Kho phiên bản đang bận — thử lại' }]; }
    try {
      if (!trongDc && nhomCua(docDc(), key)) return ['lai'];
      let m; try { m = docManifest(key); } catch { return [500, { loi: 'Manifest phiên bản hỏng — sửa tay trong kho trước khi ghi tiếp' }]; }
      if (m.ds.length >= PB_TOI_DA) return [409, { loi: `Màn này đã có ${PB_TOI_DA} phiên bản` }];
      const v = (m.ds.at(-1)?.v || 0) + 1;
      const muc = { v, t: new Date().toISOString() };
      fs.mkdirSync(thuMucPb(key), { recursive: true });
      const cuoi = m.ds.find((x) => x.v === m.hien) || null; const dangXoa = !!cuoi?.xoa;
      if (than?.xoa === true || than?.khoiPhucXoa === true) { // xoá mềm / khôi phục: bản mới trỏ đúng tệp đang dùng, chỉ đổi cờ xoa (lịch sử giữ nguyên)
        if (than.xoa === true && dangXoa) return [409, { loi: 'Màn này đã bị xoá rồi' }];
        if (than.khoiPhucXoa === true && !dangXoa) return [409, { loi: 'Màn này không bị xoá' }];
        Object.assign(muc, { tep: cuoi?.tep || 0, w: cuoi?.w, h: cuoi?.h, bt: cuoi?.bt, yTuong: chuNgan(than.lyDo, 300),
          ...(than.xoa === true ? { xoa: true, nhan: 'Xoá màn khỏi hành trình', nguon: 'xoa' } : { nhan: 'Khôi phục màn đã xoá', nguon: 'khoi-phuc-xoa' }) });
      } else if (dangXoa) { // kể cả «Khôi phục vN»: phải «Khôi phục màn» trước (đúng loại audit, đúng quyền chủ quản)
        return [409, { loi: 'Màn đang bị xoá khỏi hành trình — khôi phục màn trước' }];
      } else if (than && than.tu != null) { // khôi phục: bản mới trỏ về tệp của bản cũ (không chép, không xoá gì)
        const tu = than.tu; const cu = !Number.isInteger(tu) ? null : tu === 0 ? { v: 0 } : m.ds.find((x) => x.v === tu);
        if (!Number.isInteger(tu) || !cu) return [400, { loi: 'Không có bản để khôi phục' }];
        Object.assign(muc, { tu, tep: cu.tep || 0, w: cu.w, h: cu.h, nhan: `Khôi phục v${tu}`, yTuong: cu.yTuong || '', nguon: 'khoi-phuc', bt: cu.bt });
      } else {
        const html = than?.html;
        if (Number.isInteger(than?.goc) && than.goc !== (m.hien || 0)) return [409, { loi: `Màn vừa có bản mới (v${m.hien}) — đã tải lại, thử lại`, lech: true }]; // sửa dựa trên bản cũ (vd. sửa liên kết) không đè bản mới hơn
        if (typeof html !== 'string' || !html.trim() || html.length > PB_CO) return [400, { loi: 'Thiếu HTML hoặc quá lớn' }];
        const w = Math.round(Number(than.w)), h = Math.round(Number(than.h));
        Object.assign(muc, { tep: v, w: w > 0 && w < 5000 ? w : undefined, h: h > 0 && h < 20000 ? h : undefined,
          nhan: chuNgan(than.nhan, 120), yTuong: chuNgan(than.yTuong, 600), nguon: chuNgan(than.nguon, 20), model: chuNgan(than.model, 60), bt: chuNgan(than.bt, 80) });
        // đề xuất góp ý được chấp nhận: ghi tác giả + liên kết góp ý/đề xuất (chỉ review.mjs đặt các trường này)
        if (tin) Object.assign(muc, { nguon: 'de-xuat', tacGia: chuNgan(tin.tacGia, 40), gy: chuNgan(tin.gy, 40), dx: chuNgan(tin.dx, 40), suaTiep: !!tin.suaTiep });
        if (dtThem?.dcTu) Object.assign(muc, { dcTu: dtThem.dcTu }); // bản lan sang từ màn cùng nhóm dùng chung
        ghiAtomic(path.join(thuMucPb(key), `v${v}.html`), html);
      }
      const hienCu = m.hien || 0;
      m.key = key; m.ds.push(muc); m.hien = v;
      ghiAtomic(path.join(thuMucPb(key), 'manifest.json'), JSON.stringify(m, null, 1));
      if (ai) { // trước = bản đang dùng (kèm HTML), sau = bản mới (kèm HTML) — HTML vào blob theo băm
        const banCua = (vv) => { const x = vv === 0 ? { v: 0, tep: 0 } : m.ds.find((y) => y.v === vv); if (!x) return null;
          let html = ''; if (x.tep) { try { html = fs.readFileSync(path.join(thuMucPb(key), `v${x.tep}.html`), 'utf8'); } catch { /* mất tệp */ } }
          return { ...x, ...(x.tep ? { html } : { trongMa: true }) }; };
        const LOAI = { 'khoi-phuc': 'man.khoi-phuc', 'de-xuat': 'man.de-xuat', xoa: 'man.xoa', 'khoi-phuc-xoa': 'man.khoi-phuc-xoa', 'lien-ket': 'man.lien-ket', 'dung-chung': 'man.dung-chung', tach: 'man.dung-chung' };
        audit.ghi({ loai: loaiAu || LOAI[muc.nguon] || 'man.thay', dt: { key, v, ...(dtThem?.au || {}) }, ai, truoc: banCua(hienCu), sau: banCua(v) });
      }
      return [200, m];
    } finally { moKhoa(); }
  }

  // ---- MÀN DÙNG CHUNG: nhiều màn ở các hành trình khác nhau dùng MỘT nội dung. Lưu ở <phien-ban>/dung-chung.json:
  //   { nhom: { <id>: { id, ds: [key…], lk: { <key>: lớp liên kết }, moi: { key, tep, w, h } (bản nội dung mới nhất), t, tao } } }
  // Nội dung: đổi ở một màn (Thay màn, Sửa, Khôi phục, Accept đề xuất, MCP, khôi phục từ audit) ⇒ ghiDungChung lan bản đó thành phiên bản mới
  //   của từng màn cùng nhóm (lịch sử phiên bản mỗi màn = lịch sử nội dung chung; màn đang bị xoá khỏi hành trình được bỏ qua và lấy bản mới nhất khi khôi phục).
  // Liên kết: data-toi KHÔNG đi theo nội dung — mỗi màn có «lớp liên kết» riêng (web/gan-toi.js layLop/apLop) áp lên lúc hiển thị (bàn, Play, /r/, MCP).
  //   Máy chủ không dựng DOM: lớp do trình duyệt (hoặc Chrome của MCP) tính và gửi lên.
  const TEP_DC = () => path.join(PHIEN_BAN, 'dung-chung.json');
  function docDc() {
    let tho; try { tho = fs.readFileSync(TEP_DC(), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return { nhom: {} }; throw e; }
    const j = JSON.parse(tho); if (!j || typeof j.nhom !== 'object' || Array.isArray(j.nhom)) throw new Error('dung-chung.json hỏng');
    return j;
  }
  function ghiDc(dc) { fs.mkdirSync(PHIEN_BAN, { recursive: true }); ghiAtomic(TEP_DC(), JSON.stringify(dc, null, 1)); }
  const nhomCua = (dc, key) => Object.values(dc.nhom).find((g) => Array.isArray(g.ds) && g.ds.includes(key)) || null;
  const tenMan = (k) => TEN_MAN.get(k) || k;
  // manifest gửi ra kèm thông tin nhóm của màn (client áp lớp liên kết «lop»; «t» đổi mỗi lần nhóm/lớp đổi ⇒ client biết mà tải lại)
  function kemDc(key, m, dc = null) {
    let d = dc; if (!d) { try { d = docDc(); } catch { return m; } }
    const g = nhomCua(d, key); if (!g) return m;
    return { ...m, dc: { id: g.id, ds: g.ds, lop: g.lk?.[key] || { tuDong: true }, t: g.t } };
  }
  function lopSach(lop, keys) { // → lớp đã chuẩn hoá, hoặc null nếu không hợp lệ
    if (!lop || typeof lop !== 'object') return null;
    if (lop.tuDong === true) return { tuDong: true };
    if (!Array.isArray(lop.ds) || lop.ds.length > 200) return null;
    const ds = []; let boQua = 0;
    for (const x of lop.ds) {
      if (!x || typeof x !== 'object' || typeof x.toi !== 'string' || typeof x.the !== 'string' || !/^[a-z][a-z0-9-]{0,30}$/.test(x.the)) return null;
      if (!keys.has(x.toi)) { boQua++; continue; } // đích không còn trong mã (liên kết hỏng): bỏ riêng mục đó, không từ chối cả lớp
      const n = Number.isInteger(x.n) && x.n >= 0 && x.n < 100000 ? x.n : 0; const o = Number.isInteger(x.o) && x.o >= -1 && x.o < 100000 ? x.o : -1;
      ds.push({ the: x.the, chu: chuNgan(x.chu, 60), n, o, toi: x.toi });
    }
    if (boQua && !ds.length) return null; // mọi mục đều trỏ tới màn không có (vd. gõ sai key) ⇒ từ chối, không lặng lẽ xoá sạch liên kết của luồng
    return { ds };
  }
  const lopHopLe = (lop, keys) => !!lopSach(lop, keys);
  const docTepPb = (key, tep) => { if (!tep) return null; try { return fs.readFileSync(path.join(thuMucPb(key), `v${tep}.html`), 'utf8'); } catch { return null; } };
  const hienCua = (m) => m.ds.find((x) => x.v === m.hien) || null;
  const daXoaKey = (k) => { try { return !!hienCua(docManifest(k))?.xoa; } catch { return false; } };
  const sao = (o) => JSON.parse(JSON.stringify(o));
  const KHOA_DC = 120000; // khoá nhóm dùng chung: coi là kẹt sau 2 phút (lượt lan tối đa 20 màn thường vài giây, không bị cướp giữa chừng); người chờ đợi tới 60 giây
  // nội dung chung lưu sang màn khác: bỏ liên kết của luồng nguồn (mỗi luồng áp lớp riêng khi vẽ) ⇒ đọc thẳng bản lưu (Lịch sử, sau khi tách) không mang nút của luồng khác
  const boLk = (h) => String(h).replace(/\sdata-(?:toi|lk-sua|lk-mat)(?:="[^"]*")?/g, '');
  function baoDoi(keys, ten, im = true) { for (const k of keys) { phatPhong('bang', { t: 'rv', loai: 'thay', key: k, ten, tu: '', ...(im ? { im: true } : {}) }); review.baoThayMan(k, { ten }); } }
  // (đang giữ khoá «dung-chung») ghi một phiên bản cho màn trong nhóm rồi lan nội dung sang các màn cùng nhóm
  async function ghiDungChung(key, than, tin, ai, loaiAu) {
    const dc = docDc(); const g = nhomCua(dc, key);
    if (!g) { const r = await ghiPhienBan0(key, than, tin, ai, loaiAu, true); return r[0] === 200 ? [200, kemDc(key, r[1], dc)] : r; }
    const khac = g.ds.filter((k) => k !== key);
    const laXoa = than?.xoa === true, laKpXoa = than?.khoiPhucXoa === true;
    if (!laXoa && !laKpXoa) {
      if (than?.nguon === 'lien-ket') return [409, { loi: 'Màn đang dùng chung: liên kết lưu riêng từng luồng — tải lại trang rồi sửa ở 🔗', dungChung: true }];
      if (than && than.tu != null) {
        let m0; try { m0 = docManifest(key); } catch { return [500, { loi: 'Manifest phiên bản hỏng' }]; }
        const cu = than.tu === 0 ? { tep: 0 } : m0.ds.find((x) => x.v === than.tu);
        if (cu && !cu.tep) return [409, { loi: 'Màn dùng chung không khôi phục về bản trong mã (v0) — chọn một bản đã lưu, hoặc tách màn khỏi nhóm trước' }];
      }
    }
    const r = await ghiPhienBan0(key, than, tin, ai, loaiAu, true, laXoa || laKpXoa ? null : { au: { dungChung: khac } });
    if (r[0] !== 200) return r;
    let m = r[1]; const muc = hienCua(m);
    if (laXoa) return [200, kemDc(key, m, dc)]; // xoá màn ở MỘT luồng: các luồng khác giữ nguyên
    if (laKpXoa) { // lúc màn bị xoá nội dung chung có thể đã đổi: lấy bản mới nhất của nhóm
      const moi = g.moi; const html = moi && !(moi.key === key && moi.tep === muc.tep) ? docTepPb(moi.key, moi.tep) : null;
      if (html != null && boLk(html) !== boLk(docTepPb(key, muc.tep) ?? '')) {
        const r2 = await ghiPhienBan0(key, { html: boLk(html), w: moi.w, h: moi.h, nhan: 'Dùng chung — lấy nội dung mới nhất của nhóm', nguon: 'dung-chung' }, null, ai, 'man.dung-chung', true, { dcTu: moi.key, au: { tu: moi.key } });
        if (r2[0] === 200) m = r2[1];
      }
      return [200, kemDc(key, m, dc)];
    }
    const html = docTepPb(key, muc.tep);
    const anhHuong = [], dcLoi = [];
    if (html != null) {
      const chung = boLk(html);
      for (const k of khac) {
        if (daXoaKey(k)) continue;
        const r2 = await ghiPhienBan0(k, { html: chung, w: muc.w, h: muc.h, nhan: `Dùng chung · theo «${tenMan(key)}» v${muc.v}`, yTuong: muc.yTuong || '', nguon: 'dung-chung', model: muc.model || '' },
          null, ai, 'man.dung-chung', true, { dcTu: key, au: { tu: key, vTu: muc.v } });
        if (r2[0] === 200) anhHuong.push(k); else dcLoi.push(`${tenMan(k)}: ${r2[1]?.loi || r2[0]}`);
      }
      g.moi = { key, tep: muc.tep, w: muc.w, h: muc.h };
      if (dcLoi.length) { console.error('[dung-chung] lan nội dung lỗi:', dcLoi.join('; ')); audit.ghi({ loai: 'dung-chung.lech', dt: { nhom: g.id, key, loi: dcLoi }, ai }); }
    }
    const lop = than?.lop != null ? lopSach(than.lop, await keyMan()) : null; // nút của chính màn này theo bản mới (vd. Claude đổi chữ nút)
    if (lop) g.lk = { ...(g.lk || {}), [key]: lop };
    g.t = new Date().toISOString(); ghiDc(dc);
    baoDoi(anhHuong, ai?.ten || '');
    return [200, { ...kemDc(key, m, dc), dcAnhHuong: anhHuong, ...(dcLoi.length ? { dcLoi } : {}) }];
  }

  // GET  /api/dung-chung                    → { nhom: [{ id, ds, lk, moi, t, tao }] }
  // POST /api/dung-chung/gop      { ds: [key…], nguon: key, html, w, h, lop: { <key>: lớp } } — CHỈ chủ quản: html = nội dung màn nguồn; mọi màn nhận bản đó
  // POST /api/dung-chung/tach     { key, html: { <key>: HTML đã áp liên kết riêng } }            — CHỈ chủ quản: nhóm còn < 2 màn thì giải tán (gửi HTML cả hai)
  // POST /api/dung-chung/lien-ket { key, lop, nhan }                                             — quyền như Thay màn: đổi lớp liên kết riêng của một màn
  async function apiDungChung(req, res, p) {
    const keys = await keyMan();
    if (req.method === 'GET') {
      if (p !== '/api/dung-chung') return json(res, 404, { loi: 'Không có' });
      try { return json(res, 200, { nhom: Object.values(docDc().nhom) }); } catch { return json(res, 500, { loi: 'Tệp màn dùng chung (dung-chung.json) hỏng' }); }
    }
    if (req.method !== 'POST') return json(res, 405, { loi: 'Không hỗ trợ' });
    const viec = p.slice('/api/dung-chung/'.length);
    if (!['gop', 'tach', 'lien-ket'].includes(viec)) return json(res, 404, { loi: 'Không có' });
    if (!hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { loi: 'Nguồn không hợp lệ' });
    if (viec === 'lien-ket' ? review.khoaBang() && !review.laChuQuan(req) : !review.laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true });
    let t; try { t = JSON.parse(await docThan(req, 3 * PB_CO)); } catch (e) { return json(res, e.ma || 400, { loi: e.ma === 413 ? 'Quá lớn' : 'Không đọc được yêu cầu' }); }
    if (!t || typeof t !== 'object') return json(res, 400, { loi: 'Không đọc được yêu cầu' });
    const ai = aiCua(req);
    let mo; try { mo = await khoaPb('dung-chung', KHOA_DC); } catch { return json(res, 503, { loi: 'Kho phiên bản đang bận — thử lại' }); }
    try {
      let dc; try { dc = docDc(); } catch { return json(res, 500, { loi: 'Tệp màn dùng chung (dung-chung.json) hỏng' }); }
      const bay = new Date().toISOString();
      if (viec === 'lien-ket') {
        const key = String(t.key || ''); const g = nhomCua(dc, key);
        if (!g) return json(res, 409, { loi: 'Màn này không còn dùng chung — tải lại trang' });
        const lop = lopSach(t.lop, keys); if (!lop) return json(res, 400, { loi: 'Lớp liên kết không hợp lệ' });
        const truoc = g.lk?.[key] || { tuDong: true };
        g.lk = { ...(g.lk || {}), [key]: lop }; g.t = bay; ghiDc(dc);
        audit.ghi({ loai: 'dung-chung.lien-ket', dt: { key, nhom: g.id }, ai, truoc, sau: lop, ghiChu: chuNgan(t.nhan, 160) || undefined });
        baoDoi([key], ai.ten, false);
        return json(res, 200, { ok: true, dc: kemDc(key, {}, dc).dc });
      }
      if (viec === 'gop') {
        const ds = [...new Set(Array.isArray(t.ds) ? t.ds : [])].filter((k) => typeof k === 'string');
        if (ds.length < 2 || ds.length > 20 || !ds.every((k) => keys.has(k))) return json(res, 400, { loi: 'Cần 2–20 màn hợp lệ để gộp' });
        if (!ds.includes(t.nguon)) return json(res, 400, { loi: 'Màn nguồn phải nằm trong danh sách gộp' });
        if (typeof t.html !== 'string' || !t.html.trim() || t.html.length > PB_CO) return json(res, 400, { loi: 'Thiếu HTML nội dung chung hoặc quá lớn' });
        for (const k of ds) if (t.lop?.[k] != null && !lopSach(t.lop[k], keys)) return json(res, 400, { loi: `Lớp liên kết của «${tenMan(k)}» không hợp lệ` });
        for (const k of ds) if (daXoaKey(k)) return json(res, 409, { loi: `«${tenMan(k)}» đang bị xoá khỏi hành trình — khôi phục màn trước` });
        const cu = [...new Set(ds.map((k) => nhomCua(dc, k)).filter(Boolean))];
        const tatCa = [...new Set([...cu.flatMap((g) => g.ds), ...ds])];
        if (tatCa.length > 20) return json(res, 400, { loi: 'Một nhóm dùng chung tối đa 20 màn' });
        const id = cu[0]?.id || globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        const lk = Object.assign({}, ...cu.map((g) => g.lk || {}));
        for (const k of ds) lk[k] = t.lop?.[k] != null ? lopSach(t.lop[k], keys) : lk[k] || { tuDong: true };
        const w = Math.round(Number(t.w)), h = Math.round(Number(t.h));
        const anhHuong = []; const loi = [];
        // đăng ký nhóm TRƯỚC khi ghi các màn: Thay màn chen vào giữa chừng sẽ đi đường dùng chung và chờ khoá nhóm (đang giữ) thay vì ghi lẻ
        const truoc = cu.map(sao);
        for (const g0 of cu) delete dc.nhom[g0.id];
        const g = { id, ds: tatCa, lk, moi: null, t: bay, tao: ai.ten || '' };
        dc.nhom[id] = g; ghiDc(dc);
        const traLai = () => { delete dc.nhom[id]; for (const g0 of truoc) dc.nhom[g0.id] = g0; ghiDc(dc); }; // chưa ghi màn nào: trả nhóm về như cũ
        try { for (const k of [t.nguon, ...tatCa.filter((x) => x !== t.nguon)]) {
          if (daXoaKey(k)) continue;
          const r = await ghiPhienBan0(k, { html: k === t.nguon ? t.html : boLk(t.html), w, h, nhan: `Gộp dùng chung — nội dung của «${tenMan(t.nguon)}»`, nguon: 'dung-chung' }, null, ai, 'man.dung-chung', true, { dcTu: t.nguon, au: { gop: id, nguon: t.nguon } });
          if (r[0] === 200) anhHuong.push(k);
          else if (k === t.nguon) { traLai(); return json(res, r[0], r[1]); }
          else loi.push(`${tenMan(k)}: ${r[1]?.loi || r[0]}`);
        }
        const mucN = hienCua(docManifest(t.nguon));
        g.moi = { key: t.nguon, tep: mucN.tep, w: mucN.w, h: mucN.h }; ghiDc(dc);
        } catch (e) { if (!anhHuong.length) traLai(); else { try { const mucN = hienCua(docManifest(t.nguon)); g.moi = { key: t.nguon, tep: mucN.tep, w: mucN.w, h: mucN.h }; ghiDc(dc); } catch { /* giữ nhóm, lần sửa sau lan lại */ } } throw e; }
        audit.ghi({ loai: 'dung-chung.gop', dt: { nhom: id, ds: tatCa, nguon: t.nguon }, ai, truoc: truoc.length ? truoc : null, sau: g });
        baoDoi(tatCa, ai.ten, false);
        return json(res, 200, { ok: true, nhom: g, anhHuong, loi });
      }
      // tach
      const key = String(t.key || ''); const g = nhomCua(dc, key);
      if (!g) return json(res, 409, { loi: 'Màn này không thuộc nhóm dùng chung nào' });
      const con = g.ds.filter((k) => k !== key && keys.has(k)); const roi = con.length < 2 ? g.ds.filter((k) => keys.has(k)) : [key];
      // kiểm trước mọi màn ghi được (tránh tách dở dang: màn đầu đã có bản «tách», màn sau lỗi)
      for (const k of roi) { if (daXoaKey(k)) continue; let mk; try { mk = docManifest(k); } catch { return json(res, 500, { loi: `Manifest phiên bản của «${tenMan(k)}» hỏng` }); } if (mk.ds.length >= PB_TOI_DA) return json(res, 409, { loi: `«${tenMan(k)}» đã có ${PB_TOI_DA} phiên bản` }); }
      for (const k of roi) if (!daXoaKey(k) && (typeof t.html?.[k] !== 'string' || !t.html[k].trim() || t.html[k].length > PB_CO)) return json(res, 400, { loi: `Thiếu HTML (đã áp liên kết riêng) của «${tenMan(k)}»` });
      const truoc = sao(g);
      for (const k of roi) {
        if (daXoaKey(k)) continue;
        const mk = hienCua(docManifest(k));
        const r = await ghiPhienBan0(k, { html: t.html[k], w: mk?.w, h: mk?.h, nhan: 'Tách khỏi nhóm dùng chung — giữ bản hiện tại làm bản riêng', nguon: 'tach' }, null, ai, 'man.dung-chung', true, { au: { tach: g.id } });
        if (r[0] !== 200) return json(res, r[0], r[1]);
      }
      if (con.length < 2) delete dc.nhom[g.id];
      else { g.ds = con; const lk = { ...(g.lk || {}) }; delete lk[key]; g.lk = lk; g.t = bay; }
      ghiDc(dc);
      audit.ghi({ loai: 'dung-chung.tach', dt: { nhom: g.id, key, roi, con: dc.nhom[g.id] ? con : [] }, ai, truoc, sau: dc.nhom[g.id] || null });
      baoDoi(truoc.ds, ai.ten, false);
      return json(res, 200, { ok: true, roi, giaiTan: !dc.nhom[g.id] });
    } finally { mo(); }
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
      const key = e.dt?.key;
      if (/^man\.(xoa|khoi-phuc-xoa)$/.test(e.loai)) { // đặt lại trạng thái xoá: «sau man.xoa» / «trước man.khoi-phuc-xoa» = xoá; ngược lại = khôi phục
        const xoa = (e.loai === 'man.xoa') === (ben === 'sau');
        const [ma, obj] = await ghiPhienBan(key, xoa ? { xoa: true } : { khoiPhucXoa: true }, null, ai);
        if (ma === 200) { phatPhong('bang', { t: 'rv', loai: 'thay', key, ten: ai.ten, tu: '' }); review.baoThayMan(key, { ten: ai.ten }); }
        return json(res, ma, ma === 200 ? { ok: true, manifest: obj } : obj);
      }
      if (!st) return json(res, 400, { loi: 'Không có trạng thái để khôi phục' });
      let m0; try { m0 = docManifest(key); } catch { return json(res, 500, { loi: 'Manifest phiên bản hỏng' }); }
      const con = st.v === 0 || st.trongMa ? { tu: 0 } : m0.ds.some((x) => x.v === st.v && x.tep === st.tep && fs.existsSync(path.join(thuMucPb(key), `v${x.tep}.html`))) ? { tu: st.v }
        : { html: st.html, w: st.w, h: st.h, nhan: `Khôi phục từ lịch sử ${nguon}`.slice(0, 120), yTuong: st.yTuong || '', nguon: 'lich-su' };
      const [ma, obj] = await ghiPhienBan(key, con, null, ai, 'man.khoi-phuc-lich-su');
      if (ma === 200) { phatPhong('bang', { t: 'rv', loai: 'thay', key, ten: ai.ten, tu: '' }); review.baoThayMan(key, { ten: ai.ten }); }
      return json(res, ma, ma === 200 ? { ok: true, manifest: obj } : obj);
    }
    if (/^gop-y\./.test(e.loai)) {
      const r = await review.datGopY(e.dt?.ht, e.dt?.id, st, ai, nguon);
      return r.loi ? json(res, 409, { loi: r.loi }) : json(res, 200, { ok: true, m: r.m });
    }
    return json(res, 400, { loi: 'Loại sự kiện này không khôi phục được' });
  }


  // bàn chính khi khoaBang mà người nối không phải chủ quản: chỉ được con trỏ/nhìn/tên ('xem'), không phát thao tác
  const phongHopLe = (ten, req) => (ten === 'bang' ? (review.khoaBang() && !review.laChuQuan(req) ? 'xem' : true) : /^r-[a-f0-9]{32}$/.test(ten) && review.conHieuLuc(ten.slice(2)));
  return { xuLy, xuLyYeuCau, daVao, hopLeNguon, phongHopLe, review, audit, khoBt, mcp, TEP, WEB, THIET_KE };
}
