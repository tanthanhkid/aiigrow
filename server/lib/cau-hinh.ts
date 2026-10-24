// Tham số nghiệp vụ (BRD mục 10): mặc định hệ thống + phạm vi cho phép. Ba Mẹ ghi đè cho gia đình (families.cau_hinh) hoặc từng Con
// (children.cau_hinh); giá trị ngoài phạm vi bị KẸP về min–max, không báo lỗi lặng lẽ ở chỗ khác. Giá điểm/phút lưu phần nghìn.
import type { Khung } from "./gio.ts";
import { heThong } from "./he-thong.ts";

type So = { md: number; min: number; max: number };
const s = (md: number, min: number, max: number): So => ({ md, min, max });

export const THAM_SO = {
  diem_chao_mung: s(10, 0, 50),
  nv_het_han_gio: s(72, 24, 168),          // nhiệm vụ chờ duyệt quá hạn ⇒ hết hạn (hoặc tự duyệt nếu bật)
  nv_tu_duyet_qua_han: s(0, 0, 1),         // 0 = tắt (mặc định), 1 = tự duyệt khi quá hạn
  nv_nhac_gio: s(24, 1, 72),
  aiirob_diem: s(20, 1, 100),
  aiirob_nguong: s(80, 50, 100),
  gia_game: s(1000, 500, 5000),            // phần nghìn điểm / phút
  gia_video_ngan: s(2000, 500, 5000),
  gia_mxh: s(2000, 500, 5000),
  gia_phim_gd: s(500, 0, 5000),
  gia_khac: s(1000, 500, 5000),
  phien_toi_da: s(30, 10, 120),
  nghi_giua: s(60, 0, 240),
  tu_dong_dong: s(3, 1, 10),
  voucher_xac_nhan_tu: s(100_000, 0, 100_000_000),
  voucher_han_ngay: s(60, 30, 365),
  tran_ngay: s(90, 0, 480),
  tran_tuan: s(420, 0, 3000),
  yc_cho_toi_da: s(3, 1, 10),
  yc_ngay_toi_da: s(10, 1, 50),
  yc_het_gio_them: s(24, 1, 72),           // giờ
  yc_het_ngay_cai: s(7, 1, 30),            // ngày (mở web / cài app)
  ngoai_le_mem_tuan: s(3, 1, 20),
  ngoai_le_mem_thang: s(10, 1, 20),
  ngoai_le_manh_tuan: s(6, 2, 30),
  offline_gio: s(24, 1, 168),
  lech_gio_phut: s(10, 1, 30),             // BRD mặc định 5; master 21/10 («độ bền máy con») chốt 10
  ngung_chay_phut: s(15, 5, 120),          // máy đang bật mà agent im lặng quá ⇒ báo Ba Mẹ (M4b)
  chan_lan_gio: s(10, 3, 50),
  luu_bang_chung_ngay: s(90, 30, 365),
  // M4b (chỉ thêm): nhịp thưa của điện thoại/máy tính bảng (Android Doze, iOS chạy nền giới hạn) ⇒ ngưỡng mất nhịp riêng; điểm tuân thủ
  // dưới ngưỡng ⇒ khoá giải trí (fail-closed); mở khẩn cấp tối đa; hạn token gói cài.
  mat_nhip_di_dong_phut: s(180, 30, 1440),
  tuan_thu_nguong: s(80, 0, 100),
  mo_khan_cap_toi_da_phut: s(120, 15, 720),
  goi_cai_gio: s(48, 1, 168),
  // M4b mạng (chỉ thêm): thiết bị mạng không còn đi qua resolver quá X phút ⇒ báo; số truy vấn ngoài giờ trong ngày để báo «vượt giờ».
  dns_mat_truy_van_phut: s(180, 30, 1440),
  dns_vuot_gio_nguong: s(20, 1, 1000),
  // Web trên máy Windows (lib/web.ts): 0 = mở (mọi trang mở được, trừ trang Ba Mẹ chặn) · 1 = chỉ cho phép (chỉ trang Ba Mẹ cho phép + danh sách hệ thống).
  web_chi_cho_phep: s(0, 0, 1),
} satisfies Record<string, So>;

