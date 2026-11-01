// Cửa sổ nhỏ + bộ cài macOS (agent-mac: Views.swift, AppConViews.swift, Clay.swift, goi/*.html) — dựng khớp ảnh
// man-mac-2510/*.png (@2x ⇒ dsf 2, w/h = cỡ ảnh / 2). Bố cục theo đúng VStack/HStack/padding của SwiftUI; font hệ thống (SF Pro).
// Asset thật: /assets/mac/fluent/<ten>.png, /assets/mac/mascot/<ten>.png.

const F = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const B = 'rgba(28,32,30,'; // ClayMau.bong

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow:hidden}
body{font-family:${F};color:#0f1312;-webkit-font-smoothing:antialiased;background:radial-gradient(circle 420px at 20% 0,#e3ebe7,#ecebe7)}
.wrap{padding:22px 22px 34px}
.the{position:relative;border-radius:28px;background:#f7f6f3;padding:18px;display:flex;flex-direction:column;gap:12px;
 box-shadow:0 16px 30px ${B}.38),0 4px 10px ${B}.20)}
.the::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
 background:radial-gradient(192px 19.2px at 50% 0,#fff,rgba(255,255,255,.95) 50%,rgba(255,255,255,0)),
 linear-gradient(180deg,rgba(254,254,254,1) 0,rgba(254,254,254,0) 26%,${B}.025) 60%,${B}.07) 100%)}
.the::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;padding:1.5px;
 background:linear-gradient(180deg,#fff 0,rgba(255,255,255,0) 12%,rgba(255,255,255,0) 90%,rgba(255,255,255,.7) 100%);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.the>*{position:relative;z-index:1}
.hs{display:flex;align-items:center;gap:12px}
.vc{position:relative;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;
 box-shadow:0 6px 16px ${B}.40),0 2px 5px ${B}.22)}
.vc::before{content:'';position:absolute;inset:0;border-radius:50%;
 background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.95),rgba(255,255,255,0) 42%),radial-gradient(circle at 50% 95%,rgba(255,255,255,.5),rgba(255,255,255,0) 30%)}
