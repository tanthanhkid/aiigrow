using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Agent đọc Policy từ POST /api/device/dong-bo của máy chủ AiiGrow (trường `windows` máy chủ dịch sẵn) và gửi phút dùng theo tổng ngày.</summary>
public class DongBoAiiGrowTests
{
    private const string PhanHoi = """
        {"serverTime":"2026-10-21T10:00:00.000Z","nextCheckSec":300,"gioMaySai":false,"con":{"id":"c1","ten":"Ken","nhom":"nhi"},
         "luat":[{"muc":"roblox.exe","loai":"giai_tri"}],"lenh":[],
         "windows":{"serverTime":"2026-10-21T10:00:00.000Z","childName":"Ken","mode":"hoc","locked":false,"lockReason":null,
                    "allowedApps":["explorer.exe","scratch.exe"],"learningApps":["scratch.exe"],"minutesLeft":null,"nextCheckSec":300,
                    "canExchangePoints":true}}
        """;

    [Fact]
    public void LayWindows_DocDungPolicyMayChuDichSan()
    {
        var p = PolicyParser.Parse(ApiClient.LayWindows(PhanHoi));
        Assert.Equal(Modes.Hoc, p.Mode);
        Assert.Equal("Ken", p.ChildName);
        Assert.Contains("scratch.exe", p.AllowedApps);
        Assert.DoesNotContain("roblox.exe", p.AllowedApps);
        Assert.Null(p.MinutesLeft);
    }

    [Fact]
    public void LayWindows_KhoaNgay()
    {
        var raw = PhanHoi.Replace("\"mode\":\"hoc\",\"locked\":false,\"lockReason\":null", "\"mode\":\"khoa\",\"locked\":true,\"lockReason\":\"khoa\"");
        var eff = PolicyEvaluator.Evaluate(PolicyParser.Parse(ApiClient.LayWindows(raw)), DateTimeOffset.Now, 0);
        Assert.True(eff.Locked);
        Assert.Equal(LockReasons.Khoa, eff.LockReason);
    }

    [Fact]
    public void LayWindows_KhongCoTruongWindows_TraNguyenVan()
        => Assert.Equal("{\"mode\":\"tu_do\"}", ApiClient.LayWindows("{\"mode\":\"tu_do\"}"));

    [Fact]
    public void UsageTotals_GuiTongTrongNgay_KhongGuiPhanTang()
    {
        var t = new UsageTotals();
        t.Add(new[] { new UsageEntry("2026-10-21", "Roblox.exe", "Roblox", 5) });
        var r = t.Add(new[] { new UsageEntry("2026-10-21", "roblox.exe", "Roblox", 3), new UsageEntry("2026-10-21", "scratch.exe", "Scratch", 2) });
        Assert.Equal(8, r.Single(x => x.AppId == "roblox.exe").Minutes);
        Assert.Equal(2, r.Single(x => x.AppId == "scratch.exe").Minutes);
        var homSau = t.Add(new[] { new UsageEntry("2026-10-22", "roblox.exe", "Roblox", 1) });
        Assert.Single(homSau);
        Assert.Equal(1, homSau[0].Minutes);
    }
}
