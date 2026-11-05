// Giữ thông tin đăng ký giữa màn Số điện thoại và màn Mã xác thực (trong bộ nhớ — không ghi mật khẩu xuống máy).
// `moi` (thiết kế 05/11): token link mời ⇒ tạo tài khoản bằng `moi/dang-ky`; `duocMoi` = nhánh «Tôi được mời vào nhà» không có link
// (đăng ký thường, rồi xem lời mời gửi tới số này — `moi/cho-toi`). `tenNha` = tên người mời để ghi «Vào nhà cùng …».
type DangKy = { dinhDanh: string; ten: string; matKhau: string; maThu?: string; moi?: string; duocMoi?: boolean; tenNha?: string };
let nho: DangKy | null = null;
export const nhoDangKy = (d: DangKy) => { nho = d; };
export const layDangKy = () => nho;
export const xoaDangKy = () => { nho = null; };
/** Tên gọi mặc định khi đăng ký: thiết kế bỏ ô tên (chỉ SĐT + mật khẩu) mà máy chủ cần tên ⇒ «Ba Mẹ», đổi sau ở Tài khoản. */
export const TEN_MAC_DINH = "Ba Mẹ";
