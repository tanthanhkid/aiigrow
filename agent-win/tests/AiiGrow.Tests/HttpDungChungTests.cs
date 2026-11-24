using AiiGrow.Core;

namespace AiiGrow.Tests;

// #562: mọi client API máy con dùng chung một SocketsHttpHandler (kết nối TLS tái dùng giữa các lượt thăm dò/đồng bộ).
public class HttpDungChungTests
{
    private sealed class HandlerDem : HttpMessageHandler
    {
        public int SoLanGoi, SoLanDispose;
        public HttpMethod? PhuongThuc;
        public System.Net.HttpStatusCode MaHead = System.Net.HttpStatusCode.OK;
        public readonly List<HttpMethod> DaGoi = new();
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            SoLanGoi++; PhuongThuc ??= request.Method; DaGoi.Add(request.Method);
            var ma = request.Method == HttpMethod.Head ? MaHead : System.Net.HttpStatusCode.OK;
            return Task.FromResult(new HttpResponseMessage(ma));
        }
        protected override void Dispose(bool disposing) { SoLanDispose++; base.Dispose(disposing); }
    }

    [Fact]
    public void Handler_CoHanSongVaHanRanh()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), HttpDungChung.Handler.PooledConnectionLifetime);
        Assert.Equal(TimeSpan.FromSeconds(60), HttpDungChung.Handler.PooledConnectionIdleTimeout);
        Assert.False(HttpDungChung.Handler.UseCookies);
        Assert.NotNull(HttpDungChung.Handler.ConnectCallback);
    }

    [Fact]
    public void DisposeClientChung_KhongDongHandlerChung()
    {
        HttpDungChung.TaoClient().Dispose();
        new ApiClient("https://may.test", "tok").Dispose();
        // handler đã dispose thì SendAsync ném ObjectDisposedException trước cả khi xét token huỷ
        using var invoker = new HttpMessageInvoker(HttpDungChung.Handler, disposeHandler: false);
        using var req = new HttpRequestMessage(HttpMethod.Get, "http://127.0.0.1:9/");
        var ex = Record.Exception(() => invoker.SendAsync(req, new CancellationToken(true)).GetAwaiter().GetResult());
        Assert.IsAssignableFrom<OperationCanceledException>(ex);
    }

    [Fact]
    public async Task Ping_HeadBiTuChoi_ThuGet()
    {
        var h = new HandlerDem { MaHead = System.Net.HttpStatusCode.NotImplemented };
        using var api = new ApiClient("https://may.test", "tok", h);
        Assert.True(await api.PingAsync());
        Assert.Equal(new[] { HttpMethod.Head, HttpMethod.Get }, h.DaGoi);
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
