using AiiGrow.ClayUi;
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

    /// <summary>Mã Con đang gõ dở — màn khoá dựng lại thẻ thì giữ nguyên.</summary>
    public string MaDangGo { get => _box.Text; set => _box.Text = value; }

    /// <summary>Gọi khi mã đúng (máy đã mở) — màn chặn tự đóng.</summary>
    public event Action? Unlocked;

    /// <param name="nhan">Câu mời (thiết kế 05/11: «Ba Mẹ ở cạnh con?» / «Ba Mẹ ở cạnh? Nhờ đọc mã 6 số»).</param>
    /// <param name="phu">Dòng phụ dưới câu mời (màn khoá: «Nhờ Ba Mẹ đọc mã 6 số trong app AiiGrow.»).</param>
    /// <param name="nut">Chữ nút (màn khoá: «Mở máy bằng mã của Ba Mẹ»; màn chặn: «Mở app»). Nút rộng hết ô, dưới ô nhập.</param>
    public OfflineCodePanel(int width, Color? textColor = null, Color? mutedColor = null, string? nhan = null, string? phu = null, string? nut = null, float ptNut = 11.5f)
    {
        FlowDirection = FlowDirection.TopDown; WrapContents = false; AutoSize = true;
        BackColor = Color.Transparent;   // nằm trên thẻ Clay của màn khoá / màn chặn
        Margin = new Padding(0, 8, 0, 0);
        var moi = UI.Text(nhan ?? BlockScreenView.OfflineCodeLabel, 11f, true, textColor, width);
        moi.Margin = new Padding(0, 0, 0, UI.Px(2));
        Controls.Add(moi);
        if (phu != null) Controls.Add(UI.Text(phu, 10.5f, false, mutedColor ?? UI.Muted, width));

        // Ô nhập lòng chảo Clay thân ≥44, rộng hết ô; chấm «• • • • • •» như thiết kế. Nút ở dưới, rộng hết ô.
        _box = new TextBox { MaxLength = 6, Font = UI.F(16f, FontStyle.Bold), TextAlign = HorizontalAlignment.Center, PlaceholderText = "• • • • • •", ForeColor = UI.Ink };
        _box.KeyPress += (_, e) => { if (!char.IsDigit(e.KeyChar) && !char.IsControl(e.KeyChar)) e.Handled = true; };
        _box.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; await SendAsync(); } };
        var o = ONhapClay.Boc(_box, width - VeThe.LeBong.Horizontal);
        Controls.Add(o);
        _go = UI.Btn(nut ?? "Mở", true, width);
        _go.Image = Anh3D.Icon("mo_khoa");
        _go.Font = UI.F(ptNut, FontStyle.Bold);
        _go.Height = UI.Px(48) + VeNut.LeBong.Vertical;
        _go.Margin = new Padding(0, UI.Px(4), 0, 0);
        _go.Click += async (_, _) => await SendAsync();
        Controls.Add(_go);

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
