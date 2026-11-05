using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

internal sealed class TrayContext : ApplicationContext
{
    private readonly NotifyIcon _ni;
    private readonly ToolStripMenuItem _statusItem, _retryItem, _hoiItem;
    private const string ChuDongBo = "Đồng bộ ngay";
    /// <summary>App lạ đã tự gửi lời xin duyệt trong phiên khay — Con mở lại liên tục không gửi lặp (máy chủ cũng gộp lời xin chờ).</summary>
    private readonly HashSet<string> _daXin = new(StringComparer.OrdinalIgnoreCase);
    private NhacGioForm? _nhac;
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
    private bool _warned5, _warned1, _warnedMo5, _warnedMoCoi;
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

    public TrayContext()
    {
        // Menu khay theo Clay: nền thẻ sáng, mục được trỏ là viên bo ngọc nhạt, icon Fluent 3D nhỏ.
        var menu = new ContextMenuStrip { Renderer = new AiiGrow.ClayUi.ClayMenuRenderer(), Font = UI.F(10.5f), ImageScalingSize = new Size(UI.Px(20), UI.Px(20)) };
        // Thiết kế chốt 05/11 (con-mat-mang 21): ● trạng thái · Đồng bộ ngay · Mở AiiGrow · Xin Ba Mẹ thêm giờ… · Kiểm tra cập nhật · dòng chân.
        // «Hỏi AiiGrow…» chỉ hiện khi mất mạng / AiiGrow lỗi (con-mat-mang 08–10).
        _statusItem = new ToolStripMenuItem("● " + _kn.Dong) { Enabled = false };
        _retryItem = new ToolStripMenuItem(ChuDongBo, Anh3D.Icon("lap"), async (_, _) => await RetryAsync());
        _hoiItem = new ToolStripMenuItem("Hỏi AiiGrow…", Anh3D.Icon("dau_hoi"), (_, _) => OpenHoiAiiGrow()) { Visible = false };
        menu.Items.Add(_statusItem);
        menu.Items.Add(_retryItem);
        menu.Items.Add(new ToolStripMenuItem("Mở AiiGrow", Anh3D.Icon("nha"), (_, _) => OpenApp(MucApp.HomNay)));
        menu.Items.Add("Xin Ba Mẹ thêm giờ…", Anh3D.Icon("gui"), (_, _) => OpenRequest());
        menu.Items.Add("Kiểm tra cập nhật", Anh3D.Icon("tai"), (_, _) => OpenCapNhat());
        menu.Items.Add(_hoiItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Máy này do Ba Mẹ quản lý bằng AiiGrow") { Enabled = false });

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
        Toast(5000, "AiiGrow đang bật", "Ba Mẹ đặt giờ dùng máy. Bấm vào AiiGrow cạnh đồng hồ để xem giờ chơi, nhiệm vụ và sao của con.", ToolTipIcon.Info, MucApp.HomNay);
        BaoCapNhat.NeuVuaCapNhat(_ni);   // #33: «đã cập nhật lên bản X» (một lần mỗi tài khoản)
    }

    private bool _anPhienKhac;
    private bool _daBietPhien;   // dịch vụ đã trả lời ít nhất một lần (biết phiên này có phải của Con)

    /// <summary>Phiên KHÔNG phải của Con (Ba Mẹ / tài khoản quản trị): khay ẩn, đóng màn khoá / màn chặn, ngừng hỏi máy chủ, chỉ hỏi dịch vụ thưa (6 giây) — KHÔNG thoát hẳn:
    /// quyết định dựa trên danh sách tài khoản dịch vụ đọc 2 phút/lần, có thể cũ (cài một chạm: Con vừa bị gỡ quyền quản trị) ⇒ đúng lại thì hiện lại (BUG-007, review #75).</summary>
    private void AnVoiPhienKhac()
    {
        if (_anPhienKhac) { _ni.Visible = false; return; }
        _anPhienKhac = true;
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
        _ni.ShowBalloonTip(ms, title, text, icon);
    }

    /// <summary>Mở app to (một bản duy nhất; đã mở thì đưa lên trước). <paramref name="tuToast"/> = bấm từ bóng báo ⇒ coi như đã xem tin mới.
    /// <paramref name="tuBat"/> = khay tự bật (nhiệm vụ mới), không do Con bấm ⇒ ép cửa sổ nổi lên trên cùng.</summary>
    /// <param name="tuManKhoa">Con bấm «Nhắn Ba Mẹ» trên màn khoá ⇒ mở app to NỔI TRÊN màn khoá (chỉ để nhắn tin).</param>
    private void OpenApp(MucApp muc, bool tuToast = false, bool tuBat = false, bool tuManKhoa = false)
    {
        if (_state.Locked && !tuManKhoa) { Toast(4000, "Máy đang khoá", "Khi máy mở lại, con xem nhiệm vụ và sao nhé.", ToolTipIcon.Info, MucApp.HomNay); return; }
        if (_app == null || _app.IsDisposed)
        {
            _app = new AppForm();
            _app.TinDaXem += () => _tinMoi = 0;
            _app.RetryClicked += () => _ = RetryAsync();
            _app.XinMoClicked += () => OpenXinMo();
            _app.HoiAiiGrowClicked += () => OpenHoiAiiGrow();
        }
        if (tuToast) _tinMoi = 0;
        _app.TopMost = tuManKhoa;
        PushApp();
        _app.ShowFront(muc, tuBat || tuManKhoa);
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
        _statusItem.Text = "● " + info.Dong;
        _hoiItem.Visible = !info.DungIconKetNoi;
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
        if (_hvPolling || !_state.Paired || _state.MoCoi) return;
        _hvPolling = true;
        try
        {
            var path = "hoc-vien/tin" + (_tin.Moc is { } m ? "?sau=" + Uri.EscapeDataString(m.ToString("O")) : "");
            var (r, _) = await HvApi.GetAsync<HvTinDs>(path);
            if (r == null) return;
            var moi = _tin.Nhan(r);
            if (moi.Count > 0)
            {
                _tinMoi += moi.Count;
                var (tieu, noi) = HocVienView.ToastText(moi);
                if (_app is { Visible: true }) _ = _app.RefreshAsync();       // app đang mở ⇒ cập nhật luôn, bóng báo vẫn hiện nhẹ
                Toast(8000, tieu, noi, ToolTipIcon.Info, HocVienView.MucChoTin(moi));
                // Nhiệm vụ mới ⇒ bật app to ngay mục Nhiệm vụ (đang khoá ⇒ chờ mở khoá; app đang hiện / Con đang toàn màn hình / vừa bật ⇒ chỉ bóng báo)
                if (_bat.Nhan(HocVienView.CoNhiemVuMoi(moi), _state.Locked, AppDangHien, UI.DangBanToanManHinh(), DateTimeOffset.Now))
                    OpenApp(MucApp.NhiemVu, tuBat: true);
                // 05/11: Ba Mẹ duyệt / nhờ làm lại / trao quà / cho thêm giờ ⇒ màn kết quả (con-ngay-thuong 09/11/12/26) — không khi máy khoá / Con đang toàn màn hình
                else if (AppConView.ChonKetQua(moi) is { } kq && !_state.Locked && !UI.DangBanToanManHinh())
                    _ = HienKetQuaAsync(kq);
            }
            PushApp();
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
        finally { _hvPolling = false; }
    }

    /// <summary>Hộp «Thêm giờ chơi» (W1 — RequestForm: xin Ba Mẹ thêm giờ / đổi sao lấy phút). Màn khoá gọi với chủ là màn khoá.</summary>
    private void OpenRequest(IWin32Window? chu = null, bool dungSao = false)
    {
        string? sau;
        using (var f = new RequestForm(_state.CanExchangePoints, dungSao: dungSao))
        {
            if (chu != null) f.ShowDialog(chu); else f.ShowDialog();
            sau = f.Sau;
        }
        var tuKhoa = chu != null && _state.Locked;
        switch (sau)
        {
            case RequestForm.SauXinMo: OpenXinMo(); break;
            case RequestForm.SauNhan: OpenApp(MucApp.TinNhan, tuManKhoa: tuKhoa); break;
            case RequestForm.SauNhiemVu: OpenApp(MucApp.NhiemVu, tuManKhoa: tuKhoa); break;
        }
    }

    private KetQuaHop? _ketQua;

    /// <summary>Màn kết quả Ba Mẹ trả lời (một hộp một lúc). Số sao trước / sau và lời khen đọc từ tổng quan mới nhất.</summary>
    private async Task HienKetQuaAsync(KetQuaTin kq)
    {
        if (_ketQua is { IsDisposed: false }) return;
        var (tq, _) = await HvApi.GetAsync<HvTongQuan>("hoc-vien/tong-quan");
        if (_state.Locked) return;
        var h = kq.Loai switch
        {
            "duyet" => HopDuyet(kq, tq),
            "lam_lai" => HopLamLai(kq, tq),
            "trao_qua" => HopTraoQua(kq, tq),
            _ => HopThemGio(kq, tq),
        };
        _ketQua = h;
        h.FormClosed += (_, _) => { h.Dispose(); if (_ketQua == h) _ketQua = null; };
        h.Show();
    }

    private KetQuaHop HopDuyet(KetQuaTin kq, HvTongQuan? tq)
    {
        var sao = tq?.SoSao;
        var them = kq.Sao ?? 0;
        var khen = tq?.Gan.FirstOrDefault(g => g.TrangThai == "duoc_duyet" && g.Ten == kq.Ten)?.LoiKhen;
        return new KetQuaHop("Nhiệm vụ")
            .Dau("phao_hoa", KhoiCon.Mau.Vang, "Ba Mẹ duyệt rồi!", kq.Ten)
            .Chip($"+{them} sao", true, sao is int s ? $"{s - them} → {s} sao" : null)
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

    private KetQuaHop HopTraoQua(KetQuaTin kq, HvTongQuan? tq)
    {
        var h = new KetQuaHop("Quà").Dau("qua", KhoiCon.Mau.Vang, "Ba Mẹ đã trao quà!", kq.Ten);
        if (kq.Phut is int p)
        {
            var con = _state.QuyConPhut ?? tq?.Quy?.ConPhut;
            h.Chip($"+{p} phút", false, con is double c ? $"{AppConView.Phut(c)} → {AppConView.Phut(c + p)}" : null);
            _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });   // quỹ tăng ⇒ app chơi được thả ngay
        }
        if (tq != null) h.Dong(tq.SoSao > 0 ? $"Còn {AppConView.Sao(tq.SoSao)}" : "Còn 0 sao · làm nhiệm vụ để có thêm", false, Clay.DiemInk);
        return h.Nut(kq.Phut is int pp ? "Chơi tiếp" : "Tuyệt quá!", true, "game", null)
            .LienKet("Xem quà của con", "qua", () => OpenApp(MucApp.PhanQua));
    }

    private KetQuaHop HopThemGio(KetQuaTin kq, HvTongQuan? tq)
    {
        _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });
        var con = (_state.QuyConPhut ?? tq?.Quy?.ConPhut ?? 0) + (kq.Phut ?? 0);
        return new KetQuaHop("Ba Mẹ trả lời")
            .Dau("phao_hoa", KhoiCon.Mau.Ngoc, "Ba Mẹ cho thêm giờ!", null)
            .Chip($"+{kq.Phut} phút", false, "Giờ chơi còn " + AppConView.Phut(con))
            .Nut($"Chơi tiếp {AppConView.Phut(con)}", true, "game", null);
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

