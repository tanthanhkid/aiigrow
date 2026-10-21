// Tạo / cập nhật tài khoản nội bộ (Admin AiiLab, Nhân viên AiiCafe). Mật khẩu CHỈ đọc từ biến môi trường — không ghi vào mã, log hay PR.
//   DATABASE_URL=… (hoặc PGLITE_DIR=…) \
//   AIIGROW_ADMIN_TEN=admin AIIGROW_ADMIN_MAT_KHAU=… AIIGROW_ADMIN_HIEN="AiiLab" \
//   AIIGROW_QUAY_TEN=quay1 AIIGROW_QUAY_MAT_KHAU=… AIIGROW_QUAY_HIEN="Thu" AIIGROW_QUAY_SO="Quầy 1" \
//   pnpm tao-tai-khoan
// Chỉ tạo nhóm nào có đủ tên + mật khẩu. Chạy lại với mật khẩu mới = đổi mật khẩu (đăng xuất mọi phiên của tài khoản đó).
import { datTaiKhoan } from "../lib/admin.ts";

const e = process.env;
let n = 0;
if (e.AIIGROW_ADMIN_TEN && e.AIIGROW_ADMIN_MAT_KHAU) {
  await datTaiKhoan({ tenDangNhap: e.AIIGROW_ADMIN_TEN, matKhau: e.AIIGROW_ADMIN_MAT_KHAU, ten: e.AIIGROW_ADMIN_HIEN || "AiiLab", vai: "admin" });
  console.log(`admin: ${e.AIIGROW_ADMIN_TEN}`); n++;
}
if (e.AIIGROW_QUAY_TEN && e.AIIGROW_QUAY_MAT_KHAU) {
  await datTaiKhoan({ tenDangNhap: e.AIIGROW_QUAY_TEN, matKhau: e.AIIGROW_QUAY_MAT_KHAU, ten: e.AIIGROW_QUAY_HIEN || "Nhân viên", vai: "quay",
    quay: e.AIIGROW_QUAY_SO || "Quầy 1" });
  console.log(`quầy: ${e.AIIGROW_QUAY_TEN} (${e.AIIGROW_QUAY_SO || "Quầy 1"})`); n++;
}
if (!n) { console.error("Thiếu biến môi trường: AIIGROW_ADMIN_TEN + AIIGROW_ADMIN_MAT_KHAU và/hoặc AIIGROW_QUAY_TEN + AIIGROW_QUAY_MAT_KHAU"); process.exit(1); }
process.exit(0);
