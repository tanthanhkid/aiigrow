using AiiGrow.Core;

namespace AiiGrow.Tests;

// #562: mọi client API máy con dùng chung một SocketsHttpHandler (kết nối TLS tái dùng giữa các lượt thăm dò/đồng bộ).
public class HttpDungChungTests
{
    [Fact]
    public void Handler_CoHanSongKetNoi_KhongCookie()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), HttpDungChung.Handler.PooledConnectionLifetime);
        Assert.False(HttpDungChung.Handler.UseCookies);
    }

    [Fact]
    public void DisposeClient_KhongDongHandlerChung()
    {
        HttpDungChung.TaoClient().Dispose();
        using var api = new ApiClient("https://may.test", "tok");
        api.Dispose();
        // handler chung bị dispose thì mọi lời gọi sau đều ObjectDisposedException; đọc thuộc tính vẫn được nhưng gửi qua invoker thì không
        using var invoker = new HttpMessageInvoker(HttpDungChung.Handler, disposeHandler: false);
        using var req = new HttpRequestMessage(HttpMethod.Get, "http://127.0.0.1:9/");
        var ex = Record.Exception(() => invoker.SendAsync(req, new CancellationToken(true)).GetAwaiter().GetResult());
        Assert.IsNotType<ObjectDisposedException>(ex);
    }
}
