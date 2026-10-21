using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>"Mở app không được phép": nói rõ tên app và cho con xin Ba Mẹ.</summary>
internal sealed class BlockedForm : Form
{
    public BlockedForm(string? appId, string? appName, bool canExchange)
    {
        var name = TrayView.FriendlyAppName(appId, appName);
        Text = "AiiGrow";
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        StartPosition = FormStartPosition.Manual;
        TopMost = true; ShowInTaskbar = false;
        BackColor = UI.Paper;
        ClientSize = new Size(380, 200);
        var wa = Screen.PrimaryScreen!.WorkingArea;
        Location = new Point(wa.Right - Width - 12, wa.Bottom - Height - 12);

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(18, 14, 18, 10),
        };
        flow.Controls.Add(UI.Text(name + " chưa được Ba Mẹ cho mở", 13f, true, null, 340));
        flow.Controls.Add(UI.Text("Con có thể xin Ba Mẹ thêm thời gian.", 11f, false, UI.Muted, 340));
        var ask = UI.Btn("Xin Ba Mẹ", true, 340);
        ask.Click += (_, _) =>
        {
            Hide();
            using var f = new RequestForm(canExchange, appId, name);
            f.ShowDialog();
            Close();
        };
        var close = UI.Btn("Đóng", false, 340);
        close.Click += (_, _) => Close();
        flow.Controls.Add(ask);
        flow.Controls.Add(close);
        Controls.Add(flow);
    }
}
