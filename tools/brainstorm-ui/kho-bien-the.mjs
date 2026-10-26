// Kho biến thể dùng chung (ngoài git): mọi khung biến thể + phương án hành trình của bàn, ai mở bàn cũng thấy cùng một bộ.
// Mỗi mục một tệp: k/<id>.json (thông tin khung) + k/<id>.html (HTML), l/<id>.json (phương án hành trình).
// Xoá = xoá mềm: chuyển vào rac/ (giữ 7 ngày, khôi phục được). Ghi atomic, giới hạn cỡ + tốc độ, kiểm Origin như kho phiên bản.
// Thay đổi được phát cho phòng realtime «bang» ({t:'kho'}); thay đổi do TIẾN TRÌNH KHÁC ghi cùng kho (vd. 5178 và 5181) bắt bằng fs.watch.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ID = /^[\w-]{1,120}$/;
const HTML_TOI_DA = 3 * 1024 * 1024;     // một khung
const META_TOI_DA = 64 * 1024;           // thông tin khung / phương án (không kể HTML)
const THAN_TOI_DA = 24 * 1024 * 1024;    // một lần ghi (nhiều mục)
const SO_TOI_DA = 4000;                  // số mục tối đa mỗi loại
const RAC_GIU = 7 * 24 * 3600 * 1000;    // thùng rác 7 ngày
const LOAI = { k: 'khung', l: 'lan' };

