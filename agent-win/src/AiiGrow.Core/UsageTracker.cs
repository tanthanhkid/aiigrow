namespace AiiGrow.Core;

/// <summary>Cộng dồn giây dùng theo (ngày, app); xuất ra phút nguyên khi sync, phần lẻ để lại.</summary>
public sealed class UsageTracker
{
    private readonly Dictionary<(string Day, string App), (string Name, double Sec)> _d = new();
    private readonly object _gate = new();

    public void Add(DateTimeOffset localNow, string appId, string appName, double seconds)
    {
        if (seconds <= 0 || string.IsNullOrWhiteSpace(appId)) return;
        var key = (localNow.DateTime.ToString("yyyy-MM-dd"), appId.Trim().ToLowerInvariant());
        lock (_gate)
        {
            _d.TryGetValue(key, out var cur);
            _d[key] = (string.IsNullOrWhiteSpace(appName) ? (cur.Name ?? appId) : appName, cur.Sec + seconds);
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
