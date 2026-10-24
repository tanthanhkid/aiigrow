using AiiGrow.Core;

namespace AiiGrow.Tray;

internal sealed class TrayContext : ApplicationContext
{
    private readonly NotifyIcon _ni;
    private readonly ToolStripMenuItem _statusItem, _retryItem;
    private readonly System.Windows.Forms.Timer _timer = new() { Interval = 3000 };
    private AppForm? _app;
    private LockForm? _lock;
    private BlockedForm? _blocked;
    private TrayState _state = new();
    private DateTimeOffset _at = DateTimeOffset.Now;
    private int _seenBlocked = -1;
    private bool _polling;
    private bool _warned5, _warned1, _warnedMo5, _warnedMoCoi;
    private bool _daChao;          // biểu tượng + lời chào chỉ hiện sau khi dịch vụ xác nhận đây là phiên của Con (BUG-007)
    private int _webRev = -1;      // -1 = chưa thấy lần nào (lần đầu chỉ ghi nhớ, không báo)

    // Trạng thái kết nối: biểu tượng khay + tooltip + dòng trạng thái ở menu và thanh bên app. Dịch vụ không trả lời 2 lần liền (≥6 giây) mới báo «không chạy».
    private KetNoiInfo _kn = KetNoiView.Chon(true, new TrayState { Paired = true });
    private int _pipeFail;
    private bool? _iconKetNoi;
    private bool _retrying;

    // Khay học viên: nhiệm vụ / phần quà / thông báo hai chiều với Ba Mẹ (AppForm). Hỏi tin mới mỗi 30 giây.
    private readonly System.Windows.Forms.Timer _hvTimer = new() { Interval = 30_000 };
    private readonly TinTracker _tin = new();
    private int _tinMoi;
    private bool _hvPolling;
    // Bóng báo vừa hiện dẫn tới mục nào của app to (bấm vào bóng báo trong 20 giây ⇒ mở đúng mục).
    private MucApp _toastMuc = MucApp.HomNay;
    private DateTimeOffset _toastAt = DateTimeOffset.MinValue;
    private readonly BatNhiemVu _bat = new();
    private bool AppDangHien => _app is { IsDisposed: false, Visible: true } a && a.WindowState != FormWindowState.Minimized;

