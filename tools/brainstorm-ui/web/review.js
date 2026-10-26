// Trang góp ý /r/<mã>: chỉ xem ảnh chụp đóng băng của một hành trình (không Sửa, không biến thể trên bàn, không key máy chủ).
// Góp ý ghim vào màn (toạ độ % + selector) hoặc chung; trả lời theo luồng; biến thể theo góp ý sinh bằng key của CHÍNH người review
// rồi gửi thành «Đề xuất thay đổi» chờ chủ quản duyệt — thiết kế gốc không đổi. Mọi chữ người dùng gõ hiển thị bằng textContent.
import { taoRealtime, mauTen } from './realtime.js';
import { heThong, loiNguoiDung, tachKetQua, HUONG } from './prompt.js';
import { goiClaude, goiMock, mockSua, chayLoat, lamSach, taiAssets } from './claude.js';

const $ = (s) => document.querySelector(s);
const MA = (location.pathname.match(/^\/r\/([a-f0-9]{32})\/?$/) || [])[1] || '';
const MOCK_URL = new URLSearchParams(location.search).has('mock');
const KHOA_KEY = 'bs.r-key';
const MODEL = 'claude-opus-5-5';
const MUC_TEN = { loi: 'Lỗi', 'de-xuat': 'Đề xuất', 'cau-hoi': 'Câu hỏi' };
const TT_DX = { cho: 'Chờ duyệt', chap: 'Đã áp dụng', tu: 'Từ chối' };
const docKey = () => { try { return localStorage.getItem(KHOA_KEY) || ''; } catch { return ''; } };
const ghiKey = (v) => { try { v ? localStorage.setItem(KHOA_KEY, v) : localStorage.removeItem(KHOA_KEY); } catch { /* bỏ qua */ } };
const laMock = () => MOCK_URL || docKey().toLowerCase().startsWith('mock');
const gioVN = (t) => { try { return new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); } catch { return ''; } };
const tao = (tag, lop, chu) => { const e = document.createElement(tag); if (lop) e.className = lop; if (chu != null) e.textContent = chu; return e; };

const R = { goi: null, mo: '', i: -1, chuaXem: false, play: false, ghim: false, ghimCho: null, ganDay: null, bt: [], dangSinh: false };
let rt = null;
const st = { view: { x: 0, y: 0, z: 1 }, chon: new Set() };

