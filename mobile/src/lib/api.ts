// Gọi API máy chủ AiiGrow (docs/API.md): app Ba Mẹ /api/m/*, màn Con /api/kid/*. Token phiên giữ trong SecureStore (web: localStorage).
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { xoaTl } from "./thiet-lap";

export const GOC = (process.env.EXPO_PUBLIC_API ?? "http://localhost:3310").replace(/\/$/, "");
/** Trang tải bộ cài cho máy của Con (server/app/tai) — link công khai cố định, Ba Mẹ gõ tay được trên laptop của Con. */
/** Chuẩn hoá tên giống máy chủ (NFC, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng) — so «có đổi không» trước khi gửi. */
export const chuanHoaTen = (v: string) => v.normalize("NFC").trim().replace(/\s+/g, " ");

const kho = (khoa: string) => ({
  // đọc khoá máy lỗi (mục hỏng, thiếu quyền keychain) ⇒ coi như chưa có token, xoá mục hỏng — không để lời nạp phiên treo màn trắng
  doc: () => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(khoa) ?? null)
    : SecureStore.getItemAsync(khoa).catch(() => { SecureStore.deleteItemAsync(khoa).catch(() => {}); return null; })),
  ghi: (v: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.setItem(khoa, v)) : SecureStore.setItemAsync(khoa, v)),
  xoa: () => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.removeItem(khoa)) : SecureStore.deleteItemAsync(khoa)),
});

export class LoiApi extends Error {
  /** `them`: trường phụ máy chủ trả cạnh {error, message} (S3 06/11: `conLan`, `choGiay`, `khoaDen` của PIN / mã Ba Mẹ). */
  constructor(public ma: string, msg: string, public status: number, public them?: Record<string, unknown>) { super(msg); }
}

function khach(tienTo: "m" | "kid", khoa: string) {
  const k = kho(khoa);
  let token: string | null = null;
  let hetPhien: (() => void) | null = null;
  // GET cùng đường dẫn đang chờ trả lời ⇒ dùng chung một lời gọi (đổi tab: thanh tab và màn cùng hỏi «cho-duyet» một lúc). Chỉ GỘP lời
  // gọi đang bay, không giữ kết quả: gọi sau khi lời trước đã về vẫn đi máy chủ như trước.
  const dangBay = new Map<string, Promise<unknown>>();
  // Dữ liệu cũ hết đúng: đổi phiên (đăng nhập / đăng xuất / hết phiên) hoặc vừa GHI (POST) ⇒ bỏ lời GET đang bay (lời gọi sau đi máy chủ mới)
  // và báo cho bộ nhớ dữ liệu màn (lib/ui › useTai) quên hết.
  const khiDoi = new Set<() => void>();
  const doi = () => { dangBay.clear(); khiDoi.forEach((f) => f()); };
  async function goiThat<T>(duong: string, body?: unknown): Promise<T> {
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
    if (r.status === 401 && token && j.error !== "sai_mat_khau" && !["dang-nhap", "dang-ky", "otp", "quen-mat-khau"].includes(duong) && !duong.startsWith("dang-nhap/") && j.error !== "mxh_sai") {
      token = null;
      xoaTl();
      doi();
      await k.xoa();
      hetPhien?.();
    }
    if (!r.ok) throw new LoiApi(j.error ?? "loi", j.message ?? `Máy chủ AiiGrow đang trục trặc (mã ${r.status}) — thử lại sau ít phút.`, r.status, j);
    return j as T;
  }
  return {
    nap: async () => (token = await k.doc()),
    dat: async (t: string | null) => { token = t; xoaTl(); doi(); await (t ? k.ghi(t) : k.xoa()); },
    /** Đăng ký nghe «dữ liệu cũ hết đúng» (đổi phiên, vừa ghi). */
    khiDoi: (fn: () => void) => { khiDoi.add(fn); },
    co: () => !!token,
    /** Địa chỉ + header cho tài nguyên nhị phân (ảnh) — không đi qua JSON. */
    tep: (duong: string) => ({ uri: `${GOC}/api/${tienTo}/${duong}`, headers: (token ? { authorization: `Bearer ${token}` } : {}) as Record<string, string> }),
    onHetPhien: (fn: () => void) => { hetPhien = fn; },
    goi<T = any>(duong: string, body?: unknown): Promise<T> {
      if (body !== undefined) { doi(); return goiThat<T>(duong, body).finally(doi); }
      const khoa = `${token ?? ""} ${duong}`;
      const p = dangBay.get(khoa);
      if (p) return p as Promise<T>;
      const moi = goiThat<T>(duong).finally(() => dangBay.delete(khoa));
      dangBay.set(khoa, moi);
      return moi;
    },
  };
}

