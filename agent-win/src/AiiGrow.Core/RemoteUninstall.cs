using System.Diagnostics;
using System.Text;
using Microsoft.Win32;

namespace AiiGrow.Core;

// Gỡ sạch AiiGrow: dịch vụ, tác vụ/Run, thông báo đăng nhập, luật AppLocker đã đặt, file + cấu hình (token). Dùng chung cho cả gỡ tay
// (AiiGrow.Setup --uninstall) và gỡ TỪ XA (dịch vụ nhận lệnh "go" khi đồng bộ). Chạy bằng SYSTEM (dịch vụ) hoặc Administrator (bộ gỡ).

public static partial class SystemCleanup
{
    /// <param name="deleteService">false khi chính DỊCH VỤ tự gỡ: không Stop-Service chính mình, tắt khôi phục + hẹn tác vụ tách rời dọn nốt.</param>
    public static KetQuaGo Run(bool deleteService = true) => Run(new WindowsCleanupOps(), tuDichVu: !deleteService);
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

    public void TraQuyenQuanTri()
    {
        var cfg = new ConfigStore().Load();
        var ds = cfg?.DaHaQuyen;
        if (ds == null || ds.Count == 0) return;   // không hạ ai (máy dùng chung) ⇒ không có gì để trả
        var loi = new List<string>();
        foreach (var q in ds)
        {
            if (!AppLockerXml.IsValidSid(q.Sid) || !AppLockerXml.IsValidSid(q.Nhom)) continue;
            var sid = Shell.PsQuote(q.Sid);
            var nhom = Shell.PsQuote(q.Nhom);
            // «đã là thành viên» (tài khoản chưa từng bị hạ / đã trả rồi) không phải lỗi — chỉ ghi lỗi thật.
            var r = Shell.PowerShell(
                $"try {{ Add-LocalGroupMember -SID {nhom} -Member {sid} -ErrorAction Stop }} " +
                "catch { if ($_.CategoryInfo.Category -ne 'ResourceExists' -and $_.Exception.GetType().Name -ne 'MemberExistsException') { throw } }");
            if (!r.Ok) loi.Add(q.Sid + ": " + r.Error);
        }
        if (loi.Count > 0) throw new InvalidOperationException("Chưa trả được quyền quản trị cho: " + string.Join("; ", loi));
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

/// <summary>Thực thi gỡ máy trên Windows (tách interface để test bộ xử lý lệnh bằng bản giả). Ba bước để <see cref="CommandProcessor"/> báo máy chủ ĐÚNG LÚC.</summary>
public interface ISystemUninstaller
{
    /// <summary>CỔNG: gỡ các luật AppLocker của AiiGrow. → true nếu đã sạch luật của mình (hoặc vốn không có).</summary>
    bool GoLuatAppLocker();
    /// <summary>Trả lại quyền quản trị cho tài khoản Con đã bị hạ lúc cài (trước khi xoá cấu hình). → true nếu đã trả hết.</summary>
    bool TraQuyenQuanTri();
    /// <summary>Dọn phần còn lại (tắt khôi phục, hẹn tác vụ tách rời, khay, thông báo, mục Ứng dụng, xoá cấu hình) — dịch vụ tự gỡ.</summary>
    void DonPhanConLai();
}

public sealed class SystemUninstaller : ISystemUninstaller
{
    private readonly ICleanupOps _ops;
    public SystemUninstaller(ICleanupOps? ops = null) { _ops = ops ?? new WindowsCleanupOps(); }
    public bool GoLuatAppLocker() { try { _ops.GoAppLocker(); return true; } catch { return false; } }
    public bool TraQuyenQuanTri() { try { _ops.TraQuyenQuanTri(); return true; } catch { return false; } }
    public void DonPhanConLai() => SystemCleanup.DonPhanConLai(_ops);
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
    /// Thứ tự an toàn:
    ///  1. GỠ LUẬT APPLOCKER (cổng). Hỏng ⇒ báo sự kiện cho máy chủ (Ba Mẹ thấy), CHƯA ack ⇒ lệnh còn chờ, lần đồng bộ sau thử lại; KHÔNG xoá config / dừng dịch vụ.
    ///  2. TRẢ QUYỀN QUẢN TRỊ cho Con. Hỏng ⇒ báo sự kiện (lúc này dòng máy còn tồn tại) nhưng vẫn gỡ tiếp (không để máy kẹt).
    ///  3. ACK (báo xong) bằng token riêng — không theo <paramref name="ct"/> của dịch vụ. Mất mạng / treo ⇒ CHƯA dọn nốt, lần sau lại (bước 1–2 chạy lại được).
    ///     Máy chủ đã bỏ máy (401/403/404) ⇒ vẫn dọn nốt.
    ///  4. DỌN NỐT (xoá config, hẹn tác vụ tách rời dọn dịch vụ + tệp).
    /// </summary>
    public async Task<bool> ProcessAsync(SyncResult sync, IHeartbeatApi api, CancellationToken ct = default)
    {
        var go = sync.LenhGo;
        if (go == null) return false;

        if (!_uninstaller.GoLuatAppLocker())
        {
            await BaoSuKienAsync(api, "go_loi_applocker");
            return false;   // chưa gỡ được luật ⇒ giữ máy, lần sau thử lại
        }
        if (!_uninstaller.TraQuyenQuanTri())
            await BaoSuKienAsync(api, "quyen_admin_loi");   // báo trước khi ack (dòng máy còn tồn tại); vẫn gỡ tiếp

        try
        {
            using var cts = new CancellationTokenSource(_ackTimeout);
            await api.AckLenhAsync(go.Id, cts.Token);
        }
        catch (ApiException e) when (e.IsNetwork) { return false; }
        catch (OperationCanceledException) { return false; }
        catch (ApiException) { /* 401/403/404: máy chủ đã bỏ máy này ⇒ gỡ luôn */ }

        _uninstaller.DonPhanConLai();
        return true;
    }

    private static async Task BaoSuKienAsync(IHeartbeatApi api, string loai)
    {
        try
        {
            var may = Environment.MachineName;
            // Ma cố định theo (loại lỗi + máy): thử lại mỗi vòng cũng chỉ báo MỘT lần (máy chủ bỏ trùng theo `ma`), không làm phiền Ba Mẹ liên tục.
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
            await api.SuKienAsync(new[] { new SuKien { Ma = loai + ":" + may, Loai = loai, ChiTiet = new() { ["may"] = may } } }, cts.Token);
        }
        catch { /* báo được thì tốt; không được cũng không chặn việc gỡ / thử lại */ }
    }
}
