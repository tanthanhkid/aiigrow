// M4b — BỘ CHUYỂN ĐỔI THEO NỀN TẢNG: chính sách chung (lib/chinh-sach.ts) ⇒ mô tả cấu hình cho từng nền tảng. Logic THUẦN (không DB,
// không gọi API thật của OS) — agent mỗi nền tảng đọc mô tả này rồi gọi API chính hãng tương ứng. Cách tổ chức học từ Intune (một hồ sơ
// cấu hình ⇒ CSP từng nền tảng), Android Management API (policy JSON ⇒ DPC), Apple MDM (payload) và Screen Time API (FamilyControls /
// ManagedSettings / DeviceActivity). Khả năng nào OS không làm được thì nói rõ: «không làm được X ⇒ thay bằng Y / chỉ báo Ba Mẹ».
// Chỉ cơ chế chính hãng. Giới hạn cứng: không ẩn mình, không chống gỡ trái phép, không tự cài lại lén — mọi nới lỏng qua máy chủ.
// Gọi API thật từng OS: việc chờ thiết bị / Xcode / Windows (ghi trong `viecCho`). Bảng tổng: docs/QUAN-LY-DA-NEN-TANG.md.
import type { ChinhSachChung } from "./chinh-sach.ts";
import { gioDiaPhuong, laCuoiTuan, phutCua, type Khung } from "./gio.ts";

export const NEN_CHUYEN_DOI = ["windows", "mac", "ios", "android", "tvos", "android_tv", "tizen", "webos", "mang"] as const;
export type NenChuyenDoi = (typeof NEN_CHUYEN_DOI)[number];
export const TEN_NEN: Record<NenChuyenDoi, string> = {
  windows: "Windows", mac: "macOS", ios: "iPhone/iPad", android: "Android", tvos: "Apple TV", android_tv: "Android TV / Google TV",
  tizen: "Samsung TV (Tizen)", webos: "LG TV (webOS)", mang: "Tầng mạng (router / DNS)",
};
export const LA_TV = (n: NenChuyenDoi) => n === "tvos" || n === "android_tv" || n === "tizen" || n === "webos";

export const KHA_NANG = [
  "khung_gio", "gio_ngu", "tran_thoi_gian", "phien_diem", "cho_phep_app", "chan_app", "chan_web", "chua_xep", "khoa_ngay",
  "khoa_khong_tuan_thu", "chong_doi_gio", "chan_cai_dat", "tai_khoan_khac", "che_do_an_toan", "nhip", "go_cai_dat", "khoi_phuc_goc",
] as const;
export type KhaNang = (typeof KHA_NANG)[number];

export type MucDo = "du" | "mot_phan" | "khong" | "khong_ap_dung";
export type MucChuyenDoi = {
  khaNang: KhaNang; mucDo: MucDo; coChe: string; cauHinh?: Record<string, unknown>;
  khongLamDuoc?: string; thayBang?: string; chiBaoBaMe?: boolean;
};
export type CauHinhNenTang = {
  nen: NenChuyenDoi; ten: string; coChe: string[]; nhipGiay: number; muc: MucChuyenDoi[];
  khongLamDuoc: { khaNang: KhaNang; khongLamDuoc: string; thayBang: string; chiBaoBaMe: boolean }[];
  mang?: LuatMang; viecCho: string[];
};

// ---------------------------------------------------------------- khung giờ dạng khoảng phút (thuần)
type Kh = [number, number];
const khoang = (k: Khung): Kh[] => {
  const a = phutCua(k.tu), b = phutCua(k.den);
  return a < b ? [[a, b]] : [[a, 1440], [0, b]];
};
const gop = (ds: Kh[]): Kh[] => {
  const s = [...ds].filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const ra: Kh[] = [];
  for (const [a, b] of s) {
    const cuoi = ra[ra.length - 1];
    if (cuoi && a <= cuoi[1]) cuoi[1] = Math.max(cuoi[1], b); else ra.push([a, b]);
  }
  return ra;
};
const phanBu = (ds: Kh[]): Kh[] => {
  const ra: Kh[] = [];
  let t = 0;
  for (const [a, b] of gop(ds)) { if (a > t) ra.push([t, a]); t = Math.max(t, b); }
  if (t < 1440) ra.push([t, 1440]);
  return ra;
};
const tru = (ds: Kh[], bo: Kh[]): Kh[] => {
  const bu = phanBu(bo);
  const ra: Kh[] = [];
  for (const [a, b] of gop(ds)) for (const [c, d] of bu) { const x = Math.max(a, c), y = Math.min(b, d); if (y > x) ra.push([x, y]); }
  return gop(ra);
};
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const raKhung = (ds: Kh[]): Khung[] => ds.map(([a, b]) => ({ tu: hhmm(a), den: hhmm(b) }));

/** Khung được dùng giải trí thật sự = khung giờ chơi − giờ ngủ (theo ngày thường / cuối tuần). */
export function lichMo(cs: ChinhSachChung) {
  const ngu = khoang(cs.gioChoi.ngu);
  return {
    ngayThuong: raKhung(tru(cs.gioChoi.ngayThuong.flatMap(khoang), ngu)),
    cuoiTuan: raKhung(tru(cs.gioChoi.cuoiTuan.flatMap(khoang), ngu)),
  };
}

/** Phần bù trong ngày (00:00–24:00) của danh sách khung. */
export const ngoaiKhung = (ds: Khung[]): Khung[] => raKhung(phanBu(ds.flatMap(khoang)));

/** Giờ đăng nhập Windows (`net user <tài khoản> /times:`) — chỉ theo GIỜ CHẴN ⇒ nới ra ngoài (rộng hơn giờ thức); dịch vụ khoá đúng phút. */
export function gioDangNhapWindows(ngu: Khung) {
  const thuc = phanBu(khoang(ngu)).map(([a, b]): Kh => [Math.floor(a / 60) * 60, Math.min(1440, Math.ceil(b / 60) * 60)]);
  return gop(thuc).map(([a, b]) => `M-Su,${hhmm(a)}-${b === 1440 ? "24:00" : hhmm(b)}`).join(";");
}

