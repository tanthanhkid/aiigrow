// Realtime của bản Cloudflare: WebSocket ngủ đông (Hibernation API) của Durable Object — cùng giao thức, cùng luật làm sạch/giới hạn
// với realtime.mjs của bản Mac (dùng lại sach, LOAI, NHIP, TOI_DA_PHONG). Phòng = thẻ (tag) «p:<tên>» của mỗi WebSocket.
// Đính kèm (serializeAttachment, ≤ 2 KB): { id, ten, phong, chiTro }. Trạng thái con trỏ/nhìn/chọn + bộ đếm nhịp chỉ trong bộ nhớ
// (DO ngủ đông thì mất — người mới vào chỉ thiếu vị trí cũ, mọi người gửi lại ngay khi di chuột).
import { sach, LOAI, NHIP, TOI_DA_PHONG, chuNgan } from '../realtime.mjs';

export function taoRealtimeDo(ctx) {
  const TT = new Map();   // id → { tro, nhin, chon }
  const DEM = new Map();  // id → { loai: {t, n} }
  const the = (ten) => `p:${ten}`;
  const dinh = (ws) => { try { return ws.deserializeAttachment() || null; } catch { return null; } };
  const guiWs = (ws, obj) => { try { ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch { /* đã đóng */ } };
  const trongPhong = (ten) => ctx.getWebSockets(the(ten));
  function phat(ten, tu, obj) { const s = JSON.stringify(obj); for (const ws of trongPhong(ten)) if (ws !== tu) guiWs(ws, s); }
  const phatPhong = (ten, obj) => phat(ten, null, obj);
  const dsPhong = () => [...new Set(ctx.getWebSockets().map((ws) => dinh(ws)?.phong).filter(Boolean))];
  const dongPhong = (ten) => { for (const ws of trongPhong(ten)) { try { ws.close(4403, 'thu hoi'); } catch { /* đã đóng */ } } };
  function choPhep(id, loai) {
    const [n, ms] = NHIP[loai] || NHIP.khac; const now = Date.now();
    const dm = DEM.get(id) || {}; DEM.set(id, dm);
    const d = (dm[loai] ||= { t: now, n: 0 });
    if (now - d.t > ms) { d.t = now; d.n = 0; }
    return ++d.n <= n;
  }
  // nhận nối: Worker đã kiểm cổng mật khẩu + Origin; hl = phongHopLe(tên, req) của lõi (true | 'xem' | false)
  function noi(tenPhong, tenNguoi, hl) {
    if (!/^[a-z0-9:-]{1,60}$/.test(tenPhong) || !hl) return new Response('Forbidden', { status: 403 });
    if (trongPhong(tenPhong).length >= TOI_DA_PHONG) return new Response('Phong day', { status: 503 });
    const [khach, may] = Object.values(new WebSocketPair());
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const k = { id, ten: chuNgan(tenNguoi, 40) || 'Khách', phong: tenPhong, chiTro: tenPhong !== 'bang' || hl === 'xem' };
    const cu = trongPhong(tenPhong).map((ws) => dinh(ws)).filter(Boolean).map((x) => ({ id: x.id, ten: x.ten, ...(TT.get(x.id) || {}) }));
    ctx.acceptWebSocket(may, [the(tenPhong)]);
    may.serializeAttachment(k);
    guiWs(may, { t: 'chao', id, nguoi: cu });
    phat(tenPhong, may, { t: 'vao', id, ten: k.ten });
    return new Response(null, { status: 101, webSocket: khach });
  }
  function tin(ws, du) {
    const k = dinh(ws); if (!k || typeof du !== 'string' || du.length > 4096) return;
    let m; try { m = JSON.parse(du); } catch { return; }
    if (!m || !LOAI.has(m.t) || (k.chiTro && m.t === 'su')) return;
    if (!choPhep(k.id, m.t === 'tro' ? 'tro' : 'khac')) { if (m.t === 'su') guiWs(ws, { t: 'cham', loai: 'su', su: sach(m) }); return; }
    const g = sach(m); if (!g) return;
    const tt = TT.get(k.id) || {}; TT.set(k.id, tt);
    if (g.t === 'ten') { k.ten = g.ten; ws.serializeAttachment(k); }
    else if (g.t === 'tro' || g.t === 'nhin' || g.t === 'chon') tt[g.t] = g;
    else if (g.t === 'roi') delete tt.tro;
    phat(k.phong, ws, { ...g, id: k.id });
  }
  function dong(ws) {
    const k = dinh(ws); if (!k) return;
    TT.delete(k.id); DEM.delete(k.id);
    phat(k.phong, ws, { t: 'ra', id: k.id });
  }
  return { phatPhong, dsPhong, dongPhong, noi, tin, dong };
}
