// App chính máy Con trên Windows (AiiGrow.Tray/AppForm.cs) — dựng khớp ảnh man-win-2510/100/app-*.png (1002×712, 100% DPI).
// Bố cục tuyệt đối theo số đo ảnh; chữ: Segoe UI → Helvetica Neue (cùng bề rộng dòng). Asset thật: /assets/win/{fluent,mascot}.
import { tai, thanhTieuDe, FONT_WIN, MAU } from './khung-win.js';

const W = 1002, H = 712;
const F = FONT_WIN;
const CSS = `
.w{border-color:#859eae #363636 #4378a5 #899faf}
.x{position:absolute;white-space:nowrap;line-height:1}
.ben{position:absolute;left:17px;top:44px;width:272px;height:649px;border-radius:32px;background:linear-gradient(180deg,#fff 0,#f9f8f6 18%,#f7f6f3 40%,#f4f3f0 75%,#ebeae7 100%);box-shadow:-1px 0 2px rgba(60,60,50,.10),1px 0 2px rgba(60,60,50,.10),0 3px 1px -1px rgba(150,150,140,.55),0 6px 9px rgba(60,60,50,.18)}
.rob{position:absolute;object-fit:contain}
.pill{position:absolute;left:33px;top:315px;width:205px;height:50px;background:#dcebe6}
.pill.do{background:#fdeceb}
.nav{position:absolute;left:36px;width:234px;height:48px;border-radius:24px}
.nav.dang{background:linear-gradient(180deg,#cedcd8 0,#dcebe6 10px,#dcebe6 40px,#ecf4f1 46px,#f4f4f1 48px)}
.nav img{position:absolute;left:14px;top:12px;width:24px;height:24px}
.nav span{position:absolute;left:46px;top:0;font:700 17.33px/1 ${F};white-space:pre}
.the{position:absolute;border-radius:28px;background:linear-gradient(180deg,#fff 0,#f7f6f3 58px,#f7f6f3 60%,#ebeae7 100%);box-shadow:-3px 0 2px -2px rgba(60,60,50,.13),3px 0 2px -2px rgba(60,60,50,.13),0 2px 0 0 rgba(190,190,185,.75),0 5px 6px 0 rgba(60,60,50,.18)}
.the.loi{background:linear-gradient(180deg,#fff 0,#fdf0ef 58px,#fdf0ef 60%,#f6e6e5 100%)}
.b{position:absolute;height:49px;border-radius:24px;border:0;padding:0;display:flex;align-items:center;justify-content:center;font:700 16px/1 ${F};white-space:nowrap;box-shadow:0 1px 0 0 rgba(170,170,165,.6),0 4px 4px 0 rgba(60,60,50,.2)}
.b img{width:24px;height:24px;margin-right:8px}
.b.ngoc{color:#fff;background:linear-gradient(180deg,#8fa7a1 0,#6b8c84 12px,#196559 13px,#125347 31px,#1c5446 33px,#3a5f55 45px,#2e4b45 47px,#324f4c 49px)}
.b.trang{color:${MAU.chu};background:linear-gradient(180deg,#fff 0,#f7f6f3 15px,#f6f5f2 30px,#edece9 46px,#e3e2df 49px)}
.b.do{color:#fff;background:linear-gradient(180deg,#c88a86 0,#a85d58 12px,#8e211b 13px,#7a1a14 31px,#8a2a24 40px,#a2403a 45px,#651510 49px)}
.cuon{position:absolute;left:984px;top:147px;bottom:0;width:16px;background:#f0f0f0;border-left:1px solid #fff}
.cuon i{position:absolute;left:7px;width:2px;background:#858585;border-radius:1px}
.bn{position:absolute;left:295px;top:41px;width:706px;height:84px;background:#feefee}
.bdo{position:absolute;left:794px;top:42px;width:204px;height:77px;border:0;border-radius:16px;color:#fff;font:700 16px/1 ${F};background:radial-gradient(60% 40% at 50% 100%,rgba(200,140,135,.55),rgba(200,140,135,0) 100%),linear-gradient(180deg,#ce9795 0,#b06662 20px,#a22a21 21px,#8c2219 42px,#8c2822 50px,#9a5c57 75px,#86504d 77px);box-shadow:0 1px 3px rgba(80,30,30,.25)}
`;

