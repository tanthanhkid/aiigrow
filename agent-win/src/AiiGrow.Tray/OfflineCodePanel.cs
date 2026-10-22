using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Ô «Mất mạng? Nhập mã của Ba Mẹ» trên màn chặn / màn khoá: Con gõ 6 số Ba Mẹ đọc (Ba Mẹ xem trong app),
/// khay gửi qua named pipe (<see cref="PipeCmd.MaOffline"/>), dịch vụ tự kiểm và trả câu trả lời để hiện ra.
/// </summary>
internal sealed class OfflineCodePanel : FlowLayoutPanel
{
    private readonly TextBox _box;
    private readonly Button _go;
    private readonly Label _msg;
    private bool _busy;

    /// <summary>Gọi khi mã đúng (máy đã mở) — màn chặn tự đóng.</summary>
    public event Action? Unlocked;

    public OfflineCodePanel(int width, Color? textColor = null, Color? mutedColor = null)
    {
        FlowDirection = FlowDirection.TopDown; WrapContents = false; AutoSize = true;
        Margin = new Padding(0, 8, 0, 0);
        Controls.Add(UI.Text(BlockScreenView.OfflineCodeLabel, 11f, true, textColor, width));

        var row = new FlowLayoutPanel { FlowDirection = FlowDirection.LeftToRight, WrapContents = false, AutoSize = true, Margin = new Padding(0, 4, 0, 0) };
        _box = new TextBox { MaxLength = 6, Width = 150, Font = UI.F(16f, FontStyle.Bold), TextAlign = HorizontalAlignment.Center, PlaceholderText = "6 số" };
        _box.KeyPress += (_, e) => { if (!char.IsDigit(e.KeyChar) && !char.IsControl(e.KeyChar)) e.Handled = true; };
        _box.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; await SendAsync(); } };
        _go = UI.Btn("Mở", true, 90);
        _go.Margin = new Padding(8, 0, 0, 0);
        _go.Click += async (_, _) => await SendAsync();
        row.Controls.Add(_box);
        row.Controls.Add(_go);
        Controls.Add(row);

        _msg = UI.Text("", 10.5f, false, mutedColor ?? UI.Muted, width);
        Controls.Add(_msg);
    }

    private async Task SendAsync()
    {
        if (_busy) return;
        var code = new string(_box.Text.Where(char.IsDigit).ToArray());
        if (code.Length != MaOffline.SoChuSo) { _msg.Text = "Mã có 6 số con nhé."; return; }
        _busy = true; _go.Enabled = _box.Enabled = false;
        _msg.Text = "Đang kiểm mã…";
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.MaOffline, Code = code });
        _busy = false; _go.Enabled = _box.Enabled = true;
        _msg.Text = res.Message ?? res.Error ?? (res.Ok ? "Đã mở." : "Chưa mở được.");
        if (res.Ok)
        {
            _box.Text = "";
            var t = new System.Windows.Forms.Timer { Interval = 1800 };
            t.Tick += (_, _) => { t.Stop(); t.Dispose(); Unlocked?.Invoke(); };
            t.Start();
        }
        else { _box.SelectAll(); _box.Focus(); }
    }
}
