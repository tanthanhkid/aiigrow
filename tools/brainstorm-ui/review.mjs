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
  const saiMa = new Map(); const SAI_TONG = new Map(); // loại bí mật → { t, n }
  // chỉ tin cf-connecting-ip khi yêu cầu đến từ cloudflared trên máy này (loopback); nối thẳng thì dùng địa chỉ socket
  const ipCua = (req) => { const s = req.socket.remoteAddress || ''; return /^(127\.|::1$|::ffff:127\.)/.test(s) && req.headers['cf-connecting-ip'] ? String(req.headers['cf-connecting-ip']).slice(0, 64) : s; };
  const AU = C.audit || { ghi() {} };
  let cq = { t: -1, j: {} }; // nhớ theo mtime: không đọc lại tệp mỗi yêu cầu
  // tóm tắt quyền để ghi audit — KHÔNG BAO GIỜ ghi mã (kể cả băm của mã); chỉ «có mã» + «mã vừa đổi»
  const tomCq = (j) => ({ khoaBang: j.khoaBang === true, coMa: String(j.ma || '').length >= 8, coMaMcp: String(j.maMcp || '').length >= 8, coMatKhau: String(j.matKhau || '').length >= 8, coBiMatPhien: String(j.biMatPhien || '').length >= 32 });
  function cauHinh() {
    let t = 0; try { t = fs.statSync(TEP_CQ).mtimeMs; } catch { t = 0; }
    if (t !== cq.t) {
      const cu = cq;
      if (!t) cq = { t, j: {}, hong: String(cu.j.matKhau || '').length >= 8 }; // đã có mật khẩu mà tệp biến mất (đang lưu lại/di chuyển) ⇒ đóng cổng, không mở toang
      else { try { const j = JSON.parse(fs.readFileSync(TEP_CQ, 'utf8')); cq = { t, j: j && typeof j === 'object' && !Array.isArray(j) ? j : {}, hong: !(j && typeof j === 'object' && !Array.isArray(j)) }; } catch { cq = { t, j: {}, hong: true }; } }
      const a = tomCq(cu.j), b = { ...tomCq(cq.j), doiMa: String(cu.j.ma || '') !== String(cq.j.ma || ''), doiMaMcp: String(cu.j.maMcp || '') !== String(cq.j.maMcp || ''), doiMatKhau: String(cu.j.matKhau || '') !== String(cq.j.matKhau || ''), doiBiMatPhien: String(cu.j.biMatPhien || '') !== String(cq.j.biMatPhien || '') };
      if (cu.t !== -1 && (b.doiMa || b.doiMaMcp || b.doiMatKhau || b.doiBiMatPhien || a.coBiMatPhien !== b.coBiMatPhien || a.khoaBang !== b.khoaBang || a.coMa !== b.coMa || a.coMaMcp !== b.coMaMcp || a.coMatKhau !== b.coMatKhau)) // lần đọc đầu tiên khi chạy máy chủ không phải «đổi»
        AU.ghi({ loai: 'quyen.doi-cau-hinh', dt: { tep: 'chu-quan.json' }, ai: { ten: 'máy chủ', vai: 'he-thong' }, truoc: a, sau: b, ghiChu: t ? 'chu-quan.json đổi' : 'chu-quan.json bị xoá' }, { motLan: `cq:${t}` });
    }
    return cq.j;
  }
  // chu-quan.json có mà đọc không được (JSON hỏng, đang ghi dở…) ⇒ cổng mật khẩu ĐÓNG (server.mjs trả 503), không mở toang
  const cauHinhHong = () => { cauHinh(); return cq.hong === true; };
  // có matKhau mà thiếu biMatPhien ⇒ tự sinh (ngẫu nhiên 256 bit), ghi lại chu-quan.json (chmod 600) — không bao giờ in ra
  let loiBiMat = false;
  function damBaoBiMatPhien() {
    const j = cauHinh();
    if (cq.hong || String(j.matKhau || '').length < 8 || String(j.biMatPhien || '').length >= 32) return;
    const moi = { ...j, biMatPhien: crypto.randomBytes(32).toString('hex') };
    const tam = `${TEP_CQ}.${process.pid}.${Date.now()}.tam`;
    try { fs.writeFileSync(tam, JSON.stringify(moi, null, 1), { mode: 0o600 }); fs.renameSync(tam, TEP_CQ); } catch (e) {
      try { fs.unlinkSync(tam); } catch { /* chưa tạo */ }
      if (!loiBiMat) console.error('! Không ghi được biMatPhien vào chu-quan.json:', e.code || e.message, '— cổng mật khẩu chưa bật'); loiBiMat = true;
    }
  }
  // vai của người gọi để ghi audit — chỉ SO mã, KHÔNG đếm lần sai/không ghi «sai mã» (ghi kho khi chưa khoá bảng không phải là thử mã:
  // mã cũ còn kèm theo trong lúc tự lưu không được làm đầy audit hay khoá IP của chủ quản)
  function vaiCua(req) {
    if (daKiem.has(req)) return daKiem.get(req) ? 'chu-quan' : 'cong-tac';
    if (laNoiBo(req)) return 'chu-quan';
    const ma = String(cauHinh().ma || ''); const gui = String(req.headers['x-bs-chu-quan'] || '');
    return ma.length >= 8 && gui && dungMa(ma, gui) ? 'chu-quan' : 'cong-tac';
  }
  const bang = (x) => crypto.createHash('sha256').update(x).digest();
  const dungMa = (ma, gui) => crypto.timingSafeEqual(bang(ma), bang(gui));
  function laNoiBo(req) {
    if (C.coNoiBo === false) return false; // Cloudflare: không có lối «127.0.0.1»
    const h = String(req.headers.host || '').toLowerCase();
    return /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h) && !req.headers['cf-connecting-ip'] && !req.headers['cf-ray'] && !req.headers['x-forwarded-for'];
  }
  const daKiem = new WeakMap(); // req → kết quả: gọi laChuQuan nhiều lần trong một yêu cầu không đếm sai nhiều lần
  function laChuQuan(req) {
    if (daKiem.has(req)) return daKiem.get(req);
    daKiem.set(req, false); // trong lúc kiểm (vd. ghi audit «sai mã» gọi lại vaiCua) coi như chưa phải chủ quản — không đệ quy
    const kq = kiemMa(req); daKiem.set(req, kq); return kq;
  }
  function kiemMa(req) {
    return kiemBiMat(req, String(cauHinh().ma || ''), String(req.headers['x-bs-chu-quan'] || ''), { loai: 'quyen.sai-ma', ten: 'mã chủ quản', duong: String(req.url || '').split('?')[0].slice(0, 80) });
  }
  // Mật khẩu MCP («maMcp» trong chu-quan.json): gọi /mcp qua tên miền bắt buộc «Authorization: Bearer <maMcp>»; 127.0.0.1 gõ thẳng thì mở.
  function kiemMaMcp(req) {
    const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    return kiemBiMat(req, String(cauHinh().maMcp || ''), m ? m[1].trim() : '', { loai: 'quyen.sai-ma-mcp', ten: 'mật khẩu MCP', duong: '/mcp', them: { nguon: 'mcp' } });
  }
  // Mật khẩu chung («matKhau» trong chu-quan.json): cổng vào mọi đường khi vào qua tên miền (cong-vao.mjs). Cùng bộ giới hạn sai.
  function kiemMatKhau(req, gui) {
    return kiemBiMat(req, String(cauHinh().matKhau || ''), String(gui || ''), { loai: 'quyen.sai-mat-khau', ten: 'mật khẩu chung', duong: '/__dang-nhap', tongToiDa: 1000 });
  }
  // So một bí mật (mã chủ quản / mật khẩu MCP / mật khẩu chung) — dùng CHUNG bộ giới hạn sai: 10 lần/phút/IP, 100 lần/phút cả máy chủ. Không bao giờ ghi giá trị mã.
  function kiemBiMat(req, ma, gui, au) {
    if (laNoiBo(req)) return true;
    if (ma.length < 8 || !gui) return false;
    const ip = `${au.loai}|${ipCua(req)}`; const now = Date.now(); const s = saiMa.get(ip);
    if (s && now - s.t < 60000 && s.n >= 10) return false;
    let saiTong = SAI_TONG.get(au.loai); if (!saiTong) SAI_TONG.set(au.loai, saiTong = { t: 0, n: 0 });
    if (now - saiTong.t >= 60000) { saiTong.t = now; saiTong.n = 0; }
    // chặn đoán mã kể cả khi IP bị giả: tối đa 100 lần sai/phút cho cả máy chủ (mật khẩu chung — cổng vào của cả nhóm — 1000, để người lạ khó khoá cả nhóm)
    if (saiTong.n >= (au.tongToiDa || 100)) return false;
    if (dungMa(ma, gui)) return true;
    saiTong.n++;
    let n = 1; if (!s || now - s.t >= 60000) saiMa.set(ip, { t: now, n: 1 }); else n = ++s.n;
    // ghi audit lần sai ĐẦU của mỗi IP mỗi phút và lần chạm ngưỡng chặn — không để dò mã làm đầy nhật ký
    if (n === 1 || n === 10) AU.ghi({ loai: au.loai, dt: { duong: au.duong }, ai: { ...(C.ai ? C.ai(req) : {}), vai: 'khong-ro', ...(au.them || {}) }, truoc: null, sau: null, ghiChu: `thử ${au.ten} sai (độ dài ${gui.length})${n === 10 ? ' · lần thứ 10 trong 1 phút — IP bị chặn thử tới hết phút' : ''}` });
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
    let ma = []; try { ma = dsChiaSe().filter((s) => s.ht === ht && !s.thuHoi).map((s) => `r-${s.ma}`); } catch { /* kho hỏng: chỉ báo bàn */ }
    const phong = new Set(C.dsPhong());
    for (const p of ['bang', ...ma]) if (phong.has(p)) C.phat(p, { t: 'rv', loai, ht, ...them });
  }

  // ---------- dữ liệu gửi ra ----------
  const gopYRa = (g) => ({ ...g });
  const deXuatRa = (d) => { const { tep, ...con } = d; return con; };
  // gửi cho người review: bỏ mã link («ma») của từng góp ý/trả lời/đề xuất — biết mã link khác là vào được link đó (kể cả khi link mình bị thu hồi)
  const boMa = (o) => { const { ma, ...con } = o; return con; }; // eslint-disable-line no-unused-vars
  const gopYCho = (g) => ({ ...boMa(g), tl: (g.tl || []).map(boMa) });
  const deXuatCho = (d) => boMa(deXuatRa(d));
  function goiReview(s) {
    const meta = JSON.parse(fs.readFileSync(path.join(thuSnap(s.ma), 'meta.json'), 'utf8'));
    const man = meta.man.map((m) => ({ ...m, html: fs.readFileSync(path.join(thuSnap(s.ma), `m-${m.key}.html`), 'utf8') }));
    let qt = ''; try { qt = fs.readFileSync(path.join(thuSnap(s.ma), 'qt.svg'), 'utf8'); } catch { /* không có sơ đồ */ }
    const cungHt = dsChiaSe().filter((x) => x.ht === s.ht).map((x) => ({ ma: x.ma, v: x.v }));
    return { ma: s.ma, ht: s.ht, htTen: meta.htTen, v: s.v, ghiChu: s.ghiChu, t: s.t, man, qt, phienBan: cungHt.map((x) => x.v),
      gopY: docJson(tepGopY(s.ht), () => ({ ds: [] })).ds.map(gopYCho), deXuat: docJson(tepDeXuat(s.ht), () => ({ ds: [] })).ds.map(deXuatCho) };
  }

  // ---------- xử lý ----------
  // trả true nếu đã xử lý yêu cầu
  const sao = (o) => (o == null ? null : JSON.parse(JSON.stringify(o)));
  const aiCua = (req, them = {}) => (C.ai ? C.ai(req, them) : them);
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
            return json(res, 200, { gopY: docJson(tepGopY(s.ht), () => ({ ds: [] })).ds.map(gopYCho), deXuat: docJson(tepDeXuat(s.ht), () => ({ ds: [] })).ds.map(deXuatCho) }), true;
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
            let moi, ev;
            if (t.cha) { // trả lời: cùng hành trình
              const cha = g.ds.find((x) => x.id === t.cha); if (!cha) return json(res, 404, { loi: 'Không có góp ý để trả lời' }), true;
              if ((cha.tl || []).length >= 200) return json(res, 409, { loi: 'Luồng quá dài' }), true;
              const truoc = sao(cha);
              moi = { id: idMoi(), ten: ten40(t.ten), noi, t: new Date().toISOString(), ma: s.ma };
              (cha.tl ||= []).push(moi);
              ev = { loai: 'gop-y.tra-loi', dt: { ht: s.ht, id: cha.id, key: cha.key || undefined, ma: s.ma }, truoc, sau: sao(cha) };
            } else {
              const key = t.key == null || t.key === '' ? null : String(t.key);
              if (key && !keySnap.has(key)) return json(res, 400, { loi: 'Màn không thuộc link này' }), true;
              const gh = t.ghim && key ? { x: Math.min(100, Math.max(0, Number(t.ghim.x) || 0)), y: Math.min(100, Math.max(0, Number(t.ghim.y) || 0)), sel: sachChu(t.ghim.sel, 300) } : null;
              moi = { id: idMoi(), ma: s.ma, v: s.v, key, ghim: gh, muc: MUC.has(t.muc) ? t.muc : 'de-xuat', tt: 'mo', ten: ten40(t.ten), noi, t: new Date().toISOString(), tl: [], ycBt: false };
              g.ds.push(moi);
              ev = { loai: 'gop-y.tao', dt: { ht: s.ht, id: moi.id, key: key || undefined, ma: s.ma }, truoc: null, sau: sao(moi) };
            }
            ghi(tepGopY(s.ht), g);
            AU.ghi({ ...ev, ai: aiCua(req, { vai: 'reviewer', ma: s.ma, ten: moi.ten }) });
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
            const truoc = sao(x);
            x.ycBt = true; ghi(tepGopY(s.ht), g);
            AU.ghi({ loai: 'gop-y.yc-bien-the', dt: { ht: s.ht, id: x.id, key: x.key || undefined, ma: s.ma }, ai: aiCua(req, { vai: 'reviewer', ma: s.ma }), truoc, sau: sao(x) });
            bao(s.ht, 'gop-y');
            return json(res, 200, gopYCho(x)), true;
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
            if (t.gy && (!gy || gy.key !== t.key)) return json(res, 404, { loi: 'Không có góp ý của màn này gắn với đề xuất' }), true;
            const dx = docJson(tepDeXuat(s.ht), () => ({ ds: [] }));
            if (dx.ds.length >= TOI_DA.deXuat) return json(res, 409, { loi: 'Hành trình này đã quá nhiều đề xuất' }), true;
            if (dx.ds.filter((x) => x.tt === 'cho').length >= 60) return json(res, 409, { loi: 'Đã có 60 đề xuất chờ duyệt — đợi người phụ trách duyệt bớt' }), true;
            const w = Math.round(Number(t.w)), h = Math.round(Number(t.h));
            const moi = { id: idMoi(), ma: s.ma, v: s.v, key, gy: gy?.id || null, ten: ten40(t.ten), nhan: sachChu(t.nhan, 120), model: sachChu(t.model, 60),
              w: w > 0 && w < 5000 ? w : undefined, h: h > 0 && h < 20000 ? h : undefined, tt: 'cho', t: new Date().toISOString() };
            fs.mkdirSync(thuDeXuat(s.ht), { recursive: true });
            C.ghiAtomic(path.join(thuDeXuat(s.ht), `${moi.id}.html`), t.html);
            dx.ds.push(moi); ghi(tepDeXuat(s.ht), dx);
            AU.ghi({ loai: 'de-xuat.tao', dt: { ht: s.ht, id: moi.id, key, gy: moi.gy || undefined, ma: s.ma }, ai: aiCua(req, { vai: 'reviewer', ma: s.ma, ten: moi.ten }), truoc: null, sau: { ...moi, html: t.html } });
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
          const ds = dsChiaSe(); if (ds.filter((x) => !x.thuHoi).length >= TOI_DA.chiaSe) return json(res, 409, { loi: 'Quá nhiều link chia sẻ đang mở — thu hồi bớt' }), true;
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
          AU.ghi({ loai: 'link.tao', dt: { ht: h.id, ma }, ai: aiCua(req), truoc: null, sau: { ...s, man: meta.man } });
          bao(h.id, 'chia-se');
          return json(res, 200, s), true;
        } finally { mo(); }
      }
      if (a === 'chia-se' && MA.test(b || '') && c === 'thu-hoi' && ghiVao) {
        const mo = await khoa();
        try {
          const ds = dsChiaSe(); const s = ds.find((x) => x.ma === b); if (!s) return json(res, 404, { loi: 'Không có link này' }), true;
          const truoc = sao(s);
          s.thuHoi ||= new Date().toISOString(); ghi(tepChiaSe(), { ds });
          if (!truoc.thuHoi) AU.ghi({ loai: 'link.thu-hoi', dt: { ht: s.ht, ma: s.ma }, ai: aiCua(req), truoc, sau: sao(s) });
          C.phat(`r-${s.ma}`, { t: 'rv', loai: 'thu-hoi', ht: s.ht }); bao(s.ht, 'chia-se');
          setTimeout(() => C.dongPhong?.(`r-${s.ma}`), 300); // báo xong thì cắt kết nối realtime của link đã thu hồi
          return json(res, 200, s), true;
        } finally { mo(); }
      }
      if (a === 'gop-y' && HT.has(b) && ID.test(c || '') && ghiVao) { // đổi trạng thái / chủ quản trả lời
        const t = await docBody(16 * 1024);
        const mo = await khoa();
        try {
          const g = docJson(tepGopY(b), () => ({ ds: [] })); const x = g.ds.find((y) => y.id === c);
          if (!x) return json(res, 404, { loi: 'Không có góp ý này' }), true;
          const truoc = sao(x); let loai;
          if (d === 'tt') { if (t.tt !== 'mo' && t.tt !== 'xong') return json(res, 400, { loi: 'Trạng thái lạ' }), true; x.tt = t.tt; x.tXl = new Date().toISOString(); loai = 'gop-y.trang-thai'; }
          else if (d === 'tl') { const noi = sachChu(t.noi, 2000); if (!noi) return json(res, 400, { loi: 'Trả lời trống' }), true; (x.tl ||= []).push({ id: idMoi(), ten: ten40(t.ten), noi, t: new Date().toISOString(), chuQuan: true }); loai = 'gop-y.tra-loi'; }
          else if (d === 'muc') { if (!MUC.has(t.muc)) return json(res, 400, { loi: 'Mức lạ' }), true; x.muc = t.muc; loai = 'gop-y.muc'; }
          else if (d === 'sua') { const noi = sachChu(t.noi, 2000); if (!noi) return json(res, 400, { loi: 'Góp ý trống' }), true; x.noi = noi; x.tSuaNoi = new Date().toISOString(); loai = 'gop-y.sua'; }
          else if (d === 'xoa') { g.ds.splice(g.ds.indexOf(x), 1); loai = 'gop-y.xoa'; }
          else return json(res, 404, { loi: 'Không có' }), true;
          ghi(tepGopY(b), g);
          AU.ghi({ loai, dt: { ht: b, id: x.id, key: x.key || undefined }, ai: aiCua(req, t.ten && d === 'tl' ? { ten: ten40(t.ten) } : {}), truoc, sau: d === 'xoa' ? null : sao(x) });
          bao(b, 'gop-y');
          return json(res, 200, d === 'xoa' ? { xoa: x.id } : x), true;
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
          const truocDx = sao(deXuatRa(x));
          if (d === 'tu') {
            x.tt = 'tu'; x.lyDo = sachChu(t.lyDo, 600); x.tXl = new Date().toISOString();
            ghi(tepDeXuat(b), dx);
            AU.ghi({ loai: 'de-xuat.tu-choi', dt: { ht: b, id: x.id, key: x.key, gy: x.gy || undefined }, ai: aiCua(req), truoc: truocDx, sau: sao(deXuatRa(x)) });
            bao(b, 'de-xuat');
            return json(res, 200, deXuatRa(x)), true;
          }
          // Accept changes = Thay màn: phiên bản mới ghi tác giả + liên kết góp ý. «Sửa tiếp» gửi kèm HTML đã sửa.
          // HTML do bàn chủ quản gửi (đã qua lamSach như Thay màn) — không ghi thẳng HTML thô người review gửi lên vào kho phiên bản
          const html = typeof t.html === 'string' && t.html.trim() ? t.html : '';
          if (!html) return json(res, 400, { loi: 'Thiếu HTML đã làm sạch của đề xuất' }), true;
          const [ma, m] = await C.ghiPhienBan(x.key, { html, w: t.w ?? x.w, h: t.h ?? x.h, nhan: `Đề xuất của ${x.ten}${x.nhan ? ` · ${x.nhan}` : ''}`,
            yTuong: gy ? gy.noi : '', nguon: 'de-xuat', model: x.model }, { tacGia: x.ten, gy: x.gy || '', dx: x.id, suaTiep: !!t.suaTiep }, aiCua(req));
          if (ma !== 200) return json(res, ma, m), true;
          x.tt = 'chap'; x.vMoi = m.hien; x.tXl = new Date().toISOString();
          ghi(tepDeXuat(b), dx);
          const evs = [{ loai: t.suaTiep ? 'de-xuat.sua-tiep' : 'de-xuat.chap', dt: { ht: b, id: x.id, key: x.key, gy: x.gy || undefined }, ai: aiCua(req), truoc: truocDx, sau: { ...sao(deXuatRa(x)), htmlApDung: html } }];
          if (gy && gy.tt !== 'xong') {
            const truocGy = sao(gy); gy.tt = 'xong'; gy.tXl = x.tXl; ghi(tepGopY(b), g);
            evs.push({ loai: 'gop-y.trang-thai', dt: { ht: b, id: gy.id, key: gy.key || undefined }, ai: aiCua(req), truoc: truocGy, sau: sao(gy), ghiChu: 'tự chuyển «Đã xử lý» khi áp dụng đề xuất' });
          }
          AU.ghi(evs);
          bao(b, 'de-xuat'); C.phat('bang', { t: 'rv', loai: 'thay', key: x.key, ht: b });
          return json(res, 200, { deXuat: deXuatRa(x), manifest: m }), true;
        } finally { mo(); }
      }
      return json(res, 404, { loi: 'Không có' }), true;
    } catch (er) {
      return json(res, er.ma || 500, { loi: er.ma ? er.message : 'Lỗi kho góp ý' }), true;
    }
  }

  // «Khôi phục trạng thái này» cho một góp ý (từ Lịch sử thay đổi): thay/chèn lại bản cũ, null = xoá. Ghi sự kiện MỚI.
  async function datGopY(ht, id, cu, ai, nguon) {
    if (!(await C.hanhTrinh()).has(ht) || !ID.test(String(id))) return { loi: 'Góp ý không hợp lệ' };
    const mo = await khoa();
    try {
      const g = docJson(tepGopY(ht), () => ({ ds: [] })); const k = g.ds.findIndex((y) => y.id === id);
      const truoc = k >= 0 ? sao(g.ds[k]) : null;
      if (cu == null) { if (k < 0) return { loi: 'Góp ý không còn' }; g.ds.splice(k, 1); }
      else {
        if (!cu || typeof cu !== 'object' || cu.id !== id) return { loi: 'Trạng thái góp ý hỏng' };
        if (k >= 0) g.ds[k] = cu; else { if (g.ds.length >= TOI_DA.gopY) return { loi: 'Quá nhiều góp ý' }; g.ds.push(cu); }
      }
      ghi(tepGopY(ht), g);
      AU.ghi({ loai: 'gop-y.khoi-phuc-lich-su', dt: { ht, id, key: (cu || truoc)?.key || undefined }, ai, truoc, sau: cu, ghiChu: `khôi phục trạng thái ${nguon}` });
      bao(ht, 'gop-y');
      return { m: cu };
    } finally { mo(); }
  }

  return { xuLy, laChuQuan, kiemMaMcp, kiemMatKhau, laNoiBo, cauHinh, cauHinhHong, damBaoBiMatPhien, khoaBang, conHieuLuc, vaiCua, datGopY, ipCua };
}
