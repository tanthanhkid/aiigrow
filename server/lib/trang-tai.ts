// Trang tải bộ cài /tai (thiết kế bm1-web-* + L8 «link bộ cài mang sẵn mã gia đình»): đọc `?g=<token gói cài>&ma=<mã 6 số>` từ link
// «Ghép máy» (lib/ghep-may.ts › lienKet) và chọn MỘT nút tải đúng máy đang mở trang. Thuần (không I/O) để test được.
import type { HeDieuHanh } from "./he-dieu-hanh.ts";
import { chuanToken, lienKetApp } from "./ios-link.ts";

export type NenTai = "windows" | "mac" | "android" | "ios";
export type ThamSoTai = {
  /** token gói cài (48 giờ) — bộ cài / app Con dùng để tự ghép (POST /api/device/ghep-goi); rỗng = mở trang không qua link ghép */
  g: string;
  /** mã 6 số dự phòng (10 phút) — hiện to ở bước 3; rỗng ⇒ hướng dẫn lấy mã trong app Ba Mẹ */
  ma: string;
  /** máy đang mở trang; «khac» ⇒ Windows (bộ cài phổ biến nhất) */
  nen: NenTai;
  /** iPhone/iPad có token ⇒ mở thẳng app AiiGrow Con để tự ghép */
  moApp: string | null;
};

const mot = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function thamSoTai(q: Record<string, string | string[] | undefined>, os: HeDieuHanh): ThamSoTai {
  const g = chuanToken(mot(q.g));
  const ma = mot(q.ma).replace(/\D/g, "");
  const nen: NenTai = os === "khac" ? "windows" : os;
  return { g, ma: ma.length === 6 ? ma : "", nen, moApp: nen === "ios" && g ? lienKetApp(g) : null };
}

/** «482017» ⇒ ["4","8","2","0","1","7"] — ô mã to trên trang. */
export const oMa = (ma: string) => (ma.length === 6 ? ma.split("") : []);
