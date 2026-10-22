using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace AiiGrow.Core;

public sealed class ApiException : Exception
{
    public int? StatusCode { get; }
    /// <summary>Mã lỗi máy chủ (`error`) — AiiGrow thêm, vd "token_sai".</summary>
    public string? Code { get; }
    public ApiException(string message, int? statusCode = null, Exception? inner = null, string? code = null) : base(message, inner)
    {
        StatusCode = statusCode;
        Code = code;
    }
    public bool IsUnauthorized => StatusCode is 401 or 403;
    /// <summary>Không tới được máy chủ / máy chủ lỗi ⇒ chạy offline, giữ hàng đợi.</summary>
    public bool IsNetwork => StatusCode is null or >= 500;
    /// <summary>Máy chủ KHẲNG ĐỊNH máy đã bị gỡ khỏi gia đình (401 token_sai). CHỈ loại này mới tính vào mốc mồ côi 6 giờ —
    /// 403 lạ (tường lửa / CDN) không tính, để không thôi chặn nhầm khi Con tự dựng được một phản hồi 403.</summary>
    public bool LaTokenSai => StatusCode == 401 && Code is "token_sai" or "device_unknown";
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
        _http.DefaultRequestHeaders.TryAddWithoutValidation("X-AiiGrow-Ban", TuCapNhat.BanHienTai().ToString(3));   // máy chủ ghi bản đang chạy
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
        // Máy chủ AiiGrow: POST /api/device/ghep {ma, nen, tenMay} → {deviceId, token, dungChung} (mã 6 số Ba Mẹ tạo trong app).
        var res = await api.PostAsync<PairResult>("api/device/ghep",
            new { ma = code.Trim(), nen = "windows", tenMay = deviceName }, ct);
        if (string.IsNullOrEmpty(res.Token)) throw new ApiException("Máy chủ không trả token");
        res.Server = string.IsNullOrWhiteSpace(res.Server) ? NormalizeServer(server) : NormalizeServer(res.Server!);
        return res;
    }

    public async Task<(Policy Policy, string Raw)> SyncAsync(AgentStatus status, IReadOnlyList<UsageEntry> usage,
        CancellationToken ct = default)
    {
        // Máy chủ AiiGrow: POST /api/device/dong-bo. Policy cho agent nằm ở trường `windows` (máy chủ dịch sẵn — server/lib/agent-windows.ts).
        // Máy chủ ghi phút dùng bằng greatest(…) ⇒ gửi TỔNG trong ngày theo app (UsageTotals), không gửi phần tăng.
        var tong = UsageTotals.Shared.Add(usage);
        var raw = await SendAsync(HttpMethod.Post, "api/device/dong-bo", new
        {
            status, clientTime = DateTimeOffset.Now.ToString("O"),
            usage = tong.Select(u => new { muc = u.AppId, phut = u.Minutes, day = u.Day }),
        }, ct);
        return (PolicyParser.Parse(LayWindows(raw)), raw);
    }

    public Task<RequestResult> CreateRequestAsync(string kind, int minutes, string? appId, string? appName,
        string? note, CancellationToken ct = default)
    {
        // Máy chủ AiiGrow: POST /api/device/yeu-cau {loai, phut, giaTri, lyDo} → {id, trang_thai}. lyDo bắt buộc.
        var lyDo = string.IsNullOrWhiteSpace(note) ? (kind == "doi_diem" ? "Con muốn dùng điểm để chơi" : "Con xin thêm giờ") : note!;
        return PostAsync<RequestResult>("api/device/yeu-cau", new { loai = "them_gio", phut = Math.Clamp(minutes, 5, 240), giaTri = appId, lyDo }, ct);
    }

    /// <summary>Xét trước «Dùng điểm để chơi?» cho một mục (POST phien/xet). Máy chủ quyết định cho hay không.</summary>
    public Task<PlayCheck> CheckPlayAsync(string muc, CancellationToken ct = default)
        => PostAsync<PlayCheck>("api/device/phien/xet", new { muc }, ct);

    /// <summary>Mở phiên chơi bằng điểm (POST phien/mo) sau khi phien/xet trả "được".</summary>
    public Task<PlayOpen> OpenPlayAsync(string muc, CancellationToken ct = default)
        => PostAsync<PlayOpen>("api/device/phien/mo", new { muc }, ct);

    /// <summary>Gửi lời xin Ba Mẹ từ màn chặn (POST yeu-cau). Chỉ gửi; quyết định do máy chủ trả về.</summary>
    public Task<RequestResult> AskParentAsync(string loai, int phut, string? appId, string? lyDo, CancellationToken ct = default)
        => PostAsync<RequestResult>("api/device/yeu-cau", new { loai, phut, muc = appId, lyDo }, ct);

    public async Task<RequestStatus> GetRequestAsync(string id, CancellationToken ct = default)
    {
        var raw = await SendAsync(HttpMethod.Get, "api/device/yeu-cau/" + Uri.EscapeDataString(id), null, ct);
        return Deserialize<RequestStatus>(raw);
    }

    /// <summary>Khay học viên: gọi một đường <c>api/device/…</c> đã qua <see cref="HocVienPaths.Allowed"/>; trả thân JSON nguyên văn.</summary>
    public Task<string> RawAsync(HttpMethod method, string path, string? bodyJson, CancellationToken ct = default)
        => SendRawAsync(method, path, bodyJson, ct);

    private Task<string> SendRawAsync(HttpMethod method, string path, string? bodyJson, CancellationToken ct)
    {
        object? body = null;
        if (!string.IsNullOrWhiteSpace(bodyJson))
        {
            try { body = JsonSerializer.Deserialize<JsonElement>(bodyJson); }
            catch (JsonException e) { throw new ApiException("Dữ liệu gửi đi không đúng định dạng", null, e); }
        }
        else if (method == HttpMethod.Post) body = new { };
        return SendAsync(method, path, body, ct);
    }

    /// <summary>Thăm dò nhẹ: có tới được máy chủ không (TCP/TLS + một yêu cầu GET gốc, hạn 8 giây; client mang sẵn token như mọi lời gọi khác). Mọi phản hồi HTTP (kể cả 404/401) tính là «tới được»;
    /// lỗi mạng / hết hạn / máy chủ 5xx tính là không. Không gửi dữ liệu.</summary>
    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(8));
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, "");
            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            return (int)resp.StatusCode < 500;
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { return false; }
        catch (HttpRequestException) { return false; }
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
            {
                var (code, msg) = ExtractError(text);
                throw new ApiException(msg ?? code ?? ("Máy chủ báo lỗi " + (int)resp.StatusCode), (int)resp.StatusCode, code: code);
            }
            return text;
        }
    }

    /// <summary>Tách (mã lỗi `error`, câu `message`) từ thân lỗi của máy chủ.</summary>
    private static (string? Code, string? Message) ExtractError(string text)
    {
        try
        {
            using var doc = JsonDocument.Parse(text);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                string? S(string name) => doc.RootElement.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
                return (S("error"), S("message"));
            }
        }
        catch { }
        return (null, null);
    }

    public void Dispose() => _http.Dispose();

    /// <summary>Lấy trường `windows` (Policy dịch sẵn cho agent) từ phản hồi dong-bo; không có thì trả nguyên văn (máy chủ cũ / test).</summary>
    public static string LayWindows(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            return doc.RootElement.TryGetProperty("windows", out var w) && w.ValueKind == JsonValueKind.Object ? w.GetRawText() : raw;
        }
        catch (JsonException) { return raw; }
    }
}
