// Chế độ Sửa (phím E): sửa trực tiếp MỘT khung — chọn / kéo đổi thứ tự / dịch tự do (Alt) / đổi cỡ / sửa chữ / bảng thuộc tính / đo khoảng cách (Alt).
// Khung đang sửa luôn có iframe sống (app.js hỏi giuSong()). Iframe không chạy script (sandbox allow-same-origin): mọi xử lý chạy ở trang cha,
// gắn listener vào contentDocument như Play. Lớp vẽ (viền chọn, tay nắm, vạch thả, thước đo) nằm ở trang cha, ngay trên iframe, cùng hệ toạ độ
// với tài liệu trong khung (thế giới đã scale theo zoom nên tự khớp). Lịch sử hoàn tác theo khung: ảnh chụp body sau mỗi thao tác + mô tả
// thao tác (dùng làm «diff» gửi Claude khi Làm mượt).
import { heThong, loiNguoiDung, tachKetQua } from './prompt.js';

const DAU = 34; // thanh tiêu đề khung (khớp app.js)
const $ = (s) => document.querySelector(s);
let C = null;   // ngữ cảnh do app.js đưa vào (gan)
const S = { id: null, f: null, d: null, ifr: null, tl: null, lop: null, sel: null, hover: null, keo: null, alt: false, suaChu: null, ac: null, raf: 0, z: 0, varMau: new Map(), bong: new Set() };
const LICH = new Map(); // id khung → { goc: html khung lúc bắt đầu, ds: [{ html, bs, duong, moTa }], vt }

export const giuSong = (id) => S.id === id;
export const dangSua = () => S.id;
export const phanTuChon = () => S.sel; // cho nghiệm thu tự động

// ---------- token Clay (docs/THIET-KE-CLAY.md + web/kit/clay-kit.css) ----------
const TOKEN = [
  ['Chữ', '#0f1312'], ['Chữ phụ', '#3a403d'], ['Chữ mờ', '#565c59'], ['Trắng', '#ffffff'], ['Thẻ', '#f7f6f3'], ['Nền sáng', '#f4f4f2'], ['Nền', '#ecebe7'],
  ['Lõm', '#e9e8e3'], ['Xám nhạt', '#e4e3de'], ['Ngọc', '#0f6b5c'], ['Ngọc đậm', '#0a5246'], ['Ngọc nhạt', '#dcebe6'], ['Vàng điểm', '#f5b70a'],
  ['Chữ điểm', '#6e4300'], ['Nền điểm', '#fbecc0'], ['Cảnh báo', '#8a3c0c'], ['Nền cảnh báo', '#f9e7d2'], ['Lỗi', '#b42318'], ['Lam', '#1d4ed8'],
  ['Lam nhạt', '#e1e9fb'], ['Tím nhạt', '#e7e5f8'],
];
const BONG = [
  ['clay', 'Clay', '0 22px 30px -14px rgba(28,32,30,.38),0 6px 10px -5px rgba(28,32,30,.22),inset 0 1.5px 0 rgba(255,255,255,1),inset 0 -2px 0 rgba(255,255,255,.7),inset 0 -10px 16px -8px rgba(40,44,42,.14)'],
  ['clayNho', 'Clay nhỏ', '0 12px 16px -8px rgba(28,32,30,.40),0 3px 5px -2px rgba(28,32,30,.24),inset 0 1.5px 0 rgba(255,255,255,1),inset 0 -6px 10px -5px rgba(40,44,42,.16)'],
  ['lomIn', 'Lõm (ô nhập)', 'inset 0 4px 8px rgba(40,44,42,.14),inset 0 -1.5px 0 rgba(255,255,255,.95)'],
  ['', 'Nổi mềm', '0 10px 24px -12px rgba(28,32,30,.35),0 2px 6px -2px rgba(28,32,30,.18),inset 0 1px 0 #fff'],
];
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');
function sangHex(c) {
  if (!c) return '';
  c = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{3}$/.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  const m = c.match(/^rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\)$/);
  if (!m) return '';
  if (m[4] != null && parseFloat(m[4]) === 0) return 'transparent';
  return '#' + hex2(m[1]) + hex2(m[2]) + hex2(m[3]);
}
const s4 = (v, b = 4) => Math.round(v / b) * b;

// ---------- gắn vào app ----------
export function gan(ctx) {
  C = ctx;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/che-do-sua.css'; document.head.appendChild(css);
  const nut = document.createElement('button'); nut.id = 'nut-sua'; nut.type = 'button'; nut.title = 'Chế độ Sửa khung đang chọn: kéo, đổi cỡ, sửa chữ, chỉnh thuộc tính (E)';
  nut.innerHTML = '✎ Sửa <kbd>E</kbd>'; nut.onclick = () => (S.id ? thoat() : batSua());
  $('#nut-play')?.before(nut);
  const nut2 = document.createElement('button'); nut2.type = 'button'; nut2.id = 'nut-sua-bang'; nut2.textContent = '✎ Sửa (E)'; nut2.onclick = () => batSua();
  $('#bang .luoi-nut')?.prepend(nut2);
  taoBang();
  addEventListener('keydown', phim, true);
  addEventListener('keyup', phimNha, true);
  addEventListener('blur', () => { if (S.alt) { S.alt = false; ve(); } });
  addEventListener('pointerup', () => { if (S.keo && S.keo.loai !== 'co') thaKeo(true); }); // thả chuột ngoài khung = huỷ lượt kéo
}

// ---------- bật / tắt ----------
export function batSua(id) {
  const f = id ? C.timKhung(id) : C.khungChon();
  if (!f) { C.toast('Chọn một khung trước (bấm vào khung) rồi bấm E.'); return; }
  if (!C.htmlCua(f) || f.tt === 'dang') { C.toast('Khung này chưa có nội dung xong để sửa.', true); return; }
  if (S.id) thoat();
  const d = C.dom.get(f.id);
  if (!d || !d.el.isConnected) { C.toast('Khung này không hiện trên bàn vẽ (đang ở Quy trình hoặc section khác) — mở section của khung rồi bấm E.', true); return; }
  for (const k of LICH.keys()) if (!C.timKhung(k)) LICH.delete(k); // bỏ lịch sử của khung đã xoá
  S.id = f.id; S.f = f; S.sel = S.hover = S.keo = S.suaChu = null; S.ifr = S.tl = null;
  document.body.classList.add('dang-sua');
  $('#nut-sua')?.classList.add('bat');
  C.st.chon.clear(); C.st.chon.add(f.id); C.st.lanChon = null;
  C.veTatCa(false); C.vuaMan([f.id]);
  S.d = d; d.el.classList.add('dang-sua');
  S.lop = document.createElement('div'); S.lop.className = 'lop-sua';
  const { w, h } = C.kichThuoc(f);
  Object.assign(S.lop.style, { top: `${DAU}px`, width: `${w}px`, height: `${h}px` });
  S.lop.innerHTML = `<div class="ls-cho"></div><div class="ls-hv"></div><div class="ls-chon"><span class="ls-nhan"></span>${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((x) => `<i class="tay" data-h="${x}"></i>`).join('')}</div>
    <div class="ls-vach"></div><svg class="ls-do" width="${w}" height="${h}" overflow="visible"></svg><div class="ls-so"></div>`;
  d.el.appendChild(S.lop);
  S.lop.addEventListener('pointerdown', batDauCo);
  $('#bang-sua').hidden = false; $('#bs-khung').textContent = C.tenCua(f);
  $('#bs-ap').hidden = f.loai !== 'bien';
  veBang();
  S.z = 0; khiDoiView();
  S.phien = (S.phien || 0) + 1;
  choIframe(0, S.phien);
}

function choIframe(lan, phien) {
  if (!S.id || phien !== S.phien) return;
  const d = S.d;
  if (d.iframe && d.el.classList.contains('song') && d.iframe.contentDocument?.body) { ganIframe(d.iframe); return; }
  if (lan > 300) { C.toast('Iframe của khung chưa sẵn sàng — thử bấm E lại.', true); thoat(); return; }
  requestAnimationFrame(() => choIframe(lan + 1, phien));
}

