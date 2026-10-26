// Lớp realtime của bàn brainstorm: WebSocket tối giản (RFC 6455, không thêm thư viện), phòng theo trang.
// Chỉ chuyển tiếp: con trỏ (toạ độ canvas), khung đang nhìn, khung đang chọn/sửa, sự kiện bảng (thay màn, biến thể mới/xoá).
// Không ghi log nội dung; tên ≤40 ký tự (trình duyệt luôn hiển thị bằng textContent).
import crypto from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const GOI_NHO = 4 * 1024;             // gói thường (con trỏ, chọn…)
const GOI_LON = 6 * 1024 * 1024;      // gói «bt» mang HTML biến thể
const TOI_DA_PHONG = 40;              // người mỗi phòng
const NHIP = { tro: [40, 1000], khac: [30, 1000], bt: [120, 60000] }; // [số gói, trong bao nhiêu ms]
const BT_BYTE = 40 * 1024 * 1024;     // tổng byte gói «bt» mỗi người mỗi phút
const DON_TOI_DA = 16 * 1024 * 1024;  // người nhận chậm (tunnel yếu) dồn quá mức này: cắt kết nối, nối lại sẽ nhận đủ từ bộ nhớ phòng
const BO_NHO_PHONG = 80 * 1024 * 1024; // bộ nhớ biến thể mỗi phòng (người vào sau nhận lại từ đây, không ai phải phát lại)
const boNho = new Map();               // tên phòng → Map(id biến thể → { g, b, n }) — giữ suốt đời tiến trình, cũ nhất bị bỏ khi đầy
const PHONG_NHO = new Set(['bang']);   // chỉ phòng bàn chính được nhớ biến thể (bộ nhớ có trần)
const LOAI = new Set(['tro', 'nhin', 'chon', 'roi', 'su', 'bt', 'ten', 'xin']);
const phong = new Map();              // tên phòng → Map(id → kết nối)

const chuNgan = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n) : '');
const so = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);