    public TrayContext()
    {
        var menu = new ContextMenuStrip();
        _statusItem = new ToolStripMenuItem(_kn.Dong) { Enabled = false };
        _retryItem = new ToolStripMenuItem("Thử kết nối lại", null, async (_, _) => await RetryAsync());
        menu.Items.Add(_statusItem);
        menu.Items.Add(_retryItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Mở AiiGrow", null, (_, _) => OpenApp(MucApp.HomNay)));
        menu.Items.Add("Xin thêm thời gian", null, (_, _) => OpenRequest());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Máy này do bố mẹ quản lý bằng AiiGrow") { Enabled = false });

        _ni = new NotifyIcon
        {
            Icon = UI.TrayIcon(true),
            Text = "AiiGrow",
            Visible = false,   // hiện khi dịch vụ xác nhận phiên của Con (xem Chao) — phiên Ba Mẹ không thấy biểu tượng nháy lên rồi tắt
            ContextMenuStrip = menu,
        };
        _iconKetNoi = true;
        // Nhấn (đúp) biểu tượng ⇒ mở app to. Cả nhấn đơn lẫn đúp đều gọi OpenApp, cửa sổ chỉ có một bản nên lần hai chỉ đưa lên trước.
        _ni.MouseClick += (_, e) => { if (e.Button == MouseButtons.Left) OpenApp(MucApp.HomNay); };
        // Bấm vào bóng báo «nhiệm vụ mới / Ba Mẹ phản hồi / Còn 5 phút…» ⇒ mở app to đúng mục.
        _ni.BalloonTipClicked += (_, _) => { if ((DateTimeOffset.Now - _toastAt).TotalSeconds < 20) OpenApp(_toastMuc, true); };


        _timer.Tick += async (_, _) => await TickAsync();
        _timer.Start();
        _ = TickAsync();

        _hvTimer.Tick += async (_, _) => await HocVienTickAsync();
        _hvTimer.Start();
        _ = HocVienTickAsync();
    }

    /// <summary>Lần đầu biết đây là phiên của Con (hoặc dịch vụ không chạy ⇒ Con cần thấy lỗi): hiện biểu tượng + lời chào.</summary>
    private void Chao(bool coLoiChao)
    {
        if (_daChao) return;
        _daChao = true;
        _ni.Visible = true;
        if (!coLoiChao) return;
        Toast(5000, "AiiGrow đang bật", "Bố mẹ đặt giờ dùng máy. Nhấn đúp vào biểu tượng AiiGrow để xem giờ, nhận nhiệm vụ và xem phần quà.", ToolTipIcon.Info, MucApp.HomNay);
        BaoCapNhat.NeuVuaCapNhat(_ni);   // #33: «đã cập nhật lên bản X» (một lần mỗi tài khoản)
    }

    private bool _anPhienKhac;

    /// <summary>Phiên KHÔNG phải của Con (Ba Mẹ / tài khoản quản trị): khay ẩn, ngừng hỏi máy chủ, chỉ hỏi dịch vụ thưa (30 giây) — KHÔNG thoát hẳn:
    /// quyết định dựa trên danh sách tài khoản dịch vụ đọc 2 phút/lần, có thể cũ (cài một chạm: Con vừa bị gỡ quyền quản trị) ⇒ đúng lại thì hiện lại (BUG-007, review #75).</summary>
    private void AnVoiPhienKhac()
    {
        _ni.Visible = false;
        if (_anPhienKhac) return;
        _anPhienKhac = true;
        _hvTimer.Stop();
        _timer.Interval = 30_000;
        _ni.Visible = false;
        if (_app is { IsDisposed: false }) _app.Hide();
    }

    private void HienLaiNeuDaAn()
    {
        if (!_anPhienKhac) return;
        _anPhienKhac = false;
        _timer.Interval = 3000;
        _hvTimer.Start();
        if (_daChao) _ni.Visible = true;
    }

    /// <summary>Bóng báo trên khay; nhớ mục để bấm vào thì mở đúng chỗ.</summary>
    private void Toast(int ms, string title, string text, ToolTipIcon icon, MucApp muc)
    {
        _toastMuc = muc;
        _toastAt = DateTimeOffset.Now;
        _ni.ShowBalloonTip(ms, title, text, icon);
    }

    /// <summary>Mở app to (một bản duy nhất; đã mở thì đưa lên trước). <paramref name="tuToast"/> = bấm từ bóng báo ⇒ coi như đã xem tin mới.
    /// <paramref name="tuBat"/> = khay tự bật (nhiệm vụ mới), không do Con bấm ⇒ ép cửa sổ nổi lên trên cùng.</summary>
    private void OpenApp(MucApp muc, bool tuToast = false, bool tuBat = false)
    {
        if (_state.Locked) { Toast(4000, "Máy đang khoá", "Khi máy mở lại, con xem nhiệm vụ và phần quà nhé.", ToolTipIcon.Info, MucApp.HomNay); return; }
        if (_app == null || _app.IsDisposed)
        {
            _app = new AppForm();
            _app.TinDaXem += () => _tinMoi = 0;
            _app.RetryClicked += () => _ = RetryAsync();
        }
        if (tuToast) _tinMoi = 0;
        PushApp();
        _app.ShowFront(muc, tuBat);
    }

    private void PushApp()
    {
        if (_app == null || _app.IsDisposed) return;
        _app.TinMoi = _tinMoi;
        _app.Apply(_state, _at, _kn);
    }

    private void SetKetNoi(KetNoiInfo info, bool stateFresh)
    {
        _kn = info;
        if (_iconKetNoi != info.DungIconKetNoi)
        {
            _iconKetNoi = info.DungIconKetNoi;
            _ni.Icon = UI.TrayIcon(info.DungIconKetNoi);
        }
        _ni.Text = KetNoiView.Tooltip(info, stateFresh ? _state : null, _at, DateTimeOffset.Now);
        _statusItem.Text = info.Dong;
        PushApp();
    }

    /// <summary>«Thử kết nối lại»: bảo dịch vụ đồng bộ ngay, rồi hỏi lại trạng thái hai lần và báo kết quả.</summary>
    private async Task RetryAsync()
    {
        if (_retrying) return;
        _retrying = true;
        _retryItem.Enabled = false;
        _retryItem.Text = "Đang thử…";
        try
        {
            await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });
            await Task.Delay(2500);
            _pipeFail = 2;   // lần này kết quả thật quyết định ngay, không chờ thêm một lượt
            await TickAsync();
            if (!_kn.DungIconKetNoi) { await Task.Delay(4000); await TickAsync(); }
            Toast(6000, _kn.DungIconKetNoi ? "Đã kết nối" : "Chưa kết nối được", _kn.DungIconKetNoi ? _kn.Dong : _kn.Dong + ". " + _kn.Huong,
                _kn.DungIconKetNoi ? ToolTipIcon.Info : ToolTipIcon.Warning, MucApp.HomNay);
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally
        {
            _retrying = false;
            _retryItem.Enabled = true;
            _retryItem.Text = "Thử kết nối lại";
            PushApp();
        }
    }

