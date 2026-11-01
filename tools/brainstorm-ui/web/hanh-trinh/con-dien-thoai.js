// Hành trình Con trên điện thoại (app Con Expo mobile/src/app/tre/*, iPhone agent-ios, Android agent-android). Màn 390×844. Key tiền tố `cdt-`.
import { I, P, sb, doc, dt } from '../kit/dung.js';
import { khop } from './that/index.js';   // màn Android dựng khớp ảnh chụp thật (that/android.js, 360×800 @3x)

const CSS = `
.dt{background:linear-gradient(180deg,#fdf0c9 0,#f6f4ee 36%,#f4f3ef 100%)}
.dt.mat{background:radial-gradient(120% 50% at 20% 0,#e3ebe7 0,#ecebe7 70%)}
.cuon.f{bottom:132px}.cuon.g{bottom:0}
.dm{display:flex;justify-content:space-between;align-items:center;margin:4px 0}
.dm .chip{padding:0 14px 0 8px;color:var(--diemInk)}
.rb{display:block;margin:0 auto;height:200px;object-fit:contain}
.rb.s{height:150px}
.bg{background:#fff;border-radius:26px;padding:16px 18px;text-align:center;box-shadow:var(--clayNho);margin:0 8px}
.bg h2{font:800 24px/29px Inter;letter-spacing:-.4px}
.bg p{font:500 15.5px/22px Inter;color:var(--chu2);margin-top:4px}
.day{position:absolute;left:16px;right:16px;bottom:26px;display:flex;flex-direction:column;gap:10px}
.nut.vang{color:var(--diemInk);background:linear-gradient(180deg,#fff3c4,#f5b70a);box-shadow:var(--clayNho)}
.nut.huy{color:#fff;background:linear-gradient(180deg,#c9301f,#9c1d12)}
.ghi{font:500 13.5px/19px Inter;color:var(--chu3);text-align:center}
.ghi b{color:var(--chinhInk)}
.ol{display:flex;align-items:center;gap:12px;padding:14px 16px;min-height:72px}
.ol .t{font:700 17px/22px Inter}.ol .p{font:500 13.5px/18px Inter;color:var(--chu3);margin-top:2px}
.ol .chu{flex:1;min-width:0}
.nhan{display:inline-flex;align-items:center;height:28px;padding:0 11px;border-radius:99px;font:700 13px Inter;white-space:nowrap;flex:none;background:var(--xamSoft);color:var(--chu2)}
.nhan.d{background:var(--diemSoft);color:var(--diemInk)}.nhan.c{background:var(--canhSoft);color:var(--canh)}.nhan.l{background:var(--lamSoft);color:#1a44c0}.nhan.o{background:var(--chinhSoft);color:var(--chinhInk)}
.mang{background:var(--canhSoft);color:var(--canh);border-radius:18px;padding:10px 14px;font:600 13.5px/19px Inter}
.buoc{display:flex;gap:12px;align-items:flex-start;padding:7px 0;font:500 15.5px/22px Inter}
.buoc i{flex:none;width:30px;height:30px;border-radius:50%;background:linear-gradient(180deg,#14826f,#09524a);color:#fff;font:700 14px/30px Inter;text-align:center;font-style:normal;box-shadow:var(--clayNho)}
.bien{width:132px;height:132px;border-radius:50%;margin:0 auto;background:var(--the);box-shadow:var(--clay);display:flex;align-items:center;justify-content:center}
.bien .ic{width:76px;height:76px}
.bien.n{width:86px;height:86px}.bien.n .ic{width:50px;height:50px}
.h1{font:800 29px/34px Inter;letter-spacing:-.6px;text-align:center}
.mo{font:500 16px/23px Inter;color:var(--chu2);text-align:center}
.ma6{height:64px;border-radius:22px;background:var(--lom);box-shadow:var(--lomIn);display:flex;align-items:center;justify-content:center;font:700 32px 'SF Mono',Menlo,monospace;letter-spacing:8px;color:#aeb2b0}
.pad{position:absolute;left:0;right:0;bottom:0;height:272px;background:#d9dcdb;border-radius:22px 22px 0 0;padding:10px 6px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pad span{background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font:400 24px Inter;height:56px}
.pad span.z{background:none}
.sheet{position:absolute;left:0;right:0;top:44px;bottom:0;border-radius:36px 36px 0 0;background:linear-gradient(180deg,#e3ebe7,#ecebe7 60%);padding:18px 20px;overflow:hidden;display:flex;flex-direction:column;gap:14px}
.dong{display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 0}
.chipx{display:inline-flex;align-items:center;height:46px;padding:0 20px;border-radius:99px;background:var(--the);box-shadow:var(--clayNho);font:700 15.5px Inter;color:var(--chinhInk);white-space:nowrap}
.chipx.d{color:#fff;background:linear-gradient(180deg,#14826f,#09524a)}
.tr{display:flex;gap:10px}.tr .chipx{flex:1;justify-content:center;padding:0}
.xbtn{width:44px;height:44px;border-radius:50%;background:var(--the);box-shadow:var(--clayNho);display:flex;align-items:center;justify-content:center;color:var(--chinhInk)}
.ng{background:#10231f}.ng .the{background-color:#fff}
.tab.c a{font-size:12px}
`;
const ten = 'Bảo Anh';
const GIFT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 7h-2.2A3 3 0 0 0 12 5.3 3 3 0 0 0 6.2 7H4a1 1 0 0 0-1 1v3h8V7h2v4h8V8a1 1 0 0 0-1-1ZM9 7a1 1 0 1 1 0-2c.8 0 1.6 1 2 2Zm6 0h-2c.4-1 1.2-2 2-2a1 1 0 1 1 0 2ZM4 13v6a1 1 0 0 0 1 1h6v-7Zm9 0v7h6a1 1 0 0 0 1-1v-6Z"/></svg>';
const CHAT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.300 4.500 3.400 6L4.800 21l4-1.800c.9.200 2.100.300 3.200.300 5.500 0 10-3.600 10-8S17.500 3 12 3Z"/></svg>';
const tabC = (dang) => `<nav class="tab c">${[[P.nha, 'Nhà'], [P.sao, 'Nhiệm vụ'], [GIFT, 'Cửa hàng'], [CHAT, 'Xin phép']].map(([ic, t], i) => `<a class="${i === dang ? 'dang' : ''}">${ic}<span>${t}</span></a>`).join('')}</nav>`;
const diem = (n = 45, chuoi = 6) => `<div class="dm"><div class="chip">${I('xu')}${n} điểm</div><div class="chip">${I('lua')}${chuoi} ngày</div></div>`;
const rob = (r, s = '') => `<img class="rb ${s}" src="/assets/rob/${r}.webp" alt="">`;
const bong = (t, p) => `<div class="bg"><h2>${t}</h2>${p ? `<p>${p}</p>` : ''}</div>`;
const day = (...n) => `<div class="day">${n.join('')}</div>`;
const nut = (t, c = '', ic = '') => `<button class="nut rong ${c}">${ic ? I(ic) : ''}${t}</button>`;
const ol = (ic, mau, t, p, phai = P.phai) => `<div class="the ol"><div class="bt ${mau} lon">${I(ic)}</div><div class="chu"><div class="t mot">${t}</div><div class="p">${p}</div></div>${phai}</div>`;
const mang = (t) => `<div class="mang">${t}</div>`;
const lui = (t = 'Nhà') => `<div class="lui">${P.trai}${t}</div>`;
const man = (body, o = {}) => dt(`${sb(o.gio || '07:36')}${body}`, CSS);
const cuon = (n, c = 'f') => `<div class="cuon ${c}">${n}</div>`;
// màn "cảnh giữa": Rob + bóng thoại + nút
const canh = (r, t, p, nuts, o = {}) => man(`${cuon(`${o.mang ? mang(o.mang) : ''}${o.diem === false ? '' : diem()}<div style="flex:1"></div>${rob(r)}${bong(t, p)}<div style="flex:1"></div>`, o.tab ? '' : 'f')}${o.tab !== undefined ? tabC(o.tab) : ''}${nuts ? day(...nuts) : ''}`, o);
const ghepSheet = (body, o = {}) => `<div class="sheet">${body}</div>`;
const iosMan = (body, gio = '09:41') => doc(`${sb(gio)}${body}`, 'dt mat', CSS);
const vong = (pt, so, phu) => `<div style="position:relative;width:210px;height:210px;margin:0 auto"><svg viewBox="0 0 210 210" style="width:210px;height:210px"><circle cx="105" cy="105" r="92" fill="none" stroke="#e4e3de" stroke-width="16"/><circle cx="105" cy="105" r="92" fill="none" stroke="#0f6b5c" stroke-width="16" stroke-linecap="round" stroke-dasharray="${578 * pt} 578" transform="rotate(-90 105 105)"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font:800 46px Inter;letter-spacing:-1px" class="so">${so}</div><div class="s13 c3" style="font:500 14px Inter;color:var(--chu3)">${phu}</div></div></div>`;
const the3 = (a, b, c) => `<section class="the" style="padding:12px 16px">${[a, b, c].map((x, i) => `<div class="buoc"><i>${i + 1}</i><span>${x}</span></div>`).join('')}</section>`;

