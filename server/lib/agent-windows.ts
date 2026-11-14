// Policy cho agent Windows (agent-win, lớp thực thi chép từ AiiControl): máy chủ dịch Policy AiiGrow (taoPolicy) sang đúng hình dạng
// agent đọc (Policy của AiiGrow.Core: mode / locked / allowedApps / learningApps…) — mọi quyết định nằm ở máy chủ, agent chỉ thực thi.
//   • Bình thường: mode «hoc» = chỉ app trong danh sách được phép chạy (Allowlist hệ thống + app Học tập Ba Mẹ đã xếp).
//   • App Giải trí chỉ vào danh sách khi đang có phiên chơi bằng điểm cho đúng app đó (máy chủ mở/đóng phiên theo điểm, khung giờ).
//   • Web: `web` = {cheDo, chan[], cho[]} dịch từ luật tên miền (lib/web.ts) — agent áp bằng chính sách Chrome/Edge (HKLM\SOFTWARE\Policies).
//   • «Khoá ngay» của Ba Mẹ, hoặc đang trong giờ ngủ ⇒ mode «khoa».
//   • «Mở» có hạn (Ba Mẹ mở khẩn cấp, hoặc duyệt «thêm giờ» cho lời xin từ máy này): mode «tu_do» + grantEndsAt tới hạn ⇒ agent GỠ AppLocker
//     «Chỉ app học» ở lần đồng bộ kế, khay hiện đồng hồ «đang được bố mẹ thêm giờ». Khoá ngay / giờ ngủ vẫn thắng. Hết hạn ⇒ máy chủ trả lại «hoc».
//   • nextCheckSec ngắn lại khi đang có phiên / đang mở (và đúng lúc hết hạn mở) để thay đổi của Ba Mẹ tới máy Con trong ≤ 30 giây.
//   • minutesLeft để trống: hết phiên chơi thì máy chủ đóng phiên, lần đồng bộ sau app giải trí rời danh sách (không khoá cả máy).
// TỪ 05/11 (thiết kế chốt, lib/quy-gio.ts): QUỸ phút chơi dùng chung — còn quỹ (và không giờ ngủ / giờ học / khoá) ⇒ MỌI app Giải trí Ba Mẹ
// cho phép vào allowedApps (không cần phiên điểm); hết quỹ ⇒ rời danh sách. `quyConPhut` + `appTinhGio` cho agent mới tự đếm lùi (cả khi mất
// mạng); agent cũ không đọc 2 trường này ⇒ máy chủ bỏ app khi quỹ hết ở lần đồng bộ kế (≤ 60 giây khi còn ≤ 10 phút). Ngoại lệ Ba Mẹ mở
// (`ngoaiLe`): cả máy ⇒ tu_do tới hạn, thắng giờ ngủ / khoá; một app ⇒ chỉ thêm app đó (lúc ngủ / khoá: chỉ app đó + app hệ thống).
// Agent khởi động ở GIÁM SÁT (chỉ ghi log việc sẽ làm) — xem agent-win/README.md. `cheDo` = lựa chọn của Ba Mẹ trên app (devices.che_do);
// máy Windows/Mac riêng của Con ghép từ 25/10 có sẵn lựa chọn «chan» (gia-dinh.ts › cheDoMayMoi) ⇒ chặn thật từ lần đồng bộ đầu.
import { kieuMuc } from "./chinh-sach.ts";
import { gioDiaPhuong, phutCua, trongKhung } from "./gio.ts";
import { laMoHet, type Policy } from "./may-con.ts";
import { nhipToiKhoaLai } from "./cau-hinh.ts";
import { chinhSachWebCho, type ChinhSachWeb } from "./web.ts";
import { laWebCam } from "./chan-co-ban.ts";

