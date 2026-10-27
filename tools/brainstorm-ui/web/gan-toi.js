// Gắn data-toi lên nút dẫn sang màn kế (theo chữ trong «…» của nhãn hành động). Dùng chung cho bàn (app.js) và MCP (chạy trong Chrome headless của máy chủ).
export function ganToi(html, nhan, dich, tenDich) {
  if (/data-toi=|data-lk-sua/.test(html)) return html; // data-lk-sua: liên kết đã sửa tay (kể cả gỡ hết) — không tự gắn lại
  // các cụm thử lần lượt: chữ trong «…», nhãn bỏ động từ đầu, tên màn đích
  const thu = [...nhan.matchAll(/«([^»]+)»/g)].map((m) => m[1]);
  thu.push(nhan.replace(/^(.*,\s*)?(Bấm|Chạm|Chọn|Nhấn|Mở|Sang|Vào|Về|Xem)\s+/i, ''), tenDich || '');
  const d = new DOMParser().parseFromString(html, 'text/html');
  const tatCa = [...d.body.querySelectorAll('*')].map((el) => [el, (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()]);
  for (const c of thu) {
    const chu = c.trim().toLowerCase(); if (chu.length < 2) continue;
    let tot = null, dai = Infinity;
    for (const [el, t] of tatCa) if (t.includes(chu) && t.length <= dai) { tot = el; dai = t.length; }
    if (!tot) continue;
    const bam = tot.closest('button,a,.nut,.chip,.o,.viec,.dong,.the,.bt,[role=button]');
    const el = bam && (bam.textContent || '').length < 160 ? bam : tot;
    el.setAttribute('data-toi', dich);
    return '<!doctype html>\n' + d.documentElement.outerHTML;
  }
  return html;
}

// ---- Sửa liên kết (bàn web + MCP): «phần tử» = vị trí trong d.body.querySelectorAll('*') của HTML (ổn định với cùng một HTML) ----
const BAM_DUOC = 'button,a,[role=button],.nut,.chip,.o,.viec,.dong,.the,.bt,[data-toi]';
const chuCua = (el) => ((el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
// → [{ i, the, chu, toi }]: mọi phần tử đang có data-toi + (tatCa) các phần tử bấm được khác (bỏ khối bọc có nút con)
export function dsLienKet(html, tatCa = false) {
  const d = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const ds = [...d.body.querySelectorAll('*')]; const ra = [];
  ds.forEach((el, i) => {
    const toi = el.getAttribute('data-toi');
    if (toi == null) {
      if (!tatCa || !el.matches(BAM_DUOC) || el.querySelector('button,a,[role=button],[data-toi]') || el.closest('[data-toi]')) return;
      const chu = chuCua(el); if (!chu || chu.length > 120) return;
      ra.push({ i, the: el.tagName.toLowerCase(), chu: chu.slice(0, 60), toi: '' });
    } else ra.push({ i, the: el.tagName.toLowerCase(), chu: chuCua(el).slice(0, 60), toi });
  });
  return ra;
}
// đặt (toi = key) hoặc gỡ (toi = '') liên kết của phần tử i; kiemChu: chữ phần tử phải khớp (chống sửa nhầm khi HTML vừa đổi). Trả HTML mới hoặc '' nếu không thấy.
export function datLienKet(html, i, toi, kiemChu = null) {
  const d = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const el = d.body.querySelectorAll('*')[i];
  if (!el || (kiemChu != null && chuCua(el).slice(0, 60) !== kiemChu)) return '';
  if (toi) el.setAttribute('data-toi', toi); else el.removeAttribute('data-toi');
  d.body.setAttribute('data-lk-sua', '');
  return '<!doctype html>\n' + d.documentElement.outerHTML;
}

// ---- Màn dùng chung: nội dung chung một bản cho nhiều luồng, còn «lớp liên kết» (data-toi) lưu riêng từng luồng và áp lên lúc hiển thị ----
// lop = { tuDong: true } (gắn theo nhãn bước như màn thường) | { ds: [{ the, chu, n, o, toi }] }:
//   the + chu + n: thẻ, chữ (60 ký tự) và thứ tự trong các phần tử cùng thẻ + chữ; o: thứ tự trong các phần tử bấm được (dự phòng khi chữ nút đổi).
const BAM_O = 'button,a,[role=button],.nut,.chip,.o,.viec,.dong,.the,.bt';
function moTa(d) {
  const dem = new Map(); const bam = [];
  const info = [...d.body.querySelectorAll('*')].map((el) => {
    const the = el.tagName.toLowerCase(); const chu = chuCua(el).slice(0, 60); const k = `${the}\u0000${chu}`;
    const n = dem.get(k) || 0; dem.set(k, n + 1);
    let o = -1; if (el.matches(BAM_O)) { o = bam.length; bam.push(el); }
    return { el, the, chu, n, o };
  });
  return { info, bam };
}
// lớp liên kết của một HTML đang hiển thị (đã gắn data-toi). HTML không có data-toi và chưa sửa tay ⇒ tự gắn theo nhãn bước.
export function layLop(html) {
  const s = String(html || '');
  if (!/data-toi=|data-lk-sua/.test(s)) return { tuDong: true };
  const d = new DOMParser().parseFromString(s, 'text/html');
  return { ds: moTa(d).info.filter((x) => x.el.getAttribute('data-toi')).slice(0, 200).map(({ el, the, chu, n, o }) => ({ the, chu, n, o, toi: el.getAttribute('data-toi') })) };
}
// áp lớp liên kết của MỘT luồng lên nội dung chung: gỡ mọi data-toi có sẵn (của luồng khác), đặt lại theo lớp. Nút không tìm thấy ⇒ đếm vào data-lk-mat.
export function apLop(html, lop) {
  const d = new DOMParser().parseFromString(String(html || ''), 'text/html');
  d.querySelectorAll('[data-toi]').forEach((el) => el.removeAttribute('data-toi'));
  d.body.removeAttribute('data-lk-sua'); d.body.removeAttribute('data-lk-mat');
  if (lop && !lop.tuDong) {
    const { info, bam } = moTa(d); let mat = 0;
    for (const L of Array.isArray(lop.ds) ? lop.ds : []) {
      if (!L || !L.toi) continue;
      const cung = info.filter((x) => x.the === L.the && x.chu === L.chu && !x.el.hasAttribute('data-toi'));
      let el = (cung.find((x) => x.n === L.n) || cung[0])?.el;
      if (!el && L.chu) el = info.find((x) => x.chu === L.chu && !x.el.hasAttribute('data-toi') && x.el.matches(BAM_O))?.el;
      if (!el && Number.isInteger(L.o) && L.o >= 0 && bam[L.o] && !bam[L.o].hasAttribute('data-toi')) el = bam[L.o];
      if (el) el.setAttribute('data-toi', L.toi); else mat++;
    }
    d.body.setAttribute('data-lk-sua', '');
    if (mat) d.body.setAttribute('data-lk-mat', String(mat));
  }
  return '<!doctype html>\n' + d.documentElement.outerHTML;
}

// Iframe màn có sandbox không script nên trình duyệt chặn thuộc tính autoplay (cờ «sandboxed automatic features»).
// Trang cha (cùng nguồn) gọi play() thay: video tắt tiếng phát một lần rồi dừng ở khung cuối (vd. intro màn Welcome); lỗi/thiếu tệp thì poster đứng yên.
export function phatVideo(d) {
  for (const v of d?.querySelectorAll?.('video[autoplay]') || []) { v.muted = true; try { v.play()?.catch?.(() => {}); } catch { /* bỏ qua */ } }
}
