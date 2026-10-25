using AiiGrow.ClayUi;
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
    private readonly Label _msg = UI.Text("", 10.5f, false, UI.Green, UI.Px(340));
    private readonly Button _play;
    private readonly Button _ask;
    private bool _busy;
    private bool _dong;

    /// <summary>Con bấm «Xin mở hẳn app này» (định danh app) — khay mở <see cref="XinMoForm"/>.</summary>
    public event Action<string>? XinMoApp;

    public BlockedForm(string? appId, string? appName, string? reason, bool canExchange, bool offline = false)
    {
        _appId = appId; _canExchange = canExchange;
        var view = BlockScreenView.For(appId, appName, reason, canExchange, offline);

        Text = "AiiGrow";
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        StartPosition = FormStartPosition.Manual;
        TopMost = true; ShowInTaskbar = false;
        BackColor = UI.Paper;
        bool showCode = BlockScreenView.ShowOfflineCode(offline);
        // Cỡ cửa sổ theo nội dung (chữ, nút Clay đều theo DPI) ⇒ không tràn đáy; đặt góc phải dưới khi đã biết cỡ.
        AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;
        void GocPhaiDuoi()
        {
            var wa = Screen.PrimaryScreen!.WorkingArea;
            Location = new Point(wa.Right - Width - 12, wa.Bottom - Height - 12);
        }
        Load += (_, _) => GocPhaiDuoi();
        SizeChanged += (_, _) => { if (IsHandleCreated) GocPhaiDuoi(); };   // dòng thông báo dài ra ⇒ vẫn sát góc, không tràn đáy

        var flow = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(20), UI.Px(16), UI.Px(20), UI.Px(10)), Margin = Padding.Empty,
        };
        // Dòng đầu: viên clay biển dừng (Fluent 3D) + tên app — chữ giữ nguyên.
        var dau = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = false, BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, 4) };
        dau.Controls.Add(new ClayIcon { Size = new Size(UI.Px(52), UI.Px(52)), MauVien = Clay.CanhSoft, Hinh = UI.Fluent("stop_sign"), Margin = new Padding(0, 0, 8, 0) });
        var ten = UI.Text(view.AppName + " chưa được mở", 13f, true, null, UI.Px(280));
        ten.Margin = new Padding(0, UI.Px(14), 0, 0);
        dau.Controls.Add(ten);
        flow.Controls.Add(dau);
        flow.Controls.Add(UI.Text(view.Reason, 11f, false, UI.Muted, UI.Px(340)));

        _play = UI.Btn(view.UsePointsLabel, true, UI.Px(340), "star");
        _play.Click += async (_, _) => await PlayAsync();
        FormClosed += (_, _) => _dong = true;   // đăng ký MỘT lần (không trong PlayAsync: mỗi lần thử lại thêm một handler)
        if (view.ShowUsePoints) flow.Controls.Add(_play);

        _ask = UI.Btn(view.AskParentLabel, !view.ShowUsePoints, UI.Px(340), "speech_balloon");
        _ask.Click += (_, _) =>
        {
            Hide();
            using var f = new RequestForm(_canExchange, _appId, view.AppName);
            f.ShowDialog();
            Close();
        };
        flow.Controls.Add(_ask);

        // «Xin mở hẳn app này»: lời xin cai_app với định danh thật (roblox.exe…) — Ba Mẹ đồng ý là máy chủ đặt luật cho đúng app đó (như Mac XinMoView).
        // Công cụ của Windows (cmd, taskmgr…) không mời xin mở.
        if (BlockScreenView.CanAskOpen(appId, reason))
        {
            var xinMo = UI.Btn(BlockScreenView.AskOpenLabel, false, UI.Px(340), "puzzle_piece");
            // khay mở cửa sổ «Xin mở» (một bản cho cả khay) rồi màn chặn đóng — không lồng hộp thoại trong màn chặn mà khay có thể huỷ bất cứ lúc nào
            xinMo.Click += (_, _) => { XinMoApp?.Invoke(appId!.Trim()); DongHan(); };
            flow.Controls.Add(xinMo);
        }

        // Mất mạng: «Xin phép Ba Mẹ» không tới được máy chủ ⇒ Ba Mẹ đọc mã mở offline cho Con gõ (luồng xin phép giữ nguyên).
        if (showCode)
        {
            var code = new OfflineCodePanel(UI.Px(340));
            code.Unlocked += Close;
            flow.Controls.Add(code);
        }

        var close = UI.Btn("Đóng", false, UI.Px(340));
        close.Click += (_, _) => DongHan();   // luôn đóng được, kể cả khi đang chờ máy chủ (BUG-007)
        flow.Controls.Add(close);
        CancelButton = close;                  // Esc cũng đóng
        flow.Controls.Add(_msg);
        Controls.Add(flow);
    }

    private void DongHan()
    {
        try { Close(); } catch { /* rơi xuống Dispose */ }
        if (!IsDisposed) { try { Dispose(); } catch { } }
    }

    private async Task PlayAsync()
    {
        if (_busy) return;
        _busy = true;
        _play.Enabled = _ask.Enabled = false;
        _msg.Text = "Đang hỏi máy chủ…";
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Play, AppId = _appId });
        _busy = false;
        if (_dong || IsDisposed) return;   // Con đã bấm Đóng trong lúc chờ
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
