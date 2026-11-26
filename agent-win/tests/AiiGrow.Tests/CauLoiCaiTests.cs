using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#689: bộ cài không hiện chữ PowerShell / .NET tiếng Anh, đường dẫn; câu nói Ba Mẹ phải làm gì.</summary>
public class CauLoiCaiTests
{
    private const string StderrTrung = "New-LocalUser : The user account already exists.\r\nAt line:1 char:1\r\n+ New-LocalUser -Name 'con' -NoPassword ...\r\n    + FullyQualifiedErrorId : UserExists,Microsoft.PowerShell.Commands.NewLocalUserCommand";

    [Fact]
    public void TaoTaiKhoan_TrungTen_CauRo_KhongTiengAnh()
    {
        var cau = CauLoiCai.TuLoiTaoTaiKhoan("con", StderrTrung);
        Assert.Equal("Máy đã có tài khoản «con». Đặt tên khác, hoặc chọn «Các con đã có tài khoản chung».", cau);
        var e = new LoiCai(cau, StderrTrung);
        Assert.Equal(cau, CauLoiCai.Tu(e));
        Assert.Contains("already exists", CauLoiCai.Log(e));   // chữ gốc vẫn vào install.log
        Assert.Equal(CauLoiCai.TaoTaiKhoan, CauLoiCai.TuLoiTaoTaiKhoan("con", "Access is denied."));
    }

    [Fact]
    public void NgoaiLeHeThong_DoiCauViet_KhongDuongDan()
    {
        var biGiu = new IOException("The process cannot access the file 'C:\\Program Files\\AiiGrow\\AiiGrow.Service.exe' because it is being used by another process.");
        Assert.Equal(CauLoiCai.TepBiGiu, CauLoiCai.Tu(biGiu));
        Assert.Equal(CauLoiCai.ThieuQuyen, CauLoiCai.Tu(new UnauthorizedAccessException("Access to the path 'C:\\Program Files\\AiiGrow\\AiiGrow.Service.exe' is denied.")));
        Assert.Equal(CauLoiCai.ThieuTep, CauLoiCai.Tu(new FileNotFoundException("bộ cài thiếu AiiGrow.Service.exe")));
        Assert.Equal(CauLoiCai.Chung, CauLoiCai.Tu(new InvalidOperationException("dịch vụ vừa chép là bản 0.2.31, không phải 0.2.32")));
        Assert.Equal(CauLoiCai.DocTaiKhoan, CauLoiCai.Tu(new InvalidOperationException("Get-LocalUser : x"), CauLoiCai.DocTaiKhoan));
        foreach (var c in new[] { CauLoiCai.Tu(biGiu), CauLoiCai.ThieuQuyen, CauLoiCai.Chung })
            Assert.DoesNotContain("C:\\", c);
    }

    [Fact]
    public void LoiMayChu_GiuCauViet()
    {
        Assert.Equal("Mã ghép này dành cho máy Mac", CauLoiCai.Tu(new ApiException("Mã ghép này dành cho máy Mac", 400)));
        Assert.Equal(CauLoiCai.Chung, CauLoiCai.Tu(new ApiException("token_sai", 401)));
    }

    [Fact]
    public void CapNhatLoi_KhongInNhatKy()
    {
        var kq = new KetQuaCapNhat(false, true, "chép AiiGrow.Service.exe: IOException The process cannot access the file…");
        Assert.DoesNotContain("IOException", CauLoiCai.CapNhatLoi(kq));
        Assert.Contains("bản cũ", CauLoiCai.CapNhatLoi(kq));
    }
}
