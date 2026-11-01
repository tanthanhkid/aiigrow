// ✦ Trợ lý AI — panel chat bên phải của bàn. Vòng agent (LangGraph.js) nằm trong /vendor/tro-ly-ai.js (bundle từ tro-ly/agent.mjs),
// nạp lười khi gửi lệnh đầu tiên. Key Claude = key của bàn (⚙ Cài đặt, localStorage «bs.key»), chỉ gửi tới api.anthropic.com;
// LangSmith (tuỳ chọn) lưu «bs.langsmith». Tool = đúng các tool MCP của bàn qua /mcp cùng origin (quyền của người đang chat).
import { dauChuQuan } from './gop-y.js';

const $ = (s) => document.querySelector(s);
const KHOA_CHAT = 'bs.tro-ly.chat', KHOA_TL = 'bs.tro-ly', KHOA_LS = 'bs.langsmith';
const MODEL = [['claude-sonnet-5-5', 'Sonnet 5.5'], ['claude-opus-5-5', 'Opus 5.5']];
const doc = (k, md) => { try { const v = localStorage.getItem(k); return v == null ? md : JSON.parse(v); } catch { return md; } };
const ghi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* đầy / bị chặn: bỏ qua */ } };
const docKey = () => { try { return localStorage.getItem('bs.key') || ''; } catch { return ''; } };
const tenNguoi = () => { try { return (localStorage.getItem('bs.ten') || '').slice(0, 40); } catch { return ''; } };
const el = (tag, cls, chu) => { const e = document.createElement(tag); if (cls) e.className = cls; if (chu != null) e.textContent = chu; return e; };

const TEN_VIEC = { xoa_man: 'Xoá màn', thay_man: 'Thay màn', gop_dung_chung: 'Gộp thành màn dùng chung', tach_dung_chung: 'Tách khỏi dùng chung',
  khoi_phuc_phien_ban: 'Khôi phục phiên bản màn', xoa_bien_the: 'Xoá biến thể', don_bien_the: 'Dọn biến thể (vào thùng rác)', chap_nhan_de_xuat: 'Accept đề xuất (đổi thiết kế gốc)',
  tu_choi_de_xuat: 'Từ chối đề xuất', xoa_gop_y: 'Xoá hẳn góp ý', khoi_phuc_tu_nhat_ky: 'Khôi phục trạng thái từ nhật ký', thu_hoi_link_gop_y: 'Thu hồi link góp ý',
 };

const cd = Object.assign({ model: MODEL[0][0], tuLam: false }, doc(KHOA_TL, {}));
let chat = doc(KHOA_CHAT, []); if (!Array.isArray(chat)) chat = [];
let dangChay = null; // AbortController của lượt đang chạy
let modAgent = null;

// ---------- dựng khung ----------
const pn = $('#pn-tl'), than = $('#tl-than'), nhap = $('#tl-nhap');
for (const [v, t] of MODEL) $('#tl-model').add(new Option(t, v, false, v === cd.model));
$('#tl-tu-lam').checked = !!cd.tuLam;
$('#tl-model').onchange = () => { cd.model = $('#tl-model').value; ghi(KHOA_TL, cd); };
$('#tl-tu-lam').onchange = () => { cd.tuLam = $('#tl-tu-lam').checked; ghi(KHOA_TL, cd); };

function mo(bat = pn.hidden) {
  pn.hidden = !bat; document.body.classList.toggle('mo-tl', bat); $('#nut-tro-ly').setAttribute('aria-expanded', String(bat));
  if (bat) { if (!dangChay) ve(); setTimeout(() => nhap.focus(), 30); } // đang chạy: giữ nguyên DOM (thẻ «Làm / Bỏ» đang chờ, tin đang stream)
}
$('#nut-tro-ly').onclick = () => mo();
$('#pn-tl-dong').onclick = () => mo(false);
$('#tl-moi').onclick = () => { if (dangChay) return; chat = []; ghi(KHOA_CHAT, chat); ve(); nhap.focus(); };
$('#tl-dung').onclick = () => dangChay?.abort();
nhap.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#tl-form').requestSubmit(); } });
$('#tl-form').addEventListener('submit', (e) => { e.preventDefault(); const t = nhap.value.trim(); if (t && !dangChay) { nhap.value = ''; guiLenh(t); } });
addEventListener('keydown', (e) => { // «/» mở Trợ lý (khi không gõ trong ô nhập)
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) { e.preventDefault(); mo(true); }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pn.hidden && dangChay == null && document.activeElement === nhap) mo(false); });

