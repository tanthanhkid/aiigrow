// Luật «chỉn chu» đo bằng số cho các màn web của máy chủ (Thanh 25/10: app Clay «méo và ko chỉn chu» — «rà all màn hình»).
// Bổ sung cho 5 luật của mobile/scripts/giao-dien.mjs; pha-web.mjs --giao-dien chạy cả hai trên cùng màn.
//   LE-THE     khối đất sét (.the, .nhom, .o-so, .bao, lòng chảo bước, form đăng nhập…): nội dung cách mép trong ≥ 16px mỗi phía
//              (chữ đo theo từng dòng thật, không theo hộp phần tử). Phần tử nằm ngoài mép ⇒ CHAM-MEP.
//   CHONG      hai khối bấm được / khối đất sét không lồng nhau mà hộp chồng lên nhau (nút đè nút, nhãn đè viền thẻ, nút chồng bóng thẻ).
//   NOI-DE     phần tử nổi (fixed/sticky/absolute ngoài vùng cuộn) che một phần tử bấm được không thuộc nó.
//   VUNG-BAM   phần tử bấm được (nút, chip, ô nhập, liên kết đứng riêng) < 44×44 (WCAG 2.5.5 AAA / Apple HIG). Liên kết nằm trong câu chữ
//              là ngoại lệ của WCAG 2.5.8 — không xét.
//   CAT-CHU    chữ bị cắt: phần tử overflow ≠ visible có nội dung chữ dài hơn khung (scrollWidth/Height), hoặc text-overflow: ellipsis đang cắt.
export const DO_CC = String.raw`(() => {
  const L = [], daBao = new Set();
  const bao = (k, x) => { if (!daBao.has(k)) { daBao.add(k); L.push(x); } };
  const hien = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && cs.display !== 'none'; };
  const ten = e => { const c = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28); return (e.tagName.toLowerCase() + c + (t ? ' «' + t + '»' : '')).slice(0, 80); };
  const BAM = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=link],[role=switch],[role=checkbox]';
  const KHOI = '.the,.nhom,.o-so,.bao,ol.buoc>li,.dn form';
  const dongChu = node => { const rg = document.createRange(); rg.selectNodeContents(node); return [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1); };
  const r4 = r => [r.left, r.top, r.width, r.height].map(Math.round);
  // ---- LE-THE / CHAM-MEP
  for (const k of [...document.querySelectorAll(KHOI)].filter(hien)) {
    const q = k.getBoundingClientRect();
    const hop = [];
    const w = document.createTreeWalker(k, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode; const p = n.parentElement; if (!n.textContent.trim() || !p || !hien(p) || p.closest('.sr,[aria-hidden=true] .sr')) continue;
      for (const r of dongChu(n)) hop.push({ r, el: p, chu: n.textContent.trim().slice(0, 30) }); }
    for (const e of k.querySelectorAll('img,svg,input,select,textarea,button,a.nut,.nut,.chip,.bt,.nhan,.cong-tac,.o-nhap,code')) {
      if (!hien(e) || e.closest('.bt') && e.closest('.bt') !== e) continue; hop.push({ r: e.getBoundingClientRect(), el: e, chu: '' }); }
    // khối con cũng là khối (dòng của .nhom có lề riêng): lề của khối cha đo tới khối con, bỏ nội dung bên trong khối con
    const con = [...k.querySelectorAll(KHOI)].filter(c => c !== k && hien(c));
    let min = { trai: 1e9, phai: 1e9, tren: 1e9, duoi: 1e9 }, gan = {};
    const xet = (r, el, chu) => { const d = { trai: r.left - q.left, phai: q.right - r.right, tren: r.top - q.top, duoi: q.bottom - r.bottom };
      for (const s in d) if (d[s] < min[s]) { min[s] = d[s]; gan[s] = chu ? '«' + chu + '»' : ten(el); } };
    for (const h of hop) { if (con.some(c => c.contains(h.el))) continue; xet(h.r, h.el, h.chu); }
    for (const c of con) if (!con.some(c2 => c2 !== c && c2.contains(c))) xet(c.getBoundingClientRect(), c, '');
    // .nhom: khung 6px + dòng 14px — dòng là vùng bấm trải kín khung (list item Material 3); lề chữ = tới mép khối .nhom
    const ms = Object.entries(min).filter(([, v]) => v < 1e8);
    const thieu = ms.filter(([, v]) => v < 16 - 0.5);
    if (thieu.length) { const cham = thieu.some(([, v]) => v < 0.5);
      bao('le' + ten(k) + JSON.stringify(thieu.map(x => Math.round(x[1]))), { luat: cham ? 'CHAM-MEP' : 'LE-THE', khoi: ten(k), hop: r4(q),
        le: Object.fromEntries(ms.map(([s, v]) => [s, Math.round(v * 10) / 10])), thieu: thieu.map(([s]) => s + ' ' + gan[s]).join(' · ') }); }
  }
  // ---- CHONG: khối đất sét / bấm được đè nhau (không lồng nhau)
  const vat = [...document.querySelectorAll(KHOI + ',' + BAM + ',.nhan,.bt')].filter(hien)
    .filter(e => !(e.matches('a') && !e.matches('.nut,.chip,.dong,.o-so,.lui') && getComputedStyle(e).display === 'inline'));
  for (let i = 0; i < vat.length; i++) for (let j = i + 1; j < vat.length; j++) {
    const a = vat[i], b = vat[j]; if (a.contains(b) || b.contains(a)) continue;
    if (a.closest('label') && a.closest('label') === b.closest('label')) continue;
    const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
    const x = Math.min(p.right, q.right) - Math.max(p.left, q.left), y = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (x > 1.5 && y > 1.5) bao('ch' + ten(a) + ten(b), { luat: 'CHONG', a: ten(a), b: ten(b), giao: [Math.round(x), Math.round(y)] });
  }
  // ---- NOI-DE: phần tử nổi che vùng bấm
  const noi = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return (cs.position === 'fixed' || cs.position === 'sticky') && hien(e); });
  for (const n of noi) { const p = n.getBoundingClientRect();
    for (const b of [...document.querySelectorAll(BAM)].filter(hien)) { if (n.contains(b) || b.contains(n)) continue; const q = b.getBoundingClientRect();
      const x = Math.min(p.right, q.right) - Math.max(p.left, q.left), y = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (x > 2 && y > 2) bao('noi' + ten(n) + ten(b), { luat: 'NOI-DE', noi: ten(n), bam: ten(b), giao: [Math.round(x), Math.round(y)] }); } }
  // ---- VUNG-BAM ≥ 44
  for (const b of [...document.querySelectorAll(BAM)].filter(hien)) {
    if (b.matches('a') && !b.matches('.nut,.chip,.dong,.o-so,.lui,nav a') && getComputedStyle(b).display === 'inline') continue;   // liên kết trong câu: ngoại lệ WCAG 2.5.8
    if (b.closest('.o-nhap') && b.matches('input,select,textarea')) continue;   // ô nhập đo theo khung .o-nhap (cả khung là vùng chạm)
    const r = (b.closest('label') && b.matches('input[type=checkbox],input[type=radio]') ? b.closest('label') : b).getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) bao('vb' + ten(b), { luat: 'VUNG-BAM', el: ten(b), co: [Math.round(r.width), Math.round(r.height)] });
  }
  for (const o of [...document.querySelectorAll('.o-nhap')].filter(hien)) { const r = o.getBoundingClientRect(); if (r.height < 43.5) bao('vb' + ten(o), { luat: 'VUNG-BAM', el: ten(o), co: [Math.round(r.width), Math.round(r.height)] }); }
  // ---- CAT-CHU: dòng chữ thò ra ngoài khung cắt (overflow hidden/clip, không cuộn được) hoặc đang bị «…»
  for (const e of [...document.querySelectorAll('body *')].filter(hien)) { const cs = getComputedStyle(e);
    const catX = /(hidden|clip)/.test(cs.overflowX), catY = /(hidden|clip)/.test(cs.overflowY); if (!catX && !catY || e.matches('.sr')) continue;
    const q = e.getBoundingClientRect(); const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || !n.parentElement || !hien(n.parentElement) || n.parentElement.closest('.sr')) continue;
      const ra = dongChu(n).some(r => catX && (r.left < q.left - 1 || r.right > q.right + 1) || catY && (r.top < q.top - 1 || r.bottom > q.bottom + 1));
      const elip = cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
      if (ra || elip) { bao('cat' + ten(e), { luat: 'CAT-CHU', el: ten(e), chu: n.textContent.trim().slice(0, 30), khung: r4(q) }); break; } } }
  return L; })()`;