// ================= 1. Cài app Con =================
const chao = man(`${cuon(`<div style="flex:1"></div>${rob('xong')}${bong('Chào Bảo Anh! Mình là Rob', 'Làm việc tốt thì được điểm, điểm đổi phút chơi và quà.')}
  <section class="the" style="padding:6px 16px">${[['sao', 'vang', 'Làm việc tốt → được điểm'], ['game', 'xanh', 'Điểm đổi phút chơi, quà, phiếu quà'], ['tin', 'tim', 'Muốn thêm? Xin phép Ba Mẹ']].map(([ic, m, t]) => `<div class="dong"><div class="bt ${m}">${I(ic)}</div><div style="font:600 15.5px/21px Inter;flex:1">${t}</div></div>`).join('')}</section><div style="flex:1"></div>`, 'f')}
  ${day(nut('Nhận 20 điểm', 'vang', 'qua'), nut('Rob đọc to cho Bảo Anh nghe', 'vien'))}`);

const cai = man(`${cuon(`<div style="flex:1"></div>${rob('chi', 's')}
  <div style="text-align:center"><span class="nhan c">Quy tắc: cài phần mềm mới cần Ba Mẹ duyệt</span></div>
  <div class="h1" style="font-size:26px">MinecraftInstaller.exe chưa được cài</div><p class="mo">Gửi yêu cầu kèm lý do. Ba Mẹ duyệt thì bấm lại là cài được.</p>
  <div class="hang" style="gap:8px;flex-wrap:wrap"><span class="chipx d">Bạn bè đang chơi</span><span class="chipx">Để học</span><span class="chipx">Tự viết…</span></div><div style="flex:1"></div>`, 'f')}${day(nut('Xin Ba Mẹ cài Minecraft', 'ngoc'), nut('Huỷ', 'vien'))}`);

const chuaGhep = iosMan(`<div class="cuon g" style="justify-content:center;gap:16px"><div class="bien">${I('sach').replace('sach', 'sach')}</div>
  <div class="h1" style="font-size:34px">AiiGrow Con</div><p class="mo">Ứng dụng giúp Ba Mẹ và con cùng giữ giờ chơi hợp lý trên iPhone, iPad.</p>
  ${the3('Ba Mẹ mở app AiiGrow, chọn «Thêm máy» › iPhone/iPad.', 'Quét mã QR bằng Camera của máy này — app tự ghép.', 'Hoặc bấm «Nhập mã ghép» và gõ mã 6 số Ba Mẹ đọc cho.')}</div>
  ${day(nut('Nhập mã ghép'), '<div class="ghi">Máy được quản lý sẽ luôn hiện điều đó cho con biết.</div>')}`);

