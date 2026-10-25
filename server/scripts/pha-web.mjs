// Kịch bản + cổng chuẩn giao diện cho các màn web của máy chủ: /quay (quầy AiiCafe), /admin (quản trị AiiLab) và trang công khai
// /tai (theo từng hệ điều hành), /cai/<token>, /chinh-sach-rieng-tu.
// Chép cách làm của mobile/scripts/pha.mjs + giao-dien.mjs (dùng chung bộ đo 5 luật DO / GIAN / doTay), nhưng chạy trên MÁY CHỦ THẬT:
// tự mở `next dev` với PGlite ở thư mục tạm (dữ liệu dựng qua chính API), tự tạo tài khoản quầy/admin bằng scripts/tao-tai-khoan.ts với
// mật khẩu ngẫu nhiên chỉ sống trong lần chạy, rồi điều khiển một Chrome headless RIÊNG (hồ sơ tạm) qua CDP. Chỉ hai trường hợp không tạo
// được bằng API (phiếu hết hạn, mất mạng) mới chặn /api/quay/quet bằng CDP Fetch.
//
//   PHA_CONG=3311 PHA_CDP=9502 node scripts/pha-web.mjs               # kịch bản luồng chính
//   PHA_CONG=3311 PHA_CDP=9502 node scripts/pha-web.mjs --giao-dien   # cổng giao diện: 320 / 390 / 390 giãn chữ / 1440
//   PHA_PROD=1  dùng bản `next build` (next start) thay next dev.
//   GD_CHUP=<thư mục> [GD_CHUP_TAT_CA=1] [GD_CHUP_DAI=1]  chụp màn có lỗi / mọi màn (DAI: cả trang ở mọi khổ).  PHA_CHUP=<thư mục>  chụp bước SAI của kịch bản.
// Mã thoát 1 nếu có bước SAI / còn lỗi giao diện.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { DO, GIAN, doTay } from "../../mobile/scripts/giao-dien.mjs";
import { CUON_NGANG, DO_CC } from "./do-chin-chu.mjs";

const GOC_SV = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.argv.slice(2).find((x) => !x.startsWith("--")) ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CONG = Number(process.env.PHA_CONG ?? 3311), CDP = Number(process.env.PHA_CDP ?? 9502), GOC = `http://localhost:${CONG}`;
const GIAO_DIEN = process.argv.includes("--giao-dien");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// PHA_PROD=1: chạy bản đã `next build` (next start) — nhẹ, trang tải xong ngay; bản dev nặng làm Chrome headless có lúc treo chụp màn.
// Bản build phải mới hơn mọi tệp ảnh hưởng giao diện (app/ lib/ public/ next.config.ts instrumentation.ts package.json) — không thì cổng đo nhầm bản cũ.
// Kiểm TRƯỚC khi dựng dữ liệu thử.
const PROD = !!process.env.PHA_PROD && process.env.PHA_PROD !== "0";
if (PROD) {
  const buildId = join(GOC_SV, ".next", "BUILD_ID");
  if (!existsSync(buildId)) { console.error("PHA_PROD: chưa có .next — chạy `npx next build` trước."); process.exit(1); }
  const luc = statSync(buildId).mtimeMs;
  const moiHon = (p) => { try { const st = statSync(p);
    return st.isDirectory() ? readdirSync(p).some((x) => moiHon(join(p, x))) : st.mtimeMs > luc; } catch { return false; /* tệp vừa xoá / symlink gãy */ } };
  const cu = ["app", "lib", "public", "next.config.ts", "instrumentation.ts", "package.json"].filter((x) => moiHon(join(GOC_SV, x)));
  if (cu.length) { console.error(`PHA_PROD: bản .next cũ hơn ${cu.join(", ")} — chạy lại \`npx next build\`.`); process.exit(1); }
}

// ---------------------------------------------------------------- máy chủ thật (next dev + PGlite tạm)
// Dọn khi thoát vì BẤT KỲ lý do gì (lỗi giữa chừng, hết giờ CDP, Ctrl-C): tắt next + Chrome, xoá hồ sơ Chrome + PGlite tạm.
const don = { tienTrinh: [], thuMuc: [] };
process.on("exit", () => { for (const t of don.tienTrinh) try { t.kill(); } catch { /* đã tắt */ }
  for (const d of don.thuMuc) try { rmSync(d, { recursive: true, force: true }); } catch { /* còn bị giữ (Windows) */ } });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130));
