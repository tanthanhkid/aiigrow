using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace AiiGrow.Service;

/// <summary>
/// Lọc sự kiện Sentry trước khi gửi (review #52): mỗi loại lỗi tối đa MỘT sự kiện/giờ trên một máy (lỗi lặp mỗi 30–60 giây như token_sai,
/// Set-AppLockerPolicy trên Windows Home không làm ngập project); bỏ tên tài khoản trong đường dẫn C:\Users\&lt;tên&gt;; không gửi User/tên máy.
/// </summary>
internal static class SentryLoc
{
    // mốc theo đồng hồ đơn điệu (Environment.TickCount64) — Con chỉnh giờ máy không làm Sentry im nhiều ngày
    private static readonly ConcurrentDictionary<string, long> _lanGui = new();
    private const long CachMs = 60 * 60 * 1000;
    // tên tài khoản có thể có dấu cách («Bao Anh») ⇒ ăn tới dấu \ / nháy / xuống dòng kế
    private static readonly Regex UsersRe = new(@"(?i)([a-z]:\\users\\)[^\\""'\r\n]+", RegexOptions.Compiled);

    public static SentryEvent? Loc(SentryEvent e, long nowMs)
    {
        var khoa = Khoa(e);
        var duoc = true;
        _lanGui.AddOrUpdate(khoa, nowMs, (_, truoc) => { if (nowMs - truoc < CachMs) { duoc = false; return truoc; } return nowMs; });
        if (!duoc) return null;
        e.User = new SentryUser();
        e.ServerName = null;
        // Sentry.Extensions.Logging biến tham số mẫu log thành TAG (vd {e} = nguyên văn lỗi PowerShell có SID/đường dẫn) ⇒ bỏ hết tag, extra
        foreach (var k in e.Tags.Keys.ToList()) e.UnsetTag(k);
        foreach (var k in e.Extra.Keys.ToList()) e.SetExtra(k, null);
        if (e.Message is { } m)
        {
            if (m.Message != null) m.Message = AnUsers(m.Message);
            if (m.Formatted != null) m.Formatted = AnUsers(m.Formatted);
        }
        foreach (var x in e.SentryExceptions ?? Enumerable.Empty<Sentry.Protocol.SentryException>())
            if (x.Value != null) x.Value = AnUsers(x.Value);
        return e;
    }

    /// <summary>Loại lỗi = mẫu thông điệp log (chưa thay tham số) + kiểu ngoại lệ — cùng chỗ ghi log ⇒ cùng khoá.</summary>
    internal static string Khoa(SentryEvent e) =>
        (e.Message?.Message ?? e.Message?.Formatted ?? "") + "|" + string.Join(",", (e.SentryExceptions ?? Enumerable.Empty<Sentry.Protocol.SentryException>()).Select(x => x.Type));

    internal static string AnUsers(string s) => UsersRe.Replace(s, "$1<an>");
}
