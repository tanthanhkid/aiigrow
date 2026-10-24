using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Áp danh sách chặn / cho phép web của máy chủ vào chính sách Chrome / Edge / Brave / Cốc Cốc (registry HKLM) — xem Core/WebGuard.cs.
/// Chỉ ở chế độ «Chặn thật». Giám sát, máy mồ côi, đang gỡ, Con đang mở tạm bằng mã offline, hoặc máy chưa ghép ⇒ GỠ hết chính sách của AiiGrow.
/// Đọc Policy cuối đã lưu (AgentConfig.LastPolicyJson) nên mất mạng vẫn giữ nguyên luật.</summary>
public sealed class WebGuardWorker : BackgroundService
{
    private readonly ILogger<WebGuardWorker> _log;
    private readonly AgentRuntime? _rt;
    private readonly ConfigStore _store = new();
    private readonly WebPolicyApplier _applier;
    private readonly bool _baoDocLai;

    public WebGuardWorker(ILogger<WebGuardWorker> log, AgentRuntime? rt = null, WebPolicyApplier? applier = null)
    {
        _log = log;
        _rt = rt;
        _applier = applier ?? new WebPolicyApplier(new WindowsWebPolicyRegistry());
        _baoDocLai = applier == null;   // bản giả trong test không đụng Group Policy thật
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
        if (_applier.Ap(p, host))
        {
            _log.LogInformation(p == null ? "Đã gỡ chính sách web của AiiGrow khỏi trình duyệt" : "Đã áp chính sách web: chế độ {c}, chặn {a}, cho phép {b}", p?.CheDo, p?.Chan.Count, p?.Cho.Count);
            // trình duyệt đang mở đọc lại luật ngay (không cần tắt hẳn Chrome)
            if (_baoDocLai) _log.LogInformation("Báo trình duyệt đọc lại chính sách: {c}", WindowsWebPolicyRegistry.BaoTrinhDuyetDocLai());
        }
    }
}
