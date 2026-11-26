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

    // «X:\WindowsApps\<Tên>_<bản>_<kiến trúc>_<tài nguyên>__<nhàXB>» — tên thư mục đổi theo bản mỗi lần Store cập nhật
    private static readonly System.Text.RegularExpressions.Regex ThuMucCoBan = new(@"^([A-Za-z]):\\WindowsApps\\([^\\_]+)_[^\\]*__([^\\_]+)$",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <summary>Tiến trình nằm trong thư mục cài của gói. Gói ở «X:\WindowsApps» khớp mọi bản của cùng gói (Store cập nhật đổi tên thư mục trước
    /// lượt quét app kế tiếp) — thư mục đó chỉ hệ thống ghi được.</summary>
    public static bool TrongGoi(string exePath, string thuMuc)
    {
        var p = exePath.Replace('/', '\\');
        if (DanhSachApp.Trong(p, thuMuc)) return true;
        var m = ThuMucCoBan.Match(thuMuc.TrimEnd('\\'));
        if (!m.Success) return false;
        var dau = m.Groups[1].Value + ":\\WindowsApps\\";
        if (!p.StartsWith(dau, StringComparison.OrdinalIgnoreCase)) return false;
        var rest = p[dau.Length..];
        var j = rest.IndexOf('\\');
        if (j <= 0) return false;
        var tm = rest[..j];
        return tm.StartsWith(m.Groups[2].Value + "_", StringComparison.OrdinalIgnoreCase) && tm.EndsWith("__" + m.Groups[3].Value, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Cho phép: tiến trình nằm trong thư mục cài của gói Ba Mẹ đã cho phép (mọi exe của gói — game, GameLaunchHelper, thư mục con).</summary>
    public static bool ChoChay(string exePath, ICollection<string> allowed, IEnumerable<IReadOnlyList<string>>? goi)
    {
        if (string.IsNullOrWhiteSpace(exePath) || allowed.Count == 0) return false;
        foreach (var (muc, thuMuc) in Cap(goi))
            if (allowed.Contains(muc) && TrongGoi(exePath, thuMuc)) return true;
        return false;
    }

    /// <summary>Muc gói của tiến trình (theo thư mục cài) — null nếu không thuộc gói nào.</summary>
    public static string? GoiCua(string exePath, IEnumerable<IReadOnlyList<string>>? goi)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return null;
        foreach (var (muc, thuMuc) in Cap(goi)) if (TrongGoi(exePath, thuMuc)) return muc;
        return null;
    }

    /// <summary>Chặn: luật chặn muc gói ⇒ thêm luật theo thư mục cài của gói (giữ muc gói để báo; <see cref="ChanAppThat.Khop"/> khớp thư mục bằng
    /// <see cref="TrongGoi"/> — mọi bản của gói «X:\WindowsApps»).</summary>
    public static List<AppBiChan> LuatChan(IReadOnlyList<AppBiChan> ds, IEnumerable<IReadOnlyList<string>>? goi)
    {
        var kq = ds.ToList();
        var chan = new HashSet<string>(ds.Select(a => a.Muc), StringComparer.OrdinalIgnoreCase);
        foreach (var (muc, thuMuc) in Cap(goi))
            if (chan.Contains(muc)) kq.Add(new AppBiChan { Muc = muc, ThuMuc = thuMuc });
        return kq;
    }

    /// <summary>Tiền cảnh (khay chỉ báo tên exe): exe khai trong manifest → muc gói. Tên chung chung bỏ; exe trùng nhiều gói giữ gói đầu (exe trùng
    /// muc app khác trên máy đã bỏ ở <see cref="DanhSachApp.NhomGoiNgoai"/>).</summary>
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