const ICON = (t) => `/assets/win/fluent/${t}.png`;
const x = (l, tp, html, st = '') => `<div class="x" style="left:${l}px;top:${tp}px;${st}">${html}</div>`;
const chu = (l, tp, px, w, mau, html, st = '') => x(l, tp, html, `font:${w} ${px}px/1 ${F};color:${mau};${st}`);

// ---------- thanh bên ----------
// o: {dang, rob:[ten,left,top,h], ten:[y], pill:{y,h,do,dong:[..]}, muc:[[icon,chu,y]...]}
const MUC4 = [['alarm_clock', 'Hôm nay'], ['memo', 'Nhiệm vụ   (4)'], ['wrapped_gift', 'Phần quà & điểm'], ['speech_balloon', 'Tin nhắn   (2)']];
function ben(o) {
  const muc = o.muc || MUC4;
  const y0 = o.navY ?? 384, buoc = 60;
  const pill = o.pill || {};
  const py = pill.y ?? 315, ph = pill.h ?? 50;
  const mauPill = pill.do ? '#b42318' : MAU.ngocInk;
  const dong = pill.dong || ['● Đã kết nối · đồng bộ lúc', '04:26'];
  return `<div class="ben"></div>
  <img class="rob" src="/assets/win/mascot/${o.rob[0]}.png" style="left:${o.rob[1]}px;top:${o.rob[2]}px;height:${o.rob[3]}px;width:${o.rob[4] || 230}px" alt="">
  ${chu(40, o.tenY ?? 281, 22.67, 700, MAU.chu, 'Minh Khôi')}
  <div class="pill ${pill.do ? 'do' : ''}" style="top:${py}px;height:${ph}px;width:${pill.w || 205}px"></div>
  ${dong.map((d, i) => chu(48, py + 9 + i * 20, 14, 700, mauPill, d)).join('')}
  ${muc.map(([ic, t], i) => `<div class="nav ${i === o.dang ? 'dang' : ''}" style="top:${y0 + i * buoc}px"><img src="${ICON(ic)}" alt=""><span style="top:15px;color:${i === o.dang ? MAU.ngocInk : MAU.chu}">${t}</span></div>`).join('')}
  ${chu(37, 635, 13.75, 400, MAU.chu3, 'Máy này do Ba Mẹ quản lý bằng<br>AiiGrow', 'line-height:19px')}`;
}

const nutB = (l, tp, w, t, loai = 'trang', ic = '') => `<button class="b ${loai}" style="left:${l}px;top:${tp}px;width:${w}px">${ic ? `<img src="${ICON(ic)}" alt="">` : ''}${t}</button>`;
const the = (l, tp, w, h, cls = '') => `<div class="the ${cls}" style="left:${l}px;top:${tp}px;width:${w}px;height:${h}px"></div>`;
const cuon = (a, b, tren = 147) => `<div class="cuon" style="top:${tren}px"><i style="top:${a}px;height:${b}px"></i></div>`;
const trang = (benO, main) => tai(`${thanhTieuDe('AiiGrow', W)}${ben(benO)}${main}<div style="position:absolute;left:290px;top:707px;width:711px;height:4px;background:${MAU.nen}"></div>`, W, H, CSS);

// ---------- Hôm nay ----------
const banner = (dau, ghi) => `<div class="bn"></div>${chu(327, 53, 17.88, 700, '#b42318', dau)}${chu(326, 74, 13.55, 400, '#b42318', ghi, 'line-height:22px')}
  <button class="bdo">Thử kết nối lại</button>`;

