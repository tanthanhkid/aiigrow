using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace AiiGrow.Core;

public sealed class ApiException : Exception
{
    public int? StatusCode { get; }
    /// <summary>Mã lỗi máy chủ (`error`), vd "token_sai", "khong_mo_duoc".</summary>
    public string? Code { get; }
    public ApiException(string message, int? statusCode = null, Exception? inner = null, string? code = null) : base(message, inner)
    {
        StatusCode = statusCode;
        Code = code;
    }
    public bool IsUnauthorized => StatusCode is 401 && (Code == null || Code == "token_sai");
    /// <summary>Không tới được máy chủ / máy chủ lỗi ⇒ chạy offline theo Policy cuối.</summary>
    public bool IsNetwork => StatusCode is null or >= 500;
}

public sealed class QrExpiredException : Exception
{
    public QrExpiredException() : base("Mã QR đã hết hạn") { }
}

/// <summary>Client API thiết bị AiiGrow (/api/device/*, docs/API.md). Token Bearer của máy.</summary>
public sealed class ApiClient : IAgentApi, IDisposable
{
    private readonly HttpClient _http;

    /// <summary>Máy dùng chung: phiên PIN của Con đang dùng (header X-Phien-Con).</summary>
    public string? PhienCon { get; set; }

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

    /// <summary>Ghép bằng mã 6 số Ba Mẹ tạo trong app (POST /api/device/ghep).</summary>
    public static async Task<PairResult> PairAsync(string server, string code, string deviceName,
        CancellationToken ct = default, HttpMessageHandler? handler = null)
    {
        using var api = new ApiClient(server, null, handler);
        var res = await api.PostAsync<PairResult>("api/device/ghep", new { ma = code.Trim(), nen = "windows", tenMay = deviceName }, ct);
        if (string.IsNullOrEmpty(res.Token)) throw new ApiException("Máy chủ không trả token");
        res.Server = NormalizeServer(server);
        return res;
    }

    /// <summary>Ghép bằng QR: máy hiện mã để Ba Mẹ quét bằng app (POST /api/device/ghep-qr).</summary>
    public static async Task<QrPair> CreateQrAsync(string server, string deviceName,
        CancellationToken ct = default, HttpMessageHandler? handler = null)
    {
        using var api = new ApiClient(server, null, handler);
        return await api.PostAsync<QrPair>("api/device/ghep-qr", new { nen = "windows", tenMay = deviceName }, ct);
    }

    /// <summary>Hỏi kết quả quét. <c>null</c> khi chưa quét; <see cref="PairResult"/> khi Ba Mẹ đã ghép; ném lỗi khi mã hết hạn.</summary>
    public static async Task<PairResult?> PollQrAsync(string server, QrPair m,
        CancellationToken ct = default, HttpMessageHandler? handler = null)
    {
        using var api = new ApiClient(server, null, handler);
        var st = await api.PostAsync<QrState>("api/device/ghep-qr/hoi", new { ma = m.Ma, bi = m.Bi }, ct);
        if (st.TrangThai == "het") throw new QrExpiredException();
        if (st.TrangThai != "xong" || string.IsNullOrEmpty(st.Token)) return null;
        return new PairResult { DeviceId = st.DeviceId ?? "", Token = st.Token!, DungChung = st.DungChung, Server = NormalizeServer(server) };
    }

    /// <summary>Gỡ agent: máy chủ kiểm mật khẩu tài khoản AiiGrow của Ba Mẹ cùng gia đình rồi xoá thiết bị (POST /api/device/go).</summary>
    public async Task UninstallAsync(string dinhDanh, string matKhau, CancellationToken ct = default)
        => await SendAsync(HttpMethod.Post, "api/device/go", new { dinhDanh, matKhau }, ct);

    public async Task<(DevicePolicy Policy, string Raw)> SyncAsync(object status, string clientTime, IReadOnlyList<GrowUsage> usage,
        CancellationToken ct = default)
    {
        var raw = await SendAsync(HttpMethod.Post, "api/device/dong-bo",
            new { status, clientTime, usage = usage.Select(u => new { muc = u.Muc, phut = u.Phut, day = u.Day }) }, ct);
        return (DevicePolicy.Parse(raw), raw);
    }

    public Task<XetPhien> XetAsync(string muc, bool gioMaySai, CancellationToken ct = default)
        => PostAsync<XetPhien>("api/device/phien/xet", new { muc, gioMaySai }, ct);

    public Task<MoPhienResult> MoAsync(string muc, bool gioMaySai, CancellationToken ct = default)
        => PostAsync<MoPhienResult>("api/device/phien/mo", new { muc, gioMaySai }, ct);

    public Task<KetNhip> NhipAsync(string id, bool dangDung, CancellationToken ct = default)
        => PostAsync<KetNhip>("api/device/phien/nhip", new { id, dangDung }, ct);

    public async Task DungAsync(string id, CancellationToken ct = default)
        => await SendAsync(HttpMethod.Post, "api/device/phien/dung", new { id }, ct);

    public Task<BuResult> BuAsync(BuBody body, CancellationToken ct = default)
        => PostAsync<BuResult>("api/device/phien/bu", body, ct);

    public async Task<int> SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(await SendAsync(HttpMethod.Post, "api/device/su-kien", new { ds }, ct));
        return doc.RootElement.TryGetProperty("nhan", out var n) && n.TryGetInt32(out var v) ? v : 0;
    }

    /// <summary>Xin phép Ba Mẹ từ màn chặn (POST /api/device/yeu-cau). loai: them_gio | cai_app | mo_web | khac.</summary>
    public Task<YeuCauResult> YeuCauAsync(string loai, int? phut, string? giaTri, string lyDo, CancellationToken ct = default)
        => PostAsync<YeuCauResult>("api/device/yeu-cau", new { loai, phut, giaTri, lyDo }, ct);

    /// <summary>Phiên Con 12 giờ cho khung Kid (WebView2) — khay không cầm token máy.</summary>
    public Task<PhienWeb> PhienWebAsync(CancellationToken ct = default)
        => PostAsync<PhienWeb>("api/device/phien-web", new { }, ct);

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
        if (!string.IsNullOrEmpty(PhienCon)) req.Headers.Add("X-Phien-Con", PhienCon);
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
                throw new ApiException(msg ?? ("Máy chủ báo lỗi " + (int)resp.StatusCode), (int)resp.StatusCode, null, code);
            }
            return text;
        }
    }

    private static (string? Code, string? Message) ExtractError(string text)
    {
        try
        {
            using var doc = JsonDocument.Parse(text);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return (null, null);
            string? Get(string n) => doc.RootElement.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
            return (Get("error"), Get("message") ?? Get("error"));
        }
        catch { return (null, null); }
    }

    public void Dispose() => _http.Dispose();
}