/** Ba Mẹ. */
export const bm = khach("m", "aiig_bm");
/** Màn Con (phiên PIN / token máy riêng). */
export const kid = khach("kid", "aiig_con");

// ------------------------------------------------------------------ kiểu dữ liệu (khớp server/lib/api-*.ts)
export type NhomCon = "nhi" | "teen";
export type HomNay = { soDu: number; diemChoDuyet: number; tongKiem: number; capDo: { cap: number; diemCapSau: number; conThieu: number };
  phutChoi: number; tranNgay: number; nhiemVuCho: number; yeuCauCho: number; phieuCho?: number; nhiemVuXong: number; homNayConDa: string[];
  /** «≈ X phút chơi»: số dư đổi được bao nhiêu phút trò chơi (giá của nhà, không quá phần trần ngày/tuần còn lại); máy chủ cũ không gửi */ phutDoiDuoc?: number;
  /** phút giải trí còn được chơi hôm nay theo trần ngày lẫn tuần (đã cộng thêm giờ); máy chủ cũ không gửi */ conPhut?: number };
export type ConNgan = HomNay & { id: string; ten: string; avatar: string; nhom: NhomCon;
  /** S3 06/11 (docs/API.md «S3»): bé có PIN vào máy · máy mất mạng hôm nay (dòng «Máy mất mạng · Laptop ›») · sao đang giữ chờ trao */
  coPin?: boolean; matMang?: { mayId: string; ten: string; nen: string; tu: string; phut: number }[]; saoGiu?: number }
  /** Sổ sao 15/11 (#263–#266): sao (âm được) · nợ · phút còn = sao tiêu được · hết sao · nợ > 1.000 — máy chủ cũ không gửi (lib/so-sao › saoTu) */
  & Partial<import("./so-sao").SaoCon>;
export type GiaDinh = { ten: string; quyVoucher: number; choDuyet: number; canhBao: number; con: ConNgan[]; /** S3: số trên chuông */ soChuong?: number };
export type MayCon = { id: string; ten: string; nen: "windows" | "mac" | "ios" | "android"; dungChung: boolean; baoVe: "day_du" | "mot_phan" | "chua";
  lanCuoi: string | null; truc: boolean; lechGiay: number | null;
  /** Quyền bảo vệ còn thiếu + cách khắc phục (server/lib/gia-dinh.ts › chiTietBaoVe); baoVeCau = một câu giải thích. */
  baoVeThieu?: { ma: string; ten: string; cach: string }[]; baoVeCau?: string;
  /** S3 06/11: máy im lặng > 10 phút hôm nay (không phải tắt / ngủ) */ matMang?: boolean; /** #657 */ hienThi?: import("./trang-thai-may").HienThiMay;
  /** 14/11 (PR #253): khoá RIÊNG máy này do Ba Mẹ đặt (POST may/:id/khoa) — den null = tới khi Ba Mẹ mở; máy chủ cũ không gửi */ khoaMay?: { khoa: boolean; den: string | null };
  /** #267: Con nối với máy (≥ 2 = máy chung) · số Con · iPhone/iPad chỉ một Con — máy chủ cũ không gửi */
  conDs?: { id: string; ten: string; avatar: string }[]; soCon?: number; motCon?: boolean };
