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
    public void TaiKhoanCam_ChiLayTaiKhoanTenCam_854()
    {
        var ds = new[] { new LocalAccount("con", "S-1-5-21-1-1-1-1001", false), new LocalAccount("treem", "S-1-5-21-1-1-1-1002", false), new LocalAccount("CON", "S-1-5-21-1-1-1-1003", false) };
        Assert.Equal(new[] { "con" }, TenThietBi.TaiKhoanCam(ds));
        Assert.Empty(TenThietBi.TaiKhoanCam(ds.Skip(1).Take(1)));
        Assert.Contains("«con»", CauLoiCai.TaiKhoanTenCam(new[] { "con" }));
    }

    [Fact]
    public void TaiKhoanCam_BoQuaQuanTriVaTaiKhoanHeThong_854()
    {
        var ds = new[]
        {
            new LocalAccount("con", "S-1-5-21-1-1-1-1001", false),
            new LocalAccount("aux", "S-1-5-21-1-1-1-1004", true),     // tài khoản Ba Mẹ (quản trị) — không phải tài khoản của bé
            new LocalAccount("nul", "S-1-5-21-1-1-1-501", false),     // RID 500–504: tài khoản hệ thống
        };
        Assert.Equal(new[] { "con" }, TenThietBi.TaiKhoanCam(ds));
        // chỉ xét tài khoản AiiGrow đang áp cho bé
        Assert.Empty(TenThietBi.TaiKhoanCam(ds, new[] { "S-1-5-21-1-1-1-1002" }));
        Assert.Equal(new[] { "con" }, TenThietBi.TaiKhoanCam(ds, new[] { "s-1-5-21-1-1-1-1001" }));
    }

    [Fact]
    public void GhiChuTenCam_ChoBaMe_854()
    {
        var ds = new[] { new LocalAccount("con", "S-1-5-21-1-1-1-1001", false), new LocalAccount("treem", "S-1-5-21-1-1-1-1002", false) };
        var g = TenThietBi.GhiChuTenCam(ds, new[] { "S-1-5-21-1-1-1-1001" });
        Assert.NotNull(g);
        Assert.Contains("«con»", g);
        Assert.Contains("Sửa cài đặt", g);
        Assert.True(g!.Length <= 240);   // máy chủ cắt ghi chú ở 240 ký tự
        Assert.Null(TenThietBi.GhiChuTenCam(ds, new[] { "S-1-5-21-1-1-1-1002" }));
        Assert.Null(TenThietBi.GhiChuTenCam(null, new[] { "S-1-5-21-1-1-1-1001" }));
        Assert.Null(TenThietBi.GhiChuTenCam(ds, null));
    }

    [Fact]
    public void LoiNhacTenCam_NoiRoCapNhatKhongSuaVaLuatDiTheo_854()
    {
        var c = CauLoiCai.TaiKhoanTenCam(new[] { "con" });
        Assert.Contains("không sửa được", c);
        Assert.Contains("Sửa cài đặt", c);
        Assert.Contains("đi theo sang tài khoản mới", c);
    }

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
    public void CongGo_MaSai_NhungMatKhauDung_Duoc()
    {
        Assert.Equal(CongGo.KetQua.Duoc, CongGo.Kiem(May(), "000000", "ba", "mk", Moc, (a, b) => true));
        Assert.Equal(CongGo.KetQua.Sai, CongGo.Kiem(May(), "000000", "ba", "mk", Moc, (a, b) => false));
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
        Assert.False(k.CanBat(Moc.AddSeconds(15), false, true, false));
        Assert.True(k.CanBat(Moc.AddSeconds(21), false, true, false));         // quá 20 giây ⇒ bật
        Assert.False(k.CanBat(Moc.AddSeconds(35), false, true, false));        // vừa bật, chưa 30 giây
        Assert.True(k.CanBat(Moc.AddSeconds(55), false, true, false));         // vẫn chết ⇒ bật lại
    }

    [Fact]
    public void Khay_KhongBat_KhiManDangNhapHoacDangGo()
    {
        var k = new KhayTuBatLai();
        Assert.False(k.CanBat(Moc, false, false, false));
        Assert.False(k.CanBat(Moc.AddMinutes(1), false, false, false));
        Assert.False(k.CanBat(Moc.AddMinutes(2), false, true, true));
        Assert.False(k.CanBat(Moc.AddMinutes(3), false, true, false));         // đồng hồ chờ tính lại sau khi gián đoạn
        Assert.True(k.CanBat(Moc.AddMinutes(3).AddSeconds(21), false, true, false));
    }
}
