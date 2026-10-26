// Vai Ba Mẹ (iPhone) — hai hành trình: «Duyệt yêu cầu» và «Nhiệm vụ & phần quà». Tiền tố key bm3-.
import { I, P, sb, tab, chipCon, viec, dt } from '../kit/dung.js';
import { BM_CHO_DUYET, BM_NHIEM_VU } from './co-san.js';

const CSS = `.cuon.d{bottom:20px}.cuon.n{bottom:150px}
.day{position:absolute;left:16px;right:16px;bottom:18px;display:flex;flex-direction:column;gap:10px}
.day .hang{gap:10px}.day .hang .nut{flex:1}
.lbl{font:700 14px Inter;margin:2px 4px -4px}.tn{font:700 12.5px Inter;letter-spacing:.4px;color:var(--chu3);text-transform:uppercase;margin:6px 6px -4px}
.ochon{display:flex;align-items:center;gap:12px;padding:14px;min-height:64px;border-radius:26px;background:var(--the);box-shadow:var(--clayNho)}
.ochon.on{box-shadow:var(--clayNho),0 0 0 2.5px var(--chinh)}.ochon .ch{flex:1;min-width:0}
.ochon .t{font:700 16px/20px Inter}.ochon .p{font:500 13.5px/18px Inter;color:var(--chu3);margin-top:2px}
.rad{width:26px;height:26px;border-radius:50%;border:2px solid #8a8f8c;flex:none}.on .rad{border:8px solid var(--chinh)}
.seg{display:flex;padding:5px;gap:4px;border-radius:26px;background:var(--lom);box-shadow:var(--lomIn)}
.seg span{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:22px;font:700 14.5px Inter;color:var(--chu2);white-space:nowrap}
.seg span.on{background:var(--the);color:var(--chinhInk);box-shadow:var(--clayNho)}
.cb{background:var(--canhSoft);border-radius:26px;padding:14px 16px;display:flex;gap:12px;box-shadow:var(--clayNho)}
.cb b{font:700 15.5px/20px Inter;color:var(--canh);display:block}.cb span{font:500 14px/19px Inter;color:#5a3410}
.tk{display:flex;gap:12px;align-items:flex-start;padding:8px 0;font:500 15px/20px Inter}
.tk i{width:28px;height:28px;border-radius:50%;background:var(--chinh);color:#fff;font:700 15px/28px Inter;text-align:center;flex:none;font-style:normal}.tk i.x{background:var(--canhSoft);color:var(--canh)}
.toast{position:absolute;left:16px;right:16px;bottom:96px;min-height:56px;border-radius:28px;background:#1a1f1e;color:#fff;display:flex;align-items:center;gap:12px;padding:0 20px 0 12px;font:700 15px Inter;box-shadow:var(--clay)}
.toast b{margin-left:auto;color:#7fe0c8}.nhan{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:99px;font:700 13px Inter;white-space:nowrap;flex:none}
.nd{background:var(--diemSoft);color:var(--diemInk)}.nc{background:var(--canhSoft);color:var(--canh)}.nx{background:var(--xamSoft);color:var(--chu2)}.nk{background:var(--chinhSoft);color:var(--chinhInk)}
.lock{position:absolute;inset:0;background:radial-gradient(120% 60% at 30% 0,#2f5d52,#16211e 70%);color:#fff;padding:0 16px}
.lock .gio{font:700 84px/90px Inter;text-align:center;margin-top:64px;letter-spacing:-2px}.lock .ng{text-align:center;font:600 18px Inter;opacity:.85}
.tb{margin-top:34px;border-radius:26px;background:rgba(255,255,255,.88);color:var(--chu);padding:14px 16px;display:flex;gap:12px}.tb img{width:40px;height:40px;border-radius:10px;background:#fff}
.tb .a{font:600 12.5px Inter;color:var(--chu3);display:flex;justify-content:space-between}.tb .t{font:700 15.5px/20px Inter;margin-top:2px}.tb .p{font:500 14px/19px Inter;color:var(--chu2)}
.ch2{border-radius:26px;background:var(--lom);box-shadow:var(--lomIn);padding:14px;font:500 15px/21px Inter;display:flex;flex-direction:column;gap:6px}
.ph{height:230px;border-radius:26px 26px 0 0;background:linear-gradient(180deg,#c9d2d6 0 36%,#9d8670 36%);position:relative}.ph::after{content:'';position:absolute;left:12%;right:12%;top:34%;bottom:12%;border-radius:50%;background:radial-gradient(#fff,#d2d4d4)}
.mot2{font:500 13.5px/18px Inter;color:var(--chu3)}.stp{display:flex;align-items:center;gap:12px}.stp .bt{width:44px;height:44px}.stp .so{font:800 24px Inter;width:44px;text-align:center}`;

