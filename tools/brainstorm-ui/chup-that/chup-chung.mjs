// Chụp DOM đã render (react-native-web) thành HTML tĩnh tự đứng + ảnh PNG đối chiếu.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";

// hàm chạy TRONG trang: trả { html } — CSS chỉ giữ luật khớp phần tử đang có, url() để nguyên (node viết lại)
export const CHUP_TRANG = `(() => {
  if (!window.__giuCuon) { window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; }); }
  // Yoga (native) tính % của phần tử absolute theo hộp NỘI DUNG cha (trừ padding); web tính theo hộp padding ⇒ Rob cảnh to hơn ảnh thật.
  if (!window.__daYoga) { window.__daYoga = 1; for (const e of document.querySelectorAll('div')) { const c = getComputedStyle(e); if (c.position !== 'absolute' || c.aspectRatio !== '1 / 1' || !e.parentElement) continue;
    const p = e.parentElement, pc = getComputedStyle(p), pw = p.clientWidth, tl = e.offsetWidth / pw; if (!(tl > 0.3 && tl < 0.7) || e.offsetWidth >= parseFloat(c.maxWidth || 'Infinity') - 0.5) continue;
    const w = tl * (pw - parseFloat(pc.paddingLeft) - parseFloat(pc.paddingRight)); e.style.width = w + 'px'; } }
  if (window.__lhK && !window.__daLh) { window.__daLh = 1; const K = window.__lhK, R = window.__lhR || 1.2102; const ds = [];
    for (const e of document.querySelectorAll('body *')) { if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const c = getComputedStyle(e); if (c.lineHeight !== 'normal') continue;
      ds.push([e, Math.ceil(parseFloat(c.fontSize) * R * K - 0.01) / K]); }
    for (const [e, lh] of ds) e.style.lineHeight = lh + 'px'; }
  const BO = /::?(hover|focus|focus-visible|focus-within|active|visited|placeholder|selection|before|after|-webkit-[a-z-]+|-moz-[a-z-]+)(\\([^)]*\\))?/g;
  const khop = (sel) => sel.split(',').some((s) => { s = s.replace(BO, '').trim(); if (!s) return true; try { return !!document.querySelector(s); } catch { return false; } });
  const giu = [];
  const duyet = (rules, ra) => { for (const r of rules) {
    if (r.type === 1) { if (khop(r.selectorText)) ra.push(r.cssText); }
    else if (r.type === 4) { const con = []; duyet(r.cssRules, con); if (con.length) ra.push('@media ' + r.conditionText + '{' + con.join('') + '}'); }
    else if (r.type === 5 || r.type === 7) ra.push(r.cssText);
  } };
  for (const s of document.styleSheets) { try { duyet(s.cssRules, giu); } catch {} }
  const ban = document.documentElement.cloneNode(true);
  // giá trị ô nhập
  const songIn = [...document.querySelectorAll('input,textarea')], banIn = [...ban.querySelectorAll('input,textarea')];
  songIn.forEach((e, i) => { const b = banIn[i]; if (!b) return; if (e.tagName === 'TEXTAREA') b.textContent = e.value; else b.setAttribute('value', e.value); });
  // vị trí cuộn: dịch nội dung bằng margin âm trên con đầu (iframe tĩnh không chạy script)
  const songAll = [...document.body.querySelectorAll('*')], banAll = [...ban.querySelector('body').querySelectorAll('*')];
  songAll.forEach((e, i) => { if (e.scrollTop > 0 && banAll[i]) { const c = banAll[i].firstElementChild; if (c) c.style.marginTop = (-e.scrollTop) + 'px'; } });
  if (window.__goLoi) songAll.forEach((e, i) => { const r = e.getBoundingClientRect(); if (banAll[i]) banAll[i].setAttribute('data-r', [r.top, r.left, r.width, r.height].map(Math.round).join(',')); });
  // <button> lồng <button> thì trình phân tích HTML tự đóng thẻ ⇒ vỡ cây: đổi mọi button thành div (giữ thuộc tính)
  for (const b of [...ban.querySelectorAll('button')].reverse()) { const d = document.createElement('div'); for (const a of b.attributes) d.setAttribute(a.name, a.value); d.setAttribute('role', b.getAttribute('role') || 'button'); while (b.firstChild) d.appendChild(b.firstChild); b.replaceWith(d); }
  ban.querySelectorAll('script,noscript,link,style,meta[http-equiv]').forEach((e) => e.remove());
  const head = ban.querySelector('head');
  head.insertAdjacentHTML('afterbegin', '<meta charset="utf-8"><meta name="viewport" content="width=device-width">');
  const st = document.createElement('style'); st.textContent = giu.join('\\n'); head.appendChild(st);
  return '<!doctype html>\\n' + ban.outerHTML;
})()`;

