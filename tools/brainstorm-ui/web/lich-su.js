// «🕘 Lịch sử thay đổi» (chỉ chủ quản): đọc nhật ký audit của máy chủ — lọc theo người / loại / màn / hành trình / ngày,
// bấm một sự kiện xem trước ↔ sau cạnh nhau (HTML render + diff chữ), «Khôi phục trạng thái này» (tạo sự kiện MỚI, không viết lại lịch sử),
// xuất CSV/JSONL theo khoảng ngày. Mọi chữ lấy từ audit hiển thị bằng textContent; HTML chỉ vào iframe sandbox rỗng (không script).
import { dauChuQuan } from './gop-y.js';

const $ = (s) => document.querySelector(s);
const tao = (tag, lop, chu) => { const e = document.createElement(tag); if (lop) e.className = lop; if (chu != null) e.textContent = chu; return e; };
export const TEN_LOAI = {
  'bien-the.tao': 'Tạo biến thể', 'bien-the.sua': 'Sửa biến thể', 'bien-the.xoa': 'Xoá biến thể (vào thùng rác)', 'bien-the.khoi-phuc': 'Khôi phục biến thể từ thùng rác',
  'bien-the.xoa-vinh-vien': 'Xoá vĩnh viễn biến thể (dọn thùng rác)', 'bien-the.di-tru': 'Di trú biến thể từ trình duyệt', 'bien-the.khoi-phuc-lich-su': 'Khôi phục biến thể từ lịch sử',
  'phuong-an.tao': 'Tạo phương án', 'phuong-an.sua': 'Sửa phương án', 'phuong-an.xoa': 'Xoá phương án (vào thùng rác)', 'phuong-an.khoi-phuc': 'Khôi phục phương án từ thùng rác',
  'phuong-an.xoa-vinh-vien': 'Xoá vĩnh viễn phương án', 'phuong-an.di-tru': 'Di trú phương án từ trình duyệt', 'phuong-an.khoi-phuc-lich-su': 'Khôi phục phương án từ lịch sử',
  'man.thay': 'Thay màn', 'man.khoi-phuc': 'Khôi phục phiên bản màn', 'man.de-xuat': 'Thay màn bằng đề xuất', 'man.khoi-phuc-lich-su': 'Khôi phục màn từ lịch sử', 'man.xoa': 'Xoá màn khỏi hành trình', 'man.khoi-phuc-xoa': 'Khôi phục màn đã xoá', 'man.lien-ket': 'Sửa liên kết màn',
  'man.dung-chung': 'Cập nhật màn dùng chung', 'dung-chung.gop': 'Gộp màn dùng chung', 'dung-chung.tach': 'Tách màn khỏi nhóm dùng chung', 'dung-chung.lien-ket': 'Sửa liên kết riêng của màn dùng chung', 'dung-chung.lech': 'Màn dùng chung chưa lan được nội dung',
  'gop-y.tao': 'Góp ý mới', 'gop-y.tra-loi': 'Trả lời góp ý', 'gop-y.sua': 'Sửa góp ý', 'gop-y.xoa': 'Xoá góp ý', 'gop-y.trang-thai': 'Đổi trạng thái góp ý', 'gop-y.muc': 'Đổi mức góp ý',
  'gop-y.yc-bien-the': 'Yêu cầu biến thể', 'gop-y.khoi-phuc-lich-su': 'Khôi phục góp ý từ lịch sử',
  'de-xuat.tao': 'Đề xuất thay đổi mới', 'de-xuat.chap': 'Accept đề xuất', 'de-xuat.sua-tiep': 'Áp dụng đề xuất sau «Sửa tiếp»', 'de-xuat.tu-choi': 'Từ chối đề xuất',
  'link.tao': 'Tạo link góp ý /r/', 'link.thu-hoi': 'Thu hồi link /r/',
  'quyen.sai-ma': 'Thử mã chủ quản sai', 'quyen.sai-ma-mcp': 'Thử mật khẩu MCP sai', 'quyen.sai-mat-khau': 'Thử mật khẩu chung sai', 'quyen.doi-cau-hinh': 'Đổi quyền (chu-quan.json)',
};
const NHOM = [['', 'Mọi loại'], ['bien-the.', 'Biến thể'], ['phuong-an.', 'Phương án'], ['man.', 'Phiên bản màn'], ['dung-chung.', 'Màn dùng chung'], ['gop-y.', 'Góp ý'], ['de-xuat.', 'Đề xuất'], ['link.', 'Link /r/'], ['quyen.', 'Quyền chủ quản'],
  ['bien-the.xoa-vinh-vien', '— Xoá vĩnh viễn']];
