// Bộ cài Windows (AiiGrow-Setup.exe, agent-win/src/AiiGrow.Setup/SetupForm.cs) — dựng khớp ảnh man-win-2510/100/cai-*.png (723×672, 100% DPI).
// Mỗi dòng chữ đặt theo đỉnh nét chữ đo trên ảnh thật (dong(lop, yNet, chữ)); xuống dòng đúng chỗ ảnh thật xuống dòng.
import { tai, thanhTieuDe, nut, MAU, FONT_WIN } from './khung-win.js';

const W = 723, H = 672;
const CSS = `
.buoc{position:absolute;left:37px;top:50px;font:700 13.33px/18px ${FONT_WIN};color:${MAU.ngoc}}
.tien{position:absolute;left:33px;top:75px;width:640px;height:6px;background:#e6e6e6;border:solid #bcbcbc;border-width:0 1px}
.tien i{display:block;height:100%;background:#0f7b0f}
.d{position:absolute;white-space:nowrap}
.h{font:700 25.33px/34px ${FONT_WIN};color:${MAU.chu}}
.p{letter-spacing:-.1px;font:400 14.67px/21px ${FONT_WIN};color:${MAU.chu}}
.p2{letter-spacing:-.22px;font:400 14px/19.5px ${FONT_WIN};color:${MAU.chu2}}
.b{font:700 14.67px/21px ${FONT_WIN};color:${MAU.chu}}
.b12{font:700 16px/21px ${FONT_WIN};color:${MAU.chu}}
.loi{font:700 14.67px/21px ${FONT_WIN};color:${MAU.loi}}
.ngoc{font:700 14.67px/21px ${FONT_WIN};color:${MAU.ngoc}}
.tick{display:inline-block;width:14px;height:12px;margin:0 18px 0 2px;vertical-align:-1px}
.the{position:absolute;left:39px;width:628px;border-radius:20px;background:linear-gradient(180deg,#fefefe 0,#fbfbfa 12px,#f7f6f3 32px,#f7f6f3 45%,#efeeeb 100%);box-shadow:0 3px 0 -1px #d4d3cf,0 5px 6px rgba(40,40,35,.14)}
.the.chon{background:linear-gradient(180deg,#fdfefd 0,#fdfdfd 5px,#e2eeea 20px,#dcebe6 24px,#dcebe6 70%,#d3e2dd 100%);box-shadow:inset 0 0 0 2.5px ${MAU.ngoc},0 3px 0 -1px #c8ccc8,0 5px 6px rgba(40,40,35,.14)}
.the b{position:absolute;left:21px;top:16px;font:700 16.67px/22px ${FONT_WIN};white-space:nowrap}
.the span{position:absolute;left:21px;top:42px;letter-spacing:-.18px;font:400 14px/19px ${FONT_WIN};color:${MAU.chu2};white-space:nowrap}
.lom{position:absolute;left:39px;width:318px;border-radius:20px;background:linear-gradient(180deg,#dadad5 0,#e1e0db 6px,#e9e8e3 12px,#e9e8e3 100%);box-shadow:inset 0 -1px 0 #f4f3f1}
.lom.ngoc{background:linear-gradient(180deg,#cedcd8 0,#d6e5e0 6px,#dcebe6 12px,#dcebe6 100%);box-shadow:inset 0 -1px 0 #edf5f2}
.o{position:absolute;width:13px;height:13px;border:1px solid #333;border-radius:50%}
.vuong{position:absolute;width:13px;height:13px;border-radius:2px;background:#005fb8}
.cuon{position:absolute;left:704px;top:90px;width:17px;height:504px;background:#f0f0f0;border-left:1px solid #fff}
.cuon i{position:absolute;left:8px;width:2px;background:#858585}
.thanh{position:absolute;left:33px;top:151px;width:640px;height:14px;background:#e6e6e6;border:1px solid #bcbcbc}
.w .nut.ngoc{box-shadow:0 1px 0 #26443f,0 3px 4px rgba(30,40,35,.22)}
.chan{position:absolute;left:0;right:0;bottom:0;height:76px;background:${MAU.the};border-top:1px solid #d9e2df}
`;
// độ lệch từ đỉnh hộp dòng tới đỉnh nét chữ (đo bằng lechdong.py)
const OFF = { h: 7, p: 4, p2: 3, b: 4, b12: 3, loi: 4, ngoc: 4 };
const dong = (lop, y, html, x = 37, st = '') => `<div class="d ${lop}" style="left:${x}px;top:${y - (OFF[lop] || 0)}px;${st}">${html}</div>`;
const TICK = '<svg class="tick" viewBox="0 0 14 12"><path d="M1.2 6.6l3.6 3.7L12.8 1.6" fill="none" stroke="#0f1312" stroke-width="2.6" stroke-linejoin="round"/></svg>';
const tk = (s) => TICK + s;