const trongDs = (phut: number, ds: Khung[]) => ds.some((k) => khoang(k).some(([a, b]) => phut >= a && phut < b));

/** Lúc này giải trí có mở không (cho thiết bị không có agent — TV, tầng mạng). */
export function giaiTriLucNay(cs: ChinhSachChung): { mo: boolean; lyDo: string | null } {
  if (cs.khoaNgay) return { mo: false, lyDo: "khoa_ngay" };
  if (!cs.hieuLuc.giaiTriDuocMo) return { mo: false, lyDo: cs.hieuLuc.lyDo[0] ?? "khoa" };
  const g = gioDiaPhuong(new Date(cs.serverTime), cs.tz);
  if (trongDs(g.phut, [cs.gioChoi.ngu])) return { mo: false, lyDo: "gio_ngu" };
  const l = lichMo(cs);
  return trongDs(g.phut, laCuoiTuan(g.thu) ? l.cuoiTuan : l.ngayThuong) ? { mo: true, lyDo: null } : { mo: false, lyDo: "ngoai_khung" };
}

const web = (ds: { muc: string; kieu: string }[]) => ds.filter((x) => x.kieu === "web").map((x) => x.muc);

// ---------------------------------------------------------------- tầng mạng (router / DNS) — mẫu số chung cho TV và mọi máy
export type LuatMang = {
  thietBi: { mac: string | null; ten: string };
  lichMo: { ngayThuong: Khung[]; cuoiTuan: Khung[] };
  lichChan: { ngayThuong: Khung[]; cuoiTuan: Khung[] };
  hienTai: { internet: "mo" | "chan"; lyDo: string | null };
  router: { mac: string | null; hanhDong: "chan_internet"; ngay: "T2-T6" | "T7-CN"; tu: string; den: string }[];
  dns: { chan: string[]; chanNgoaiGio: string[]; choPhep: string[] };
  nextdns: { denylist: { id: string; active: boolean }[]; allowlist: { id: string; active: boolean }[] };
  pihole: { nhom: string; client: string | null; domainlist: { domain: string; kieu: "deny" | "allow"; ghiChu: string }[] };
};

const MAC = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
export const chuanMac = (s: unknown) => (MAC.test(String(s ?? "").trim()) ? String(s).trim().toLowerCase().replace(/-/g, ":") : null);

/** Luật router/DNS cho một thiết bị (theo MAC): chặn Internet ngoài lịch mở / giờ ngủ / khi khoá; DNS chặn tên miền. */
export function luatMang(cs: ChinhSachChung, tb: { mac?: unknown; ten?: string } = {}): LuatMang {
  const mac = chuanMac(tb.mac), ten = (tb.ten || cs.may.ten).slice(0, 60);
  const mo = lichMo(cs);
  const chan = { ngayThuong: ngoaiKhung(mo.ngayThuong), cuoiTuan: ngoaiKhung(mo.cuoiTuan) };
  const now = giaiTriLucNay(cs);
  const dnsChan = web(cs.ungDung.chan), dnsGt = web(cs.ungDung.giaiTri), dnsCho = [...cs.ungDung.heThong.filter((x) => !x.endsWith(".exe") && !/^(com|vn)\./.test(x)), ...web(cs.ungDung.hoc)];
  return {
    thietBi: { mac, ten }, lichMo: mo, lichChan: chan,
    hienTai: { internet: now.mo ? "mo" : "chan", lyDo: now.lyDo },
    router: [
      ...chan.ngayThuong.map((k) => ({ mac, hanhDong: "chan_internet" as const, ngay: "T2-T6" as const, tu: k.tu, den: k.den })),
      ...chan.cuoiTuan.map((k) => ({ mac, hanhDong: "chan_internet" as const, ngay: "T7-CN" as const, tu: k.tu, den: k.den })),
    ],
    dns: { chan: dnsChan, chanNgoaiGio: dnsGt, choPhep: dnsCho },
    nextdns: { denylist: dnsChan.map((id) => ({ id, active: true })), allowlist: dnsCho.map((id) => ({ id, active: true })) },
    pihole: {
      nhom: `aiigrow-${ten}`, client: mac,
      domainlist: [...dnsChan.map((d) => ({ domain: d, kieu: "deny" as const, ghiChu: "AiiGrow: chặn" })),
        ...dnsCho.map((d) => ({ domain: d, kieu: "allow" as const, ghiChu: "AiiGrow: học / hệ thống" }))],
    },
  };
}

// ---------------------------------------------------------------- từng nền tảng
type Dong = [KhaNang, MucDo, string, Omit<MucChuyenDoi, "khaNang" | "mucDo" | "coChe">?];

