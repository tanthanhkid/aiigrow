// Bàn brainstorm giao diện AiiGrow — canvas kiểu Figma xếp theo HÀNH TRÌNH + Claude sinh biến thể + chế độ Play (prototype).
// Vanilla JS, không build.
import { taiHanhTrinh } from './hanh-trinh/index.js';
import { taoQuyTrinh } from './quy-trinh.js';
import { heThong, loiNguoiDung, tachKetQua, loiHanhTrinh, tachHanhTrinh, HUONG } from './prompt.js';
import { ganToi } from './gan-toi.js';
import * as Sua from './che-do-sua.js';
import { taoRealtime } from './realtime.js';
import * as CL from './claude.js';
import { ganGopY, dauChuQuan } from './gop-y.js';
import { ganLichSu } from './lich-su.js';

const $ = (s) => document.querySelector(s);
const MODELS = [['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5']];
const DAU = 34;          // thanh tiêu đề khung
const HDR = 190;         // đầu hàng hành trình (tiêu đề + khoảng thở)
const GX = 240;          // khoảng giữa hai bước
const GV = 150;          // khoảng trên mỗi hàng biến thể (chỗ ghi ý tưởng)
const GH = 48;           // khoảng giữa các biến thể trong hàng
const GLAN = 240;        // khoảng giữa hai hàng hành trình
const KHOA_LUU = 'bs.v2', KHOA_KEY = 'bs.key', KHOA_CD = 'bs.cai-dat';
const ZOOM_SONG = 0.4;   // dưới mức này dùng ảnh thu nhỏ thay iframe
const LE_AO = 500;       // lề (px màn hình) quanh viewport vẫn giữ iframe
// Section kiểu Pages của Figma: chỉ dựng section đang mở.
const SEC_MAP = { 'bm-lan-dau': 'bm-dau', 'bm-ghep-may': 'bm-dau', 'bm-hang-ngay': 'bm-ngay', 'bm-ung-dung': 'bm-ngay',
  'bm-duyet': 'bm-nv', 'bm-nhiem-vu': 'bm-nv', 'bm-bao-cao': 'bm-nv', 'bm-cai-dat': 'bm-cd',
  'web-tai': 'bo-cai', 'con-cai-win': 'bo-cai', 'con-cai-mac': 'bo-cai', 'con-dt-cai': 'bo-cai' };
const SEC_TEN = { 'bm-dau': 'Ba Mẹ · Lần đầu & ghép máy', 'bm-ngay': 'Ba Mẹ · Hằng ngày', 'bm-nv': 'Ba Mẹ · Duyệt, nhiệm vụ & báo cáo',
  'bm-cd': 'Ba Mẹ · Cài đặt & hỗ trợ', 'bo-cai': 'Bộ cài & trang tải' };

// ---------- lưu trữ cục bộ (mọi truy cập bọc try/catch) ----------
const doc = (k, macDinh) => { try { const v = localStorage.getItem(k); return v == null ? macDinh : JSON.parse(v); } catch { return macDinh; } };
const ghi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const docKey = () => { try { return localStorage.getItem(KHOA_KEY) || ''; } catch { return ''; } };
const ghiKey = (v) => { try { v ? localStorage.setItem(KHOA_KEY, v) : localStorage.removeItem(KHOA_KEY); } catch { /* bỏ qua */ } };

const caiDat = Object.assign({ model: MODELS[0][0], modelKhac: '', maxTokens: 16000, soBt: 4, soPa: 2, lienKet: true, lkChon: true, anhThat: false }, doc(KHOA_CD, {}));
const luuCaiDat = () => ghi(KHOA_CD, caiDat);
const MOCK_URL = new URLSearchParams(location.search).has('mock');
const laMock = () => MOCK_URL || docKey().toLowerCase().startsWith('mock');
const modelDung = () => (caiDat.modelKhac || '').trim() || $('#chon-model').value || caiDat.model;

// ---------- dữ liệu màn gốc ----------
const { ds: HANH_TRINH, loi: LOI_TAI } = await taiHanhTrinh();
const MAN = {};       // key → {key, ten, w, h, html, anh, toi, lan, buoc}
const LAN_GOC = [];   // hàng hành trình gốc
for (const h of HANH_TRINH) {
  const lan = { id: h.id, vai: h.vai, nen: h.nen, ten: h.ten, mo: h.mo || '', buoc: h.buoc.map((b) => b.key), goc: true };
  LAN_GOC.push(lan);
  h.buoc.forEach((b, i) => { MAN[b.key] = { ...b, lan: h.id, buoc: i }; });
  // gắn data-toi lên nút dẫn sang bước kế (theo chữ trong «…» của nhãn hành động)
  h.buoc.forEach((b, i) => { const ke = h.buoc[i + 1]; if (ke && b.toi) MAN[b.key].html = ganToi(MAN[b.key].html, b.toi, ke.key, ke.ten); });
}
for (const m of Object.values(MAN)) m.goc0 = { html: m.html, w: m.w, h: m.h }; // v0 = bản trong mã

// ---------- phiên bản màn («Thay màn»): kho trên máy chủ, ai mở bàn (kể cả qua tunnel) cũng thấy ----------
const PB = {};               // key → manifest {hien, ds:[{v, t, tep, w, h, nhan, yTuong, nguon, tu}]}
const HTML_PB = new Map();   // `${key}/${tep}` → HTML
const mucPb = (key, v) => PB[key]?.ds.find((x) => x.v === v);
async function htmlPhienBan(key, v) {
  const muc = v ? mucPb(key, v) : null;
  if (!muc || !muc.tep) return MAN[key].goc0.html; // v0 hoặc bản khôi phục về v0
  const k = `${key}/${muc.tep}`;
  if (!HTML_PB.has(k)) {
    const r = await fetch(`/api/phien-ban/${encodeURIComponent(key)}/${muc.tep}`);
    const j = await r.json(); if (!r.ok || typeof j.html !== 'string') throw new Error(j.loi || r.status);
    HTML_PB.set(k, lamSach(j.html));
  }
  return HTML_PB.get(k);
}
// đặt bản hiện của màn: giữ data-toi (bản mới thiếu thì gắn lại theo nhãn bước như bản trong mã)
async function apPhienBan(key) {
  const m = MAN[key]; const pb = PB[key]; const muc = mucPb(key, pb?.hien);
  let html = await htmlPhienBan(key, muc?.v || 0);
  if (PB[key] !== pb) return; // trong lúc tải đã có Thay màn/Khôi phục mới hơn: bản đó tự áp
  const l = LAN_GOC.find((x) => x.id === m.lan); const ke = l?.buoc[m.buoc + 1];
  if (ke && m.toi && !/data-toi=/.test(html)) html = ganToi(html, m.toi, ke, MAN[ke]?.ten);
  m.html = html; m.w = muc?.w || m.goc0.w; m.h = muc?.h || m.goc0.h; m.pbV = muc?.v || 0; // pbV: phiên bản ĐÚNG của m.html (PB có thể đi trước khi đang tải)
}
// Nạp sau lần vẽ đầu (không chặn trang): màn nào có bản đã thay thì đổi sang bản đó khi tải xong.
async function taiPhienBan() {
  let ds; try { const r = await fetch('/api/phien-ban'); if (!r.ok) return; ds = await r.json(); } catch { return; } // máy chủ cũ: dùng bản trong mã
  const loi = [];
  await Promise.all(Object.entries(ds).map(async ([key, m]) => {
    if (!MAN[key] || !Array.isArray(m?.ds) || PB[key]) return; // PB đã có: phiên này vừa Thay màn, giữ bản mới hơn
    try { PB[key] = m; await apPhienBan(key); } catch { if (PB[key] === m) { loi.push(key); delete PB[key]; MAN[key].html = MAN[key].goc0.html; } }
  }));
  if (loi.length) toast(`Không tải được phiên bản đã thay của: ${loi.join(', ')} — đang hiện bản trong mã.`, true);
}


// ---------- trạng thái ----------
const KHOA_VIEW = 'bs.view';
// biến thể + phương án hành trình nằm trong kho chung trên máy chủ (napKho ở cuối tệp); localStorage chỉ còn cài đặt, key, tên, khung nhìn
const st = { khung: [], lanBt: [], view: { x: 40, y: 40, z: 0.2 }, chon: new Set(), lanChon: null, dangChay: new Map(), viTriLan: new Map() };
for (const k of Object.keys(MAN)) st.khung.push({ id: k, loai: 'goc', key: k });
const viewDaLuu = doc(KHOA_VIEW, null) || {};
st.views = viewDaLuu && !Number.isFinite(viewDaLuu.z) ? viewDaLuu : {};

const timKhung = (id) => st.khung.find((f) => f.id === id);
const kichThuoc = (f) => (f.loai === 'goc' ? { w: MAN[f.key].w, h: MAN[f.key].h } : { w: f.w, h: f.h });
const htmlCua = (f) => (f.loai === 'goc' ? MAN[f.key].html : f.html || '');
const keyCua = (f) => (f.loai === 'goc' ? f.key : f.goc);
const tenCua = (f) => (f.loai === 'goc' ? MAN[f.key].ten : f.nhan || MAN[f.goc]?.ten || 'Biến thể');
const timLan = (id) => LAN_GOC.find((l) => l.id === id) || st.lanBt.find((l) => l.id === id);
const lanCuaKhung = (f) => (f.lan ? timLan(f.lan) : timLan(MAN[keyCua(f)]?.lan));
const nhomCua = (f) => { const l = timLan(MAN[keyCua(f)]?.lan); return l ? `${l.vai} · ${l.nen}` : ''; };
const maSec = (l) => SEC_MAP[l.id] || `${l.vai}-${l.nen}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const SECTIONS = [];
for (const l of LAN_GOC) { const id = maSec(l); let s = SECTIONS.find((x) => x.id === id); if (!s) SECTIONS.push(s = { id, ten: SEC_TEN[id] || `${l.vai} · ${l.nen}`, lan: [] }); s.lan.push(l.id); }
{ const thu = Object.keys(SEC_TEN); const hang = (x) => (x.id === 'bo-cai' ? 99 : thu.includes(x.id) ? thu.indexOf(x.id) : 50); SECTIONS.sort((p, q) => hang(p) - hang(q)); }
const secCuaLan = (l) => { const g = l && (l.goc ? l : timLan(l.tu)); return g ? maSec(g) : ''; };
const secTu = (id) => (SECTIONS.some((x) => x.id === id) ? id : '');
// hash: #<section> (canvas) hoặc #qt:<section> (Quy trình)
const docHash = () => { const h = decodeURIComponent(location.hash.slice(1)); return h.startsWith('qt:') ? { cheDo: 'qt', sec: secTu(h.slice(3)) } : { cheDo: h ? 'canvas' : '', sec: secTu(h) }; };
{ const h = docHash(); st.sec = h.sec || secTu(caiDat.sec) || SECTIONS[0]?.id; st.cheDo = h.cheDo || (caiDat.cheDo === 'qt' ? 'qt' : 'canvas'); }
const khoaView = () => (st.cheDo === 'qt' ? 'qt:' : '') + st.sec;
const ghiHash = () => { try { history.replaceState(null, '', `#${st.cheDo === 'qt' ? 'qt:' : ''}${encodeURIComponent(st.sec)}`); } catch { /* bỏ qua */ } };
const lanHien = (l) => st.cheDo !== 'qt' && secCuaLan(l) === st.sec;
if (st.views[khoaView()]) st.view = { ...st.views[khoaView()] };

let henLuu = 0;
let rt = null; // lớp realtime (gán khi khởi động)
// mọi thay đổi biến thể/phương án đi qua đây: so với bản máy chủ đang có rồi gửi phần khác (dongBoKho ở cuối tệp)
function luuLai(ms = 300) { clearTimeout(henLuu); henLuu = setTimeout(() => dongBoKho(), ms); }
let henView = 0;
function luuView() { st.views[khoaView()] = { ...st.view }; clearTimeout(henView); henView = setTimeout(() => ghi(KHOA_VIEW, st.views), 300); }
function doiSec(id, { bay = true, cheDo = st.cheDo } = {}) {
  if (!secTu(id) || (id === st.sec && cheDo === st.cheDo)) return;
  st.sec = id; caiDat.sec = id; st.cheDo = cheDo; caiDat.cheDo = cheDo; luuCaiDat();
  ghiHash();
  st.chon.clear(); st.lanChon = null; st.thay = null;
  document.body.classList.toggle('che-do-qt', cheDo === 'qt');
  veTatCa(); // vẽ sơ đồ section mới trước, rồi mới bật lớp (để hàng chụp ảnh không chạy theo section cũ)
  qt.bat(cheDo === 'qt');
  if (st.views[khoaView()]) { st.view = { ...st.views[khoaView()] }; apView(); } else if (bay) vuaMan();
}
const doiCheDo = () => doiSec(st.sec, { cheDo: st.cheDo === 'qt' ? 'canvas' : 'qt' });
addEventListener('hashchange', () => { const h = docHash(); if (h.sec) doiSec(h.sec, { cheDo: h.cheDo || 'canvas' }); });

// ---------- SẮP XẾP: hàng hành trình xếp dọc; biến thể thành cây theo tầng ngay dưới khung cha; không bao giờ chồng ----------
function conCua(id) { return st.khung.filter((f) => f.cha === id && !f.lan && f.loai === 'bien'); }
function hangBienThe(nut, lech, ra) {
  const con = conCua(nut.id);
  const dot = [...new Set(con.map((f) => f.dot))];
  for (const d of dot) {
    const ds = con.filter((f) => f.dot === d).sort((a, b) => a.k - b.k);
    ra.push({ lech, ds, cha: nut.id });
    let x = lech;
    for (const f of ds) { hangBienThe(f, x, ra); x += f.w + GH; }
  }
  return ra;
}
function thuTuLan() {
  const ra = [];
  for (const g of LAN_GOC) { ra.push(g); for (const b of st.lanBt) if (b.tu === g.id) ra.push(b); }
  return ra;
}
function khungCuaLan(l, key) { return l.goc ? timKhung(key) : st.khung.find((f) => f.lan === l.id && f.goc === key); }
function sapXep() {
  // biến thể mất cha (cha bị xoá) → nối về màn gốc của nó
  for (const f of st.khung) if (f.loai === 'bien' && !f.lan && !timKhung(f.cha)) f.cha = f.goc;
  let y = 0;
  st.hangY = [];
  for (const l of thuTuLan()) {
    if (!lanHien(l)) { st.viTriLan.delete(l.id); continue; }
    const tren = y + HDR; let x = 0; let day = tren;
    for (const key of l.buoc) {
      const f = khungCuaLan(l, key); if (!f) continue;
      const k = kichThuoc(f);
      f.x = x; f.y = tren; let rong = k.w; let yy = tren + DAU + k.h;
      day = Math.max(day, yy);
      for (const h of hangBienThe(f, 0, [])) {
        yy += GV;
        let xx = x + h.lech; let cao = 0;
        for (const b of h.ds) { b.x = xx; b.y = yy; xx += b.w + GH; cao = Math.max(cao, b.h + DAU); }
        rong = Math.max(rong, xx - GH - x);
        st.hangY.push({ x: x + h.lech, y: yy, ds: h.ds });
        yy += cao;
      }
      day = Math.max(day, yy);
      x += rong + GX;
    }
    st.viTriLan.set(l.id, { x: 0, y, w: Math.max(x - GX, 900), h: day - y });
    y = day + GLAN;
  }
}

// ---------- vẽ ----------
const vung = $('#vung'), theGioi = $('#the-gioi'), svgNoi = $('#noi');
let GY = null;       // phần «Góp ý» (gop-y.js), gắn ở cuối tệp
const dom = new Map();   // id khung → {el, iframe, ban, lk}
const domLan = new Map();

function apView() {
  const { x, y, z } = st.view;
  theGioi.style.transform = `translate(${x}px,${y}px) scale(${z})`;
  vung.style.backgroundSize = `${24 * z}px ${24 * z}px`;
  vung.style.backgroundPosition = `${x}px ${y}px`;
  $('#nut-zoom').textContent = `${Math.round(z * 100)}%`;
  henAo();
  Sua.khiDoiView();
  rt?.khiDoiView();
}

