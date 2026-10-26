// Hành trình máy Con (Windows / Mac) — tiền tố key `cmt-`. Dựng theo ảnh aiigrow-thiet-ke/man-win-2510/100 và man-mac-2510
// + chữ thật từ agent-win / agent-mac. Dùng lại CON_HOM_NAY, CON_KHOA, CON_XIN_GIO, CON_NHIEM_VU... từ co-san.js.
import { I, P, doc, desk, ben } from '../kit/dung.js';
import { CON_HOM_NAY, CON_NHIEM_VU, CON_PHAN_QUA, CON_TIN_NHAN, CON_KHOA, CON_XIN_GIO } from './co-san.js';

const WIN = 'man-win-2510/100/';
const MAC = 'man-mac-2510/';

// ---------- khung dùng chung ----------
const CSS_WIN = `
.tb{height:32px;flex:none;background:#fbfaf8;border-bottom:1px solid #dcdad4;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font:500 13px Inter;color:var(--chu2)}
.tb b{font-weight:500;display:flex;align-items:center;gap:8px}.tb i{font:400 18px Inter;font-style:normal;color:var(--chu2);width:28px;text-align:center}
.tb .lg{width:16px;height:16px;border-radius:4px;background:var(--chinh)}
.cua{display:flex;flex-direction:column;overflow:hidden;background:var(--nen);position:relative}
.ins{width:724px;height:672px}
.ins .th{padding:22px 34px 0;flex:1;overflow:hidden;display:flex;flex-direction:column;gap:12px}
.ins .buoc{font:700 14px Inter;color:var(--chinhInk)}
.ins .vach{height:6px;border-radius:3px;background:#dedcd6;overflow:hidden}.ins .vach i{display:block;height:100%;background:var(--chinh)}
.ins h2{font:800 26px/32px Inter;letter-spacing:-.4px;margin-top:10px}
.ins p{font:500 15px/22px Inter;color:var(--chu2)}
.ins .y{display:flex;gap:12px;font:500 15.5px/22px Inter;color:var(--chu)}.ins .y svg{color:var(--chinhInk);margin-top:2px}
.ins .chan{height:92px;flex:none;background:#f9f8f5;border-top:1px solid #dcdad4;display:flex;align-items:center;justify-content:space-between;padding:0 34px}
.ins .chan .nut{min-width:140px}
.lua{border-radius:26px;padding:16px 20px;background:var(--the);box-shadow:var(--clayNho)}
.lua.chon{box-shadow:0 0 0 2.5px var(--chinh),var(--clayNho);background-color:var(--chinhSoft)}
.lua b{font:700 17px Inter;display:block}.lua span{font:500 13.5px/19px Inter;color:var(--chu2);display:block;margin-top:4px}
.o2{height:52px;border-radius:20px;background:var(--lom);box-shadow:var(--lomIn);padding:0 18px;display:flex;align-items:center;font:500 16px Inter}
.loi{font:700 14.5px Inter;color:var(--loi)}
.ma{width:260px;height:66px;border-radius:24px;background:var(--chinhSoft);box-shadow:var(--lomIn);display:flex;align-items:center;justify-content:center;font:800 38px Inter;letter-spacing:4px}
.ds5 li{list-style:none;display:flex;gap:10px;align-items:center;font:500 15.5px Inter;min-height:30px}.ds5 .v{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--chu2);flex:none}
.hn{padding:18px 22px;flex:1;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.hn h3{font:800 21px/27px Inter;letter-spacing:-.3px}
.hn .lb{font:500 14px Inter;color:var(--chu3)}
.hn textarea,.hn .vb{min-height:92px;border-radius:6px;border:1px solid #6f6e6a;background:#fff;padding:8px 10px;font:500 15px/21px Inter;color:var(--chu)}
.cam{color:var(--canh);font:700 14.5px/20px Inter}
.hn .nut{min-height:52px;width:100%}
.hn .nut.nho{min-height:46px}
.banh{display:flex;gap:10px}.banh .chip{flex:1;justify-content:center;padding:0;min-height:46px}
.bn{display:flex;align-items:center;gap:16px;background:#fde9e7;border-radius:0 0 0 0;padding:12px 18px;margin:-28px 0 0 -2px}
.bn .t{flex:1;min-width:0}.bn b{display:block;font:800 16px/21px Inter;color:#a8261a}.bn span{font:500 13px/18px Inter;color:#b3382c}
.bn .nut{background:linear-gradient(180deg,#b3382c,#7d1a11);min-height:46px;width:170px;flex:none}
.ket-noi.do{background:#fde9e7;color:#a8261a}
.khoa .the{padding:20px 24px;display:flex;flex-direction:column;gap:12px}
.khoa .nut{min-height:50px}
.khoa .dem-so{font:800 72px/80px Inter;color:var(--chinhInk);letter-spacing:-2px}
.mt{display:flex;flex-direction:column;gap:12px}
`;

const thanh = (ten, w) => `<div class="tb"><b>${ten.startsWith('AiiGrow') && !ten.includes('·') ? '<span class="lg"></span>' : ''}${ten}</b><i>×</i></div>`;
const cua = (w, h, ten, body, css = '') => doc(`${thanh(ten)}${body}`, 'cua', `${CSS_WIN}.cua{width:${w}px;height:${h}px}${css}`);

const tick = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const y = (t) => `<div class="y">${tick}<span>${t}</span></div>`;
const btn = (t, c = 'ngoc', st = '') => `<button class="nut ${c}" style="${st}">${t}</button>`;

// Bộ cài Windows 724×672
const ins = (buoc, pct, tieu, body, trai, phai) => doc(`${thanh('Cài AiGrow')}<div class="th"><div class="buoc">${buoc}</div><div class="vach"><i style="width:${pct}%"></i></div><h2>${tieu}</h2>${body}</div>
  <div class="chan"><div>${trai || ''}</div><div>${phai || ''}</div></div>`, 'cua ins', CSS_WIN);

const quayLai = btn('Quay lại', 'vien');

// ---------- 1. Cài trên Windows ----------
const CAI_1 = ins('Bước 1/5 · Chào Ba Mẹ', 20, 'Cài AiGrow lên máy của Con', `<p>Mất khoảng 2 phút. AiiGrow hướng dẫn từng bước, Ba Mẹ chỉ cần bấm Tiếp.</p>
  ${y('Ba Mẹ đặt giờ chơi, giờ học, giờ ngủ ngay trên điện thoại')}${y('Con làm việc tốt → được điểm → đổi phút chơi trò chơi, phiếu quà')}${y('Con luôn thấy biểu tượng AiiGrow ở góc màn hình — không có gì giấu Con')}
  <p style="font-size:14px;color:var(--chu3)">Chuẩn bị: điện thoại có app AiiGrow (vào aiigrow.aiilab.vn nếu chưa có) để lấy mã ghép máy 6 số.</p>
  <img src="/assets/rob/rob-goc.webp" alt="" style="position:absolute;right:30px;top:300px;width:200px;height:230px;object-fit:contain">`, '', btn('Bắt đầu'));

