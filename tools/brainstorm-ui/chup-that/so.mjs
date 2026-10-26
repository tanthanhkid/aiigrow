// node so.mjs <thư mục html> <thư mục a> <REF_DIR> <ra png> <bảng.json> key=ref.png …
// Mở từng HTML tĩnh trong Chrome headless RIÊNG (hồ sơ tạm) đúng khổ ảnh thật, chụp, so pixel bằng pixelmatch (ngưỡng 0.1, bỏ khử răng cưa).
import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join, extname, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawn, execFileSync } from "node:child_process";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const [HTML, A, REF, RA, BANG, ...cap] = process.argv.slice(2);
const CONG = 8391, CDP = 9691;
mkdirSync(RA, { recursive: true });
const LOAI = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".css": "text/css" };
const may = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = null; const trong = (goc, ten) => { const x = resolve(goc, ten); return x.startsWith(resolve(goc) + sep) ? x : null; };
  if (p.startsWith("/h/")) f = trong(HTML, p.slice(3));
  else if (p.startsWith("/that/a/")) f = trong(A, p.slice(8));
  if (!f || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": LOAI[extname(f)] ?? "application/octet-stream" }); res.end(readFileSync(f));
}).listen(CONG, "127.0.0.1");
const hoSo = mkdtempSync(join(tmpdir(), "aiig-so-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`,
  "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let trang; for (let i = 0; i < 40 && !trang; i++) { try { trang = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page"); } catch {} if (!trang) await sleep(300); }
const ws = new WebSocket(trang.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let n = 0; const cho = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cho[m.id]) { cho[m.id](m.result ?? m.error); delete cho[m.id]; } };
const goi = (method, params = {}) => new Promise((r) => { cho[++n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
await goi("Page.enable");

const docPng = (f) => { if (!existsSync(f)) throw new Error("thiếu " + f);
  if (f.endsWith(".png")) return PNG.sync.read(readFileSync(f));
  const t = join(hoSo, "ref.png"); execFileSync("sips", ["-s", "format", "png", f, "--out", t], { stdio: "ignore" }); return PNG.sync.read(readFileSync(t));
};
const bang = existsSync(BANG) ? JSON.parse(readFileSync(BANG, "utf8")) : {};
for (const c of cap) {
  const [key, ref] = c.split("="); if (!ref) { console.log("bỏ", c); continue; }
  const r = docPng(join(REF, ref));
  const W = r.width, H = r.height, dpr = W / 375;
  await goi("Emulation.setDeviceMetricsOverride", { width: 375, height: Math.ceil(H / dpr), deviceScaleFactor: dpr, mobile: true });
  await goi("Page.navigate", { url: `http://127.0.0.1:${CONG}/h/${key}.html` });
  await sleep(900);
  await goi("Runtime.evaluate", { expression: "document.fonts.ready.then(()=>1)", awaitPromise: true });
  await sleep(200);
  const s = await goi("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 375, height: H / dpr, scale: 1 } });
  let m = PNG.sync.read(Buffer.from(s.data, "base64"));
  if (m.width !== W || m.height !== H) { // cắt/đệm cho khớp
    const o = new PNG({ width: W, height: H }); o.data.fill(255);
    for (let y = 0; y < Math.min(H, m.height); y++) m.data.copy(o.data, y * W * 4, y * m.width * 4, y * m.width * 4 + Math.min(W, m.width) * 4);
    m = o;
  }
  writeFileSync(join(RA, `${key}.png`), PNG.sync.write(m));
  const d = new PNG({ width: W, height: H });
  const lech = pixelmatch(r.data, m.data, d.data, W, H, { threshold: 0.1, includeAA: false });
  writeFileSync(join(RA, `${key}-lech.png`), PNG.sync.write(d));
  const pt = +(lech / (W * H) * 100).toFixed(2);
  bang[key] = { ref, pt };
  console.log(key.padEnd(30), ref.padEnd(34), pt + "%");
}
writeFileSync(BANG, JSON.stringify(bang, null, 1));
ws.close(); chrome.kill(); may.close(); await sleep(300); try { rmSync(hoSo, { recursive: true, force: true }); } catch {}
process.exit(0);
