// Cổng chuẩn giao diện đo bằng máy — 5 luật của aiigrow-thiet-ke/TIEU-CHUAN-GIAO-DIEN.md (cách đo lấy từ kiem-giao-dien.mjs +
// do-tay-gradient.mjs của repo đó), chạy trên bản web export qua Chrome headless của scripts/pha.mjs (`--giao-dien`):
//   TUONG-PHAN  WCAG 1.4.3: chữ thường ≥ 4.5:1, chữ lớn (≥ 24px, hoặc ≥ 18.66px đậm) ≥ 3:1 với nền THẬT (trộn mọi lớp nền trong suốt).
//               Nền gradient/ảnh: ẩn chữ, chụp màn, so chữ sáng với pixel nền sáng nhất / chữ tối với pixel tối nhất (phân vị 99/1).
//   NUT-2-DONG  Material 3: nhãn nút / chip / tab chỉ một dòng.
//   DE-ANH      WCAG 1.4.12 + F104: dòng chữ không chồng lên ảnh / mascot / svg không phải của nó.
//   TRAN        WCAG 1.4.10: 320px không cuộn ngang; chữ không vượt khung có nền/viền.
//   LE-THE      Chữ / ảnh nhỏ / nút trong thẻ clay cách mép trái-phải thẻ (lề 16): nút / ảnh ≥ 15.5, dòng chữ ≥ 12 (web đo dòng theo
//               font dự phòng nên lố 1–4px). Không đo ở lượt giãn chữ. TestFlight build 6: nội dung dính mép thẻ.
//   NUT-TRAN    Thanh 25/10 «chữ dài bị hỏng nút»: chữ trong nút không ló khỏi khung nút (trừ khi cắt gọn «…»), không cắt nửa dòng,
//               nút không tràn khỏi thẻ / màn. pha.mjs chạy thêm một lượt dữ liệu chữ dài (tên con 30, tên máy 40, tên miền 60 ký tự).
//   GIAN-CHU    WCAG 1.4.12: ép giãn dòng 1.5×, đoạn 2×, chữ 0.12em, từ 0.16em — ba luật sau vẫn phải đạt.
// Khác bản gốc cho React Native Web: nút = phần tử role=button/tab/link (Pressable), ảnh = <img> (expo-image) + svg lớn.