// Ảo hoá: iframe chỉ sống khi khung nằm trong viewport (+ lề) và zoom ≥ 40%; còn lại là ảnh thu nhỏ / khung xám.
let henAoId = 0;
function henAo() { cancelAnimationFrame(henAoId); henAoId = requestAnimationFrame(capNhatAo); }
function capNhatAo() {
  if (st.cheDo === 'qt') { qt.capNhatAo(ZOOM_SONG, LE_AO); return; }
  const r = vung.getBoundingClientRect(); const { x, y, z } = st.view;
  const thay = new Set();
  for (const [id, d] of dom) {
    const f = d.f; if (!f) continue;
    const { w, h } = kichThuoc(f);
    const sx = x + f.x * z, sy = y + f.y * z, sw = w * z, sh = (h + DAU) * z;
    const trong = sx + sw > -LE_AO && sx < r.width + LE_AO && sy + sh > -LE_AO && sy < r.height + LE_AO;
    if (trong) thay.add(id);
    datSong(f, d, (trong && z >= ZOOM_SONG) || Sua.giuSong(id)); // khung đang Sửa luôn giữ iframe sống
  }
  const cu = st.thay; st.thay = thay;
  if (!cu || cu.size !== thay.size || [...thay].some((id) => !cu.has(id))) henVeNoi();
}
function datSong(f, d, song) {
  if (song === !!d.iframe && (d.iframe || (d.daAnh && d.daAnh === d.bam))) return; // không đổi gì
  const than = d.el.querySelector('.than');
  if (song && !d.iframe && htmlCua(f)) {
    const ifr = document.createElement('iframe');
    ifr.setAttribute('sandbox', 'allow-same-origin'); // không script; cùng nguồn để đo nút data-toi
    ifr.referrerPolicy = 'no-referrer';
    const { w, h } = kichThuoc(f); ifr.width = w; ifr.height = h; ifr.title = tenCua(f);
    ifr.addEventListener('load', () => { if (d.iframe === ifr) d.el.classList.add('song'); doLienKet(f.id); }); // giữ ảnh thu nhỏ tới khi iframe tải xong
    d.iframe = ifr; d.banIfr = htmlCua(f); ifr.srcdoc = d.banIfr;
    than.prepend(ifr);
  } else if (!song && d.iframe) { d.iframe.remove(); d.iframe = null; d.el.classList.remove('song'); }
  if (!d.iframe) xepAnh(f);
}
// mã băm rẻ để nhận ra HTML đã đổi (khoá cho ảnh thu nhỏ + liên kết đã đo)
function bam(sv) { let h = 0x811c9dc5, g = 5381; for (let i = 0; i < sv.length; i++) { const c = sv.charCodeAt(i); h = Math.imul(h ^ c, 16777619); g = ((g << 5) + g + c) | 0; } return `${sv.length}:${h >>> 0}:${g >>> 0}`; }
const anhNho = new Map();  // băm → objectURL; giữ tối đa 400 (ảnh nhỏ pixelRatio 0.45), bỏ cái ít dùng nhất mà không khung nào đang hiện
const loiChup = new Map(); // băm → số lần chụp lỗi
let dangDungNgoai = () => []; // ảnh thu nhỏ chế độ Quy trình đang hiện (gán sau khi tạo qt)
function ghiAnhNho(k, url) {
  const cu = anhNho.get(k);
  if (cu && url !== cu) { URL.revokeObjectURL(url); return; } // canvas và Quy trình lỡ chụp trùng: giữ bản đã có, không rò blob
  anhNho.set(k, url);
  if (anhNho.size <= 400) return;
  const dangDung = new Set([...dom.values()].map((d) => d.bam).concat(dangDungNgoai())); dangDung.add(k);
  for (const [k0, u0] of anhNho) {
    if (anhNho.size <= 400) break;
    if (dangDung.has(k0)) continue;
    anhNho.delete(k0); lkDo.delete(k0); if (u0) URL.revokeObjectURL(u0);
  }
}
const lkDo = new Map();    // băm → [liên kết đã đo]
const hangCho = [];        // khung chờ chụp ảnh thu nhỏ
let dangChup = false;
function bamCua(f, d) { const html = htmlCua(f); if (d.banBam !== html) { d.banBam = html; d.bam = html ? bam(html) : ''; } return d.bam; }
function xepAnh(f) {
  const d = dom.get(f.id); if (!d || f.tt === 'dang' || !htmlCua(f)) return;
  const k = bamCua(f, d);
  if (anhNho.has(k)) { const u = anhNho.get(k); anhNho.delete(k); anhNho.set(k, u); if (u) datAnhNho(d, u); d.daAnh = k; return; } // chạm = mới dùng (LRU)
  if (d.daAnh !== k) { d.el.querySelector('.anh-nho')?.remove(); d.daAnh = ''; } // HTML đã đổi: bỏ ảnh của bản cũ, hiện khung xám tới khi có ảnh mới
  if ((loiChup.get(k) || 0) >= 2) return; // chụp lỗi 2 lần: để khung xám
  if (!hangCho.includes(f.id)) hangCho.push(f.id);
  if (!dangChup) setTimeout(chupHang, 30);
}
function datAnhNho(d, url) {
  let img = d.el.querySelector('.anh-nho');
  if (!img) { img = document.createElement('img'); img.className = 'anh-nho'; img.alt = ''; img.decoding = 'async'; img.draggable = false; d.el.querySelector('.than').prepend(img); }
  if (img.getAttribute('src') !== url) img.src = url;
}
async function chupHang() {
  if (dangChup) return; dangChup = true;
  try {
    while (hangCho.length) {
      // ưu tiên khung gần tâm viewport
      const r = vung.getBoundingClientRect(); const { x, y, z } = st.view;
      const cx = (r.width / 2 - x) / z, cy = (r.height / 2 - y) / z;
      let tot = 0, kc = Infinity;
      hangCho.forEach((hid, i) => { const g = timKhung(hid); if (!g) return; const v = Math.hypot(g.x - cx, g.y - cy); if (v < kc) { kc = v; tot = i; } });
      const id = hangCho.splice(tot, 1)[0]; const f = timKhung(id); const d = dom.get(id);
      if (!f || !d || f.tt === 'dang' || !htmlCua(f)) continue;
      const k = bamCua(f, d);
      if (!anhNho.has(k)) {
        try {
          const { blob, lk } = await chupAnh(htmlCua(f), kichThuoc(f), { pixelRatio: 0.45, skipFonts: true, doLk: true });
          ghiAnhNho(k, URL.createObjectURL(blob)); loiChup.clear(); // chụp được lại ⇒ lỗi trước có thể chỉ thoáng qua, cho thử lại
          if (lk) { lkDo.set(k, lk); const d2 = dom.get(id); if (d2 && bamCua(f, d2) === k && !d2.lk.length) { d2.lk = lk; henVeNoi(); } }
        } catch { loiChup.set(k, (loiChup.get(k) || 0) + 1); continue; }
      }
      const d3 = dom.get(id);
      if (d3 && !d3.iframe && bamCua(f, d3) === k && anhNho.get(k)) { datAnhNho(d3, anhNho.get(k)); d3.daAnh = k; }
      await new Promise((r) => setTimeout(r, 10));
    }
  } finally { dangChup = false; }
}

function taoDom(f) {
  const el = document.createElement('div');
  el.className = 'khung'; el.dataset.id = f.id;
  el.innerHTML = `<div class="dau-khung"><span class="nhom-ten"></span><span class="ghim" hidden>★</span><span class="ten"></span><span class="tt"></span><button type="button" class="nut-ls" title="Lịch sử phiên bản của màn" hidden></button><button type="button" class="nut-thay" title="Thay màn hiện tại bằng biến thể này (bản cũ vẫn trong Lịch sử)" hidden>✓ Thay màn</button><button type="button" class="nut-xoa-k" title="Xoá biến thể (⌘Z hoàn tác)" hidden>✕ Xoá</button><button type="button" class="nut-play" title="Play từ màn này">▶</button></div>
    <div class="than"><div class="xam"><span></span></div><div class="phu-chuot"></div></div>`;
  theGioi.appendChild(el);
  const d = { el, iframe: null, ban: '', lk: [] };
  el.querySelector('.nut-play').onclick = (e) => { e.stopPropagation(); moPlay(f.id); };
  el.querySelector('.nut-thay').onclick = (e) => { e.stopPropagation(); thayBangKhung(f.id); };
  el.querySelector('.nut-xoa-k').onclick = (e) => { e.stopPropagation(); xoaKhung([f.id]); };
  el.querySelector('.nut-ls').onclick = (e) => { e.stopPropagation(); moLichSu(keyCua(f)); };
  dom.set(f.id, d);
  return d;
}

function doLk(tl) {
  return [...tl.querySelectorAll('[data-toi]')].map((n) => {
    const r = n.getBoundingClientRect();
    return { toi: n.getAttribute('data-toi'), x: r.left, y: r.top, w: r.width, h: r.height, chu: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
  }).filter((l) => l.w > 0 && l.h > 0);
}
function doLienKet(id) {
  const d = dom.get(id); const f = timKhung(id); if (!d || !d.iframe || !f) return;
  try { d.lk = doLk(d.iframe.contentDocument); if (f.tt !== 'dang') lkDo.set(bamCua(f, d), d.lk); } catch { /* giữ số đo cũ */ }
  henVeNoi();
}

function veKhung(f) {
  const lan = lanCuaKhung(f);
  const an = !lan || !lanHien(lan);
  if (an) { const cu = dom.get(f.id); if (cu) { cu.el.remove(); dom.delete(f.id); } return; } // ngoài section: không dựng gì
  const d = dom.get(f.id) || taoDom(f);
  d.f = f;
  const { w, h } = kichThuoc(f);
  d.el.style.left = `${f.x}px`; d.el.style.top = `${f.y}px`; d.el.style.width = `${w}px`;
  d.el.classList.toggle('chon', st.chon.has(f.id));
  d.el.classList.toggle('bien', f.loai !== 'goc');
  const than = d.el.querySelector('.than');
  than.style.width = `${w}px`; than.style.height = `${h}px`;
  if (d.iframe) { d.iframe.width = w; d.iframe.height = h; d.iframe.title = tenCua(f); }
  d.el.querySelector('.xam span').textContent = tenCua(f);
  const m = MAN[keyCua(f)];
  const laMockKhung = f.loai !== 'goc' && (f.model === 'mock' || (!!f.lan && timLan(f.lan)?.model === 'mock'));
  d.el.querySelector('.nhom-ten').textContent = (f.loai === 'goc' ? `Bước ${m.buoc + 1}` : f.lan ? `PA ${timLan(f.lan)?.k || ''} · ${m.ten}` : 'Biến thể') + (laMockKhung ? ' · mock' : '');
  d.el.querySelector('.nhom-ten').classList.toggle('mock', laMockKhung);
  d.el.querySelector('.ten').textContent = tenCua(f);
  d.el.querySelector('.ghim').hidden = !f.ghim;
  const pb = f.loai === 'goc' && PB[f.key];
  const nLs = d.el.querySelector('.nut-ls'); nLs.hidden = !pb; if (pb) nLs.textContent = `v${pb.hien} · Lịch sử`;
  d.el.querySelector('.nut-thay').hidden = !duocThay(f);
  d.el.querySelector('.nut-xoa-k').hidden = f.loai === 'goc' || !!f.lan || f.tt === 'dang' || dangDungBt(f);
  const tt = d.el.querySelector('.tt');
  tt.className = 'tt' + (f.tt === 'loi' ? ' loi' : '');
  tt.textContent = f.tt === 'dang' ? (f.tienDo || 'đang sinh…') : f.tt === 'loi' ? 'lỗi' : dangDungBt(f) ? `✓ đang dùng (v${PB[keyCua(f)].hien})` : f.dung ? chuDung(f.dung) : '';
  tt.title = f.dung ? chuDung(f.dung, true) : '';
  const html = htmlCua(f);
  if (html && d.ban !== html) {
    d.ban = html;
    const k = bamCua(f, d); d.lk = lkDo.get(k) || (f.tt === 'dang' ? d.lk : []);
    if (d.iframe && d.banIfr !== html) { d.banIfr = html; d.iframe.srcdoc = html; }
    if (!d.iframe) xepAnh(f);
  }
  // lớp ảnh thật
  let anh = than.querySelector('.anh-that');
  if (caiDat.anhThat && f.loai === 'goc' && m.anh && !daThayKhacGoc(f.key)) {
    if (!anh) { anh = document.createElement('img'); anh.className = 'anh-that'; anh.alt = 'Ảnh chụp thật'; than.appendChild(anh); }
    anh.src = `/ref/${m.anh}`; anh.classList.toggle('ghep', /\/ss-/.test(m.anh));
  } else if (anh) anh.remove();
  // lớp tiến độ / lỗi
  let td = than.querySelector('.tien-do');
  if (f.tt === 'dang' || f.tt === 'loi') {
    if (!td) { td = document.createElement('div'); td.className = 'tien-do'; than.appendChild(td); }
    if (f.tt === 'dang') {
      td.className = 'tien-do' + (html ? ' mo' : '');
      if (!td.querySelector('.vach')) td.innerHTML = '<div class="chu-td"></div><div class="vach"><i></i></div>';
      td.querySelector('.chu-td').textContent = f.tienDo || 'Đang gọi Claude…';
    } else {
      td.className = 'tien-do loi';
      td.innerHTML = '<div class="chu-td"></div><button type="button">Thử lại</button>';
      td.querySelector('.chu-td').textContent = f.loi || 'Lỗi không rõ';
      td.querySelector('button').onclick = (e) => { e.stopPropagation(); thuLai(f.id); };
    }
  } else if (td) td.remove();
}

const so = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(n || 0));
function chuDung(u, dai = false) {
  if (dai) return `Token — vào: ${u.vao || 0}, ghi cache: ${u.ghi || 0}, đọc cache: ${u.doc || 0}, ra: ${u.ra || 0}`;
  return `cache ${u.doc ? `đọc ${so(u.doc)}` : `ghi ${so(u.ghi)}`} · ra ${so(u.ra)}`;
}

function veDauLan() {
  const con = new Set();
  for (const l of thuTuLan()) {
    const vt = st.viTriLan.get(l.id);
    if (!vt) continue;
    con.add(l.id);
    let el = domLan.get(l.id);
    if (!el) {
      el = document.createElement('div'); el.className = 'dau-lan' + (l.goc ? '' : ' pa'); el.dataset.lan = l.id;
      el.innerHTML = `<div class="nhan-lan"></div><div class="ten-lan"></div><div class="mo-lan"></div><div class="nut-lan">
        <button type="button" data-l="play">▶ Play hành trình</button><button type="button" data-l="sinh">✨ Biến thể cả hành trình</button>${l.goc ? '<button type="button" data-l="gy">💬 Chia sẻ để góp ý</button>' : '<button type="button" data-l="xoa" class="nguy">Xoá phương án</button>'}</div>`;
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return; // bấm nền đầu hàng: xử lý ở thaKeo (pointer capture nuốt click)
        if (b.dataset.l === 'play') moPlay(khungCuaLan(l, l.buoc[0])?.id, l.id);
        else if (b.dataset.l === 'sinh') chonLan(l.id, true);
        else if (b.dataset.l === 'xoa') xoaPhuongAn(l.id);
        else if (b.dataset.l === 'gy') GY?.mo('cs', l.id);
      });
      theGioi.appendChild(el); domLan.set(l.id, el);
    }
    el.hidden = false;
    el.style.left = `${vt.x}px`; el.style.top = `${vt.y}px`; el.style.width = `${vt.w}px`;
    el.classList.toggle('chon', st.lanChon === l.id);
    const g = l.goc ? l : timLan(l.tu);
    el.querySelector('.nhan-lan').textContent = l.goc ? `${l.vai} · ${l.nen} · ${l.buoc.length} bước` : `Phương án ${l.k}/${l.n} cho «${g.ten}» · ${l.model || ''}${l.dung ? ' · ' + chuDung(l.dung) : ''}`;
    el.querySelector('.ten-lan').textContent = l.goc ? l.ten : `${l.nhan || 'Đang sinh…'}${l.tt === 'loi' ? ' — lỗi: ' + (l.loi || '') : ''}`;
    el.querySelector('.mo-lan').textContent = l.goc ? l.mo : `💡 ${l.yTuong}`;
  }
  for (const [id, el] of domLan) if (!con.has(id)) { if (timLan(id)) el.hidden = true; else { el.remove(); domLan.delete(id); } }
}

// Mũi tên: từ đúng nút có data-toi trong khung tới cạnh màn đích; nhãn = chữ trên nút.
function dichCua(f, key) {
  if (!MAN[key]) return null;
  if (f.lan) { const t = st.khung.find((x) => x.lan === f.lan && x.goc === key); if (t && htmlCua(t)) return t; }
  return timKhung(key);
}
let henNoi = 0;
// đích các liên kết của khung (để giữ mũi tên khi khung nguồn ra ngoài viewport mà đích vẫn thấy)
function ds0(f) { const d = dom.get(f.id); const m = MAN[keyCua(f)]; const ids = (d?.lk || []).map((L) => dichCua(f, L.toi)?.id);
  if (f.loai === 'goc' && m.toi) ids.push(timLan(m.lan).buoc[m.buoc + 1]); return ids.filter(Boolean); }
