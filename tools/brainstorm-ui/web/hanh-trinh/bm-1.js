// Hành trình Ba Mẹ (iPhone): Lần đầu dùng, Ghép thêm máy, và trang web tải bộ cài (/tai, /cai).
// Dựng theo mobile/src/app/{chao,dang-ky,otp,dang-nhap,moi}.tsx, thiet-lap/*.tsx, may/*.tsx, server/app/tai.
import { I, P, sb, tab, doc, dt } from '../kit/dung.js';

const A = 'chinchu-ios/';
const CSS = `
.pb{display:flex;align-items:center;gap:6px;padding:4px 16px 0}
.pb i{flex:none;width:46px;height:8px;border-radius:4px;background:#dcdbd6;box-shadow:inset 0 1px 2px rgba(40,44,42,.2)}
.pb i.d{background:var(--chinh)}
.pb span{flex:1;text-align:right;font:600 13px Inter;color:var(--chu3);white-space:nowrap}
.pg{position:absolute;top:47px;left:0;right:0;bottom:100px;padding:6px 16px 0;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.pg>*{flex:none}
.day{position:absolute;left:16px;right:16px;bottom:30px;display:flex;flex-direction:column;gap:6px}
.mal{display:flex;flex-direction:column;gap:6px}.mal .nh{font:700 14px Inter;color:var(--chu2);padding:0 4px}
.nhap .v{color:var(--chu);font-weight:600}
.lk{font:700 13.5px Inter;color:var(--chinhInk);display:inline-flex;align-items:center;min-height:44px}
.tx{font:500 13px/19px Inter;color:var(--chu3);padding:0 4px}
.ma6{display:flex;gap:8px;justify-content:center}
.ma6 div{width:46px;height:56px;border-radius:18px;background:var(--lom);box-shadow:var(--lomIn);display:flex;align-items:center;justify-content:center;font:800 26px Inter}
.ochon{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:64px;border-radius:26px;background:var(--the);box-shadow:var(--clayNho)}
.ochon.c{box-shadow:var(--clayNho),0 0 0 2.5px var(--chinh)}
.ochon .ch{flex:1;min-width:0}.ochon .ten{font:700 15.5px/20px Inter}.ochon .phu{font:500 13px/18px Inter;color:var(--chu3)}
.rad{width:24px;height:24px;border-radius:50%;box-shadow:var(--lomIn);background:var(--lom);flex:none}
.rad.c{background:var(--chinh);box-shadow:inset 0 0 0 6px var(--chinh),inset 0 0 0 12px #fff}
.tk{display:flex;align-items:center;gap:12px;min-height:44px}
.tk .o2{width:26px;height:26px;border-radius:50%;flex:none;border:3px solid #d6d5d0;border-top-color:var(--chinh)}
.tk .o2.x{background:var(--chinh);border-color:var(--chinh);color:#fff;display:flex;align-items:center;justify-content:center;font:800 14px Inter}
.tk .o2.s{border:2px dashed #c9c8c3}
.tk .ten{font:600 16px/20px Inter}.tk .phu{font:500 13px/18px Inter;color:var(--chu3)}
.bao{display:flex;gap:12px;padding:14px;border-radius:26px;align-items:flex-start}
.bao.lam{background:#e1e9fb}.bao.canh{background:var(--canhSoft)}.bao.ok{background:var(--chinhSoft)}
.bao .t{font:700 14.5px/19px Inter}.bao .l{font:500 13.5px/19px Inter;color:var(--chu2);margin-top:2px}
.dg{display:flex;align-items:center;gap:12px;min-height:56px}
.dg .ch{flex:1;min-width:0}.dg .ten{font:700 15.5px/20px Inter}.dg .phu{font:500 13px/18px Inter;color:var(--chu3)}
.dg+.dg{border-top:1px solid #e3e2dd}
.nh2{font:700 13px Inter;color:var(--chu3);letter-spacing:.4px;padding:4px 6px 0;text-transform:uppercase}
.nhan{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:99px;background:var(--xamSoft);font:700 13px Inter;white-space:nowrap;flex:none}
.seg{display:flex;gap:6px;padding:5px;border-radius:26px;background:var(--lom);box-shadow:var(--lomIn)}
.seg div{flex:1;min-height:44px;border-radius:21px;display:flex;align-items:center;justify-content:center;font:700 15.5px Inter;color:var(--chu2)}
.seg div.c{background:var(--the);box-shadow:var(--clayNho);color:var(--chinhInk)}
.ox{flex:1;min-width:0;padding:12px 16px;border-radius:26px;background:var(--the);box-shadow:var(--clayNho)}
.ox .n{font:600 13px Inter;color:var(--chu2)}.ox .s{font:800 28px Inter}.ox .s small{font:600 14px Inter;color:var(--chu3)}
.wb{width:390px;height:844px;overflow:hidden;position:relative;background:radial-gradient(120% 50% at 20% 0,#e3ebe7 0,var(--nen) 70%);padding:28px 16px 0;display:flex;flex-direction:column;gap:14px}
.wb>*{flex:none}
.wb h1{font:800 29px/33px Inter;letter-spacing:-.6px}
.wb .ml{font:500 15.5px/23px Inter;color:var(--chu2)}
.wb .logo{width:76px;height:76px;border-radius:22px;box-shadow:var(--clayNho);object-fit:cover}
.wb .ht{display:flex;align-items:center;gap:12px;font:800 17px Inter}
.wb .bc{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:26px;background:var(--lom);box-shadow:var(--lomIn)}
.wb .bc b.n{flex:none;width:30px;height:30px;border-radius:50%;background:var(--chinh);color:#fff;display:flex;align-items:center;justify-content:center;font:800 15px Inter;box-shadow:var(--clayNho)}
.wb .bc div{font:500 14px/20px Inter;color:var(--chu)}.wb .bc small{display:block;font:500 12.5px/17px Inter;color:var(--chu3);margin-top:3px}
.wb code{font:600 12.5px ui-monospace,Menlo,monospace;background:#e4e3de;border-radius:6px;padding:1px 5px}
.wb .nhac{background:var(--chinhSoft);border-radius:26px;padding:14px;display:flex;gap:12px;align-items:flex-start;font:500 13.5px/19px Inter;color:var(--chu2)}
.wb .ft{font:500 13.5px/19px Inter;color:var(--chu2)}.wb .ft a{color:var(--chinhInk);font-weight:700;text-decoration:underline}
.wb .ve{align-self:flex-start;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:22px;background:var(--the);box-shadow:var(--clayNho);font:700 14.5px Inter}
.wb .tp{font:500 12.5px/17px Inter;color:var(--chu3);margin-top:8px}
.wb .the{padding:16px}
`;
const pg = (n, nhan, body, day, gio = '07:26') => dt(`${sb(gio)}<div class="pb">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'd' : ''}"></i>`).join('')}<span>${nhan}</span></div><div class="pg">${body}</div><div class="day">${day}</div>`, CSS);
const man = (body, day, gio = '07:20', lui = '') => dt(`${sb(gio)}<div class="pg">${lui ? `<div class="lui">${P.trai}${lui}</div>` : ''}${body}</div><div class="day">${day}</div>`, CSS);
const canh = (rob, tieu, loi) => `<div class="canh-rob" style="min-height:150px;padding:16px"><div class="bong" style="width:64%"><div class="lon" style="font-size:21px;line-height:26px">${tieu}</div>${loi ? `<div class="phu">${loi}</div>` : ''}</div><img class="rob" src="/assets/rob/${rob}.webp" alt="" style="width:130px;height:150px"></div>`;
const nh = (nhan, v, ph) => `<div class="mal"><div class="nh">${nhan}</div><div class="nhap">${v ? `<span class="v">${v}</span>` : ph}</div></div>`;
const tk = (cls, ten, phu) => `<div class="tk"><span class="o2 ${cls}">${cls === 'x' ? '✓' : ''}</span><div><div class="ten">${ten}</div>${phu ? `<div class="phu">${phu}</div>` : ''}</div></div>`;
const bao = (loai, ic, t, l) => `<div class="bao ${loai}"><div class="bt ${loai === 'canh' ? 'cam' : loai === 'ok' ? 'xanh' : 'lam'}">${I(ic)}</div><div style="flex:1;min-width:0"><div class="t">${t}</div><div class="l">${l}</div></div></div>`;
const ochon = (c, ic, mau, ten, phu) => `<div class="ochon ${c ? 'c' : ''}"><div class="bt ${mau}">${I(ic)}</div><div class="ch"><div class="ten">${ten}</div><div class="phu">${phu}</div></div><span class="rad ${c ? 'c' : ''}"></span></div>`;
const nutDen = (t, ic = '') => `<button class="nut rong">${ic}${t}</button>`;

// ---------- Hành trình 1: Lần đầu dùng ----------
const chao = dt(`${sb('07:20')}<div class="pg" style="gap:14px">
  ${canh('rob-goc', 'Con lớn lên bằng yêu thương', 'Và nhận quyền lợi bằng nỗ lực của chính mình.')}
  <section class="the" style="display:flex;flex-direction:column;gap:12px;padding:18px">
    ${tk('x', 'Con làm việc có ích → nộp ảnh → Ba Mẹ duyệt → điểm vào ví')}
    ${tk('x', 'Điểm đổi phút chơi trò chơi, quà, phiếu quà AiiCafe')}
    ${tk('x', 'Ngoài quy tắc thì Con xin phép, Ba Mẹ duyệt trong vài giây')}
  </section>
  <div style="text-align:center"><span class="lk">Được Ba/Mẹ trong nhà mời? Nhập mã mời</span></div>
