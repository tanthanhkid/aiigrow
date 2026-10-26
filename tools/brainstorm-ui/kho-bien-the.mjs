// Kho biến thể dùng chung (ngoài git): mọi khung biến thể + phương án hành trình của bàn, ai mở bàn cũng thấy cùng một bộ.
// Mỗi mục một tệp: k/<id>.json (thông tin khung) + k/<id>.html (HTML) [+ k/<id>.phu: bản sửa tay của khung «Làm mượt»], l/<id>.json (phương án).
// Xoá = xoá mềm: chuyển vào rac/ (giữ 7 ngày, khôi phục được). Ghi atomic, giới hạn cỡ + tốc độ, kiểm Origin như kho phiên bản.
// Thay đổi được phát cho phòng realtime «bang» ({t:'kho'}); thay đổi do TIẾN TRÌNH KHÁC ghi cùng kho (vd. 5178 và 5181) bắt bằng fs.watch.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ID = /^[\w-]{1,120}$/;
const HTML_TOI_DA = 3 * 1024 * 1024;     // một khung
const META_TOI_DA = 64 * 1024;           // thông tin khung / phương án (không kể HTML)
const THAN_TOI_DA = 40 * 1024 * 1024;    // một lần ghi (nhiều mục); client chia lô ≤ ~20 MB, một khung tối đa 3 × 3 MB ký tự
const SO_TOI_DA = 4000;                  // số mục tối đa mỗi loại
const RAC_GIU = 7 * 24 * 3600 * 1000;    // thùng rác 7 ngày
const LOAI = { k: 'khung', l: 'lan' };
const SO_MOI_LAN = 200;                  // số mục tối đa mỗi yêu cầu (client chia lô nhỏ hơn)
const TEN_MUC = /^([\w-]{1,120})\.json$/;

