using System.Diagnostics;
using AiiGrow.Core;
using Microsoft.Win32;

namespace AiiGrow.Setup;

internal sealed class InstallOptions
{
    public string Server { get; set; } = "";
    public string Code { get; set; } = "";
    /// <summary>Đã ghép bằng QR (bố mẹ quét) thì bỏ bước gọi /api/pair bằng mã 6 số.</summary>
    public PairResult? Paired { get; set; }
    public LocalAccount Child { get; set; } = new("", "", false);
}

internal static class Installer
{
    private const string RunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    private const string PolicyKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System";
    private const string LegalCaption = "Máy được bố mẹ quản lý";
    private const string LegalText = "Laptop này dùng AiiGrow. Bố mẹ đặt giờ dùng và app được mở. Con có thể xin thêm thời gian bất cứ lúc nào.";

    public static bool IsAdmin()
    {
        using var id = System.Security.Principal.WindowsIdentity.GetCurrent();
        return new System.Security.Principal.WindowsPrincipal(id).IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);
    }

    /// <summary>Các bước cài. <paramref name="step"/> được gọi với (chỉ số bước, thông báo lỗi hoặc null nếu xong).</summary>
    public static async Task RunAsync(InstallOptions o, Action<int, string?> step)
    {
        // 0. Ghép máy: kết quả quét QR, hoặc mã 6 số (dự phòng).
        var pair = o.Paired ?? await ApiClient.PairAsync(o.Server, o.Code, Environment.MachineName);
        var store = new ConfigStore();
        store.Save(new AgentConfig
        {
            Server = pair.Server ?? o.Server,
            DeviceId = pair.DeviceId,
            Token = pair.Token,
            ChildName = pair.ChildName,
            ChildUser = o.Child.Name,
            ChildSid = o.Child.Sid,
        });
        step(0, null);

        // 1. Hạ quyền tài khoản của con (nếu đang là Administrator).
        if (o.Child.IsAdmin) Accounts.Demote(o.Child.Sid);
        step(1, null);

        // 2. Chép file, cài và chạy dịch vụ.
        InstallFilesAndService();
        step(2, null);

        // 3. Tray tự chạy khi đăng nhập + thông báo trước khi đăng nhập.
        using (var run = Registry.LocalMachine.CreateSubKey(RunKey))
            run.SetValue(Paths.TrayRunValue, "\"" + Path.Combine(Paths.InstallDir, Paths.TrayExeName) + "\"");
        using (var pol = Registry.LocalMachine.CreateSubKey(PolicyKey))
        {
            pol.SetValue("LegalNoticeCaption", LegalCaption);
            pol.SetValue("LegalNoticeText", LegalText);
        }
        step(3, null);
    }

    private static void InstallFilesAndService()
    {
        var src = AppContext.BaseDirectory;
        foreach (var f in new[] { Paths.ServiceExeName, Paths.TrayExeName })
            if (!File.Exists(Path.Combine(src, f)))
                throw new FileNotFoundException("Thiếu " + f + " cạnh bộ cài (" + src + ")");

        var dest = Paths.InstallDir;
        Directory.CreateDirectory(dest);
        Shell.PowerShell($"try {{ Stop-Service -Name {Paths.ServiceName} -Force -ErrorAction Stop }} catch {{}}", 60000);
        foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)))
        {
            try { p.Kill(); p.WaitForExit(5000); } catch { }
            p.Dispose();
        }
        foreach (var f in new[] { Paths.ServiceExeName, Paths.TrayExeName })
            File.Copy(Path.Combine(src, f), Path.Combine(dest, f), true);

        var bin = "\"" + Path.Combine(dest, Paths.ServiceExeName) + "\"";
        var q = Shell.PsQuote(bin);
        var r = Shell.PowerShell(
            $"if (Get-Service -Name {Paths.ServiceName} -ErrorAction SilentlyContinue) {{ " +
            $"& sc.exe config {Paths.ServiceName} binPath= {q} start= auto | Out-Null }} else {{ " +
            $"New-Service -Name {Paths.ServiceName} -BinaryPathName {q} -DisplayName {Shell.PsQuote(Paths.ServiceDisplayName)} " +
            "-Description 'AiiGrow: tính giờ và áp chính sách dùng máy do bố mẹ đặt. Chạy bằng tài khoản hệ thống.' -StartupType Automatic | Out-Null }; " +
            $"& sc.exe failure {Paths.ServiceName} reset= 86400 actions= restart/5000/restart/5000/restart/30000 | Out-Null; " +
            $"Start-Service -Name {Paths.ServiceName}");
        if (!r.Ok) throw new InvalidOperationException("Không cài được dịch vụ: " + r.Error);
    }

    /// <summary>Gỡ hoàn toàn: dịch vụ, Run, thông báo đăng nhập, luật AppLocker của AiiGrow, file.</summary>
    public static string Uninstall()
    {
        var log = new System.Text.StringBuilder();
        Shell.PowerShell($"try {{ Stop-Service -Name {Paths.ServiceName} -Force }} catch {{}}", 60000);
        Shell.Run("sc.exe", new[] { "delete", Paths.ServiceName });
        log.AppendLine("Đã gỡ dịch vụ.");
        try { using var run = Registry.LocalMachine.OpenSubKey(RunKey, true); run?.DeleteValue(Paths.TrayRunValue, false); } catch { }
        try
        {
            using var pol = Registry.LocalMachine.OpenSubKey(PolicyKey, true);
            pol?.DeleteValue("LegalNoticeCaption", false);
            pol?.DeleteValue("LegalNoticeText", false);
        }
        catch { }
        foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)))
        {
            try { p.Kill(); } catch { }
            p.Dispose();
        }
        var tmp = Path.Combine(Path.GetTempPath(), "aii-applocker.xml");
        var cur = Shell.PowerShell("Get-AppLockerPolicy -Local -Xml | Out-File -Encoding utf8 -FilePath " + Shell.PsQuote(tmp));
        if (cur.Ok && AppLockerXml.ContainsOurs(File.ReadAllText(tmp)))
        {
            File.WriteAllText(tmp, AppLockerXml.RemoveOurs(File.ReadAllText(tmp)), new System.Text.UTF8Encoding(false));
            var s = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(tmp));
            log.AppendLine(s.Ok ? "Đã gỡ luật AppLocker của AiiGrow." : "Gỡ AppLocker lỗi: " + s.Error);
        }
        try { Directory.Delete(Paths.InstallDir, true); } catch { log.AppendLine("Còn file ở " + Paths.InstallDir + " (xoá tay sau khi khởi động lại)."); }
        try { Directory.Delete(Paths.DataDir, true); } catch { }
        log.AppendLine("Tài khoản của con vẫn là tài khoản thường; nâng quyền lại nếu cần.");
        return log.ToString();
    }
}
