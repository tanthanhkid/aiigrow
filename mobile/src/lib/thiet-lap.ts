// Trạng thái trình hướng dẫn 5 bước (BRD 6.1) giữa các màn: Con vừa tạo, loại thiết bị đã chọn.
// Web: giữ trong sessionStorage — F5 / mở lại tab ở bước Ghép không làm mất Con (trước đây mã ghép ra «máy dùng chung», lịch bỏ im lặng).
type TL = { conId?: string; tenCon?: string; nhom?: "nhi" | "teen"; nen?: "windows" | "mac" | "ios" | "android";
  /** Lần đầu (thiết kế 05/11): năm sinh + màu hồ sơ, các Con đã lưu trong lượt này, lựa chọn màn Giờ chơi / Chọn app (gửi một lần POST thiet-lap). */
  namSinh?: number | null; mau?: number; daLuu?: { id: string; ten: string; mau?: number; namSinh?: number | null; /** avatar máy chủ («mau-N|anh:…») — để mở lại màn thấy ảnh đã lưu */ avatar?: string }[];
  cheDoChan?: "chi_app_duoc_phep" | "mo_het";
  /** 15/11 (bm1-ob-gio): sao tặng khởi đầu 0 / 20 / 30 / 60 Ba Mẹ chọn ở bước «Chơi bằng sao» — Con tạo ở bước tên với 0 sao, gửi kèm thiet-lap cuối mới tặng (một lần). */
  saoKhoiDau?: number;
  apps?: AppChon[];
  /** Thiết kế 14/11 «Web cho <Con>» (them-3xbscpzm): tên miền Ba Mẹ chọn; `tinhGio` = trang giải trí (vàng «Tính giờ»). */
  webs?: WebChon[] };
export type WebChon = { muc: string; tinhGio: boolean };
/** Một app Ba Mẹ cho Con dùng: app trong lưới (`ma`) hoặc «Thêm app khác» theo tên. */
export type AppChon = { ma: string; ten: string } | { ten: string; tinhGio: boolean };
const KHOA = "aiigrow.thiet-lap";
const kho = () => { try { return globalThis.sessionStorage ?? null; } catch { return null; } };
let tl: TL = (() => { try { return JSON.parse(kho()?.getItem(KHOA) ?? "{}") as TL; } catch { return {}; } })();
export const datTl = (x: TL) => {
  tl = { ...tl, ...x };
  try { kho()?.setItem(KHOA, JSON.stringify(tl)); } catch { /* chế độ riêng tư: chỉ giữ trong bộ nhớ */ }
};
export const layTl = () => tl;
/** Đổi phiên Ba Mẹ (đăng nhập/đăng xuất/hết phiên) ⇒ bỏ trạng thái cũ: không nhắm vào Con của gia đình khác. */
export const xoaTl = () => { tl = {}; try { kho()?.removeItem(KHOA); } catch { /* bỏ qua */ } };

/** `tinhGio` (lưu trong trạng thái Lần đầu) ⇒ nhóm danh sách: Tính phút / Không tính phút. */
export const nhomCua = (tinhGio: boolean) => (tinhGio ? "tinh_phut" : "khong_tinh_phut");
/** App trong lưới (có `ma`) hay app thêm theo tên. */
export const coMa = (a: AppChon): a is { ma: string; ten: string } => "ma" in a;

/** Thân POST thiet-lap (Lần đầu) — hàm thuần. 06/11 (B1): chế độ App & web CHỈ gửi khi Ba Mẹ đã chọn / màn đã nạp chế độ thật của Con;
 *  trước đây thiếu thì gửi «chi_app_duoc_phep» ⇒ đi lại Lần đầu cho Con đang «Mở hết» là lặng lẽ đổi về «Theo danh sách» (máy Con khoá lại).
 *  Con mới tạo đã có «chi_app_duoc_phep» sẵn ở máy chủ (gia-dinh.ts › taoCon) nên bỏ trống vẫn đúng mặc định.
 *  15/11 (#264 #258): bỏ quỹ giờ chơi mỗi ngày, giờ ngủ — không gửi `gioChoi`, `ngu` nữa (máy chủ bỏ qua); `saoKhoiDau` chỉ gửi khi Ba Mẹ đã qua bước «Chơi bằng sao». */
export function thanThietLap(t: TL) {
  return {
    con: { id: t.conId, ten: t.tenCon },
    ...(t.saoKhoiDau !== undefined ? { saoKhoiDau: t.saoKhoiDau } : {}),
    // 15/11 (#262): chế độ mới `cheDo` theo_danh_sach | mo_het (mã nội bộ cũ «chi_app_duoc_phep» = Theo danh sách); mỗi app / web một `nhom`
    ...(t.cheDoChan ? { cheDo: t.cheDoChan === "mo_het" ? "mo_het" : "theo_danh_sach" } : {}),
    ...(t.apps ? { apps: t.apps.map((a) => (coMa(a) ? { ma: a.ma } : { ten: a.ten, tinhGio: a.tinhGio, nhom: nhomCua(a.tinhGio) })) } : {}),
    ...(t.webs ? { web: t.webs.map((w) => ({ muc: w.muc, tinhGio: w.tinhGio, nhom: nhomCua(w.tinhGio) })) } : {}),
  };
}

/** Con mới tạo từ «Thêm con» (không qua bước Chọn app): áp sẵn các app Grow gợi ý hợp tuổi (`chon`) — như màn Chọn app của Lần đầu khi Ba Mẹ không đổi gì.
 *  Không có app nào được chọn thì trả undefined (không gửi `apps`, máy chủ giữ mặc định). */
export function appsRobChonSan(ds: { ma: string; ten: string; chon: boolean }[]): AppChon[] | undefined {
  const r = ds.filter((a) => a.chon).map((a) => ({ ma: a.ma, ten: a.ten }));
  return r.length ? r : undefined;
}