const CO_CHE: Record<NenChuyenDoi, string[]> = {
  windows: ["Windows Service AiiGrow (LocalSystem, tự khởi động lại khi lỗi)", "Con dùng tài khoản Standard (không phải quản trị)",
    "AppLocker (Executable / Windows Installer / Packaged app — mọi phiên bản Win10 2004+ / Win11 sau KB5024351)",
    "Chính sách cục bộ: chính sách trình duyệt Edge/Chrome (HKLM\\SOFTWARE\\Policies), giờ đăng nhập tài khoản"],
  mac: ["LaunchDaemon AiiGrow (root, hiện trong Cài đặt › Mục đăng nhập & tiện ích mở rộng)", "Con dùng tài khoản Standard",
    "Screen Time qua Chia sẻ trong gia đình (Downtime, giới hạn app)", "Hồ sơ cấu hình (.mobileconfig): bộ lọc web com.apple.webcontent-filter"],
  ios: ["Screen Time API: FamilyControls (ủy quyền .child qua Chia sẻ trong gia đình)", "ManagedSettings (khiên app / web, chặn cài)",
    "DeviceActivity (lịch + ngưỡng phút)", "Tuỳ chọn: hồ sơ MDM khi máy được giám sát (supervised)"],
  android: ["Android Enterprise — Device Owner (DPC AiiGrow, cài bằng QR trên máy vừa khôi phục gốc)", "DevicePolicyManager: setPackagesSuspended, addUserRestriction, setAutoTimeEnabled, lockNow",
    "Cấu hình quản lý cho Chrome (setApplicationRestrictions: URLBlocklist / URLAllowlist)", "UsageStatsManager (đo phút dùng)"],
  tvos: ["Giới hạn (Restrictions) của Apple TV: mật mã 4 số, xếp hạng nội dung, mua / cài app — tvOS chưa có lịch / giới hạn giờ Screen Time", "MDM khi Apple TV được giám sát (Apple Configurator / Apple Business Manager): payload Restrictions", "Tầng mạng (router / DNS) cho lịch giờ"],
  android_tv: ["Google TV: hồ sơ trẻ em do Family Link quản lý (một phần)", "Device Owner chỉ cho thiết bị chuyên dụng (không phải TV gia đình thông thường)", "Tầng mạng (router / DNS)"],
  tizen: ["Quản lý tập trung chỉ có ở màn hình thương mại Samsung (MagicINFO / VXT); Knox trên TV gia đình là lớp bảo mật, không phải MDM", "Khoá PIN theo xếp hạng nội dung có sẵn trên TV", "Tầng mạng (router / DNS)"],
  webos: ["LG webOS: quản lý tập trung chỉ có ở dòng TV thương mại (LG Business)", "Khoá PIN theo xếp hạng nội dung có sẵn trên TV", "Tầng mạng (router / DNS)"],
  mang: ["Router gia đình: chặn Internet theo địa chỉ MAC + lịch", "DNS lọc theo thiết bị (NextDNS / Pi-hole / DNS của router)"],
};

const BAO = { chiBaoBaMe: true };
const TV_MANG = "tầng mạng: router chặn Internet theo MAC ngoài lịch mở / giờ ngủ / khi Khoá ngay; DNS chặn tên miền";