// ---------- tải ----------
async function tai() {
  if (!MA) return het('Địa chỉ không đúng dạng /r/<mã>.');
  if (R.goi) { // đã có snapshot màn: chỉ tải lại góp ý + đề xuất (nhẹ)
    try {
      const r = await fetch(`/api/review/r/${MA}/moi`); const j = await r.json().catch(() => ({}));
      if (r.status === 404 || r.status === 410) return het(j.loi || 'Link góp ý không còn.');
      if (r.ok) { R.goi.gopY = j.gopY; R.goi.deXuat = j.deXuat; veDsMan(); veGopY(); veGhim(); }
    } catch { /* lần sau */ }
    return;
  }
  let r; try { r = await fetch(`/api/review/r/${MA}`); } catch { toast('Không tải được — kiểm mạng rồi tải lại trang.', true); return; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return het(j.loi || `Lỗi ${r.status}`);
  const dau = !R.goi; R.goi = j;
  document.title = `Góp ý · ${j.htTen}`;
  $('#ht-ten').textContent = j.htTen; $('#ht-v').textContent = `v${j.v}`; $('#ht-ghi').textContent = j.ghiChu || '';
  if (dau) {
    veDsMan();
    const h = decodeURIComponent(location.hash.slice(1));
    mo(j.man.some((m) => m.key === h) || h === 'qt' || h === 'chung' ? h : j.man[0]?.key || 'chung');
  } else { veDsMan(); veGopY(); veGhim(); }
}
function het(ly) { $('#het').hidden = false; $('#het-ly').textContent = ly; document.body.classList.add('da-het'); }
const manCua = (key) => R.goi?.man.find((m) => m.key === key);

// ---------- danh sách màn + mở màn ----------
function veDsMan() {
  const ol = $('#ds-man'); ol.innerHTML = '';
  const dem = new Map(); for (const g of R.goi.gopY) if (g.tt === 'mo' && g.key) dem.set(g.key, (dem.get(g.key) || 0) + 1);
  R.goi.man.forEach((m, i) => {
    const li = tao('li'); const b = tao('button', 'muc-man' + (R.i === i ? ' bat' : ''));
    b.type = 'button'; b.dataset.key = m.key;
    b.append(tao('span', 'so-tt', String(i + 1)), tao('span', 't', m.ten));
    if (dem.get(m.key)) b.append(tao('span', 'dem', String(dem.get(m.key))));
    b.onclick = () => mo(m.key, i); li.append(b); ol.append(li);
  });
  for (const b of document.querySelectorAll('.muc-dac')) b.classList.toggle('bat', b.dataset.mo === R.mo);
}
document.querySelectorAll('.muc-dac').forEach((b) => { b.onclick = () => mo(b.dataset.mo); });
// i: vị trí trong hành trình (một màn có thể được ghé nhiều lần, vd. A→B→A→C)
function mo(key, i = R.goi.man.findIndex((x) => x.key === key)) {
  R.mo = key; R.i = R.goi.man[i]?.key === key ? i : -1; R.ghimCho = null; capNhatGhimCho();
  try { history.replaceState(null, '', `#${encodeURIComponent(key)}`); } catch { /* bỏ qua */ }
  const m = manCua(key);
  $('#san').hidden = !m; $('#qt-anh').hidden = true; $('#qt-trong').hidden = true; $('#chung-trong').hidden = key !== 'chung';
  if (key === 'qt') {
    if (R.goi.qt) { const u = URL.createObjectURL(new Blob([R.goi.qt], { type: 'image/svg+xml' })); const img = $('#qt-anh'); img.onload = () => URL.revokeObjectURL(u); img.src = u; img.hidden = false; } else $('#qt-trong').hidden = false;
  }
  if (m) {
    const ifr = $('#khung'); ifr.style.width = `${m.w}px`; ifr.style.height = `${m.h}px`;
    ifr.onload = () => ganTrongKhung(ifr);
    ifr.srcdoc = lamSach(m.html);
    vuaKhung();
  }
  $('#vi-tri').textContent = m ? `Màn ${i + 1}/${R.goi.man.length} · ${m.ten}` : key === 'qt' ? 'Quy trình' : 'Góp ý chung';
  $('#nut-truoc').disabled = i <= 0; $('#nut-sau').disabled = i < 0 || i >= R.goi.man.length - 1;
  $('#gy-noi').placeholder = m ? `Góp ý cho màn «${m.ten}»…` : 'Góp ý cho cả hành trình…';
  $('#hop-gy').hidden = key === 'qt';
  veDsMan(); veGopY(); veGhim();
  rt?.khiDoiView();
}
const buoc = (d) => { const i = R.i + d; const m = R.goi.man[i]; if (R.i >= 0 && m) mo(m.key, i); };
$('#nut-truoc').onclick = () => buoc(-1); $('#nut-sau').onclick = () => buoc(1);
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,select') || !$('#lop-hoi').hidden || !$('#lop-bt').hidden) return;
  if (e.key === 'ArrowLeft') buoc(-1); else if (e.key === 'ArrowRight') buoc(1);
});

// khung vừa vùng giữa; st.view = vị trí + tỉ lệ của màn trong #vung (toạ độ «canvas» của con trỏ = px của màn)
function vuaKhung() {
  const m = manCua(R.mo); if (!m) return;
  const v = $('#vung').getBoundingClientRect();
  const z = Math.min(1.25, (v.width - 48) / m.w, (v.height - 48) / m.h);
  const x = Math.round((v.width - m.w * z) / 2), y = Math.round(Math.max(24, (v.height - m.h * z) / 2));
  const s = $('#san'); s.style.width = `${m.w}px`; s.style.height = `${m.h}px`; s.style.transform = `translate(${x}px,${y}px) scale(${z})`;
  st.view = { x, y, z };
  rt?.khiDoiView();
}
addEventListener('resize', vuaKhung);

