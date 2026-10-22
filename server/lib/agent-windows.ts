// Policy cho agent Windows (agent-win, lớp thực thi chép từ AiiControl): máy chủ dịch Policy AiiGrow (taoPolicy) sang đúng hình dạng
// agent đọc (Policy của AiiGrow.Core: mode / locked / allowedApps / learningApps…) — mọi quyết định nằm ở máy chủ, agent chỉ thực thi.
//   • Bình thường: mode «hoc» = chỉ app trong danh sách được phép chạy (Allowlist hệ thống + app Học tập Ba Mẹ đã xếp).
//   • App Giải trí chỉ vào danh sách khi đang có phiên chơi bằng điểm cho đúng app đó (máy chủ mở/đóng phiên theo điểm, khung giờ).
//   • «Khoá ngay» của Ba Mẹ, hoặc đang trong giờ ngủ ⇒ mode «khoa».
//   • «Mở» có hạn (Ba Mẹ mở khẩn cấp, hoặc duyệt «thêm giờ» cho lời xin từ máy này): mode «tu_do» + grantEndsAt tới hạn ⇒ agent GỠ AppLocker
//     «Chỉ app học» ở lần đồng bộ kế, khay hiện đồng hồ «đang được bố mẹ thêm giờ». Khoá ngay / giờ ngủ vẫn thắng. Hết hạn ⇒ máy chủ trả lại «hoc».
//   • nextCheckSec ngắn lại khi đang có phiên / đang mở (và đúng lúc hết hạn mở) để thay đổi của Ba Mẹ tới máy Con trong ≤ 30 giây.
//   • minutesLeft để trống: hết phiên chơi thì máy chủ đóng phiên, lần đồng bộ sau app giải trí rời danh sách (không khoá cả máy).
// Agent mặc định chạy chế độ GIÁM SÁT (chỉ ghi log việc sẽ làm) — xem agent-win/README.md. `cheDo` = lựa chọn của Ba Mẹ trên app (devices.che_do).
import { gioDiaPhuong, trongKhung } from "./gio.ts";
import type { Policy } from "./may-con.ts";

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
};

const exe = (s: string) => s.toLowerCase().endsWith(".exe");

/** Trình duyệt: cho chạy khi có phiên chơi cho một WEBSITE (tên miền không phải .exe) — agent chưa lọc theo tên miền nên phải mở cả trình duyệt. */
export const TRINH_DUYET = ["chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe"];

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

export type MoRong = { moDen?: Date | null; conThuong?: number };

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
    nextCheckSec: nhipDongBo({ coPhien: !!p.phien, moDen: dangMo ? mo.moDen : null, now, conThuong: mo.conThuong }),
    canExchangePoints: p.soDu > 0 || (mo.conThuong ?? 0) > 0,
    ...(dangMo ? { grantEndsAt: mo.moDen!.toISOString() } : {}),
    ...(cheDo ? { cheDo } : {}),
    ...(maOfflineBiMat ? { maOfflineBiMat } : {}),
  };
}
