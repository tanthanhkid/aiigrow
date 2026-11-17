// «Cố tình phá» + cổng giao diện cho app AiiGrow (chép khung từ AiiControl mobile/scripts/pha.mjs): chạy bản WEB EXPORT trong một Chrome
// headless RIÊNG (hồ sơ tạm — không đụng trình duyệt của ai), chặn MỌI lời gọi /api bằng CDP Fetch và trả dữ liệu giả. Không gọi máy chủ thật.
// Điều hướng bằng CDP Page.navigate tới máy chủ tĩnh cục bộ (không dùng --screenshot: chính sách Chrome máy công ty đè trang chủ).
//
//   (đổi cổng khi chạy song song: PHA_CONG=8192 PHA_CDP=9500, và EXPO_PUBLIC_API cùng cổng)
//   EXPO_PUBLIC_API=http://localhost:8191 npx expo export --platform web --output-dir <thư mục>
//   node scripts/pha.mjs <thư mục>                 # kịch bản luồng chính
//   node scripts/pha.mjs <thư mục> --giao-dien     # cổng chuẩn giao diện (scripts/giao-dien.mjs) trên mọi màn Ba Mẹ — dữ liệu thường + lượt chữ dài
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
  nhiemVuCho: 3, yeuCauCho: 1, nhiemVuXong: 3, phutDoiDuoc: 145, homNayConDa: ["Đọc xong 1 cuốn sách", "Rửa chén 2 lần", "Học AiiRob đạt 92%"], ...o });
const mayCon = (id, ten, o = {}) => ({ id, ten, nen: "windows", dungChung: false, baoVe: "day_du", lanCuoi: luc(1), truc: true, lechGiay: null, ...o });
const conCt = (id, ten) => ({ id, ten, namSinh: 2017, avatar: "rob", nhom: "nhi", khoaNgay: false, lich: LICH, thamSo: THAM, soDu: 145, diemChoDuyet: 30, tongKiem: 845, capDo,
  may: [mayCon("m1", `Laptop của ${ten} · Windows 11`), mayCon("m2", `iPad của ${ten}`, { nen: "ios", baoVe: "mot_phan", truc: false, lanCuoi: luc(1560) })] });
