using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Màn hết giờ / khoá toàn màn hình, ghi rõ tên AiiGrow, đếm ngược trước khi dịch vụ ngắt phiên.</summary>
internal sealed class LockForm : Form
{
    private readonly Label _title = new() { AutoSize = true, ForeColor = Color.White, Font = UI.F(26f, FontStyle.Bold) };
    private readonly Label _hint = new() { AutoSize = true, MaximumSize = new Size(700, 0), ForeColor = Color.FromArgb(0xd8, 0xe8, 0xdd), Font = UI.F(14f) };
    private readonly Label _count = new() { AutoSize = true, ForeColor = Color.White, Font = UI.F(40f, FontStyle.Bold) };
    private readonly Label _countCap = new() { AutoSize = true, ForeColor = Color.FromArgb(0xd8, 0xe8, 0xdd), Font = UI.F(12f), Text = "máy sẽ khoá sau" };
    private readonly Label _brand = new() { AutoSize = true, ForeColor = Color.FromArgb(0xa8, 0xc8, 0xb4), Font = UI.F(11f), Text = "AiiGrow · máy này do bố mẹ quản lý" };
    private readonly bool _canExchange;
    private bool _allowClose;
    private bool _locking;
    private readonly OfflineCodePanel _code;

    public LockForm(bool canExchange)
    {
        _canExchange = canExchange;
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;
        TopMost = true;
        ShowInTaskbar = false;
        BackColor = UI.GreenDark;
        Text = "AiiGrow";

        var flow = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoSize = true,
            Anchor = AnchorStyles.None,
        };
        foreach (var l in new Control[] { _title, _hint, _count, _countCap })
        {
            l.Margin = new Padding(0, 0, 0, 12);
            flow.Controls.Add(l);
        }
        var ask = UI.Btn("Xin thêm thời gian", true, 300);
        ask.BackColor = Color.White; ask.ForeColor = UI.GreenDark;
        ask.Click += (_, _) =>
        {
            using var f = new RequestForm(_canExchange);
            f.ShowDialog(this);
        };
        var logoff = UI.Btn("Lưu bài và đăng xuất", false, 300);
        logoff.BackColor = UI.GreenDark; logoff.ForeColor = Color.White; logoff.FlatAppearance.BorderColor = Color.White;
        logoff.Click += (_, _) => System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("shutdown.exe", "/l") { CreateNoWindow = true, UseShellExecute = false });
        // #70 §1: Ba Mẹ cần máy ⇒ khoá phiên (chuyển người dùng), KHÔNG đăng xuất; phiên Con giữ nguyên, không trừ điểm.
        var bame = UI.Btn("Ba Mẹ dùng máy", false, 300);
        bame.BackColor = UI.GreenDark; bame.ForeColor = Color.White; bame.FlatAppearance.BorderColor = Color.White;
        bame.Click += (_, _) => UI.NhuongMayChoBaMe();
        var bameHint = new Label { AutoSize = true, ForeColor = Color.FromArgb(0xd8, 0xe8, 0xdd), Font = UI.F(11f), Text = "Ba Mẹ cần máy? Bấm nút này hoặc Win+L", Margin = new Padding(0, 0, 0, 12) };
        flow.Controls.Add(ask);
        flow.Controls.Add(bame);
        flow.Controls.Add(bameHint);
        flow.Controls.Add(logoff);
        // Mất mạng: Ba Mẹ đọc mã mở offline — gỡ được hết giờ, giờ ngủ, «Khoá ngay» (có mạng lại thì lượt mở kết thúc).
        _code = new OfflineCodePanel(420, Color.White, Color.FromArgb(0xd8, 0xe8, 0xdd)) { Visible = false };
        flow.Controls.Add(_code);

        var host = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2 };
        host.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        host.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        var center = new Panel { Dock = DockStyle.Fill };
        center.Controls.Add(flow);
        center.Resize += (_, _) => flow.Location = new Point((center.Width - flow.Width) / 2, Math.Max(0, (center.Height - flow.Height) / 2));
        host.Controls.Add(center, 0, 0);
        _brand.Margin = new Padding(20);
        host.Controls.Add(_brand, 0, 1);
        Controls.Add(host);

        // Giữ cửa sổ ở trên cùng, nhưng con vẫn mở được cửa sổ xin giờ.
        var keep = new System.Windows.Forms.Timer { Interval = 2000 };
        keep.Tick += (_, _) => { if (!_allowClose && OwnedForms.Length == 0 && Form.ActiveForm == null) { TopMost = true; Activate(); } };
        keep.Start();
        FormClosing += (_, e) => { if (!_allowClose) e.Cancel = true; };
    }

    public void Apply(TrayState s)
    {
        _title.Text = TrayView.LockTitle(s.LockReason);
        _hint.Text = TrayView.LockHint(s.LockReason);
        _code.Visible = BlockScreenView.ShowOfflineCode(s.Offline, lockScreen: true, s.LockReason);
        bool counting = s.LockGraceLeftSec.HasValue && s.LockGraceLeftSec.Value > 0;
        _count.Visible = _countCap.Visible = s.LockGraceLeftSec.HasValue;
        if (s.LockGraceLeftSec.HasValue) _count.Text = TrayView.FormatClock(s.LockGraceLeftSec.Value);
        if (s.LockGraceLeftSec == 0 && !_locking)
        {
            _locking = true;
            UI.LockWorkStation();
        }
        else if (counting) _locking = false;
    }

    public void CloseForReal()
    {
        _allowClose = true;
        Close();
    }
}
