using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace AiiGrow.Core;

// CHẶN APP THẬT (25/10): dong-bo.windows.blockedApps = app Ba Mẹ đặt «Chặn», kèm định danh thật lấy từ danh sách app của CHÍNH máy này
// (DanhSachApp.cs). Chế độ hiệu lực «chan» ⇒ áp ở MỌI mode, kể cả tu_do (Ba Mẹ mở khẩn cấp / thêm giờ vẫn không mở app bị Chặn):
//   • đóng tiến trình trong phiên Con khớp: tên exe == muc, gói Store == muc, đường dẫn == duongDan, nằm trong thuMuc (chỉ khi thuMuc hợp lệ,
//     không quá rộng), hoặc SHA-256 khớp;
//   • AppLocker (khi có): luật Deny cho SID Con theo đường dẫn (duongDan, thuMuc\*) + băm — gộp vào chính sách hiện có, tiền tố "AiiGrow: ".
// Giám sát ⇒ chỉ ghi log «sẽ chặn». KHÔNG BAO GIỜ đóng / Deny tiến trình hệ thống của phiên, gói Store hệ thống, AiiGrow, Defender (review #75).

/// <summary>Một mục của dong-bo.windows.blockedApps.</summary>
public sealed class AppBiChan
{
    public string Muc { get; set; } = "";
    public string? DuongDan { get; set; }
    public string? ThuMuc { get; set; }
    public string? Sha256 { get; set; }
    public string? NhaPhatHanh { get; set; }
    public string? TeamId { get; set; }
}

/// <summary>Một luật Deny AppLocker cho app bị chặn: theo đường dẫn (Path: tệp, «thư mục\*» hoặc «*\ten.exe») hoặc theo băm AppLocker của tệp.</summary>
public sealed record LuatChanApp(string Ten, string? Path, string? HashData = null, long? HashLength = null, string? SourceFile = null);

public static class ChanAppThat
{
    private static readonly Regex Hex64 = new("^[0-9a-f]{64}$", RegexOptions.Compiled);

    /// <summary>Thư mục hệ thống ở gốc ổ — không bao giờ là «thư mục cài» của một app.</summary>
    private static readonly HashSet<string> GocHeThong = new(StringComparer.OrdinalIgnoreCase)
    {
        "Windows", "Users", "Documents and Settings", "PerfLogs", "$Recycle.Bin", "System Volume Information", "Recovery", "Boot",
        "$WinREAgent", "Config.Msi", "Intel", "AMD", "NVIDIA", "OneDriveTemp",
    };

    /// <summary>Thư mục gom nhiều thứ ngay ở gốc ổ (D:\Downloads, D:\Games…) — chính nó quá rộng, app thật nằm sâu hơn (D:\Games\Foo hợp lệ).</summary>
    private static readonly HashSet<string> GocGom = new(StringComparer.OrdinalIgnoreCase)
    {
        "Downloads", "Download", "Games", "Game", "Desktop", "Documents", "Apps", "Software", "Setup", "Temp", "Tmp", "Programs",
    };

    /// <summary>Thư mục con của Program Files / Program Files (x86) chứa nhiều app hoặc thành phần Windows — không dùng làm thuMuc.</summary>
    private static readonly HashSet<string> ConProgramFilesRong = new(StringComparer.OrdinalIgnoreCase)
    {
        "Common Files", "WindowsApps", "ModifiableWindowsApps", "Windows NT", "Windows Defender", "Windows Defender Advanced Threat Protection",
        "Windows Mail", "Windows Media Player", "Windows Photo Viewer", "Windows Sidebar", "Windows Security", "WindowsPowerShell", "PowerShell",
        "Internet Explorer", "Microsoft", "Microsoft.NET", "dotnet", "Reference Assemblies", "MSBuild", "AiiGrow", "Uninstall Information",
        "Microsoft Update Health Tools", "Package Cache",
    };

