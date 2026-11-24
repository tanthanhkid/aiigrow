using System.Net.Sockets;

namespace AiiGrow.Core;

/// <summary>
/// Bộ kết nối HTTP dùng chung cả tiến trình (#562). Trước đây mỗi lời gọi (thăm dò 15 giây/lần, đồng bộ, lệnh khay…) tạo HttpClient + handler
/// mới ⇒ mỗi lần một kết nối TCP + bắt tay TLS mới. Nay mọi ApiClient / HeartbeatClient / LogClient / tự cập nhật bọc CÙNG một SocketsHttpHandler:
/// kết nối được giữ và tái dùng giữa các lượt. HttpClient bên ngoài vẫn tạo theo lượt (nhẹ, giữ BaseAddress/token/hạn riêng), chỉ handler là chung.
/// </summary>
public static class HttpDungChung
{
    /// <summary>
    /// PooledConnectionLifetime 5 phút: kết nối không sống mãi ⇒ đổi IP máy chủ (DNS) vẫn nhận trong ≤5 phút.
    /// PooledConnectionIdleTimeout 60 giây: đủ giữ kết nối giữa hai lượt thăm dò 15 giây; máy ngủ dậy thì kết nối cũ đã quá hạn rảnh.
    /// TCP keepalive (ConnectCallback): router khởi động lại / NAT hết hạn / Wi-Fi nối lại làm kết nối chết im (không FIN) ⇒ hệ điều hành phát hiện
    /// sau ~11 giây rảnh (5 + 3×2) — trước lượt thăm dò 15 giây kế — và pool bỏ kết nối đó, lượt kế mở kết nối mới thay vì treo tới hết hạn.
    /// UseCookies = false: một hũ cookie chung cả tiến trình sẽ mang cookie qua mọi token/lần ghép lại; API máy con chỉ dùng Bearer, máy chủ không đặt cookie.
    /// </summary>
    public static readonly SocketsHttpHandler Handler = new()
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
        PooledConnectionIdleTimeout = TimeSpan.FromSeconds(60),
        ConnectTimeout = TimeSpan.FromSeconds(15),
        UseCookies = false,
        ConnectCallback = KetNoiCoKeepAlive,
    };

    /// <summary>HttpClient bọc handler chung. Dispose client KHÔNG đóng handler — kể cả handler riêng truyền vào (test, EnrollClient giữ handler
    /// trong trường và tạo client mỗi lượt: dispose theo client thì lượt thứ hai ObjectDisposedException).</summary>
    public static HttpClient TaoClient(HttpMessageHandler? handler = null, TimeSpan? han = null)
    {
        var c = new HttpClient(handler ?? Handler, disposeHandler: false);
        if (han is { } h) c.Timeout = h;
        return c;
    }

    private static async ValueTask<Stream> KetNoiCoKeepAlive(SocketsHttpConnectionContext ctx, CancellationToken ct)
    {
        var s = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };   // dual-mode: IPv4 lẫn IPv6
        try
        {
            s.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.KeepAlive, true);
            s.SetSocketOption(SocketOptionLevel.Tcp, SocketOptionName.TcpKeepAliveTime, 5);
            s.SetSocketOption(SocketOptionLevel.Tcp, SocketOptionName.TcpKeepAliveInterval, 2);
            s.SetSocketOption(SocketOptionLevel.Tcp, SocketOptionName.TcpKeepAliveRetryCount, 3);
        }
        catch (SocketException) { }   // Windows cũ không hỗ trợ tuỳ chọn ⇒ vẫn kết nối, chỉ thiếu phát hiện sớm
        try
        {
            await s.ConnectAsync(ctx.DnsEndPoint, ct);
            return new NetworkStream(s, ownsSocket: true);
        }
        catch { s.Dispose(); throw; }
    }
}