</div><div class="day">${nutDen('Bắt đầu bằng số điện thoại', I('dt'))}
  <div style="text-align:center;font:500 13px Inter;color:var(--chu3);min-height:44px;display:flex;align-items:center;justify-content:center">Đã có tài khoản? <b style="color:var(--chinhInk);margin-left:4px">Đăng nhập</b></div></div>`, CSS);

const dangKy = man(`${canh('chi', 'Số điện thoại của Ba Mẹ', 'AiiGrow gửi mã 6 số để xác thực.')}
  ${nh('Số điện thoại hoặc email', '0912 345 678')}${nh('Ba/Mẹ tên gì?', 'Mẹ Lan')}${nh('Mật khẩu (ít nhất 8 ký tự)', '••••••••••')}
  <p class="tx">Người đăng ký đầu tiên là <b>Chủ gia đình</b>. Ba, Ông Bà mời vào sau trong Cài đặt.</p>`, nutDen('Gửi mã'), '07:21', 'Quay lại');

const otp = man(`${canh('cho', 'Nhập mã 6 số', 'Đã gửi tới 0912 345 678.')}
  <div class="ma6"><div>4</div><div>8</div><div>2</div><div>9</div><div>1</div><div>7</div></div>
  <div style="text-align:center;font:500 13px Inter;color:var(--chu3)">Gửi lại mã sau <b class="so">0:42</b></div>
  ${bao('lam', 'tia', 'Mã tự điền', 'Tin nhắn có mã sẽ tự điền vào ô — không cần chép tay.')}`, nutDen('Xác nhận'), '07:22', 'Đổi số');

const tenCon = pg(1, 'Bước 1/5 · Con', `${canh('so-tay', 'Con tên gì?', 'Rob gợi ý trải nghiệm theo tuổi.')}
  ${nh('Tên gọi', 'Bảo Anh')}
  <div class="hang" style="align-items:flex-start">${`<div style="flex:1;min-width:0">${nh('Năm sinh', '2017')}</div><div style="flex:1;min-width:0">${nh('Mã PIN của Con', '••••')}</div>`}</div>
  ${ochon(1, 'cuoi', 'vang', 'Nhóm Nhí (6–10 tuổi)', 'Bảo Anh 9 tuổi · giao diện hình to, Rob đọc to')}
  ${ochon(0, 'sao', 'lam', 'Nhóm Teen (11–16 tuổi)', 'Gọn, đủ số liệu, bảng giá chi tiết')}
  <p class="tx">Không hỏi trường học, địa chỉ — chỉ thu thập điều AiiGrow cần để chạy.</p>`, nutDen('Tiếp: chọn thiết bị'));

const may = pg(2, 'Bước 2/5 · Thiết bị', `${canh('chi', 'Bảo Anh dùng máy nào?', 'Mỗi máy một cách bảo vệ — Rob dẫn từng bước.')}
  ${ochon(1, 'may_tinh', 'xanh', 'Laptop Windows', 'Bảo vệ toàn diện · chặn app, web, cài đặt')}
  ${ochon(0, 'tablet', 'lam', 'iPad / iPhone', 'Theo mức Apple cho phép · Screen Time')}
  ${ochon(0, 'dt', 'tim', 'Điện thoại Android', 'Toàn diện khi cấp đủ quyền')}
  ${ochon(0, 'laptop', 'cam', 'MacBook / iMac', 'Cần cấp quyền bộ lọc nội dung')}`, nutDen('Tiếp: ghép máy'));

const ghep = pg(3, 'Bước 3/5 · Ghép máy', `<section class="the" style="display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;padding:18px">
    <div style="font:700 17px/24px Inter">Trên laptop của Bảo Anh: vào trang dưới, tải và chạy AiiGrow-Setup.exe rồi nhập mã này.</div>
    <div class="nhap" style="width:100%;text-align:center;font:800 19px Inter;color:var(--chinhInk)">aiigrow.aiilab.vn/tai</div>
    <div class="ma6"><div>4</div><div>8</div><div>2</div><div>9</div><div>1</div><div>7</div></div>
    <div class="hang" style="gap:10px;flex-wrap:nowrap;justify-content:center"><span class="s13 c3 so">Hết hạn lúc 07:41</span><span class="lk" style="font-size:13px">Tạo mã mới</span><span class="lk" style="font-size:13px">Chép link</span></div></section>
  <section class="the" style="padding:8px 16px">${tk('', 'Máy đã nhận mã', 'Đang chờ laptop Windows của Bảo Anh…')}${tk('s', 'Cấp quyền bảo vệ', 'Sau khi ghép xong')}</section>`, nutDen('Tiếp: nhiệm vụ & quà'));

const mau = pg(4, 'Bước 4/5 · Nhiệm vụ & quà', `${canh('so-tay', 'Mẫu cho Con tiểu học', '8 nhiệm vụ + 6 phần thưởng. Chỉnh điểm sau cũng được.')}
  <div class="nh2">Nhiệm vụ</div>
  <section class="the ds" style="padding:2px 14px">
    <div class="dong"><div class="bt xanh">${I('sach')}</div><div class="chu"><div class="ten mot">Đọc 1 cuốn truyện 30 trang</div><div class="phu mot">Ảnh bìa + trang cuối, kể lại 3 câu</div></div><span class="nhan">10 điểm</span></div>
    <div class="dong"><div class="bt lam">${I('chen')}</div><div class="chu"><div class="ten mot">Rửa chén sau bữa ăn</div><div class="phu mot">Ảnh bồn rửa · tối đa 3 lần/ngày</div></div><span class="nhan">10 điểm</span></div>
    <div class="dong"><div class="bt tim">${I('mu')}</div><div class="chu"><div class="ten mot">Học 1 bài với AiiRob đạt</div><div class="phu mot">Tự động cộng khi đạt ≥ 80%</div></div><span class="nhan">20 điểm</span></div>
  </section>
  <div class="nh2">Phần thưởng</div>
  <section class="the ds" style="padding:2px 14px">
    <div class="dong"><div class="bt vang">${I('game')}</div><div class="chu"><div class="ten mot">1 phút chơi trò chơi</div><div class="phu mot">Trong khung giờ, tối đa 30 phút/phiên</div></div><span class="nhan">1 điểm</span></div>
    <div class="dong"><div class="bt cam">${I('coc')}</div><div class="chu"><div class="ten mot">Phiếu quà AiiCafe 50.000đ</div><div class="phu mot">Dùng tại quầy, hạn 60 ngày</div></div><span class="nhan">500 điểm</span></div>
  </section>`, nutDen('Dùng mẫu này'));

const gio = pg(5, 'Bước 5/5 · Giờ chơi', `${canh('cho', 'Khi nào Bảo Anh được chơi?', 'Ngoài giờ này, có điểm cũng không mở được.')}
  <section class="the" style="padding:6px 16px">
    <div class="dg"><div class="bt xanh">${I('dongho')}</div><div class="ch"><div class="ten">Giờ giải trí ngày thường</div><div class="phu so">18:30 – 20:00</div></div><span class="lk">Sửa</span></div>
    <div class="dg"><div class="bt lam">${I('lich')}</div><div class="ch"><div class="ten">Giờ giải trí cuối tuần</div><div class="phu so">09:00 – 11:30</div></div><span class="lk">Sửa</span></div>
    <div class="dg"><div class="bt tim">${I('trang_ngu')}</div><div class="ch"><div class="ten">Giờ đi ngủ</div><div class="phu so mot">21:30 – 06:00 · khoá mọi trò chơi</div></div><span class="lk">Sửa</span></div></section>
  <section class="the"><div class="hang" style="justify-content:space-between"><b style="font:700 15px Inter">Trần giải trí mỗi ngày</b><b class="so" style="font:800 22px Inter">90 phút</b></div>
    <div class="hang" style="margin-top:10px;gap:8px"><button class="nut vien nho" style="flex:1">60 phút</button><button class="nut nho" style="flex:1">90 phút</button><button class="nut vien nho" style="flex:1">120 phút</button></div>
    <p class="tx" style="margin-top:8px;padding:0">Tuần: tối đa 420 phút · tính gộp mọi máy</p></section>`, nutDen('Lưu và gửi xuống máy Bảo Anh'));

const xong = dt(`${sb('07:30')}<div class="pg">${canh('xong', 'Xong rồi!', 'Máy của Bảo Anh đã được ghép.')}
  <section class="the" style="display:flex;flex-direction:column;gap:2px;padding:10px 16px">
    ${tk('x', 'Hồ sơ Bảo Anh · Nhóm Nhí')}${tk('x', 'Laptop của Bảo Anh · Bảo vệ đầy đủ')}${tk('x', 'Nhiệm vụ & phần thưởng theo mẫu')}${tk('x', 'Giờ chơi 18:30–20:00 · trần 90 phút/ngày')}</section>
  <p class="tx">Cài xong là chặn luôn: app chưa xếp loại không mở được trên máy của Bảo Anh.</p>
