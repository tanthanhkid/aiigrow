// Client màn Con: /api/kid/* (phiên Con, dùng `kid` của api.ts) + vài lệnh thiết bị /api/device/* (ghép máy, chọn tên trên máy dùng chung).
// 05/11 (thiết kế chốt): «sao» thay «điểm» (số vẫn là cột diem), không PIN. 15/11 (#262–#267): 1 sao = 1 phút «Tính phút», vay sao (số dư âm),
// bỏ quỹ ngày / đổi sao lấy giờ / ngoại lệ / giờ ngủ; «Mở hết» / «Theo danh sách» (GET kid/sao, POST kid/xin-vay, kid/toi › cheDo).
// Hàng chờ nộp bằng chứng khi mất mạng: ảnh nằm trên máy, tự gửi lại khi có mạng (con-cho-duyet «mất mạng»).
import { cauLoiMa } from "./cau-loi-ma";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { GOC, LoiApi, kid } from "./api";
import { saoTuMayChu, type SaoCon, type SaoMayChu } from "./con-diu";
import type { GioiHanTre } from "./gioi-han";

export { kid };

const KHOA_MAY = "aiig_may";
// đọc khoá máy lỗi ⇒ coi như trống + xoá mục hỏng (không treo màn trắng lúc nạp phiên)
const docKho = (k: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null)
  : SecureStore.getItemAsync(k).catch(() => { SecureStore.deleteItemAsync(k).catch(() => {}); return null; }));
const ghiKho = (k: string, v: string | null) =>
  Platform.OS === "web" ? Promise.resolve(v === null ? globalThis.localStorage?.removeItem(k) : globalThis.localStorage?.setItem(k, v))
    : v === null ? SecureStore.deleteItemAsync(k) : SecureStore.setItemAsync(k, v);

let tokenMay: string | null = null;
export const may = {
  nap: async () => (tokenMay = await docKho(KHOA_MAY)),
  dat: async (t: string | null) => { tokenMay = t; await ghiKho(KHOA_MAY, t); },
  co: () => !!tokenMay,
  async goi<T = any>(duong: string, body: unknown = {}): Promise<T> {
    let r: Response;
    try {
      r = await fetch(`${GOC}/api/device/${duong}`, {
        method: "POST", body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...(tokenMay ? { authorization: `Bearer ${tokenMay}` } : {}) },
      });
    } catch {
      throw new LoiApi("mat_mang", "Mất kết nối mạng — kiểm tra Wi‑Fi rồi thử lại nhé.", 0);
    }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && j.error === "token_sai") await may.dat(null);
    if (!r.ok) throw new LoiApi(j.error ?? "loi", j.message ?? cauLoiMa(r.status, true), r.status, j);
    return j as T;
  },
};

/** Nền tảng để ghép máy: app native theo hệ điều hành; web đoán theo trình duyệt (laptop Windows / Mac, máy tính bảng). */
export function nenMay(): "windows" | "mac" | "ios" | "android" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  const ua = String(globalThis.navigator?.userAgent ?? "");
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad/i.test(ua)) return "ios";
  if (/mac os/i.test(ua)) return "mac";
  return "windows";
}

/** Máy dùng chung (S3 06/11, `GET|POST /api/device/ho-so`): bé trên máy, ai đang dùng, Ba Mẹ đang dùng tới lúc nào. */
export type HoSoBe = { id: string; ten: string; avatar: string; coPin?: boolean; khoaDen?: string; choGiay?: number; /** #267: số dư (âm khi nợ) */ sao?: number };
export type HoSoMay = { con: HoSoBe[]; mayRieng?: boolean; /** #267 */ mayChung?: boolean; tenMay?: string; soCon?: number; motCon?: boolean; dangDung?: { id: string; ten: string } | null; baMeDung?: { den: string; tu?: string | null } | null;
  pinSaiToiDa?: number; pinChoGiay?: number };

