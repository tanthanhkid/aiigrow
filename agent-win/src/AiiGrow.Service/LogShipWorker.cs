using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Mỗi 2 phút đẩy nhật ký mới (FileLog) lên POST /api/device/log để Ba Mẹ / AiiLab xem từ xa. Lỗi mạng ⇒ trả lại hàng đợi, lần sau gửi.</summary>
public sealed class LogShipWorker : BackgroundService
{
    private readonly FileLog _log;
    private readonly ConfigStore _store = new();
    private readonly Func<string, string, LogClient> _client;

    public LogShipWorker(FileLog log, Func<string, string, LogClient>? client = null)
    {
        _log = log;
        _client = client ?? ((server, token) => new LogClient(server, token));
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try { await GuiMotLuot(ct); } catch (Exception e) when (e is not OperationCanceledException) { /* ghi lại ở lần sau */ _ = e; }
            try { await Task.Delay(TimeSpan.FromMinutes(2), ct); } catch (OperationCanceledException) { break; }
        }
    }

    public async Task GuiMotLuot(CancellationToken ct)
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return;
        using var c = _client(cfg.Server, cfg.Token);
        while (_log.ChoGui > 0)
        {
            var lo = _log.LayDeGui();
            try { await c.GuiAsync(lo, ct); }
            catch { _log.TraLai(lo); throw; }
        }
    }
}
