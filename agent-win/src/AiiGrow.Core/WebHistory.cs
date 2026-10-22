using System.Globalization;
using System.Net;

namespace AiiGrow.Core;

// GHI LỊCH SỬ WEB của Con (Chrome / Edge / Brave): agent đọc lịch sử trình duyệt trên máy (dịch vụ chạy SYSTEM nên đọc được hồ sơ của Con),
// gộp thành TỔNG theo (ngày, tên miền gốc): số lần mở + số giây ở trang + lần cuối, rồi gửi POST /api/device/web/lich-su (server/lib/web.ts).
// CHỈ tên miền + đếm rời khỏi máy — không URL đầy đủ, không tiêu đề trang. Gửi TỔNG của hôm qua + hôm nay mỗi lần (không giữ con trỏ):
// gửi lại bao nhiêu lần cũng không cộng đôi (máy chủ lấy giá trị lớn hơn). Phần THUẦN ở đây; đọc tệp SQLite ở AiiGrow.Service.

/// <summary>Một lượt ghé trang đọc từ bảng visits của trình duyệt.</summary>
public sealed record WebVisit(string Url, DateTimeOffset Luc, double GiayO);

/// <summary>Tổng của một tên miền trong một ngày (ngày theo giờ máy).</summary>
public sealed record WebDayDomain(string Ngay, string TenMien, int SoLan, int Giay, DateTimeOffset LanCuoi);

public static class ChromeTime
{
    // Chromium lưu visit_time = micro giây kể từ 1601-01-01 UTC.
    private const long Lech1601Ms = 11_644_473_600_000L;

    public static DateTimeOffset ToDateTimeOffset(long micro) => DateTimeOffset.FromUnixTimeMilliseconds(micro / 1000 - Lech1601Ms);

    public static long FromDateTimeOffset(DateTimeOffset t) => (t.ToUnixTimeMilliseconds() + Lech1601Ms) * 1000;
}

public static class WebDomain
{
    private static readonly HashSet<string> NhanQuocGia = new() { "com", "net", "org", "edu", "gov", "co", "ac", "or", "ne", "go", "gob", "info", "biz" };

    /// <summary>URL ⇒ tên miền gốc (bỏ www; vn: «gamek.vn», «hdbank.com.vn»). Không phải http(s), IP, localhost ⇒ null.</summary>
    public static string? Goc(string? url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u)) return null;
        if (u.Scheme != Uri.UriSchemeHttp && u.Scheme != Uri.UriSchemeHttps) return null;
        return GocTuHost(u.IdnHost);
    }

    public static string? GocTuHost(string? host)
    {
        var h = (host ?? "").Trim().Trim('.').ToLowerInvariant();
        if (h.StartsWith("www.")) h = h[4..];
        if (h.Length == 0 || !h.Contains('.') || IPAddress.TryParse(h, out _) || h.StartsWith("[")) return null;
        var p = h.Split('.');
        if (p.Length <= 2) return h;
        // «bbc.co.uk», «hdbank.com.vn»: nhãn cuối 2 chữ cái + nhãn trước là loại tên miền ⇒ giữ 3 nhãn
        int giu = p[^1].Length == 2 && NhanQuocGia.Contains(p[^2]) ? 3 : 2;
        return string.Join('.', p.Skip(p.Length - giu));
    }
}

public static class WebHistory
{
    /// <summary>Mỗi lượt ghé tính tối đa ngần này giây: tab bỏ quên cả đêm không thổi phồng số liệu (xem thêm giới hạn ở README).</summary>
    public const double TranMotLuotGiay = 3 * 3600;

    public static List<WebDayDomain> TongHop(IEnumerable<WebVisit> visits, string? boQuaMien = null)
    {
        var d = new Dictionary<(string Ngay, string Mien), (int Lan, double Giay, DateTimeOffset Cuoi)>();
        foreach (var v in visits)
        {
            var mien = WebDomain.Goc(v.Url);
            if (mien == null || mien == boQuaMien) continue;
            var ngay = v.Luc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            d.TryGetValue((ngay, mien), out var cur);
            d[(ngay, mien)] = (cur.Lan + 1, cur.Giay + Math.Clamp(v.GiayO, 0, TranMotLuotGiay), cur.Cuoi > v.Luc ? cur.Cuoi : v.Luc);
        }
        return d.Select(kv => new WebDayDomain(kv.Key.Ngay, kv.Key.Mien, kv.Value.Lan, (int)Math.Round(kv.Value.Giay), kv.Value.Cuoi))
            .OrderBy(x => x.Ngay, StringComparer.Ordinal).ThenBy(x => x.TenMien, StringComparer.Ordinal).ToList();
    }

    /// <summary>Mốc đầu của khoảng đọc: 00:00 hôm qua theo giờ máy (đủ bù khi máy tắt / mất mạng vài giờ).</summary>
    public static DateTimeOffset MocDoc(DateTimeOffset now)
    {
        var l = now.ToLocalTime();
        return new DateTimeOffset(l.Year, l.Month, l.Day, 0, 0, 0, l.Offset).AddDays(-1);
    }
}

/// <summary>POST /api/device/web/lich-su. Bearer = token thiết bị.</summary>
public sealed class WebHistoryClient : IDisposable
{
    private readonly HttpClient _http;
    public WebHistoryClient(string server, string token, HttpMessageHandler? handler = null) { _http = DeviceHttp.New(server, token, handler); }

    public async Task GuiAsync(IReadOnlyList<WebDayDomain> ds, CancellationToken ct = default)
        => await DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/web/lich-su",
            new { ds = ds.Select(x => new { ngay = x.Ngay, tenMien = x.TenMien, soLan = x.SoLan, giay = x.Giay, lanCuoi = x.LanCuoi.ToUniversalTime().ToString("O") }) }, ct);

    public void Dispose() => _http.Dispose();
}