function dongNen(nen: NenChuyenDoi, cs: ChinhSachChung): Dong[] {
  // định danh app theo đúng nền tảng: Windows = tệp .exe; Android / Apple = gói / bundle id
  const app = (ds: { muc: string; kieu: string }[]) => ds.filter((x) => x.kieu === "app" && (nen === "windows") === x.muc.endsWith(".exe")).map((x) => x.muc);
  const lm = lichMo(cs);
  const gt = cs.ungDung.giaiTri, chan = cs.ungDung.chan, hoc = cs.ungDung.hoc;
  const kNgu = { ngu: cs.gioChoi.ngu };
  const tran = { tranNgayPhut: cs.gioChoi.tranNgayPhut, tranTuanPhut: cs.gioChoi.tranTuanPhut };
  const khoa = { khoaGiaiTri: !cs.hieuLuc.giaiTriDuocMo, lyDo: cs.hieuLuc.lyDo };
  switch (nen) {
    case "windows": return [
      ["khung_gio", "du", "Dịch vụ đóng app giải trí ngoài khung, theo giờ máy chủ (serverTime) + đồng hồ đơn điệu khi mất mạng", { cauHinh: { lichMo: lm, tz: cs.tz } }],
      ["gio_ngu", "du", "Giờ đăng nhập của tài khoản Standard (net user /times — chỉ theo giờ chẵn, nới ra ngoài) + dịch vụ khoá phiên đúng phút",
        { cauHinh: { ...kNgu, netUserTimes: gioDangNhapWindows(cs.gioChoi.ngu) } }],
      ["tran_thoi_gian", "du", "Dịch vụ đo phút app ở cửa sổ tiền cảnh; máy chủ là sổ sách trần ngày/tuần", { cauHinh: tran }],
      ["phien_diem", "du", "Màn chặn «Dùng điểm để chơi»: phien/mo ⇒ nhịp mỗi phút ⇒ máy chủ trừ điểm, quyết dừng", { cauHinh: { soDu: cs.phienDiem.soDu, phien: cs.phienDiem.phien } }],
      ["cho_phep_app", "du", "AppLocker quy tắc Cho phép (đường dẫn Windows / Program Files + nhà phát hành) cho app hệ thống + học", { cauHinh: { applockerChoPhep: [...cs.ungDung.heThong.filter((x) => x.endsWith(".exe")), ...app(hoc)] } }],
      ["chan_app", "du", "AppLocker quy tắc Từ chối + dịch vụ đóng tiến trình app giải trí khi không có phiên", { cauHinh: { applockerTuChoi: app(chan), giaiTriCanPhien: app(gt) } }],
      ["chan_web", "mot_phan", "Chính sách trình duyệt Edge / Chrome / Firefox: URLBlocklist + URLAllowlist (HKLM\\SOFTWARE\\Policies)",
        { cauHinh: { URLBlocklist: web(chan), giaiTriCanPhien: web(gt) }, khongLamDuoc: "lọc web trong trình duyệt không hỗ trợ chính sách doanh nghiệp", thayBang: "trình duyệt khác coi là app chưa xếp ⇒ AppLocker chặn; lớp phụ: DNS tầng mạng" }],
      ["chua_xep", "du", "Mặc định CHẶN: AppLocker từ chối tệp chạy ngoài danh sách ở thư mục người dùng ghi được (Downloads, AppData…)"],
      ["khoa_ngay", "du", "Dịch vụ đóng app giải trí ngay ở nhịp kế tiếp; tuỳ chọn khoá màn hình phiên Con", { cauHinh: { khoaNgay: cs.khoaNgay } }],
      ["khoa_khong_tuan_thu", "du", "Không tuân thủ ⇒ khoá giải trí (fail-closed) tới khi hết lệch chuẩn hoặc Ba Mẹ mở khẩn cấp qua app", { cauHinh: khoa }],
      ["chong_doi_gio", "mot_phan", "Standard không có quyền đổi giờ hệ thống; mọi tính giờ theo serverTime",
        { khongLamDuoc: "cấm đổi múi giờ (Windows cho người dùng thường đổi múi giờ)", thayBang: "so giờ máy với máy chủ mỗi nhịp ⇒ lệch > ngưỡng: khoá giải trí + báo Ba Mẹ", ...BAO }],
      ["chan_cai_dat", "du", "AppLocker quy tắc Windows Installer + Executable chặn .exe/.msi lạ; Standard không cài vào Program Files được"],
      ["tai_khoan_khac", "mot_phan", "Standard không tạo được tài khoản; chính sách áp cho MỌI tài khoản không phải quản trị",
        { khongLamDuoc: "ngăn người có quyền quản trị tạo tài khoản quản trị mới", thayBang: "agent liệt kê nhóm Administrators mỗi nhịp ⇒ tài khoản quản trị Ba Mẹ chưa xác nhận: khoá giải trí + báo", ...BAO }],
      ["che_do_an_toan", "mot_phan", "Dịch vụ đăng ký chạy trong Safe Mode (SafeBoot\\Network); lần khởi động an toàn ghi sự kiện",
        { khongLamDuoc: "bảo đảm AppLocker thực thi trong Safe Mode", thayBang: "ghi sự kiện safe_mode + báo Ba Mẹ", ...BAO }],
      ["nhip", "du", "Dịch vụ gửi nhịp mỗi 60 giây; báo trước khi tắt / ngủ (OnShutdown / PowerEvent) để im lặng sau đó không bị coi là ngoài vòng"],
      ["go_cai_dat", "du", "Gỡ cần quyền quản trị (UAC) + mật khẩu AiiGrow của Ba Mẹ; gỡ từ xa: lệnh «go» ⇒ dịch vụ chạy msiexec /x /qn rồi báo xong"],
      ["khoi_phuc_goc", "khong", "—", { khongLamDuoc: "ngăn cài lại Windows / khởi động từ USB", thayBang: "máy mất nhịp ⇒ «ngoài vòng kiểm soát» + báo Ba Mẹ", ...BAO }],
    ];
    case "mac": return [
      ["khung_gio", "du", "Daemon đóng app giải trí ngoài khung (theo serverTime) + Screen Time Downtime", { cauHinh: { lichMo: lm, tz: cs.tz } }],
      ["gio_ngu", "du", "Screen Time Downtime theo giờ ngủ + daemon khoá màn hình", { cauHinh: kNgu }],
      ["tran_thoi_gian", "du", "Daemon đo app tiền cảnh (NSWorkspace); máy chủ là sổ sách", { cauHinh: tran }],
      ["phien_diem", "du", "Như Windows: phien/mo + nhịp phút", { cauHinh: { soDu: cs.phienDiem.soDu } }],
      ["cho_phep_app", "mot_phan", "Screen Time «Luôn cho phép» + daemon cho phép app hệ thống / học",
        { cauHinh: { choPhep: [...cs.ungDung.heThong.filter((x) => x.startsWith("com.") || x.endsWith(".app")), ...app(hoc)] }, khongLamDuoc: "chặn app TRƯỚC khi mở (không có AppLocker trên macOS thường)", thayBang: "daemon đóng app ngoài danh sách ngay khi mở + ghi sự kiện" }],
      ["chan_app", "mot_phan", "Daemon đóng app bị chặn ngay khi mở", { cauHinh: { chan: app(chan), giaiTriCanPhien: app(gt) }, khongLamDuoc: "chặn tuyệt đối trước khi mở", thayBang: "đóng ngay + ghi sự kiện chan_app" }],
      ["chan_web", "du", "Hồ sơ com.apple.webcontent-filter (FilterType BuiltIn, DenyListURLs / PermittedURLs)", { cauHinh: { DenyListURLs: web(chan), giaiTriCanPhien: web(gt) } }],
      ["chua_xep", "mot_phan", "Daemon đóng app chưa xếp", { khongLamDuoc: "chặn trước khi mở", thayBang: "đóng ngay + gợi ý «Xin phép Ba Mẹ»" }],
      ["khoa_ngay", "du", "Daemon đóng app giải trí ở nhịp kế tiếp", { cauHinh: { khoaNgay: cs.khoaNgay } }],
      ["khoa_khong_tuan_thu", "du", "Không tuân thủ ⇒ khoá giải trí; Ba Mẹ mở khẩn cấp qua app", { cauHinh: khoa }],
      ["chong_doi_gio", "du", "Tài khoản Standard không đổi được ngày giờ (cần mật khẩu quản trị); vẫn so serverTime"],
      ["chan_cai_dat", "mot_phan", "Standard không cài vào /Applications",
        { khongLamDuoc: "ngăn kéo .app vào ~/Applications", thayBang: "app mới coi là chưa xếp ⇒ daemon đóng + báo" }],
      ["tai_khoan_khac", "mot_phan", "Standard không tạo được tài khoản", { khongLamDuoc: "ngăn quản trị tạo tài khoản quản trị", thayBang: "daemon liệt kê nhóm admin ⇒ admin lạ: khoá giải trí + báo", ...BAO }],
      ["che_do_an_toan", "mot_phan", "Khởi động an toàn có thể không nạp daemon bên thứ ba", { khongLamDuoc: "bảo đảm daemon chạy trong Safe Mode", thayBang: "mất nhịp ⇒ ngoài vòng + báo Ba Mẹ", ...BAO }],
      ["nhip", "du", "Daemon gửi nhịp mỗi 60 giây; báo trước khi tắt / ngủ"],
      ["go_cai_dat", "du", "Gỡ cần quyền quản trị; gỡ từ xa: lệnh «go» ⇒ daemon tự gỡ (launchctl bootout + xoá) + MDM RemoveProfile nếu có hồ sơ"],
      ["khoi_phuc_goc", "khong", "—", { khongLamDuoc: "ngăn cài lại macOS / Chế độ khôi phục", thayBang: "mất nhịp ⇒ ngoài vòng + báo Ba Mẹ", ...BAO }],
    ];
    case "ios": return [
      ["khung_gio", "du", "DeviceActivitySchedule cho từng khung; ngoài khung: ManagedSettings shield.applicationCategories (trừ app học)", { cauHinh: { lichMo: lm, tz: cs.tz } }],
      ["gio_ngu", "du", "DeviceActivitySchedule giờ ngủ lặp hằng ngày ⇒ khiên mọi app trừ app hệ thống (Điện thoại, Tin nhắn)", { cauHinh: kNgu }],
      ["tran_thoi_gian", "du", "DeviceActivityEvent ngưỡng phút = trần ngày", { cauHinh: tran }],
      ["phien_diem", "mot_phan", "Mở phiên ở máy chủ ⇒ gỡ khiên app giải trí bằng một DeviceActivitySchedule ngắn đúng số phút đã mua",
        { cauHinh: { soDu: cs.phienDiem.soDu }, khongLamDuoc: "đo phút sống từng phút từ máy chủ (app không chạy nền liên tục)", thayBang: "máy chủ trừ điểm theo phút đã mở; hết lịch ⇒ iOS tự bật khiên lại" }],
      ["cho_phep_app", "mot_phan", "ManagedSettings + FamilyActivitySelection",
        { khongLamDuoc: "máy chủ gửi danh sách app theo bundle id (iOS chỉ đưa ApplicationToken mờ, vì quyền riêng tư)", thayBang: "Ba Mẹ chọn app trên máy Con bằng FamilyActivityPicker, gắn nhãn Học / Giải trí / Chặn; máy chủ lưu nhãn" }],
      ["chan_app", "mot_phan", "ManagedSettings shield.applications (token do FamilyActivityPicker chọn)",
        { khongLamDuoc: "chặn theo bundle id gửi từ máy chủ", thayBang: "Ba Mẹ chọn trên máy Con bằng FamilyActivityPicker" }],
      ["chan_web", "du", "ManagedSettings webContent.blockedByFilter = .specific(WebDomain(domain:)) — nhận tên miền dạng chuỗi", { cauHinh: { webDomainsChan: web(chan), giaiTriCanPhien: web(gt) } }],
      ["chua_xep", "mot_phan", "application.denyAppInstallation + «Hỏi mua» của Chia sẻ trong gia đình",
        { khongLamDuoc: "tự chặn app chưa xếp đã có sẵn trên máy", thayBang: "khiên cả nhóm danh mục (applicationCategories) trừ app Ba Mẹ đã đánh dấu Học" }],
      ["khoa_ngay", "du", "ManagedSettings khiên mọi danh mục giải trí", { cauHinh: { khoaNgay: cs.khoaNgay } }],
      ["khoa_khong_tuan_thu", "du", "Không tuân thủ ⇒ khiên giải trí; Ba Mẹ mở khẩn cấp qua app", { cauHinh: khoa }],
      ["chong_doi_gio", "khong", "—", { khongLamDuoc: "ép «Đặt tự động» ngày giờ (chỉ có ở máy giám sát qua MDM)", thayBang: "so giờ máy với máy chủ ⇒ lệch: khoá giải trí + báo Ba Mẹ", ...BAO }],
      ["chan_cai_dat", "du", "application.denyAppInstallation (+ «Hỏi mua»)"],
      ["tai_khoan_khac", "khong_ap_dung", "iOS một người dùng; Apple ID của Con do Chia sẻ trong gia đình quản",
        { khongLamDuoc: "—", thayBang: "quyền FamilyControls bị thu hồi ⇒ app quản lý tắt ⇒ khoá + báo", ...BAO }],
      ["che_do_an_toan", "khong_ap_dung", "iOS không có chế độ an toàn cho người dùng"],
      ["nhip", "mot_phan", "BGAppRefreshTask + callback DeviceActivityMonitor",
        { khongLamDuoc: "nhịp đều mỗi phút (iOS giới hạn chạy nền)", thayBang: "ngưỡng mất nhịp riêng cho điện thoại (mat_nhip_di_dong_phut)" }],
      ["go_cai_dat", "du", "Ủy quyền .child: gỡ app / thu hồi quyền cần Ba Mẹ xác nhận (iOS quyết, hiện rõ); gỡ từ xa: revokeAuthorization (+ MDM RemoveProfile nếu có)",
        { khongLamDuoc: "app tự xoá chính nó", thayBang: "sau khi báo «đã gỡ», app hiện hướng dẫn xoá biểu tượng" }],
      ["khoi_phuc_goc", "khong", "—", { khongLamDuoc: "ngăn xoá máy / đăng xuất Apple ID", thayBang: "mất nhịp ⇒ ngoài vòng + báo Ba Mẹ", ...BAO }],
    ];
    case "android": return [
      ["khung_gio", "du", "setPackagesSuspended(app giải trí) ngoài khung, theo serverTime", { cauHinh: { lichMo: lm, tz: cs.tz } }],
      ["gio_ngu", "du", "Giờ ngủ: tạm dừng mọi app trừ hệ thống / học", { cauHinh: kNgu }],
      ["tran_thoi_gian", "du", "UsageStatsManager đo phút; máy chủ là sổ sách", { cauHinh: tran }],
      ["phien_diem", "du", "Mở phiên ⇒ bỏ tạm dừng app giải trí; nhịp phút; hết phiên ⇒ tạm dừng lại", { cauHinh: { soDu: cs.phienDiem.soDu } }],
      ["cho_phep_app", "du", "setPackagesSuspended(false) cho app hệ thống + học", { cauHinh: { goi: [...cs.ungDung.heThong.filter((x) => /^(com|vn)\./.test(x)), ...app(hoc)] } }],
      ["chan_app", "du", "setPackagesSuspended(true) — app hiện xám «Đã tạm dừng», không bị ẩn", { cauHinh: { tamDung: app(chan), giaiTriCanPhien: app(gt) } }],
      ["chan_web", "mot_phan", "Cấu hình quản lý Chrome (URLBlocklist / URLAllowlist qua setApplicationRestrictions)",
        { cauHinh: { URLBlocklist: web(chan), giaiTriCanPhien: web(gt) }, khongLamDuoc: "lọc web trong mọi trình duyệt", thayBang: "trình duyệt khác coi là chưa xếp ⇒ tạm dừng; lớp phụ: DNS riêng (setGlobalPrivateDnsModeSpecifiedHost) / tầng mạng" }],
      ["chua_xep", "du", "App mới cài (PACKAGE_ADDED) ⇒ tạm dừng tới khi Ba Mẹ xếp"],
      ["khoa_ngay", "du", "Tạm dừng app giải trí; Ba Mẹ chọn khoá cả máy ⇒ lockNow()", { cauHinh: { khoaNgay: cs.khoaNgay } }],
      ["khoa_khong_tuan_thu", "du", "Không tuân thủ ⇒ tạm dừng app giải trí; Ba Mẹ mở khẩn cấp qua app", { cauHinh: khoa }],
      ["chong_doi_gio", "du", "setAutoTimeEnabled(true) (API 30+) + hạn chế DISALLOW_CONFIG_DATE_TIME; vẫn so serverTime"],
      ["chan_cai_dat", "du", "DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY; app từ Play ⇒ chưa xếp ⇒ tạm dừng"],
      ["tai_khoan_khac", "du", "DISALLOW_ADD_USER (không thêm người dùng / khách)"],
      ["che_do_an_toan", "du", "DISALLOW_SAFE_BOOT"],
      ["nhip", "mot_phan", "WorkManager định kỳ", { khongLamDuoc: "nhịp mỗi phút khi máy ngủ sâu (Doze)", thayBang: "nhịp khi có phiên + ngưỡng mất nhịp di động; đẩy FCM (việc chờ)" }],
      ["go_cai_dat", "du", "Device Owner không gỡ được bằng cách thường (Android quy định, Cài đặt hiện «Thiết bị do AiiGrow quản lý»); gỡ từ xa: clearDeviceOwnerApp() rồi tự gỡ"],
      ["khoi_phuc_goc", "khong", "Không chặn khôi phục gốc (giới hạn cứng: không chống gỡ)", { khongLamDuoc: "ngăn khôi phục cài đặt gốc", thayBang: "máy biến mất ⇒ ngoài vòng + báo Ba Mẹ", ...BAO }],
    ];
    case "mang": return [
      ["khung_gio", "du", "Router chặn Internet theo MAC ngoài lịch mở", { cauHinh: { lichMo: lm } }],
      ["gio_ngu", "du", "Router chặn Internet theo MAC trong giờ ngủ", { cauHinh: kNgu }],
      ["tran_thoi_gian", "khong", "—", { khongLamDuoc: "đếm phút dùng thật", thayBang: "chỉ theo lịch; thêm giờ do Ba Mẹ mở qua app" }],
      ["phien_diem", "mot_phan", "Máy chủ mở cửa sổ Internet cho MAC đúng số phút đã mua", { khongLamDuoc: "trừ điểm khi router không có API", thayBang: "Con mở phiên trên app Con (điện thoại); router có API thì máy chủ đẩy luật (việc chờ)" }],
      ["cho_phep_app", "khong", "—", { khongLamDuoc: "phân biệt app (mạng chỉ thấy tên miền / IP)", thayBang: "DNS cho phép tên miền học" }],
      ["chan_app", "mot_phan", "DNS chặn tên miền dịch vụ của app", { khongLamDuoc: "chặn app ngoại tuyến", thayBang: "chặn tên miền máy chủ của app" }],
      ["chan_web", "du", "DNS lọc theo thiết bị (NextDNS denylist / Pi-hole nhóm client)"],
      ["chua_xep", "khong", "—", { khongLamDuoc: "mặc định chặn web chưa xếp mà không chặn cả Internet", thayBang: "TV coi cả thiết bị là giải trí: chỉ mở trong lịch" }],
      ["khoa_ngay", "du", "Router chặn Internet theo MAC ngay"],
      ["khoa_khong_tuan_thu", "khong_ap_dung", "Thiết bị không có agent nên không có nhịp / tuân thủ"],
      ["chong_doi_gio", "du", "Lịch chạy theo giờ router / máy chủ, không phụ thuộc giờ thiết bị"],
      ["chan_cai_dat", "khong", "—", { khongLamDuoc: "chặn cài app trên thiết bị", thayBang: "khoá PIN cửa hàng app có sẵn trên thiết bị (Ba Mẹ đặt)" }],
      ["tai_khoan_khac", "khong_ap_dung", "—"],
      ["che_do_an_toan", "khong_ap_dung", "—"],
      ["nhip", "khong", "—", { khongLamDuoc: "biết thiết bị còn chịu luật", thayBang: "router báo thiết bị trực tuyến (việc chờ)" }],
      ["go_cai_dat", "du", "Xoá luật MAC + nhóm DNS"],
      ["khoi_phuc_goc", "mot_phan", "—", { khongLamDuoc: "ngăn đổi địa chỉ MAC (MAC riêng / ngẫu nhiên)", thayBang: "tắt «địa chỉ riêng» cho Wi-Fi nhà; thiết bị lạ vào mạng ⇒ báo Ba Mẹ", ...BAO }],
    ];
    default: {
      // TV: lớp chính là tầng mạng; thêm cơ chế riêng của hãng nếu có
      const rieng: Partial<Record<KhaNang, Dong>> = nen === "tvos" ? {
        khung_gio: ["khung_gio", "khong", "—", { khongLamDuoc: "lịch / giới hạn giờ trên Apple TV (tvOS chưa có Screen Time theo giờ; FamilyControls không có trên tvOS)", thayBang: TV_MANG }],
        chan_cai_dat: ["chan_cai_dat", "du", "Giới hạn Apple TV (mật mã) chặn mua / cài app theo xếp hạng; MDM Restrictions khi giám sát"],
        chan_web: ["chan_web", "mot_phan", "Apple TV không có trình duyệt; app video lọc bằng DNS", { thayBang: TV_MANG }],
      } : nen === "android_tv" ? {
        khung_gio: ["khung_gio", "mot_phan", "Hồ sơ trẻ em Google TV: giới hạn giờ xem / giờ ngủ trong Family Link", { khongLamDuoc: "máy chủ AiiGrow đẩy lịch vào Family Link (không có API công khai)", thayBang: TV_MANG }],
        chan_cai_dat: ["chan_cai_dat", "mot_phan", "Hồ sơ trẻ em: Ba Mẹ duyệt app", { thayBang: "khoá PIN cửa hàng" }],
      } : {
        chan_cai_dat: ["chan_cai_dat", "mot_phan", "Khoá PIN cửa hàng app / xếp hạng nội dung có sẵn trên TV", { thayBang: "Ba Mẹ đặt PIN trên TV" }],
      };
      return dongNen("mang", cs).map((d) => rieng[d[0]] ?? d);
    }
  }
}

