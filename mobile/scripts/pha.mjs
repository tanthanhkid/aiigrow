// «Cố tình phá» + cổng giao diện cho app AiiGrow (chép khung từ AiiControl mobile/scripts/pha.mjs): chạy bản WEB EXPORT trong một Chrome
// headless RIÊNG (hồ sơ tạm — không đụng trình duyệt của ai), chặn MỌI lời gọi /api bằng CDP Fetch và trả dữ liệu giả. Không gọi máy chủ thật.
// Điều hướng bằng CDP Page.navigate tới máy chủ tĩnh cục bộ (không dùng --screenshot: chính sách Chrome máy công ty đè trang chủ).
//
//   (đổi cổng khi chạy song song: PHA_CONG=8192 PHA_CDP=9500, và EXPO_PUBLIC_API cùng cổng)
//   EXPO_PUBLIC_API=http://localhost:8191 npx expo export --platform web --output-dir <thư mục>
//   node scripts/pha.mjs <thư mục>                 # kịch bản luồng chính
//   node scripts/pha.mjs <thư mục> --giao-dien     # cổng chuẩn giao diện (scripts/giao-dien.mjs) trên mọi màn Ba Mẹ
// GD_CHUP=<thư mục> [GD_CHUP_TAT_CA=1]: chụp màn (có lỗi / mọi màn). Mã thoát 1 nếu có SAI / còn lỗi giao diện.
import http from "node:http";
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { deflateSync, crc32 } from "node:zlib";

const DIR = process.argv[2] ?? "dist";
const CHROME = process.argv.slice(3).find((x) => !x.startsWith("--")) ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CONG = Number(process.env.PHA_CONG ?? 8191), CDP = Number(process.env.PHA_CDP ?? 9499), GOC = `http://localhost:${CONG}`;
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
/** Ảnh bằng chứng giả cỡ thật (640×480, giống ảnh chụp bồn rửa: tường gạch, bồn sáng, nhiễu máy ảnh) — để cổng giao diện đo bố cục
 * với ảnh thật thay cho ảnh 1px. Tự sinh PNG bằng zlib, không cần tệp ảnh. */
