// Chạy pha.mjs CHỈ trên màn / kịch bản liên quan tới diff (so với origin/main), ở 320px + 390px.
//   node mobile/scripts/pha-theo-diff.mjs [--co-so=origin/main] [--in]   (--in: chỉ in kế hoạch, không chạy)
// Suy luận (một cấp import là đủ):
//   file route mobile/src/app/**            ⇒ màn có đường dẫn khớp (PHA_DUONG) + kịch bản có «di("/đường")» khớp (PHA_KB)
//   mobile/src/** khác (lib, component…)    ⇒ file route nào import nó (`@/lib/x` hoặc tương đối), rồi như trên
//   _layout.tsx                             ⇒ mọi màn dưới thư mục đó
//   pha.mjs / giao-dien.mjs / mobile/** còn lại (cấu hình, assets) / không suy ra được ⇒ chạy ĐỦ
//   chỉ đổi server/** hoặc docs ⇒ không có gì để pha (thoát 0)
// Cần bản web export (mặc định: LUÔN chạy `npx expo export` vào mobile/.pha-web để không dùng bản cũ; PHA_WEB=<thư mục> để dùng bản đã dựng),
// Chrome (PHA_CHROME, mặc định Chrome macOS / google-chrome). Cổng: PHA_CONG / PHA_CDP như pha.mjs.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const AQUI = dirname(fileURLToPath(import.meta.url));
const GOC = resolve(AQUI, "../..");
const co = (process.argv.find((a) => a.startsWith("--co-so="))?.slice(8)) ?? "origin/main";
const chiIn = process.argv.includes("--in");
const git = (...a) => execFileSync("git", a, { cwd: GOC, encoding: "utf8" });

const doi = [...new Set([...git("diff", "--name-only", `${co}...HEAD`).split("\n"), ...git("diff", "--name-only", "HEAD").split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];   // thêm cả thay đổi chưa commit (không dùng status: dòng đổi tên / dấu nháy)

const APP = "mobile/src/app/";
const duyet = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === "node_modules" ? [] : duyet(join(d, e.name))) : /\.(tsx?|mjs)$/.test(e.name) ? [join(d, e.name)] : []);
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** file route → [thân biểu thức đường dẫn] (không có ^/$). `_layout` ⇒ cả thư mục. */
const routeRe = (f) => {
  let p = f.slice(APP.length).replace(/\.(web\.)?tsx?$/, "");
  const segs = p.split("/").filter((s) => !/^\(.*\)$/.test(s));
  const cuoi = segs[segs.length - 1];
  if (cuoi === "_layout") { const th = segs.slice(0, -1); return th.length ? `/${th.map(seg).join("/")}(/|\\?|$)` : ".*"; }
  if (cuoi === "index") segs.pop();
  return `/${segs.map(seg).join("/")}(\\?|$)`.replace("/(\\?|$)", "/?(\\?|$)");
};
const seg = (s) => /^\[.*\]$/.test(s) ? "[^/?]+" : esc(s);

