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

    /// <summary>TÊN tiến trình của chính Windows mà phiên đăng nhập cần (màn hình nền, Start, tìm kiếm, bàn phím, thông báo…). KHÔNG dùng để miễn
    /// (miễn theo CHỖ nằm — <see cref="LaTienTrinhHeThongPhien"/>); chỉ dùng ở <see cref="TenCuaWindows"/>: luật cho phép theo tên này chỉ nhận bản thật
    /// trong Windows, không nhận game đổi tên thành explorer.exe ở Downloads (review #75).</summary>
    public static readonly HashSet<string> TienTrinhHeThongPhien = new(StringComparer.OrdinalIgnoreCase)
    {
        "explorer.exe", "dwm.exe", "ctfmon.exe", "sihost.exe", "shellexperiencehost.exe", "startmenuexperiencehost.exe",
        "searchhost.exe", "searchapp.exe", "textinputhost.exe", "runtimebroker.exe", "lockapp.exe", "taskhostw.exe",
        "fontdrvhost.exe", "csrss.exe", "winlogon.exe", "wininit.exe", "smss.exe", "services.exe", "lsass.exe", "svchost.exe",
        "conhost.exe", "dllhost.exe", "backgroundtaskhost.exe", "applicationframehost.exe", "securityhealthsystray.exe",
        "logonui.exe", "consent.exe", "userinit.exe", "werfault.exe", "smartscreen.exe", "shellhost.exe", "useroobebroker.exe",
        "searchprotocolhost.exe", "searchfilterhost.exe", "audiodg.exe", "wudfhost.exe", "dashost.exe", "sppsvc.exe",
    };

    /// <summary>App NGƯỜI DÙNG mở được nằm ngay trong Windows / System32 / SysWOW64 — phải qua phân loại (BUG-008). Mọi exe KHÁC nằm TRỰC TIẾP trong
    /// ba thư mục đó là thành phần Windows chạy nền (splwow64 in 32-bit, rundll32, CredentialUIBroker, PickerHost, rdpclip, osk/Narrator/Magnify,
    /// MusNotifyIcon…) ⇒ miễn: đóng chúng làm hỏng in ấn, hộp chọn tệp, trợ năng và bắn popup «app bị chặn» liên tục (review #75).
    /// Chỉ TRỰC TIẾP trong thư mục (không thư mục con): Con không tạo tệp ở đó được; thư mục con như Windows\Temp, System32\Tasks,
    /// spool\drivers\color thì tài khoản chuẩn ghi được ⇒ không miễn.</summary>
    public static readonly HashSet<string> UngDungTrongWindows = new(StringComparer.OrdinalIgnoreCase)
    {
        "notepad.exe", "cmd.exe", "powershell.exe", "powershell_ise.exe", "pwsh.exe", "calc.exe", "mspaint.exe", "write.exe", "wordpad.exe",
        "charmap.exe", "regedit.exe", "regedt32.exe", "wscript.exe", "cscript.exe", "mshta.exe", "snippingtool.exe", "winver.exe", "hh.exe",
        "mstsc.exe", "ftp.exe", "telnet.exe", "bash.exe", "wsl.exe", "wslhost.exe",
        // chạy mã/ứng dụng tuỳ ý hoặc đóng khay: XBAP, forfiles /c, mmc snap-in, Task Manager / taskkill (rundll32 vẫn miễn: in ấn, hộp thoại, applet Control Panel cần)
        "presentationhost.exe", "forfiles.exe", "mmc.exe", "taskmgr.exe", "taskkill.exe", "certutil.exe", "bitsadmin.exe",
        // Win Home (không AppLocker): công cụ ĐÓNG ĐƯỢC KHAY — resmon/perfmon (End Process), tskill, wmic (wbem) (review #75). KHÔNG gồm msiexec / control /
        // reg / sc / schtasks / regsvr32: Windows và bộ cập nhật của app hợp lệ gọi chúng trong phiên Con (đóng ⇒ hỏng cập nhật + popup lặp); tài khoản chuẩn
        // dùng chúng không gỡ được AiiGrow. Lệnh chạy xong trước nhịp quét thì không chặn kịp — giới hạn của chặn bằng cách đóng app.
        "resmon.exe", "perfmon.exe", "tskill.exe", "wmic.exe",
        // trình biên dịch / chạy mã của .NET Framework (Windows\Microsoft.NET được miễn theo thư mục cho dfsvc)
        "csc.exe", "vbc.exe", "jsc.exe", "msbuild.exe", "installutil.exe", "regasm.exe", "regsvcs.exe", "ilasm.exe", "aspnet_compiler.exe",
    };

    /// <summary>Gói Store chạy nền của chính Windows (Phone Link, Widgets, Cross Device) — miễn như tiến trình hệ thống.</summary>
    public static readonly HashSet<string> GoiStoreHeThong = new(StringComparer.OrdinalIgnoreCase)
    {
        "microsoft.yourphone", "microsoftwindows.client.webexperience", "microsoftwindows.crossdevice", "microsoft.windows.shellexperiencehost",
        // Win11 23H2/24H2: runtime Widgets, công cụ cắt màn hình (Win+Shift+S) — đóng thì Widgets / chụp màn hình hỏng và bắn màn «app bị chặn» lặp (review #75)
        "microsoft.widgetsplatformruntime", "microsoft.screensketch",
    };

    /// <summary>Gói Store hệ thống theo TIỀN TỐ (Windows App SDK: Microsoft.WindowsAppRuntime.1.5, …Singleton — PushNotificationsLongRunningTask).</summary>
    public static readonly string[] TienToGoiStoreHeThong = { "microsoft.windowsappruntime" };

    public static bool LaGoiStoreHeThong(string goi) =>
        GoiStoreHeThong.Contains(goi) || TienToGoiStoreHeThong.Any(t => goi.StartsWith(t, StringComparison.OrdinalIgnoreCase));

    /// <summary>Thư mục gói giao diện shell của Windows (Start, Search, Lock screen, ô nhập…) — luôn cho chạy.</summary>
    public const string ThuMucSystemApps = "SystemApps";

    /// <summary>WebView2 (msedgewebview2.exe) do runtime Edge cài ở Program Files\Microsoft\EdgeWebView — khung của chính AiiGrow và nhiều app dùng;
    /// mặc định được phép (BUG-007), chỉ khi đúng thư mục runtime.</summary>
    public const string WebView2Exe = "msedgewebview2.exe";

    /// <summary>Thư mục con của Windows (chỉ quản trị ghi được) chứa thành phần phiên chạy nền: gói shell, tiện ích trình điều khiển, bộ gõ, giọng nói, Cài đặt.
    /// KHÔNG gồm Windows\Temp, System32\Tasks, spool\drivers\color… (tài khoản chuẩn ghi được ⇒ Con đặt game vào đó là lọt — review #75).</summary>
    public static readonly string[] ThuMucConHeThong =
    {
        ThuMucSystemApps, @"System32\DriverStore", @"System32\oobe", @"System32\Microsoft-Edge-WebView", "ImmersiveControlPanel", "PrintDialog",
        @"System32\spool\drivers\x64", @"System32\spool\drivers\W32X86", @"System32\spool\drivers\arm64", @"System32\WindowsPowerShell", @"SysWOW64\WindowsPowerShell", "IME", @"System32\IME", @"SysWOW64\IME", @"System32\InputMethod", @"SysWOW64\InputMethod",
        @"System32\Speech_OneCore", @"SysWOW64\Speech_OneCore", @"System32\Speech", @"SysWOW64\Speech", @"System32\wbem", @"SysWOW64\wbem",
        // SSO tài khoản Windows của Chrome/Edge, Windows Security, Task Flow UI, ClickOnce (dfsvc) — đóng thì hỏng tính năng + popup lặp (review #75)
        "BrowserCore", @"System32\SecurityHealth", "ShellComponents", "ShellExperiences", "Microsoft.NET",
    };

    /// <summary>WebView2 runtime cài cho cả máy: «&lt;ổ&gt;:\Program Files[ (x86)]\Microsoft\EdgeWebView\» (chỉ quản trị ghi được).</summary>
    private static readonly System.Text.RegularExpressions.Regex WebView2May = new(@"^[A-Za-z]:\\Program Files( \(x86\))?\\Microsoft\\EdgeWebView\\",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <summary>Thư mục <paramref name="dir"/> nằm trong (hoặc là) thư mục Windows.</summary>
    public static bool TrongWindows(string? dir, string? winDir) =>
        !string.IsNullOrWhiteSpace(dir) && !string.IsNullOrWhiteSpace(winDir)
        && (dir.TrimEnd('\\', '/') + "\\").StartsWith(winDir.TrimEnd('\\', '/') + "\\", StringComparison.OrdinalIgnoreCase);

    /// <summary>Exe nằm ở chỗ CHỈ quản trị ghi được trong thư mục Windows: trực tiếp trong Windows / System32 / SysWOW64, hoặc một thư mục con hệ thống
    /// (<see cref="ThuMucConHeThong"/>). Windows\Temp, System32\Tasks, spool\drivers\color… (tài khoản chuẩn ghi được) ⇒ false.</summary>
    public static bool TrongWindowsChiQuanTri(string exePath, string? winDir)
    {
        if (string.IsNullOrWhiteSpace(exePath) || string.IsNullOrWhiteSpace(winDir)) return false;
        var w = winDir.TrimEnd('\\', '/') + "\\";
        if (!exePath.StartsWith(w, StringComparison.OrdinalIgnoreCase)) return false;
        // «C:\Windows\Tracing:game.exe» (luồng dữ liệu phụ của thư mục tài khoản chuẩn ghi được) ⇒ DirName ra C:\Windows: không miễn (review #75)
        if (exePath.IndexOf(':', 2) >= 0) return false;
        foreach (var con in ThuMucConHeThong)
            if (exePath.StartsWith(w + con + "\\", StringComparison.OrdinalIgnoreCase)) return true;
        var dir = DirName(exePath);
        return dir != null && (dir.Equals(w.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)
            || dir.Equals(w + "System32", StringComparison.OrdinalIgnoreCase) || dir.Equals(w + "SysWOW64", StringComparison.OrdinalIgnoreCase));
    }

    public static bool LaTienTrinhHeThongPhien(string exePath, string? winDir)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        var name = FileName(exePath);
        // CHỈ runtime trong Program Files — «%LOCALAPPDATA%\Microsoft\EdgeWebView\…\msedgewebview2.exe» Con tự tạo được (review #75)
        if (name.Equals(WebView2Exe, StringComparison.OrdinalIgnoreCase) && WebView2May.IsMatch(exePath.Replace('/', '\\'))) return true;
        // chỉ ở chỗ chỉ-quản-trị (svchost.exe chép vào Windows\Tasks KHÔNG được miễn); ở đó mọi thứ được miễn trừ app người dùng mở được
        return TrongWindowsChiQuanTri(exePath, winDir) && !UngDungTrongWindows.Contains(name);
    }

    /// <summary>Tên exe trùng thành phần / app của Windows (explorer, notepad, taskmgr…) — luật cho phép THEO TÊN chỉ nhận bản thật
    /// (trong Windows chỉ-quản-trị hoặc gói Store), không nhận game đổi tên thành notepad.exe trong Downloads (review #75).</summary>
    public static bool TenCuaWindows(string name) => TienTrinhHeThongPhien.Contains(name) || UngDungTrongWindows.Contains(name);

    /// <summary>Tên gói của app Store từ đường dẫn «…\WindowsApps\&lt;Gói&gt;_&lt;bản&gt;__&lt;nhàXB&gt;\app.exe» (chữ thường); không phải app Store ⇒ null.
    /// BUG-009: dùng để luật cho phép khớp theo tên gói, không chỉ theo tên exe.</summary>
    public static string? TenGoiStore(string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return null;
        var p = exePath.Replace('/', '\\');
        // CHỈ «<ổ>:\Program Files\WindowsApps\» (chỉ hệ thống ghi được): «WindowsApps» ở chỗ khác (AppData\Local\Microsoft\WindowsApps, C:\WindowsApps
        // Con tự tạo…) ⇒ không phải gói Store, không thì Con đặt game vào «…\WindowsApps\<gói được phép>_1\game.exe» là lọt (review #75)
        const string mk = ":\\Program Files\\WindowsApps\\";
        var i = p.IndexOf(mk, StringComparison.OrdinalIgnoreCase);
        if (i != 1) return null;
        var rest = p[(i + mk.Length)..];
        var j = rest.IndexOf('\\');
        if (j <= 0) return null;
        var thuMuc = rest[..j];
        var k = thuMuc.IndexOf('_');
        var ten = (k > 0 ? thuMuc[..k] : thuMuc).Trim().ToLowerInvariant();
        return ten.Length == 0 ? null : ten;
    }

    /// <summary>Exe khớp luật cho phép: theo tên exe (tên trùng của Windows thì phải là bản thật — <see cref="TenCuaWindows"/>) hoặc theo tên gói Store.</summary>
    public static bool DuocPhepTheoLuat(string exePath, ISet<string> allowed, string? winDir)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        var name = FileName(exePath);
        var goi = TenGoiStore(exePath);
        if (goi != null && allowed.Contains(goi)) return true;
        return allowed.Contains(name) && (!TenCuaWindows(name) || goi != null || winDir == null || TrongWindowsChiQuanTri(exePath, winDir)
            || ProgramFiles.IsMatch(exePath.Replace('/', '\\')));   // wordpad (Windows NT\Accessories), pwsh (PowerShell\7) — Program Files chỉ quản trị ghi
    }

    // CHỈ thư mục Windows tự cài trong Program Files (wordpad, pwsh, IE, Media Player…) — Program Files có thư mục con Users ghi được (Steam…) ⇒
    // không tin cả Program Files cho exe mang tên của Windows (review #75)
    private static readonly System.Text.RegularExpressions.Regex ProgramFiles = new(@"^[A-Za-z]:\\Program Files( \(x86\))?\\(Windows NT|PowerShell|Internet Explorer|Windows Media Player|Windows Photo Viewer|Windows Mail|Windows Defender|Windows Sidebar)\\",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <param name="exePath">Đường dẫn đầy đủ của file chạy.</param>
    /// <param name="allowed">Tên exe (hoặc tên gói Store) được phép (so không phân biệt hoa thường).</param>
    /// <param name="allowedDirs">Thư mục của các app được phép đang chạy (helper cùng thư mục thì không đóng).</param>
    /// <param name="safeDirs">Thư mục hệ thống.</param>
    /// <param name="winDir">Thư mục Windows (null = không miễn tiến trình hệ thống theo tên — chỉ test cũ).</param>
    public static bool ShouldClose(string exePath, ISet<string> allowed, ISet<string> allowedDirs, IEnumerable<string> safeDirs, string? winDir = null)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        if (DuocPhepTheoLuat(exePath, allowed, winDir)) return false;
        if (TenGoiStore(exePath) is { } goi && LaGoiStoreHeThong(goi)) return false;
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
