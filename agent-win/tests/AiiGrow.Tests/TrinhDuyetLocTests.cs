using System.Xml.Linq;
using AiiGrow.Core;

namespace AiiGrow.Tests;

// «Chặn theo lọc» (Thanh 25/10): ở Chặn thật trình duyệt lọc được (Chrome / Edge / Brave / Cốc Cốc) được chạy CHỈ khi luật web đang áp trong hive
// của tài khoản Con; trình duyệt lạ / đổi tên / không ký vẫn bị chặn như app chưa xếp loại.
public class TrinhDuyetLocTests
{
    private const string Con = "S-1-5-21-1-2-3-1001";
    private const string Con2 = "S-1-5-21-1-2-3-1002";
    private const string Chrome = @"SOFTWARE\Policies\Google\Chrome";
    private static readonly DateTimeOffset T0 = new(2026, 10, 25, 9, 0, 0, TimeSpan.Zero);
    private static readonly string[] Pf = { @"C:\Program Files", @"C:\Program Files (x86)" };
    private static WebPolicy Luat(params string[] chan) { var p = new WebPolicy(); p.Chan.AddRange(chan); return p; }

    [Fact]
    public void TheoSid_KhongCoLuatWeb_KhongThaTrinhDuyet()
    {
        Assert.Empty(TrinhDuyetLoc.TheoSid(null, new[] { Con }, null));            // Giám sát / mở tạm / chưa đồng bộ
        Assert.Empty(TrinhDuyetLoc.TheoSid(Luat("a.com"), null, null));
        Assert.Empty(TrinhDuyetLoc.TheoSid(Luat("a.com"), Array.Empty<string>(), null));
    }

    [Fact]
    public void TheoSid_ChiSidDaAp_BoTrinhDuyetBiHklmDe()
    {
        var td = TrinhDuyetLoc.TheoSid(Luat("a.com"), new[] { Con, "rác" }, new[] { "Chrome" });
        Assert.Equal(new[] { Con }, td.Keys);
        Assert.DoesNotContain("Chrome", td[Con]);                                     // IT đặt danh sách cả máy ⇒ luật của ta không hiệu lực ở Chrome
        Assert.Equal(new[] { "Edge", "Brave", "CocCoc" }, td[Con]);
    }

    [Fact]
    public void TenTrungWebPolicyKeys()
    {
        Assert.Equal(WebPolicyKeys.TatCa.Select(t => t.Ten), TrinhDuyetLoc.TatCa.Select(t => t.Ten));
    }

    [Fact]
    public void AppLocker_NgoaiLeTrinhDuyet_ChiChoSidDaAp()
    {
        var xml = AppLockerXml.Build(new AppLockerOptions
        {
            ChildSids = new[] { Con, Con2 }, AllowedApps = new[] { "winword.exe" },
            TrinhDuyetTheoSid = new Dictionary<string, IReadOnlyList<string>> { [Con] = new[] { "Chrome", "Edge" } },
        });
        var doc = XDocument.Parse(xml);
        XElement LuatCua(string sid) => doc.Descendants("FilePathRule").Single(r => (string?)r.Attribute("UserOrGroupSid") == sid && (string?)r.Attribute("Action") == "Deny");
        var ex = LuatCua(Con).Element("Exceptions")!.Elements().ToList();
        var pub = ex.Where(e => e.Name.LocalName == "FilePublisherCondition").ToList();
        Assert.Contains(pub, e => (string?)e.Attribute("PublisherName") == "O=GOOGLE LLC, L=MOUNTAIN VIEW, S=CALIFORNIA, C=US" && (string?)e.Attribute("ProductName") == "GOOGLE CHROME");
        Assert.Contains(pub, e => (string?)e.Attribute("ProductName") == "MICROSOFT EDGE");
        Assert.All(pub, e => Assert.NotNull(e.Element("BinaryVersionRange")));
        Assert.Contains(ex, e => (string?)e.Attribute("Path") == @"%PROGRAMFILES%\Google\Chrome\Application\*");
        Assert.Contains(ex, e => (string?)e.Attribute("Path") == @"*\winword.exe");
        // mọi FilePathCondition đứng trước FilePublisherCondition (như XML Windows xuất)
        Assert.True(ex.FindLastIndex(e => e.Name.LocalName == "FilePathCondition") < ex.FindIndex(e => e.Name.LocalName == "FilePublisherCondition"));
        // Con2 chưa có luật web trong hive ⇒ trình duyệt vẫn bị chặn
        Assert.DoesNotContain(LuatCua(Con2).Descendants(), e => e.Name.LocalName == "FilePublisherCondition");
        Assert.DoesNotContain(LuatCua(Con2).Descendants("FilePathCondition"), e => ((string?)e.Attribute("Path"))!.Contains("Chrome"));
        // gỡ sạch như mọi luật AiiGrow
        Assert.False(AppLockerXml.ContainsOurs(AppLockerXml.RemoveOurs(xml)));
    }

