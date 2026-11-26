using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace AiiGrow.Core;

public sealed class ApiException : Exception
{
    public int? StatusCode { get; }
    /// <summary>Mã lỗi máy chủ (`error`) — AiiGrow thêm, vd "token_sai".</summary>
    public string? Code { get; }
    /// <summary>Thân lỗi máy chủ (JSON) — đọc trường phụ như `conLan`, `choGiay` (06/11 PIN theo bé).</summary>
    public string? Body { get; }
    public ApiException(string message, int? statusCode = null, Exception? inner = null, string? code = null, string? body = null) : base(message, inner)
    {
        StatusCode = statusCode;
        Code = code;
        Body = body;
    }

    /// <summary>Trường số phụ trong thân lỗi (vd «conLan», «choGiay»); không có ⇒ null.</summary>
    public int? SoPhu(string ten)
    {
        if (string.IsNullOrWhiteSpace(Body)) return null;
        try
        {
            using var doc = JsonDocument.Parse(Body);
            return doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty(ten, out var v) && v.ValueKind == JsonValueKind.Number
                && v.TryGetDouble(out var d) && double.IsFinite(d) ? (int)Math.Round(d) : null;
        }
        catch (JsonException) { return null; }
    }
    public bool IsUnauthorized => StatusCode is 401 or 403;
    /// <summary>Không tới được máy chủ / máy chủ lỗi ⇒ chạy offline, giữ hàng đợi.</summary>
    public bool IsNetwork => StatusCode is null or >= 500;
    /// <summary>Lỗi ĐƯỜNG TRUYỀN thật (không tới được / hết giờ / máy chủ 5xx) — khác <see cref="IsNetwork"/> ở chỗ không tính lỗi không mã của chính client
    /// (thân trả về không đọc được, thiếu token, gói cài thiếu máy chủ…): những lỗi đó thử lại cũng hỏng như cũ.</summary>
    public bool LaLoiDuongTruyen => StatusCode >= 500 || (StatusCode == null && InnerException is HttpRequestException or TimeoutException or IOException);
    /// <summary>Máy chủ KHẲNG ĐỊNH máy đã bị gỡ khỏi gia đình (401 token_sai). CHỈ loại này mới tính vào mốc mồ côi 6 giờ —
    /// 403 lạ (tường lửa / CDN) không tính, để không thôi chặn nhầm khi Con tự dựng được một phản hồi 403.</summary>
    public bool LaTokenSai => StatusCode == 401 && Code is "token_sai" or "device_unknown";
}

/// <summary>Client API máy con (PLAN.md mục 3). Token Bearer của máy.</summary>
public sealed class ApiClient : IDisposable
{
    private readonly HttpClient _http;

    public ApiClient(string server, string? token = null, HttpMessageHandler? handler = null, int timeoutGiay = 20)
    {
        _http = HttpDungChung.TaoClient(handler);   // #562: kết nối tái dùng giữa các lượt
        _http.BaseAddress = new Uri(NormalizeServer(server) + "/");
        _http.Timeout = TimeSpan.FromSeconds(timeoutGiay);
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
        CancellationToken ct = default, HttpMessageHandler? handler = null, IReadOnlyList<TimeSpan>? choThuLai = null)
    {
        using var api = new ApiClient(server, null, handler);
        // Máy chủ AiiGrow: POST /api/device/ghep {ma, nen, tenMay, maMay?} → {deviceId, token, dungChung} (mã 6 số Ba Mẹ tạo trong app).
        // maMay (MaMay.cs): máy chủ thu hồi bản ghi cũ của chính máy này nếu máy từng ghép nhà khác; null ⇒ bỏ khỏi JSON.
        // #685: lỗi đường truyền ⇒ tự thử lại cùng mã + maMay (máy chủ cấp lại token nếu lần trước đã ghép xong mà phản hồi mất).
        var maMay = MaMay.Doc();
        var res = await GhepThuLai.ChayAsync(() => api.PostAsync<PairResult>("api/device/ghep",
            new { ma = code.Trim(), nen = "windows", tenMay = deviceName, maMay }, ct), maMay != null, ct, choThuLai);
        if (string.IsNullOrEmpty(res.Token)) throw new ApiException("Máy chủ không trả token");
        res.Server = string.IsNullOrWhiteSpace(res.Server) ? NormalizeServer(server) : NormalizeServer(res.Server!);
        return res;
    }

