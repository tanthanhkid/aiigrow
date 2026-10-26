// Hành trình Ba Mẹ (iPhone) — nhóm 2: hằng ngày, ứng dụng & web, báo cáo, cài đặt & hỗ trợ. Tiền tố key `bm2-`.
import { I, P, sb, tab, chipCon, dt } from '../kit/dung.js';
import { BM_TRANG_CHU, BM_MAY, BM_BAO_CAO } from './co-san.js';

const NOTAB = '.cuon{bottom:14px}.seg{display:flex;gap:4px;padding:5px;border-radius:26px;background:var(--lom);box-shadow:var(--lomIn)}.seg b{flex:1;min-height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;font:700 14.5px Inter;color:var(--chu2);white-space:nowrap;padding:0 8px}.seg b.d{background:var(--the);color:var(--chinhInk);box-shadow:var(--clayNho)}.nhom{font:700 13px Inter;letter-spacing:.4px;color:var(--chu3);text-transform:uppercase;padding:0 6px}.o2{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:60px;border-radius:26px;background:var(--the);box-shadow:var(--clayNho)}.o2.on{box-shadow:0 0 0 2.5px var(--chinh),var(--clayNho);background:#eef6f3}.rd{width:26px;height:26px;border-radius:50%;border:2.5px solid #9aa09d;flex:none}.rd.on{border:8px solid var(--chinh)}.tg{width:50px;height:30px;border-radius:15px;background:#8a8f8c;position:relative;flex:none}.tg::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff}.tg.on{background:var(--chinh)}.tg.on::after{left:23px}.in{min-height:52px;border-radius:22px;background:#fff;border:2px solid #8a8f8c;padding:0 16px;display:flex;align-items:center;font:500 15.5px Inter;color:var(--chu3)}';

const hd = (lui, tieu, phai = '') => `<div class="hang" style="gap:4px;margin-top:2px;min-height:48px"><div class="lui" style="flex:none">${P.trai}${lui}</div><div class="mot" style="font:700 18px Inter;flex:1;text-align:center;${phai ? '' : 'padding-right:70px'}">${tieu}</div>${phai}</div>`;
const rb = (lon, phu, rob, cls = '', ex = '') => `<div class="canh-rob" style="min-height:170px;margin-bottom:6px;${cls}"><div class="bong"><div class="lon" style="font-size:21px;line-height:26px">${lon}</div><div class="phu">${phu}</div>${ex}</div><img class="rob" src="/assets/rob/${rob}.webp" alt=""></div>`;
const seg = (ds, dang) => `<div class="seg">${ds.map((t, i) => `<b class="${i === dang ? 'd' : ''}">${t}</b>`).join('')}</div>`;
const dg = (bt, mau, ten, phu, duoi = '') => `<div class="dong"><div class="bt ${mau}">${I(bt)}</div><div class="chu"><div class="ten">${ten}</div><div class="phu">${phu}</div></div>${duoi}</div>`;
const ds = (...r) => `<section class="the ds" style="padding:4px 16px">${r.join('')}</section>`;
const ch = (t) => `<div class="nhom">${t}</div>`;
const man = (body, tabIdx, css = '') => dt(`${sb('07:3' + (tabIdx ?? 5))}<div class="cuon">${body}</div>${tabIdx === undefined ? '' : ''}`, NOTAB + css);
const stat = (a, b, c, d) => `<div class="hang" style="gap:12px"><section class="the" style="flex:1;padding:14px 16px"><div class="s13 m c2">${a}</div><div style="font:800 28px Inter" class="so">${b}</div></section><section class="the" style="flex:1;padding:14px 16px"><div class="s13 m c2">${c}</div><div style="font:800 28px Inter" class="so">${d}</div></section></div>`;

// ===== 1. Hằng ngày =====
const MAY_M1 = man(`${hd('Quay lại', 'Laptop của Bảo Anh ·…')}
  ${rb('Tuân thủ', 'Đồng bộ 14 phút trước · bản 0.2.5', 'rob-goc')}
  <div class="b s16" style="padding:0 4px">Chế độ trên máy</div>${seg(['Giám sát', 'Chặn thật'], 1)}
  <p class="s15 c2" style="line-height:21px;padding:0 4px">Áp thật: chặn app ngoài danh sách, khoá máy ngoài giờ. Luật web chỉ áp cho tài khoản Windows của Con — tài khoản của Ba Mẹ không bị chặn web.</p>
  ${stat('Điểm tuân thủ', '96<span class="s16 c3">/100</span>', 'Giải trí', 'Mở')}
  <section class="the" style="background-color:#dcebe6"><div class="hang"><span style="color:var(--chinh)">${I('tick')}</span><div class="b s16" style="color:var(--chinhInk);line-height:21px">Máy được bảo vệ đầy đủ, không có vấn đề nào</div></div></section>
  ${ch('Khi cần')}${ds(dg('laptop', 'xanh', 'Đổi tên máy', 'Hiện là «Laptop của Bảo Anh · Windows 11»', P.phai))}`);

