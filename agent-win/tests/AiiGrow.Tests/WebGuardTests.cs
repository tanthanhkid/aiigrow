using AiiGrow.Core;

namespace AiiGrow.Tests;

// Lọc web theo tên miền bằng chính sách Chrome/Edge (URLBlocklist) + ghi lịch sử web. Phần THUẦN — registry thật nằm ở WindowsWebPolicyRegistry.

internal sealed class FakeWebRegistry : IWebPolicyRegistry
{
    public readonly Dictionary<string, List<string>> Ds = new();
    public readonly Dictionary<string, int> Dword = new();
    public int SoLanGhi;
    public void DatDanhSach(string khoaDs, IReadOnlyList<string> muc)
    {
        SoLanGhi++;
        if (muc.Count == 0) { if (Ds.Remove(khoaDs)) SoMucDaXoa++; } else Ds[khoaDs] = muc.ToList();
    }
    public void DatDword(string khoa, string ten, int giaTri) { SoLanGhi++; Dword[khoa + "|" + ten] = giaTri; }
    public void GoDword(string khoa, string ten) { SoLanGhi++; if (Dword.Remove(khoa + "|" + ten) | Chuoi.Remove(khoa + "|" + ten)) SoMucDaXoa++; }
    public readonly Dictionary<string, string> Chuoi = new();
    public void DatChuoi(string khoa, string ten, string giaTri) { SoLanGhi++; Chuoi[khoa + "|" + ten] = giaTri; }
    public void GoChuoiNeu(string khoa, string ten, string giaTri) { SoLanGhi++; if (Chuoi.TryGetValue(khoa + "|" + ten, out var v) && v == giaTri && Chuoi.Remove(khoa + "|" + ten)) SoMucDaXoa++; }
    public void GoKhoaNeuTrong(string khoa) { }
    public int SoMucDaXoa { get; private set; }
    public readonly HashSet<string> MucKhac = new();   // danh sách có mục người khác đặt (IT «1»…)
    public bool CoMucCuaTa(string khoaDs) => Ds.ContainsKey(khoaDs);
    public bool CoMucNguoiKhac(string khoaDs) => MucKhac.Contains(khoaDs);
    public int? DocDword(string khoa, string ten) => Dword.TryGetValue(khoa + "|" + ten, out var v) ? v : null;
}

public class WebPolicyTests
{
    private const string Chrome = @"SOFTWARE\Policies\Google\Chrome";
    private const string Edge = @"SOFTWARE\Policies\Microsoft\Edge";

    [Fact]
    public void Parse_TuDongBo_DocWindowsWeb()
    {
        var p = WebPolicy.Parse("""{"lenh":[],"windows":{"mode":"hoc","web":{"cheDo":"chi_cho_phep","chan":["Gamek.vn","*.zing.vn","rác","gamek.vn"],"cho":["classroom.google.com"]}}}""");
        Assert.NotNull(p);
        Assert.Equal(WebPolicy.ChiChoPhep, p!.CheDo);
        Assert.Equal(new[] { "gamek.vn", "zing.vn" }, p.Chan);   // chuẩn hoá, bỏ trùng, bỏ mục sai
        Assert.Equal(new[] { "classroom.google.com" }, p.Cho);
    }

    [Fact]
    public void Parse_KhoiWebTrucTiep_VaThieu()
    {
        Assert.Equal(WebPolicy.Mo, WebPolicy.Parse("""{"web":{"chan":["a.com"]}}""")!.CheDo);
        Assert.Null(WebPolicy.Parse("""{"windows":{"mode":"hoc"}}"""));   // máy chủ cũ chưa có web ⇒ không áp gì
        Assert.Null(WebPolicy.Parse(null));
        Assert.Null(WebPolicy.Parse("không phải json"));
    }

    [Theory]
    [InlineData("GameK.vn", "gamek.vn")]
    [InlineData("*.gamek.vn", "gamek.vn")]
    [InlineData(" .a.b.com ", "a.b.com")]
    [InlineData("localhost", null)]
    [InlineData("a b.com", null)]
    [InlineData("", null)]
    public void Sach(string vao, string? ra) => Assert.Equal(ra, WebPolicy.Sach(vao));

    [Fact]
    public void Lap_ChedoMo_ChiChanDanhSach()
    {
        var (chan, cho) = WebPolicyKeys.Lap(new WebPolicy { Chan = { "gamek.vn" }, Cho = { "x.com" } }, "api.aiigrow.vn");
        Assert.Equal(new[] { "gamek.vn" }, chan);
        Assert.Equal(new[] { "x.com" }, cho);
    }

