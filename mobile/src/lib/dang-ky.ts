// Giữ thông tin đăng ký giữa màn Số điện thoại và màn Mã xác thực (trong bộ nhớ — không ghi mật khẩu xuống máy).
type DangKy = { dinhDanh: string; ten: string; matKhau: string; maThu?: string };
let nho: DangKy | null = null;
export const nhoDangKy = (d: DangKy) => { nho = d; };
export const layDangKy = () => nho;
export const xoaDangKy = () => { nho = null; };