export type Khung = { tu: string; den: string };
export type Lich = { ngayThuong: Khung[]; cuoiTuan: Khung[]; ngu: Khung };
export type ConChiTiet = Omit<HomNay, "phutChoi" | "tranNgay" | "nhiemVuCho" | "yeuCauCho" | "phieuCho" | "nhiemVuXong" | "homNayConDa" | "phutDoiDuoc" | "conPhut"> & {
  id: string; ten: string; namSinh: number | null; avatar: string; nhom: NhomCon; khoaNgay: boolean; /** hạn khoá (ISO); null = khoá tới khi Ba Mẹ mở */ khoaDen?: string | null;
  /** Ba Mẹ duyệt thêm giờ lúc đang khoá ⇒ máy mở tạm tới giờ này (ISO) rồi khoá lại; null = không mở tạm */ moTamDen?: string | null; lich: Lich; thamSo: Record<string, number>; may: MayCon[];
};
export type NhiemVu = { id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; kieu: string; toi_da_ngay: number | null;
  toi_da_tuan: number | null; phut_toi_thieu: number; tu_duyet: boolean; giao_cho: string | null; han: string | null; bat: boolean };
export type LuotCho = { id: string; child_id: string; ten_con: string; ten: string; nhom: string; diem: number; nop_luc: string; ghi_chu: string | null; nghi_trung: boolean; so_anh: number };
/** Lời xin của Con. 15/11 (#263/#265): `vay_sao` = xin Ba Mẹ cho vay `phut` sao (`muc_dich` choi | qua — qua ⇒ `gia_tri` = id quà); them_gio / ngoai_le /
 *  ngoai_gio (máy cũ) nay cũng là lời xin vay `phut` sao để chơi. */
export type YeuCau = { id: string; child_id: string; ten_con: string; loai: "vay_sao" | "them_gio" | "mo_web" | "cai_app" | "ngoai_le" | "ngoai_gio" | "khac";
  phut: number | null; gia_tri: string | null; ly_do: string; created_at: string; het_han: string; muc_dich?: "choi" | "qua" | null;
  /** #425: tên app Con chọn trong lưới («Paint») khi gia_tri là định danh («microsoft.mspaint») — máy chủ cũ không gửi */ ten_app?: string | null };
/** Tên hiển thị của mục Con xin: tên app máy chủ gửi, thiếu thì mã thô (gia_tri). */
export const tenYc = (y: { gia_tri: string | null; ten_app?: string | null }) => y.ten_app || y.gia_tri;
export type Qua = { id: string; ten: string; loai: "voucher" | "qua" | "dac_quyen" | "tiet_kiem"; diem: number; menh_gia: number | null; ton_kho: number | null;
  toi_da_thang: number | null; chi_cuoi_tuan: boolean; bat: boolean };
export type CanhBao = { id: string; child_id: string | null; loai: string; muc: "thong_tin" | "chu_y" | "nghiem_trong"; noi_dung: string;
  chi_tiet: Record<string, unknown>; da_doc: boolean; created_at: string;
  /** #657: máy chủ tính — chưa đọc, ≤ 7 ngày, không thuộc loại chỉ để biết (MỘT nguồn số «cần sửa») · loại chỉ để biết (không nút «Sửa») */ canSua?: boolean; chiBiet?: boolean };
export type Diem = { delta: number; loai: string; ly_do: string; nguoi: string | null; /** tên Ba Mẹ (máy chủ cũ không gửi) */ ten_nguoi?: string | null; created_at: string };