const KEN = "Nguyễn Ngọc Bảo Anh", BILL = "Bill";
const luot = (id, ten, o = {}) => ({ id, child_id: "c1", ten_con: KEN, ten, nhom: "viec_nha", diem: 10, nop_luc: luc(12), ghi_chu: null, nghi_trung: false, so_anh: 1, ...o });
const yc = (id, loai, o = {}) => ({ id, child_id: "c2", ten_con: BILL, loai, phut: 15, gia_tri: null, ly_do: "Con đang xây dở nhà", created_at: luc(3), het_han: luc(-1400), trang_thai: "cho", ...o });
const coBan = {
  "GET toi": { baMe: { id: "p1", ten: "Mẹ Lan", dinhDanh: "0912345678", vai: "chu" } },
  "GET con/c1/web": { soNgay: 7, homNay: { giay: 2700, soLan: 14, soTrang: 6 }, tongGiay: 31_000, tatCa: 18, cheDoWeb: "mo", heThong: [],
    theoNgay: ["2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map((ngay, i) => ({ ngay, giay: [3600, 5400, 2400, 6000, 4200, 6700, 2700][i], soLan: 10, soTrang: 5 })),
    top: [{ tenMien: "facebook.com", giay: 7800, soLan: 34, lanCuoi: luc(40), trangThai: "giai_tri", nguon: "" }, { tenMien: "khanacademy.org", giay: 3900, soLan: 12, lanCuoi: luc(200), trangThai: "cho_phep", nguon: "gia_dinh" },
      { tenMien: "youtube.com", giay: 3000, soLan: 20, lanCuoi: luc(90), trangThai: "chan", nguon: "con" }, { tenMien: "gamevui.vn", giay: 1200, soLan: 5, lanCuoi: luc(600), trangThai: "chua_xep", nguon: "" }],
    luat: [{ tenMien: "youtube.com", trangThai: "chan", nguon: "con" }, { tenMien: "youtube.com", trangThai: "chan", nguon: "gia_dinh" }, { tenMien: "tiktok.com", trangThai: "chan", nguon: "gia_dinh" }, { tenMien: "khanacademy.org", trangThai: "cho_phep", nguon: "gia_dinh" }],
    mayLoc: [{ id: "m1", ten: "Laptop của Bảo Anh", cheDo: "chan", lanCuoi: luc(1) }] },
  "POST con/c1/web/trang": { ok: true }, "POST con/c1/web/trang/x": { ok: true },
  "GET tuan-thu": { ds: [
    { id: "m1", ten: "Laptop của Bảo Anh · Windows 11", nen: "windows", con: "c1", dungChung: false, lanCuoi: luc(1), phienBan: "0.2.5", adminTinCay: [], baoVe: "day_du", baoVeCau: "Bảo vệ đầy đủ.", baoVeThieu: [], trangThai: "tuan_thu", diem: 96, vanDe: [], khoaGiaiTri: false, moKhanCapDen: null, lenhCho: [], cheDo: "chan", cheDoMay: "chan", cheDoBaMeChon: "chan", daDongBo: true, dangGo: null, coTheXoaHan: false },
    { id: "m2", ten: "iPad của Bảo Anh", nen: "ios", con: "c1", dungChung: false, lanCuoi: luc(1560), phienBan: null, adminTinCay: [], baoVe: "mot_phan", baoVeCau: "1 việc cần sửa (xem bên dưới).", baoVeThieu: [{ ma: "haQuyenAdmin", ten: "Tài khoản của Con vẫn là quản trị", cach: "Tắt quyền quản trị cho tài khoản của Con." }], trangThai: "lech_chuan", diem: 70, vanDe: [], khoaGiaiTri: false, moKhanCapDen: null, lenhCho: [], cheDo: null, cheDoMay: null, cheDoBaMeChon: null, daDongBo: true, dangGo: null, coTheXoaHan: false },
    { id: "m3", ten: "Laptop của Bill", nen: "windows", con: "c2", dungChung: false, lanCuoi: luc(3), phienBan: "0.2.5", adminTinCay: [], baoVe: "mot_phan", baoVeCau: "1 việc cần sửa (xem bên dưới).", baoVeThieu: [{ ma: "chanThat", ten: "Chế độ Chặn thật", cach: "Máy đang ở chế độ Giám sát (chỉ ghi lại, chưa chặn)." }], trangThai: "tuan_thu", diem: 100, vanDe: [], khoaGiaiTri: false, moKhanCapDen: null, lenhCho: [], cheDo: "giam-sat", cheDoMay: "giam-sat", cheDoBaMeChon: "giam-sat", daDongBo: true, dangGo: null, coTheXoaHan: false }] },
  "GET gia-dinh": { ten: "Nhà Mẹ Lan", quyVoucher: 150000, choDuyet: 4, canhBao: 1, con: [conNgan("c1", KEN), conNgan("c2", BILL, { nhom: "teen", nhiemVuCho: 0 })] },
  "GET canh-bao": { ds: [{ id: "a1", child_id: "c2", loai: "lech_gio", muc: "chu_y", noi_dung: "Có dấu hiệu đổi giờ hệ thống trên Laptop-BILL của Bill", chi_tiet: { lechGiay: -3660 }, da_doc: false, created_at: luc(20) },
    { id: "a2", child_id: "c2", loai: "ngoai_le_manh", muc: "chu_y", noi_dung: "Tuần này Bill đã được 6 ngoại lệ. Gợi ý: giao thêm nhiệm vụ để con tự kiếm sao đổi giờ chơi.", chi_tiet: {}, da_doc: false, created_at: luc(60) }] },
  "GET cho-duyet": { nhiemVu: [luot("l1", "Rửa chén sau bữa tối"), luot("l2", "Đọc sách “Dế Mèn phiêu lưu ký” 50 trang", { nhom: "doc_sach", so_anh: 2, nop_luc: luc(35) }),
    luot("l3", "Tập thể dục 30 phút", { nhom: "van_dong", nghi_trung: true, nop_luc: luc(60) })], yeuCau: [yc("y2", "them_gio")],
    tuDong: [{ id: "l9", ten_con: KEN, ten: "Học 1 bài với AiiRob", ghi_chu: "Phân số bài 4 · 92%", diem: 20, nguon: "aiirob" }] },
  "GET con/c1": conCt("c1", KEN), "GET con/c2": conCt("c2", BILL),
  "GET con/c1/vi": { soDu: 155, diemChoDuyet: 30, tongKiem: 845, capDo, lichSu: [
    { delta: 10, loai: "nhiem_vu", ly_do: "Nhiệm vụ Rửa chén sau bữa tối", nguoi: "p1", ten_nguoi: "Mẹ Lan", created_at: luc(1) }, { delta: 20, loai: "nhiem_vu", ly_do: "Nhiệm vụ Học 1 bài với AiiRob", nguoi: null, created_at: luc(80) },
    { delta: -25, loai: "doi_gio", ly_do: "Đổi 25 sao lấy 25 phút chơi", nguoi: null, created_at: luc(150) }, { delta: 15, loai: "tay", ly_do: "Thưởng sinh nhật bạn", nguoi: "p2", ten_nguoi: "Ba Huy", created_at: luc(900) }] },
  "GET con/c1/thanh-tich": { chuoiNgay: 6 },
  "GET con/c1/bao-cao": { ten: KEN, chuGiai: [`Tuần này ${KEN} đọc sách nhiều hơn tuần trước 2 lần`, "Giờ chơi giảm 20 phút so với tuần trước"],
    tuanNay: { giaiTriTheoNgay: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"].map((ngay, i) => ({ ngay, phut: [25, 30, 45, 20, 35, 50, 45][i] })),
      tongGiaiTri: 250, phutHoc: 380, diemKiemTheoNhom: [{ nhom: "doc_sach", diem: 40, n: 4 }], duyet: { duoc: 12, tu_choi: 1 }, ngoaiLe: 2,
      top: [{ muc: "roblox.exe", phut: 185 }, { muc: "youtube.com", phut: 65 }],
      hocTheoNgay: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"].map((ngay, i) => ({ ngay, phut: [40, 55, 30, 50, 45, 35, 25][i] })),
      dungNhieu: [{ muc: "roblox.exe", loai: "giai_tri", phut: 185, lech: -12 }, { muc: "aiirob", loai: "hoc", phut: 160, lech: 30 }] },
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
  // kho việc «Một ngày của <Con>» (thiết kế 14/11) — vài việc mỗi mục, tên dài để lộ lỗi xuống dòng
  "GET nhiem-vu/kho": { chuDe: [{ ten: "Bếp núc", e: "🍳" }, { ten: "Chăm Ba Mẹ", e: "💛" }], ds: [
    { ma: "hoc_1", muc: "hoc", chuDe: null, e: "📖", ten: "Đọc sách 20 phút", sao: 10, lon: false }, { ma: "hoc_5", muc: "hoc", chuDe: null, e: "🤖", ten: "Học 1 bài với AiiRob", sao: 20, lon: false },
    { ma: "van_dong_1", muc: "van_dong", chuDe: null, e: "🪢", ten: "Nhảy dây 100 cái", sao: 10, lon: false },
    { ma: "giup_1_3", muc: "giup", chuDe: "Bếp núc", e: "🍳", ten: "Nấu cơm bằng nồi cơm điện (đong gạo, vo gạo, bấm nút)", sao: 15, lon: false },
    { ma: "giup_9_6", muc: "giup", chuDe: "Chăm Ba Mẹ", e: "💛", ten: "Trông nom, chơi đùa hoặc dạy em nhỏ học bài khi ba mẹ bận việc", sao: 15, lon: true }] },
  "GET nhiem-vu": { ds: [["Đọc sách 50 trang", "doc_sach", 10, "anh", 1], ["Rửa chén sau bữa ăn", "viec_nha", 10, "anh", 3], ["Lau sàn nhà", "viec_nha", 10, "anh", 1],
    ["Học 1 bài với AiiRob", "hoc_tap", 20, "tu_dong", null], ["Tập thể dục 30 phút", "van_dong", 10, "anh", 1]].map(([ten, nhom, diem, bang_chung, toi_da_ngay], i) =>
    ({ id: `t${i}`, ten, mo_ta: "", nhom, diem, bang_chung, kieu: "thuong", toi_da_ngay, toi_da_tuan: null, phut_toi_thieu: 0, tu_duyet: bang_chung === "tu_dong", giao_cho: null, han: null, bat: true })) },
  "GET qua": { ds: [{ id: "q1", ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50000, ton_kho: null, toi_da_thang: null, chi_cuoi_tuan: false, bat: true },
    { id: "q2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, menh_gia: null, ton_kho: null, toi_da_thang: null, chi_cuoi_tuan: true, bat: true },
    { id: "q3", ten: "Chọn thực đơn bữa tối", loai: "dac_quyen", diem: 50, menh_gia: null, ton_kho: null, toi_da_thang: 2, chi_cuoi_tuan: false, bat: true }] },
  "GET quy": { soDu: 30000, giaoDich: [{ so_tien: 200000, loai: "nap", ghi_chu: "Tiền mặt", created_at: luc(4000) }, { so_tien: -50000, loai: "phat_hanh", ghi_chu: "Phiếu quà 50k", created_at: luc(300) }] },
  "GET luat": { ds: [{ child_id: "", muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" }, { child_id: "", muc: "khanacademy.org", ten: "Khan", loai: "hoc", nhom: "khac" }],
    heThong: ["winword.exe"], chuaXep: [{ muc: "tiktok.com", ten: "tiktok.com", phut: 12 }, { muc: "capcut.exe", ten: "Capcut", phut: 4 }, { muc: "minecraft.launcher.exe", ten: "Minecraft launcher", phut: 30 }],
    daThay: [{ muc: "msedge.exe", ten: "Microsoft Edge", phut: 95, loai: "chua_xep" }, { muc: "roblox.exe", ten: "Roblox", phut: 210, loai: "giai_tri" }, { muc: "capcut.exe", ten: "Capcut", phut: 4, loai: "chua_xep" }] },
  "POST luat": { muc: "x" }, "POST may/m1/che-do": { ok: true }, "POST nhiem-vu": { id: "t-moi" }, "POST phien/p1/dung": { ok: true },
  "GET phien-dang": { ds: [{ id: "p1", con: "c1", tenCon: "Nguyễn Ngọc Bảo Anh", may: "Laptop của Bảo Anh · Windows 11", muc: "roblox.exe", tenApp: "Roblox", tam: false, conPhut: 18 }] },
  "GET thanh-vien": { ds: [{ id: "p1", ten: "Mẹ Lan", vai: "chu" }, { id: "p2", ten: "Ba Huy", vai: "duyet" }, { id: "p3", ten: "Bà nội", vai: "xem" }] },
  "GET ho-tro": { tin: [{ id: "h1", tu: "aiilab", noi_dung: "Chào chị Lan, AiiLab đây. Chị cần giúp gì về AiiGrow ạ?", created_at: luc(10) },
    { id: "h2", tu: "ba_me", noi_dung: "Máy của bé đổi sao lấy giờ rồi mà chưa thấy cộng phút.", created_at: luc(8) },
    { id: "h3", tu: "aiilab", noi_dung: "AiiLab thấy lần đổi 10 sao rồi ạ, đã cộng 10 phút vào quỹ hôm nay của bé.", created_at: luc(5) }] },
  "POST otp": { guiDen: "0912345678", ma: "482017" }, "POST dang-ky": { token: "tok-moi", moi: true }, "POST dang-nhap": { token: "tok-thu" },
  "POST ma-ghep": { ma: "482917" }, "POST con": { id: "c1" }, "POST nhiem-vu/mau": { taoMoi: 8 }, "POST qua/mau": { taoMoi: 6 },
  "POST con/c1/lich": { lich: LICH }, "POST con/c1/cau-hinh": { ok: true }, "POST con/c1/khoa": { ok: true }, "POST dang-xuat": { ok: true },
};
// Thành viên gia đình (FR-01.04) + thông báo trong app (FR-08.01)
const tbDong = (id, nhom, tieu, phu, phut, o = {}) => ({ id, nhom, muc: "thong_tin", tieu, phu, luc: luc(phut), con: "c1", den: "/cho-duyet", so: 1, moi: false, day: true, imLang: false, ...o });
Object.assign(coBan, {
  "GET thanh-vien": { ds: [{ id: "p1", ten: "Mẹ Lan", vai: "chu", dinh_danh: "0912345678", laToi: true }, { id: "p2", ten: "Ba Huy", vai: "duyet", dinh_danh: "0987654321", laToi: false },
    { id: "p3", ten: "Bà nội Nguyễn Thị Ngọc Hạnh", vai: "xem", dinh_danh: "0901234567", laToi: false }],
    loiMoi: [{ id: "lm1", vai: "xem", tenGoi: "Ông ngoại", het: luc(-4000) }], toi: { id: "p1", vai: "chu" }, hanGio: 72 },
  "POST thanh-vien/moi": { id: "lm2", ma: "ABCD-2345", lienKet: `${GOC}/moi?ma=ABCD2345`, vai: "xem", tenGoi: "Bà ngoại", het: luc(-4320) },
  "POST thanh-vien/p2/vai": { vai: "xem" }, "POST thanh-vien/p3/moi-ra": { ok: true }, "POST thanh-vien/moi/lm1/huy": { ok: true },
  "GET moi/ABCD2345": { tenGiaDinh: "Nhà Mẹ Lan", nguoiMoi: "Mẹ Lan", vai: "duyet", tenVai: "Phê duyệt", tenGoi: "Ba Huy", het: luc(-4000) },
  "POST moi/dang-ky": { token: "tok-ba" }, "POST moi/nhan": { vai: "duyet" },
  "GET thong-bao": { chuaDoc: 3, caiDat: { yenLang: { bat: true, tu: "22:00", den: "06:30" }, tat: [] }, ds: [
    tbDong("e1", "nhiem_vu", `${KEN} vừa nộp 3 nhiệm vụ`, "Rửa chén · Đọc sách “Dế Mèn phiêu lưu ký” 50 trang · Tập thể dục 30 phút", 4, { so: 3, moi: true }),
    tbDong("e2", "yeu_cau", "Bill xin thêm 15 phút", "Đồng ý hoặc từ chối trong Chờ duyệt", 9, { con: "c2", moi: true }),
    tbDong("a1", "canh_bao", "Có dấu hiệu đổi giờ hệ thống trên Laptop-BILL của Bill", "Cảnh báo · Bill", 20, { muc: "nghiem_trong", den: "/canh-bao/a1", moi: true }),
    tbDong("e3", "ba_me_khac", `Ba Huy đã duyệt «Rửa chén sau bữa tối» của ${KEN}`, "+10 sao", 95, { den: "/vi/c1" }),
    tbDong("e4", "qua", "Bill đổi «Đi xem phim cuối tuần»", "300 sao · chờ Ba Mẹ trao quà", 1500, { con: "c2", den: "/diem-qua", imLang: true, day: false }),
    tbDong("e5", "gia_dinh", "Bà nội Nguyễn Thị Ngọc Hạnh đã vào gia đình", "Quyền Người trông giúp", 3000, { con: null, den: "/thanh-vien" })] },
  "POST thong-bao/doc": { ok: true },
  "GET thong-bao/cai-dat": { yenLang: { bat: false, tu: "22:00", den: "06:30" }, tat: ["thanh_tich"] },
  "POST thong-bao/cai-dat": { yenLang: { bat: true, tu: "22:00", den: "06:30" }, tat: ["thanh_tich"] },
  // FR-03.06 giữ (đóng băng) chuỗi ngày · FR-06.02 xuất CSV
  "GET con/c1/thanh-tich": { chuoiNgay: 6, dongBang: { ngay: "2026-10-21", duocDung: true, daDung: [] } },
  "POST con/c1/dong-bang-chuoi": { ngay: "2026-10-21" },
  "GET phieu": { ds: [{ id: "ph1", ten: "Voucher AiiCafe 50.000đ", loai: "voucher", diem: 500, ten_con: KEN, created_at: luc(90) }] },
  "GET con/c1/man-hinh": (() => {
    const N = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
    const ds = [
      { id: "robloxplayerbeta.exe", ten: "Roblox", kieu: "app", muc: "game", soLan: 0, theoNgay: [40, 35, 50, 20, 45, 0, 0] },
      { id: "youtube.com", ten: "youtube.com", kieu: "web", muc: "video", soLan: 42, theoNgay: [25, 30, 15, 20, 35, 0, 0] },
      { id: "aiirob.aiilab.vn", ten: "aiirob.aiilab.vn", kieu: "web", muc: "hoc", soLan: 18, theoNgay: [30, 25, 40, 30, 20, 0, 0] },
      { id: "khanacademy.org", ten: "khanacademy.org", kieu: "web", muc: "hoc", soLan: 9, theoNgay: [10, 0, 15, 20, 0, 0, 0] },
      { id: "tiktok.com", ten: "tiktok.com", kieu: "web", muc: "video_ngan", soLan: 23, theoNgay: [10, 15, 5, 10, 20, 0, 0] },
      { id: "com.zing.zalo", ten: "Zalo", kieu: "app", muc: "mxh", soLan: 0, theoNgay: [5, 10, 5, 10, 5, 0, 0] },
      { id: "chrome.exe", ten: "Chrome", kieu: "app", muc: "tien_ich", soLan: 0, theoNgay: [5, 5, 10, 5, 5, 0, 0] },
      { id: "paint3d.exe", ten: "Paint3d", kieu: "app", muc: "chua_xep", soLan: 0, theoNgay: [0, 10, 0, 5, 0, 0, 0] },
    ].map((x) => ({ ...x, theoNgay: x.theoNgay.map((p) => p * 60) })).map((x) => ({ ...x, giay: x.theoNgay.reduce((a, b) => a + b, 0) }));
    const theoNgay = N.map((ngay, i) => { const tm = {}; for (const x of ds) if (x.theoNgay[i]) tm[x.muc] = (tm[x.muc] ?? 0) + x.theoNgay[i];
      return { ngay, giay: Object.values(tm).reduce((a, b) => a + b, 0), theoMuc: tm }; });
    const tong = theoNgay.reduce((a, d) => a + d.giay, 0);
    const theoMuc = [...new Set(ds.map((x) => x.muc))].map((muc) => ({ muc, giay: ds.filter((x) => x.muc === muc).reduce((a, x) => a + x.giay, 0), soMuc: ds.filter((x) => x.muc === muc).length }))
      .sort((a, b) => b.giay - a.giay);
    return { ten: KEN, lui: 0, dau: N[0], cuoi: N[6], homNay: N[4], tongGiay: tong, tbNgayGiay: Math.round(tong / 5), tuanTruocGiay: 820 * 60, tatCa: ds.length, theoNgay, theoMuc, ds };
  })(),
  "GET con/c1/bao-cao/csv": { tenTep: "aiigrow-bao-cao-Ken-2026-10-19.csv", noiDung: "\uFEFFBáo cáo tuần AiiGrow,Ken\r\n" },
});

// M6 liên kết AiiRob: mã «<family_id>.<child_id>» (id thật dài 20 ký tự ⇒ đo tràn dòng ở 320px)
const MA_AIIROB = "3f9a1c0e7b2d4a6f8e1c.c1d2e3f4a5b6c7d8e9f0";
coBan["GET con/c1/lien-ket-aiirob"] = { ma: MA_AIIROB };
for (const x of coBan["GET tuan-thu"].ds) coBan[`GET may/${x.id}/tuan-thu`] = { ...x, suKien: [] };
coBan["GET may/m1/ma-offline"] = { ma: "482917", conGiay: 0, hieuLucPhut: 5, phutMo: 30 };
// đổi tên Con + đổi tên máy (màn máy cần chi tiết tuân thủ đủ trường)
coBan["POST con/c1/sua"] = { ok: true };
coBan["POST may/m1/doi-ten"] = { ok: true, ten: "Máy học bài" };
coBan["GET may/m1/tuan-thu"] = { ...coBan["GET tuan-thu"].ds[0], daDongBo: true, dangGo: null, coTheXoaHan: false, cheDoBaMeChon: "chan", moDen: null, suKien: [] };
// Ứng dụng trên máy (danh sách app ĐÃ CÀI THẬT do agent gửi — server/lib/app-may.ts): icon PNG nhỏ, tên dài, không icon, đủ các trạng thái
// icon THẬT của vài app phổ biến (PNG 96 px trích từ .icns bằng sips — scripts/icon-that.json); app không có icon ⇒ chữ cái đầu
const ICON = JSON.parse(readFileSync(new URL("./icon-that.json", import.meta.url), "utf8"));
const appMay = (khoa, ten, trangThai, o = {}) => ({ khoa, muc: khoa.replace(/^exe:.*\\/, "").replace(/^appx:/, "").replace(/_.*$/, ""), ten, nguon: "start", nhaPhatHanh: null,
  teamId: null, duongDan: null, phienBan: null, icon: null, trangThai, nhom: trangThai === "giai_tri" ? "game" : null, theoCaNha: false, ...o });
coBan["GET may/m1/ung-dung"] = { may: { id: "m1", ten: "Laptop của Bảo Anh · Windows 11", nen: "windows", dungChung: false, con: "c1" },
  capNhatLuc: luc(12), yeuCauLuc: null, ds: [
    appMay("exe:c:\\program files\\microsoft office\\root\\office16\\winword.exe", "Microsoft Word — Soạn thảo văn bản cho bài tập ở trường", "hoc", { nguon: "registry", nhaPhatHanh: "Microsoft Corporation", phienBan: "16.0.18129", icon: ICON.word }),
    appMay("appx:bytedance.capcut_6yccndn6064se", "CapCut", "giai_tri", { nguon: "store", nhaPhatHanh: "Bytedance Pte. Ltd.", icon: ICON.capcut }),
    appMay("exe:c:\\program files\\google\\chrome\\application\\chrome.exe", "Google Chrome", "he_thong", { nhaPhatHanh: "Google LLC", icon: ICON.chrome }),
    appMay("exe:c:\\program files\\blender foundation\\blender 4.2\\blender.exe", "Blender", "chua_xep", { nguon: "registry", nhaPhatHanh: "Blender Foundation", icon: ICON.blender }),
    appMay("exe:c:\\users\\baoanh\\appdata\\roaming\\zoom\\bin\\zoom.exe", "Zoom Workplace", "hoc", { nhaPhatHanh: "Zoom Communications, Inc.", icon: ICON.zoom }),
    appMay("exe:c:\\users\\baoanh\\appdata\\local\\roblox\\versions\\v1\\robloxplayerbeta.exe", "Roblox Player", "chua_xep", { nhaPhatHanh: "Roblox Corporation", phienBan: "0.650.0.6500718",
      duongDan: "C:\\Users\\baoanh\\AppData\\Local\\Roblox\\Versions\\version-2b8f4c1e9a7d4e21\\RobloxPlayerBeta.exe" }),
    appMay("exe:c:\\users\\baoanh\\appdata\\local\\viber\\viber.exe", "Viber", "chan", { nhaPhatHanh: "Viber Media S.à r.l.", icon: ICON.viber }),
    appMay("exe:c:\\program files\\microsoft office\\root\\office16\\excel.exe", "Microsoft Excel", "hoc", { nguon: "registry", nhaPhatHanh: "Microsoft Corporation", theoCaNha: true, icon: ICON.excel }),
  ] };
coBan["POST may/m1/ung-dung/dat"] = (b) => ({ muc: kb["GET may/m1/ung-dung"].ds.find((x) => x.khoa === b?.khoa)?.muc ?? "x", con: "c1", truoc: null });
coBan["POST may/m1/ung-dung/lam-moi"] = { yeuCauLuc: new Date().toISOString() };
coBan["POST luat/xoa"] = { muc: "x" };
// Xoá tài khoản (Apple 5.1.1(v)): chủ là người lớn cuối ⇒ xoá cả gia đình
// (giả như máy chủ: hỏi trước {kiemTra} hoặc xoá thật đều bị chặn 409 khi còn Ba/Mẹ khác / còn máy)
coBan["POST xoa-tai-khoan"] = (b) => {
  const tv = kb["GET thanh-vien"].ds, may = kb["GET tuan-thu"].ds;
  if (tv.length > 1) return { status: 409, body: { error: "con_thanh_vien", message: `Gia đình còn ${tv.slice(1).map((x) => x.ten).join(", ")}. Hãy mời họ ra khỏi gia đình (Gia đình › Thành viên) rồi mới xoá tài khoản Chủ gia đình.` } };
  if (may.length) return { status: 409, body: { error: "con_may", message: `Gia đình còn ${may.length} máy đã ghép: ${may.map((m) => m.ten).join(", ")}. Gỡ từng máy trước (mở máy › Gỡ máy này) để AiiGrow rời máy của Con — xoá tài khoản rồi thì không gửi lệnh gỡ được nữa.` } };
  return b?.kiemTra ? { duoc: true } : { xoa: "gia_dinh" };
};
// ---------------------------------------------------------------- thiết kế chốt 05/11 (docs/KE-HOACH-KHOP-THIET-KE-0511.md, docs/API.md cuối tệp)
// sao thay điểm (L1), quỹ giờ chơi + giờ ngủ (L2), ngoại lệ (L3), chặn 2 chế độ (L4), bỏ PIN (L5), 2 quyền + mời bằng SĐT (L6),
// nhiệm vụ theo bộ + bằng chứng ghi âm / làm lại (L9), quà trao tay — bỏ phiếu AiiCafe / quỹ (L10).
/** Đối tượng `quy` (server/lib/quy-gio.ts › quyHomNay): còn `con` phút trong `tong`. */
const quyGia = (con = 18, tong = 60, o = {}) => ({ ngay: "2026-11-05", cuoiTuan: false, quyNgayPhut: 60, themPhut: tong - 60, doiSaoPhut: 0, daDung: tong - con, conPhut: con,
  tongPhut: tong, dangNgu: false, dangHoc: false, khoa: false, gioNgu: { tu: "21:30", den: "06:30" }, gioHoc: null, phutToiNgu: 300, phutToiHoc: null,
  tyLe: { sao: 10, phut: 10 }, doiSao: { bat: true, toiDaNgay: 30, conDoiDuoc: 30 }, choXinThem: true, ...o });
const gioChoi = (o = {}) => ({ gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90, phutMoiLuot: 30, quyNgayThuong: 60, quyCuoiTuan: 90, phut10Sao: 10, doiSaoBat: true, doiSaoToiDaNgay: 30, choXinThemGio: true, ngoaiLeToiDaPhut: 60,
  gioNgu: { tu: "21:30", den: "06:30" }, gioHoc: { tu: "19:00", den: "20:30", thu: [1, 2, 3, 4, 5] }, homNay: quyGia(), ...o });
const viecBo = (ten, sao, bangChung, lapLai, hinh, nhan, moTa = "") => ({ ten, moTa, sao, bangChung, tuCham: bangChung === "tu_dong", lapLai, hinh, nhan, toiDaNgay: 1 });
const BO_NV = [
  { ma: "tu_lap", ten: "Tự lập", tuoi: "9–10 tuổi", soViec: 5, saoToiDaNgay: 60, viec: [viecBo("Dọn phòng", 10, "anh", "hang_ngay", "choi", "Mỗi ngày · nộp ảnh", "Cất đồ về đúng chỗ, chụp ảnh phòng gọn."),
    viecBo("Tự đánh răng", 10, "xong", "hang_ngay", "ban_chai", "Sáng và tối"), viecBo("Đọc sách 20 phút", 10, "ghi_am", "hang_ngay", "sach", "Mỗi ngày · nộp ghi âm"),
    viecBo("Tự xếp cặp", 10, "anh", "ngay_thuong", "cap", "Thứ 2 – Thứ 6"), viecBo("Học 1 bài với AiiRob", 20, "tu_dong", "hang_ngay", "rob", "Tự chấm")] },
  { ma: "viec_nha", ten: "Phụ việc nhà", tuoi: "8–12 tuổi", soViec: 3, saoToiDaNgay: 20, viec: [viecBo("Tưới cây", 5, "anh", "hang_ngay", "cay", null),
    viecBo("Rửa bát", 10, "anh", "hang_ngay", "bat", null, "Rửa sạch bát sau bữa ăn."), viecBo("Đổ rác", 5, "xong", "hang_ngay", "rac", null)] },
];
const nvMoi = (id, ten, nhom, diem, bang_chung, o = {}) => ({ id, ten, mo_ta: "", nhom, diem, bang_chung, kieu: "thuong", toi_da_ngay: 1, toi_da_tuan: null, phut_toi_thieu: 0,
  tu_duyet: bang_chung === "tu_dong", giao_cho: null, han: null, bat: true, hinh: null, lap_lai: "hang_ngay", gio_nhac: null, bo: "tu_lap", ...o });
for (const [id, ten] of [["c1", KEN], ["c2", BILL]]) {
  const g = coBan["GET gia-dinh"].con.find((x) => x.id === id);
  Object.assign(g, { sao: g.soDu, saoChoDuyet: g.diemChoDuyet, conPhut: 18, tranNgay: 60, phutChoi: 42 });
  coBan[`GET con/${id}`] = { ...coBan[`GET con/${id}`], cheDoChan: "chi_app_duoc_phep", coPin: false, sao: 145, saoChoDuyet: 30 };
  coBan[`GET con/${id}/quy`] = { quy: quyGia(), sao: 145, ngoaiLe: [] };
  coBan[`GET con/${id}/gio-choi`] = gioChoi();
  coBan[`POST con/${id}/gio-choi`] = (b) => ({ ...gioChoi(), ...(b ?? {}) });
  coBan[`POST con/${id}/them-gio`] = (b) => ({ id: "g-moi", phut: b?.phut ?? 15, quy: quyGia(18 + (b?.phut ?? 15), 60 + (b?.phut ?? 15)) });
  coBan[`POST con/${id}/che-do-chan`] = (b) => ({ cheDoChan: b?.cheDo, ten });
  coBan[`POST con/${id}/app-cho-phep`] = (b) => ({ daDat: (b?.apps ?? []).map((a) => ({ ten: a.ten ?? a.ma, muc: [a.ma ?? a.ten] })), choKhop: [] });
  coBan[`GET app-goi-y`] = { ds: [["roblox", "Roblox", true, false], ["minecraft", "Minecraft", true, true], ["youtube", "YouTube", true, true], ["zoom", "Zoom", false, true],
    ["word", "Word", false, true], ["scratch", "Scratch", false, true], ["tiktok", "TikTok", true, false], ["capcut", "CapCut", true, false]].map(([ma, ten, tinhGio, chon]) => ({ ma, ten, tinhGio, chon })) };
  coBan[`GET con/${id}/man-hinh`] = coBan["GET con/c1/man-hinh"] ?? null;
  coBan[`GET con/${id}/thiet-lap`] = { conId: id, ten, cheDoChan: "chi_app_duoc_phep", gioChoi: { ngayThuong: 60, cuoiTuan: 90 }, ngu: { tu: "21:30", den: "06:30" }, soApp: 6, app: { daDat: [], choKhop: [] } };
}
coBan["GET con/c2/man-hinh"] = { ...coBan["GET con/c1/man-hinh"], ten: BILL };
coBan["GET con/c2/vi"] = { ...coBan["GET con/c1/vi"], sao: 155 };
Object.assign(coBan["GET con/c1/vi"], { sao: 155, saoChoDuyet: 30 });
Object.assign(coBan, {
  "GET toi": { baMe: { id: "p1", ten: "Mẹ Lan", dinhDanh: "0912345678", quyen: "ba_me", laChuNha: true, vai: "chu" } },
  "GET gia-dinh": { ...coBan["GET gia-dinh"], quyVoucher: 0 },
  "GET nhiem-vu/bo": { ds: BO_NV },
  "POST nhiem-vu/bo": (b) => ({ taoMoi: b?.chon?.length ?? 5, ids: ["t-a", "t-b"] }),
  "GET nhiem-vu": { ds: [nvMoi("t0", "Dọn phòng", "viec_nha", 10, "anh", { hinh: "choi" }), nvMoi("t1", "Rửa chén sau bữa tối", "viec_nha", 10, "anh", { hinh: "bat", bo: "viec_nha" }),
    nvMoi("t2", "Đọc sách “Dế Mèn phiêu lưu ký” 50 trang", "doc_sach", 10, "ghi_am", { hinh: "sach" }), nvMoi("t3", "Tập thể dục 30 phút", "van_dong", 10, "anh", { bo: null }),
    nvMoi("t4", "Học 1 bài với AiiRob", "hoc_tap", 20, "tu_dong", { hinh: "rob", toi_da_ngay: null })] },
  "POST nhiem-vu": (b) => ({ id: "t-moi", ids: Array.isArray(b?.giao_cho) ? b.giao_cho.map((_, i) => `t-moi${i}`) : ["t-moi"] }),
  "GET cho-duyet": { ...coBan["GET cho-duyet"], nhiemVu: coBan["GET cho-duyet"].nhiemVu.map((x) => ({ ...x, sao: x.diem, bang_chung: x.nhom === "doc_sach" ? "ghi_am" : "anh",
    hinh: null, so_ghi_am: x.nhom === "doc_sach" ? 1 : 0, so_anh: x.nhom === "doc_sach" ? 0 : x.so_anh })), phieu: [] },
  "GET luot/l1/bang-chung": { ds: [{ id: "e1", mime: "image/png", loai: "anh", base64: PNG, chupLuc: luc(13) }] },
  "POST luot/l1/lam-lai": { trangThai: "lam_lai" }, "POST luot/l3/lam-lai": { trangThai: "lam_lai" },
  "POST duyet-hang-loat": (b) => ({ daDuyet: b?.ids?.length ?? 0, sao: 10 * (b?.ids?.length ?? 0) }),
  "POST them-gio/g-moi/hoan-tac": { ok: true },
  // L10 + L14 (thiết kế chốt 06/11): quà = bảng giá sao, khoá camelCase như máy chủ; «Thêm 30 phút» KHÔNG nằm trong danh sách quà (nút đổi sao ra phút riêng của con)
  "GET qua": { ds: [
    { id: "q1", ten: "Kem", loai: "dac_quyen", sao: 100, diem: 100, moTa: null, hinh: null, menhGia: null, tonKho: null, toiDaThang: null, chiCuoiTuan: false, canXacNhan: true, apCho: null, mau: null, dangGiu: 0, laVoucher: false, bat: true },
    { id: "q2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", sao: 300, diem: 300, moTa: null, hinh: null, menhGia: null, tonKho: null, toiDaThang: null, chiCuoiTuan: true, canXacNhan: true, apCho: null, mau: null, dangGiu: 0, laVoucher: false, bat: true },
    { id: "q3", ten: "Chọn thực đơn bữa tối", loai: "dac_quyen", sao: 50, diem: 50, moTa: null, hinh: null, menhGia: null, tonKho: null, toiDaThang: 2, chiCuoiTuan: false, canXacNhan: true, apCho: null, mau: null, dangGiu: 0, laVoucher: false, bat: true }] },
  // S3: «Cần Ba Mẹ để ý» + máy mất mạng — mặc định không có mục nào
  "GET can-de-y": { ds: [], soChuong: 0 }, "GET may-mat-mang": { ds: [] },
  "GET quy": { status: 410, body: { error: "da_bo", message: "Quỹ phiếu quà AiiCafe đã ngừng" } },
  "GET phieu": { ds: [{ id: "ph1", child_id: "c2", ten: "Đi xem phim cuối tuần", loai: "dac_quyen", diem: 300, ten_con: BILL, created_at: luc(90) }] },
  "POST phieu/ph1/trao": { ok: true, trangThai: "da_trao" },
  // L6: 2 quyền (Ba Mẹ / Người trông giúp), mời bằng SĐT / email
  "GET thanh-vien": { ds: [{ id: "p1", ten: "Mẹ Lan", quyen: "ba_me", tenQuyen: "Ba Mẹ", laChuNha: true, vai: "chu", dinh_danh: "0912345678", laToi: true },
    { id: "p2", ten: "Ba Huy", quyen: "ba_me", tenQuyen: "Ba Mẹ", laChuNha: false, vai: "duyet", dinh_danh: "0987654321", laToi: false },
    { id: "p3", ten: "Bà nội Nguyễn Thị Ngọc Hạnh", quyen: "trong_giup", tenQuyen: "Người trông giúp", laChuNha: false, vai: "xem", dinh_danh: "0901234567", laToi: false }],
    loiMoi: [{ id: "lm1", quyen: "trong_giup", vai: "xem", tenGoi: "Ông ngoại", dinhDanh: "0933222111", het: luc(-4000), guiLuc: luc(320) }],
    toi: { id: "p1", quyen: "ba_me", vai: "chu", laChuNha: true }, hanGio: 72 },
  "POST thanh-vien/moi": (b) => ({ id: "lm2", ma: "ABCD2345EFGH6789", lienKet: `${GOC}/moi?ma=ABCD2345EFGH6789`, quyen: b?.quyen ?? "ba_me", vai: b?.quyen === "trong_giup" ? "xem" : "duyet",
    tenGoi: b?.tenGoi ?? null, dinhDanh: b?.dinhDanh ?? null, het: luc(-4320),
    chiaSe: { tieuDe: "Mời vào nhà trên AiiGrow", noiDung: "Mẹ Lan mời bạn cùng trông con trên AiiGrow", lienKet: `${GOC}/moi?ma=ABCD2345EFGH6789` } }),
  "POST thanh-vien/moi/lm1/gui-lai": { id: "lm1", lienKet: `${GOC}/moi?ma=MOIMOI2345EFGH67`, het: luc(-4320), chiaSe: { tieuDe: "Mời vào nhà trên AiiGrow", noiDung: "Mẹ Lan mời bạn", lienKet: `${GOC}/moi?ma=MOIMOI2345EFGH67` } },
  "POST thanh-vien/p2/quyen": (b) => ({ quyen: b?.quyen, vai: b?.quyen === "trong_giup" ? "xem" : "duyet" }),
  "POST thanh-vien/p3/quyen": (b) => ({ quyen: b?.quyen, vai: b?.quyen === "trong_giup" ? "xem" : "duyet" }),
  "POST thanh-vien/roi-nha": { ok: true },
  "GET moi/ABCD2345": { tenGiaDinh: "Nhà Mẹ Lan", nguoiMoi: "Mẹ Lan", quyen: "ba_me", tenQuyen: "Ba Mẹ", tenGoi: "Ba Huy", tenCon: [KEN, BILL], het: luc(-4000), vai: "duyet", tenVai: "Ba Mẹ" },
  "GET moi/cho-toi": { ds: [] },
  // L4: chặn 2 chế độ + web luôn chặn
  "GET luon-chan": { nhom: [{ ma: "nguoi_lon", ten: "Web người lớn", soTrang: 1200 }, { ma: "co_bac", ten: "Cờ bạc, cá cược", soTrang: 340 }, { ma: "bao_luc", ten: "Bạo lực", soTrang: 85 }],
    cheDo: [{ ma: "chi_app_duoc_phep", ten: "Chỉ app được phép" }, { ma: "mo_het", ten: "Mở hết" }] },
  // L8: ghép máy 10 phút + link bộ cài
  "POST ghep-may": { ma: "482017", maHien: "482 017", het: luc(-10), hanPhut: 10, conGiay: 600, lienKet: `${GOC}/tai?g=goi123&ma=482017`, qr: `${GOC}/tai?g=goi123&ma=482017`,
    tokenGoi: "goi123", hetGoi: luc(-2880), con: "c1", giongMay: null, chiaSe: { tieuDe: "Cài AiiGrow cho máy của con", noiDung: "Mở link này trên máy của con", lienKet: `${GOC}/tai?g=goi123&ma=482017` } },
  "GET ghep-may/482017": { daGhep: false, hetHan: false, conGiay: 540, con: "c1", may: null },
  "POST thiet-lap": (b) => ({ conId: "c1", ten: b?.con?.ten ?? KEN, cheDoChan: b?.cheDoChan ?? "chi_app_duoc_phep", gioChoi: b?.gioChoi ?? { ngayThuong: 60, cuoiTuan: 90 },
    ngu: b?.ngu ?? { tu: "21:30", den: "06:30" }, soApp: (b?.apps ?? []).length, app: { daDat: [], choKhop: [] } }),
});
// ---- khối A (fork A): dữ liệu giả cho kịch bản luồng nhóm A (05/11)
Object.assign(coBan, {
  "POST con/c1/loi-khen": { ok: true }, "POST con/c2/loi-khen": { ok: true },
  "POST yeu-cau/y2/dong-y": { ngoaiLe: false, grantId: "g2" },
  // ngoại lệ (giờ ngủ / Ba Mẹ khoá): xin mở MỘT app có hạn phút
  "GET yeu-cau/y3": { ...yc("y3", "ngoai_le", { phut: 30, gia_tri: "YouTube", pham_vi: "app", ly_do: "Con xem video bài tập" }), trang_thai: "cho", sao: 32, soDu: 32, phutDoiDuoc: 32 },
  "POST yeu-cau/y3/dong-y": { ngoaiLe: true },
  "POST con/c1/diem": (b) => ({ soDu: 155 + (b?.delta ?? 0) }),
  "POST thanh-vien/p2/moi-ra": { ok: true }, "POST luot/l3/tu-choi": { ok: true },
  "GET luot/l3": { id: "l3", child_id: "c1", ten_con: KEN, ten: "Tập thể dục 30 phút", nhom: "van_dong", diem_md: 10, trang_thai: "cho_duyet", nop_luc: luc(60),
    ghi_chu: null, nghi_trung: true, lamPhut: 30, lanHomNay: 1, toi_da_ngay: 1 },
  "GET luot/l3/bang-chung": { ds: [{ id: "e3", mime: "image/png", loai: "anh", base64: PNG, chupLuc: luc(61) }] },
});
coBan["GET yeu-cau/y2"] = { ...coBan["GET yeu-cau/y2"], sao: 32, phutDoiDuoc: 30 };
coBan["GET yeu-cau/y2"].xemTruoc.cau = "Tuần này Ba Mẹ đã cho ngoại lệ 4 lần — Bill có thể mất động lực kiếm sao.";
// ---- nhóm B (luồng Hôm nay / App & web / máy / hồ sơ) — dữ liệu giả thêm theo thiết kế 05/11
coBan["GET con/c1/web"] = { ...coBan["GET con/c1/web"], luat: [...coBan["GET con/c1/web"].luat, { tenMien: "facebook.com", trangThai: "cho_phep", nguon: "con" }] };
coBan["POST luat"] = (b) => ({ muc: b?.muc ?? "x", truoc: null });
coBan["POST con/c2/khoa"] = { ok: true };
// Bill xin thêm 15 phút (y2, đã có) + xin mở YouTube 30 phút (ngoại lệ một app — phải «Xem rồi cho», không cho mù)
coBan["GET cho-duyet"] = { ...coBan["GET cho-duyet"], yeuCau: [...coBan["GET cho-duyet"].yeuCau,
  { ...yc("y3", "ngoai_le", { phut: 30, gia_tri: "YouTube", ly_do: "Con xem video bài hát", created_at: luc(6) }), pham_vi: "app" }] };
coBan["GET yeu-cau/y3"] = { ...yc("y3", "ngoai_le", { phut: 30, gia_tri: "YouTube", ly_do: "Con xem video bài hát" }), pham_vi: "app", soDu: 32, giaPhut: 1,
  xemTruoc: { mucCanhBao: "khong", soTuan: 1, cau: null }, ngoaiLeTheoNguoi: [], sao: 32, phutDoiDuoc: 30 };
coBan["POST yeu-cau/y2/dong-y"] = { ngoaiLe: false, grantId: "g2" };
coBan["POST yeu-cau/y2/tu-choi"] = { ok: true };
coBan["POST them-gio/g2/hoan-tac"] = { ok: true };
const TV_MOT_MINH = { ...coBan["GET thanh-vien"], ds: [coBan["GET thanh-vien"].ds[0]], loiMoi: [] };
// ---------------------------------------------------------------- thiết kế chốt 14/11: danh mục việc (server/lib/danh-muc-viec.ts), thư viện quà, app máy thứ hai
const viecDm = (ma, ten, sao, bangChung, hinh, daCo = false) => ({ ma, ten, sao, tu12: false, bangChung, hinh, daCo });
coBan["GET nhiem-vu/danh-muc"] = { muc: [
  { ma: "hoc", ten: "Học", soViec: 3, chuDe: [{ ma: "doc", ten: "Đọc và học bài", viec: [viecDm("hoc_1", "Đọc sách 20 phút", 10, "ghi_am", "sach"),
    viecDm("hoc_5", "Học 1 bài với AiiRob", 20, "tu_dong", "rob"), viecDm("hoc_2", "Làm xong bài tập về nhà trước giờ chơi", 10, "anh", "sach", true)] }] },
  { ma: "van_dong", ten: "Vận động", soViec: 2, chuDe: [{ ma: "the_duc", ten: "Thể dục", viec: [viecDm("vd_1", "Nhảy dây 100 cái", 10, "xong", "chay"), viecDm("vd_2", "Tập thể dục 30 phút", 10, "anh", "chay")] }] },
  { ma: "giup_ba_me", ten: "Giúp Ba Mẹ", soViec: 3, chuDe: [{ ma: "bep", ten: "Bếp núc", viec: [viecDm("giup_1_3", "Nấu cơm bằng nồi cơm điện (đong gạo, vo gạo, bấm nút)", 15, "anh", "bat"),
    viecDm("giup_1_4", "Rửa bát", 10, "anh", "bat")] }, { ma: "nha", ten: "Nhà cửa", viec: [viecDm("giup_2_1", "Dọn phòng", 10, "anh", "choi")] }] }] };
coBan["POST nhiem-vu/danh-muc"] = (b) => ({ taoMoi: b?.viec?.length ?? 0, ids: (b?.viec ?? []).map((_, i) => `t-dm${i}`), boQua: 0 });
const mauQua = (ma, ten, sao, loai, menhGia = null, o = {}) => ({ ma, ten, moTa: null, hinh: null, sao, loai, menhGia, chiCuoiTuan: false, tonKho: null, canXacNhan: true, daCo: false, ...o });
coBan["GET qua/thu-vien"] = { nhom: [
  { ma: "ba_me_mua", ten: "Quà Ba Mẹ mua", phu: "trả tiền", ds: [mauQua("aiicafe_20k", "AiiCafe 20k", 200, "voucher", 20000), mauQua("aiicafe_50k", "AiiCafe 50k", 500, "voucher", 50000),
    mauQua("sach_aiilab", "Sách AiiLab con chọn", 150, "voucher", 60000), mauQua("lego", "Bộ Lego", 800, "qua_vat_ly")] },
  { ma: "qua_nha", ten: "Quà nhà", phu: "không tốn tiền", ds: [mauQua("chon_mon", "Chọn món bữa tối", 50, "dac_quyen", null, { daCo: true }), mauQua("an_kem", "Đi ăn kem", 100, "dac_quyen"),
    mauQua("xem_phim", "Đi xem phim cuối tuần", 300, "dac_quyen", null, { chiCuoiTuan: true })] }] };
coBan["POST qua/thu-vien"] = (b) => ({ taoMoi: b?.mau?.length ?? 0, ids: [] });
coBan["GET may/m2/ung-dung"] = { ...coBan["GET may/m1/ung-dung"], capNhatLuc: null, ds: [] };

// ---------------------------------------------------------------- PR #253 nối app: khoá riêng máy, xoá hồ sơ Con, «Trao luôn», hộp thư hỗ trợ (lib/noi-1411)
for (const k of ["GET con/c1", "GET con/c2"]) for (const m of coBan[k].may) m.khoaMay = { khoa: false, den: null };
const khoaMayGia = (b) => ({ khoa: b?.khoa === true, den: b?.khoa && b?.den ? (b.den === "sang" ? luc(-600) : b.den) : null });
coBan["POST may/m1/khoa"] = khoaMayGia; coBan["POST may/m2/khoa"] = khoaMayGia;
/** GET con/c1 với Laptop (m1) đang khoá riêng tới 1 giờ nữa. */
const CON_KHOA_M1 = { "GET con/c1": { ...conCt("c1", KEN), may: conCt("c1", KEN).may.map((m) => ({ ...m, khoaMay: m.id === "m1" ? { khoa: true, den: luc(-60) } : { khoa: false, den: null } })) } };
coBan["POST con/c1/xoa"] = (b) => b?.xacNhan === true
  ? { ok: true, ten: KEN, mayChuyenDungChung: [{ id: "m1", ten: `Laptop của ${KEN} · Windows 11` }, { id: "m2", ten: `iPad của ${KEN}` }] }
  : { status: 400, body: { error: "can_xac_nhan", message: "Xác nhận xoá hồ sơ (gửi xacNhan: true)" } };
coBan["POST may/m1/gan-con"] = { ok: true }; coBan["POST may/m2/gan-con"] = { ok: true };
const XOA_CON_MAY = { "POST con/c1/xoa": { status: 409, body: { error: "con_may", message: "Nhà còn 2 máy đã ghép: Laptop, iPad. Bảo Anh là bé cuối — gỡ máy trước" } } };
const XOA_CON_MANG = { "POST con/c1/xoa": { status: 409, body: { error: "con_thiet_bi_mang", message: "Bảo Anh còn 1 thiết bị lọc mạng: TV phòng khách." } } };
// ---- #267 một máy nhiều Con (docs/API.md mục #267): «Máy cả nhà» (m4, Windows, dùng chung Bảo Anh + Bill, Bill đang dùng Roblox), iPad (m2) chỉ một bé.
// Để riêng (MAY_CHUNG) — dữ liệu chung giữ 3 máy (kịch bản xoá tài khoản đếm «3 máy»).
const cn = (id) => (id === "c1" ? { id: "c1", ten: KEN, avatar: "mau-0" } : { id: "c2", ten: BILL, avatar: "mau-1" });
const M4 = { ...coBan["GET tuan-thu"].ds[0], id: "m4", ten: "Máy cả nhà", con: null, dungChung: true, lanCuoi: luc(1), conDs: [cn("c1"), cn("c2")], dangDung: { ...cn("c2"), tu: luc(40) },
  soCon: 2, motCon: false, khoaMay: { khoa: false, den: null }, baMeDungDen: null };
const conMayGia = (c, o = {}) => ({ ...cn(c), coPin: true, gan: true, dangDung: false, sao: 30, phutHomNay: 0, lanCuoi: null, khoaCon: { khoa: false, den: null }, mayKhac: [], ganDuoc: true, ...o });
const M4_CON = { may: { id: "m4", ten: "Máy cả nhà", nen: "windows", motCon: false, soCon: 2, mayChung: true, mayRieng: false }, dangDung: { ...cn("c2"), tu: luc(40), phutHomNay: 39 },
  baMeDungDen: null, khoaMay: { khoa: false, den: null }, ds: [
    conMayGia("c1", { sao: -20, lanCuoi: luc(120), mayKhac: [{ id: "m1", ten: "Laptop của Bảo Anh · Windows 11", nen: "windows", rieng: true }, { id: "m2", ten: "iPad của Bảo Anh", nen: "ios", rieng: true }] }),
    conMayGia("c2", { dangDung: true, sao: 25, phutHomNay: 39, lanCuoi: luc(40), mayKhac: [{ id: "m3", ten: "Laptop của Bill", nen: "windows", rieng: true }] })] };
const datConM4 = (ds) => ({ ...M4_CON, may: { ...M4_CON.may, soCon: ds.length, mayChung: ds.length >= 2, mayRieng: ds.length === 1 }, ds: M4_CON.ds.map((c) => ({ ...c, gan: ds.includes(c.id) })) });
const MAY_CHUNG = {
  "GET tuan-thu": { ds: [...coBan["GET tuan-thu"].ds.map((m) => ({ ...m, conDs: [cn(m.con)], dangDung: m.id === "m1" ? cn("c1") : null, soCon: 1, motCon: m.nen === "ios",
    khoaMay: { khoa: false, den: null } })), M4] },
  "GET may/m4/tuan-thu": { ...M4, daDongBo: true, dangGo: null, coTheXoaHan: false, moDen: null, suKien: [], tungCon: M4_CON.ds },
  "GET may/m4/con": M4_CON,
  "GET may/m2/con": { may: { id: "m2", ten: "iPad của Bảo Anh", nen: "ios", motCon: true, soCon: 1, mayChung: false, mayRieng: true }, dangDung: null, baMeDungDen: null,
    khoaMay: { khoa: false, den: null }, ds: [conMayGia("c1", { sao: -20 }), conMayGia("c2", { gan: false, sao: 25, ganDuoc: false,
      lyDo: "iPhone, iPad chỉ dùng cho một bé: hệ điều hành của Apple không cho đổi người dùng trên máy. Muốn bé khác dùng, gỡ máy rồi ghép lại cho bé đó." })] },
  "POST may/m4/con": (b) => (!b?.ds?.length ? { status: 400, body: { error: "can_mot_con", message: "Máy cần ít nhất một bé. Muốn bỏ hẳn: gỡ máy." } } : { ok: true, them: [], bo: [], ...datConM4(b.ds) }),
  "POST may/m4/con/c1/bo": datConM4(["c2"]), "POST may/m4/con/c1/gan": datConM4(["c1", "c2"]),
  "POST may/m4/khoa": (b) => ({ khoa: b?.khoa === true, den: null }),
  "GET phien-dang": { ds: [...coBan["GET phien-dang"].ds, { id: "p4", con: "c2", tenCon: BILL, may: "Máy cả nhà", muc: "roblox.exe", tenApp: "Roblox", tam: false, conPhut: 25 }] },
  "GET gia-dinh": { ...coBan["GET gia-dinh"], con: coBan["GET gia-dinh"].con.map((c) => ({ ...c, soDu: c.id === "c1" ? -20 : 25 })) },
};
// kho quà có Lego (quà Ba Mẹ mua — trao luôn được) + voucher AiiCafe 20k (409 voucher_can_thanh_toan) đã áp cho c1
const QUA_KHO = {
  "GET qua": { ds: [...coBan["GET qua"].ds, { id: "q4", mau: "lego", ten: "Bộ Lego", loai: "qua", diem: 800, menh_gia: null, ton_kho: 1, toi_da_thang: null, chi_cuoi_tuan: false, bat: true, ap_cho: null },
    { id: "q5", mau: "aiicafe_20k", ten: "AiiCafe 20k", loai: "voucher", diem: 200, menh_gia: 20000, ton_kho: null, toi_da_thang: null, chi_cuoi_tuan: false, bat: true, ap_cho: ["c1"] }] },
  "GET qua/thu-vien": { nhom: coBan["GET qua/thu-vien"].nhom.map((n) => ({ ...n, ds: n.ds.map((x) => (["lego", "aiicafe_20k"].includes(x.ma) ? { ...x, daCo: true } : x)) })) },
  "POST qua/q4/trao-luon": { ok: true, phieu: "r-tl", trangThai: "da_trao", saoTru: 0 },
  "POST qua/q5/trao-luon": { status: 409, body: { error: "voucher_can_thanh_toan", message: "Voucher AiiCafe chưa trao luôn được" } },
};
const htDong = (family_id, ten, nguoi_gui, noi_dung, cho_phut, o = {}) => ({ family_id, ten, tu: "ba_me", noi_dung, created_at: luc(cho_phut ?? 300), chua_tra_loi: cho_phut !== null,
  nguoi_gui, cho_tu: cho_phut === null ? null : luc(cho_phut), cho_phut, gap: cho_phut !== null && cho_phut >= 30, nguoi_tra_loi: null, cua_toi: false, ...o });
coBan["GET admin/ho-tro"] = { soCho: 4, soGap: 2, ds: [htDong("f1", "Nhà Bảo Anh", "Bà Hoa", "Máy Laptop không hiện bảo vệ", 42),
  htDong("f2", "Nhà Gia Huy", "Ba Tuấn", "Không nhận được lời mời vào nhà", 35), htDong("f3", "Nhà Mẹ Lan", "Mẹ Lan", "iPad báo «cần sửa», làm sao ạ?", 12),
  htDong("f4", "Nhà Bé Na", "Cô Ngọc", "Đổi sao ra phút ở đâu ạ?", 5)] };
coBan["GET admin/ho-tro?loc=cua_toi"] = { soCho: 4, soGap: 2, ds: [htDong("f5", "Nhà Bé Bi", "Ba Minh", "AiiGrow đã cộng giúp 10 phút rồi ạ", null, { tu: "aiilab", cua_toi: true, nguoi_tra_loi: "admin-app:p1" })] };
coBan["GET admin/ho-tro/f1"] = { ten: "Nhà Bảo Anh", tin: [{ id: "h1", tu: "ba_me", noi_dung: "Máy Laptop không hiện bảo vệ", created_at: luc(42), ten_nguoi: "Bà Hoa" }] };

// ---------------------------------------------------------------- «App & web» 15/11 (#262 / #258 — docs/API.md «App & web 15/11»): danh sách trắng 2 nhóm,
// lời xin 3 cách trả lời (Tính phút / Không tính phút / Bỏ qua + Hoàn tác 60 giây), «Lời xin đã bỏ qua» + «Thêm luôn»
const hangDs = (ten, kieu, nhom, muc, phutHomNay = 0, o = {}) => ({ ten, kieu, nhom, muc, phutHomNay, theoCaNha: false, ...o });
const XIN_YT = { id: "y5", loai: "cai_app", kieu: "app", muc: "YouTube", ten: "YouTube", lyDo: "Con xem video hướng dẫn vẽ ạ", luc: luc(20), may: "Laptop của Bảo Anh" };
const dsCon = (id, ten, o = {}) => ({
  con: { id, ten }, cheDo: "theo_danh_sach", cheDoChan: "chi_app_duoc_phep", tenCheDo: "Theo danh sách", tamNghi: false,
  app: { tinhPhut: [hangDs("Roblox", "app", "tinh_phut", ["roblox.exe", "robloxplayerbeta.exe", "com.roblox.client"], 39), hangDs("Netflix", "app", "tinh_phut", ["netflix.exe"], 20)],
    khongTinhPhut: [hangDs("Học với AiiRob", "app", "khong_tinh_phut", ["aiirob.exe"], 40), hangDs("Khan Academy", "app", "khong_tinh_phut", ["org.khanacademy.android"], 25, { theoCaNha: true })] },
  web: { tinhPhut: [hangDs("youtube.com", "web", "tinh_phut", ["youtube.com"], 18)],
    khongTinhPhut: [hangDs("khanacademy.org", "web", "khong_tinh_phut", ["khanacademy.org"], 25), hangDs("scratch.mit.edu", "web", "khong_tinh_phut", ["scratch.mit.edu"], 15)] },
  soMuc: { app: 4, web: 3, tinhPhut: 3 }, dangXin: id === "c1" ? [XIN_YT] : [], boQua: { so: 2 }, nhom: [{ ma: "tinh_phut", ten: "Tính phút" }, { ma: "khong_tinh_phut", ten: "Không tính phút" }], ...o });
for (const [id, ten] of [["c1", KEN], ["c2", BILL]]) {
  coBan[`GET con/${id}/danh-sach`] = dsCon(id, ten);
  coBan[`POST con/${id}/che-do`] = (b) => ({ cheDo: b?.cheDo, cheDoChan: b?.cheDo === "mo_het" ? "mo_het" : "chi_app_duoc_phep", ten: b?.cheDo === "mo_het" ? "Mở hết" : "Theo danh sách" });
  coBan[`POST con/${id}/danh-sach`] = (b) => ({ daDat: (b?.ds ?? [b]).map((x) => ({ ten: x.ten ?? x.ma ?? x.muc, muc: [x.muc ?? x.ma ?? x.ten], nhom: x.nhom })), choKhop: [] });
  coBan[`POST con/${id}/danh-sach/doi`] = (b) => ({ muc: [].concat(b?.muc ?? []), nhom: b?.nhom });
  coBan[`POST con/${id}/danh-sach/bo`] = (b) => ({ bo: [].concat(b?.muc ?? []).length });
}
// lời xin YouTube chỉ thêm vào cho-duyet ở kịch bản / màn App & web (không đổi «mục gấp nhất» của Trang chủ trong kịch bản khác)
const CHO_DUYET_Y5 = () => ({ ...coBan["GET cho-duyet"], yeuCau: [...coBan["GET cho-duyet"].yeuCau,
  { ...yc("y5", "cai_app", { child_id: "c1", ten_con: KEN, phut: null, gia_tri: "YouTube", ly_do: "Con xem video hướng dẫn vẽ ạ", created_at: luc(20) }), device_id: "m1" }] });
coBan["GET yeu-cau/y5"] = { ...yc("y5", "cai_app", { child_id: "c1", ten_con: KEN, phut: null, gia_tri: "YouTube", ly_do: "Con xem video hướng dẫn vẽ ạ" }), soDu: 155 };
coBan["POST yeu-cau/y5/dong-y"] = (b) => ({ ngoaiLe: false, nhom: b?.nhom, muc: "youtube.exe" });
coBan["POST yeu-cau/y5/bo-qua"] = () => ({ ok: true, trangThai: "bo_qua", hoanTacDen: new Date(Date.now() + 60_000).toISOString() });
coBan["POST yeu-cau/y5/hoan-tac"] = { ok: true };
coBan["GET yeu-cau/bo-qua"] = { ds: [
  { id: "y7", con: "c1", tenCon: KEN, loai: "cai_app", kieu: "app", muc: "Minecraft", ten: "Minecraft", lyDo: null, luc: luc(60 * 24 + 30), nguoiBoQua: "Mẹ Lan", may: "Laptop" },
  { id: "y8", con: "c1", tenCon: KEN, loai: "mo_web", kieu: "web", muc: "tiktok.com", ten: "tiktok.com", lyDo: null, luc: luc(60 * 72), nguoiBoQua: "Mẹ Lan", may: "Laptop" }] };
coBan["GET yeu-cau/bo-qua?con=c1"] = coBan["GET yeu-cau/bo-qua"];
coBan["POST yeu-cau/y7/them-luon"] = (b) => ({ ok: true, nhom: b?.nhom, muc: "minecraft.exe" });
coBan["POST yeu-cau/y8/them-luon"] = (b) => ({ ok: true, nhom: b?.nhom, muc: "tiktok.com" });
coBan["POST may/m1/ung-dung/dat"] = (b) => ({ muc: kb["GET may/m1/ung-dung"].ds.find((x) => x.khoa === b?.khoa)?.muc ?? "x", con: "c1", truoc: null });
// ---------------------------------------------------------------- Sổ sao 15/11 (#263–#266, máy chủ PR #269 — docs/API.md «Sổ sao 15/11»): vay sao, số dư âm, 1 sao = 1 phút
/** Trạng thái sao (so-sao.ts › tinhTrangThai): `tong` = sao tiêu được, `no` = nợ. */
const saoGia = (tong, no, o = {}) => ({ sao: tong - no, no, phutCon: Math.max(0, tong), saoVayChuaTieu: Math.min(Math.max(0, tong), no), hetSao: tong <= 0, canhBaoNo: no > 1000, tongVay: no, daTraNo: 0, ...o });
const SAO_C1 = saoGia(0, 20), SAO_C2 = saoGia(35, 0);
/** Nhà có sổ sao: Bảo Anh (c1) tiêu hết, đang nợ 20 (−20 sao) · Bill (c2) 35 sao, không nợ. Kịch bản sổ sao trộn vào `kb` (dữ liệu chung giữ nguyên cho kịch bản cũ). */
const SO_SAO = {
  "GET gia-dinh": { ...coBan["GET gia-dinh"], con: coBan["GET gia-dinh"].con.map((x) => (x.id === "c1" ? { ...x, ...SAO_C1, soDu: 0 } : { ...x, ...SAO_C2, soDu: 35 })) },
  "GET con/c1/quy": { quy: quyGia(0, 0, { tongPhut: 0, daDung: 42 }), sao: -20, soSao: SAO_C1, ngoaiLe: [] },
  "GET con/c2/quy": { quy: quyGia(35, 35), sao: 35, soSao: SAO_C2, ngoaiLe: [] },
  "GET con/c1/vi": { ...coBan["GET con/c1/vi"], ...SAO_C1, soDu: 0 },
  "GET con/c1/bao-cao": { ...coBan["GET con/c1/bao-cao"], tuanNay: { ...coBan["GET con/c1/bao-cao"].tuanNay, saoKiem: 120, saoVay: 45, lanVay: 2, saoTieu: 435, saoTieuChoi: 385,
    saoTieuQua: 50, saoTraNo: 25, xinVay: { so: 3, cho: 2 } } },
  "GET nhat-ky": { soNgay: 7, choVay: { so: 4, sao: 75, theoNguoi: [{ ten: "Bà Hoa", so: 3, sao: 60 }, { ten: "Mẹ Lan", so: 1, sao: 15 }] },
    ds: [{ luc: luc(30), ngay: "2026-11-15", con: "c1", tenCon: KEN, nguoi: "p3", tenNguoi: "Bà Hoa", tieu: "Bà Hoa cho vay 30 sao", phu: "Laptop", nhan: "Cho vay", kieu: "ngoai", delta: null }] },
};
const xemTruocGia = (st, ten) => ({ ten, soSao: 15, mucVay: [10, 15, 30], macDinh: 15, ...st, noSau: st.no + 15, cau: `= 15 phút chơi hoặc đổi quà · ${ten} sẽ nợ ${st.no + 15} sao`,
  nhacNo: st.no > 1000 ? `${ten} đã nợ quá 1.000 sao (đang nợ ${st.no.toLocaleString("en-US").replace(/,/g, ".")})` : null, seCanhBao: st.no + 15 > 1000 });
coBan["GET con/c1/cho-vay/xem-truoc"] = xemTruocGia(SAO_C1, KEN);
coBan["GET con/c2/cho-vay/xem-truoc"] = xemTruocGia(SAO_C2, BILL);
coBan["POST con/c1/cho-vay"] = (b) => ({ id: "v1", soSao: b?.soSao ?? 15, ...saoGia(b?.soSao ?? 15, 20 + (b?.soSao ?? 15)), canhBaoNo: null });
coBan["POST con/c2/cho-vay"] = (b) => ({ id: "v2", soSao: b?.soSao ?? 15, ...saoGia(35 + (b?.soSao ?? 15), b?.soSao ?? 15), canhBaoNo: null });
coBan["POST vay/v1/hoan-tac"] = { ok: true, soSaoHoan: 30, tron: true, ...SAO_C1 };
coBan["POST vay/v4/hoan-tac"] = { ok: true, soSaoHoan: 20, tron: true, ...SAO_C1 };
coBan["GET con/c1/vi-sao"] = { ten: KEN, ...SAO_C1, tongVay: 45, daTraNo: 25, saoGiu: 0, tyLe: { sao: 1, phut: 1 }, phutChoiHomNay: 42,
  cau: { soDu: "−20 sao", phut: "Hết sao — xin Ba Mẹ cho vay sao nhé", no: "Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước" },
  bayNgay: { saoKiem: 120, saoVay: 45, lanVay: 2, saoTraNo: 25, saoTieu: 140, saoTieuChoi: 90, saoTieuQua: 50, phutChoi: 90 },
  lichSu: [
    { id: "p1", delta: 10, loai: "nhiem_vu", kieu: "kiem", lyDo: "Nhiệm vụ Tự xếp cặp", nguoi: "p1", tenNguoi: "Mẹ Lan", luc: luc(30) },
    { id: "p2", delta: -10, loai: "tra_no", kieu: "tra_no", lyDo: "Trả nợ 10 sao · Nhiệm vụ Tự xếp cặp", nguoi: "p1", tenNguoi: "Mẹ Lan", luc: luc(30) },
    { id: "p3", delta: -20, loai: "choi", kieu: "choi", lyDo: "Chơi YouTube 20 phút", nguoi: null, tenNguoi: null, luc: luc(60) },
    { id: "p4", delta: 15, loai: "vay", kieu: "vay", lyDo: "Ba Mẹ cho vay 15 sao · chơi", nguoi: "p1", tenNguoi: "Mẹ Lan", luc: luc(90) },
    { id: "p5", delta: -50, loai: "doi_qua", kieu: "doi_qua", lyDo: "Đổi «Chọn món bữa tối»", nguoi: null, tenNguoi: null, luc: luc(1500) }] };
coBan["GET con/c2/vi-sao"] = { ...coBan["GET con/c1/vi-sao"], ten: BILL, ...SAO_C2, tongVay: 0, daTraNo: 0, cau: { soDu: "35 sao", phut: "còn 35 sao = 35 phút chơi", no: null },
  bayNgay: { saoKiem: 250, saoVay: 0, lanVay: 0, saoTraNo: 0, saoTieu: 230, saoTieuChoi: 230, saoTieuQua: 0, phutChoi: 230 }, lichSu: [] };
/** Lời xin vay của Bảo Anh (c1, hết sao, đang nợ 20) — loai mới vay_sao, phut = số sao xin. */
const YC_VAY = { ...yc("y4", "vay_sao", { child_id: "c1", ten_con: KEN, phut: 20, ly_do: "Con làm xong bài rồi ạ", created_at: luc(4) }), muc_dich: "choi" };
coBan["GET yeu-cau/y4"] = { ...YC_VAY, trang_thai: "cho", soDu: 0, laVay: true, soSao: 20, mucDich: "choi", qua: null, ...SAO_C1, xemTruoc: { ...xemTruocGia(SAO_C1, KEN), nhacNo: null } };
coBan["POST yeu-cau/y4/dong-y"] = (b) => ({ ngoaiLe: false, grantId: "v4", vay: { id: "v4", soSao: b?.soSao ?? 20, ...saoGia(b?.soSao ?? 20, 20 + (b?.soSao ?? 20)), canhBaoNo: null } });
coBan["POST yeu-cau/y4/tu-choi"] = { ok: true };
/** Kịch bản lời xin vay: chỉ lời xin y4 đang chờ. */
const CO_XIN_VAY = { ...SO_SAO, "GET cho-duyet": { ...coBan["GET cho-duyet"], yeuCau: [YC_VAY] } };
/** Nợ > 1.000: bảng cho vay có dải nhắc, cảnh báo no_qua_1000 ở Thông báo + màn «Cảnh báo nợ sao». */
const SAO_NO_LON = saoGia(0, 1020);
const CANH_NO = { id: "a9", child_id: "c1", loai: "no_qua_1000", muc: "chu_y", noi_dung: `${KEN} đã nợ quá 1.000 sao (đang nợ 1.020)`, chi_tiet: { no: 1020, no_truoc: 990, vuot_moc: true },
  da_doc: false, created_at: luc(5) };
const NO_LON = { ...SO_SAO,
  "GET con/c1/cho-vay/xem-truoc": xemTruocGia(SAO_NO_LON, KEN),
  "GET con/c1/vi-sao": { ...coBan["GET con/c1/vi-sao"], ...SAO_NO_LON, bayNgay: { ...coBan["GET con/c1/vi-sao"].bayNgay, saoVay: 180, saoTraNo: 40 } },
  "GET canh-bao": { ds: [CANH_NO, ...coBan["GET canh-bao"].ds] }, "POST canh-bao/a9/doc": { ok: true },
  "GET thong-bao": { ...coBan["GET thong-bao"], ds: [tbDong("a:a9", "canh_bao_no", CANH_NO.noi_dung, `Cảnh báo · ${KEN}`, 5, { muc: "chu_y", moi: true, den: "/canh-bao/a9" }),
    ...coBan["GET thong-bao"].ds] },
};
/** Máy của Bảo Anh đang khoá (Ba Mẹ khoá tới 20:10) — lời xin chơi hiện «Xin mở khoá máy». */
const MAY_KHOA = { ...CO_XIN_VAY, "GET con/c1": { ...coBan["GET con/c1"], khoaNgay: true, khoaDen: luc(-30) }, "POST con/c1/khoa": { ok: true } };

let kb = { ...coBan };          // "METHOD đường" → dữ liệu | { status, body } | "mat_mang"
let matMang = false;
const nhatKy = [];

// ---------------------------------------------------------------- Chrome + CDP
const hoSo = mkdtempSync(join(tmpdir(), "aiig-pha-"));
const chrome = spawn(CHROME, ["--headless=new", "--use-mock-keychain", "--password-store=basic", `--remote-debugging-port=${CDP}`, `--user-data-dir=${hoSo}`, "--no-first-run",
  "--no-default-browser-check", "--window-size=420,900", "--lang=vi-VN",
  // macOS: Chrome headless có lúc coi cửa sổ là bị che (document.visibilityState «hidden») ⇒ requestAnimationFrame dừng ⇒ hiệu ứng vào của toast
  // (Reanimated) và bảng trượt (Modal slide) không chạy: toast «Đã …» không hiện, nút trong bảng trượt «bị che» (lỗi cổng 14/11). Tắt hãm nền.
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "about:blank"], { stdio: "ignore" });
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
  const url = new URL(request.url), d = url.pathname.replace(/^\/api\/(m|kid)\//, ""), qs = url.search;
  // khoá có chuỗi hỏi («GET admin/ho-tro?loc=cua_toi») thắng khoá chỉ đường dẫn; nhật ký giữ chuỗi hỏi ở `q`
  const khoa = kb[`${request.method} ${d}${qs}`] !== undefined ? `${request.method} ${d}${qs}` : `${request.method} ${d}`;
  let body = null; try { body = request.postData ? JSON.parse(request.postData) : null; } catch { /* không JSON */ }
  nhatKy.push({ m: request.method, d, q: qs, body });
  if (request.method === "OPTIONS") return goi("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: [] });
  const tl0 = matMang ? "mat_mang" : kb[khoa], tl = typeof tl0 === "function" ? tl0(body) : tl0;      // hàm: trả theo body
  if (tl === "mat_mang") return goi("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" });
  const { status, data } = tl === undefined ? { status: 404, data: { error: "khong_co_duong", message: `pha.mjs chưa giả ${khoa}` } }
    : tl && typeof tl === "object" && "status" in tl ? { status: tl.status, data: tl.body } : { status: 200, data: tl };
  if (tl === undefined) console.log("   (chưa giả)", khoa);
  goi("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(data)).toString("base64") });
};
const goi = (method, params = {}) => new Promise((r) => { cho[++so] = r; ws.send(JSON.stringify({ id: so, method, params })); });
await goi("Page.enable");
await goi("Emulation.setFocusEmulationEnabled", { enabled: true });   // trang luôn «đang được xem» (cùng lý do cờ --disable-backgrounding-occluded-windows)
await goi("Page.setWebLifecycleState", { state: "active" });
await goi("Fetch.enable", { patterns: [{ urlPattern: `${GOC}/api/*`, requestStage: "Request" }] });
await goi("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await goi("Emulation.setLocaleOverride", { locale: "vi-VN" });
const js = async (expr) => (await goi("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
// Chữ trên màn, gộp mọi khoảng trắng (xuống dòng, nbsp) thành một dấu cách: tiêu đề thiết kế 14/11 hay ngắt <br> giữa câu
// («Đã cho Bill<br>thêm 15 phút chơi») ⇒ so chữ theo câu, không phụ thuộc chỗ xuống dòng.
const chu = () => js(`document.body.innerText.replace(/\\s+/g, " ")`);
const di = async (duong, token = "tok-thu") => {
  await goi("Page.navigate", { url: `${GOC}/chao` });
  await sleep(300);
  await js(token ? `localStorage.setItem("aiig_bm", ${JSON.stringify(token)})` : `localStorage.clear()`);
  await goi("Page.navigate", { url: `${GOC}${duong}` });
};
const doi = async (txt, ms = 8000) => { for (let t = 0; t < ms; t += 250) { if ((await chu())?.includes(txt)) return true; await sleep(250); } return false; };
/** Tìm phần tử (biểu thức JS trả về element) rồi CHỜ nó đứng yên: cuộn vào giữa, đo hai lần cách 120ms trùng nhau và điểm giữa
 * đúng là nó (elementFromPoint) — hết hiệu ứng vào (FadeInDown/LinearTransition) và không bị lớp khác che. Máy tải nặng thì hiệu ứng
 * chạy chậm: đo một lần rồi bấm sẽ trúng chỗ khác (lỗi 24/10: bấm «Duyệt» lại trúng thân dòng ⇒ mở màn Chờ duyệt). */
const viTriYen = async (timEl, ms = 8000) => {
  // cuộn vào GIỮA mỗi lượt đo (đứng yên thì không cuộn nữa): mép dưới có thể bị nút cố định «day» che dù vẫn trong khung nhìn
  const do1 = `(() => { const e = (${timEl})(); if (!e) return null; e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect();
    const x = b.x + b.width / 2, y = b.y + b.height / 2, t = document.elementFromPoint(x, y);
    return { x, y, w: b.width, h: b.height, trung: !!t && (e === t || e.contains(t)) }; })()`;
  let truoc = null;
  for (const het = Date.now() + ms; Date.now() < het;) {   // hạn theo đồng hồ thật: máy tải nặng thì mỗi lượt đo cũng chậm
    const r = await js(do1);
    if (r && r.trung && truoc && Math.abs(r.x - truoc.x) < 0.5 && Math.abs(r.y - truoc.y) < 0.5 && r.w === truoc.w && r.h === truoc.h) return r;
    truoc = r;
    await sleep(120);
  }
  if (truoc && !truoc.trung) console.log(`   (bấm khi điểm giữa bị che sau ${ms / 1000}s) ${timEl.slice(0, 120)}`);
  return truoc;   // hết giờ mà chưa «yên + trúng» (vd chữ bị cắt một phần mép) ⇒ bấm như cũ tại lần đo cuối, kịch bản tự báo SAI nếu trượt
};
const nhanChuot = async (r) => {
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) { await goi("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 }); await sleep(80); }
  await sleep(400);
};
/** Bấm vào chữ `txt` bằng chuột thật (CDP Input) — Pressable của react-native-web nghe pointer, không nghe .click(). */
const bam = async (txt) => {
  const r = await viTriYen(`() => [...document.querySelectorAll("div,span")].filter((e) => e.innerText?.trim() === ${JSON.stringify(txt)}).pop()`);
  if (!r) return false;
  await nhanChuot(r);
  return true;
};
/** Gõ vào ô có aria-label `nhan` (setter gốc + sự kiện input — React nhận như người gõ). */
const go = (nhan, gt) => js(`(() => { const i = [...document.querySelectorAll("input,textarea")].find((e) => e.getAttribute("aria-label") === ${JSON.stringify(nhan)});
  if (!i) return false; const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), "value").set; s.call(i, ${JSON.stringify(gt)});
  i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
/** Mở Đăng ký và điền đủ số + mật khẩu (dùng chung: ca «đã điền» của cổng giao diện và dangKyToiOtp). */
const dienDangKy = async () => {
  await di("/dang-ky", null); await doi("Tạo tài khoản Ba Mẹ");
  await go("Số điện thoại", "0912345678"); await go("Mật khẩu", "matkhau123"); await go("Nhập lại mật khẩu", "matkhau123");
};
const dangKyToiOtp = async () => { await dienDangKy(); await sleep(200); await bam("Nhận mã xác thực"); };

// ---------------------------------------------------------------- cổng chuẩn giao diện
if (process.argv.includes("--giao-dien")) {
  const { chayCong } = await import("./giao-dien.mjs");
  const M = (ten, duong, cho, tc = {}) => ({ ten, duong, cho, ...tc });
  // trình hướng dẫn Lần đầu giữ Con vừa tạo + lựa chọn trong sessionStorage (lib/thiet-lap.ts) ⇒ đặt sẵn như đã qua bước tên con / giờ chơi
  const TL = { conId: "c1", tenCon: "Bảo Anh", namSinh: 2017, mau: 0, daLuu: [{ id: "c1", ten: "Bảo Anh", mau: 0, namSinh: 2017 }], cheDoChan: "chi_app_duoc_phep", quy: 60,
    ngu: { tu: "21:30", den: "06:30" }, apps: [{ ma: "minecraft", ten: "Minecraft" }, { ma: "zoom", ten: "Zoom" }, { ten: "Vẽ tranh Paint", tinhGio: false }] };
  const diTl = (duong) => async () => { await di("/chao"); await js(`sessionStorage.setItem("aiigrow.thiet-lap", ${JSON.stringify(JSON.stringify(TL))})`);
    await goi("Page.navigate", { url: `${GOC}${duong}` }); };
  // Xoá tài khoản ở màn «Tài khoản của bạn» (thiết kế 14/11 bm-ca-nha/08 → 11), không còn ở tab Cả nhà
  const moXoaTk = async () => { await di("/tai-khoan"); await doi("Xoá hẳn, không lấy lại được"); await sleep(300); await bam("Xoá tài khoản"); };
  // nút «Xoá hồ sơ <tên>» (lượt chữ dài đổi tên con ⇒ không bấm theo KEN): lá chữ cuối bắt đầu «Xoá hồ sơ », không phải tiêu đề «…?»
  const bamXoaHs = async () => nhanChuot(await viTriYen(`() => [...document.querySelectorAll("div,span")].filter((e) => !e.children.length
    && e.innerText?.trim().startsWith("Xoá hồ sơ ") && !e.innerText.trim().endsWith("?") && e.getBoundingClientRect().width > 0).pop()`));
  const dsMan = [
    // Lần đầu (bm-lan-dau, bm-ghep-may — L7, L8)
    M("bm-chao", "/chao", "Bắt đầu cho con nhà mình", { token: null }),
    M("bm-dang-ky", "/dang-ky", "Tạo tài khoản Ba Mẹ", { token: null }),
    M("bm-dang-ky (đã điền · bm1-dang-ky)", "/dang-ky", "Đã khớp", { token: null, truoc: dienDangKy }),
    M("bm-dang-ky (số đã có tài khoản · them-ahk69dtl)", "/dang-ky", "Số này đã có tài khoản", { token: null,
      kb: { "POST otp": { status: 409, body: { error: "da_co_tai_khoan", message: "Số này đã có tài khoản" } } }, truoc: dangKyToiOtp }),
    M("bm-otp", "/otp", "Nhập mã xác thực", { truoc: dangKyToiOtp }),
    // đúng ca bàn bm1-otp v7: đã gõ «4820», ô thứ 5 đang chọn
    M("bm-otp (đang gõ · bm1-otp)", "/otp", "Nhập mã xác thực", { truoc: async () => { await dangKyToiOtp(); await doi("Nhập mã xác thực"); await go("Mã xác thực 6 số", "4820"); } }),
    M("dang-nhap", "/dang-nhap", "Chào Ba Mẹ!", { token: null, kb: { "GET cau-hinh-dang-nhap": { google: true, facebook: true } } }),
    M("bm-quen-mat-khau", "/quen-mat-khau", "Quên mật khẩu", { token: null }),
    // đúng ca bàn: them-2g3zpiie v4 đã gửi mã + gõ «482»; them-6aomy24b v8 hai ô mật khẩu đã khớp
    M("bm-quen-mat-khau (đã gửi mã · them-2g3zpiie)", "/quen-mat-khau", "Đã gửi mã", { token: null, truoc: async () => { await di("/quen-mat-khau", null); await doi("Quên mật khẩu");
      await go("Số điện thoại", "0912345678"); await sleep(200); await bam("Gửi mã"); await doi("Đã gửi mã"); await go("Mã xác thực 6 số", "482"); } }),
    M("bm-dat-mat-khau (đã khớp · them-6aomy24b)", "/quen-mat-khau", "Đã khớp", { token: null, truoc: async () => { await di("/quen-mat-khau", null); await doi("Quên mật khẩu");
      await go("Số điện thoại", "0912345678"); await sleep(200); await bam("Gửi mã"); await doi("Đã gửi mã"); await go("Mã xác thực 6 số", "482017"); await sleep(200);
      await bam("Xác nhận mã"); await doi("Đặt mật khẩu mới"); await go("Mật khẩu mới", "matkhau456"); await go("Nhập lại mật khẩu mới", "matkhau456"); } }),
    M("dang-nhap (đã điền · bm1-dang-nhap)", "/dang-nhap", "Đăng nhập vào nhà mình", { token: null, kb: { "GET cau-hinh-dang-nhap": { google: true, facebook: true } }, truoc: async () => { await di("/dang-nhap", null); await doi("Chào Ba Mẹ!");
      await go("Số điện thoại", "0912345678"); await go("Mật khẩu", "matkhau123"); } }),
    // máy chủ báo bật Google / Facebook (nút chỉ hiện khi bản dựng có EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / EXPO_PUBLIC_FACEBOOK_APP_ID — bm1-chao)
    M("bm-tao-tai-khoan", "/tao-tai-khoan", "Tạo tài khoản", { token: null, kb: { "GET cau-hinh-dang-nhap": { google: true, facebook: true } } }),
    M("bm-ob-con", "/thiet-lap/ten-con", "Tên gọi ở nhà"),
    // đúng ca bàn bm1-ob-ten-con v20: đã gõ tên «Bảo Anh», PIN gõ 2 số
    M("bm-ob-con (đã điền · bm1-ob-ten-con)", "/thiet-lap/ten-con", "Lưu hồ sơ Bảo Anh", { truoc: async () => { await diTl("/thiet-lap/ten-con")(); await doi("Tên gọi ở nhà");
      await go("Tên gọi ở nhà", "Bảo Anh"); await go("Đặt PIN 4 số", "25"); } }),
    M("bm-ob-con (bảng năm sinh · them-hjjdppuw)", "/thiet-lap/ten-con", "Chọn 20", { truoc: async () => { await diTl("/thiet-lap/ten-con")(); await doi("Tên gọi ở nhà");
      await nhanChuot(await viTriYen(`() => document.querySelector('[aria-label^="Chọn năm sinh của con"]')`)); } }),
    M("bm-ob-qua (them-s416tfdj)", "/thiet-lap/qua", "Voucher AiiCafe", { truoc: diTl("/thiet-lap/qua") }),
    M("bm-ob-qua (Ba Mẹ tự điền · them-x9x2u07e)", "/thiet-lap/qua", "Quà Ba Mẹ đã điền", { truoc: async () => { await diTl("/thiet-lap/qua")(); await doi("Voucher AiiCafe");
      await bam("✏️ Ba Mẹ tự điền"); } }),
    M("bm-ob-qua-mua (them-hn2754ce)", "/thiet-lap/qua-mua?ma=cafe50", "Số lượng", { truoc: diTl("/thiet-lap/qua-mua?ma=cafe50") }),
    M("bm-ob-gio", "/thiet-lap/gio", "Quà khởi đầu cho con", { truoc: diTl("/thiet-lap/gio") }),
    M("bm-ob-app", "/thiet-lap/app", "Google Classroom", { truoc: diTl("/thiet-lap/app") }),
    M("bm-ob-app (mở hết)", "/thiet-lap/app", "Tiếp: ghép máy của con", { truoc: async () => { await diTl("/thiet-lap/app")(); await doi("Theo danh sách"); await nhanChuot(await viTriYen(`() => document.querySelector('[role="radio"][aria-label^="Mở hết"]')`)); } }),
    M("bm-ob-them-app", "/thiet-lap/them-app", "Thêm app cho", { truoc: diTl("/thiet-lap/them-app") }),
    // them-at57ypdc v5: gõ «Duolingo» ⇒ chạm dòng ⇒ hỏi nhóm ngay dưới dòng, nút đáy «Thêm Duolingo · Không tính phút»
    M("bm-ob-them-app (đã chọn · them-at57ypdc)", "/thiet-lap/them-app", "Duolingo có tính phút không?", { truoc: async () => { await diTl("/thiet-lap/them-app")();
      await doi("Thêm app cho"); await go("Tên app", "Duolingo"); await doi("Kết quả cho");
      await nhanChuot(await viTriYen(`() => document.querySelector('[role="checkbox"][aria-label="Duolingo"]')`)); } }),
    M("bm-ob-web", "/thiet-lap/web", "vioedu.vn", { truoc: diTl("/thiet-lap/web") }),
    M("bm-ob-them-web", "/thiet-lap/them-web", "Thêm web cho", { truoc: diTl("/thiet-lap/them-web") }),
    M("bm-ob-them-web (đã chọn · them-ubomxl31)", "/thiet-lap/them-web", "có tính phút không?", { truoc: async () => { await diTl("/thiet-lap/them-web")();
      await doi("Thêm web cho"); await go("Tên hoặc link trang web", "khanacademy.org"); await doi("Kết quả cho");
      await nhanChuot(await viTriYen(`() => document.querySelector('[role="checkbox"][aria-label="khanacademy.org"]')`)); } }),
    M("bm-ob-ghep", "/thiet-lap/ghep", "quét mã này", { truoc: diTl("/thiet-lap/ghep") }),
    M("bm-ob-ghep (có tên bé · bm1-ob-ghep)", "/thiet-lap/ghep?con=c1", "Ghép máy của", { truoc: diTl("/thiet-lap/ghep?con=c1&moi=1") }),
    M("bm-ob-cho", "/thiet-lap/cho?ma=482017&con=c1", "482"),
    // them-q44uxha5 / them-ytmgijqo: mã quá 10 phút ⇒ «Mã đã hết hạn»; chờ quá 5 phút (mã còn hạn) ⇒ «Chưa thấy máy của con»
    M("bm-ob-ghep (mã hết hạn · them-q44uxha5)", "/thiet-lap/ghep", "Mã đã hết hạn", { kb: { "POST ghep-may": { ...coBan["POST ghep-may"], het: luc(1), conGiay: 0 },
      "GET ghep-may/482017": { daGhep: false, hetHan: true, conGiay: 0, con: "c1", may: null } }, truoc: diTl("/thiet-lap/ghep?con=c1&moi=1") }),
    M("bm-ob-ghep (chưa thấy máy · them-ytmgijqo)", "/thiet-lap/ghep", "Chưa thấy máy của con", { kb: { "POST ghep-may": { ...coBan["POST ghep-may"], het: luc(-4), conGiay: 240 },
      "GET ghep-may/482017": { daGhep: false, hetHan: false, conGiay: 240, con: "c1", may: null } }, truoc: diTl("/thiet-lap/ghep?con=c1&moi=1") }),
    M("bm-ob-xong (chưa ghép · them-w8q8hcfk)", "/thiet-lap/xong", "Chưa có máy nào", { kb: { "GET con/c1": { ...conCt("c1", KEN), may: [] } }, truoc: diTl("/thiet-lap/xong") }),
    M("bm-ob-da-ghep", "/thiet-lap/da-ghep?con=c1&may=m1", "đã ghép!"),
    M("bm-ob-mau", "/thiet-lap/mau", "Một ngày của", { truoc: diTl("/thiet-lap/mau") }),
    M("bm-ob-mau (bảng Ba Mẹ tự thêm · them-bwlkjyw5)", "/thiet-lap/mau", "Thêm vào mục đã chọn", { truoc: async () => { await diTl("/thiet-lap/mau")(); await doi("+ Ba Mẹ tự thêm"); await bam("+ Ba Mẹ tự thêm"); } }),
    M("bm-ob-xong", "/thiet-lap/xong", "Xong rồi!", { truoc: diTl("/thiet-lap/xong") }),
    M("bm-may-them", "/may/them?con=c1", "Máy mới"),
    // Hằng ngày (bm-hang-ngay — L2, L3, L12)
    M("bm-trang", "/hom-nay", "Cho vay sao"),
    M("bm-trang (trống)", "/hom-nay", "Chưa có con nào", { kb: { "GET gia-dinh": { ten: "Nhà", quyVoucher: 0, choDuyet: 0, canhBao: 0, con: [] } } }),
    M("bm-trang (mất mạng)", "/hom-nay", "Đang chờ mạng", { matMang: true }),
    M("bm-trang (bảng khoá máy)", "/hom-nay", "Thôi, để con chơi tiếp", { truoc: async () => { await di("/hom-nay"); await doi("Khoá máy"); await bam("Khoá máy"); } }),
    M("bm-trang (bảng cho vay sao)", "/hom-nay", "Sao nhiệm vụ của con sẽ trả nợ trước", { kb: SO_SAO, truoc: async () => { await di("/hom-nay"); await doi("Cho vay sao"); await bam("Cho vay sao"); } }),
    M("bm-trang (bảng cho vay · nợ > 1.000)", "/hom-nay", "Chỉ nhắc thôi", { kb: NO_LON, truoc: async () => { await di("/hom-nay"); await doi("Cho vay sao"); await bam("Cho vay sao"); } }),
    M("bm-trang (ví âm)", "/hom-nay", "Đang nợ Ba Mẹ 20 sao", { kb: SO_SAO }),
    M("bm-canh-bao-no", "/canh-bao/a9", "Không cản việc cho vay", { kb: NO_LON }),
    M("bm-vi (âm)", "/vi/c1", "Đang nợ Ba Mẹ 20 sao", { kb: SO_SAO }),
    M("bm-xin-vay", "/yeu-cau?con=c1", "Xin Ba Mẹ cho vay 20 sao", { kb: CO_XIN_VAY }),
    M("bm-xin-vay (chi tiết)", "/yeu-cau/y4", "Con xin vay sao", { kb: CO_XIN_VAY }),
    M("bm-trang (máy khoá · xin mở khoá)", "/hom-nay", "Xin mở khoá máy", { kb: MAY_KHOA }),
    M("bm-trang (đang khoá)", "/hom-nay", "đang khoá", { kb: { "GET con/c1": { ...conCt("c1", KEN), cheDoChan: "chi_app_duoc_phep", khoaNgay: true, khoaDen: new Date(Date.now() + 3600_000).toISOString() } } }),
    M("bm-may (theo Con)", "/may?con=c1", "Ghép thêm máy"),
    M("bm-may-chi-tiet (bảo vệ chưa đủ)", "/may/m2", "Tài khoản của Con vẫn là quản trị"),
    M("bm-an-toan-may", "/may/m1", "Đổi tên máy"),
    // PR #253 nối app (lib/noi-1411): khoá riêng máy (bm-may-con/03), xoá hồ sơ Con (bm-gio-ho-so/07), «Trao luôn» (bm-sao-qua/03), hộp thư (bm-cai-dat/13)
    M("bm-may (khoá riêng · bảng 03)", "/may/m1", "Máy khác · không đổi gì", { truoc: async () => { await di("/may/m1"); await doi("Khoá Laptop ngay"); await bam("Khoá Laptop ngay"); } }),
    M("bm-may (đang khoá riêng)", "/may/m1", "Mở khoá Laptop", { kb: CON_KHOA_M1 }),
    // #267 một máy nhiều Con (thiết kế chốt 15/11: bm2-may-ds, bm2-may-m1, them-okpa735o, them-1016dwpz, them-tmezw761, them-sll7clha, bm1-may-chon-loai)
    M("bm-may (máy chung · Tất cả)", "/may", "đang dùng:", { kb: MAY_CHUNG }),
    M("bm-may-m1 (máy chung)", "/may/m4", "Máy này ai dùng?", { kb: MAY_CHUNG }),
    M("bm-may (khoá theo máy · tmezw761)", "/may/m4", "Máy khác · không đổi gì", { kb: MAY_CHUNG, truoc: async () => { await di("/may/m4"); await doi("Khoá Máy cả nhà ngay"); await bam("Khoá Máy cả nhà ngay"); } }),
    M("bm-may (khoá theo bé · sll7clha)", "/may/m4", "Khoá theo bé", { kb: MAY_CHUNG, truoc: async () => { await di("/may/m4"); await doi("Chỉ khoá "); // lượt chữ dài đổi tên bé ⇒ bấm theo đầu chữ
      await nhanChuot(await viTriYen(`() => [...document.querySelectorAll("div,span")].filter((e) => !e.children.length && e.innerText?.trim().startsWith("Chỉ khoá ")).pop()`)); } }),
    M("bm-may-con (Máy này ai dùng?)", "/may/m4/ai-dung", "Chọn bé dùng máy này", { kb: MAY_CHUNG }),
    M("bm-may-con (iPad một bé)", "/may/m2/ai-dung", "Không thêm được", { kb: MAY_CHUNG }),
    M("bm-may-chi-tiet (Máy cả nhà)", "/may/m4/chi-tiet", "Sao của từng bé", { kb: MAY_CHUNG }),
    M("bm-may-them (2 bé · chon-loai)", "/may/them?con=c1", "Máy dùng chung · 2 bé", { truoc: async () => { await di("/may/them?con=c1"); await doi("Thêm con");
      await nhanChuot(await viTriYen(`() => document.querySelectorAll('[role="checkbox"]')[1]`)); } }),
    // #325 bm-may-con: đổi tên (them-tw6apkag máy bảo vệ · them-4e4o5c72 máy chưa bảo vệ), gỡ (them-v4ovqk42), sửa (them-slv33bgc), đổi người (them-jjrfg2hs)
    M("bm-may-doi-ten (Máy cả nhà · tw6apkag)", "/may/m4/doi-ten", "Ba Mẹ sẽ thấy máy thế này", { kb: MAY_CHUNG }),
    M("bm-may-doi-ten (iPad · 4e4o5c72)", "/may/m2/doi-ten", "Lưu tên máy", { kb: MAY_CHUNG }),
    M("bm-may-go (Máy cả nhà · v4ovqk42)", "/may/m4", "Ghép lại lúc nào cũng được", { kb: MAY_CHUNG, truoc: async () => { await di("/may/m4"); await doi("Gỡ máy này"); await bam("Gỡ máy này"); } }),
    M("bm-may-go (iPad · 18q14mik)", "/may/m2", "Ghép lại lúc nào cũng được", { kb: MAY_CHUNG, truoc: async () => { await di("/may/m2"); await doi("Gỡ máy này"); await bam("Gỡ máy này"); } }),
    M("bm-may-sua (iPad · slv33bgc)", "/may/m2/sua", "Đã làm xong, kiểm tra lại", { kb: MAY_CHUNG }),
    M("bm-may-doi-nguoi (jjrfg2hs)", "/may/m4/chi-tiet", "Phút của bé trước dừng ngay", { kb: MAY_CHUNG, truoc: async () => { await di("/may/m4/chi-tiet"); await doi("Đổi người"); await bam("Đổi người"); } }),
    M("bm-may-ghep (máy chung 2 bé)", "/thiet-lap/ghep?con=c1&conDs=c1,c2&nguon=them", "Ghép máy chung · 2 bé"),
    M("bm-may-moi (máy chung đã ghép)", "/thiet-lap/da-ghep?con=c1&may=m4&nguon=them", "Luật đi theo bé đang dùng", { kb: MAY_CHUNG }),
    M("bm-trang (bảng khoá máy · bỏ chọn iPad)", "/hom-nay", "Khoá máy tới", { truoc: async () => { await di("/hom-nay"); await doi("Khoá máy"); await bam("Khoá máy");
      await doi("Khoá bao lâu?"); // bamChon định nghĩa sau khối cổng ⇒ bấm trực tiếp bằng viTriYen + nhanChuot
      await nhanChuot(await viTriYen(`() => document.querySelector('[role="checkbox"][aria-label="Khoá iPad"]')`)); } }),
    M("bm-ho-so-xoa", "/ho-so/c1/xoa", "Xoá rồi không lấy lại được."),
    M("bm-ho-so-xoa (bé cuối còn máy)", "/ho-so/c1/xoa", "Xem các máy", { kb: XOA_CON_MAY, truoc: async () => { await di("/ho-so/c1/xoa"); await doi("Giữ lại"); await bamXoaHs(); } }),
    M("bm-ho-so-xoa (đã xoá · máy dùng chung)", "/ho-so/c1/xoa", "thành máy dùng chung — gắn", { truoc: async () => { await di("/ho-so/c1/xoa"); await doi("Giữ lại"); await bamXoaHs(); } }),
    M("bm-qua-mua (trao luôn)", "/vi/qua-mua?ma=lego&con=c1", "Trao luôn cho", { kb: QUA_KHO }),
    M("bm-qua-mua (voucher chưa trao luôn)", "/vi/qua-mua?ma=aiicafe_20k&con=c1", "mới trao luôn được", { kb: QUA_KHO }),
    M("admin-ho-tro", "/admin-ho-tro", "Đang chờ"),
    M("admin-ho-tro (của tôi)", "/admin-ho-tro", "AiiGrow đã cộng giúp", { truoc: async () => { await di("/admin-ho-tro"); await doi("Của tôi"); await bam("Của tôi"); } }),
    M("bm-ho-so-con", "/ho-so/c1", "Cài đặt của"),
    M("bm-ho-so-gio-choi", "/ho-so/c1/gio-choi", "Chơi liền bao lâu thì nghỉ?"),
    M("bm-ho-so-sua", "/ho-so/sua?id=c1", "Lưu"),
    M("bm-ho-so-pin (z2fyhohj)", "/ho-so/c1/pin", "Lưu xong,", { kb: { "GET con/c1/pin": { coPin: true, pin: "2581", pinDatLuc: luc(60 * 24 * 11), ten: "Bảo Anh" } } }),
    M("bm-ho-so-con (liên kết AiiRob)", "/ho-so/c1", "Liên kết AiiRob"),
    M("bm-man-hinh", "/man-hinh/c1", "Theo app"),
    M("bm-man-hinh (cả tuần)", "/man-hinh/c1", "APP & TRANG WEB", { truoc: async () => { await di("/man-hinh/c1"); await doi("Cả tuần"); await bam("Cả tuần"); } }),
    M("bm-man-hinh (trống)", "/man-hinh/c1", "Hôm nay con chưa dùng app nào", { kb: { "GET con/c1/man-hinh": { ten: KEN, lui: 0, dau: "2026-10-19", cuoi: "2026-10-25", homNay: "2026-10-23", tongGiay: 0, tbNgayGiay: 0, tuanTruocGiay: 0, tatCa: 0, theoNgay: [], theoMuc: [], ds: [] } } }),
    M("bm-yeu-cau (danh sách)", "/yeu-cau?con=c2", "Cho vay 15 sao"),
    M("bm-yeu-cau-web", "/yeu-cau/y5", "Thêm YouTube cho", { kb: { "GET cho-duyet": CHO_DUYET_Y5() } }),
    M("bm-xin-vay (máy cũ them_gio)", "/yeu-cau/y2", "Con xin vay sao"),
    M("bm-yeu-cau-xong", "/yeu-cau/xong?kieu=vay&ten=Bill&con=c2&phut=15&grant=g-moi", "vay 15 sao"),
    M("bm-canh-bao", "/canh-bao", "Grow gợi ý"),
    M("bm-canh-bao-may", "/canh-bao/a1", "Đã nói chuyện · mở khoá trò chơi"),
    M("bm-tin-khen", "/loi-khen/c1", "Khen"),
    // Duyệt (bm-duyet — L9)
    M("bm-cho-duyet", "/cho-duyet", "Duyệt cả 3 · +30 sao"),
    M("bm-cho-duyet (trống)", "/cho-duyet", "Chờ duyệt", { kb: { "GET cho-duyet": { nhiemVu: [], yeuCau: [], phieu: [] }, "GET luat": { ...coBan["GET luat"], chuaXep: [] }, "GET tuan-thu": { ds: [] } } }),
    M("bm-duyet-loat", "/duyet?con=c1", "Duyệt"),
    M("bm-duyet-nv", "/duyet/l1", "Khen con một câu"),
    M("bm-lam-lai", "/duyet/lam-lai?id=l1", "làm lại"),
    M("bm-duyet-xong", "/duyet-xong?luot=l1&con=c1&ten=Ken&diem=10&nv=R%E1%BB%ADa%20ch%C3%A9n&khen=Gi%E1%BB%8Fi%20l%E1%BA%AFm!", "Hoàn tác"),
    // Nhiệm vụ, sao, quà (L9, L10)
    M("bm-nhiem-vu", "/diem-qua", "Việc mỗi ngày"),
    M("bm-giao-nv", "/giao-nv", "Một ngày của"),
    M("bm-giao-nv (mục Giúp Ba Mẹ)", "/giao-nv?con=c2", "Nấu cơm bằng nồi cơm điện", { truoc: async () => { await di("/giao-nv?con=c2"); await doi("🏠 Giúp Ba Mẹ"); await bam("🏠 Giúp Ba Mẹ"); } }),
    M("bm-giao-nv-tu-dat", "/giao-nv/tu-dat?con=c1", "Thêm vào mục đã chọn"),
    M("bm-giao-nv-sua", "/giao-nv/sua?id=t0", "Dọn phòng"),
    // #325 bm-viec-duyet (bàn 17/11): đúng CA của từng màn bàn
    M("bm-nhiem-vu (nợ · quà chờ trao · e91jg28j)", "/diem-qua", "Quà chờ trao", { kb: { ...SO_SAO, "GET cho-duyet": { ...coBan["GET cho-duyet"],
      phieu: [{ id: "ph2", child_id: "c1", ten: "Chọn món bữa tối", loai: "dac_quyen", diem: 50, ten_con: KEN, created_at: luc(60 * 26) }] } } }),
    M("bm-nhiem-vu (trống · đang nợ vẫn hiện ví)", "/diem-qua", "đang nợ Ba Mẹ", { kb: { ...SO_SAO, "GET nhiem-vu": { ds: [] }, "GET cho-duyet": { ...coBan["GET cho-duyet"], nhiemVu: [] } } }),
    M("bm-nhiem-vu (trống · e44cwmvu)", "/diem-qua", "còn trống", { kb: { "GET nhiem-vu": { ds: [] }, "GET cho-duyet": { ...coBan["GET cho-duyet"], nhiemVu: [] } } }),
    M("bm-giao-nv (bảng tự thêm · 6pjz1stu)", "/giao-nv?con=c1&tuThem=1", "Thêm vào mục đã chọn"),
    M("bm-giao-nv-sua (bảng xoá · 4axhvgpl)", "/giao-nv/sua?id=t0", "Giữ lại việc này", { truoc: async () => { await di("/giao-nv/sua?id=t0"); await doi("Xoá việc này"); await bam("Xoá việc này"); } }),
    M("bm-duyet-nv (2 ảnh · qwuifjry)", "/duyet/l1", "Vuốt xem 2 ảnh", { kb: { "GET luot/l1/bang-chung": { ds: [{ id: "e0", mime: "image/png", loai: "anh", base64: PNG, chupLuc: luc(48) },
      { id: "e1", mime: "image/png", loai: "anh", base64: PNG, chupLuc: luc(13) }] } } }),
    M("bm-duyet-nv (ghi âm · d40e3495)", "/duyet/l2", "Nghe nhanh x2", { kb: { "GET luot/l2": { id: "l2", child_id: "c1", ten_con: KEN, ten: "Đọc sách 20 phút", diem_md: 10, trang_thai: "cho_duyet",
      nop_luc: luc(35), ghi_chu: "Hôm nay con đọc hết chương 3 rồi ạ!", nghi_trung: false }, "GET luot/l2/bang-chung": { ds: [{ id: "e2", mime: "audio/mp4", loai: "ghi_am", base64: "AAAA", chupLuc: luc(35) }] } } }),
    M("bm-lam-lai (bảng trên bằng chứng · nxclxlit)", "/duyet/l1", "Nói nhẹ nhàng để con vui vẻ làm lại", { truoc: async () => { await di("/duyet/l1"); await doi("Nhờ con làm lại"); await bam("Nhờ con làm lại"); } }),
    M("bm-lam-lai (bảng ghi âm · l0saosnz)", "/duyet/l2", "Thôi, quay lại nghe ghi âm", { kb: { "GET luot/l2": { id: "l2", child_id: "c1", ten_con: KEN, ten: "Đọc sách 20 phút", diem_md: 10,
      trang_thai: "cho_duyet", nop_luc: luc(35), ghi_chu: null, nghi_trung: false }, "GET luot/l2/bang-chung": { ds: [{ id: "e2", mime: "audio/mp4", loai: "ghi_am", base64: "AAAA", chupLuc: luc(35) }] } },
      truoc: async () => { await di("/duyet/l2"); await doi("Nhờ con làm lại"); await bam("Nhờ con làm lại"); } }),
    M("bm-lam-lai (đã nhắn · 4u3doee9)", `/duyet/lam-lai?id=l2&gui=${encodeURIComponent("Con đọc to hơn một chút nhé!")}&luc=${encodeURIComponent(luc(1))}`, "Lời nhắn đã tới máy con", { kb: {
      "GET luot/l2": { id: "l2", child_id: "c1", ten_con: KEN, ten: "Đọc sách 20 phút", diem_md: 10, trang_thai: "cho_duyet", nop_luc: luc(35), ghi_chu: null, nghi_trung: false },
      "GET luot/l2/bang-chung": { ds: [{ id: "e2", mime: "audio/mp4", loai: "ghi_am", base64: "AAAA", chupLuc: luc(35) }] } } }),
    M("bm-duyet-xong (trả nợ · 493dqo4i)", `/duyet-xong?luot=l1&con=c1&ten=${encodeURIComponent(KEN)}&diem=10&nv=${encodeURIComponent("Dọn phòng")}&khen=${encodeURIComponent("Giỏi lắm con!")}&saoTruoc=-15&noTruoc=15`, "đã trả nợ trước", { kb: { "GET con/c1/vi": { ...coBan["GET con/c1/vi"], sao: -5, no: 5, soDu: 0 },
      "GET cho-duyet": { ...coBan["GET cho-duyet"], nhiemVu: coBan["GET cho-duyet"].nhiemVu.filter((x) => x.nhom === "doc_sach") } } }),
    M("bm-duyet-xong (cả loạt hết nợ · zj9gmh7t)", `/duyet-xong?loat=1&con=c1&ten=${encodeURIComponent(KEN)}&sao=20&khen=${encodeURIComponent("Giỏi lắm con!")}&saoTruoc=-15&noTruoc=15&ds=${encodeURIComponent(JSON.stringify([{ t: "Dọn phòng", s: 10 }, { t: "Đọc sách 20 phút", s: 10 }]))}`, "và đã hết nợ!", { kb: { "GET con/c1/vi": { ...coBan["GET con/c1/vi"], sao: 5, no: 0, soDu: 5 } } }),
    M("bm-duyet-loat (trống · oypre8gc)", "/duyet?con=c1", "Duyệt hết rồi!", { kb: { "GET cho-duyet": { ...coBan["GET cho-duyet"], nhiemVu: [] }, "GET con/c1": { ...coBan["GET con/c1"] } } }),
    M("bm-vi", "/vi/c1", "Tuần này: vay"),
    M("bm-vi (điều chỉnh)", "/vi/c1", "Điều chỉnh sao của", { truoc: async () => { await di("/vi/c1"); await doi("± Điều chỉnh"); await bam("± Điều chỉnh"); } }),
    M("bm-qua", "/vi/qua", "AiiCafe 20k"),
    M("bm-qua (chưa có quà)", "/vi/qua", "quà", { kb: { "GET qua": { ds: [] } } }),
    M("bm-qua-sua", "/vi/qua-sua?id=q2", "Đi xem phim cuối tuần"),
    M("bm-quy", "/quy", "AiiCafe 20k"),
    // #325 bm-sao-qua (bàn 17/11): đúng CA của từng màn bàn
    M("bm-qua (xin vay đổi quà · 473f52w6)", "/vi/qua?con=c1", "Cho vay", { kb: { ...SO_SAO, "GET cho-duyet": { ...coBan["GET cho-duyet"], yeuCau: [{ ...YC_VAY, phut: 50, muc_dich: "qua", gia_tri: "q1" }] } } }),
    M("bm-qua (Ba Mẹ tự điền · f0fnp733)", "/vi/qua?con=c1&tab=nha", "Quà Ba Mẹ đã điền"),
    M("bm-qua-thu-vien (dlul0jlr)", "/vi/qua-thu-vien?con=c1", "Tự đặt quà nhà"),
    M("bm-qua-mua (đã mua · sp8ijd1b)", "/vi/qua-mua?ma=aiicafe_20k&con=c1", "Cách dùng", { kb: { ...QUA_KHO, "GET con/c1/vi": { ...coBan["GET con/c1/vi"], sao: 30, soDu: 30 } } }),
    M("bm-qua-sua (bảng xoá · t49meex8)", "/vi/qua-sua?id=q2", "Giữ lại quà", { truoc: async () => { await di("/vi/qua-sua?id=q2"); await doi("Xoá quà này"); await bam("Xoá quà này"); } }),
    M("bm-trao-qua (5otw85h4)", "/diem-qua", "Huỷ & hoàn sao", { kb: { ...SO_SAO, "GET cho-duyet": { ...coBan["GET cho-duyet"],
      phieu: [{ id: "ph2", child_id: "c1", ten: "Chọn món bữa tối", loai: "dac_quyen", diem: 50, ten_con: KEN, created_at: luc(30) }] } },
      truoc: async () => { await di("/diem-qua"); await doi("Trao quà"); await bam("Trao quà"); } }),
    M("bm-bao-cao", "/bao-cao", "Dùng nhiều nhất"),
    // App & web (bm-ung-dung — thiết kế chốt 15/11, #262 / #258)
    M("bm-app-web", "/chan", "Danh sách của"),
    M("bm-app-web (mở hết)", "/chan", "Đang tạm nghỉ", { kb: { "GET con/c1/danh-sach": dsCon("c1", KEN, { cheDo: "mo_het", cheDoChan: "mo_het", tenCheDo: "Mở hết", tamNghi: true }) } }),
    M("bm-ung-dung", "/ung-dung?con=c1", "Thêm app cho"),
    M("bm-ung-dung-app", "/ung-dung/app?con=c1&ten=Roblox", "Roblox có tính phút không?"),
    M("bm-ung-dung-them", "/ung-dung/them?con=c1", "Thêm app cho"),
    M("bm-web", "/web/c1", "Thêm trang web cho"),
    M("bm-web-trang", "/web/trang?con=c1&ten=youtube.com", "youtube.com có tính phút không?"),
    M("bm-web-them", "/web/them?con=c1", "Thêm web cho"),
    M("bm-bo-qua", "/bo-qua?con=c1", "Lời xin đã bỏ qua"),
    M("bm-yeu-cau-web-moi", "/yeu-cau-web/y5", "Thêm YouTube cho", { kb: { "GET cho-duyet": CHO_DUYET_Y5() } }),
    M("bm-yeu-cau-web-bo-qua", `/yeu-cau-web/bo-qua?id=y5&ten=YouTube&con=${encodeURIComponent(KEN)}&may=Laptop&den=${encodeURIComponent(new Date(Date.now() + 3_600_000).toISOString())}`, "Đã bỏ qua YouTube"),
    M("bm-yeu-cau-xong (đã thêm)", `/yeu-cau/xong?kieu=mo&ten=${encodeURIComponent(KEN)}&con=c1&muc=YouTube&phut=1&may=Laptop`, "Đổi sang Không tính phút"),
    M("bm-ung-dung-may", "/ung-dung/m1", "Mọi app trên máy"),
    M("bm-ung-dung-may (chưa có danh sách)", "/ung-dung/m1", "Máy chưa gửi danh sách ứng dụng", { kb: { "GET may/m1/ung-dung": { ...coBan["GET may/m1/ung-dung"], capNhatLuc: null, ds: [] } } }),
    // Cả nhà, cài đặt (bm-cai-dat — L6)
    M("bm-cai-dat", "/cai-dat", "Người lớn trông con"),
    M("bm-cai-dat (xoá tài khoản)", "/tai-khoan", "Xoá tài khoản của tôi", { kb: { "GET thanh-vien": TV_MOT_MINH, "GET tuan-thu": { ds: [] } }, truoc: moXoaTk }),
    M("bm-cai-dat (xoá: còn máy)", "/tai-khoan", "Xem các máy", { kb: { "GET thanh-vien": TV_MOT_MINH }, truoc: moXoaTk }),
    M("bm-cai-dat (xoá: còn thành viên)", "/tai-khoan", "Xem người lớn trong nhà", { truoc: moXoaTk }),
    M("bm-ho-tro", "/ho-tro", "đã cộng 10 phút"),
    M("thanh-vien", "/thanh-vien", "Ông ngoại"),
    M("thanh-vien (trông giúp)", "/thanh-vien?id=p2", "Ba Huy trong nhà", { kb: { "GET toi": { baMe: { ...coBan["GET toi"].baMe, id: "p3", quyen: "trong_giup", laChuNha: false, vai: "xem" } },
      "GET thanh-vien": { ...coBan["GET thanh-vien"], ds: coBan["GET thanh-vien"].ds.map((x) => ({ ...x, laToi: x.id === "p3" })), toi: { id: "p3", quyen: "trong_giup", vai: "xem", laChuNha: false } } } }),
    M("thanh-vien (mời người nhà)", "/moi-nguoi-nha", "làm được như bạn"),
    M("thanh-vien (đã mời)", "/moi-nguoi-nha", "Đã mời Bà ngoại!", { truoc: async () => { await di("/moi-nguoi-nha"); await doi("làm được như bạn"); await go("Số điện thoại người được mời", "0909876543");
      await go("Gọi là gì trong nhà", "Bà ngoại"); await sleep(200); await bam("Gửi lời mời cho Bà ngoại"); } }),
    M("thanh-vien (người lớn)", "/thanh-vien", "Mời Ba Huy rời nhà", { truoc: async () => { await di("/thanh-vien"); await doi("Ba Huy"); await bam("Ba Huy"); } }),
    M("moi (chưa có link)", "/moi", "Được người nhà mời?", { token: null }),
    M("moi (tạo tài khoản)", "/moi?ma=ABCD2345", "Vào nhà cùng Mẹ Lan", { token: null }),
    M("moi (đã đăng nhập)", "/moi?ma=ABCD2345", "Tài khoản này đã có nhà riêng"),
    M("moi (mã hết hạn)", "/moi?ma=ABCD2345", "quá 72 giờ", { token: null, kb: { "GET moi/ABCD2345": { status: 410, body: { error: "ma_moi_het_han", message: "Mã mời đã quá 72 giờ — xin người mời mã mới" } } } }),
    M("moi-vao", "/moi/vao?ma=ABCD2345", "Mẹ Lan"),
    // bm-duoc-moi đúng ca bàn: them-ux0c23p4 (có Google / Facebook), them-0zrwe8yz đã điền, them-pacl0mle đã gõ 4 số
    // bm1-moi v14: người được mời CHƯA có nhà riêng, quyền Trông giúp (ô thứ 3 «Khoá máy khi cần»)
    M("moi-vao (chưa có nhà · bm1-moi)", "/moi/vao?ma=ABCD2345", "Không phải tôi", { kb: { "GET gia-dinh": { ten: "Nhà", quyVoucher: 0, choDuyet: 0, canhBao: 0, con: [] },
      "GET moi/ABCD2345": { ...coBan["GET moi/ABCD2345"], quyen: "trong_giup", tenQuyen: "Trông giúp" } } }),
    M("moi (được mời · them-ux0c23p4)", "/moi?ma=ABCD2345", "Vào nhà cùng Mẹ Lan", { token: null, kb: { "GET cau-hinh-dang-nhap": { google: true, facebook: true } } }),
    M("moi-dang-ky (đã điền · them-0zrwe8yz)", "/dang-ky?moi=ABCD2345&tenNha=M%E1%BA%B9%20Lan", "Đã khớp", { token: null, truoc: async () => {
      await di("/dang-ky?moi=ABCD2345&tenNha=M%E1%BA%B9%20Lan", null); await doi("Vào nhà cùng Mẹ Lan");
      await go("Số điện thoại", "0987654321"); await go("Mật khẩu", "matkhau123"); await go("Nhập lại mật khẩu", "matkhau123"); } }),
    M("moi-otp (đang gõ · them-pacl0mle)", "/otp", "Xác thực, vào nhà Mẹ Lan", { token: null, kb: { "POST otp": { guiDen: "0987654321", ma: "482017" } }, truoc: async () => {
      await di("/dang-ky?moi=ABCD2345&tenNha=M%E1%BA%B9%20Lan", null); await doi("Vào nhà cùng Mẹ Lan");
      await go("Số điện thoại", "0987654321"); await go("Mật khẩu", "matkhau123"); await go("Nhập lại mật khẩu", "matkhau123"); await sleep(200);
      await bam("Nhận mã xác thực"); await doi("Nhập mã xác thực"); await go("Mã xác thực 6 số", "4820"); } }),
    M("thong-bao", "/thong-bao", "vừa nộp 3 nhiệm vụ"),
    M("thong-bao (trống)", "/thong-bao", "Chưa có gì mới", { kb: { "GET thong-bao": { ds: [], chuaDoc: 0, caiDat: { yenLang: { bat: false, tu: "22:00", den: "06:30" }, tat: [] } } } }),
    M("thong-bao (mất mạng)", "/thong-bao", "Đang chờ mạng", { matMang: true }),
    M("thong-bao/cai-dat", "/thong-bao/cai-dat", "Giờ yên lặng"),
    M("thong-bao/cai-dat (bảng giờ)", "/thong-bao/cai-dat", "Lưu giờ yên lặng", { truoc: async () => { await di("/thong-bao/cai-dat"); await doi("chạm để đổi giờ"); await bam("Không rung 22:00 – 06:30"); } }),
  ];
  // PHA_MAN=<biểu thức chính quy>: chỉ chạy các màn khớp tên (soát nhanh khi sửa)
  if (process.env.PHA_MAN) dsMan.splice(0, dsMan.length, ...dsMan.filter((m) => new RegExp(process.env.PHA_MAN).test(m.ten)));
  // Lượt CHỮ DÀI (Thanh 25/10 «chữ dài bị hỏng nút»): cùng các màn, dữ liệu giả đổi sang tên con 30 ký tự, tên máy 40 ký tự,
  // tên miền 60 ký tự — luật NUT-TRAN (giao-dien.mjs) bắt chữ ló khỏi nút / cắt nửa dòng / nút tràn thẻ. PHA_CHU_DAI=0: bỏ lượt này.
  const dung = (x, n) => { if ([...x].length !== n) throw new Error(`chữ dài «${x}» phải đúng ${n} ký tự`); return x; };
  const TEN_DAI = dung("Nguyễn Hoàng Bảo Ngọc Minh Thư", 30), TEN_DAI2 = dung("Trần Lê Minh Khang Gia Bảo Huy", 30);
  // tên miền 60 ký tự, nhiều nhãn (bẻ dòng được ở dấu chấm / gạch nối)
  const mien = (goc) => { const duoi = ".thu-vien-hoc-tap.truc-tuyen-cho-tre-em.edu.vn", dau = goc.replace(/\./g, "-");
    return dung((dau + "-hoc-tap-online-mien-phi").slice(0, 60 - duoi.length).replace(/-$/, "x") + duoi, 60); };
  const MAY_DAI = { "Laptop của Bảo Anh · Windows 11": dung("Laptop của bé Bảo Anh · Win 11 Home 24H2", 40),
    "Laptop của Bảo Anh": dung("Laptop học tập phòng ngủ của Bảo Anh Pro", 40),
    "iPad của Bảo Anh": dung("iPad Air 11 inch M2 màu xanh của Bảo Anh", 40),
    "Laptop của Bill": dung("Laptop chơi game phòng khách của Bill 07", 40), "Laptop-BILL": dung("LAPTOP-PHONG-KHACH-CUA-BILL-2026-MAY-SO2", 40) };
  const MIEN = ["facebook.com", "khanacademy.org", "youtube.com", "gamevui.vn", "tiktok.com", "roblox.com", "minecraft.net"];
  // tên máy → dấu giữ chỗ trước (tên máy dài có chữ «Bill», không để bước đổi tên con chèn vào), rồi tên miền, tên con, cuối cùng trả tên máy
  const doiChu = (t) => { const ds = Object.entries(MAY_DAI); ds.forEach(([a], i) => { t = t.split(a).join(`\u0000${i}\u0000`); });
    for (const d of MIEN) t = t.split(d).join(mien(d));
    t = t.split(KEN).join(TEN_DAI).split(BILL).join(TEN_DAI2);
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => ds[+i][1]); };
  const daiHoa = (v) => typeof v === "string" ? doiChu(v) : typeof v === "function" ? (...a) => daiHoa(v(...a)) : Array.isArray(v) ? v.map(daiHoa)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, daiHoa(x)])) : v;
  let chuDai = false;
  const vao = async (m) => {
    kb = { ...coBan, ...(m.kb ?? {}) };
    if (chuDai) kb = daiHoa(kb);
    matMang = !!m.matMang;
    if (m.truoc) await m.truoc(); else await di(m.duong, m.token === undefined ? "tok-thu" : m.token);
    const ok = await doi(m.cho, process.env.PHA_CHI_IN ? 3000 : 8000);
    matMang = false;
    // PHA_CHI_IN=1: chỉ in chữ trên màn (soát dữ liệu giả / chữ chờ khi sửa), không đo
    if (process.env.PHA_CHI_IN) { console.log(`    [${ok ? "thấy" : "CHƯA THẤY"} «${m.cho}»] ${m.duong}: ${(await chu())?.replace(/\s+/g, " ").slice(0, 1500)}`); return false; }
    if (ok) return true;
    console.log(`    KHÔNG TẢI: chưa thấy «${m.cho}» ở ${m.duong}: ${(await chu())?.replace(/\s+/g, " ").slice(0, process.env.PHA_IN ? 4000 : 160)}`);
    return false;
  };
  // PHA_CHI_DAI=1: chỉ chạy lượt chữ dài (soát nhanh khi sửa)
  // PHA_RONG=390: chỉ đo một khổ (soát nhanh khi sửa); cổng thật đo đủ 320 / 390 / 390 giãn
  const cheDo = process.env.PHA_RONG ? [[Number(process.env.PHA_RONG), false]] : undefined;
  let tong = process.env.PHA_CHI_DAI === "1" ? 0 : await chayCong({ goi, js, sleep, dsMan, vao, ...(cheDo ? { cheDo } : {}) });
  if (process.env.PHA_CHU_DAI !== "0" || process.env.PHA_CHI_DAI === "1") {
    chuDai = true;
    console.log(`\n# LƯỢT CHỮ DÀI — tên con «${TEN_DAI}» (${[...TEN_DAI].length}), máy «${MAY_DAI["Laptop của Bảo Anh · Windows 11"]}» (40), miền «${mien("youtube.com")}» (${mien("youtube.com").length})`);
    // chỉ đo ở 320px (khổ hẹp nhất — chữ dài vỡ ở đây trước) để cổng không chậm gấp đôi
    tong += await chayCong({ goi, js, sleep, dsMan, vao, hau: "-dai", cheDo: [[320, false]] });
  }
  ws.close(); chrome.kill(); may.close();
  await sleep(500);
  try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
  process.exit(tong ? 1 : 0);
}

// ---------------------------------------------------------------- kịch bản luồng chính
let sai = 0;
const kq = [];
const xet = async (dk, ten) => { kq.push([dk, ten]); console.log(`${dk ? "đạt" : "SAI"} ${ten}`); if (!dk) { sai++; console.log("    màn: " + ((await chu()) ?? "").replace(/\s+/g, " ").slice(0, 400));
  if (process.env.PHA_CHUP) { const a = await goi("Page.captureScreenshot", { format: "png" }); if (a?.data) (await import("node:fs")).writeFileSync(`${process.env.PHA_CHUP}/sai-${kq.length}.png`, Buffer.from(a.data, "base64")); } } };
// PHA_KB=<biểu thức chính quy>: chỉ chạy các kịch bản luồng khớp tên (soát nhanh khi sửa)
const LOC_KB = process.env.PHA_KB ? new RegExp(process.env.PHA_KB) : null;   // biểu thức sai ⇒ dừng ngay từ đầu, rõ lý do
const kichBan = async (ten, fn) => { if (LOC_KB && !LOC_KB.test(ten)) return; console.log(`\n# ${ten}`); kb = { ...coBan }; matMang = false; nhatKy.length = 0; try { await fn(); } catch (e) { xet(false, `${ten}: lỗi ${e}`); } };

/** Bấm phần tử theo bộ chọn CSS (công tắc không có chữ). */
const bamChon = async (chon) => {
  // phần tử THẤY ĐƯỢC cuối cùng (màn cũ còn trong ngăn xếp điều hướng có thể giữ bản ẩn 0×0)
  const r = await viTriYen(`() => [...document.querySelectorAll(${JSON.stringify(chon)})].filter((e) => e.getBoundingClientRect().width > 0).pop()`);
  if (!r) return false;
  await nhanChuot(r);
  return true;
};
/** Chờ một lời gọi API khớp `dk` xuất hiện trong nhật ký (thay cho sleep cố định — máy tải nặng thì lời gọi đến muộn). */
const choGoi = async (dk, ms = 6000) => { for (let t = 0; t < ms; t += 100) { if (nhatKy.some(dk)) return true; await sleep(100); } return false; };
const coChon = async (chon, ms = 6000) => { for (let t = 0; t < ms; t += 250) { if (await js(`!!document.querySelector(${JSON.stringify(chon)})`)) return true; await sleep(250); } return false; };

// ---- khối A (fork A): kịch bản luồng nhóm A theo thiết kế chốt 05/11 (cần bamChon / choGoi / coChon định nghĩa TRƯỚC khối này)
const HOM_NAY_TAI = "Cho vay sao";     // thẻ đầu Trang chủ «Hôm nay» (15/11: số sao + «Cho vay sao»)

await kichBan("Đăng ký bằng số điện thoại → mã 6 số → vào bước 1 thiết lập (tên con)", async () => {
  await dangKyToiOtp();
  xet(await doi("Nhập mã xác thực"), "sang màn nhập mã");
  xet(nhatKy.some((x) => x.d === "otp" && x.body?.dinhDanh === "0912345678" && x.body?.mucDich === "dang_ky"), "gửi đúng số điện thoại");
  xet(await doi("Bản thử: mã là 482017"), "chế độ thử hiện mã");
  await go("Mã xác thực 6 số", "482017");
  await bam("Xác thực số điện thoại");
  xet(await doi("Tên gọi ở nhà"), "đăng ký xong vào bước tên con");
  xet(nhatKy.some((x) => x.d === "dang-ky" && x.body?.ma === "482017" && x.body?.dinhDanh === "0912345678" && x.body?.matKhau === "matkhau123"), "gửi mã + số + mật khẩu");
});

await kichBan("Duyệt nhiệm vụ: bằng chứng ⇒ «Duyệt · nhận 10 sao» kèm lời khen ⇒ màn +10 sao ⇒ Hoàn tác trừ lại", async () => {
  // ví đọc trước + sau khi duyệt: 145 → 155 (mock tĩnh trả cùng một số ⇒ «155 → 155»)
  kb["GET con/c1/vi"] = () => ({ ...coBan["GET con/c1/vi"], ...(nhatKy.some((x) => x.d === "luot/l1/duyet") ? { sao: 155, soDu: 155 } : { sao: 145, soDu: 145 }), no: 0 });
  await di("/duyet/l1");
  xet(await doi(`Duyệt · ${KEN} nhận 10 sao`), "nút duyệt nói rõ số sao");
  xet(await doi("Ảnh «Ảnh 1»"), "hiện nhãn ảnh bằng chứng");
  xet(await js(`[...document.images].some((i) => i.src.startsWith("data:image/png") && i.naturalWidth >= 640)`), "hiện ảnh bằng chứng cỡ thật");
  await bam("Ba Mẹ tự hào về con");
  await bam(`Duyệt · ${KEN} nhận 10 sao`);
  xet(await doi(`+10 sao cho ${KEN}!`), "màn đã duyệt");
  xet(await doi("145 → 155 sao"), "ví trước → sau đúng số sao");
  xet(nhatKy.some((x) => x.d === "luot/l1/duyet" && x.body?.diem === 10 && x.body?.loiKhen === "Ba Mẹ tự hào về con"), "gửi kèm lời khen đã chọn");
  xet(await doi("Hoàn tác"), "có nút Hoàn tác");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "luot/l1/hoan-tac"), "Hoàn tác gọi máy chủ trừ lại sao");
  xet(await doi(`Duyệt · ${KEN} nhận 10 sao`), "Hoàn tác ⇒ về lại màn bằng chứng");
});

await kichBan("Nhờ làm lại: chọn vì sao + lời nhắn ⇒ Con chưa nhận sao, ví giữ nguyên", async () => {
  await di("/duyet/l1");
  await doi("Nhờ con làm lại");
  await bam("Nhờ con làm lại");
  xet(await doi(`Nhờ ${KEN} làm lại`), "mở bảng Nhờ làm lại trên màn bằng chứng (them-nxclxlit)");
  xet(await doi("Con chưa nhận sao. Nộp ảnh mới"), "nói rõ chưa cộng sao");
  await bam("Ảnh mờ, chụp lại");
  await bam(`Gửi lời nhắn cho ${KEN}`);
  xet(await choGoi((x) => x.d === "luot/l1/lam-lai" && x.body?.lyDo === "Ảnh mờ, chụp lại" && x.body?.loiNhan === "Con làm lại rồi chụp ảnh mới cho Ba Mẹ nhé!"), "gửi lam-lai kèm vì sao + lời nhắn");
  xet(!nhatKy.some((x) => x.d === "luot/l1/tu-choi" || x.d === "luot/l1/duyet"), "không từ chối, không duyệt");
  xet(await doi(`Đã nhắn ${KEN} làm lại`), "màn kết quả");
  xet(await doi("vẫn 155 sao"), "ví giữ nguyên số sao");
});

await kichBan("Không đúng việc ⇒ đóng hẳn (tu-choi, không bổ sung)", async () => {
  await di("/duyet/lam-lai?id=l3");
  await doi("Không đúng việc · không tính lần này");
  await bam("Không đúng việc · không tính lần này");
  xet(await choGoi((x) => x.d === "luot/l3/tu-choi" && x.body?.boSung === false), "gửi tu-choi boSung=false");
});

await kichBan("Lời xin thêm giờ của máy cũ (them_gio) = xin vay 15 sao: chọn số sao + lời nhắn ⇒ dong-y {soSao} ⇒ kết quả có Hoàn tác", async () => {
  await di("/yeu-cau/y2");
  xet(await doi("Bill xin Ba Mẹ cho vay 15 sao"), "tiêu đề lời xin vay");
  xet(await doi("sẽ nợ 15 sao"), "nói rõ vay xong sẽ nợ bao nhiêu");
  xet(await doi("Cho Bill vay 15 sao"), "mặc định đúng số sao con xin");
  await bam("30 sao");
  await bam("Nhớ làm nhiệm vụ trả nợ nhé");
  await bam("Cho Bill vay 30 sao");
  xet(await choGoi((x) => x.d === "yeu-cau/y2/dong-y" && x.body?.soSao === 30), "gửi dong-y soSao 30");
  xet(await choGoi((x) => x.d === "con/c2/loi-khen" && x.body?.noiDung === "Nhớ làm nhiệm vụ trả nợ nhé"), "gửi lời nhắn cho con");
  xet(await doi("Đã cho Bill vay 30 sao"), "màn kết quả");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "vay/g2/hoan-tac"), "Hoàn tác gọi vay/:id/hoan-tac");
});

await kichBan("Lời xin ngoại lệ của máy cũ (ngoai_le 30 phút) = xin vay 30 sao, không còn chữ «ngoại lệ»", async () => {
  await di("/yeu-cau/y3");
  xet(await doi("Bill xin Ba Mẹ cho vay 30 sao"), "tiêu đề xin vay 30 sao");
  xet(!(await chu()).includes("ngoại lệ"), "không còn chữ «ngoại lệ»");
  await bam("15 sao");
  await bam("Cho Bill vay 15 sao");
  xet(await choGoi((x) => x.d === "yeu-cau/y3/dong-y" && x.body?.soSao === 15), "gửi dong-y soSao 15");
});

await kichBan("Mất mạng lúc mở Hôm nay ⇒ Rob chờ + nói rõ, có mạng lại tự tải", async () => {
  matMang = true;
  await di("/hom-nay");
  xet(await doi("Đang chờ mạng"), "màn chờ mạng, không màn trắng");
  matMang = false;
  xet(await doi(HOM_NAY_TAI, 9000), "có mạng lại tự tải (≤ 5 giây)");
});

await kichBan("Hết phiên (401) ⇒ về màn Chào", async () => {
  kb["GET gia-dinh"] = { status: 401, body: { error: "chua_dang_nhap", message: "Phiên đăng nhập đã hết" } };
  await di("/hom-nay");
  xet(await doi("Bắt đầu cho con nhà mình"), "về màn Chào");
});

await kichBan("Tài khoản của bạn ⇒ Xoá tài khoản (thiết kế 14/11 bm-ca-nha/08, 11): máy chủ chặn khi còn người lớn / còn máy; người cuối ⇒ nói rõ hậu quả + mật khẩu ⇒ xoá ⇒ về màn Chào", async () => {
  await di("/cai-dat");
  xet(await doi("Bạn · tài khoản của bạn"), "tab Cả nhà có dòng «tài khoản của bạn»");
  await bam("Bạn · tài khoản của bạn");
  xet(await doi("Xoá hẳn, không lấy lại được"), "mở màn Tài khoản của bạn, dòng Xoá tài khoản nói rõ không lấy lại được");
  await bam("Xoá tài khoản");
  xet(await choGoi((x) => x.d === "xoa-tai-khoan" && x.body?.kiemTra === true), "hỏi máy chủ trước (kiemTra)");
  xet(await doi("Chưa xoá được tài khoản người tạo nhà"), "còn người lớn khác ⇒ bảng hướng dẫn mời ra trước");
  xet(await doi("Gia đình còn Ba Huy"), "nêu tên người còn trong nhà");
  xet(await doi("Xem người lớn trong nhà"), "có nút về danh sách người lớn");
  xet(!nhatKy.some((x) => x.d === "xoa-tai-khoan" && x.body?.matKhau), "không gọi xoá");

  kb["GET thanh-vien"] = TV_MOT_MINH;
  await di("/tai-khoan");
  await doi("Xoá hẳn, không lấy lại được");
  await bam("Xoá tài khoản");
  xet(await doi("Gia đình còn 3 máy đã ghép"), "còn máy ⇒ bảo gỡ máy trước, nêu số máy");
  xet(await doi("Xem các máy"), "có nút sang danh sách máy");
  xet(!nhatKy.some((x) => x.d === "xoa-tai-khoan" && x.body?.matKhau), "không gọi xoá khi còn máy");

  kb["GET tuan-thu"] = { ds: [] };
  await di("/tai-khoan");
  await doi("Xoá hẳn, không lấy lại được");
  await bam("Xoá tài khoản");
  xet(await doi("Xoá tài khoản và cả gia đình?"), "bảng xác nhận cho người tạo nhà cuối cùng");
  xet(await doi("không lấy lại được"), "nói rõ không lấy lại được");
  xet(await doi("ảnh bằng chứng, sao, quà và luật"), "nói rõ dữ liệu bị xoá (chữ «sao»)");
  xet(!(await chu()).includes("phiếu quà"), "không nhắc quỹ / phiếu quà AiiCafe khi nhà không có");
  kb["POST xoa-tai-khoan"] = (b) => (b?.kiemTra ? { duoc: true } : { status: 401, body: { error: "sai_mat_khau", message: "Mật khẩu chưa đúng" } });
  await go("Nhập lại mật khẩu để xác nhận", "sai-roi");
  await sleep(200);
  await bam("Xoá tài khoản của tôi");
  xet(await doi("Mật khẩu chưa đúng"), "sai mật khẩu ⇒ báo ngay trong bảng");
  xet((await js(`localStorage.getItem("aiig_bm")`)) === "tok-thu", "sai mật khẩu ⇒ vẫn đăng nhập");
  kb["POST xoa-tai-khoan"] = coBan["POST xoa-tai-khoan"];
  nhatKy.length = 0;
  await go("Nhập lại mật khẩu để xác nhận", "matkhau123");
  await sleep(200);
  await bam("Xoá tài khoản của tôi");
  xet(await doi("Bắt đầu cho con nhà mình"), "xoá xong ⇒ về màn Chào");
  xet(await doi("Đã xoá tài khoản và toàn bộ dữ liệu gia đình"), "báo đã xoá");
  xet(nhatKy.some((x) => x.d === "xoa-tai-khoan" && x.m === "POST" && x.body?.matKhau === "matkhau123"), "gửi đúng mật khẩu");
  xet(!nhatKy.some((x) => x.d === "dang-xuat"), "không gọi đăng xuất (phiên đã mất trên máy chủ)");
  xet((await js(`localStorage.getItem("aiig_bm")`)) === null, "xoá token trên máy");
});

await kichBan("Mời người nhà bằng số điện thoại (thiết kế 14/11 bm-ca-nha/04: không chọn quyền — «làm được như bạn») ⇒ «Đã mời» + gửi link", async () => {
  await di("/cai-dat");
  xet(await doi("Ông ngoại"), "thấy người lớn + lời mời đang chờ");
  xet(await doi("Chưa nhận lời mời"), "lời mời chờ ghi «Chưa nhận lời mời»");
  await bam("Mời người nhà");
  xet(await doi("làm được như bạn"), "mở màn Mời người nhà («… làm được như bạn»)");
  await bam("Gửi lời mời");
  await sleep(600);   // lời gọi (nếu nút còn bấm được) tới nhật ký sau vài chục ms — chờ rồi mới kết luận «không gọi»
  xet(!nhatKy.some((x) => x.d === "thanh-vien/moi"), "chưa có SĐT ⇒ nút tắt, không gọi máy chủ");
  await go("Số điện thoại người được mời", "0909 876 543");
  await go("Gọi là gì trong nhà", "Bà ngoại");
  await sleep(200);
  await bam("Gửi lời mời cho Bà ngoại");
  xet(await doi("Đã mời Bà ngoại!"), "màn Đã mời");
  xet(nhatKy.some((x) => x.d === "thanh-vien/moi" && x.body?.dinhDanh === "0909876543" && x.body?.quyen === "ba_me" && x.body?.tenGoi === "Bà ngoại"),
    "gửi SĐT đã chuẩn hoá + quyền Ba Mẹ + tên gọi");
  xet(await doi("không cần nhập mã gì cả"), "không còn mã mời");
  xet(await doi("Gửi link qua Zalo, tin nhắn"), "có nút gửi link");
});

await kichBan("Lời mời chờ ⇒ «Gửi lại» tạo link mới", async () => {
  await di("/cai-dat");
  await doi("Ông ngoại");
  await bamChon('[aria-label="Gửi lại lời mời cho Ông ngoại"]');
  xet(await choGoi((x) => x.d === "thanh-vien/moi/lm1/gui-lai" && x.m === "POST"), "gọi gui-lai");
  xet(await doi("Đã tạo link mới cho Ông ngoại"), "báo đã tạo link mới");
});

await kichBan("Ba Mẹ đổi quyền Ba Huy sang Người trông giúp", async () => {
  await di("/cai-dat");
  await doi("Ba Huy"); await bam("Ba Huy");
  xet(await doi("Ba Huy trong nhà"), "mở màn người lớn");
  xet(await doi("Mời Ba Huy rời nhà"), "có Mời rời nhà");
  await bam("Quyền");
  xet(await doi("Quyền của Ba Huy"), "mở bảng quyền");
  await bam("Xem, duyệt, khoá máy — không đổi cài đặt");
  xet(await choGoi((x) => x.d === "thanh-vien/p2/quyen" && x.body?.quyen === "trong_giup"), "gửi đổi quyền");
});

await kichBan("Người được mời mở link ⇒ thấy nhà mời ⇒ số điện thoại ⇒ mã 6 số ⇒ vào Hôm nay", async () => {
  await di("/moi?ma=ABCD2345", null);
  xet(await doi("Mẹ Lan mời bạn vào nhà"), "xem trước lời mời từ link");
  xet(await doi("Vào nhà cùng Mẹ Lan"), "nói rõ ai mời");
  await bam("Số điện thoại");
  xet(await doi("Nhập lại mật khẩu"), "sang màn tạo tài khoản");
  await go("Số điện thoại", "0987654321"); await go("Mật khẩu", "matkhau123"); await go("Nhập lại mật khẩu", "matkhau123");
  await sleep(200);
  await bam("Nhận mã xác thực");
  xet(await doi("Nhập mã xác thực"), "sang bước mã 6 số");
  xet(await doi("Bản thử: mã là 482017"), "chế độ thử hiện mã");
  await go("Mã xác thực 6 số", "482017");
  await bam("Xác thực, vào nhà Mẹ Lan");
  xet(await doi(HOM_NAY_TAI), "vào trang Hôm nay");
  xet(nhatKy.some((x) => x.d === "moi/dang-ky" && x.body?.ma === "ABCD2345" && x.body?.otp === "482017" && x.body?.ten === "Ba Huy" && x.body?.dinhDanh === "0912345678"),
    "gửi link mời + OTP + tên gọi điền sẵn");
});

await kichBan("Thông báo: chuông có số ⇒ danh sách gộp ⇒ đánh dấu đã đọc ⇒ bấm tới Chờ duyệt", async () => {
  await di("/hom-nay");
  xet(await coChon('[aria-label="Thông báo, 3 mới"]'), "chuông báo 3 mới");
  await bamChon('[aria-label="Thông báo, 3 mới"]');
  xet(await doi(`${KEN} vừa nộp 3 nhiệm vụ`), "gộp 3 nhiệm vụ nộp liền nhau");
  xet(await doi("trong giờ yên lặng"), "đánh dấu dòng tới trong giờ yên lặng");
  xet(await choGoi((x) => x.d === "thong-bao/doc"), "đánh dấu đã đọc");
  await bam(`${KEN} vừa nộp 3 nhiệm vụ`);
  xet(await doi("việc cần Ba Mẹ"), "bấm dòng ⇒ tới Chờ duyệt");
});

await kichBan("Ví sao: số sao = phút chơi, quà đủ / thiếu sao, Ba Mẹ trừ sao kèm lý do", async () => {
  // kịch bản ví cũ: con KHÔNG nợ, 155 sao (mặc định coBan là Bảo Anh đang nợ 20 — kịch bản sổ sao)
  kb["GET con/c1/vi-sao"] = { ...coBan["GET con/c1/vi-sao"], ...saoGia(155, 0), tongVay: 0, daTraNo: 0, cau: { soDu: "155 sao", phut: "còn 155 sao = 155 phút chơi", no: null } };
  await di("/vi/c1");
  xet(await doi("155 sao"), "ví hiện số sao");
  xet(await doi("= 155 phút chơi"), "đổi ra phút theo tỷ lệ 10 sao = 10 phút");
  xet(await doi("Cần 50 sao · con tự đổi trên máy") && await doi("Đủ sao"), "quà đủ sao");
  xet(await doi("Cần 300 sao · còn thiếu 145"), "quà còn thiếu đúng số sao");
  xet(!/điểm|voucher|AiiCafe/i.test(await chu()), "không còn chữ điểm / phiếu AiiCafe");
  await bam("± Điều chỉnh");
  xet(await doi(`Điều chỉnh sao của ${KEN}`), "mở bảng điều chỉnh");
  await bam("Trừ sao");
  await go("Số sao", "15"); await go("Lý do", "Nói dối");
  await bam("Trừ 15 sao");
  xet(await choGoi((x) => x.d === "con/c1/diem" && x.body?.delta === -15 && x.body?.lyDo === "Nói dối"), "gửi trừ 15 sao kèm lý do");
  xet(await doi(`Đã trừ 15 sao cho ${KEN}`), "báo đã trừ");
});

// ---------------------------------------------------------------- nhóm B: Hôm nay · App & web · máy · hồ sơ (thiết kế chốt 05/11)
/** Chữ cũ không được sót trên màn Ba Mẹ (L1 sao thay điểm, L4 bỏ Giám sát / Chặn thật, L5 bỏ PIN, L10 bỏ phiếu AiiCafe). */
// «điểm»: \b của regex không cờ u chỉ hiểu chữ ASCII (đ không phải «chữ») ⇒ /\bđiểm\b/ không bao giờ khớp — dùng ranh giới Unicode
// L5 «bỏ PIN» bị N7 (thiết kế 14/11 — user riêng từng bé, đăng nhập chọn tên + PIN) đảo lại ⇒ «PIN» không còn là chữ cũ.
const CHU_CU = [/(^|[^\p{L}])điểm(?![\p{L}])/iu, /Chặn thật/, /Giám sát/, /[Vv]oucher/, /phiếu quà/i, /AiiCafe/];
const chuCu = async () => { const t = (await chu()) ?? ""; return CHU_CU.filter((r) => r.test(t)).map(String); };
const nhanNut = (l) => `[aria-label="${l}"]`;
/** Bấm phần tử THẤY ĐƯỢC cuối cùng khớp bộ chọn CSS `chon` có chữ BẮT ĐẦU bằng `txt` (vd ô «Chặn · Con không mở được» trong nhóm radio). */
const bamTrong = async (chon, txt) => {
  const r = await viTriYen(`() => [...document.querySelectorAll(${JSON.stringify(chon)})].filter((e) => e.innerText?.trim().startsWith(${JSON.stringify(txt)}) && e.getBoundingClientRect().width > 0).pop()`);
  if (r) await nhanChuot(r);
  return !!r;
};
/** Bấm dòng chữ (phần tử lá) thấy được đầu tiên BẮT ĐẦU bằng `txt` (nút có giờ đổi theo lúc chạy, vd «Khoá 2 máy tới 20:10»). */
const bamDauCo = async (txt) => {
  const r = await viTriYen(`() => [...document.querySelectorAll("div,span")].filter((e) => !e.children.length && e.innerText?.trim().startsWith(${JSON.stringify(txt)}) && e.getBoundingClientRect().width > 0)[0]`);
  if (r) await nhanChuot(r);
  return !!r;
};
/** Như bam() nhưng bấm phần tử THẤY ĐƯỢC ĐẦU TIÊN có đúng chữ (vd «Không cho» của thẻ lời xin đầu, không phải thẻ app mới bên dưới). */
const bamDau = async (txt) => {
  const r = await viTriYen(`() => [...document.querySelectorAll("div,span")].filter((e) => e.innerText?.trim() === ${JSON.stringify(txt)} && e.getBoundingClientRect().width > 0)[0]`);
  if (r) await nhanChuot(r);
  return !!r;
};

await kichBan("Hôm nay ⇒ «Khoá máy con» mở bảng «Khoá máy <Con>?» liệt kê máy + «Khoá bao lâu?» ⇒ khoá ⇒ báo + Hoàn tác mở lại (thiết kế 14/11 bm-hang-ngay/05)", async () => {
  await di("/hom-nay");
  await doi("Khoá máy"); await bam("Khoá máy");
  xet(await doi(`Khoá máy ${KEN}?`), "mở bảng «Khoá máy <Con>?»");
  xet(await doi("Đang tắt · khoá khi máy mở lên"), "bảng liệt kê máy + trạng thái (máy tắt khoá khi mở lên)");
  xet(await doi("Khoá bao lâu?"), "chọn khoá bao lâu");
  await bamChon('[role="radio"][aria-label^="1 giờ"]');
  nhatKy.length = 0;
  xet(await bamDauCo(`Khoá ${KEN} tới `), "nút «Khoá <Con> tới HH:MM» (đủ máy ⇒ khoá theo bé)");
  xet(await choGoi((x) => x.d === "con/c1/khoa" && x.m === "POST" && x.body?.khoa === true && !!x.body?.den), "gửi khoá máy của Con kèm hạn");
  xet(await doi(`Đã khoá ${KEN} trên mọi máy`), "báo đã khoá");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "con/c1/khoa" && x.body?.khoa === false), "Hoàn tác ⇒ mở lại máy");
});

await kichBan("Hôm nay (Trang chủ gọn 14/11 — N8): «Cần Ba Mẹ để ý» chỉ 1 mục gấp nhất + «Tất cả ›»; «<Con> vừa làm xong» mở thẳng bằng chứng; lời xin «Cho 15 phút» một chạm ⇒ kết quả + Hoàn tác; «Không cho»", async () => {
  await di("/hom-nay");
  xet(await doi("Cần Ba Mẹ để ý"), "mục «Cần Ba Mẹ để ý»");
  xet((await chu()).includes("iPad của Bảo Anh chưa được bảo vệ"), "nêu đúng máy chưa được bảo vệ");
  xet(await doi("Tất cả ›"), "có «Tất cả ›» sang Thông báo");
  xet(await doi(`${KEN} vừa làm xong`), "mục «<Con> vừa làm xong»");
  xet(await doi("Xem và duyệt 3 việc"), "nút «Xem và duyệt N việc»");
  await bam("Rửa chén sau bữa tối");
  xet(await doi(`Duyệt · ${KEN} nhận 10 sao`), "việc vừa làm xong mở THẲNG màn bằng chứng (nút duyệt nói rõ số sao)");
  // Bill: lời xin vay (máy cũ them_gio 15 phút = vay 15 sao) là mục gấp nhất
  await di("/hom-nay");
  await doi("Khoá máy");
  await bam(BILL);
  xet(await doi("Xin Ba Mẹ cho vay 15 sao"), "chọn Bill ⇒ lời xin vay có tiêu đề rõ số sao");
  xet(await doi("«Con đang xây dở nhà»"), "hiện lời nhắn của con");
  nhatKy.length = 0;
  await bam("Cho vay 15 sao");
  xet(await choGoi((x) => x.d === "yeu-cau/y2/dong-y" && x.body?.soSao === 15), "Cho vay ⇒ đồng ý đúng số sao con xin");
  xet(await doi(`Đã cho ${BILL} vay 15 sao`), "màn kết quả «Đã cho <Con> vay N sao»");
  xet(await doi("Sao nhiệm vụ sẽ trả nợ trước"), "màn kết quả nói rõ trả nợ trước");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "vay/g2/hoan-tac"), "Hoàn tác ⇒ gọi vay/:grant/hoan-tac");
  await di("/hom-nay");
  await doi("Khoá máy");
  await bam(BILL);
  await doi("Xin Ba Mẹ cho vay 15 sao");
  nhatKy.length = 0;
  await bamDau("Không cho");
  xet(await choGoi((x) => /^yeu-cau\/y[23]\/tu-choi$/.test(x.d) && x.body?.lyDo === "Ba Mẹ chưa cho lúc này"), "Không cho ⇒ từ chối kèm câu nhẹ nhàng");
  xet(await doi("Đã không cho lần này"), "màn kết quả «Đã không cho lần này»");
  // lời xin ngoại lệ cũ (YouTube 30 phút) = xin vay 30 sao — không còn «ngoại lệ»
  kb["GET cho-duyet"] = { ...coBan["GET cho-duyet"], yeuCau: coBan["GET cho-duyet"].yeuCau.filter((y) => y.id === "y3") };
  await di("/hom-nay");
  await doi("Khoá máy");
  await bam(BILL);
  xet(await doi("Xin Ba Mẹ cho vay 30 sao"), "lời xin ngoại lệ cũ hiện thành xin vay 30 sao");
  xet(!(await chu()).includes("ngoại lệ"), "không còn chữ «ngoại lệ»");
});

await kichBan("Đổi tab qua lại ×3 rồi về Hôm nay ⇒ vẫn bấm được + cuộn được (TestFlight build 10: Trang chủ đứng)", async () => {
  await di("/hom-nay");
  xet(await doi("Khoá máy"), "Hôm nay đã tải");
  // màn đang mở = chữ đặc trưng của tab nằm trong khung nhìn (màn tab khác vẫn gắn nhưng trượt ra ngoài / ẩn)
  // (lỗi gốc chỉ có ở bản native — react-native-screens + native driver; web không tái hiện được, kịch bản này giữ hành vi đổi tab ở web.)
  const tab = (t) => `[role="tab"][aria-label^="${t}"]`;
  const DAU = { "Hôm nay": "Khoá máy", "Việc & quà": "Việc mỗi ngày", "Báo cáo": "Sao kiếm, sao vay", "Cả nhà": "Người lớn trông con" };
  const dangMo = async (t) => { for (const het = Date.now() + 5000; Date.now() < het;) {
    if (await js(`[...document.querySelectorAll("div,span")].some((e) => e.innerText?.trim().startsWith(${JSON.stringify(DAU[t])}) && e.children.length <= 1 && (() => { const b = e.getBoundingClientRect();
      return b.width > 0 && b.left >= 0 && b.right <= innerWidth + 1 && b.top < innerHeight && b.bottom > 0 && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) !== null && e.contains(document.elementFromPoint(b.x + b.width / 2, Math.min(b.y + b.height / 2, innerHeight - 1))); })())`)) return true;
    await goi("Input.dispatchMouseEvent", { type: "mouseWheel", x: 195, y: 420, deltaX: 0, deltaY: 400 }); await sleep(150); } return false; };
  let du = true; const saiTab = [];
  for (let r = 0; r < 3; r++) for (const t of ["Việc & quà", "Báo cáo", "Cả nhà", "Hôm nay"]) { await bamChon(tab(t)); const ok = await dangMo(t); if (!ok) saiTab.push(`${r}:${t}`); du = ok && du; await sleep(300); }
  xet(du, `mỗi lần bấm tab đều mở đúng tab (12 lần)${saiTab.length ? ` — sai ${saiTab.join(" ")}` : ""}`);
  await js(`document.querySelectorAll("div").forEach((e) => { if (e.scrollTop) e.scrollTop = 0; })`); await sleep(200);
  // bấm: điểm giữa chip «Bill» phải là chính nó (không bị màn tab khác trong suốt đè lên) và bấm thì đổi Con
  const chip = `() => [...document.querySelectorAll('[role="tab"]')].find((e) => e.innerText?.split("\\n").map((x) => x.trim()).includes(${JSON.stringify(BILL)}) && e.getBoundingClientRect().width > 0)`;     // dải avatar (14/11): «B · 1 · Bill · còn 18′»
  const r = await viTriYen(chip);
  xet(!!r?.trung, "chip Con không bị lớp nào che (elementFromPoint trúng chip)");
  if (r) await nhanChuot(r);
  xet(await doi("Xin Ba Mẹ cho vay 15 sao"), "bấm chip Bill ⇒ hiện lời xin của Bill");
  // cuộn: lăn chuột giữa màn ⇒ khung cuộn của Hôm nay phải đổi vị trí
  const khung = `(() => [...document.querySelectorAll("div")].filter((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)
    && e.innerText.includes("Khoá máy") && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().left > -5 && e.getBoundingClientRect().left < 5).pop())()`;
  await js(`${khung}?.scrollTo(0, 0)`); await sleep(200);
  const dau = await js(`${khung}?.scrollTop ?? -1`);
  await goi("Input.dispatchMouseEvent", { type: "mouseWheel", x: 195, y: 420, deltaX: 0, deltaY: 500 });
  await sleep(600);
  const sau = await js(`${khung}?.scrollTop ?? -1`);
  xet(dau === 0 && sau > 0, `lăn chuột ⇒ Hôm nay cuộn (scrollTop ${dau} → ${sau})`);
});

await kichBan("Báo cáo tuần ⇒ Xuất CSV", async () => {
  await di("/bao-cao");
  xet(await doi("Xuất báo cáo tuần (CSV cho Excel)"), "có nút Xuất báo cáo tuần (CSV)");
  await bam("Xuất báo cáo tuần (CSV cho Excel)");
  xet(await choGoi((x) => x.d === "con/c1/bao-cao/csv"), "tải CSV từ máy chủ");
});

await kichBan("Giờ yên lặng: bật ⇒ lưu ⇒ báo đã bật", async () => {
  await di("/thong-bao/cai-dat");
  await doi("Giờ yên lặng");
  await bamChon('[role="switch"][aria-label="Giờ yên lặng"]');
  await sleep(500);
  xet(nhatKy.some((x) => x.d === "thong-bao/cai-dat" && x.body?.yenLang?.bat === true && x.body?.tat?.includes("thanh_tich")), "bật giờ yên lặng, giữ nhóm đã tắt");
  xet(await doi("Đã bật giờ yên lặng"), "báo đã bật");
});

await kichBan("Hồ sơ Con: mục «Liên kết AiiRob» hiện mã <family_id>.<child_id> + nút Sao chép mã; lỗi tải mã không làm hỏng màn", async () => {
  await goi("Browser.grantPermissions", { origin: GOC, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  await di("/ho-so/c1");
  xet(await doi("Liên kết AiiRob"), "có mục Liên kết AiiRob");
  xet(await doi(MA_AIIROB), "hiện đúng mã liên kết");
  xet(nhatKy.some((x) => x.m === "GET" && x.d === "con/c1/lien-ket-aiirob"), "gọi GET con/c1/lien-ket-aiirob");
  await bam("Sao chép mã");
  xet((await js("navigator.clipboard.readText().catch(() => null)")) === MA_AIIROB, "Sao chép ⇒ mã vào bộ nhớ tạm");
  xet(await doi("Đã sao chép mã"), "báo đã sao chép");
  kb["GET con/c1/lien-ket-aiirob"] = { status: 500, body: { error: "loi", message: "Lỗi máy chủ" } };
  await di("/ho-so/c1");
  xet(await doi("App & web"), "lỗi tải mã: màn hồ sơ vẫn hiện");
  await sleep(800);
  xet(!(await chu())?.includes("Liên kết AiiRob"), "lỗi tải mã: ẩn mục liên kết");
});

await kichBan("Hôm nay: thẻ số sao (145 sao, không nợ) + «Cho vay sao» bảng trượt; đang chơi; app mới chờ xếp; không chữ cũ", async () => {
  await di("/hom-nay");
  xet(await doi("145 sao"), "thẻ đầu: «⭐ 145 sao» (chưa nợ)");
  xet((await chu()).includes("= 145 phút chơi"), "dòng «= N phút chơi» (1 sao = 1 phút)");
  xet((await chu()).includes("Roblox · Laptop"), "dòng con đang làm gì (app đang chơi · máy)");
  { const cu = await chuCu(); xet(!cu.length, `không còn chữ cũ (${cu.join(", ")})`); }
  await bam("Cho vay sao");
  xet(await doi(`Cho ${KEN} vay sao`), "mở bảng «Cho <Con> vay sao»");
  xet(await doi(`Cho ${KEN} vay 15 sao`), "mặc định 15 sao");
  await bam("Thôi");
  // app mới chưa xếp: chỉ hiện khi là mục gấp nhất (N8 — «Cần Ba Mẹ để ý» chỉ 1 mục)
  kb["GET tuan-thu"] = { ds: coBan["GET tuan-thu"].ds.map((m) => ({ ...m, baoVe: "day_du", baoVeThieu: [] })) };
  kb["GET canh-bao"] = { ds: [] };
  await di("/hom-nay");
  xet(await doi("3 app mới chờ Ba Mẹ xếp"), "không còn việc gấp hơn ⇒ app mới chưa xếp hiện ở Hôm nay");
  await bam("3 app mới chờ Ba Mẹ xếp");
  xet(await doi("đang ở chế độ"), "app mới ⇒ mở tab Chặn để xếp (Trang chủ 14/11 không chặn một chạm nữa — N8)");
});

await kichBan("Giao việc từ danh mục (thiết kế 14/11): đúng Con đang chọn ⇒ chọn việc ⇒ «Thêm N việc vào ngày của <Con>»; Ba Mẹ tự thêm: tên ngắn bị chặn", async () => {
  await di("/giao-nv?con=c2");
  xet(await doi("Đọc sách 20 phút"), "mở danh mục việc (mục Học)");
  xet(await doi(`Thêm vào ngày của ${BILL}`), "giao cho đúng Con đang xem (Bill)");
  await bamChon(nhanNut("Đọc sách 20 phút, 10 sao"));
  await bamChon(nhanNut("Học 1 bài với AiiRob, 20 sao"));
  xet(await doi(`Thêm 2 việc vào ngày của ${BILL}`), "chọn 2 việc ⇒ nút đếm đúng");
  nhatKy.length = 0;
  await bam(`Thêm 2 việc vào ngày của ${BILL}`);
  xet(await choGoi((x) => x.d === "nhiem-vu/danh-muc" && x.m === "POST" && x.body?.con === "c2" && x.body?.viec?.length === 2), "gửi danh mục + Con + đúng các việc đã chọn");
  await di("/giao-nv/tu-dat?con=c2");
  await doi("Con sẽ làm gì?");
  await go("Con sẽ làm gì?", "1");
  xet(await doi("ít nhất 3 ký tự"), "tên 1 ký tự: báo lỗi rõ");
  await go("Con sẽ làm gì?", "Dọn bàn học");
  await sleep(300);
  nhatKy.length = 0;
  await bam("Thêm vào mục đã chọn");
  xet(await choGoi((x) => x.d === "nhiem-vu" && x.m === "POST" && x.body?.ten === "Dọn bàn học" && Array.isArray(x.body?.giao_cho) && x.body.giao_cho[0] === "c2" && x.body?.diem === 10),
    "gửi việc riêng cho đúng Con, có số sao");
});

// ---------------------------------------------------------------- «App & web» 15/11 (#262 / #258): Mở hết / Theo danh sách, danh sách trắng 2 nhóm, lời xin 3 cách
/** Chữ của luồng Chặn cũ không được sót trên màn App & web của Ba Mẹ. */
const CHU_CHAN = [/Chặn/, /chặn/, /Luôn chặn/, /người lớn/, /Giờ ngủ/, /Giờ học/, /Tính giờ/, /đèn/];
const chuChan = async () => { const t = (await chu()) ?? ""; return CHU_CHAN.filter((r) => r.test(t)).map(String); };

await kichBan("App & web: Hồ sơ ⇒ tab «App & web» ⇒ «Theo danh sách» + Con đang xin + danh sách 2 nhóm ⇒ đổi «Mở hết» (con/:id/che-do) ⇒ Hoàn tác", async () => {
  await di("/ho-so/c1");
  xet(await doi("App & web"), "hồ sơ có dòng «App & web»");
  await bam("App & web");
  xet(await doi(`Máy của ${KEN} đang ở chế độ`), "mở tab App & web của đúng Con");
  xet(await coChon('[role="radio"][aria-checked="true"][aria-label="Theo danh sách"]'), "chế độ «Theo danh sách» đang chọn");
  const c = await chu();
  xet(c.includes("Chỉ mở app, web Ba Mẹ đã thêm") && c.includes("App, web mới: con xin Ba Mẹ"), "thẻ chế độ nói đúng 2 ý");
  xet(c.includes("Con đang xin") && c.includes("YouTube") && c.includes("Trả lời ›"), "«Con đang xin» YouTube + Trả lời ›");
  xet(c.includes(`Danh sách của ${KEN}`) && c.includes("Tính phút") && c.includes("Không tính phút"), "«Danh sách của <Con>» + chú thích 2 nhóm");
  xet(c.includes("Đã bỏ qua 2 lời xin"), "hàng «Đã bỏ qua 2 lời xin · Xem ›»");
  { const cu = await chuChan(); xet(!cu.length, `không còn chữ luồng Chặn (${cu.join(", ")})`); }
  nhatKy.length = 0;
  kb["GET con/c1/danh-sach"] = dsCon("c1", KEN, { cheDo: "mo_het", cheDoChan: "mo_het", tenCheDo: "Mở hết", tamNghi: true });
  await bamChon('[role="radio"][aria-label="Mở hết"]');
  xet(await choGoi((x) => x.d === "con/c1/che-do" && x.m === "POST" && x.body?.cheDo === "mo_het"), "đổi chế độ gửi POST con/:id/che-do {mo_het}");
  xet(await doi(`${KEN}: Mở hết`), "báo đã đổi + Hoàn tác");
  xet(await doi("Đang tạm nghỉ, vẫn giữ nguyên"), "Mở hết ⇒ danh sách «Đang tạm nghỉ, vẫn giữ nguyên»");
  xet((await chu()).includes("Con mở mọi app, mọi trang web"), "thẻ Mở hết: «Con mở mọi app, mọi trang web · Không tính phút»");
  nhatKy.length = 0;
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "con/c1/che-do" && x.body?.cheDo === "theo_danh_sach"), "Hoàn tác ⇒ về «Theo danh sách»");
});

await kichBan("App của <Con>: 2 nhóm + phút / sao hôm nay ⇒ Roblox ⇒ «Không tính phút» ⇒ danh-sach/doi đủ định danh; «Bỏ Roblox khỏi danh sách» ⇒ danh-sach/bo", async () => {
  await di("/chan?con=c1");
  await doi(`Danh sách của ${KEN}`);
  await bamChon('[aria-label^="App:"]');
  xet(await doi(`App của ${KEN}`), "«Sửa ›» App ⇒ danh sách App của Con");
  const c = await chu();
  xet(c.includes("Hôm nay trừ 39 phút · −39 sao") && c.includes("Hôm nay 40 phút"), "Tính phút ghi phút + sao; Không tính phút chỉ ghi phút");
  xet(c.includes(`${KEN} chỉ mở được 4 app này`), "câu «<Con> chỉ mở được 4 app này»");
  await bam("Roblox");
  xet(await doi("Roblox có tính phút không?"), "mở màn một app");
  xet(await coChon('[role="radio"][aria-checked="true"][aria-label^="Tính phút"]'), "nhóm hiện tại «Tính phút» đang chọn");
  await bamChon('[role="radio"][aria-label^="Không tính phút"]');
  nhatKy.length = 0;
  await bam("Lưu: Roblox không tính phút");
  xet(await choGoi((x) => x.d === "con/c1/danh-sach/doi" && x.body?.nhom === "khong_tinh_phut" && x.body?.muc?.length === 3), "gửi danh-sach/doi với đủ 3 định danh của Roblox");
  xet(await doi(`Thêm app cho ${KEN}`), "Lưu ⇒ về danh sách App");
  await di("/ung-dung/app?con=c1&ten=Netflix");
  await doi("Bỏ Netflix khỏi danh sách");
  nhatKy.length = 0;
  await bam("Bỏ Netflix khỏi danh sách");
  xet(await choGoi((x) => x.d === "con/c1/danh-sach/bo" && x.body?.muc?.[0] === "netflix.exe"), "Bỏ khỏi danh sách ⇒ danh-sach/bo");
  { const cu = await chuChan(); xet(!cu.length, `không còn chữ luồng Chặn (${cu.join(", ")})`); }
});

await kichBan("Thêm app / Thêm web: tìm ⇒ chạm ＋ ⇒ «<mục> có tính phút không?» ⇒ «Thêm Minecraft · Không tính phút» / «Thêm tiktok.com · Tính phút» ⇒ POST danh-sach {ds}", async () => {
  await di("/ung-dung/them?con=c1");
  xet(await doi(`Thêm app cho ${KEN}`), "mở Thêm app");
  await go("Tìm app", "mine");
  xet(await doi("Minecraft"), "gõ tên ⇒ hiện kết quả khớp");
  await bam("Minecraft");
  xet(await doi("Minecraft có tính phút không?"), "chạm app ⇒ hỏi nhóm ngay dưới");
  await bamTrong('[role="radio"]', "Không tính phút");
  nhatKy.length = 0;
  await bam("Thêm Minecraft · Không tính phút");
  xet(await choGoi((x) => x.d === "con/c1/danh-sach" && x.m === "POST" && x.body?.ds?.length === 1 && x.body.ds[0].ma === "minecraft" && x.body.ds[0].nhom === "khong_tinh_phut"),
    "POST danh-sach {ds: [{ma: minecraft, nhom: khong_tinh_phut}]}");
  await di("/web/them?con=c1");
  xet(await doi(`Thêm web cho ${KEN}`), "mở Thêm web");
  await go("Địa chỉ trang web", "tiktok.com");
  xet(await doi("m.tiktok.com"), "gõ tên miền ⇒ cả tên miền đi kèm");
  await bamDau("tiktok.com");
  xet(await doi("tiktok.com có tính phút không?"), "chạm ＋ ⇒ hỏi nhóm");
  nhatKy.length = 0;
  await bam("Thêm tiktok.com · Tính phút");
  xet(await choGoi((x) => x.d === "con/c1/danh-sach" && x.body?.ds?.[0]?.muc === "tiktok.com" && x.body.ds[0].kieu === "web" && x.body.ds[0].nhom === "tinh_phut"),
    "POST danh-sach {ds: [{muc: tiktok.com, kieu: web, nhom: tinh_phut}]}");
});

await kichBan("Lời xin app: tab ⇒ «Trả lời ›» ⇒ 3 cách ⇒ «Tính phút» (dong-y {nhom}) ⇒ «Đã thêm YouTube · Tính phút» ⇒ «Đổi sang Không tính phút» ⇒ Hoàn tác (bỏ khỏi danh sách)", async () => {
  kb["GET cho-duyet"] = CHO_DUYET_Y5();
  await di("/chan?con=c1");
  await doi("Trả lời ›");
  await bam("Trả lời ›");
  xet(await doi(`Thêm YouTube cho ${KEN}?`), "mở «Con xin mở» YouTube");
  const c = await chu();
  xet(c.includes("«Con xem video hướng dẫn vẽ ạ»") && /Chờ \d+′/.test(c), "lời nhắn của con + «Chờ N′»");     // N tăng theo lúc chạy (dữ liệu giả tính từ đầu kịch bản)
  xet(c.includes("Thêm vào danh sách · trả bằng sao") && c.includes("Thêm vào danh sách · vào thoải mái") && c.includes("Không ghi gì · con xin lại được"), "đủ 3 cách trả lời");
  nhatKy.length = 0;
  await bam("Tính phút");
  xet(await choGoi((x) => x.d === "yeu-cau/y5/dong-y" && x.body?.nhom === "tinh_phut"), "Tính phút ⇒ dong-y {nhom: tinh_phut}");
  xet(await doi("Đã thêm YouTube · Tính phút"), "màn «Đã thêm YouTube · Tính phút»");
  xet(await doi("Tính phút · 1 sao = 1 phút xem"), "viên «Tính phút · 1 sao = 1 phút xem»");
  nhatKy.length = 0;
  kb["GET con/c1/danh-sach"] = dsCon("c1", KEN, { app: { ...dsCon("c1", KEN).app, tinhPhut: [...dsCon("c1", KEN).app.tinhPhut, hangDs("YouTube", "app", "tinh_phut", ["youtube.exe"])] } });
  await bam("Đổi sang Không tính phút");
  xet(await choGoi((x) => x.d === "con/c1/danh-sach/doi" && x.body?.nhom === "khong_tinh_phut" && x.body?.muc?.[0] === "youtube.exe"), "Đổi ⇒ danh-sach/doi {khong_tinh_phut}");
  xet(await doi("Đã thêm YouTube · Không tính phút"), "tiêu đề đổi sang Không tính phút");
  nhatKy.length = 0;
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "con/c1/danh-sach/bo" && x.body?.muc?.[0] === "youtube.exe"), "Hoàn tác ⇒ bỏ YouTube khỏi danh sách");
});

