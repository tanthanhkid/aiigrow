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

// ds: [{ key, ten, lan, w, h, html, goc?: HTML bản trong mã (v0), w0?/h0?: cỡ khung v0, nhom?: id nhóm dùng chung đang có, xoa?: bool }]
// goc: hai màn vốn là MỘT màn trong mã mà một bên đã sửa (chính trường hợp «sửa luồng này luồng kia không đổi») — vẫn gợi ý
// → [{ ds: [key…], diem: 0..1, lyDo }] — mỗi gợi ý ≥ 2 màn ở ≥ 2 hành trình, chưa cùng một nhóm
export function goiYDungChung(ds) {
  const v0 = new Map(); const v0Cua = (m) => { if (!v0.has(m.key)) v0.set(m.key, { t: capChu(m.goc), g: khungThe(m.goc) }); return v0.get(m.key); };
  const M = ds.filter((m) => m && m.key && !m.xoa && m.html).map((m) => ({ ...m, t: capChu(m.html), g: khungThe(m.html), n: chuanTen(m.ten), daSua: false }));
  // «đã sửa» = CHỮ khác bản trong mã (chỉ so chữ: lamSach đổi thẻ/thuộc tính, sửa liên kết chỉ đổi data-toi — đều không tính là sửa)
  const cungTap = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  for (const m of M) if (m.goc && m.goc !== m.html) m.daSua = !cungTap(v0Cua(m).t, m.t);
  const giong = (t, g, cungTen) => t >= 0.85 || (cungTen && t >= 0.4) || (t >= 0.6 && g() >= 0.9);
  const cha = new Map(M.map((m) => [m.key, m.key]));
  const goc = (k) => { while (cha.get(k) !== k) { cha.set(k, cha.get(cha.get(k))); k = cha.get(k); } return k; };
  const canh = [];
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
    const a = M[i], b = M[j];
    if (a.lan === b.lan || (a.nhom && a.nhom === b.nhom)) continue;
    const cungTen = !!a.n && a.n === b.n;
    if (Math.abs(a.w - b.w) <= 8 && Math.abs(a.h - b.h) <= 40) { // khác nền tảng / khác cỡ khung: không gộp
      const t = jac(a.t, b.t);
      if (giong(t, () => jac(a.g, b.g), cungTen)) { canh.push({ a: a.key, b: b.key, t, cungTen }); cha.set(goc(a.key), goc(b.key)); continue; }
    }
    // đúng MỘT bên đã sửa (hai bên cùng sửa = cố ý khác nhau, không gợi ý): so bản trong mã — cỡ khung hiện tại có thể đã đổi theo bản sửa
    if (a.daSua === b.daSua || !a.goc || !b.goc) continue;
    if (Math.abs((a.w0 ?? a.w) - (b.w0 ?? b.w)) > 8 || Math.abs((a.h0 ?? a.h) - (b.h0 ?? b.h)) > 40) continue; // cỡ khung bản trong mã
    const ga = v0Cua(a), gb = v0Cua(b); const t0 = jac(ga.t, gb.t);
    // ngưỡng chặt hơn trùng thường: nhãn khẳng định «vốn là một màn trong mã»
    if (t0 >= 0.85 || (cungTen && t0 >= 0.6)) { canh.push({ a: a.key, b: b.key, t: t0, cungTen, daLech: true }); cha.set(goc(a.key), goc(b.key)); }
  }
  const cum = new Map();
  for (const c of canh) { const g = goc(c.a); if (!cum.has(g)) cum.set(g, { keys: new Set(), canh: [] }); const x = cum.get(g); x.keys.add(c.a); x.keys.add(c.b); x.canh.push(c); }
  const thuTu = new Map(ds.map((m, i) => [m.key, i]));
  return [...cum.values()].map((x) => {
    const keys = [...x.keys].sort((p, q) => thuTu.get(p) - thuTu.get(q));
    const ten = x.canh.every((c) => c.cungTen) ? 'cùng tên' : '';
    const thuong = x.canh.filter((c) => !c.daLech); const lech = thuong.length < x.canh.length; const tatCaLech = !thuong.length;
    const diem = Math.min(...(tatCaLech ? x.canh : thuong).map((c) => c.t));
    return { ds: keys, diem: Math.round(diem * 100) / 100, daLech: lech, chiLech: tatCaLech,
      lyDo: [ten, tatCaLech ? `bản trong mã giống ${Math.round(diem * 100)}% — một bên đã sửa, bên kia chưa theo` : `nội dung giống ${Math.round(diem * 100)}%`, !tatCaLech && lech ? 'có màn đã sửa lệch' : ''].filter(Boolean).join(', ') };
  }).sort((p, q) => Number(p.chiLech) - Number(q.chiLech) || q.diem - p.diem || q.ds.length - p.ds.length); // trùng thật trước, cặp đã lệch sau
}