const hd = (lui, tieu, phai = '') => `<div class="hang" style="margin-top:2px;min-height:44px"><div class="lui" style="padding:0">${P.trai}${lui}</div><div class="mot" style="font:700 18px Inter;flex:1;text-align:center;margin-right:${phai ? 0 : 60}px">${tieu}</div>${phai}</div>`;
const rob = (bg, tieu, phu, img, ex = '') => `<div class="canh-rob" style="min-height:170px;background:${bg}"><div class="bong" style="width:60%"><div class="lon" style="font-size:21px;line-height:26px">${tieu}</div><div class="phu" style="font-size:13.5px;line-height:18px">${phu}</div>${ex}</div><img class="rob" src="/assets/rob/${img}.webp" alt="" style="width:130px;height:150px"></div>`;
const XANH = 'linear-gradient(180deg,#e3efea,#d4e6df)', HONG = 'linear-gradient(180deg,#fbe4dc,#f6d3c8)', VANG = 'linear-gradient(180deg,#fdeeb8,#f8dd8f)';
const day = (x) => `<div class="day">${x}</div>`;
const oc = (ic, mau, t, p, on) => `<div class="ochon ${on ? 'on' : ''}"><div class="bt ${mau}">${I(ic)}</div><div class="ch"><div class="t">${t}</div><div class="p">${p}</div></div><span class="rad"></span></div>`;
const seg = (ds, i) => `<div class="seg">${ds.map((d, k) => `<span class="${k === i ? 'on' : ''}">${d}</span>`).join('')}</div>`;
const dong = (ic, mau, t, p, ph) => `<div class="dong"><div class="bt ${mau}">${I(ic)}</div><div class="chu"><div class="ten">${t}</div><div class="phu">${p}</div></div>${ph || ''}</div>`;
const screen = (body, css = '') => dt(`${sb('08:42')}${body}`, CSS + css);
const man = (key, ten, html, anh, toi) => ({ key: 'bm3-' + key, ten, w: 390, h: 844, html, ...(anh ? { anh: 'chinchu-ios/' + anh } : {}), ...(toi ? { toi } : {}) });

// ---------- Hành trình 1: Duyệt yêu cầu ----------
const THONG_BAO = dt(`<div class="lock"><div style="height:47px"></div><div class="ng" style="margin-top:20px">Thứ Hai, 26 tháng 10</div><div class="gio">07:16</div>
 <div class="tb"><img src="/assets/logo.png" alt=""><div style="flex:1;min-width:0"><div class="a"><span>AIIGROW</span><span>bây giờ</span></div><div class="t">Bill xin thêm 15 phút</div><div class="p">“Con đang xây dở nhà” — chạm để xem và trả lời.</div></div></div>
 <div class="tb" style="margin-top:10px;opacity:.9"><img src="/assets/logo.png" alt=""><div style="flex:1;min-width:0"><div class="a"><span>AIIGROW</span><span>07:07</span></div><div class="t">Bảo Anh nộp «Rửa chén sau bữa tối»</div><div class="p">+10 điểm · chờ Ba Mẹ duyệt</div></div></div></div>`, CSS);

const CHO_DUYET = BM_CHO_DUYET;

const CANH_BAO = screen(`<div class="cuon d">${hd('Trang chủ', 'Cảnh báo')}
 ${rob(HONG, 'Tuần này Bill đã được 6 ngoại lệ', 'Cảnh báo không chặn quyết định của Ba Mẹ — chỉ để cả nhà cùng nhìn số.', 'trong-loi')}
 <div class="tn">Rob gợi ý — Ba Mẹ chọn</div>
 <section class="the"><div style="font:700 16px Inter">Tăng điểm nhiệm vụ Con hay làm</div><div class="mot2" style="margin:4px 0 10px">Con hết điểm nhanh thì dễ xin ngoại lệ. Tăng điểm một nhiệm vụ để Con tự kiếm thêm.</div><div class="hang"><button class="nut nho" style="flex:1">Sửa điểm nhiệm vụ</button><button class="nut vien nho">Bỏ qua</button></div></section>
 <div class="tn">An toàn thiết bị</div>
 <section class="the ds" style="padding:4px 16px"><div class="dong"><div class="bt cam">${I('canh_bao')}</div><div class="chu"><div class="ten">Có dấu hiệu đổi giờ hệ thống trên Laptop-BILL</div><div class="phu">Bill · 06:59</div></div><span class="nhan nc">Chú ý</span></div></section></div>`, '.the{padding:14px 16px}');

