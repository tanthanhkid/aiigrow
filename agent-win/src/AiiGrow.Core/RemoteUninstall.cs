using System.Diagnostics;
using System.Text;
using Microsoft.Win32;

namespace AiiGrow.Core;

// Gỡ sạch AiiGrow: dịch vụ, tác vụ/Run, thông báo đăng nhập, luật AppLocker đã đặt, file + cấu hình (token). Dùng chung cho cả gỡ tay
// (AiiGrow.Setup --uninstall) và gỡ TỪ XA (dịch vụ nhận lệnh "go" khi đồng bộ). Chạy bằng SYSTEM (dịch vụ) hoặc Administrator (bộ gỡ).

public static partial class SystemCleanup
{
    /// <param name="deleteService">false khi chính DỊCH VỤ tự gỡ: không Stop-Service chính mình, tắt khôi phục + hẹn tác vụ tách rời dọn nốt.</param>
    public static string Run(bool deleteService = true) => Run(new WindowsCleanupOps(), tuDichVu: !deleteService);
}

/// <summary>Mục «AiiGrow» trong Cài đặt › Ứng dụng (Apps &amp; Features) — Ba Mẹ gỡ tại máy bằng mật khẩu quản trị (UAC).</summary>
public static class AppsEntry
{
    public const string Key = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow";

    public static void Register(string installDir, string version)
    {
        var setup = Path.Combine(installDir, Paths.SetupExeName);
        using var k = Registry.LocalMachine.CreateSubKey(Key);
        k.SetValue("DisplayName", "AiiGrow");
        k.SetValue("DisplayVersion", version);
        k.SetValue("Publisher", "AiiLab");
        k.SetValue("InstallLocation", installDir);
        k.SetValue("DisplayIcon", Path.Combine(installDir, Paths.TrayExeName));
        k.SetValue("UninstallString", "\"" + setup + "\" --uninstall");
        k.SetValue("QuietUninstallString", "\"" + setup + "\" --uninstall --silent");
        k.SetValue("NoModify", 1, RegistryValueKind.DWord);
        k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }

    public static void Remove()
    {
        try { Registry.LocalMachine.DeleteSubKeyTree(Key, false); } catch (ArgumentException) { }
    }
}

/// <summary>Thao tác gỡ thật trên Windows. Mọi bước chịu được việc đã gỡ rồi.</summary>
public sealed class WindowsCleanupOps : ICleanupOps
{
    private const string RunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    private const string PolicyKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System";

    public void TatKhoiPhucDichVu()
    {
        Shell.Run("sc.exe", new[] { "failure", Paths.ServiceName, "reset=", "0", "actions=", "" }, 30000);
        Shell.Run("sc.exe", new[] { "failureflag", Paths.ServiceName, "0" }, 30000);
        Shell.Run("sc.exe", new[] { "config", Paths.ServiceName, "start=", "disabled" }, 30000);
    }