await kichBan("Lời xin app: «Bỏ qua» ⇒ bo-qua ⇒ «Đã bỏ qua YouTube · Không ghi gì vào danh sách» ⇒ «Hoàn tác, xem lại lời xin» ⇒ hoan-tac ⇒ về lời xin", async () => {
  kb["GET cho-duyet"] = CHO_DUYET_Y5();
  await di("/yeu-cau-web/y5");
  await doi(`Thêm YouTube cho ${KEN}?`);
  nhatKy.length = 0;
  await bam("Bỏ qua");
  xet(await choGoi((x) => x.d === "yeu-cau/y5/bo-qua" && x.m === "POST"), "Bỏ qua ⇒ POST yeu-cau/:id/bo-qua (không tu-choi)");
  xet(!nhatKy.some((x) => /tu-choi$/.test(x.d)), "không gọi tu-choi kiểu cũ");
  xet(await doi("Đã bỏ qua YouTube"), "màn «Đã bỏ qua YouTube»");
  xet((await chu()).includes("Không ghi gì vào danh sách") && (await chu()).includes(`Sẽ báo ${KEN} sau 60 giây`), "trong 60 giây: «Sẽ báo <con> sau 60 giây» + «Không ghi gì vào danh sách»");
  xet(/còn \d+ giây để hoàn tác/.test(await chu()), "đếm ngược theo đồng hồ máy");
  xet(!nhatKy.some((x) => x.d === "yeu-cau/y5/bo-qua" && x.q), "không mang hạn của máy chủ sang màn");
  nhatKy.length = 0;
  await bam("Hoàn tác, xem lại lời xin");
  xet(await choGoi((x) => x.d === "yeu-cau/y5/hoan-tac" && x.m === "POST"), "Hoàn tác ⇒ POST yeu-cau/:id/hoan-tac");
  xet(await doi(`Thêm YouTube cho ${KEN}?`), "về lại lời xin để trả lời lại");
});

