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
    private readonly PictureBox _mascot = new() { SizeMode = PictureBoxSizeMode.Zoom, BackColor = UI.GreenDark };
    private readonly Label _name = new() { AutoSize = true, ForeColor = Color.White, BackColor = UI.GreenDark };
    private readonly Label _pill = new() { AutoSize = true };
    private readonly Dictionary<MucApp, Button> _nav = new();

    // ---- vùng chính
    private readonly Panel _banner = new() { Dock = DockStyle.Top, Visible = false, BackColor = UI.ErrorSoft };
    private readonly Label _bannerHead = new() { AutoSize = false, ForeColor = UI.Error };
    private readonly Label _bannerHint = new() { AutoSize = false, ForeColor = UI.Error };
    private readonly Button _bannerBtn = new();
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
    private HvCuaHang? _ch;
    private HvTinDs? _tin;
    private bool _busy;
    /// <summary>Lần tải tổng quan học viên gần nhất lỗi (null = chưa lỗi / đã tải được).</summary>
    private string? _loiTai;
    private int _cw, _tw, _lastW;
    private string _sig = "";
    private Label? _bigLbl, _capLbl;

    /// <summary>Con bấm «Thử kết nối lại» (khay gọi dịch vụ đồng bộ ngay).</summary>
    public event Action? RetryClicked;
    /// <summary>Con đã mở mục Tin nhắn (khay xoá số tin mới).</summary>
    public event Action? TinDaXem;

    /// <summary>Số tin mới chưa đọc (khay đặt).</summary>
    public int TinMoi { get; set; }

    public AppForm()
    {
        Text = "AiiGrow";
        Icon = UI.AppIcon();
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.Sizable;
        MinimizeBox = true; MaximizeBox = true; ShowInTaskbar = true;
        BackColor = UI.Paper;
        ClientSize = new Size(Px(1000), Px(680));
        MinimumSize = new Size(Px(880), Px(600));
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
        var side = new Panel { Dock = DockStyle.Left, Width = Px(272), BackColor = UI.GreenDark };
        var inner = Px(272) - Px(32);

        var foot = new Label
        {
            Dock = DockStyle.Bottom, Height = Px(64), ForeColor = Color.FromArgb(0xcf, 0xe9, 0xe4), BackColor = UI.GreenDark,
            Font = UI.F(10f), Text = "Máy này do Ba Mẹ quản lý bằng AiiGrow", Padding = new Padding(Px(16), Px(8), Px(16), 0),
        };

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, BackColor = UI.GreenDark,
            Padding = new Padding(Px(16), Px(16), Px(16), 0), AutoScroll = false,
        };
        _mascot.Size = new Size(inner, Px(210));
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

        foreach (var (muc, text) in new[] { (MucApp.HomNay, "Hôm nay"), (MucApp.NhiemVu, "Nhiệm vụ"), (MucApp.PhanQua, "Phần quà & điểm"), (MucApp.TinNhan, "Tin nhắn") })
        {
            var b = new Button
            {
                Text = text, Width = inner, Height = Px(56), FlatStyle = FlatStyle.Flat, TextAlign = ContentAlignment.MiddleLeft,
                Font = UI.F(13f, FontStyle.Bold), Cursor = Cursors.Hand, UseMnemonic = false, UseVisualStyleBackColor = false,
                Padding = new Padding(Px(14), 0, 0, 0), Margin = new Padding(0, 0, 0, Px(6)), Tag = text,
            };
            b.FlatAppearance.BorderSize = 0;
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
        _tw = _cw - Px(16) * 2 - Px(6);
    }

    // =========================================================== nạp trạng thái từ khay

    /// <summary>Khay đưa trạng thái dịch vụ + kết quả chọn kết nối (mỗi ~3 giây). Chỉ vẽ lại nội dung khi có thay đổi đáng kể.</summary>
    public void Apply(TrayState? s, DateTimeOffset receivedAt, KetNoiInfo kn)
    {
        if (s != null) { _s = s; _at = receivedAt; }
        _kn = kn;
        ApplyKetNoiUi();
        var sig = $"{kn.Loai}|{kn.Dong}|{_s.Paired}|{_s.MoCoi}|{_s.Locked}|{_s.CanExchangePoints}|{_s.Mode}|{_s.ChildName}|{_s.MoOfflineDen}|{TinMoi}";
        if (sig != _sig) { _sig = sig; Render(); }
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
            b.BackColor = sel ? UI.GreenSoft : UI.GreenDark;
            b.ForeColor = sel ? UI.GreenDark : Color.White;
            b.FlatAppearance.MouseOverBackColor = sel ? UI.GreenSoft : UI.Green;
            b.FlatAppearance.MouseDownBackColor = sel ? UI.GreenSoft : UI.Green;
        }
    }

    // =========================================================== mở / chuyển mục

    /// <summary>Mở app to (nếu đang ẩn/thu nhỏ) và đưa lên trước; <paramref name="muc"/> khác null thì chuyển tới mục đó.</summary>
    public void ShowFront(MucApp? muc = null)
    {
        if (muc != null) Select(muc.Value);
        if (!Visible) Show(); else _ = RefreshAsync();
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
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

            var (ch, _) = await HvApi.GetAsync<HvCuaHang>("hoc-vien/cua-hang");
            _ch = ch;
            var (tin, _) = await HvApi.GetAsync<HvTinDs>("hoc-vien/tin");
            if (tin != null) _tin = tin;
            Render();
        }
        finally { _busy = false; }
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
        switch (_muc)
        {
            case MucApp.HomNay: _title.Text = "Hôm nay"; RenderHomNay(); break;
            case MucApp.NhiemVu: _title.Text = "Nhiệm vụ của con"; RenderViec(); break;
            case MucApp.PhanQua: _title.Text = "Phần quà & điểm"; RenderQua(); break;
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

    private Button Btn(string text, bool primary, int width = 260)
    {
        var b = UI.Btn(text, primary, Px(width));
        b.Height = Px(52);
        b.Font = UI.F(12f, FontStyle.Bold);
        b.UseMnemonic = false;
        b.Margin = new Padding(0, 0, Px(10), Px(8));
        return b;
    }

    private FlowLayoutPanel Card(Color? bg = null) => new()
    {
        AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
        Width = _cw, MinimumSize = new Size(_cw, 0), MaximumSize = new Size(_cw, 0),
        BackColor = bg ?? Color.White, BorderStyle = BorderStyle.FixedSingle,
        Padding = new Padding(Px(16), Px(12), Px(16), Px(6)), Margin = new Padding(0, 0, 0, Px(12)),
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
            var ask = Btn("Xin thêm thời gian", true, 270);
            ask.Click += (_, _) => OpenRequest();
            row.Controls.Add(ask);
            if (_s.CanExchangePoints)   // chỉ cờ; không hiện số điểm ở nút này
            {
                var ex = Btn("Đổi điểm lấy thời gian", false, 270);
                ex.Click += (_, _) => OpenRequest();
                row.Controls.Add(ex);
            }
            _content.Controls.Add(row);
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
            var go = Btn("Xem nhiệm vụ", false, 210);
            go.Height = Px(46);
            go.Click += (_, _) => Select(MucApp.NhiemVu);
            row.Controls.Add(go);
            if (TinMoi > 0)
            {
                var tin = Btn($"Đọc tin nhắn ({TinMoi})", false, 210);
                tin.Height = Px(46);
                tin.Click += (_, _) => Select(MucApp.TinNhan);
                row.Controls.Add(tin);
            }
            c.Controls.Add(row);
            _content.Controls.Add(c);
        }
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
            b.Height = Px(46);
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
        var b = Btn("Đổi quà", q.Du, 220);
        b.Height = Px(46);
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
            b.Height = Px(44);
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
