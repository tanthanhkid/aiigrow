/* M-vui — kiểu motion «VUI»: ăn mừng, sinh động nhưng gọn. Gốc giao diện: I-fluent-3d.html (Clay A · gốc · gương), không đổi giao diện tĩnh.
 *
 * THÔNG SỐ (để chuyển sang react-native-reanimated; mọi chuyển động chỉ dùng transform + opacity, trừ height lúc gập/mở hàng việc = Layout transition):
 *   NHẤN XUỐNG  withTiming(scaleX .95 / scaleY .90 — "thạch bị ép"), duration 110ms, Easing.bezier(.3,0,.5,1)
 *   THẢ RA      withSpring(1, { stiffness: 420, damping: 14, mass: 1 })   ≈ 420ms, nảy vượt ~8%            [SP.tha]
 *   NẢY VÀO     withSpring(0, { stiffness: 260, damping: 17, mass: 1 })   ≈ 450ms (translateY 26→0, scale .92→1)  [SP.vao]
 *   BẬT (pop)   withSpring(1, { stiffness: 500, damping: 16, mass: 1 })   ≈ 400ms (badge, chip, ví nảy)    [SP.bat]
 *   TẢI TRANG   stagger 55ms/khối (withDelay(i*55, NẢY VÀO)), 11 khối ⇒ xong ≈ 1.0s; sau đó chuông rung (có việc chờ)
 *   DUYỆT       hàng việc: withTiming(translateX 40, scale .9, rotate 2°, opacity 0) 220ms Easing.in(Easing.cubic);
 *               rồi gập height 240ms Easing.bezier(.2,.8,.2,1) (Reanimated: Layout = LinearTransition.duration(240));
 *               confetti 20 hạt ngọc/vàng 380–450ms Easing.out(Easing.quad) + rơi 30px; «+20» bay theo Bézier bậc 2
 *               450ms Easing.bezier(.45,0,.25,1) vào hộp quà (Ví); quà nảy SP.bat + lắc ±14° 420ms; số ví đếm lên 400ms Easing.out(cubic)
 *   TOAST       vào: SP.vao từ translateY 24, scale .92; ra: 200ms Easing.in(quad); tự ẩn sau 3.5s
 *   HOÀN TÁC    hàng việc mở height 240ms rồi bật vào SP.bat từ scale .85; chuông rung 450ms (rotate 0,-18,14,-9,5,0 quanh đỉnh)
 *   KHOÁ MÁY    ổ khoá "đóng sập" 380ms keyframes (nhấc -9px scale 1.3 → đập 2px scale .85/1.1 → 1.08/.94 → 1);
 *               lúc đập (t=200ms) thẻ trạng thái giật xuống 3px rồi SP.tha; chữ đổi: ra 120ms, vào SP.vao; nút đổi sang ngọc «Mở lại máy»
 *   ĐỔI CON     chip mới SP.bat từ scale(1.14,.86); khối nội dung trượt ra 140ms Easing.in(quad) ±28px (stagger 25ms) rồi trượt vào SP.vao (stagger 45ms)
 *   REDUCED MOTION  mọi thứ còn fade opacity ≤180ms; bỏ confetti, bay điểm, rung, nảy.
 */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RMQ = matchMedia('(prefers-reduced-motion: reduce)'); let RM = RMQ.matches; RMQ.addEventListener?.('change', e => RM = e.matches);
const ngu = ms => new Promise(r => setTimeout(r, ms));

/* lò xo → easing linear() để WAAPI chạy đúng như withSpring (vị trí chuẩn hoá 0→1, vận tốc đầu 0) */
function loXo(k, c, m = 1, dur = 450) {
  const w = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m)), wd = w * Math.sqrt(1 - z * z), n = 48, p = [];
  for (let i = 0; i <= n; i++) { const t = i / n * dur / 1000; p.push(i === n ? 1 : +(1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))).toFixed(4)); }
  return { easing: `linear(${p.join(',')})`, duration: dur };
}
const SP = { tha: loXo(420, 14, 1, 420), vao: loXo(260, 17, 1, 450), bat: loXo(500, 16, 1, 400) };

