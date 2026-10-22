using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// Dịch vụ AiiGrow (phần mốc này): heartbeat/đồng bộ Policy định kỳ với máy chủ, gửi sự kiện qua hàng đợi offline, và thực thi lệnh
/// GỠ TỪ XA ("go") máy chủ trả trong lúc đồng bộ. Dịch vụ chạy LocalSystem; bị dừng thì SCM tự khởi động lại (đặt ở bộ cài).
/// Lớp đọc/áp Policy chi tiết (khung giờ, Fun list, phiên điểm) + màn chặn đang chờ — worker này chỉ lo heartbeat + gỡ từ xa.
/// </summary>
public sealed class HeartbeatWorker : BackgroundService
{
    private readonly ILogger<HeartbeatWorker> _log;
    private readonly IHostApplicationLifetime _life;
    private readonly ConfigStore _store = new();
    private readonly Func<string, string, IHeartbeatApi> _apiFactory;
    private readonly ISystemUninstaller _uninstaller;
    private bool _online = true;

    public HeartbeatWorker(ILogger<HeartbeatWorker> log, IHostApplicationLifetime life,
        Func<string, string, IHeartbeatApi>? apiFactory = null, ISystemUninstaller? uninstaller = null)
    {
        _log = log;
        _life = life;
        _apiFactory = apiFactory ?? ((server, token) => new HeartbeatClient(server, token));
        _uninstaller = uninstaller ?? new SystemUninstaller();
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("AiiGrow service bắt đầu (heartbeat + gỡ từ xa)");
        while (!ct.IsCancellationRequested)
        {
            var wait = 60;
            try
            {
                var cfg = _store.Load();
                if (cfg is not { Paired: true })
                {
                    _log.LogDebug("Chưa ghép máy — chờ bộ cài ghép xong");
                    wait = 30;
                }
                else
                {
                    wait = await TickAsync(cfg, ct);
                    if (wait < 0) return; // đã gỡ từ xa: dừng dịch vụ
                }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                _log.LogError(e, "Lỗi vòng heartbeat");
            }
            try { await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(wait, 15, 900)), ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>Một nhịp heartbeat. → số giây tới nhịp sau, hoặc -1 nếu đã gỡ máy (dừng dịch vụ).</summary>
    private async Task<int> TickAsync(AgentConfig cfg, CancellationToken ct)
    {
        var api = _apiFactory(cfg.Server, cfg.Token);
        try
        {
            var status = new { agent = "windows", version = Version(), online = true };
            SyncResult sync;
            try
            {
                sync = await api.SyncAsync(status, DateTimeOffset.UtcNow.ToString("o"), ct);
            }
            catch (ApiException e) when (e.IsNetwork)
            {
                if (_online) { _online = false; Save(c => Enqueue(c, new SuKien { Loai = "offline" })); }
                _log.LogWarning("Đồng bộ lỗi (chạy offline): {m}", e.Message);
                return 30;
            }
            catch (ApiException e) when (e.IsUnauthorized)
            {
                // Token thiết bị không còn hợp lệ. KHÔNG tự gỡ (tránh gỡ nhầm do lỗi thoáng qua); chờ lệnh "go" tường minh.
                _log.LogWarning("Token thiết bị bị từ chối — chờ lệnh gỡ hoặc ghép lại");
                return 120;
            }
            _online = true;

            // Gỡ từ xa: máy chủ trả lenh "go".
            var done = await new CommandProcessor(_uninstaller).ProcessAsync(sync, api, ct);
            if (done)
            {
                _log.LogInformation("Đã nhận lệnh gỡ từ xa — gỡ sạch xong, dừng dịch vụ");
                _life.StopApplication();
                return -1;
            }

            // Gửi hàng đợi offline khi có mạng lại.
            if (cfg.Queue.Items.Count > 0)
            {
                var truoc = cfg.Queue.Items.Select(x => x.Ma).ToList();
                var n = await cfg.Queue.FlushAsync(api, ct);
                if (n > 0)
                {
                    // Chỉ bỏ đúng các mục đã gửi khỏi bản trên đĩa — sự kiện mới (vd «mo_ma_offline») thêm trong lúc gửi vẫn giữ.
                    var daGui = truoc.Except(cfg.Queue.Items.Select(x => x.Ma)).ToHashSet();
                    Save(c => c.Queue.Items.RemoveAll(x => daGui.Contains(x.Ma)));
                    _log.LogInformation("Đã gửi {n} sự kiện tồn", n);
                }
            }
            return sync.NextCheckSec;
        }
        finally
        {
            (api as IDisposable)?.Dispose();
        }
    }

    private void Enqueue(AgentConfig cfg, SuKien e)
    {
        e.ChiTiet ??= new() { ["may"] = Environment.MachineName };
        cfg.Queue.Add(e);
    }

    /// <summary>Sửa cấu hình qua <see cref="ConfigStore.Update"/> (đọc bản trên đĩa trong khoá chung) ⇒ không ghi đè phần
    /// dịch vụ thực thi vừa lưu (lượt «mở tạm bằng mã offline», sự kiện mới trong hàng đợi).</summary>
    private void Save(Action<AgentConfig> change)
    {
        try { _store.Update(change); } catch (Exception e) { _log.LogWarning("Lưu cấu hình lỗi: {m}", e.Message); }
    }

    private static string Version() => typeof(HeartbeatWorker).Assembly.GetName().Version?.ToString() ?? "0";
}