function ganIframe(ifr) {
  S.ifr = ifr; S.tl = ifr.contentDocument;
  const tl = S.tl;
  const st = tl.createElement('style'); st.setAttribute('data-bs-sua', '');
  st.textContent = 'html,body,body *{-webkit-user-select:none!important;user-select:none!important;cursor:default!important}[contenteditable]{-webkit-user-select:text!important;user-select:text!important;cursor:text!important;outline:2px solid #2f80ed!important;outline-offset:2px}';
  tl.head.appendChild(st);
  S.ac = new AbortController();
  const o = { signal: S.ac.signal };
  tl.addEventListener('pointermove', diChuot, o);
  tl.addEventListener('pointerdown', nhanChuot, o);
  tl.addEventListener('pointerup', thaKeo, o);
  tl.addEventListener('pointercancel', () => thaKeo(true), o);
  tl.addEventListener('pointerleave', () => { if (!S.keo) { S.hover = null; ve(); } }, o);
  tl.addEventListener('dblclick', (e) => { const t = e.target; if (t && t !== tl.body && t !== tl.documentElement) { e.preventDefault(); batSuaChu(t); } }, o);
  tl.addEventListener('click', (e) => { if (!e.target.closest?.('[contenteditable]')) e.preventDefault(); }, { ...o, capture: true });
  tl.addEventListener('dragstart', (e) => e.preventDefault(), o);
  tl.addEventListener('keydown', phim, { ...o, capture: true });
  tl.addEventListener('keyup', phimNha, { ...o, capture: true });
  tl.addEventListener('wheel', (e) => { // cuộn/zoom trên khung vẫn điều khiển bàn vẽ
    e.preventDefault();
    const r = ifr.getBoundingClientRect(); const z = C.st.view.z;
    C.vung.dispatchEvent(new WheelEvent('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, ctrlKey: e.ctrlKey, metaKey: e.metaKey, clientX: r.left + e.clientX * z, clientY: r.top + e.clientY * z, bubbles: true, cancelable: true }));
  }, { ...o, passive: false });
  // màu token đang khai báo trong màn (biến CSS ở :root) → dùng var(--x) khi chọn đúng màu đó
  S.varMau = new Map(); S.bong = new Set();
  for (const ss of tl.styleSheets) {
    let rules; try { rules = ss.cssRules; } catch { continue; }
    for (const r of rules) {
      if (!r.style || !/(^|,)\s*:root\s*(,|$)/.test(r.selectorText || '')) continue;
      for (const p of r.style) {
        if (!p.startsWith('--')) continue;
        const v = r.style.getPropertyValue(p).trim();
        const hx = sangHex(v); if (hx && hx !== 'transparent' && !S.varMau.has(hx)) S.varMau.set(hx, p);
        if (BONG.some(([k]) => k && `--${k}` === p)) S.bong.add(p.slice(2));
      }
    }
  }
  veMau();
  const L = LICH.get(S.id);
  if (L && L.goc === C.htmlCua(S.f)) { if (L.vt > 0) { apDung(L.ds[L.vt]); C.toast('Tiếp tục bản sửa dở của khung này (⌘Z để lùi).'); } }
  else {
    if (L && L.vt > 0) C.toast('Khung đã đổi nội dung từ lần sửa trước — bản sửa dở cũ không áp được nữa, bắt đầu lại từ nội dung mới.', true);
    LICH.set(S.id, { goc: C.htmlCua(S.f), ds: [{ ...chup(), moTa: 'Gốc' }], vt: 0 });
  }
  veBang(); ve();
}

export function thoat({ im = false } = {}) {
  if (!S.id) return;
  if (S.suaChu) ketThucSuaChu();
  const L = LICH.get(S.id); const coDoi = L && L.vt > 0;
  S.ac?.abort(); S.ac = null;
  S.lop?.remove();
  S.d?.el.classList.remove('dang-sua');
  if (S.ifr && S.tl) {
    // bỏ iframe đã sửa (đặt lại srcdoc cùng giá trị không nạp lại) → ảo hoá dựng iframe mới từ HTML đã lưu; bản sửa dở nằm trong lịch sử
    if (coDoi && S.d.iframe === S.ifr) { S.ifr.remove(); S.d.iframe = null; S.d.el.classList.remove('song'); }
    else { S.tl.querySelectorAll('[data-bs-sua]').forEach((n) => n.remove()); S.tl.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable')); }
  }
  Object.assign(S, { id: null, f: null, d: null, ifr: null, tl: null, lop: null, sel: null, hover: null, keo: null, suaChu: null });
  document.body.classList.remove('dang-sua');
  $('#nut-sua')?.classList.remove('bat');
  $('#bang-sua').hidden = true;
  C.veTatCa(false); C.henAo();
  if (coDoi && !im) C.toast('Đã thoát Sửa. Bản sửa chưa lưu vẫn giữ — chọn khung, bấm E để sửa tiếp.');
}

// app.js gọi mỗi khi view đổi (apView — kể cả đổi section/chế độ): cập nhật cỡ tay nắm theo zoom, thoát nếu khung đã bị gỡ
export function khiDoiView() {
  if (!S.id || !S.lop) return;
  queueMicrotask(() => {
    if (!S.id) return;
    if (!S.d.el.isConnected || (S.ifr && S.d.iframe !== S.ifr)) { thoat({ im: true }); return; }
    const z = C.st.view.z; if (z !== S.z) { S.z = z; S.lop.style.setProperty('--z', z); }
  });
}

// ---------- lịch sử (theo khung) ----------
function duongCua(el) {
  const ra = [];
  if (!el || !S.tl) return ra;
  for (let n = el; n && n !== S.tl.body; n = n.parentElement) { if (!n.parentElement) return []; ra.unshift([...n.parentElement.children].indexOf(n)); }
  return ra;
}
function theoDuong(ds) {
  let n = S.tl?.body; if (!n || !ds) return null;
  for (const i of ds) { n = n.children[i]; if (!n) return null; }
  return n;
}
const chup = () => ({ html: S.tl.body.innerHTML, bs: S.tl.body.getAttribute('style'), duong: duongCua(S.sel) });
function apDung(t) {
  S.tl.body.innerHTML = t.html;
  if (t.bs == null) S.tl.body.removeAttribute('style'); else S.tl.body.setAttribute('style', t.bs);
  S.sel = theoDuong(t.duong); S.hover = null;
  veBang(); ve();
}
function ghiLich(moTa) {
  const L = LICH.get(S.id); if (!L) return;
  L.ds.length = L.vt + 1;
  L.ds.push({ ...chup(), moTa });
  // giới hạn bộ nhớ: tối đa 80 bước và ~16 MB chữ mỗi khung (màn chụp DOM RN-web rất nặng)
  // bước cũ bị cắt thì dồn mô tả vào bước kế (nhật ký gửi Claude vẫn đủ, chỉ không ⌘Z về được nữa)
  let tong = L.ds.reduce((a, x) => a + x.html.length, 0);
  while (L.ds.length > 2 && (L.ds.length > 80 || tong > 8e6)) {
    const [bo] = L.ds.splice(1, 1); tong -= bo.html.length; L.vt--;
    L.ds[1].truoc = [...(bo.truoc || []), bo.moTa, ...(L.ds[1].truoc || [])];
  }
  // trần chung mọi khung: bỏ lịch sử của khung khác (không đang sửa) khi tổng > 24e6 ký tự
  let chung = 0; for (const x of LICH.values()) for (const t of x.ds) chung += t.html.length;
  for (const [k, x] of LICH) { if (chung <= 24e6) break; if (k === S.id) continue; for (const t of x.ds) chung -= t.html.length; LICH.delete(k); }
  L.vt = L.ds.length - 1;
  veBang(); ve();
}
function hoanTac(d) {
  const L = LICH.get(S.id); if (!L) return;
  const vt = L.vt + d; if (vt < 0 || vt >= L.ds.length) { C.toast(d < 0 ? 'Hết bước để hoàn tác.' : 'Không còn bước để làm lại.'); return; }
  const moTa = d < 0 ? L.ds[L.vt].moTa : L.ds[vt].moTa;
  L.vt = vt; apDung(L.ds[vt]);
  C.toast(`${d < 0 ? 'Hoàn tác' : 'Làm lại'}: ${moTa}`);
}
const nhatKy = () => { const L = LICH.get(S.id); return L ? L.ds.slice(1, L.vt + 1).flatMap((x) => [...(x.truoc || []), x.moTa]) : []; };

// ---------- mô tả phần tử ----------
function tenEl(el) {
  if (!el) return '';
  const cls = [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
  return `${el.tagName.toLowerCase()}${cls}`;
}
function moTaEl(el) {
  const chu = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return `<${tenEl(el)}>${chu ? ` «${chu.length > 32 ? chu.slice(0, 31) + '…' : chu}»` : ''}${el.hasAttribute('data-toi') ? ` [data-toi=${el.getAttribute('data-toi')}]` : ''}`;
}

// ---------- vẽ lớp phủ ----------
function hop(el) { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }
function datHop(n, r) { n.style.display = 'block'; Object.assign(n.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` }); }
function ve() {
  if (!S.lop) return;
  const hv = S.lop.querySelector('.ls-hv'), ch = S.lop.querySelector('.ls-chon'), svg = S.lop.querySelector('.ls-do');
  if (!S.tl) { hv.style.display = ch.style.display = 'none'; return; }
  if (S.hover && S.hover !== S.sel && S.hover.isConnected && !S.keo && S.hover !== S.tl.documentElement) datHop(hv, hop(S.hover)); else hv.style.display = 'none';
  if (S.sel && S.sel.isConnected) {
    const r = hop(S.sel); datHop(ch, r);
    ch.classList.toggle('than-body', S.sel === S.tl.body);
    ch.querySelector('.ls-nhan').textContent = `${tenEl(S.sel)} · ${Math.round(r.width)}×${Math.round(r.height)}`;
  } else ch.style.display = 'none';
  // thước đo (giữ Alt, rê sang phần tử khác)
  let s = '';
  S.lop.querySelectorAll('.ls-nhan-do').forEach((n) => n.remove());
  if (S.alt && S.sel && S.hover && S.hover !== S.sel && S.hover.isConnected && !S.keo) {
    for (const [x1, y1, x2, y2] of thuocDo(hop(S.sel), hop(S.hover))) {
      const dai = Math.round(Math.hypot(x2 - x1, y2 - y1)); if (!dai) continue;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke"/>`;
      const n = document.createElement('span'); n.className = 'ls-nhan-do'; n.textContent = dai;
      n.style.left = `${(x1 + x2) / 2}px`; n.style.top = `${(y1 + y2) / 2}px`; S.lop.appendChild(n);
    }
  }
  svg.innerHTML = s;
}
// Các đoạn đo kiểu Figma giữa A (đang chọn) và B (đang rê)
function thuocDo(A, B) {
  const chua = (P, Q) => P.left <= Q.left + 0.5 && P.top <= Q.top + 0.5 && P.right >= Q.right - 0.5 && P.bottom >= Q.bottom - 0.5;
  const giua = (a0, a1, b0, b1) => { const t = Math.max(a0, b0), d = Math.min(a1, b1); return t <= d ? (t + d) / 2 : null; };
  const ra = [];
  if (chua(B, A) || chua(A, B)) {
    const [I, O] = chua(B, A) ? [A, B] : [B, A];
    const cy = I.top + I.height / 2, cx = I.left + I.width / 2;
    ra.push([O.left, cy, I.left, cy], [I.right, cy, O.right, cy], [cx, O.top, cx, I.top], [cx, I.bottom, cx, O.bottom]);
    return ra;
  }
  if (A.right <= B.left || B.right <= A.left) {
    const [L, R] = A.right <= B.left ? [A, B] : [B, A];
    const y = giua(A.top, A.bottom, B.top, B.bottom) ?? A.top + A.height / 2;
    ra.push([L.right, y, R.left, y]);
  }
  if (A.bottom <= B.top || B.bottom <= A.top) {
    const [T, D] = A.bottom <= B.top ? [A, B] : [B, A];
    const x = giua(A.left, A.right, B.left, B.right) ?? A.left + A.width / 2;
    ra.push([x, T.bottom, x, D.top]);
  }
  if (!ra.length) { // chồng lấn: lệch mép trái và mép trên
    const y = Math.max(A.top, B.top) + 6, x = Math.max(A.left, B.left) + 6;
    ra.push([Math.min(A.left, B.left), y, Math.max(A.left, B.left), y], [x, Math.min(A.top, B.top), x, Math.max(A.top, B.top)]);
  }
  return ra;
}

// ---------- chọn ----------
function chon(el) {
  S.moVet = false;
  if (S.suaChu && el !== S.suaChu) ketThucSuaChu();
  if (el === S.tl?.documentElement) el = S.tl.body;
  S.sel = el || null; veBang(); ve();
}
function chonCha() { if (S.sel && S.sel !== S.tl.body && S.sel.parentElement) chon(S.sel.parentElement); }

function diChuot(e) {
  S.alt = e.altKey;
  if (S.keo) { if (S.keo.loai !== 'co' && e.buttons === 0) { thaKeo(true); return; } keoDi(e); return; }
  const t = e.target === S.tl.documentElement ? null : e.target;
  if (t !== S.hover || S.alt) { S.hover = t; ve(); }
}
function nhanChuot(e) {
  if (e.button !== 0) return;
  if (S.suaChu) { if (S.suaChu.contains(e.target)) return; ketThucSuaChu(); }
  let t = e.target; if (t === S.tl.documentElement) t = S.tl.body;
  const svg = t.closest?.('svg'); if (svg) { let n = svg; while (n.parentElement?.closest('svg')) n = n.parentElement.closest('svg'); t = n; } // icon: chọn cả svg, không chọn path
  chon(t);
  S.keo = { loai: 'cho', el: t, sx: e.clientX, sy: e.clientY, alt: e.altKey };
}

// ---------- kéo: đổi thứ tự / sang cha khác / dịch tự do ----------
const LA = /^(BUTTON|A|INPUT|TEXTAREA|SELECT|LABEL|IMG|SVG|PATH|VIDEO|CANVAS|PICTURE)$/i;
// Cha đích hợp lệ: cha hiện tại luôn được; khối khác phải là flex/grid có ≥2 con thấy được (màn chụp DOM RN-web: div nào cũng flex)
// và con trỏ nằm ở VÙNG GIỮA của khối (mép ngoài = chèn trước/sau khối đó ở cấp trên, kiểu Webflow).
function laCho(a, el, x, y) {
  if (LA.test(a.tagName) || a.closest('svg,button,a')) return false;
  if (a === el.parentElement) return true;
  if (a === S.tl.body) return false;
  if (!/flex|grid/.test(getComputedStyle(a).display)) return false;
  if ([...a.children].filter((c) => c !== el && c.getBoundingClientRect().width * c.getBoundingClientRect().height > 64).length < 2) return false;
  const r = a.getBoundingClientRect(); const lx = Math.min(24, r.width / 4), ly = Math.min(24, r.height / 4);
  return x > r.left + lx && x < r.right - lx && y > r.top + ly && y < r.bottom - ly;
}
function huongCua(a) {
  const cs = getComputedStyle(a);
  if (/grid/.test(cs.display)) return 'luoi';
  if (/flex/.test(cs.display)) return cs.flexDirection.startsWith('column') ? 'doc' : cs.flexWrap === 'nowrap' ? 'ngang' : 'luoi';
  return 'doc';
}
function timCho(x, y, el) {
  const ds = S.tl.elementsFromPoint(x, y);
  const t = ds.find((n) => !el.contains(n) && n !== S.tl.documentElement && !n.hasAttribute('data-bs-sua')) || S.tl.body;
  for (let a = t; a && a !== S.tl.documentElement; a = a.parentElement) {
    if (!laCho(a, el, x, y)) continue;
    const huong = huongCua(a);
    const con = [...a.children].filter((c) => c !== el && !/^(STYLE|SCRIPT|LINK|META)$/.test(c.tagName) && !/absolute|fixed/.test(getComputedStyle(c).position) && c.getBoundingClientRect().width + c.getBoundingClientRect().height > 0);
    let ref = null;
    for (const c of con) {
      const r = c.getBoundingClientRect();
      const truoc = huong === 'doc' ? y < r.top + r.height / 2 : huong === 'ngang' ? x < r.left + r.width / 2 : y < r.top || (y <= r.bottom && x < r.left + r.width / 2);
      if (truoc) { ref = c; break; }
    }
    return { cha: a, ref, huong, con };
  }
  return null;
}
function veVach(cho) {
  const v = S.lop.querySelector('.ls-vach'), kc = S.lop.querySelector('.ls-cho');
  if (!cho) { v.style.display = kc.style.display = 'none'; return; }
  datHop(kc, hop(cho.cha));
  const ngang = cho.huong !== 'doc';
  let r;
  if (cho.ref) { const c = hop(cho.ref); r = ngang ? { left: c.left - 3, top: c.top, width: 0, height: c.height } : { left: c.left, top: c.top - 3, width: c.width, height: 0 }; }
  else if (cho.con.length) { const c = hop(cho.con.at(-1)); r = ngang ? { left: c.right + 3, top: c.top, width: 0, height: c.height } : { left: c.left, top: c.bottom + 3, width: c.width, height: 0 }; }
  else { const c = hop(cho.cha); r = { left: c.left + 8, top: c.top + 8, width: Math.max(0, c.width - 16), height: 0 }; }
  datHop(v, r); v.classList.toggle('ngang', !ngang);
}
function dichCu(el) {
  const v = (el.style.translate || getComputedStyle(el).translate || '').trim();
  if (!v || v === 'none') return [0, 0];
  const r = el.getBoundingClientRect(); // % của translate tính theo cỡ chính phần tử
  const [a, b] = v.split(/\s+/).map((x, i) => (x.endsWith('%') ? (parseFloat(x) / 100) * (i ? r.height : r.width) : parseFloat(x)) || 0);
  return [a || 0, b || 0];
}
function keoDi(e) {
  const k = S.keo; const dx = e.clientX - k.sx, dy = e.clientY - k.sy;
  if (k.loai === 'cho') {
    if (Math.abs(dx) + Math.abs(dy) < 5 || k.el === S.tl.body) return;
    const nut = k.el.parentElement?.closest('button,a,[role=button],[data-toi]'); // kéo chữ/icon trong nút = kéo cả nút
    if (nut && nut !== S.tl.body) { k.el = nut; chon(nut); }
    k.loai = k.alt || e.altKey ? 'tudo' : 'doi';
    if (k.loai === 'tudo') { k.goc = dichCu(k.el); k.dichGoc = k.el.style.translate; } else { k.opa = k.el.style.opacity; k.el.style.opacity = '0.4'; }
    S.hover = null;
  }
  if (k.loai === 'tudo') {
    const nx = s4(k.goc[0] + dx), ny = s4(k.goc[1] + dy);
    k.el.style.translate = `${nx}px ${ny}px`; // luôn px tường minh (để '' sẽ trả về translate của stylesheet)
    k.moi = [nx, ny];
    const so = S.lop.querySelector('.ls-so'); const r = hop(k.el);
    so.textContent = `x ${nx >= 0 ? '+' : ''}${nx} · y ${ny >= 0 ? '+' : ''}${ny}`; Object.assign(so.style, { display: 'block', left: `${r.left + r.width / 2}px`, top: `${r.bottom + 6}px` });
    ve();
  } else { k.cho = timCho(e.clientX, e.clientY, k.el); veVach(k.cho); }
}
function thaKeo(huy = false) {
  const k = S.keo; S.keo = null;
  if (!k || !S.tl) return;
  S.lop.querySelector('.ls-so').style.display = 'none';
  if (huy === true) { // thả ngoài khung: trả lại như trước khi kéo
    if (k.loai === 'tudo') k.el.style.translate = k.dichGoc;
    if (k.loai === 'doi') k.el.style.opacity = k.opa || '';
    if (!k.el.getAttribute('style')) k.el.removeAttribute('style');
    veVach(null); ve(); C.toast('Đã huỷ lượt kéo (thả ngoài khung).'); return;
  }
  if (k.loai === 'tudo' && k.moi && (k.moi[0] !== k.goc[0] || k.moi[1] !== k.goc[1])) ghiLich(`Dịch tự do ${moTaEl(k.el)} (translate ${k.moi[0]}px, ${k.moi[1]}px)`);
  if (k.loai === 'doi') {
    k.el.style.opacity = k.opa || ''; if (!k.el.getAttribute('style')) k.el.removeAttribute('style');
    veVach(null);
    const c = k.cho;
    if (c && !(c.cha === k.el.parentElement && (c.ref ? c.ref === k.el.nextElementSibling : !k.el.nextElementSibling))) {
      const chaCu = k.el.parentElement;
      c.cha.insertBefore(k.el, c.ref || null);
      const vt = [...c.cha.children].indexOf(k.el) + 1, n = c.cha.children.length;
      ghiLich(c.cha === chaCu ? `Kéo ${moTaEl(k.el)} đổi thứ tự trong <${tenEl(c.cha)}> → vị trí ${vt}/${n}` : `Kéo ${moTaEl(k.el)} từ <${tenEl(chaCu)}> sang <${tenEl(c.cha)}> (vị trí ${vt}/${n})`);
    }
  }
  ve();
}

// ---------- đổi kích thước (tay nắm trên lớp phủ ở trang cha) ----------
function batDauCo(e) {
  const tay = e.target.closest('.tay'); if (!tay || !S.sel || !S.tl) return;
  e.preventDefault(); e.stopPropagation(); // không để bàn vẽ coi là kéo khung
  const el = S.sel; const r = el.getBoundingClientRect(); const h = tay.dataset.h;
  const k = { loai: 'co', el, h, sx: e.clientX, sy: e.clientY, w0: r.width, h0: r.height, z: C.st.view.z, phai: r.right, duoi: r.bottom };
  S.keo = k;
  const chuanBi = () => { // lần di đầu tiên: cố định cỡ theo border-box (w0/h0 đo bằng border-box), thôi co giãn flex
    k.daDi = true;
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    if (getComputedStyle(el).boxSizing !== 'border-box') el.style.boxSizing = 'border-box';
    if (el.parentElement && /flex/.test(getComputedStyle(el.parentElement).display)) el.style.flex = 'none';
  }; tay.setPointerCapture(e.pointerId);
  const di = (ev) => {
    const b = ev.shiftKey ? 8 : 4;
    const dx = (ev.clientX - k.sx) / k.z, dy = (ev.clientY - k.sy) / k.z;
    if (!k.daDi) { if (Math.abs(dx) + Math.abs(dy) < 2) return; chuanBi(); }
    if (/[ew]/.test(h)) { k.w = Math.max(4, s4(k.w0 + (h.includes('e') ? dx : -dx), b)); el.style.width = `${k.w}px`; el.style.maxWidth = 'none'; }
    if (/[ns]/.test(h)) { k.hh = Math.max(4, s4(k.h0 + (h.includes('s') ? dy : -dy), b)); el.style.height = `${k.hh}px`; }
    if (/[wn]/.test(h)) { // kéo mép trái/trên: bù translate để mép đối diện đứng yên (bố cục luôn nở về phải/dưới)
      const t0 = k.t0 || (k.t0 = dichCu(el)); const r1 = el.getBoundingClientRect();
      const tx = h.includes('w') ? t0[0] + (k.phai - r1.right) : t0[0], ty = h.includes('n') ? t0[1] + (k.duoi - r1.bottom) : t0[1];
      k.t0 = [tx, ty]; el.style.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
    }
    const r2 = hop(el); const so = S.lop.querySelector('.ls-so');
    so.textContent = `${Math.round(r2.width)} × ${Math.round(r2.height)}`; Object.assign(so.style, { display: 'block', left: `${r2.left + r2.width / 2}px`, top: `${r2.bottom + 6}px` });
    ve();
  };
  const xong = () => {
    tay.removeEventListener('pointermove', di); tay.removeEventListener('pointerup', xong); tay.removeEventListener('pointercancel', xong);
    S.keo = null; S.lop.querySelector('.ls-so').style.display = 'none';
    if (k.w || k.hh) { const r2 = hop(el); ghiLich(`Đổi cỡ ${moTaEl(el)} → ${Math.round(r2.width)}×${Math.round(r2.height)}px`); } else ve();
  };
  tay.addEventListener('pointermove', di); tay.addEventListener('pointerup', xong); tay.addEventListener('pointercancel', xong);
}

// ---------- sửa chữ ----------
// Chỉ sửa chữ phần tử «chữ»: không chứa icon/ảnh/nút/liên kết con và mọi con đều inline — tránh gõ đè cả cây con.
function suaChuDuoc(el) {
  if (!(el.textContent || '').trim() || el.closest('svg')) return false;
  for (const n of el.querySelectorAll('*')) {
    if (/^(SVG|IMG|BUTTON|A|INPUT|TEXTAREA|SELECT|VIDEO|CANVAS|PICTURE)$/i.test(n.tagName) || n.hasAttribute('data-toi')) return false;
    if (!/^inline$|^contents$/.test(getComputedStyle(n).display) && n.tagName !== 'BR') return false;
  }
  return true;
}
function batSuaChu(el) {
  if (!el || el === S.tl.body) return;
  if (!suaChuDuoc(el)) { C.toast('Chỉ sửa chữ được phần tử chứa chữ (không chứa icon/nút con) — bấm đúp ngay vào dòng chữ.', true); return; }
  if (S.suaChu) ketThucSuaChu();
  chon(el);
  S.suaChu = el; S.chuCu = el.textContent;
  try { el.setAttribute('contenteditable', 'plaintext-only'); } catch { el.setAttribute('contenteditable', 'true'); }
  try { S.ifr.contentWindow.focus(); } catch { /* bỏ qua */ }
  el.focus();
  const sel = S.tl.getSelection(); sel.selectAllChildren(el);
  el.addEventListener('blur', ketThucSuaChu, { once: true });
  veBang();
}
function ketThucSuaChu() {
  const el = S.suaChu; if (!el) return;
  S.suaChu = null;
  el.removeAttribute('contenteditable');
  try { S.tl.getSelection().removeAllRanges(); } catch { /* bỏ qua */ }
  const cu = (S.chuCu || '').replace(/\s+/g, ' ').trim(), moi = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (cu !== moi) ghiLich(`Sửa chữ <${tenEl(el)}>: «${cu.slice(0, 60)}» → «${moi.slice(0, 60)}»`); else ve();
  veBang();
}

// ---------- xoá / nhân bản ----------
function xoaEl() {
  const el = S.sel; if (!el || el === S.tl.body) return;
  const toi = [...(el.matches('[data-toi]') ? [el] : []), ...el.querySelectorAll('[data-toi]')].map((n) => n.getAttribute('data-toi'));
  const cha = el.parentElement; const mo = moTaEl(el);
  el.remove(); S.sel = cha; ghiLich(`Xoá ${mo}`);
  if (toi.length) C.toast(`Đã xoá cả nút liên kết sang ${toi.join(', ')} — ⌘Z để lấy lại.`, true);
}
function nhanBan() {
  const el = S.sel; if (!el || el === S.tl.body) return;
  const ban = el.cloneNode(true); // giữ nguyên data-toi (nhân bản giữ đích)
  const doi = new Map(); const hau = Math.random().toString(36).slice(2, 6);
  for (const n of [ban, ...ban.querySelectorAll('[id]')]) if (n.id) { const m = `${n.id}-${hau}`; doi.set(n.id, m); n.id = m; }
  if (doi.size) for (const n of [ban, ...ban.querySelectorAll('*')]) for (const a of [...n.attributes]) {
    let v = a.value, moi = v;
    for (const [c, m] of doi) { moi = moi.split(`url(#${c})`).join(`url(#${m})`); if ((a.name === 'href' || a.name === 'xlink:href') && moi === `#${c}`) moi = `#${m}`; if ((a.name === 'for' || a.name === 'aria-labelledby' || a.name === 'aria-describedby') && moi === c) moi = m; }
    if (moi !== v) n.setAttribute(a.name, moi);
  }
  el.after(ban); S.sel = ban; ghiLich(`Nhân bản ${moTaEl(el)}`);
}

// ---------- phím ----------
function phim(e) {
  if (!$('#lop-play').hidden || !$('#lop-xem').hidden || !$('#lop-cai-dat').hidden) return;
  const go = e.target?.closest?.('input,textarea,select');
  const mod = e.metaKey || e.ctrlKey; const k = e.key;
  if (!S.id) {
    if ((k === 'e' || k === 'E') && !mod && !e.altKey && !go) { e.preventDefault(); e.stopImmediatePropagation(); batSua(); }
    return;
  }
  if (S.suaChu) {
    if ((k === 'Enter' && !e.shiftKey) || k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); ketThucSuaChu(); }
    return; // còn lại để gõ chữ
  }
  if (go) return;
  if (k === 'Alt') { if (!S.alt) { S.alt = true; ve(); } return; }
  let xu = true;
  if (mod && k.toLowerCase() === 'z') hoanTac(e.shiftKey ? 1 : -1);
  else if (mod && k.toLowerCase() === 'y') hoanTac(1);
  else if (mod && k.toLowerCase() === 'd') nhanBan();
  else if (k === 'Escape') { if (S.sel) chon(null); else thoat(); }
  else if (k === 'ArrowUp' && !mod) chonCha();
  else if (k === 'Delete' || k === 'Backspace') xoaEl();
  else if ((k === 'e' || k === 'E') && !mod) thoat();
  else if (k === 'Enter' && S.sel) batSuaChu(S.sel);
  else xu = false;
  if (xu) { e.preventDefault(); e.stopImmediatePropagation(); }
}
function phimNha(e) { if (e.key === 'Alt' && S.alt) { S.alt = false; ve(); } }

// ---------- bảng thuộc tính ----------
const o = (p, nhan, tieu) => `<label class="bs-o" title="${tieu}"><span class="keo-so" data-p="${p}">${nhan}</span><input type="number" data-p="${p}" step="1"></label>`;
function taoBang() {
  const a = document.createElement('aside'); a.id = 'bang-sua'; a.hidden = true; a.setAttribute('aria-label', 'Chế độ Sửa');
  a.innerHTML = `
  <div class="dau-bang"><div><div class="phu">Chế độ Sửa · <span id="bs-khung"></span></div><b id="bs-ten">Bấm một phần tử trong khung</b></div><button type="button" id="bs-dong" class="nut-x" aria-label="Thoát Sửa (E)">×</button></div>
  <div id="bs-vet" class="bs-vet" aria-label="Cây phần tử"></div>
  <div class="hang"><button type="button" id="bs-lui" title="Hoàn tác (⌘Z)">↶ Hoàn tác</button><button type="button" id="bs-toi" title="Làm lại (⇧⌘Z)">↷ Làm lại</button><span id="bs-dem" class="phu"></span></div>
  <div id="bs-tt">
    <div class="bs-nhom"><b>Đệm (padding)</b><div class="bs-4">${o('paddingTop', '↑', 'Đệm trên')}${o('paddingRight', '→', 'Đệm phải')}${o('paddingBottom', '↓', 'Đệm dưới')}${o('paddingLeft', '←', 'Đệm trái')}</div></div>
    <div class="bs-nhom"><b>Lề (margin)</b><div class="bs-4">${o('marginTop', '↑', 'Lề trên')}${o('marginRight', '→', 'Lề phải')}${o('marginBottom', '↓', 'Lề dưới')}${o('marginLeft', '←', 'Lề trái')}</div></div>
    <div class="bs-nhom bs-2"><div><b>Khe (gap)</b>${o('gap', '⇹', 'Khoảng giữa các con (flex/grid)')}</div><div><b>Bo góc</b>${o('borderRadius', '◜', 'Bo góc')}</div></div>
    <div class="bs-nhom"><b>Màu chữ</b><div class="bs-mau" data-m="color"></div></div>
    <div class="bs-nhom"><b>Màu nền</b><div class="bs-mau" data-m="background"></div></div>
    <div class="bs-nhom bs-2"><div><b>Cỡ chữ</b>${o('fontSize', 'Aa', 'Cỡ chữ (px)')}</div><div><b>Độ đậm</b><select data-p="fontWeight"><option value="400">400 Thường</option><option value="500">500</option><option value="600">600 Vừa</option><option value="700">700 Đậm</option><option value="800">800 Rất đậm</option></select></div></div>
    <div class="bs-nhom"><b>Bóng</b><select id="bs-bong"><option value="">— giữ nguyên —</option><option value="none">Không bóng</option>${BONG.map(([, t], i) => `<option value="${i}">${t}</option>`).join('')}</select></div>
    <div class="bs-nhom" id="bs-flex"><b>Căn chỉnh (flex)</b>
      <div class="bs-3"><select data-p="flexDirection" title="Hướng"><option value="row">→ Ngang</option><option value="column">↓ Dọc</option><option value="row-reverse">← Ngang ngược</option><option value="column-reverse">↑ Dọc ngược</option></select>
      <select data-p="justifyContent" title="Dàn theo trục chính"><option value="flex-start">Đầu</option><option value="center">Giữa</option><option value="flex-end">Cuối</option><option value="space-between">Dàn đều mép</option><option value="space-around">Dàn đều</option><option value="normal">Mặc định</option></select>
      <select data-p="alignItems" title="Căn trục phụ"><option value="stretch">Kéo giãn</option><option value="flex-start">Đầu</option><option value="center">Giữa</option><option value="flex-end">Cuối</option><option value="baseline">Chân chữ</option><option value="normal">Mặc định</option></select></div></div>
    <div class="hang"><button type="button" id="bs-nhan" title="Nhân bản (⌘D) — giữ data-toi">⧉ Nhân bản</button><button type="button" id="bs-xoa" class="nguy" title="Xoá (⌫)">Xoá phần tử</button></div>
  </div>
  <details id="bs-nk"><summary class="phu">Những gì đã sửa (<span id="bs-so-nk">0</span>)</summary><ol id="bs-ds-nk"></ol></details>
  <div class="bs-ket">
    <button type="button" id="bs-luu" class="nut-chinh">Lưu thành biến thể</button>
    <button type="button" id="bs-muot">✨ Làm mượt bằng Claude</button>
    <button type="button" id="bs-ap">Áp vào khung này</button>
    <button type="button" id="bs-thoat">Thoát Sửa <kbd>E</kbd></button>
  </div>
  <p class="phu bs-goi-y">Rê: viền xanh · Bấm: chọn · ↑: chọn cha · Esc: bỏ chọn · Kéo: đổi thứ tự / sang khối khác · Alt+kéo: dịch tự do · Alt+rê: đo khoảng cách · Tay nắm: đổi cỡ (Shift = bước 8) · Bấm đúp/Enter: sửa chữ · ⌘D nhân bản · ⌫ xoá · ⌘Z / ⇧⌘Z</p>`;
  document.body.appendChild(a);
  $('#bs-dong').onclick = () => thoat();
  $('#bs-thoat').onclick = () => thoat();
  $('#bs-lui').onclick = () => hoanTac(-1);
  $('#bs-toi').onclick = () => hoanTac(1);
  $('#bs-nhan').onclick = nhanBan;
  $('#bs-xoa').onclick = xoaEl;
  $('#bs-luu').onclick = luuBienThe;
  $('#bs-ap').onclick = apVaoKhung;
  $('#bs-muot').onclick = lamMuot;
  // ô số: gõ → áp ngay; xong (change) → ghi lịch sử
  a.querySelectorAll('input[data-p]').forEach((i) => {
    i.addEventListener('input', () => datSo(i.dataset.p, i.value));
    i.addEventListener('change', () => ghiSo(i.dataset.p));
  });
  // kéo nhãn để chỉnh số (kiểu Figma); Shift = bước 4
  a.querySelectorAll('.keo-so').forEach((n) => n.addEventListener('pointerdown', (e) => {
    const i = n.parentElement.querySelector('input'); if (!S.sel || i.disabled) return;
    e.preventDefault(); n.setPointerCapture(e.pointerId);
    const v0 = parseFloat(i.value) || 0, x0 = e.clientX; let doi = false;
    const di = (ev) => { const b = ev.shiftKey ? 4 : 1; const v = Math.max(n.dataset.p.startsWith('margin') ? -999 : 0, Math.round((v0 + (ev.clientX - x0) / 2) / b) * b); if (String(v) !== i.value) { i.value = v; datSo(n.dataset.p, v); doi = true; } };
    const xong = () => { n.removeEventListener('pointermove', di); n.removeEventListener('pointerup', xong); n.removeEventListener('pointercancel', xong); if (doi) ghiSo(n.dataset.p); };
    n.addEventListener('pointermove', di); n.addEventListener('pointerup', xong); n.addEventListener('pointercancel', xong);
  }));
  a.querySelectorAll('select[data-p]').forEach((s) => s.addEventListener('change', () => {
    if (!S.sel) return; S.sel.style[s.dataset.p] = s.value; ghiLich(`Đổi ${s.dataset.p} của ${moTaEl(S.sel)} → ${s.value}`);
  }));
  $('#bs-bong').addEventListener('change', (e) => {
    const v = e.target.value; if (!S.sel || v === '') return;
    if (v === 'none') S.sel.style.boxShadow = 'none';
    else { const [k, t, gt] = BONG[+v]; S.sel.style.boxShadow = k && S.bong.has(k) ? `var(--${k})` : gt; ghiLich(`Đổi bóng ${moTaEl(S.sel)} → ${t}`); return; }
    ghiLich(`Bỏ bóng ${moTaEl(S.sel)}`);
  });
  a.addEventListener('click', (e) => {
    const m = e.target.closest('.o-mau'); if (!m || !S.sel) return;
    const p = m.parentElement.dataset.m; const v = m.dataset.v;
    if (p === 'background') { S.sel.style.background = v; } else S.sel.style.color = v;
    ghiLich(`Đổi ${p === 'color' ? 'màu chữ' : 'màu nền'} ${moTaEl(S.sel)} → ${m.title}`);
  });
  $('#bs-vet').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && b.dataset.d) chon(theoDuong(JSON.parse(b.dataset.d))); });
}
const AM_DUOC = /^margin/;
function datSo(p, v) {
  if (!S.sel) return;
  const n = parseFloat(v); if (!Number.isFinite(n) || (n < 0 && !AM_DUOC.test(p))) return;
  if (S.soTruoc?.p !== p || S.soTruoc.el !== S.sel) S.soTruoc = { el: S.sel, p, v: S.sel.style[p] };
  S.sel.style[p] = `${n}px`; ve();
}
const TEN_P = { paddingTop: 'đệm trên', paddingRight: 'đệm phải', paddingBottom: 'đệm dưới', paddingLeft: 'đệm trái', marginTop: 'lề trên', marginRight: 'lề phải', marginBottom: 'lề dưới', marginLeft: 'lề trái', gap: 'khe', borderRadius: 'bo góc', fontSize: 'cỡ chữ' };
function ghiSo(p) {
  const t = S.soTruoc; S.soTruoc = null;
  if (t && t.p === p && t.el?.isConnected && t.el.style[p] !== t.v) ghiLich(`Đổi ${TEN_P[p] || p} ${moTaEl(t.el)} → ${t.el.style[p]}`); else veBang();
}