    [Fact]
    public void Lap_ChiChoPhep_ChanTatCa_ChuaMayChuVaTrangNoiBo()
    {
        var (chan, cho) = WebPolicyKeys.Lap(new WebPolicy { CheDo = WebPolicy.ChiChoPhep, Chan = { "gamek.vn" }, Cho = { "x.com" } }, "api.aiigrow.vn");
        Assert.Equal("*", chan[0]);
        Assert.Contains("gamek.vn", chan);
        Assert.Contains("chrome://*", cho);
        Assert.Contains("api.aiigrow.vn", cho);   // Ba Mẹ bấm «mở» được vẫn vào được máy chủ
        Assert.Contains("x.com", cho);
    }

    [Fact]
    public void Lap_ChanTran()
    {
        var p = new WebPolicy();
        for (int i = 0; i < 1500; i++) p.Chan.Add($"site{i}.com");
        Assert.Equal(WebPolicyKeys.TranMuc, WebPolicyKeys.Lap(p, null).Chan.Count);
    }

    [Fact]
    public void LaCuaTa_ChiTenSoLonHon90000()
    {
        Assert.True(WebPolicyKeys.LaCuaTa("90001"));
        Assert.False(WebPolicyKeys.LaCuaTa("1"));
        Assert.False(WebPolicyKeys.LaCuaTa("90000"));
        Assert.False(WebPolicyKeys.LaCuaTa("abc"));
    }

    [Fact]
    public void Applier_AiGamekGhiChoChromeVaEdge_VaCoBaoVe()
    {
        var reg = new FakeWebRegistry();
        var ap = new WebPolicyApplier(reg);
        Assert.True(ap.Ap(new WebPolicy { Chan = { "gamek.vn" } }, "s.vn"));
        Assert.Equal(new[] { "gamek.vn" }, reg.Ds[Chrome + @"\URLBlocklist"]);
        Assert.Equal(new[] { "gamek.vn" }, reg.Ds[Edge + @"\URLBlocklist"]);
        Assert.Equal(1, reg.Dword[Chrome + "|IncognitoModeAvailability"]);
        Assert.Equal(1, reg.Dword[Edge + "|InPrivateModeAvailability"]);
        Assert.Equal(0, reg.Dword[Chrome + "|AllowDeletingBrowserHistory"]);
        Assert.False(reg.Ds.ContainsKey(Chrome + @"\URLAllowlist"));
    }

    [Fact]
    public void Applier_KhongDoi_KhongGhiLai_DoiThiGhi()
    {
        var reg = new FakeWebRegistry();
        var ap = new WebPolicyApplier(reg);
        var p = new WebPolicy { Chan = { "gamek.vn" } };
        Assert.True(ap.Ap(p, null));
        var n = reg.SoLanGhi;
        Assert.False(ap.Ap(new WebPolicy { Chan = { "gamek.vn" } }, null));
        Assert.Equal(n, reg.SoLanGhi);
        Assert.True(ap.Ap(new WebPolicy { Chan = { "gamek.vn", "zing.vn" } }, null));
        Assert.Equal(new[] { "gamek.vn", "zing.vn" }, reg.Ds[Chrome + @"\URLBlocklist"]);
    }

    [Fact]
    public void Applier_BoChan_GoSach()
    {
        var reg = new FakeWebRegistry();
        var ap = new WebPolicyApplier(reg);
        ap.Ap(new WebPolicy { Chan = { "gamek.vn" } }, null);
        Assert.True(ap.Ap(null, null));   // Ba Mẹ chuyển giám sát / bỏ hết chặn
        Assert.Empty(reg.Ds);
        Assert.Empty(reg.Dword);
        Assert.False(ap.GoTatCa());       // đã gỡ rồi ⇒ không ghi lại
    }

    [Fact]
    public void Applier_LoiGhi_ThuLai()
    {
        var reg = new LoiMotLan();
        var ap = new WebPolicyApplier(reg);
        Assert.Throws<IOException>(() => ap.Ap(new WebPolicy { Chan = { "a.com" } }, null));
        Assert.True(ap.Ap(new WebPolicy { Chan = { "a.com" } }, null));   // lần sau vẫn ghi (không coi là đã áp)
    }

