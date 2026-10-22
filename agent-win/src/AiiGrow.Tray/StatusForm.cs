using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Cửa sổ nhỏ khi bấm biểu tượng khay: chế độ, thời gian còn lại, nút xin thêm.</summary>
internal sealed class StatusForm : Form
{
    private readonly Label _mode = UI.Text("", 10.5f, true, UI.Green);
    private readonly Label _big = UI.Text("", 28f, true);
    private readonly Label _cap = UI.Text("", 11f, false, UI.Muted);
    private readonly Label _offline = UI.Text("Đang không có mạng, máy chạy theo giờ đã lưu.", 10.5f, false, UI.Muted);
    private readonly Label _hv = UI.Text("", 10.5f, true, UI.Green, 320);
    private readonly Button _tasks = UI.Btn("Nhiệm vụ & phần quà", true, 320);
    private readonly Button _ask = UI.Btn("Xin thêm thời gian", false, 320);
    private readonly Button _exchange = UI.Btn("Đổi điểm lấy thời gian", false, 320);
    private readonly System.Windows.Forms.Timer _tick = new() { Interval = 1000 };
    private TrayState _s = new();
    private DateTimeOffset _at = DateTimeOffset.Now;

    public event Action? AskClicked;
    public event Action? ExchangeClicked;
    public event Action? TasksClicked;

    public StatusForm()
    {
        Text = "AiiGrow";
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        ShowInTaskbar = false;
        BackColor = UI.Paper;
        ClientSize = new Size(360, 420);

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(18, 14, 18, 10),
        };
        flow.Controls.Add(UI.Text("AiiGrow đang bật", 12f, true));
        flow.Controls.Add(_mode);
        flow.Controls.Add(_big);
        flow.Controls.Add(_cap);
        flow.Controls.Add(_offline);
        flow.Controls.Add(_hv);
        flow.Controls.Add(_tasks);
        flow.Controls.Add(_ask);
        flow.Controls.Add(_exchange);
        Controls.Add(flow);

        _tasks.Click += (_, _) => TasksClicked?.Invoke();
        _ask.Click += (_, _) => AskClicked?.Invoke();
        _exchange.Click += (_, _) => ExchangeClicked?.Invoke();
        _tick.Tick += (_, _) => Refresh2();
        _tick.Start();
        // Đóng cửa sổ chỉ ẩn đi, biểu tượng khay vẫn ở đó.
        FormClosing += (_, e) => { if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); } };
    }

    /// <summary>Dòng tóm tắt «Điểm · việc đang chờ con» (từ lần tải tổng quan gần nhất; null = chưa có).</summary>
    public void ApplyHv(HvTongQuan? t, int tinMoi)
    {
        if (t == null) { _hv.Text = ""; _hv.Visible = false; return; }
        var s = $"{t.SoDu} điểm · {HocVienView.SoViecMo(t)} việc đang chờ con";
        if (tinMoi > 0) s += $" · {tinMoi} tin mới";
        _hv.Text = s;
        _hv.Visible = true;
    }

    public void Apply(TrayState s, DateTimeOffset receivedAt)
    {
        _s = s; _at = receivedAt;
        Refresh2();
    }

    private void Refresh2()
    {
        _mode.Text = "Chế độ: " + TrayView.ModeLabel(_s.Mode);
        var d = TrayView.Describe(_s, _at, DateTimeOffset.Now);
        _big.Text = d.Big;
        _cap.Text = d.Caption;
        _cap.Visible = d.Caption.Length > 0;
        _offline.Visible = _s.Offline;
        _tasks.Visible = _s.Paired && !_s.MoCoi;
        _exchange.Visible = _s.CanExchangePoints; // chỉ cờ; không bao giờ hiện số điểm
    }

    public void ShowNearTray()
    {
        var wa = Screen.PrimaryScreen!.WorkingArea;
        Location = new Point(wa.Right - Width - 12, wa.Bottom - Height - 12);
        Refresh2();
        Show();
        Activate();
    }
}