const nhapMa = iosMan(`<div class="cuon g" style="gap:14px;padding-top:6px">${lui('Quay lại')}<div class="bien n">${I('dt')}</div><div class="h1">Nhập mã ghép</div><p class="mo">Mã 6 số hiện trong app AiiGrow của Ba Mẹ, dùng được 15 phút.</p>
  <div class="ma6">000000</div><button class="nut rong" style="opacity:.55">Ghép máy</button><div class="ghi">Ba Mẹ quản lý máy này bằng AiiGrow</div></div>
  <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${n}</span>`).join('')}<span class="z"></span><span>0</span><span class="z">⌫</span></div>`);

const quyen = iosMan(`<div class="sheet"><div class="xbtn">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'}</div><div class="bien n">${I('dong_ho_cat')}</div>
  <div class="h1" style="text-align:left;font-size:25px">Cấp quyền Thời gian sử dụng</div><p style="font:500 16px/23px Inter;color:var(--chu2)">AiiGrow dùng Thời gian sử dụng của Apple để mở / tạm khoá app theo giờ Ba Mẹ đặt. Apple sẽ hỏi Ba Mẹ xác nhận một lần. AiiGrow không đọc tin nhắn, ảnh hay nội dung app.</p>
  <div class="hang"><div style="flex:1"><b style="font:700 15.5px/21px Inter">Máy dùng Apple ID của con trong Chia sẻ gia đình</b><div class="ghi" style="text-align:left">Ba Mẹ xác nhận bằng Apple ID của Ba Mẹ; gỡ app cần Ba Mẹ đồng ý.</div></div><div style="width:52px;height:32px;border-radius:16px;background:var(--chinh);position:relative;flex:none"><i style="position:absolute;right:3px;top:3px;width:26px;height:26px;border-radius:50%;background:#fff"></i></div></div>
  <button class="nut rong">Cấp quyền</button><div class="ghi">Ba Mẹ quản lý máy này bằng AiiGrow</div></div>`);

const chinhIos = iosMan(`<div class="cuon g" style="padding-top:8px"><div class="h1" style="text-align:left;margin:6px 4px">Chào Bảo Anh!</div>
  <section class="the" style="padding:18px 16px;text-align:center">${vong(.39, '35', 'phút giải trí còn lại')}<div class="hang" style="justify-content:center;margin-top:10px"><div class="bt vang">${I('qua')}</div><b style="font:700 16px Inter;color:var(--chinhInk)">Đang chơi bằng điểm, tới 20:11</b></div><div class="ghi" style="margin-top:6px">Hôm nay đã dùng 55 / 90 phút</div></section>
  <button class="nut">${P.sao}Nhiệm vụ &amp; quà</button><button class="nut vien" style="color:var(--chinhInk)">Xin thêm giờ</button></div>`);

// ================= 2. Ngày thường =================
const nha = canh('xong', '+10 điểm!', 'Ba Mẹ nhắn: “Giỏi lắm!”', [nut('Cảm ơn Ba Mẹ ♥', 'vang'), '<div class="hang" style="justify-content:center;gap:12px">' + ['😍', '🤗', '💪'].map((e) => `<span class="chipx" style="width:60px;padding:0;justify-content:center;font-size:22px;background:#fff">${e}</span>`).join('') + '</div>'].slice(0, 2), { tab: 0 });
const nhaHome = man(`${cuon(`${diem()}${rob('canh-diem', 's')}${bong('Bảo Anh có 45 điểm', 'Còn 75 điểm nữa là đổi được «Thêm 30 phút Minecraft».')}
  ${ol('camera', 'cam', 'Chụp lại giúp Ba Mẹ', 'Tưới cây ngoài ban công')}${ol('sao', 'vang', 'Làm gì để có điểm?', '3 nhiệm vụ đang mở')}${ol('game', 'xanh', 'Chơi trò chơi', '45 phút còn lại hôm nay · tới 20:00')}${ol('qua', 'cam', 'Cửa hàng', 'Phiếu quà, quà, đặc quyền')}`, 'g').replace('class="cuon g"', 'class="cuon g" style="bottom:92px"')}${tabC(0)}`);

const nhiemVu = man(`${cuon(`${diem()}${rob('so-tay', 's')}${bong('Hôm nay làm gì nào?', 'Chọn một việc, làm xong chụp ảnh là xong!')}
  ${ol('sach', 'xanh', 'Đọc 20 trang sách', 'Hằng ngày · +30 điểm', '<span class="nhan d">+30</span>')}
  ${ol('chay', 'lam', 'Tập thể dục 30 phút', '1 ảnh chờ Ba Mẹ duyệt', '<span class="nhan l">Chờ duyệt</span>')}
  ${ol('chen', 'cam', 'Rửa chén sau bữa tối', 'Chụp lại', '<span class="nhan c">Chụp lại</span>')}`, 'g').replace('class="cuon g"', 'class="cuon g" style="bottom:92px"')}${tabC(1)}`);

const nvCT = man(`${cuon(`${lui('Quay lại')}${rob('chi', 's')}${bong('Đọc 20 trang «Dế Mèn phiêu lưu ký»', 'Đọc xong kể lại cho Ba Mẹ nghe nhân vật con thích nhất và vì sao.')}
  <div style="text-align:center"><span class="nhan d" style="height:32px;font-size:15px">+30 điểm</span></div>
  ${the3('Bấm “Bắt đầu”', 'Làm ít nhất 20 phút', 'Viết vài câu kể lại')}<div class="ghi">Hôm nay đã làm 0/1 lần</div>`)}${day(nut('Bắt đầu', 'ngoc', 'tia'))}`);

const dang = man(`${cuon(`<div style="flex:1"></div>${rob('cho', 's')}${bong('Bảo Anh đang đọc sách', 'Xong thì quay lại bấm nút xanh nhé!')}${vong(.62, '12:40', 'còn lại')}<div style="flex:1"></div>`)}${day('<div class="ghi">Làm thêm 8 phút nữa là nộp được nhé</div>', nut('Xong, kể lại', 'vien', 'but'), nut('Để sau', 'vien'))}`);

const chup = doc(`${sb('07:44')}<div style="position:absolute;top:47px;left:0;right:0;bottom:170px;background:#7aa6af"></div>
  <div style="position:absolute;left:56px;right:56px;top:300px;aspect-ratio:1;border:3px solid rgba(255,255,255,.9);border-radius:28px"></div>
  <div style="position:absolute;left:12px;right:12px;top:60px;background:#fff;border-radius:22px;padding:12px 14px;display:flex;gap:12px;align-items:center;box-shadow:var(--clay);color:var(--chu)"><img src="/assets/rob/chi.webp" alt="" style="width:56px;height:56px;object-fit:contain"><div style="min-width:0"><div style="font:800 15.5px Inter" class="mot">Đọc 20 trang «Dế Mèn…»</div><div class="ghi" style="text-align:left">Rob giữ ảnh này cho Ba Mẹ xem</div></div></div>
  <div style="position:absolute;left:16px;bottom:186px;background:rgba(0,0,0,.62);color:#fff;padding:4px 10px;border-radius:10px;font:700 13px Inter">07:44 · 4F2A91C0</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:170px;display:flex;align-items:center;justify-content:center;gap:56px;color:#fff;font:700 16px Inter"><span style="min-width:48px">Huỷ</span><span style="width:64px;height:64px;border-radius:50%;background:#fff"></span><span style="width:48px"></span></div>`, 'dt', CSS + '.dt{background:#111;color:#fff}');

const choDuyet = canh('cho', 'Đã gửi cho Ba Mẹ rồi!', 'Ba Mẹ duyệt xong là Bảo Anh có +30 điểm. Trong lúc chờ, làm việc khác cũng được.', [nut('Làm nhiệm vụ khác', 'vien')], { tab: 1 });
const duocDuyet = canh('xong', '+30 điểm!', 'Ba Mẹ nhắn: “Giỏi lắm!”', [nut('Cảm ơn Ba Mẹ ♥', 'vang')], { tab: 0 });
const chupLai = canh('trong-loi', 'Ảnh hơi mờ', 'Ba Mẹ muốn thấy rõ hơn “Tưới cây ngoài ban công”. Chụp lại là được — Bảo Anh không mất điểm nào!', [nut('Chụp lại', 'ngoc', 'camera')], { tab: 1 });

const viQua = man(`${cuon(`${diem(45)}<section class="the" style="padding:0;overflow:hidden;background:linear-gradient(135deg,#6b3f1d,#3b2210);color:#fff;border-radius:26px"><div style="padding:18px;text-align:center"><div style="font:700 13px Inter;text-align:left">AiiCafe · Phiếu quà</div><div style="font:800 26px/32px Inter;text-align:left">Phiếu quà 20.000đ</div>
  <div style="width:150px;height:150px;margin:10px auto;background:#fff;border-radius:14px;display:grid;grid-template-columns:repeat(9,1fr);gap:2px;padding:10px">${Array.from({ length: 81 }, (_, i) => `<i style="background:${(i * 7 + (i % 5) * 3) % 3 ? '#111' : '#fff'}"></i>`).join('')}</div>
  <div style="font:800 16px Inter;letter-spacing:2px" class="so">AG7K-29QX</div><div style="font:600 14px Inter;margin-top:4px">Dùng trước 24/11</div></div></section>
  <div class="ghi">Đưa mã này cho nhân viên AiiCafe quét. Mỗi phiếu chỉ dùng một lần.</div>
  <section class="the" style="padding:4px 16px"><div class="dong"><div class="bt lam">${I('qua')}</div><div style="flex:1;min-width:0"><div style="font:700 16px Inter" class="mot">Thêm 30 phút Minecraft</div><div class="ghi" style="text-align:left">Chờ Ba Mẹ trao · đổi 25/10</div></div><span class="nhan c">Chờ trao</span></div></section>`, 'g').replace('class="cuon g"', 'class="cuon g" style="bottom:92px"')}${tabC(2)}`);

