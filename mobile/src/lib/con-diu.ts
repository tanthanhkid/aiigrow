// Luật thuần của phía Con bản «Dịu» (không import React Native ⇒ chạy thẳng `node --test src/lib/con-diu.test.ts`):
// đọc mã ghép từ QR, xếp lỗi ghép máy, trạng thái nhập PIN theo bé (L13 — API S3 `dang-nhap-be`), chip đổi sao lấy phút, quà gần nhất.

/** QR trên máy Ba Mẹ = link cài `<máy chủ>/tai?g=<token gói>&ma=<6 số>` (server/lib/ghep-may.ts). Cũng nhận 6 số trần.
 *  → `{ma}` (ghép bằng mã 6 số) / `{goi}` (chỉ có token gói ⇒ `ghep-goi`) / null (QR lạ). */
export function maTuQr(s: string | null | undefined): { ma?: string; goi?: string } | null {
  const t = String(s ?? "").trim();
  if (/^\d{6}$/.test(t.replace(/\s/g, ""))) return { ma: t.replace(/\s/g, "") };
  try {
    const u = new URL(t);
    const ma = (u.searchParams.get("ma") ?? "").replace(/\D/g, "");
    const goi = u.searchParams.get("g") ?? "";
    if (ma.length === 6) return { ma, ...(goi ? { goi } : {}) };
    if (goi) return { goi };
  } catch { /* không phải URL */ }
  return null;
}

export type LoiGhep = "sai" | "het_han" | "mat_mang" | "khoa" | "khac";
/** Mã lỗi `POST /api/device/ghep` ⇒ màn: «Mã chưa đúng» (05) · «Mã hết hạn rồi» (06) · «Chưa ghép được — mất mạng» (07). */
export function loaiLoiGhep(ma: string | undefined): LoiGhep {
  if (ma === "ma_sai") return "sai";
  if (ma === "ma_het_han" || ma === "ma_da_dung") return "het_han";
  if (ma === "mat_mang") return "mat_mang";
  if (ma === "ghep_tam_khoa") return "khoa";
  return "khac";
}

/** Số lần thử mã ghép còn lại trên máy này (máy chủ đếm theo IP, tối đa 10 / 15 phút — màn chỉ đếm lùi từ 5 cho dễ hiểu). */
export const GHEP_THU_TOI_DA = 5;

/** Trạng thái màn PIN sau một lần gửi `dang-nhap-be` (S3): vào được / sai còn N lần / chờ N giây / cần PIN / lỗi khác. */
export type KetQuaPin = { loai: "vao" } | { loai: "sai"; conLan: number } | { loai: "cho"; denMs: number } | { loai: "can_pin" } | { loai: "loi"; cau: string };
export function ketQuaPin(loi: { ma?: string; message?: string; them?: Record<string, unknown> } | null, now = Date.now()): KetQuaPin {
  if (!loi) return { loai: "vao" };
  const them = loi.them ?? {};
  if (loi.ma === "pin_sai") return { loai: "sai", conLan: Math.max(0, Number(them.conLan ?? 0)) };
  if (loi.ma === "pin_tam_khoa") {
    // ưu tiên choGiay (khoảng tương đối — không lệch theo đồng hồ máy); thiếu mới dùng khoaDen (giờ máy chủ)
    const giay = Number(them.choGiay);
    if (Number.isFinite(giay) && giay > 0) return { loai: "cho", denMs: now + giay * 1000 };
    const den = typeof them.khoaDen === "string" ? Date.parse(them.khoaDen) : NaN;
    return { loai: "cho", denMs: Number.isFinite(den) ? den : now + 15_000 };
  }
  if (loi.ma === "can_pin") return { loai: "can_pin" };
  return { loai: "loi", cau: loi.message || "Chưa vào được — thử lại nhé." };
}

/** Bé đang bị chờ (ho-so trả `khoaDen` / `choGiay`) ⇒ mốc hết chờ (ms) hoặc null. */
export function choTuHoSo(c: { khoaDen?: string; choGiay?: number }, now = Date.now()): number | null {
  if (c.choGiay && c.choGiay > 0) return now + c.choGiay * 1000;      // tương đối — không lệch theo đồng hồ máy
  if (c.khoaDen) { const d = Date.parse(c.khoaDen); if (Number.isFinite(d) && d > now) return d; }
  return null;
}