function homNay(o = {}) {
  const d = o.dy || 0; // banner đẩy nội dung xuống
  const y = (v) => v + d;
  let m = chu(331, y(80), 29.33, 700, MAU.chu, 'Hôm nay') + chu(331, y(164), 26.67, 700, MAU.chu, 'Chào Minh Khôi!');
  if (o.dichVuTat) {
    m += the(329, y(205), 620, 92, 'loi') + chu(352, y(225), 20, 700, '#b42318', 'Dịch vụ AiiGrow không chạy') + chu(350, y(260), 15.45, 400, '#b42318', 'Khởi động lại máy. Nếu vẫn vậy, nhờ Ba Mẹ kiểm tra AiiGrow.');
    m += the(329, y(315), 620, 180) + chu(352, y(335), 18.17, 700, MAU.chu, 'Việc của con') + chu(350, y(368), 16.85, 400, MAU.chu, 'Con có 4 việc đang chờ. Làm xong để tích điểm nhé!')
      + chu(350, y(399), 17.07, 700, MAU.diemInk, '340 điểm &nbsp;·&nbsp; Cấp 3 · còn 60 điểm lên cấp')
      + nutB(349, y(423), 205, 'Xem nhiệm vụ', 'trang', 'memo') + nutB(569, y(423), 206, 'Đọc tin nhắn (2)', 'trang', 'speech_balloon');
    return m;
  }
  const h = o.moMa ? 200 : 202;
  m += the(329, y(206), 620, h) + chu(352, y(225), 16.67, 400, MAU.chu3, 'Thời gian dùng máy còn lại');
  if (o.moMa) {
    m += chu(361, y(265), 57.8, 700, '#0f6b5c', 'Không giới hạn') + chu(350, y(342), 15.25, 700, MAU.ngocInk, 'Chế độ: Tự do')
      + chu(350, y(371), 15.1, 400, '#8a3c0c', 'Đang mở tạm bằng mã của Ba Mẹ, đến 05:22.');
  } else {
    m += chu(360, y(263), 58.67, 700, '#0f6b5c', '47:29', 'letter-spacing:1px') + chu(352, y(342), 16.67, 400, MAU.chu3, 'còn hôm nay') + chu(352, y(372), 16, 700, MAU.ngocInk, 'Chế độ: Tự do');
  }
  const r = (o.moMa ? -2 : 0) - 1;
  m += nutB(326, y(425 + r), 264, 'Xin thêm thời gian', 'ngoc', 'hourglass_not_done') + nutB(606, y(425 + r), 264, 'Đổi điểm lấy thời gian', 'trang', 'star')
    + nutB(326, y(489 + r), 264, 'Xin mở trang hoặc app', 'trang', 'globe_with_meridians');
  if (o.banner) {
    m += the(329, y(555 + r), 620, 120) + chu(352, y(576 + r), 15.2, 400, MAU.chu2, 'Ba Mẹ cần máy? Bấm nút này hoặc Win+L')
      + nutB(349, y(597 + r), 264, 'Ba Mẹ dùng máy', 'trang', 'key');
  } else {
    m += nutB(326, y(552), 264, 'Chơi bằng điểm', 'trang', 'video_game')
      + chu(328, y(619), 15.2, 400, MAU.chu2, 'Điểm hiện có đổi được khoảng 18 phút chơi Roblox.')
      + the(329, y(649), 620, 120) + chu(352, y(668), 15.2, 400, MAU.chu2, 'Ba Mẹ cần máy? Bấm nút này hoặc Win+L')
      + nutB(349, y(694), 264, 'Ba Mẹ dùng máy', 'trang', 'key');
  }
  return m;
}

const BEN_THUONG = (dang, rob) => ({ dang, rob });
const ROB = {
  'rob-goc': ['rob-goc', 79, 58, 212, 149],
  'so-tay': ['so-tay', 84, 59, 210, 137],
  qua: ['qua', 64, 58, 205, 172],
  chi: ['chi', 76, 58, 212, 156],
  'trong-loi': ['trong-loi', 80, 59, 210, 147],
};
const benMatMang = (gio) => ({ dang: 0, rob: ROB['trong-loi'], pill: { do: true, dong: [`● KHÔNG kết nối máy chủ từ`, `${gio} — kiểm tra Wi-Fi`], w: 225 } });