// ---------- LangSmith (tuỳ chọn) trong ⚙ Cài đặt ----------
$('#nut-cai-dat').addEventListener('click', () => { const ls = doc(KHOA_LS, {}); $('#cd-ls-key').value = ls.key || ''; $('#cd-ls-du-an').value = ls.project || ''; });
$('#hop-cai-dat').addEventListener('submit', () => {
  const key = $('#cd-ls-key').value.trim(), project = $('#cd-ls-du-an').value.trim().slice(0, 80);
  if (key) ghi(KHOA_LS, { key, project }); else { try { localStorage.removeItem(KHOA_LS); } catch { /* bỏ qua */ } }
  if (!pn.hidden && !dangChay) ve();
});

// ---------- vẽ ----------
// Chữ của agent → DOM an toàn (textContent): **đậm**, `mã`, dòng «- », và [[key|Tên]] thành nút bay tới khung.
function veChu(cha, s) {
  for (const dong of String(s).split('\n')) {
    const p = el(/^\s*[-•]\s/.test(dong) ? 'li' : 'p'); const t = dong.replace(/^\s*[-•]\s/, '');
    for (const m of t.split(/(\[\[[^\]|]{1,80}(?:\|[^\]]{0,120})?\]\]|\*\*[^*]+\*\*|`[^`]+`)/g)) {
      if (!m) continue;
      const lk = /^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/.exec(m);
      if (lk) { const b = el('button', 'tl-man', lk[2] || lk[1]); b.type = 'button'; b.title = `Bay tới ${lk[1]}`; b.onclick = () => { if (!window.__bs?.denKhung?.(lk[1].trim())) b.classList.add('mat'); }; p.append(b); }
      else if (m.startsWith('**')) p.append(el('b', '', m.slice(2, -2)));
      else if (m.startsWith('`')) p.append(el('code', '', m.slice(1, -1)));
      else p.append(m);
    }
    if (!dong.trim()) p.classList.add('trong');
    cha.append(p);
  }
}
function veBuoc(cha, b) {
  const d = el('details', `tl-buoc${b.loi ? ' loi' : ''}${b.ket == null ? ' chay' : ''}`);
  const s = el('summary', '', `${b.ket == null ? '⏳' : b.loi ? '✕' : '✓'} ${b.ten}`); d.append(s);
  if (b.args) d.append(el('pre', '', `vào: ${b.args}`));
  if (b.ket != null) d.append(el('pre', '', `ra: ${b.ket}`));
  for (const a of b.anh || []) { const i = el('img'); i.src = a; i.alt = `Ảnh ${b.ten}`; i.loading = 'lazy'; d.append(i); }
  cha.append(d); return d;
}
function veTin(m) {
  const a = el('article', `tl-tin tl-${m.vai}`);
  if (m.vai === 'nguoi') a.append(el('p', '', m.chu));
  else {
    if (m.buoc?.length) { const g = el('div', 'tl-cac-buoc'); for (const b of m.buoc) veBuoc(g, b); a.append(g); }
    const c = el('div', 'tl-chu'); veChu(c, m.chu || (m.dang ? '…' : '')); a.append(c);
    if (m.loi) a.append(el('p', 'tl-loi', m.loi));
  }
  return a;
}
function veHuongDanKey() {
  const a = el('article', 'tl-tin tl-he');
  a.append(el('b', '', 'Chưa có key Claude'));
  a.append(el('p', '', 'Trợ lý chạy bằng key Claude của chính bạn. Mở ⚙ Cài đặt → dán «API key Claude» (sk-ant-…, lấy ở platform.claude.com → API keys) → Lưu. Key chỉ nằm trong trình duyệt này và chỉ gửi tới api.anthropic.com.'));
  const b = el('button', 'nut-chinh', 'Mở ⚙ Cài đặt'); b.type = 'button'; b.onclick = () => $('#nut-cai-dat').click(); a.append(b);
  return a;
}
function ve() {
  than.replaceChildren();
  const key = docKey();
  if (!key || key.toLowerCase().startsWith('mock')) than.append(veHuongDanKey());
  if (!chat.length) {
    const a = el('article', 'tl-tin tl-he');
    a.append(el('p', '', 'Ra lệnh bằng lời, Trợ lý tự làm trên bàn. Ví dụ:'));
    for (const v of ['tạo 3 biến thể cho màn đang chọn theo kiểu tối giản', 'nối nút Bắt đầu của Welcome sang màn Đăng ký', 'thay màn Ví điểm bằng biến thể 2', 'thêm màn Cài đặt thông báo sau màn Hồ sơ', 'gộp các màn Máy của con thành dùng chung']) {
      const b = el('button', 'tl-goi-y', v); b.type = 'button'; b.onclick = () => { nhap.value = v; nhap.focus(); }; a.append(b);
    }
    a.append(el('p', 'phu', `Thao tác xoá/thay/gộp/khôi phục sẽ hỏi «Làm / Bỏ» trước${cd.tuLam ? ' — đang BẬT «Tự làm không hỏi»' : ''}. ${doc(KHOA_LS, {}).key ? 'LangSmith tracing: bật.' : ''}`));
    than.append(a);
  }
  for (const m of chat) than.append(veTin(m));
  than.scrollTop = than.scrollHeight;
}

