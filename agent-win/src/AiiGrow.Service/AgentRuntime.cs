using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Trạng thái dùng chung giữa vòng sync và máy chủ named pipe.</summary>
public sealed class AgentRuntime
{
    private readonly object _gate = new();
    private readonly SemaphoreSlim _wake = new(0);
    private DateTime _cfgStamp = DateTime.MinValue;
    private bool _forceSync;

    private Policy? _policy;
    private DateTimeOffset _policyAt = DateTimeOffset.UtcNow;
    private double _usedSeconds;
    private bool _offline;
    private string? _fgId;
    private string? _fgName;
    private DateTimeOffset _fgAt = DateTimeOffset.MinValue;
    private int _blockedSeq;
    private string? _blockedId;
    private string? _blockedName;
    private DateTimeOffset? _lockStartedAt;
    private int _lockGraceSec = 60;

    public ConfigStore Store { get; } = new();
    public AgentConfig? Config { get; private set; }
    public UsageTracker Usage { get; } = new();
    public bool AppLockerApplied { get; set; }
    public int ChildSessionId { get; set; } = -1;

    public void LoadConfig()
    {
        lock (_gate)
        {
            Config = Store.Load();
            _cfgStamp = Store.LastWriteUtc;
            if (_policy == null && PolicyParser.TryParse(Config?.LastPolicyJson, out var p) && p != null)
            {
                _policy = p;
                _policyAt = Config?.LastPolicyAt ?? DateTimeOffset.UtcNow;
            }
        }
    }

    public void ReloadIfChanged()
    {
        if (Store.LastWriteUtc != _cfgStamp) LoadConfig();
    }

    public bool TokenInvalid { get; set; }

    public void SetPolicy(Policy p, string raw)
    {
        lock (_gate)
        {
            _policy = p;
            _policyAt = DateTimeOffset.UtcNow;
            _usedSeconds = 0;
            _offline = false;
            TokenInvalid = false;
            if (Config != null)
            {
                Config.LastPolicyJson = raw;
                Config.LastPolicyAt = _policyAt;
                // Giữ lại bí mật mã offline (máy chủ chỉ gửi khi có) để còn kiểm mã lúc mất mạng.
                if (!string.IsNullOrEmpty(p.MaOfflineBiMat)) Config.MaOfflineBiMat = p.MaOfflineBiMat;
                try { Store.Save(Config); _cfgStamp = Store.LastWriteUtc; } catch { }
            }
        }
    }

    public Policy? CurrentPolicy { get { lock (_gate) return _policy; } }

    public void SetOffline(bool v) { lock (_gate) _offline = v; }
    public bool IsOffline { get { lock (_gate) return _offline; } }

    public EffectivePolicy? Evaluate(DateTimeOffset now)
    {
        lock (_gate)
        {
            if (_policy == null) return null;
            return PolicyEvaluator.Evaluate(_policy, now, _usedSeconds);
        }
    }

    public void CountUsage(DateTimeOffset now, string appId, string appName, double seconds)
    {
        Usage.Add(now, appId, appName, seconds);
        lock (_gate)
        {
            bool learning = _policy?.LearningApps.Contains(appId.ToLowerInvariant()) == true;
            if (!learning) _usedSeconds += seconds;
        }
    }

    public void SetForeground(string? appId, string? appName)
    {
        lock (_gate) { _fgId = appId ?? ""; _fgName = appName; _fgAt = DateTimeOffset.UtcNow; }
    }

    /// <summary>Fresh = tray còn sống (báo trong 20 giây qua).</summary>
    public (string? Id, string? Name, bool Fresh) GetForeground(DateTimeOffset now)
    {
        lock (_gate) return (_fgId, _fgName, (now - _fgAt).TotalSeconds < 20);
    }

    public void RecordBlocked(string appId, string appName)
    {
        lock (_gate) { _blockedSeq++; _blockedId = appId; _blockedName = appName; }
    }

    public void SetLock(bool locked, string? reason, DateTimeOffset now, bool sessionActive)
    {
        lock (_gate)
        {
            if (!locked || !sessionActive) { _lockStartedAt = null; return; }
            _lockStartedAt ??= now;
            _lockGraceSec = reason == LockReasons.HetGio ? 60 : 10;
        }
    }

    public bool LockGraceExpired(DateTimeOffset now)
    {
        lock (_gate) return _lockStartedAt.HasValue && (now - _lockStartedAt.Value).TotalSeconds >= _lockGraceSec;
    }

    public TrayState BuildState(DateTimeOffset now)
    {
        lock (_gate)
        {
            var s = new TrayState { Paired = Config?.Paired == true, Offline = _offline };
            if (_policy == null) return s;
            var eff = PolicyEvaluator.Evaluate(_policy, now, _usedSeconds);
            s.ChildName = string.IsNullOrEmpty(_policy.ChildName) ? (Config?.ChildName ?? "") : _policy.ChildName;
            s.Mode = _policy.Mode;
            s.Locked = eff.Locked;
            s.LockReason = eff.LockReason;
            s.MinutesLeft = eff.MinutesLeft;
            s.GrantEndsAt = eff.GrantEndsAt;
            s.CanExchangePoints = _policy.CanExchangePoints;
            s.BlockedSeq = _blockedSeq;
            s.BlockedAppId = _blockedId;
            s.BlockedAppName = _blockedName;
            if (eff.Locked && _lockStartedAt.HasValue)
                s.LockGraceLeftSec = (int)Math.Max(0, Math.Ceiling(_lockGraceSec - (now - _lockStartedAt.Value).TotalSeconds));
            return s;
        }
    }

    public void RequestSyncSoon()
    {
        lock (_gate) _forceSync = true;
        if (_wake.CurrentCount == 0) _wake.Release();
    }

    public bool TakeForceSync()
    {
        lock (_gate) { var v = _forceSync; _forceSync = false; return v; }
    }

    public async Task WaitAsync(TimeSpan t, CancellationToken ct)
    {
        try { await _wake.WaitAsync(t, ct); } catch (OperationCanceledException) { }
    }

    public AgentStatus BuildStatus(bool childActive)
    {
        var now = DateTimeOffset.UtcNow;
        lock (_gate)
        {
            return new AgentStatus
            {
                Mode = _policy?.Mode ?? Modes.TuDo,
                AppLockerApplied = AppLockerApplied,
                TrayAlive = (now - _fgAt).TotalSeconds < 20,
                ChildSessionActive = childActive,
                Offline = _offline,
            };
        }
    }
}
