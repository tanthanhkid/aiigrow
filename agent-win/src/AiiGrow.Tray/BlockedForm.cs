using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Hộp «app chưa có trong danh sách» theo bàn thiết kế (bản 15/11 — con-bi-chan: them-vc4dmaei, them-cbdu6n78, them-jj6fglkl, them-q9a3vr5r, them-fliq9312,
/// them-zxuekzer; con-mat-mang: them-wt782i6x, them-rn7iaunn): giữa màn hình, nền phủ tối.
/// Luồng (#258): app mới cài ⇒ tự gửi lời xin Ba Mẹ thêm vào danh sách (L4) → «Đã gửi Ba Mẹ duyệt» → chờ → «Ba Mẹ đã thêm · Nhóm «Tính phút» / «Không tính phút»»,
/// «Ba Mẹ cho mở N phút» (mở tạm) hoặc «Ba Mẹ chưa thêm · Xin lại». App «Tính phút» bị đóng vì hết sao ⇒ «Hết sao rồi» (<see cref="HetSao"/>).
/// App Ba Mẹ đã chặn ⇒ «… chưa được mở» + chỉ nút «Xin Ba Mẹ mở …» và «Về Hôm nay». KHÔNG dùng sao / điểm để mở app.
/// Mất mạng ⇒ vẫn chặn; lời xin lưu lại, có mạng tự gửi; Ba Mẹ ở cạnh đọc mã 6 số.
/// Nút chỉ GỬI lên máy chủ (qua dịch vụ); mọi quyết định do máy chủ. Chữ lấy từ lớp thuần <see cref="ManChanView"/>.
/// </summary>
internal sealed class BlockedForm : Form
{
    private enum Buoc { ChuaMo, DaGui, Duoc, MoTam, ChuaCho, MatMang, DaLuu, HetSao }

    private readonly string? _appId;
    private readonly string _ten;
    private readonly bool _web;
    private readonly IReadOnlyList<string> _appDuocPhep;
    private readonly IReadOnlyList<string> _appTinhPhut;
    private readonly double? _phutCon;
    private readonly IReadOnlyList<string>? _tenDuocPhep, _tenTinhPhut;   // #307: tên dịch vụ đã giải, cùng thứ tự với mục

    private static string TenChip(IReadOnlyList<string> muc, IReadOnlyList<string>? ten, string m)
    {
        var i = IndexOf(muc, m);
        return ten != null && ten.Count == muc.Count && i >= 0 ? ten[i] : TrayView.FriendlyAppName(m, null);
    }

    /// <summary>#741: hộp này là hộp chặn của <paramref name="muc"/>.</summary>
    public bool LaHopCua(string muc) => string.Equals(_appId, muc.Trim(), StringComparison.OrdinalIgnoreCase);

    private static int IndexOf(IReadOnlyList<string> ds, string m) { for (int i = 0; i < ds.Count; i++) if (ds[i] == m) return i; return -1; }
    private readonly (string Tieu, string Phu, string Dong)? _gioiHan;   // #302: khoá vì giới hạn (còn sao) thay «Hết sao rồi»
    private RequestStatus? _kq;
    private readonly bool _tuGui;
    private readonly FlowLayoutPanel _flow;
    private readonly Label _msg;
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private readonly int _w = UI.Px(340);   // bề rộng nội dung: hộp 388 − lề 24×2
    private ManPhu? _phu;
    private string? _id;
    private DateTimeOffset _guiLuc = DateTimeOffset.Now;
    private int _choMang;
    private bool _daLuu;
    private bool _busy, _dong;

    /// <summary>Con bấm «Về Hôm nay» — khay mở app to mục Hôm nay.</summary>
    public event Action? VeHomNay;
    /// <summary>Con bấm «Nhắn Ba Mẹ» — khay mở app to mục Tin nhắn.</summary>
    public event Action? NhanBaMe;
    /// <summary>Đã gửi được lời xin (id) — khay ghi nhớ để không tự gửi lặp cho cùng app.</summary>
    public event Action<string>? DaXin;
    /// <summary>15/11 «Hết sao rồi»: Con bấm «Làm nhiệm vụ» / «Xin Ba Mẹ cho vay sao».</summary>
    public event Action? LamNhiemVu;
    public event Action? XinVay;
    /// <summary>16/11 (#307, them-vc4dmaei → them-bxw40sw9): Con bấm «Xin Ba Mẹ thêm …» ⇒ khay mở hộp «Xin thêm …» (chip nhóm + lời nhắn) — (mục, tên).</summary>
    public event Action<string, string>? XinThem;

    /// <param name="appId">Định danh app vừa bị đóng (roblox.exe) hoặc tên miền (web).</param>
    /// <param name="boiBaMe">App Ba Mẹ đặt «Chặn» ⇒ không tự gửi, chỉ có nút xin.</param>
    /// <param name="daXin">Lời xin cho app này đã gửi trong phiên khay ⇒ không tự gửi lại.</param>
    /// <param name="appTinhPhut">Mục «Tính phút» (tô vàng trong danh sách của con); <paramref name="appDuocPhep"/> = «Không tính phút» (tô xanh).</param>
    public BlockedForm(string? appId, string? appName, bool boiBaMe, bool offline, IReadOnlyList<string>? appDuocPhep = null, bool web = false, bool daXin = false,
        IReadOnlyList<string>? appTinhPhut = null, double? phutCon = null, bool hetSao = false, (string Tieu, string Phu, string Dong)? gioiHan = null,
        IReadOnlyList<string>? tenDuocPhep = null, IReadOnlyList<string>? tenTinhPhut = null)
    {
        _tenDuocPhep = tenDuocPhep;
        _tenTinhPhut = tenTinhPhut;
        _gioiHan = gioiHan;
        _appTinhPhut = appTinhPhut ?? Array.Empty<string>();
        _phutCon = phutCon;
        AiiGrow.ClayUi.Clay.KhongMnemonic(this);
        _appId = appId?.Trim();
        _ten = TrayView.FriendlyAppName(appId, appName);
        _web = web;
        _appDuocPhep = appDuocPhep ?? Array.Empty<string>();
        _tuGui = ManChanView.TuGui(_appId, boiBaMe, offline, daXin);

        Text = "AiiGrow";
        Icon = UI.AppIcon();
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true; ShowInTaskbar = false;
        BackColor = UI.Paper;
        AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;
        KeyPreview = true;
        KeyDown += (_, e) => { if (e.KeyCode == Keys.Escape) DongHan(); };

        _flow = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(24), UI.Px(18), UI.Px(24), UI.Px(14)), Margin = Padding.Empty, BackColor = UI.Paper,
        };
        _msg = UI.Text("", 10f, false, UI.Error, _w);
        Controls.Add(_flow);
        SizeChanged += (_, _) => { if (IsHandleCreated) GiuaManHinh(); };

        // Nền phủ tối sau hộp (thiết kế #phu) — hiện trước hộp, đóng cùng hộp.
        Load += (_, _) => { try { _phu = new ManPhu(); _phu.DongHop = DongHan; _phu.Show(); BringToFront(); Activate(); } catch { _phu = null; } };
        Shown += (_, _) => { BringToFront(); Activate(); };   // #642: hộp luôn nằm TRÊN lớp mờ (nút ✕ / Esc bấm được)
        FormClosed += (_, _) => { _dong = true; _poll.Stop(); _poll.Dispose(); try { _phu?.Close(); _phu?.Dispose(); } catch { } };
        _poll.Tick += async (_, _) => await PollAsync();

        if (hetSao) Ve(Buoc.HetSao);
        else if (offline) Ve(Buoc.MatMang);
        else if (_tuGui) { Ve(Buoc.DaGui); Shown += async (_, _) => await GuiAsync(); }
        else Ve(Buoc.ChuaMo);
    }

    /// <summary>15/11 (them-zxuekzer): app «Tính phút» bị đóng vì hết sao ⇒ «Hết sao rồi · Con dùng hết sao · Roblox sắp đóng».</summary>
    public static BlockedForm HetSao(string appId, string? appName) => new(appId, appName, boiBaMe: true, offline: false, hetSao: true);

    /// <summary>16/11 (#302): app «Tính phút» bị đóng vì đang nghỉ giữa hai lượt / đã chơi đủ hôm nay (còn sao) ⇒ «Nghỉ một chút · chơi tiếp lúc HH:MM».</summary>
    public static BlockedForm GioiHan(string appId, string? appName, (string Tieu, string Phu, string Dong) chu)
        => new(appId, appName, boiBaMe: true, offline: false, hetSao: true, gioiHan: chu);


    private void GiuaManHinh()
    {
        var wa = Screen.PrimaryScreen!.WorkingArea;
        Location = new Point(wa.Left + (wa.Width - Width) / 2, wa.Top + (wa.Height - Height) / 2);
    }

    // ------------------------------------------------------------------ các bước

    private void Ve(Buoc b)
    {
        _flow.SuspendLayout();
        foreach (Control c in _flow.Controls.Cast<Control>().ToList()) { _flow.Controls.Remove(c); if (c != _msg) c.Dispose(); }
        _msg.Text = "";
        _msg.ForeColor = UI.Error;
        switch (b)
        {
            case Buoc.ChuaMo when _web:
                // them-dnm1pzqs: «Trang này chưa có trong danh sách» · Xin Ba Mẹ mở · Về trang chính
                _flow.Controls.Add(KhoiCon.Dau("web", KhoiCon.Mau.Ngoc, ManChanView.WebTieu, LaTrangWeb(_ten) ? _ten : null, _w));
                _flow.Controls.Add(KhoiCon.RobNoi("cho", ManChanView.WebVui1, ManChanView.WebVui2, _w));
                if (ManChanView.CoNutXin(_appId))
                {
                    var xw = KhoiCon.Nut(ManChanView.WebNutXin, true, _w);
                    xw.Click += async (_, _) => { Ve(Buoc.DaGui); await GuiAsync(); };
                    _flow.Controls.Add(xw);
                }
                ThemNutVeHomNay(chinh: false, chu: ManChanView.VeTrangChinh);
                break;

            case Buoc.ChuaMo:
                // them-vc4dmaei: «YouTube chưa được thêm» · «Chưa có trong danh sách của con» · danh sách xanh / vàng · «Xin Ba Mẹ thêm YouTube»
                _flow.Controls.Add(KhoiCon.Dau("khoa", KhoiCon.Mau.Cam, ManChanView.TieuDe(_ten), ManChanView.LoiChan(_ten, ManChanView.MoTaApp(_appId)), _w));   // #668: lời bé hiểu + mô tả ngắn tên app
                if (_appDuocPhep.Count + _appTinhPhut.Count > 0)
                {
                    var dd = UI.Text(ManChanView.ChuThichDs, 9.75f, true, Clay.Chu2, _w);
                    _flow.Controls.Add(dd);
                    _flow.Controls.Add(KhoiCon.Chips(_w, _appDuocPhep.Take(6).Select(a => (Control)new ChipClay(TenChip(_appDuocPhep, _tenDuocPhep, a), Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon("sach")))
                        .Concat(_appTinhPhut.Where(a => !_appDuocPhep.Contains(a)).Take(6).Select(a => (Control)new ChipClay(TenChip(_appTinhPhut, _tenTinhPhut, a), Clay.DiemSoft, Clay.DiemInk, Anh3D.Icon(ManChanView.IconMuc(a)), kim: true)))
                        .ToArray()));
                }
                if (ManChanView.CoNutXin(_appId))
                {
                    var xin = KhoiCon.Nut(ManChanView.NutXin(_ten), true, _w, "gui");
                    // #307: Bàn đi tới «Xin thêm …» (them-bxw40sw9); không có khay nghe (hộp mở riêng) thì gửi thẳng như trước
                    xin.Click += async (_, _) =>
                    {
                        if (XinThem is { } mo && _appId != null) { var (m, t) = (_appId, _ten); DongHan(); mo(m, t); return; }
                        Ve(Buoc.DaGui); await GuiAsync();
                    };
                    _flow.Controls.Add(xin);
                }
                else if (ManChanView.CoNutNhanXin(_appId))
                {
                    // #741: công cụ Windows (PowerShell…) — máy chủ không nhận lời xin thêm app ⇒ bé nhắn Ba Mẹ trong mục Tin nhắn
                    var nhan = KhoiCon.Nut(ManChanView.NutNhanXin(_ten), true, _w, "tin");
                    nhan.Click += (_, _) => { NhanBaMe?.Invoke(); DongHan(); };
                    _flow.Controls.Add(nhan);
                    _flow.Controls.Add(UI.Text(ManChanView.NhanXinPhu, 9.75f, false, UI.Muted, _w));
                }
                ThemNutVeHomNay(chinh: false);
                break;

            case Buoc.HetSao when _gioiHan is { } gh:
            {
                _flow.Controls.Add(KhoiCon.Dau("sao", KhoiCon.Mau.Vang, gh.Tieu, gh.Phu, _w));
                _flow.Controls.Add(UI.Text(gh.Dong, 10f, false, UI.Muted, _w));
                var vay = KhoiCon.Nut(SaoView.NutXinVay, true, _w, "gui");
                vay.Click += (_, _) => { DongHan(); XinVay?.Invoke(); };
                _flow.Controls.Add(vay);
                CancelButton = vay;
                break;
            }

            case Buoc.HetSao:
            {
                // Bàn them-zxuekzer: đồng hồ cát · thẻ trắng «Con còn 0 sao» + dòng phụ · Làm nhiệm vụ · Xin Ba Mẹ cho vay sao (nút phụ, không icon)
                _flow.Controls.Add(KhoiCon.Dau("dong_ho_cat", KhoiCon.Mau.Cam, HetSaoView.PopTieu, HetSaoView.PopPhu(_ten), _w));
                _flow.Controls.Add(KhoiXin.TheIcon("sao", HetSaoView.PopSao, HetSaoView.PopDong, _w, Clay.DiemInk));
                var lam = KhoiCon.Nut("Làm nhiệm vụ", true, _w, "tick");
                lam.Click += (_, _) => { LamNhiemVu?.Invoke(); DongHan(); };
                _flow.Controls.Add(lam);
                var vay = KhoiCon.Nut(SaoView.NutXinVay, false, _w);
                vay.Click += (_, _) => { DongHan(); XinVay?.Invoke(); };
                _flow.Controls.Add(vay);
                CancelButton = vay;
                break;
            }

            case Buoc.DaGui:
            {
                var (tieu, phu) = ManChanView.DaGui(_ten, _web, _tuGui, _guiLuc);
                _flow.Controls.Add(KhoiCon.Dau(_web ? "web" : "gui", KhoiCon.Mau.Ngoc, tieu, phu, _w));
                _flow.Controls.Add(KhoiCon.RobNoi("cho", ManChanView.DangXem, ManChanView.TraLoiLaBiet, _w));
                _flow.Controls.Add(KhoiCon.Chips(_w,
                    new ChipClay(ManChanView.DangCho, Clay.CanhSoft, Clay.Canh, chamCho: true),
                    new ChipClay(ManChanView.ChuaMoDuoc(_ten), Clay.Lom, Clay.Chu2)));
                ThemNutVeHomNay(chinh: false);
                break;
            }

            case Buoc.Duoc:
            {
                // them-jj6fglkl / them-q9a3vr5r / them-0uw5wpyr: «Ba Mẹ đã thêm CapCut» · «Mẹ Lan thêm vào danh sách lúc 19:32» · nhóm · «Mở CapCut»
                var luc = _kq?.Luc ?? DateTimeOffset.Now;
                var khong = _kq?.Nhom == "khong_tinh_phut";
                _flow.Controls.Add(KhoiCon.Dau("tick", KhoiCon.Mau.Ngoc, KetQuaXinView.DaThemTieu(_ten), KetQuaXinView.DaThemLuc(_kq?.TenNguoiDuyet, luc, _web), _w));
                _flow.Controls.Add(KhoiCon.RobNoi("xong", KetQuaXinView.DaThemVui(_ten, khong, _web), KetQuaXinView.LanSau, _w));
                if (!string.IsNullOrWhiteSpace(_kq?.LoiNhan)) _flow.Controls.Add(KhoiCon.DongIcon("tin", $"«{_kq!.LoiNhan!.Trim()}»", _w, false));
                // Bàn them-jj6fglkl / them-q9a3vr5r / them-0uw5wpyr: chip nhóm (ngọc, đồng hồ / sách) trên, chip sao dưới
                var c1 = new ChipClay(KetQuaXinView.Nhom(khong, _web), Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon(khong ? "sach" : "dongho"));
                var c2 = new ChipClay(KetQuaXinView.NhomPhu(khong, _phutCon), khong ? Clay.NgocSoft : Clay.DiemSoft, khong ? Clay.NgocInk : Clay.DiemInk, Anh3D.Icon("sao"), kim: !khong);
                _flow.Controls.Add(KhoiCon.Chips(_w, c1));
                _flow.Controls.Add(KhoiCon.Chips(_w, c2));
                var mo = KhoiCon.Nut(KetQuaXinView.Mo(_ten), true, _w);
                mo.Click += (_, _) => { MoMuc(); DongHan(); };
                _flow.Controls.Add(mo);
                break;
            }

            case Buoc.MoTam:
            {
                var phut = _kq?.MoTam?.Phut ?? 0;
                _flow.Controls.Add(KhoiCon.Dau("mo_khoa", KhoiCon.Mau.Ngoc, KetQuaXinView.MoTamTieu(phut), KetQuaXinView.MoTamPhu(_ten, _kq?.MoTam?.Den), _w));
                if (!string.IsNullOrWhiteSpace(_kq?.LoiNhan)) _flow.Controls.Add(KhoiCon.DongIcon("tin", $"«{_kq!.LoiNhan!.Trim()}»", _w, false));
                var mo = KhoiCon.Nut(KetQuaXinView.Mo(_ten), true, _w);
                mo.Click += (_, _) => { MoMuc(); DongHan(); };
                _flow.Controls.Add(mo);
                break;
            }

            case Buoc.ChuaCho:
            {
                // them-fliq9312 / them-vkdikuo0: «Ba Mẹ chưa thêm CapCut» · «Mẹ Lan trả lời lúc 19:32» · lời nhắn · «Xin lại» · «Về trang chính»
                var luc = _kq?.Luc ?? DateTimeOffset.Now;
                _flow.Controls.Add(KhoiCon.Dau(_web ? "web" : "game", KhoiCon.Mau.Ngoc, KetQuaXinView.ChuaThemTieu(_ten), KetQuaXinView.ChuaThemLuc(_kq?.TenNguoiDuyet, luc), _w));
                if (!string.IsNullOrWhiteSpace(_kq?.LoiNhan)) _flow.Controls.Add(KhoiXin.TheIcon("tin", null, $"«{_kq!.LoiNhan!.Trim()}»", _w, UI.Ink));
                var cau = UI.Text(KetQuaXinView.ChuaThemCau(_ten) + "\n" + KetQuaXinView.XinLaiSau, 10.5f, true, UI.Ink, _w);
                cau.AutoSize = false; cau.Width = _w; cau.TextAlign = ContentAlignment.TopCenter;
                cau.Height = TextRenderer.MeasureText(cau.Text, cau.Font, new Size(_w, 0), TextFormatFlags.WordBreak).Height + UI.Px(10);
                _flow.Controls.Add(cau);
                if (ManChanView.CoNutXin(_appId))
                {
                    // Bàn: «Xin lại» → Tin nhắn (nhắn Ba Mẹ xin lại)
                    var lai = KhoiCon.Nut(KetQuaXinView.XinLai, true, _w, "tin");
                    lai.Click += (_, _) => { NhanBaMe?.Invoke(); DongHan(); };
                    _flow.Controls.Add(lai);
                }
                ThemNutVeHomNay(chinh: false, chu: KetQuaXinView.VeTrangChinh);
                break;
            }

            case Buoc.MatMang:
            {
                _flow.Controls.Add(KhoiCon.Dau("khien", KhoiCon.Mau.Cam, ManChanView.MatMangTieu(_ten), ManChanView.MatMangPhu, _w));
                if (ManChanView.CoNutXin(_appId))
                {
                    // đã lưu lời xin (quay lại bằng «‹ Lùi») ⇒ nút thành trạng thái «đã lưu», không lưu lại
                    var xin = KhoiCon.Nut(_daLuu ? ManChanView.DaLuuTieu : ManChanView.NutXin(_ten), true, _w, _daLuu ? "tick" : "gui");
                    if (_daLuu) xin.Enabled = false;
                    else xin.Click += async (_, _) => await GuiAsync();
                    _flow.Controls.Add(xin);
                    _flow.Controls.Add(UI.Text(ManChanView.CoMangLaGui, 9.75f, false, UI.Muted, _w));
                }
                // Ba Mẹ ở cạnh: đọc mã 6 số (mã mở offline — dịch vụ tự kiểm, mở cả máy có hạn)
                // #307 them-wt782i6x: ô mã + «Mở app» cạnh nhau; «‹ Về Hôm nay» là nút phụ rộng hết hộp
                var code = new OfflineCodePanel(_w, nhan: ManChanView.BaMeOCanh, nut: ManChanView.MoApp, ngang: true);
                code.Unlocked += DongHan;
                _flow.Controls.Add(code);
                var ve = KhoiCon.Nut("‹ " + ManChanView.VeHomNay, false, _w);
                ve.Margin = new Padding(0, UI.Px(12), 0, 0);
                ve.Click += (_, _) => { VeHomNay?.Invoke(); DongHan(); };
                _flow.Controls.Add(ve);
                break;
            }

            case Buoc.DaLuu:
                // Bàn them-rn7iaunn: «Đã lưu lời xin của con» · thẻ «Chờ có mạng (n)» · «Về Hôm nay» (chính) + «‹ Lùi» (về màn mất mạng)
                HopDaLuu.Ve(_flow, _w, ManChanView.DaLuuTieu, "Xin mở " + _ten, _choMang, () => { VeHomNay?.Invoke(); DongHan(); }, ManChanView.VeHomNay,
                    "khien", () => Ve(Buoc.MatMang), ManChanView.DaLuuPhu, luc: _guiLuc);
                break;
        }
        _flow.Controls.Add(_msg);
        _flow.ResumeLayout(true);
    }

    /// <summary>Mục là tên miền (y8.com) chứ không phải app (.exe / gói Store).</summary>
    internal static bool LaTrangWeb(string muc) => muc.Contains('.') && !muc.EndsWith(".exe", StringComparison.OrdinalIgnoreCase);

    private void ThemNutVeHomNay(bool chinh, string? icon = null, string? chu = null)
    {
        var b = KhoiCon.Nut(chu ?? ManChanView.VeHomNay, chinh, _w, icon);
        b.Click += (_, _) => { VeHomNay?.Invoke(); DongHan(); };
        _flow.Controls.Add(b);
        CancelButton = b;
    }

    // ------------------------------------------------------------------ gửi + chờ

    private async Task GuiAsync()
    {
        if (_busy || string.IsNullOrEmpty(_appId)) return;
        _busy = true;
        _guiLuc = DateTimeOffset.Now;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.XinDuyet, AppId = _appId, AppName = _ten, Kieu = _web ? XinThemChonView.KieuWeb : null }   /* #741: trang chặn ⇒ lời xin «mo_web» */);
        _busy = false;
        if (_dong || IsDisposed) return;
        var (daGui, loi) = ManChanView.KetQuaGui(r.Ok, r.Error);
        if (!daGui)
        {
            // không gửi được (dịch vụ không trả lời, máy chủ từ chối…) ⇒ về màn chặn có nút xin + câu lỗi (#642: đóng được bằng nút / Esc / bấm nền)
            Ve(Buoc.ChuaMo);
            _msg.Text = loi!;
            return;
        }
        NhanKetQua(r);
    }

    private void NhanKetQua(PipeResponse r)
    {
        if (r.Status == "cho_mang")
        {
            _choMang = int.TryParse(r.Message, out var n) ? n : 1;
            _daLuu = true;
            if (_appId != null) DaXin?.Invoke(_appId);
            Ve(Buoc.DaLuu);
            return;
        }
        if (_appId != null) DaXin?.Invoke(_appId);
        _id = r.Id;
        var kq = KetQuaXinView.Doc(r.KetQua?.KetQua, r.Status);
        _kq = r.KetQua ?? _kq;
        if (kq != KetQuaXinView.Loai.Cho) { VeKetQua(kq); return; }
        Ve(Buoc.DaGui);
        if (!string.IsNullOrEmpty(_id)) _poll.Start();
    }

    private async Task PollAsync()
    {
        if (_id == null || _busy || _dong) return;
        _busy = true;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _id });
        _busy = false;
        if (!r.Ok || _dong || IsDisposed) return;
        var kq = KetQuaXinView.Doc(r.KetQua?.KetQua, r.Status);
        if (kq == KetQuaXinView.Loai.Cho) return;
        _poll.Stop();
        _kq = r.KetQua;
        VeKetQua(kq);
    }

    private void VeKetQua(KetQuaXinView.Loai kq)
    {
        switch (kq)
        {
            case KetQuaXinView.Loai.DaThem: Ve(Buoc.Duoc); break;
            case KetQuaXinView.Loai.MoTam: Ve(Buoc.MoTam); break;
            case KetQuaXinView.Loai.ChuaThem: Ve(Buoc.ChuaCho); break;
            case KetQuaXinView.Loai.HetHan: HetHan(); break;
        }
    }

    /// <summary>Lời xin hết hạn / bị huỷ mà Ba Mẹ chưa trả lời ⇒ KHÔNG nói «Ba Mẹ chưa cho»: về màn chặn, Con gửi lại được.</summary>
    private void HetHan()
    {
        _id = null;
        Ve(Buoc.ChuaMo);
        _msg.ForeColor = UI.Warn;
        _msg.Text = XinMoView.ThongBao(TrayView.KetQuaXin.HetHan, _ten);
    }

    /// <summary>«Mở …» sau khi Ba Mẹ cho: web ⇒ mở trang trong trình duyệt mặc định; app ⇒ thử chạy theo tên (App Paths). Không được thì thôi (Con mở lại như thường).</summary>
    private void MoMuc() => MoMuc(_appId, _web);

    /// <summary>Mở app / trang sau khi Ba Mẹ cho (dùng chung với XinThemForm): web ⇒ trình duyệt mặc định; app ⇒ chạy theo tên (App Paths). Lỗi thì thôi.</summary>
    internal static void MoMuc(string? muc, bool web)
    {
        if (string.IsNullOrEmpty(muc)) return;
        try
        {
            var dich = web ? (muc.Contains("://") ? muc : "https://" + muc) : muc;
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(dich) { UseShellExecute = true });
        }
        catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
    }

    private void DongHan()
    {
        try { Close(); } catch { /* rơi xuống Dispose */ }
        if (!IsDisposed) { try { Dispose(); } catch { } }
    }
}
