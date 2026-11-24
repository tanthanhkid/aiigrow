namespace AiiGrow.Core;

/// <summary>Chữ hiển thị trên tray (tách khỏi WinForms để test được).</summary>
public static class TrayView
{
    public enum KetQuaXin { Cho, Duoc, TuChoi, HetHan }

    /// <summary>Trạng thái lời xin thêm giờ máy chủ trả (từ mới «duoc» và từ gốc «dong_y» đều là được).</summary>
    public static KetQuaXin XinGio(string? status) => status switch
    {
        "duoc" or "dong_y" or "da_thuc_thi" or "tu_duyet" => KetQuaXin.Duoc,
        "tu_choi" => KetQuaXin.TuChoi,
        "het_han" or "huy" => KetQuaXin.HetHan,
        _ => KetQuaXin.Cho,
    };

    public static string FormatClock(double seconds)
    {
        var s = (int)Math.Max(0, Math.Ceiling(seconds));
        int h = s / 3600, m = s % 3600 / 60, sec = s % 60;
        return h > 0 ? $"{h}:{m:00}:{sec:00}" : $"{m}:{sec:00}";
    }

    /// <summary>Số lớn + dòng chú thích + số giây còn lại (null nếu không giới hạn).</summary>
    public static (string Big, string Caption, double? RemainingSec) Describe(TrayState s, DateTimeOffset receivedAt, DateTimeOffset now)
    {
        if (s.GrantEndsAt.HasValue && s.GrantEndsAt.Value > now)
        {
            var rem = (s.GrantEndsAt.Value - now).TotalSeconds;
            return (FormatClock(rem), "Ba Mẹ đang mở có hạn", rem);
        }
        if (s.MinutesLeft.HasValue)
        {
            var rem = Math.Max(0, s.MinutesLeft.Value * 60.0 - (now - receivedAt).TotalSeconds);
            return (FormatClock(rem), "còn hôm nay", rem);
        }
        return ("Không giới hạn", "", null);
    }

    public static string Tooltip(TrayState s, DateTimeOffset receivedAt, DateTimeOffset now)
    {
        if (s.MoCoi) return "AiiGrow · máy đã rời gia đình, không chặn gì";
        if (s.Locked) return "AiiGrow đang bật · máy đang khoá";
        var d = Describe(s, receivedAt, now);
        var text = d.RemainingSec.HasValue
            ? "AiiGrow đang bật · còn " + (int)Math.Ceiling(d.RemainingSec.Value / 60.0) + " phút"
            : "AiiGrow đang bật · không giới hạn giờ";
        return text.Length > 120 ? text[..120] : text;
    }

    private static readonly Dictionary<string, string> TenDepApp = new(StringComparer.OrdinalIgnoreCase)
    {
        ["msedge"] = "Microsoft Edge", ["chrome"] = "Google Chrome", ["firefox"] = "Firefox", ["brave"] = "Brave",
        ["coccoc"] = "Cốc Cốc", ["opera"] = "Opera", ["roblox"] = "Roblox",
        ["robloxplayerbeta"] = "Roblox", ["minecraft"] = "Minecraft", ["steam"] = "Steam",
        ["discord"] = "Discord", ["spotify"] = "Spotify", ["notepad"] = "Notepad", ["calculatorapp"] = "Máy tính",
    };

    /// <summary>Bảng mục → tên (không phân biệt hoa thường, bỏ mục / tên trống).</summary>
    public static Dictionary<string, string> TaoBang(IEnumerable<KeyValuePair<string, string>>? ds)
    {
        var m = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (k, v) in ds ?? Array.Empty<KeyValuePair<string, string>>())
            if (!string.IsNullOrWhiteSpace(k) && !string.IsNullOrWhiteSpace(v)) m[k.Trim()] = v.Trim();
        return m;
    }

    /// <summary>Tên hiển thị của <paramref name="appId"/> trong bảng (có / không đuôi «.exe» đều khớp). null = không có.</summary>
    public static string? TenTheoDanhSach(string? appId, IReadOnlyDictionary<string, string>? bang)
    {
        var m = bang;
        var g = (appId ?? "").Trim();
        if (m == null || m.Count == 0 || g.Length == 0) return null;
        if (m.TryGetValue(g, out var t) && !string.IsNullOrWhiteSpace(t)) return t;
        var khac = g.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? g[..^4] : g + ".exe";
        return m.TryGetValue(khac, out t) && !string.IsNullOrWhiteSpace(t) ? t : null;
    }

    /// <summary><paramref name="appName"/> chỉ là tên tiến trình trần của app (tudien / tudien.exe cho tudien.exe) — không phải tên hiển thị. Tên miền (y8.com) không tính.</summary>
    /// <summary>Chuỗi đã là tên hiển thị (dịch vụ giải sẵn: «Học với AiiRob», «YouTube Kids») — có khoảng trắng / chữ hoa / dấu, không đuôi .exe.</summary>
    public static bool LaTenHienThi(string? s)
    {
        var t = (s ?? "").Trim();
        return t.Length > 0 && !t.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && (t.Contains(' ') || t.Any(c => char.IsUpper(c) || c > 127));
    }

    /// <summary>#307: có bé đăng nhập THẬT trên máy dùng chung (chân «… đang dùng», «Đổi người») — chưa ai đăng nhập / máy riêng / chưa rõ ⇒ false.</summary>
    public static bool DangDungMayChung(TrayState s) => s.NguoiDung == LoaiNguoiDung.Con && !s.MayRieng && !string.IsNullOrEmpty(s.BeId);

    /// <summary>Tên «Không tính phút» / «Tính phút» để hiện: tên dịch vụ đã giải nếu đủ, không thì mục.</summary>
    public static IReadOnlyList<string> TenKhongTinh(TrayState s) => s.TenAppDuocPhep.Count == s.AppDuocPhep.Count && s.TenAppDuocPhep.Count > 0 ? s.TenAppDuocPhep : s.AppDuocPhep;
    public static IReadOnlyList<string> TenTinh(TrayState s) => s.TenAppTinhPhut.Count == s.AppTinhPhut.Count && s.TenAppTinhPhut.Count > 0 ? s.TenAppTinhPhut : s.AppTinhPhut;

    public static bool LaTenTienTrinh(string? appId, string? appName)
    {
        var id = (appId ?? "").Trim();
        var ten = (appName ?? "").Trim();
        if (id.Length == 0 || ten.Length == 0 || !id.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) return false;
        return ten.Equals(id, StringComparison.OrdinalIgnoreCase) || ten.Equals(id[..^4], StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Tên hiển thị: bảng tên danh sách app TRƯỚC (<paramref name="bang"/> — chỉ dịch vụ có bảng), rồi <paramref name="appName"/> nếu không phải tên tiến trình trần,
    /// rồi tên đẹp có sẵn / viết hoa chữ đầu.</summary>
    public static string FriendlyAppName(string? appId, string? appName, IReadOnlyDictionary<string, string>? bang = null)
    {
        // tên đã giải sẵn (không .exe, không phải tên tiến trình) đi qua nguyên vẹn
        if (appName == null && bang == null && LaTenHienThi(appId)) return appId!.Trim();
        if (TenTheoDanhSach(appId, bang) is { } tenDs) return tenDs;
        if (!string.IsNullOrWhiteSpace(appName) && !LaTenTienTrinh(appId, appName)) return appName!.Trim();
        var n = (appId ?? "").Trim();
        if (n.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) n = n[..^4];
        if (TenDepApp.TryGetValue(n, out var dep)) return dep;
        if (n.Length == 0) return "App này";
        return char.ToUpperInvariant(n[0]) + n[1..];
    }
}
