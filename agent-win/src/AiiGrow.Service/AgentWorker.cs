using AiiGrow.Core;

namespace AiiGrow.Service;

public sealed class AgentWorker : BackgroundService
{
    private readonly ILogger<AgentWorker> _log;
    private readonly AgentRuntime _rt;
    private readonly AppLockerController _locker;
    private readonly IProcessControl _procs;

    public AgentWorker(ILogger<AgentWorker> log, AgentRuntime rt, AppLockerController locker, IProcessControl? procs = null)
    {
        _log = log; _rt = rt; _locker = locker; _procs = procs ?? new WindowsProcessControl();
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("AiiGrow service bắt đầu");
        _rt.LoadConfig();
        var last = DateTimeOffset.Now;
        var nextSync = DateTimeOffset.MinValue;
        var lastDisconnect = DateTimeOffset.MinValue;
        string? lastCheDo = null;
        bool lastMoCoi = false;

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var now = DateTimeOffset.Now;
                var elapsed = Math.Min((now - last).TotalSeconds, 15);
                last = now;
                _rt.ReloadIfChanged();
                var cfg = _rt.Config;
                // Đang gỡ từ xa (HeartbeatWorker): đứng yên, không áp lại luật nào trong lúc dọn.
                if (_rt.DangGo) { await _rt.WaitAsync(TimeSpan.FromSeconds(5), ct); continue; }
                if (cfg is { Paired: true })
                {
                    var sess = string.IsNullOrEmpty(cfg.ChildUser) ? null : SessionHelper.Find(cfg.ChildUser);
                    _rt.ChildSessionId = sess?.SessionId ?? -1;
                    bool active = sess is { Active: true };

                    CountUsage(now, elapsed, active);

                    _rt.TinhCheDo(now);   // để status gửi lên trong lần đồng bộ này là chế độ THẬT đang áp
                    bool force = _rt.TakeForceSync();
                    if (force || now >= nextSync) nextSync = await SyncAsync(cfg, active, now, ct);

                    // Fail-open: token bị từ chối quá MoCoi.Nguong ⇒ bỏ Policy cuối, về giám sát (kể cả khi chỉ HeartbeatWorker thấy 401).
                    bool moCoi = _rt.KiemMoCoi(DateTimeOffset.Now);
                    var cheDo = _rt.TinhCheDo(DateTimeOffset.Now);
                    if (cheDo != lastCheDo || moCoi != lastMoCoi)
                    {
                        _log.LogInformation("Chế độ đang áp: {cheDo}{moCoi}", cheDo, moCoi ? $" (máy mồ côi > {MoCoi.GioNguong} giờ — thôi chặn)" : "");
                        lastCheDo = cheDo; lastMoCoi = moCoi;
                    }
                    // Chế độ GIÁM SÁT (mặc định, Ba Mẹ chọn trên app, hoặc máy mồ côi): chỉ ghi log việc SẼ chặn/khoá, không áp thật.
                    bool apThat = CheDoHieuLuc.LaChan(cheDo);

                    // Đua AgentWorker ↔ gỡ từ xa: lệnh «go» có thể tới (HeartbeatWorker đặt DangGo) SAU chỗ kiểm đầu vòng, ngay trước khi áp luật.
                    // Kiểm lại DangGo NGAY TRƯỚC khi áp AppLocker / enforcement để không áp lại luật vào đúng lúc đang gỡ (tránh luật «dính» lại sau khi gỡ).
                    if (_rt.DangGo) { await _rt.WaitAsync(TimeSpan.FromSeconds(5), ct); continue; }

                    var p = _rt.CurrentPolicy;
                    var eff = _rt.Evaluate(DateTimeOffset.Now);
                    if (!apThat || p == null || eff == null)
                    {
                        // Không chặn thật ⇒ luật AppLocker của AiiGrow phải KHÔNG còn (đổi sang giám sát là gỡ ngay, không chờ khởi động lại).
                        _rt.AppLockerApplied = _locker.Reconcile(false, cfg.ChildSid, Array.Empty<string>());
                    }
                    if (p != null && eff != null)
                    {
                        if (apThat)
                        {
                            var applied = _locker.Reconcile(eff.AppLockerWanted, cfg.ChildSid, p.AllowedApps);
                            _rt.AppLockerApplied = applied;
                        }
                        else if (eff.AppLockerWanted)
                        {
                            _log.LogDebug("GIÁM SÁT: sẽ áp AppLocker (chỉ cho {n} app) — chưa áp thật (CheDo=giam-sat)", p.AllowedApps.Count);
                        }

                        if (eff.AppLockerWanted && sess != null) EnforceAllowList(sess.SessionId, p, apThat);

                        _rt.SetLock(eff.Locked, eff.LockReason, now, active);
                        if (eff.Locked && active && _rt.LockGraceExpired(now) && (now - lastDisconnect).TotalSeconds > 30)
                        {
                            lastDisconnect = now;
                            if (apThat)
                            {
                                _log.LogInformation("Khoá ({reason}): ngắt phiên {id}", eff.LockReason, sess!.SessionId);
                                SessionHelper.Disconnect(sess.SessionId);
                            }
                            else
                            {
                                _log.LogInformation("GIÁM SÁT: sẽ khoá/ngắt phiên {id} ({reason}) — chưa khoá thật (CheDo=giam-sat)", sess!.SessionId, eff.LockReason);
                            }
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
            if (e is ApiException { LaTokenSai: true })
            {
                _rt.GhiTuChoi(DateTimeOffset.Now);
                _log.LogError("Token máy bị từ chối (token_sai — máy bị gỡ khỏi gia đình?) — quá {h} giờ liên tục thì AiiGrow tự thôi chặn", MoCoi.GioNguong);
            }
            else _log.LogWarning("Sync lỗi, chạy theo policy cuối: {m}", e.Message);
            return DateTimeOffset.Now.AddSeconds(30);
        }
    }

    /// <summary>Dự phòng khi AppLocker chưa áp hoặc app đã chạy sẵn: đóng tiến trình ngoài danh sách trong phiên con.
    /// Quyết định "đóng cái nào" nằm ở lớp thuần <see cref="ProcessEnforcer"/>; worker chỉ cung cấp cổng hệ thống.</summary>
    private void EnforceAllowList(int sessionId, Policy p, bool apThat)
    {
        // Giám sát (apThat=false): dryRun — liệt kê app SẼ bị đóng nhưng KHÔNG đóng thật.
        var closed = ProcessEnforcer.Enforce(_procs, sessionId, p.AllowedApps, dryRun: !apThat);
        foreach (var exe in closed)
        {
            if (apThat) _log.LogInformation("Đóng app ngoài danh sách: {exe}", exe);
            else _log.LogInformation("GIÁM SÁT: sẽ đóng app ngoài danh sách: {exe} — chưa đóng thật (CheDo=giam-sat)", exe);
            var bare = exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? exe[..^4] : exe;
            if (apThat) _rt.RecordBlocked(exe, bare);   // giám sát: app không bị đóng ⇒ không hiện màn «app bị chặn»
        }
    }
}