const LOAI = { ".png": 1, ".jpg": 1, ".jpeg": 1, ".webp": 1, ".gif": 1, ".svg": 1, ".ttf": 1, ".otf": 1, ".woff": 1, ".woff2": 1 };
/** Viết lại url(http://localhost:PORT/…) và src="…" → /that/a/<băm>.<đuôi>, chép tệp từ thư mục dist. */
export function vietLaiUrl(html, { dist, goc, raThuMuc, tienTo = "/that/a/" }) {
  mkdirSync(raThuMuc, { recursive: true });
  const re = new RegExp(`${goc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/[^"')\\s&]+)|(?<=["'(])(/assets/[^"')\\s&]+)`, "g");
  return html.replace(re, (m, a, b) => {
    const p = decodeURIComponent((a || b).split("?")[0]);
    const f = join(dist, p);
    if (!existsSync(f)) return m;
    const ext = extname(f).toLowerCase();
    if (!LOAI[ext]) return m;
    const buf = readFileSync(f);
    const ten = createHash("sha1").update(buf).digest("hex").slice(0, 12) + ext;
    const dich = join(raThuMuc, ten);
    if (!existsSync(dich)) writeFileSync(dich, buf);
    return tienTo + ten;
  }).replace(/&quot;(\/that\/a\/[^&]+)&quot;/g, "&quot;$1&quot;");
}

// Thanh trạng thái iOS (iPhone 13 mini, 375pt) vẽ tĩnh — giờ lấy theo ảnh thật
export const thanhIos = (gio, mau = "#000") => `<div style="position:fixed;left:0;right:0;top:0;height:50px;z-index:2147483647;pointer-events:none;color:${mau}">
<span style="position:absolute;left:22px;top:16px;font:600 15.6px/22px -apple-system,'SF Pro Text',system-ui;letter-spacing:-.4px">${gio}</span>
<svg style="position:absolute;left:297px;top:25px" width="18" height="6" viewBox="0 0 18 6" fill="currentColor" opacity=".35"><circle cx="2.5" cy="3" r="2"/><circle cx="7" cy="3" r="2"/><circle cx="11.5" cy="3" r="2"/><circle cx="16" cy="3" r="2"/></svg>
<svg style="position:absolute;left:319px;top:21px" width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.5c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8.5.8 10.4 10.4 0 0 0 1.1 3.8L2.3 5a8.7 8.7 0 0 1 6.2-2.5Zm0 3.4c1.5 0 2.9.6 3.9 1.6L13.6 6.3a7 7 0 0 0-10.2 0l1.2 1.2c1-1 2.4-1.6 3.9-1.6Zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.4 7 9.9c.4-.4.9-.6 1.5-.6Z"/></svg>
<svg style="position:absolute;left:340px;top:20.5px" width="28" height="13" viewBox="0 0 28 13"><rect x=".5" y=".5" width="24" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".35"/><rect x="2" y="2" width="21" height="9" rx="2.5" fill="currentColor"/><path d="M26 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" opacity=".4"/></svg></div>`;

export const ganThanh = (html, thanh) => html.replace(/<body([^>]*)>/, (m) => m + thanh);

export async function chupPng(goi, ra) {
  const s = await goi("Page.captureScreenshot", { format: "png" });
  writeFileSync(ra, Buffer.from(s.data, "base64"));
}

