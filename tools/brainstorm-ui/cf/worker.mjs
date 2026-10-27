// Bàn brainstorm AiiGrow trên Cloudflare (không phụ thuộc Mac).
// Worker: cổng mật khẩu chung (cong-vao.mjs) cho mọi đường; tệp tĩnh (web/, ảnh asset, ảnh «thật» chọn lọc) từ Workers Static Assets;
// mọi đường động (/api, /mcp, /ws, /__*) chuyển vào MỘT Durable Object «bang» chạy NGUYÊN lõi ung-dung.mjs của bản Mac:
// «node:fs» = SQLite của DO (fs-do.mjs, wrangler alias), realtime = WebSocket ngủ đông (realtime-do.mjs), ảnh màn MCP = Browser Rendering.
// Bí mật (wrangler secret): MAT_KHAU (mật khẩu chung), BI_MAT_PHIEN (ký cookie), MA_CHU_QUAN (mã chủ quản), MA_MCP (Bearer MCP). Không bao giờ ghi log.
import { DurableObject } from 'cloudflare:workers';
import puppeteer from '@cloudflare/puppeteer';
import * as CV from '../cong-vao.mjs';
import { cspChoHost } from '../csp.mjs';
import fs, { ganKho } from './fs-do.mjs';
import { chayNode, reqTu } from './node-hop.mjs';
import { taoRealtimeDo } from './realtime-do.mjs';
import { taoUngDung } from '../ung-dung.mjs';

