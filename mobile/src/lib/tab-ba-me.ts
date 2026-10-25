// Dữ liệu ba tab Ba Mẹ (Chờ duyệt · Nhiệm vụ & quà · Gia đình): MỘT hàm tải cho cả màn tab lẫn nạp trước ở app/(tab)/_layout.tsx
// (mở tab lần đầu là có nội dung, trượt vào không chớp khung xương). Khoá `KHOA_TAB` là khoá nhớ của useTai.
import { bm, laChiXem, type AppChuaXep, type GiaDinh, type LuotCho, type NhiemVu, type Qua, type YeuCau } from "./api";
import type { Phieu } from "./viec-cho";

export const KHOA_TAB = { choDuyet: "tab:cho-duyet", diemQua: "tab:diem-qua", giaDinh: "tab:gia-dinh" } as const;

export type TuDong = { id: string; ten_con: string; ten: string; diem: number; nguon: string; ghi_chu: string | null };
export const napChoDuyet = async () => {
  const [cd, luat, toi] = await Promise.all([
    bm.goi<{ nhiemVu: LuotCho[]; yeuCau: YeuCau[]; phieu?: Phieu[]; tuDong?: TuDong[] }>("cho-duyet"),
    bm.goi<{ chuaXep: AppChuaXep[] }>("luat").catch(() => null),         // app mới chưa xếp loại cũng là việc chờ Ba Mẹ (issue #70 §2.3)
    laChiXem(),
  ]);
  return { ...cd, appMoi: luat?.chuaXep ?? [], xem: toi };
};

export type PhieuDoi = { id: string; ten: string; loai: "voucher" | "qua" | "dac_quyen" | "tiet_kiem"; diem: number; ten_con: string; created_at: string };
export const napDiemQua = async () => {
  const [nv, qua, quy, phieu, xem] = await Promise.all([bm.goi<{ ds: NhiemVu[] }>("nhiem-vu"), bm.goi<{ ds: Qua[] }>("qua"), bm.goi<{ soDu: number }>("quy"),
    bm.goi<{ ds: PhieuDoi[] }>("phieu"), laChiXem()]);
  return { nv: nv.ds, qua: qua.ds, quy, phieu: phieu.ds, xem };
};

export type VaiBaMe = "chu" | "duyet" | "xem";
export type ToiBaMe = { baMe: { id: string; ten: string; dinhDanh: string; vai: VaiBaMe }; laAdmin?: boolean };
export const napGiaDinh = async () => {
  const [toi, g, tv] = await Promise.all([bm.goi<ToiBaMe>("toi"), bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: { id: string; ten: string; vai: VaiBaMe }[] }>("thanh-vien")]);
  return { toi, g, tv: tv.ds };
};
