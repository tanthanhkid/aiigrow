using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>#863: thẻ nhắc ở khay trong phiên tài khoản quản trị (Ba Mẹ) — còn tài khoản quản trị chưa có mật khẩu (kết quả #860 qua lệnh pipe
/// <see cref="PipeCmd.QuanTriTrong"/>). Phiên bé không bao giờ thấy thẻ: khay chỉ hỏi khi dịch vụ báo phiên KHÔNG phải của bé, dịch vụ cũng chỉ trả cho tài khoản quản trị.</summary>
public static class NhacQuanTriView
{
    public const string Tieu = "Tài khoản quản trị chưa có mật khẩu";
    public const string Phu = "Bé có thể tự vào và gỡ AiiGrow.";
    public const string HuongDan = "Vào Settings › Accounts › Sign-in options › Password, đặt mật khẩu cho tài khoản này. AiiGrow không lưu mật khẩu.";
    public const string NutDat = "Đặt mật khẩu";
    public const string NutDeSau = "Để sau";
    /// <summary>Mở thẳng Settings › Accounts › Sign-in options.</summary>
    public const string CaiDat = "ms-settings:signinoptions";
    /// <summary>Dịch vụ từ chối vì phiên không phải tài khoản quản trị (<see cref="PipeResponse.Status"/>).</summary>
    public const string KhongQuanTri = "khong_quan_tri";

    /// <summary>Khay hỏi dịch vụ thưa (dịch vụ chỉ thử lại 5 phút/lần).</summary>
    public static readonly TimeSpan NhipHoi = TimeSpan.FromSeconds(60);
    /// <summary>«Để sau» / đóng thẻ ⇒ nhắc lại sau chừng này (danh sách đổi thì nhắc ngay).</summary>
    public static readonly TimeSpan HoanDeSau = TimeSpan.FromHours(4);
    /// <summary>Bấm «Đặt mật khẩu» ⇒ thẻ ẩn chờ Ba Mẹ đặt xong; dịch vụ kiểm lại ≤5 phút, còn trống thì thẻ hiện lại.</summary>
    public static readonly TimeSpan HoanDaMo = TimeSpan.FromMinutes(10);

    public static string DongTen(IReadOnlyList<string> ten) => (ten.Count > 1 ? "Các tài khoản: " : "Tài khoản: ") + string.Join(", ", ten);

    /// <summary>Đọc trả lời lệnh pipe: danh sách = biết chắc (rỗng = đã ổn hoặc phiên không phải quản trị); null = chưa biết
    /// (dịch vụ chưa kiểm xong, không trả lời, bản cũ chưa có lệnh) ⇒ giữ như cũ.</summary>
    public static IReadOnlyList<string>? Doc(PipeResponse r)
    {
        if (r.Status == KhongQuanTri) return Array.Empty<string>();
        if (!r.Ok || r.Status != "ok" || string.IsNullOrEmpty(r.Data)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<string>>(r.Data, Json.Options)?.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
        }
        catch (JsonException) { return null; }
    }
}

/// <summary>#863: quyết định hiện / ẩn thẻ nhắc (thuần — truyền mốc giờ, không dùng đồng hồ thật).</summary>
public sealed class NhacQuanTri
{
    private string? _hoanKhoa;
    private DateTimeOffset _hoanTu, _hoanDen;

    /// <summary>Danh sách mới nhất đã biết chắc.</summary>
    public IReadOnlyList<string> Ten { get; private set; } = Array.Empty<string>();

    private static string Khoa(IEnumerable<string> ten) => string.Join("\n", ten.Select(x => x.ToUpperInvariant()).OrderBy(x => x, StringComparer.Ordinal));

    /// <summary>Lượt hỏi dịch vụ xong (<paramref name="ds"/> null = chưa biết ⇒ giữ danh sách cũ). Trả true = thẻ nên hiện.</summary>
    public bool Xet(IReadOnlyList<string>? ds, DateTimeOffset now)
    {
        if (ds != null) Ten = ds;
        if (Ten.Count == 0) { _hoanKhoa = null; return false; }
        if (_hoanKhoa == null) return true;
        if (_hoanKhoa != Khoa(Ten) || now >= _hoanDen || now < _hoanTu) { _hoanKhoa = null; return true; }   // đổi danh sách / hết hạn / đồng hồ lùi
        return false;
    }

    /// <summary>Ba Mẹ đóng thẻ («Để sau», ×) hoặc vừa mở Settings: không nhắc lại danh sách này trong <paramref name="hoan"/>.</summary>
    public void Hoan(DateTimeOffset now, TimeSpan hoan)
    {
        _hoanKhoa = Khoa(Ten);
        _hoanTu = now;
        _hoanDen = now + hoan;
    }
}
