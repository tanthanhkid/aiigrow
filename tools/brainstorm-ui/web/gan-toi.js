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
const chuCua = (el) => (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
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