function henVeNoi() { cancelAnimationFrame(henNoi); henNoi = requestAnimationFrame(veNoi); }
function veNoi() {
  theGioi.querySelectorAll('.nhan-lk,.nhan-y').forEach((n) => n.remove());
  let s = '<defs><marker id="mui" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>';
  // cây biến thể: đường chấm từ cha xuống từng con + ý tưởng trên mỗi hàng
  for (const h of st.hangY || []) {
    const cha = timKhung(h.ds[0].cha); if (!cha) continue;
    const kc = kichThuoc(cha); const x1 = cha.x + kc.w / 2, y1 = cha.y + DAU + kc.h;
    for (const f of h.ds) { const x2 = f.x + f.w / 2, y2 = f.y; const my = y1 + (y2 - y1) * 0.55; s += `<path class="cay" d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}"/>`; }
    const f0 = h.ds[0];
    const n = document.createElement('div'); n.className = 'nhan-y';
    n.textContent = `💡 ${f0.yTuong}${f0.model ? ' · ' + f0.model : ''}`; n.title = f0.yTuong;
    n.style.left = `${h.x}px`; n.style.top = `${h.y - 64}px`; n.style.maxWidth = `${Math.max(600, h.ds.length * (f0.w + GH))}px`;
    theGioi.appendChild(n);
  }
  st.lk = [];
  if (caiDat.lienKet) {
    for (const f of st.khung) {
      const d = dom.get(f.id); if (!d || d.el.hidden) continue;
      if (st.thay && !st.thay.has(f.id) && !ds0(f).some((t) => st.thay.has(t))) continue; // chỉ tính mũi tên của khung đang thấy
      let ds = d.lk;
      const m = MAN[keyCua(f)];
      if (!ds.length && f.loai === 'goc' && m.toi) { const ke = timLan(m.lan).buoc[m.buoc + 1]; if (ke) ds = [{ toi: ke, chu: m.toi, du: true }]; }
      for (const L of ds) {
        const T = dichCua(f, L.toi); const dT = T && dom.get(T.id);
        if (!T || T === f || !dT || dT.el.hidden) continue;
        if (caiDat.lkChon && st.chon.size && !st.chon.has(f.id) && !st.chon.has(T.id)) continue;
        st.lk.push({ f, T, L });
      }
    }
    st.lk.forEach(({ f, T, L }, i) => {
      const kF = kichThuoc(f), kT = kichThuoc(T);
      const top = f.y + DAU, ex = f.x + kF.w;
      const sy = L.du ? top + kF.h / 2 : Math.min(top + kF.h - 8, Math.max(top + 8, top + L.y + L.h / 2));
      const sx = L.du ? ex : f.x + Math.min(kF.w - 4, L.x + L.w);
      let d, mx, my;
      if (T.x >= ex + 20) {
        const tx = T.x, ty = Math.min(T.y + DAU + kT.h - 24, Math.max(T.y + DAU + 24, sy));
        const c = Math.max(60, (tx - ex) / 2);
        d = `M${sx},${sy} L${ex},${sy} C${ex + c},${sy} ${tx - c},${ty} ${tx},${ty}`;
        mx = (ex + tx) / 2; my = (sy + ty) / 2;
      } else {
        const tx = T.x + kT.w / 2, ty = T.y - 4, dinh = Math.min(f.y, T.y) - 120;
        d = `M${sx},${sy} L${ex},${sy} C${ex + 180},${sy} ${tx},${dinh} ${tx},${ty}`;
        mx = (ex + 3 * (ex + 180) + 3 * tx + tx) / 8; my = (sy + 3 * sy + 3 * dinh + ty) / 8;
      }
      s += `<g class="lk" data-i="${i}"><path class="hit" d="${d}"/><path class="duong" d="${d}" marker-end="url(#mui)"/>${L.du ? '' : `<circle cx="${sx}" cy="${sy}" r="6"/>`}</g>`;
      const n = document.createElement('div'); n.className = 'nhan-lk'; n.dataset.i = i;
      n.textContent = L.chu || '→'; n.style.left = `${mx}px`; n.style.top = `${my}px`;
      theGioi.appendChild(n);
    });
  }
  svgNoi.innerHTML = s;
}
function noiBatLk(i, bat) {
  const lk = st.lk?.[i]; if (!lk) return;
  svgNoi.querySelector(`g.lk[data-i="${i}"]`)?.classList.toggle('dam', bat);
  theGioi.querySelector(`.nhan-lk[data-i="${i}"]`)?.classList.toggle('dam', bat);
  dom.get(lk.T.id)?.el.classList.toggle('noi-bat', bat);
}
svgNoi.addEventListener('pointerover', (e) => { const g = e.target.closest('g.lk'); if (g) noiBatLk(+g.dataset.i, true); });
svgNoi.addEventListener('pointerout', (e) => { const g = e.target.closest('g.lk'); if (g) noiBatLk(+g.dataset.i, false); });

function veTatCa(xep = true) {
  for (const c of [...st.chon]) if (!timKhung(c)) st.chon.delete(c);
  if (xep) sapXep();
  const con = new Set(st.khung.map((f) => f.id));
  for (const [id, d] of dom) if (!con.has(id)) { d.el.remove(); dom.delete(id); }
  st.khung.forEach(veKhung);
  veDauLan(); henVeNoi(); veBang(); veBen();
  if (st.cheDo === 'qt' && qtDaVe !== st.sec) { qtDaVe = st.sec; qt.ve(st.sec, SECTIONS.find((x) => x.id === st.sec)?.lan || []); }
  if (st.cheDo !== 'qt') qtDaVe = '';
  $('#nut-qt').classList.toggle('bat', st.cheDo === 'qt');
  henAo(); Sua.khiDoiView(); rt?.khiVe();
  $('#nut-so-sanh').disabled = !(st.chon.size >= 2 && st.chon.size <= 4);
  $('#nut-so-sanh').textContent = st.chon.size >= 2 ? `So sánh (${st.chon.size})` : 'So sánh';
  $('#nut-lk').classList.toggle('bat', caiDat.lienKet);
  $('#nut-anh').classList.toggle('bat', caiDat.anhThat);
}

// ---------- thanh bên: danh sách hành trình ----------
function veBen() {
  const cs = $('#chon-sec'); // cửa sổ hẹp (thanh bên ẩn): chọn section ở thanh trên
  if (cs.options.length !== SECTIONS.length) {
    cs.innerHTML = SECTIONS.map((x) => `<option value="${x.id}"></option>`).join('');
    [...cs.options].forEach((o, i) => { o.textContent = SECTIONS[i].ten; });
    cs.onchange = () => doiSec(cs.value);
  }
  if (cs.value !== st.sec) cs.value = st.sec;
  const ds = $('#ben-ds'); ds.innerHTML = '';
  for (const sec of SECTIONS) {
    const mo = sec.id === st.sec;
    const soMan = sec.lan.reduce((a, id) => a + timLan(id).buoc.length, 0);
    const h = document.createElement('button'); h.type = 'button'; h.className = 'ben-sec' + (mo ? ' bat' : '');
    h.innerHTML = '<span class="t"></span><span class="so"></span>';
    h.querySelector('.t').textContent = sec.ten; h.querySelector('.so').textContent = `${sec.lan.length} · ${soMan} màn`;
    h.setAttribute('aria-expanded', mo); h.onclick = () => doiSec(sec.id);
    ds.appendChild(h);
    if (!mo) continue;
    for (const id of sec.lan) {
      const l = timLan(id);
      for (const x of [l, ...st.lanBt.filter((b) => b.tu === l.id)]) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ben-muc' + (x.goc ? '' : ' pa') + (st.lanChon === x.id ? ' bat' : '');
        b.innerHTML = '<span class="t"></span><span class="so"></span>';
        b.querySelector('.t').textContent = x.goc ? x.ten : `PA ${x.k}: ${x.nhan || x.yTuong}`;
        b.querySelector('.so').textContent = x.goc ? `${x.nen} · ${x.buoc.length}` : '';
        const d = x.goc && GY?.dem(x.id);
        if (d && (d.mo || d.cho)) { const c = document.createElement('span'); c.className = 'dem-gy'; c.title = `${d.mo} góp ý đang mở · ${d.cho} đề xuất chờ duyệt`; c.textContent = `💬${d.mo}${d.cho ? ` ⇄${d.cho}` : ''}`; b.appendChild(c); }
        b.onclick = () => bayToiLan(x.id);
        ds.appendChild(b);
      }
    }
  }
  $('#ben-dem').textContent = `${SECTIONS.length} section · ${LAN_GOC.length} hành trình · ${Object.keys(MAN).length} màn${LOI_TAI.length ? ' · lỗi tải: ' + LOI_TAI.join(', ') : ''}`;
}
function bayToiLan(id) {
  const l = timLan(id); if (!l) return;
  if (!lanHien(l)) doiSec(secCuaLan(l), { bay: false, cheDo: 'canvas' });
  st.lanChon = id; veTatCa(false);
  const vt = st.viTriLan.get(id); if (vt) vuaHop(vt.x, vt.y, vt.x + vt.w, vt.y + Math.min(vt.h, 1400));
}

// ---------- tương tác canvas ----------
function phong(heSo, cx, cy) {
  const r = vung.getBoundingClientRect();
  cx ??= r.left + r.width / 2; cy ??= r.top + r.height / 2;
  const z = Math.min(4, Math.max(0.03, st.view.z * heSo));
  const px = cx - r.left, py = cy - r.top;
  st.view.x = px - (px - st.view.x) * (z / st.view.z);
  st.view.y = py - (py - st.view.y) * (z / st.view.z);
  st.view.z = z; apView(); luuView();
}
function vuaHop(x0, y0, x1, y1) {
  const r = vung.getBoundingClientRect(); const le = 50;
  const rong = r.width - le * 2 - (st.chon.size || st.lanChon ? 360 : 0);
  const z = Math.min(1, rong / (x1 - x0), (r.height - le * 2) / (y1 - y0));
  st.view = { z, x: le - x0 * z, y: le - y0 * z }; apView(); luuView();
}
function vuaMan(ids) {
  if (st.cheDo === 'qt') { const b = qt.hop(); if (b) vuaHop(b.x0 - 20, b.y0 - 20, b.x1 + 20, b.y1 + 20); return; }
  const ds = (ids ? st.khung.filter((f) => ids.includes(f.id)) : st.khung).filter((f) => dom.get(f.id) && !dom.get(f.id).el.hidden);
  if (!ds.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of ds) { const k = kichThuoc(f); x0 = Math.min(x0, f.x); y0 = Math.min(y0, f.y); x1 = Math.max(x1, f.x + k.w); y1 = Math.max(y1, f.y + k.h + DAU); }
  if (!ids) y0 -= HDR;
  vuaHop(x0, y0, x1, y1);
}

vung.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) phong(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
  else { st.view.x -= e.deltaX; st.view.y -= e.deltaY; apView(); luuView(); }
}, { passive: false });

let keo = null, phimCach = false, lanBam = { id: '', t: 0 };
vung.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.button !== 1) return;
  if (e.target.closest('button')) return;
  const khungEl = e.target.closest('.khung');
  if (!khungEl || phimCach || e.button === 1) {
    keo = { loai: 'nen', sx: e.clientX, sy: e.clientY, vx: st.view.x, vy: st.view.y, dich: false, lan: e.button === 0 && !phimCach ? e.target.closest('.dau-lan') : null,
      viec: e.button === 0 && !phimCach ? e.target.closest('#qt-lop g.qt-man') : null };
    vung.classList.add('dang-keo');
  } else {
    const id = khungEl.dataset.id;
    if (!e.shiftKey && lanBam.id === id && e.timeStamp - lanBam.t < 400) { lanBam = { id: '', t: 0 }; xemLon([id]); return; }
    lanBam = { id, t: e.timeStamp };
    if (e.shiftKey) { st.chon.has(id) ? st.chon.delete(id) : st.chon.add(id); }
    else if (!st.chon.has(id)) { st.chon.clear(); st.chon.add(id); }
    st.lanChon = null;
    keo = { loai: 'khung', sx: e.clientX, sy: e.clientY, goc: [...st.chon].map((i) => { const f = timKhung(i); return { f, x: f.x, y: f.y }; }), dich: false };
    veTatCa(false);
  }
  vung.setPointerCapture(e.pointerId);
});
vung.addEventListener('pointermove', (e) => {
  if (!keo) return;
  const dx = e.clientX - keo.sx, dy = e.clientY - keo.sy;
  if (Math.abs(dx) + Math.abs(dy) > 3) keo.dich = true;
  if (keo.loai === 'nen') { st.view.x = keo.vx + dx; st.view.y = keo.vy + dy; apView(); }
  else if (keo.dich) {
    for (const g of keo.goc) { g.f.x = Math.round(g.x + dx / st.view.z); g.f.y = Math.round(g.y + dy / st.view.z); const d = dom.get(g.f.id); d.el.style.left = `${g.f.x}px`; d.el.style.top = `${g.f.y}px`; }
    svgNoi.style.visibility = 'hidden'; // thả ra sẽ xếp lại + vẽ lại liên kết một lần
  }
});
const thaKeo = (e) => {
  if (!keo) return;
  if (keo.loai === 'nen' && !keo.dich && keo.viec && e?.type === 'pointerup') { const m = keo.viec.dataset.man; keo = null; vung.classList.remove('dang-keo'); moPlay(m); return; }
  if (keo.loai === 'nen' && !keo.dich && keo.lan) chonLan(keo.lan.dataset.lan);
  else if (keo.loai === 'nen' && !keo.dich && (st.chon.size || st.lanChon)) { st.chon.clear(); st.lanChon = null; veTatCa(false); }
  // thả khung đã kéo: xếp lại để không bao giờ chồng (vị trí do bộ xếp quyết)
  if (keo.loai === 'khung' && keo.dich) { svgNoi.style.visibility = ''; veTatCa(); }
  const daKeoKhung = keo.loai === 'khung' && keo.dich;
  keo = null; vung.classList.remove('dang-keo'); if (daKeoKhung) luuLai(); else luuView();
};
vung.addEventListener('pointerup', thaKeo);
vung.addEventListener('pointercancel', thaKeo);

const dangGo = (e) => e.target.closest('input,textarea,select');
addEventListener('keydown', (e) => {
  if (!$('#lop-play').hidden) { phimPlay(e); return; }
  if (!$('#lop-ls').hidden) { if (e.key === 'Escape') dongLop(); return; } // hộp Lịch sử mở: phím tắt bàn vẽ không chạy phía sau
  if (e.key === 'Escape') { dongLop(); return; }
  if (dangGo(e)) return;
  if (e.code === 'Space') { phimCach = true; vung.style.cursor = 'grab'; e.preventDefault(); }
  else if (e.key === '+' || e.key === '=') phong(1.2);
  else if (e.key === '-') phong(1 / 1.2);
  else if (e.key === '!' || (e.shiftKey && e.code === 'Digit1')) vuaMan();
  else if (e.key === 'l' || e.key === 'L') batLienKet();
  else if ((e.key === 'b' || e.key === 'B') && !e.metaKey && !e.ctrlKey && !e.altKey) doiCheDo();
  else if (e.key === 'p' || e.key === 'P') moPlay(khungChon()?.id);
  else if ((e.key === 'Delete' || e.key === 'Backspace') && st.chon.size) xoaChon();
});
addEventListener('keyup', (e) => { if (e.code === 'Space') { phimCach = false; vung.style.cursor = ''; } });
// thanh bên trái: ẩn/hiện (\ hoặc ⌘\), nhớ trong localStorage; canvas giãn hết bề ngang rồi tính lại ảo hoá iframe
function datBen(an, luu = true) {
  document.body.classList.toggle('an-ben', an);
  $('#an-ben').setAttribute('aria-expanded', String(!an)); $('#mo-ben').hidden = !an;
  if (luu) { try { localStorage.setItem('bs.an-ben', an ? '1' : '0'); } catch { /* bỏ qua */ } }
  st.thay = null; apView(); henVeNoi(); if (st.cheDo === 'qt') qt.capNhatAo?.(ZOOM_SONG, LE_AO);
}
const doiBen = () => datBen(!document.body.classList.contains('an-ben'));
$('#an-ben').onclick = doiBen; $('#mo-ben').onclick = doiBen;
addEventListener('keydown', (e) => { if (e.key === '\\' && [...document.querySelectorAll('.lop')].every((l) => l.hidden) && !e.altKey && !e.shiftKey && !dangGo(e) && $('#lop-play').hidden && !Sua.dangSua()) { e.preventDefault(); doiBen(); } });
function batLienKet() { caiDat.lienKet = !caiDat.lienKet; luuCaiDat(); veTatCa(false); toast(caiDat.lienKet ? 'Hiện liên kết (L).' : 'Ẩn liên kết (L).'); }
$('#nut-lk').onclick = batLienKet;
$('#nut-anh').onclick = () => { caiDat.anhThat = !caiDat.anhThat; luuCaiDat(); veTatCa(false); toast(caiDat.anhThat ? 'Đang phủ ảnh chụp thật lên màn gốc (màn không có ảnh giữ nguyên).' : 'Tắt ảnh thật.'); };