const MAY_M2 = man(`${hd('Quay lại', 'iPad của Bảo Anh')}
  ${rb('Lệch chuẩn', 'Đồng bộ 1 ngày trước', 'rob-goc')}
  ${stat('Điểm tuân thủ', '70<span class="s16 c3">/100</span>', 'Giải trí', 'Mở')}
  ${ch('Bảo vệ chưa đủ — cách sửa')}
  ${ds(dg('canh_bao', 'vang', 'Bảo vệ chưa đủ', '1 việc cần sửa (xem bên dưới).'), dg('khoa', 'cam', 'Tài khoản của Con vẫn là quản trị', 'Cách sửa: Tắt quyền quản trị cho tài khoản của Con.'))}
  ${ch('Khi cần')}
  ${ds(dg('laptop', 'xanh', 'Đổi tên máy', 'Hiện là «iPad của Bảo Anh»', P.phai), dg('mo_khoa', 'cam', 'Mở khẩn cấp', 'Tạm mở giải trí có hạn giờ khi Con đang cần (vẫn giữ giờ ngủ).', P.phai))}`);

const GIO = man(`${hd('Trang chủ', 'Giờ dùng máy')}
  ${rb('Nguyễn Ngọc Bảo Anh dùng máy theo lịch', 'Trần 90 phút mỗi ngày, tính gộp mọi máy.', 'canh-trong')}
  <button class="nut vien rong" style="color:var(--loi)">${I('khoa')}Khoá máy ngay</button>
  ${ds(dg('dongho', 'xanh', 'Ngày thường', '17:00 – 20:00', P.phai), dg('lich', 'xanh', 'Cuối tuần', '09:00 – 21:00', P.phai), dg('trang_ngu', 'tim', 'Giờ ngủ', '21:30 – 06:30 · khoá mọi trò chơi', P.phai))}
  <div class="b s16" style="padding:0 4px">Mỗi phiên tối đa · sau phiên nghỉ 60 phút</div>${seg(['20 phút', '30 phút', '45 phút', '60 phút'], 1)}
  <div class="b s16" style="padding:0 4px">Trần mỗi ngày · tính gộp mọi máy</div>${seg(['60 phút', '90 phút', '120 phút', '180 phút'], 1)}`);

const HO_SO = man(`${hd('Quay lại', 'Nguyễn Ngọc Bảo Anh')}
  ${rb('Nguyễn Ngọc Bảo Anh có 2 máy', '1 máy bảo vệ chưa đầy đủ — xem lý do và cách làm bên dưới.', 'rob-goc')}
  ${ds(`<div class="dong"><div class="bt xanh lon">${I('laptop')}</div><div class="chu"><div class="ten">Laptop của Bảo Anh · Windows 11</div><div class="phu">Online · đồng bộ 16 phút trước</div></div><span class="huy ok">Đầy đủ</span></div>`,
    `<div class="dong"><div class="bt cam lon">${I('tablet')}</div><div class="chu"><div class="ten">iPad của Bảo Anh</div><div class="phu">Offline · đồng bộ 1 ngày trước</div></div><span class="huy lech">Chưa đủ</span></div>`)}
  ${ds(dg('canh_bao', 'vang', 'iPad của Bảo Anh: bảo vệ chưa đầy đủ', 'Chưa nhận được báo cáo từ máy.', P.phai))}
  <button class="nut vien rong">${I('laptop')}Ghép thêm máy</button>`);

