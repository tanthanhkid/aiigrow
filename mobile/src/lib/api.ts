// Gọi API máy chủ AiiGrow (docs/API.md): app Ba Mẹ /api/m/*, màn Con /api/kid/*. Token phiên giữ trong SecureStore (web: localStorage).
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { xoaTl } from "./thiet-lap";

export const GOC = (process.env.EXPO_PUBLIC_API ?? "http://localhost:3310").replace(/\/$/, "");
/** Trang tải bộ cài cho máy của Con (server/app/tai) — link công khai cố định, Ba Mẹ gõ tay được trên laptop của Con. */
export const LINK_TAI = "https://aiigrow.aiilab.vn/tai";

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
    dat: async (t: string | null) => { token = t; xoaTl(); await (t ? k.ghi(t) : k.xoa()); },
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
      // 401 = hết phiên ⇒ đăng xuất. TRỪ xác thực lại mật khẩu ngay trong app (gỡ từ xa) — đó là mật khẩu sai, không phải hết phiên.
      if (r.status === 401 && token && j.error !== "sai_mat_khau" && !["dang-nhap", "dang-ky", "otp", "quen-mat-khau"].includes(duong)) {
        token = null;
        xoaTl();
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
  phutChoi: number; tranNgay: number; nhiemVuCho: number; yeuCauCho: number; phieuCho?: number; nhiemVuXong: number; homNayConDa: string[];
  /** «≈ X phút chơi»: số dư đổi được bao nhiêu phút trò chơi (máy chủ tính theo giá của nhà); máy chủ cũ không gửi */ phutDoiDuoc?: number };
export type ConNgan = HomNay & { id: string; ten: string; avatar: string; nhom: NhomCon };
export type GiaDinh = { ten: string; quyVoucher: number; choDuyet: number; canhBao: number; con: ConNgan[] };
export type MayCon = { id: string; ten: string; nen: "windows" | "mac" | "ios" | "android"; dungChung: boolean; baoVe: "day_du" | "mot_phan" | "chua";
  lanCuoi: string | null; truc: boolean; lechGiay: number | null;
  /** Quyền bảo vệ còn thiếu + cách khắc phục (server/lib/gia-dinh.ts › chiTietBaoVe); baoVeCau = một câu giải thích. */
  baoVeThieu?: { ma: string; ten: string; cach: string }[]; baoVeCau?: string };
export type Khung = { tu: string; den: string };
export type Lich = { ngayThuong: Khung[]; cuoiTuan: Khung[]; ngu: Khung };
export type ConChiTiet = Omit<HomNay, "phutChoi" | "tranNgay" | "nhiemVuCho" | "yeuCauCho" | "phieuCho" | "nhiemVuXong" | "homNayConDa" | "phutDoiDuoc"> & {
  id: string; ten: string; namSinh: number | null; avatar: string; nhom: NhomCon; khoaNgay: boolean; /** hạn khoá (ISO); null = khoá tới khi Ba Mẹ mở */ khoaDen?: string | null;
  /** Ba Mẹ duyệt thêm giờ lúc đang khoá ⇒ máy mở tạm tới giờ này (ISO) rồi khoá lại; null = không mở tạm */ moTamDen?: string | null; lich: Lich; thamSo: Record<string, number>; may: MayCon[];
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
  /** MỘT nguồn mức bảo vệ với Hồ sơ Con (server/lib/gia-dinh.ts › chiTietBaoVe): trang nào cũng đọc từ đây, không tự tính lại. */
  baoVe: MayCon["baoVe"]; baoVeCau: string; baoVeThieu: { ma: string; ten: string; cach: string }[];
  trangThai: TrangThaiTuanThu; diem: number; vanDe: VanDeTuanThu[]; khoaGiaiTri: boolean; moKhanCapDen: string | null;
  /** Windows: hạn «đang mở» thật (mở khẩn cấp hoặc thêm giờ đã duyệt) — null = không mở. Máy chủ cũ không gửi. */
  moDen?: string | null;
  lenhCho: { id: string; loai: string }[];
  /** Chế độ hiển thị: Ba Mẹ đã chọn (POST may/:id/che-do), không thì chế độ máy báo; null = chưa biết (agent cũ / chưa đồng bộ).
   *  giam-sat = chỉ ghi lại, không chặn · chan = chặn thật. */
  cheDo: CheDoMay | null;
  /** Chế độ agent THẬT SỰ đang chạy (agent báo mỗi lần đồng bộ); null = agent chưa báo (bản cũ chưa hỗ trợ đổi chế độ từ xa). */
  cheDoMay: CheDoMay | null;
  /** Lựa chọn của Ba Mẹ; null = chưa ai chọn (máy giữ chế độ lúc cài). */
  cheDoBaMeChon: CheDoMay | null;
  /** Agent đã từng đồng bộ (đã từng nhận được lệnh) — chưa ⇒ «Gỡ máy này» phải xoá hẳn. */
  daDongBo: boolean;
  /** Lệnh gỡ đang chờ máy nhận (máy chỉ rời danh sách khi agent báo đã gỡ). */
  dangGo: { lenhId: string; tu: string } | null;
  /** Được xoá hẳn khỏi danh sách (chưa đồng bộ lần nào, hoặc đang gỡ > 7 ngày không liên lạc). */
  coTheXoaHan: boolean;
};
export type CheDoMay = "giam-sat" | "chan";
export const TEN_CHE_DO: Record<CheDoMay, string> = { "giam-sat": "Giám sát", chan: "Chặn thật" };
/** POST may/:id/go {matKhau, xoaHan?} */
export type KqGoMay = { trangThai: "dang_go"; id: string; lapLai: boolean; cach: string } | { trangThai: "da_xoa"; canGoTaiMay: boolean };
export type SuKienTuanThu = { loai: string; chi_tiet: Record<string, unknown>; nguoi: string | null; created_at: string };
export type ChiTietTuanThu = TuanThuMay & { suKien: SuKienTuanThu[] };

