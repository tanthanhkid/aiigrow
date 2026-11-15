namespace AiiGrow.Core;

/// <summary>
/// Sao = phút «Tính phút», xét TẠI MÁY (sổ sao 15/11, #263–#266). Máy chủ tính Policy lúc đồng bộ (server/lib/agent-windows.ts): còn sao ⇒ app
/// «Tính phút» (<see cref="Policy.AppTinhGio"/>) nằm trong AllowedApps, <see cref="Policy.QuyConPhut"/> = sao tiêu được. Giữa hai lần đồng bộ — và nhất là
/// lúc MẤT MẠNG — agent tự đếm lùi khi app «Tính phút» ở tiền cảnh; về 0 ⇒ bỏ các app đó (không chờ máy chủ). Sao không tự đầy lại qua đêm.
/// «Mở hết» (#262) ⇒ không đếm, không đóng gì. Máy đang mở bằng mã của Ba Mẹ ⇒ không trừ sao, app «Tính phút» chạy được (phút gửi ở `phutBoiMa`).
/// Lớp THUẦN, test được. Policy gốc không bị sửa — trả bản sao đã áp.
/// </summary>
public static class QuyTaiCho
{
    /// <summary>Phút «Tính phút» còn lại (= sao tiêu được) sau phần đã đếm tại máy; null = máy chủ không gửi (máy chủ cũ / chưa chọn bé).</summary>
    public static double? ConPhut(Policy p, double daDemGiay)
        => p.QuyConPhut is double q ? Math.Max(0, q - Math.Max(0, daDemGiay) / 60.0) : null;

    /// <summary>App này có trừ sao khi ở tiền cảnh không («Mở hết» ⇒ không).</summary>
    /// <remarks>Khay chết / không báo (<see cref="UsageTracker.KhongRo"/>) mà đang có app «Tính phút» ⇒ vẫn trừ (an toàn trước): tắt khay không dừng được đồng hồ.</remarks>
    public static bool TinhGio(Policy? p, string? appId)
        => p != null && !CheDoCon.La(p) && !string.IsNullOrEmpty(appId) && p.AppTinhGio.Count > 0
           && (appId == UsageTracker.KhongRo || p.AppTinhGio.Contains(appId, StringComparer.OrdinalIgnoreCase));

    /// <summary>Mục «Tính phút» (app .exe / tên miền) Ba Mẹ đã xếp — dùng cho chữ «Roblox, YouTube Kids đang khoá» và để thả lúc mở bằng mã.</summary>
    public static IReadOnlyList<string> MucTinhPhut(Policy? p)
        => p == null ? Array.Empty<string>() : p.AppTinhGio.Concat(p.PlayChoices).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

    /// <summary>Policy để THỰC THI lúc này: hết sao ⇒ bỏ app «Tính phút» khỏi danh sách được phép (mode «tu_do» không hạn: thêm vào danh sách chặn).</summary>
    /// <param name="daDemGiay">Giây đã chơi app «Tính phút» tại máy từ lúc nhận Policy.</param>
    /// <param name="moBangMa">Máy đang mở bằng mã offline của Ba Mẹ ⇒ thả app «Tính phút» (.exe) dù hết sao, không trừ sao.</param>
    public static Policy ApDung(Policy p, double daDemGiay, bool moBangMa = false)
    {
        if (CheDoCon.La(p)) return p;   // «Mở hết»: không chặn, không đếm (máy chủ cũ còn gửi appTinhGio lúc hết sao — bỏ qua)
        if (moBangMa)
        {
            var them = MucTinhPhut(p).Where(a => a.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && !p.AllowedApps.Contains(a, StringComparer.OrdinalIgnoreCase)).ToList();
            if (them.Count == 0) return p;
            var m = p.SaoNong();
            m.AllowedApps = p.AllowedApps.Concat(them).ToList();
            return m;
        }
        if (p.QuyConPhut is null || ConPhut(p, daDemGiay) > 0 || p.AppTinhGio.Count == 0) return p;
        var bo = new HashSet<string>(p.AppTinhGio, StringComparer.OrdinalIgnoreCase);
        var q = p.SaoNong();
        q.AllowedApps = p.AllowedApps.Where(a => !bo.Contains(a)).ToList();
        // mode tu_do không hạn: không có danh sách được phép để thu lại ⇒ đóng app «Tính phút» bằng danh sách chặn (ChanAppThat — mọi mode)
        if (p.Mode == Modes.TuDo && p.GrantEndsAt == null)
            q.BlockedApps = p.BlockedApps.Concat(bo.Where(a => a.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)).Select(a => new AppBiChan { Muc = a.ToLowerInvariant() })).ToList();
        q.AppTinhGio = new List<string>();
        return q;
    }
}
