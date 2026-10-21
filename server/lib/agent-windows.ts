// Policy cho agent Windows (agent-win, lớp thực thi chép từ AiiControl): máy chủ dịch Policy AiiGrow (taoPolicy) sang đúng hình dạng
// agent đọc (Policy của AiiGrow.Core: mode / locked / allowedApps / learningApps…) — mọi quyết định nằm ở máy chủ, agent chỉ thực thi.
//   • Bình thường: mode «hoc» = chỉ app trong danh sách được phép chạy (Allowlist hệ thống + app Học tập Ba Mẹ đã xếp).
//   • App Giải trí chỉ vào danh sách khi đang có phiên chơi bằng điểm cho đúng app đó (máy chủ mở/đóng phiên theo điểm, khung giờ).
//   • «Khoá ngay» của Ba Mẹ, hoặc đang trong giờ ngủ ⇒ mode «khoa».
//   • minutesLeft để trống: hết phiên chơi thì máy chủ đóng phiên, lần đồng bộ sau app giải trí rời danh sách (không khoá cả máy).
// Agent mặc định chạy chế độ GIÁM SÁT (chỉ ghi log việc sẽ làm) — xem agent-win/README.md.
import { gioDiaPhuong, trongKhung } from "./gio.ts";
import type { Policy } from "./may-con.ts";

export type PolicyWindows = {
  serverTime: string; childName: string; mode: "hoc" | "khoa"; locked: boolean; lockReason: string | null;
  allowedApps: string[]; learningApps: string[]; minutesLeft: null; nextCheckSec: number; canExchangePoints: boolean;
  /** Bí mật mã mở offline (lib/ma-offline.ts) — agent lưu khi còn mạng để tự kiểm mã Ba Mẹ đọc lúc mất mạng. */
  maOfflineBiMat?: string;
};

const exe = (s: string) => s.toLowerCase().endsWith(".exe");

export function chinhSachWindows(p: Policy, maOfflineBiMat?: string): PolicyWindows {
  const g = gioDiaPhuong(new Date(p.serverTime), p.tz);
  const ngu = !!p.lich?.ngu && trongKhung(g.phut, p.lich.ngu);
  const hoc = p.luat.filter((l) => l.loai === "hoc" && exe(l.muc)).map((l) => l.muc.toLowerCase());
  const choi = p.phien && exe(p.phien.muc) && p.luat.some((l) => l.muc.toLowerCase() === p.phien!.muc.toLowerCase() && l.loai === "giai_tri")
    ? [p.phien.muc.toLowerCase()] : [];
  const khoa = p.khoaNgay || ngu;
  return {
    serverTime: p.serverTime, childName: p.con?.ten ?? "",
    mode: khoa ? "khoa" : "hoc", locked: khoa, lockReason: p.khoaNgay ? "khoa" : ngu ? "ngu" : null,
    allowedApps: [...new Set([...p.allowlistHeThong.filter(exe).map((x) => x.toLowerCase()), ...hoc, ...choi])],
    learningApps: [...new Set(hoc)],
    minutesLeft: null, nextCheckSec: p.nextCheckSec, canExchangePoints: p.soDu > 0,
    ...(maOfflineBiMat ? { maOfflineBiMat } : {}),
  };
}