/* WAAPI có nhánh reduced-motion: chỉ giữ opacity */
function A(el, frames, o = {}) {
  if (!el) return null;
  if (RM) {
    const f = frames.map(x => ('opacity' in x ? { opacity: x.opacity, offset: x.offset } : null)).filter(Boolean);
    if (f.length < 2) return null;
    return el.animate(f.map(({ offset, ...r }) => r), { duration: Math.min(o.duration || 180, 180), easing: 'ease', fill: o.fill || 'none' });
  }
  return el.animate(frames, { fill: 'none', ...o });
}
const xong = a => a ? a.finished.catch(() => {}) : Promise.resolve();

const dt = $('.dt'), lop = Object.assign(document.createElement('div'), { className: 'phu-lop' }); dt.append(lop);
const tamTrong = el => { const r = el.getBoundingClientRect(), d = dt.getBoundingClientRect(); return { x: r.left - d.left + r.width / 2, y: r.top - d.top + r.height / 2, w: r.width, h: r.height }; };

/* ===== dữ liệu hai con ===== */
const CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets/';
const IMG = { khoa: CDN + 'Locked/3D/locked_3d.png', mo: CDN + 'Unlocked/3D/unlocked_3d.png' };
const CON = {
  Bin: { viec: [{ id: 1, ten: 'Dọn phòng', loai: 'Nhiệm vụ', diem: 20 }, { id: 2, ten: 'Đọc sách 30 phút', loai: 'Nhiệm vụ', diem: 15 }, { id: 3, ten: 'Xin thêm 15 phút', loai: 'Yêu cầu · chơi máy', phut: 15 }],
         may: 'Windows', app: 'Roblox 35 phút', con: 40, dung: 80, tong: 120, vi: 340, khoa: false },
  Na:  { viec: [{ id: 4, ten: 'Tưới cây', loai: 'Nhiệm vụ', diem: 10 }, { id: 5, ten: 'Xin thêm 10 phút', loai: 'Yêu cầu · xem video', phut: 10 }],
         may: 'iPad', app: 'YouTube 20 phút', con: 25, dung: 35, tong: 60, vi: 120, khoa: false },
};
let ten = 'Bin'; const cur = () => CON[ten];

const viecs = $('.viecs'), dem = $('.cho .dem'), soCho = $('.tab .so-cho'), tt = $('.the.tt'), nutKhoa = $('.tt .nut');
const dong1 = $('.tt .s13'), dong2 = $('.tt .s20'), thanh = $('.tt .tien i'), soPhut = $('.tt .hang+.hang .so') || $$('.tt .so').pop();
const oQua = $$('.luoi .o')[5], quaBt = $('.bt', oQua), viTxt = $('.phu', oQua), gioTxt = $('.phu', $$('.luoi .o')[2]);

const phuHTML = v => v.diem ? `${v.loai} · <b>+${v.diem} điểm</b>` : v.loai;
function taoViec(v) {
  const d = document.createElement('div'); d.className = 'viec'; d.dataset.id = v.id;
  d.innerHTML = `<div class=chu><div class=ten>${v.ten}</div><div class=phu>${phuHTML(v)}</div></div><button class="nut nho ngoc" data-l=duyet>Duyệt</button><button class="nut nho vien" data-l=tuchoi>Từ chối</button>`;
  return d;
}
function veRong() { const r = document.createElement('div'); r.className = 'rong'; r.textContent = 'Xong hết rồi — không còn việc chờ'; r.style.cssText = 'font:600 14px Inter;color:var(--chu3);text-align:center;padding:14px 0 10px'; return r; }
function veDanhSach() { viecs.replaceChildren(...(cur().viec.length ? cur().viec.map(taoViec) : [veRong()])); }
function veTrangThai() {
  const c = cur();
  dong1.innerHTML = `<span class=cham></span>${c.khoa ? `${c.may} · đã khoá` : `${c.may} · ${c.app}`}`;
  dong2.textContent = c.khoa ? 'Máy đang khoá' : `Còn ${c.con} phút`;
  tt.classList.toggle('khoa', c.khoa);
  nutKhoa.classList.toggle('ngoc', c.khoa);
  nutKhoa.innerHTML = `<img class=f3 alt="" src="${c.khoa ? IMG.mo : IMG.khoa}">${c.khoa ? 'Mở lại máy' : 'Khoá máy'}`;
  thanh.style.width = (c.dung / c.tong * 100).toFixed(1) + '%'; soPhut.textContent = `${c.dung}/${c.tong} phút`;
  viTxt.textContent = `Ví ${c.vi} điểm`; gioTxt.textContent = `${c.tong} phút/ngày`;
}
function demSo(bat = true) {
  const n = cur().viec.length; dem.textContent = n; soCho.textContent = n;
  if (bat) { A(dem, [{ transform: 'scale(1.45)' }, { transform: 'none' }], SP.bat); A(soCho, [{ transform: 'scale(1.5)' }, { transform: 'none' }], SP.bat); }
  soCho.style.opacity = n ? 1 : 0;
}
veDanhSach(); veTrangThai(); demSo(false);

