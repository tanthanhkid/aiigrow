// «Góp ý»: chia sẻ ảnh chụp đóng băng của một hành trình cho người review (/r/<mã>), ghi góp ý ghim lên màn,
// đề xuất thay đổi (biến thể do reviewer sinh bằng key của CHÍNH họ) chờ chủ quản Accept.
// Kho ngoài git: <THIET_KE>/brainstorm-ui/review/. Ghi nguyên tử + khoá liên tiến trình (5178 và 5181 dùng chung kho).
// Không ghi log nội dung. Mọi chữ người dùng gõ được trình duyệt hiển thị bằng textContent; máy chủ chỉ cắt độ dài + bỏ ký tự điều khiển.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CO_DE_XUAT = 6 * 1024 * 1024;   // một bản HTML đề xuất
const CO_CHIA_SE = 40 * 1024 * 1024;  // ảnh chụp cả hành trình (HTML các màn + sơ đồ quy trình)
const TOI_DA = { chiaSe: 200, gopY: 3000, deXuat: 600 };
const MUC = new Set(['loi', 'de-xuat', 'cau-hoi']);
const MA = /^[a-f0-9]{32}$/;
const ID = /^[a-z0-9]{6,40}$/;

const sachChu = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n) : '');
const ten40 = (v) => sachChu(v, 40).replace(/\s+/g, ' ') || 'Khách';
const idMoi = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

