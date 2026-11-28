using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#862: màn «Đặt mật khẩu cho tài khoản quản trị» của bộ cài — phần thuần (không gọi Win32).</summary>
public class DatMatKhauQuanTriTests
{
    private static TaiKhoanQuanTri Tk(string ten, int rid = 1001, bool bat = true, bool qt = true, NguonTaiKhoan nguon = NguonTaiKhoan.CucBo, string hienThi = "")
        => new(ten, hienThi, rid, bat, qt, nguon);

    [Theory]
    [InlineData("", "", "Gõ mật khẩu mới vào ô thứ nhất.")]
    [InlineData(null, null, "Gõ mật khẩu mới vào ô thứ nhất.")]
    [InlineData("     ", "     ", "Mật khẩu không được chỉ có dấu cách.")]
    [InlineData("abc", "abc", "Mật khẩu cần ít nhất 4 ký tự.")]
    [InlineData("Matkhau1", "", "Gõ lại mật khẩu vào ô thứ hai cho chắc.")]
    [InlineData("Matkhau1", "matkhau1", "Hai lần gõ chưa khớp nhau.")]
    [InlineData("Matkhau1", "Matkhau1 ", "Hai lần gõ chưa khớp nhau.")]
    public void LoiHaiO(string? mk, string? lai, string cau) => Assert.Equal(cau, DatMatKhauQuanTri.Loi(mk, lai));

    [Theory]
    [InlineData("abcd")]
    [InlineData("Matkhau1")]
    [InlineData(" co dau cach ")]
    public void HopLe(string mk) => Assert.Null(DatMatKhauQuanTri.Loi(mk, mk));

    [Fact]
    public void QuaDai()
    {
        var mk = new string('a', DatMatKhauQuanTri.DaiToiDa + 1);
        Assert.Equal("Mật khẩu dài tối đa 127 ký tự.", DatMatKhauQuanTri.Loi(mk, mk));
        var vua = new string('a', DatMatKhauQuanTri.DaiToiDa);
        Assert.Null(DatMatKhauQuanTri.Loi(vua, vua));
    }

    [Theory]
    [InlineData("", DoManhMatKhau.Trong)]
    [InlineData(null, DoManhMatKhau.Trong)]
    [InlineData("ab1", DoManhMatKhau.Yeu)]            // ngắn
    [InlineData("aaaaaaaaaaaa", DoManhMatKhau.Yeu)]   // một ký tự lặp lại
    [InlineData("123456789", DoManhMatKhau.Yeu)]      // dãy số liền
    [InlineData("987654", DoManhMatKhau.Yeu)]
    [InlineData("abcdefgh", DoManhMatKhau.Yeu)]
    [InlineData("hoaxanh", DoManhMatKhau.Yeu)]        // một loại ký tự, chưa đủ 10
    [InlineData("hoaxanh7", DoManhMatKhau.Vua)]
    [InlineData("hoaxanhtrongvuon", DoManhMatKhau.Manh)]   // ≥14 ký tự
    [InlineData("HoaXanh2026", DoManhMatKhau.Manh)]        // ≥10, 3 loại
    [InlineData("HoaXanh20", DoManhMatKhau.Vua)]
    public void DoManh(string? mk, DoManhMatKhau d) => Assert.Equal(d, DatMatKhauQuanTri.DoManh(mk));

    [Fact]
    public void ChuDoManh()
    {
        Assert.Equal("", DatMatKhauQuanTri.ChuDoManh(DoManhMatKhau.Trong));
        Assert.StartsWith("Yếu", DatMatKhauQuanTri.ChuDoManh(DoManhMatKhau.Yeu));
        Assert.Equal("Mạnh", DatMatKhauQuanTri.ChuDoManh(DoManhMatKhau.Manh));
    }

    [Fact]
    public void CanDat_ChiAdminCucBoTrong_KhongPhaiCuaBe()
    {
        var ds = new[]
        {
            Tk("BaMe"),                                         // trống ⇒ cần đặt
            Tk("Me", rid: 1003),                                // có mật khẩu
            Tk("minhkhoi", rid: 1004),                          // tài khoản của bé (còn là quản trị trước khi hạ) ⇒ KHÔNG đặt
            Tk("Administrator", rid: 500, bat: false),          // tắt ⇒ bỏ
            Tk("Bo", rid: 1005, nguon: NguonTaiKhoan.Microsoft),// tài khoản Microsoft ⇒ bỏ
            Tk("Khach", rid: 1006, qt: false),                  // không phải quản trị ⇒ bỏ
            Tk("admin2", rid: 1007),                            // trống
        };
        var daThu = new List<string>();
        var kq = DatMatKhauQuanTri.CanDat(ds, "MinhKhoi", null, t => { daThu.Add(t.Ten); return t.Ten is "BaMe" or "admin2" or "minhkhoi" ? KiemMatKhau.Trong : KiemMatKhau.CoMatKhau; });
        Assert.Equal(new[] { "admin2", "BaMe" }, kq.Select(t => t.Ten));
        Assert.Equal(new[] { "BaMe", "Me", "admin2" }, daThu);   // chỉ thử đăng nhập tài khoản cần kiểm, không thử tài khoản của bé
    }

    [Fact]
    public void CanDat_AdministratorDungSanDangBat()
    {
        var kq = DatMatKhauQuanTri.CanDat(new[] { Tk("Administrator", rid: 500) }, null, null, _ => KiemMatKhau.Trong);
        Assert.Single(kq);
    }

    [Fact]
    public void CanDat_ChuaRoKhongTinh()
    {
        var kq = DatMatKhauQuanTri.CanDat(new[] { Tk("BaMe") }, null, null, _ => KiemMatKhau.KhongRo);
        Assert.Empty(kq);
    }

    [Fact]
    public void CanDat_BoTaiKhoanCuaBeTheoSid()
    {
        var ds = new[] { Tk("BaMe"), Tk("treem", rid: 1004) };
        var kq = DatMatKhauQuanTri.CanDat(ds, "ten-khac", "S-1-5-21-1-2-3-1004", _ => KiemMatKhau.Trong);
        Assert.Equal(new[] { "BaMe" }, kq.Select(t => t.Ten));
        Assert.True(DatMatKhauQuanTri.LaCuaBe(Tk("treem"), @"MAY\Treem", null));
        Assert.False(DatMatKhauQuanTri.LaCuaBe(Tk("treem", rid: 1004), null, "S-1-5-21-1-2-3-10040"));
    }

    [Fact]
    public void TenHien()
    {
        Assert.Equal("BaMe", DatMatKhauQuanTri.TenHien(Tk("BaMe")));
        Assert.Equal("BaMe", DatMatKhauQuanTri.TenHien(Tk("BaMe", hienThi: "bame")));
        Assert.Equal("Ba Mẹ (BaMe)", DatMatKhauQuanTri.TenHien(Tk("BaMe", hienThi: " Ba Mẹ ")));
    }

    [Fact]
    public void CauLoiDat()
    {
        Assert.Contains("chưa đủ yêu cầu", DatMatKhauQuanTri.CauLoiDat("BaMe", 2245));
        Assert.Contains("Không còn thấy", DatMatKhauQuanTri.CauLoiDat("BaMe", 2221));
        Assert.Contains("mã 1234", DatMatKhauQuanTri.CauLoiDat("BaMe", 1234));
    }
}