    private sealed class LoiMotLan : IWebPolicyRegistry
    {
        private bool _da;
        public void DatDanhSach(string k, IReadOnlyList<string> m) { if (!_da) { _da = true; throw new IOException("registry"); } }
        public void DatDword(string k, string t, int g) { }
        public void GoDword(string k, string t) { }
        public void GoKhoaNeuTrong(string k) { }
    }

    [Fact]
    public void KichBanGoChinhSach_NhacDenKhoaVaCo()
    {
        var s = WebGuard.KichBanGoChinhSach();
        Assert.Contains(Chrome, s);
        Assert.Contains(Edge, s);
        Assert.Contains("URLBlocklist", s);
        Assert.Contains("URLAllowlist", s);
        Assert.Contains("90000", s);
        Assert.Contains("AllowDeletingBrowserHistory", s);
        Assert.Contains(@"SOFTWARE\Policies\CocCoc\Browser", s);
        Assert.Contains("gpupdate.exe /target:computer /force", s);
        Assert.Contains("Go-Web 'HKLM:' $true", s);     // HKLM: cờ DWORD chỉ gỡ khi còn dấu AiiGrow (cờ của IT giữ nguyên)
        Assert.Contains("$du=$true", s);                 // dấu thứ hai: đủ ba cờ đúng giá trị ở mọi trình duyệt (như GoHklmCu)
        Assert.Contains("if($ok){", s);                  // mốc «đã dọn hive» chỉ đặt khi mọi hồ sơ dọn được
        Assert.Contains("$webSach", s);                  // tác vụ chỉ tự huỷ khi đã dọn hive xong
        Assert.DoesNotContain("-like 'S-1-5-21-*'", s);  // không nhận khoá «.bak»
        Assert.NotEqual(s, WebGuard.KichBanGoChinhSach()); // mỗi lần gỡ một mã mốc riêng
    }
}

public class WebGuardCanApTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeMilliseconds(1_700_000_000_000);
    private const string Json = """{"windows":{"web":{"cheDo":"mo","chan":["gamek.vn"],"cho":[]}}}""";

    private static AgentConfig Cfg(string cheDo = CheDoAgent.Chan) => new()
    {
        Server = "https://s.vn", Token = "t", DeviceId = "d", CheDo = cheDo, LastPolicyJson = Json, LienLacCuoi = Now,
    };

    [Fact] public void ChanThat_CoDanhSach() => Assert.Equal(new[] { "gamek.vn" }, WebGuard.CanAp(Cfg(), false, Now)!.Chan);
    [Fact] public void GiamSat_Go() => Assert.Null(WebGuard.CanAp(Cfg(CheDoAgent.GiamSat), false, Now));
    [Fact] public void DangGo_Go() => Assert.Null(WebGuard.CanAp(Cfg(), true, Now));
    [Fact] public void ChuaGhep_Go() => Assert.Null(WebGuard.CanAp(new AgentConfig { CheDo = CheDoAgent.Chan, LastPolicyJson = Json }, false, Now));
    [Fact] public void KhongCoCauHinh_Go() => Assert.Null(WebGuard.CanAp(null, false, Now));
    [Fact] public void ChuaCoKhoiWeb_Go()
    {
        var c = Cfg(); c.LastPolicyJson = """{"windows":{"mode":"hoc"}}""";
        Assert.Null(WebGuard.CanAp(c, false, Now));
    }

    [Fact]
    public void MoCoi_Go()
    {
        var c = Cfg();
        c.TuChoiTu = Now.AddHours(-(MoCoi.GioNguong + 1));
        Assert.Null(WebGuard.CanAp(c, false, Now));
    }

    [Fact]
    public void MoTamBangMaOffline_Go()
    {
        var c = Cfg();
        c.MoTamOffline.UnlockFrom = Now.AddMinutes(-5);
        c.MoTamOffline.UnlockUntil = Now.AddMinutes(30);
        Assert.Null(WebGuard.CanAp(c, false, Now));
        Assert.NotNull(WebGuard.CanAp(c, false, Now.AddMinutes(40)));   // hết hạn mở ⇒ chặn lại
    }
}

