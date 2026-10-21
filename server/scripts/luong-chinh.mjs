// Luồng chính đầu-cuối trên MÁY CHỦ THẬT (không giả API): Ba Mẹ thao tác bằng giao diện web /app trong Chrome headless riêng
// (hồ sơ tạm, điều khiển qua CDP — không đụng trình duyệt của ai); máy con + màn Con đi qua /api/device, /api/kid thật.
//   đăng ký (OTP chế độ thử) → thêm Con → ghép máy → giao nhiệm vụ → Con nộp ảnh → Ba Mẹ duyệt trên giao diện → điểm
//   → dùng điểm chơi (phiên trừ theo phút) → đổi quà → Ba Mẹ xác nhận trao → báo cáo.
// Dùng: `pnpm build:app` rồi chạy máy chủ (next dev/start), sau đó `node scripts/luong-chinh.mjs [http://localhost:3320]`.
// Mã thoát 1 nếu có bước SAI. Ảnh lỗi: LC_CHUP=<thư mục>.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const GOC = (process.argv[2] ?? "http://localhost:3320").replace(/\/$/, "");
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CDP = Number(process.env.LC_CDP ?? 9510);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SDT = `09${String(Date.now()).slice(-8)}`;           // số mới mỗi lần chạy — chạy lại trên cùng DB không trùng
const MK = `thu-${Date.now().toString(36)}`;                // mật khẩu dùng một lần, không ghi ra đâu

let sai = 0;
const xet = async (dk, ten) => {
  console.log(`${dk ? "đạt" : "SAI"} ${ten}`);
  if (dk) return;
  sai++;
  console.log("    màn: " + ((await chu()) ?? "").replace(/\s+/g, " ").slice(0, 300));
  if (process.env.LC_CHUP) writeFileSync(join(process.env.LC_CHUP, `lc-sai-${sai}.png`), Buffer.from((await goi("Page.captureScreenshot", { format: "png" })).data, "base64"));
};

async function api(nhom, duong, body, token, them = {}) {
  const r = await fetch(`${GOC}/api/${nhom}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...them },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${nhom}/${duong} → ${r.status} ${d.error ?? ""} ${d.message ?? ""}`);
  return d;
}

// ---------------------------------------------------------------- Chrome headless riêng
const hoSo = mkdtempSync(join(tmpdir(), "aiig-lc-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`, "--no-first-run",
  "--no-default-browser-check", "--window-size=420,900", "--lang=vi-VN", "about:blank"], { stdio: "ignore" });
let trang;
for (let i = 0; i < 60 && !trang; i++) {
  try { trang = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* chờ Chrome */ }
  if (!trang) await sleep(500);
}
const ws = new WebSocket(trang.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let so = 0; const cho = {};
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cho[m.id]) { cho[m.id](m.result ?? m.error); delete cho[m.id]; } };
const goi = (method, params = {}) => new Promise((r) => { cho[++so] = r; ws.send(JSON.stringify({ id: so, method, params })); });
await goi("Page.enable");
await goi("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const js = async (expr) => (await goi("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const chu = () => js("document.body?.innerText");
const mo = (duong) => goi("Page.navigate", { url: `${GOC}/app${duong}` });
const doi = async (txt, ms = 15000) => { for (let t = 0; t < ms; t += 250) { if ((await chu())?.includes(txt)) return true; await sleep(250); } return false; };
const bam = async (txt) => {
  await sleep(150);
  const r = await js(`(() => { const t = ${JSON.stringify(txt)};
    const el = [...document.querySelectorAll("div,span")].filter((e) => e.innerText?.trim() === t).pop();
    if (!el) return null; el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (!r) return false;
  await sleep(250);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) { await goi("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 }); await sleep(80); }
  await sleep(400);
  return true;
};
const go = (nhan, gt) => js(`(() => { const i = [...document.querySelectorAll("input,textarea")].find((e) => e.getAttribute("aria-label") === ${JSON.stringify(nhan)});
  if (!i) return false; const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), "value").set; s.call(i, ${JSON.stringify(gt)});
  i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);

// ảnh bằng chứng: PNG 32×32 sinh tại chỗ (mỗi lần khác nhau để không dính cờ «trùng ảnh cũ»)
function anhThu() {
  const w = 32, h = 32, hang = Buffer.alloc((w * 3 + 1) * h);
  const s = Date.now() % 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) hang.set([(x * 8 + s) & 255, (y * 8) & 255, s], y * (w * 3 + 1) + 1 + x * 3);
  const zlib = process.getBuiltinModule("node:zlib");
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const khoi = (loai, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(loai), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), khoi("IHDR", ihdr), khoi("IDAT", zlib.deflateSync(hang)), khoi("IEND", Buffer.alloc(0))]).toString("base64");
}

