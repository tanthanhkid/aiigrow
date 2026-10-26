// Con trỏ realtime + đồng bộ bảng giữa nhiều người cùng mở bàn (cả qua tunnel).
// Toạ độ gửi theo hệ CANVAS (thế giới), mỗi người zoom/pan khác nhau vẫn đúng chỗ. Tên luôn hiển thị bằng textContent.
const KHOA_TEN = 'bs.ten';
const NHIP_TRO = 50, NHIP_NHIN = 250, LANG = 60000; // 20 lần/giây · khung nhìn 4 lần/giây · im 60s thì ẩn
const docTen = () => { try { return (localStorage.getItem(KHOA_TEN) || '').slice(0, 40); } catch { return ''; } };
const ghiTen = (v) => { try { localStorage.setItem(KHOA_TEN, v); } catch { /* bỏ qua */ } };
export function mauTen(ten) { // màu cố định theo tên
  let h = 0; for (const c of ten || '') h = (h * 31 + c.codePointAt(0)) >>> 0;
  return `hsl(${h % 360} 70% 42%)`;
}
const chuDau = (ten) => ([...(ten || '?').trim()][0] || '?').toUpperCase();

// C: { st, vung, phong, sec(), cheDo(), suaId(), doiSec(sec, cheDo), datView({x,y,z}), dom, toast, nhanSu(m), nhanBt(f), nhanXoa(ids) }
export function taoRealtime(C) {
  const $ = (s) => document.querySelector(s);
  const ban = new Map();   // id → {id, ten, mau, tro:{x,y,sec,cd,t}, ve:{x,y}, nhin, chon, el}
  let ws = null, toi = '', lui = 1000, henNoi = 0, lanTro = 0, lanNhin = 0, chuot = null, diTheo = '', chonCu = '';
  let ten = docTen();
  const lop = document.createElement('div'); lop.id = 'lop-tro'; C.vung.appendChild(lop);

  // ---------- tên ----------
  function hoiTen(batBuoc) {
    const l = $('#lop-ten'); l.hidden = false;
    $('#ten-nhap').value = ten; $('#ten-dong').hidden = batBuoc; setTimeout(() => $('#ten-nhap').focus(), 30);
  }
  $('#hop-ten').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#ten-nhap').value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
    if (!v) { $('#ten-nhap').focus(); return; }
    const cu = ten; ten = v; ghiTen(v); $('#lop-ten').hidden = true;
    if (!cu || !ws) moKetNoi(); else gui({ t: 'ten', ten: v });
    veNguoi();
  });
  $('#ten-dong').onclick = () => { $('#lop-ten').hidden = true; };

  // ---------- kết nối ----------
  function moKetNoi() {
    if (!ten) return;
    clearTimeout(henNoi);
    const u = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?phong=${encodeURIComponent(C.phong)}&ten=${encodeURIComponent(ten)}`;
    try { ws = new WebSocket(u); } catch { henLai(); return; }
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } nhan(m); };
    ws.onopen = () => { lui = 1000; lanNhin = 0; guiNhin(true); guiChon(true); veNguoi(); };
    ws.onclose = () => { ws = null; for (const p of ban.values()) p.el?.remove(); ban.clear(); veNguoi(); veChon(); henLai(); };
  }
  function henLai() { clearTimeout(henNoi); henNoi = setTimeout(moKetNoi, lui); lui = Math.min(lui * 2, 15000); }
  const gui = (m) => { if (ws?.readyState === 1) { try { ws.send(JSON.stringify(m)); return true; } catch { /* rớt */ } } return false; };

  function nguoi(id, ten0) {
    let p = ban.get(id);
    if (!p) { p = { id, ten: ten0 || 'Khách', mau: mauTen(ten0) }; ban.set(id, p); }
    return p;
  }
  function nhan(m) {
    if (m.t === 'chao') { C.khiChao?.(m); toi = m.id; for (const x of m.nguoi) { const p = nguoi(x.id, x.ten); if (x.tro) p.tro = { ...x.tro, t: Date.now() }; p.nhin = x.nhin; p.chon = x.chon; } veNguoi(); veChon(); chay(); return; }
    if (m.t === 'cham') { C.khiCham?.(m); return; } // máy chủ bỏ gói vì vượt nhịp: gửi lại sau
    if (m.id === toi) return;
    if (m.t === 'vao') { nguoi(m.id, m.ten); veNguoi(); return; }
    if (m.t === 'ra') { const p = ban.get(m.id); p?.el?.remove(); ban.delete(m.id); if (diTheo === m.id) boTheo(); veNguoi(); veChon(); return; }
    const p = ban.get(m.id); if (!p) return;
    if (m.t === 'ten') { p.ten = m.ten; p.mau = mauTen(m.ten); p.el?.remove(); p.el = null; veNguoi(); veChon(); }
    else if (m.t === 'tro') { p.tro = { x: m.x, y: m.y, sec: m.sec, cd: m.cd, t: Date.now() }; chay(); }
    else if (m.t === 'roi') { p.tro = null; p.ve = null; chay(); }
    else if (m.t === 'nhin') { p.nhin = m; if (diTheo === p.id) theoKip(p); }
    else if (m.t === 'chon') { p.chon = m; veChon(); }
    else if (m.t === 'su') C.nhanSu(m, p);
    else if (m.t === 'bt') C.nhanBt(m.f, p);
  }

  // ---------- gửi ----------
  const veCanvas = (cx, cy) => { const r = C.vung.getBoundingClientRect(); const { x, y, z } = C.st.view; return { x: (cx - r.left - x) / z, y: (cy - r.top - y) / z }; };
  function guiTro(ep) {
    if (!chuot) return;
    const now = Date.now(); if (!ep && now - lanTro < NHIP_TRO) { clearTimeout(guiTro.h); guiTro.h = setTimeout(() => guiTro(true), NHIP_TRO); return; }
    lanTro = now; const p = veCanvas(chuot.x, chuot.y);
    gui({ t: 'tro', x: p.x, y: p.y, sec: C.sec(), cd: C.cheDo() });
  }
  function guiNhin(ep) {
    const now = Date.now(); if (!ep && now - lanNhin < NHIP_NHIN) { clearTimeout(guiNhin.h); guiNhin.h = setTimeout(() => guiNhin(true), NHIP_NHIN); return; }
    lanNhin = now; const r = C.vung.getBoundingClientRect(); const { x, y, z } = C.st.view;
    gui({ t: 'nhin', x: -x / z, y: -y / z, w: r.width / z, h: r.height / z, sec: C.sec(), cd: C.cheDo() });
  }
  function guiChon(ep) {
    const m = { t: 'chon', ids: [...C.st.chon], sua: C.suaId() || null }; const k = JSON.stringify(m);
    if (!ep && k === chonCu) return; chonCu = k; gui(m);
  }
  addEventListener('pointermove', (e) => {
    const r = C.vung.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { if (chuot) { chuot = null; gui({ t: 'roi' }); } return; }
    chuot = { x: e.clientX, y: e.clientY }; guiTro();
  }, { passive: true });
  // chuột trong iframe (khung đang sống / chế độ Sửa) không nổi lên trang: nghe trực tiếp qua lớp phủ của từng khung là đủ cho con trỏ thô
  // document không phát mouseleave đáng tin: chuột ra khỏi cửa sổ = mouseout không có relatedTarget
  addEventListener('mouseout', (e) => { if (!e.relatedTarget && chuot) { chuot = null; gui({ t: 'roi' }); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { chuot = null; gui({ t: 'roi' }); } else guiNhin(true); });

  // ---------- vẽ con trỏ (nội suy mượt, mũi tên ở mép khi ngoài khung nhìn) ----------
  let dangChay = false;
  function chay() { if (!dangChay) { dangChay = true; requestAnimationFrame(khung); } }
  function khung() {
    const r = C.vung.getBoundingClientRect(); const { x, y, z } = C.st.view; const now = Date.now(); let con = false;
    for (const p of ban.values()) {
      const t = p.tro; const hien = t && t.sec === C.sec() && t.cd === C.cheDo() && now - t.t < LANG;
      if (!hien) { if (p.el) p.el.hidden = true; continue; }
      if (!p.el) {
        p.el = document.createElement('div'); p.el.className = 'tro-nguoi';
        p.el.innerHTML = '<svg width="18" height="22" viewBox="0 0 18 22" aria-hidden="true"><path d="M1 1 L1 18 L5.5 13.5 L9 21 L12 19.6 L8.6 12.4 L15 12.4 Z" stroke="#fff" stroke-width="1.5"/></svg><span class="ten-tro"></span><i class="mui-mep"></i>';
        lop.appendChild(p.el);
      }
      p.el.hidden = false; p.el.style.setProperty('--mau', p.mau); p.el.querySelector('path').setAttribute('fill', p.mau);
      p.el.querySelector('.ten-tro').textContent = p.ten;
      p.ve ||= { x: t.x, y: t.y };
      p.ve.x += (t.x - p.ve.x) * 0.35; p.ve.y += (t.y - p.ve.y) * 0.35;
      if (Math.abs(t.x - p.ve.x) + Math.abs(t.y - p.ve.y) > 0.5) con = true;
      const sx = x + p.ve.x * z, sy = y + p.ve.y * z, W = r.width, H = r.height, le = 14;
      const ngoai = sx < 0 || sy < 0 || sx > W || sy > H;
      p.el.classList.toggle('mep', ngoai);
      if (ngoai) {
        const cx = Math.min(W - le, Math.max(le, sx)), cy = Math.min(H - le, Math.max(le, sy));
        p.el.style.transform = `translate(${cx}px,${cy}px)`;
        p.el.querySelector('.mui-mep').style.transform = `rotate(${Math.atan2(sy - cy, sx - cx)}rad)`;
      } else p.el.style.transform = `translate(${sx}px,${sy}px)`;
    }
    if (con) requestAnimationFrame(khung); else { dangChay = false; setTimeout(() => { if ([...ban.values()].some((p) => p.tro)) chay(); }, 1000); } // vẫn quét để ẩn người im 60s
  }

  // ---------- dãy avatar + nhảy tới / đi theo ----------
  function veNguoi() {
    const d = $('#nguoi'); if (!d) return; d.innerHTML = '';
    const toiEl = document.createElement('button'); toiEl.type = 'button'; toiEl.className = 'avt toi' + (ws?.readyState === 1 ? '' : ' mat');
    toiEl.textContent = chuDau(ten); toiEl.style.setProperty('--mau', mauTen(ten));
    toiEl.title = ten ? `${ten} (bạn) — bấm để đổi tên${ws?.readyState === 1 ? '' : ' · đang nối lại…'}` : 'Đặt tên để cộng tác';
    toiEl.onclick = () => hoiTen(false); d.appendChild(toiEl);
    for (const p of ban.values()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'avt' + (diTheo === p.id ? ' theo' : '');
      b.textContent = chuDau(p.ten); b.style.setProperty('--mau', p.mau); b.title = `${p.ten} — bấm: nhảy tới / đi theo`; b.dataset.id = p.id;
      b.onclick = (e) => { e.stopPropagation(); moMenu(p, b); };
      d.appendChild(b);
    }
  }
  function moMenu(p, b) {
    $('#menu-nguoi')?.remove();
    const m = document.createElement('div'); m.id = 'menu-nguoi';
    m.innerHTML = '<b></b><button type="button" data-l="nhay">Nhảy tới chỗ đang xem</button><button type="button" data-l="theo"></button>';
    m.querySelector('b').textContent = p.ten;
    m.querySelector('[data-l="theo"]').textContent = diTheo === p.id ? 'Thôi đi theo' : 'Đi theo khung nhìn (Esc thoát)';
    const r = b.getBoundingClientRect(); m.style.top = `${r.bottom + 6}px`; m.style.right = `${Math.max(8, innerWidth - r.right)}px`;
    m.onclick = (e) => {
      const l = e.target.closest('button')?.dataset.l; if (!l) return; m.remove();
      if (l === 'nhay') nhayToi(p);
      else if (diTheo === p.id) boTheo(); else { diTheo = p.id; nhayToi(p); veNguoi(); $('#di-theo').hidden = false; $('#di-theo span').textContent = `Đang đi theo ${p.ten}`; }
    };
    document.body.appendChild(m);
    setTimeout(() => addEventListener('pointerdown', function dong(e) { if (!m.contains(e.target)) { m.remove(); removeEventListener('pointerdown', dong, true); } }, true), 0);
  }
  function nhayToi(p) {
    const n = p.nhin || (p.tro && { x: p.tro.x - 400, y: p.tro.y - 300, w: 800, h: 600, sec: p.tro.sec, cd: p.tro.cd });
    if (!n) { C.toast(`${p.ten} chưa gửi vị trí.`); return; }
    if (n.sec !== C.sec() || n.cd !== C.cheDo()) C.doiSec(n.sec, n.cd);
    theoKip(p, n);
  }
  function theoKip(p, n = p.nhin) {
    if (!n || n.w <= 0 || n.h <= 0) return;
    if (n.sec !== C.sec() || n.cd !== C.cheDo()) C.doiSec(n.sec, n.cd);
    const r = C.vung.getBoundingClientRect(); const z = Math.min(4, Math.max(0.03, Math.min(r.width / n.w, r.height / n.h)));
    C.datView({ z, x: r.width / 2 - (n.x + n.w / 2) * z, y: r.height / 2 - (n.y + n.h / 2) * z });
  }
  function boTheo() { if (!diTheo) return; diTheo = ''; $('#di-theo').hidden = true; veNguoi(); guiNhin(true); }
  $('#di-theo button').onclick = boTheo;
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && diTheo) { boTheo(); e.stopImmediatePropagation(); } }, true);
  C.vung.addEventListener('pointerdown', boTheo); C.vung.addEventListener('wheel', boTheo, { passive: true });

  // ---------- người khác đang chọn / sửa khung nào ----------
  function veChon() {
    for (const el of document.querySelectorAll('.khung.nguoi-chon')) { el.classList.remove('nguoi-chon'); el.style.removeProperty('--mau-nguoi'); el.querySelector('.tag-nguoi')?.remove(); }
    for (const p of ban.values()) {
      const c = p.chon; if (!c) continue;
      for (const id of new Set([...(c.ids || []), ...(c.sua ? [c.sua] : [])])) {
        const el = C.dom.get(id)?.el; if (!el || el.classList.contains('nguoi-chon')) continue;
        el.classList.add('nguoi-chon'); el.style.setProperty('--mau-nguoi', p.mau);
        const t = document.createElement('span'); t.className = 'tag-nguoi'; t.textContent = `${p.ten}${c.sua === id ? ' đang sửa' : ' đang chọn'}`;
        el.appendChild(t);
      }
    }
  }

  if (ten) moKetNoi(); else hoiTen(true);
  veNguoi();
  return {
    khiDoiView() { if (!diTheo) guiNhin(); if (chuot) guiTro(); if (ban.size) chay(); }, // đang đi theo: không phát khung nhìn (hai người theo nhau sẽ thu nhỏ mãi)
    khiVe() { guiChon(); veChon(); },
    phat: gui,
    ten: () => ten,
    nguoi: () => [...ban.values()].map((p) => ({ id: p.id, ten: p.ten, tro: p.tro, chon: p.chon })),
  };
}
