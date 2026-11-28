using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>#863: thẻ nhắc ở khay trong phiên tài khoản quản trị (Ba Mẹ) — còn tài khoản quản trị chưa có mật khẩu (kết quả #860 qua lệnh pipe
/// <see cref="PipeCmd.QuanTriTrong"/>). Phiên bé không bao giờ thấy thẻ: khay chỉ hỏi khi dịch vụ báo phiên KHÔNG phải của bé, dịch vụ cũng chỉ trả cho tài khoản quản trị.</summary>
public static class NhacQuanTriView
{
    public const string Tieu = "Tài khoản quản trị chưa có mật khẩu";
    public const string Phu = "Bé có thể tự vào và gỡ AiiGrow.";
    public const string HuongDan = "Nút dưới mở Settings › Accounts › Sign-in options của tài khoản đang đăng nhập (Password › Add). Tài khoản khác: đăng nhập vào tài khoản đó rồi đặt. AiiGrow không lưu mật khẩu.";
    public const string NutDat = "Đặt mật khẩu";
    public const string NutDeSau = "Để sau";
    /// <summary>Mở thẳng Settings › Accounts › Sign-in options.</summary>
    public const string CaiDat = "ms-settings:signinoptions";
    /// <summary>Khay hỏi dịch vụ thưa (dịch vụ chỉ thử lại 5 phút/lần).</summary>
    public static readonly TimeSpan NhipHoi = TimeSpan.FromSeconds(60);
    /// <summary>«Đặt mật khẩu» / «Để sau» / × ⇒ nhắc lại sau chừng này (danh sách đổi thì nhắc ngay; đặt xong thì dịch vụ báo rỗng trong ≤5 phút, thẻ thôi hiện).
    /// Không hoãn ngắn sau «Đặt mật khẩu»: Settings chỉ đặt được cho tài khoản đang đăng nhập, thẻ nhắc tài khoản khác sẽ nháy lại liên tục.</summary>
    public static readonly TimeSpan Hoan = TimeSpan.FromHours(4);

    public static string DongTen(IReadOnlyList<string> ten) => (ten.Count > 1 ? "Các tài khoản: " : "Tài khoản: ") + string.Join(", ", ten);

    /// <summary>Đọc trả lời lệnh pipe: danh sách = biết chắc (rỗng = đã ổn hoặc phiên không phải quản trị); null = chưa biết
    /// (dịch vụ chưa kiểm xong, không trả lời, bản cũ chưa có lệnh) ⇒ giữ như cũ.</summary>
    public static IReadOnlyList<string>? Doc(PipeResponse r)
    {
        if (r.Status == QuanTriTrongStatus.KhongQuanTri) return Array.Empty<string>();
        if (!r.Ok || r.Status != QuanTriTrongStatus.Ok || string.IsNullOrEmpty(r.Data)) return null;
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
    /// <summary>Đồng hồ lùi ít (đồng bộ giờ) không tính là lùi.</summary>
    private static readonly TimeSpan LechDongHo = TimeSpan.FromMinutes(5);
    private string? _hoanKhoa;
    private DateTimeOffset _hoanTu, _hoanDen;

    /// <summary>Danh sách mới nhất đã biết chắc.</summary>
    public IReadOnlyList<string> Ten { get; private set; } = Array.Empty<string>();

    /// <summary>Cùng tập tài khoản (không phân biệt hoa thường, thứ tự) — khay không dựng lại thẻ đang hiện.</summary>
    public static bool CungDanhSach(IEnumerable<string> a, IEnumerable<string> b) => Khoa(a) == Khoa(b);

    private static string Khoa(IEnumerable<string> ten) => string.Join("\n", ten.Select(x => x.ToUpperInvariant()).OrderBy(x => x, StringComparer.Ordinal));

    /// <summary>Lượt hỏi dịch vụ xong (<paramref name="ds"/> null = chưa biết ⇒ giữ danh sách cũ). Trả true = thẻ nên hiện.</summary>
    public bool Xet(IReadOnlyList<string>? ds, DateTimeOffset now)
    {
        if (ds != null) Ten = ds;
        if (Ten.Count == 0)
        {
            if (ds != null) _hoanKhoa = null;   // dịch vụ báo chắc đã ổn ⇒ bỏ hoãn; chưa biết (khay vừa chạy lại, dịch vụ chưa kiểm) ⇒ giữ hoãn đã lưu
            return false;
        }
        if (_hoanKhoa == null) return true;
        if (_hoanKhoa != Khoa(Ten) || now >= _hoanDen || now < _hoanTu - LechDongHo) { _hoanKhoa = null; return true; }   // đổi danh sách / hết hạn / đồng hồ lùi hẳn
        return false;
    }

    /// <summary>Ba Mẹ đóng thẻ («Để sau», ×) hoặc vừa mở Settings: không nhắc lại danh sách này trong <see cref="NhacQuanTriView.Hoan"/>.</summary>
    public void Hoan(DateTimeOffset now)
    {
        _hoanKhoa = Khoa(Ten);
        _hoanTu = now;
        _hoanDen = now + NhacQuanTriView.Hoan;
    }

    private sealed record LanHoan(string Khoa, DateTimeOffset Tu, DateTimeOffset Den);

    /// <summary>Lần hoãn đang có (JSON, khay lưu tệp của người dùng ⇒ khay chạy lại / đăng nhập lại không nhắc sớm); null = không hoãn.</summary>
    public string? GhiHoan() => _hoanKhoa == null ? null : JsonSerializer.Serialize(new LanHoan(_hoanKhoa, _hoanTu, _hoanDen), Json.Options);

    /// <summary>Đọc lại lần hoãn đã lưu (hỏng thì bỏ qua).</summary>
    public void DocHoan(string? json)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(json) || JsonSerializer.Deserialize<LanHoan>(json, Json.Options) is not { Khoa: { Length: > 0 } } h) return;
            (_hoanKhoa, _hoanTu, _hoanDen) = (h.Khoa, h.Tu, h.Den);
        }
        catch (JsonException) { }
    }
}