const tatCa = (ly) => ({ tatCa: true, ly });
function suyRa() {
  const mobile = doi.filter((f) => f.startsWith("mobile/"));
  if (!mobile.length) return { rong: true };
  if (mobile.some((f) => /^mobile\/scripts\/(pha|giao-dien)\.mjs$/.test(f) || /^mobile\/(package(-lock)?\.json|app\.(json|config\.ts)|tsconfig\.json|assets\/)/.test(f))) return tatCa("đổi bộ pha / cấu hình / assets");
  const src = mobile.filter((f) => f.startsWith("mobile/src/") && /\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f));
  const khac = mobile.filter((f) => !/\.md$/.test(f) && !f.startsWith("mobile/scripts/") && !(f.startsWith("mobile/src/") && /\.(tsx?|jsx?)$/.test(f)));   // gồm json / css / svg trong src
  if (khac.length) return tatCa(`không suy ra được: ${khac[0]}`);
  const routes = new Set(src.filter((f) => f.startsWith(APP)));
  const dungChung = src.filter((f) => !f.startsWith(APP));
  if (dungChung.length) {
    // đồ thị import: mỗi file nguồn → các «khoá» @/… nó import. Lan ngược từ file đổi tới điểm cố định qua các lib; route nào import một lib bị ảnh hưởng thì tính.
    const tatCaFile = duyet(join(GOC, "mobile/src")).map((f) => relative(GOC, f));
    const bo = (x) => x.replace(/\.(web\.|native\.|ios\.|android\.)?tsx?$/, "");
    const khoaCua = (f) => bo(f.replace(/^mobile\/src\//, ""));
    const importCua = new Map(tatCaFile.map((f) => {
      const nd = readFileSync(join(GOC, f), "utf8"), ra = new Set();
      for (const m of nd.matchAll(/from\s+["']([^"']+)["']/g)) {
        let k = m[1];
        if (k.startsWith("@/")) k = k.slice(2); else if (k.startsWith(".")) k = relative(join(GOC, "mobile/src"), resolve(dirname(join(GOC, f)), k)); else continue;
        ra.add(bo(k));
      }
      return [f, ra];
    }));
    const anhHuong = new Set(dungChung.flatMap((f) => [khoaCua(f), ...(khoaCua(f).endsWith("/index") ? [khoaCua(f).slice(0, -6)] : [])]));
    for (let doiMoi = true; doiMoi;) {
      doiMoi = false;
      for (const f of tatCaFile) {
        if (f.startsWith(APP) || /\.test\./.test(f) || anhHuong.has(khoaCua(f))) continue;
        if ([...importCua.get(f)].some((k) => anhHuong.has(k))) { anhHuong.add(khoaCua(f)); if (khoaCua(f).endsWith("/index")) anhHuong.add(khoaCua(f).slice(0, -6)); doiMoi = true; }
      }
    }
    for (const f of tatCaFile) if (f.startsWith(APP) && [...importCua.get(f)].some((k) => anhHuong.has(k))) routes.add(f);
    if (!routes.size) return tatCa(`không màn nào import ${dungChung[0]}`);
  }
  if (!routes.size) return { rong: true };
  return { routes: [...routes] };
}

const kq = suyRa();
if (kq.rong) { console.log("pha-theo-diff: diff không đụng mobile/src ⇒ không có màn nào để pha."); process.exit(0); }

const env = { ...process.env };
let plan;
if (kq.tatCa) plan = `chạy ĐỦ (${kq.ly})`;
else {
  const re = kq.routes.map(routeRe);
  if (re.includes(".*")) plan = "chạy ĐỦ (đổi _layout gốc)";
  else {
    env.PHA_DUONG = `^(${re.join("|")})`;
    // kịch bản: khối `await kichBan("tên", …)` có chuỗi «/đường» khớp
    const pha = readFileSync(join(AQUI, "pha.mjs"), "utf8");
    const khoi = pha.split(/\n(?=await kichBan\()/).slice(1);
    const ten = [];
    for (const k of khoi) {
      const t = /^await kichBan\("((?:[^"\\]|\\.)*)"/.exec(k)?.[1];
      if (!t) continue;
      const duong = [...k.matchAll(/["'`](\/[a-z0-9][A-Za-z0-9\-/]*)/g)].map((m) => m[1]);
      if (/\b(dangKyToiOtp|dienDangKy)\(/.test(k)) duong.push("/dang-ky");   // kịch bản đi vào màn qua hàm dùng chung
      if (duong.some((d) => new RegExp(`^(${re.join("|")})`).test(d))) ten.push(t);
    }
    env.PHA_KB = ten.length ? `^(${ten.map(esc).join("|")})$` : "^$KHONG-CO-KICH-BAN$";
    plan = `${kq.routes.length} route đổi/liên quan ⇒ PHA_DUONG=${env.PHA_DUONG} · ${ten.length} kịch bản`;
  }
}
console.log(`pha-theo-diff (${doi.length} file đổi so với ${co}): ${plan}`);
if (chiIn) process.exit(0);

// bản web export
let web = process.env.PHA_WEB;
const cong = process.env.PHA_CONG ?? "8191";
if (!web) {
  web = join(tmpdir(), `aiigrow-pha-web-${cong}`);   // ngoài mobile/: eslint / tsc không quét bundle
  console.log(`expo export web → ${web} (EXPO_PUBLIC_API=http://localhost:${cong})`);
  const r = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", web], { cwd: join(GOC, "mobile"), stdio: "inherit",
    env: { ...process.env, EXPO_PUBLIC_API: `http://localhost:${cong}`, CI: "1" } });
  if (r.status) process.exit(r.status);
}
const chrome = process.env.PHA_CHROME ?? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
if (!chrome) { console.log("không thấy Chrome (đặt PHA_CHROME)"); process.exit(2); }
let rc = 0;
const chay = (nhan, args, e) => { console.log(`\n=== pha ${nhan} ===`); const r = spawnSync("node", [join(AQUI, "pha.mjs"), web, chrome, ...args], { stdio: "inherit", env: e }); if (r.status) rc = rc || r.status; };
if (kq.tatCa || env.PHA_DUONG) {
  // 320 + 390 (không đo thêm «390 giãn» để nhanh; lượt đủ đã có trên CI)
  for (const rong of [320, 390]) chay(`--giao-dien @${rong}px`, ["--giao-dien"], { ...env, PHA_RONG: String(rong), PHA_CHU_DAI: rong === 320 ? env.PHA_CHU_DAI : "0", ...(kq.tatCa ? {} : {}) });
}
if (kq.tatCa || env.PHA_KB !== "^$KHONG-CO-KICH-BAN$") chay("kịch bản luồng", [], env);
else console.log("\n(không có kịch bản luồng liên quan)");
process.exit(rc);