const dbDir = mkdtempSync(join(tmpdir(), "aiig-pg-")); don.thuMuc.push(dbDir);
const MK_AD = randomBytes(12).toString("base64url"), MK_Q = randomBytes(12).toString("base64url");
const env = { ...process.env, PGLITE_DIR: dbDir, AIIGROW_OTP_THU: "1", NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: "" };
delete env.DATABASE_URL;
const seed = spawnSync(process.execPath, ["scripts/tao-tai-khoan.ts"], { cwd: GOC_SV, encoding: "utf8", env: { ...env,
  AIIGROW_ADMIN_TEN: "admin.thu", AIIGROW_ADMIN_MAT_KHAU: MK_AD, AIIGROW_ADMIN_HIEN: "Chị Hạnh AiiLab",
  AIIGROW_QUAY_TEN: "quay.thu", AIIGROW_QUAY_MAT_KHAU: MK_Q, AIIGROW_QUAY_HIEN: "Nguyễn Thị Thu Thuỷ", AIIGROW_QUAY_SO: "Quầy 1" } });
if (seed.status !== 0) { console.error("Không tạo được tài khoản:", seed.stderr || seed.stdout); process.exit(1); }

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", PROD ? "start" : "dev", "-p", String(CONG)], { cwd: GOC_SV, env, stdio: ["ignore", "pipe", "pipe"] });
don.tienTrinh.push(next);
let nextLog = "";
next.stdout.on("data", (b) => { nextLog += b; }); next.stderr.on("data", (b) => { nextLog += b; });
let song = false;
for (let i = 0; i < 240 && !song; i++) {
  try { song = (await fetch(`${GOC}/api/suc-khoe`)).ok; } catch { /* chờ next dev */ }
  if (!song) await sleep(500);
}
if (!song) { console.error(`next ${PROD ? "start" : "dev"} không lên:\n` + nextLog.slice(-2000)); next.kill(); process.exit(1); }

