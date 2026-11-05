// Dữ liệu tab «Nhiệm vụ» (thiết kế chốt 05/11 bm-hang-ngay/36): MỘT hàm tải cho màn (tab)/diem-qua và nạp trước ở app/(tab)/_layout.tsx.
// Không gọi GET quy (quỹ phiếu AiiCafe — 410 từ 05/11). Sao + «đổi được P phút» lấy từ gia-dinh › con[] (soDu, phutDoiDuoc).
import { bm, type GiaDinh } from "./api";
import { quyenToi, type ChoDuyetMoi, type NhiemVuMoi, type Quyen } from "./hang-ngay";

export const KHOA_NV_TAB = "tab:nhiem-vu";

export type NvTab = { g: GiaDinh; nv: NhiemVuMoi[]; cd: ChoDuyetMoi; quyen: Quyen };
export const napNvTab = async (): Promise<NvTab> => {
  const [g, nv, cd, quyen] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu"), bm.goi<ChoDuyetMoi>("cho-duyet"), quyenToi()]);
  return { g, nv: nv.ds, cd, quyen };
};

/** Việc của một Con: đang bật và giao riêng cho Con đó hoặc cả nhà. */
export const viecCuaCon = (ds: NhiemVuMoi[], con: string) => ds.filter((x) => x.bat && (x.giao_cho === con || x.giao_cho === null));

/** Tên bộ theo mã (`tasks.bo`) — khớp server/lib/bo-nhiem-vu.ts. */
export const TEN_BO: Record<string, string> = { tu_lap: "Tự lập", viec_nha: "Phụ việc nhà", hoc_tap: "Học tập", khoe_manh: "Khoẻ mạnh" };
