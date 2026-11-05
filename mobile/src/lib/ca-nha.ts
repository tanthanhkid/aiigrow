// Dữ liệu tab «Cả nhà» (thiết kế chốt bm-cai-dat/01 «Gia đình» = 03 «Tab Cả nhà»): người lớn + lời mời đang chờ (2 quyền S2), các con,
// máy đã ghép, cài đặt chung. Một hàm tải cho cả màn tab lẫn màn Thành viên. Chỉ THÊM — napGiaDinh (tab-ba-me.ts) giữ nguyên cho chỗ gọi cũ.
import { bm, type GiaDinh, type TuanThuMay } from "./api";

export type Quyen = "ba_me" | "trong_giup";
export const TEN_QUYEN: Record<Quyen, string> = { ba_me: "Ba Mẹ", trong_giup: "Người trông giúp" };
export const MO_TA_QUYEN: Record<Quyen, string> = {
  ba_me: "Làm được hết: duyệt, khoá máy, đổi cài đặt",
  trong_giup: "Xem, duyệt, khoá máy — không đổi cài đặt",
};
/** Icon mỗi quyền (dùng ở danh sách người lớn và màn mời). */
export const IC_QUYEN = { ba_me: "nha", trong_giup: "mat" } as const;

export type NguoiLon = { id: string; ten: string; quyen: Quyen; tenQuyen: string; laChuNha: boolean; dinh_danh: string; laToi: boolean };
export type LoiMoiCho = { id: string; quyen: Quyen; tenGoi: string | null; dinhDanh: string | null; het: string; guiLuc: string };
export type DsThanhVien = { ds: NguoiLon[]; loiMoi: LoiMoiCho[]; toi: { id: string; quyen: Quyen; laChuNha: boolean }; hanGio: number };
export type ToiCaNha = { baMe: { id: string; ten: string; dinhDanh: string; quyen?: Quyen; laChuNha?: boolean; vai: string }; laAdmin?: boolean };

export const KHOA_CA_NHA = "tab:ca-nha";
export const napCaNha = async () => {
  const [toi, g, tv, may, tb, qua] = await Promise.all([
    bm.goi<ToiCaNha>("toi"), bm.goi<GiaDinh>("gia-dinh"), bm.goi<DsThanhVien>("thanh-vien"),
    bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null),
    bm.goi<{ tat: string[] }>("thong-bao/cai-dat").catch(() => null),
    bm.goi<{ ds: { id: string; loai: string; bat: boolean }[] }>("qua").catch(() => null),
  ]);
  return { toi, g, tv, may: may?.ds ?? null, tatTb: tb?.tat ?? null, soQua: qua ? qua.ds.filter((x) => x.loai !== "voucher" && x.bat).length : null };
};

/** «Mẹ Lan» → «L»: chữ cái cuối tên (như Avt). */
export const chuDau = (ten: string) => (ten.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase();
/** Tên hiện của lời mời: tên gọi đã đặt, không thì SĐT / email. */
export const tenMoi = (m: Pick<LoiMoiCho, "tenGoi" | "dinhDanh">) => m.tenGoi || m.dinhDanh || "Người được mời";
