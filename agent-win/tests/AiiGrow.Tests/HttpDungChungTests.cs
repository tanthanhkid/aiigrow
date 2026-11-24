using AiiGrow.Core;

namespace AiiGrow.Tests;

// #562: mọi client API máy con dùng chung một SocketsHttpHandler (kết nối TLS tái dùng giữa các lượt thăm dò/đồng bộ).
public class HttpDungChungTests
{
    private sealed class HandlerDem : HttpMessageHandler
    {
        public int SoLanGoi, SoLanDispose;
        public HttpMethod? PhuongThuc;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            SoLanGoi++; PhuongThuc = request.Method;
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        }
        protected override void Dispose(bool disposing) { SoLanDispose++; base.Dispose(disposing); }
    }

    [Fact]
    public void Handler_CoHanSongVaHanRanh()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), HttpDungChung.Handler.PooledConnectionLifetime);
        Assert.Equal(TimeSpan.FromSeconds(60), HttpDungChung.Handler.PooledConnectionIdleTimeout);
    }

    [Fact]
    public async Task DisposeClient_KhongDongHandler_DungDuocNhieuLuot()
    {
        var h = new HandlerDem();
        for (var i = 0; i < 2; i++)
        {
            using var api = new ApiClient("https://may.test", "tok", h);
            Assert.True(await api.PingAsync());
        }
        Assert.Equal(2, h.SoLanGoi);
        Assert.Equal(0, h.SoLanDispose);
    }

    [Fact]
    public async Task Ping_DungHead_KhongTaiTrang()
    {
        var h = new HandlerDem();
        using var api = new ApiClient("https://may.test", "tok", h);
        await api.PingAsync();
        Assert.Equal(HttpMethod.Head, h.PhuongThuc);
    }
}