// trong màn (cùng origin, không script): Play theo data-toi; chuột trong màn chuyển ra trang để con trỏ realtime vẫn chạy
function ganTrongKhung(ifr) {
  const d = ifr.contentDocument; if (!d) return;
  d.addEventListener('click', (e) => {
    const a = e.target.closest?.('[data-toi]');
    if (a || e.target.closest?.('a,button')) e.preventDefault();
    if (R.play && a && manCua(a.dataset.toi)) mo(a.dataset.toi);
  }, true);
  d.addEventListener('pointermove', (e) => {
    const r = ifr.getBoundingClientRect(); const z = st.view.z;
    dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + e.clientX * z, clientY: r.top + e.clientY * z }));
  }, { passive: true });
  d.documentElement.classList.toggle('play', R.play);
}
$('#nut-play').onclick = () => {
  R.play = !R.play; if (R.play) datGhim(false);
  $('#nut-play').setAttribute('aria-pressed', R.play); $('#nut-play').classList.toggle('bat', R.play);
  toast(R.play ? 'Play: bấm nút trong màn để đi tiếp như app thật (← → để chuyển màn).' : 'Đã tắt Play.');
};

// ---------- ghim ----------
function datGhim(b) {
  R.ghim = b; $('#nut-ghim').setAttribute('aria-pressed', b); $('#nut-ghim').classList.toggle('bat', b); $('#lop-ghim').classList.toggle('dang-ghim', b);
  if (b && R.play) { R.play = false; $('#nut-play').setAttribute('aria-pressed', false); $('#nut-play').classList.remove('bat'); }
}
$('#nut-ghim').onclick = () => { if (!manCua(R.mo)) { toast('Mở một màn rồi mới ghim được.'); return; } datGhim(!R.ghim); if (R.ghim) toast('Bấm vào chỗ trên màn muốn góp ý.'); };
function selectorCua(el, goc) {
  const ph = [];
  for (let n = el; n && n !== goc && n.nodeType === 1 && ph.length < 8; n = n.parentElement) {
    let s = n.tagName.toLowerCase();
    const cl = [...n.classList].filter((c) => /^[a-zA-Z][\w-]{0,30}$/.test(c)).slice(0, 2);
    if (cl.length) s += '.' + cl.join('.');
    const anh = n.parentElement ? [...n.parentElement.children].filter((x) => x.tagName === n.tagName) : [];
    if (anh.length > 1) s += `:nth-of-type(${anh.indexOf(n) + 1})`;
    ph.unshift(s);
  }
  return ph.join(' > ').slice(0, 300);
}
$('#lop-ghim').addEventListener('click', (e) => {
  if (!R.ghim) return;
  const m = manCua(R.mo); const r = $('#san').getBoundingClientRect();
  const px = (e.clientX - r.left) / st.view.z, py = (e.clientY - r.top) / st.view.z;
  let sel = '';
  try { const d = $('#khung').contentDocument; const el = d?.elementFromPoint(px, py); if (el) sel = selectorCua(el, d.body); } catch { /* bỏ qua */ }
  R.ghimCho = { x: Math.round((px / m.w) * 1000) / 10, y: Math.round((py / m.h) * 1000) / 10, sel };
  datGhim(false); capNhatGhimCho(); veGhim(); $('#gy-noi').focus();
});
function capNhatGhimCho() {
  const c = $('#gy-ghim'); c.hidden = !R.ghimCho; c.textContent = R.ghimCho ? `📌 ghim ${R.ghimCho.x}% · ${R.ghimCho.y}% ✕` : '';
  c.onclick = () => { R.ghimCho = null; capNhatGhimCho(); veGhim(); };
}
function veGhim() {
  const l = $('#lop-ghim'); l.innerHTML = '';
  const ds = gopYCua(R.mo).filter((g) => g.ghim);
  ds.forEach((g, i) => {
    const b = tao('button', `ghim muc-${g.muc}` + (g.tt === 'xong' ? ' xong' : '') + (g.v !== R.goi.v ? ' cu' : ''), String(i + 1));
    b.type = 'button'; b.style.left = `${g.ghim.x}%`; b.style.top = `${g.ghim.y}%`; b.title = `${g.ten}: ${g.noi}`;
    b.onclick = (e) => { e.stopPropagation(); const el = document.querySelector(`[data-gy="${g.id}"]`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.classList.add('nhay'); setTimeout(() => el?.classList.remove('nhay'), 1200); };
    l.append(b);
  });
  if (R.ghimCho) { const b = tao('span', 'ghim moi', '+'); b.style.left = `${R.ghimCho.x}%`; b.style.top = `${R.ghimCho.y}%`; l.append(b); }
}

// ---------- góp ý ----------
const gopYCua = (mo) => (R.goi?.gopY || []).filter((g) => (mo === 'chung' ? !g.key : g.key === mo));
// vẽ lại danh sách (có góp ý mới của người khác) mà không mất câu trả lời đang gõ dở
function giuNhap(goc) {
  const ds = [...goc.querySelectorAll('[data-gy] form textarea')].map((ta) => ({ id: ta.closest('[data-gy]').dataset.gy, v: ta.value, dang: document.activeElement === ta, a: ta.selectionStart, b: ta.selectionEnd }));
  return (moLai) => { for (const x of ds) { const ta = moLai(x.id); if (!ta) continue; ta.value = x.v; if (x.dang) { ta.focus(); try { ta.setSelectionRange(x.a, x.b); } catch { /* bỏ qua */ } } } };
}
function veGopY() {
  const d = $('#ds-gy'); const traNhap = giuNhap(d); d.innerHTML = '';
  if (R.mo === 'qt') { d.append(tao('p', 'phu', 'Chọn một màn hoặc «Góp ý chung» để xem và viết góp ý.')); veDeXuat(); return; }
  const ds = gopYCua(R.mo);
  if (!ds.length) d.append(tao('p', 'phu', 'Chưa có góp ý nào ở đây.'));
  let stt = 0;
  for (const g of ds) {
    const the = tao('article', `gy muc-${g.muc}` + (g.tt === 'xong' ? ' xong' : '')); the.dataset.gy = g.id;
    const dau = tao('div', 'gy-dau');
    const av = tao('span', 'avt nho', ([...g.ten][0] || '?').toUpperCase()); av.style.setProperty('--mau', mauTen(g.ten));
    dau.append(av, tao('b', '', g.ten), tao('span', `chip muc`, MUC_TEN[g.muc] || g.muc));
    if (g.ghim) dau.append(tao('span', 'chip', `📌 ${++stt}`));
    if (g.v !== R.goi.v) dau.append(tao('span', 'chip cu', `từ v${g.v}`));
    dau.append(tao('span', 'chip ' + (g.tt === 'xong' ? 'ok' : 'mo'), g.tt === 'xong' ? 'Đã xử lý' : 'Mở'));
    if (g.ycBt) dau.append(tao('span', 'chip', 'Đã yêu cầu biến thể'));
    dau.append(tao('span', 'phu gio', gioVN(g.t)));
    the.append(dau, tao('p', 'gy-noi', g.noi));
    for (const t of g.tl || []) {
      const tl = tao('div', 'tl' + (t.chuQuan ? ' chu' : ''));
      tl.append(tao('b', '', t.ten + (t.chuQuan ? ' (phụ trách)' : '')), tao('span', 'phu gio', gioVN(t.t)), tao('p', '', t.noi));
      the.append(tl);
    }
    const hang = tao('div', 'gy-nut');
    const btl = tao('button', 'nut-nhe', 'Trả lời'); btl.type = 'button';
    btl.onclick = () => moTraLoi(the, g);
    hang.append(btl);
    if (g.key && manCua(g.key)) { const bb = tao('button', 'nut-nhe', '✨ Biến thể theo góp ý này'); bb.type = 'button'; bb.onclick = () => hoiBienThe(g); hang.append(bb); }
    the.append(hang); d.append(the);
  }
  traNhap((id) => { const the = d.querySelector(`[data-gy="${CSS.escape(id)}"]`); const g = ds.find((x) => x.id === id); if (!the || !g) return null; moTraLoi(the, g); return the.querySelector('form textarea'); });
  veDeXuat();
}
function moTraLoi(the, g) {
  if (the.querySelector('form')) return;
  const f = tao('form', 'tl-hop'); const ta = tao('textarea'); ta.rows = 2; ta.maxLength = 2000; ta.required = true; ta.placeholder = 'Trả lời…';
  const b = tao('button', 'nut-chinh', 'Gửi'); b.type = 'submit'; f.append(ta, b); the.append(f); ta.focus();
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!canTen()) return;
    const j = await guiApi(`/api/review/r/${MA}/gop-y`, { cha: g.id, noi: ta.value, ten: rt.ten() }); if (!j) return;
    (g.tl ||= []).push(j); veGopY();
  };
}
function canTen() { if (rt?.ten()) return true; $('#lop-ten').hidden = false; $('#ten-nhap').focus(); toast('Đặt tên trước để mọi người biết ai góp ý.'); return false; }
async function guiApi(url, than) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(than) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 410) { het(j.loi || 'Link đã bị thu hồi.'); return null; }
    if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
    return j;
  } catch (e) { toast(`Không gửi được: ${e.message}`, true); return null; }
}
$('#hop-gy').addEventListener('submit', async (e) => {
  e.preventDefault(); if (!canTen()) return;
  const noi = $('#gy-noi').value.trim(); if (!noi) return;
  const key = R.mo === 'chung' ? null : R.mo;
  const btn = e.submitter; if (btn) btn.disabled = true;
  try {
    const j = await guiApi(`/api/review/r/${MA}/gop-y`, { key, ghim: key ? R.ghimCho : null, muc: $('#gy-muc').value, noi, ten: rt.ten() });
    if (!j) return;
    R.goi.gopY.push(j); $('#gy-noi').value = ''; R.ghimCho = null; capNhatGhimCho();
    veDsMan(); veGopY(); veGhim();
    if (key) hoiBienThe(j); else toast('Đã gửi góp ý.');
  } finally { if (btn) btn.disabled = false; }
});

