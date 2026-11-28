using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

internal sealed class TrayContext : ApplicationContext
{
    private readonly NotifyIcon _ni;
    private readonly ToolStripMenuItem _statusItem, _retryItem, _hoiItem, _doiBeItem, _khoaLaiItem, _thoatItem;
    private const string ChuDongBo = "Đồng bộ ngay";
    /// <summary>App lạ đã tự gửi lời xin duyệt trong phiên khay — Con mở lại liên tục không gửi lặp (máy chủ cũng gộp lời xin chờ).</summary>
    private readonly HashSet<string> _daXin = new(StringComparer.OrdinalIgnoreCase);
    private NhacSaoForm? _nhac;
    /// <summary>#822: trạng thái lượt trước để so — chỉ báo bé khi trạng thái ĐỔI (khoá / hết giờ chơi / Ba Mẹ thêm web).</summary>
    private TrangThaiBaoBe? _moc822;
    /// <summary>#822 / #823: cùng việc (khoá / Ba Mẹ mở) tới từ trạng thái dịch vụ và tin máy chủ ⇒ báo một lần.</summary>
    private ChongLapBao _chongLap = new();
    private HopThongBao? _hopBao;
    private string? _hopNhom;   // #822 / #823: nhóm của hộp đang mở (ba_me_khoa / ba_me_mo) — máy đổi trạng thái thì đóng hộp đã sai
    private bool _hopGop;
    private string? _nguoiHop;       // hộp đang mở gộp nhiều việc ⇒ tin máy chủ không thay (mất việc khác)
    /// <summary>15/11: màn «Sắp hết sao» / «Hết sao rồi» (LockForm.ChiBao — không khoá máy).</summary>
    private LockForm? _hetSao;
    private double? _phutTruoc;     // phút còn chơi ở lượt trạng thái trước (biết lúc VỪA hết sao trong khi đang chơi)
    private bool _daBaoHetSao;      // đã hiện «Hết sao rồi» cho lần hết sao này (Esc đóng thì không bật lại tới khi có sao)
    /// <summary>Lời xin vay Con đã gửi rồi đóng hộp khi còn chờ — khay tự hỏi kết quả và bật màn «cho vay rồi» / «chưa cho».</summary>
    private (string Id, int SoSao)? _vayChoF;
    private string? _vayBeId;
    /// <summary>Lời xin vay đang theo dõi; đặt / xoá là ghi / xoá tệp của người dùng (#686: khay khởi động lại vẫn theo dõi tiếp).</summary>
    private (string Id, int SoSao)? _vayCho
    {
        get => _vayChoF;
        set
        {
            _vayChoF = value;
            _vayBeId = _beId;
            _vayLoi.DatLai();
            try
            {
                if (value is { } v) { Directory.CreateDirectory(Path.GetDirectoryName(TepVayCho)!); File.WriteAllText(TepVayCho, new VayDangCho(v.Id, v.SoSao, DateTimeOffset.Now, _beId).Ghi()); }
                else if (File.Exists(TepVayCho)) File.Delete(TepVayCho);
            }
            catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        }
    }
    private static string TepVayCho => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiiGrow", "vay-cho.json");
    /// <summary>Máy chủ trả «không còn» vài lần liền ⇒ thôi theo dõi (tin «cho vay / chưa cho vay» của máy chủ vẫn báo Con). Mất mạng không tính.</summary>
    private readonly DemLoiHoi _vayLoi = new(5);

