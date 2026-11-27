using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

public class DangNhapMacDinhTests
{
    [Fact]
    public void ChonSanTaiKhoanBe()
    {
        var gt = DangNhapMacDinh.GiaTri("be", "S-1-5-21-1-2-3-1002", "MAY1");
        Assert.NotNull(gt);
        Assert.Equal("MAY1\\be", gt!["LastLoggedOnUser"]);
        Assert.Equal("MAY1\\be", gt["LastLoggedOnSAMUser"]);
        Assert.Equal("S-1-5-21-1-2-3-1002", gt["LastLoggedOnUserSID"]);
        Assert.Equal("S-1-5-21-1-2-3-1002", gt["SelectedUserSID"]);
    }

    [Theory]
    [InlineData("", "S-1-5-21-1-2-3-1002")]
    [InlineData("be", "khong-phai-sid")]
    [InlineData("Guest", "S-1-5-21-1-2-3-501")]
    public void KhongGhiKhiThieuHoacTaiKhoanHeThong(string ten, string sid) =>
        Assert.Null(DangNhapMacDinh.GiaTri(ten, sid, "MAY1"));

    [Fact]
    public void ThongBaoDungChu()
    {
        Assert.DoesNotContain("Laptop", DangNhapMacDinh.ChuThongBao, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("thời gian", DangNhapMacDinh.ChuThongBao);
        Assert.Contains("Máy tính", DangNhapMacDinh.ChuThongBao);
    }

    [Fact]
    public void VaoLaiNgaySauKhiNgat_ChoLauHon()
    {
        var now = new DateTimeOffset(2026, 11, 27, 9, 0, 0, TimeSpan.Zero);
        Assert.Equal(10, DangNhapMacDinh.GiayChoNgat(now, null));
        Assert.Equal(60, DangNhapMacDinh.GiayChoNgat(now, now.AddSeconds(-40)));
        Assert.Equal(10, DangNhapMacDinh.GiayChoNgat(now, now.AddMinutes(-30)));
        Assert.Equal(10, DangNhapMacDinh.GiayChoNgat(now, now.AddMinutes(-5)));
    }

    [Fact]
    public void DaKhop_ChiKhiMoiGiaTriDung()
    {
        var gt = DangNhapMacDinh.GiaTri("be", "S-1-5-21-1-2-3-1002", "MAY1")!;
        Assert.True(DangNhapMacDinh.DaKhop(gt, n => gt[n]));
        Assert.False(DangNhapMacDinh.DaKhop(gt, n => n == "SelectedUserSID" ? "S-1-5-21-1-2-3-1001" : gt[n]));
        Assert.False(DangNhapMacDinh.DaKhop(gt, _ => null));
    }
}
