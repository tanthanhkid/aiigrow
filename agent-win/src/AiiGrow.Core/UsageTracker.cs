namespace AiiGrow.Core;

/// <summary>Cộng dồn giây dùng theo (ngày, app, bé); xuất ra phút nguyên khi sync, phần lẻ để lại. 15/11 (#267): máy chung ⇒ mỗi bé một dòng (`usage[].con`).</summary>
public sealed class UsageTracker
{
    private readonly Dictionary<(string Day, string App, string Con), (string Name, double Sec)> _d = new();
    /// <summary>Tổng giây đã dùng TRONG NGÀY theo app (không bị Drain trừ) — cho thẻ «Đã dùng hôm nay» của khay. Chỉ giữ ngày mới nhất.
    /// Dịch vụ khởi động lại ⇒ đếm lại từ 0 (máy chủ vẫn giữ số lớn hơn bằng greatest).</summary>
    private readonly Dictionary<(string Con, string App), (string Name, double Sec)> _homNay = new();
    /// <summary>#433 A3: lần cuối (giờ máy) mỗi dòng được cộng giây — `UsageEntry.CuoiLuc`.</summary>
    private readonly Dictionary<(string Day, string App, string Con), DateTimeOffset> _cuoi = new();
    private string _ngayHomNay = "";
    private readonly object _gate = new();

    /// <summary>#703: múi giờ gia đình từ Policy (null = giờ máy). Ngày của mọi dòng dùng = ngày gia đình, khớp «hôm nay» máy chủ trừ sao.
    /// Đổi múi (Policy đầu tiên sau khi khởi động, nhà đổi múi) ⇒ ngày «hôm nay» của khay theo múi mới, không kẹt ở ngày cũ đi trước.</summary>
    public string? Tz
    {
        get { lock (_gate) return _tz; }
        set { lock (_gate) { if (string.Equals(_tz, value, StringComparison.Ordinal)) return; _tz = value; _doiMui = true; } }
    }
    private string? _tz;
    private bool _doiMui;

    /// <summary>Định danh dùng khi khay chết (không biết app tiền cảnh) — không hiện ở «đã dùng theo app».</summary>
    public const string KhongRo = "khong-ro";

    /// <param name="con">Id bé đang dùng máy (null / trống = không biết).</param>
    public void Add(DateTimeOffset localNow, string appId, string appName, double seconds, string? con = null)
    {
        if (seconds <= 0 || string.IsNullOrWhiteSpace(appId)) return;
        lock (_gate)
        {
            var key = (NgayGiaDinh.Cua(localNow, _tz), appId.Trim().ToLowerInvariant(), con?.Trim() ?? "");
            _d.TryGetValue(key, out var cur);
            _d[key] = (string.IsNullOrWhiteSpace(appName) ? (cur.Name ?? appId) : appName, cur.Sec + seconds);
            if (!_cuoi.TryGetValue(key, out var cu) || localNow > cu) _cuoi[key] = localNow;
            if (_doiMui)
            {
                // vừa đổi múi: giữ số đếm trong ngày, chỉ gắn sang ngày theo múi mới (không coi là «giờ lùi»)
                _doiMui = false;
                if (_ngayHomNay.Length > 0) _ngayHomNay = key.Item1;
            }
            if (key.Item1 != _ngayHomNay)
            {
                if (string.CompareOrdinal(key.Item1, _ngayHomNay) < 0) return;   // giờ máy lùi qua nửa đêm: không trộn vào ngày mới
                _homNay.Clear();
                _ngayHomNay = key.Item1;
            }
            _homNay.TryGetValue((key.Item3, key.Item2), out var hn);
            _homNay[(key.Item3, key.Item2)] = (string.IsNullOrWhiteSpace(appName) ? (hn.Name ?? appId) : appName, hn.Sec + seconds);
        }
    }

    /// <summary>Tên chỉ là tên tiến trình (không mô tả tệp — vd «RobloxPlayerBeta») ⇒ dùng tên đẹp của định danh (TenDepApp: «Roblox»).</summary>
    private static string TenDep(string id, string? ten)
    {
        var goc = id.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? id[..^4] : id;
        return string.IsNullOrWhiteSpace(ten) || string.Equals(ten, goc, StringComparison.OrdinalIgnoreCase) || string.Equals(ten, id, StringComparison.OrdinalIgnoreCase)
            ? TrayView.FriendlyAppName(id, null) : ten;
    }

