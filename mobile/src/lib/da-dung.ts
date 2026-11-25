// Dữ liệu «<Con> đã dùng gì» hôm nay (GET con/:id/hom-nay — server/lib/hom-nay-dung.ts): dùng ở màn /da-dung/[con] (them-c95l1cwc)
// và mục «<Con> đã dùng gì hôm nay» của Trang chủ (bm2-trang-chu@v35).
import type { TenIcon } from "./ui";
import { soVN } from "./so-sao";

type DongDung = { luc: string | null; ten: string; muc: string; kieu: "app" | "web"; may: string | null; nen: string | null; mayId: string | null;
  phut: number; tinhGio: boolean; chuaXep?: boolean; dangMo: boolean; matMang: boolean };
type DongChan = { luc: string; ten: string; may: string | null; ly: "dang_xin" | "chua_cho" | "grow_chan"; yeuCau: string | null; phut: number | null };
export type HomNayDung = { ten: string; ngay: string; choi: { daDung: number; tongPhut: number; conPhut: number };
  hoc: { phut: number; khung: { tu: string; den: string } | null }; /** 15/11 (#262): phút nhóm «Không tính phút» hôm nay */ khongTinhPhut?: { phut: number };
  dung: DongDung[]; biChan: DongChan[] };

export const tenNgan = (may: string | null) => (may ?? "").replace(/ của .*$/, "");
/** Icon theo tên app (đủ cho các app hay gặp); web → «web». */
export function icDung(x: { ten: string; kieu: "app" | "web"; tinhGio: boolean }): TenIcon {
  if (x.kieu === "web") return "web";
  const t = x.ten.toLowerCase();
  if (/camera|máy ảnh|ảnh/.test(t)) return "camera";
  if (/điển|sách|đọc|book/.test(t)) return "sach";
  if (/aiirob|học|toán|khan|duolingo/.test(t)) return "may_tinh";
  return x.tinhGio ? "game" : "may_tinh";
}


/** Nhãn thời lượng một dòng «đã dùng» — MỘT kiểu cho Trang chủ (bm2-trang-chu .tag) và màn «<Con> đã dùng gì» (them-c95l1cwc):
 * mục Tính phút trừ sao, 1 phút = 1 sao ⇒ «−39 sao»; mục Không tính phút ⇒ «Không tính 10′» (không trừ sao). */
export const nhanDung = (x: { phut: number; tinhGio: boolean; chuaXep?: boolean }) =>
  x.chuaXep ? { chu: `Chưa xếp ${x.phut}′`, doc: `${x.phut} phút, chưa xếp nhóm, chưa trừ sao` } : x.tinhGio ? { chu: `${soVN(-x.phut)} sao`, doc: `trừ ${x.phut} sao` } : { chu: `Không tính ${x.phut}′`, doc: `${x.phut} phút, không trừ sao` };

/** Tiêu đề thẻ chính «Hôm nay» (#672): cùng nguồn phút đã chơi với «Đã dùng» — Con đã chơi phút nào thì không ghi «Chưa dùng máy». */
export function tieuTheChinh(o: { khoa: boolean; mo?: string | null; dangChoi?: string | null; daChoiPhut: number; gio?: (iso: string) => string }): string {
  if (o.khoa) return o.mo ? `Mở lại lúc ${(o.gio ?? ((x) => x))(o.mo)}` : "Khoá tới khi Ba Mẹ mở";
  if (o.dangChoi) return `Đang chơi ${o.dangChoi}`;
  return o.daChoiPhut > 0 ? `Đã dùng ${o.daChoiPhut} phút` : "Chưa dùng máy";
}
