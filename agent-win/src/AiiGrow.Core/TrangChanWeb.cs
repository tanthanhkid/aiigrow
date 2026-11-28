using System.Text.RegularExpressions;

namespace AiiGrow.Core;

// #741: bé vào trang Ba Mẹ chặn ⇒ trình duyệt hiện trang lỗi tiếng Anh (URLBlocklist, không tuỳ biến được). Trang lỗi đó đặt tiêu đề tab = địa chỉ (youtube.com / https://www.youtube.com/…).
// Khay thấy tiêu đề tab tiền cảnh (TabDangXem) khớp tên miền trong danh sách chặn ⇒ mở hộp web tiếng Việt kèm tên miền + nút «Xin Ba Mẹ mở».
// Phần THUẦN: không đọc đồng hồ (mốc giờ truyền vào), không đụng giao diện — test được ngoài Windows.
public sealed class TrangChanWeb
{
    /// <summary>Cùng một trang không bật hộp lại trong chừng này giây (hộp đang mở / vừa đóng).</summary>
    public const int NghiGiay = 120;

    private readonly Dictionary<string, DateTimeOffset> _luc = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Tiêu đề cửa sổ trình duyệt ⇒ tên miền bị chặn khớp (theo danh sách <paramref name="webChan"/>), không khớp ⇒ null.
    /// Chỉ nhận tiêu đề CÓ DẠNG ĐỊA CHỈ (không dấu cách), nên tab «Hướng dẫn youtube.com» của trang khác không bị nhầm.</summary>
    /// <param name="chiChoPhep">#741 (test 28/11): chế độ «Theo danh sách» (chi_cho_phep) — trình duyệt chặn MỌI trang («*») trừ <paramref name="webCho"/> và
    /// <paramref name="mayChu"/>, nên trang bị chặn (tiktok.com) KHÔNG nằm trong <paramref name="webChan"/>: tiêu đề dạng địa chỉ không khớp danh sách cho phép ⇒ là trang chặn.</param>
    public static string? TimMien(string? tieuDe, IEnumerable<string>? webChan, IEnumerable<string>? webCho = null, bool chiChoPhep = false, string? mayChu = null)
    {
        if (webChan == null) return null;
        var s = TabDangXem.ChuanHoa(tieuDe).ToLowerInvariant();
        var gach = s.IndexOf(" - ", StringComparison.Ordinal);   // «địa chỉ - Tên hồ sơ» (đuôi hồ sơ đứng trước tên trình duyệt)
        var duoi = gach > 0 ? s[(gach + 3)..].Trim() : "";
        if (gach > 0) s = s[..gach];
        s = Regex.Replace(s, @"^[a-z][a-z0-9+.-]*://", "");
        var cat = s.IndexOfAny(new[] { '/', '?', '#' });
        if (cat >= 0) s = s[..cat];
        s = Regex.Replace(s, @":\d+$", "");
        if (s.Length == 0 || s.Contains(' ') || !s.Contains('.') || !Regex.IsMatch(s, @"^[a-z0-9.-]+$")) return null;
        if (chiChoPhep)
        {
            // Ở đây MỌI tiêu đề dạng địa chỉ ngoài danh sách cho là ứng viên ⇒ siết: trang lỗi chặn đặt tiêu đề = ĐÚNG địa chỉ (sau nó chỉ còn tên hồ sơ trình duyệt).
            // Trang được cho có tiêu đề «tiktok.com - Google Search» / «Three.js» / «baitap.pdf» không bị báo nhầm.
            if (duoi.Length > 0 && (duoi.Contains(" - ") || duoi.Length > 40 || TrangThat.IsMatch(duoi))) return null;
            if (!ManChanView.LaTenMienThat(s) || DuoiTep.Contains(s[(s.LastIndexOf('.') + 1)..])) return null;
            var cho = (webCho ?? Array.Empty<string>()).Append(mayChu ?? "");
            if (Khop(s, cho)) return null;   // trang Ba Mẹ cho / máy chủ AiiGrow
            return s.StartsWith("www.", StringComparison.Ordinal) ? s[4..] : s;
        }
        foreach (var raw in webChan)
        {
            var m = (raw ?? "").Trim().ToLowerInvariant().TrimStart('*', '.');
            if (m.Length == 0 || !m.Contains('.')) continue;
            if (s != m && !s.EndsWith("." + m, StringComparison.Ordinal)) continue;
            if (webCho != null && Khop(s, webCho)) return null;   // Ba Mẹ đã cho trang này
            return m;
        }
        return null;
    }

