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
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { heThong, loiNguoiDung, loiHanhTrinh, tachKetQua, tachHanhTrinh, HUONG } from './web/prompt.js';
import { vanBanAssets } from './web/claude.js';
import { taiHanhTrinh } from './web/hanh-trinh/index.js';
import { goiYDungChung } from './web/dung-chung.js';
import { ghepManThem, khungTrong } from './web/man-them.js';

const CHROME = process.env.BS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RANH_DONG = 120000;            // Chrome rảnh bao lâu thì đóng
const SO_TRANG = 3;                  // số trang chụp cùng lúc
const THAN_MCP = 48 * 1024 * 1024;   // một yêu cầu MCP (tao_phuong_an mang HTML nhiều màn)
const CSP_ANH = ["default-src 'self'", "script-src 'none'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:", "media-src 'none'", "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
const CSP_DOM = "default-src 'none'; script-src 'self'";
const KEY = /^[a-z0-9][a-z0-9-]{0,79}$/;
const sha1 = (...x) => crypto.createHash('sha1').update(x.join('\0')).digest('hex');
const dataToi = (html) => [...new Set([...String(html || '').matchAll(/data-toi="([^"]*)"/g)].map((m) => m[1]))];
const LOI = (msg) => Object.assign(new Error(msg), { mcp: true });

// Móc riêng của nền tảng (C.*, mặc định = bản Mac): layWeb(u) đọc tệp web/ (Cloudflare: ASSETS); moTrinh() mở trình duyệt puppeteer
// (Cloudflare: Browser Rendering); urlTrang(ma) + trangHopLe(req): trang chụp một lần; chuanBiTrang(pg): vd. đặt cookie phiên để trang tải /claude.js, ảnh;
// anhByte/domByte/ranhDong: cỡ cache và thời gian rảnh trước khi đóng trình duyệt.
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
  const layWeb = C.layWeb || (async (u) => {
    const t = path.resolve(C.WEB, String(u).replace(/^\/+/, ''));
    if (!t.startsWith(C.WEB + path.sep)) throw new Error('ngoài web/');
    const s = await fs.promises.readFile(t, 'utf8');
    return { ok: true, json: async () => JSON.parse(s), text: async () => s };
  });
  const gocCache = new Map();
  let manP = null, manLuc = 0, mtKy = '';
  function taiMan() { // nạp lại sau 30 giây (web/that/ có thể được chụp lại khi máy chủ đang chạy) hoặc khi màn thêm đổi; lần nạp thiếu tệp hành trình không được giữ
    const mt = C.manThem ? C.manThem() : { man: {}, thuTu: {} }; const ky = C.manThemKy ? String(C.manThemKy()) : JSON.stringify(mt); // dấu phiên bản kho (không stringify cả kho mỗi lần)
    if (manP && (Date.now() - manLuc > 30000 || ky !== mtKy)) manP = null;
    if (!manP) { manLuc = Date.now(); mtKy = ky; gocCache.clear(); manP = (async () => {
      const { ds: ds0, loi } = await taiHanhTrinh(layWeb);
      void loi; // tệp hành trình lỗi: mô-đun ESM lỗi bị Node giữ — sửa xong phải khởi động lại máy chủ (như keyMan)
      const ds = ghepManThem(ds0, mt); // + màn thêm trên bàn (them: true; ke = màn kế THEO MÃ — nút gắn theo nhãn bước)
      const LAN = [], MAN = {};
      for (const h of ds) {
        if (!KEY.test(h.id)) continue;
        LAN.push({ id: h.id, vai: h.vai, nen: h.nen, ten: h.ten, mo: h.mo || '', buoc: h.buoc.map((b) => b.key), ma: h.buoc.filter((b) => !b.them).map((b) => b.key), goc: true });
        h.buoc.forEach((b, i) => { MAN[b.key] = { key: b.key, ten: b.ten, w: b.w, h: b.h, html: b.html, anh: b.anh || '', toi: b.toi || '', lan: h.id, buoc: i, ke: b.ke0 || '', ...(b.them ? { them: true } : {}) }; });
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
    let html, tho;
    if (muc?.tep) {
      const r = await goiJ(req0, 'GET', `/api/phien-ban/${encodeURIComponent(key)}/${muc.tep}`);
      html = tho = await domGoi('lamSach', r.html);
    } else { html = await htmlGoc(m); tho = m.html; }
    if (mf.dc) html = await domGoi('apLop', muc?.tep ? tho : html, JSON.stringify(mf.dc.lop || { tuDong: true })); // màn dùng chung: liên kết riêng của luồng này (cả v0)
    if ((muc?.tep || mf.dc) && m.ke && m.toi && !/data-toi=/.test(html)) { const { MAN } = await taiMan(); html = await domGoi('ganToi', html, m.toi, m.ke, MAN[m.ke]?.ten || ''); }
    return { m, html, tho, w: muc?.w || m.w, h: muc?.h || m.h, v: vv, mf };
  }
  // màn dùng chung: nhóm + các màn cùng nhóm ở hành trình khác (cho doc_man / thay_man / ngu_canh_bien_the)
  async function dungChungCua(key, mf) {
    if (!mf?.dc) return undefined;
    const { MAN, LAN } = await taiMan(); const tenHt = (id) => LAN.find((l) => l.id === id)?.ten || id;
    return { nhom: mf.dc.id, voi: mf.dc.ds.filter((k) => k !== key).map((k) => ({ key: k, ten: MAN[k]?.ten || k, hanhTrinh: MAN[k]?.lan, tenHanhTrinh: tenHt(MAN[k]?.lan) })),
      lienKet: mf.dc.lop?.tuDong ? 'tự gắn theo nhãn bước' : 'riêng của luồng này (sua_lien_ket chỉ đổi luồng này)',
      ghiChu: 'Đổi nội dung màn này (thay_man, khôi phục…) thì mọi màn cùng nhóm đổi theo; liên kết data-toi giữ riêng từng luồng.' };
  }
  const toiCuaLop = (lop) => (lop && !lop.tuDong ? [...new Set((lop.ds || []).map((x) => x.toi))] : []);
  const daXoaMf = (mf) => !!mf?.ds?.find((x) => x.v === mf.hien)?.xoa; // màn đã bị chủ quản xoá khỏi hành trình
  // Liên kết hỏng trên cả bàn: nút (data-toi) của màn CÒN trong hành trình trỏ tới màn không có / đã xoá. chiToi: chỉ nút trỏ tới màn này.
  async function lienKetHong(req0, chiToi = '') {
    const { LAN, MAN } = await taiMan(); const pb = await goiJ(req0, 'GET', '/api/phien-ban');
    const hongK = (k) => !!k && (!MAN[k] || daXoaMf(pb[k])); // data-toi="" không tính
    const keys = [...new Set(LAN.flatMap((l) => l.buoc))].filter((k) => !daXoaMf(pb[k]));
    const ra = [];
    let con = 0; const cho = []; // tối đa 6 màn cùng lúc (đọc tệp + Chrome dùng chung)
    const luot = async (fn) => { if (con >= 6) await new Promise((r) => cho.push(r)); con++; try { return await fn(); } finally { con--; cho.shift()?.(); } };
    await Promise.all(keys.map((key) => luot(async () => {
      const m = MAN[key]; const mf = pb[key]; const muc = mf?.ds.find((x) => x.v === mf.hien);
      let tho = m.html;
      if (muc?.tep) { try { tho = (await goiJ(req0, 'GET', `/api/phien-ban/${encodeURIComponent(key)}/${muc.tep}`)).html; } catch { return; } }
      let toi = mf?.dc ? toiCuaLop(mf.dc.lop) : dataToi(tho); // màn dùng chung: liên kết nằm ở lớp riêng của luồng
      if (!toi.length && (mf?.dc ? mf.dc.lop?.tuDong : !/data-lk-sua/.test(tho)) && m.ke && m.toi) toi = [m.ke]; // nút gắn theo nhãn bước khi hiển thị
      if (!toi.some((k) => hongK(k) && (!chiToi || k === chiToi))) return; // lọc rẻ bằng regex trước, chỉ màn có hỏng mới dựng DOM
      const hh = await hienHanh(req0, key, null, pb);
      const nut = JSON.parse(await domGoi('dsLienKet', hh.html, false)).filter((x) => hongK(x.toi) && (!chiToi || x.toi === chiToi));
      if (nut.length) ra.push({ key, ten: m.ten, hanhTrinh: m.lan, v: hh.v, nut: nut.map((x) => ({ phan_tu: x.i, chu: x.chu, toi: x.toi, ly_do: MAN[x.toi] ? 'màn đích đã bị xoá' : 'màn đích không còn' })) });
    })));
    return ra.sort((a, b) => a.key.localeCompare(b.key));
  }
  const tomMf = (mf) => ({ hien: mf.hien || 0, lichSu: [{ v: 0, nhan: 'bản trong mã' }, ...mf.ds.map((x) => ({ v: x.v, t: x.t, nhan: x.nhan, nguon: x.nguon, model: x.model || undefined, tu: x.tu, tacGia: x.tacGia, yTuong: x.yTuong ? String(x.yTuong).slice(0, 200) : undefined, w: x.w, h: x.h }))] });

  // ================= Chrome headless dùng chung =================
  let trinh = null, moTrinh = null, henDong = null, dangDung = 0, domTrang = null, domP = null, thuMucTrinh = '';
  const TRANG = new Map(); // mã → { html, csp, het }
  function datTrang(html, csp) {
    const ma = crypto.randomBytes(16).toString('hex');
    TRANG.set(ma, { html, csp, het: Date.now() + 120000 });
    for (const [k, v] of TRANG) if (v.het < Date.now()) TRANG.delete(k);
    return C.urlTrang ? C.urlTrang(ma) : `http://127.0.0.1:${C.cong()}/__mcp/trang/${ma}`;
  }
  function trang(req, res, ma) { // chỉ Chrome của chính máy chủ (loopback, không qua tunnel) — mã dùng một lần
    const sock = req.socket.remoteAddress || '';
    const t = /^[a-f0-9]{32}$/.test(ma) ? TRANG.get(ma) : null;
    if (!t || (C.trangHopLe ? !C.trangHopLe(req) : !laLoopbackHost(req.headers.host) || !/^(127\.|::1$|::ffff:127\.)/.test(sock) || req.headers['cf-ray'] || req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'])) {
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
    if (trinh && (trinh.connected ?? trinh.isConnected?.())) return trinh;
    if (!moTrinh && C.moTrinh) moTrinh = (async () => { // nền tảng tự mở trình duyệt (Cloudflare Browser Rendering)
      const b = await C.moTrinh();
      b.on('disconnected', () => { if (trinh === b) { trinh = null; domTrang = null; domP = null; } });
      trinh = b; return b;
    })().finally(() => { moTrinh = null; });
    if (!moTrinh) moTrinh = (async () => {
      const os = await import('node:os');
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
  if (!C.moTrinh) process.on('exit', tatChrome);
  function henTat() {
    clearTimeout(henDong);
    henDong = setTimeout(() => { if (dangDung) return henTat(); const b = trinh; trinh = null; domTrang = null; domP = null; if (b) Promise.race([b.close(), new Promise((_, h) => setTimeout(h, 10000).unref?.())]).catch(() => giet(b)); }, C.ranhDong || RANH_DONG);
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
      return await voiTrinh(async (b) => { const pg = await b.newPage(); try { await C.chuanBiTrang?.(pg); return await fn(pg); } finally { pg.close().catch(() => {}); } });
    } finally { const ke = hangCho.shift(); if (ke) ke(); else dangChup--; }
  }
  // trang chạy NGUYÊN mã web (lamSach của web/claude.js, ganToi của web/gan-toi.js)
  const domCache = new Map(); let domByte = 0; // kết quả lamSach/ganToi theo băm đầu vào (đọc lặp không chạy lại Chrome)
  async function domGoi(ten, ...a) {
    const k = sha1(ten, ...a);
    if (domCache.has(k)) return domCache.get(k);
    const ra = await domChay(ten, ...a);
    if (!domCache.has(k)) { domCache.set(k, ra); domByte += ra.length; while (domByte > (C.domByte || 40e6) && domCache.size > 1) { const [k0, v0] = domCache.entries().next().value; domCache.delete(k0); domByte -= v0.length; } }
    return ra;
  }
  async function domChay(ten, ...a) {
    return voiTrinh(async (b) => {
      if (!domTrang || domTrang.isClosed()) {
        if (!domP) domP = (async () => {
          const pg = await b.newPage(); await C.chuanBiTrang?.(pg);
          await pg.goto(datTrang('<!doctype html><meta charset="utf-8"><title>dom</title>', CSP_DOM));
          await pg.evaluate("(async () => { const [cl, gt] = await Promise.all([import('/claude.js'), import('/gan-toi.js')]); window.__bs = { lamSach: cl.lamSach, ganToi: gt.ganToi, dsLienKet: (h, t) => JSON.stringify(gt.dsLienKet(h, t)), datLienKet: gt.datLienKet, layLop: (h) => JSON.stringify(gt.layLop(h)), apLop: (h, l) => gt.apLop(h, JSON.parse(l)) }; })()"); // chuỗi: chạy trong Chrome, bộ gói Worker không được đụng vào import()
          domTrang = pg; return pg;
        })().finally(() => { domP = null; });
        await domP;
      }
      return domTrang.evaluate((t, x) => window.__bs[t](...x), ten, a);
    });
  }
  const anhCache = new Map(); let anhByte = 0; const ANH_BYTE = C.anhByte || 80 * 1024 * 1024; // cache ảnh giới hạn theo tổng byte
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
  const kitCss = () => layWeb('/kit/clay-kit.css').then((r) => r.text()).catch(() => '');

  // ================= máy chủ MCP cho một yêu cầu (stateless) =================
  function taoServer(req0) {
    const s = new McpServer({ name: 'aiigrow-figma', version: '1.0.0' }, {
      instructions: 'Bàn brainstorm giao diện AiiGrow (hành trình → màn → biến thể). Đọc: ds_hanh_trinh, doc_man, anh_man, anh_hanh_trinh, ds_bien_the, doc_bien_the, ds_gop_y, doc_de_xuat, nhat_ky. '
        + 'Tạo biến thể 2 bước (máy chủ không gọi AI): ngu_canh_bien_the → bạn tự sinh HTML theo đúng system prompt + tin nhắn trả về → tao_bien_the (kèm html hoặc nguyên câu trả lời «Ý TƯỞNG…```html```»). Cả hành trình: ngu_canh_hanh_trinh → tao_phuong_an. '
        + 'Liên kết giữa màn: ds_lien_ket, ds_lien_ket_hong, sua_lien_ket (tạo/đổi/gỡ). Xoá/khôi phục màn (chỉ chủ quản; màn thêm trên bàn thì ai thêm được cũng xoá được): xoa_man, khoi_phuc_man. '
        + 'Thêm màn mới vào hành trình (trống / nhân bản / HTML — lưu ở kho, có ngay không cần deploy): them_man; đổi tên/đổi chỗ màn thêm: sua_man. '
        + 'Màn dùng chung (một nội dung cho nhiều luồng, liên kết riêng từng luồng): ds_dung_chung (nhóm + gợi ý gộp), gop_dung_chung, tach_dung_chung (chủ quản). '
        + 'Ghi (thay_man, khoi_phuc_phien_ban, sua_lien_ket, xoa_bien_the, chap_nhan_de_xuat…) cần quyền chủ quản như bàn web: 127.0.0.1 tự là chủ quản; qua tên miền cần mật khẩu MCP (Authorization: Bearer <maMcp>) và, cho thao tác của chủ quản, thêm header x-bs-chu-quan.',
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
            const toi = mf?.dc ? toiCuaLop(mf.dc.lop) : dataToi(html);
            const tuGan = mf?.dc ? !!mf.dc.lop?.tuDong : !toi.length && !/data-lk-sua/.test(html);
            return { key, ten: m.ten, ...(m.them ? { themTrenBan: true } : {}), ...(muc?.xoa ? { daXoa: true } : {}), w: muc?.w || m.w, h: muc?.h || m.h, phienBan: mf?.hien || 0, soPhienBan: (mf?.ds.length || 0) + 1, anhThat: m.anh ? `/ref/${m.anh}` : undefined,
              ...(mf?.dc ? { dungChung: { nhom: mf.dc.id, voi: mf.dc.ds.filter((k) => k !== key) } } : {}),
              dataToi: !tuGan ? toi : m.ke && m.toi ? [`${m.ke} (gắn theo nhãn «${m.toi}» khi hiển thị)`] : [],
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
        const meta = { key: a.key, ten: hh.m.ten, ...(daXoaMf(hh.mf) ? { daXoa: true } : {}), hanhTrinh: hh.m.lan, w: hh.w, h: hh.h, dangXem: `v${hh.v}`, dataToi: dataToi(hh.html), anhThat: hh.m.anh ? `/ref/${hh.m.anh}` : undefined,
          dungChung: await dungChungCua(a.key, hh.mf), ...tomMf(hh.mf) };
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
        const ds = await Promise.all(l.buoc.filter((key) => !daXoaMf(pb[key])).map(async (key) => { // màn đã xoá khỏi hành trình: bỏ qua như Play
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

    T('thay_man', '«Thay màn»: đặt một biến thể (bien_the) hoặc một HTML (html + key) làm bản đang dùng của màn — thêm phiên bản mới, bản cũ vẫn trong lịch sử. HTML được làm sạch (lamSach) như bàn web. Thay bằng bien_the thành công thì biến thể đó rời bàn (xoá mềm vào thùng rác, chỗ của nó để trống, các biến thể khác giữ nguyên); HTML của nó nằm trong phiên bản màn nên khoi_phuc_phien_ban vẫn dùng được. Màn trong phương án hành trình thì giữ nguyên.',
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
        const pb0 = await goiJ(req0, 'GET', '/api/phien-ban');
        if (pb0[key]?.dc && !pb0[key].dc.lop?.tuDong) { const lop = JSON.parse(await domGoi('layLop', than.html)); if (lop.ds?.length) than.lop = lop; } // nút của luồng này theo bản mới
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(key)}`, than);
        const { btXoa, dcAnhHuong, dcLoi, ...m0 } = mf;
        return [chu({ key, dangDung: `v${m0.hien}`, ...(btXoa ? { bienTheDaGo: btXoa } : {}), ...(m0.dc ? { dungChung: await (async () => { const d = await dungChungCua(key, m0); const da = new Set(dcAnhHuong || []); return { ...d, daCapNhat: (d?.voi || []).filter((x) => da.has(x.key)).map((x) => `${x.tenHanhTrinh} › ${x.ten} (${x.key})`), ...(dcLoi ? { chuaCapNhat: dcLoi } : {}) }; })() } : {}), ...tomMf(m0) })];
      });

    T('khoi_phuc_phien_ban', 'Khôi phục một phiên bản cũ của màn (v=0 là bản trong mã) — ghi thành phiên bản mới, không xoá gì.',
      { key: z.string(), v: z.number().int().min(0) }, async (a) => {
        await timMan(a.key);
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(a.key)}`, { tu: a.v });
        return [chu({ key: a.key, dangDung: `v${mf.hien}`, ...tomMf(mf) })];
      });

    T('xoa_man', 'Xoá (mềm) một màn khỏi hành trình — CHỈ chủ quản (như nút 🗑 trên bàn web); màn thêm trên bàn (them_man) thì ai thêm được cũng xoá được. Ghi thành phiên bản mới có cờ xoá (audit man.xoa), lịch sử giữ nguyên; Play, Quy trình, link góp ý /r/ bỏ qua màn này; các nút dẫn tới nó thành «liên kết hỏng» (trả về luôn — nối lại bằng sua_lien_ket). Khôi phục: khoi_phuc_man.',
      { key: z.string(), ly_do: z.string().optional() }, async (a) => {
        await timMan(a.key);
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(a.key)}`, { xoa: true, lyDo: a.ly_do || '' });
        let hong; try { hong = await lienKetHong(req0, a.key); } catch (e) { hong = `chưa liệt kê được (${e.message}) — gọi ds_lien_ket_hong`; } // màn ĐÃ xoá: không báo lỗi vì bước phụ
        return [chu({ key: a.key, daXoa: true, dangDung: `v${mf.hien}`, lienKetHong: hong })];
      });

    T('khoi_phuc_man', 'Khôi phục một màn đã bị xoá khỏi hành trình — CHỈ chủ quản (màn thêm trên bàn: như xoa_man). Ghi thành phiên bản mới (audit man.khoi-phuc-xoa) dùng đúng HTML trước khi xoá; liên kết tới màn này hết hỏng.',
      { key: z.string() }, async (a) => {
        await timMan(a.key);
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(a.key)}`, { khoiPhucXoa: true });
        return [chu({ key: a.key, daXoa: false, dangDung: `v${mf.hien}`, ...tomMf(mf) })];
      });

    // vi_tri: 'dau' | 'cuoi' (mặc định) | key màn đứng trước ⇒ «sau» của /api/man-them
    const sauTu = (v) => (v == null || v === 'cuoi' ? null : v === 'dau' ? '' : String(v));
    T('them_man', 'Thêm một màn MỚI vào hành trình (như nút «+ Thêm màn» trên bàn): lưu ở kho dữ liệu, mọi bàn thấy ngay (realtime), không cần deploy. Nội dung theo một trong ba cách: '
      + 'khung trống (chỉ tiêu đề — mặc định), nhan_ban_tu = key màn có sẵn (chép bản hiện hành, kể cả nút data-toi), hoặc html (được làm sạch lamSach như biến thể). '
      + 'Màn mới dùng được mọi thứ như màn gốc: thay_man, biến thể, góp ý, sua_lien_ket (nối data-toi tới/từ màn này), dùng chung, xoa_man. Bảng khoá (khoaBang) thì cần mã chủ quản.',
      { hanh_trinh: z.string(), ten: z.string().min(1).max(80), vi_tri: z.string().optional().describe("'dau' | 'cuoi' (mặc định) | key màn mà màn mới đứng ngay sau"),
        html: z.string().optional(), nhan_ban_tu: z.string().optional().describe('key màn có sẵn để nhân bản'), w: z.number().int().min(200).max(4999).optional(), h: z.number().int().min(200).max(19999).optional() }, async (a) => {
        const l = await timHt(a.hanh_trinh);
        if (a.html && a.nhan_ban_tu) throw LOI('Chọn MỘT trong html hoặc nhan_ban_tu');
        let than;
        if (a.nhan_ban_tu) {
          const hh = await hienHanh(req0, a.nhan_ban_tu);
          than = { cach: 'nhan-ban', tu: a.nhan_ban_tu, html: hh.html, w: a.w || hh.w, h: a.h || hh.h };
        } else {
          const { MAN } = await taiMan(); const mau = MAN[l.buoc[0]] || {}; // kích thước mặc định: màn đầu của hành trình
          than = { cach: a.html ? 'html' : 'trong', html: a.html ? await domGoi('lamSach', a.html) : khungTrong(a.ten), w: a.w || mau.w || 390, h: a.h || mau.h || 844 };
        }
        const r = await goiJ(req0, 'POST', '/api/man-them/them', { ht: l.id, sau: sauTu(a.vi_tri), ten: a.ten, ...than });
        return [chu({ key: r.key, ten: r.man.ten, hanhTrinh: l.id, viTri: r.thuTu.indexOf(r.key) + 1, thuTu: r.thuTu, w: r.man.w, h: r.man.h, dangDung: `v${r.manifest?.hien || 1}`,
          goiY: 'Nối nút từ màn khác tới màn này: sua_lien_ket (key màn nguồn, toi = key màn mới). Xem: anh_man.' })];
      });
    T('sua_man', 'Đổi tên và/hoặc đổi chỗ một màn đã THÊM trên bàn (màn trong mã không đổi được). vi_tri: dau | cuoi | key màn mà màn này đứng ngay sau (cùng hành trình).',
      { key: z.string(), ten: z.string().min(1).max(80).optional(), vi_tri: z.string().optional() }, async (a) => {
        if (a.ten == null && a.vi_tri == null) throw LOI('Cần ten hoặc vi_tri');
        const r = await goiJ(req0, 'POST', '/api/man-them/sua', { key: a.key, ...(a.ten != null ? { ten: a.ten } : {}), ...(a.vi_tri != null ? { sau: sauTu(a.vi_tri) } : {}) });
        return [chu({ key: r.key, ten: r.man.ten, hanhTrinh: r.man.ht, viTri: r.thuTu.indexOf(r.key) + 1, thuTu: r.thuTu, daDoi: r.doi.length ? r.doi : 'không có gì đổi' })];
      });

    T('ds_lien_ket_hong', 'Liệt kê liên kết hỏng trên bàn: nút (data-toi) của các màn còn trong hành trình trỏ tới màn đã xoá / không còn — kèm phan_tu + chữ nút để sửa bằng sua_lien_ket.',
      { toi: z.string().optional().describe('Chỉ các nút trỏ tới màn này') }, async (a) => {
        const ds = await lienKetHong(req0, a.toi || '');
        return [chu(ds.length ? ds : 'Không có liên kết hỏng.')];
      });

    T('ds_lien_ket', 'Liệt kê liên kết của một màn (bản đang dùng): từng phần tử có data-toi (phan_tu = vị trí phần tử, chu, toi, hỏng?). tat_ca=true kèm cả nút/phần tử bấm được CHƯA nối (để tạo liên kết mới).',
      { key: z.string(), tat_ca: z.boolean().optional() }, async (a) => {
        const { MAN } = await taiMan();
        const pb = await goiJ(req0, 'GET', '/api/phien-ban'); const hh = await hienHanh(req0, a.key, null, pb);
        const ds = JSON.parse(await domGoi('dsLienKet', hh.html, !!a.tat_ca));
        return [chu({ key: a.key, ten: hh.m.ten, v: hh.v, ...(daXoaMf(hh.mf) ? { daXoa: true } : {}),
          lienKet: ds.map((x) => ({ phan_tu: x.i, the: x.the, chu: x.chu, toi: x.toi || null, toiTen: x.toi ? MAN[x.toi]?.ten : undefined, hong: x.toi ? (!MAN[x.toi] || daXoaMf(pb[x.toi])) || undefined : undefined })) })];
      });

    T('sua_lien_ket', 'Tạo / đổi / gỡ liên kết của nút trên một màn (màn nguồn key + phần tử → màn đích toi; toi="" hoặc null = gỡ). Chọn phần tử bằng phan_tu (từ ds_lien_ket / ds_lien_ket_hong), hoặc chu (chữ trên nút, phải khớp đúng một phần tử), hoặc toi_cu (mọi nút đang trỏ tới màn đó — vd. nối lại liên kết hỏng sau khi xoá màn). Lưu thành phiên bản mới của màn nguồn (audit man.lien-ket); Play, Quy trình, link /r/ và realtime dùng ngay. Quyền như Thay màn.',
      { key: z.string(), toi: z.string().nullable(), phan_tu: z.number().int().min(0).optional(), chu: z.string().optional(), toi_cu: z.string().optional(), v: z.number().int().min(0).optional().describe('Phiên bản lúc lấy phan_tu (ds_lien_ket trả v) — lệch thì báo lỗi thay vì sửa nhầm phần tử') }, async (a) => {
        const { MAN } = await taiMan();
        const toi = a.toi || '';
        const pb = await goiJ(req0, 'GET', '/api/phien-ban'); const hh = await hienHanh(req0, a.key, null, pb);
        if (a.v != null && a.v !== hh.v) throw LOI(`Màn ${a.key} đã sang v${hh.v} (bạn lấy phan_tu ở v${a.v}) — gọi lại ds_lien_ket`);
        if (a.phan_tu != null && a.v == null && a.chu == null) throw LOI('Chọn theo phan_tu cần kèm v (từ ds_lien_ket) hoặc chu để không sửa nhầm phần tử khi màn vừa đổi');
        if (daXoaMf(hh.mf)) throw LOI(`Màn ${a.key} đang bị xoá khỏi hành trình — khoi_phuc_man trước`);
        if (toi) { if (!MAN[toi]) throw LOI(`Không có màn đích «${toi}» — xem ds_hanh_trinh`); if (daXoaMf(pb[toi])) throw LOI(`Màn đích ${toi} đã bị xoá khỏi hành trình — chọn màn khác hoặc khoi_phuc_man`); }
        const ds = JSON.parse(await domGoi('dsLienKet', hh.html, true));
        const chuan = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
        let chon;
        if (a.phan_tu != null) { chon = ds.filter((x) => x.i === a.phan_tu); if (a.chu != null && chon[0] && chuan(chon[0].chu) !== chuan(a.chu)) throw LOI(`Phần tử ${a.phan_tu} có chữ «${chon[0].chu}», không phải «${a.chu}» — màn có thể vừa đổi, gọi lại ds_lien_ket`); }
        else if (a.chu != null) { chon = ds.filter((x) => chuan(x.chu) === chuan(a.chu)); if (!chon.length) chon = ds.filter((x) => chuan(x.chu).includes(chuan(a.chu))); }
        else if (a.toi_cu) chon = ds.filter((x) => x.toi === a.toi_cu);
        else throw LOI('Cần phan_tu, chu hoặc toi_cu để chọn nút');
        if (!chon.length) throw LOI(`Không thấy phần tử phù hợp trên ${a.key} — xem ds_lien_ket (tat_ca=true)`);
        if (a.toi_cu == null && chon.length > 1) throw LOI(`Có ${chon.length} phần tử khớp: ${chon.map((x) => `#${x.i} «${x.chu}»`).join(', ')} — chọn bằng phan_tu`);
        let html = hh.html;
        for (const x of chon) { html = await domGoi('datLienKet', html, x.i, toi, x.chu); if (!html) throw LOI(`Không đặt được liên kết cho phần tử #${x.i}`); }
        const nhan = `Liên kết ${chon.map((x) => `«${x.chu || x.the}»`).join(', ')} ${toi ? `→ ${MAN[toi].ten}` : 'gỡ'} (MCP)`.slice(0, 120);
        if (hh.mf.dc) { // màn dùng chung: chỉ đổi lớp liên kết riêng của luồng này (nội dung chung không đổi)
          await goiJ(req0, 'POST', '/api/dung-chung/lien-ket', { key: a.key, lop: JSON.parse(await domGoi('layLop', html)), nhan });
          return [chu({ key: a.key, dungChung: true, ghiChu: 'Đã đổi liên kết riêng của luồng này — các màn cùng nhóm giữ liên kết của chúng', daSua: chon.map((x) => ({ phan_tu: x.i, chu: x.chu, truoc: x.toi || null, sau: toi || null })) })];
        }
        const mf = await goiJ(req0, 'POST', `/api/phien-ban/${encodeURIComponent(a.key)}`, { html: await domGoi('lamSach', html), w: hh.w, h: hh.h, nhan, nguon: 'lien-ket', goc: hh.v });
        return [chu({ key: a.key, dangDung: `v${mf.hien}`, daSua: chon.map((x) => ({ phan_tu: x.i, chu: x.chu, truoc: x.toi || null, sau: toi || null })) })];
      });

    // ---------- màn dùng chung ----------
    const moiNhat = (pb, keys) => keys.map((k) => ({ k, t: pb[k]?.ds?.find((x) => x.v === pb[k].hien)?.t || '' })).sort((x, y) => y.t.localeCompare(x.t))[0]?.k;
    T('ds_dung_chung', 'Màn dùng chung: các nhóm đang có (mỗi nhóm MỘT nội dung cho nhiều màn ở các hành trình khác nhau; liên kết data-toi giữ riêng từng luồng) + GỢI Ý gộp: màn trùng/giống nhau giữa các hành trình (cùng tên hoặc HTML gần giống, cùng cỡ khung). Chỉ gợi ý — gộp bằng gop_dung_chung (chủ quản).',
      { goi_y: z.boolean().optional().describe('Kèm gợi ý gộp (mặc định true)') }, async (a) => {
        const { LAN, MAN } = await taiMan();
        const [pb, dc] = await Promise.all([goiJ(req0, 'GET', '/api/phien-ban'), goiJ(req0, 'GET', '/api/dung-chung')]);
        const tenHt = (id) => LAN.find((l) => l.id === id)?.ten || id;
        const moTa = (k) => ({ key: k, ten: MAN[k]?.ten || k, hanhTrinh: MAN[k]?.lan, tenHanhTrinh: tenHt(MAN[k]?.lan), phienBan: pb[k]?.hien || 0, ...(daXoaMf(pb[k]) ? { daXoa: true } : {}) });
        const ra = { nhom: dc.nhom.map((g) => ({ id: g.id, man: g.ds.map(moTa), noiDungMoiNhatTu: g.moi?.key, t: g.t })) };
        if (a.goi_y !== false) {
          const keys = [...new Set(LAN.flatMap((l) => l.buoc))]; const html = new Map();
          let con = 0; const cho = [];
          const luot = async (fn) => { if (con >= 8) await new Promise((r) => cho.push(r)); con++; try { return await fn(); } finally { con--; cho.shift()?.(); } };
          await Promise.all(keys.map((k) => luot(async () => {
            const muc = pb[k]?.ds?.find((x) => x.v === pb[k].hien);
            if (!muc?.tep) { html.set(k, MAN[k].html); return; }
            try { html.set(k, (await goiJ(req0, 'GET', `/api/phien-ban/${encodeURIComponent(k)}/${muc.tep}`)).html); } catch { /* bỏ màn này */ }
          })));
          const kc = (k) => { const muc = pb[k]?.ds?.find((x) => x.v === pb[k].hien); return { w: muc?.w || MAN[k].w, h: muc?.h || MAN[k].h }; };
          ra.goiY = goiYDungChung(LAN.flatMap((l) => l.buoc.map((k) => ({ key: k, ten: MAN[k].ten, lan: l.id, ...kc(k), html: html.get(k), goc: MAN[k].html, w0: MAN[k].w, h0: MAN[k].h, nhom: pb[k]?.dc?.id, xoa: daXoaMf(pb[k]) }))))
            .map((x) => ({ man: x.ds.map(moTa), lyDo: x.lyDo, diem: x.diem, daLech: x.daLech, nguonGoiY: moiNhat(pb, x.ds) || x.ds[0] }));
          ra.cachGop = 'gop_dung_chung { keys: [...], nguon: <key có nội dung muốn giữ — mặc định màn sửa gần nhất> }';
        }
        return [chu(ra)];
      });

    T('gop_dung_chung', 'Gộp các màn (ở các hành trình khác nhau) thành MỘT nội dung dùng chung — CHỈ chủ quản. Nội dung của màn nguồn (mặc định màn có bản mới nhất) thành phiên bản mới của mọi màn; liên kết data-toi (nút sang màn kế) của từng màn giữ riêng theo luồng. Từ đó sửa nội dung ở một màn (thay_man, khôi phục…) thì các màn khác đổi theo. Màn đã ở nhóm khác thì nhập nhóm đó vào. Tách lại: tach_dung_chung.',
      { keys: z.array(z.string()).min(2).max(20), nguon: z.string().optional() }, async (a) => {
        const pb = await goiJ(req0, 'GET', '/api/phien-ban');
        const keys = [...new Set(a.keys)]; for (const k of keys) await timMan(k);
        const nguon = a.nguon || moiNhat(pb, keys) || keys[0];
        if (!keys.includes(nguon)) throw LOI('nguon phải nằm trong keys');
        const lop = {}; let hhN = null;
        for (const k of keys) {
          const hh = await hienHanh(req0, k, null, pb); if (k === nguon) hhN = hh;
          lop[k] = pb[k]?.dc ? pb[k].dc.lop : /data-toi=|data-lk-sua/.test(hh.tho) ? JSON.parse(await domGoi('layLop', hh.html)) : { tuDong: true };
        }
        const r = await goiJ(req0, 'POST', '/api/dung-chung/gop', { ds: keys, nguon, html: hhN.tho, w: hhN.w, h: hhN.h, lop });
        const { MAN } = await taiMan();
        return [chu({ nhom: r.nhom.id, nguon, man: r.nhom.ds.map((k) => ({ key: k, ten: MAN[k]?.ten, hanhTrinh: MAN[k]?.lan })), daGhiPhienBan: r.anhHuong, ...(r.loi?.length ? { loi: r.loi } : {}) })];
      });

    T('tach_dung_chung', 'Tách một màn khỏi nhóm dùng chung — CHỈ chủ quản. Màn giữ bản hiện tại (kèm liên kết riêng của luồng) làm bản riêng; từ đó sửa ở đâu chỉ đổi ở đó. Nhóm còn 1 màn thì giải tán.',
      { key: z.string() }, async (a) => {
        const pb = await goiJ(req0, 'GET', '/api/phien-ban');
        const g = pb[a.key]?.dc; if (!g) throw LOI(`Màn ${a.key} không dùng chung với màn nào`);
        const { MAN } = await taiMan(); const con = g.ds.filter((k) => k !== a.key && MAN[k]); const roi = con.length < 2 ? g.ds.filter((k) => MAN[k]) : [a.key]; // cùng cách tính với máy chủ
        const html = {};
        for (const k of roi) { if (daXoaMf(pb[k])) continue; const hh = await hienHanh(req0, k, null, pb); html[k] = await domGoi('apLop', hh.tho, JSON.stringify(pb[k]?.dc?.lop || g.lk?.[k] || { tuDong: true })); }
        const r = await goiJ(req0, 'POST', '/api/dung-chung/tach', { key: a.key, html });
        return [chu({ key: a.key, daTach: r.roi, nhomGiaiTan: !!r.giaiTan })];
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
        const pbNg = await goiJ(req0, 'GET', '/api/phien-ban'); const dcNg = await dungChungCua(ng.key, pbNg[ng.key]);
        const ra = [chu({ buoc: 'Bước 1/2', key: ng.key, cha: ng.cha, ten: ng.ten, w: ng.w, h: ng.h, n, dot, dataToiGoc: dataToi(ng.html), ...(dcNg ? { dungChung: dcNg } : {}),
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
        const buoc = await buocNguon(l, a.tu_phuong_an); const con = buoc.map((b) => b.key); // bỏ màn đã xoá
        const thieu = con.filter((k) => !theoKey.has(k)); const la = [...theoKey.keys()].filter((k) => !con.includes(k));
        if (thieu.length) throw LOI(`Thiếu HTML cho màn: ${thieu.join(', ')}${la.length ? ` · key lạ: ${la.join(', ')}` : ''}`);
        const kho = await dsKho(req0);
        const dot = Date.now().toString(36);
        const soMoi = Math.max(0, ...kho.lan.filter((b) => b.tu === l.id).map((b) => b.k || 0)) + 1;
        let id = `pa-${dot}-1`; while (kho.lan.some((x) => x.id === id)) id += 'm';
        const lan = { id, tu: l.id, nguon: a.tu_phuong_an || l.id, buoc: con, k: soMoi, n: 1, yTuong: a.y_tuong, tt: 'xong', model: (a.model || 'mcp').slice(0, 60), nhan: (nhan || `Phương án ${soMoi}`).slice(0, 200), tSuaCu: 0 };
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
      return Promise.all(l.buoc.filter((key) => !daXoaMf(pb[key])).map(async (key) => { // màn đã xoá khỏi hành trình: không đưa vào phương án
        const hh = await hienHanh(req0, key, null, pb); let html = hh.html;
        const f = kho?.khung.find((x) => x.lan === tuPa && x.goc === key);
        if (f) { const g = await docKhung(req0, f.id); if (g.html) html = g.html; }
        const ke = MAN[key].ke; // nhãn hành động sang bước kế chỉ khi bước kế còn (không thì nó dẫn tới màn đã xoá)
        return { key, ten: MAN[key].ten, w: hh.w, h: hh.h, html, toi: ke && !daXoaMf(pb[ke]) ? MAN[key].toi : '' };
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
    // transport chuẩn web (Request → Response) — cùng một đường cho Node và Cloudflare
    const tr = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await srv.connect(tr);
      const hd = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string' && !/^(host|content-length|connection|transfer-encoding)$/i.test(k)) hd.set(k, v);
      const r = await tr.handleRequest(new Request('http://mcp.noi-bo/mcp', { method: 'POST', headers: hd, body: JSON.stringify(body) }), { parsedBody: body });
      const ra = Buffer.from(await r.arrayBuffer()); const hra = {}; r.headers.forEach((v, k) => { hra[k] = v; });
      res.writeHead(r.status, hra); res.end(ra);
    } finally { tr.close().catch(() => {}); srv.close().catch(() => {}); }
  }

  return { xuLy, trang };
}