// ---------- biến thể theo góp ý (key của chính người review) ----------
let hoiCho = null;
function hoiBienThe(g) {
  // đang sinh, hoặc đã sinh xong khi hộp đóng: mở lại kết quả thay vì sinh lượt mới (tốn key người review)
  if (R.dangSinh || (R.chuaXem && R.bt[0]?.gy.id === g.id)) { R.chuaXem = false; $('#lop-bt').hidden = false; veBienThe(); return; }
  hoiCho = g; $('#lop-hoi').hidden = false; $('#hoi-co').focus(); }
$('#hoi-khong').onclick = () => { $('#lop-hoi').hidden = true; hoiCho = null; toast('Đã gửi góp ý.'); };
$('#hoi-co').onclick = () => {
  $('#lop-hoi').hidden = true; const g = hoiCho; hoiCho = null; if (!g) return;
  if (!laMock() && !docKey()) { moKey(g); return; }
  sinhBienThe(g, Number($('#hoi-so').value) || 2);
};
let keyCho = null;
function moKey(g = null) {
  keyCho = g; $('#key-nhap').value = docKey(); $('#key-yc').hidden = !g; $('#lop-key').hidden = false; $('#key-nhap').focus();
}
$('#nut-key').onclick = () => moKey(null);
$('#key-xoa').onclick = () => { ghiKey(''); $('#key-nhap').value = ''; toast('Đã xoá key khỏi trình duyệt.'); };
$('#key-yc').onclick = async () => {
  const g = keyCho; $('#lop-key').hidden = true; keyCho = null; if (!g) return;
  const j = await guiApi(`/api/review/r/${MA}/yc/${g.id}`, {}); if (!j) return;
  Object.assign(g, j); veGopY(); toast('Đã gửi «Yêu cầu biến thể» — người phụ trách sẽ sinh giúp.');
};
$('#hop-key').addEventListener('submit', (e) => {
  e.preventDefault(); const v = $('#key-nhap').value.trim(); ghiKey(v); $('#lop-key').hidden = true;
  const g = keyCho; keyCho = null;
  if (g && (v || laMock())) sinhBienThe(g, Number($('#hoi-so').value) || 2); else toast(v ? 'Đã lưu key.' : 'Chưa có key.');
});