// ------------------------------------------------------------------ kiểu dữ liệu (khớp server/lib/api-con.ts + choi-tre.ts)
export type NhomTre = "nhi" | "teen";
/** #262: chế độ app & web của Con (máy chủ cũ không có ⇒ undefined = Theo danh sách). */
export type CheDo = "mo_het" | "theo_danh_sach";
export type ToiTre = { con: { id: string; ten: string; nhom: NhomTre; avatar: string; daChao: boolean }; soDu: number; diemChoDuyet: number; cheDo?: CheDo;
  loiKhen: { id: string; noi_dung: string; phan_hoi: string | null; created_at: string }[] };
export type NhaTre = { soDu: number; diemChoDuyet: number; tongKiem: number; capDo: { cap: number; diemCapSau: number; conThieu: number }; chuoiNgay: number;
  mucTieu: { id: string; ten: string; diem: number; conThieu: number } | null; nhiemVuMo: number; canBoSung: { id: string; ten: string; luot: string | null }[];
  phutChoi: number; tranNgay: number; conPhut: number; khung: { dang: boolean; den: string | null; moLai: string | null; moMai: boolean };
  nghiDen: string | null; phien: { id: string; muc: string; conPhut: number } | null; phienToiDa: number; nghiGiua: number };
export type NvTre = { id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; kieu: string; toi_da_ngay: number | null;
  toi_da_tuan: number | null; phut_toi_thieu: number; trang_thai_con: "san_sang" | "dang_lam" | "can_bo_sung" | "du_hom_nay" | "du_tuan" | "da_xong";
  luot_dang: string | null; hom_nay: number; dang_cho: number;
  /** #433 B12: lượt hôm nay Ba Mẹ từ chối (lý do) — null khi không có / con đã nộp lượt mới. Máy chủ cũ không gửi. */
  tu_choi?: { ly_do: string | null; luc: string } | null };
export type LuotTre = { id: string; trang_thai: string; diem: number | null; ly_do: string | null; loi_khen: string | null; nop_luc: string | null; ten: string };
export type QuaTre = { id: string; ten: string; loai: "voucher" | "qua" | "dac_quyen" | "tiet_kiem" | "phut"; diem: number; menh_gia: number | null; chi_cuoi_tuan: boolean;
  toi_da_thang: number | null; du: boolean; conThieu: number };
export type ViQua = { daTrao?: QuaDaTrao[]; voucher: { ma: string; menh_gia: number; trang_thai: string; het_han: string; dung_luc: string | null }[];
  phieu: { id: string; ten: string; loai: string; diem: number; trang_thai: string; created_at: string }[] };
export type YcTre = { id: string; loai: "vay_sao" | "them_gio" | "mo_web" | "cai_app" | "ngoai_le" | "ngoai_gio" | "khac"; phut: number | null; gia_tri: string | null;
  ly_do: string; trang_thai: string; created_at: string; xu_ly_luc?: string | null; ly_do_tu_choi?: string | null; het_han: string; pham_vi?: "ca_may" | "app" | null;
  /** 15/11: lời xin vay (`so_sao` / `soSao`), kết quả lời xin app / web (#258) — máy chủ cũ không có */
  so_sao?: number | null; soSao?: number | null; muc_dich?: string | null; ketQua?: KetQuaYc; nhom?: "tinh_phut" | "khong_tinh_phut" | null; loiNhan?: string | null;
  tenNguoiDuyet?: string | null; moTam?: { den: string; phut: number } | null };
export type KetQuaYc = "cho" | "da_them" | "mo_tam" | "chua_them" | "het_han" | "huy";
/** Quỹ giờ chơi hôm nay (server/lib/quy-gio.ts › quyHomNay) — mọi app Giải trí Ba Mẹ cho phép dùng chung; app Học không tính. */
export type QuyTre = { ngay: string; cuoiTuan: boolean; quyNgayPhut: number; themPhut: number; doiSaoPhut: number; daDung: number; conPhut: number; tongPhut: number;
  khoa: boolean; tyLe: { sao: number; phut: number }; doiSao: { bat: boolean; toiDaNgay: number; conDoiDuoc: number }; choXinThem: boolean };
