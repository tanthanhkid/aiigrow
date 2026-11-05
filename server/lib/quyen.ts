// Hai quyền người lớn trong nhà (thiết kế chốt 05/11, L6 — docs/KE-HOACH-KHOP-THIET-KE-0511.md): bỏ vai Ba / Mẹ / Chủ gia đình trên giao diện.
//   • ba_me      — làm được hết (đổi cài đặt, mời người nhà, ghép / gỡ máy…).
//   • trong_giup — Người trông giúp: xem, duyệt (nhiệm vụ, lời xin, trao quà), khoá máy; KHÔNG đổi cài đặt.
// Người TẠO nhà (families.chu_id) vẫn được ghi lại: chỉ người này xoá được cả nhà, và không ai đổi quyền / mời người này ra.
// Giá trị cũ (chu | duyet | xem) còn hiểu được: dòng do bản cũ ghi trong lúc deploy, test dựng tay.
import { LoiNghiepVu } from "./loi.ts";

export const QUYEN = ["ba_me", "trong_giup"] as const;
export type Quyen = (typeof QUYEN)[number];
export const TEN_QUYEN: Record<string, string> = {
  ba_me: "Ba Mẹ", trong_giup: "Người trông giúp",
  // giá trị cũ (sự kiện / thông báo ghi trước 05/11)
  chu: "Ba Mẹ", duyet: "Ba Mẹ", xem: "Người trông giúp",
};

/** vai lưu trong DB (mới hoặc cũ) ⇒ quyền. «roi» (đã rời nhà) ⇒ null. */
export function quyenTuVai(vai: string | null | undefined): Quyen | null {
  if (vai === "roi" || !vai) return null;
  // đóng an toàn: chỉ giá trị đã biết mới là Ba Mẹ; giá trị lạ ⇒ Người trông giúp
  return vai === "ba_me" || vai === "chu" || vai === "duyet" ? "ba_me" : "trong_giup";
}

export const quyenCua = (bm: { vai: string }): Quyen => quyenTuVai(bm.vai) ?? "trong_giup";

/** Người tạo nhà? `la_chu` do auth.ts › baMeTuToken tính từ families.chu_id; dòng cũ chưa có chu_id ⇒ theo vai «chu». */
export const laChuNha = (bm: { vai: string; la_chu?: boolean }): boolean => bm.la_chu ?? bm.vai === "chu";

/** Quyền nhập vào (mới hoặc giá trị cũ của app bản trước: duyet ⇒ ba_me, xem ⇒ trong_giup). */
export function quyenVao(v: unknown): Quyen {
  const s = String(v ?? "");
  if (s === "ba_me" || s === "duyet") return "ba_me";
  if (s === "trong_giup" || s === "xem") return "trong_giup";
  throw new LoiNghiepVu("quyen_sai", "Chọn quyền Ba Mẹ hoặc Người trông giúp");
}

/** Giá trị `vai` kiểu cũ trả kèm trong API cho app Ba Mẹ bản trước 05/11 (đọc vai === "chu" / "xem"). Bỏ khi mọi máy đã lên bản mới. */
export const vaiCu = (bm: { vai: string; la_chu?: boolean }) => (laChuNha(bm) ? "chu" : quyenCua(bm) === "trong_giup" ? "xem" : "duyet");

export function chiBaMe(bm: { vai: string }, viec = "đổi cài đặt") {
  if (quyenCua(bm) !== "ba_me") throw new LoiNghiepVu("chi_ba_me", `Người trông giúp không ${viec} được — nhờ Ba Mẹ làm nhé`, 403);
}

/** POST mà Người trông giúp được gọi trên /api/m (đường đã tách theo «/»): xem, duyệt, khoá máy — còn lại là đổi cài đặt. */
export function trongGiupDuoc(p: string[]): boolean {
  const d = p.join("/");
  if (["dang-xuat", "xoa-tai-khoan", "duyet-hang-loat", "moi/nhan", "thanh-vien/roi-nha"].includes(d)) return true;
  if (p[0] === "thong-bao" || d === "ho-tro") return true;                                           // thông báo riêng · nhắn hỗ trợ
  if (p[0] === "canh-bao" && p[1] && p[2] === "doc" && p.length === 3) return true;                    // đánh dấu cảnh báo đã đọc
  if (p[0] === "con" && p[1] && p.length === 3 && ["khoa", "loi-khen"].includes(p[2])) return true;   // khoá / mở lại máy · khen khi duyệt
  if (p[0] === "luot" && p[1] && p.length === 3 && ["duyet", "tu-choi", "hoan-tac", "lam-lai"].includes(p[2])) return true;   // + «Nhờ làm lại» (S1)
  if (p[0] === "con" && p[1] && p.length === 3 && p[2] === "them-gio") return true;                    // «Cho thêm giờ» trên thẻ Hôm nay (S1)
  if (p[0] === "them-gio" && p[1] && p[2] === "hoan-tac" && p.length === 3) return true;
  if (p[0] === "yeu-cau" && p[1] && p.length === 3 && ["dong-y", "tu-choi"].includes(p[2])) return true;
  if (p[0] === "phieu" && p[1] && p.length === 3 && ["xac-nhan", "huy", "trao"].includes(p[2])) return true;   // trao quà
  if (p[0] === "phien" && p[1] && p[2] === "dung" && p.length === 3) return true;                     // dừng phiên = khoá máy
  return false;
}