function yCua(g) {
  return `Góp ý của người review «${g.ten}» (${MUC_TEN[g.muc] || g.muc}) cho màn này${g.ghim ? ` — ghim ở khoảng ${g.ghim.x}% ngang, ${g.ghim.y}% dọc${g.ghim.sel ? `, phần tử ${g.ghim.sel}` : ''}` : ''}: ${g.noi}\nSửa màn theo đúng góp ý này, giữ nguyên phần còn lại.`;
}
async function sinhBienThe(g, n) {
  const m = manCua(g.key); if (!m) return;
  if (R.dangSinh) { toast('Đang sinh biến thể — đợi xong đã.'); return; }
  R.dangSinh = true;
  const y = yCua(g); const htmlGoc = lamSach(m.html);
  R.bt = Array.from({ length: n }, (_, i) => ({ k: i + 1, n, html: '', nhan: '', tt: 'dang', tien: 'Đang chờ lượt…', gy: g, key: m.key, w: m.w, h: m.h, model: laMock() ? 'mock' : MODEL }));
  $('#bt-y').textContent = `«${g.noi}» — ${n} biến thể bằng ${laMock() ? 'mock (không gọi Claude)' : MODEL}. Thiết kế gốc không đổi cho tới khi người phụ trách duyệt.`;
  $('#lop-bt').hidden = false; veBienThe();
  try {
    const sys = heThong(await taiAssets());
    await chayLoat(R.bt.map((f) => async (bao) => {
      const user = loiNguoiDung({ y, html: htmlGoc, w: m.w, h: m.h, ten: m.ten, k: f.k, n });
      const moiChu = (txt) => { f.tien = `${(txt.length / 1024).toFixed(1)} kB`; veBienThe(); };
      try {
        const { txt } = await (laMock()
          ? goiMock({ toan: `Ý TƯỞNG: Mock ${f.k} — ${HUONG[(f.k - 1) % HUONG.length].split(/[:,.]/)[0]}\n\`\`\`html\n${mockSua(htmlGoc, f.k, g.noi)}\n\`\`\``, signal: new AbortController().signal, moiChu, khiBatDau: bao, khoaCache: htmlGoc, vaoCache: Math.round((sys.length + user[0].length) / 3.2) })
          : goiClaude({ key: docKey(), model: MODEL, maxTokens: 16000, sys, user, signal: new AbortController().signal, moiChu, khiBatDau: bao }));
        const { nhan, html } = tachKetQua(txt);
        if (!html) throw new Error('Claude không trả về HTML.');
        f.html = lamSach(html); f.nhan = nhan || `Biến thể ${f.k}`; f.tt = 'xong';
      } catch (e) { f.tt = 'loi'; f.tien = e.message; }
      veBienThe();
    }));
  } finally {
    R.dangSinh = false; veBienThe();
    if ($('#lop-bt').hidden) { R.chuaXem = true; toast('Biến thể theo góp ý đã sinh xong — bấm ✨ ở góp ý đó để xem.'); }
  }
}
function oMan(html, w, h, rong) {
  const z = rong / w; const vo = tao('div', 'o-man'); vo.style.width = `${rong}px`; vo.style.height = `${Math.round(h * z)}px`;
  const ifr = document.createElement('iframe'); ifr.setAttribute('sandbox', 'allow-same-origin'); ifr.title = 'Xem màn';
  Object.assign(ifr.style, { width: `${w}px`, height: `${h}px`, transform: `scale(${z})` }); ifr.srcdoc = html; vo.append(ifr); return vo;
}
function veBienThe() {
  const l = $('#bt-luoi'); l.innerHTML = '';
  const m = R.bt[0] && manCua(R.bt[0].key); if (!m) return;
  const rong = Math.min(300, Math.max(200, (innerWidth - 120) / (R.bt.length + 1) - 24));
  const goc = tao('figure', 'the-bt goc'); goc.append(tao('figcaption', '', `Gốc (v${R.goi.v})`), oMan(lamSach(m.html), m.w, m.h, rong)); l.append(goc);
  for (const f of R.bt) {
    const c = tao('figure', 'the-bt'); const cap = tao('figcaption', '', f.tt === 'xong' ? `${f.k}. ${f.nhan}` : f.tt === 'loi' ? `${f.k}. Lỗi: ${f.tien}` : `${f.k}. Đang sinh… ${f.tien}`);
    c.append(cap);
    if (f.html) c.append(oMan(f.html, f.w, f.h, rong)); else c.append(tao('div', 'o-man cho'));
    if (f.tt === 'xong') {
      const b = tao('button', f.daGui ? 'nut-nhe' : 'nut-chinh', f.daGui ? '✓ Đã đề xuất — chờ duyệt' : 'Đề xuất áp dụng'); b.type = 'button'; b.disabled = !!f.daGui;
      b.onclick = async () => {
        b.disabled = true;
        const j = await guiApi(`/api/review/r/${MA}/de-xuat`, { gy: f.gy.id, key: f.key, html: f.html, w: f.w, h: f.h, nhan: f.nhan, model: f.model, ten: rt.ten() });
        if (!j) { b.disabled = false; return; }
        f.daGui = true; R.goi.deXuat.push(j); veBienThe(); veDeXuat(); toast('Đã gửi đề xuất — người phụ trách duyệt xong thì mới áp dụng lên thiết kế.');
      };
      c.append(b);
    }
    l.append(c);
  }
}
$('#bt-dong').onclick = () => { if (R.dangSinh && !confirm('Đang sinh biến thể — đóng thì vẫn chạy nền, bấm ✨ ở góp ý đó để mở lại. Đóng?')) return; $('#lop-bt').hidden = true; };