const CAI_2 = ins('Bước 2/5 · Điều khoản', 40, 'Trước khi cài, Ba Mẹ đọc nhanh', `
  ${y('AiiGrow ghi tên app, trang web và số phút Con dùng máy để Ba Mẹ xem. Chỉ gia đình mình xem được.')}
  ${y('Không chụp màn hình, không đọc tin nhắn, không ghi bàn phím của Con.')}
  ${y('Cài xong là chặn luôn: app chưa được Ba Mẹ xếp loại không mở được, Con bấm «Xin phép Ba Mẹ» để Ba Mẹ duyệt. Ba Mẹ chuyển «Chỉ theo dõi» (không chặn) bất cứ lúc nào, ngay trong app.')}
  ${y('Gỡ được bất cứ lúc nào: Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt, cần mật khẩu máy của Ba Mẹ.')}
  <div class="hang" style="margin-top:10px;font:700 15px Inter"><span style="width:18px;height:18px;border-radius:4px;background:var(--chinh);color:#fff;display:flex;align-items:center;justify-content:center;flex:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" style="width:14px;height:14px"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>Tôi là Ba/Mẹ (hoặc người giám hộ) của Con và đồng ý cài AiiGrow lên máy này</div>`, quayLai, btn('Tiếp'));

const lua2 = (a, b, tenA, moA, tenB, moB) => `<div class="lua ${a ? 'chon' : ''}"><b>${tenA}</b><span>${moA}</span></div><div class="lua ${b ? 'chon' : ''}"><b>${tenB}</b><span>${moB}</span></div>`;
const CAI_3 = ins('Bước 3/5 · Tài khoản của Con', 60, 'Con mở máy bằng tài khoản nào?', `<p>Tài khoản Windows là tên đăng nhập khi mở máy. Con nên có tài khoản riêng để AiiGrow quản lý giờ chơi của Con mà không ảnh hưởng tài khoản của Ba Mẹ.</p>
  ${lua2(1, 0, 'Con đã có tài khoản riêng trên máy này', 'Chọn cái này nếu khi mở máy, Con bấm vào tên của Con (khác tên của Ba Mẹ) để vào.', 'Máy chưa có tài khoản riêng cho Con', 'Chọn cái này nếu cả nhà dùng chung một tài khoản, hoặc Con đang dùng tài khoản của Ba Mẹ. AiiGrow tạo tài khoản mới cho Con, tài khoản của Ba Mẹ giữ nguyên.')}
  <p style="font-size:13.5px;color:var(--chu3)">Không chắc? Chọn «Máy chưa có tài khoản riêng cho Con» — an toàn nhất.</p>
  <p style="font-weight:700;color:var(--chu)">Chọn tài khoản của Con:</p>
  <p style="font-size:13px;line-height:18px">Tài khoản của Con phải là loại giới hạn: Con không tự tắt hay gỡ AiiGrow, không chỉnh giờ máy được. Nếu Con đang dùng loại toàn quyền, AiiGrow đổi sang giới hạn — gỡ AiiGrow thì trả lại như cũ.</p>`, quayLai, btn('Tiếp'));

const CAI_3_TAO = ins('Bước 3/5 · Tài khoản của Con', 60, 'Con mở máy bằng tài khoản nào?', `<p>Tài khoản Windows là tên đăng nhập khi mở máy. Con nên có tài khoản riêng để AiiGrow quản lý giờ chơi của Con mà không ảnh hưởng tài khoản của Ba Mẹ.</p>
  ${lua2(0, 1, 'Con đã có tài khoản riêng trên máy này', 'Chọn cái này nếu khi mở máy, Con bấm vào tên của Con (khác tên của Ba Mẹ) để vào.', 'Máy chưa có tài khoản riêng cho Con', 'Chọn cái này nếu cả nhà dùng chung một tài khoản, hoặc Con đang dùng tài khoản của Ba Mẹ. AiiGrow tạo tài khoản mới cho Con, tài khoản của Ba Mẹ giữ nguyên.')}
  <p style="font-size:13.5px;color:var(--chu3)">Không chắc? Chọn «Máy chưa có tài khoản riêng cho Con» — an toàn nhất.</p>
  <p style="font-weight:700;color:var(--chu);font-size:14px">Tên đăng nhập của Con — gõ không dấu, không khoảng trắng, ví dụ: bin</p>
  <div class="o2" style="width:320px">minhkhoi</div>
  <p style="font-weight:700;color:var(--chu);font-size:14px">Mật khẩu Con gõ khi mở máy — ít nhất 4 ký tự. Ba Mẹ ghi lại giúp Con nhớ.</p>
  <div class="o2" style="width:320px">••••••</div>`, quayLai, btn('Tạo tài khoản'));

const CAI_3_MOT = ins('Bước 3/5 · Tài khoản của Con', 60, 'Máy cần một tài khoản riêng của Ba Mẹ', `
  <p>Máy này chỉ có MỘT tài khoản toàn quyền, chính là «Minh Khoi». Nếu đổi nó thành giới hạn, máy không còn ai cài đặt hay gỡ AiiGrow được nữa — nên AiiGrow không đổi.</p>
  <p style="font-weight:700;color:var(--chu)">Cách dễ nhất (khuyên dùng):</p>
  <p>Bấm «Quay lại» → chọn «Máy chưa có tài khoản riêng cho Con» → AiiGrow tạo tài khoản mới cho Con. Tài khoản «Minh Khoi» giữ làm tài khoản của Ba Mẹ.</p>
  <p style="font-weight:700;color:var(--chu)">Nếu muốn Con giữ tài khoản «Minh Khoi», tạo trước một tài khoản toàn quyền cho Ba Mẹ:</p>
  <p style="font-size:14px;line-height:21px">1. Bấm nút Start (logo Windows) → Settings (Cài đặt, hình bánh răng).<br>2. Chọn Accounts (Tài khoản) → Other users (Người dùng khác) → Add account (Thêm tài khoản).<br>3. Bấm «I don't have this person's sign-in information», rồi «Add a user without a Microsoft account».<br>4. Đặt tên cho Ba Mẹ (vd: bame) và mật khẩu → Next.<br>5. Bấm vào tài khoản vừa tạo → Change account type → chọn Administrator → OK.<br>6. Chạy lại AiiGrow-Setup.exe, đến bước này chọn «Minh Khoi» cho Con.</p>`, quayLai, btn('Quay lại chọn', 'ngoc', 'min-width:190px'));