const quaO = (ic, bg, t, d, mo) => `<div class="the" style="width:calc(50% - 5px);padding:14px 10px;text-align:center;${mo ? 'opacity:.55' : ''}"><div style="width:70px;height:70px;border-radius:50%;background:${bg};margin:0 auto;display:flex;align-items:center;justify-content:center">${I(ic).replace('class="ic"', 'class="ic" style="width:44px;height:44px"')}</div><div style="font:700 15px/19px Inter;margin-top:8px;height:38px">${t}</div><span class="nhan ${mo ? '' : 'd'}" style="margin-top:6px">${d}</span></div>`;
const cuaHang = man(`${cuon(`${diem(120)}${rob('qua', 's')}${bong('Bảo Anh đổi gì nào?', 'Đủ điểm thì nút sáng lên!')}
  <div class="hang" style="flex-wrap:wrap;gap:10px;align-items:stretch">${quaO('game', '#e3efeb', '15 phút chơi', '15 điểm')}${quaO('coc', '#ffeab0', 'Phiếu AiiCafe 20k', '100 điểm')}${quaO('qua', '#fde3dc', 'Thêm 30 phút Minecraft', '120 điểm')}${quaO('sao', '#eeeafe', 'Chọn phim tối T7', '200 điểm', 1)}</div>
  <button class="nut vien rong">${I('the_qua')}Ví quà của Bảo Anh</button>`, 'g').replace('class="cuon g"', 'class="cuon g" style="bottom:92px"')}${tabC(2)}`);

const doiQua = man(`${cuon(`${lui('Quay lại')}${diem(120)}${rob('qua', 's')}${bong('Thêm 30 phút Minecraft', 'Ba Mẹ trao quà cho Bảo Anh sau khi đổi.')}
  <section class="the" style="padding:16px 18px;display:flex;flex-direction:column;gap:8px;font:500 15px Inter"><div class="tieu"><span>Điểm của Bảo Anh</span><b>120</b></div><div class="tieu"><span>Đổi quà</span><b>−120</b></div><div style="height:1px;background:#e3e2dd"></div><div class="tieu"><b>Còn lại</b><b>0 điểm</b></div></section><div class="ghi">Rob báo Ba Mẹ ngay khi Bảo Anh đổi.</div>`)}${day(nut('Đổi 120 điểm', 'vang', 'qua'))}`);

const huyHieu = man(`${cuon(`${lui('Nhà')}${rob('sao', 's')}${bong('Cấp 3 · Tay đảm đang', 'Còn 60 điểm nữa lên cấp 4 “Ham học”!')}<div class="tien"><i style="width:70%"></i></div><div class="ghi">Chuỗi 6 ngày liền có nhiệm vụ được duyệt</div>
  <div class="hang" style="flex-wrap:wrap;gap:10px;align-items:stretch">${[['xong', '#ffeab0', 'Khởi đầu', 1], ['hoc', '#e3efeb', 'Một cuốn sách', 1], ['chi', '#fde3dc', 'Tay đảm đang', 1], ['canh-tien-do', '#e3efeb', 'Chuỗi 7 ngày', 0]].map(([r, bg, t, d]) => `<div class="the" style="width:calc(50% - 5px);padding:12px;text-align:center;${d ? '' : 'opacity:.5'}"><div style="width:72px;height:72px;border-radius:50%;background:${bg};margin:0 auto;overflow:hidden"><img src="/assets/rob/${r}.webp" alt="" style="width:100%;height:100%;object-fit:contain"></div><div style="font:700 15px Inter;margin-top:6px">${t}</div><div class="ghi">${d ? 'Đã đạt' : 'Chưa đạt'}</div></div>`).join('')}</div>`, 'g')}`);

// ================= 3. Giờ & phiên chơi =================
const gioMay = man(`${cuon(`<div style="flex:1"></div>${rob('chi', 's')}<div style="text-align:center"><span class="nhan c">Quy tắc: giờ máy phải đúng giờ thật</span></div><div class="h1" style="font-size:26px">Đồng hồ máy đang lệch</div><p class="mo">Đồng hồ máy lệch 12 phút. AiiGrow tạm khoá trò chơi — Word, AiiRob, trình duyệt học tập vẫn dùng bình thường.</p><div style="flex:1"></div>`, 'f')}${day(nut('Chỉnh lại giờ tự động', 'ngoc'), nut('Nhắn Ba Mẹ', 'vien'))}`);

const phien = doc(`${sb('19:42')}<div style="position:absolute;top:47px;left:0;right:0;bottom:0;background:linear-gradient(180deg,#7a8fd0,#4b5bd6)"><div style="position:absolute;left:0;right:0;top:0;text-align:center;color:#fff;font:700 20px Inter;margin-top:300px">Minecraft đang chạy</div></div>
  <div style="position:absolute;right:12px;top:52px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:99px;padding:8px 14px;box-shadow:var(--clayNho);font:800 16px Inter" class="so">18:20 <i style="width:20px;height:20px;border-radius:50%;background:var(--diem);display:inline-block"></i> 45</div>
  <div style="position:absolute;left:12px;right:12px;top:110px;background:#fff;border-radius:22px;padding:12px 14px;display:flex;gap:12px;align-items:center;box-shadow:var(--clay);color:var(--chu)"><img src="/assets/rob/cho.webp" alt="" style="width:56px;height:56px;object-fit:contain"><div style="flex:1;min-width:0"><div style="font:800 15.5px Inter" class="mot">Còn 5 phút nữa nhé!</div><div class="ghi" style="text-align:left">Dừng bây giờ thì giữ được 5 điểm.</div></div><button class="nut vien nho">Dừng</button></div>`, 'dt', CSS + '.dt{color:#fff}');

const choi = `<!doctype html>` && man(`<div style="position:absolute;inset:47px 0 0;background:rgba(16,35,31,.38);display:flex;align-items:center;padding:24px"><div style="background:#fff;border-radius:28px;padding:20px;width:100%;display:flex;flex-direction:column;gap:12px;box-shadow:var(--clay)">
  <div class="hang"><div class="bt xanh lon">${I('game')}</div><div style="font:800 21px Inter;flex:1" class="mot">Chơi Minecraft?</div></div>
  <p style="font:500 16px/23px Inter;color:var(--chu2)">Bảo Anh có <b>45 điểm</b>. Chơi tối đa <b>45 phút</b>, <b>1 điểm/phút</b>.</p><div class="ghi" style="text-align:left">Chỉ trừ khi Bảo Anh đang chơi thật. Dừng sớm thì giữ lại điểm.</div>
  ${nut('Bắt đầu chơi', 'ngoc')}${nut('Để sau', 'vien')}</div></div>`);

