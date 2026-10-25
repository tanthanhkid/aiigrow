using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Ứng dụng AiiGrow của Con — cửa sổ to thật (không phải popup cạnh khay): thanh bên trái (mascot Rob, tên Con, trạng thái kết nối, mục điều hướng)
/// và vùng nội dung bên phải cho 4 mục: Hôm nay (giờ còn lại, xin thêm giờ), Nhiệm vụ, Phần quà &amp; điểm, Tin nhắn.
/// Hiện trên taskbar như app thường, chỉnh được cỡ, một bản duy nhất (khay chỉ đưa lên trước). Đóng cửa sổ = ẩn (khay vẫn chạy).
/// Mọi quyết định (nhận việc, duyệt, đổi quà, cho thêm giờ) do máy chủ; form chỉ hiện và gửi qua dịch vụ (named pipe).
/// </summary>
internal sealed class AppForm : Form
{
    private static int Px(int v) => UI.Px(v);

    // ---- thanh bên
    private readonly PictureBox _mascot = new() { SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Transparent };
    private readonly Label _name = new() { AutoSize = true, ForeColor = UI.Ink, BackColor = Color.Transparent };
    private readonly Label _pill = new() { AutoSize = true };
    private readonly Dictionary<MucApp, ClayButton> _nav = new();

    // ---- vùng chính
    private readonly Panel _banner = new() { Dock = DockStyle.Top, Visible = false, BackColor = UI.ErrorSoft };
    private readonly Label _bannerHead = new() { AutoSize = false, ForeColor = UI.Error };
    private readonly Label _bannerHint = new() { AutoSize = false, ForeColor = UI.Error };
    private readonly Button _bannerBtn = new ClayButton();
    private readonly Label _title = new() { Dock = DockStyle.Top, ForeColor = UI.Ink, TextAlign = ContentAlignment.BottomLeft };
    private readonly Label _msg = new() { Dock = DockStyle.Top, TextAlign = ContentAlignment.MiddleLeft };
    private readonly FlowLayoutPanel _content = new()
    {
        Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true, BackColor = UI.Paper,
    };

    private readonly System.Windows.Forms.Timer _tick = new() { Interval = 1000 };
    private readonly System.Windows.Forms.Timer _resizeTimer = new() { Interval = 200 };
    private readonly System.Windows.Forms.Timer _auto = new() { Interval = 60_000 };

    // ---- dữ liệu
    private MucApp _muc = MucApp.HomNay;
    private TrayState _s = new();
    private DateTimeOffset _at = DateTimeOffset.Now;
    private KetNoiInfo _kn = KetNoiView.Chon(false, null);
    private HvTongQuan? _tq;
    private int? _phutChoi;   // «≈ X phút chơi» đổi được từ điểm (dịch vụ → phien/xet); null = chưa biết
    private string? _phutChoiCua;   // mục (PlayChoices[0]) mà _phutChoi thuộc về — mục đầu đổi thì số cũ bỏ đi, hỏi lại (giá theo nhóm khác nhau)
    private HvCuaHang? _ch;
    private HvTinDs? _tin;
    private HvViQua? _vi;
    private HvThanhTich? _tt;
    private HvQuyTac? _qt;
    private bool _busy;
    /// <summary>Lần tải tổng quan học viên gần nhất lỗi (null = chưa lỗi / đã tải được).</summary>
    private string? _loiTai;
    private int _cw, _tw, _lastW;
    private string _sig = "";
    private Label? _bigLbl, _capLbl;
    private Control? _dungCard;      // thẻ «Đã dùng hôm nay» — thay tại chỗ khi số phút đổi (không vẽ lại cả trang mỗi phút)
    private string _dungSig = "";

    /// <summary>Con bấm «Xin mở trang hoặc app» (khay mở cửa sổ dùng chung).</summary>
    public event Action? XinMoClicked;
    /// <summary>Con bấm «Thử kết nối lại» (khay gọi dịch vụ đồng bộ ngay).</summary>
    public event Action? RetryClicked;
    /// <summary>Con đã mở mục Tin nhắn (khay xoá số tin mới).</summary>
    public event Action? TinDaXem;

    /// <summary>Số tin mới chưa đọc (khay đặt).</summary>
    public int TinMoi { get; set; }