/** GET /api/kid/quy */
export type QuyCon = { quy: QuyTre; sao: number; phutDoiDuoc: number; ngoaiLe: { id: string; den: string; muc: string | null; nhom: string }[];
  yeuCauCho: { id: string; loai: string; phut: number | null; gia_tri: string | null; pham_vi: string | null; ly_do: string; created_at: string }[] };
/** Nhà của Con kèm quỹ (05/11: `nha` trả thêm `quy`, `sao`). App bản cũ của máy chủ không có ⇒ undefined. */
/** #302: `gioiHan` — giới hạn ngày + mỗi lượt (máy chủ cũ không có) ⇒ «Còn X phút hôm nay» / «Đang nghỉ tới HH:MM». */
export type NhaTreSao = NhaTre & { quy?: QuyTre; sao?: number; gioiHan?: GioiHanTre | null };
/** Sổ sao của Con (15/11): MỘT lần GET kid/sao (máy chủ mới có cả `phutChoiHomNay`, `lichSu`, `appHomNay`). Máy chủ cũ: chưa có kid/sao (404)
 *  hoặc kid/sao thiếu `phutChoiHomNay` ⇒ thêm kid/quy để biết sao / «hôm nay chơi N phút» / Ba Mẹ khoá. */
export async function taiSao(): Promise<SaoCon> {
  const s = await kid.goi<SaoMayChu>("sao").catch((e) => { if (e instanceof LoiApi && e.status === 404) return null; throw e; });
  const q = !s || s.phutChoiHomNay === undefined ? await kid.goi<QuyCon>("quy").catch((e) => { if (!s) throw e; return null; }) : null;
  return saoTuMayChu(s, q);
}

/** Ba Mẹ có đang khoá máy không (kid/quy › quy.khoa). */
export const taiKhoa = () => kid.goi<QuyCon>("quy").then((r) => !!r.quy?.khoa);

/** Chế độ app & web của Con (kid/toi › cheDo — #262). Lỗi / máy chủ cũ ⇒ null (= Theo danh sách). */
export const taiCheDo = () => kid.goi<ToiTre>("toi").then((r) => r.cheDo ?? null).catch(() => null);

/** «Xin Ba Mẹ mở» app / web ngoài danh sách (= xin thêm vào danh sách) ⇒ POST kid/xin-duyet. `kieu` (#422 «Xin thêm app / web»: thẻ «App trên
 *  máy» / «Trang web», máy chủ PR #429) ⇒ máy chủ xếp đúng loại — tên app trần («Minecraft») vẫn là app, thẻ web phải là tên miền (sai ⇒ 400
 *  `web_sai` kèm câu hướng dẫn, màn hiện qua cauLoi). Máy chủ cũ bỏ qua `kieu` và xếp tên trần thành web (trả `loai: "mo_web"`) ⇒ huỷ lời xin
 *  nhầm đó rồi gửi yeu-cau cai_app như trước. Không có `kieu` (màn chặn, lời xin cũ): mã app thật / web ⇒ xin-duyet; tên app gõ tay ⇒ yeu-cau
 *  cai_app. Lỗi `bam_don` (bấm dồn vài giây) ném ra cho màn gọi xử lý. Máy chủ cũ còn trả 409 `web_cam` ⇒ ném lại LoiApi cùng mã với câu thân
 *  thiện «Ba Mẹ chưa thêm X lúc này…». */
