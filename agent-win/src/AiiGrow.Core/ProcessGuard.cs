namespace AiiGrow.Core;

/// <summary>Quyết định có đóng một tiến trình trong phiên con hay không (dự phòng khi AppLocker chưa áp).</summary>
public static class ProcessGuard
{
    public static List<string> DefaultSafeDirs()
    {
        var win = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        var pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        var pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        var pd = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        return new List<string>
        {
            win,
            Path.Combine(pf, "AiiGrow"),
            Path.Combine(pf, "Windows Defender"),
            Path.Combine(pf, "Common Files"),
            Path.Combine(pf86, "Common Files"),
            Path.Combine(pd, "Microsoft", "Windows Defender"),
            Path.Combine(pf, "WindowsApps", "Microsoft."),
        };
    }

    /// <param name="exePath">Đường dẫn đầy đủ của file chạy.</param>
    /// <param name="allowed">Tên exe được phép (so không phân biệt hoa thường).</param>
    /// <param name="allowedDirs">Thư mục của các app được phép đang chạy (helper cùng thư mục thì không đóng).</param>
    /// <param name="safeDirs">Thư mục hệ thống.</param>
    public static bool ShouldClose(string exePath, ISet<string> allowed, ISet<string> allowedDirs, IEnumerable<string> safeDirs)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        var name = FileName(exePath);
        if (allowed.Contains(name)) return false;

        foreach (var d in safeDirs)
        {
            if (string.IsNullOrEmpty(d)) continue;
            var prefix = d.EndsWith("\\") || d.EndsWith(".") ? d : d + "\\";
            if (exePath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
        }

        var dir = DirName(exePath);
        if (dir != null && allowedDirs.Contains(dir)) return false;
        return true;
    }

    private static string FileName(string p)
    {
        var i = p.LastIndexOfAny(new[] { '\\', '/' });
        return i < 0 ? p : p[(i + 1)..];
    }

    private static string? DirName(string p)
    {
        var i = p.LastIndexOfAny(new[] { '\\', '/' });
        return i <= 0 ? null : p[..i];
    }
}