    /// <summary>Phút đã dùng hôm nay theo app CỦA BÉ <paramref name="con"/> (null = mọi bé), nhiều nhất trước (bỏ «không rõ» và app dưới 1 phút),
    /// tối đa <paramref name="toiDa"/> dòng.</summary>
    public List<DungApp> DungHomNay(DateTimeOffset localNow, int toiDa = 8, string? con = null)
    {
        var ngay = NgayGiaDinh.Cua(localNow, _tz);
        lock (_gate)
        {
            if (ngay != _ngayHomNay) return new List<DungApp>();
            return _homNay.Where(x => con == null || x.Key.Con == con.Trim())
                .GroupBy(x => x.Key.App).Select(g => (App: g.Key, Name: g.First().Value.Name, Sec: g.Sum(x => x.Value.Sec)))
                .Where(x => x.App != KhongRo && x.Sec >= 60 && !ProcessGuard.KhongGhiDaDung(x.App))
                .OrderByDescending(x => x.Sec).ThenBy(x => x.App, StringComparer.Ordinal).Take(Math.Max(0, toiDa))
                .Select(x => new DungApp { AppId = x.App, Ten = TenDep(x.App, x.Name), Phut = (int)(x.Sec / 60) })
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
                res.Add(new UsageEntry(k.Day, k.App, v.Name, m, k.Con.Length > 0 ? k.Con : null, _cuoi.TryGetValue(k, out var cl) ? cl : null));
                _d[k] = (v.Name, v.Sec - m * 60.0);
            }
        }
        return res;
    }

    /// <summary>#433 A8: số giây lẻ (dưới 1 phút mỗi dòng) của NGÀY <paramref name="localNow"/> còn nằm trong bộ đếm — chưa gửi máy chủ nên số sao máy chủ
    /// vừa trả CHƯA trừ phần này. <paramref name="tinh"/> lọc app (vd chỉ app «Tính phút»); <paramref name="con"/> = bé (null = chỉ dòng không bé).
    /// Giây lẻ của ngày cũ không bao giờ gửi nữa ⇒ không tính.</summary>
    public double GiayChuaGui(DateTimeOffset localNow, Func<string, bool> tinh, string? con = null)
    {
        var ngay = NgayGiaDinh.Cua(localNow, _tz);
        var be = con?.Trim() ?? "";
        lock (_gate)
            return _d.Where(x => x.Key.Day == ngay && x.Key.Con == be && tinh(x.Key.App)).Sum(x => x.Value.Sec);
    }
}

/// <summary>#703: ngày «yyyy-MM-dd» theo múi giờ gia đình. Máy đặt sai múi (UTC, giờ Mỹ…) vẫn ghi phút vào đúng ngày máy chủ đang trừ sao
/// — trước đây 5h sáng giờ VN trên máy UTC ghi vào «hôm qua» ⇒ máy chủ không trừ. Múi lạ / null ⇒ giờ của chính mốc (như cũ).</summary>
public static class NgayGiaDinh
{
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, TimeZoneInfo?> _cache = new();
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, bool> _khongTra = new();

    /// <summary>Nhớ múi gia đình từ Policy: tên tra được trên máy ⇒ dùng múi máy (đủ giờ mùa hè); không tra được (dịch vụ chạy InvariantGlobalization,
    /// không có ICU) ⇒ múi cố định theo độ lệch máy chủ gửi kèm — Policy làm mới mỗi lượt đồng bộ nên đổi giờ mùa hè cũng theo kịp.</summary>
    public static void DangKy(string? tz, int? lechPhut)
    {
        if (string.IsNullOrWhiteSpace(tz)) return;
        var id = tz.Trim();
        if (!_khongTra.ContainsKey(id))
        {
            if (TraMay(id) is { } may) { _cache[id] = may; return; }
            _khongTra[id] = true;      // không tra lại mỗi lượt đồng bộ (mỗi lần tra hụt là một ngoại lệ)
        }
        if (lechPhut is int p && Math.Abs(p) <= 14 * 60 && !(_cache.TryGetValue(id, out var cu) && cu?.BaseUtcOffset == TimeSpan.FromMinutes(p)))
            _cache[id] = TimeZoneInfo.CreateCustomTimeZone(id, TimeSpan.FromMinutes(p), id, id);
    }