const nhac = doc(`<div style="position:absolute;inset:0;background:radial-gradient(90% 40% at 50% 0,#aab4d8,#0e0f1e 70%)"></div><div style="position:absolute;left:16px;right:16px;top:44px;background:#e8e6f1;border-radius:30px;padding:14px 16px;display:flex;gap:12px;align-items:center;color:#1c1b22;box-shadow:var(--clayNho)"><div style="width:40px;height:40px;border-radius:50%;background:var(--chinh);display:flex;align-items:center;justify-content:center;color:#fff">${'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c4-1 7-4 7-8-3 0-5 1-7 3-2-2-4-3-7-3 0 4 3 7 7 8ZM12 2c-2 3-2 6 0 9 2-3 2-6 0-9Z"/></svg>'}</div><div style="flex:1;min-width:0"><div style="font:700 15px Inter">Còn 5 phút · <span style="font-weight:500">now</span></div><div class="mot" style="font:500 15px Inter;color:#46454f">Lưu bài đang làm nhé. Cần thêm giờ thì mở app xin Ba Mẹ.</div></div></div>
  <div style="position:absolute;left:0;right:0;bottom:200px;display:flex;justify-content:space-around;padding:0 20px">${['Gmail', 'Photos', 'YouTube'].map((a) => `<div style="text-align:center;color:#fff;font:500 13px Inter"><div style="width:62px;height:62px;border-radius:50%;background:#fff;margin:0 auto 6px"></div>${a}</div>`).join('')}</div>`, 'dt', CSS + '.dt{background:#0e0f1e}');

const hetPhien = canh('nghi', 'Nghỉ 10 phút nhé!', 'Trò chơi mở lại lúc 20:10. Làm một nhiệm vụ để Bảo Anh có thêm điểm nào?', [nut('Làm nhiệm vụ', 'ngoc', 'sao'), nut('Xin thêm giờ', 'vien')], { tab: 0 });
const gioNgu = canh('ngu', 'Đến giờ ngủ rồi', 'Mai chơi tiếp nhé. Bảo Anh còn 45 điểm, Rob giữ nguyên cho Bảo Anh.', [nut('Xem mai làm gì', 'vien')], { tab: 0 });
const androidKhoa = man(`<div style="position:absolute;left:16px;right:16px;top:100px;display:flex;flex-direction:column;gap:18px"><section class="the" style="text-align:center;padding:22px 18px"><div class="bien n">${I('khoa')}</div><div style="font:800 28px Inter;margin-top:12px">Máy đang khoá</div><div style="font:700 21px Inter;margin-top:4px">Chờ Ba Mẹ mở</div><p class="mo" style="margin-top:6px">Ba Mẹ vừa khoá máy. Con nghỉ một chút nhé.</p></section>${nut('Xin Ba Mẹ thêm giờ', 'ngoc')}
  <section class="the"><div style="font:800 18px Inter">Máy đang mất mạng?</div><div class="ghi" style="text-align:left;margin:4px 0 10px">Nhờ Ba Mẹ mở app AiiGrow › Máy › «Mã mở khi mất mạng» rồi đọc mã cho con gõ vào đây.</div><div class="ma6" style="font-size:26px;height:56px;letter-spacing:10px">000000</div><button class="nut vien rong" style="margin-top:10px;color:var(--chinhInk)">Mở bằng mã</button></section><div class="ghi">Máy này do Ba Mẹ quản lý bằng AiiGrow.</div></div>`, { gio: '21:05' }).replace('class="dt"', 'class="dt mat"');

// ================= 4. Xin phép =================
const xinPhep = man(`${cuon(`${diem()}${rob('chi', 's')}${bong('Xin thêm giờ', 'Rob gửi Ba Mẹ ngay, Ba Mẹ trả lời là Bảo Anh biết liền.')}
  <div class="tr"><span class="chipx d">Thêm giờ</span><span class="chipx">Mở web</span><span class="chipx">Cài app</span></div>
  ${ol('game', 'vang', 'Đổi điểm lấy giờ chơi', 'Bảo Anh có 45 điểm · chơi ngay, không cần chờ')}
  <div style="font:700 14px Inter">Hoặc xin Ba Mẹ thêm bao lâu?</div><div class="tr"><span class="chipx">15 phút</span><span class="chipx d">30 phút</span><span class="chipx">60 phút</span></div>
  <div class="nhap">Vì sao Bảo Anh cần?</div><div class="hang" style="gap:8px;overflow:hidden"><span class="chipx">Con làm xong bài rồi ạ</span><span class="chipx">Tự viết…</span></div>`, 'g')}${day(nut('Gửi cho Ba Mẹ', '', 'gui'), '<div class="ghi">Bảo Anh đang có 1/3 yêu cầu chờ Ba Mẹ trả lời. <b>Xem</b></div>')}`.replace('class="cuon g"', 'class="cuon f"'));

const dong = (ic, m, t, p, nh, c) => `<div class="dong"><div class="bt ${m}">${I(ic)}</div><div class="chu" style="flex:1;min-width:0"><div style="font:700 16px/21px Inter" class="mot">${t}</div><div class="p ghi" style="text-align:left">${p}</div></div><span class="nhan ${c}">${nh}</span></div>`;
const yeuCau = man(`${cuon(`${rob('cho', 's')}${bong('Đã gửi cho Ba Mẹ', 'Ba Mẹ trả lời là Bảo Anh biết liền.')}
  <section class="the" style="padding:4px 16px">${dong('dong_ho_cat', 'vang', 'Thêm 30 phút', 'Gửi 07:52 · đang chờ', 'Chờ', 'c')}<div style="border-top:1px solid #e3e2dd"></div>${dong('web', 'lam', 'khanacademy.org', 'Ba Mẹ đồng ý 06:10', 'Được', 'o')}<div style="border-top:1px solid #e3e2dd"></div>${dong('tai', 'xanh', 'Minecraft', 'Ba Mẹ: “Để cuối tuần nhé”', 'Chưa được', '')}</section>`, 'g').replace('class="cuon g"', 'class="cuon f"')}${day(nut('Xin phép mới', 'vien', 'tin'))}`);