// ---------- bảng bên phải: chọn khung hoặc chọn cả hành trình ----------
function khungChon() { return st.chon.size ? timKhung([...st.chon].at(-1)) : null; }
function chonLan(id, moY = false) { st.chon.clear(); st.lanChon = id; veTatCa(false); if (moY) $('#y-tuong').focus(); }
function veBang() {
  const f = khungChon(); const l = !f && st.lanChon ? timLan(st.lanChon) : null; const bang = $('#bang');
  bang.hidden = !f && !l;
  if (!f && !l) return;
  bang.classList.toggle('che-do-lan', !!l);
  if (l) {
    const g = l.goc ? l : timLan(l.tu);
    $('#bang-ten').textContent = l.goc ? l.ten : `Phương án ${l.k}: ${l.nhan || ''}`;
    $('#bang-nhom').textContent = `Hành trình · ${g.vai} · ${g.nen} · ${g.buoc.length} màn`;
    $('#nhan-y').textContent = 'Ý của anh cho CẢ hành trình (Claude làm lại mọi màn, giữ nhất quán)';
    $('#nhan-so').textContent = 'Số phương án';
    $('#so-bt').innerHTML = [1, 2, 3, 4].map((n) => `<option ${n === caiDat.soPa ? 'selected' : ''}>${n}</option>`).join('');
    $('#nut-sinh').firstChild.textContent = 'Sinh phương án cho cả hành trình ';
    $('#nut-sinh').disabled = !l.goc && l.tt === 'dang';
  } else {
    $('#bang-ten').textContent = tenCua(f);
    $('#bang-nhom').textContent = f.loai === 'goc' ? `Bước ${MAN[f.key].buoc + 1} · ${timLan(MAN[f.key].lan).ten} · ${nhomCua(f)}` : `Biến thể của «${MAN[f.goc]?.ten || '…'}» · ${nhomCua(f)}`;
    $('#nhan-y').textContent = 'Ý của anh cho biến thể màn này';
    $('#nhan-so').textContent = 'Số biến thể';
    $('#so-bt').innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `<option ${n === caiDat.soBt ? 'selected' : ''}>${n}</option>`).join('');
    $('#nut-sinh').firstChild.textContent = 'Sinh biến thể ';
    $('#nut-thay-bang').hidden = f.loai === 'goc'; $('#nut-thay-bang').disabled = !duocThay(f);
    $('#nut-ls-bang').hidden = f.loai !== 'goc'; $('#nut-ls-bang').textContent = PB[keyCua(f)] ? `Lịch sử (v${PB[keyCua(f)].hien})` : 'Lịch sử (v0)';
    $('#nut-xoa').hidden = f.loai === 'goc'; $('#nut-xoa').disabled = !!f.lan;
    $('#nut-sinh').disabled = !htmlCua(f) || f.tt === 'dang';
  }
  $('#nut-dung').hidden = st.dangChay.size === 0;
}
$('#bang-dong').onclick = () => { st.chon.clear(); st.lanChon = null; veTatCa(false); };

// ---------- gọi Claude (có prompt caching) ----------
// phần gọi Claude/mock/làm sạch nằm ở claude.js (dùng chung với trang góp ý /r/); ở đây chỉ gắn key + model của bàn
const { taiAssets, chayLoat, goiMock, mockSua, lamSach } = CL;
const goiClaude = (o) => CL.goiClaude({ ...o, key: docKey(), model: modelDung(), maxTokens: o.maxTokens || Number(caiDat.maxTokens) || 16000 });

function canKey() {
  if (laMock() || docKey()) return false;
  trangThaiBang('Chưa có API key — mở ⚙ Cài đặt.', true); moCaiDat(); return true;
}

async function sinh() {
  if (!khungChon() && st.lanChon) return sinhHanhTrinh();
  const cha = khungChon(); if (!cha) return;
  if (!htmlCua(cha) || cha.tt === 'dang') { trangThaiBang('Khung này chưa sinh xong — đợi xong (hoặc Thử lại) rồi mới sinh tiếp.', true); return; }
  const y = $('#y-tuong').value.trim();
  if (!y) { trangThaiBang('Gõ ý của anh trước đã.', true); $('#y-tuong').focus(); return; }
  if (canKey()) return;
  const n = Number($('#so-bt').value) || 4;
  caiDat.soBt = n; luuCaiDat();
  const { w, h } = kichThuoc(cha);
  const dot = Date.now().toString(36);
  const moi = [];
  for (let k = 1; k <= n; k++) moi.push({ id: `bt-${dot}-${k}`, loai: 'bien', goc: keyCua(cha), cha: cha.id, dot, k, n, yTuong: y, w, h, x: 0, y: 0, html: '', tt: 'dang', tienDo: 'Đang chờ lượt…', model: laMock() ? 'mock' : modelDung() });
  st.khung.push(...moi);
  for (const f of moi) st.dangChay.set(f.id, new AbortController());
  luuLai(0); // người khác thấy ngay các khung «đang sinh»
  st.chon.clear(); st.chon.add(cha.id); veTatCa(); vuaMan([cha.id, ...moi.map((f) => f.id)]);
  trangThaiBang(`Đang sinh ${n} biến thể bằng ${laMock() ? 'mock' : modelDung()}${n > 1 ? ' — gửi 1 yêu cầu trước để ghi cache…' : '…'}`);
  const kq = await chayLoat(moi.map((f) => (bao) => chay(f, htmlCua(cha), tenCua(cha), bao)));
  const ok = kq.filter((r) => r.status === 'fulfilled' && r.value).length;
  const tong = moi.reduce((a, f) => ({ ghi: a.ghi + (f.dung?.ghi || 0), doc: a.doc + (f.dung?.doc || 0) }), { ghi: 0, doc: 0 });
  toast(`Xong ${ok}/${n} biến thể · cache ghi ${so(tong.ghi)}, đọc ${so(tong.doc)} token.`, ok < n);
  trangThaiBang(`Lượt vừa rồi: cache ghi ${so(tong.ghi)} · đọc ${so(tong.doc)} token.`);
  veTatCa(); luuLai();
}

async function chay(f, htmlGoc, tenGoc, khiBatDau) {
  const ctl = st.dangChay.get(f.id) || new AbortController(); st.dangChay.set(f.id, ctl); veBang();
  if (!laMock()) f.model = modelDung(); else f.model = 'mock';
  f.tt = 'dang'; f.loi = ''; f.htmlGoc = htmlGoc; f.tenGoc = tenGoc; f.tienDo = 'Đang gọi Claude…'; veKhung(f);
  const batDau = Date.now(); let lanVe = 0;
  let lanTach = 0;
  const moiChu = (txt, dung, nghi) => {
    if (Date.now() - lanTach < 400) return; // điều tiết: không quét lại cả chuỗi ở mỗi delta
    lanTach = Date.now();
    const { nhan, html } = tachKetQua(txt);
    f.dung = { ...dung };
    const giay = Math.round((Date.now() - batDau) / 1000);
    f.tienDo = nghi && !txt ? `Claude đang nghĩ… ${giay} giây` : `${(txt.length / 1024).toFixed(1)} kB · ${giay} giây · ${dung.doc ? 'đọc cache ' + so(dung.doc) : 'ghi cache ' + so(dung.ghi)}`;
    if (nhan) f.nhan = nhan;
    if (Date.now() - lanVe > 1200 && html.length > 400) { lanVe = Date.now(); f.html = html; }
    veKhung(f);
  };
  try {
    if (ctl.signal.aborted) throw new DOMException('dừng', 'AbortError');
    const sys = heThong(await taiAssets());
    const user = loiNguoiDung({ y: f.yTuong, html: htmlGoc, w: f.w, h: f.h, ten: tenGoc, k: f.k, n: f.n });
    const { txt, lyDo, dung } = await (laMock()
      ? goiMock({ toan: `Ý TƯỞNG: Mock ${f.k} — ${HUONG[(f.k - 1) % HUONG.length].split(/[:,.]/)[0]}\n\`\`\`html\n${mockSua(htmlGoc, f.k, f.yTuong)}\n\`\`\``, signal: ctl.signal, moiChu, khiBatDau, khoaCache: htmlGoc, vaoCache: Math.round((sys.length + user[0].length) / 3.2) })
      : goiClaude({ sys, user, signal: ctl.signal, moiChu, khiBatDau }));
    f.dung = dung;
    const { nhan, html } = tachKetQua(txt);
    if (!html) throw new Error('Claude không trả về HTML — Thử lại hoặc diễn đạt ý khác.');
    f.html = lamSach(html); f.nhan = nhan || `Biến thể ${f.k}`;
    f.tt = lyDo === 'max_tokens' ? 'loi' : 'xong';
    if (lyDo === 'max_tokens') f.loi = 'Bị cắt vì hết max_tokens — tăng trong ⚙ Cài đặt rồi Thử lại.';
    return f.tt === 'xong';
  } catch (e) {
    f.tt = 'loi'; f.loi = e.name === 'AbortError' ? 'Đã dừng.' : e.message;
    return false;
  } finally {
    st.dangChay.delete(f.id); f.tienDo = ''; veKhung(f); veBang(); luuLai();
  }
}

// ---------- biến thể cho CẢ hành trình: mỗi phương án là một hàng mới ngay dưới hàng gốc ----------
async function sinhHanhTrinh(lanLai) {
  const nguon = lanLai ? timLan(lanLai.nguon) || timLan(lanLai.tu) : timLan(st.lanChon);
  const g = nguon.goc ? nguon : timLan(nguon.tu);
  if (lanLai ? st.dangChay.has(lanLai.id) : !nguon.goc && nguon.tt !== 'xong') { trangThaiBang('Phương án này chưa sinh xong.', true); return; }
  const y = lanLai ? lanLai.yTuong : $('#y-tuong').value.trim();
  if (!y) { trangThaiBang('Gõ ý của anh cho cả hành trình trước đã.', true); $('#y-tuong').focus(); return; }
  if (canKey()) return;
  const n = lanLai ? 1 : Number($('#so-bt').value) || 2;
  if (!lanLai) { caiDat.soPa = n; luuCaiDat(); }
  const dot = Date.now().toString(36);
  // nguồn là một phương án → dùng HTML của phương án đó làm gốc
  const buoc = g.buoc.map((key) => { const f = khungCuaLan(nguon, key) || timKhung(key); return { key, ten: MAN[key].ten, w: MAN[key].w, h: MAN[key].h, html: htmlCua(f) || MAN[key].html, toi: MAN[key].toi }; });
  const lans = [];
  for (let k = 1; k <= n; k++) {
    const soMoi = Math.max(0, ...st.lanBt.filter((b) => b.tu === g.id).map((b) => b.k || 0)) + 1;
    const l = lanLai || { id: `pa-${dot}-${k}`, tu: g.id, nguon: nguon.id, buoc: g.buoc, k: soMoi, n, yTuong: y, tt: 'dang' };
    l.model = laMock() ? 'mock' : modelDung();
    if (!lanLai) {
      st.lanBt.push(l);
      for (const b of buoc) st.khung.push({ id: `${l.id}-${b.key}`, loai: 'bien', lan: l.id, goc: b.key, cha: b.key, dot, k: l.k, w: b.w, h: b.h, html: '', tt: 'dang', tienDo: 'Đang chờ lượt…', yTuong: y, x: 0, y: 0 });
    }
    if (!st.dangChay.has(l.id)) st.dangChay.set(l.id, new AbortController());
    lans.push(l);
  }
  st.lanChon = lans[0].id; veTatCa(); luuLai(0);
  const vt = st.viTriLan.get(lans[0].id); if (vt) vuaHop(0, vt.y - 600, vt.w, vt.y + vt.h);
  trangThaiBang(`Đang sinh ${n} phương án cho «${g.ten}» (${buoc.length} màn)…`);
  const kq = await chayLoat(lans.map((l) => (bao) => chayHanhTrinh(l, g, buoc, bao)));
  const ok = kq.filter((r) => r.status === 'fulfilled' && r.value).length;
  toast(`Xong ${ok}/${lans.length} phương án.`, ok < lans.length);
  trangThaiBang(''); veTatCa(); luuLai();
}

async function chayHanhTrinh(l, g, buoc, khiBatDau) {
  const ctl = st.dangChay.get(l.id) || new AbortController(); st.dangChay.set(l.id, ctl); veBang();
  const khung = buoc.map((b) => st.khung.find((f) => f.lan === l.id && f.goc === b.key)).filter(Boolean);
  l.tt = 'dang'; l.loi = '';
  for (const f of khung) { f.tt = 'dang'; f.loi = ''; f.tienDo = 'Đang gọi Claude…'; }
  veTatCa(false);
  const batDau = Date.now(); let lanVe = 0;
  let lanTach = 0;
  const moiChu = (txt, dung, nghi) => {
    if (Date.now() - lanTach < 600) return;
    lanTach = Date.now();
    l.dung = { ...dung };
    const { nhan, man } = tachHanhTrinh(txt);
    if (nhan) l.nhan = nhan;
    const giay = Math.round((Date.now() - batDau) / 1000);
    for (const f of khung) {
      const m = man.find((x) => x.key === f.goc);
      if (m?.xong && f.tt === 'dang') { f.html = lamSach(m.html); f.tt = 'xong'; f.tienDo = ''; }
      else if (f.tt === 'dang') f.tienDo = nghi && !txt ? `Claude đang nghĩ… ${giay} giây` : m ? `đang vẽ màn này… ${giay} giây` : `chờ tới lượt · ${(txt.length / 1024).toFixed(1)} kB`;
    }
    if (Date.now() - lanVe > 800) { lanVe = Date.now(); khung.forEach(veKhung); veDauLan(); }
  };
  try {
    if (ctl.signal.aborted) throw new DOMException('dừng', 'AbortError');
    const sys = heThong(await taiAssets());
    const user = loiHanhTrinh({ y: l.yTuong, lan: g, buoc, k: l.k, n: l.n });
    const maxTokens = Math.min(64000, Math.max(Number(caiDat.maxTokens) || 16000, buoc.reduce((t, b) => t + Math.max(6000, Math.ceil((b.html || '').length / 2.5)), 4000)));   // màn chụp DOM thật 20–77 KB cần nhiều token hơn màn dựng tay
    const toanMock = `Ý TƯỞNG: Mock PA ${l.k} — ${HUONG[(l.k - 1) % HUONG.length].split(/[:,.]/)[0]}\n` + buoc.map((b) => `MÀN: ${b.key}\n\`\`\`html\n${mockSua(b.html, l.k, l.yTuong)}\n\`\`\``).join('\n');
    const { txt, lyDo, dung } = await (laMock()
      ? goiMock({ toan: toanMock, signal: ctl.signal, moiChu, khiBatDau, khoaCache: g.id + buoc.length, vaoCache: Math.round((sys.length + user[0].length) / 3.2) })
      : goiClaude({ sys, user, signal: ctl.signal, moiChu, khiBatDau, maxTokens }));
    l.dung = dung;
    const { nhan, man } = tachHanhTrinh(txt);
    l.nhan = nhan || `Phương án ${l.k}`;
    let thieu = 0;
    for (const f of khung) {
      const m = man.find((x) => x.key === f.goc);
      if (m?.html) { f.html = lamSach(m.html); f.tt = 'xong'; } else { f.tt = 'loi'; f.loi = 'Claude không trả màn này.'; thieu++; }
      f.tienDo = '';
    }
    l.tt = thieu || lyDo === 'max_tokens' ? 'loi' : 'xong';
    if (lyDo === 'max_tokens') l.loi = 'Bị cắt vì hết max_tokens.'; else if (thieu) l.loi = `thiếu ${thieu} màn`;
    return l.tt === 'xong';
  } catch (e) {
    l.tt = 'loi'; l.loi = e.name === 'AbortError' ? 'Đã dừng.' : e.message;
    for (const f of khung) if (f.tt === 'dang') { f.tt = 'loi'; f.loi = l.loi; f.tienDo = ''; }
    return false;
  } finally {
    st.dangChay.delete(l.id); veTatCa(false); luuLai();
  }
}

function thuLai(id) {
  const f = timKhung(id); if (!f) return;
  if (canKey()) return;
  if (f.lan) { const l = timLan(f.lan); if (l && !st.dangChay.has(l.id)) sinhHanhTrinh(l); return; }
  if (st.dangChay.has(f.id)) return;
  if (f.htmlSua) { Sua.chayLamMuot(f); return; } // khung «Làm mượt» của chế độ Sửa
  const cha = timKhung(f.cha);
  const htmlGoc = cha ? htmlCua(cha) : f.htmlGoc; const tenGoc = cha ? tenCua(cha) : f.tenGoc;
  if (!htmlGoc) { toast('Không còn khung gốc để sinh lại.', true); return; }
  chay(f, htmlGoc, tenGoc).then((ok) => toast(ok ? 'Đã sinh lại.' : 'Vẫn lỗi — xem thông báo trên khung.', !ok));
}

$('#nut-sinh').onclick = sinh;
$('#nut-dung').onclick = () => { for (const c of st.dangChay.values()) c.abort(); };
$('#y-tuong').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sinh(); } });
$('#y-tuong').addEventListener('input', capNhatXemPrompt);
async function capNhatXemPrompt() {
  if (!$('#bang details').open) return;
  const f = khungChon(); const yy = $('#y-tuong').value || '…';
  let u;
  if (f) { const { w, h } = kichThuoc(f); u = loiNguoiDung({ y: yy, html: '(HTML của khung đang chọn)', w, h, ten: tenCua(f), k: 1, n: Number($('#so-bt').value) }); }
  else if (st.lanChon) { const l = timLan(st.lanChon); const g = l.goc ? l : timLan(l.tu); u = loiHanhTrinh({ y: yy, lan: g, buoc: g.buoc.map((k) => ({ ...MAN[k], html: '(HTML màn)' })), k: 1, n: Number($('#so-bt').value) }); }
  else return;
  $('#xem-prompt').textContent = `[system — cache 1h]\n${heThong(await taiAssets())}\n\n[user khối 1 — cache 1h]\n${u[0]}\n\n[user khối 2 — thay đổi mỗi lần]\n${u[1]}`;
}
$('#bang details').addEventListener('toggle', capNhatXemPrompt);
function trangThaiBang(t, loi = false) { const el = $('#bang-trang-thai'); el.textContent = t; el.classList.toggle('loi', loi); }