const khung = (buoc, pct, body, trai, phai, o = {}) => tai(`${thanhTieuDe('Cài AiiGrow', W, { toiDaMo: true })}
  <div class="buoc">${buoc}</div><div class="tien"><i style="width:${pct}%"></i></div>
  ${body}${o.cuon ? `<div class="cuon"><i style="top:${o.cuon[0] - 90}px;height:${o.cuon[1] - o.cuon[0] + 1}px"></i></div>` : ''}
  <div class="chan">${trai ? nut(36, 14, 124, trai, 'trang') : ''}${phai ? nut(686 - (phai[1] || 214), 14, phai[1] || 214, phai[0], 'ngoc') : ''}</div>`, W, H, CSS);

const TIEU_TK = `${dong('h', 107, 'Con mở máy bằng tài khoản nào?', 38)}
  ${dong('p', 150, 'Tài khoản Windows là tên đăng nhập khi mở máy. Con nên có tài khoản riêng để AiiGrow quản<br>lý giờ chơi của Con mà không ảnh hưởng tài khoản của Ba Mẹ.')}`;
const the2 = (chon1) => `<div class="the ${chon1 ? 'chon' : ''}" style="top:203px;height:77px"><b>Con đã có tài khoản riêng trên máy này</b><span>Chọn cái này nếu khi mở máy, Con bấm vào tên của Con (khác tên của Ba Mẹ) để vào.</span></div>
  <div class="the ${chon1 ? '' : 'chon'}" style="top:305px;height:96px"><b>Máy chưa có tài khoản riêng cho Con</b><span>Chọn cái này nếu cả nhà dùng chung một tài khoản, hoặc Con đang dùng tài khoản của Ba<br>Mẹ. AiiGrow tạo tài khoản mới cho Con, tài khoản của Ba Mẹ giữ nguyên.</span></div>
  ${dong('p2', 427, 'Không chắc? Chọn «Máy chưa có tài khoản riêng cho Con» — an toàn nhất.')}`;

const CHAO = khung('Bước 1/5 · Chào Ba Mẹ', 20, `${dong('h', 108, 'Cài AiiGrow lên máy của Con', 38)}
  ${dong('p', 149, 'Mất khoảng 2 phút. AiiGrow hướng dẫn từng bước, Ba Mẹ chỉ cần bấm Tiếp.')}
  ${dong('p', 183, tk('Ba Mẹ đặt giờ chơi, giờ học, giờ ngủ ngay trên điện thoại'), 38)}
  ${dong('p', 214, tk('Con làm việc tốt → được điểm → đổi phút chơi trò chơi, phiếu quà'), 38)}
  ${dong('p', 246, tk('Con luôn thấy biểu tượng AiiGrow ở góc màn hình — không có gì giấu Con'), 38)}
  ${dong('p2', 278, 'Chuẩn bị: điện thoại có app AiiGrow (vào aiigrow.aiilab.vn nếu chưa có) để lấy mã ghép máy 6 số.')}`,
'', ['Bắt đầu']);

const DIEU_KHOAN = khung('Bước 2/5 · Điều khoản', 40, `${dong('h', 109, 'Trước khi cài, Ba Mẹ đọc nhanh', 38)}
  ${dong('p', 150, tk('AiiGrow ghi tên app, trang web và số phút Con dùng máy để Ba Mẹ xem. Chỉ gia đình<br>mình xem được.'), 38)}
  ${dong('p', 202, tk('Không chụp màn hình, không đọc tin nhắn, không ghi bàn phím của Con.'), 38)}
  ${dong('p', 235, tk('Cài xong là chặn luôn: app chưa được Ba Mẹ xếp loại không mở được, Con bấm «Xin<br>phép Ba Mẹ» để Ba Mẹ duyệt. Ba Mẹ chuyển «Chỉ theo dõi» (không chặn) bất cứ lúc nào, ngay<br>trong app.'), 38)}
  ${dong('p', 305, tk('Gỡ được bất cứ lúc nào: Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt, cần mật khẩu máy của<br>Ba Mẹ.'), 38)}
  <div class="vuong" style="left:33px;top:369px"><svg viewBox="0 0 13 13" style="display:block"><path d="M3 6.8l2.4 2.3L10 4.2" fill="none" stroke="#fff" stroke-width="1.3"/></svg></div>
  ${dong('b', 368, 'Tôi là Ba/Mẹ (hoặc người giám hộ) của Con và đồng ý cài AiiGrow lên máy này', 53)}`,
'Quay lại', ['Tiếp']);