await kichBan("Lời xin đã bỏ qua: tab ⇒ «Đã bỏ qua 2 lời xin · Xem ›» ⇒ danh sách ⇒ «Thêm luôn» Minecraft ⇒ chọn Không tính phút ⇒ them-luon {nhom}", async () => {
  await di("/chan?con=c1");
  await doi("Đã bỏ qua 2 lời xin");
  await bamChon('[aria-label^="Đã bỏ qua 2 lời xin"]');
  xet(await doi("Bỏ qua là chưa thêm, không ghi gì."), "mở «Lời xin đã bỏ qua»");
  xet(await choGoi((x) => x.d === "yeu-cau/bo-qua" && x.q === "?con=c1"), "tải GET yeu-cau/bo-qua?con=c1");
  const c = await chu();
  xet(c.includes("Minecraft") && c.includes("tiktok.com") && c.includes(`${KEN} · hôm qua`), "mỗi lời xin một dòng + «<Con> · hôm qua 20:05»");
  await bamChon('[aria-label="Thêm luôn Minecraft"]');
  xet(await doi("Minecraft có tính phút không?"), "«Thêm luôn» ⇒ bảng chọn nhóm");
  await bamTrong('[role="radio"]', "Không tính phút");
  nhatKy.length = 0;
  await bam("Thêm Minecraft · Không tính phút");
  xet(await choGoi((x) => x.d === "yeu-cau/y7/them-luon" && x.body?.nhom === "khong_tinh_phut"), "POST yeu-cau/:id/them-luon {nhom: khong_tinh_phut}");
  xet(await doi(`Đã thêm Minecraft cho ${KEN} · Không tính phút`), "báo đã thêm");
  { const cu = await chuChan(); xet(!cu.length, `không còn «Luôn chặn» (${cu.join(", ")})`); }
});