const NHIP_GIAY: Record<NenChuyenDoi, number> = { windows: 60, mac: 60, android: 900, ios: 3600, tvos: 0, android_tv: 0, tizen: 0, webos: 0, mang: 0 };
export const laDiDong = (nen: string) => nen === "android" || nen === "ios";

/** Máy tính có TÁC TỬ riêng của AiiGrow (Windows: agent-win; macOS: agent-mac) — cùng giao thức dong-bo/`windows`, cùng cách đối xử:
 *  cửa sổ thêm giờ, hạn mở, thưởng, ghép phiên máy chung, mã mở offline, không gửi nhịp tuân thủ. Máy khác (điện thoại, TV, mạng) thì không. */
export const coTacTu = (nen: string | null | undefined): boolean => nen === "windows" || nen === "mac";
/** Máy có «cửa sổ thêm giờ» (grants.cua_so_den + hạn mở trả về máy): máy tính có tác tử + iPhone/iPad + máy Con Android (app đặt lịch DeviceActivity «themgio» theo hạn).
 * CHỈ phần cửa sổ này — iOS / Android KHÔNG phải «có tác tử»: không mã mở offline, không phiên máy chung (những chỗ đó vẫn dùng coTacTu). */
export const coCuaSoThemGio = (nen: string | null | undefined): boolean => coTacTu(nen) || nen === "ios" || nen === "android";
/** Nhóm dùng chung cửa sổ thêm giờ: duyệt lời xin từ máy nào thì chỉ mở các máy CÙNG nhóm (máy tính có tác tử / iPhone-iPad / Android).
 *  Không thì xin từ iPhone lại mở tự do cả PC Windows (gỡ hết chặn web/app). Grant không rõ máy (null) = nhóm máy tính như trước. */
