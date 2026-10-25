using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class DanhSachAppTests
{
    private const string Win = @"C:\Windows";
    private static readonly string[] Safe = { @"C:\Program Files\AiiGrow", @"C:\Program Files\Common Files" };

    private sealed class TepGia : IThongTinTep
    {
        public string? Sha256(string p) => new string('a', 63) + (p.Length % 10);
        public string? IconPng(string p) => "iVBOR" + p.Length;
        public string? NguoiKy(string p) => p.Contains("Roblox") ? "Roblox Corporation" : null;
        public string? PhienBan(string p) => "1.0";
    }

    // ------------------------------------------------------------------ registry / lối tắt / lọc rác / gộp

    [Fact]
    public void LocRac_SystemComponent_KB_ParentKey_Update()
    {
        Assert.True(DanhSachApp.LaRacRegistry(new MucRegistry("Foo", null, null, null, null, SystemComponent: true)));
        Assert.True(DanhSachApp.LaRacRegistry(new MucRegistry("Security Update for Windows (KB5034441)", null, null, null, null)));
        Assert.True(DanhSachApp.LaRacRegistry(new MucRegistry("Bản con", null, null, null, null, ParentKeyName: "Office16")));
        Assert.True(DanhSachApp.LaRacRegistry(new MucRegistry("Hotfix", null, null, null, null, ReleaseType: "Security Update")));
        Assert.True(DanhSachApp.LaRacRegistry(new MucRegistry("  ", null, null, null, null)));
        Assert.False(DanhSachApp.LaRacRegistry(new MucRegistry("Roblox Player", null, null, null, null)));
    }

    [Theory]
    [InlineData("unins000.exe", true)]
    [InlineData("Uninstall.exe", true)]
    [InlineData("VC_redist.x64.exe", true)]
    [InlineData("crashpad_handler.exe", true)]
    [InlineData("Update.exe", true)]
    [InlineData("app.ico", true)]
    [InlineData("RobloxPlayerBeta.exe", false)]
    [InlineData("notepad++.exe", false)]
    public void LaTrinhPhu(string ten, bool kq) => Assert.Equal(kq, DanhSachApp.LaTrinhPhu(ten));

    [Theory]
    [InlineData("\"C:\\Games\\Foo\\foo.exe\",0", @"C:\Games\Foo\foo.exe")]
    [InlineData(@"C:\Games\Foo\foo.exe,-101", @"C:\Games\Foo\foo.exe")]
    [InlineData(@"C:\Games\Foo\foo.exe", @"C:\Games\Foo\foo.exe")]
    [InlineData(@"C:\Games\Foo\foo.ico", null)]
    [InlineData(@"%ProgramFiles%\foo.exe", null)]
    [InlineData(null, null)]
    public void ExeTuDisplayIcon(string? icon, string? kq) => Assert.Equal(kq, DanhSachApp.ExeTuDisplayIcon(icon));

    [Fact]
    public void Gop_TrungExeRegistryVaLoiTat_ThanhMotApp_LayTenRegistry()
    {
        var reg = new[]
        {
            new MucRegistry("Roblox Player for aiicon", @"C:\Users\aiicon\AppData\Local\Roblox\Versions\v1\RobloxPlayerBeta.exe", @"C:\Users\aiicon\AppData\Local\Roblox",
                "0.650", "Roblox Corporation"),
        };
        var sc = new[] { new MucShortcut("Roblox Player", @"C:\Users\aiicon\AppData\Local\Roblox\Versions\v1\RobloxPlayerBeta.exe") };
        var ds = DanhSachApp.Gop(reg, sc, _ => true, _ => Array.Empty<string>(), Win, Safe);
        var a = Assert.Single(ds);
        Assert.Equal("Roblox Player for aiicon", a.Ten);
        Assert.Equal("registry", a.Nguon);
        Assert.Equal("0.650", a.PhienBan);
        Assert.Equal(@"C:\Users\aiicon\AppData\Local\Roblox", a.ThuMuc);
    }

    [Fact]
    public void Gop_RegistryKhongCoExe_GhepVaoLoiTatTrongInstallLocation()
    {
        var reg = new[] { new MucRegistry("Notepad++ (64-bit x64)", @"C:\Program Files\Notepad++\uninstall.exe", @"C:\Program Files\Notepad++", "8.6", "Notepad++ Team") };
        var sc = new[] { new MucShortcut("Notepad++", @"C:\Program Files\Notepad++\notepad++.exe") };
        var ds = DanhSachApp.Gop(reg, sc, _ => true, _ => Array.Empty<string>(), Win, Safe);
        var a = Assert.Single(ds);
        Assert.Equal(@"C:\Program Files\Notepad++\notepad++.exe", a.DuongDan);
        Assert.Equal("8.6", a.PhienBan);
        Assert.Equal("Notepad++ Team", a.NhaPhatHanh);
    }

    [Fact]
    public void Gop_RegistryKhongLoiTat_ChonExeTrongThuMuc_TrungTen()
    {
        var reg = new[] { new MucRegistry("Notepad++", null, @"C:\Program Files\Notepad++", "8.6", null) };
        var ds = DanhSachApp.Gop(reg, Array.Empty<MucShortcut>(), _ => true,
            d => new[] { d + @"\notepad++.exe", d + @"\uninstall.exe", d + @"\GUP.exe" }, Win, Safe);
        Assert.Equal(@"C:\Program Files\Notepad++\notepad++.exe", Assert.Single(ds).DuongDan);
    }

    [Fact]
    public void Gop_RuntimeKhongExeGiaoDien_Bo()
    {
        var reg = new[]
        {
            new MucRegistry("Microsoft Visual C++ 2022 X64 Minimum Runtime", @"C:\ProgramData\Package Cache\{x}\VC_redist.x64.exe,0", null, "14.38", "Microsoft"),
            new MucRegistry("Microsoft .NET Runtime - 8.0.10", null, @"C:\Program Files\dotnet", "8.0.10", "Microsoft"),
        };
        var ds = DanhSachApp.Gop(reg, Array.Empty<MucShortcut>(), _ => true, d => new[] { d + @"\dotnet.exe", d + @"\other.exe" }, Win, Safe);
        Assert.Empty(ds);
    }

    [Fact]
    public void Gop_BoThanhPhanWindows_GiuNotepad_BoAiiGrow_BoTrinhGo()
    {
        var sc = new[]
        {
            new MucShortcut("File Explorer", @"C:\Windows\explorer.exe"),
            new MucShortcut("Notepad", @"C:\Windows\System32\notepad.exe"),
            new MucShortcut("Run dll", @"C:\Windows\System32\rundll32.exe"),
            new MucShortcut("AiiGrow", @"C:\Program Files\AiiGrow\AiiGrow.Tray.exe"),
            new MucShortcut("Uninstall Foo", @"C:\Games\Foo\unins000.exe"),
            new MucShortcut("Foo", @"C:\Games\Foo\foo.exe"),
            new MucShortcut("Foo (bản 2)", @"C:\Games\Foo\foo.exe"),
        };
        var ds = DanhSachApp.Gop(Array.Empty<MucRegistry>(), sc, _ => true, _ => Array.Empty<string>(), Win, Safe);
        Assert.Equal(new[] { @"C:\Games\Foo\foo.exe", @"C:\Windows\System32\notepad.exe" }, ds.Select(a => a.DuongDan).ToArray());
        Assert.Equal("Foo", ds[0].Ten);
    }

    [Fact]
    public void Gop_ThuMucChungNhieuApp_KhongGuiThuMuc_InstallLocationRongKhongGhep()
    {
        var reg = new[]
        {
            new MucRegistry("Microsoft 365", null, @"C:\Program Files\Microsoft Office", "16", "Microsoft"),
            new MucRegistry("Cài bậy", null, @"C:\Program Files", "9", "Ai đó"),
        };
        var sc = new[]
        {
            new MucShortcut("Word", @"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE"),
            new MucShortcut("Excel", @"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE"),
            new MucShortcut("Foo", @"C:\Program Files\Foo\foo.exe"),
        };
        var ds = DanhSachApp.Gop(reg, sc, _ => true, _ => Array.Empty<string>(), Win, Safe);
        Assert.Equal(3, ds.Count);
        Assert.All(ds.Where(a => a.Ten is "Word" or "Excel"), a => Assert.Null(a.ThuMuc));
        var foo = ds.Single(a => a.Ten == "Foo");
        Assert.Equal(@"C:\Program Files\Foo", foo.ThuMuc);
        Assert.Null(foo.NhaPhatHanh);   // InstallLocation «Program Files» quá rộng ⇒ không ghép metadata
    }

    [Fact]
    public void Gop_TepKhongTonTai_Bo()
    {
        var ds = DanhSachApp.Gop(Array.Empty<MucRegistry>(), new[] { new MucShortcut("Ma", @"C:\Games\Ma\ma.exe") }, _ => false, _ => Array.Empty<string>(), Win, Safe);
        Assert.Empty(ds);
    }

    [Fact]
    public void HoanThien_KhoaMucChuThuong_ThuMucRongBiBo()
    {
        var ung = new[]
        {
            new UngVienApp { DuongDan = @"C:\Program Files\Roblox\RobloxPlayerBeta.exe", Ten = "Roblox", Nguon = "start", ThuMuc = @"C:\Program Files\Roblox" },
            new UngVienApp { DuongDan = @"C:\Program Files\tool.exe", Ten = "Tool", Nguon = "start", ThuMuc = @"C:\Program Files" },
        };
        var ds = DanhSachApp.HoanThien(ung, new TepGia(), Win);
        Assert.Equal(@"exe:c:\program files\roblox\robloxplayerbeta.exe", ds[0].Khoa);
        Assert.Equal("robloxplayerbeta.exe", ds[0].Muc);
        Assert.Equal("Roblox Corporation", ds[0].NhaPhatHanh);
        Assert.Equal(@"C:\Program Files\Roblox", ds[0].ThuMuc);
        Assert.Null(ds[1].ThuMuc);   // Program Files gốc ⇒ quá rộng
    }

    [Fact]
    public void Squirrel_ProcessStart_VaChonBanMoiNhat()
    {
        Assert.Equal("Discord.exe", DanhSachApp.SquirrelProcessStart("--processStart Discord.exe"));
        Assert.Equal("Slack.exe", DanhSachApp.SquirrelProcessStart("--processStart \"Slack.exe\" --process-start-args x"));
        Assert.Null(DanhSachApp.SquirrelProcessStart("--processStart ..\\x.exe"));
        Assert.Equal(@"D\app-1.0.10", DanhSachApp.ChonAppSquirrel(new[] { @"D\app-1.0.9", @"D\app-1.0.10", @"D\packages" }));
    }

    [Fact]
    public void Appx_BoFrameworkHeThongKhongApp_GiaiTen()
    {
        var json = JsonSerializer.Serialize(new object[]
        {
            new { Name = "Microsoft.MinecraftUWP", PackageFamilyName = "Microsoft.MinecraftUWP_8wekyb3d8bbwe", DisplayName = "Minecraft", PublisherDisplayName = "Mojang", Version = "1.20", SoApplication = 1, SignatureKind = "Store" },
            new { Name = "Microsoft.VCLibs.140.00", PackageFamilyName = "Microsoft.VCLibs.140.00_8wekyb3d8bbwe", IsFramework = true, SoApplication = 0 },
            new { Name = "Microsoft.YourPhone", PackageFamilyName = "Microsoft.YourPhone_8wekyb3d8bbwe", DisplayName = "Phone Link", SoApplication = 1 },
            new { Name = "Microsoft.WindowsCalculator", PackageFamilyName = "Microsoft.WindowsCalculator_8wekyb3d8bbwe", DisplayName = "ms-resource:AppName", SoApplication = 1 },
            new { Name = "Contoso.BackgroundOnly", PackageFamilyName = "Contoso.BackgroundOnly_x", DisplayName = "Nền", SoApplication = 0 },
            new { Name = "Microsoft.Windows.ShellExperienceHost", PackageFamilyName = "Microsoft.Windows.ShellExperienceHost_cw5n1h2txyewy", SignatureKind = "System", NonRemovable = true, SoApplication = 1 },
        });
        var ds = DanhSachApp.TuAppx(DanhSachApp.DocAppxJson(json));
        Assert.Equal(new[] { "microsoft.minecraftuwp", "microsoft.windowscalculator" }, ds.Select(a => a.Muc).OrderBy(x => x).ToArray());
        var mc = ds.Single(a => a.Muc == "microsoft.minecraftuwp");
        Assert.Equal("appx:microsoft.minecraftuwp_8wekyb3d8bbwe", mc.Khoa);
        Assert.Equal("store", mc.Nguon);
        Assert.Equal("WindowsCalculator", ds.Single(a => a.Muc == "microsoft.windowscalculator").Ten);
    }

    // ------------------------------------------------------------------ .lnk

    private static byte[] LnkGia(string target, string? args = null, string? envTarget = null)
    {
        var ms = new MemoryStream();
        var w = new BinaryWriter(ms);
        int flags = 0x2 | 0x80 | (args != null ? 0x20 : 0);   // HasLinkInfo | IsUnicode | HasArguments
        w.Write(0x4C); w.Write(new byte[16]); w.Write(flags); w.Write(new byte[0x4C - 0x18]);
        // LinkInfo: header 0x1C (không có offset unicode) + VolumeID tối thiểu + LocalBasePath ANSI + suffix rỗng
        var basePath = Encoding.Latin1.GetBytes(target + "\0");
        int hdr = 0x1C, volOff = hdr, volSize = 0x11, baseOff = volOff + volSize, sufOff = baseOff + basePath.Length;
        int size = sufOff + 1;
        w.Write(size); w.Write(hdr); w.Write(1); w.Write(volOff); w.Write(baseOff); w.Write(0); w.Write(sufOff);
        w.Write(volSize); w.Write(3); w.Write(0); w.Write(0x10); w.Write((byte)0);
        w.Write(basePath); w.Write((byte)0);
        if (args != null) { w.Write((ushort)args.Length); w.Write(Encoding.Unicode.GetBytes(args)); }
        if (envTarget != null)
        {
            w.Write(0x314); w.Write(unchecked((int)0xA0000001)); w.Write(new byte[260]);
            var u = new byte[520]; Encoding.Unicode.GetBytes(envTarget).CopyTo(u, 0); w.Write(u);
        }
        w.Write(0);
        return ms.ToArray();
    }

    [Fact]
    public void DocLnk_LinkInfo_DoiSo_Env()
    {
        var l = DocLnk.Doc(LnkGia(@"C:\Users\aiicon\AppData\Local\Discord\Update.exe", "--processStart Discord.exe", @"%LOCALAPPDATA%\Discord\Update.exe"))!;
        Assert.Equal(@"C:\Users\aiicon\AppData\Local\Discord\Update.exe", l.Target);
        Assert.Equal("--processStart Discord.exe", l.Arguments);
        Assert.Equal(@"%LOCALAPPDATA%\Discord\Update.exe", l.EnvTarget);
        Assert.Equal(@"C:\Users\aiicon\AppData\Local\Discord\Update.exe", DocLnk.MoRongTheoHoSo(l.EnvTarget!, @"C:\Users\aiicon", _ => null));
        Assert.Equal(@"C:\Program Files\x.exe", DocLnk.MoRongTheoHoSo(@"%ProgramFiles%\x.exe", null, n => n == "ProgramFiles" ? @"C:\Program Files" : null));
        Assert.Null(DocLnk.Doc(new byte[10]));
    }

    // ------------------------------------------------------------------ PNG

    [Fact]
    public void Png_MaHoa_DungKichThuoc_VaMatNa()
    {
        var px = new byte[32 * 32 * 4];
        for (int i = 0; i < px.Length; i += 4) { px[i] = 10; px[i + 1] = 20; px[i + 2] = 30; }
        var mask = new byte[px.Length];
        for (int i = 0; i < mask.Length; i += 4) mask[i] = mask[i + 1] = mask[i + 2] = (byte)(i < mask.Length / 2 ? 0 : 255);
        Png.ApMatNa(px, mask);
        Assert.Equal(255, px[3]);
        Assert.Equal(0, px[^1]);
        var png = Png.MaHoa(32, 32, px);
        Assert.Equal((32, 32), Png.KichThuoc(png));
        var lon = Png.MaHoa(DanhSachApp.CanhIcon, DanhSachApp.CanhIcon, new byte[DanhSachApp.CanhIcon * DanhSachApp.CanhIcon * 4]);
        Assert.Equal((96, 96), Png.KichThuoc(lon));
        Assert.True(Convert.ToBase64String(png).Length < DanhSachApp.ToiDaIconBase64);
    }

    // ------------------------------------------------------------------ bam, phần đổi, đồng bộ (409)

    private static AppThat A(string ten, string phienBan = "1") =>
        new() { Khoa = "exe:c:\\g\\" + ten + ".exe", Muc = ten + ".exe", Ten = ten, Nguon = "start", PhienBan = phienBan };

    [Fact]
    public void Bam_TatDinh_KhongPhuThuocThuTu_DoiTruongThiDoi()
    {
        var a = new[] { A("a"), A("b") };
        Assert.Equal(DanhSachApp.TinhBam(a), DanhSachApp.TinhBam(Enumerable.Reverse(a)));
        Assert.NotEqual(DanhSachApp.TinhBam(a), DanhSachApp.TinhBam(new[] { A("a"), A("b", "2") }));
        var icon = A("a"); icon.Icon = "xyz"; icon.IconBam = new string('1', 64);
        Assert.NotEqual(DanhSachApp.TinhBam(new[] { A("a") }), DanhSachApp.TinhBam(new[] { icon }));
        Assert.Matches("^[0-9a-f]{64}$", DanhSachApp.TinhBam(a));
    }

    [Fact]
    public void PhanDoi_ThemDoiVaBo()
    {
        var truoc = DanhSachApp.BangVanTay(new[] { A("a"), A("b"), A("c") });
        var (them, bo) = DanhSachApp.PhanDoi(new[] { A("a"), A("b", "2"), A("d") }, truoc);
        Assert.Equal(new[] { "b.exe", "d.exe" }, them.Select(x => x.Muc).OrderBy(x => x).ToArray());
        Assert.Equal(new[] { @"exe:c:\g\c.exe" }, bo);
    }

    [Fact]
    public void ChuanHoa_CatChu_BoIconLon_TrungKhoa_GioiHan()
    {
        var dai = A("x"); dai.Ten = new string('t', 400); dai.Icon = new string('i', DanhSachApp.ToiDaIconBase64 + 1);
        var trung = A("x"); trung.Ten = "trùng";
        var ds = DanhSachApp.ChuanHoa(new[] { dai, trung }.Concat(Enumerable.Range(0, 1600).Select(i => A("n" + i))));
        Assert.Equal(DanhSachApp.ToiDaApp, ds.Count);
        var x = DanhSachApp.ChuanHoa(new[] { dai, trung }).Single();
        Assert.Equal(DanhSachApp.ToiDaChu, x.Ten.Length);
        Assert.Null(x.Icon);
        Assert.Null(x.IconBam);
        // icon PNG thật ⇒ iconBam = SHA-256 byte PNG; không phải PNG ⇒ bỏ
        var png = Convert.ToBase64String(Png.MaHoa(96, 96, new byte[96 * 96 * 4]));
        var co = A("p"); co.Icon = png;
        var hong = A("q"); hong.Icon = "aGVsbG8=";
        var r = DanhSachApp.ChuanHoa(new[] { co, hong });
        Assert.Equal(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Convert.FromBase64String(png))).ToLowerInvariant(), r[0].IconBam);
        Assert.Null(r[1].Icon);
        Assert.Null(r[1].IconBam);
    }

    [Fact]
    public void ChonLogoAppx_ScaleLonNhatTrongGioiHan_BoContrast_DuPhong150()
    {
        var tep = new (string, int, int, long)[]
        {
            ("Square44x44Logo.scale-100.png", 44, 44, 1000),
            ("Square44x44Logo.scale-400.png", 176, 176, 9000),
            ("Square44x44Logo.targetsize-256.png", 256, 256, 60000),                 // base64 > 64 KB ⇒ bỏ
            ("Square44x44Logo.targetsize-96_altform-unplated.png", 96, 96, 5000),
            ("Square44x44Logo.targetsize-256_contrast-black.png", 256, 256, 3000),   // tương phản cao ⇒ bỏ
            ("Square150x150Logo.scale-200.png", 300, 300, 20000),
            ("StoreLogo.png", 50, 50, 900),
        };
        Assert.Equal("Square44x44Logo.scale-400.png", DanhSachApp.ChonLogoAppx(new[] { @"Assets\Square44x44Logo.png" }, tep));
        Assert.Equal("Square150x150Logo.scale-200.png", DanhSachApp.ChonLogoAppx(new[] { @"Assets\Khong.png", @"Assets\Square150x150Logo.png" }, tep));
        Assert.Null(DanhSachApp.ChonLogoAppx(new[] { "Khong.png" }, tep));
    }

    private sealed class KhoGia : IKhoDanhSachApp
    {
        public string? Bam; public IReadOnlyDictionary<string, string>? Vt; public IReadOnlyDictionary<string, string>? Ic;
        public (string?, IReadOnlyDictionary<string, string>?, IReadOnlyDictionary<string, string>?) Doc() => (Bam, Vt, Ic);
        public void Luu(string bam, IReadOnlyDictionary<string, string> vt, IReadOnlyDictionary<string, string> ic) { Bam = bam; Vt = vt; Ic = new Dictionary<string, string>(ic); }
    }

    private sealed class ApiGia : IUngDungApi
    {
        public readonly List<JsonElement> Da = new();
        public int TraVe409 = 0;
        public string TraLoi = "{\"ok\":true}";
        public Task<string> GuiAsync(object body, CancellationToken ct)
        {
            var e = JsonSerializer.SerializeToElement(body, body.GetType(), Json.Options);
            Da.Add(e);
            if (!e.GetProperty("du").GetBoolean() && TraVe409-- > 0) throw new ApiException("can_gui_du", 409, code: "can_gui_du");
            return Task.FromResult(TraLoi);
        }
    }

    [Fact]
    public async Task DongBo_LanDauDu_SauDoPhanDoi_KhongDoiThiKhongGui()
    {
        var kho = new KhoGia(); var api = new ApiGia();
        var dong = new DongBoDanhSachApp(api, kho);
        var (k1, b1) = await dong.GuiAsync(new[] { A("a"), A("b") }, false, default);
        Assert.Equal(KieuGuiApp.Du, k1);
        Assert.Equal(2, api.Da[0].GetProperty("ds").GetArrayLength());
        Assert.Equal(b1, api.Da[0].GetProperty("bam").GetString());
        Assert.Equal("a.exe", api.Da[0].GetProperty("ds")[0].GetProperty("muc").GetString());

        var (k2, _) = await dong.GuiAsync(new[] { A("a"), A("b") }, false, default);
        Assert.Equal(KieuGuiApp.KhongDoi, k2);
        Assert.Single(api.Da);

        var (k3, b3) = await dong.GuiAsync(new[] { A("a"), A("c") }, false, default);
        Assert.Equal(KieuGuiApp.PhanDoi, k3);
        var p = api.Da[1];
        Assert.False(p.GetProperty("du").GetBoolean());
        Assert.Equal(b1, p.GetProperty("bamTruoc").GetString());
        Assert.Equal(b3, p.GetProperty("bam").GetString());
        Assert.Equal("c.exe", p.GetProperty("them")[0].GetProperty("muc").GetString());
        Assert.Equal(@"exe:c:\g\b.exe", p.GetProperty("bo")[0].GetString());
        Assert.Equal(b3, kho.Bam);
    }

    [Fact]
    public async Task DongBo_409CanGuiDu_GuiLaiDuNgay()
    {
        var kho = new KhoGia(); var api = new ApiGia();
        var dong = new DongBoDanhSachApp(api, kho);
        await dong.GuiAsync(new[] { A("a") }, false, default);
        api.TraVe409 = 1;
        var (k, b) = await dong.GuiAsync(new[] { A("a"), A("b") }, false, default);
        Assert.Equal(KieuGuiApp.Du, k);
        Assert.Equal(3, api.Da.Count);
        Assert.False(api.Da[1].GetProperty("du").GetBoolean());
        Assert.True(api.Da[2].GetProperty("du").GetBoolean());
        Assert.Equal(b, kho.Bam);
    }

    [Fact]
    public async Task DongBo_EpDu_VaKhongCoVanTay_GuiDu()
    {
        var kho = new KhoGia { Bam = "cu" }; var api = new ApiGia();
        var (k, _) = await new DongBoDanhSachApp(api, kho).GuiAsync(new[] { A("a") }, false, default);
        Assert.Equal(KieuGuiApp.Du, k);   // có bam nhưng mất tệp vân tay
        var (k2, _) = await new DongBoDanhSachApp(api, kho).GuiAsync(new[] { A("a") }, true, default);
        Assert.Equal(KieuGuiApp.Du, k2);   // Ba Mẹ bấm Làm mới
    }

    private static AppThat AI(string ten, string iconBam)
    {
        var a = A(ten); a.Icon = "PNG-" + ten + iconBam; a.IconBam = iconBam; return a;
    }

    [Fact]
    public async Task Icon_ChiGuiKhiMoiHoacDoi_ThieuIconThiGuiLai()
    {
        var kho = new KhoGia(); var api = new ApiGia();
        var dong = new DongBoDanhSachApp(api, kho);
        // lần đầu: đủ, kèm icon + iconBam
        await dong.GuiAsync(new[] { AI("a", "i1"), AI("b", "i2") }, false, default);
        var d0 = api.Da[0].GetProperty("ds");
        Assert.Equal("i1", d0[0].GetProperty("iconBam").GetString());
        Assert.True(d0[0].TryGetProperty("icon", out _));
        Assert.False(dong.ConIconChoGui);
        // ép đủ (Ba Mẹ Làm mới): máy chủ đã có ảnh ⇒ chỉ iconBam, không byte icon
        await dong.GuiAsync(new[] { AI("a", "i1"), AI("b", "i2") }, true, default);
        Assert.False(api.Da[1].GetProperty("ds")[0].TryGetProperty("icon", out _));
        Assert.Equal("i1", api.Da[1].GetProperty("ds")[0].GetProperty("iconBam").GetString());
        // icon b đổi ⇒ phần đổi: them chỉ b, kèm icon mới; máy chủ báo thiếu icon a ⇒ lượt sau gửi a kèm icon (bam không đổi)
        api.TraLoi = "{\"ok\":true,\"thieuIcon\":[\"exe:c:\\\\g\\\\a.exe\"]}";
        await dong.GuiAsync(new[] { AI("a", "i1"), AI("b", "i3") }, false, default);
        var p = api.Da[2];
        Assert.False(p.GetProperty("du").GetBoolean());
        Assert.Equal(1, p.GetProperty("them").GetArrayLength());
        Assert.Equal("i3", p.GetProperty("them")[0].GetProperty("iconBam").GetString());
        Assert.True(p.GetProperty("them")[0].TryGetProperty("icon", out _));
        Assert.True(dong.ConIconChoGui);
        api.TraLoi = "{\"ok\":true}";
        var (k, _) = await dong.GuiAsync(new[] { AI("a", "i1"), AI("b", "i3") }, false, default);
        Assert.Equal(KieuGuiApp.PhanDoi, k);
        var q = api.Da[3];
        Assert.Equal(q.GetProperty("bamTruoc").GetString(), q.GetProperty("bam").GetString());
        Assert.Equal("a.exe", Assert.Single(q.GetProperty("them").EnumerateArray()).GetProperty("muc").GetString());
        Assert.True(q.GetProperty("them")[0].TryGetProperty("icon", out _));
        Assert.False(dong.ConIconChoGui);
        // hết việc ⇒ không gửi
        Assert.Equal(KieuGuiApp.KhongDoi, (await dong.GuiAsync(new[] { AI("a", "i1"), AI("b", "i3") }, false, default)).Kieu);
        Assert.Equal(4, api.Da.Count);
    }

    [Fact]
    public void BanGui_NganSachIcon()
    {
        var lon = Enumerable.Range(0, 60).Select(i => { var a = A("n" + i); a.Icon = new string('x', 60 * 1024); a.IconBam = "b" + i; return a; }).ToList();
        var (gui, kem) = DongBoDanhSachApp.BanGui(lon, null);
        Assert.Equal(60, gui.Count);
        Assert.True(kem.Count < 60 && kem.Count > 0);
        Assert.True(gui.Where(g => g.Icon != null).Sum(g => (long)g.Icon!.Length) <= DanhSachApp.TongIconToiDa);
        Assert.All(gui, g => Assert.NotNull(g.IconBam));
    }

    [Fact]
    public async Task DongBo_404_NemRa()
    {
        var api = new Api404();
        var e = await Assert.ThrowsAsync<ApiException>(() => new DongBoDanhSachApp(api, new KhoGia()).GuiAsync(new[] { A("a") }, false, default));
        Assert.Equal(404, e.StatusCode);
    }

    private sealed class Api404 : IUngDungApi
    {
        public Task<string> GuiAsync(object body, CancellationToken ct) => throw new ApiException("không có", 404);
    }

    [Fact]
    public void TinHieu_DocTuPhanHoiDongBo()
    {
        Assert.Null(TinHieuDanhSachApp.Doc("{\"windows\":{}}"));
        Assert.Equal(new TinHieuDanhSachApp("b1", null), TinHieuDanhSachApp.Doc("{\"danhSachApp\":{\"bam\":\"b1\",\"yeuCau\":null}}"));
        Assert.Equal(new TinHieuDanhSachApp(null, "y2"), TinHieuDanhSachApp.Doc("{\"danhSachApp\":{\"bam\":null,\"yeuCau\":\"y2\"}}"));
        Assert.Null(TinHieuDanhSachApp.Doc("không phải json"));
    }

    private static (bool, bool)? K(bool a, bool b) => (a, b);

    [Fact]
    public void Lich_ChuKy_YeuCauMoi_BamLech_TinHieuCu()
    {
        var t = DateTimeOffset.Parse("2026-10-25T10:00:00Z");
        var daGui = new DanhSachAppDaGui { Bam = "b1", YeuCau = "y1" };
        // lần đầu (chưa quét) ⇒ quét
        Assert.Equal(K(true, false), LichDanhSachApp.Xet(t, DateTimeOffset.MinValue, DateTimeOffset.MinValue, null, null, false, null));
        // vừa quét, không tín hiệu ⇒ thôi
        Assert.Null(LichDanhSachApp.Xet(t, t.AddMinutes(-5), DateTimeOffset.MinValue, null, null, false, daGui));
        // 30 phút ⇒ quét lại
        Assert.Equal(K(true, false), LichDanhSachApp.Xet(t, t.AddMinutes(-31), DateTimeOffset.MinValue, null, null, false, daGui));
        // Ba Mẹ bấm Làm mới ⇒ quét + đủ
        Assert.Equal(K(true, true), LichDanhSachApp.Xet(t, t.AddMinutes(-5), DateTimeOffset.MinValue, new("b1", "y2"), null, false, daGui));
        // máy chủ giữ bam khác ⇒ gửi đủ (không cần quét lại)
        Assert.Equal(K(false, true), LichDanhSachApp.Xet(t, t.AddMinutes(-5), DateTimeOffset.MinValue, new("bX", "y1"), null, false, daGui));
        Assert.Equal(K(false, true), LichDanhSachApp.Xet(t, t.AddMinutes(-5), DateTimeOffset.MinValue, new(null, null), null, false, daGui));
        // tín hiệu đã xử lý (phản hồi dong-bo cũ còn bam cũ) ⇒ không gửi lại
        Assert.Null(LichDanhSachApp.Xet(t, t.AddMinutes(-5), DateTimeOffset.MinValue, new("b0", null), new("b0", null), true, daGui));
        // bam máy chủ khớp ⇒ không gì
        Assert.Null(LichDanhSachApp.Xet(t, t.AddMinutes(-5), DateTimeOffset.MinValue, new("b1", "y1"), null, false, daGui));
        // đang chờ thử lại sau lỗi mạng
        Assert.Null(LichDanhSachApp.Xet(t, DateTimeOffset.MinValue, t.AddMinutes(1), new(null, "y9"), null, false, daGui));
    }

    [Fact]
    public void KhoDanhSachApp_LuuDoc_LechBamThiKhongVanTay()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-ds-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var store = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
            store.Save(new AgentConfig { Server = "https://x", Token = "t" });
            var kho = new KhoDanhSachApp(store, Path.Combine(dir, "ds-app.txt"));
            Assert.Equal((null, null, null), kho.Doc());
            kho.Luu("b1", new Dictionary<string, string> { [@"exe:c:\a b\x.exe"] = "v1", ["appx:y"] = "v2" }, new Dictionary<string, string> { ["appx:y"] = "ib" });
            var (bam, vt, ic) = kho.Doc();
            Assert.Equal("b1", bam);
            Assert.Equal("v1", vt![@"exe:c:\a b\x.exe"]);
            Assert.Equal("ib", ic!["appx:y"]);
            Assert.False(ic.ContainsKey(@"exe:c:\a b\x.exe"));
            Assert.Equal("b1", store.Load()!.DanhSachApp!.Bam);
            store.Update(c => c.DanhSachApp!.Bam = "khac");
            Assert.Null(kho.Doc().VanTay);
        }
        finally { Directory.Delete(dir, true); }
    }
}

