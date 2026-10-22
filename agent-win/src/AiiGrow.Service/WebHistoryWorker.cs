using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Mỗi 5 phút đọc lịch sử trình duyệt của Con và gửi TỔNG theo (ngày, tên miền) lên máy chủ (POST web/lich-su).
/// Chạy ở cả hai chế độ (Giám sát và Chặn thật) — ghi lịch sử không chặn gì cả. Lỗi mạng: lần sau gửi lại (tổng, không cộng đôi).</summary>
public sealed class WebHistoryWorker : BackgroundService
{
    public static readonly TimeSpan Nhip = TimeSpan.FromMinutes(5);
    private readonly ILogger<WebHistoryWorker> _log;
    private readonly ConfigStore _store = new();
    private readonly ChromiumHistorySource _src = new();
    private string? _daGui;   // dấu vân tay lần gửi thành công cuối: không đổi ⇒ khỏi gửi lại

    public WebHistoryWorker(ILogger<WebHistoryWorker> log) { _log = log; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try { await Task.Delay(TimeSpan.FromSeconds(45), ct); } catch (OperationCanceledException) { return; }
        while (!ct.IsCancellationRequested)
        {
            try { await MotLuot(ct); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogDebug("Gửi lịch sử web lỗi (lần sau thử lại): {m}", e.Message); }
            try { await Task.Delay(Nhip, ct); } catch (OperationCanceledException) { break; }
        }
    }

    public async Task MotLuot(CancellationToken ct)
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return;
        var hoSo = ChromiumHistorySource.HoSoCanDoc(cfg);
        if (hoSo.Count == 0) return;
        string? host = null;
        try { host = new Uri(ApiClient.NormalizeServer(cfg.Server)).Host; } catch { }
        var ds = WebHistory.TongHop(_src.Doc(hoSo, WebHistory.MocDoc(DateTimeOffset.Now)), host is null ? null : WebDomain.GocTuHost(host));
        if (ds.Count == 0) return;
        var vt = string.Join("\n", ds.Select(x => $"{x.Ngay}|{x.TenMien}|{x.SoLan}|{x.Giay}"));
        if (vt == _daGui) return;
        using var c = new WebHistoryClient(cfg.Server, cfg.Token);
        foreach (var lo in ds.Chunk(400)) await c.GuiAsync(lo, ct);
        _daGui = vt;
        _log.LogInformation("Đã gửi lịch sử web: {n} dòng (tên miền × ngày)", ds.Count);
    }
}