export const nhomCuaSo = (nen: string | null | undefined): string => (nen === "ios" || nen === "android" ? nen : "may_tinh");
/** SQL: nhóm cửa sổ của grant (lưu lúc duyệt; grant cũ trước cột này đều từ máy Windows ⇒ máy tính). */
export const SQL_NHOM_CUA_SO = `coalesce(g.nhom_cua_so, 'may_tinh')`;
/** Lời xin «thêm giờ» thành CỬA SỔ (thay vì phút thưởng) khi: máy tính có tác tử, hoặc iPhone/Android đã chạy tác tử mới (đã gửi nhịp `ios`/`android`
 *  vào status). App Con cũ trên điện thoại vẫn nhận phút thưởng như trước — tác tử điện thoại chưa phát hành thì không mất thưởng. */
export const lamCuaSo = (may: { platform: string | null | undefined; status?: Record<string, unknown> | null } | null | undefined): boolean =>
  !!may && (coTacTu(may.platform) || ((may.platform === "ios" || may.platform === "android") && may.status?.[may.platform] != null));

const VIEC_CHO: Record<NenChuyenDoi, string[]> = {
  windows: ["Gọi API thật (AppLocker, chính sách trình duyệt, net user /times, dịch vụ) trong agent-win — việc chờ máy Windows thử tài khoản Standard"],
  mac: ["Agent macOS (LaunchDaemon + hồ sơ cấu hình) — việc chờ Mac/Xcode", "MDM: cần máy chủ MDM + chứng chỉ APNs (Apple Push) — việc chờ"],
  ios: ["Xin Apple quyền com.apple.developer.family-controls — việc chờ", "App iOS (FamilyControls / ManagedSettings / DeviceActivity) — việc chờ Mac/Xcode + iPhone thật"],
  android: ["DPC AiiGrow (Device Owner) — việc chờ điện thoại Android khôi phục gốc để cài bằng QR", "Đẩy FCM cho lệnh tức thời — việc chờ dự án Firebase"],
  tvos: ["Apple TV: chỉ tầng mạng + Screen Time do Ba Mẹ đặt; MDM cần Apple TV giám sát — việc chờ thiết bị"],
  android_tv: ["Google TV: Family Link do Ba Mẹ đặt; Device Owner chỉ cho thiết bị chuyên dụng — việc chờ thiết bị"],
  tizen: ["Samsung TV gia đình không có MDM công khai — dùng tầng mạng"],
  webos: ["LG TV: quản lý tập trung chỉ dòng thương mại — gia đình dùng tầng mạng"],
  mang: ["Đẩy luật tự động vào router (API riêng từng hãng) / NextDNS API — việc chờ thiết bị + khoá API do Ba Mẹ cấp; hiện tại: mô tả để Ba Mẹ làm theo"],
};