export type PolicyWindows = {
  serverTime: string; childName: string; mode: "hoc" | "khoa" | "tu_do"; locked: boolean; lockReason: string | null;
  allowedApps: string[]; learningApps: string[]; minutesLeft: null; nextCheckSec: number; canExchangePoints: boolean;
  /** Bí mật mã mở offline (lib/ma-offline.ts) — agent lưu khi còn mạng để tự kiểm mã Ba Mẹ đọc lúc mất mạng. */
  maOfflineBiMat?: string;
  /** Hạn «đang mở» (ISO) — chỉ có khi mode = tu_do do Ba Mẹ mở/thêm giờ; khay hiện đồng hồ đếm ngược. */
  grantEndsAt?: string;
  /** Chế độ do Ba Mẹ chọn từ xa: giam-sat (chỉ ghi lại, không chặn) | chan (chặn thật). Agent-win: giá trị này thắng CheDo cục bộ.
   *  Máy đang có lệnh gỡ chờ ⇒ luôn giam-sat (gỡ lỗi giữa chừng cũng không còn chặn). Ba Mẹ chưa chọn ⇒ bỏ trống (agent giữ chế độ đang chạy). */
  cheDo?: "giam-sat" | "chan";
  /** Lọc web theo tên miền (lib/web.ts): agent ghi chính sách Chrome/Edge URLBlocklist/URLAllowlist — CHỈ khi chế độ hiệu lực là «chan»; giám sát ⇒ gỡ chính sách. */
  web: ChinhSachWeb;
  /** Agent 0.2.6: app (.exe) / trang web Ba Mẹ đã xếp Giải trí — khay Grow cho Con chọn khi bấm «Chơi bằng điểm» (máy chủ vẫn quyết ở phien/xet). */
  playChoices: string[];
  /** App Ba Mẹ đặt «Chặn» kèm định danh thật của chính máy này (lib/app-may.ts › appChanCuaMay) — agent đóng ở MỌI mode khi chế độ «chan». */
  blockedApps?: { muc: string; duongDan?: string; thuMuc?: string; sha256?: string; nhaPhatHanh?: string; teamId?: string }[];
  // 0.2.4 — chỉ có khi đang có phiên chơi bằng điểm mà agent cho chạy (app .exe của phiên, hoặc trình duyệt cho phiên web).
  // Agent dùng khi MẤT MẠNG (BRD 6.7): chỉ đếm lúc app chơi ở nền trước + màn hình mở; vượt `playOfflineMinutes` ⇒ tự bỏ app chơi
  // (và trình duyệt nếu `playWeb`) khỏi allowedApps, coi phiên đã hết; có mạng lại gửi `phien/bu` {id = playSessionId} trước dong-bo.
  /** Mã phiên chơi đang chạy (play_sessions.id). */
  playSessionId?: string;
  /** Mục của phiên, chữ thường (tên .exe, hoặc tên miền khi `playWeb`). */
  playApp?: string;
  /** Phiên web ⇒ app chơi là trình duyệt (TRINH_DUYET). */
  playWeb?: boolean;
  /** Số phút tối đa được chơi tiếp khi mất mạng = min(phút còn lại của phiên, phút mua được bằng số dư + phút thưởng còn lại theo giá phiên,
   *  phút tới hết khung giờ / tới giờ ngủ — phutToiHetLich). */
  playOfflineMinutes?: number;
  // ---- 05/11 quỹ giờ chơi (lib/quy-gio.ts) — agent mới đọc; agent cũ bỏ qua
  /** Phút chơi còn lại hôm nay (mọi app Giải trí dùng chung). Agent đếm lùi khi app trong `appTinhGio` (hoặc trình duyệt đang mở trang Giải trí) ở
   *  tiền cảnh + màn hình mở; về 0 ⇒ bỏ các app đó khỏi allowedApps tới lần đồng bộ kế. Không gửi = máy dùng chung chưa chọn Con. */
  quyConPhut?: number;
  /** Quỹ của hôm nay (đã cộng thêm giờ / đổi sao) — khay hiện «Đã chơi X / Y phút». */
  quyTongPhut?: number;
  quyDaDung?: number;
  /** App Giải trí đang được thả nhờ quỹ (đã nằm trong allowedApps) — app tính giờ. Rỗng khi hết quỹ / giờ ngủ / giờ học / khoá. */
  appTinhGio?: string[];
  /** Giờ ngủ, giờ học (null = không đặt) — agent tự xét khi mất mạng. */
  gioNgu?: { tu: string; den: string };
  gioHoc?: { tu: string; den: string; thu: number[] } | null;
  /** Đang giờ học (chỉ app Học + hệ thống). */
  dangGioHoc?: boolean;
  /** Ngoại lệ đang mở cho máy này: `app` null = cả máy (mode tu_do, grantEndsAt = hạn). Hết hạn ⇒ agent tự khoá lại như cũ. */
  ngoaiLe?: { den: string; app: string | null }[];
  /** Có ngoại lệ trong lúc máy đang bị khoá (Ba Mẹ khoá ⇒ "khoa", giờ ngủ ⇒ "ngu"): mọi ngoại lệ hết hạn thì agent khoá lại với lý do này
   *  — kể cả khi mất mạng (agent-win QuyTaiCho). Không có ⇒ hết ngoại lệ thì về luật thường. */
  khoaKhiHetNgoaiLe?: "khoa" | "ngu";
  /** 11/11: Con ở «Mở hết» (chế độ Ba Mẹ chọn, không đổi theo khoá / giờ ngủ) ⇒ agent gỡ dòng chặn kiểu 0.0.0.0 trong tệp hosts do phần mềm khác đặt
   *  (agent-win HostsChan.cs) — «Mở hết» là không chặn gì ngoài web luôn chặn. Không có / false ⇒ agent không đụng hosts. */
  moHet?: boolean;
  /** Số sao hiện có của Con (05/11, = số dư điểm) — chỉ khi đã biết Con. */
  sao?: number;
};