const CAI_4 = (sai) => ins('Bước 4/5 · Ghép máy', 80, 'Nhập mã ghép máy cho minhkhoi', `<p>Trên điện thoại của Ba Mẹ, mở app AiiGrow → bước «Ghép máy» (hoặc Hồ sơ Con › Ghép thêm máy). App hiện mã 6 số — gõ vào ô dưới. Mã hết hạn sau 15 phút.</p>
  <div class="ma">${sai ? '48291' : '482915'}</div>${sai ? '<div class="loi">Mã ghép gồm đúng 6 chữ số.</div>' : ''}`, quayLai, btn('Ghép và cài đặt', 'ngoc', 'min-width:200px'));

const CAI_5 = (loi) => ins('Bước 5/5 · Cài đặt', 100, 'Đang cài AiiGrow…', `<div class="vach" style="height:14px;border-radius:2px;background:#e1e0dc;margin-top:4px"></div>
  <ul class="ds5" style="padding:0;display:flex;flex-direction:column;gap:4px;margin-top:6px">${['Ghép máy với điện thoại của Ba Mẹ', 'Tài khoản minhkhoi là loại giới hạn', 'Cài dịch vụ AiiGrow', 'Biểu tượng AiiGrow + lời chào khi mở máy'].map((t) => `<li><span class="v"></span>${t}</li>`).join('')}</ul>
  ${loi ? '<div class="loi">Chưa cài được: Mã đã hết hạn — xin Ba Mẹ mã mới</div>' : '<div style="font:700 14.5px Inter;color:var(--chinhInk)">Đừng tắt máy trong lúc cài.</div>'}
  <img src="/assets/rob/${loi ? 'trong-loi' : 'hoc'}.webp" alt="" style="position:absolute;right:34px;top:330px;width:190px;height:210px;object-fit:contain">`, loi ? quayLai : '', loi ? btn('Thử lại', 'ngoc') : '');

const CAI_6 = ins('Bước 5/5 · Xong', 100, 'Xong rồi! AiiGrow đã ở trên máy', `
  ${y('Máy đã ghép với điện thoại của Ba Mẹ — xem ngay trong app AiiGrow')}${y('Tài khoản minhkhoi của Con là loại giới hạn')}${y('Biểu tượng AiiGrow nằm ở góc phải thanh tác vụ và trong menu Start')}
  <p style="font-size:14px;color:var(--chu3)">Bước cuối: chuyển sang tài khoản của minhkhoi (máy chỉ khoá màn hình, không đăng xuất — việc đang mở của bạn vẫn giữ nguyên). Muốn gỡ: Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt.</p>
  <img src="/assets/rob/xong.webp" alt="" style="position:absolute;right:40px;top:300px;width:230px;height:250px;object-fit:contain">`, btn('Để sau', 'vien'), btn('Chuyển sang tài khoản Con', 'ngoc', 'min-width:260px'));

// ---------- 2. Cài trên Mac ----------
const CSS_MAC = `.mw{display:flex;flex-direction:column;gap:14px;padding:18px;background:linear-gradient(180deg,#e9efec,#ecebe7)}
.mw .the{padding:20px 22px;display:flex;flex-direction:column;gap:12px}
.mw h2{font:800 24px/30px Inter;letter-spacing:-.4px;display:flex;align-items:center;gap:12px}
.mw p{font:500 15px/22px Inter;color:var(--chu2)}
.mw .dot{width:11px;height:11px;border-radius:50%;background:var(--chinh);flex:none}
.mw .nut{width:100%}.mw .nhan{font:500 13px/18px Inter;color:var(--chu3)}
.mw .chon-tk{height:50px;border-radius:20px;background:var(--lom);box-shadow:var(--lomIn);padding:0 16px;display:flex;align-items:center;justify-content:space-between;font:500 15px Inter;color:var(--chu2)}.mw .chon-tk b{color:var(--chu)}
.mw .ma6{height:50px;border-radius:20px;background:var(--lom);box-shadow:var(--lomIn);padding:0 16px;display:flex;align-items:center;font:500 18px ui-monospace,Menlo,monospace;color:var(--chu3);letter-spacing:1px}
.nut.tat{opacity:.7;background:linear-gradient(180deg,#6b706e,#4f5452)}
.tb2{display:flex;align-items:center;gap:12px}`;
const mac = (w, h, body, css = '') => doc(body, 'mw', `${CSS_MAC}.mw{width:${w}px;height:${h}px;overflow:hidden}${css}`);

const MAC_CHAO = mac(620, 420, `<section class="the"><h2><span class="dot"></span>Chào mừng đến với AiiGrow</h2><p>AiiGrow giúp Ba Mẹ quản lý thời gian dùng máy của Con. Bộ cài sẽ đặt ứng dụng AiiGrow và dịch vụ nền của AiiGrow trên máy này.</p><p>Sau khi cài xong, Ba Mẹ mở biểu tượng AiiGrow trên thanh menu để ghép máy bằng mã 6 số.</p></section>
  <div style="display:flex;justify-content:flex-end;margin-top:auto;gap:12px"><button class="nut" style="width:170px">Tiếp tục</button></div>
  <img src="/assets/rob/rob-goc.webp" alt="" style="position:absolute;left:24px;bottom:12px;width:150px;height:170px;object-fit:contain">`);
const MAC_DK = mac(620, 420, `<section class="the"><h2><span class="dot"></span>Điều khoản</h2><p>AiiGrow giúp Ba Mẹ quản lý thời gian dùng máy của Con; Con luôn thấy biểu tượng AiiGrow.</p></section>
  <div style="display:flex;justify-content:space-between;margin-top:auto;gap:12px"><button class="nut vien" style="width:170px">Quay lại</button><button class="nut" style="width:170px">Đồng ý và cài</button></div>
  <img src="/assets/rob/nghi.webp" alt="" style="position:absolute;left:200px;bottom:12px;width:150px;height:170px;object-fit:contain">`);
const macGhep = (mot) => mac(480, 480, `<section class="the" style="flex:1"><h2><span class="bt tim lon">${I('tin')}</span>Ghép máy này với Con</h2>
  <p>${mot ? 'Gói cài này đã mang mã của gia đình. Ba Mẹ chỉ cần chọn tài khoản macOS của Con.' : 'Chọn tài khoản macOS của Con và nhập mã 6 số lấy ở app AiiGrow Ba Mẹ.'}</p>
  <div class="chon-tk"><span>Tài khoản của Con</span><b>bi ⇅</b></div>
  ${mot ? '' : '<div class="ma6">Mã 6 số</div>'}
  <button class="nut ${mot ? '' : 'tat'}">Ghép máy</button>
  ${mot ? '<button class="nut vien">Dùng mã 6 số thay vì gói cài</button>' : ''}
  <div class="nhan">Tài khoản Con sẽ về quyền người dùng thường (cần còn một tài khoản quản trị khác).</div></section>`);

