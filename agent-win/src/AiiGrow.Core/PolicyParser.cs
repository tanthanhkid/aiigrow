using System.Text.Json;

namespace AiiGrow.Core;

public sealed class PolicyException : Exception
{
    public PolicyException(string message) : base(message) { }
}

public static class PolicyParser
{
    public static Policy Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) throw new PolicyException("Policy rỗng");
        Policy? p;
        try { p = JsonSerializer.Deserialize<Policy>(json, Json.Options); }
        catch (JsonException e) { throw new PolicyException("Policy không đúng JSON: " + e.Message); }
        if (p == null) throw new PolicyException("Policy rỗng");
        return Normalize(p);
    }

    public static bool TryParse(string? json, out Policy? policy)
    {
        policy = null;
        if (json == null) return false;
        try { policy = Parse(json); return true; }
        catch (PolicyException) { return false; }
    }

    private static Policy Normalize(Policy p)
    {
        var mode = (p.Mode ?? "").Trim().ToLowerInvariant();
        if (mode != Modes.Khoa && mode != Modes.Hoc && mode != Modes.TuDo)
            throw new PolicyException("Chế độ không hợp lệ: '" + p.Mode + "'");
        p.Mode = mode;
        p.ChildName ??= "";
        p.CheDo = CheDoHieuLuc.Chuan(p.CheDo);
        p.LockReason = string.IsNullOrWhiteSpace(p.LockReason) ? null : p.LockReason.Trim().ToLowerInvariant();
        p.AllowedApps = CleanList(p.AllowedApps);
        p.PlayChoices = CleanList(p.PlayChoices);
        p.LearningApps = CleanList(p.LearningApps);
        if (p.NextCheckSec <= 0) p.NextCheckSec = 30;
        p.NextCheckSec = Math.Clamp(p.NextCheckSec, 10, 600);
        if (p.MinutesLeft is < 0) p.MinutesLeft = 0;
        // 0.2.4: phiên chơi (chỉ có khi máy chủ gửi playSessionId — máy chủ cũ không gửi ⇒ không đếm/không chặn gì thêm)
        p.PlaySessionId = string.IsNullOrWhiteSpace(p.PlaySessionId) ? null : p.PlaySessionId.Trim();
        p.PlayApp = string.IsNullOrWhiteSpace(p.PlayApp) ? null : p.PlayApp.Trim().ToLowerInvariant();
        if (p.PlaySessionId == null || p.PlayApp == null) { p.PlaySessionId = null; p.PlayApp = null; p.PlayWeb = false; p.PlayOfflineMinutes = null; }
        else p.PlayOfflineMinutes = p.PlayOfflineMinutes is double m && double.IsFinite(m) ? Math.Clamp(m, 0, 24 * 60) : 0;
        return p;
    }

    private static List<string> CleanList(List<string>? src)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var res = new List<string>();
        if (src == null) return res;
        foreach (var s in src)
        {
            if (string.IsNullOrWhiteSpace(s)) continue;
            var t = s.Trim().ToLowerInvariant();
            if (seen.Add(t)) res.Add(t);
        }
        return res;
    }
}

/// <summary>Kết quả sau khi áp policy lên giờ hiện tại (cũng dùng khi mất mạng).</summary>
public sealed record EffectivePolicy(
    bool Locked, string? LockReason, double? MinutesLeft, DateTimeOffset? GrantEndsAt, bool AppLockerWanted);

public static class PolicyEvaluator
{
    public static EffectivePolicy Evaluate(Policy p, DateTimeOffset now, double usedSecondsSinceSync)
    {
        bool grantActive = p.GrantEndsAt.HasValue && p.GrantEndsAt.Value > now;
        bool locked = p.Locked || p.Mode == Modes.Khoa;
        string? reason = locked ? (p.LockReason ?? LockReasons.Khoa) : null;

        double? minutes = null;
        if (p.MinutesLeft.HasValue)
            minutes = Math.Max(0, p.MinutesLeft.Value - usedSecondsSinceSync / 60.0);

        if (!locked && minutes.HasValue && minutes.Value <= 0 && !grantActive)
        {
            locked = true;
            reason = LockReasons.HetGio;
        }

        // «Mở» có hạn (mode tu_do + grantEndsAt — Ba Mẹ mở khẩn cấp / thêm giờ): hết hạn mà chưa đồng bộ lại được (mất mạng)
        // ⇒ tự trở lại «Chỉ app học» theo allowedApps đã lưu, không để máy mở tự do tới khi có mạng.
        bool hetMo = p.Mode == Modes.TuDo && p.GrantEndsAt.HasValue && !grantActive;
        return new EffectivePolicy(locked, reason, minutes,
            grantActive ? p.GrantEndsAt : null, p.Mode == Modes.Hoc || hetMo);
    }
}
