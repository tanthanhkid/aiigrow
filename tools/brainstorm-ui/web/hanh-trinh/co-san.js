// Các màn AiiGrow dựng sẵn bằng HTML/CSS theo docs/THIET-KE-CLAY.md (Clay gương), dựa trên ảnh chụp thật
// ở aiigrow-thiet-ke/chinchu-ios (app Ba Mẹ) và man-win-2510 / man-mac-2510 (máy Con). Mỗi màn là một tài liệu HTML đầy đủ,
// render trong iframe sandbox (srcdoc). Ảnh: /assets/icon3d/*.webp (Fluent 3D), /assets/rob/*.webp (Rob), /assets/logo.png.

import { I, P, sb, tab, chipCon, viec, doc, dt, ben, desk, nv, tin } from '../kit/dung.js';

// ---------- app Ba Mẹ (điện thoại 390×844) ----------
const BM_TRANG_CHU = dt(`${sb('07:31')}<div class="cuon">
  <div class="tieu" style="margin-top:6px"><h1 class="tieuLon">Trang chủ</h1>
    <div class="hang" style="gap:10px"><div class="bt xam lon" style="position:relative">${I('chuong')}<b class="dem" style="position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;font-size:12px">3</b></div>
    <img src="/assets/rob/rob-goc.webp" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:var(--clayNho)"></div></div>
  ${chipCon(0)}
  <div class="hang" style="margin:0 2px"><div class="chip cong">${P.cong}</div></div>
  <section class="the cho"><div class="dau"><span class="dem">3</span>việc chờ Ba Mẹ</div><div class="viecs">
    ${viec('Bảo Anh nộp nhiệm vụ «Tập thể dục 30 phút»', '<b>+10 điểm</b> · nộp 06:19 · ảnh giống lần trước', 'Xem ảnh')}
    ${viec('Bảo Anh xin thêm 30 phút chơi Minecraft', 'Con nhắn: «Con làm xong bài rồi ạ» · 06:52')}
  </div></section>
  <section class="the"><div class="hang"><div style="flex:1;min-width:0"><div class="s13 m c3 mot"><span class="cham"></span>Laptop của Bảo Anh · Windows</div>
    <div style="font:800 26px/32px Inter;margin-top:4px">Còn 45 phút</div></div><button class="nut nho">${I('khoa')}Khoá máy</button></div>
    <div class="hang" style="margin-top:12px"><div class="tien" style="flex:1"><i style="width:50%"></i></div><span class="s13 m c2 so">45/90 phút giải trí</span></div></section>
</div>${tab(0, 4)}`);

const BM_CHO_DUYET = dt(`${sb('07:32')}<div class="cuon">
  <h1 class="tieuLon" style="margin-top:6px">Chờ duyệt</h1>
  ${chipCon(0)}
  <section class="the cho"><div class="dau"><span class="dem">4</span>việc cần Ba Mẹ xem</div><div class="viecs">
    ${viec('Nộp nhiệm vụ «Đọc sách “Dế Mèn phiêu lưu ký” 50 trang»', '<b>+30 điểm</b> · nộp 06:44 · 2 ảnh')}
    ${viec('Xin mở trang «khanacademy.org»', 'Con nhắn: «Bài toán cô giao ạ» · 07:05')}
    ${viec('Đổi quà «Thêm 30 phút chơi Minecraft»', '<b>120 điểm</b> · ví còn 340 điểm', 'Trao quà')}
  </div></section>
  <p class="s13 c3" style="padding:0 6px;line-height:19px">Từ chối thì con nhận lời nhắn của Ba Mẹ ngay trên máy. Duyệt nhầm? Bấm «Hoàn tác» trong 5 giây.</p>
</div>${tab(1, 4)}`);

