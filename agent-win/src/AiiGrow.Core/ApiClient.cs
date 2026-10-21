using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace AiiGrow.Core;

public sealed class ApiException : Exception
{
    public int? StatusCode { get; }
    public ApiException(string message, int? statusCode = null, Exception? inner = null) : base(message, inner)
    {
        StatusCode = statusCode;
    }
    public bool IsUnauthorized => StatusCode is 401 or 403;
}

public sealed class QrExpiredException : Exception
{
    public QrExpiredException() : base("Mã QR đã hết hạn") { }
}

/// <summary>Client API máy con (PLAN.md mục 3). Token Bearer của máy.</summary>
public sealed class ApiClient : IDisposable
{
    private readonly HttpClient _http;

    public ApiClient(string server, string? token = null, HttpMessageHandler? handler = null)
    {
        _http = handler == null ? new HttpClient() : new HttpClient(handler);
        _http.BaseAddress = new Uri(NormalizeServer(server) + "/");
        _http.Timeout = TimeSpan.FromSeconds(20);
        if (!string.IsNullOrEmpty(token))
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    public static string NormalizeServer(string server)
    {
        var s = (server ?? "").Trim();
        if (s.Length == 0) throw new ApiException("Chưa nhập địa chỉ máy chủ");
        if (!s.Contains("://")) s = "https://" + s;
        return s.TrimEnd('/');
    }

    public static async Task<PairResult> PairAsync(string server, string code, string deviceName,
        CancellationToken ct = default, HttpMessageHandler? handler = null)
    {
        using var api = new ApiClient(server, null, handler);
        var res = await api.PostAsync<PairResult>("api/pair",
            new { code = code.Trim(), platform = "windows", deviceName }, ct);
        if (string.IsNullOrEmpty(res.Token)) throw new ApiException("Máy chủ không trả token");
        res.Server = string.IsNullOrWhiteSpace(res.Server) ? NormalizeServer(server) : NormalizeServer(res.Server!);
        return res;
    }

    /// <summary>Ghép bằng QR: xin mã để hiện cho bố mẹ quét bằng app (server/lib/ghep-qr.ts).</summary>
    public static async Task<QrPair> CreateQrAsync(string server, string deviceName,
        CancellationToken ct = default, HttpMessageHandler? handler = null)
    {
        using var api = new ApiClient(server, null, handler);
        return await api.PostAsync<QrPair>("api/pair/qr", new { platform = "windows", deviceName }, ct);
    }

    /// <summary>Hỏi kết quả quét. Trả <c>null</c> khi chưa quét; <see cref="PairResult"/> khi bố mẹ đã ghép; ném lỗi "het" khi mã hết hạn.</summary>
    public static async Task<PairResult?> PollQrAsync(string server, QrPair m,
        CancellationToken ct = default, HttpMessageHandler? handler = null)
    {
        using var api = new ApiClient(server, null, handler);
        var raw = await api.SendAsync(HttpMethod.Get, "api/pair/qr/" + Uri.EscapeDataString(m.Ma) + "?bi=" + Uri.EscapeDataString(m.Bi), null, ct);
        var st = Deserialize<QrState>(raw);
        if (st.TrangThai == "het") throw new QrExpiredException();
        if (st.TrangThai != "xong" || string.IsNullOrEmpty(st.Token)) return null;
        return new PairResult
        {
            DeviceId = st.DeviceId ?? "", Token = st.Token!, ChildName = st.ChildName ?? "",
            Server = string.IsNullOrWhiteSpace(st.Server) ? NormalizeServer(server) : NormalizeServer(st.Server!),
        };
    }

    public async Task<(Policy Policy, string Raw)> SyncAsync(AgentStatus status, IReadOnlyList<UsageEntry> usage,
        CancellationToken ct = default)
    {
        var raw = await SendAsync(HttpMethod.Post, "api/device/sync", new { status, usage }, ct);
        return (PolicyParser.Parse(raw), raw);
    }

    public Task<RequestResult> CreateRequestAsync(string kind, int minutes, string? appId, string? appName,
        string? note, CancellationToken ct = default)
    {
        if (kind == "doi_diem")
            return PostAsync<RequestResult>("api/device/requests", new { kind, minutes }, ct);
        return PostAsync<RequestResult>("api/device/requests", new { kind, minutes, appId, appName, note }, ct);
    }

    public async Task<RequestStatus> GetRequestAsync(string id, CancellationToken ct = default)
    {
        var raw = await SendAsync(HttpMethod.Get, "api/device/requests/" + Uri.EscapeDataString(id), null, ct);
        return Deserialize<RequestStatus>(raw);
    }

    private async Task<T> PostAsync<T>(string path, object body, CancellationToken ct)
        => Deserialize<T>(await SendAsync(HttpMethod.Post, path, body, ct));

    private static T Deserialize<T>(string raw)
    {
        try
        {
            return JsonSerializer.Deserialize<T>(raw, Json.Options) ?? throw new ApiException("Máy chủ trả dữ liệu rỗng");
        }
        catch (JsonException e)
        {
            throw new ApiException("Máy chủ trả dữ liệu không đúng định dạng", null, e);
        }
    }

    private async Task<string> SendAsync(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(method, path);
        if (body != null) req.Content = JsonContent.Create(body, body.GetType(), null, Json.Options);
        HttpResponseMessage resp;
        try
        {
            resp = await _http.SendAsync(req, ct);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new ApiException("Máy chủ không trả lời kịp");
        }
        catch (HttpRequestException e)
        {
            throw new ApiException("Không kết nối được máy chủ: " + e.Message, null, e);
        }
        using (resp)
        {
            var text = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
                throw new ApiException(ExtractError(text) ?? ("Máy chủ báo lỗi " + (int)resp.StatusCode), (int)resp.StatusCode);
            return text;
        }
    }

    private static string? ExtractError(string text)
    {
        try
        {
            using var doc = JsonDocument.Parse(text);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
                foreach (var name in new[] { "error", "message" })
                    if (doc.RootElement.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String)
                        return v.GetString();
        }
        catch { }
        return null;
    }

    public void Dispose() => _http.Dispose();
}
