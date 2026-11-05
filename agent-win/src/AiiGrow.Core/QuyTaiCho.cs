namespace AiiGrow.Core;

/// <summary>
/// Quỹ giờ chơi + giờ ngủ / giờ học + ngoại lệ, xét TẠI MÁY (thiết kế chốt 05/11, L2 L3 L11 — nợ S1 để lại cho agent).
/// Máy chủ tính Policy lúc đồng bộ (server/lib/agent-windows.ts): còn quỹ ⇒ app Giải trí (<see cref="Policy.AppTinhGio"/>) nằm trong AllowedApps.
/// Giữa hai lần đồng bộ — và nhất là lúc MẤT MẠNG — agent tự:
///   • đếm lùi quỹ khi app tính giờ ở tiền cảnh; về 0 ⇒ bỏ các app đó khỏi AllowedApps (không chờ máy chủ);
///   • ngoại lệ một app hết hạn ⇒ bỏ app đó; mọi ngoại lệ hết hạn mà máy chủ báo «khoá khi hết ngoại lệ» ⇒ khoá lại đúng lý do;
///   • mất mạng: tới giờ ngủ (theo đồng hồ máy) ⇒ khoá «ngu»; tới giờ học ⇒ bỏ app tính giờ (chỉ app Học).
/// Lớp THUẦN, test được. Policy gốc không bị sửa — trả bản sao đã áp.
/// </summary>
public static class QuyTaiCho
{
    /// <summary>Phút quỹ còn lại sau khi trừ phần đã đếm tại máy; null = máy chủ không gửi quỹ (máy chủ cũ / chưa chọn Con).</summary>
    /// <param name="now">Có ⇒ xét qua nửa đêm: Policy của hôm trước (mất mạng qua đêm) thì quỹ hôm nay lấy lại <see cref="Policy.QuyTongPhut"/>
    /// trừ phần đã chơi từ nửa đêm (<paramref name="giayHomNay"/>) — không giữ số còn lại của hôm qua.</param>
    public static double? ConPhut(Policy p, double daDemGiay, DateTimeOffset? now = null, double giayHomNay = 0)
    {
        if (p.QuyConPhut is not double q) return null;
        if (now is { } n && NgayMoi(p, n)) return Math.Max(0, (p.QuyTongPhut ?? q) - Math.Max(0, giayHomNay) / 60.0);
        return Math.Max(0, q - Math.Max(0, daDemGiay) / 60.0);
    }

    /// <summary>Policy tính cho một ngày trước ngày hiện tại của máy (mất mạng qua nửa đêm).</summary>
    public static bool NgayMoi(Policy p, DateTimeOffset now)
        => p.ServerTime is { } st && now.ToLocalTime().Date > st.ToLocalTime().Date;

    /// <summary>App này có trừ quỹ khi ở tiền cảnh không.</summary>
    public static bool TinhGio(Policy? p, string? appId)
        => p != null && !string.IsNullOrEmpty(appId) && p.AppTinhGio.Contains(appId, StringComparer.OrdinalIgnoreCase);

    /// <summary>«HH:mm» → phút trong ngày; sai ⇒ null.</summary>
    public static int? PhutCua(string? hhmm)
    {
        if (string.IsNullOrWhiteSpace(hhmm)) return null;
        var t = hhmm.Trim().Split(':');
        if (t.Length < 2 || !int.TryParse(t[0], out var h) || !int.TryParse(t[1], out var m) || h is < 0 or > 24 || m is < 0 or > 59) return null;
        return h * 60 + m;
    }

    /// <summary>Như <c>trongKhung</c> của máy chủ (lib/gio.ts): tu ≤ phút &lt; den; qua nửa đêm khi tu &gt; den; tu = den ⇒ không.</summary>
    public static bool TrongKhung(KhungGio? k, DateTime local)
    {
        if (k == null) return false;
        var tu = PhutCua(k.Tu); var den = PhutCua(k.Den);
        if (tu == null || den == null || tu == den) return false;
        var p = local.Hour * 60 + local.Minute;
        if (tu < den) return p >= tu && p < den;
        // qua nửa đêm: phần sau nửa đêm thuộc ngày hôm trước (giờ học không qua nửa đêm; giờ ngủ không lọc theo thứ)
        return p >= tu || p < den;
    }

    public static bool TrongGioHoc(KhungGio? k, DateTime local)
        => k != null && (k.Thu.Count == 0 || k.Thu.Contains((int)local.DayOfWeek)) && TrongKhung(k, local);