const BM_MAY = dt(`${sb('07:33')}<div class="cuon">
  <div class="hang" style="gap:2px;margin-top:6px"><div class="lui">${P.trai}Trang chủ</div><div class="mot" style="font:700 19px Inter;flex:1">Máy của Bảo Anh</div></div>
  <div class="canh-rob"><div class="bong"><div class="lon">2 máy</div><div class="phu">1 máy đang cần Ba Mẹ để mắt.</div></div><img class="rob" src="/assets/rob/chi.webp" alt=""></div>
  <section class="the ds" style="padding:6px 16px">
    <div class="dong"><div class="bt xanh lon">${I('laptop')}</div><div class="chu"><div class="ten">Laptop của Bảo Anh · Windows 11</div><div class="phu">Chặn thật · bảo vệ đầy đủ · đồng bộ 5 phút trước</div></div><span class="huy ok">Tuân thủ</span></div>
    <div class="dong"><div class="bt cam lon">${I('tablet')}</div><div class="chu"><div class="ten">iPad của Bảo Anh</div><div class="phu">Bảo vệ chưa đủ — xem cách sửa · đồng bộ 1 ngày trước</div></div><span class="huy lech">Lệch chuẩn</span></div>
  </section>
  <p class="s13 c3" style="padding:0 6px;line-height:19px">Chạm một máy để đổi Chặn thật / Giám sát, mở khẩn cấp, lấy mã mở khi mất mạng hoặc gỡ AiiGrow.</p>
  <button class="nut vien rong" style="margin-top:auto">${P.cong}Ghép thêm máy</button>
</div>${tab(3, 4)}`);

const BM_BAO_CAO = dt(`${sb('07:34')}<div class="cuon">
  <div class="lui" style="margin-top:6px">${P.trai}Quay lại</div>
  <h1 class="tieuLon">Báo cáo tuần</h1>
  <div class="hang" style="gap:8px;background:var(--lom);box-shadow:var(--lomIn);border-radius:26px;padding:5px"><div class="chip chon" style="color:var(--chinhInk)">Nguyễn Ngọc Bảo Anh</div><div class="chip chon" style="background:none;box-shadow:none">Bill</div></div>
  <div class="canh-rob" style="min-height:220px"><div class="bong"><div class="lon" style="font-size:21px;line-height:26px">Tuần này Bảo Anh đọc sách nhiều hơn tuần trước 2 lần</div><div class="phu">Học 6 giờ 20 · Giải trí 4 giờ 10.</div></div><img class="rob" src="/assets/rob/canh-hoc.webp" alt=""></div>
  <section class="the"><div class="hang s13 m c2" style="gap:16px;margin:0 4px 10px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--chinh);margin-right:6px"></i>Học</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#5b4fd6;margin-right:6px"></i>Giải trí</span></div>
    <div class="cot">${[[70, 40], [100, 52], [44, 80], [92, 30], [76, 62], [58, 96], [36, 82]].map(([h, g], i) => `<div class="ngay"><div class="doi"><i class="h" style="height:${h}%"></i><i class="g" style="height:${g}%"></i></div><span>${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}</span></div>`).join('')}</div></section>
  <section class="the ds" style="padding:4px 16px"><div class="dong"><div class="bt tim lon">${I('cot')}</div><div class="chu"><div class="ten">Thời gian màn hình</div><div class="phu">Từng app, trang web trong tuần, theo mục</div></div>${P.phai}</div></section>
</div>${tab(0, 4)}`);

const BM_NHIEM_VU = dt(`${sb('07:35')}<div class="cuon">
  <div class="tieu" style="margin-top:6px"><h1 class="tieuLon">Nhiệm vụ & quà</h1><button class="nut ngoc nho">${P.cong}Giao</button></div>
  ${chipCon(0)}
  <section class="the vang"><div class="hang"><div class="bt vang lon">${I('xu')}</div><div style="flex:1"><div class="s13 m nhan-diem">Ví điểm của Bảo Anh</div><div style="font:800 30px Inter" class="so nhan-diem">340 điểm</div></div></div>
    <div class="s13 c2" style="margin-top:8px">Cấp 3 · còn 60 điểm lên cấp · 20 điểm đang chờ duyệt</div></section>
  <section class="the ds" style="padding:4px 16px">
    <div class="dong"><div class="bt xanh">${I('sach')}</div><div class="chu"><div class="ten">Đọc 20 trang sách</div><div class="phu">Hằng ngày · <b class="nhan-diem">+30 điểm</b> · đang làm</div></div>${P.phai}</div>
    <div class="dong"><div class="bt lam">${I('chay')}</div><div class="chu"><div class="ten">Tập thể dục 30 phút</div><div class="phu">T2–T6 · <b class="nhan-diem">+10 điểm</b> · chờ duyệt</div></div>${P.phai}</div>
    <div class="dong"><div class="bt cam">${I('chen')}</div><div class="chu"><div class="ten">Rửa chén sau bữa tối</div><div class="phu">Hằng ngày · <b class="nhan-diem">+10 điểm</b></div></div>${P.phai}</div>
  </section>
  <div class="tieu" style="padding:0 6px"><b class="s16">Quà con đổi được</b><span class="s13 m nhan-xanh">Thêm quà</span></div>
  <section class="the ds" style="padding:4px 16px"><div class="dong"><div class="bt vang">${I('game')}</div><div class="chu"><div class="ten">Thêm 30 phút Minecraft</div><div class="phu">120 điểm · đổi 3 lần tuần này</div></div>${P.phai}</div></section>
</div>${tab(2, 4)}`);

