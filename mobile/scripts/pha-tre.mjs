// «Cố tình phá» + cổng giao diện cho MÀN CON (AiiGrow Kid, /tre/…) — chép khung scripts/pha.mjs: bản WEB EXPORT trong một Chrome headless
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
const nha = (o = {}) => ({ soDu: 45, diemChoDuyet: 0, tongKiem: 840, capDo, chuoiNgay: 6, mucTieu: { id: "q1", ten: "Phiếu quà AiiCafe 50.000đ", diem: 500, conThieu: 455 },
  nhiemVuMo: 5, canBoSung: [], phutChoi: 45, tranNgay: 90, conPhut: 45, khung: { dang: true, den: "20:00", moLai: null, moMai: false }, gioNgu: false,
  nghiDen: null, phien: null, phienToiDa: 30, nghiGiua: 60, ...o });
const nv = (id, ten, nhom, diem, o = {}) => ({ id, ten, mo_ta: "", nhom, diem, bang_chung: "anh", kieu: "thuong", toi_da_ngay: null, toi_da_tuan: null,
  phut_toi_thieu: 0, trang_thai_con: "san_sang", luot_dang: null, hom_nay: 0, dang_cho: 0, ...o });
const DS_NV = [nv("t0", "Rửa chén sau bữa ăn", "viec_nha", 10, { toi_da_ngay: 3, hom_nay: 2 }), nv("t1", "Đọc sách 50 trang", "doc_sach", 10, { phut_toi_thieu: 20 }),
  nv("t2", "Học 1 bài tiếng Anh cùng chị", "hoc_tap", 20, { dang_cho: 1 }), nv("t3", "Lau sàn nhà", "viec_nha", 10, { toi_da_ngay: 1, hom_nay: 1, trang_thai_con: "du_hom_nay" })];
const yc = (id, loai, o = {}) => ({ id, child_id: "c1", loai, phut: null, gia_tri: null, ly_do: "Để làm bài tập", trang_thai: "cho", created_at: luc(25), xu_ly_luc: null,
  ly_do_tu_choi: null, het_han: luc(-1400), ...o });