export function taoKhoBienThe(C) {
  const KHO = process.env.BS_BIEN_THE || path.join(C.THIET_KE, 'brainstorm-ui/bien-the');
  const dir = (l) => path.join(KHO, l);
  for (const l of ['k', 'l', 'rac']) fs.mkdirSync(dir(l), { recursive: true });
  const bamHtml = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
  const docJson = (t) => { try { return JSON.parse(fs.readFileSync(t, 'utf8')); } catch { return null; } };

  // ---- tự ghi gần đây (để fs.watch bỏ qua thay đổi của chính tiến trình này)
  const tuGhi = new Map();
  const danhDau = (tep) => { tuGhi.set(tep, Date.now()); if (tuGhi.size > 5000) for (const [k, t] of tuGhi) if (Date.now() - t > 5000) tuGhi.delete(k); };
  const ghi = (tep, nd) => { danhDau(tep); C.ghiAtomic(tep, nd); };
  const xoaTep = (tep) => { danhDau(tep); try { fs.unlinkSync(tep); } catch { /* không có */ } };
  const doiTen = (a, b) => { danhDau(a); danhDau(b); try { fs.renameSync(a, b); return true; } catch { return false; } };

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
    };
    if (!(m.w > 0 && m.w < 5000 && m.h > 0 && m.h < 20000)) return null;
    return JSON.parse(JSON.stringify(m)); // bỏ undefined
  }
  function sachLan(l) {
    if (!l || typeof l !== 'object' || !ID.test(l.id || '') || typeof l.tu !== 'string' || !ID.test(l.tu)) return null;
    const s = JSON.stringify(l); if (s.length > META_TOI_DA) return null;
    const { tienDo, dangChay, ...r } = JSON.parse(s); // eslint-disable-line no-unused-vars
    return r;
  }

  // ---- đọc
  function docMuc(l, id) {
    const m = docJson(path.join(dir(l), `${id}.json`)); if (!m) return null;
    return m;
  }
  function dsMuc(l) {
    let ten; try { ten = fs.readdirSync(dir(l)); } catch { return []; }
    return ten.filter((t) => t.endsWith('.json')).map((t) => docJson(path.join(dir(l), t))).filter(Boolean);
  }
  function demMuc(l) { try { return fs.readdirSync(dir(l)).filter((t) => t.endsWith('.json')).length; } catch { return 0; } }

  // ---- ghi một khung / phương án (giữ tSua tăng dần)
  function ghiKhung(f, nguoi) {
    const m = sachKhung(f); if (!m) return { loi: 'Khung không hợp lệ' };
    const html = typeof f.html === 'string' ? f.html : '';
    if (html.length > HTML_TOI_DA) return { loi: `HTML của ${m.id} quá lớn` };
    if (JSON.stringify(m).length > META_TOI_DA) return { loi: `Thông tin ${m.id} quá lớn` };
    const cu = docMuc('k', m.id);
    if (!cu && demMuc('k') >= SO_TOI_DA) return { loi: `Kho đã đủ ${SO_TOI_DA} biến thể — dọn bớt` };
    m.b = html ? bamHtml(html) : ''; m.tSua = Math.max(Date.now(), (cu?.tSua || 0) + 1); m.nguoi = chu(nguoi, 40) || m.nguoi;
    if (html && cu?.b !== m.b) ghi(path.join(dir('k'), `${m.id}.html`), html);
    if (!html) xoaTep(path.join(dir('k'), `${m.id}.html`));
    ghi(path.join(dir('k'), `${m.id}.json`), JSON.stringify(m));
    raRac('k', m.id, false); // ghi lại một mục đang trong thùng rác (vd. hoàn tác) ⇒ mục sống lại
    return { m };
  }
  function ghiLan(l0) {
    const l = sachLan(l0); if (!l) return { loi: 'Phương án không hợp lệ' };
    const cu = docMuc('l', l.id);
    if (!cu && demMuc('l') >= SO_TOI_DA) return { loi: 'Kho phương án đã đầy' };
    l.tSua = Math.max(Date.now(), (cu?.tSua || 0) + 1);
    ghi(path.join(dir('l'), `${l.id}.json`), JSON.stringify(l));
    raRac('l', l.id, false);
    return { m: l };
  }
  // ---- thùng rác
  const tepRac = (l, id, duoi) => path.join(dir('rac'), `${l}-${id}.${duoi}`);
  function vaoRac(l, id, nguoi) {
    const m = docMuc(l, id); if (!m) return false;
    ghi(tepRac(l, id, 'json'), JSON.stringify({ ...m, tXoa: Date.now(), nguoiXoa: chu(nguoi, 40) }));
    if (l === 'k') doiTen(path.join(dir('k'), `${id}.html`), tepRac(l, id, 'html'));
    xoaTep(path.join(dir(l), `${id}.json`));
    return true;
  }
  // khôi phục (ghiLai=true) hoặc chỉ bỏ khỏi thùng rác (khi mục vừa được ghi mới)
  function raRac(l, id, ghiLai) {
    const t = tepRac(l, id, 'json'); if (!fs.existsSync(t)) return null;
    const m = docJson(t);
    if (ghiLai && m) {
      const { tXoa, nguoiXoa, ...goc } = m; // eslint-disable-line no-unused-vars
      goc.tSua = Math.max(Date.now(), (goc.tSua || 0) + 1);
      if (l === 'k') doiTen(tepRac(l, id, 'html'), path.join(dir('k'), `${id}.html`));
      ghi(path.join(dir(l), `${id}.json`), JSON.stringify(goc));
      xoaTep(t);
      return goc;
    }
    xoaTep(t); xoaTep(tepRac(l, id, 'html'));
    return null;
  }
  function donRac() {
    let ten; try { ten = fs.readdirSync(dir('rac')); } catch { return; }
    for (const t of ten) {
      if (!t.endsWith('.json')) continue;
      const m = docJson(path.join(dir('rac'), t));
      if (m && Date.now() - (m.tXoa || 0) <= RAC_GIU) continue;
      xoaTep(path.join(dir('rac'), t)); xoaTep(path.join(dir('rac'), t.replace(/\.json$/, '.html')));
    }
  }
  donRac(); setInterval(donRac, 3600 * 1000).unref();

  // ---- phát thay đổi
  const phat = (obj) => C.phat('bang', { t: 'kho', ...obj });
  // tiến trình khác ghi cùng kho (5178 ↔ 5181): đọc lại tệp rồi phát cho phòng của tiến trình này
  const henWatch = new Map();
  for (const l of ['k', 'l']) {
    try {
      fs.watch(dir(l), (ev, ten) => {
        if (!ten || !ten.endsWith('.json')) return;
        const tep = path.join(dir(l), ten);
        if (Date.now() - (tuGhi.get(tep) || 0) < 3000) return;
        clearTimeout(henWatch.get(tep));
        henWatch.set(tep, setTimeout(() => {
          henWatch.delete(tep);
          const id = ten.slice(0, -5); const m = docMuc(l, id);
          if (m) phat({ loai: 'ghi', [LOAI[l]]: [m], tu: '' });
          else phat({ loai: 'xoa', [LOAI[l]]: [id], tu: '' });
        }, 150));
      }).on('error', () => {});
    } catch { /* hệ thống không hỗ trợ: chỉ thiếu đồng bộ giữa hai tiến trình */ }
  }

  // ---- giới hạn tốc độ ghi theo IP
  const dem = new Map();
  function choGhi(req) {
    const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '';
    const now = Date.now(); const d = dem.get(ip) || { t: now, n: 0 };
    if (now - d.t > 60000) { d.t = now; d.n = 0; }
    d.n++; dem.set(ip, d); if (dem.size > 2000) dem.clear();
    return d.n <= 900;
  }
  const phienCua = (req) => chu(String(req.headers['x-bs-phien'] || ''), 40) || '';
  const nguoiCua = (req) => { try { return decodeURIComponent(String(req.headers['x-bs-nguoi'] || '')).slice(0, 40); } catch { return ''; } };

  async function xuLy(req, res, p) {
    const { json } = C;
    if (req.method === 'GET') {
      if (p === '/api/bien-the') return json(res, 200, { khung: dsMuc('k'), lan: dsMuc('l') });
      if (p === '/api/bien-the/rac') {
        let ten = []; try { ten = fs.readdirSync(dir('rac')).filter((t) => t.endsWith('.json')); } catch { /* rỗng */ }
        return json(res, 200, { ds: ten.map((t) => ({ l: t.slice(0, 1), ...docJson(path.join(dir('rac'), t)) })).filter((x) => x.id).sort((a, b) => b.tXoa - a.tXoa) });
      }
      const m = p.match(/^\/api\/bien-the\/k\/([\w-]{1,120})$/);
      if (m) {
        const meta = docMuc('k', m[1]); if (!meta) return json(res, 404, { loi: 'Không có biến thể này' });
        let html = ''; try { html = fs.readFileSync(path.join(dir('k'), `${m[1]}.html`), 'utf8'); } catch { /* khung chưa có HTML */ }
        return json(res, 200, { ...meta, html });
      }
      return json(res, 404, { loi: 'Không có' });
    }
    if (req.method !== 'POST') return json(res, 405, { loi: 'Không hỗ trợ' });
    if (!C.hopLeNguon(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { loi: 'Nguồn không hợp lệ' });
    if (!choGhi(req)) return json(res, 429, { loi: 'Ghi quá nhanh — đợi chút' });
    let than; try { than = JSON.parse(await C.docThan(req, THAN_TOI_DA)); } catch (e) { return json(res, e.ma || 400, { loi: e.ma === 413 ? 'Gói ghi quá lớn' : 'Không đọc được yêu cầu' }); }
    const phien = phienCua(req), nguoi = nguoiCua(req);
    const dsK = Array.isArray(than?.khung) ? than.khung.slice(0, 200) : [];
    const dsL = Array.isArray(than?.lan) ? than.lan.slice(0, 200) : [];
    if (p === '/api/bien-the/ghi' || p === '/api/bien-the/di-tru') {
      const chiThem = p.endsWith('di-tru'); // di trú từ localStorage: chỉ thêm mục chưa có (kể cả đã nằm trong thùng rác thì bỏ qua)
      const ra = { khung: [], lan: [] }, loi = [];
      for (const l of dsL) {
        if (chiThem && (!ID.test(l?.id || '') || docMuc('l', l.id) || fs.existsSync(tepRac('l', l.id, 'json')))) continue;
        const r = ghiLan(l); if (r.m) ra.lan.push(r.m); else loi.push(r.loi);
      }
      for (const f of dsK) {
        if (chiThem && (!ID.test(f?.id || '') || docMuc('k', f.id) || fs.existsSync(tepRac('k', f.id, 'json')))) continue;
        const r = ghiKhung(f, nguoi); if (r.m) ra.khung.push(r.m); else loi.push(r.loi);
      }
      if (ra.khung.length || ra.lan.length) phat({ loai: 'ghi', ...ra, tu: phien, ten: nguoi });
      return json(res, loi.length && !ra.khung.length && !ra.lan.length ? 400 : 200, { ...ra, loi });
    }
    if (p === '/api/bien-the/xoa') {
      const ra = { khung: [], lan: [] };
      for (const id of dsL) if (ID.test(String(id)) && vaoRac('l', id, nguoi)) ra.lan.push(id);
      for (const id of dsK) if (ID.test(String(id)) && vaoRac('k', id, nguoi)) ra.khung.push(id);
      if (ra.khung.length || ra.lan.length) phat({ loai: 'xoa', ...ra, tu: phien, ten: nguoi });
      return json(res, 200, ra);
    }
    if (p === '/api/bien-the/khoi-phuc') {
      const ra = { khung: [], lan: [] };
      for (const id of dsL) { const m = ID.test(String(id)) && raRac('l', id, true); if (m) ra.lan.push(m); }
      for (const id of dsK) { const m = ID.test(String(id)) && raRac('k', id, true); if (m) ra.khung.push(m); }
      if (ra.khung.length || ra.lan.length) phat({ loai: 'ghi', ...ra, tu: '', ten: nguoi });
      return json(res, 200, ra);
    }
    return json(res, 404, { loi: 'Không có' });
  }
  return { xuLy, KHO };
}
