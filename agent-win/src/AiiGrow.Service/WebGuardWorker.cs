using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Áp danh sách chặn / cho phép web của máy chủ vào chính sách Chrome / Edge / Brave / Cốc Cốc TRONG HIVE TÀI KHOẢN CON (HKU\<SID Con>) — xem Core/WebHives.cs.
/// 0.2.6: không còn ghi HKLM (HKLM áp cho cả máy ⇒ chặn cả tài khoản Ba Mẹ — issue #68/S1); luật cũ trong HKLM được gỡ sạch một lần khi khởi động.
/// Chỉ ở chế độ «Chặn thật». Giám sát, máy mồ côi, đang gỡ, Con đang mở tạm bằng mã offline, hoặc máy chưa ghép ⇒ GỠ hết chính sách của AiiGrow.
/// Đọc Policy cuối đã lưu (AgentConfig.LastPolicyJson) nên mất mạng vẫn giữ nguyên luật. Đổi/gỡ luật ⇒ tăng <see cref="AgentRuntime.WebRev"/> để khay của Con
/// làm mới chính sách trình duyệt (dịch vụ SYSTEM không làm mới được chính sách của người dùng khác).</summary>
public sealed class WebGuardWorker : BackgroundService
{
    private readonly ILogger<WebGuardWorker> _log;
    private readonly AgentRuntime? _rt;
    private readonly ConfigStore _store = new();
    private readonly WebPolicyHives _hives;
    private readonly bool _baoDocLai;
    private string? _daBaoHive;
    private string? _daBaoLoi;

    public WebGuardWorker(ILogger<WebGuardWorker> log, AgentRuntime? rt = null, WebPolicyHives? hives = null)
    {
        _log = log;
        _rt = rt;
        _hives = hives ?? new WebPolicyHives(new WindowsWebHiveHost());
        _baoDocLai = hives == null;   // bản giả trong test không đụng Group Policy thật
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Yield();   // vòng đầu không chạy đồng bộ trong lúc host khởi động
        while (!ct.IsCancellationRequested)
        {
            try { MotVong(DateTimeOffset.UtcNow); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Áp chính sách web lỗi (thử lại sau): {m}", e.Message); }
            try { await Task.Delay(TimeSpan.FromSeconds(30), ct); } catch (OperationCanceledException) { break; }
        }
    }

    public void MotVong(DateTimeOffset now)
    {
        var cfg = _store.Load();
        var p = WebGuard.CanAp(cfg, _rt?.DangGo == true, now);
        string? host = null;
        try { if (cfg is { Paired: true }) host = new Uri(ApiClient.NormalizeServer(cfg.Server)).Host; } catch { }
        var kq = _hives.Ap(p, host, _rt?.ChildSids, now);
        if (kq.DaGoHklm)
        {
            _log.LogInformation("Đã gỡ luật web cũ trong HKLM (bản trước 0.2.6 ghi cả máy) — tài khoản Ba Mẹ không còn bị chặn");
            if (_baoDocLai) _log.LogInformation("Báo trình duyệt (cả máy) đọc lại chính sách: {c}", WindowsWebPolicyRegistry.BaoTrinhDuyetDocLai());
        }
        if (kq.LoiGoHklm != null) _log.LogWarning("Gỡ luật web cũ trong HKLM lỗi (thử lại sau): {m}", kq.LoiGoHklm);
        if (kq.DaDoi)
        {
            _log.LogInformation(p == null ? "Đã gỡ chính sách web của AiiGrow khỏi tài khoản Con" : "Đã áp chính sách web cho tài khoản Con: chế độ {c}, chặn {a}, cho phép {b}", p?.CheDo, p?.Chan.Count, p?.Cho.Count);
            _rt?.WebDaDoi();   // khay (phiên Con) làm mới chính sách trình duyệt + nhắc mở lại trình duyệt
        }
        var loiHive = string.Join("; ", kq.LoiHive ?? Array.Empty<string>());
        if (loiHive != _daBaoLoi)
        {
            _daBaoLoi = loiHive;
            if (loiHive.Length > 0) _log.LogWarning("Ghi luật web vào hive tài khoản Con lỗi (thử lại mỗi 30 giây): {loi}", loiHive);
        }
        // chưa có hồ sơ của Con (chưa đăng nhập lần nào) ⇒ chưa áp được; ghi log một lần cho mỗi tập SID
        var chua = string.Join(",", kq.ChuaCoHive);
        if (chua != _daBaoHive)
        {
            _daBaoHive = chua;
            if (chua.Length > 0) _log.LogInformation("Luật web chưa áp được cho {sid}: hồ sơ Windows chưa có / đang bị khoá — thử lại mỗi 30 giây, áp ngay khi Con đăng nhập", chua);
        }
    }
}