// ===== 2. Ứng dụng & web =====
const hangApp = (ic, ten, phu, nhan, cls) => `<div class="dong"><div class="bt xanh">${I(ic)}</div><div class="chu"><div class="ten">${ten}</div><div class="phu">${phu}</div></div><span class="huy ${cls}">${nhan}</span></div>`;
const UNG_DUNG_MAY = man(`${hd('Máy', 'Ứng dụng')}
  <div class="b" style="font:800 21px Inter;padding:0 4px">Ứng dụng trên máy Laptop của Bảo Anh</div>
  <p class="s15 c3" style="padding:0 4px">Danh sách lấy thẳng từ máy — chọn đúng app để chặn hoặc cho phép.</p>
  <div class="hang s13 c3" style="padding:0 4px">${I('dongho')}<span>Cập nhật 5 phút trước</span></div>
  ${ds(
    `<div class="dong"><div class="bt cam" style="position:relative">${I('game')}<span style="position:absolute;right:-4px;bottom:-4px;width:20px;height:20px;border-radius:10px;background:var(--loi);display:flex;align-items:center;justify-content:center"><img src="/assets/icon3d/khoa.webp" style="width:12px;height:12px" alt=""></span></div><div class="chu"><div class="ten">Roblox</div><div class="phu">Đã chặn · roblox.exe</div></div><span class="huy lech">Chặn</span></div>`,
    hangApp('game', 'Minecraft launcher', '30 phút trên máy Con · chưa xếp', 'Xếp', 'lech'),
    hangApp('camera', 'Capcut', '4 phút trên máy Con · chưa xếp', 'Xếp', 'lech'),
    hangApp('mu', 'Khan Academy', 'Học tập · không trừ điểm', 'Học tập', 'ok'))}
  <p class="s13 c3" style="line-height:19px;padding:0 4px">App «Chưa xếp» chưa mở được trên máy Con cho tới khi Ba Mẹ xếp loại. Thay đổi tới máy ở lần đồng bộ kế (≤ 2 phút khi online).</p>
  <section class="the" style="padding:14px"><div class="b s16" style="margin-bottom:10px">Minecraft launcher</div>
   <div class="o2 on" style="margin-bottom:8px"><div class="bt">${I('mu')}</div><div style="flex:1"><div class="b s16">Học tập — miễn phí</div><div class="s13 c3">Không trừ điểm, dùng cả giờ học</div></div><span class="rd on"></span></div>
   <div class="o2" style="margin-bottom:8px"><div class="bt vang">${I('game')}</div><div style="flex:1"><div class="b s16">Giải trí — trừ điểm</div><div class="s13 c3">Chỉ trong giờ chơi</div></div><span class="rd"></span></div>
   <div class="o2"><div class="bt cam">${I('khoa')}</div><div style="flex:1"><div class="b s16">Chặn hoàn toàn</div><div class="s13 c3">Con không mở được</div></div><span class="rd"></span></div></section>`);

const APP_WEB = man(`${hd('Trang chủ', 'Ứng dụng')}
  <div class="b s16" style="padding:0 4px">Tìm app hoặc trang web (vd Edge, YouTube)</div><div class="in">Edge, Roblox, youtube.com…</div>
  <div class="seg" style="flex-wrap:wrap"><b class="d" style="flex:none;padding:0 16px">Chưa xếp (3)</b><b style="flex:none;padding:0 14px">Đã thấy (3)</b><b style="flex:none;padding:0 14px">Học tập</b><b style="flex:none;padding:0 14px">Giải trí</b><b style="flex:none;padding:0 14px">Chặn</b></div>
  ${ds(hangApp('web', 'tiktok.com', '12 phút trên máy Con · chưa xếp', 'Xếp', 'lech'), hangApp('camera', 'Capcut', '4 phút · capcut.exe', 'Xếp', 'lech'), hangApp('game', 'Minecraft launcher', '30 phút · minecraft.launcher.exe', 'Xếp', 'lech'))}
  ${ch('Luôn được dùng (hệ thống)')}
  ${ds(hangApp('sach', 'Word, Excel, PowerPoint', 'Không tính điểm, Ba Mẹ không cần làm gì', 'Học tập', 'ok'), hangApp('mu', 'AiiRob', 'Học cùng Rob · tự cộng điểm khi đạt', 'Học tập', 'ok'))}`);

