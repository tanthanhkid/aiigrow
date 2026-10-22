using System.Diagnostics;
using AiiGrow.Core;
using Microsoft.Win32;

namespace AiiGrow.Setup;

internal sealed class InstallOptions
{
    public string Server { get; set; } = "";
    public string Code { get; set; } = "";
    /// <summary>Đã ghép bằng QR (Ba Mẹ quét) thì bỏ bước gọi /api/device/ghep bằng mã 6 số.</summary>
    public PairResult? Paired { get; set; }
    public LocalAccount Child { get; set; } = new("", "", false);
}

internal static class Installer
{
    private const string RunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    private const string PolicyKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System";
    private const string LegalCaption = "Máy được Ba Mẹ quản lý";
    private const string LegalText = "Laptop này dùng AiiGrow. Ba Mẹ đặt giờ dùng và app được mở. Con có thể xin thêm thời gian bất cứ lúc nào.";

    public static bool IsAdmin()
    {
        using var id = System.Security.Principal.WindowsIdentity.GetCurrent();
        return new System.Security.Principal.WindowsPrincipal(id).IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);
    }

    /// <summary>
    /// CÀI MỘT CHẠM: ghép máy bằng token nhúng sẵn trong bộ cài (không nhập URL/mã tay) rồi cài dịch vụ. Không đụng tài khoản Windows
    /// (máy dùng chung: Con chọn hồ sơ + PIN; chính sách áp cho mọi tài khoản không phải quản trị). Chạy được ở chế độ /silent.
    /// </summary>
    public static async Task RunOneTouchAsync(EnrollmentPackage pkg, IEnroller enroller, Action<string> log, CancellationToken ct = default)
    {
        log("Đang ghép máy với máy chủ AiiGrow…");
        var res = await enroller.EnrollAsync(pkg, Environment.MachineName, ct);
        new ConfigStore().Save(OneTouch.BuildConfig(pkg, res));
        log("Đã ghép máy. Đang cài dịch vụ…");
        InstallFilesAndService();
        SetTrayAndNotice();
        log("Xong. AiiGrow đang chạy trên máy này.");
    }

    /// <summary>Luồng cài có chọn tài khoản (giao diện 3 bước) — ghép bằng QR hoặc mã 6 số.</summary>
    public static async Task RunAsync(InstallOptions o, Action<int, string?> step)
    {
        var pair = o.Paired ?? await ApiClient.PairAsync(o.Server, o.Code, Environment.MachineName);
        var store = new ConfigStore();
        store.Save(new AgentConfig
        {
            Server = pair.Server ?? o.Server,
            DeviceId = pair.DeviceId,
            Token = pair.Token,
            ChildName = pair.ChildName,
            DungChung = pair.DungChung,
            ChildUser = o.Child.Name,
            ChildSid = o.Child.Sid,
            LienLacCuoi = DateTimeOffset.UtcNow,   // mốc fail-open 14 ngày tính từ lúc cài (chưa sync được lần nào vẫn có mốc)
        });
        step(0, null);

        if (o.Child.IsAdmin && !string.IsNullOrEmpty(o.Child.Sid))
        {
            Accounts.Demote(o.Child.Sid);
            // GHI LẠI tài khoản đã bị hạ + nhóm (Administrators) để TRẢ LẠI khi gỡ — không để Con mất quyền admin vĩnh viễn sau khi gỡ AiiGrow.
            store.Update(c => c.DaHaQuyen.Add(new QuyenDaHa { Sid = o.Child.Sid, Nhom = "S-1-5-32-544" }));
        }
        step(1, null);

        InstallFilesAndService();
        step(2, null);

        SetTrayAndNotice();
        step(3, null);
    }

    private static void SetTrayAndNotice()
    {
        using (var run = Registry.LocalMachine.CreateSubKey(RunKey))
            run.SetValue(Paths.TrayRunValue, "\"" + Path.Combine(Paths.InstallDir, Paths.TrayExeName) + "\"");
        using (var pol = Registry.LocalMachine.CreateSubKey(PolicyKey))
        {
            pol.SetValue("LegalNoticeCaption", LegalCaption);
            pol.SetValue("LegalNoticeText", LegalText);
        }
    }

    private static void InstallFilesAndService()
    {
        var src = AppContext.BaseDirectory;
        var want = new List<string> { Paths.ServiceExeName };
        if (File.Exists(Path.Combine(src, Paths.TrayExeName))) want.Add(Paths.TrayExeName);
        if (!File.Exists(Path.Combine(src, Paths.ServiceExeName)))
            throw new FileNotFoundException("Thiếu " + Paths.ServiceExeName + " cạnh bộ cài (" + src + ")");

        var dest = Paths.InstallDir;
        Directory.CreateDirectory(dest);
        Shell.PowerShell($"try {{ Stop-Service -Name {Paths.ServiceName} -Force -ErrorAction Stop }} catch {{}}", 60000);
        foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)))
        {
            try { p.Kill(); p.WaitForExit(5000); } catch { }
            p.Dispose();
        }
        // Lần gỡ trước còn hẹn tác vụ dọn (chạy lúc khởi động) ⇒ huỷ, kẻo nó xoá bản vừa cài.
        Shell.PowerShell($"try {{ Unregister-ScheduledTask -TaskName {Shell.PsQuote(SystemCleanup.TenTacVuDon)} -Confirm:$false -ErrorAction Stop }} catch {{}}", 60000);
        foreach (var f in want)
            File.Copy(Path.Combine(src, f), Path.Combine(dest, f), true);
        // Chép chính bộ cài vào thư mục cài (tên cố định) ⇒ Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt gọi được «--uninstall».
        var self = Environment.ProcessPath;
        var setupDest = Path.Combine(dest, Paths.SetupExeName);
        if (!string.IsNullOrEmpty(self) && File.Exists(self) && !string.Equals(Path.GetFullPath(self), Path.GetFullPath(setupDest), StringComparison.OrdinalIgnoreCase))
            File.Copy(self, setupDest, true);

        var bin = "\"" + Path.Combine(dest, Paths.ServiceExeName) + "\"";
        var q = Shell.PsQuote(bin);
        // Dịch vụ tự chạy khi khởi động máy + SCM TỰ KHỞI ĐỘNG LẠI khi lỗi (cơ chế chính hãng của Windows).
        var r = Shell.PowerShell(
            $"if (Get-Service -Name {Paths.ServiceName} -ErrorAction SilentlyContinue) {{ " +
            $"& sc.exe config {Paths.ServiceName} binPath= {q} start= auto | Out-Null }} else {{ " +
            $"New-Service -Name {Paths.ServiceName} -BinaryPathName {q} -DisplayName {Shell.PsQuote(Paths.ServiceDisplayName)} " +
            "-Description 'AiiGrow: đồng bộ chính sách và tính giờ dùng máy do Ba Mẹ đặt. Chạy bằng tài khoản hệ thống.' -StartupType Automatic | Out-Null }; " +
            $"& sc.exe failure {Paths.ServiceName} reset= 86400 actions= restart/5000/restart/5000/restart/30000 | Out-Null; " +
            $"& sc.exe failureflag {Paths.ServiceName} 1 | Out-Null; " +
            $"Start-Service -Name {Paths.ServiceName}");
        if (!r.Ok) throw new InvalidOperationException("Không cài được dịch vụ: " + r.Error);

        // Mục «AiiGrow» trong Cài đặt › Ứng dụng: Ba Mẹ gỡ tại máy, Windows hỏi mật khẩu quản trị (Setup.exe xin quyền admin qua manifest).
        if (File.Exists(setupDest)) AppsEntry.Register(dest, typeof(Installer).Assembly.GetName().Version?.ToString(3) ?? "0.1.0");
    }

    /// <summary>Gỡ hoàn toàn tại máy: báo máy chủ «đã gỡ tại máy» (POST /api/device/da-go) TRƯỚC khi xoá token, rồi gỡ sạch
    /// (cùng lõi <see cref="SystemCleanup"/> với gỡ từ xa). Chạy lại được nhiều lần.</summary>
    public static Task<KetQuaGo> UninstallAsync() => LocalUninstall.RunAsync(new ConfigStore(), async (cfg, ct) =>
    {
        using var api = new HeartbeatClient(cfg.Server, cfg.Token);
        await api.DaGoAsync(ct);
    }, new WindowsCleanupOps());
}
