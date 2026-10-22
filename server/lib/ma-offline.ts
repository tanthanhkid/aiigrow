// Mã mở offline — khi máy Con MẤT MẠNG, Ba Mẹ (điện thoại còn mạng) xem một mã ngắn trong app và đọc cho Con gõ vào máy.
// Máy tự kiểm mã KHÔNG cần máy chủ, nhờ một bí mật chung cấp lúc ghép máy. Dùng TOTP chuẩn RFC 6238 (HMAC-SHA1) để agent (C#)
// tính ra cùng mã. Bước dài (mặc định 5 phút) + dung sai ±1 bước ⇒ mã còn hiệu lực đủ lâu để đọc và gõ (5–15 phút).
// Đây là đường NỚI LỎNG do Ba Mẹ chủ động, có hạn giờ và được ghi nhật ký — không phải đường con tự mở.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const BUOC_GIAY = 300;   // một mã sống 5 phút
export const SO_CHU_SO = 6;
export const DUNG_SAI = 1;      // chấp nhận mã của bước liền trước/sau ⇒ hiệu lực thực 5–15 phút

/** Bí mật chung cho một máy (lưu ở devices.offline_secret, gửi cho agent lúc ghép). base64url 20 byte. */
export const taoBiMatOffline = () => randomBytes(20).toString("base64url");

function totp(secret: string, counter: number, soChuSo: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", Buffer.from(secret, "utf8")).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3];
  return (bin % 10 ** soChuSo).toString().padStart(soChuSo, "0");
}

/** Mã hiện tại cho Ba Mẹ xem. */
export function maOffline(secret: string, now = new Date(), buocGiay = BUOC_GIAY, soChuSo = SO_CHU_SO): string {
  return totp(secret, Math.floor(now.getTime() / 1000 / buocGiay), soChuSo);
}

/** Máy tự kiểm (agent dùng y hệt): đúng nếu khớp bước hiện tại hoặc trong dung sai. So sánh an toàn thời gian. */
export function kiemMaOffline(secret: string, ma: string, now = new Date(), buocGiay = BUOC_GIAY, soChuSo = SO_CHU_SO, dungSai = DUNG_SAI): boolean {
  const sach = String(ma ?? "").replace(/\D/g, "");
  if (sach.length !== soChuSo) return false;
  const moc = Math.floor(now.getTime() / 1000 / buocGiay);
  for (let i = -dungSai; i <= dungSai; i++) {
    const mong = totp(secret, moc + i, soChuSo);
    if (sach.length === mong.length && timingSafeEqual(Buffer.from(sach), Buffer.from(mong))) return true;
  }
  return false;
}
