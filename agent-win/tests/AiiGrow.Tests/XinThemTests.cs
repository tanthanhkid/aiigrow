using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

/// <summary>#307 «Xin thêm …» (Bàn con-xin them-bxw40sw9 → them-6tn8aozf → them-359v1pre / them-vkdikuo0).</summary>
public class XinThemTests
{
    [Fact]
    public void Chu_TheoBan()
    {
        Assert.Equal("Xin thêm YouTube", XinThemView.Tieu("YouTube"));
        Assert.Equal("YouTube chưa có trong danh sách của con", XinThemView.Phu("YouTube"));
        Assert.Equal("Xin Ba Mẹ thêm YouTube", XinThemView.Nut("YouTube"));
        Assert.Equal("Con xin thêm YouTube", XinThemView.ConXin("YouTube"));
        Assert.Equal("Xin thêm YouTube", XinThemView.DongDaLuu("YouTube"));
        Assert.Equal("Mẹ Lan đã thêm!", XinThemView.DaThem("Mẹ Lan"));
        Assert.Equal("Ba Mẹ đã thêm!", XinThemView.DaThem(null));
        Assert.Equal("Ba Mẹ chưa thêm YouTube", XinThemView.ChuaThem("YouTube"));
    }

    [Fact]
    public void ChoiTiep_VaNhom_TheoSoSao()
    {
        Assert.Equal("Chơi tiếp · còn 18 sao = 18 phút", XinThemView.ChoiTiep(18.4));
        Assert.Equal("Về Hôm nay", XinThemView.ChoiTiep(0));
        Assert.Equal("Tính phút · 18 sao = 18 phút", XinThemView.NhomDaThem(false, 18));
        Assert.Equal("Không tính phút · không trừ sao", XinThemView.NhomDaThem(true, 18));
        Assert.Equal("Con còn 0 sao = 0 phút chơi", XinThemView.ConPhut(null));
    }

    [Fact]
    public void LoiChuaThem_GhepLoiNhanBaMe()
    {
        Assert.Equal("Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé!", XinThemView.LoiChuaThem("YouTube", null));
        Assert.Equal("Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé! Con xem YouTube Kids trước nha.",
            XinThemView.LoiChuaThem("YouTube", "  Con xem YouTube Kids trước nha. "));
    }

    // ---- #422 «Xin thêm app / web» (them-vkqmcblk, them-1bpjmixa, them-c0sycsos, them-u94tbp3x)

    [Fact]
    public void Chon_ChuTheoBan()
    {
        Assert.Equal("Xin thêm app / web", XinThemChonView.NutHomNay);
        Assert.Equal("Xin thêm app / web…", XinThemChonView.MenuKhay);
        Assert.Equal("AiiGrow · Xin thêm app / web", XinThemChonView.TieuDeCuaSo);
        Assert.Equal("Chọn app trên máy hoặc gõ địa chỉ trang web", XinThemChonView.Phu);
        Assert.Equal("App trên máy", XinThemChonView.TheApp);
        Assert.Equal("Trang web", XinThemChonView.TheWeb);
        Assert.Equal("Gõ địa chỉ trang con muốn vào, ví dụ scratch.mit.edu", XinThemChonView.GoiYWeb);
        Assert.Equal("Xin Ba Mẹ mở trang này", XinThemChonView.NutWeb);
        Assert.Equal("Xin Ba Mẹ thêm Minecraft", XinThemChonView.NutApp(" Minecraft "));
        Assert.Equal("Chọn một app để xin", XinThemChonView.NutApp(null));
        Assert.Equal("Xin thêm app / web ›", XinVayView.XinThemApp);
    }

    [Theory]
    [InlineData("app", "app")]
    [InlineData("web", "web")]
    [InlineData("WEB", null)]
    [InlineData("mo_web", null)]
    [InlineData(null, null)]
    public void Chon_ChuanKieu(string? vao, string? ra) => Assert.Equal(ra, XinThemChonView.ChuanKieu(vao));