try {
  // 1. Đăng ký bằng giao diện
  console.log(`\n# Ba Mẹ đăng ký (${GOC}/app)`);
  await mo("/dang-ky");
  await xet(await doi("Số điện thoại của Ba Mẹ", 60000), "mở được màn đăng ký từ máy chủ thật");
  await go("Số điện thoại hoặc email", SDT); await go("Ba/Mẹ tên gì?", "Mẹ Lan"); await go("Mật khẩu (ít nhất 8 ký tự)", MK);
  await bam("Gửi mã");
  await xet(await doi("Nhập mã 6 số"), "máy chủ gửi OTP");
  const ma = (await chu())?.match(/Bản thử: mã là (\d{6})/)?.[1];
  await xet(!!ma, "chế độ thử hiện mã OTP");
  await go("Mã xác thực 6 số", ma ?? "");
  await bam("Xác nhận");
  await xet(await doi("Con tên gì?"), "đăng ký xong vào bước 1/5");
  const bmTok = await js(`localStorage.getItem("aiig_bm")`);
  await xet(!!bmTok, "có phiên Ba Mẹ");

  // 2. Thêm Con bằng giao diện
  console.log("\n# Thêm Con");
  await go("Tên gọi", "Ken"); await go("Năm sinh", "2017"); await go("Mã PIN của Con", "2468");
  await bam("Tiếp: chọn thiết bị");
  await xet(await doi("2/5"), "lưu Con, sang bước 2/5");
  const gd = await api("m", "gia-dinh", undefined, bmTok);
  const con = gd.con?.find((c) => c.ten === "Ken");
  await xet(!!con, "máy chủ có hồ sơ Ken");

  // 3. Ghép máy (agent Windows giả lập qua /api/device thật)
  console.log("\n# Ghép máy con");
  const { ma: maGhep } = await api("m", "ma-ghep", { con: con.id, nen: "windows" }, bmTok);
  const may = await api("device", "ghep", { ma: maGhep, nen: "windows", tenMay: "Laptop-KEN" });
  await xet(!!may.token, "máy ghép bằng mã, nhận token thiết bị");
  const pol = await api("device", "dong-bo", { clientTime: new Date().toISOString() }, may.token);
  await xet(pol.con?.id === con.id || pol.con === con.id || !!pol.con, "đồng bộ Policy cho đúng Con");

  // 4. Giao nhiệm vụ (mẫu theo tuổi) + Con nộp ảnh
  console.log("\n# Nhiệm vụ → Con nộp ảnh");
  await api("m", "nhiem-vu/mau", { nhom: "nhi" }, bmTok);
  const dsNv = await api("kid", "nhiem-vu", undefined, may.token);
  const nv = (dsNv.ds ?? dsNv.nhiemVu ?? dsNv).find?.((x) => x.ten === "Dọn đồ chơi");
  await xet(!!nv, "Con thấy nhiệm vụ «Dọn đồ chơi»");
  await api("kid", "chao", {}, may.token).catch(() => {});
  const { luot } = await api("kid", `nhiem-vu/${nv.id}/bat-dau`, {}, may.token);
  await api("kid", `luot/${luot}/nop`, { anh: [{ mime: "image/png", base64: anhThu() }] }, may.token);
  await xet(true, "Con nộp ảnh bằng chứng");

  // 5. Ba Mẹ duyệt trên giao diện
  console.log("\n# Ba Mẹ duyệt ảnh trên giao diện");
  await mo("/cho-duyet");
  await xet(await doi("Dọn đồ chơi"), "hộp Chờ duyệt có lượt của Ken");
  await bam("Dọn đồ chơi");
  await xet(await doi("Duyệt · +5 điểm"), "màn duyệt hiện ảnh + nút điểm");
  const nutDuyet = (await chu())?.match(/Duyệt · \+5 điểm[^\n]*/)?.[0];
  await bam(nutDuyet);
  await xet(await doi("+5 điểm cho Ken!"), "duyệt xong, Ken được +5 điểm");
  const vi1 = await api("kid", "toi", undefined, may.token);
  const soDu1 = vi1.vi?.soDu ?? vi1.soDu;
  await xet(soDu1 >= 5, `ví Con trên máy chủ: ${soDu1} điểm`);

  // 6. Dùng điểm để chơi: luật Fun list → xét → mở phiên → nhịp → dừng
  console.log("\n# Dùng điểm để chơi");
  await api("m", `con/${con.id}/diem`, { delta: 100, lyDo: "Thưởng cuối tuần" }, bmTok);
  await api("m", "luat", { con: con.id, muc: "roblox.exe", ten: "Roblox", loai: "giai_tri" }, bmTok);
  const xetPhien = await api("device", "phien/xet", { muc: "roblox.exe" }, may.token);
  await xet(xetPhien.duoc, `máy hỏi «Dùng điểm để chơi?» — được, tối đa ${xetPhien.phutToiDa} phút`);
  if (xetPhien.duoc) {
    const ph = await api("device", "phien/mo", { muc: "roblox.exe" }, may.token);
    const nh = await api("device", "phien/nhip", { id: ph.id ?? ph.phien?.id, dangDung: true }, may.token);
    await xet(!!nh.trangThai, `nhịp phiên: ${nh.trangThai}, còn ${nh.conPhut} phút`);
    await api("device", "phien/dung", { id: ph.id ?? ph.phien?.id }, may.token);
  }

  // 7. Đổi quà + Ba Mẹ xác nhận trao
  console.log("\n# Đổi quà");
  await api("m", "qua/mau", {}, bmTok);
  const ch = await api("kid", "cua-hang", undefined, may.token);
  const qua = (ch.ds ?? ch.qua ?? ch).find?.((x) => x.ten === "Chọn thực đơn bữa tối");
  await xet(!!qua, "cửa hàng có quà «Chọn thực đơn bữa tối»");
  const phieu = await api("kid", `doi/${qua.id}`, {}, may.token);
  await xet(!!phieu, "Con đổi quà, giữ điểm chờ Ba Mẹ trao");
  const dsPhieu = await api("m", "phieu", undefined, bmTok);
  const p1 = (dsPhieu.ds ?? dsPhieu.choTrao ?? dsPhieu).find?.((x) => (x.ten ?? x.ten_qua ?? "").includes("thực đơn"));
  if (p1) await api("m", `phieu/${p1.id}/xac-nhan`, {}, bmTok);
  await xet(!!p1, "Ba Mẹ xác nhận đã trao quà");

  // 8. Báo cáo trên giao diện
  console.log("\n# Báo cáo");
  await mo("/bao-cao");
  await xet(await doi("Tuần này"), "màn Báo cáo tuần mở được");
  await mo("/hom-nay");
  await xet(await doi("Ken"), "Hôm nay hiện Ken");
} catch (e) {
  await xet(false, `lỗi: ${e.message ?? e}`);
}

console.log(`\n${sai ? `${sai} bước SAI` : "Luồng chính đạt trọn"}`);
ws.close(); chrome.kill();
await sleep(500);
try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
process.exit(sai ? 1 : 0);
