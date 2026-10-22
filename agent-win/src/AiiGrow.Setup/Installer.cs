using System.Diagnostics;
using AiiGrow.Core;
using Microsoft.Win32;

namespace AiiGrow.Setup;

internal sealed class InstallOptions
{
    public string Server { get; set; } = "";
    public string Code { get; set; } = "";
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
        CaiLai.GhiGiuQuyen(new ConfigStore(), OneTouch.BuildConfig(pkg, res));   // cài lại: giữ DaHaQuyen cũ
        log("Đã ghép máy. Đang cài dịch vụ…");
        InstallFilesAndService();
        SetTrayAndNotice();
        log("Xong. AiiGrow đang chạy trên máy này.");
    }

    /// <summary>Luồng cài có chọn tài khoản (giao diện 3 bước) — ghép bằng mã 6 số.</summary>
    public static async Task RunAsync(InstallOptions o, Action<int, string?> step)
    {
        var pair = await ApiClient.PairAsync(o.Server, o.Code, Environment.MachineName);
        var store = new ConfigStore();
        // Cài lại đè lên máy đã hạ quyền: GỘP DaHaQuyen cũ (Con lúc này đã là tài khoản thường ⇒ không ghi lại được).
        CaiLai.GhiGiuQuyen(store, new AgentConfig
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
            store.UpdateIf(c => CaiLai.ThemDaHa(c, o.Child.Sid));
        }
        step(1, null);

        InstallFilesAndService();
        step(2, null);

        SetTrayAndNotice();
        step(3, null);
    }

    internal static void SetTrayAndNotice()
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
        if (!Goi.Co(Paths.ServiceExeName))
            throw new FileNotFoundException("Bộ cài thiếu " + Paths.ServiceExeName + " — tải lại AiiGrow-Setup.exe ở trang /tai");

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
        // Dịch vụ + khay: tệp cạnh bộ cài (gói zip cũ) hoặc giải từ chính AiiGrow-Setup.exe (bộ cài một file).
        Goi.ChepRa(Paths.ServiceExeName, Path.Combine(dest, Paths.ServiceExeName));
        Goi.ChepRa(Paths.TrayExeName, Path.Combine(dest, Paths.TrayExeName));
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

        // Lối tắt «AiiGrow» trong menu Start (mọi tài khoản) ⇒ mở lại biểu tượng khay. Lỗi lối tắt không chặn việc cài.
        var tray = Path.Combine(dest, Paths.TrayExeName);
        if (File.Exists(tray))
            Shell.PowerShell("$s = (New-Object -ComObject WScript.Shell).CreateShortcut(" + Shell.PsQuote(Paths.StartMenuShortcut) + "); " +
                "$s.TargetPath = " + Shell.PsQuote(tray) + "; $s.Description = 'AiiGrow — giờ dùng máy do Ba Mẹ đặt'; $s.Save()", 30000);

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