    /// <param name="boiMa">15/11: phút «Tính phút» dùng lúc máy mở bằng mã offline của Ba Mẹ kể từ lần đồng bộ trước, THEO BÉ — máy chủ không trừ sao
    /// phần này (`boiMaCon`; `phutBoiMa` = tổng, cho máy chủ cũ). Rỗng ⇒ không gửi.</param>
    /// <param name="tongNgay">TỔNG phút trong ngày theo (app, bé) — không phải phần tăng (#433 A1: <see cref="UsageTotals.CanGui"/>).</param>
    public async Task<(Policy Policy, string Raw)> SyncAsync(AgentStatus status, IReadOnlyList<UsageEntry> tongNgay,
        CancellationToken ct = default, IReadOnlyList<(string? Con, int Phut)>? boiMa = null)
    {
        // Máy chủ AiiGrow: POST /api/device/dong-bo. Policy cho agent nằm ở trường `windows` (máy chủ dịch sẵn — server/lib/agent-windows.ts) + khối gốc `sao`, `cheDo`.
        // Máy chủ ghi phút dùng bằng greatest(…) ⇒ gửi TỔNG trong ngày theo (app, bé), không gửi phần tăng. 15/11 (#267): `con` = bé của dòng.
        // #433 A1: người gọi cộng phần tăng vào UsageTotals TRƯỚC khi gửi; gửi lỗi thì lần sau gửi lại đúng tổng đó.
        var raw = await SendAsync(HttpMethod.Post, "api/device/dong-bo", new DongBoBody
        {
            Status = status, ClientTime = DateTimeOffset.Now.ToString("O"),
            Usage = tongNgay.Select(u => new DongBoUsage { Muc = u.AppId, Phut = u.Minutes, Day = u.Day, Con = u.Con, CuoiLuc = u.CuoiLuc?.ToString("O") }).ToList(),
            PhutBoiMa = boiMa is { Count: > 0 } ? boiMa.Sum(x => x.Phut) : null,
            BoiMaCon = boiMa is { Count: > 0 } ? boiMa.Select(x => new DongBoBoiMa { Con = x.Con, Phut = x.Phut }).ToList() : null,
        }, ct);
        return (PolicyParser.TuDongBo(raw), raw);
    }

    /// <summary>Thân dong-bo (null bị bỏ khỏi JSON — máy chủ cũ không thấy trường lạ).</summary>
    internal sealed class DongBoBody
    {
        public AgentStatus Status { get; set; } = new();
        public string ClientTime { get; set; } = "";
        public List<DongBoUsage> Usage { get; set; } = new();
        public int? PhutBoiMa { get; set; }
        public List<DongBoBoiMa>? BoiMaCon { get; set; }
    }

    internal sealed class DongBoBoiMa
    {
        public string? Con { get; set; }
        public int Phut { get; set; }
    }

    internal sealed class DongBoUsage
    {
        public string Muc { get; set; } = "";
        public int Phut { get; set; }
        public string Day { get; set; } = "";
        public string? Con { get; set; }
        /// <summary>#433 A3: mốc cuối khung giờ chơi (ISO) — null bị bỏ khỏi JSON (máy chủ cũ không thấy trường lạ).</summary>
        public string? CuoiLuc { get; set; }
    }

    /// <summary>15/11 (#263/#265): «Xin Ba Mẹ cho vay sao» — POST yeu-cau {loai: vay_sao, soSao, mucDich, quaId?, lyDo?} → {id, trang_thai}. Lời nhắn không bắt buộc.</summary>
    public Task<RequestResult> XinVayAsync(int soSao, string? loiNhan, string? quaId = null, CancellationToken ct = default)
        => PostAsync<RequestResult>("api/device/yeu-cau", new
        {
            loai = LoaiXin.VaySao, soSao = XinVayView.Kep(soSao), mucDich = quaId == null ? "choi" : "qua", quaId,
            lyDo = string.IsNullOrWhiteSpace(loiNhan) ? null : loiNhan!.Trim(),
        }, ct);

