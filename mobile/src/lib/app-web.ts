// «App & web» 15/11 (#262 / #258, máy chủ PR #270 — docs/API.md › «App & web 15/11»): mỗi Con một chế độ «Mở hết» (không chặn, không tính phút)
// hoặc «Theo danh sách» (danh sách trắng). Mỗi mục trong danh sách đúng một nhóm: «Tính phút» (trả bằng sao · 1 sao = 1 phút) / «Không tính phút»
// (vào thoải mái). Lời xin app / web = xin thêm vào danh sách: Tính phút / Không tính phút / Bỏ qua (Hoàn tác 60 giây). Không còn «chặn».
import { bm } from "./api";
import type { BoQua, CheDo, DanhSach, DongDs, Kieu, Nhom } from "./app-web-chu";

export * from "./app-web-chu";

export const napDanhSach = (con: string) => bm.goi<DanhSach>(`con/${con}/danh-sach`);

export const doiCheDo = (con: string, cheDo: CheDo) => bm.goi<{ cheDo: CheDo; ten: string }>(`con/${con}/che-do`, { cheDo });
export type MucThem = { nhom: Nhom; ma?: string; ten?: string; muc?: string; kieu?: Kieu };
export const themVaoDs = (con: string, ds: MucThem[]) => bm.goi<{ daDat: { ten: string; muc: string[]; nhom: Nhom }[]; choKhop: string[] }>(`con/${con}/danh-sach`, { ds });
/** Đổi nhóm / bỏ một hàng: gửi đủ `muc[]`; hàng chờ khớp theo tên (chưa có `muc`) gửi `ten`. */
export const doiNhom = (con: string, h: Pick<DongDs, "muc" | "ten" | "choKhop">, nhom: Nhom) =>
  bm.goi(`con/${con}/danh-sach/doi`, { muc: h.muc, nhom, ...(h.choKhop ? { ten: h.ten } : {}) });
export const boKhoiDs = (con: string, h: Pick<DongDs, "muc" | "ten" | "choKhop">) =>
  bm.goi<{ bo: number }>(`con/${con}/danh-sach/bo`, { muc: h.muc, ...(h.choKhop ? { ten: h.ten } : {}) });

/** Lời xin app / web ⇒ thêm LÂU DÀI vào danh sách, đúng nhóm. */
export const themTuXin = (id: string, nhom: Nhom, loiNhan?: string) => bm.goi<{ nhom: Nhom; muc: string }>(`yeu-cau/${id}/dong-y`, { nhom, ...(loiNhan ? { loiNhan } : {}) });
/** «Bỏ qua»: không ghi gì, Con xin lại được; Hoàn tác được tới `hoanTacDen` (60 giây). */
export const boQuaXin = (id: string) => bm.goi<{ ok: boolean; hoanTacDen: string }>(`yeu-cau/${id}/bo-qua`, {});
export const hoanTacXin = (id: string) => bm.goi(`yeu-cau/${id}/hoan-tac`, {});
export const napBoQua = (con?: string) => bm.goi<{ ds: BoQua[] }>(`yeu-cau/bo-qua${con ? `?con=${con}` : ""}`);
export const themLuon = (id: string, nhom: Nhom) => bm.goi<{ nhom: Nhom; muc: string }>(`yeu-cau/${id}/them-luon`, { nhom });

