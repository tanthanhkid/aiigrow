using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Xin thêm thời gian (30 phút / 1 giờ / 2 giờ + lời nhắn) rồi chờ bố mẹ; hoặc Đổi điểm.</summary>
internal sealed class RequestForm : Form
{
    private readonly int[] _opts = { 30, 60, 120 };
    private readonly RadioButton[] _radios = new RadioButton[3];
    private readonly TextBox _note = new() { Multiline = true, Height = 64, Width = 380, Font = UI.F(11f), MaxLength = 200, BorderStyle = BorderStyle.FixedSingle };
    private readonly Button _send = UI.Btn("Xin bố mẹ", true, 380, "speech_balloon");
    private readonly Button _exchange = UI.Btn("Đổi điểm lấy thời gian", false, 380, "star");
    private readonly Label _msg = UI.Text("", 11f, true, UI.Green, 380);
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private readonly string? _appId, _appName;
    private string? _pendingId;
    private bool _busy;

    public RequestForm(bool canExchange, string? appId = null, string? appName = null)
    {
        _appId = appId; _appName = appName;
        Text = "AiiGrow · Xin thêm thời gian";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        BackColor = UI.Paper;
        ClientSize = new Size(UI.Px(430), UI.Px(500));   // nút Clay cao theo DPI ⇒ cửa sổ cũng theo DPI

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(20, 16, 20, 10),
        };
        flow.Controls.Add(UI.Text("Con muốn thêm bao lâu?", 16f, true));
        var row = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, Margin = new Padding(0, 0, 0, 10), BackColor = Color.Transparent };
        string[] labels = { "30 phút", "1 giờ", "2 giờ" };
        for (int i = 0; i < 3; i++)
        {
            _radios[i] = new ClayRadio
            {
                Text = labels[i], TextAlign = ContentAlignment.MiddleCenter,
                Width = 120, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold),
                Checked = i == 1, Margin = new Padding(0, 0, 8, 0),
            };
            row.Controls.Add(_radios[i]);
        }
        flow.Controls.Add(row);
        flow.Controls.Add(UI.Text("Nhắn bố mẹ (không bắt buộc)", 10.5f, false, UI.Muted));
        flow.Controls.Add(_note);
        flow.Controls.Add(new Label { Height = 6, Width = 10 });
        flow.Controls.Add(_send);
        // «Đổi điểm» = mở phiên chơi bằng điểm cho đúng app đang bị chặn (phien/xet + phien/mo) — không có app thì không hiện.
        if (canExchange && !string.IsNullOrEmpty(appId)) flow.Controls.Add(_exchange);
        flow.Controls.Add(_msg);
        Controls.Add(flow);

        _send.Click += async (_, _) => await SendAsync("them_gio");
        _exchange.Click += async (_, _) => await ExchangeAsync();
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => _poll.Dispose();
        foreach (var r in _radios) r.CheckedChanged += (_, _) => Recolor();
        Recolor();
    }

    private void Recolor()
    {
        foreach (var r in _radios)
        {
            r.BackColor = r.Checked ? UI.Green : UI.Card;
            r.ForeColor = r.Checked ? Color.White : UI.Ink;
        }
    }

    private int Minutes() => _opts[Array.FindIndex(_radios, r => r.Checked) is var i and >= 0 ? i : 1];

    private async Task SendAsync(string kind)
    {
        if (_busy) return;
        _busy = true;
        _send.Enabled = false; _exchange.Enabled = false;
        _msg.Text = "Đang gửi…";
        var res = await PipeClient.CallAsync(new PipeRequest
        {
            Cmd = PipeCmd.Request, Kind = kind, Minutes = Minutes(),
            AppId = _appId, AppName = _appName,
            Note = string.IsNullOrWhiteSpace(_note.Text) ? null : _note.Text.Trim(),
        });
        _busy = false;
        if (!res.Ok)
        {
            _msg.Text = res.Error ?? "Chưa gửi được. Con thử lại nhé.";
            _send.Enabled = true; _exchange.Enabled = true;
            return;
        }
        if (TrayView.XinGio(res.Status) == TrayView.KetQuaXin.Duoc)
        {
            _msg.Text = "Được rồi! Máy đã được thêm thời gian.";
            CloseLater();
            return;
        }
        _pendingId = res.Id;
        _msg.Text = "Đã gửi cho bố mẹ. Đang chờ bố mẹ trả lời…";
        _poll.Start();
    }

    private async Task PollAsync()
    {
        if (_pendingId == null || _busy) return;
        _busy = true;
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _pendingId });
        _busy = false;
        if (!res.Ok) return;
        switch (TrayView.XinGio(res.Status))
        {
            case TrayView.KetQuaXin.Duoc:
                _poll.Stop();
                _msg.Text = "Bố mẹ đã cho thêm giờ. Học tốt nhé!";
                CloseLater();
                break;
            case TrayView.KetQuaXin.TuChoi:
            case TrayView.KetQuaXin.HetHan:
                _poll.Stop();
                _msg.Text = TrayView.XinGio(res.Status) == TrayView.KetQuaXin.TuChoi
                    ? "Bố mẹ chưa đồng ý lần này."
                    : "Lời xin đã hết hạn hoặc bị huỷ. Con gửi lại nhé.";
                _pendingId = null;
                _send.Enabled = true; _exchange.Enabled = true;
                break;
        }
    }

    private async Task ExchangeAsync()
    {
        if (_busy) return;
        _busy = true;
        _send.Enabled = false; _exchange.Enabled = false;
        _msg.Text = "Đang đổi điểm…";
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Play, AppId = _appId, AppName = _appName });
        _busy = false;
        if (res.Ok && res.Status != "tu_choi")
        {
            _msg.Text = "Được rồi! Con dùng điểm để chơi nhé.";
            CloseLater();
            return;
        }
        _msg.Text = (res.Ok ? res.Message : res.Error) ?? "Chưa đổi được. Con xin bố mẹ nhé.";
        _send.Enabled = true; _exchange.Enabled = true;
    }

    private void CloseLater()
    {
        var t = new System.Windows.Forms.Timer { Interval = 2500 };
        t.Tick += (_, _) => { t.Stop(); t.Dispose(); Close(); };
        t.Start();
    }
}
