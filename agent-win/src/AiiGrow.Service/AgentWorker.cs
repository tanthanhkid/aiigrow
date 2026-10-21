using System.Diagnostics;
using AiiGrow.Core;

namespace AiiGrow.Service;

public sealed class AgentWorker : BackgroundService
{
    private readonly ILogger<AgentWorker> _log;
    private readonly AgentRuntime _rt;
    private readonly AppLockerController _locker;

    public AgentWorker(ILogger<AgentWorker> log, AgentRuntime rt, AppLockerController locker)
    {
        _log = log; _rt = rt; _locker = locker;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("AiiGrow service bắt đầu");
        _rt.LoadConfig();
        var last = DateTimeOffset.Now;
        var nextSync = DateTimeOffset.MinValue;
        var lastDisconnect = DateTimeOffset.MinValue;

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var now = DateTimeOffset.Now;
                var elapsed = Math.Min((now - last).TotalSeconds, 15);
                last = now;
                _rt.ReloadIfChanged();
                var cfg = _rt.Config;
                if (cfg is { Paired: true })
                {
                    var sess = string.IsNullOrEmpty(cfg.ChildUser) ? null : SessionHelper.Find(cfg.ChildUser);
                    _rt.ChildSessionId = sess?.SessionId ?? -1;
                    bool active = sess is { Active: true };

                    CountUsage(now, elapsed, active);

                    bool force = _rt.TakeForceSync();
                    if (force || now >= nextSync) nextSync = await SyncAsync(cfg, active, now, ct);

                    var p = _rt.CurrentPolicy;
                    var eff = _rt.Evaluate(DateTimeOffset.Now);
                    if (p != null && eff != null)
                    {
                        var applied = _locker.Reconcile(eff.AppLockerWanted, cfg.ChildSid, p.AllowedApps);
                        _rt.AppLockerApplied = applied;
                        if (eff.AppLockerWanted && sess != null) EnforceAllowList(sess.SessionId, p);

                        _rt.SetLock(eff.Locked, eff.LockReason, now, active);
                        if (eff.Locked && active && _rt.LockGraceExpired(now) && (now - lastDisconnect).TotalSeconds > 30)
                        {
                            lastDisconnect = now;
                            _log.LogInformation("Khoá ({reason}): ngắt phiên {id}", eff.LockReason, sess!.SessionId);
                            SessionHelper.Disconnect(sess.SessionId);
                        }
                    }
                }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                _log.LogError(e, "Lỗi trong vòng lặp");
            }
            await _rt.WaitAsync(TimeSpan.FromSeconds(5), ct);
        }
    }

    private void CountUsage(DateTimeOffset now, double elapsed, bool sessionActive)
    {
        var eff = _rt.Evaluate(now);
        if (!sessionActive || eff == null || eff.Locked || elapsed <= 0) return;
        var (id, name, fresh) = _rt.GetForeground(now);
        // Tray báo không có cửa sổ tiền cảnh (màn hình đã khoá): không tính giờ.
        if (fresh && string.IsNullOrEmpty(id)) return;
        // Tray chết: vẫn tính giờ phiên con dưới tên "không rõ" (con không thể ngưng đồng hồ bằng cách tắt tray).
        _rt.CountUsage(now, fresh ? id! : "khong-ro", fresh ? (name ?? id!) : "Không rõ", elapsed);
    }

    private async Task<DateTimeOffset> SyncAsync(AgentConfig cfg, bool active, DateTimeOffset now, CancellationToken ct)
    {
        var usage = _rt.Usage.Drain();
        try
        {
            using var api = new ApiClient(cfg.Server, cfg.Token);
            var (policy, raw) = await api.SyncAsync(_rt.BuildStatus(active), usage, ct);
            _rt.SetPolicy(policy, raw);
            return DateTimeOffset.Now.AddSeconds(policy.NextCheckSec);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            _rt.Usage.Restore(usage);
            _rt.SetOffline(true);
            if (e is ApiException { IsUnauthorized: true }) { _rt.TokenInvalid = true; _log.LogError("Token máy không còn hợp lệ (cần ghép lại)"); }
            else _log.LogWarning("Sync lỗi, chạy theo policy cuối: {m}", e.Message);
            return DateTimeOffset.Now.AddSeconds(30);
        }
    }

    /// <summary>Dự phòng khi AppLocker chưa áp hoặc app đã chạy sẵn: đóng tiến trình ngoài danh sách trong phiên con.</summary>
    private void EnforceAllowList(int sessionId, Policy p)
    {
        var allowed = new HashSet<string>(p.AllowedApps, StringComparer.OrdinalIgnoreCase);
        var safe = ProcessGuard.DefaultSafeDirs();
        var allowedDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var cand = new List<(Process Proc, string Path)>();
        foreach (var pr in Process.GetProcesses())
        {
            string? path = null;
            try
            {
                if (pr.SessionId == sessionId) path = pr.MainModule?.FileName;
            }
            catch { }
            if (string.IsNullOrEmpty(path)) { pr.Dispose(); continue; }
            cand.Add((pr, path));
            if (allowed.Contains(Path.GetFileName(path)))
            {
                var d = Path.GetDirectoryName(path);
                if (d != null) allowedDirs.Add(d);
            }
        }
        foreach (var (proc, path) in cand)
        {
            try
            {
                if (ProcessGuard.ShouldClose(path, allowed, allowedDirs, safe))
                {
                    var exe = Path.GetFileName(path).ToLowerInvariant();
                    _log.LogInformation("Đóng app ngoài danh sách: {exe}", exe);
                    proc.Kill();
                    _rt.RecordBlocked(exe, Path.GetFileNameWithoutExtension(path));
                }
            }
            catch { }
            finally { proc.Dispose(); }
        }
    }
}
