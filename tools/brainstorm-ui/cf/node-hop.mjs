// Cầu nối Request (Cloudflare) ⇄ req/res kiểu Node để lõi ung-dung.mjs chạy nguyên trong Durable Object.
// req: Readable (thân yêu cầu) + method, url, headers (chữ thường), socket.remoteAddress = IP thật (cf-connecting-ip do Cloudflare đặt, không giả được).
// res: gom writeHead/setHeader/write/end rồi trả thành Response.
import { Readable } from 'node:stream';

export async function reqTu(request) {
  const u = new URL(request.url);
  const than = request.method === 'GET' || request.method === 'HEAD' ? null : Buffer.from(await request.arrayBuffer());
  const req = Readable.from(than && than.length ? [than] : []);
  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });
  headers.host = u.host;
  const ip = String(request.headers.get('cf-connecting-ip') || '').slice(0, 64);
  Object.assign(req, { method: request.method, url: u.pathname + u.search, headers, socket: { remoteAddress: ip }, connection: { remoteAddress: ip } });
  return req;
}

export function resMoi() {
  let xong; const da = new Promise((r) => { xong = r; });
  const res = {
    ma: 200, hd: {}, phan: [], headersSent: false, writable: true,
    writeHead(m, a, b) { this.ma = m; const hd = typeof a === 'object' && a ? a : b; if (hd) for (const [k, v] of Object.entries(hd)) this.hd[k.toLowerCase()] = v; this.headersSent = true; return this; },
    setHeader(k, v) { this.hd[k.toLowerCase()] = v; return this; },
    getHeader(k) { return this.hd[k.toLowerCase()]; },
    removeHeader(k) { delete this.hd[k.toLowerCase()]; },
    write(b) { if (b != null) this.phan.push(Buffer.isBuffer(b) ? b : typeof b === 'string' ? Buffer.from(b) : Buffer.from(b)); this.headersSent = true; return true; },
    end(b) { if (typeof b !== 'function') this.write(b); this.writable = false; xong(); return this; },
    on() { return this; }, once() { return this; }, flushHeaders() {},
  };
  res.xong = da;
  res.thanhResponse = () => {
    const h = new Headers();
    for (const [k, v] of Object.entries(res.hd)) if (v != null) (Array.isArray(v) ? v : [v]).forEach((x) => h.append(k, String(x)));
    const than = res.ma === 204 || res.ma === 304 ? null : Buffer.concat(res.phan);
    return new Response(than, { status: res.ma, headers: h });
  };
  return res;
}

// chạy một handler kiểu Node (req, res) → Response
export async function chayNode(xuLy, request) {
  const req = await reqTu(request); const res = resMoi();
  try { await xuLy(req, res); } catch (e) { console.error('chayNode', e?.message); if (res.writable) { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(res.headersSent ? undefined : 'Lỗi máy chủ'); } }
  // handler đã trả mà chưa end (vd. lỗi sau writeHead): chờ tối đa 30 giây rồi tự đóng, không treo yêu cầu
  if (res.writable) await Promise.race([res.xong, new Promise((ok) => setTimeout(ok, 30000))]);
  if (res.writable) { if (!res.headersSent) res.writeHead(500); res.end(); }
  return res.thanhResponse();
}
