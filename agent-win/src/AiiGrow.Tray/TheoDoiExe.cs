namespace AiiGrow.Tray;

/// <summary>
/// Khay tự chạy lại sau khi cập nhật (14/11, lỗi máy 04: FileNotFoundException System.Security.Cryptography khi mở app).
/// Bộ cập nhật KHÔNG giết khay: đổi tên exe đang chạy sang «.cu-…» rồi chép bản mới vào đúng tên cũ (CapNhatSetup.ChepDe).
/// Khay là exe MỘT FILE: thư viện chưa dùng tới được đọc từ tệp exe theo ĐƯỜNG DẪN lúc cần ⇒ tệp đã bị thay thì nạp hỏng.
/// Lớp này so «dấu» (độ dài + giờ sửa) của tệp exe lúc khay bật với tệp hiện nằm ở đường dẫn đó: khác, và đã đứng yên qua
/// hai lần kiểm liền (chép xong) ⇒ khay nên chạy lại bằng bản mới. Thuần logic, không đụng WinForms ⇒ có test.
/// </summary>
internal sealed class TheoDoiExe
{
    internal readonly record struct Dau(long Dai, DateTime SuaUtc);

    private readonly string _duong;
    private readonly Func<string, Dau?> _doc;
    private readonly Dau? _goc;
    private Dau? _lanTruoc;

    public TheoDoiExe(string duong, Func<string, Dau?> doc)
    {
        _duong = duong;
        _doc = doc;
        _goc = doc(duong);
    }

    public string Duong => _duong;

    /// <summary>Đọc dấu thật từ đĩa; tệp không có / không đọc được ⇒ null.</summary>
    public static Dau? DocDia(string duong)
    {
        try
        {
            var f = new FileInfo(duong);
            return f.Exists ? new Dau(f.Length, f.LastWriteTimeUtc) : null;
        }
        catch { return null; }
    }

    /// <summary>Kiểm định kỳ: true khi tệp ở đường dẫn exe đã là tệp khác lúc khay bật VÀ giống hệt lần kiểm trước (đã chép xong).</summary>
    public bool DaCoBanMoi()
    {
        if (_goc == null) return false;               // không biết dấu gốc ⇒ không đoán
        var nay = _doc(_duong);
        var truoc = _lanTruoc;
        _lanTruoc = nay;
        if (nay == null || nay == _goc) return false; // đang chép dở (tệp vắng) hoặc cập nhật hỏng đã trả exe cũ về
        return nay == truoc;
    }

    /// <summary>Kiểm ngay (Con bấm mở app): chỉ cần tệp đã khác gốc — không chờ lần kiểm thứ hai.</summary>
    public bool DaKhacGoc()
    {
        if (_goc == null) return false;
        var nay = _doc(_duong);
        return nay != null && nay != _goc;
    }
}