    [Theory]
    [InlineData("scratch.mit.edu", "scratch.mit.edu")]
    [InlineData("  Scratch.MIT.edu  ", "scratch.mit.edu")]
    [InlineData("https://www.youtube.com/watch?v=1", "www.youtube.com")]
    [InlineData("www.edu.vn", "www.edu.vn")]
    [InlineData("scratch.mit.edu?lang=vi", "scratch.mit.edu")]
    [InlineData("khanacademy.org:443/math", "khanacademy.org")]
    [InlineData("vnexpress.net.", "vnexpress.net")]
    [InlineData("www.com", "www.com")]
    [InlineData("minecraft", null)]
    [InlineData("paint.exe", null)]
    [InlineData("https://roblox.exe", null)]
    [InlineData("bánh.vn", null)]
    [InlineData("scratch mit edu", null)]
    [InlineData("scratch .mit.edu", null)]
    [InlineData("192.168.1.1", null)]
    [InlineData("-abc.com", null)]
    [InlineData("abc..com", null)]
    [InlineData("abc.c", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Chon_ChuanWeb_KiemCoBan(string? vao, string? ra) => Assert.Equal(ra, XinThemChonView.ChuanWeb(vao));

    [Fact]
    public void Chon_LocApp_BoTrungBoAiiGrowXepTheoTen()
    {
        var ds = XinThemChonView.Loc(new[]
        {
            new AppTrenMay { Muc = "zalo.exe", Ten = "Zalo" },
            new AppTrenMay { Muc = "minecraft.exe", Ten = "Minecraft" },
            new AppTrenMay { Muc = "MINECRAFT.EXE", Ten = "Minecraft (bản 2)" },
            new AppTrenMay { Muc = "aiigrow.tray.exe", Ten = "AiiGrow" },
            new AppTrenMay { Muc = " ", Ten = "Rỗng" },
            new AppTrenMay { Muc = "paint.exe", Ten = "" },
        });
        Assert.Equal(new[] { "Minecraft", "paint.exe", "Zalo" }, ds.Select(a => a.Ten));
        Assert.Equal("minecraft.exe", ds[0].Muc);
        Assert.Empty(XinThemChonView.Loc(null));
    }

    [Fact]
    public void LoiXinCho_GiuKieuQuaJson()
    {
        var x = new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "scratch.mit.edu", Kieu = XinThemChonView.KieuWeb };
        var lai = System.Text.Json.JsonSerializer.Deserialize<LoiXinCho>(System.Text.Json.JsonSerializer.Serialize(x, Json.Options), Json.Options)!;
        Assert.Equal("web", lai.Kieu);
        var req = System.Text.Json.JsonSerializer.Serialize(new PipeRequest { Cmd = PipeCmd.XinDuyet, AppId = "minecraft.exe", Kieu = "app" }, Json.Options);
        Assert.Contains("\"kieu\":\"app\"", req);
    }
}

/// <summary>#780: lưới «App trên máy» của bé bỏ công cụ hệ thống, giữ Notepad / Paint.</summary>
public class CongCuHeThong780Tests
{
    [Fact]
    public void Loc_BoCongCuHeThong_GiuNotepadPaint()
    {
        var ds = new[]
        {
            new AppTrenMay { Muc = "cmd.exe", Ten = "Command Prompt" }, new AppTrenMay { Muc = "regedit.exe", Ten = "Registry Editor" },
            new AppTrenMay { Muc = "taskmgr.exe", Ten = "Task Manager" }, new AppTrenMay { Muc = "resmon.exe", Ten = "Resource Monitor" },
            new AppTrenMay { Muc = "mstsc.exe", Ten = "Remote Desktop Connection" }, new AppTrenMay { Muc = "iexplore.exe", Ten = "Internet Explorer" },
            new AppTrenMay { Muc = "notepad.exe", Ten = "Notepad" }, new AppTrenMay { Muc = "mspaint.exe", Ten = "Paint" }, new AppTrenMay { Muc = "msedge.exe", Ten = "Microsoft Edge" },
        };
        Assert.Equal(new[] { "Microsoft Edge", "Notepad", "Paint" }, XinThemChonView.Loc(ds).Select(a => a.Ten).ToArray());
    }

    [Fact]
    public void AppAiiGrow_TenThuongLaAiiGrow()
    {
        Assert.True(AppAiiGrow.La("aiigrow.tray.exe"));
        Assert.False(AppAiiGrow.La("roblox.exe"));
    }
}