const HOM_NAY = trang(BEN_THUONG(0, ROB['rob-goc']), homNay() + cuon(18, 355));
const MAT_MANG = trang(benMatMang('04:02'), banner('KHÔNG kết nối máy chủ từ 04:02 — kiểm tra Wi-Fi', 'Kiểm tra Wi-Fi hoặc dây mạng, rồi bấm Thử kết nối lại. Máy vẫn chạy<br>theo giờ đã lưu.')
  + homNay({ dy: 84, banner: true }) + cuon(17, 285, 233));
const MO_MA = trang(benMatMang('02:27'), banner('KHÔNG kết nối máy chủ từ 02:27 — kiểm tra Wi-Fi', 'Kiểm tra Wi-Fi hoặc dây mạng, rồi bấm Thử kết nối lại. Máy vẫn chạy<br>theo giờ đã lưu.')
  + homNay({ dy: 84, banner: true, moMa: true }) + cuon(17, 285, 233));
const DICH_VU_TAT = trang({ dang: 0, rob: ROB['trong-loi'], navY: 365, pill: { do: true, y: 315, h: 31, dong: ['● Dịch vụ AiiGrow không chạy'], w: 228 } },
  banner('Dịch vụ AiiGrow không chạy', 'Khởi động lại máy. Nếu vẫn vậy, nhờ Ba Mẹ kiểm tra AiiGrow.') + homNay({ dy: 84, dichVuTat: true }));

// ---------- Nhiệm vụ ----------
const tieuDe = (t) => chu(331, 80, 29.33, 700, MAU.chu, t);
const NHIEM_VU = trang(BEN_THUONG(1, ROB['so-tay']), tieuDe('Nhiệm vụ của con')
  + the(329, 159, 620, 223) + chu(352, 180, 18.67, 700, MAU.chu, 'Tưới cây ngoài ban công &nbsp; · &nbsp; +10 điểm')
  + chu(352, 213, 14.9, 400, MAU.chu2, 'Tưới đủ năm chậu, nhớ tưới cả chậu hoa giấy ở góc.') + chu(352, 242, 15, 400, MAU.chu2, 'Ba Mẹ nhờ bổ sung')
  + chu(352, 268, 15.76, 700, '#8a3c0c', 'Ba Mẹ nhắn: Ảnh hơi mờ, con chụp lại giúp Ba Mẹ nhé — chụp cả năm<br>chậu cây.', 'line-height:20px')
  + nutB(349, 312, 215, 'Nộp lại')
  + the(329, 403, 620, 201) + chu(352, 425, 18.67, 700, MAU.chu, 'Đọc 20 trang «Dế Mèn phiêu lưu ký» &nbsp; · &nbsp; +30 điểm')
  + chu(352, 457, 15.2, 400, MAU.chu2, 'Đọc xong kể lại cho Ba Mẹ nghe nhân vật con thích nhất và vì sao.') + chu(352, 486, 15.3, 400, MAU.chu3, 'Đang làm &nbsp;·&nbsp; Còn 4 giờ')
  + chu(352, 515, 15.35, 400, MAU.chu2, 'Làm ít nhất 20 phút rồi mới nộp được.') + nutB(349, 536, 215, 'Nộp bài')
  + the(329, 626, 620, 160) + chu(352, 648, 18.67, 700, MAU.chu, 'Dọn góc học tập &nbsp; · &nbsp; +15 điểm')
  + chu(352, 681, 15.07, 400, MAU.chu2, 'Xếp sách vở gọn gàng, lau bàn, chụp một tấm ảnh gửi Ba Mẹ.') + cuon(18, 240));

const NHIEM_VU_LOI = trang({ dang: 1, rob: ROB['so-tay'], muc: [MUC4[0], ['memo', 'Nhiệm vụ'], MUC4[2], MUC4[3]] }, tieuDe('Nhiệm vụ của con')
  + the(329, 161, 620, 149, 'loi') + chu(352, 180, 18.67, 700, '#b42318', 'Chưa tải được')
  + chu(352, 212, 16, 400, '#b42318', 'Không kết nối được máy chủ. Con kiểm tra Wi-Fi rồi bấm Thử lại nhé.') + nutB(349, 240, 175, 'Thử lại', 'ngoc'));