// ---------- 4. Hết giờ: toast / đếm ngược / khoá ----------
const khoaWin = (ic, h1, phu, o = {}) => doc(`<div class="vien-khoa">${I(ic).replace('class="ic"', 'class="ic" style="width:56px;height:56px"')}</div>
  <h1>${h1}</h1><p class="phu">${phu}</p>
  <section class="the">${o.dem ? `<div><div class="dem-so so">${o.dem}</div><div class="c3 s15">máy sẽ khoá sau</div></div>` : ''}
  <button class="nut ${o.tat ? '' : 'ngoc'}" style="${o.tat ? 'opacity:.85;background:linear-gradient(180deg,#6b8a83,#4d6b64)' : ''}">${I('dong_ho_cat')}Xin thêm thời gian</button>
  <button class="nut vien">${I('mo_khoa')}Ba Mẹ dùng máy</button><div class="c3 s13">Ba Mẹ cần máy? Bấm nút này hoặc Win+L</div>
  <button class="nut vien">Lưu bài và đăng xuất</button>
  ${o.ma ? `<div class="b s13" style="margin-top:4px">Mất mạng? Nhập mã của Ba Mẹ</div><div class="hang" style="gap:10px"><div class="nhap" style="width:200px;text-align:center;font-weight:700;letter-spacing:1px">6 số</div><button class="nut ngoc nho" style="width:110px">${I('mo_khoa')}Mở</button></div>` : ''}</section>
  <div class="chan">AiiGrow · máy này do Ba Mẹ quản lý</div>`, 'khoa', '.khoa .the{width:600px}.khoa h1{font-size:32px}');

const MAC_NHAC = mac(480, 160, `<section class="the hang" style="padding:22px;gap:18px"><span class="bt cam lon" style="width:72px;height:72px">${I('dong_ho_cat').replace('class="ic"', 'class="ic" style="width:42px;height:42px"')}</span><div><div style="font:800 26px/32px Inter">Còn 5 phút</div><div class="c2" style="font:500 17px/24px Inter">Con lưu bài đang làm nhé.</div></div></section>`);
const MAC_DEM = doc(`<div class="vien-khoa" style="width:86px;height:86px">${I('dongho').replace('class="ic"', 'class="ic" style="width:50px;height:50px"')}</div>
  <h1>Máy sắp khoá</h1>
  <div style="background:rgba(255,255,255,.12);border-radius:30px;padding:16px 40px;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)"><div style="font:800 86px/92px Inter;letter-spacing:-2px" class="so">0:53</div><div class="phu" style="font-size:16px">máy sẽ khoá sau</div></div>
  <p class="phu" style="font-size:16px">Con lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian.</p>
  <section class="the" style="display:flex;flex-direction:column;gap:12px;padding:18px 22px"><div class="hang"><div class="bt vang">${I('dong_ho_cat')}</div><b class="s16">Con muốn thêm bao lâu?</b></div>
  <div class="hang" style="gap:12px"><div class="chip chon ngoc">30 phút</div><div class="chip chon">1 giờ</div><div class="chip chon">2 giờ</div></div>
  <div class="s13 m c3">Nhắn Ba Mẹ (không bắt buộc)</div><div class="nhap">Ví dụ: con cần làm nốt bài tập</div><button class="nut rong">Xin Ba Mẹ</button></section>
  <div class="chan">AiiGrow · máy này do Ba Mẹ quản lý</div>`, 'khoa', '.khoa .the{width:590px}');

// ---------- 5. Xin ----------
const gioChip = (c) => `<div class="hang" style="gap:10px">${['30 phút', '1 giờ', '2 giờ'].map((t, i) => `<div class="chip chon ${i === c ? 'ngoc' : ''}" style="min-height:46px">${t}</div>`).join('')}</div>`;
const MAC_DOI_DIEM = mac(480, 500, `<section class="the" style="flex:1"><h2><span class="bt vang lon">${I('dong_ho_cat')}</span>Con muốn thêm bao lâu?</h2>${gioChip(0)}
  <div class="nhan b" style="color:var(--chu2)">Nhắn Ba Mẹ (không bắt buộc)</div><div class="nhap">Ví dụ: con cần làm nốt bài tập</div>
  <button class="nut">Xin Ba Mẹ</button><button class="nut vien">${I('sao')}Hoặc đổi điểm lấy giờ chơi</button>
  <div class="nhan" style="margin-top:auto">AiiGrow đang bật — Ba Mẹ quản lý máy này</div></section>`);
const MAC_XIN_MO = mac(480, 480, `<section class="the" style="flex:1"><h2><span class="bt lam lon">${I('web')}</span>Con muốn mở gì?</h2>
  <div class="hang" style="gap:10px"><div class="chip chon ngoc" style="min-height:48px">Trang web</div><div class="chip chon" style="min-height:48px">App</div></div>
  <div class="nhap">Địa chỉ trang, ví dụ youtube.com</div><div class="nhan b" style="color:var(--chu2)">Nhắn Ba Mẹ (không bắt buộc)</div><div class="nhap">Con cần mở để làm gì?</div>
  <button class="nut tat">Xin Ba Mẹ</button></section>`);
const choiDiem = cua(465, 378, 'AiiGrow · Chơi bằng điểm', `<div class="hn"><h3>Chơi bằng điểm</h3><div class="lb" style="font-size:15px;line-height:21px">Mỗi app đổi điểm lấy số phút khác nhau — con xem số phút ở từng nút.</div>
  ${[['Roblox', '18'], ['Minecraft', '18'], ['Youtube.com', '12']].map(([t, p]) => `<button class="nut ngoc">${I('game')}Chơi ${t} · ≈ ${p} phút</button>`).join('')}<button class="nut vien">Đóng</button></div>`);

// ---------- 6. Bị chặn ----------
const chanApp = (tieu, phu, nut, ma) => cua(388, ma ? 414 : nut.length > 3 ? 397 : 352, 'AiiGrow', `<div class="hn" style="padding:18px 24px;gap:12px"><div class="hang"><span class="bt cam lon" style="border-radius:20px">${I('canh_bao')}</span><b style="font:800 19px/25px Inter">${tieu}</b></div><div class="lb" style="font-size:15px">${phu}</div>${nut}</div>`);
const chanBtn = (ic, t, c = 'vien') => `<button class="nut ${c}">${I(ic)}${t}</button>`;
const CHAN_APP = chanApp('Roblox chưa được mở', 'App này chưa được Ba Mẹ phân loại', chanBtn('sao', 'Dùng điểm để chơi', 'ngoc') + chanBtn('tin', 'Xin phép Ba Mẹ') + chanBtn('web', 'Xin mở hẳn app này') + '<button class="nut vien">Đóng</button>');
const CHAN_HET_DIEM = chanApp('Minecraft Launcher chưa được mở', 'Hết điểm chơi hôm nay', chanBtn('sao', 'Dùng điểm để chơi', 'ngoc') + chanBtn('tin', 'Xin phép Ba Mẹ') + '<button class="nut vien">Đóng</button>');
const XIN_GIO_CHAN = cua(428, 402, 'AiiGrow · Xin thêm thời gian', `<div class="hn"><h3>Con muốn thêm bao lâu?</h3>${gioChip(1)}<div class="lb">Nhắn bố mẹ (không bắt buộc)</div><div class="vb" style="min-height:76px"></div>
  <button class="nut ngoc">${I('tin')}Xin bố mẹ</button><button class="nut vien">${I('sao')}Đổi điểm lấy thời gian</button></div>`);

