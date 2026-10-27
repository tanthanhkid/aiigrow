// Trang góp ý /r/<mã>: chỉ xem ảnh chụp đóng băng của một hành trình (không Sửa, không biến thể trên bàn, không key máy chủ).
// Góp ý ghim vào màn (toạ độ % + selector) hoặc chung; trả lời theo luồng; biến thể theo góp ý sinh bằng key của CHÍNH người review
// rồi gửi thành «Đề xuất thay đổi» chờ chủ quản duyệt — thiết kế gốc không đổi. Mọi chữ người dùng gõ hiển thị bằng textContent.
import { taoRealtime, mauTen } from './realtime.js';
import { heThong, loiNguoiDung, tachKetQua, HUONG } from './prompt.js';
import { goiClaude, goiMock, mockSua, chayLoat, lamSach, taiAssets } from './claude.js';
import { taoAnXuLy, daXuLyGy, daXuLyDx } from './an-xu-ly.js';
import { ganToi } from './gan-toi.js';

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

const R = { goi: null, mo: '', i: -1, chuaXem: false, play: false, ghim: false, lich: [], ghimCho: null, ganDay: null, bt: [], dangSinh: false };
let rt = null;
// góp ý «Đã xử lý» (và đề xuất đã duyệt) mặc định ẩn ở danh sách + ghim; công tắc «Hiện đã xử lý (N)» ở đầu danh sách
const XL = taoAnXuLy('bs.r-hien-xl', () => { veGopY(); veGhim(); }, (t) => !!rt?.ten() && t.ten === rt.ten()); // trả lời của chính mình không tính là «mới»
const giuNhapId = new Set(); // góp ý đang gõ trả lời dở: vẫn hiện dù vừa bị đánh dấu xử lý (không mất chữ)
const hienGy = (g) => XL.hien || !daXuLyGy(g) || giuNhapId.has(g.id);
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
  R.goi = j;
  await napHienHanh(); veBan();
  document.title = `Góp ý · ${j.htTen}`;
  $('#ht-ten').textContent = j.htTen; $('#ht-v').textContent = `v${j.v}`; $('#ht-ghi').textContent = j.ghiChu || '';
  veDsMan();
  const h = decodeURIComponent(location.hash.slice(1));
  mo(j.man.some((m) => m.key === h) || h === 'qt' || h === 'chung' ? h : j.man[0]?.key || 'chung');
}
function het(ly) { $('#het').hidden = false; $('#het-ly').textContent = ly; document.body.classList.add('da-het'); }
const manChup = (key) => R.goi?.man.find((m) => m.key === key); // bản đóng băng lúc tạo link
// Bản đang hiển thị: màn đã được «Thay màn»/Khôi phục trên bàn chính sau khi chia sẻ ⇒ bản hiện hành (Xem, Play, Ghim, biến thể theo góp ý),
// trừ khi người xem bấm «Bản lúc chia sẻ» để đối chiếu.
const manCua = (key) => { const m = manChup(key); const x = m && !R.banChup && HIEN.get(key); return x ? { ...m, ...x, moi: true } : m; };