    /// <summary>Khay mới chạy: đọc lại lời xin vay đang theo dõi của lần chạy trước (còn hạn 24 giờ).</summary>
    private void KhoiPhucVayCho()
    {
        try
        {
            var v = File.Exists(TepVayCho) ? VayDangCho.Doc(File.ReadAllText(TepVayCho)) : null;
            if (v != null && v.ConHan(DateTimeOffset.Now)) { _vayChoF = (v.Id, v.SoSao); _vayBeId = v.BeId; }
            else if (v != null) File.Delete(TepVayCho);
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }
    private DateTimeOffset _vayHoiLuc;
    private int _soTuGui;               // số app lạ khay đã TỰ gửi lời xin hôm nay (không tính lời xin Con tự bấm)
    private DateOnly _ngayTuGui;
    private readonly System.Windows.Forms.Timer _timer = new() { Interval = 3000 };
    private AppForm? _app;
    private LockForm? _lock;
    private BlockedForm? _blocked;
    private TrayState _state = new();
    private DateTimeOffset _at = DateTimeOffset.Now;
    private int _seenBlocked = -1;
    private bool _polling;
    private bool _warned5, _warnedMo5, _warnedMoCoi;
    private bool _daChao;          // biểu tượng + lời chào chỉ hiện sau khi dịch vụ xác nhận đây là phiên của Con (BUG-007)
    private int _webRev = -1;      // -1 = chưa thấy lần nào (lần đầu chỉ ghi nhớ, không báo)

    // Trạng thái kết nối: biểu tượng khay + tooltip + dòng trạng thái ở menu và thanh bên app. Dịch vụ không trả lời 2 lần liền (≥6 giây) mới báo «không chạy».
    private KetNoiInfo _kn = KetNoiView.Chon(true, new TrayState { Paired = true });
    private int _pipeFail;
    private bool? _iconKetNoi;
    private bool _retrying;

    // Khay học viên: nhiệm vụ / phần quà / thông báo hai chiều với Ba Mẹ (AppForm). Hỏi tin mới mỗi 30 giây.
    private readonly System.Windows.Forms.Timer _hvTimer = new() { Interval = 30_000 };
    private readonly TinTracker _tin = new();
    private int _tinMoi;
    private bool _hvPolling;
    // Bóng báo vừa hiện dẫn tới mục nào của app to (bấm vào bóng báo trong 20 giây ⇒ mở đúng mục).
    private MucApp _toastMuc = MucApp.HomNay;
    private DateTimeOffset _toastAt = DateTimeOffset.MinValue;
    private readonly BatNhiemVu _bat = new();
    private bool AppDangHien => _app is { IsDisposed: false, Visible: true } a && a.WindowState != FormWindowState.Minimized;
    // Tự chạy lại bằng bản mới sau cập nhật (TheoDoiExe): dấu tệp exe lúc khay bật; _moLai = mục app cần mở lại khi khay cũ vừa chạy lại lúc app đang mở.
    private readonly TheoDoiExe? _exe = string.IsNullOrEmpty(Environment.ProcessPath) ? null : new TheoDoiExe(Environment.ProcessPath, TheoDoiExe.DocDia);
    private MucApp? _moLai;
    private bool _dangChayLai;

    public TrayContext(MucApp? moLai = null)
    {
        _moLai = moLai;
        KhoiPhucVayCho();
        try { if (File.Exists(TepHoanQt)) _nhacQt.DocHoan(File.ReadAllText(TepHoanQt)); } catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }   // #863
        XinThemForm.BeIdHienTai = () => _beId;
        // Menu khay theo Clay: nền thẻ sáng, mục được trỏ là viên bo ngọc nhạt, icon Fluent 3D nhỏ.
        var menu = new ContextMenuStrip { Renderer = new AiiGrow.ClayUi.ClayMenuRenderer(), Font = UI.F(10.5f), ImageScalingSize = new Size(UI.Px(20), UI.Px(20)) };
        // Thiết kế chốt 15/11 (con-mat-mang 13 them-g4d1cfk1): ● trạng thái · Đồng bộ ngay · Mở AiiGrow · Xin Ba Mẹ cho vay sao… · Kiểm tra cập nhật
        // · Thoát AiiGrow… (⇒ «Cần mã của Ba Mẹ», con-ngay-thuong 24) · dòng chân.
        // «Hỏi AiiGrow…» chỉ hiện khi mất mạng / AiiGrow lỗi (con-mat-mang 08–10).
        // #307 them-g4d1cfk1: dòng trạng thái chữ ngọc đậm «● Đã kết nối · còn 18 sao = 18 phút» (bấm ⇒ mở Hôm nay)
        _statusItem = new ToolStripMenuItem("● " + _kn.Dong, null, (_, _) => OpenApp(MucApp.HomNay)) { ForeColor = AiiGrow.ClayUi.Clay.NgocInk, Font = UI.F(10.5f, FontStyle.Bold) };
        _retryItem = new ToolStripMenuItem(ChuDongBo, Anh3D.Icon("lap"), async (_, _) => await RetryAsync());
        _hoiItem = new ToolStripMenuItem("Hỏi AiiGrow…", Anh3D.Icon("dau_hoi"), (_, _) => OpenHoiAiiGrow()) { Visible = false };
        menu.Items.Add(_statusItem);
        menu.Items.Add(_retryItem);
        menu.Items.Add(new ToolStripMenuItem("Mở AiiGrow", Anh3D.Icon("nha"), (_, _) => OpenApp(MucApp.HomNay)));
        menu.Items.Add("Xin Ba Mẹ cho vay sao…", Anh3D.Icon("gui"), (_, _) => OpenXinVay());
        menu.Items.Add(XinThemChonView.MenuKhay, Anh3D.Icon("cong"), (_, _) => OpenXinMo());   // #422 them-1bpjmixa
        menu.Items.Add("Kiểm tra cập nhật", Anh3D.Icon("tai"), (_, _) => OpenCapNhat());
        _thoatItem = new ToolStripMenuItem(ThoatView.Menu, Anh3D.Icon("khien"), (_, _) => OpenThoat()) { Visible = false };   // ThoatView.HienMenu
        menu.Items.Add(_thoatItem);
        menu.Items.Add(_hoiItem);
        // 06/11 (L13): máy dùng chung — «Đổi người / Đăng xuất» khi bé đang dùng, «Khoá lại» khi Ba Mẹ đang dùng
        _doiBeItem = new ToolStripMenuItem("Đổi người / Đăng xuất…", Anh3D.Icon("nguoi"), (_, _) => MoDoiBe()) { Visible = false };
        _khoaLaiItem = new ToolStripMenuItem("Khoá lại (Ba Mẹ xong việc)", Anh3D.Icon("khoa"), async (_, _) => await RoiMayAsync(khoaLai: true)) { Visible = false };
        menu.Items.Add(_doiBeItem);
        menu.Items.Add(_khoaLaiItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Máy này do Ba Mẹ quản lý bằng AiiGrow") { Enabled = false });
        menu.Items.Add(new ToolStripMenuItem("AiiGrow bản " + TuCapNhat.BanHienTai().ToString(3), null, (_, _) => { }) { Font = UI.F(10.5f, FontStyle.Bold) });   // #639/#670: mục bật (không xám) để đọc rõ, chỉ để xem

        _ni = new NotifyIcon
        {
            Icon = UI.TrayIcon(true),
            Text = "AiiGrow",
            Visible = false,   // hiện khi dịch vụ xác nhận phiên của Con (xem Chao) — phiên Ba Mẹ không thấy biểu tượng nháy lên rồi tắt
            ContextMenuStrip = menu,
        };
        _iconKetNoi = true;
        // Nhấn (đúp) biểu tượng ⇒ mở app to. Cả nhấn đơn lẫn đúp đều gọi OpenApp, cửa sổ chỉ có một bản nên lần hai chỉ đưa lên trước.
        _ni.MouseClick += (_, e) => { if (e.Button == MouseButtons.Left) OpenApp(MucApp.HomNay); };
        // Bấm vào bóng báo «nhiệm vụ mới / Ba Mẹ phản hồi / Còn 5 phút…» ⇒ mở app to đúng mục.
        _ni.BalloonTipClicked += (_, _) => { if ((DateTimeOffset.Now - _toastAt).TotalSeconds < 20) OpenApp(_toastMuc, true); };


        _timer.Tick += async (_, _) => await TickAsync();
        _timer.Start();
        _ = TickAsync();

        _hvTimer.Tick += async (_, _) => await HocVienTickAsync();
        _hvTimer.Start();
        _ = HocVienTickAsync();
    }

    /// <summary>Lần đầu biết đây là phiên của Con (hoặc dịch vụ không chạy ⇒ Con cần thấy lỗi): hiện biểu tượng + lời chào.</summary>
    private bool _daLoiChao;      // lời chào + «đã cập nhật» chỉ khi dịch vụ đã trả lời — hiện biểu tượng sớm (dịch vụ chưa lên) không được nuốt lời chào

    private void Chao(bool coLoiChao)
    {
        _daChao = true;
        if (!_ni.Visible) _ni.Visible = true;
        if (!coLoiChao || _daLoiChao) return;
        _daLoiChao = true;
        Toast(5000, "AiiGrow đang bật", "1 sao = 1 phút chơi. Bấm vào AiiGrow cạnh đồng hồ để xem sao và nhiệm vụ của con.", ToolTipIcon.Info, MucApp.HomNay);
        BaoCapNhat.NeuVuaCapNhat(_ni);   // #33: «đã cập nhật lên bản X» (một lần mỗi tài khoản)
    }

    private bool _anPhienKhac;
    private DateTimeOffset _anPhienKhacTu;
    private bool _daBietPhien;   // dịch vụ đã trả lời ít nhất một lần (biết phiên này có phải của Con)

    /// <summary>Phiên KHÔNG phải của Con (Ba Mẹ / tài khoản quản trị): khay ẩn, đóng màn khoá / màn chặn, ngừng hỏi máy chủ, chỉ hỏi dịch vụ thưa (6 giây) — KHÔNG thoát hẳn:
    /// quyết định dựa trên danh sách tài khoản dịch vụ đọc 2 phút/lần, có thể cũ (cài một chạm: Con vừa bị gỡ quyền quản trị) ⇒ đúng lại thì hiện lại (BUG-007, review #75).</summary>
    private void AnVoiPhienKhac()
    {
        if (_anPhienKhac) { _ni.Visible = false; return; }
        _anPhienKhac = true;
        _anPhienKhacTu = DateTimeOffset.Now;
        _hvTimer.Stop();
        // hỏi dịch vụ (pipe cục bộ, rẻ) mỗi 6 giây: phân loại nhầm (danh sách tài khoản cũ) thì Con có lại màn khoá / màn chặn sớm
        _timer.Interval = 6000;
        _ni.Visible = false;
        if (_app is { IsDisposed: false }) _app.Hide();
        if (_lock is { IsDisposed: false }) { try { _lock.CloseForReal(); _lock.Dispose(); } catch { } }
        _lock = null;
        if (_blocked is { IsDisposed: false }) { try { _blocked.Close(); _blocked.Dispose(); } catch { } }
        _blocked = null;
    }

    private void HienLaiNeuDaAn()
    {
        if (!_anPhienKhac) return;
        _anPhienKhac = false;
        _timer.Interval = 3000;
        _hvTimer.Start();
        if (_daChao) _ni.Visible = true;
    }

    /// <summary>Bóng báo trên khay; nhớ mục để bấm vào thì mở đúng chỗ.</summary>
    private void Toast(int ms, string title, string text, ToolTipIcon icon, MucApp muc)
    {
        _toastMuc = muc;
        _toastAt = DateTimeOffset.Now;
        // E: bong bóng khay dùng icon AiiGrow (ToolTipIcon.None, không «i» xanh) thay «i» xanh / tam giác vàng của hệ thống
        _ni.ShowBalloonTip(ms, title, text, ToolTipIcon.None);
    }

    /// <summary>Mở app to (một bản duy nhất; đã mở thì đưa lên trước). <paramref name="tuToast"/> = bấm từ bóng báo ⇒ coi như đã xem tin mới.
    /// <paramref name="tuBat"/> = khay tự bật (nhiệm vụ mới), không do Con bấm ⇒ ép cửa sổ nổi lên trên cùng.</summary>
    /// <param name="tuManKhoa">Con bấm «Nhắn Ba Mẹ» trên màn khoá ⇒ mở app to NỔI TRÊN màn khoá (chỉ để nhắn tin).</param>
    private void OpenApp(MucApp? muc, bool tuToast = false, bool tuBat = false, bool tuManKhoa = false)
    {
        if (_state.Locked && !tuManKhoa) { Toast(4000, "Máy đang khoá", "Khi máy mở lại, con xem nhiệm vụ và sao nhé.", ToolTipIcon.Info, MucApp.HomNay); return; }
        // 06/11 (L13): Ba Mẹ đang dùng máy ⇒ app của Con không có bé nào để hiện
        if (_state.NguoiDung == LoaiNguoiDung.BaMe) { Toast(5000, "Ba Mẹ đang dùng máy", "Không trừ sao của con. Xong việc Ba Mẹ bấm «Khoá lại».", ToolTipIcon.Info, MucApp.HomNay); return; }
        // exe đã bị bộ cập nhật thay mà khay này chưa kịp chạy lại ⇒ dựng app ở bản cũ sẽ nạp thư viện hỏng (lỗi máy 04) ⇒ chạy lại ngay, bản mới mở đúng mục này
        if ((_app == null || _app.IsDisposed) && _exe?.DaKhacGoc() == true && ChayLai(muc)) return;
        if (_app == null || _app.IsDisposed)
        {
            _app = new AppForm();
            _app.TinDaXem += () => _tinMoi = 0;
            _app.RetryClicked += () => _ = RetryAsync();
            _app.XinMoClicked += () => OpenXinMo();
            _app.HoiAiiGrowClicked += () => OpenHoiAiiGrow();
            _app.DoiBeClicked += () => MoDoiBe();
            _app.BaMeDungClicked += () => MoBaMeMa();
            _app.XinVayClicked += sd => OpenXinVay(_app, saoDung: sd);
        }
        if (tuToast) _tinMoi = 0;
        if (GiuTrenCung.CanDatTopMost(_app.TopMost, tuManKhoa)) _app.TopMost = tuManKhoa;
        PushApp();
        _app.ShowFront(muc, tuBat || tuManKhoa);
    }

    /// <summary>#308: Con bấm AiiGrow (menu Start / biểu tượng màn hình) khi khay đang chạy ⇒ bản mới báo về đây (Program.cs) ⇒ mở app to lên trước.
    /// Phiên không phải của Con ⇒ bỏ qua (khay đang ẩn ở phiên Ba Mẹ). Máy khoá / Ba Mẹ đang dùng ⇒ OpenApp báo bằng bóng báo như bấm biểu tượng khay.</summary>
    /// <remarks>Chưa biết phiên (dịch vụ chưa trả lời / chưa chào) ⇒ chỉ ghi nhớ, mở ở <see cref="MoNeuDangCho"/> sau lượt trạng thái đầu.
    /// Phiên Ba Mẹ / quản trị ⇒ bỏ. Máy khoá / Ba Mẹ đang dùng máy ⇒ không mở app Con (OpenApp chỉ hiện bóng báo). App đang mở ⇒ giữ nguyên mục, chỉ đưa lên trước.</remarks>
    internal void MoTuLanBamLai()
    {
        try
        {
            if (_anPhienKhac) { _choMo = false; return; }
            if (!_daChao) { _choMo = true; return; }
            _choMo = false;
            OpenApp(null, tuBat: true);
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }

    private bool _choMo;   // Con bấm mở lúc khay chưa biết phiên ⇒ mở sau lượt trạng thái đầu

    private void MoNeuDangCho()
    {
        if (_choMo) MoTuLanBamLai();
    }

    private void PushApp()
    {
        if (_app == null || _app.IsDisposed) return;
        _app.TinMoi = _tinMoi;
        _app.Apply(_state, _at, _kn);
    }

    private void SetKetNoi(KetNoiInfo info, bool stateFresh)
    {
        _kn = info;
        if (_iconKetNoi != info.DungIconKetNoi)
        {
            _iconKetNoi = info.DungIconKetNoi;
            _ni.Icon = UI.TrayIcon(info.DungIconKetNoi);
        }
        _ni.Text = KetNoiView.Tooltip(info, stateFresh ? _state : null, _at, DateTimeOffset.Now);
        _statusItem.Text = KetNoiView.DongMenu(info, stateFresh ? _state : null);
        _hoiItem.Visible = !info.DungIconKetNoi;
        _thoatItem.Visible = stateFresh && ThoatView.HienMenu(_state);   // dịch vụ không trả lời / Ba Mẹ đang dùng / chưa ai vào ⇒ ẩn
        PushApp();
    }

    /// <summary>«Thử kết nối lại»: bảo dịch vụ đồng bộ ngay, rồi hỏi lại trạng thái hai lần và báo kết quả.</summary>
    private async Task RetryAsync()
    {
        if (_retrying) return;
        _retrying = true;
        _retryItem.Enabled = false;
        _retryItem.Text = "Đang đồng bộ…";
        try
        {
            await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });
            await Task.Delay(2500);
            _pipeFail = 2;   // lần này kết quả thật quyết định ngay, không chờ thêm một lượt
            await TickAsync();
            if (!_kn.DungIconKetNoi) { await Task.Delay(4000); await TickAsync(); }
            Toast(6000, _kn.DungIconKetNoi ? "Đã kết nối" : "Chưa kết nối được", _kn.DungIconKetNoi ? _kn.Dong : _kn.Dong + ". " + _kn.Huong,
                _kn.DungIconKetNoi ? ToolTipIcon.Info : ToolTipIcon.Warning, MucApp.HomNay);
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally
        {
            _retrying = false;
            _retryItem.Enabled = true;
            _retryItem.Text = ChuDongBo;
            PushApp();
        }
    }

    /// <summary>Hỏi tin mới của Con (nhiệm vụ mới, Ba Mẹ duyệt / từ chối / nhắn, quà đã trao) → bóng báo trên khay. Lỗi mạng thì lặng lẽ thử lại lần sau.</summary>
    private async Task HocVienTickAsync()
    {
        if (_hvPolling || !_state.Paired || _state.MoCoi || _state.NguoiDung != LoaiNguoiDung.Con) return;   // 06/11: chưa có bé đăng nhập ⇒ không có tin của ai
        _hvPolling = true;
        try
        {
            var path = "hoc-vien/tin" + (_tin.Moc is { } m ? "?sau=" + Uri.EscapeDataString(m.ToString("O")) : "");
            var (r, _) = await HvApi.GetAsync<HvTinDs>(path);
            if (r == null) return;
            var moi = _tin.Nhan(r);
            // #759: Ba Mẹ hoàn tác lượt duyệt khay đã báo ⇒ đóng popup «Ba Mẹ duyệt rồi!» / «Giỏi lắm!» của ĐÚNG tin đó + báo «Ba Mẹ đã hoàn tác»
            var thuHoi = _tin.ThuHoi(r);
            if (thuHoi.Count > 0 && _ketQua is { IsDisposed: false } kh && _ketQuaTinId != null && thuHoi.Any(x => x.Id == _ketQuaTinId)) kh.DongLang();
            // #757: Ba Mẹ trao / từ chối quà vừa đổi ⇒ hộp «Đã gửi Ba Mẹ · Chờ Ba Mẹ trao quà…» tự đóng (bóng báo ghi kết quả)
            if (moi.Count > 0 && DoiQuaHop.DangCho is { IsDisposed: false } dq && HocVienView.XongQuaCho(moi, dq.TenQua)) dq.Close();
            if (thuHoi.Count > 0 && moi.Count == 0)
            {
                var (tt, nt) = HocVienView.ThuHoiText(thuHoi);
                Toast(8000, tt, nt, ToolTipIcon.Info, MucApp.NhiemVu);
                if (_app is { Visible: true }) _ = _app.RefreshAsync();
            }
            if (moi.Count > 0)
            {
                _tinMoi += moi.Count;
                if (_app is { Visible: true }) _ = _app.RefreshAsync();       // app đang mở ⇒ cập nhật luôn, bóng báo vẫn hiện nhẹ
                // #822 / #823: Ba Mẹ khoá máy / mở khẩn cấp ⇒ hộp AiiGrow (không chỉ bóng báo), chỉ khi máy ĐÚNG đang khoá / đang mở (mở khẩn cấp không gỡ
                // giờ ngủ / khoá ngay; Ba Mẹ đang dùng máy thì khoá chưa áp) — chưa đúng thì để đường trạng thái báo khi máy đổi thật
                // Tin (có giờ) THAY hộp chung cùng việc còn đang mở; bé đã đóng hộp đó (trong 3 phút) thì thôi — một việc một hộp.
                // Không hiện được (máy chưa đúng trạng thái / hộp gộp nhiều việc đang mở) ⇒ tin vẫn đi bóng báo, không mất giờ Ba Mẹ đặt.
                var daHop = false;
                if (BaoTuTin.MoiNhat(moi) is { } bt)
                {
                    var bay = DateTimeOffset.Now;
                    var hopMo = _hopBao is { IsDisposed: false };
                    if (!BaoTuTin.KhopTrangThai(bt.Nhom, _state, bay) || (_hopGop && hopMo)) { }
                    else { daHop = true; if (_chongLap.NenHien(bt, bay, tuTin: hopMo && _hopNhom == bt.Nhom)) HienHopAiiGrow(bt.Icon, bt.Tieu, bt.Phu, bt.Nhom); }
                }
                var thuong = daHop ? BaoTuTin.ConLai(moi) : moi;
                // cùng lượt có cả tin mới lẫn hoàn tác ⇒ MỘT bóng báo (bóng sau đè bóng trước): «Có N tin mới» gồm cả «Ba Mẹ đã hoàn tác»
                var bong = thuHoi.Count > 0 ? thuong.Append(HocVienView.TinThuHoi(thuHoi)).ToList() : thuong;
                if (bong.Count > 0)
                {
                    var (tieu, noi) = HocVienView.ToastText(bong, (_state.No ?? 0) > 0);
                    Toast(8000, tieu, noi, ToolTipIcon.Info, HocVienView.MucChoTin(thuong.Count > 0 ? thuong : moi));
                }
                // Nhiệm vụ mới ⇒ bật app to ngay mục Nhiệm vụ (đang khoá ⇒ chờ mở khoá; app đang hiện / Con đang toàn màn hình / vừa bật ⇒ chỉ bóng báo)
                if (_bat.Nhan(HocVienView.CoNhiemVuMoi(moi), _state.Locked, AppDangHien, UI.DangBanToanManHinh(), DateTimeOffset.Now))
                    OpenApp(MucApp.NhiemVu, tuBat: true);
                // 05/11: Ba Mẹ duyệt / nhờ làm lại / trao quà / cho thêm giờ ⇒ màn kết quả (con-ngay-thuong 09/11/12/26) — không khi máy khoá / Con đang toàn màn hình
                else if (AppConView.ChonTinKetQua(moi) is { } tk && tk.Kq is var kq && !_state.Locked && !UI.DangBanToanManHinh() && !(kq.Loai is "da_them" or "chua_them" && (_blocked is { IsDisposed: false } || (_xinThem is { IsDisposed: false } x && string.Equals(x.Ten, kq.Ten, StringComparison.OrdinalIgnoreCase)))))
                    _ = HienKetQuaAsync(kq, tk.Tin.Id);
            }
            PushApp();
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally { _hvPolling = false; }
    }

    /// <summary>«Xin Ba Mẹ cho vay sao» / «Sao dùng thế nào?» (XinVayForm). Màn khoá / màn hết sao gọi với chủ là màn đó.</summary>
    private void OpenXinVay(IWin32Window? chu = null, bool saoDung = false, Action? quayLaiHetSao = null)
    {
        string? sau;
        XinVayForm.AppDs.AppTinh = TrayView.TenTinh(_state);
        XinVayForm.AppDs.AppKhong = TrayView.TenKhongTinh(_state);
        using (var f = new XinVayForm(saoDung, tuHetSao: quayLaiHetSao != null))
        {
            if (chu != null) f.ShowDialog(chu); else f.ShowDialog();
            sau = f.Sau;
            if (f.ChoId is { } id) { _vayCho = (id, f.SoDaXin); _vayHoiLuc = DateTimeOffset.MinValue; _vayDaBao = false; }
        }
        var tuKhoa = chu != null && (_state.Locked || chu == _hetSao);
        switch (sau)
        {
            case XinVayForm.SauXinMo: OpenXinMo(); break;
            case XinVayForm.SauHetSao: quayLaiHetSao?.Invoke(); break;
            case XinVayForm.SauNhan: OpenApp(MucApp.TinNhan, tuManKhoa: tuKhoa); break;
            case XinVayForm.SauNhiemVu: DongHetSao(); OpenApp(MucApp.NhiemVu, tuManKhoa: _state.Locked && chu != null); break;
        }
        _app?.RefreshSoon();
    }

    private HashSet<string>? _xinBoDaBao;
    private static string TepXinBoDaBao => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiiGrow", "xin-bo-da-bao.txt");

    /// <summary>#684: lời xin lưu lúc mất mạng bị bỏ chưa tới Ba Mẹ (máy chủ từ chối, quá hạn, gửi lỗi nhiều lần) ⇒ bóng báo đúng bé đã xin —
    /// mỗi mục một lần (nhớ qua tệp: khay chạy lại không báo lại), một bóng mỗi lượt; vừa có bóng khác (cảnh báo còn 5 phút…) thì để lượt sau, không đè.</summary>
    private void HandleXinBo()
    {
        if (_state.Locked || _state.NguoiDung != LoaiNguoiDung.Con || _state.XinBo.Count == 0 || (DateTimeOffset.Now - _toastAt).TotalSeconds < 12) return;
        if (_xinBoDaBao == null)
        {
            _xinBoDaBao = new();
            try { if (File.Exists(TepXinBoDaBao)) _xinBoDaBao.UnionWith(File.ReadAllLines(TepXinBoDaBao)); }
            catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        }
        foreach (var x in _state.XinBo)
        {
            if (x.BeId != null && x.BeId != _state.BeId) continue;   // máy dùng chung: lời xin của bé khác
            if (!_xinBoDaBao.Add(x.Ma)) continue;
            Toast(10000, XinBoView.Tieu, XinBoView.Cau(x), ToolTipIcon.Info, MucApp.HomNay);
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(TepXinBoDaBao)!);
                File.WriteAllLines(TepXinBoDaBao, _xinBoDaBao.Where(m => _state.XinBo.Any(i => i.Ma == m)));   // chỉ giữ mục dịch vụ còn giữ (24 giờ)
            }
            catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
            break;
        }
    }