// ---------- 7. Mất mạng & sự cố ----------
const deskX = (dang, chinh, rob, o = {}) => doc(`<aside class="ben"><img class="rob" src="/assets/rob/${rob}.webp" alt=""><div class="ten-con">Minh Khôi</div>
  <div class="ket-noi ${o.kn ? 'do' : ''}">${o.kn ? `<span class="cham" style="background:var(--loi);box-shadow:0 0 0 3px #f5c9c4"></span>${o.kn}` : '<span class="cham"></span>Đã kết nối · đồng bộ lúc 12:58'}</div>
  ${[['dongho', 'Hôm nay'], ['but', 'Nhiệm vụ (4)'], ['qua', 'Phần quà & điểm'], ['tin', 'Tin nhắn (2)']].map(([ic, t], i) => `<a class="${i === dang ? 'dang' : ''}">${I(ic)}${t}</a>`).join('')}
  <div class="chan">Máy này do Ba Mẹ quản lý bằng AiiGrow</div></aside>
  <main class="chinh">${o.bn ? `<div class="bn"><div class="t"><b>${o.bn[0]}</b><span>${o.bn[1]}</span></div><button class="nut">${I('wifi')}Thử kết nối lại</button></div>` : ''}${chinh}</main>`, 'desk', CSS_WIN);

const hnBase = (so, phu, rest = '') => `<h1 class="tieuLon" style="margin-bottom:0">Chào Minh Khôi!</h1>
  <section class="the"><div class="c2 s16">Thời gian dùng máy còn lại</div>${so}${phu}</section>${rest}`;
const nutHang = `<div class="hang" style="gap:14px;flex-wrap:wrap"><button class="nut ngoc">${I('dong_ho_cat')}Xin thêm thời gian</button><button class="nut vien">${I('sao')}Đổi điểm lấy thời gian</button><button class="nut vien">${I('web')}Xin mở trang hoặc app</button></div>`;
const soTo = (t, sz = 76) => `<div class="so" style="font:800 ${sz}px/${sz + 12}px Inter;color:var(--chinhInk);letter-spacing:-2px">${t}</div>`;

const HN_MAT_MANG = deskX(0, hnBase(soTo('47:29', 64), '<div class="c3 s15">còn hôm nay</div><div class="b s15 nhan-xanh">Chế độ: Tự do</div>', nutHang), 'trong-loi',
  { kn: 'KHÔNG kết nối máy chủ từ 12:34 — kiểm tra Wi-Fi', bn: ['KHÔNG kết nối máy chủ từ 12:34 — kiểm tra Wi-Fi', 'Kiểm tra Wi-Fi hoặc dây mạng, rồi bấm Thử kết nối lại. Máy vẫn chạy theo giờ đã lưu.'] });
const HN_MO_MA = deskX(0, hnBase(soTo('Không giới hạn', 56), '<div class="b s15 nhan-xanh">Chế độ: Tự do</div><div class="s15 nhan-cam">Đang mở tạm bằng mã của Ba Mẹ, đến 13:54.</div>', nutHang), 'trong-loi',
  { kn: 'KHÔNG kết nối máy chủ từ 10:59 — kiểm tra Wi-Fi', bn: ['KHÔNG kết nối máy chủ từ 10:59 — kiểm tra Wi-Fi', 'Kiểm tra Wi-Fi hoặc dây mạng, rồi bấm Thử kết nối lại. Máy vẫn chạy theo giờ đã lưu.'] });
const HN_DICH_VU_TAT = deskX(0, `<h1 class="tieuLon" style="margin-bottom:0">Chào Minh Khôi!</h1>
  <section class="the" style="background-color:#fde9e7"><div style="font:800 21px Inter;color:#a8261a">Dịch vụ AiiGrow không chạy</div><div class="s15" style="color:#b3382c;margin-top:6px">Khởi động lại máy. Nếu vẫn vậy, nhờ Ba Mẹ kiểm tra AiiGrow.</div></section>
  <section class="the"><div style="font:700 19px Inter">Việc của con</div><div class="s16 c2" style="margin-top:6px">Con có 4 việc đang chờ. Làm xong để tích điểm nhé!</div><div class="b s16 nhan-diem" style="margin-top:6px">340 điểm · Cấp 3 · còn 60 điểm lên cấp</div>
  <div class="hang" style="gap:12px;margin-top:12px"><button class="nut vien">${I('but')}Xem nhiệm vụ</button><button class="nut vien">${I('tin')}Đọc tin nhắn (2)</button></div></section>`, 'trong-loi',
  { kn: 'Dịch vụ AiiGrow không chạy', bn: ['Dịch vụ AiiGrow không chạy', 'Khởi động lại máy. Nếu vẫn vậy, nhờ Ba Mẹ kiểm tra AiiGrow.'] });

const CHAN_MAT_MANG = cua(388, 414, 'AiiGrow', `<div class="hn" style="padding:18px 24px;gap:12px"><div class="hang"><span class="bt cam lon" style="border-radius:20px">${I('canh_bao')}</span><b style="font:800 19px/25px Inter">Roblox chưa được mở</b></div><div class="lb" style="font-size:15px">App này chưa được Ba Mẹ phân loại</div>
  <button class="nut ngoc">${I('tin')}Xin phép Ba Mẹ</button><div class="b s16" style="margin-top:4px">Mất mạng? Nhập mã của Ba Mẹ</div>
  <div class="hang" style="gap:12px"><div class="nhap" style="width:170px;text-align:center;font-weight:700;letter-spacing:1px">6 số</div><button class="nut ngoc nho" style="width:100px;min-height:52px">${I('mo_khoa')}Mở</button></div><button class="nut vien" style="margin-top:auto">Đóng</button></div>`);

const CAP_NHAT = cua(586, 289, 'AiiGrow', `<div style="padding:26px 34px;display:flex;flex-direction:column;gap:14px"><h3 style="font:800 24px/30px Inter;letter-spacing:-.4px">Cập nhật AiiGrow lên bản 0.2.10</h3>
  <p style="font:500 15px/22px Inter;color:var(--chu2)">Máy này đang chạy AiiGrow bản 0.2.9 → bản mới 0.2.10.</p>
  <p style="font:500 15px/22px Inter;color:var(--chu2)">Cập nhật giữ nguyên ghép máy, tài khoản của Con và các luật Ba Mẹ đã đặt — không phải ghép lại. Mất khoảng một phút; nếu có lỗi, AiiGrow tự quay về bản cũ để máy vẫn được bảo vệ.</p>
  <div class="hang" style="gap:14px"><button class="nut ngoc" style="width:176px">Cập nhật</button><button class="nut vien" style="width:144px">Để sau</button></div></div>`);