// ---------- bản hiện hành của các màn (kho phiên bản của bàn chính) ----------
const HIEN = new Map(); // key → { v, html, w, h } — chỉ màn đã khác bản lúc chia sẻ
let maGoc = null;       // Promise<Map key → { html, w, h, toi, ke, keTen }>: bản trong mã (v0) + nhãn bước để gắn data-toi như bàn chính
function banTrongMa() {
  return (maGoc ||= import('./hanh-trinh/index.js').then(({ taiHanhTrinh }) => taiHanhTrinh()).then(({ ds }) => {
    const bang = new Map();
    for (const h of ds) h.buoc.forEach((b, i) => { const ke = h.buoc[i + 1]; bang.set(b.key, { html: ke && b.toi ? ganToi(b.html, b.toi, ke.key, ke.ten) : b.html, w: b.w, h: b.h, toi: b.toi, ke: ke?.key, keTen: ke?.ten }); });
    return bang;
  }).catch((e) => { maGoc = null; throw e; }));
}
// chiKey: chỉ nạp lại một màn (tin realtime «thay»). Trả true nếu có màn đổi.
async function napHienHanh(chiKey = '') {
  let ds; try { const r = await fetch('/api/phien-ban', { cache: 'no-store' }); if (!r.ok) return false; ds = await r.json(); } catch { return false; }
  let doi = false;
  for (const m of R.goi.man) {
    if (chiKey && m.key !== chiKey) continue;
    const mf = ds[m.key]; const hien = mf?.hien || 0;
    const muc = mf?.ds?.find((x) => x.v === hien); const mucChup = mf?.ds?.find((x) => x.v === (m.pb || 0));
    if (hien === (m.pb || 0) || (muc?.tep || 0) === (mucChup?.tep || 0)) { if (HIEN.delete(m.key)) doi = true; continue; } // cùng tệp HTML (vd. khôi phục về đúng bản đã chia sẻ)
    if (HIEN.get(m.key)?.v === hien) continue;
    try {
      const goc = (await banTrongMa()).get(m.key);
      let html = goc?.html || '', w = goc?.w || m.w, h = goc?.h || m.h;
      if (muc?.tep) {
        const r = await fetch(`/api/phien-ban/${encodeURIComponent(m.key)}/${muc.tep}`, { cache: 'no-store' });
        const j = await r.json(); if (!r.ok || typeof j.html !== 'string') throw new Error(j.loi || r.status);
        html = j.html; w = muc.w || w; h = muc.h || h;
        if (goc?.toi && goc.ke && !/data-toi=/.test(html)) html = ganToi(html, goc.toi, goc.ke, goc.keTen);
      }
      if (!html) continue;
      HIEN.set(m.key, { v: hien, html, w, h }); doi = true;
    } catch { /* lỗi mạng: giữ bản đang có, lần đồng bộ sau thử lại */ }
  }
  return doi;
}
function veBan() {
  const b = $('#nut-ban'); const n = HIEN.size; b.hidden = !n; if (!n) R.banChup = false;
  b.textContent = R.banChup ? '🕘 Đang xem bản lúc chia sẻ' : `✨ Đang xem bản mới nhất`;
  b.title = R.banChup ? 'Bấm để về bản mới nhất (sau Thay màn trên bàn chính)' : `${n} màn đã được thay sau khi chia sẻ link — bấm để xem bản lúc chia sẻ`;
  b.setAttribute('aria-pressed', String(!!R.banChup));
}
// đồng bộ rồi vẽ lại màn đang mở (giữ lịch sử Play)
async function dongBoBan(chiKey = '') {
  const doi = await napHienHanh(chiKey);
  if (!doi) return false;
  veBan();
  if (R.mo && (!chiKey || R.mo === chiKey || R.mo === 'qt')) mo(R.mo, R.i, false); else veDsMan();
  return true;
}

