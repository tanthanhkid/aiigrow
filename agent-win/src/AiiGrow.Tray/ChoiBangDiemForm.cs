using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Chơi bằng điểm»: Con chọn app/trang giải trí Ba Mẹ đã cho phép đổi điểm lấy phút chơi (<see cref="TrayState.PlayChoices"/>).
/// Nút chỉ GỬI lệnh Play; dịch vụ hỏi máy chủ (phien/xet → phien/mo) và quyết định. Ghi rõ số phút đổi được (≈ X phút chơi).
/// </summary>
internal sealed class ChoiBangDiemForm : Form
{
    private readonly Label _msg = UI.Text("", 11f, true, UI.Green, 340);
    private readonly Label _phut = UI.Text("Đang hỏi số phút chơi…", 11f, false, UI.Muted, 340);
    private readonly List<Button> _nut = new();
    private bool _busy;

    public ChoiBangDiemForm(IReadOnlyList<string> choices, int? phut)
    {
        Text = "AiiGrow · Chơi bằng điểm";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        BackColor = UI.Paper;
        ClientSize = new Size(380, 150 + Math.Max(1, choices.Count) * 54);

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(18, 14, 18, 10), AutoScroll = true,
        };
        flow.Controls.Add(UI.Text("Chơi bằng điểm", 14f, true, null, 340));
        flow.Controls.Add(_phut);
        if (phut.HasValue) CapNhatPhut(phut);
        if (choices.Count == 0)
            flow.Controls.Add(UI.Text("Ba Mẹ chưa chọn app giải trí nào cho con đổi điểm. Con xin Ba Mẹ nhé.", 11f, false, UI.Muted, 340));
        foreach (var c in choices)
        {
            var id = c;
            var b = UI.Btn("Chơi " + TrayView.FriendlyAppName(id, null), true, 340);
            b.Click += async (_, _) => await ChoiAsync(id);
            _nut.Add(b);
            flow.Controls.Add(b);
        }
        var dong = UI.Btn("Đóng", false, 340);
        dong.Click += (_, _) => Close();
        CancelButton = dong;
        flow.Controls.Add(dong);
        flow.Controls.Add(_msg);
        Controls.Add(flow);
    }

    public void CapNhatPhut(int? phut)
        => _phut.Text = phut is > 0 ? $"Điểm của con đổi được khoảng {phut} phút chơi." : "Hiện con chưa đổi được phút chơi nào.";

    private async Task ChoiAsync(string id)
    {
        if (_busy) return;
        _busy = true;
        foreach (var b in _nut) b.Enabled = false;
        _msg.ForeColor = UI.Green; _msg.Text = "Đang hỏi máy chủ…";
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Play, AppId = id });
        _busy = false;
        if (IsDisposed) return;
        if (!res.Ok || res.Status == "tu_choi")
        {
            _msg.ForeColor = UI.Error;
            _msg.Text = res.Ok ? (res.Message ?? "Chưa mở được bằng điểm. Con xin Ba Mẹ nhé.") : (res.Error ?? "Chưa mở được. Con thử lại nhé.");
            foreach (var b in _nut) b.Enabled = true;
            return;
        }
        _msg.Text = res.Message ?? "Được rồi! Chơi vui nhé.";
        var t = new System.Windows.Forms.Timer { Interval = 1500 };
        t.Tick += (_, _) => { t.Stop(); t.Dispose(); Close(); };
        t.Start();
    }
}
