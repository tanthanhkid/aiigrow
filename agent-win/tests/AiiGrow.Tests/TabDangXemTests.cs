using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#771: giây web tính theo TAB ĐANG XEM (tiêu đề cửa sổ trình duyệt tiền cảnh), không theo tab mở sẵn / tab nền. Mốc giờ truyền vào, không đồng hồ thật.</summary>
public class TabDangXemTests
{
    private static readonly DateTimeOffset T = new(2026, 11, 27, 16, 0, 0, TimeSpan.FromHours(7));
    private const string Ngay = "2026-11-27";

    private static WebVisit V(string url, string tieuDe, int phutTruoc = 5, double giayO = 0) => new(url, T.AddMinutes(-phutTruoc), giayO, tieuDe);

    [Theory]
    [InlineData("YouTube - Microsoft​ Edge", "YouTube")]
    [InlineData("(3) Video hay - YouTube - Google Chrome", "Video hay - YouTube")]
    [InlineData("Scratch and 2 more pages - Personal - Microsoft Edge", "Scratch")]
    [InlineData("Wikipedia - Brave", "Wikipedia")]
    [InlineData("", "")]
    public void ChuanHoaTieuDe(string tho, string mong) => Assert.Equal(mong, TabDangXem.ChuanHoa(tho));

    [Fact]
    public void ChiTrinhDuyetTienCanhMoiDuocTinh()
    {
        var t = new TabDangXem();
        t.Ghi(Ngay, "notepad.exe", "Ghi chú", 5);
        t.Ghi(Ngay, "msedge.exe", "YouTube - Microsoft Edge", 5);
        t.Ghi(Ngay, "msedge.exe", "YouTube - Microsoft Edge", 0);   // chưa trôi giây nào
        Assert.Equal(new[] { 5.0 }, t.ChupAnh().Values);
        Assert.Equal("YouTube", t.ChupAnh().Keys.Single().TieuDe);
    }

    [Fact]
    public void TabMoSan_KhongAnGio_TabDangXemDuocTinh()
    {
        // Wikipedia («Không tính phút») mở sẵn 14 phút trong lịch sử, YouTube («Tính phút») chưa đóng lượt ghé (giây 0); bé xem YouTube 12 phút
        var visits = new[]
        {
            V("https://vi.wikipedia.org/wiki/A", "A - Wikipedia", 20, 840),
            V("https://www.youtube.com/watch?v=1", "Video hay - YouTube", 12, 0),
        };
        var t = new TabDangXem();
        for (var i = 0; i < 12 * 12; i++) t.Ghi(Ngay, "msedge.exe", "(2) Video hay - YouTube - Microsoft Edge", 5);   // 12 phút, nhịp 5 giây
        var ds = WebHistory.TongHop(visits, null, null, TabDangXem.QuyTenMien(t.ChupAnh(), visits));
        Assert.Equal(720, ds.Single(x => x.TenMien == "youtube.com").Giay);
        Assert.Equal(0, ds.Single(x => x.TenMien == "wikipedia.org").Giay);   // tab mở sẵn không còn ăn giờ
        Assert.Equal(1, ds.Single(x => x.TenMien == "wikipedia.org").SoLan);
    }

    [Fact]
    public void DoiTab_PhutChuyenTheoTabMoi()
    {
        var visits = new[] { V("https://scratch.mit.edu/", "Scratch - Imagine", 30), V("https://youtube.com/watch", "Meo - YouTube", 10) };
        var t = new TabDangXem();
        for (var i = 0; i < 6; i++) t.Ghi(Ngay, "chrome.exe", "Scratch - Imagine - Google Chrome", 10);   // 60 giây ở Scratch
        for (var i = 0; i < 3; i++) t.Ghi(Ngay, "chrome.exe", "Meo - YouTube - Google Chrome", 10);       // rồi 30 giây ở YouTube
        var ds = WebHistory.TongHop(visits, null, null, TabDangXem.QuyTenMien(t.ChupAnh(), visits));
        Assert.Equal(60, ds.Single(x => x.TenMien == "scratch.mit.edu").Giay);
        Assert.Equal(30, ds.Single(x => x.TenMien == "youtube.com").Giay);
    }