const CHON_TK = khung('Bước 3/5 · Tài khoản của Con', 60, `${TIEU_TK}${the2(true)}
  ${dong('b', 459, 'Chọn tài khoản của Con:')}
  ${dong('p2', 490, 'Tài khoản của Con phải là loại giới hạn: Con không tự tắt hay gỡ AiiGrow, không chỉnh giờ máy được.<br>Nếu Con đang dùng loại toàn quyền, AiiGrow đổi sang giới hạn — gỡ AiiGrow thì trả lại như cũ.')}
  <div class="o" style="left:37px;top:553px"></div>
  ${dong('p', 544, 'BaMe&nbsp; (bạn đang dùng)<br>Toàn quyền — kiểu tài khoản của Ba Mẹ', 57, 'font-size:16px;letter-spacing:-.4px')}`,
'Quay lại', ['Tiếp'], { cuon: [108, 496] });

const TAO_TK = khung('Bước 3/5 · Tài khoản của Con', 60, `${TIEU_TK}${the2(false)}
  ${dong('b', 458, 'Tên đăng nhập của Con — gõ không dấu, không khoảng trắng, ví dụ: bin')}
  <div class="lom" style="top:490px;height:44px"></div>${dong('p', 505, 'minhkhoi', 54, 'font-size:17.33px')}
  ${dong('b', 549, 'Mật khẩu Con gõ khi mở máy — ít nhất 4 ký tự. Ba Mẹ ghi lại giúp Con nhớ.')}
  <div class="lom" style="top:581px;height:44px"></div>`,
'Quay lại', ['Tạo tài khoản'], { cuon: [108, 500] });

const MOT_TK = khung('Bước 3/5 · Tài khoản của Con', 60, `${dong('h', 108, 'Máy cần một tài khoản riêng của Ba Mẹ', 39)}
  ${dong('p', 149, 'Máy này chỉ có MỘT tài khoản toàn quyền, chính là «Minh Khoi». Nếu đổi nó thành giới hạn,<br>máy không còn ai cài đặt hay gỡ AiiGrow được nữa — nên AiiGrow không đổi.')}
  ${dong('b12', 202, 'Cách dễ nhất (khuyên dùng):')}
  ${dong('p', 236, 'Bấm «Quay lại» → chọn «Máy chưa có tài khoản riêng cho Con» → AiiGrow tạo tài khoản mới<br>cho Con. Tài khoản «Minh Khoi» giữ làm tài khoản của Ba Mẹ.')}
  ${dong('b12', 289, 'Nếu muốn Con giữ tài khoản «Minh Khoi», tạo trước một tài khoản toàn quyền<br>cho Ba Mẹ:')}
  ${dong('p', 342, '1.&nbsp; Bấm nút Start (logo Windows) → Settings (Cài đặt, hình bánh răng).')}
  ${dong('p', 374, '2.&nbsp; Chọn Accounts (Tài khoản) → Other users (Người dùng khác) → Add account (Thêm tài<br>khoản).')}
  ${dong('p', 426, '3.&nbsp; Bấm «I don\'t have this person\'s sign-in information», rồi «Add a user without a Microsoft<br>account».')}
  ${dong('p', 477, '4.&nbsp; Đặt tên cho Ba Mẹ (vd: bame) và mật khẩu → Next.')}
  ${dong('p', 509, '5.&nbsp; Bấm vào tài khoản vừa tạo → Change account type (Đổi loại tài khoản) → chọn<br>Administrator → OK.')}
  ${dong('p', 562, '6.&nbsp; Chạy lại AiiGrow-Setup.exe, đến bước này chọn «Minh Khoi» cho Con.')}`,
'Quay lại', ['Quay lại chọn', 194]);

