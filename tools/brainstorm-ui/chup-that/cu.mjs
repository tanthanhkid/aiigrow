// node cu.mjs <brainstorm-ui> <ra> — render HTML DỰNG TAY cũ (390×844) đúng khổ ảnh thật, so pixel; ghi ra/cu/<key>.png + ra/bang-cu.json
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs"; import { join, resolve } from "node:path"; import { pathToFileURL } from "node:url"; import { tmpdir } from "node:os"; import { spawn, execFileSync } from "node:child_process";
import pixelmatch from "pixelmatch"; import { PNG } from "pngjs";
const [BS, RA] = process.argv.slice(2).map((x) => resolve(x));
const CONG = process.env.CONG; if (!CONG) throw new Error("đặt CONG=<cổng server.mjs đang chạy từ chính thư mục này>"); const R = process.env.BS_THIET_KE || process.env.HOME + "/OFFLINE_FILES/Code/aiigrow-thiet-ke";
const ds = JSON.parse(readFileSync(join(BS, "web/that/ds.json"), "utf8"));
const cu = {}; for (const t of ["bm-1", "bm-2", "bm-3", "con-dien-thoai"]) for (const h of (await import(pathToFileURL(join(BS, "web/hanh-trinh", t + ".js")).href)).default) for (const b of h.buoc) cu[b.key] = b;
const TMP = join(BS, "web/_cu"); mkdirSync(TMP, { recursive: true }); mkdirSync(join(RA, "cu"), { recursive: true });
const CDP = 9695; const hoSo = mkdtempSync(join(tmpdir(), "aiig-cu-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`, "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let trang; for (let i = 0; i < 40 && !trang; i++) { try { trang = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page"); } catch {} if (!trang) await sleep(300); }
const ws = new WebSocket(trang.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let n = 0; const cho = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cho[m.id]) { cho[m.id](m.result); delete cho[m.id]; } };
const goi = (method, params = {}) => new Promise((r) => { cho[++n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
await goi("Page.enable");
const bang = {};
for (const [k, t] of Object.entries(ds)) {
  if (!t.anh || !cu[k]) continue;
  const f = join(R, t.anh); let r;
  if (f.endsWith(".png")) r = PNG.sync.read(readFileSync(f)); else { const x = join(hoSo, "r.png"); execFileSync("sips", ["-s", "format", "png", f, "--out", x], { stdio: "ignore" }); r = PNG.sync.read(readFileSync(x)); }
  const W = r.width, H = r.height, w0 = cu[k].w, dpr = W / w0;
  writeFileSync(join(TMP, k + ".html"), cu[k].html);
  await goi("Emulation.setDeviceMetricsOverride", { width: w0, height: Math.ceil(H / dpr), deviceScaleFactor: dpr, mobile: true });
  const url = `http://127.0.0.1:${CONG}/_cu/${k}.html`; if (!(await fetch(url)).ok) throw new Error("server không phục vụ " + url);
  await goi("Page.navigate", { url }); await sleep(1200);
  const s = await goi("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: w0, height: H / dpr, scale: 1 } });
  let m = PNG.sync.read(Buffer.from(s.data, "base64"));
  if (m.width !== W || m.height !== H) { const o = new PNG({ width: W, height: H }); o.data.fill(255); for (let y = 0; y < Math.min(H, m.height); y++) m.data.copy(o.data, y * W * 4, y * m.width * 4, y * m.width * 4 + Math.min(W, m.width) * 4); m = o; }
  writeFileSync(join(RA, "cu", k + ".png"), PNG.sync.write(m));
  const pt = +(pixelmatch(r.data, m.data, null, W, H, { threshold: 0.1, includeAA: false }) / (W * H) * 100).toFixed(2);
  bang[k] = pt; console.log(k.padEnd(30), pt + "%");
}
writeFileSync(join(RA, "bang-cu.json"), JSON.stringify(bang, null, 1));
rmSync(TMP, { recursive: true, force: true });
ws.close(); chrome.kill(); await sleep(300); try { rmSync(hoSo, { recursive: true, force: true }); } catch {} process.exit(0);
