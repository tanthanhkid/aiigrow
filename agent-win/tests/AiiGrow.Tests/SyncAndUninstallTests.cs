using AiiGrow.Core;

namespace AiiGrow.Tests;

public class SyncParseTests
{
    [Fact]
    public void Parse_LayNextCheckVaLenh()
    {
        var r = SyncResult.Parse("""
            { "serverTime":"2026-10-21T10:00:00Z", "nextCheckSec": 120,
              "lenh": [ {"id": 7, "loai": "go"}, {"id":"x","loai":"la"} ] }
            """);
        Assert.Equal(120, r.NextCheckSec);
        Assert.Equal(2, r.Lenh.Count);
        Assert.NotNull(r.LenhGo);
        Assert.Equal("7", r.LenhGo!.Id);
    }

    [Theory]
    [InlineData("{}", 300)]
    [InlineData("""{"nextCheckSec": 5}""", 15)]
    [InlineData("""{"nextCheckSec": 99999}""", 900)]
    [InlineData("khong-phai-json", 300)]
    public void Parse_KepNextCheck_KhongNemLoi(string json, int expected)
    {
        var r = SyncResult.Parse(json);
        Assert.Equal(expected, r.NextCheckSec);
        Assert.Null(r.LenhGo);
    }
}

public class OfflineQueueTests
{
    private sealed class FakeApi : IHeartbeatApi
    {
        public int SyncCalls;
        public List<SuKien> Sent = new();
        public bool Fail;
        public List<string> Acked = new();
        public Task<SyncResult> SyncAsync(object status, string clientTime, CancellationToken ct = default)
        { SyncCalls++; return Task.FromResult(new SyncResult()); }
        public Task AckLenhAsync(string id, CancellationToken ct = default) { Acked.Add(id); return Task.CompletedTask; }
        public Task SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default)
        { if (Fail) throw new ApiException("mất mạng"); Sent.AddRange(ds); return Task.CompletedTask; }
    }

    [Fact]
    public void Add_KhongTrungMa()
    {
        var q = new OfflineQueue();
        q.Add(new SuKien { Ma = "a", Loai = "offline" });
        q.Add(new SuKien { Ma = "a", Loai = "offline" });
        Assert.Single(q.Items);
    }

    [Fact]
    public async Task Flush_GuiHetKhiCoMang()
    {
        var q = new OfflineQueue();
        for (int i = 0; i < 3; i++) q.Add(new SuKien { Ma = "e" + i, Loai = "chan_app" });
        var api = new FakeApi();
        Assert.Equal(3, await q.FlushAsync(api));
        Assert.Empty(q.Items);
        Assert.Equal(3, api.Sent.Count);
    }

    [Fact]
    public async Task Flush_MatMangThiGiuLai()
    {
        var q = new OfflineQueue();
        q.Add(new SuKien { Ma = "e1", Loai = "offline" });
        var api = new FakeApi { Fail = true };
        Assert.Equal(0, await q.FlushAsync(api));
        Assert.Single(q.Items);
    }
}

public class CommandProcessorTests
{
    private sealed class FakeUninstaller : ISystemUninstaller
    {
        public readonly List<string> Buoc = new();
        public bool AppLockerFails;
        public bool QuyenFails;
        public bool GoLuatAppLocker() { Buoc.Add("applocker"); return !AppLockerFails; }
        public bool TraQuyenQuanTri() { Buoc.Add("tra_quyen"); return !QuyenFails; }
        public void DonPhanConLai() => Buoc.Add("don");
    }

    private sealed class FakeApi : IHeartbeatApi
    {
        public List<string> Acked = new();
        public List<string> SuKienLoai = new();
        public bool AckFails401;
        public bool AckNetwork;
        public Task<SyncResult> SyncAsync(object s, string t, CancellationToken ct = default) => Task.FromResult(new SyncResult());
        public Task AckLenhAsync(string id, CancellationToken ct = default)
        {
            if (AckNetwork) throw new ApiException("mất mạng");
            if (AckFails401) throw new ApiException("token thu hồi", 401);
            Acked.Add(id); return Task.CompletedTask;
        }
        public Task SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default)
        { SuKienLoai.AddRange(ds.Select(x => x.Loai)); return Task.CompletedTask; }
    }

    private static SyncResult Go => SyncResult.Parse("""{"lenh":[{"id":"5","loai":"go"}]}""");

    [Fact]
    public async Task LenhGo_GoLuat_TraQuyen_Ack_RoiDonNot()
    {
        var un = new FakeUninstaller();
        var api = new FakeApi();
        var done = await new CommandProcessor(un).ProcessAsync(Go, api);
        Assert.True(done);
        Assert.Equal(new[] { "applocker", "tra_quyen", "don" }, un.Buoc);
        Assert.Equal(new[] { "5" }, api.Acked);
        Assert.Empty(api.SuKienLoai);
    }

    [Fact]
    public async Task KhongCoLenh_KhongGo()
    {
        var un = new FakeUninstaller();
        var done = await new CommandProcessor(un).ProcessAsync(SyncResult.Parse("{}"), new FakeApi());
        Assert.False(done);
        Assert.Empty(un.Buoc);
    }

    // A (gỡ từ xa): gỡ luật AppLocker hỏng ⇒ KHÔNG ack, KHÔNG dọn (config/dịch vụ còn), báo sự kiện cho máy chủ, lần sau thử lại.
    [Fact]
    public async Task GoLuatHong_ChuaAckChuaDon_BaoSuKien_ThuLai()
    {
        var un = new FakeUninstaller { AppLockerFails = true };
        var api = new FakeApi();
        var done = await new CommandProcessor(un).ProcessAsync(Go, api);
        Assert.False(done);
        Assert.Equal(new[] { "applocker" }, un.Buoc);   // dừng ngay ở cổng
        Assert.Empty(api.Acked);
        Assert.Equal(new[] { "go_loi_applocker" }, api.SuKienLoai);
    }

    // B (gỡ từ xa): trả quyền admin hỏng ⇒ báo sự kiện (dòng máy còn tồn tại) nhưng VẪN gỡ tiếp (không để máy kẹt).
    [Fact]
    public async Task TraQuyenHong_BaoSuKien_VanGoTiep()
    {
        var un = new FakeUninstaller { QuyenFails = true };
        var api = new FakeApi();
        var done = await new CommandProcessor(un).ProcessAsync(Go, api);
        Assert.True(done);
        Assert.Equal(new[] { "applocker", "tra_quyen", "don" }, un.Buoc);
        Assert.Equal(new[] { "quyen_admin_loi" }, api.SuKienLoai);
        Assert.Equal(new[] { "5" }, api.Acked);
    }

    [Fact]
    public async Task AckMatMang_ChuaDon_DeLanSau()
    {
        var un = new FakeUninstaller();
        var done = await new CommandProcessor(un).ProcessAsync(Go, new FakeApi { AckNetwork = true });
        Assert.False(done);
        Assert.Equal(new[] { "applocker", "tra_quyen" }, un.Buoc);   // chưa dọn nốt
    }

    [Fact]
    public async Task Ack401_VanCoiNhuDaGo()
    {
        var un = new FakeUninstaller();
        var done = await new CommandProcessor(un).ProcessAsync(Go, new FakeApi { AckFails401 = true });
        Assert.True(done);
        Assert.Equal(new[] { "applocker", "tra_quyen", "don" }, un.Buoc);   // máy chủ đã bỏ máy ⇒ vẫn dọn nốt
    }
}