    /// <summary>Đuôi tiêu đề là tên trang / máy tìm kiếm (không phải tên hồ sơ trình duyệt) ⇒ trang thật đang hiện, không phải trang lỗi chặn.</summary>
    private static readonly Regex TrangThat = new(@"google|bing|search|tìm|wikipedia|youtube|facebook|cốc cốc|coccoc|github|reddit|tiktok|zalo|duckduckgo|yahoo", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    /// <summary>Đuôi tệp / tên thư viện hay gặp trong tiêu đề («Three.js», «baitap.pdf») — không phải tên miền.</summary>
    private static readonly HashSet<string> DuoiTep = new(StringComparer.Ordinal)
        { "js", "ts", "py", "md", "txt", "json", "css", "html", "htm", "cs", "cpp", "java", "php", "xml", "yml", "yaml", "pdf", "png", "jpg", "jpeg", "gif", "svg", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "mp3", "mp4", "sb3" };

    private static bool Khop(string mien, IEnumerable<string> ds) => ds.Any(c =>
    {
        var k = (c ?? "").Trim().ToLowerInvariant().TrimStart('*', '.');
        if (k.StartsWith("www.", StringComparison.Ordinal)) k = k[4..];   // mục «www.youtube.com» cho cả youtube.com
        return k.Length > 0 && (mien == k || mien.EndsWith("." + k, StringComparison.Ordinal));
    });

    /// <summary>Nên bật hộp cho <paramref name="mien"/> lúc <paramref name="bay"/> không? Có ⇒ ghi mốc (nghỉ <see cref="NghiGiay"/> giây cho cùng trang).</summary>
    public bool NenHien(string mien, DateTimeOffset bay)
    {
        if (_luc.TryGetValue(mien, out var truoc) && (bay - truoc).TotalSeconds < NghiGiay) return false;
        _luc[mien] = bay;
        return true;
    }
}

/// <summary>#741 (test 28/11): hộp chặn APP bật lặp. Dịch vụ đóng lại cùng app mỗi nhịp (~5 giây — app mở lại / Windows không cho đóng) ⇒ khay đóng hộp cũ
/// dựng hộp mới mỗi lần: bé bấm ✖ / Esc / Alt+F4 xong hộp (và lớp mờ) hiện lại ngay, như không đóng được. Luật: hộp của đúng app đang mở ⇒ giữ, không dựng lại;
/// bé vừa đóng ⇒ cùng app bị chặn lại trong <see cref="NghiGiay"/> giây (tính từ lần chặn GẦN NHẤT — trượt) không bật lại. App vẫn bị đóng như cũ, chỉ hộp nghỉ.
/// THUẦN: mốc giờ truyền vào.</summary>
public sealed class HopChanLap
{
    public const int NghiGiay = 30;
    private readonly Dictionary<string, DateTimeOffset> _luc = new(StringComparer.OrdinalIgnoreCase);

    /// <param name="hopDangMo">Hộp chặn của đúng <paramref name="muc"/> đang mở.</param>
    public bool NenHien(string muc, bool hopDangMo, DateTimeOffset bay)
    {
        var k = (muc ?? "").Trim();
        var vuaChan = _luc.TryGetValue(k, out var truoc) && (bay - truoc).TotalSeconds < NghiGiay;
        _luc[k] = bay;
        return !hopDangMo && !vuaChan;
    }
}
