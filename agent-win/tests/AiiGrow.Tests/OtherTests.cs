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
    private static readonly string[] Safe = { @"C:\Windows", @"C:\Program Files\AiiGrow" };
    private static readonly HashSet<string> NoDirs = new(StringComparer.OrdinalIgnoreCase);

    [Theory]
    [InlineData(@"C:\Users\An\AppData\Local\Roblox\RobloxPlayer.exe", true)]
    [InlineData(@"C:\Program Files\Microsoft Office\WINWORD.EXE", false)]
    [InlineData(@"C:\Windows\System32\notepad.exe", false)]
    [InlineData(@"C:\Program Files\AiiGrow\AiiGrow.Tray.exe", false)]
    [InlineData(@"C:\WindowsEvil\x.exe", true)]
    public void ShouldClose(string path, bool expected)
        => Assert.Equal(expected, ProcessGuard.ShouldClose(path, Allowed, NoDirs, Safe));

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