const api = async (duong, o = {}) => {
  const r = await fetch(`${GOC}/api/${duong}`, { method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok && !o.choLoi) throw new Error(`${duong} → ${r.status} ${JSON.stringify(d)}`);
  return d;
};

// ---------------------------------------------------------------- dữ liệu thử (tên dài để lộ lỗi tràn / rớt dòng)
const TEN_BM = "Nguyễn Ngọc Bảo Anh", TEN_CON = "Trần Nguyễn Minh Khang";
async function dungNha(sdt, ten, conTen, soPhieu) {
  const otp = await api("m/otp", { body: { dinhDanh: sdt } });
  const bm = (await api("m/dang-ky", { body: { dinhDanh: sdt, ma: otp.ma, ten, matKhau: "matkhau-thu-123" } })).token;
  const con = (await api("m/con", { tok: bm, body: { ten: conTen, namSinh: 2016 } })).id;
  const ma = (await api("m/ma-ghep", { tok: bm, body: { con, nen: "windows" } })).ma;
  const may = (await api("device/ghep", { body: { ma, nen: "windows", tenMay: `Laptop của ${conTen}` } })).token;
  return { bm, con, may, soPhieu };
}
const tokAd = (await api("admin/dang-nhap", { body: { tenDangNhap: "admin.thu", matKhau: MK_AD } })).token;
const nhaA = await dungNha("0912345678", TEN_BM, TEN_CON, 12), nhaB = await dungNha("0987654321", "Lê Văn Bình", "Bin", 2);
const famA = (await api("admin/gia-dinh?tim=0912345678", { tok: tokAd })).ds[0].id;
const famB = (await api("admin/gia-dinh?tim=0987654321", { tok: tokAd })).ds[0].id;
const phieu = [];
for (const [n, fam] of [[nhaA, famA], [nhaB, famB]]) {
  await api(`admin/gia-dinh/${fam}/nap-quy`, { tok: tokAd, body: { soTien: n.soPhieu * 50_000 + 200_000, ghiChu: "Chuyển khoản Vietcombank lúc mở tài khoản" } });
  await api(`m/con/${n.con}/diem`, { tok: n.bm, body: { delta: n.soPhieu * 500 + 300, lyDo: "Điểm thử cho kịch bản quầy" } });
  const qua = (await api("m/qua", { tok: n.bm, body: { ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50_000 } })).id;
  for (let i = 0; i < n.soPhieu; i++) phieu.push((await api(`kid/doi/${qua}`, { tok: n.may, body: {} })).voucher.ma);
}
await api("m/ho-tro", { tok: nhaA.bm, body: { noiDung: "Chào AiiLab, em chuyển khoản 600.000đ nạp quỹ phiếu quà sáng nay mà chưa thấy cộng vào quỹ của nhà em ạ." } });
await api("m/ho-tro", { tok: nhaB.bm, body: { noiDung: "Cho em hỏi phiếu quà dùng ở AiiCafe nào?" } });
await api(`admin/ho-tro/${famB}`, { tok: tokAd, body: { noiDung: "Dạ phiếu dùng được ở mọi quầy AiiCafe ạ." } });
await api("admin/allowlist", { tok: tokAd, body: { muc: "khanacademy.org" } });
await api("admin/tham-so", { tok: tokAd, body: { voucher_han_ngay: 90 } });
await api("admin/mau", { tok: tokAd, body: { loai: "nhiem_vu", nhom: "nhi", ten: "Tưới cây ngoài ban công mỗi chiều", diem: 5, nhomNv: "viec_nha" } });
const daDung = phieu.pop();
await api("quay/quet", { tok: (await api("quay/dang-nhap", { body: { tenDangNhap: "quay.thu", matKhau: MK_Q } })).token, body: { ma: daDung } });
console.log(`dữ liệu: 2 gia đình, ${phieu.length + 1} phiếu quà, máy chủ ${GOC} (PGlite ${dbDir})`);

// ---------------------------------------------------------------- Chrome + CDP
const hoSo = mkdtempSync(join(tmpdir(), "aiig-pha-web-"));
// --disable-gpu: Mac tắt màn hình / máy bận thì GPU headless có lúc treo Page.captureScreenshot vô hạn
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`, "--no-first-run",
  "--no-default-browser-check", "--window-size=1440,900", "--lang=vi-VN", "--mute-audio", "about:blank"], { stdio: "ignore" });
don.tienTrinh.push(chrome); don.thuMuc.push(hoSo);
let trang;
for (let i = 0; i < 60 && !trang; i++) {
  try { trang = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* chờ Chrome */ }
  if (!trang) await sleep(500);
}
const ws = new WebSocket(trang.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let so = 0; const cho = {};
let chanQuet = null;            // null | "mat_mang" | dữ liệu giả cho /api/quay/quet
ws.onmessage = async (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cho[m.id]) { cho[m.id](m.result ?? m.error); delete cho[m.id]; return; }
  if (m.method !== "Fetch.requestPaused") return;
  const { requestId } = m.params;
  if (!chanQuet) return goi("Fetch.continueRequest", { requestId });
  if (chanQuet === "mat_mang") return goi("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" });
  goi("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(chanQuet)).toString("base64") });
};
// Chrome headless chết giữa chừng (job dọn máy, máy hết RAM) ⇒ lệnh CDP không bao giờ trả lời: 180s thì dừng hẳn, không treo im.
ws.onclose = () => { console.error("Chrome headless đã tắt giữa chừng — dừng."); process.exit(2); };
// Chụp màn treo thì sau 60s trả lỗi (nơi gọi thử lại / bỏ ảnh), các lệnh khác 180s thì dừng hẳn.
const goi = (method, params = {}) => new Promise((r) => { const id = ++so;
  const h = method === "Page.captureScreenshot"
    ? setTimeout(() => { delete cho[id]; r({ code: -1, message: "het-gio-60s" }); }, 60_000)
    : setTimeout(() => { console.error(`CDP ${method} không trả lời sau 180s — dừng.`); process.exit(2); }, 180_000);
  cho[id] = (x) => { clearTimeout(h); r(x); }; ws.send(JSON.stringify({ id, method, params })); });
await goi("Page.enable");
await goi("Fetch.enable", { patterns: [{ urlPattern: `${GOC}/api/quay/quet`, requestStage: "Request" }] });
await goi("Emulation.setLocaleOverride", { locale: "vi-VN" });
const khung = (rong, cao = rong >= 1000 ? 900 : 844) => goi("Emulation.setDeviceMetricsOverride", { width: rong, height: cao, deviceScaleFactor: 1, mobile: rong < 1000 });
await khung(1280, 800);
const js = async (expr) => (await goi("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const chu = () => js("document.body.innerText");
const doi = async (txt, ms = 15000) => { for (let t = 0; t < ms; t += 250) { if ((await chu())?.includes(txt)) return true; await sleep(250); } return false; };
const tokQuay = async () => (await api("quay/dang-nhap", { body: { tenDangNhap: "quay.thu", matKhau: MK_Q } })).token;
/** Mở trang với token đặt sẵn (null = xoá, để thấy màn đăng nhập). */
const di = async (duong, khoa, token) => {
  await goi("Page.navigate", { url: `${GOC}${duong.split("#")[0]}` });
  await doi("", 3000); await sleep(400);
  if (khoa) await js(token ? `localStorage.setItem(${JSON.stringify(khoa)}, ${JSON.stringify(token)})` : `localStorage.removeItem(${JSON.stringify(khoa)})`);
  await goi("Page.navigate", { url: "about:blank" });                // đường chỉ khác #mục thì trình duyệt không tải lại — qua trang trắng trước
  await goi("Page.navigate", { url: `${GOC}${duong}` });
  await sleep(500);
};
/** Gõ vào ô aria-label (setter gốc + sự kiện input — React nhận như người gõ). */
const go = (nhan, gt) => js(`(() => { const i = [...document.querySelectorAll("input,textarea,select")].find((e) => e.getAttribute("aria-label") === ${JSON.stringify(nhan)});
  if (!i) return false; const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), "value").set; s.call(i, ${JSON.stringify(gt)});
  i.dispatchEvent(new Event(i.tagName === "SELECT" ? "change" : "input", { bubbles: true })); return true; })()`);
/** Bấm nút / liên kết có chữ đúng `txt`. */
const bam = async (txt) => {
  await sleep(150);
  const ok = await js(`(() => { const el = [...document.querySelectorAll("button,a")].filter((e) => e.innerText?.trim() === ${JSON.stringify(txt)}).pop();
    if (!el) return false; el.scrollIntoView({ block: "center" }); el.click(); return true; })()`);
  await sleep(400);
  return ok;
};
const dong = async () => { ws.onclose = null; ws.close(); chrome.kill(); next.kill(); await sleep(800); for (const d of [hoSo, dbDir]) try { rmSync(d, { recursive: true, force: true }); } catch { /* còn giữ tệp */ } };

// ---------------------------------------------------------------- cổng chuẩn giao diện
if (GIAO_DIEN) {
  const kho = [...phieu];                                     // mỗi màn «hợp lệ» cần một phiếu còn mới
  const quetMa = async (ma) => { await go("Mã phiếu quà", ma); await bam("Kiểm tra mã"); };
  const Q = (ten, cho, o = {}) => ({ ten, duong: "/quay", khoa: "aiig_quay", cho, ...o });
  const A = (ten, hash, cho, o = {}) => ({ ten, duong: `/admin${hash}`, khoa: "aiig_admin", cho, ...o });
  // trang công khai: /tai chọn nút chính theo máy đang mở (UA + Client Hint) ⇒ giả từng hệ điều hành
  const UA = {
    windows: ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36", "Windows", false],
    mac: ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36", "macOS", false],
    iphone: ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "iOS", true],
    android: ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36", "Android", true],
  };
  const P = (ten, duong, cho, ua = "windows") => ({ ten, duong, khoa: null, token: null, cho, ua });
  const dsMan = [
    P("tai-windows", "/tai", "Tải AiiGrow cho Windows"),
    P("tai-mac", "/tai", "Tải AiiGrow cho máy Mac", "mac"),
    P("tai-iphone", "/tai", "Bạn đang mở trang bằng iPhone", "iphone"),
    P("tai-android", "/tai", "Tải app Ba Mẹ", "android"),
    P("cai", "/cai/Ab3dEf9hJk2mNp4qRs6t", "Mở app AiiGrow Con"),
    P("chinh-sach-rieng-tu", "/chinh-sach-rieng-tu", "AiiGrow Privacy Policy"),
    P("loi-404", "/api/khong-co-duong-nay", "Không tìm thấy trang này"),
    Q("quay-dang-nhap", "Vào quầy", { token: null }),
    Q("quay-san-sang", "Sẵn sàng quét"),
    Q("cafe-quet (hợp lệ)", "Đã đánh dấu", { sau: () => quetMa(kho.shift()) }),
    Q("cafe-da-dung", "Phiếu quà đã dùng", { sau: () => quetMa(daDung) }),
    Q("quay-het-han", "Phiếu quà đã hết hạn", { chan: { ketQua: "het_han", ma: "AG7K2Q91MXYZ", menhGia: 50000, hetHan: "2026-09-30T10:00:00Z", luc: new Date().toISOString() },
      sau: () => quetMa("AG7K2Q91MXYZ") }),
    Q("quay-khong-thay", "Không tìm thấy phiếu quà", { sau: () => quetMa("AGKHONGCOMA1") }),
    Q("quay-mat-mang", "Chưa kiểm tra được", { chan: "mat_mang", sau: () => quetMa("AGKHONGCOMA2") }),
    A("admin-dang-nhap", "", "Cổng nội bộ AiiGrow", { token: null }),
    A("admin-tong-quan", "#tong-quan", "Quỹ phiếu quà đang giữ"),
    A("admin-gia-dinh", "#gia-dinh", "Nhà Nguyễn Ngọc Bảo Anh"),
    A("admin-gia-dinh-chi-tiet", `#gia-dinh/${famA}`, "Ghi nạp quỹ phiếu quà"),
    A("admin-phieu", "#phieu", "Gia đình · Con"),
    A("admin-doi-soat", "#doi-soat", "Phát hành"),
    A("admin-ho-tro", "#ho-tro", "Chờ trả lời"),
    A("admin-ho-tro-luong", `#ho-tro/${famA}`, "Trả lời Ba Mẹ"),
    A("admin-mau", "#mau", "Tưới cây ngoài ban công"),
    A("admin-allowlist", "#allowlist", "khanacademy.org"),
    A("admin-tham-so", "#tham-so", "Phiên giải trí tối đa"),
    A("admin-nhat-ky", "#nhat-ky", "Người làm"),
  ];
  const vao = async (m) => {
    chanQuet = m.chan ?? null;
    const [ua, nen, dd] = UA[m.ua ?? "windows"];
    await goi("Emulation.setUserAgentOverride", { userAgent: ua, platform: nen, userAgentMetadata: { brands: [{ brand: "Chromium", version: "141" }],
      fullVersion: "141.0.0.0", platform: nen, platformVersion: "10.0.0", architecture: "x86", model: "", mobile: dd } });
    await di(m.duong, m.khoa, m.token === null ? null : m.khoa === "aiig_quay" ? await tokQuay() : tokAd);
    if (m.sau) { await doi("Sẵn sàng quét"); await m.sau(); }
    const ok = await doi(m.cho);
    chanQuet = null;
    if (ok) {
      // bỏ nút «N» của next dev (đè chữ góc dưới, không thuộc giao diện); bấm nút có scrollIntoView ⇒ về đầu trang vì doTay chụp ở đầu trang
      await js("document.querySelectorAll('nextjs-portal').forEach((e) => e.remove()); scrollTo(0, 0)");
      // chờ nảy vào / rung xong mới đo — khối dữ liệu tải sau cũng nảy vào muộn ⇒ đợi tới khi 2 lần liền không còn animation chạy (tối đa 3s)
      for (let t = 0, yen = 0; t < 3000 && yen < 2; t += 150) { yen = (await js("document.getAnimations().some((a) => a.playState === 'running')")) ? 0 : yen + 1; await sleep(150); }
      return true;
    }
    console.log(`    KHÔNG TẢI: chưa thấy «${m.cho}» ở ${m.duong}: ${(await chu())?.replace(/\s+/g, " ").slice(0, 200)}`);
    return false;
  };
  let tong = 0, soDoTay = 0;
  for (const [rong, gian] of [[320, false], [390, false], [390, true], [1440, false]]) {
    await khung(rong);
    let loi = 0;
    console.log(`\n## ${rong}px${gian ? " + giãn chữ (WCAG 1.4.12)" : ""}`);
    for (const man of dsMan) {
      if ((await vao(man)) === false) { loi++; console.log(`${man.ten.padEnd(30)} 1 lỗi`); console.log("    " + JSON.stringify({ luat: "KHONG-TAI", duong: man.duong, cho: man.cho })); continue; }
      if (gian) await js(GIAN);
      await sleep(600);
      await js("window.__gdCuoi = false");
      const { L, DO_TAY } = (await js(DO)) ?? { L: [], DO_TAY: [] };
      // LE-THE của bộ đo chung (mobile/scripts/giao-dien.mjs) đo cả chữ của bảng đang cuộn ngang (.bang trên màn hẹp): chữ cuộn ra ngoài khung là
      // vị trí cuộn, không phải dính mép ⇒ bỏ các dòng nằm trong khung cuộn ngang đang tràn.
      const trongCuon = new Set((await js(CUON_NGANG)) ?? []);
      for (let i = L.length - 1; i >= 0; i--) if (L[i].luat === "LE-THE" && L[i].the && trongCuon.has(L[i].chu)) L.splice(i, 1);
      L.push(...((await js(DO_CC)) ?? []));                       // luật chỉn chu: lề thẻ ≥16, chồng, nổi đè, vùng bấm ≥44, cắt chữ
      await js("document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight; }); window.__gdCuoi = true");
      await sleep(300);
      const sau = (await js(DO))?.L ?? [];
      await js("window.__gdCuoi = false; document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; })");
      await sleep(200);
      L.push(...sau.map((x) => ({ ...x, cuon: "đã cuộn hết" })));
      const ds = gian ? L.filter((x) => x.luat !== "TUONG-PHAN") : L;
      const tay = gian ? [] : await doTay(goi, js, DO_TAY);
      soDoTay += tay.length;
      for (const t of tay.filter((t) => !t.dat)) ds.push({ luat: "TUONG-PHAN", chu: t.chu, el: t.el, ti: t.ti, can: t.can, nen: `${t.nen} — đo pixel, nền xấu nhất ${t.nenXau}` });
      loi += ds.length;
      if (process.env.GD_CHUP && (ds.length || process.env.GD_CHUP_TAT_CA)) {
        await sleep(500);
        // cả trang: nới khung cho bằng chiều cao nội dung rồi chụp, xong trả khung về (clip + captureBeyondViewport treo ở chế độ mobile)
        const caoNd = process.env.GD_CHUP_DAI ? Math.ceil((await goi("Page.getLayoutMetrics")).cssContentSize.height) : 0;
        if (caoNd) { await khung(rong, Math.max(caoNd, rong >= 1000 ? 900 : 844)); await sleep(400); }
        let a = await goi("Page.captureScreenshot", { format: "png", captureBeyondViewport: rong >= 1000 && !caoNd });
        if (!a?.data) { await sleep(800); a = await goi("Page.captureScreenshot", { format: "png" }); }   // thử lại kiểu an toàn nhất: đúng khung nhìn   // máy bận: lần chụp đầu có khi trả lỗi
        if (caoNd) await khung(rong);
        if (a?.data) writeFileSync(`${process.env.GD_CHUP}/${rong}${gian ? "-gian" : ""}-${man.ten.replace(/[^\p{L}\d]+/gu, "-")}.png`, Buffer.from(a.data, "base64"));
        else console.log(`    (không chụp được: ${JSON.stringify(a)})`);
      }
      console.log(`${man.ten.padEnd(30)} ${ds.length ? ds.length + " lỗi" : "đạt"}${tay.length ? ` (đo pixel ${tay.length} dòng trên nền gradient/ảnh)` : ""}`);
      for (const x of ds) console.log("    " + JSON.stringify(x));
    }
    console.log(`→ ${loi} lỗi / ${dsMan.length} màn @${rong}px${gian ? " giãn" : ""}`);
    tong += loi;
  }
  console.log(`\nCỔNG GIAO DIỆN: ${tong} lỗi · ${dsMan.length} màn × 4 chế độ · đo pixel ${soDoTay} dòng`);
  await dong();
  process.exit(tong ? 1 : 0);
}