await kichBan("Review #279: App của con có «Đã bỏ qua 1 lời xin» (chỉ app) ⇒ /bo-qua?kieu=app; thẻ «app mới» không con ⇒ luật cả nhà; người trông giúp không thấy «Đổi sang…»; Chờ duyệt «Bỏ qua» ⇒ toast + Hoàn tác tại chỗ", async () => {
  await di("/ung-dung?con=c1");
  xet(await doi("Đã bỏ qua 1 lời xin"), "danh sách App đếm đúng lời xin APP đã bỏ qua (1, không phải tổng 2)");
  await bamChon('[aria-label^="Đã bỏ qua 1 lời xin"]');
  xet(await doi("Bỏ qua là chưa thêm, không ghi gì."), "mở «Lời xin đã bỏ qua»");
  await sleep(400);
  xet((await chu()).includes("Minecraft") && !(await chu()).includes("tiktok.com"), "?kieu=app ⇒ chỉ lời xin app");
  await di("/app-web?xep=capcut.exe&ten=CapCut");
  xet(await doi("App của cả nhà"), "thẻ «app mới» không kèm con ⇒ màn «App của cả nhà»");
  await bamChon('[role="radio"][aria-label^="Tính phút"]');
  nhatKy.length = 0;
  await bam("Lưu: CapCut tính phút");
  xet(await choGoi((x) => x.d === "luat" && x.m === "POST" && x.body?.muc === "capcut.exe" && x.body?.loai === "tinh_phut" && !x.body?.con), "POST luat cả nhà (không con) loai tinh_phut");
  kb["GET toi"] = { baMe: { ...coBan["GET toi"].baMe, quyen: "trong_giup", vai: "xem", laChuNha: false } };
  await di(`/yeu-cau/xong?kieu=mo&ten=${encodeURIComponent(KEN)}&con=c1&muc=YouTube&ma=youtube.exe&phut=1`);
  xet(await doi("Đã thêm YouTube · Tính phút"), "màn kết quả");
  await sleep(1200);
  xet(!(await chu()).includes("Đổi sang Không tính phút") && !(await chu()).includes("Hoàn tác"), "người trông giúp: không có «Đổi sang…» / «Hoàn tác»");
  kb["GET toi"] = coBan["GET toi"];
  kb["GET cho-duyet"] = CHO_DUYET_Y5();
  await di("/cho-duyet");
  xet(await doi("Xin thêm YouTube") || await doi("Dùng app YouTube"), "Chờ duyệt có lời xin YouTube");
  nhatKy.length = 0;
  await bamDau("Bỏ qua");
  xet(await choGoi((x) => x.d === "yeu-cau/y5/bo-qua"), "Bỏ qua ⇒ bo-qua");
  xet(await doi("Đã bỏ qua YouTube"), "toast «Đã bỏ qua YouTube · … xin lại được» tại Chờ duyệt (không đẩy màn)");
  xet((await chu()).includes("Chờ duyệt"), "vẫn ở Chờ duyệt");
  nhatKy.length = 0;
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "yeu-cau/y5/hoan-tac"), "Hoàn tác trên toast ⇒ hoan-tac");
});

