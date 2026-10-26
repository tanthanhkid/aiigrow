// Hộp thoại khay Windows (BlockedForm, NopBaiForm, ChoiBangDiemForm, RequestForm) — dựng khớp ảnh man-win-2510/100/*.png (100% DPI).
// Số đo lấy bằng PIL từ ảnh; chữ/cỡ chữ từ agent-win/src/AiiGrow.Tray. Nút Clay: thân 44, bo 20, men bóng trên + quầng sáng đáy.
import { tai, MAU, FONT_WIN } from './khung-win.js';

const F = FONT_WIN;
const CSS = `
.tb2{position:absolute;left:0;right:0;top:0;height:30px;background:#f3f3f3}
.tb2 .ten{position:absolute;left:9px;top:7px;font:400 12px/16px ${F};color:#1a1a1a;white-space:nowrap}
.tb2 .x{position:absolute;right:-1px;top:0;width:46px;height:30px}
.tb2 .do{position:absolute;right:1px;top:7px;width:19px;height:19px;background:#c75050}
.tb2 .do::after{content:'';position:absolute;left:8px;top:8px;width:3px;height:3px;background:#fff;box-shadow:-2px -2px 0 -0.5px #fff,2px -2px 0 -0.5px #fff,-2px 2px 0 -0.5px #fff,2px 2px 0 -0.5px #fff}
.ct{position:absolute;left:0;right:0;top:30px;bottom:0}
.a{position:absolute;white-space:nowrap}
.cb{position:absolute;height:44px;border:0;padding:0;border-radius:20px;display:flex;align-items:center;justify-content:center;font:700 15.33px/20px ${F};white-space:nowrap;
  box-shadow:0 2px 0 0 #bdbfba,0 4px 0 0 #cbcdc9,0 6px 0 0 #dcdcd8,-1.5px 0 1px #d6d6d2,1.5px 0 1px #d6d6d2}
.cb.g{color:#fff;background:radial-gradient(ellipse 47% 22px at 50% 43px,rgba(98,132,124,.82),rgba(98,132,124,.45) 55%,rgba(98,132,124,0) 100%),linear-gradient(180deg,#b7c4c1 0,#8fa7a1 1px,#8ba39d 2px,#658680 10px,#457569 11px,#196558 12px,#0b433a 42px,#063329 43px,#063329 44px)}
.cb.t{color:${MAU.chu};background:linear-gradient(180deg,#fefefe 0,#fcfcfb 2px,#f7f6f3 13px,#f7f6f3 26px,#efeeeb 40px,#e9e8e5 41px,#e1e0dd 42px,#e3e2df 44px)}
.cb img{width:24px;height:24px;margin-right:9px}
.cb span{position:relative;z-index:1}
.ico{position:absolute;width:41px;height:41px;border-radius:50%;background:radial-gradient(circle at 50% 18%,#fcf6ef 0,#f9e9d6 45%,#f9e7d2 60%,#f5e3cf 100%);box-shadow:0 2px 2px rgba(80,70,60,.28),0 0 1px rgba(80,70,60,.3)}
.ico img{position:absolute;left:9px;top:9px;width:23px;height:23px}
.lom{position:absolute;border-radius:20px;background:#e9e8e3;box-shadow:inset 0 10px 8px -6px rgba(140,138,130,.35),inset 0 -2px 0 #f4f3f1;display:flex;align-items:center;justify-content:center;font:700 21.33px ${F};color:#6d6d6d}
.vb{position:absolute;background:#fff;border:1px solid #646464;font:400 14.67px/21px ${F};color:${MAU.chu};padding:2px 5px;white-space:nowrap}
.sel{background:#0078d4;color:#fff}
`;

// cửa sổ khay: viền 1px (máy chụp thấy nền desktop xanh ở mép), thanh tiêu đề 30px; dong = 'x' (FixedDialog) | 'do' (FixedToolWindow)
const hop = (ten, w, h, body, dong = 'x') => tai(`<div class="tb2"><span class="ten">${ten}</span>${dong === 'do'
  ? '<span class="do"></span>'
  : '<svg class="x" viewBox="0 0 46 30"><path d="M18.2 10.2l9.6 9.6M27.8 10.2l-9.6 9.6" stroke="#1a1a1a" stroke-width="1.05"/></svg>'}</div>
  <div class="ct">${body}</div>`, w, h, `${CSS}.w{border-color:#363c55}`);

