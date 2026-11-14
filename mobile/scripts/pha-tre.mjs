// «Cố tình phá» + cổng giao diện cho MÀN CON (AiiGrow Kid, /tre/…) — luật thiết kế 05/11: sao, quỹ giờ chơi, Thêm giờ, ngoại lệ, không PIN — chép khung scripts/pha.mjs: bản WEB EXPORT trong một Chrome headless
// RIÊNG (hồ sơ tạm), chặn MỌI lời gọi /api (kid + device) bằng CDP Fetch và trả dữ liệu giả. Không gọi máy chủ thật.
//
//   EXPO_PUBLIC_API=http://localhost:8193 npx expo export --platform web --output-dir <thư mục>
//   PHA_CONG=8193 PHA_CDP=9501 node scripts/pha-tre.mjs <thư mục>                # kịch bản luồng chính + đếm chạm + mất mạng
//   PHA_CONG=8193 PHA_CDP=9501 node scripts/pha-tre.mjs <thư mục> --giao-dien    # cổng chuẩn giao diện trên mọi màn con-*
// GD_CHUP=<thư mục> [GD_CHUP_TAT_CA=1]: chụp màn (cổng). PHA_CHUP=<thư mục>: chụp bước SAI của kịch bản. Mã thoát 1 nếu có SAI / lỗi.
import http from "node:http";
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const DIR = process.argv[2] ?? "dist";
const CHROME = process.argv.slice(3).find((x) => !x.startsWith("--")) ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CONG = Number(process.env.PHA_CONG ?? 8193), CDP = Number(process.env.PHA_CDP ?? 9501), GOC = `http://localhost:${CONG}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- web tĩnh (SPA: đường lạ → index.html)
const LOAI = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json",
  ".ttf": "font/ttf", ".webp": "image/webp", ".svg": "image/svg+xml" };
const may = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let f = join(DIR, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIR, "index.html");
  res.writeHead(200, { "content-type": LOAI[extname(f)] ?? "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(CONG);

// ---------------------------------------------------------------- dữ liệu giả (tên dài để lộ lỗi tràn / rớt dòng)
const bay = Date.now(), luc = (phut) => new Date(bay - phut * 60000).toISOString();
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const KEN = "Ngọc Bảo Anh", BILL = "Bill";
const capDo = { cap: 4, diemCapSau: 1000, conThieu: 160 };
const toi = (o = {}) => ({ con: { id: "c1", ten: KEN, nhom: "nhi", avatar: "rob", daChao: true, ...o }, soDu: 45, diemChoDuyet: 0, tongKiem: 840, capDo,
  phutChoi: 45, tranNgay: 90, nhiemVuCho: 0, yeuCauCho: 1, nhiemVuXong: 2, homNayConDa: [],
  loiKhen: [{ id: "k1", noi_dung: "Giỏi lắm!", phan_hoi: null, created_at: luc(20) }] });
// quỹ giờ chơi hôm nay (server/lib/quy-gio.ts › quyHomNay): còn 18 / 60 phút, 10 sao = 10 phút
const quy = (o = {}) => ({ ngay: "2026-11-05", cuoiTuan: false, quyNgayPhut: 60, themPhut: 0, doiSaoPhut: 0, daDung: 42, conPhut: 18, tongPhut: 60,
  dangNgu: false, dangHoc: false, khoa: false, gioNgu: { tu: "21:30", den: "06:30" }, gioHoc: null, phutToiNgu: 120, phutToiHoc: null,
  tyLe: { sao: 10, phut: 10 }, doiSao: { bat: true, toiDaNgay: 30, conDoiDuoc: 30 }, choXinThem: true, ...o });
const nha = (o = {}) => ({ soDu: 45, sao: 45, diemChoDuyet: 0, tongKiem: 840, capDo, chuoiNgay: 6, mucTieu: { id: "q3", ten: "Bộ Lego xếp hình thành phố", diem: 500, conThieu: 455 },
  nhiemVuMo: 5, canBoSung: [], phutChoi: 45, tranNgay: 90, conPhut: 45, khung: { dang: true, den: "20:00", moLai: null, moMai: false }, gioNgu: false,
  nghiDen: null, phien: null, phienToiDa: 30, nghiGiua: 60, quy: quy(), ...o });
const nv = (id, ten, nhom, diem, o = {}) => ({ id, ten, mo_ta: "", nhom, diem, bang_chung: "anh", kieu: "thuong", toi_da_ngay: null, toi_da_tuan: null,
  phut_toi_thieu: 0, trang_thai_con: "san_sang", luot_dang: null, hom_nay: 0, dang_cho: 0, ...o });
const DS_NV = [nv("t0", "Rửa chén sau bữa ăn", "viec_nha", 10, { toi_da_ngay: 3, hom_nay: 2 }), nv("t1", "Đọc sách 50 trang", "doc_sach", 10, { phut_toi_thieu: 20 }),
  nv("t2", "Học 1 bài tiếng Anh cùng chị", "hoc_tap", 20, { dang_cho: 1 }), nv("t3", "Lau sàn nhà", "viec_nha", 10, { toi_da_ngay: 1, hom_nay: 1, trang_thai_con: "du_hom_nay" }),
  nv("t4", "Tự xếp chăn gối", "ky_nang", 5, { bang_chung: "xong" }), nv("t5", "Đọc to 1 trang truyện", "doc_sach", 10, { bang_chung: "ghi_am" }),
  nv("t6", "Học 1 bài với AiiRob", "hoc_tap", 20, { bang_chung: "tu_dong", tu_cham: true })];
const yc = (id, loai, o = {}) => ({ id, child_id: "c1", loai, phut: null, gia_tri: null, ly_do: "Để làm bài tập", trang_thai: "cho", created_at: luc(25), xu_ly_luc: null,
  ly_do_tu_choi: null, het_han: luc(-1400), ...o });
const coBan = {
  "GET toi": toi(), "GET nha": nha(), "POST chao": { diemChaoMung: 10 }, "POST dang-xuat": { ok: true },
  "POST ho-so": { con: [{ id: "c1", ten: KEN, avatar: "rob" }, { id: "c2", ten: BILL, avatar: "rob" }] }, "POST chon-con": { phienCon: "tok-con" },
  "GET quy": { quy: quy(), sao: 45, phutDoiDuoc: 30, ngoaiLe: [], yeuCauCho: [] }, "POST doi-sao": { id: "g1", phut: 15, sao: 15, soDu: 30, conPhut: 33 },
  "POST xin-duyet": { id: "y8", trang_thai: "cho", daCo: false, loai: "cai_app", muc: "com.google.android.youtube" },
  "POST ghep": { deviceId: "d1", token: "tok-may", dungChung: true },
  "GET nhiem-vu": { ds: DS_NV }, "POST nhiem-vu/t0/bat-dau": { luot: "l9" }, "POST luot/l9/nop": { trang_thai: "cho_duyet", nghi_trung: false },
  "POST luot/l2/nop": { trang_thai: "cho_duyet", nghi_trung: false }, "POST nhiem-vu/t4/bat-dau": { luot: "l8" }, "POST luot/l8/nop": { trang_thai: "cho_duyet" },
  "GET luot": { ds: [{ id: "l1", trang_thai: "duoc_duyet", diem: 10, ly_do: null, loi_khen: "Giỏi lắm!", nop_luc: luc(30), ten: "Rửa chén sau bữa ăn" },
    { id: "l2", trang_thai: "can_bo_sung", diem: null, ly_do: "ảnh hơi mờ một chút", loi_khen: null, nop_luc: luc(90), ten: "Rửa chén sau bữa ăn" }] },
  "POST loi-khen/k1/phan-hoi": { ok: true },
  "GET tro-choi": { ds: [{ muc: "roblox.exe", ten: "Roblox", nhom: "game", giaPhut: 1 }] },
  "POST phien/xet": { duoc: true, nhom: "game", giaPhanNghin: 1000, phutToiDa: 30, soDu: 45, cau: null },
  "POST phien/mo": { id: "p1", duoc: true, phutToiDa: 30, soDu: 45, moi: true },
  "POST phien/nhip": { trangThai: "chay", phutDung: 25, conPhut: 5, diemTru: 25, soDu: 20, canhBao: 5, muc: "roblox.exe", toiDaPhut: 30, giaPhanNghin: 1000 },
  "POST phien/dung": { diemTru: 25, phutDung: 25.4, nghiDen: luc(-60), soDu: 20 },
  "GET yeu-cau": { ds: [yc("y1", "mo_web", { gia_tri: "scratch.mit.edu", trang_thai: "dong_y", xu_ly_luc: luc(3) }), yc("y2", "them_gio", { phut: 15, ly_do: "Bạn rủ chơi" }),
    yc("y3", "cai_app", { gia_tri: "Minecraft", trang_thai: "tu_choi", ly_do_tu_choi: "Cuối tuần nói chuyện nhé", xu_ly_luc: luc(300) })],
    lyDoNhanh: ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan", "Con làm xong việc rồi"] },
  "POST yeu-cau": { id: "y9", trang_thai: "cho" }, "POST yeu-cau/y2/huy": { ok: true },
  "GET cua-hang": { soDu: 520, sao: 520, qua: [
    { id: "q1", ten: "Đi ăn kem", loai: "qua", diem: 50, menh_gia: null, chi_cuoi_tuan: false, toi_da_thang: null, du: true, conThieu: 0 },
    { id: "q2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, menh_gia: null, chi_cuoi_tuan: true, toi_da_thang: null, du: true, conThieu: 0 },
    { id: "q3", ten: "Bộ Lego xếp hình thành phố", loai: "qua", diem: 800, menh_gia: null, chi_cuoi_tuan: false, toi_da_thang: null, du: false, conThieu: 280 }] },
  "POST doi/q1": { phieu: "r1", trangThai: "cho_trao" },
  "GET vi-qua": { voucher: [], daTrao: [{ id: "r3", ten: "Đi ăn kem", loai: "qua", diem: 50, xu_ly_luc: luc(2 * 1440) }],
    phieu: [{ id: "r2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, trang_thai: "giu", created_at: luc(9 * 1440) }] },
  "GET quy-tac": { lich: { ngayThuong: [{ tu: "17:00", den: "20:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" } },
    tranNgay: 60, tranTuan: 420, phienToiDa: 30, nghiGiua: 60, giaPhut: { game: 0, video_ngan: 0, mxh: 0, phim_gd: 0 }, quyNgayThuong: 60, quyCuoiTuan: 90, phut10Sao: 10,
    nhiemVu: DS_NV.map((x) => ({ ten: x.ten, diem: x.diem })), qua: [{ ten: "Đi ăn kem", diem: 50 }, { ten: "Đi xem phim cuối tuần", diem: 300 }] },
  "GET thanh-tich": { chuoiNgay: 6, soDu: 45, tongKiem: 840, capDo, huyHieu: [
    { ma: "khoi_dau", ten: "Khởi đầu", mo_ta: "Nhiệm vụ đầu tiên được Ba Mẹ duyệt", dat: true, datLuc: luc(20000) },
    { ma: "mot_sach", ten: "Mọt sách", mo_ta: "5 lần đọc sách được duyệt", dat: true, datLuc: luc(6000) },
    { ma: "tay_dam_dang", ten: "Đôi tay đảm đang", mo_ta: "10 việc nhà được duyệt", dat: false, datLuc: null },
    { ma: "chuoi_7", ten: "Bền bỉ 7 ngày", mo_ta: "7 ngày liền có nhiệm vụ được duyệt", dat: false, datLuc: null }] },
  "GET lich-su": { ds: [{ delta: 10, loai: "nhiem_vu", ly_do: "Nhiệm vụ Rửa chén sau bữa ăn", created_at: luc(30) }, { delta: -25, loai: "phien", ly_do: "Chơi roblox.exe", created_at: luc(200) }] },
};
let kb = { ...coBan };          // "METHOD đường" → dữ liệu | { status, body } | "mat_mang"
let matMang = false;
const nhatKy = [];

// ---------------------------------------------------------------- Chrome + CDP
const hoSo = mkdtempSync(join(tmpdir(), "aiig-pha-tre-"));
const ANH_TEP = join(hoSo, "bon-rua.png");
writeFileSync(ANH_TEP, Buffer.from(PNG, "base64"));
const chrome = spawn(CHROME, ["--headless=new", "--use-mock-keychain", "--password-store=basic", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`, "--no-first-run",
  "--no-default-browser-check", "--window-size=420,900", "--lang=vi-VN", "about:blank"], { stdio: "ignore" });
