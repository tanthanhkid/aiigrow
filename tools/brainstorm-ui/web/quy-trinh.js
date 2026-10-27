// Chế độ «Quy trình»: sơ đồ kiểu BPMN lai giao diện — pool/lane theo vai, việc có giao diện mang ảnh thu nhỏ của màn thật.
// Một bộ vẽ SVG dùng chung cho màn hình (ảnh blob) và tệp xuất (ảnh data URL). Iframe sống chỉ gắn khi gần viewport và zoom ≥ 40%.
import QT, { LAN_QT } from './hanh-trinh/quy-trinh.js';

const GAP_X = 64, GAP_Y = 28, LE_POOL = 56, DAU_POOL = 54, GIUA_POOL = 150, LAN_MIN = 150, PAD_LAN = 30;
const TEN_LAN = Object.fromEntries(LAN_QT.map((l) => [l.id, l.ten]));
const MAU_LAN = { con: '#fbf7ee', may: '#f3f6f9', chu: '#f4f2f8', bm: '#eef6f3' };

const rongNhan = (t) => Math.min(260, String(t).length * 6.8 + 16); // ≈ 36 ký tự, khớp với chữ bẻ dòng bên dưới
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// bẻ dòng thô theo số ký tự (dùng chung cho màn hình và tệp xuất, không cần đo font)
function beDong(t, max = 22, toiDa = 3) {
  const tu = String(t || '').split(/\s+/); const dong = []; let d = '';
  for (const w of tu) { if ((d + ' ' + w).trim().length > max && d) { dong.push(d); d = w; } else d = (d + ' ' + w).trim(); }
  if (d) dong.push(d);
  if (dong.length > toiDa) { dong.length = toiDa; dong[toiDa - 1] = dong[toiDa - 1].replace(/.{0,2}$/, '…'); }
  return dong;
}
const chu = (x, y, t, { lop = '', max = 22, toiDa = 3, cao = 15 } = {}) =>
  `<text class="${lop}" x="${x}" y="${y}" text-anchor="middle">${beDong(t, max, toiDa).map((d, i) => `<tspan x="${x}" dy="${i ? cao : 0}">${esc(d)}</tspan>`).join('')}</text>`;