// ---------- danh sách màn + mở màn ----------
function veDsMan() {
  const ol = $('#ds-man'); ol.innerHTML = '';
  const dem = new Map(); for (const g of R.goi.gopY) if (g.tt === 'mo' && g.key) dem.set(g.key, (dem.get(g.key) || 0) + 1);
  R.goi.man.forEach((m, i) => {
    const li = tao('li'); const b = tao('button', 'muc-man' + (R.i === i ? ' bat' : ''));
    b.type = 'button'; b.dataset.key = m.key;
    b.append(tao('span', 'so-tt', String(i + 1)), tao('span', 't', m.ten));
    if (HIEN.has(m.key) && !R.banChup) { const x = tao('span', 'moi', 'mới'); x.title = `Đã thay sau khi chia sẻ — đang hiện v${HIEN.get(m.key).v}`; b.append(x); }
    if (dem.get(m.key)) b.append(tao('span', 'dem', String(dem.get(m.key))));
    b.onclick = () => mo(m.key, i); li.append(b); ol.append(li);
  });
  for (const b of document.querySelectorAll('.muc-dac')) b.classList.toggle('bat', b.dataset.mo === R.mo);
}
document.querySelectorAll('.muc-dac').forEach((b) => { b.onclick = () => mo(b.dataset.mo); });
// i: vị trí trong hành trình (một màn có thể được ghé nhiều lần, vd. A→B→A→C)
function mo(key, i = R.goi.man.findIndex((x) => x.key === key), ghi = true) {
  R.mo = key; R.i = R.goi.man[i]?.key === key ? i : -1; R.ghimCho = null; capNhatGhimCho();
  // Play: mọi đường đổi màn (nút trong màn, ◀ ▶, danh sách, đi theo) đều vào lịch sử để «Quay lại» đúng; lùi thì không ghi
  if (R.play && !manCua(key)) datCheDo('xem'); // Quy trình / Góp ý chung: không có màn để Play
  if (R.play && ghi && manCua(key)) { const t = R.lich.at(-1); if (!t || t.key !== key || t.i !== R.i) R.lich.push({ key, i: R.i }); }
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
  $('#vi-tri').textContent = m ? `Màn ${i + 1}/${R.goi.man.length} · ${m.ten}${m.moi ? ` · bản mới v${m.v}` : ''}`
    : key === 'qt' ? `Quy trình${HIEN.size && !R.banChup ? ` (sơ đồ chụp lúc chia sẻ — ${HIEN.size} màn đã thay sau đó)` : ''}` : 'Góp ý chung';
  $('#nut-truoc').disabled = i <= 0 && !(R.play && R.lich.length > 1); $('#nut-sau').disabled = i < 0 || i >= R.goi.man.length - 1;
  $('#gy-noi').placeholder = m ? `Góp ý cho màn «${m.ten}»…` : 'Góp ý cho cả hành trình…';
  $('#hop-gy').hidden = key === 'qt';
  veDsMan(); veGopY(); veGhim();
  rt?.khiDoiView();
}
const buoc = (d) => { const i = R.i + d; const m = R.goi.man[i]; if (R.i >= 0 && m) mo(m.key, i); };
// tự chuyển màn = thôi «đi theo» người khác (không thì màn người kia kéo về)
$('#nut-truoc').onclick = () => { rt?.boTheo(); if (R.play) playLui(); else buoc(-1); }; $('#nut-sau').onclick = () => { rt?.boTheo(); buoc(1); };

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

// ---------- chế độ: Xem · ▶ Play · 📌 Ghim (loại trừ nhau; phím P / G, Esc về Xem) ----------
// Play như bàn chính: nút có data-toi → màn đích; nút «quay lại» → lùi theo lịch sử Play; nút chưa nối màn → nháy viền các nút đi được + báo.
const LUI_CHU = /^(?:[‹←❮<]|(?:[‹←❮<]\s*)?(?:quay lại|trở lại|trở về|back))$/i;
const LUI_NHAN = /^\s*(?:quay lại|trở lại|trở về|back|go back)\s*$/i;
const KIEU_PLAY = 'html.play [data-toi]{cursor:pointer!important}html.play a,html.play button,html.play [role=button]{cursor:pointer}'
  + 'html.goi-y [data-toi]{outline:3px solid rgba(43,183,163,.9)!important;outline-offset:2px;transition:outline-color .2s}';