// ---------- thẻ xác nhận ----------
function xacNhan({ ten, args }) {
  return new Promise((ok) => {
    const a = el('article', 'tl-tin tl-xac-nhan');
    a.append(el('b', '', `${TEN_VIEC[ten] || ten}?`));
    // tên màn đọc được (tránh bấm «Làm» nhầm màn trùng tên): «Tên màn · Hành trình» (key)
    const tenMan = (k) => { const m = window.__bs?.MAN?.[k]; return m ? `«${m.ten}» (${k})` : k; };
    const dich = [...new Set([args?.key, ...(Array.isArray(args?.keys) ? args.keys : []), ...(Array.isArray(args?.thay_doi) ? args.thay_doi.map((x) => x?.key) : [])].filter(Boolean))];
    if (dich.length) a.append(el('p', 'tl-dich', dich.map(tenMan).join(' + ')));
    const tom = Object.entries(args || {}).filter(([k]) => !/html|tra_loi|^keys?$/.test(k)).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ');
    if (tom) a.append(el('p', 'phu', tom.slice(0, 400)));
    a.append(el('p', 'phu', 'Quay lại được bằng Lịch sử phiên bản / 🗑 Thùng rác / 🕘 Lịch sử thay đổi.'));
    const h = el('div', 'hang'); const lam = el('button', 'nut-chinh', 'Làm'), bo = el('button', '', 'Bỏ'); lam.type = bo.type = 'button';
    const xong = (v) => { lam.disabled = bo.disabled = true; a.classList.add(v ? 'da-lam' : 'da-bo'); a.append(el('p', 'phu', v ? '→ Làm' : '→ Bỏ')); ok(v); };
    lam.onclick = () => xong(true); bo.onclick = () => xong(false);
    dangChay?.signal.addEventListener('abort', () => { if (!lam.disabled) xong(false); });
    h.append(lam, bo); a.append(h); than.append(a); than.scrollTop = than.scrollHeight; lam.focus();
  });
}