function veMau() {
  const trongMan = new Map(); // màu đang dùng trong màn (biến :root + mã hex trong <style>) ngoài bảng Clay
  for (const [hx, ten] of S.varMau) trongMan.set(hx, ten);
  const txt = [...(S.tl?.querySelectorAll('style:not([data-bs-sua])') || [])].map((s) => s.textContent).join('\n');
  const dem = new Map(); for (const m of txt.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) { const hx = sangHex(m[0]); if (hx) dem.set(hx, (dem.get(hx) || 0) + 1); }
  [...dem.entries()].sort((p, q) => q[1] - p[1]).slice(0, 12).forEach(([hx]) => { if (!trongMan.has(hx)) trongMan.set(hx, ''); });
  const ds = TOKEN.map(([t, hx]) => [t, hx]);
  for (const [hx, v] of trongMan) if (!ds.some(([, h]) => h === hx)) ds.push([`Trong màn${v ? ' ' + v : ''}`, hx]);
  for (const hop of document.querySelectorAll('#bang-sua .bs-mau')) {
    const nen = hop.dataset.m === 'background';
    hop.innerHTML = (nen ? '<button type="button" class="o-mau trong" data-v="transparent" title="Trong suốt"></button>' : '') + ds.map(([t, hx]) => {
      const v = S.varMau.has(hx) ? `var(${S.varMau.get(hx)})` : hx;
      return `<button type="button" class="o-mau" data-hx="${hx}" data-v="${v}" title="${t} ${hx}${S.varMau.has(hx) ? ' · ' + S.varMau.get(hx) : ''}" style="background:${hx}"></button>`;
    }).join('');
  }
}