const a = (x, y, html, st) => `<div class="a" style="left:${x - 1}px;top:${y - 31}px;${st}">${html}</div>`;
// nút Clay: x,y = góc trên trái THÂN nút (toạ độ ảnh)
const cb = (x, y, w, chu, g, ic, st = '') => `<button class="cb ${g ? 'g' : 't'}" style="left:${x - 1}px;top:${y - 31}px;width:${w}px;${st}">${ic ? `<img src="/assets/win/fluent/${ic}.png" alt="">` : ''}<span>${chu}</span></button>`;
const muted = MAU.chu3;

// ---------- Màn chặn (BlockedForm, 388 rộng) ----------
const chan = (h, ten, lyDo, nuts, o = {}) => hop('AiiGrow', 388, h, `
  <div class="ico" style="left:26px;top:${51 - 31}px"><img src="/assets/win/fluent/stop_sign.png" alt=""></div>
  ${a(87, o.tenY || 57, ten, `font:700 17.33px/${o.tenLh || 30}px ${F}`)}
  ${a(25, o.lyY || 104, lyDo, `font:400 14.67px/20px ${F};color:${muted}`)}
  ${nuts}`, 'do');

const CHAN_APP = chan(397, 'Roblox chưa được mở', 'App này chưa được Ba Mẹ phân loại',
  cb(27, 135, 334, 'Dùng điểm để chơi', true, 'star') + cb(27, 192, 334, 'Xin phép Ba Mẹ', false, 'speech_balloon')
  + cb(27, 249, 334, 'Xin mở hẳn app này', false, 'puzzle_piece') + cb(27, 306, 334, 'Đóng', false));

const CHAN_HET_DIEM = chan(352, 'Minecraft Launcher chưa được<br>mở', 'Hết điểm chơi hôm nay',
  cb(27, 147, 334, 'Dùng điểm để chơi', true, 'star') + cb(27, 204, 334, 'Xin phép Ba Mẹ', false, 'speech_balloon')
  + cb(27, 261, 334, 'Đóng', false), { tenLh: 31, lyY: 114 });

const CHAN_MAT_MANG = chan(414, 'Roblox chưa được mở', 'App này chưa được Ba Mẹ phân loại',
  cb(27, 135, 334, 'Xin phép Ba Mẹ', true, 'speech_balloon')
  + a(26, 196, 'Mất mạng? Nhập mã của Ba Mẹ', `font:700 14.67px/20px ${F}`)
  + `<div class="lom" style="left:28px;top:${231 - 31}px;width:148px;height:49px">6 số</div>`
  + cb(193, 231, 91, 'Mở', true, 'key', 'height:49px') + cb(27, 324, 334, 'Đóng', false));

// ---------- Nộp bài (NopBaiForm, 465×522) ----------
const NOP_VIET = hop('AiiGrow · Nộp bài', 465, 522, `
  ${a(25, 48, 'Đọc 20 trang «Dế Mèn phiêu lưu ký»', `font:700 18.67px/26px ${F}`)}
  ${a(25, 80, 'Đọc xong kể lại cho Ba Mẹ nghe nhân vật con thích nhất và vì<br>sao.', `font:400 14px/21.5px ${F};color:${muted}`)}
  ${a(25, 127, 'Con viết vài câu kể lại nhé', `font:400 14px/20px ${F};color:${muted}`)}
  <div class="vb" style="left:23px;top:${156 - 31}px;width:400px;height:90px"><span class="sel">Con thích nhất Dế Mèn vì bạn ấy dũng cảm, biết nhận lỗi</span><br><span class="sel">sau khi trêu chị Cốc làm Dế Choắt bị hại.</span></div>
  ${cb(27, 254, 394, 'Nộp cho Ba Mẹ', true, 'memo')}`);

