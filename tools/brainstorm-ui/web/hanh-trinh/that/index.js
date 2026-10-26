// Gom các màn native dựng KHỚP ẢNH CHỤP THẬT (đo pixel, xem tools/brainstorm-ui/DO-KHOP.md mục Native).
// THAT[key] = { key, w, h, dsf?, html, anh } — dsf chỉ dùng khi đo (DPR của ảnh chụp); bàn brainstorm vẽ theo w×h CSS px — hành trình (con-may-tinh.js, con-dien-thoai.js, bm-1.js) thay html/w/h/anh theo key.
import winCai from './win-cai.js';
import winApp from './win-app.js';
import winHop from './win-hop.js';
import winKhoa from './win-khoa.js';
import winNho from './win-nho.js';
import macApp from './mac-app.js';
import macHop from './mac-hop.js';
import android from './android.js';
import webTai from './web-tai.js';

export const THAT = Object.fromEntries([...winCai, ...winApp, ...winHop, ...winKhoa, ...winNho, ...macApp, ...macHop, ...android, ...webTai].map((m) => [m.key, m]));

// b: bước hành trình; khoa: key trong THAT. Giữ key/ten/toi của bước, lấy w/h/html/anh của màn khớp ảnh thật.
export function khop(b, khoa) {
  const m = THAT[khoa];
  if (!m) { console.error('thiếu màn khớp ảnh thật: ' + khoa); return b; }   // giữ bước cũ, không làm rơi cả tệp hành trình
  return { ...b, w: m.w, h: m.h, html: m.html, anh: m.anh };
}