/** Chính sách chung ⇒ cấu hình nền tảng `nen`. `tb` = thông tin thiết bị mạng (TV: MAC). */
export function chuyenDoi(cs: ChinhSachChung, nen: NenChuyenDoi, tb: { mac?: unknown; ten?: string } = {}): CauHinhNenTang {
  const muc: MucChuyenDoi[] = dongNen(nen, cs).map(([khaNang, mucDo, coChe, them]) => ({ khaNang, mucDo, coChe, ...(them ?? {}) }));
  return {
    nen, ten: TEN_NEN[nen], coChe: CO_CHE[nen], nhipGiay: NHIP_GIAY[nen], muc,
    khongLamDuoc: muc.filter((m) => (m.mucDo === "khong" || m.mucDo === "mot_phan") && m.thayBang)
      .map((m) => ({ khaNang: m.khaNang, khongLamDuoc: m.khongLamDuoc ?? m.coChe, thayBang: m.thayBang!, chiBaoBaMe: m.chiBaoBaMe === true })),
    ...(nen === "mang" || LA_TV(nen) ? { mang: luatMang(cs, tb) } : {}),
    viecCho: VIEC_CHO[nen],
  };
}

// ---------------------------------------------------------------- cài MỘT CHẠM + gỡ từ xa (mô tả cho app Ba Mẹ / trình cài)
export type HuongDanCai = { nen: NenChuyenDoi; cach: string; buoc: string[]; quyenAdmin: string; chiTiet: Record<string, unknown> };