const CON_HOM_NAY = desk(0, `<h1 class="tieuLon">Chào Minh Khôi!</h1>
  <section class="the"><div class="c2 s16">Thời gian dùng máy còn lại</div><div class="so" style="font:800 76px/88px Inter;color:var(--chinhInk);letter-spacing:-2px">47:29</div>
    <div class="hang"><div class="tien" style="flex:1"><i style="width:53%"></i></div><span class="s15 m c2">còn hôm nay · Chế độ: Tự do</span></div></section>
  <div class="hang" style="gap:14px;flex-wrap:wrap"><button class="nut ngoc">${I('dong_ho_cat')}Xin thêm thời gian</button><button class="nut vien">${I('sao')}Đổi điểm lấy thời gian</button><button class="nut vien">${I('web')}Xin mở trang hoặc app</button></div>
  <p class="c3 s15">Điểm hiện có đổi được khoảng 18 phút chơi Roblox.</p>
  <section class="the hang"><div class="bt xam lon">${I('khoa')}</div><div style="flex:1"><b class="s16">Ba Mẹ cần máy?</b><div class="c3 s15">Bấm nút này hoặc Win+L để khoá ngay.</div></div><button class="nut vien nho">Khoá máy</button></section>`);

const CON_NHIEM_VU = desk(1, `<h1 class="tieuLon">Nhiệm vụ của con</h1>
  ${nv('Tưới cây ngoài ban công', '+10 điểm', 'Tưới đủ năm chậu, nhớ tưới cả chậu hoa giấy ở góc.', '<div class="s15 b nhan-cam" style="margin-top:8px">Ba Mẹ nhắn: Ảnh hơi mờ, con chụp lại giúp Ba Mẹ nhé — chụp cả năm chậu cây.</div>', 'Nộp lại')}
  ${nv('Đọc 20 trang «Dế Mèn phiêu lưu ký»', '+30 điểm', 'Đọc xong kể lại cho Ba Mẹ nghe nhân vật con thích nhất và vì sao.', '<div class="c2 s15" style="margin-top:6px">Đang làm · còn 4 giờ · làm ít nhất 20 phút rồi mới nộp được.</div>', 'Nộp bài', 'ngoc')}`, 'so-tay');

const CON_PHAN_QUA = desk(2, `<h1 class="tieuLon">Phần quà & điểm</h1>
  <section class="the vang"><div class="bt vang lon">${I('sao')}</div><div class="s16 c2" style="margin-top:10px">Điểm của con</div><div class="so nhan-diem" style="font:800 58px/68px Inter">340 điểm</div><div class="s15 c2">Cấp 3 · còn 60 điểm lên cấp · 20 điểm đang chờ Ba Mẹ duyệt</div></section>
  <section class="the"><div style="font:700 18px Inter">Một buổi xem phim cùng Ba <span class="nhan-diem">· 200 điểm</span></div><div class="c3 s15" style="margin-top:4px">Đã đổi, đang chờ Ba Mẹ trao quà cho con.</div></section>
  <b style="font:700 21px Inter;margin:4px 2px 0">Quà con có thể đổi</b>
  <section class="the"><div style="font:700 18px Inter">Thêm 30 phút chơi Minecraft <span class="nhan-diem">· 120 điểm</span></div><div class="s15 b nhan-xanh" style="margin-top:4px">Đủ điểm</div><button class="nut ngoc" style="margin-top:10px;width:240px">${I('qua')}Đổi quà</button></section>`, 'qua');

const CON_TIN_NHAN = desk(3, `<h1 class="tieuLon">Tin nhắn</h1>
  <section class="the" style="display:flex;flex-direction:column;gap:12px;flex:1;min-height:0">
  ${tin('Mẹ', 'Con làm xong bài Toán chưa? Xong thì Mẹ cho thêm 30 phút nhé.', '11:40')}
  ${tin('Con', 'Con xong rồi ạ, con gửi ảnh ở mục Nhiệm vụ rồi.', '11:52', true)}
  ${tin('Ba', 'Giỏi lắm! Ba đã duyệt, +10 điểm vào ví của con.', '12:05')}
  <div class="hang" style="margin-top:auto"><div class="nhap" style="flex:1">Nhắn Ba Mẹ…</div><button class="nut ngoc">${I('gui')}Gửi</button></div></section>`, 'cho');