    private DateTimeOffset _xinAwHoiLuc;
    private int _xinAwDangHoi;
    private readonly Dictionary<string, DemLoiHoi> _xinAwLoi = new();

    /// <summary>#727 (#686): lời xin app / web còn chờ (tệp, sống qua khởi động lại khay — hoặc Con đóng hộp khi còn chờ) ⇒ hỏi trạng thái, có trả lời thì bóng báo đúng bé đã xin.</summary>
    private async Task TheoDoiXinAppWebAsync()
    {
        if (_state.Locked || _state.NguoiDung != LoaiNguoiDung.Con || (DateTimeOffset.Now - _xinAwHoiLuc).TotalSeconds < 15 ) return;
        if (Interlocked.Exchange(ref _xinAwDangHoi, 1) == 1) return;
        try
        {
            _xinAwHoiLuc = DateTimeOffset.Now;
            var now = DateTimeOffset.Now;
            foreach (var x in XinAppWebCho.Doc(XinThemForm.TepXinCho, now))
            {
                if (x.BeId != null && x.BeId != _state.BeId) continue;   // máy dùng chung: lời xin của bé khác
                if (XinThemForm.DangTheoDoi.Contains(x.Id)) continue;   // hộp đang mở tự theo dõi id này
                var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = x.Id });
                if (!_xinAwLoi.TryGetValue(x.Id, out var dem)) _xinAwLoi[x.Id] = dem = new DemLoiHoi(5);
                if (dem.Ghi(r)) { XinAppWebCho.Xoa(XinThemForm.TepXinCho, x.Id, now); _xinAwLoi.Remove(x.Id); continue; }
                if (!r.Ok) continue;
                var kq = TrayView.XinGio(r.Status);
                if (kq == TrayView.KetQuaXin.Cho) continue;
                if (_state.Locked) return;
                XinAppWebCho.Xoa(XinThemForm.TepXinCho, x.Id, now);
                _xinAwLoi.Remove(x.Id);
                if (kq == TrayView.KetQuaXin.Duoc) _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });
                Toast(10000, "Ba Mẹ trả lời", XinMoView.ThongBao(kq, string.IsNullOrWhiteSpace(x.Ten) ? x.Muc : x.Ten), ToolTipIcon.Info, MucApp.HomNay);
                break;   // một bóng mỗi lượt
            }
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally { Interlocked.Exchange(ref _xinAwDangHoi, 0); }
    }

    /// <summary>Lời xin vay còn chờ sau khi Con đóng hộp: hỏi dịch vụ mỗi 15 giây, có kết quả thì bật màn (them-fsif1cbl / them-zo8kohea).</summary>
    private async Task TheoDoiVayAsync()
    {
        // máy đang khoá ⇒ chưa hỏi, giữ lời xin: mở khoá rồi mới báo kết quả
        if (_vayCho is not { } v || _state.Locked || (DateTimeOffset.Now - _vayHoiLuc).TotalSeconds < 15 || XinVayForm.DangMo > 0) return;
        if (_state.NguoiDung != LoaiNguoiDung.Con || _state.BeId != _vayBeId) return;   // chưa ai / Ba Mẹ đang dùng ⇒ chờ bé đã xin quay lại
        _vayHoiLuc = DateTimeOffset.Now;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = v.Id });
        if (_vayCho?.Id != v.Id) return;
        if (_vayLoi.Ghi(r)) { _vayCho = null; return; }    // #686: máy chủ báo lời xin không còn ⇒ thôi, không treo vô hạn
        if (!r.Ok) return;
        var kq = TrayView.XinGio(r.Status);
        if (kq == TrayView.KetQuaXin.Cho) return;
        if (_state.Locked) return;   // vừa khoá trong lúc hỏi ⇒ giữ, lượt sau
        _vayCho = null;
        if (kq == TrayView.KetQuaXin.HetHan) return;
        var (sao, _) = await HvApi.GetAsync<HvSao>("hoc-vien/sao");
        if (kq == TrayView.KetQuaXin.Duoc) _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });
        _vayDaBao = true;
        var f = new XinVayForm(taiNgay: false);
        if (kq == TrayView.KetQuaXin.Duoc) f.VeDuoc(r.KetQua?.TenNguoiDuyet, r.KetQua?.LoiNhan, v.SoSao, sao);
        else f.VeChuaCho(r.KetQua?.TenNguoiDuyet, r.KetQua?.LoiNhan, sao);
        f.FormClosed += (_, _) =>
        {
            var sau = f.Sau;
            f.Dispose();
            if (sau == XinVayForm.SauNhiemVu) OpenApp(MucApp.NhiemVu);
            else if (sau == XinVayForm.SauNhan) OpenApp(MucApp.TinNhan);
        };
        f.Show();
    }

    private KetQuaHop? _ketQua;
    /// <summary>Id tin của hộp đang hiện ở <see cref="_ketQua"/> (hộp «Giỏi lắm!» mang id tin duyệt mở ra nó) — #759: Ba Mẹ hoàn tác đúng tin đó ⇒ đóng hộp.</summary>
    private string? _ketQuaTinId;
    private bool _dangMoKetQua;

    /// <summary>Màn kết quả Ba Mẹ trả lời (một hộp một lúc). Số sao trước / sau và lời khen đọc từ tổng quan mới nhất.</summary>
    private async Task HienKetQuaAsync(KetQuaTin kq, string? tinId = null)
    {
        if (_ketQua is { IsDisposed: false } || _dangMoKetQua) return;
        if (kq.Loai is "cho_vay" or "chua_vay") { await HienKetQuaVayAsync(kq); return; }
        _dangMoKetQua = true;   // giữ chỗ qua lượt await — hai lượt tin gần nhau không mở hai hộp
        HvTongQuan? tq;
        int? saoQua = null;   // them-dm6hkqqy: quà đã trao ⇒ «Đổi 30 sao · 30 → 0 sao» (giá quà lấy từ cửa hàng)
        try
        {
            (tq, _) = await HvApi.GetAsync<HvTongQuan>("hoc-vien/tong-quan");
            if (kq.Loai == "trao_qua" && kq.Phut == null)
            {
                var (ch, _) = await HvApi.GetAsync<HvCuaHang>("hoc-vien/cua-hang");
                if (ch?.Qua.FirstOrDefault(q => string.Equals(q.Ten, kq.Ten, StringComparison.OrdinalIgnoreCase)) is { SoSao: > 0 } q0) saoQua = q0.SoSao;
            }
        }
        finally { _dangMoKetQua = false; }
        if (_state.Locked || _ketQua is { IsDisposed: false } || _tin.DaThuHoi(tinId)) return;   // #759: Ba Mẹ hoàn tác lúc đang tải ⇒ không mở
        var h = kq.Loai switch
        {
            "duyet" => HopDuyet(kq, tq),
            "lam_lai" => HopLamLai(kq, tq),
            "trao_qua" => HopTraoQua(kq, tq, saoQua),
            "da_them" => HopDaThem(kq, tq),
            _ => HopChuaThem(kq),
        };
        _ketQua = h; _ketQuaTinId = tinId;
        h.FormClosed += (_, e) =>
        {
            // chỉ coi là «bấm ×» khi người dùng đóng (không phải tắt máy / thoát app / khay tự đóng lúc đổi bé — DongLang) và máy không khoá
            var dongX = !h.DaBam && e.CloseReason == CloseReason.UserClosing && !_state.Locked;
            h.Dispose();
            if (_ketQua == h) { _ketQua = null; _ketQuaTinId = null; }
            // 14/11 (con-ngay-thuong 14 → 25): đóng «Ba Mẹ duyệt rồi!» bằng × ⇒ «Giỏi lắm! N ngày liền» (mỗi ngày một lần)
            if (dongX && kq.Loai == "duyet" && tq != null && ChuoiView.NenHien(tq.Chuoi, _mung.DaMung(_beId)) && !_state.Locked && !_tin.DaThuHoi(tinId)) HienChuoi(tq, kq.Sao ?? 0, tinId);
        };
        h.Show();
    }

    /// <summary>Tin «Mẹ Lan cho vay 15 sao» / «chưa cho vay sao» (máy chủ báo sau 60 giây Hoàn tác) ⇒ màn them-fsif1cbl / them-zo8kohea — trừ khi hộp xin vay
    /// đang mở hoặc khay đã tự báo qua lời xin đang theo dõi.</summary>
    private async Task HienKetQuaVayAsync(KetQuaTin kq)
    {
        if (XinVayForm.DangMo > 0 || _vayDaBao) { _vayDaBao = false; return; }
        _vayCho = null;
        var (sao, _) = await HvApi.GetAsync<HvSao>("hoc-vien/sao");
        if (_state.Locked) return;
        if (kq.Loai == "cho_vay") _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });
        var f = new XinVayForm(taiNgay: false);
        if (kq.Loai == "cho_vay") f.VeDuoc(kq.Nguoi, null, kq.Sao ?? 0, sao); else f.VeChuaCho(kq.Nguoi, kq.LoiNhan, sao);
        f.FormClosed += (_, _) =>
        {
            var sau = f.Sau;
            f.Dispose();
            if (sau == XinVayForm.SauNhiemVu) OpenApp(MucApp.NhiemVu);
            else if (sau == XinVayForm.SauNhan) OpenApp(MucApp.TinNhan);
        };
        f.Show();
    }

    /// <summary>Khay vừa báo kết quả lời xin vay (theo dõi trạng thái) ⇒ tin cùng kết quả đến sau không bật thêm màn.</summary>
    private bool _vayDaBao;

    private readonly MungChuoi _mung = new();   // ngày (giờ gia đình) đã hiện «Giỏi lắm!» — mỗi ngày một lần, theo từng bé

    /// <summary>«Giỏi lắm!» (con-ngay-thuong 25 them-jonn19rd, 428×400): Rob sao · «5 ngày liền!» · 7 ô ngày · Cấp (Mới lên!) → cấp sau · +N · «Tuyệt! Nhận N sao».</summary>
    private void HienChuoi(HvTongQuan tq, int vuaCong, string? tinId = null)
    {
        var c = tq.Chuoi!;
        _mung.Ghi(_beId, c.Tuan[^1].Ngay);
        var h = new KetQuaHop("Giỏi lắm!")
            .Rob("sao", c.SoNgay.ToString(), "ngày liền!", ChuoiView.Phu(c.SoNgay))
            .Tuan(c.Tuan)
            .Cap(tq.CapDo.Cap, ChuoiView.MoiLenCap(tq.CapDo, tq.TongKiem, vuaCong), vuaCong);
        h.Nut(vuaCong > 0 ? $"Tuyệt! Nhận {vuaCong} sao" : "Tuyệt!", true, "sao", () => OpenApp(MucApp.NhiemVu));
        _ketQua = h; _ketQuaTinId = tinId;
        h.FormClosed += (_, e) =>
        {
            // chỉ coi là «bấm ×» khi người dùng đóng (không phải tắt máy / thoát app / khay tự đóng lúc đổi bé — DongLang) và máy không khoá
            var dongX = !h.DaBam && e.CloseReason == CloseReason.UserClosing && !_state.Locked;
            h.Dispose();
            if (_ketQua == h) { _ketQua = null; _ketQuaTinId = null; }
            if (dongX) OpenApp(MucApp.HomNay);   // người bấm × ⇒ Hôm nay (thiết kế .xa → cmt-hom-nay)
        };
        h.Show();
    }

    private KetQuaHop HopDuyet(KetQuaTin kq, HvTongQuan? tq)
    {
        var sao = tq?.SoSao;
        var them = kq.Sao ?? 0;
        var khen = tq?.Gan.FirstOrDefault(g => g.TrangThai == "duoc_duyet" && g.Ten == kq.Ten)?.LoiKhen;
        return new KetQuaHop("Nhiệm vụ")
            .Dau("phao_hoa", KhoiCon.Mau.Vang, "Ba Mẹ duyệt rồi!", kq.Ten)
            .Chip($"+{them} sao", true, sao is int s ? AppConView.TruocSau(s, them) : null)
            .Loi("Ba Mẹ", khen)
            .Nut("Xem sao & đổi quà", true, "sao", () => OpenApp(MucApp.PhanQua))
            .Nut("Làm việc tiếp theo", false, "tick", () => OpenApp(MucApp.NhiemVu));
    }

    private KetQuaHop HopLamLai(KetQuaTin kq, HvTongQuan? tq)
    {
        var nv = tq?.NhiemVu.FirstOrDefault(v => v.Ten == kq.Ten);
        var ghiAm = nv?.BangChung == "ghi_am";
        var anh = nv == null || nv.BangChung is "anh" or "video";
        return new KetQuaHop("Nhiệm vụ")
            .Dau("tro_lai", KhoiCon.Mau.Cam, anh ? "Ba Mẹ nhờ chụp lại ảnh" : "Ba Mẹ nhờ con làm lại", kq.Ten)
            .Loi("Ba Mẹ", kq.LoiNhan ?? nv?.LoiNhan ?? nv?.LyDo)
            .Chip($"+{nv?.SoSao ?? 0} sao", true, anh ? "Chưa cộng sao · chụp lại để nhận" : ghiAm ? "Chưa cộng sao · ghi lại để nhận" : "Chưa cộng sao · làm lại để nhận")
            .Nut(anh ? "Chụp lại ảnh cho Ba Mẹ" : ghiAm ? "Ghi âm lại cho Ba Mẹ" : "Làm lại cho Ba Mẹ", true, anh ? "camera" : ghiAm ? "tai" : "tick", () => OpenApp(MucApp.NhiemVu))
            .LienKet("Để sau", null, null);
    }

    private KetQuaHop HopTraoQua(KetQuaTin kq, HvTongQuan? tq, int? saoQua = null)
    {
        var h = new KetQuaHop("Quà").Dau("qua", KhoiCon.Mau.Vang, "Ba Mẹ đã trao quà!", kq.Ten);
        if (kq.Phut is int p)
        {
            // 15/11: quà «Thêm N phút» đã trao = +N sao (1 sao = 1 phút) — tổng quan vừa tải SAU khi Ba Mẹ trao ⇒ số sao đã gồm phần thưởng
            var con = tq?.SoSaoCt?.PhutCon;   // tổng quan tải SAU khi Ba Mẹ trao ⇒ đã gồm phần thưởng; không có thì không đoán (không cộng thêm)
            h.Chip($"+{p} sao", true, con is double c ? SaoView.ConPhut(c) : null);
            _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });   // sao tăng ⇒ app «Tính phút» được thả ngay
        }
        else if (saoQua is int gia && tq != null)
        {
            // them-dm6hkqqy: khối «Đã nhận · Đổi 30 sao · 30 → 0 sao» (số sao sau = tổng quan tải SAU khi trao)
            var sau = tq.SoSao;
            h.TheNhan("Đã nhận", $"Đổi {gia} sao · {sau + gia} → {sau} sao");
        }
        if (tq != null) h.Dong(tq.SoSao > 0 ? $"Còn {AppConView.Sao(tq.SoSao)}" : $"Còn {AppConView.Sao(tq.SoSao)} · làm nhiệm vụ để có thêm", false, Clay.DiemInk);
        // Bàn: «Làm nhiệm vụ kiếm sao» (nút chính, icon tick) + «Xem quà của con» (nút phụ); quà phút giữ «Chơi tiếp»
        if (kq.Phut is int) h.Nut("Chơi tiếp", true, "game", null);
        else h.Nut("Làm nhiệm vụ kiếm sao", true, "tick", () => OpenApp(MucApp.NhiemVu));
        return h.Nut("Xem quà của con", false, null, () => OpenApp(MucApp.PhanQua));
    }

    /// <summary>#258: «Mẹ Lan đã thêm Roblox · Nhóm «Tính phút» · còn 18 sao = 18 phút» (them-359v1pre / them-jj6fglkl / them-q9a3vr5r).</summary>
    private KetQuaHop HopDaThem(KetQuaTin kq, HvTongQuan? tq)
    {
        _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });   // luật mới ⇒ app / trang mở được ngay
        var khong = kq.Nhom == "khong_tinh_phut";
        var web = kq.Ten.Contains('.');
        return new KetQuaHop("Ba Mẹ trả lời")
            .Dau("phao_hoa", KhoiCon.Mau.Ngoc, $"{XinVayView.TenBaMe(kq.Nguoi)} đã thêm!", kq.Ten)
            .Chip(KetQuaXinView.Nhom(khong, web), !khong, KetQuaXinView.NhomPhu(khong, _state.QuyConPhut))
            .Loi(XinVayView.TenBaMe(kq.Nguoi), kq.LoiNhan)
            .Nut(KetQuaXinView.Mo(kq.Ten), true, "game", null);
    }

    /// <summary>#258: «Ba Mẹ chưa thêm YouTube · Con còn 18 sao = 18 phút chơi · Xin lại / Về trang chính» (them-vkdikuo0).</summary>
    private KetQuaHop HopChuaThem(KetQuaTin kq)
        => new KetQuaHop("Ba Mẹ trả lời")
            .Dau("khoa", KhoiCon.Mau.Cam, KetQuaXinView.ChuaThemTieu(kq.Ten), _state.QuyConPhut is double c ? "Con " + SaoView.ConPhut(c) : null)
            .Loi(XinVayView.TenBaMe(kq.Nguoi), KetQuaXinView.ChuaThemCau(kq.Ten) + " " + KetQuaXinView.XinLaiSau)
            .Nut(KetQuaXinView.XinLai, true, "gui", () => OpenXinMo(BlockedForm.LaTrangWeb(kq.Ten) ? LoaiXin.MoWeb : LoaiXin.CaiApp, kq.Ten))
            .LienKet(KetQuaXinView.VeTrangChinh, "nha", () => OpenApp(MucApp.HomNay));

    private ThoatForm? _thoat;

    /// <summary>«Thoát AiiGrow…» (14/11, con-ngay-thuong 24): hộp «Cần mã của Ba Mẹ» — một hộp một lúc. Đúng mã ⇒ «Ba Mẹ đang dùng máy».</summary>
    internal void OpenThoat()
    {
        if (_thoat is { IsDisposed: false }) { _thoat.Activate(); return; }
        _thoat = new ThoatForm();
        _thoat.DaMo += r =>
        {
            if (r.State != null) ApDungTrangThai(r.State);
            Toast(6000, ThoatView.DaMo, ThoatView.DaMoPhu, ToolTipIcon.Info, MucApp.HomNay);
        };
        _thoat.QuayLai += () => OpenApp(MucApp.HomNay);
        _thoat.FormClosed += (_, _) => { _thoat?.Dispose(); _thoat = null; };
        _thoat.Show();
    }

    private CapNhatKhayForm? _capNhat;

    /// <summary>«Kiểm tra cập nhật» (một cửa sổ một lúc).</summary>
    internal void OpenCapNhat()
    {
        if (_capNhat is { IsDisposed: false }) { _capNhat.Activate(); return; }
        _capNhat = new CapNhatKhayForm();
        _capNhat.VeHomNay += () => OpenApp(MucApp.HomNay);
        _capNhat.FormClosed += (_, _) => { _capNhat?.Dispose(); _capNhat = null; };
        _capNhat.Show();
    }

    /// <summary>«Hỏi AiiGrow» — tự tìm lỗi (con-mat-mang 10). Điểm nối cho app to (W1: nút «Hỏi AiiGrow cách sửa» ở Hôm nay khi AiiGrow lỗi).</summary>
    internal void OpenHoiAiiGrow()
    {
        var f = new HoiAiiGrowForm();
        f.Chon += ma =>
        {
            switch (ma)
            {
                case "thu_lai": case "bat_lai": _ = RetryAsync(); break;
                case "cap_nhat": OpenCapNhat(); break;
                case "ma_mo": Toast(10000, "Máy bị khoá?", HoiAiiGrowView.MaMoCau, ToolTipIcon.Info, MucApp.HomNay); break;
                default: OpenApp(MucApp.TinNhan, tuManKhoa: _state.Locked); break;
            }
        };
        f.FormClosed += (_, _) => f.Dispose();
        f.Show();
    }

    /// <summary>Nút trên màn khoá / màn hết sao: xin vay ⇒ hộp «Xin Ba Mẹ cho vay sao» (mất mạng ⇒ lưu, có mạng tự gửi); làm nhiệm vụ ⇒ đóng màn hết sao,
    /// mở app mục Nhiệm vụ; nhắn ⇒ app mục Tin nhắn nổi trên màn; đổi bé ⇒ về «Ai đang dùng máy?».</summary>
    private async void XuLyNutKhoa(string ma)
    {
        try
        {
            IWin32Window? chu = _lock is { IsDisposed: false } l ? l : _hetSao;
            switch (ma)
            {
                case ManKhoaView.XinVay when _state.Offline:
                {
                    var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Request, Kind = LoaiXin.VaySao, Minutes = XinVayView.MacDinh });
                    if (r.Ok && r.Status == "cho_mang")
                    {
                        using var h = HopDaLuu.Hop(XinVayView.DaLuu, XinVayView.Nut(XinVayView.MacDinh), int.TryParse(r.Message, out var n) ? n : 1, ManKhoaView.VeManKhoa, iconNut: "khoa");
                        h.ShowDialog(chu);
                    }
                    else
                    {
                        // mạng vừa có lại ⇒ lời xin đã tới máy chủ: báo bằng hộp trên màn (bóng báo bị ẩn khi màn toàn màn hình), không thành hai lời xin
                        if (r.Ok && r.Id != null) { _vayCho = (r.Id, XinVayView.MacDinh); _vayHoiLuc = DateTimeOffset.MinValue; }
                        using var h = r.Ok ? new HopThongBao("gui", XinVayView.DaGui, XinVayView.ConXin(XinVayView.MacDinh) + ". " + XinVayView.TraLoiBaoNgay)
                            : new HopThongBao("canh_bao", "Chưa gửi được", r.Error ?? "Con thử lại sau nhé.");
                        h.ShowDialog(chu);
                    }
                    break;
                }
                case ManKhoaView.XinVay:
                    OpenXinVay(chu);
                    break;
                case HetSaoView.LamNhiemVu:
                    DongHetSao();
                    OpenApp(MucApp.NhiemVu, tuManKhoa: _state.Locked);
                    break;
                case ManKhoaView.NhanBaMe:
                    OpenApp(MucApp.TinNhan, tuManKhoa: true);
                    break;
                case ManKhoaView.DoiBe:
                    DongHetSao();
                    await RoiMayAsync(khoaLai: false);
                    break;
            }
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }

    private void DongHetSao()
    {
        if (_hetSao is { IsDisposed: false }) { try { _hetSao.CloseForReal(); _hetSao.Dispose(); } catch { } }
        _hetSao = null;
        if (_app is { IsDisposed: false } && !_state.Locked) _app.TopMost = false;
    }

    /// <summary>#422 «Xin thêm app / web» (them-c0sycsos / them-u94tbp3x): MỘT hộp cho nút ở Hôm nay, «App khác? ›», menu khay, link trong hộp xin vay
    /// và «Xin lại» — dùng chung XinThemForm (chế độ chọn) với hộp «Xin thêm YouTube» của màn chặn, nên kết quả là cùng các màn Đã gửi / Đã thêm / Chưa thêm.
    /// Hộp đang mở ⇒ đưa lên (lời xin đang chờ không mất). <paramref name="loai"/> / <paramref name="muc"/>: «Xin lại» điền sẵn trang / app vừa xin.</summary>
    private void OpenXinMo(string loai = LoaiXin.CaiApp, string? muc = null)
    {
        if (_xinThem is { IsDisposed: false } cu)
        {
            // hộp chọn đang mở ⇒ đưa lên (+ điền sẵn khi «Xin lại»); hộp xin một mục của màn chặn ⇒ đóng (lời xin đã gửi vẫn được khay ghi nhớ,
            // kết quả về bằng popup) rồi mở hộp hai thẻ — nút «Xin thêm app / web» luôn tới đúng hộp này
            if (cu.LaHopChon) { cu.DienSan(loai == LoaiXin.MoWeb, muc); cu.Activate(); return; }   // màn kết quả ⇒ về hộp chọn
            cu.Close();
        }
        var f = new XinThemForm(_state.QuyConPhut, loai == LoaiXin.MoWeb, muc);
        GanXinThem(f);
        f.Show();
    }

    /// <summary>Mỗi nhịp (3 giây): exe đã được thay bằng bản mới và chép xong ⇒ tự chạy lại ngay, không chờ khởi động lại máy.
    /// Chỉ hoãn khi Con đang ở một cửa sổ khác app to (màn khoá, màn chặn, đang nộp bài, đang xin giờ…) để không cắt ngang — đóng xong là chạy lại.
    /// App to đang mở thì vẫn chạy lại và mở lại đúng mục.</summary>
    private void KiemBanMoi()
    {
        if (_exe == null || _dangChayLai || !_exe.DaCoBanMoi()) return;
        foreach (Form f in Application.OpenForms)
            if (f.Visible && !ReferenceEquals(f, _app) && f is not NhacQuanTriForm) return;   // #863: thẻ nhắc Ba Mẹ không giữ bản khay cũ (lượt hỏi sau hiện lại)
        ChayLai(AppDangHien ? _app!.Muc : null);
    }

    /// <summary>Bật bản mới (chờ khay này nhả khoá — Program «--chay-lai») rồi thoát. Không bật được ⇒ giữ khay cũ, trả false.</summary>
    private bool ChayLai(MucApp? moLai)
    {
        if (_exe == null || _dangChayLai) return false;
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo(_exe.Duong) { UseShellExecute = false };
            psi.ArgumentList.Add(Program.ThamSoChayLai);
            if (moLai is { } m) psi.ArgumentList.Add(m.ToString());
            System.Diagnostics.Process.Start(psi)?.Dispose();
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); return false; }
        _dangChayLai = true;
        _timer.Stop();
        _hvTimer.Stop();
        _ni.Visible = false;
        _ni.Dispose();
        ExitThread();
        return true;
    }

    private async Task TickAsync()
    {
        if (_polling) return;
        _polling = true;
        try
        {
            var fg = await Task.Run(UI.Foreground);   // mở tệp exe lấy tên ⇒ không trên luồng UI
            var tieuDe = UI.TieuDeTrinhDuyet(fg.Id);   // #771: tab đang xem (chỉ trình duyệt)
            var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Foreground, AppId = fg.Id, AppName = fg.Name, TieuDe = tieuDe });
            if (!res.Ok || res.State == null)
            {
                // Dịch vụ không trả lời: chờ 2 lần liền (~6 giây) cho chắc rồi mới đổi biểu tượng + báo «Dịch vụ AiiGrow không chạy».
                // phiên đã biết KHÔNG phải của Con ⇒ giữ ẩn (dịch vụ khởi động lại không làm biểu tượng hiện ở phiên Ba Mẹ — review #75)
                // CHƯA biết phiên này của ai (dịch vụ chưa trả lời lần nào — máy vừa khởi động, Ba Mẹ đăng nhập trước khi dịch vụ lên) ⇒ chờ ~2 phút
                // mới hiện biểu tượng lỗi, không nháy biểu tượng đỏ ở phiên Ba Mẹ (BUG-007, review #75)
                if (++_pipeFail >= (_daBietPhien ? 2 : 40) && !_anPhienKhac) { Chao(false); SetKetNoi(KetNoiView.Chon(false, null), false); MoNeuDangCho(); }
                return;
            }
            _pipeFail = 0;
            _daBietPhien = true;
            ApDungTrangThai(res.State);
            if (_moLai is { } mo) { _moLai = null; if (!_anPhienKhac) OpenApp(mo, tuManKhoa: _state.Locked); }   // khay vừa chạy lại lúc app đang mở ⇒ mở lại đúng mục
        }
        catch (Exception e)
        {
            System.Diagnostics.Debug.WriteLine(e);
        }
        finally
        {
            _polling = false;
            KiemBanMoi();   // cả khi dịch vụ không trả lời (dịch vụ đang khởi động lại sau cập nhật)
        }
    }

    private string? _beId;
    private string _nguoiDung = LoaiNguoiDung.Con;

    /// <summary>Áp trạng thái dịch vụ (lượt hỏi 3 giây, hoặc kết quả ngay sau khi bé vào / Ba Mẹ mở / đăng xuất).</summary>
    private void ApDungTrangThai(TrayState st)
    {
        try
        {
            if (!st.PhienCon) { _choMo = false; AnVoiPhienKhac(); _ = KiemQuanTriTrongAsync(); return; }
            DongNhacQuanTri();
            HienLaiNeuDaAn();
            Chao(true);
            _state = st;
            _at = DateTimeOffset.Now;
            DoiNguoi();
            HandleBaMe();
            SetKetNoi(KetNoiView.Chon(true, _state), true);
            if (_state.MoCoi && !_warnedMoCoi)
            {
                _warnedMoCoi = true;
                Toast(10000, "AiiGrow không chặn nữa", MoCoi.CauKhay, ToolTipIcon.Info, MucApp.HomNay);
            }
            HandleWeb();
            HandleLock();
            HandleBlocked();
            HandleTrangChan();
            HandleWarnings();
            BaoBeDoiTrangThaiXet();
            _ = TheoDoiVayAsync();
            _ = TheoDoiXinAppWebAsync();
            HandleXinBo();
            MoNeuDangCho();
        }
        catch (Exception e)
        {
            System.Diagnostics.Debug.WriteLine(e);
        }
    }

    /// <summary>06/11 (L13): bé khác vào máy / đăng xuất ⇒ tin, nhiệm vụ, sao của bé trước không còn hiện (app to tải lại cho bé mới).</summary>
    private void DoiNguoi()
    {
        var id = _state.NguoiDung == LoaiNguoiDung.Con ? _state.BeId : null;
        var doi = id != _beId || _state.NguoiDung != _nguoiDung;
        _doiBeItem.Visible = _state.NguoiDung == LoaiNguoiDung.Con && _state.Paired;
        _khoaLaiItem.Visible = _state.NguoiDung == LoaiNguoiDung.BaMe;
        if (!doi) return;
        var lanDau = _nguoiDung == LoaiNguoiDung.Con && _beId == null;
        _beId = id;
        _nguoiDung = _state.NguoiDung;
        if (lanDau && id == null && _state.NguoiDung == LoaiNguoiDung.Con) return;
        _tin.DatLai();
        _tinMoi = 0;
        if (_app is { IsDisposed: false }) { _app.Hide(); _app.Dispose(); }
        _app = null;
        if (_ketQua is { IsDisposed: false }) _ketQua.DongLang();
        if (_thoat is { IsDisposed: false }) _thoat.Close();   // «Cần mã của Ba Mẹ» của bé trước
        if (_nhac is { IsDisposed: false }) _nhac.Close();
        DongHetSao();
        if (_vayCho != null && id != null && _vayBeId != id) _vayCho = null;   // #686: bé KHÁC vào máy ⇒ bỏ; chưa ai / Ba Mẹ ⇒ giữ (khay vừa chạy lại)
        _phutTruoc = null; _daBaoHetSao = false;
        _warned5 = false;
        if (id != null) _ = HocVienTickAsync();
    }

    // #863: thẻ nhắc tài khoản quản trị chưa có mật khẩu — chỉ trong phiên KHÔNG phải của bé, dịch vụ chỉ trả cho phiên tài khoản quản trị
    private readonly NhacQuanTri _nhacQt = new();
    private NhacQuanTriForm? _nhacQtForm;
    private DateTimeOffset _nhacQtHoiLuc = DateTimeOffset.MinValue;
    private bool _nhacQtDangHoi;

    private async Task KiemQuanTriTrongAsync()
    {
        var now = DateTimeOffset.Now;
        if (_nhacQtDangHoi || _dangChayLai || (now - _nhacQtHoiLuc).Duration() < NhacQuanTriView.NhipHoi) return;
        // phân loại phiên dựa trên danh sách tài khoản có thể cũ vài phút (cài một chạm: bé vừa bị gỡ quyền quản trị) ⇒ chỉ hỏi khi phiên đã «không phải của bé» đủ lâu
        if ((now - _anPhienKhacTu).Duration() < NhacQuanTriView.ChoPhienOn) return;
        _nhacQtDangHoi = true;
        _nhacQtHoiLuc = now;
        try
        {
            var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.QuanTriTrong });
            if (!_anPhienKhac || _dangChayLai) return;   // phiên vừa được nhận là của bé / khay đang chạy lại bản mới ⇒ không hiện
            var truoc = _nhacQt.GhiHoan();
            var hien = _nhacQt.Xet(NhacQuanTriView.Doc(r), DateTimeOffset.Now);
            if (_nhacQt.GhiHoan() != truoc) LuuHoanQt();
            if (!hien) { DongNhacQuanTri(); return; }
            if (_nhacQtForm is { IsDisposed: false } cu)
            {
                if (NhacQuanTri.CungDanhSach(cu.Ten, _nhacQt.Ten)) return;
                cu.DongLang();   // danh sách đổi ⇒ dựng lại thẻ với tên mới
            }
            var f = new NhacQuanTriForm(_nhacQt.Ten);
            f.BaMeDong += () => { _nhacQt.Hoan(DateTimeOffset.Now); LuuHoanQt(); };
            f.FormClosed += (_, _) => { if (_nhacQtForm == f) _nhacQtForm = null; f.Dispose(); };
            _nhacQtForm = f;
            f.Show();
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally { _nhacQtDangHoi = false; }
    }

    private static string TepHoanQt => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiiGrow", "nhac-quan-tri.json");

    private void LuuHoanQt()
    {
        try
        {
            var j = _nhacQt.GhiHoan();
            if (j != null) { Directory.CreateDirectory(Path.GetDirectoryName(TepHoanQt)!); File.WriteAllText(TepHoanQt, j); }
            else if (File.Exists(TepHoanQt)) File.Delete(TepHoanQt);
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }

    private void DongNhacQuanTri()
    {
        if (_nhacQtForm is { IsDisposed: false } f) { _nhacQtForm = null; f.DongLang(); }
    }

    private BaMeDungForm? _baMeForm;
    private BaMeVienForm? _baMeVien;
    private bool _baMeAn;

    /// <summary>«Ba Mẹ đang dùng máy» (con-ngay-thuong 07): hộp nổi góc phải dưới + viên trên đầu màn hình; hết hạn / Khoá lại ⇒ đóng.</summary>
    private void HandleBaMe()
    {
        if (_state.NguoiDung == LoaiNguoiDung.BaMe && _state.BaMeDen is { } den && !_state.MoCoi)
        {
            if (_baMeVien is not { IsDisposed: false }) { _baMeVien = new BaMeVienForm(); _baMeVien.Show(); }
            if (!_baMeAn)
            {
                if (_baMeForm is not { IsDisposed: false })
                {
                    _baMeForm = new BaMeDungForm();
                    _baMeForm.KhoaLai += () => _ = RoiMayAsync(khoaLai: true);
                    _baMeForm.FormClosing += (_, e) => { if (e.CloseReason == CloseReason.UserClosing) _baMeAn = true; };
                    _baMeForm.Show();
                }
                _baMeForm.Den(den);
            }
            return;
        }
        // Close() bằng mã cũng báo UserClosing ⇒ đóng TRƯỚC rồi mới xoá cờ «Ba Mẹ đã thu nhỏ» (lần Ba Mẹ mở máy sau hộp hiện lại)
        if (_baMeForm is { IsDisposed: false }) { _baMeForm.Close(); _baMeForm.Dispose(); }
        _baMeForm = null;
        _baMeAn = false;
        if (_baMeVien is { IsDisposed: false }) { _baMeVien.Close(); _baMeVien.Dispose(); }
        _baMeVien = null;
    }

    /// <summary>«Đổi người / Đăng xuất» (thanh bên app, menu khay) — hộp xác nhận con-ngay-thuong 08.</summary>
    private async void MoDoiBe()
    {
        try
        {
            bool? chon;
            using (var h = new DoiBeHop(_state.BeTen ?? _state.ChildName, _state.MayRieng, _state.MoHet ? null : _state.Sao))
            {
                if (_app is { IsDisposed: false, Visible: true }) h.ShowDialog(_app); else h.ShowDialog();
                chon = h.Chon;
            }
            if (chon == null) return;
            await RoiMayAsync(khoaLai: false);
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }

    /// <summary>«Ba Mẹ dùng máy» từ app của Con ⇒ Ba Mẹ nhập mã (con-ngay-thuong 06).</summary>
    private void MoBaMeMa()
    {
        using var h = new BaMeMaHop();
        if (_app is { IsDisposed: false, Visible: true }) h.ShowDialog(_app); else h.ShowDialog();
        if (h.KetQua?.State is { } st) ApDungTrangThai(st);
    }

    /// <summary>Đăng xuất (bé) / Khoá lại (Ba Mẹ) ⇒ máy về «Ai đang dùng máy?».</summary>
    private async Task RoiMayAsync(bool khoaLai)
    {
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = khoaLai ? PipeCmd.KhoaLai : PipeCmd.DangXuat });
        if (r.State != null) ApDungTrangThai(r.State);
        else if (!r.Ok) Toast(5000, "Chưa làm được", r.Error ?? "Con thử lại nhé.", ToolTipIcon.Warning, MucApp.HomNay);
    }

    /// <summary>Luật web trong hive của Con vừa đổi/gỡ (dịch vụ tăng WebRev): làm mới chính sách trình duyệt trong phiên này + nhắc mở lại trình duyệt nếu luật mới chưa áp.</summary>
    private void HandleWeb()
    {
        // dịch vụ khởi động lại ⇒ WebRev đếm lại từ 0: chỉ đồng bộ con số, không báo «luật đổi» giả (review #75)
        if (_webRev < 0 || _state.WebRev < _webRev) { _webRev = _state.WebRev; return; }
        if (_state.WebRev == _webRev) return;
        _webRev = _state.WebRev;
        UI.LamMoiChinhSachNguoiDung();
        if (!_state.MoCoi)
            Toast(8000, "Luật web vừa đổi", "Nếu trang web chưa theo luật mới, con đóng rồi mở lại trình duyệt nhé.", ToolTipIcon.Info, MucApp.HomNay);
    }

    /// <summary>#822: hộp AiiGrow nhỏ báo bé một việc (dùng chung — #823 nối vào đây). Hộp cũ đóng trước (không chồng), không giành phím của game.</summary>
    /// <param name="nhom">#823: hộp việc Ba Mẹ vừa làm (<see cref="ChongLapBao.BaMeKhoa"/> / <see cref="ChongLapBao.BaMeMo"/>) ở 5 phút; hộp khác 30 giây.</param>
    internal void HienHopAiiGrow(string icon, string tieu, string phu, string? nhom = null, bool gop = false)
    {
        try
        {
            if (_hopBao is { IsDisposed: false } cu) { _hopBao = null; cu.Close(); cu.Dispose(); }
            var h = new HopThongBao(icon, tieu, phu, "Đã hiểu", khongCuopPhim: true, tuDongDong: nhom != null ? TimeSpan.FromMinutes(5) : null);
            h.FormClosed += (_, _) => { if (_hopBao == h) _hopBao = null; h.Dispose(); };
            _hopBao = h; _hopNhom = nhom; _hopGop = gop;
            h.Show();
        }
        catch (Exception e)
        {
            System.Diagnostics.Debug.WriteLine(e);
            Toast(6000, tieu, phu, ToolTipIcon.Info, MucApp.HomNay);
        }
    }

    private void BaoBeDoiTrangThaiXet()
    {
        // hộp «Ba Mẹ đã khoá / mở máy» còn mở mà máy đã đổi, hoặc người trên máy đã đổi (Ba Mẹ vào / bé khác) ⇒ đóng, không để chữ sai trên màn hình;
        // đổi người ⇒ chống lặp bắt đầu lại (việc của bé trước không chặn hộp của bé sau)
        var nguoi = _state.NguoiDung + "|" + _beId;
        var doiNguoi = nguoi != _nguoiHop;
        if (doiNguoi) { _nguoiHop = nguoi; _chongLap = new(); }
        if (_hopBao is { IsDisposed: false } hb && _hopNhom != null && (doiNguoi || _state.NguoiDung != LoaiNguoiDung.Con || BaoTuTin.HopDaSai(_hopNhom, _state, DateTimeOffset.Now)))
        { _hopBao = null; hb.Close(); hb.Dispose(); }
        if (_state.NguoiDung != LoaiNguoiDung.Con || _state.MoCoi) { _moc822 = null; return; }
        var nay = TrangThaiBaoBe.Tu(_state);
        // «hết giờ chơi» đã có màn «Hết sao / Nghỉ một chút» toàn màn hình ⇒ không chồng hộp thứ hai
        var bay = DateTimeOffset.Now;
        var baos = BaoBeDoiTrangThai.Xet(_moc822, nay).Where(b => !(_hetSao is { IsDisposed: false } && b.Icon == "dong_ho_cat")).Where(b => _chongLap.NenHien(b, bay)).ToList();
        _moc822 = BaoBeDoiTrangThai.GiuMoc(_moc822, nay);
        var nhom = baos.Select(b => b.Nhom).FirstOrDefault(n => n != null);   // #823: việc Ba Mẹ vừa làm ⇒ hộp ở lâu để bé kịp thấy
        if (baos.Count == 1) HienHopAiiGrow(baos[0].Icon, baos[0].Tieu, baos[0].Phu, nhom);
        else if (baos.Count > 1) HienHopAiiGrow(baos[0].Icon, baos[0].Tieu, baos[0].Phu + " " + string.Join(" ", baos.Skip(1).Select(b => b.Tieu + ": " + b.Phu)), nhom, gop: true);   // nhiều việc cùng lượt: một hộp, không bỏ việc nào
    }

    private void HandleLock()
    {
        if (_state.Locked)
        {
            DongHetSao();
            if (_lock == null || _lock.IsDisposed)
            {
                _lock = new LockForm();
                _lock.Bam += XuLyNutKhoa;
                _lock.DaVao += r =>
                {
                    if (r.State != null) ApDungTrangThai(r.State);
                    if (r.Status == "can_dat_pin") Toast(8000, "Ba Mẹ chưa đặt PIN cho con", ManChonTenView.ChuaDatPin, ToolTipIcon.Info, MucApp.HomNay);
                };
                _lock.Show();
            }
            _lock.Apply(_state);
        }
        else if (_lock != null)
        {
            _lock.CloseForReal();
            _lock.Dispose();
            _lock = null;
            _warned5 = false;
            if (_app is { IsDisposed: false }) _app.TopMost = false;
            if (_bat.MoKhoa(AppDangHien, UI.DangBanToanManHinh(), DateTimeOffset.Now)) OpenApp(MucApp.NhiemVu, tuBat: true);
        }
    }

    private readonly TrangChanWeb _trangChan = new();
    private readonly HopChanLap _hopLap = new();

    /// <summary>#741: tab tiền cảnh là trang Ba Mẹ chặn (trình duyệt hiện trang lỗi tiếng Anh) ⇒ hộp web tiếng Việt + tên miền + «Xin Ba Mẹ mở».
    /// Dịch vụ tính trang chặn (<see cref="TrayState.TrangChan"/>: cả chế độ «Theo danh sách» chặn mọi trang ngoài danh sách cho phép — test 28/11).</summary>
    private void HandleTrangChan()
    {
        if (_state.Locked || _state.MoCoi) return;
        var mien = _state.TrangChan;
        if (mien == null || _blocked is { IsDisposed: false } || _daXin.Contains(mien)) return;   // hộp khác đang mở / đã xin Ba Mẹ trong phiên khay ⇒ không lặp
        if (!_trangChan.NenHien(mien, DateTimeOffset.Now)) return;
        var daXin = false;
        _blocked = new BlockedForm(mien, mien, boiBaMe: true, _state.Offline, web: true, daXin: daXin);
        _blocked.VeHomNay += () => OpenApp(MucApp.HomNay);
        _blocked.NhanBaMe += () => OpenApp(MucApp.TinNhan);
        _blocked.DaXin += x => _daXin.Add(x);
        _blocked.Show();
    }

    private void HandleBlocked()
    {
        if (_seenBlocked < 0) { _seenBlocked = _state.BlockedSeq; return; }
        if (_state.BlockedSeq == _seenBlocked || _state.Locked) return;
        _seenBlocked = _state.BlockedSeq;
        if (!ManChanView.CoHienBang(_state.BlockedAppId)) return;   // #642: tiến trình nền Windows / Xbox Game Bar — không bật bảng, không đóng bảng đang mở
        var id = _state.BlockedAppId;
        var homNay = DateOnly.FromDateTime(DateTime.Now);
        if (homNay != _ngayTuGui) { _ngayTuGui = homNay; _soTuGui = 0; }
        var daXin = id != null && (_daXin.Contains(id) || _soTuGui >= ManChanView.TuGuiToiDa);
        // 15/11: app «Tính phút» bị đóng vì HẾT SAO ⇒ popup «Hết sao rồi · Roblox sắp đóng» (them-zxuekzer), không phải «chưa có trong danh sách»;
        // màn «Hết sao rồi» toàn màn hình đang hiện (vừa hết sao lúc chơi) ⇒ không chồng thêm popup
        if (id != null && _state.QuyConPhut is <= 0 && _hetSao is { IsDisposed: false } && _state.AppTinhPhut.Contains(id, StringComparer.OrdinalIgnoreCase)) return;
        // #307: Con đang ở hộp «Xin thêm …» cho đúng app này ⇒ đưa hộp lên trước, không chồng màn chặn mới
        if (id != null && _xinThem is { IsDisposed: false } dangXin && string.Equals(dangXin.Muc, id.Trim(), StringComparison.OrdinalIgnoreCase)) { dangXin.Activate(); return; }
        // #741 (test 28/11): cùng app bị đóng lại mỗi nhịp ⇒ không dựng lại hộp / popup «Hết sao» đang mở hoặc vừa bị bé đóng (trước đây ✖ / Esc / Alt+F4 như không có tác dụng).
        if (id != null && !_hopLap.NenHien(id, _blocked is { IsDisposed: false } dang && dang.LaHopCua(id), DateTimeOffset.Now)) return;
        if (id != null && _state.QuyConPhut is <= 0 && !_state.MoHet && !MoCoHan.Dang(_state, DateTimeOffset.Now) && _state.AppTinhPhut.Contains(id, StringComparer.OrdinalIgnoreCase))
        {
            HienPopupHetSao(id, _state.BlockedAppName);
            return;
        }
        // một màn chặn tại một thời điểm: app bị đóng lặp lại (Con mở lại liên tục) không chồng nhiều cửa sổ
        if (_blocked is { IsDisposed: false }) { try { _blocked.Close(); _blocked.Dispose(); } catch { } }
        if (ManChanView.TuGui(id, _state.BlockedBoiBaMe, _state.Offline, daXin)) _soTuGui++;
        _blocked = new BlockedForm(id, _state.BlockedAppName, _state.BlockedBoiBaMe, _state.Offline, _state.AppDuocPhep, daXin: daXin, appTinhPhut: _state.AppTinhPhut, phutCon: _state.QuyConPhut,
            tenDuocPhep: TrayView.TenKhongTinh(_state), tenTinhPhut: TrayView.TenTinh(_state));
        _blocked.VeHomNay += () => OpenApp(MucApp.HomNay);
        _blocked.NhanBaMe += () => OpenApp(MucApp.TinNhan);
        _blocked.DaXin += x => _daXin.Add(x);
        // #307: mở hộp «Xin thêm …» SAU khi màn chặn đã đóng hẳn (không lồng trong Click của form vừa đóng)
        _blocked.XinThem += (m, t) => { var sc = SynchronizationContext.Current; if (sc != null) sc.Post(_ => OpenXinThem(m, t), null); else OpenXinThem(m, t); };
        _blocked.Show();
    }

    /// <summary>Popup «Hết sao rồi» / #302 «Nghỉ một chút» cho app «Tính phút» vừa bị đóng. Dựng theo trạng thái HIỆN TẠI; đóng popup cũ trước (không đè).
    /// #307 them-rgy15s87: hộp xin vay mở từ popup có «‹» quay lại — lúc đó xét lại: đã có sao / đang khoá / «Mở hết» ⇒ không hiện lại popup.</summary>
    private void HienPopupHetSao(string id, string? ten)
    {
        if (_state.Locked || _state.MoHet || _state.QuyConPhut is not <= 0) return;
        var gh = HetSaoView.PopGioiHan(_state.GioiHanLyDo, _state.GioiHanGio, _state.GioiHanCau, TrayView.FriendlyAppName(id, ten));
        if (_blocked is { IsDisposed: false } cu) { try { cu.Close(); cu.Dispose(); } catch { } }
        var f = gh is { } chu ? BlockedForm.GioiHan(id, ten, chu) : BlockedForm.HetSao(id, ten);
        _blocked = f;
        f.LamNhiemVu += () => OpenApp(MucApp.NhiemVu);
        f.XinVay += () => OpenXinVay(quayLaiHetSao: () => HienPopupHetSao(id, ten));
        f.Show();
    }

    /// <summary>16/11 (#307): «Xin thêm …» (them-bxw40sw9 → them-6tn8aozf → them-359v1pre / them-vkdikuo0).</summary>
    private XinThemForm? _xinThem;

    private void OpenXinThem(string muc, string ten)
    {
        if (_xinThem is { IsDisposed: false } cu)
        {
            // một hộp một lúc: cùng app ⇒ đưa lên; app khác ⇒ đóng hộp cũ (lời xin đã gửi vẫn được khay ghi nhớ) rồi mở cho app mới — không nuốt yêu cầu
            if (string.Equals(cu.Muc, muc.Trim(), StringComparison.OrdinalIgnoreCase)) { cu.Activate(); return; }
            cu.Close();
        }
        var f = new XinThemForm(muc, ten, _state.QuyConPhut);
        GanXinThem(f);
        f.Show();
    }

    private void GanXinThem(XinThemForm f)
    {
        _xinThem = f;
        f.DaXin += x => _daXin.Add(x);
        f.FormClosed += (_, _) =>
        {
            var sau = f.Sau;
            if (_xinThem == f) _xinThem = null;
            f.Dispose();
            if (sau == XinThemForm.SauNhan) OpenApp(MucApp.TinNhan);
            else if (sau == XinThemForm.SauHomNay) OpenApp(MucApp.HomNay);
        };
    }

    private void HandleWarnings()
    {
        if (_state.Locked) return;
        // Lượt mở bằng mã offline sắp hết ⇒ báo trước 5 phút để Con lưu bài (hết lượt thì khoá cũ quay lại).
        if (_state.MoOfflineDen is { } den)
        {
            var con = (den - DateTimeOffset.Now).TotalSeconds;
            if (con > 330) _warnedMo5 = false;
            if (con <= 300 && con > 0 && !_warnedMo5)
            {
                _warnedMo5 = true;
                Toast(6000, "Còn 5 phút mở bằng mã", "Lưu bài đang làm nhé. Hết 5 phút máy khoá lại · sao của con vẫn giữ nguyên.", ToolTipIcon.Warning, MucApp.HomNay);
            }
        }
        HandleSao();
    }

    /// <summary>15/11 sổ sao: nhắc «Còn 5 sao» (them-da3zy02w) → «Sắp hết sao rồi» đếm ngược khi còn ≤ 1 phút (cmt-khoa-het-gio-dem-nguoc) →
    /// «Hết sao rồi» (them-uqukvnas) khi vừa hết sao lúc đang chơi app «Tính phút». Không khoá máy; có sao lại / mở bằng mã / «Mở hết» ⇒ đóng màn.</summary>
    private void HandleSao()
    {
        var p = _state.MoHet || _state.MoOfflineDen != null || MoCoHan.Dang(_state, DateTimeOffset.Now) || _state.NguoiDung != LoaiNguoiDung.Con ? null : _state.QuyConPhut;
        var truoc = _phutTruoc;
        _phutTruoc = p;
        if (p is not double con) { DongHetSao(); return; }
        if (con > NhacSaoView.Moc + 0.5) _warned5 = false;
        if (con > 0) _daBaoHetSao = false;
        if (NhacSaoView.NenNhac(con, _state.DangChoiTinhPhut, _warned5))
        {
            _warned5 = true;
            try
            {
                if (_nhac is { IsDisposed: false }) _nhac.Close();
                _nhac = new NhacSaoForm(SaoView.Phut(con), _state.AppDangChoi);
                _nhac.LamNhiemVu += () => OpenApp(MucApp.NhiemVu);
                _nhac.XinVay += () => OpenXinVay();
                _nhac.FormClosed += (_, _) => { _nhac?.Dispose(); _nhac = null; };
                _nhac.Show();
            }
            catch { Toast(6000, NhacSaoView.Tieu(SaoView.Phut(con)), NhacSaoView.Phu(_state.AppDangChoi), ToolTipIcon.Warning, MucApp.HomNay); }
        }
        var doiBe = TrayView.DangDungMayChung(_state);
        if (HetSaoView.DemNguoc(con, _state.DangChoiTinhPhut) && (_hetSao is { IsDisposed: false } || truoc is null or > 1))
        {
            var giay = (int)Math.Ceiling(con * 60);
            HienHetSao(_state.GioiHanChan ? HetSaoView.ForSapHetGio(giay, _state.AppDangChoi, _state.GioiHanChanLuot, TrayView.TenKhongTinh(_state), doiBe) : HetSaoView.For(giay, _state.AppDangChoi, TrayView.TenKhongTinh(_state), doiBe), giay);
            return;
        }
        var vuaHet = con <= 0 && !_daBaoHetSao && (_hetSao is { IsDisposed: false } || (truoc is > 0 && _state.DangChoiTinhPhut));
        if (vuaHet)
        {
            _daBaoHetSao = true;
            // #302: khoá vì giới hạn ngày / đang nghỉ (còn sao) ⇒ «Nghỉ một chút · chơi tiếp lúc HH:MM» / «Hôm nay chơi đủ rồi», không «Hết sao rồi»
            var m = HetSaoView.ForGioiHan(_state.GioiHanLyDo, _state.GioiHanGio, _state.GioiHanCau, TrayView.TenKhongTinh(_state), doiBe)
                ?? (_state.Offline ? ManKhoaView.For(null, _state.ChildName, offline: true, hetSao: true) : HetSaoView.For(null, null, TrayView.TenKhongTinh(_state), doiBe));
            HienHetSao(m, null);
            return;
        }
        if (con > 0 && _hetSao is { IsDisposed: false }) DongHetSao();
    }

    private void HienHetSao(ManKhoa m, int? giay)
    {
        if (_lock is { IsDisposed: false }) return;
        if (_hetSao is not { IsDisposed: false })
        {
            var f = new LockForm(chiBao: true);
            f.Bam += XuLyNutKhoa;
            f.FormClosed += (_, _) => { if (_hetSao == f) _hetSao = null; };   // Esc / «Làm nhiệm vụ» ⇒ không bật lại tới lần hết sao sau
            _hetSao = f;
            f.Show();
        }
        _hetSao.ApHetSao(m, _state.ChildName, giay, _state.OfflineSince, dangDung: TrayView.DangDungMayChung(_state));
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _timer.Dispose(); _hvTimer.Dispose(); _app?.Dispose(); _baMeForm?.Dispose(); _baMeVien?.Dispose(); _nhacQtForm?.Dispose(); _ni.Visible = false; _ni.Dispose(); }
        base.Dispose(disposing);
    }
}
