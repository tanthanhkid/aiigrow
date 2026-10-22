using AiiGrow.Core;

namespace AiiGrow.Tray;

internal sealed class TrayContext : ApplicationContext
{
    private readonly NotifyIcon _ni;
    private readonly StatusForm _status = new();
    private readonly System.Windows.Forms.Timer _timer = new() { Interval = 3000 };
    private LockForm? _lock;
    private TrayState _state = new();
    private DateTimeOffset _at = DateTimeOffset.Now;
    private int _seenBlocked = -1;
    private bool _polling;
    private bool _warned5, _warned1, _warnedMo5, _warnedMoCoi;

    // Khay học viên: nhiệm vụ / phần quà / thông báo hai chiều với Ba Mẹ (HocVienForm). Hỏi tin mới mỗi 30 giây, tổng quan mỗi ~2 phút.
    private readonly System.Windows.Forms.Timer _hvTimer = new() { Interval = 30_000 };
    private readonly TinTracker _tin = new();
    private HocVienForm? _hv;
    private readonly ToolStripMenuItem _hvItem;
    private HvTongQuan? _tong;
    private DateTimeOffset _tongAt = DateTimeOffset.MinValue;
    private DateTimeOffset _hvToastAt = DateTimeOffset.MinValue;
    private int _tinMoi;
    private bool _hvPolling;

    public TrayContext()
    {
        var menu = new ContextMenuStrip();
        _hvItem = new ToolStripMenuItem("Nhiệm vụ & phần quà", null, (_, _) => OpenHocVien());
        menu.Items.Add(_hvItem);
        menu.Items.Add("Xem thời gian còn lại", null, (_, _) => _status.ShowNearTray());
        menu.Items.Add("Xin thêm thời gian", null, (_, _) => OpenRequest());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Máy này do bố mẹ quản lý bằng AiiGrow") { Enabled = false });

        _ni = new NotifyIcon
        {
            Icon = UI.MakeIcon(),
            Text = "AiiGrow đang bật",
            Visible = true,
            ContextMenuStrip = menu,
        };
        _ni.MouseClick += (_, e) => { if (e.Button == MouseButtons.Left) _status.ShowNearTray(); };
        _status.AskClicked += OpenRequest;
        _status.ExchangeClicked += OpenRequest;
        _status.TasksClicked += OpenHocVien;
        // Bấm vào thông báo «nhiệm vụ mới / Ba Mẹ phản hồi» ⇒ mở thẳng màn nhiệm vụ (các bóng báo khác như «Còn 5 phút» thì không).
        _ni.BalloonTipClicked += (_, _) => { if ((DateTimeOffset.Now - _hvToastAt).TotalSeconds < 20) OpenHocVien(); };

        _ni.ShowBalloonTip(5000, "AiiGrow đang bật", "Bố mẹ đặt giờ dùng máy. Bấm vào biểu tượng để xem còn bao lâu, nhận nhiệm vụ và xem phần quà.", ToolTipIcon.Info);
        BaoCapNhat.NeuVuaCapNhat(_ni);

        _timer.Tick += async (_, _) => await TickAsync();
        _timer.Start();
        _ = TickAsync();

        _hvTimer.Tick += async (_, _) => await HocVienTickAsync();
        _hvTimer.Start();
        _ = HocVienTickAsync();
    }

    private void OpenHocVien()
    {
        if (_state.Locked) { _ni.ShowBalloonTip(4000, "Máy đang khoá", "Khi máy mở lại, con xem nhiệm vụ và phần quà nhé.", ToolTipIcon.Info); return; }
        if (_hv == null || _hv.IsDisposed)
        {
            _hv = new HocVienForm();
            _hv.Loaded += t => { _tong = t; _tongAt = DateTimeOffset.Now; _status.ApplyHv(t, _tinMoi); };
        }
        _tinMoi = 0;
        UpdateHvBadge();
        _hv.ShowFront();
    }

    private void UpdateHvBadge()
    {
        _hvItem.Text = _tinMoi > 0 ? $"Nhiệm vụ & phần quà ({_tinMoi} tin mới)" : "Nhiệm vụ & phần quà";
        _status.ApplyHv(_tong, _tinMoi);
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
                _hvToastAt = DateTimeOffset.Now;
                if (_hv is { Visible: true }) _ = _hv.RefreshAsync();       // cửa sổ đang mở ⇒ cập nhật luôn, bóng báo vẫn hiện nhẹ
                _ni.ShowBalloonTip(8000, tieu, noi, ToolTipIcon.Info);
            }
            // tổng quan (điểm, số việc) cho dòng tóm tắt ở cửa sổ khay: có tin mới hoặc quá 2 phút
            if (_tong == null || moi.Count > 0 || (DateTimeOffset.Now - _tongAt).TotalMinutes >= 2)
            {
                var (tq, _) = await HvApi.GetAsync<HvTongQuan>("hoc-vien/tong-quan");
                if (tq != null) { _tong = tq; _tongAt = DateTimeOffset.Now; }
            }
            UpdateHvBadge();
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
                _ni.Text = "AiiGrow đang bật · chưa nối được dịch vụ";
                return;
            }
            _state = res.State;
            _at = DateTimeOffset.Now;
            _status.Apply(_state, _at);
            _ni.Text = TrayView.Tooltip(_state, _at, DateTimeOffset.Now);
            if (_state.MoCoi && !_warnedMoCoi)
            {
                _warnedMoCoi = true;
                _ni.ShowBalloonTip(10000, "AiiGrow không chặn nữa", MoCoi.CauKhay, ToolTipIcon.Info);
            }
            HandleLock();
            HandleBlocked();
            HandleWarnings();
        }
        catch (Exception e)
        {
            _ni.Text = "AiiGrow đang bật";
            System.Diagnostics.Debug.WriteLine(e);
        }
        finally { _polling = false; }
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
        }
    }

    private void HandleBlocked()
    {
        if (_seenBlocked < 0) { _seenBlocked = _state.BlockedSeq; return; }
        if (_state.BlockedSeq == _seenBlocked || _state.Locked) return;
        _seenBlocked = _state.BlockedSeq;
        // App bị đóng vì chưa nằm trong danh sách Ba Mẹ cho phép ⇒ mặc định "chưa phân loại"; nếu dịch vụ có lý do rõ thì dùng lý do đó.
        var reason = string.IsNullOrEmpty(_state.LockReason) ? LockReasons.ChuaPhanLoai : _state.LockReason;
        new BlockedForm(_state.BlockedAppId, _state.BlockedAppName, reason, _state.CanExchangePoints, _state.Offline).Show();
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
                _ni.ShowBalloonTip(6000, "Còn 5 phút mở bằng mã", "Lưu bài đang làm nhé. Hết giờ máy sẽ khoá lại.", ToolTipIcon.Warning);
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
            _ni.ShowBalloonTip(6000, "Còn 5 phút", "Lưu bài đang làm nhé. Cần thêm giờ thì bấm Xin thêm thời gian.", ToolTipIcon.Warning);
        }
        else if (r <= 60 && r > 0 && !_warned1)
        {
            _warned1 = true;
            _ni.ShowBalloonTip(6000, "Còn 1 phút", "Máy sắp khoá. Lưu bài ngay nhé.", ToolTipIcon.Warning);
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _timer.Dispose(); _hvTimer.Dispose(); _hv?.Dispose(); _ni.Visible = false; _ni.Dispose(); }
        base.Dispose(disposing);
    }
}
