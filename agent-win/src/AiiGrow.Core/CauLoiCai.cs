namespace AiiGrow.Core;

/// <summary>Lỗi bộ cài đã có câu cho Ba Mẹ (<see cref="Exception.Message"/>); <see cref="ChiTiet"/> là chữ gốc (stderr PowerShell…) chỉ ghi install.log.</summary>
public sealed class LoiCai : Exception
{
    public string? ChiTiet { get; }
    public LoiCai(string cau, string? chiTiet = null, Exception? inner = null) : base(cau, inner) { ChiTiet = chiTiet; }
}

/// <summary>
/// #689: câu lỗi bộ cài Windows cho Ba Mẹ — tiếng Việt, nói phải làm gì; không hiện chữ PowerShell / .NET tiếng Anh, đường dẫn, tên tệp kỹ thuật.
/// Chữ gốc vẫn ghi install.log (<see cref="Log"/>).
/// </summary>
public static class CauLoiCai
{
    public const string ThieuQuyen = "Bộ cài chưa có quyền quản trị. Đóng bộ cài, bấm chuột phải vào AiiGrow-Setup › «Run as administrator» rồi cài lại.";
    public const string TepBiGiu = "Có phần mềm đang giữ tệp của AiiGrow (thường là phần mềm diệt virus). Tạm tắt nó hoặc khởi động lại máy, rồi bấm «Thử lại».";
    public const string ThieuTep = "Bộ cài bị thiếu tệp. Tải lại bộ cài ở aiigrow.aiilab.vn/tai rồi chạy lại.";
    public const string Chung = "Có trục trặc khi cài. Bấm «Thử lại»; vẫn lỗi thì khởi động lại máy rồi chạy lại bộ cài.";
    public const string DocTaiKhoan = "Chưa đọc được các tài khoản trên máy. Bấm «Thử lại»; vẫn lỗi thì khởi động lại máy rồi chạy lại bộ cài.";
    public const string TaoTaiKhoan = "Chưa tạo được tài khoản Windows. Thử tên khác; vẫn lỗi thì tạo tài khoản trong Cài đặt Windows rồi chọn «Các con đã có tài khoản chung».";
    public const string HaQuyen = "Chưa đổi được tài khoản này thành tài khoản thường. Bấm «Thử lại»; vẫn lỗi thì đổi trong Cài đặt Windows › Tài khoản.";
    public const string DichVu = "Chưa bật được dịch vụ AiiGrow. Khởi động lại máy rồi chạy lại bộ cài.";

    /// <summary>#739: tên Windows cấm làm tên thư mục hồ sơ.</summary>
    public static string TenCam(string ten) => $"Windows không cho đặt tên «{ten}» (tên dành riêng của hệ thống: CON, PRN, AUX, NUL, COM1–9, LPT1–9). Đặt tên khác, ví dụ: treem.";

    /// <summary>#854: cập nhật gặp tài khoản Windows đang mang tên cấm (hồ sơ tạm mỗi lần đăng nhập).</summary>
    public static string TaiKhoanTenCam(IEnumerable<string> ten) =>
        $"Máy có tài khoản Windows tên «{string.Join("», «", ten)}» (tên dành riêng của hệ thống) nên mỗi lần đăng nhập Windows chỉ cho vào hồ sơ tạm. " +
        "Cập nhật không sửa được việc này. Tạo tài khoản mới tên khác (ví dụ: treem) trong Cài đặt Windows › Tài khoản, chép dữ liệu của bé sang, rồi chọn tài khoản mới trong «Sửa cài đặt».";

    /// <summary>#739: tạo xong tài khoản nhưng Windows không dựng được hồ sơ (thư mục người dùng).</summary>
    public static string HoSoLoi(string ten) => $"Tài khoản «{ten}» chưa dùng được vì Windows không tạo được hồ sơ cho nó. Bộ cài đã xoá tài khoản đó; thử tên khác, vẫn lỗi thì khởi động lại máy rồi chạy lại bộ cài.";

    public static string HoSoLoiChuaXoa(string ten) => $"Tài khoản «{ten}» chưa dùng được vì Windows không tạo được hồ sơ cho nó, và bộ cài chưa xoá được tài khoản đó. Xoá «{ten}» trong Cài đặt Windows › Tài khoản rồi thử tên khác.";

    /// <summary>Máy đã có tài khoản tên này (stderr «The user account already exists» / «đã tồn tại»).</summary>
    public static string TrungTen(string ten) => $"Máy đã có tài khoản «{ten}». Đặt tên khác, hoặc chọn «Các con đã có tài khoản chung».";

    /// <summary>Stderr của New-LocalUser ⇒ câu cho Ba Mẹ.</summary>
    public static string TuLoiTaoTaiKhoan(string ten, string? stderr)
    {
        var s = stderr ?? "";
        return s.Contains("already exists", StringComparison.OrdinalIgnoreCase) || s.Contains("UserExists", StringComparison.OrdinalIgnoreCase)
               || s.Contains("đã tồn tại", StringComparison.OrdinalIgnoreCase) ? TrungTen(ten) : TaoTaiKhoan;
    }

    /// <summary>Ngoại lệ ⇒ câu hiện trên màn bộ cài. <paramref name="duPhong"/> cho lỗi không phân loại được.</summary>
    public static string Tu(Exception e, string duPhong = Chung) => e switch
    {
        LoiCai l => l.Message,
        ApiException a => CauLoi.AnToan(a.Message, duPhong),
        UnauthorizedAccessException => ThieuQuyen,
        FileNotFoundException or DirectoryNotFoundException => ThieuTep,
        IOException => TepBiGiu,   // tệp đang bị chương trình khác giữ / ghi lỗi
        AggregateException { InnerException: { } i } => Tu(i, duPhong),
        _ => duPhong,
    };

    /// <summary>Dòng ghi install.log: đủ chữ gốc để chẩn đoán.</summary>
    public static string Log(Exception e) => e is LoiCai { ChiTiet: { } ct } ? $"{e.Message} | {ct}" : $"{e.GetType().Name}: {e.Message}";

    /// <summary>Kết quả cập nhật lỗi ⇒ câu cho Ba Mẹ (nhật ký từng bước chỉ ghi install.log).</summary>
    public static string CapNhatLoi(KetQuaCapNhat kq) => kq.DaKhoiPhuc
        ? "Chưa cập nhật được, AiiGrow vẫn chạy bản cũ. Tạm tắt phần mềm diệt virus hoặc khởi động lại máy, rồi cập nhật lại."
        : "Chưa cập nhật được. Khởi động lại máy rồi chạy lại bộ cài.";
}
