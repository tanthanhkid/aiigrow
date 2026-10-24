/* M · «ánh men» — motion cho Clay A gốc gương. Thông số easing/spring: xem đầu M-anh-men.css. */
(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MEN = 'cubic-bezier(.2,.7,.2,1)', VAO = 'cubic-bezier(.4,0,.2,1)', BAY = 'cubic-bezier(.45,0,.25,1)';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const dt = $('.dt');
const IC = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets/';
const ICON_KHOA = IC + 'Locked/3D/locked_3d.png', ICON_MO = IC + 'Unlocked/3D/unlocked_3d.png';

/* ---------- dữ liệu mẫu theo Con ---------- */
const CON = {
  bin: { viec: [
      { id: 'b1', ten: 'Dọn phòng', phu: 'Nhiệm vụ', diem: 20 },
      { id: 'b2', ten: 'Đọc sách 30 phút', phu: 'Nhiệm vụ', diem: 15 },
      { id: 'b3', ten: 'Xin thêm 15 phút', phu: 'Yêu cầu · chơi máy', phut: 15 }],
    may: 'Windows · Roblox 35 phút', dung: 80, han: 120, vi: 340, khoa: false },
  na: { viec: [
      { id: 'n1', ten: 'Tập đàn 20 phút', phu: 'Nhiệm vụ', diem: 10 },
      { id: 'n2', ten: 'Xin thêm 15 phút', phu: 'Yêu cầu · xem hoạt hình', phut: 15 }],
    may: 'iPad · Vẽ tranh 15 phút', dung: 55, han: 120, vi: 180, khoa: false }
};
let cur = 'bin', last = null, toastHen = 0;

/* ---------- tiện ích ---------- */
const xong = a => a.finished.catch(() => {});
function fade(el, to, ms, easing = to ? MEN : 'ease-out') {
  const from = getComputedStyle(el).opacity;
  const a = el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing, fill: 'forwards' });
  return xong(a).then(() => { el.style.opacity = to; a.cancel(); });
}
async function doiChu(el, html) {           // cross-fade nội dung
  if (el.innerHTML === html) return;
  await fade(el, 0, 140); el.innerHTML = html; await fade(el, 1, 220);
}
function quet(el) {                          // vệt men lướt chéo
  if (RM || !el) return;
  el.classList.remove('quet'); void el.offsetWidth; el.classList.add('quet');
  clearTimeout(el._q); el._q = setTimeout(() => el.classList.remove('quet'), 520);
}
function dem(el, from, to, ms = 380, fmt = n => n) {   // đếm số
  if (RM || from === to) { el.textContent = fmt(to); return Promise.resolve(); }
  return new Promise(ok => {
    const t0 = performance.now();
    const b = t => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e)); p < 1 ? requestAnimationFrame(b) : ok(); };
    requestAnimationFrame(b);
  });
}

/* ---------- lớp men cho phần tử bấm được ---------- */
function gan(el, sang) {
  el.classList.add('men'); if (sang) el.classList.add('sang');
}
$$('.nut').forEach(b => gan(b, b.classList.contains('vien')));
$$('.chip').forEach(c => { gan(c, true); if (c.dataset.con) c.insertAdjacentHTML('afterbegin', '<span class=lop></span>'); });
$$('.tieu .bt, .hang .bt').forEach(b => gan(b, true));
$$('.luoi .o').forEach(o => gan(o, true));
$$('.the').forEach(t => gan(t, true));
gan($('.toast'), false);
const nutKhoa = $('.nut.khoa');
nutKhoa.innerHTML = '<span class=lop></span><span class=nd>' + nutKhoa.innerHTML + '</span>';

function viTri(el, e) {
  const r = el.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
  el.style.setProperty('--nx', (1 - x) * 100 + '%'); el.style.setProperty('--ny', (1 - y) * 100 + '%');
  el.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');   // ±4°
  el.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
}
let dangAn = null;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.men:not(.the)'); if (!el) return;
  dangAn = el; viTri(el, e); el.classList.add('an'); quet(el);
});
document.addEventListener('pointermove', e => { if (dangAn) viTri(dangAn, e); });
const tha = () => { if (dangAn) { dangAn.classList.remove('an'); dangAn = null; } };
document.addEventListener('pointerup', tha); document.addEventListener('pointercancel', tha);

