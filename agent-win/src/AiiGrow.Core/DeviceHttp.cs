using System.Text.Json.Serialization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace AiiGrow.Core;

public sealed class EnrollResult
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string DeviceId { get; set; } = "";
    public string Token { get; set; } = "";
    public bool DungChung { get; set; }
    public string ChildName { get; set; } = "";
}

/// <summary>Ghép máy bằng token gói cài (cài một chạm). Tách interface để Installer test được.</summary>
public interface IEnroller
{
    Task<EnrollResult> EnrollAsync(EnrollmentPackage pkg, string tenMay, CancellationToken ct = default);
}

/// <summary>HTTP dùng chung cho heartbeat + ghép gói. Dùng mã lỗi {error,message} của máy chủ.</summary>
internal static class DeviceHttp
{
    public static HttpClient New(string server, string? token = null, HttpMessageHandler? handler = null)
    {
        var http = handler == null ? new HttpClient() : new HttpClient(handler);
        http.BaseAddress = new Uri(ApiClient.NormalizeServer(server) + "/");
        http.Timeout = TimeSpan.FromSeconds(20);
        if (!string.IsNullOrEmpty(token))
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return http;
    }

    public static async Task<string> SendAsync(HttpClient http, HttpMethod method, string path, object? body, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(method, path);
        if (body != null) req.Content = JsonContent.Create(body, body.GetType(), null, Json.Options);
        HttpResponseMessage resp;
        try { resp = await http.SendAsync(req, ct); }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw new ApiException("Máy chủ không trả lời kịp"); }
        catch (HttpRequestException e) { throw new ApiException("Không kết nối được máy chủ: " + e.Message, null, e); }
        using (resp)
        {
            var text = await resp.Content.ReadAsStringAsync(ct);
            if (resp.IsSuccessStatusCode) return text;
            string? code = null, msg = null;
            try
            {
                using var doc = JsonDocument.Parse(text);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                {
                    if (doc.RootElement.TryGetProperty("error", out var e) && e.ValueKind == JsonValueKind.String) code = e.GetString();
                    if (doc.RootElement.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String) msg = m.GetString();
                }
            }
            catch { }
            throw new ApiException(msg ?? ("Máy chủ báo lỗi " + (int)resp.StatusCode), (int)resp.StatusCode, null, code);
        }
    }

    public static T Parse<T>(string raw)
    {
        try { return JsonSerializer.Deserialize<T>(raw, Json.Options) ?? throw new ApiException("Máy chủ trả dữ liệu rỗng"); }
        catch (JsonException e) { throw new ApiException("Máy chủ trả dữ liệu không đúng định dạng", null, e); }
    }
}

/// <summary>Ghép bằng token gói cài: POST /api/device/ghep-goi {token, nen, tenMay} → {deviceId, token, dungChung}.
/// (Hợp đồng đề xuất cho agent E; lệch ⇒ ghi PR.)</summary>
public sealed class EnrollClient : IEnroller
{
    private readonly HttpMessageHandler? _handler;
    public EnrollClient(HttpMessageHandler? handler = null) { _handler = handler; }

    public async Task<EnrollResult> EnrollAsync(EnrollmentPackage pkg, string tenMay, CancellationToken ct = default)
    {
        if (!pkg.Valid) throw new ApiException("Gói cài thiếu địa chỉ máy chủ hoặc token");
        using var http = DeviceHttp.New(pkg.Server, null, _handler);
        var raw = await DeviceHttp.SendAsync(http, HttpMethod.Post, "api/device/ghep-goi",
            new { token = pkg.Token, nen = "windows", tenMay }, ct);
        var res = DeviceHttp.Parse<EnrollResult>(raw);
        if (string.IsNullOrEmpty(res.Token)) throw new ApiException("Máy chủ không trả token thiết bị");
        return res;
    }
}

/// <summary>Client heartbeat/đồng bộ + lệnh gỡ. Bearer = token thiết bị.</summary>
public sealed class HeartbeatClient : IHeartbeatApi, IDisposable
{
    private readonly HttpClient _http;
    public HeartbeatClient(string server, string token, HttpMessageHandler? handler = null) { _http = DeviceHttp.New(server, token, handler); }

    public async Task<SyncResult> SyncAsync(object status, string clientTime, CancellationToken ct = default)
        => SyncResult.Parse(await DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/dong-bo", new { status, clientTime }, ct));

    public async Task AckLenhAsync(string id, CancellationToken ct = default)
        => await DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/lenh/" + Uri.EscapeDataString(id) + "/xong", new { }, ct);

    public async Task SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default)
        => await DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/su-kien", new { ds }, ct);

    /// <summary>Gỡ tại máy: báo máy chủ máy đã tự gỡ (POST /api/device/da-go) ⇒ máy rời gia đình trên app Ba Mẹ. Gọi TRƯỚC khi xoá token.</summary>
    public async Task DaGoAsync(CancellationToken ct = default)
        => await DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/da-go", new { may = Environment.MachineName }, ct);

    public void Dispose() => _http.Dispose();
}

/// <summary>Phần THUẦN của cài một chạm (tách khỏi thao tác Windows để test): dựng cấu hình thiết bị từ gói + kết quả ghép.</summary>
public static class OneTouch
{
    public static AgentConfig BuildConfig(EnrollmentPackage pkg, EnrollResult res) => new()
    {
        Server = pkg.Server,
        DeviceId = res.DeviceId,
        Token = res.Token,
        ChildName = res.ChildName,
        DungChung = res.DungChung,
    };
}

/// <summary>Gửi nhật ký agent lên máy chủ (POST /api/device/log). Bearer = token thiết bị.</summary>
public sealed class LogClient : IDisposable
{
    private readonly HttpClient _http;
    public LogClient(string server, string token, HttpMessageHandler? handler = null) { _http = DeviceHttp.New(server, token, handler); }

    public async Task GuiAsync(IReadOnlyList<DongLog> ds, CancellationToken ct = default)
        => await DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/log",
            new { ds = ds.Select(d => new { luc = d.Luc.ToString("O"), muc = d.Muc, nguon = d.Nguon, noiDung = d.NoiDung }) }, ct);

    public void Dispose() => _http.Dispose();
}
