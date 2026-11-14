using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// App AiiGrow của Con trên Windows — giống thiết kế đã chốt 05/11 (docs/thiet-ke-chot/con-ngay-thuong, con-xin; khung 1002×712):
/// thanh bên (Rob, tên Con, trạng thái kết nối, 4 mục Hôm nay · Nhiệm vụ · Sao &amp; quà · Tin nhắn, «Ba Mẹ dùng máy»), vùng phải:
///   • Hôm nay: giờ chơi còn lại (quỹ phút ngày, thanh đã chơi, app tính giờ) + «Xin Ba Mẹ thêm giờ»; ví sao + «Đổi 10 sao lấy 10 phút»;
///     nhiệm vụ hôm nay; tin mới nhất của Ba Mẹ. Mất mạng / AiiGrow lỗi: thẻ trấn an + nút sửa (con-mat-mang 01, 07, 08).
///   • Nhiệm vụ: Ba Mẹ nhờ làm lại → Chờ Ba Mẹ duyệt → Chưa làm (Nộp ảnh / ghi âm / viết / Xong · Mở Học với AiiRob).
///   • Sao &amp; quà: ví sao, đổi sao lấy phút, đổi quà gửi Ba Mẹ (chờ trao / đã trao) — không còn phiếu AiiCafe / QR.
///   • Tin nhắn: tin của Ba Mẹ + Con trả lời nhanh / tự nhắn; thông báo.
/// Chỉ dùng «sao» (10 sao = 10 phút), không «điểm», không «Chế độ: Tự do», không chơi theo từng app bằng điểm.
/// 06/11 (L13): thanh bên có viên chữ của bé đang đăng nhập + «Đổi bé / Đăng xuất» + «Ba Mẹ dùng máy» (→ Ba Mẹ nhập mã); Sao &amp; quà theo bảng giá (L14).
/// Mọi quyết định do máy chủ; form chỉ hiện và gửi qua dịch vụ (named pipe → api/device/hoc-vien/…). Đóng cửa sổ = ẩn (khay vẫn chạy).
/// </summary>
internal sealed class AppForm : Form
{
    private static int Px(int v) => UI.Px(v);

    // ---- thanh bên
    private readonly PictureBox _mascot = new() { SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Transparent };
    private readonly Label _name = new() { AutoSize = true, ForeColor = UI.Ink, BackColor = Color.Transparent };
    private readonly VienTen _avt = new();
    private readonly Label _pill = new() { AutoSize = true };
    private readonly Dictionary<MucApp, ClayButton> _nav = new();
    private readonly Dictionary<MucApp, Label> _dem = new();

    // ---- vùng chính
    private readonly Label _title = new() { Dock = DockStyle.Top, ForeColor = UI.Ink, TextAlign = ContentAlignment.BottomLeft, UseMnemonic = false };
    private readonly Label _sub = new() { Dock = DockStyle.Top, ForeColor = UI.Muted, TextAlign = ContentAlignment.TopLeft, UseMnemonic = false };
    private readonly Label _msg = new() { Dock = DockStyle.Bottom, TextAlign = ContentAlignment.MiddleLeft, UseMnemonic = false, Visible = false };
    private readonly FlowLayoutPanel _content = new()
    {
        Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true, BackColor = UI.Paper,
    };

    private readonly System.Windows.Forms.Timer _tick = new() { Interval = 15_000 };
    private readonly System.Windows.Forms.Timer _resizeTimer = new() { Interval = 200 };
    private readonly System.Windows.Forms.Timer _auto = new() { Interval = 60_000 };

    // ---- dữ liệu
    private MucApp _muc = MucApp.HomNay;
    /// <summary>Mục đang hiện — khay chạy lại sau cập nhật mở lại đúng mục này.</summary>
    public MucApp Muc => _muc;
    private TrayState _s = new();
    private DateTimeOffset _at = DateTimeOffset.Now;
    private KetNoiInfo _kn = KetNoiView.Chon(false, null);
    private HvTongQuan? _tq;
    private List<HvNvDong>? _tuCham;
    private HvCuaHang? _ch;
    private ViQuaMay? _viQua;
    private readonly List<Image> _anhQr = new();   // ảnh QR của lần vẽ trước — PictureBox.Dispose không huỷ Image ⇒ tự huỷ khi vẽ lại
    private HvTinDs? _tin;
    /// <summary>Đang gửi một việc Con bấm (nhận việc, trả lời) — tách khỏi lượt tải nền <see cref="_dangTai"/> để bấm không bị nuốt im lặng.</summary>
    private bool _busy;
    private bool _dangTai, _taiLai;
    /// <summary>Sao &amp; quà đang ở «Quà của con» (con-ngay-thuong 16).</summary>
    private bool _xemQuaCuaCon;
    /// <summary>Lần tải tổng quan học viên gần nhất lỗi (null = chưa lỗi / đã tải được).</summary>
    private string? _loiTai;
    private string? _dauDaVe;   // dấu vân tay dữ liệu ở lần dựng nội dung gần nhất (ThayDoi) — dữ liệu y nguyên thì không dựng lại
    private bool _banDo;        // trạng thái khay đổi khi app đang ẩn ⇒ dựng lại lúc hiện, không dựng ngầm
    private int _cw, _lastW;
    private string _sig = "";
    // số trên Hôm nay cập nhật tại chỗ (không vẽ lại cả trang mỗi lần dịch vụ báo)
    private Label? _lblConPhut, _lblDaChoi, _lblApp;
    private ThanhTienDo? _thanh;
    private readonly TextBox _nhan = new() { Font = UI.F(11.5f), MaxLength = AppConView.TraLoiToiDa, ForeColor = UI.Ink, PlaceholderText = "Con tự nhắn Ba Mẹ…" };

    /// <summary>Con bấm «Xin mở app» (khay mở cửa sổ dùng chung).</summary>
    public event Action? XinMoClicked;
    /// <summary>Con bấm «Thử kết nối lại» / «Bật lại AiiGrow» (khay gọi dịch vụ đồng bộ ngay).</summary>
    public event Action? RetryClicked;
    /// <summary>Con đã mở mục Tin nhắn (khay xoá số tin mới).</summary>
    public event Action? TinDaXem;
    /// <summary>«Hỏi AiiGrow cách sửa» / «Có mạng mà vẫn lỗi?» (khay mở hộp Hỏi AiiGrow — con-mat-mang 10).</summary>
    public event Action? HoiAiiGrowClicked;
    /// <summary>06/11 (L13): «Đổi bé / Đăng xuất» ở thanh bên (con-ngay-thuong 09 → 08).</summary>
    public event Action? DoiBeClicked;
    /// <summary>06/11 (L13): «Ba Mẹ dùng máy» ⇒ Ba Mẹ nhập mã (con-ngay-thuong 06).</summary>
    public event Action? BaMeDungClicked;

    /// <summary>Số tin mới chưa đọc (khay đặt).</summary>
    public int TinMoi { get; set; }