// ---------- xem lớn / so sánh ----------
function xemLon(ids) {
  const ds = ids.map(timKhung).filter((f) => f && htmlCua(f));
  if (!ds.length) return;
  $('#xem-tieu').textContent = ds.length > 1 ? `So sánh ${ds.length} khung` : tenCua(ds[0]);
  const luoi = $('#xem-luoi'); luoi.innerHTML = '';
  $('#lop-xem').hidden = false;
  const r = luoi.getBoundingClientRect();
  const rongO = (r.width - 16 * (ds.length - 1)) / ds.length;
  for (const f of ds) {
    const { w, h } = kichThuoc(f);
    const z = Math.min(1, rongO / w, (r.height - 30) / h);
    const o = document.createElement('div'); o.className = 'o-xem';
    o.innerHTML = '<div class="tieu-o"></div><div class="vo"><iframe sandbox="" referrerpolicy="no-referrer"></iframe></div>';
    o.querySelector('.tieu-o').textContent = `${tenCua(f)}${f.loai === 'goc' ? ' · gốc' : ''}`;
    const vo = o.querySelector('.vo'); vo.style.width = `${w * z}px`; vo.style.height = `${h * z}px`;
    const ifr = o.querySelector('iframe'); ifr.width = w; ifr.height = h; ifr.style.transform = `scale(${z})`; ifr.srcdoc = htmlCua(f);
    luoi.appendChild(o);
  }
}
$('#nut-xem').onclick = () => { const f = khungChon(); if (f) xemLon([f.id]); };
$('#nut-so-sanh').onclick = () => xemLon([...st.chon]);
$('#xem-dong').onclick = dongLop;
$('#lop-xem').addEventListener('pointerdown', (e) => { if (e.target.id === 'lop-xem') dongLop(); });
function dongLop() { $('#lop-xem').hidden = true; $('#xem-luoi').innerHTML = ''; $('#lop-cai-dat').hidden = true; if (!$('#lop-ls').hidden) { $('#lop-ls').hidden = true; $('#ls-vo iframe').srcdoc = ''; } }

// ---------- PLAY: prototype bấm được kiểu Figma ----------
const play = { lich: [], lan: null };
function moPlay(id, lanId) {
  id ||= khungChon()?.id || (st.lanChon && khungCuaLan(timLan(st.lanChon), timLan(st.lanChon).buoc[0])?.id) || (() => { const l = timLan(SECTIONS.find((x) => x.id === st.sec)?.lan[0]); return l && timKhung(l.buoc[0])?.id; })() || timKhung(LAN_GOC[0].buoc[0])?.id;
  const f = timKhung(id); if (!f || !htmlCua(f)) { toast('Màn này chưa có nội dung để Play.', true); return; }
  play.lan = lanId || lanCuaKhung(f)?.id;
  play.lich = [f.id];
  $('#pl-anh').checked = caiDat.anhThat;
  $('#lop-play').hidden = false;
  vePlay('');
  dongBoPhienBan(); // màn vừa được người khác thay mà lỡ tin realtime: đổi ngay trong Play (vePlay lại khi có khác)
}
function dongPlay() {
  $('#lop-play').hidden = true; $('#pl-thiet-bi').innerHTML = '';
  const f = timKhung(play.lich.at(-1)); const sec = f && secCuaLan(lanCuaKhung(f));
  if (sec && sec !== st.sec && st.cheDo !== 'qt') { doiSec(sec, { bay: false }); st.chon.clear(); st.chon.add(f.id); veTatCa(false); vuaMan([f.id]); toast(`Đã sang section «${SECTIONS.find((x) => x.id === sec).ten}» — màn cuối khi Play.`); }
}
function kieuThietBi(f) {
  const l = timLan(MAN[keyCua(f)].lan); const { w } = kichThuoc(f);
  if (l.nen === 'Web') return 'web';
  if (l.nen === 'Mac' || /^cmt-mac-/.test(keyCua(f))) return 'mac';   // lane Windows có xen màn Mac
  if (w === 375) return 'iphone';   // màn chụp DOM từ app Expo thật (web/that, iPhone 375×812)
  if (w === 390 || w === 360) return l.nen === 'Điện thoại' || l.nen === 'Android' ? 'android' : 'iphone';
  return 'win';
}
function vePlay(huong) {
  const f = timKhung(play.lich.at(-1)); if (!f) return;
  const { w, h } = kichThuoc(f);
  const kieu = kieuThietBi(f);
  const tb = $('#pl-thiet-bi');
  tb.className = `thiet-bi tb-${kieu}`;
  const san = $('#pl-san').getBoundingClientRect();
  const m = MAN[keyCua(f)];
  const coAnh = $('#pl-anh').checked && m.anh && !(f.loai === 'goc' && daThayKhacGoc(f.key));
  const vien = kieu === 'iphone' || kieu === 'android' ? 36 : 44;
  const z = Math.min(1, (san.height - 24) / (h + vien), (san.width / (coAnh ? 2 : 1) - 48) / (w + 28));
  tb.style.setProperty('--z', z);
  tb.style.width = `${w}px`; tb.style.height = `${h}px`;
  const cu = tb.querySelector('.man-play');
  const moi = document.createElement('div'); moi.className = 'man-play' + (huong ? ` vao-${huong}` : '');
  moi.innerHTML = `<div class="thanh-cs"><i></i><i></i><i></i><span></span></div><iframe sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe>`;
  moi.querySelector('span').textContent = kieu === 'web' ? 'aiigrow.aiilab.vn/tai' : 'AiiGrow';
  const ifr = moi.querySelector('iframe'); ifr.width = w; ifr.height = h; ifr.title = tenCua(f);
  ifr.addEventListener('load', () => ganBamPlay(ifr, f));
  ifr.srcdoc = htmlCua(f);
  tb.appendChild(moi);
  if (cu) { cu.classList.add(huong === 'phai' ? 'ra-trai' : 'ra-phai'); setTimeout(() => cu.remove(), 320); }
  // ảnh thật bên cạnh
  const a = $('#pl-anh-that'); a.hidden = !coAnh; if (coAnh) { a.src = `/ref/${m.anh}`; a.style.maxHeight = `${(h + vien) * z}px`; a.classList.toggle('ghep', /\/ss-/.test(m.anh)); }
  // vệt đã đi
  const vet = $('#pl-vet'); vet.innerHTML = '';
  play.lich.forEach((id, i) => {
    const x = timKhung(id); if (!x) return;
    const b = document.createElement('button'); b.type = 'button'; b.textContent = tenCua(x); b.className = i === play.lich.length - 1 ? 'bat' : '';
    b.onclick = () => { if (i < play.lich.length - 1) { play.lich = play.lich.slice(0, i + 1); vePlay('trai'); } };
    if (i) vet.append('›');
    vet.appendChild(b);
  });
  $('#pl-lui').disabled = play.lich.length < 2;
  const l = timLan(play.lan); const viTri = l ? l.buoc.indexOf(keyCua(f)) : -1;
  $('#pl-truoc').disabled = viTri <= 0; $('#pl-ke').disabled = viTri < 0 || viTri >= l.buoc.length - 1;
  $('#pl-buoc').textContent = l && viTri >= 0 ? `${l.goc ? l.ten : 'Phương án ' + l.k} · bước ${viTri + 1}/${l.buoc.length}${m.toi && viTri < l.buoc.length - 1 ? ' · tiếp: ' + m.toi : ''}` : `${tenCua(f)} (ngoài hành trình)`;
}
function ganBamPlay(ifr, f) {
  let tl; try { tl = ifr.contentDocument; } catch { return; }
  if (!tl) return;
  const st2 = tl.createElement('style');
  st2.textContent = 'html.goi-y [data-toi]{outline:3px solid rgba(43,183,163,.85)!important;outline-offset:2px;transition:outline-color .2s}[data-toi]{cursor:pointer}';
  tl.head?.appendChild(st2);
  tl.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toi]');
    if (t) { e.preventDefault(); diToi(f, t.getAttribute('data-toi')); return; }
    if (e.target.closest('a')) e.preventDefault();
    if (e.target.closest('input,textarea,select,label')) return;
    tl.documentElement.classList.add('goi-y'); setTimeout(() => tl.documentElement.classList.remove('goi-y'), 700);
  });
  tl.addEventListener('keydown', (e) => { if (e.key === 'Escape') dongPlay(); });
}
function diToi(tu, key) {
  const T = dichCua(tu, key);
  if (!T || !htmlCua(T)) { toast('Màn đích chưa có.', true); return; }
  play.lich.push(T.id); vePlay('phai');
}
function buocLan(d) {
  const f = timKhung(play.lich.at(-1)); const l = timLan(play.lan); if (!f || !l) return;
  const i = l.buoc.indexOf(keyCua(f)) + d; if (i < 0 || i >= l.buoc.length) return;
  let T = khungCuaLan(l, l.buoc[i]);
  if (l.goc) T = dichCua(f, l.buoc[i]);
  if (!T || !htmlCua(T)) return;
  play.lich.push(T.id); vePlay(d > 0 ? 'phai' : 'trai');
}
function luiPlay() { if (play.lich.length > 1) { play.lich.pop(); vePlay('trai'); } }
function phimPlay(e) {
  if (dangGo(e)) return;
  if (e.key === 'Escape') dongPlay();
  else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); luiPlay(); }
  else if (e.key === 'ArrowRight') buocLan(1);
}
$('#pl-dong').onclick = dongPlay;
$('#pl-lui').onclick = luiPlay;
$('#pl-ke').onclick = () => buocLan(1);
$('#pl-truoc').onclick = () => buocLan(-1);
$('#pl-anh').onchange = () => vePlay('');
$('#nut-play').onclick = () => moPlay();
$('#nut-play-bang').onclick = () => { const f = khungChon(); if (f) moPlay(f.id); else if (st.lanChon) { const l = timLan(st.lanChon); moPlay(khungCuaLan(l, l.buoc[0])?.id, l.id); } };
addEventListener('resize', () => { if (!$('#lop-play').hidden) vePlay(''); });

