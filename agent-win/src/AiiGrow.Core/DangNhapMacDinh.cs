namespace AiiGrow.Core;

/// <summary>
/// Màn đăng nhập Windows chọn sẵn tài khoản của bé (không phải Ba Mẹ vừa thiết lập máy), và chữ thông báo pháp lý lúc đăng nhập (#778).
/// Windows chọn sẵn «người dùng gần nhất» theo khoá LogonUI; ghi khoá này ⇒ khởi động lại máy là vào thẳng tài khoản bé.
/// </summary>
public static class DangNhapMacDinh
{
    public const string KhoaLogonUI = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI";

    public const string TieuDeThongBao = "Máy được Ba Mẹ quản lý";
    public const string ChuThongBao = "Máy tính này dùng AiiGrow. Ba Mẹ đặt giờ dùng và các app được mở. Con có thể xin thêm giờ bất cứ lúc nào.";

    /// <summary>Giá trị khoá LogonUI cho tài khoản <paramref name="ten"/> (cục bộ). Tên/SID rỗng hoặc tài khoản hệ thống ⇒ null (giữ nguyên, không ghi bậy).</summary>
    public static IReadOnlyDictionary<string, string>? GiaTri(string? ten, string? sid, string tenMay)
    {
        if (string.IsNullOrWhiteSpace(ten) || !AppLockerXml.IsValidSid(sid)) return null;
        if (TaiKhoanCon.LaTaiKhoanHeThong(new LocalAccount(ten, sid!, false))) return null;
        var may = string.IsNullOrWhiteSpace(tenMay) ? "." : tenMay.Trim();
        return new Dictionary<string, string>
        {
            ["LastLoggedOnUser"] = $"{may}\\{ten.Trim()}",
            ["LastLoggedOnSAMUser"] = $"{may}\\{ten.Trim()}",
            ["LastLoggedOnUserSID"] = sid!,
            ["SelectedUserSID"] = sid!,
        };
    }

    /// <summary>Đã ghi đúng giá trị (không cần ghi lại) — Windows ghi đè «người dùng gần nhất» mỗi lần ai đó đăng nhập (kể cả Ba Mẹ).</summary>
    public static bool DaKhop(IReadOnlyDictionary<string, string> mong, Func<string, string?> doc) =>
        mong.All(kv => string.Equals(doc(kv.Key), kv.Value, StringComparison.OrdinalIgnoreCase));

    /// <summary>Số giây khoá chờ trước khi ngắt phiên của bé. Vừa bị ngắt (bé bấm Enter ở màn đăng nhập để vào lại) ⇒ chờ lâu hơn để bé thấy màn khoá
    /// và xin thêm giờ, thay vì bị đăng xuất lại ngay — vòng lặp «Enter → đăng xuất».</summary>
    public static int GiayChoNgat(DateTimeOffset now, DateTimeOffset? ngatCuoi) =>
        ngatCuoi is { } n && now - n >= TimeSpan.Zero && now - n < CuaSoVaoLai ? GiayChoSauVaoLai : GiayChoMacDinh;

    /// <summary>Vào lại trong chừng này sau khi bị ngắt phiên coi là «bấm Enter ở màn đăng nhập để vào lại».</summary>
    public static readonly TimeSpan CuaSoVaoLai = TimeSpan.FromMinutes(2);
    public const int GiayChoMacDinh = 10;
    public const int GiayChoSauVaoLai = 60;
}