const CON_KHOA = doc(`<div class="vien-khoa">${I('khoa').replace('class="ic"', 'class="ic" style="width:56px;height:56px"')}</div>
  <h1>Hết giờ dùng máy hôm nay</h1><p class="phu">Con lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian.</p>
  <section class="the" style="display:flex;flex-direction:column;gap:12px;padding:20px 22px">
    <div class="hang"><div class="bt vang">${I('dong_ho_cat')}</div><b class="s16">Con muốn thêm bao lâu?</b></div>
    <div class="hang" style="gap:12px"><div class="chip chon ngoc">30 phút</div><div class="chip chon">1 giờ</div><div class="chip chon">2 giờ</div></div>
    <div class="s13 m c3">Nhắn Ba Mẹ (không bắt buộc)</div><div class="nhap">Ví dụ: con cần làm nốt bài tập</div>
    <button class="nut rong">Xin Ba Mẹ</button></section>
  <div class="chan">AiiGrow · máy này do Ba Mẹ quản lý · mất mạng thì xin Ba Mẹ mã mở</div>`, 'khoa');

const CON_XIN_GIO = doc(`<h1 style="font:800 30px/36px Inter;letter-spacing:-.5px">Con muốn thêm bao lâu?</h1>
  <div class="hang" style="gap:14px"><div class="chip chon" style="min-height:56px;font-size:17px">30 phút</div><div class="chip chon ngoc" style="min-height:56px;font-size:17px">1 giờ</div><div class="chip chon" style="min-height:56px;font-size:17px">2 giờ</div></div>
  <div class="s15 m c3">Nhắn Ba Mẹ (không bắt buộc)</div>
  <div class="nhap" style="min-height:96px;color:var(--chu)">Con đang làm dở bài thuyết trình nhóm môn Khoa học, xin Ba Mẹ thêm 1 giờ ạ.</div>
  <button class="nut ngoc rong" style="min-height:58px;font-size:18px;margin-top:auto">${I('tin')}Xin Ba Mẹ</button>`, 'hop');

export { BM_TRANG_CHU, BM_CHO_DUYET, BM_MAY, BM_BAO_CAO, BM_NHIEM_VU, CON_HOM_NAY, CON_NHIEM_VU, CON_PHAN_QUA, CON_TIN_NHAN, CON_KHOA, CON_XIN_GIO };
export const MAN = [
  { key: 'bm-trang-chu', nhom: 'Ba Mẹ', ten: 'Trang chủ', w: 390, h: 844, html: BM_TRANG_CHU },
  { key: 'bm-cho-duyet', nhom: 'Ba Mẹ', ten: 'Chờ duyệt', w: 390, h: 844, html: BM_CHO_DUYET },
  { key: 'bm-may', nhom: 'Ba Mẹ', ten: 'Máy của con', w: 390, h: 844, html: BM_MAY },
  { key: 'bm-bao-cao', nhom: 'Ba Mẹ', ten: 'Báo cáo tuần', w: 390, h: 844, html: BM_BAO_CAO },
  { key: 'bm-nhiem-vu', nhom: 'Ba Mẹ', ten: 'Nhiệm vụ & quà', w: 390, h: 844, html: BM_NHIEM_VU },
  { key: 'con-hom-nay', nhom: 'Con', ten: 'Hôm nay', w: 1100, h: 720, html: CON_HOM_NAY },
  { key: 'con-nhiem-vu', nhom: 'Con', ten: 'Nhiệm vụ', w: 1100, h: 720, html: CON_NHIEM_VU },
  { key: 'con-phan-qua', nhom: 'Con', ten: 'Phần quà & điểm', w: 1100, h: 720, html: CON_PHAN_QUA },
  { key: 'con-tin-nhan', nhom: 'Con', ten: 'Tin nhắn', w: 1100, h: 720, html: CON_TIN_NHAN },
  { key: 'con-khoa', nhom: 'Con', ten: 'Màn khoá', w: 1100, h: 720, html: CON_KHOA },
  { key: 'con-xin-gio', nhom: 'Con', ten: 'Xin thêm giờ', w: 560, h: 460, html: CON_XIN_GIO },
];