const CANH_BAO_CT = screen(`<div class="cuon n">${hd('Cảnh báo', 'Cảnh báo')}
 ${rob(HONG, 'Giờ máy của Bill bị đổi', 'Lệch 61 phút lúc 06:59. Trò chơi đã tự khoá.', 'trong-loi')}
 <section class="the"><div class="mot2" style="margin-bottom:6px">Có dấu hiệu đổi giờ hệ thống trên Laptop-BILL của Bill</div>
  <div class="tk"><i class="x">!</i>06:59 · giờ máy lệch 61 phút so với máy chủ</div><div class="tk"><i>✓</i>AiiGrow khoá trò chơi, chỉ còn app học</div><div class="tk"><i>✓</i>Bill thấy «Giờ máy không đúng, hãy nhờ Ba Mẹ»</div></section></div>
 ${day(`<button class="nut rong">Mở khoá sau khi nói chuyện với Bill</button><button class="nut vien rong">Trừ điểm · ghi lý do</button><div class="s16 b nhan-xanh" style="text-align:center;min-height:36px;line-height:36px">Đã xem</div>`)}`);

const THEM_GIO = screen(`<div class="cuon n">${hd('Chờ duyệt', 'Yêu cầu của Bill')}
 ${rob(XANH, 'Bill xin thêm 15 phút', '“Con đang xây dở nhà” · gửi lúc 07:16.', 'cho')}
 ${oc('xu', 'vang', 'Trừ 15 điểm của Bill', 'Bill còn 32 → 17 điểm · không tính ngoại lệ', false)}${oc('qua', 'cam', 'Ngoại lệ — không trừ điểm', 'Ghi nhận là ngoại lệ', true)}
 <div class="cb">${I('canh_bao')}<div><b>Ngoại lệ thứ 4 tuần này của Bill</b><span>Các lần trước: Mẹ Lan 2, Ba Huy 1. Thử «Trừ điểm» lần này?</span></div></div>
 <div class="lbl">Thời lượng</div>${seg(['15 phút', '30 phút', '60 phút'], 0)}</div>
 ${day(`<button class="nut rong">Vẫn cho · ngoại lệ 15 phút</button><div class="hang"><button class="nut vien">Đổi sang trừ 15 điểm</button><button class="nut vien" style="color:var(--loi);flex:.6">Từ chối</button></div>`)}`);

const DUYET_NV_BODY = (ten, ai, nop) => `<div class="cuon n">${hd('Chờ duyệt', 'Duyệt nhiệm vụ')}
 <div class="hang" style="align-items:flex-start"><span class="avt" style="background:#c2410c;width:48px;height:48px;font-size:18px">A</span><div style="min-width:0"><div style="font:800 20px/24px Inter">${ten}</div><div class="mot2">${ai} nộp ${nop} · làm trong 14 phút · lần 2/3 hôm nay</div></div></div>
 <section class="the" style="padding:0;overflow:hidden"><div class="ph"></div><div style="padding:12px 16px"><div class="mot2 b" style="font-weight:600">Chụp lúc 07:06 · trong app</div><span class="nhan nk" style="margin-top:8px">✓ Không trùng ảnh cũ</span></div></section>
 <section class="the hang"><div style="flex:1"><div style="font:700 16px Inter">Điểm thưởng</div><div class="mot2">Mặc định của nhiệm vụ: 10</div></div><div class="stp"><div class="bt xam">${P.trai}</div><div class="so">10</div><div class="bt xam">${P.cong}</div></div></section></div>
 ${day(`<button class="nut rong">${I('tick')}Duyệt · +10 điểm cho Bảo Anh</button><div class="hang"><button class="nut vien">Cần chụp lại</button><button class="nut vien" style="color:var(--loi)">Từ chối</button></div>`)}`;
