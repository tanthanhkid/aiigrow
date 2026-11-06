// Trang tải bộ cài /tai (thiết kế bm1-web-* + L8 «link bộ cài mang sẵn mã gia đình»): đọc `?g=<token gói cài>&ma=<mã 6 số>` từ link
// «Ghép máy» (lib/ghep-may.ts › lienKet) và chọn MỘT nút tải đúng máy đang mở trang. Thuần (không I/O) để test được.
import { mayQuaCu, tenMayCu, type HeDieuHanh } from "./he-dieu-hanh.ts";
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
  /** màn đang xem: chinh = nút tải đúng máy · cu = «Máy quá cũ» · dang-tai = «Đang tải» · dung = «Tải bị dừng» */
  man: ManTai;
  /** tên máy cũ cho màn «Máy quá cũ» (chỉ có khi man = cu) */
  tenCu: string;
  /** Ba Mẹ tự chọn hệ khác (?os=) thay vì máy đang mở */
  chon: boolean;
};
export type ManTai = "chinh" | "cu" | "dang-tai" | "dung";
const NEN_HOP_LE: readonly NenTai[] = ["windows", "mac", "android", "ios"];

const mot = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function thamSoTai(q: Record<string, string | string[] | undefined>, os: HeDieuHanh, ua = ""): ThamSoTai {
  const g = chuanToken(mot(q.g));
  const ma = mot(q.ma).replace(/\D/g, "");
  // ?os= = Ba Mẹ chọn hệ khác («Không phải Windows? Mac · Android · iPhone»); không hợp lệ ⇒ theo máy đang mở
  const chonOs = NEN_HOP_LE.find((x) => x === mot(q.os));
  const nen: NenTai = chonOs ?? (os === "khac" ? "windows" : os);
  // máy cũ chỉ báo khi tự nhận (không chọn tay) và là máy tính; ?cu=1 chạy thử màn «Máy quá cũ»
  const cu = !chonOs && (mot(q.cu) === "1" || ((nen === "windows" || nen === "mac") && mayQuaCu(ua)));
  const tt = mot(q.tt);
  const man: ManTai = cu ? "cu" : tt === "dang-tai" || tt === "dung" ? tt : "chinh";
  return { g, ma: ma.length === 6 ? ma : "", nen, moApp: nen === "ios" && g ? lienKetApp(g) : null, man, tenCu: cu ? tenMayCu(ua) : "", chon: !!chonOs };
}

/** «482017» ⇒ ["4","8","2","0","1","7"] — ô mã to trên trang. */
export const oMa = (ma: string) => (ma.length === 6 ? ma.split("") : []);

/** Gói ghép nhúng tên tệp bộ cài Windows — khớp agent-win `EnrollmentPackage.Encode` / `EnrollmentReader.FromFileName`:
 *  base64url(JSON {server, token}) ⇒ tệp `AiiGrow-Setup.enroll-<gói>.exe`; bộ cài (SetupForm, W2) đọc tên tệp ⇒ bước Ghép tự ghép (`ghep-goi`). */
export const goiGhep = (server: string, token: string) =>
  Buffer.from(JSON.stringify({ server: server.replace(/\/+$/, ""), token })).toString("base64url");
export const tenTepWindows = (goi: string) => `AiiGrow-Setup.enroll-${goi}.exe`;
/** Đường tải bộ cài Windows mang gói ghép (route app/tai/ghep/[g]). */
export const linkTaiWindowsGhep = (g: string) => `/tai/ghep/${encodeURIComponent(g)}`;