// C: { THIET_KE, hanhTrinh() → Map(id → {id, ten, buoc:[key]}), hopLeNguon(req), json(res, ma, obj), docThan(req, gioiHan), ghiAtomic(tep, nd),
//      ghiPhienBan(key, than) → [ma, obj], phat(phong, obj), dsPhong() → [tên phòng] }
export function taoReview(C) {
  const KHO = process.env.BS_REVIEW || path.join(C.THIET_KE, 'brainstorm-ui/review');
  const TEP_CQ = process.env.BS_CHU_QUAN || path.join(C.THIET_KE, 'brainstorm-ui/chu-quan.json');

  // ---------- chủ quản ----------
  // 127.0.0.1/localhost gõ thẳng (không qua tunnel) = chủ quản. Qua tên miền: header x-bs-chu-quan khớp «ma» trong chu-quan.json (Thanh tự đặt, ngoài git).
  // Chưa có tệp ⇒ qua tên miền không ai là chủ quản. Sai mã bị giới hạn 10 lần/phút mỗi IP.
  const saiMa = new Map();
  const ipCua = (req) => String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '');
  function cauHinh() { try { const j = JSON.parse(fs.readFileSync(TEP_CQ, 'utf8')); return j && typeof j === 'object' ? j : {}; } catch { return {}; } }
  function laNoiBo(req) {
    const h = String(req.headers.host || '').toLowerCase();
    return /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h) && !req.headers['cf-connecting-ip'] && !req.headers['cf-ray'] && !req.headers['x-forwarded-for'];
  }
  function laChuQuan(req) {
    if (laNoiBo(req)) return true;
    const ma = String(cauHinh().ma || ''); const gui = String(req.headers['x-bs-chu-quan'] || '');
    if (ma.length < 8 || !gui) return false;
    const ip = ipCua(req); const now = Date.now(); const s = saiMa.get(ip);
    if (s && now - s.t < 60000 && s.n >= 10) return false;
    const bang = (x) => crypto.createHash('sha256').update(x).digest();
    if (crypto.timingSafeEqual(bang(ma), bang(gui))) return true;
    if (!s || now - s.t >= 60000) saiMa.set(ip, { t: now, n: 1 }); else s.n++;
    if (saiMa.size > 5000) saiMa.clear();
    return false;
  }
  const khoaBang = () => cauHinh().khoaBang === true; // bật: mọi thao tác ghi của bàn chính (Thay màn…) qua tên miền cũng cần mã chủ quản

  // ---------- giới hạn nhịp ghi của reviewer (theo IP) ----------
  const nhip = new Map();
  function choGhi(req, loai, n) {
    const k = `${ipCua(req)}|${loai}`; const now = Date.now(); const d = nhip.get(k);
    if (!d || now - d.t > 60000) { nhip.set(k, { t: now, n: 1 }); if (nhip.size > 20000) nhip.clear(); return true; }
    return ++d.n <= n;
  }

  // ---------- kho ----------
  const tepChiaSe = () => path.join(KHO, 'chia-se.json');
  const thuSnap = (ma) => path.join(KHO, 'snap', ma);
  const tepGopY = (ht) => path.join(KHO, 'gop-y', `${ht}.json`);
  const tepDeXuat = (ht) => path.join(KHO, 'de-xuat', `${ht}.json`);
  const thuDeXuat = (ht) => path.join(KHO, 'de-xuat', ht);
  function docJson(tep, rong) {
    let tho; try { tho = fs.readFileSync(tep, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return rong(); throw e; }
    const j = JSON.parse(tho); if (!j || !Array.isArray(j.ds)) throw new Error('kho góp ý hỏng'); return j;
  }
  const ghi = (tep, obj) => { fs.mkdirSync(path.dirname(tep), { recursive: true }); C.ghiAtomic(tep, JSON.stringify(obj, null, 1)); };
  async function khoa() {
    fs.mkdirSync(KHO, { recursive: true }); const k = path.join(KHO, '.khoa');
    for (let i = 0; i < 150; i++) {
      try { fs.mkdirSync(k); return () => { try { fs.rmdirSync(k); } catch { /* đã gỡ */ } }; } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try { if (Date.now() - fs.statSync(k).mtimeMs > 10000) fs.rmdirSync(k); } catch { /* tiến trình khác vừa gỡ */ }
        await ngu(20);
      }
    }
    throw Object.assign(new Error('bận'), { ma: 503 });
  }
  const dsChiaSe = () => docJson(tepChiaSe(), () => ({ ds: [] })).ds;
  const chiaSeCua = (ma) => (MA.test(ma) ? dsChiaSe().find((s) => s.ma === ma) : null);
  const conHieuLuc = (ma) => { try { const s = chiaSeCua(ma); return !!s && !s.thuHoi; } catch { return false; } };

  // phát cho bàn chính + mọi trang review cùng hành trình (trang tự tải lại phần đổi)
  function bao(ht, loai, them = {}) {
    let ma = []; try { ma = dsChiaSe().filter((s) => s.ht === ht).map((s) => `r-${s.ma}`); } catch { /* kho hỏng: chỉ báo bàn */ }
    const phong = new Set(C.dsPhong());
    for (const p of ['bang', ...ma]) if (phong.has(p)) C.phat(p, { t: 'rv', loai, ht, ...them });
  }

  // ---------- dữ liệu gửi ra ----------
  const gopYRa = (g) => ({ ...g });
  const deXuatRa = (d) => { const { tep, ...con } = d; return con; };
  function goiReview(s) {
    const meta = JSON.parse(fs.readFileSync(path.join(thuSnap(s.ma), 'meta.json'), 'utf8'));
    const man = meta.man.map((m) => ({ ...m, html: fs.readFileSync(path.join(thuSnap(s.ma), `m-${m.key}.html`), 'utf8') }));
    let qt = ''; try { qt = fs.readFileSync(path.join(thuSnap(s.ma), 'qt.svg'), 'utf8'); } catch { /* không có sơ đồ */ }
    const cungHt = dsChiaSe().filter((x) => x.ht === s.ht).map((x) => ({ ma: x.ma, v: x.v }));
    return { ma: s.ma, ht: s.ht, htTen: meta.htTen, v: s.v, ghiChu: s.ghiChu, t: s.t, man, qt, phienBan: cungHt.map((x) => x.v),
      gopY: docJson(tepGopY(s.ht), () => ({ ds: [] })).ds.map(gopYRa), deXuat: docJson(tepDeXuat(s.ht), () => ({ ds: [] })).ds.map(deXuatRa) };
  }

  // ---------- xử lý ----------
  // trả true nếu đã xử lý yêu cầu
  async function xuLy(req, res, p) {
    const { json } = C;
    const phan = p.split('/').slice(1); // ['api','review',...]
    if (phan[0] !== 'api' || phan[1] !== 'review') return false;
    const [, , a, b, c, d, e] = phan;
    const ghiVao = req.method === 'POST';
    if (req.method !== 'GET' && !ghiVao) return json(res, 405, { loi: 'Không hỗ trợ' }), true;
    if (ghiVao && (!C.hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json'))) return json(res, 403, { loi: 'Nguồn không hợp lệ' }), true;
    const docBody = async (gh) => { try { return JSON.parse(await C.docThan(req, gh)); } catch (er) { throw Object.assign(new Error(er.ma === 413 ? 'Quá lớn' : 'Không đọc được yêu cầu'), { ma: er.ma || 400 }); } };
    try {
      // GET /api/review/toi → quyền của người đang gọi
      if (a === 'toi' && !b) return json(res, 200, { chuQuan: laChuQuan(req), noiBo: laNoiBo(req), coMa: String(cauHinh().ma || '').length >= 8, khoaBang: khoaBang() }), true;

      // ===== trang reviewer: /api/review/r/<mã>/... (không cần chủ quản, chỉ đúng snapshot của mã) =====
      if (a === 'r') {
        const s = chiaSeCua(b);
        if (!s) return json(res, 404, { loi: 'Link góp ý không tồn tại' }), true;
        if (s.thuHoi) return json(res, 410, { loi: 'Link góp ý này đã bị thu hồi' }), true;
        if (!ghiVao) {
          if (!c) return json(res, 200, goiReview(s)), true;
          if (c === 'moi' && !d) { // chỉ góp ý + đề xuất (khi có thay đổi), không tải lại cả snapshot màn
            return json(res, 200, { gopY: docJson(tepGopY(s.ht), () => ({ ds: [] })).ds.map(gopYRa), deXuat: docJson(tepDeXuat(s.ht), () => ({ ds: [] })).ds.map(deXuatRa) }), true;
          }
          if (c === 'de-xuat' && ID.test(d || '') && !e) { // xem HTML một đề xuất của cùng hành trình
            const dx = docJson(tepDeXuat(s.ht), () => ({ ds: [] })).ds.find((x) => x.id === d);
            if (!dx) return json(res, 404, { loi: 'Không có đề xuất' }), true;
            return json(res, 200, { html: fs.readFileSync(path.join(thuDeXuat(s.ht), `${dx.id}.html`), 'utf8') }), true;
          }
          return json(res, 404, { loi: 'Không có' }), true;
        }
        const keySnap = new Set((JSON.parse(fs.readFileSync(path.join(thuSnap(s.ma), 'meta.json'), 'utf8')).man || []).map((m) => m.key));
        if (c === 'gop-y' && !d) { // góp ý mới hoặc trả lời
          if (!choGhi(req, 'gy', 30)) return json(res, 429, { loi: 'Gửi nhanh quá — đợi chút' }), true;
          const t = await docBody(16 * 1024);
          const noi = sachChu(t.noi, 2000); if (!noi) return json(res, 400, { loi: 'Góp ý trống' }), true;
          const mo = await khoa();
          try {
            const g = docJson(tepGopY(s.ht), () => ({ ds: [] }));
            if (g.ds.length >= TOI_DA.gopY) return json(res, 409, { loi: 'Hành trình này đã quá nhiều góp ý' }), true;
            let moi;
            if (t.cha) { // trả lời: cùng hành trình
              const cha = g.ds.find((x) => x.id === t.cha); if (!cha) return json(res, 404, { loi: 'Không có góp ý để trả lời' }), true;
              if ((cha.tl || []).length >= 200) return json(res, 409, { loi: 'Luồng quá dài' }), true;
              moi = { id: idMoi(), ten: ten40(t.ten), noi, t: new Date().toISOString(), ma: s.ma };
              (cha.tl ||= []).push(moi);
            } else {
              const key = t.key == null || t.key === '' ? null : String(t.key);
              if (key && !keySnap.has(key)) return json(res, 400, { loi: 'Màn không thuộc link này' }), true;
              const gh = t.ghim && key ? { x: Math.min(100, Math.max(0, Number(t.ghim.x) || 0)), y: Math.min(100, Math.max(0, Number(t.ghim.y) || 0)), sel: sachChu(t.ghim.sel, 300) } : null;
              moi = { id: idMoi(), ma: s.ma, v: s.v, key, ghim: gh, muc: MUC.has(t.muc) ? t.muc : 'de-xuat', tt: 'mo', ten: ten40(t.ten), noi, t: new Date().toISOString(), tl: [], ycBt: false };
              g.ds.push(moi);
            }
            ghi(tepGopY(s.ht), g);
            bao(s.ht, 'gop-y');
            return json(res, 200, moi), true;
          } finally { mo(); }
        }
        if (c === 'yc' && ID.test(d || '') && !e) { // «Yêu cầu biến thể»: reviewer chưa có key — chủ quản bấm sinh sau
          if (!choGhi(req, 'gy', 30)) return json(res, 429, { loi: 'Gửi nhanh quá — đợi chút' }), true;
          const mo = await khoa();
          try {
            const g = docJson(tepGopY(s.ht), () => ({ ds: [] })); const x = g.ds.find((y) => y.id === d);
            if (!x) return json(res, 404, { loi: 'Không có góp ý này trong hành trình' }), true; // góp ý của link cũ («từ v1») cùng hành trình cũng được
            x.ycBt = true; ghi(tepGopY(s.ht), g); bao(s.ht, 'gop-y');
            return json(res, 200, x), true;
          } finally { mo(); }
        }
        if (c === 'de-xuat' && !d) { // đề xuất thay đổi (Chờ duyệt) — KHÔNG đụng design gốc
          if (!choGhi(req, 'dx', 12)) return json(res, 429, { loi: 'Gửi nhanh quá — đợi chút' }), true;
          const t = await docBody(CO_DE_XUAT + 64 * 1024);
          const key = String(t.key || ''); if (!keySnap.has(key)) return json(res, 400, { loi: 'Màn không thuộc link này' }), true;
          if (typeof t.html !== 'string' || !t.html.trim() || t.html.length > CO_DE_XUAT) return json(res, 400, { loi: 'Thiếu HTML hoặc quá lớn' }), true;
          const mo = await khoa();
          try {
            const g = docJson(tepGopY(s.ht), () => ({ ds: [] }));
            const gy = t.gy ? g.ds.find((x) => x.id === t.gy) : null;
            if (t.gy && !gy) return json(res, 404, { loi: 'Không có góp ý gắn với đề xuất' }), true;
            const dx = docJson(tepDeXuat(s.ht), () => ({ ds: [] }));
            if (dx.ds.length >= TOI_DA.deXuat) return json(res, 409, { loi: 'Hành trình này đã quá nhiều đề xuất' }), true;
            const w = Math.round(Number(t.w)), h = Math.round(Number(t.h));
            const moi = { id: idMoi(), ma: s.ma, v: s.v, key, gy: gy?.id || null, ten: ten40(t.ten), nhan: sachChu(t.nhan, 120), model: sachChu(t.model, 60),
              w: w > 0 && w < 5000 ? w : undefined, h: h > 0 && h < 20000 ? h : undefined, tt: 'cho', t: new Date().toISOString() };
            fs.mkdirSync(thuDeXuat(s.ht), { recursive: true });
            C.ghiAtomic(path.join(thuDeXuat(s.ht), `${moi.id}.html`), t.html);
            dx.ds.push(moi); ghi(tepDeXuat(s.ht), dx);
            bao(s.ht, 'de-xuat');
            return json(res, 200, moi), true;
          } finally { mo(); }
        }
        return json(res, 404, { loi: 'Không có' }), true;
      }

      // ===== phía chủ quản (bàn chính) =====
      if (!laChuQuan(req)) return json(res, 403, { loi: 'Cần mã chủ quản', canMa: true }), true;
      const HT = await C.hanhTrinh();
      if (!a && !ghiVao) { // toàn bộ: link chia sẻ + góp ý + đề xuất theo hành trình
        const gopY = {}, deXuat = {};
        for (const ht of HT.keys()) {
          const g = docJson(tepGopY(ht), () => ({ ds: [] })).ds; if (g.length) gopY[ht] = g;
          const dx = docJson(tepDeXuat(ht), () => ({ ds: [] })).ds; if (dx.length) deXuat[ht] = dx.map(deXuatRa);
        }
        return json(res, 200, { chiaSe: dsChiaSe(), gopY, deXuat }), true;
      }
      if (a === 'chia-se' && !b && ghiVao) { // tạo ảnh chụp đóng băng của một hành trình
        const t = await docBody(CO_CHIA_SE);
        const h = HT.get(String(t.ht || '')); if (!h) return json(res, 400, { loi: 'Không có hành trình này' }), true;
        const man = Array.isArray(t.man) ? t.man : [];
        const keyHt = new Set(h.buoc);
        if (!man.length || man.length > 80 || man.some((m) => !m || !keyHt.has(m.key) || typeof m.html !== 'string' || !m.html.trim() || m.html.length > CO_DE_XUAT))
          return json(res, 400, { loi: 'Danh sách màn không khớp hành trình' }), true;
        const qt = typeof t.qt === 'string' && /^<svg[\s>]/.test(t.qt.trim()) ? t.qt : '';
        const mo = await khoa();
        try {
          const ds = dsChiaSe(); if (ds.length >= TOI_DA.chiaSe) return json(res, 409, { loi: 'Quá nhiều link chia sẻ — thu hồi bớt' }), true;
          const ma = crypto.randomBytes(16).toString('hex'); // 128 bit
          const v = ds.filter((x) => x.ht === h.id).reduce((a2, x) => Math.max(a2, x.v), 0) + 1;
          const s = { ma, ht: h.id, htTen: h.ten, v, ghiChu: sachChu(t.ghiChu, 300), t: new Date().toISOString(), thuHoi: null, soMan: man.length };
          const thu = thuSnap(ma); fs.mkdirSync(thu, { recursive: true });
          const meta = { ma, ht: h.id, htTen: h.ten, v, man: man.map((m) => {
            const w = Math.round(Number(m.w)), hh = Math.round(Number(m.h));
            return { key: m.key, ten: sachChu(m.ten, 120), w: w > 0 && w < 5000 ? w : 390, h: hh > 0 && hh < 20000 ? hh : 844, pb: Number.isInteger(m.pb) ? m.pb : 0 };
          }) };
          for (const m of man) C.ghiAtomic(path.join(thu, `m-${m.key}.html`), m.html);
          if (qt) C.ghiAtomic(path.join(thu, 'qt.svg'), qt);
          C.ghiAtomic(path.join(thu, 'meta.json'), JSON.stringify(meta));
          ds.push(s); ghi(tepChiaSe(), { ds });
          bao(h.id, 'chia-se');
          return json(res, 200, s), true;
        } finally { mo(); }
      }
      if (a === 'chia-se' && MA.test(b || '') && c === 'thu-hoi' && ghiVao) {
        const mo = await khoa();
        try {
          const ds = dsChiaSe(); const s = ds.find((x) => x.ma === b); if (!s) return json(res, 404, { loi: 'Không có link này' }), true;
          s.thuHoi ||= new Date().toISOString(); ghi(tepChiaSe(), { ds });
          C.phat(`r-${s.ma}`, { t: 'rv', loai: 'thu-hoi', ht: s.ht }); bao(s.ht, 'chia-se');
          return json(res, 200, s), true;
        } finally { mo(); }
      }
      if (a === 'gop-y' && HT.has(b) && ID.test(c || '') && ghiVao) { // đổi trạng thái / chủ quản trả lời
        const t = await docBody(16 * 1024);
        const mo = await khoa();
        try {
          const g = docJson(tepGopY(b), () => ({ ds: [] })); const x = g.ds.find((y) => y.id === c);
          if (!x) return json(res, 404, { loi: 'Không có góp ý này' }), true;
          if (d === 'tt') { if (t.tt !== 'mo' && t.tt !== 'xong') return json(res, 400, { loi: 'Trạng thái lạ' }), true; x.tt = t.tt; x.tXl = new Date().toISOString(); }
          else if (d === 'tl') { const noi = sachChu(t.noi, 2000); if (!noi) return json(res, 400, { loi: 'Trả lời trống' }), true; (x.tl ||= []).push({ id: idMoi(), ten: ten40(t.ten), noi, t: new Date().toISOString(), chuQuan: true }); }
          else return json(res, 404, { loi: 'Không có' }), true;
          ghi(tepGopY(b), g); bao(b, 'gop-y');
          return json(res, 200, x), true;
        } finally { mo(); }
      }
      if (a === 'de-xuat' && HT.has(b) && ID.test(c || '')) {
        if (!ghiVao && !d) {
          const dx = docJson(tepDeXuat(b), () => ({ ds: [] })).ds.find((x) => x.id === c);
          if (!dx) return json(res, 404, { loi: 'Không có đề xuất' }), true;
          return json(res, 200, { ...deXuatRa(dx), html: fs.readFileSync(path.join(thuDeXuat(b), `${dx.id}.html`), 'utf8') }), true;
        }
        if (!ghiVao || (d !== 'chap' && d !== 'tu')) return json(res, 404, { loi: 'Không có' }), true;
        const t = await docBody(CO_DE_XUAT + 64 * 1024);
        const mo = await khoa();
        try {
          const dx = docJson(tepDeXuat(b), () => ({ ds: [] })); const x = dx.ds.find((y) => y.id === c);
          if (!x) return json(res, 404, { loi: 'Không có đề xuất' }), true;
          if (x.tt !== 'cho') return json(res, 409, { loi: `Đề xuất này đã ${x.tt === 'chap' ? 'được áp dụng' : 'bị từ chối'}` }), true;
          const g = docJson(tepGopY(b), () => ({ ds: [] })); const gy = x.gy ? g.ds.find((y) => y.id === x.gy) : null;
          if (d === 'tu') {
            x.tt = 'tu'; x.lyDo = sachChu(t.lyDo, 600); x.tXl = new Date().toISOString();
            ghi(tepDeXuat(b), dx); bao(b, 'de-xuat');
            return json(res, 200, deXuatRa(x)), true;
          }
          // Accept changes = Thay màn: phiên bản mới ghi tác giả + liên kết góp ý. «Sửa tiếp» gửi kèm HTML đã sửa.
          // HTML do bàn chủ quản gửi (đã qua lamSach như Thay màn) — không ghi thẳng HTML thô người review gửi lên vào kho phiên bản
          const html = typeof t.html === 'string' && t.html.trim() ? t.html : '';
          if (!html) return json(res, 400, { loi: 'Thiếu HTML đã làm sạch của đề xuất' }), true;
          const [ma, m] = await C.ghiPhienBan(x.key, { html, w: t.w ?? x.w, h: t.h ?? x.h, nhan: `Đề xuất của ${x.ten}${x.nhan ? ` · ${x.nhan}` : ''}`,
            yTuong: gy ? gy.noi : '', nguon: 'de-xuat', model: x.model }, { tacGia: x.ten, gy: x.gy || '', dx: x.id, suaTiep: !!t.suaTiep });
          if (ma !== 200) return json(res, ma, m), true;
          x.tt = 'chap'; x.vMoi = m.hien; x.tXl = new Date().toISOString();
          ghi(tepDeXuat(b), dx);
          if (gy && gy.tt !== 'xong') { gy.tt = 'xong'; gy.tXl = x.tXl; ghi(tepGopY(b), g); }
          bao(b, 'de-xuat'); C.phat('bang', { t: 'rv', loai: 'thay', key: x.key, ht: b });
          return json(res, 200, { deXuat: deXuatRa(x), manifest: m }), true;
        } finally { mo(); }
      }
      return json(res, 404, { loi: 'Không có' }), true;
    } catch (er) {
      return json(res, er.ma || 500, { loi: er.ma ? er.message : 'Lỗi kho góp ý' }), true;
    }
  }

  return { xuLy, laChuQuan, khoaBang, conHieuLuc };
}
