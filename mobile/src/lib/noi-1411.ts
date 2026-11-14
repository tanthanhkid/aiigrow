// Logic thuần (không React) nối app Ba Mẹ với các API máy chủ PR #253 (docs/API.md «Khớp thiết kế 14/11 — phần máy chủ còn lệch»):
// khoá riêng từng máy, xoá hồ sơ Con, «Trao luôn cho <Con>», hộp thư hỗ trợ quản trị. Test: noi-1411.test.ts.

/** Trạng thái khoá riêng một máy (`GET con/:id` → `may[].khoaMay`). `den` null = khoá tới khi Ba Mẹ mở. */
export type KhoaMayTt = { khoa: boolean; den: string | null };

const hhmm = (iso: string) => { const t = new Date(iso); return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`; };

/** Khoá riêng máy còn hiệu lực (hạn đã qua ⇒ hết, như máy chủ tự hết). */
export const mayDangKhoa = (km: KhoaMayTt | null | undefined, now = new Date()) => !!km?.khoa && (!km.den || Date.parse(km.den) > now.getTime());

/** «Đang khoá tới 06:30» / «Đang khoá tới khi Ba Mẹ mở» — null khi máy không khoá riêng. */
export const cauKhoaMay = (km: KhoaMayTt | null | undefined, now = new Date()) =>
  !mayDangKhoa(km, now) ? null : km!.den ? `Đang khoá tới ${hhmm(km!.den)}` : "Đang khoá tới khi Ba Mẹ mở";

/** Thân `POST may/:id/khoa`: «sang» để máy chủ tính 6:30 theo múi giờ gia đình; Date ⇒ ISO; mở ⇒ chỉ {khoa:false}. */
export const thanKhoaMay = (khoa: boolean, den: Date | "sang" | null = null) =>
  ({ khoa, ...(khoa && den ? { den: den === "sang" ? "sang" : den.toISOString() } : {}) });

/** Bảng «Khoá máy <Con>?» chọn máy: chọn ĐỦ mọi máy ⇒ khoá theo Con (`con/:id/khoa` — cả máy ghép sau, cả máy dùng chung con đang đăng nhập);
 *  chọn một phần ⇒ khoá riêng từng máy (`may/:id/khoa`); không chọn máy nào ⇒ null (nút tắt). Con chưa có máy ⇒ khoá theo Con như cũ. */
export function cachKhoa(tatCa: string[], chon: Iterable<string>): { kieu: "con" } | { kieu: "may"; ids: string[] } | null {
  const c = new Set(chon);
  const ids = tatCa.filter((x) => c.has(x));
  if (!tatCa.length || ids.length === tatCa.length) return { kieu: "con" };
  return ids.length ? { kieu: "may", ids } : null;
}

/** Lỗi `POST con/:id/xoa` ⇒ câu dễ hiểu + lối đi tiếp. null = để câu máy chủ. */
export function loiXoaCon(ma: string, ten: string): { cau: string; loi: "may" | "ho_tro" | null } | null {
  if (ma === "con_may") return { cau: `${ten} là bé cuối cùng trong nhà mà nhà vẫn còn máy đã ghép — các máy đó sẽ không còn bé nào để trông. Gỡ máy trước, hoặc thêm con khác rồi mới xoá hồ sơ.`, loi: "may" };
  if (ma === "con_thiet_bi_mang") return { cau: `${ten} còn thiết bị lọc mạng riêng (TV, máy chơi game…). Thiết bị này không dùng chung được nên cần xoá trước — nhắn AiiGrow để được giúp.`, loi: "ho_tro" };
  if (ma === "can_xac_nhan") return { cau: "Chưa xác nhận xoá — bấm lại «Xoá hồ sơ» nhé.", loi: null };
  if (ma === "khong_thay") return { cau: `Hồ sơ ${ten} không còn — có thể người lớn khác vừa xoá.`, loi: null };
  return null;
}

/** «Trao luôn» được cho quà này không: voucher AiiCafe cần thanh toán (máy chủ 409 `voucher_can_thanh_toan`) ⇒ không. */
export const traoLuonDuoc = (loai: string | null | undefined) => !!loai && loai !== "voucher";

/** Lỗi `POST qua/:id/trao-luon` ⇒ câu dễ hiểu. null = để câu máy chủ. */
export function loiTraoLuon(ma: string, ten: string): string | null {
  if (ma === "voucher_can_thanh_toan") return `Voucher cần Ba Mẹ thanh toán trong app — phần này sắp có. Bây giờ ${ten} đổi bằng sao như thường nhé.`;
  if (ma === "het_hang") return "Quà này đã hết — thêm số lượng ở «Sửa quà» rồi trao.";
  if (ma === "khong_thay") return `Quà này không còn áp cho ${ten} (hoặc đã tắt).`;
  return null;
}

/** Quà trong kho (`GET qua` — dòng bảng rewards) khớp mẫu thư viện `ma` cho Con: đang bật, áp cho mọi Con hoặc có Con này. */
export type DongQua = { id: string; mau?: string | null; ten: string; loai: string; bat: boolean; ap_cho?: string[] | null };
export const quaTrongKho = (ds: DongQua[], ma: string, ten: string, con?: string | null) =>
  ds.find((x) => x.bat && (x.mau === ma || (!x.mau && x.ten.toLowerCase() === ten.toLowerCase())) && (!x.ap_cho || !con || x.ap_cho.includes(con))) ?? null;

/** Hộp thư hỗ trợ (`GET admin/ho-tro`). */
export type DongHoTro = { family_id: string; ten: string; tu: string; noi_dung: string; created_at: string; chua_tra_loi: boolean;
  nguoi_gui?: string | null; cho_tu?: string | null; cho_phut?: number | null; gap?: boolean; nguoi_tra_loi?: string | null; cua_toi?: boolean };
export type HopThu = { ds: DongHoTro[]; soCho?: number; soGap?: number };
export const LOC_HO_TRO = [{ gia: "cho", chu: "Chờ trả lời" }, { gia: "da_tra_loi", chu: "Đã trả lời" }, { gia: "cua_toi", chu: "Của tôi" }] as const;
export type LocHoTro = (typeof LOC_HO_TRO)[number]["gia"];

/** «Chờ 42′» / «Chờ 1 giờ 5′» — null khi đã trả lời. */
export const cauCho = (p: number | null | undefined) =>
  p === null || p === undefined ? null : p >= 60 ? `Chờ ${Math.floor(p / 60)} giờ${p % 60 ? ` ${p % 60}′` : ""}` : `Chờ ${Math.max(0, p)}′`;

/** Tab «Chờ trả lời»: «Gấp» (chờ ≥ 30′ — máy chủ tính `gap`) lên trước, rồi «Đang chờ»; giữ thứ tự máy chủ (chờ lâu trước). */
export const chiaHopThu = (ds: DongHoTro[]) => ({ gap: ds.filter((x) => x.gap), dangCho: ds.filter((x) => !x.gap) });