// ---------- xuất / lưu ----------
const dataUrlDem = new Map();
function thanhDataUrl(url) {
  if (!dataUrlDem.has(url)) {
    dataUrlDem.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }))
      .catch((e) => { dataUrlDem.delete(url); throw e; }));
  }
  return dataUrlDem.get(url);
}
let cssKit = null;
// HTML tự đứng: nhúng clay-kit.css và ảnh /assets/* thành data URI → mở được ở bất cứ đâu.
async function htmlTuDung(html, khoaScript = true) {
  let s = lamSach(html);
  // tệp xuất/lưu mở ngoài bàn này: cấm mọi script (lớp chặn thứ hai sau lamSach)
  if (khoaScript) s = s.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'">`);
  cssKit ??= fetch('/assets/clay-kit.css').then((r) => { if (!r.ok) throw new Error(`clay-kit.css ${r.status}`); return r.text(); }).catch((e) => { cssKit = null; throw e; });
  const css = await cssKit;
  s = s.replace(/<link[^>]*href=["']\/assets\/clay-kit\.css["'][^>]*>/gi, () => `<style>${css}</style>`);
  // ảnh bộ kit (/assets/) và ảnh màn chụp thật (/that/a/) → data URL; font của màn thật chỉ nhúng khi xuất/lưu (ảnh thu nhỏ bỏ font)
  const ds = [...new Set([...(s.match(/\/assets\/[\w./-]+\.(?:png|webp)/g) || []), ...(s.match(khoaScript ? /\/that\/a\/[\w.-]+\.(?:png|webp|jpe?g|gif|svg|ttf|otf|woff2?)/g : /\/that\/a\/[\w.-]+\.(?:png|webp|jpe?g|gif|svg)/g) || [])])];
  for (const u of ds) { try { const d = await thanhDataUrl(u); s = s.split(u).join(d); } catch { /* giữ nguyên */ } }
  return s;
}
const slug = (t) => (t || 'man').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
function taiVe(ten, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ten; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

$('#nut-html').onclick = async () => {
  const f = khungChon(); if (!f || !htmlCua(f)) return;
  taiVe(`aiigrow-${slug(tenCua(f))}.html`, new Blob([await htmlTuDung(htmlCua(f))], { type: 'text/html' }));
};

// Chụp HTML thành PNG trong iframe ẩn (nội dung đã lamSach; chỉ html-to-image của mình chạy, CSP trang vẫn áp).
async function chupAnh(html, { w, h }, { pixelRatio = 2, skipFonts = false, doLk: doCa = false } = {}) {
  let s = await htmlTuDung(html, false);
  // srcdoc kế thừa CSP của trang (script-src 'self' — inline script/on* không chạy); thêm lớp chặn: không gọi mạng, không base/form
  if (skipFonts) s = s.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="script-src 'self'; connect-src data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'">`); // ảnh thu nhỏ tự động: không cần font mạng
  const ifr = document.createElement('iframe');
  ifr.setAttribute('sandbox', 'allow-same-origin allow-scripts');
  Object.assign(ifr.style, { position: 'fixed', left: '-10000px', top: '0', width: `${w}px`, height: `${h}px`, border: '0' });
  document.body.appendChild(ifr);
  try {
    await new Promise((ok, hong) => { ifr.onload = ok; ifr.onerror = hong; const d = new DOMParser().parseFromString(s, 'text/html'); const sc = d.createElement('script'); sc.src = '/vendor/html-to-image.js'; d.head.appendChild(sc); ifr.srcdoc = '<!doctype html>\n' + d.documentElement.outerHTML; });
    const win = ifr.contentWindow;
    for (let i = 0; i < 50 && !win.htmlToImage; i++) await new Promise((r) => setTimeout(r, 100));
    if (!win.htmlToImage) throw new Error('Chưa có html-to-image — chạy npm install trong tools/brainstorm-ui.');
    if (!skipFonts) await win.document.fonts?.ready;
    const lk = doCa ? doLk(win.document) : null;
    const goc = [...win.document.body.children].find((n) => !/^(STYLE|LINK|SCRIPT|META|TEMPLATE)$/.test(n.tagName) && n.getBoundingClientRect().width > 0) || win.document.body;
    const opt = { width: w, height: h, pixelRatio, cacheBust: false, skipFonts };
    let blob;
    try { blob = await win.htmlToImage.toBlob(goc, opt); } catch { blob = await win.htmlToImage.toBlob(goc, { ...opt, skipFonts: true }); }
    return { blob, lk };
  } finally { ifr.remove(); }
}
const chupPng = async (f) => (await chupAnh(htmlCua(f), kichThuoc(f))).blob;
$('#nut-png').onclick = async () => {
  const f = khungChon(); if (!f || !htmlCua(f)) return;
  try { trangThaiBang('Đang xuất PNG…'); const b = await chupPng(f); taiVe(`aiigrow-${slug(tenCua(f))}.png`, b); trangThaiBang(''); }
  catch (e) { trangThaiBang(`Xuất PNG lỗi: ${e.message}`, true); }
};

// ---------- THAY MÀN: biến thể ổn thì thành phiên bản mới của màn gốc (màn gốc hiển thị bản này ở mọi nơi) ----------
const dangDungBt = (f) => f.loai !== 'goc' && mucPb(keyCua(f), PB[keyCua(f)]?.hien)?.bt === f.id;
const daThayKhacGoc = (key) => !!mucPb(key, PB[key]?.hien)?.tep; // đang hiện bản khác bản trong mã (ảnh chụp thật không còn khớp)
const duocThay = (f) => f.loai !== 'goc' && f.tt !== 'dang' && f.tt !== 'loi' && !!htmlCua(f) && !!MAN[keyCua(f)];
const dangThay = new Set();
async function thayMan(key, html, meta = {}) {
  if (!MAN[key] || !html) return false;
  if (dangThay.has(key)) { toast('Màn này đang được thay — đợi chút.'); return false; }
  // khung mở từ «Sửa tiếp» một đề xuất góp ý: Thay màn = «Accept changes» của đề xuất đó (máy chủ ghi tác giả + liên kết góp ý)
  const dxKhung = meta.bt ? timKhung(meta.bt)?.deXuat : null;
  if (dxKhung) return thayTheoDeXuat(dxKhung, key, html, meta);
  dangThay.add(key); html = lamSach(html);
  try {
    const r = await fetch(`/api/phien-ban/${encodeURIComponent(key)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-bs-phien': PHIEN, 'x-bs-nguoi': encodeURIComponent(rt?.ten() || ''), ...dauChuQuan() },
      body: JSON.stringify({ html, w: meta.w, h: meta.h, nhan: meta.nhan || '', yTuong: meta.yTuong || '', nguon: meta.nguon || '', model: meta.model || '', bt: meta.bt || '' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
    PB[key] = j; const muc = mucPb(key, j.hien); if (muc?.tep) HTML_PB.set(`${key}/${muc.tep}`, html);
    await apPhienBan(key);
  } catch (e) { toast(`Không thay được màn: ${e.message}`, true); return false; } finally { dangThay.delete(key); }
  meta.truocVe?.(); // vd. Chế độ Sửa thoát trước, để khung đang sửa không bị nạp lại dưới tay
  qtDaVe = ''; veTatCa(); luuLai();
  toast(`Đã thay «${MAN[key].ten}» — đang dùng v${PB[key].hien}; bản cũ vẫn trong Lịch sử.`);
  return true;
}
async function thayTheoDeXuat(dx, key, html, meta) {
  dangThay.add(key);
  const sach = lamSach(html);
  try { await GY.chapNhan(dx, { html: sach, w: meta.w, h: meta.h, suaTiep: sach !== dx.h0 }, () => meta.truocVe?.()); } catch (e) { toast(`Không áp dụng được đề xuất: ${e.message}`, true); return false; } finally { dangThay.delete(key); }
  for (const f of st.khung) if (f.cha === meta.bt) f.cha = f.goc; // biến thể sinh từ khung tạm: nối về màn gốc
  st.khung = st.khung.filter((f) => f.id !== meta.bt); st.chon.delete(meta.bt); // khung tạm của đề xuất đã xong việc
  qtDaVe = ''; veTatCa(); luuLai();
  return true;
}
async function thayBangKhung(id) {
  const f = timKhung(id); if (!f || !duocThay(f)) return;
  const { w, h } = kichThuoc(f);
  await thayMan(keyCua(f), htmlCua(f), { w, h, nhan: f.nhan || tenCua(f), yTuong: f.yTuong || '', nguon: f.lan ? 'pa' : f.suaTay ? 'sua' : 'bien', model: f.model || '', bt: f.id });

}
$('#nut-thay-bang').onclick = () => { const f = khungChon(); if (f) thayBangKhung(f.id); };
$('#nut-ls-bang').onclick = () => { const f = khungChon(); if (f) moLichSu(keyCua(f)); };

// Lịch sử phiên bản: xem từng bản (không đổi gì), «Khôi phục bản này» thêm một phiên bản mới (lịch sử không bao giờ bị xoá).
const ls = { key: '', v: 0 };
function moLichSu(key) {
  if (!MAN[key]) return;
  ls.key = key; ls.v = PB[key]?.hien || 0;
  $('#lop-ls').hidden = false; veLichSu();
}
function veLichSu() {
  const { key } = ls; const m = MAN[key]; const pb = PB[key]; const hien = pb?.hien || 0;
  $('#ls-tieu').textContent = `Lịch sử «${m.ten}» · đang dùng v${hien}`;
  const ds = [{ v: 0, nhan: 'Bản gốc trong mã', yTuong: '' }, ...(pb?.ds || [])].reverse();
  const ol = $('#ls-ds'); ol.innerHTML = '';
  for (const x of ds) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ls-muc' + (x.v === ls.v ? ' bat' : '') + (x.v === hien ? ' hien' : '');
    b.dataset.v = x.v;
    b.innerHTML = '<span class="ls-v"></span><span class="ls-ch"><b></b><span class="phu"></span></span>';
    b.querySelector('.ls-v').textContent = `v${x.v}`;
    b.querySelector('b').textContent = (x.nhan || (x.nguon === 'sua' ? 'Sửa tay' : 'Biến thể')) + (x.v === hien ? ' · đang dùng' : '');
    b.querySelector('.phu').textContent = [x.t ? new Date(x.t).toLocaleString('vi-VN') : 'trong mã nguồn', x.yTuong].filter(Boolean).join(' · ');
    b.title = x.yTuong || '';
    b.onclick = () => { ls.v = x.v; veLichSu(); };
    ol.appendChild(b);
  }
  $('#ls-khoi-phuc').disabled = ls.v === hien;
  $('#ls-khoi-phuc').textContent = ls.v === hien ? 'Đang dùng bản này' : `Khôi phục v${ls.v}`;
  const muc = mucPb(key, ls.v); const w = muc?.w || m.goc0.w, h = muc?.h || m.goc0.h;
  const vo = $('#ls-vo'); const r = vo.parentElement.getBoundingClientRect();
  const z = Math.min(1, (r.width - 8) / w, (r.height - 60) / h);
  vo.style.width = `${w * z}px`; vo.style.height = `${h * z}px`;
  const ifr = vo.querySelector('iframe'); ifr.width = w; ifr.height = h; ifr.style.transform = `scale(${z})`;
  const v = ls.v;
  htmlPhienBan(key, v).then((html) => { if (ls.key === key && ls.v === v && ifr.srcdoc !== html) ifr.srcdoc = html; })
    .catch((e) => { if (ls.v === v) { ifr.srcdoc = ''; toast(`Không tải được v${v}: ${e.message}`, true); } });
}
$('#ls-dong').onclick = dongLop;
$('#lop-ls').addEventListener('pointerdown', (e) => { if (e.target.id === 'lop-ls') dongLop(); });
$('#ls-khoi-phuc').onclick = async () => {
  const { key, v } = ls; if (v === (PB[key]?.hien || 0)) return;
  if (dangThay.has(key)) { toast('Màn này đang được thay — đợi chút.'); return; }
  $('#ls-khoi-phuc').disabled = true; dangThay.add(key);
  try {
    const r = await fetch(`/api/phien-ban/${encodeURIComponent(key)}`, { method: 'POST', body: JSON.stringify({ tu: v }), headers: { 'content-type': 'application/json', 'x-bs-phien': PHIEN, 'x-bs-nguoi': encodeURIComponent(rt?.ten() || ''), ...dauChuQuan() } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
    PB[key] = j;
  } catch (e) { toast(`Không khôi phục được: ${e.message}`, true); veLichSu(); return; } finally { dangThay.delete(key); }
  try { await apPhienBan(key); } catch (e) { toast(`Đã khôi phục trên máy chủ (v${PB[key].hien}) nhưng chưa tải được bản đó (${e.message}) — tải lại trang.`, true); }
  ls.v = PB[key].hien; qtDaVe = ''; veTatCa(); veLichSu();
  toast(`Đã khôi phục v${v} thành v${PB[key].hien} — «${MAN[key].ten}» hiển thị bản này ở mọi nơi.`);
};

let hoanTac = null;
const xoaXa = { n: 0, ds: new Map() }; // id → số thứ tự lần người khác xoá (để hoàn tác không hồi sinh)
// Hoàn tác: giữ đúng các đối tượng (việc đang sinh vẫn ghi vào chúng), nhớ cha cũ; khung sinh ra sau khi xoá vẫn giữ.
function chupLai() {
  const k = st.khung.slice(), l = st.lanBt.slice(), cha = new Map(st.khung.map((f) => [f.id, f.cha])), moc = xoaXa.n;
  return () => {
    // mục NGƯỜI KHÁC đã xoá sau lúc chụp thì không hồi sinh (chỉ hoàn tác việc của mình)
    const nguoiKhacXoa = (id) => (xoaXa.ds.get(id) || 0) > moc;
    st.khung = [...k.filter((f) => !nguoiKhacXoa(f.id) && !(f.lan && nguoiKhacXoa(f.lan))), ...st.khung.filter((f) => !k.includes(f))];
    st.lanBt = [...l.filter((x) => !nguoiKhacXoa(x.id)), ...st.lanBt.filter((x) => !l.includes(x))];
    for (const f of k) if (cha.has(f.id)) f.cha = cha.get(f.id);
    st.chon.clear(); veTatCa(); luuLai();
  };
}
function xoaChon() { xoaKhung([...st.chon]); }
function xoaKhung(chon) {
  const dung = chon.filter((id) => { const f = timKhung(id); return f && dangDungBt(f); });
  if (dung.length) toast('Biến thể đang dùng làm màn không xoá được — Khôi phục bản khác trong Lịch sử trước.', true);
  const ids = chon.filter((id) => { const f = timKhung(id); return f && f.loai !== 'goc' && !f.lan && !dung.includes(id); });
  if (!ids.length && dung.length) return;
  if (!ids.length) { toast('Màn gốc và màn trong phương án hành trình không xoá lẻ được — xoá cả phương án ở đầu hàng.'); return; }
  hoanTac = chupLai();
  for (const id of ids) st.dangChay.get(id)?.abort();
  for (const f of st.khung) if (ids.includes(f.cha)) f.cha = timKhung(f.cha)?.cha || f.goc;
  st.khung = st.khung.filter((f) => !ids.includes(f.id)); st.chon.clear();
  veTatCa(); luuLai();
  toast(`Đã xoá ${ids.length} biến thể.`, false, { chu: 'Hoàn tác (⌘Z)', lam: () => { if (hoanTac) { hoanTac(); hoanTac = null; toast('Đã hoàn tác.'); } } });
}
function xoaPhuongAn(id) {
  hoanTac = chupLai();
  st.dangChay.get(id)?.abort();
  st.khung = st.khung.filter((f) => f.lan !== id); st.lanBt = st.lanBt.filter((l) => l.id !== id);
  for (const c of [...st.chon]) if (!timKhung(c)) st.chon.delete(c);
  if (st.lanChon === id) st.lanChon = null;
  veTatCa(); luuLai(); toast('Đã xoá phương án — ⌘Z để hoàn tác.');
}
addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !dangGo(e) && hoanTac && !Sua.dangSua() && $('#lop-ls').hidden) { hoanTac(); hoanTac = null; toast('Đã hoàn tác.'); } });
$('#nut-xoa').onclick = xoaChon;
const donDuoc = (f) => f.loai !== 'goc' && !f.lan && !f.ghim && !dangDungBt(f); // ghim cũ vẫn được giữ
$('#nut-xoa-bt').onclick = () => {
  const n = st.khung.filter(donDuoc).length;
  if (!n) { toast('Không có biến thể màn lẻ nào để dọn.'); return; }
  if (!confirm(`Xoá ${n} biến thể màn lẻ? (biến thể đang dùng làm màn, biến thể ghim ★ cũ và phương án hành trình giữ lại; ⌘Z hoàn tác)`)) return;
  hoanTac = chupLai();
  for (const f of st.khung) if (donDuoc(f)) st.dangChay.get(f.id)?.abort();
  st.khung = st.khung.filter((f) => !donDuoc(f)); st.chon.clear();
  for (const f of st.khung) if (f.cha && !timKhung(f.cha)) f.cha = f.goc;
  veTatCa(); luuLai(); toast(`Đã dọn ${n} biến thể — ⌘Z để hoàn tác.`);
};
$('#nut-xep').onclick = () => { veTatCa(); vuaMan(); toast('Đã sắp xếp lại cả bàn.'); };
$('#nut-thu').onclick = () => phong(1 / 1.2);
$('#nut-phong').onclick = () => phong(1.2);
$('#nut-zoom').onclick = () => phong(1 / st.view.z);
$('#nut-vua').onclick = () => vuaMan();

// ---------- cài đặt ----------
function napModel(sel, chon) {
  sel.innerHTML = '';
  for (const [v, t] of MODELS) sel.add(new Option(t, v, false, v === chon));
}
function moCaiDat() {
  $('#cd-key').value = docKey(); $('#cd-key').type = 'password'; $('#cd-hien').textContent = 'Hiện';
  napModel($('#cd-model'), caiDat.model); $('#cd-model-khac').value = caiDat.modelKhac || ''; $('#cd-max').value = caiDat.maxTokens;
  $('#lop-cai-dat').hidden = false; $('#cd-key').focus();
}
$('#nut-cai-dat').onclick = moCaiDat;
// Mock chỉ chèn một dòng CSS + nhãn vào bản gốc → mọi biến thể gần như giống nhau; giải thích rõ để khỏi tưởng lỗi.
$('#che-do').onclick = () => toast(MOCK_URL ? 'Đang chạy MOCK vì địa chỉ có ?mock=1: biến thể chỉ là bản gốc chèn nhãn, KHÔNG gọi Claude. Bỏ ?mock=1 khỏi địa chỉ (và dán key thật trong ⚙ Cài đặt) để Claude sinh thật.' : 'Đang chạy MOCK vì key bắt đầu bằng «mock»: biến thể chỉ là bản gốc chèn nhãn, KHÔNG gọi Claude. Mở ⚙ Cài đặt, dán key Claude thật để sinh thật.', true);
$('#cd-dong').onclick = dongLop;
$('#lop-cai-dat').addEventListener('pointerdown', (e) => { if (e.target.id === 'lop-cai-dat') dongLop(); });
$('#cd-hien').onclick = () => { const i = $('#cd-key'); i.type = i.type === 'password' ? 'text' : 'password'; $('#cd-hien').textContent = i.type === 'password' ? 'Hiện' : 'Ẩn'; };
$('#cd-xoa').onclick = () => { ghiKey(''); $('#cd-key').value = ''; capNhatCheDo(); toast('Đã xoá key khỏi trình duyệt.'); };
$('#hop-cai-dat').addEventListener('submit', (e) => {
  e.preventDefault();
  ghiKey($('#cd-key').value.trim());
  caiDat.model = $('#cd-model').value; caiDat.modelKhac = $('#cd-model-khac').value.trim();
  caiDat.maxTokens = Math.min(64000, Math.max(2000, Number($('#cd-max').value) || 16000));
  luuCaiDat(); napModel($('#chon-model'), caiDat.model); capNhatCheDo(); dongLop();
  toast(laMock() ? 'Đã lưu — đang ở chế độ mock (không gọi API).' : 'Đã lưu key và model.');
});
$('#chon-model').addEventListener('change', () => { caiDat.model = $('#chon-model').value; caiDat.modelKhac = ''; luuCaiDat(); });
function capNhatCheDo() {
  $('#che-do').textContent = laMock() ? '⚠ MOCK — không gọi Claude' : ''; $('#che-do').hidden = !laMock();
  $('#nut-cai-dat').classList.toggle('can', !laMock() && !docKey());
}

// ---------- toast ----------
let henToast = 0;
function toast(t, loi = false, nut = null) {
  const el = $('#toast'); el.textContent = t; el.classList.toggle('loi', loi); el.classList.add('hien');
  el.classList.toggle('co-nut', !!nut);
  if (nut) { const b = document.createElement('button'); b.type = 'button'; b.textContent = nut.chu; b.onclick = () => { el.classList.remove('hien', 'co-nut'); nut.lam(); }; el.append(' ', b); }
  clearTimeout(henToast); henToast = setTimeout(() => el.classList.remove('hien', 'co-nut'), nut ? 8000 : loi ? 7000 : 4000);
}

// ---------- khởi động ----------
napModel($('#chon-model'), caiDat.model);
let qtDaVe = '';
const qt = taoQuyTrinh({ MAN, timLan, vung, theGioi, chupAnh, bam, anhNho, ghiAnhNho, loiChup, lkDo, moPlay: (k) => moPlay(k), toast, view: () => st.view });
dangDungNgoai = qt.dangDung;
qt.bat(st.cheDo === 'qt'); document.body.classList.toggle('che-do-qt', st.cheDo === 'qt');
$('#nut-qt').onclick = doiCheDo;
$('#nut-qt-svg').onclick = () => qt.xuat('svg', `quy-trinh-${st.sec}`);
$('#nut-qt-png').onclick = () => qt.xuat('png', `quy-trinh-${st.sec}`);
capNhatCheDo(); apView(); veTatCa();
if (!st.views[khoaView()]) vuaMan();
ghiHash();
if (LOI_TAI.length) toast(`Không tải được: ${LOI_TAI.join(', ')}`, true);
{ let an = false; try { an = localStorage.getItem('bs.an-ben') === '1'; } catch { /* bỏ qua */ } if (an) datBen(true, false); }
// ---------- kho biến thể chung trên máy chủ + realtime ----------
// Mọi biến thể màn lẻ và phương án hành trình nằm ở máy chủ (kho-bien-the.mjs, ngoài git): ai mở bàn cũng thấy cùng một bộ.
// Máy này: luuLai() → dongBoKho() gửi phần khác so với bản máy chủ đang có (daGui: chữ ký đã gửi/nhận).
// Máy chủ phát {t:'kho'} cho phòng «bang» → nhanKho() áp thay đổi của người khác (kể cả khung «đang sinh»).
const CQ = { la: false, luc: 0 }; // đã biết mình là chủ quản (máy chủ xác nhận) — chỉ khi đó lệnh ghi kho mới kèm mã (mã cũ/sai không đốt lượt thử)
const PHIEN = Math.random().toString(36).slice(2, 12); // định danh tab: máy chủ kèm theo khi phát, tab tự bỏ qua thay đổi của chính mình
const coMan = (k) => typeof k === 'string' && Object.hasOwn(MAN, k);
const KHONG_LUU = new Set(['htmlGoc', 'tenGoc', 'x', 'y', 'tienDo', 'html', 'htmlSua', 'htmlGocSua', '_h', 'tSua', 'b', 'bSv', 'nguoi']);
const DANG_CU = 150000; // khung «đang sinh» không được làm mới quá 2,5 phút ⇒ người sinh đã đóng trang
const daGui = new Map(); // 'k:<id>' | 'l:<id>' → chữ ký bản máy chủ đang có (theo hiểu biết của máy này)
const tuChoi = new Map(); // id → chữ ký máy chủ đã từ chối (không gửi lại tới khi mục đổi)
const LO_TOI_DA = 150; // số mục mỗi lần ghi (máy chủ nhận tối đa 200)
let khoSan = false, dangDb = false, laiDb = false, loiKho = 0, lechGio = 0, boLoKho = false;
const tuoiSv = (m) => Date.now() + lechGio - (m?.tSua || 0); // tuổi bản máy chủ theo đồng hồ máy chủ (lechGio đo lúc nạp kho)
const dangChayO = (f) => st.dangChay.has(f.id) || (!!f.lan && st.dangChay.has(f.lan));
const banLuu = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) if (!KHONG_LUU.has(k) && v !== undefined) r[k] = v; return r; };
function bamH(f) { // chữ ký phần HTML (kể cả bản sửa tay của khung «Làm mượt»), nhớ theo chuỗi để khỏi băm lại
  const a = f.html || '', b = f.htmlSua || '', c = f.htmlGocSua || '';
  if (!f._h || f._h.a !== a || f._h.b !== b || f._h.c !== c) Object.defineProperty(f, '_h', { value: { a, b, c, h: a || b || c ? bam(`${a}\0${b}\0${c}`) : '' }, writable: true, configurable: true, enumerable: false });
  return f._h.h;
}
const kyKhung = (f) => JSON.stringify(banLuu(f)) + '|' + bamH(f);
const kyLan = (l) => JSON.stringify(banLuu(l));
const khungLuu = (f) => f.loai === 'bien' && !f.deXuat && coMan(f.goc); // khung đề xuất tạm («Sửa tiếp» góp ý) không vào kho chung
// đang dở tay trên máy này: không để bản máy chủ đè lên
const banKhung = (f) => !!f && (Sua.dangSua() === f.id || st.dangChay.has(f.id) || (!!f.lan && st.dangChay.has(f.lan)) || (daGui.has(`k:${f.id}`) && daGui.get(`k:${f.id}`) !== kyKhung(f)));
const banLan = (l) => !!l && (st.dangChay.has(l.id) || (daGui.has(`l:${l.id}`) && daGui.get(`l:${l.id}`) !== kyLan(l)));

async function goiKho(url, than) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-bs-phien': PHIEN, 'x-bs-nguoi': encodeURIComponent(rt?.ten() || ''), ...(CQ.la ? dauChuQuan() : {}) }, body: JSON.stringify(than) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403 && j.canMa && CQ.la) { CQ.la = false; CQ.luc = 0; $('#nut-ls-thay-doi').hidden = true; $('#nut-au-bang').hidden = true; } // mã đã đổi/thu hồi: thôi kèm mã cũ (khỏi đốt lượt thử)
    if (!r.ok) throw new Error(j.loi || `HTTP ${r.status}`);
    if (j.loi?.length) toast(`Máy chủ không nhận ${j.loi.length} mục: ${j.loi[0]}`, true);
    loiKho = 0; return j;
  } catch (e) {
    if (!loiKho++) toast(`Chưa lưu được biến thể lên máy chủ (${e.message}) — tự thử lại; tạm giữ trong trình duyệt này.`, true);
    luuDuPhong();
    luuLai(Math.min(30000, 2000 * loiKho)); return null;
  }
}
// máy chủ không nhận được: giữ tạm các mục chưa lên máy chủ trong localStorage (bs.v2) — lần gửi được sau, diTru đẩy lên rồi dọn
function luuDuPhong() {
  try {
    const khung = st.khung.filter((f) => khungLuu(f) && daGui.get(`k:${f.id}`) !== kyKhung(f)).map((f) => { const o = banLuu(f); o.html = f.html || ''; if (f.htmlSua) o.htmlSua = f.htmlSua; if (f.htmlGocSua) o.htmlGocSua = f.htmlGocSua; return o; });
    const lanBt = st.lanBt.filter((l) => daGui.get(`l:${l.id}`) !== kyLan(l)).map(banLuu);
    if (!khung.length && !lanBt.length) return;
    const cu = doc(KHOA_LUU, null) || {}; // gộp với bản cũ chưa di trú xong (không đè mất)
    const gop = (a, b) => [...(a || []).filter((x) => !b.some((y) => y.id === x?.id)), ...b];
    localStorage.setItem(KHOA_LUU, JSON.stringify({ khung: gop(cu.khung, khung), lanBt: gop(cu.lanBt, lanBt) }));
  } catch { /* đầy bộ nhớ trình duyệt: chỉ còn bản trong trang */ }
}
async function dongBoKho() {
  if (!khoSan) return; // chưa tải xong kho: napKho sẽ gọi lại
  if (dangDb) { laiDb = true; return; }
  dangDb = true;
  try {
    const con = new Set(), ghiL = [], ghiK = [];
    const can = (id, k) => daGui.get(id) !== k && tuChoi.get(id) !== k;
    for (const l of st.lanBt) { const id = `l:${l.id}`; con.add(id); const k = kyLan(l); if (can(id, k)) ghiL.push([l, k]); }
    for (const f of st.khung) { if (!khungLuu(f)) continue; const id = `k:${f.id}`; con.add(id); const k = kyKhung(f); if (can(id, k)) ghiK.push([f, k]); }
    const xoa = [];
    for (const id of daGui.keys()) if (!con.has(id)) xoa.push(id);
    for (const id of tuChoi.keys()) if (!con.has(id)) tuChoi.delete(id);
    let lo = { khung: [], lan: [] }, co = 0, ky = new Map();
    const day = async () => {
      if (!lo.khung.length && !lo.lan.length) return true;
      const j = await goiKho('/api/bien-the/ghi', lo); if (!j) return false;
      // chỉ đánh dấu «máy chủ đã có» những mục máy chủ THẬT SỰ ghi
      for (const m of j.khung || []) { daGui.set(`k:${m.id}`, ky.get(`k:${m.id}`)); tuChoi.delete(`k:${m.id}`); const f = timKhung(m.id); if (f) { f.tSua = m.tSua; f.bSv = m.b; } }
      for (const m of j.lan || []) { daGui.set(`l:${m.id}`, ky.get(`l:${m.id}`)); tuChoi.delete(`l:${m.id}`); const l = st.lanBt.find((x) => x.id === m.id); if (l) l.tSua = m.tSua; }
      for (const id of j.tuChoi?.khung || []) if (ky.has(`k:${id}`)) tuChoi.set(`k:${id}`, ky.get(`k:${id}`));
      for (const id of j.tuChoi?.lan || []) if (ky.has(`l:${id}`)) tuChoi.set(`l:${id}`, ky.get(`l:${id}`));
      await layBanMoiHon(j.xungDot);
      lo = { khung: [], lan: [] }; co = 0; ky = new Map(); return true;
    };
    const coSo = (o, x) => { if (Number.isFinite(x.tSua) && !dangChayO(x)) o.tSuaCu = x.tSua; return o; }; // bản máy chủ client đang dựa vào
    for (const [l, k] of ghiL) {
      if (lo.lan.length + lo.khung.length >= LO_TOI_DA && !(await day())) return;
      lo.lan.push(coSo(banLuu(l), l)); ky.set(`l:${l.id}`, k);
    }
    for (const [f, k] of ghiK) {
      const o = coSo(banLuu(f), f); if (typeof o.cha === 'string' && o.cha.startsWith('dx-')) o.cha = f.goc; // khung đề xuất tạm không lưu: không trỏ cha vào nó
      o.html = f.tt === 'dang' ? '' : f.html || ''; // HTML dở dang lúc đang sinh không gửi (người xem thấy «đang sinh…»)
      if (f.htmlSua) o.htmlSua = f.htmlSua; if (f.htmlGocSua) o.htmlGocSua = f.htmlGocSua;
      const n = (o.html.length + (f.htmlSua?.length || 0) + (f.htmlGocSua?.length || 0)) * 3 + 4000; // ước số BYTE (UTF-8 + thoát JSON)
      if ((co + n > 20e6 || lo.lan.length + lo.khung.length >= LO_TOI_DA) && !(await day())) return;
      lo.khung.push(o); co += n; ky.set(`k:${f.id}`, k);
    }
    if (!(await day())) return;
    for (let i = 0; i < xoa.length; i += LO_TOI_DA) {
      const phan = xoa.slice(i, i + LO_TOI_DA);
      const j = await goiKho('/api/bien-the/xoa', { khung: phan.filter((id) => id[0] === 'k').map((id) => id.slice(2)), lan: phan.filter((id) => id[0] === 'l').map((id) => id.slice(2)) });
      if (!j) return;
      for (const id of phan) daGui.delete(id);
    }
    if (doc(KHOA_LUU, null)) await diTru(); // còn bản dự phòng / di trú dở: đẩy nốt lên rồi dọn
  } finally { dangDb = false; if (laiDb) { laiDb = false; luuLai(0); } }
}
// đang sinh thì cứ 45 giây làm mới khung «đang sinh» trên máy chủ (người khác biết việc còn chạy)
setInterval(() => {
  if (!st.dangChay.size) return;
  for (const f of st.khung) if (f.tt === 'dang' && dangChayO(f)) daGui.delete(`k:${f.id}`);
  for (const l of st.lanBt) if (st.dangChay.has(l.id)) daGui.delete(`l:${l.id}`);
  luuLai(0);
}, 45000);
// khung/phương án «đang sinh» của NGƯỜI KHÁC không được làm mới quá 2,5 phút ⇒ người sinh đã đóng trang: đổi sang «gián đoạn» (chỉ trên máy này)
const GIAN_DOAN = 'Bị gián đoạn khi đang sinh — bấm Thử lại.';
setInterval(() => {
  let doi = false;
  for (const f of st.khung) {
    if (f.loai !== 'bien' || f.tt !== 'dang' || dangChayO(f) || tuoiSv(f) <= DANG_CU) continue;
    const dongBo = daGui.get(`k:${f.id}`) === kyKhung(f);
    f.tt = 'loi'; f.loi = GIAN_DOAN; delete f.tienDo; doi = true;
    if (dongBo) daGui.set(`k:${f.id}`, kyKhung(f)); // chỉ đổi hiển thị, không ghi đè lên máy chủ
  }
  for (const l of st.lanBt) {
    if (l.tt !== 'dang' || st.dangChay.has(l.id) || tuoiSv(l) <= DANG_CU) continue;
    const dongBo = daGui.get(`l:${l.id}`) === kyLan(l);
    l.tt = 'loi'; l.loi = GIAN_DOAN; doi = true;
    if (dongBo) daGui.set(`l:${l.id}`, kyLan(l));
  }
  if (doi) veTatCa();
}, 30000);
// máy chủ có bản mới hơn bản mình sửa (người khác vừa ghi): lấy bản máy chủ, bỏ thay đổi cục bộ của mục đó
async function layBanMoiHon(xd) {
  const dsL = xd?.lan || [], dsK = xd?.khung || [];
  if (!dsL.length && !dsK.length) return;
  let n = 0;
  for (const m of dsL) { if (apLan(m, true)) n++; else { const l = st.lanBt.find((x) => x.id === m.id); if (l) l.tSua = m.tSua; } }
  for (const g of await taiKhung(dsK)) { if (apKhung(g, g, true)) n++; else { const f = timKhung(g.id); if (f) f.tSua = g.tSua; } } // đang sửa/đang chạy trên máy này: bản của mình ghi đè ở lần lưu sau
  if (n) toast(`Người khác vừa sửa ${n} mục trước bạn — đã lấy bản mới nhất.`, true);
  else luuLai(0);
  veTatCa();
}

