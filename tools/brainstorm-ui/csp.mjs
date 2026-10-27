// Content-Security-Policy của trang bàn brainstorm — dùng chung cho Mac (ung-dung.mjs) và Worker Cloudflare (cf/worker.mjs).
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' data: blob: https://api.anthropic.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "frame-src 'self' about: data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

// connect-src thêm ws(s):// đúng host đang truy cập cho lớp realtime.
export const cspChoHost = (h = '') => (/^[\w.-]+(:\d+)?$/.test(h) ? CSP.replace("connect-src 'self'", `connect-src 'self' ws://${h} wss://${h}`) : CSP);