function khung(op, buf) { // gói server → trình duyệt: không mask
  const n = buf.length; let dau;
  if (n < 126) dau = Buffer.from([0x80 | op, n]);
  else if (n < 65536) { dau = Buffer.alloc(4); dau[0] = 0x80 | op; dau[1] = 126; dau.writeUInt16BE(n, 2); }
  else { dau = Buffer.alloc(10); dau[0] = 0x80 | op; dau[1] = 127; dau.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([dau, buf]);
}
function guiGoi(k, goi) {
  if (k.dong || !k.sock.writable) return;
  if (k.sock.writableLength > DON_TOI_DA) { dongK(k, 1013); return; } // người nhận quá chậm: cắt, nối lại sẽ nhận đủ (không lặng lẽ bỏ gói)
  k.sock.write(goi);
}
const goiCua = (obj) => khung(1, Buffer.from(JSON.stringify(obj)));
const gui = (k, obj) => guiGoi(k, goiCua(obj));
// dựng gói MỘT lần rồi gửi cho cả phòng
function phatGoi(tenPhong, tu, goi) { for (const k of phong.get(tenPhong)?.values() || []) if (k !== tu) guiGoi(k, goi); }
const phat = (tenPhong, tu, obj) => phatGoi(tenPhong, tu, goiCua(obj));
function nhoBt(tenPhong, id, b, g, n) {
  if (!PHONG_NHO.has(tenPhong)) return;
  const m = boNho.get(tenPhong) || new Map(); boNho.set(tenPhong, m);
  m.delete(id); m.set(id, { g, b, n });
  let tong = 0; for (const x of m.values()) tong += x.n;
  for (const [k2, x] of m) { if (tong <= BO_NHO_PHONG) break; m.delete(k2); tong -= x.n; }
}
// gói bù cho một người: gửi khi bộ đệm còn dưới 2 MB, phần còn lại chờ 'drain'
function bom(k) {
  while (k.hang.length && !k.dong && k.sock.writable && k.sock.writableLength < 2 * 1024 * 1024) {
    const x = k.hang.shift(); k.sock.write(goiCua({ ...x.g, id: 'may-chu', bu: true }));
  }
}
function choPhep(k, loai) {
  const [n, ms] = NHIP[loai] || NHIP.khac; const now = Date.now();
  const d = (k.dem[loai] ||= { t: now, n: 0 });
  if (now - d.t > ms) { d.t = now; d.n = 0; }
  return ++d.n <= n;
}

// Làm sạch từng loại gói trước khi chuyển tiếp (chỉ giữ trường đã biết).
function sach(m) {
  switch (m.t) {
    case 'tro': return { t: 'tro', x: so(m.x), y: so(m.y), sec: chuNgan(m.sec, 40), cd: m.cd === 'qt' ? 'qt' : 'canvas' };
    case 'nhin': return { t: 'nhin', x: so(m.x), y: so(m.y), w: so(m.w), h: so(m.h), sec: chuNgan(m.sec, 40), cd: m.cd === 'qt' ? 'qt' : 'canvas' };
    case 'chon': return { t: 'chon', ids: (Array.isArray(m.ids) ? m.ids : []).slice(0, 20).map((x) => chuNgan(x, 80)).filter(Boolean), sua: chuNgan(m.sua, 80) || null };
    case 'roi': return { t: 'roi' };
    case 'ten': return { t: 'ten', ten: chuNgan(m.ten, 40) || 'Khách' };
    case 'xin': return { t: 'xin', ids: (Array.isArray(m.ids) ? m.ids : []).slice(0, 100).map((x) => chuNgan(x, 80)).filter(Boolean) };
    case 'su': return { t: 'su', loai: chuNgan(m.loai, 20), key: chuNgan(m.key, 80), ids: (Array.isArray(m.ids) ? m.ids : []).slice(0, 200).map((x) => chuNgan(x, 80)).filter(Boolean) };
    case 'bt': return m.f && typeof m.f === 'object' && typeof m.f.id === 'string' && /^[\w-]{1,80}$/.test(m.f.id) && typeof m.f.b === 'string' && m.f.b.length <= 40
      ? { t: 'bt', f: m.f } : null; // khung biến thể (b = băm HTML của người gửi): bên nhận tự kiểm/làm sạch HTML
    default: return null;
  }
}

// Đệm theo mảnh + tổng độ dài: chỉ nối khi đủ một gói (không chép lại cả bộ đệm mỗi mảnh TCP).
function docGoi(k, chunk, khiGoi) {
  k.ds.push(chunk); k.n += chunk.length;
  for (;;) {
    if (k.n < Math.max(2, k.can)) return;
    if (k.ds.length > 1) k.ds = [Buffer.concat(k.ds, k.n)];
    const b = k.ds[0];
    const fin = b[0] & 0x80, op = b[0] & 0x0f, mask = b[1] & 0x80; let n = b[1] & 0x7f, p = 2;
    if (!mask || (op >= 8 && (!fin || n > 125))) return dongK(k, 1002); // gói điều khiển: không mảnh, ≤125 byte
    if (n === 126) { if (b.length < 4) return; n = b.readUInt16BE(2); p = 4; }
    else if (n === 127) { if (b.length < 10) return; const big = b.readBigUInt64BE(2); if (big > BigInt(GOI_LON)) return dongK(k, 1009); n = Number(big); p = 10; }
    if (n + (k.manh?.length || 0) > GOI_LON) return dongK(k, 1009);
    if (b.length < p + 4 + n) { k.can = p + 4 + n; return; }
    k.can = 0;
    const m = b.subarray(p, p + 4); const du = Buffer.from(b.subarray(p + 4, p + 4 + n));
    for (let i = 0; i < du.length; i++) du[i] ^= m[i & 3];
    const con = b.subarray(p + 4 + n); k.ds = con.length ? [con] : []; k.n = con.length;
    if (op === 8) return dongK(k, 1000);
    if (op === 9) { if (k.sock.writable) k.sock.write(khung(10, du)); }
    else if (op === 1 || op === 2) { // đầu một thông điệp (2 = nhị phân: bỏ qua nội dung)
      if (k.ghep) return dongK(k, 1002);
      if (fin) { if (op === 1) khiGoi(du); } else { k.ghep = op; k.manh = op === 1 ? du : null; }
    } else if (op === 0) { // mảnh tiếp theo: phải có thông điệp đang ghép
      if (!k.ghep) return dongK(k, 1002);
      if (k.ghep === 1) k.manh = Buffer.concat([k.manh, du]);
      if (fin) { const s = k.manh, loai = k.ghep; k.manh = null; k.ghep = 0; if (loai === 1) khiGoi(s); }
    } else if (op === 10) { /* pong: trả lời ping của máy chủ */ } else return dongK(k, 1002);
    if (!k.n) return;
  }
}
function dongK(k, ma = 1000) {
  if (k.dong) return; k.dong = true;
  try { const b = Buffer.alloc(2); b.writeUInt16BE(ma); k.sock.write(khung(8, b)); } catch { /* đã đứt */ }
  k.sock.end(); setTimeout(() => k.sock.destroy(), 1000);
  const p = phong.get(k.phong);
  if (p?.get(k.id) === k) { p.delete(k.id); if (!p.size) phong.delete(k.phong); phat(k.phong, k, { t: 'ra', id: k.id }); }
}

// Gắn vào máy chủ http: /ws?phong=<tên>&ten=<tên người>. hopLeNguon: hàm kiểm Origin của server.mjs.
export function ganRealtime(may, hopLeNguon) {
  may.on('upgrade', (req, sock) => {
    const huy = (ma, chu) => { try { sock.end(`HTTP/1.1 ${ma} ${chu}\r\nConnection: close\r\n\r\n`); } catch { /* bỏ qua */ } };
    let url; try { url = new URL(req.url, 'http://x'); } catch { return huy(400, 'Bad Request'); }
    if (url.pathname !== '/ws' || (req.headers.upgrade || '').toLowerCase() !== 'websocket') return huy(404, 'Not Found');
    if (!hopLeNguon(req)) return huy(403, 'Forbidden');
    const tenPhong = url.searchParams.get('phong') || '';
    const khoa = req.headers['sec-websocket-key'];
    if (!/^[a-z0-9:-]{1,60}$/.test(tenPhong) || !khoa || req.headers['sec-websocket-version'] !== '13') return huy(400, 'Bad Request');
    const p = phong.get(tenPhong) || new Map();
    if (p.size >= TOI_DA_PHONG) return huy(503, 'Phong day');
    const nhan = crypto.createHash('sha1').update(khoa + GUID).digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${nhan}\r\n\r\n`);
    sock.setNoDelay(true);
    const k = { id: crypto.randomBytes(6).toString('hex'), sock, phong: tenPhong, ten: chuNgan(url.searchParams.get('ten'), 40) || 'Khách', dem: {}, tt: {}, hang: [], ds: [], n: 0, can: 0, ghep: 0, manh: null, btByte: { t: 0, n: 0 } };
    phong.set(tenPhong, p);
    // người đang có trong phòng + trạng thái gần nhất của họ
    // + danh sách biến thể phòng đang nhớ (id → băm) để người vào biết cần gửi bù gì; rồi gửi lại từng biến thể đã nhớ
    // người vào tự so rồi «xin» đúng cái thiếu/khác — máy chủ không đổ cả kho vào kết nối mới
    const nho = boNho.get(tenPhong);
    const cu = [...p.values()].map((x) => ({ id: x.id, ten: x.ten, ...x.tt }));
    p.set(k.id, k);
    gui(k, { t: 'chao', id: k.id, nguoi: cu, btCo: Object.fromEntries([...(nho?.entries() || [])].map(([id, x]) => [id, x.b])) });
    phat(tenPhong, k, { t: 'vao', id: k.id, ten: k.ten });
    let lanCuoi = Date.now();
    const nhip = setInterval(() => { if (Date.now() - lanCuoi > 90000) dongK(k, 1001); else if (k.sock.writable) k.sock.write(khung(9, Buffer.alloc(0))); }, 30000);
    sock.on('data', (c) => {
      lanCuoi = Date.now();
      docGoi(k, c, (s) => {
        const loaiGoi = s.length > GOI_NHO ? 'bt' : null;
        let m; try { m = JSON.parse(s.toString('utf8')); } catch { return; }
        if (!m || !LOAI.has(m.t) || (loaiGoi && m.t !== 'bt')) return;
        let duoc = choPhep(k, m.t === 'tro' || m.t === 'bt' ? m.t : 'khac');
        if (m.t === 'bt' && duoc) { const now = Date.now(); if (now - k.btByte.t > 60000) k.btByte = { t: now, n: 0 }; k.btByte.n += s.length; duoc = k.btByte.n <= BT_BYTE; }
        if (!duoc) { // báo người gửi để gửi lại sau
          if (m.t === 'bt' || m.t === 'su') { const g0 = sach(m); gui(k, { t: 'cham', loai: m.t, id: chuNgan(m.f?.id, 80), su: g0?.t === 'su' ? g0 : null }); }
          return;
        }
        const g = sach(m); if (!g) return;
        if (g.t === 'xin') { // gửi bù biến thể đã nhớ, giãn theo bộ đệm (không vượt ngưỡng cắt người chậm)
          const nho2 = boNho.get(tenPhong);
          for (const id of g.ids) { const x = nho2?.get(id); if (x && k.hang.length < 2000) k.hang.push(x); }
          bom(k); return;
        }
        if (g.t === 'ten') k.ten = g.ten;
        else if (g.t === 'tro' || g.t === 'nhin' || g.t === 'chon') k.tt[g.t] = g;
        else if (g.t === 'roi') delete k.tt.tro;
        const goi = goiCua({ ...g, id: k.id, ...(g.t === 'bt' ? { ten: k.ten } : {}) });
        if (g.t === 'bt') nhoBt(tenPhong, g.f.id, g.f.b, { ...g, ten: k.ten }, goi.length);
        else if (g.t === 'su' && g.loai === 'xoa') for (const id of g.ids) boNho.get(tenPhong)?.delete(id);
        phatGoi(tenPhong, k, goi);
      });
    });
    sock.on('drain', () => bom(k));
    const xong = () => { clearInterval(nhip); k.hang = []; dongK(k, 1001); };
    sock.on('close', xong); sock.on('error', xong); sock.on('end', xong);
  });
}