    /// <summary>«Xin mở trang hoặc app» (POST yeu-cau {loai: mo_web | cai_app, giaTri, lyDo}). Ba Mẹ đồng ý ⇒ máy chủ đặt luật cho mục đó (lib/yeu-cau.ts).</summary>
    public Task<RequestResult> CreateOpenRequestAsync(string loai, string muc, string? note, CancellationToken ct = default)
        => PostAsync<RequestResult>("api/device/yeu-cau", new { loai = loai == LoaiXin.MoWeb ? LoaiXin.MoWeb : LoaiXin.CaiApp, giaTri = muc, lyDo = XinMoView.LyDo(note, muc) }, ct);

    /// <summary>Thiết kế 05/11 (L4): «Xin Ba Mẹ duyệt» app / web lạ — POST /api/device/xin-duyet {muc, ten?, lyDo?} → {id, trang_thai, daCo, loai, muc}.
    /// Máy chủ tự nhận app / web. Lý do không bắt buộc. #422: <paramref name="kieu"/> «app» | «web» (Con chọn thẻ ở hộp «Xin thêm app / web»; null = không gửi —
    /// máy chủ tự đoán như trước, máy chủ cũ bỏ qua trường lạ). kieu=web mà không phải tên miền ⇒ 400 web_sai (câu máy chủ ở ApiException.Message).</summary>
    public Task<RequestResult> XinDuyetAsync(string muc, string? ten, string? lyDo, string? kieu, CancellationToken ct = default)
        => PostAsync<RequestResult>("api/device/xin-duyet", new { muc, ten, lyDo = string.IsNullOrWhiteSpace(lyDo) ? null : lyDo!.Trim(), kieu = XinThemChonView.ChuanKieu(kieu) }, ct);

    /// <summary>Xét trước «Dùng sao để chơi?» cho một mục (POST phien/xet). Máy chủ quyết định cho hay không.</summary>
    public Task<PlayCheck> CheckPlayAsync(string muc, CancellationToken ct = default)
        => PostAsync<PlayCheck>("api/device/phien/xet", new { muc }, ct);

    /// <summary>Mở phiên chơi bằng sao (POST phien/mo) sau khi phien/xet trả "được".</summary>
    public Task<PlayOpen> OpenPlayAsync(string muc, CancellationToken ct = default)
        => PostAsync<PlayOpen>("api/device/phien/mo", new { muc }, ct);

    /// <summary>Gửi bù phút chơi khi mất mạng (POST phien/bu, agent 0.2.4) — thân do <see cref="PhienOffline.TaoBu"/> dựng; `ma` một lần.</summary>
    public Task<string> BuPhienAsync(object body, CancellationToken ct = default)
        => SendAsync(HttpMethod.Post, "api/device/phien/bu", body, ct);

    public async Task<RequestStatus> GetRequestAsync(string id, CancellationToken ct = default)
    {
        var raw = await SendAsync(HttpMethod.Get, "api/device/yeu-cau/" + Uri.EscapeDataString(id), null, ct);
        return Deserialize<RequestStatus>(raw);
    }

    // ---- 06/11 (L13 — docs/API.md mục «S3»): máy dùng chung — chọn tên + PIN, quên PIN, Ba Mẹ nhập mã, đổi bé / khoá lại

    /// <summary>GET ho-so — «Ai đang dùng máy?» (danh sách bé + vân PIN để kiểm lúc mất mạng). #337: luôn xin kèm luật của từng bé
    /// (`?offline=1` — máy chung có `con[].offline`; máy chủ cũ / máy riêng bỏ qua).</summary>
    public async Task<HoSoMay> HoSoAsync(CancellationToken ct = default)
        => Deserialize<HoSoMay>(await SendAsync(HttpMethod.Get, DuongHoSo, null, ct));

    public const string DuongHoSo = "api/device/ho-so?offline=1";

    /// <summary>POST dang-nhap-be {con, pin?} → {phienCon, con, coPin, canDatPin?}. Sai ⇒ ApiException pin_sai (conLan) / pin_tam_khoa (choGiay) / can_pin / khong_thay.</summary>
    public Task<DangNhapBeKq> DangNhapBeAsync(string con, string? pin, CancellationToken ct = default)
        => PostAsync<DangNhapBeKq>("api/device/dang-nhap-be", new { con, pin = string.IsNullOrEmpty(pin) ? null : pin }, ct);

