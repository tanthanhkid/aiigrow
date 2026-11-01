// App Con Android (agent-android, View dựng bằng code + ClayDrawable) — dựng khớp ảnh man-android-2510/*.png (1080×2400, mật độ 2,625 = 420dpi).
// Toạ độ viết theo PIXEL THIẾT BỊ của ảnh (1080 rộng); khung CSS 360×800, dsf 3, gốc zoom 1/3 ⇒ 1 px ở đây = 1 px ảnh.
// Khối Clay dịch thẳng từ Clay.kt (ClayDrawable): THE / VIEN / THAN / NGOC / LOM / VIEN_TRON — cùng gradient, viền men, bóng kép.
// Font Roboto (Android). Asset: /assets/android/fl_*.png (drawable-nodpi), /assets/rob/*.webp (app Con web trong WebView).

const D = 2.625; // dp → px
const dp = (v) => +(v * D).toFixed(2);
const FONT = "Roboto,'Helvetica Neue',Arial,sans-serif";

// bóng Android setShadowLayer(radius) ⇒ sigma ≈ 0,577·r + 0,5 ⇒ blur CSS = 2·sigma
const blur = (rDp) => +(2 * (0.57735 * dp(rDp) + 0.5)).toFixed(1);

/** Hộp Clay đặt tuyệt đối (x,y,w,h = thân khối, px ảnh). */
function khoi(kieu, x, y, w, h, o = {}) {
  const lon = kieu === 'the';
  const bo = o.bo != null ? dp(o.bo) : kieu === 'the' ? dp(32) : kieu === 'lom' ? dp(24) : kieu === 'tron' ? h / 2 : dp(22);
  const k = Math.min(bo, h / 2);
  const nen = o.nen || '#f7f6f3';
  let bg = '', sh = '';
  const bongNgoai = (mau1, a1) => {
    const co = lon ? dp(7) : dp(4);
    return `0 ${lon ? dp(9) : dp(6)}px ${blur(lon ? 11 : 7)}px ${-co}px rgba(${mau1},${a1}),0 ${(lon ? dp(3) : dp(2)) + dp(2)}px ${blur(lon ? 5 : 3)}px ${-dp(2)}px rgba(${mau1},.22)`;
  };
  if (kieu === 'the' || kieu === 'vien' || kieu === 'tron') {
    const lop = [];
    lop.push(`linear-gradient(180deg,rgba(40,44,42,0) calc(100% - ${lon ? dp(12) : dp(8)}px),rgba(40,44,42,${lon ? 0.14 : 0.16}) 100%)`);
    if (kieu === 'the') {
      lop.push(`radial-gradient(ellipse ${w * 0.46}px ${dp(18)}px at 50% ${dp(3)}px,#fff 0,rgba(255,255,255,.95) 62%,rgba(255,255,255,0) 78%)`);
      lop.push('linear-gradient(180deg,#fefefd 0,rgba(254,254,253,0) 26%,rgba(40,44,42,.024) 60%,rgba(40,44,42,.07) 100%)');
    } else if (kieu === 'vien') {
      lop.push('linear-gradient(180deg,#fff 0,rgba(255,255,255,.85) 44%,rgba(232,231,226,0) 50%,rgba(40,44,42,.05) 100%)');
    } else {
      lop.push(`radial-gradient(ellipse ${w * 0.6}px ${h * 0.34}px at 50% 18%,rgba(255,255,255,.95),rgba(255,255,255,0))`);
      lop.push(`radial-gradient(ellipse ${w * 0.5}px ${h * 0.2}px at 50% 92%,rgba(255,255,255,.5),rgba(255,255,255,0))`);
    }
    bg = lop.join(',') + `,${nen}`;
    sh = `inset 0 ${dp(1.5)}px 0 #fff${lon ? `,inset 0 -${dp(2)}px 0 rgba(255,255,255,.7)` : ''},${o.khongBong ? '0 0 0 transparent' : bongNgoai('28,32,30', lon ? 0.333 : 0.376)}`;
  } else if (kieu === 'than' || kieu === 'ngoc') {
    const ngoc = kieu === 'ngoc';
    const cao = h > dp(100);
    const tren = cao ? 0.22 : ngoc ? 0.34 : 0.3;
    bg = `radial-gradient(ellipse ${w * 0.6}px ${h * 0.4}px at 50% ${h * 1.05}px,${ngoc ? 'rgba(80,220,190,.4)' : 'rgba(120,140,135,.35)'},rgba(${ngoc ? '80,220,190' : '120,140,135'},0)),`
      + `linear-gradient(180deg,rgba(255,255,255,${tren}) 0,rgba(255,255,255,.05) ${cao ? 10 : 24}%,rgba(255,255,255,0) ${cao ? 12 : 26}%),`
      + (ngoc ? 'linear-gradient(180deg,#0f6b5c,#08463d)' : 'linear-gradient(180deg,#2e3533,#121615)');
    sh = `inset 0 ${dp(1)}px 0 rgba(255,255,255,.45),inset 0 -${dp(2)}px 0 rgba(0,0,0,.4),${bongNgoai(ngoc ? '10,82,70' : '15,19,18', ngoc ? 0.65 : 0.6)}`;
  } else if (kieu === 'lom') {
    bg = `linear-gradient(180deg,rgba(40,44,42,.14) 0,rgba(40,44,42,0) ${dp(9)}px),#e9e8e3`;
    sh = `inset 0 -${dp(1.5)}px 0 rgba(255,255,255,.95)`;
  }
  const r = kieu === 'tron' ? '50%' : `${k}px`;
  return `<div class="k" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r};background:${bg};box-shadow:${sh};${o.st || ''}">${o.trong || ''}</div>`;
}

