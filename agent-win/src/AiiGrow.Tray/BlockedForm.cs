using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Màn chặn: nói rõ tên app + lý do (ngoài giờ / hết điểm / chưa phân loại) và cho con hai lựa chọn —
/// «Dùng điểm để chơi» (dịch vụ gọi phien/xet → phien/mo) và «Xin phép Ba Mẹ» (gửi yêu cầu lên máy chủ).
/// Nút chỉ GỬI lên máy chủ; mọi quyết định do máy chủ trả về. Chữ/logic lấy từ lớp thuần <see cref="BlockScreenView"/>.
/// </summary>
internal sealed class BlockedForm : Form
{
    private readonly string? _appId;
    private readonly bool _canExchange;
    private readonly Label _msg = UI.Text("", 10.5f, false, UI.Green, 340);
    private readonly Button _play;
    private readonly Button _ask;
    private bool _busy;

    public BlockedForm(string? appId, string? appName, string? reason, bool canExchange)
    {
        _appId = appId; _canExchange = canExchange;
        var view = BlockScreenView.For(appId, appName, reason, canExchange);

        Text = "AiiGrow";
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        StartPosition = FormStartPosition.Manual;
        TopMost = true; ShowInTaskbar = false;
        BackColor = UI.Paper;
        ClientSize = new Size(380, view.ShowUsePoints ? 272 : 220);
        var wa = Screen.PrimaryScreen!.WorkingArea;
        Location = new Point(wa.Right - Width - 12, wa.Bottom - Height - 12);

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(18, 14, 18, 10),
        };
        flow.Controls.Add(UI.Text(view.AppName + " chưa được mở", 13f, true, null, 340));
        flow.Controls.Add(UI.Text(view.Reason, 11f, false, UI.Muted, 340));

        _play = UI.Btn(view.UsePointsLabel, true, 340);
        _play.Click += async (_, _) => await PlayAsync();
        if (view.ShowUsePoints) flow.Controls.Add(_play);

        _ask = UI.Btn(view.AskParentLabel, !view.ShowUsePoints, 340);
        _ask.Click += (_, _) =>
        {
            Hide();
            using var f = new RequestForm(_canExchange, _appId, view.AppName);
            f.ShowDialog();
            Close();
        };
        flow.Controls.Add(_ask);

        var close = UI.Btn("Đóng", false, 340);
        close.Click += (_, _) => Close();
        flow.Controls.Add(close);
        flow.Controls.Add(_msg);
        Controls.Add(flow);
    }

    private async Task PlayAsync()
    {
        if (_busy) return;
        _busy = true;
        _play.Enabled = _ask.Enabled = false;
        _msg.Text = "Đang hỏi máy chủ…";
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Play, AppId = _appId });
        _busy = false;
        if (!res.Ok)
        {
            _msg.Text = res.Error ?? "Chưa mở được. Con thử lại nhé.";
            _play.Enabled = _ask.Enabled = true;
            return;
        }
        if (res.Status == "tu_choi")
        {
            _msg.Text = res.Message ?? "Chưa mở được bằng điểm. Con xin Ba Mẹ nhé.";
            _play.Enabled = false; _ask.Enabled = true;
            return;
        }
        // Máy chủ đã mở phiên: màn chặn đóng, phiên sẽ chạy theo nhịp của dịch vụ.
        _msg.Text = res.Message ?? "Được rồi! Chơi vui nhé.";
        var t = new System.Windows.Forms.Timer { Interval = 1500 };
        t.Tick += (_, _) => { t.Stop(); t.Dispose(); Close(); };
        t.Start();
    }
}