// ---------------------------------------------------------------- kịch bản luồng chính
let sai = 0;
const kq = [];
const xet = async (dk, ten) => { kq.push([dk, ten]); console.log(`${dk ? "đạt" : "SAI"} ${ten}`); if (!dk) { sai++; console.log("    màn: " + ((await chu()) ?? "").replace(/\s+/g, " ").slice(0, 400));
  if (process.env.PHA_CHUP) { const a = await goi("Page.captureScreenshot", { format: "png" }); writeFileSync(`${process.env.PHA_CHUP}/web-sai-${kq.length}.png`, Buffer.from(a.data, "base64")); } } };
const kichBan = async (ten, fn) => { console.log(`\n# ${ten}`); chanQuet = null; try { await fn(); } catch (e) { await xet(false, `${ten}: lỗi ${e}`); } };

await kichBan("Quầy: đăng nhập sai báo rõ, đúng thì vào màn quét", async () => {
  await di("/quay", "aiig_quay", null);
  await doi("Vào quầy");
  await go("Tên đăng nhập", "quay.thu"); await go("Mật khẩu", "sai-mat-khau");
  await bam("Vào quầy");
  await xet(await doi("Tên đăng nhập hoặc mật khẩu chưa đúng"), "báo sai mật khẩu");
  await go("Mật khẩu", MK_Q);
  await bam("Vào quầy");
  await xet(await doi("Sẵn sàng quét"), "vào màn quét");
  await xet(await doi("AiiCafe · Quầy 1") && await doi("Nhân viên: Nguyễn Thị Thu Thuỷ"), "đầu màn có quầy + tên nhân viên");
  await xet(await doi("Quét phiếu quà"), "có nút quét bằng camera");
});

