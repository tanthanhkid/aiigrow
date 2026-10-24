using AiiGrow.Core;

namespace AiiGrow.Tests;

// Luật web theo hive tài khoản Con (issue #68 S1), Win Home (BUG-005), khay chỉ chạy ở phiên Con (BUG-007). Phần THUẦN — registry thật nằm ở WindowsWebHiveHost.

internal sealed class FakeHiveHost : IWebHiveHost
{
    public readonly FakeWebRegistry Hklm = new();
    public readonly Dictionary<string, FakeWebRegistry> Hive = new(StringComparer.OrdinalIgnoreCase);
    public readonly HashSet<string> CoHoSo = new(StringComparer.OrdinalIgnoreCase);
    public IWebPolicyRegistry May => Hklm;
    public int SoLanVoi;
    public bool VoiHive(string sid, Action<IWebPolicyRegistry> fn)
    {
        SoLanVoi++;
        if (NemLoi.Contains(sid)) throw new UnauthorizedAccessException("Access to the registry key is denied.");
        if (!CoHoSo.Contains(sid)) return false;
        if (!Hive.TryGetValue(sid, out var r)) Hive[sid] = r = new FakeWebRegistry();
        fn(r);
        return true;
    }
    public readonly HashSet<string> NemLoi = new(StringComparer.OrdinalIgnoreCase);
    public readonly HashSet<string> ChuaNap = new(StringComparer.OrdinalIgnoreCase);   // hồ sơ có nhưng Con chưa đăng nhập (hive chưa nạp)
    public bool DangNap(string sid) => CoHoSo.Contains(sid) && !ChuaNap.Contains(sid);
    public bool ConHoSo(string sid) => CoHoSo.Contains(sid);
    public Dictionary<string, string> DaLuu = new(StringComparer.OrdinalIgnoreCase);
    public int SoLanLuu;
    public IReadOnlyDictionary<string, string> DocDaGhi() => new Dictionary<string, string>(DaLuu, StringComparer.OrdinalIgnoreCase);
    public void LuuDaGhi(IReadOnlyDictionary<string, string> ds) { DaLuu = new(ds, StringComparer.OrdinalIgnoreCase); SoLanLuu++; }
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
        h.Hklm.Ds[Chrome + @"\URLBlocklist"] = new() { "a.com" };   // luật bản cũ trong HKLM
        var w = new WebPolicyHives(h);
        Assert.True(w.Ap(Luat("a.com"), null, new[] { Con }, T0).DaGoHklm);
        Assert.Empty(h.Hklm.Ds);
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
    public void HiveChuaNap_KhongNapTamLaiMoi5Phut()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.ChuaNap.Add(Con);
        var w = new WebPolicyHives(h);
        w.Ap(Luat("a.com"), null, new[] { Con }, T0);
        var n = h.Hive[Con].SoLanGhi;
        w.Ap(Luat("a.com"), null, new[] { Con }, T0 + WebPolicyHives.GhiLaiSau + TimeSpan.FromMinutes(1));
        Assert.Equal(n, h.Hive[Con].SoLanGhi);   // Con chưa đăng nhập thì không sửa được luật ⇒ không nạp NTUSER.DAT lại
        Assert.True(w.Ap(Luat("b.com"), null, new[] { Con }, T0 + TimeSpan.FromMinutes(7)).DaDoi);   // luật đổi thì vẫn ghi ngay
    }

    [Fact]
    public void ChuaDocDuocTaiKhoan_GiuNguyenLuat_KhongGoNham()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        var w = new WebPolicyHives(h);
        w.Ap(Luat("a.com"), null, new[] { Con }, T0);
        var r = w.Ap(Luat("a.com"), null, null, T0.AddSeconds(30));
        Assert.False(r.DaDoi);
        Assert.Equal(new[] { "a.com" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
        // nhưng cần GỠ (giám sát…) thì vẫn gỡ ở hive đã ghi
        Assert.True(w.Ap(null, null, null, T0.AddSeconds(60)).DaDoi);
        Assert.False(h.Hive[Con].Ds.ContainsKey(Chrome + @"\URLBlocklist"));
    }

    [Fact]
    public void KhoiDongLai_NhoHiveDaGhi_GoKhiConRoiDanhSach_KhongBaoDoiGia()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.CoHoSo.Add(BaMe);
        new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.True(h.DaLuu.ContainsKey(Con));
        // dịch vụ khởi động lại, luật không đổi ⇒ không báo «đổi» (khay không bắn thông báo giả)
        var w2 = new WebPolicyHives(h);
        Assert.False(w2.Ap(Luat("a.com"), null, new[] { Con }, T0.AddMinutes(1)).DaDoi);
        // khởi động lại lần nữa, Con không còn trong danh sách ⇒ hive cũ vẫn được gỡ
        var w3 = new WebPolicyHives(h);
        Assert.True(w3.Ap(Luat("a.com"), null, new[] { BaMe }, T0.AddMinutes(2)).DaDoi);
        Assert.False(h.Hive[Con].Ds.ContainsKey(Chrome + @"\URLBlocklist"));
        Assert.False(h.DaLuu.ContainsKey(Con));   // không còn là Con ⇒ thôi nhớ
    }

    [Fact]
    public void GiamSat_KhoiDongLai_KhongNapLaiHiveConChiDeGoThuKhongCo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.ChuaNap.Add(Con);
        new WebPolicyHives(h).Ap(null, null, new[] { Con }, T0);
        Assert.Equal(1, h.SoLanVoi);
        Assert.StartsWith("go:", h.DaLuu[Con]);
        // dịch vụ khởi động lại, vẫn Giám sát ⇒ không nạp tạm NTUSER.DAT của Con (Con gõ mật khẩu đúng lúc đó sẽ vào hồ sơ tạm)
        new WebPolicyHives(h).Ap(null, null, new[] { Con }, T0.AddMinutes(1));
        Assert.Equal(1, h.SoLanVoi);
        // chuyển Chặn thật ⇒ ghi ngay
        Assert.True(new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0.AddMinutes(2)).DaDoi);
        Assert.Equal(new[] { "a.com" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
    }

    [Theory]
    [InlineData("AiiGrowTmp_S-1-5-21-1-2-3-1001", true)]
    [InlineData("AiiGrowGo_S-1-5-21-1-2-3-1001", true)]
    [InlineData("S-1-5-21-1-2-3-1001", false)]
    [InlineData(".DEFAULT", false)]
    public void HiveTam_NhanCaHaiTienTo(string ten, bool tam) => Assert.Equal(tam, WindowsWebHiveHost.LaHiveTam(ten));

    [Theory]
    [InlineData("S-1-5-21-1-2-3-1001", true)]
    [InlineData("S-1-12-1-111-222-333-444", true)]   // tài khoản Microsoft Entra ID: bộ gỡ cũng phải duyệt
    [InlineData("S-1-5-18", false)]
    [InlineData("S-1-5-21-1-2-3-1001_Classes", false)]
    public void LaSidNguoiDung_GomCaEntraId(string sid, bool kq) => Assert.Equal(kq, WindowsWebHiveHost.LaSidNguoiDung(sid));

    [Fact]
    public void GhiHiveLoi_BaoLoiRieng_KhongNhamLaChuaCoHoSo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.NemLoi.Add(Con);
        var r = new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.Empty(r.ChuaCoHive);
        Assert.Single(r.LoiHive!);
        Assert.StartsWith(Con + ":", r.LoiHive![0]);
    }

    [Fact]
    public void GoHklm_MotLanChoCaDoiMay_KhongDungLaiSauKhoiDong()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.True(h.DaLuu.ContainsKey(WebPolicyHives.MocHklm));
        // IT / Ba Mẹ đặt cờ ẩn danh trong HKLM sau đó ⇒ dịch vụ khởi động lại KHÔNG xoá
        h.Hklm.Dword[Chrome + "|IncognitoModeAvailability"] = 1;
        var n = h.Hklm.SoLanGhi;
        new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0.AddMinutes(1));
        Assert.Equal(n, h.Hklm.SoLanGhi);
        Assert.Equal(1, h.Hklm.Dword[Chrome + "|IncognitoModeAvailability"]);
    }

    [Fact]
    public void GoHklmCu_GiamSatKhongCoDauAiiGrow_GiuCoCuaIT()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        h.Hklm.Dword[Chrome + "|IncognitoModeAvailability"] = 1;   // IT tắt ẩn danh cho cả máy
        new WebPolicyHives(h).Ap(null, null, new[] { Con }, T0);
        Assert.Equal(1, h.Hklm.Dword[Chrome + "|IncognitoModeAvailability"]);
    }

    [Fact]
    public void GoHklmCu_CoDauAiiGrow_GoCaCo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        h.Hklm.Ds[Chrome + @"\URLBlocklist"] = new() { "a.com" };
        h.Hklm.Dword[Chrome + "|IncognitoModeAvailability"] = 1;
        new WebPolicyHives(h).Ap(null, null, new[] { Con }, T0);
        Assert.Empty(h.Hklm.Dword);
        // bản cũ Chặn thật với danh sách rỗng: chỉ còn ĐỦ ba cờ ở cả bốn trình duyệt (dấu riêng của AiiGrow) ⇒ gỡ
        var h2 = new FakeHiveHost(); h2.CoHoSo.Add(Con);
        foreach (var t in WebPolicyKeys.TatCa) foreach (var (ten, gt) in WebPolicyKeys.Co(t)) h2.Hklm.Dword[t.Khoa + "|" + ten] = gt;
        new WebPolicyHives(h2).Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.Empty(h2.Hklm.Dword);
        // CÀI MỚI ở Chặn thật trên máy IT đã tắt ẩn danh (chỉ Chrome) ⇒ không có dấu AiiGrow ⇒ giữ cờ của IT
        var h3 = new FakeHiveHost(); h3.CoHoSo.Add(Con);
        h3.Hklm.Dword[Chrome + "|IncognitoModeAvailability"] = 1;
        new WebPolicyHives(h3).Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.Equal(1, h3.Hklm.Dword[Chrome + "|IncognitoModeAvailability"]);
    }

    [Fact]
    public void ChuaBietTaiKhoanCon_KhongGoHklmNgay_Qua2PhutThiGo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        h.Hklm.Ds[Chrome + @"\URLBlocklist"] = new() { "a.com" };   // luật bản cũ đang chặn
        var w = new WebPolicyHives(h);
        Assert.False(w.Ap(Luat("a.com"), null, null, T0).DaGoHklm);    // chưa ghi được hive Con ⇒ chưa gỡ HKLM (Con không lướt tự do)
        Assert.True(h.Hklm.Ds.ContainsKey(Chrome + @"\URLBlocklist"));
        Assert.True(w.Ap(Luat("a.com"), null, new[] { Con }, T0.AddSeconds(30)).DaGoHklm);   // hive Con có luật rồi mới gỡ HKLM
        Assert.Equal(new[] { "a.com" }, h.Hive[Con].Ds[Chrome + @"\URLBlocklist"]);
        var h2 = new FakeHiveHost();
        h2.Hklm.Ds[Chrome + @"\URLBlocklist"] = new() { "a.com" };
        var w2 = new WebPolicyHives(h2);
        w2.Ap(Luat("a.com"), null, null, T0);
        Assert.True(w2.Ap(Luat("a.com"), null, null, T0.AddMinutes(2)).DaGoHklm);   // không đọc được tài khoản Con mãi ⇒ vẫn gỡ (Ba Mẹ không bị chặn mãi)
    }

    [Fact]
    public void GhiHiveConLoi_KhongGoHklm_Qua10PhutThiGo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.NemLoi.Add(Con);
        h.Hklm.Ds[Chrome + @"\URLBlocklist"] = new() { "a.com" };   // luật bản cũ đang là lớp chặn duy nhất
        var w = new WebPolicyHives(h);
        Assert.False(w.Ap(Luat("a.com"), null, new[] { Con }, T0).DaGoHklm);
        Assert.True(h.Hklm.Ds.ContainsKey(Chrome + @"\URLBlocklist"));
        h.NemLoi.Clear();
        Assert.True(w.Ap(Luat("a.com"), null, new[] { Con }, T0.AddSeconds(30)).DaGoHklm);   // ghi được rồi mới gỡ
        var h2 = new FakeHiveHost(); h2.CoHoSo.Add(Con); h2.NemLoi.Add(Con);
        h2.Hklm.Ds[Chrome + @"\URLBlocklist"] = new() { "a.com" };
        var w2 = new WebPolicyHives(h2);
        w2.Ap(Luat("a.com"), null, new[] { Con }, T0);
        Assert.True(w2.Ap(Luat("a.com"), null, new[] { Con }, T0.AddMinutes(10)).DaGoHklm);   // kẹt mãi ⇒ lưới đỡ
    }

    [Fact]
    public void DanhSachCaMayCuaIT_BaoTrinhDuyetBiDe()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        h.Hklm.MucKhac.Add(Chrome + @"\URLBlocklist");
        Assert.Equal(new[] { "Chrome" }, new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0).HklmDe);
        Assert.Empty(new WebPolicyHives(h).Ap(null, null, new[] { Con }, T0).HklmDe);   // Giám sát: không có gì để báo
    }

    [Fact]
    public void HklmSach_KhongBaoDaGo()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);
        Assert.False(new WebPolicyHives(h).Ap(Luat("a.com"), null, new[] { Con }, T0).DaGoHklm);
    }

    [Fact]
    public void GoHiveTaiKhoanCu_KhongBaoDoiChoConHienTai_HoSoBiXoaThiQuen()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con); h.CoHoSo.Add(BaMe);
        var w = new WebPolicyHives(h);
        w.Ap(Luat("a.com"), null, new[] { Con, BaMe }, T0);
        // BaMe rời danh sách: hive được gỡ (DaDoi ⇒ báo trình duyệt cả máy) nhưng KHÔNG báo khay của Con (không thông báo giả)
        var r0 = w.Ap(Luat("a.com"), null, new[] { Con }, T0.AddSeconds(30));
        Assert.True(r0.DaDoi);
        Assert.False(r0.DoiChoConHienTai);
        Assert.False(h.Hive[BaMe].Ds.ContainsKey(Chrome + @"\URLBlocklist"));
        // hồ sơ Con bị xoá khỏi máy khi Con rời danh sách ⇒ không báo «chưa áp được» mãi
        h.CoHoSo.Remove(Con);
        var r = w.Ap(Luat("a.com"), null, Array.Empty<string>(), T0.AddSeconds(60));
        Assert.Empty(r.ChuaCoHive);
        Assert.False(h.DaLuu.ContainsKey(Con));
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
    public void AppLockerKhaDung_Chot_KhongThayCmdletTrenProChuaKetLuanNgay()
    {
        Assert.Equal((false, true), AppLockerKhaDung.Chot("Core", null));
        Assert.Equal((false, true), AppLockerKhaDung.Chot("CoreSingleLanguage", true));
        Assert.Equal((true, true), AppLockerKhaDung.Chot("Professional", true));
        Assert.Equal((true, false), AppLockerKhaDung.Chot("Professional", null));
        Assert.Equal((true, false), AppLockerKhaDung.Chot("Professional", false));   // Pro không thấy cmdlet: KHÔNG gắn «Win Home», vẫn gỡ được luật đã áp
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

    [Fact]
    public void KichBanDonTachRoi_VuaThamSoTacVu()
    {
        // Tham số tác vụ (-EncodedCommand = UTF-16 → base64 ≈ 2,7 lần) giới hạn ~32K ký tự; e2e 24/10 từng lỗi «The filename or extension is too long».
        var kb = SystemCleanup.KichBanDonTachRoi("AiiGrowService", @"C:\Program Files\AiiGrow", @"C:\ProgramData\AiiGrow", @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow");
        var inner = Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes(SystemCleanup.BocNen(kb)));
        var outer = Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes("$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -EncodedCommand " + inner + "'"));
        Assert.True(outer.Length < 28000, "lệnh đăng ký tác vụ dài " + outer.Length);   // Windows: dòng lệnh ≤ 32767
    }

    [Fact]
    public void BocNen_GiaiNenRaDungKichBan()
    {
        var kb = WebGuard.KichBanGoChinhSach();
        var bo = SystemCleanup.BocNen(kb);
        var m = System.Text.RegularExpressions.Regex.Match(bo, "FromBase64String\\('([^']+)'\\)");
        Assert.True(m.Success);
        using var z = new System.IO.Compression.GZipStream(new MemoryStream(Convert.FromBase64String(m.Groups[1].Value)), System.IO.Compression.CompressionMode.Decompress);
        using var r = new StreamReader(z, System.Text.Encoding.UTF8);
        Assert.Equal(kb, r.ReadToEnd());
    }
}

