// Logic thuần (không React Native) cho các màn Ba Mẹ của thiết kế chốt 06/11 — PIN theo bé (L13), quà bảng giá (L14), mã mở máy + mất mạng +
// chuông (L19). Hợp đồng máy chủ: docs/API.md mục «S3». Tách riêng để `node --test src/lib/s3.test.ts` chạy được (không kéo RN vào).

// ---------------------------------------------------------------- kiểu dữ liệu máy chủ (S3)

export type LoaiQua = "qua" | "dac_quyen" | "voucher" | "tiet_kiem";
/** Một phần tử GET qua › ds. */
export type QuaS3 = {
  id: string; ten: string; loai: LoaiQua; sao: number; diem: number; moTa: string | null; hinh: string | null; menhGia: number | null;
  tonKho: number | null; toiDaThang: number | null; chiCuoiTuan: boolean; canXacNhan: boolean; apCho: string[] | null; mau: string | null;
  dangGiu: number; laVoucher: boolean; bat: boolean;
};
/** Mẫu quà (GET qua/mac-dinh, GET qua/thu-vien). */
export type MauQua = { ma: string; ten: string; moTa: string | null; hinh: string | null; sao: number; loai: LoaiQua; menhGia: number | null;
  chiCuoiTuan: boolean; tonKho: number | null; canXacNhan?: boolean; daCo: boolean };
export type NhomThuVien = { ma: string; ten: string; phu: string; ds: MauQua[] };
export type VoucherPhat = { ma: string; qr: string; hetHan: string; menhGia: number };
export type KqTrao = { trangThai: string; saoTru?: number; voucher?: VoucherPhat | null };
export type MaOfflineS3 = { ma: string; maHien?: string; phutMo: number; chonPhut?: number[]; doiSauGiay?: number; conGiay: number; hieuLucPhut: number;
  may?: { id: string; ten: string; nen: string } };
export type PinCon = { coPin: boolean; pin?: string | null; pinDatLuc?: string | null; ten: string };
export type MayMatMang = { mayId: string; ten: string; nen: string; tu: string; phut: number };
export type MucCanDeY = { id: string; loai: "mat_mang" | "quen_pin" | "canh_bao" | "con_xin" | "nop_bai" | "chua_bao_ve" | string; tieu: string; phu: string;
  luc: string; con: string | null; may?: string; so: number; nut: string; den: string };

// ---------------------------------------------------------------- PIN 4 số (L13)

/** Chỉ giữ chữ số, tối đa 4. */
export const locPin = (s: string) => s.replace(/\D/g, "").slice(0, 4);
export const pinHop = (pin: string) => /^\d{4}$/.test(pin);

/**
 * Kiểm PIN ở form Thêm con / Đặt PIN: bỏ trống = chưa đặt (hợp lệ — máy chủ cho «chưa có PIN»). Trả câu lỗi hoặc null.
 * `namSinh`: thiết kế ghi «không dùng ngày sinh» ⇒ chặn PIN trùng năm sinh / ngày-tháng sinh dạng 4 số.
 */
export function kiemPin(pin: string, lai: string | null, namSinh?: number | null): string | null {
  if (!pin && !lai) return null;
  if (!pinHop(pin)) return "PIN cần đủ 4 số.";
  if (namSinh && String(namSinh) === pin) return "Đừng dùng năm sinh làm PIN — dễ đoán.";
  if (lai !== null && lai !== pin) return lai.length < 4 ? "Nhập lại PIN cho đủ 4 số." : "Hai lần nhập PIN chưa khớp.";
  return null;
}