await kichBan("Lời xin app ở «<Con> đang xin phép» (them-a4nqjrmp): 3 nút Tính phút / Không tính phút / Bỏ qua; «Không tính phút» ⇒ dong-y {nhom}", async () => {
  kb["GET cho-duyet"] = CHO_DUYET_Y5();
  await di("/yeu-cau?con=c1");
  xet(await doi("YouTube chưa có trong danh sách"), "thẻ «YouTube chưa có trong danh sách»");
  xet((await chu()).includes("Theo danh sách"), "cuối màn: chế độ «Theo danh sách»");
  nhatKy.length = 0;
  await bamDau("Không tính phút");
  xet(await choGoi((x) => x.d === "yeu-cau/y5/dong-y" && x.body?.nhom === "khong_tinh_phut"), "Không tính phút ⇒ dong-y {nhom: khong_tinh_phut}");
  xet(await doi("Đã thêm YouTube · Không tính phút"), "màn kết quả");
});

await kichBan("Lần đầu: «<Con> dùng app thế nào?» chọn «Mở hết» ⇒ ẩn danh sách ⇒ «Tiếp: ghép máy» ⇒ POST thiet-lap {cheDo: mo_het}; Theo danh sách ⇒ app có viên nhóm, gửi nhom", async () => {
  const TL = { conId: "c1", tenCon: "Bảo Anh", namSinh: 2017, mau: 0, daLuu: [{ id: "c1", ten: "Bảo Anh", mau: 0, namSinh: 2017 }], cheDoChan: "chi_app_duoc_phep", quy: 60,
    ngu: { tu: "21:30", den: "06:30" }, apps: [{ ten: "Google Classroom", tinhGio: false }, { ten: "Roblox", tinhGio: true }] };
  await di("/chao"); await js(`sessionStorage.setItem("aiigrow.thiet-lap", ${JSON.stringify(JSON.stringify(TL))})`);
  await goi("Page.navigate", { url: `${GOC}/thiet-lap/che-do` });
  xet(await doi("Bảo Anh dùng app thế nào?"), "đường cũ che-do ⇒ màn gộp «<Con> dùng app thế nào?»");
  const c = await chu();
  xet(c.includes("Đã thêm 2 app · 1 tính phút") && c.includes("App khác: con xin Ba Mẹ"), "dòng đếm «Đã thêm 2 app · 1 tính phút»");
  xet(c.includes("Thêm vào nhóm"), "mỗi nhóm danh mục có «● Thêm vào nhóm …»");
  await bamChon('[role="radio"][aria-label^="Mở hết"]');
  xet(await doi("Tiếp: ghép máy của con"), "Mở hết ⇒ nút «Tiếp: ghép máy của con»");
  xet(!(await chu()).includes("Google Classroom"), "Mở hết ⇒ ẩn danh mục app");
  nhatKy.length = 0;
  await bam("Tiếp: ghép máy của con");
  xet(await choGoi((x) => x.d === "thiet-lap" && x.m === "POST" && x.body?.cheDo === "mo_het" && !("cheDoChan" in (x.body ?? {}))), "POST thiet-lap {cheDo: mo_het}");
  xet(nhatKy.find((x) => x.d === "thiet-lap")?.body?.apps?.some((a) => a.ten === "Roblox" && a.nhom === "tinh_phut"), "app gửi kèm nhom (Roblox ⇒ tinh_phut)");
});