await kichBan("Quầy: gõ mã (có gạch, chữ thường) ⇒ Hợp lệ 50.000đ; quét lại ⇒ Đã dùng, không tính lần 2", async () => {
  const ma = phieu.shift();
  await go("Mã phiếu quà", ma.replace(/(.{4})(?=.)/g, "$1-").toLowerCase());
  await bam("Kiểm tra mã");
  await xet(await doi("Hợp lệ"), "kết quả Hợp lệ");
  await xet(await doi("50.000đ") && await doi(TEN_CON) && await doi(`gia đình ${TEN_BM}`), "mệnh giá + tên Con + gia đình");
  await xet(await doi("Đã đánh dấu “Đã dùng” lúc"), "báo đã đánh dấu dùng");
  await bam("Quét phiếu quà tiếp");
  await xet(await doi("Sẵn sàng quét"), "quay về sẵn sàng");
  await go("Mã phiếu quà", ma);
  await bam("Kiểm tra mã");
  await xet(await doi("Phiếu quà đã dùng"), "quét lần 2 ⇒ Đã dùng");
  await xet(await doi(", Quầy 1") && await doi("không nhận lại lần nữa"), "nói rõ dùng ở quầy nào, lúc nào + không nhận lại");
  const nk = (await api("admin/nhat-ky?loai=quet_voucher", { tok: tokAd })).ds;
  await xet(nk.filter((x) => x.chi_tiet.ma === ma).map((x) => x.chi_tiet.ketQua).sort().join() === "da_dung,hop_le", "nhật ký kiểm toán ghi đủ 2 lượt");
});