</div><div class="day">${nutDen('Vào Trang chủ')}<button class="nut vien rong">Chat với AiiLab nếu cần giúp</button></div>`, CSS);

const dangNhap = man(`${canh('rob-goc', 'Chào Ba Mẹ quay lại', 'Đăng nhập bằng số điện thoại hoặc email đã đăng ký.')}
  ${nh('Số điện thoại hoặc email', '0912 345 678')}${nh('Mật khẩu', '••••••••••')}
  <p class="tx">Sai 5 lần liền, tài khoản tạm khoá 15 phút.</p>`, nutDen('Đăng nhập'), '07:20', 'Quay lại');

const moi = man(`${canh('canh-cac-con', 'Có mã mời?', 'Ba/Mẹ trong nhà gửi mã 8 ký tự hoặc link. Nhập mã để cùng đồng hành với các Con.')}
  ${nh('Mã mời', 'ABCD-2345')}
  <p class="tx">Mã dùng một lần, hết hạn sau 72 giờ. Hết hạn thì xin người mời gửi mã mới.</p>
  <section class="the ds" style="padding:4px 16px"><div class="dong"><div class="bt xanh">${I('nha')}</div><div class="chu"><div class="ten mot">Nhà Bảo Anh</div><div class="phu mot">Mẹ Lan mời Ba/Mẹ vào</div></div><span class="nhan">Duyệt</span></div>
  <div class="dong"><div class="bt lam">${I('khien')}</div><div class="chu"><div class="ten">Quyền Duyệt</div><div class="phu">Duyệt nhiệm vụ, yêu cầu của các Con như Ba Mẹ</div></div></div></section>`, nutDen('Xem lời mời'), '07:20', 'Quay lại');

// ---------- Hành trình 2: Ghép thêm máy ----------
const mayDs = dt(`${sb('07:33')}<div class="cuon">
  <div class="hang" style="gap:2px;margin-top:6px"><div class="lui">${P.trai}Trang chủ</div><div class="mot" style="font:700 19px Inter;flex:1">Máy của Bảo Anh</div></div>
  <div class="canh-rob"><div class="bong"><div class="lon">1 máy</div><div class="phu">Mọi máy đều được bảo vệ đầy đủ.</div></div><img class="rob" src="/assets/rob/chi.webp" alt=""></div>
  <section class="the ds" style="padding:6px 16px"><div class="dong"><div class="bt xanh lon">${I('laptop')}</div><div class="chu"><div class="ten">Laptop của Bảo Anh · Windows 11</div><div class="phu">Chặn thật · bảo vệ đầy đủ · đồng bộ 5 phút trước</div></div><span class="huy ok">Tuân thủ</span></div></section>
  <p class="tx">Chạm một máy để đổi Chặn thật / Giám sát, mở khẩn cấp, lấy mã mở khi mất mạng hoặc gỡ AiiGrow.</p>
  <button class="nut vien rong" style="margin-top:auto">${P.cong}Ghép thêm máy</button>