await kichBan("Ứng dụng trên máy: Roblox Player ⇒ «Tính phút» ⇒ ung-dung/dat {tinh_phut} ⇒ Hoàn tác; «Bỏ … khỏi danh sách» ⇒ bo; không còn «Chặn»; Làm mới", async () => {
  await di("/may/m1");
  await doi("Ứng dụng trên máy này");
  await bam("Ứng dụng trên máy này");
  xet(await doi("Ứng dụng trên máy Laptop của Bảo Anh"), "mở danh sách mọi app trên máy");
  xet(await js(`[...document.querySelectorAll("img")].filter((i) => i.src.startsWith("data:image/png") && i.naturalWidth >= 96).length >= 5`), "icon thật ≥ 96 px hiện trong danh sách");
  await go("Tìm theo tên app hoặc nhà phát hành", "rob");
  await sleep(300);
  await bam("Roblox Player");
  xet(await doi("Trả bằng sao · 1 sao = 1 phút"), "bảng chọn 2 nhóm (Tính phút / Không tính phút)");
  await bamTrong('[role="radio"]', "Tính phút");
  nhatKy.length = 0;
  await bamDauCo("Thêm Roblox Player · ");
  xet(await doi("Đã thêm Roblox Player · Tính phút"), "báo đã thêm + Hoàn tác");
  xet(nhatKy.some((x) => x.d === "may/m1/ung-dung/dat" && x.body?.trangThai === "tinh_phut" && x.body?.khoa?.endsWith("robloxplayerbeta.exe")), "gửi khoa THẬT của máy, trạng thái tinh_phut");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "luat/xoa" && x.body?.muc === "robloxplayerbeta.exe" && x.body?.neuLoai === "giai_tri"), "Hoàn tác bỏ luật vừa đặt");
  { const cu = await chuChan(); xet(!cu.length, `không còn chữ luồng Chặn (${cu.join(", ")})`); }
  nhatKy.length = 0;
  await bam("Làm mới");
  xet(await choGoi((x) => x.d === "may/m1/ung-dung/lam-moi" && x.m === "POST"), "Làm mới gửi yêu cầu cho máy");
});
await kichBan("Máy của con và Hồ sơ Con báo CÙNG một mức bảo vệ", async () => {
  await di("/may?con=c1");
  xet(await doi("Chưa bảo vệ"), "danh sách máy: iPad «Chưa bảo vệ»");
  xet(await doi("Đang bảo vệ"), "danh sách máy: Laptop «Đang bảo vệ»");
  await di("/ho-so/c1");
  xet(await doi("iPad cần sửa"), "Hồ sơ Con cũng báo đúng máy cần sửa (iPad)");
  xet(!(await chu()).includes("đang được bảo vệ"), "không khen «đang được bảo vệ» khi còn máy cần sửa");
});

await kichBan("Sửa hồ sơ Con: điền sẵn tên cũ, gửi tên đã chuẩn hoá, báo kết quả; trùng tên ⇒ báo lỗi, màn giữ nguyên", async () => {
  await di("/ho-so/c1");
  xet(await doi("Sửa tên, năm sinh, ảnh"), "hồ sơ có «Sửa tên, năm sinh, ảnh»");
  await bam("Sửa tên, năm sinh, ảnh");
  xet(await doi("Lưu hồ sơ"), "mở màn Sửa hồ sơ");
  xet(await js(`[...document.querySelectorAll("input")].some((e) => e.getAttribute("aria-label") === "Tên gọi ở nhà" && e.value === ${JSON.stringify(KEN)})`), "ô tên điền sẵn tên hiện tại");
  await go("Tên gọi ở nhà", "  Kenny   Vũ ");
  await sleep(200);
  nhatKy.length = 0;
  await bam("Lưu hồ sơ Kenny Vũ");
  xet(await choGoi((x) => x.d === "con/c1/sua" && x.m === "POST" && x.body?.ten === "Kenny Vũ"), "gửi tên đã trim + gộp khoảng trắng");
  xet(await doi("Đã lưu hồ sơ Kenny Vũ"), "báo đã lưu");
  kb["POST con/c1/sua"] = { status: 400, body: { error: "ten_trung", message: "Nhà đã có Con tên «Bill» — chọn tên khác nhé" } };
  await di("/ho-so/sua?id=c1");
  await doi("Tên gọi ở nhà");
  await go("Tên gọi ở nhà", "Bill");
  await sleep(200);
  await bam("Lưu hồ sơ Bill");
  xet(await doi("Nhà đã có Con tên"), "tên trùng ⇒ hiện lỗi từ máy chủ");
  xet(await js(`document.body.innerText.includes("Lưu hồ sơ Bill")`), "lỗi ⇒ vẫn ở màn sửa");
});

await kichBan("Lần đầu · Hồ sơ con (#306): PIN 4 số bắt buộc ở cả 3 nút; «+ Thêm con khác» trên, nút nổi dưới (Lưu hồ sơ / Xong, giao việc cho <Con đầu> trước)", async () => {
  const viTri = (a, b) => js(`(() => { const t = document.body.innerText; return [t.indexOf(${JSON.stringify(a)}), t.indexOf(${JSON.stringify(b)})]; })()`);
  await di("/thiet-lap/ten-con");
  await doi("Tên gọi ở nhà");
  await go("Tên gọi ở nhà", "Bảo Anh");
  await sleep(300);
  const [a, b] = await viTri("+ Thêm con khác", "Lưu hồ sơ Bảo Anh");
  xet(a > 0 && b > a, "«+ Thêm con khác» nằm trên «Lưu hồ sơ Bảo Anh»");
  nhatKy.length = 0;
  await bam("Lưu hồ sơ Bảo Anh");
  await bam("+ Thêm con khác");
  await sleep(600);
  xet(!nhatKy.some((x) => x.d === "thiet-lap") && (await chu()).includes("Đặt mã PIN 4 số cho con trước"), "chưa có PIN: «Lưu hồ sơ» tắt, «+ Thêm con khác» báo cần PIN, không gửi gì");
  await go("Đặt PIN 4 số", "48");
  await bam("Lưu hồ sơ Bảo Anh");
  await sleep(400);
  xet(!nhatKy.some((x) => x.d === "thiet-lap"), "PIN mới 2 số vẫn không lưu");
  await go("Đặt PIN 4 số", "4821");
  await sleep(300);
  nhatKy.length = 0;
  await bam("Lưu hồ sơ Bảo Anh");
  xet(await choGoi((x) => x.d === "thiet-lap" && x.m === "POST"), "đủ PIN 4 số ⇒ lưu hồ sơ");
  xet(await choGoi((x) => /^con\/[^/]+\/pin$/.test(x.d) && x.m === "POST" && x.body?.pin === "4821"), "đặt PIN cho con vừa lưu");
  // đã có con khác ⇒ «Xong, giao việc cho <Con đầu> trước» thay «Lưu hồ sơ»
  await di("/chao"); await js(`sessionStorage.setItem("aiigrow.thiet-lap", ${JSON.stringify(JSON.stringify({ daLuu: [{ id: "c1", ten: "Bảo Anh", mau: 0, namSinh: 2017 }] }))})`);
  await goi("Page.navigate", { url: `${GOC}/thiet-lap/ten-con` });
  await doi("Tên gọi ở nhà");
  await go("Tên gọi ở nhà", "Bảo Minh");
  await sleep(300);
  const c = await chu();
  const [a2, b2] = await viTri("+ Thêm con khác", "Xong, giao việc cho Bảo Anh trước");
  xet(a2 > 0 && b2 > a2 && !c.includes("Lưu hồ sơ"), "con thứ hai: «+ Thêm con khác» trên, «Xong, giao việc cho Bảo Anh trước» dưới, không còn «Lưu hồ sơ»");
  nhatKy.length = 0;
  await bam("Xong, giao việc cho Bảo Anh trước");
  await sleep(500);
  xet(!nhatKy.some((x) => x.d === "thiet-lap"), "chưa PIN: «Xong, giao việc…» không lưu con đang điền");
  await go("Đặt PIN 4 số", "7391");
  await sleep(300);
  await bam("Xong, giao việc cho Bảo Anh trước");
  xet(await choGoi((x) => x.d === "thiet-lap" && x.m === "POST" && x.body?.con?.ten === "Bảo Minh"), "có PIN ⇒ lưu Bảo Minh rồi sang Giao việc");
});

await kichBan("Lần đầu · mở lại hồ sơ Con ĐÃ có PIN (#306): không bắt gõ lại PIN, ô trống không POST PIN; gõ dở thì báo đủ 4 số", async () => {
  kb["GET con/c1"] = { ...(kb["GET con/c1"] ?? {}), coPin: true };
  await di("/chao"); await js(`sessionStorage.setItem("aiigrow.thiet-lap", ${JSON.stringify(JSON.stringify({ conId: "c1", tenCon: "Bảo Anh", namSinh: 2017, mau: 0, daLuu: [{ id: "c1", ten: "Bảo Anh", mau: 0, namSinh: 2017 }] }))})`);
  await goi("Page.navigate", { url: `${GOC}/thiet-lap/ten-con` });
  xet(await doi("Con đã có PIN"), "Con đã có PIN ⇒ ghi chú «để trống nếu giữ nguyên»");
  nhatKy.length = 0;
  await bam("Lưu hồ sơ Bảo Anh");
  xet(await choGoi((x) => x.d === "thiet-lap" && x.m === "POST"), "PIN trống vẫn lưu được");
  await sleep(400);
  xet(!nhatKy.some((x) => /^con\/[^/]+\/pin$/.test(x.d)), "không POST PIN khi ô trống (không đè PIN cũ)");
});