    public AppForm()
    {

        AiiGrow.ClayUi.Clay.KhongMnemonic(this);   // «&» trong chữ (Phần quà & điểm) hiện đúng, không thành phím tắt
        Text = "AiiGrow";
        Icon = UI.AppIcon();
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.Sizable;
        MinimizeBox = true; MaximizeBox = true; ShowInTaskbar = true;
        BackColor = UI.Paper;
        Padding = new Padding(Px(10), Px(10), 0, Px(4));   // thanh bên là phiến Clay nổi, chừa chỗ cho bóng
        ClientSize = new Size(Px(1000), Px(680));
        MinimumSize = new Size(Px(880), Px(640));
        // Không vượt quá màn hình nhỏ (laptop 1366×768).
        var wa = Screen.PrimaryScreen!.WorkingArea;
        if (Width > wa.Width || Height > wa.Height) Size = new Size(Math.Min(Width, wa.Width), Math.Min(Height, wa.Height));

        // Vùng chính (thêm trước thanh bên để Dock.Fill chiếm phần còn lại)
        var main = new Panel { Dock = DockStyle.Fill, BackColor = UI.Paper };
        _title.Font = UI.F(22f, FontStyle.Bold);
        _title.Height = Px(78);
        _title.Padding = new Padding(Px(28), 0, 0, Px(6));
        _msg.Font = UI.F(12f, FontStyle.Bold);
        _msg.Height = Px(30);
        _msg.Padding = new Padding(Px(28), 0, 0, 0);
        _content.Padding = new Padding(Px(28), Px(8), Px(28), Px(16));
        BuildBanner();
        main.Controls.Add(_content);
        main.Controls.Add(_msg);
        main.Controls.Add(_title);
        main.Controls.Add(_banner);
        Controls.Add(main);
        Controls.Add(BuildSide());

        _tick.Tick += (_, _) => TickClock();
        _tick.Start();
        _resizeTimer.Tick += (_, _) => { _resizeTimer.Stop(); if (CalcWidth() != _lastW) Render(); };
        Resize += (_, _) => { _resizeTimer.Stop(); _resizeTimer.Start(); };
        _auto.Tick += async (_, _) => { if (Visible && WindowState != FormWindowState.Minimized) await RefreshAsync(); };
        _auto.Start();

        // Đóng cửa sổ chỉ ẩn đi (khay vẫn chạy); mở lại thì tải mới.
        FormClosing += (_, e) => { if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); } };
        VisibleChanged += async (_, _) => { if (Visible) await RefreshAsync(); };

        Render();
        ApplyKetNoiUi();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _tick.Dispose(); _resizeTimer.Dispose(); _auto.Dispose(); }
        base.Dispose(disposing);
    }

    // =========================================================== bố cục

    private Control BuildSide()
    {
        // Thanh bên = phiến đất sét sáng nổi (Clay gương); mục đang chọn là lòng chảo ấn lõm ngọc nhạt như thanh tab của app.
        var side = new ClayCard
        {
            Dock = DockStyle.Left, Width = Px(272) + VeThe.LeBong.Horizontal, BoGoc = Px(32), BackColor = UI.Card,
            Padding = VeThe.Pad(Px(4), Px(4), Px(4), Px(4)),
        };
        var inner = Px(272) - Px(32);

        var foot = new Label
        {
            Dock = DockStyle.Bottom, Height = Px(64), ForeColor = UI.Muted, BackColor = Color.Transparent,
            Font = UI.F(10f), Text = "Máy này do Ba Mẹ quản lý bằng AiiGrow", Padding = new Padding(Px(12), Px(8), Px(12), 0),
        };

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, BackColor = Color.Transparent,
            Padding = new Padding(Px(12), Px(12), Px(12), 0), AutoScroll = false,
        };
        _mascot.Size = new Size(inner, Px(160));   // 5 mục điều hướng vẫn vừa thanh bên ở chiều cao tối thiểu
        _mascot.Margin = new Padding(0, 0, 0, Px(6));
        _name.Font = UI.F(17f, FontStyle.Bold);
        _name.MaximumSize = new Size(inner, 0);
        _name.Margin = new Padding(0, 0, 0, Px(8));
        _pill.Font = UI.F(10.5f, FontStyle.Bold);
        _pill.MaximumSize = new Size(inner, 0);
        _pill.Padding = new Padding(Px(10), Px(6), Px(10), Px(6));
        _pill.Margin = new Padding(0, 0, 0, Px(18));
        flow.Controls.Add(_mascot);
        flow.Controls.Add(_name);
        flow.Controls.Add(_pill);

        foreach (var (muc, text, icon) in new[] { (MucApp.HomNay, "Hôm nay", "alarm_clock"), (MucApp.NhiemVu, "Nhiệm vụ", "memo"), (MucApp.PhanQua, "Phần quà & điểm", "wrapped_gift"), (MucApp.TinNhan, "Tin nhắn", "speech_balloon"), (MucApp.ViQua, "Ví quà & huy hiệu", "ticket") })
        {
            var b = new ClayButton
            {
                Text = text, Width = inner, Height = Px(56), TextAlign = ContentAlignment.MiddleLeft, Image = UI.Fluent(icon),
                Font = UI.F(13f, FontStyle.Bold), UseMnemonic = false,
                Padding = new Padding(Px(4), 0, 0, 0), Margin = new Padding(0, 0, 0, Px(4)), Tag = text, BoGoc = Px(22),
            };
            var m = muc;
            b.Click += (_, _) => Select(m);
            _nav[muc] = b;
            flow.Controls.Add(b);
        }
        side.Controls.Add(flow);
        side.Controls.Add(foot);
        UpdateNav();
        return side;
    }

    private void BuildBanner()
    {
        _banner.Height = Px(84);
        _bannerBtn.Text = "Thử kết nối lại";
        _bannerBtn.Dock = DockStyle.Right;
        _bannerBtn.Width = Px(210);
        _bannerBtn.FlatStyle = FlatStyle.Flat;
        _bannerBtn.Font = UI.F(12f, FontStyle.Bold);
        _bannerBtn.BackColor = UI.Error; _bannerBtn.ForeColor = Color.White; _bannerBtn.UseVisualStyleBackColor = false;
        _bannerBtn.FlatAppearance.BorderSize = 0;
        _bannerBtn.Cursor = Cursors.Hand;
        _bannerBtn.Click += (_, _) => { _bannerBtn.Enabled = false; RetryClicked?.Invoke(); };
        _bannerHead.Font = UI.F(13f, FontStyle.Bold);
        _bannerHead.Dock = DockStyle.Top; _bannerHead.Height = Px(34);
        _bannerHead.TextAlign = ContentAlignment.BottomLeft;
        _bannerHint.Font = UI.F(10.5f);
        _bannerHint.Dock = DockStyle.Fill;
        var text = new Panel { Dock = DockStyle.Fill, Padding = new Padding(Px(28), 0, Px(12), 0), BackColor = UI.ErrorSoft };
        text.Controls.Add(_bannerHint);
        text.Controls.Add(_bannerHead);
        _banner.Controls.Add(text);
        _banner.Controls.Add(_bannerBtn);
    }

    private int CalcWidth()
        => Math.Clamp(_content.ClientSize.Width - _content.Padding.Horizontal - SystemInformation.VerticalScrollBarWidth, Px(480), Px(860));

    private void ComputeWidths()
    {
        _cw = _lastW = CalcWidth();
        _tw = _cw - LeNgangThe * 2 - Px(6) - VeThe.LeBong.Horizontal;   // bề rộng chữ trong thẻ, theo đúng lề ngang của Card()
    }

    // =========================================================== nạp trạng thái từ khay

    /// <summary>Khay đưa trạng thái dịch vụ + kết quả chọn kết nối (mỗi ~3 giây). Chỉ vẽ lại nội dung khi có thay đổi đáng kể.</summary>
    public void Apply(TrayState? s, DateTimeOffset receivedAt, KetNoiInfo kn)
    {
        if (s != null) { _s = s; _at = receivedAt; }
        _kn = kn;
        var dau = _s.PlayChoices.FirstOrDefault();
        if (_phutChoiCua != null && !string.Equals(_phutChoiCua, dau, StringComparison.OrdinalIgnoreCase))
        {
            _phutChoi = null; _phutChoiCua = null;
            if (dau != null && Visible) _ = LamMoiPhutChoiAsync();
        }
        ApplyKetNoiUi();
        var sig = $"{kn.Loai}|{kn.Dong}|{_phutChoi}|{string.Join(',', _s.PlayChoices)}|{_s.Paired}|{_s.MoCoi}|{_s.Locked}|{_s.CanExchangePoints}|{_s.Mode}|{_s.ChildName}|{_s.MoOfflineDen}|{TinMoi}|{_s.DungTheoApp.Count > 0}";
        if (sig != _sig) { _sig = sig; Render(); }
        else CapNhatDungHomNay();
    }

    private void ApplyKetNoiUi()
    {
        _pill.Text = "● " + _kn.Dong;
        _pill.BackColor = _kn.DungIconKetNoi ? UI.GreenSoft : UI.ErrorSoft;
        _pill.ForeColor = _kn.DungIconKetNoi ? UI.GreenDark : UI.Error;
        _banner.Visible = _kn.Bao;
        _bannerHead.Text = _kn.Dong;
        _bannerHint.Text = _kn.Huong;
        _bannerBtn.Visible = _kn.Loai != KetNoi.ChuaGhep;
        _bannerBtn.Enabled = true;
        var ten = !string.IsNullOrWhiteSpace(_tq?.Con.Ten) ? _tq!.Con.Ten : _s.ChildName;
        _name.Text = string.IsNullOrWhiteSpace(ten) ? "AiiGrow" : ten;
        SetMascot();
    }

    private bool XongHet() => _tq is { NhiemVu.Count: > 0 } t && HocVienView.SoViecMo(t) == 0;

    private void SetMascot() => _mascot.Image = UI.Mascot(MascotView.Chon(_muc, _kn.Loai, XongHet()));

    private void UpdateNav()
    {
        foreach (var (muc, b) in _nav)
        {
            var sel = muc == _muc;
            var n = muc switch { MucApp.NhiemVu when _tq != null => HocVienView.SoViecMo(_tq), MucApp.TinNhan => TinMoi, _ => 0 };
            b.Text = (string)b.Tag! + (n > 0 ? $"   ({n})" : "");
            b.Kieu = sel ? KieuClay.Lom : KieuClay.Phang;
            b.BackColor = sel ? UI.GreenSoft : UI.Card;
            b.ForeColor = sel ? UI.GreenDark : UI.Ink;
        }
    }

    // =========================================================== mở / chuyển mục

    /// <summary>Mở app to (nếu đang ẩn/thu nhỏ) và đưa lên trước; <paramref name="muc"/> khác null thì chuyển tới mục đó. <paramref name="noiLen"/> = khay tự bật: Windows chặn tiến trình nền giành tiêu điểm
    /// (Activate chỉ nháy nút taskbar) ⇒ bật TopMost rồi tắt ngay để cửa sổ nằm trên cùng mà không ghim mãi.</summary>
    public void ShowFront(MucApp? muc = null, bool noiLen = false)
    {
        if (muc != null) Select(muc.Value);
        bool moMoi = !Visible;
        if (!Visible) Show(); else _ = RefreshAsync();
        if (moMoi)
        {
            // Mở mới: tiêu điểm vào mục điều hướng (không phải nút đầu trong vùng nội dung — WinForms cuộn tới control có tiêu điểm ⇒ ở 150% app mở
            // đã cuộn xuống, đồng hồ to bị cắt) rồi về đầu trang.
            if (_nav.TryGetValue(_muc, out var nut)) ActiveControl = nut;
            _content.AutoScrollPosition = Point.Empty;
        }
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
        if (noiLen) { TopMost = true; TopMost = false; }
        BringToFront();
        Activate();
    }

    private void Select(MucApp muc)
    {
        _muc = muc;
        if (muc == MucApp.TinNhan && TinMoi > 0) { TinMoi = 0; TinDaXem?.Invoke(); }
        _sig = "";
        Render();
        _content.AutoScrollPosition = Point.Empty;
    }

    private void Say(string s, bool error)
    {
        _msg.ForeColor = error ? UI.Error : UI.Green;
        _msg.Text = s;
    }

    public async Task RefreshAsync()
    {
        if (_busy) return;
        _busy = true;
        try
        {
            Say("Đang tải…", false);
            var (tq, loi) = await HvApi.GetAsync<HvTongQuan>("hoc-vien/tong-quan");
            if (tq == null)
            {
                _loiTai = string.IsNullOrWhiteSpace(loi) ? "Chưa tải được. Con thử lại nhé." : loi;
                Say(_loiTai, true);
                Render();
                return;
            }
            _tq = tq;
            _loiTai = null;
            Render();
            ApplyKetNoiUi();
            Say("", false);
            var phut = LamMoiPhutChoiAsync();   // song song với cửa hàng / tin, không bắt hai mục đó chờ phien/xet

            var (ch, _) = await HvApi.GetAsync<HvCuaHang>("hoc-vien/cua-hang");
            _ch = ch;
            if (_muc == MucApp.ViQua || _vi == null)   // mục Ví quà: ba nguồn chỉ đọc (máy chủ cũ không có đường ⇒ null, mục hiện «chưa tải được»)
            {
                var (vi, _) = await HvApi.GetAsync<HvViQua>("hoc-vien/vi-qua");
                var (tt, _) = await HvApi.GetAsync<HvThanhTich>("hoc-vien/thanh-tich");
                var (qt, _) = await HvApi.GetAsync<HvQuyTac>("hoc-vien/quy-tac");
                if (vi != null) _vi = vi;
                if (tt != null) _tt = tt;
                if (qt != null) _qt = qt;
            }
            var (tin, _) = await HvApi.GetAsync<HvTinDs>("hoc-vien/tin");
            if (tin != null) _tin = tin;
            await phut;
            Render();
        }
        finally { _busy = false; }
    }

    private async Task LamMoiPhutChoiAsync()
    {
        if (_s.PlayChoices.Count == 0) { _phutChoi = null; _phutChoiCua = null; return; }
        var muc = _s.PlayChoices[0];
        try
        {
            var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.PlayInfo, AppId = muc });
            var moi = r.Ok ? r.PlayMinutes : null;
            if (IsDisposed || !string.Equals(_s.PlayChoices.FirstOrDefault(), muc, StringComparison.OrdinalIgnoreCase)) return;   // mục đầu đã đổi giữa chừng
            _phutChoiCua = muc;
            if (moi != _phutChoi) { _phutChoi = moi; Render(); }
        }
        catch { /* không có số phút thì chỉ hiện điểm */ }
    }

    private void MoChoiBangDiem()
    {
        using var f = new ChoiBangDiemForm(_s.PlayChoices);
        f.ShowDialog(this);
        _ = LamMoiPhutChoiAsync();
    }

    private void TickClock()
    {
        if (_bigLbl == null || !Visible) return;
        var d = TrayView.Describe(_s, _at, DateTimeOffset.Now);
        _bigLbl.Text = d.Big;
        if (_capLbl != null) { _capLbl.Text = d.Caption; _capLbl.Visible = d.Caption.Length > 0; }
    }

    // =========================================================== vẽ nội dung

    private void Render()
    {
        ComputeWidths();
        _content.SuspendLayout();
        foreach (var c in _content.Controls.Cast<Control>().ToList()) { _content.Controls.Remove(c); c.Dispose(); }
        _bigLbl = _capLbl = null;
        _dungCard = null;
        switch (_muc)
        {
            case MucApp.HomNay: _title.Text = "Hôm nay"; RenderHomNay(); break;
            case MucApp.NhiemVu: _title.Text = "Nhiệm vụ của con"; RenderViec(); break;
            case MucApp.PhanQua: _title.Text = "Phần quà & điểm"; RenderQua(); break;
            case MucApp.ViQua: _title.Text = "Ví quà & huy hiệu"; RenderViQua(); break;
            default: _title.Text = "Tin nhắn"; RenderTinNhan(); break;
        }
        _content.ResumeLayout(true);
        UpdateNav();
        SetMascot();
    }

    private Label T(string text, float pt = 12f, bool bold = false, Color? color = null, bool wide = false)
    {
        var l = UI.Text(text, pt, bold, color, wide ? _cw : _tw);
        return l;
    }

    private Button Btn(string text, bool primary, int width = 260, string? icon = null)
    {
        var b = UI.Btn(text, primary, Px(width), icon);
        b.Height = Px(56);   // thân 50 + lề bóng
        b.Font = UI.F(12f, FontStyle.Bold);
        b.UseMnemonic = false;
        b.Margin = new Padding(0, 0, Px(10), Px(8));
        return b;
    }

    /// <summary>Lề ngang trong thẻ Clay (≥16) — dùng chung cho Card() và bề rộng chữ _tw.</summary>
    private static int LeNgangThe => Px(18);

    /// <summary>Thẻ Clay: bo 28, bóng kép, dải men sáng mép trên (lề bóng nằm trong Padding).</summary>
    private FlowLayoutPanel Card(Color? bg = null) => new ClayFlow
    {
        AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
        Width = _cw, MinimumSize = new Size(_cw, 0), MaximumSize = new Size(_cw, 0),
        BackColor = bg ?? UI.Card, BoGoc = Px(28),
        Padding = VeThe.Pad(LeNgangThe, Px(16), LeNgangThe, Px(10)), Margin = new Padding(0, 0, 0, Px(4)),   // lề trong ≥16 (đáy: 10 + lề dưới 8 của dòng cuối)
    };

    private FlowLayoutPanel Row(int width) => new()
    {
        AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = true, Width = width, MaximumSize = new Size(width, 0),
        Margin = new Padding(0), BackColor = Color.Transparent,
    };

    private void OpenRequest()
    {
        using var f = new RequestForm(_s.CanExchangePoints);
        f.ShowDialog(this);
    }

    /// <summary>«Xin mở trang hoặc app»: khay giữ MỘT cửa sổ cho cả menu khay / app to / màn chặn (không gửi trùng lời xin).</summary>
    private void OpenXinMo() => XinMoClicked?.Invoke();

    // ---------------------------------------------------------------- Hôm nay

    private void RenderHomNay()
    {
        var ten = !string.IsNullOrWhiteSpace(_tq?.Con.Ten) ? _tq!.Con.Ten : _s.ChildName;
        _content.Controls.Add(T(string.IsNullOrWhiteSpace(ten) ? "Xin chào!" : $"Chào {ten}!", 20f, true, null, true));

        if (_kn.Loai is KetNoi.DichVuKhongChay or KetNoi.ChuaGhep)
        {
            var c = Card(UI.ErrorSoft);
            c.Controls.Add(T(_kn.Dong, 15f, true, UI.Error));
            c.Controls.Add(T(_kn.Huong, 12f, false, UI.Error));
            _content.Controls.Add(c);
        }
        else
        {
            var d = TrayView.Describe(_s, _at, DateTimeOffset.Now);
            var c = Card();
            c.Controls.Add(T("Thời gian dùng máy còn lại", 12.5f, false, UI.Muted));
            _bigLbl = T(d.Big, 44f, true, UI.Green);
            c.Controls.Add(_bigLbl);
            _capLbl = T(d.Caption, 12.5f, false, UI.Muted);
            _capLbl.Visible = d.Caption.Length > 0;
            c.Controls.Add(_capLbl);
            c.Controls.Add(T("Chế độ: " + TrayView.ModeLabel(_s.Mode), 12f, true, UI.GreenDark));
            if (_s.MoOfflineDen is { } den)
                c.Controls.Add(T($"Đang mở tạm bằng mã của Ba Mẹ, đến {den.ToLocalTime():HH:mm}.", 12f, false, UI.Warn));
            _content.Controls.Add(c);

            var row = Row(_cw);
            var ask = Btn("Xin thêm thời gian", true, 270, "hourglass_not_done");
            ask.Click += (_, _) => OpenRequest();
            row.Controls.Add(ask);
            if (_s.CanExchangePoints)   // chỉ cờ; không hiện số điểm ở nút này
            {
                var ex = Btn("Đổi điểm lấy thời gian", false, 270, "star");
                ex.Click += (_, _) => OpenRequest();
                row.Controls.Add(ex);
            }
            var xinMo = Btn("Xin mở trang hoặc app", false, 270, "globe_with_meridians");
            xinMo.Click += (_, _) => OpenXinMo();
            row.Controls.Add(xinMo);
            _content.Controls.Add(row);

            // BUG-006: luôn có nút «Chơi bằng điểm» khi đã ghép gia đình, kèm số phút đổi được — trừ khi Ba Mẹ tắt đổi điểm hoặc khoá máy (cùng luật màn chặn)
            if (_s.Paired && !_s.MoCoi && BlockScreenView.CanUsePoints(_s.Locked ? _s.LockReason : null, _s.CanExchangePoints, offline: _s.Offline))
            {
                var pr = Row(_cw);
                var choi = Btn("Chơi bằng điểm", false, 270, "video_game");
                choi.Click += (_, _) => MoChoiBangDiem();
                pr.Controls.Add(choi);
                _content.Controls.Add(pr);
                if (_phutChoi is > 0)
                    // số phút tính theo MỤC (máy chủ định giá theo nhóm) ⇒ nói rõ là của mục nào
                    _content.Controls.Add(T($"Điểm hiện có đổi được khoảng {_phutChoi} phút chơi {TrayView.FriendlyAppName(_s.PlayChoices.FirstOrDefault(), null)}.", 12f, false, UI.Muted, true));
            }

            // Đã dùng hôm nay theo app (dịch vụ đếm theo app tiền cảnh — cùng số gửi máy chủ). Chưa có app nào ≥1 phút thì không hiện thẻ.
            if (_s.DungTheoApp.Count > 0) { _dungCard = DungHomNayCard(); _content.Controls.Add(_dungCard); }

            // #70 §1: Ba Mẹ cần máy ⇒ chuyển người dùng (khoá phiên), không đăng xuất, không trừ điểm.
            var bm = Card();
            bm.Controls.Add(T("Ba Mẹ cần máy? Bấm nút này hoặc Win+L", 12f, false, UI.Muted));
            var nutBm = Btn("Ba Mẹ dùng máy", false, 270, "key");
            nutBm.Click += (_, _) => UI.NhuongMayChoBaMe();
            bm.Controls.Add(nutBm);
            _content.Controls.Add(bm);
        }

        if (_s.Paired && !_s.MoCoi)
        {
            var c = Card();
            c.Controls.Add(T("Việc của con", 14f, true));
            if (_tq == null && _loiTai != null)
            {
                c.Controls.Add(T(_loiTai, 12f, false, UI.Error));
                c.Controls.Add(NutThuLai());
            }
            else if (_tq == null) c.Controls.Add(T("Đang tải…", 12f, false, UI.Muted));
            else
            {
                var n = HocVienView.SoViecMo(_tq);
                c.Controls.Add(T(n > 0 ? $"Con có {n} việc đang chờ. Làm xong để tích điểm nhé!" : "Hôm nay con đã làm hết việc rồi. Giỏi lắm!", 12.5f, false));
                c.Controls.Add(T($"{_tq.SoDu} điểm  ·  {HocVienView.CapText(_tq.CapDo)}", 12.5f, true, UI.PointInk));
            }
            var row = Row(_tw);
            var go = Btn("Xem nhiệm vụ", false, 210, "memo");
            go.Height = Px(50);
            go.Click += (_, _) => Select(MucApp.NhiemVu);
            row.Controls.Add(go);
            if (TinMoi > 0)
            {
                var tin = Btn($"Đọc tin nhắn ({TinMoi})", false, 210, "speech_balloon");
                tin.Height = Px(50);
                tin.Click += (_, _) => Select(MucApp.TinNhan);
                row.Controls.Add(tin);
            }
            c.Controls.Add(row);
            _content.Controls.Add(c);
        }
    }

    private static string DungSig(TrayState s) => string.Join(',', s.DungTheoApp.Select(x => x.AppId + ":" + x.Phut));

    /// <summary>Số phút theo app đổi (mỗi phút) ⇒ chỉ thay thẻ «Đã dùng hôm nay» tại đúng vị trí, giữ cuộn + tiêu điểm của trang.</summary>
    private void CapNhatDungHomNay()
    {
        if (_dungCard == null || _dungCard.IsDisposed || _muc != MucApp.HomNay || DungSig(_s) == _dungSig) return;
        var i = _content.Controls.GetChildIndex(_dungCard);
        var moi = DungHomNayCard();
        _content.SuspendLayout();
        _content.Controls.Add(moi);
        _content.Controls.SetChildIndex(moi, i);
        _content.Controls.Remove(_dungCard);
        _dungCard.Dispose();
        _dungCard = moi;
        _content.ResumeLayout(true);
    }

    private Control DungHomNayCard()
    {
        _dungSig = DungSig(_s);
        var c = Card();
        var dau = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = false, BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, Px(4)) };
        dau.Controls.Add(new ClayIcon { Size = new Size(Px(44), Px(44)), MauVien = UI.GreenSoft, Hinh = UI.Fluent("bar_chart"), Margin = new Padding(0, 0, Px(10), 0) });
        var tieu = T($"Đã dùng hôm nay · {DungAppView.ThoiLuong(DungAppView.Tong(_s.DungTheoApp))}", 14f, true);
        tieu.MaximumSize = new Size(_tw - Px(60), 0);
        tieu.Margin = new Padding(0, Px(10), 0, 0);
        dau.Controls.Add(tieu);
        c.Controls.Add(dau);
        foreach (var x in _s.DungTheoApp)
        {
            // tên app dài ⇒ cắt «…» trong một dòng (không co chữ), số phút luôn đủ ở bên phải
            var dong = new TableLayoutPanel { ColumnCount = 2, RowCount = 1, Width = _tw, Height = Px(30), BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, Px(2)) };
            dong.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            dong.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            dong.Controls.Add(new Label { Text = x.Ten, AutoSize = false, AutoEllipsis = true, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = UI.F(12f), ForeColor = UI.Ink, BackColor = Color.Transparent, UseMnemonic = false }, 0, 0);
            dong.Controls.Add(new Label { Text = DungAppView.ThoiLuong(x.Phut), AutoSize = true, Anchor = AnchorStyles.Right, Font = UI.F(12f, FontStyle.Bold), ForeColor = UI.GreenDark, BackColor = Color.Transparent, Margin = new Padding(Px(8), Px(5), 0, 0) }, 1, 0);
            c.Controls.Add(dong);
        }
        return c;
    }

    // ---------------------------------------------------------------- Nhiệm vụ

    private void RenderViec()
    {
        if (VeChuaCoDuLieu("Máy chưa ghép với Ba Mẹ nên chưa có nhiệm vụ.", "Đang tải nhiệm vụ…")) return;
        var ds = HocVienView.SapXep(_tq.NhiemVu);
        if (ds.Count == 0) _content.Controls.Add(T("Chưa có nhiệm vụ nào. Khi Ba Mẹ giao việc, con sẽ thấy ở đây và nhận thông báo.", 12.5f, false, UI.Muted, true));
        foreach (var v in ds) _content.Controls.Add(ViecCard(v));

        var cho = _tq.Gan.Where(g => g.TrangThai is "cho_duyet" or "tu_choi" or "duoc_duyet").Take(8).ToList();
        if (cho.Count > 0)
        {
            _content.Controls.Add(T("Gần đây", 15f, true, null, true));
            foreach (var g in cho) _content.Controls.Add(LuotCard(g));
        }
    }

    private Control ViecCard(HvNhiemVu v)
    {
        var card = Card();
        card.Controls.Add(T($"{v.Ten}   ·   +{v.Diem} điểm", 14f, true));
        if (!string.IsNullOrWhiteSpace(v.MoTa)) card.Controls.Add(T(v.MoTa, 12f, false, UI.Muted));
        var han = HocVienView.HanText(v.Han, DateTimeOffset.Now);
        var dong = new List<string> { HocVienView.TrangThaiText(v.TrangThai) };
        if (han != null) dong.Add(han);
        if (v.DangCho > 0) dong.Add($"{v.DangCho} bài chờ duyệt");
        if (v.GiaoRieng) dong.Add("Ba Mẹ giao riêng");
        card.Controls.Add(T(string.Join("  ·  ", dong), 11.5f, false, v.TrangThai == "can_bo_sung" ? UI.Warn : UI.Muted));
        if (v.TrangThai == "can_bo_sung" && !string.IsNullOrWhiteSpace(v.LyDo))
            card.Controls.Add(T("Ba Mẹ nhắn: " + v.LyDo, 12f, true, UI.Warn));
        if (v.PhutToiThieu > 0 && v.TrangThai is "san_sang" or "dang_lam")
            card.Controls.Add(T($"Làm ít nhất {v.PhutToiThieu} phút rồi mới nộp được.", 11.5f, false, UI.Muted));
        var nut = HocVienView.NutText(v);
        if (nut != null)
        {
            var b = Btn(nut, v.TrangThai == "san_sang", 220);
            b.Height = Px(50);
            b.Click += async (_, _) => await ViecAsync(v, b);
            card.Controls.Add(b);
        }
        return card;
    }

    private Control LuotCard(HvLuot g)
    {
        var card = Card();
        var diem = g.TrangThai == "duoc_duyet" && g.Diem.HasValue ? $"   ·   +{g.Diem} điểm" : "";
        card.Controls.Add(T(g.Ten + diem, 13f, true));
        var s = HocVienView.TrangThaiText(g.TrangThai);
        if (!string.IsNullOrWhiteSpace(g.LyDo)) s += " · " + g.LyDo;
        card.Controls.Add(T(s, 11.5f, false, g.TrangThai == "tu_choi" ? UI.Error : UI.Muted));
        if (!string.IsNullOrWhiteSpace(g.LoiKhen)) card.Controls.Add(T("Ba Mẹ: " + g.LoiKhen, 12f, false, UI.GreenDark));
        return card;
    }

    private async Task ViecAsync(HvNhiemVu v, Button b)
    {
        if (_busy) return;
        if (v.TrangThai == "san_sang")
        {
            b.Enabled = false;
            _busy = true;
            Say("Đang nhận việc…", false);
            var (kq, loi) = await HvApi.PostAsync<HvBatDauKq>($"hoc-vien/nhiem-vu/{v.Id}/bat-dau");
            _busy = false;
            if (kq == null) { Say(loi ?? "Chưa nhận được việc. Con thử lại nhé.", true); b.Enabled = true; return; }
            await RefreshAsync();
            Say($"Con đã nhận «{v.Ten}». Làm xong thì bấm Nộp bài nhé!", false);
            return;
        }
        if (string.IsNullOrEmpty(v.Luot)) { Say("Con bấm Nhận việc trước nhé.", true); return; }
        using var f = new NopBaiForm(v);
        if (f.ShowDialog(this) == DialogResult.OK)
        {
            await RefreshAsync();
            if (f.Ket != null) Say(HocVienView.NopThongBao(f.Ket), false);
        }
    }

    // ---------------------------------------------------------------- Phần quà & điểm

    private void RenderQua()
    {
        if (VeChuaCoDuLieu("Máy chưa ghép với Ba Mẹ nên chưa có phần quà.", "Đang tải…")) return;
        // Điểm: màu vàng CHỈ dành cho điểm (mau.ts) — chữ diemInk trên nền diemSoft 7,4:1.
        var pts = Card(UI.PointSoft);
        pts.Controls.Add(new ClayIcon { Size = new Size(Px(60), Px(60)), MauVien = UI.Card, Hinh = UI.Fluent("star"), Margin = new Padding(0, 0, 0, Px(2)) });
        pts.Controls.Add(T("Điểm của con", 12.5f, false, UI.PointInk));
        pts.Controls.Add(T($"{_tq.SoDu} điểm", 36f, true, UI.PointInk));
        pts.Controls.Add(T(HocVienView.CapText(_tq.CapDo) + (_tq.DiemChoDuyet > 0 ? $" · {_tq.DiemChoDuyet} điểm đang chờ Ba Mẹ duyệt" : ""), 12f, false, UI.PointInk));
        _content.Controls.Add(pts);

        foreach (var p in _tq.PhieuCho)
        {
            var c = Card();
            c.Controls.Add(T($"{p.Ten}   ·   {p.Diem} điểm", 13f, true));
            c.Controls.Add(T("Đã đổi, đang chờ Ba Mẹ trao quà cho con.", 11.5f, false, UI.Muted));
            _content.Controls.Add(c);
        }
        if (_ch == null || _ch.Qua.Count == 0)
            _content.Controls.Add(T(_ch == null ? "Chưa tải được danh sách quà." : "Ba Mẹ chưa đặt phần quà nào. Con cứ làm nhiệm vụ để tích điểm nhé!", 12.5f, false, UI.Muted, true));
        else
        {
            _content.Controls.Add(T("Quà con có thể đổi", 15f, true, null, true));
            foreach (var q in _ch.Qua) _content.Controls.Add(QuaCard(q));
        }
    }

    private Control QuaCard(HvQua q)
    {
        var card = Card();
        card.Controls.Add(T($"{q.Ten}   ·   {q.Diem} điểm", 14f, true));
        var s = HocVienView.QuaTrangThai(q) + (q.ChiCuoiTuan ? " · chỉ đổi vào cuối tuần" : "");
        card.Controls.Add(T(s, 11.5f, true, q.Du ? UI.GreenDark : UI.Muted));
        var b = Btn("Đổi quà", q.Du, 220, "wrapped_gift");
        b.Height = Px(50);
        b.Enabled = q.Du;
        b.Click += async (_, _) => await DoiAsync(q, b);
        card.Controls.Add(b);
        return card;
    }

    private async Task DoiAsync(HvQua q, Button b)
    {
        if (_busy) return;
        if (MessageBox.Show(this, $"Đổi «{q.Ten}» với {q.Diem} điểm nhé?", "AiiGrow", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        b.Enabled = false;
        _busy = true;
        Say("Đang đổi quà…", false);
        var (kq, loi) = await HvApi.PostAsync<HvDoiKq>($"hoc-vien/doi/{q.Id}");
        _busy = false;
        if (kq == null) { Say(loi ?? "Chưa đổi được. Con thử lại nhé.", true); b.Enabled = true; return; }
        await RefreshAsync();
        Say(HocVienView.DoiThongBao(kq, q.Ten), false);
    }

    // ---------------------------------------------------------------- Ví quà · huy hiệu · quy tắc (như màn Con web /tre)

    private void RenderViQua()
    {
        if (VeChuaCoDuLieu("Máy chưa ghép với Ba Mẹ nên chưa có ví quà.", "Đang tải…")) return;
        var now = DateTimeOffset.Now;

        // --- Ví quà
        _content.Controls.Add(T("Ví quà", 15f, true, null, true));
        if (_vi == null) _content.Controls.Add(T("Chưa tải được ví quà. Con thử lại sau nhé.", 12.5f, false, UI.Muted, true));
        else
        {
            var dung = ViQuaView.DungDuoc(_vi, now);
            foreach (var v in dung) _content.Controls.Add(PhieuQrCard(v));
            if (dung.Count > 0) _content.Controls.Add(T("Đưa mã này cho nhân viên AiiCafe quét. Mỗi phiếu chỉ dùng một lần.", 11.5f, false, UI.Muted, true));
            var cu = _vi.Voucher.Select(v => (v, chu: ViQuaView.TrangThaiCu(v))).Where(x => x.chu != null).Take(10).ToList();
            if (_vi.Phieu.Count > 0 || cu.Count > 0)
            {
                var c = Card();
                foreach (var p in _vi.Phieu) c.Controls.Add(T($"{p.Ten}  ·  {ViQuaView.PhieuCho(p)}", 12f, true));
                foreach (var (v, chu) in cu) c.Controls.Add(T($"Phiếu quà AiiCafe {ViQuaView.Tien(v.MenhGia)}  ·  {chu}", 12f, false, UI.Muted));
                _content.Controls.Add(c);
            }
            if (dung.Count == 0 && _vi.Phieu.Count == 0 && cu.Count == 0)
            {
                var c = Card();
                c.Controls.Add(T("Ví quà còn trống", 14f, true));
                c.Controls.Add(T("Đổi điểm ở mục Phần quà & điểm là quà hiện ở đây.", 12f, false, UI.Muted));
                var go = Btn("Xem phần quà", false, 220, "wrapped_gift");
                go.Height = Px(50);
                go.Click += (_, _) => Select(MucApp.PhanQua);
                c.Controls.Add(go);
                _content.Controls.Add(c);
            }
        }

        // --- Huy hiệu & cấp
        _content.Controls.Add(T("Huy hiệu & cấp", 15f, true, null, true));
        if (_tt == null) _content.Controls.Add(T("Chưa tải được huy hiệu.", 12.5f, false, UI.Muted, true));
        else
        {
            var cap = Card(UI.PointSoft);
            cap.Controls.Add(T($"Cấp {_tt.CapDo.Cap} · {ViQuaView.TenCap(_tt.CapDo.Cap)}", 16f, true, UI.PointInk));
            cap.Controls.Add(T($"Còn {_tt.CapDo.ConThieu} điểm nữa lên cấp {_tt.CapDo.Cap + 1} «{ViQuaView.TenCap(_tt.CapDo.Cap + 1)}»", 12f, false, UI.PointInk));
            cap.Controls.Add(new ThanhTienDo { TiLe = ViQuaView.TienDo(_tt), Width = _tw, Height = Px(14), Margin = new Padding(0, Px(2), 0, Px(10)) });
            if (_tt.ChuoiNgay > 0) cap.Controls.Add(T($"Chuỗi {_tt.ChuoiNgay} ngày liền có nhiệm vụ được duyệt", 11.5f, false, UI.PointInk));
            _content.Controls.Add(cap);
            var luoi = Row(_cw);
            var w = (_cw - Px(12) * 2) / 3;
            foreach (var h in ViQuaView.SapXep(_tt.HuyHieu)) luoi.Controls.Add(HuyHieuO(h, w));
            _content.Controls.Add(luoi);
        }

        // --- Quy tắc nhà mình
        _content.Controls.Add(T("Quy tắc nhà mình", 15f, true, null, true));
        if (_qt == null) _content.Controls.Add(T("Chưa tải được bảng quy tắc.", 12.5f, false, UI.Muted, true));
        else
        {
            var q = _qt;
            var c = Card();
            c.Controls.Add(T("Ai cũng thấy giống nhau — công bằng!", 11.5f, false, UI.Muted));
            void Dong(string tieu, string noi)
            {
                c.Controls.Add(T(tieu, 12.5f, true));
                var l = T(noi, 12f, false, UI.Muted);
                l.Margin = new Padding(0, 0, 0, Px(10));
                c.Controls.Add(l);
            }
            Dong("Giờ chơi", $"{ViQuaView.Khung(q.Lich.NgayThuong)} · cuối tuần {ViQuaView.Khung(q.Lich.CuoiTuan)}");
            Dong("Mỗi lần chơi", $"Tối đa {q.PhienToiDa} phút, nghỉ {q.NghiGiua} phút");
            Dong("Mỗi ngày", $"Chơi tối đa {q.TranNgay} phút");
            Dong("Trò chơi", ViQuaView.Gia(q.GiaPhut.Game));
            Dong("Video ngắn", ViQuaView.Gia(q.GiaPhut.VideoNgan));
            Dong("Mạng xã hội", ViQuaView.Gia(q.GiaPhut.Mxh));
            Dong("Phim gia đình", ViQuaView.Gia(q.GiaPhut.PhimGd));
            Dong("Giờ ngủ", $"{q.Lich.Ngu.Tu}–{q.Lich.Ngu.Den} · máy nghỉ, chỉ còn app học");
            _content.Controls.Add(c);
        }
    }

    private Control PhieuQrCard(HvVoucherVi v)
    {
        var c = Card();
        var dau = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = false, BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, Px(6)) };
        dau.Controls.Add(new ClayIcon { Size = new Size(Px(44), Px(44)), MauVien = UI.PointSoft, Hinh = UI.Fluent("ticket"), Margin = new Padding(0, 0, Px(10), 0) });
        var tieu = T($"Phiếu quà AiiCafe {ViQuaView.Tien(v.MenhGia)}", 15f, true);
        tieu.MaximumSize = new Size(_tw - Px(60), 0);
        tieu.Margin = new Padding(0, Px(10), 0, 0);
        dau.Controls.Add(tieu);
        c.Controls.Add(dau);
        var co = Px(200);
        Image? anh = null;
        try { anh = UI.AnhQr(MaQr.MaTran(v.Ma), co); } catch { /* mã lạ: vẫn hiện chữ mã */ }
        if (anh != null)
            c.Controls.Add(new PictureBox { Image = anh, Size = new Size(co, co), SizeMode = PictureBoxSizeMode.Normal, BackColor = Color.White, Margin = new Padding(0, 0, 0, Px(6)), AccessibleName = "Mã QR " + v.Ma });
        var ma = T(v.Ma, 16f, true);
        ma.UseMnemonic = false;
        c.Controls.Add(ma);
        if (v.HetHan != null) c.Controls.Add(T("Dùng trước " + ViQuaView.Ngay(v.HetHan), 12f, false, UI.Muted));
        return c;
    }

    private Control HuyHieuO(HvHuyHieu h, int w)
    {
        var c = new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Width = w, MinimumSize = new Size(w, 0), MaximumSize = new Size(w, 0), BoGoc = Px(22),
            BackColor = h.Dat ? UI.Card : UI.Paper,
            Padding = VeThe.Pad(Px(16), Px(12), Px(16), Px(8)), Margin = new Padding(0, 0, Px(12), Px(4)),
        };
        var tw = w - Px(32) - VeThe.LeBong.Horizontal;
        c.Controls.Add(new ClayIcon { Size = new Size(Px(44), Px(44)), MauVien = h.Dat ? UI.PointSoft : UI.Paper, Hinh = h.Dat ? UI.Fluent("sports_medal") : UI.Fluent("locked"), Margin = new Padding(0, 0, 0, Px(4)) });
        c.Controls.Add(UI.Text(h.Ten, 12f, true, h.Dat ? UI.Ink : UI.Muted, tw));
        var phu = UI.Text(h.Dat && h.DatLuc != null ? "Đạt " + ViQuaView.Ngay(h.DatLuc) : h.MoTa, 10.5f, false, UI.Muted, tw);
        c.Controls.Add(phu);
        c.AccessibleName = $"{h.Ten}: {(h.Dat ? "đã đạt" : "chưa đạt")}. {h.MoTa}";
        return c;
    }

    // ---------------------------------------------------------------- Tin nhắn

    /// <summary>Mục chưa có dữ liệu học viên: chưa ghép / đang tải / LỖI (lý do + «Thử lại»). true = đã vẽ, mục dừng ở đây.</summary>
    private bool VeChuaCoDuLieu(string chuaGhep, string dangTai)
    {
        switch (HocVienView.TrangThaiTai(_s.Paired, _tq != null, _loiTai))
        {
            case TaiHocVien.Xong: return false;
            case TaiHocVien.ChuaGhep: _content.Controls.Add(T(chuaGhep, 12.5f, false, UI.Muted, true)); return true;
            case TaiHocVien.DangTai: _content.Controls.Add(T(dangTai, 12.5f, false, UI.Muted, true)); return true;
            default:
                var c = Card(UI.ErrorSoft);
                c.Controls.Add(T("Chưa tải được", 14f, true, UI.Error));
                c.Controls.Add(T(_loiTai!, 12f, false, UI.Error));
                c.Controls.Add(NutThuLai());
                _content.Controls.Add(c);
                return true;
        }
    }

    private Button NutThuLai()
    {
        var b = Btn("Thử lại", true, 180);
        b.Click += async (_, _) => { b.Enabled = false; await RefreshAsync(); };
        return b;
    }

    private void RenderTinNhan()
    {
        var tq = _tq;
        if (tq != null && tq.LoiKhen.Count > 0)
        {
            _content.Controls.Add(T("Ba Mẹ nhắn con", 15f, true, null, true));
            foreach (var l in tq.LoiKhen) _content.Controls.Add(LoiKhenCard(l));
        }
        if (_tin != null && _tin.Ds.Count > 0)
        {
            _content.Controls.Add(T("Thông báo gần đây", 15f, true, null, true));
            foreach (var x in _tin.Ds.Take(20))
            {
                var c = Card();
                c.Controls.Add(T(x.Tieu, 13f, true));
                if (!string.IsNullOrWhiteSpace(x.Noi)) c.Controls.Add(T(x.Noi, 12f, false, UI.Muted));
                if (x.Luc != null) c.Controls.Add(T(x.Luc.Value.ToLocalTime().ToString("HH:mm dd/MM"), 11f, false, UI.Muted));
                _content.Controls.Add(c);
            }
        }
        if (_content.Controls.Count == 0 && !VeChuaCoDuLieu("Máy chưa ghép với Ba Mẹ nên chưa có tin nhắn.", "Đang tải…"))
            _content.Controls.Add(T("Chưa có tin nhắn nào.", 12.5f, false, UI.Muted, true));
    }

    private Control LoiKhenCard(HvLoiKhen l)
    {
        var card = Card();
        card.Controls.Add(T("Ba Mẹ: " + l.NoiDung, 13f, true, UI.GreenDark));
        if (!string.IsNullOrWhiteSpace(l.PhanHoi))
        {
            card.Controls.Add(T("Con: " + l.PhanHoi, 12f, false));
            return card;
        }
        var row = Row(_tw);
        foreach (var s in new[] { "Con cảm ơn ạ", "Con sẽ cố gắng", "Con yêu Ba Mẹ" })
        {
            var b = Btn(s, false, 180);
            b.Height = Px(50);
            b.Font = UI.F(11f, FontStyle.Bold);
            var ch = s;
            b.Click += async (_, _) => await TraLoiAsync(l, ch);
            row.Controls.Add(b);
        }
        card.Controls.Add(row);
        return card;
    }

    private async Task TraLoiAsync(HvLoiKhen l, string noi)
    {
        if (_busy) return;
        _busy = true;
        Say("Đang gửi…", false);
        var (kq, loi) = await HvApi.PostAsync<HvDongY>($"hoc-vien/loi-khen/{l.Id}/phan-hoi", new { phanHoi = noi });
        _busy = false;
        if (kq == null) { Say(loi ?? "Chưa gửi được. Con thử lại nhé.", true); return; }
        await RefreshAsync();
        Say("Đã nhắn lại Ba Mẹ.", false);
    }
}