const DUYET = screen(DUYET_NV_BODY('Rửa chén sau bữa tối', 'Bảo Anh', '07:07'));

const DUYET_XONG = screen(`<div class="cuon n" style="top:20px">
 ${rob(XANH, '+10 điểm cho Ken!', 'Ken vừa thấy lời khen “Giỏi lắm!”.', 'xong')}
 <section class="the ds" style="padding:4px 16px">${dong('xu', 'vang', 'Ví của Ken', '145 → 155 điểm', '<span class="nhan nd">155</span>')}${dong('lich', 'lam', 'Nhật ký', 'Rửa chén – +10 điểm – duyệt 08:42')}</section>
 <div class="tn">Còn chờ</div>
 <section class="the ds" style="padding:4px 16px">${dong('sao', 'xanh', 'Đọc sách “Dế Mèn phiêu lưu ký” 50 trang', 'Bảo Anh · 06:44', '<span class="nhan nd">+10</span>')}${dong('sao', 'xanh', 'Tập thể dục 30 phút', 'Bảo Anh · 06:19', '<span class="nhan nd">+10</span>')}</section></div>
 <div class="toast"><span class="bt xanh" style="width:36px;height:36px">${I('tick')}</span>Đã cộng 10 điểm cho Ken<b>Hoàn tác</b></div>${day('<button class="nut rong">Về hộp chờ duyệt</button>')}`, '.cuon.n{top:0}');

const TRONG = screen(`<div class="cuon"><h1 class="tieuLon" style="margin-top:6px">Chờ duyệt</h1>${chipCon(0)}
 <div class="canh-rob" style="min-height:300px;background:${XANH};display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px"><img src="/assets/rob/nghi.webp" alt="" style="width:170px;height:170px;object-fit:contain"><div style="font:800 22px Inter">Không có việc nào chờ</div><div class="mot2" style="max-width:260px">Khi Con nộp nhiệm vụ hoặc xin phép, Rob báo Ba Mẹ ngay.</div></div>
 <button class="nut rong">${P.cong}Giao một nhiệm vụ</button></div>${tab(1, 0)}`, '.canh-rob{padding:14px}');

const MAT_MANG = screen(`<div class="cuon n">${hd('Chờ duyệt', 'Duyệt nhiệm vụ')}
 <div class="canh-rob" style="min-height:230px;background:linear-gradient(180deg,#eceae4,#dedbd2);display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding-top:12px"><img src="/assets/rob/ngu.webp" alt="" style="width:130px;height:130px;object-fit:contain"><div style="font:800 20px Inter">Chưa duyệt được</div><div class="mot2" style="max-width:270px">Mất kết nối mạng. Điểm chưa được cộng — Con chưa bị báo gì.</div></div>
 <div class="cb">${I('wifi')}<div><b>Không gửi được lệnh duyệt</b><span>Kiểm tra Wi-Fi hoặc 4G rồi bấm «Thử lại». Việc này vẫn nằm trong Chờ duyệt.</span></div></div></div>
 ${day(`<button class="nut rong">Thử lại</button><button class="nut vien rong">Về hộp chờ duyệt</button>`)}`);

// ---------- Hành trình 2: Nhiệm vụ & phần quà ----------
const GIAO_NV = screen(`<div class="cuon n">${hd('Quay lại', 'Giao nhiệm vụ')}
 ${rob(XANH, 'Giao việc cho Bảo Anh', 'Con nhận thông báo và thấy việc ở khay của máy tính, kèm hạn và số điểm.', 'so-tay')}
 <div class="lbl">Việc cần làm</div><div class="nhap" style="background:var(--the)">Dọn tủ sách</div>
 <div class="lbl">Lời nhắn cho Con (không bắt buộc)</div><div class="nhap" style="background:var(--the)">Xếp sách theo cỡ, chụp trước và sau</div>
 ${seg(['Một lần', 'Hằng ngày', 'Thử thách'], 0)}
 <div class="hang" style="align-items:flex-start"><div style="flex:1"><div class="lbl">Điểm</div><div class="nhap" style="background:var(--the);margin-top:6px">20</div></div><div style="flex:1"><div class="lbl">Hạn (ngày/tháng)</div><div class="nhap" style="background:var(--the);margin-top:6px">27/10</div></div></div></div>
 ${day('<button class="nut rong">Giao cho Bảo Anh · 20 điểm</button>')}`);

