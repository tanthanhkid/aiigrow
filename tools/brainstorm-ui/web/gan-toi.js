// Gắn data-toi lên nút dẫn sang màn kế (theo chữ trong «…» của nhãn hành động). Dùng chung cho bàn (app.js) và MCP (chạy trong Chrome headless của máy chủ).
export function ganToi(html, nhan, dich, tenDich) {
  if (/data-toi=/.test(html)) return html;
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
