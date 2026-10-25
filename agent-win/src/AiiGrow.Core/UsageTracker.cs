namespace AiiGrow.Core;

/// <summary>Cộng dồn giây dùng theo (ngày, app); xuất ra phút nguyên khi sync, phần lẻ để lại.</summary>
public sealed class UsageTracker
{
    private readonly Dictionary<(string Day, string App), (string Name, double Sec)> _d = new();
    /// <summary>Tổng giây đã dùng TRONG NGÀY theo app (không bị Drain trừ) — cho thẻ «Đã dùng hôm nay» của khay. Chỉ giữ ngày mới nhất.
    /// Dịch vụ khởi động lại ⇒ đếm lại từ 0 (máy chủ vẫn giữ số lớn hơn bằng greatest).</summary>
    private readonly Dictionary<string, (string Name, double Sec)> _homNay = new();
    private string _ngayHomNay = "";
    private readonly object _gate = new();

    /// <summary>Định danh dùng khi khay chết (không biết app tiền cảnh) — không hiện ở «đã dùng theo app».</summary>
    public const string KhongRo = "khong-ro";

    public void Add(DateTimeOffset localNow, string appId, string appName, double seconds)
    {
        if (seconds <= 0 || string.IsNullOrWhiteSpace(appId)) return;
        var key = (localNow.DateTime.ToString("yyyy-MM-dd"), appId.Trim().ToLowerInvariant());
        lock (_gate)
        {
            _d.TryGetValue(key, out var cur);
            _d[key] = (string.IsNullOrWhiteSpace(appName) ? (cur.Name ?? appId) : appName, cur.Sec + seconds);
            if (key.Item1 != _ngayHomNay)
            {
                if (string.CompareOrdinal(key.Item1, _ngayHomNay) < 0) return;   // giờ máy lùi qua nửa đêm: không trộn vào ngày mới
                _homNay.Clear();
                _ngayHomNay = key.Item1;
            }
            _homNay.TryGetValue(key.Item2, out var hn);
            _homNay[key.Item2] = (string.IsNullOrWhiteSpace(appName) ? (hn.Name ?? appId) : appName, hn.Sec + seconds);
        }
    }

    /// <summary>Tên chỉ là tên tiến trình (không mô tả tệp — vd «RobloxPlayerBeta») ⇒ dùng tên đẹp của định danh (TenDepApp: «Roblox»).</summary>
    private static string TenDep(string id, string? ten)
    {
        var goc = id.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? id[..^4] : id;
        return string.IsNullOrWhiteSpace(ten) || string.Equals(ten, goc, StringComparison.OrdinalIgnoreCase) || string.Equals(ten, id, StringComparison.OrdinalIgnoreCase)
            ? TrayView.FriendlyAppName(id, null) : ten;
    }

    /// <summary>Phút đã dùng hôm nay theo app, nhiều nhất trước (bỏ «không rõ» và app dưới 1 phút), tối đa <paramref name="toiDa"/> dòng.</summary>
    public List<DungApp> DungHomNay(DateTimeOffset localNow, int toiDa = 8)
    {
        var ngay = localNow.DateTime.ToString("yyyy-MM-dd");
        lock (_gate)
        {
            if (ngay != _ngayHomNay) return new List<DungApp>();
            return _homNay.Where(x => x.Key != KhongRo && x.Value.Sec >= 60)
                .OrderByDescending(x => x.Value.Sec).ThenBy(x => x.Key, StringComparer.Ordinal).Take(Math.Max(0, toiDa))
                .Select(x => new DungApp { AppId = x.Key, Ten = TenDep(x.Key, x.Value.Name), Phut = (int)(x.Value.Sec / 60) })
                .ToList();
        }
    }

    public List<UsageEntry> Drain()
    {
        var res = new List<UsageEntry>();
        lock (_gate)
        {
            foreach (var k in _d.Keys.ToList())
            {
                var v = _d[k];
                int m = (int)(v.Sec / 60.0);
                if (m <= 0) continue;
                res.Add(new UsageEntry(k.Day, k.App, v.Name, m));
                _d[k] = (v.Name, v.Sec - m * 60.0);
            }
        }
        return res;
    }

    /// <summary>Trả lại khi sync thất bại để không mất số phút đã đếm.</summary>
    public void Restore(IEnumerable<UsageEntry> entries)
    {
        lock (_gate)
        {
            foreach (var e in entries)
            {
                var key = (e.Day, e.AppId);
                _d.TryGetValue(key, out var cur);
                _d[key] = (e.AppName, cur.Sec + e.Minutes * 60.0);
            }
        }
    }
}