</div>${tab(3, 4)}`, CSS);

const chonLoai = pg(2, 'Thiết bị', `${canh('chi', 'Bảo Anh dùng máy nào?', 'Mỗi máy một cách bảo vệ — Rob dẫn từng bước.')}
  ${ochon(0, 'may_tinh', 'xanh', 'Laptop Windows', 'Bảo vệ toàn diện · chặn app, web, cài đặt')}
  ${ochon(0, 'tablet', 'lam', 'iPad / iPhone', 'Theo mức Apple cho phép · Screen Time')}
  ${ochon(1, 'dt', 'tim', 'Điện thoại Android', 'Toàn diện khi cấp đủ quyền')}
  ${ochon(0, 'laptop', 'cam', 'MacBook / iMac', 'Cần cấp quyền bộ lọc nội dung')}`, nutDen('Tiếp: ghép máy'), '07:34');

const ghepThem = man(`<div class="nh2" style="margin-top:6px">Ghép máy</div>
  <section class="the" style="display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;padding:18px">
    <div style="font:700 17px/24px Inter">Trên điện thoại của Bảo Anh: mở trang dưới, tải AiiGrow Con rồi nhập mã này.</div>
    <div class="nhap" style="width:100%;text-align:center;font:800 19px Inter;color:var(--chinhInk)">aiigrow.aiilab.vn/tai</div>
    <div class="ma6"><div>3</div><div>6</div><div>0</div><div>5</div><div>2</div><div>8</div></div>
    <div class="hang" style="gap:10px;flex-wrap:nowrap;justify-content:center"><span class="s13 c3 so">Hết hạn lúc 07:49</span><span class="lk" style="font-size:13px">Tạo mã mới</span><span class="lk" style="font-size:13px">Chép link</span></div></section>
  <section class="the" style="padding:8px 16px">${tk('x', 'Máy đã nhận mã', 'Điện thoại của Bảo Anh')}${tk('', 'Cấp quyền bảo vệ', 'Bộ lọc web, chặn cài đặt, chống gỡ…')}</section>`, nutDen('Xong'), '07:34', 'Máy của Bảo Anh');

const mayMoi = dt(`${sb('07:36')}<div class="cuon">
  <div class="hang" style="gap:2px;margin-top:6px"><div class="lui">${P.trai}Quay lại</div><div class="mot" style="font:700 19px Inter;flex:1">Điện thoại của Bảo Anh ·…</div></div>
  <div class="canh-rob" style="min-height:150px"><div class="bong"><div class="lon">Tuân thủ</div><div class="phu">Đồng bộ 1 phút trước · bản 0.2.7</div></div><img class="rob" src="/assets/rob/chi.webp" alt=""></div>
  <div style="font:700 15px Inter;padding:0 4px">Chế độ trên máy</div>
  <div class="seg"><div>Giám sát</div><div class="c">Chặn thật</div></div>
  <p class="tx" style="font-size:13.5px">Áp thật: chặn app ngoài danh sách, khoá máy ngoài giờ. Muốn tắt thì chọn lại Giám sát — máy đổi ở lần đồng bộ tới khi có mạng.</p>
  <div class="hang" style="gap:10px"><div class="ox"><div class="n">Điểm tuân thủ</div><div class="s so">96<small>/100</small></div></div><div class="ox"><div class="n">Giải trí</div><div class="s">Mở</div></div></div>
  ${bao('ok', 'tick', 'Máy được bảo vệ đầy đủ, không có vấn đề nào', '')}