/** Chip «Con muốn đổi» 10 / 20 / 30 sao (cdt-choi, cdt-android-doi-diem): mỗi chip = số sao ⇒ số phút theo tỷ lệ Ba Mẹ đặt.
 *  Không đủ sao / quá phần còn đổi được hôm nay ⇒ `thieu` (vẫn bấm được để xem màn «Chưa đủ sao»). */
export function chipDoiSao(sao: number, tyLe: { sao: number; phut: number }, conDoiDuoc: number, buoc = [10, 20, 30]) {
  const ts = Math.max(1, tyLe.sao), tp = Math.max(1, tyLe.phut);
  return buoc.map((s) => {
    const phut = Math.floor((s * tp) / ts);
    const tru = Math.ceil((phut * ts) / tp);       // máy chủ trừ ceil(phút × sao / phút) — hiện đúng số sao bị trừ
    return { sao: s, phut, tru, thieu: tru > sao || phut <= 0, quaHan: phut > conDoiDuoc };
  });
}

/** Quà gần nhất chưa đủ sao (thanh «tới mốc» ở Ví quà: «Chọn món bữa tối 50 sao · còn 10»). Đủ hết ⇒ quà rẻ nhất. */
export function quaGanNhat<T extends { diem: number; ten: string }>(qua: T[], sao: number): (T & { conThieu: number }) | null {
  const ds = [...qua].sort((a, b) => a.diem - b.diem);
  const x = ds.find((q) => q.diem > sao) ?? ds[0];
  return x ? { ...x, conThieu: Math.max(0, x.diem - sao) } : null;
}

/** «Còn thiếu 150 sao» / «Đủ sao rồi! Bấm để đổi» / «Đang giữ 100 sao · chờ Ba Mẹ trao». */
export function phuQua(q: { diem: number; du: boolean; conThieu: number; choTraoTu?: string | null }) {
  if (q.choTraoTu) return `Đang giữ ${q.diem} sao · chờ Ba Mẹ trao`;
  return q.du ? "Đủ sao rồi! Bấm để đổi" : `Còn thiếu ${q.conThieu} sao`;
}

/** Nhãn điều kiện nhỏ cạnh tên quà: «Mã QR» (voucher), «T7, CN» (chỉ cuối tuần), «Còn 1 bộ» (tồn kho), «Ba Mẹ trao» (quà thường). */
export function nhanQua(q: { loai: string; chi_cuoi_tuan?: boolean; chiCuoiTuan?: boolean; tonKho?: number | null }) {
  if (q.loai === "voucher") return "Mã QR";
  if (q.chiCuoiTuan ?? q.chi_cuoi_tuan) return "T7, CN";
  if (q.tonKho != null && q.tonKho <= 3) return `Còn ${q.tonKho} ${q.tonKho === 1 ? "bộ" : "món"}`;
  return null;
}

/** «Thứ Năm · 19:30» (dòng dưới lời chào). */
export function thuGio(d = new Date()) {
  const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${THU[d.getDay()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Chữ cái trên avatar: chữ đầu của tên («Bảo Anh» → B, như thiết kế); máy có hai bé trùng chữ đầu («Bảo Anh», «Bảo Minh») ⇒ dùng chữ đầu
 *  của tiếng cuối (A, M) để phân biệt khi chọn tên. */
export function chuAvt(ten: string, cacTen: string[] = []) {
  const tach = (t: string) => t.trim().split(/\s+/).filter(Boolean);
  const dau = (t: string) => (tach(t)[0] ?? "?").charAt(0).toUpperCase();
  const cuoi = (t: string) => (tach(t).pop() ?? "?").charAt(0).toUpperCase();
  const trung = cacTen.filter((t) => t !== ten && dau(t) === dau(ten)).length > 0;
  return trung ? cuoi(ten) : dau(ten);
}