function veBang() {
  if (!S.id) return;
  const L = LICH.get(S.id); const nk = nhatKy();
  $('#bs-lui').disabled = !L || L.vt <= 0; $('#bs-toi').disabled = !L || L.vt >= L.ds.length - 1;
  $('#bs-dem').textContent = nk.length ? `${nk.length} thay đổi` : 'chưa sửa gì';
  $('#bs-so-nk').textContent = nk.length;
  $('#bs-ds-nk').innerHTML = ''; for (const t of nk) { const li = document.createElement('li'); li.textContent = t; $('#bs-ds-nk').appendChild(li); }
  $('#bs-luu').disabled = !nk.length; $('#bs-ap').disabled = !nk.length; $('#bs-muot').disabled = !nk.length;
  const el = S.sel && S.sel.isConnected ? S.sel : null;
  $('#bs-tt').classList.toggle('tat', !el);
  const vet = $('#bs-vet'); vet.innerHTML = '';
  if (!el) { $('#bs-ten').textContent = S.tl ? 'Bấm một phần tử trong khung' : 'Đang mở khung…'; return; }
  const r = el.getBoundingClientRect();
  $('#bs-ten').textContent = `${moTaEl(el)} · ${Math.round(r.width)}×${Math.round(r.height)}`;
  const chuoi = []; for (let n = el; n && n !== S.tl.documentElement; n = n.parentElement) chuoi.unshift(n);
  const rut = chuoi.length > 7; // cây sâu (màn chụp DOM RN-web): body › … › 5 cấp gần nhất; bấm … để mở đủ
  chuoi.forEach((n, i) => {
    if (rut && !S.moVet && i > 0 && i < chuoi.length - 5) { if (i === 1) { vet.append('›'); const r = document.createElement('button'); r.type = 'button'; r.className = 'rut'; r.textContent = `… ${chuoi.length - 6} cấp`; r.onclick = () => { S.moVet = true; veBang(); }; vet.appendChild(r); } return; }
    if (i) vet.append('›');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = tenEl(n); b.dataset.d = JSON.stringify(duongCua(n));
    if (n === el) b.className = 'bat'; vet.appendChild(b);
  });
  const cs = getComputedStyle(el);
  for (const i of document.querySelectorAll('#bs-tt input[data-p]')) {
    const p = i.dataset.p;
    const v = p === 'gap' ? cs.columnGap : p === 'borderRadius' ? cs.borderTopLeftRadius : cs[p];
    if (document.activeElement !== i) i.value = Math.round(parseFloat(v) || 0);
  }
  const laFlex = /flex/.test(cs.display), laLuoi = /grid/.test(cs.display);
  $('#bs-flex').hidden = !laFlex;
  document.querySelector('#bs-tt input[data-p="gap"]').disabled = !(laFlex || laLuoi);
  for (const s of document.querySelectorAll('#bs-tt select[data-p]')) s.value = cs[s.dataset.p];
  const fw = $('#bs-tt select[data-p="fontWeight"]'); fw.value = String(Math.round((parseInt(cs.fontWeight, 10) || 400) / 100) * 100);
  const b = $('#bs-bong'); const bh = el.style.boxShadow; b.value = bh === 'none' ? 'none' : String(BONG.findIndex(([k, , gt]) => bh === chuanBong(gt) || (k && bh === `var(--${k})`)));
  if (b.value === '-1' || !b.value) b.value = '';
  const mc = sangHex(cs.color), mn = sangHex(cs.backgroundColor);
  document.querySelectorAll('#bang-sua .bs-mau[data-m="color"] .o-mau').forEach((n) => n.classList.toggle('bat', n.dataset.hx === mc));
  document.querySelectorAll('#bang-sua .bs-mau[data-m="background"] .o-mau').forEach((n) => n.classList.toggle('bat', n.dataset.hx ? n.dataset.hx === mn : mn === 'transparent'));
}