.vc::after{content:'';position:absolute;inset:0;border-radius:50%;padding:1.2px;background:linear-gradient(180deg,#fff,rgba(255,255,255,0) 50%);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.vc img{position:relative;z-index:1;filter:drop-shadow(0 1.5px 1.5px ${B}.22))}
.nut{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;border:0;border-radius:18px;
 padding:0 14px;font:700 15px/18px ${F};white-space:nowrap;font-family:${F}}
.nut img{width:22px;height:22px;filter:drop-shadow(0 1.5px 1.5px ${B}.22))}
.nut.chi{color:#fff;background:linear-gradient(180deg,#2e3533,#121615);box-shadow:0 7px 16px rgba(15,19,18,.6),0 2px 5px rgba(15,19,18,.35)}
.nut.ngoc{color:#fff;background:linear-gradient(180deg,#0f6b5c,#08463d);box-shadow:0 7px 16px rgba(10,82,70,.6),0 2px 5px rgba(10,82,70,.35)}
.nut.chi::before,.nut.ngoc::before{content:'';position:absolute;inset:0;border-radius:inherit;
 background:linear-gradient(180deg,rgba(255,255,255,.32) 0,rgba(255,255,255,.08) 24%,rgba(255,255,255,0) 26%),
 radial-gradient(ellipse 50% 50% at 50% 100%,rgba(120,140,135,.25),rgba(120,140,135,0))}
.nut.ngoc::before{background:linear-gradient(180deg,rgba(255,255,255,.32) 0,rgba(255,255,255,.08) 24%,rgba(255,255,255,0) 26%),
 radial-gradient(ellipse 50% 50% at 50% 100%,rgba(80,220,190,.28),rgba(80,220,190,0))}
.nut.chi::after,.nut.ngoc::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;
 background:linear-gradient(180deg,rgba(255,255,255,.45),rgba(255,255,255,0) 50%,rgba(0,0,0,.35));
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.nut.sang{color:#0f1312;background:linear-gradient(180deg,#fff 0,rgba(255,255,255,.85) 44%,rgba(232,232,232,0) 50%,${B}.05) 100%),#f7f6f3;
 box-shadow:0 6px 14px ${B}.40),0 2px 4px ${B}.24)}
.nut.sang::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;background:linear-gradient(180deg,#fff,rgba(255,255,255,0) 50%);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.nut>span{position:relative;z-index:1;display:flex;align-items:center;gap:8px}
.nut.tat{opacity:.74;box-shadow:none}.nut.tat span{color:#868886}
.lom{position:relative;border-radius:16px;background:#e9e8e3;display:flex;align-items:center;padding:0 14px;min-height:44px;font:400 14px ${F};color:rgba(15,19,18,.25)}
.lom::before{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 3px 3px -1px ${B}.10)}
.lom::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;background:linear-gradient(180deg,rgba(255,255,255,0) 80%,rgba(255,255,255,.95));
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.lom>*{position:relative}
.c3{color:#565c59}
.chan{display:flex;align-items:center;gap:6px;padding:0 6px;margin-top:16px;font:400 12px ${F};color:#565c59}
.chan img{width:16px;height:16px}
`;

const doc = (w, h, body, css = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${CSS}body{width:${w}px;height:${h}px}${css}</style></head><body>${body}</body></html>`;

const fl = (t) => `/assets/mac/fluent/${t}.png`;
const vien = (ic, nen, co) => `<div class="vc" style="width:${co}px;height:${co}px;background:${nen}"><img src="${fl(ic)}" alt="" style="width:${co * 0.56}px;height:${co * 0.56}px"></div>`;
const nut = (chu, kieu = 'chi', ic = '', st = '') => `<button class="nut ${kieu}" style="${st}"><span>${ic ? `<img src="${fl(ic)}" alt="">` : ''}${chu}</span></button>`;
const lom = (ph, st = '') => `<div class="lom" style="${st}"><span>${ph}</span></div>`;
const chu = (s, co, dam = 400, mau = '#0f1312', st = '') => `<div style="font:${dam} ${co}px/${(co * 1.19 + 1).toFixed(2)}px ${F};color:${mau};${st}">${s}</div>`;
const hdr = (ic, nen, co, tieu, cot = 17) => `<div class="hs">${vien(ic, nen, co)}${chu(tieu, cot, 700)}</div>`;
const chips = (ds, chon) => `<div class="hs" style="gap:14px;padding:2px 0">${ds.map((t, i) => nut(t, i === chon ? 'ngoc' : 'sang')).join('')}</div>`;
const chanDangBat = `<div class="chan"><img src="${fl('seedling')}" alt="">AiiGrow đang bật — Ba Mẹ quản lý máy này</div>`;

const DIEM_SOFT = '#fbecc0', NGOC_SOFT = '#dcebe6', CANH_SOFT = '#f9e7d2', LAM_SOFT = '#e1e9fb';

// ---------- bộ cài (goi/chao.html, goi/dieu-khoan.html trong Installer.app) ----------
const CSS_GOI = `body{background:#ecebe7;font:15px/1.55 ${F};color:#0f1312;padding:16px 16px 28px}
.g{position:relative;background-color:#f7f6f3;background-image:linear-gradient(#fefefe 0,#f7f6f3 26%,#f2f1ee 100%);border-radius:28px;padding:22px 24px;
 box-shadow:0 16px 30px -10px rgba(28,32,30,.30),0 4px 10px rgba(28,32,30,.14),inset 0 1.5px 0 #fff,inset 0 -2px 0 rgba(255,255,255,.7)}
.g h2{margin:0 0 10px;font-size:20px;line-height:1.3;font-weight:700;letter-spacing:-.01em}
.g p{margin:0 0 10px;color:#3a403d}.g p:last-child{margin-bottom:0}
.mam{display:inline-block;width:10px;height:10px;border-radius:50%;background:#0f6b5c;margin-right:8px;vertical-align:1px;box-shadow:inset 0 2px 0 rgba(255,255,255,.4)}`;
const goi = (tieu, ps) => doc(620, 420, `<div class="g"><h2><span class="mam"></span>${tieu}</h2>${ps.map((p) => `<p>${p}</p>`).join('')}</div>`, CSS_GOI);

const CHAO = goi('Chào mừng đến với AiiGrow', ['AiiGrow giúp Ba Mẹ quản lý thời gian dùng máy của Con. Bộ cài sẽ đặt ứng dụng AiiGrow và dịch vụ nền của AiiGrow trên máy này.',
  'Sau khi cài xong, Ba Mẹ mở biểu tượng AiiGrow trên thanh menu để ghép máy bằng mã 6 số.']);
const DIEU_KHOAN = goi('Điều khoản', ['AiiGrow giúp Ba Mẹ quản lý thời gian dùng máy của Con; Con luôn thấy biểu tượng AiiGrow.']);

// ---------- Ghép máy (GhepMayView, rộng 460) ----------
const ghep = (motCham) => doc(460, motCham ? 414 : 416, `<div class="wrap"><div class="the" style="padding:20px;gap:14px">
  <div class="hs">${vien('link', NGOC_SOFT, 48)}${chu('Ghép máy này với Con', 20, 700)}</div>
  ${chu(motCham ? 'Gói cài này đã mang mã của gia đình. Ba Mẹ chỉ cần chọn tài khoản macOS của Con.' : 'Chọn tài khoản macOS của Con và nhập mã 6 số lấy ở app AiiGrow Ba Mẹ.', 13, 400, '#565c59')}
  <div class="lom" style="border-radius:18px;min-height:48px;padding:0 16px;gap:8px"><span style="color:#565c59;font-size:13px;flex:1">Tài khoản của Con</span><span style="font:600 15px ${F};color:#0f1312">bi</span>
   <svg width="9" height="13" viewBox="0 0 9 13" style="margin-left:2px"><path d="M1.2 4.6 4.5 1.4l3.3 3.2M1.2 8.4l3.3 3.2 3.3-3.2" fill="none" stroke="#565c59" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
  ${motCham ? '' : `<div class="lom" style="border-radius:18px;min-height:48px;font:500 22px ui-monospace,'SF Mono',Menlo,monospace;color:rgba(15,19,18,.5)"><span>Mã 6 số</span></div>`}
  ${nut('Ghép máy', 'chi' + (motCham ? '' : ' tat'))}
  ${motCham ? nut('Dùng mã 6 số thay vì gói cài', 'sang') : ''}
  ${chu('Tài khoản Con sẽ về quyền người dùng thường (cần còn một tài khoản quản trị khác).', 11, 400, '#565c59')}
</div></div>`);

// ---------- Nhắc 5 phút (NhacView, rộng 320) ----------
const NHAC = doc(320, 126, `<div style="padding:14px 14px 32px"><div class="the" style="border-radius:26px;padding:16px;flex-direction:row;align-items:center;gap:14px">
  ${vien('alarm_clock', CANH_SOFT, 48)}<div style="display:flex;flex-direction:column;gap:2px">${chu('Còn 5 phút', 16, 700)}${chu('Con lưu bài đang làm nhé.', 13, 400, '#565c59')}</div></div></div>`);

// ---------- Tin mới (TinMoiView, rộng 360) ----------
const TIN_MOI = doc(360, 185, `<div style="padding:14px 14px 32px"><div class="the" style="border-radius:26px;padding:16px;flex-direction:row;align-items:flex-start;gap:14px">
  ${vien('speech_balloon', NGOC_SOFT, 48)}<div style="display:flex;flex-direction:column;gap:6px;flex:1">${chu('Nhiệm vụ mới: Tưới cây', 15, 700)}${chu('Ba Mẹ vừa giao cho con. Làm xong để tích điểm nhé!', 13, 400, '#565c59')}
  ${nut('Xem', 'chi', '', 'width:120px;min-height:44px;border-radius:16px')}</div></div></div>`);

// ---------- Nộp bài (NopBaiView, rộng 460) ----------
const NOP_BAI = doc(460, 450, `<div class="wrap"><div class="the">
  <div class="hs">${vien('memo', NGOC_SOFT, 48)}${chu('Dọn góc học tập', 19, 700)}</div>
  ${chu('Xếp sách vở gọn gàng, lau bàn', 14, 400, '#565c59')}
  ${chu('Ba Mẹ nhắn: Con chụp rõ mặt bàn nhé', 14, 600, '#8a3c0c')}
  ${chu('Ghi chú cho Ba Mẹ (không bắt buộc)', 13, 500, '#565c59')}
  <div class="lom" style="height:96px"></div>
  ${nut('Chọn ảnh…', 'sang', 'desktop_computer')}
  ${nut('Nộp cho Ba Mẹ', 'chi')}
</div></div>`);

// ---------- Xin thêm giờ (XinThemCuaSo, rộng 440) ----------
const xinThem = (doiDiem) => doc(440, doiDiem ? 429 : 371, `<div class="wrap"><div class="the">
  ${hdr('hourglass_not_done', DIEM_SOFT, 44, 'Con muốn thêm bao lâu?')}
  ${chips(['30 phút', '1 giờ', '2 giờ'], 0)}
  ${chu('Nhắn Ba Mẹ (không bắt buộc)', 12, 500, '#565c59')}
  ${lom('Ví dụ: con cần làm nốt bài tập')}
  ${nut('Xin Ba Mẹ', 'chi')}
  ${doiDiem ? nut('Hoặc đổi điểm lấy giờ chơi', 'sang', 'star') : ''}
</div>${chanDangBat}</div>`);

// ---------- Xin mở (XinMoView, rộng 440) ----------
const XIN_MO = doc(440, 395, `<div class="wrap"><div class="the">
  ${hdr('globe_with_meridians', LAM_SOFT, 44, 'Con muốn mở gì?')}
  ${chips(['Trang web', 'App'], 0)}
  ${lom('Địa chỉ trang, ví dụ youtube.com')}
  ${chu('Nhắn Ba Mẹ (không bắt buộc)', 12, 500, '#565c59')}
  ${lom('Con cần mở để làm gì?')}
  ${nut('Xin Ba Mẹ', 'chi tat')}
</div></div>`);

// ---------- App bị chặn (ChanAppView, rộng 400) ----------
const CHAN_APP = doc(400, 360, `<div class="wrap" style="padding:20px 20px 32px"><div class="the">
  <div class="hs">${vien('stop_sign', CANH_SOFT, 52)}${chu('Roblox chưa được mở', 18, 700)}</div>
  ${chu('Bây giờ chỉ mở được các app học Ba Mẹ cho phép.', 14, 400, '#565c59')}
  ${nut('Dùng điểm để chơi', 'chi', 'star')}
  ${nut('Xin phép Ba Mẹ', 'sang', 'speech_balloon')}
  ${nut('Đóng', 'sang')}
</div></div>`);

// ---------- Chơi bằng điểm (ChoiBangDiemView, rộng 420) ----------
const CHOI = doc(420, 438, `<div class="wrap"><div class="the">
  <div class="hs">${vien('video_game', DIEM_SOFT, 48)}${chu('Chơi bằng điểm', 20, 700)}</div>
  ${chu('Mỗi app đổi điểm lấy số phút khác nhau — con xem số phút ở từng nút.', 13, 400, '#565c59')}
  <div style="display:flex;flex-direction:column;gap:12px;padding:6px 2px 16px;overflow:hidden">
   ${nut('Chơi Roblox · ≈ 25 phút', 'chi')}${nut('Chơi youtube.com', 'chi')}${nut('Chơi Minecraft', 'chi')}</div>
  ${nut('Đóng', 'sang')}
</div></div>`);

const A = (f) => `man-mac-2510/${f}.png`;
export default [
  { key: 'mac-chao', w: 620, h: 420, dsf: 2, html: CHAO, anh: A('mac-chao') },
  { key: 'mac-dieu-khoan', w: 620, h: 420, dsf: 2, html: DIEU_KHOAN, anh: A('mac-dieu-khoan') },
  { key: 'mac-ghep-may', w: 460, h: 416, dsf: 2, html: ghep(false), anh: A('mac-ghep-may') },
  { key: 'mac-ghep-mot-cham', w: 460, h: 414, dsf: 2, html: ghep(true), anh: A('mac-ghep-mot-cham') },
  { key: 'mac-nhac-5-phut', w: 320, h: 126, dsf: 2, html: NHAC, anh: A('mac-nhac-5-phut') },
  { key: 'mac-tin-moi', w: 360, h: 185, dsf: 2, html: TIN_MOI, anh: A('mac-tin-moi') },
  { key: 'mac-nop-bai', w: 460, h: 450, dsf: 2, html: NOP_BAI, anh: A('mac-nop-bai') },
  { key: 'mac-xin-them', w: 440, h: 371, dsf: 2, html: xinThem(false), anh: A('mac-xin-them') },
  { key: 'mac-xin-them-doi-diem', w: 440, h: 429, dsf: 2, html: xinThem(true), anh: A('mac-xin-them-doi-diem') },
  { key: 'mac-xin-mo', w: 440, h: 395, dsf: 2, html: XIN_MO, anh: A('mac-xin-mo') },
  { key: 'mac-chan-app', w: 400, h: 360, dsf: 2, html: CHAN_APP, anh: A('mac-chan-app') },
  { key: 'mac-choi-bang-diem', w: 420, h: 438, dsf: 2, html: CHOI, anh: A('mac-choi-bang-diem') },
];