public class WebHistoryTests
{
    private static readonly DateTimeOffset T = new(2026, 10, 22, 9, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData("https://www.gamek.vn/tin/abc?x=1", "gamek.vn")]
    [InlineData("http://m.youtube.com/watch?v=1", "youtube.com")]
    [InlineData("https://online.hdbank.com.vn/", "hdbank.com.vn")]
    [InlineData("https://news.bbc.co.uk/", "bbc.co.uk")]
    [InlineData("https://classroom.google.com/c/1", "google.com")]
    [InlineData("http://192.168.1.2/", null)]
    [InlineData("http://localhost:3000/", null)]
    [InlineData("chrome://settings", null)]
    [InlineData("file:///C:/a.html", null)]
    [InlineData("không phải url", null)]
    public void Goc(string url, string? ra) => Assert.Equal(ra, WebDomain.Goc(url));

    [Fact]
    public void ChromeTime_KhuVongTron()
    {
        var micro = ChromeTime.FromDateTimeOffset(T);
        Assert.Equal(T, ChromeTime.ToDateTimeOffset(micro));
        Assert.Equal(11_644_473_600_000_000L, ChromeTime.FromDateTimeOffset(DateTimeOffset.UnixEpoch));
    }

    [Fact]
    public void TongHop_GopTheoNgayVaMien_TranMotLuot()
    {
        var ds = WebHistory.TongHop(new[]
        {
            new WebVisit("https://www.gamek.vn/a", T, 60),
            new WebVisit("https://gamek.vn/b", T.AddMinutes(10), 120),
            new WebVisit("https://gamek.vn/c", T.AddDays(1), 30),
            new WebVisit("https://youtube.com/", T, 24 * 3600),     // tab bỏ quên cả ngày ⇒ cắt 3 giờ
            new WebVisit("chrome://history", T, 99),
            new WebVisit("https://neg.com/", T, -5),
        });
        var g = ds.Single(x => x.TenMien == "gamek.vn" && x.Ngay == "2026-10-22");
        Assert.Equal(2, g.SoLan);
        Assert.Equal(180, g.Giay);
        Assert.Equal(T.AddMinutes(10), g.LanCuoi);
        Assert.Equal(1, ds.Single(x => x.TenMien == "gamek.vn" && x.Ngay == "2026-10-23").SoLan);
        Assert.Equal(3 * 3600, ds.Single(x => x.TenMien == "youtube.com").Giay);
        Assert.Equal(0, ds.Single(x => x.TenMien == "neg.com").Giay);
        Assert.DoesNotContain(ds, x => x.TenMien.Contains("chrome"));
    }

    [Fact]
    public void TongHop_BoQuaMayChu()
    {
        var ds = WebHistory.TongHop(new[] { new WebVisit("https://aiigrow.vn/x", T, 10), new WebVisit("https://a.com/", T, 10) }, "aiigrow.vn");
        Assert.Equal("a.com", Assert.Single(ds).TenMien);
    }

    [Fact]
    public void MocDoc_HomQuaLucNuaDem()
    {
        var l = new DateTimeOffset(2026, 10, 22, 15, 30, 0, TimeZoneInfo.Local.GetUtcOffset(new DateTime(2026, 10, 22)));
        var m = WebHistory.MocDoc(l).ToLocalTime();
        Assert.Equal(21, m.Day);
        Assert.Equal(0, m.Hour);
    }
}

public class WebGoCaiDatTests
{
    private sealed class OpsGoWeb : ICleanupOps, IWebCleanup
    {
        public readonly List<string> Ds = new();
        public void TatKhoiPhucDichVu() => Ds.Add("tat");
        public void DungVaXoaDichVu() => Ds.Add("dung");
        public void HenDonTachRoi() => Ds.Add("hen");
        public void GoAppLocker() => Ds.Add("applocker");
        public void TraQuyenQuanTri() => Ds.Add("quyen");
        public void GoKhay() => Ds.Add("khay");
        public void GoThongBaoDangNhap() => Ds.Add("tb");
        public void GoMucUngDung() => Ds.Add("muc");
        public void XoaCauHinh() => Ds.Add("cfg");
        public bool XoaThuMuc() { Ds.Add("thumuc"); return true; }
        public void GoChinhSachWeb() => Ds.Add("web");
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Run_GoChinhSachWeb_TruocCongAppLocker(bool tuDichVu)
    {
        var o = new OpsGoWeb();
        SystemCleanup.Run(o, tuDichVu);
        Assert.Contains("web", o.Ds);
        Assert.True(o.Ds.IndexOf("web") < o.Ds.IndexOf("applocker"));
        Assert.True(o.Ds.IndexOf("web") < o.Ds.IndexOf("cfg"));
    }
}
