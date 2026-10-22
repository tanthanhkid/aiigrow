using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Gọi máy chủ cho khay học viên qua dịch vụ (named pipe → <c>api/device/hoc-vien/…</c>). Trả (dữ liệu, câu lỗi cho Con).</summary>
internal static class HvApi
{
    public static async Task<(T? Data, string? Error)> GetAsync<T>(string path) where T : class
    {
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.HocVien, Method = "GET", Path = path });
        return Doc<T>(res);
    }

    public static async Task<(T? Data, string? Error)> PostAsync<T>(string path, object? body = null) where T : class
    {
        var res = await PipeClient.CallAsync(new PipeRequest
        {
            Cmd = PipeCmd.HocVien, Method = "POST", Path = path,
            Body = body == null ? "{}" : JsonSerializer.Serialize(body, Json.Options),
        });
        return Doc<T>(res);
    }

    private static (T? Data, string? Error) Doc<T>(PipeResponse res) where T : class
    {
        if (!res.Ok) return (null, string.IsNullOrWhiteSpace(res.Error) ? "Chưa làm được. Con thử lại nhé." : res.Error);
        var d = HocVienView.Parse<T>(res.Data);
        return d == null ? (null, "Máy chủ trả dữ liệu lạ. Con thử lại nhé.") : (d, null);
    }
}