await kichBan("Quầy: mất mạng ⇒ báo chưa kiểm tra được, có Thử lại; có mạng lại thì kiểm tra được", async () => {
  await bam("Quét phiếu quà khác");
  const ma = phieu.shift();
  chanQuet = "mat_mang";
  await go("Mã phiếu quà", ma);
  await bam("Kiểm tra mã");
  await xet(await doi("Chưa kiểm tra được"), "màn mất kết nối, không báo hợp lệ");
  chanQuet = null;
  await bam("Thử lại");
  await xet(await doi("Hợp lệ"), "thử lại ⇒ Hợp lệ");
});

await kichBan("Quầy: camera không có trên máy (headless) ⇒ nói rõ, gõ mã vẫn dùng được", async () => {
  await bam("Quét phiếu quà tiếp");
  await bam("Quét phiếu quà");
  await xet(await doi("gõ mã", 6000), "báo không mở được camera + chỉ cách gõ mã");
  await xet(await doi("Sẵn sàng quét"), "ô gõ mã vẫn ở đó");
});

await kichBan("Admin: tài khoản quầy bị từ chối; Admin đăng nhập, nạp quỹ ⇒ quỹ Ba Mẹ tăng", async () => {
  await di("/admin", "aiig_admin", null);
  await doi("Cổng nội bộ AiiGrow");
  await go("Tên đăng nhập", "quay.thu"); await go("Mật khẩu", MK_Q);
  await bam("Đăng nhập");
  await xet(await doi("chỉ dùng ở màn quầy"), "tài khoản quầy không vào admin");
  await go("Tên đăng nhập", "admin.thu"); await go("Mật khẩu", MK_AD);
  await bam("Đăng nhập");
  await xet(await doi("Quỹ phiếu quà đang giữ"), "vào Tổng quan");
  const truoc = (await api("m/quy", { tok: nhaA.bm })).soDu;
  await bam("Gia đình & nạp quỹ");
  await doi(`Nhà ${TEN_BM}`);
  await bam(`Nhà ${TEN_BM}`) || await js(`location.hash = "gia-dinh/${famA}"`);
  await xet(await doi("Ghi nạp quỹ phiếu quà"), "mở chi tiết gia đình");
  await go("Số tiền nạp", "300000"); await go("Ghi chú nạp quỹ", "Tiền mặt tại quầy");
  await bam("Ghi nạp quỹ");
  await xet(await doi("Đã ghi nạp 300.000đ"), "báo đã ghi nạp");
  const sauNap = (await api("m/quy", { tok: nhaA.bm })).soDu;
  await xet(sauNap === truoc + 300_000, `quỹ Ba Mẹ ${truoc} → ${sauNap}`);
  await xet(!(await chu()).match(/base64|bằng chứng/i), "chi tiết gia đình không có ảnh bằng chứng");
});

