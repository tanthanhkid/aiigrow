using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace AiiGrow.Core;

public enum KetQuaKyBoCai
{
    /// <summary>Chữ ký Authenticode hợp lệ (chuỗi tới gốc tin cậy) và người ký nằm trong danh sách ghim ⇒ được chạy.</summary>
    HopLe,
    /// <summary>Agent chưa ghim chứng chỉ nào (bộ cài chưa ký số) ⇒ chỉ dựa vào sha256 của manifest như trước. Dịch vụ ghi cảnh báo.</summary>
    ChuaGhim,
    /// <summary>Không có chữ ký, chữ ký hỏng/không tin cậy, hoặc người ký không phải AiiGrow ⇒ KHÔNG chạy.</summary>
    SaiChuKy,
}

/// <summary>
/// Kiểm chữ ký Authenticode của bộ cài tự cập nhật TRƯỚC khi giao cho tác vụ SYSTEM chạy (#549). sha256 trong manifest đến từ CHÍNH máy chủ
/// phát URL tải, nên ai sửa được manifest là đẩy được exe độc; chữ ký với chứng chỉ GHIM CỨNG trong agent thì máy chủ không làm giả được.
/// <para>Ghim theo băm SHA-256 của chứng chỉ người ký (leaf) — không theo Subject (CA khác có thể cấp chứng chỉ cùng tên).</para>
/// <para>Khi có chứng chỉ code signing: CI ký AiiGrow-Setup.exe (signtool sign /fd sha256 /tr &lt;TSA&gt; /td sha256 — PHẢI có dấu thời gian để
/// chữ ký còn hợp lệ sau khi chứng chỉ hết hạn), rồi thêm băm vào <see cref="ThumbprintGhim"/>. Đổi/gia hạn chứng chỉ: phát một bản ký
/// bằng chứng chỉ CŨ có ghim cả băm MỚI, rồi mới ký bằng chứng chỉ mới — máy đang chạy bản cũ chỉ nhận chứng chỉ nó đã ghim.</para>
/// </summary>
public static class KyBoCai
{
    /// <summary>
    /// Băm SHA-256 (hex, 64 ký tự) chứng chỉ người ký bộ cài AiiGrow. RỖNG = chưa có chứng chỉ (đang chờ mua) ⇒ <see cref="KetQuaKyBoCai.ChuaGhim"/>,
    /// không chặn cập nhật (bộ cài hiện chưa ký, chặn là mọi máy kẹt bản cũ). Điền băm vào đây là bật kiểm bắt buộc từ bản kế tiếp.
    /// </summary>
    public static readonly IReadOnlyList<string> ThumbprintGhim = Array.Empty<string>();

    /// <summary>Kiểm tệp thật trên Windows (WinVerifyTrust + băm chứng chỉ người ký).</summary>
    public static KetQuaKyBoCai Kiem(string tep) => Kiem(tep, ThumbprintGhim, KiemKyTrinhDuyet.ChuKyHopLe, BamNguoiKy);

    /// <summary>Lõi thuần để test: <paramref name="chuKyHopLe"/> = WinVerifyTrust, <paramref name="bamNguoiKy"/> = băm SHA-256 chứng chỉ người ký (null nếu không có chữ ký).</summary>
    public static KetQuaKyBoCai Kiem(string tep, IReadOnlyCollection<string> ghim, Func<string, bool> chuKyHopLe, Func<string, string?> bamNguoiKy)
    {
        var dsGhim = ghim.Where(TuCapNhat.LaSha256).ToList();
        if (dsGhim.Count == 0) return KetQuaKyBoCai.ChuaGhim;
        bool hopLe;
        string? bam;
        try { hopLe = chuKyHopLe(tep); bam = hopLe ? bamNguoiKy(tep) : null; }
        catch { return KetQuaKyBoCai.SaiChuKy; }
        if (!hopLe || bam == null) return KetQuaKyBoCai.SaiChuKy;
        return dsGhim.Any(g => g.Equals(bam, StringComparison.OrdinalIgnoreCase)) ? KetQuaKyBoCai.HopLe : KetQuaKyBoCai.SaiChuKy;
    }

    /// <summary>Băm SHA-256 (hex hoa) chứng chỉ người ký Authenticode của tệp; không có chữ ký ⇒ null.</summary>
    public static string? BamNguoiKy(string tep)
    {
#pragma warning disable SYSLIB0057
        try
        {
            using var c = new X509Certificate2(X509Certificate.CreateFromSignedFile(tep));
            return c.GetCertHashString(HashAlgorithmName.SHA256);
        }
        catch { return null; }
#pragma warning restore SYSLIB0057
    }
}
