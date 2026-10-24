using AiiGrow.Core;

namespace AiiGrow.Tests;

// Luật web theo hive tài khoản Con (issue #68 S1), Win Home (BUG-005), khay chỉ chạy ở phiên Con (BUG-007). Phần THUẦN — registry thật nằm ở WindowsWebHiveHost.

internal sealed class FakeHiveHost : IWebHiveHost
{
    public readonly FakeWebRegistry Hklm = new();
    public readonly Dictionary<string, FakeWebRegistry> Hive = new(StringComparer.OrdinalIgnoreCase);
    public readonly HashSet<string> CoHoSo = new(StringComparer.OrdinalIgnoreCase);
    public IWebPolicyRegistry May => Hklm;
    public bool VoiHive(string sid, Action<IWebPolicyRegistry> fn)
    {
        if (!CoHoSo.Contains(sid)) return false;
        if (!Hive.TryGetValue(sid, out var r)) Hive[sid] = r = new FakeWebRegistry();
        fn(r);
        return true;
    }
}

public class WebHiveTests
{
    private const string Con = "S-1-5-21-1-2-3-1001";
    private const string BaMe = "S-1-5-21-1-2-3-1000";
    private const string Chrome = @"SOFTWARE\Policies\Google\Chrome";
    private static readonly DateTimeOffset T0 = new(2026, 10, 24, 9, 0, 0, TimeSpan.Zero);
    private static WebPolicy Luat(params string[] chan) { var p = new WebPolicy(); p.Chan.AddRange(chan); return p; }

    [Fact]
    public void ChiGhiHiveCuaCon_KhongDungHklmVaKhongDungHiveBaMe()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.CoHoSo.Add(BaMe);
        var r = new WebPolicyHives(h).Ap(Luat("gamek.vn"), "s.vn", new[] { Con }, T0);
        Assert.True(r.DaDoi);
        Assert.Equal(new[] { "gamek.vn" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
        Assert.False(h.Hive.ContainsKey(BaMe));          // tài khoản Ba Mẹ không bị chạm tới
        Assert.Empty(h.Hklm.Ds);                          // HKLM không còn luật nào
    }

    [Fact]
    public void GoHklmCuMotLan()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        var w = new WebPolicyHives(h);
        Assert.True(w.Ap(Luat("a.com"), null, new[] { Con }, T0).DaGoHklm);
        var n = h.Hklm.SoLanGhi;
        Assert.True(n > 0);
        Assert.False(w.Ap(Luat("a.com"), null, new[] { Con }, T0.AddSeconds(30)).DaGoHklm);
        Assert.Equal(n, h.Hklm.SoLanGhi);
    }