const THIET_KE = '/kho';
const TEP_CQ = `${THIET_KE}/brainstorm-ui/chu-quan.json`;
const CHOT = `${THIET_KE}/.di-tru-da-chot`; // có tệp này thì /__kho/nap đóng
const cqTuEnv = (env) => ({ ma: env.MA_CHU_QUAN || '', maMcp: env.MA_MCP || '', matKhau: env.MAT_KHAU || '', biMatPhien: env.BI_MAT_PHIEN || '', khoaBang: env.KHOA_BANG === 'true' });
const hostThem = (env) => String(env.HOST_THEM || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
// đường do Durable Object xử lý; còn lại là tệp tĩnh
const laDong = (p) => p === '/mcp' || p === '/ws' || p.startsWith('/__') || ((p === '/api' || p.startsWith('/api/')) && p !== '/api/assets');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let p; try { p = decodeURIComponent(url.pathname); } catch { return new Response('Bad Request', { status: 400 }); }
    if (laDong(p)) return env.BAN.get(env.BAN.idFromName('bang')).fetch(request);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Không hỗ trợ', { status: 405 });
    const cq = cqTuEnv(env);
    if (!CV.congBat(cq)) return new Response('Chưa đặt MAT_KHAU / BI_MAT_PHIEN — bàn đóng.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (!CV.phienHopLe(cq, CV.docCookie(request.headers.get('cookie')))) {
      if (CV.muonTrang(request.method, request.headers.get('accept'))) {
        return new Response(null, { status: 302, headers: { Location: `${CV.DUONG_DANG_NHAP}?tiep=${encodeURIComponent(CV.tiepAnToan(url.pathname + url.search))}`, 'Cache-Control': 'no-store' } });
      }
      return Response.json({ loi: 'Cần đăng nhập mật khẩu chung', canDangNhap: true }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    let tep = p;
    if (p === '/') tep = '/index.html';
    else if (p === '/api/assets') tep = '/_cf/api-assets.json';
    else if (/^\/r\/[a-f0-9]{32}\/?$/.test(p)) tep = '/review.html';
    else if (p.startsWith('/_cf/')) return new Response('Không có', { status: 404 });
    const r = await env.ASSETS.fetch(new Request(new URL(tep, url.origin), { method: request.method }));
    if (!r.ok) return new Response('Không có', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const h = new Headers(r.headers);
    h.set('Cache-Control', 'no-store'); h.set('X-Content-Type-Options', 'nosniff');
    if ((h.get('content-type') || '').startsWith('text/html')) h.set('Content-Security-Policy', cspChoHost(url.host));
    return new Response(r.body, { status: 200, headers: h });
  },
};

export class Ban extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env; this.goc = '';
    ganKho(ctx.storage.sql, { [TEP_CQ]: () => JSON.stringify(cqTuEnv(env)) });
    for (const d of ['bien-the', 'phien-ban', 'review', 'audit']) fs.mkdirSync(`${THIET_KE}/brainstorm-ui/${d}`, { recursive: true });
    this.rt = taoRealtimeDo(ctx);
    this.app = null; // dựng lõi khi có yêu cầu đầu tiên (thức dậy chỉ để chuyển tin realtime thì không phải quét kho)
  }

  dung() { // dựng lõi (đọc chỉ mục biến thể, đuôi audit… từ kho) — gọi lại sau khi nạp dữ liệu di trú
    const { env } = this; const { phatPhong, dsPhong, dongPhong } = this.rt;
    return taoUngDung({
      GOC: '/ung-dung', REPO: '/repo', WEB: '/web', THIET_KE, phatPhong,
      dsAssets: async () => { const r = await env.ASSETS.fetch(new Request('https://tinh.noi-bo/_cf/api-assets.json')); if (!r.ok) throw new Error('Thiếu _cf/api-assets.json — chạy lại cf/dung.mjs'); return r.json(); }, dsPhong, dongPhong, hostThem: hostThem(env), coNoiBo: false, motTienTrinh: true,
      mcp: {
        layWeb: async (u) => env.ASSETS.fetch(new Request(new URL(String(u), 'https://tinh.noi-bo'))),
        moTrinh: () => puppeteer.launch(env.BROWSER, { keep_alive: 60000 }),
        urlTrang: (ma) => `${this.goc}/__mcp/trang/${ma}`,
        trangHopLe: () => true, // mã 128 bit dùng một lần, hết hạn 2 phút — Browser Rendering đi vào từ ngoài, không phải loopback
        chuanBiTrang: async (pg) => { // trang chụp tải /claude.js, ảnh /assets… qua cổng mật khẩu: cookie phiên cho riêng trình duyệt này
          const u = new URL(this.goc);
          await pg.setCookie({ name: CV.TEN_COOKIE, value: CV.taoGiaTriPhien(cqTuEnv(env)), domain: u.hostname, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' });
        },
        anhByte: 16 * 1024 * 1024, domByte: 8 * 1024 * 1024, ranhDong: 60000,
      },
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    // Cloudflare công khai: thiếu/ngắn MAT_KHAU hoặc BI_MAT_PHIEN thì ĐÓNG mọi đường động (không như Mac, nơi «chưa đặt mật khẩu» = chỉ 127.0.0.1)
    if (!CV.congBat(cqTuEnv(this.env))) return new Response('Chưa đặt MAT_KHAU / BI_MAT_PHIEN — bàn đóng.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    // gốc cho trang chụp ảnh MCP: bản deploy (tên miền chính hoặc *.workers.dev) luôn dùng GOC cố định để yêu cầu từ host khác không chen ngang; wrangler dev dùng chính nó
    let hostGoc = ''; try { hostGoc = new URL(this.env.GOC).host; } catch { /* GOC hỏng/thiếu ⇒ dùng origin của yêu cầu */ }
    const chinh = hostGoc && (url.host === hostGoc || url.hostname.startsWith('aiigrow-figma.') && url.hostname.endsWith('.workers.dev'));
    this.goc = chinh ? this.env.GOC.replace(/\/+$/, '') : url.origin;
    this.app ||= this.dung();
    if (url.pathname === '/ws') {
      if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') return new Response('Not Found', { status: 404 });
      const req = await reqTu(request);
      if (!this.app.hopLeNguon(req) || !this.app.daVao(req)) return new Response('Forbidden', { status: 403 });
      const phong = url.searchParams.get('phong') || '';
      return this.rt.noi(phong, url.searchParams.get('ten'), /^[a-z0-9:-]{1,60}$/.test(phong) && this.app.phongHopLe(phong, req));
    }
    if (url.pathname.startsWith('/__kho/')) return chayNode((req, res) => this.kho(req, res, url), request);
    return chayNode((req, res) => this.app.xuLy(req, res), request);
  }
  webSocketMessage(ws, msg) { this.rt.tin(ws, typeof msg === 'string' ? msg : ''); }
  webSocketClose(ws) { this.rt.dong(ws); }
  webSocketError(ws) { this.rt.dong(ws); }

  // ---- /__kho: di trú dữ liệu từ Mac lên + kéo dữ liệu về Mac để sao lưu git. CHỈ chủ quản: mã chủ quản (x-bs-chu-quan) + mật khẩu (cookie hoặc Bearer maMcp).
  // GET  /__kho/ds                      → [{ p, co, m }] mọi tệp dưới /kho/brainstorm-ui (trừ chu-quan.json)
  // GET  /__kho/tep?p=<đường>           → nội dung thô
  // POST /__kho/nap  [{ p, b64 }]       → ghi (đè) tệp, chỉ dưới bien-the/ phien-ban/ review/ audit/; CHỈ trước khi chốt
  // POST /__kho/chot                    → chốt di trú: từ đó nap trả 410
  async kho(req, res, url) {
    const { review } = this.app;
    const json = (ma, o) => { res.writeHead(ma, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
    const coMk = this.app.daVao(req) || review.kiemMaMcp(req);
    if (!coMk || !review.laChuQuan(req)) return json(403, { loi: 'Cần mật khẩu + mã chủ quản' });
    const GOC_KHO = `${THIET_KE}/brainstorm-ui/`;
    const hopLe = (p) => typeof p === 'string' && p.startsWith(GOC_KHO) && !p.includes('..') && /^(bien-the|phien-ban|review|audit)\//.test(p.slice(GOC_KHO.length)) && !/\/\.khoa|\.tam$/.test(p);
    const sql = this.ctx.storage.sql;
    if (req.method === 'GET' && url.pathname === '/__kho/ds') {
      return json(200, sql.exec("SELECT p, co, m FROM tep WHERE thu = 0 AND p LIKE '/kho/brainstorm-ui/%' ORDER BY p").toArray().filter((r) => hopLe(r.p)));
    }
    if (req.method === 'GET' && url.pathname === '/__kho/tep') {
      const p = url.searchParams.get('p') || ''; if (!hopLe(p)) return json(400, { loi: 'Đường lạ' });
      let b; try { b = fs.readFileSync(p); } catch { return json(404, { loi: 'Không có' }); }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' }); return res.end(b);
    }
    if (req.method === 'POST' && url.pathname === '/__kho/nap') {
      const phan = []; for await (const c of req) phan.push(c);
      let ds; try { ds = JSON.parse(Buffer.concat(phan).toString('utf8')); } catch { return json(400, { loi: 'JSON hỏng' }); }
      if (!Array.isArray(ds)) return json(400, { loi: 'Cần mảng' });
      // di trú chỉ mở tới khi chốt (/__kho/chot): trước đó ghi đè được (chạy lại nap khi đứt giữa chừng), sau đó đóng hẳn — audit trên Cloudflare không sửa được qua đây
      if (fs.existsSync(CHOT)) return json(410, { loi: 'Đã chốt di trú — /__kho/nap đóng' });
      for (const x of ds) if (!hopLe(x?.p) || typeof x.b64 !== 'string') return json(400, { loi: `Đường lạ: ${String(x?.p).slice(0, 100)}` }); // kiểm cả lô trước khi ghi
      this.ctx.storage.transactionSync(() => { for (const x of ds) fs.writeFileSync(x.p, Buffer.from(x.b64, 'base64')); }); // cả lô hoặc không gì
      return json(200, { ok: true, n: ds.length }); // lõi dựng lại một lần khi chốt
    }
    if (req.method === 'POST' && url.pathname === '/__kho/chot') {
      if (!fs.existsSync(CHOT)) fs.writeFileSync(CHOT, new Date().toISOString());
      this.app = this.dung(); return json(200, { ok: true });
    }
    return json(404, { loi: 'Không có' });
  }
}
