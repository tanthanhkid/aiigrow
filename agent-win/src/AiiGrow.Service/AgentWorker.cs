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
    /// <summary>06/11 (L13): ai đang dùng máy — báo máy chủ trước / sau lượt dong-bo.</summary>
    private readonly NguoiDungMay _nd;

    public AgentWorker(ILogger<AgentWorker> log, AgentRuntime rt, AppLockerController locker, IProcessControl? procs = null)
    {
        _log = log; _rt = rt; _locker = locker; _procs = procs ?? new WindowsProcessControl();
        _nd = new NguoiDungMay(rt, log);
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("AiiGrow service bắt đầu");
        _rt.LoadConfig();
        // #433 A2: tổng phút đã đếm trong ngày giữ qua khởi động lại / cập nhật (thư mục dữ liệu chỉ SYSTEM/Administrators ghi được)
        UsageTotals.Shared.DungTep(Path.Combine(Paths.DataDir, "phut-da-dem.json"));
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
                    _rt.TaiKhoanMay = taiKhoan;
                    var childUser = TaiKhoanCon.ChonUser(cfg.ChildUser, string.IsNullOrEmpty(cfg.ChildUser) ? SessionHelper.ConsoleUser() : "", taiKhoan ?? new());
                    // cài một chạm mà chưa đọc được tài khoản máy ⇒ null: giữ nguyên AppLocker đang có, không gỡ nhầm
                    var childSids = taiKhoan == null && !AppLockerXml.IsValidSid(cfg.ChildSid) ? null : TaiKhoanCon.ChonSids(cfg.ChildSid, taiKhoan ?? new());
                    _rt.ChildSids = childSids;
                    var sess = string.IsNullOrEmpty(childUser) ? null : SessionHelper.Find(childUser);
                    _rt.ChildSessionId = sess?.SessionId ?? -1;
                    bool active = sess is { Active: true };

                    CountUsage(now, elapsed, active, sess?.SessionId ?? -1);
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
                        // ApiClient bọc handler chung (HttpDungChung, #562) ⇒ tái dùng kết nối TLS, không bắt tay mới mỗi 15 giây.
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
                    _rt.AppLockerKhaDung = _locker.KhaDung;   // Win Home: không AppLocker ⇒ BuildStatus không báo «thiếu»
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
                            var applied = _locker.Reconcile(eff.AppLockerWanted, childSids ?? Array.Empty<string>(), ChanAppThat.MoRongTen(p.AllowedApps, _rt.MucChinh), _rt.TrinhDuyetLoc(), GoiNgoaiWindowsApps.LuatChan(ChanAppThat.MoRongBiDanh(p.BlockedApps, _rt.BiDanhMuc), _rt.GoiNgoai), _rt.ThuMucDaCai);
                            _rt.AppLockerApplied = applied;
                        }
                        else if (eff.AppLockerWanted)
                        {
                            _log.LogDebug("GIÁM SÁT: sẽ áp AppLocker (chỉ cho {n} app) — chưa áp thật (CheDo=giam-sat)", p.AllowedApps.Count);
                        }

                        if (eff.AppLockerWanted && sess != null)
                        {
                            // trình duyệt được chạy cho tài khoản của phiên này (luật web đang áp trong hive của nó) — Giám sát thì không thả gì (chỉ ghi log «sẽ đóng»)
                            var sidPhien = AppLockerXml.IsValidSid(cfg.ChildSid) && string.Equals(childUser, cfg.ChildUser, StringComparison.OrdinalIgnoreCase)
                                ? cfg.ChildSid : taiKhoan?.FirstOrDefault(a => string.Equals(a.Name, childUser, StringComparison.OrdinalIgnoreCase))?.Sid;
                            var td = apThat && sidPhien != null && _rt.TrinhDuyetLoc().TryGetValue(sidPhien, out var t) ? t : null;
                            EnforceAllowList(sess.SessionId, p, apThat, td);
                        }
                        // 25/10: app Ba Mẹ đặt «Chặn» (định danh thật của máy) — MỌI mode kể cả tu_do; giám sát chỉ ghi log (ChanAppThat.cs)
                        // 06/11 (L13): Ba Mẹ đang dùng máy (mở bằng mã) ⇒ không đóng app nào
                        if (sess != null && p.BlockedApps.Count > 0 && !DangNhapView.BaMeDangDung(cfg.DangNhap, DateTimeOffset.Now)) EnforceChanApp(sess.SessionId, p, apThat);
                        BaoKhongDocDuoc();   // một lần mỗi nhịp, sau cả hai lượt liệt kê (Cho phép + Chặn)

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

    private void CountUsage(DateTimeOffset now, double elapsed, bool sessionActive, int phienCon)
    {
        var eff = _rt.Evaluate(now);
        if (!sessionActive || eff == null || eff.Locked || elapsed <= 0) return;
        // 06/11 (L13): chỉ tính giờ khi có bé đăng nhập — Ba Mẹ dùng máy (mã) không trừ giờ của con
        if (_rt.NguoiDung(now) != LoaiNguoiDung.Con) return;
        var (id, name, fresh) = _rt.GetForeground(now);
        // Tray báo không có cửa sổ tiền cảnh (màn hình đã khoá): không tính giờ.
        if (fresh && string.IsNullOrEmpty(id)) return;
        // #622: tiến trình nền của phiên (Searchapp, Start…) là tiền cảnh thoáng qua — không ghi thành app Con dùng
        if (fresh && ProcessGuard.TienTrinhNenKhongTinhGio.Contains(id!)) return;
        // Tray chết: vẫn tính giờ phiên con dưới tên "không rõ" (con không thể ngưng đồng hồ bằng cách tắt tray).
        // #418: cửa sổ của chính AiiGrow — kể cả khay cũ «AiiGrow.Tray.exe.cu-…» còn chạy sau cập nhật — gộp về khay (hệ thống): không thành
        // «app mới», không trừ sao. Chỉ khi tệp chạy nằm trong thư mục cài (game đổi tên giống AiiGrow ở chỗ khác vẫn bị đếm).
        if (fresh && AppAiiGrow.LaKhayCu(id) && phienCon >= 0)   // tên thường của AiiGrow máy chủ đã xếp hệ thống: khỏi quét tiến trình
        {
            bool cuaAiiGrow;
            try { cuaAiiGrow = AppAiiGrow.ChayTuThuMucCai(id!, new WindowsProcessControl().ListChildProcesses(phienCon), AppContext.BaseDirectory); }
            catch { cuaAiiGrow = false; }
            if (cuaAiiGrow) (id, name) = (AppAiiGrow.Khay, AppAiiGrow.Ten);
        }
        // #696: khay không quy được cửa sổ khung UWP về app thật ⇒ app «Tính phút» đang chạy trong phiên Con (nếu có) nhận phút — không để
        // game UWP chạy không trừ sao chỉ vì nhận diện cửa sổ hỏng
        if (fresh && string.Equals(id, UwpTienCanh.Host, StringComparison.OrdinalIgnoreCase) && phienCon >= 0)
        {
            var tp = _rt.AppTinhGioBe();
            if (tp.Count > 0)
            {
                try
                {
                    if (UwpTienCanh.QuyHostVeAppTinhPhut(tp, _procs.ListChildProcesses(phienCon).Select(x => x.Path).ToList(), _rt.MucChinh, _rt.GoiNgoai) is { } app)
                        (id, name) = (app, _rt.TenAppMay is { } tm && tm.TryGetValue(app, out var tenApp) ? tenApp : app);
                }
                catch { }
            }
        }
        var be = _rt.DangNhap() is { Loai: LoaiNguoiDung.Con, ConId: { Length: > 0 } c } ? c : null;   // 15/11 (#267): phút ghi theo bé
        _rt.CountUsage(now, fresh ? id! : UsageTracker.KhongRo, fresh ? (name ?? id!) : "Không rõ", elapsed, be);
    }

    private async Task<DateTimeOffset> SyncAsync(AgentConfig cfg, bool active, DateTimeOffset now, CancellationToken ct)
    {
        // #433 A1: phút rút ra vào thẳng TỔNG đã lưu (UsageTotals) — gửi lỗi KHÔNG trả lại bộ đếm (trả lại thì lần thử sau cộng đôi vào tổng).
        UsageTotals.Shared.ChoMay(cfg.DeviceId);
        UsageTotals.Shared.Add(_rt.Usage.Drain());
        var usage = UsageTotals.Shared.CanGui(cfg.DeviceId);
        try
        {
            using var api = new ApiClient(cfg.Server, cfg.Token);
            // 06/11 (L13): bé vào máy lúc mất mạng ⇒ báo máy chủ TRƯỚC dong-bo (Policy, quỹ, sao trả về là của bé này)
            await _nd.TruocDongBoAsync(api, ct);
            var guiLuc = DateTimeOffset.Now;
            // 0.2.4: có phút chơi khi mất mạng chưa gửi ⇒ gửi phien/bu TRƯỚC dong-bo (máy chủ đo thời gian thật từ nhịp cuối).
            // #337: đoạn chơi offline của bé khác (đổi bé lúc mất mạng) — gửi bù từng đoạn, kèm đúng bé
            foreach (var cho in _rt.DoanChoBu())
            {
                var (kqCho, loiCho) = await GuiBu.GuiAsync(api, cho, ct);
                if (kqCho == KetQuaBu.DaGui) _log.LogInformation("Đã gửi bù {phut} phút chơi khi mất mạng của bé {con} (phiên {id})", cho.PhutChoi, cho.Con, cho.PhienId);
                else if (kqCho == KetQuaBu.Bo) _log.LogWarning("Bỏ gửi bù phút offline (phiên {id}): máy chủ từ chối {code} {m}", cho.PhienId, loiCho?.StatusCode, loiCho?.Message);
                _rt.GhiKetQuaBu(cho, kqCho);
            }
            var doan = _rt.DoanCanBu();
            var status = _rt.BuildStatus(active);
            var boiMa = _rt.BoiMaTheoBe();   // 15/11: phút «Tính phút» lúc mở bằng mã THEO BÉ — máy chủ không trừ sao đúng bé (boiMaCon)
            var (policy, raw) = await GuiBu.DongBoAsync(api, doan, (kq, loi) =>
            {
                if (kq == KetQuaBu.DaGui) _log.LogInformation("Đã gửi bù {phut} phút chơi khi mất mạng (phiên {id})", doan!.PhutChoi, doan.PhienId);
                else if (kq == KetQuaBu.Bo) _log.LogWarning("Bỏ gửi bù phút chơi offline (phiên {id}): máy chủ từ chối {code} {m}", doan!.PhienId, loi?.StatusCode, loi?.Message);
                else if (kq == KetQuaBu.GiuLai) _log.LogDebug("Gửi bù phút chơi offline lỗi, giữ lại: {m}", loi?.Message);
                _rt.GhiKetQuaBu(doan, kq);
            }, status, usage, ct, boiMa);
            UsageTotals.Shared.DaGui(usage);
            _rt.SetPolicy(policy, raw);
            _rt.DaGuiBoiMa(boiMa);
            _rt.DaGuiGiayChoi(status);
            // 06/11 (L13): «ai đang dùng máy» của máy chủ (bé hết phiên 12 giờ ⇒ về màn chọn tên), đăng xuất còn treo, danh sách bé cho lúc mất mạng
            try { await _nd.SauDongBoAsync(api, raw, guiLuc, ct); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Cập nhật ai đang dùng máy lỗi: {m}", e.Message); }
            await GuiXinChoMang(api, ct);
            GuiBaiNen(cfg, ct);
            return DateTimeOffset.Now.AddSeconds(policy.NextCheckSec);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
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

    /// <summary>05/11 (L11): có mạng lại ⇒ gửi các lời xin Con bấm lúc mất mạng (xin vay sao, xin thêm app / web). Lỗi mạng ⇒ giữ lần sau;
    /// 408 / 429 ⇒ giữ, gửi tiếp lượt sau; máy chủ từ chối (4xx) ⇒ bỏ và báo Con trên khay (#684). Không làm hỏng lượt đồng bộ vừa xong.</summary>
    private async Task GuiXinChoMang(ApiClient api, CancellationToken ct)
    {
        var cfg = _rt.Config;
        if (cfg == null || cfg.XinCho.Items.Count == 0) return;
        try
        {
            var hang = new HangXinCho { Items = cfg.XinCho.Items.ToList() };
            var (xong, loiThem) = await hang.GuiAsync(async x =>
            {
                try
                {
                    if (x.Loai == LoaiXin.XinDuyet) await api.XinDuyetAsync(x.Muc ?? "", x.Ten, x.LyDo, x.Kieu, ct);
                    else if (x.Loai == LoaiXin.VaySao) await api.XinVayAsync(x.Phut, x.LyDo, x.Muc, ct);   // Muc = quà muốn đổi (vay để đổi quà) hoặc trống
                    else { _log.LogInformation("Bỏ lời xin chờ mạng loại cũ {loai} (đã bỏ từ 15/11)", x.Loai); return KetQuaGuiXin.Bo; }
                    _log.LogInformation("Có mạng: đã gửi lời xin {loai} {muc} lưu lúc {luc}", x.Loai, x.Muc, x.Luc);
                    return KetQuaGuiXin.DaGui;
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    var kq = HangXinCho.PhanLoai(e);
                    if (kq == KetQuaGuiXin.Bo) _log.LogWarning("Bỏ lời xin chờ mạng {loai} {muc}: máy chủ từ chối ({m})", x.Loai, x.Muc, e.Message);
                    return kq;
                }
            }, DateTimeOffset.Now);
            if (xong.Count == 0 && loiThem == null) return;
            var bo = hang.BiBo.ToList();
            foreach (var x in bo) _log.LogWarning("Lời xin chờ mạng {loai} {muc} bị bỏ chưa tới Ba Mẹ — báo Con trên khay", x.Loai, x.Muc);
            var moi = _rt.Store.Update(c =>
            {
                c.XinCho.Items.RemoveAll(i => xong.Contains(i.Ma));
                foreach (var i in c.XinCho.Items) if (i.Ma == loiThem) i.LanLoi++;
                if (bo.Count > 0) c.XinBo.Them(bo, DateTimeOffset.Now);   // #684: Con được báo, không im lặng
            });
            if (moi != null) _rt.NapLaiConfig(moi);
        }
        catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Gửi lời xin chờ mạng lỗi: {m}", e.Message); }
    }

    private int _dangGuiBai;

    /// <summary>Gửi bài chờ mạng ở tác vụ RIÊNG (bài có ảnh / ghi âm vài MB) — vòng thực thi (khoá, đóng app) không phải chờ tải lên.</summary>
    private void GuiBaiNen(AgentConfig cfg, CancellationToken ct)
    {
        if (_rt.SoBaiCho == 0 || Interlocked.Exchange(ref _dangGuiBai, 1) == 1) return;
        _ = Task.Run(async () =>
        {
            try { using var api = new ApiClient(cfg.Server, cfg.Token); await GuiBaiChoMang(api, ct); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Gửi bài chờ mạng lỗi: {m}", e.Message); }
            finally { Interlocked.Exchange(ref _dangGuiBai, 0); }
        }, ct);
    }

    /// <summary>05/11 (L11): có mạng lại ⇒ gửi bài Con nộp lúc mất mạng (BaiChoMang: 12 giờ / 3 lần lỗi / 4xx bỏ — cùng luật hàng lời xin).</summary>
    private async Task GuiBaiChoMang(ApiClient api, CancellationToken ct)
    {
        try
        {
            if (_rt.SoBaiCho < 0) _rt.SoBaiCho = _rt.BaiCho.Dem();
            if (_rt.SoBaiCho == 0) return;
            var n = await _rt.BaiCho.GuiAsync(async b =>
            {
                try
                {
                    await api.RawAsync(HttpMethod.Post, "api/device/" + b.Path, b.Body, ct);
                    return KetQuaGuiXin.DaGui;
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    var kq = HangXinCho.PhanLoai(e);
                    if (kq == KetQuaGuiXin.Bo) _log.LogWarning("Bỏ bài nộp chờ mạng {p}: máy chủ từ chối ({m})", b.Path, e.Message);
                    return kq;
                }
            }, DateTimeOffset.Now);
            if (n > 0) _log.LogInformation("Có mạng: đã gửi {n} bài nộp lúc mất mạng", n);
            _rt.SoBaiCho = _rt.BaiCho.Dem();
        }
        catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Gửi bài chờ mạng lỗi: {m}", e.Message); }
    }

    /// <summary>Dự phòng khi AppLocker chưa áp hoặc app đã chạy sẵn: đóng tiến trình ngoài danh sách trong phiên con.
    /// Quyết định "đóng cái nào" nằm ở lớp thuần <see cref="ProcessEnforcer"/>; worker chỉ cung cấp cổng hệ thống.</summary>
    private string _giamSatDaBao = "";

    private readonly KiemKyTrinhDuyet _kiemKy = new();

    private void EnforceAllowList(int sessionId, Policy p, bool apThat, IReadOnlyList<string>? trinhDuyet)
    {
        // Giám sát (apThat=false): dryRun — liệt kê app SẼ bị đóng nhưng KHÔNG đóng thật.
        var pf = TrinhDuyetLoc.ThuMucProgramFiles();
        // #690: app gộp (bản Store + bản cài) — Ba Mẹ cho phép một muc thì mọi lối mở của cùng app đều được
        var choPhep = ChanAppThat.MoRongTen(p.AllowedApps, _rt.MucChinh);
        // #695: gói Store cài ngoài WindowsApps (ổ D, XboxGames) — được phép theo thư mục cài của gói
        var goi = _rt.GoiNgoai;
        var tapChoPhep = goi is { Count: > 0 } ? new HashSet<string>(choPhep, StringComparer.OrdinalIgnoreCase) : null;
        Func<string, bool>? choThem = trinhDuyet is { Count: > 0 } || tapChoPhep != null
            ? path => (trinhDuyet is { Count: > 0 } && TrinhDuyetLoc.ChoChay(path, trinhDuyet, pf, _kiemKy.Kiem))
                || (tapChoPhep != null && GoiNgoaiWindowsApps.ChoChay(path, tapChoPhep, goi))
            : null;
        var closed = ProcessEnforcer.Enforce(_procs, sessionId, choPhep, dryRun: !apThat, choThem: choThem,
            khongDong: exe => BaoKhongDong(exe, "ngoài danh sách"), tenDaCai: _rt.TenDaCai ?? ChuaQuet, thuMucDaCai: _rt.ThuMucDaCai);
        // Giám sát: cùng một tập app chạy mãi ⇒ chỉ ghi log khi tập đổi (trước đây ~5 giây một lượt, hàng nghìn dòng may_log mỗi giờ).
        var tap = string.Join(",", closed.OrderBy(x => x, StringComparer.OrdinalIgnoreCase));
        var ghiGiamSat = tap != _giamSatDaBao;
        if (!apThat) _giamSatDaBao = tap;
        foreach (var exe in closed)
        {
            if (apThat) _log.LogInformation("Đóng app ngoài danh sách: {exe}", exe);
            else if (ghiGiamSat) _log.LogInformation("GIÁM SÁT: sẽ đóng app ngoài danh sách: {exe} — chưa đóng thật (CheDo=giam-sat)", exe);
            var bare = exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? exe[..^4] : exe;
            // giám sát: app không bị đóng ⇒ không hiện màn «app bị chặn». App Ba Mẹ đã xếp (Giải trí — playChoices) bị đóng vì ngoài phiên / giờ học:
            // KHÔNG phải app lạ ⇒ khay không tự gửi lời xin duyệt (05/11 L4 chỉ áp cho app lạ), chỉ có nút xin.
            if (apThat) _rt.RecordBlocked(exe, bare, boiBaMe: p.PlayChoices.Contains(exe, StringComparer.OrdinalIgnoreCase));
        }
    }

    private string _chanDaBao = "";
    /// <summary>#693: chưa quét app lần nào ⇒ chưa biết app nào cài ở đâu: không chặn theo chỗ thả tệp (app Ba Mẹ duyệt ở Downloads không bị đóng oan).</summary>
    private static readonly HashSet<string> ChuaQuet = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>#698: mỗi exe ghi nhật ký tối đa một lần / 30 phút (vòng 5 giây không làm ngập may_log).</summary>
    private readonly Dictionary<string, long> _daBaoLoi = new(StringComparer.OrdinalIgnoreCase);
    private HashSet<string> _khongDocTruoc = new(StringComparer.OrdinalIgnoreCase);
    private static readonly long BaoLoiCachMs = (long)TimeSpan.FromMinutes(30).TotalMilliseconds;

    private bool NenBao(string khoa)
    {
        var bay = Environment.TickCount64;
        if (_daBaoLoi.Count > 200)   // dịch vụ chạy hàng tháng: bỏ mục đã quá hạn
            foreach (var k in _daBaoLoi.Where(x => bay - x.Value >= BaoLoiCachMs).Select(x => x.Key).ToList()) _daBaoLoi.Remove(k);
        if (_daBaoLoi.TryGetValue(khoa, out var luc) && bay - luc < BaoLoiCachMs) return false;
        _daBaoLoi[khoa] = bay;
        return true;
    }

    /// <summary>#698: Windows không cho đóng app phải đóng ⇒ luật không có hiệu lực — ghi rõ để tra khi Ba Mẹ báo «chặn không được».</summary>
    private void BaoKhongDong(string exe, string lyDo)
    {
        var loi = (_procs as WindowsProcessControl)?.LoiDongCuoi;
        if (loi == null && _procs is WindowsProcessControl) return;   // tiến trình tự thoát trước khi đóng — không phải lỗi
        if (!NenBao("dong:" + exe)) return;
        _log.LogWarning("Không đóng được app {exe} ({lyDo}) — Windows từ chối: {loi}", exe, lyDo, loi ?? "không rõ");
    }

    /// <summary>#698: tiến trình trong phiên Con không đọc được đường dẫn ⇒ luật Chặn / Cho phép không xét được nó — ghi tên để tra.</summary>
    private void BaoKhongDocDuoc()
    {
        if (_procs is not WindowsProcessControl w) return;
        var nay = new HashSet<string>(w.LayKhongDocDuoc(), StringComparer.OrdinalIgnoreCase);
        // chỉ tên gặp ở hai NHỊP liền nhau (tiến trình vừa mở / vừa thoát giữa lúc liệt kê không phải lỗi đọc)
        foreach (var ten in nay)
            if (_khongDocTruoc.Contains(ten) && NenBao("doc:" + ten)) _log.LogWarning("Không đọc được đường dẫn tiến trình {ten} trong phiên Con — luật Chặn / Cho phép không xét được", ten);
        if (nay.Count > 0 || _khongDocTruoc.Count > 0) _khongDocTruoc = nay;
    }

    private void EnforceChanApp(int sessionId, Policy p, bool apThat)
    {
        var ds = ChanAppThat.Enforce(_procs, sessionId, GoiNgoaiWindowsApps.LuatChan(ChanAppThat.MoRongBiDanh(p.BlockedApps, _rt.BiDanhMuc), _rt.GoiNgoai), dryRun: !apThat, bam: BamTepCache.Chung.BamNen,
            khongDong: (exe, muc) => BaoKhongDong(exe, "Ba Mẹ đã Chặn, luật " + muc));
        var tap = string.Join(",", ds.Select(x => x.Exe).Distinct().OrderBy(x => x, StringComparer.Ordinal));
        var ghi = tap != _chanDaBao;
        _chanDaBao = tap;
        foreach (var (exe, muc) in ds)
        {
            if (apThat)
            {
                _log.LogInformation("Đóng app Ba Mẹ đã Chặn: {exe} (luật {muc})", exe, muc);
                _rt.RecordBlocked(exe, exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? exe[..^4] : exe, boiBaMe: true);
            }
            else if (ghi) _log.LogInformation("GIÁM SÁT: sẽ chặn app Ba Mẹ đã Chặn: {exe} (luật {muc}) — chưa đóng thật (CheDo=giam-sat)", exe, muc);
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