const coBan = {
  "GET toi": toi(), "GET nha": nha(), "POST chao": { diemChaoMung: 10 }, "POST dang-xuat": { ok: true },
  "POST ho-so": { con: [{ id: "c1", ten: KEN, avatar: "rob" }, { id: "c2", ten: BILL, avatar: "rob" }] }, "POST pin": { phienCon: "tok-con" },
  "POST ghep": { deviceId: "d1", token: "tok-may", dungChung: true },
  "GET nhiem-vu": { ds: DS_NV }, "POST nhiem-vu/t0/bat-dau": { luot: "l9" }, "POST luot/l9/nop": { trang_thai: "cho_duyet", nghi_trung: false },
  "POST luot/l2/nop": { trang_thai: "cho_duyet", nghi_trung: false },
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
  "GET cua-hang": { soDu: 520, qua: [
    { id: "q1", ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50000, chi_cuoi_tuan: false, toi_da_thang: null, du: true, conThieu: 0 },
    { id: "q2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, menh_gia: null, chi_cuoi_tuan: true, toi_da_thang: null, du: true, conThieu: 0 },
    { id: "q3", ten: "Bộ Lego xếp hình thành phố", loai: "qua", diem: 800, menh_gia: null, chi_cuoi_tuan: false, toi_da_thang: null, du: false, conThieu: 280 }] },
  "POST doi/q1": { phieu: "r1", trang_thai: "da_phat_hanh", voucher: { ma: "AGK7Q2M91XZ", het_han: luc(-86400) }, quyConLai: 100000 },
  "GET vi-qua": { voucher: [{ ma: "AGK7Q2M91XZ", menh_gia: 50000, trang_thai: "da_phat_hanh", het_han: luc(-60 * 1440), dung_luc: null },
    { ma: "AG2B8C4D6EF", menh_gia: 20000, trang_thai: "da_dung", het_han: luc(-30 * 1440), dung_luc: luc(16 * 1440) }],
    phieu: [{ id: "r2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, trang_thai: "giu", created_at: luc(9 * 1440) }] },
  "GET quy-tac": { lich: { ngayThuong: [{ tu: "17:00", den: "20:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" } },
    tranNgay: 90, tranTuan: 420, phienToiDa: 30, nghiGiua: 60, giaPhut: { game: 1, video_ngan: 2, mxh: 2, phim_gd: 0.5 },
    nhiemVu: DS_NV.map((x) => ({ ten: x.ten, diem: x.diem })), qua: [{ ten: "Phiếu quà AiiCafe 50.000đ", diem: 500 }, { ten: "Đi xem phim cuối tuần", diem: 300 }] },
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
  await goi("Page.navigate", { url: `${GOC}/tre/pin` });
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
  const dsMan = [
    M("con-pin", "/tre/pin", "Ai đang dùng máy?", { con: null }),
    M("con-pin (PIN sai)", "/tre/pin", "PIN chưa đúng", { con: null, kb: { "POST pin": { status: 401, body: { error: "pin_sai", message: "Mã PIN chưa đúng" } } },
      sau: async () => { await bam(KEN); await go("PIN của Con", "1111"); } }),
    M("con-pin (ghép máy)", "/tre/pin", "Ghép máy với AiiGrow", { con: null, mayTok: null }),
    M("con-chao", "/tre/chao", "Nhận 10 điểm"),
    M("con-trang", "/tre/nha", `${KEN} có 45 điểm`),
    M("con-trang (teen)", "/tre/nha", "Giải trí hôm nay", { kb: teen }),
    M("con-trang (mất mạng)", "/tre/nha", "Đang chờ mạng", { matMang: true }),
    M("con-nhiem-vu", "/tre/nhiem-vu", "Hôm nay làm gì nào?"),
    M("con-nhiem-vu (trống)", "/tre/nhiem-vu", "Chưa có nhiệm vụ nào", { kb: { "GET nhiem-vu": { ds: [] } } }),
    M("con-nv-chi-tiet", "/tre/nv/t0", "Hôm nay đã làm 2/3 lần"),
    M("con-nv-dang", "/tre/dang/l9?nv=t1", "đang đọc sách"),
    M("con-chup", "/tre/chup/l9?nv=t0", "Rob giữ ảnh này cho Ba Mẹ xem"),
    M("con-cho-duyet", "/tre/cho-duyet?diem=10", "Đã gửi cho Ba Mẹ rồi!"),
    M("con-cho-duyet (mất mạng)", "/tre/cho-duyet?diem=10&xep=1", "hàng chờ trên máy"),
    M("con-duoc-duyet", "/tre/duoc-duyet/l1", "+10 điểm!"),
    M("con-chup-lai", "/tre/chup-lai/l2?nv=t0", "không mất điểm nào"),
    M("con-bat-dau-choi", "/tre/choi", "Chơi Roblox?"),
    M("con-phien", "/tre/phien/p1?muc=roblox.exe", "Còn 5 phút nữa nhé!"),
    M("con-het-phien", `/tre/het-phien?nghiDen=${encodeURIComponent(luc(-60))}`, "Nghỉ 60 phút nhé!"),
    M("con-gio-ngu", "/tre/gio-ngu?ly=dat_tran_ngay", "Hết giờ chơi hôm nay rồi"),
    M("con-chan-web", "/tre/chan-web?url=scratch.mit.edu", "Trang này Rob chưa biết"),
    M("con-chan-web (teen)", "/tre/chan-web?url=scratch.mit.edu", "Quy tắc: trang web mới", { kb: teen }),
    M("con-xin-phep", "/tre/xin-phep?loai=mo_web&gia=scratch.mit.edu&tu=chan-web", "Xin mở trang web"),
    M("con-xin-phep (thêm giờ)", "/tre/xin-phep", "Thêm bao lâu?"),
    M("con-xin-phep (đủ 3)", "/tre/xin-phep", "đã có 3 yêu cầu đang chờ", { kb: { "GET yeu-cau": { ds: [yc("a", "them_gio", { phut: 15 }), yc("b", "them_gio", { phut: 30 }), yc("c", "mo_web", { gia_tri: "abc.vn" })], lyDoNhanh: [] } } }),
    M("con-yeu-cau", "/tre/yeu-cau", "Ba Mẹ đồng ý rồi!"),
    M("con-yeu-cau (trống)", "/tre/yeu-cau", "chưa xin gì cả", { kb: { "GET yeu-cau": { ds: [], lyDoNhanh: [] } } }),
    M("con-gio-may", "/tre/gio-may?lech=61", "Đồng hồ máy lệch 61 phút", { kb: teen }),
    M("con-cua-hang", "/tre/cua-hang", "đổi gì nào?"),
    M("con-cua-hang (trống)", "/tre/cua-hang", "Cửa hàng đang trống", { kb: { "GET cua-hang": { soDu: 45, qua: [] }, "GET tro-choi": { ds: [] } } }),
    M("con-doi-voucher", "/tre/doi/q1", "Đổi 500 điểm"),
    M("con-vi-qua", "/tre/vi-qua", "Dùng trước"),
    M("con-vi-qua (trống)", "/tre/vi-qua", "Ví quà còn trống", { kb: { "GET vi-qua": { voucher: [], phieu: [] } } }),
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

await kichBan("Chọn hồ sơ + PIN → vào Nhà (máy dùng chung)", async () => {
  await di("/tre/pin", { con: null });
  await xet(await doi("Ai đang dùng máy?"), "màn chọn hồ sơ");
  await xet(await doi(BILL), "hiện mọi hồ sơ trên máy");
  await bam(KEN);
  await go("PIN của Con", "1234");
  await xet(await doi(`${KEN} có 45 điểm`, 9000), "gõ đủ 4 số ⇒ tự vào Nhà");
  await xet(coGoi("pin", (b) => b.con === "c1" && b.pin === "1234"), "gửi đúng hồ sơ + PIN");
  await xet(await doi("Còn 455 điểm nữa là đổi được Phiếu quà AiiCafe 50.000đ!"), "thanh «còn thiếu X điểm để đổi Y»");
});

await kichBan("Agent Windows mở khung Kid với ?phien= ⇒ vào thẳng Nhà, phiên xoá khỏi URL", async () => {
  await di("/tre?phien=tok-q", { con: null });
  await xet(await doi(`${KEN} có 45 điểm`, 9000), "vào thẳng Nhà, không hỏi PIN");
  await xet((await js("localStorage.getItem(\"aiig_con\")")) === "tok-q", "giữ phiên Con từ query");
  await xet(!(await js("location.href")).includes("phien="), "phiên không còn trên URL");
});

await kichBan("PIN sai ⇒ báo rõ, nhập lại", async () => {
  kb["POST pin"] = { status: 401, body: { error: "pin_sai", message: "Mã PIN chưa đúng" } };
  await di("/tre/pin", { con: null });
  await doi("Ai đang dùng máy?");
  await bam(KEN);
  await go("PIN của Con", "9999");
  await xet(await doi("PIN chưa đúng", 9000), "cảnh PIN chưa đúng");
  await xet(await doi("Quên PIN thì nhờ Ba Mẹ đặt lại"), "nói cách khắc phục");
  await bam("Nhập lại");
  await xet(await doi("Ai đang dùng máy?"), "Nhập lại ⇒ về chọn hồ sơ");
});

await kichBan("Nhận nhiệm vụ → chụp bằng chứng (web: camera trình duyệt) → chờ duyệt, nộp ≤ 3 chạm", async () => {
  await di("/tre/nhiem-vu");
  await doi("Hôm nay làm gì nào?");
  await bam("Rửa chén sau bữa ăn");
  await xet(await doi("Hôm nay đã làm 2/3 lần"), "chi tiết nhiệm vụ");
  cham = 0;
  await bam("Bắt đầu");
  await xet(coGoi("nhiem-vu/t0/bat-dau"), "Bắt đầu ⇒ máy chủ mở lượt");
  await xet(await doi("Xong thì quay lại bấm nút xanh nhé!"), "đồng hồ nhiệm vụ");
  const tu = cham;
  await bam("Xong, chụp ảnh");
  await xet(await doi("Rob giữ ảnh này cho Ba Mẹ xem"), "camera mở ngay trong app");
  await xet(await chupAnh(), "bấm chụp ⇒ mở camera / chọn ảnh của trình duyệt");
  await xet(await doi("Đã gửi cho Ba Mẹ rồi!", 9000), "gửi xong ⇒ chờ Ba Mẹ duyệt");
  await xet(coGoi("luot/l9/nop", (b) => b.anh?.[0]?.mime === "image/jpeg" && b.anh[0].base64.length > 10), "ảnh JPEG đã nén gửi kèm lượt");
  await xet(cham <= 3, `nộp từ lúc bắt đầu: ${cham} chạm (≤ 3)`);
  await xet(cham - tu <= 2, `sau khi làm xong: ${cham - tu} chạm`);
});

await kichBan("Mất mạng lúc nộp ⇒ ảnh vào hàng chờ trên máy, có mạng lại tự gửi", async () => {
  await di("/tre/chup/l9?nv=t0");
  await doi("Rob giữ ảnh này cho Ba Mẹ xem");
  await sleep(800);
  matMang = true;
  await chupAnh();
  await xet(await doi("hàng chờ trên máy", 9000), "báo ảnh nằm trong hàng chờ, không cần chụp lại");
  matMang = false;
  let gui = false;
  for (let t = 0; t < 30 && !gui; t++) { await sleep(500); gui = coGoi("luot/l9/nop"); }
  await xet(gui, "có mạng lại ⇒ tự gửi ảnh cho Ba Mẹ");
  await sleep(1200);
  await xet(!(await chu()).includes("hàng chờ trên máy"), "gửi xong ⇒ hết băng mất mạng");
});

await kichBan("Dùng điểm để chơi → đang chơi (còn 5 phút) → dừng sớm ⇒ nghỉ giữa phiên", async () => {
  await di("/tre/nha");
  await doi(`${KEN} có 45 điểm`);
  await xet(await doi("45 phút còn lại hôm nay · tới 20:00"), "Nhà nói rõ phút chơi còn lại");
  await bam("Chơi trò chơi");
  await xet(await doi("Chơi Roblox?"), "hỏi trước khi trừ điểm");
  await xet(await doi("Chơi tối đa 30 phút"), "nói rõ phút tối đa + giá");
  await bam("Bắt đầu chơi");
  await xet(coGoi("phien/mo", (b) => b.muc === "roblox.exe"), "mở phiên đúng trò chơi");
  await xet(await doi("Còn 5 phút nữa nhé!"), "băng báo còn 5 phút");
  await xet(coGoi("phien/nhip", (b) => b.id === "p1"), "gửi nhịp đang dùng");
  await xet(await doi("Dừng bây giờ thì giữ được 5 điểm"), "nói rõ dừng sớm giữ bao nhiêu điểm");
  await bam("Dừng");
  await xet(coGoi("phien/dung", (b) => b.id === "p1"), "dừng sớm gọi máy chủ");
  await xet(await doi("Nghỉ 60 phút nhé!"), "hết phiên ⇒ nghỉ giữa phiên");
});

await kichBan("Hết thời gian ⇒ máy chủ kết thúc phiên ⇒ tự sang màn nghỉ", async () => {
  kb["POST phien/nhip"] = { trangThai: "ket_thuc", phutDung: 30, conPhut: 0, diemTru: 30, soDu: 15, canhBao: null, lyDoKet: "het_thoi_gian", nghiDen: luc(-60), muc: "roblox.exe", toiDaPhut: 30, giaPhanNghin: 1000 };
  await di("/tre/phien/p1?muc=roblox.exe");
  await xet(await doi("Nghỉ 60 phút nhé!"), "hết giờ ⇒ màn nghỉ");
  await xet(await doi("Trò chơi mở lại lúc"), "nói giờ mở lại");
});

await kichBan("Xin phép thêm giờ từ màn nghỉ → Ba Mẹ thấy trong Chờ duyệt", async () => {
  await di(`/tre/het-phien?nghiDen=${encodeURIComponent(luc(-60))}`);
  await doi("Nghỉ 60 phút nhé!");
  await bam("Xin thêm giờ");
  await xet(await doi("Xin thêm giờ chơi"), "mở form thêm giờ");
  await bam("30 phút");
  await bam("Bạn rủ chơi");
  await bam("Gửi cho Ba Mẹ");
  await xet(coGoi("yeu-cau", (b) => b.loai === "them_gio" && b.phut === 30 && b.lyDo === "Bạn rủ chơi"), "gửi đúng: thêm 30 phút + lý do");
  await xet(await doi("Thêm 15 phút chơi"), "sang danh sách yêu cầu kèm trạng thái");
  await xet(await doi("Cuối tuần nói chuyện nhé"), "thấy lời Ba Mẹ khi chưa được");
});

await kichBan("Màn chặn web ⇒ xin phép ≤ 2 chạm (link điền sẵn)", async () => {
  await di("/tre/chan-web?url=scratch.mit.edu");
  await doi("Trang này Rob chưa biết");
  cham = 0;
  await bam("Xin phép Ba Mẹ");
  await xet(await doi("Xin mở trang web"), "form đã điền sẵn");
  await bam("Gửi cho Ba Mẹ");
  await xet(coGoi("yeu-cau", (b) => b.loai === "mo_web" && b.giaTri === "scratch.mit.edu" && b.lyDo), "gửi mở web kèm lý do mặc định");
  await xet(cham <= 2, `xin phép: ${cham} chạm (≤ 2)`);
});

await kichBan("Đổi phiếu quà → ví quà có mã QR", async () => {
  await di("/tre/cua-hang");
  await doi("đổi gì nào?");
  await xet(await doi("Còn thiếu 280"), "món chưa đủ điểm nói rõ còn thiếu");
  await bam("Phiếu quà AiiCafe 50.000đ");
  await xet(await doi("Đổi 500 điểm"), "màn xác nhận đổi");
  await xet(await doi("20 điểm"), "nói rõ điểm còn lại");
  await bam("Đổi 500 điểm");
  await xet(coGoi("doi/q1"), "gọi máy chủ đổi");
  await xet(await doi("Dùng trước"), "sang ví quà");
  await xet(await js(`!!document.querySelector('[aria-label="Mã QR AGK7Q2M91XZ"] svg')`), "phiếu quà có mã QR thật");
});

await kichBan("Quỹ phiếu quà của nhà thiếu ⇒ điểm giữ nguyên, nói rõ", async () => {
  kb["POST doi/q1"] = { status: 409, body: { error: "quy_thieu", message: "Quỹ phiếu quà của nhà mình chưa đủ — nhờ Ba Mẹ nạp thêm nhé" } };
  await di("/tre/doi/q1");
  await doi("Đổi 500 điểm");
  await bam("Đổi 500 điểm");
  await xet(await doi("Đợi Ba Mẹ nạp quỹ nhé"), "cảnh quỹ thiếu");
});

await kichBan("Được duyệt ⇒ Nhà mở màn ăn mừng một lần, Con gửi lại biểu cảm", async () => {
  await di("/tre/nha", { daXem: [] });
  await xet(await doi("+10 điểm!", 9000), "màn ăn mừng");
  await xet(await doi("Ba Mẹ nhắn: “Giỏi lắm!”"), "kèm lời khen");
  await bam("💪");
  await bam("Cảm ơn Ba Mẹ ♥");
  await xet(coGoi("loi-khen/k1/phan-hoi", (b) => b.phanHoi === "💪"), "gửi biểu cảm cho Ba Mẹ");
  await xet(await doi(`${KEN} có 45 điểm`), "về Nhà");
  await sleep(1500);
  await xet(!(await chu()).includes("+10 điểm!"), "không mở lại màn ăn mừng lần hai");
});

await kichBan("Mất mạng ở Nhà ⇒ vẫn thấy điểm đã có + băng mất mạng; mở lần đầu mất mạng ⇒ Rob chờ, có mạng tự tải", async () => {
  await di("/tre/nha");
  await doi(`${KEN} có 45 điểm`);
  matMang = true;
  await bam("Nhiệm vụ");
  await sleep(800);
  await bam("Nhà");
  await xet(await doi("vẫn chơi được bằng 45 điểm đã có"), "điểm đã có vẫn hiện khi mất mạng");
  matMang = true;
  await di("/tre/nha");
  await xet(await doi("Đang chờ mạng"), "lần đầu mất mạng ⇒ Rob chờ mạng, không màn trắng");
  matMang = false;
  await xet(await doi(`${KEN} có 45 điểm`, 9000), "có mạng lại tự tải (≤ 5 giây)");
});

await kichBan("Hết phiên PIN (401) ⇒ về chọn hồ sơ", async () => {
  kb["GET nha"] = { status: 401, body: { error: "chua_dang_nhap", message: "Nhập mã PIN để vào nhé" } };
  await di("/tre/nha");
  await xet(await doi("Ai đang dùng máy?", 9000), "về màn chọn hồ sơ");
});

ws.close();
chrome.kill();
may.close();
await sleep(500);
try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
console.log(`\n${kq.filter((x) => x[0]).length}/${kq.length} đạt`);
process.exit(sai ? 1 : 0);
