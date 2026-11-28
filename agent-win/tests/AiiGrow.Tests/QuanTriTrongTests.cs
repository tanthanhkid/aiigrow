using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#860: phát hiện tài khoản quản trị chưa có mật khẩu — phần quyết định thuần (không gọi Win32).</summary>
public class QuanTriTrongTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 28, 8, 0, 0, TimeSpan.Zero);

    private static TaiKhoanQuanTri Tk(string ten, int rid = 1001, bool bat = true, bool qt = true, NguonTaiKhoan nguon = NguonTaiKhoan.CucBo, string hienThi = "")
        => new(ten, hienThi, rid, bat, qt, nguon);

    /// <summary>Bộ kiểm giả: tài khoản trong <paramref name="trong"/> ⇒ trống, còn lại có mật khẩu; đếm số lần thử đăng nhập.</summary>
    private sealed class KiemGia(params string[] trong)
    {
        public readonly HashSet<string> Trong = new(trong, StringComparer.OrdinalIgnoreCase);
        public readonly List<string> DaThu = new();
        public KiemMatKhau Kiem(TaiKhoanQuanTri t) { DaThu.Add(t.Ten); return Trong.Contains(t.Ten) ? KiemMatKhau.Trong : KiemMatKhau.CoMatKhau; }
    }

    [Fact]
    public void MotAdminTrong()
    {
        var k = new KiemGia("BaMe");
        var so = new Dictionary<string, LuotKiemQuanTri>();
        var kq = QuanTriTrong.Tinh(new[] { Tk("BaMe", hienThi: "Ba Mẹ") }, so, k.Kiem, T0);
        Assert.Equal(new[] { "Ba Mẹ" }, kq);   // tên hiển thị (màn đăng nhập), thiếu thì tên tài khoản
    }

    [Fact]
    public void NhieuAdmin_ChiBaoTaiKhoanTrong()
    {
        var k = new KiemGia("Bo", "Me");
        var kq = QuanTriTrong.Tinh(new[] { Tk("Me", 1002), Tk("Bo", 1001), Tk("Ong", 1003) }, new Dictionary<string, LuotKiemQuanTri>(), k.Kiem, T0);
        Assert.Equal(new[] { "Bo", "Me" }, kq);
        Assert.Equal(3, k.DaThu.Count);
    }

    [Fact]
    public void AdministratorDungSan_TatThiBoQua_BatThiKiem()
    {
        var k = new KiemGia("Administrator");
        var tat = QuanTriTrong.Tinh(new[] { Tk("Administrator", QuanTriTrong.RidAdministrator, bat: false) }, new Dictionary<string, LuotKiemQuanTri>(), k.Kiem, T0);
        Assert.Empty(tat);
        Assert.Empty(k.DaThu);   // tắt ⇒ không thử đăng nhập
        var bat = QuanTriTrong.Tinh(new[] { Tk("Administrator", QuanTriTrong.RidAdministrator) }, new Dictionary<string, LuotKiemQuanTri>(), k.Kiem, T0);
        Assert.Equal(new[] { "Administrator" }, bat);
    }

    [Fact]
    public void TaiKhoanMicrosoft_TinhCoBaoVe_KhongThu()
    {
        var k = new KiemGia("ms");
        var kq = QuanTriTrong.Tinh(new[] { Tk("ms", nguon: NguonTaiKhoan.Microsoft) }, new Dictionary<string, LuotKiemQuanTri>(), k.Kiem, T0);
        Assert.Empty(kq);
        Assert.Empty(k.DaThu);
    }

    [Fact]
    public void TaiKhoanBiTat_BoQua()
    {
        var k = new KiemGia("cu");
        Assert.Empty(QuanTriTrong.Tinh(new[] { Tk("cu", bat: false) }, new Dictionary<string, LuotKiemQuanTri>(), k.Kiem, T0));
        Assert.Empty(k.DaThu);
    }

    [Fact]
    public void TaiKhoanBeThuong_KhongTinhKhongThu()
    {
        var k = new KiemGia("Be");
        Assert.Empty(QuanTriTrong.Tinh(new[] { Tk("Be", qt: false) }, new Dictionary<string, LuotKiemQuanTri>(), k.Kiem, T0));
        Assert.Empty(k.DaThu);
    }

    [Fact]
    public void CoMatKhau_KhongThuLaiTruoc6Gio()
    {
        var k = new KiemGia();
        var so = new Dictionary<string, LuotKiemQuanTri>();
        var ds = new[] { Tk("BaMe") };
        QuanTriTrong.Tinh(ds, so, k.Kiem, T0);
        for (int p = 5; p < 360; p += 5) QuanTriTrong.Tinh(ds, so, k.Kiem, T0.AddMinutes(p));
        Assert.Single(k.DaThu);   // 6 giờ chỉ một lần nhập sai
        QuanTriTrong.Tinh(ds, so, k.Kiem, T0.AddHours(6));
        Assert.Equal(2, k.DaThu.Count);
    }

    [Fact]
    public void DangTrong_KiemLaiDay_DatMatKhauXongThiHetBao()
    {
        var k = new KiemGia("BaMe");
        var so = new Dictionary<string, LuotKiemQuanTri>();
        var ds = new[] { Tk("BaMe") };
        Assert.Equal(new[] { "BaMe" }, QuanTriTrong.Tinh(ds, so, k.Kiem, T0));
        Assert.Equal(new[] { "BaMe" }, QuanTriTrong.Tinh(ds, so, k.Kiem, T0.AddMinutes(2)));   // chưa tới hạn ⇒ dùng kết quả cũ
        Assert.Single(k.DaThu);
        k.Trong.Clear();   // Ba Mẹ đặt mật khẩu
        Assert.Empty(QuanTriTrong.Tinh(ds, so, k.Kiem, T0.AddMinutes(5)));
        Assert.Equal(2, k.DaThu.Count);
    }

    [Fact]
    public void SoKiemLuuDia_KhoiDongLaiKhongThuThem()
    {
        var k = new KiemGia();
        var so = new Dictionary<string, LuotKiemQuanTri>();
        var ds = new[] { Tk("BaMe") };
        QuanTriTrong.Tinh(ds, so, k.Kiem, T0);
        var so2 = QuanTriTrong.DocSo(QuanTriTrong.GhiSo(so));   // dịch vụ khởi động lại
        QuanTriTrong.Tinh(ds, so2, k.Kiem, T0.AddMinutes(1));
        Assert.Single(k.DaThu);
        Assert.Empty(QuanTriTrong.DocSo("không phải json"));
        Assert.Empty(QuanTriTrong.DocSo(null));
    }

    [Fact]
    public void TaiKhoanMoi_KiemNgay_TaiKhoanMatChiBoKhoiSoKhiHetHan()
    {
        var k = new KiemGia("Moi");
        var so = new Dictionary<string, LuotKiemQuanTri>();
        QuanTriTrong.Tinh(new[] { Tk("BaMe") }, so, k.Kiem, T0);
        var kq = QuanTriTrong.Tinh(new[] { Tk("Moi", 1002) }, so, k.Kiem, T0.AddMinutes(1));
        Assert.Equal(new[] { "Moi" }, kq);
        Assert.Equal(new[] { "BaMe", "Moi" }, k.DaThu);
        Assert.Equal(2, so.Count);   // mốc BaMe còn hạn ⇒ giữ
        QuanTriTrong.Tinh(new[] { Tk("Moi", 1002) }, so, k.Kiem, T0.AddHours(6), out var doi);
        Assert.True(doi);
        Assert.Single(so);
    }

    [Fact]
    public void TatRoiBatLai_KhongThuThemTruocHan()
    {
        var k = new KiemGia();
        var so = new Dictionary<string, LuotKiemQuanTri>();
        QuanTriTrong.Tinh(new[] { Tk("BaMe") }, so, k.Kiem, T0);
        QuanTriTrong.Tinh(new[] { Tk("BaMe", bat: false) }, so, k.Kiem, T0.AddMinutes(5));
        QuanTriTrong.Tinh(new[] { Tk("BaMe") }, so, k.Kiem, T0.AddMinutes(10), out var doi);
        Assert.Single(k.DaThu);
        Assert.False(doi);
    }

    [Fact]
    public void TrungTenHienThi_MoiTaiKhoanMotDong()
    {
        var kq = QuanTriTrong.Tinh(new[] { Tk("bo", 1001, hienThi: "Admin"), Tk("me", 1002, hienThi: "Admin") },
            new Dictionary<string, LuotKiemQuanTri>(), _ => KiemMatKhau.Trong, T0);
        Assert.Equal(new[] { "Admin", "Admin" }, kq);
    }

    [Fact]
    public void DongHoLui_CoiNhuToiHan()
    {
        var truoc = new LuotKiemQuanTri { KetQua = KiemMatKhau.CoMatKhau, Luc = T0 };
        Assert.True(QuanTriTrong.DenHanKiem(truoc, T0.AddDays(-1)));
        Assert.False(QuanTriTrong.DenHanKiem(truoc, T0.AddHours(1)));
        Assert.True(QuanTriTrong.DenHanKiem(null, T0));
    }

    [Theory]
    [InlineData(true, 0, KiemMatKhau.Trong)]
    [InlineData(false, 1327, KiemMatKhau.Trong)]
    [InlineData(false, 1330, KiemMatKhau.Trong)]
    [InlineData(false, 1907, KiemMatKhau.Trong)]
    [InlineData(false, 1385, KiemMatKhau.Trong)]
    [InlineData(false, 1326, KiemMatKhau.CoMatKhau)]
    [InlineData(false, 1909, KiemMatKhau.KhongRo)]
    [InlineData(false, 1331, KiemMatKhau.KhongRo)]
    public void MaLoiLogonUser(bool ok, int loi, KiemMatKhau mong) => Assert.Equal(mong, QuanTriTrong.TuLogonUser(ok, loi));

    [Fact]
    public void KhongRo_KhongBao()
    {
        var kq = QuanTriTrong.Tinh(new[] { Tk("BaMe") }, new Dictionary<string, LuotKiemQuanTri>(), _ => KiemMatKhau.KhongRo, T0);
        Assert.Empty(kq);
    }

    [Fact]
    public void StatusGuiQuanTriTrong_NullThiKhongGui()
    {
        var s = System.Text.Json.JsonSerializer.Serialize(new AgentStatus { QuanTriTrong = new() { "BaMe" } }, Json.Options);
        Assert.Contains("\"quanTriTrong\":[\"BaMe\"]", s);
        var rong = System.Text.Json.JsonSerializer.Serialize(new AgentStatus { QuanTriTrong = new() }, Json.Options);
        Assert.Contains("\"quanTriTrong\":[]", rong);
        Assert.DoesNotContain("quanTriTrong", System.Text.Json.JsonSerializer.Serialize(new AgentStatus(), Json.Options));
    }
}
