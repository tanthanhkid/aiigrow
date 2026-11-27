using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#739: tên thiết bị bị cấm, cổng gỡ cần Ba Mẹ, khay tự bật lại.</summary>
public class Windows739Tests
{
    [Theory]
    [InlineData("con")] [InlineData("CON")] [InlineData("Con")] [InlineData("prn")] [InlineData("AUX")] [InlineData("nul")]
    [InlineData("COM1")] [InlineData("com9")] [InlineData("LPT1")] [InlineData("lpt9")] [InlineData("con.be")] [InlineData("nul.txt")] [InlineData("con.")]
    public void TenThietBi_Cam(string ten) => Assert.True(TenThietBi.LaTenCam(ten));

    [Theory]
    [InlineData("treem")] [InlineData("treem2")] [InlineData("be.an")] [InlineData("COM0")] [InlineData("COM10")] [InlineData("LPT0")] [InlineData("console")] [InlineData("concon")] [InlineData("")]
    public void TenThietBi_ChoPhep(string ten) => Assert.False(TenThietBi.LaTenCam(ten));

    [Fact]
    public void CauLoi_TenCam_NoiRoVaGoiYTen()
    {
        var c = CauLoiCai.TenCam("con");
        Assert.Contains("«con»", c);
        Assert.Contains("treem", c);
        Assert.Contains("xoá tài khoản", CauLoiCai.HoSoLoi("x"));
    }

    private static AgentConfig May(string? biMat = "bi-mat-may") => new() { Token = "t", Server = "https://s", DeviceId = "d", MaOfflineBiMat = biMat };
    private static readonly DateTimeOffset Moc = DateTimeOffset.FromUnixTimeMilliseconds(1_700_000_000_000);
    private static bool Khong(string a, string b) => false;

    [Fact]
    public void CongGo_MayChuaGhep_KhongHoi() =>
        Assert.Equal(CongGo.KetQua.Duoc, CongGo.Kiem(new AgentConfig(), null, null, null, Moc, Khong));

    [Fact]
    public void CongGo_KhongNhapGi_ThieuThongTin() =>
        Assert.Equal(CongGo.KetQua.ThieuThongTin, CongGo.Kiem(May(), "", "", "", Moc, Khong));

    [Fact]
    public void CongGo_MaDung_Duoc_MaSai_Sai()
    {
        var cfg = May();
        Assert.Equal(CongGo.KetQua.Duoc, CongGo.Kiem(cfg, MaOffline.Ma("bi-mat-may", Moc), null, null, Moc, Khong));
        Assert.Equal(CongGo.KetQua.Sai, CongGo.Kiem(cfg, "000000", null, null, Moc, Khong));
    }

    [Fact]
    public void CongGo_MaSai_KhongRoiSangMatKhau()
    {
        var goi = 0;
        Assert.Equal(CongGo.KetQua.Sai, CongGo.Kiem(May(), "000000", "ba", "mk", Moc, (a, b) => { goi++; return true; }));
        Assert.Equal(0, goi);
    }

    [Fact]
    public void CongGo_MatKhauQuanTri()
    {
        Assert.Equal(CongGo.KetQua.Duoc, CongGo.Kiem(May(null), null, " ba ", "mk", Moc, (a, b) => a == "ba" && b == "mk"));
        Assert.Equal(CongGo.KetQua.Sai, CongGo.Kiem(May(null), null, "ba", "sai", Moc, (a, b) => b == "mk"));
        Assert.Equal(CongGo.KetQua.Sai, CongGo.Kiem(May(null), null, "ba", "mk", Moc, (a, b) => throw new InvalidOperationException()));
    }

    [Fact]
    public void Khay_ChayThiKhongBat()
    {
        var k = new KhayTuBatLai();
        Assert.False(k.CanBat(Moc, true, true, false));
        Assert.False(k.CanBat(Moc.AddMinutes(5), true, true, false));
    }

    [Fact]
    public void Khay_Chet_ChoRoiBat_ThenCachNhau()
    {
        var k = new KhayTuBatLai();
        Assert.False(k.CanBat(Moc, false, true, false));                       // vừa thấy mất: chờ
        Assert.False(k.CanBat(Moc.AddSeconds(5), false, true, false));
        Assert.True(k.CanBat(Moc.AddSeconds(9), false, true, false));          // quá 8 giây ⇒ bật
        Assert.False(k.CanBat(Moc.AddSeconds(15), false, true, false));        // vừa bật, chưa 30 giây
        Assert.True(k.CanBat(Moc.AddSeconds(40), false, true, false));         // vẫn chết ⇒ bật lại
    }

    [Fact]
    public void Khay_KhongBat_KhiManDangNhapHoacDangGo()
    {
        var k = new KhayTuBatLai();
        Assert.False(k.CanBat(Moc, false, false, false));
        Assert.False(k.CanBat(Moc.AddMinutes(1), false, false, false));
        Assert.False(k.CanBat(Moc.AddMinutes(2), false, true, true));
        Assert.False(k.CanBat(Moc.AddMinutes(3), false, true, false));         // đồng hồ chờ tính lại sau khi gián đoạn
        Assert.True(k.CanBat(Moc.AddMinutes(3).AddSeconds(9), false, true, false));
    }
}
