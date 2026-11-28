namespace AiiGrow.Core;

/// <summary>Độ mạnh mật khẩu hiện dưới ô gõ (chỉ để nhắc Ba Mẹ — không chặn trừ khi rỗng / quá ngắn).</summary>
public enum DoManhMatKhau { Trong, Yeu, Vua, Manh }

/// <summary>
/// #862: phần thuần của màn «Đặt mật khẩu cho tài khoản quản trị» trong bộ cài — tài khoản nào cần đặt, kiểm hai ô mật khẩu, độ mạnh,
/// câu báo lỗi đặt mật khẩu. Lời gọi Win32 (dò tài khoản <see cref="QuanTriTrongMay"/>, đặt mật khẩu) nằm ở bộ cài.
/// Mật khẩu chỉ đi qua bộ nhớ: không có hàm nào ở đây ghi hay trả lại mật khẩu.
/// </summary>
public static class DatMatKhauQuanTri
{
    public const int DaiToiThieu = 4;
    /// <summary>NetUserSetInfo / NetUserChangePassword nhận tối đa 127 ký tự (PWLEN).</summary>
    public const int DaiToiDa = 127;

    /// <summary>Tài khoản bộ cài cần đặt mật khẩu: quản trị cục bộ đang bật (luật <see cref="QuanTriTrong.CanKiem"/> — bỏ tài khoản Microsoft,
    /// Administrator dựng sẵn đang tắt) mà mật khẩu trống. KHÔNG bao giờ gồm tài khoản của bé (<paramref name="tenCon"/>), kể cả khi nó còn là quản trị.
    /// <paramref name="kiem"/> chỉ được gọi cho tài khoản cần kiểm (mỗi lần gọi có thể tính một lần nhập sai).</summary>
    public static List<TaiKhoanQuanTri> CanDat(IEnumerable<TaiKhoanQuanTri> ds, string? tenCon, Func<TaiKhoanQuanTri, KiemMatKhau> kiem)
        => ds.Where(t => QuanTriTrong.CanKiem(t) && !string.Equals(t.Ten, tenCon, StringComparison.OrdinalIgnoreCase))
             .Where(t => kiem(t) == KiemMatKhau.Trong)
             .OrderBy(t => t.Ten, StringComparer.OrdinalIgnoreCase)
             .ToList();

    /// <summary>Tên hiện cho Ba Mẹ: tên đầy đủ nếu có (khác tên đăng nhập thì kèm tên đăng nhập), không thì tên đăng nhập.</summary>
    public static string TenHien(TaiKhoanQuanTri t)
    {
        var day = t.TenHienThi?.Trim() ?? "";
        if (day.Length == 0 || day.Equals(t.Ten, StringComparison.OrdinalIgnoreCase)) return t.Ten;
        return $"{day} ({t.Ten})";
    }

    /// <summary>Kiểm hai ô trước khi đặt ⇒ câu lỗi cho Ba Mẹ, null = hợp lệ.</summary>
    public static string? Loi(string? matKhau, string? goLai)
    {
        matKhau ??= ""; goLai ??= "";
        if (matKhau.Length == 0) return "Gõ mật khẩu mới vào ô thứ nhất.";
        if (matKhau.Trim().Length == 0) return "Mật khẩu không được chỉ có dấu cách.";
        if (matKhau.Length < DaiToiThieu) return $"Mật khẩu cần ít nhất {DaiToiThieu} ký tự.";
        if (matKhau.Length > DaiToiDa) return $"Mật khẩu dài tối đa {DaiToiDa} ký tự.";
        if (goLai.Length == 0) return "Gõ lại mật khẩu vào ô thứ hai cho chắc.";
        if (!string.Equals(matKhau, goLai, StringComparison.Ordinal)) return "Hai lần gõ chưa khớp nhau.";
        return null;
    }

    /// <summary>Độ mạnh: dài + nhiều loại ký tự (thường, HOA, số, ký hiệu). Toàn một ký tự lặp lại hoặc dãy số / chữ liền nhau ⇒ yếu.</summary>
    public static DoManhMatKhau DoManh(string? matKhau)
    {
        if (string.IsNullOrEmpty(matKhau)) return DoManhMatKhau.Trong;
        var n = matKhau.Length;
        if (n < 6 || matKhau.Distinct().Count() <= 2 || LaDayLien(matKhau)) return DoManhMatKhau.Yeu;
        var loai = (matKhau.Any(char.IsLower) ? 1 : 0) + (matKhau.Any(char.IsUpper) ? 1 : 0)
                 + (matKhau.Any(char.IsDigit) ? 1 : 0) + (matKhau.Any(c => !char.IsLetterOrDigit(c)) ? 1 : 0);
        if (loai <= 1 && n < 10) return DoManhMatKhau.Yeu;
        if ((n >= 10 && loai >= 3) || n >= 14) return DoManhMatKhau.Manh;
        return DoManhMatKhau.Vua;
    }

    /// <summary>«123456», «abcdef», «654321» — mỗi ký tự hơn/kém ký tự trước đúng 1.</summary>
    private static bool LaDayLien(string s)
    {
        if (s.Length < 3) return false;
        var buoc = s[1] - s[0];
        if (buoc is not (1 or -1)) return false;
        for (int i = 2; i < s.Length; i++) if (s[i] - s[i - 1] != buoc) return false;
        return true;
    }

    public static string ChuDoManh(DoManhMatKhau d) => d switch
    {
        DoManhMatKhau.Yeu => "Yếu — thêm chữ HOA, số hoặc dài hơn",
        DoManhMatKhau.Vua => "Vừa",
        DoManhMatKhau.Manh => "Mạnh",
        _ => "",
    };

    /// <summary>Mã trả về của NetUserChangePassword / NetUserSetInfo ⇒ câu cho Ba Mẹ (không có chữ kỹ thuật ngoài mã số).</summary>
    public static string CauLoiDat(string ten, int rc) => rc switch
    {
        2245 => $"Windows chưa nhận mật khẩu này cho «{ten}»: chưa đủ yêu cầu của máy (độ dài, chữ HOA, số, ký hiệu). Thử mật khẩu dài hơn.",
        2221 => $"Không còn thấy tài khoản «{ten}» trên máy.",
        5 => $"Bộ cài chưa có quyền đổi mật khẩu «{ten}». Ba Mẹ đặt trong Cài đặt Windows (bấm «Tự đặt sau» để xem cách).",
        _ => $"Chưa đặt được mật khẩu cho «{ten}» (mã {rc}). Thử lại, hoặc bấm «Tự đặt sau».",
    };
}