export async function guiXinMo(b: { loai: "mo_web" | "cai_app" | "khac"; muc: string; ten?: string; lyDo?: string; kieu?: "app" | "web" }): Promise<{ id: string }> {
  const muc = b.muc.trim();
  const theoYeuCau = () => kid.goi<{ id: string }>("yeu-cau", { loai: b.loai, giaTri: b.ten ?? muc, lyDo: b.lyDo ?? "" });
  try {
    if (b.kieu) {
      const r = await kid.goi<{ id: string; loai?: string; daCo?: boolean }>("xin-duyet", { muc, ten: b.ten ?? muc, lyDo: b.lyDo ?? "", kieu: b.kieu });
      if (b.kieu !== "app" || r.loai !== "mo_web") return r;
      // máy chủ cũ (chưa hiểu `kieu`): tên app trần thành lời xin web ⇒ huỷ (trừ lời xin web có từ trước) rồi xin app kiểu cũ
      if (!r.daCo) await kid.goi(`yeu-cau/${r.id}/huy`, {}).catch(() => {});
      return await theoYeuCau();
    }
    if (b.loai === "mo_web" || (b.loai === "cai_app" && laMaApp(muc))) return await kid.goi<{ id: string }>("xin-duyet", { muc, ten: b.ten ?? muc, lyDo: b.lyDo ?? "" });
    return await theoYeuCau();
  } catch (e) {
    if (e instanceof LoiApi && e.ma === "web_cam") throw new LoiApi(e.ma, `Ba Mẹ chưa thêm ${b.ten ?? muc} lúc này. Con xin lại sau được nhé`, e.status, e.them);
    throw e;
  }
}

/** «Xin Ba Mẹ cho vay sao» (POST kid/xin-vay). Máy chủ cũ (404) ⇒ lời xin «thêm giờ» cũ cùng số (Ba Mẹ đồng ý = cho vay ở máy chủ mới). */
export async function xinVay(b: { soSao: number; mucDich?: "choi" | "qua"; quaId?: string; loiNhan?: string }): Promise<{ id: string }> {
  try {
    return await kid.goi<{ id: string }>("xin-vay", b);
  } catch (e) {
    if (!(e instanceof LoiApi) || e.status !== 404) throw e;
    return kid.goi<{ id: string }>("yeu-cau", { loai: "them_gio", phut: b.soSao, lyDo: b.loiNhan ?? "" });
  }
}
/** Quà đã Ba Mẹ trao (GET vi-qua › daTrao). */
export type QuaDaTrao = { id: string; ten: string; loai: string; diem: number; xu_ly_luc: string };
/** Việc của Con, trường mới 05/11 (GET nhiem-vu?tuCham=1). */
export type NvTreSao = NvTre & { sao?: number; lam_lai?: boolean; loi_nhan?: string | null; ly_do?: string | null; tu_cham?: boolean; hinh?: string | null };
export type TroChoi = { muc: string; ten: string; nhom: string; giaPhut: number };
export type ThanhTich = { chuoiNgay: number; soDu: number; tongKiem: number; capDo: { cap: number; diemCapSau: number; conThieu: number };
  huyHieu: { ma: string; ten: string; mo_ta: string; dat: boolean; datLuc: string | null }[] };

/** Tên trò chơi đẹp từ định danh (#691: lib/ten-muc.ts — com.mojang.minecraftpe → Minecraft, msedge.exe → Microsoft Edge). */
export { tenMuc } from "./ten-muc";

// ------------------------------------------------------------------ hàng chờ nộp bằng chứng khi mất mạng
export type AnhNop = { mime: string; base64: string };
type ViecCho = { luot: string; anh: AnhNop[]; ghiChu?: string; ghiAm?: AnhNop };
const KHOA_HANG = "aiig_tre_hang";
let hang: ViecCho[] | null = null;
const napHang = () => {
  if (hang) return hang;
  try { hang = Platform.OS === "web" ? JSON.parse(globalThis.localStorage?.getItem(KHOA_HANG) ?? "[]") : []; } catch { hang = []; }
  return hang!;
};
const luuHang = () => { if (Platform.OS === "web") try { globalThis.localStorage?.setItem(KHOA_HANG, JSON.stringify(hang ?? [])); } catch { /* đầy bộ nhớ: giữ trong RAM */ } };

