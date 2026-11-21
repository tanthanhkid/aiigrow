// #524: một món quà chỉ thuộc MỘT nhóm trên /vi/qua. Món có mẫu thuộc nhóm «Ba Mẹ mua» (kể cả quà vật lý như Lego,
// loai "qua" nhưng đếm số lượng) KHÔNG được rơi thêm vào «Quà nhà» — Quà nhà không đếm số lượng.
type Mon = { id: string; loai: string; mau: string | null; bat: boolean };

/** Quà nhà = dòng đang bật, không phải voucher, và không ứng với mẫu nào của nhóm «Ba Mẹ mua». */
export function quaNha<T extends Mon>(ds: T[], maBaMeMua: Iterable<string>): T[] {
  const mua = new Set(maBaMeMua);
  return ds.filter((x) => x.bat && x.loai !== "voucher" && !(x.mau && mua.has(x.mau)));
}