const chipWeb = (t, khoa) => `<div class="chip" style="${khoa ? 'color:var(--loi);background-color:#fbe9e6' : ''}">${khoa ? I('khoa') : P.cong}${t}</div>`;
const WEB = man(`${hd('Trang chủ', 'Trang web')}
  ${seg(['Chặn từng trang', 'Chỉ trang đã duyệt'], 0)}
  <p class="s15 c3" style="padding:0 4px;line-height:21px">Nguyễn Ngọc Bảo Anh vào được mọi trang, trừ trang bạn chặn.</p>
  <div class="b s16" style="padding:0 4px">Chặn một trang</div><div class="in">youtube.com</div>
  <div class="hang" style="flex-wrap:wrap;gap:8px">${chipWeb('YouTube', 1)}${chipWeb('TikTok', 1)}${chipWeb('Facebook')}${chipWeb('Roblox')}</div>
  ${ch('Đang chặn · 3')}
  ${ds(['youtube.com|Chỉ Nguyễn Ngọc Bảo Anh', 'youtube.com|Cả gia đình', 'tiktok.com|Cả gia đình'].map((s) => { const [a, b] = s.split('|'); return dg('khoa', 'cam', a, b, '<button class="nut vien nho">Bỏ chặn</button>'); }).join(''))}
  ${ch('Luôn cho phép')}${ds(dg('tick', 'xanh', 'khanacademy.org', 'Cả gia đình', '<span class="huy ok">Cho phép</span>'))}`);

const YC_WEB = man(`${hd('Chờ duyệt', 'Yêu cầu của Nguyễn…')}
  ${rb('Nguyễn Ngọc Bảo Anh xin mở scratch.mit.edu', '«Để làm bài tập» · gửi lúc 07:16.', 'hoc')}
  <div class="b s16" style="padding:0 4px">Xếp vào</div>
  <div class="o2 on"><div class="bt">${I('mu')}</div><div style="flex:1"><div class="b s16">Học tập — miễn phí</div><div class="s13 c3">Không trừ điểm, dùng cả giờ học</div></div><span class="rd on"></span></div>
  <div class="o2"><div class="bt vang">${I('game')}</div><div style="flex:1"><div class="b s16">Giải trí — 1 điểm/phút</div><div class="s13 c3">Chỉ trong giờ chơi</div></div><span class="rd"></span></div>
  <div class="b s16" style="padding:0 4px">Cho phép</div>${seg(['Lần này', 'Hôm nay', 'Luôn luôn'], 2)}
  <button class="nut rong">Đồng ý · mở trong 10 giây</button><button class="nut vien rong" style="color:var(--loi)">Từ chối, kèm lý do</button>`);

// ===== 3. Báo cáo =====
const loai = [['tro_choi', 'game', 'tim', 'Trò chơi', '3 giờ 10 phút', 29, '#5b4fd6'], ['hoc', 'mu', 'xanh', 'Học tập', '3 giờ 10 phút', 29, '#0f6b5c'], ['video', 'camera', 'cam', 'Video & phim', '2 giờ 5 phút', 19, '#c2410c'], ['ngan', 'tia', 'cam', 'Video ngắn', '1 giờ', 9, '#c0245e'], ['xh', 'tin', 'lam', 'Mạng xã hội & chat', '35 phút', 5, '#1d4ed8']];
const MAN_HINH = man(`${hd('Trang chủ', 'Thời gian màn hình')}
  ${seg(['Tuần này', 'Tuần trước', '2 tuần trước'], 0)}
  <section class="the"><div class="s13 m c2">Nguyễn Ngọc Bảo Anh · 19/10 – 25/10</div><div style="font:800 32px/38px Inter;letter-spacing:-.6px" class="so">10 giờ 45 phút</div><div class="s15 c2" style="line-height:20px">Trung bình 2 giờ 9 phút/ngày · ít hơn tuần trước 21%</div>
   <div class="cot" style="margin-top:12px;height:120px">${[60, 72, 100, 55, 88, 0, 0].map((h, i) => `<div class="ngay"><div class="doi" style="height:96px"><i style="height:${Math.max(h, 3)}%;width:28px;background:${h ? 'linear-gradient(180deg,#5b4fd6 0 40%,#0f6b5c 40% 100%)' : '#dcdad4'}"></i></div><span>${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}</span></div>`).join('')}</div></section>
  ${ch('Theo mục')}
  <section class="the ds" style="padding:2px 16px">${loai.map(([, ic, m, t, g, p, mau]) => `<div class="dong" style="min-height:54px"><div class="bt ${m}">${I(ic)}</div><div class="chu"><div class="hang" style="justify-content:space-between"><span class="ten">${t}</span><span class="b s13 so">${g}</span></div><div class="tien" style="height:8px;padding:0;margin-top:4px"><i style="width:${p * 3}%;background:${mau}"></i></div></div><span class="s13 c3 so" style="width:34px;text-align:right">${p}%</span></div>`).join('')}</section>`);