/* ===== 1. nhấn nút: ép thạch khi xuống, nảy lò xo khi thả ===== */
const NHAN = '.nut,.chip,.bt,.toast b,.luoi .o,.tab a';
let dangNhan = null;
dt.addEventListener('pointerdown', e => {
  const el = e.target.closest(NHAN); if (!el) return; dangNhan = el;
  el.getAnimations().forEach(a => a.cancel());
  A(el, [{ transform: 'none' }, { transform: el.matches('.luoi .o') ? 'scale(.96)' : 'scale(.95,.9)' }], { duration: 110, easing: 'cubic-bezier(.3,0,.5,1)', fill: 'forwards' })
    || A(el, [{ opacity: 1 }, { opacity: .7 }], { duration: 110, fill: 'forwards' });
});
const tha = () => {
  const el = dangNhan; if (!el) return; dangNhan = null;
  const tu = getComputedStyle(el).transform; el.getAnimations().forEach(a => a.cancel());
  A(el, [{ transform: tu === 'none' ? 'scale(.95,.9)' : tu, opacity: RM ? .7 : 1 }, { transform: 'none', opacity: 1 }], SP.tha);
  const anh = el.matches('.luoi .o') && $('.bt img', el); if (anh) nhun(anh);  // icon 3D nhún khi chạm ô
};
dt.addEventListener('pointerup', tha); dt.addEventListener('pointercancel', tha); dt.addEventListener('pointerleave', tha);

