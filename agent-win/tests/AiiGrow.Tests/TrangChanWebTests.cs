using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#741: phát hiện bé vào trang bị chặn qua tiêu đề tab tiền cảnh. Mốc giờ truyền vào.</summary>
public class TrangChanWebTests
{
    private static readonly string[] Chan = { "youtube.com", "y8.com" };
    private static readonly DateTimeOffset T = new(2026, 11, 28, 16, 0, 0, TimeSpan.FromHours(7));

    [Theory]
    [InlineData("youtube.com", "youtube.com")]
    [InlineData("www.youtube.com", "youtube.com")]
    [InlineData("www.youtube.com - Microsoft Edge", "youtube.com")]
    [InlineData("https://m.youtube.com/watch?v=1 - Google Chrome", "youtube.com")]
    [InlineData("Y8.COM", "y8.com")]
    [InlineData("youtube.com:443", "youtube.com")]
    [InlineData("Video hay - YouTube - Google Chrome", null)]
    [InlineData("Hướng dẫn youtube.com", null)]
    [InlineData("notyoutube.com", null)]
    [InlineData("wikipedia.org", null)]
    [InlineData("", null)]
    public void TimMien_TheoTieuDe(string tieuDe, string? mong) => Assert.Equal(mong, TrangChanWeb.TimMien(tieuDe, Chan));

    [Fact]
    public void KhongCoDanhSach_KhongKhop() => Assert.Null(TrangChanWeb.TimMien("youtube.com", null));

    [Fact]
    public void MucCoSaoHoacChamDau_VanKhop() => Assert.Equal("y8.com", TrangChanWeb.TimMien("www.y8.com", new[] { "*.y8.com", "" }));

    [Fact]
    public void NghiHaiPhut_ChoCungTrang()
    {
        var t = new TrangChanWeb();
        Assert.True(t.NenHien("youtube.com", T));
        Assert.False(t.NenHien("youtube.com", T.AddSeconds(30)));
        Assert.True(t.NenHien("y8.com", T.AddSeconds(30)));
        Assert.True(t.NenHien("youtube.com", T.AddSeconds(TrangChanWeb.NghiGiay + 1)));
    }
}

public class TrangChanWebMoRongTests
{
    [Fact]
    public void DuoiHoSo_VaTrangDuocCho()
    {
        Assert.Equal("youtube.com", TrangChanWeb.TimMien("www.youtube.com - Cá nhân - Microsoft Edge", new[] { "youtube.com" }));
        Assert.Null(TrangChanWeb.TimMien("classroom.youtube.com", new[] { "youtube.com" }, new[] { "classroom.youtube.com" }));
    }
}