await kichBan("Lần đầu · Giờ chơi (#306): quà khởi đầu −/+ bước 10 (0…200), ô số phút gõ trực tiếp, −/+ 15 phút, «Không cần nghỉ» ⇒ phutMoiLuot 0, gửi đúng", async () => {
  const TL = { conId: "c1", tenCon: "Bảo Anh", namSinh: 2017, mau: 0, daLuu: [{ id: "c1", ten: "Bảo Anh", mau: 0, namSinh: 2017 }] };
  await di("/chao"); await js(`sessionStorage.setItem("aiigrow.thiet-lap", ${JSON.stringify(JSON.stringify(TL))})`);
  await goi("Page.navigate", { url: `${GOC}/thiet-lap/gio` });
  xet(await doi("Bảo Anh chơi máy thế nào?"), "tiêu đề «<Tên> chơi máy thế nào?»");
  const c = await chu();
  xet(c.includes("Quà khởi đầu cho con") && c.includes("1 sao = chơi 1 phút") && c.includes("= 1 tiếng rưỡi") && c.includes("= nửa tiếng") && c.includes("Chơi 30 phút") && c.includes("Nghỉ 30 phút"), "đủ thẻ quà + quy ra tiếng + hình Chơi / Nghỉ 30 phút");
  xet(!/tối đa|lượt|Hết giờ/.test(c), "không còn chữ «tối đa», «lượt»");
  const bamNhan = (nhan) => js(`(() => { const e = [...document.querySelectorAll('[aria-label]')].find((x) => x.getAttribute("aria-label") === ${JSON.stringify(nhan)}); if (!e) return false; e.click(); return true; })()`);
  const so = () => js(`(() => { const e = [...document.querySelectorAll("[aria-label]")].find((x) => /^\\d+ sao$/.test(x.getAttribute("aria-label"))); return e ? e.getAttribute("aria-label") : null; })()`);
  for (let i = 0; i < 3; i++) await bamNhan("Thêm 10 sao");
  xet(await so() === "60 sao", "bấm + ba lần: 30 → 60 sao");
  for (let i = 0; i < 25; i++) await bamNhan("Thêm 10 sao");
  xet(await so() === "200 sao", "trần 200 sao");
  await go("Số phút ngày thường", "100");
  await bamNhan("Thêm 15 phút · Thứ 2 – Thứ 6");
  await go("Số phút cuối tuần", "5");
  await sleep(300);
  xet((await chu()).includes("Từ 10 đến 720 phút"), "ngày 5 phút ⇒ báo «Từ 10 đến 720 phút», nút Tiếp tắt");
  await go("Số phút cuối tuần", "150");
  await bamNhan("Bớt 15 phút · Chơi liền");
  await sleep(300);
  xet((await chu()).includes("= 2 tiếng rưỡi") && (await chu()).includes("Chơi 15 phút"), "150 phút = 2 tiếng rưỡi; hình đổi theo ô «Chơi liền» (15 phút)");
  await js(`(() => { const e = document.querySelector('[role=checkbox][aria-label="Không cần nghỉ"]'); e.click(); })()`);
  await sleep(200);
  nhatKy.length = 0;
  await bam("Tiếp: chọn app cho con");
  xet(await doi("Google Classroom"), "sang bước chọn app");
  const t = await js(`sessionStorage.getItem("aiigrow.thiet-lap")`);
  const j = JSON.parse(t ?? "{}");
  xet(j.saoKhoiDau === 200 && j.gioiHan?.ngayThuong === 115 && j.gioiHan?.cuoiTuan === 150 && j.gioiHan?.moiLuot === 0, "nhớ 200 sao · ngày 115 · cuối tuần 150 · Không cần nghỉ = 0");
});

await kichBan("Đổi tên máy (them-tw6apkag): mở màn đổi tên từ màn máy, gửi POST may/m1/doi-ten tên đã chuẩn hoá, quay về màn máy", async () => {
  await di("/may/m1");
  xet(await doi("Đổi tên máy"), "màn máy có «Đổi tên máy»");
  await bam("Đổi tên máy");
  xet(await doi("Ba Mẹ sẽ thấy máy thế này"), "mở màn Đổi tên máy");
  nhatKy.length = 0;
  await go("Tên máy", "  Máy   học bài ");
  await bam("Lưu tên máy");
  xet(await choGoi((x) => x.d === "may/m1/doi-ten" && x.m === "POST" && x.body?.ten === "Máy học bài"), "gửi tên máy đã chuẩn hoá");
  xet(await doi("Đã đổi tên máy thành Máy học bài"), "lưu xong quay về màn máy, báo đã đổi tên");
});

// ---------------------------------------------------------------- #267 một máy nhiều Con (docs/API.md mục #267)
await kichBan("#267 Máy trong nhà: máy chung «2 bé · đang dùng: Bill», máy riêng «Máy riêng», sao = phút; lọc theo bé", async () => {
  kb = { ...kb, ...MAY_CHUNG };
  await di("/may");
  xet(await doi("Máy cả nhà"), "hiện máy chung «Máy cả nhà»");
  xet(await doi("2 bé · đang dùng: Bill"), "máy chung: 2 bé + bé đang dùng");
  xet(await doi("Máy riêng"), "máy riêng có nhãn «Máy riêng»");
  xet(await doi("Roblox từ "), "app đang mở trên máy chung (từ giờ bé vào máy)");
  xet(await doi("còn 25 sao = 25 phút chơi"), "sao bé đang dùng = phút chơi");
  await bamChon('[role="tab"][aria-label="Bill"]');
  await sleep(400);
  const c = await chu();
  xet(c.includes("Máy cả nhà") && c.includes("Laptop của Bill") && !c.includes("iPad của Bảo Anh"), "lọc Bill: chỉ máy Bill dùng (máy chung + máy riêng)");
});

await kichBan("#267 Máy cả nhà: công tắc bỏ gán Bảo Anh ⇒ may/m4/con/c1/bo ⇒ Hoàn tác gán lại", async () => {
  kb = { ...kb, ...MAY_CHUNG };
  await di("/may/m4");
  xet(await doi("Bill đang dùng"), "thẻ sân: bé đang dùng");
  xet(await doi("Máy chung · 2 bé"), "chip «Máy chung · 2 bé»");
  xet(await doi("= 25 phút chơi"), "ô sao «= 25 phút chơi»");
  xet(await doi("Máy này ai dùng?"), "mục «Máy này ai dùng?»");
  nhatKy.length = 0;
  xet(await bamChon('[role="switch"][aria-label="Bảo Anh được dùng Máy cả nhà"]'), "bấm công tắc Bảo Anh");
  xet(await choGoi((x) => x.d === "may/m4/con/c1/bo" && x.m === "POST"), "gửi bỏ gán Bảo Anh");
  xet(await doi("Bảo Anh không còn dùng Máy cả nhà"), "báo đã bỏ + Hoàn tác");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "may/m4/con/c1/gan"), "Hoàn tác ⇒ gán lại");
});

await kichBan("#267 Máy này ai dùng?: bỏ Bảo Anh ⇒ «Lưu · máy riêng của Bill» ⇒ POST may/m4/con {ds:[c2]}; iPad: bé khác «Không thêm được»", async () => {
  kb = { ...kb, ...MAY_CHUNG };
  await di("/may/m4/ai-dung");
  xet(await doi("2 bé = máy dùng chung."), "hộp ngọc «2 bé = máy dùng chung»");
  xet(await doi("−20 sao"), "sao âm hiện «−20 sao»");
  await bamChon('[role="checkbox"][aria-label="Bảo Anh"]');
  xet(await doi("Lưu · máy riêng của Bill"), "nút đổi thành «Lưu · máy riêng của Bill»");
  nhatKy.length = 0;
  await bam("Lưu · máy riêng của Bill");
  xet(await choGoi((x) => x.d === "may/m4/con" && x.m === "POST" && JSON.stringify(x.body?.ds) === JSON.stringify(["c2"])), "gửi ds = [c2]");
  await di("/may/m2/ai-dung");
  xet(await doi("Không thêm được"), "iPad: Bill «Không thêm được»");
  xet(await doi("iPhone, iPad chỉ một bé:"), "iPad: giải thích chỉ một bé");
});

await kichBan("#267 Ghép thêm máy chọn 2 bé ⇒ «Ghép máy chung · 2 bé» ⇒ POST ghep-may {conDs}", async () => {
  await di("/may/them?con=c1");
  xet(await doi("Máy mới cho bé nào?"), "màn chọn bé");
  await bamChon('[role="checkbox"][aria-label="Bill"]');
  xet(await doi("Máy dùng chung · 2 bé"), "chọn 2 bé ⇒ «Máy dùng chung · 2 bé»");
  nhatKy.length = 0;
  await bam("Lấy mã ghép máy chung cho 2 bé");
  xet(await choGoi((x) => x.d === "ghep-may" && x.m === "POST" && x.body?.conDs?.length === 2), "gửi ghep-may kèm conDs 2 bé");
  xet(await doi("Ghép máy chung · 2 bé"), "tiêu đề «Ghép máy chung · 2 bé»");
  xet(await doi("chọn 1 bé khi quét"), "nhắc iPhone/iPad chọn 1 bé khi quét");
});

await kichBan("#267 Khoá theo máy (Máy cả nhà: mọi bé «Sẽ khoá», máy khác «Vẫn dùng») · khoá theo bé ở «chi tiết» ⇒ con/c2/khoa", async () => {
  kb = { ...kb, ...MAY_CHUNG };
  await di("/may/m4");
  await doi("Khoá Máy cả nhà ngay"); await bam("Khoá Máy cả nhà ngay");
  xet(await doi("Máy khác · không đổi gì"), "bảng khoá theo máy");
  xet(await doi("Sẽ khoá"), "bé trên máy «Sẽ khoá»");
  nhatKy.length = 0;
  await bam("Khoá Máy cả nhà ngay");
  xet(await choGoi((x) => x.d === "may/m4/khoa" && x.m === "POST" && x.body?.khoa === true), "gửi khoá theo máy");
  xet(!nhatKy.some((x) => /^con\/.*\/khoa$/.test(x.d)), "không khoá theo bé");
  await di("/may/m4/chi-tiet");
  xet(await doi("Sao của từng bé"), "màn «Máy cả nhà · chi tiết»");
  xet(await doi("Đang nợ Ba Mẹ 20 sao"), "bé nợ hiện «Đang nợ Ba Mẹ 20 sao»");
  await bam("Khoá Bill");
  xet(await doi("Khoá theo bé: Bill"), "bảng khoá theo bé");
  nhatKy.length = 0;
  xet(await bamDauCo("Khoá Bill tới "), "nút «Khoá Bill tới HH:MM»");
  xet(await choGoi((x) => x.d === "con/c2/khoa" && x.m === "POST" && x.body?.khoa === true), "gửi khoá theo bé Bill");
});

// ---------------------------------------------------------------- PR #253 nối app (docs/API.md «Khớp thiết kế 14/11 — phần máy chủ còn lệch»)
await kichBan("Khoá máy <Con>? bỏ chọn iPad ⇒ khoá RIÊNG Laptop (may/m1/khoa, không khoá theo Con) ⇒ Hoàn tác mở đúng máy đó", async () => {
  await di("/hom-nay");
  await doi("Khoá máy"); await bam("Khoá máy");
  xet(await doi("Khoá bao lâu?"), "mở bảng «Khoá máy <Con>?»");
  xet(await bamChon('[role="checkbox"][aria-label="Khoá iPad"]'), "bỏ chọn iPad");
  await bamChon('[role="radio"][aria-label^="1 giờ"]');
  nhatKy.length = 0;
  xet(await bamDauCo("Khoá máy tới "), "nút đổi thành «Khoá máy tới HH:MM» (1 máy)");
  xet(await choGoi((x) => x.d === "may/m1/khoa" && x.m === "POST" && x.body?.khoa === true && !!x.body?.den), "gửi khoá riêng Laptop kèm hạn");
  xet(!nhatKy.some((x) => x.d === "con/c1/khoa" || x.d === "may/m2/khoa"), "không khoá theo Con, không khoá iPad");
  xet(await doi("Đã khoá Laptop của"), "báo đã khoá Laptop");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "may/m1/khoa" && x.body?.khoa === false), "Hoàn tác ⇒ mở khoá Laptop");
});

await kichBan("Màn máy: «Khoá Laptop ngay» ⇒ bảng them-tmezw761 (máy khác «Vẫn dùng») ⇒ may/m1/khoa; máy đang khoá riêng ⇒ «Mở khoá Laptop»", async () => {
  await di("/may/m1");
  await doi("Khoá Laptop ngay"); await bam("Khoá Laptop ngay");
  xet(await doi("Máy khác · không đổi gì"), "bảng khoá theo máy: máy khác «Vẫn dùng»");
  nhatKy.length = 0;
  await bam("Khoá Laptop ngay");
  xet(await choGoi((x) => x.d === "may/m1/khoa" && x.m === "POST" && x.body?.khoa === true && !x.body?.den), "gửi khoá riêng Laptop (tới khi Ba Mẹ mở)");
  xet(!nhatKy.some((x) => x.d === "con/c1/khoa"), "không khoá theo Con");
  kb = { ...kb, ...CON_KHOA_M1 };
  await di("/may/m1");
  xet(await doi("Mở khoá Laptop"), "máy đang khoá riêng ⇒ hiện «Đang khoá tới …» + «Mở khoá Laptop»");
  nhatKy.length = 0;
  await bam("Mở khoá Laptop");
  xet(await choGoi((x) => x.d === "may/m1/khoa" && x.body?.khoa === false), "mở khoá riêng Laptop");
  xet(await doi("Đã mở khoá Laptop"), "báo đã mở khoá");
});

await kichBan("Xoá hồ sơ Con ⇒ con/c1/xoa {xacNhan:true} ⇒ máy thành dùng chung ⇒ «Máy của Bill» gắn lại (gan-con)", async () => {
  await di("/ho-so/c1/xoa");
  xet(await doi("Xoá rồi không lấy lại được."), "màn xác nhận «Xoá hồ sơ <Con>?»");
  nhatKy.length = 0;
  await bam(`Xoá hồ sơ ${KEN}`);
  xet(await choGoi((x) => x.d === "con/c1/xoa" && x.m === "POST" && x.body?.xacNhan === true), "gửi xoá kèm xacNhan");
  xet(await doi(`Đã xoá hồ sơ ${KEN}`), "màn kết quả đã xoá");
  xet(await doi("thành máy dùng chung"), "nói rõ máy thành máy dùng chung");
  await bamDau(`Máy của ${BILL}`);
  xet(await choGoi((x) => x.d === "may/m1/gan-con" && x.body?.con === "c2"), "gắn Laptop cho Bill");
  xet(await doi(`Giờ là máy của ${BILL}`), "thẻ máy đổi thành «Giờ là máy của Bill»");
});

await kichBan("Xoá hồ sơ Con: 409 con_may / con_thiet_bi_mang ⇒ câu dễ hiểu + lối đi tiếp, vẫn ở màn xác nhận", async () => {
  kb = { ...kb, ...XOA_CON_MAY };
  await di("/ho-so/c1/xoa");
  await doi("Giữ lại"); await bam(`Xoá hồ sơ ${KEN}`);
  xet(await doi("là bé cuối cùng trong nhà"), "con_may ⇒ câu bé cuối cùng");
  xet(await doi("Xem các máy"), "có lối «Xem các máy»");
  kb = { ...kb, ...XOA_CON_MANG };
  await di("/ho-so/c1/xoa");
  await doi("Giữ lại"); await bam(`Xoá hồ sơ ${KEN}`);
  xet(await doi("thiết bị lọc mạng riêng"), "con_thiet_bi_mang ⇒ câu thiết bị lọc mạng");
  xet(await doi("Nhắn AiiGrow"), "có lối «Nhắn AiiGrow»");
});

await kichBan("Quà Ba Mẹ mua: «Trao luôn cho <Con>» ⇒ qua/q4/trao-luon {con}; voucher AiiCafe ⇒ không có nút, nói rõ cần thanh toán", async () => {
  kb = { ...kb, ...QUA_KHO };
  await di("/vi/qua-mua?ma=lego&con=c1");
  xet(await doi(`Trao luôn cho ${KEN}`), "nút «Trao luôn cho <Con>»");
  nhatKy.length = 0;
  await bam(`Trao luôn cho ${KEN}`);
  xet(await choGoi((x) => x.d === "qua/q4/trao-luon" && x.m === "POST" && x.body?.con === "c1"), "gửi trao luôn đúng quà + Con");
  await di("/vi/qua-mua?ma=aiicafe_20k&con=c1");
  xet(await doi("mới trao luôn được"), "voucher ⇒ câu cần thanh toán");
  xet(!(await chu()).includes("Trao luôn cho"), "voucher ⇒ không có nút «Trao luôn»");
});

await kichBan("Hộp thư hỗ trợ (admin): ?loc=cho ⇒ «4 chờ», «Gấp 2» + «Chờ 42′», người gửi; tab «Của tôi» ⇒ ?loc=cua_toi", async () => {
  await di("/admin-ho-tro");
  xet(await doi("Chờ 42′"), "dòng «Chờ 42′» từ cho_phut");
  xet(await choGoi((x) => x.d === "admin/ho-tro" && x.q === "?loc=cho"), "tải ?loc=cho");
  const c = await chu();
  xet(c.includes("4 chờ") && c.includes("Gấp") && c.includes("Đang chờ") && c.includes("Bà Hoa"), "huy hiệu soCho, mục Gấp / Đang chờ, tên người gửi");
  nhatKy.length = 0;
  await bam("Của tôi");
  xet(await choGoi((x) => x.d === "admin/ho-tro" && x.q === "?loc=cua_toi"), "tab «Của tôi» ⇒ ?loc=cua_toi");
  xet(await doi("AiiGrow đã cộng giúp"), "hiện thư mình đã trả lời");
});

// ---------------------------------------------------------------- Sổ sao 15/11 (#263–#266): ví âm, cho vay + Hoàn tác, lời xin vay, nợ > 1.000, máy khoá
/** Chữ đã bỏ khỏi app Ba Mẹ từ 15/11 (bỏ quỹ ngày, ngoại lệ, «Giờ dùng máy»). */
const CHU_BO_SAO = [/giờ chơi hôm nay/i, /(^|[^\p{L}])quỹ(?![\p{L}])(?! phiếu)/iu, /ngoại lệ/i, /ngoài quy tắc/i, /cho thêm giờ/i];
const chuBoSao = async () => { const t = (await chu()) ?? ""; return CHU_BO_SAO.filter((r) => r.test(t)).map(String); };

await kichBan("Sổ sao · Trang chủ ví âm: viên «−20 sao» + dòng nợ, viên sao từng con, không còn quỹ / thêm giờ", async () => {
  kb = { ...kb, ...SO_SAO };
  await di("/hom-nay");
  xet(await doi("−20 sao"), "số âm «−20 sao» (dấu trừ thật)");
  xet(await doi("Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước"), "dòng nợ dưới số");
  xet(await doi("35 sao"), "dải avatar có viên sao của Bill");
  xet(await doi("Cho vay sao"), "nút «Cho vay sao» thay «Cho thêm giờ»");
  const bo = await chuBoSao();
  xet(!bo.length, `không còn chữ đã bỏ ${bo.join(" ")}`);
  await bam("Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước ›");
  xet(await doi(`Ví sao của ${KEN}`), "dòng nợ ⇒ Ví sao");
});

await kichBan("Sổ sao · Cho vay: bảng 10/15/30 (mặc định 15) ⇒ chọn 30 ⇒ con/c1/cho-vay ⇒ «Đã cho … vay 30 sao» ⇒ Hoàn tác", async () => {
  kb = { ...kb, ...SO_SAO };
  await di("/hom-nay");
  await doi("Cho vay sao"); await bam("Cho vay sao");
  xet(await doi(`Cho ${KEN} vay sao`), "mở bảng «Cho <Con> vay sao»");
  xet(await doi(`Cho ${KEN} vay 15 sao`), "mặc định 15 sao");
  xet(await doi("sẽ nợ 35 sao"), "«vay xong sẽ nợ 35 sao»");
  xet(!(await chu()).includes("đã nợ quá"), "nợ nhỏ ⇒ không có dải nhắc");
  await bam("30");
  xet(await doi(`Cho ${KEN} vay 30 sao`), "chọn 30 ⇒ nút đổi theo");
  await bam(`Cho ${KEN} vay 30 sao`);
  xet(await choGoi((x) => x.d === "con/c1/cho-vay" && x.m === "POST" && x.body?.soSao === 30), "gửi cho-vay soSao 30");
  xet(await doi(`Đã cho ${KEN} vay 30 sao`), "màn kết quả them-3wp5ty1o");
  xet(await doi("Nợ cũ 20 + vay 30 sao"), "dòng «Nợ cũ 20 + vay 30 sao»");
  xet(await doi("−50 sao"), "viên nợ sau vay «−50 sao»");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "vay/v1/hoan-tac" && x.m === "POST"), "Hoàn tác ⇒ vay/v1/hoan-tac");
});

await kichBan("Sổ sao · Cho vay khi đang nợ > 1.000: dải nhắc, vẫn cho vay được", async () => {
  kb = { ...kb, ...NO_LON };
  await di("/hom-nay");
  await doi("Cho vay sao"); await bam("Cho vay sao");
  xet(await doi("đã nợ quá 1.000 sao (đang nợ 1.020)"), "dải nhắc nợ > 1.000 (them-y1r1eidm)");
  xet(await doi("Chỉ nhắc thôi · Ba Mẹ vẫn cho vay được"), "nói rõ không chặn");
  xet(await doi("sẽ nợ 1.035 sao"), "số nợ sau vay có dấu chấm nghìn");
  await bam(`Cho ${KEN} vay 15 sao`);
  xet(await choGoi((x) => x.d === "con/c1/cho-vay" && x.body?.soSao === 15), "vẫn gửi cho-vay");
});

await kichBan("Sổ sao · Lời xin vay: «Xin Ba Mẹ cho vay 20 sao» ⇒ Cho vay 20 sao ⇒ dong-y {soSao: 20} ⇒ kết quả + Hoàn tác", async () => {
  kb = { ...kb, ...CO_XIN_VAY };
  await di("/yeu-cau?con=c1");
  xet(await doi("Xin Ba Mẹ cho vay 20 sao"), "tiêu đề lời xin vay (them-a4nqjrmp)");
  xet(await doi("hết sao, muốn chơi tiếp"), "dòng phụ «hết sao, muốn chơi tiếp»");
  xet(await doi("Đang nợ Ba Mẹ 20 sao"), "viên sao + đang nợ của con");
  await bam("Cho vay 20 sao");
  xet(await choGoi((x) => x.d === "yeu-cau/y4/dong-y" && x.body?.soSao === 20), "gửi dong-y soSao 20");
  xet(await doi(`Đã cho ${KEN} vay 20 sao`), "màn kết quả");
  await bam("Hoàn tác");
  xet(await choGoi((x) => x.d === "vay/v4/hoan-tac"), "Hoàn tác ⇒ vay/v4/hoan-tac");
  await di("/yeu-cau/y4");
  xet(await doi("Con xin vay sao"), "màn chi tiết lời xin vay");
  xet(await doi("sẽ nợ 40 sao"), "chi tiết: «vay xong … sẽ nợ 40 sao»");
  const bo = await chuBoSao();
  xet(!bo.length, `chi tiết không còn chữ đã bỏ ${bo.join(" ")}`);
});

await kichBan("Sổ sao · Ví sao âm: thẻ «−20 sao», vay / trả / chơi, «1 sao = 1 phút»", async () => {
  kb = { ...kb, ...SO_SAO };
  await di("/vi/c1");
  xet(await doi("−20"), "số dư âm");
  xet(await doi("Đang nợ Ba Mẹ 20 sao"), "dòng đang nợ");
  xet(await doi("vay 45"), "«Tuần này: vay 45 · đã trả 25 sao»");
  xet(await doi("1 sao = 1 phút"), "tỷ lệ 1 sao = 1 phút");
  xet(await doi("Ba Mẹ cho vay 15 sao"), "dòng lịch sử cho vay");
  xet(await doi("Trả nợ 10 sao"), "dòng lịch sử trả nợ");
  xet(await doi("Chơi YouTube 20 phút"), "dòng lịch sử chơi");
  const bo = await chuBoSao();
  xet(!bo.length, `ví không còn chữ đã bỏ ${bo.join(" ")}`);
});

await kichBan("Sổ sao · Cảnh báo nợ > 1.000: Thông báo «Nợ quá 1.000 sao» ⇒ màn «Cảnh báo nợ sao» ⇒ Cho vay thêm / Đã biết", async () => {
  kb = { ...kb, ...NO_LON };
  await di("/thong-bao");
  xet(await doi("Nợ quá 1.000 sao"), "dòng «Nợ quá 1.000 sao» (them-0xf9hrgn)");
  xet(await doi("đang nợ 1.020"), "dòng phụ «<Con> · đang nợ 1.020»");
  await di("/canh-bao/a9");
  xet(await doi("Cảnh báo nợ sao"), "màn them-5twxl6hf");
  xet(await doi("vượt mốc sau lần cho vay 30 sao"), "nói rõ vượt mốc sau khoản vay");
  xet(await doi("Không cản việc cho vay"), "Ba Mẹ nên biết: không cản việc cho vay");
  xet(await doi("7 ngày qua: vay 180, trả 40 sao"), "7 ngày qua vay / trả");
  await bam("Cho vay thêm");
  xet(await doi("đã nợ quá 1.000 sao (đang nợ 1.020)"), "Cho vay thêm ⇒ bảng có dải nhắc");
  await bam("Thôi");
  await sleep(400);
  await bam("Đã biết");
  xet(await choGoi((x) => x.d === "canh-bao/a9/doc"), "Đã biết ⇒ đánh dấu đã đọc");
});

await kichBan("Sổ sao · Báo cáo + Nhật ký: «Sao kiếm, sao vay», «cho vay 4 lần · 75 sao»", async () => {
  kb = { ...kb, ...SO_SAO };
  await di("/bao-cao");
  xet(await doi("Sao kiếm, sao vay"), "khối «Sao kiếm, sao vay» (them-gftgyspn)");
  xet(await doi("45 sao vay"), "ô sao vay");
  let bo = await chuBoSao();
  xet(!bo.length, `báo cáo không còn chữ đã bỏ ${bo.join(" ")}`);
  await di("/nhat-ky");
  xet(await doi("cho vay 4 lần · 75 sao"), "dải «7 ngày qua cho vay 4 lần · 75 sao» (them-r3dsl3py)");
  bo = await chuBoSao();
  xet(!bo.length, `nhật ký không còn chữ đã bỏ ${bo.join(" ")}`);
});

await kichBan("Sổ sao · Máy đang khoá: lời xin chơi = «Xin mở khoá máy · chơi vẫn trừ sao» ⇒ Mở khoá (không cho vay)", async () => {
  kb = { ...kb, ...MAY_KHOA };
  await di("/hom-nay");
  xet(await doi("Xin mở khoá máy"), "thẻ «Xin mở khoá máy» (them-0kwhgpq6)");
  xet(await doi("chơi vẫn trừ sao"), "nói rõ chơi vẫn trừ sao");
  xet(await doi("còn 0 sao = 0 phút"), "dòng «Đang khoá · còn N sao = N phút»");
  await bam("Mở khoá");
  xet(await choGoi((x) => x.d === "con/c1/khoa" && x.body?.khoa === false), "Mở khoá ⇒ con/c1/khoa {khoa: false}");
  xet(await choGoi((x) => x.d === "yeu-cau/y4/tu-choi"), "đóng lời xin (không cho vay)");
  xet(!nhatKy.some((x) => x.d === "yeu-cau/y4/dong-y"), "không gọi dong-y (không tạo nợ)");
});

ws.close();
chrome.kill();
may.close();
await sleep(500);
try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
console.log(`\n${kq.filter((x) => x[0]).length}/${kq.length} đạt`);
process.exit(sai ? 1 : 0);
