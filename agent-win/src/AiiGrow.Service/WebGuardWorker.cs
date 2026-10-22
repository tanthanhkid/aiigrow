using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Áp danh sách chặn / cho phép web của máy chủ vào chính sách Chrome / Edge / Brave (registry HKLM) — xem Core/WebGuard.cs.
/// Chỉ ở chế độ «Chặn thật». Giám sát, máy mồ côi, đang gỡ, Con đang mở tạm bằng mã offline, hoặc máy chưa ghép ⇒ GỠ hết chính sách của AiiGrow.
/// Đọc Policy cuối đã lưu (AgentConfig.LastPolicyJson) nên mất mạng vẫn giữ nguyên luật.</summary>
public sealed class WebGuardWorker : BackgroundService
{
    private readonly ILogger<WebGuardWorker> _log;
    private readonly AgentRuntime? _rt;
    private readonly ConfigStore _store = new();
    private readonly WebPolicyApplier _applier;

    public WebGuardWorker(ILogger<WebGuardWorker> log, AgentRuntime? rt = null, WebPolicyApplier? applier = null)
    {
        _log = log;
        _rt = rt;
        _applier = applier ?? new WebPolicyApplier(new WindowsWebPolicyRegistry());
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
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
            _log.LogInformation(p == null ? "Đã gỡ chính sách web của AiiGrow khỏi trình duyệt" : "Đã áp chính sách web: chế độ {c}, chặn {a}, cho phép {b}", p?.CheDo, p?.Chan.Count, p?.Cho.Count);
    }
}
