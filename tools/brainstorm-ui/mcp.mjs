// MCP (Model Context Protocol, Streamable HTTP ở /mcp) của bàn brainstorm: đọc hành trình/màn/biến thể/góp ý/audit, chụp ẢNH màn,
// Thay màn/Khôi phục/xoá biến thể/Accept đề xuất, và tạo biến thể «đầy đủ ngữ cảnh» theo 2 bước (máy chủ KHÔNG gọi Claude — AI là của người dùng).
//
// Quyền: mọi thao tác đi qua CHÍNH đường xử lý HTTP của server.mjs bằng một yêu cầu nội bộ mang danh tính người gọi MCP
// (Host, IP thật, header cloudflared, mã chủ quản từ header «x-bs-chu-quan»; Bearer là mật khẩu MCP «maMcp» kiểm ở cửa) ⇒ kiểm quyền, khoaBang,
// giới hạn sai mã, giới hạn tốc độ và audit y hệt bàn web; audit ghi thêm ai.nguon = 'mcp'. Mã chủ quản không bao giờ được in/ghi.
//
// Ảnh: Chrome đã cài trên máy (KHÔNG tải Chromium), một trình duyệt dùng chung, mở khi cần, tự đóng sau ~2 phút rảnh; cache theo băm HTML.
// HTML màn được phục vụ cho Chrome qua /__mcp/trang/<mã dùng một lần> (chỉ loopback, CSP cấm script). lamSach/ganToi chạy NGUYÊN mã của web
// (web/claude.js, web/gan-toi.js) trong một trang của chính Chrome đó ⇒ làm sạch y hệt trình duyệt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { heThong, loiNguoiDung, loiHanhTrinh, tachKetQua, tachHanhTrinh, HUONG } from './web/prompt.js';
import { vanBanAssets } from './web/claude.js';
import { taiHanhTrinh } from './web/hanh-trinh/index.js';

