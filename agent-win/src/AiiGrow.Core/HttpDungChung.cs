namespace AiiGrow.Core;

/// <summary>
/// Bộ kết nối HTTP dùng chung cả tiến trình (#562). Trước đây mỗi lời gọi (thăm dò 15 giây/lần, đồng bộ, lệnh khay…) tạo HttpClient + handler
/// mới ⇒ mỗi lần một kết nối TCP + bắt tay TLS mới. Nay mọi ApiClient / HeartbeatClient / LogClient bọc CÙNG một SocketsHttpHandler: kết nối
/// được giữ và tái dùng giữa các lượt. HttpClient bên ngoài vẫn tạo theo lượt (nhẹ, giữ BaseAddress/token/hạn riêng), chỉ handler là chung.
/// </summary>
public static class HttpDungChung
{
    /// <summary>
    /// PooledConnectionLifetime 5 phút: kết nối không sống mãi ⇒ đổi IP máy chủ (DNS) vẫn nhận trong ≤5 phút.
    /// UseCookies = false: handler chung không giữ hũ cookie chung giữa các máy chủ/token (API máy con chỉ dùng Bearer).
    /// </summary>
    public static readonly SocketsHttpHandler Handler = new()
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
        PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
        UseCookies = false,
    };

    /// <summary>HttpClient bọc handler chung (dispose client KHÔNG đóng handler); <paramref name="handler"/> riêng (test) thì client sở hữu nó như cũ.</summary>
    public static HttpClient TaoClient(HttpMessageHandler? handler = null) =>
        handler == null ? new HttpClient(Handler, disposeHandler: false) : new HttpClient(handler);
}
