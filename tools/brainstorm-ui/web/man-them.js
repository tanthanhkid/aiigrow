// «Thêm màn» — màn thêm trên bàn (không nằm trong mã): siêu dữ liệu + thứ tự hành trình lưu ở kho phiên bản (phien-ban/man-them.json),
// nội dung là phiên bản v1, v2… như mọi màn (Thay màn, Lịch sử, biến thể, dùng chung, xoá mềm dùng chung đường cũ).
// Dùng CHUNG cho trình duyệt (app.js) và máy chủ (ung-dung.mjs, mcp.mjs) — không phụ thuộc DOM.
//   kho = { man: { <key>: { key, ht, ten, w, h, t, tao } }, thuTu: { <id hành trình>: [key…] } }
//   thuTu[ht] có thì là thứ tự đầy đủ (màn trong mã + màn thêm) do người dùng đặt; màn trong mã mới thêm sau đó tự chèn sau màn đứng trước nó trong mã.
export const KEY_THEM = /^them-[a-z0-9]{6,24}$/;
export const KHO_RONG = () => ({ man: {}, thuTu: {} });

// chuẩn hoá kho đọc từ tệp (bỏ mục hỏng); tệp hỏng hẳn ⇒ ném lỗi (máy chủ không ghi đè)
export function chuanKho(j) {
  if (!j || typeof j !== 'object' || typeof j.man !== 'object' || Array.isArray(j.man)) throw new Error('man-them.json hỏng');
  const man = {};
  for (const [k, m] of Object.entries(j.man)) {
    if (!KEY_THEM.test(k) || !m || typeof m !== 'object' || typeof m.ht !== 'string') continue;
    const w = Math.round(Number(m.w)), h = Math.round(Number(m.h));
    man[k] = { ...m, key: k, ten: String(m.ten || k).slice(0, 80), w: w > 0 && w < 5000 ? w : 390, h: h > 0 && h < 20000 ? h : 844 };
  }
  const thuTu = {};
  for (const [ht, ds] of Object.entries(j.thuTu && typeof j.thuTu === 'object' ? j.thuTu : {})) if (Array.isArray(ds)) thuTu[ht] = ds.filter((k) => typeof k === 'string');
  return { man, thuTu };
}

// thứ tự đầy đủ của một hành trình: maKeys = key màn trong mã (theo mã), kho = màn thêm
export function thuTuHt(maKeys, ht, kho) {
  const them = Object.values(kho?.man || {}).filter((m) => m.ht === ht).sort((a, b) => String(a.t || '').localeCompare(String(b.t || ''))).map((m) => m.key);
  const co = new Set([...maKeys, ...them]);
  const ra = [...new Set((kho?.thuTu?.[ht] || []).filter((k) => co.has(k)))];
  maKeys.forEach((k, i) => { if (!ra.includes(k)) ra.splice(i ? ra.indexOf(maKeys[i - 1]) + 1 : 0, 0, k); }); // màn trong mã chưa có trong thứ tự đã lưu
  for (const k of them) if (!ra.includes(k)) ra.push(k);
  return ra;
}

// HTML «khung trống»: tiêu đề màn giữa khung (bản v0 của màn thêm — không có bản trong mã)
const thoat = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function khungTrong(ten) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/assets/clay-kit.css">
<style>html,body{margin:0;height:100%}.khung-trong{box-sizing:border-box;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px;text-align:center;background:#f7f6f3;color:#1d2321;font-family:Inter,system-ui,sans-serif}
.khung-trong h1{margin:0;font:800 30px/36px Inter,system-ui,sans-serif}.khung-trong p{margin:0;font:500 15px/21px Inter,system-ui,sans-serif;color:#6b716e}</style></head>
<body><div class="khung-trong"><h1>${thoat(ten)}</h1><p>Màn mới — chưa có nội dung</p></div></body></html>`;
}

// ghép màn thêm vào danh sách hành trình (kết quả taiHanhTrinh): trả bản sao, KHÔNG sửa ds.
// Mỗi bước trong mã có thêm ke0 = key màn kế THEO MÃ (nút gắn theo nhãn bước «toi» luôn trỏ màn này, kể cả khi có màn thêm chen giữa);
// màn thêm: { key, ten, w, h, html: khungTrong, them: true, toi: '' }.
export function ghepManThem(ds, kho) {
  return ds.map((h) => {
    const ma = h.buoc.map((b, i) => ({ ...b, ke0: h.buoc[i + 1]?.key || '' }));
    const theoKey = new Map(ma.map((b) => [b.key, b]));
    const buoc = thuTuHt(ma.map((b) => b.key), h.id, kho).map((k) => {
      if (theoKey.has(k)) return theoKey.get(k);
      const m = kho.man[k];
      return { key: k, ten: m.ten, w: m.w, h: m.h, html: khungTrong(m.ten), nen: h.nen, them: true, toi: '', ke0: '' };
    });
    return { ...h, buoc };
  });
}

// vị trí chèn → chỉ số trong thứ tự hiện tại: sau = '' (đầu) | null/undefined (cuối) | key (ngay sau màn đó). Không hợp lệ ⇒ -1.
export function chiSoChen(thuTu, sau) {
  if (sau == null) return thuTu.length;
  if (sau === '') return 0;
  const i = thuTu.indexOf(sau);
  return i < 0 ? -1 : i + 1;
}