    [Fact]
    public void AppLocker_KhongTruyenTrinhDuyet_NhuCu()
    {
        var a = AppLockerXml.Build(new AppLockerOptions { ChildSid = Con, AllowedApps = new[] { "winword.exe" } });
        Assert.DoesNotContain("FilePublisherCondition", a);
        Assert.DoesNotContain("Chrome", a);
    }

    [Theory]
    [InlineData(@"C:\Program Files\Google\Chrome\Application\chrome.exe", true)]
    [InlineData(@"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", true)]
    [InlineData(@"C:\Program Files\Google\Chrome\Application\131.0\chrome_pwa_launcher.exe", true)]
    [InlineData(@"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe", true)]
    [InlineData(@"C:\Program Files\CocCoc\Browser\Application\browser.exe", true)]
    [InlineData(@"C:\Users\An\Downloads\chrome.exe", false)]                                  // game đổi tên chrome.exe
    [InlineData(@"C:\Program Files\Mozilla Firefox\firefox.exe", false)]                     // Firefox chưa lọc được ⇒ vẫn chặn
    [InlineData(@"C:\Program Files\Opera\opera.exe", false)]
    [InlineData(@"C:\Program Files\Google\Chrome\Application\..\..\..\Steam\game.exe", false)]
    [InlineData(@"C:\Program Files\Google\Chrome\Application:game.exe", false)]
    [InlineData(@"C:\Program Files\Google\ChromeX\Application\chrome.exe", false)]
    public void ChoChay_ThuMucCaiCaMay(string path, bool mong)
    {
        Assert.Equal(mong, TrinhDuyetLoc.ChoChay(path, new[] { "Chrome", "Edge", "Brave", "CocCoc" }, Pf, (_, _) => false));
    }

    [Fact]
    public void ChoChay_ChiTrinhDuyetDuocTha()
    {
        Assert.False(TrinhDuyetLoc.ChoChay(@"C:\Program Files\Google\Chrome\Application\chrome.exe", new[] { "Edge" }, Pf, null));
        Assert.False(TrinhDuyetLoc.ChoChay(@"C:\Program Files\Google\Chrome\Application\chrome.exe", Array.Empty<string>(), Pf, null));
        Assert.False(TrinhDuyetLoc.ChoChay(@"C:\Program Files\Google\Chrome\Application\chrome.exe", null, Pf, null));
    }

    [Fact]
    public void ChoChay_BanCaiTheoNguoiDung_PhaiCoChuKy()
    {
        const string p = @"C:\Users\An\AppData\Local\Google\Chrome\Application\chrome.exe";
        var ten = new[] { "Chrome", "Edge" };
        Assert.True(TrinhDuyetLoc.ChoChay(p, ten, Pf, (_, t) => t.Ten == "Chrome"));
        Assert.False(TrinhDuyetLoc.ChoChay(p, ten, Pf, (_, _) => false));            // chép game vào đó, không ký ⇒ chặn
        Assert.False(TrinhDuyetLoc.ChoChay(p, ten, Pf, null));
        Assert.False(TrinhDuyetLoc.ChoChay(p, ten, Pf, (_, _) => throw new IOException()));
        // Edge không cài theo người dùng ⇒ không nhận thư mục AppData
        Assert.False(TrinhDuyetLoc.ChoChay(@"C:\Users\An\AppData\Local\Microsoft\Edge\Application\msedge.exe", ten, Pf, (_, _) => true));
    }