const giaoDich = (ten, gio, diem, ic, m) => dg(ic, m, ten, gio, `<b class="s16 so ${diem[0] === '+' ? 'nhan-xanh' : ''}">${diem}</b>`);
const VI = man(`${hd('Trang chủ', 'Ví của Nguyễn…', '<span class="huy ok" style="margin-left:4px">± Điều chỉnh</span>')}
  ${rb('Nguyễn Ngọc Bảo Anh có 155 điểm', '30 điểm đang chờ duyệt · cấp 4.', 'canh-diem', 'background:linear-gradient(180deg,#fdf3d0,#f7e3a6)', '<div class="huy" style="background-color:var(--diemSoft);color:var(--diemInk);margin-top:10px">Chuỗi 6 ngày</div>')}
  ${stat('Tuần này kiếm', '+45', 'Tuần này tiêu', '−25')}
  ${ds(dg('lua', 'cam', 'Giữ chuỗi ngày', 'Con nghỉ 21/10 vẫn không đứt chuỗi · 1 lần mỗi tuần', '<span class="huy ok">Giữ</span>'))}
  ${ch('Lịch sử')}
  ${ds(giaoDich('Nhiệm vụ Rửa chén sau bữa tối', '07:18', '+10', 'sao', 'vang'), giaoDich('Nhiệm vụ Học 1 bài với AiiRob', '05:59', '+20', 'sao', 'vang'), giaoDich('Chơi roblox.exe', '04:49', '−25', 'game', 'tim'))}`);

// ===== 4. Cài đặt & hỗ trợ =====
const GIA_DINH = dt(`${sb('07:35')}<div class="cuon">
  <h1 class="tieuLon" style="margin-top:6px">Gia đình</h1>
  ${ch('Các Con')}${ds(`<div class="dong"><span class="avt" style="background-color:#c2410c;width:44px;height:44px;font-size:16px">A</span><div class="chu"><div class="ten">Nguyễn Ngọc Bảo Anh</div><div class="phu">Hồ sơ, nhóm tuổi, mã PIN, liên kết AiiRob</div></div>${P.phai}</div>`, dg('cong', 'xanh', 'Thêm Con', 'Ghép máy và giao nhiệm vụ cho Con', P.phai))}
  ${ch('Mọi người')}${ds(dg('nguoi', 'xanh', 'Thành viên', 'Ba Huy (phê duyệt) · Bà nội (chỉ xem)', P.phai), dg('tia', 'vang', 'Cảnh báo & quy tắc tự động', 'Ngoại lệ, gợi ý, an toàn thiết bị', P.phai))}
  ${ch('Thông báo')}${ds(dg('chuong', 'xanh', 'Thông báo', 'Việc mới của cả nhà, gộp gọn', P.phai), dg('trang_ngu', 'tim', 'Giờ yên lặng', 'Không đẩy lên màn khoá, trừ cảnh báo nghiêm trọng', P.phai))}
  ${ch('Trợ giúp')}${ds(`<div class="dong"><img src="/assets/rob/rob-goc.webp" alt="" style="width:44px;height:44px;object-fit:contain"><div class="chu"><div class="ten">Chat với AiiLab</div><div class="phu">Người thật trả lời, thường trong 5 phút</div></div>${P.phai}</div>`)}
</div>${tab(3, 4)}`, '.tab+*{}');

