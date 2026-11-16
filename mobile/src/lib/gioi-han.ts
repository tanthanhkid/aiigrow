// #302 mục 4 «Giờ chơi»: GIỚI HẠN TỐI ĐA mỗi ngày (ngày thường / T7–CN) + «Mỗi lượt tối đa» — chơi vẫn trả bằng sao (1 sao = 1 phút).
// Hàm thuần (node --test) dùng chung cho màn Lần đầu (thiet-lap/gio) và «Giờ chơi» trong hồ sơ Con (ho-so/[id]/gio-choi).
// Cùng luật với máy chủ (server/lib/gioi-han-choi.ts): 0 = không giới hạn; ngày 10–720 phút; lượt 5–240 phút; nghỉ = đúng số phút một lượt.

/** Giá trị gửi / nhận máy chủ (phút; 0 = không giới hạn). */
export type GioiHan = { ngayThuong: number; cuoiTuan: number; moiLuot: number };

/** Chip giới hạn ngày (thiết kế bm1-ob-gio): «30p · T7, CN 60p» · «60p · T7, CN 90p» · «90p · T7, CN 120p» · «Tự chọn». */
export const MUC_NGAY: { ngay: number; cuoiTuan: number }[] = [{ ngay: 30, cuoiTuan: 60 }, { ngay: 60, cuoiTuan: 90 }, { ngay: 90, cuoiTuan: 120 }];
/** «Mỗi lượt tối đa»: Không giới hạn / 15p / 30p / 45p / 60p / Tự chọn. */
export const MUC_LUOT = [0, 15, 30, 45, 60] as const;
export const KHOANG_NGAY = { min: 10, max: 720 } as const;
export const KHOANG_LUOT = { min: 5, max: 240 } as const;
/** Mặc định Lần đầu: 60 phút ngày thường, 90 phút T7–CN, mỗi lượt không giới hạn (chip được chọn sẵn trên thiết kế). */
export const GIOI_HAN_MD: GioiHan = { ngayThuong: 60, cuoiTuan: 90, moiLuot: 0 };

/** Chip ngày đang chọn: chỉ số trong MUC_NGAY, hoặc "tu_chon" khi không khớp chip nào. */
export const chipNgay = (g: GioiHan): number | "tu_chon" => {
  const i = MUC_NGAY.findIndex((x) => x.ngay === g.ngayThuong && x.cuoiTuan === g.cuoiTuan);
  return i >= 0 ? i : "tu_chon";
};
export const chipLuot = (g: GioiHan): number | "tu_chon" => ((MUC_LUOT as readonly number[]).includes(g.moiLuot) ? g.moiLuot : "tu_chon");

/** Ô «Tự chọn»: chuỗi Ba Mẹ gõ ⇒ số phút (trống / 0 = không giới hạn) hoặc lỗi. */
export function docPhut(chu: string, k: { min: number; max: number }): { phut: number; loi: string | null } {
  const s = chu.replace(/\D/g, "");
  if (!s) return { phut: 0, loi: null };
  const n = Number(s);
  if (n === 0) return { phut: 0, loi: null };
  if (n < k.min || n > k.max) return { phut: n, loi: `Từ ${k.min} đến ${k.max} phút` };
  return { phut: n, loi: null };
}

/** Dòng giải thích dưới lựa chọn — khớp máy chủ (moTaGioiHan): «Mỗi ngày tối đa 60 phút · mỗi lượt 30 phút rồi nghỉ 30 phút · chơi bằng sao». */
export function moTaGioiHan(c: GioiHan): string {
  const ngay = !c.ngayThuong && !c.cuoiTuan ? "Mỗi ngày không giới hạn"
    : c.ngayThuong === c.cuoiTuan ? `Mỗi ngày tối đa ${c.ngayThuong} phút`
    : `Mỗi ngày tối đa ${c.ngayThuong ? `${c.ngayThuong} phút` : "không giới hạn"} (T7, CN ${c.cuoiTuan ? `${c.cuoiTuan} phút` : "không giới hạn"})`;
  const luot = c.moiLuot ? `mỗi lượt ${c.moiLuot} phút rồi nghỉ ${c.moiLuot} phút` : "mỗi lượt không giới hạn";
  return `${ngay} · ${luot} · chơi bằng sao`;
}

/** Hàng «Giờ chơi» trong hồ sơ Con: «60 phút/ngày» + «mỗi lượt 30 phút». */
export function tomTatGioiHan(c: GioiHan): { tren: string; duoi?: string } {
  const tren = !c.ngayThuong && !c.cuoiTuan ? "Không giới hạn" : c.ngayThuong === c.cuoiTuan || !c.cuoiTuan ? `${c.ngayThuong || "∞"} phút/ngày`
    : `${c.ngayThuong || "∞"} · T7, CN ${c.cuoiTuan} phút`;
  return { tren, ...(c.moiLuot ? { duoi: `mỗi lượt ${c.moiLuot} phút` } : {}) };
}

/** Thân gửi máy chủ (POST thiet-lap / con/<id>/gio-choi). */
export const thanGioiHan = (c: GioiHan) => ({ gioiHanNgayThuong: c.ngayThuong, gioiHanCuoiTuan: c.cuoiTuan, phutMoiLuot: c.moiLuot });

/** Khối `gioiHan` máy chủ gửi màn Con (kid/nha): «Còn 25 phút hôm nay» · «Nghỉ một chút · chơi tiếp lúc 16:30» · «Hôm nay đã chơi đủ…». */
export type GioiHanTre = { apDung: boolean; conNgay: number | null; dangNghi: boolean; nghiDen: string | null; nghiDenGio: string | null; hetNgay: boolean;
  lyDoKhoa: "het_gio_ngay" | "dang_nghi" | null; luotPhut: number | null; conLuot: number | null; cau: string | null };

/** Dòng cho màn Con điện thoại (/tre): null khi không có giới hạn. */
export function dongGioiHanTre(g: GioiHanTre | null | undefined): { tieu: string; phu?: string } | null {
  if (!g?.apDung) return null;
  if (g.dangNghi) return { tieu: `Đang nghỉ tới ${g.nghiDenGio ?? "lát nữa"}`, phu: `Nghỉ một chút · chơi tiếp lúc ${g.nghiDenGio ?? "lát nữa"}` };
  if (g.hetNgay) return { tieu: "Hôm nay chơi đủ rồi", phu: g.cau ?? "Mai chơi tiếp nhé" };
  const luot = g.luotPhut && g.conLuot !== null ? `Lượt này còn ${Math.floor(g.conLuot)} phút rồi nghỉ ${g.luotPhut} phút` : undefined;
  if (g.conNgay !== null) return { tieu: `Còn ${Math.floor(g.conNgay)} phút hôm nay`, ...(luot ? { phu: luot } : {}) };
  return luot ? { tieu: luot } : null;
}