    public void DungVaXoaDichVu()
    {
        Shell.PowerShell($"try {{ Stop-Service -Name {Paths.ServiceName} -Force }} catch {{}}", 60000);
        foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.ServiceExeName)))
        {
            try { p.Kill(); p.WaitForExit(10000); } catch { }
            p.Dispose();
        }
        Shell.Run("sc.exe", new[] { "delete", Paths.ServiceName }, 30000);
    }

    public void HenDonTachRoi()
    {
        var script = SystemCleanup.KichBanDonTachRoi(Paths.ServiceName, Paths.InstallDir, Paths.DataDir, AppsEntry.Key);
        var b64 = Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
        var arg = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand " + b64;
        var tn = Shell.PsQuote(SystemCleanup.TenTacVuDon);
        // Tác vụ của Task Scheduler (SYSTEM) — không phải tiến trình con của dịch vụ ⇒ dịch vụ thoát không kéo nó theo.
        var r = Shell.PowerShell(
            $"$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument {Shell.PsQuote(arg)}; " +
            "$t1 = New-ScheduledTaskTrigger -AtStartup; $t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(20); " +
            "$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30); " +
            $"Register-ScheduledTask -TaskName {tn} -Action $a -Trigger @($t1,$t2) -Settings $s -User 'SYSTEM' -RunLevel Highest -Force | Out-Null; " +
            $"Start-ScheduledTask -TaskName {tn}", 60000);
        if (!r.Ok) throw new InvalidOperationException(r.Error);
    }

    public void GoAppLocker()
    {
        var tmp = Path.Combine(Path.GetTempPath(), "aii-applocker-" + Guid.NewGuid().ToString("N") + ".xml");
        try
        {
            var cur = Shell.PowerShell("Get-AppLockerPolicy -Local -Xml | Out-File -Encoding utf8 -FilePath " + Shell.PsQuote(tmp));
            if (!cur.Ok || !File.Exists(tmp)) throw new InvalidOperationException("không đọc được AppLocker: " + cur.Error);
            var xml = File.ReadAllText(tmp);
            if (!AppLockerXml.ContainsOurs(xml)) return;
            File.WriteAllText(tmp, AppLockerXml.RemoveOurs(xml), new UTF8Encoding(false));
            var s = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(tmp));
            if (!s.Ok) throw new InvalidOperationException(s.Error);
        }
        finally { try { File.Delete(tmp); } catch { } }
    }

    public void GoKhay()
    {
        using (var run = Registry.LocalMachine.OpenSubKey(RunKey, true)) run?.DeleteValue(Paths.TrayRunValue, false);
        foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)))
        {
            try { p.Kill(); } catch { }
            p.Dispose();
        }
    }

    public void GoThongBaoDangNhap()
    {
        using var pol = Registry.LocalMachine.OpenSubKey(PolicyKey, true);
        pol?.DeleteValue("LegalNoticeCaption", false);
        pol?.DeleteValue("LegalNoticeText", false);
    }

    public void GoMucUngDung() => AppsEntry.Remove();

    public void XoaCauHinh()
    {
        new ConfigStore().Delete();
        if (File.Exists(Paths.ConfigFile)) throw new IOException("còn " + Paths.ConfigFile);
    }

    public bool XoaThuMuc()
    {
        try { if (Directory.Exists(Paths.DataDir)) Directory.Delete(Paths.DataDir, true); } catch { }
        try { if (Directory.Exists(Paths.InstallDir)) Directory.Delete(Paths.InstallDir, true); } catch { }
        return !Directory.Exists(Paths.DataDir) && !Directory.Exists(Paths.InstallDir);
    }
}

/// <summary>Thực thi gỡ máy trên Windows (tách interface để test bộ xử lý lệnh bằng bản giả).</summary>
public interface ISystemUninstaller
{
    string Run();
}

public sealed class SystemUninstaller : ISystemUninstaller
{
    /// <summary>Gọi từ TRONG dịch vụ (lệnh «go»): không tự Stop-Service, tắt khôi phục + hẹn tác vụ tách rời dọn nốt sau khi dịch vụ thoát.</summary>
    public string Run() => SystemCleanup.Run(new WindowsCleanupOps(), tuDichVu: true);
}

/// <summary>Xử lý lệnh từ máy chủ trong kết quả đồng bộ. Hiện chỉ "go" (gỡ từ xa). → true nếu đã gỡ (dịch vụ nên tự dừng).</summary>
public sealed class CommandProcessor
{
    private readonly ISystemUninstaller _uninstaller;
    private readonly TimeSpan _ackTimeout;
    public CommandProcessor(ISystemUninstaller uninstaller, TimeSpan? ackTimeout = null)
    {
        _uninstaller = uninstaller;
        _ackTimeout = ackTimeout ?? TimeSpan.FromSeconds(30);
    }

    /// <summary>
    /// Thứ tự: BÁO XONG trước (máy chủ xoá máy khỏi gia đình) ⇒ rồi mới gỡ. Báo bằng token riêng (không theo <paramref name="ct"/> của dịch vụ):
    /// dịch vụ đang dừng cũng không huỷ lời báo. Mất mạng / máy chủ lỗi ⇒ CHƯA gỡ, lần đồng bộ sau nhận lại lệnh (máy chủ vẫn ép giám sát
    /// trong lúc chờ nên máy Con không bị chặn). Máy chủ đã không nhận token (401/403/404) ⇒ máy đã rời gia đình ⇒ vẫn gỡ.
    /// </summary>
    public async Task<bool> ProcessAsync(SyncResult sync, IHeartbeatApi api, CancellationToken ct = default)
    {
        var go = sync.LenhGo;
        if (go == null) return false;
        try
        {
            using var cts = new CancellationTokenSource(_ackTimeout);
            await api.AckLenhAsync(go.Id, cts.Token);
        }
        catch (ApiException e) when (e.IsNetwork) { return false; }
        catch (OperationCanceledException) { return false; }
        catch (ApiException) { /* 401/403/404: máy chủ đã bỏ máy này ⇒ gỡ luôn */ }
        _uninstaller.Run();
        return true;
    }
}