    private static readonly HashSet<string> ConProgramDataRong = new(StringComparer.OrdinalIgnoreCase)
    {
        "Microsoft", "Package Cache", "Packages", "AiiGrow", "regid.1991-06.com.microsoft", "USOShared", "USOPrivate", "SoftwareDistribution",
    };

    /// <summary>Dưới AppData\Local|Roaming|LocalLow: thư mục chung của nhiều app.</summary>
    private static readonly HashSet<string> ConAppDataRong = new(StringComparer.OrdinalIgnoreCase)
    {
        "Programs", "Microsoft", "Temp", "Packages", "Apps", "Publishers", "CrashDumps", "D3DSCache", "VirtualStore", "ConnectedDevicesPlatform",
    };

    /// <summary>thuMuc dùng được để chặn cả exe con cùng thư mục: tuyệt đối, không phải gốc ổ, Windows, Program Files / ProgramData gốc hoặc thư mục
    /// chung (Common Files, WindowsApps, Microsoft…), Users\X và thư mục đã biết (Desktop, Downloads…), AppData gốc / AppData\Local\Programs….</summary>
    public static bool ThuMucHopLe(string? thuMuc, string? winDir)
    {
        if (string.IsNullOrWhiteSpace(thuMuc)) return false;
        var d = DanhSachApp.ChuanThuMuc(thuMuc);
        if (!DanhSachApp.LaDuongTuyetDoi(d) || d.IndexOfAny(new[] { '*', '?', '"', '<', '>', '|' }) >= 0) return false;
        if (ProcessGuard.TrongWindows(d, winDir)) return false;
        var segs = d[3..].Split('\\', StringSplitOptions.RemoveEmptyEntries);
        if (segs.Length == 0) return false;
        var dau = segs[0];
        if (dau.Equals("Program Files", StringComparison.OrdinalIgnoreCase) || dau.Equals("Program Files (x86)", StringComparison.OrdinalIgnoreCase))
            return segs.Length >= 2 && !ConProgramFilesRong.Contains(segs[1]);
        if (dau.Equals("ProgramData", StringComparison.OrdinalIgnoreCase))
            return segs.Length >= 2 && !ConProgramDataRong.Contains(segs[1]);
        if (dau.Equals("Users", StringComparison.OrdinalIgnoreCase))
        {
            // Users\X (1–2 cấp sau Users), Users\X\Desktop|Downloads|Documents|AppData (3 cấp) ⇒ quá rộng
            if (segs.Length <= 3) return false;
            // OneDrive\Desktop, OneDrive\Documents… ⇒ thư mục đã biết
            if (segs[2].StartsWith("OneDrive", StringComparison.OrdinalIgnoreCase) && segs.Length <= 4) return false;
            if (segs[2].Equals("AppData", StringComparison.OrdinalIgnoreCase))
            {
                if (segs.Length == 4) return false;                                           // AppData\Local
                if (segs.Length == 5 && ConAppDataRong.Contains(segs[4])) return false;        // AppData\Local\Programs
                if (d.Contains(@"\AppData\Local\Microsoft\WindowsApps", StringComparison.OrdinalIgnoreCase)) return false;   // bí danh chạy app Store
            }
            return true;
        }
        if (GocHeThong.Contains(dau)) return false;
        if (segs.Length == 1 && GocGom.Contains(dau)) return false;
        return true;   // C:\Games\X, D:\Steam
    }

