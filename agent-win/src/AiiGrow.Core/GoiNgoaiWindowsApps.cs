namespace AiiGrow.Core;

/// <summary>#695: gói Store cài NGOÀI «&lt;ổ&gt;:\Program Files\WindowsApps» (ổ D: «D:\WindowsApps\…», game Xbox «C:\XboxGames\&lt;Game&gt;\Content»):
/// đường dẫn tiến trình không mang tên gói (<see cref="ProcessGuard.TenGoiStore"/> = null) ⇒ quy về gói theo THƯ MỤC CÀI (Get-AppxPackage
/// InstallLocation, do hệ thống tạo). Mỗi gói: [muc gói, thư mục cài, exe khai trong manifest…] (<see cref="DanhSachApp.NhomGoiNgoai"/>). Lớp THUẦN.
/// Không khớp theo tên exe ở Cho phép: exe cùng tên đặt chỗ khác (D:\Games, AppData) không thành được phép.</summary>
public static class GoiNgoaiWindowsApps
{
    private static IEnumerable<(string Muc, string ThuMuc)> Cap(IEnumerable<IReadOnlyList<string>>? goi)
    {
        if (goi == null) yield break;
        foreach (var g in goi)
            if (g is { Count: >= 2 } && !string.IsNullOrWhiteSpace(g[0]) && !string.IsNullOrWhiteSpace(g[1]) && g[1].Length > 3)
                yield return (g[0], g[1]);
    }

    /// <summary>Cho phép: tiến trình nằm trong thư mục cài của gói Ba Mẹ đã cho phép (mọi exe của gói — game, GameLaunchHelper, thư mục con).</summary>
    public static bool ChoChay(string exePath, ICollection<string> allowed, IEnumerable<IReadOnlyList<string>>? goi)
    {
        if (string.IsNullOrWhiteSpace(exePath) || allowed.Count == 0) return false;
        var p = exePath.Replace('/', '\\');
        foreach (var (muc, thuMuc) in Cap(goi))
            if (allowed.Contains(muc) && DanhSachApp.Trong(p, thuMuc)) return true;
        return false;
    }

    /// <summary>Chặn: luật chặn muc gói ⇒ thêm luật theo thư mục cài của gói (giữ muc gói để báo).</summary>
    public static List<AppBiChan> LuatChan(IReadOnlyList<AppBiChan> ds, IEnumerable<IReadOnlyList<string>>? goi)
    {
        var kq = ds.ToList();
        var chan = new HashSet<string>(ds.Select(a => a.Muc), StringComparer.OrdinalIgnoreCase);
        foreach (var (muc, thuMuc) in Cap(goi))
            if (chan.Contains(muc)) kq.Add(new AppBiChan { Muc = muc, ThuMuc = thuMuc });
        return kq;
    }

    /// <summary>Tiền cảnh (khay chỉ báo tên exe): exe khai trong manifest → muc gói. Tên chung chung bỏ; exe trùng nhiều gói giữ gói đầu.</summary>
    public static Dictionary<string, string> ExeVeGoi(IEnumerable<IReadOnlyList<string>>? goi)
    {
        var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (goi == null) return d;
        foreach (var g in goi)
            if (g is { Count: >= 3 } && !string.IsNullOrWhiteSpace(g[0]))
                foreach (var e in g.Skip(2))
                    if (!string.IsNullOrWhiteSpace(e) && !ChanAppThat.TenChung.Contains(e)) d.TryAdd(e, g[0]);
        return d;
    }
}