    /// <summary>Hỏi tin mới của Con (nhiệm vụ mới, Ba Mẹ duyệt / từ chối / nhắn, quà đã trao) → bóng báo trên khay. Lỗi mạng thì lặng lẽ thử lại lần sau.</summary>
    private async Task HocVienTickAsync()
    {
        if (_hvPolling || !_state.Paired || _state.MoCoi) return;
        _hvPolling = true;
        try
        {
            var path = "hoc-vien/tin" + (_tin.Moc is { } m ? "?sau=" + Uri.EscapeDataString(m.ToString("O")) : "");
            var (r, _) = await HvApi.GetAsync<HvTinDs>(path);
            if (r == null) return;
            var moi = _tin.Nhan(r);
            if (moi.Count > 0)
            {
                _tinMoi += moi.Count;
                var (tieu, noi) = HocVienView.ToastText(moi);
                if (_app is { Visible: true }) _ = _app.RefreshAsync();       // app đang mở ⇒ cập nhật luôn, bóng báo vẫn hiện nhẹ
                Toast(8000, tieu, noi, ToolTipIcon.Info, HocVienView.MucChoTin(moi));
                // Nhiệm vụ mới ⇒ bật app to ngay mục Nhiệm vụ (đang khoá ⇒ chờ mở khoá; app đang hiện / Con đang toàn màn hình / vừa bật ⇒ chỉ bóng báo)
                if (_bat.Nhan(HocVienView.CoNhiemVuMoi(moi), _state.Locked, AppDangHien, UI.DangBanToanManHinh(), DateTimeOffset.Now))
                    OpenApp(MucApp.NhiemVu, tuBat: true);
            }
            PushApp();
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally { _hvPolling = false; }
    }

    private void OpenRequest()
    {
        using var f = new RequestForm(_state.CanExchangePoints);
        f.ShowDialog();
    }

    private async Task TickAsync()
    {
        if (_polling) return;
        _polling = true;
        try
        {
            var fg = UI.Foreground();
            var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Foreground, AppId = fg.Id, AppName = fg.Name });
            if (!res.Ok || res.State == null)
            {
                // Dịch vụ không trả lời: chờ 2 lần liền (~6 giây) cho chắc rồi mới đổi biểu tượng + báo «Dịch vụ AiiGrow không chạy».
                // phiên đã biết KHÔNG phải của Con ⇒ giữ ẩn (dịch vụ khởi động lại không làm biểu tượng hiện ở phiên Ba Mẹ — review #75)
                if (++_pipeFail >= 2 && !_anPhienKhac) { Chao(false); SetKetNoi(KetNoiView.Chon(false, null), false); }
                return;
            }
            _pipeFail = 0;
            if (!res.State.PhienCon) { AnVoiPhienKhac(); return; }
            HienLaiNeuDaAn();
            Chao(true);
            _state = res.State;
            _at = DateTimeOffset.Now;
            SetKetNoi(KetNoiView.Chon(true, _state), true);
            if (_state.MoCoi && !_warnedMoCoi)
            {
                _warnedMoCoi = true;
                Toast(10000, "AiiGrow không chặn nữa", MoCoi.CauKhay, ToolTipIcon.Info, MucApp.HomNay);
            }
            HandleWeb();
            HandleLock();
            HandleBlocked();
            HandleWarnings();
        }
        catch (Exception e)
        {
            System.Diagnostics.Debug.WriteLine(e);
        }
        finally { _polling = false; }
    }

    /// <summary>Luật web trong hive của Con vừa đổi/gỡ (dịch vụ tăng WebRev): làm mới chính sách trình duyệt trong phiên này + nhắc mở lại trình duyệt nếu luật mới chưa áp.</summary>
    private void HandleWeb()
    {
        // dịch vụ khởi động lại ⇒ WebRev đếm lại từ 0: chỉ đồng bộ con số, không báo «luật đổi» giả (review #75)
        if (_webRev < 0 || _state.WebRev < _webRev) { _webRev = _state.WebRev; return; }
        if (_state.WebRev == _webRev) return;
        _webRev = _state.WebRev;
        UI.LamMoiChinhSachNguoiDung();
        if (!_state.MoCoi)
            Toast(8000, "Luật web vừa đổi", "Nếu trang web chưa theo luật mới, con đóng rồi mở lại trình duyệt nhé.", ToolTipIcon.Info, MucApp.HomNay);
    }

    private void HandleLock()
    {
        if (_state.Locked)
        {
            if (_lock == null || _lock.IsDisposed)
            {
                _lock = new LockForm(_state.CanExchangePoints);
                _lock.Show();
            }
            _lock.Apply(_state);
        }
        else if (_lock != null)
        {
            _lock.CloseForReal();
            _lock.Dispose();
            _lock = null;
            _warned5 = _warned1 = false;
            if (_bat.MoKhoa(AppDangHien, UI.DangBanToanManHinh(), DateTimeOffset.Now)) OpenApp(MucApp.NhiemVu, tuBat: true);
        }
    }

    private void HandleBlocked()
    {
        if (_seenBlocked < 0) { _seenBlocked = _state.BlockedSeq; return; }
        if (_state.BlockedSeq == _seenBlocked || _state.Locked) return;
        _seenBlocked = _state.BlockedSeq;
        // App bị đóng vì chưa nằm trong danh sách Ba Mẹ cho phép ⇒ mặc định "chưa phân loại"; nếu dịch vụ có lý do rõ thì dùng lý do đó.
        var reason = string.IsNullOrEmpty(_state.LockReason) ? LockReasons.ChuaPhanLoai : _state.LockReason;
        // một màn chặn tại một thời điểm: app bị đóng lặp lại (Con mở lại liên tục) không chồng nhiều cửa sổ
        if (_blocked is { IsDisposed: false }) { try { _blocked.Close(); _blocked.Dispose(); } catch { } }
        _blocked = new BlockedForm(_state.BlockedAppId, _state.BlockedAppName, reason, _state.CanExchangePoints, _state.Offline);
        _blocked.Show();
    }

    private void HandleWarnings()
    {
        if (_state.Locked) return;
        // Lượt mở bằng mã offline sắp hết ⇒ báo trước 5 phút để Con lưu bài (hết lượt thì khoá cũ quay lại).
        if (_state.MoOfflineDen is { } den)
        {
            var con = (den - DateTimeOffset.Now).TotalSeconds;
            if (con > 330) _warnedMo5 = false;
            if (con <= 300 && con > 0 && !_warnedMo5)
            {
                _warnedMo5 = true;
                Toast(6000, "Còn 5 phút mở bằng mã", "Lưu bài đang làm nhé. Hết giờ máy sẽ khoá lại.", ToolTipIcon.Warning, MucApp.HomNay);
            }
        }
        var d = TrayView.Describe(_state, _at, DateTimeOffset.Now);
        if (!d.RemainingSec.HasValue) return;
        var r = d.RemainingSec.Value;
        if (r > 330) _warned5 = false;
        if (r > 90) _warned1 = false;
        if (r <= 300 && r > 240 && !_warned5)
        {
            _warned5 = true;
            Toast(6000, "Còn 5 phút", "Lưu bài đang làm nhé. Cần thêm giờ thì bấm Xin thêm thời gian.", ToolTipIcon.Warning, MucApp.HomNay);
        }
        else if (r <= 60 && r > 0 && !_warned1)
        {
            _warned1 = true;
            Toast(6000, "Còn 1 phút", "Máy sắp khoá. Lưu bài ngay nhé.", ToolTipIcon.Warning, MucApp.HomNay);
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _timer.Dispose(); _hvTimer.Dispose(); _app?.Dispose(); _ni.Visible = false; _ni.Dispose(); }
        base.Dispose(disposing);
    }
}
