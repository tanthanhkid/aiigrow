using System.Xml.Linq;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#727 phần B (Windows): Cho phép theo tên chỉ nhận exe ở chỗ tin cậy (#693), băm lỗi vẫn chặn, 409 trùng lời xin, lời xin app / web lưu tệp.</summary>
public class Phan727bTests
{
    private static readonly string[] Safe = { @"C:\Program Files\AiiGrow" };
    private const string Win = @"C:\Windows";
    private static readonly HashSet<string> NoDirs = new(StringComparer.OrdinalIgnoreCase);
    private static HashSet<string> Tap(params string[] a) => new(a, StringComparer.OrdinalIgnoreCase);
    // máy đã quét: Discord cài ở AppData\Local\Discord, game ở D:\Games\Foo
    private static readonly string[] DaCai = { @"C:\Users\Con\AppData\Local\Discord", @"D:\Games\Foo" };

    [Theory]
    [InlineData(@"C:\Users\Con\Desktop\discord.exe")]                       // chưa cài Discord vẫn bị đóng
    [InlineData(@"C:\Users\Con\AppData\Roaming\x\discord.exe")]
    [InlineData(@"C:\Users\Con\AppData\LocalLow\x\discord.exe")]
    [InlineData(@"C:\ProgramData\x\discord.exe")]
    [InlineData(@"D:\Games\Khac\discord.exe")]
    [InlineData(@"C:\Users\Con\Downloads\discord.exe")]
    public void TheoTen_ChoLaConGhiDuoc_BiDong(string path)
        => Assert.True(ProcessGuard.ShouldClose(path, Tap("discord.exe"), NoDirs, Safe, Win, tenDaCai: Tap(), thuMucDaCai: DaCai));

    [Theory]
    [InlineData(@"C:\Program Files\Discord\Discord.exe")]
    [InlineData(@"C:\Program Files (x86)\Discord\Discord.exe")]
    [InlineData(@"C:\Users\Con\AppData\Local\Discord\app-1.0.9\Discord.exe")]    // thư mục cài đã quét
    [InlineData(@"D:\Games\Foo\bin\Discord.exe")]
    [InlineData(@"D:\WindowsApps\Foo\Discord.exe")]
    public void TheoTen_ChoTinCay_DuocChay(string path)
        => Assert.False(ProcessGuard.ShouldClose(path, Tap("discord.exe"), NoDirs, Safe, Win, tenDaCai: Tap("discord.exe"), thuMucDaCai: DaCai));

    [Fact]
    public void ChuaQuet_GiuLuatCu_KhongDongOan()
    {
        // thuMucDaCai null (chưa quét app lần nào): bản ở AppData\Roaming không bị đóng oan
        Assert.False(ProcessGuard.ShouldClose(@"C:\Users\Con\AppData\Roaming\Foo\foo.exe", Tap("foo.exe"), NoDirs, Safe, Win, tenDaCai: Tap()));
    }

