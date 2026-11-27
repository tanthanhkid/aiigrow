namespace AiiGrow.Core;

/// <summary>
/// «Xin thêm YouTube» (Bàn con-xin 16/11, #307: them-bxw40sw9 → them-6tn8aozf «Đã gửi» → them-359v1pre «Mẹ Lan đã thêm!» / them-vkdikuo0 «chưa thêm»).
/// Con tự xin Ba Mẹ thêm một app / trang chưa có trong danh sách (#258): Ba Mẹ chọn nhóm «Tính phút» / «Không tính phút» khi duyệt — chip trên hộp
/// chỉ cho Con biết hai nhóm, Con không chọn. Lời nhắn không bắt buộc (máy chủ cắt 100 ký tự). Lớp THUẦN để test.
/// </summary>
public static class XinThemView
{
    public const string TieuDeCuaSo = "AiiGrow · Xin thêm app";
    public static string Tieu(string ten) => "Xin thêm " + ten;
    public static string Phu(string ten) => ten + " chưa có trong danh sách của con";
    public const string BaMeChonNhom = "Ba Mẹ sẽ chọn nhóm";
    public const string NhomTinh = "Tính phút · 1 sao = 1 phút";
    public const string NhomKhong = "Không tính phút";
    /// Mục «Ba Mẹ sẽ chọn nhóm» — một dòng chữ thông tin, không chip.
    public const string NhomThongTin = "Tính phút · 1 sao = 1 phút, hoặc Không tính phút";
    public const string GoiYNhan = "Nhắn Ba Mẹ: con cần dùng để làm gì ạ";
    public static string Nut(string ten) => "Xin Ba Mẹ thêm " + ten;

    // Đã gửi (them-6tn8aozf)
    public const string DaGui = "Đã gửi Ba Mẹ!";
    public static string ConXin(string ten) => "Con xin thêm " + ten;
    /// <summary>Dòng lời xin trong thẻ «Chờ có mạng» (mất mạng): «Xin thêm YouTube».</summary>
    public static string DongDaLuu(string ten) => "Xin thêm " + ten;
    public const string DangCho = "Đang chờ Ba Mẹ";
    public const string TraLoiBaoNgay = "Ba Mẹ trả lời là máy báo con ngay.";
    /// <summary>«Chơi tiếp · còn 18 sao = 18 phút»; hết sao ⇒ «Về Hôm nay».</summary>
    public static string ChoiTiep(double? phutCon) { var p = SaoView.Phut(phutCon); return p > 0 ? $"Chơi tiếp · còn {p} sao = {p} phút" : "Về Hôm nay"; }

    // Ba Mẹ đã thêm (them-359v1pre)
    public static string DaThem(string? nguoi) => XinVayView.TenBaMe(nguoi) + " đã thêm!";
    /// <summary>«Tính phút · 18 sao = 18 phút» / «Không tính phút · không trừ sao».</summary>
    public static string NhomDaThem(bool khongTinh, double? phutCon)
    {
        if (khongTinh) return "Không tính phút · không trừ sao";
        var p = SaoView.Phut(phutCon);
        return $"Tính phút · {p} sao = {p} phút";
    }
    public static string Mo(string ten) => "Mở " + ten;
    public static string MoTam(string? nguoi, int phut) => $"{XinVayView.TenBaMe(nguoi)} cho mở {phut} phút!";

    // Ba Mẹ chưa thêm (them-vkdikuo0)
    public static string ChuaThem(string ten) => "Ba Mẹ chưa thêm " + ten;
    public static string ConPhut(double? phutCon) { var p = SaoView.Phut(phutCon); return $"Con còn {p} sao = {p} phút chơi"; }
    /// <summary>Bong bóng: «Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé!» + lời nhắn của Ba Mẹ (nếu có).</summary>
    public static string LoiChuaThem(string ten, string? loiNhan)
        => $"Ba Mẹ chưa thêm {ten} lúc này. Con xin lại sau được nhé!" + (string.IsNullOrWhiteSpace(loiNhan) ? "" : " " + loiNhan!.Trim());
    public const string XinLai = "Xin lại";
    public const string VeTrangChinh = "Về trang chính";
}

/// <summary>#422: một app đã cài trên máy cho lưới «App trên máy» (dịch vụ → khay qua <see cref="PipeCmd.AppMay"/>).
/// <see cref="Muc"/> = định danh thật gửi máy chủ (tên exe chữ thường / gói Store — như <see cref="AppThat.Muc"/>), <see cref="Ten"/> = tên hiển thị.</summary>
public sealed class AppTrenMay
{
    public string Muc { get; set; } = "";
    public string Ten { get; set; } = "";
}

/// <summary>
/// #422 «Xin thêm app / web» (Bàn con-xin them-vkqmcblk Hôm nay · them-1bpjmixa menu khay · them-c0sycsos hộp chọn app · them-u94tbp3x hộp gõ web).
/// Hộp hai thẻ «App trên máy» (lưới app đã cài) / «Trang web» (ô địa chỉ); gửi POST device/xin-duyet {muc, ten, lyDo, kieu}; kết quả dùng lại màn
/// «Đã gửi Ba Mẹ!» / «… đã thêm!» / «Ba Mẹ chưa thêm …» của <see cref="XinThemView"/>. Lớp THUẦN để test.
/// </summary>
public static class XinThemChonView
{
    public const string KieuApp = "app";
    public const string KieuWeb = "web";