/* ---------- vẽ theo dữ liệu ---------- */
const viecHTML = v => `<div class=chu><div class=ten>${v.ten}</div><div class=phu>${v.diem ? `${v.phu} · <b>+${v.diem} điểm</b>` : v.phu}</div></div>
<button class="nut nho ngoc men">Duyệt</button><button class="nut nho vien men sang">Từ chối</button>`;
function taoViec(v) {
  const d = document.createElement('div'); d.className = 'viec'; d.dataset.id = v.id; d.innerHTML = viecHTML(v); return d;
}
const trong = () => { const d = document.createElement('div'); d.className = 'viec trong'; d.textContent = 'Không còn việc chờ'; return d; };
function veViec() {
  const box = $('.viecs'); box.innerHTML = '';
  const c = CON[cur]; c.viec.forEach(v => box.append(taoViec(v))); if (!c.viec.length) box.append(trong());
}
const conPhut = c => c.han - c.dung;
const ttHTML = c => ({
  may: c.khoa ? (c.may.split(' · ')[0] + ' · Đã khoá') : c.may,
  con: c.khoa ? 'Máy đang khoá' : `Còn ${conPhut(c)} phút`,
  dung: `${c.dung}/${c.han} phút`,
  nut: c.khoa ? `<img class=f3 alt="" src="${ICON_MO}">Mở lại máy` : `<img class=f3 alt="" src="${ICON_KHOA}">Khoá máy`
});
function veTT() {
  const c = CON[cur], h = ttHTML(c);
  $('.tt .may').textContent = h.may; $('.tt .con').textContent = h.con; $('.tt .dung').textContent = h.dung;
  $('.tien i').style.width = Math.round(c.dung / c.han * 100) + '%';
  $('.nd', nutKhoa).innerHTML = h.nut; nutKhoa.classList.toggle('mo', c.khoa); $('.tt').classList.toggle('dakhoa', c.khoa);
}
function veDem(anim) {
  const n = String(CON[cur].viec.length), els = [$('.cho .dem'), $('.tab .so-cho')];
  els.forEach(el => anim ? doiChu(el, n) : (el.textContent = n));
}
const veVi = () => { $('#vi .so-vi').textContent = CON[cur].vi; };
veViec(); veTT(); veDem(false); veVi();

/* ---------- 2+3. duyệt / từ chối → rời danh sách, điểm bay vào ví, toast + hoàn tác ---------- */
function roi(el) {
  el.style.overflow = 'hidden'; el.style.pointerEvents = 'none';
  const a1 = el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: RM ? 'none' : 'scale(.98)' }],
    { duration: RM ? 200 : 220, easing: 'ease-out', fill: 'forwards' });
  if (RM) return xong(a1).then(() => el.remove());
  const h = el.offsetHeight, gap = el.previousElementSibling ? 'marginTop' : el.nextElementSibling ? 'marginBottom' : null;
  const k0 = { height: h + 'px', paddingTop: '9px', paddingBottom: '9px' }, k1 = { height: '0px', paddingTop: '0px', paddingBottom: '0px' };
  if (gap) { k0[gap] = '0px'; k1[gap] = '-7px'; }
  return xong(el.animate([k0, k1], { duration: 280, delay: 150, easing: VAO, fill: 'forwards' })).then(() => el.remove());
}
function vao(el) {
  el.style.overflow = 'hidden';
  if (RM) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: MEN }); return; }
  const h = el.offsetHeight, gap = el.previousElementSibling ? 'marginTop' : el.nextElementSibling ? 'marginBottom' : null;
  const k0 = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 },
        k1 = { height: h + 'px', paddingTop: '9px', paddingBottom: '9px', opacity: 0, offset: .55 },
        k2 = { height: h + 'px', paddingTop: '9px', paddingBottom: '9px', opacity: 1 };
  if (gap) { k0[gap] = '-7px'; k1[gap] = '0px'; k2[gap] = '0px'; }
  xong(el.animate([k0, k1, k2], { duration: 440, easing: VAO })).then(() => { el.style.overflow = ''; quet(el.querySelector('.nut.ngoc')); });
}
function bay(tu, n) {
  const R = dt.getBoundingClientRect(), a = tu.getBoundingClientRect(), b = $('#vi .bt').getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'bay'; f.textContent = `+${n} điểm`; dt.append(f);
  const x0 = a.left - R.left - 10, y0 = a.top - R.top - 6;
  f.style.left = x0 + 'px'; f.style.top = y0 + 'px';
  const dx = b.left + b.width / 2 - (x0 + R.left + f.offsetWidth / 2), dy = b.top + b.height / 2 - (y0 + R.top + f.offsetHeight / 2);
  const kf = RM ? [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }] : [
    { transform: 'translate(0,4px) scale(.9)', opacity: 0 },
    { transform: 'translate(0,-8px) scale(1)', opacity: 1, offset: .2 },
    { transform: `translate(${dx * .5}px,${dy * .42 - 34}px) scale(.94)`, opacity: 1, offset: .58 },
    { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: 0 }];
  return xong(f.animate(kf, { duration: 450, easing: BAY })).then(() => f.remove());
}
async function viDoi(from, to) {
  const vi = $('#vi'); vi.classList.add('nhan-diem'); quet(vi);
  await dem($('#vi .so-vi'), from, to);
  setTimeout(() => vi.classList.remove('nhan-diem'), 260);
}
async function ttDoi(c0, c) {   // đổi số phút + thanh
  const conEl = $('.tt .con'), dungEl = $('.tt .dung');
  $('.tien i').style.width = Math.round(c.dung / c.han * 100) + '%';
  dungEl.textContent = `${c.dung}/${c.han} phút`; quet($('.tt'));
  if (!c.khoa) await dem(conEl, c0, conPhut(c), 380, n => `Còn ${n} phút`);
}
function toast(chu) {
  const t = $('.toast'); $('.tchu', t).textContent = chu;
  clearTimeout(toastHen);
  if (!t.classList.contains('hien')) {
    t.classList.add('hien');
    xong(t.animate([{ opacity: 0, transform: RM ? 'none' : 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: RM ? 200 : 300, easing: MEN, fill: 'forwards' }));
  }
  quet(t);
  toastHen = setTimeout(anToast, 4000);
}
function anToast() {
  const t = $('.toast'); if (!t.classList.contains('hien')) return;
  t.classList.remove('hien'); clearTimeout(toastHen);
  xong(t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: RM ? 'none' : 'translateY(6px)' }],
    { duration: 220, easing: 'ease-out', fill: 'forwards' }));
}
function xuLy(btn, duyet) {
  const el = btn.closest('.viec'); if (!el || el.dataset.di) return; el.dataset.di = 1;
  const c = CON[cur], i = c.viec.findIndex(v => v.id === el.dataset.id), v = c.viec[i];
  c.viec.splice(i, 1);
  last = { con: cur, v, i, duyet, vi: c.vi, dung: c.dung, han: c.han };
  el.classList.add(duyet ? 'ok' : 'tu');
  setTimeout(() => {
    const ai = cur; roi(el).then(() => { if (!c.viec.length && cur === ai && !$('.viec.trong')) { const t = trong(); t.style.opacity = 0; $('.viecs').append(t); fade(t, 1, 220); } });
    if (duyet && v.diem) { const v0 = c.vi; c.vi += v.diem; bay(el.querySelector('.phu b'), v.diem).then(() => viDoi(v0, c.vi)); }
    if (duyet && v.phut) { const c0 = conPhut(c); c.han += v.phut; ttDoi(c0, c); }
    veDem(true);
    toast(`${duyet ? 'Đã duyệt' : 'Đã từ chối'} · ${v.ten}`);
  }, RM ? 0 : 120);
}
function hoanTac() {
  if (!last) return; const L = last; last = null; anToast();
  const c = CON[L.con];
  c.viec.splice(L.i, 0, L.v);
  const vi0 = c.vi, con0 = conPhut(c); c.vi = L.vi; c.dung = L.dung; c.han = L.han;
  if (L.con !== cur) return;
  const box = $('.viecs'), tr = $('.viec.trong', box); if (tr) tr.remove();
  const el = taoViec(L.v), ke = $$('.viec', box)[L.i];
  box.insertBefore(el, ke || null); vao(el);
  veDem(true);
  if (vi0 !== c.vi) viDoi(vi0, c.vi);
  if (con0 !== conPhut(c)) ttDoi(con0, c);
}