/** Chữ: căn theo ĐƯỜNG CHÂN (baseline, px ảnh). can = 'l' | 'c' (x là tâm) | 'r'. */
function chu(x, base, co, s, o = {}) {
  const lh = o.lh || Math.round(co * 1.4);
  const top = base - co * 0.928 - (lh - co * 1.172) / 2;
  const can = o.can || 'l';
  const viTri = can === 'c' ? `left:${x - 1000}px;width:2000px;text-align:center` : can === 'r' ? `right:${1080 - x}px;text-align:right` : `left:${x}px`;
  return `<div class="t" style="${viTri};top:${top.toFixed(1)}px;font-size:${co}px;line-height:${lh}px;font-weight:${o.w || 400};color:${o.mau || '#0f1312'};${o.ls ? `letter-spacing:${o.ls}em;` : ''}${o.st || ''}">${s}</div>`;
}

const anh = (src, x, y, s, st = '') => `<img src="${src}" alt="" style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;${st}">`;
const fl = (ten, x, y, s) => anh(`/assets/android/fl_${ten}.png`, x, y, s);

const CSS = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:360px;height:800px;overflow:hidden;background:#ecebe7}
.g{position:relative;width:1080px;height:2400px;zoom:.333333333;overflow:hidden;font-family:${FONT};-webkit-font-smoothing:antialiased}
.k{position:absolute}.t{position:absolute;white-space:nowrap}button.t,a.t{border:0;background:none;font-family:inherit}
.nen{position:absolute;inset:0;background:linear-gradient(180deg,#e3ebe7 0,#ecebe7 50%,#ecebe7 100%)}`;

const trang = (body, css = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=360">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=block">
<style>${CSS}${css}</style></head><body><div class="g">${body}</div></body></html>`;

// thanh trạng thái Android 15 (7:40 + biểu tượng) và vạch điều hướng cử chỉ
const thanhTrangThai = (mau = '#454746', nen = '#e3ebe7', chuGio = '7:40') => `<div class="k" style="left:0;top:0;width:1080px;height:127px;background:${nen}"></div>
  ${chu(81, 77, 37, chuGio, { mau, st: 'letter-spacing:.01em' })}
  <svg style="position:absolute;left:170px;top:48px;width:30px;height:32px" viewBox="0 0 30 32"><path d="M15 31V15M15 15C15 8 9 4 3 4c0 7 5 11 12 11Zm0 0c0-7 6-11 12-11 0 7-5 11-12 11Z" fill="none" stroke="${mau}" stroke-width="4.2" stroke-linejoin="round"/></svg>
  <svg style="position:absolute;left:222px;top:47px;width:36px;height:34px" viewBox="0 0 36 34"><path d="M3 3h30L18 31z" fill="none" stroke="${mau}" stroke-width="4" stroke-linejoin="round"/><path d="M11 10h14l-7 12z" fill="${mau}"/></svg>
  <svg style="position:absolute;left:889px;top:46px;width:44px;height:34px" viewBox="0 0 44 34"><path d="M22 32 1 9a30 30 0 0 1 42 0z" fill="${mau}"/></svg>
  <svg style="position:absolute;left:933px;top:46px;width:34px;height:34px" viewBox="0 0 34 34"><path d="M33 1v32H1z" fill="${mau}"/></svg>
  <svg style="position:absolute;left:982px;top:42px;width:22px;height:40px" viewBox="0 0 22 40"><rect x="1" y="4" width="20" height="35" rx="3" fill="${mau}"/><rect x="7" y="0" width="8" height="5" rx="1.5" fill="${mau}"/><path d="M12 10 6 23h5l-1 9 6-13h-5z" fill="${nen}"/></svg>`;
const vachDieuHuong = (mau = '#1f1f1f') => `<div class="k" style="left:398px;top:2363px;width:284px;height:11px;border-radius:6px;background:${mau}"></div>`;

// ---------------------------------------------------------------- màn khoá (GiaoDien.ManKhoaView)
function manKhoa(o) {
  const dy = o.dy; // lệch dọc của khối trên (đếm ngược 44sp cao hơn «Chờ Ba Mẹ mở» 24sp)
  return trang(`<div class="nen"></div>
  ${khoi('the', 72, 290 + dy, 936, 735 - dy)}
  ${khoi('tron', 420, 297 + dy, 241, 237, { nen: '#dcebe6' })}
  ${fl('khoa', 470, 343 + dy, 140)}
  ${chu(540, 660 + dy, 73.5, 'Máy đang khoá', { can: 'c', w: 700, ls: -0.02 })}
  ${o.dem}
  ${chu(540, 946, 47.25, 'Ba Mẹ vừa khoá máy. Con nghỉ một', { can: 'c', mau: '#3a403d' })}
  ${chu(540, 1013, 47.25, 'chút nhé.', { can: 'c', mau: '#3a403d' })}
  ${khoi('ngoc', 72, 1164, 936, 147, { st: o.mo ? `filter:${o.mo}` : '' })}
  <button class="t" style="left:72px;top:1164px;width:936px;height:147px;font:700 42px/147px ${FONT};color:#fff;text-align:center">Xin Ba Mẹ thêm giờ</button>
  ${khoi('the', 72, 1380, 936, o.cao2)}
  ${chu(122, 1477, 47.25, 'Máy đang mất mạng?', { w: 700 })}
  ${chu(122, 1532, 39.375, 'Nhờ Ba Mẹ mở app AiiGrow › Máy › «Mã mở khi', { mau: '#565c59' })}
  ${chu(122, 1585, 39.375, 'mất mạng» rồi đọc mã cho con gõ vào đây.', { mau: '#565c59' })}
  ${khoi('lom', 119, 1624, 842, 169)}
  ${o.oMa}
  ${khoi('vien', 129, 1813, 822, 147)}
  <button class="t" style="left:129px;top:1813px;width:822px;height:147px;font:700 42px/147px ${FONT};color:#0a5246;text-align:center">Mở bằng mã</button>
  ${o.bao || ''}
  ${chu(540, o.ghi, 36.75, 'Máy này do Ba Mẹ quản lý bằng AiiGrow.', { can: 'c', mau: '#565c59' })}`);
}

const KHOA_MA_DA_MO = manKhoa({
  dy: 0, cao2: 722, ghi: 2236,
  dem: chu(540, 832, 115.5, 'Khoá sau 0:39', { can: 'c', w: 700, ls: -0.02, st: 'font-feature-settings:"tnum"' }),
  oMa: chu(540, 1726, 63, 'Mã 6 số', { can: 'c', mau: '#565c59', ls: 0.25 }),
  bao: chu(122, 2046, 36.75, 'Đã mở 60 phút (tới 20:31). Chơi vui nhé!', { mau: '#0a5246' }),
});
const KHOA_MA_OFFLINE = manKhoa({
  dy: 70, cao2: 652, ghi: 2166,
  dem: chu(540, 851, 63, 'Chờ Ba Mẹ mở', { can: 'c', w: 700, ls: -0.02 }),
  oMa: chu(540, 1732, 63, '000000', { can: 'c', mau: '#565c59', ls: 0.25 }),
});

// ---------------------------------------------------------------- màn chính (ManChinh) — xếp dọc như LinearLayout
// Số nguyên như G.dp()/ClayDrawable (toInt): dp16=42, dp6=15, dp4=10, dp44=115, dp56=147; TextView includeFontPadding:
// cao một dòng = (top 1,056 + bottom 0,271)·cỡ, baseline = đỉnh + 1,056·cỡ.
const PX = (v) => Math.trunc(v * D);
const SP = (v) => v * D;
const TOP = 1.056, CAO1 = 1.327;

function manChinh(cuon) {
  let y = 128 + 42 + 3; // inset thanh trạng thái + đệm cột 16dp (+3 đo được)
  const X0 = 42, X1 = 1038;
  const out = [];
  const dong = (x, base, co, s, o) => out.push(chu(x, base, co, s, o));
  // hàng tiêu đề khối: viên tròn 44dp (lề bóng 10/5/10/26) + chữ đậm canh giữa dọc
  const dau = (xL, hinh, s, nen, co, mau) => {
    const f = SP(co), cao = 146, giua = y + cao / 2;
    out.push(khoi('tron', xL + 10, y + 5, 115, 115, { nen }));
    out.push(fl(hinh, xL + 10 + 24, y + 5 + 24, 67));
    dong(xL + 135 + PX(8), giua - (CAO1 * f) / 2 + TOP * f, f, s, { w: 700, mau, ls: co >= 24 ? -0.02 : 0 });
    y += cao + 10;
  };
  const text = (x, s, co, mau, o = {}) => {
    const f = SP(co);
    dong(x, y + (o.padT || 0) + TOP * f, f, s, { mau, w: o.dam ? 700 : 400, ls: co >= 24 ? -0.02 : 0 });
    y += (o.padT || 0) + CAO1 * f + (o.padB || 0);
  };
  // nút 56dp: khối (lề bóng 10/5/10/26), cao bố cục 178 + lề trên 15
  const nut = (x, w, s, kieu, mau) => {
    out.push(khoi(kieu, x + 10, y + 15 + 5, w - 20, 147));
    out.push(`<div class="t" style="left:${x + 10}px;top:${y + 20}px;width:${w - 20}px;font:700 ${SP(16)}px/147px ${FONT};color:${mau};text-align:center">${s}</div>`);
  };
  const hangNut = (ds) => {
    const W = 872, n = ds.length, khe = 7, w = (W - khe * (n - 1)) / n;
    ds.forEach(([s, kieu, mau], i) => nut(104 + i * (w + khe), w, s, kieu, mau));
    y += 15 + 178;
  };
  const nut1 = (s, kieu, mau) => { nut(104, 872, s, kieu, mau); y += 15 + 178; };

  dau(X0, 'la', 'AiiGrow', '#dcebe6', 20, '#0a5246');
  text(X0 + 10, 'Chào Bin!', 30, '#0f1312', { dam: true, padB: 15 });
  text(X0, 'Chế độ thử cục bộ (bản debug) — không gọi máy chủ', 13, '#b45309');

  // thẻ ngọc: lề thẻ (15,7,15,42) + đệm 20dp=52
  y += 15;
  const t1 = y, i1 = out.length;
  y += 7 + 52;
  dau(X0 + 67, 'mat_troi', 'Giờ giải trí còn lại hôm nay', '#dcebe6', 15, 'rgba(255,255,255,.93)');
  text(X0 + 67, '90 phút', 48, '#fff', { dam: true });
  text(X0 + 67, 'Con còn 90 phút giải trí hôm nay.', 16, '#fff');
  y += CAO1 * SP(14) + 52;
  out.splice(i1, 0, khoi('ngoc', 57, t1 + 7, 966, y - t1 - 7, { bo: 32 }));
  y += 42;

  // thẻ «Việc của con»: lề (15,7,15,42) + đệm 18dp=47
  y += 15;
  const t2 = y, i2 = out.length;
  y += 7 + 47;
  dau(104, 'la', 'Việc của con', '#dcebe6', 20, '#0f1312');
  text(104, 'Chế độ thử: không gọi máy chủ.', 15, '#565c59');
  hangNut([['Nhiệm vụ', 'vien', '#0a5246'], ['Nộp bài', 'vien', '#0a5246']]);
  hangNut([['Phần quà', 'vien', '#0a5246'], ['Ví quà', 'vien', '#0a5246']]);
  nut1('Chơi bằng điểm', 'ngoc', '#fff');
  y += 31;
  dau(104, 'gio_tay', 'Lời nhắn của Ba Mẹ', '#fbecc0', 17, '#0f1312');
  y += 47;
  out.splice(i2, 0, khoi('the', 57, t2 + 7, 966, y - t2 - 7));
  y += 42;

  // thẻ «Xin Ba Mẹ thêm giờ»
  y += 15;
  const t3 = y, i3 = out.length;
  y += 7 + 47;
  dau(104, 'gio_tay', 'Xin Ba Mẹ thêm giờ', '#fbecc0', 20, '#0f1312');
  hangNut([['30 phút', 'ngoc', '#fff'], ['60 phút', 'vien', '#0a5246'], ['2 giờ', 'vien', '#0a5246']]);
  y += 26;
  out.push(khoi('lom', 104, y, 872, 147));
  dong(146, y + 73.5 - (CAO1 * SP(16)) / 2 + TOP * SP(16), SP(16), 'Lời nhắn cho Ba Mẹ (không bắt buộc)', { mau: '#565c59' });
  y += 147;
  nut1('Gửi Ba Mẹ', 'than', '#fff');
  y += 36;
  text(104, 'Hoặc đổi điểm lấy thời gian', 17, '#0f1312', { dam: true });
  text(104, 'Chọn trò con muốn chơi:', 15, '#565c59');
  nut1('YouTube', 'ngoc', '#fff');
  nut1('Đổi điểm', 'than', '#fff');
  y += 47;
  out.splice(i3, 0, khoi('the', 57, t3 + 7, 966, y - t3 - 7));

  // vùng cuộn: dưới thanh trạng thái (128) tới trên thanh cử chỉ (2337)
  return trang(`<div class="nen"></div>
  <div style="position:absolute;left:0;top:128px;width:1080px;height:2209px;overflow:hidden"><div style="position:absolute;left:0;top:${-128 - cuon}px;width:1080px;height:4000px">${out.join('')}</div></div>
  ${thanhTrangThai()}${vachDieuHuong()}`);
}

// ---------------------------------------------------------------- ManTre: WebView mở app Con (Expo web, font Inter) ở tab Nhiệm vụ, tải hỏng
// (ui.tsx › ChoTai/CanhGiua: Rob «trong-loi» + bong bóng + nút viền «Thử lại»; thanh tab nổi 4 mục). Toạ độ px thiết bị, chữ = cỡ css × 2,625.
const INTER = "Inter,'Helvetica Neue',Arial,sans-serif";
const iconTab = {
  nha: '<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  sao: '<path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/>',
  qua: '<path d="M3.5 8.5h17v4h-17zM5 12.5h14V21H5z" fill="none" stroke-width="2" stroke="currentColor"/><path d="M12 8.5V21" stroke-width="2" stroke="currentColor"/><path d="M12 8.3C10.5 5 7 4.3 6.6 6.4 6.3 8 9 8.5 12 8.3Zm0 0c1.5-3.3 5-4 5.4-1.9.3 1.6-2.4 2.1-5.4 1.9Z" fill="none" stroke-width="2" stroke="currentColor"/>',
  chat: '<path d="M12 3c5 0 9 3.6 9 8s-4 8-9 8c-1.3 0-2.5-.2-3.6-.6L4 20l1.2-3.8C3.8 14.8 3 13 3 11c0-4.4 4-8 9-8Z"/><circle cx="8" cy="11" r="1.3" fill="#fff"/><circle cx="12" cy="11" r="1.3" fill="#fff"/><circle cx="16" cy="11" r="1.3" fill="#fff"/>',
};
const tab = (cx, ten, ic, chon) => `<svg viewBox="0 0 24 24" style="position:absolute;left:${cx - 32}px;top:${2158}px;width:64px;height:64px;fill:${chon ? '#0a5246' : '#3a403d'};color:${chon ? '#0a5246' : '#3a403d'}">${iconTab[ic]}</svg>
  <div class="t" style="left:${cx - 200}px;width:400px;text-align:center;top:${2266 - 0.93 * 37}px;font:600 37px/1 ${INTER};color:${chon ? '#0a5246' : '#3a403d'}">${ten}</div>`;

const TRE_WEBVIEW = trang(`<div class="k" style="left:0;top:128px;width:1080px;height:2209px;background:linear-gradient(180deg,#fff0c7 0,#f5f3ee 720px,#f4f4f2 980px,#f4f4f2)"></div>
  ${anh('/assets/rob/trong-loi.webp', 339, 163, 402, 'height:571px')}
  <div class="k" style="left:262px;top:770px;width:556px;height:210px;border-radius:66px;background:#fff;box-shadow:0 8px 14px -4px rgba(40,44,42,.22),0 2px 4px rgba(40,44,42,.08)"></div>
  <div class="k" style="left:521px;top:752px;width:38px;height:22px;background:#fff;clip-path:polygon(50% 0,100% 100%,0 100%)"></div>
  <div class="t" style="left:40px;width:1000px;text-align:center;top:${859 - 0.97 * 52.5 - 6}px;font:700 52.5px/64px ${INTER};color:#0f1312;letter-spacing:-.01em">Chưa tải được</div>
  <div class="t" style="left:40px;width:1000px;text-align:center;top:${927 - 0.97 * 39.4 - 6}px;font:400 39.4px/52px ${INTER};color:#3a403d">Nhập mã PIN để vào nhé</div>
  <div class="k" style="left:74px;top:1014px;width:932px;height:132px;border-radius:66px;background:linear-gradient(180deg,#fff 0,#fff 45%,#f6f6f4 52%,#f1f1ef 100%);box-shadow:inset 0 -5px 0 rgba(255,255,255,.7),0 10px 16px -6px rgba(40,44,42,.25),0 2px 4px rgba(40,44,42,.08)"></div>
  <div class="t" style="left:40px;width:1000px;text-align:center;top:${1093 - 0.97 * 42 - 6}px;font:700 42px/54px ${INTER};color:#0f1312">Thử lại</div>
  <div class="k" style="left:26px;top:2119px;width:1028px;height:191px;border-radius:80px;background:linear-gradient(180deg,#fff,#fdfdfd 50%,#ececec);box-shadow:0 -6px 18px rgba(40,44,42,.08),0 8px 14px -4px rgba(40,44,42,.25)"></div>
  <div class="k" style="left:292px;top:2134px;width:248px;height:160px;border-radius:56px;background:#d6e2de"></div>
  ${tab(166, 'Nhà', 'nha')}${tab(416, 'Nhiệm vụ', 'sao', true)}${tab(666, 'Cửa hàng', 'qua')}${tab(914, 'Xin phép', 'chat')}
  ${thanhTrangThai('#fff', '#ecebe7')}${vachDieuHuong('#5e5e5c')}`,
  '');

// ---------------------------------------------------------------- nhắc «Còn 5 phút» (NhacGio → thông báo heads-up) trên màn hình chính Pixel
// Hình nền + biểu tượng app của launcher dựng xấp xỉ bằng CSS/SVG (không phải giao diện AiiGrow); phần AiiGrow là thẻ thông báo.
const GMAIL = '<path d="M5 9v16h5V14l8 6 8-6v11h5V9l-13 9.5z" fill="#ea4335"/><path d="M5 9v16h5V13z" fill="#4285f4"/><path d="M26 13v12h5V9z" fill="#34a853"/><path d="M26 13l5-4v3z" fill="#fbbc04"/>';
const iconApp = {
  gmail: `<svg viewBox="0 0 36 34">${GMAIL}</svg>`,
  photos: '<svg viewBox="0 0 36 36"><path d="M18 18H8a10 10 0 0 1 10-10z" fill="#ea4335"/><path d="M18 18V8a10 10 0 0 1 10 10z" fill="#4285f4"/><path d="M18 18h10a10 10 0 0 1-10 10z" fill="#34a853"/><path d="M18 18v10A10 10 0 0 1 8 18z" fill="#fbbc04"/></svg>',
  youtube: '<svg viewBox="0 0 36 36"><rect x="5" y="9" width="26" height="18" rx="5" fill="#f00"/><path d="M15 13.5v9l8-4.5z" fill="#fff"/></svg>',
  phone: '<svg viewBox="0 0 36 36"><path d="M12 8c1 0 2.6 3.4 3 4.6.3 1-1.6 2.3-1.6 3 .6 2 3.6 5 5.6 5.7.8.1 2-1.9 3-1.6 1.2.4 4.6 2 4.6 3 0 1.3-1.6 3.8-3.4 3.8C16 26.5 9.5 20 9 12c0-1.8 2-4 3-4z" fill="#0b57d0"/></svg>',
  msg: '<svg viewBox="0 0 36 36"><path d="M8 11a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-6l-7 6 1-6a5 5 0 0 1-3-5z" fill="#0b57d0"/><rect x="11" y="12" width="14" height="5" rx="2.5" fill="#a8c7fa"/></svg>',
  chrome: '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="13" fill="#b3b3b3"/><circle cx="18" cy="18" r="7" fill="#fff"/><circle cx="18" cy="18" r="5.2" fill="#b3b3b3"/></svg>',
  gmail2: `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#f6c9c4"/><circle cx="18" cy="18" r="13.5" fill="#fff"/><g transform="translate(6 7) scale(.66)">${GMAIL}</g></svg>`,
};
const oApp = (cx, cy, ic, nhan) => `<div class="k" style="left:${cx - 78}px;top:${cy - 78}px;width:156px;height:156px;border-radius:50%;background:#fff"></div>
  <div class="k" style="left:${cx - 78}px;top:${cy - 78}px;width:156px;height:156px">${iconApp[ic].replace('<svg ', '<svg style="width:156px;height:156px" ')}</div>
  ${nhan ? chu(cx, 1727, 39, nhan, { can: 'c', mau: '#fff' }) : ''}`;

const NHAC_5_PHUT = trang(`<div class="k" style="inset:0;background:#0f0f19"></div>
  <svg style="position:absolute;left:0;top:0;width:1080px;height:1000px" viewBox="0 0 1080 1000"><defs>
    <linearGradient id="nen" x1=".2" y1=".1" x2=".62" y2=".86"><stop offset="0" stop-color="#dfe2ee"/><stop offset=".45" stop-color="#d4d9ea"/><stop offset=".8" stop-color="#93acdb"/><stop offset="1" stop-color="#6a87c2"/></linearGradient>
    <filter id="mo"><feGaussianBlur stdDeviation="3"/></filter><filter id="mo2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="80"/></filter></defs>
    <path id="vet" filter="url(#mo)" fill="#7f9ad3" d="M-300-300H1400V150H1080L1070 210 1040 360 1020 383C990 410 970 425 960 431 930 445 910 460 900 458 870 452 850 448 840 450 800 458 760 472 720 490 690 505 670 520 660 530 630 560 610 585 600 594 570 625 555 640 540 654 500 677 470 694 420 723 380 745 360 755 300 785 240 807 120 842 60 854L0 858-300 860Z"/><path filter="url(#mo2)" fill="#dadeee" transform="translate(0 -230)" d="M-300-300H1400V150H1080L1070 210 1040 360 1020 383C990 410 970 425 960 431 930 445 910 460 900 458 870 452 850 448 840 450 800 458 760 472 720 490 690 505 670 520 660 530 630 560 610 585 600 594 570 625 555 640 540 654 500 677 470 694 420 723 380 745 360 755 300 785 240 807 120 842 60 854L0 858-300 860Z"/></svg>
  <div class="k" style="left:0;top:0;width:1080px;height:128px;background:linear-gradient(180deg,rgba(150,153,160,.3),rgba(200,203,212,0))"></div>
  <svg style="position:absolute;left:66px;top:47px;width:30px;height:32px" viewBox="0 0 30 32"><path d="M15 31V15M15 15C15 8 9 4 3 4c0 7 5 11 12 11Zm0 0c0-7 6-11 12-11 0 7-5 11-12 11Z" fill="none" stroke="#fff" stroke-width="4.2" stroke-linejoin="round"/></svg>
  ${chu(124, 77, 37, 'AiiGrow Con', { mau: '#fff' })}
  <svg style="position:absolute;left:889px;top:46px;width:44px;height:34px" viewBox="0 0 44 34"><path d="M22 32 1 9a30 30 0 0 1 42 0z" fill="#fff"/></svg>
  <svg style="position:absolute;left:933px;top:46px;width:34px;height:34px" viewBox="0 0 34 34"><path d="M33 1v32H1z" fill="#fff"/></svg>
  <svg style="position:absolute;left:982px;top:42px;width:22px;height:40px" viewBox="0 0 22 40"><rect x="1" y="4" width="20" height="35" rx="3" fill="#fff"/><rect x="7" y="0" width="8" height="5" rx="1.5" fill="#fff"/><path d="M12 10 6 23h5l-1 9 6-13h-5z" fill="#c8cad2"/></svg>
  <div class="k" style="left:42px;top:149px;width:996px;height:218px;border-radius:72px;background:#e8e7ef;box-shadow:0 4px 14px rgba(0,0,0,.18)"></div>
  <div class="k" style="left:84px;top:226px;width:61px;height:61px;border-radius:50%;background:#00775e"></div>
  <svg style="position:absolute;left:101px;top:242px;width:27px;height:29px" viewBox="0 0 30 32"><path d="M15 31V15M15 15C15 8 9 4 3 4c0 7 5 11 12 11Zm0 0c0-7 6-11 12-11 0 7-5 11-12 11Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>
  ${chu(181, 239, 42, 'Còn 5 phút', { mau: '#1b1b21' })}
  ${chu(370, 239, 34, '• now', { mau: '#46464f' })}
  <svg style="position:absolute;left:463px;top:213px;width:30px;height:30px" viewBox="0 0 24 24"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11c0-3-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 8 6 11v5l-2 2v1h16v-1z" fill="#46464f"/><path d="M3 6.5 6 4M21 6.5 18 4" stroke="#46464f" stroke-width="1.8"/></svg>
  ${chu(181, 296, 39, 'Lưu bài đang làm nhé. Cần thêm giờ thì m…', { mau: '#46464f' })}
  <div class="k" style="left:932px;top:228px;width:64px;height:64px;border-radius:50%;background:#d3d2da"></div>
  <svg style="position:absolute;left:946px;top:242px;width:36px;height:36px" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="#1b1b21" stroke-width="2.4"/></svg>
  ${oApp(416, 1586, 'gmail', 'Gmail')}${oApp(663, 1586, 'photos', 'Photos')}${oApp(910, 1586, 'youtube', 'YouTube')}
  ${oApp(168, 1970, 'phone')}${oApp(416, 1970, 'msg')}${oApp(663, 1970, 'chrome')}${oApp(910, 1970, 'gmail2')}
  <div class="k" style="left:90px;top:2140px;width:900px;height:134px;border-radius:67px;background:#fff"></div>
  <div class="t" style="left:132px;top:2170px;font:500 72px/72px Arial,sans-serif;background:conic-gradient(from -45deg at 50% 55%,#ea4335 0 25%,#fbbc04 0 37%,#34a853 0 62%,#4285f4 0);-webkit-background-clip:text;color:transparent">G</div>
  <svg style="position:absolute;left:765px;top:2172px;width:50px;height:70px" viewBox="0 0 20 28"><rect x="6" y="1" width="8" height="15" rx="4" fill="#4285f4"/><path d="M3 12a7 7 0 0 0 14 0" fill="none" stroke="#34a853" stroke-width="2"/><path d="M10 19v6" stroke="#fbbc04" stroke-width="2.4"/><path d="M10 25v2" stroke="#ea4335" stroke-width="2.4"/></svg>
  <svg style="position:absolute;left:880px;top:2172px;width:68px;height:68px" viewBox="0 0 24 24"><path d="M3 9V5a2 2 0 0 1 2-2h4" fill="none" stroke="#4285f4" stroke-width="2.2"/><path d="M15 3h4a2 2 0 0 1 2 2v4" fill="none" stroke="#ea4335" stroke-width="2.2"/><path d="M21 15v4a2 2 0 0 1-2 2h-4" fill="none" stroke="#fbbc04" stroke-width="2.2"/><path d="M9 21H5a2 2 0 0 1-2-2v-4" fill="none" stroke="#34a853" stroke-width="2.2"/><circle cx="12" cy="12" r="3.4" fill="#4285f4"/><circle cx="17" cy="16.5" r="1.4" fill="#ea4335"/></svg>
  ${vachDieuHuong('#e6e6ea')}`);

export default [
  { key: 'android-nhac-5-phut', w: 360, h: 800, dsf: 3, html: NHAC_5_PHUT, anh: 'man-android-2510/nhac-con-5-phut.png' },
  { key: 'android-tre-webview', w: 360, h: 800, dsf: 3, html: TRE_WEBVIEW.replace('family=Roboto:', 'family=Inter:wght@400;600;700&family=Roboto:'), anh: 'man-android-2510/man-tre-webview.png' },
  { key: 'android-chinh-viec-cua-con', w: 360, h: 800, dsf: 3, html: manChinh(0), anh: 'man-android-2510/man-chinh-viec-cua-con.png' },
  { key: 'android-chinh-doi-diem', w: 360, h: 800, dsf: 3, html: manChinh(1244), anh: 'man-android-2510/man-chinh-doi-diem.png' },
  { key: 'android-khoa-ma-da-mo', w: 360, h: 800, dsf: 3, html: KHOA_MA_DA_MO, anh: 'man-android-2510/man-khoa-ma-da-mo.png' },
  { key: 'android-khoa-ma-offline', w: 360, h: 800, dsf: 3, html: KHOA_MA_OFFLINE, anh: 'man-android-2510/man-khoa-ma-offline.png' },
];
