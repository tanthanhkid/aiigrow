using System.Drawing.Drawing2D;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Màn hết giờ / khoá toàn màn hình, ghi rõ tên AiiGrow, đếm ngược trước khi dịch vụ ngắt phiên.</summary>
internal sealed class LockForm : Form
{
    // Clay: nền tối ngọc sâu (gradient) + MỘT thẻ đất sét sáng ở giữa chứa ổ khoá, tiêu đề, đồng hồ và các nút.
    private readonly Label _title = new() { AutoSize = true, ForeColor = UI.Ink, BackColor = Color.Transparent, MaximumSize = new Size(700, 0), Font = UI.F(26f, FontStyle.Bold) };
    private readonly Label _hint = new() { AutoSize = true, MaximumSize = new Size(700, 0), ForeColor = UI.Muted, BackColor = Color.Transparent, Font = UI.F(14f) };
    private readonly Label _count = new() { AutoSize = true, ForeColor = UI.Green, BackColor = Color.Transparent, Font = UI.F(40f, FontStyle.Bold) };
    private readonly Label _countCap = new() { AutoSize = true, ForeColor = UI.Muted, BackColor = Color.Transparent, Font = UI.F(12f), Text = "máy sẽ khoá sau" };
    private readonly Label _brand = new() { AutoSize = true, ForeColor = Color.FromArgb(0xc6, 0xdc, 0xd6), BackColor = Color.Transparent, Font = UI.F(11f), Text = "AiiGrow · máy này do bố mẹ quản lý" };
    private readonly ClayIcon _khoa = new() { Size = new Size(UI.Px(104), UI.Px(104)), MauVien = Clay.DiemSoft, Margin = new Padding(0, 0, 0, 6) };
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
        DoubleBuffered = true;
        Text = "AiiGrow";
        _khoa.Hinh = UI.Fluent("locked");

        var flow = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoSize = true,
            Anchor = AnchorStyles.None, BackColor = Color.Transparent,
        };
        flow.Controls.Add(_khoa);
        foreach (var l in new Control[] { _title, _hint, _count, _countCap })
        {
            l.Margin = new Padding(0, 0, 0, 12);
            flow.Controls.Add(l);
        }
        var ask = UI.Btn("Xin thêm thời gian", true, 300, "hourglass_not_done");
        ask.Click += (_, _) =>
        {
            using var f = new RequestForm(_canExchange);
            f.ShowDialog(this);
        };
        var logoff = UI.Btn("Lưu bài và đăng xuất", false, 300);
        logoff.Click += (_, _) => System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("shutdown.exe", "/l") { CreateNoWindow = true, UseShellExecute = false });
        // #70 §1: Ba Mẹ cần máy ⇒ khoá phiên (chuyển người dùng), KHÔNG đăng xuất; phiên Con giữ nguyên, không trừ điểm.
        var bame = UI.Btn("Ba Mẹ dùng máy", false, 300, "key");
        bame.Click += (_, _) => UI.NhuongMayChoBaMe();
        var bameHint = new Label { AutoSize = true, ForeColor = UI.Muted, BackColor = Color.Transparent, Font = UI.F(11f), Text = "Ba Mẹ cần máy? Bấm nút này hoặc Win+L", Margin = new Padding(0, 0, 0, 12) };
        flow.Controls.Add(ask);
        flow.Controls.Add(bame);
        flow.Controls.Add(bameHint);
        flow.Controls.Add(logoff);
        // Mất mạng: Ba Mẹ đọc mã mở offline — gỡ được hết giờ, giờ ngủ, «Khoá ngay» (có mạng lại thì lượt mở kết thúc).
        _code = new OfflineCodePanel(420, UI.Ink, UI.Muted) { Visible = false };
        flow.Controls.Add(_code);

        var the = new ClayCard
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, BoGoc = UI.Px(36),
            Padding = VeThe.Pad(UI.Px(40), UI.Px(32), UI.Px(40), UI.Px(24)),
        };
        flow.Location = new Point(the.Padding.Left, the.Padding.Top);   // Panel không tự đặt con theo Padding (chỉ Dock mới theo)
        the.Controls.Add(flow);
        var host = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2, BackColor = Color.Transparent };
        host.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        host.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        var center = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent };
        center.Controls.Add(the);
        void GiuaThe() => the.Location = new Point(Math.Max(0, (center.Width - the.Width) / 2), Math.Max(0, (center.Height - the.Height) / 2));
        center.Resize += (_, _) => GiuaThe();
        the.SizeChanged += (_, _) => GiuaThe();
        // Ổ khoá «đóng sập» khi màn hiện (M-vui · KHOÁ MÁY); tắt hiệu ứng động của Windows ⇒ đứng yên.
        Shown += (_, _) => _khoa.DongSap(UI.Fluent("unlocked"));
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

    /// <summary>Nền tối ngọc sâu: gradient dọc + quầng sáng mềm sau thẻ (chữ trắng ở chân 9:1 trở lên).</summary>
    protected override void OnPaintBackground(PaintEventArgs e)
    {
        var r = ClientRectangle;
        if (r.Width <= 0 || r.Height <= 0) return;
        using (var lg = new LinearGradientBrush(r, Color.FromArgb(0x13, 0x4a, 0x41), Color.FromArgb(0x07, 0x24, 0x20), 90f))
            e.Graphics.FillRectangle(lg, r);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        var q = new RectangleF(r.Width * 0.2f, r.Height * 0.05f, r.Width * 0.6f, r.Height * 0.75f);
        using var qp = new GraphicsPath();
        qp.AddEllipse(q);
        using var pg = new PathGradientBrush(qp) { CenterColor = Color.FromArgb(70, 0x5f, 0xc9, 0xb2), SurroundColors = new[] { Color.FromArgb(0, 0x13, 0x4a, 0x41) } };
        e.Graphics.FillEllipse(pg, q);
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