// ---------- Phần quà ----------
const PHAN_QUA = trang(BEN_THUONG(2, ROB.qua), tieuDe('Phần quà & điểm')
  + `<div class="the" style="left:329px;top:161px;width:620px;height:219px;background:linear-gradient(180deg,#fffdf7 0,#fdf3d6 50px,#fbecc0 70%,#f6e3ae 100%)"></div>`
  + `<div style="position:absolute;left:352px;top:182px;width:49px;height:49px;border-radius:50%;background:linear-gradient(180deg,#fff,#efeee9);box-shadow:0 2px 3px rgba(60,60,50,.25)"></div><img src="${ICON('star')}" style="position:absolute;left:363px;top:192px;width:27px;height:27px" alt="">`
  + chu(352, 242, 16.67, 400, '#6e4300', 'Điểm của con') + chu(359, 283, 44, 700, '#6e4300', '340 điểm') + chu(352, 346, 14.67, 400, '#6e4300', 'Cấp 3 · còn 60 điểm lên cấp · 20 điểm đang chờ Ba Mẹ duyệt')
  + the(329, 401, 620, 85) + chu(352, 421, 17.33, 700, MAU.chu, 'Một buổi xem phim cùng Ba &nbsp; · &nbsp; 200 điểm') + chu(352, 453, 14.67, 400, MAU.chu3, 'Đã đổi, đang chờ Ba Mẹ trao quà cho con.')
  + chu(328, 511, 18.67, 700, MAU.chu, 'Quà con có thể đổi')
  + the(329, 544, 620, 144) + chu(352, 563, 17.33, 700, MAU.chu, 'Thêm 30 phút chơi Minecraft &nbsp; · &nbsp; 120 điểm') + chu(352, 596, 14.67, 700, MAU.ngocInk, 'Đủ điểm')
  + nutB(349, 622, 215, 'Đổi quà', 'ngoc', 'wrapped_gift') + cuon(18, 330));

// ---------- Ví quà ----------
const QR = (() => {
  // mã QR 21×21 (ô 6px) lấy mẫu từ ảnh thật
  const M = ['111111100100001111111', '100000100010101000001', '101110101011101011101', '101110101001001011101', '101110101100101011101',
    '100000101011001000001', '111111101010101111111', '000000001100000000000', '101111100001001111100', '001101001011111101001',
    '011110101000101100011', '010010010001111101100', '011100111100100101011', '000000001100100100010', '111111100101010000101',
    '100000101010000011000', '101110101101010100010', '101110101111111010100', '101110101000101001100', '100000100001111010001', '111111101100100100000'];
  let s = '';
  M.forEach((r, yy) => [...r].forEach((c, xx) => { if (c === '1') s += `<rect x="${xx}" y="${yy}" width="1" height="1"/>`; }));
  return `<svg viewBox="0 0 21 21" shape-rendering="crispEdges" style="position:absolute;left:384px;top:299px;width:126px;height:126px">${s}</svg>`;
})();
const VI_QUA = trang({ dang: 4, rob: ['qua', 79, 58, 156, 131], tenY: 230, pill: { y: 265, dong: ['● Đã kết nối · đồng bộ lúc', '13:03'] }, navY: 334,
  muc: [...MUC4, ['ticket', 'Ví quà & huy hiệu']] }, chu(330, 79, 30.8, 700, MAU.chu, 'Ví quà & huy hiệu')
  + chu(327, 163, 20.4, 700, MAU.chu, 'Ví quà')
  + the(329, 195, 620, 347)
  + `<div style="position:absolute;left:352px;top:216px;width:34px;height:34px;border-radius:50%;background:#fbecc0;box-shadow:0 2px 3px rgba(60,60,50,.25)"></div><img src="${ICON('ticket')}" style="position:absolute;left:359px;top:223px;width:20px;height:20px" alt="">`
  + chu(406, 227, 20.2, 700, MAU.chu, 'Phiếu quà AiiCafe 50.000đ')
  + `<div style="position:absolute;left:347px;top:262px;width:200px;height:200px;background:#fff"></div>${QR}`
  + chu(352, 474, 21.33, 700, MAU.chu, 'AC-7K2P9Q') + chu(352, 509, 15.63, 400, MAU.chu3, 'Dùng trước 20/12/2026')
  + chu(327, 564, 15.35, 400, MAU.chu2, 'Đưa mã này cho nhân viên AiiCafe quét. Mỗi phiếu chỉ dùng một lần.')
  + the(329, 592, 620, 85) + chu(352, 612, 15.7, 700, MAU.chu, 'Một buổi xem phim cùng Ba &nbsp;·&nbsp; Chờ Ba Mẹ trao')
  + chu(352, 642, 15.48, 400, MAU.chu3, 'Phiếu quà AiiCafe 20.000đ &nbsp;·&nbsp; Đã dùng 20/10/2026')
  + chu(328, 700, 18.67, 700, MAU.chu, 'Huy hiệu & cấp') + cuon(18, 180));

