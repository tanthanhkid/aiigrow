// Client màn Con: /api/kid/* (phiên PIN của Con, dùng `kid` của api.ts) + vài lệnh thiết bị /api/device/* (ghép máy, chọn hồ sơ, PIN).
// Hàng chờ nộp bằng chứng khi mất mạng: ảnh nằm trên máy, tự gửi lại khi có mạng (con-cho-duyet «mất mạng»).
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { GOC, LoiApi, kid } from "./api";

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
    if (!r.ok) throw new LoiApi(j.error ?? "loi", j.message ?? `Máy chủ AiiGrow đang trục trặc (mã ${r.status}) — thử lại sau ít phút.`, r.status);
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

// ------------------------------------------------------------------ kiểu dữ liệu (khớp server/lib/api-con.ts + choi-tre.ts)
export type NhomTre = "nhi" | "teen";
export type ToiTre = { con: { id: string; ten: string; nhom: NhomTre; avatar: string; daChao: boolean }; soDu: number; diemChoDuyet: number;
  loiKhen: { id: string; noi_dung: string; phan_hoi: string | null; created_at: string }[] };
export type NhaTre = { soDu: number; diemChoDuyet: number; tongKiem: number; capDo: { cap: number; diemCapSau: number; conThieu: number }; chuoiNgay: number;
  mucTieu: { id: string; ten: string; diem: number; conThieu: number } | null; nhiemVuMo: number; canBoSung: { id: string; ten: string; luot: string | null }[];
  phutChoi: number; tranNgay: number; conPhut: number; khung: { dang: boolean; den: string | null; moLai: string | null; moMai: boolean }; gioNgu: boolean;
  nghiDen: string | null; phien: { id: string; muc: string; conPhut: number } | null; phienToiDa: number; nghiGiua: number };
export type NvTre = { id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; kieu: string; toi_da_ngay: number | null;
  toi_da_tuan: number | null; phut_toi_thieu: number; trang_thai_con: "san_sang" | "dang_lam" | "can_bo_sung" | "du_hom_nay" | "du_tuan" | "da_xong";
  luot_dang: string | null; hom_nay: number; dang_cho: number };
export type LuotTre = { id: string; trang_thai: string; diem: number | null; ly_do: string | null; loi_khen: string | null; nop_luc: string | null; ten: string };
export type QuaTre = { id: string; ten: string; loai: "voucher" | "qua" | "dac_quyen" | "tiet_kiem"; diem: number; menh_gia: number | null; chi_cuoi_tuan: boolean;
  toi_da_thang: number | null; du: boolean; conThieu: number };
export type ViQua = { voucher: { ma: string; menh_gia: number; trang_thai: string; het_han: string; dung_luc: string | null }[];
  phieu: { id: string; ten: string; loai: string; diem: number; trang_thai: string; created_at: string }[] };
export type YcTre = { id: string; loai: "them_gio" | "mo_web" | "cai_app" | "ngoai_le" | "ngoai_gio" | "khac"; phut: number | null; gia_tri: string | null;
  ly_do: string; trang_thai: string; created_at: string; xu_ly_luc?: string | null; ly_do_tu_choi?: string | null; het_han: string };
export type TroChoi = { muc: string; ten: string; nhom: string; giaPhut: number };
export type XetChoi = { duoc: boolean; lyDo?: string; cau: string | null; phutToiDa?: number; giaPhanNghin?: number; soDu?: number; nghiDen?: string };
export type NhipChoi = { trangThai: "chay" | "tam" | "ket_thuc"; phutDung: number; conPhut: number; diemTru: number; soDu: number; canhBao: 5 | 1 | null;
  lyDoKet?: string; nghiDen?: string; muc: string; toiDaPhut: number; giaPhanNghin: number };
export type QuyTac = { lich: { ngayThuong: { tu: string; den: string }[]; cuoiTuan: { tu: string; den: string }[]; ngu: { tu: string; den: string } };
  tranNgay: number; tranTuan: number; phienToiDa: number; nghiGiua: number; giaPhut: Record<"game" | "video_ngan" | "mxh" | "phim_gd", number>;
  nhiemVu: { ten: string; diem: number }[]; qua: { ten: string; diem: number }[] };
export type ThanhTich = { chuoiNgay: number; soDu: number; tongKiem: number; capDo: { cap: number; diemCapSau: number; conThieu: number };
  huyHieu: { ma: string; ten: string; mo_ta: string; dat: boolean; datLuc: string | null }[] };

/** Tên trò chơi đẹp từ định danh (roblox.exe → Roblox, com.mojang.minecraftpe → Minecraft). */
export function tenMuc(muc: string, ten?: string) {
  if (ten && ten !== muc) return ten;
  const m = muc.toLowerCase();
  const goc = m.endsWith(".exe") ? m.slice(0, -4) : m.includes("://") ? m : m.split(".").length > 2 && !/\.(com|vn|org|net|edu)$/.test(m) ? m.split(".").pop()! : m;
  return goc.charAt(0).toUpperCase() + goc.slice(1);
}

// ------------------------------------------------------------------ hàng chờ nộp bằng chứng khi mất mạng
export type AnhNop = { mime: string; base64: string };
type ViecCho = { luot: string; anh: AnhNop[]; ghiChu?: string };
const KHOA_HANG = "aiig_tre_hang";
let hang: ViecCho[] | null = null;
const napHang = () => {
  if (hang) return hang;
  try { hang = Platform.OS === "web" ? JSON.parse(globalThis.localStorage?.getItem(KHOA_HANG) ?? "[]") : []; } catch { hang = []; }
  return hang!;
};
const luuHang = () => { if (Platform.OS === "web") try { globalThis.localStorage?.setItem(KHOA_HANG, JSON.stringify(hang ?? [])); } catch { /* đầy bộ nhớ: giữ trong RAM */ } };

/** Nộp bằng chứng; mất mạng ⇒ xếp hàng chờ trên máy (trả `daXepHang`), tự gửi khi có mạng. */
export async function nopBangChung(luot: string, anh: AnhNop[], ghiChu?: string): Promise<{ trang_thai: string; daXepHang?: boolean }> {
  try {
    return await kid.goi<{ trang_thai: string }>(`luot/${luot}/nop`, { anh, ghiChu });
  } catch (e) {
    if (!(e instanceof LoiApi) || e.ma !== "mat_mang") throw e;
    const h = napHang().filter((x) => x.luot !== luot);
    h.push({ luot, anh, ghiChu });
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
      await kid.goi(`luot/${v.luot}/nop`, { anh: v.anh, ghiChu: v.ghiChu });
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "mat_mang") break;
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