const DUYET_NV2 = screen(DUYET_NV_BODY('Dọn tủ sách', 'Bảo Anh', '16:40').replace('lần 2/3 hôm nay', 'lần 1/1').replace('<b>', '<b>'));

const LOI_KHEN = screen(`<div class="cuon n">${hd('Trang chủ', 'Lời khen')}
 ${rob(VANG, 'Khen Bảo Anh một câu?', 'Con thấy ngay trên máy, kèm hiệu ứng ăn mừng.', 'sao')}
 <div class="hang" style="gap:8px;flex-wrap:wrap">${['Ba Mẹ tự hào về con!', 'Cảm ơn con đã giúp nhà mình', 'Đọc sách giỏi quá', 'Mai cố tiếp nhé'].map((t, i) => `<div class="chip ${i === 0 ? 'dang' : ''}" style="padding:0 16px;min-height:44px;${i === 0 ? 'background:var(--chinh)' : ''}">${t}</div>`).join('')}</div>
 <div class="lbl">Lời khen</div><div class="nhap" style="background:var(--the);min-height:84px;color:var(--chu)">Ba Mẹ tự hào về con!</div>
 <p class="mot2">Tin ngắn, không phải chat tự do. Bảo Anh trả lời bằng biểu tượng cảm xúc. Chỉ gia đình xem.</p></div>
 ${day(`<button class="nut rong">${I('gui')}Gửi cho Bảo Anh</button>`)}`);

const VI = screen(`<div class="cuon d">${hd('Trang chủ', 'Ví của Bảo Anh', '<span class="nhan nk" style="margin-left:-60px">± Điều chỉnh</span>')}
 ${rob(VANG, 'Bảo Anh có 155 điểm', '30 điểm đang chờ duyệt · cấp 4.', 'canh-diem', '<span class="nhan nd" style="margin-top:8px">Chuỗi 6 ngày</span>')}
 <div class="hang"><section class="the" style="flex:1"><div class="mot2">Tuần này kiếm</div><div style="font:800 28px Inter">+45</div></section><section class="the" style="flex:1"><div class="mot2">Tuần này tiêu</div><div style="font:800 28px Inter">−25</div></section></div>
 <section class="the ds" style="padding:4px 16px">${dong('lua', 'vang', 'Giữ chuỗi ngày', 'Con nghỉ 21/10 vẫn không đứt chuỗi · 1 lần mỗi tuần', '<span class="nhan nk">Giữ</span>')}</section>
 <div class="tn">Lịch sử</div>
 <section class="the ds" style="padding:4px 16px">${dong('sao', 'xanh', 'Nhiệm vụ Rửa chén sau bữa tối', '07:18', '<b class="nhan-xanh s20">+10</b>')}${dong('sao', 'xanh', 'Nhiệm vụ Học 1 bài với AiiRob', '05:59', '<b class="nhan-xanh s20">+20</b>')}</section></div>`, '.ds .ten{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}');

const TRAO_QUA = screen(`<div class="cuon" style="bottom:92px"><h1 class="tieuLon" style="margin-top:6px">Nhiệm vụ & quà</h1>${chipCon(0)}
 <div class="canh-rob" style="min-height:96px;background:${XANH};padding:14px 16px"><div class="bong" style="width:72%;padding:12px 14px"><div class="lon" style="font-size:17px;line-height:21px">Phiếu chờ trao (1)</div><div class="phu" style="font-size:13px;line-height:17px">Con đã đổi điểm, chờ Ba Mẹ trao quà. Huỷ thì hoàn điểm cho Con.</div></div><img class="rob" src="/assets/rob/qua.webp" alt="" style="width:92px;height:106px"></div>
 <section class="the"><div class="hang">${'<div class="bt vang">' + I('game') + '</div>'}<div style="flex:1;min-width:0"><div class="mot" style="font:700 16px Inter">Bảo Anh · Thêm 30 phút Minecraft</div><div class="mot2">120 điểm · đổi 08:30</div></div></div>
  <div class="hang" style="margin-top:12px"><button class="nut nho" style="flex:1">Đã trao</button><button class="nut vien nho" style="flex:1">Huỷ</button></div></section>
 <section class="the ds" style="padding:4px 16px">${dong('sach', 'xanh', 'Đọc 20 trang sách', 'Hằng ngày', '<span class="nhan nd">+30</span>')}${dong('chay', 'lam', 'Tập thể dục 30 phút', 'T2–T6', '<span class="nhan nd">+10</span>')}</section></div>${tab(2, 3)}`);