    /// <summary>POST quen-pin {con} → {daGui, lapLai}.</summary>
    public Task<QuenPinKq> QuenPinAsync(string con, CancellationToken ct = default)
        => PostAsync<QuenPinKq>("api/device/quen-pin", new { con }, ct);

    /// <summary>POST ba-me-mo {ma} → {baMeDung: {den, tu}, phut}. Sai ⇒ ma_sai (conLan) / ma_tam_khoa (choGiay) / ma_da_dung.</summary>
    public Task<BaMeMoKq> BaMeMoAsync(string ma, CancellationToken ct = default)
        => PostAsync<BaMeMoKq>("api/device/ba-me-mo", new { ma }, ct);

    /// <summary>POST dang-xuat (bé «Đổi người / Đăng xuất») | khoa-lai (Ba Mẹ «Khoá lại») → {ok, khoa}.</summary>
    public Task<string> RoiMayAsync(bool khoaLai, CancellationToken ct = default)
        => SendAsync(HttpMethod.Post, khoaLai ? "api/device/khoa-lai" : "api/device/dang-xuat", new { }, ct);

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

    /// <summary>P1 (07/11): giữ một yêu cầu «chờ thay đổi» tới khi Ba Mẹ đổi gì (≤ ~25 giây). `ver` null ⇒ lấy mốc ngay. Dùng ApiClient có `timeoutGiay` ≥ 40.
    /// Máy chủ cũ (404) ⇒ ApiException 404 — nơi gọi lùi lâu.</summary>
    public async Task<KetQuaCho> ChoThayDoiAsync(long? ver, CancellationToken ct = default)
    {
        var raw = await SendAsync(HttpMethod.Get, "api/device/cho-thay-doi" + (ver is long v ? "?ver=" + v : ""), null, ct);
        return ChoThayDoi.Doc(raw) ?? throw new ApiException("Máy chủ trả «chờ thay đổi» không đúng định dạng");
    }

    /// <summary>Thăm dò nhẹ: có tới được máy chủ không (TCP/TLS + một yêu cầu HEAD gốc, hạn 8 giây; client mang sẵn token như mọi lời gọi khác). Mọi phản hồi HTTP (kể cả 404/401) tính là «tới được»;
    /// lỗi mạng / hết hạn / máy chủ 5xx tính là không. Không gửi dữ liệu.</summary>
    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        // HEAD: kết nối dùng chung (#562) phải đọc hết thân mới trả về pool — GET trang gốc là tải cả trang HTML mỗi 15 giây.
        // Proxy/cổng từ chối HEAD (5xx hoặc cắt kết nối) ⇒ thử GET như trước, với hạn riêng — không báo mất mạng nhầm.
        var head = await ThamDo(HttpMethod.Head, ct);
        if (head == true) return true;
        if (head == null && ct.IsCancellationRequested) throw new OperationCanceledException(ct);
        return await ThamDo(HttpMethod.Get, ct) == true;
    }

    /// <returns>true = tới được; false = hết hạn 8 giây; null = máy chủ/proxy trả 5xx hoặc lỗi kết nối (đáng thử cách khác).</returns>
    private async Task<bool?> ThamDo(HttpMethod phuongThuc, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(8));
        try
        {
            using var req = new HttpRequestMessage(phuongThuc, "");
            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            return (int)resp.StatusCode < 500 ? true : null;
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { return false; }
        catch (HttpRequestException) { return null; }
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
            throw new ApiException(CauLoi.QuaHan, null, new TimeoutException());
        }
        catch (HttpRequestException e)
        {
            throw new ApiException(CauLoi.MatMang, null, e);   // #688: câu .NET (tiếng Anh, tên máy chủ) chỉ ở InnerException
        }
        using (resp)
        {
            var text = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                var (code, msg) = ExtractError(text);
                throw new ApiException(CauLoi.AnToan(msg, CauLoi.TheoMa((int)resp.StatusCode)), (int)resp.StatusCode, code: code, body: text);   // #688: không hiện mã thô / mã HTTP
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
