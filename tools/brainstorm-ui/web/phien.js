// Phiên mật khẩu chung hết hạn / mật khẩu vừa đổi khi đang mở bàn: máy chủ trả 401 {canDangNhap}. KHÔNG tự chuyển trang (mất chữ đang gõ) —
// hiện một dải báo có nút «Đăng nhập lại» (mở tab mới; đăng nhập xong quay lại tab này là dùng tiếp, chữ đang gõ vẫn còn).
const goc = window.fetch.bind(window);
let daBao = false, imDen = 0;
function baoHetPhien() {
  if (daBao || Date.now() < imDen) return; daBao = true;
  const d = document.createElement('div');
  d.setAttribute('role', 'alert');
  d.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100% - 32px);display:flex;gap:12px;align-items:center;'
    + 'background:#f7f6f3;color:#0f1312;border-radius:22px;padding:12px 16px;font:600 14.5px Inter,system-ui,sans-serif;box-shadow:0 12px 16px -8px rgba(28,32,30,.4)';
  const t = document.createElement('span'); t.textContent = 'Phiên đăng nhập đã hết — chữ đang gõ vẫn còn. Đăng nhập lại ở tab mới rồi quay lại đây.';
  const a = document.createElement('a'); a.textContent = 'Đăng nhập lại'; a.target = '_blank'; a.rel = 'noopener';
  a.href = `/__dang-nhap?tiep=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
  a.style.cssText = 'flex:none;background:#0f6b5c;color:#fff;border-radius:16px;padding:8px 14px;text-decoration:none';
  a.addEventListener('click', () => { daBao = false; imDen = Date.now() + 90000; setTimeout(() => d.remove(), 300); }); // đang đăng nhập ở tab kia: im 90 giây
  d.append(t, a); (document.body || document.documentElement).append(d);
}
window.fetch = async (...a) => {
  const r = await goc(...a);
  if (r.status === 401) {
    try { const j = await r.clone().json(); if (j && j.canDangNhap) baoHetPhien(); } catch { /* không phải JSON của cổng */ }
  }
  return r;
};
// realtime.js gọi khi /ws bị từ chối: hỏi máy chủ phiên còn không (401 ⇒ dải báo ở trên)
window.__bsKiemPhien = () => { window.fetch('/__phien', { cache: 'no-store' }).catch(() => {}); };
