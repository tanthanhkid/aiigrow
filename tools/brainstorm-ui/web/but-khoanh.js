// Bút khoanh chỗ sai — phần DÙNG CHUNG cho trang góp ý /r/<mã> (review.js) và Play của bàn chính (app.js).
// vung = { k:'tay', d:[[x,y],…], mau } hoặc { k:'cn', x,y,w,h, mau } — toạ độ % khung màn (0..100). Máy chủ làm sạch lại (sachVung ở review.mjs).
export const NS_SVG = 'http://www.w3.org/2000/svg';
export const MAU_BUT = ['#e5484d', '#f59e0b', '#7c5cff'];
export const MUC_BUT = { loi: 'Lỗi', 'de-xuat': 'Đề xuất', 'cau-hoi': 'Câu hỏi' };
const tao = (tag, lop, chu) => { const e = document.createElement(tag); if (lop) e.className = lop; if (chu != null) e.textContent = chu; return e; };

export const NHAN_BUT = (bat) => (bat
  ? '<span class="ic">✕</span><span><b>Tắt bút</b><small>quay lại chạy thử</small></span>'
  : '<span class="ic">✏️</span><span><b>Khoanh chỗ sai</b><small>để góp ý cho người sửa</small></span>');

// vẽ một vùng bằng SVG (createElementNS + số/màu đã lọc — không chèn chuỗi người khác vào HTML)
export function hinhSvg(v, dam) {
  const mau = MAU_BUT.includes(v.mau) ? v.mau : MAU_BUT[0];
  let e;
  if (v.k === 'cn') { e = document.createElementNS(NS_SVG, 'rect'); for (const k of ['x', 'y']) e.setAttribute(k, Number(v[k]) || 0); e.setAttribute('width', Number(v.w) || 0); e.setAttribute('height', Number(v.h) || 0); e.setAttribute('rx', '1.2'); }
  else { e = document.createElementNS(NS_SVG, 'path'); e.setAttribute('d', duongMem(Array.isArray(v.d) ? v.d : [])); e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('stroke-linecap', 'round'); }
  // nét tay là nét bút thật: không tô, không tự nối điểm cuối về điểm đầu
  e.setAttribute('fill', v.k === 'cn' ? mau + '22' : 'none'); e.setAttribute('stroke', mau); e.setAttribute('vector-effect', 'non-scaling-stroke');
  e.style.strokeWidth = dam ? '5px' : '3px';
  return e;
}
// đường cong mềm qua các điểm (cong bậc hai qua trung điểm) — nét tay trông như vẽ bằng bút, không gãy khúc
export function duongMem(d) {
  const p = d.map((q) => [Number(q[0]) || 0, Number(q[1]) || 0]);
  if (!p.length) return '';
  if (p.length < 3) return `M${p[0][0]} ${p[0][1]}` + p.slice(1).map((q) => ` L${q[0]} ${q[1]}`).join('');
  let s = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) { const m = [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2]; s += ` Q${p[i][0]} ${p[i][1]} ${m[0].toFixed(2)} ${m[1].toFixed(2)}`; }
  const z = p.at(-1); return s + ` L${z[0]} ${z[1]}`;
}
// lấy cả các điểm trình duyệt gộp giữa hai lần pointermove (chuột/bút nhanh) để nét không bị thành đoạn thẳng
export const diemGop = (e) => { try { const c = e.getCoalescedEvents?.(); if (c && c.length) return c; } catch { /* bỏ qua */ } return [e]; };
export const khungCua = (v) => { if (v.k === 'cn') return v; const xs = v.d.map((p) => p[0]), ys = v.d.map((p) => p[1]); const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }; };
// nét dài: lấy đều tối đa 300 điểm (giữ đầu + cuối) cho gọn — máy chủ cũng rút lại lần nữa
export const rutGon = (d) => (d.length <= 300 ? d : Array.from({ length: 300 }, (_, i) => d[Math.round((i * (d.length - 1)) / 299)]));
// toạ độ % theo đúng khung màn `el` (getBoundingClientRect đã gồm scale/zoom)
export const phanTramTheo = (el, e) => { const r = el.getBoundingClientRect(); const c = (v) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10; return [c(((e.clientX - r.left) / r.width) * 100), c(((e.clientY - r.top) / r.height) * 100)]; };
// gắn bộ vẽ (khoanh tay / khung) lên một <svg viewBox="0 0 100 100"> phủ màn. T = { ve: () => bool (đang bật bút), kieu: () => 'tay'|'cn', mau: () => '#…',
// khung: () => phần tử khung màn để quy %, khiXong: (vung, khungVung) => …, khiBatDau: () => … }. Trả { nhin(), huy() } để vẽ lại/huỷ nét.
export function ganVe(svg, T) {
  const S = { dang: null, cho: null };
  const ve = () => { svg.replaceChildren(); const v = S.dang || S.cho; if (v) svg.append(hinhSvg({ ...v, mau: T.mau() }, true)); };
  svg.addEventListener('pointerdown', (e) => {
    if (!T.ve() || e.button > 0) return;
    e.preventDefault(); T.khiBatDau?.();
    try { svg.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
    const p = phanTramTheo(T.khung(), e);
    S.cho = null; S.dang = T.kieu() === 'tay' ? { k: 'tay', d: [p] } : { k: 'cn', x0: p[0], y0: p[1], x: p[0], y: p[1], w: 0, h: 0 };
    ve();
  });
  svg.addEventListener('pointermove', (e) => {
    const v = S.dang; if (!v) return; const p = phanTramTheo(T.khung(), e);
    if (v.k === 'tay') { for (const ev of diemGop(e)) { const r = phanTramTheo(T.khung(), ev), q = v.d.at(-1); if (Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) >= 0.2 && v.d.length < 2000) v.d.push(r); } }
    else { v.x = Math.min(v.x0, p[0]); v.y = Math.min(v.y0, p[1]); v.w = Math.abs(p[0] - v.x0); v.h = Math.abs(p[1] - v.y0); }
    ve();
  });
  const xong = (e, huy) => {
    const v = S.dang; if (!v) return; S.dang = null;
    if (!huy && v.k === 'tay') v.d.push(phanTramTheo(T.khung(), e));
    const b = khungCua(v);
    const nho = v.k === 'tay' ? v.d.length < 4 || b.w + b.h < 2 : b.w < 2 || b.h < 1; // nét quá nhỏ: bỏ
    if (huy || nho) { ve(); return; }
    S.cho = v.k === 'cn' ? { k: 'cn', x: v.x, y: v.y, w: v.w, h: v.h } : { k: 'tay', d: v.d };
    ve(); T.khiXong(S.cho, b);
  };
  svg.addEventListener('pointerup', (e) => xong(e, false));
  svg.addEventListener('pointercancel', (e) => xong(e, true));
  return { nhin: ve, huy: () => { S.dang = null; S.cho = null; ve(); }, cho: () => S.cho };
}

