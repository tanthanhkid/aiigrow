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
    private DateTimeOffset? _offlineSince;
    private DateTimeOffset? _lastSyncAt;
    private string? _fgId;
    private string? _fgName;
    private DateTimeOffset _fgAt = DateTimeOffset.MinValue;
    private int _blockedSeq;
    private string? _blockedId;
    private string? _blockedName;
    private DateTimeOffset? _lockStartedAt;
    private int _lockGraceSec = 60;
    /// <summary>0.2.4: phút chơi khi mất mạng chưa gửi bù (bản trong bộ nhớ; ghi đĩa ở Config.PhienOffline).</summary>
    private PhienOffline? _phienOffline;

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
            // Máy mồ côi (token bị từ chối quá MoCoi.Nguong) ⇒ KHÔNG nạp lại Policy cuối (không áp luật cũ sau khởi động lại).
            // LastPolicyJson là CẢ phản hồi dong-bo ⇒ lấy phần `windows` (LayWindows nhận cả dạng phẳng cũ) — không thì mất mạng + khởi động lại nạp «tự do» rỗng.
            if (_policy == null && !MoCoi.La(Config, DateTimeOffset.UtcNow) && PolicyParser.TryParse(ApiClient.LayWindows(Config?.LastPolicyJson ?? ""), out var p) && p != null)
            {
                _policy = p;
                _policyAt = Config?.LastPolicyAt ?? DateTimeOffset.UtcNow;
            }
            _cheDo = AiiGrow.Core.CheDoHieuLuc.Chon(_policy?.CheDo, Config?.CheDo, MoCoi.La(Config, DateTimeOffset.UtcNow));
            // nạp lại khi worker khác ghi cấu hình: bản trong bộ nhớ có thể mới hơn bản trên đĩa (đĩa ghi 30 giây/lần)
            _phienOffline = PhienOffline.Chon(_phienOffline, Config?.PhienOffline);
        }
    }

    public void ReloadIfChanged()
    {
        if (Store.LastWriteUtc != _cfgStamp) LoadConfig();
    }

    public bool TokenInvalid { get; set; }

    /// <summary>Đang thực thi lệnh gỡ từ xa ⇒ vòng thực thi đứng yên (không áp lại AppLocker trong lúc gỡ).</summary>
    public volatile bool DangGo;

    private string _cheDo = CheDoAgent.GiamSat;
    /// <summary>Chế độ đang áp (lần tính gần nhất ở <see cref="TinhCheDo"/>).</summary>
    public string CheDoHieuLuc { get { lock (_gate) return _cheDo; } }

    /// <summary>Máy chủ (Ba Mẹ chọn) thắng cấu hình cục bộ; mồ côi ⇒ giám sát. Gọi mỗi vòng thực thi.</summary>
    public string TinhCheDo(DateTimeOffset now)
    {
        lock (_gate)
        {
            _cheDo = AiiGrow.Core.CheDoHieuLuc.Chon(_policy?.CheDo, Config?.CheDo, MoCoi.La(Config, now));
            return _cheDo;
        }
    }

    public bool LaMoCoi(DateTimeOffset now) { lock (_gate) return MoCoi.La(Config, now); }

    /// <summary>Máy chủ từ chối token (401/403). Lưu mốc lần đầu; quá ngưỡng ⇒ fail-open (bỏ Policy cuối, về giám sát).</summary>
    public void GhiTuChoi(DateTimeOffset now)
    {
        lock (_gate)
        {
            TokenInvalid = true;
            AgentConfig? moi = null;
            try { moi = Store.UpdateIf(c => MoCoi.GhiTuChoi(c, now)); } catch { }
            if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
            else if (Config != null) MoCoi.GhiTuChoi(Config, now);
            BoPolicyNeuMoCoi(now);
        }
    }

    private long? _tickTruoc;
    private double _chayChoGhi;

    /// <summary>Gọi MỖI vòng thực thi với <see cref="Environment.TickCount64"/>: cộng thời gian chạy (đồng hồ đơn điệu, trần
    /// <see cref="MoCoi.TranMoiVongGiay"/>/vòng) vào bộ đếm mất liên lạc — fail-open 14 ngày cần cả bộ đếm này, không chỉ đồng hồ thật.
    /// Giữ trong bộ nhớ, ghi đĩa ~5 phút/lần (mất tối đa vài phút khi tắt máy đột ngột ⇒ chỉ làm fail-open muộn hơn, không sớm hơn).</summary>
    public void GhiNhipChay(long tickMs)
    {
        lock (_gate)
        {
            var truoc = _tickTruoc;
            _tickTruoc = tickMs;
            if (truoc == null || Config == null) return;
            double giay = (tickMs - truoc.Value) / 1000.0;
            if (!(giay > 0)) return;
            giay = Math.Min(giay, MoCoi.TranMoiVongGiay);
            MoCoi.CongChay(Config, giay);
            _chayChoGhi += giay;
            if (_chayChoGhi < 300) return;
            var cho = _chayChoGhi;
            _chayChoGhi = 0;
            AgentConfig? moi = null;
            try { moi = Store.Update(c => c.MatLienLacChayGiay += cho); } catch { }
            if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
        }
    }

    /// <summary>Kiểm mồ côi (kể cả khi chỉ HeartbeatWorker ghi mốc). → true nếu đang mồ côi.</summary>
    public bool KiemMoCoi(DateTimeOffset now)
    {
        lock (_gate)
        {
            if (!MoCoi.La(Config, now)) return false;
            if (Config!.LastPolicyJson != null || Config.CheDo != CheDoAgent.GiamSat)
            {
                AgentConfig? moi = null;
                try { moi = Store.UpdateIf(c => MoCoi.ApDung(c, now)); } catch { }
                if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
                else MoCoi.ApDung(Config, now);
            }
            BoPolicyNeuMoCoi(now);
            return true;
        }
    }

    private void BoPolicyNeuMoCoi(DateTimeOffset now)
    {
        if (!MoCoi.La(Config, now)) return;
        _policy = null;          // không áp Policy cuối nữa: không khoá giờ ngủ, không allowlist cũ
        _usedSeconds = 0;
        _lockStartedAt = null;
    }

    public void SetPolicy(Policy p, string raw)
    {
        lock (_gate)
        {
            _policy = p;
            _policyAt = DateTimeOffset.UtcNow;
            _usedSeconds = 0;
            _offline = false;
            _offlineSince = null;
            _lastSyncAt = DateTimeOffset.Now;
            TokenInvalid = false;
            _chayChoGhi = 0;   // liên lạc được ⇒ bộ đếm mất liên lạc về 0 (GhiThanhCong)
            BoDoanRong();
            if (Config != null)
            {
                var at = _policyAt;
                void Ap(AgentConfig c)
                {
                    c.LastPolicyJson = raw;
                    c.LastPolicyAt = at;
                    // Đồng bộ được ⇒ hết mồ côi + ghi mốc liên lạc (fail-open 14 ngày tính từ đây). Ba Mẹ đã chọn chế độ ⇒ giá trị máy chủ thắng, lưu lại cho lúc mất mạng.
                    MoCoi.GhiThanhCong(c, at);
                    if (p.CheDo != null) c.CheDo = p.CheDo;
                    // Giữ lại bí mật mã offline (máy chủ chỉ gửi khi có) để còn kiểm mã lúc mất mạng.
                    if (!string.IsNullOrEmpty(p.MaOfflineBiMat)) c.MaOfflineBiMat = p.MaOfflineBiMat;
                    // Có mạng lại: mã offline chỉ dành cho lúc mất mạng ⇒ kết thúc lượt mở, Policy online của Ba Mẹ quyết.
                    MoTamOffline.KetThucKhiCoMang(c, at);
                }
                AgentConfig? moi = null;
                try { moi = Store.Update(Ap); } catch { }
                if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
                else Ap(Config); // không lưu được: vẫn kết thúc lượt mở trong bộ nhớ (lần đồng bộ sau lưu lại)
            }
        }
    }

    /// <summary>Policy để THỰC THI (AppLocker + đóng app): Policy cuối, trừ app chơi khi đoạn chơi offline đã vượt ngưỡng (<see cref="PhienOffline.ApDung"/>).</summary>
    public Policy? CurrentPolicy { get { lock (_gate) return _policy == null ? null : PhienOffline.ApDung(_policy, _phienOffline); } }

    /// <summary>0.2.4 (BRD 6.7): mỗi vòng thực thi — đếm giây chơi khi mất mạng (đồng hồ đơn điệu), lưu khi cần.</summary>
    public void DemPhienOffline(DateTimeOffset now, double giayDonDieu, bool conDangNhap)
    {
        lock (_gate)
        {
            var tuoi = (DateTimeOffset.UtcNow - _fgAt).TotalSeconds < 20;
            var truocHet = _phienOffline?.HetHan == true;
            var (doan, luu) = PhienOffline.Dem(_phienOffline, _policy, _offline, conDangNhap, _fgId, tuoi, giayDonDieu, now);
            _phienOffline = doan;
            if (doan != null && doan.HetHan && !truocHet) PhienOfflineHetHan = true;
            if (luu) LuuPhienOffline();
        }
    }

    /// <summary>Vừa vượt ngưỡng chơi offline (worker đọc để ghi log một lần).</summary>
    public bool PhienOfflineHetHan { get; set; }

    /// <summary>Bản sao đoạn chơi offline cần gửi bù (null = không có gì).</summary>
    public PhienOffline? DoanCanBu() { lock (_gate) return _phienOffline is { CanGui: true } d ? d.Sao() : null; }

    /// <summary>Kết quả gửi bù: đã gửi / bỏ (4xx vĩnh viễn) ⇒ xoá đoạn đúng mã (đoạn mới hơn giữ nguyên); giữ lại ⇒ không đổi.</summary>
    public void GhiKetQuaBu(PhienOffline? daGui, KetQuaBu kq)
    {
        if (daGui == null || kq is not (KetQuaBu.DaGui or KetQuaBu.Bo)) return;
        lock (_gate)
        {
            if (_phienOffline?.Ma != daGui.Ma) return;
            _phienOffline = null;
            LuuPhienOffline();
        }
    }

    /// <summary>Có mạng (đồng bộ được) mà đoạn không có gì để gửi ⇒ bỏ đoạn rỗng.</summary>
    private void BoDoanRong()
    {
        if (_phienOffline is { CanGui: false }) { _phienOffline = null; LuuPhienOffline(); }
    }

    private void LuuPhienOffline()
    {
        var sao = _phienOffline?.Sao();
        AgentConfig? moi = null;
        try { moi = Store.Update(c => c.PhienOffline = sao); } catch { }
        if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
        else if (Config != null) Config.PhienOffline = sao;
    }

    public void SetOffline(bool v)
    {
        lock (_gate)
        {
            if (v && !_offline) _offlineSince = DateTimeOffset.Now;
            if (!v) _offlineSince = null;
            _offline = v;
        }
    }

    /// <summary>Kết quả thăm dò nhẹ máy chủ (mỗi ~15 giây, <see cref="ApiClient.PingAsync"/>): không tới được ⇒ báo offline ngay (khay đổi biểu tượng
    /// trong ≤30 giây thay vì chờ nhịp đồng bộ sau, có thể 5–10 phút); tới lại được mà đang offline ⇒ đồng bộ ngay để hết cờ.</summary>
    public void GhiThamDo(bool toiDuoc)
    {
        if (!toiDuoc) { SetOffline(true); return; }
        bool canDongBo;
        lock (_gate) canDongBo = _offline && !TokenInvalid;   // token bị từ chối thì đồng bộ lại cũng vô ích: để nhịp thường quyết
        if (canDongBo) RequestSyncSoon();
    }
    public bool IsOffline { get { lock (_gate) return _offline; } }

    public EffectivePolicy? Evaluate(DateTimeOffset now)
    {
        lock (_gate)
        {
            if (_policy == null) return null;
            return MoTamOffline.ApDung(PolicyEvaluator.Evaluate(_policy, now, _usedSeconds), MoTamDangMo(now));
        }
    }

    private bool MoTamDangMo(DateTimeOffset now) => Config?.MoTamOffline?.IsUnlocked(now) == true;

    /// <summary>
    /// Con gõ mã mở offline Ba Mẹ đọc. Kiểm ngay trên máy bằng bí mật đã lưu (Config.MaOfflineBiMat), không cần máy chủ.
    /// Mở được ⇒ lưu hạn mở + ghi sự kiện «mo_ma_offline» vào hàng đợi offline; sai đủ ngưỡng ⇒ sự kiện «sai_ma_offline».
    /// </summary>
    public (bool Ok, string Message) TryMaOffline(string? code, DateTimeOffset now)
    {
        lock (_gate)
        {
            if (Config is not { Paired: true }) return (false, "Máy chưa ghép với Ba Mẹ");
            const string chuaLuu = "Chưa lưu được, thử lại";
            var nho = Config.MoTamOffline?.WrongAt.ToList() ?? new();
            var kq = KetQuaMoOffline.Sai;
            var cau = "";
            bool daKiem = false;
            AgentConfig? moi = null;
            try
            {
                // Đọc – kiểm – ghi trên bản ở đĩa, trong khoá của ConfigStore ⇒ HeartbeatWorker không ghi đè được lượt mở / lượt sai.
                moi = Store.UpdateIf(c =>
                {
                    c.MoTamOffline ??= new MoTamOffline();
                    var st = c.MoTamOffline;
                    // lượt sai chỉ còn trong bộ nhớ (lần lưu trước lỗi) vẫn tính
                    foreach (var t in nho) if (!st.WrongAt.Contains(t)) st.WrongAt.Add(t);
                    st.WrongAt.Sort();
                    kq = st.TryUnlock(c.MaOfflineBiMat, code, now);
                    cau = st.Cau(kq, now);
                    daKiem = true;
                    var may = Environment.MachineName;
                    if (kq == KetQuaMoOffline.DaMo)
                        c.Queue.Add(new SuKien
                        {
                            Loai = "mo_ma_offline", Luc = now.ToUniversalTime(),
                            ChiTiet = new() { ["may"] = may, ["phut"] = ((int)Math.Round((st.UnlockUntil!.Value - now).TotalMinutes)).ToString(), ["den"] = st.UnlockUntil!.Value.ToUniversalTime().ToString("o") },
                        });
                    else if (kq == KetQuaMoOffline.Sai && st.WaitSeconds(now) > 0)
                        c.Queue.Add(new SuKien
                        {
                            Loai = "sai_ma_offline", Luc = now.ToUniversalTime(),
                            ChiTiet = new() { ["may"] = may, ["soLan"] = MoTamOffline.SaiToiDa.ToString(), ["phut"] = MoTamOffline.CuaSoSaiPhut.ToString() },
                        });
                    return kq is KetQuaMoOffline.DaMo or KetQuaMoOffline.Sai;
                });
            }
            catch { moi = null; }

            // Không đọc được cấu hình trên đĩa ⇒ chưa kiểm mã (không ai dò được khi giới hạn lượt sai không lưu được).
            if (!daKiem) return (false, chuaLuu);
            if (moi == null)
            {
                // Kiểm rồi nhưng lưu lỗi: mã đúng thì KHÔNG mở (để Con gõ lại, mã vẫn dùng được); mã sai thì vẫn nhớ lượt sai trong bộ nhớ.
                if (kq == KetQuaMoOffline.DaMo) return (false, chuaLuu);
                if (kq == KetQuaMoOffline.Sai) (Config.MoTamOffline ??= new MoTamOffline()).WrongAt.Add(now);
                return (false, cau);
            }
            Config = moi;
            _cfgStamp = Store.LastWriteUtc;
            return (kq is KetQuaMoOffline.DaMo or KetQuaMoOffline.DangMo, cau);
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
            var s = new TrayState
            {
                Paired = Config?.Paired == true, Offline = _offline, CheDo = _cheDo, MoCoi = MoCoi.La(Config, now),
                OfflineSince = _offlineSince, LastSyncAt = _lastSyncAt, TokenRejected = TokenInvalid,
            };
            if (_policy == null) return s;
            bool moTam = MoTamDangMo(now);
            var eff = MoTamOffline.ApDung(PolicyEvaluator.Evaluate(_policy, now, _usedSeconds), moTam);
            if (moTam) s.MoOfflineDen = Config!.MoTamOffline.UnlockUntil;
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
            // Giám sát (hoặc mồ côi): KHÔNG hiện màn khoá toàn màn hình — chỉ ghi lại ở dịch vụ.
            if (!AiiGrow.Core.CheDoHieuLuc.LaChan(_cheDo)) AiiGrow.Core.CheDoHieuLuc.ChoKhayGiamSat(s);
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
            var mode = _policy?.Mode ?? Modes.TuDo;
            var tray = (now - _fgAt).TotalSeconds < 20;
            var moCoi = MoCoi.La(Config, now);
            var phienKhac = QuyenPhien.LaTaiKhoanKhac(SessionHelper.ConsoleUser(), Config?.ChildUser, childActive);
            return new AgentStatus
            {
                Mode = mode,
                AppLockerApplied = AppLockerApplied,
                TrayAlive = tray,
                ChildSessionActive = childActive,
                Offline = _offline,
                CheDo = _cheDo,
                MoCoi = moCoi,
                PhienKhac = phienKhac,
                // 0.2.4: app tiền cảnh cho «đang dùng thật» của phiên chơi (máy chủ: lib/phien-windows.ts). Khay không tươi ⇒ null.
                ForegroundApp = childActive && tray ? (_fgId ?? "").Trim().ToLowerInvariant() : null,
                Quyen = QuyenBaoVe.Tinh(_cheDo, moCoi, mode, AppLockerApplied, tray, childActive, phienKhac),
            };
        }
    }
}
