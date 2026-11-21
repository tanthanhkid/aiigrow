// Ghép máy (L8, docs/API.md › «Ghép máy»): một nội dung cho cả Lần đầu và Ghép thêm máy. Giữ kết quả `POST ghep-may` trong bộ nhớ
// (web: sessionStorage) theo Con + «cài giống máy» — quay lại màn Ghép («Gửi lại link») dùng lại đúng mã còn hạn, không đẻ mã mới mỗi lần.
import { bm } from "./api";
import { router } from "expo-router";
import { appsRobChonSan, datTl, layTl, thanThietLap } from "./thiet-lap";

export type KqGhep = {
  ma: string; maHien: string; het: string; hanPhut: number; conGiay: number; lienKet: string; qr: string; tokenGoi: string; hetGoi: string;
  con: string | null; giongMay: string | null; chiaSe: { tieuDe: string; noiDung: string; lienKet: string };
  /** #267: các Con dùng chung máy sắp ghép (≥ 2 = máy chung) — máy chủ cũ không gửi */ conDs?: string[] | null; mayChung?: boolean;
};
export type TrangGhep = { daGhep: boolean; hetHan: boolean; conGiay: number; /** mã 6 số hết 10 phút */ maHetHan?: boolean; /** link cài (48 giờ) còn dùng được */ linkConHan?: boolean; con: string | null; may: { id: string; ten: string; nen: string } | null;
  /** #267: đã ghép ⇒ Con thật nối với máy (iPhone/iPad: bé được chọn lúc quét) */ conDs?: { id: string; ten: string; avatar: string }[] };
/** Tóm tắt thiết lập của một Con (GET con/:id/thiet-lap) — màn «Đã ghép», «Xong rồi», «Cài giống máy trước». */
export type TomTat = { conId: string; ten: string; cheDoChan: "chi_app_duoc_phep" | "mo_het"; gioChoi: { ngayThuong: number | null; cuoiTuan: number | null };
  soApp: number; /** số trang web được vào (thiết kế 14/11 — máy chủ cũ không có) */ soWeb?: number };

const KHOA = "aiigrow.ghep-may";
const kho = () => { try { return globalThis.sessionStorage ?? null; } catch { return null; } };
let nho: Record<string, KqGhep> = (() => { try { return JSON.parse(kho()?.getItem(KHOA) ?? "{}"); } catch { return {}; } })();
const ghi = () => { try { kho()?.setItem(KHOA, JSON.stringify(nho)); } catch { /* chế độ riêng tư */ } };

/** Còn ≥ 60 giây ⇒ dùng lại. `moi` = bắt buộc lấy mã mới (mã đã hết hạn / Ba Mẹ bấm «Lấy mã mới»).
 *  `conDs` ≥ 2 bé ⇒ mã cho MÁY CHUNG (POST ghep-may {conDs} — #267); một bé ⇒ máy riêng như trước. */
export async function layMaGhep(con: string | null, giongMay: string | null, moi = false, conDs: string[] = []): Promise<KqGhep> {
  const chung = conDs.length > 1;
  const k = `${chung ? [...conDs].sort().join(",") : con ?? ""}|${giongMay ?? ""}`;
  const cu = nho[k];
  if (!moi && cu && Date.parse(cu.het) - Date.now() > 60_000) {
    // mã đã dùng (máy đã ghép) hoặc của phiên / gia đình khác (đổi tài khoản trên cùng thẻ) ⇒ lấy mã mới
    const g = await xemGhep(cu.ma).catch(() => null);
    // dùng lại mã còn hạn: số giây còn lại lấy theo máy chủ (đồng hồ máy Ba Mẹ có thể lệch)
    if (g && !g.daGhep && !g.hetHan && g.conGiay > 60) return { ...cu, conGiay: g.conGiay };
  }
  const r = await bm.goi<KqGhep>("ghep-may", { ...(chung ? { conDs } : con ? { con } : {}), ...(giongMay ? { giongMay } : {}) });
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

/** Lưới app gợi ý (GET app-goi-y) + điền sẵn lựa chọn của Grow vào trạng thái Lần đầu nếu Ba Mẹ chưa chọn. */
export async function napAppGoiY(con: string) {
  const r = await bm.goi<{ ds: AppGoiY[] }>(`app-goi-y?con=${encodeURIComponent(con)}`);
  if (!layTl().apps) datTl({ apps: appsRobChonSan(r.ds) ?? [] });
  return r.ds;
}

let dangNap: { con: string; p: Promise<void> } | null = null;
/** 06/11 (B1): nạp chế độ App & web ĐANG CÓ của Con vào trạng thái Lần đầu (mục Ba Mẹ chưa chọn) — một lần mỗi Con.
 *  Đi lại Lần đầu cho Con cũ không được lưu đè mặc định («Theo danh sách») lên cài đặt thật. Lỗi ⇒ ném (lần sau nạp lại). */
export function napCaiDatCon(): Promise<void> {
  const t = layTl();
  if (!t.conId || t.cheDoChan) return Promise.resolve();
  if (dangNap?.con === t.conId) return dangNap.p;
  const con = t.conId;
  const p = tomTat(con).then((x) => {
    const n = layTl();
    if (n.conId !== con) return;
    if (!n.cheDoChan && x.cheDoChan) datTl({ cheDoChan: x.cheDoChan });
  }).catch((e) => { dangNap = null; throw e; });
  dangNap = { con, p };
  return p;
}

/** Gửi toàn bộ lựa chọn Giờ chơi + Chọn app cho Con đang thiết lập (chờ nạp cài đặt thật của Con trước — mọi màn gọi đều an toàn). */
export async function luuThietLap() {
  if (!layTl().conId) throw new Error("Chưa biết thiết lập cho con nào — quay lại bước hồ sơ con.");
  await napCaiDatCon();
  if (!layTl().apps && (layTl().cheDoChan ?? "chi_app_duoc_phep") === "chi_app_duoc_phep") await napAppGoiY(layTl().conId!);
  const tl = layTl();
  await bm.goi("thiet-lap", thanThietLap(tl));
  return tl.conId;
}

/** #508 mục 7: Ghép máy nằm SAU «Con» và TRƯỚC «Một ngày của con». `sau` = đi đâu khi Ghép xong / «Để sau»:
 *  «mau» (mặc định Lần đầu) ⇒ bước Việc · «xong» (chép luật từ bé trước, #420) ⇒ trang Xong rồi · «app» (bấm «Ghép máy» ở bước App) ⇒ quay lại bước App. */
export type SauGhep = "mau" | "xong" | "app";
export const docSau = (x: unknown): SauGhep => (x === "xong" || x === "app" ? x : "mau");
export function diTiepSauGhep(sau: SauGhep, con: string) {
  if (sau === "app") { if (router.canGoBack()) router.dismissTo("/thiet-lap/app"); else router.replace("/thiet-lap/app"); return; }
  router.replace(sau === "xong" ? { pathname: "/thiet-lap/xong", params: { con } } : "/thiet-lap/mau");
}
