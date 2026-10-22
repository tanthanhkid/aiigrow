using AiiGrow.Core;

namespace AiiGrow.Tests;

// An toàn & gỡ cài đặt: chế độ hiệu lực (máy chủ thắng cục bộ), fail-open khi mồ côi, thứ tự gỡ (báo trước — dọn sau, không tự dừng chính mình).

public class CheDoHieuLucTests
{
    [Theory]
    [InlineData("chan", "giam-sat", false, "chan")]       // máy chủ thắng cục bộ
    [InlineData("giam-sat", "chan", false, "giam-sat")]   // Ba Mẹ tắt chặn từ xa
    [InlineData(null, "chan", false, "chan")]             // Ba Mẹ chưa chọn ⇒ giữ chế độ đang chạy (máy cài sẵn «chặn»)
    [InlineData("la", "chan", false, "chan")]             // giá trị lạ bị bỏ qua
    [InlineData(null, null, false, "giam-sat")]
    [InlineData(null, "CHAN ", false, "chan")]
    [InlineData("chan", "chan", true, "giam-sat")]        // mồ côi ⇒ luôn giám sát
    public void Chon(string? mayChu, string? cucBo, bool moCoi, string ketQua)
        => Assert.Equal(ketQua, CheDoHieuLuc.Chon(mayChu, cucBo, moCoi));

    [Fact]
    public void Policy_DocCheDo()
    {
        Assert.Equal("chan", PolicyParser.Parse("""{"mode":"hoc","cheDo":"CHAN"}""").CheDo);
        Assert.Null(PolicyParser.Parse("""{"mode":"hoc","cheDo":"tat"}""").CheDo);
        Assert.Null(PolicyParser.Parse("""{"mode":"hoc"}""").CheDo);
        // dong-bo: Policy nằm trong `windows`
        var raw = """{"lenh":[],"windows":{"mode":"khoa","locked":true,"cheDo":"giam-sat"}}""";
        Assert.Equal("giam-sat", PolicyParser.Parse(ApiClient.LayWindows(raw)).CheDo);
    }

    [Fact]
    public void Khay_GiamSat_KhongHienManKhoa()
    {
        var s = new TrayState { Locked = true, LockReason = LockReasons.Ngu, LockGraceLeftSec = 5 };
        CheDoHieuLuc.ChoKhayGiamSat(s);
        Assert.False(s.Locked);
        Assert.Null(s.LockReason);
        Assert.Null(s.LockGraceLeftSec);
    }

    [Fact]
    public void Status_GuiCheDoThat()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new AgentStatus { CheDo = CheDoAgent.Chan }, Json.Options);
        Assert.Contains("\"cheDo\":\"chan\"", json);
    }
}

