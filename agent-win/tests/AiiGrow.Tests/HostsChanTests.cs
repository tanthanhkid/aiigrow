using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>11/11: Con «Mở hết» ⇒ gỡ dòng chặn 0.0.0.0 / :: trong hosts do phần mềm khác đặt (YouTube «Không thể truy cập» trên MAYTINH4).</summary>
public class HostsChanTests
{
    // trích đúng tệp hosts MAYTINH4 11/11 (chặn YouTube / Roblox / TikTok + khối Tailscale)
    private const string Hosts =
        "# Copyright (c) 1993-2009 Microsoft Corp.\r\n" +
        "#\r\n" +
        "#\t127.0.0.1       localhost\r\n" +
        "0.0.0.0 youtube.com\r\n" +
        ":: youtube.com\r\n" +
        "0.0.0.0 www.youtube.com\r\n" +
        "0.0.0.0 yt3.ggpht.com\r\n" +
        "0.0.0.0 roblox.com\r\n" +
        ":: tiktok.com\r\n" +
        "\r\n" +
        "# TailscaleHostsSectionStart\r\n" +
        "100.125.211.99 maytinh4.taile1eb60.ts.net. maytinh4\r\n" +
        "# TailscaleHostsSectionEnd\r\n" +
        "127.0.0.1 myapp.local\r\n";

    [Fact]
    public void Loc_BoDongChan_GiuMoiDongKhac()
    {
        var kq = HostsChan.Loc(Hosts);
        Assert.Equal(6, kq.SoDong);
        Assert.Equal(new[] { "youtube.com", "www.youtube.com", "yt3.ggpht.com", "roblox.com", "tiktok.com" }, kq.TenMien);
        Assert.Equal(
            "# Copyright (c) 1993-2009 Microsoft Corp.\r\n#\r\n#\t127.0.0.1       localhost\r\n\r\n# TailscaleHostsSectionStart\r\n" +
            "100.125.211.99 maytinh4.taile1eb60.ts.net. maytinh4\r\n# TailscaleHostsSectionEnd\r\n127.0.0.1 myapp.local\r\n", kq.NoiDungMoi);
    }

    [Fact]
    public void Loc_KhongCoDongChan_TraNguyenVan()
    {
        const string s = "# chỉ chú thích\n127.0.0.1 localhost\n::1 localhost\n10.0.0.5 nas.nha\n";
        var kq = HostsChan.Loc(s);
        Assert.Equal(0, kq.SoDong);
        Assert.Same(s, kq.NoiDungMoi);
    }

    [Theory]
    [InlineData("0.0.0.0 a.com b.com # chặn", true)]
    [InlineData("\t0.0.0.0\tA.com.", true)]
    [InlineData("0:0:0:0:0:0:0:0 a.com", true)]
    [InlineData("0.0.0.0 localhost", false)]          // một số máy để «0.0.0.0 localhost» — không phải chặn
    [InlineData("0.0.0.0 a.com localhost", false)]
    [InlineData("127.0.0.1 youtube.com", false)]      // 127.0.0.1 có thể là tên miền dev ⇒ không đụng
    [InlineData("# 0.0.0.0 youtube.com", false)]
    [InlineData("0.0.0.0", false)]
    [InlineData("", false)]
    public void LaDongChan(string dong, bool chan) => Assert.Equal(chan, HostsChan.LaDongChan(dong, out _));

    [Fact]
    public void LaDongChan_TenMienChuThuongBoDauCham()
    {
        Assert.True(HostsChan.LaDongChan("0.0.0.0 WWW.YouTube.com. m.youtube.com", out var ds));
        Assert.Equal(new[] { "www.youtube.com", "m.youtube.com" }, ds);
    }

    [Fact]
    public void Policy_DocCoMoHet()
    {
        Assert.True(PolicyParser.Parse("""{"mode":"tu_do","moHet":true}""").MoHet);
        Assert.False(PolicyParser.Parse("""{"mode":"tu_do"}""").MoHet);
    }
}
