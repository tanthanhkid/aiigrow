// Nhật ký audit APPEND-ONLY của bàn brainstorm: mọi thao tác ghi phía máy chủ (biến thể, phiên bản màn, góp ý, đề xuất, link /r/, quyền chủ quản, di trú).
// Lưu: <THIET_KE>/brainstorm-ui/audit/<YYYY-MM-DD>.jsonl — mỗi dòng một sự kiện, ghi nối + fsync, trường «p» = sha256 của dòng ngay trước
// (chuỗi băm chạy liền qua các ngày; dòng đầu tiên p = 64 số 0) ⇒ sửa/xoá lén một dòng là `node audit-kiem.mjs` báo đứt chuỗi.
// Chuỗi dài (HTML…) > 2 KB thay bằng {$blob: sha256, n} và lưu ở audit/blob/<sha256>.html.gz — mọi trạng thái cũ dựng lại được, kể cả
// biến thể đã xoá vĩnh viễn. KHÔNG có API sửa/xoá audit; không bao giờ ghi mã chủ quản / key Claude (máy chủ không nhận key; header mã bị bỏ).
// 5178 và 5181 ghi cùng thư mục: khoá liên tiến trình bằng mkdir, đọc đuôi tệp mới nhất dưới khoá để lấy băm + số thứ tự trước đó.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const BLOB_TU = 2048;            // chuỗi dài hơn ⇒ lưu blob
export const P0 = '0'.repeat(64);
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const TEN_NGAY = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;
const SHA = /^[a-f0-9]{64}$/;
const ngayCua = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cho = new Int32Array(new SharedArrayBuffer(4));
const nguDb = (ms) => Atomics.wait(cho, 0, 0, ms);

export function thuMucAudit(THIET_KE) { return process.env.BS_AUDIT || path.join(THIET_KE, 'brainstorm-ui/audit'); }
// các tệp ngày theo thứ tự thời gian
export function dsTep(DIR) { let t = []; try { t = fs.readdirSync(DIR); } catch { /* chưa có */ } return t.filter((x) => TEN_NGAY.test(x)).sort(); }
// dòng cuối (thô, không kèm \n) của một tệp — đọc lùi từ đuôi, không đọc cả tệp
function dongCuoi(tep) {
  const fd = fs.openSync(tep, 'r');
  try {
    const co = fs.fstatSync(fd).size; if (!co) return '';
    let n = Math.min(co, 64 * 1024);
    for (;;) {
      const buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, co - n);
      let s = buf.toString('utf8'); if (s.endsWith('\n')) s = s.slice(0, -1);
      const k = s.lastIndexOf('\n');
      if (k >= 0 || n === co) return k >= 0 ? s.slice(k + 1) : s;
      n = Math.min(co, n * 4);
    }
  } finally { fs.closeSync(fd); }
}

