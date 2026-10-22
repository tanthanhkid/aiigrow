// Sentry phía máy chủ (Thanh 22/10: «nối aiigrow vô sentry của tôi» — org minicmo, project aiigrow-server).
// Không có SENTRY_DSN (máy dev, test, preview chưa đặt) ⇒ không nạp gì. Chỉ lỗi hệ thống (500) — lỗi nghiệp vụ 4xx không đẩy (gây nhiễu).
export async function register() {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

export async function onRequestError(...a: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  (Sentry.captureRequestError as (...x: unknown[]) => void)(...a);
}
