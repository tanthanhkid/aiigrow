// Phiên mật khẩu chung hết hạn/đổi mật khẩu khi đang mở bàn: máy chủ trả 401 {canDangNhap} ⇒ về trang đăng nhập rồi quay lại đúng chỗ.
const goc = window.fetch.bind(window);
let dangChuyen = false;
window.fetch = async (...a) => {
  const r = await goc(...a);
  if (r.status === 401 && !dangChuyen) {
    try {
      const j = await r.clone().json();
      if (j && j.canDangNhap) { dangChuyen = true; location.href = `/__dang-nhap?tiep=${encodeURIComponent(location.pathname + location.search)}`; }
    } catch { /* không phải JSON của cổng */ }
  }
  return r;
};