    [Fact]
    public void KhongDoi_KhongGhiLai_QuaHanGhiLai()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        var w = new WebPolicyHives(h);
        w.Ap(Luat("a.com"), null, new[] { Con }, T0);
        var n = h.Hive[Con].SoLanGhi;
        Assert.False(w.Ap(Luat("a.com"), null, new[] { Con }, T0.AddSeconds(30)).DaDoi);
        Assert.Equal(n, h.Hive[Con].SoLanGhi);
        // Con tự xoá luật trong HKCU của mình ⇒ sau 5 phút dịch vụ ghi lại, không báo «đổi»
        h.Hive[Con].Ds.Clear();
        Assert.False(w.Ap(Luat("a.com"), null, new[] { Con }, T0 + WebPolicyHives.GhiLaiSau + TimeSpan.FromSeconds(1)).DaDoi);
        Assert.Equal(new[] { "a.com" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
    }

    [Fact]
    public void DoiLuat_BaoDaDoi_GoLuat_BaoDaDoi()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        var w = new WebPolicyHives(h);
        w.Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.True(w.Ap(Luat("a.com", "b.com"), null, new[] { Con }, T0.AddSeconds(30)).DaDoi);
        Assert.Equal(new[] { "a.com", "b.com" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
        Assert.True(w.Ap(null, null, new[] { Con }, T0.AddSeconds(60)).DaDoi);
        Assert.False(h.Hive[Con].Ds.ContainsKey(Chrome + @"\URLBlocklist"));
    }

    [Fact]
    public void ChuaCoHoSo_BaoLai_VaApKhiHoSoXuatHien()
    {
        var h = new FakeHiveHost();
        var w = new WebPolicyHives(h);
        var r = w.Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.Equal(new[] { Con }, r.ChuaCoHive);
        Assert.False(r.DaDoi);
        h.CoHoSo.Add(Con);
        r = w.Ap(Luat("a.com"), null, new[] { Con }, T0.AddSeconds(30));
        Assert.Empty(r.ChuaCoHive);
        Assert.True(r.DaDoi);
        Assert.Equal(new[] { "a.com" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
    }

    [Fact]
    public void ConRoiDanhSach_HiveCuDuocGo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        var w = new WebPolicyHives(h);
        w.Ap(Luat("a.com"), null, new[] { Con }, T0);
        var r = w.Ap(Luat("a.com"), null, Array.Empty<string>(), T0.AddSeconds(30));
        Assert.True(r.DaDoi);
        Assert.False(h.Hive[Con].Ds.ContainsKey(Chrome + @"\URLBlocklist"));
    }

    [Fact]
    public void SidSai_BiBo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add("bậy");
        var r = new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { "bậy" }, T0);
        Assert.Empty(h.Hive);
        Assert.Empty(r.ChuaCoHive);
    }

    [Fact]
    public void Lap_ChedoMo_KhongBaoGioCoDauSao()
    {
        var p = new WebPolicy { CheDo = WebPolicy.Mo, Chan = { "gamek.vn" }, Cho = { "x.com" } };
        var (chan, cho) = WebPolicyKeys.Lap(p, "s.vn");
        Assert.DoesNotContain("*", chan);
        Assert.DoesNotContain("*", cho);
    }

    [Fact]
    public void Lap_ChiChoPhep_ChanTatCaBangDauSao()
    {
        var p = new WebPolicy { CheDo = WebPolicy.ChiChoPhep, Cho = { "classroom.google.com" } };
        var (chan, cho) = WebPolicyKeys.Lap(p, "s.vn");
        Assert.Contains("*", chan);
        Assert.Contains("classroom.google.com", cho);
    }

    [Theory]
    [InlineData("Core", true)]
    [InlineData("CoreSingleLanguage", true)]
    [InlineData("CoreN", true)]
    [InlineData("Professional", false)]
    [InlineData("Enterprise", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void WinHome_NhanTheoEditionId(string? ed, bool home) => Assert.Equal(home, AppLockerKhaDung.LaBanHome(ed));

    [Fact]
    public void AppLockerKhaDung_TinhTheoEditionVaCmdlet()
    {
        Assert.True(AppLockerKhaDung.Tinh("Professional", true));
        Assert.True(AppLockerKhaDung.Tinh("Professional", null));
        Assert.False(AppLockerKhaDung.Tinh("Professional", false));
        Assert.False(AppLockerKhaDung.Tinh("Core", true));
    }

    [Fact]
    public void QuyenBaoVe_WinHome_KhongTinhThieuAppLocker()
    {
        var q = QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, appLockerApplied: false, trayAlive: true, childSessionActive: true, appLockerKhaDung: false);
        Assert.False(q.ContainsKey("appLocker"));
        var pro = QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, false, true, true, appLockerKhaDung: true);
        Assert.False(pro["appLocker"]);
    }

    [Fact]
    public void KhayChayOPhien_TheoTaiKhoanCon()
    {
        var ds = new[] { new LocalAccount("thanh", "S-1-5-21-1-2-3-1000", true), new LocalAccount("be", "S-1-5-21-1-2-3-1001", false) };
        Assert.True(QuyenPhien.KhayChayOPhien("be", "be", ds));
        Assert.False(QuyenPhien.KhayChayOPhien("thanh", "be", ds));       // cấu hình có tài khoản Con ⇒ chỉ đúng tài khoản đó
        Assert.False(QuyenPhien.KhayChayOPhien("thanh", null, ds));       // cài một chạm: quản trị không có khay
        Assert.True(QuyenPhien.KhayChayOPhien("be", null, ds));
        Assert.True(QuyenPhien.KhayChayOPhien("la", null, ds));           // không biết ⇒ giữ khay
        Assert.True(QuyenPhien.KhayChayOPhien(null, "be", ds));
    }

    [Fact]
    public void TenDepApp_VaPlayChoices()
    {
        Assert.Equal("Microsoft Edge", TrayView.FriendlyAppName("msedge.exe", null));
        Assert.Equal("Game-thu", TrayView.FriendlyAppName("game-thu.exe", null));
        var p = PolicyParser.Parse("""{"playChoices":["Roblox.exe","roblox.exe"]}""");
        Assert.Equal(new[] { "roblox.exe" }, p.PlayChoices);
    }
}