let trang;
for (let i = 0; i < 60 && !trang; i++) {
  try { trang = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* chờ Chrome */ }
  if (!trang) await sleep(500);
}
const ws = new WebSocket(trang.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let so = 0; const cho = {};
let khiChonTep = null;          // Page.fileChooserOpened → hàm xử lý (chụp bằng chứng trên web)
ws.onmessage = async (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cho[m.id]) { cho[m.id](m.result ?? m.error); delete cho[m.id]; return; }
  if (process.env.PHA_GO && (m.method === "Runtime.exceptionThrown" || m.method === "Runtime.consoleAPICalled")) console.log("   [trang]", JSON.stringify(m.params.exceptionDetails?.exception?.description ?? m.params.args?.map((a) => a.value ?? a.description)).slice(0, 300));
  if (m.method === "Page.fileChooserOpened") { khiChonTep?.(m.params); return; }
  if (m.method !== "Fetch.requestPaused") return;
  const { requestId, request } = m.params;
  const d = new URL(request.url).pathname.replace(/^\/api\/(m|kid|device)\//, "");
  const khoa = `${request.method} ${d}`;
  let body = null; try { body = request.postData ? JSON.parse(request.postData) : null; } catch { /* không JSON */ }
  if (request.method === "OPTIONS") return goi("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: [] });
  nhatKy.push({ m: request.method, d, body, matMang });
  const tl = matMang ? "mat_mang" : kb[khoa];
  if (tl === "mat_mang") return goi("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" });
  const { status, data } = tl === undefined ? { status: 404, data: { error: "khong_co_duong", message: `pha-tre.mjs chưa giả ${khoa}` } }
    : tl && typeof tl === "object" && "status" in tl ? { status: tl.status, data: tl.body } : { status: 200, data: tl };
  if (tl === undefined) console.log("   (chưa giả)", khoa);
  goi("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(data)).toString("base64") });
};
const goi = (method, params = {}) => new Promise((r) => { cho[++so] = r; ws.send(JSON.stringify({ id: so, method, params })); });
await goi("Page.enable");
await goi("DOM.enable");
if (process.env.PHA_GO) await goi("Runtime.enable");
await goi("Fetch.enable", { patterns: [{ urlPattern: `${GOC}/api/*`, requestStage: "Request" }] });
await goi("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await goi("Emulation.setLocaleOverride", { locale: "vi-VN" });
const js = async (expr) => (await goi("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const chu = () => js("document.body.innerText");
/** Mở `duong` với phiên Con (token) + máy đã ghép; `daXem` = các lượt đã ăn mừng (mặc định l1 — Nhà không tự mở màn ăn mừng). */
const di = async (duong, o = {}) => {
  const { con = "tok-con", mayTok = "tok-may", daXem = ["l1"] } = o;
  await goi("Page.navigate", { url: `${GOC}/tre/chon-ten` });
  await sleep(300);
  await js(`(() => { localStorage.clear(); ${con ? `localStorage.setItem("aiig_con", ${JSON.stringify(con)});` : ""}
    ${mayTok ? `localStorage.setItem("aiig_may", ${JSON.stringify(mayTok)});` : ""} localStorage.setItem("aiig_tre_da_xem", ${JSON.stringify(JSON.stringify(daXem))}); })()`);
  await goi("Page.navigate", { url: `${GOC}${duong}` });
};
const doi = async (txt, ms = 8000) => { for (let t = 0; t < ms; t += 250) { if ((await chu())?.includes(txt)) return true; await sleep(250); } return false; };
const bamToaDo = async (r) => {
  await sleep(250);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) { await goi("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 }); await sleep(80); }
  await sleep(400);
  return true;
};
let cham = 0;                   // đếm chạm (kịch bản ≤ 3 chạm)
/** Bấm vào chữ `txt` bằng chuột thật (CDP Input) — Pressable của react-native-web nghe pointer, không nghe .click(). */
const bam = async (txt) => {
  await sleep(150);
  const tim = `[...document.querySelectorAll("div,span")].filter((e) => e.innerText?.trim() === ${JSON.stringify(txt)}).pop()`;
  if (!(await js(`(() => { const el = ${tim}; if (!el) return false; const b = el.getBoundingClientRect(); if (b.top < 0 || b.bottom > innerHeight) el.scrollIntoView({ block: "center" }); return true; })()`))) return false;
  await sleep(300);                       // chờ cuộn + bố cục ổn định rồi mới đo lại toạ độ và bấm
  const r = await js(`(() => { const el = ${tim}; if (!el) return null; const b = el.getBoundingClientRect(); const v = window.visualViewport;
    return { x: b.x + b.width / 2 - (v?.offsetLeft ?? 0), y: b.y + b.height / 2 - (v?.offsetTop ?? 0) }; })()`);
  if (!r) return false;
  cham++;
  return bamToaDo(r);
};
/** Bấm phần tử có aria-label `nhan` (nút không chữ: nút chụp). */
const bamNhan = async (nhan) => {
  await sleep(150);
  const r = await js(`(() => { const el = [...document.querySelectorAll("[aria-label]")].filter((e) => e.getAttribute("aria-label") === ${JSON.stringify(nhan)} && e.getBoundingClientRect().width > 0).pop();
    if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (!r) return false;
  cham++;
  return bamToaDo(r);
};
/** Gõ vào ô có aria-label `nhan` (setter gốc + sự kiện input — React nhận như người gõ). */
const go = (nhan, gt) => js(`(() => { const i = [...document.querySelectorAll("input,textarea")].find((e) => e.getAttribute("aria-label") === ${JSON.stringify(nhan)});
  if (!i) return false; const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), "value").set; s.call(i, ${JSON.stringify(gt)});
  i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
/** Chụp bằng chứng trên web: bấm nút chụp ⇒ trình duyệt mở hộp chọn ảnh/camera ⇒ đưa tệp ảnh vào (như Con chụp xong). */
const chupAnh = async () => {
  await goi("Page.setInterceptFileChooserDialog", { enabled: true });
  const mo = new Promise((ok) => { khiChonTep = ok; setTimeout(() => ok(null), 5000); });
  await bamNhan("Chụp và gửi cho Ba Mẹ");
  const p = await mo;
  khiChonTep = null;
  if (!p) return false;
  await goi("DOM.setFileInputFiles", { files: [ANH_TEP], backendNodeId: p.backendNodeId });
  return true;
};

// ---------------------------------------------------------------- cổng chuẩn giao diện
if (process.argv.includes("--giao-dien")) {
  const { chayCong } = await import("./giao-dien.mjs");
  const M = (ten, duong, cho, tc = {}) => ({ ten, duong, cho, ...tc });
  const teen = { "GET toi": toi({ ten: BILL, nhom: "teen", id: "c2" }) };
  const ngu = { "GET nha": nha({ quy: quy({ dangNgu: true, conPhut: 0 }) }), "GET quy": { quy: quy({ dangNgu: true }), sao: 45, phutDoiDuoc: 0, ngoaiLe: [], yeuCauCho: [] } };
  const hetGio = { "GET nha": nha({ quy: quy({ conPhut: 0, daDung: 60 }) }), "GET quy": { quy: quy({ conPhut: 0, daDung: 60 }), sao: 45, phutDoiDuoc: 30, ngoaiLe: [], yeuCauCho: [] } };
  const dsMan = [
    M("con-chon-ten", "/tre/chon-ten", "Ai đang dùng máy?", { con: null }),
    M("con-chon-ten (ghép máy)", "/tre/chon-ten", "Ghép máy với AiiGrow", { con: null, mayTok: null }),
    M("con-chao", "/tre/chao", "Nhận 10 sao"),
    M("con-trang", "/tre/nha", "Giờ chơi còn 18 phút"),
    M("con-trang (giờ ngủ)", "/tre/nha", "Đến giờ ngủ rồi", { kb: ngu }),
    M("con-trang (teen)", "/tre/nha", "Giải trí hôm nay", { kb: teen }),
    M("con-trang (mất mạng)", "/tre/nha", "Đang chờ mạng", { matMang: true }),
    M("con-them-gio (dùng sao)", "/tre/them-gio", "Đổi 15 sao lấy 15 phút"),
    M("con-them-gio (hết giờ)", "/tre/them-gio", "Hết giờ chơi hôm nay", { kb: hetGio }),
    M("con-them-gio (chưa đủ sao)", "/tre/them-gio", "Làm nhiệm vụ lấy thêm sao", { kb: { "GET quy": { quy: quy(), sao: 5, phutDoiDuoc: 5, ngoaiLe: [], yeuCauCho: [] } } }),
    M("con-gio-ngu", "/tre/gio-ngu?ly=gio_ngu", "Xin Ba Mẹ mở ngoại lệ", { kb: ngu }),
    M("con-ngoai-le", "/tre/ngoai-le?ly=gio_ngu", "không trừ giờ chơi"),
    M("con-nhiem-vu", "/tre/nhiem-vu", "Hôm nay làm gì nào?"),
    M("con-nhiem-vu (trống)", "/tre/nhiem-vu", "Chưa có nhiệm vụ nào", { kb: { "GET nhiem-vu": { ds: [] } } }),
    M("con-nv-chi-tiet", "/tre/nv/t0", "Hôm nay đã làm 2/3 lần"),
    M("con-nv-chi-tiet (AiiRob)", "/tre/nv/t6", "Mở app Học với AiiRob"),
    M("con-nv-dang", "/tre/dang/l9?nv=t1", "đang đọc sách"),
    M("con-chup", "/tre/chup/l9?nv=t0", "Rob giữ ảnh này cho Ba Mẹ xem"),
    M("con-ghi-am", "/tre/chup/l9?nv=t5", "Ghi âm kể lại cho Ba Mẹ"),
    M("con-cho-duyet", "/tre/cho-duyet?diem=10", "Đã nộp bài · chờ Ba Mẹ"),
    M("con-cho-duyet (mất mạng)", "/tre/cho-duyet?diem=10&xep=1", "hàng chờ trên máy"),
    M("con-duoc-duyet", "/tre/duoc-duyet/l1", "+10 sao!"),
    M("con-chup-lai", "/tre/chup-lai/l2?nv=t0", "không mất sao nào"),
    M("con-chan-app", "/tre/chan-app?muc=com.google.android.youtube&ten=YouTube", "Xin Ba Mẹ mở YouTube"),
    M("con-chan-web", "/tre/chan-web?url=scratch.mit.edu", "Trang này Rob chưa biết"),
    M("con-chan-web (teen)", "/tre/chan-web?url=scratch.mit.edu", "Quy tắc: trang web mới", { kb: teen }),
    M("con-xin-phep", "/tre/xin-phep?loai=mo_web&gia=scratch.mit.edu&tu=chan-web", "Xin mở trang web"),
    M("con-xin-phep (thêm giờ)", "/tre/xin-phep", "Dùng sao lấy giờ chơi"),
    M("con-xin-phep (đủ 3)", "/tre/xin-phep", "đã có 3 yêu cầu đang chờ", { kb: { "GET yeu-cau": { ds: [yc("a", "them_gio", { phut: 15 }), yc("b", "them_gio", { phut: 30 }), yc("c", "mo_web", { gia_tri: "abc.vn" })], lyDoNhanh: [] } } }),
    M("con-yeu-cau", "/tre/yeu-cau", "Ba Mẹ đồng ý rồi!"),
    M("con-yeu-cau (trống)", "/tre/yeu-cau", "chưa xin gì cả", { kb: { "GET yeu-cau": { ds: [], lyDoNhanh: [] } } }),
    M("con-gio-may", "/tre/gio-may?lech=61", "Đồng hồ máy lệch 61 phút", { kb: teen }),
    M("con-cua-hang", "/tre/cua-hang", "Đổi sao lấy giờ chơi hoặc quà"),
    M("con-cua-hang (trống)", "/tre/cua-hang", "Chưa có quà nào", { kb: { "GET cua-hang": { soDu: 45, qua: [] }, "GET nha": nha({ quy: quy({ doiSao: { bat: false, toiDaNgay: 30, conDoiDuoc: 30 } }) }) } }),
    M("con-doi-qua", "/tre/doi/q1", "Đổi 50 sao"),
    M("con-vi-qua", "/tre/vi-qua", "Đã trao"),
    M("con-vi-qua (trống)", "/tre/vi-qua", "chưa có quà nào", { kb: { "GET vi-qua": { voucher: [], phieu: [], daTrao: [] } } }),
    M("con-quy-tac", "/tre/quy-tac", "Ai cũng thấy giống nhau"),
    M("con-quy-tac (teen)", "/tre/quy-tac", "Học 1 bài tiếng Anh cùng chị", { kb: teen }),
    M("con-huy-hieu", "/tre/huy-hieu", "Cấp 4 · Mầm xanh"),
    M("con-win-cai", "/tre/cai?tep=MinecraftInstaller.exe", "MinecraftInstaller.exe chưa được cài", { kb: teen }),
  ];
  const vao = async (m) => {
    kb = { ...coBan, ...(m.kb ?? {}) };
    matMang = !!m.matMang;
    await di(m.duong, { con: m.con === undefined ? "tok-con" : m.con, mayTok: m.mayTok === undefined ? "tok-may" : m.mayTok });
    if (m.sau) { await sleep(1500); await m.sau(); }
    const ok = await doi(m.cho, 8000);
    matMang = false;
    if (ok) return true;
    console.log(`    KHÔNG TẢI: chưa thấy «${m.cho}» ở ${m.duong}: ${(await chu())?.replace(/\s+/g, " ").slice(0, 160)}`);
    return false;
  };
  const tong = await chayCong({ goi, js, sleep, dsMan, vao });
  ws.close(); chrome.kill(); may.close();
  await sleep(500);
  try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
  process.exit(tong ? 1 : 0);
}

// ---------------------------------------------------------------- kịch bản luồng chính
let sai = 0;
const kq = [];
const xet = async (dk, ten) => { kq.push([dk, ten]); console.log(`${dk ? "đạt" : "SAI"} ${ten}`); if (!dk) { sai++; console.log("    gọi: " + nhatKy.slice(-6).map((x) => `${x.m} ${x.d}`).join(" · ")); console.log("    màn: " + ((await chu()) ?? "").replace(/\s+/g, " ").slice(0, 400));
  if (process.env.PHA_CHUP) { const a = await goi("Page.captureScreenshot", { format: "png" }); writeFileSync(`${process.env.PHA_CHUP}/tre-sai-${kq.length}.png`, Buffer.from(a.data, "base64")); } } };
const kichBan = async (ten, fn) => { if (process.env.PHA_CHI && !ten.includes(process.env.PHA_CHI)) return; console.log(`\n# ${ten}`); kb = { ...coBan }; matMang = false; nhatKy.length = 0; cham = 0; try { await fn(); } catch (e) { await xet(false, `${ten}: lỗi ${e}`); } };
const coGoi = (d, dk = () => true) => nhatKy.some((x) => x.d === d && !x.matMang && dk(x.body ?? {}));

await kichBan("Chọn tên (không PIN) → vào Nhà (máy dùng chung)", async () => {
  await di("/tre/chon-ten", { con: null });
  await xet(await doi("Ai đang dùng máy?"), "màn chọn tên");
  await xet(await doi(BILL), "hiện mọi hồ sơ trên máy");
  await xet(!(await chu()).includes("PIN"), "không còn nhắc PIN");
  await bam(KEN);
  await xet(await doi("Giờ chơi còn 18 phút", 9000), "chạm tên ⇒ vào Nhà");
  await xet(coGoi("chon-con", (b) => b.con === "c1" && b.pin === undefined), "gửi chon-con đúng hồ sơ, không PIN");
  await xet(await doi("45 sao"), "sao luôn ở trên cùng");
  await xet(!(await chu()).includes("điểm"), "không còn chữ «điểm» ở Nhà");
});

await kichBan("Đường cũ /tre/pin ⇒ chọn tên", async () => {
  await di("/tre/pin", { con: null });
  await xet(await doi("Ai đang dùng máy?", 9000), "chuyển sang chọn tên");
});

await kichBan("Agent Windows mở khung Kid với ?phien= ⇒ vào thẳng Nhà, phiên xoá khỏi URL", async () => {
  await di("/tre?phien=tok-q", { con: null });
  await xet(await doi("Giờ chơi còn 18 phút", 9000), "vào thẳng Nhà");
  await xet((await js("localStorage.getItem(\"aiig_con\")")) === "tok-q", "giữ phiên Con từ query");
  await xet(!(await js("location.href")).includes("phien="), "phiên không còn trên URL");
});

await kichBan("Thêm giờ: Dùng sao 30 phút → đã đổi, cộng vào giờ chơi", async () => {
  kb["POST doi-sao"] = { id: "g1", phut: 30, sao: 30, soDu: 15, conPhut: 48 };
  await di("/tre/nha");
  await doi("Giờ chơi còn 18 phút");
  await bam("Giờ chơi còn 18 phút");
  await xet(await doi("Đổi 15 sao lấy 15 phút"), "màn Thêm giờ, mặc định Dùng sao 15 phút");
  await bam("30 phút");
  await xet(await doi("Còn 15 sao · giờ chơi thành"), "nói rõ sao còn lại + giờ chơi mới");
  await bam("Đổi 30 sao lấy 30 phút");
  await xet(coGoi("doi-sao", (b) => b.phut === 30), "gọi doi-sao 30 phút");
  await xet(await doi("Đã đổi: +30 phút chơi"), "báo đã đổi");
  await xet(await doi("Giờ chơi còn 48 phút"), "giờ chơi mới");
});

await kichBan("Thêm giờ: Xin Ba Mẹ 20 phút + lời nhắn", async () => {   // chip xin 10/20/30 (Thanh chốt 05/11)
  await di("/tre/them-gio");
  await doi("Dùng sao");
  await bam("Xin Ba Mẹ");
  await bam("20 phút");
  await go("Nhắn Ba Mẹ (không bắt buộc)", "con làm nốt bài với bạn ạ");
  await bam("Xin Ba Mẹ thêm 20 phút");
  await xet(coGoi("yeu-cau", (b) => b.loai === "them_gio" && b.phut === 20 && b.lyDo === "con làm nốt bài với bạn ạ"), "gửi them_gio 20 phút + lời nhắn");
  await xet(await doi("Thêm 15 phút chơi"), "sang danh sách yêu cầu");
});

await kichBan("Chưa đủ sao ⇒ không đổi được, gợi ý làm nhiệm vụ", async () => {
  kb["GET quy"] = { quy: quy(), sao: 5, phutDoiDuoc: 5, ngoaiLe: [], yeuCauCho: [] };
  await di("/tre/them-gio");
  await xet(await doi("còn thiếu 10 sao"), "nói rõ còn thiếu bao nhiêu sao");
  await xet(await doi("Làm nhiệm vụ lấy thêm sao"), "nút làm nhiệm vụ");
});

await kichBan("Giờ ngủ ⇒ không thêm giờ, chỉ xin ngoại lệ (cả máy / một app)", async () => {
  kb["GET nha"] = nha({ quy: quy({ dangNgu: true, conPhut: 0 }) });
  kb["GET quy"] = { quy: quy({ dangNgu: true }), sao: 45, phutDoiDuoc: 0, ngoaiLe: [], yeuCauCho: [] };
  await di("/tre/them-gio");
  await xet(await doi("Đến giờ ngủ rồi", 9000), "Thêm giờ lúc giờ ngủ ⇒ màn giờ ngủ");
  await xet(await doi("Máy mở lại lúc 06:30"), "nói giờ mở lại");
  await xet(!(await chu()).includes("Đổi 15 sao"), "không cho đổi sao");
  await bam("Xin Ba Mẹ mở ngoại lệ");
  await xet(await doi("không trừ giờ chơi"), "form ngoại lệ");
  await bam("Một app");
  await go("App nào?", "Từ điển");
  await bam("30 phút");
  await bam("Xin Ba Mẹ mở Từ điển 30 phút");
  await xet(coGoi("yeu-cau", (b) => b.loai === "ngoai_le" && b.phamVi === "app" && b.giaTri === "Từ điển" && b.phut === 30), "gửi ngoại lệ một app 30 phút");
});

await kichBan("Nhận nhiệm vụ → chụp bằng chứng (web: camera trình duyệt) → chờ duyệt, nộp ≤ 3 chạm", async () => {
  await di("/tre/nhiem-vu");
  await doi("Hôm nay làm gì nào?");
  await xet(coGoi("nhiem-vu"), "tải nhiệm vụ (kèm việc AiiRob tự chấm)");
  await bam("Rửa chén sau bữa ăn");
  await xet(await doi("Hôm nay đã làm 2/3 lần"), "chi tiết nhiệm vụ");
  await xet(await doi("+10 sao"), "số sao của việc");
  cham = 0;
  await bam("Bắt đầu");
  await xet(coGoi("nhiem-vu/t0/bat-dau"), "Bắt đầu ⇒ máy chủ mở lượt");
  await xet(await doi("Xong thì quay lại bấm nút xanh nhé!"), "đồng hồ nhiệm vụ");
  const tu = cham;
  await bam("Xong, chụp ảnh");
  await xet(await doi("Rob giữ ảnh này cho Ba Mẹ xem"), "camera mở ngay trong app");
  await xet(await chupAnh(), "bấm chụp ⇒ mở camera / chọn ảnh của trình duyệt");
  await xet(await doi("Đã nộp bài · chờ Ba Mẹ", 9000), "gửi xong ⇒ chờ Ba Mẹ duyệt");
  await xet(coGoi("luot/l9/nop", (b) => b.anh?.[0]?.mime === "image/jpeg" && b.anh[0].base64.length > 10), "ảnh JPEG đã nén gửi kèm lượt");
  await xet(cham <= 3, `nộp từ lúc bắt đầu: ${cham} chạm (≤ 3)`);
  await xet(cham - tu <= 2, `sau khi làm xong: ${cham - tu} chạm`);
});

await kichBan("Việc «bấm Xong» ⇒ nộp không cần bằng chứng", async () => {
  await di("/tre/nv/t4");
  await doi("Bấm «Xong»");
  await bam("Bắt đầu");
  await bam("Xong rồi!");
  await xet(coGoi("luot/l8/nop", (b) => Array.isArray(b.anh) && !b.anh.length && !b.ghiAm), "nộp không kèm ảnh / ghi âm");
  await xet(await doi("Đã nộp bài · chờ Ba Mẹ", 9000), "chờ Ba Mẹ duyệt");
});

await kichBan("Mất mạng lúc nộp ⇒ bài vào hàng chờ trên máy, có mạng lại tự gửi", async () => {
  await di("/tre/chup/l9?nv=t0");
  await doi("Rob giữ ảnh này cho Ba Mẹ xem");
  await sleep(800);
  matMang = true;
  await chupAnh();
  await xet(await doi("hàng chờ trên máy", 9000), "báo bài nằm trong hàng chờ, không cần làm lại");
  matMang = false;
  let gui = false;
  for (let t = 0; t < 30 && !gui; t++) { await sleep(500); gui = coGoi("luot/l9/nop"); }
  await xet(gui, "có mạng lại ⇒ tự gửi bài cho Ba Mẹ");
  await sleep(1200);
  await xet(!(await chu()).includes("hàng chờ trên máy"), "gửi xong ⇒ hết băng mất mạng");
});

await kichBan("App lạ ⇒ Xin Ba Mẹ duyệt (một chạm, lời nhắn không bắt buộc)", async () => {
  await di("/tre/chan-app?muc=com.google.android.youtube&ten=YouTube");
  await doi("YouTube chưa được mở");
  cham = 0;
  await bam("Xin Ba Mẹ mở YouTube");
  await xet(coGoi("xin-duyet", (b) => b.muc === "com.google.android.youtube" && b.lyDo === ""), "gửi xin-duyet, không bắt lý do");
  await xet(cham <= 1, `xin duyệt: ${cham} chạm`);
  await xet(await doi("Ba Mẹ đồng ý rồi!"), "sang danh sách yêu cầu");
});

await kichBan("Màn chặn web ⇒ xin Ba Mẹ duyệt ≤ 2 chạm (link điền sẵn); web cấm ⇒ báo luôn chặn", async () => {
  await di("/tre/chan-web?url=scratch.mit.edu");
  await doi("Trang này Rob chưa biết");
  cham = 0;
  await bam("Xin Ba Mẹ duyệt");
  await xet(await doi("Xin mở trang web"), "form đã điền sẵn");
  await bam("Xin Ba Mẹ mở scratch.mit.edu");
  await xet(coGoi("xin-duyet", (b) => b.muc === "scratch.mit.edu"), "gửi xin-duyet đúng trang");
  await xet(cham <= 2, `xin duyệt: ${cham} chạm (≤ 2)`);
  kb["POST xin-duyet"] = { status: 409, body: { error: "web_cam", message: "Trang này luôn bị chặn để an toàn cho con" } };
  await di("/tre/xin-phep?loai=mo_web&gia=xxx.com");
  await doi("Xin mở trang web");
  await bam("Xin Ba Mẹ mở xxx.com");
  await xet(await doi("Trang này luôn bị chặn"), "web cấm ⇒ báo luôn chặn");
});

await kichBan("Đổi quà bằng sao → Đã gửi Ba Mẹ → quà chờ trao / đã trao (không phiếu AiiCafe)", async () => {
  await di("/tre/cua-hang");
  await doi("Đổi sao lấy giờ chơi hoặc quà");
  await xet(await doi("Còn thiếu 280 sao"), "món chưa đủ sao nói rõ còn thiếu");
  await xet(!(await chu()).includes("AiiCafe"), "không còn phiếu AiiCafe");
  await bam("Đi ăn kem");
  await xet(await doi("Đổi 50 sao"), "màn xác nhận đổi");
  await bam("Đổi 50 sao");
  await xet(coGoi("doi/q1"), "gọi máy chủ đổi");
  await xet(await doi("Đã gửi Ba Mẹ!"), "báo đã gửi Ba Mẹ");
  await bam("Xem quà của Ngọc Bảo Anh");
  await xet(await doi("Chờ trao"), "quà chờ trao");
  await xet(await doi("Đã trao"), "quà đã trao");
});

await kichBan("Được duyệt ⇒ Nhà mở màn ăn mừng một lần, Con gửi lại biểu cảm", async () => {
  await di("/tre/nha", { daXem: [] });
  await xet(await doi("+10 sao!", 9000), "màn ăn mừng");
  await xet(await doi("Ba Mẹ nhắn: “Giỏi lắm!”"), "kèm lời khen");
  await bam("💪");
  await bam("Cảm ơn Ba Mẹ ♥");
  await xet(coGoi("loi-khen/k1/phan-hoi", (b) => b.phanHoi === "💪"), "gửi biểu cảm cho Ba Mẹ");
  await xet(await doi("Giờ chơi còn 18 phút"), "về Nhà");
  await sleep(1500);
  await xet(!(await chu()).includes("+10 sao!"), "không mở lại màn ăn mừng lần hai");
});

await kichBan("Mất mạng ở Nhà ⇒ vẫn thấy sao + băng mất mạng; mở lần đầu mất mạng ⇒ Rob chờ, có mạng tự tải", async () => {
  await di("/tre/nha");
  await doi("Giờ chơi còn 18 phút");
  matMang = true;
  await bam("Nhiệm vụ");
  await sleep(800);
  await bam("Nhà");
  await xet(await doi("giờ chơi vẫn tính trên máy"), "sao đã có vẫn hiện khi mất mạng");
  matMang = true;
  await di("/tre/nha");
  await xet(await doi("Đang chờ mạng"), "lần đầu mất mạng ⇒ Rob chờ mạng, không màn trắng");
  matMang = false;
  await xet(await doi("Giờ chơi còn 18 phút", 9000), "có mạng lại tự tải (≤ 5 giây)");
});

await kichBan("Hết phiên Con (401) ⇒ về chọn tên", async () => {
  kb["GET nha"] = { status: 401, body: { error: "chua_dang_nhap", message: "Chọn tên để vào nhé" } };
  await di("/tre/nha");
  await xet(await doi("Ai đang dùng máy?", 9000), "về màn chọn tên");
});

ws.close();
chrome.kill();
may.close();
await sleep(500);
try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
console.log(`\n${kq.filter((x) => x[0]).length}/${kq.length} đạt`);
process.exit(sai ? 1 : 0);
