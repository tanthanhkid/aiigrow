using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class UsageTrackerTests
{
    private static readonly DateTimeOffset T = new(2026, 10, 20, 10, 0, 0, TimeSpan.FromHours(7));

    [Fact]
    public void Drain_ChiXuatPhutNguyenVaGiuPhanLe()
    {
        var u = new UsageTracker();
        u.Add(T, "word.exe", "Word", 90);
        var first = u.Drain();
        Assert.Equal(new UsageEntry("2026-10-20", "word.exe", "Word", 1), Assert.Single(first));
        u.Add(T, "word.exe", "Word", 30);
        Assert.Equal(1, Assert.Single(u.Drain()).Minutes);
        Assert.Empty(u.Drain());
    }

    [Fact]
    public void Restore_KhongMatPhutKhiSyncLoi()
    {
        var u = new UsageTracker();
        u.Add(T, "a.exe", "A", 180);
        var d = u.Drain();
        u.Restore(d);
        Assert.Equal(3, Assert.Single(u.Drain()).Minutes);
    }

    [Fact]
    public void Add_TachTheoAppVaNgay()
    {
        var u = new UsageTracker();
        u.Add(T, "a.exe", "A", 60);
        u.Add(T, "b.exe", "B", 120);
        u.Add(T.AddDays(1), "a.exe", "A", 60);
        Assert.Equal(3, u.Drain().Count);
    }

    [Fact]
    public void Entry_JsonDungTenTruongPlan()
    {
        var json = JsonSerializer.Serialize(new UsageEntry("2026-10-20", "a.exe", "A", 2), Json.Options);
        Assert.Contains("\"appId\":\"a.exe\"", json);
        Assert.Contains("\"minutes\":2", json);
    }
}