/** Gói cài có token ghép nhúng sẵn: không nhập URL / mã tay; xin quyền quản trị MỘT lần. */
export function huongDanCai(nen: NenChuyenDoi, token: string, goc: string): HuongDanCai {
  const g = goc.replace(/\/+$/, "");
  switch (nen) {
    case "windows": return { nen, cach: "tep_cai", quyenAdmin: "UAC một lần khi chạy trình cài",
      buoc: ["Tải AiiGrowSetup.exe từ app Ba Mẹ trên máy Con", "Bấm đúp, chọn Có ở hộp UAC (mật khẩu quản trị của Ba Mẹ)", "Xong — dịch vụ tự đăng ký với máy chủ"],
      chiTiet: { tep: "AiiGrowSetup.exe", nhungToken: "thẻ trong vùng chữ ký Authenticode (cách trình cài Chrome / Omaha) — dự phòng: tên tệp AiiGrowSetup_<token>.exe",
        lenhIm: `AiiGrowSetup.exe /silent /token=${token}`, msi: `msiexec /i AiiGrow.msi /qn GHEP_TOKEN=${token}`, mayChu: g } };
    case "mac": return { nen, cach: "tep_cai", quyenAdmin: "mật khẩu quản trị một lần khi cài .pkg (+ duyệt hồ sơ trong Cài đặt nếu dùng MDM)",
      buoc: ["Tải AiiGrow.pkg từ app Ba Mẹ trên máy Con", "Mở, nhập mật khẩu quản trị một lần", "Duyệt «Mục nền» AiiGrow khi macOS hỏi"],
      chiTiet: { tep: `AiiGrow_${token}.pkg`, nhungToken: "tên tệp (postinstall đọc $PACKAGE_PATH)", hoSoMdm: "tuỳ chọn — việc chờ máy chủ MDM", mayChu: g } };
    case "ios": return { nen, cach: "app_store_qr", quyenAdmin: "Ba Mẹ duyệt quyền Screen Time bằng Apple ID của Ba Mẹ một lần",
      buoc: ["Cài AiiGrow từ App Store trên máy Con", "Mở app, quét QR trong app Ba Mẹ", "Ba Mẹ xác nhận quyền Screen Time (một lần)"],
      chiTiet: { qr: `${g}/cai/${token}`, lienKet: "universal link — mở thẳng app, không nhập mã" } };
    case "android": return { nen, cach: "qr_device_owner", quyenAdmin: "không cần — Device Owner cấp khi cài bằng QR",
      buoc: ["Khôi phục gốc máy Con (máy mới)", "Ở màn chào chạm 6 lần, quét QR trong app Ba Mẹ", "Máy tự tải AiiGrow Con, tự ghép với gia đình"],
      chiTiet: { qrCaiDat: {
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.QuanTri",
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": `${g}/tai/aiigrow-con.apk`,
        "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,   // giữ Chrome, Camera… của máy
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "7WW8vTHg1Vu0clik_OQmB0gVrxb9rlj-Uku-tq8JxZM",   // base64url SHA-256 chứng chỉ khoá phát hành aiigrow-con (agent-android/README.md)
        "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": { aiigrow_token: token, aiigrow_may_chu: g },
      }, duPhong: `máy đang dùng: cài app «AiiGrow Con» rồi ghép bằng mã 6 số (không có Device Owner ⇒ mức bảo vệ Một phần)`,
        ghiChu: "APK AiiGrow Con ký khoá phát hành, ở GitHub Release con-android-<bản> của aiigrow-tai — /tai/aiigrow-con.apk chuyển tới đó." } };
    default: return { nen, cach: "tang_mang", quyenAdmin: "quyền quản trị router của Ba Mẹ",
      buoc: ["Trong app Ba Mẹ chọn TV trong danh sách thiết bị của router (theo MAC) — một bước"],
      chiTiet: { ghiChu: "TV không có MDM cho gia đình: áp luật tầng mạng (router / DNS)" } };
  }
}

/** Cơ chế gỡ từ xa từng nền tảng (máy chủ ghi lệnh «go» ⇒ agent lấy qua nhịp / dong-bo ⇒ báo xong). */
export const CACH_GO_TU_XA: Record<NenChuyenDoi, string> = {
  windows: "Dịch vụ nhận lệnh «go» ⇒ báo xong ⇒ chạy msiexec /x /qn (gỡ dịch vụ, khay, luật AppLocker, chính sách trình duyệt)",
  mac: "Daemon nhận lệnh ⇒ báo xong ⇒ launchctl bootout + xoá tệp; MDM: lệnh RemoveProfile gỡ hồ sơ",
  ios: "App nhận lệnh ⇒ AuthorizationCenter.revokeAuthorization ⇒ báo xong; MDM: RemoveProfile; iOS không cho app tự xoá ⇒ hướng dẫn xoá biểu tượng",
  android: "DPC nhận lệnh ⇒ báo xong ⇒ clearDeviceOwnerApp() (thôi Device Owner, không xoá dữ liệu) ⇒ tự gỡ",
  tvos: "Xoá luật tầng mạng; MDM: RemoveProfile", android_tv: "Xoá luật tầng mạng", tizen: "Xoá luật tầng mạng", webos: "Xoá luật tầng mạng",
  mang: "Xoá luật MAC + nhóm DNS",
};