/** Đo trong trang → danh sách lỗi + các dòng chữ trên nền gradient/ảnh cần đo pixel. */
export const DO = String.raw`(() => {
  const L = [], DO_TAY = [];
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=.03928? v/12.92 : ((v+.055)/1.055)**2.4; }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  const mau = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number).concat(m.length===3?[1]:[]) : [0,0,0,0]; };
  const tron = (tren, duoi) => { const a = tren[3]; return [0,1,2].map(i => tren[i]*a + duoi[i]*(1-a)).concat([1]); };
  // Nền thật: trộn các lớp nền trong suốt từ chữ ra ngoài tới lớp đặc đầu tiên; gặp background-image (gradient/ảnh) trước lớp đặc ⇒ đo tay.
  const nen = el => { const lop = []; let anh = false;
    for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') { anh = /url\(/.test(cs.backgroundImage) ? 'anh' : 'gradient'; break; }
      const m = mau(cs.backgroundColor); if (m[3] > 0) { lop.push(m); if (m[3] >= 1) break; } }
    let kq = [255,255,255,1]; for (const m of lop.reverse()) kq = tron(m, kq); return [kq, anh]; };
  const ten = e => (e.tagName.toLowerCase() + (e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : '') + (e.getAttribute('aria-label') ? ' «' + e.getAttribute('aria-label').slice(0, 30) + '»' : '')).slice(0, 70);
  const hien = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && +cs.opacity>0.05; };
  const dongCua = node => { const rg = document.createRange(); rg.selectNodeContents(node); return [...rg.getClientRects()].filter(r => r.width>1); };
  const tn = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (n.textContent.trim().length && n.parentElement && hien(n.parentElement) && !n.parentElement.closest('script,style,[aria-hidden=true]')) tn.push(n); }
  const anhs = [...document.querySelectorAll('img,svg,video,canvas')].filter(hien).filter(a => { const r=a.getBoundingClientRect(); return r.width*r.height > 900; })
    // Đang mở hộp thoại (Modal RN-web = aria-modal): nội dung phía sau bị phủ, không ai đọc chữ đè lên nó ⇒ chỉ xét ảnh trong hộp thoại trên cùng.
    .filter((a) => { const hop = [...document.querySelectorAll('[aria-modal=true]')].filter(hien).pop(); return !hop || hop.contains(a); });
  // Ảnh NỔI (nút trợ giúp góc màn): có tổ tiên absolute/fixed và không nằm trong vùng cuộn. Nội dung cuộn dưới nó lộ ra được khi cuộn
  // (WCAG 2.4.11 / F104 xét nội dung KHÔNG lộ ra được) ⇒ chỉ xét ở lượt đã cuộn hết (window.__gdCuoi), khi chữ cuối phải nằm ngoài nó.
  const noi = a => { let abs = false; for (let e = a; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e);
    if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight) return false; if (cs.position === 'fixed' || cs.position === 'absolute') abs = true; } return abs; };
  const cuoi = !!window.__gdCuoi;
  // Ảnh là đồ hoạ CỦA chữ: cùng một thành phần bấm được (thẻ «Cần giúp?»), hoặc ảnh là nền của khung nhỏ chứa chữ (vòng tiến độ).
  const dienTich = e => { const r = e.getBoundingClientRect(); return r.width * r.height; };
  // Phần ảnh THẤY ĐƯỢC: cắt theo mọi khung tổ tiên có overflow ≠ visible (ScrollView). Ảnh cuộn xuống dưới thanh tab / nút đáy cố định
  // nằm ngoài khung cuộn ⇒ bị cắt, không đè chữ của thanh. Trả null nếu khuất hết.
  const thayDuoc = (a) => { let r = a.getBoundingClientRect(), L0 = r.left, T0 = r.top, R0 = r.right, B0 = r.bottom;
    for (let k = a; k && k !== document.body; k = k.parentElement) { const ks = getComputedStyle(k);
      if (ks.position === 'fixed') break;   // phần tử fixed thoát mọi khung cuộn
      if (k !== a && (ks.overflowX !== 'visible' || ks.overflowY !== 'visible')) { const c = k.getBoundingClientRect();
        L0 = Math.max(L0, c.left); T0 = Math.max(T0, c.top); R0 = Math.min(R0, c.right); B0 = Math.min(B0, c.bottom); } }
    return R0 - L0 > 0 && B0 - T0 > 0 ? { left: L0, top: T0, right: R0, bottom: B0 } : null; };
  const cuaNo = (a, el) => { const nut = el.closest('[role=button],[role=link]'); if (nut && nut.contains(a)) return true;
    const k = a.parentElement; return !!k && k.contains(el) && dienTich(k) <= 2 * dienTich(a); };
  const daBao = new Set();
  for (const n of tn) {
    const el = n.parentElement, cs = getComputedStyle(el), chu = n.textContent.trim().slice(0,50);
    const co = parseFloat(cs.fontSize), dam = +cs.fontWeight >= 700, lon = co >= 24 || (co >= 18.66 && dam);
    // 1. tương phản (lượt đã cuộn hết chỉ xét ảnh nổi đè chữ)
    const [bg, anh] = nen(el); const fg = tron(mau(cs.color), bg);
    if (cuoi) { /* bỏ */ } else if (anh) { const r = dongCua(n)[0]; if (r) DO_TAY.push({ chu, mau: mau(cs.color).slice(0,3), can: lon?3:4.5, r: [r.left, r.top, r.width, r.height].map(Math.round), el: ten(el), nen: anh }); }
    else { const ti = (Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);
      if (ti < (lon ? 3 : 4.5) && !daBao.has('tp'+chu)) { daBao.add('tp'+chu); L.push({luat:'TUONG-PHAN', chu, el:ten(el), ti:+ti.toFixed(2), can: lon?3:4.5, mau: cs.color, nen: 'rgb('+bg.slice(0,3).map(Math.round)+')'}); } }
    // 2. nút rớt dòng — «nhãn nút» = phần tử bấm được chỉ có MỘT dòng chữ nhãn (Nut, chip, tab). Thẻ / hàng danh sách bấm được có nhiều
    // chữ (tiêu đề + dòng phụ) là list item theo Material 3, được xuống dòng — không xét.
    const nut = el.closest('button,a,[role=button],[role=tab],[role=link],[role=checkbox],[role=switch],[role=radio]');
    // Có hình minh hoạ (ảnh > 30×30, không phải icon) thì là thẻ / banner, không phải nút — Material 3: nút chỉ mang icon.
    const motNhan = nut && !anhs.some((a) => nut.contains(a)) && (() => { let k = 0; const w2 = document.createTreeWalker(nut, NodeFilter.SHOW_TEXT); while (w2.nextNode()) if (w2.currentNode.textContent.trim()) k++; return k === 1; })();
    // nút một mình cả hàng (≥ 90% bề ngang khung cha — nút «rong») được 2 dòng căn giữa cho nhãn có tên dài; nút cạnh nút khác: một dòng
    const longCha = (p) => { const cs = getComputedStyle(p); return p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
    const motHang = nut && nut.parentElement && nut.getBoundingClientRect().width >= 0.9 * longCha(nut.parentElement);
    if (!cuoi && motNhan && chu.split(/\s+/).length <= 8) { const tops = new Set(dongCua(n).map(r => Math.round(r.top))); if (tops.size > (motHang ? 2 : 1)) L.push({luat:'NUT-2-DONG', chu, el:ten(nut), dong: tops.size, rong: Math.round(nut.getBoundingClientRect().width)}); }
    // 3. đè ảnh
    for (const r of dongCua(n)) for (const a of anhs) { if (a.contains(el) || el.contains(a) || cuaNo(a, el) || noi(a) !== cuoi) continue; const q = thayDuoc(a); if (!q) continue;
      const x = Math.min(r.right,q.right)-Math.max(r.left,q.left), y = Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);
      if (x > 4 && y > 4 && x*y > 0.15*r.width*r.height) { const k='da'+chu+ten(a); if (!daBao.has(k)) { daBao.add(k); L.push({luat:'DE-ANH', chu, el:ten(el), anh: ten(a) + (a.src? ' '+a.src.split('/').pop().split('.')[0]:'' )}); } } }
    // 4. tràn khung có nền/viền
    if (!cuoi) for (let k = el; k && k !== document.body; k = k.parentElement) { const ks = getComputedStyle(k);
      if (mau(ks.backgroundColor)[3] > 0 || parseFloat(ks.borderTopWidth) > 0 || ks.overflow !== 'visible') { const q = k.getBoundingClientRect();
        const ra = dongCua(n).some(r => r.right > q.right + 2 || r.left < q.left - 2 || r.bottom > q.bottom + 2);
        if (ra && ks.overflow === 'visible' && !daBao.has('tr'+chu)) { daBao.add('tr'+chu); L.push({luat:'TRAN', chu, el:ten(el), khung: ten(k)}); }
        break; } }
  }
  if (!cuoi && document.documentElement.scrollWidth > innerWidth + 1) L.push({luat:'TRAN', chu:'(cả trang)', el:'html', rong: document.documentElement.scrollWidth});
  // 5. NUT-TRAN (Thanh 25/10 «chữ dài bị hỏng nút»): tên con / tên máy / tên miền dài không được làm vỡ nút.
  //    (a) chữ trong nút không ló ra ngoài khung nút (trừ khi bị cắt gọn «…» bởi chính khung chữ), (b) chữ không bị cắt NỬA dòng theo
  //    chiều dọc, (c) nút không tràn ra ngoài thẻ chứa nó / ra ngoài màn. Nút trong vùng cuộn ngang (thanh chip trượt) được nằm ngoài màn.
  if (!cuoi) {
    const NUTS = 'button,[role=button],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=link]';
    const cuonNgang = e => { for (let k = e.parentElement; k && k !== document.body; k = k.parentElement) { const cs = getComputedStyle(k);
      if (/(auto|scroll)/.test(cs.overflowX) && k.scrollWidth > k.clientWidth + 1) return true; } return false; };
    const ngoaiMan = e => { const r = e.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight * 4; };
    const daNut = new Set();
    for (const b of [...document.querySelectorAll(NUTS)].filter(hien)) {
      if (b.parentElement?.closest(NUTS) || ngoaiMan(b) || cuonNgang(b)) continue;
      const q = b.getBoundingClientRect(), nhan = (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
      const bao = (x) => { const k = x.loi + nhan + Math.round(q.left) + ',' + Math.round(q.top); if (!daNut.has(k)) { daNut.add(k); L.push({ luat: 'NUT-TRAN', chu: nhan, el: ten(b), ...x }); } };
      if (q.right > innerWidth + 1 || q.left < -1) bao({ loi: 'nút ra ngoài màn', trai: Math.round(q.left), phai: Math.round(q.right) });
      // thẻ / khung có nền gần nhất chứa nút (không tính lớp absolute)
      for (let k = b.parentElement; k && k !== document.body; k = k.parentElement) { const ks = getComputedStyle(k); if (ks.position === 'absolute') break;
        if (parseFloat(ks.borderTopLeftRadius) >= 16 && (mau(ks.backgroundColor)[3] > 0 || ks.boxShadow !== 'none')) { const t = k.getBoundingClientRect();
          if (q.right > t.right + 1 || q.left < t.left - 1) bao({ loi: 'nút tràn khỏi thẻ', khung: ten(k), lo: Math.round(Math.max(q.right - t.right, t.left - q.left)) }); break; } }
      const w3 = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      while (w3.nextNode()) { const n = w3.currentNode; const el = n.parentElement; if (!n.textContent.trim() || !el || !hien(el)) continue;
        // khung cắt gần nhất giữa chữ và nút (Text numberOfLines ⇒ overflow hidden + «…»)
        let cat = null; for (let k = el; k && k !== b; k = k.parentElement) { if (getComputedStyle(k).overflow !== 'visible') { cat = k; break; } }
        if (cat) { const cs2 = getComputedStyle(cat), lh = parseFloat(cs2.lineHeight) || parseFloat(cs2.fontSize) * 1.3;
          // cắt nửa dòng: phần bị giấu theo chiều dọc không phải bội số dòng (một dòng lẻ bị xén ngang thân chữ)
          const an = cat.scrollHeight - cat.clientHeight; if (an > 3 && (an % lh) > 3 && (lh - (an % lh)) > 3) bao({ loi: 'chữ bị cắt nửa dòng', an });
          const c = cat.getBoundingClientRect(); if (c.right > q.right + 2 || c.left < q.left - 2 || c.bottom > q.bottom + 2 || c.top < q.top - 2) bao({ loi: 'khung chữ ló ra khỏi nút', lo: Math.round(Math.max(c.right - q.right, q.left - c.left)) });
          continue; }
        if (dongCua(n).some(r => r.right > q.right + 2 || r.left < q.left - 2 || r.bottom > q.bottom + 2 || r.top < q.top - 2)) bao({ loi: 'chữ ló ra khỏi nút' }); }
    }
  }
  // 6. LE-THE (TestFlight build 6: chữ / icon / nút dính sát mép thẻ): thẻ clay = khối có bóng NGOÀI (box-shadow có phần không inset),
  //    bo ≥ 20, rộng ≥ 200 — hoặc khối bấm được đủ to (≥ 140 × 90: ô tính năng, thẻ việc chờ); không tính thanh tab, báo/toast (role=alert).
  //    Chữ, ảnh nhỏ, nút trong thẻ (thẻ gần nhất chứa nó) cách mép trái/phải thẻ: nút/ảnh ≥ 15.5, dòng chữ ≥ 12.
  //    Bỏ qua phần tử thuộc lớp absolute (mascot chờm, LopMen, huy hiệu số) — chúng cố ý đè mép.
  // lượt giãn chữ (WCAG 1.4.12) đổi khoảng chữ SAU khi react-native-web đã đo dòng ⇒ chữ lố khung là chuyện của luật TRAN, không đo lề ở đó
  if (!cuoi && !document.getElementById('gian-chu')) {
    const NUT = '[role=button],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=link],input,textarea';
    const bongNgoai = cs => cs.boxShadow !== 'none' && cs.boxShadow.split(/,(?![^(]*\))/).some(x => !/inset/.test(x));
    // khối bấm được (NhanMen: ô tính năng, thẻ việc chờ) cũng là thẻ nếu đủ to (≥ 140 × 90) — nút / hàng danh sách thấp hơn thì không
    const daXet = new Map();
    const laThe = e => { if (daXet.has(e)) return daXet.get(e); let kq = false;
      if (!e.matches('[role=tablist],[role=alert]')) { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        const to = e.matches(NUT) ? r.width >= 140 && r.height >= 90 : r.width >= 200;
        kq = to && parseFloat(cs.borderTopLeftRadius) >= 20 && bongNgoai(cs) && cs.position !== 'absolute'; }
      daXet.set(e, kq); return kq; };
    const theGan = new Map();
    const theCua = e => { if (theGan.has(e)) return theGan.get(e); let kq = null;
      for (let k = e.parentElement; k && k !== document.body; k = k.parentElement) { if (laThe(k)) { kq = k; break; } if (getComputedStyle(k).position === 'absolute') break; }
      theGan.set(e, kq); return kq; };
    const daLe = new Set(), khung = new Map();
    const hop = (t) => { if (!khung.has(t)) khung.set(t, t.getBoundingClientRect()); return khung.get(t); };
    // nút / ảnh: ≥ 15.5; dòng chữ: ≥ 12 (react-native-web đo dòng theo font dự phòng trước khi Inter tải xong ⇒ dòng dài lố khung 1–4px trên web;
    // app thật không bị). Lỗi gốc build 6 là lề 0 nên ngưỡng 12 vẫn bắt được.
    const xet = (el, rs, chu, nguong = 15.5) => { const t = theCua(el); if (!t) return; const q = hop(t);
      for (const r of rs) { const le = Math.min(r.left - q.left, q.right - r.right); if (le < nguong) { const k = ten(t) + '|' + chu; if (daLe.has(k)) return; daLe.add(k);
        L.push({luat:'LE-THE', chu: chu.slice(0, 40), el: ten(el), the: ten(t), le: +le.toFixed(1)}); return; } } };
    // nút nhỏ trong thẻ: đo cả khối nút; hàng bấm được rộng gần hết thẻ (Dong trong Nhom) thì đo chữ của nó. Chữ bị cắt «…» đo theo khung chữ.
    for (const n of tn) { const p = n.parentElement, nut = p.closest(NUT), t = theCua(p); if (!t) continue;
      const nr = nut?.getBoundingClientRect(), hep = nr && nr.width < 0.9 * hop(t).width;
      const rs = hep ? [nr] : p.scrollWidth > p.clientWidth + 1 ? [p.getBoundingClientRect()] : dongCua(n);
      xet(hep ? nut : p, rs, n.textContent.trim(), hep ? 15.5 : 12); }
    for (const a of [...document.querySelectorAll('img')].filter(hien)) { const r = a.getBoundingClientRect(); if (r.width <= 80) xet(a, [r], '(ảnh) ' + (a.src || '').split('/').pop().slice(0, 30)); }
  }
  return { L, DO_TAY }; })()`;