export function taoQuyTrinh(api) {
  const { MAN, timLan, vung, theGioi, chupAnh, anhNho, ghiAnhNho, loiChup, lkDo, moPlay, toast } = api;
  // mã băm theo key màn (HTML màn gốc ít đổi): tránh băm lại cả chuỗi mỗi lần vẽ
  const bamDem = new Map();
  const bam = (html) => { let v = bamDem.get(html); if (!v) { v = api.bam(html); if (bamDem.size > 500) bamDem.clear(); bamDem.set(html, v); } return v; };
  // chụp một ảnh thu nhỏ; dùng chung cho nền và tệp xuất, không chụp trùng; lỗi 2 lần thì thôi (như canvas)
  const dangBay = new Map();
  function chupMot(m) {
    const k = bam(m.html);
    if (anhNho.has(k)) return Promise.resolve(anhNho.get(k));
    if ((loiChup.get(k) || 0) >= 2) return Promise.resolve('');
    if (!dangBay.has(k)) {
      dangBay.set(k, chupAnh(m.html, { w: m.w, h: m.h }, { pixelRatio: 0.45, skipFonts: true, doLk: true })
        .then(({ blob, lk }) => { const u = URL.createObjectURL(blob); ghiAnhNho(k, u); if (lk && !lkDo.has(k)) lkDo.set(k, lk); return anhNho.get(k); }) // đo nút data-toi luôn để canvas có mũi tên
        .catch(() => { loiChup.set(k, (loiChup.get(k) || 0) + 1); return ''; })
        .finally(() => dangBay.delete(k)));
    }
    return dangBay.get(k);
  }
  const lop = document.createElement('div'); lop.id = 'qt-lop'; lop.hidden = true; theGioi.appendChild(lop);
  let ds = []; // pool đã bố trí của section đang mở
  const song = new Map(); // id việc → iframe sống

  // ---- dữ liệu: quy trình định nghĩa + sinh tự động từ chuỗi màn ----
  // bỏ nút màn không có / đã xoá khỏi hành trình; cạnh qua nút bị bỏ được nối thẳng (A→B→C bỏ B ⇒ A→C, giữ nhãn cạnh vào)
  function boManXoa(q) {
    const bo = new Set(q.nut.filter((x) => x.loai === 'man' && (!MAN[x.man] || MAN[x.man].xoa)).map((x) => x.id));
    if (!bo.size) return q;
    let noi = q.noi.slice();
    for (const r of bo) {
      const vao = noi.filter(([, b]) => b === r), ra = noi.filter(([a]) => a === r);
      noi = noi.filter(([a, b]) => a !== r && b !== r);
      for (const [a, , nhan] of vao) for (const [, b] of ra) if (a !== b && !noi.some(([x, y]) => x === a && y === b)) noi.push([a, b, nhan]);
    }
    return { ...q, nut: q.nut.filter((x) => !bo.has(x.id)), noi };
  }
  function quyTrinhCua(sec, lanCuaSec) {
    const bao = new Set(QT.flatMap((q) => q.hanh || []));
    const kq = QT.filter((q) => q.sec.includes(sec)).map((q) => boManXoa(q));
    for (const id of lanCuaSec) {
      if (bao.has(id)) continue;
      const q = tuChuoi(timLan(id)); if (q) kq.push(q);
    }
    return kq;
  }
  // quy trình tự sinh từ chuỗi màn của một hành trình
  function tuChuoi(l) {
    if (!l) return null;
    const lan = l.vai === 'Con' ? 'con' : 'bm';
    const buoc = l.buoc.filter((k) => MAN[k] && !MAN[k].xoa);
    // id theo thứ tự bước: một màn ghé hai lần vẫn là hai nút
    const nut = [{ id: 'bd', loai: 'bd', lan, ten: 'Bắt đầu' }, ...buoc.map((k, i) => ({ id: `${i}:${k}`, loai: 'man', lan, ten: MAN[k].ten, man: k })), { id: 'kt', loai: 'kt', lan, ten: 'Xong' }];
    const noi = []; let truoc = 'bd', keTruoc = '';
    buoc.forEach((k, i) => { noi.push([truoc, `${i}:${k}`, keTruoc && l.buoc[l.buoc.indexOf(keTruoc) + 1] === k ? MAN[keTruoc].toi || '' : '']); truoc = `${i}:${k}`; keTruoc = k; }); // nhãn chỉ khi đúng bước kế (bước giữa bị xoá ⇒ không nhãn)
    noi.push([truoc, 'kt', '']);
    return { id: `tu-${l.id}`, ten: `${l.ten} (tự sinh từ chuỗi màn)`, tuSinh: true, nut, noi };
  }

  // ---- bố trí: hạng theo đường dài nhất (bỏ cạnh lùi), cột theo hạng, lane theo vai ----
  function coNut(x) {
    if (x.loai === 'man') {
      const m = MAN[x.man]; const s = Math.min(180 / m.w, 300 / m.h);
      const tw = Math.round(m.w * s), th = Math.round(m.h * s);
      return { w: tw + 16, h: th + 16 + 40, tw, th, s };
    }
    if (x.loai === 'he') return { w: 168, h: 76 };
    if (x.loai === 'cong') return { w: 150, h: 104 };
    return { w: 124, h: 92 }; // sự kiện: vòng + nhãn dưới
  }
  function boTri(q) {
    const nut = new Map(q.nut.map((x) => [x.id, { ...x, ...coNut(x) }]));
    const canh = q.noi.filter(([a, b]) => nut.has(a) && nut.has(b) && a !== b).map(([a, b, nhan]) => ({ a, b, nhan }));
    const ra = new Map([...nut.keys()].map((k) => [k, []]));
    canh.forEach((c) => ra.get(c.a).push(c));
    // DFS đánh dấu cạnh lùi (vòng lặp) để không làm hạng đi ngược thời gian
    const tt = new Map(); const goc = [...nut.keys()].filter((k) => !canh.some((c) => c.b === k && c.a !== k));
    const di = (k) => { tt.set(k, 1); for (const c of ra.get(k)) { const s = tt.get(c.b); if (s === 1) c.lui = true; else if (!s) di(c.b); } tt.set(k, 2); };
    [...goc, ...nut.keys()].forEach((k) => { if (!tt.get(k)) di(k); });
    const hang = new Map([...nut.keys()].map((k) => [k, 0]));
    for (let vong = 0; vong < nut.size; vong++) {
      let doi = false;
      for (const c of canh) if (!c.lui && hang.get(c.b) < hang.get(c.a) + 1) { hang.set(c.b, hang.get(c.a) + 1); doi = true; }
      if (!doi) break;
    }
    const soHang = Math.max(0, ...hang.values()) + 1;
    const lanDung = LAN_QT.map((l) => l.id).filter((id) => [...nut.values()].some((x) => x.lan === id));
    // cột
    const rongCot = Array(soHang).fill(0);
    for (const [k, x] of nut) rongCot[hang.get(k)] = Math.max(rongCot[hang.get(k)], x.w);
    // khe giữa hai cột đủ chỗ cho nhãn cạnh dài nhất đi qua nó
    const khe = Array(soHang).fill(GAP_X);
    for (const c of canh) if (!c.lui && c.nhan) { const h = hang.get(c.a); khe[h] = Math.max(khe[h], rongNhan(c.nhan) + 28); }
    const xCot = []; let cx = LE_POOL + 40;
    for (let i = 0; i < soHang; i++) { xCot.push(cx); cx += rongCot[i] + khe[i]; }
    cx += GAP_X - khe[soHang - 1];
    // lane: các nút cùng hạng cùng lane xếp chồng
    const lan = []; let y = DAU_POOL;
    for (const id of lanDung) {
      const o = new Map();
      for (const [k, x] of nut) if (x.lan === id) { const h = hang.get(k); if (!o.has(h)) o.set(h, []); o.get(h).push(x); }
      const cao = Math.max(LAN_MIN, ...[...o.values()].map((g) => g.reduce((a, x) => a + x.h, 0) + GAP_Y * (g.length - 1) + PAD_LAN * 2));
      for (const [h, g] of o) {
        let yy = y + (cao - (g.reduce((a, x) => a + x.h, 0) + GAP_Y * (g.length - 1))) / 2;
        for (const x of g) { x.x = xCot[h] + (rongCot[h] - x.w) / 2; x.y = yy; yy += x.h + GAP_Y; }
      }
      lan.push({ id, y, cao }); y += cao;
    }
    return { q, nut, canh, lan, w: cx - GAP_X + 40, h: y };
  }

  // ---- vẽ SVG một pool (anh: key màn → href ảnh) ----
  const tamNut = (x) => {
    if (x.loai === 'man') return { cx: x.x + x.w / 2, cy: x.y + 8 + x.th / 2, l: x.x, r: x.x + x.w, t: x.y, b: x.y + x.th + 16 };
    if (x.loai === 'he') return { cx: x.x + x.w / 2, cy: x.y + x.h / 2, l: x.x, r: x.x + x.w, t: x.y, b: x.y + x.h };
    if (x.loai === 'cong') return { cx: x.x + x.w / 2, cy: x.y + 30 + 28, l: x.x + x.w / 2 - 28, r: x.x + x.w / 2 + 28, t: x.y + 30, b: x.y + 86 };
    return { cx: x.x + x.w / 2, cy: x.y + 20, l: x.x + x.w / 2 - 20, r: x.x + x.w / 2 + 20, t: x.y, b: x.y + 40 };
  };
  function svgPool(P, anh) {
    const { q, nut, canh, lan, w, h } = P;
    let s = '';
    // pool + lane
    s += `<rect class="qt-pool" x="0" y="${DAU_POOL}" width="${w}" height="${h - DAU_POOL}" rx="10"/>`;
    s += `<text class="qt-tieu-de" x="4" y="32">${esc(q.ten)}</text>`;
    for (const L of lan) {
      s += `<rect x="0" y="${L.y}" width="${w}" height="${L.cao}" fill="${MAU_LAN[L.id]}" class="qt-lan"/>`;
      s += `<line class="qt-vach" x1="${LE_POOL}" y1="${L.y}" x2="${LE_POOL}" y2="${L.y + L.cao}"/>`;
      s += `<text class="qt-ten-lan" transform="translate(${LE_POOL / 2 + 5},${L.y + L.cao / 2}) rotate(-90)" text-anchor="middle">${esc(TEN_LAN[L.id])}</text>`;
    }
    s += `<rect class="qt-vien" x="0" y="${DAU_POOL}" width="${w}" height="${h - DAU_POOL}" rx="10"/>`;
    // cạnh
    for (const c of canh) {
      const A = nut.get(c.a), B = nut.get(c.b); const a = tamNut(A), b = tamNut(B);
      const tin = A.lan !== B.lan; let d, mx, my;
      if (!c.lui && b.l > a.r) {
        const x1 = a.r, y1 = a.cy, x2 = b.l, y2 = b.cy, k = Math.max(30, (x2 - x1) / 2);
        d = `M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2},${y2}`; mx = (x1 + x2) / 2; my = (y1 + y2) / 2;
      } else {
        // cạnh lùi / cùng cột: vòng xuống dưới
        // đi từ đáy cả khối (dưới tên bước), vòng xuống dưới để không đè chữ
        const ya = A.y + A.h, yb = B.y + B.h, day = Math.max(ya, yb) + 46;
        d = `M${a.cx},${ya} C${a.cx},${day} ${b.cx},${day} ${b.cx},${yb}`; mx = (a.cx + b.cx) / 2; my = day - 10;
      }
      s += `<path class="qt-canh${tin ? ' tin' : ''}" d="${d}" marker-end="url(#${tin ? 'qt-mui-mo' : 'qt-mui'})"${tin ? ' marker-start="url(#qt-cham)"' : ''}/>`;
      if (c.nhan) s += `<g class="qt-nhan-canh"><rect x="${mx - rongNhan(c.nhan) / 2}" y="${my - 11}" width="${rongNhan(c.nhan)}" height="20" rx="10"/>${chu(mx, my + 4, c.nhan, { max: 36, toiDa: 1 })}</g>`;
    }
    // nút
    for (const x of nut.values()) {
      const t = tamNut(x);
      if (x.loai === 'man') {
        const m = MAN[x.man]; const href = anh(x.man);
        s += `<g class="qt-viec qt-man" data-man="${esc(x.man)}" data-id="${esc(x.id)}" role="button" tabindex="0"><title>${esc(m.ten)} — bấm để Play từ bước này</title>`;
        s += `<rect class="qt-hop" x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" rx="14"/>`;
        s += href ? `<image href="${esc(href)}" x="${x.x + 8}" y="${x.y + 8}" width="${x.tw}" height="${x.th}" preserveAspectRatio="xMidYMin slice"/>`
          : `<rect class="qt-xam" x="${x.x + 8}" y="${x.y + 8}" width="${x.tw}" height="${x.th}" rx="6"/>${chu(t.cx, x.y + 8 + x.th / 2, m.ten, { lop: 'qt-mo', max: 18 })}`;
        s += `<rect class="qt-khung-anh" x="${x.x + 8}" y="${x.y + 8}" width="${x.tw}" height="${x.th}" rx="6"/>`;
        s += chu(t.cx, x.y + x.th + 34, x.ten, { lop: 'qt-ten', max: 26, toiDa: 2 });
        s += '</g>';
      } else if (x.loai === 'he') {
        s += `<g class="qt-viec qt-he"><rect class="qt-hop he" x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" rx="14"/>${chu(t.cx, t.cy - 4 - (beDong(x.ten, 22).length - 1) * 7.5 + 4, x.ten, { lop: 'qt-ten' })}</g>`;
      } else if (x.loai === 'cong') {
        s += `<g class="qt-cong">${chu(t.cx, x.y + 12, x.ten, { lop: 'qt-ten', max: 24, toiDa: 2, cao: 14 })}<path d="M${t.cx},${t.t} L${t.r},${t.cy} L${t.cx},${t.b} L${t.l},${t.cy} Z"/><path class="x" d="M${t.cx - 9},${t.cy - 9} L${t.cx + 9},${t.cy + 9} M${t.cx + 9},${t.cy - 9} L${t.cx - 9},${t.cy + 9}"/></g>`;
      } else {
        const lopSk = { bd: 'bat-dau', kt: 'ket-thuc', gio: 'hen-gio', tin: 'tin' }[x.loai] || 'bat-dau';
        s += `<g class="qt-su-kien ${lopSk}"><circle cx="${t.cx}" cy="${t.cy}" r="20"/>`;
        if (x.loai === 'gio' || x.loai === 'tin') s += `<circle class="trong" cx="${t.cx}" cy="${t.cy}" r="16"/>`;
        if (x.loai === 'gio') s += `<circle class="ico" cx="${t.cx}" cy="${t.cy}" r="10"/><path class="ico" d="M${t.cx},${t.cy - 7} L${t.cx},${t.cy} L${t.cx + 5},${t.cy + 3}"/>`;
        if (x.loai === 'tin') s += `<rect class="ico" x="${t.cx - 10}" y="${t.cy - 7}" width="20" height="14" rx="1.5"/><path class="ico" d="M${t.cx - 10},${t.cy - 7} L${t.cx},${t.cy + 1} L${t.cx + 10},${t.cy - 7}"/>`;
        s += chu(t.cx, x.y + 58, x.ten, { lop: 'qt-ten nho', max: 18, toiDa: 2, cao: 14 }) + '</g>';
      }
    }
    return s;
  }
  const DEFS = `<defs><marker id="qt-mui" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#3d4a46"/></marker>
<marker id="qt-mui-mo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9 z" fill="#fff" stroke="#3d4a46" stroke-width="1.3"/></marker>
<marker id="qt-cham" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7"><circle cx="5" cy="5" r="3.6" fill="#fff" stroke="#3d4a46" stroke-width="1.3"/></marker></defs>`;
  const CSS_SVG = `.qt-pool{fill:#fff}.qt-vien{fill:none;stroke:#2e3a36;stroke-width:1.6}.qt-lan{stroke:#d9d7cf;stroke-width:1}.qt-vach{stroke:#2e3a36;stroke-width:1.2}
.qt-tieu-de{font:800 24px Inter,system-ui,sans-serif;fill:#1c2420}.qt-ten-lan{font:700 14px Inter,system-ui,sans-serif;fill:#3d4a46}
.qt-canh{fill:none;stroke:#3d4a46;stroke-width:1.8}.qt-canh.tin{stroke-dasharray:7 6;stroke:#5a6863}
.qt-nhan-canh rect{fill:#fff;stroke:#d9d7cf}.qt-nhan-canh text{font:600 11.5px Inter,system-ui,sans-serif;fill:#3d4a46}
.qt-hop{fill:#fff;stroke:#2e3a36;stroke-width:1.6}.qt-hop.he{fill:#f7f6f2}.qt-xam{fill:#ecebe6}.qt-khung-anh{fill:none;stroke:#d9d7cf}
.qt-ten{font:700 13px Inter,system-ui,sans-serif;fill:#1c2420}.qt-ten.nho{font-size:12px;font-weight:600}.qt-mo{font:700 12px Inter,system-ui,sans-serif;fill:#9a9890}
.qt-cong path{fill:#fff8e1;stroke:#2e3a36;stroke-width:1.6}.qt-cong path.x{fill:none;stroke-width:2.4}
.qt-su-kien circle{fill:#fff;stroke:#2e3a36;stroke-width:1.6}.qt-su-kien.bat-dau circle{stroke:#1e8a5a;stroke-width:2}.qt-su-kien.ket-thuc circle{stroke:#b3261e;stroke-width:4.5}
.qt-su-kien circle.trong{stroke-width:1.2}.qt-su-kien .ico{fill:none;stroke:#2e3a36;stroke-width:1.5}`;

  // ---- vẽ section ----
  let svgEl = null;
  function ve(sec, lanCuaSec) {
    for (const ifr of song.values()) ifr.remove(); song.clear();
    ds = []; let y = 0;
    for (const q of quyTrinhCua(sec, lanCuaSec)) { const P = boTri(q); P.y = y; ds.push(P); y += P.h + GIUA_POOL; }
    lop.innerHTML = '';
    svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('class', 'qt-svg'); svgEl.setAttribute('overflow', 'visible');
    const w = Math.max(1, ...ds.map((P) => P.w)), h = Math.max(1, y - GIUA_POOL);
    svgEl.setAttribute('width', w); svgEl.setAttribute('height', h);
    svgEl.innerHTML = `<style>${CSS_SVG}</style>${DEFS}` + ds.map((P) => `<g class="qt-g" transform="translate(0,${P.y})">${svgPool(P, (k) => anhCua(k))}</g>`).join('');
    lop.appendChild(svgEl);
    xepChup();
  }
  const anhCua = (k) => { const m = MAN[k]; if (!m) return ''; const h = bam(m.html); const u = anhNho.get(h); if (u) { anhNho.delete(h); anhNho.set(h, u); } return u || ''; }; // chạm = mới dùng (LRU)
  // chụp ảnh thu nhỏ còn thiếu, gần tâm viewport trước; xong cái nào thay vào chỗ đó
  const cho = []; let dangChup = false;
  function xepChup() {
    cho.length = 0; // bỏ việc của lần vẽ trước
    for (const P of ds) for (const x of P.nut.values()) { if (x.loai !== 'man') continue; const k = bam(MAN[x.man].html); if (!anhNho.has(k) && (loiChup.get(k) || 0) < 2) cho.push({ P, x }); }
    if (!dangChup) chupTiep();
  }
  async function chupTiep() {
    dangChup = true;
    try {
      while (cho.length && !lop.hidden) {
        const { x: vx, y: vy, z } = api.view(); const r = vung.getBoundingClientRect();
        const cx = (r.width / 2 - vx) / z, cy = (r.height / 2 - vy) / z;
        let tot = 0, kc = Infinity;
        cho.forEach((c, i) => { const v = Math.hypot(c.x.x - cx, c.P.y + c.x.y - cy); if (v < kc) { kc = v; tot = i; } });
        const { P, x } = cho.splice(tot, 1)[0]; if (!ds.includes(P)) continue;
        const u = await chupMot(MAN[x.man]); if (!u || !svgEl) continue; // lỗi: để ô xám
        for (const g of svgEl.querySelectorAll(`g.qt-man[data-man="${CSS.escape(x.man)}"]`)) {
          const xam = g.querySelector('.qt-xam'); if (!xam) continue;
          const im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          for (const a of ['x', 'y', 'width', 'height']) im.setAttribute(a, xam.getAttribute(a));
          im.setAttribute('preserveAspectRatio', 'xMidYMin slice'); im.setAttribute('href', u);
          xam.replaceWith(im); g.querySelector('.qt-mo')?.remove();
        }
        await new Promise((ok) => setTimeout(ok, 10));
      }
    } finally { dangChup = false; }
  }

  // ---- ảo hoá: iframe sống khi gần viewport + zoom ≥ nguong ----
  function capNhatAo(nguong, le) {
    if (lop.hidden) return;
    const { x: vx, y: vy, z } = api.view(); const r = vung.getBoundingClientRect();
    const con = new Set();
    {
      for (const P of ds) for (const x of P.nut.values()) {
        if (x.loai !== 'man' || z * x.s < nguong) continue; // ngưỡng theo cỡ màn thật trên màn hình (x.s là tỉ lệ ảnh trong khối)
        const sx = vx + x.x * z, sy = vy + (P.y + x.y) * z;
        if (sx + x.w * z < -le || sx > r.width + le || sy + x.h * z < -le || sy > r.height + le) continue;
        const id = `${P.q.id}/${x.id}`; con.add(id);
        if (song.has(id)) continue;
        const m = MAN[x.man]; const ifr = document.createElement('iframe');
        ifr.setAttribute('sandbox', 'allow-same-origin'); ifr.referrerPolicy = 'no-referrer'; ifr.title = m.ten; ifr.tabIndex = -1;
        ifr.className = 'qt-song'; ifr.width = m.w; ifr.height = m.h;
        Object.assign(ifr.style, { left: `${x.x + 8}px`, top: `${P.y + x.y + 8}px`, transform: `scale(${x.s})` });
        ifr.srcdoc = m.html; lop.appendChild(ifr); song.set(id, ifr);
      }
    }
    for (const [id, ifr] of song) if (!con.has(id)) { ifr.remove(); song.delete(id); }
  }

  function hop() {
    if (!ds.length) return null;
    return { x0: 0, y0: 0, x1: Math.max(...ds.map((P) => P.w)), y1: ds.at(-1).y + ds.at(-1).h };
  }

  // bấm việc có giao diện ⇒ Play từ bước đó: chuột xử lý ở thaKeo của app.js (pointer capture, phân biệt kéo/bấm); đây là bàn phím
  lop.addEventListener('keydown', (e) => { const g = e.target.closest('g.qt-man'); if (g && e.key === 'Enter') { e.preventDefault(); moPlay(g.dataset.man); } });

  // ---- xuất ----
  async function svgXuat(ds0 = ds) {
    const ds = ds0;
    if (!ds.length) throw new Error('chưa có quy trình');
    // đủ ảnh trước khi xuất
    for (const P of ds) for (const x of P.nut.values()) if (x.loai === 'man') await chupMot(MAN[x.man]); // lỗi thì xuất ô xám
    const data = new Map();
    for (const P of ds) for (const x of P.nut.values()) if (x.loai === 'man' && !data.has(x.man)) {
      const u = anhCua(x.man); if (!u) { data.set(x.man, ''); continue; }
      try {
        const b = await (await fetch(u)).blob();
        data.set(x.man, await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }));
      } catch { data.set(x.man, ''); } // ảnh đã bị đuổi khỏi bộ nhớ đệm: xuất ô xám
    }
    const w = Math.max(...ds.map((P) => P.w)) + 40, h = ds.at(-1).y + ds.at(-1).h + 40;
    const noi = ds.map((P) => `<g transform="translate(20,${P.y + 20})">${svgPool(P, (k) => data.get(k))}</g>`).join('');
    const sach = (t) => t.replace(/ role="button" tabindex="0"/g, '').replace(/<title>[^<]*<\/title>/g, ''); // tệp xuất: bỏ phần chỉ dùng trong app
    return { svg: sach(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>${CSS_SVG}</style>${DEFS}<rect width="100%" height="100%" fill="#f7f6f3"/>${noi}</svg>`), w, h };
  }
  let dangXuat = false;
  async function xuat(kieu, tenTep) {
    if (!ds.length) { toast('Section này chưa có quy trình.', true); return; }
    if (dangXuat) { toast('Đang xuất sơ đồ, chờ chút…'); return; }
    dangXuat = true; toast('Đang dựng tệp sơ đồ…');
    try { await xuat2(kieu, tenTep); } catch (e) { toast(`Không xuất được sơ đồ: ${e.message || e}`, true); } finally { dangXuat = false; }
  }
  async function xuat2(kieu, tenTep) {
    const dsLuc = ds;
    const { svg, w, h } = await svgXuat();
    if (ds !== dsLuc || lop.hidden) throw new Error('đã đổi section/chế độ trong lúc xuất');
    let blob = new Blob([svg], { type: 'image/svg+xml' });
    if (kieu === 'png') {
      const tl = Math.min(2, 16000 / Math.max(w, h), Math.sqrt(16e6 / (w * h))); // giữ dưới giới hạn canvas của Safari/iOS
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image(); img.src = url; await img.decode();
        const cv = document.createElement('canvas'); cv.width = Math.round(w * tl); cv.height = Math.round(h * tl);
        const g = cv.getContext('2d'); g.scale(tl, tl); g.drawImage(img, 0, 0);
        blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
        if (!blob) throw new Error('canvas quá lớn');
      } finally { URL.revokeObjectURL(url); }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${tenTep}.${kieu}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`Đã xuất ${kieu.toUpperCase()} sơ đồ quy trình.`);
  }

  // SVG (ảnh nhúng data URL) cho MỘT hành trình — ảnh chụp kèm link góp ý /r/: quy trình khai báo có hanh chứa id, không có thì tự sinh từ chuỗi màn
  async function svgHanhTrinh(htId) {
    let qs = QT.filter((q) => (q.hanh || []).includes(htId)).map((q) => boManXoa(q));
    if (!qs.length) { const q = tuChuoi(timLan(htId)); qs = q ? [q] : []; }
    if (!qs.length) return '';
    const pools = []; let y = 0;
    for (const q of qs) { const P = boTri(q); P.y = y; pools.push(P); y += P.h + GIUA_POOL; }
    return (await svgXuat(pools)).svg;
  }

  return {
    lop, ve, capNhatAo, hop, xuat, svgHanhTrinh,
    bat(b) { lop.hidden = !b; if (!b) { for (const ifr of song.values()) ifr.remove(); song.clear(); } else if (ds.length) xepChup(); },
    soSong: () => song.size, soPool: () => ds.length,
    dangDung: () => (lop.hidden ? [] : ds.flatMap((P) => [...P.nut.values()].filter((x) => x.loai === 'man').map((x) => bam(MAN[x.man].html)))),
  };
}