export function taoAudit({ THIET_KE }) {
  const DIR = thuMucAudit(THIET_KE);
  const BLOB = path.join(DIR, 'blob');
  fs.mkdirSync(BLOB, { recursive: true });
  const tepBlob = (h) => path.join(BLOB, `${h}.html.gz`);

  // ---- blob theo băm (không bao giờ xoá; trùng nội dung thì dùng lại)
  function luuBlob(s) {
    const h = sha(s); const t = tepBlob(h);
    if (!fs.existsSync(t)) {
      const tam = `${t}.${process.pid}.${Date.now()}.tam`;
      const fd = fs.openSync(tam, 'w'); try { fs.writeSync(fd, zlib.gzipSync(Buffer.from(s, 'utf8'))); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(tam, t);
    }
    return h;
  }
  function docBlob(h) {
    if (!SHA.test(String(h))) return null;
    try { const s = zlib.gunzipSync(fs.readFileSync(tepBlob(h))).toString('utf8'); return sha(s) === h ? s : null; } catch { return null; }
  }
  // giá trị → bản ghi được: chuỗi dài thành {$blob}; đi sâu tối đa 8 tầng.
  // Khoá do người dùng gửi mà bắt đầu bằng «$» được thêm một «$» (vd. «$blob» → «$$blob») để không giả được tham chiếu blob; mo() bỏ lại.
  function gom(v, sau = 0) {
    if (typeof v === 'string') return v.length > BLOB_TU ? { $blob: luuBlob(v), n: v.length } : v;
    if (!v || typeof v !== 'object' || sau > 8) return v;
    if (Array.isArray(v)) return v.map((x) => gom(x, sau + 1));
    const o = {}; for (const [k, x] of Object.entries(v)) if (x !== undefined) o[k.startsWith('$') ? `$${k}` : k] = gom(x, sau + 1);
    return o;
  }
  // ngược lại: {$blob} → chuỗi gốc (dựng lại trạng thái)
  function mo(v, sau = 0) {
    if (!v || typeof v !== 'object' || sau > 10) return v;
    if (typeof v.$blob === 'string' && Object.keys(v).every((k) => k === '$blob' || k === 'n')) { const s = docBlob(v.$blob); if (s == null) throw new Error(`thiếu blob ${v.$blob.slice(0, 12)}`); return s; }
    if (Array.isArray(v)) return v.map((x) => mo(x, sau + 1));
    const o = {}; for (const [k, x] of Object.entries(v)) o[k.startsWith('$$') ? k.slice(1) : k] = mo(x, sau + 1);
    return o;
  }

  // ---- khoá liên tiến trình (đồng bộ: một lần ghi chỉ vài ms)
  function khoa() {
    const k = path.join(DIR, '.khoa');
    // mỗi lần ghi chỉ vài ms ⇒ khoá cũ hơn 1,5 s là của tiến trình đã chết giữa chừng: gỡ. Chờ tối đa ~2 s (không treo máy chủ lâu).
    for (let i = 0; i < 1000; i++) {
      try { fs.mkdirSync(k); return () => { try { fs.rmdirSync(k); } catch { /* đã gỡ */ } }; } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try { if (Date.now() - fs.statSync(k).mtimeMs > 1500) fs.rmdirSync(k); } catch { /* tiến trình khác vừa gỡ */ }
        nguDb(2);
      }
    }
    throw new Error('audit bận');
  }
  let nho = { tep: '', co: -1, i: 0, h: P0 }; // đuôi chuỗi lần ghi trước của tiến trình này
  function duoi() {
    const ds = dsTep(DIR);
    const cuoi = ds.at(-1); if (!cuoi) return { tep: '', co: 0, i: 0, h: P0 };
    const t = path.join(DIR, cuoi); const co = fs.statSync(t).size;
    if (nho.tep === cuoi && nho.co === co) return nho;
    // tiến trình khác vừa ghi (hoặc mới chạy): đọc dòng cuối; tệp ngày mới mà rỗng thì lùi về tệp trước
    for (let j = ds.length - 1; j >= 0; j--) {
      const d = dongCuoi(path.join(DIR, ds[j])); if (!d) continue;
      let i = 0;
      try { i = Number(JSON.parse(d).i) || 0; } catch { // dòng cuối hỏng (ghi dở): đếm như audit-kiem — dòng hỏng chiếm một số thứ tự; vẫn nối chuỗi theo băm của nó
        for (const x of fs.readFileSync(path.join(DIR, ds[j]), 'utf8').split('\n').filter(Boolean)) { try { i = Number(JSON.parse(x).i) || i + 1; } catch { i += 1; } }
      }
      return { tep: cuoi, co, i, h: sha(d) };
    }
    return { tep: cuoi, co, i: 0, h: P0 };
  }

  // ghi nhiều sự kiện một lần (một khoá, một fsync). ev: { loai, dt, ai, truoc, sau, ghiChu }. Lỗi audit KHÔNG làm hỏng thao tác chính — chỉ báo log.
  function ghi(evs, { motLan } = {}) {
    const ds = (Array.isArray(evs) ? evs : [evs]).filter(Boolean);
    if (!ds.length) return [];
    let mo2;
    try {
      const dong = ds.map((e) => ({ loai: e.loai, dt: e.dt || {}, ai: e.ai || {}, truoc: gom(e.truoc ?? null), sau: gom(e.sau ?? null), ...(e.ghiChu ? { ghiChu: String(e.ghiChu).slice(0, 300) } : {}) }));
      mo2 = khoa();
      if (motLan) { // sự kiện nhiều tiến trình cùng thấy (vd. đổi chu-quan.json): chỉ ghi một lần
        const tm = path.join(DIR, '.mot-lan'); let cu = ''; try { cu = fs.readFileSync(tm, 'utf8'); } catch { /* chưa có */ }
        if (cu === motLan) return [];
        fs.writeFileSync(tm, motLan);
      }
      const d = duoi(); const ngay = ngayCua(); const tep = `${ngay}.jsonl`;
      let { i, h } = d; const ra = []; let nd = '';
      for (const o of dong) {
        const dongTho = JSON.stringify({ i: i + 1, t: new Date().toISOString(), ...o, p: h });
        i += 1; h = sha(dongTho); nd += dongTho + '\n'; ra.push({ ngay, i });
      }
      const duong = path.join(DIR, tep);
      // lần ghi trước bị cắt giữa chừng (tệp không kết thúc bằng \n): xuống dòng trước — dòng dở thành một dòng hỏng riêng (audit-kiem báo), sự kiện mới không bị dính vào
      const fd = fs.openSync(duong, 'a+');
      try {
        const co = fs.fstatSync(fd).size;
        if (co) { const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, co - 1); if (b[0] !== 10) nd = `\n${nd}`; }
        fs.writeSync(fd, nd); fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      nho = { tep, co: fs.statSync(duong).size, i, h };
      return ra;
    } catch (e) {
      console.error('! audit không ghi được:', e.message);
      return [];
    } finally { mo2?.(); }
  }

  // ---- đọc (chỉ chủ quản — server kiểm quyền trước khi gọi)
  // loc: { tu, den: 'YYYY-MM-DD', loai (tiền tố), nguoi (chuỗi con của tên), key, ht (+ keysHt), id, gioi, sauI }
  const docTep = async (t) => { try { return await fs.promises.readFile(path.join(DIR, t), 'utf8'); } catch { return null; } };
  async function doc(loc = {}) {
    const ngay = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : '');
    const tu = ngay(loc.tu), den = ngay(loc.den);
    const gioi = Math.min(Math.max(Number(loc.gioi) || 300, 1), 5000);
    const ra = []; let conNua = false;
    const khop = (e) => (!loc.loai || String(e.loai || '').startsWith(loc.loai))
      && (!loc.nguoi || String(e.ai?.ten || '').toLowerCase().includes(String(loc.nguoi).toLowerCase()) || e.ai?.ma === loc.nguoi)
      && (!loc.key || e.dt?.key === loc.key)
      && (!loc.id || e.dt?.id === loc.id)
      && (!loc.ht || e.dt?.ht === loc.ht || (loc.keysHt && loc.keysHt.has(e.dt?.key)));
    const tep = dsTep(DIR).filter((t) => { const d = t.slice(0, 10); return (!tu || d >= tu) && (!den || d <= den); }).reverse();
    for (const t of tep) {
      const noi = await docTep(t); if (noi == null) continue; const dong = noi.split('\n');
      for (let j = dong.length - 1; j >= 0; j--) {
        if (!dong[j]) continue;
        let e; try { e = JSON.parse(dong[j]); } catch { continue; }
        if (!khop(e)) continue;
        if (ra.length >= gioi) { conNua = true; break; }
        ra.push({ ngay: t.slice(0, 10), ...e });
      }
      if (conNua) break;
    }
    return { ds: ra, conNua };
  }
  // tìm một sự kiện theo (ngày, i)
  async function tim(ngay, i) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ngay)) || !Number.isInteger(i)) return null;
    const s = await docTep(`${ngay}.jsonl`); if (s == null) return null;
    for (const d of s.split('\n')) { if (!d) continue; try { const e = JSON.parse(d); if (e.i === i) return { ngay, ...e }; } catch { /* bỏ dòng hỏng */ } }
    return null;
  }
  // tệp xuất theo khoảng ngày: jsonl nguyên văn (giữ chuỗi băm), csv thì một cột cho mỗi trường chính
  async function xuat(tu, den, dang) {
    const tep = dsTep(DIR).filter((t) => { const d = t.slice(0, 10); return (!tu || d >= tu) && (!den || d <= den); });
    if (dang === 'jsonl') { let ra = ''; for (const t of tep) ra += (await docTep(t)) || ''; return ra; }
    const o = (v) => { const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v); return /[",\n\r]/.test(s) || /^[=+\-@\t]/.test(s) ? `"${(/^[=+\-@\t]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
    const hang = [['ngay', 'i', 't', 'loai', 'doi_tuong', 'ten', 'vai', 'ma_r', 'ip', 'ua', 'truoc', 'sau', 'ghi_chu', 'p'].join(',')];
    for (const t of tep) {
      const s = await docTep(t); if (s == null) continue;
      for (const d of s.split('\n')) {
        if (!d) continue; let e; try { e = JSON.parse(d); } catch { continue; }
        hang.push([t.slice(0, 10), e.i, e.t, e.loai, e.dt, e.ai?.ten, e.ai?.vai, e.ai?.ma, e.ai?.ip, e.ai?.ua, e.truoc, e.sau, e.ghiChu, e.p].map(o).join(','));
      }
    }
    return hang.join('\r\n') + '\r\n';
  }

  return { DIR, ghi, gom, mo, docBlob, luuBlob, doc, tim, xuat };
}
