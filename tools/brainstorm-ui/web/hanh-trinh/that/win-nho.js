// Màn nhỏ Windows dựng khớp ảnh thật man-win-2510/100: hộp cập nhật (AiiGrow.Setup/CapNhatSetup.cs · CapNhatForm, 586×289)
// và menu khay (AiiGrow.Tray/TrayContext.cs · ContextMenuStrip + ClayMenuRenderer, 335×172).
// Ảnh chụp hộp cập nhật lấy cả 1px nền desktop ở mép trái/trên ⇒ vẽ lại đúng như thế.
import { CSS_WIN, thanhTieuDe, nut, MAU, FONT_WIN } from './khung-win.js';

const trang = (body, w, h, css) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${CSS_WIN}${css}</style></head><body>${body}</body></html>`;

// ---------- Hộp cập nhật ----------
const CW = 586, CH = 289;
const CSS_CN = `
body{width:${CW}px;height:${CH}px;background:linear-gradient(180deg,#86a0b0 0,#869eae 60%,#52a89a 100%)}
.cn{position:absolute;left:1px;top:1px;width:${CW - 1}px;height:${CH - 1}px;background:${MAU.nen};border:solid #363636;border-width:0 1px 1px 0}
.cn .tb .ten{left:9px;top:6px}
.d{position:absolute;white-space:nowrap}
.h{left:36px;letter-spacing:.35px;font:700 21.33px/28px ${FONT_WIN};color:${MAU.chu}}
.p{left:36px;letter-spacing:-.06px;font:400 14.67px/20px ${FONT_WIN};color:${MAU.chu2}}
.cn .nut{font-size:14.67px}
.cn .nut.ngoc{background:radial-gradient(60% 40% at 50% 100%,rgba(140,175,165,.55),rgba(140,175,165,0) 100%),linear-gradient(180deg,#1a665a 0,#135448 70%,#0f4d42 100%)}
`;
const hop = (tieuDe, yH, dongs, nuts) => trang(`<div class="cn">${thanhTieuDe('AiiGrow', CW + 1, { coIcon: false, toiDaMo: true })}
  <div class="d h" style="top:${yH}px">${tieuDe}</div>
  ${dongs.map(([y, s]) => `<div class="d p" style="top:${y}px">${s}</div>`).join('')}
  ${nuts.map(([x, w, s, loai]) => nut(x, 217, w, s, loai)).join('')}</div>`, CW, CH, CSS_CN);

const CAP_NHAT = hop('Cập nhật AiiGrow lên bản 0.2.10', 60, [
  [101, 'Máy này đang chạy AiiGrow bản 0.2.9 → bản mới 0.2.10.'],
  [141, 'Cập nhật giữ nguyên ghép máy, tài khoản của Con và các luật Ba Mẹ đã đặt<br>— không phải ghép lại. Mất khoảng một phút; nếu có lỗi, AiiGrow tự quay về<br>bản cũ để máy vẫn được bảo vệ.'],
], [[36, 175, 'Cập nhật', 'ngoc'], [228, 145, 'Để sau', 'trang']]);

const MOI_NHAT = hop('AiiGrow đã là bản mới nhất', 60, [
  [101, 'Máy này đang chạy AiiGrow bản 0.2.10 (bộ cài này: 0.2.10). Không cần cập<br>nhật.'],
  [161, '«Mở lại AiiGrow» chạy lại dịch vụ và biểu tượng ở khay. «Sửa cài đặt» mở<br>trình cài đầy đủ (ghép lại, đổi tài khoản của Con).'],
], [[36, 175, 'Mở lại AiiGrow', 'ngoc'], [228, 145, 'Sửa cài đặt', 'trang'], [390, 145, 'Đóng', 'trang']]);

// ---------- Menu khay ----------
const KW = 335, KH = 172;
const CSS_KHAY = `
body{width:${KW}px;height:${KH}px;background:${MAU.the};border:1px solid #d0d0cb}
.m{position:absolute;left:41px;letter-spacing:-.05px;white-space:nowrap;font:400 14px/19px ${FONT_WIN};color:${MAU.chu}}
.m.mo{color:#6d6d6d}
.ic{position:absolute;left:5px;width:20px;height:20px}
.vach{position:absolute;left:37px;width:293px;height:1px;background:#e9e8e3}
`;
const muc = (y0, s, ic, mo, y = y0 + 1) => `${ic ? `<img class="ic" style="top:${y - 2}px" src="/assets/win/fluent/${ic}.png" alt="">` : ''}<button class="m${mo ? ' mo' : ''}" style="top:${y}px;border:0;background:none;padding:0">${s}</button>`;
const KHAY = trang(`${muc(6, 'Đã kết nối · đồng bộ lúc 04:27', '', true)}
  ${muc(31, 'Thử kết nối lại', 'link')}
  <div class="vach" style="top:56px"></div>
  ${muc(63, 'Mở AiiGrow', 'seedling')}
  ${muc(89, 'Xin thêm thời gian', 'hourglass_not_done')}
  ${muc(115, 'Xin mở trang hoặc app…', 'globe_with_meridians')}
  <div class="vach" style="top:140px"></div>
  ${muc(147, 'Máy này do bố mẹ quản lý bằng AiiGrow', '', true)}`, KW, KH, CSS_KHAY);

export default [
  { key: 'cap-nhat', w: CW, h: CH, html: CAP_NHAT, anh: 'man-win-2510/100/cap-nhat.png' },
  { key: 'cap-nhat-da-moi-nhat', w: CW, h: CH, html: MOI_NHAT, anh: 'man-win-2510/100/cap-nhat-da-moi-nhat.png' },
  { key: 'khay-menu', w: KW, h: KH, html: KHAY, anh: 'man-win-2510/100/khay-menu.png' },
];
