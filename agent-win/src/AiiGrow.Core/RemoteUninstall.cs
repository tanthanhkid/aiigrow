using System.Diagnostics;
using System.Text;
using Microsoft.Win32;

namespace AiiGrow.Core;

// Gỡ sạch AiiGrow: dịch vụ, tác vụ/Run, thông báo đăng nhập, luật AppLocker đã đặt, file + cấu hình (token). Dùng chung cho cả gỡ tay
// (AiiGrow.Setup --uninstall) và gỡ TỪ XA (dịch vụ nhận lệnh "go" khi đồng bộ). Chạy bằng SYSTEM (dịch vụ) hoặc Administrator (bộ gỡ).

public static class SystemCleanup
{
    private const string RunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    private const string PolicyKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System";

    /// <param name="deleteService">false khi chính DỊCH VỤ tự gỡ (đánh dấu xoá nhưng để host tự dừng, tránh tự huỷ giữa chừng).</param>
    public static string Run(bool deleteService = true)
    {
        var log = new StringBuilder();

        // 1. Luật AppLocker của AiiGrow (gỡ trước khi mất quyền).
        try
        {
            var tmp = Path.Combine(Path.GetTempPath(), "aii-applocker.xml");
            var cur = Shell.PowerShell("Get-AppLockerPolicy -Local -Xml | Out-File -Encoding utf8 -FilePath " + Shell.PsQuote(tmp));
            if (cur.Ok && File.Exists(tmp) && AppLockerXml.ContainsOurs(File.ReadAllText(tmp)))
            {
                File.WriteAllText(tmp, AppLockerXml.RemoveOurs(File.ReadAllText(tmp)), new UTF8Encoding(false));
                var s = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(tmp));
                log.AppendLine(s.Ok ? "Đã gỡ luật AppLocker của AiiGrow." : "Gỡ AppLocker lỗi: " + s.Error);
            }
        }
        catch (Exception e) { log.AppendLine("Gỡ AppLocker lỗi: " + e.Message); }

        // 2. Tray tự chạy + thông báo đăng nhập.
        try { using var run = Registry.LocalMachine.OpenSubKey(RunKey, true); run?.DeleteValue(Paths.TrayRunValue, false); } catch { }
        try
        {
            using var pol = Registry.LocalMachine.OpenSubKey(PolicyKey, true);
            pol?.DeleteValue("LegalNoticeCaption", false);
            pol?.DeleteValue("LegalNoticeText", false);
        }
        catch { }

        // 3. Đóng tray.
        foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)))
        {
            try { p.Kill(); } catch { }
            p.Dispose();
        }

        // 4. Dịch vụ.
        Shell.PowerShell($"try {{ Stop-Service -Name {Paths.ServiceName} -Force }} catch {{}}", 60000);
        var del = Shell.Run("sc.exe", new[] { "delete", Paths.ServiceName });
        log.AppendLine(del.Ok ? "Đã đánh dấu gỡ dịch vụ." : "Gỡ dịch vụ: " + del.Error);

        // 5. File cài + cấu hình (token). Dịch vụ tự gỡ không xoá được exe đang chạy ⇒ hẹn xoá khi khởi động lại.
        try { Directory.Delete(Paths.DataDir, true); } catch { }
        try { Directory.Delete(Paths.InstallDir, true); }
        catch { log.AppendLine("Còn file ở " + Paths.InstallDir + " (Windows sẽ xoá sau khi khởi động lại)."); MarkDeleteOnReboot(Paths.InstallDir); }

        log.AppendLine("Tài khoản của Con vẫn là tài khoản thường; nâng quyền lại nếu cần.");
        return log.ToString();
    }

    private static void MarkDeleteOnReboot(string dir)
    {
        // Dọn phần còn lại ở lần khởi động sau bằng tác vụ dọn dẹp hợp lệ của Windows.
        try
        {
            Shell.PowerShell(
                "$a = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c rmdir /s /q " + Shell.PsQuote(dir).Replace("'", "''") + "'; " +
                "$t = New-ScheduledTaskTrigger -AtStartup; " +
                "Register-ScheduledTask -TaskName 'AiiGrow-Dontay' -Action $a -Trigger $t -RunLevel Highest -User 'SYSTEM' -Force | Out-Null", 60000);
        }
        catch { }
    }
}

/// <summary>Thực thi gỡ máy trên Windows (tách interface để test bộ xử lý lệnh bằng bản giả).</summary>
public interface ISystemUninstaller
{
    string Run();
}

public sealed class SystemUninstaller : ISystemUninstaller
{
    public string Run() => SystemCleanup.Run(deleteService: true);
}

/// <summary>Xử lý lệnh từ máy chủ trong kết quả đồng bộ. Hiện chỉ "go" (gỡ từ xa). → true nếu đã gỡ (dịch vụ nên tự dừng).</summary>
public sealed class CommandProcessor
{
    private readonly ISystemUninstaller _uninstaller;
    public CommandProcessor(ISystemUninstaller uninstaller) { _uninstaller = uninstaller; }

    public async Task<bool> ProcessAsync(SyncResult sync, IHeartbeatApi api, CancellationToken ct = default)
    {
        var go = sync.LenhGo;
        if (go == null) return false;
        _uninstaller.Run();                              // gỡ sạch trước
        try { await api.AckLenhAsync(go.Id, ct); }       // báo «đã gỡ» (token có thể đã bị thu hồi ⇒ bỏ qua lỗi)
        catch (ApiException) { }
        return true;
    }
}