const xinThemIos = iosMan(`<div class="sheet"><div class="hang"><div class="xbtn">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'}</div><div style="flex:1;text-align:center;font:700 17px Inter;margin-right:44px">Xin thêm giờ</div></div>
  <div style="font:800 20px Inter">Con muốn thêm bao lâu?</div><div class="tr"><span class="chipx d">30 phút</span><span class="chipx">60 phút</span><span class="chipx">2 giờ</span></div>
  <div style="font:800 18px Inter">Lời nhắn cho Ba Mẹ</div><div class="nhap">Vì sao con cần thêm giờ?</div><div class="hang" style="overflow:hidden;gap:8px"><span class="chipx">Con làm xong bài tập rồi ạ</span><span class="chipx">Con đang chơi dở</span></div>
  ${nut('Gửi cho Ba Mẹ')}<div class="ghi" style="text-align:left">Ba Mẹ đồng ý thì máy mở thêm giờ ở lần cập nhật kế tiếp (khi con mở app).</div><div class="ghi">Ba Mẹ quản lý máy này bằng AiiGrow</div></div>`);

const choiDiem = iosMan(`<div class="cuon g" style="padding-top:8px"><div class="h1" style="text-align:left;margin:6px 4px">Chào Bảo Anh!</div>
  <section class="the" style="padding:18px 16px;text-align:center">${vong(.39, '35', 'phút giải trí còn lại')}<div class="hang" style="justify-content:center;margin-top:10px"><div class="bt vang">${I('qua')}</div><b style="font:700 16px Inter;color:var(--chinhInk)">Đang chơi bằng điểm, tới 20:11</b></div><div class="ghi" style="margin-top:6px">Hôm nay đã dùng 55 / 90 phút</div></section>
  <button class="nut">${P.sao}Nhiệm vụ &amp; quà</button><button class="nut vien" style="color:var(--chinhInk)">Xin thêm giờ</button>
  <section class="the"><div class="hang"><div class="bt tim">${I('nguoi')}</div><b style="font:700 17px Inter">Dành cho Ba Mẹ</b></div><div class="ghi" style="text-align:left;margin:6px 0">App học: 0 · App giải trí: 0 (+0 nhóm) · Chặn: 0</div><button class="nut vien rong" style="color:var(--chinhInk)">Chọn app học / giải trí</button></section></div>`);

// ================= 5. Bị chặn & mất mạng =================
const chanWeb = canh('trong-loi', 'Trang này Rob chưa biết', 'tiktok.com chưa có trong danh sách. Xin Ba Mẹ mở cho nhé?', [nut('Xin phép Ba Mẹ', 'ngoc', 'tin'), nut('Quay lại', 'vien')], { diem: false });
const webview = man(`<div style="position:absolute;top:47px;left:0;right:0;height:380px;background:linear-gradient(180deg,#fdf0c9,#f6f4ee)">${rob('canh-trong', 's').replace('class="rb s"', 'class="rb s" style="margin-top:6px"')}</div>
  <div style="position:absolute;left:44px;right:44px;top:226px">${bong('Chưa tải được', 'Nhập mã PIN để vào nhé')}</div><div style="position:absolute;left:16px;right:16px;top:330px">${nut('Thử lại', 'vien')}</div>${tabC(1)}`, { gio: '07:40' });
const maOff = (khoaSau, ghi) => man(`<div style="position:absolute;left:16px;right:16px;top:90px;display:flex;flex-direction:column;gap:18px"><section class="the" style="text-align:center;padding:22px 18px"><div class="bien n">${I('khoa')}</div><div style="font:800 28px Inter;margin-top:12px">Máy đang khoá</div>${khoaSau ? '<div style="font:800 44px Inter;margin-top:4px;letter-spacing:-1px">Khoá sau 0:39</div>' : '<div style="font:700 21px Inter;margin-top:4px">Chờ Ba Mẹ mở</div>'}<p class="mo" style="margin-top:6px">Ba Mẹ vừa khoá máy. Con nghỉ một chút nhé.</p></section>${nut('Xin Ba Mẹ thêm giờ', 'ngoc')}
  <section class="the"><div style="font:800 18px Inter">Máy đang mất mạng?</div><div class="ghi" style="text-align:left;margin:4px 0 10px">Nhờ Ba Mẹ mở app AiiGrow › Máy › «Mã mở khi mất mạng» rồi đọc mã cho con gõ vào đây.</div><div class="ma6" style="font-size:26px;height:56px;letter-spacing:${ghi ? 4 : 10}px">${ghi ? 'Mã 6 số' : '000000'}</div><button class="nut vien rong" style="margin-top:10px;color:var(--chinhInk)">Mở bằng mã</button>${ghi ? '<div class="ghi" style="text-align:left;margin-top:10px;color:var(--chinhInk);font-weight:600">Đã mở 60 phút (tới 20:31). Chơi vui nhé!</div>' : ''}</section><div class="ghi">Máy này do Ba Mẹ quản lý bằng AiiGrow.</div></div>`, { gio: '19:31' }).replace('class="dt"', 'class="dt mat"');
