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

    public static string ModeLabel(string? mode) => mode switch
    {
        Modes.Hoc => "Chỉ app học",
        Modes.Khoa => "Đang khoá",
        _ => "Tự do",
    };

    public static string LockTitle(string? reason) => reason switch
    {
        LockReasons.HetGio => "Hết giờ dùng máy hôm nay",
        LockReasons.Ngu => "Đến giờ nghỉ rồi",
        _ => "Máy đang được bố mẹ khoá",
    };

    public static string LockHint(string? reason) => reason switch
    {
        LockReasons.HetGio => "Lưu bài đang làm nhé. Con có thể xin bố mẹ thêm thời gian.",
        LockReasons.Ngu => "Máy sẽ mở lại khi hết giờ nghỉ. Cần gấp thì xin bố mẹ.",
        _ => "Con có thể nhắn xin bố mẹ mở máy.",
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
            return (FormatClock(rem), "đang được bố mẹ thêm giờ", rem);
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
        ["browser"] = "Cốc Cốc", ["coccoc"] = "Cốc Cốc", ["opera"] = "Opera", ["roblox"] = "Roblox",
        ["robloxplayerbeta"] = "Roblox", ["minecraft"] = "Minecraft", ["javaw"] = "Minecraft", ["steam"] = "Steam",
        ["discord"] = "Discord", ["spotify"] = "Spotify", ["notepad"] = "Notepad", ["calculatorapp"] = "Máy tính",
    };

    public static string FriendlyAppName(string? appId, string? appName)
    {
        if (!string.IsNullOrWhiteSpace(appName)) return appName!;
        var n = (appId ?? "").Trim();
        if (n.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) n = n[..^4];
        if (TenDepApp.TryGetValue(n, out var dep)) return dep;
        n = (appId ?? "").Trim();
        if (n.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) n = n[..^4];
        if (n.Length == 0) return "App này";
        return char.ToUpperInvariant(n[0]) + n[1..];
    }
}
