using System.Net.NetworkInformation;

namespace AiiGrow.Core;

/// <summary>
/// Bộ kết nối HTTP dùng chung cả tiến trình (#562). Trước đây mỗi lời gọi (thăm dò 15 giây/lần, đồng bộ, lệnh khay…) tạo HttpClient + handler
/// mới ⇒ mỗi lần một kết nối TCP + bắt tay TLS mới. Nay mọi ApiClient / HeartbeatClient / LogClient / tự cập nhật bọc CÙNG một SocketsHttpHandler:
/// kết nối được giữ và tái dùng giữa các lượt. HttpClient bên ngoài vẫn tạo theo lượt (nhẹ, giữ BaseAddress/token/hạn riêng), chỉ handler là chung.
/// </summary>
public static class HttpDungChung
{
    private static SocketsHttpHandler _handler = Tao();

    static HttpDungChung()
    {
        // Đổi mạng (Wi-Fi khác, cắm/rút cáp, VPN): kết nối cũ trong pool có thể đã chết im (không FIN) ⇒ lượt kế treo tới hết hạn.
        // Thay handler mới cho các client tạo sau; handler cũ KHÔNG dispose (client đang chạy còn dùng) — kết nối của nó tự đóng sau IdleTimeout.
        try { NetworkChange.NetworkAddressChanged += (_, _) => _handler = Tao(); } catch { }
    }

    /// <summary>
    /// PooledConnectionLifetime 5 phút: kết nối không sống mãi ⇒ đổi IP máy chủ (DNS) vẫn nhận trong ≤5 phút.
    /// PooledConnectionIdleTimeout 60 giây: đủ giữ kết nối giữa hai lượt thăm dò 15 giây; máy ngủ dậy (đồng hồ tick tính cả lúc ngủ) thì kết nối cũ
    /// đã quá hạn rảnh ⇒ mở kết nối mới, không gửi vào socket chết.
    /// </summary>
    private static SocketsHttpHandler Tao() => new()
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
        PooledConnectionIdleTimeout = TimeSpan.FromSeconds(60),
    };

    /// <summary>Handler đang dùng (đổi khi mạng đổi).</summary>
    public static SocketsHttpHandler Handler => _handler;

    /// <summary>HttpClient bọc handler chung. Dispose client KHÔNG đóng handler — kể cả handler riêng truyền vào (test, EnrollClient giữ handler
    /// trong trường và tạo client mỗi lượt: dispose theo client thì lượt thứ hai ObjectDisposedException).</summary>
    public static HttpClient TaoClient(HttpMessageHandler? handler = null) => new(handler ?? _handler, disposeHandler: false);
}
