using AiiGrow.Core;

namespace AiiGrow.Service;

public sealed class AgentWorker : BackgroundService
{
    private readonly ILogger<AgentWorker> _log;
    private readonly AgentRuntime _rt;
    private readonly AppLockerController _locker;
    private readonly IProcessControl _procs;
    // Cài một chạm (cấu hình không có tài khoản Con): danh sách tài khoản máy, đọc lại mỗi 10 phút
    private List<LocalAccount>? _taiKhoan;          // null = chưa đọc được lần nào ⇒ KHÔNG đổi AppLocker (đọc lỗi ≠ máy không có Con)
    private long _docTaiKhoanLuc = long.MinValue, _docLaiSauMs;

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
        var nextProbe = DateTimeOffset.MinValue;
        var tickTruoc = Environment.TickCount64;

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var now = DateTimeOffset.Now;
                var elapsed = Math.Min((now - last).TotalSeconds, 15);
                last = now;
                // Đồng hồ ĐƠN ĐIỆU cho phút chơi khi mất mạng (Con chỉnh giờ máy không ăn gian), trần 15 giây/vòng như `elapsed`.
                var tick = Environment.TickCount64;
                var giayDonDieu = Math.Clamp((tick - tickTruoc) / 1000.0, 0, 15);
                tickTruoc = tick;
                _rt.ReloadIfChanged();
                // Đồng hồ ĐƠN ĐIỆU cho fail-open 14 ngày (không đổi khi Con chỉnh giờ máy).
                _rt.GhiNhipChay(Environment.TickCount64);
                var cfg = _rt.Config;
                // Đang gỡ từ xa (HeartbeatWorker): đứng yên, không áp lại luật nào trong lúc dọn.
                if (_rt.DangGo) { await _rt.WaitAsync(TimeSpan.FromSeconds(5), ct); continue; }
                if (cfg is { Paired: true })
                {
                    var taiKhoan = TaiKhoanMay(cfg);
                    var childUser = TaiKhoanCon.ChonUser(cfg.ChildUser, string.IsNullOrEmpty(cfg.ChildUser) ? SessionHelper.ConsoleUser() : "", taiKhoan ?? new());
                    // cài một chạm mà chưa đọc được tài khoản máy ⇒ null: giữ nguyên AppLocker đang có, không gỡ nhầm
                    var childSids = taiKhoan == null && !AppLockerXml.IsValidSid(cfg.ChildSid) ? null : TaiKhoanCon.ChonSids(cfg.ChildSid, taiKhoan ?? new());
                    var sess = string.IsNullOrEmpty(childUser) ? null : SessionHelper.Find(childUser);
                    _rt.ChildSessionId = sess?.SessionId ?? -1;
                    bool active = sess is { Active: true };

                    CountUsage(now, elapsed, active);
                    // 0.2.4: «đang chơi thật» — WTS báo phiên Con khoá? + tiến trình thật trong phiên Con (chỉ đọc khi Policy có phiên chơi).
                    bool? manHinhKhoa = sess != null ? SessionHelper.IsLocked(sess.SessionId) : null;
                    IReadOnlyCollection<string>? tienTrinh = null;
                    if (sess != null && _rt.CurrentPolicy?.PlaySessionId != null)
                        try { tienTrinh = WindowsProcessControl.TenTrongPhien(sess.SessionId); } catch { tienTrinh = null; }   // ProcessName, không MainModule
                    _rt.DemChoi(now, giayDonDieu, active, manHinhKhoa, tienTrinh);
                    if (_rt.PhienOfflineHetHan)
                    {
                        _rt.PhienOfflineHetHan = false;
                        _log.LogInformation("Mất mạng: đã chơi hết số phút được phép (playOfflineMinutes) — bỏ app chơi khỏi danh sách tới khi có mạng lại");
                    }

                    _rt.TinhCheDo(now);   // để status gửi lên trong lần đồng bộ này là chế độ THẬT đang áp
                    bool force = _rt.TakeForceSync();
                    if (force || now >= nextSync) { nextSync = await SyncAsync(cfg, active, now, ct); nextProbe = DateTimeOffset.Now.AddSeconds(15); }
                    else if (now >= nextProbe)
                    {
                        // Thăm dò nhẹ máy chủ để khay báo «mất kết nối» trong ≤30 giây (nhịp đồng bộ có thể thưa tới vài phút).
                        nextProbe = now.AddSeconds(15);
                        try { using var api = new ApiClient(cfg.Server, cfg.Token); _rt.GhiThamDo(await api.PingAsync(ct)); }
                        catch (Exception e) when (e is not OperationCanceledException) { _log.LogDebug(e, "Thăm dò máy chủ lỗi"); }
                    }

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
                    // GỠ luật không cần biết tài khoản (gỡ theo tiền tố «AiiGrow: ») ⇒ chưa đọc được tài khoản vẫn gỡ được khi về Giám sát
                    if (!apThat || p == null || eff == null)
                    {
                        // Không chặn thật ⇒ luật AppLocker của AiiGrow phải KHÔNG còn (đổi sang giám sát là gỡ ngay, không chờ khởi động lại).
                        _rt.AppLockerApplied = _locker.Reconcile(false, Array.Empty<string>(), Array.Empty<string>());
                    }
                    if (p != null && eff != null)
                    {
                        // chưa đọc được tài khoản: không ÁP được, nhưng «Mở»/mã mở tạm (AppLockerWanted=false) vẫn phải GỠ được
                        if (apThat && (childSids != null || !eff.AppLockerWanted))
                        {
                            var applied = _locker.Reconcile(eff.AppLockerWanted, childSids ?? Array.Empty<string>(), p.AllowedApps);
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
            // 0.2.4: có phút chơi khi mất mạng chưa gửi ⇒ gửi phien/bu TRƯỚC dong-bo (máy chủ đo thời gian thật từ nhịp cuối).
            var doan = _rt.DoanCanBu();
            var status = _rt.BuildStatus(active);
            var (policy, raw) = await GuiBu.DongBoAsync(api, doan, (kq, loi) =>
            {
                if (kq == KetQuaBu.DaGui) _log.LogInformation("Đã gửi bù {phut} phút chơi khi mất mạng (phiên {id})", doan!.PhutChoi, doan.PhienId);
                else if (kq == KetQuaBu.Bo) _log.LogWarning("Bỏ gửi bù phút chơi offline (phiên {id}): máy chủ từ chối {code} {m}", doan!.PhienId, loi?.StatusCode, loi?.Message);
                else if (kq == KetQuaBu.GiuLai) _log.LogDebug("Gửi bù phút chơi offline lỗi, giữ lại: {m}", loi?.Message);
                _rt.GhiKetQuaBu(doan, kq);
            }, status, usage, ct);
            _rt.SetPolicy(policy, raw);
            _rt.DaGuiGiayChoi(status);
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
    private string _giamSatDaBao = "";

    private void EnforceAllowList(int sessionId, Policy p, bool apThat)
    {
        // Giám sát (apThat=false): dryRun — liệt kê app SẼ bị đóng nhưng KHÔNG đóng thật.
        var closed = ProcessEnforcer.Enforce(_procs, sessionId, p.AllowedApps, dryRun: !apThat);
        // Giám sát: cùng một tập app chạy mãi ⇒ chỉ ghi log khi tập đổi (trước đây ~5 giây một lượt, hàng nghìn dòng may_log mỗi giờ).
        var tap = string.Join(",", closed.OrderBy(x => x, StringComparer.OrdinalIgnoreCase));
        var ghiGiamSat = tap != _giamSatDaBao;
        if (!apThat) _giamSatDaBao = tap;
        foreach (var exe in closed)
        {
            if (apThat) _log.LogInformation("Đóng app ngoài danh sách: {exe}", exe);
            else if (ghiGiamSat) _log.LogInformation("GIÁM SÁT: sẽ đóng app ngoài danh sách: {exe} — chưa đóng thật (CheDo=giam-sat)", exe);
            var bare = exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? exe[..^4] : exe;
            if (apThat) _rt.RecordBlocked(exe, bare);   // giám sát: app không bị đóng ⇒ không hiện màn «app bị chặn»
        }
    }

    /// <summary>Chỉ đọc khi cấu hình chưa gắn tài khoản Con (cài một chạm). Đọc lại mỗi 2 phút (tài khoản vừa nâng quản trị thôi bị chặn sớm);
    /// lỗi ⇒ giữ danh sách cũ (null nếu chưa đọc được lần nào), thử lại sau 30 giây.</summary>
    private List<LocalAccount>? TaiKhoanMay(AgentConfig cfg)
    {
        if (AppLockerXml.IsValidSid(cfg.ChildSid) && !string.IsNullOrEmpty(cfg.ChildUser)) return _taiKhoan ?? new();
        var bay = Environment.TickCount64;
        if (_docTaiKhoanLuc != long.MinValue && bay - _docTaiKhoanLuc < _docLaiSauMs) return _taiKhoan;
        _docTaiKhoanLuc = bay;
        try { _taiKhoan = TaiKhoanCon.DocMay(); _docLaiSauMs = 2 * 60 * 1000; }
        catch (Exception e) { _docLaiSauMs = 30 * 1000; _log.LogWarning("Đọc tài khoản Windows lỗi (giữ nguyên AppLocker, thử lại sau 30 giây): {Loi}", e.Message); }
        return _taiKhoan;
    }
}
