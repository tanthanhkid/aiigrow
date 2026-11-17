// Phần THUẦN của «App & web» 15/11 (#262 / #258) — tên chế độ / nhóm, kiểu dữ liệu GET con/:id/danh-sach, câu phụ một hàng. Không gọi mạng (test: app-web-chu.test.ts).

export type CheDo = "theo_danh_sach" | "mo_het";
export type Nhom = "tinh_phut" | "khong_tinh_phut";
export type Kieu = "app" | "web";

export const TEN_CHE_DO: Record<CheDo, string> = { mo_het: "Mở hết", theo_danh_sach: "Theo danh sách" };
export const IC_CHE_DO = { mo_het: "mo_khoa", theo_danh_sach: "khien" } as const;
export const TEN_NHOM: Record<Nhom, string> = { tinh_phut: "Tính phút", khong_tinh_phut: "Không tính phút" };
/** Câu phụ của một nhóm (thiết kế: «Trả bằng sao · 1 sao = 1 phút» / «Vào thoải mái»). */
export const PHU_NHOM: Record<Nhom, string> = { tinh_phut: "Trả bằng sao · 1 sao = 1 phút", khong_tinh_phut: "Vào thoải mái" };
/** Chấm màu của nhóm (MỘT bộ với nút «Tính phút» / «Không tính phút» ở yeu-cau-web): Tính phút = M.chamTinh #A94A07 (4,5:1 trên kem #ECE4D9) · Không tính phút = M.chamKhong #3F7D1F (4,0:1). */
// chép giá trị từ mau.ts (M.chamTinh / M.chamKhong): tệp chạy thẳng bằng node --test, không nạp mau.ts — đổi một bên phải đổi cả bên kia
export const MAU_NHOM: Record<Nhom, string> = { tinh_phut: "#A94A07", khong_tinh_phut: "#3F7D1F" };

/** Giá trị cũ của máy chủ (`chi_app_duoc_phep`, null) ⇒ «Theo danh sách». */
export const cheDoTu = (x: { cheDo?: string | null; cheDoChan?: string | null } | null | undefined): CheDo =>
  (x?.cheDo ?? x?.cheDoChan) === "mo_het" ? "mo_het" : "theo_danh_sach";

export type DongDs = { ten: string; kieu: Kieu; nhom: Nhom; muc: string[]; phutHomNay: number; theoCaNha: boolean; choKhop?: boolean };
export type XinDs = { id: string; loai: "mo_web" | "cai_app"; kieu: Kieu; muc: string | null; ten: string | null; lyDo: string | null; luc: string; may: string | null };
export type DanhSach = {
  con: { id: string; ten: string }; cheDo: CheDo; tenCheDo: string; tamNghi: boolean;
  app: { tinhPhut: DongDs[]; khongTinhPhut: DongDs[] }; web: { tinhPhut: DongDs[]; khongTinhPhut: DongDs[] };
  soMuc: { app: number; web: number; tinhPhut: number }; dangXin: XinDs[]; boQua: { so: number };
};
export type BoQua = { id: string; con: string; tenCon: string; loai: string; kieu: Kieu; muc: string | null; ten: string | null; lyDo: string | null; luc: string;
  nguoiBoQua: string | null; may: string | null };

/** Mọi hàng của một kiểu (Tính phút trước). */
export const hangCua = (d: DanhSach, kieu: Kieu) => [...d[kieu].tinhPhut, ...d[kieu].khongTinhPhut];

/** «Hôm nay trừ 39 phút · −39 sao» (Tính phút) / «Hôm nay 25 phút» (Không tính phút) / «Hôm nay chưa dùng». */
export const phuHomNay = (h: Pick<DongDs, "nhom" | "phutHomNay" | "choKhop">, web?: boolean) =>
  h.choKhop ? "Chờ máy của con báo app này" : !h.phutHomNay ? `Hôm nay chưa ${web ? "vào" : "dùng"}`
    : h.nhom === "tinh_phut" ? `Hôm nay trừ ${h.phutHomNay} phút · −${h.phutHomNay} sao` : `Hôm nay ${h.phutHomNay} phút`;