/** WCAG 1.4.12: ép khoảng cách chữ tối thiểu người dùng có thể đặt. */
export const GIAN = `(()=>{const s=document.createElement("style");s.id="gian-chu";s.textContent="*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}";document.head.appendChild(s)})()`;

const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ti = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * Đo tay nền gradient/ảnh (do-tay-gradient.mjs): ẩn mọi chữ + svg, chụp màn 1x, giải mã PNG ngay trong trang (canvas — không cần ffmpeg),
 * lấy pixel dưới hộp từng dòng chữ: chữ sáng so với nền sáng nhất (phân vị 99), chữ tối so với nền tối nhất (phân vị 1).
 */
export async function doTay(goi, js, ds) {
  if (!ds.length) return [];
  await js(`(()=>{const s=document.createElement("style");s.id="an-chu";s.textContent="*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}svg{visibility:hidden!important}";document.head.appendChild(s)})()`);
  await new Promise((r) => setTimeout(r, 150));
  const anh = await goi("Page.captureScreenshot", { format: "png", fromSurface: true });
  const px = await js(`new Promise((ok) => { const i = new Image(); i.onload = () => {
      const tl = ${JSON.stringify(ds.map((d) => d.r))}; const cv = document.createElement("canvas"); cv.width = innerWidth; cv.height = innerHeight;
      const g = cv.getContext("2d"); g.drawImage(i, 0, 0, innerWidth, innerHeight);
      ok(tl.map(([x, y, w, h]) => { if (w < 3 || h < 3 || x + w <= 0 || y + h <= 0 || x >= innerWidth || y >= innerHeight) return [];
        const x0 = Math.max(0, x + 1), y0 = Math.max(0, y + 1), w0 = Math.min(innerWidth, x + w - 1) - x0, h0 = Math.min(innerHeight, y + h - 1) - y0;
        if (w0 < 1 || h0 < 1) return []; return Array.from(g.getImageData(x0, y0, w0, h0).data); })); };
    i.src = "data:image/png;base64,${anh.data}"; })`);
  await js(`document.getElementById("an-chu")?.remove()`);
  const kq = [];
  ds.forEach((d, k) => {
    const raw = px[k]; if (!raw?.length) return;
    const p = []; for (let i = 0; i < raw.length; i += 4) p.push([raw[i], raw[i + 1], raw[i + 2]]);
    p.sort((a, b) => lum(a) - lum(b));
    const lf = lum(d.mau), sang = lf > lum(p[p.length >> 1]);
    const n = sang ? p[Math.floor(p.length * 0.99)] : p[Math.floor(p.length * 0.01)];
    const x = ti(lf, lum(n));
    kq.push({ ...d, nenXau: `rgb(${n})`, ti: +x.toFixed(2), dat: x >= d.can });
  });
  return kq;
}

