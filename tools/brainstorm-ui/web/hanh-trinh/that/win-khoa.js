// Màn khoá toàn màn hình Windows (LockForm) — dựng khớp ảnh man-win-2510/100/khoa-*.png (1920×1080, 100% DPI).
// Số đo lấy bằng PIL từ ảnh; bố cục từ agent-win/src/AiiGrow.Tray/LockForm.cs: nền gradient dọc #134a41→#072420 + quầng ngọc
// ellipse giữa màn, thẻ Clay sáng bo 36, icon ổ khoá 96 viền vàng, nút Clay thân 56 rộng 394.
import { tai, MAU, FONT_WIN } from './khung-win.js';

const F = FONT_WIN;
const W = 1920, H = 1080;
const CSS = `
.w{border:0;background:radial-gradient(ellipse 576px 405px at 960px 459px,rgba(95,201,178,.275) 0,rgba(95,201,178,0) 100%),linear-gradient(180deg,#134a41 0,#072420 100%)}
.a{position:absolute;white-space:nowrap}
.the{position:absolute;border-radius:36px;background:linear-gradient(180deg,#fefefe 0,#fdfdfd 1%,#f9f9f7 18%,#f7f6f3 31%,#f7f6f3 52%,#f1f0ed 76%,#eae9e7 100%);
  box-shadow:inset 0 -1px 0 #e0dfdc,inset 0 -2px 0 #e6e5e2,0 2px 6px rgba(0,0,0,.12)}
.dia{position:absolute;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 50% 30%,#fffdf8 0,rgba(253,250,240,.9) 14px,rgba(251,236,192,0) 34px),#fbecc0;
  box-shadow:0 0 0 1px rgba(150,140,120,.18),0 3px 4px rgba(60,60,50,.22)}
.dia img{position:absolute;left:18px;top:17px;width:60px;height:60px}
.cb{position:absolute;height:56px;border:0;padding:0;border-radius:22px;display:flex;align-items:center;justify-content:center;font:700 18.67px/24px ${F};white-space:nowrap;
  box-shadow:0 2px 0 0 #c3c5c1,0 4px 0 0 #d0d2ce,0 6px 0 0 #dfdfdb,-1px 0 1px #d6d6d2,1px 0 1px #d6d6d2}
.cb.g{color:#fff;background:radial-gradient(ellipse 45% 26px at 50% 55px,rgba(98,132,124,.8),rgba(98,132,124,.4) 55%,rgba(98,132,124,0) 100%),
  linear-gradient(180deg,#b7c5c2 0,#cfd8d6 1px,#90a8a2 2px,#6a8b84 14px,#547c73 15px,#196559 15px,#0a4239 53px,#063229 54px,#063529 56px)}
.cb.m{color:#fff;background:linear-gradient(180deg,#bfcbc8 0,#d4dcda 1px,#9eb2ad 2px,#718e87 14px,#577d75 15px,#546560 54px,#536460 56px)}
.cb.t{color:${MAU.chu};background:linear-gradient(180deg,#fefefe 0,#fcfcfb 2px,#f7f6f3 16px,#f7f6f3 32px,#eeedea 52px,#e1e0dd 54px,#e3e2df 56px)}
.cb img{width:24px;height:24px;margin-right:5px}
.lom{position:absolute;border-radius:20px;background:#e9e8e3;box-shadow:inset 0 10px 8px -6px rgba(140,138,130,.35),inset 0 -2px 0 #f4f3f1;display:flex;align-items:center;justify-content:center;font:700 21.33px ${F};color:#6d6d6d}
`;

const a = (x, y, html, st) => `<div class="a" style="left:${x}px;top:${y}px;${st}">${html}</div>`;
const cb = (x, y, w, chu, loai, ic, st = '') => `<button class="cb ${loai}" style="left:${x}px;top:${y}px;width:${w}px;${st}">${ic ? `<img src="/assets/win/fluent/${ic}.png" alt="">` : ''}<span>${chu}</span></button>`;
const muted = MAU.chu3;