public class ProcessGuardTests
{
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase) { "winword.exe" };
    private static readonly string[] Safe = { @"C:\Program Files\AiiGrow" };
    private const string Win = @"C:\Windows";
    private static readonly HashSet<string> NoDirs = new(StringComparer.OrdinalIgnoreCase);

    [Theory]
    [InlineData(@"C:\Users\An\AppData\Local\Roblox\RobloxPlayer.exe", true)]
    [InlineData(@"C:\Program Files\Microsoft Office\WINWORD.EXE", false)]
    [InlineData(@"C:\Windows\System32\notepad.exe", true)]            // BUG-008: notepad / cmd / powershell / calc qua phân loại
    [InlineData(@"C:\Windows\System32\cmd.exe", true)]
    [InlineData(@"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", true)]
    [InlineData(@"C:\Windows\System32\calc.exe", true)]
    [InlineData(@"C:\Windows\explorer.exe", false)]                      // tiến trình hệ thống cần cho phiên
    [InlineData(@"C:\Windows\System32\sihost.exe", false)]
    [InlineData(@"C:\Windows\System32\RuntimeBroker.exe", false)]
    [InlineData(@"C:\Windows\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\TextInputHost.exe", false)]
    [InlineData(@"C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\StartMenuExperienceHost.exe", false)]
    [InlineData(@"C:\Users\An\Downloads\explorer.exe", true)]          // đổi tên game thành explorer.exe ngoài thư mục Windows ⇒ vẫn đóng
    [InlineData(@"C:\Program Files\AiiGrow\AiiGrow.Tray.exe", false)]
    [InlineData(@"C:\Program Files\WindowsApps\Microsoft.WindowsCalculator_11.2.0.0_x64__8wekyb3d8bbwe\CalculatorApp.exe", true)]   // BUG-009
    [InlineData(@"C:\Program Files\WindowsApps\Microsoft.WindowsTerminal_1.0.0.0_x64__8wekyb3d8bbwe\WindowsTerminal.exe", true)]
    [InlineData(@"C:\Program Files (x86)\Microsoft\EdgeWebView\Application\120.0\msedgewebview2.exe", false)]   // BUG-007
    [InlineData(@"C:\Users\An\Downloads\msedgewebview2.exe", true)]
    [InlineData(@"C:\WindowsEvil\x.exe", true)]
    // review #75: thành phần Windows chạy nền nằm trực tiếp trong Windows/System32/SysWOW64 + DriverStore ⇒ giữ (in ấn, hộp chọn tệp, trợ năng…)
    [InlineData(@"C:\Windows\splwow64.exe", false)]
    [InlineData(@"C:\Windows\System32\rundll32.exe", false)]
    [InlineData(@"C:\Windows\SysWOW64\rundll32.exe", false)]
    [InlineData(@"C:\Windows\System32\CredentialUIBroker.exe", false)]
    [InlineData(@"C:\Windows\System32\PickerHost.exe", false)]
    [InlineData(@"C:\Windows\System32\osk.exe", false)]
    [InlineData(@"C:\Windows\System32\Narrator.exe", false)]
    [InlineData(@"C:\Windows\System32\DriverStore\FileRepository\realtek.inf_amd64_1\RtkAudUService64.exe", false)]
    [InlineData(@"C:\Program Files\WindowsApps\Microsoft.YourPhone_1.0.0.0_x64__8wekyb3d8bbwe\PhoneExperienceHost.exe", false)]
    // …nhưng app người dùng trong System32 và thư mục con Con ghi được thì vẫn qua phân loại
    [InlineData(@"C:\Windows\regedit.exe", true)]
    [InlineData(@"C:\Windows\SysWOW64\cmd.exe", true)]
    [InlineData(@"C:\Windows\Temp\game.exe", true)]
    [InlineData(@"C:\Windows\System32\Tasks\game.exe", true)]
    [InlineData(@"C:\Windows\System32\spool\drivers\color\game.exe", true)]
    [InlineData(@"C:\Users\An\AppData\Local\Microsoft\WindowsApps\Microsoft.YourPhone_1\game.exe", true)]
    [InlineData(@"C:\Windows\System32\oobe\UserOOBEBroker.exe", false)]
    [InlineData(@"C:\Windows\System32\Microsoft-Edge-WebView\msedgewebview2.exe", false)]
    [InlineData(@"C:\Windows\System32\taskmgr.exe", true)]               // đóng được khay ⇒ phải qua phân loại
    [InlineData(@"C:\Windows\PrintDialog\PrintDialog.exe", false)]
    [InlineData(@"C:\Windows\System32\spool\drivers\x64\3\hpui.exe", false)]
    [InlineData(@"C:\Windows\Tasks\svchost.exe", true)]                  // tên hệ thống nhưng ở thư mục Con ghi được ⇒ không miễn
    [InlineData(@"C:\Windows\Temp\explorer.exe", true)]
    [InlineData(@"C:\Users\An\AppData\Local\Microsoft\EdgeWebView\x\msedgewebview2.exe", true)]
    [InlineData(@"C:\Program Files\Microsoft\EdgeWebView\Application\120.0\msedgewebview2.exe", false)]
    [InlineData(@"C:\Windows\ImmersiveControlPanel\SystemSettings.exe", false)]
    [InlineData(@"C:\Windows\System32\InputMethod\CHS\ChsIME.exe", false)]
    [InlineData(@"C:\Windows\System32\Speech_OneCore\Common\SpeechRuntime.exe", false)]
    [InlineData(@"C:\Windows\System32\resmon.exe", true)]
    [InlineData(@"C:\Windows\System32\tskill.exe", true)]
    [InlineData(@"C:\Windows\System32\wbem\WMIC.exe", true)]
    [InlineData(@"C:\Windows\System32\msiexec.exe", true)]
    [InlineData(@"C:\Program Files\WindowsApps\Microsoft.WindowsAppRuntime.Singleton_1.5.0.0_x64__8wekyb3d8bbwe\PushNotificationsLongRunningTask.exe", false)]
    [InlineData(@"C:\Program Files\WindowsApps\Microsoft.ScreenSketch_11.2.0.0_x64__8wekyb3d8bbwe\SnippingTool\SnippingTool.exe", false)]
    [InlineData(@"C:\Program Files\WindowsApps\Microsoft.WidgetsPlatformRuntime_1.0.0.0_x64__8wekyb3d8bbwe\WidgetService.exe", false)]
    public void ShouldClose(string path, bool expected)
        => Assert.Equal(expected, ProcessGuard.ShouldClose(path, Allowed, NoDirs, Safe, Win));

    [Fact]
    public void ShouldClose_TenCuaWindowsDuocPhep_ChiNhanBanThat()
    {
        // máy chủ mặc định cho notepad / taskmgr / explorer (ALLOWLIST_HE_THONG) — game đổi tên thành notepad.exe ngoài Windows vẫn bị đóng
        var al = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "notepad.exe", "taskmgr.exe", "explorer.exe" };
        Assert.False(ProcessGuard.ShouldClose(@"C:\Windows\System32\notepad.exe", al, NoDirs, Safe, Win));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.WindowsNotepad_11.0.0.0_x64__8wekyb3d8bbwe\Notepad\Notepad.exe", al, NoDirs, Safe, Win));
        Assert.True(ProcessGuard.ShouldClose(@"C:\Users\An\Downloads\notepad.exe", al, NoDirs, Safe, Win));
        Assert.True(ProcessGuard.ShouldClose(@"C:\Windows\Temp\taskmgr.exe", al, NoDirs, Safe, Win));
        // Ba Mẹ cho phép thì bản thật ở thư mục con / Program Files vẫn chạy được
        var al2 = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "powershell.exe", "wordpad.exe", "pwsh.exe" };
        Assert.False(ProcessGuard.ShouldClose(@"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", al2, NoDirs, Safe, Win));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\Windows NT\Accessories\wordpad.exe", al2, NoDirs, Safe, Win));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\PowerShell\7\pwsh.exe", al2, NoDirs, Safe, Win));
        Assert.True(ProcessGuard.ShouldClose(@"C:\Users\An\pwsh.exe", al2, NoDirs, Safe, Win));
        Assert.True(ProcessGuard.ShouldClose(@"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", Allowed, NoDirs, Safe, Win));   // không cho thì vẫn đóng
    }

    [Fact]
    public void ShouldClose_AppStoreDuocPhepTheoTenGoiHoacTenExe()
    {
        const string calc = @"C:\Program Files\WindowsApps\Microsoft.WindowsCalculator_11.2.0.0_x64__8wekyb3d8bbwe\CalculatorApp.exe";
        Assert.False(ProcessGuard.ShouldClose(calc, new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "microsoft.windowscalculator" }, NoDirs, Safe, Win));
        Assert.False(ProcessGuard.ShouldClose(calc, new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "calculatorapp.exe" }, NoDirs, Safe, Win));
        Assert.Equal("microsoft.windowscalculator", ProcessGuard.TenGoiStore(calc));
        Assert.Null(ProcessGuard.TenGoiStore(@"C:\Windows\System32\notepad.exe"));
        // «WindowsApps» ngoài Program Files (Con tự tạo được) không phải gói Store ⇒ không mượn được tên gói được phép
        var gia = @"C:\Users\An\Games\WindowsApps\Microsoft.WindowsCalculator_1_x64__8wekyb3d8bbwe\Roblox.exe";
        Assert.Null(ProcessGuard.TenGoiStore(gia));
        Assert.Null(ProcessGuard.TenGoiStore(@"C:\WindowsApps\Microsoft.WindowsCalculator_1\Roblox.exe"));
        Assert.True(ProcessGuard.ShouldClose(gia, new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "microsoft.windowscalculator" }, NoDirs, Safe, Win));
    }

    [Fact]
    public void DefaultSafeDirs_KhongMienThuMucWindowsVaWindowsApps()
    {
        var ds = ProcessGuard.DefaultSafeDirs();
        Assert.DoesNotContain(ds, d => d.EndsWith("WindowsApps", StringComparison.OrdinalIgnoreCase) || d.Contains("WindowsApps", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(ds, d => string.Equals(d, Environment.GetFolderPath(Environment.SpecialFolder.Windows), StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void ShouldClose_HelperCungThuMucVoiAppDuocPhepThiGiu()
    {
        var dirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { @"C:\Program Files\Microsoft Office" };
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\Microsoft Office\OfficeClickToRun.exe", Allowed, dirs, Safe));
    }
}

public class TrayViewTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Describe_DemNguocTheoThoiGianDaTroi()
    {
        var s = new TrayState { MinutesLeft = 25 };
        var d = TrayView.Describe(s, Now, Now.AddSeconds(30));
        Assert.Equal("24:30", d.Big);
        Assert.Equal(1470, d.RemainingSec!.Value, 3);
    }

    [Fact]
    public void Describe_ThemGioUuTienDemNguocGrant()
    {
        var s = new TrayState { MinutesLeft = 0, GrantEndsAt = Now.AddMinutes(30) };
        var d = TrayView.Describe(s, Now, Now);
        Assert.Equal("30:00", d.Big);
    }

    [Fact]
    public void Describe_KhongGioiHan()
    {
        var d = TrayView.Describe(new TrayState(), Now, Now);
        Assert.Null(d.RemainingSec);
    }

    [Theory]
    [InlineData(59, "0:59")]
    [InlineData(3600, "1:00:00")]
    [InlineData(-3, "0:00")]
    public void FormatClock(double sec, string expected) => Assert.Equal(expected, TrayView.FormatClock(sec));

    [Fact]
    public void Tooltip_NoiRoAiiGrowDangBat()
        => Assert.StartsWith("AiiGrow đang bật", TrayView.Tooltip(new TrayState { MinutesLeft = 25 }, Now, Now));

    [Fact]
    public void FriendlyAppName()
    {
        Assert.Equal("Roblox", TrayView.FriendlyAppName("roblox.exe", null));
        Assert.Equal("Trò chơi", TrayView.FriendlyAppName("x.exe", "Trò chơi"));
    }
}

public class ConfigStoreTests
{
    [Fact]
    public void LuuVaDocLai_FileKhongPhaiVanBanThuong()
    {
        if (!OperatingSystem.IsWindows()) return; // DPAPI chỉ có trên Windows (CI windows-latest chạy thật)
        var path = Path.Combine(Path.GetTempPath(), "aiic-test-" + Guid.NewGuid().ToString("N"), "config.json");
        try
        {
            var store = new ConfigStore(path);
            store.Save(new AgentConfig { Server = "https://x.test", Token = "SECRET-TOKEN-123", ChildUser = "an", LastPolicyJson = "{}" });
            Assert.DoesNotContain("SECRET-TOKEN-123", File.ReadAllText(path));
            var back = store.Load();
            Assert.Equal("SECRET-TOKEN-123", back!.Token);
            Assert.True(back.Paired);
        }
        finally
        {
            try { Directory.Delete(Path.GetDirectoryName(path)!, true); } catch { }
        }
    }

    [Fact]
    public void FileHong_ThiTraNull()
    {
        if (!OperatingSystem.IsWindows()) return;
        var dir = Path.Combine(Path.GetTempPath(), "aiic-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "config.json");
        File.WriteAllText(path, "khong phai du lieu ma hoa");
        try { Assert.Null(new ConfigStore(path).Load()); }
        finally { Directory.Delete(dir, true); }
    }

    [Fact]
    public void KhongCoFile_ThiTraNull() => Assert.Null(new ConfigStore(Path.Combine(Path.GetTempPath(), "khong-co", "c.json")).Load());
}

public class PlayCheckJsonTests
{
    [Fact]
    public void PhutToiDaLe_DocDuoc_LamTronXuong()
    {
        // máy chủ cộng phút thưởng (real) ⇒ phutToiDa có thể lẻ; int? thì JSON lỗi và «Dùng điểm để chơi» hỏng (review #75)
        var x = System.Text.Json.JsonSerializer.Deserialize<PlayCheck>("""{"duoc":true,"phutToiDa":22.5}""", Json.Options)!;
        Assert.Equal(22.5, x.PhutToiDa);
        Assert.Equal(22, x.PhutHienThi);
        Assert.Null(System.Text.Json.JsonSerializer.Deserialize<PlayCheck>("""{"duoc":false}""", Json.Options)!.PhutHienThi);
    }
}
