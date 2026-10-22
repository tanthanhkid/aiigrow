using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace AiiGrow.Service;

/// <summary>
/// Lọc sự kiện Sentry trước khi gửi (review #52): mỗi loại lỗi tối đa MỘT sự kiện/giờ trên một máy (lỗi lặp mỗi 30–60 giây như token_sai,
/// Set-AppLockerPolicy trên Windows Home không làm ngập project); bỏ tên tài khoản trong đường dẫn C:\Users\&lt;tên&gt;; không gửi User/tên máy.
/// </summary>
internal static class SentryLoc
{
    private static readonly ConcurrentDictionary<string, DateTimeOffset> _lanGui = new();
    private static readonly TimeSpan Cach = TimeSpan.FromHours(1);
    private static readonly Regex UsersRe = new(@"(?i)([a-z]:\\users\\)[^\\""'\s]+", RegexOptions.Compiled);

    public static SentryEvent? Loc(SentryEvent e, DateTimeOffset now)
    {
        var khoa = Khoa(e);
        if (_lanGui.TryGetValue(khoa, out var truoc) && now - truoc < Cach) return null;
        _lanGui[khoa] = now;
        e.User = new SentryUser();
        e.ServerName = null;
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
