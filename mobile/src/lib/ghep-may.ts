// Ghép máy (L8, docs/API.md › «Ghép máy»): một nội dung cho cả Lần đầu và Ghép thêm máy. Giữ kết quả `POST ghep-may` trong bộ nhớ
// (web: sessionStorage) theo Con + «cài giống máy» — quay lại màn Ghép («Gửi lại link») dùng lại đúng mã còn hạn, không đẻ mã mới mỗi lần.
import { bm } from "./api";
import { coMa, datTl, layTl, thanThietLap } from "./thiet-lap";

export type KqGhep = {
  ma: string; maHien: string; het: string; hanPhut: number; conGiay: number; lienKet: string; qr: string; tokenGoi: string; hetGoi: string;
  con: string | null; giongMay: string | null; chiaSe: { tieuDe: string; noiDung: string; lienKet: string };
};
export type TrangGhep = { daGhep: boolean; hetHan: boolean; conGiay: number; /** mã 6 số hết 10 phút */ maHetHan?: boolean; /** link cài (48 giờ) còn dùng được */ linkConHan?: boolean; con: string | null; may: { id: string; ten: string; nen: string } | null };
/** Tóm tắt thiết lập của một Con (GET con/:id/thiet-lap) — màn «Đã ghép», «Xong rồi», «Cài giống máy trước». */
export type TomTat = { conId: string; ten: string; cheDoChan: "chi_app_duoc_phep" | "mo_het"; gioChoi: { ngayThuong: number | null; cuoiTuan: number | null };
  ngu: { tu: string; den: string }; soApp: number };

const KHOA = "aiigrow.ghep-may";
const kho = () => { try { return globalThis.sessionStorage ?? null; } catch { return null; } };
let nho: Record<string, KqGhep> = (() => { try { return JSON.parse(kho()?.getItem(KHOA) ?? "{}"); } catch { return {}; } })();
const ghi = () => { try { kho()?.setItem(KHOA, JSON.stringify(nho)); } catch { /* chế độ riêng tư */ } };

/** Còn ≥ 60 giây ⇒ dùng lại. `moi` = bắt buộc lấy mã mới (mã đã hết hạn / Ba Mẹ bấm «Lấy mã mới»). */
export async function layMaGhep(con: string | null, giongMay: string | null, moi = false): Promise<KqGhep> {
  const k = `${con ?? ""}|${giongMay ?? ""}`;
  const cu = nho[k];
  if (!moi && cu && Date.parse(cu.het) - Date.now() > 60_000) {
    // mã đã dùng (máy đã ghép) hoặc của phiên / gia đình khác (đổi tài khoản trên cùng thẻ) ⇒ lấy mã mới
    const g = await xemGhep(cu.ma).catch(() => null);
    if (g && !g.daGhep && !g.hetHan && g.conGiay > 60) return cu;
  }
  const r = await bm.goi<KqGhep>("ghep-may", { ...(con ? { con } : {}), ...(giongMay ? { giongMay } : {}) });
  nho = { ...nho, [k]: r };
  ghi();
  return r;
}
/** Kết quả đã lấy theo mã (màn Đang chờ mở lại sau F5). */
export const kqTheoMa = (ma: string) => Object.values(nho).find((x) => x.ma === ma) ?? null;
export const xemGhep = (ma: string) => bm.goi<TrangGhep>(`ghep-may/${encodeURIComponent(ma)}`);
export const tomTat = (con: string) => bm.goi<TomTat>(`con/${con}/thiet-lap`);

// ---------------------------------------------------------------- Lần đầu: lưu Giờ chơi + Chọn app một lần (POST thiet-lap)
export type AppGoiY = { ma: string; ten: string; tinhGio: boolean; chon: boolean };
export const QUY_MAC_DINH = 60;
export const NGU_MAC_DINH = { tu: "21:30", den: "06:30" };
/** Chip quỹ giờ chơi: ngày thường ⇒ cuối tuần (+30 phút, thiết kế «30 phút · T7, CN: 60 phút»). */
export const QUY_CHIP = [30, 60, 90] as const;
export const cuoiTuanCua = (p: number) => p + 30;

/** Lưới app gợi ý (GET app-goi-y) + điền sẵn lựa chọn của Rob vào trạng thái Lần đầu nếu Ba Mẹ chưa chọn. */
export async function napAppGoiY(con: string) {
  const r = await bm.goi<{ ds: AppGoiY[] }>(`app-goi-y?con=${encodeURIComponent(con)}`);
  if (!layTl().apps) datTl({ apps: r.ds.filter((a) => a.chon).map((a) => ({ ma: a.ma, ten: a.ten })) });
  return r.ds;
}
export { coMa };

/** Gửi toàn bộ lựa chọn Giờ chơi + Chọn app cho Con đang thiết lập. */
export async function luuThietLap() {
  if (!layTl().conId) throw new Error("Chưa biết thiết lập cho con nào — quay lại bước hồ sơ con.");
  if (!layTl().apps && (layTl().cheDoChan ?? "chi_app_duoc_phep") === "chi_app_duoc_phep") await napAppGoiY(layTl().conId!);
  const tl = layTl();
  await bm.goi("thiet-lap", thanThietLap(tl, { quy: QUY_MAC_DINH, cuoiTuan: cuoiTuanCua, ngu: NGU_MAC_DINH }));
  return tl.conId;
}