</div>${tab(3, 4)}`, CSS);

// ---------- Hành trình 3: Trang web tải bộ cài ----------
const hdr = (tieu, ml) => `<img class="logo" src="/assets/logo.png" alt=""><h1>${tieu}</h1>${ml ? `<p class="ml">${ml}</p>` : ''}`;
const boc = (ic, mau, ten, nut, phu, vien = false) => `<section class="the"><div class="ht"><div class="bt ${mau} lon">${I(ic)}</div>${ten}</div><button class="nut${vien ? ' vien' : ''} rong" style="margin-top:12px">${I('tai')}${nut}</button><div class="tp">${phu}</div></section>`;
const buoc = (n, t, s = '') => `<div class="bc"><b class="n">${n}</b><div>${t}${s ? `<small>${s}</small>` : ''}</div></div>`;
const nhac = `<div class="nhac"><div class="bt vang">${I('khoa')}</div><div>Cài xong trên máy của Con là <b>chặn luôn</b>: app chưa xếp loại không mở được, giờ ngủ thì khoá. Ba Mẹ muốn tạm chỉ theo dõi thì chọn «Chỉ theo dõi» ngay trong app.</div></div>`;
const chan = (...l) => `<div class="ft">${l.join('<br><br>')}</div><div class="ve">${P.trai}Về app AiiGrow</div>`;
const web = (b) => doc(b, 'wb', CSS);

const taiWin = web(`${hdr('Tải AiiGrow cho máy của Con', 'Cài trên máy tính Windows để đồng hành cùng Con. Cài xong trên máy của Con là <b>chặn luôn</b>; Ba Mẹ chuyển sang chỉ theo dõi được trong app.')}
  ${boc('may_tinh', 'xanh', 'Máy Windows của Con', 'Tải AiiGrow cho Windows', 'Một tệp AiiGrow-Setup.exe (bản 0.2.7, ~182 MB) · Windows 10/11')}
  ${buoc(1, 'Chạy <code>AiiGrow-Setup.exe</code> vừa tải, bấm <b>Yes</b> khi Windows hỏi quyền quản trị.', 'Nếu hiện “Windows protected your PC”: bấm More info → Run anyway.')}
  ${buoc(2, '<b>Máy đã cài AiiGrow:</b> bộ cài tự cập nhật đè lên bản cũ, giữ nguyên ghép máy.')}
  ${buoc(3, '<b>Máy mới:</b> nhập <b>mã 6 số</b> lấy trong app AiiGrow: Trang chủ → “Máy tính & điện thoại” → <b>Ghép thêm máy</b>.')}
  ${nhac}`);

const taiMac = web(`${hdr('Tải AiiGrow cho máy của Con')}
  ${boc('laptop', 'xanh', 'Máy Mac của Con', 'Tải AiiGrow cho máy Mac', 'Tệp AiiGrow-0.1.3.pkg · macOS 13 trở lên · chỉ cài trên máy Mac')}
  ${buoc(1, 'Máy Mac cần <b>tài khoản riêng cho Con</b> và một <b>tài khoản quản trị của Ba Mẹ</b>.')}
  ${buoc(2, 'Đăng nhập tài khoản của Ba Mẹ, mở tệp .pkg vừa tải, bấm <b>Tiếp tục</b> rồi nhập mật khẩu quản trị.')}
  ${buoc(3, 'Cửa sổ <b>Ghép máy</b> tự mở: chọn tài khoản của Con, nhập <b>mã 6 số</b> lấy trong app AiiGrow.')}
  ${buoc(4, 'macOS báo “Đã thêm mục nền” là bình thường — đừng tắt AiiGrow trong Mục đăng nhập.')}
  ${nhac}`);

const taiAnd = web(`${hdr('Tải AiiGrow cho máy của Con')}
  <section class="the"><div class="ht"><div class="bt tim lon">${I('dt')}</div>Điện thoại Android</div>
    <div style="font:700 13.5px Inter;margin-top:12px">Điện thoại của Con</div><button class="nut rong" style="margin-top:8px">${I('tai')}Tải AiiGrow Con</button>
    <div class="tp">Tệp AiiGrow-Con-android.apk · cài trên điện thoại của Con (Android hỏi thì cho phép «Cài ứng dụng không rõ nguồn gốc»), mở app rồi nhập <b>mã 6 số</b> lấy trong app Ba Mẹ.</div>
    <div style="font:700 13.5px Inter;margin-top:12px">Điện thoại của Ba Mẹ</div><button class="nut vien rong" style="margin-top:8px">${I('tai')}Tải app Ba Mẹ</button></section>
  <p class="ml" style="font-size:14px;line-height:21px">Cài trên máy tính Windows để đồng hành cùng Con. Cài xong trên máy của Con là <b>chặn luôn</b>.</p>
  ${boc('may_tinh', 'xanh', 'Máy Windows của Con', 'Tải AiiGrow cho Windows', 'AiiGrow-Setup.exe (bản 0.2.7, ~182 MB) · Windows 10/11', true)}`);

const taiIos = web(`${hdr('Tải AiiGrow cho máy của Con')}
  <div class="bao canh" style="font-size:13.5px"><div class="bt vang">${I('tablet')}</div><div style="font:500 13.5px/19px Inter;color:var(--chu2)">Bạn đang mở trang bằng iPhone. Trên iPhone, AiiGrow là app của Ba Mẹ (đang thử qua TestFlight — nhắn AiiLab để nhận lời mời). Máy của Con cài được trên Windows, máy Mac và điện thoại Android.</div></div>
  <p class="ml" style="font-size:14px;line-height:21px">Cài trên máy tính Windows để đồng hành cùng Con. Cài xong là <b>chặn luôn</b>.</p>
  ${boc('may_tinh', 'xanh', 'Máy Windows của Con', 'Tải AiiGrow cho Windows', 'AiiGrow-Setup.exe (bản 0.2.7, ~182 MB) · Windows 10/11', true)}
  ${buoc(1, 'Chạy <code>AiiGrow-Setup.exe</code> vừa tải, bấm <b>Yes</b> khi Windows hỏi quyền quản trị.')}
  ${buoc(2, '<b>Máy mới:</b> nhập <b>mã 6 số</b> lấy trong app AiiGrow: Trang chủ → “Máy tính & điện thoại” → <b>Ghép thêm máy</b>.')}`);

const cai = web(`${hdr('Cài AiiGrow Con cho iPhone/iPad', 'Đây là link ghép máy của Con vào gia đình. Làm theo 3 bước:')}
  ${buoc(1, 'Trên máy của Con, cài app <b>AiiGrow Con</b> từ App Store.')}
  ${buoc(2, 'Quay lại link này (hoặc quét lại mã QR) — máy sẽ mở thẳng app và tự ghép, không cần nhập mã.')}
  ${buoc(3, 'Ba Mẹ duyệt quyền Screen Time bằng Apple ID của Ba Mẹ (một lần).')}
  <section class="the"><div class="ht"><div class="bt tim lon">${I('tablet')}</div>Máy của Con đã cài app?</div><button class="nut rong" style="margin-top:12px">Mở app AiiGrow Con</button>
    <div class="tp">Mã gói cài: <code>Ab3dEf9hJk2mNp4qRs6t</code><br>Mã dùng được một lần và có hạn; hết hạn thì nhờ Ba Mẹ tạo gói mới trong app Ba Mẹ.</div></section>`);

const B = (key, ten, html, anh, toi, w = 390, h = 844) => ({ key, ten, w, h, html, ...(anh ? { anh: A + anh } : {}), ...(toi ? { toi } : {}) });

export default [
  { id: 'bm-lan-dau', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Lần đầu dùng', mo: 'Ba Mẹ mở app lần đầu, đăng ký bằng số điện thoại, xác thực mã 6 số, rồi thiết lập hồ sơ Con, máy, nhiệm vụ & quà, giờ chơi.',
    buoc: [
      B('bm1-chao', 'Chào', chao, 'ss-bm-chao.jpg', 'Bấm «Bắt đầu bằng số điện thoại»'),
      B('bm1-dang-ky', 'Đăng ký', dangKy, 'ss-bm-dang-ky.jpg', 'Bấm «Gửi mã»'),
      B('bm1-otp', 'Nhập mã 6 số', otp, 'ss-bm-otp.jpg', 'Bấm «Xác nhận»'),
      B('bm1-ob-ten-con', 'Bước 1 · Con', tenCon, 'ss-bm-ob-ten-con.jpg', 'Bấm «Tiếp: chọn thiết bị»'),
      B('bm1-ob-may', 'Bước 2 · Thiết bị', may, 'ss-bm-ob-may.jpg', 'Bấm «Tiếp: ghép máy»'),
      B('bm1-ob-ghep', 'Bước 3 · Ghép máy', ghep, 'ss-bm-ob-ghep.jpg', 'Bấm «Tiếp: nhiệm vụ & quà»'),
      B('bm1-ob-mau', 'Bước 4 · Nhiệm vụ & quà', mau, 'ss-bm-ob-mau.jpg', 'Bấm «Dùng mẫu này»'),
      B('bm1-ob-gio', 'Bước 5 · Giờ chơi', gio, 'ss-bm-ob-gio.jpg', 'Bấm «Lưu và gửi xuống máy»'),
      B('bm1-ob-xong', 'Xong rồi', xong, 'ss-bm-ob-xong.jpg', 'Bấm «Vào Trang chủ»'),
      B('bm1-dang-nhap', 'Đăng nhập lại (nhánh)', dangNhap, 'ss-bm-dang-nhap.jpg', 'Bấm «Đăng nhập»'),
      B('bm1-moi', 'Nhập mã mời (nhánh)', moi, 'ss-bm-moi.jpg'),
    ] },
  { id: 'bm-ghep-may', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Ghép thêm máy', mo: 'Từ «Máy của con», Ba Mẹ chọn loại máy, mở trang tải trên máy Con, nhập mã ghép 6 số và thấy máy mới chạy «Chặn thật».',
    buoc: [
      B('bm1-may-ds', 'Máy của con', mayDs, 'ss-bm-may-ds.jpg', 'Bấm «Ghép thêm máy»'),
      B('bm1-may-chon-loai', 'Chọn loại máy', chonLoai, 'ss-bm-ob-may.jpg', 'Bấm «Tiếp: ghép máy»'),
      B('bm1-may-ghep', 'Mã ghép 6 số', ghepThem, 'ss-bm-ob-ghep.jpg', 'Con nhập mã trên máy mới'),
      B('bm1-may-moi', 'Máy mới «Chặn thật»', mayMoi, 'ss-bm-may-m1.jpg'),
    ] },
  { id: 'web-tai', vai: 'Ba Mẹ', nen: 'Web', ten: 'Trang tải bộ cài', mo: 'Trang aiigrow.aiilab.vn/tai (và /cai) mở trên máy Con hoặc điện thoại: tải bộ cài theo nền tảng rồi nhập mã ghép.',
    buoc: [
      B('bm1-web-tai-windows', 'Tải cho Windows', taiWin, 'sau-web-tai-windows-390.png', 'Chọn máy Mac'),
      B('bm1-web-tai-mac', 'Tải cho Mac', taiMac, 'sau-web-tai-mac-390.png', 'Chọn Android'),
      B('bm1-web-tai-android', 'Tải cho Android', taiAnd, 'sau-web-tai-android-390.png', 'Mở bằng iPhone'),
      B('bm1-web-tai-iphone', 'Mở bằng iPhone', taiIos, 'sau-web-tai-iphone-390.png', 'Mở link ghép iPhone/iPad'),
      B('bm1-web-cai', 'Cài cho iPhone/iPad (/cai)', cai, 'sau-web-cai-390.png'),
    ] },
];