const exe = (s: string) => s.toLowerCase().endsWith(".exe");

/** Trình duyệt cho chạy khi có phiên chơi cho một WEBSITE (tên miền không phải .exe). CHỈ trình duyệt agent lọc được theo tên miền
 *  (chính sách Chrome/Edge/Brave — lib/web.ts, agent-win WebGuard): mở Firefox/Opera sẽ lọt mọi trang bị chặn trong lúc chơi. */
export const TRINH_DUYET = ["chrome.exe", "msedge.exe", "brave.exe"];
/** Như TRINH_DUYET nhưng cho macOS (bundle id — đúng chữ hoa/thường của hệ điều hành): agent-mac lọc web bằng chính sách Chrome/Edge/Brave/Cốc Cốc + khối hosts cho Safari. */
export const TRINH_DUYET_MAC = ["com.google.Chrome", "com.microsoft.edgemac", "com.brave.Browser", "com.apple.Safari", "com.coccoc.Coccoc"];

/** Chu kỳ đồng bộ (giây): nhàn rỗi 120; có phiên / đang mở / còn «thưởng» chưa dùng 30; đang mở thì không quá hạn mở (để trả chặn đúng giờ). Agent kẹp 10–600. */
export const NHIP_NHAN_ROI = 120;
export const NHIP_BAN = 30;
export function nhipDongBo(o: { coPhien: boolean; moDen?: Date | null; now: Date; conThuong?: number }): number {
  let s = o.coPhien || o.conThuong ? NHIP_BAN : NHIP_NHAN_ROI;
  if (o.moDen && o.moDen.getTime() > o.now.getTime()) {
    s = Math.min(NHIP_BAN, Math.ceil((o.moDen.getTime() - o.now.getTime()) / 1000) + 2);
  }
  return Math.max(10, s);
}

/** `phienTien`: giá của phiên (phần nghìn điểm/phút, chốt lúc mở) và phần lẻ đang nợ (phan_nghin_tru − diem_tru·1000) — lib/phien-windows.ts › tienPhien. */
/** `lichPhien`: lịch của Con đang chơi (máy dùng chung — Policy chung mang lịch mặc định) — chỉ dùng cho playOfflineMinutes. */
/** `appThat`: mục app thật của CẢ NHÀ (lib/app-may.ts › mucAppThat) — để loại khỏi luật web. `appNen`: chỉ app máy CÙNG NỀN gửi — gói Store
 *  «microsoft.minecraftuwp» không có đuôi .exe nhưng vẫn là app của Windows (vào allowedApps / playChoices); package Android thì không. */
export type MoRong = { nen?: "windows" | "mac"; moDen?: Date | null; conThuong?: number; phienTien?: { giaPhanNghin: number; noPhanNghin: number }; lichPhien?: Policy["lich"]; appThat?: Set<string>; appNen?: Set<string> };

/** Phút được chơi tiếp khi mất mạng (BRD 6.7) — tính như máy chủ tính ở nhịp: phút thưởng (thêm giờ) dùng trước, không trừ điểm;
 *  rồi tới số phút mua được bằng số dư sau khi trả phần lẻ đang nợ; không vượt phút còn lại của phiên. Giá 0 ⇒ chỉ giới hạn bởi phiên. */