    [Theory]
    [InlineData("CN=Google LLC, O=Google LLC, L=Mountain View, S=California, C=US", "Google LLC", true)]
    [InlineData("CN=\"Brave Software, Inc.\", O=\"Brave Software, Inc.\", L=San Francisco, S=California, C=US", "Brave Software, Inc.", true)]
    [InlineData("CN=Brave Software, Inc., O=Brave Software, Inc., L=San Francisco, S=California, C=US", "Brave Software, Inc.", true)]
    [InlineData("CN=Coc Coc Company Limited, O=Coc Coc Company Limited, L=Ha Noi, C=VN", "Coc Coc Company Limited", true)]
    [InlineData("CN=Google LLC, OU=Google LLC, O=Evil, C=US", "Google LLC", false)]
    [InlineData("CN=Self, O=Google LLC Fake, C=US", "Google LLC", false)]
    [InlineData(null, "Google LLC", false)]
    public void DungToChuc(string? chuThe, string toChuc, bool mong) => Assert.Equal(mong, TrinhDuyetLoc.DungToChuc(chuThe, toChuc));

    [Fact]
    public void ProcessEnforcer_ThaTrinhDuyet_DongBanGia()
    {
        var fake = new FakeProcessControl(
            new RunningProc(1, @"C:\Program Files\Google\Chrome\Application\chrome.exe"),
            new RunningProc(2, @"C:\Users\An\Downloads\chrome.exe"),
            new RunningProc(3, @"C:\Program Files\Mozilla Firefox\firefox.exe"));
        var ten = new[] { "Chrome" };
        var dong = ProcessEnforcer.Enforce(fake, 2, Array.Empty<string>(), safeDirs: new[] { @"C:\Program Files\AiiGrow" }, winDir: @"C:\Windows",
            choThem: x => TrinhDuyetLoc.ChoChay(x, ten, Pf, null));
        Assert.Equal(new[] { 2, 3 }, fake.Closed);
        Assert.Equal(new[] { "chrome.exe", "firefox.exe" }, dong);
        // không thả (luật web chưa áp) ⇒ Chrome bị đóng như app chưa xếp loại
        var fake2 = new FakeProcessControl(new RunningProc(1, @"C:\Program Files\Google\Chrome\Application\chrome.exe"));
        ProcessEnforcer.Enforce(fake2, 2, Array.Empty<string>(), safeDirs: new[] { @"C:\Program Files\AiiGrow" }, winDir: @"C:\Windows");
        Assert.Equal(new[] { 1 }, fake2.Closed);
    }

    [Fact]
    public void Hive_DaApCho_ChiSidDaGhiDungLuat()
    {
        var h = new FakeHiveHost(); h.CoHoSo.Add(Con);   // Con2 chưa có hồ sơ (chưa đăng nhập lần nào)
        var w = new WebPolicyHives(h);
        var r = w.Ap(Luat("a.com"), null, new[] { Con, Con2 }, T0);
        Assert.Equal(new[] { Con }, r.DaApCho);
        // luật đổi mà ghi hive lỗi ⇒ không còn «đang áp» (vân tay cũ) — trình duyệt bị thu lại
        h.NemLoi.Add(Con);
        Assert.Empty(w.Ap(Luat("b.com"), null, new[] { Con, Con2 }, T0.AddSeconds(30)).DaApCho);
        h.NemLoi.Clear();
        Assert.Equal(new[] { Con }, w.Ap(Luat("b.com"), null, new[] { Con, Con2 }, T0.AddSeconds(60)).DaApCho);
        // về Giám sát (gỡ) ⇒ rỗng
        Assert.Empty(w.Ap(null, null, new[] { Con, Con2 }, T0.AddSeconds(90)).DaApCho);
        // chưa đọc được tài khoản ⇒ rỗng
        Assert.Empty(new WebPolicyHives(h).Ap(Luat("a.com"), null, null, T0).DaApCho);
    }

    [Fact]
    public void Web_TatDoH_GoKhiGiamSat()
    {
        var reg = new FakeWebRegistry();
        var a = new WebPolicyApplier(reg);
        a.Ap(Luat("a.com"), null);
        Assert.Equal("off", reg.Chuoi[Chrome + "|DnsOverHttpsMode"]);
        Assert.Equal("off", reg.Chuoi[@"SOFTWARE\Policies\Microsoft\Edge|DnsOverHttpsMode"]);
        Assert.Equal(1, reg.Dword[Chrome + "|IncognitoModeAvailability"]);
        Assert.Equal(1, reg.Dword[@"SOFTWARE\Policies\Microsoft\Edge|InPrivateModeAvailability"]);
        a.GoTatCa();
        Assert.Empty(reg.Chuoi);
        Assert.Empty(reg.Dword);
        var s = WebGuard.KichBanGoChinhSach();
        Assert.Contains("DnsOverHttpsMode", s);
        Assert.Contains("foreach($d in $ws)", s);
    }
}
