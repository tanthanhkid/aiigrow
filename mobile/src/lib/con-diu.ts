// Luật thuần của phía Con bản «Dịu» (không import React Native ⇒ chạy thẳng `node --test src/lib/con-diu.test.ts`):
// đọc mã ghép từ QR, xếp lỗi ghép máy, trạng thái nhập PIN theo bé (L13 — API S3 `dang-nhap-be`), sổ sao 15/11 (1 sao = 1 phút, vay sao, số âm), quà gần nhất.

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

// ---------------------------------------------------------------- sổ sao 15/11 (#263–#266): 1 sao = 1 phút, vay sao, số dư âm

/** Số kiểu Việt có dấu trừ thật «−» (U+2212) và chấm hàng nghìn: −1.020 (khớp server/lib/so-sao.ts › soVN). */
export const soVN = (n: unknown) => { const x = Math.round(Number(n ?? 0)) || 0; return `${x < 0 ? "\u2212" : ""}${Math.abs(x).toLocaleString("en-US").replace(/,/g, ".")}`; };
/** «18 sao» / «−20 sao». */
export const soSao = (n: number) => `${soVN(n)} sao`;

/** Dòng sổ sao gần đây (kid/sao › lichSu — máy chủ mới). `sao` = delta sổ cái (vay +N, trả nợ −N, chơi −N, nhiệm vụ +N). */
export type DongSao = { id: string; loai: string; kieu: string; sao: number; luc: string; chuThich?: string | null; tenNguoi?: string | null };
/** Phút từng app hôm nay (kid/sao › appHomNay — máy chủ mới): «Roblox 30 phút · −30 sao». */
export type AppHomNay = { ten: string; muc: string; kieu?: "app" | "web"; phut: number; nhom: "tinh_phut" | "khong_tinh_phut"; sao: number; dangMo?: boolean };
/** GET /api/kid/sao (15/11). Trường nào thiếu (máy chủ cũ) ⇒ suy từ kid/quy. */
export type SaoMayChu = { sao?: number; no?: number; phutCon?: number; saoVayChuaTieu?: number; hetSao?: boolean; canhBaoNo?: boolean;
  cau?: { soDu?: string; phut?: string; no?: string | null }; mucVay?: number[]; vayMacDinh?: number; phutChoiHomNay?: number; khoa?: boolean;
  lichSu?: DongSao[]; appHomNay?: AppHomNay[] };
/** Phần kid/quy cần cho sổ sao (máy chủ cũ / «hôm nay chơi N phút» / Ba Mẹ khoá). */
export type QuySao = { sao?: number; quy?: { conPhut?: number; daDung?: number; khoa?: boolean } | null } | null;
export type SaoCon = { sao: number; no: number; phutCon: number; saoVayChuaTieu: number; hetSao: boolean; phutHomNay: number; khoa: boolean;
  mucVay: number[]; vayMacDinh: number; cau: { soDu: string; phut: string; no: string | null };
  /** máy chủ mới mới có (null = chưa có — màn bỏ phần đó) */ lichSu: DongSao[] | null; appHomNay: AppHomNay[] | null };

export const MUC_VAY = [10, 15, 30];
/** «còn 18 sao = 18 phút chơi» · hết sao ⇒ «còn 0 sao = 0 phút chơi». */
export const cauPhut = (phutCon: number) => `còn ${soVN(Math.max(0, phutCon))} sao = ${soVN(Math.max(0, phutCon))} phút chơi`;
/** «Đang nợ Ba Mẹ 20 sao» (không nợ ⇒ null). */
export const cauNo = (no: number) => (no > 0 ? `Đang nợ Ba Mẹ ${soVN(no)} sao` : null);

/** #433 A12: dải «Mất mạng» trên Nhà của Con. Đang nợ (số dư âm) ⇒ nói nợ, không «vẫn có −15 sao»; còn sao vay chưa tiêu thì nói thêm. */
export function cauMatMangTre(ten: string, s: { sao: number; no: number; phutCon: number }) {
  const sau = "Bài nộp tự gửi khi có mạng.";
  if (s.no > 0)
    return `Mất mạng rồi — ${ten} đang nợ Ba Mẹ ${soSao(s.no)}${s.phutCon > 0 ? `, còn ${soSao(s.phutCon)} để chơi` : ""}. ${sau}`;
  return `Mất mạng rồi — ${ten} vẫn có ${soSao(Math.max(0, s.sao))}. ${sau}`;
}