const BONG_CHUAN = new Map();
function chuanBong(gt) { // trình duyệt chuẩn hoá chuỗi box-shadow (màu → rgba, thứ tự) — so sau khi chuẩn hoá
  if (!BONG_CHUAN.has(gt)) { const t = document.createElement('i'); t.style.boxShadow = gt; BONG_CHUAN.set(gt, t.style.boxShadow); }
  return BONG_CHUAN.get(gt);
}

// ---------- lưu / áp / làm mượt ----------
function htmlDaSua() {
  const goc = S.tl.documentElement.cloneNode(true);
  goc.querySelectorAll('[data-bs-sua]').forEach((n) => n.remove());
  goc.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
  goc.querySelectorAll('[style=""]').forEach((n) => n.removeAttribute('style'));
  return C.lamSach('<!doctype html>\n' + goc.outerHTML);
}
function tomTat(ds) {
  const dem = { keo: 0, co: 0, chu: 0, khac: 0 };
  for (const t of ds) { if (/^(Kéo|Dịch)/.test(t)) dem.keo++; else if (/^Đổi cỡ/.test(t)) dem.co++; else if (/^Sửa chữ/.test(t)) dem.chu++; else dem.khac++; }
  return [dem.keo && `${dem.keo} kéo`, dem.co && `${dem.co} đổi cỡ`, dem.chu && `${dem.chu} sửa chữ`, dem.khac && `${dem.khac} chỉnh khác`].filter(Boolean).join(' · ');
}
function khungMoi(f, them) {
  const { w, h } = C.kichThuoc(f); const dot = 'sua' + Date.now().toString(36);
  return { id: `bt-${dot}-1`, loai: 'bien', goc: C.keyCua(f), cha: f.id, dot, k: 1, n: 1, w, h, x: 0, y: 0, ...them };
}
function luuBienThe() {
  if (!S.tl) return;
  const ds = nhatKy(); if (!ds.length) { C.toast('Chưa sửa gì.'); return; }
  const f = S.f; const html = htmlDaSua();
  const moi = khungMoi(f, { yTuong: `✎ Sửa tay: ${tomTat(ds)}`, html, tt: 'xong', nhan: 'Sửa tay', model: 'sửa tay', suaTay: ds });
  C.st.khung.push(moi);
  thoat({ im: true }); LICH.delete(f.id); // thoát trước để iframe gốc được trả về HTML đã lưu
  C.st.chon.clear(); C.st.chon.add(moi.id);
  C.veTatCa(); C.vuaMan([f.id, moi.id]); C.luuLai();
  C.toast(`Đã lưu thành biến thể mới cạnh «${C.tenCua(f)}» — khung gốc giữ nguyên.`);
}
function apVaoKhung() {
  const f = S.f; if (!S.tl || f.loai !== 'bien') return;
  const ds = nhatKy(); if (!ds.length) { C.toast('Chưa sửa gì.'); return; }
  const html = htmlDaSua();
  f.html = html; f.suaTay = [...(f.suaTay || []), ...ds];
  thoat({ im: true }); LICH.delete(f.id); // thoát trước để iframe gốc được trả về HTML đã lưu
  C.veTatCa(false); C.luuLai();
  C.toast('Đã áp bản sửa vào khung biến thể này.');
}
const demToi = (html) => (html.match(/data-toi=["'][^"']+["']/g) || []).map((x) => x.slice(10, -1)).sort().join(',');
function loiLamMuot(sua, ds, w, h) {
  return `Thanh vừa SỬA TAY màn ở trên bằng chế độ Sửa (kéo thả, chỉnh số trực tiếp). Các thao tác theo thứ tự:
${ds.map((t, i) => `${i + 1}. ${t}`).join('\n')}

HTML sau khi sửa tay (khác HTML gốc ở trên đúng bằng các thao tác này):
\`\`\`html
${sua}
\`\`\`

Việc của bạn là LÀM MƯỢT bản sửa tay, không sáng tác lại:
- Giữ ý đồ bố cục Thanh vừa làm: thứ tự và nhóm phần tử, vị trí tương đối, kích thước, màu/bóng/bo góc đã chọn, chữ đã sửa, phần tử đã xoá hay nhân bản.
- Dọn cho đúng Clay gương và luật đo được: thay style inline vá víu (translate, width/height lẻ, margin bù) bằng bố cục sạch (flex/grid/gap, khoảng cách bội số 4) cho ra cùng kết quả nhìn thấy; căn thẳng hàng; tương phản ≥4.5:1; vùng bấm ≥44px; nhãn nút một dòng; không tràn khung.
- Giữ NGUYÊN mọi thuộc tính data-toi, đúng giá trị, trên đúng phần tử (kể cả bản nhân bản).
- Giữ đúng khung ${w}×${h}px.
Định dạng trả lời bắt buộc: dòng đầu "Ý TƯỞNG: <nhãn ngắn ≤8 chữ, nói điều đã dọn>", rồi một khối \`\`\`html … \`\`\`. Không viết gì khác.`;
}
function mockMuot(html) {
  return html.replace('</head>', '<style>body *{transition:none}</style></head>')
    .replace(/(<body[^>]*>)/, '$1<div style="position:absolute;right:16px;bottom:16px;z-index:9;background:#0f6b5c;color:#fff;font:700 14px Inter,system-ui,sans-serif;padding:8px 14px;border-radius:99px">Mock: đã làm mượt</div>');
}
async function lamMuot() {
  if (!S.tl) return;
  const ds = nhatKy(); if (!ds.length) { C.toast('Chưa sửa gì để làm mượt.'); return; }
  if (C.canKey()) return;
  const f = S.f; const sua = htmlDaSua();
  const moi = khungMoi(f, { yTuong: `✨ Làm mượt bản sửa tay: ${tomTat(ds)}`, html: sua, htmlSua: sua, suaTay: ds, tt: 'dang', tienDo: 'Đang gọi Claude…', nhan: 'Làm mượt', model: C.laMock() ? 'mock' : C.modelDung(), htmlGocSua: C.htmlCua(f), tenGocSua: C.tenCua(f) });
  C.st.khung.push(moi);
  thoat({ im: true }); LICH.delete(f.id); // thoát trước để iframe gốc được trả về HTML đã lưu
  C.st.chon.clear(); C.st.chon.add(f.id);
  C.veTatCa(); C.vuaMan([f.id, moi.id]);
  return chayLamMuot(moi);
}
// Gọi Claude: khối 1 = đúng ngữ cảnh của luồng biến thể (màn + HTML gốc, cache 1h) → đọc lại cache nếu vừa sinh biến thể cho màn này.
export async function chayLamMuot(f) {
  const cha = C.timKhung(f.cha);
  const htmlGoc = f.htmlGocSua || (cha && C.htmlCua(cha)); const ten = f.tenGocSua || (cha && C.tenCua(cha)); // HTML gốc ĐÚNG lúc sửa, không lấy cha hiện tại
  if (!htmlGoc || !f.htmlSua) { C.toast('Không còn khung gốc/bản sửa để làm mượt lại.', true); return false; }
  const ctl = new AbortController(); C.st.dangChay.set(f.id, ctl);
  f.tt = 'dang'; f.loi = ''; f.tienDo = 'Đang gọi Claude…'; f.model = C.laMock() ? 'mock' : C.modelDung(); C.veKhung(f); C.veBang();
  const batDau = Date.now(); let lan = 0;
  const moiChu = (txt, dung, nghi) => {
    if (Date.now() - lan < 400) return; lan = Date.now();
    f.dung = { ...dung }; const giay = Math.round((Date.now() - batDau) / 1000);
    f.tienDo = nghi && !txt ? `Claude đang nghĩ… ${giay} giây` : `Làm mượt · ${(txt.length / 1024).toFixed(1)} kB · ${giay} giây · ${dung.doc ? 'đọc cache ' + C.so(dung.doc) : 'ghi cache ' + C.so(dung.ghi)}`;
    C.veKhung(f);
  };
  try {
    const sys = heThong(await C.taiAssets());
    const user = [loiNguoiDung({ y: '', html: htmlGoc, w: f.w, h: f.h, ten, k: 1, n: 1 })[0], loiLamMuot(f.htmlSua, f.suaTay || [], f.w, f.h)];
    const { txt, lyDo, dung } = await (C.laMock()
      ? C.goiMock({ toan: `Ý TƯỞNG: Làm mượt (mock)\n\`\`\`html\n${mockMuot(f.htmlSua)}\n\`\`\``, signal: ctl.signal, moiChu, khoaCache: htmlGoc, vaoCache: Math.round((sys.length + user[0].length) / 3.2) })
      : C.goiClaude({ sys, user, signal: ctl.signal, moiChu }));
    f.dung = dung;
    const { nhan, html } = tachKetQua(txt);
    if (!html) throw new Error('Claude không trả về HTML — Thử lại.');
    f.html = C.lamSach(html); f.nhan = `Làm mượt${nhan ? ': ' + nhan : ''}`;
    f.tt = lyDo === 'max_tokens' ? 'loi' : 'xong';
    if (lyDo === 'max_tokens') f.loi = 'Bị cắt vì hết max_tokens — tăng trong ⚙ Cài đặt rồi Thử lại.';
    const truoc = demToi(f.htmlSua), sau = demToi(f.html);
    C.toast(truoc === sau ? `Đã làm mượt · cache ${dung.doc ? 'đọc ' + C.so(dung.doc) : 'ghi ' + C.so(dung.ghi)} token.` : `Đã làm mượt nhưng data-toi đổi (trước: ${truoc || 'không'} · sau: ${sau || 'không'}) — kiểm lại liên kết.`, truoc !== sau);
    if (f.tt === 'xong') { delete f.htmlSua; delete f.htmlGocSua; } // xong thì không cần giữ bản sửa (đỡ nặng localStorage); lỗi thì giữ để Thử lại
    return f.tt === 'xong';
  } catch (e) {
    f.tt = 'loi'; f.loi = e.name === 'AbortError' ? 'Đã dừng.' : e.message;
    return false;
  } finally {
    C.st.dangChay.delete(f.id); f.tienDo = ''; C.veTatCa(); C.luuLai();
  }
}