export const TT_TRANG: Record<TrangThaiTuanThu, { chu: string; loai: LoaiNhan }> = {
  tuan_thu: { chu: "Tuân thủ", loai: "ok" }, lech_chuan: { chu: "Lệch chuẩn", loai: "canh" },
  ngoai_vong: { chu: "Ngoài vòng kiểm soát", loai: "loi" }, tat_may: { chu: "Đang tắt", loai: "xam" }, chua_co_nhip: { chu: "Chưa có phiên chơi", loai: "xam" },
};
type LoaiNhan = "ok" | "canh" | "loi" | "xam" | "lam" | "diem" | "tim";

/** Mã mở offline của một máy (GET may/:id/ma-offline) — Ba Mẹ đọc cho Con gõ khi máy mất mạng. */
export type MaOffline = { ma: string; conGiay: number; hieuLucPhut: number; phutMo: number };

// ---- Web của Con (GET /api/m/con/:id/web) — server/lib/web.ts
export type TrangThaiWeb = "cho_phep" | "chan" | "giai_tri" | "he_thong" | "chua_xep";
export type TrangWeb = { tenMien: string; giay: number; soLan: number; lanCuoi: string | null; trangThai: TrangThaiWeb; nguon: string };
export type ThongKeWeb = {
  soNgay: number;
  homNay: { giay: number; soLan: number; soTrang: number };
  theoNgay: { ngay: string; giay: number; soLan: number; soTrang: number }[];
  tongGiay: number;
  top: TrangWeb[];
  tatCa: number;
  luat: { tenMien: string; trangThai: TrangThaiWeb; nguon: "con" | "gia_dinh" }[];
  cheDoWeb: "mo" | "chi_cho_phep";
  heThong: string[];
  mayLoc: { id: string; ten: string; cheDo: string; lanCuoi: string | null }[];
};
// ---- Thời gian màn hình theo tuần (GET /api/m/con/:id/man-hinh?lui=0) — server/lib/man-hinh.ts
export type MucMH = "hoc" | "game" | "video" | "video_ngan" | "mxh" | "tien_ich" | "khac" | "chua_xep";
export type ManHinhTuan = {
  ten: string; lui: number; dau: string; cuoi: string; homNay: string;
  /** mọi thời lượng bằng GIÂY — đổi sang phút khi hiển thị */
  tongGiay: number; tbNgayGiay: number; tuanTruocGiay: number; tatCa: number;
  theoNgay: { ngay: string; giay: number; theoMuc: Partial<Record<MucMH, number>> }[];
  theoMuc: { muc: MucMH; giay: number; soMuc: number }[];
  ds: { id: string; ten: string; kieu: "app" | "web"; muc: MucMH; giay: number; soLan: number; theoNgay: number[] }[];
};

// ---- Việc nhanh ở Trang chủ (QA 24/10, issue #70): app đã thấy trên máy Con + phiên đang chơi — server/lib/api-m.ts
export type AppThay = { muc: string; ten: string; phut: number; loai: "hoc" | "giai_tri" | "chan" | "chua_xep" };
export type AppChuaXep = { muc: string; ten?: string; phut: number };
export type PhienDang = { id: string; con: string; tenCon: string; may: string | null; muc: string; tenApp: string; tam: boolean; conPhut: number };