function cheDoTrongKhung() {
  const d = $('#khung').contentDocument; if (!d?.documentElement) return;
  d.documentElement.classList.toggle('play', R.play);
}
function datCheDo(c) {
  R.play = c === 'play'; R.ghim = c === 'ghim';
  for (const [id, b] of [['#nut-play', R.play], ['#nut-ghim', R.ghim]]) { $(id).setAttribute('aria-pressed', b); $(id).classList.toggle('bat', b); }
  $('#nut-play').textContent = R.play ? '■ Dừng Play' : '▶ Play';
  $('#lop-ghim').classList.toggle('dang-ghim', R.ghim);
  $('#vung').classList.toggle('dang-play', R.play);
  if (R.play) R.lich = manCua(R.mo) ? [{ key: R.mo, i: R.i }] : [];
  cheDoTrongKhung();
}
const nutLui = (el) => {
  const chu = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return LUI_CHU.test(chu) || LUI_NHAN.test(el.getAttribute('aria-label') || '') || LUI_NHAN.test(el.getAttribute('title') || '') || /(^|\s)(lui|nut-lui|back|quay-lai|tro-lai)(\s|$)/i.test(el.getAttribute('class') || '');
};
let henNhay = 0, lanBao = 0;
function nhayGoiY(d, chu) {
  d.documentElement.classList.add('goi-y'); clearTimeout(henNhay); henNhay = setTimeout(() => d.documentElement.classList.remove('goi-y'), 800);
  if (chu && Date.now() - lanBao > 2500) { lanBao = Date.now(); toast(chu); }
}
// đích: lần ghé kế tiếp của màn đó sau vị trí hiện tại (hành trình có thể ghé lại một màn, vd. A→B→A→C)
// không có lần ghé sau thì lấy lần ghé gần nhất phía trước
function playToi(key) { const ds = R.goi.man; let i = ds.findIndex((m, j) => j > R.i && m.key === key); if (i < 0) i = ds.findLastIndex((m) => m.key === key); mo(key, i); }
function playLui() {
  let t = null;
  if (R.lich.length > 1) { R.lich.pop(); t = R.lich.at(-1); } else if (R.i > 0) { t = { key: R.goi.man[R.i - 1].key, i: R.i - 1 }; R.lich = [t]; }
  if (!t) return false;
  mo(t.key, t.i, false);
  return true;
}
// trong màn (cùng origin, không script): bắt bấm theo chế độ; chuột trong màn chuyển ra trang để con trỏ realtime vẫn chạy
function ganTrongKhung(ifr) {
  const d = ifr.contentDocument; if (!d) return;
  const st2 = d.createElement('style'); st2.textContent = KIEU_PLAY; (d.head || d.documentElement).appendChild(st2);
  // pointerdown trong iframe không nổi ra #vung: báo cho realtime để thôi «đi theo» (không thì màn người kia kéo về, Play như bị đơ)
  d.addEventListener('pointerdown', () => rt?.boTheo(), true);
  d.addEventListener('click', (e) => {
    const a = e.target.closest?.('[data-toi]');
    const go = e.target.closest?.('input,textarea,select,label');
    const nut = a || (!go && e.target.closest?.('a,button,[role=button],.nut'));
    if (a || e.target.closest?.('a') || (nut && !go)) e.preventDefault(); // link không bao giờ rời srcdoc
    if (R.play) {
      if (a) { const k = a.dataset.toi; if (manCua(k)) playToi(k); else nhayGoiY(d, `Nút «${(a.textContent || '').trim().slice(0, 30)}» dẫn tới màn không có trong link này.`); return; }
      if (go) return; // cho gõ/tick thử trong ô
      if (nut && nutLui(nut)) { if (!playLui()) nhayGoiY(d, 'Đây là màn đầu — không còn màn để quay lại.'); return; }
      if (!nut) { nhayGoiY(d, ''); return; } // bấm chỗ trống/chữ: chỉ nháy viền, không báo
      const coDich = d.querySelector('[data-toi]');
      nhayGoiY(d, coDich ? 'Nút này chưa nối màn — bấm nút có viền xanh để đi tiếp.' : 'Màn cuối của hành trình — không còn nút đi tiếp (← để quay lại).');
      return;
    }
    if (!R.ghim && (a || nut) && Date.now() - lanBao > 4000) { lanBao = Date.now(); toast('Đang ở chế độ Xem — bấm ▶ Play (phím P) để bấm nút đi tiếp như app thật.'); }
  }, true);
  d.addEventListener('pointermove', (e) => {
    const r = ifr.getBoundingClientRect(); const z = st.view.z;
    dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + e.clientX * z, clientY: r.top + e.clientY * z }));
  }, { passive: true });
  d.addEventListener('keydown', phimCheDo);
  cheDoTrongKhung();
}
$('#nut-play').onclick = () => {
  if (!R.play && !manCua(R.mo)) { toast('Mở một màn rồi mới Play được.'); return; }
  datCheDo(R.play ? 'xem' : 'play');
  toast(R.play ? 'Play: bấm nút trong màn để đi tiếp như app thật · ← quay lại · Esc dừng.' : 'Đã dừng Play.');
};

