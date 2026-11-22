// Kiểm khi khởi động (instrumentation.ts): mã OTP thử trả thẳng trong phản hồi ⇒ ai cũng đăng ký / chiếm định danh bất kỳ.
// production + AIIGROW_OTP_THU=1 ⇒ từ chối chạy. Ngoại lệ duy nhất: bộ pha giao diện (scripts/pha-web.mjs, đặt AIIGROW_PHA=1) chạy `next start` với DB tạm.
export function kiemOtpThu(env: Record<string, string | undefined> = process.env) {
  if (env.NODE_ENV === "production" && env.AIIGROW_OTP_THU === "1" && env.AIIGROW_PHA !== "1")
    throw new Error("AIIGROW_OTP_THU=1 không được dùng trên production — mã OTP sẽ lộ trong phản hồi. Gỡ biến này.");
}
