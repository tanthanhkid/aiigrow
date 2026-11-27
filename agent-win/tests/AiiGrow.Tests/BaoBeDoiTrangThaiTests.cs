using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#822: khay chỉ báo bé khi trạng thái ĐỔI (khoá / hết giờ chơi / Ba Mẹ thêm web) — lớp thuần, không đồng hồ.</summary>
public class BaoBeDoiTrangThaiTests
{
    private static TrangThaiBaoBe T(bool khoa = false, string? lyDo = null, string? hetGio = null, string? gio = null, string[]? chan = null, string[]? cho = null)
        => new(khoa, lyDo, hetGio, gio, chan ?? Array.Empty<string>(), cho ?? Array.Empty<string>());

    [Fact]
    public void LuotDau_KhongBao_ChiLayMoc()
        => Assert.Empty(BaoBeDoiTrangThai.Xet(null, T(khoa: true, lyDo: LockReasons.Khoa, chan: new[] { "a.com" })));

    [Fact]
    public void ChuyenSangKhoa_BaoMotLan_KhongBaoLap()
    {
        var truoc = T();
        var khoa = T(khoa: true, lyDo: LockReasons.Khoa);
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(truoc, khoa));
        Assert.Equal("Ba Mẹ vừa khoá máy", b.Tieu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(khoa, khoa));          // đồng bộ lại, vẫn khoá
        Assert.Empty(BaoBeDoiTrangThai.Xet(khoa, T()));           // mở khoá: không báo
    }

    [Theory]
    [InlineData(LockReasons.ChonTen)]
    [InlineData(LockReasons.CanMang)]
    [InlineData(LockReasons.HetDiem)]
    [InlineData(null)]
    public void KhoaKhongPhaiBeBiKhoa_KhongBao(string? lyDo)
        => Assert.Empty(BaoBeDoiTrangThai.Xet(T(), T(khoa: true, lyDo: lyDo)));

    [Fact]
    public void HetGioChoi_BaoKhiVaoGioiHan_KhongBaoLap()
    {
        var het = T(hetGio: GioiHanMay.HetGioNgay);
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), het));
        Assert.Equal("Hôm nay chơi đủ giờ rồi", b.Tieu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(het, het));
        var nghi = Assert.Single(BaoBeDoiTrangThai.Xet(T(), T(hetGio: GioiHanMay.DangNghi, gio: "16:00")));
        Assert.Equal("Con chơi tiếp lúc 16:00.", nghi.Phu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(het, T()));            // hết giới hạn: không báo
    }

    [Fact]
    public void DangKhoa_KhongBaoHetGio()
        => Assert.DoesNotContain(BaoBeDoiTrangThai.Xet(T(), T(khoa: true, lyDo: LockReasons.Khoa, hetGio: GioiHanMay.HetGioNgay)), b => b.Icon == "dong_ho_cat");

    [Fact]
    public void BaMeThemWebChan_Bao_TrangCu_KhongBao()
    {
        var truoc = T(chan: new[] { "a.com" });
        var nay = T(chan: new[] { "a.com", "b.com" });
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(truoc, nay));
        Assert.Equal("Ba Mẹ vừa chặn thêm web", b.Tieu);
        Assert.StartsWith("b.com.", b.Phu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(nay, nay));
        Assert.Empty(BaoBeDoiTrangThai.Xet(nay, truoc));          // gỡ web: không báo
    }

    [Fact]
    public void BaMeThemWebCho_Bao()
    {
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), T(cho: new[] { "hoc.vn" })));
        Assert.Equal("Ba Mẹ vừa cho phép thêm web", b.Tieu);
    }

    [Fact]
    public void ChoKhiMoHetHan_ChoSangChan_KhongPhaiBaMeThem()
        => Assert.Empty(BaoBeDoiTrangThai.Xet(T(cho: new[] { "game.com" }), T(chan: new[] { "game.com" })));

    [Fact]
    public void NhieuWeb_RutGon()
    {
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), T(chan: new[] { "a.com", "b.com", "c.com", "d.com", "e.com" })));
        Assert.Contains("và 2 trang khác", b.Phu);
    }

    [Fact]
    public void WebKhongBiet_GiuMoc_BaMeMoMayXongQuayLai_KhongBaoCaDanhSach()
    {
        var moc = T(chan: new[] { "a.com" });
        var khongBiet = new TrangThaiBaoBe(false, null, null, null, null, null);
        Assert.Empty(BaoBeDoiTrangThai.Xet(moc, khongBiet));
        var giu = BaoBeDoiTrangThai.GiuMoc(moc, khongBiet);
        Assert.Equal(new[] { "a.com" }, giu.WebChan);
        Assert.Empty(BaoBeDoiTrangThai.Xet(giu, T(chan: new[] { "a.com" })));
    }
}