const KHAY_MENU = doc(`<div class="kh"><div class="mu gr">Đã kết nối · đồng bộ lúc 12:58</div>
  <div class="mu"><span class="bt tim" style="width:28px;height:28px;box-shadow:none">${I('wifi').replace('class="ic"', 'class="ic" style="width:20px;height:20px"')}</span>Thử kết nối lại</div><hr>
  <div class="mu"><span class="bt xanh" style="width:28px;height:28px;box-shadow:none">${I('lap_lanh')}</span>Mở AiiGrow</div>
  <div class="mu"><span class="bt vang" style="width:28px;height:28px;box-shadow:none">${I('dong_ho_cat')}</span>Xin thêm thời gian</div>
  <div class="mu"><span class="bt lam" style="width:28px;height:28px;box-shadow:none">${I('web')}</span>Xin mở trang hoặc app…</div><hr>
  <div class="mu gr">Máy này do Ba Mẹ quản lý bằng AiiGrow</div></div>`, 'cua', `${CSS_WIN}.cua{width:335px;height:262px;background:#f6f5f2;padding:8px 0}.kh{display:flex;flex-direction:column}
.mu{min-height:44px;display:flex;align-items:center;gap:12px;padding:0 18px;font:600 15px Inter;color:var(--chu)}.mu.gr{color:var(--chu3);font-weight:500;font-size:13.5px}.mu .ic{width:20px;height:20px}hr{border:0;border-top:1px solid #dcdad4;margin:4px 0}`);

// ---------- ghép hành trình ----------
const S = (key, ten, w, h, html, anh, toi) => ({ key: 'cmt-' + key, ten, w, h, html, ...(anh ? { anh } : {}), ...(toi ? { toi } : {}) });
const W = (f) => WIN + f + '.png';
const M = (f) => MAC + f + '.png';