const vaiHuy = { 'Chủ gia đình': 'ok', 'Phê duyệt': '', 'Chỉ xem': '' };
const tv = (c, mau, ten, phu, vai) => `<div class="dong"><span class="avt" style="background-color:${mau};width:44px;height:44px;font-size:16px">${c}</span><div class="chu"><div class="ten">${ten}</div><div class="phu">${phu}</div></div><span class="huy ${vaiHuy[vai]}" style="${vai === 'Phê duyệt' ? 'background-color:var(--lamSoft);color:#1a44c0' : vai === 'Chỉ xem' ? 'background-color:var(--xamSoft);color:var(--chu2)' : ''}">${vai}</span></div>`;
const THANH_VIEN = man(`${hd('Gia đình', 'Thành viên')}
  ${rb('Cả nhà cùng đồng hành', 'Mời Ba, Ông Bà duyệt cùng hoặc chỉ xem tình hình. Mọi lần duyệt đều ghi rõ ai duyệt.', 'canh-cac-con')}
  ${ch('Người lớn (3)')}${ds(tv('L', '#0f6b5c', 'Mẹ Lan (Ba/Mẹ)', '0912345678', 'Chủ gia đình'), tv('H', '#6d4fe0', 'Ba Huy', 'Duyệt nhiệm vụ, yêu cầu, đổi quà như Ba Mẹ', 'Phê duyệt'), tv('H', '#b8470a', 'Bà nội Nguyễn Thị Ngọc Hạnh', 'Xem tình hình, nhận thông báo; không duyệt', 'Chỉ xem'))}
  ${ch('Lời mời đang chờ')}`, undefined, '.cuon{bottom:100px}') .replace('</div></body>', '<div style="position:absolute;left:16px;right:16px;bottom:20px"><button class="nut rong">' + P.cong + 'Mời thành viên</button></div></div></body>');

const tb = (ic, m, t, p, nhan, cls) => dg(ic, m, t, p, nhan ? `<span class="huy ${cls}">${nhan}</span>` : P.phai);
const THONG_BAO = man(`${hd('Trang chủ', 'Thông báo', '<span class="b s16 nhan-xanh" style="padding-right:8px">Cài đặt</span>')}
  <p class="s15 c3" style="padding:0 4px">3 thông báo mới · giờ yên lặng 22:00–06:30</p>
  ${ch('Hôm nay')}
  ${ds(tb('tick', 'xanh', 'Nguyễn Ngọc Bảo Anh vừa nộp 3 nhiệm vụ', '07:15 · Rửa chén · Đọc sách · Tập thể dục 30 phút', 'Mới', 'ok'), tb('tin', 'lam', 'Bill xin thêm 15 phút', '07:10 · Đồng ý hoặc từ chối trong Chờ duyệt', 'Mới', 'ok'), tb('canh_bao', 'cam', 'Có dấu hiệu đổi giờ hệ thống trên Laptop-BILL', '06:59 · Cảnh báo · Bill', 'Nghiêm trọng', 'lech'), tb('nguoi', 'tim', 'Ba Huy đã duyệt «Rửa chén sau bữa tối»', '05:44 · +10 điểm'))}
  ${ch('Hôm qua')}${ds(tb('qua', 'vang', 'Bill đổi «Phiếu quà AiiCafe 50.000đ»', '24/10 06:19 · 500 điểm · chờ Ba Mẹ trao quà'))}`);

const tgl = (t, p, on) => `<div class="dong"><div class="chu"><div class="ten">${t}</div><div class="phu">${p}</div></div><span class="tg ${on ? 'on' : ''}"></span></div>`;
const TB_CAI_DAT = man(`${hd('Thông báo', 'Cài đặt thông báo')}
  ${ch('Giờ yên lặng')}${ds(`<div class="dong"><div class="bt tim">${I('trang_ngu')}</div><div class="chu"><div class="ten">Giờ yên lặng</div><div class="phu">22:00 – 06:30 · trừ cảnh báo nghiêm trọng</div></div><span class="tg"></span></div>`, dg('dongho', 'xanh', 'Đổi giờ', 'Mặc định 22:00 – 06:30', P.phai))}
  ${ch('Báo cho Ba/Mẹ khi')}${ds(tgl('Con nộp nhiệm vụ', 'Nộp liền nhau gộp một thông báo', 1), tgl('Con xin phép', 'Thêm giờ, mở web, cài app', 1), tgl('Đổi quà, phiếu quà', 'Kèm số dư quỹ phiếu quà', 1), tgl('Huy hiệu, AiiRob', 'Có cớ khen Con', 0), tgl('Việc Ba Mẹ khác làm', 'Duyệt, từ chối, mở khẩn cấp', 1), tgl('Cảnh báo', 'Cảnh báo nghiêm trọng luôn được báo', 1))}`);