/* icon 3D: nhún / lắc / chuông rung */
const nhun = img => A(img, [{ transform: 'none' }, { transform: 'translateY(-7px) scale(1.15,.9)', offset: .3 }, { transform: 'translateY(1px) scale(.9,1.12)', offset: .6 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
const lac = img => A(img, [{ transform: 'none' }, { transform: 'rotate(-14deg) scale(1.1)', offset: .25 }, { transform: 'rotate(10deg)', offset: .5 }, { transform: 'rotate(-6deg)', offset: .75 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
const chuong = $$('.hang .bt.xam img')[0], chuongTab = $$('.tab a')[1].querySelector('i');
function rungChuong() {
  const f = [0, -18, 14, -9, 5, 0].map((d, i, a) => ({ transform: `rotate(${d}deg)`, offset: i / (a.length - 1) }));
  chuong.style.transformOrigin = '50% 12%'; chuongTab.style.transformOrigin = '50% 10%';
  A(chuong, f, { duration: 450, easing: 'ease-out' }); A(chuongTab, f, { duration: 450, easing: 'ease-out', delay: 60 });
  A(chuong.parentElement, [{ transform: 'none' }, { transform: 'scale(1.08)', offset: .3 }, { transform: 'none' }], { duration: 450 });
}

/* ===== confetti ngọc / vàng bắn từ nút ===== */
const MAU = ['#16806e', '#0f6b5c', '#5fd3b8', '#f5b70a', '#ffd447', '#fbecc0'];
function confetti(el) {
  if (RM) return; const { x, y } = tamTrong(el);
  for (let i = 0; i < 20; i++) {
    const h = document.createElement('i'); h.className = 'hat' + (i % 3 ? '' : ' tron'); h.style.background = MAU[i % MAU.length];
    if (i % 4 === 1) { h.style.width = '5px'; h.style.height = '11px'; }
    lop.append(h);
    const g = (-165 + Math.random() * 150) * Math.PI / 180, r = 40 + Math.random() * 56, dx = Math.cos(g) * r, dy = Math.sin(g) * r, quay = (Math.random() - .5) * 540;
    const p = (a, b, c, s, o) => ({ transform: `translate(${x - 4 + a}px,${y - 4 + b}px) rotate(${c}deg) scale(${s})`, opacity: o });
    h.animate([p(0, 0, 0, .4, 1), { ...p(dx, dy, quay * .6, 1, 1), offset: .55 }, p(dx * 1.12, dy + 30, quay, .7, 0)],
      { duration: 380 + Math.random() * 70, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished.then(() => h.remove());
  }
}

/* ===== «+20» bay theo đường cong vào ví ===== */
function bay(tuEl, dichEl, chu, kieu = '', dichLech = 0) {
  if (RM) return Promise.resolve();
  const a = tamTrong(tuEl), b = tamTrong(dichEl); b.y -= dichLech;
  const v = document.createElement('div'); v.className = 'bay ' + kieu; v.textContent = chu; lop.append(v);
  const W = v.offsetWidth, H = v.offsetHeight, cx = Math.max(a.x, b.x) + 70, cy = Math.min(a.y, b.y) - 70, f = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, u = 1 - t, X = u * u * a.x + 2 * u * t * cx + t * t * b.x, Y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
    const s = t < .2 ? .6 + t / .2 * .55 : 1.15 - (t - .2) / .8 * .6;
    f.push({ transform: `translate(${X - W / 2}px,${Y - H / 2}px) scale(${s.toFixed(3)}) rotate(${(u * -8).toFixed(1)}deg)`, opacity: t > .92 ? 0 : 1, offset: t });
  }
  return v.animate(f, { duration: 450, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished.then(() => v.remove());
}
function demLen(el, tu, den, fmt) {
  if (RM) { el.textContent = fmt(den); return A(el, [{ opacity: .3 }, { opacity: 1 }], { duration: 160 }); }
  const t0 = performance.now(), b = t => { const k = Math.min(1, (t - t0) / 400), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(tu + (den - tu) * e)); if (k < 1) requestAnimationFrame(b); };
  requestAnimationFrame(b);
}
function viNay() {
  A(quaBt, [{ transform: 'scale(1.32,.82)' }, { transform: 'none' }], SP.bat); lac($('img', quaBt));
  A(oQua, [{ transform: 'translateY(-5px)' }, { transform: 'none' }], SP.tha);
}

/* ===== 2. duyệt / từ chối: rời danh sách, dồn lên, toast + hoàn tác ===== */
async function gap(el) {   // gập chiều cao (Layout transition)
  if (RM) { el.remove(); return; }
  const h = el.offsetHeight, laDau = !el.previousElementSibling, mep = laDau ? 'marginBottom' : 'marginTop';
  el.style.pointerEvents = 'none';
  await xong(el.animate([{ height: h + 'px', [mep]: '0px', paddingTop: '9px', paddingBottom: '9px' }, { height: '0px', [mep]: el.parentElement.children.length > 1 ? '-7px' : '0px', paddingTop: '0px', paddingBottom: '0px' }],
    { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }));
  el.remove();
}
async function mo(el) {
  if (RM) { A(el, [{ opacity: 0 }, { opacity: 1 }]); return; }
  const h = el.offsetHeight, laDau = !el.previousElementSibling, mep = laDau ? 'marginBottom' : 'marginTop';
  el.style.opacity = 0;
  await xong(el.animate([{ height: '0px', [mep]: el.parentElement.children.length > 1 ? '-7px' : '0px', paddingTop: '0px', paddingBottom: '0px' }, { height: h + 'px', [mep]: '0px', paddingTop: '9px', paddingBottom: '9px' }],
    { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }));
  el.style.opacity = '';
  A(el, [{ transform: 'scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], SP.bat);
}

viecs.addEventListener('click', async e => {
  const nut = e.target.closest('button[data-l]'); if (!nut) return;
  const hang = nut.closest('.viec'), c = cur(), i = c.viec.findIndex(v => v.id == hang.dataset.id); if (i < 0 || hang.dataset.di) return;
  hang.dataset.di = 1; const v = c.viec[i], duyet = nut.dataset.l === 'duyet', conTen = ten;
  c.viec.splice(i, 1);
  const se = { vi: c.vi, con: c.con, tong: c.tong };   // để hoàn tác
  const cao = hang.offsetHeight + 7;
  if (duyet) {
    confetti(nut);
    if (v.diem) bay(nut, quaBt, `+${v.diem}`, '', cao).then(() => { viNay(); demLen(viTxt, c.vi - v.diem, c.vi, n => `Ví ${n} điểm`); });
    if (v.phut) bay(nut, dong2, `+${v.phut} phút`, 'phut', cao).then(() => {
      if (!c.khoa) demLen(dong2, c.con - v.phut, c.con, n => `Còn ${n} phút`);
      A(dong2, [{ transform: 'scale(1.12)' }, { transform: 'none' }], SP.bat);
      thanh.style.width = (c.dung / c.tong * 100).toFixed(1) + '%'; soPhut.textContent = `${c.dung}/${c.tong} phút`; gioTxt.textContent = `${c.tong} phút/ngày`;
    });
    if (v.diem) c.vi += v.diem; if (v.phut) { c.con += v.phut; c.tong += v.phut; }
  }
  await xong(A(hang, [{ transform: 'none', opacity: 1 }, { transform: duyet ? 'translateX(40px) scale(.9) rotate(2deg)' : 'translateX(-40px) scale(.92)', opacity: 0 }],
    { duration: 220, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' }));
  await gap(hang); demSo();
  if (!c.viec.length) { const r = veRong(); viecs.append(r); A(r, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], SP.vao); }
  toast(duyet ? `Đã duyệt · ${v.ten}` : `Đã từ chối · ${v.ten}`, duyet, async () => {
    if (ten !== conTen) return;      // đã sang con khác: bỏ qua
    c.viec.splice(i, 0, v); Object.assign(c, se);
    $('.rong', viecs)?.remove();
    const moi = taoViec(v); viecs.insertBefore(moi, viecs.children[i] || null);
    if (duyet && v.diem) { demLen(viTxt, se.vi + v.diem, se.vi, n => `Ví ${n} điểm`); lac($('img', quaBt)); }
    if (duyet && v.phut) { veTrangThai(); A(dong2, [{ opacity: .3 }, { opacity: 1 }], { duration: 200 }); }
    await mo(moi); demSo(); rungChuong();
  });
});

/* toast */
const tst = document.createElement('div'); tst.className = 'toast'; tst.innerHTML = '<div class=vt>✓</div><span></span><b>Hoàn tác</b>'; dt.append(tst);
let hetGio, hoanTac = null;
function toast(chu, ok, fn) {
  clearTimeout(hetGio); hoanTac = fn;
  $('span', tst).textContent = chu.length > 30 ? chu.slice(0, 29) + '…' : chu;
  const vt = $('.vt', tst); vt.textContent = ok ? '✓' : '✕'; vt.classList.toggle('tu', !ok);
  tst.getAnimations().forEach(a => a.cancel());
  const dangHien = tst.classList.contains('hien'); tst.classList.add('hien');
  if (dangHien) A(tst, [{ transform: 'scale(1.05)', opacity: 1 }, { transform: 'none', opacity: 1 }], { ...SP.bat, fill: 'forwards' });
  else A(tst, [{ transform: 'translateY(24px) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { ...SP.vao, fill: 'forwards' });
  if (!dangHien && !RM) A(vt, [{ transform: 'scale(0) rotate(-90deg)' }, { transform: 'none' }], { ...SP.bat, delay: 80, fill: 'backwards' });
  hetGio = setTimeout(anToast, 3500);
}
async function anToast() {
  clearTimeout(hetGio); hoanTac = null; if (!tst.classList.contains('hien')) return;
  tst.classList.remove('hien'); tst.getAnimations().forEach(a => a.cancel());
  tst.style.opacity = 1; await xong(A(tst, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(16px) scale(.96)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }));
  tst.getAnimations().forEach(a => a.cancel()); tst.style.opacity = '';
}
$('b', tst).addEventListener('click', () => { const f = hoanTac; anToast(); f && f(); });

/* ===== 4. khoá máy: ổ khoá đóng sập, thẻ giật, nút đổi trạng thái ===== */
async function doiChu(el, html) {
  await xong(A(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 120, easing: 'ease-in', fill: 'forwards' }));
  el.getAnimations().forEach(a => a.cancel()); el.innerHTML = html;
  A(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], SP.vao);
}
nutKhoa.addEventListener('click', async () => {
  const c = cur(); if (nutKhoa.dataset.di) return; nutKhoa.dataset.di = 1;
  const img = $('img', nutKhoa); c.khoa = !c.khoa;
  if (c.khoa) {   // đóng sập
    A(img, [{ transform: 'none' }, { transform: 'translateY(-9px) scale(1.3) rotate(-10deg)', offset: .35 }, { transform: 'translateY(2px) scale(.85,1.1)', offset: .55 }, { transform: 'scale(1.08,.94)', offset: .78 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
    await ngu(RM ? 0 : 200);
    A(tt, [{ transform: 'translateY(3px) scale(.99)' }, { transform: 'none' }], SP.tha);
  } else {        // mở: ổ khoá bật lên
    A(img, [{ transform: 'none' }, { transform: 'translateY(-8px) rotate(14deg) scale(1.2)', offset: .45 }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
    await ngu(RM ? 0 : 160);
  }
  tt.classList.toggle('khoa', c.khoa);
  doiChu(dong1, `<span class=cham></span>${c.khoa ? `${c.may} · đã khoá` : `${c.may} · ${c.app}`}`);
  doiChu(dong2, c.khoa ? 'Máy đang khoá' : `Còn ${c.con} phút`);
  await ngu(RM ? 0 : 90);
  nutKhoa.classList.toggle('ngoc', c.khoa);
  nutKhoa.innerHTML = `<img class=f3 alt="" src="${c.khoa ? IMG.mo : IMG.khoa}">${c.khoa ? 'Mở lại máy' : 'Khoá máy'}`;
  A(nutKhoa, [{ transform: 'scale(.9,1.08)', opacity: .6 }, { transform: 'none', opacity: 1 }], SP.bat);
  A($('img', nutKhoa), [{ transform: 'scale(.4) rotate(-30deg)' }, { transform: 'none' }], SP.bat);
  delete nutKhoa.dataset.di;
});

/* ===== 5. đổi chip Con: chip bật, nội dung trượt ra/vào ===== */
const chips = $$('.hang .chip:not(.cong)'), tenChip = x => x.lastChild.textContent.trim();
chips.forEach(ch => ch.addEventListener('click', async () => {
  const moi = tenChip(ch); if (moi === ten || dt.dataset.doi) return; dt.dataset.doi = 1;
  const huong = chips.findIndex(x => tenChip(x) === moi) > chips.findIndex(x => tenChip(x) === ten) ? 1 : -1;
  anToast();
  chips.forEach(x => x.classList.toggle('dang', x === ch));
  A(ch, [{ transform: 'scale(1.14,.86)' }, { transform: 'none' }], SP.bat);
  A($('.avt', ch), [{ transform: 'translateY(-6px) rotate(-12deg)' }, { transform: 'none' }], SP.tha);
  const khoi = [$('.the.cho'), tt, $('.luoi')];
  await Promise.all(khoi.map((k, i) => xong(A(k, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-huong * 28}px)` }], { duration: 140, delay: i * 25, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }))));
  ten = moi; veDanhSach(); veTrangThai(); demSo(false);
  khoi.forEach((k, i) => { k.getAnimations().forEach(a => a.cancel()); A(k, [{ opacity: 0, transform: `translateX(${huong * 28}px)` }, { opacity: 1, transform: 'none' }], { ...SP.vao, delay: i * 45, fill: 'backwards' }); });
  await ngu(RM ? 0 : 260); demSo(); if (cur().viec.length) rungChuong();
  delete dt.dataset.doi;
}));

/* ===== 6. tải trang: các khối nảy vào lần lượt ===== */
(async () => {
  await Promise.race([document.fonts.ready, ngu(700)]);
  const khoi = [...$$('.cuon>*').filter(x => !x.matches('.luoi')), ...$$('.luoi .o'), $('.tab')];
  khoi.forEach((k, i) => A(k, [{ opacity: 0, transform: 'translateY(26px) scale(.92)' }, { opacity: 1, transform: 'none' }], { ...SP.vao, delay: RM ? 0 : i * 55, fill: 'backwards' }));
  document.documentElement.classList.remove('vao');
  await ngu(RM ? 0 : khoi.length * 55 + 250);
  demSo(); rungChuong();
})();
})();
