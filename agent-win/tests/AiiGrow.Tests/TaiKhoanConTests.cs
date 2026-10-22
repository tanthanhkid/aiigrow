using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

public class TaiKhoanConTests
{
    private static readonly List<LocalAccount> May = new()
    {
        new("ba", "S-1-5-21-1-2-3-1001", true),
        new("be", "S-1-5-21-1-2-3-1002", false),
        new("em", "S-1-5-21-1-2-3-1003", false),
        new("loi", "khong-phai-sid", false),
    };

    [Fact]
    public void CoTaiKhoanCon_ChiTaiKhoanDo() =>
        Assert.Equal(new[] { "S-1-5-21-1-2-3-1002" }, TaiKhoanCon.ChonSids("S-1-5-21-1-2-3-1002", May));

    [Fact]
    public void CaiMotCham_MoiTaiKhoanKhongQuanTri() =>
        Assert.Equal(new[] { "S-1-5-21-1-2-3-1002", "S-1-5-21-1-2-3-1003" }, TaiKhoanCon.ChonSids("", May));

    [Fact]
    public void BoTaiKhoanHeThong()
    {
        var ds = new List<LocalAccount> { new("Guest", "S-1-5-21-1-2-3-501", false), new("WDAGUtilityAccount", "S-1-5-21-1-2-3-504", false),
            new("defaultuser0", "S-1-5-21-1-2-3-1000", false), new("be", "S-1-5-21-1-2-3-1500", false) };
        Assert.Equal(new[] { "S-1-5-21-1-2-3-1500" }, TaiKhoanCon.ChonSids("", ds));
        Assert.Equal("", TaiKhoanCon.ChonUser("", "Guest", ds));
    }

    [Fact]
    public void ChiCoQuanTri_KhongSid() => Assert.Empty(TaiKhoanCon.ChonSids("", May.Take(1)));

    [Theory]
    [InlineData("be", "ba", "be")]     // đã gắn tài khoản ⇒ giữ
    [InlineData("", "em", "em")]       // một chạm: phiên trước màn hình là tài khoản thường
    [InlineData("", "ba", "")]         // phiên quản trị (Ba Mẹ) không bị coi là Con
    [InlineData("", "", "")]
    [InlineData("", "la", "")]         // tài khoản lạ (miền) ⇒ không
    public void ChonUser(string cfg, string console, string mongDoi) => Assert.Equal(mongDoi, TaiKhoanCon.ChonUser(cfg, console, May));

    [Fact]
    public void DocJson_MotPhanTuVaMang()
    {
        Assert.Single(TaiKhoanCon.DocJson("""{"Name":"be","Sid":"S-1-5-21-1","IsAdmin":false}"""));
        Assert.Equal(2, TaiKhoanCon.DocJson("""[{"Name":"a","Sid":"S-1-5-21-1","IsAdmin":true},{"Name":"b","Sid":"S-1-5-21-2","IsAdmin":false}]""").Count);
        Assert.Empty(TaiKhoanCon.DocJson(""));
    }

    [Fact]
    public void AppLocker_NhieuSid_MoiSidMotLuatChan()
    {
        var xml = AppLockerXml.Merge(null, new AppLockerOptions { ChildSids = new[] { "S-1-5-21-1-2-3-1002", "S-1-5-21-1-2-3-1003" }, AllowedApps = new[] { "scratch.exe" } });
        Assert.Contains("UserOrGroupSid=\"S-1-5-21-1-2-3-1002\" Action=\"Deny\"", xml);
        Assert.Contains("UserOrGroupSid=\"S-1-5-21-1-2-3-1003\" Action=\"Deny\"", xml);
        Assert.DoesNotContain("S-1-5-21-1-2-3-1001", xml);
        Assert.Throws<ArgumentException>(() => AppLockerXml.Merge(null, new AppLockerOptions { ChildSids = new[] { "x" } }));
    }
}