    /// <summary>Nút trên thẻ Sao ở Hôm nay (ngay dưới «Xin Ba Mẹ cho vay sao») — cả «Mở hết» lẫn «Theo danh sách».</summary>
    public const string NutHomNay = "Xin thêm app / web";
    /// <summary>Mục menu khay ngay dưới «Xin Ba Mẹ cho vay sao…».</summary>
    public const string MenuKhay = "Xin thêm app / web…";
    public const string TieuDeCuaSo = "AiiGrow · Xin thêm app / web";
    public const string Tieu = "Xin thêm app / web";
    public const string Phu = "Chọn app trên máy hoặc gõ địa chỉ trang web";
    public const string TheApp = "App trên máy";
    public const string TheWeb = "Trang web";
    public const string AppDaCai = "App đã cài trên máy";
    public const string DangDocApp = "Đang đọc app trên máy…";
    public const string ChuaCoApp = "Chưa đọc được app trên máy. Con thử lại sau chút, hoặc gõ địa chỉ ở thẻ «Trang web».";
    public const string DiaChiWeb = "Địa chỉ trang web";
    public const string GoiYWeb = "Gõ địa chỉ trang con muốn vào, ví dụ scratch.mit.edu";
    public const string LoiNhanChoBaMe = "Lời nhắn cho Ba Mẹ";
    public const string NutWeb = "Xin Ba Mẹ mở trang này";
    /// <summary>Kiểm tại máy trước khi gửi (cùng câu máy chủ trả với lỗi web_sai).</summary>
    public const string WebSai = "Gõ địa chỉ trang web, ví dụ scratch.mit.edu";

    /// <summary>Nút gửi ở thẻ app: «Xin Ba Mẹ thêm Minecraft»; chưa chọn ⇒ «Chọn một app để xin» (nút tắt).</summary>
    public static string NutApp(string? ten) => string.IsNullOrWhiteSpace(ten) ? "Chọn một app để xin" : XinThemView.Nut(ten.Trim());

    /// <summary>Chỉ «app» / «web» được gửi máy chủ; giá trị khác ⇒ null (không gửi trường kieu).</summary>
    public static string? ChuanKieu(string? kieu) => kieu is KieuApp or KieuWeb ? kieu : null;

    /// <summary>Kiểm cơ bản địa chỉ trang tại máy: bỏ «https://», đường dẫn / cổng (giữ «www.» — máy chủ tự chuẩn hoá, không tự nới thành «edu.vn»); phải là tên miền có dấu chấm, đuôi ≥ 2 chữ cái.
    /// Trả tên miền chữ thường (gửi máy chủ — máy chủ vẫn chuẩn hoá lại) hoặc null ⇒ hiện <see cref="WebSai"/>.</summary>
    public static string? ChuanWeb(string? diaChi)
    {
        var t = (diaChi ?? "").Trim().ToLowerInvariant();
        if (t.Length == 0 || t.Length > XinMoView.MucToiDa || t.Any(char.IsWhiteSpace)) return null;
        var i = t.IndexOf("://", StringComparison.Ordinal);
        if (i >= 0) t = t[(i + 3)..];
        var cat = t.IndexOfAny(new[] { '/', '?', '#' });
        if (cat >= 0) t = t[..cat];
        var at = t.LastIndexOf('@');
        if (at >= 0) t = t[(at + 1)..];
        var cong = t.IndexOf(':');
        if (cong >= 0) t = t[..cong];
        t = t.TrimEnd('.');
        var nhan = t.Split('.');
        if (nhan.Length < 2) return null;
        foreach (var n in nhan)
            if (n.Length is 0 or > 63 || n[0] == '-' || n[^1] == '-' || !n.All(c => char.IsLetterOrDigit(c) || c == '-')) return null;
        var duoi = nhan[^1];
        if (duoi.Length < 2 || !duoi.All(char.IsLetter) || DuoiTep.Contains(duoi)) return null;   // «paint.exe» là app, không phải trang
        return WebPolicy.Sach(t);   // cùng một định nghĩa tên miền với bộ áp luật web (chỉ a-z0-9.-) — duyệt xong là luật có hiệu lực
    }

    /// <summary>Đuôi tệp chạy được — gõ «roblox.exe» ở thẻ web là nhầm app.</summary>
    private static readonly HashSet<string> DuoiTep = new(StringComparer.Ordinal) { "exe", "msi", "bat", "cmd", "lnk", "appx", "msix" };

    /// <summary>Lưới app: bỏ mục trống / trùng (giữ bản đầu), bỏ chính AiiGrow, xếp theo tên (không phân biệt hoa thường).</summary>
    public static List<AppTrenMay> Loc(IEnumerable<AppTrenMay>? ds)
    {
        var thay = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ra = new List<AppTrenMay>();
        foreach (var a in ds ?? Enumerable.Empty<AppTrenMay>())
        {
            var muc = (a.Muc ?? "").Trim();
            if (muc.Length == 0 || muc.StartsWith("aiigrow", StringComparison.OrdinalIgnoreCase) || !thay.Add(muc)) continue;
            var ten = string.IsNullOrWhiteSpace(a.Ten) ? muc : a.Ten.Trim();
            ra.Add(new AppTrenMay { Muc = muc, Ten = ten });
        }
        ra.Sort((x, y) => string.Compare(x.Ten, y.Ten, StringComparison.CurrentCultureIgnoreCase));
        return ra;
    }
}