    /// <summary>Nút trên màn khoá (<see cref="ManKhoaView"/>): đổi sao / xin thêm giờ ⇒ hộp «Thêm giờ chơi» (W1); mất mạng ⇒ lưu lời xin 20 phút, có mạng tự gửi;
    /// ngoại lệ ⇒ <see cref="NgoaiLeForm"/>; nhắn ⇒ app to mục Tin nhắn nổi trên màn khoá.</summary>
    private async void XuLyNutKhoa(string ma)
    {
        try
        {
            switch (ma)
            {
                case ManKhoaView.XinThemGio when _state.Offline:
                {
                    var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Request, Kind = LoaiXin.ThemGio, Minutes = 20, Note = "Con xin thêm 20 phút chơi" });
                    if (r.Ok && r.Status == "cho_mang")
                    {
                        using var h = HopDaLuu.Hop(ManKhoaView.DaLuuThemGio, "Xin thêm 20 phút chơi", int.TryParse(r.Message, out var n) ? n : 1);
                        h.ShowDialog(_lock);
                    }
                    else
                    {
                        // mạng vừa có lại ⇒ lời xin đã tới máy chủ: báo kết quả bằng hộp trên màn khoá (bóng báo bị ẩn khi màn khoá toàn màn hình),
                        // KHÔNG mở thêm hộp xin (không thành hai lời xin)
                        var kq = r.Ok ? TrayView.XinGio(r.Status) : (TrayView.KetQuaXin?)null;
                        var (icon, tieu, phu) = kq switch
                        {
                            TrayView.KetQuaXin.Duoc => ("tick", "Ba Mẹ đã cho thêm giờ", "Máy mở lại sau ít giây."),
                            TrayView.KetQuaXin.TuChoi => ("khien", "Ba Mẹ chưa cho lúc này", "Con nhắn Ba Mẹ nếu cần nhé."),
                            TrayView.KetQuaXin.Cho => ("gui", "Đã gửi Ba Mẹ", "Con xin thêm 20 phút chơi. Ba Mẹ trả lời là máy mở ngay."),
                            null => ("canh_bao", "Chưa gửi được", r.Error ?? "Con thử lại sau nhé."),
                            _ => ("canh_bao", "Lời xin đã hết hạn", "Con gửi lại nhé."),
                        };
                        using var h = new HopThongBao(icon, tieu, phu);
                        h.ShowDialog(_lock);
                    }
                    break;
                }
                case ManKhoaView.DoiSao:
                    OpenRequest(_lock, dungSao: true);
                    break;
                case ManKhoaView.XinThemGio:
                    OpenRequest(_lock);
                    break;
                case ManKhoaView.XinNgoaiLe:
                {
                    using var f = new NgoaiLeForm(_state.AppDuocPhep);
                    f.NhanBaMe += () => OpenApp(MucApp.TinNhan, tuManKhoa: true);
                    f.ShowDialog(_lock);
                    break;
                }
                case ManKhoaView.NhanBaMe:
                    OpenApp(MucApp.TinNhan, tuManKhoa: true);
                    break;
            }
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }

    private XinMoForm? _xinMo;

    /// <summary>«Xin mở trang hoặc app» (một cửa sổ tại một thời điểm cho menu khay, app to, màn chặn; bấm lại chỉ đưa lên trước — đang chờ Ba Mẹ thì
    /// không mất lời xin, không gửi trùng). <paramref name="loai"/> / <paramref name="muc"/>: màn chặn điền sẵn app vừa bị đóng (chỉ khi chưa có cửa sổ).</summary>
    private void OpenXinMo(string loai = LoaiXin.MoWeb, string? muc = null)
    {
        if (_xinMo is { IsDisposed: false }) { if (muc != null) _xinMo.DienSan(loai, muc); _xinMo.Activate(); return; }
        _xinMo = new XinMoForm(loai, muc);
        _xinMo.DaGui += (m, web, r) =>
        {
            var b = BlockedForm.SauKhiGui(m, m, web, r);
            b.VeHomNay += () => OpenApp(MucApp.HomNay);
            b.NhanBaMe += () => OpenApp(MucApp.TinNhan);
            b.Show();
        };
        _xinMo.FormClosed += (_, _) => { _xinMo?.Dispose(); _xinMo = null; };
        _xinMo.Show();
    }

    private async Task TickAsync()
    {
        if (_polling) return;
        _polling = true;
        try
        {
            var fg = UI.Foreground();
            var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Foreground, AppId = fg.Id, AppName = fg.Name });
            if (!res.Ok || res.State == null)
            {
                // Dịch vụ không trả lời: chờ 2 lần liền (~6 giây) cho chắc rồi mới đổi biểu tượng + báo «Dịch vụ AiiGrow không chạy».
                // phiên đã biết KHÔNG phải của Con ⇒ giữ ẩn (dịch vụ khởi động lại không làm biểu tượng hiện ở phiên Ba Mẹ — review #75)
                // CHƯA biết phiên này của ai (dịch vụ chưa trả lời lần nào — máy vừa khởi động, Ba Mẹ đăng nhập trước khi dịch vụ lên) ⇒ chờ ~2 phút
                // mới hiện biểu tượng lỗi, không nháy biểu tượng đỏ ở phiên Ba Mẹ (BUG-007, review #75)
                if (++_pipeFail >= (_daBietPhien ? 2 : 40) && !_anPhienKhac) { Chao(false); SetKetNoi(KetNoiView.Chon(false, null), false); }
                return;
            }
            _pipeFail = 0;
            _daBietPhien = true;
            if (!res.State.PhienCon) { AnVoiPhienKhac(); return; }
            HienLaiNeuDaAn();
            Chao(true);
            _state = res.State;
            _at = DateTimeOffset.Now;
            SetKetNoi(KetNoiView.Chon(true, _state), true);
            if (_state.MoCoi && !_warnedMoCoi)
            {
                _warnedMoCoi = true;
                Toast(10000, "AiiGrow không chặn nữa", MoCoi.CauKhay, ToolTipIcon.Info, MucApp.HomNay);
            }
            HandleWeb();
            HandleLock();
            HandleBlocked();
            HandleWarnings();
        }
        catch (Exception e)
        {
            System.Diagnostics.Debug.WriteLine(e);
        }
        finally { _polling = false; }
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

    private void HandleLock()
    {
        if (_state.Locked)
        {
            if (_lock == null || _lock.IsDisposed)
            {
                _lock = new LockForm(_state.CanExchangePoints);
                _lock.Bam += XuLyNutKhoa;
                _lock.Show();
            }
            _lock.Apply(_state);
        }
        else if (_lock != null)
        {
            _lock.CloseForReal();
            _lock.Dispose();
            _lock = null;
            _warned5 = _warned1 = false;
            if (_app is { IsDisposed: false }) _app.TopMost = false;
            if (_bat.MoKhoa(AppDangHien, UI.DangBanToanManHinh(), DateTimeOffset.Now)) OpenApp(MucApp.NhiemVu, tuBat: true);
        }
    }

    private void HandleBlocked()
    {
        if (_seenBlocked < 0) { _seenBlocked = _state.BlockedSeq; return; }
        if (_state.BlockedSeq == _seenBlocked || _state.Locked) return;
        _seenBlocked = _state.BlockedSeq;
        // một màn chặn tại một thời điểm: app bị đóng lặp lại (Con mở lại liên tục) không chồng nhiều cửa sổ
        if (_blocked is { IsDisposed: false }) { try { _blocked.Close(); _blocked.Dispose(); } catch { } }
        var id = _state.BlockedAppId;
        var homNay = DateOnly.FromDateTime(DateTime.Now);
        if (homNay != _ngayTuGui) { _ngayTuGui = homNay; _soTuGui = 0; }
        var daXin = id != null && (_daXin.Contains(id) || _soTuGui >= ManChanView.TuGuiToiDa);
        if (ManChanView.TuGui(id, _state.BlockedBoiBaMe, _state.Offline, daXin)) _soTuGui++;
        _blocked = new BlockedForm(id, _state.BlockedAppName, _state.BlockedBoiBaMe, _state.Offline, _state.AppDuocPhep, daXin: daXin);
        _blocked.VeHomNay += () => OpenApp(MucApp.HomNay);
        _blocked.NhanBaMe += () => OpenApp(MucApp.TinNhan);
        _blocked.DaXin += x => _daXin.Add(x);
        _blocked.Show();
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
                Toast(6000, "Còn 5 phút mở bằng mã", "Lưu bài đang làm nhé. Hết giờ máy sẽ khoá lại.", ToolTipIcon.Warning, MucApp.HomNay);
            }
        }
        var d = TrayView.Describe(_state, _at, DateTimeOffset.Now);
        if (!d.RemainingSec.HasValue) return;
        var r = d.RemainingSec.Value;
        if (r > 330) _warned5 = false;
        if (r > 90) _warned1 = false;
        if (r <= 300 && r > 240 && !_warned5)
        {
            _warned5 = true;
            // Thiết kế 05/11 (con-het-gio 05): hộp nhỏ góc phải dưới, không cướp phím — đổi sao / xin Ba Mẹ thêm giờ.
            try
            {
                if (_nhac is { IsDisposed: false }) _nhac.Close();
                _nhac = new NhacGioForm(_state.Sao, _state.CanExchangePoints);
                _nhac.DoiSao += () => OpenRequest(dungSao: true);
                _nhac.XinThemGio += () => OpenRequest();
                _nhac.FormClosed += (_, _) => { _nhac?.Dispose(); _nhac = null; };
                _nhac.Show();
            }
            catch { Toast(6000, NhacGioView.Tieu, NhacGioView.Phu(_state.Sao), ToolTipIcon.Warning, MucApp.HomNay); }
        }
        else if (r <= 60 && r > 0 && !_warned1)
        {
            _warned1 = true;
            Toast(6000, "Còn 1 phút", "Máy sắp khoá. Lưu bài ngay nhé.", ToolTipIcon.Warning, MucApp.HomNay);
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _timer.Dispose(); _hvTimer.Dispose(); _app?.Dispose(); _ni.Visible = false; _ni.Dispose(); }
        base.Dispose(disposing);
    }
}