const MA = (sai) => khung('Bước 4/5 · Ghép máy', 80, `${dong('h', 109, 'Nhập mã ghép máy cho minhkhoi', 39)}
  ${dong('p', 151, 'Trên điện thoại của Ba Mẹ, mở app AiiGrow → bước «Ghép máy» (hoặc Hồ sơ Con › Ghép thêm<br>máy). App hiện mã 6 số — gõ vào ô dưới. Mã hết hạn sau 15 phút.')}
  <div class="lom ngoc" style="top:206px;height:64px;width:260px"></div>
  ${sai ? '<div class="d" style="left:119px;top:216px;width:1px;height:47px;background:#000"></div>' : ''}
  ${dong('p', 216, sai ? '48291' : '482915', sai ? 120 : 109, 'font:700 34.67px/46px ' + FONT_WIN + ';margin-top:-6px;color:#000')}
  ${sai ? dong('loi', 289, 'Mã ghép gồm đúng 6 chữ số.') : ''}`,
'Quay lại', ['Ghép và cài đặt']);

const BUOC5 = ['Ghép máy với điện thoại của Ba Mẹ', 'Tài khoản minhkhoi là loại giới hạn', 'Cài dịch vụ AiiGrow', 'Biểu tượng AiiGrow + lời chào khi mở máy'];
const CAI = (loi) => khung('Bước 5/5 · Cài đặt', 100, `${dong('h', 109, 'Đang cài AiiGrow…', 39)}
  <div class="thanh"></div>
  ${BUOC5.map((s, i) => dong('p2', [185, 211, 238, 262][i], `<span style="display:inline-block;width:10px;height:10px;border:1.3px solid #3a403d;border-radius:50%;margin:0 14px 0 2px;vertical-align:0"></span>${s}`, 37, 'letter-spacing:0;font-size:14.67px')).join('')}
  ${loi ? dong('loi', 289, 'Chưa cài được: Mã đã hết hạn — xin Ba Mẹ mã mới') : dong('ngoc', 288, 'Đừng tắt máy trong lúc cài.')}`,
loi ? 'Quay lại' : '', loi ? ['Thử lại', 134] : null);

const XONG = khung('Bước 5/5 · Xong', 100, `${dong('h', 108, 'Xong rồi! AiiGrow đã ở trên máy', 38)}
  ${dong('p', 151, tk('Máy đã ghép với điện thoại của Ba Mẹ — xem ngay trong app AiiGrow'), 38)}
  ${dong('p', 183, tk('Tài khoản minhkhoi của Con là loại giới hạn'), 38)}
  ${dong('p', 214, tk('Biểu tượng AiiGrow nằm ở góc phải thanh tác vụ và trong menu Start'), 38)}
  ${dong('p2', 246, 'Bước cuối: chuyển sang tài khoản của minhkhoi (máy chỉ khoá màn hình, không đăng xuất —<br>việc đang mở của bạn vẫn giữ nguyên). Muốn gỡ: Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt.', 37, 'font-size:14.67px;letter-spacing:0;line-height:20px')}`,
'Để sau', ['Chuyển sang tài khoản Con', 254]);

const A = (f) => `man-win-2510/100/${f}.png`;
export default [
  { key: 'cai-chao', w: W, h: H, html: CHAO, anh: A('cai-1-chao') },
  { key: 'cai-dieu-khoan', w: W, h: H, html: DIEU_KHOAN, anh: A('cai-2-dieu-khoan') },
  { key: 'cai-chon-tai-khoan', w: W, h: H, html: CHON_TK, anh: A('cai-3-chon-tai-khoan') },
  { key: 'cai-tao-tai-khoan', w: W, h: H, html: TAO_TK, anh: A('cai-3-tao-tai-khoan') },
  { key: 'cai-chi-mot-tai-khoan-quan-tri', w: W, h: H, html: MOT_TK, anh: A('cai-3-chi-mot-tai-khoan-quan-tri') },
  { key: 'cai-ma-ghep', w: W, h: H, html: MA(false), anh: A('cai-4-ma-ghep') },
  { key: 'cai-ma-ghep-sai', w: W, h: H, html: MA(true), anh: A('cai-4-ma-ghep-sai') },
  { key: 'cai-dang-cai', w: W, h: H, html: CAI(false), anh: A('cai-5-dang-cai') },
  { key: 'cai-loi-ghep', w: W, h: H, html: CAI(true), anh: A('cai-5-loi-ghep') },
  { key: 'cai-xong', w: W, h: H, html: XONG, anh: A('cai-6-xong') },
];