/**
 * Chạy cổng trên danh sách màn ở mọi chế độ: 320, 390, 390 + giãn chữ. `vao(man)` đưa trình duyệt tới màn (đã đặt dữ liệu giả) và đợi
 * nội dung. → tổng số lỗi (in từng lỗi dạng JSON).
 */
export async function chayCong({ goi, js, sleep, dsMan, vao, hau = "" }) {
  let tong = 0, soDoTay = 0;
  for (const [rong, gian] of [[320, false], [390, false], [390, true]]) {
    await goi("Emulation.setDeviceMetricsOverride", { width: rong, height: 844, deviceScaleFactor: 1, mobile: true });
    let loi = 0;
    console.log(`\n## ${rong}px${gian ? " + giãn chữ (WCAG 1.4.12)" : ""}`);
    for (const man of dsMan) {
      // vao trả false khi màn đích không tải được (không thấy chữ mốc) ⇒ một lỗi KHONG-TAI, không đo trên màn trắng / màn lỗi.
      if ((await vao(man)) === false) { loi++; console.log(`${man.ten.padEnd(34)} 1 lỗi`); console.log("    " + JSON.stringify({ luat: "KHONG-TAI", duong: man.duong, cho: man.cho })); continue; }
      if (gian) await js(GIAN);
      await sleep(600);
      await js("window.__gdCuoi = false");
      const { L, DO_TAY } = (await js(DO)) ?? { L: [], DO_TAY: [] };
      // Lượt 2: cuộn mọi vùng cuộn tới cuối — nội dung cuối trang phải nằm ngoài ảnh nổi (nút trợ giúp góc màn).
      await js("document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight; }); window.__gdCuoi = true");
      await sleep(300);
      const sau = (await js(DO))?.L ?? [];
      await js("window.__gdCuoi = false; document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; })");
      await sleep(200);   // đo pixel bên dưới dùng toạ độ của lượt đầu (chưa cuộn)
      L.push(...sau.map((x) => ({ ...x, cuon: "đã cuộn hết" })));
      const ds = gian ? L.filter((x) => x.luat !== "TUONG-PHAN") : L;
      const tay = gian ? [] : await doTay(goi, js, DO_TAY);
      soDoTay += tay.length;
      for (const t of tay.filter((t) => !t.dat)) ds.push({ luat: "TUONG-PHAN", chu: t.chu, el: t.el, ti: t.ti, can: t.can, nen: `${t.nen} — đo pixel, nền xấu nhất ${t.nenXau}` });
      loi += ds.length;
      // GD_CHUP=<thư mục>: chụp mọi màn có lỗi (đính kèm PR / soi bằng mắt); thêm GD_CHUP_TAT_CA=1 thì chụp cả màn đạt
      if (process.env.GD_CHUP && (ds.length || process.env.GD_CHUP_TAT_CA)) { const a = await goi("Page.captureScreenshot", { format: "png" });
        (await import("node:fs")).writeFileSync(`${process.env.GD_CHUP}/${rong}${gian ? "-gian" : ""}${hau}-${man.ten.replace(/[^\p{L}\d]+/gu, "-")}.png`, Buffer.from(a.data, "base64")); }
      console.log(`${man.ten.padEnd(34)} ${ds.length ? ds.length + " lỗi" : "đạt"}${tay.length ? ` (đo pixel ${tay.length} dòng trên nền gradient/ảnh)` : ""}`);
      for (const x of ds) console.log("    " + JSON.stringify(x));
    }
    console.log(`→ ${loi} lỗi / ${dsMan.length} màn @${rong}px${gian ? " giãn" : ""}`);
    tong += loi;
  }
  console.log(`\nCỔNG GIAO DIỆN: ${tong} lỗi · ${dsMan.length} màn × 3 chế độ · đo pixel ${soDoTay} dòng`);
  return tong;
}
