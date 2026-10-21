using System.Xml.Linq;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class AppLockerXmlTests
{
    private const string Sid = "S-1-5-21-1111111111-2222222222-3333333333-1001";

    private static AppLockerOptions Opts(params string[] apps) => new() { ChildSid = Sid, AllowedApps = apps };

    private static XElement Exe(string xml)
        => XDocument.Parse(xml).Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == "Exe");

    [Fact]
    public void Build_TaoLuatAllowNenVaDenyRiengChoSidCuaCon()
    {
        var exe = Exe(AppLockerXml.Build(Opts("winword.exe")));
        Assert.Equal("Enabled", (string?)exe.Attribute("EnforcementMode"));
        var rules = exe.Elements("FilePathRule").ToList();
        Assert.Equal(2, rules.Count);

        var allow = rules.Single(r => (string?)r.Attribute("Action") == "Allow");
        Assert.Equal("S-1-1-0", (string?)allow.Attribute("UserOrGroupSid"));

        var deny = rules.Single(r => (string?)r.Attribute("Action") == "Deny");
        Assert.Equal(Sid, (string?)deny.Attribute("UserOrGroupSid"));
        var ex = deny.Element("Exceptions")!.Elements("FilePathCondition").Select(e => (string?)e.Attribute("Path")).ToList();
        Assert.Contains(@"%WINDIR%\*", ex);
        Assert.Contains(@"%PROGRAMFILES%\AiiGrow\*", ex);
        Assert.Contains(@"*\winword.exe", ex);
        Assert.DoesNotContain(@"%PROGRAMFILES%\*", ex);
    }

    [Fact]
    public void Build_MoiLuatCoTienToAiiGrow()
    {
        var exe = Exe(AppLockerXml.Build(Opts()));
        Assert.All(exe.Elements("FilePathRule"), r => Assert.StartsWith(AppLockerXml.Prefix, (string?)r.Attribute("Name")));
    }

    [Fact]
    public void Build_CoNamLoaiCollectionDungThuTu()
    {
        var types = XDocument.Parse(AppLockerXml.Build(Opts())).Root!.Elements("RuleCollection")
            .Select(c => (string?)c.Attribute("Type")).ToList();
        Assert.Equal(new[] { "Appx", "Dll", "Exe", "Msi", "Script" }, types);
    }

    [Fact]
    public void Build_AllowProgramFilesThiThemNgoaiLe()
    {
        var o = Opts(); o.AllowProgramFiles = true;
        Assert.Contains(@"%PROGRAMFILES%\*", AppLockerXml.Build(o));
    }

    [Theory]
    [InlineData(@"..\evil.exe")]
    [InlineData(@"C:\x\evil.exe")]
    [InlineData("a\"b.exe")]
    [InlineData("*.exe")]
    [InlineData("notexe.txt")]
    [InlineData("")]
    public void Build_BoQuaTenExeKhongAnToan(string bad)
    {
        var xml = AppLockerXml.Build(Opts(bad, "ok.exe"));
        var ex = Exe(xml).Elements("FilePathRule").Single(r => (string?)r.Attribute("Action") == "Deny")
            .Element("Exceptions")!.Elements("FilePathCondition").Select(e => (string?)e.Attribute("Path")).ToList();
        Assert.Contains(@"*\ok.exe", ex);
        Assert.Equal(AppLockerXml.SystemExceptions.Length + 1, ex.Count);
    }

    [Fact]
    public void Build_TenExeChuanHoaChuThuongVaBoTrung()
    {
        var xml = AppLockerXml.Build(Opts("WINWORD.EXE", "winword.exe"));
        Assert.Equal(1, System.Text.RegularExpressions.Regex.Matches(xml, @"\*\\winword\.exe").Count);
    }

    [Theory]
    [InlineData("")]
    [InlineData("S-1-5")]
    [InlineData("abc")]
    [InlineData("S-1-5-21-1'; Remove-Item *")]
    public void Build_SidSaiThiNemLoi(string sid)
    {
        Assert.Throws<ArgumentException>(() => AppLockerXml.Build(new AppLockerOptions { ChildSid = sid }));
    }

    [Fact]
    public void Merge_GiuLuatCuaNguoiKhacVaKhongNhanDoi()
    {
        const string existing = """
            <AppLockerPolicy Version="1">
              <RuleCollection Type="Exe" EnforcementMode="AuditOnly">
                <FilePathRule Id="11111111-1111-1111-1111-111111111111" Name="Luat cua admin" Description="" UserOrGroupSid="S-1-5-32-544" Action="Allow">
                  <Conditions><FilePathCondition Path="*" /></Conditions>
                </FilePathRule>
              </RuleCollection>
            </AppLockerPolicy>
            """;
        var once = AppLockerXml.Merge(existing, Opts("a.exe"));
        var twice = AppLockerXml.Merge(once, Opts("a.exe", "b.exe"));
        var rules = Exe(twice).Elements("FilePathRule").ToList();
        Assert.Equal(3, rules.Count);
        Assert.Contains(rules, r => (string?)r.Attribute("Name") == "Luat cua admin");
        Assert.Equal("Enabled", (string?)Exe(twice).Attribute("EnforcementMode"));
    }

    [Fact]
    public void RemoveOurs_GoSachLuatAiiGrowVaGiuLuatKhac()
    {
        const string existing = """
            <AppLockerPolicy Version="1">
              <RuleCollection Type="Exe" EnforcementMode="Enabled">
                <FilePathRule Id="11111111-1111-1111-1111-111111111111" Name="Luat cua admin" Description="" UserOrGroupSid="S-1-5-32-544" Action="Allow">
                  <Conditions><FilePathCondition Path="*" /></Conditions>
                </FilePathRule>
              </RuleCollection>
            </AppLockerPolicy>
            """;
        var merged = AppLockerXml.Merge(existing, Opts("a.exe"));
        Assert.True(AppLockerXml.ContainsOurs(merged));
        var removed = AppLockerXml.RemoveOurs(merged);
        Assert.False(AppLockerXml.ContainsOurs(removed));
        Assert.Single(Exe(removed).Elements("FilePathRule"));
        Assert.Equal("Enabled", (string?)Exe(removed).Attribute("EnforcementMode"));
    }

    [Fact]
    public void RemoveOurs_KhongConLuatNaoThiTatEnforce()
    {
        var removed = AppLockerXml.RemoveOurs(AppLockerXml.Build(Opts("a.exe")));
        Assert.Empty(Exe(removed).Elements());
        Assert.Equal("NotConfigured", (string?)Exe(removed).Attribute("EnforcementMode"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("<AppLockerPolicy Version=\"1\" />")]
    public void RemoveOurs_ChiuDuocChinhSachRong(string? existing)
    {
        var xml = AppLockerXml.RemoveOurs(existing);
        Assert.False(AppLockerXml.ContainsOurs(xml));
        Assert.All(XDocument.Parse(xml).Root!.Elements("RuleCollection"),
            c => Assert.Equal("NotConfigured", (string?)c.Attribute("EnforcementMode")));
    }

    [Fact]
    public void Build_IdOnDinhGiuaCacLanSinh()
    {
        Assert.Equal(AppLockerXml.Build(Opts("a.exe")), AppLockerXml.Build(Opts("a.exe")));
    }

    [Fact]
    public void Merge_KhongPhaiAppLockerThiNemLoi()
    {
        Assert.Throws<ArgumentException>(() => AppLockerXml.Merge("<foo/>", Opts()));
    }
}
