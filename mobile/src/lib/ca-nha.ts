// Dữ liệu tab «Cả nhà» (thiết kế chốt bm-cai-dat/01 «Gia đình» = 03 «Tab Cả nhà»): người lớn + lời mời đang chờ (2 quyền S2), các con,
// máy đã ghép, cài đặt chung. Một hàm tải cho cả màn tab lẫn màn Thành viên. Chỉ THÊM — napGiaDinh (tab-ba-me.ts) giữ nguyên cho chỗ gọi cũ.
import { bm, type GiaDinh, type TuanThuMay } from "./api";

export type Quyen = "ba_me" | "trong_giup";
// #492 (bàn bm2-thanh-vien / them-0uobhmvh): hai vai người lớn «Như Ba Mẹ» · «Chỉ trông con». Máy chủ chặn thật việc của vai Chỉ trông con (lib/quyen.ts).
export const TEN_QUYEN: Record<Quyen, string> = { ba_me: "Như Ba Mẹ", trong_giup: "Chỉ trông con" };
export const MO_TA_QUYEN: Record<Quyen, string> = {
  ba_me: "Làm được mọi việc",
  trong_giup: "Xem, duyệt việc, cho vay sao",
};
/** Hàng ✓ / ✕ dưới hai thẻ vai (bàn): Chỉ trông con không đổi luật, không mua quà. */
export const VIEC_QUYEN: { chu: string; baMe: boolean; trongGiup: boolean }[] = [
  { chu: "Xem con chơi", baMe: true, trongGiup: true },
  { chu: "Duyệt việc", baMe: true, trongGiup: true },
  { chu: "Cho vay sao", baMe: true, trongGiup: true },
  { chu: "Đổi luật", baMe: true, trongGiup: false },
  { chu: "Mua quà", baMe: true, trongGiup: false },
];
/** Icon mỗi quyền (dùng ở danh sách người lớn và màn mời). */
export const IC_QUYEN = { ba_me: "khien", trong_giup: "mat" } as const;

export type NguoiLon = { id: string; ten: string; quyen: Quyen; tenQuyen: string; laChuNha: boolean; dinh_danh: string; laFacebook?: boolean; laToi: boolean;
  /** lúc vào nhà (máy chủ 14/11 — «Vào nhà từ 20/10»); máy chủ cũ không có */ vaoLuc?: string };
export type LoiMoiCho = { id: string; quyen: Quyen; tenGoi: string | null; dinhDanh: string | null; het: string; guiLuc: string };
export type DsThanhVien = { ds: NguoiLon[]; loiMoi: LoiMoiCho[]; toi: { id: string; quyen: Quyen; laChuNha: boolean }; hanGio: number };
export type ToiCaNha = { baMe: { id: string; ten: string; dinhDanh: string; quyen?: Quyen; laChuNha?: boolean; vai: string; coMatKhau?: boolean }; laAdmin?: boolean };

export const KHOA_CA_NHA = "tab:ca-nha";
export const napCaNha = async () => {
  const [toi, g, tv, may, tb, qua] = await Promise.all([
    bm.goi<ToiCaNha>("toi"), bm.goi<GiaDinh>("gia-dinh"), bm.goi<DsThanhVien>("thanh-vien"),
    bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null),
    bm.goi<{ tat: string[] }>("thong-bao/cai-dat").catch(() => null),
    bm.goi<{ ds: { id: string; loai: string; bat: boolean }[] }>("qua").catch(() => null),
  ]);
  return { toi, g, tv, may: may?.ds ?? null, tatTb: tb?.tat ?? null, soQua: qua ? qua.ds.filter((x) => x.bat).length : null };
};

/** «Mẹ Lan» → «L»: chữ cái cuối tên (như Avt). */
export const chuDau = (ten: string) => (ten.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase();
/** Tên hiện của lời mời: tên gọi đã đặt, không thì SĐT / email. */
export const tenMoi = (m: Pick<LoiMoiCho, "tenGoi" | "dinhDanh">) => m.tenGoi || m.dinhDanh || "Người được mời";