/** Lời xin vay sao (mới + loại cũ máy chưa cập nhật). */
export const laXinVay = (y: Pick<YeuCau, "loai">) => y.loai === "vay_sao" || y.loai === "them_gio" || y.loai === "ngoai_le" || y.loai === "ngoai_gio";

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
  /** MỘT nguồn mức bảo vệ với Hồ sơ Con (server/lib/gia-dinh.ts › chiTietBaoVe): trang nào cũng đọc từ đây, không tự tính lại.
   *  Máy chủ cũ không gửi ⇒ undefined: coi là «chưa biết», không báo «chưa đủ» và không đọc baoVeThieu. */
  /** #657: trạng thái hiển thị DUY NHẤT của máy (máy chủ tính) + cờ «cần sửa» + máy mất mạng hôm nay */ hienThi?: import("./trang-thai-may").HienThiMay; canSua?: boolean; matMang?: boolean;
  baoVe?: MayCon["baoVe"]; baoVeCau?: string; baoVeThieu?: { ma: string; ten: string; cach: string }[];
  trangThai: TrangThaiTuanThu; diem: number; vanDe: VanDeTuanThu[]; khoaGiaiTri: boolean; moKhanCapDen: string | null;
  /** Windows: hạn «đang mở» thật (mở khẩn cấp hoặc thêm giờ đã duyệt) — null = không mở. Máy chủ cũ không gửi. */
  moDen?: string | null;
  /** Máy tự kiểm được mã mở offline (server/lib/ma-offline.ts › NEN_MA_OFFLINE). Máy chủ cũ không gửi ⇒ chỉ Windows. */
  coMaOffline?: boolean;
  lenhCho: { id: string; loai: string }[];
  /** Chế độ hiển thị: Ba Mẹ đã chọn (POST may/:id/che-do), không thì chế độ máy báo; null = chưa biết (agent cũ / chưa đồng bộ).
   *  giam-sat = chỉ ghi lại · chan = áp danh sách App & web. */
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
  /** #267 (docs/API.md): khoá theo máy · Con nối với máy (≥ 2 = máy chung, 0 = chờ Ba Mẹ gán) · bé đang dùng (máy riêng = Con của máy) ·
   *  số Con · iPhone/iPad chỉ một Con · Ba Mẹ đang dùng máy tới. Máy chủ cũ không gửi ⇒ suy từ con / dungChung (lib/may-nhieu-con). */
  khoaMay?: { khoa: boolean; den: string | null }; conDs?: { id: string; ten: string; avatar: string }[];
  dangDung?: { id: string; ten: string; avatar: string; tu?: string | null } | null; soCon?: number; motCon?: boolean; baMeDungDen?: string | null;
};
export type CheDoMay = "giam-sat" | "chan";
/** Màu icon máy — MỘT quy tắc cho Trang chủ và danh sách máy: ngoài vòng ⇒ đỏ; lệch chuẩn hoặc bảo vệ chưa đủ ⇒ cam; còn lại xanh. */
export const mauMay = (m: TuanThuMay): "do" | "cam" | "xanh" =>
  (m.trangThai === "ngoai_vong" ? "do" : m.trangThai === "lech_chuan" || m.baoVe === "mot_phan" ? "cam" : "xanh");
/** POST may/:id/go {matKhau, xoaHan?} */
export type KqGoMay = { trangThai: "dang_go"; id: string; lapLai: boolean; cach: string } | { trangThai: "da_xoa"; canGoTaiMay: boolean };
export type SuKienTuanThu = { loai: string; chi_tiet: Record<string, unknown>; nguoi: string | null; created_at: string };
/** `GET may/:id/tuan-thu`: #267 thêm `tungCon` (Con đã gán, cùng dạng `GET may/:id/con › ds`). */
export type ChiTietTuanThu = TuanThuMay & { suKien: SuKienTuanThu[]; tungCon?: import("./may-nhieu-con").ConCuaMay[] };
/** Máy có «Mã mở khi mất mạng»: theo cờ máy chủ (tuan-thu.ts › coMaOffline); máy chủ cũ không gửi ⇒ chỉ Windows. */
export const coMaOff = (m: Pick<TuanThuMay, "coMaOffline" | "nen">) => m.coMaOffline ?? m.nen === "windows";

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
export type AppChuaXep = { muc: string; ten?: string; phut: number };
export type PhienDang = { id: string; con: string; tenCon: string; may: string | null; muc: string; tenApp: string; tam: boolean; conPhut: number };

/** Tài khoản Ba/Mẹ đang ở quyền «Chỉ xem»? (máy chủ trả 403 chi_xem cho mọi POST) — lỗi mạng ⇒ coi như không, máy chủ vẫn chặn. */
export const laChiXem = () => vaiToi().then((v) => v === "xem", () => false);
/** Vai của Ba/Mẹ đang đăng nhập (chu | duyet | xem) — MỘT chỗ đọc `toi` cho mọi màn cần quyền. */
export const vaiToi = () => bm.goi<{ baMe: { vai: string } }>("toi").then((t) => t.baMe.vai);

/** Tên nhiệm vụ tối thiểu (ký tự thật, sau trim) — PHẢI bằng server/lib/nhiem-vu.ts › TEN_NV_TOI_THIEU. */
export const TEN_NV_TOI_THIEU = 3;
