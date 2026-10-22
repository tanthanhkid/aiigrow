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

    public TrayContext()
    {
        var menu = new ContextMenuStrip();
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

        _ni.ShowBalloonTip(5000, "AiiGrow đang bật", "Bố mẹ đặt giờ dùng máy. Bấm vào biểu tượng để xem còn bao lâu.", ToolTipIcon.Info);
        BaoCapNhat.NeuVuaCapNhat(_ni);

        _timer.Tick += async (_, _) => await TickAsync();
        _timer.Start();
        _ = TickAsync();
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
        if (disposing) { _timer.Dispose(); _ni.Visible = false; _ni.Dispose(); }
        base.Dispose(disposing);
    }
}