    [Fact]
    public void TabNenPhatAmThanh_VaCuaSoThuNho_KhongCong()
    {
        // tiền cảnh là app khác / không có cửa sổ (thu nhỏ hết, màn khoá) ⇒ khay báo exe khác hoặc tiêu đề rỗng ⇒ không cộng
        var t = new TabDangXem();
        t.Ghi(Ngay, "spotify.exe", "YouTube - Microsoft Edge", 30);
        t.Ghi(Ngay, "msedge.exe", "", 30);
        t.Ghi(Ngay, "msedge.exe", null, 30);
        Assert.Empty(t.ChupAnh());
        var visits = new[] { V("https://youtube.com/watch", "Meo - YouTube", 10, 600) };
        var ds = WebHistory.TongHop(visits, null, null, TabDangXem.QuyTenMien(t.ChupAnh(), visits));
        Assert.Equal(0, ds.Single().Giay);   // 600 giây trong lịch sử (tab nền) không được tính
    }

    [Fact]
    public void NhieuCuaSoEdge_ChiCuaSoTienCanhDuocCong()
    {
        // hai cửa sổ Edge: nhịp nào tiền cảnh là cửa sổ nào thì tiêu đề cửa sổ đó nhận giây — tiêu đề khác nhau ⇒ hai tên miền khác nhau
        var visits = new[] { V("https://a.com/", "Trang A", 9), V("https://b.com/", "Trang B", 8) };
        var t = new TabDangXem();
        t.Ghi(Ngay, "msedge.exe", "Trang A - Microsoft Edge", 15);
        t.Ghi(Ngay, "msedge.exe", "Trang B - Microsoft Edge", 15);
        t.Ghi(Ngay, "msedge.exe", "Trang B - Microsoft Edge", 15);
        var ds = WebHistory.TongHop(visits, null, null, TabDangXem.QuyTenMien(t.ChupAnh(), visits));
        Assert.Equal(15, ds.Single(x => x.TenMien == "a.com").Giay);
        Assert.Equal(30, ds.Single(x => x.TenMien == "b.com").Giay);
    }

    [Fact]
    public void TieuDeCungTenNhieuMien_LayLuotGheGanNhat()
    {
        var visits = new[] { V("https://cu.com/", "Trang chủ", 60), V("https://moi.com/", "Trang chủ", 2) };
        var t = new TabDangXem();
        t.Ghi(Ngay, "msedge.exe", "Trang chủ - Microsoft Edge", 20);
        var q = TabDangXem.QuyTenMien(t.ChupAnh(), visits);
        Assert.Equal(new[] { "moi.com" }, q.Keys.Select(k => k.Mien));
    }

    [Fact]
    public void TieuDeKhongQuyDuoc_Bo_VaKhongBiaDong()
    {
        var visits = new[] { V("https://a.com/", "Trang A", 5, 100) };
        var t = new TabDangXem();
        t.Ghi(Ngay, "msedge.exe", "Tab trống - Microsoft Edge", 50);
        var q = TabDangXem.QuyTenMien(t.ChupAnh(), visits);
        Assert.Empty(q);
        Assert.Equal(0, WebHistory.TongHop(visits, null, null, q).Single().Giay);
    }

    [Fact]
    public void KhongCoSoTab_GiuCachCu()
    {
        var visits = new[] { V("https://a.com/", "Trang A", 5, 100) };
        Assert.Equal(100, WebHistory.TongHop(visits).Single().Giay);
    }

    [Fact]
    public void NapLai_LayGiaTriLon_VaDonNgayCu()
    {
        var t = new TabDangXem();
        t.Ghi("2026-11-20", "msedge.exe", "Cũ - Microsoft Edge", 10);
        t.Ghi(Ngay, "msedge.exe", "Mới - Microsoft Edge", 10);
        t.Nap(new[] { new KeyValuePair<(string, string), double>((Ngay, "Mới"), 50) });
        t.DonCu("2026-11-25");
        var s = t.ChupAnh();
        Assert.Single(s);
        Assert.Equal(50, s[(Ngay, "Mới")]);
    }
}