// ---------- chạy một lệnh ----------
async function guiLenh(lenh) {
  const key = docKey();
  if (!key || key.toLowerCase().startsWith('mock')) { ve(); $('#nut-cai-dat').click(); return; }
  // lịch sử gửi Claude: chỉ cặp (người → AI) trọn vẹn, AI không lỗi — luôn bắt đầu bằng người, không hai lượt người liền nhau
  const cap = []; for (let i = 0; i + 1 < chat.length; i++) if (chat[i].vai === 'nguoi' && chat[i + 1].vai === 'ai' && !chat[i + 1].loi && chat[i + 1].chu) { cap.push({ vai: 'nguoi', chu: chat[i].chu }, { vai: 'ai', chu: chat[i + 1].chu }); i++; }
  const lichSu = cap.slice(-12);
  chat.push({ vai: 'nguoi', chu: lenh, t: Date.now() });
  const m = { vai: 'ai', chu: '', buoc: [], dang: true, t: Date.now() }; chat.push(m);
  ve(); let the = than.lastElementChild;
  const ctl = new AbortController(); dangChay = ctl;
  $('#tl-dung').hidden = false; $('#tl-gui').hidden = true; pn.classList.add('dang-chay');
  const theBuoc = new Map(); let hen = 0;
  const veLai = () => { clearTimeout(hen); hen = setTimeout(() => { const moi = veTin(m); the.replaceWith(moi); the = moi; than.scrollTop = than.scrollHeight; }, 60); };
  try {
    modAgent ||= await import('/vendor/tro-ly-ai.js').catch(() => { throw new Error('Chưa dựng gói Trợ lý (/vendor/tro-ly-ai.js) — chủ quản chạy `npm install` rồi khởi động lại bàn.'); });
    const ls = doc(KHOA_LS, {});
    await modAgent.chay({ key, model: cd.model, lenh, lichSu, nguCanh: window.__bs?.nguCanhTroLy?.() || {}, signal: ctl.signal,
      dau: () => ({ ...dauChuQuan(), 'x-bs-nguoi': encodeURIComponent(tenNguoi()) }), tuLam: () => cd.tuLam,
      langsmith: ls.key ? ls : null,
      xacNhan: async (x) => { const v = await xacNhan(x); m.buoc.push({ ten: `xác nhận ${TEN_VIEC[x.ten] || x.ten}`, ket: v ? 'Làm' : 'Bỏ' }); veLai(); return v; },
      onSuKien: (e) => {
        if (e.loai === 'chu') { m.chu += e.chu; }
        else if (e.loai === 'tool') { const b = { ten: e.ten, args: tomTat(e.args), ket: null }; m.buoc.push(b); theBuoc.set(e.id, b); }
        else if (e.loai === 'tool-xong') { const b = theBuoc.get(e.id) || (m.buoc.push({ ten: e.ten }), m.buoc.at(-1)); b.ket = e.ket; b.loi = e.loi; b.anh = e.anh; }
        veLai();
      } });
  } catch (e) {
    m.loi = ctl.signal.aborted ? 'Đã dừng.' : loiDe(e);
  } finally {
    m.dang = false; dangChay = null; clearTimeout(hen);
    $('#tl-dung').hidden = true; $('#tl-gui').hidden = false; pn.classList.remove('dang-chay');
    for (const b of m.buoc) if (b.ket == null) { b.ket = '(không xong)'; b.loi = true; }
    luuChat(); ve(); nhap.focus();
  }
}
const tomTat = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 500 ? `${s.slice(0, 500)}…` : s; };
function loiDe(e) {
  const s = String(e?.message || e);
  if (/MCP HTTP 401|Cần mật khẩu MCP/.test(s)) return 'Bàn không cho Trợ lý gọi tool: qua tên miền, Trợ lý cần cổng mật khẩu chung đang bật và phiên đăng nhập còn hạn — tải lại trang, đăng nhập lại; nếu bàn chưa đặt mật khẩu chung thì chủ quản đặt «matKhau» trong chu-quan.json (hoặc dùng 127.0.0.1).';
  if (/401|authentication|invalid x-api-key/i.test(s)) return 'Key Claude không hợp lệ (401) — kiểm lại ở ⚙ Cài đặt.';
  if (/429|rate.?limit/i.test(s)) return 'Claude đang giới hạn tốc độ (429) — đợi một lát rồi gửi lại.';
  if (/529|overloaded/i.test(s)) return 'Claude đang quá tải (529) — thử lại sau ít phút.';
  return `Lỗi: ${s.slice(0, 300)}`;
}
function luuChat() { // bỏ ảnh khỏi bản lưu, giữ 60 tin gần nhất
  chat = chat.slice(-60);
  ghi(KHOA_CHAT, chat.map((x) => ({ ...x, dang: undefined, buoc: x.buoc?.map((b) => ({ ten: b.ten, args: b.args, ket: b.ket, loi: b.loi })) })));
}