export function phutChoiOffline(conPhut: number, soDu: number, conThuong: number, giaPhanNghin: number, noPhanNghin = 0): number {
  const muaDuoc = giaPhanNghin > 0 ? Math.max(0, Math.floor((soDu * 1000 - Math.max(0, noPhanNghin)) / giaPhanNghin)) : Infinity;
  return Math.max(0, Math.min(Math.max(0, conPhut), muaDuoc + Math.max(0, Math.floor(conThuong))));
}

/** Phút còn lại tới khi PHẢI dừng theo lịch lúc `p.serverTime`: tới giờ ngủ (đang ngủ ⇒ 0) và tới giờ học hôm nay (đang học ⇒ 0).
 *  05/11: khung giờ chơi không còn chặn (quỹ phút thay). Agent mất mạng không tự xét lịch cho phiên đã mở nên ngưỡng offline phải chứa sẵn mốc này. */
export function phutToiHetLich(p: Pick<Policy, "lich" | "tz" | "serverTime">): number {
  const g = gioDiaPhuong(new Date(p.serverTime), p.tz);
  let ra = 1440;
  if (p.lich?.ngu) {
    if (trongKhung(g.phut, p.lich.ngu)) return 0;
    ra = ((phutCua(p.lich.ngu.tu) - g.phut + 1440) % 1440) || 1440;
  }
  const h = p.lich?.hoc;
  if (h && h.thu.includes(g.thu)) {
    if (trongKhung(g.phut, h)) return 0;
    if (phutCua(h.tu) > g.phut) ra = Math.min(ra, phutCua(h.tu) - g.phut);
  }
  return ra;
}

/** Ngoại lệ trang web (05/11): mở đúng các tên miền Ba Mẹ cho; lúc giờ ngủ / khoá (chỉ có ngoại lệ) ⇒ «chỉ cho phép» để trình duyệt được thả
 *  không mở được trang khác ngoài danh sách cho phép + trang ngoại lệ. */
function moWebNgoaiLe(w: ChinhSachWeb, ds: string[], chiNgoaiLe: boolean): ChinhSachWeb {
  if (!ds.length) return w;
  // web luôn chặn (người lớn, cờ bạc…) không bao giờ mở; chỉ gỡ chặn đúng tên miền ngoại lệ hoặc tên miền con của nó — không gỡ tên miền cha
  const mo = ds.filter((d) => !laWebCam(d));
  if (!mo.length) return w;
  const bo = (m: string) => !laWebCam(m) && mo.some((d) => m === d || m.endsWith("." + d));
  return { ...w, ...(chiNgoaiLe ? { cheDo: "chi_cho_phep" as const } : {}), chan: w.chan.filter((m) => !bo(m)), cho: [...new Set([...w.cho, ...mo])].sort() };
}

