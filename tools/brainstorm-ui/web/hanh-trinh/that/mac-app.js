// App «AiiGrow của Con» + màn khoá trên macOS — dựng khớp ảnh man-mac-2510/mac-app-*.png, mac-dem-nguoc, mac-man-khoa*.png (@2x).
// Bố cục/cỡ/màu theo agent-mac/Sources/AiiGrowTray (AppConViews.swift, Views.swift, Clay.swift); font hệ thống SF Pro.
// Asset thật: /assets/mac/fluent/<ten>.png, /assets/mac/mascot/<ten>.png.

const F = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const FR = "ui-rounded,'SF Pro Rounded',-apple-system,BlinkMacSystemFont,sans-serif";
const M = {
  nen: '#ecebe7', nenSang: '#e3ebe7', the: '#f7f6f3', lom: '#e9e8e3', chu: '#0f1312', chu2: '#3a403d', chu3: '#565c59',
  ngoc: '#0f6b5c', ngocDam: '#08463d', ngocInk: '#0a5246', ngocSoft: '#dcebe6', thanChi: '#2e3533', thanChiDam: '#121615',
  diemInk: '#6e4300', diemSoft: '#fbecc0', canh: '#8a3c0c', canhSoft: '#f9e7d2', loi: '#b42318',
};
const BONG = '28,32,30';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow:hidden;background:${M.nen}}
body{font-family:${F};color:${M.chu};-webkit-font-smoothing:antialiased;line-height:normal}
button{font-family:${F};border:0;background:none;color:inherit;cursor:pointer}
.ic{display:block;flex:none;filter:drop-shadow(0 1.5px 1.5px rgba(${BONG},.22))}
.the{position:relative;border-radius:26px;background-color:${M.the};
  background-image:radial-gradient(192px 19px at 50% 0,#fff,rgba(255,255,255,.95) 40%,rgba(255,255,255,0)),
  linear-gradient(180deg,rgba(254,254,254,1) 0,rgba(254,254,254,0) 26%,rgba(${BONG},.025) 60%,rgba(${BONG},.07) 100%);
  box-shadow:inset 0 1.5px 0 #fff,inset 0 -1.5px 0 rgba(255,255,255,.7),0 16px 26px rgba(${BONG},.30),0 4px 9px rgba(${BONG},.16)}
.lom{border-radius:16px;background:${M.lom};box-shadow:inset 0 2px 3px rgba(${BONG},.14),inset 0 -1.5px 0 rgba(255,255,255,.95)}
.nut{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:18px;font:700 15px/18px ${F};padding:0 14px;white-space:nowrap}
.nut.sang{color:${M.chu};background:${M.the} linear-gradient(180deg,#fff 0,rgba(255,255,255,.85) 44%,rgba(232,232,232,0) 50%,rgba(${BONG},.05) 100%);
  box-shadow:inset 0 1.5px 0 #fff,0 6px 12px rgba(${BONG},.30),0 2px 4px rgba(${BONG},.20)}
.nut.toi,.nut.ngoc{color:#fff}
.nut.toi{background:radial-gradient(200% 36% at 50% 100%,rgba(120,140,135,.25),rgba(120,140,135,0)),linear-gradient(180deg,${M.thanChi},${M.thanChiDam});
  box-shadow:0 7px 14px rgba(15,19,18,.5),0 2px 5px rgba(15,19,18,.32)}
.nut.ngoc{background:radial-gradient(200% 36% at 50% 100%,rgba(80,220,190,.28),rgba(80,220,190,0)),linear-gradient(180deg,${M.ngoc},${M.ngocDam});
  box-shadow:0 7px 14px rgba(10,82,70,.5),0 2px 5px rgba(10,82,70,.3)}
.nut.toi::before,.nut.ngoc::before{content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(180deg,rgba(255,255,255,.32) 0,rgba(255,255,255,.08) 24%,rgba(255,255,255,0) 26%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -1px 0 rgba(0,0,0,.35)}
.nut>*{position:relative}
.nut.tat{opacity:.5}
.vien{position:relative;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
  box-shadow:inset 0 1.2px 0 #fff,0 6px 12px rgba(${BONG},.32),0 2px 4px rgba(${BONG},.2)}
.vien::before{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.95),rgba(255,255,255,0) 42%),radial-gradient(circle at 50% 95%,rgba(255,255,255,.5),rgba(255,255,255,0) 30%)}
.vien img{position:relative}
`;

const doc = (body, w, h, css = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${CSS}html,body{width:${w}px;height:${h}px}${css}</style></head><body>${body}</body></html>`;

const fl = (ten, co) => `<img class="ic" src="/assets/mac/fluent/${ten}.png" alt="" style="width:${co}px;height:${co}px">`;
const vien = (ten, nen, co) => `<div class="vien" style="width:${co}px;height:${co}px;background:${nen}">${fl(ten, Math.round(co * 0.56))}</div>`;
const nut = (chu, kieu = 'sang', o = {}) => `<button class="nut ${kieu}${o.tat ? ' tat' : ''}" style="${o.w ? `width:${o.w}px;` : ''}${o.st || ''}">${o.icon ? fl(o.icon, 22) : ''}<span>${chu}</span></button>`;
const c = (s, co, dam = 400, mau = M.chu, st = '') => `<div style="font:${dam} ${co}px/${Math.round(co * 1.2)}px ${F};color:${mau};${st}">${s}</div>`;
const the = (inner, st = '', nen) => `<section class="the" style="padding:18px;display:flex;flex-direction:column;gap:8px;${nen ? `background-color:${nen};` : ''}${st}">${inner}</section>`;

// ---------- App của Con 1000×760 ----------
const MUC = [['Hôm nay', 'alarm_clock'], ['Nhiệm vụ', 'memo'], ['Phần quà & điểm', 'wrapped_gift'], ['Tin nhắn', 'speech_balloon']];
const so = (n, dang) => `<b style="margin-left:auto;font:700 12px/16px ${F};color:#fff;background:${M.ngoc};border-radius:99px;padding:2px 8px;${dang ? 'box-shadow:0 0 0 0 transparent' : ''}">${n}</b>`;
const ben = (dang, rob) => `<aside class="the" style="position:absolute;left:18px;top:18px;width:250px;height:724px;border-radius:30px;padding:16px;display:flex;flex-direction:column;gap:10px">
  <img src="/assets/mac/mascot/${rob}.png" alt="" style="width:218px;height:170px;object-fit:contain;display:block">
  <div style="font:700 20px/24px ${F}">Bi</div>
  <div style="align-self:flex-start;margin-bottom:6px;font:700 12px/14px ${F};color:${M.ngocInk};background:${M.ngocSoft};border-radius:99px;padding:6px 10px">● Đã kết nối với Ba Mẹ</div>
  ${MUC.map(([t, ic], i) => `<button class="nut ${i === dang ? 'ngoc' : 'sang'}" style="height:48px;border-radius:20px;justify-content:flex-start;gap:10px;padding:0 14px">${fl(ic, 24)}<span>${t}</span>${i === 1 ? so(3) : i === 3 ? so(2) : ''}</button>`).join('')}
  <div style="margin-top:auto;font:400 11px/13px ${F};color:${M.chu3}">Máy này do Ba Mẹ quản lý bằng AiiGrow</div></aside>`;
const app = (dang, rob, tieu, noi) => `<div style="position:absolute;inset:0;background:radial-gradient(420px 420px at 20% 0,${M.nenSang},${M.nen})"></div>${ben(dang, rob)}
  <div style="position:absolute;left:286px;top:18px;right:18px;bottom:18px;display:flex;flex-direction:column;gap:6px">
    <h1 style="font:700 26px/31px ${F};padding-top:6px">${tieu}</h1>
    <div style="flex:1;overflow:hidden"><div style="padding:6px 4px 28px;display:flex;flex-direction:column;gap:14px;max-width:768px">${noi}</div></div></div>`;

const nhan = (t) => `<span style="flex:none;font:700 14px/17px ${F};color:${M.diemInk};background:${M.diemSoft};border-radius:99px;padding:4px 10px">${t}</span>`;
const hang = (a, b) => `<div style="display:flex;align-items:baseline;gap:10px">${a}${b}</div>`;

const HOM_NAY = app(0, 'rob-goc', 'Hôm nay', `${c('Chào Bi!', 22, 700)}
  ${the(`${c('Thời gian dùng máy còn lại', 14, 400, M.chu3)}<div style="font:700 44px/52px ${FR};color:${M.ngocInk};font-variant-numeric:tabular-nums">46:59</div>${c('Còn 47 phút hôm nay', 14, 400, M.chu3)}${c('Chế độ: Chỉ app học', 14, 600, M.ngocInk)}`)}
  <div style="display:flex;gap:14px;padding:2px 0">${nut('Xin thêm thời gian', 'toi', { w: 250, icon: 'hourglass_not_done' })}${nut('Chơi bằng điểm', 'sang', { w: 250, icon: 'video_game' })}</div>
  ${c('Điểm hiện có đổi được khoảng 25 phút chơi Roblox.', 13, 400, M.chu3)}
  ${the(`${c('Hôm nay con đã dùng', 17, 700)}${[['Pages', '1 giờ 15 phút'], ['Roblox', '20 phút'], ['Chrome', '12 phút']].map(([a, b]) => `<div style="display:flex;justify-content:space-between">${c(a, 14, 500)}${c(b, 14, 600, M.ngocInk)}</div>`).join('')}`)}
  ${the(`${c('Việc của con', 17, 700)}${c('Con có 3 việc đang chờ. Làm xong để tích điểm nhé!', 14)}${c('128 điểm &nbsp;·&nbsp; Cấp 3 · còn 22 điểm lên cấp', 14, 700, M.diemInk)}
    <div style="display:flex;gap:14px;padding-top:4px">${nut('Xem nhiệm vụ', 'sang', { w: 210, icon: 'memo' })}${nut('Đọc tin nhắn (2)', 'sang', { w: 230, icon: 'speech_balloon' })}</div>`)}
  ${the(`${c('Ba Mẹ cần máy? Bấm nút này hoặc Ctrl ⌃ + Cmd ⌘ + Q', 14, 400, M.chu3)}${nut('Ba Mẹ dùng máy', 'sang', { w: 240, icon: 'key' })}`)}`);

const viec = (ten, diem, rest, nen) => the(`${hang(c(ten, 17, 700, M.chu, 'flex:1'), nhan(diem))}${rest}`, '', nen);
const NHIEM_VU = app(1, 'so-tay', 'Nhiệm vụ của con', `
  ${viec('Dọn góc học tập', '+15 điểm', `${c('Xếp sách vở gọn gàng, lau bàn', 14, 400, M.chu3)}${c('Ba Mẹ nhờ bổ sung', 13, 500, M.canh)}${c('Ba Mẹ nhắn: Con chụp rõ mặt bàn nhé', 14, 600, M.canh)}<div style="padding-top:4px">${nut('Nộp lại', 'sang', { w: 220, icon: 'memo' })}</div>`, M.canhSoft)}
  ${viec('Đọc sách 20 phút — một cái tên rất dài để xem chữ có cắt bằng dấu ba chấm thay vì co nhỏ cỡ chữ hay không nhé', '+10 điểm', `${c('Đang làm &nbsp;·&nbsp; Còn 2 giờ &nbsp;·&nbsp; Ba Mẹ giao riêng', 13, 500, M.chu3)}${c('Làm ít nhất 20 phút rồi mới nộp được.', 13, 400, M.chu3)}<div style="padding-top:4px">${nut('Nộp bài', 'sang', { w: 220, icon: 'memo' })}</div>`)}
  ${viec('Tưới cây', '+5 điểm', `${c('Tưới chậu cây ở ban công', 14, 400, M.chu3)}${c('Sẵn sàng &nbsp;·&nbsp; Còn 1 ngày', 13, 500, M.chu3)}<div style="padding-top:4px">${nut('Nhận việc', 'toi', { w: 220, icon: 'star' })}</div>`)}
  ${viec('Đánh răng', '+2 điểm', `${c('Hôm nay đã đủ', 13, 500, M.chu3)}`)}`);

const qua = (ten, diem, tt, du, mau) => the(`${hang(c(ten, 17, 700, M.chu, 'flex:1'), nhan(diem))}${c(tt, 13, 600, mau)}<div style="padding-top:4px">${nut('Đổi quà', du ? 'toi' : 'sang', { w: 200, icon: 'wrapped_gift', tat: !du })}</div>`);
const PHAN_QUA = app(2, 'qua', 'Phần quà & điểm', `
  ${the(`<div style="display:flex;align-items:center;gap:14px">${vien('star', M.the, 56)}<div style="display:flex;flex-direction:column;gap:2px">${c('Điểm của con', 14, 400, M.diemInk)}<div style="font:700 36px/43px ${FR};color:${M.diemInk}">128 điểm</div></div></div>${c('Cấp 3 · còn 22 điểm lên cấp · 10 điểm đang chờ Ba Mẹ duyệt', 14, 400, M.diemInk)}`, '', M.diemSoft)}
  ${the(`${c('Đi ăn kem &nbsp; · &nbsp; 60 điểm', 15, 700)}${c('Đã đổi, đang chờ Ba Mẹ trao quà cho con.', 13, 400, M.chu3)}`)}
  ${c('Quà con có thể đổi', 18, 700, M.chu, 'padding-top:4px')}
  ${qua('30 phút xem hoạt hình', '50 điểm', 'Đủ điểm', true, M.ngocInk)}
  ${qua('Bộ Lego nhỏ', '300 điểm', 'Còn thiếu 172 điểm · chỉ đổi vào cuối tuần', false, M.chu3)}`);

const TIN_NHAN = app(3, 'chi', 'Tin nhắn', `${c('Ba Mẹ nhắn con', 18, 700)}
  ${the(`${c('Ba Mẹ: Hôm nay con tự giác lắm, Ba Mẹ thương con!', 15, 700, M.ngocInk)}<div style="display:flex;gap:12px;padding-top:4px">${['Con cảm ơn ạ', 'Con sẽ cố gắng', 'Con yêu Ba Mẹ'].map((t) => `<button class="nut sang" style="flex:1;height:44px;border-radius:16px">${t}</button>`).join('')}</div>`)}
  ${the(`${c('Ba Mẹ: Nhớ uống nước nhé', 15, 700, M.ngocInk)}${c('Con: Con cảm ơn ạ', 14)}`)}
  ${c('Thông báo gần đây', 18, 700, M.chu, 'padding-top:6px')}
  ${the(`${c('Ba Mẹ đã duyệt «Quét nhà»', 15, 700)}${c('+5 điểm', 14, 400, M.chu3)}${c('19:11 25/10', 12, 400, M.chu3)}`)}
  ${the(`${c('Nhiệm vụ mới: Tưới cây', 15, 700)}${c('Ba Mẹ vừa giao cho con', 14, 400, M.chu3)}${c('18:11 25/10', 12, 400, M.chu3)}`)}`);

// ---------- Màn khoá / đếm ngược (toàn màn) ----------
const khoaNen = `<div style="position:absolute;inset:0;background:radial-gradient(700px 700px at 50% 0,rgba(15,107,92,.55),rgba(15,107,92,0)),linear-gradient(180deg,${M.thanChi},${M.thanChiDam})"></div>`;
const chip = (t, d) => `<button class="nut ${d ? 'ngoc' : 'sang'}" style="flex:1">${t}</button>`;
const xinThem = `<section class="the" style="border-radius:32px;padding:20px;display:flex;flex-direction:column;gap:12px;color:${M.chu}">
  <div style="display:flex;align-items:center;gap:12px">${vien('hourglass_not_done', M.diemSoft, 44)}${c('Con muốn thêm bao lâu?', 17, 700)}</div>
  <div style="display:flex;gap:14px;padding:2px 0">${chip('30 phút', 1)}${chip('1 giờ')}${chip('2 giờ')}</div>
  ${c('Nhắn Ba Mẹ (không bắt buộc)', 12, 500, M.chu3)}
  <div class="lom" style="height:44px;padding:0 14px;display:flex;align-items:center;font:400 14px ${F};color:rgba(15,19,18,.5)">Ví dụ: con cần làm nốt bài tập</div>
  ${nut('Xin Ba Mẹ', 'toi')}</section>`;
const maOffline = `<section class="the" style="border-radius:32px;padding:20px;display:flex;flex-direction:column;gap:10px;color:${M.chu}">
  <div style="display:flex;align-items:center;gap:12px">${vien('key', M.diemSoft, 44)}<div style="display:flex;flex-direction:column;gap:2px">${c('Mất mạng? Nhập mã của Ba Mẹ', 17, 700)}${c('Ba Mẹ xem mã 6 số trong app AiiGrow và đọc cho con.', 12, 400, M.chu3)}</div></div>
  <div style="display:flex;gap:12px"><div class="lom" style="flex:1;height:48px;border-radius:18px;padding:0 14px;display:flex;align-items:center;font:500 22px ui-monospace,Menlo,monospace;color:rgba(15,19,18,.45)">Mã 6 số</div>${nut('Mở máy', 'toi', { w: 150, tat: true })}</div></section>`;
const chanKhoa = `<div style="display:flex;align-items:center;gap:6px;color:#fff">${fl('seedling', 16)}<span style="font:400 12px ${F};opacity:.75">AiiGrow · máy này do Ba Mẹ quản lý</span></div>`;
const khoa = (w, h, inner) => doc(`${khoaNen}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:32px">
  <div style="width:540px;display:flex;flex-direction:column;align-items:center;gap:18px;color:#fff;text-align:center">${inner}</div></div>`, w, h, '.the{align-self:stretch;text-align:left}');

const DEM_NGUOC = khoa(1280, 900, `${vien('alarm_clock', M.canhSoft, 88)}
  <div style="font:700 34px/41px ${F}">Máy sắp khoá</div>
  <div style="position:relative;padding:14px 36px;border-radius:32px;background:rgba(255,255,255,.09) linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.03) 45%,rgba(255,255,255,0) 50%);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -1px 0 rgba(255,255,255,.06),0 14px 32px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:2px">
    <div style="font:700 88px/105px ${FR};font-variant-numeric:tabular-nums">0:53</div><div style="font:400 17px/20px ${F};opacity:.85">máy sẽ khoá sau</div></div>
  <div style="font:400 16px/19px ${F}">Con lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian.</div>
  ${xinThem}${chanKhoa}`);
const KHOA = (w, h, ma) => khoa(w, h, `${vien('locked', M.the, 96)}
  <div style="font:700 34px/41px ${F}">Hết giờ dùng máy hôm nay</div>
  <div style="font:400 17px/20px ${F};opacity:.9">Con lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian.</div>
  ${ma ? maOffline : ''}${xinThem}${chanKhoa}`);

const A = 'man-mac-2510/';
export default [
  { key: 'mac-app-hom-nay', w: 1000, h: 760, dsf: 2, html: doc(HOM_NAY, 1000, 760), anh: A + 'mac-app-hom-nay.png' },
  { key: 'mac-app-nhiem-vu', w: 1000, h: 760, dsf: 2, html: doc(NHIEM_VU, 1000, 760), anh: A + 'mac-app-nhiem-vu.png' },
  { key: 'mac-app-phan-qua', w: 1000, h: 760, dsf: 2, html: doc(PHAN_QUA, 1000, 760), anh: A + 'mac-app-phan-qua.png' },
  { key: 'mac-app-tin-nhan', w: 1000, h: 760, dsf: 2, html: doc(TIN_NHAN, 1000, 760), anh: A + 'mac-app-tin-nhan.png' },
  { key: 'mac-dem-nguoc', w: 1280, h: 900, dsf: 2, html: DEM_NGUOC, anh: A + 'mac-dem-nguoc.png' },
  { key: 'mac-man-khoa', w: 1280, h: 860, dsf: 2, html: KHOA(1280, 860, false), anh: A + 'mac-man-khoa.png' },
  { key: 'mac-man-khoa-ma-offline', w: 1280, h: 1000, dsf: 2, html: KHOA(1280, 1000, true), anh: A + 'mac-man-khoa-ma-offline.png' },
];
