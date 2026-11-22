// Kiểm khi khởi động (instrumentation.ts): mã OTP thử trả thẳng trong phản hồi ⇒ ai cũng đăng ký / chiếm định danh bất kỳ.
// production + AIIGROW_OTP_THU=1 ⇒ CẢNH BÁO to (console.error), KHÔNG chặn khởi động: prod hiện vẫn đặt biến này vì chưa có nhà cung cấp
// SMS/email (auth.ts dòng 3) — chặn thì máy chủ sập (22/11 deploy #548 không lên, deploy-vps tự quay lại). Gỡ biến khi có kênh gửi thật.
// Trả về true khi đang ở trạng thái nguy hiểm (để test). Bộ pha giao diện (AIIGROW_PHA=1) không cảnh báo.
export function kiemOtpThu(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV === "production" && env.AIIGROW_OTP_THU === "1" && env.AIIGROW_PHA !== "1") {
    console.error("[AN NINH] AIIGROW_OTP_THU=1 trên production — mã OTP trả thẳng trong phản hồi. Gỡ biến này khi có kênh SMS/email.");
    return true;
  }
  return false;
}
