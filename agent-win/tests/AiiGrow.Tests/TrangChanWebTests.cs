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

/// <summary>#741 test 28/11 (Edge, «Theo danh sách»): trang chặn tiktok.com — tiêu đề «www.tiktok.com - Profile 1 - Microsoft Edge», tiktok.com KHÔNG có trong danh sách chặn
/// (chế độ chỉ cho phép chặn «*»). Hộp chặn app bật lặp mỗi nhịp đóng app ⇒ đóng không được.</summary>
public class TrangChanWebTheoDanhSachTests
{
    private static readonly string[] Cho = { "scratch.mit.edu", "youtube.com" };
    private static readonly DateTimeOffset T = new(2026, 11, 28, 16, 0, 0, TimeSpan.FromHours(7));

    [Theory]
    [InlineData("www.tiktok.com - Profile 1 - Microsoft Edge", "tiktok.com")]
    [InlineData("tiktok.com - Microsoft​ Edge", "tiktok.com")]
    [InlineData("https://m.facebook.com/abc - Google Chrome", "m.facebook.com")]
    [InlineData("scratch.mit.edu - Profile 1 - Microsoft Edge", null)]           // trang Ba Mẹ cho
    [InlineData("www.youtube.com/watch?v=1 - Microsoft Edge", null)]             // tên miền con của trang được cho
    [InlineData("aiigrow.vn - Microsoft Edge", null)]                            // máy chủ AiiGrow
    [InlineData("TikTok - Make Your Day - Microsoft Edge", null)]                // trang thật (không bị chặn) không có dạng địa chỉ
    [InlineData("New tab - Microsoft Edge", null)]
    [InlineData("This page is blocked - Microsoft Edge", null)]
    public void ChiChoPhep_TieuDeDiaChiNgoaiDanhSach_LaTrangChan(string tieuDe, string? mong)
        => Assert.Equal(mong, TrangChanWeb.TimMien(tieuDe, Array.Empty<string>(), Cho, chiChoPhep: true, mayChu: "aiigrow.vn"));

    [Fact]
    public void KhongChiChoPhep_GiuNhuCu() => Assert.Null(TrangChanWeb.TimMien("www.tiktok.com - Profile 1 - Microsoft Edge", Array.Empty<string>(), Cho));

    [Fact]
    public void ChuaApLuatWeb_KhongBao() => Assert.Null(TrangChanWeb.TimMien("www.tiktok.com", null, Cho, chiChoPhep: true));

    [Fact]
    public void HopChanApp_KhongDungLaiKhiDangMo_VaNghiSauKhiDong()
    {
        var h = new HopChanLap();
        Assert.True(h.NenHien("powershell.exe", hopDangMo: false, T));                    // lần đầu: hiện
        Assert.False(h.NenHien("powershell.exe", hopDangMo: true, T.AddSeconds(5)));      // dịch vụ đóng lại lúc hộp đang mở: giữ hộp, không dựng lại
        Assert.False(h.NenHien("powershell.exe", hopDangMo: false, T.AddSeconds(10)));    // bé vừa đóng hộp, app bị đóng lại ngay: không bật lại
        Assert.False(h.NenHien("powershell.exe", hopDangMo: false, T.AddSeconds(35)));    // vẫn bị đóng lặp (trượt theo lần gần nhất)
        Assert.True(h.NenHien("notepad.exe", hopDangMo: false, T.AddSeconds(36)));        // app khác: hiện
        Assert.True(h.NenHien("powershell.exe", hopDangMo: false, T.AddSeconds(35 + HopChanLap.NghiGiay + 1)));   // yên một lúc rồi mở lại: hiện
    }

    [Fact]
    public void CongCuWindows_CoNutNhanBaMe()
    {
        Assert.False(ManChanView.CoNutXin("powershell.exe"));
        Assert.True(ManChanView.CoNutNhanXin("powershell.exe"));
        Assert.Equal("Xin Ba Mẹ mở PowerShell", ManChanView.NutNhanXin("PowerShell"));
        Assert.False(ManChanView.CoNutNhanXin("capcut.exe"));     // có nút xin thật
        Assert.False(ManChanView.CoNutNhanXin(null));
        Assert.False(ManChanView.CoNutNhanXin(UsageTracker.KhongRo));
    }
}