// ---------- ghim ----------
const datGhim = (b) => datCheDo(b ? 'ghim' : 'xem');
$('#nut-ban').onclick = () => {
  R.banChup = !R.banChup; veBan();
  if (R.mo) mo(R.mo, R.i, false);
  toast(R.banChup ? 'Đang xem bản lúc chia sẻ link (để đối chiếu).' : 'Đang xem bản mới nhất.');
};
$('#nut-ghim').onclick = () => { if (!manCua(R.mo)) { toast('Mở một màn rồi mới ghim được.'); return; } datGhim(!R.ghim); if (R.ghim) toast('Ghim: bấm vào chỗ trên màn muốn góp ý · Esc thôi.'); };
// một bộ phím cho cả trang lẫn trong màn (iframe): ← → chuyển màn (Play: ← lùi theo lịch sử), P / G / Esc đổi chế độ
function phimCheDo(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
  if ([...document.querySelectorAll('.lop')].some((l) => !l.hidden)) return;
  const k = e.key.toLowerCase();
  if ((k === 'p' || k === 'g') && e.repeat) { e.preventDefault(); return; }
  if (k === 'p') { e.preventDefault(); $('#nut-play').click(); }
  else if (k === 'g') { e.preventDefault(); $('#nut-ghim').click(); }
  else if (e.key === 'Escape' && rt?.dangTheo()) { e.preventDefault(); rt.boTheo(); } // Esc trước hết thôi «đi theo», giữ chế độ
  else if (e.key === 'Escape' && (R.play || R.ghim)) { e.preventDefault(); datCheDo('xem'); toast('Chế độ Xem.'); }
  else if (e.key === 'ArrowLeft' || (R.play && e.key === 'Backspace')) { e.preventDefault(); $('#nut-truoc').click(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); $('#nut-sau').click(); }
}
addEventListener('keydown', phimCheDo, true);
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
  // số ghim đánh trên MỌI ghim (kể cả đang ẩn) để «ghim 3» không đổi nghĩa khi có ghim được xử lý
  gopYCua(R.mo).filter((g) => g.ghim).forEach((g, i) => {
    if (!hienGy(g)) return;
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
  giuNhapId.clear(); for (const x of ds) if (x.v.trim() || x.dang) giuNhapId.add(x.id);
  return (moLai) => { for (const x of ds) { const ta = moLai(x.id); if (!ta) continue; ta.value = x.v; if (x.dang) { ta.focus(); try { ta.setSelectionRange(x.a, x.b); } catch { /* bỏ qua */ } } } };
}
function veGopY() {
  const d = $('#ds-gy'); const traNhap = giuNhap(d); d.innerHTML = '';
  if (R.mo === 'qt') { d.append(tao('p', 'phu', 'Chọn một màn hoặc «Góp ý chung» để xem và viết góp ý.')); veDeXuat(); return; }
  const tatCa = gopYCua(R.mo); const xl = tatCa.filter(daXuLyGy);
  const soDx = (R.goi?.deXuat || []).filter((x) => x.key === R.mo && daXuLyDx(x)).length;
  if (xl.length || soDx || XL.hien) d.append(XL.congTac(xl.length + soDx, xl.some((g) => XL.traLoiChuaXem(g).length)));
  if (XL.hien) XL.danhDauDaXem(xl);
  const soGhim = new Map(tatCa.filter((g) => g.ghim).map((g, i) => [g.id, i + 1]));
  const ds = tatCa.filter(hienGy);
  if (!ds.length) d.append(tao('p', 'phu', xl.length ? `Không còn góp ý đang mở ở đây — ${xl.length} góp ý đã xử lý đang ẩn.` : 'Chưa có góp ý nào ở đây.'));
  for (const g of ds) {
    const the = tao('article', `gy muc-${g.muc}` + (g.tt === 'xong' ? ' xong' : '')); the.dataset.gy = g.id;
    const dau = tao('div', 'gy-dau');
    const av = tao('span', 'avt nho', ([...g.ten][0] || '?').toUpperCase()); av.style.setProperty('--mau', mauTen(g.ten));
    dau.append(av, tao('b', '', g.ten), tao('span', `chip muc`, MUC_TEN[g.muc] || g.muc));
    if (g.ghim) dau.append(tao('span', 'chip', `📌 ${soGhim.get(g.id)}`));
    if (g.v !== R.goi.v) dau.append(tao('span', 'chip cu', `từ v${g.v}`));
    dau.append(tao('span', 'chip ' + (g.tt === 'xong' ? 'ok' : 'mo'), g.tt === 'xong' ? 'Đã xử lý' : 'Mở'));
    if (g.ycBt) dau.append(tao('span', 'chip', 'Đã yêu cầu biến thể'));
    const moi = XL.moiSauXl(g).length; if (moi) dau.append(tao('span', 'chip cu', `↩ ${moi} trả lời sau khi xử lý`));
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
  traNhap((id) => { const the = d.querySelector(`[data-gy="${CSS.escape(id)}"]`); const g = ds.find((x) => x.id === id); if (!the || !g) return null; moTraLoi(the, g, false); return the.querySelector('form textarea'); });
  veDeXuat();
}
function moTraLoi(the, g, focus = true) {
  if (the.querySelector('form')) return;
  const f = tao('form', 'tl-hop'); const ta = tao('textarea'); ta.rows = 2; ta.maxLength = 2000; ta.required = true; ta.placeholder = 'Trả lời…';
  const b = tao('button', 'nut-chinh', 'Gửi'); b.type = 'submit'; f.append(ta, b); the.append(f); if (focus) ta.focus();
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!canTen()) return;
    const j = await guiApi(`/api/review/r/${MA}/gop-y`, { cha: g.id, noi: ta.value, ten: rt.ten() }); if (!j) return;
    f.remove(); // đã gửi: đóng hộp trả lời (không giữ lại như bản nháp)
    (g.tl ||= []).push(j); veGopY(); veGhim();
    if (daXuLyGy(g) && !XL.hien) toast('Đã gửi trả lời — góp ý này đã được xử lý nên ẩn khỏi danh sách (bật «Hiện đã xử lý» để xem).');
  };
}
function canTen() { if (rt?.ten()) return true; $('#lop-ten').hidden = false; $('#ten-nhap').focus(); toast('Đặt tên trước để mọi người biết ai góp ý.'); return false; }
async function guiApi(url, than) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-bs-nguoi': encodeURIComponent(rt?.ten() || '') }, body: JSON.stringify(than) });
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
      // chữ chạy về: chỉ đổi dòng tiến độ của biến thể này, không dựng lại cả lưới (iframe + lamSach màn gốc)
      const moiChu = (txt) => { f.tien = `${(txt.length / 1024).toFixed(1)} kB`; if (f._cap?.isConnected) f._cap.textContent = `${f.k}. Đang sinh… ${f.tien}`; else veBienThe(); };
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
    c.append(cap); Object.defineProperty(f, '_cap', { value: cap, writable: true, configurable: true, enumerable: false });
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
  const ds = (R.goi?.deXuat || []).filter((x) => x.key === R.mo && (XL.hien || !daXuLyDx(x)));
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
    nhanRv: (m) => {
      if (m.loai === 'thu-hoi') { het('Link góp ý này đã bị thu hồi.'); return; }
      if (m.loai === 'thay' && m.key) { dongBoBan(m.key).then((doi) => { const x = manChup(m.key); if (doi && x) toast(`${m.ten ? `${m.ten} vừa thay` : 'Vừa có bản mới của'} màn «${x.ten}» — đang hiện bản mới.`); }); return; }
      clearTimeout(henTai); henTai = setTimeout(tai, 300);
    },
    khiChao: () => { dongBoBan(); }, // nối lại realtime: tin «thay» lúc rớt mạng có thể đã lỡ

    sec: () => R.mo, cheDo: () => 'canvas', suaId: () => null, doiSec: (sec) => { if (sec !== R.mo) mo(sec); }, datView: () => {} });
  vuaKhung();
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && R.goi) dongBoBan(); });
window.__rv = { R, mo, st, sinhBienThe, HIEN, dongBoBan, get rt() { return rt; } }; // để nghiệm thu tự động