/* ---------- 4. khoá máy ↔ mở lại ---------- */
async function khoa() {
  const c = CON[cur]; c.khoa = !c.khoa; const h = ttHTML(c), nd = $('.nd', nutKhoa);
  $('.tt').classList.toggle('dakhoa', c.khoa); quet($('.tt'));
  doiChu($('.tt .may'), h.may); doiChu($('.tt .con'), h.con);
  await fade(nd, 0, 140);
  const w0 = nutKhoa.offsetWidth; nd.innerHTML = h.nut; nutKhoa.classList.toggle('mo', c.khoa);
  const w1 = nutKhoa.offsetWidth;
  if (!RM && w0 !== w1) nutKhoa.animate([{ width: w0 + 'px' }, { width: w1 + 'px' }], { duration: 300, easing: MEN });
  await fade(nd, 1, 220);
}

/* ---------- 5. đổi chip Con ---------- */
async function doiCon(chip) {
  const k = chip.dataset.con; if (!k || k === cur) return;
  $$('.chip[data-con]').forEach(x => x.classList.toggle('dang', x === chip));
  anToast(); last = null; cur = k;
  const khoi = [$('.the.cho'), $('.the.tt'), $('#vi .phu')];
  await Promise.all(khoi.map(el => fade(el, 0, 150)));
  veViec(); veTT(); veDem(false); veVi();
  khoi.forEach((el, i) => setTimeout(() => { fade(el, 1, 260); if (el.classList.contains('the')) quet(el); }, i * 60));
}

/* ---------- sự kiện ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button, .chip');
  if (!b) return;
  if (b.matches('.viec .nut.ngoc')) xuLy(b, true);
  else if (b.matches('.viec .nut.vien')) xuLy(b, false);
  else if (b === nutKhoa) khoa();
  else if (b.matches('.toast .hoan')) hoanTac();
  else if (b.matches('.chip[data-con]')) doiCon(b);
});

/* ---------- 6. tải trang: các khối hiện dần, so le, rồi một vệt men ---------- */
const khoiVao = [$('.tieu'), $('.cuon > .hang'), $('.the.cho'), $('.the.tt'), ...$$('.luoi .o'), $('.tab')];
khoiVao.forEach((el, i) => {
  const a = el.animate(RM ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
    { duration: RM ? 200 : 420, delay: 80 + i * 45, easing: MEN, fill: 'backwards' });
  if (el.classList.contains('men')) xong(a).then(() => setTimeout(() => quet(el), 40));
});
window.__menDemo = { xuLy, hoanTac, khoa, doiCon };
})();