const maOfflineIos = iosMan(`<div class="sheet"><div class="hang"><div class="xbtn">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'}</div><div style="flex:1;text-align:center;font:700 17px Inter;margin-right:44px">Mở bằng mã</div></div>
  <div class="bien n">${I('dt')}</div><div class="h1" style="font-size:25px">Mã của Ba Mẹ</div><p class="mo" style="font-size:15.5px">Khi máy mất mạng, Ba Mẹ mở app AiiGrow › Máy › «Mã mở khi mất mạng» và đọc 6 số. Mã đúng mở máy 60 phút; có mạng lại thì máy theo luật của Ba Mẹ như thường.</p>
  <div class="ma6">000000</div><button class="nut rong" style="opacity:.55">Mở máy</button></div><div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${n}</span>`).join('')}<span class="z"></span><span>0</span><span class="z">⌫</span></div>`);
const dns = iosMan(`<div class="sheet"><div class="xbtn">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'}</div><div class="bien n">${I('khoa')}</div>
  <div class="h1" style="text-align:left;font-size:24px">Lọc web gia đình (DNS)</div><p style="font:500 15px/22px Inter;color:var(--chu2)">Hồ sơ DNS của gia đình lọc tên miền ngay trên máy, theo luật web Ba Mẹ đặt trong app AiiGrow. Ba Mẹ làm một lần, mất khoảng 1 phút.</p>
  <section class="the" style="padding:10px 16px">${['Bấm «Tải hồ sơ» — Safari mở và hỏi «Cho phép tải hồ sơ cấu hình?» ⇒ chọn Cho phép.', 'Mở Cài đặt › «Đã tải về hồ sơ» ⇒ Cài đặt ⇒ nhập mật mã máy.', 'Xong: trang web Ba Mẹ chặn bị lọc ở mọi trình duyệt và app trên máy này, cả khi dùng 4G.'].map((x, i) => `<div class="buoc" style="font-size:14.5px;line-height:20px"><i>${i + 1}</i><span>${x}</span></div>`).join('')}</section>
  ${nut('Tải hồ sơ')}<div class="ghi" style="text-align:left">Gỡ: Cài đặt › Cài đặt chung › VPN &amp; Quản lý thiết bị › «AiiGrow — DNS gia đình» › Xoá hồ sơ (cần mật mã máy).</div></div>`);

// ================= 6. Quy tắc & PIN =================
const dq = (ic, m, t, p) => `<div class="dong"><div class="bt ${m}">${I(ic)}</div><div style="flex:1;min-width:0"><div style="font:700 16px Inter">${t}</div><div class="ghi" style="text-align:left">${p}</div></div></div>`;
const quyTac = man(`${cuon(`${lui('Nhà')}${rob('so-tay', 's')}${bong('Quy tắc nhà mình', 'Ai cũng thấy giống nhau — công bằng!')}
  <section class="the" style="padding:4px 16px">${dq('dongho', 'xanh', 'Giờ chơi', '16:00–20:00 · cuối tuần 08:00–21:00')}${dq('dong_ho_cat', 'vang', 'Mỗi lần chơi', 'Tối đa 45 phút, nghỉ 10 phút')}${dq('lich', 'xanh', 'Mỗi ngày', 'Chơi tối đa 90 phút')}${dq('game', 'vang', 'Trò chơi', '1 điểm/phút')}${dq('tia', 'cam', 'Video ngắn', '2 điểm/phút')}${dq('trang_ngu', 'tim', 'Giờ ngủ', '21:30–06:30 · máy nghỉ, chỉ còn app học')}</section>`, 'g')}`);

const pinGhep = man(`${cuon(`<div style="flex:1"></div>${rob('rob-goc')}${bong('Ghép máy với AiiGrow', 'Nhờ Ba Mẹ tạo mã ghép trong app, rồi nhập 6 số vào đây nhé.')}<div class="ma6">000000</div><div class="ghi">Máy đã cài AiiGrow Con? Mở app đó rồi chạm «Nhiệm vụ &amp; quà» — không cần mã.</div><div style="flex:1"></div>`)}${day(nut('Ghép máy', 'ngoc', 'tick'))}`);
const pinAi = man(`${cuon(`${rob('rob-goc', 's')}${bong('Ai đang dùng máy?', 'Chạm vào tên mình rồi nhập PIN nhé.')}
  <section class="the ds" style="padding:6px 16px"><div class="dong" style="background:var(--chinhSoft);border-radius:20px;padding:6px 10px;margin:4px 0"><span class="avt" style="background-color:#c2410c">B</span><b style="font:700 17px Inter;flex:1">Bảo Anh</b>${I('tick')}</div><div class="dong"><span class="avt" style="background-color:#4b5bd6">B</span><b style="font:700 17px Inter">Bill</b></div></section>
  <div class="hang" style="justify-content:center;gap:14px">${[0, 1, 2, 3].map((i) => `<i style="width:18px;height:18px;border-radius:50%;background:${i < 2 ? 'var(--chinhInk)' : 'var(--lom)'};box-shadow:var(--lomIn)"></i>`).join('')}</div><div class="ghi">PIN 4 số của Bảo Anh</div>`, 'g')}<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${n}</span>`).join('')}<span class="z"></span><span>0</span><span class="z">⌫</span></div>`);

