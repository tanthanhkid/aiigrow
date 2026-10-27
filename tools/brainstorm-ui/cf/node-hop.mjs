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
  // mọi thứ còn trong bộ đệm (chưa gửi đi) ⇒ lỗi giữa chừng thì thay hẳn bằng 500, không trả 200 với thân cụt
  const loi500 = () => { res.ma = 500; res.hd = { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }; res.phan = [Buffer.from('Lỗi máy chủ')]; res.writable = false; };
  try { await xuLy(req, res); } catch (e) { console.error('chayNode', e?.message); if (res.writable) loi500(); }
  // handler đã trả mà chưa end (vd. ghi bằng callback): chờ tối đa 30 giây rồi coi là lỗi; hẹn giờ luôn được huỷ để DO ngủ đông được
  if (res.writable) { let hen; await Promise.race([res.xong, new Promise((ok) => { hen = setTimeout(ok, 30000); })]).finally(() => clearTimeout(hen)); }
  if (res.writable) loi500();
  return res.thanhResponse();
}