/// <summary>Thanh tiến độ lên cấp kiểu Clay: rãnh lõm + phần đã đi màu điểm, bo tròn.</summary>
internal sealed class ThanhTienDo : Control
{
    public double TiLe { get; set; }

    public ThanhTienDo()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        BackColor = UI.PointSoft;
        TabStop = false;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        g.Clear(BackColor);
        var r = Height / 2f;
        using (var ranh = Bo(new RectangleF(0, 0, Width - 1, Height - 1), r)) using (var b = new SolidBrush(Clay.Lom)) g.FillPath(b, ranh);
        var w = (float)((Width - 1) * Math.Clamp(TiLe, 0, 1));
        if (w >= Height)
            using (var di = Bo(new RectangleF(0, 0, w, Height - 1), r)) using (var b = new SolidBrush(Clay.Diem)) g.FillPath(b, di);
    }

    private static System.Drawing.Drawing2D.GraphicsPath Bo(RectangleF k, float r)
    {
        var p = new System.Drawing.Drawing2D.GraphicsPath();
        var d = Math.Min(r * 2, Math.Min(k.Width, k.Height));
        p.AddArc(k.X, k.Y, d, d, 90, 180);
        p.AddArc(k.Right - d, k.Y, d, d, 270, 180);
        p.CloseFigure();
        return p;
    }
}
