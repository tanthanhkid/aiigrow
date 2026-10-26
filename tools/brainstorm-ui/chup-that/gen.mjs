// node gen.mjs <repo brainstorm-ui> <ra> — đưa HTML chụp DOM vào web/that/ (html + a + ds.json), gắn data-toi sẵn
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
const [BS, RA] = process.argv.slice(2);
const TOI_TAY = JSON.parse(process.env.TOI_TAY || "{}"); // key → chữ trên nút (khi nhãn «…» trong hành trình khác chữ app thật)
const refs = JSON.parse(readFileSync(join(RA, "refs.json"), "utf8"));
const bang = JSON.parse(readFileSync(join(RA, "bang.json"), "utf8"));
const buoc = [];
for (const t of ["bm-1", "bm-2", "bm-3", "con-dien-thoai"]) {
  const m = await import(join(BS, "web/hanh-trinh", t + ".js"));
  for (const h of m.default) h.buoc.forEach((b, i) => buoc.push({ key: b.key, toi: b.toi, ke: h.buoc[i + 1], ten: b.ten }));
}
const CDP = 9693;
const hoSo = mkdtempSync(join(tmpdir(), "aiig-gen-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let trang; for (let i = 0; i < 40 && !trang; i++) { try { trang = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page"); } catch {} if (!trang) await sleep(300); }
const ws = new WebSocket(trang.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let n = 0; const cho = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cho[m.id]) { cho[m.id](m.result); delete cho[m.id]; } };
const goi = (method, params = {}) => new Promise((r) => { cho[++n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
// giống ganToi trong app.js, thêm: chữ tay ưu tiên, phần tử bấm của react-native-web (tabindex)
const GAN = `(html, nhan, dich, tenDich, tay) => {
  const thu = tay ? [tay] : [...nhan.matchAll(/«([^»]+)»/g)].map((m) => m[1]);
  if (!tay) thu.push(nhan.replace(/^(.*,\\s*)?(Bấm|Chạm|Chọn|Nhấn|Mở|Sang|Vào|Về|Xem)\\s+/i, ''), tenDich || '');
  const d = new DOMParser().parseFromString(html, 'text/html');
  const tatCa = [...d.body.querySelectorAll('*')].map((el) => [el, (el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase()]);
  for (const c of thu) {
    const chu = c.trim().toLowerCase(); if (chu.length < 2) continue;
    let tot = null, dai = Infinity;
    for (const [el, t] of tatCa) if (t.includes(chu) && t.length <= dai) { tot = el; dai = t.length; }
    if (!tot) continue;
    const bam = tot.closest('[role=button],[role=link],[role=tab],[role=switch],[tabindex="0"],a');
    const el = bam && (bam.textContent || '').length < 160 ? bam : tot;
    el.setAttribute('data-toi', dich);
    return { html: '<!doctype html>\\n' + d.documentElement.outerHTML, khop: c, the: el.tagName + (bam ? '' : '(chữ)') };
  }
  return null;
}`;
const ra = join(BS, "web/that"); mkdirSync(join(ra, "html"), { recursive: true }); mkdirSync(join(ra, "a"), { recursive: true });
// gộp vào ds.json đang có: lượt chụp chỉ một phần (regex) không làm rơi các màn khác
const ds = existsSync(join(ra, "ds.json")) ? JSON.parse(readFileSync(join(ra, "ds.json"), "utf8")) : {}; const dung = new Set(); const thieu = [];
for (const b of buoc) {
  const f = join(RA, "html", b.key + ".html"); if (!existsSync(f)) continue;
  let html = readFileSync(f, "utf8").replace(/ data-r="[^"]*"/g, "");
  // ảnh thanh trạng thái / bàn phím: chuyển vào trong #root (ảnh thu nhỏ của bàn chỉ chụp phần tử đầu tiên của body)
  const lop = []; html = html.replace(/<img alt="" src="\/that\/a\/(?:sb|kb)-[^>]+>/g, (m) => { lop.push(m); return ""; });
  if (lop.length) { if (!/<div id="root"[^>]*>/.test(html)) throw new Error("không thấy #root " + b.key); html = html.replace(/<div id="root"[^>]*>/, (m) => m + lop.join("")); }
  if (b.toi && b.ke) {
    const r = (await goi("Runtime.evaluate", { expression: `(${GAN})(${JSON.stringify(html)}, ${JSON.stringify(b.toi)}, ${JSON.stringify(b.ke.key)}, ${JSON.stringify(b.ke.ten)}, ${JSON.stringify(TOI_TAY[b.key] || "")})`, returnByValue: true })).result.value;
    if (r) { html = r.html; console.log("toi", b.key, "→", b.ke.key, "«" + r.khop + "»", r.the); } else { thieu.push(b.key); console.log("THIẾU toi", b.key, b.toi); }
  }
  // data: URI lớn (ảnh giả của kịch bản pha) → tệp trong a/ để HTML nhẹ (HTML còn đi vào prompt Claude)
  html = html.replace(/data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]{2000,})/g, (m, loai, b64) => {
    const buf = Buffer.from(b64, "base64"); const ten = createHash("sha1").update(buf).digest("hex").slice(0, 12) + "." + (loai === "jpeg" ? "jpg" : loai);
    writeFileSync(join(RA, "a", ten), buf); return "/that/a/" + ten; });
  if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(html)) throw new Error("còn URL localhost trong " + b.key);
  for (const m of html.matchAll(/\/that\/a\/([\w.-]+)/g)) dung.add(m[1]);
  writeFileSync(join(ra, "html", b.key + ".html"), html);
  const ref = refs[b.key];
  const anh = !ref ? null : ref.startsWith("../") ? ref.slice(3) : "chinchu-ios/" + ref;
  ds[b.key] = { w: 375, h: 812, anh, lech: bang[b.key]?.pt ?? null };
}
for (const a of dung) if (existsSync(join(RA, "a", a))) copyFileSync(join(RA, "a", a), join(ra, "a", a));
// chỉ xoá tệp a/ không còn HTML nào trong web/that/html dùng tới
const conDung = new Set(); for (const h of readdirSync(join(ra, "html"))) for (const m of readFileSync(join(ra, "html", h), "utf8").matchAll(/\/that\/a\/([\w.-]+)/g)) conDung.add(m[1]);
for (const a of conDung) if (!existsSync(join(ra, "a", a))) throw new Error("thiếu tệp a/" + a);
for (const a of readdirSync(join(ra, "a"))) if (!conDung.has(a)) rmSync(join(ra, "a", a));
writeFileSync(join(ra, "ds.json"), JSON.stringify(ds, null, 1) + "\n");
console.log("màn", Object.keys(ds).length, "tệp a", dung.size, "thiếu toi", thieu.join(" "));
ws.close(); chrome.kill(); await sleep(300); try { rmSync(hoSo, { recursive: true, force: true }); } catch {}
process.exit(0);
