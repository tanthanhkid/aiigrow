using System.Text;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class EnrollmentTests
{
    [Fact]
    public void Encode_RoundTrip()
    {
        var pkg = new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "abc-123_XYZ" };
        Assert.True(EnrollmentPackage.TryDecode(pkg.Encode(), out var back));
        Assert.Equal("https://aiigrow.vn", back.Server);
        Assert.Equal("abc-123_XYZ", back.Token);
        Assert.True(back.Valid);
    }

    [Fact]
    public void TryDecode_DangThanThien_TokenAtServer()
    {
        Assert.True(EnrollmentPackage.TryDecode("tok9@https://my.aiigrow.vn", out var p));
        Assert.Equal("tok9", p.Token);
        Assert.Equal("https://my.aiigrow.vn", p.Server);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("khong-phai-base64-cung-khong-co-@")]
    [InlineData("@thieu-token")]
    public void TryDecode_Sai_TraFalse(string s)
    {
        Assert.False(EnrollmentPackage.TryDecode(s, out var p));
        Assert.False(p.Valid);
    }

    [Fact]
    public void FromArgs_DocCaHaiKieu()
    {
        Assert.Equal("X", EnrollmentReader.FromArgs(new[] { "--silent", "--enroll=X" }));
        Assert.Equal("Y", EnrollmentReader.FromArgs(new[] { "/enroll:Y" }));
        Assert.Null(EnrollmentReader.FromArgs(new[] { "--silent" }));
    }

    [Fact]
    public void FromFileName_LayDoanSauEnroll()
    {
        Assert.Equal("ABC123", EnrollmentReader.FromFileName(@"C:\Tải về\AiiGrow-Setup.enroll-ABC123.exe"));
        Assert.Null(EnrollmentReader.FromFileName(@"C:\Tải về\AiiGrow-Setup.exe"));
    }

    [Fact]
    public void Trailer_NoiVaDocLai()
    {
        var pkg = new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "tk-từ-trailer" };
        var exe = Encoding.ASCII.GetBytes("MZ... nội dung bộ cài giả ...");
        var withTrailer = EnrollmentReader.AppendTrailer(exe, pkg);
        var token = EnrollmentReader.FromTrailer(withTrailer);
        Assert.NotNull(token);
        Assert.True(EnrollmentPackage.TryDecode(token, out var back));
        Assert.Equal(pkg.Token, back.Token);
        // Không có trailer ⇒ null
        Assert.Null(EnrollmentReader.FromTrailer(exe));
    }

    [Fact]
    public void TryRead_UuTienThamSoRoiTrailer()
    {
        var pkg = new EnrollmentPackage { Server = "https://s", Token = "t" };
        var bytes = EnrollmentReader.AppendTrailer(new byte[] { 1, 2, 3 }, pkg);
        // tham số thắng
        Assert.True(EnrollmentReader.TryRead(new[] { "--enroll=" + pkg.Encode() }, out var a, "x.exe", _ => bytes));
        Assert.Equal("t", a.Token);
        // không tham số ⇒ đọc trailer
        Assert.True(EnrollmentReader.TryRead(Array.Empty<string>(), out var b, "x.exe", _ => bytes));
        Assert.Equal("t", b.Token);
        // không nguồn nào ⇒ false
        Assert.False(EnrollmentReader.TryRead(Array.Empty<string>(), out _, "x.exe", _ => new byte[] { 9 }));
    }
}
