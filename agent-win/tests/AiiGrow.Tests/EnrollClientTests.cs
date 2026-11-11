using System.Net;
using System.Text;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class EnrollClientTests
{
    private sealed class FakeHandler : HttpMessageHandler
    {
        public string? Path;
        public string? Body;
        public string Reply = "{}";
        public HttpStatusCode Status = HttpStatusCode.OK;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
        {
            Path = req.RequestUri!.AbsolutePath;
            Body = req.Content == null ? null : await req.Content.ReadAsStringAsync(ct);
            return new HttpResponseMessage(Status) { Content = new StringContent(Reply, Encoding.UTF8, "application/json") };
        }
    }

    [Fact]
    public async Task Enroll_GoiDungDuongVaChepKetQua()
    {
        var h = new FakeHandler { Reply = """{"deviceId": 42, "token": "dev-token", "dungChung": true, "childName": "Ken"}""" };
        var res = await new EnrollClient(h).EnrollAsync(new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "goi-tk" }, "Laptop Ken");
        Assert.Equal("/api/device/ghep-goi", h.Path);
        Assert.Contains("\"token\":\"goi-tk\"", h.Body);
        Assert.Contains("\"nen\":\"windows\"", h.Body);
        Assert.Contains("Laptop Ken", h.Body);
        Assert.Equal("42", res.DeviceId);
        Assert.Equal("dev-token", res.Token);
        Assert.True(res.DungChung);

        var cfg = OneTouch.BuildConfig(new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "goi-tk" }, res);
        Assert.True(cfg.Paired);
        Assert.Equal("https://aiigrow.vn", cfg.Server);
        Assert.Equal("dev-token", cfg.Token);
        Assert.True(cfg.DungChung);
    }

    [Fact]
    public void MaMay_BamCoMuoi_KhongLoMaTho()
    {
        const string guid = "0f8fad5b-d9cb-469f-a165-70867728950e";
        var h = MaMay.Bam(guid)!;
        Assert.Matches("^[0-9a-f]{64}$", h);
        Assert.Equal(h, MaMay.Bam("  " + guid + " "));
        Assert.NotEqual(h, MaMay.Bam("khac"));
        Assert.DoesNotContain(guid, h);
        Assert.Null(MaMay.Bam(null));
        Assert.Null(MaMay.Bam("   "));
        var may = MaMay.Doc();                       // máy chạy test (Windows) có MachineGuid; nơi khác ⇒ null, không ném
        if (may != null) Assert.Matches("^[0-9a-f]{64}$", may);
    }

    [Fact]
    public async Task Ghep_GuiMaMayKhiDocDuoc()
    {
        var h = new FakeHandler { Reply = """{"deviceId": "d1", "token": "dev-token"}""" };
        await new EnrollClient(h).EnrollAsync(new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "goi-tk" }, "PC");
        var may = MaMay.Doc();
        if (may != null) Assert.Contains($"\"maMay\":\"{may}\"", h.Body);
        else Assert.DoesNotContain("maMay", h.Body);
        var h2 = new FakeHandler { Reply = """{"deviceId": "d2", "token": "dev-token"}""" };
        await ApiClient.PairAsync("https://aiigrow.vn", "123456", "PC", default, h2);
        Assert.Equal("/api/device/ghep", h2.Path);
        if (may != null) Assert.Contains($"\"maMay\":\"{may}\"", h2.Body);
        else Assert.DoesNotContain("maMay", h2.Body);
    }

    [Fact]
    public async Task Enroll_MayChuBaoLoi_NemApiException()
    {
        var h = new FakeHandler { Status = HttpStatusCode.Conflict, Reply = """{"error":"ma_da_dung","message":"Gói cài đã dùng rồi"}""" };
        var ex = await Assert.ThrowsAsync<ApiException>(() =>
            new EnrollClient(h).EnrollAsync(new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "x" }, "PC"));
        Assert.Equal("ma_da_dung", ex.Code);
        Assert.Equal("Gói cài đã dùng rồi", ex.Message);
    }

    [Fact]
    public async Task Enroll_ThieuToken_KhongGoiMang()
    {
        var h = new FakeHandler();
        await Assert.ThrowsAsync<ApiException>(() =>
            new EnrollClient(h).EnrollAsync(new EnrollmentPackage { Server = "https://aiigrow.vn", Token = "" }, "PC"));
        Assert.Null(h.Path); // chặn trước khi gọi mạng
    }

    [Fact]
    public async Task Heartbeat_SyncVaAck_DungDuong()
    {
        var h = new FakeHandler { Reply = """{"nextCheckSec":90,"lenh":[]}""" };
        using var c = new HeartbeatClient("https://aiigrow.vn", "dev-token", h);
        var r = await c.SyncAsync(new { agent = "windows" }, "2026-10-21T10:00:00Z");
        Assert.Equal("/api/device/dong-bo", h.Path);
        Assert.Equal(90, r.NextCheckSec);
        await c.AckLenhAsync("77");
        Assert.Equal("/api/device/lenh/77/xong", h.Path);
    }
}
