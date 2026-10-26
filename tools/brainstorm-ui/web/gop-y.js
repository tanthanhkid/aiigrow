// Bàn chính — phía chủ quản của «Góp ý»: chia sẻ hành trình lấy ý kiến (/r/<mã>), xem/lọc góp ý, đánh dấu đã xử lý,
// «✨ Sửa theo góp ý» (luồng biến thể sẵn có), duyệt «Đề xuất thay đổi» của người review (Accept = Thay màn / Từ chối / Sửa tiếp), xuất Markdown.
// Quyền chủ quản kiểm ở MÁY CHỦ: 127.0.0.1 gõ thẳng, hoặc mã chủ quản (chu-quan.json ngoài git) gửi qua header x-bs-chu-quan.
const $ = (s) => document.querySelector(s);
const KHOA_MA = 'bs.chu-quan';
const MUC_TEN = { loi: 'Lỗi', 'de-xuat': 'Đề xuất', 'cau-hoi': 'Câu hỏi' };
const TT_DX = { cho: 'Chờ duyệt', chap: 'Đã áp dụng', tu: 'Từ chối' };
const tao = (tag, lop, chu) => { const e = document.createElement(tag); if (lop) e.className = lop; if (chu != null) e.textContent = chu; return e; };
const gioVN = (t) => { try { return new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); } catch { return ''; } };
export const maChuQuan = () => { try { return localStorage.getItem(KHOA_MA) || ''; } catch { return ''; } };
const ghiMa = (v) => { try { v ? localStorage.setItem(KHOA_MA, v) : localStorage.removeItem(KHOA_MA); } catch { /* bỏ qua */ } };
// header kèm theo mọi lệnh ghi của bàn chính (máy chủ bật khoaBang thì Thay màn cũng cần)
export const dauChuQuan = () => (maChuQuan() ? { 'x-bs-chu-quan': maChuQuan() } : {});