export function taoKhoBienThe(C) {
  const KHO = process.env.BS_BIEN_THE || path.join(C.THIET_KE, 'brainstorm-ui/bien-the');
  const dir = (l) => path.join(KHO, l);
  for (const l of ['k', 'l', 'rac']) fs.mkdirSync(dir(l), { recursive: true });
  const bam = (...ds) => crypto.createHash('sha1').update(ds.map((x) => x || '').join('\0')).digest('hex').slice(0, 16);
  const docJson = (t) => { try { return JSON.parse(fs.readFileSync(t, 'utf8')); } catch { return null; } };
  const tepMuc = (l, id) => path.join(dir(l), `${id}.json`);
  const tepPhu = (id) => path.join(dir('k'), `${id}.phu`);

  // ---- chỉ mục thông tin trong bộ nhớ (đọc đĩa một lần lúc chạy; ghi/watch/quét định kỳ cập nhật)
  const BO = { k: new Map(), l: new Map() };
  for (const l of ['k', 'l']) {
    let ten = []; try { ten = fs.readdirSync(dir(l)); } catch { /* rỗng */ }
    for (const t of ten) { const id = t.match(TEN_MUC)?.[1]; const m = id && docJson(path.join(dir(l), t)); if (m && m.id === id) BO[l].set(id, m); }
  }
  const ghi = (tep, nd) => C.ghiAtomic(tep, nd);
  const xoaTep = (tep) => { try { fs.unlinkSync(tep); } catch { /* không có */ } };
  const doiTen = (a, b) => { try { fs.renameSync(a, b); return true; } catch { return false; } };
  const datMuc = (l, m) => { ghi(tepMuc(l, m.id), JSON.stringify(m)); BO[l].set(m.id, m); };
  const boMuc = (l, id) => { BO[l].delete(id); xoaTep(tepMuc(l, id)); };
  // ---- audit: trạng thái đầy đủ của một mục (thông tin + HTML + bản sửa tay) để ghi «trước/sau»
  const A = C.audit || { ghi() {} };
  const docTep = (t) => { try { return fs.readFileSync(t, 'utf8'); } catch { return ''; } };
  function trangThai(l, id, meta, tuRac = false) {
    if (!meta) return null;
    const { tXoa, nguoiXoa, ...m } = meta; // eslint-disable-line no-unused-vars
    if (l !== 'k') return m;
    const html = docTep(tuRac ? tepRac('k', id, 'html') : path.join(dir('k'), `${id}.html`));
    let phu = {}; try { phu = JSON.parse(docTep(tuRac ? tepRac('k', id, 'phu') : tepPhu(id)) || '{}') || {}; } catch { /* hỏng */ }
    return { ...m, html, ...(phu.htmlSua ? { htmlSua: phu.htmlSua } : {}), ...(phu.htmlGocSua ? { htmlGocSua: phu.htmlGocSua } : {}) };
  }
  const BO_QUA = new Set(['tSua', 'nguoi', 'b']); // đổi chỉ các trường này (nhịp đồng bộ) ⇒ không ghi audit
  const doiCua = (cu, moi) => [...new Set([...Object.keys(cu || {}), ...Object.keys(moi || {})])].filter((k) => !BO_QUA.has(k) && JSON.stringify(cu?.[k]) !== JSON.stringify(moi?.[k]));
  const dtCua = (l, m) => (l === 'k' ? { l, id: m.id, key: m.goc, lan: m.lan || undefined } : { l, id: m.id, key: m.tu });

  // ---- làm sạch dữ liệu vào: chỉ giữ trường của bàn, chuỗi cắt ngắn; HTML được trang làm sạch lại khi hiển thị
  const chu = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const so = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
  function sachKhung(f) {
    if (!f || typeof f !== 'object' || !ID.test(f.id || '') || typeof f.goc !== 'string' || !ID.test(f.goc)) return null;
    const m = {
      id: f.id, loai: 'bien', goc: f.goc, cha: chu(f.cha, 120), lan: chu(f.lan, 120), dot: chu(f.dot, 60), k: so(f.k), n: so(f.n),
      yTuong: chu(f.yTuong, 6000), w: so(f.w), h: so(f.h), tt: ['dang', 'xong', 'loi'].includes(f.tt) ? f.tt : 'xong', loi: chu(f.loi, 600),
      nhan: chu(f.nhan, 200), model: chu(f.model, 60), ghim: f.ghim ? true : undefined, tu: chu(f.tu, 40), nguoi: chu(f.nguoi, 40),
      dung: f.dung && typeof f.dung === 'object' ? Object.fromEntries(Object.entries(f.dung).slice(0, 8).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => [String(k).slice(0, 10), v])) : undefined,
      suaTay: Array.isArray(f.suaTay) ? f.suaTay.slice(0, 200).map((x) => String(x).slice(0, 300)) : undefined,
      tenGocSua: chu(f.tenGocSua, 200),
    };
    if (!(m.w > 0 && m.w < 5000 && m.h > 0 && m.h < 20000)) return null;
    return JSON.parse(JSON.stringify(m)); // bỏ undefined
  }
  function sachLan(l) {
    if (!l || typeof l !== 'object' || !ID.test(l.id || '') || typeof l.tu !== 'string' || !ID.test(l.tu)) return null;
    const s = JSON.stringify(l); if (s.length > META_TOI_DA) return null;
    const { tienDo, dangChay, tSuaCu, ...r } = JSON.parse(s); // eslint-disable-line no-unused-vars
    return r;
  }
  // client gửi kèm tSuaCu = bản máy chủ nó đang dựa trên; máy chủ đã có bản mới hơn ⇒ không đè (trả bản hiện tại để client lấy)
  const cuHon = (cu, o) => !!cu && Number.isFinite(o?.tSuaCu) && (cu.tSua || 0) > o.tSuaCu;

  // ---- ghi một khung / phương án (giữ tSua tăng dần)
  function ghiKhung(f, nguoi, ai = null, loai = '') {
    const m = sachKhung(f); if (!m) return { loi: `Khung ${String(f?.id || '').slice(0, 40)} không hợp lệ` };
    const html = typeof f.html === 'string' ? f.html : '';
    const phu = { htmlSua: typeof f.htmlSua === 'string' ? f.htmlSua : '', htmlGocSua: typeof f.htmlGocSua === 'string' ? f.htmlGocSua : '' };
    if (html.length > HTML_TOI_DA || phu.htmlSua.length > HTML_TOI_DA || phu.htmlGocSua.length > HTML_TOI_DA) return { loi: `HTML của ${m.id} quá lớn` };
    if (JSON.stringify(m).length > META_TOI_DA) return { loi: `Thông tin ${m.id} quá lớn` };
    // đọc bản trên ĐĨA (không tin chỉ mục): tiến trình kia (5178/5181) có thể vừa ghi mà watch chưa tới
    const cu = docJson(tepMuc('k', m.id)); if (cu) BO.k.set(m.id, cu);
    if (cuHon(cu, f)) return { xungDot: cu };
    if (m.lan && !BO.l.has(m.lan) && !fs.existsSync(tepMuc('l', m.lan))) return { loi: `Phương án của ${m.id} không còn` };
    if (!cu && BO.k.size >= SO_TOI_DA) return { loi: `Kho đã đủ ${SO_TOI_DA} biến thể — dọn bớt` };
    const racCu = !cu && fs.existsSync(tepRac('k', m.id, 'json')) ? docJson(tepRac('k', m.id, 'json')) : null;
    const coPhu = !!(phu.htmlSua || phu.htmlGocSua);
    m.b = html || coPhu ? bam(html, phu.htmlSua, phu.htmlGocSua) : ''; m.tSua = Math.max(Date.now(), (cu?.tSua || 0) + 1); m.nguoi = chu(nguoi, 40) || m.nguoi;
    if (m.tt === 'dang' && !html && !coPhu && cu) m.b = cu.b || ''; // đang sinh lại: giữ HTML cũ trên máy chủ tới khi có bản xong
    const truoc = cu ? trangThai('k', m.id, cu) : racCu ? trangThai('k', m.id, racCu, true) : null; // đủ HTML: khôi phục từ bất kỳ sự kiện nào cũng dựng lại được
    if (cu?.b !== m.b) {
      if (html) ghi(path.join(dir('k'), `${m.id}.html`), html); else xoaTep(path.join(dir('k'), `${m.id}.html`));
      if (coPhu) ghi(tepPhu(m.id), JSON.stringify(phu)); else xoaTep(tepPhu(m.id));
    }
    datMuc('k', m);
    raRac('k', m.id, false); // ghi lại một mục đang trong thùng rác (vd. hoàn tác) ⇒ mục sống lại
    const doi = doiCua(truoc && { ...truoc, html: undefined, htmlSua: undefined, htmlGocSua: undefined }, m).concat(truoc?.b !== m.b || (!cu && !racCu) ? ['html'] : []);
    if (ai && (doi.length || loai)) {
      const sau = trangThai('k', m.id, m); // blob trùng nội dung được dùng lại — không tốn chỗ khi HTML không đổi
      return { m, ev: { loai: loai || (!cu && !racCu ? 'bien-the.tao' : 'bien-the.sua'), dt: dtCua('k', m), ai, truoc, sau, ghiChu: !cu && !racCu ? 'tạo mới' : `${racCu ? 'ghi lại mục trong thùng rác · ' : ''}đổi: ${[...new Set(doi)].join(', ')}` } };
    }
    return { m };
  }
  function ghiLan(l0, ai = null, loai = '') {
    const l = sachLan(l0); if (!l) return { loi: 'Phương án không hợp lệ' };
    const cu = docJson(tepMuc('l', l.id)); if (cu) BO.l.set(l.id, cu);
    if (cuHon(cu, l0)) return { xungDot: cu };
    if (!cu && BO.l.size >= SO_TOI_DA) return { loi: 'Kho phương án đã đầy' };
    const racCu = !cu && fs.existsSync(tepRac('l', l.id, 'json')) ? trangThai('l', l.id, docJson(tepRac('l', l.id, 'json'))) : null;
    l.tSua = Math.max(Date.now(), (cu?.tSua || 0) + 1);
    datMuc('l', l);
    raRac('l', l.id, false);
    const truoc = cu || racCu; const doi = doiCua(truoc, l);
    if (ai && (doi.length || loai || !truoc)) return { m: l, ev: { loai: loai || (truoc ? 'phuong-an.sua' : 'phuong-an.tao'), dt: dtCua('l', l), ai, truoc, sau: l, ghiChu: truoc ? `đổi: ${doi.join(', ')}` : 'tạo mới' } };
    return { m: l };
  }
  // ---- thùng rác
  const tepRac = (l, id, duoi) => path.join(dir('rac'), `${l}-${id}.${duoi}`);
  function vaoRac(l, id, nguoi, ai = null, evs = null) {
    const m = BO[l].get(id); if (!m) return false;
    if (evs) evs.push({ loai: l === 'k' ? 'bien-the.xoa' : 'phuong-an.xoa', dt: dtCua(l, m), ai, truoc: trangThai(l, id, m), sau: null, ghiChu: 'vào thùng rác (giữ 7 ngày)' });
    ghi(tepRac(l, id, 'json'), JSON.stringify({ ...m, tXoa: Date.now(), nguoiXoa: chu(nguoi, 40) }));
    if (l === 'k') { doiTen(path.join(dir('k'), `${id}.html`), tepRac(l, id, 'html')); doiTen(tepPhu(id), tepRac(l, id, 'phu')); }
    boMuc(l, id);
    return true;
  }
  // xoá phương án ⇒ các màn của nó cùng vào thùng rác (không để khung mồ côi trên máy chủ)
  function vaoRacLan(id, nguoi, ai = null, evs = null) {
    if (!vaoRac('l', id, nguoi, ai, evs)) return null;
    const khung = [...BO.k.values()].filter((m) => m.lan === id).map((m) => m.id);
    for (const k of khung) vaoRac('k', k, nguoi, ai, evs);
    return khung;
  }
  // khôi phục (ghiLai=true) hoặc chỉ bỏ khỏi thùng rác (khi mục vừa được ghi mới)
  function raRac(l, id, ghiLai, ai = null, evs = null) {
    const t = tepRac(l, id, 'json'); if (!fs.existsSync(t)) return null;
    const m = docJson(t);
    if (ghiLai && m) {
      const truoc = evs ? trangThai(l, id, m, true) : null;
      const { tXoa, nguoiXoa, ...goc } = m; // eslint-disable-line no-unused-vars
      goc.tSua = Math.max(Date.now(), (goc.tSua || 0) + 1);
      if (l === 'k') { doiTen(tepRac(l, id, 'html'), path.join(dir('k'), `${id}.html`)); doiTen(tepRac(l, id, 'phu'), tepPhu(id)); }
      datMuc(l, goc);
      xoaTep(t);
      if (evs) evs.push({ loai: l === 'k' ? 'bien-the.khoi-phuc' : 'phuong-an.khoi-phuc', dt: dtCua(l, goc), ai, truoc: { ...truoc, trongThungRac: true }, sau: trangThai(l, id, goc), ghiChu: 'khôi phục từ thùng rác' });
      return goc;
    }
    xoaTep(t); xoaTep(tepRac(l, id, 'html')); xoaTep(tepRac(l, id, 'phu'));
    return null;
  }
  function donRac() {
    let ten; try { ten = fs.readdirSync(dir('rac')); } catch { return; }
    for (const t of ten) {
      if (!t.endsWith('.json')) continue;
      const m = docJson(path.join(dir('rac'), t));
      if (m && Date.now() - (m.tXoa || 0) <= RAC_GIU) continue;
      // xoá vĩnh viễn: ghi đủ nội dung vào audit (blob) TRƯỚC khi xoá tệp — dựng lại được từ «Lịch sử thay đổi»
      const l = t.slice(0, 1); const id = t.slice(2, -5);
      if (m && (l === 'k' || l === 'l')) A.ghi({ loai: l === 'k' ? 'bien-the.xoa-vinh-vien' : 'phuong-an.xoa-vinh-vien', dt: dtCua(l, { ...m, id }), ai: { ten: 'máy chủ', vai: 'he-thong' },
        truoc: { ...trangThai(l, id, m, true), tXoa: m.tXoa, nguoiXoa: m.nguoiXoa }, sau: null, ghiChu: 'dọn thùng rác sau 7 ngày' });
      for (const d of ['json', 'html', 'phu']) xoaTep(path.join(dir('rac'), t.replace(/\.json$/, `.${d}`)));
    }
  }
  donRac(); setInterval(donRac, 3600 * 1000).unref();

  // ---- phát thay đổi
  const phat = (obj) => C.phat('bang', { t: 'kho', ...obj });
  // Tiến trình khác ghi cùng kho (5178 ↔ 5181): so tệp với chỉ mục trong bộ nhớ — khác thì cập nhật chỉ mục rồi phát.
  // Ghi của chính tiến trình này đã vào chỉ mục trước nên tự khớp, không phát lại.
  function soLai(l, id) {
    const m = docJson(tepMuc(l, id)); const cu = BO[l].get(id);
    if (m && m.id === id) { if (cu && cu.tSua === m.tSua && cu.b === m.b) return; BO[l].set(id, m); phat({ loai: 'ghi', [LOAI[l]]: [m], tu: '' }); }
    else if (cu && !fs.existsSync(tepMuc(l, id))) { BO[l].delete(id); phat({ loai: 'xoa', [LOAI[l]]: [id], tu: '' }); }
  }
  const henWatch = new Map();
  for (const l of ['k', 'l']) {
    try {
      fs.watch(dir(l), (ev, ten) => {
        const id = ten && String(ten).match(TEN_MUC)?.[1]; if (!id) return;
        const khoa = `${l}:${id}`;
        clearTimeout(henWatch.get(khoa));
        henWatch.set(khoa, setTimeout(() => { henWatch.delete(khoa); soLai(l, id); }, 150));
      }).on('error', () => {});
    } catch { /* hệ thống không hỗ trợ: quét định kỳ bên dưới vẫn bắt kịp */ }
  }
  // quét định kỳ (phòng khi fs.watch lỡ sự kiện): đọc bất đồng bộ, không chặn event loop
  async function quet() {
    for (const l of ['k', 'l']) {
      let ten = []; try { ten = await fs.promises.readdir(dir(l)); } catch { continue; }
      const co = new Set();
      for (const t of ten) {
        const id = t.match(TEN_MUC)?.[1]; if (!id) continue; co.add(id);
        let m = null; try { m = JSON.parse(await fs.promises.readFile(path.join(dir(l), t), 'utf8')); } catch { continue; }
        const cu = BO[l].get(id);
        if (m?.id === id && (!cu || cu.tSua !== m.tSua || cu.b !== m.b) && (!cu || (m.tSua || 0) >= (cu.tSua || 0))) { BO[l].set(id, m); phat({ loai: 'ghi', [LOAI[l]]: [m], tu: '' }); }
      }
      for (const id of [...BO[l].keys()]) if (!co.has(id) && !fs.existsSync(tepMuc(l, id))) { BO[l].delete(id); phat({ loai: 'xoa', [LOAI[l]]: [id], tu: '' }); }
    }
  }
  setInterval(() => { quet().catch(() => {}); }, 60000).unref();

  // ---- giới hạn tốc độ ghi theo IP
  const dem = new Map();
  function choGhi(req) {
    // chỉ tin cf-connecting-ip khi yêu cầu đến từ cloudflared trên máy này (loopback); client nối thẳng thì dùng địa chỉ socket
    const sock = req.socket.remoteAddress || '';
    const ip = /^(127\.|::1$|::ffff:127\.)/.test(sock) && req.headers['cf-connecting-ip'] ? String(req.headers['cf-connecting-ip']).slice(0, 64) : sock;
    const now = Date.now(); const d = dem.get(ip) || { t: now, n: 0 };
    if (now - d.t > 60000) { d.t = now; d.n = 0; }
    d.n++; dem.set(ip, d);
    if (dem.size > 2000) for (const [k, v] of dem) if (now - v.t > 60000) dem.delete(k); // chỉ bỏ bộ đếm đã hết phút
    return d.n <= 900;
  }
  const phienCua = (req) => chu(String(req.headers['x-bs-phien'] || ''), 40) || '';
  const nguoiCua = (req) => { try { return decodeURIComponent(String(req.headers['x-bs-nguoi'] || '')).slice(0, 40); } catch { return ''; } };
  async function docDu(id) { // thông tin + HTML (+ bản sửa tay) của một khung — đọc bất đồng bộ, không chặn realtime
    const meta = BO.k.get(id); if (!meta) return null;
    let html = ''; try { html = await fs.promises.readFile(path.join(dir('k'), `${id}.html`), 'utf8'); } catch { /* khung chưa có HTML */ }
    let phu = {}; try { phu = JSON.parse(await fs.promises.readFile(tepPhu(id), 'utf8')) || {}; } catch { /* không có */ }
    return { ...meta, html, ...(phu.htmlSua ? { htmlSua: phu.htmlSua } : {}), ...(phu.htmlGocSua ? { htmlGocSua: phu.htmlGocSua } : {}) };
  }

  async function xuLy(req, res, p, url) {
    const { json } = C;
    if (req.method === 'GET') {
      if (p === '/api/bien-the') return json(res, 200, { khung: [...BO.k.values()], lan: [...BO.l.values()], gio: Date.now() });
      if (p === '/api/bien-the/rac') {
        let ten = []; try { ten = fs.readdirSync(dir('rac')).filter((t) => /^[kl]-[\w-]{1,120}\.json$/.test(t)); } catch { /* rỗng */ }
        return json(res, 200, { ds: ten.map((t) => ({ l: t.slice(0, 1), ...docJson(path.join(dir('rac'), t)) })).filter((x) => x.id).sort((a, b) => b.tXoa - a.tXoa) });
      }
      if (p === '/api/bien-the/goi') { // nhiều khung một lần (?ids=a,b,c — tối đa 40), dừng khi đã quá ~16 MB, phần còn lại trả trong «con»
        const ids = String(url?.searchParams.get('ids') || '').split(',').filter((x) => ID.test(x)).slice(0, 40);
        const ds = [], con = []; let co = 0;
        for (const id of ids) {
          if (co > 16e6) { con.push(id); continue; }
          const g = await docDu(id); if (!g) continue;
          co += (g.html?.length || 0) + (g.htmlSua?.length || 0) + (g.htmlGocSua?.length || 0); ds.push(g);
        }
        return json(res, 200, { ds, con });
      }
      const m = p.match(/^\/api\/bien-the\/k\/([\w-]{1,120})$/);
      if (m) { const g = await docDu(m[1]); return g ? json(res, 200, g) : json(res, 404, { loi: 'Không có biến thể này' }); }
      return json(res, 404, { loi: 'Không có' });
    }
    if (req.method !== 'POST') return json(res, 405, { loi: 'Không hỗ trợ' });
    if (!C.hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { loi: 'Nguồn không hợp lệ' });
    if (!choGhi(req)) return json(res, 429, { loi: 'Ghi quá nhanh — đợi chút' });
    let than; try { than = JSON.parse(await C.docThan(req, THAN_TOI_DA)); } catch (e) { return json(res, e.ma || 400, { loi: e.ma === 413 ? 'Gói ghi quá lớn' : 'Không đọc được yêu cầu' }); }
    const phien = phienCua(req), nguoi = nguoiCua(req);
    const ai = C.ai ? C.ai(req) : { ten: nguoi }; const evs = [];
    const dsK = Array.isArray(than?.khung) ? than.khung : [];
    const dsL = Array.isArray(than?.lan) ? than.lan : [];
    if (dsK.length + dsL.length > SO_MOI_LAN) return json(res, 413, { loi: `Mỗi lần ghi tối đa ${SO_MOI_LAN} mục` }); // không cắt lặng lẽ
    if (p === '/api/bien-the/ghi' || p === '/api/bien-the/di-tru') {
      const chiThem = p.endsWith('di-tru'); // di trú từ localStorage: chỉ thêm mục chưa có (kể cả đã nằm trong thùng rác thì bỏ qua)
      // trả: ra = mục đã ghi; tuChoi = id máy chủ không nhận (kèm loi); xungDot = bản máy chủ mới hơn bản client dựa vào
      const ra = { khung: [], lan: [] }, loi = [], tuChoi = { khung: [], lan: [] }, xungDot = { khung: [], lan: [] }, boQua = { khung: [], lan: [] };
      const loaiDt = chiThem ? 'di-tru' : '';
      for (const [l, ds, ghiMot] of [['l', dsL, (x) => ghiLan(x, ai, loaiDt && 'phuong-an.di-tru')], ['k', dsK, (x) => ghiKhung(x, nguoi, ai, loaiDt && 'bien-the.di-tru')]]) {
        const ten = LOAI[l];
        for (const x of ds) {
          if (chiThem && ID.test(x?.id || '') && (BO[l].has(x.id) || fs.existsSync(tepRac(l, x.id, 'json')))) { boQua[ten].push(x.id); continue; }
          const r = ghiMot(x);
          if (r.ev) evs.push(r.ev);
          if (r.m) ra[ten].push(r.m);
          else if (r.xungDot) xungDot[ten].push(r.xungDot);
          else { loi.push(r.loi); tuChoi[ten].push(String(x?.id || '')); }
        }
      }
      A.ghi(evs);
      if (ra.khung.length || ra.lan.length) phat({ loai: 'ghi', ...ra, tu: phien, ten: nguoi });
      return json(res, 200, { ...ra, loi, tuChoi, xungDot, boQua });
    }
    if (p === '/api/bien-the/xoa') {
      const ra = { khung: [], lan: [] };
      for (const id of dsL) { const k = ID.test(String(id)) && vaoRacLan(id, nguoi, ai, evs); if (k) { ra.lan.push(id); ra.khung.push(...k); } }
      for (const id of dsK) if (ID.test(String(id)) && vaoRac('k', id, nguoi, ai, evs)) ra.khung.push(id);
      A.ghi(evs);
      if (ra.khung.length || ra.lan.length) phat({ loai: 'xoa', ...ra, tu: phien, ten: nguoi });
      return json(res, 200, ra);
    }
    if (p === '/api/bien-the/khoi-phuc') {
      const ra = { khung: [], lan: [] };
      for (const id of dsL) { const m = ID.test(String(id)) && raRac('l', id, true, ai, evs); if (m) ra.lan.push(m); }
      for (const id of dsK) { const m = ID.test(String(id)) && raRac('k', id, true, ai, evs); if (m) ra.khung.push(m); }
      A.ghi(evs);
      if (ra.khung.length || ra.lan.length) phat({ loai: 'ghi', ...ra, tu: '', ten: nguoi });
      return json(res, 200, ra);
    }
    return json(res, 404, { loi: 'Không có' });
  }
  // «Khôi phục trạng thái này» từ Lịch sử thay đổi: ghi đè mục bằng trạng thái cũ (null = xoá vào thùng rác). Ghi một sự kiện MỚI.
  function datLai(l, id, trangThaiCu, ai, nguon) {
    if (!LOAI[l] || !ID.test(String(id))) return { loi: 'Mục không hợp lệ' };
    const evs = [];
    if (trangThaiCu == null) {
      const ok = l === 'l' ? vaoRacLan(id, ai?.ten, ai, evs) : vaoRac('k', id, ai?.ten, ai, evs);
      if (!ok) return { loi: 'Mục không còn trên bàn' };
      for (const e of evs) { e.ghiChu = `${e.ghiChu} · khôi phục trạng thái ${nguon}`; }
      A.ghi(evs); phat({ loai: 'xoa', ...(l === 'l' ? { lan: [id], khung: evs.filter((e) => e.dt.l === 'k').map((e) => e.dt.id) } : { khung: [id] }), tu: '', ten: ai?.ten || '' });
      return { m: null };
    }
    const x = { ...trangThaiCu, id }; for (const k of ['tSuaCu', 'trongThungRac', 'tXoa', 'nguoiXoa']) delete x[k];
    const r = l === 'k' ? ghiKhung(x, ai?.ten, ai, 'bien-the.khoi-phuc-lich-su') : ghiLan(x, ai, 'phuong-an.khoi-phuc-lich-su');
    if (r.ev) { r.ev.ghiChu = `khôi phục trạng thái ${nguon} · ${r.ev.ghiChu}`; A.ghi(r.ev); }
    if (r.m) phat({ loai: 'ghi', [LOAI[l]]: [r.m], tu: '', ten: ai?.ten || '' });
    return r;
  }
  return { xuLy, KHO, datLai };
}
