using System.Xml.Linq;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>28/10 — cài AiiGrow trên máy ThinkPad xong thì bấm phím Windows / Start bị đơ. Thành phần shell của Windows 10/11 (Start, Search,
/// Action Center, Widgets, ô nhập TextInputHost) KHÔNG BAO GIỜ được bị AppLocker chặn hay bị đóng, dù nằm ở SystemApps hay Program Files\WindowsApps.</summary>
public class ShellWindowsTests
{
    private const string Sid = "S-1-5-21-1111111111-2222222222-3333333333-1001";
    private const string Win = @"C:\Windows";
    private static readonly string[] Safe = { @"C:\Program Files\AiiGrow" };

    /// <summary>Tiến trình shell ở cả hai chỗ Windows đặt chúng (SystemApps — bản gốc; WindowsApps — bản Store cập nhật trên Win11 mới).</summary>
    public static readonly TheoryData<string> TienTrinhShell = new()
    {
        // Windows 10
        @"C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\StartMenuExperienceHost.exe",
        @"C:\Windows\SystemApps\Microsoft.Windows.Search_cw5n1h2txyewy\SearchApp.exe",
        @"C:\Windows\SystemApps\Microsoft.Windows.Cortana_cw5n1h2txyewy\SearchUI.exe",
        @"C:\Windows\SystemApps\ShellExperienceHost_cw5n1h2txyewy\ShellExperienceHost.exe",
        @"C:\Windows\SystemApps\InputApp_cw5n1h2txyewy\TextInputHost.exe",
        @"C:\Windows\SystemApps\Microsoft.LockApp_cw5n1h2txyewy\LockApp.exe",
        // Windows 11
        @"C:\Windows\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\SearchHost.exe",
        @"C:\Windows\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\TextInputHost.exe",
        @"C:\Windows\SystemApps\MicrosoftWindows.Client.Core_cw5n1h2txyewy\StartMenuExperienceHost.exe",
        @"C:\Program Files\WindowsApps\MicrosoftWindows.Client.CBS_1000.26100.1.0_x64__cw5n1h2txyewy\SearchHost.exe",
        @"C:\Program Files\WindowsApps\MicrosoftWindows.Client.CBS_1000.26100.1.0_x64__cw5n1h2txyewy\TextInputHost.exe",
        @"C:\Program Files\WindowsApps\MicrosoftWindows.Client.CBS_1000.26100.1.0_x64__cw5n1h2txyewy\ShellHost.exe",
        @"C:\Program Files\WindowsApps\MicrosoftWindows.Client.Core_1000.26100.1.0_x64__cw5n1h2txyewy\StartMenuExperienceHost.exe",
        @"C:\Program Files\WindowsApps\Microsoft.Windows.StartMenuExperienceHost_10.0.1.0_neutral__cw5n1h2txyewy\StartMenuExperienceHost.exe",
        @"C:\Program Files\WindowsApps\MicrosoftWindows.Client.WebExperience_524.1.0.0_x64__cw5n1h2txyewy\Dashboard\Widgets.exe",
        @"C:\Program Files\WindowsApps\Microsoft.WidgetsPlatformRuntime_1.0.0.0_x64__8wekyb3d8bbwe\WidgetService.exe",
        // phiên đăng nhập
        @"C:\Windows\explorer.exe",
        @"C:\Windows\System32\sihost.exe",
        @"C:\Windows\System32\ctfmon.exe",
        @"C:\Windows\System32\RuntimeBroker.exe",
    };

    [Theory, MemberData(nameof(TienTrinhShell))]
    public void ProcessGuard_KhongBaoGioDongShell(string path)
    {
        var rong = new HashSet<string>(StringComparer.OrdinalIgnoreCase);   // «chỉ app học» với danh sách RỖNG — chặt nhất
        Assert.False(ProcessGuard.ShouldClose(path, rong, rong, Safe, Win));
    }

    [Theory, MemberData(nameof(TienTrinhShell))]
    public void ProcessEnforcer_KhongDongShell(string path)
    {
        var fake = new FakeProcessControl(new RunningProc(1, path));
        Assert.Empty(ProcessEnforcer.Enforce(fake, 1, Array.Empty<string>(), Safe, winDir: Win));
        Assert.Empty(fake.Closed);
    }

    [Theory, MemberData(nameof(TienTrinhShell))]
    public void ChanAppThat_KhongDongShellDuBaMeChonChan(string path)
    {
        var ten = Path.GetFileName(path.Replace('\\', '/')).ToLowerInvariant();
        var fake = new FakeProcessControl(new RunningProc(1, path));
        var ds = new List<AppBiChan> { new() { Muc = ten, DuongDan = path } };
        Assert.True(ChanAppThat.MienChan(path, Win, Safe));
        Assert.Empty(ChanAppThat.Enforce(fake, 1, ds, dryRun: false, winDir: Win, safeDirs: Safe));
        Assert.Empty(fake.Closed);
    }

    [Fact]
    public void GoiStoreCuaNguoiDungVanQuaPhanLoai()
    {
        // «Microsoft.Windows…» (có dấu chấm sau Microsoft) là app người dùng, KHÁC tiền tố hệ thống «MicrosoftWindows.»
        var rong = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        Assert.True(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.WindowsCalculator_11.2.0.0_x64__8wekyb3d8bbwe\CalculatorApp.exe", rong, rong, Safe, Win));
        Assert.True(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.MinecraftUWP_1.20_x64__8wekyb3d8bbwe\Minecraft.Windows.exe", rong, rong, Safe, Win));
        // «MicrosoftWindows.» giả ngoài Program Files\WindowsApps (Con tự tạo được) ⇒ không phải gói ⇒ vẫn đóng
        Assert.True(ProcessGuard.ShouldClose(@"C:\Users\An\Games\WindowsApps\MicrosoftWindows.Client.CBS_1_x64__x\game.exe", rong, rong, Safe, Win));
    }

    private static XElement Col(string xml, string type)
        => XDocument.Parse(xml).Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == type);

    private static void CoLuatAppxChoMoiGoi(string xml)
    {
        Assert.Equal("Enabled", (string?)Col(xml, "Exe").Attribute("EnforcementMode"));
        var appx = Col(xml, "Appx");
        Assert.Equal("Enabled", (string?)appx.Attribute("EnforcementMode"));
        var r = Assert.Single(appx.Elements("FilePublisherRule"));
        Assert.Equal("Allow", (string?)r.Attribute("Action"));
        Assert.Equal("S-1-1-0", (string?)r.Attribute("UserOrGroupSid"));
        Assert.StartsWith(AppLockerXml.Prefix, (string?)r.Attribute("Name"));
        var c = r.Element("Conditions")!.Element("FilePublisherCondition")!;
        Assert.Equal("*", (string?)c.Attribute("PublisherName"));
        Assert.Equal("*", (string?)c.Attribute("ProductName"));
        Assert.Equal("*", (string?)c.Attribute("BinaryName"));
        Assert.Equal("0.0.0.0", (string?)c.Element("BinaryVersionRange")!.Attribute("LowSection"));
        Assert.Equal("*", (string?)c.Element("BinaryVersionRange")!.Attribute("HighSection"));
    }

    [Fact]
    public void AppLocker_ChiAppHoc_BatExeThiCoLuatAppx()
        => CoLuatAppxChoMoiGoi(AppLockerXml.Build(new AppLockerOptions { ChildSid = Sid, AllowedApps = new[] { "winword.exe" } }));

    [Fact]
    public void AppLocker_DanhSachChan_BatExeThiCoLuatAppx()
        => CoLuatAppxChoMoiGoi(AppLockerXml.BuildBlockList(new AppLockerBlockOptions { ChildSid = Sid, BlockedApps = new[] { new BlockedApp("roblox.exe") } }));

    [Fact]
    public void AppLocker_ChanAppThat_BatExeThiCoLuatAppx()
    {
        var chan = new[] { new LuatChanApp("roblox", @"C:\Games\Roblox\*") };
        CoLuatAppxChoMoiGoi(AppLockerXml.MergeChanApp(null, new[] { Sid }, chan, null));
        CoLuatAppxChoMoiGoi(AppLockerXml.MergeChanApp(null, new[] { Sid }, chan, new AppLockerOptions { AllowedApps = new[] { "winword.exe" } }));
    }

    [Fact]
    public void AppLocker_ApLaiNhieuLan_KhongNhanDoiLuatAppx()
    {
        var o = new AppLockerOptions { ChildSid = Sid };
        CoLuatAppxChoMoiGoi(AppLockerXml.Merge(AppLockerXml.Merge(AppLockerXml.Build(o), o), o));
    }

    [Fact]
    public void AppLocker_MayDaBiChanShell_ApLaiThiTuSua()
    {
        // chính sách bản 0.2.10 để lại trên máy: Exe bật, Appx rỗng ⇒ bản mới áp lại phải thêm luật Appx
        var cu = """
            <AppLockerPolicy Version="1">
              <RuleCollection Type="Appx" EnforcementMode="NotConfigured" />
              <RuleCollection Type="Exe" EnforcementMode="Enabled">
                <FilePathRule Id="00000000-0000-0000-0000-000000000001" Name="AiiGrow: Cho phép mọi người dùng (nền)" Description="" UserOrGroupSid="S-1-1-0" Action="Allow">
                  <Conditions><FilePathCondition Path="*" /></Conditions>
                </FilePathRule>
              </RuleCollection>
            </AppLockerPolicy>
            """;
        CoLuatAppxChoMoiGoi(AppLockerXml.Merge(cu, new AppLockerOptions { ChildSid = Sid }));
    }

    [Fact]
    public void AppLocker_ThieuAppx_NhanDungMayHongVaSuaGiuLuatCu()
    {
        var hong = AppLockerXml.Build(new AppLockerOptions { ChildSid = Sid });
        // bỏ luật Appx ⇒ giống chính sách bản 0.2.10 để lại
        var d = XDocument.Parse(hong);
        d.Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == "Appx").RemoveNodes();
        var cu = d.ToString();
        Assert.True(AppLockerXml.ThieuAppx(cu));
        var sua = AppLockerXml.SuaAppx(cu);
        Assert.False(AppLockerXml.ThieuAppx(sua));
        CoLuatAppxChoMoiGoi(sua);
        Assert.Equal(Col(cu, "Exe").ToString(), Col(sua, "Exe").ToString());   // luật Exe giữ nguyên
        Assert.False(AppLockerXml.ThieuAppx(hong));
        Assert.False(AppLockerXml.ThieuAppx(AppLockerXml.RemoveOurs(hong)));   // Exe tắt ⇒ không chặn shell
        Assert.False(AppLockerXml.ThieuAppx(null));
        Assert.False(AppLockerXml.ThieuAppx("không phải xml"));
    }

    [Fact]
    public void AppLocker_QuanTriCoLuatAppxRieng_KhongDung()
    {
        var cu = """
            <AppLockerPolicy Version="1">
              <RuleCollection Type="Appx" EnforcementMode="Enabled">
                <FilePublisherRule Id="a9e18c21-ff8f-43cf-b9fc-db40eed693ba" Name="(Default Rule) All signed packaged apps" Description="" UserOrGroupSid="S-1-1-0" Action="Allow">
                  <Conditions><FilePublisherCondition PublisherName="*" ProductName="*" BinaryName="*"><BinaryVersionRange LowSection="0.0.0.0" HighSection="*" /></FilePublisherCondition></Conditions>
                </FilePublisherRule>
              </RuleCollection>
            </AppLockerPolicy>
            """;
        var appx = Col(AppLockerXml.Merge(cu, new AppLockerOptions { ChildSid = Sid }), "Appx");
        var r = Assert.Single(appx.Elements("FilePublisherRule"));
        Assert.Equal("(Default Rule) All signed packaged apps", (string?)r.Attribute("Name"));
        Assert.Equal("Enabled", (string?)appx.Attribute("EnforcementMode"));
    }

    [Fact]
    public void AppLocker_ChinhSachExeCuaQuanTri_KhongPhaiViecCuaAiiGrow()
    {
        // trường / công ty cố ý bật Exe + để Appx rỗng, không có luật AiiGrow ⇒ không tự «sửa»
        var cu = """
            <AppLockerPolicy Version="1">
              <RuleCollection Type="Exe" EnforcementMode="Enabled">
                <FilePathRule Id="00000000-0000-0000-0000-0000000000bb" Name="IT: Windows" Description="" UserOrGroupSid="S-1-1-0" Action="Allow">
                  <Conditions><FilePathCondition Path="%WINDIR%\*" /></Conditions>
                </FilePathRule>
              </RuleCollection>
            </AppLockerPolicy>
            """;
        Assert.False(AppLockerXml.ThieuAppx(cu));
    }

    [Fact]
    public void AppLocker_Go_TraAppxVeNotConfigured()
    {
        var go = AppLockerXml.RemoveOurs(AppLockerXml.Build(new AppLockerOptions { ChildSid = Sid }));
        Assert.False(AppLockerXml.ContainsOurs(go));
        Assert.Empty(Col(go, "Appx").Elements());
        Assert.Equal("NotConfigured", (string?)Col(go, "Appx").Attribute("EnforcementMode"));
        Assert.Equal("NotConfigured", (string?)Col(go, "Exe").Attribute("EnforcementMode"));
    }
}
