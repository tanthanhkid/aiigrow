using System.Security.Cryptography;
using System.Text;

namespace AiiGrow.Core;

/// <summary>
/// Mã mở offline — khi máy MẤT MẠNG, Ba Mẹ (điện thoại còn mạng) xem một mã ngắn trong app và đọc cho Con gõ vào màn khoá.
/// Agent tự kiểm mã KHÔNG cần máy chủ, nhờ bí mật chung (Policy.MaOfflineBiMat, cấp qua dong-bo.windows khi còn mạng).
/// Phải cho RA ĐÚNG số như máy chủ (server/lib/ma-offline.ts) — TOTP chuẩn RFC 6238 (HMAC-SHA1).
/// Đây là đường NỚI LỎNG do Ba Mẹ chủ động, có hạn giờ và được ghi nhật ký — không phải đường Con tự mở.
/// </summary>
public static class MaOffline
{
    public const int BuocGiay = 300;   // một mã sống 5 phút
    public const int SoChuSo = 6;
    public const int DungSai = 1;      // chấp nhận bước liền trước/sau ⇒ hiệu lực thực 5–15 phút

    private static string Totp(string secret, long counter, int soChuSo)
    {
        Span<byte> buf = stackalloc byte[8];
        System.Buffers.Binary.BinaryPrimitives.WriteUInt64BigEndian(buf, (ulong)counter);
        var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(secret)).ComputeHash(buf.ToArray());
        int off = hmac[^1] & 0x0f;
        int bin = ((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3];
        int mod = (int)Math.Pow(10, soChuSo);
        return (bin % mod).ToString().PadLeft(soChuSo, '0');
    }

    /// <summary>Mã hiện tại (dùng để hiển thị khi cần đối chiếu / thử nghiệm).</summary>
    public static string Ma(string secret, DateTimeOffset now, int buocGiay = BuocGiay, int soChuSo = SoChuSo)
        => Totp(secret, now.ToUnixTimeSeconds() / buocGiay, soChuSo);

    /// <summary>Máy tự kiểm mã Ba Mẹ đọc. So sánh an toàn thời gian, chấp nhận trong dung sai.</summary>
    public static bool Kiem(string? secret, string? ma, DateTimeOffset now, int buocGiay = BuocGiay, int soChuSo = SoChuSo, int dungSai = DungSai)
    {
        if (string.IsNullOrEmpty(secret)) return false;
        var sach = new string((ma ?? "").Where(char.IsDigit).ToArray());
        if (sach.Length != soChuSo) return false;
        long moc = now.ToUnixTimeSeconds() / buocGiay;
        bool ok = false;
        for (long i = -dungSai; i <= dungSai; i++)
        {
            var mong = Totp(secret, moc + i, soChuSo);
            // so hết các bước (không thoát sớm) để không lộ bước nào khớp qua thời gian chạy
            ok |= CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(sach), Encoding.ASCII.GetBytes(mong));
        }
        return ok;
    }
}
