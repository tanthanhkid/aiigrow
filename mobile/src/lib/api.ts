// Gọi API máy chủ AiiGrow (docs/API.md): app Ba Mẹ /api/m/*, màn Con /api/kid/*. Token phiên giữ trong SecureStore (web: localStorage).
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const GOC = (process.env.EXPO_PUBLIC_API ?? "http://localhost:3310").replace(/\/$/, "");

const kho = (khoa: string) => ({
  doc: () => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(khoa) ?? null) : SecureStore.getItemAsync(khoa)),
  ghi: (v: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.setItem(khoa, v)) : SecureStore.setItemAsync(khoa, v)),
  xoa: () => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.removeItem(khoa)) : SecureStore.deleteItemAsync(khoa)),
});

export class LoiApi extends Error {
  constructor(public ma: string, msg: string, public status: number) { super(msg); }
}

function khach(tienTo: "m" | "kid", khoa: string) {
  const k = kho(khoa);
  let token: string | null = null;
  let hetPhien: (() => void) | null = null;
  return {
    nap: async () => (token = await k.doc()),
    dat: async (t: string | null) => { token = t; await (t ? k.ghi(t) : k.xoa()); },
    co: () => !!token,
    onHetPhien: (fn: () => void) => { hetPhien = fn; },
    async goi<T = any>(duong: string, body?: unknown): Promise<T> {
      let r: Response;
      try {
        r = await fetch(`${GOC}/api/${tienTo}/${duong}`, {
          method: body === undefined ? "GET" : "POST",
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw new LoiApi("mat_mang", "Mất kết nối mạng — kiểm tra Wi‑Fi hoặc 4G rồi thử lại.", 0);
      }
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 && token && !["dang-nhap", "dang-ky", "otp", "quen-mat-khau"].includes(duong)) {
        token = null;
        await k.xoa();
        hetPhien?.();
      }
      if (!r.ok) throw new LoiApi(j.error ?? "loi", j.message ?? `Máy chủ AiiGrow đang trục trặc (mã ${r.status}) — thử lại sau ít phút.`, r.status);
      return j as T;
    },
  };
}

/** Ba Mẹ. */
export const bm = khach("m", "aiig_bm");
/** Màn Con (phiên PIN / token máy riêng). */
export const kid = khach("kid", "aiig_con");
export const goi = bm.goi;

// ------------------------------------------------------------------ kiểu dữ liệu (khớp server/lib/api-*.ts)
export type NhomCon = "nhi" | "teen";
export type HomNay = { soDu: number; diemChoDuyet: number; tongKiem: number; capDo: { cap: number; diemCapSau: number; conThieu: number };
  phutChoi: number; tranNgay: number; nhiemVuCho: number; yeuCauCho: number; nhiemVuXong: number; homNayConDa: string[] };
export type ConNgan = HomNay & { id: string; ten: string; avatar: string; nhom: NhomCon };
export type GiaDinh = { ten: string; quyVoucher: number; choDuyet: number; canhBao: number; con: ConNgan[] };
export type MayCon = { id: string; ten: string; nen: "windows" | "mac" | "ios" | "android"; dungChung: boolean; baoVe: "day_du" | "mot_phan" | "chua";
  lanCuoi: string | null; truc: boolean; lechGiay: number | null };
export type Khung = { tu: string; den: string };
export type Lich = { ngayThuong: Khung[]; cuoiTuan: Khung[]; ngu: Khung };
export type ConChiTiet = Omit<HomNay, "phutChoi" | "tranNgay" | "nhiemVuCho" | "yeuCauCho" | "nhiemVuXong" | "homNayConDa"> & {
  id: string; ten: string; namSinh: number | null; avatar: string; nhom: NhomCon; khoaNgay: boolean; lich: Lich; thamSo: Record<string, number>; may: MayCon[];
};
export type NhiemVu = { id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; kieu: string; toi_da_ngay: number | null;
  toi_da_tuan: number | null; phut_toi_thieu: number; tu_duyet: boolean; giao_cho: string | null; han: string | null; bat: boolean };
export type LuotCho = { id: string; child_id: string; ten_con: string; ten: string; nhom: string; diem: number; nop_luc: string; ghi_chu: string | null; nghi_trung: boolean; so_anh: number };
export type YeuCau = { id: string; child_id: string; ten_con: string; loai: "them_gio" | "mo_web" | "cai_app" | "ngoai_le" | "ngoai_gio" | "khac";
  phut: number | null; gia_tri: string | null; ly_do: string; created_at: string; het_han: string };
export type Qua = { id: string; ten: string; loai: "voucher" | "qua" | "dac_quyen" | "tiet_kiem"; diem: number; menh_gia: number | null; ton_kho: number | null;
  toi_da_thang: number | null; chi_cuoi_tuan: boolean; bat: boolean };
export type CanhBao = { id: string; child_id: string | null; loai: string; muc: "thong_tin" | "chu_y" | "nghiem_trong"; noi_dung: string;
  chi_tiet: Record<string, unknown>; da_doc: boolean; created_at: string };
export type Diem = { delta: number; loai: string; ly_do: string; nguoi: string | null; created_at: string };

export const LOAI_YC: Record<YeuCau["loai"], string> = {
  them_gio: "Thêm giờ", mo_web: "Mở web", cai_app: "Cài app", ngoai_le: "Ngoại lệ", ngoai_gio: "Ngoài giờ", khac: "Khác",
};
export const tieuYc = (y: Pick<YeuCau, "loai" | "phut" | "gia_tri">) =>
  y.loai === "them_gio" ? `Xin thêm ${y.phut} phút` : y.loai === "mo_web" ? `Xin mở ${y.gia_tri}` : y.loai === "cai_app" ? `Xin cài ${y.gia_tri}`
    : y.loai === "ngoai_le" ? `Xin chơi ${y.phut} phút dù chưa đủ điểm` : y.loai === "ngoai_gio" ? `Xin chơi ngoài giờ ${y.phut} phút` : y.gia_tri ?? "Yêu cầu khác";

export const NHOM_NV: Record<string, { chu: string; ic: "sach" | "chen" | "mu" | "chay" | "sao" | "tia"; mau: "xanh" | "lam" | "tim" | "cam" | "vang" }> = {
  doc_sach: { chu: "Đọc sách", ic: "sach", mau: "xanh" }, viec_nha: { chu: "Việc nhà", ic: "chen", mau: "lam" }, hoc_tap: { chu: "Học tập", ic: "mu", mau: "tim" },
  van_dong: { chu: "Vận động", ic: "chay", mau: "cam" }, ky_nang: { chu: "Kỹ năng", ic: "sao", mau: "vang" }, khac: { chu: "Khác", ic: "tia", mau: "xanh" },
};

// ------------------------------------------------------------------ An toàn thiết bị (tuân thủ + mở khẩn cấp + gỡ từ xa) — /api/m (docs/API.md)
export type TrangThaiTuanThu = "tuan_thu" | "lech_chuan" | "ngoai_vong" | "tat_may" | "chua_co_nhip";
export type VanDeTuanThu = { loai: "gio_sai" | "app_tat" | "admin_la" | "khong_toi_may_chu" | "ngoai_vong"; tru: number; cauBaMe: string; cauCon: string; chiTiet?: Record<string, unknown> };
/** Một máy trong danh sách tuân thủ (GET tuan-thu). */
export type TuanThuMay = {
  id: string; ten: string; nen: MayCon["nen"]; con: string | null; dungChung: boolean; lanCuoi: string | null;
  phienBan: string | null; adminTinCay: string[];
  trangThai: TrangThaiTuanThu; diem: number; vanDe: VanDeTuanThu[]; khoaGiaiTri: boolean; moKhanCapDen: string | null;
  lenhCho: { id: string; loai: string }[];
};
export type SuKienTuanThu = { loai: string; chi_tiet: Record<string, unknown>; nguoi: string | null; created_at: string };
export type ChiTietTuanThu = TuanThuMay & { suKien: SuKienTuanThu[] };

export const TT_TRANG: Record<TrangThaiTuanThu, { chu: string; loai: LoaiNhan }> = {
  tuan_thu: { chu: "Tuân thủ", loai: "ok" }, lech_chuan: { chu: "Lệch chuẩn", loai: "canh" },
  ngoai_vong: { chu: "Ngoài vòng kiểm soát", loai: "loi" }, tat_may: { chu: "Đang tắt", loai: "xam" }, chua_co_nhip: { chu: "Chưa có nhịp", loai: "xam" },
};
type LoaiNhan = "ok" | "canh" | "loi" | "xam" | "lam" | "diem" | "tim";