    private static TimeZoneInfo? TraMay(string id)
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { }
        try { if (TimeZoneInfo.TryConvertIanaIdToWindowsId(id, out var w)) return TimeZoneInfo.FindSystemTimeZoneById(w); } catch { }
        return null;
    }

    public static TimeZoneInfo? Mui(string? tz)
    {
        if (string.IsNullOrWhiteSpace(tz)) return null;
        return _cache.GetOrAdd(tz.Trim(), TraMay);
    }

    /// <summary>Ngày (00:00) theo múi gia đình; múi lạ / null ⇒ ngày theo độ lệch của chính mốc (như cũ — người gọi truyền giờ máy:
    /// DateTimeOffset.Now / ToLocalTime()).</summary>
    public static DateTime Ngay(DateTimeOffset luc, string? tz)
    {
        var m = Mui(tz);
        return (m == null ? luc.DateTime : TimeZoneInfo.ConvertTime(luc, m).DateTime).Date;
    }

    public static string Cua(DateTimeOffset luc, string? tz) => Ngay(luc, tz).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
}

/// <summary>#418: tiến trình của CHÍNH AiiGrow — khay, app Con, kể cả khay cũ bộ cập nhật đổi tên «AiiGrow.Tray.exe.cu-xxxxxxxx»
/// (CapNhatSetup.ChepDe) mà vẫn chạy tới lần đăng nhập sau — không phải «app Con dùng»: gộp về <see cref="Khay"/> (máy chủ xếp hệ thống —
/// ALLOWLIST_HE_THONG), không thành «app mới chờ Ba Mẹ xếp», không trừ sao. Hai lớp: TÊN đúng mẫu (<see cref="La"/>, cùng mẫu máy chủ
/// server/lib/luat-app.ts › laAppAiiGrow) VÀ tệp chạy nằm TRONG thư mục cài (<see cref="ChayTuThuMucCai"/> — chỉ quản trị ghi được):
/// game chép ra Desktop đổi tên «AiiGrow.Tray.exe.cu-1a2b3c4d» không thoát đếm phút.</summary>
public static class AppAiiGrow
{
    public const string Khay = "aiigrow.tray.exe";
    public const string Ten = "AiiGrow";
    private static readonly string[] Goc = { "aiigrow.tray.exe", "aiigrow.kid.exe" };

    /// <summary>Định danh khay báo (tên tiến trình chữ thường + «.exe»): «aiigrow.tray.exe», «aiigrow.kid.exe»,
    /// «aiigrow.tray.exe.cu-623a59b6.exe» (ProcessName của tệp «AiiGrow.Tray.exe.cu-623a59b6» giữ nguyên đuôi lạ, khay ghép thêm «.exe»).</summary>
    public static bool La(string? appId)
    {
        if (string.IsNullOrWhiteSpace(appId)) return false;
        var id = appId.Trim().ToLowerInvariant();
        var i = id.IndexOf(".exe.cu-", StringComparison.Ordinal);
        if (i >= 0)
        {
            if (!id.EndsWith(".exe", StringComparison.Ordinal) || id.Length <= i + 12) return false;
            var duoi = id[(i + 8)..^4];
            if (!duoi.All(char.IsAsciiHexDigit)) return false;
            id = id[..(i + 4)];
        }
        return Array.IndexOf(Goc, id) >= 0;
    }

    /// <summary>Định danh khay CŨ «aiigrow.tray.exe.cu-xxxxxxxx.exe» (khay / app Con tên thường đã ở allowlist hệ thống — không cần gộp).</summary>
    public static bool LaKhayCu(string? appId) => La(appId) && appId!.Contains(".exe.cu-", StringComparison.OrdinalIgnoreCase);

    /// <summary>Định danh như khay báo cho một tệp chạy: «…\AiiGrow.Tray.exe» ⇒ «aiigrow.tray.exe»; «…\AiiGrow.Tray.exe.cu-623a59b6» ⇒
    /// «aiigrow.tray.exe.cu-623a59b6.exe» (ProcessName chỉ bỏ đuôi «.exe»).</summary>
    public static string DinhDanh(string duongTep)
    {
        var ten = duongTep.Replace('/', '\\').Split('\\')[^1];
        if (ten.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) ten = ten[..^4];
        return ten.ToLowerInvariant() + ".exe";
    }

    /// <summary>Có tiến trình <paramref name="appId"/> là khay AiiGrow (kể cả khay cũ «.cu-») chạy từ ĐÚNG thư mục cài — cùng phép kiểm khách pipe
    /// (<see cref="KhayThat.La"/>) — trong danh sách tiến trình phiên Con.</summary>
    public static bool ChayTuThuMucCai(string appId, IEnumerable<RunningProc> ds, string thuMucCai)
    {
        if (string.IsNullOrWhiteSpace(thuMucCai)) return false;
        var khay = Path.Combine(thuMucCai, Paths.TrayExeName);
        var id = appId.Trim().ToLowerInvariant();
        return ds.Any(r => DinhDanh(r.Path) == id && KhayThat.La(r.Path, khay));
    }
}