const NV_TRONG = screen(`<div class="cuon" style="bottom:92px"><div class="tieu" style="margin-top:6px"><h1 class="tieuLon">Nhiệm vụ & quà</h1></div>${chipCon(1)}
 <div class="canh-rob" style="min-height:300px;background:${XANH};display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding-top:16px"><img src="/assets/rob/canh-trong.webp" alt="" style="width:170px;height:170px;object-fit:contain"><div style="font:800 22px Inter">Chưa có nhiệm vụ nào</div><div class="mot2" style="max-width:260px">Chọn mẫu theo tuổi, có sẵn 8–10 nhiệm vụ.</div><button class="nut" style="margin-top:8px">Dùng mẫu nhiệm vụ</button></div></div>
 ${tab(2, 0)}`);

export default [
  { id: 'bm-duyet', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Duyệt yêu cầu', mo: 'Thông báo đẩy báo có việc chờ, Ba Mẹ vào Chờ duyệt, xem cảnh báo, xử lý xin thêm giờ và duyệt nhiệm vụ của con.',
    buoc: [
      man('duyet-thong-bao', 'Thông báo đẩy', THONG_BAO, 'sau-bm-thong-bao.png', 'Chạm thông báo'),
      man('duyet-cho-duyet', 'Chờ duyệt', CHO_DUYET, 'ss-bm-cho-duyet.jpg', 'Bấm chuông Cảnh báo'),
      man('duyet-canh-bao', 'Cảnh báo', CANH_BAO, 'sau-bm-canh-bao.png', 'Chạm cảnh báo giờ máy'),
      man('duyet-canh-bao-chi-tiet', 'Chi tiết cảnh báo', CANH_BAO_CT, 'sau-bm-canh-bao-chi-tiet.png', 'Về Chờ duyệt, mở yêu cầu của Bill'),
      man('duyet-them-gio', 'Yêu cầu thêm giờ', THEM_GIO, 'sau-bm-yeu-cau-them-gio.png', 'Bấm «Vẫn cho», rồi mở nhiệm vụ nộp'),
      man('duyet-nhiem-vu', 'Duyệt nhiệm vụ', DUYET, 'sau-bm-duyet-nv.png', 'Bấm «Duyệt»'),
      man('duyet-xong', 'Duyệt xong', DUYET_XONG, 'sau-bm-duyet-xong.png', 'Nhánh: hộp chờ trống'),
      man('duyet-trong', 'Nhánh: không còn việc chờ', TRONG, null, 'Nhánh: mất mạng khi duyệt'),
      man('duyet-mat-mang', 'Nhánh: mất mạng khi duyệt', MAT_MANG),
    ] },
  { id: 'bm-nhiem-vu', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Nhiệm vụ & phần quà', mo: 'Ba Mẹ giao nhiệm vụ, duyệt bài con nộp, khen, xem ví điểm và trao quà con đã đổi.',
    buoc: [
      man('nv-qua', 'Nhiệm vụ & quà', BM_NHIEM_VU, 'sau-bm-nhiem-vu-qua.png', 'Bấm «Giao»'),
      man('nv-giao', 'Giao nhiệm vụ', GIAO_NV, 'sau-bm-giao-nv.png', 'Bấm «Giao cho Bảo Anh»; con nộp bài'),
      man('nv-duyet', 'Duyệt nhiệm vụ con nộp', DUYET_NV2, 'sau-bm-duyet-nv.png', 'Bấm «Duyệt», chọn lời khen'),
      man('nv-loi-khen', 'Lời khen', LOI_KHEN, 'sau-bm-loi-khen.png', 'Bấm «Gửi», xem ví'),
      man('nv-vi', 'Ví điểm', VI, 'sau-bm-vi.png', 'Con đổi quà; mở Nhiệm vụ & quà'),
      man('nv-trao-qua', 'Trao quà con đã đổi', TRAO_QUA, null, 'Nhánh: nhà chưa có nhiệm vụ'),
      man('nv-trong', 'Nhánh: chưa có nhiệm vụ', NV_TRONG),
    ] },
].map((h) => ({ ...h, buoc: h.buoc.map((b) => ({ nen: 'iPhone', ...b })) }));
