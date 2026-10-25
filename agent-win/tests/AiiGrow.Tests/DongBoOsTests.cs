using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Đồng bộ tính năng với các nền khác (BANG-TINH-NANG-OS mục 5): xin mở trang / app (mục 7), đã dùng hôm nay theo app (mục 14).</summary>
public class DongBoOsTests
{
    private static readonly DateTimeOffset T = new(2026, 10, 25, 10, 0, 0, TimeSpan.FromHours(7));

    [Theory]
    [InlineData("  youtube.com ", "youtube.com")]
    [InlineData("Minecraft   Education", "Minecraft Education")]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void XinMo_ChuanMuc(string? vao, string? ra) => Assert.Equal(ra, XinMoView.ChuanMuc(vao));

    [Fact]
    public void XinMo_ChuanMuc_QuaDaiThiBo()
    {
        Assert.Null(XinMoView.ChuanMuc(new string('a', XinMoView.MucToiDa + 1)));
        Assert.NotNull(XinMoView.ChuanMuc(new string('a', XinMoView.MucToiDa)));
    }

    [Fact]
    public void XinMo_LyDo_MacDinhVaCat()
    {
        Assert.Equal("Con xin mở scratch.mit.edu", XinMoView.LyDo(null, "scratch.mit.edu"));
        Assert.Equal("Để làm bài tập", XinMoView.LyDo("  Để làm bài tập ", "x"));
        Assert.Equal(XinMoView.LoiNhanToiDa, XinMoView.LyDo(new string('b', 300), "x").Length);
    }

    [Fact]
    public void XinMo_LoaiKhopMayChu()
    {
        Assert.True(LoaiXin.LaXinMo("mo_web"));
        Assert.True(LoaiXin.LaXinMo("cai_app"));
        Assert.False(LoaiXin.LaXinMo("them_gio"));
        Assert.False(LoaiXin.LaXinMo(null));
        Assert.Equal(new[] { "mo_web", "cai_app" }, XinMoView.Loai.Select(x => x.Loai));
    }

    [Fact]
    public void XinMo_ThongBaoTheoTrangThai()
    {
        Assert.Contains("đã cho mở «youtube.com»", XinMoView.ThongBao(TrayView.XinGio("dong_y"), "youtube.com"));
        Assert.Contains("chưa đồng ý", XinMoView.ThongBao(TrayView.XinGio("tu_choi"), "x"));
        Assert.Contains("hết hạn", XinMoView.ThongBao(TrayView.XinGio("het_han"), "x"));
        Assert.Contains("Đang chờ", XinMoView.ThongBao(TrayView.XinGio("cho"), "x"));
    }

    [Theory]
    [InlineData("roblox.exe", true)]
    [InlineData("minecraft", true)]
    [InlineData("cmd.exe", false)]
    [InlineData("taskmgr", false)]
    [InlineData("khong-ro", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ManChan_XinMoHanApp(string? appId, bool hien) => Assert.Equal(hien, BlockScreenView.CanAskOpen(appId));

    [Fact]
    public void PipeRequest_XinMo_GiuLoaiVaGiaTri()
    {
        var req = new PipeRequest { Cmd = PipeCmd.Request, Kind = LoaiXin.MoWeb, AppId = "youtube.com", Note = "học" };
        var lai = JsonSerializer.Deserialize<PipeRequest>(JsonSerializer.Serialize(req, Json.Options), Json.Options)!;
        Assert.Equal("mo_web", lai.Kind);
        Assert.Equal("youtube.com", lai.AppId);
    }

    [Fact]
    public void DungHomNay_CongDonKhongBiDrainTru_XepNhieuTruoc()
    {
        var u = new UsageTracker();
        u.Add(T, "roblox.exe", "Roblox", 600);
        u.Add(T, "word.exe", "Word", 125);
        u.Add(T, UsageTracker.KhongRo, "Không rõ", 900);   // khay chết: không hiện
        u.Add(T, "calc.exe", "Máy tính", 30);               // dưới 1 phút: không hiện
        u.Drain();                                           // gửi máy chủ xong — số hôm nay vẫn giữ
        u.Add(T.AddMinutes(20), "word.exe", "Word", 60);
        var ds = u.DungHomNay(T.AddMinutes(20));
        Assert.Equal(new[] { "roblox.exe", "word.exe" }, ds.Select(x => x.AppId));
        Assert.Equal(new[] { 10, 3 }, ds.Select(x => x.Phut));
        Assert.Equal("Roblox", ds[0].Ten);
        Assert.Equal(13, DungAppView.Tong(ds));
    }

    [Fact]
    public void DungHomNay_SangNgayMoiThiVeKhong()
    {
        var u = new UsageTracker();
        u.Add(T, "roblox.exe", "Roblox", 600);
        Assert.Empty(u.DungHomNay(T.AddDays(1)));
        u.Add(T.AddDays(1), "word.exe", "Word", 120);
        u.Add(T, "roblox.exe", "Roblox", 600);                // giờ máy lùi về hôm qua: không trộn vào hôm nay
        var ds = u.DungHomNay(T.AddDays(1));
        Assert.Equal("word.exe", Assert.Single(ds).AppId);
    }

    [Fact]
    public void DungHomNay_GioiHanSoDong()
    {
        var u = new UsageTracker();
        for (int i = 0; i < 12; i++) u.Add(T, $"app{i}.exe", $"App {i}", 60 * (i + 1));
        var ds = u.DungHomNay(T, 8);
        Assert.Equal(8, ds.Count);
        Assert.Equal("app11.exe", ds[0].AppId);
    }

    [Theory]
    [InlineData(0, "chưa tới 1 phút")]
    [InlineData(45, "45 phút")]
    [InlineData(60, "1 giờ")]
    [InlineData(65, "1 giờ 5 phút")]
    public void DungApp_ThoiLuong(int phut, string chu) => Assert.Equal(chu, DungAppView.ThoiLuong(phut));

    [Fact]
    public void TrayState_DungTheoApp_QuaJson()
    {
        var s = new TrayState { DungTheoApp = { new DungApp { AppId = "a.exe", Ten = "A", Phut = 3 } } };
        var lai = JsonSerializer.Deserialize<TrayState>(JsonSerializer.Serialize(s, Json.Options), Json.Options)!;
        Assert.Equal(3, Assert.Single(lai.DungTheoApp).Phut);
        // dịch vụ cũ không gửi trường này ⇒ danh sách rỗng, không null
        Assert.Empty(JsonSerializer.Deserialize<TrayState>("{}", Json.Options)!.DungTheoApp);
    }
}