public class ChanAppThatTests
{
    private const string Win = @"C:\Windows";
    private const string Sid = "S-1-5-21-1111111111-2222222222-3333333333-1001";
    private static readonly string[] Safe = { @"C:\Program Files\AiiGrow", @"C:\Program Files\Windows Defender", @"C:\Program Files\Common Files" };

    [Theory]
    [InlineData(@"C:\", false)]
    [InlineData(@"C:\Windows\System32", false)]
    [InlineData(@"C:\Program Files", false)]
    [InlineData(@"C:\Program Files (x86)", false)]
    [InlineData(@"C:\Program Files\Common Files", false)]
    [InlineData(@"C:\Program Files\WindowsApps", false)]
    [InlineData(@"C:\ProgramData", false)]
    [InlineData(@"C:\ProgramData\Microsoft\Windows", false)]
    [InlineData(@"C:\Users", false)]
    [InlineData(@"C:\Users\aiicon", false)]
    [InlineData(@"C:\Users\aiicon\Downloads", false)]
    [InlineData(@"C:\Users\aiicon\AppData", false)]
    [InlineData(@"C:\Users\aiicon\AppData\Local", false)]
    [InlineData(@"C:\Users\aiicon\AppData\Local\Programs", false)]
    [InlineData(@"C:\Users\aiicon\AppData\Local\Microsoft\WindowsApps", false)]
    [InlineData(@"relative\dir", false)]
    [InlineData(@"C:\Games\..\Windows", false)]
    [InlineData(@"C:\Program Files\Roblox", true)]
    [InlineData(@"C:\Program Files (x86)\Steam", true)]
    [InlineData(@"C:\Users\aiicon\AppData\Local\Roblox", true)]
    [InlineData(@"C:\Users\aiicon\AppData\Local\Programs\Minecraft Launcher", true)]
    [InlineData(@"D:\Steam", true)]
    [InlineData(@"D:\Games", false)]
    [InlineData(@"C:\Users\aiicon\OneDrive\Desktop", false)]
    [InlineData(@"C:\Games\Foo\", true)]
    public void ThuMucHopLe(string d, bool kq) => Assert.Equal(kq, ChanAppThat.ThuMucHopLe(d, Win));

    [Fact]
    public void Chuan_BoThuMucRong_ShaSai_MucChuThuong()
    {
        var ds = ChanAppThat.Chuan(new[]
        {
            new AppBiChan { Muc = "RobloxPlayerBeta.EXE", ThuMuc = @"C:\Users\aiicon\AppData\Local", Sha256 = "XYZ" },
            new AppBiChan { Muc = " ", ThuMuc = @"C:\Program Files" },
        }, Win);
        var a = Assert.Single(ds);
        Assert.Equal("robloxplayerbeta.exe", a.Muc);
        Assert.Null(a.ThuMuc);
        Assert.Null(a.Sha256);
    }

    private sealed class Procs : IProcessControl
    {
        public List<RunningProc> Ds = new();
        public List<int> Dong = new();
        public IEnumerable<RunningProc> ListChildProcesses(int sessionId) => Ds;
        public bool Close(int id) { Dong.Add(id); return true; }
    }

    private static readonly string ShaGame = new('b', 64);

    private static Procs Mau() => new()
    {
        Ds =
        {
            new(1, @"C:\Users\aiicon\AppData\Local\Roblox\Versions\v1\RobloxPlayerBeta.exe"),
            new(2, @"C:\Games\Foo\launcher.exe"),
            new(3, @"C:\Games\Foo\bin\game.exe"),
            new(4, @"C:\Users\aiicon\Downloads\doi-ten.exe"),
            new(5, @"C:\Program Files\WindowsApps\Microsoft.MinecraftUWP_1.20_x64__8wekyb3d8bbwe\Minecraft.Windows.exe"),
            new(6, @"C:\Windows\explorer.exe"),
            new(7, @"C:\Program Files\AiiGrow\AiiGrow.Tray.exe"),
            new(8, @"C:\Program Files\Mozilla Firefox\firefox.exe"),
            new(9, @"C:\Windows\System32\notepad.exe"),
        },
    };

    [Fact]
    public void Enforce_KhopTenGoiDuongDanThuMucBam_KhongDongHeThong()
    {
        var p = Mau();
        var luat = ChanAppThat.Chuan(new[]
        {
            new AppBiChan { Muc = "robloxplayerbeta.exe" },
            new AppBiChan { Muc = "launcher.exe", DuongDan = @"C:\Games\Foo\launcher.exe", ThuMuc = @"C:\Games\Foo" },
            new AppBiChan { Muc = "microsoft.minecraftuwp" },
            new AppBiChan { Muc = "khac.exe", Sha256 = ShaGame },
            new AppBiChan { Muc = "explorer.exe" },                                     // tên tiến trình phiên ⇒ không bao giờ đóng bản thật
            new AppBiChan { Muc = "x.exe", ThuMuc = @"C:\Program Files" },            // thuMuc quá rộng ⇒ bỏ, không đóng firefox / AiiGrow
            new AppBiChan { Muc = "aiigrow.tray.exe" },
        }, Win);
        var kq = ChanAppThat.Enforce(p, 1, luat, dryRun: false, bam: path => path.EndsWith("doi-ten.exe") ? ShaGame : null, winDir: Win, safeDirs: Safe);
        Assert.Equal(new[] { 1, 2, 3, 4, 5 }, p.Dong.OrderBy(x => x).ToArray());
        Assert.Contains(kq, x => x.Exe == "game.exe" && x.Muc == "launcher.exe");
        Assert.Contains(kq, x => x.Exe == "doi-ten.exe" && x.Muc == "khac.exe");
    }

    [Fact]
    public void Review126_DuongDanWildcard_Bo_TenChungKhongKhopKhiCoDinhDanh()
    {
        Assert.Empty(ChanAppThat.Chuan(new[] { new AppBiChan { DuongDan = @"C:\*" }, new AppBiChan { DuongDan = @"C:\Users\*" } }, Win));
        Assert.Null(ChanAppThat.Chuan(new[] { new AppBiChan { Muc = "x.exe", DuongDan = @"C:\Games\X" } }, Win)[0].DuongDan);
        var luat = ChanAppThat.Chuan(new[] { new AppBiChan { Muc = "javaw.exe", DuongDan = @"C:\Games\Mc\runtime\javaw.exe" } }, Win);
        Assert.Null(ChanAppThat.Khop(@"C:\Program Files\Java\bin\javaw.exe", luat, null));
        Assert.NotNull(ChanAppThat.Khop(@"C:\Games\Mc\runtime\javaw.exe", luat, null));
        // chỉ có tên (luật chan không có trong danh sách máy) ⇒ vẫn khớp theo tên
        Assert.NotNull(ChanAppThat.Khop(@"C:\Any\javaw.exe", ChanAppThat.Chuan(new[] { new AppBiChan { Muc = "javaw.exe" } }, Win), null));
    }

    [Fact]
    public void Enforce_GiamSat_ChiLietKe_KhongDong()
    {
        var p = Mau();
        var kq = ChanAppThat.Enforce(p, 1, ChanAppThat.Chuan(new[] { new AppBiChan { Muc = "notepad.exe" } }, Win), dryRun: true, winDir: Win, safeDirs: Safe);
        Assert.Empty(p.Dong);
        Assert.Equal("notepad.exe", Assert.Single(kq).Exe);   // notepad là app người dùng mở ⇒ Ba Mẹ chặn được
    }

    [Fact]
    public void LuatAppLocker_DuongDanThuMucBamTen_BoHeThong()
    {
        var luat = ChanAppThat.LuatAppLocker(ChanAppThat.Chuan(new[]
        {
            new AppBiChan { Muc = "launcher.exe", DuongDan = @"C:\Games\Foo\launcher.exe", ThuMuc = @"C:\Games\Foo", Sha256 = ShaGame },
            new AppBiChan { Muc = "robloxplayerbeta.exe" },
            new AppBiChan { Muc = "explorer.exe" },
            new AppBiChan { Muc = "explorer.exe", DuongDan = @"C:\Windows\explorer.exe" },
            new AppBiChan { Muc = "x.exe", DuongDan = @"C:\Program Files\AiiGrow\AiiGrow.Service.exe" },
        }, Win), Win, Safe, p => p.EndsWith("launcher.exe") ? ("0x" + new string('C', 64), 1234L, "launcher.exe") : null);
        Assert.Equal(new[] { @"*\robloxplayerbeta.exe", @"C:\Games\Foo\*", @"C:\Games\Foo\launcher.exe" },
            luat.Where(l => l.Path != null).Select(l => l.Path).OrderBy(x => x, StringComparer.Ordinal).ToArray());
        var h = Assert.Single(luat, l => l.HashData != null);
        Assert.Equal(1234L, h.HashLength);
    }

    [Fact]
    public void AppLockerXml_MergeChanApp_DenyDungSid_GiuLuatNguoiKhac_GoLuatCu()
    {
        var luat = new[]
        {
            new LuatChanApp("launcher.exe (đường dẫn)", @"C:\Games\Foo\launcher.exe"),
            new LuatChanApp("launcher.exe (thư mục)", @"C:\Games\Foo\*"),
            new LuatChanApp("launcher.exe (băm)", null, "0x" + new string('C', 64), 1234, "launcher.exe"),
        };
        var cu = "<AppLockerPolicy Version=\"1\"><RuleCollection Type=\"Exe\" EnforcementMode=\"AuditOnly\">" +
                 "<FilePathRule Id=\"" + Guid.NewGuid() + "\" Name=\"QuanTri: x\" UserOrGroupSid=\"S-1-1-0\" Action=\"Allow\"><Conditions><FilePathCondition Path=\"*\" /></Conditions></FilePathRule>" +
                 "<FilePathRule Id=\"" + Guid.NewGuid() + "\" Name=\"AiiGrow: cũ\" UserOrGroupSid=\"" + Sid + "\" Action=\"Deny\"><Conditions><FilePathCondition Path=\"*\" /></Conditions></FilePathRule>" +
                 "</RuleCollection></AppLockerPolicy>";
        var xml = AppLockerXml.MergeChanApp(cu, new[] { Sid }, luat, null);
        var exe = XDocument.Parse(xml).Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == "Exe");
        Assert.Equal("Enabled", (string?)exe.Attribute("EnforcementMode"));
        Assert.Contains(exe.Elements(), e => (string?)e.Attribute("Name") == "QuanTri: x");
        Assert.DoesNotContain(exe.Elements(), e => (string?)e.Attribute("Name") == "AiiGrow: cũ");
        Assert.Contains(exe.Elements("FilePathRule"), e => (string?)e.Attribute("Action") == "Allow" && (string?)e.Attribute("UserOrGroupSid") == "S-1-1-0"
            && ((string?)e.Attribute("Name"))!.StartsWith(AppLockerXml.Prefix));
        var deny = exe.Elements().Where(e => (string?)e.Attribute("Action") == "Deny").ToList();
        Assert.Equal(3, deny.Count);
        Assert.All(deny, d => Assert.Equal(Sid, (string?)d.Attribute("UserOrGroupSid")));
        Assert.All(deny, d => Assert.StartsWith(AppLockerXml.Prefix, (string?)d.Attribute("Name")));
        var paths = deny.SelectMany(d => d.Descendants("FilePathCondition")).Select(c => (string?)c.Attribute("Path")).ToList();
        Assert.Contains(@"C:\Games\Foo\launcher.exe", paths);
        Assert.Contains(@"C:\Games\Foo\*", paths);
        var fh = deny.SelectMany(d => d.Descendants("FileHash")).Single();
        Assert.Equal("0x" + new string('C', 64), (string?)fh.Attribute("Data"));
        Assert.Equal("1234", (string?)fh.Attribute("SourceFileLength"));
        // gỡ sạch: RemoveOurs bỏ hết luật chặn app
        Assert.False(AppLockerXml.ContainsOurs(AppLockerXml.RemoveOurs(xml)));
    }

    [Fact]
    public void AppLockerXml_MergeChanApp_CoChinhSachHoc_GiuDenyHocVaDenyChan()
    {
        var xml = AppLockerXml.MergeChanApp(null, new[] { Sid }, new[] { new LuatChanApp("game.exe (tên)", @"*\game.exe") },
            new AppLockerOptions { AllowedApps = new[] { "winword.exe" } });
        var exe = XDocument.Parse(xml).Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == "Exe");
        var deny = exe.Elements("FilePathRule").Where(e => (string?)e.Attribute("Action") == "Deny").ToList();
        Assert.Equal(2, deny.Count);
        Assert.Contains(deny, d => d.Element("Exceptions")?.Elements().Any(x => (string?)x.Attribute("Path") == @"*\winword.exe") == true);
        Assert.Contains(deny, d => d.Descendants("FilePathCondition").Any(x => (string?)x.Attribute("Path") == @"*\game.exe"));
    }

    [Fact]
    public void Policy_DocBlockedApps()
    {
        var p = PolicyParser.Parse("{\"mode\":\"tu_do\",\"blockedApps\":[{\"muc\":\"RobloxPlayerBeta.exe\",\"duongDan\":\"C:\\\\Games\\\\R\\\\r.exe\",\"thuMuc\":\"C:\\\\\",\"sha256\":\"" + new string('A', 64) + "\"}]}");
        var a = Assert.Single(p.BlockedApps);
        Assert.Equal("robloxplayerbeta.exe", a.Muc);
        Assert.Equal(@"C:\Games\R\r.exe", a.DuongDan);
        Assert.Null(a.ThuMuc);
        Assert.Equal(new string('a', 64), a.Sha256);
        Assert.Empty(PolicyParser.Parse("{\"mode\":\"tu_do\"}").BlockedApps);
    }
}