    public AppForm()
    {
        AiiGrow.ClayUi.Clay.KhongMnemonic(this);   // «&» trong chữ (Sao & quà) hiện đúng, không thành phím tắt
        Text = "AiiGrow";
        Icon = UI.AppIcon();
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.Sizable;
        MinimizeBox = true; MaximizeBox = true; ShowInTaskbar = true;
        BackColor = UI.Paper;
        Padding = new Padding(Px(10), Px(10), 0, Px(4));   // thanh bên là phiến Clay nổi, chừa chỗ cho bóng
        ClientSize = new Size(Px(1000), Px(680));
        MinimumSize = new Size(Px(880), Px(600));
        var wa = Screen.PrimaryScreen!.WorkingArea;   // không vượt màn hình nhỏ (laptop 1366×768)
        if (Width > wa.Width || Height > wa.Height) Size = new Size(Math.Min(Width, wa.Width), Math.Min(Height, wa.Height));

        var main = new Panel { Dock = DockStyle.Fill, BackColor = UI.Paper };
        _title.Font = UI.F(22f, FontStyle.Bold);
        _title.Height = Px(62);
        _title.Padding = new Padding(Px(30), 0, 0, Px(2));
        _sub.Font = UI.F(11f);
        _sub.Height = Px(30);
        _sub.Padding = new Padding(Px(32), Px(2), 0, 0);
        _msg.Font = UI.F(11f, FontStyle.Bold);
        _msg.Height = Px(30);
        _msg.Padding = new Padding(Px(30), 0, 0, 0);
        _content.Padding = new Padding(Px(26), Px(4), Px(20), Px(16));
        main.Controls.Add(_content);
        main.Controls.Add(_msg);
        main.Controls.Add(_sub);
        main.Controls.Add(_title);
        Controls.Add(main);
        Controls.Add(BuildSide());

        _tick.Tick += (_, _) => { if (Visible && _muc == MucApp.HomNay) CapNhatSo(); };
        _tick.Start();
        _resizeTimer.Tick += (_, _) => { _resizeTimer.Stop(); if (CalcWidth() != _lastW) Render(); };
        Resize += (_, _) => { _resizeTimer.Stop(); _resizeTimer.Start(); };
        _auto.Tick += async (_, _) => { if (Visible && WindowState != FormWindowState.Minimized) await RefreshAsync(); };
        _auto.Start();

        FormClosing += (_, e) => { if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); } };
        VisibleChanged += async (_, _) =>
        {
            if (!Visible) return;
            if (_banDo) { _banDo = false; Render(); }
            await RefreshAsync();
        };

        Render();
        ApplyKetNoiUi();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _tick.Dispose(); _resizeTimer.Dispose(); _auto.Dispose(); if (_nhan.Parent == null) _nhan.Dispose(); }
        base.Dispose(disposing);
    }

    // =========================================================== thanh bên

    private Control BuildSide()
    {
        var side = new ClayCard
        {
            Dock = DockStyle.Left, Width = Px(272) + VeThe.LeBong.Horizontal, BoGoc = Px(32), BackColor = UI.Card,
            Padding = VeThe.Pad(Px(4), Px(4), Px(4), Px(4)),
        };
        var inner = Px(272) - Px(32);

        // 06/11 (con-ngay-thuong 09): chân thanh bên «Đổi bé / Đăng xuất» + «Ba Mẹ dùng máy» thu nhỏ (→ Ba Mẹ nhập mã)
        var chan = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = Px(100), BackColor = Color.Transparent, Padding = new Padding(Px(12), 0, 0, 0),
            FlowDirection = FlowDirection.TopDown, WrapContents = false };
        var doi = KhoiCon.LienKet("Đổi bé / Đăng xuất", "nguoi", () => DoiBeClicked?.Invoke(), 12f, Clay.NgocInk);
        doi.Margin = Padding.Empty;
        chan.Controls.Add(doi);
        var bm = KhoiCon.LienKet("Ba Mẹ dùng máy", "khoa", () => BaMeDungClicked?.Invoke(), 10.5f, Clay.Chu2);
        bm.Margin = Padding.Empty;
        chan.Controls.Add(bm);

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, BackColor = Color.Transparent,
            Padding = new Padding(Px(12), Px(8), Px(12), 0), AutoScroll = false,
        };
        _mascot.Size = new Size(inner, Px(200));
        _mascot.Margin = new Padding(0, 0, 0, Px(4));
        _name.Font = UI.F(17f, FontStyle.Bold);
        _name.MaximumSize = new Size(inner, 0);
        _name.Margin = new Padding(Px(4), 0, 0, Px(8));
        _pill.Font = UI.F(10.5f, FontStyle.Bold);
        _pill.MaximumSize = new Size(inner, 0);
        _pill.Padding = new Padding(Px(12), Px(8), Px(12), Px(8));
        _pill.Margin = new Padding(0, 0, 0, Px(14));
        flow.Controls.Add(_mascot);
        // viên chữ cái của bé đang đăng nhập cạnh tên (con-ngay-thuong 09 «.avt»)
        var hangTen = KhoiCon.Hang();
        hangTen.Margin = new Padding(Px(4), 0, 0, Px(8));
        _avt.Size = new Size(Px(34), Px(34));
        _avt.Margin = new Padding(0, Px(2), Px(8), 0);
        _name.Margin = Padding.Empty;
        _name.MaximumSize = new Size(inner - Px(50), 0);
        hangTen.Controls.Add(_avt);
        hangTen.Controls.Add(_name);
        flow.Controls.Add(hangTen);
        flow.Controls.Add(_pill);

        foreach (var (muc, text, icon) in new[] { (MucApp.HomNay, "Hôm nay", "dongho"), (MucApp.NhiemVu, "Nhiệm vụ", "tick"), (MucApp.PhanQua, "Sao & quà", "sao"), (MucApp.TinNhan, "Tin nhắn", "tin") })
        {
            var b = new ClayButton
            {
                Text = text, Width = inner, Height = Px(52), TextAlign = ContentAlignment.MiddleLeft, Image = Anh3D.Icon(icon),
                ImageAlign = ContentAlignment.MiddleLeft, TextImageRelation = TextImageRelation.ImageBeforeText,
                Font = UI.F(13f, FontStyle.Bold), UseMnemonic = false,
                Padding = new Padding(Px(8), 0, 0, 0), Margin = new Padding(0, 0, 0, Px(6)), Tag = text, BoGoc = Px(24),
            };
            // số đỏ cam bên phải (thiết kế «.nav i»): việc còn làm / tin mới
            var dem = new Label
            {
                AutoSize = false, Size = new Size(Px(28), Px(24)), TextAlign = ContentAlignment.MiddleCenter, Font = UI.F(9.5f, FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.FromArgb(0xe2, 0x66, 0x0f), Visible = false, UseMnemonic = false,
            };
            dem.Location = new Point(b.Width - dem.Width - Px(18), (b.Height - VeNut.LeBong.Vertical - dem.Height) / 2);
            b.Controls.Add(dem);
            var m = muc;
            b.Click += (_, _) => Select(m);
            dem.Click += (_, _) => Select(m);
            _nav[muc] = b;
            _dem[muc] = dem;
            flow.Controls.Add(b);
        }
        side.Controls.Add(flow);
        side.Controls.Add(chan);
        UpdateNav();
        return side;
    }

    private int CalcWidth()
        => Math.Clamp(_content.ClientSize.Width - _content.Padding.Horizontal - SystemInformation.VerticalScrollBarWidth, Px(480), Px(800));

    private void ComputeWidths() => _cw = _lastW = CalcWidth();

    // =========================================================== nạp trạng thái từ khay

    /// <summary>Khay đưa trạng thái dịch vụ + kết nối (mỗi ~3 giây). Vẽ lại khi đổi đáng kể; số phút thì cập nhật tại chỗ.</summary>
    public void Apply(TrayState? s, DateTimeOffset receivedAt, KetNoiInfo kn)
    {
        if (s != null) { _s = s; _at = receivedAt; }
        _kn = kn;
        ApplyKetNoiUi();
        var sig = $"{kn.Loai}|{_s.Paired}|{_s.MoCoi}|{_s.Locked}|{_s.ChildName}|{_s.MoOfflineDen}|{TinMoi}|{_s.QuyConPhut.HasValue}|{_s.NgoaiLeDen}|{_s.DangGioHoc}|{_s.GrantEndsAt}|{(_s.QuyConPhut ?? 1) <= 0}|{_s.BaiChoMang}";
        if (sig != _sig)
        {
            _sig = sig;
            if (Visible) Render(); else _banDo = true;   // app ẩn: khay vẫn đẩy trạng thái mỗi 3 giây, đừng dựng lại control vô hình
        }
        else if (Visible) CapNhatSo();
    }

    private void ApplyKetNoiUi()
    {
        var gio = DateTime.Now.ToString("HH:mm");
        _pill.Text = _kn.Loai switch
        {
            KetNoi.DaKetNoi => "● Đã kết nối · " + gio,
            KetNoi.MatKetNoi => "● Mất mạng · giờ vẫn chạy",
            _ => "● " + _kn.Dong,
        };
        _pill.BackColor = _kn.DungIconKetNoi ? UI.GreenSoft : _kn.Loai == KetNoi.MatKetNoi ? Clay.CanhSoft : UI.ErrorSoft;
        _pill.ForeColor = _kn.DungIconKetNoi ? UI.GreenDark : _kn.Loai == KetNoi.MatKetNoi ? Clay.Canh : UI.Error;
        var ten = TenCon();
        _name.Text = string.IsNullOrWhiteSpace(ten) ? "AiiGrow" : ten;
        var chuDau = DangNhapView.ChuDau(string.IsNullOrWhiteSpace(ten) ? "?" : ten);
        var coTen = !string.IsNullOrWhiteSpace(ten);
        if (_avt.Chu != chuDau || _avt.Visible != coTen) { _avt.Chu = chuDau; _avt.Visible = coTen; _avt.Invalidate(); }
        SetMascot();
    }

    private string TenCon() => !string.IsNullOrWhiteSpace(_tq?.Con.Ten) ? _tq!.Con.Ten : _s.ChildName;

    private List<ViecCon> Viec() => _tq == null ? new() : AppConView.DanhSach(_tq, _tuCham);

    private bool XongHet() => _tq != null && Viec().All(v => v.Nhom == "cho_duyet");

    private void SetMascot()
    {
        var anh = UI.Mascot(MascotView.Chon(_muc, _kn.Loai, XongHet()));
        if (!ReferenceEquals(_mascot.Image, anh)) _mascot.Image = anh;   // gán lại ảnh cũ vẫn vẽ lại PictureBox
    }

    private void UpdateNav()
    {
        foreach (var (muc, b) in _nav)
        {
            var sel = muc == _muc;
            var n = muc switch { MucApp.NhiemVu => Viec().Count(v => v.Nhom is "chua_lam" or "lam_lai" or "tu_cham"), MucApp.TinNhan => TinMoi, _ => 0 };
            var d = _dem[muc];
            d.Text = n > 9 ? "9+" : n.ToString();
            d.Visible = n > 0 && !sel;
            b.Kieu = sel ? KieuClay.Lom : KieuClay.Phang;
            b.BackColor = sel ? UI.GreenSoft : UI.Card;
            b.ForeColor = sel ? UI.GreenDark : UI.Ink;
        }
    }

    // =========================================================== mở / chuyển mục

    /// <summary>Mở app (nếu đang ẩn/thu nhỏ) và đưa lên trước; <paramref name="muc"/> khác null thì chuyển tới mục đó. <paramref name="noiLen"/> = khay tự bật:
    /// Windows chặn tiến trình nền giành tiêu điểm ⇒ bật TopMost rồi tắt ngay để cửa sổ nằm trên cùng mà không ghim mãi.</summary>
    public void ShowFront(MucApp? muc = null, bool noiLen = false)
    {
        if (muc != null) Select(muc.Value);
        bool moMoi = !Visible;
        if (!Visible) Show(); else _ = RefreshAsync();
        if (moMoi)
        {
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
        if (muc != MucApp.PhanQua || _muc != MucApp.PhanQua) _xemQuaCuaCon = false;
        _muc = muc;
        if (muc == MucApp.TinNhan && TinMoi > 0) { TinMoi = 0; TinDaXem?.Invoke(); }
        Render();
        if (muc == MucApp.PhanQua) _ = RefreshAsync();   // quà / quà đã trao tải khi mở mục
        _content.AutoScrollPosition = Point.Empty;
    }

    private void Say(string s, bool error)
    {
        _msg.ForeColor = error ? UI.Error : UI.Green;
        _msg.Text = s;
        _msg.Visible = s.Length > 0;
    }

    private string DauDuLieu() => ThayDoi.Bam(_tq, _tuCham, _tin, _ch, _viQua, _loiTai, _muc.ToString(), _xemQuaCuaCon.ToString());

    public async Task RefreshAsync()
    {
        if (_dangTai) { _taiLai = true; return; }   // đang tải ⇒ tải lại một lượt nữa ngay sau (không nuốt lượt sau khi nộp bài / đổi quà)
        _dangTai = true;
        try
        {
            var (tq, loi) = await HvApi.GetAsync<HvTongQuan>("hoc-vien/tong-quan");
            if (IsDisposed) return;
            if (tq == null)
            {
                _loiTai = string.IsNullOrWhiteSpace(loi) ? "Chưa tải được. Con thử lại nhé." : loi;
                if (DauDuLieu() != _dauDaVe) Render();
                return;
            }
            _tq = tq;
            _loiTai = null;
            if (DauDuLieu() != _dauDaVe) Render();   // «tổng quan» về trước ⇒ hiện sớm; y nguyên thì giữ màn đang có
            ApplyKetNoiUi();
            // bốn lượt sau chạy song song (dịch vụ nhận nhiều kết nối pipe); quà chỉ tải khi Con ở / đã mở «Sao & quà»
            var tcT = HvApi.GetAsync<HvNvDs>("hoc-vien/nhiem-vu?tuCham=1");
            var tinT = HvApi.GetAsync<HvTinDs>("hoc-vien/tin");
            var quaCan = _muc == MucApp.PhanQua || _ch == null;
            var chT = quaCan ? HvApi.GetAsync<HvCuaHang>("hoc-vien/cua-hang") : null;
            var vqT = quaCan ? HvApi.GetAsync<ViQuaMay>(ViQuaMayView.Duong) : null;
            var (tc, _) = await tcT;
            if (tc != null) _tuCham = tc.Ds.Where(x => x.TuCham).ToList();
            var (tin, _) = await tinT;
            if (tin != null) _tin = tin;
            if (chT != null && (await chT).Data is { } ch) _ch = ch;
            if (vqT != null && (await vqT).Data is { } vq) _viQua = vq;
            if (!IsDisposed && DauDuLieu() != _dauDaVe) Render();
        }
        finally
        {
            _dangTai = false;
            if (_taiLai && !IsDisposed) { _taiLai = false; _ = RefreshAsync(); }
        }
    }

    // =========================================================== hộp

    /// <summary>Hộp «Thêm giờ chơi» (Dùng sao / Xin Ba Mẹ) rồi đi tiếp theo lựa chọn của Con.</summary>
    private void MoThemGio(bool dungSao)
    {
        string? sau;
        using (var f = new RequestForm(_s.CanExchangePoints, dungSao: dungSao))
        {
            f.ShowDialog(this);
            sau = f.Sau;
        }
        switch (sau)
        {
            case RequestForm.SauXinMo: XinMoClicked?.Invoke(); break;
            case RequestForm.SauNhan: Select(MucApp.TinNhan); break;
            case RequestForm.SauNhiemVu: Select(MucApp.NhiemVu); break;
        }
        _ = RefreshAsync();
    }

    // =========================================================== vẽ nội dung

    private void Render()
    {
        _dauDaVe = DauDuLieu();
        _banDo = false;
        ComputeWidths();
        _content.SuspendLayout();
        _nhan.Parent?.Controls.Remove(_nhan);
        foreach (var c in _content.Controls.Cast<Control>().ToList()) { _content.Controls.Remove(c); c.Dispose(); }
        foreach (var a in _anhQr) a.Dispose();   // ảnh QR của PictureBox vừa huỷ
        _anhQr.Clear();
        _lblConPhut = _lblDaChoi = _lblApp = null;
        _thanh = null;
        switch (_muc)
        {
            case MucApp.HomNay: RenderHomNay(); break;
            case MucApp.NhiemVu: RenderViec(); break;
            case MucApp.PhanQua: if (_xemQuaCuaCon) RenderQuaCuaCon(); else RenderQua(); break;
            default: RenderTinNhan(); break;
        }
        _content.ResumeLayout(true);
        UpdateNav();
        SetMascot();
    }

    private Label T(string text, float pt = 12f, bool bold = false, Color? color = null, int w = 0)
    {
        var l = UI.Text(text, pt, bold, color, w > 0 ? w : _cw);
        return l;
    }

    private int Trong(int rong) => KhoiApp.TrongThe(rong);

    private ClayFlow TheDay(bool vang = false)
    {
        var t = KhoiApp.The(_cw, vang);
        t.Margin = new Padding(0, 0, 0, Px(8));
        return t;
    }

    private FlowLayoutPanel HangNgang()
    {
        var h = KhoiCon.Hang();
        h.Margin = Padding.Empty;
        return h;
    }

    // ---------------------------------------------------------------- Hôm nay (con-ngay-thuong 01, con-mat-mang 01/07/08)

    private double? ConPhutHienTai()
    {
        if (_s.QuyConPhut is double q) return q;
        if (_tq?.Quy is { } tq) return tq.ConPhut;
        var d = TrayView.Describe(_s, _at, DateTimeOffset.Now);
        return d.RemainingSec is double r ? r / 60.0 : null;
    }

    private (double DaDung, double Tong)? QuyHienTai()
    {
        if (_s.QuyTongPhut is double t) return (_s.QuyDaDung ?? Math.Max(0, t - (_s.QuyConPhut ?? 0)), t);
        if (_tq?.Quy is { } q) return (q.DaDung, q.TongPhut);
        return null;
    }

    private void RenderHomNay()
    {
        _title.Text = AppConView.Chao(TenCon());
        _sub.Text = AppConView.NgayGio(DateTime.Now);

        if (_kn.Loai is KetNoi.DichVuKhongChay) { VeTrucTrac(); return; }
        if (_kn.Loai is KetNoi.ChuaGhep)
        {
            var c = TheDay();
            c.Controls.Add(KhoiCon.Dau("canh_bao", KhoiCon.Mau.Cam, _kn.Dong, _kn.Huong, Trong(_cw)));
            _content.Controls.Add(c);
            return;
        }
        if (_kn.Loai == KetNoi.MatKetNoi || _s.MoOfflineDen != null) VeMatMang();

        // Giờ chơi còn lại
        var gio = TheDay();
        var r = Trong(_cw);
        var dau = new TableLayoutPanel { ColumnCount = 2, RowCount = 1, Width = r, Height = Px(92), BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, Px(8)) };
        dau.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        dau.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        var trai = HangNgang();
        trai.Controls.Add(KhoiApp.Vien("dong_ho_cat"));
        var cot = KhoiCon.Cot();
        var nhan = T(_s.DangGioHoc ? "Đang giờ học · chỉ app học" : "Giờ chơi còn lại", 12.5f, false, UI.Muted, r / 2); nhan.Margin = new Padding(0, Px(2), 0, 0);
        cot.Controls.Add(nhan);
        _lblConPhut = T("", 40f, true, UI.Green, r); _lblConPhut.Margin = Padding.Empty;
        cot.Controls.Add(_lblConPhut);
        trai.Controls.Add(cot);
        dau.Controls.Add(trai, 0, 0);
        var xin = KhoiApp.NutGon("Xin Ba Mẹ thêm giờ", false, "gui", 46, 12f);
        xin.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        xin.Click += (_, _) => MoThemGio(false);
        dau.Controls.Add(xin, 1, 0);
        gio.Controls.Add(dau);
        _thanh = new ThanhTienDo { Width = r, Margin = new Padding(0, 0, 0, Px(10)) };
        gio.Controls.Add(_thanh);
        _lblDaChoi = T("", 12f, true, Clay.Chu2, r);
        gio.Controls.Add(_lblDaChoi);
        _lblApp = T("", 11f, false, UI.Muted, r);
        gio.Controls.Add(_lblApp);
        if (_s.NgoaiLeDen is { } den) gio.Controls.Add(KhoiCon.DongIcon("mo_khoa", $"Ba Mẹ mở cả máy đến {den.ToLocalTime():HH:mm}", r));
        _content.Controls.Add(gio);
        CapNhatSo();

        // Sao của con · Nhiệm vụ hôm nay (hai thẻ ngang)
        var nua = (_cw - Px(10)) / 2;
        var hai = HangNgang();
        hai.Margin = new Padding(0, 0, 0, Px(8));
        var sao = KhoiApp.The(nua, vang: true);
        sao.Margin = new Padding(0, 0, Px(10), 0);
        var rn = KhoiApp.TrongThe(nua);
        var soSao = _tq?.SoSao;
        sao.Controls.Add(KhoiApp.DauThe("sao", "Sao của con", soSao is int ss ? AppConView.Sao(ss) : "…", Clay.DiemInk, 22f, rn, Clay.DiemInk, Clay.DiemSoft));
        sao.Controls.Add(T(AppConView.TyLe(_tq?.Quy?.TyLe), 10.5f, false, Clay.DiemInk, rn));
        if (_tq?.Quy?.DoiSao.Bat != false)
        {
            var doi = KhoiCon.Nut(AppConView.NutDoiSao(_tq?.Quy?.TyLe), false, rn, "dongho", 44, 11f);
            doi.Click += (_, _) => MoThemGio(true);
            sao.Controls.Add(doi);
        }
        hai.Controls.Add(sao);
        var nv = KhoiApp.The(nua);
        nv.Margin = Padding.Empty;
        if (_tq == null)
        {
            nv.Controls.Add(KhoiApp.DauThe("tick", "Nhiệm vụ hôm nay", _loiTai != null ? "Chưa tải được" : "Đang tải…", UI.Ink, 16f, rn));
            if (_loiTai != null) nv.Controls.Add(NutTaiLai("Tải lại", rn));
        }
        else
        {
            var ds = Viec();
            nv.Controls.Add(KhoiApp.DauThe("tick", "Nhiệm vụ hôm nay", $"{ds.Count} việc", UI.Ink, 22f, rn));
            nv.Controls.Add(T(AppConView.TomTatViec(ds), 10.5f, true, ds.Any(x => x.Nhom != "cho_duyet") ? Clay.Canh : Clay.NgocInk, rn));
            var xem = KhoiCon.Nut(ds.Count > 0 ? $"Xem {ds.Count} nhiệm vụ" : "Xem nhiệm vụ", true, rn, "tick", 44, 11f);
            xem.Click += (_, _) => Select(MucApp.NhiemVu);
            nv.Controls.Add(xem);
        }
        hai.Controls.Add(nv);
        // hai thẻ cao bằng nhau
        hai.Layout += (_, _) => { var h = Math.Max(sao.PreferredSize.Height, nv.PreferredSize.Height); sao.MinimumSize = new Size(nua, h); nv.MinimumSize = new Size(nua, h); };
        _content.Controls.Add(hai);

        // Tin mới nhất của Ba Mẹ
        var tin = _tq?.LoiKhen.OrderByDescending(l => l.Luc ?? DateTimeOffset.MinValue).FirstOrDefault();
        if (tin != null)
        {
            var t = TheDay();
            var bang = new TableLayoutPanel { ColumnCount = 2, RowCount = 1, Width = r, Height = Px(60), BackColor = Color.Transparent, Margin = Padding.Empty };
            bang.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            bang.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            var ht = HangNgang();
            ht.Controls.Add(KhoiApp.Vien("tin"));
            var ct = KhoiCon.Cot();
            var a = T("Ba Mẹ" + (tin.Luc is { } l ? " · " + l.ToLocalTime().ToString("HH:mm") : ""), 12f, true, UI.Ink, r - Px(240)); a.Margin = new Padding(0, Px(4), 0, Px(2));
            var b = new Label { Text = "«" + tin.NoiDung + "»", AutoSize = false, AutoEllipsis = true, Width = r - Px(240), Height = Px(24), Font = UI.F(11.5f), ForeColor = Clay.Chu2, BackColor = Color.Transparent, UseMnemonic = false };
            ct.Controls.Add(a); ct.Controls.Add(b);
            ht.Controls.Add(ct);
            bang.Controls.Add(ht, 0, 0);
            var doc = KhoiApp.NutGon("Đọc tin", false, null, 44, 11.5f);
            doc.Anchor = AnchorStyles.Right;
            doc.Click += (_, _) => Select(MucApp.TinNhan);
            bang.Controls.Add(doc, 1, 0);
            t.Controls.Add(bang);
            _content.Controls.Add(t);
        }

        if (_kn.Loai == KetNoi.MatKetNoi)
        {
            var chu = _s.MoOfflineDen != null ? "Hết giờ mở máy khoá lại" : "Vẫn theo luật Ba Mẹ đặt";   // 06/11 B1: không ghi cứng «Chặn app & web» (Con có thể đang «Mở hết»)
            if (_s.NguLuc != null) chu += " · ngủ lúc " + _s.NguLuc;
            var f = HangNgang();
            f.Controls.Add(T(chu, 10.5f, false, UI.Muted, _cw - Px(140)));
            f.Controls.Add(KhoiCon.LienKet("App khác? ›", null, () => XinMoClicked?.Invoke()));
            _content.Controls.Add(f);
        }
    }

    /// <summary>Số phút / thanh / dòng app trên thẻ Giờ chơi — cập nhật tại chỗ.</summary>
    private void CapNhatSo()
    {
        if (_lblConPhut == null || _lblConPhut.IsDisposed) return;
        var con = ConPhutHienTai();
        _lblConPhut.Text = con is double c ? AppConView.Phut(c) : "—";
        _lblConPhut.ForeColor = con is <= 0 ? Clay.Canh : UI.Green;
        var q = QuyHienTai();
        if (_thanh != null) { _thanh.Visible = q != null; if (q is { } qq) _thanh.TiLe = AppConView.TiLe(qq.DaDung, qq.Tong); }
        if (_lblDaChoi != null)
        {
            var phu = _kn.Loai == KetNoi.MatKetNoi ? (_s.MoOfflineDen != null ? " · thêm giờ bằng mã của Ba Mẹ" : " · mất mạng vẫn tính") : "";
            _lblDaChoi.Text = q is { } x ? AppConView.DaChoi(x.DaDung, x.Tong) + phu : "";
            _lblDaChoi.Visible = q != null;
        }
        if (_lblApp != null)
        {
            _lblApp.Text = AppConView.DungTheoApp(_s.DungTheoApp, _s.AppDuocPhep);
            _lblApp.Visible = _lblApp.Text.Length > 0;
        }
    }

    /// <summary>con-mat-mang 01 / 07: thẻ trấn an khi mất mạng (hoặc đang mở máy bằng mã của Ba Mẹ).</summary>
    private void VeMatMang()
    {
        var c = TheDay();
        var r = Trong(_cw);
        if (_s.MoOfflineDen is { } den)
            c.Controls.Add(KhoiCon.Dau("mo_khoa", KhoiCon.Mau.Ngoc, "Ba Mẹ đã mở máy bằng mã", $"Đến {den.ToLocalTime():HH:mm}. Luật khác vẫn giữ.", r));
        else
            c.Controls.Add(KhoiCon.Dau("wifi", KhoiCon.Mau.Cam, "Mất mạng rồi, không sao đâu!", "Máy vẫn tính giờ và giữ luật như cũ.", r));
        var h = HangNgang();
        var thu = KhoiApp.NutGon("Thử kết nối lại", true, "wifi");
        thu.Margin = new Padding(0, 0, Px(12), 0);
        thu.Click += (_, _) => { thu.Enabled = false; RetryClicked?.Invoke(); };
        h.Controls.Add(thu);
        if (_s.MoOfflineDen == null) h.Controls.Add(KhoiCon.LienKet("Có mạng mà vẫn lỗi? ›", null, () => HoiAiiGrowClicked?.Invoke()));
        c.Controls.Add(h);
        if (_s.BaiChoMang > 0) c.Controls.Add(KhoiCon.DongIcon("gui", $"Bài chờ gửi: {_s.BaiChoMang} · có mạng là tự gửi", r));
        _content.Controls.Add(c);
    }

    /// <summary>con-mat-mang 08: AiiGrow (dịch vụ) không trả lời — máy vẫn giữ luật cũ; Bật lại · Gọi Ba Mẹ giúp · Hỏi AiiGrow cách sửa.</summary>
    private void VeTrucTrac()
    {
        var c = TheDay();
        var r = Trong(_cw);
        c.Controls.Add(KhoiCon.Dau("canh_bao", KhoiCon.Mau.Cam, "AiiGrow bị trục trặc", "Không sao, máy vẫn giữ luật cũ.", r));
        var con = ConPhutHienTai();
        c.Controls.Add(T((con is double p ? $"Còn {AppConView.Phut(p)} chơi · " : "") + "vẫn chặn app & web lạ.", 11.5f, true, Clay.Chu2, r));
        var bat = KhoiCon.Nut("Bật lại AiiGrow", true, r, "banhrang");
        bat.Click += (_, _) => { bat.Enabled = false; RetryClicked?.Invoke(); };
        c.Controls.Add(bat);
        _content.Controls.Add(c);
        _content.Controls.Add(T("Vẫn lỗi? Nhờ người lớn giúp nhé ↓", 11.5f, true, Clay.Chu2));
        var nua = (_cw - Px(10)) / 2;
        var hai = HangNgang();
        hai.Margin = new Padding(0, 0, 0, Px(8));
        foreach (var (icon, tieu, phu, nut, bam) in new (string, string, string, string, Action)[]
        {
            ("nguoi", "Ba Mẹ", "Gọi giúp", "Gọi Ba Mẹ giúp", () => Select(MucApp.TinNhan)),
            ("dau_hoi", "AiiGrow", "Tự tìm lỗi", "Hỏi AiiGrow cách sửa", () => HoiAiiGrowClicked?.Invoke()),
        })
        {
            var t = KhoiApp.The(nua);
            t.Margin = new Padding(0, 0, Px(10), 0);
            var rn = KhoiApp.TrongThe(nua);
            t.Controls.Add(KhoiApp.DauThe(icon, phu, tieu, UI.Ink, 15f, rn));
            var b = KhoiCon.Nut(nut, false, rn, null, 44, 11f);
            b.Click += (_, _) => bam();
            t.Controls.Add(b);
            hai.Controls.Add(t);
        }
        _content.Controls.Add(hai);
        _content.Controls.Add(T("Đừng tắt máy giữa chừng nhé. Bài đang làm vẫn được lưu.", 10.5f, false, UI.Muted));
    }

    private Button NutTaiLai(string chu, int rong)
    {
        var b = KhoiCon.Nut(chu, true, rong, "tro_lai", 44, 11f);
        b.Click += async (_, _) => { b.Enabled = false; RetryClicked?.Invoke(); await RefreshAsync(); };
        return b;
    }

    // ---------------------------------------------------------------- Nhiệm vụ (con-ngay-thuong 02 / 03)

    private void RenderViec()
    {
        _title.Text = "Nhiệm vụ của con";
        if (_tq == null)
        {
            _sub.Text = "";
            if (!_s.Paired) { _content.Controls.Add(T("Máy chưa ghép với Ba Mẹ nên chưa có nhiệm vụ.", 12.5f, false, UI.Muted)); return; }
            if (_loiTai == null) { _content.Controls.Add(T("Đang tải nhiệm vụ…", 12.5f, false, UI.Muted)); return; }
            // con-ngay-thuong 02: chưa tải được (mất mạng) — giờ chơi vẫn chạy
            var c = TheDay();
            var r = Trong(_cw);
            var matMang = _kn.Loai == KetNoi.MatKetNoi;
            c.Controls.Add(KhoiCon.Dau("wifi", KhoiCon.Mau.Cam, "Chưa tải được nhiệm vụ",
                matMang ? "Máy đang mất mạng. Con xem Wi-Fi rồi bấm tải lại nhé." : _loiTai, r));
            c.Controls.Add(NutTaiLai("Tải lại nhiệm vụ", r));
            _content.Controls.Add(c);
            var con = ConPhutHienTai();
            if (con is double p) _content.Controls.Add(T($"Giờ chơi vẫn chạy như bình thường · còn {AppConView.Phut(p)}", 11f, false, UI.Muted));
            return;
        }
        var ds = Viec();
        _sub.Text = AppConView.BoViec(_tq.NhiemVu.Select(v => v.Bo).Concat(_tuCham?.Select(t => t.Bo) ?? Array.Empty<string?>()), ds.Count);
        if (ds.Count == 0)
        {
            var c = TheDay();
            c.Controls.Add(KhoiCon.Dau("phao_hoa", KhoiCon.Mau.Ngoc, "Chưa có nhiệm vụ nào", "Ba Mẹ giao việc là con thấy ở đây ngay.", Trong(_cw)));
            _content.Controls.Add(c);
        }
        void Muc(string nhom, string nhan)
        {
            var mot = ds.Where(v => v.Nhom == nhom || (nhom == "chua_lam" && v.Nhom == "tu_cham")).ToList();
            if (mot.Count == 0) return;
            _content.Controls.Add(KhoiApp.NhanMuc($"{nhan} ({mot.Count})", _cw));
            foreach (var v in mot) _content.Controls.Add(DongViec(v));
        }
        Muc("lam_lai", "Ba Mẹ nhờ làm lại");
        Muc("cho_duyet", "Chờ Ba Mẹ duyệt");
        Muc("chua_lam", "Chưa làm");

        var chan = TheDay(vang: true);
        var rc = Trong(_cw);
        chan.Controls.Add(KhoiApp.DauThe("sao", "Ba Mẹ duyệt xong là sao vào ví ngay", AppConView.ChanNhiemVu(_tq.SoSao, _tq.SoSaoChoDuyet), Clay.DiemInk, 12.5f, rc, Clay.DiemInk, Clay.DiemSoft));
        _content.Controls.Add(chan);
    }

    private Control DongViec(ViecCon v)
    {
        var phai = new List<Control>();
        if (v.Nhom == "cho_duyet") phai.Add(KhoiApp.ChipCho("Chờ duyệt"));
        else if (v.Nut != null)
        {
            var b = KhoiApp.NutGon(v.Nut, true, v.Nhom == "tu_cham" ? "may_tinh" : v.NhiemVu?.BangChung == "ghi_am" ? "tai" : v.NhiemVu?.BangChung == "xong" ? "tick" : "camera", 40, 10.5f);
            b.Click += async (_, _) => await LamViecAsync(v, b);
            phai.Add(b);
        }
        if (v.Sao > 0) phai.Add(KhoiApp.ChipSao($"+{v.Sao} sao"));
        var phu = v.Nhom == "lam_lai" && !string.IsNullOrWhiteSpace(v.LoiNhan) ? "Ba Mẹ: «" + v.LoiNhan + "»" : v.Phu;
        return KhoiApp.Dong(_cw, v.Icon, v.Ten, phu, v.Nhom == "lam_lai" ? Clay.Canh : null, phai.ToArray());
    }

    /// <summary>Bấm nút của một việc: AiiRob ⇒ mở trang học; còn lại ⇒ nhận việc (nếu chưa) rồi mở hộp nộp bài.</summary>
    private async Task LamViecAsync(ViecCon v, Button b)
    {
        if (v.Nhom == "tu_cham")
        {
            try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(AppConView.AiiRobUrl) { UseShellExecute = true }); }
            catch { Say("Chưa mở được AiiRob. Con nhờ Ba Mẹ giúp nhé.", true); }
            return;
        }
        var nv = v.NhiemVu;
        if (nv == null || _busy) return;
        if (string.IsNullOrEmpty(nv.Luot))
        {
            b.Enabled = false;
            _busy = true;
            var (kq, loi) = await HvApi.PostAsync<HvBatDauKq>($"hoc-vien/nhiem-vu/{nv.Id}/bat-dau");
            _busy = false;
            if (IsDisposed) return;
            b.Enabled = true;
            if (kq == null || string.IsNullOrEmpty(kq.Luot)) { Say(loi ?? "Chưa nhận được việc. Con thử lại nhé.", true); return; }
            nv.Luot = kq.Luot;
        }
        Say("", false);
        using var f = new NopBaiForm(nv);
        var kqNop = f.ShowDialog(this);
        if (kqNop == DialogResult.OK || f.Ket != null) await RefreshAsync();
    }

    // ---------------------------------------------------------------- Sao & quà (con-ngay-thuong 15 / 16)

    private void RenderQua()
    {
        _title.Text = "Sao & quà";
        _sub.Text = "";
        if (_tq == null)
        {
            _content.Controls.Add(T(!_s.Paired ? "Máy chưa ghép với Ba Mẹ." : _loiTai ?? "Đang tải…", 12.5f, false, _loiTai != null ? UI.Error : UI.Muted));
            if (_loiTai != null) _content.Controls.Add(NutTaiLai("Tải lại", Px(240)));
            return;
        }
        var sao = _tq.SoSao;
        var vi = TheDay(vang: true);
        var r = Trong(_cw);
        var bang = new TableLayoutPanel { ColumnCount = 2, RowCount = 1, Width = r, Height = Px(104), BackColor = Color.Transparent, Margin = Padding.Empty };
        bang.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        bang.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        var trai = KhoiCon.Cot();
        trai.Controls.Add(KhoiApp.DauThe("sao", "Con đang có", AppConView.Sao(sao), Clay.DiemInk, 24f, r / 2, Clay.DiemInk, Clay.DiemSoft));
        if (_tq.SoSaoChoDuyet > 0) trai.Controls.Add(T($"+{_tq.SoSaoChoDuyet} sao chờ Ba Mẹ duyệt", 10.5f, true, Clay.DiemInk, r / 2));
        bang.Controls.Add(trai, 0, 0);
        var phai = KhoiCon.Cot();
        phai.Anchor = AnchorStyles.Right;
        phai.Controls.Add(T(AppConView.TyLe(_tq.Quy?.TyLe), 11f, true, Clay.DiemInk, r / 2));
        if (_tq.Quy?.DoiSao.Bat != false)
        {
            var doi = KhoiApp.NutGon(AppConView.NutDoiSao(_tq.Quy?.TyLe), false, "dongho", 44, 11f);
            doi.Margin = Padding.Empty;
            doi.Click += (_, _) => MoThemGio(true);
            phai.Controls.Add(doi);
        }
        bang.Controls.Add(phai, 1, 0);
        vi.Controls.Add(bang);
        _content.Controls.Add(vi);

        var dau = HangNgang();
        dau.Margin = new Padding(0, Px(6), 0, 0);
        var lb = KhoiApp.NhanMuc("Đổi quà", Px(200)); lb.Margin = new Padding(Px(4), Px(12), Px(20), 0);
        dau.Controls.Add(lb);
        dau.Controls.Add(KhoiCon.LienKet("Quà của con ›", "qua", () => { _xemQuaCuaCon = true; Render(); }));
        _content.Controls.Add(dau);
        // 06/11 (L14 — con-ngay-thuong 23): quà = bảng giá sao; con chọn ⇒ sao bị GIỮ, Ba Mẹ trao mới trừ hẳn
        var luat = T("Con chọn quà → Ba Mẹ trao → mới trừ sao", 10.5f, false, UI.Muted);
        luat.Margin = new Padding(Px(4), 0, 0, Px(6));
        _content.Controls.Add(luat);

        // «Đang chờ Ba Mẹ trao»: phiếu đang giữ sao
        var cho = _viQua?.PhieuCho.Select(p => (p.Ten, p.Sao)).ToList() ?? _tq.PhieuCho.Select(p => (p.Ten, Sao: p.Diem)).ToList();
        if (cho.Count > 0)
        {
            _content.Controls.Add(KhoiApp.NhanMuc("Đang chờ Ba Mẹ trao", _cw));
            foreach (var p in cho)
                _content.Controls.Add(KhoiApp.Dong(_cw, "qua", p.Ten, AppConView.DangGiu(p.Sao), Clay.Canh, KhoiApp.ChipSao(AppConView.Sao(p.Sao))));
        }

        // 07/11 (V1): quà + điều kiện lấy từ GET api/device/vi-qua (conHopLe / lyDoKhong / doiDuoc); chưa tải được thì rơi về hoc-vien/cua-hang
        _content.Controls.Add(KhoiApp.NhanMuc("Quà con đổi được", _cw));
        var viQuaQua = _viQua?.Qua;
        if (viQuaQua == null && _ch == null) _content.Controls.Add(T("Đang tải danh sách quà…", 12f, false, UI.Muted));
        else if ((viQuaQua?.Count ?? _ch!.Qua.Count) == 0) _content.Controls.Add(T("Ba Mẹ chưa đặt quà nào. Con làm nhiệm vụ để có sao nhé!", 12f, false, UI.Muted));
        // bảng giá: rẻ trước (như màn thiết kế); quà đủ điều kiện bấm vào đâu cũng mở hộp đổi (chưa đủ sao ⇒ hộp nói còn thiếu bao nhiêu);
        // quà bị điều kiện chặn (cuối tuần / đủ lượt tháng) hoặc đang chờ trao: dòng chỉ cho xem, nói rõ lý do
        if (viQuaQua != null)
            foreach (var vq in viQuaQua.OrderBy(q => q.Sao))
            {
                var (chu, du) = ViQuaMayView.TrangThaiDoi(vq);
                var q = ChoHoQua(vq);
                var chan = vq.ChoTraoTu != null || (vq.Du && !vq.DoiDuoc);
                var nhan = AppConView.NhanQua(q);
                var ph = new List<Control>();
                if (du)
                {
                    var b = KhoiApp.NutGon($"Đổi {vq.Sao} sao", true, "qua", 40, 10.5f);
                    b.Click += (_, _) => MoDoiQua(q, sao);
                    ph.Add(b);
                }
                else ph.Add(chan ? KhoiApp.ChipCho(vq.ChoTraoTu != null ? "Chờ trao" : "Chưa đổi được") : KhoiApp.ChipSao(AppConView.Sao(vq.Sao)));
                var dong = KhoiApp.Dong(_cw, AppConView.IconQua(q), nhan != null ? $"{q.Ten}  ·  {nhan}" : q.Ten, chu, du ? Clay.NgocInk : null, ph.ToArray());
                if (!chan) BamCaDong(dong, () => MoDoiQua(q, sao));
                _content.Controls.Add(dong);
            }
        else
            foreach (var q in _ch!.Qua.OrderBy(q => q.SoSao))
            {
                var (chu, du) = AppConView.TrangThaiDoi(q, sao);
                var nhan = AppConView.NhanQua(q);
                var ph = new List<Control>();
                var qq = q;
                if (du)
                {
                    var b = KhoiApp.NutGon($"Đổi {q.SoSao} sao", true, "qua", 40, 10.5f);
                    b.Click += (_, _) => MoDoiQua(qq, sao);
                    ph.Add(b);
                }
                else ph.Add(KhoiApp.ChipSao(AppConView.Sao(q.SoSao)));
                var dong = KhoiApp.Dong(_cw, AppConView.IconQua(q), nhan != null ? $"{q.Ten}  ·  {nhan}" : q.Ten, chu, du ? Clay.NgocInk : null, ph.ToArray());
                BamCaDong(dong, () => MoDoiQua(qq, sao));
                _content.Controls.Add(dong);
            }
    }

    /// <summary>Quà của ví quà → quà của hộp đổi.</summary>
    private static HvQua ChoHoQua(ViQuaQua v) => new()
    {
        Id = v.Id, Ten = v.Ten, Loai = v.Loai, Diem = v.Sao, Sao = v.Sao, Du = v.Du, ConThieu = v.ConThieu, ChiCuoiTuan = v.DieuKien.ChiCuoiTuan,
        MenhGia = v.MenhGia, MoTa = v.MoTa, Hinh = v.Hinh, ToiDaThang = v.DieuKien.ToiDaThang, TonKho = v.DieuKien.TonKho, ChoTraoTu = v.ChoTraoTu,
    };

    /// <summary>Bấm vào đâu trên dòng quà cũng mở hộp đổi (trừ nút riêng của dòng).</summary>
    private static void BamCaDong(Control c, Action bam)
    {
        if (c is ButtonBase) return;
        c.Cursor = Cursors.Hand;
        c.Click += (_, _) => bam();
        foreach (Control con in c.Controls) BamCaDong(con, bam);
    }

    private void MoDoiQua(HvQua q, int sao)
    {
        using var h = new DoiQuaHop(q, sao);
        var lam = false;
        h.LamThemSao += () => lam = true;
        h.ShowDialog(this);
        if (lam) Select(MucApp.NhiemVu);
        _ = RefreshAsync();
    }

    /// <summary>con-ngay-thuong 16 / 24 «Quà của con»: chờ Ba Mẹ trao · đã nhận · voucher AiiCafe có mã QR vẽ tại máy · huy hiệu.</summary>
    private void RenderQuaCuaCon()
    {
        foreach (var a in _anhQr) a.Dispose();
        _anhQr.Clear();
        _title.Text = "Quà của con";
        _sub.Text = "";
        _content.Controls.Add(KhoiCon.LienKet("‹ Đổi thêm quà", null, () => { _xemQuaCuaCon = false; Render(); }));
        var now = DateTimeOffset.Now;
        var vi = _viQua;
        _content.Controls.Add(KhoiApp.NhanMuc("Chờ Ba Mẹ trao", _cw));
        var cho = vi?.PhieuCho.Select(p => (p.Ten, p.Sao)).ToList() ?? (_tq?.PhieuCho ?? new List<HvPhieu>()).Select(p => (p.Ten, Sao: p.Diem)).ToList();
        if (cho.Count == 0) _content.Controls.Add(T("Chưa có quà nào đang chờ.", 11.5f, false, UI.Muted));
        foreach (var p in cho)
            _content.Controls.Add(KhoiApp.Dong(_cw, "qua", p.Ten, AppConView.DangGiu(p.Sao, ngan: true), null, KhoiApp.ChipCho("Chờ trao")));

        // Voucher: còn dùng được ⇒ thẻ có ảnh QR (nội dung = trường qr, quầy quét) + mã + hạn; đã dùng / hết hạn ⇒ dòng gọn (3 phiếu gần nhất)
        var vc = ViQuaMayView.SapXepVoucher(vi?.Voucher ?? new List<ViQuaVoucher>(), now);
        var da = (vi?.DaTrao ?? new List<ViQuaDaTrao>()).Where(d => d.Voucher == null).ToList();
        _content.Controls.Add(KhoiApp.NhanMuc("Đã nhận", _cw));
        if (da.Count == 0 && vc.Count == 0) _content.Controls.Add(T(vi == null ? "Đang tải…" : "Ba Mẹ trao quà là con thấy ở đây.", 11.5f, false, UI.Muted));
        foreach (var v in vc)
            _content.Controls.Add(ViQuaMayView.DungDuoc(v, now) ? PhieuQr(v, now)
                : KhoiApp.Dong(_cw, "the_qua", ViQuaMayView.TenVoucher(v), $"Mã {v.Ma}", null, KhoiApp.ChipCho(ViQuaMayView.TrangThaiCu(v))));
        foreach (var d in da)
            _content.Controls.Add(KhoiApp.Dong(_cw, "the_qua", d.Ten, $"{d.Sao} sao" + (d.TraoLuc is { } x ? " · Ba Mẹ trao " + x.ToLocalTime().ToString("dd/MM") : ""), null, KhoiApp.ChipNgoc("Đã nhận")));

        if (vi?.HuyHieu.Count > 0)
        {
            _content.Controls.Add(KhoiApp.NhanMuc("Huy hiệu", _cw));
            foreach (var h in ViQuaMayView.HuyHieuMoiTruoc(vi.HuyHieu))
                _content.Controls.Add(KhoiApp.Dong(_cw, "the_qua", h.Ten, h.MoTa, null, KhoiApp.ChipNgoc("Đã đạt")));
        }
    }

    /// <summary>Thẻ phiếu còn dùng được: tên + «Còn N ngày», ảnh QR vẽ tại máy (ô đen trên nền trắng, có lề trắng), mã chữ, hạn.</summary>
    private Control PhieuQr(ViQuaVoucher v, DateTimeOffset now)
    {
        var the = TheDay(vang: false);
        var r = Trong(_cw);
        the.Controls.Add(KhoiApp.Dong(r, "the_qua", ViQuaMayView.TenVoucher(v), "Đưa mã QR này ở quầy AiiCafe", Clay.NgocInk, KhoiApp.ChipNgoc(ViQuaMayView.ConNgay(v, now))));
        var co = Px(220);
        Image? anh = null;
        try { anh = UI.AnhQr(MaQr.MaTran(v.Qr!), co); } catch (Exception) { /* nội dung lạ / quá dài cho QR: vẫn hiện mã chữ, không hỏng cả màn */ }
        if (anh != null)
        {
            _anhQr.Add(anh);
            var pb = new PictureBox { Image = anh, Size = new Size(co, co), SizeMode = PictureBoxSizeMode.Normal, BackColor = Color.White, Margin = new Padding(Math.Max(0, (r - co) / 2), Px(6), 0, Px(6)), AccessibleName = "Mã QR " + v.Ma };
            the.Controls.Add(pb);
        }
        var ma = T(ViQuaMayView.PhuVoucher(v), 11f, true, UI.Muted, r);
        ma.AutoSize = false; ma.Width = r; ma.TextAlign = ContentAlignment.TopCenter;
        the.Controls.Add(ma);
        return the;
    }

    // ---------------------------------------------------------------- Tin nhắn (con-ngay-thuong 17)

    private void RenderTinNhan()
    {
        _title.Text = "Tin nhắn";
        _sub.Text = "";
        var tq = _tq;
        if (tq == null && _tin == null)
        {
            _content.Controls.Add(T(!_s.Paired ? "Máy chưa ghép với Ba Mẹ nên chưa có tin nhắn." : _loiTai ?? "Đang tải…", 12.5f, false, _loiTai != null ? UI.Error : UI.Muted));
            return;
        }
        var the = TheDay();
        var r = Trong(_cw);
        var ds = (tq?.LoiKhen ?? new List<HvLoiKhen>()).OrderBy(l => l.Luc ?? DateTimeOffset.MinValue).ToList();
        if (ds.Count == 0) the.Controls.Add(T("Ba Mẹ nhắn là con thấy ở đây.", 11.5f, false, UI.Muted, r));
        foreach (var l in ds)
        {
            the.Controls.Add(Bong("Ba Mẹ" + (l.Luc is { } lc ? " · " + lc.ToLocalTime().ToString("HH:mm") : ""), l.NoiDung, false, r));
            if (!string.IsNullOrWhiteSpace(l.PhanHoi)) the.Controls.Add(Bong("Con", l.PhanHoi!, true, r));
        }
        var cho = tq == null ? null : AppConView.TinChoTraLoi(tq.LoiKhen);
        if (cho != null)
        {
            var chips = new List<Control>();
            foreach (var s in AppConView.TraLoiNhanh)
            {
                var b = KhoiApp.NutGon(s, false, null, 40, 10.5f);
                b.Margin = new Padding(0, 0, Px(8), 0);
                var ch = s;
                b.Click += async (_, _) => await TraLoiAsync(cho, ch);
                chips.Add(b);
            }
            the.Controls.Add(KhoiCon.Chips(r, chips.ToArray()));
            var hang = new TableLayoutPanel { ColumnCount = 2, RowCount = 1, Width = r, Height = ONhapClay.Than(_nhan) + VeThe.LeBong.Vertical, BackColor = Color.Transparent, Margin = Padding.Empty };
            hang.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            hang.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            hang.Controls.Add(ONhapClay.Boc(_nhan, r - Px(120)), 0, 0);
            var gui = KhoiApp.NutGon("Gửi", true, "gui", 44, 11.5f);
            gui.Click += async (_, _) => { if (_nhan.Text.Trim().Length > 0) await TraLoiAsync(cho, _nhan.Text); };
            hang.Controls.Add(gui, 1, 0);
            the.Controls.Add(hang);
        }
        _content.Controls.Add(the);

        if (_tin is { Ds.Count: > 0 })
        {
            _content.Controls.Add(KhoiApp.NhanMuc("Thông báo", _cw));
            var now = DateTimeOffset.Now;
            foreach (var x in _tin.Ds.Take(15))
            {
                var icon = x.Loai switch { "xac_nhan_qua" or "huy_qua" => "qua", "them_gio" => "dongho", "loi_khen" => "tin", "huy_hieu" => "sao", _ => "tick" };
                var chu = string.IsNullOrWhiteSpace(x.Noi) ? x.Tieu : $"{x.Tieu} · {x.Noi}";
                _content.Controls.Add(KhoiApp.Dong(_cw, icon, chu, x.Luc is { } l ? AppConView.LucNgan(l, now) : "", null));
            }
        }
    }

    /// <summary>Bong bóng tin: Ba Mẹ bên trái (thẻ sứ), Con bên phải (ngọc nhạt).</summary>
    private Control Bong(string ai, string noi, bool con, int r)
    {
        var w = Math.Min(r - Px(60), Math.Max(Px(200), TextRenderer.MeasureText(noi, UI.F(11.5f)).Width + Px(40)));
        var b = new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            BackColor = con ? Clay.NgocSoft : Clay.The, BoGoc = Px(20), MinimumSize = new Size(w, 0), MaximumSize = new Size(w, 0),
            Padding = VeThe.Pad(Px(14), Px(8), Px(14), Px(4)),
            Margin = new Padding(con ? r - w : 0, 0, 0, Px(4)),
        };
        var rw = w - b.Padding.Horizontal;
        var a = T(ai, 9.5f, true, con ? Clay.NgocInk : UI.Muted, rw); a.Margin = new Padding(0, 0, 0, Px(2));
        b.Controls.Add(a);
        b.Controls.Add(T(noi, 11.5f, false, UI.Ink, rw));
        return b;
    }

    private async Task TraLoiAsync(HvLoiKhen l, string noi)
    {
        if (_busy) return;
        var t = AppConView.CatTraLoi(noi);
        if (t.Length == 0) return;
        _busy = true;
        Say("Đang gửi…", false);
        var (kq, loi) = await HvApi.PostAsync<HvDongY>($"hoc-vien/loi-khen/{l.Id}/phan-hoi", new { phanHoi = t });
        _busy = false;
        if (IsDisposed) return;
        if (kq == null) { Say(loi ?? "Chưa gửi được. Con thử lại nhé.", true); return; }
        _nhan.Text = "";
        Say("Đã nhắn Ba Mẹ.", false);
        await RefreshAsync();
    }
}