// ---------- Play của bàn chính ----------
// A = { lop (#lop-play), iframe(): iframe màn đang Play, thietBi(): khung điện thoại, anh(): ảnh thật|null, key(): key màn, ht(): id hành trình,
//       gopYMo(ht, key): góp ý của màn, gui(ht, than): Promise<góp ý mới>, tenNguoi(), datTen(v), toast(msg, loi) }
const KHOA_MACH = 'bs.play-but-mach';
const daThayMach = () => { try { return !!localStorage.getItem(KHOA_MACH); } catch { return false; } };
const ghiThayMach = () => { try { localStorage.setItem(KHOA_MACH, '1'); } catch { /* bỏ qua */ } };

export function ganButPlay(A) {
  const B = { bat: false, kieu: 'tay', mau: MAU_BUT[0], muc: 'loi', key: null, chon: null };
  const lop = A.lop;
  const nut = tao('button', 'b-but'); nut.type = 'button'; nut.id = 'bk-nut'; nut.title = 'Phím tắt: B'; nut.hidden = true;
  const mach = tao('div', 'mach'); mach.id = 'bk-mach'; mach.hidden = true;
  mach.innerHTML = '<div>Thấy chỗ nào trên màn chưa đúng?<br>Bấm <b>✏️ Khoanh chỗ sai</b>, vẽ vòng quanh chỗ đó rồi ghi góp ý.</div>';
  const hieu = tao('button', 'nut-nhe', 'Đã hiểu'); hieu.type = 'button'; mach.append(hieu);
  const thanh = tao('div', 'thanh-but'); thanh.id = 'bk-thanh'; thanh.hidden = true;
  thanh.innerHTML = '<button type="button" class="bat" data-kieu="tay">〰 Khoanh tay</button><button type="button" data-kieu="cn">▭ Khung</button>'
    + MAU_BUT.map((m, i) => `<span class="mau${i ? '' : ' bat'}" data-mau="${m}" style="background:${m}" title="${['Đỏ', 'Cam', 'Tím'][i]}"></span>`).join('');
  const khung = tao('div', 'bk-khung'); khung.id = 'bk-khung'; khung.hidden = true;
  const svgVung = document.createElementNS(NS_SVG, 'svg'); svgVung.setAttribute('class', 'svg-vung'); svgVung.setAttribute('viewBox', '0 0 100 100'); svgVung.setAttribute('preserveAspectRatio', 'none');
  const lopSo = tao('div', 'bk-so');
  const svgVe = document.createElementNS(NS_SVG, 'svg'); svgVe.setAttribute('class', 'svg-ve'); svgVe.setAttribute('viewBox', '0 0 100 100'); svgVe.setAttribute('preserveAspectRatio', 'none'); svgVe.setAttribute('hidden', '');
  const bang = tao('div', 'bang-but', '✏️ Vẽ vòng quanh chỗ sai → thả tay → ghi góp ý'); bang.hidden = true;
  khung.append(svgVung, svgVe, lopSo, bang); // số nằm TRÊN lớp vẽ để bấm được cả khi bút đang bật
  const hop = tao('div', 'hop-but'); hop.id = 'bk-hop'; hop.hidden = true;
  hop.innerHTML = '<div class="loai-but"><button type="button" class="bat" data-muc="loi">Lỗi</button><button type="button" data-muc="de-xuat">Đề xuất</button><button type="button" data-muc="cau-hoi">Câu hỏi</button></div>'
    + '<input class="bk-ten" maxlength="40" placeholder="Tên bạn (để người sửa biết ai góp ý)" aria-label="Tên bạn" hidden>'
    + '<textarea rows="3" maxlength="2000" placeholder="Chỗ này sai gì? Sửa thế nào?"></textarea>'
    + '<div class="nut-hang"><button type="button" class="nut-nhe bk-huy">Huỷ</button><button type="button" class="nut-chinh bk-luu">Gửi góp ý</button></div>';
  const bong = tao('div', 'bk-bong'); bong.hidden = true;
  lop.append(nut, mach, thanh, khung, hop, bong);
  const o = (s, g = hop) => g.querySelector(s);

  const ve = ganVe(svgVe, { ve: () => B.bat, kieu: () => B.kieu, mau: () => B.mau, khung: () => khung,
    khiBatDau: () => huyHop(), khiXong: (_v, b) => moHop(b) });

  function veNhan() { nut.innerHTML = NHAN_BUT(B.bat); nut.classList.toggle('bat', B.bat); nut.setAttribute('aria-pressed', String(B.bat)); }
  // khung phủ đúng vùng màn (iframe) đang Play; nút đỏ sát bên phải khung điện thoại (và ảnh thật nếu đang bật)
  function datViTri() {
    const ifr = A.iframe(); const tb = A.thietBi();
    const coMan = !!(ifr && tb && !lop.hidden && A.ht() && A.key());
    nut.hidden = !coMan; khung.hidden = !coMan;
    if (!coMan) { mach.hidden = true; thanh.hidden = true; hop.hidden = true; bong.hidden = true; return; }
    const L = lop.getBoundingClientRect(), r = ifr.getBoundingClientRect(), t = tb.getBoundingClientRect();
    Object.assign(khung.style, { left: `${r.left - L.left}px`, top: `${r.top - L.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const a = A.anh(); const phai = Math.max(t.right, a && !a.hidden ? a.getBoundingClientRect().right : 0) - L.left;
    const x = Math.round(Math.max(8, Math.min(L.width - 250, phai + 14))), y = Math.round(t.top - L.top + 40);
    nut.style.left = `${x}px`; nut.style.top = `${y}px`;
    mach.style.left = `${x}px`; mach.style.top = `${y + 78}px`;
    thanh.style.left = `${x}px`; thanh.style.top = `${y + 78}px`;
    mach.hidden = B.bat || daThayMach(); thanh.hidden = !B.bat;
    veSo();
  }
  function veSo() {
    svgVung.replaceChildren(); lopSo.replaceChildren();
    const ht = A.ht(), key = A.key(); if (!ht || !key) return;
    let n = 0;
    for (const g of A.gopYMo(ht, key)) {
      if (g.tt !== 'mo' || (!g.vung && !g.ghim)) continue;
      n++;
      if (g.vung) svgVung.append(hinhSvg(g.vung, B.chon === g.id));
      if (!g.ghim) continue;
      const b = tao('button', `ghim muc-${g.muc}` + (B.chon === g.id ? ' vung-dam' : ''), String(n)); b.type = 'button';
      b.style.left = `${Number(g.ghim.x) || 0}%`; b.style.top = `${Number(g.ghim.y) || 0}%`; b.title = `${g.ten}: ${g.noi}`;
      b.onclick = (e) => { e.stopPropagation(); const tat = B.chon === g.id && !bong.hidden; B.chon = tat ? null : g.id; veSo(); if (tat) { bong.hidden = true; return; } moBong(g, lopSo.querySelector('.vung-dam') || b); };
      lopSo.append(b);
    }
  }
  function moBong(g, b) {
    bong.replaceChildren(); bong.hidden = false;
    const d = tao('div', 'bk-bong-dau'); d.append(tao('b', '', g.ten), tao('span', 'chip', MUC_BUT[g.muc] || g.muc));
    bong.append(d, tao('p', '', g.noi));
    const L = lop.getBoundingClientRect(), r = b.getBoundingClientRect(); const rong = bong.offsetWidth || 240;
    bong.style.left = `${Math.round(Math.max(8, Math.min(L.width - rong - 8, r.left - L.left + 20)))}px`;
    bong.style.top = `${Math.round(Math.max(8, r.top - L.top + 24))}px`;
  }
  function huyHop() { ve.huy(); hop.hidden = true; }
  function dat(bat) {
    if (bat && (nut.hidden || !A.key())) { A.toast('Mở một màn rồi mới khoanh được.', true); return; }
    B.bat = !!bat; if (!bat) huyHop(); bong.hidden = true; B.chon = null;
    svgVe.toggleAttribute('hidden', !B.bat); bang.hidden = !B.bat; khung.classList.toggle('dang-but', B.bat);
    if (B.bat) ghiThayMach();
    veNhan(); datViTri();
  }
  function moHop(b) {
    const L = lop.getBoundingClientRect(), k = khung.getBoundingClientRect();
    hop.hidden = false; o('.bk-ten').hidden = !!A.tenNguoi();
    const rong = hop.offsetWidth || 260, cao = hop.offsetHeight || 220;
    const trai = k.left - L.left + (b.x / 100) * k.width, duoi = k.top - L.top + ((b.y + b.h) / 100) * k.height, tren = k.top - L.top + (b.y / 100) * k.height;
    hop.style.left = `${Math.round(Math.max(8, Math.min(L.width - rong - 8, trai)))}px`;
    hop.style.top = `${Math.round(Math.max(8, Math.min(L.height - cao - 8, duoi + 10 + cao > L.height ? tren - cao - 10 : duoi + 10)))}px`;
    const ta = o('textarea'); ta.value = ''; ta.focus();
  }
  nut.onclick = () => dat(!B.bat);
  hieu.onclick = () => { ghiThayMach(); mach.hidden = true; };
  thanh.querySelectorAll('[data-kieu]').forEach((b) => { b.onclick = () => { B.kieu = b.dataset.kieu; thanh.querySelectorAll('[data-kieu]').forEach((x) => x.classList.toggle('bat', x === b)); }; });
  thanh.querySelectorAll('.mau').forEach((b) => { b.onclick = () => { B.mau = b.dataset.mau; thanh.querySelectorAll('.mau').forEach((x) => x.classList.toggle('bat', x === b)); ve.nhin(); }; });
  hop.querySelectorAll('[data-muc]').forEach((b) => { b.onclick = () => { B.muc = b.dataset.muc; hop.querySelectorAll('[data-muc]').forEach((x) => x.classList.toggle('bat', x === b)); }; });
  o('.bk-huy').onclick = huyHop;
  o('.bk-luu').onclick = async () => {
    const noi = o('textarea').value.trim(); if (!noi) { o('textarea').focus(); return; }
    const vung = ve.cho(); if (!vung) return;
    if (!A.tenNguoi()) { const t = o('.bk-ten').value.replace(/[\u0000-\u001f\u007f]/g, '').trim(); if (!t) { o('.bk-ten').hidden = false; o('.bk-ten').focus(); return; } A.datTen(t); }
    const btn = o('.bk-luu'); btn.disabled = true;
    try {
      const j = await A.gui(A.ht(), { key: A.key(), vung: { ...vung, ...(vung.k === 'tay' ? { d: rutGon(vung.d) } : {}), mau: B.mau }, muc: B.muc, noi, ten: A.tenNguoi() });
      huyHop(); B.chon = j?.id || null; veSo(); A.toast('Đã gửi góp ý — người sửa sẽ thấy ở bảng «💬 Góp ý».');
    } catch (e) { A.toast(`Không gửi được góp ý: ${e.message}`, true); } finally { btn.disabled = false; }
  };
  lop.addEventListener('pointerdown', (e) => { if (!bong.hidden && !e.target.closest('.bk-bong,.bk-so')) { bong.hidden = true; if (B.chon) { B.chon = null; veSo(); } } });
  veNhan();

  return {
    // gọi mỗi lần vẽ Play: đổi màn ⇒ tắt bút; đứng vị trí lại (và lần nữa khi hiệu ứng chuyển màn xong)
    khiVe() {
      const key = A.key();
      if (B.key !== key) { B.key = key; if (B.bat) dat(false); B.chon = null; bong.hidden = true; }
      datViTri(); clearTimeout(this.hen); this.hen = setTimeout(datViTri, 340);
    },
    veLai: datViTri,
    dongPlay() { if (B.bat) dat(false); B.key = null; huyHop(); bong.hidden = true; nut.hidden = khung.hidden = mach.hidden = thanh.hidden = true; },
    dangBat: () => B.bat,
    bat: dat,
    doi: () => dat(!B.bat),
  };
}
