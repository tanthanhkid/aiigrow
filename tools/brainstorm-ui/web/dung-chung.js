// Gợi ý «màn dùng chung»: dò các màn trùng/giống nhau giữa các hành trình (cùng tên hoặc nội dung gần giống, cùng cỡ khung).
// Thuần JS (không DOM) — chạy cả ở bàn web lẫn máy chủ (MCP). Chỉ GỢI Ý: gộp thật do chủ quản bấm.
const boDau = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
export const chuanTen = (t) => boDau(t).replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
export const vanBan = (html) => String(html || '').replace(/<(style|script|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ').replace(/&[a-z#0-9]+;/gi, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
function capChu(html) { // cặp từ liền nhau
  const w = vanBan(html).split(' ').filter(Boolean); const s = new Set();
  for (let i = 0; i < w.length - 1; i++) s.add(`${w[i]} ${w[i + 1]}`);
  if (w.length === 1) s.add(w[0]);
  return s;
}
function khungThe(html) { // bộ ba thẻ mở liên tiếp (bỏ data-toi / data-lk-*) — giống nhau về bố cục
  const t = (String(html || '').replace(/<(style|script|template)\b[\s\S]*?<\/\1>/gi, '').match(/<[a-z][^>]*>/gi) || [])
    .map((x) => x.replace(/\s+data-(toi|lk-sua|lk-mat)(="[^"]*")?/g, '').slice(0, 80));
  const s = new Set(); for (let i = 0; i < t.length - 2; i++) s.add(t[i] + t[i + 1] + t[i + 2]);
  return s;
}
const jac = (a, b) => { if (!a.size && !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };

// ds: [{ key, ten, lan, w, h, html, nhom?: id nhóm dùng chung đang có, xoa?: bool }]
// → [{ ds: [key…], diem: 0..1, lyDo }] — mỗi gợi ý ≥ 2 màn ở ≥ 2 hành trình, chưa cùng một nhóm
export function goiYDungChung(ds) {
  const M = ds.filter((m) => m && m.key && !m.xoa && m.html).map((m) => ({ ...m, t: capChu(m.html), g: khungThe(m.html), n: chuanTen(m.ten) }));
  const cha = new Map(M.map((m) => [m.key, m.key]));
  const goc = (k) => { while (cha.get(k) !== k) { cha.set(k, cha.get(cha.get(k))); k = cha.get(k); } return k; };
  const canh = [];
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
    const a = M[i], b = M[j];
    if (a.lan === b.lan || (a.nhom && a.nhom === b.nhom)) continue;
    if (Math.abs(a.w - b.w) > 8 || Math.abs(a.h - b.h) > 40) continue; // khác nền tảng / khác cỡ khung: không gộp
    const t = jac(a.t, b.t); const cungTen = !!a.n && a.n === b.n;
    if (t >= 0.85 || (cungTen && t >= 0.4) || (t >= 0.6 && jac(a.g, b.g) >= 0.9)) { canh.push({ a: a.key, b: b.key, t, cungTen }); cha.set(goc(a.key), goc(b.key)); }
  }
  const cum = new Map();
  for (const c of canh) { const g = goc(c.a); if (!cum.has(g)) cum.set(g, { keys: new Set(), canh: [] }); const x = cum.get(g); x.keys.add(c.a); x.keys.add(c.b); x.canh.push(c); }
  const thuTu = new Map(ds.map((m, i) => [m.key, i]));
  return [...cum.values()].map((x) => {
    const keys = [...x.keys].sort((p, q) => thuTu.get(p) - thuTu.get(q));
    const diem = Math.min(...x.canh.map((c) => c.t));
    const ten = x.canh.every((c) => c.cungTen) ? 'cùng tên' : '';
    return { ds: keys, diem: Math.round(diem * 100) / 100, lyDo: [ten, `nội dung giống ${Math.round(diem * 100)}%`].filter(Boolean).join(', ') };
  }).sort((p, q) => q.diem - p.diem || q.ds.length - p.ds.length);
}