public class MoCoiTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 22, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void TuChoi_DuoiNguong_ChuaMoCoi_QuaNguong_GiamSatVaBoPolicyCuoi()
    {
        var c = new AgentConfig { Server = "s", Token = "t", CheDo = CheDoAgent.Chan, LastPolicyJson = """{"mode":"khoa"}""", LastPolicyAt = T0 };
        Assert.True(MoCoi.GhiTuChoi(c, T0));
        Assert.False(MoCoi.GhiTuChoi(c, T0.AddHours(1)), "lần từ chối sau không dời mốc");
        Assert.Equal(T0, c.TuChoiTu);
        Assert.False(MoCoi.La(c, T0.AddHours(MoCoi.GioNguong).AddMinutes(-1)));
        Assert.Equal(CheDoAgent.Chan, c.CheDo);
        Assert.NotNull(c.LastPolicyJson);

        Assert.True(MoCoi.GhiTuChoi(c, T0.AddHours(MoCoi.GioNguong)));   // tới ngưỡng ⇒ áp fail-open ngay
        Assert.True(MoCoi.La(c, T0.AddHours(MoCoi.GioNguong)));
        Assert.Equal(CheDoAgent.GiamSat, c.CheDo);
        Assert.Null(c.LastPolicyJson);
        Assert.Null(c.LastPolicyAt);
        Assert.Equal(CheDoAgent.GiamSat, CheDoHieuLuc.Chon("chan", c.CheDo, MoCoi.La(c, T0.AddHours(7))));
    }

    [Fact]
    public void DongBoDuoc_HetMoCoi()
    {
        var c = new AgentConfig { TuChoiTu = T0 };
        Assert.True(MoCoi.La(c, T0.AddHours(8)));
        Assert.True(MoCoi.GhiThanhCong(c));
        Assert.False(MoCoi.La(c, T0.AddHours(8)));
        Assert.False(MoCoi.GhiThanhCong(c));
    }

    [Fact]
    public void DongHoLui_DemLai()
    {
        var c = new AgentConfig { TuChoiTu = T0.AddDays(3) };   // mốc ở tương lai (giờ máy bị chỉnh lùi)
        Assert.False(MoCoi.La(c, T0));
        Assert.True(MoCoi.GhiTuChoi(c, T0));
        Assert.Equal(T0, c.TuChoiTu);
    }

    [Fact]
    public void MocTuChoi_LuuQuaKhoiDongLai()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-mocoi-" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
            store.Save(new AgentConfig { Server = "s", Token = "t", CheDo = CheDoAgent.Chan, LastPolicyJson = "{}" });
            store.UpdateIf(c => MoCoi.GhiTuChoi(c, T0));
            var lai = new ConfigStore(store.FilePath, b => b, b => b);
            Assert.Equal(T0, lai.Load()!.TuChoiTu);
            lai.UpdateIf(c => MoCoi.ApDung(c, T0.AddHours(6.5)));
            var cfg = lai.Load()!;
            Assert.Equal(CheDoAgent.GiamSat, cfg.CheDo);
            Assert.Null(cfg.LastPolicyJson);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }
}

/// <summary>Ghi lại thứ tự mọi lời gọi hệ thống / mạng để kiểm thứ tự gỡ.</summary>
internal sealed class SoGhi
{
    public readonly List<string> Ds = new();
    public void Ghi(string s) { lock (Ds) Ds.Add(s); }
    public int Vi(string s) => Ds.IndexOf(s);
}

internal sealed class FakeOps : ICleanupOps
{
    private readonly SoGhi _g;
    public bool XoaHet = true;
    public string? NemLoiO;
    public FakeOps(SoGhi g) { _g = g; }
    private void B(string s) { _g.Ghi(s); if (s == NemLoiO) throw new InvalidOperationException("hỏng " + s); }
    public void TatKhoiPhucDichVu() => B("tat_khoi_phuc");
    public void DungVaXoaDichVu() => B("dung_xoa_dich_vu");
    public void HenDonTachRoi() => B("hen_don");
    public void GoAppLocker() => B("applocker");
    public void GoKhay() => B("khay");
    public void GoThongBaoDangNhap() => B("thong_bao");
    public void GoMucUngDung() => B("muc_ung_dung");
    public void XoaCauHinh() => B("xoa_cau_hinh");
    public bool XoaThuMuc() { B("xoa_thu_muc"); return XoaHet; }
}

public class GoCaiDatTests
{
    private sealed class Uninstaller : ISystemUninstaller
    {
        private readonly SoGhi _g; public Uninstaller(SoGhi g) { _g = g; }
        public string Run() { _g.Ghi("go"); return ""; }
    }

