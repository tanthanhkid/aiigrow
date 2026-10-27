// Cổng mật khẩu chung của bàn brainstorm (qua tên miền). Không đọc tệp, không biết http của Node — server.mjs (Mac) và Worker Cloudflare
// (bật nodejs_compat cho node:crypto) dùng chung một logic.
// Phiên = cookie «bs_phien» = "<hạn ms>.<HMAC-SHA256(biMatPhien, 'v1|hạn|sha256(matKhau)')>": đổi mật khẩu hoặc biMatPhien ⇒ mọi phiên cũ hết hiệu lực.
// Không bao giờ ghi/in mật khẩu hay bí mật.
import crypto from 'node:crypto';

export const TEN_COOKIE = 'bs_phien';
export const HAN_PHIEN = 30 * 24 * 3600 * 1000; // 30 ngày
export const DUONG_DANG_NHAP = '/__dang-nhap';
export const DUONG_DANG_XUAT = '/__dang-xuat';
export const DUONG_PHIEN = '/__phien'; // 200 nếu phiên còn, 401 {canDangNhap} nếu hết — realtime.js hỏi khi /ws bị từ chối

const bam = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
const ky = (biMat, han, matKhau) => crypto.createHmac('sha256', String(biMat)).update(`v1|${han}|${bam(matKhau)}`).digest('base64url');
const bangNhau = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// Bật cổng khi đã đặt mật khẩu (≥8 ký tự) và bí mật phiên (≥32 ký tự)
export const congBat = (cq) => String(cq?.matKhau || '').length >= 8 && String(cq?.biMatPhien || '').length >= 32;

export function taoGiaTriPhien(cq, now = Date.now()) {
  const han = now + HAN_PHIEN;
  return `${han}.${ky(cq.biMatPhien, han, cq.matKhau)}`;
}

export function docCookie(tieuDe, ten = TEN_COOKIE) {
  for (const phan of String(tieuDe || '').split(';')) {
    const i = phan.indexOf('='); if (i < 0) continue;
    if (phan.slice(0, i).trim() === ten) return phan.slice(i + 1).trim();
  }
  return '';
}

export function phienHopLe(cq, giaTri, now = Date.now()) {
  if (!congBat(cq)) return false;
  const m = /^(\d{13,15})\.([A-Za-z0-9_-]{40,60})$/.exec(String(giaTri || ''));
  if (!m) return false;
  const han = Number(m[1]);
  if (!(han > now) || han - now > HAN_PHIEN + 60000) return false;
  return bangNhau(m[2], ky(cq.biMatPhien, han, cq.matKhau));
}

export const cookieDat = (giaTri) => `${TEN_COOKIE}=${giaTri}; Path=/; Max-Age=${Math.floor(HAN_PHIEN / 1000)}; HttpOnly; Secure; SameSite=Lax`;
export const cookieXoa = () => `${TEN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

// «tiep» sau đăng nhập: chỉ đường nội bộ một gạch đầu (chặn //host, /\host, http:)
export function tiepAnToan(s) {
  const t = String(s || '/');
  return /^\/(?![\/\\])[^\s\\]*$/.test(t) && t.length <= 600 && !t.startsWith(DUONG_DANG_NHAP) ? t : '/';
}

// Đường KHÔNG qua cổng: trang đăng nhập/xuất; /mcp tự kiểm (Bearer maMcp hoặc cookie); /__mcp/trang chỉ loopback (tự kiểm)
export const duongMien = (p) => p === DUONG_DANG_NHAP || p === DUONG_DANG_XUAT || p === DUONG_PHIEN || p === '/mcp' || p.startsWith('/__mcp/trang/');

// Chưa đăng nhập: trang (GET đòi HTML) ⇒ chuyển tới đăng nhập; còn lại ⇒ 401 JSON
export const muonTrang = (method, accept) => (method === 'GET' || method === 'HEAD') && /text\/html/.test(String(accept || ''));

export const CSP_DANG_NHAP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

const thoat = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function trangDangNhap({ loi = '', tiep = '/' } = {}) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bàn brainstorm AiiGrow</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap">
<style>
:root{--nen:#ecebe7;--the:#f7f6f3;--chu:#0f1312;--chu3:#565c59;--chinh:#0f6b5c;--loi:#b42318;
--clay:0 22px 30px -14px rgba(28,32,30,.38),0 6px 10px -5px rgba(28,32,30,.22),inset 0 1.5px 0 #fff,inset 0 -10px 16px -8px rgba(40,44,42,.14);
--lomIn:inset 0 4px 8px rgba(40,44,42,.14),inset 0 -1.5px 0 rgba(255,255,255,.95)}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--nen);font-family:Inter,system-ui,sans-serif;color:var(--chu);-webkit-font-smoothing:antialiased}
form{width:100%;max-width:380px;background:var(--the);border-radius:32px;box-shadow:var(--clay);padding:32px 24px;display:flex;flex-direction:column;gap:16px}
h1{font-size:22px;font-weight:800}
p{color:var(--chu3);font-size:15px;line-height:1.45}
label{font-weight:700;font-size:14px}
input{width:100%;min-height:52px;border:0;border-radius:18px;background:#e9e8e3;box-shadow:var(--lomIn);padding:0 16px;font:500 16px Inter,system-ui,sans-serif;color:var(--chu)}
input:focus{outline:3px solid rgba(15,107,92,.35);outline-offset:2px}
button{min-height:52px;border:0;border-radius:22px;background:var(--chinh);color:#fff;font:700 16px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 12px 16px -8px rgba(15,107,92,.5),inset 0 1.5px 0 rgba(255,255,255,.35)}
button:focus-visible{outline:3px solid rgba(15,107,92,.45);outline-offset:3px}
.loi{color:var(--loi);font-weight:700;font-size:14px}
</style></head><body>
<form method="post" action="${DUONG_DANG_NHAP}">
<h1>Bàn brainstorm AiiGrow</h1>
<p>Nhập mật khẩu chung của nhóm để vào bàn.</p>
<label for="mk">Mật khẩu</label>
<input id="mk" name="mat_khau" type="password" autocomplete="current-password" required autofocus>
<input type="hidden" name="tiep" value="${thoat(tiepAnToan(tiep))}">
${loi ? `<div class="loi" role="alert">${thoat(loi)}</div>` : ''}
<button type="submit">Vào bàn</button>
</form></body></html>`;
}