    /// <summary>Policy để THỰC THI lúc <paramref name="now"/>: đã trừ app hết quỹ / ngoại lệ hết hạn, khoá lại khi cần.</summary>
    /// <param name="daDemGiay">Giây đã chơi app tính giờ tại máy từ lúc nhận Policy.</param>
    /// <param name="offline">Đang mất mạng ⇒ tự xét giờ ngủ / giờ học theo đồng hồ máy (có mạng thì máy chủ xét, tránh lệch giờ máy).</param>
    /// <param name="giayHomNay">Giây đã chơi app tính giờ từ nửa đêm hôm nay (xét khi Policy là của hôm trước).</param>
    public static Policy ApDung(Policy p, double daDemGiay, DateTimeOffset now, bool offline, double giayHomNay = 0)
    {
        bool coQuy = p.QuyConPhut.HasValue, coNl = p.NgoaiLe.Count > 0;
        bool coLich = offline && (p.GioNgu != null || p.GioHoc != null);
        if (!coQuy && !coNl && !coLich && p.KhoaKhiHetNgoaiLe == null) return p;

        var local = now.ToLocalTime().DateTime;
        var bo = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        bool locked = p.Locked;
        string? lyDo = p.LockReason;

        if (ConPhut(p, daDemGiay, now, giayHomNay) is <= 0) bo.UnionWith(p.AppTinhGio);
        var nlCon = p.NgoaiLe.Where(n => n.Den > now).ToList();
        foreach (var n in p.NgoaiLe.Where(n => n.Den <= now && n.App != null)) bo.Add(n.App!);
        bool nlCaMay = nlCon.Any(n => n.App == null);

        // Mọi ngoại lệ đã hết hạn mà lúc đồng bộ máy đang bị khoá (Ba Mẹ khoá / giờ ngủ) ⇒ khoá lại như cũ.
        if (p.KhoaKhiHetNgoaiLe != null && coNl && nlCon.Count == 0 && !locked)
        {
            locked = true;
            lyDo = p.KhoaKhiHetNgoaiLe;
        }

        // Mất mạng mà khoá «ngu» lúc đồng bộ đã qua giờ ngủ theo đồng hồ máy (sáng hôm sau) ⇒ mở lại «chỉ app được phép» (danh sách lúc ngủ — app hệ thống),
        // không khoá cả buổi sáng tới khi có mạng.
        if (offline && locked && lyDo == LockReasons.Ngu && p.GioNgu != null && !TrongKhung(p.GioNgu, local))
        {
            locked = false; lyDo = null;
        }

        if (offline && !nlCaMay)
        {
            if (!locked && TrongKhung(p.GioNgu, local))
            {
                if (nlCon.Count == 0) { locked = true; lyDo = LockReasons.Ngu; }
                else bo.UnionWith(p.AppTinhGio);   // đang có ngoại lệ một app: chỉ app đó chạy được, app chơi thì không
            }
            if (TrongGioHoc(p.GioHoc, local)) bo.UnionWith(p.AppTinhGio);
        }
        foreach (var n in nlCon.Where(n => n.App != null)) bo.Remove(n.App!);   // ngoại lệ còn hạn thắng

        if (bo.Count == 0 && locked == p.Locked && lyDo == p.LockReason) return p;
        var q = p.SaoNong();
        q.AllowedApps = p.AllowedApps.Where(a => !bo.Contains(a)).ToList();
        // «Mở hết» (mode tu_do không hạn): không có danh sách được phép để thu lại ⇒ đóng app chơi hết quỹ bằng danh sách chặn (ChanAppThat — mọi mode)
        if (bo.Count > 0 && p.Mode == Modes.TuDo && p.GrantEndsAt == null)
            q.BlockedApps = p.BlockedApps.Concat(bo.Where(a => a.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)).Select(a => new AppBiChan { Muc = a.ToLowerInvariant() })).ToList();
        q.AppTinhGio = p.AppTinhGio.Where(a => !bo.Contains(a)).ToList();
        q.Locked = locked;
        q.LockReason = locked ? lyDo ?? LockReasons.Khoa : null;
        if (locked && q.Mode == Modes.TuDo) { q.Mode = Modes.Khoa; q.GrantEndsAt = null; }
        if (!locked && p.Locked && q.Mode == Modes.Khoa) q.Mode = Modes.Hoc;
        return q;
    }
}