    private sealed class Api : IHeartbeatApi
    {
        private readonly SoGhi _g;
        public Exception? Loi;
        public bool Treo;
        public bool TokenBiHuy;
        public Api(SoGhi g) { _g = g; }
        public Task<SyncResult> SyncAsync(object s, string t, CancellationToken ct = default) => Task.FromResult(new SyncResult());
        public async Task AckLenhAsync(string id, CancellationToken ct = default)
        {
            TokenBiHuy = ct.IsCancellationRequested;
            if (Treo) await Task.Delay(Timeout.Infinite, ct);
            if (Loi != null) throw Loi;
            _g.Ghi("ack:" + id);
        }
        public Task SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default) => Task.CompletedTask;
    }

    private static SyncResult Go => SyncResult.Parse("""{"lenh":[{"id":"9","loai":"go"}]}""");

    [Fact]
    public async Task LenhGo_BaoXongTruoc_RoiMoiGo_KeCaKhiDichVuDangDung()
    {
        var g = new SoGhi();
        var api = new Api(g);
        using var dangDung = new CancellationTokenSource();
        dangDung.Cancel();   // dịch vụ đang dừng: ct đã huỷ — lời báo vẫn phải đi
        Assert.True(await new CommandProcessor(new Uninstaller(g)).ProcessAsync(Go, api, dangDung.Token));
        Assert.Equal(new[] { "ack:9", "go" }, g.Ds);
        Assert.False(api.TokenBiHuy);
    }

    [Fact]
    public async Task MatMang_ChuaGo_DeLanSauNhanLaiLenh()
    {
        var g = new SoGhi();
        var api = new Api(g) { Loi = new ApiException("mất mạng") };
        Assert.False(await new CommandProcessor(new Uninstaller(g)).ProcessAsync(Go, api));
        Assert.Empty(g.Ds);
        api.Loi = new ApiException("máy chủ lỗi", 503);
        Assert.False(await new CommandProcessor(new Uninstaller(g)).ProcessAsync(Go, api));
        Assert.Empty(g.Ds);
    }

    [Fact]
    public async Task BaoXongTreo_HetGio_ChuaGo()
    {
        var g = new SoGhi();
        var api = new Api(g) { Treo = true };
        Assert.False(await new CommandProcessor(new Uninstaller(g), TimeSpan.FromMilliseconds(100)).ProcessAsync(Go, api));
        Assert.Empty(g.Ds);
    }

    [Theory]
    [InlineData(401)]
    [InlineData(404)]
    public async Task MayChuDaBoMay_VanGo(int ma)
    {
        var g = new SoGhi();
        Assert.True(await new CommandProcessor(new Uninstaller(g)).ProcessAsync(Go, new Api(g) { Loi = new ApiException("x", ma) }));
        Assert.Equal(new[] { "go" }, g.Ds);
    }

    [Fact]
    public void TuDichVu_KhongTuDungChinhMinh_TatKhoiPhucTruoc_HenDonTachRoi()
    {
        var g = new SoGhi();
        SystemCleanup.Run(new FakeOps(g), tuDichVu: true);
        Assert.Equal(0, g.Vi("tat_khoi_phuc"));
        Assert.Equal(1, g.Vi("hen_don"));
        Assert.DoesNotContain("dung_xoa_dich_vu", g.Ds);
        Assert.DoesNotContain("xoa_thu_muc", g.Ds);   // exe đang chạy — tác vụ tách rời xoá sau khi dịch vụ thoát
        foreach (var b in new[] { "applocker", "khay", "thong_bao", "muc_ung_dung", "xoa_cau_hinh" }) Assert.Contains(b, g.Ds);
    }

    [Fact]
    public void TuSetup_DungDichVuTruocKhiGoAppLocker_XoaHetThiKhongHen()
    {
        var g = new SoGhi();
        SystemCleanup.Run(new FakeOps(g), tuDichVu: false);
        Assert.Equal(0, g.Vi("tat_khoi_phuc"));
        Assert.True(g.Vi("dung_xoa_dich_vu") < g.Vi("applocker"), "dịch vụ còn chạy thì có thể áp lại luật");
        Assert.True(g.Vi("xoa_cau_hinh") < g.Vi("xoa_thu_muc"));
        Assert.DoesNotContain("hen_don", g.Ds);

        var g2 = new SoGhi();
        SystemCleanup.Run(new FakeOps(g2) { XoaHet = false }, tuDichVu: false);
        Assert.Equal("hen_don", g2.Ds[^1]);   // còn tệp (Setup đang chạy từ thư mục cài) ⇒ hẹn xoá nốt
    }

    [Fact]
    public void MotBuocLoi_CacBuocSauVanChay_ChayLaiDuoc()
    {
        var g = new SoGhi();
        var log = SystemCleanup.Run(new FakeOps(g) { NemLoiO = "applocker" }, tuDichVu: false);
        Assert.Contains("✗ Gỡ luật AppLocker", log);
        Assert.Contains("xoa_cau_hinh", g.Ds);
        Assert.Contains("muc_ung_dung", g.Ds);
        var lan2 = new SoGhi();
        SystemCleanup.Run(new FakeOps(lan2), tuDichVu: false);   // chạy lại: cùng các bước, không ném
        Assert.Equal(g.Ds, lan2.Ds);
    }

    private static ConfigStore Store(string dir, AgentConfig? cfg)
    {
        var s = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
        if (cfg != null) s.Save(cfg);
        return s;
    }

    [Fact]
    public async Task GoTaiMay_BaoMayChuTruocKhiXoaToken()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-go-" + Guid.NewGuid().ToString("N"));
        try
        {
            var g = new SoGhi();
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "tok" });
            string? tokenDaGui = null;
            var log = await LocalUninstall.RunAsync(store, (c, ct) => { tokenDaGui = c.Token; g.Ghi("da_go"); return Task.CompletedTask; }, new FakeOps(g));
            Assert.Equal("tok", tokenDaGui);
            Assert.Equal(0, g.Vi("da_go"));
            Assert.True(g.Vi("da_go") < g.Vi("xoa_cau_hinh"));
            Assert.Contains("Đã báo máy chủ", log);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task GoTaiMay_KhongBaoDuoc_VanGoSach()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-go-" + Guid.NewGuid().ToString("N"));
        try
        {
            var g = new SoGhi();
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "tok" });
            var log = await LocalUninstall.RunAsync(store, (c, ct) => throw new ApiException("mất mạng"), new FakeOps(g));
            Assert.Contains("Chưa báo được máy chủ", log);
            Assert.Contains("xoa_cau_hinh", g.Ds);
            // token đã bị thu hồi (máy đã rời gia đình) ⇒ coi như đã báo
            var g2 = new SoGhi();
            var log2 = await LocalUninstall.RunAsync(store, (c, ct) => throw new ApiException("token_sai", 401), new FakeOps(g2));
            Assert.Contains("không còn trong gia đình", log2);
            // chưa ghép / đã gỡ rồi ⇒ không gọi máy chủ, vẫn dọn
            var g3 = new SoGhi();
            await LocalUninstall.RunAsync(Store(dir + "-trong", null), (c, ct) => { g3.Ghi("da_go"); return Task.CompletedTask; }, new FakeOps(g3));
            Assert.DoesNotContain("da_go", g3.Ds);
            Assert.Contains("xoa_cau_hinh", g3.Ds);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void KichBanDon_ChoDichVuDung_XoaDichVu_TuXoaTacVu()
    {
        var k = SystemCleanup.KichBanDonTachRoi("AiiGrowService", @"C:\Program Files\AiiGrow", @"C:\ProgramData\Ai'iGrow", AppsEntry.Key);
        Assert.Contains("Status -eq 'Stopped'", k);
        Assert.Contains("start= disabled", k);
        Assert.Contains("sc.exe delete $n", k);
        Assert.Contains(@"'C:\ProgramData\Ai''iGrow'", k);   // nháy đơn được thoát
        Assert.Contains(@"HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow", k);
        Assert.True(k.IndexOf("Stop-Service") < k.IndexOf("sc.exe delete"));
        Assert.Contains("Unregister-ScheduledTask -TaskName 'AiiGrow-Dontay'", k);
    }
}