// A: { MAN, LAN_GOC, timLan, timKhung, st, dom, toast, vuaMan, veTatCa, veBen, doiSec, secCuaLan, sinhTheoY(key, y), svgHanhTrinh(id),
//      apManifest(key, manifest), moDeXuatTrenBan(dx, html), tenNguoi() }
export function ganGopY(A) {
  const D = { du: null, canMa: false, tab: 'gy', loc: { ht: '', nguoi: '', tt: 'mo' }, dangTai: null };
  async function goi(url, than) {
    const r = await fetch(url, than === undefined ? { headers: dauChuQuan() } : { method: 'POST', headers: { 'content-type': 'application/json', ...dauChuQuan() }, body: JSON.stringify(than) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403 && j.canMa) { D.canMa = true; D.du = null; ve(); A.veBen(); throw new Error('Cần mã chủ quản'); }
    if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
    return j;
  }
  async function tai() {
    if (D.dangTai) { D.lai = true; return D.dangTai; } // đang tải: tải thêm một lượt sau để không lỡ thay đổi mới
    D.dangTai = (async () => {
      do {
        D.lai = false;
        try { D.du = await goi('/api/review'); D.canMa = false; } catch { /* đã hiện lý do */ }
      } while (D.lai);
      ve(); A.veBen(); A.veTatCa(false);
    })().finally(() => { D.dangTai = null; });
    return D.dangTai;
  }
  const gopYCua = (ht) => D.du?.gopY?.[ht] || [];
  const deXuatCua = (ht) => D.du?.deXuat?.[ht] || [];
  const tatCaGopY = () => Object.entries(D.du?.gopY || {}).flatMap(([ht, ds]) => ds.map((g) => ({ ...g, ht })));
  const tatCaDeXuat = () => Object.entries(D.du?.deXuat || {}).flatMap(([ht, ds]) => ds.map((x) => ({ ...x, ht })));
  // đếm cho menu trái + đầu hàng hành trình
  const dem = (ht) => ({ mo: gopYCua(ht).filter((g) => g.tt === 'mo').length, cho: deXuatCua(ht).filter((x) => x.tt === 'cho').length });
  const tenMan = (key) => (key && Object.hasOwn(A.MAN, key) ? A.MAN[key].ten : key ? key : 'Cả hành trình');
  const tenHt = (ht) => A.timLan(ht)?.ten || D.du?.chiaSe?.find((s) => s.ht === ht)?.htTen || ht;

  // ---------- bảng ----------
  function mo(tab = D.tab, ht = '') {
    D.tab = tab; if (ht) D.loc.ht = ht;
    $('#pn-gy').hidden = false; document.body.classList.add('co-pn-gy');
    if (!D.du && !D.canMa) tai(); else ve();
  }
  function dong() { $('#pn-gy').hidden = true; document.body.classList.remove('co-pn-gy'); }
  $('#nut-gop-y').onclick = () => ($('#pn-gy').hidden ? mo() : dong());
  $('#pn-gy-dong').onclick = dong;
  document.querySelectorAll('#pn-gy [data-tab]').forEach((b) => { b.onclick = () => { D.tab = b.dataset.tab; ve(); }; });

  function ve() {
    const tong = D.du ? { mo: tatCaGopY().filter((g) => g.tt === 'mo').length, cho: tatCaDeXuat().filter((x) => x.tt === 'cho').length } : { mo: 0, cho: 0 };
    $('#nut-gop-y').textContent = `💬 Góp ý${tong.mo + tong.cho ? ` · ${tong.mo}${tong.cho ? ` · ⇄${tong.cho}` : ''}` : ''}`;
    if ($('#pn-gy').hidden) return;
    document.querySelectorAll('#pn-gy [data-tab]').forEach((b) => b.classList.toggle('bat', b.dataset.tab === D.tab));
    $('#pn-gy [data-tab="dx"]').textContent = `Đề xuất${tong.cho ? ` (${tong.cho})` : ''}`;
    const than = $('#pn-gy-than');
    // giữ câu trả lời đang gõ dở khi vẽ lại (có góp ý mới)
    const nhap = [...than.querySelectorAll('[data-gy] form textarea')].map((ta) => ({ id: ta.closest('[data-gy]').dataset.gy, v: ta.value, dang: document.activeElement === ta }));
    queueMicrotask(() => { for (const x of nhap) { const the = than.querySelector(`[data-gy="${CSS.escape(x.id)}"]`); const [ht, id] = x.id.split('/'); const g = gopYCua(ht).find((y) => y.id === id); if (!the || !g) continue; traLoi(the, g); const ta = the.querySelector('form textarea'); if (ta) { ta.value = x.v; if (x.dang) ta.focus(); } } });
    than.innerHTML = '';
    if (D.canMa) return veNhapMa(than);
    if (!D.du) { than.append(tao('p', 'phu', 'Đang tải…')); return; }
    if (D.tab === 'gy') veGopY(than); else if (D.tab === 'dx') veDeXuat(than); else veChiaSe(than);
  }
  function veNhapMa(than) {
    const f = tao('form', 'pn-ma');
    f.append(tao('p', '', 'Mở bàn qua tên miền: cần mã chủ quản để xem góp ý, chia sẻ link và duyệt đề xuất. Mã đặt trong tệp chu-quan.json trên máy chạy bàn (ngoài git).'));
    const i = tao('input'); i.type = 'password'; i.placeholder = 'Mã chủ quản'; i.autocomplete = 'off'; i.value = maChuQuan();
    const b = tao('button', 'nut-chinh', 'Mở khoá'); b.type = 'submit';
    f.append(i, b); than.append(f);
    f.onsubmit = (e) => { e.preventDefault(); ghiMa(i.value.trim()); D.canMa = false; tai(); };
  }

  // ---------- tab Góp ý ----------
  function veGopY(than) {
    const ds = tatCaGopY();
    const loc = tao('div', 'pn-loc');
    const sHt = tao('select'); sHt.append(new Option('Mọi hành trình', ''));
    for (const ht of [...new Set(ds.map((g) => g.ht))]) sHt.append(new Option(`${tenHt(ht)} (${dem(ht).mo} mở)`, ht));
    sHt.value = D.loc.ht; sHt.onchange = () => { D.loc.ht = sHt.value; ve(); };
    const sNg = tao('select'); sNg.append(new Option('Mọi người', ''));
    for (const t of [...new Set(ds.map((g) => g.ten))]) sNg.append(new Option(t, t));
    sNg.value = D.loc.nguoi; sNg.onchange = () => { D.loc.nguoi = sNg.value; ve(); };
    const sTt = tao('select'); for (const [v, t] of [['mo', 'Đang mở'], ['xong', 'Đã xử lý'], ['', 'Mọi trạng thái']]) sTt.append(new Option(t, v));
    sTt.value = D.loc.tt; sTt.onchange = () => { D.loc.tt = sTt.value; ve(); };
    const md = tao('button', 'nut-nhe', 'Xuất Markdown'); md.type = 'button'; md.onclick = xuatMd;
    loc.append(sHt, sNg, sTt, md); than.append(loc);
    const hien = locGopY(ds);
    if (!hien.length) { than.append(tao('p', 'phu', ds.length ? 'Không có góp ý khớp bộ lọc.' : 'Chưa có góp ý nào. Mở tab «Chia sẻ» để tạo link cho người review.')); return; }
    // nhóm theo hành trình → màn
    const nhom = new Map();
    for (const g of hien) { const k = `${g.ht}|${g.key || ''}`; if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(g); }
    for (const [k, gs] of nhom) {
      const [ht, key] = k.split('|');
      const dau = tao('div', 'pn-nhom');
      dau.append(tao('b', '', tenMan(key)), tao('span', 'phu', tenHt(ht)));
      const moCon = gs.filter((g) => g.tt === 'mo');
      if (key && moCon.length && Object.hasOwn(A.MAN, key)) {
        const b = tao('button', 'nut-nhe', `✨ Sửa theo góp ý (${moCon.length})`); b.type = 'button';
        b.title = 'Gửi các góp ý đang mở của màn này cho Claude — sinh biến thể như luồng thường (prompt caching)';
        b.onclick = () => suaTheoGopY(key, moCon); dau.append(b);
      }
      than.append(dau);
      for (const g of gs) than.append(theGopY(g));
    }
  }
  const locGopY = (ds) => ds.filter((g) => (!D.loc.ht || g.ht === D.loc.ht) && (!D.loc.nguoi || g.ten === D.loc.nguoi) && (!D.loc.tt || g.tt === D.loc.tt));
  function theGopY(g) {
    const the = tao('article', `pn-the muc-${g.muc}` + (g.tt === 'xong' ? ' xong' : '')); the.dataset.gy = `${g.ht}/${g.id}`;
    const dau = tao('div', 'pn-gy-dau');
    dau.append(tao('b', '', g.ten), tao('span', 'chip muc', MUC_TEN[g.muc] || g.muc), tao('span', 'chip', `v${g.v}`));
    if (g.ghim) dau.append(tao('span', 'chip', '📌 ghim'));
    if (g.ycBt) dau.append(tao('span', 'chip vang', 'Yêu cầu biến thể'));
    dau.append(tao('span', 'phu', gioVN(g.t)));
    the.append(dau, tao('p', 'pn-noi', g.noi));
    for (const t of g.tl || []) { const tl = tao('div', 'pn-tl'); tl.append(tao('b', '', t.ten + (t.chuQuan ? ' (phụ trách)' : '')), tao('span', 'phu', ` ${gioVN(t.t)}`), tao('p', '', t.noi)); the.append(tl); }
    const hang = tao('div', 'pn-nut');
    const nut = (chu, lam, lop = 'nut-nhe') => { const b = tao('button', lop, chu); b.type = 'button'; b.onclick = lam; hang.append(b); return b; };
    if (g.key && Object.hasOwn(A.MAN, g.key)) nut('Tới', () => toiGhim(g));
    nut(g.tt === 'mo' ? '✓ Đã xử lý' : 'Mở lại', () => doiTt(g, g.tt === 'mo' ? 'xong' : 'mo'));
    nut('Trả lời', () => traLoi(the, g));
    if (g.ycBt && g.tt === 'mo' && g.key && Object.hasOwn(A.MAN, g.key)) nut('✨ Sinh biến thể', () => suaTheoGopY(g.key, [g]));
    the.append(hang);
    return the;
  }
  async function doiTt(g, tt) {
    try { await goi(`/api/review/gop-y/${g.ht}/${g.id}/tt`, { tt }); await tai(); } catch (e) { A.toast(`Không đổi được: ${e.message}`, true); }
  }
  function traLoi(the, g) {
    if (the.querySelector('form')) return;
    const f = tao('form', 'pn-tl-hop'); const ta = tao('textarea'); ta.rows = 2; ta.maxLength = 2000; ta.required = true; ta.placeholder = 'Trả lời người review…';
    const b = tao('button', 'nut-chinh', 'Gửi'); b.type = 'submit'; f.append(ta, b); the.append(f); ta.focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      try { await goi(`/api/review/gop-y/${g.ht}/${g.id}/tl`, { noi: ta.value, ten: A.tenNguoi() || 'Thanh' }); await tai(); } catch (er) { A.toast(`Không gửi được: ${er.message}`, true); }
    };
  }
  // nhảy tới màn + hiện ghim tạm trên khung gốc
  function toiGhim(g) {
    const l = A.timLan(A.MAN[g.key].lan); const sec = l && A.secCuaLan(l);
    if (sec && sec !== A.st.sec) A.doiSec(sec, 'canvas');
    else if (A.st.cheDo === 'qt') A.doiSec(A.st.sec, 'canvas');
    A.st.chon.clear(); A.st.chon.add(g.key); A.veTatCa(false); A.vuaMan([g.key]);
    setTimeout(() => {
      const el = A.dom.get(g.key)?.el; if (!el) return;
      el.querySelectorAll('.ghim-tam').forEach((x) => x.remove());
      if (!g.ghim) return;
      const p = tao('div', 'ghim-tam'); p.title = `${g.ten}: ${g.noi}`;
      p.style.left = `${g.ghim.x}%`; p.style.top = `calc(var(--dau-khung, 34px) + (100% - var(--dau-khung, 34px)) * ${g.ghim.y / 100})`;
      el.append(p); setTimeout(() => p.remove(), 6000);
    }, 120);
  }
  function suaTheoGopY(key, gs) {
    const y = `Sửa màn theo góp ý của người review (giữ nguyên phần không được nhắc tới):\n` +
      gs.map((g, i) => `${i + 1}. [${MUC_TEN[g.muc] || g.muc}] ${g.ten}: ${g.noi}${g.ghim ? ` (ghim ~${g.ghim.x}% ngang, ${g.ghim.y}% dọc${g.ghim.sel ? `, phần tử ${g.ghim.sel}` : ''})` : ''}`).join('\n');
    toiGhim({ ...gs[0], ghim: null });
    A.sinhTheoY(key, y);
  }
  function xuatMd() {
    const ds = locGopY(tatCaGopY());
    const dong = [`# Góp ý thiết kế AiiGrow — ${new Date().toLocaleString('vi-VN')}`, ''];
    let htCu = '', keyCu = null;
    const sach = (t) => String(t).replace(/\r?\n/g, ' ').trim();
    for (const g of ds.sort((a, b) => (a.ht + (a.key || '')).localeCompare(b.ht + (b.key || '')) || a.t.localeCompare(b.t))) {
      if (g.ht !== htCu) { dong.push(`## ${tenHt(g.ht)}`, ''); htCu = g.ht; keyCu = null; }
      if (g.key !== keyCu) { dong.push(`### ${tenMan(g.key)}`, ''); keyCu = g.key; }
      dong.push(`- [${g.tt === 'xong' ? 'x' : ' '}] **${MUC_TEN[g.muc] || g.muc}** · ${sach(g.ten)} · v${g.v} · ${gioVN(g.t)}${g.ghim ? ` · 📌 ${g.ghim.x}%/${g.ghim.y}%` : ''} — ${sach(g.noi)}`);
      for (const t of g.tl || []) dong.push(`  - ${sach(t.ten)}${t.chuQuan ? ' (phụ trách)' : ''}: ${sach(t.noi)}`);
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([dong.join('\n') + '\n'], { type: 'text/markdown' }));
    a.download = `gop-y-${new Date().toISOString().slice(0, 10)}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- tab Đề xuất ----------
  function veDeXuat(than) {
    const ds = tatCaDeXuat().sort((a, b) => (a.tt === 'cho') === (b.tt === 'cho') ? b.t.localeCompare(a.t) : a.tt === 'cho' ? -1 : 1);
    if (!ds.length) { than.append(tao('p', 'phu', 'Chưa có đề xuất thay đổi. Người review tạo biến thể theo góp ý rồi bấm «Đề xuất áp dụng» thì đề xuất hiện ở đây.')); return; }
    for (const x of ds) {
      const the = tao('article', `pn-dx tt-${x.tt}`);
      the.append(tao('b', '', `${tenMan(x.key)} — ${x.nhan || 'Đề xuất'}`), tao('span', `chip ${x.tt}`, TT_DX[x.tt] + (x.vMoi ? ` (v${x.vMoi})` : '')),
        tao('span', 'phu', `${x.ten} · ${tenHt(x.ht)} · ${gioVN(x.t)}`));
      const gy = x.gy ? gopYCua(x.ht).find((g) => g.id === x.gy) : null;
      if (gy) the.append(tao('p', 'pn-noi', `Góp ý: ${gy.noi}`));
      if (x.tt === 'tu' && x.lyDo) the.append(tao('p', 'pn-noi nguy', `Lý do từ chối: ${x.lyDo}`));
      const b = tao('button', x.tt === 'cho' ? 'nut-chinh' : 'nut-nhe', x.tt === 'cho' ? 'Xem & duyệt' : 'Xem'); b.type = 'button'; b.onclick = () => xemDeXuat(x);
      the.append(b); than.append(the);
    }
  }
  let dxMo = null;
  async function xemDeXuat(x) {
    let j; try { j = await goi(`/api/review/de-xuat/${x.ht}/${x.id}`); } catch (e) { A.toast(`Không mở được đề xuất: ${e.message}`, true); return; }
    dxMo = { ...x, html: j.html };
    const m = A.MAN[x.key]; if (!m) { A.toast('Màn của đề xuất không còn trên bàn.', true); return; }
    $('#dx-tieu').textContent = `${m.ten} — đề xuất của ${x.ten}${x.nhan ? ` · ${x.nhan}` : ''} (${TT_DX[x.tt]})`;
    const gy = x.gy ? gopYCua(x.ht).find((g) => g.id === x.gy) : null;
    $('#dx-gy').textContent = gy ? `Góp ý: «${gy.noi}»` : '';
    const w = x.w || m.w, h = x.h || m.h; const rong = Math.min(420, (innerWidth - 160) / 3);
    const luoi = $('#dx-luoi'); luoi.innerHTML = '';
    const o = (tieu, html, ww, hh, lop = '') => {
      const f = tao('figure', `dx-o ${lop}`); f.append(tao('figcaption', '', tieu));
      const z = rong / ww; const vo = tao('div', 'dx-vo'); vo.style.width = `${rong}px`; vo.style.height = `${Math.round(hh * z)}px`;
      const ifr = document.createElement('iframe'); ifr.setAttribute('sandbox', 'allow-same-origin'); ifr.title = tieu;
      Object.assign(ifr.style, { width: `${ww}px`, height: `${hh}px`, transform: `scale(${z})` }); ifr.srcdoc = html; vo.append(ifr); f.append(vo); return { f, vo };
    };
    luoi.append(o(`Gốc (đang dùng v${A.PB[x.key]?.hien || 0})`, A.lamSach(m.html), m.w, m.h).f, o('Đề xuất', A.lamSach(j.html), w, h).f);
    // lớp chênh lệch: chồng hai bản, chế độ hoà trộn «difference» — chỗ nào khác sẽ sáng lên
    const cl = o('Chênh lệch (chỗ sáng = khác)', A.lamSach(m.html), m.w, m.h, 'chenh');
    const tren = document.createElement('iframe'); tren.setAttribute('sandbox', 'allow-same-origin'); tren.title = 'Đề xuất (lớp chênh lệch)';
    Object.assign(tren.style, { width: `${w}px`, height: `${h}px`, transform: `scale(${rong / m.w})`, mixBlendMode: 'difference' }); tren.srcdoc = A.lamSach(j.html);
    cl.vo.append(tren); luoi.append(cl.f);
    const cho = x.tt === 'cho';
    for (const id of ['#dx-chap', '#dx-tu', '#dx-sua']) $(id).hidden = !cho;
    $('#dx-ly').hidden = true; $('#dx-ly').value = '';
    $('#lop-dx').hidden = false;
  }
  async function chapNhan(dx, them = {}) {
    const j = await goi(`/api/review/de-xuat/${dx.ht}/${dx.id}/chap`, them);
    await A.apManifest(dx.key, j.manifest);
    A.toast(`Đã áp dụng đề xuất của ${dx.ten} — «${A.MAN[dx.key].ten}» đang dùng v${j.manifest.hien}; góp ý gắn kèm chuyển «Đã xử lý».`);
    tai();
    return j;
  }
  $('#dx-chap').onclick = async () => {
    const dx = dxMo; if (!dx) return; $('#dx-chap').disabled = true;
    try { await chapNhan(dx, { html: A.lamSach(dx.html || ''), w: dx.w, h: dx.h }); $('#lop-dx').hidden = true; } catch (e) { A.toast(`Không áp dụng được: ${e.message}`, true); } finally { $('#dx-chap').disabled = false; }
  };
  $('#dx-tu').onclick = async () => {
    const dx = dxMo; if (!dx) return;
    const ly = $('#dx-ly');
    if (ly.hidden) { ly.hidden = false; ly.focus(); A.toast('Ghi lý do (người review sẽ thấy) rồi bấm «Từ chối» lần nữa.'); return; }
    $('#dx-tu').disabled = true;
    try { await goi(`/api/review/de-xuat/${dx.ht}/${dx.id}/tu`, { lyDo: ly.value.trim() }); $('#lop-dx').hidden = true; A.toast('Đã từ chối đề xuất — thiết kế không đổi.'); tai(); }
    catch (e) { A.toast(`Không từ chối được: ${e.message}`, true); } finally { $('#dx-tu').disabled = false; }
  };
  $('#dx-sua').onclick = () => { const dx = dxMo; if (!dx) return; $('#lop-dx').hidden = true; A.moDeXuatTrenBan(dx, dx.html); };
  $('#dx-dong').onclick = () => { $('#lop-dx').hidden = true; $('#dx-luoi').innerHTML = ''; };

  // ---------- tab Chia sẻ ----------
  function veChiaSe(than) {
    const f = tao('form', 'pn-cs');
    const s = tao('select'); for (const l of A.LAN_GOC) s.append(new Option(`${l.ten} · ${l.nen}`, l.id));
    s.value = D.loc.ht && A.timLan(D.loc.ht)?.goc ? D.loc.ht : A.LAN_GOC[0]?.id || '';
    const gc = tao('input'); gc.maxLength = 300; gc.placeholder = 'Ghi chú cho người review (không bắt buộc)';
    const b = tao('button', 'nut-chinh', 'Chia sẻ để góp ý'); b.type = 'submit';
    f.append(tao('b', '', 'Tạo link góp ý (ảnh chụp đóng băng các màn ở phiên bản hiện tại)'), s, gc, b);
    f.onsubmit = async (e) => { e.preventDefault(); b.disabled = true; try { await chiaSe(s.value, gc.value.trim()); gc.value = ''; } finally { b.disabled = false; } };
    than.append(f);
    const ds = (D.du.chiaSe || []).slice().reverse();
    if (!ds.length) than.append(tao('p', 'phu', 'Chưa có link chia sẻ nào.'));
    for (const x of ds) {
      const the = tao('article', 'pn-link' + (x.thuHoi ? ' thu-hoi' : ''));
      const url = `${location.origin}/r/${x.ma}`;
      the.append(tao('b', '', `${tenHt(x.ht)} · v${x.v}`), tao('span', 'phu', `${gioVN(x.t)} · ${x.soMan} màn${x.thuHoi ? ' · đã thu hồi' : ''}`));
      if (x.ghiChu) the.append(tao('p', 'pn-noi', x.ghiChu));
      const d = dem(x.ht); the.append(tao('span', 'phu', `${d.mo} góp ý mở · ${d.cho} đề xuất chờ duyệt (cả hành trình)`));
      if (!x.thuHoi) {
        const hang = tao('div', 'pn-nut');
        const cp = tao('button', 'nut-nhe', 'Sao chép link'); cp.type = 'button';
        cp.onclick = async () => { try { await navigator.clipboard.writeText(url); A.toast('Đã chép link góp ý.'); } catch { prompt('Chép link này:', url); } };
        const mo2 = tao('a', 'nut-nhe nut-a', 'Mở'); mo2.href = url; mo2.target = '_blank'; mo2.rel = 'noopener';
        const th = tao('button', 'nut-nhe nguy', 'Thu hồi'); th.type = 'button';
        th.onclick = async () => { if (!confirm(`Thu hồi link v${x.v} của «${tenHt(x.ht)}»? Người đang mở sẽ không xem/góp ý tiếp được (góp ý đã có vẫn giữ).`)) return; try { await goi(`/api/review/chia-se/${x.ma}/thu-hoi`, {}); tai(); } catch (e) { A.toast(`Không thu hồi được: ${e.message}`, true); } };
        hang.append(cp, mo2, th); the.append(hang);
      }
      than.append(the);
    }
  }
  async function chiaSe(ht, ghiChu) {
    const l = A.timLan(ht); if (!l?.goc) return;
    A.toast('Đang dựng ảnh chụp hành trình + sơ đồ quy trình…');
    let qt = ''; try { qt = await A.svgHanhTrinh(ht); } catch { qt = ''; }
    const man = l.buoc.filter((k) => Object.hasOwn(A.MAN, k)).map((k) => { const m = A.MAN[k]; return { key: k, ten: m.ten, html: m.html, w: m.w, h: m.h, pb: A.PB[k]?.hien || 0 }; });
    try {
      const s = await goi('/api/review/chia-se', { ht, ghiChu, man, qt });
      const url = `${location.origin}/r/${s.ma}`;
      try { await navigator.clipboard.writeText(url); A.toast(`Đã tạo link v${s.v} cho «${l.ten}» và chép vào bộ nhớ tạm.`); } catch { A.toast(`Đã tạo link v${s.v}: ${url}`); }
      D.loc.ht = ht; await tai();
      return s;
    } catch (e) { A.toast(`Không tạo được link: ${e.message}`, true); return null; }
  }

  return {
    tai, mo, dem, chiaSe, chapNhan, xemDeXuat,
    nhanRv(m) { if (m.loai === 'thay' && m.key) A.napLai(m.key); clearTimeout(this.hen); this.hen = setTimeout(tai, 250); },
    du: () => D.du,
  };
}