// ---- áp bản máy chủ vào bàn
function apLan(m, ep = false) {
  if (!m || !LAN_GOC.some((g) => g.id === m.tu)) return false;
  let l = st.lanBt.find((x) => x.id === m.id);
  if (l && (ep ? st.dangChay.has(l.id) : banLan(l))) return false;
  const moi = { ...m };
  if (moi.tt === 'dang' && tuoiSv(m) > DANG_CU) { moi.tt = 'loi'; moi.loi = GIAN_DOAN; }
  if (l) { for (const k of Object.keys(l)) delete l[k]; Object.assign(l, moi); } else st.lanBt.push(l = moi);
  daGui.set(`l:${l.id}`, kyLan(l)); return true;
}
// nguon: nơi lấy HTML (bản tải từ máy chủ, hoặc chính khung đang có khi HTML không đổi)
function apKhung(m, nguon, ep = false) {
  if (!m || !coMan(m.goc)) return false;
  if (m.lan && !st.lanBt.some((l) => l.id === m.lan)) return false; // màn của phương án không còn: không dựng khung mồ côi
  let f = timKhung(m.id);
  if (f && (f.loai !== 'bien' || (ep ? Sua.dangSua() === f.id || dangChayO(f) : banKhung(f)))) return false;
  const html = nguon?.html || '';
  const moi = { ...m, html: html ? (nguon === f ? html : lamSach(html)) : '', bSv: m.b, x: f?.x || 0, y: f?.y || 0 }; delete moi.b; delete moi.htmlSua; delete moi.htmlGocSua;
  if (f?.htmlGoc) moi.htmlGoc = f.htmlGoc; if (f?.tenGoc) moi.tenGoc = f.tenGoc; // nguồn «Thử lại» cục bộ, không đồng bộ
  if (nguon?.htmlSua) moi.htmlSua = nguon.htmlSua;
  if (nguon?.htmlGocSua) moi.htmlGocSua = nguon.htmlGocSua;
  if (moi.tt === 'dang') {
    if (tuoiSv(m) > DANG_CU) { moi.tt = 'loi'; moi.loi = GIAN_DOAN; }
    else moi.tienDo = `${m.nguoi || 'Người khác'} đang sinh…`;
  }
  if (f) { for (const k of Object.keys(f)) delete f[k]; Object.assign(f, moi); } else st.khung.push(f = moi);
  daGui.set(`k:${f.id}`, kyKhung(f)); return true;
}
function boKhung(ids) {
  const xoa = ids.filter((id) => { const f = timKhung(id); return f && f.loai === 'bien' && !banKhung(f) && Sua.dangSua() !== id && !dangDungBt(f); });
  for (const id of ids) if (!timKhung(id)) daGui.delete(`k:${id}`);
  if (!xoa.length) return 0;
  for (const id of xoa) { daGui.delete(`k:${id}`); xoaXa.ds.set(id, ++xoaXa.n); }
  // nối lại cha cho màn con: người xoá đã ghi cha mới lên máy chủ ⇒ không coi là thay đổi của máy này
  for (const f of st.khung) if (xoa.includes(f.cha)) { const dongBo = daGui.get(`k:${f.id}`) === kyKhung(f); f.cha = timKhung(f.cha)?.cha || f.goc; if (dongBo) daGui.set(`k:${f.id}`, kyKhung(f)); }
  st.khung = st.khung.filter((f) => !xoa.includes(f.id)); for (const id of xoa) st.chon.delete(id);
  return xoa.length;
}
function boLan(ids) {
  const xoa = ids.filter((id) => { const l = st.lanBt.find((x) => x.id === id); return l && !banLan(l); });
  for (const id of ids) if (!st.lanBt.some((x) => x.id === id)) daGui.delete(`l:${id}`);
  if (!xoa.length) return 0;
  for (const id of xoa) daGui.delete(`l:${id}`);
  for (const f of st.khung) if (f.lan && xoa.includes(f.lan)) daGui.delete(`k:${f.id}`); // máy chủ đã đưa các màn vào thùng rác cùng phương án
  for (const id of xoa) xoaXa.ds.set(id, ++xoaXa.n);
  st.lanBt = st.lanBt.filter((l) => !xoa.includes(l.id));
  st.khung = st.khung.filter((f) => !f.lan || !xoa.includes(f.lan));
  if (xoa.includes(st.lanChon)) st.lanChon = null;
  return xoa.length;
}
// tải HTML các khung đổi (6 yêu cầu song song)
let henTaiLai = 0;
async function taiKhung(ds) { // mỗi yêu cầu tối đa 40 khung, 3 yêu cầu song song; máy chủ trả phần chưa kịp trong «con»
  const hang = ds.map((m) => m.id); const ra = []; let hong = false;
  await Promise.all(Array.from({ length: Math.min(3, Math.ceil(hang.length / 40)) }, async () => {
    while (hang.length) {
      const ids = hang.splice(0, 40);
      try {
        const r = await fetch(`/api/bien-the/goi?ids=${ids.map(encodeURIComponent).join(',')}`); if (!r.ok) throw new Error(r.status);
        const j = await r.json(); ra.push(...(j.ds || [])); if (j.con?.length) hang.push(...j.con);
      } catch { hong = true; }
    }
  }));
  if (hong) { clearTimeout(henTaiLai); henTaiLai = setTimeout(napKho, 5000); } // lỗi mạng thoáng qua: nạp lại kho sau 5 giây
  return ra;
}
async function apDs(dsK, dsL) {
  let n = 0;
  for (const m of dsL) if (apLan(m)) n++;
  const canTai = [];
  for (const m of dsK) {
    if (!coMan(m?.goc)) continue;
    const f = timKhung(m.id);
    if (banKhung(f) || (f && f.tSua === m.tSua && f.bSv === m.b)) continue;
    if (m.b && f?.bSv !== m.b) canTai.push(m); else if (apKhung(m, f)) n++;
  }
  for (const g of await taiKhung(canTai)) if (apKhung(g, g)) n++;
  return n;
}