const A = 'chinchu-ios/sau-con-';
export default [
  { id: 'con-dt-cai', vai: 'Con', nen: 'Điện thoại', ten: 'Cài app Con trên điện thoại', mo: 'Con mở app lần đầu: nghe Rob chào, xin cài phần mềm khi cần, ghép máy iPhone bằng mã 6 số rồi cấp quyền để vào màn chính.',
    buoc: [
      { key: 'cdt-chao', ten: 'Rob chào', w: 390, h: 844, html: chao, anh: A + 'chao.png', toi: 'Bấm «Nhận 20 điểm»' },
      { key: 'cdt-cai', ten: 'Xin cài phần mềm', w: 390, h: 844, html: cai, anh: A + 'cai.png', toi: 'Máy iPhone: mở app Con chưa ghép' },
      { key: 'cdt-chua-ghep', ten: 'iPhone chưa ghép', w: 390, h: 844, html: chuaGhep, anh: A + 'ios-iphone-chuaGhep.png', toi: 'Bấm «Nhập mã ghép»' },
      { key: 'cdt-nhap-ma', ten: 'Nhập mã ghép', w: 390, h: 844, html: nhapMa, anh: A + 'ios-iphone-nhapMa.png', toi: 'Gõ 6 số rồi «Ghép máy»' },
      { key: 'cdt-quyen', ten: 'Cấp quyền Thời gian sử dụng', w: 390, h: 844, html: quyen, anh: A + 'ios-iphone-quyen.png', toi: 'Bấm «Cấp quyền»' },
      { key: 'cdt-chinh-ios', ten: 'Màn chính iPhone', w: 390, h: 844, html: chinhIos, anh: A + 'ios-iphone-chinh.png' }] },
  { id: 'con-dt-ngay', vai: 'Con', nen: 'Điện thoại', ten: 'Ngày thường (điện thoại)', mo: 'Con làm nhiệm vụ, chụp ảnh nộp, nhận điểm khi Ba Mẹ duyệt rồi đổi quà ở cửa hàng và xem huy hiệu.',
    buoc: [
      { key: 'cdt-nha', ten: 'Nhà — nhận điểm', w: 390, h: 844, html: nha, anh: A + 'nha.png', toi: 'Cảm ơn Ba Mẹ, về màn Nhà' },
      { key: 'cdt-nha-chinh', ten: 'Nhà', w: 390, h: 844, html: nhaHome, anh: '../aiigrow-thiet-ke/man-dienthoai-2510/expo-con-trang.jpg'.replace('../aiigrow-thiet-ke/', ''), toi: 'Bấm «Làm gì để có điểm?»' },
      { key: 'cdt-nhiem-vu', ten: 'Nhiệm vụ', w: 390, h: 844, html: nhiemVu, anh: A + 'nhiem-vu.png', toi: 'Chọn một nhiệm vụ' },
      { key: 'cdt-nv-chi-tiet', ten: 'Chi tiết nhiệm vụ', w: 390, h: 844, html: nvCT, anh: A + 'nv-chi-tiet.png', toi: 'Bấm «Bắt đầu»' },
      { key: 'cdt-dang-lam', ten: 'Đang làm', w: 390, h: 844, html: dang, anh: A + 'nv-dang.png', toi: 'Bấm «Xong»' },
      { key: 'cdt-chup', ten: 'Chụp ảnh', w: 390, h: 844, html: chup, anh: A + 'chup.png', toi: 'Chụp và gửi' },
      { key: 'cdt-cho-duyet', ten: 'Chờ Ba Mẹ duyệt', w: 390, h: 844, html: choDuyet, anh: A + 'cho-duyet.png', toi: 'Ba Mẹ duyệt' },
      { key: 'cdt-duoc-duyet', ten: 'Được duyệt', w: 390, h: 844, html: duocDuyet, anh: A + 'duoc-duyet.png', toi: 'Hoặc Ba Mẹ xin chụp lại' },
      { key: 'cdt-chup-lai', ten: 'Chụp lại', w: 390, h: 844, html: chupLai, anh: A + 'chup-lai.png', toi: 'Mở Ví quà' },
      { key: 'cdt-vi-qua', ten: 'Ví quà', w: 390, h: 844, html: viQua, anh: A + 'vi-qua.png', toi: 'Vào Cửa hàng' },
      { key: 'cdt-cua-hang', ten: 'Cửa hàng', w: 390, h: 844, html: cuaHang, anh: A + 'cua-hang.png', toi: 'Chọn một món quà' },
      { key: 'cdt-doi-qua', ten: 'Đổi quà', w: 390, h: 844, html: doiQua, anh: A + 'doi-qua.png', toi: 'Mở Huy hiệu' },
      { key: 'cdt-huy-hieu', ten: 'Huy hiệu', w: 390, h: 844, html: huyHieu, anh: A + 'huy-hieu.png' }] },
  { id: 'con-dt-gio', vai: 'Con', nen: 'Điện thoại', ten: 'Giờ & phiên chơi', mo: 'Con bắt đầu phiên chơi bằng điểm, được nhắc còn 5 phút, nghỉ giữa phiên, rồi máy nghỉ đến giờ ngủ hoặc khi Ba Mẹ khoá.',
    buoc: [
      { key: 'cdt-gio-may', ten: 'Giờ máy lệch', w: 390, h: 844, html: gioMay, anh: A + 'gio-may.png', toi: 'Chỉnh giờ rồi chọn trò chơi' },
      { key: 'cdt-choi', ten: 'Chơi trò chơi?', w: 390, h: 844, html: choi, anh: A + 'choi.png', toi: 'Bấm «Bắt đầu chơi»' },
      { key: 'cdt-phien', ten: 'Đang chơi', w: 390, h: 844, html: phien, anh: A + 'phien.png', toi: 'Còn 5 phút (Android)' },
      khop({ key: 'cdt-nhac-5-phut', ten: 'Nhắc còn 5 phút', w: 390, h: 844, html: nhac, anh: 'man-android-2510/nhac-con-5-phut.jpg', toi: 'Hết phiên' }, 'android-nhac-5-phut'),
      { key: 'cdt-het-phien', ten: 'Hết phiên — nghỉ', w: 390, h: 844, html: hetPhien, anh: A + 'het-phien.png', toi: 'Tới giờ ngủ' },
      { key: 'cdt-gio-ngu', ten: 'Giờ ngủ', w: 390, h: 844, html: gioNgu, anh: A + 'gio-ngu.png', toi: 'Ba Mẹ khoá máy (Android)' },
      { key: 'cdt-android-khoa', ten: 'Máy đang khoá', w: 390, h: 844, html: androidKhoa, anh: A + 'android-khoa.png' }] },
  { id: 'con-dt-xin', vai: 'Con', nen: 'Điện thoại', ten: 'Xin phép', mo: 'Con xin thêm giờ, mở web hoặc cài app, theo dõi câu trả lời; trên iPhone xin thêm giờ hoặc chơi bằng điểm ngay.',
    buoc: [
      { key: 'cdt-xin-phep', ten: 'Xin phép', w: 390, h: 844, html: xinPhep, anh: A + 'xin-phep.png', toi: 'Bấm «Gửi cho Ba Mẹ»' },
      { key: 'cdt-yeu-cau', ten: 'Yêu cầu của con', w: 390, h: 844, html: yeuCau, anh: A + 'yeu-cau.png', toi: 'iPhone: xin thêm giờ' },
      { key: 'cdt-ios-xin-them', ten: 'iPhone: xin thêm giờ', w: 390, h: 844, html: xinThemIos, anh: A + 'ios-iphone-xinThem.png', toi: 'Hoặc đổi điểm lấy giờ chơi' },
      { key: 'cdt-ios-choi-diem', ten: 'iPhone: chơi bằng điểm', w: 390, h: 844, html: choiDiem, anh: 'man-dienthoai-2510/ios-con-choiDiem.jpg' }] },
  { id: 'con-dt-chan', vai: 'Con', nen: 'Điện thoại', ten: 'Bị chặn & mất mạng', mo: 'Con gặp trang web bị chặn, máy khoá khi mất mạng, nhập mã của Ba Mẹ để mở 60 phút, và lọc web DNS trên iPhone.',
    buoc: [
      { key: 'cdt-chan-web', ten: 'Trang web bị chặn', w: 390, h: 844, html: chanWeb, anh: A + 'chan-web.png', toi: 'Mở trong app (Android)' },
      khop({ key: 'cdt-webview', ten: 'Không tải được', w: 390, h: 844, html: webview, anh: 'man-android-2510/man-tre-webview.jpg', toi: 'Máy khoá, mất mạng' }, 'android-tre-webview'),
      khop({ key: 'cdt-ma-offline', ten: 'Khoá — nhập mã offline', w: 390, h: 844, html: maOff(true, false), anh: 'man-android-2510/man-khoa-ma-offline.jpg', toi: 'Gõ mã 6 số của Ba Mẹ' }, 'android-khoa-ma-offline'),
      khop({ key: 'cdt-ma-da-mo', ten: 'Đã mở bằng mã', w: 390, h: 844, html: maOff(false, true), anh: 'man-android-2510/man-khoa-ma-da-mo.jpg', toi: 'iPhone: mở bằng mã' }, 'android-khoa-ma-da-mo'),
      { key: 'cdt-ios-ma-offline', ten: 'iPhone: mở bằng mã', w: 390, h: 844, html: maOfflineIos, anh: 'man-dienthoai-2510/ios-con-maOffline.jpg', toi: 'Cài lọc web gia đình' },
      { key: 'cdt-ios-dns', ten: 'iPhone: lọc web DNS', w: 390, h: 844, html: dns, anh: 'man-dienthoai-2510/ios-con-dns.jpg' }] },
  { id: 'con-dt-android', vai: 'Con', nen: 'Android', ten: 'Màn chính Android', mo: 'App Con trên Android (agent-android): việc của con hôm nay và đổi điểm lấy giờ chơi.',
    buoc: [khop({ key: 'cdt-android-viec', ten: 'Việc của con', w: 360, h: 800, html: '', toi: 'Đổi điểm lấy giờ chơi' }, 'android-chinh-viec-cua-con'),
      khop({ key: 'cdt-android-doi-diem', ten: 'Đổi điểm', w: 360, h: 800, html: '' }, 'android-chinh-doi-diem')] },

  { id: 'con-dt-khac', vai: 'Con', nen: 'Điện thoại', ten: 'Quy tắc & PIN', mo: 'Con xem quy tắc nhà mình và ghép máy, chọn tên rồi nhập PIN khi dùng chung một điện thoại.',
    buoc: [
      { key: 'cdt-quy-tac', ten: 'Quy tắc nhà mình', w: 390, h: 844, html: quyTac, anh: A + 'quy-tac.png', toi: 'Mở màn ghép máy' },
      { key: 'cdt-pin-ghep', ten: 'Ghép máy', w: 390, h: 844, html: pinGhep, anh: A + 'pin.png', toi: 'Chọn tên rồi nhập PIN' },
      { key: 'cdt-pin-ai', ten: 'Ai đang dùng máy?', w: 390, h: 844, html: pinAi, anh: 'man-dienthoai-2510/expo-con-pin.jpg' }] },
];