// ---------- đề xuất (chỉ xem trạng thái; người phụ trách duyệt ở bàn chính) ----------
function veDeXuat() {
  const d = $('#ds-dx'); d.innerHTML = '';
  const ds = (R.goi?.deXuat || []).filter((x) => x.key === R.mo);
  $('#dx-tieu').hidden = !ds.length;
  for (const x of ds.slice().reverse()) {
    const the = tao('div', `dx tt-${x.tt}`);
    the.append(tao('b', '', x.nhan || 'Đề xuất'), tao('span', `chip ${x.tt}`, TT_DX[x.tt] + (x.tt === 'chap' && x.vMoi ? ` (v${x.vMoi})` : '')), tao('span', 'phu', `${x.ten} · ${gioVN(x.t)}`));
    if (x.tt === 'tu' && x.lyDo) the.append(tao('p', 'ly-do', `Lý do: ${x.lyDo}`));
    const b = tao('button', 'nut-nhe', 'Xem'); b.type = 'button'; b.onclick = () => xemDeXuat(x); the.append(b);
    d.append(the);
  }
}
async function xemDeXuat(x) {
  let j; try { const r = await fetch(`/api/review/r/${MA}/de-xuat/${x.id}`); j = await r.json(); if (!r.ok) throw new Error(j.loi); } catch (e) { toast(`Không mở được đề xuất: ${e.message || ''}`, true); return; }
  const m = manCua(x.key); const w = x.w || m.w, h = x.h || m.h;
  $('#xem-tieu').textContent = `${x.nhan || 'Đề xuất'} — ${TT_DX[x.tt]}`;
  const l = $('#xem-luoi'); l.innerHTML = ''; const rong = Math.min(360, (innerWidth - 140) / 2);
  const a = tao('figure', 'the-bt goc'); a.append(tao('figcaption', '', 'Gốc'), oMan(lamSach(m.html), m.w, m.h, rong));
  const b = tao('figure', 'the-bt'); b.append(tao('figcaption', '', `Đề xuất của ${x.ten}`), oMan(lamSach(j.html), w, h, rong));
  l.append(a, b); $('#lop-xem').hidden = false;
}
$('#xem-dong').onclick = () => { $('#lop-xem').hidden = true; $('#xem-luoi').innerHTML = ''; };

