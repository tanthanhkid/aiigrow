// #705 / #700: số «hôm nay» của Con do MÁY CHỦ tính (server/lib/quy-gio.ts › soHomNay) — màn Ba Mẹ chỉ đọc, không tự tính lại
// từ giới hạn gốc + thứ trong tuần của điện thoại (bỏ sót sao Ba Mẹ cho vay, lệch múi giờ gia đình).
//   daChoi = phút «Tính phút» đã trừ sao hôm nay (số nguyên — cùng số máy Con, màn Màn hình)
//   tran   = giới hạn ngày hôm nay, ĐÃ cộng sao cho vay để chơi (null = không giới hạn)
//   con    = phút còn trong giới hạn ngày, đúng số máy Con khoá theo (null = không giới hạn)
//   goc    = giới hạn Ba Mẹ đặt cho thứ hôm nay (chưa cộng sao vay, còn khi «Mở hết») — vạch giới hạn biểu đồ tuần
export type SoHomNayMayChu = { daChoi?: number; gioiHanNgay?: number | null; conNgay?: number | null; gioiHanGoc?: number | null };

export function soHomNay(s: SoHomNayMayChu | null | undefined, daDungCu?: number) {
  const daChoi = Math.max(0, Math.round(Number(s?.daChoi ?? daDungCu ?? 0) || 0));
  const tran = s?.gioiHanNgay ?? null;
  // máy chủ cũ không gửi conNgay ⇒ không có giới hạn để hiện (không tự trừ từ trần gốc)
  const con = tran === null ? null : Math.max(0, Math.floor(Number(s?.conNgay ?? 0) || 0));
  return { daChoi, tran, con, goc: s?.gioiHanGoc ?? null };
}
