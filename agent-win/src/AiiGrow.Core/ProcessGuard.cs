namespace AiiGrow.Core;

/// <summary>Quyết định có đóng một tiến trình trong phiên con hay không (dự phòng khi AppLocker chưa áp; trên Win Home đây là cách chặn DUY NHẤT).</summary>
public static class ProcessGuard
{
    /// <summary>Thư mục hệ thống KHÔNG qua phân loại. BUG-008 (24/10): trước đây miễn cả C:\Windows nên notepad / cmd / powershell / calc
    /// không bao giờ bị đóng; BUG-009: miễn cả «WindowsApps\Microsoft.» nên app Store (Máy tính, Terminal…) lọt. Nay chỉ còn AiiGrow + Defender
    /// + Common Files; tiến trình hệ thống cần cho phiên đăng nhập xét riêng ở <see cref="LaTienTrinhHeThongPhien"/>.</summary>
    public static List<string> DefaultSafeDirs()
    {
        var pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        var pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        var pd = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        return new List<string>
        {
            Path.Combine(pf, "AiiGrow"),
            Path.Combine(pf, "Windows Defender"),
            Path.Combine(pf, "Common Files"),
            Path.Combine(pf86, "Common Files"),
            Path.Combine(pd, "Microsoft", "Windows Defender"),
        };
    }

    /// <summary>Tiến trình của chính Windows mà phiên đăng nhập cần để còn dùng được (màn hình nền, Start, tìm kiếm, bàn phím, thông báo…).
    /// Chỉ miễn khi file nằm TRONG thư mục Windows (Con không ghi được vào đó ⇒ không đổi tên game thành explorer.exe để lọt).
    /// notepad / cmd / powershell / calc / mspaint… KHÔNG nằm đây ⇒ phải qua phân loại như app thường.</summary>
    public static readonly HashSet<string> TienTrinhHeThongPhien = new(StringComparer.OrdinalIgnoreCase)
    {
        "explorer.exe", "dwm.exe", "ctfmon.exe", "sihost.exe", "shellexperiencehost.exe", "startmenuexperiencehost.exe",
        "searchhost.exe", "searchapp.exe", "textinputhost.exe", "runtimebroker.exe", "lockapp.exe", "taskhostw.exe",
        "fontdrvhost.exe", "csrss.exe", "winlogon.exe", "wininit.exe", "smss.exe", "services.exe", "lsass.exe", "svchost.exe",
        "conhost.exe", "dllhost.exe", "backgroundtaskhost.exe", "applicationframehost.exe", "securityhealthsystray.exe",
        "logonui.exe", "consent.exe", "userinit.exe", "werfault.exe", "smartscreen.exe", "shellhost.exe", "useroobebroker.exe",
        "searchprotocolhost.exe", "searchfilterhost.exe", "audiodg.exe", "wudfhost.exe", "dashost.exe", "sppsvc.exe",
    };

    /// <summary>Thư mục gói giao diện shell của Windows (Start, Search, Lock screen, ô nhập…) — luôn cho chạy.</summary>
    public const string ThuMucSystemApps = "SystemApps";

    /// <summary>WebView2 (msedgewebview2.exe) do runtime Edge cài ở Program Files\Microsoft\EdgeWebView — khung của chính AiiGrow và nhiều app dùng;
    /// mặc định được phép (BUG-007), chỉ khi đúng thư mục runtime.</summary>
    public const string WebView2Exe = "msedgewebview2.exe";

    public static bool LaTienTrinhHeThongPhien(string exePath, string? winDir)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        var name = FileName(exePath);
        if (name.Equals(WebView2Exe, StringComparison.OrdinalIgnoreCase)
            && (exePath.Contains(@"\Microsoft\EdgeWebView\", StringComparison.OrdinalIgnoreCase)
                || exePath.Contains("/Microsoft/EdgeWebView/", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (string.IsNullOrWhiteSpace(winDir)) return false;
        var w = winDir.TrimEnd('\\', '/') + "\\";
        if (!exePath.StartsWith(w, StringComparison.OrdinalIgnoreCase)) return false;
        if (exePath.StartsWith(w + ThuMucSystemApps + "\\", StringComparison.OrdinalIgnoreCase)) return true;
        return TienTrinhHeThongPhien.Contains(name);
    }

    /// <summary>Tên gói của app Store từ đường dẫn «…\WindowsApps\&lt;Gói&gt;_&lt;bản&gt;__&lt;nhàXB&gt;\app.exe» (chữ thường); không phải app Store ⇒ null.
    /// BUG-009: dùng để luật cho phép khớp theo tên gói, không chỉ theo tên exe.</summary>
    public static string? TenGoiStore(string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return null;
        var p = exePath.Replace('/', '\\');
        const string mk = "\\WindowsApps\\";
        var i = p.IndexOf(mk, StringComparison.OrdinalIgnoreCase);
        if (i < 0) return null;
        var rest = p[(i + mk.Length)..];
        var j = rest.IndexOf('\\');
        if (j <= 0) return null;
        var thuMuc = rest[..j];
        var k = thuMuc.IndexOf('_');
        var ten = (k > 0 ? thuMuc[..k] : thuMuc).Trim().ToLowerInvariant();
        return ten.Length == 0 ? null : ten;
    }

    /// <param name="exePath">Đường dẫn đầy đủ của file chạy.</param>
    /// <param name="allowed">Tên exe (hoặc tên gói Store) được phép (so không phân biệt hoa thường).</param>
    /// <param name="allowedDirs">Thư mục của các app được phép đang chạy (helper cùng thư mục thì không đóng).</param>
    /// <param name="safeDirs">Thư mục hệ thống.</param>
    /// <param name="winDir">Thư mục Windows (null = không miễn tiến trình hệ thống theo tên — chỉ test cũ).</param>
    public static bool ShouldClose(string exePath, ISet<string> allowed, ISet<string> allowedDirs, IEnumerable<string> safeDirs, string? winDir = null)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        var name = FileName(exePath);
        if (allowed.Contains(name)) return false;
        if (TenGoiStore(exePath) is { } goi && allowed.Contains(goi)) return false;
        if (LaTienTrinhHeThongPhien(exePath, winDir)) return false;

        foreach (var d in safeDirs)
        {
            if (string.IsNullOrEmpty(d)) continue;
            var prefix = d.EndsWith("\\") || d.EndsWith(".") ? d : d + "\\";
            if (exePath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
        }

        var dir = DirName(exePath);
        // app Store: mỗi gói một thư mục riêng nhưng «helper cùng thư mục» chỉ giữ khi CHÍNH app chạy trong gói đó được phép (allowedDirs đã chỉ chứa thư mục của app được phép)
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