// ---------- toast ----------
let henToast = 0;
function toast(t, loi = false) { const el = $('#toast'); el.textContent = t; el.classList.toggle('loi', loi); el.classList.add('hien'); clearTimeout(henToast); henToast = setTimeout(() => el.classList.remove('hien'), loi ? 7000 : 4000); }
addEventListener('keydown', (e) => { if (e.key === 'Escape') for (const id of ['#lop-hoi', '#lop-key', '#lop-xem']) if (!$(id).hidden) { $(id).hidden = true; if (id === '#lop-xem') $('#xem-luoi').innerHTML = ''; } });

// ---------- khởi động ----------
await tai();
if (R.goi) {
  let henTai = 0;
  rt = taoRealtime({ st, vung: $('#vung'), dom: new Map(), phong: `r-${MA}`, toast, nhanBt: () => {}, nhanSu: () => {},
    nhanRv: (m) => { if (m.loai === 'thu-hoi') { het('Link góp ý này đã bị thu hồi.'); return; } clearTimeout(henTai); henTai = setTimeout(tai, 300); },
    sec: () => R.mo, cheDo: () => 'canvas', suaId: () => null, doiSec: (sec) => { if (sec !== R.mo) mo(sec); }, datView: () => {} });
  vuaKhung();
}
window.__rv = { R, mo, st, sinhBienThe, get rt() { return rt; } }; // để nghiệm thu tự động