await kichBan("Admin trả lời chat hỗ trợ ⇒ app Ba Mẹ nhận tin «aiilab»", async () => {
  await js(`location.hash = "ho-tro/${famA}"`);
  await xet(await doi("chưa thấy cộng vào quỹ"), "thấy tin Ba Mẹ");
  await go("Trả lời Ba Mẹ", "AiiLab đã cộng 600.000đ vào quỹ của nhà mình rồi ạ.");
  await bam("Gửi trả lời");
  await xet(await doi("AiiLab đã cộng 600.000đ"), "tin trả lời hiện trong luồng");
  const tin = (await api("m/ho-tro", { tok: nhaA.bm })).tin;
  await xet(tin.at(-1)?.tu === "aiilab" && tin.at(-1)?.noi_dung.includes("600.000đ"), "app Ba Mẹ đọc được tin tu=aiilab");
});

await kichBan("Admin: tham số kẹp min–max; Allowlist thêm mục; nhật ký ghi lại", async () => {
  await js(`location.hash = "tham-so"`);
  await doi("Phiên giải trí tối đa");
  await go("Phiên giải trí tối đa", "999");
  await bam("Lưu thay đổi");
  await xet(await doi("Đã lưu"), "lưu tham số");
  const ts = (await api("admin/tham-so", { tok: tokAd })).ds.find((x) => x.khoa === "phien_toi_da");
  await xet(ts.heThong === 120, `kẹp về max 120 (được ${ts.heThong})`);
  await js(`location.hash = "allowlist"`);
  await doi("Thêm vào Allowlist");
  await go("Tên miền hoặc tên app", "https://scratch.mit.edu/projects");
  await bam("Thêm vào Allowlist");
  await xet(await doi("scratch.mit.edu"), "thêm mục, chuẩn hoá thành tên miền");
  await js(`location.hash = "nhat-ky"`);
  await xet(await doi("Đổi tham số") && await doi("Thêm Allowlist") && await doi("Ghi nạp quỹ"), "nhật ký kiểm toán có các việc vừa làm");
});

await dong();
console.log(`\n${kq.filter((x) => x[0]).length}/${kq.length} đạt`);
process.exit(sai ? 1 : 0);
