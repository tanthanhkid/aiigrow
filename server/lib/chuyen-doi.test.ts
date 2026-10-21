// M4b — bộ chuyển đổi chính sách chung ⇒ từng nền tảng (logic thuần, không DB, không gọi API OS thật).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dungChinhSach, kieuMuc, type ChinhSachChung } from "./chinh-sach.ts";
import { CACH_GO_TU_XA, KHA_NANG, NEN_CHUYEN_DOI, chuyenDoi, gioDangNhapWindows, giaiTriLucNay, huongDanCai, lichMo, luatMang, ngoaiKhung } from "./chuyen-doi.ts";
import { thamSo } from "./cau-hinh.ts";
import { tongHop } from "./tuan-thu.ts";
import type { Policy } from "./may-con.ts";

function cs(o: { now?: string; khoaNgay?: boolean; khoa?: boolean; lich?: Partial<Policy["lich"]> } = {}): ChinhSachChung {
  const p: Policy = {
    serverTime: new Date(o.now ?? "2026-10-21T18:00:00+07:00").toISOString(), nextCheckSec: 300, gioMaySai: false,
    con: { id: "c1", ten: "Ken", nhom: "nhi" }, canChonCon: false, allowlistHeThong: ["explorer.exe", "com.android.settings", "aiilab.vn"],
    luat: [
      { muc: "roblox.exe", loai: "giai_tri", nhom: "game", giaPhanNghin: 1000 },
      { muc: "com.roblox.client", loai: "giai_tri", nhom: "game", giaPhanNghin: 1000 },
      { muc: "youtube.com", loai: "giai_tri", nhom: "video_ngan", giaPhanNghin: 2000 },
      { muc: "tiktok.com", loai: "chan", nhom: null, giaPhanNghin: null },
      { muc: "com.zhiliaoapp.musically", loai: "chan", nhom: null, giaPhanNghin: null },
      { muc: "scratch.mit.edu", loai: "hoc", nhom: null, giaPhanNghin: null },
    ],
    lich: { ngayThuong: [{ tu: "17:00", den: "22:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" }, ...(o.lich ?? {}) },
    khoaNgay: o.khoaNgay === true, soDu: 12, phien: null, tz: "Asia/Ho_Chi_Minh", lechGioPhut: 10, phienToiDa: 30,
  };
  const now = new Date(p.serverTime);
  const tt = o.khoa ? tongHop([{ loai: "app_tat", tru: 50, cauBaMe: "x", cauCon: "y" }], 80, null, now) : tongHop([], 80, null, now);
  return dungChinhSach(p, { ts: thamSo(), may: { id: "m1", name: "Laptop của Ken", platform: "windows", dung_chung: false }, tuanThu: tt, phutThem: 0, mucTamThoi: [] });
}

test("chính sách chung: phân app / web, gom học / giải trí / chặn, chưa xếp = chặn, hiệu lực tổng hợp", () => {
  assert.equal(kieuMuc("roblox.exe"), "app");
  assert.equal(kieuMuc("com.roblox.client"), "app");
  assert.equal(kieuMuc("youtube.com"), "web");
  assert.equal(kieuMuc("aiirob.aiilab.vn"), "web");
  const c = cs();
  assert.deepEqual(c.ungDung.chan.map((x) => [x.muc, x.kieu]), [["tiktok.com", "web"], ["com.zhiliaoapp.musically", "app"]]);
  assert.equal(c.ungDung.chuaXep, "chan");
  assert.equal(c.gioChoi.tranNgayPhut, 90);
  assert.equal(c.hieuLuc.giaiTriDuocMo, true);
  assert.deepEqual(cs({ khoa: true, khoaNgay: true }).hieuLuc.lyDo, ["khoa_ngay", "khong_tuan_thu"]);
});

test("mọi nền tảng phủ đủ mọi khả năng; khả năng không làm được / một phần luôn có «thay bằng»", () => {
  const c = cs();
  for (const nen of NEN_CHUYEN_DOI) {
    const r = chuyenDoi(c, nen);
    assert.deepEqual(r.muc.map((m) => m.khaNang), [...KHA_NANG], nen);
    assert.ok(r.coChe.length && r.viecCho.length, nen);
    for (const m of r.muc) if (m.mucDo === "khong") assert.ok(m.thayBang, `${nen}/${m.khaNang} thiếu «thay bằng»`);
    for (const k of r.khongLamDuoc) assert.ok(k.thayBang && k.khongLamDuoc, nen);
    assert.ok(CACH_GO_TU_XA[nen], nen);
  }
});

test("Windows: AppLocker / chính sách trình duyệt / giờ đăng nhập theo giờ chẵn (nới ra ngoài)", () => {
  const w = chuyenDoi(cs(), "windows");
  const by = Object.fromEntries(w.muc.map((m) => [m.khaNang, m]));
  assert.deepEqual(by.chan_web.cauHinh!.URLBlocklist, ["tiktok.com"]);
  assert.deepEqual(by.chan_app.cauHinh!.applockerTuChoi, []);
  assert.deepEqual(by.chan_app.cauHinh!.giaiTriCanPhien, ["roblox.exe"]);
  assert.equal(by.gio_ngu.cauHinh!.netUserTimes, "M-Su,06:00-21:00");
  assert.equal(gioDangNhapWindows({ tu: "21:30", den: "06:30" }), "M-Su,06:00-22:00");
  assert.equal(gioDangNhapWindows({ tu: "00:30", den: "06:00" }), "M-Su,00:00-01:00;M-Su,06:00-24:00");
  assert.equal(by.khoi_phuc_goc.mucDo, "khong");
  assert.equal(by.khoi_phuc_goc.chiBaoBaMe, true);
  assert.equal(w.nhipGiay, 60);
});

test("Android Device Owner: tạm dừng gói (không ẩn), ép giờ tự động, Chrome URLBlocklist; không chặn khôi phục gốc ⇒ chỉ báo", () => {
  const a = chuyenDoi(cs(), "android");
  const by = Object.fromEntries(a.muc.map((m) => [m.khaNang, m]));
  assert.deepEqual(by.chan_app.cauHinh!.tamDung, ["com.zhiliaoapp.musically"]);
  assert.match(by.chan_app.coChe, /setPackagesSuspended/);
  assert.match(by.chong_doi_gio.coChe, /setAutoTimeEnabled/);
  assert.equal(by.chan_web.mucDo, "mot_phan");
  assert.equal(by.khoi_phuc_goc.mucDo, "khong");
  assert.ok(a.nhipGiay > 60, "nhịp thưa (Doze)");
});

test("iOS: ManagedSettings nhận tên miền; app chỉ chọn được bằng FamilyActivityPicker; không ép giờ tự động ⇒ so giờ máy chủ + báo", () => {
  const i = chuyenDoi(cs(), "ios");
  const by = Object.fromEntries(i.muc.map((m) => [m.khaNang, m]));
  assert.deepEqual(by.chan_web.cauHinh!.webDomainsChan, ["tiktok.com"]);
  assert.equal(by.cho_phep_app.mucDo, "mot_phan");
  assert.match(by.cho_phep_app.thayBang!, /FamilyActivityPicker/);
  assert.equal(by.chong_doi_gio.mucDo, "khong");
  assert.ok(i.khongLamDuoc.some((k) => k.khaNang === "chong_doi_gio" && k.chiBaoBaMe));
  assert.equal(by.che_do_an_toan.mucDo, "khong_ap_dung");
});

test("macOS: bộ lọc web bằng hồ sơ cấu hình; chặn app = daemon đóng ngay (một phần)", () => {
  const m = chuyenDoi(cs(), "mac");
  const by = Object.fromEntries(m.muc.map((x) => [x.khaNang, x]));
  assert.deepEqual(by.chan_web.cauHinh!.DenyListURLs, ["tiktok.com"]);
  assert.equal(by.chan_app.mucDo, "mot_phan");
});

test("khung giờ: lịch mở = khung chơi − giờ ngủ; phần bù trong ngày", () => {
  assert.deepEqual(lichMo(cs()).ngayThuong, [{ tu: "17:00", den: "21:00" }]);
  assert.deepEqual(lichMo(cs({ lich: { cuoiTuan: [{ tu: "20:00", den: "08:00" }] } })).cuoiTuan, [{ tu: "06:30", den: "08:00" }, { tu: "20:00", den: "21:00" }]);
  assert.deepEqual(ngoaiKhung([{ tu: "17:00", den: "21:00" }]), [{ tu: "00:00", den: "17:00" }, { tu: "21:00", den: "24:00" }]);
});

test("tầng mạng / TV: luật router theo MAC + DNS; trạng thái lúc này theo giờ máy chủ; khoá ngay ⇒ chặn Internet", () => {
  const l = luatMang(cs(), { mac: "AA-BB-CC-DD-EE-FF", ten: "TV phòng khách" });
  assert.equal(l.thietBi.mac, "aa:bb:cc:dd:ee:ff");
  assert.deepEqual(l.router.filter((r) => r.ngay === "T2-T6").map((r) => [r.tu, r.den]), [["00:00", "17:00"], ["21:00", "24:00"]]);
  assert.ok(l.router.every((r) => r.mac === "aa:bb:cc:dd:ee:ff" && r.hanhDong === "chan_internet"));
  assert.deepEqual(l.dns.chan, ["tiktok.com"]);
  assert.deepEqual(l.dns.chanNgoaiGio, ["youtube.com"]);
  assert.ok(l.dns.choPhep.includes("scratch.mit.edu") && l.dns.choPhep.includes("aiilab.vn"));
  assert.deepEqual(l.nextdns.denylist, [{ id: "tiktok.com", active: true }]);
  assert.equal(l.pihole.client, "aa:bb:cc:dd:ee:ff");
  assert.equal(l.hienTai.internet, "mo");                                             // thứ Tư 18:00, trong khung 17–21
  assert.deepEqual(giaiTriLucNay(cs({ now: "2026-10-21T22:30:00+07:00" })), { mo: false, lyDo: "gio_ngu" });
  assert.deepEqual(giaiTriLucNay(cs({ now: "2026-10-21T10:00:00+07:00" })), { mo: false, lyDo: "ngoai_khung" });
  assert.equal(luatMang(cs({ khoaNgay: true })).hienTai.internet, "chan");
  assert.equal(luatMang(cs(), { mac: "khong-phai-mac" }).thietBi.mac, null);
  for (const nen of ["tvos", "android_tv", "tizen", "webos", "mang"] as const) {
    const r = chuyenDoi(cs(), nen, { mac: "aa:bb:cc:dd:ee:ff" });
    assert.ok(r.mang && r.mang.router.length, nen);
    assert.equal(r.muc.find((m) => m.khaNang === "khoa_khong_tuan_thu")!.mucDo, "khong_ap_dung", nen);
  }
  assert.match(chuyenDoi(cs(), "tvos").muc.find((m) => m.khaNang === "khung_gio")!.thayBang!, /tầng mạng/);
});

test("cài một chạm: token nhúng sẵn trong gói / QR — không nhập URL hay mã tay", () => {
  const w = huongDanCai("windows", "TOK123", "https://app.test/");
  assert.match(String(w.chiTiet.lenhIm), /\/silent \/token=TOK123/);
  assert.match(String(w.chiTiet.msi), /GHEP_TOKEN=TOK123/);
  const a = huongDanCai("android", "TOK123", "https://app.test");
  const qr = a.chiTiet.qrCaiDat as Record<string, any>;
  assert.equal(qr["android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE"].aiigrow_token, "TOK123");
  assert.equal(huongDanCai("ios", "TOK123", "https://app.test").chiTiet.qr, "https://app.test/cai/TOK123");
  assert.match(huongDanCai("mac", "TOK123", "https://app.test").chiTiet.tep as string, /TOK123\.pkg$/);
  assert.equal(huongDanCai("tizen", "x", "https://app.test").cach, "tang_mang");
});