    [Fact]
    public void AppStoreTheoTenGoi_KhongDoi()
        => Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.MinecraftUWP_1.0_x64__8wekyb3d8bbwe\Minecraft.Windows.exe",
            Tap("microsoft.minecraftuwp"), NoDirs, Safe, Win, tenDaCai: Tap(), thuMucDaCai: DaCai));

    [Fact]
    public void ThuMucDaCai_GocApp_KhongPhaiThuMucBan_VaBoChoThaTep()
    {
        var ds = DanhSachApp.ChuanHoa(new[]
        {
            new AppThat { Khoa = "a", Muc = "discord.exe", Ten = "Discord", Nguon = "start", DuongDan = @"C:\Users\Con\AppData\Local\Discord\app-1.0.9\Discord.exe" },
            new AppThat { Khoa = "b", Muc = "foo.exe", Ten = "Foo", Nguon = "registry", DuongDan = @"D:\Games\Foo\foo.exe" },
            new AppThat { Khoa = "c", Muc = "tool.exe", Ten = "Tool", Nguon = "registry", DuongDan = @"C:\Users\Con\Desktop\tool.exe" },
        });
        var d = DanhSachApp.ThuMucDaCai(ds, Win);
        Assert.Contains(@"C:\Users\Con\AppData\Local\Discord", d);
        Assert.Contains(@"D:\Games\Foo", d);
        Assert.DoesNotContain(d, x => x.Contains("Desktop", StringComparison.OrdinalIgnoreCase));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Users\Con\AppData\Local\Discord\app-2.0.0\Discord.exe", Tap("discord.exe"), NoDirs, Safe, Win, tenDaCai: Tap("discord.exe"), thuMucDaCai: d));
    }

    [Fact]
    public void AppLocker_TheoTen_LaLuatDuongDan_KhongConAsteriskTen()
    {
        var o = new AppLockerOptions { ChildSid = "S-1-5-21-1-2-3-1001", AllowedApps = new[] { "discord.exe" }, ThuMucCai = DaCai };
        var xml = AppLockerXml.Build(o);
        var ex = XDocument.Parse(xml).Descendants("FilePathRule").Single(r => (string?)r.Attribute("Action") == "Deny")
            .Element("Exceptions")!.Elements("FilePathCondition").Select(e => (string?)e.Attribute("Path")).ToList();
        Assert.DoesNotContain(@"*\discord.exe", ex);
        Assert.Contains(@"%PROGRAMFILES%\*\discord.exe", ex);
        Assert.Contains(@"C:\Users\Con\AppData\Local\Discord\*\discord.exe", ex);
        Assert.Contains(@"D:\Games\Foo\discord.exe", ex);
        // chưa quét ⇒ luật tên như cũ
        var cu = XDocument.Parse(AppLockerXml.Build(new AppLockerOptions { ChildSid = "S-1-5-21-1-2-3-1001", AllowedApps = new[] { "discord.exe" } }))
            .Descendants("FilePathCondition").Select(e => (string?)e.Attribute("Path")).ToList();
        Assert.Contains(@"*\discord.exe", cu);
    }

    [Fact]
    public void BamLoiHoacQuaLon_VanKhopTheoTen_ChiKhiDaThuBam()
    {
        var luat = new List<AppBiChan> { new() { Muc = "game.exe", DuongDan = @"D:\Games\Foo\game.exe", Sha256 = new string('a', 64) } };
        // game đổi tên chỗ khác, tên gốc giữ: băm không đọc được ⇒ khớp theo tên (trước đây bỏ qua)
        Assert.NotNull(ChanAppThat.Khop(@"C:\Users\Con\Desktop\game.exe", luat, _ => null, _ => true));
        // «chưa băm xong» (lần đầu) khác «băm không được»
        Assert.Null(ChanAppThat.Khop(@"C:\Users\Con\Desktop\game.exe", luat, _ => null, null));   // tên chung + chưa chắc băm lỗi ⇒ không chặn nhầm
        // app hợp lệ ở Program Files cùng tên chung không bị chặn nhầm khi luật chỉ có băm
        var chung = new List<AppBiChan> { new() { Muc = "setup.exe", Sha256 = new string('b', 64), DuongDan = @"D:\X\setup.exe" } };
        Assert.Null(ChanAppThat.Khop(@"C:\Program Files\Foo\setup.exe", chung, _ => null, _ => true));
        Assert.NotNull(ChanAppThat.Khop(@"C:\Users\Con\Desktop\setup.exe", chung, _ => null, _ => true));
        Assert.Null(ChanAppThat.Khop(@"C:\Users\Con\Desktop\setup.exe", chung, _ => null, _ => false));
    }

    [Fact]
    public async Task Xin409_LaDaCoSan_KhongBaoChuaToiBaMe()
    {
        var e = new ApiException("đã có lời xin đang chờ", 409);
        Assert.Equal(KetQuaGuiXin.DaCoSan, HangXinCho.PhanLoai(e));
        Assert.Equal(KetQuaGuiXin.Bo, HangXinCho.PhanLoai(new ApiException("web cấm", 409, null, "web_cam")));
        var h = new HangXinCho();
        h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "a.exe", Ten = "A", Luc = DateTimeOffset.Now });
        var (xong, _) = await h.GuiAsync(_ => Task.FromResult(KetQuaGuiXin.DaCoSan), DateTimeOffset.Now);
        Assert.Single(xong);
        Assert.Empty(h.BiBo);
        Assert.StartsWith("Đã gửi rồi", XinTrung.Cau);
    }

    [Fact]
    public void XinAppWebCho_LuuTep_SongQuaKhoiDongLai_HetHanBo()
    {
        var tep = Path.Combine(Path.GetTempPath(), "aii-727b-" + Guid.NewGuid().ToString("N") + ".json");
        try
        {
            var now = DateTimeOffset.Now;
            XinAppWebCho.Them(tep, new XinAppWebDangCho("r1", "Scratch", "scratch.mit.edu", now, "be1"), now);
            XinAppWebCho.Them(tep, new XinAppWebDangCho("r1", "Scratch", "scratch.mit.edu", now, "be1"), now);   // trùng id thay
            XinAppWebCho.Them(tep, new XinAppWebDangCho("r2", "Zoom", "zoom.exe", now, null), now);
            var doc = XinAppWebCho.Doc(tep, now);
            Assert.Equal(new[] { "r1", "r2" }, doc.Select(x => x.Id));
            Assert.Equal("be1", doc[0].BeId);
            Assert.Empty(XinAppWebCho.Doc(tep, now.AddHours(25)));
            XinAppWebCho.Xoa(tep, "r1", now);
            Assert.Equal(new[] { "r2" }, XinAppWebCho.Doc(tep, now).Select(x => x.Id));
            XinAppWebCho.Xoa(tep, "r2", now);
            Assert.False(File.Exists(tep));
            File.WriteAllText(tep, "{hỏng");
            Assert.Empty(XinAppWebCho.Doc(tep, now));
        }
        finally { try { File.Delete(tep); } catch { } }
    }
}
