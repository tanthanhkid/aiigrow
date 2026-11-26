namespace AiiGrow.Core;

/// <summary>#685: ghép máy (mã 6 số / gói cài) mà phản hồi mất giữa đường (Wi-Fi rớt, hết giờ) thì máy chủ có thể ĐÃ ghép xong. Máy chủ nhận
/// lần thử lại cùng mã / gói + cùng <c>maMay</c> trong hạn và cấp lại token cho chính máy này (server/lib/gia-dinh.ts › capLaiTokenGhep) ⇒ tự thử
/// lại vài lần với lỗi đường truyền thay vì báo lỗi ngay và để lại máy mồ côi. Không có maMay ⇒ không tự thử lại (máy chủ sẽ trả 409 «đã dùng»).
/// Sau một lần lỗi đường truyền, 409 «ma_da_dung» cũng thử lại (lần đầu có thể còn đang chạy trên máy chủ — gói đã giữ mà máy chưa ghi xong).</summary>
public static class GhepThuLai
{
    public static readonly TimeSpan[] ChoMacDinh = { TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(10) };

    public static async Task<T> ChayAsync<T>(Func<Task<T>> goi, bool coMaMay, CancellationToken ct = default, IReadOnlyList<TimeSpan>? cho = null)
    {
        cho ??= ChoMacDinh;
        var daDut = false;
        for (var lan = 0; ; lan++)
        {
            try { return await goi(); }
            catch (Exception e) when (coMaMay && (LaLoiTam(e) || daDut && e is ApiException { StatusCode: 409, Code: "ma_da_dung" })
                                      && lan < cho.Count && !ct.IsCancellationRequested)
            {
                daDut = true;
                await Task.Delay(cho[lan], ct);
            }
        }
    }

    /// <summary>Lỗi đường truyền: không kết nối / hết giờ / 5xx, hoặc kết nối đứt khi đang đọc thân phản hồi (ném thẳng, không bọc ApiException).</summary>
    public static bool LaLoiTam(Exception e) => e switch
    {
        ApiException a => a.LaLoiDuongTruyen,
        HttpRequestException or IOException => true,
        _ => false,
    };
}