const VAI = { 'chu-quan': 'chủ quản', 'cong-tac': 'cộng tác', reviewer: 'reviewer', 'he-thong': 'hệ thống', 'khong-ro': '?' };
const KHOI_PHUC_DUOC = /^(bien-the|phuong-an|man|gop-y)\./;
const gio = (t) => { try { return new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return t; } };

// HTML chính của một trạng thái (biến thể: bản sửa tay nếu có thì kèm theo dưới dạng chữ)
const htmlCua = (s) => (s && typeof s === 'object' ? (typeof s.html === 'string' && s.html ? s.html : typeof s.htmlApDung === 'string' ? s.htmlApDung : '') : '');
function chuCua(s) { // phần chữ để diff: thông tin (không kèm HTML) + HTML ngắt theo thẻ
  if (s == null) return [];
  if (typeof s !== 'object') return [String(s)];
  const { html, htmlSua, htmlGocSua, htmlApDung, ...con } = s; // eslint-disable-line no-unused-vars
  const dong = JSON.stringify(con, null, 1).split('\n');
  const h = htmlCua(s); if (h) dong.push('── HTML ──', ...h.replace(/>\s*</g, '>\n<').split('\n'));
  if (htmlSua) dong.push('── HTML sửa tay ──', ...htmlSua.replace(/>\s*</g, '>\n<').split('\n'));
  return dong;
}
// diff theo dòng: bỏ phần đầu/cuối trùng, LCS phần giữa (giới hạn cỡ — quá lớn thì coi cả phần giữa là bỏ/thêm)
export function diffDong(a, b) {
  let d = 0; while (d < a.length && d < b.length && a[d] === b[d]) d++;
  let c = 0; while (c < a.length - d && c < b.length - d && a[a.length - 1 - c] === b[b.length - 1 - c]) c++;
  const A = a.slice(d, a.length - c), B = b.slice(d, b.length - c);
  const ra = a.slice(0, d).map((x) => [' ', x]);
  if (A.length * B.length > 4e6) { ra.push(...A.map((x) => ['-', x]), ...B.map((x) => ['+', x])); }
  else {
    const n = A.length, m = B.length; const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { ra.push([' ', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) ra.push(['-', A[i++]]); else ra.push(['+', B[j++]]); }
    while (i < n) ra.push(['-', A[i++]]); while (j < m) ra.push(['+', B[j++]]);
  }
  ra.push(...a.slice(a.length - c).map((x) => [' ', x]));
  return ra;
}

// A: { MAN, LAN_GOC, toast, lamSach, chuQuan() → Promise<bool> }
export function ganLichSu(A) {
  const D = { loc: { nguoi: '', loai: '', key: '', ht: '', id: '', tu: '', den: '' }, ds: [], chon: null, conNua: false };
  const lop = $('#lop-au');
  async function goi(url, than) {
    const r = await fetch(url, than === undefined ? { headers: dauChuQuan() } : { method: 'POST', headers: { 'content-type': 'application/json', 'x-bs-nguoi': encodeURIComponent(A.tenNguoi?.() || ''), ...dauChuQuan() }, body: JSON.stringify(than) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
    return j;
  }
  const tenMan = (k) => (k && Object.hasOwn(A.MAN, k) ? A.MAN[k].ten : k || '');
  const tenHt = (h) => A.LAN_GOC.find((l) => l.id === h)?.ten || h || '';

  // ---- bộ lọc
  const fNguoi = $('#au-nguoi'), fLoai = $('#au-loai'), fMan = $('#au-man'), fHt = $('#au-ht'), fTu = $('#au-tu'), fDen = $('#au-den'), fId = $('#au-id');
  for (const [v, t] of NHOM) fLoai.append(new Option(t, v));
  fHt.append(new Option('Mọi hành trình', '')); for (const l of A.LAN_GOC) fHt.append(new Option(l.ten, l.id));
  fMan.append(new Option('Mọi màn', '')); for (const [k, m] of Object.entries(A.MAN)) fMan.append(new Option(`${m.ten} (${k})`, k));
  const docLoc = () => { D.loc = { nguoi: fNguoi.value.trim(), loai: fLoai.value, key: fMan.value, ht: fHt.value, id: fId.value.trim(), tu: fTu.value, den: fDen.value }; };
  const datLoc = () => { fNguoi.value = D.loc.nguoi; fLoai.value = D.loc.loai; fMan.value = D.loc.key; fHt.value = D.loc.ht; fId.value = D.loc.id; fTu.value = D.loc.tu; fDen.value = D.loc.den; };
  for (const f of [fLoai, fMan, fHt, fTu, fDen]) f.onchange = () => { docLoc(); tai(); };
  for (const f of [fNguoi, fId]) { f.onchange = () => { docLoc(); tai(); }; f.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); docLoc(); tai(); } }; }
  $('#au-bo-loc').onclick = () => { D.loc = { nguoi: '', loai: '', key: '', ht: '', id: '', tu: '', den: '' }; datLoc(); tai(); };
  $('#au-dong').onclick = () => { lop.hidden = true; $('#au-chi-tiet').innerHTML = ''; };
  for (const dang of ['csv', 'jsonl']) {
    $(`#au-xuat-${dang}`).onclick = async () => {
      docLoc();
      try {
        const r = await fetch(`/api/audit/xuat?dang=${dang}&tu=${encodeURIComponent(D.loc.tu)}&den=${encodeURIComponent(D.loc.den)}`, { headers: dauChuQuan() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob());
        a.download = `audit-${D.loc.tu || 'dau'}_${D.loc.den || 'nay'}.${dang}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } catch (e) { A.toast(`Không xuất được: ${e.message}`, true); }
    };
  }

  async function mo(loc = {}) {
    if (!(await A.chuQuan())) { A.toast('Lịch sử thay đổi chỉ dành cho chủ quản — mở «💬 Góp ý» để nhập mã chủ quản.', true); return; }
    D.loc = { nguoi: '', loai: '', key: '', ht: '', id: '', tu: '', den: '', ...loc }; datLoc();
    $('#au-tieu').textContent = loc.id ? `🕘 Lịch sử — ${loc.ten || loc.id}` : loc.key ? `🕘 Lịch sử — ${tenMan(loc.key)}` : '🕘 Lịch sử thay đổi';
    lop.hidden = false; $('#au-chi-tiet').innerHTML = ''; $('#au-chi-tiet').append(tao('p', 'phu', 'Bấm một sự kiện để xem trước ↔ sau.'));
    await tai();
  }
  async function tai() {
    const ds = $('#au-ds'); ds.textContent = 'Đang tải…';
    const q = new URLSearchParams(Object.entries(D.loc).filter(([, v]) => v)); q.set('gioi', '400');
    try { const j = await goi(`/api/audit?${q}`); D.ds = j.ds || []; D.conNua = !!j.conNua; } catch (e) { ds.textContent = `Không tải được: ${e.message}`; return; }
    // gợi ý tên người từ dữ liệu đã tải
    const dl = $('#au-nguoi-ds'); dl.innerHTML = ''; for (const t of [...new Set(D.ds.map((e) => e.ai?.ten).filter(Boolean))]) dl.append(new Option(t));
    veDs();
  }
  function moTa(e) {
    const dt = e.dt || {};
    if (dt.l === 'k') return `${tenMan(dt.key)} · biến thể ${dt.id}`;
    if (dt.l === 'l') return `phương án ${dt.id}${dt.key ? ` · từ ${tenMan(dt.key)}` : ''}`;
    if (/^man\./.test(e.loai)) return `${tenMan(dt.key)} → v${dt.v}${dt.tu ? ` · theo ${tenMan(dt.tu)}` : ''}${dt.dungChung?.length ? ` · cùng cập nhật ${dt.dungChung.map(tenMan).join(', ')}` : ''}`;
    if (e.loai === 'dung-chung.gop') return `${(dt.ds || []).map(tenMan).join(' + ')} · gốc ${tenMan(dt.nguon)}`;
    if (e.loai === 'dung-chung.tach') return `${(dt.roi || []).map(tenMan).join(', ')} rời nhóm${dt.con?.length ? ` · còn ${dt.con.map(tenMan).join(', ')}` : ' · nhóm giải tán'}`;
    if (e.loai === 'dung-chung.lien-ket') return `${tenMan(dt.key)} · liên kết riêng`;
    if (/^(gop-y|de-xuat)\./.test(e.loai)) return `${tenHt(dt.ht)}${dt.key ? ` · ${tenMan(dt.key)}` : ''} · ${dt.id}`;
    if (/^link\./.test(e.loai)) return `${tenHt(dt.ht)} · /r/${String(dt.ma || '').slice(0, 8)}…`;
    return dt.duong || dt.tep || '';
  }
  const aiChu = (ai = {}) => [ai.ten || '(không tên)', VAI[ai.vai] || ai.vai, ai.ma ? `/r/${ai.ma.slice(0, 8)}…` : '', ai.ip, ai.cong ? `cổng ${ai.cong}` : ''].filter(Boolean).join(' · ');
  function veDs() {
    const ds = $('#au-ds'); ds.innerHTML = '';
    if (!D.ds.length) { ds.append(tao('p', 'phu', 'Không có sự kiện khớp bộ lọc.')); return; }
    for (const e of D.ds) {
      const b = tao('button', 'au-muc'); b.type = 'button'; b.dataset.k = `${e.ngay}#${e.i}`;
      if (D.chon === b.dataset.k) b.classList.add('bat');
      if (/xoa-vinh-vien|sai-ma/.test(e.loai)) b.classList.add('nguy');
      b.append(tao('b', '', TEN_LOAI[e.loai] || e.loai), tao('span', 'au-dt', moTa(e)), tao('span', 'phu', `${gio(e.t)} · ${aiChu(e.ai)}`));
      b.onclick = () => xem(e);
      ds.append(b);
    }
    if (D.conNua) ds.append(tao('p', 'phu', 'Còn sự kiện cũ hơn — thu hẹp ngày hoặc bộ lọc.'));
  }

  async function xem(e) {
    D.chon = `${e.ngay}#${e.i}`; document.querySelectorAll('#au-ds .au-muc').forEach((x) => x.classList.toggle('bat', x.dataset.k === D.chon));
    const ct = $('#au-chi-tiet'); ct.innerHTML = ''; ct.append(tao('p', 'phu', 'Đang dựng lại trạng thái…'));
    let j; try { j = await goi(`/api/audit/mo?ngay=${e.ngay}&i=${e.i}`); } catch (er) { ct.textContent = `Không mở được: ${er.message}`; return; }
    ct.innerHTML = '';
    const dau = tao('div', 'au-dau');
    dau.append(tao('b', '', `${TEN_LOAI[e.loai] || e.loai} — ${moTa(e)}`),
      tao('span', 'phu', `#${e.i} · ${gio(e.t)} · ${aiChu(e.ai)}`), tao('span', 'phu au-ua', e.ai?.ua || ''));
    if (e.ghiChu) dau.append(tao('span', 'phu', e.ghiChu));
    if (j.loi) dau.append(tao('span', 'nguy', `Thiếu dữ liệu để dựng lại: ${j.loi}`));
    ct.append(dau);
    const hai = tao('div', 'au-hai');
    const o = (tieu, st, ben) => {
      const f = tao('figure', 'au-o'); const cap = tao('figcaption', '', tieu); f.append(cap);
      const h = htmlCua(st);
      if (st == null) f.append(tao('p', 'phu au-rong', ben === 'truoc' ? '(chưa có — mục được tạo ở sự kiện này)' : '(không còn — mục bị xoá ở sự kiện này)'));
      else if (h) {
        const w = Number(st.w) || A.MAN[e.dt?.key]?.w || 390, hh = Number(st.h) || A.MAN[e.dt?.key]?.h || 844;
        const rong = 300, z = rong / w; const vo = tao('div', 'au-vo'); vo.style.width = `${rong}px`; vo.style.height = `${Math.min(Math.round(hh * z), 700)}px`;
        const ifr = document.createElement('iframe'); ifr.setAttribute('sandbox', ''); ifr.setAttribute('referrerpolicy', 'no-referrer'); ifr.title = tieu;
        Object.assign(ifr.style, { width: `${w}px`, height: `${hh}px`, transform: `scale(${z})` }); ifr.srcdoc = A.lamSach(h); vo.append(ifr); f.append(vo);
      } else {
        const pre = tao('pre', 'au-json'); const { tl, ...con } = st; pre.textContent = JSON.stringify(con, null, 1); f.append(pre);
        if (Array.isArray(tl) && tl.length) { const t2 = tao('pre', 'au-json'); t2.textContent = tl.map((x) => `↳ ${x.ten}: ${x.noi}`).join('\n'); f.append(t2); }
      }
      if (KHOI_PHUC_DUOC.test(e.loai) && !(st == null && /^man\.|xoa-vinh-vien$/.test(e.loai))) {
        const b = tao('button', ben === 'sau' ? 'nut-chinh nho' : 'nut-nhe', st == null ? 'Khôi phục trạng thái này (xoá mục)' : 'Khôi phục trạng thái này'); b.type = 'button';
        b.onclick = () => khoiPhuc(e, ben, b);
        f.append(b);
      }
      return f;
    };
    hai.append(o('Trước', j.truoc, 'truoc'), o('Sau', j.sau, 'sau'));
    ct.append(hai);
    // diff chữ
    const dd = diffDong(chuCua(j.truoc), chuCua(j.sau));
    const doi = dd.filter(([k]) => k !== ' ').length;
    const det = tao('details', 'au-diff'); det.open = doi > 0 && doi < 400;
    det.append(tao('summary', 'phu', `Diff chữ: ${dd.filter(([k]) => k === '-').length} dòng bỏ, ${dd.filter(([k]) => k === '+').length} dòng thêm`));
    const pre = tao('pre', 'au-diff-than');
    // chỉ hiện dòng đổi + 2 dòng ngữ cảnh
    const giu = new Set(); dd.forEach(([k], i) => { if (k !== ' ') for (let t = i - 2; t <= i + 2; t++) giu.add(t); });
    let bo = false;
    dd.forEach(([k, x], i) => {
      if (!giu.has(i)) { if (!bo) { pre.append(tao('span', 'au-bo', '⋯\n')); bo = true; } return; }
      bo = false; pre.append(tao('span', k === '-' ? 'au-tru' : k === '+' ? 'au-cong' : '', `${k} ${x.length > 400 ? `${x.slice(0, 400)}…` : x}\n`));
    });
    det.append(pre); ct.append(det);
  }
  async function khoiPhuc(e, ben, b) {
    const ten = `${TEN_LOAI[e.loai] || e.loai} — ${moTa(e)}`;
    if (!confirm(`Khôi phục trạng thái ${ben === 'truoc' ? 'TRƯỚC' : 'SAU'} của «${ten}»?\nĐây là một thay đổi mới (được ghi vào lịch sử), lịch sử cũ giữ nguyên.`)) return;
    b.disabled = true;
    try {
      const j = await goi('/api/audit/khoi-phuc', { ngay: e.ngay, i: e.i, ben });
      A.toast('Đã khôi phục — ghi thành sự kiện mới trong lịch sử.');
      if (j.manifest && e.dt?.key) await A.apManifest?.(e.dt.key, j.manifest);
      if (/^gop-y\./.test(e.loai)) A.taiGopY?.();
      await tai();
    } catch (er) { A.toast(`Không khôi phục được: ${er.message}`, true); } finally { b.disabled = false; }
  }
  $('#nut-ls-thay-doi').onclick = () => mo();
  return { mo };
}