// o: x,y,w,h thẻ; tieuDe, goiY; demNguoc (chuỗi) ⇒ thêm số đếm + "máy sẽ khoá sau"; matMang ⇒ ô mã của Ba Mẹ; mo ⇒ nút xin mờ
function khoa(o) {
  const { x, y, w, h } = o;
  const L = x + 55;
  let n = y + 259;
  let giua = '';
  if (o.demNguoc) {
    giua = a(x + 70, y + 260, o.demNguoc, `font:700 74.67px/100px ${F};color:${MAU.ngoc}`)
      + a(x + 57, y + 371, 'máy sẽ khoá sau', `font:400 18.67px/25px ${F};color:${muted}`);
    n = y + 408;
  }
  const nut = cb(L, n, 394, 'Xin thêm thời gian', o.mo ? 'm' : 'g', 'hourglass_not_done')
    + cb(L, n + 69, 394, 'Ba Mẹ dùng máy', 't', 'key')
    + a(x + 58, n + 140, 'Ba Mẹ cần máy? Bấm nút này hoặc Win+L', `font:400 17.33px/24px ${F};color:${muted}`)
    + cb(L, n + 175, 394, 'Lưu bài và đăng xuất', 't');
  const mm = o.matMang ? a(x + 56, n + 253, 'Mất mạng? Nhập mã của Ba Mẹ', `font:700 14.67px/20px ${F}`)
    + `<div class="lom" style="left:${x + 58}px;top:${n + 286}px;width:150px;height:48px">6 số</div>`
    + cb(x + 225, n + 286, 90, 'Mở', 'g', 'key', 'height:49px') : '';
  return tai(`<div class="the" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>
  <div class="dia" style="left:${x + 58}px;top:${y + 40}px"><img src="/assets/win/fluent/locked.png" alt=""></div>
  ${a(x + 61, y + 155, o.tieuDe, `font:700 40px/53px ${F}`)}
  ${a(x + 57, y + 220, o.goiY, `font:400 21.33px/28px ${F};color:${muted}`)}
  ${giua}${nut}${mm}
  ${a(24, 1040, 'AiiGrow · máy này do bố mẹ quản lý', `font:400 16px/21px ${F};color:#c6dcd6`)}`, W, H, CSS);
}

const anh = (k) => `man-win-2510/100/${k}.png`;
export default [
  { key: 'khoa-het-gio-dem-nguoc', w: W, h: H, anh: anh('khoa-het-gio-dem-nguoc'), html: khoa({ x: 613, y: 165, w: 694, h: 679,
    tieuDe: 'Hết giờ dùng máy hôm nay', goiY: 'Lưu bài đang làm nhé. Con có thể xin bố mẹ thêm thời gian.', demNguoc: '0:45' }) },
  { key: 'khoa-gio-ngu', w: W, h: H, anh: anh('khoa-gio-ngu'), html: khoa({ x: 642, y: 240, w: 635, h: 530, mo: true,
    tieuDe: 'Đến giờ nghỉ rồi', goiY: 'Máy sẽ mở lại khi hết giờ nghỉ. Cần gấp thì xin bố mẹ.' }) },
  { key: 'khoa-ba-me-khoa', w: W, h: H, anh: anh('khoa-ba-me-khoa'), html: khoa({ x: 632, y: 240, w: 656, h: 530, mo: true,
    tieuDe: 'Máy đang được bố mẹ khoá', goiY: 'Con có thể nhắn xin bố mẹ mở máy.' }) },
  { key: 'khoa-mat-mang', w: W, h: H, anh: anh('khoa-mat-mang'), html: khoa({ x: 613, y: 174, w: 694, h: 661, matMang: true,
    tieuDe: 'Hết giờ dùng máy hôm nay', goiY: 'Lưu bài đang làm nhé. Con có thể xin bố mẹ thêm thời gian.' }) },
];
