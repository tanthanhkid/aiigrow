// Đẩy lỗi hệ thống lên Sentry (instrumentation.ts khởi tạo). Không có SENTRY_DSN ⇒ không làm gì, không nạp thư viện (test chạy nhẹ).
import { after } from "next/server";

export function baoLoiHeThong(e: unknown) {
  if (!process.env.SENTRY_DSN) return;
  const gui = async () => {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(e);
    await Sentry.flush(2000);
  };
  // serverless (Vercel): after() giữ hàm sống tới khi gửi xong; ngoài request (script) thì gửi thẳng
  try { after(gui); } catch { void gui().catch(() => {}); }
}