const NOP_ANH = hop('AiiGrow · Nộp bài', 465, 522, `
  ${a(25, 48, 'Tưới cây ngoài ban công', `font:700 18.67px/26px ${F}`)}
  ${a(25, 80, 'Tưới đủ năm chậu, nhớ tưới cả chậu hoa giấy ở góc.', `font:400 14px/20px ${F};color:${muted}`)}
  ${a(25, 105, 'Ba Mẹ nhắn: Ảnh hơi mờ, con chụp lại giúp Ba Mẹ nhé —<br>chụp cả năm chậu cây.', `font:700 14px/19.5px ${F};color:${MAU.canh}`)}
  ${a(25, 154, 'Ghi chú cho Ba Mẹ (không bắt buộc)', `font:400 14px/20px ${F};color:${muted}`)}
  <div class="vb" style="left:23px;top:${183 - 31}px;width:400px;height:90px"><span style="display:inline-block;width:1px;height:17px;background:#000;margin-top:2px"></span></div>
  ${cb(27, 281, 394, 'Chọn ảnh…', false, 'desktop_computer')}
  ${a(25, 334, 'Đã chọn: tuoi-cay-ban-cong-chup-lai.jpg', `font:400 13.33px/18px ${F};color:${muted}`)}
  ${cb(27, 365, 394, 'Nộp cho Ba Mẹ', true, 'memo')}`);

// ---------- Chơi bằng điểm (ChoiBangDiemForm, 465×378) ----------
const CHOI = hop('AiiGrow · Chơi bằng điểm', 465, 378, `
  ${a(24, 47, 'Chơi bằng điểm', `font:700 18.67px/26px ${F}`)}
  ${a(23, 79, 'Mỗi app đổi điểm lấy số phút khác nhau — con xem số<br>phút ở từng nút.', `font:400 14.67px/21px ${F};color:${muted}`)}
  ${[['Roblox', 18], ['Minecraft', 18], ['Youtube.com', 12]].map(([t, p], i) => cb(25, 132 + 57 * i, 394, `Chơi ${t} · ≈ ${p} phút`, true, 'video_game')).join('')}
  ${cb(25, 303, 394, 'Đóng', false)}`);

// ---------- Xin thêm giờ (RequestForm, 428 rộng) ----------
const chip = (x, chu, chon) => cb(x, 87, 114, chu, chon, null);
const xinGio = (h, note, doiDiem) => hop('AiiGrow · Xin thêm thời gian', 428, h, `
  ${a(25, 48, 'Con muốn thêm bao lâu?', `font:700 21.33px/30px ${F}`)}
  ${chip(27, '30 phút')}${chip(153, '1 giờ', true)}${chip(279, '2 giờ')}
  ${a(25, 147, 'Nhắn bố mẹ (không bắt buộc)', `font:400 14px/20px ${F};color:${muted}`)}
  <div class="vb" style="left:23px;top:${176 - 31}px;width:380px;height:64px">${note}</div>
  ${cb(27, 254, 374, 'Xin bố mẹ', true, 'speech_balloon')}
  ${doiDiem ? cb(27, 311, 374, 'Đổi điểm lấy thời gian', false, 'star') : ''}`);

const XIN_GIO = xinGio(345, 'Con đang làm dở bài thuyết trình nhóm môn Khoa học,<br>xin Ba Mẹ thêm 1 giờ ạ.', false);
const XIN_GIO_CHAN = xinGio(402, '', true);

const P = (f) => `man-win-2510/100/${f}.png`;
export default [
  { key: 'nop-bai-viet', w: 465, h: 522, html: NOP_VIET, anh: P('nop-bai-viet') },
  { key: 'nop-bai-anh-bo-sung', w: 465, h: 522, html: NOP_ANH, anh: P('nop-bai-anh-bo-sung') },
  { key: 'choi-bang-diem', w: 465, h: 378, html: CHOI, anh: P('choi-bang-diem') },
  { key: 'chan-app', w: 388, h: 397, html: CHAN_APP, anh: P('chan-app') },
  { key: 'chan-app-het-diem', w: 388, h: 352, html: CHAN_HET_DIEM, anh: P('chan-app-het-diem') },
  { key: 'chan-app-mat-mang', w: 388, h: 414, html: CHAN_MAT_MANG, anh: P('chan-app-mat-mang') },
  { key: 'xin-them-gio', w: 428, h: 345, html: XIN_GIO, anh: P('xin-them-gio') },
  { key: 'xin-them-gio-tu-man-chan', w: 428, h: 402, html: XIN_GIO_CHAN, anh: P('xin-them-gio-tu-man-chan') },
];
