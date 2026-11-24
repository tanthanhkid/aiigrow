using System.Security.Cryptography;

namespace AiiGrow.Core;

public enum KetQuaKyBoCai
{
    /// <summary>Chữ ký Authenticode hợp lệ (chuỗi tới gốc tin cậy, chưa bị thu hồi) và người ký nằm trong danh sách ghim ⇒ được chạy.</summary>
    HopLe,
    /// <summary>Agent chưa ghim chứng chỉ nào (bộ cài chưa ký số) ⇒ chỉ dựa vào sha256 của manifest như trước. Dịch vụ ghi cảnh báo.</summary>
    ChuaGhim,
    /// <summary>Không có chữ ký, chữ ký hỏng/không tin cậy/bị thu hồi, hoặc người ký không phải AiiGrow ⇒ KHÔNG chạy, bỏ bản này.</summary>
    SaiChuKy,
    /// <summary>Không kiểm được thu hồi (mạng/máy chủ CRL-OCSP) ⇒ KHÔNG chạy lượt này, nhưng không coi là bộ cài giả — thử lại sớm.</summary>
    ChuaKiemDuoc,
    /// <summary>Danh sách ghim trong agent có mục không phải băm SHA-256 (vd dán nhầm thumbprint SHA-1) ⇒ KHÔNG chạy; lỗi cấu hình của agent, không phải của bộ cài.</summary>
    GhimSaiDang,
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
    /// Băm SHA-256 (hex, 64 ký tự) chứng chỉ người ký bộ cài AiiGrow (nhiều mục khi đang đổi chứng chỉ). RỖNG = chưa có chứng chỉ (đang chờ mua)
    /// ⇒ <see cref="KetQuaKyBoCai.ChuaGhim"/>, không chặn cập nhật (bộ cài hiện chưa ký, chặn là mọi máy kẹt bản cũ). Điền băm vào đây là bật kiểm
    /// bắt buộc từ bản kế tiếp.
    /// </summary>
    public static readonly IReadOnlyList<string> ThumbprintGhim = Array.Empty<string>();

    /// <summary>Kiểm tệp thật trên Windows (WinVerifyTrust có mạng + kiểm thu hồi, rồi băm chứng chỉ người ký).</summary>
    public static KetQuaKyBoCai Kiem(string tep) => Kiem(tep, ThumbprintGhim, t => Authenticode.MaWinTrust(t, coMang: true), BamNguoiKy);

    /// <summary>Lõi thuần để test: <paramref name="maWinTrust"/> = mã WinVerifyTrust (0 = hợp lệ), <paramref name="bamNguoiKy"/> = băm SHA-256
    /// chứng chỉ người ký (null nếu không có chữ ký).</summary>
    public static KetQuaKyBoCai Kiem(string tep, IReadOnlyCollection<string> ghim, Func<string, int> maWinTrust, Func<string, string?> bamNguoiKy)
    {
        if (ghim.Count == 0) return KetQuaKyBoCai.ChuaGhim;
        // một mục sai dạng cũng chặn: lúc đổi chứng chỉ, băm MỚI gõ nhầm mà bị lờ đi thì tới khi ký bằng chứng chỉ mới mọi máy kẹt bản cũ
        if (!ghim.All(TuCapNhat.LaSha256)) return KetQuaKyBoCai.GhimSaiDang;
        int ma;
        string? bam;
        try
        {
            ma = maWinTrust(tep);
            if (ma is Authenticode.LoiThuHoi or Authenticode.LoiThuHoiNgoaiMang) return KetQuaKyBoCai.ChuaKiemDuoc;
            bam = ma == 0 ? bamNguoiKy(tep) : null;
        }
        catch { return KetQuaKyBoCai.SaiChuKy; }
        if (ma != 0 || bam == null) return KetQuaKyBoCai.SaiChuKy;
        return ghim.Any(g => g.Equals(bam, StringComparison.OrdinalIgnoreCase)) ? KetQuaKyBoCai.HopLe : KetQuaKyBoCai.SaiChuKy;
    }

    /// <summary>Băm SHA-256 (hex hoa) chứng chỉ người ký Authenticode của tệp; không có chữ ký ⇒ null.</summary>
    public static string? BamNguoiKy(string tep)
    {
        using var c = Authenticode.ChungChiNguoiKy(tep);
        return c?.GetCertHashString(HashAlgorithmName.SHA256);
    }
}