const anhGia = (w = 640, h = 480) => {
  const raw = Buffer.alloc((w * 3 + 1) * h); let n = 12345; const rnd = () => ((n = (n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const gach = y < h * 0.45 && ((y % 40) < 2 || ((x + (Math.floor(y / 40) % 2) * 30) % 60) < 2);
      const dx = (x - w / 2) / (w * 0.42), dy = (y - h * 0.68) / (h * 0.26), bon = dx * dx + dy * dy < 1;
      let c = y < h * 0.45 ? (gach ? [170, 176, 178] : [214, 222, 224]) : [150, 132, 112];
      if (bon) { const k = 1 - 0.25 * (dx * dx + dy * dy); c = [236 * k + 10, 240 * k + 8, 242 * k + 6]; }
      const nhieu = (rnd() - 0.5) * 18, o = y * (w * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.max(0, Math.min(255, Math.round(c[i] + nhieu)));
    }
  }
  const khoi = (loai, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const t = Buffer.from(loai); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, d])) >>> 0); return Buffer.concat([l, t, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), khoi("IHDR", ih), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]).toString("base64");
};
const PNG = anhGia();
const THAM = { tran_ngay: 90, tran_tuan: 420, phien_toi_da: 30, nghi_giua: 60, gia_khac: 1000 };
const LICH = { ngayThuong: [{ tu: "17:00", den: "20:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:30", den: "06:30" } };
const capDo = { cap: 4, diemCapSau: 1000, conThieu: 155 };
const conNgan = (id, ten, o = {}) => ({ id, ten, avatar: "rob", nhom: "nhi", soDu: 145, diemChoDuyet: 30, tongKiem: 845, capDo, phutChoi: 45, tranNgay: 90,
  nhiemVuCho: 3, yeuCauCho: 1, nhiemVuXong: 3, homNayConDa: ["Đọc xong 1 cuốn sách", "Rửa chén 2 lần", "Học AiiRob đạt 92%"], ...o });
const mayCon = (id, ten, o = {}) => ({ id, ten, nen: "windows", dungChung: false, baoVe: "day_du", lanCuoi: luc(1), truc: true, lechGiay: null, ...o });
const conCt = (id, ten) => ({ id, ten, namSinh: 2017, avatar: "rob", nhom: "nhi", khoaNgay: false, lich: LICH, thamSo: THAM, soDu: 145, diemChoDuyet: 30, tongKiem: 845, capDo,
  may: [mayCon("m1", `Laptop của ${ten} · Windows 11`), mayCon("m2", `iPad của ${ten}`, { nen: "ios", baoVe: "mot_phan", truc: false, lanCuoi: luc(1560) })] });
const KEN = "Nguyễn Ngọc Bảo Anh", BILL = "Bill";
const luot = (id, ten, o = {}) => ({ id, child_id: "c1", ten_con: KEN, ten, nhom: "viec_nha", diem: 10, nop_luc: luc(12), ghi_chu: null, nghi_trung: false, so_anh: 1, ...o });
const yc = (id, loai, o = {}) => ({ id, child_id: "c2", ten_con: BILL, loai, phut: 15, gia_tri: null, ly_do: "Con đang xây dở nhà", created_at: luc(3), het_han: luc(-1400), trang_thai: "cho", ...o });
const coBan = {
  "GET toi": { baMe: { id: "p1", ten: "Mẹ Lan", dinhDanh: "0912345678", vai: "chu" } },
  "GET gia-dinh": { ten: "Nhà Mẹ Lan", quyVoucher: 150000, choDuyet: 4, canhBao: 1, con: [conNgan("c1", KEN), conNgan("c2", BILL, { nhom: "teen", nhiemVuCho: 0 })] },
  "GET canh-bao": { ds: [{ id: "a1", child_id: "c2", loai: "lech_gio", muc: "chu_y", noi_dung: "Có dấu hiệu đổi giờ hệ thống trên Laptop-BILL của Bill", chi_tiet: { lechGiay: -3660 }, da_doc: false, created_at: luc(20) },
    { id: "a2", child_id: "c2", loai: "ngoai_le_manh", muc: "chu_y", noi_dung: "Tuần này Bill đã được 6 ngoại lệ. Gợi ý: tăng điểm nhiệm vụ hoặc giảm giá phần thưởng.", chi_tiet: {}, da_doc: false, created_at: luc(60) }] },
  "GET cho-duyet": { nhiemVu: [luot("l1", "Rửa chén sau bữa tối"), luot("l2", "Đọc sách “Dế Mèn phiêu lưu ký” 50 trang", { nhom: "doc_sach", so_anh: 2, nop_luc: luc(35) }),
    luot("l3", "Tập thể dục 30 phút", { nhom: "van_dong", nghi_trung: true, nop_luc: luc(60) })], yeuCau: [yc("y2", "them_gio")] },
  "GET con/c1": conCt("c1", KEN), "GET con/c2": conCt("c2", BILL),
  "GET con/c1/vi": { soDu: 155, diemChoDuyet: 30, tongKiem: 845, capDo, lichSu: [
    { delta: 10, loai: "nhiem_vu", ly_do: "Nhiệm vụ Rửa chén sau bữa tối", nguoi: "p1", created_at: luc(1) }, { delta: 20, loai: "nhiem_vu", ly_do: "Nhiệm vụ Học 1 bài với AiiRob", nguoi: null, created_at: luc(80) },
    { delta: -25, loai: "phien", ly_do: "Chơi roblox.exe", nguoi: null, created_at: luc(150) }, { delta: 15, loai: "tay", ly_do: "Thưởng sinh nhật bạn", nguoi: "p2", created_at: luc(900) }] },
  "GET con/c1/thanh-tich": { chuoiNgay: 6 },
  "GET con/c1/bao-cao": { ten: KEN, chuGiai: [`Tuần này ${KEN} đọc sách nhiều hơn tuần trước 2 lần`, "Giờ chơi giảm 20 phút so với tuần trước"],
    tuanNay: { giaiTriTheoNgay: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"].map((ngay, i) => ({ ngay, phut: [25, 30, 45, 20, 35, 50, 45][i] })),
      tongGiaiTri: 250, phutHoc: 380, diemKiemTheoNhom: [{ nhom: "doc_sach", diem: 40, n: 4 }], duyet: { duoc: 12, tu_choi: 1 }, ngoaiLe: 2,
      top: [{ muc: "roblox.exe", phut: 185 }, { muc: "youtube.com", phut: 65 }] },
    tuanTruoc: { giaiTriTheoNgay: [], tongGiaiTri: 270, phutHoc: 300, diemKiemTheoNhom: [], duyet: { duoc: 9, tu_choi: 2 }, ngoaiLe: 4, top: [{ muc: "roblox.exe", phut: 210 }] } },
  "GET luot/l1": { id: "l1", child_id: "c1", ten_con: KEN, ten: "Rửa chén sau bữa tối", nhom: "viec_nha", diem_md: 10, trang_thai: "cho_duyet", nop_luc: luc(12),
    ghi_chu: null, nghi_trung: false, lamPhut: 14, lanHomNay: 2, toi_da_ngay: 3 },
  "GET luot/l1/anh": { anh: [{ id: "e1", mime: "image/png", base64: PNG, chupLuc: luc(13) }] },
  "POST luot/l1/duyet": { con: "c1", diem: 10, soDu: 155 }, "POST luot/l1/hoan-tac": { ok: true }, "POST luot/l1/tu-choi": { ok: true },
  "GET yeu-cau/y1": { ...yc("y1", "mo_web", { child_id: "c1", ten_con: KEN, phut: null, gia_tri: "scratch.mit.edu", ly_do: "Để làm bài tập" }), soDu: 155, giaPhut: 1,
    xemTruoc: { mucCanhBao: "khong", soTuan: 1, cau: null }, ngoaiLeTheoNguoi: [] },
  "GET yeu-cau/y2": { ...yc("y2", "them_gio"), soDu: 32, giaPhut: 1, xemTruoc: { mucCanhBao: "mem", soTuan: 4, cau: "Tuần này Ba Mẹ đã cho ngoại lệ 4 lần — Bill có thể mất động lực tích điểm." },
    ngoaiLeTheoNguoi: [{ ten: "Mẹ Lan", n: 2 }, { ten: "Ba Huy", n: 1 }] },
  "POST yeu-cau/y2/dong-y": { ngoaiLe: true }, "POST yeu-cau/y1/dong-y": { ngoaiLe: false },
  "GET nhiem-vu": { ds: [["Đọc sách 50 trang", "doc_sach", 10, "anh", 1], ["Rửa chén sau bữa ăn", "viec_nha", 10, "anh", 3], ["Lau sàn nhà", "viec_nha", 10, "anh", 1],
    ["Học 1 bài với AiiRob", "hoc_tap", 20, "tu_dong", null], ["Tập thể dục 30 phút", "van_dong", 10, "anh", 1]].map(([ten, nhom, diem, bang_chung, toi_da_ngay], i) =>
    ({ id: `t${i}`, ten, mo_ta: "", nhom, diem, bang_chung, kieu: "thuong", toi_da_ngay, toi_da_tuan: null, phut_toi_thieu: 0, tu_duyet: bang_chung === "tu_dong", giao_cho: null, han: null, bat: true })) },
  "GET qua": { ds: [{ id: "q1", ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50000, ton_kho: null, toi_da_thang: null, chi_cuoi_tuan: false, bat: true },
    { id: "q2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, menh_gia: null, ton_kho: null, toi_da_thang: null, chi_cuoi_tuan: true, bat: true },
    { id: "q3", ten: "Chọn thực đơn bữa tối", loai: "dac_quyen", diem: 50, menh_gia: null, ton_kho: null, toi_da_thang: 2, chi_cuoi_tuan: false, bat: true }] },
  "GET quy": { soDu: 30000, giaoDich: [{ so_tien: 200000, loai: "nap", ghi_chu: "Tiền mặt", created_at: luc(4000) }, { so_tien: -50000, loai: "phat_hanh", ghi_chu: "Phiếu quà 50k", created_at: luc(300) }] },
  "GET luat": { ds: [{ child_id: "", muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" }, { child_id: "", muc: "khanacademy.org", ten: "Khan", loai: "hoc", nhom: "khac" }],
    heThong: ["winword.exe"], chuaXep: [{ muc: "tiktok.com", phut: 12 }, { muc: "capcut.exe", phut: 4 }, { muc: "minecraft.launcher.exe", phut: 30 }] },
  "GET thanh-vien": { ds: [{ id: "p1", ten: "Mẹ Lan", vai: "chu" }, { id: "p2", ten: "Ba Huy", vai: "duyet" }, { id: "p3", ten: "Bà nội", vai: "xem" }] },
  "GET ho-tro": { tin: [{ id: "h1", tu: "aiilab", noi_dung: "Chào chị Lan, AiiLab đây. Chị cần giúp gì về AiiGrow ạ?", created_at: luc(10) },
    { id: "h2", tu: "ba_me", noi_dung: "Quỹ phiếu quà của em chuyển khoản rồi mà chưa thấy cộng.", created_at: luc(8) },
    { id: "h3", tu: "aiilab", noi_dung: "AiiLab thấy khoản 200.000đ rồi ạ, đã cộng vào quỹ. Con đổi phiếu quà được ngay.", created_at: luc(5) }] },
  "POST otp": { guiDen: "0912345678", ma: "482017" }, "POST dang-ky": { token: "tok-moi", moi: true }, "POST dang-nhap": { token: "tok-thu" },
  "POST ma-ghep": { ma: "482917" }, "POST con": { id: "c1" }, "POST nhiem-vu/mau": { taoMoi: 8 }, "POST qua/mau": { taoMoi: 6 },
  "POST con/c1/lich": { lich: LICH }, "POST con/c1/cau-hinh": { ok: true }, "POST con/c1/khoa": { ok: true }, "POST dang-xuat": { ok: true },
};
let kb = { ...coBan };          // "METHOD đường" → dữ liệu | { status, body } | "mat_mang"
let matMang = false;
const nhatKy = [];

// ---------------------------------------------------------------- Chrome + CDP
const hoSo = mkdtempSync(join(tmpdir(), "aiig-pha-"));
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
ws.onmessage = async (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cho[m.id]) { cho[m.id](m.result ?? m.error); delete cho[m.id]; return; }
  if (m.method !== "Fetch.requestPaused") return;
  const { requestId, request } = m.params;
  const d = new URL(request.url).pathname.replace(/^\/api\/(m|kid)\//, "");
  const khoa = `${request.method} ${d}`;
  let body = null; try { body = request.postData ? JSON.parse(request.postData) : null; } catch { /* không JSON */ }
  nhatKy.push({ m: request.method, d, body });
  if (request.method === "OPTIONS") return goi("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: [] });
  const tl = matMang ? "mat_mang" : kb[khoa];
  if (tl === "mat_mang") return goi("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" });
  const { status, data } = tl === undefined ? { status: 404, data: { error: "khong_co_duong", message: `pha.mjs chưa giả ${khoa}` } }
    : tl && typeof tl === "object" && "status" in tl ? { status: tl.status, data: tl.body } : { status: 200, data: tl };
  if (tl === undefined) console.log("   (chưa giả)", khoa);
  goi("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(data)).toString("base64") });
};
const goi = (method, params = {}) => new Promise((r) => { cho[++so] = r; ws.send(JSON.stringify({ id: so, method, params })); });
await goi("Page.enable");
await goi("Fetch.enable", { patterns: [{ urlPattern: `${GOC}/api/*`, requestStage: "Request" }] });
await goi("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await goi("Emulation.setLocaleOverride", { locale: "vi-VN" });
const js = async (expr) => (await goi("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const chu = () => js("document.body.innerText");
const di = async (duong, token = "tok-thu") => {
  await goi("Page.navigate", { url: `${GOC}/chao` });
  await sleep(300);
  await js(token ? `localStorage.setItem("aiig_bm", ${JSON.stringify(token)})` : `localStorage.clear()`);
  await goi("Page.navigate", { url: `${GOC}${duong}` });
};
const doi = async (txt, ms = 8000) => { for (let t = 0; t < ms; t += 250) { if ((await chu())?.includes(txt)) return true; await sleep(250); } return false; };
/** Bấm vào chữ `txt` bằng chuột thật (CDP Input) — Pressable của react-native-web nghe pointer, không nghe .click(). */
const bam = async (txt) => {
  await sleep(150);
  const r = await js(`(() => { const t = ${JSON.stringify(txt)};
    const el = [...document.querySelectorAll("div,span")].filter((e) => e.innerText?.trim() === t).pop();
    if (!el) return null; el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (!r) return false;
  await sleep(250);                       // chờ cuộn + bố cục ổn định (phông tải xong) rồi mới bấm
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) { await goi("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 }); await sleep(80); }
  await sleep(400);
  return true;
};
/** Gõ vào ô có aria-label `nhan` (setter gốc + sự kiện input — React nhận như người gõ). */
const go = (nhan, gt) => js(`(() => { const i = [...document.querySelectorAll("input,textarea")].find((e) => e.getAttribute("aria-label") === ${JSON.stringify(nhan)});
  if (!i) return false; const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), "value").set; s.call(i, ${JSON.stringify(gt)});
  i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
const dangKyToiOtp = async () => {
  await di("/dang-ky", null);
  await doi("Số điện thoại của Ba Mẹ");
  await go("Số điện thoại hoặc email", "0912345678"); await go("Ba/Mẹ tên gì?", "Mẹ Lan"); await go("Mật khẩu (ít nhất 8 ký tự)", "matkhau123");
  await sleep(200);
  await bam("Gửi mã");
};

// ---------------------------------------------------------------- cổng chuẩn giao diện
if (process.argv.includes("--giao-dien")) {
  const { chayCong } = await import("./giao-dien.mjs");
  const M = (ten, duong, cho, tc = {}) => ({ ten, duong, cho, ...tc });
  const dsMan = [
    M("bm-chao", "/chao", "Bắt đầu bằng số điện thoại", { token: null }),
    M("bm-dang-ky", "/dang-ky", "Số điện thoại của Ba Mẹ", { token: null }),
    M("bm-otp", "/otp", "Nhập mã 6 số", { truoc: dangKyToiOtp }),
    M("dang-nhap", "/dang-nhap", "Chào Ba Mẹ quay lại", { token: null }),
    M("bm-ob-con", "/thiet-lap/ten-con", "Con tên gì?"),
    M("bm-ob-may", "/thiet-lap/may", "dùng máy nào?"),
    M("bm-ob-ghep", "/thiet-lap/ghep", "Tạo mã mới"),
    M("bm-ob-mau", "/thiet-lap/mau", "Dùng mẫu này"),
    M("bm-ob-gio", "/thiet-lap/gio", "Trần giải trí mỗi ngày"),
    M("bm-ob-xong", "/thiet-lap/xong", "Xong rồi!"),
    M("bm-trang", "/hom-nay", "việc chờ Ba Mẹ"),
    M("bm-trang (trống)", "/hom-nay", "Chưa có Con nào", { kb: { "GET gia-dinh": { ten: "Nhà", quyVoucher: 0, choDuyet: 0, canhBao: 0, con: [] } } }),
    M("bm-trang (mất mạng)", "/hom-nay", "Đang chờ mạng", { matMang: true }),
    M("bm-cho-duyet", "/cho-duyet", "4 việc đang chờ"),
    M("bm-cho-duyet (trống)", "/cho-duyet", "Không có việc nào chờ", { kb: { "GET cho-duyet": { nhiemVu: [], yeuCau: [] } } }),
    M("bm-duyet-nv", "/duyet/l1", "Không trùng ảnh cũ"),
    // bảng lý do phủ lên màn duyệt: đo riêng bảng (ảnh nền phía sau bảng đã đo ở bm-duyet-nv; luật DE-ANH không biết ảnh bị bảng che)
    M("bm-tu-choi", "/duyet/l1", "cần làm gì thêm?", { kb: { "GET luot/l1/anh": { anh: [] } }, truoc: async () => { await di("/duyet/l1"); await doi("Cần chụp lại"); await bam("Cần chụp lại"); } }),
    M("bm-duyet-xong", "/duyet-xong?luot=l1&con=c1&ten=Ken&diem=10&nv=R%E1%BB%ADa%20ch%C3%A9n&khen=Gi%E1%BB%8Fi%20l%E1%BA%AFm!", "Hoàn tác"),
    M("bm-yeu-cau-web", "/yeu-cau/y1", "Học tập — miễn phí"),
    M("bm-them-gio", "/yeu-cau/y2", "Ngoại lệ thứ 4"),
    M("bm-giao-nv", "/giao-nv", "Việc cần làm"),
    M("bm-vi", "/vi/c1", "Tuần này kiếm"),
    M("bm-nhiem-vu", "/diem-qua", "Nhiệm vụ của nhà mình"),
    M("bm-qua", "/diem-qua", "Quỹ phiếu quà AiiCafe", { truoc: async () => { await di("/diem-qua"); await doi("Phần thưởng (3)"); await bam("Phần thưởng (3)"); } }),
    M("bm-quy-thieu", "/quy", "Quỹ còn"),
    M("bm-canh-bao", "/canh-bao", "ROB GỢI Ý"),          // NhomTieu in hoa bằng CSS ⇒ innerText in hoa
    M("bm-canh-bao-may", "/canh-bao/a1", "AiiGrow không đọc nội dung"),
    M("bm-bao-cao", "/bao-cao", "GIẢI TRÍ NHIỀU NHẤT"),
    M("bm-gio", "/gio/c1", "Trần mỗi ngày"),
    M("bm-app-web", "/app-web", "LUÔN ĐƯỢC DÙNG"),
    M("bm-ho-so-con", "/ho-so/c1", "Ghép thêm máy"),
    M("bm-tin-khen", "/loi-khen/c1", "Khen"),
    M("bm-cai-dat", "/cai-dat", "Chat với AiiLab"),
    M("bm-ho-tro", "/ho-tro", "đã cộng vào quỹ"),
  ];
  // PHA_MAN=<biểu thức chính quy>: chỉ chạy các màn khớp tên (soát nhanh khi sửa)
  if (process.env.PHA_MAN) dsMan.splice(0, dsMan.length, ...dsMan.filter((m) => new RegExp(process.env.PHA_MAN).test(m.ten)));
  const vao = async (m) => {
    kb = { ...coBan, ...(m.kb ?? {}) };
    matMang = !!m.matMang;
    if (m.truoc) await m.truoc(); else await di(m.duong, m.token === undefined ? "tok-thu" : m.token);
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
const xet = async (dk, ten) => { kq.push([dk, ten]); console.log(`${dk ? "đạt" : "SAI"} ${ten}`); if (!dk) { sai++; console.log("    màn: " + ((await chu()) ?? "").replace(/s+/g, " ").slice(0, 400));
  if (process.env.PHA_CHUP) { const a = await goi("Page.captureScreenshot", { format: "png" }); (await import("node:fs")).writeFileSync(`${process.env.PHA_CHUP}/sai-${kq.length}.png`, Buffer.from(a.data, "base64")); } } };
const kichBan = async (ten, fn) => { console.log(`\n# ${ten}`); kb = { ...coBan }; matMang = false; nhatKy.length = 0; try { await fn(); } catch (e) { xet(false, `${ten}: lỗi ${e}`); } };

await kichBan("Đăng ký bằng số điện thoại → mã 6 số → vào bước 1 thiết lập", async () => {
  await dangKyToiOtp();
  xet(await doi("Nhập mã 6 số"), "sang màn nhập mã");
  xet(nhatKy.some((x) => x.d === "otp" && x.body?.dinhDanh === "0912345678"), "gửi đúng số điện thoại");
  xet(await doi("Bản thử: mã là 482017"), "chế độ thử hiện mã");
  await go("Mã xác thực 6 số", "482017");
  await bam("Xác nhận");
  await xet(await doi("Con tên gì?"), "đăng ký xong vào bước 1/5");
  xet(nhatKy.some((x) => x.d === "dang-ky" && x.body?.ma === "482017" && x.body?.ten === "Mẹ Lan"), "gửi mã + tên + mật khẩu");
});

await kichBan("Duyệt nhiệm vụ một chạm → +10 điểm → Hoàn tác trừ lại", async () => {
  await di("/duyet/l1");
  xet(await doi("Duyệt · +10 điểm cho"), "nút duyệt nói rõ số điểm");
  await bam(`Duyệt · +10 điểm cho ${KEN}`);
  xet(await doi(`+10 điểm cho ${KEN}`), "màn đã duyệt");
  xet(nhatKy.some((x) => x.d === "luot/l1/duyet" && x.body?.loiKhen === "Giỏi lắm!"), "gửi kèm lời khen mặc định");
  xet(await doi("Hoàn tác"), "có nút Hoàn tác");
  await bam("Hoàn tác");
  await sleep(600);
  xet(nhatKy.some((x) => x.d === "luot/l1/hoan-tac"), "Hoàn tác gọi máy chủ trừ lại điểm");
});

await kichBan("Từ chối nhẹ nhàng: chọn lý do, Con không bị trừ điểm", async () => {
  await di("/duyet/l1");
  await doi("Cần chụp lại");
  await bam("Cần chụp lại");
  xet(await doi("cần làm gì thêm?"), "mở bảng lý do");
  await bam(`Gửi cho ${KEN}`);
  await sleep(500);
  xet(nhatKy.some((x) => x.d === "luot/l1/tu-choi" && x.body?.boSung === true), "gửi «cần bổ sung» kèm lý do");
});

await kichBan("Thêm giờ: ngoại lệ thứ 4 hiện cảnh báo mềm TRƯỚC khi xác nhận; không chặn quyết định", async () => {
  await di("/yeu-cau/y2");
  xet(await doi("Ngoại lệ thứ 4 tuần này của Bill"), "cảnh báo mềm có số liệu");
  xet(await doi("Mẹ Lan 2, Ba Huy 1"), "lần trước theo người duyệt");
  await bam("Vẫn cho · ngoại lệ 15 phút");
  await sleep(600);
  xet(nhatKy.some((x) => x.d === "yeu-cau/y2/dong-y" && x.body?.truDiem === false && x.body?.phut === 15), "gửi đúng: ngoại lệ 15 phút");
});

await kichBan("Mất mạng lúc mở Hôm nay ⇒ Rob chờ + nói rõ, có mạng lại tự tải", async () => {
  matMang = true;
  await di("/hom-nay");
  xet(await doi("Đang chờ mạng"), "màn chờ mạng, không màn trắng");
  matMang = false;
  xet(await doi("việc chờ Ba Mẹ", 9000), "có mạng lại tự tải (≤ 5 giây)");
});

await kichBan("Hết phiên (401) ⇒ về màn Chào", async () => {
  kb["GET gia-dinh"] = { status: 401, body: { error: "chua_dang_nhap", message: "Phiên đăng nhập đã hết" } };
  await di("/hom-nay");
  xet(await doi("Bắt đầu bằng số điện thoại"), "về màn Chào");
});

ws.close();
chrome.kill();
may.close();
await sleep(500);
try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
console.log(`\n${kq.filter((x) => x[0]).length}/${kq.length} đạt`);
process.exit(sai ? 1 : 0);