/** «Đặt lần cuối 06/11» (ngày theo giờ máy). */
export function cauDatPin(iso: string | null | undefined) {
  if (!iso) return "Chưa đặt PIN";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "Chưa đặt PIN";
  return `Đặt lần cuối ${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- quà bảng giá (L14)

/** Hình quà của máy chủ (`hinh`) ⇒ tên icon 3D trong app. Không có ⇒ theo loại quà. */
const HINH_QUA: Record<string, string> = {
  bua_toi: "chen", kem: "coc", aiicafe: "the_qua", do_choi: "game", phim: "lich", lego: "qua", dong_ho: "dongho", game: "game", sach: "sach",
  ngu: "trang_ngu", heo_dat: "xu", xe_dap: "xu",
};
const IC_LOAI: Record<LoaiQua, string> = { voucher: "the_qua", tiet_kiem: "xu", dac_quyen: "lich", qua: "qua" };
/** Không có `hinh` (phiếu chờ trao cũ chỉ có tên) ⇒ đoán theo tên quà. */
const THEO_TEN: [RegExp, string][] = [[/kem/i, "coc"], [/bữa|món|ăn/i, "chen"], [/aiicafe|voucher/i, "the_qua"], [/phim/i, "lich"], [/lego/i, "qua"],
  [/đồ chơi|game/i, "game"], [/sách/i, "sach"], [/heo|quỹ|tiết kiệm/i, "xu"], [/ngủ/i, "trang_ngu"]];
export const icQua = (q: { hinh?: string | null; loai: LoaiQua | string; ten?: string }) =>
  HINH_QUA[q.hinh ?? ""] ?? THEO_TEN.find(([r]) => q.ten && r.test(q.ten))?.[1] ?? IC_LOAI[q.loai as LoaiQua] ?? "qua";
/** Hình Ba Mẹ chọn được ở «Sửa quà» (khoá máy chủ, theo thứ tự hiện). */
export const HINH_CHON = ["kem", "bua_toi", "aiicafe", "lego", "do_choi", "phim", "sach", "heo_dat"] as const;

/**
 * Dòng phụ dưới tên quà ở «Danh sách quà» (them-473f52w6): điều kiện quan trọng (chỉ cuối tuần / còn N / tối đa / Ba Mẹ trao) in nghiêng màu cam —
 * `nhan: true`; không thì lời mô tả của quà. Số tồn kho lấy theo số hiện tại, không theo chữ mô tả cũ («Còn 1 bộ» ⇒ Ba Mẹ sửa còn 3 ⇒ «Còn 3 bộ»).
 */
export function phuQua(q: Pick<QuaS3, "moTa" | "chiCuoiTuan" | "tonKho" | "toiDaThang" | "canXacNhan" | "laVoucher" | "menhGia">): { chu: string; nhan: boolean } {
  if (q.tonKho !== null && q.tonKho !== undefined) {
    if (q.tonKho <= 0) return { chu: "Hết hàng · con chưa đổi được", nhan: true };
    const don = /^Còn \d+ (.+)$/.exec(q.moTa ?? "")?.[1];
    return { chu: `Còn ${q.tonKho}${don ? ` ${don}` : ""}`, nhan: true };
  }
  if (q.chiCuoiTuan) return { chu: "Chỉ cuối tuần", nhan: true };
  if (q.toiDaThang) return { chu: `Tối đa ${q.toiDaThang} lần/tháng`, nhan: true };
  if (q.canXacNhan) return { chu: "Ba Mẹ trao", nhan: true };
  if (q.moTa) return { chu: q.moTa, nhan: /Ba Mẹ trao/.test(q.moTa) };
  if (q.laVoucher) return { chu: "Voucher QR · 60 ngày", nhan: false };
  return { chu: "", nhan: false };
}

/** Nút −/+ giá ở «Sửa quà»: bước 10 sao, không dưới 10, không quá 100.000. */
export const buocGia = (sao: number, huong: 1 | -1) => Math.min(100_000, Math.max(10, Math.round((sao + huong * 10) / 10) * 10));

/** Sao con làm được mỗi ngày nếu đủ việc (việc bật, giao cho con hoặc cả nhà, lặp hằng ngày / ngày thường / chưa ghi lặp). */
/** Số ngày trong tuần việc có lịch (trung bình theo tuần): mỗi ngày 7, ngày thường 5, cuối tuần 2, «thu:1,3» = số thứ; một lần ⇒ 0. */
const soNgayTuan = (l: string | null | undefined) => (!l || l === "hang_ngay" ? 7 : l === "ngay_thuong" ? 5 : l === "cuoi_tuan" ? 2
  : l.startsWith("thu:") ? new Set(l.slice(4).split(",").filter((x) => /^[0-6]$/.test(x.trim()))).size : 0);
export function saoMoiNgay(nv: { diem: number; bat: boolean; giao_cho: string | null; lap_lai?: string | null }[], con: string) {
  return Math.round(nv.filter((v) => v.bat && (!v.giao_cho || v.giao_cho === con)).reduce((s, v) => s + (v.diem * soNgayTuan(v.lap_lai)) / 7, 0));
}
/** «Bảo Anh làm đủ việc được khoảng 60 sao/ngày → 2 ngày đổi được.» — null khi con chưa có việc. */
export function cauNgayDoi(ten: string, gia: number, saoNgay: number) {
  if (saoNgay <= 0) return null;
  const n = Math.max(1, Math.ceil(gia / saoNgay));
  return `${ten} làm đủ việc được khoảng ${saoNgay} sao/ngày → ${n === 1 ? "1 ngày là" : `${n} ngày`} đổi được.`;
}

/** Thân POST qua / qua/:id từ form «Sửa quà». `apCho` đủ mọi Con ⇒ null (= cả nhà, quà Con mới thêm sau cũng thấy). */
export function thanSuaQua(f: { ten: string; sao: number; hinh: string | null; chiCuoiTuan: boolean; toiDa: number | null; tonKho: number | null; canXacNhan: boolean;
  apCho: string[]; moiCon: string[] }, moi: boolean, loai: LoaiQua = "qua") {
  const tatCa = f.moiCon.length > 0 && f.moiCon.every((c) => f.apCho.includes(c));
  return {
    ...(moi ? { loai } : {}), ten: f.ten.trim(), sao: f.sao, hinh: f.hinh, chiCuoiTuan: f.chiCuoiTuan, toiDaThang: f.toiDa, tonKho: f.tonKho,
    canXacNhan: f.canXacNhan, apCho: tatCa || !f.apCho.length ? null : f.apCho,
  };
}

/** Bật / tắt một mẫu ở «Thêm quà từ thư viện» (mẫu «Đã có» không chọn được). */
export function doiChonMau(chon: string[], m: Pick<MauQua, "ma" | "daCo">) {
  if (m.daCo) return chon;
  return chon.includes(m.ma) ? chon.filter((x) => x !== m.ma) : [...chon, m.ma];
}
/** Nút cuối màn thư viện: «Thêm 2 quà cho Bảo Anh» / «Chọn quà để thêm». */
export const cauThemQua = (n: number, ten?: string | null) => (n ? `Thêm ${n} quà${ten ? ` cho ${ten}` : ""}` : "Chọn quà để thêm");

/** Bước «Chọn quà»: mặc định tick các mẫu, giữ lựa chọn cũ khi quay lại. Nút «Lưu 7 quà, sang giờ chơi» / «Bỏ qua quà, sang giờ chơi». */
export const cauLuuQuaLanDau = (n: number) => (n ? `Lưu ${n} quà, sang giờ chơi` : "Chưa cần quà, sang giờ chơi");

/** «Hạn dùng tới 05/01/2027 · còn 60 ngày» cho voucher vừa phát. */
export function cauHanVoucher(hetHan: string, now = new Date()) {
  const t = new Date(hetHan);
  if (Number.isNaN(t.getTime())) return "";
  const ngay = Math.max(0, Math.ceil((t.getTime() - now.getTime()) / 86_400_000));
  return `Hạn dùng tới ${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}/${t.getFullYear()} · còn ${ngay} ngày`;
}

// ---------------------------------------------------------------- mã mở máy khi mất mạng (L19)

export const PHUT_MO = [15, 30, 60] as const;
/** «731594» ⇒ ["7","3","1","5","9","4"] (ô số to, cách ở giữa). */
export const chiaMa = (ma: string) => ma.replace(/\D/g, "").split("");
/** «Mã đổi sau 4 phút» — làm tròn lên phút; dưới 1 phút ⇒ «Mã đổi sau 40 giây». */
export function cauDoiSau(giay: number) {
  const g = Math.max(0, Math.round(giay));
  return g < 60 ? `Mã đổi sau ${g} giây` : `Mã đổi sau ${Math.ceil(g / 60)} phút`;
}
/** Lời gửi kèm mã cho con (Zalo / Tin nhắn …). */
export const loiGuiMa = (ma: string, phut: number, ten: string | null, may: string | null) =>
  `Mã mở ${may ?? "máy"}${ten ? ` cho ${ten}` : ""}: ${ma.replace(/^(\d{3})(\d{3})$/, "$1 $2")} — mở được ${phut} phút. Máy không cần mạng vẫn nhập được.`;

/** Sự kiện «máy mở bằng mã offline» mới hơn `tu` (lúc Ba Mẹ mở màn mã) — để hiện bảng «Bảo Anh đã mở máy bằng mã» (them-s8nltlaa). */
/** Đồng hồ điện thoại có thể lệch máy chủ ⇒ nhận cả sự kiện tới trước lúc mở màn tối đa chừng này. */
export const LECH_DONG_HO_MS = 30_000;
export function suKienMoMa(ds: { loai: string; chi_tiet: Record<string, unknown>; created_at: string }[], tu: number) {
  const x = ds.filter((s) => s.loai === "may_mo_ma_offline" && Date.parse(s.created_at) > tu - LECH_DONG_HO_MS)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!x) return null;
  const phut = Number(x.chi_tiet?.phut);
  // lúc CON mở máy (máy ghi khi offline, `chi_tiet.luc`); máy cũ không ghi ⇒ lúc máy chủ nhận
  const luc = typeof x.chi_tiet?.luc === "string" && !Number.isNaN(Date.parse(x.chi_tiet.luc)) ? x.chi_tiet.luc : x.created_at;
  return { luc, coMangLuc: x.created_at, phut: Number.isFinite(phut) && phut > 0 ? phut : null };
}

// ---------------------------------------------------------------- chuông + «Cần Ba Mẹ để ý»

/** Số trên chuông: `soChuong` của máy chủ mới (= số mục Cần Ba Mẹ để ý); máy chủ cũ ⇒ số thông báo chưa đọc. */
export const soTrenChuong = (r: { soChuong?: number | null; chuaDoc?: number | null }) => Math.max(0, r.soChuong ?? r.chuaDoc ?? 0);

// ---------------------------------------------------------------- «Thêm con» từ Cả nhà (them-9ozp26pq): chip tuổi thay ô năm sinh

/** Chip «Con mấy tuổi?» (4–5 … 13+) — `tuoi` = tuổi đại diện gửi lên máy chủ dạng năm sinh (máy chủ tính nhóm Nhí / Teen từ năm sinh, ≥ 11 = Teen). */
export const CHIP_TUOI = [{ chu: "4–5", tuoi: 5 }, { chu: "6–7", tuoi: 7 }, { chu: "8–9", tuoi: 9 }, { chu: "10–12", tuoi: 11 }, { chu: "13+", tuoi: 13 }] as const;
/** Năm sinh gửi máy chủ cho một chip tuổi (null = chưa chọn). */
export const namTuChipTuoi = (i: number | null, nam = new Date().getFullYear()) => (i === null || !CHIP_TUOI[i] ? null : nam - CHIP_TUOI[i].tuoi);
/** Bộ việc giao sẵn theo chip tuổi (server/lib/bo-nhiem-vu.ts): 4–7 Học tập · 8–9 Tự lập · 10+ Phụ việc nhà; chưa chọn tuổi ⇒ Tự lập (bộ đầu ở bước Lần đầu). */
export const boTheoTuoi = (i: number | null) => (i === null ? "tu_lap" : i <= 1 ? "hoc_tap" : i === 2 ? "tu_lap" : "viec_nha");
