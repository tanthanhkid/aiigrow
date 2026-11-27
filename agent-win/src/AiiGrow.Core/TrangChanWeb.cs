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
    public static string? TimMien(string? tieuDe, IEnumerable<string>? webChan, IEnumerable<string>? webCho = null)
    {
        if (webChan == null) return null;
        var s = TabDangXem.ChuanHoa(tieuDe).ToLowerInvariant();
        var gach = s.IndexOf(" - ", StringComparison.Ordinal);   // «địa chỉ - Tên hồ sơ» (đuôi hồ sơ đứng trước tên trình duyệt)
        if (gach > 0) s = s[..gach];
        s = Regex.Replace(s, @"^[a-z][a-z0-9+.-]*://", "");
        var cat = s.IndexOfAny(new[] { '/', '?', '#' });
        if (cat >= 0) s = s[..cat];
        s = Regex.Replace(s, @":\d+$", "");
        if (s.Length == 0 || s.Contains(' ') || !s.Contains('.')) return null;
        foreach (var raw in webChan)
        {
            var m = (raw ?? "").Trim().ToLowerInvariant().TrimStart('*', '.');
            if (m.Length == 0 || !m.Contains('.')) continue;
            if (s != m && !s.EndsWith("." + m, StringComparison.Ordinal)) continue;
            if (webCho != null && webCho.Any(c => { var k = (c ?? "").Trim().ToLowerInvariant().TrimStart('*', '.'); return k.Length > 0 && (s == k || s.EndsWith("." + k, StringComparison.Ordinal)); })) return null;   // Ba Mẹ đã cho trang này
            return m;
        }
        return null;
    }

    /// <summary>Nên bật hộp cho <paramref name="mien"/> lúc <paramref name="bay"/> không? Có ⇒ ghi mốc (nghỉ <see cref="NghiGiay"/> giây cho cùng trang).</summary>
    public bool NenHien(string mien, DateTimeOffset bay)
    {
        if (_luc.TryGetValue(mien, out var truoc) && (bay - truoc).TotalSeconds < NghiGiay) return false;
        _luc[mien] = bay;
        return true;
    }
}