// ---- nạp cả kho (lúc mở trang + mỗi lần nối lại realtime): bản máy chủ là chuẩn, trừ mục đang dở tay trên máy này
let dangNap = null, napLuc = 0;
function napKho() { return (dangNap ||= (async () => { try { await napKho2(); } finally { dangNap = null; } })()); }
async function napKho2() {
  if (!khoSan) await diTru();
  const truoc = new Map(daGui); // chỉ mục máy này ĐÃ biết là có trên máy chủ TRƯỚC khi hỏi mới được coi là bị người khác xoá
  let j; const t0 = Date.now();
  try { const r = await fetch('/api/bien-the'); if (!r.ok) throw new Error(r.status); j = await r.json(); }
  catch { toast('Chưa tải được kho biến thể từ máy chủ — thử lại sau 5 giây.', true); setTimeout(napKho, 5000); return; }
  if (Number.isFinite(j.gio)) lechGio = j.gio - Math.round((t0 + Date.now()) / 2);
  const svK = new Set(j.khung.map((m) => m.id)), svL = new Set(j.lan.map((m) => m.id));
  const daXoa = (c) => [...truoc.keys()].filter((id) => id[0] === c && !(c === 'k' ? svK : svL).has(id.slice(2)) && daGui.get(id) === truoc.get(id)).map((id) => id.slice(2));
  const xoaK = daXoa('k'), xoaL = daXoa('l');
  await apDs(j.khung, j.lan);
  // mục máy này từng có trên máy chủ mà nay không còn ⇒ người khác đã xoá
  boKhung(xoaK.filter((id) => daGui.has(`k:${id}`)));
  boLan(xoaL.filter((id) => daGui.has(`l:${id}`)));
  const dau = !khoSan; khoSan = true; napLuc = Date.now();
  if (dau && boLoKho) { boLoKho = false; setTimeout(napKho, 0); } // có thay đổi phát tới trong lúc nạp lần đầu: nạp lại cho khớp
  veTatCa();
  if (dau && !st.views[khoaView()]) vuaMan();
  luuLai(0);
}
// Lần đầu mở bản này: biến thể cũ trong localStorage chuyển lên máy chủ (chỉ thêm mục máy chủ chưa có), xong thì dọn.
async function diTru() {
  const cu = doc(KHOA_LUU, null);
  if (!cu || (!cu.khung?.length && !cu.lanBt?.length)) return;
  const lan = (cu.lanBt || []).map((l) => (l.tt === 'dang' ? { ...l, tt: 'loi', loi: 'Trang đã tải lại khi đang sinh.' } : l));
  const khung = (cu.khung || []).filter((f) => f && f.loai === 'bien').map(({ htmlGoc, tenGoc, ...f }) => (f.tt === 'dang' ? { ...f, tt: 'loi', loi: 'Trang đã tải lại khi đang sinh — bấm Thử lại.' } : f));
  let lo = { khung: [], lan: [] }, co = 0, them = 0; const hong = { khung: [], lanBt: [] };
  const day = async () => {
    if (!lo.khung.length && !lo.lan.length) return true;
    const j = await goiKho('/api/bien-the/di-tru', lo); if (!j) return false;
    them += (j.khung?.length || 0);
    const bk = new Set(j.tuChoi?.khung || []), bl = new Set(j.tuChoi?.lan || []);
    hong.khung.push(...lo.khung.filter((f) => bk.has(f.id))); hong.lanBt.push(...lo.lan.filter((l) => bl.has(l.id)));
    lo = { khung: [], lan: [] }; co = 0; return true;
  };
  for (const l of lan) { if (lo.lan.length >= LO_TOI_DA && !(await day())) return; lo.lan.push(l); }
  for (const f of khung) {
    const n = ((f.html || '').length + (f.htmlSua?.length || 0) + (f.htmlGocSua?.length || 0)) * 3 + 4000;
    if ((co + n > 20e6 || lo.lan.length + lo.khung.length >= LO_TOI_DA) && !(await day())) return;
    lo.khung.push(f); co += n;
  }
  if (!(await day())) return;
  try {
    // mục máy chủ không nhận (quá lớn, sai dạng…) giữ lại riêng trong trình duyệt này, không mất
    if (hong.khung.length || hong.lanBt.length) localStorage.setItem(`${KHOA_LUU}.khong-nhan`, JSON.stringify(hong));
    localStorage.removeItem(KHOA_LUU);
  } catch { /* bỏ qua */ }
  if (them) toast(`Đã chuyển ${them} biến thể từ trình duyệt này lên kho chung của bàn.`);
  if (hong.khung.length || hong.lanBt.length) toast(`${hong.khung.length + hong.lanBt.length} mục cũ máy chủ không nhận — vẫn giữ trong trình duyệt này (${KHOA_LUU}.khong-nhan).`, true);
}

// ---- thay đổi người khác vừa ghi (máy chủ phát)
let henVe = 0;
async function nhanKho(m) {
  if (m.tu === PHIEN) return;
  if (!khoSan) { boLoKho = true; return; } // đang nạp lần đầu: nạp xong sẽ nạp lại
  const ai = String(m.ten || 'Người khác').slice(0, 40);
  if (m.loai === 'ghi') {
    const moiXong = (m.khung || []).filter((x) => x.tt === 'xong' && !timKhung(x.id)).length;
    const n = await apDs(Array.isArray(m.khung) ? m.khung : [], Array.isArray(m.lan) ? m.lan : []);
    if (!n) return;
    if (moiXong) toast(`${ai} vừa thêm ${moiXong} biến thể.`);
  } else if (m.loai === 'xoa') {
    const n = boKhung(Array.isArray(m.khung) ? m.khung : []) + boLan(Array.isArray(m.lan) ? m.lan : []);
    if (!n) return;
    toast(`${ai} vừa xoá ${n} mục (còn trong 🗑 Thùng rác 7 ngày).`);
  } else return;
  clearTimeout(henVe); henVe = setTimeout(() => { veTatCa(); veBang(); }, 60); // gộp nhiều thay đổi liền nhau thành một lần vẽ
}
function khiCham() { /* «thay màn» nay do máy chủ phát ({t:'rv'}), không còn gói client cần gửi lại */ }

// ---- thùng rác (xoá mềm 7 ngày)
async function moRac() {
  const lop = $('#lop-rac'); const ds = $('#rac-ds'); ds.textContent = 'Đang tải…'; lop.hidden = false;
  let j; try { j = await (await fetch('/api/bien-the/rac')).json(); } catch { ds.textContent = 'Không tải được thùng rác.'; return; }
  ds.innerHTML = '';
  const muc = (j.ds || []).filter((x) => x.l === 'l' || coMan(x.goc));
  if (!muc.length) { ds.textContent = 'Thùng rác trống.'; return; }
  for (const x of muc) {
    const hang = document.createElement('div'); hang.className = 'rac-muc';
    const t = document.createElement('div'); t.className = 'rac-t';
    const ten = x.l === 'l' ? `Phương án ${x.k || ''} — ${x.nhan || x.yTuong || x.id}` : `${x.nhan || 'Biến thể'} · ${MAN[x.goc].ten}`;
    const tg = new Date(x.tXoa).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    t.append(Object.assign(document.createElement('b'), { textContent: ten }), Object.assign(document.createElement('span'), { className: 'phu', textContent: `xoá ${tg}${x.nguoiXoa ? ' · ' + x.nguoiXoa : ''}` }));
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Khôi phục';
    b.onclick = async () => {
      b.disabled = true;
      // phương án: khôi phục cả các màn của nó
      // màn của một phương án: phương án đã xoá thì khôi phục cả phương án (không để khung mồ côi)
      const lanId = x.l === 'l' ? x.id : (x.lan && !st.lanBt.some((l) => l.id === x.lan) ? x.lan : null);
      const khungLan = lanId ? (j.ds || []).filter((y) => y.l === 'k' && y.lan === lanId).map((y) => y.id) : [];
      if (lanId && !khungLan.includes(x.id) && x.l === 'k') khungLan.push(x.id);
      if (lanId && x.l === 'k' && !(j.ds || []).some((y) => y.l === 'l' && y.id === lanId)) { toast('Phương án của màn này không còn trong thùng rác — không khôi phục lẻ được.', true); b.disabled = false; return; }
      let r = await goiKho('/api/bien-the/khoi-phuc', lanId ? { lan: [lanId], khung: khungLan.slice(0, 199) } : { khung: [x.id] });
      for (let i = 199; r && i < khungLan.length; i += 199) r = await goiKho('/api/bien-the/khoi-phuc', { khung: khungLan.slice(i, i + 199) });
      if (!r) { b.disabled = false; return; }
      hang.remove(); toast('Đã khôi phục.');
    };
    hang.append(t, b); ds.append(hang);
  }
}
$('#nut-rac').onclick = moRac;
$('#rac-dong').onclick = () => { $('#lop-rac').hidden = true; };
// tin realtime «thay»: đi chung hàng đồng bộ (tuần tự, không ghi PB đua nhau)
async function napLaiPhienBan(key) { if (coMan(key)) await dongBoPhienBan(); }
// Đối chiếu MỌI màn với máy chủ: tin realtime «thay» có thể lỡ (WebSocket rớt/nối lại khi deploy, máy ngủ, tab nền) ⇒ bàn và Play kẹt bản cũ
// tới khi tải lại trang. Gọi khi nối lại realtime, khi mở Play, khi quay lại tab. Chỉ tải HTML của màn đổi bản.
// Tuần tự: lời gọi tới khi đang chạy ⇒ chạy thêm MỘT lượt sau (manifest lấy SAU tin mới nhất), không chạy chồng.
let dongBoDang = null, dongBoLai = false, pbDaNap = false;
function dongBoPhienBan() {
  if (dongBoDang) { dongBoLai = true; return dongBoDang; }
  dongBoDang = (async () => { let n = 0; do { dongBoLai = false; n += await dongBoPhienBan0(); } while (dongBoLai); return n; })().finally(() => { dongBoDang = null; });
  return dongBoDang;
}
async function dongBoPhienBan0() {
  let ds; try { const r = await fetch('/api/phien-ban', { cache: 'no-store' }); if (!r.ok) return 0; ds = await r.json(); } catch { return 0; }
  // phiên bản chỉ thêm, không xoá ⇒ chỉ nhận manifest máy chủ DÀI HƠN bản đang có (fetch gửi trước một lần Thay màn của chính phiên này
  // về sau thì ngắn hơn — bỏ, không ghi đè bản mới). Manifest hỏng (không có ds) cũng bỏ.
  const moiHon = (a, b) => Array.isArray(a?.ds) && a.ds.length > (b?.ds?.length || 0);
  const doi = Object.keys(MAN).filter((k) => !dangThay.has(k) && moiHon(ds[k], PB[k]));
  if (!doi.length) return 0;
  await Promise.all(doi.map(async (k) => {
    const truoc = PB[k];
    const moi = ds[k];
    try { PB[k] = moi; await apPhienBan(k); } catch { if (PB[k] === moi) { if (truoc) PB[k] = truoc; else delete PB[k]; } } // chỉ trả lại khi chưa ai đặt bản mới hơn
  }));
  qtDaVe = ''; veTatCa();
  if (!$('#lop-ls').hidden && doi.includes(ls.key)) veLichSu();
  if (!$('#lop-play').hidden) vePlay('');
  return doi.length;
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') dongBoPhienBan(); });
function nhanSu(m, p) {
  if (m.loai === 'thay' && coMan(m.key)) napLaiPhienBan(m.key).then(() => toast(`${p.ten} vừa đổi phiên bản màn «${MAN[m.key].ten}».`));
}
GY = ganGopY({ MAN, LAN_GOC, timLan, timKhung, st, dom, PB, toast, vuaMan, veTatCa, veBen, doiSec: (sec, cheDo) => doiSec(sec, { bay: false, cheDo }), secCuaLan, lamSach,
  moLichSuAudit: (loc) => LS.mo(loc), daMoKhoa: () => laChuQuan(true),
  tenNguoi: () => rt?.ten() || '', phien: PHIEN,
  svgHanhTrinh: (id) => qt.svgHanhTrinh(id),
  napLai: (key) => napLaiPhienBan(key),
  // «✨ Sửa theo góp ý»: chọn màn gốc, điền ý = các góp ý, chạy luồng sinh biến thể như thường (prompt caching)
  sinhTheoY(key, y) {
    if (!coMan(key)) return;
    st.lanChon = null; st.chon.clear(); st.chon.add(key); veTatCa(false);
    $('#y-tuong').value = y; capNhatXemPrompt(); sinh();
  },
  // «Accept changes» xong: máy chủ trả manifest mới → áp ngay + báo các bàn khác như Thay màn
  async apManifest(key, m) {
    if (!coMan(key) || !m) return;
    PB[key] = m; await apPhienBan(key);
    qtDaVe = ''; veTatCa(); luuLai(); // các bàn khác nhận {t:'rv', loai:'thay'} do máy chủ phát — không phát thêm lần nữa
  },
  // «Sửa tiếp»: đưa bản đề xuất lên bàn thành khung tạm cạnh màn gốc, mở Chế độ Sửa; Thay màn từ khung này = Accept
  moDeXuatTrenBan(dx, html) {
    if (!coMan(dx.key)) return;
    const id = `dx-${dx.id}`;
    let f = timKhung(id);
    if (!f) {
      f = { id, loai: 'bien', goc: dx.key, cha: dx.key, html: lamSach(html), w: dx.w || MAN[dx.key].w, h: dx.h || MAN[dx.key].h, x: 0, y: 0, tt: 'xong',
        nhan: `Đề xuất của ${dx.ten}`, yTuong: dx.nhan || 'Đề xuất từ góp ý', model: dx.model || '', deXuat: { ht: dx.ht, id: dx.id, key: dx.key, ten: dx.ten, h0: lamSach(html) } };
      st.khung.push(f);
    }
    st.chon.clear(); st.chon.add(id); veTatCa(); vuaMan([dx.key, id]);
    setTimeout(() => Sua.batSua(id), 150);
  },
});
// khiChao: nối lại realtime ⇒ đồng bộ phiên bản màn (lần nối đầu taiPhienBan đang nạp, bỏ qua)
rt = taoRealtime({ st, vung, dom, phong: 'bang', toast, nhanSu, nhanKho, khiChao: () => { if (Date.now() - napLuc > 3000) napKho(); if (pbDaNap) dongBoPhienBan(); }, khiCham, nhanRv: (m) => GY?.nhanRv(m), sec: () => st.sec, cheDo: () => st.cheDo, suaId: () => Sua.dangSua(),
  doiSec: (sec, cheDo) => doiSec(sec, { bay: false, cheDo }), datView: (v) => { st.view = v; apView(); luuView(); } });

Sua.gan({ st, dom, vung, timKhung, khungChon, kichThuoc, htmlCua, tenCua, keyCua, veTatCa, veKhung, veBang, vuaMan, luuLai, toast, henAo, so,
  lamSach, goiClaude, goiMock, taiAssets, canKey, laMock, modelDung, thayMan });
// «🕘 Lịch sử thay đổi» (audit máy chủ) — chỉ chủ quản thấy nút; máy chủ vẫn kiểm quyền ở mọi yêu cầu
async function laChuQuan(lai = false) {
  if (!lai && Date.now() - CQ.luc < 30000) return CQ.la;
  try { const j = await (await fetch('/api/review/toi', { headers: dauChuQuan() })).json(); CQ.la = !!j.chuQuan; } catch { CQ.la = false; }
  CQ.luc = Date.now(); $('#nut-ls-thay-doi').hidden = !CQ.la; $('#nut-au-bang').hidden = !CQ.la;
  return CQ.la;
}
const LS = ganLichSu({ MAN, LAN_GOC, toast, lamSach, chuQuan: () => laChuQuan(true), taiGopY: () => GY.tai(), tenNguoi: () => rt?.ten() || '',
  async apManifest(key, m) { if (!coMan(key) || !m) return; PB[key] = m; await apPhienBan(key); qtDaVe = ''; veTatCa(); } });
$('#nut-au-bang').onclick = () => {
  const f = khungChon(); const l = !f && st.lanChon ? timLan(st.lanChon) : null;
  if (f) LS.mo(f.loai === 'goc' ? { key: f.key } : { id: f.id, ten: tenCua(f) });
  else if (l) LS.mo(l.goc ? { ht: l.id } : { id: l.id, ten: `Phương án ${l.k}` });
};
napKho();
GY.tai();
laChuQuan();
window.__bs = { GY, LS, rt, khoXong: () => khoSan, napKho, moRac, daGui, luuLai, pbXong: taiPhienBan().then(() => { pbDaNap = true; qtDaVe = ''; veTatCa(); if (!$('#lop-play').hidden) vePlay(''); return true; }), st, MAN, PB, thayBangKhung, moLichSu, xoaKhung, datBen, vuaMan, sinh, moPlay, diToi, veTatCa, caiDat, chonLan, doiSec, doiCheDo, qt, SECTIONS, dom, anhNho, Sua }; // để nghiệm thu tự động