/** Định danh trông như app thật (tệp .exe/.app, gói / bundle a.b.c) ⇒ xin-duyet hiểu là app; tên trần («Minecraft») máy chủ hiểu là tên miền. */
// khớp server/lib/chinh-sach.ts › kieuMuc (BUNDLE + .exe/.app) — lệch thì máy chủ xếp nhầm lời xin thành web
export const laMaApp = (muc: string) => /\.(exe|app)$/i.test(muc) || /^(com|vn|org|net|io|me|tv|uk|de|jp|us|co|app|dev)\.[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i.test(muc);

/** Nộp bài (05/11): ảnh / ghi âm (audio/*, ≤ 2 MB) / viết kể lại / bấm «Xong» (không kèm gì). Mất mạng ⇒ xếp hàng như ảnh. */
export async function nopBai(luot: string, b: { anh?: AnhNop[]; ghiChu?: string; ghiAm?: AnhNop }): Promise<{ trang_thai: string; daXepHang?: boolean }> {
  const anh = b.anh ?? [];
  try {
    return await kid.goi<{ trang_thai: string }>(`luot/${luot}/nop`, { anh, ghiChu: b.ghiChu, ...(b.ghiAm ? { ghiAm: b.ghiAm } : {}) });
  } catch (e) {
    if (!(e instanceof LoiApi) || e.ma !== "mat_mang") throw e;
    const h = napHang().filter((x) => x.luot !== luot);
    h.push({ luot, anh, ghiChu: b.ghiChu, ...(b.ghiAm ? { ghiAm: b.ghiAm } : {}) });
    hang = h;
    luuHang();
    return { trang_thai: "cho_gui", daXepHang: true };
  }
}

export const soViecCho = () => napHang().length;

/** Gửi lại hàng chờ. → số việc còn chờ. Việc máy chủ từ chối (đã nộp, hết hạn…) thì bỏ khỏi hàng — không gửi mãi. */
export async function guiHangCho(): Promise<number> {
  const h = napHang();
  for (const v of [...h]) {
    try {
      await kid.goi(`luot/${v.luot}/nop`, { anh: v.anh, ghiChu: v.ghiChu, ...(v.ghiAm ? { ghiAm: v.ghiAm } : {}) });
    } catch (e) {
      // mất mạng / hết phiên Con / máy chủ trục trặc ⇒ giữ bài, lần sau gửi tiếp; lỗi nghiệp vụ (đã nộp, hết hạn…) mới bỏ khỏi hàng
      if (e instanceof LoiApi && (e.ma === "mat_mang" || e.status === 401)) break;
      if (e instanceof LoiApi && e.status >= 500) continue;     // máy chủ trục trặc: giữ bài này, thử bài sau (không chặn cả hàng)
    }
    hang = napHang().filter((x) => x !== v);
    luuHang();
  }
  return napHang().length;
}

// ------------------------------------------------------------------ lời khen đã xem (màn ăn mừng chỉ hiện một lần)
const KHOA_DA_XEM = "aiig_tre_da_xem";
export function daXem(id: string) {
  try {
    if (Platform.OS !== "web") return daXemRam.has(id);
    return (JSON.parse(globalThis.localStorage?.getItem(KHOA_DA_XEM) ?? "[]") as string[]).includes(id);
  } catch { return false; }
}
const daXemRam = new Set<string>();
export function ghiDaXem(id: string) {
  daXemRam.add(id);
  if (Platform.OS !== "web") return;
  try {
    const ds = (JSON.parse(globalThis.localStorage?.getItem(KHOA_DA_XEM) ?? "[]") as string[]).filter((x) => x !== id).slice(-60);
    globalThis.localStorage?.setItem(KHOA_DA_XEM, JSON.stringify([...ds, id]));
  } catch { /* bỏ qua */ }
}