/** Vòng chụp: mỗi màn đặt đồng hồ trang theo giờ ảnh thật, vào màn, chờ chữ, chờ yên, chụp DOM + PNG. */
export async function chayChup({ goi, js, sleep, ds, vao, ra, dist, goc }) {
  mkdirSync(join(ra, "html"), { recursive: true }); mkdirSync(join(ra, "png"), { recursive: true });
  let idDongHo = null;
  for (const m of ds) {
    const gio = m.gio ?? new Date("2026-10-25T08:45:00+07:00");
    if (idDongHo) await goi("Page.removeScriptToEvaluateOnNewDocument", { identifier: idDongHo });
    idDongHo = (await goi("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const D = Date, d = ${gio.getTime()} - D.now();
      function N(...a) { if (!new.target) return new D(D.now() + d).toString(); return a.length ? new D(...a) : new D(D.now() + d); }
      N.prototype = D.prototype; N.now = () => D.now() + d; N.UTC = D.UTC; N.parse = D.parse; globalThis.Date = N; })();${process.env.KHONG_GIONG ? "try { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); } catch {}" : ''}` })).identifier;
    console.log("vào", m.key); const ok = await vao(m);
    if (!ok) { console.log("KHÔNG VÀO ĐƯỢC", m.key); continue; }
    await js("document.fonts.ready.then(() => true)");
    await sleep(m.cho2 ?? 1600);
    if (m.sau) await m.sau();
    await js(`Promise.race([new Promise((r) => setTimeout(r, 3000)), Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))])`);
    console.log("  chụp DOM…");
    await sleep(300);
    const hgio = gio.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });
    // PNG của chính bản web (để so) — chưa có thanh trạng thái, chèn sau qua HTML
    if (process.env.GO_LOI) await js("window.__goLoi = 1");
    if (process.env.LH_K) await js(`window.__lhK = ${process.env.LH_K}; window.__lhR = ${process.env.LH_R || 1.2102}`);
    let html = await js(CHUP_TRANG);
    await chupPng(goi, join(ra, "png", m.key + "-song.png"));
    if (!html) { console.log("CHỤP DOM LỖI", m.key); continue; }
    html = vietLaiUrl(html, { dist, goc, raThuMuc: join(ra, "a") });
    if (m.refPath && !m.khongThanh) {
      const { execFileSync } = await import("node:child_process");
      execFileSync(process.env.PY, [process.env.THANH_PY, m.refPath, join(ra, "a", `sb-${m.key}.png`)]);
      html = ganThanh(html, `<img alt="" src="/that/a/sb-${m.key}.png" style="position:fixed;left:0;top:0;width:375px;height:50px;z-index:2147483647;pointer-events:none">`);
    } else if (!m.khongThanh) html = ganThanh(html, thanhIos(hgio, m.mauThanh));
    if (m.banPhim && m.refPath) { // bàn phím hệ thống iOS (ảnh thật có bàn phím số): cắt từ ảnh thật, thu gốc trang lên trên bàn phím
      const { execFileSync } = await import("node:child_process");
      execFileSync(process.env.PY, ["-c", `from PIL import Image\nim=Image.open(${JSON.stringify(m.refPath)}).convert('RGB');s=im.width/375\nim.crop((0,round(${m.banPhim}*s),im.width,im.height)).save(${JSON.stringify(join(ra, "a", `kb-${m.key}.png`))},optimize=True)`]);
      html = html.replace("</head>", `<style>html,body{height:${m.banPhim}px!important;overflow:hidden!important}</style></head>`);
      html = ganThanh(html, `<img alt="" src="/that/a/kb-${m.key}.png" style="position:fixed;left:0;top:${m.banPhim}px;width:375px;height:${812 - m.banPhim}px;z-index:2147483646;pointer-events:none">`);
    }
    writeFileSync(join(ra, "html", m.key + ".html"), html);
    { const f = join(ra, "refs.json"); const r = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; r[m.key] = m.ref || null; writeFileSync(f, JSON.stringify(r, null, 1)); }
    console.log("chụp", m.key, (html.length / 1024).toFixed(0) + "KB", hgio);
  }
}