export function saoTuMayChu(s: SaoMayChu | null, q: QuySao): SaoCon {
  const sao = Math.round(Number(s?.sao ?? q?.sao ?? 0)) || 0;
  const no = Math.max(0, Math.round(Number(s?.no ?? 0)) || 0);
  const phutCon = Math.max(0, Math.round(Number(s?.phutCon ?? q?.quy?.conPhut ?? Math.max(0, sao))) || 0);
  const muc = Array.isArray(s?.mucVay) && s!.mucVay!.length ? s!.mucVay! : MUC_VAY;
  return {
    sao, no, phutCon, saoVayChuaTieu: Math.max(0, Number(s?.saoVayChuaTieu ?? 0) || 0), hetSao: s?.hetSao ?? phutCon <= 0,
    phutHomNay: Math.max(0, Number(s?.phutChoiHomNay ?? q?.quy?.daDung ?? 0) || 0), khoa: !!(s?.khoa ?? q?.quy?.khoa),
    mucVay: muc, vayMacDinh: s?.vayMacDinh && muc.includes(s.vayMacDinh) ? s.vayMacDinh : muc.includes(15) ? 15 : muc[0],
    cau: { soDu: soSao(sao), phut: cauPhut(phutCon), no: cauNo(no) },
    lichSu: Array.isArray(s?.lichSu) ? s!.lichSu! : null, appHomNay: Array.isArray(s?.appHomNay) ? s!.appHomNay! : null,
  };
}

/** Tỉ lệ vòng «N sao còn lại»: phần còn trên (còn + đã chơi hôm nay). */
export const tiVong = (s: Pick<SaoCon, "phutCon" | "phutHomNay">) => s.phutCon / Math.max(1, s.phutCon + s.phutHomNay);

/** Dòng lịch sử sao cho Con (cdt-vi-qua): «Ba Mẹ cho vay 50 sao · −50» (nợ tăng), «Trả nợ 20 sao · Dọn phòng · +20», «Chơi Roblox 20 phút · −20». */
export function dongLichSu(x: DongSao): { chu: string; so: string } {
  const n = Math.abs(Math.round(Number(x.sao) || 0));
  const ct = x.chuThich ? ` · ${x.chuThich}` : "";
  const ai = x.tenNguoi || "Ba Mẹ";
  switch (x.kieu) {
    case "vay": return { chu: `${ai} cho vay ${soVN(n)} sao${ct}`, so: `\u2212${soVN(n)}` };
    case "hoan_vay": return { chu: `${ai} rút lại ${soVN(n)} sao vay`, so: `+${soVN(n)}` };
    case "tra_no": return { chu: `Trả nợ ${soVN(n)} sao${ct}`, so: `+${soVN(n)}` };
    default: return { chu: x.chuThich || (x.kieu === "choi" ? `Chơi ${soVN(n)} phút` : x.kieu === "nhiem_vu" ? "Nhiệm vụ" : x.kieu === "khoi_dau" ? "Sao khởi đầu" : "Sao"),
      so: `${x.sao < 0 ? "\u2212" : "+"}${soVN(n)}` };
  }
}

/** Màn «Được duyệt» khi đang nợ: sao nhiệm vụ trả nợ trước. `saoSau` = số dư sau khi duyệt, `diem` = sao vừa được.
 *  ⇒ `truoc` (số dư trước), `traNo` (phần trả nợ), `conNo` (nợ còn lại = phần âm của số dư sau). */
export function traNoKhiDuyet(saoSau: number, diem: number) {
  const truoc = saoSau - diem;
  const traNo = truoc < 0 ? Math.min(diem, -truoc) : 0;
  return { truoc, traNo, conNo: Math.max(0, -saoSau) };
}

/** «= 15 phút chơi hoặc đổi quà · con sẽ nợ 15 sao» (bảng xin vay). Nợ sau vay = nợ đang có + số vay (như máy chủ `cho-vay/xem-truoc`). */
export const cauVay = (soSaoVay: number, noDangCo = 0) => `= ${soVN(soSaoVay)} phút chơi hoặc đổi quà · con sẽ nợ ${soVN(Math.max(0, noDangCo) + soSaoVay)} sao`;

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