public class AclChinhSachTests
{
    private const string Con = "S-1-5-21-1-2-3-1001";
    private static (string, System.Security.AccessControl.RegistryRights, bool) Q(string sid, System.Security.AccessControl.RegistryRights r, bool cho = true) => (sid, r, cho);

    [Fact]
    public void AclMacDinhPolicies_ConChiDoc_LaAnToan()
    {
        Assert.True(AclChinhSach.AnToan(AclChinhSach.HeThong, new[]
        {
            Q(AclChinhSach.HeThong, System.Security.AccessControl.RegistryRights.FullControl),
            Q(AclChinhSach.QuanTri, System.Security.AccessControl.RegistryRights.FullControl),
            Q(Con, System.Security.AccessControl.RegistryRights.ReadKey),
            Q("S-1-3-0", (System.Security.AccessControl.RegistryRights)0x10000000),   // CREATOR OWNER GENERIC_ALL (chỉ khoá con)
        }));
    }

    [Fact]
    public void ConCoQuyenGhi_HoacChuLaCon_HoacGenericWrite_KhongAnToan()
    {
        Assert.False(AclChinhSach.AnToan(AclChinhSach.HeThong, new[] { Q(Con, System.Security.AccessControl.RegistryRights.FullControl) }));   // thừa kế SOFTWARE
        Assert.False(AclChinhSach.AnToan(AclChinhSach.HeThong, new[] { Q("S-1-5-32-545", System.Security.AccessControl.RegistryRights.SetValue) }));
        Assert.False(AclChinhSach.AnToan(AclChinhSach.HeThong, new[] { Q(Con, (System.Security.AccessControl.RegistryRights)0x40000000) }));
        Assert.False(AclChinhSach.AnToan(Con, new[] { Q(Con, System.Security.AccessControl.RegistryRights.ReadKey) }));   // chủ khoá đổi được ACL
        Assert.True(AclChinhSach.AnToan(AclChinhSach.QuanTri, new[] { Q(Con, System.Security.AccessControl.RegistryRights.FullControl, cho: false) }));   // quy tắc CẤM không trao quyền
    }

    [Fact]
    public void DuongCanKhoa_TuPoliciesToiKhoaLuat_BoQuaKhoaNgoai()
    {
        Assert.Equal(new[] { @"SOFTWARE\Policies", @"SOFTWARE\Policies\Google", @"SOFTWARE\Policies\Google\Chrome", @"SOFTWARE\Policies\Google\Chrome\URLBlocklist" },
            AclChinhSach.DuongCanKhoa(@"SOFTWARE\Policies\Google\Chrome\URLBlocklist"));
        Assert.Empty(AclChinhSach.DuongCanKhoa(@"SOFTWARE\Microsoft\Windows"));
        Assert.Empty(AclChinhSach.DuongCanKhoa(@"SOFTWARE\PoliciesX\A"));
    }
}
