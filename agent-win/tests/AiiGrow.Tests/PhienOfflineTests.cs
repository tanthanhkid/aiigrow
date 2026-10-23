using System.Net;
using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>0.2.4 — phút chơi khi mất mạng (BRD 6.7) + app tiền cảnh gửi lên cho «đang dùng thật» (BRD 4.4).</summary>
public class PhienOfflineTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 23, 17, 0, 0, TimeSpan.FromHours(7));

    private const string WinCoPhien = """
        {"serverTime":"2026-10-23T10:00:00.000Z","childName":"Ken","mode":"hoc","locked":false,"lockReason":null,
         "allowedApps":["explorer.exe","scratch.exe","roblox.exe"],"learningApps":["scratch.exe"],"minutesLeft":null,"nextCheckSec":30,
         "canExchangePoints":true,"playSessionId":"ph1","playApp":"Roblox.EXE","playWeb":false,"playOfflineMinutes":3}
        """;

    private const string WinPhienWeb = """
        {"mode":"hoc","allowedApps":["explorer.exe","msedge.exe","chrome.exe","brave.exe"],"learningApps":["chrome.exe"],
         "playSessionId":"ph2","playApp":"youtube.com","playWeb":true,"playOfflineMinutes":10}
        """;

    private static Policy P(string json = WinCoPhien) => PolicyParser.Parse(json);

    [Fact]
    public void Parser_DocTruongPhienChoi_ChuThuong_VaMayChuCuKhongCo()
    {
        var p = P();
        Assert.Equal("ph1", p.PlaySessionId);
        Assert.Equal("roblox.exe", p.PlayApp);
        Assert.False(p.PlayWeb);
        Assert.Equal(3, p.PlayOfflineMinutes);
        var cu = PolicyParser.Parse("""{"mode":"hoc","allowedApps":["explorer.exe"]}""");
        Assert.Null(cu.PlaySessionId); Assert.Null(cu.PlayApp); Assert.Null(cu.PlayOfflineMinutes);
        var thieu = PolicyParser.Parse("""{"mode":"hoc","playSessionId":"x","playOfflineMinutes":5}""");
        Assert.Null(thieu.PlaySessionId);
        var am = PolicyParser.Parse("""{"mode":"hoc","playSessionId":42,"playApp":"a.exe","playOfflineMinutes":-5}""");
        Assert.Equal("42", am.PlaySessionId);
        Assert.Equal(0, am.PlayOfflineMinutes);
        Assert.True(PolicyParser.Parse(WinPhienWeb).PlayWeb);
    }

    [Fact]
    public void AgentStatus_LuonGuiForegroundApp_KeCaNull()
    {
        var json = JsonSerializer.Serialize(new AgentStatus { ChildSessionActive = true, ForegroundApp = null }, Json.Options);
        Assert.Contains("\"foregroundApp\":null", json);
        Assert.Contains("\"foregroundApp\":\"\"", JsonSerializer.Serialize(new AgentStatus { ForegroundApp = "" }, Json.Options));
    }

    [Fact]
    public void Dem_ChiKhiMatMang_VaTienCanhLaAppChoi()
    {
        var p = P();
        // có mạng ⇒ không đếm, không tạo đoạn
        var (d, luu) = PhienOffline.Dem(null, p, offline: false, true, "roblox.exe", true, 5, T0);
        Assert.Null(d); Assert.False(luu);
        (d, luu) = PhienOffline.Dem(null, p, true, true, "roblox.exe", true, 5, T0);
        Assert.NotNull(d); Assert.True(luu, "đoạn mới ⇒ lưu ngay");
        Assert.Equal(5, d!.GiayChoi);
        (d, _) = PhienOffline.Dem(d, p, true, true, "", true, 5, T0);              // màn hình khoá
        (d, _) = PhienOffline.Dem(d, p, true, true, "scratch.exe", true, 5, T0);   // app học
        (d, _) = PhienOffline.Dem(d, p, true, false, "roblox.exe", true, 5, T0);   // Con không đăng nhập
        Assert.Equal(5, d!.GiayChoi);
        (d, _) = PhienOffline.Dem(d, p, true, true, "RobLox.exe", true, 5, T0);
        Assert.Equal(10, d!.GiayChoi);
        (d, _) = PhienOffline.Dem(d, p, true, true, null, false, 5, T0);           // khay chết ⇒ vẫn đếm
        Assert.Equal(15, d!.GiayChoi);
        Assert.Equal("ph1", d.PhienId);
        Assert.False(d.HetHan);
        // phiên web: trình duyệt ở nền trước mới đếm
        var w = P(WinPhienWeb);
        var (dw, _) = PhienOffline.Dem(null, w, true, true, "msedge.exe", true, 5, T0);
        (dw, _) = PhienOffline.Dem(dw, w, true, true, "roblox.exe", true, 5, T0);
        Assert.Equal(5, dw!.GiayChoi);
    }

    [Fact]
    public void VuotNguong_BoAppChoiKhoiAllowed_GiuAppHoc_PhienKhacKhongDung()
    {
        var p = P();
        PhienOffline? d = null;
        for (int i = 0; i < 35; i++) (d, _) = PhienOffline.Dem(d, p, true, true, "roblox.exe", true, 5, T0.AddSeconds(5 * i));
        Assert.False(d!.HetHan);
        Assert.Contains("roblox.exe", PhienOffline.ApDung(p, d).AllowedApps);
        var (d2, luu) = PhienOffline.Dem(d, p, true, true, "roblox.exe", true, 5, T0);     // 180 giây = 3 phút
        Assert.True(d2!.HetHan); Assert.True(luu);
        var hl = PhienOffline.ApDung(p, d2);
        Assert.DoesNotContain("roblox.exe", hl.AllowedApps);
        Assert.Contains("scratch.exe", hl.AllowedApps);
        Assert.Contains("roblox.exe", p.AllowedApps);          // Policy cuối giữ nguyên (có mạng lại máy chủ quyết)
        // hết hạn rồi thì không đếm thêm
        (d2, _) = PhienOffline.Dem(d2, p, true, true, "roblox.exe", true, 5, T0);
        Assert.Equal(180, d2!.GiayChoi);
        // Policy mới cho phiên khác ⇒ không chặn theo đoạn cũ
        var khac = P(WinCoPhien.Replace("\"ph1\"", "\"ph9\""));
        Assert.Contains("roblox.exe", PhienOffline.ApDung(khac, d2).AllowedApps);
        // ngưỡng 0 ⇒ chặn ngay khi mất mạng
        var (d0, _) = PhienOffline.Dem(null, P(WinCoPhien.Replace("\"playOfflineMinutes\":3", "\"playOfflineMinutes\":0")), true, true, "explorer.exe", true, 5, T0);
        Assert.True(d0!.HetHan);
    }

    [Fact]
    public void VuotNguong_PhienWeb_BoTrinhDuyet_TruTrinhDuyetLaAppHoc()
    {
        var w = P(WinPhienWeb);
        PhienOffline? d = null;
        for (int i = 0; i < 121; i++) (d, _) = PhienOffline.Dem(d, w, true, true, "msedge.exe", true, 5, T0);
        Assert.True(d!.HetHan);
        var hl = PhienOffline.ApDung(w, d);
        Assert.Equal(new[] { "explorer.exe", "chrome.exe" }, hl.AllowedApps);
    }

    [Fact]
    public void LuuBen_KhoiDongLaiVanGiuDoanVaMa()
    {
        var tep = Path.Combine(Path.GetTempPath(), "aiig-phoff-" + Guid.NewGuid().ToString("N") + ".json");
        try
        {
            var store = new ConfigStore(tep, b => b, b => b);
            store.Save(new AgentConfig { Server = "https://x", Token = "t" });
            var d = new PhienOffline { PhienId = "ph1", Muc = "roblox.exe", GioiHanPhut = 3, GiayChoi = 200, HetHan = true };
            store.Update(c => c.PhienOffline = d.Sao());
            var lai = store.Load()!.PhienOffline!;
            Assert.Equal(d.Ma, lai.Ma);
            Assert.True(lai.HetHan);
            Assert.DoesNotContain("roblox.exe", PhienOffline.ApDung(P(), lai).AllowedApps);
            // nạp lại từ đĩa: cùng mã ⇒ giữ bản đếm nhiều hơn; khác mã ⇒ bản trong bộ nhớ
            var boNho = lai.Sao(); boNho.GiayChoi = 250;
            Assert.Equal(250, PhienOffline.Chon(boNho, lai)!.GiayChoi);
            Assert.Same(lai, PhienOffline.Chon(null, lai));
        }
        finally { try { File.Delete(tep); } catch { } }
    }

    private sealed class Fake : HttpMessageHandler
    {
        public readonly List<string> Paths = new();
        public readonly List<string> Bodies = new();
        public HttpStatusCode BuStatus = HttpStatusCode.OK;
        public bool BuMatMang;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
        {
            var path = req.RequestUri!.AbsolutePath;
            Paths.Add(path);
            Bodies.Add(req.Content == null ? "" : await req.Content.ReadAsStringAsync(ct));
            if (path.EndsWith("/phien/bu"))
            {
                if (BuMatMang) throw new HttpRequestException("mất mạng");
                return new HttpResponseMessage(BuStatus) { Content = new StringContent(BuStatus == HttpStatusCode.OK ? """{"ma":"x","phut":3}""" : """{"error":"khong_thay"}""", Encoding.UTF8, "application/json") };
            }
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"windows":{"mode":"hoc","allowedApps":["explorer.exe"]}}""", Encoding.UTF8, "application/json") };
        }
    }

    private static PhienOffline DoanDaChoi() => new() { PhienId = "ph1", Muc = "roblox.exe", GioiHanPhut = 3, GiayChoi = 180, HetHan = true, BatDau = T0, KetThuc = T0.AddMinutes(3) };

    private static async Task<KetQuaBu> ChayDongBo(Fake h, PhienOffline? d)
    {
        using var api = new ApiClient("https://may.test", "tok", h);
        var kq = (KetQuaBu)(-1);
        await GuiBu.DongBoAsync(api, d, (k, _) => kq = k, new AgentStatus(), Array.Empty<UsageEntry>());
        return kq;
    }

    [Fact]
    public async Task CoMangLai_GuiBuTruocDongBo_DungThan()
    {
        var h = new Fake();
        var d = DoanDaChoi();
        Assert.Equal(KetQuaBu.DaGui, await ChayDongBo(h, d));
        Assert.Equal(new[] { "/api/device/phien/bu", "/api/device/dong-bo" }, h.Paths);
        using var b = JsonDocument.Parse(h.Bodies[0]);
        var r = b.RootElement;
        Assert.Equal(d.Ma, r.GetProperty("ma").GetString());
        Assert.Equal("ph1", r.GetProperty("id").GetString());
        Assert.Equal("roblox.exe", r.GetProperty("muc").GetString());
        Assert.Equal(3, r.GetProperty("phut").GetDouble());
        Assert.True(r.GetProperty("ketThuc").GetBoolean());
        Assert.True(r.TryGetProperty("batDau", out _));
    }

    [Fact]
    public async Task KhongCoGiGuiBu_ChiDongBo()
    {
        var h = new Fake();
        Assert.Equal(KetQuaBu.KhongCo, await ChayDongBo(h, null));
        Assert.Equal(KetQuaBu.KhongCo, await ChayDongBo(h, new PhienOffline { PhienId = "ph1", GioiHanPhut = 3 }));
        Assert.Equal(new[] { "/api/device/dong-bo", "/api/device/dong-bo" }, h.Paths);
    }

    [Fact]
    public async Task LoiMang_GiuLai_GuiLaiCungMa_Idempotent()
    {
        var h = new Fake { BuMatMang = true };
        var d = DoanDaChoi();
        Assert.Equal(KetQuaBu.GiuLai, await ChayDongBo(h, d));
        h.BuMatMang = false; h.BuStatus = HttpStatusCode.BadGateway;
        Assert.Equal(KetQuaBu.GiuLai, await ChayDongBo(h, d));
        h.BuStatus = HttpStatusCode.OK;
        Assert.Equal(KetQuaBu.DaGui, await ChayDongBo(h, d));
        var ma = h.Bodies.Where((_, i) => h.Paths[i].EndsWith("/phien/bu")).Select(x => JsonDocument.Parse(x).RootElement.GetProperty("ma").GetString()).ToList();
        Assert.Equal(3, ma.Count);
        Assert.Single(ma.Distinct());
        Assert.Equal(d.Ma, ma[0]);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound, KetQuaBu.Bo)]
    [InlineData(HttpStatusCode.BadRequest, KetQuaBu.Bo)]
    [InlineData(HttpStatusCode.Conflict, KetQuaBu.Bo)]
    [InlineData(HttpStatusCode.Unauthorized, KetQuaBu.GiuLai)]
    [InlineData(HttpStatusCode.TooManyRequests, KetQuaBu.GiuLai)]
    [InlineData(HttpStatusCode.InternalServerError, KetQuaBu.GiuLai)]
    public async Task Loi4xxVinhVien_Bo_ConLaiGiu(HttpStatusCode st, KetQuaBu mong)
    {
        var h = new Fake { BuStatus = st };
        Assert.Equal(mong, await ChayDongBo(h, DoanDaChoi()));
        Assert.Equal("/api/device/dong-bo", h.Paths[^1]);    // dong-bo vẫn chạy sau bước gửi bù
    }
}