// ---------- Tin nhắn ----------
const nutNho = (l, tp, w, t) => `<button class="b trang" style="left:${l}px;top:${tp}px;width:${w}px;height:42px;font-size:14.67px">${t}</button>`;
const TIN_NHAN = trang(BEN_THUONG(3, ROB.chi), tieuDe('Tin nhắn')
  + chu(328, 164, 18.67, 700, MAU.chu, 'Ba Mẹ nhắn con')
  + the(329, 197, 620, 115) + chu(352, 216, 17.33, 700, MAU.ngocInk, 'Ba Mẹ: Hôm nay con đọc sách rất chăm, Ba Mẹ tự hào về con!')
  + nutNho(349, 247, 175, 'Con cảm ơn ạ') + nutNho(539, 247, 175, 'Con sẽ cố gắng') + nutNho(729, 247, 175, 'Con yêu Ba Mẹ')
  + the(329, 333, 620, 85) + chu(352, 352, 17.33, 700, MAU.ngocInk, 'Ba Mẹ: Cuối tuần này cả nhà mình đi công viên Tao Đàn nhé.') + chu(352, 385, 14.67, 400, MAU.chu, 'Con: Con yêu Ba Mẹ')
  + chu(328, 443, 18.67, 700, MAU.chu, 'Thông báo gần đây')
  + the(329, 476, 620, 113) + chu(352, 495, 17.33, 700, MAU.chu, 'Nhiệm vụ mới: Dọn góc học tập') + chu(352, 528, 14.67, 400, MAU.chu3, 'Ba Mẹ vừa giao việc mới · +15 điểm') + chu(352, 556, 13.33, 400, MAU.chu3, '04:17 26/10')
  + the(329, 611, 620, 113) + chu(352, 630, 17.33, 700, MAU.chu, 'Ba Mẹ đã duyệt «Gấp quần áo»') + chu(352, 663, 14.67, 400, MAU.chu3, '+15 điểm. Gấp gọn lắm, cảm ơn con!') + chu(352, 691, 13.33, 400, MAU.chu3, '02:27 26/10')
  + cuon(18, 390));

const A = (f) => `man-win-2510/100/${f}.png`;
export default [
  { key: 'hom-nay', w: W, h: H, html: HOM_NAY, anh: A('app-hom-nay') },
  { key: 'nhiem-vu', w: W, h: H, html: NHIEM_VU, anh: A('app-nhiem-vu') },
  { key: 'nhiem-vu-loi-tai', w: W, h: H, html: NHIEM_VU_LOI, anh: A('app-nhiem-vu-loi-tai') },
  { key: 'phan-qua', w: W, h: H, html: PHAN_QUA, anh: A('app-phan-qua') },
  { key: 'vi-qua', w: W, h: H, html: VI_QUA, anh: A('app-vi-qua') },
  { key: 'tin-nhan', w: W, h: H, html: TIN_NHAN, anh: A('app-tin-nhan') },
  { key: 'hom-nay-mat-mang', w: W, h: H, html: MAT_MANG, anh: A('app-hom-nay-mat-mang') },
  { key: 'hom-nay-mo-bang-ma', w: W, h: H, html: MO_MA, anh: A('app-hom-nay-mo-bang-ma') },
  { key: 'hom-nay-dich-vu-tat', w: W, h: H, html: DICH_VU_TAT, anh: A('app-hom-nay-dich-vu-tat') },
];
