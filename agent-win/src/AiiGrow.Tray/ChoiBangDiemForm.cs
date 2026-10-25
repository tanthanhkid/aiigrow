using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Chơi bằng điểm»: Con chọn app/trang giải trí Ba Mẹ đã cho phép đổi điểm lấy phút chơi (<see cref="TrayState.PlayChoices"/>).
/// Nút chỉ GỬI lệnh Play; dịch vụ hỏi máy chủ (phien/xet → phien/mo) và quyết định. Ghi rõ số phút đổi được (≈ X phút chơi).
/// </summary>
internal sealed class ChoiBangDiemForm : Form
{
    private readonly Label _msg = UI.Text("", 11f, true, UI.Green, 340);
    private readonly Label _phut = UI.Text("Mỗi app đổi điểm lấy số phút khác nhau — con xem số phút ở từng nút.", 11f, false, UI.Muted, 340);
    private readonly List<Button> _nut = new();
    private bool _busy;

    public ChoiBangDiemForm(IReadOnlyList<string> choices)
    {
        Text = "AiiGrow · Chơi bằng điểm";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        BackColor = UI.Paper;
        ClientSize = new Size(UI.Px(380), UI.Px(160 + Math.Clamp(choices.Count, 1, 8) * 58));   // nhiều mục (tới 40) ⇒ cuộn, không cao quá màn hình

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(20), UI.Px(16), UI.Px(20), UI.Px(10)), AutoScroll = true,
        };
        flow.Controls.Add(UI.Text("Chơi bằng điểm", 14f, true, null, 340));
        flow.Controls.Add(_phut);
        if (choices.Count == 0)
        {
            _phut.Text = "";
            flow.Controls.Add(UI.Text("Ba Mẹ chưa chọn app giải trí nào cho con đổi điểm. Con xin Ba Mẹ nhé.", 11f, false, UI.Muted, 340));
        }
        foreach (var c in choices)
        {
            var id = c;
            var b = UI.Btn("Chơi " + TrayView.FriendlyAppName(id, null), true, 340, "video_game");
            b.Click += async (_, _) => await ChoiAsync(id);
            _nut.Add(b);
            flow.Controls.Add(b);
        }
        // máy chủ định giá theo nhóm (game / video…) ⇒ hỏi số phút cho TỪNG mục, ghi lên nút (dịch vụ nhớ 60 giây)
        if (choices.Count > 0) Shown += async (_, _) => await HoiPhutAsync(choices);
        var dong = UI.Btn("Đóng", false, 340);
        dong.Click += (_, _) => Close();
        CancelButton = dong;
        flow.Controls.Add(dong);
        flow.Controls.Add(_msg);
        Controls.Add(flow);
    }

    private async Task HoiPhutAsync(IReadOnlyList<string> choices)
    {
        // hỏi song song (pipe nhiều phiên bản; dịch vụ nhớ 60 giây) — 12 mục không phải chờ nối tiếp
        // tối đa 12 mục đầu (không bắn hàng chục phien/xet một lúc) — mục sau vẫn bấm được, chỉ không ghi trước số phút
        var hoi = choices.Take(Math.Min(_nut.Count, 12)).Select(async (id, i) =>
        {
            int? phut = null;
            try
            {
                var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.PlayInfo, AppId = id });
                if (r.Ok) phut = r.PlayMinutes;
            }
            catch { }
            if (IsDisposed) return;
            var ten = "Chơi " + TrayView.FriendlyAppName(id, null);
            _nut[i].Text = phut is > 0 ? $"{ten} · ≈ {phut} phút" : ten;
        });
        await Task.WhenAll(hoi);
    }

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