export type TenThamSo = keyof typeof THAM_SO;
export type ThamSo = Record<TenThamSo, number>;

export const LICH_MAC_DINH: { ngayThuong: Khung[]; cuoiTuan: Khung[]; ngu: Khung } = {
  ngayThuong: [{ tu: "17:00", den: "20:00" }],
  cuoiTuan: [{ tu: "09:00", den: "21:00" }],
  ngu: { tu: "21:00", den: "06:30" },
};
export type Lich = typeof LICH_MAC_DINH;

const kep = (t: So, v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(t.max, Math.max(t.min, Math.round(n))) : t.md;
};

/** Tham số hiệu lực: mặc định ← gia đình ← Con (lớp sau đè lớp trước), mỗi giá trị kẹp trong phạm vi. */
export function thamSo(...lopVao: (Record<string, unknown> | null | undefined)[]): ThamSo {
  const ra = {} as ThamSo;
  const lop = [heThong.thamSo, ...lopVao];          // mặc định hệ thống (Admin) → gia đình → Con
  for (const k of Object.keys(THAM_SO) as TenThamSo[]) {
    let v: unknown = THAM_SO[k].md;
    for (const l of lop) if (l && l[k] !== undefined && l[k] !== null) v = l[k];
    ra[k] = kep(THAM_SO[k], v);
  }
  return ra;
}

/** Chỉ giữ khoá hợp lệ + kẹp — dùng khi Ba Mẹ lưu cấu hình. */
export function sachCauHinh(b: Record<string, unknown>): Partial<ThamSo> {
  const ra: Partial<ThamSo> = {};
  for (const [k, v] of Object.entries(b ?? {})) if (k in THAM_SO) ra[k as TenThamSo] = kep(THAM_SO[k as TenThamSo], v);
  return ra;
}

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;
const sachKhung = (ds: unknown): Khung[] =>
  (Array.isArray(ds) ? ds : []).filter((k) => GIO.test(k?.tu) && GIO.test(k?.den) && k.tu !== k.den).slice(0, 4).map((k) => ({ tu: k.tu, den: k.den }));

/** Lịch hiệu lực: lịch Con (nếu đặt) đè mặc định từng phần. */
export function lichCua(l: Partial<Lich> | null | undefined): Lich {
  const ngu = l?.ngu && GIO.test(l.ngu.tu) && GIO.test(l.ngu.den) ? { tu: l.ngu.tu, den: l.ngu.den } : LICH_MAC_DINH.ngu;
  return {
    ngayThuong: l?.ngayThuong ? sachKhung(l.ngayThuong) : LICH_MAC_DINH.ngayThuong,
    cuoiTuan: l?.cuoiTuan ? sachKhung(l.cuoiTuan) : LICH_MAC_DINH.cuoiTuan,
    ngu,
  };
}

export const NHOM_GIA: Record<string, TenThamSo> = {
  game: "gia_game", video_ngan: "gia_video_ngan", mxh: "gia_mxh", phim_gd: "gia_phim_gd", khac: "gia_khac",
};

/** Con đang bị Ba Mẹ khoá? «Khoá ngay» có hạn (`khoa_den`) tự hết khi qua giờ đó — không cần tiến trình nền gỡ cờ. */
export function dangKhoa(cfg: Record<string, unknown> | null | undefined, now = new Date()): boolean {
  if (cfg?.khoa_ngay !== true) return false;
  const den = typeof cfg.khoa_den === "string" ? Date.parse(cfg.khoa_den) : NaN;
  return Number.isNaN(den) || den > now.getTime();
}
/** Hạn khoá còn hiệu lực (ISO) hoặc null = khoá tới khi Ba Mẹ mở / không khoá. */
export const khoaDen = (cfg: Record<string, unknown> | null | undefined, now = new Date()) =>
  dangKhoa(cfg, now) && typeof cfg?.khoa_den === "string" ? cfg.khoa_den : null;