export default [
  { id: 'con-cai-win', vai: 'Con', nen: 'Windows', ten: 'Cài trên Windows', mo: 'Ba Mẹ chạy bộ cài trên máy của Con: đồng ý điều khoản, chọn tài khoản giới hạn cho Con, nhập mã ghép 6 số rồi cài xong.',
    buoc: [
      S('cai-chao', 'Chào Ba Mẹ', 724, 672, CAI_1, W('cai-1-chao'), 'Bấm «Bắt đầu»'),
      S('cai-dieu-khoan', 'Điều khoản', 724, 672, CAI_2, W('cai-2-dieu-khoan'), 'Tick đồng ý, bấm «Tiếp»'),
      S('cai-chon-tai-khoan', 'Chọn tài khoản của Con', 724, 672, CAI_3, W('cai-3-chon-tai-khoan'), 'Chọn «Máy chưa có tài khoản riêng cho Con»'),
      S('cai-tao-tai-khoan', 'Tạo tài khoản cho Con', 724, 672, CAI_3_TAO, W('cai-3-tao-tai-khoan'), 'Bấm «Tạo tài khoản»'),
      S('cai-chi-mot-tai-khoan-quan-tri', 'Chỉ có một tài khoản quản trị', 724, 672, CAI_3_MOT, W('cai-3-chi-mot-tai-khoan-quan-tri'), 'Bấm «Quay lại chọn» (khi Con đang dùng tài khoản toàn quyền duy nhất)'),
      S('cai-ma-ghep', 'Nhập mã ghép máy', 724, 672, CAI_4(false), W('cai-4-ma-ghep'), 'Bấm «Ghép và cài đặt»'),
      S('cai-ma-ghep-sai', 'Mã ghép thiếu số', 724, 672, CAI_4(true), W('cai-4-ma-ghep-sai'), 'Nhập đủ 6 số rồi ghép'),
      S('cai-dang-cai', 'Đang cài', 724, 672, CAI_5(false), W('cai-5-dang-cai'), 'Cài xong tự sang bước cuối'),
      S('cai-loi-ghep', 'Lỗi ghép: mã hết hạn', 724, 672, CAI_5(true), W('cai-5-loi-ghep'), 'Xin mã mới trên điện thoại, bấm «Thử lại»'),
      S('cai-xong', 'Cài xong', 724, 672, CAI_6, W('cai-6-xong')),
    ] },

  { id: 'con-cai-mac', vai: 'Con', nen: 'Mac', ten: 'Cài trên Mac', mo: 'Ba Mẹ cài AiiGrow lên Mac của Con rồi ghép máy bằng mã 6 số, hoặc một chạm nếu gói cài đã mang mã gia đình.',
    buoc: [
      S('mac-chao', 'Chào mừng', 620, 420, MAC_CHAO, M('mac-chao'), 'Bấm «Tiếp tục»'),
      S('mac-dieu-khoan', 'Điều khoản', 620, 420, MAC_DK, M('mac-dieu-khoan'), 'Bấm «Đồng ý và cài», mở AiiGrow trên thanh menu'),
      S('mac-ghep-may', 'Ghép máy bằng mã 6 số', 480, 480, macGhep(false), M('mac-ghep-may'), 'Gói cài đã mang mã gia đình thì chỉ cần một chạm'),
      S('mac-ghep-mot-cham', 'Ghép máy một chạm', 480, 480, macGhep(true), M('mac-ghep-mot-cham')),
    ] },

  { id: 'con-ngay-thuong', vai: 'Con', nen: 'Windows', ten: 'Ngày thường', mo: 'Con mở app: xem giờ còn lại, làm nhiệm vụ, nộp bài, đổi quà, đọc tin nhắn của Ba Mẹ. Mac giống bố cục này.',
    buoc: [
      S('hom-nay', 'Hôm nay', 1100, 720, CON_HOM_NAY, W('app-hom-nay'), 'Chọn «Nhiệm vụ»'),
      S('nhiem-vu', 'Nhiệm vụ', 1100, 720, CON_NHIEM_VU, W('app-nhiem-vu'), 'Bấm «Nộp bài»'),
      S('nop-bai-viet', 'Nộp bài: viết kể lại', 465, 522, cua(465, 522, 'AiiGrow · Nộp bài', `<div class="hn"><h3 style="font-size:19px">Đọc 20 trang «Dế Mèn phiêu lưu ký»</h3><div class="lb" style="line-height:20px">Đọc xong kể lại cho Ba Mẹ nghe nhân vật con thích nhất và vì sao.</div><div class="lb">Con viết vài câu kể lại nhé</div>
        <div class="vb" style="min-height:92px"><span style="background:#0b66d6;color:#fff">Con thích nhất Dế Mèn vì bạn ấy dũng cảm, biết nhận lỗi sau khi trêu chị Cốc làm Dế Choắt bị hại.</span></div><button class="nut ngoc">${I('but')}Nộp cho Ba Mẹ</button></div>`), W('nop-bai-viet'), 'Ba Mẹ nhờ bổ sung ảnh thì bấm «Nộp lại»'),
      S('nop-bai-anh-bo-sung', 'Nộp lại: chọn ảnh bổ sung', 465, 522, cua(465, 522, 'AiiGrow · Nộp bài', `<div class="hn"><h3 style="font-size:19px">Tưới cây ngoài ban công</h3><div class="lb" style="line-height:20px">Tưới đủ năm chậu, nhớ tưới cả chậu hoa giấy ở góc.</div><div class="cam">Ba Mẹ nhắn: Ảnh hơi mờ, con chụp lại giúp Ba Mẹ nhé — chụp cả năm chậu cây.</div><div class="lb">Ghi chú cho Ba Mẹ (không bắt buộc)</div><div class="vb" style="min-height:84px"></div>
        <button class="nut vien">${I('camera')}Chọn ảnh…</button><div class="lb">Đã chọn: tuoi-cay-ban-cong-chup-lai.jpg</div><button class="nut ngoc">${I('but')}Nộp cho Ba Mẹ</button></div>`), W('nop-bai-anh-bo-sung'), 'Sang «Phần quà & điểm»'),
      S('phan-qua', 'Phần quà & điểm', 1100, 720, CON_PHAN_QUA, W('app-phan-qua'), 'Đổi quà xong xem «Ví quà»'),
      S('vi-qua', 'Ví quà & huy hiệu', 1100, 720, doc(`<aside class="ben"><img class="rob" src="/assets/rob/qua.webp" alt=""><div class="ten-con">Minh Khôi</div><div class="ket-noi"><span class="cham"></span>Đã kết nối · đồng bộ lúc 13:03</div>
        ${[['dongho', 'Hôm nay'], ['but', 'Nhiệm vụ (4)'], ['qua', 'Phần quà & điểm'], ['tin', 'Tin nhắn (2)'], ['the_qua', 'Ví quà & huy hiệu']].map(([ic, t], i) => `<a class="${i === 4 ? 'dang' : ''}">${I(ic)}${t}</a>`).join('')}<div class="chan">Máy này do Ba Mẹ quản lý bằng AiiGrow</div></aside>
        <main class="chinh"><h1 class="tieuLon">Ví quà & huy hiệu</h1><div class="b s16" style="margin:0 2px">Ví quà</div>
        <section class="the"><div class="hang"><span class="bt vang">${I('the_qua')}</span><b style="font:700 19px Inter">Phiếu quà AiiCafe 50.000đ</b></div>
        <div class="hang" style="gap:22px;margin-top:12px"><div style="width:150px;height:150px;background:#fff;border-radius:12px;padding:14px;display:grid;grid-template-columns:repeat(7,1fr);gap:3px">${Array.from({ length: 49 }, (_, i) => `<i style="background:${[0, 1, 2, 4, 5, 6, 7, 9, 11, 13, 14, 16, 17, 19, 20, 22, 24, 27, 28, 30, 31, 35, 36, 37, 39, 41, 42, 43, 44, 46, 48].includes(i) ? '#111' : 'transparent'}"></i>`).join('')}</div>
        <div><div style="font:800 28px Inter;letter-spacing:1px">AC-7K2P9Q</div><div class="c3 s15" style="margin-top:4px">Dùng trước 20/12/2026</div></div></div></section>
        <div class="c3 s15" style="margin:0 2px">Đưa mã này cho nhân viên AiiCafe quét. Mỗi phiếu chỉ dùng một lần.</div>
        <section class="the"><b class="s16">Một buổi xem phim cùng Ba · Chờ Ba Mẹ trao</b><div class="c3 s15" style="margin-top:2px">Phiếu quà AiiCafe 20.000đ · Đã dùng 20/10/2026</div></section></main>`, 'desk', CSS_WIN), W('app-vi-qua'), 'Sang «Tin nhắn»'),
      S('tin-nhan', 'Tin nhắn', 1100, 720, deskX(3, `<h1 class="tieuLon" style="margin-bottom:0">Tin nhắn</h1><div class="b s20" style="margin:0 2px">Ba Mẹ nhắn con</div>
        <section class="the"><div class="b s16 nhan-xanh">Ba Mẹ: Hôm nay con đọc sách rất chăm, Ba Mẹ tự hào về con!</div><div class="hang" style="gap:12px;margin-top:10px"><button class="nut vien nho">Con cảm ơn ạ</button><button class="nut vien nho">Con sẽ cố gắng</button><button class="nut vien nho">Con yêu Ba Mẹ</button></div></section>
        <section class="the"><div class="b s16 nhan-xanh">Ba Mẹ: Cuối tuần này cả nhà mình đi công viên Tao Đàn nhé.</div><div class="s15" style="margin-top:6px">Con: Con yêu Ba Mẹ</div></section>
        <div class="b s20" style="margin:4px 2px 0">Thông báo gần đây</div>
        <section class="the"><b class="s16">Nhiệm vụ mới: Dọn góc học tập</b><div class="c3 s15" style="margin-top:2px">Ba Mẹ vừa giao việc mới · +15 điểm</div><div class="c3 s13" style="margin-top:6px">12:49 25/10</div></section>`, 'chi'), W('app-tin-nhan'), 'Có tin mới thì hiện thông báo ở góc màn hình (Mac)'),
      S('mac-tin-moi', 'Thông báo tin mới', 360, 185, mac(360, 185, `<section class="the hang" style="padding:16px 18px;align-items:flex-start;gap:14px;flex:1"><span class="bt tim lon">${I('tin')}</span><div style="min-width:0"><div style="font:800 18px/23px Inter">Nhiệm vụ mới: Tưới cây</div><div class="c2" style="font:500 14.5px/20px Inter;margin-top:4px">Ba Mẹ vừa giao cho con. Làm xong để tích điểm nhé!</div><button class="nut nho" style="margin-top:10px;width:112px">Xem</button></div></section>`, '.mw{padding:12px}'), M('mac-tin-moi')),
    ] },

  { id: 'con-het-gio', vai: 'Con', nen: 'Windows', ten: 'Sắp hết giờ', mo: 'Máy nhắc còn 5 phút, đếm ngược rồi khoá khi hết giờ, giờ ngủ hoặc Ba Mẹ khoá; Con có thể xin thêm giờ.',
    buoc: [
      S('mac-nhac-5-phut', 'Nhắc còn 5 phút', 480, 160, MAC_NHAC, M('mac-nhac-5-phut'), 'Hết 5 phút, máy đếm ngược'),
      S('mac-dem-nguoc', 'Đếm ngược trên Mac', 1100, 720, MAC_DEM, M('mac-dem-nguoc'), 'Hết giờ thì khoá'),
      S('khoa-het-gio-dem-nguoc', 'Đếm ngược trên Windows', 1100, 720, khoaWin('khoa', 'Hết giờ dùng máy hôm nay', 'Lưu bài đang làm nhé. Con có thể xin bố mẹ thêm thời gian.', { dem: '0:45' }), W('khoa-het-gio-dem-nguoc'), 'Hết đếm ngược'),
      S('khoa-het-gio', 'Màn khoá hết giờ', 1100, 720, CON_KHOA, W('khoa-het-gio-dem-nguoc'), 'Giờ ngủ: máy khoá theo lịch'),
      S('khoa-gio-ngu', 'Khoá giờ nghỉ / giờ ngủ', 1100, 720, khoaWin('khoa', 'Đến giờ nghỉ rồi', 'Máy sẽ mở lại khi hết giờ nghỉ. Cần gấp thì xin bố mẹ.', { tat: true }), W('khoa-gio-ngu'), 'Ba Mẹ bấm khoá từ điện thoại'),
      S('khoa-ba-me-khoa', 'Ba Mẹ khoá máy', 1100, 720, khoaWin('khoa', 'Máy đang được bố mẹ khoá', 'Con có thể nhắn xin bố mẹ mở máy.', { tat: true }), W('khoa-ba-me-khoa')),
    ] },

  { id: 'con-xin', vai: 'Con', nen: 'Windows', ten: 'Xin thêm giờ · xin mở · chơi bằng điểm', mo: 'Con xin Ba Mẹ thêm giờ, xin mở trang hoặc app, hoặc tự đổi điểm lấy giờ chơi.',
    buoc: [
      S('xin-them-gio', 'Xin thêm giờ', 560, 460, CON_XIN_GIO, W('xin-them-gio'), 'Trên Mac: «Hoặc đổi điểm lấy giờ chơi»'),
      S('mac-xin-them-doi-diem', 'Xin thêm giờ (Mac) + đổi điểm', 480, 500, MAC_DOI_DIEM, M('mac-xin-them-doi-diem'), 'Chọn «Xin mở trang hoặc app»'),
      S('mac-xin-mo', 'Xin mở trang hoặc app', 480, 480, MAC_XIN_MO, M('mac-xin-mo'), 'Hoặc dùng điểm để chơi'),
      S('choi-bang-diem', 'Chơi bằng điểm', 465, 378, choiDiem, W('choi-bang-diem')),
    ] },

  { id: 'con-bi-chan', vai: 'Con', nen: 'Windows', ten: 'Bị chặn app/web', mo: 'Con mở app chưa được Ba Mẹ phân loại thì bị chặn; Con dùng điểm, xin phép hoặc xin thêm giờ.',
    buoc: [
      S('chan-app', 'App chưa được mở', 388, 352, CHAN_APP, W('chan-app'), 'Hết điểm chơi thì hiện thông báo khác'),
      S('chan-app-het-diem', 'Hết điểm chơi hôm nay', 388, 352, CHAN_HET_DIEM, W('chan-app-het-diem'), 'Bấm «Xin phép Ba Mẹ» rồi xin thêm giờ'),
      S('xin-them-gio-tu-man-chan', 'Xin thêm giờ từ màn chặn', 428, 402, XIN_GIO_CHAN, W('xin-them-gio-tu-man-chan')),
    ] },

  { id: 'con-mat-mang', vai: 'Con', nen: 'Windows', ten: 'Mất mạng & sự cố', mo: 'Khi máy mất mạng hoặc dịch vụ AiiGrow tắt: máy vẫn chạy theo giờ đã lưu, Con nhập mã mở của Ba Mẹ, thử kết nối lại hoặc cập nhật.',
    buoc: [
      S('hom-nay-mat-mang', 'Hôm nay khi mất mạng', 1100, 720, HN_MAT_MANG, W('app-hom-nay-mat-mang'), 'Hết giờ lúc đang mất mạng'),
      S('khoa-mat-mang', 'Khoá khi mất mạng: nhập mã', 1100, 720, khoaWin('khoa', 'Hết giờ dùng máy hôm nay', 'Lưu bài đang làm nhé. Con có thể xin bố mẹ thêm thời gian.', { ma: true }), W('khoa-mat-mang'), 'Trên Mac: nhập mã 6 số của Ba Mẹ'),
      S('mac-man-khoa-ma-offline', 'Mac: khoá, nhập mã mở', 1100, 720, doc(`<div class="vien-khoa">${I('khoa').replace('class="ic"', 'class="ic" style="width:56px;height:56px"')}</div><h1>Hết giờ dùng máy hôm nay</h1><p class="phu">Con lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian.</p>
        <section class="the"><div class="hang"><div class="bt vang">${I('mo_khoa')}</div><div><b class="s16">Mất mạng? Nhập mã của Ba Mẹ</b><div class="c3 s13">Ba Mẹ xem mã 6 số trong app AiiGrow và đọc cho con.</div></div></div><div class="hang" style="gap:12px"><div class="nhap" style="flex:1;font-family:ui-monospace,Menlo,monospace">Mã 6 số</div><button class="nut" style="width:140px;opacity:.7">Mở máy</button></div></section>
        <section class="the" style="display:flex;flex-direction:column;gap:10px"><div class="hang"><div class="bt vang">${I('dong_ho_cat')}</div><b class="s16">Con muốn thêm bao lâu?</b></div>${gioChip(0)}<div class="nhap">Ví dụ: con cần làm nốt bài tập</div><button class="nut rong">Xin Ba Mẹ</button></section>
        <div class="chan">AiiGrow · máy này do Ba Mẹ quản lý</div>`, 'khoa', '.khoa .the{width:590px;padding:16px 22px}.khoa{gap:12px}.khoa .vien-khoa{width:88px;height:88px}'), M('mac-man-khoa-ma-offline'), 'Nhập đúng mã thì máy mở tạm'),
      S('hom-nay-mo-bang-ma', 'Đang mở tạm bằng mã', 1100, 720, HN_MO_MA, W('app-hom-nay-mo-bang-ma'), 'Dịch vụ AiiGrow bị tắt'),
      S('hom-nay-dich-vu-tat', 'Dịch vụ AiiGrow không chạy', 1100, 720, HN_DICH_VU_TAT, W('app-hom-nay-dich-vu-tat'), 'Mất mạng khi bị chặn app'),
      S('chan-app-mat-mang', 'Chặn app khi mất mạng', 388, 414, CHAN_MAT_MANG, W('chan-app-mat-mang'), 'Có bản mới thì hỏi cập nhật'),
      S('cap-nhat', 'Cập nhật AiiGrow', 586, 289, CAP_NHAT, W('cap-nhat'), 'Mở nhanh từ khay hệ thống'),
      S('khay-menu', 'Menu khay hệ thống', 335, 262, KHAY_MENU, W('khay-menu')),
    ] },
];
