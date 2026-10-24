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
// Agent mặc định chạy chế độ GIÁM SÁT (chỉ ghi log việc sẽ làm) — xem agent-win/README.md. `cheDo` = lựa chọn của Ba Mẹ trên app (devices.che_do).
import { gioDiaPhuong, laCuoiTuan, phutCua, trongKhung } from "./gio.ts";
import type { Policy } from "./may-con.ts";
import { nhipToiKhoaLai } from "./cau-hinh.ts";
import { chinhSachWebCho, type ChinhSachWeb } from "./web.ts";

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
};

const exe = (s: string) => s.toLowerCase().endsWith(".exe");

/** Trình duyệt cho chạy khi có phiên chơi cho một WEBSITE (tên miền không phải .exe). CHỈ trình duyệt agent lọc được theo tên miền
 *  (chính sách Chrome/Edge/Brave — lib/web.ts, agent-win WebGuard): mở Firefox/Opera sẽ lọt mọi trang bị chặn trong lúc chơi. */
export const TRINH_DUYET = ["chrome.exe", "msedge.exe", "brave.exe"];

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
export type MoRong = { moDen?: Date | null; conThuong?: number; phienTien?: { giaPhanNghin: number; noPhanNghin: number }; lichPhien?: Policy["lich"] };

/** Phút được chơi tiếp khi mất mạng (BRD 6.7) — tính như máy chủ tính ở nhịp: phút thưởng (thêm giờ) dùng trước, không trừ điểm;
 *  rồi tới số phút mua được bằng số dư sau khi trả phần lẻ đang nợ; không vượt phút còn lại của phiên. Giá 0 ⇒ chỉ giới hạn bởi phiên. */
export function phutChoiOffline(conPhut: number, soDu: number, conThuong: number, giaPhanNghin: number, noPhanNghin = 0): number {
  const muaDuoc = giaPhanNghin > 0 ? Math.max(0, Math.floor((soDu * 1000 - Math.max(0, noPhanNghin)) / giaPhanNghin)) : Infinity;
  return Math.max(0, Math.min(Math.max(0, conPhut), muaDuoc + Math.max(0, Math.floor(conThuong))));
}

/** Phút còn lại tới khi PHẢI dừng theo lịch lúc `p.serverTime`: hết khung giờ chơi đang ở trong (ngoài khung ⇒ 0), và không quá giờ ngủ
 *  (đang trong giờ ngủ ⇒ 0). Agent mất mạng không tự xét lịch cho phiên đã mở nên ngưỡng offline phải chứa sẵn mốc này. */
export function phutToiHetLich(p: Pick<Policy, "lich" | "tz" | "serverTime">): number {
  const g = gioDiaPhuong(new Date(p.serverTime), p.tz);
  const k = (laCuoiTuan(g.thu) ? p.lich.cuoiTuan : p.lich.ngayThuong).find((x) => trongKhung(g.phut, x));   // như phien.ts › conTrongKhung
  const khung = k ? ((phutCua(k.den) - g.phut + 1440) % 1440) || 1440 : 0;
  if (!p.lich?.ngu) return khung;
  if (trongKhung(g.phut, p.lich.ngu)) return 0;
  return Math.min(khung, ((phutCua(p.lich.ngu.tu) - g.phut + 1440) % 1440) || 1440);
}

export function chinhSachWindows(p: Policy, maOfflineBiMat?: string, cheDo?: "giam-sat" | "chan", mo: MoRong = {}): PolicyWindows {
  const g = gioDiaPhuong(new Date(p.serverTime), p.tz);
  const ngu = !!p.lich?.ngu && trongKhung(g.phut, p.lich.ngu);
  const hoc = p.luat.filter((l) => l.loai === "hoc" && exe(l.muc)).map((l) => l.muc.toLowerCase());
  const choi = p.phien && exe(p.phien.muc) && p.luat.some((l) => l.muc.toLowerCase() === p.phien!.muc.toLowerCase() && l.loai === "giai_tri")
    ? [p.phien.muc.toLowerCase()] : [];
  const khoa = p.khoaNgay || ngu;
  const now = new Date(p.serverTime);
  const dangMo = !khoa && !!mo.moDen && mo.moDen.getTime() > now.getTime();
  const phienWeb = p.phien && !exe(p.phien.muc) && p.luat.some((l) => l.muc.toLowerCase() === p.phien!.muc.toLowerCase() && l.loai === "giai_tri");
  return {
    serverTime: p.serverTime, childName: p.con?.ten ?? "",
    mode: khoa ? "khoa" : dangMo ? "tu_do" : "hoc", locked: khoa, lockReason: p.khoaNgay ? "khoa" : ngu ? "ngu" : null,
    allowedApps: [...new Set([...p.allowlistHeThong.filter(exe).map((x) => x.toLowerCase()), ...hoc, ...choi, ...(phienWeb ? TRINH_DUYET : [])])],
    learningApps: [...new Set(hoc)],
    minutesLeft: null,
    nextCheckSec: nhipToiKhoaLai(nhipDongBo({ coPhien: !!p.phien, moDen: dangMo ? mo.moDen : null, now, conThuong: mo.conThuong }), p.khoaLaiLuc ?? null, now),
    canExchangePoints: p.soDu > 0 || (mo.conThuong ?? 0) > 0,
    ...(dangMo ? { grantEndsAt: mo.moDen!.toISOString() } : {}),
    // Đang «mở» có hạn ⇒ trang Giải trí cũng mở trong trình duyệt (trang Ba Mẹ CHẶN vẫn chặn) — khớp AppLocker đã thả.
    web: chinhSachWebCho(p, { moGiaiTri: dangMo }),
    ...(cheDo ? { cheDo } : {}),
    ...(maOfflineBiMat ? { maOfflineBiMat } : {}),
    // play* CHỈ cho máy sở hữu phiên (mo.phienTien do api-may đặt khi play_sessions.device_id = máy này) — Con có 2 PC thì PC kia không đếm.
    ...(p.phien && mo.phienTien && (choi.length || phienWeb) ? {
      playSessionId: p.phien.id, playApp: p.phien.muc.toLowerCase(), playWeb: !!phienWeb,
      playOfflineMinutes: Math.min(phutToiHetLich(mo.lichPhien ? { ...p, lich: mo.lichPhien } : p),
        phutChoiOffline(p.phien.conPhut, p.soDu, mo.conThuong ?? 0, mo.phienTien.giaPhanNghin, mo.phienTien.noPhanNghin)),
    } : {}),
  };
}
