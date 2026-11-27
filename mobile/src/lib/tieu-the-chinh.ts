import { chuPhut } from "./chu-phut.ts";
/** Tiêu đề thẻ chính «Hôm nay» (#672): cùng nguồn phút đã chơi với «Đã dùng» — Con đã chơi phút nào thì không ghi «Chưa dùng máy». */
export function tieuTheChinh(o: { khoa: boolean; mo?: string | null; dangChoi?: string | null; daChoiPhut: number; gio?: (iso: string) => string }): string {
  if (o.khoa) return o.mo ? `Đang khoá tới ${(o.gio ?? ((x) => x))(o.mo)}` : "Đang khoá tới khi Ba Mẹ mở";
  if (o.dangChoi) return `Đang chơi ${o.dangChoi}`;
  return o.daChoiPhut > 0 ? `Đã dùng ${chuPhut(o.daChoiPhut)}` : "Chưa dùng máy";
}
