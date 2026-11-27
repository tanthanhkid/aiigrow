// #302 mục 4 «Giờ chơi»: GIỚI HẠN TỐI ĐA mỗi ngày (ngày thường / T7–CN) + «Mỗi lượt tối đa» — chơi vẫn trả bằng sao (1 sao = 1 phút).
// Hàm thuần (node --test) dùng chung cho màn Lần đầu (thiet-lap/gio) và «Giờ chơi» trong hồ sơ Con (ho-so/[id]/gio-choi).
// Cùng luật với máy chủ (server/lib/gioi-han-choi.ts): 0 = không giới hạn; ngày 10–720 phút; lượt 5–240 phút; nghỉ = đúng số phút một lượt.
import { chuPhut } from "./chu-phut.ts";
import { soNguyenGo } from "./so-nguyen.ts";

/** Giá trị gửi / nhận máy chủ (phút; 0 = không giới hạn). */
export type GioiHan = { ngayThuong: number; cuoiTuan: number; moiLuot: number };

export const KHOANG_NGAY = { min: 10, max: 720 } as const;
export const KHOANG_LUOT = { min: 5, max: 240 } as const;
/** Bước nút −/+ (phút). */
export const BUOC_PHUT = 15;
/** Mặc định Lần đầu (bàn bm1-ob-gio v21): 60 phút ngày thường, 90 phút T7–CN, chơi liền 30 phút rồi nghỉ 30 phút. */
export const GIOI_HAN_MD: GioiHan = { ngayThuong: 60, cuoiTuan: 90, moiLuot: 30 };
/** Con tick «Không cần nghỉ» rồi bỏ tick ⇒ quay về chừng này phút (khi chưa có số nào để nhớ). */
export const LUOT_MD = 30;

/** Ô số phút: chuỗi Ba Mẹ gõ ⇒ số phút hoặc lỗi. `batBuoc` (ô ngày — bàn v21 không có «không giới hạn»): trống / 0 là lỗi; không thì trống / 0 = không giới hạn (ô lượt). */
export function docPhut(chu: string, k: { min: number; max: number }, batBuoc = false): { phut: number; loi: string | null } {
  const loiKhoang = `Từ ${k.min} đến ${k.max} phút`;
  const s = soNguyenGo(chu);
  if (!s || Number(s) === 0) return { phut: 0, loi: batBuoc ? loiKhoang : null };
  const n = Number(s);
  if (n < k.min || n > k.max) return { phut: n, loi: loiKhoang };
  return { phut: n, loi: null };
}

/** Nút −/+ : cộng / trừ BUOC_PHUT, kẹp trong khoảng. Ô trống / 0 thì − và + đều về đầu khoảng (làm tròn bước 15 khi bấm +). */
export function buocPhut(n: number, huong: 1 | -1, k: { min: number; max: number }): number {
  if (!(n > 0)) return huong > 0 ? Math.max(k.min, BUOC_PHUT) : k.min;
  return Math.min(k.max, Math.max(k.min, n + huong * BUOC_PHUT));
}

/** Quy ra tiếng: 30 «nửa tiếng» · 60 «1 tiếng» · 90 «1 tiếng rưỡi» · 150 «2 tiếng rưỡi» · 45 «45 phút» · 75 «1 tiếng 15 phút». */
export function quyRaTieng(n: number): string {
  if (!(n > 0)) return "không giới hạn";
  const g = Math.floor(n / 60), p = n % 60;
  if (!g) return p === 30 ? "nửa tiếng" : `${p} phút`;
  return !p ? `${g} tiếng` : p === 30 ? `${g} tiếng rưỡi` : `${g} tiếng ${p} phút`;
}

/** Hàng «Giờ chơi» trong hồ sơ Con: «60 phút/ngày» + «mỗi lượt 30 phút». */
export function tomTatGioiHan(c: GioiHan): { tren: string; duoi?: string } {
  const tren = !c.ngayThuong && !c.cuoiTuan ? "Không giới hạn" : c.ngayThuong === c.cuoiTuan ? `${chuPhut(c.ngayThuong)}/ngày`
    : !c.cuoiTuan ? `${chuPhut(c.ngayThuong)} ngày thường · cuối tuần không giới hạn`
    : !c.ngayThuong ? `Ngày thường không giới hạn · cuối tuần ${chuPhut(c.cuoiTuan)}`
    : `Ngày thường ${chuPhut(c.ngayThuong)} · T7, CN ${chuPhut(c.cuoiTuan)}`;
  return { tren, ...(c.moiLuot ? { duoi: `mỗi lượt ${chuPhut(c.moiLuot)}` } : {}) };
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
  const luot = g.luotPhut && g.conLuot !== null ? `Lượt này còn ${chuPhut(Math.floor(g.conLuot))} rồi nghỉ ${chuPhut(g.luotPhut)}` : undefined;
  if (g.conNgay !== null) return { tieu: `Còn ${chuPhut(Math.floor(g.conNgay))} hôm nay`, ...(luot ? { phu: luot } : {}) };
  return luot ? { tieu: luot } : null;
}