    /// <summary>Chuẩn hoá danh sách từ máy chủ: muc chữ thường, đường dẫn tuyệt đối, thuMuc hợp lệ (không thì bỏ trường đó), sha256 64 hex; bỏ mục rỗng.</summary>
    public static List<AppBiChan> Chuan(IEnumerable<AppBiChan>? ds, string? winDir = null)
    {
        var kq = new List<AppBiChan>();
        if (ds == null) return kq;
        winDir ??= Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var a in ds)
        {
            if (a == null) continue;
            var muc = (a.Muc ?? "").Trim().ToLowerInvariant();
            var duong = (a.DuongDan ?? "").Trim().Trim('"').Replace('/', '\\');
            var sha = (a.Sha256 ?? "").Trim().ToLowerInvariant();
            var m = new AppBiChan
            {
                Muc = muc,
                // chỉ một tệp .exe cụ thể — «C:\*» thành luật Deny AppLocker là Con không đăng nhập được (review #126)
                DuongDan = DanhSachApp.LaDuongTuyetDoi(duong) && duong.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)
                    && duong.IndexOfAny(new[] { '*', '?', '"', '<', '>', '|' }) < 0 ? duong : null,
                ThuMuc = ThuMucHopLe(a.ThuMuc, winDir) ? DanhSachApp.ChuanThuMuc(a.ThuMuc) : null,
                Sha256 = Hex64.IsMatch(sha) ? sha : null,
                NhaPhatHanh = string.IsNullOrWhiteSpace(a.NhaPhatHanh) ? null : a.NhaPhatHanh.Trim(),
                TeamId = string.IsNullOrWhiteSpace(a.TeamId) ? null : a.TeamId.Trim(),
            };
            if (m.Muc.Length == 0 && m.DuongDan == null && m.ThuMuc == null && m.Sha256 == null) continue;
            if (seen.Add(string.Join("|", m.Muc, m.DuongDan, m.ThuMuc, m.Sha256))) kq.Add(m);
        }
        return kq;
    }

    /// <summary>Tiến trình KHÔNG BAO GIỜ đóng dù khớp luật chặn: tiến trình hệ thống của phiên (explorer, dwm… ở chỗ chỉ quản trị ghi được), gói Store
    /// hệ thống, AiiGrow / Defender / Common Files (thư mục an toàn), exe mang tên AiiGrow.</summary>
    public static bool MienChan(string exePath, string? winDir, IEnumerable<string> safeDirs)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return true;
        if (ProcessGuard.LaTienTrinhHeThongPhien(exePath, winDir)) return true;
        if (ProcessGuard.TenGoiStore(exePath) is { } goi && ProcessGuard.LaGoiStoreHeThong(goi)) return true;
        foreach (var d in safeDirs) if (!string.IsNullOrEmpty(d) && DanhSachApp.Trong(exePath, d)) return true;
        return DanhSachApp.TenTep(exePath).StartsWith("AiiGrow.", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Tên exe chung chung nhiều app dùng — luật có định danh thật (đường dẫn / thư mục / băm) thì KHÔNG khớp theo tên trần với những tên này
    /// (chặn launcher Minecraft không được đóng mọi javaw.exe / python.exe của Con — review #126).</summary>
    public static readonly HashSet<string> TenChung = new(StringComparer.OrdinalIgnoreCase)
    {
        "launcher.exe", "game.exe", "client.exe", "app.exe", "main.exe", "start.exe", "run.exe", "play.exe", "player.exe", "server.exe",
        "java.exe", "javaw.exe", "python.exe", "pythonw.exe", "node.exe", "electron.exe", "helper.exe", "update.exe", "updater.exe", "setup.exe",
        "unitycrashhandler64.exe", "unitycrashhandler32.exe", "crashhandler.exe", "cefsharp.browsersubprocess.exe", "qtwebengineprocess.exe",
        "launcherpatcher.exe", "bootstrapper.exe", "loader.exe", "win64.exe", "x64.exe",
    };

    /// <summary>Luật khớp theo tên exe trần: luôn khi luật CHỈ có tên; có định danh thật thì chỉ khi tên không chung chung (<see cref="TenChung"/>).</summary>
    public static bool KhopTheoTen(AppBiChan a) =>
        a.Muc.Length > 0 && ((a.DuongDan == null && a.ThuMuc == null && a.Sha256 == null) || !TenChung.Contains(a.Muc));

    /// <summary>Tiến trình <paramref name="exePath"/> khớp một luật chặn? <paramref name="bam"/> = SHA-256 hex chữ thường của tệp (chỉ gọi khi có luật băm).</summary>
    public static AppBiChan? Khop(string exePath, IReadOnlyList<AppBiChan> ds, Func<string, string?>? bam)
    {
        if (string.IsNullOrWhiteSpace(exePath) || ds.Count == 0) return null;
        var p = exePath.Replace('/', '\\');
        var ten = DanhSachApp.TenTep(p).ToLowerInvariant();
        var goi = ProcessGuard.TenGoiStore(p);
        foreach (var a in ds)
        {
            if (a.Muc.Length > 0 && a.Muc == goi) return a;
            if (a.Muc == ten && KhopTheoTen(a)) return a;
            if (a.DuongDan != null && string.Equals(a.DuongDan, p, StringComparison.OrdinalIgnoreCase)) return a;
            if (a.ThuMuc != null && DanhSachApp.Trong(p, a.ThuMuc)) return a;
        }
        if (bam != null && ds.Any(a => a.Sha256 != null))
        {
            string? h = null;
            try { h = bam(p)?.ToLowerInvariant(); } catch { }
            if (h != null) foreach (var a in ds) if (a.Sha256 == h) return a;
        }
        return null;
    }

    /// <summary>Đóng (hoặc, giám sát: chỉ liệt kê) tiến trình của phiên Con khớp luật chặn. → (tên exe, mục luật) đã đóng / sẽ đóng.</summary>
    public static IReadOnlyList<(string Exe, string Muc)> Enforce(IProcessControl control, int sessionId, IReadOnlyList<AppBiChan> ds, bool dryRun,
        Func<string, string?>? bam = null, string? winDir = null, IEnumerable<string>? safeDirs = null)
    {
        var kq = new List<(string, string)>();
        if (ds.Count == 0) return kq;
        winDir ??= Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        var safe = (safeDirs ?? ProcessGuard.DefaultSafeDirs()).ToList();
        foreach (var p in control.ListChildProcesses(sessionId))
        {
            if (string.IsNullOrWhiteSpace(p.Path) || MienChan(p.Path, winDir, safe)) continue;
            var luat = Khop(p.Path, ds, bam);
            if (luat == null) continue;
            var ten = DanhSachApp.TenTep(p.Path).ToLowerInvariant();
            var muc = luat.Muc.Length > 0 ? luat.Muc : ten;
            if (dryRun || control.Close(p.Id)) kq.Add((ten, muc));
        }
        return kq;
    }

    /// <summary>Luật AppLocker cho danh sách chặn: Deny đường dẫn (duongDan), «thuMuc\*» (thuMuc hợp lệ), băm AppLocker của tệp duongDan
    /// (<paramref name="bamAppLocker"/>: (Data «0x…», độ dài, tên tệp) — đọc bằng Get-AppLockerFileInformation, không phải SHA-256 phẳng), và «*\muc»
    /// khi luật chỉ có tên exe. Bỏ mọi thứ chạm tiến trình hệ thống / AiiGrow (<see cref="MienChan"/>), tên trùng tiến trình phiên của Windows.</summary>
    public static List<LuatChanApp> LuatAppLocker(IEnumerable<AppBiChan> ds, string? winDir, IEnumerable<string> safeDirs,
        Func<string, (string Data, long Length, string SourceFile)?>? bamAppLocker = null)
    {
        var safe = safeDirs.ToList();
        var kq = new List<LuatChanApp>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        void Them(LuatChanApp l) { if (seen.Add(l.Path ?? ("#" + l.HashData))) kq.Add(l); }
        foreach (var a in ds)
        {
            var ten = a.Muc.Length > 0 ? a.Muc : DanhSachApp.TenTep(a.DuongDan ?? a.ThuMuc ?? "?").ToLowerInvariant();
            if (a.DuongDan != null && !MienChan(a.DuongDan, winDir, safe))
            {
                Them(new LuatChanApp(ten + " (đường dẫn)", a.DuongDan));
                if (bamAppLocker != null)
                {
                    (string Data, long Length, string SourceFile)? h = null;
                    try { h = bamAppLocker(a.DuongDan); } catch { }
                    if (h is { } x && x.Length > 0 && Regex.IsMatch(x.Data, "^0x[0-9A-Fa-f]{64}$"))
                        Them(new LuatChanApp(ten + " (băm)", null, x.Data.ToUpperInvariant().Replace("0X", "0x"), x.Length, x.SourceFile));
                }
            }
            if (a.ThuMuc != null && ThuMucHopLe(a.ThuMuc, winDir) && !safe.Any(s => !string.IsNullOrEmpty(s) && (DanhSachApp.Trong(a.ThuMuc + "\\x.exe", s) || DanhSachApp.Trong(s + "\\x", a.ThuMuc))))
                Them(new LuatChanApp(ten + " (thư mục)", DanhSachApp.ChuanThuMuc(a.ThuMuc) + @"\*"));
            // chỉ có tên exe (luật chan không có trong danh sách của máy): «*\ten.exe» như danh sách chặn cũ — trừ tên tiến trình phiên của Windows
            if (a.DuongDan == null && a.ThuMuc == null && KhopTheoTen(a) && AppLockerXml.NormalizeExe(a.Muc) is { } n && !ProcessGuard.TienTrinhHeThongPhien.Contains(n)
                && !n.StartsWith("aiigrow.", StringComparison.Ordinal))
                Them(new LuatChanApp(n + " (tên)", @"*\" + n));
        }
        return kq;
    }

    /// <summary>Vân tay luật (khoá Reconcile AppLocker): đổi luật ⇒ ghi lại chính sách.</summary>
    public static string VanTay(IEnumerable<LuatChanApp> luat) =>
        string.Join(";", luat.Select(l => l.Path ?? (l.HashData + ":" + l.HashLength)).OrderBy(x => x, StringComparer.OrdinalIgnoreCase));
}

/// <summary>SHA-256 tệp có bộ nhớ đệm theo (đường dẫn, cỡ, giờ sửa) — không băm lại exe đang chạy mỗi nhịp 5 giây.</summary>
public sealed class BamTepCache
{
    /// <summary>Tệp lớn hơn ngần này không băm (exe game vài GB — băm mỗi lần khởi động quá nặng).</summary>
    public const long ToiDaByte = 512L * 1024 * 1024;
    /// <summary>Một bộ đệm cho cả dịch vụ (đóng app + quét danh sách) — không băm cùng tệp hai lần.</summary>
    public static readonly BamTepCache Chung = new();
    private readonly HashSet<string> _dangBam = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Băm đã có (còn đúng cỡ + giờ sửa) thì trả; chưa có ⇒ băm ở luồng nền, trả null lần này (nhịp sau có) — không chặn vòng thực thi 5 giây
    /// bằng việc băm exe vài trăm MB (review #126).</summary>
    public string? BamNen(string path)
    {
        try
        {
            var fi = new FileInfo(path);
            if (!fi.Exists) return null;
            lock (_k)
            {
                if (_d.TryGetValue(path, out var c) && c.Len == fi.Length && c.Mtime == fi.LastWriteTimeUtc) return c.Hash;
                if (!_dangBam.Add(path)) return null;
            }
            Task.Run(() => { try { Bam(path); } finally { lock (_k) _dangBam.Remove(path); } });
            return null;
        }
        catch { return null; }
    }
    private readonly Dictionary<string, (long Len, DateTime Mtime, string? Hash)> _d = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _k = new();

    public string? Bam(string path)
    {
        try
        {
            var fi = new FileInfo(path);
            if (!fi.Exists) return null;
            lock (_k) if (_d.TryGetValue(path, out var c) && c.Len == fi.Length && c.Mtime == fi.LastWriteTimeUtc) return c.Hash;
            string? h = null;
            if (fi.Length <= ToiDaByte)
            {
                using var s = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 1 << 16);
                h = Convert.ToHexString(SHA256.HashData(s)).ToLowerInvariant();
            }
            lock (_k)
            {
                if (_d.Count > 4000) _d.Clear();
                _d[path] = (fi.Length, fi.LastWriteTimeUtc, h);
            }
            return h;
        }
        catch { return null; }
    }
}