const HO_TRO = man(`${hd('Quay lại', 'AiiLab hỗ trợ')}
  <div style="display:flex;gap:8px;align-items:flex-end"><img src="/assets/rob/rob-goc.webp" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:contain;background:#dcebe6"><div class="the" style="padding:12px 16px;border-radius:24px;max-width:78%"><div class="s16" style="line-height:22px">Chào chị Lan, AiiLab đây. Chị cần giúp gì về AiiGrow ạ?</div><div class="s13 c3">07:09</div></div></div>
  <div style="display:flex;justify-content:flex-end"><div style="max-width:78%;padding:12px 16px;border-radius:24px;background:linear-gradient(180deg,#14826f,#0a5246);color:#fff;box-shadow:var(--clayNho)"><div class="s16" style="line-height:22px">Quỹ phiếu quà của em chuyển khoản rồi mà chưa thấy cộng.</div><div class="s13" style="opacity:.85">07:11</div></div></div>
  <div style="display:flex;gap:8px;align-items:flex-end"><img src="/assets/rob/rob-goc.webp" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:contain;background:#dcebe6"><div class="the" style="padding:12px 16px;border-radius:24px;max-width:78%"><div class="s16" style="line-height:22px">AiiLab thấy khoản 200.000đ rồi ạ, đã cộng vào quỹ. Con đổi phiếu quà được ngay.</div><div class="s13 c3">07:14</div></div></div>
  <div class="hang" style="margin-top:auto"><div class="in" style="flex:1">Nhập tin nhắn…</div><div class="bt xanh lon" style="color:var(--chinhInk)"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21 23 12 2 3v7l15 2-15 2z"/></svg></div></div>`);

const QUY = man(`${hd('Điểm & quà', 'Quỹ phiếu quà')}
  ${rb('Quỹ còn 30.000đ', 'Con muốn đổi phiếu quà thì quỹ cần đủ mệnh giá. Điểm của Con vẫn giữ nguyên.', 'trong-loi', 'background:linear-gradient(180deg,#fde8e2,#f8d4ca)')}
  ${ds(dg('qua', 'vang', 'Nạp tại quầy AiiCafe', 'Nhân viên ghi nhận ngay, quỹ cập nhật trong vài giây'), dg('cot', 'xanh', 'Chuyển khoản', 'Nhắn AiiLab nội dung chuyển khoản — AiiLab ghi nhận trong 15 phút'))}
  <section class="the" style="background-color:#e1e9fb"><div class="b s16" style="color:#1a3fa8">Con đang thấy gì?</div><div class="s15 c2" style="line-height:21px;margin-top:4px">«Đợi Ba Mẹ nạp quỹ nhé» — không có chữ lỗi, điểm không bị trừ.</div></section>
  ${ch('Giao dịch quỹ')}${ds(dg('cong', 'tim', 'Nạp quỹ', '22/10 12:39', '<span class="huy ok">+200.000đ</span>'))}`, undefined, '.cuon{bottom:100px}').replace('</div></body>', '<div style="position:absolute;left:16px;right:16px;bottom:20px"><button class="nut rong">' + I('tin') + 'Chat với AiiLab để nạp</button></div></div></body>');

const ADMIN = dt(`${sb('07:35')}<div class="cuon" style="align-items:center;text-align:center">${hd('Quay lại', 'Hộp thư hỗ trợ').replace('<div class="hang"', '<div class="hang" style="align-self:stretch"').replace('class="hang" style="gap', 'class="hang" style="width:100%;gap')}
  <img src="/assets/rob/nghi.webp" alt="" style="width:200px;height:200px;object-fit:contain;margin-top:6px">
  <div class="the" style="padding:16px 28px"><div style="font:800 21px Inter">Chưa tải được</div><div class="s15 c2" style="margin-top:4px">chưa giả GET admin/ho-tro</div></div>
  <button class="nut vien rong" style="max-width:300px">Thử lại</button></div>`, NOTAB);