const CHROME = process.env.BS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RANH_DONG = 120000;            // Chrome rảnh bao lâu thì đóng
const SO_TRANG = 3;                  // số trang chụp cùng lúc
const THAN_MCP = 48 * 1024 * 1024;   // một yêu cầu MCP (tao_phuong_an mang HTML nhiều màn)
const CSP_ANH = ["default-src 'self'", "script-src 'none'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:", "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
const CSP_DOM = "default-src 'none'; script-src 'self'";
const KEY = /^[a-z0-9][a-z0-9-]{0,79}$/;
const sha1 = (...x) => crypto.createHash('sha1').update(x.join('\0')).digest('hex');
const dataToi = (html) => [...new Set([...String(html || '').matchAll(/data-toi="([^"]*)"/g)].map((m) => m[1]))];
const LOI = (msg) => Object.assign(new Error(msg), { mcp: true });

export function taoMcp(C) {
  // ================= yêu cầu nội bộ: đi qua đúng xuLyYeuCau của server.mjs =================
  const laLoopbackHost = (h) => /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(String(h || ''));
  function hostHopLe(req) {
    const h = String(req.headers.host || '').toLowerCase();
    if (laLoopbackHost(h)) return true;
    const ten = h.replace(/:\d+$/, '');
    return /^[a-z0-9.-]+$/.test(ten) && C.HOST_TIN.some((d) => ten === d || ten.endsWith(`.${d}`));
  }
  // mã chủ quản CHỈ qua header x-bs-chu-quan (Authorization: Bearer là mật khẩu MCP «maMcp», kiểm ở cửa /mcp)
  const maChuQuan = (req0) => String(req0.headers['x-bs-chu-quan'] || '').slice(0, 200);
  const tenNguoi = (req0) => { try { return decodeURIComponent(String(req0.headers['x-bs-nguoi'] || '')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 40) || 'MCP'; } catch { return 'MCP'; } };
  async function goi(req0, method, duong, than) {
    const body = than === undefined ? null : Buffer.from(JSON.stringify(than));
    const req = Readable.from(body ? [body] : []);
    const host = String(req0.headers.host || '');
    const h = { host, 'user-agent': String(req0.headers['user-agent'] || 'mcp').slice(0, 200), 'x-bs-phien': 'mcp', 'x-bs-nguoi': encodeURIComponent(tenNguoi(req0)) };
    for (const k of ['cf-connecting-ip', 'cf-ray', 'x-forwarded-for']) if (req0.headers[k]) h[k] = req0.headers[k];
    const ma = maChuQuan(req0); if (ma) h['x-bs-chu-quan'] = ma;
    if (method !== 'GET') { // Host đã được kiểm ở cửa /mcp ⇒ Origin nội bộ = đúng Host đó (qua hopLeNguon như trang web)
      h['content-type'] = 'application/json';
      h.origin = laLoopbackHost(host) ? `http://127.0.0.1:${C.cong()}` : `https://${host}`;
    }
    Object.assign(req, { method, url: duong, headers: h, socket: req0.socket, connection: req0.socket });
    C.danhDau(req);
    let xong; const da = new Promise((r) => { xong = r; });
    const res = { ma: 200, hd: {}, phan: [], headersSent: false,
      writeHead(m, hd) { this.ma = m; Object.assign(this.hd, hd || {}); this.headersSent = true; return this; },
      setHeader(k, v) { this.hd[k] = v; }, write(b) { if (b != null) this.phan.push(Buffer.isBuffer(b) ? b : Buffer.from(String(b))); return true; },
      end(b) { this.write(b); xong(); } };
    let hen; await Promise.race([da, Promise.resolve(C.xuLyYeuCau(req, res)).then(() => da), new Promise((_, hong) => { hen = setTimeout(() => hong(LOI(`Yêu cầu nội bộ ${duong.split('?')[0]} không trả lời sau 60 giây`)), 60000); })]).finally(() => clearTimeout(hen));
    const buf = Buffer.concat(res.phan); const kieu = String(res.hd['Content-Type'] || '');
    return { ma: res.ma, kieu, buf, j: kieu.startsWith('application/json') ? (() => { try { return JSON.parse(buf.toString('utf8')); } catch { return null; } })() : null };
  }
  async function goiJ(req0, method, duong, than) {
    const r = await goi(req0, method, duong, than);
    if (r.ma >= 400) throw LOI(`${r.j?.loi || 'Lỗi'} (HTTP ${r.ma})${r.j?.canMa ? ' — cần mã chủ quản: gắn thêm header «x-bs-chu-quan: <mã chủ quản>» khi thêm MCP' : ''}`);
    return r.j;
  }

  // ================= dữ liệu màn gốc (giống app.js: hành trình + màn «giống thật» ở web/that/) =================
  const gocCache = new Map();
  let manP = null, manLuc = 0;
  function taiMan() { // nạp lại sau 30 giây (web/that/ có thể được chụp lại khi máy chủ đang chạy); lần nạp thiếu tệp hành trình không được giữ
    if (manP && Date.now() - manLuc > 30000) manP = null;
    if (!manP) { manLuc = Date.now(); gocCache.clear(); manP = (async () => {
      const lay = async (u) => {
        const t = path.resolve(C.WEB, String(u).replace(/^\/+/, ''));
        if (!t.startsWith(C.WEB + path.sep)) throw new Error('ngoài web/');
        const s = await fs.promises.readFile(t, 'utf8');
        return { ok: true, json: async () => JSON.parse(s), text: async () => s };
      };
      const { ds, loi } = await taiHanhTrinh(lay);
      void loi; // tệp hành trình lỗi: mô-đun ESM lỗi bị Node giữ — sửa xong phải khởi động lại máy chủ (như keyMan)
      const LAN = [], MAN = {};
      for (const h of ds) {
        if (!KEY.test(h.id)) continue;
        LAN.push({ id: h.id, vai: h.vai, nen: h.nen, ten: h.ten, mo: h.mo || '', buoc: h.buoc.map((b) => b.key), goc: true });
        h.buoc.forEach((b, i) => { const ke = h.buoc[i + 1]; MAN[b.key] = { key: b.key, ten: b.ten, w: b.w, h: b.h, html: b.html, anh: b.anh || '', toi: b.toi || '', lan: h.id, buoc: i, ke: ke?.key || '' }; });
      }
      return { LAN, MAN };
    })().catch((e) => { manP = null; throw e; }); }
    return manP;
  }
  const timHt = async (id) => { const { LAN } = await taiMan(); const l = LAN.find((x) => x.id === id); if (!l) throw LOI(`Không có hành trình «${id}» — xem ds_hanh_trinh`); return l; };
  const timMan = async (key) => { const { MAN } = await taiMan(); const m = MAN[key]; if (!m) throw LOI(`Không có màn «${key}» — xem ds_hanh_trinh`); return m; };
  // bản trong mã (v0) đã gắn data-toi như bàn web
  async function htmlGoc(m) {
    if (gocCache.has(m.key)) return gocCache.get(m.key);
    const { MAN } = await taiMan();
    const html = m.ke && m.toi && !/data-toi=/.test(m.html) ? await domGoi('ganToi', m.html, m.toi, m.ke, MAN[m.ke]?.ten || '') : m.html;
    gocCache.set(m.key, html); return html;
  }
  // trạng thái hiện hành của một màn (như apPhienBan của app.js): HTML (đã lamSach + giữ data-toi), w, h, manifest
  async function hienHanh(req0, key, v = null, pbSan = null) {
    const m = await timMan(key);
    const ds = pbSan || await goiJ(req0, 'GET', '/api/phien-ban');
    const mf = ds[key] || { key, hien: 0, ds: [] };
    const vv = v == null ? mf.hien || 0 : v;
    const muc = vv ? mf.ds.find((x) => x.v === vv) : null;
    if (vv && !muc) throw LOI(`Màn ${key} không có phiên bản v${vv} (đang có: ${mf.ds.map((x) => `v${x.v}`).join(', ') || 'chỉ v0'})`);
    let html;
    if (muc?.tep) {
      const r = await goiJ(req0, 'GET', `/api/phien-ban/${encodeURIComponent(key)}/${muc.tep}`);
      html = await domGoi('lamSach', r.html);
      if (m.ke && m.toi && !/data-toi=/.test(html)) { const { MAN } = await taiMan(); html = await domGoi('ganToi', html, m.toi, m.ke, MAN[m.ke]?.ten || ''); }
    } else html = await htmlGoc(m);
    return { m, html, w: muc?.w || m.w, h: muc?.h || m.h, v: vv, mf };
  }
  const tomMf = (mf) => ({ hien: mf.hien || 0, lichSu: [{ v: 0, nhan: 'bản trong mã' }, ...mf.ds.map((x) => ({ v: x.v, t: x.t, nhan: x.nhan, nguon: x.nguon, model: x.model || undefined, tu: x.tu, tacGia: x.tacGia, yTuong: x.yTuong ? String(x.yTuong).slice(0, 200) : undefined, w: x.w, h: x.h }))] });

  // ================= Chrome headless dùng chung =================
  let trinh = null, moTrinh = null, henDong = null, dangDung = 0, domTrang = null, domP = null, thuMucTrinh = '';
  const TRANG = new Map(); // mã → { html, csp, het }
  function datTrang(html, csp) {
    const ma = crypto.randomBytes(16).toString('hex');
    TRANG.set(ma, { html, csp, het: Date.now() + 120000 });
    for (const [k, v] of TRANG) if (v.het < Date.now()) TRANG.delete(k);
    return `http://127.0.0.1:${C.cong()}/__mcp/trang/${ma}`;
  }
  function trang(req, res, ma) { // chỉ Chrome của chính máy chủ (loopback, không qua tunnel) — mã dùng một lần
    const sock = req.socket.remoteAddress || '';
    const t = /^[a-f0-9]{32}$/.test(ma) ? TRANG.get(ma) : null;
    if (!t || !laLoopbackHost(req.headers.host) || !/^(127\.|::1$|::ffff:127\.)/.test(sock) || req.headers['cf-ray'] || req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không có');
    }
    TRANG.delete(ma);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': t.csp });
    res.end(t.html);
  }
  const MO = new Map(); // browser → thư mục hồ sơ tạm (dọn cả khi tắt cưỡng bức / thoát tiến trình)
  const giet = (b) => { try { b?.process()?.kill('SIGKILL'); } catch { /* đã tắt */ } const d = MO.get(b); MO.delete(b); if (d) try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* bỏ qua */ } };
  const tatChrome = () => { for (const b of [...MO.keys()]) giet(b); };
  const khiTin = (sig) => () => { tatChrome(); process.exit(sig === 'SIGINT' ? 130 : 0); };
  const BAT = { SIGTERM: khiTin('SIGTERM'), SIGINT: khiTin('SIGINT'), SIGHUP: khiTin('SIGHUP') };
  async function trinhDuyet() {
    clearTimeout(henDong);
    if (trinh?.connected) return trinh;
    if (!moTrinh) moTrinh = (async () => {
      if (!fs.existsSync(CHROME)) throw LOI(`Không thấy Chrome ở ${CHROME} — đặt BS_CHROME=<đường dẫn Chrome>`);
      const { default: puppeteer } = await import('puppeteer-core');
      thuMucTrinh = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-mcp-chrome-'));
      let b; try { b = await puppeteer.launch({ executablePath: CHROME, headless: true, pipe: true, userDataDir: thuMucTrinh,
        handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
        args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--hide-scrollbars', '--mute-audio', '--disable-background-networking', '--force-color-profile=srgb'] }); } catch (e) { try { fs.rmSync(thuMucTrinh, { recursive: true, force: true }); } catch { /* bỏ qua */ } throw e; }
      const dir = thuMucTrinh; MO.set(b, dir);
      for (const [s, f] of Object.entries(BAT)) process.on(s, f);
      b.on('disconnected', () => {
        if (trinh === b) { trinh = null; domTrang = null; domP = null; }
        for (const [s, f] of Object.entries(BAT)) process.off(s, f);
        MO.delete(b); try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* bỏ qua */ }
      });
      trinh = b; return b;
    })().finally(() => { moTrinh = null; });
    return moTrinh;
  }
  process.on('exit', tatChrome);
  function henTat() {
    clearTimeout(henDong);
    henDong = setTimeout(() => { if (dangDung) return henTat(); const b = trinh; trinh = null; domTrang = null; domP = null; if (b) Promise.race([b.close(), new Promise((_, h) => setTimeout(h, 10000).unref?.())]).catch(() => giet(b)); }, RANH_DONG);
    henDong.unref?.();
  }
  let dangChup = 0; const hangCho = [];
  async function voiTrinh(fn) {
    dangDung++;
    try { return await fn(await trinhDuyet()); } finally { dangDung--; henTat(); }
  }
  async function voiTrang(fn) {
    if (dangChup >= SO_TRANG) await new Promise((r) => hangCho.push(r)); // được trao chỗ trực tiếp (dangChup giữ nguyên)
    else dangChup++;
    try {
      return await voiTrinh(async (b) => { const pg = await b.newPage(); try { return await fn(pg); } finally { pg.close().catch(() => {}); } });
    } finally { const ke = hangCho.shift(); if (ke) ke(); else dangChup--; }
  }
  // trang chạy NGUYÊN mã web (lamSach của web/claude.js, ganToi của web/gan-toi.js)
  const domCache = new Map(); let domByte = 0; // kết quả lamSach/ganToi theo băm đầu vào (đọc lặp không chạy lại Chrome)
  async function domGoi(ten, ...a) {
    const k = sha1(ten, ...a);
    if (domCache.has(k)) return domCache.get(k);
    const ra = await domChay(ten, ...a);
    if (!domCache.has(k)) { domCache.set(k, ra); domByte += ra.length; while (domByte > 40e6 && domCache.size > 1) { const [k0, v0] = domCache.entries().next().value; domCache.delete(k0); domByte -= v0.length; } }
    return ra;
  }
  async function domChay(ten, ...a) {
    return voiTrinh(async (b) => {
      if (!domTrang || domTrang.isClosed()) {
        if (!domP) domP = (async () => {
          const pg = await b.newPage();
          await pg.goto(datTrang('<!doctype html><meta charset="utf-8"><title>dom</title>', CSP_DOM));
          await pg.evaluate(async () => { const [cl, gt] = await Promise.all([import('/claude.js'), import('/gan-toi.js')]); window.__bs = { lamSach: cl.lamSach, ganToi: gt.ganToi }; });
          domTrang = pg; return pg;
        })().finally(() => { domP = null; });
        await domP;
      }
      return domTrang.evaluate((t, x) => window.__bs[t](...x), ten, a);
    });
  }
  const anhCache = new Map(); let anhByte = 0; const ANH_BYTE = 80 * 1024 * 1024; // cache ảnh giới hạn theo tổng byte
  async function chup(html, w, h, tiLe = 1) {
    w = Math.round(w); h = Math.round(h);
    if (!(w > 0 && w <= 5000 && h > 0 && h <= 20000)) throw LOI(`Khung lạ ${w}×${h}`);
    const k = sha1(html, w, h, tiLe);
    if (anhCache.has(k)) { const v = anhCache.get(k); anhCache.delete(k); anhCache.set(k, v); return v; } // LRU
    let du = true;
    const sach = await domGoi('lamSach', html); // MỌI HTML đưa Chrome đều qua lamSach (bỏ meta refresh, script, base…) — kể cả HTML thô trong kho
    const buf = await voiTrang(async (pg) => {
      await pg.setViewport({ width: w, height: h, deviceScaleFactor: tiLe });
      const url = datTrang(sach, CSP_ANH);
      await pg.setRequestInterception(true); // lớp hai: khung chính không được rời trang chụp
      pg.on('request', (q) => { if (q.isInterceptResolutionHandled()) return; if (q.isNavigationRequest() && q.frame() === pg.mainFrame() && q.url() !== url) q.abort(); else q.continue(); });
      const r = await pg.goto(url, { waitUntil: 'networkidle0', timeout: 20000 }).catch((e) => { if (e?.name !== 'TimeoutError') throw LOI(`Không mở được trang chụp: ${e?.message}`); du = false; return null; }); // hết giờ chờ mạng (font chậm): vẫn chụp nhưng không cache
      if (r && r.status() !== 200) throw LOI(`Không tải được trang chụp (HTTP ${r.status()})`);
      await pg.evaluate(() => document.fonts?.ready).catch(() => {});
      return Buffer.from(await pg.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } }));
    });
    if (du) { const cu = anhCache.get(k); if (cu) anhByte -= cu.length; anhCache.set(k, buf); anhByte += buf.length; while (anhByte > ANH_BYTE && anhCache.size > 1) { const [k0, b0] = anhCache.entries().next().value; anhCache.delete(k0); anhByte -= b0.length; } }
    return buf;
  }
  // ghép nhiều ảnh thành một hàng (ảnh cả hành trình)
  async function ghep(ds, tiLe0) {
    const pad = 24, gap = 24, nhanCao = 28;
    // tự thu nhỏ cho vừa 7900px (giới hạn ảnh của client) thay vì báo lỗi
    const tong = ds.reduce((t, x) => t + x.w, 0), cao0 = Math.max(...ds.map((x) => x.h));
    const tiLe = Math.min(tiLe0, (7900 - pad * 2 - gap * (ds.length - 1)) / tong, (7900 - pad * 2 - nhanCao) / cao0);
    if (!(tiLe > 0.05)) throw LOI('Hành trình quá dài để ghép một ảnh — đặt ghep=false');
    const rong = ds.reduce((t, x) => t + Math.round(x.w * tiLe), 0) + gap * (ds.length - 1) + pad * 2;
    const cao = Math.max(...ds.map((x) => Math.round(x.h * tiLe))) + nhanCao + pad * 2;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#dcdad4;width:${rong}px;height:${cao}px"><div style="display:flex;gap:${gap}px;padding:${pad}px;align-items:flex-start">${
      ds.map((x) => `<figure style="margin:0;width:${Math.round(x.w * tiLe)}px"><figcaption style="height:${nhanCao}px;font:600 13px system-ui;color:#2e3533;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.nhan)}</figcaption><img style="display:block;width:${Math.round(x.w * tiLe)}px;height:${Math.round(x.h * tiLe)}px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.18)" src="data:image/png;base64,${x.png.toString('base64')}"></figure>`).join('')}</div></body>`;
    return voiTrang(async (pg) => {
      await pg.setViewport({ width: rong, height: cao, deviceScaleFactor: 1 });
      await pg.goto(datTrang(html, CSP_ANH), { waitUntil: 'load', timeout: 20000 }).catch(() => {});
      return Buffer.from(await pg.screenshot({ type: 'png', clip: { x: 0, y: 0, width: rong, height: cao } }));
    });
  }
  const anh = (buf, mime = 'image/png') => ({ type: 'image', data: buf.toString('base64'), mimeType: mime });
  const chu = (t) => ({ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 1) });
  async function anhThat(req0, m) {
    if (!m.anh) return null;
    const r = await goi(req0, 'GET', `/ref/${m.anh.split('/').map(encodeURIComponent).join('/')}`);
    if (r.ma !== 200) return null;
    const mime = /\.png$/i.test(m.anh) ? 'image/png' : /\.webp$/i.test(m.anh) ? 'image/webp' : 'image/jpeg';
    return anh(r.buf, mime);
  }

  // ================= biến thể =================
  async function dsKho(req0) { return goiJ(req0, 'GET', '/api/bien-the'); }
  async function docKhung(req0, id) { return goiJ(req0, 'GET', `/api/bien-the/k/${encodeURIComponent(id)}`); }
  const tomKhung = (f) => ({ id: f.id, goc: f.goc, cha: f.cha, lan: f.lan, nhan: f.nhan, yTuong: f.yTuong ? String(f.yTuong).slice(0, 300) : undefined, tt: f.tt, loi: f.loi, model: f.model, w: f.w, h: f.h, k: f.k, n: f.n, nguoi: f.nguoi, tSua: f.tSua ? new Date(f.tSua).toISOString() : undefined, suaTay: f.suaTay ? true : undefined });
  const tomLan = (l) => ({ id: l.id, tu: l.tu, nguon: l.nguon, nhan: l.nhan, yTuong: l.yTuong ? String(l.yTuong).slice(0, 300) : undefined, tt: l.tt, k: l.k, model: l.model, tSua: l.tSua ? new Date(l.tSua).toISOString() : undefined });
  // nguồn cho một biến thể mới: màn gốc (key) hoặc một khung biến thể (tu_bien_the)
  async function nguonBienThe(req0, key, tuBt) {
    if (tuBt) {
      const f = await docKhung(req0, tuBt);
      if (!f.html || f.tt !== 'xong') throw LOI(`Biến thể ${tuBt} chưa xong / không có HTML`);
      const m = await timMan(f.goc);
      return { key: f.goc, cha: f.id, html: f.html, w: f.w, h: f.h, ten: f.nhan || m.ten, m };
    }
    if (!key) throw LOI('Cần key (màn gốc) hoặc tu_bien_the');
    const hh = await hienHanh(req0, key);
    return { key, cha: key, html: hh.html, w: hh.w, h: hh.h, ten: hh.m.ten, m: hh.m };
  }
  // so liên kết data-toi giữa bản nguồn và bản mới (client tự kiểm)
  async function soLienKet(goc, moi) {
    const { MAN } = await taiMan();
    const a = new Set(dataToi(goc)), b = new Set(dataToi(moi));
    return { giu: [...a].filter((x) => b.has(x)), thieu: [...a].filter((x) => !b.has(x)), them: [...b].filter((x) => !a.has(x)), keyLa: [...b].filter((x) => !MAN[x]) };
  }
  async function gopYMo(req0, ht, key) {
    try {
      const r = await goiJ(req0, 'GET', '/api/review');
      return (r.gopY?.[ht] || []).filter((g) => g.tt !== 'xong' && (!key || g.key === key)).map((g) => ({ id: g.id, key: g.key, muc: g.muc, ten: g.ten, noi: g.noi, ghim: g.ghim || undefined, tl: (g.tl || []).map((t) => ({ ten: t.ten, noi: t.noi })) }));
    } catch (e) { return { khongDoc: e.message }; }
  }
  const assetsTxt = async (req0) => vanBanAssets(await goiJ(req0, 'GET', '/api/assets'));
  const kitCss = () => fs.promises.readFile(path.join(C.WEB, 'kit/clay-kit.css'), 'utf8').catch(() => '');

  // ================= máy chủ MCP cho một yêu cầu (stateless) =================
  function taoServer(req0) {
    const s = new McpServer({ name: 'aiigrow-figma', version: '1.0.0' }, {
      instructions: 'Bàn brainstorm giao diện AiiGrow (hành trình → màn → biến thể). Đọc: ds_hanh_trinh, doc_man, anh_man, anh_hanh_trinh, ds_bien_the, doc_bien_the, ds_gop_y, doc_de_xuat, nhat_ky. '
        + 'Tạo biến thể 2 bước (máy chủ không gọi AI): ngu_canh_bien_the → bạn tự sinh HTML theo đúng system prompt + tin nhắn trả về → tao_bien_the (kèm html hoặc nguyên câu trả lời «Ý TƯỞNG…```html```»). Cả hành trình: ngu_canh_hanh_trinh → tao_phuong_an. '
        + 'Ghi (thay_man, khoi_phuc_phien_ban, xoa_bien_the, chap_nhan_de_xuat…) cần quyền chủ quản như bàn web: 127.0.0.1 tự là chủ quản; qua tên miền cần mật khẩu MCP (Authorization: Bearer <maMcp>) và, cho thao tác của chủ quản, thêm header x-bs-chu-quan.',
    });
    const T = (ten, mo, schema, fn) => s.registerTool(ten, { description: mo, inputSchema: schema }, async (a) => {
      try { return { content: await fn(a) }; } catch (e) { return { isError: true, content: [chu(e.mcp || e.message ? e.message : 'Lỗi')] }; }
    });
    const tiLe = z.number().min(0.25).max(3).optional().describe('Tỉ lệ điểm ảnh (mặc định 1 = đúng khung w×h)');

    T('ds_hanh_trinh', 'Liệt kê hành trình và các màn của bàn: key, tên, kích thước w×h hiện hành, nền tảng/vai, phiên bản đang dùng, có ảnh thật không, các data-toi (nút nối sang màn khác), số biến thể và các phương án (biến thể cả hành trình).',
      { hanh_trinh: z.string().optional().describe('Chỉ một hành trình (id)') }, async (a) => {
        const { LAN, MAN } = await taiMan();
        const [pb, kho] = await Promise.all([goiJ(req0, 'GET', '/api/phien-ban'), dsKho(req0)]);
        const ra = [];
        for (const l of LAN) {
          if (a.hanh_trinh && l.id !== a.hanh_trinh) continue;
          const buoc = await Promise.all(l.buoc.map(async (key) => {
            const m = MAN[key]; const mf = pb[key]; const muc = mf?.ds.find((x) => x.v === mf.hien);
            let html = m.html;
            if (muc?.tep) { try { html = (await goiJ(req0, 'GET', `/api/phien-ban/${encodeURIComponent(key)}/${muc.tep}`)).html; } catch { /* bỏ qua */ } }
            const toi = dataToi(html);
            return { key, ten: m.ten, w: muc?.w || m.w, h: muc?.h || m.h, phienBan: mf?.hien || 0, soPhienBan: (mf?.ds.length || 0) + 1, anhThat: m.anh ? `/ref/${m.anh}` : undefined,
              dataToi: toi.length ? toi : m.ke && m.toi ? [`${m.ke} (gắn theo nhãn «${m.toi}» khi hiển thị)`] : [],
              soBienThe: kho.khung.filter((f) => f.goc === key && !f.lan).length };
          }));
          ra.push({ id: l.id, ten: l.ten, vai: l.vai, nen: l.nen, mo: l.mo || undefined, buoc, phuongAn: kho.lan.filter((x) => x.tu === l.id).map(tomLan) });
        }
        if (a.hanh_trinh && !ra.length) throw LOI(`Không có hành trình «${a.hanh_trinh}»`);
        return [chu(ra)];
      });

    T('doc_man', 'Đọc HTML hiện hành của một màn (bản đang dùng sau «Thay màn», đã làm sạch như bàn web) + lịch sử phiên bản. Truyền v để đọc một phiên bản cụ thể (0 = bản trong mã).',
      { key: z.string(), v: z.number().int().min(0).optional(), chi_lich_su: z.boolean().optional().describe('true: chỉ trả lịch sử, không trả HTML') }, async (a) => {
        const hh = await hienHanh(req0, a.key, a.v ?? null);
        const meta = { key: a.key, ten: hh.m.ten, hanhTrinh: hh.m.lan, w: hh.w, h: hh.h, dangXem: `v${hh.v}`, dataToi: dataToi(hh.html), anhThat: hh.m.anh ? `/ref/${hh.m.anh}` : undefined, ...tomMf(hh.mf) };
        return a.chi_lich_su ? [chu(meta)] : [chu(meta), chu(hh.html)];
      });

    T('anh_man', 'Chụp ảnh PNG của một màn (render HTML đúng khung w×h bằng Chrome headless). Tuỳ chọn: phiên bản v, kèm ảnh chụp thật để đối chiếu (anh_that).',
      { key: z.string(), v: z.number().int().min(0).optional(), anh_that: z.boolean().optional().describe('Kèm ảnh chụp app thật (nếu màn có)'), ti_le: tiLe }, async (a) => {
        const hh = await hienHanh(req0, a.key, a.v ?? null);
        const ra = [chu(`«${hh.m.ten}» (${a.key}) v${hh.v} · ${hh.w}×${hh.h}`), anh(await chup(hh.html, hh.w, hh.h, a.ti_le || 1))];
        if (a.anh_that) { const t = await anhThat(req0, hh.m); ra.push(t ? chu(`Ảnh chụp thật: /ref/${hh.m.anh}`) : chu('Màn này không có ảnh chụp thật.')); if (t) ra.push(t); }
        return ra;
      });

    T('anh_hanh_trinh', 'Chụp ảnh mọi màn của một hành trình (hoặc một phương án của nó) — mặc định ghép thành MỘT ảnh hàng ngang có nhãn; ghep=false trả từng ảnh.',
      { hanh_trinh: z.string(), phuong_an: z.string().optional().describe('id phương án (pa-…) — dùng HTML các màn của phương án'), ghep: z.boolean().optional(), ti_le: z.number().min(0.2).max(2).optional().describe('Mặc định 0.5 khi ghép, 1 khi không') }, async (a) => {
        const l = await timHt(a.hanh_trinh);
        const kho = a.phuong_an ? await dsKho(req0) : null;
        if (a.phuong_an && !kho.lan.some((x) => x.id === a.phuong_an && x.tu === l.id)) throw LOI(`Không có phương án ${a.phuong_an} của ${l.id}`);
        const pb = await goiJ(req0, 'GET', '/api/phien-ban');
        const ds = await Promise.all(l.buoc.map(async (key) => {
          let html, w, h, nhan;
          const f = kho?.khung.find((x) => x.lan === a.phuong_an && x.goc === key);
          if (f) { const g = await docKhung(req0, f.id); html = g.html; w = g.w; h = g.h; nhan = `${key} · ${g.nhan || ''}`; }
          if (!html) { const hh = await hienHanh(req0, key, null, pb); html = hh.html; w = hh.w; h = hh.h; nhan = `${key} · ${hh.m.ten}`; }
          return { key, w, h, nhan, html };
        }));
        const ghepAnh = a.ghep !== false;
        const tl = a.ti_le || (ghepAnh ? 0.5 : 1);
        if (ghepAnh) { await Promise.all(ds.map(async (x) => { x.png = await chup(x.html, x.w, x.h, 1); })); return [chu(`Hành trình «${l.ten}»${a.phuong_an ? ` · phương án ${a.phuong_an}` : ''}: ${ds.map((x) => x.key).join(' → ')}`), anh(await ghep(ds, tl))]; }
        const ra = [];
        const pngs = await Promise.all(ds.map((x) => chup(x.html, x.w, x.h, tl)));
        ds.forEach((x, i) => { ra.push(chu(x.nhan)); ra.push(anh(pngs[i])); });
        return ra;
      });

    T('ds_bien_the', 'Liệt kê biến thể trong kho chung (mới nhất trước) và phương án hành trình. Lọc theo màn (key), hành trình, hoặc phương án.',
      { key: z.string().optional(), hanh_trinh: z.string().optional(), phuong_an: z.string().optional(), gioi: z.number().int().min(1).max(500).optional() }, async (a) => {
        const kho = await dsKho(req0);
        const keysHt = a.hanh_trinh ? new Set((await timHt(a.hanh_trinh)).buoc) : null;
        const khung = kho.khung.filter((f) => (!a.key || f.goc === a.key) && (!keysHt || keysHt.has(f.goc)) && (!a.phuong_an || f.lan === a.phuong_an))
          .sort((x, y) => (y.tSua || 0) - (x.tSua || 0)).slice(0, a.gioi || 60).map(tomKhung);
        const lan = kho.lan.filter((l) => (!a.hanh_trinh || l.tu === a.hanh_trinh) && (!a.phuong_an || l.id === a.phuong_an)).map(tomLan);
        return [chu({ khung, lan, tong: kho.khung.length })];
      });

    T('doc_bien_the', 'Đọc một biến thể: thông tin + HTML + ảnh render (mặc định có ảnh).',
      { id: z.string(), html: z.boolean().optional().describe('Mặc định true'), anh: z.boolean().optional().describe('Mặc định true'), ti_le: tiLe }, async (a) => {
        const f = await docKhung(req0, a.id);
        const ra = [chu(tomKhung(f))];
        if (a.html !== false) ra.push(chu(f.html || '(chưa có HTML)'));
        if (a.anh !== false && f.html) ra.push(anh(await chup(f.html, f.w, f.h, a.ti_le || 1)));
        return ra;
      });

    T('xoa_bien_the', 'Xoá (mềm — vào thùng rác 7 ngày) biến thể và/hoặc phương án hành trình (xoá phương án kéo theo các màn của nó). Qua tên miền khi khoá bảng cần mã chủ quản.',
      { ids: z.array(z.string()).optional(), phuong_an: z.array(z.string()).optional() }, async (a) => {
        if (!a.ids?.length && !a.phuong_an?.length) throw LOI('Cần ids hoặc phuong_an');
        const r = await goiJ(req0, 'POST', '/api/bien-the/xoa', { khung: a.ids || [], lan: a.phuong_an || [] });
        return [chu({ daXoa: r })];
      });

    T('thay_man', '«Thay màn»: đặt một biến thể (bien_the) hoặc một HTML (html + key) làm bản đang dùng của màn — thêm phiên bản mới, bản cũ vẫn trong lịch sử. HTML được làm sạch (lamSach) như bàn web.',
      { bien_the: z.string().optional(), key: z.string().optional(), html: z.string().optional(), nhan: z.string().optional(), y_tuong: z.string().optional() }, async (a) => {
        let key, than;
        if (a.bien_the) {
          const f = await docKhung(req0, a.bien_the);
          if (f.tt === 'dang' || f.tt === 'loi' || !f.html) throw LOI('Biến thể chưa xong/lỗi — không thay được');
          const m = await timMan(f.goc); key = f.goc;
          than = { html: await domGoi('lamSach', f.html), w: f.w, h: f.h, nhan: a.nhan || f.nhan || m.ten, yTuong: a.y_tuong ?? f.yTuong ?? '', nguon: f.lan ? 'pa' : f.suaTay ? 'sua' : 'bien', model: f.model || '', bt: f.id };
        } else {
          if (!a.key || !a.html) throw LOI('Cần bien_the, hoặc key + html');
          const hh = await hienHanh(req0, a.key); key = a.key;
          than = { html: await domGoi('lamSach', a.html), w: hh.w, h: hh.h, nhan: a.nhan || 'Thay qua MCP', yTuong: a.y_tuong || '', nguon: 'mcp', model: '' };
        }
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(key)}`, than);
        return [chu({ key, dangDung: `v${mf.hien}`, ...tomMf(mf) })];
      });

    T('khoi_phuc_phien_ban', 'Khôi phục một phiên bản cũ của màn (v=0 là bản trong mã) — ghi thành phiên bản mới, không xoá gì.',
      { key: z.string(), v: z.number().int().min(0) }, async (a) => {
        await timMan(a.key);
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(a.key)}`, { tu: a.v });
        return [chu({ key: a.key, dangDung: `v${mf.hien}`, ...tomMf(mf) })];
      });

    T('ds_gop_y', 'Liệt kê góp ý (mặc định bỏ góp ý «Đã xử lý») và đề xuất (mặc định chỉ đề xuất chờ duyệt) theo hành trình/màn, kèm các link góp ý /r/ đang mở. Cần quyền chủ quản.',
      { hanh_trinh: z.string().optional(), key: z.string().optional(), ca_da_xu_ly: z.boolean().optional() }, async (a) => {
        const r = await goiJ(req0, 'GET', '/api/review');
        const ht = a.hanh_trinh || (a.key ? (await timMan(a.key)).lan : null);
        const ra = { gopY: {}, deXuat: {}, link: r.chiaSe.filter((x) => !x.thuHoi && (!ht || x.ht === ht)).map((x) => ({ ma: x.ma, ht: x.ht, v: x.v, ghiChu: x.ghiChu, t: x.t })) };
        for (const [h, ds] of Object.entries(r.gopY || {})) {
          if (ht && h !== ht) continue;
          const g = ds.filter((x) => (a.ca_da_xu_ly || x.tt !== 'xong') && (!a.key || x.key === a.key)); if (g.length) ra.gopY[h] = g;
        }
        for (const [h, ds] of Object.entries(r.deXuat || {})) {
          if (ht && h !== ht) continue;
          const d = ds.filter((x) => (a.ca_da_xu_ly || x.tt === 'cho') && (!a.key || x.key === a.key)); if (d.length) ra.deXuat[h] = d;
        }
        return [chu(ra)];
      });

    T('them_gop_y', 'Thêm góp ý mới lên một màn (đi qua link góp ý /r/ của hành trình — mặc định link mới nhất đang mở; người không phải chủ quản phải đưa ma_link). Như trang /r/: audit ghi vai reviewer của link đó, giới hạn 30 góp ý/phút.',
      { key: z.string(), noi: z.string(), muc: z.enum(['loi', 'de-xuat', 'cau-hoi']).optional(), ten: z.string().optional(), ma_link: z.string().optional(), ghim: z.object({ x: z.number(), y: z.number() }).optional().describe('Vị trí ghim theo % khung (0–100)') }, async (a) => {
        const m = await timMan(a.key);
        let ma = a.ma_link;
        if (!ma) {
          const r = await goiJ(req0, 'GET', '/api/review');
          const ds = r.chiaSe.filter((x) => x.ht === m.lan && !x.thuHoi).sort((x, y) => y.v - x.v);
          if (!ds.length) throw LOI(`Hành trình ${m.lan} chưa có link góp ý đang mở — tạo «Chia sẻ góp ý» trên bàn trước`);
          ma = ds[0].ma;
        }
        if (!/^[a-f0-9]{32}$/.test(ma)) throw LOI('ma_link sai dạng');
        const g = await goiJ(req0, 'POST', `/api/review/r/${ma}/gop-y`, { key: a.key, noi: a.noi, muc: a.muc || 'de-xuat', ten: a.ten || tenNguoi(req0), ghim: a.ghim ? { x: a.ghim.x, y: a.ghim.y, sel: '' } : null });
        return [chu({ ht: m.lan, ...g, ma: undefined })];
      });

    T('tra_loi_gop_y', 'Chủ quản trả lời một góp ý.',
      { hanh_trinh: z.string(), id: z.string(), noi: z.string(), ten: z.string().optional() }, async (a) => [chu(await goiJ(req0, 'POST', `/api/review/gop-y/${encodeURIComponent(a.hanh_trinh)}/${encodeURIComponent(a.id)}/tl`, { noi: a.noi, ten: a.ten || tenNguoi(req0) }))]);

    T('doi_trang_thai_gop_y', 'Đổi trạng thái góp ý: «mo» (đang mở) hoặc «xong» (Đã xử lý).',
      { hanh_trinh: z.string(), id: z.string(), tt: z.enum(['mo', 'xong']) }, async (a) => [chu(await goiJ(req0, 'POST', `/api/review/gop-y/${encodeURIComponent(a.hanh_trinh)}/${encodeURIComponent(a.id)}/tt`, { tt: a.tt }))]);

    T('doc_de_xuat', 'Đọc một đề xuất thay đổi (biến thể do reviewer gửi) + HTML + ảnh render. Cần quyền chủ quản.',
      { hanh_trinh: z.string(), id: z.string(), html: z.boolean().optional(), anh: z.boolean().optional() }, async (a) => {
        const d = await goiJ(req0, 'GET', `/api/review/de-xuat/${encodeURIComponent(a.hanh_trinh)}/${encodeURIComponent(a.id)}`);
        const { html, ...meta } = d; const m = await timMan(d.key);
        const sach = await domGoi('lamSach', html);
        const ra = [chu(meta)];
        if (a.html !== false) ra.push(chu(sach));
        if (a.anh !== false) ra.push(anh(await chup(sach, d.w || m.w, d.h || m.h, 1)));
        return ra;
      });

    T('chap_nhan_de_xuat', '«Accept changes» một đề xuất: áp HTML đề xuất (đã làm sạch) lên màn gốc thành phiên bản mới, ghi tác giả, tự đóng góp ý gắn kèm.',
      { hanh_trinh: z.string(), id: z.string() }, async (a) => {
        const d = await goiJ(req0, 'GET', `/api/review/de-xuat/${encodeURIComponent(a.hanh_trinh)}/${encodeURIComponent(a.id)}`);
        const m = await timMan(d.key);
        const r = await goiJ(req0, 'POST', `/api/review/de-xuat/${encodeURIComponent(a.hanh_trinh)}/${encodeURIComponent(a.id)}/chap`, { html: await domGoi('lamSach', d.html), w: d.w || m.w, h: d.h || m.h });
        return [chu({ deXuat: r.deXuat, dangDung: `v${r.manifest?.hien}` })];
      });

    T('tu_choi_de_xuat', 'Từ chối một đề xuất (kèm lý do).',
      { hanh_trinh: z.string(), id: z.string(), ly_do: z.string().optional() }, async (a) => [chu(await goiJ(req0, 'POST', `/api/review/de-xuat/${encodeURIComponent(a.hanh_trinh)}/${encodeURIComponent(a.id)}/tu`, { lyDo: a.ly_do || '' }))]);

    T('nhat_ky', 'Đọc nhật ký audit gần đây (mới nhất trước; nội dung HTML lớn rút gọn). Lọc theo loại (tiền tố, vd «man.», «bien-the.»), người, màn, hành trình, ngày. Cần quyền chủ quản.',
      { gioi: z.number().int().min(1).max(300).optional(), loai: z.string().optional(), nguoi: z.string().optional(), key: z.string().optional(), hanh_trinh: z.string().optional(), tu: z.string().optional().describe('YYYY-MM-DD'), den: z.string().optional() }, async (a) => {
        const q = new URLSearchParams(); q.set('gioi', String(a.gioi || 30));
        for (const [k, v] of [['loai', a.loai], ['nguoi', a.nguoi], ['key', a.key], ['ht', a.hanh_trinh], ['tu', a.tu], ['den', a.den]]) if (v) q.set(k, v);
        const r = await goiJ(req0, 'GET', `/api/audit?${q}`);
        const gon = (o) => (o == null ? o : JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v === 'object' && v.$blob ? `[HTML ${v.n || '?'} ký tự]` : typeof v === 'string' && v.length > 300 ? `${v.slice(0, 300)}…` : v))));
        return [chu({ conNua: r.conNua, ds: r.ds.map((e) => ({ ngay: e.ngay, i: e.i, t: e.t, loai: e.loai, dt: e.dt, ai: { ten: e.ai?.ten, vai: e.ai?.vai, nguon: e.ai?.nguon, ma: e.ai?.ma }, ghiChu: e.ghiChu, truoc: gon(e.truoc), sau: gon(e.sau) })) })];
      });

    // ---------- tạo biến thể: bước 1 ngữ cảnh, bước 2 lưu ----------
    T('ngu_canh_bien_the', 'Bước 1 tạo biến thể MỘT màn: trả đúng ngữ cảnh bàn web gửi Claude — system prompt (Clay gương, gu Thanh, luật đo, quy tắc data-toi, danh sách asset), tin nhắn người dùng (HTML gốc + khung + ý + hướng khám phá cho biến thể k/n), kit CSS, ảnh màn hiện tại, góp ý đang mở của màn. Tự sinh HTML theo đó rồi gọi tao_bien_the.',
      { key: z.string().optional().describe('Màn gốc (dùng bản hiện hành)'), tu_bien_the: z.string().optional().describe('Hoặc: sinh tiếp từ một biến thể'), y_tuong: z.string().describe('Ý của Thanh cho biến thể'),
        so_bien_the: z.number().int().min(1).max(6).optional().describe('n — số biến thể định làm (mỗi biến thể một hướng khám phá)'), anh: z.boolean().optional().describe('Kèm ảnh màn hiện tại (mặc định true)'), kit_css: z.boolean().optional().describe('Kèm nội dung clay-kit.css (mặc định true)') }, async (a) => {
        const n = a.so_bien_the || 1;
        const ng = await nguonBienThe(req0, a.key, a.tu_bien_the);
        const sys = heThong(await assetsTxt(req0));
        const dot = Date.now().toString(36);
        const ra = [chu({ buoc: 'Bước 1/2', key: ng.key, cha: ng.cha, ten: ng.ten, w: ng.w, h: ng.h, n, dot, dataToiGoc: dataToi(ng.html),
          cachDung: `Với mỗi k=1..${n}: dùng [system] + [user khối 1] + [user khối 2 của k] làm prompt, sinh câu trả lời «Ý TƯỞNG: …» + một khối \`\`\`html\`\`\`; rồi gọi tao_bien_the { ${a.tu_bien_the ? `tu_bien_the: "${ng.cha}"` : `key: "${ng.key}"`}, y_tuong, k, n: ${n}, dot: "${dot}", tra_loi: <nguyên câu trả lời> } (hoặc html + nhan). Giữ data-toi đúng giá trị trên nút tương ứng.` }),
          chu(`[system]\n${sys}`)];
        for (let k = 1; k <= n; k++) {
          const user = loiNguoiDung({ y: a.y_tuong, html: ng.html, w: ng.w, h: ng.h, ten: ng.ten, k, n });
          if (k === 1) ra.push(chu(`[user khối 1 — giống nhau mọi k]\n${user[0]}`));
          ra.push(chu(`[user khối 2 — k=${k}/${n} · hướng: ${HUONG[(k - 1) % HUONG.length]}]\n${user[1]}`));
        }
        if (a.kit_css !== false) ra.push(chu(`[kit CSS /assets/clay-kit.css — tham khảo lớp có sẵn]\n${await kitCss()}`));
        ra.push(chu({ gopYDangMo: await gopYMo(req0, ng.m.lan, ng.key) }));
        if (a.anh !== false) { ra.push(chu(`[ảnh màn nguồn ${ng.w}×${ng.h}]`)); ra.push(anh(await chup(ng.html, ng.w, ng.h, 1))); }
        return ra;
      });

    T('tao_bien_the', 'Bước 2: lưu một biến thể do bạn sinh vào kho biến thể chung (ai đang mở bàn thấy ngay). HTML được làm sạch bằng lamSach như web. Trả id, so khớp data-toi và ảnh render để tự kiểm.',
      { key: z.string().optional(), tu_bien_the: z.string().optional(), y_tuong: z.string(), html: z.string().optional(), tra_loi: z.string().optional().describe('Nguyên câu trả lời «Ý TƯỞNG: …» + ```html``` (thay cho html + nhan)'),
        nhan: z.string().optional(), k: z.number().int().min(1).max(6).optional(), n: z.number().int().min(1).max(6).optional(),
        dot: z.string().regex(/^[a-z0-9]{4,20}$/).optional().describe('Mã đợt (lấy từ ngu_canh_bien_the) — các biến thể k=1..n cùng đợt xếp chung một hàng như bàn web'), model: z.string().optional().describe('Model đã sinh (vd claude-opus-…)'), anh: z.boolean().optional() }, async (a) => {
        let html = a.html, nhan = a.nhan;
        if (!html && a.tra_loi) { const t = tachKetQua(a.tra_loi); if (t.html && !t.xong) throw LOI('Câu trả lời bị cắt (khối ```html chưa đóng) — sinh lại đủ rồi gửi'); html = t.html; nhan ||= t.nhan; }
        if (!html || !html.trim()) throw LOI('Thiếu HTML (html hoặc tra_loi có khối ```html```)');
        const ng = await nguonBienThe(req0, a.key, a.tu_bien_the);
        const sach = await domGoi('lamSach', html);
        const kho = await dsKho(req0);
        const k = a.k || 1, n = Math.max(a.n || 1, k);
        let dot = a.dot || Date.now().toString(36);
        if (kho.khung.some((f) => f.id === `bt-${dot}-${k}`)) { if (a.dot) throw LOI(`Đợt ${a.dot} đã có biến thể k=${k} (bt-${a.dot}-${k}) — dùng k khác`); while (kho.khung.some((f) => f.id === `bt-${dot}-${k}`)) dot += 'm'; }
        const f = { id: `bt-${dot}-${k}`, loai: 'bien', goc: ng.key, cha: ng.cha, dot, k, n, yTuong: a.y_tuong, w: ng.w, h: ng.h, html: sach, tt: 'xong', nhan: (nhan || `Biến thể ${k}`).slice(0, 200), model: (a.model || 'mcp').slice(0, 60), tSuaCu: 0 };
        const r = await goiJ(req0, 'POST', '/api/bien-the/ghi', { khung: [f], lan: [] });
        if (!r.khung?.length) throw LOI(`Máy chủ không nhận: ${(r.loi || []).join('; ') || `xung đột — ${f.id} đã có (đợt/k trùng), dùng k hoặc dot khác`}`);
        const ra = [chu({ id: f.id, key: ng.key, cha: ng.cha, nhan: f.nhan, w: f.w, h: f.h, lamSachDoi: sach !== html, lienKet: await soLienKet(ng.html, sach) })];
        if (a.anh !== false) { try { ra.push(anh(await chup(sach, f.w, f.h, 1))); } catch (e) { ra.push(chu(`(Đã lưu; chỉ chụp ảnh lỗi: ${e.message} — gọi doc_bien_the để xem ảnh)`)); } }
        return ra;
      });

    T('ngu_canh_hanh_trinh', 'Bước 1 tạo phương án cho CẢ hành trình: system prompt + tin nhắn người dùng (mọi màn, HTML, kích thước, hành động sang bước kế, ý + hướng) như bàn web, kèm góp ý đang mở và (tuỳ chọn) ảnh ghép hành trình. Sinh xong gọi tao_phuong_an.',
      { hanh_trinh: z.string(), tu_phuong_an: z.string().optional().describe('Dùng HTML của một phương án làm nguồn'), y_tuong: z.string(), so_phuong_an: z.number().int().min(1).max(6).optional(), anh: z.boolean().optional().describe('Kèm ảnh ghép hành trình (mặc định false)') }, async (a) => {
        const l = await timHt(a.hanh_trinh); const n = a.so_phuong_an || 1;
        const buoc = await buocNguon(l, a.tu_phuong_an);
        const sys = heThong(await assetsTxt(req0));
        const ra = [chu({ buoc: 'Bước 1/2', hanhTrinh: l.id, ten: l.ten, man: buoc.map((b) => ({ key: b.key, w: b.w, h: b.h, dataToi: dataToi(b.html) })), n,
          cachDung: `Với mỗi k=1..${n}: sinh câu trả lời đúng định dạng («Ý TƯỞNG: …», rồi mỗi màn «MÀN: <key>» + khối \`\`\`html\`\`\`) rồi gọi tao_phuong_an { hanh_trinh: "${l.id}"${a.tu_phuong_an ? `, tu_phuong_an: "${a.tu_phuong_an}"` : ''}, y_tuong, tra_loi: <nguyên câu trả lời> } (hoặc man: [{key, html}] + nhan).` }), chu(`[system]\n${sys}`)];
        for (let k = 1; k <= n; k++) {
          const user = loiHanhTrinh({ y: a.y_tuong, lan: l, buoc, k, n });
          if (k === 1) ra.push(chu(`[user khối 1 — giống nhau mọi k]\n${user[0]}`));
          ra.push(chu(`[user khối 2 — k=${k}/${n}]\n${user[1]}`));
        }
        ra.push(chu({ gopYDangMo: await gopYMo(req0, l.id, null) }));
        if (a.anh) { await Promise.all(buoc.map(async (b) => { b.png = await chup(b.html, b.w, b.h, 1); })); ra.push(anh(await ghep(buoc.map((b) => ({ ...b, nhan: `${b.key} · ${b.ten}` })), 0.5))); }
        return ra;
      });

    T('tao_phuong_an', 'Bước 2: lưu một phương án cho CẢ hành trình (một hàng mới dưới hàng gốc, mỗi màn một khung) vào kho chung. Cần HTML cho MỌI màn của hành trình. Trả id + ảnh ghép.',
      { hanh_trinh: z.string(), tu_phuong_an: z.string().optional(), y_tuong: z.string(), tra_loi: z.string().optional(), man: z.array(z.object({ key: z.string(), html: z.string() })).optional(),
        nhan: z.string().optional(), model: z.string().optional(), anh: z.boolean().optional() }, async (a) => {
        const l = await timHt(a.hanh_trinh);
        let man = a.man || [], nhan = a.nhan;
        if (!man.length && a.tra_loi) { const t = tachHanhTrinh(a.tra_loi); const cut = t.man.filter((x) => !x.xong).map((x) => x.key); if (cut.length) throw LOI(`Câu trả lời bị cắt ở màn: ${cut.join(', ')} — sinh lại đủ rồi gửi`); man = t.man; nhan ||= t.nhan; }
        const theoKey = new Map(man.filter((x) => x.html?.trim()).map((x) => [x.key, x.html]));
        const thieu = l.buoc.filter((k) => !theoKey.has(k)); const la = [...theoKey.keys()].filter((k) => !l.buoc.includes(k));
        if (thieu.length) throw LOI(`Thiếu HTML cho màn: ${thieu.join(', ')}${la.length ? ` · key lạ: ${la.join(', ')}` : ''}`);
        const buoc = await buocNguon(l, a.tu_phuong_an);
        const kho = await dsKho(req0);
        const dot = Date.now().toString(36);
        const soMoi = Math.max(0, ...kho.lan.filter((b) => b.tu === l.id).map((b) => b.k || 0)) + 1;
        let id = `pa-${dot}-1`; while (kho.lan.some((x) => x.id === id)) id += 'm';
        const lan = { id, tu: l.id, nguon: a.tu_phuong_an || l.id, buoc: l.buoc, k: soMoi, n: 1, yTuong: a.y_tuong, tt: 'xong', model: (a.model || 'mcp').slice(0, 60), nhan: (nhan || `Phương án ${soMoi}`).slice(0, 200), tSuaCu: 0 };
        const khung = [], lk = {};
        for (const b of buoc) {
          const sach = await domGoi('lamSach', theoKey.get(b.key));
          khung.push({ id: `${id}-${b.key}`, loai: 'bien', lan: id, goc: b.key, cha: b.key, dot, k: soMoi, w: b.w, h: b.h, html: sach, tt: 'xong', yTuong: a.y_tuong, model: lan.model, tSuaCu: 0 });
          const s = await soLienKet(b.html, sach); if (s.thieu.length || s.keyLa.length) lk[b.key] = s;
        }
        const r = await goiJ(req0, 'POST', '/api/bien-the/ghi', { lan: [lan], khung });
        if (!r.lan?.length || r.khung?.length !== khung.length) throw LOI(`Máy chủ không nhận đủ: ${(r.loi || []).join('; ') || 'xung đột'}`);
        const ra = [chu({ id, hanhTrinh: l.id, k: soMoi, nhan: lan.nhan, khung: khung.map((f) => f.id), lienKetLech: lk })];
        if (a.anh !== false) {
          try { const ds = await Promise.all(khung.map(async (f) => ({ w: f.w, h: f.h, nhan: f.goc, png: await chup(f.html, f.w, f.h, 1) }))); ra.push(anh(await ghep(ds, 0.5))); }
          catch (e) { ra.push(chu(`(Đã lưu; chỉ chụp ảnh lỗi: ${e.message} — gọi anh_hanh_trinh với phuong_an để xem)`)); }
        }
        return ra;
      });

    async function buocNguon(l, tuPa) {
      const { MAN } = await taiMan();
      const kho = tuPa ? await dsKho(req0) : null;
      if (tuPa && !kho.lan.some((x) => x.id === tuPa && x.tu === l.id)) throw LOI(`Không có phương án ${tuPa} của ${l.id}`);
      const pb = await goiJ(req0, 'GET', '/api/phien-ban');
      return Promise.all(l.buoc.map(async (key) => {
        const hh = await hienHanh(req0, key, null, pb); let html = hh.html;
        const f = kho?.khung.find((x) => x.lan === tuPa && x.goc === key);
        if (f) { const g = await docKhung(req0, f.id); if (g.html) html = g.html; }
        return { key, ten: MAN[key].ten, w: hh.w, h: hh.h, html, toi: MAN[key].toi };
      }));
    }
    return s;
  }

  // ================= cửa /mcp =================
  async function xuLy(req, res) {
    const loiRpc = (ma, msg, http = 400) => { res.writeHead(http, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: ma, message: msg }, id: null })); };
    // chống DNS rebinding: Host phải là 127.0.0.1/localhost hoặc tên miền tin cậy; trình duyệt gửi Origin thì Origin phải trùng Host tin cậy
    if (!hostHopLe(req)) return loiRpc(-32000, 'Host không hợp lệ', 403);
    if ((req.headers.origin || req.headers['sec-fetch-site']) && !C.hopLeNguon(req)) return loiRpc(-32000, 'Nguồn không hợp lệ', 403);
    // mật khẩu MCP: qua tên miền bắt buộc Bearer <maMcp> (127.0.0.1 gõ thẳng thì mở)
    if (!C.kiemMaMcp(req)) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Cần mật khẩu MCP: header «Authorization: Bearer <maMcp>»' }, id: null })); }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Chỉ hỗ trợ POST (stateless)' }, id: null })); }
    let body;
    try { body = JSON.parse(await C.docThan(req, THAN_MCP)); } catch (e) { return loiRpc(e.ma === 413 ? -32000 : -32700, e.ma === 413 ? 'Yêu cầu quá lớn' : 'Parse error', e.ma === 413 ? 413 : 400); }
    const srv = taoServer(req);
    const tr = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { tr.close().catch(() => {}); srv.close().catch(() => {}); });
    await srv.connect(tr);
    await tr.handleRequest(req, res, body);
  }

  return { xuLy, trang };
}