export function chinhSachWindows(p: Policy, maOfflineBiMat?: string, cheDo?: "giam-sat" | "chan", mo: MoRong = {}): PolicyWindows {
  const g = gioDiaPhuong(new Date(p.serverTime), p.tz);
  const ngu = !!p.lich?.ngu && trongKhung(g.phut, p.lich.ngu);
  // Máy Mac: app là bundle id / tên .app (không có .exe); không hạ chữ (danh sách hệ thống Mac có chữ hoa, tác tử so không phân biệt). Windows: tệp .exe, chữ thường.
  const mac = mo.nen === "mac";
  const that = (s: string) => !!(mo.appNen ?? mo.appThat)?.has(s.toLowerCase());
  const laApp = mac ? (s: string) => (kieuMuc(s.toLowerCase()) === "app" || that(s)) && !exe(s) : (s: string) => exe(s) || that(s);   // luật luôn chữ thường (chuanMuc); danh sách hệ thống/trình duyệt Mac có chữ hoa — tác tử Mac so không phân biệt hoa-thường
  const chuan = (s: string) => (mac ? s : s.toLowerCase());
  const trinhDuyet = mac ? TRINH_DUYET_MAC : TRINH_DUYET;
  const hoc = p.luat.filter((l) => l.loai === "hoc" && laApp(l.muc)).map((l) => chuan(l.muc));
  const choi = p.phien && laApp(p.phien.muc) && p.luat.some((l) => l.muc.toLowerCase() === p.phien!.muc.toLowerCase() && l.loai === "giai_tri")
    ? [chuan(p.phien.muc)] : [];
  const now = new Date(p.serverTime);
  // Ngoại lệ (05/11) của nhóm máy tính: cả máy / từng app, còn hạn
  const nl = (p.ngoaiLe ?? []).filter((x) => (x.nhom ?? "may_tinh") === "may_tinh" && Date.parse(x.den) > now.getTime());
  const nlCaMay = nl.filter((x) => !x.muc).sort((a, b) => Date.parse(b.den) - Date.parse(a.den))[0];
  const nlApp = [...new Set(nl.filter((x) => x.muc && laApp(x.muc)).map((x) => chuan(x.muc!)))];
  // ngoại lệ một TRANG WEB (giaTri là tên miền): thả trình duyệt lọc được + mở đúng tên miền đó trong chính sách web
  const nlWeb = [...new Set(nl.filter((x) => x.muc && !laApp(x.muc) && kieuMuc(x.muc.toLowerCase()) === "web").map((x) => x.muc!.toLowerCase()))];
  const khoaGoc = p.khoaNgay || ngu;
  const khoa = khoaGoc && !nlCaMay && !nlApp.length && !nlWeb.length;
  const dangMo = !khoaGoc && !!mo.moDen && mo.moDen.getTime() > now.getTime();
  const dangHoc = !!p.quy?.dangHoc;
  // L4: Con ở «Mở hết» ⇒ mode tu_do (agent gỡ AppLocker «chỉ app được phép», không grantEndsAt); app Ba Mẹ «Chặn» (blockedApps) + web luôn chặn vẫn chặn.
  // Giờ học (05/11) thắng «Mở hết»: chỉ app Học. Quỹ vẫn gửi (quyConPhut / appTinhGio) — agent mới tự đóng app Giải trí khi hết quỹ.
  const moHet = !khoaGoc && !dangHoc && p.cheDoChan === "mo_het";
  // Quỹ (05/11): còn phút, không ngủ / khoá / giờ học / giờ máy sai ⇒ thả mọi app Giải trí
  const quyMo = !!p.quy && p.quy.conPhut > 0 && !khoaGoc && !dangHoc && !p.gioMaySai;
  const appGiaiTri = [...new Set(p.luat.filter((l) => l.loai === "giai_tri" && laApp(l.muc)).map((l) => chuan(l.muc)))];
  const appQuy = quyMo ? appGiaiTri : [];   // vào allowedApps
  // «Mở hết» mà quỹ đã hết (06/11, B1): mode vẫn tu_do (app chưa xếp vẫn mở) nhưng app Giải trí phải đóng — gửi chúng trong appTinhGio,
  // quyConPhut = 0 ⇒ agent (Windows QuyTaiCho / Mac QuyGio) đưa chúng vào danh sách chặn của mode tu_do. Trước đây appTinhGio rỗng ⇒ hết giờ vẫn chơi.
  // Đang có cửa sổ mở có hạn / ngoại lệ cả máy / phiên chơi đã trả sao ⇒ không gửi (agent Mac sẽ chặn cả lúc Con đang dùng giờ vừa đổi sao).
  const appTinhGio = quyMo || (moHet && p.quy && !dangMo && !nlCaMay && !p.phien) ? appGiaiTri : [];
  const den = nlCaMay ? new Date(Math.max(Date.parse(nlCaMay.den), dangMo ? mo.moDen!.getTime() : 0)) : dangMo ? mo.moDen! : null;
  const heThong = p.allowlistHeThong.filter(laApp).map(chuan);
  // Chỉ phiên trang web mới thả trình duyệt — phiên app của nền khác (vd .exe lọt sang Mac) không phải web ⇒ không mở trình duyệt
  const phienWeb = p.phien && kieuMuc(p.phien.muc.toLowerCase()) === "web" && p.luat.some((l) => l.muc.toLowerCase() === p.phien!.muc.toLowerCase() && l.loai === "giai_tri");
  return {
    serverTime: p.serverTime, childName: p.con?.ten ?? "",
    mode: nlCaMay ? "tu_do" : khoa ? "khoa" : dangMo || moHet ? "tu_do" : "hoc", locked: khoa,
    lockReason: khoa ? (p.khoaNgay ? "khoa" : "ngu") : null,
    // giờ ngủ / khoá mà chỉ có ngoại lệ từng app ⇒ chỉ app hệ thống + app ngoại lệ (không mở app Học / Giải trí khác)
    allowedApps: khoaGoc && !nlCaMay ? [...new Set([...heThong, ...nlApp, ...(nlWeb.length ? trinhDuyet : [])])]
      : [...new Set([...heThong, ...hoc, ...(dangHoc ? [] : choi), ...(phienWeb && !dangHoc ? trinhDuyet : []), ...appQuy, ...nlApp, ...(nlWeb.length ? trinhDuyet : [])])],
    learningApps: [...new Set(hoc)],
    minutesLeft: null,
    // 05/11: `conThuong` (= quỹ còn) KHÔNG làm nhịp dày cả ngày — chỉ phiên / đang mở / quỹ sắp hết (≤ 10 phút) mới 30–60 giây
    nextCheckSec: nhipToiKhoaLai(Math.min(nhipDongBo({ coPhien: !!p.phien, moDen: den, now }),
      quyMo && p.quy!.conPhut <= 10 ? 60 : Infinity), [p.khoaLaiLuc, p.khoaHetLuc, ...nl.map((x) => x.den)], now),
    canExchangePoints: p.soDu > 0 || (mo.conThuong ?? 0) > 0,
    // 05/11: số sao của Con (= số dư điểm) — màn khoá / nhắc 5 phút của khay «con có 30 sao» (agent-win Policy.Sao)
    ...(p.con ? { sao: p.soDu } : {}),
    ...(den ? { grantEndsAt: den.toISOString() } : {}),
    // Đang «mở» có hạn / còn quỹ ⇒ trang Giải trí mở trong trình duyệt (trang Ba Mẹ CHẶN vẫn chặn) — khớp AppLocker đã thả.
    web: moWebNgoaiLe(chinhSachWebCho(p, { moGiaiTri: !!den || (moHet && (!p.quy || (p.quy.conPhut > 0 && !p.gioMaySai))) || quyMo, moCoHan: !!den, appThat: mo.appThat }), nlWeb, khoaGoc && !nlCaMay),
    ...(p.quy ? { quyConPhut: quyMo ? p.quy.conPhut : 0, quyTongPhut: p.quy.ngayPhut + p.quy.themPhut, quyDaDung: p.quy.daDung, appTinhGio,
      dangGioHoc: dangHoc } : {}),
    gioNgu: p.lich.ngu, gioHoc: p.lich.hoc ?? null,
    ...(nl.length ? { ngoaiLe: nl.map((x) => ({ den: x.den, app: x.muc ? (laApp(x.muc) ? chuan(x.muc) : x.muc.toLowerCase()) : null })) } : {}),
    ...(nl.length && khoaGoc ? { khoaKhiHetNgoaiLe: p.khoaNgay ? "khoa" as const : "ngu" as const } : {}),
    playChoices: [...new Set(p.luat.filter((l) => l.loai === "giai_tri" && (laApp(l.muc) || kieuMuc(l.muc.toLowerCase()) === "web")).map((l) => (laApp(l.muc) ? chuan(l.muc) : l.muc.toLowerCase())))].sort().slice(0, 40),   // 40: đủ mọi mục Giải trí thường gặp (khay cuộn); agent chỉ nhận mục trong danh sách này
    ...(cheDo ? { cheDo } : {}),
    ...(laMoHet(p) ? { moHet: true } : {}),
    ...(maOfflineBiMat ? { maOfflineBiMat } : {}),
    // play* CHỈ cho máy sở hữu phiên (mo.phienTien do api-may đặt khi play_sessions.device_id = máy này) — Con có 2 PC thì PC kia không đếm.
    ...(p.phien && mo.phienTien && (choi.length || phienWeb) ? {
      playSessionId: p.phien.id, playApp: chuan(p.phien.muc), playWeb: !!phienWeb,
      playOfflineMinutes: Math.min(phutToiHetLich(mo.lichPhien ? { ...p, lich: mo.lichPhien } : p),
        phutChoiOffline(p.phien.conPhut, p.soDu, mo.conThuong ?? 0, mo.phienTien.giaPhanNghin, mo.phienTien.noPhanNghin)),
    } : {}),
  };
}