const A = 'chinchu-ios/';
export default [
  { id: 'bm-hang-ngay', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Hằng ngày', mo: 'Ba Mẹ mở app, xem máy của con, chỉnh giờ dùng máy và hồ sơ con.',
    buoc: [
      { key: 'bm2-trang-chu', ten: 'Trang chủ', w: 390, h: 844, html: BM_TRANG_CHU, anh: A + 'sau-bm-trang.png', toi: 'Bấm «Khoá máy» hoặc thẻ máy' },
      { key: 'bm2-may-ds', ten: 'Máy của con', w: 390, h: 844, html: BM_MAY, anh: A + 'sau-bm-may-ds.png', toi: 'Chạm Laptop của Bảo Anh' },
      { key: 'bm2-may-m1', ten: 'Chi tiết máy (tuân thủ)', w: 390, h: 844, html: MAY_M1, anh: A + 'sau-bm-may-m1.png', toi: 'Quay lại, chạm iPad' },
      { key: 'bm2-may-m2', ten: 'Chi tiết máy (lệch chuẩn)', w: 390, h: 844, html: MAY_M2, anh: A + 'sau-bm-may-m2.png', toi: 'Về Trang chủ, mở Giờ dùng máy' },
      { key: 'bm2-gio', ten: 'Giờ dùng máy', w: 390, h: 844, html: GIO, anh: A + 'sau-bm-gio.png', toi: 'Chạm tên con' },
      { key: 'bm2-ho-so', ten: 'Hồ sơ con', w: 390, h: 844, html: HO_SO, anh: A + 'sau-bm-ho-so-con.png' }] },
  { id: 'bm-ung-dung', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Ứng dụng & web trên máy', mo: 'Xếp loại app, chặn trang web và duyệt yêu cầu mở web của con.',
    buoc: [
      { key: 'bm2-ung-dung-may', ten: 'Ứng dụng trên máy', w: 390, h: 844, html: UNG_DUNG_MAY, toi: 'Quay lại, mở danh sách tổng' },
      { key: 'bm2-app-web', ten: 'Ứng dụng (chưa xếp)', w: 390, h: 844, html: APP_WEB, anh: A + 'sau-bm-app-web.png', toi: 'Sang Trang web' },
      { key: 'bm2-web', ten: 'Trang web', w: 390, h: 844, html: WEB, anh: A + 'sau-bm-web.png', toi: 'Con xin mở trang mới' },
      { key: 'bm2-yeu-cau-web', ten: 'Yêu cầu mở web', w: 390, h: 844, html: YC_WEB, anh: A + 'sau-bm-yeu-cau-web.png' }] },
  { id: 'bm-bao-cao', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Báo cáo', mo: 'Xem báo cáo tuần, thời gian màn hình theo mục và ví điểm của con.',
    buoc: [
      { key: 'bm2-bao-cao', ten: 'Báo cáo tuần', w: 390, h: 844, html: BM_BAO_CAO, anh: A + 'sau-bm-bao-cao.png', toi: 'Chạm «Thời gian màn hình»' },
      { key: 'bm2-man-hinh', ten: 'Thời gian màn hình', w: 390, h: 844, html: MAN_HINH, anh: A + 'sau-bm-man-hinh.png', toi: 'Mở ví điểm' },
      { key: 'bm2-vi', ten: 'Ví điểm', w: 390, h: 844, html: VI, anh: A + 'sau-bm-vi.png' }] },
  { id: 'bm-cai-dat', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Cài đặt & hỗ trợ', mo: 'Quản lý thành viên, thông báo, quỹ phiếu quà và chat với AiiLab.',
    buoc: [
      { key: 'bm2-gia-dinh', ten: 'Gia đình', w: 390, h: 844, html: GIA_DINH, anh: A + 'sau-bm-gia-dinh.png', toi: 'Chạm «Thành viên»' },
      { key: 'bm2-thanh-vien', ten: 'Thành viên', w: 390, h: 844, html: THANH_VIEN, anh: A + 'sau-bm-thanh-vien.png', toi: 'Chạm «Thông báo»' },
      { key: 'bm2-thong-bao', ten: 'Thông báo', w: 390, h: 844, html: THONG_BAO, anh: A + 'sau-bm-thong-bao.png', toi: 'Chạm «Cài đặt»' },
      { key: 'bm2-thong-bao-cai-dat', ten: 'Cài đặt thông báo', w: 390, h: 844, html: TB_CAI_DAT, anh: A + 'sau-bm-thong-bao-cai-dat.png', toi: 'Chat với AiiLab' },
      { key: 'bm2-ho-tro', ten: 'AiiLab hỗ trợ', w: 390, h: 844, html: HO_TRO, anh: A + 'sau-bm-ho-tro.png', toi: 'Mở Quỹ phiếu quà' },
      { key: 'bm2-quy', ten: 'Quỹ phiếu quà', w: 390, h: 844, html: QUY, anh: A + 'sau-bm-quy.png', toi: 'Quản trị mở hộp thư hỗ trợ' },
      { key: 'bm2-admin-ho-tro', ten: 'Hộp thư hỗ trợ (quản trị)', w: 390, h: 844, html: ADMIN, anh: A + 'sau-bm-admin-ho-tro.png' }] },
];
