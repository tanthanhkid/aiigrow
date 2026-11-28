// Dữ liệu «<Con> đã dùng gì» hôm nay (GET con/:id/hom-nay — server/lib/hom-nay-dung.ts): dùng ở màn /da-dung/[con] (them-c95l1cwc)
// và mục «<Con> đã dùng gì hôm nay» của Trang chủ (bm2-trang-chu@v35).
import type { TenIcon } from "./ui";
import { soVN } from "./so-sao";

type DongDung = { luc: string | null; ten: string; muc: string; kieu: "app" | "web"; may: string | null; nen: string | null; mayId: string | null;
  phut: number; tinhGio: boolean; chuaXep?: boolean; dangMo: boolean; matMang: boolean;
  /** #810: sao ĐÃ TRỪ thật cho mục này hôm nay (sổ sao máy chủ) — máy chủ cũ không gửi ⇒ ước 1 phút = 1 sao */ sao?: number };
type DongChan = { luc: string; ten: string; may: string | null; ly: "dang_xin" | "chua_cho" | "grow_chan"; yeuCau: string | null; phut: number | null };
export type HomNayDung = { ten: string; ngay: string;
  /** daDung (phút đo, số lẻ — cũ) · daChoi / gioiHanNgay / conNgay: số «hôm nay» máy chủ tính (#705, #700 — lib/so-hom-nay) */
  choi: { daDung: number; tongPhut: number; conPhut: number; daChoi?: number; gioiHanNgay?: number | null; conNgay?: number | null };
  /** #704: số mục đã dùng cả ngày (`dung` chỉ 50 dòng mới nhất) */ soDung?: number;
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
 * mục Tính phút ⇒ «−39 sao» (sao trừ thật = phút); sao trừ khác phút đo (chơi song song / hết sao không trừ thêm) ⇒ «16′ · −9 sao» — cùng cặp số app Con
 * «16 phút · −9 sao» (#810); mục Không tính phút ⇒ «Không tính 10′» (không trừ sao). Máy chủ cũ không gửi `sao` ⇒ ước 1 phút = 1 sao. */
export function nhanDung(x: { phut: number; tinhGio: boolean; chuaXep?: boolean; sao?: number }) {
  const sao = typeof x.sao === "number" ? x.sao : x.tinhGio && !x.chuaXep ? x.phut : 0;
  if (sao > 0 || x.tinhGio && !x.chuaXep) {
    // lệch ≤ 1 là phần lẻ phút (sổ trừ đủ phút nguyên) ⇒ vẫn một số «−N sao»; không trừ gì (Mở hết / mở bằng mã) ⇒ «N′ · không trừ sao»
    if (sao <= 0) return { chu: `${x.phut}′ · không trừ sao`, doc: `${x.phut} phút, không trừ sao` };
    return Math.abs(sao - x.phut) <= 1 ? { chu: `${soVN(-sao)} sao`, doc: `trừ ${sao} sao` } : { chu: `${x.phut}′ · ${soVN(-sao)} sao`, doc: `${x.phut} phút, trừ ${sao} sao` };
  }
  return x.chuaXep ? { chu: `Chưa xếp ${x.phut}′`, doc: `${x.phut} phút, chưa xếp nhóm, chưa trừ sao` } : { chu: `Không tính ${x.phut}′`, doc: `${x.phut} phút, không trừ sao` };
}
