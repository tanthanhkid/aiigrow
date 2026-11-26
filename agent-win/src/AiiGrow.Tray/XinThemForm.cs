using System.Text.Json;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Xin thêm YouTube» theo Bàn con-xin (16/11, #307): them-bxw40sw9 (hai chip nhóm Ba Mẹ sẽ chọn + ô «Nhắn Ba Mẹ» + «Xin Ba Mẹ thêm YouTube»)
/// → them-6tn8aozf «Đã gửi Ba Mẹ! · Con xin thêm YouTube · Đang chờ Ba Mẹ» → them-359v1pre «Mẹ Lan đã thêm! · YouTube · Tính phút · 18 sao = 18 phút»
/// / them-vkdikuo0 «Ba Mẹ chưa thêm YouTube». Mở từ màn «… chưa được thêm» (them-vc4dmaei, nút «Xin Ba Mẹ thêm …»).
/// Gửi qua dịch vụ (PipeCmd.XinDuyet, như BlockedForm) — máy chủ xếp nhóm khi Ba Mẹ duyệt; mất mạng ⇒ lưu, có mạng tự gửi.
/// #422: chế độ CHỌN (chưa có mục — mở từ nút «Xin thêm app / web» ở Hôm nay / menu khay / «Xin lại»): hai thẻ «App trên máy» (lưới app đã cài, them-c0sycsos)
/// / «Trang web» (ô địa chỉ, them-u94tbp3x); gửi kèm kieu app | web, rồi dùng lại đúng các màn kết quả bên dưới.
/// </summary>
internal sealed class XinThemForm : HopKhayCoBan
{
    public const string SauNhan = "nhan", SauHomNay = "hom_nay";

    private string _muc;
    private string _ten;
    private bool _web;
    private readonly double? _phutCon;
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = XinMoView.LoiNhanToiDa, ForeColor = UI.Ink, PlaceholderText = XinThemView.GoiYNhan };
    // ---- #422 chế độ chọn
    /// <summary>true = hộp «Xin thêm app / web» (Con tự chọn app / gõ web); false = hộp «Xin thêm YouTube» cho một mục có sẵn.</summary>
    private readonly bool _chon;
    private bool _theWeb;
    private AppTrenMay? _appChon;
    /// <summary>Mục điền sẵn ở thẻ app («Xin lại» từ màn «Ba Mẹ chưa thêm …») — chọn khi danh sách app về.</summary>
    private string? _appDienSan;
    private bool _dangChon;
    private Button? _gui;
    private readonly TextBox _diaChi = new() { Font = UI.F(12f), MaxLength = XinMoView.MucToiDa, ForeColor = UI.Ink, PlaceholderText = "scratch.mit.edu" };
    /// <summary>Danh sách app lần đọc gần nhất (dùng lại khi mở hộp lần sau, trong lúc hỏi dịch vụ). null = chưa đọc được lần nào.</summary>
    private static List<AppTrenMay>? _dsApp;
    private bool _daTaiApp;
    /// <summary>Lưới app dựng một lần, giữ qua các lần vẽ lại (đổi thẻ, quay lại từ «Đã gửi») — máy có hàng trăm app; danh sách đổi thì dựng lại.</summary>
    private Control? _khungLuoi;
    /// <summary>Dịch vụ chưa quét xong (vừa khởi động / chưa ghép) ⇒ hỏi lại mỗi 10 giây khi hộp còn mở.</summary>
    private readonly System.Windows.Forms.Timer _taiLai = new() { Interval = 10_000 };
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    /// <summary>#686: 40 lần hỏi lỗi liên tiếp (3 giây / lần ≈ 2 phút) ⇒ thôi chờ.</summary>
    private readonly DemLoiHoi _pollLoi = new(5);
    private string? _id;
    /// <summary>Đã gửi lời xin (máy chủ nhận / đang chờ) — chặn gửi trùng kể cả khi máy chủ không trả id.</summary>
    private bool _daGui;
    private bool _busy;
    private Label? _msg;

    /// <summary>Tên app đang xin (đã giải) — khay chỉ chặn popup kết quả của đúng lời xin này.</summary>
    public string Ten => _ten;

    /// <summary>Mục đang xin (exe / tên miền) — khay không mở thêm màn chặn cho đúng mục này khi hộp đang mở.</summary>
    public string Muc => _muc;

    /// <summary>#422: hộp «Xin thêm app / web» (Con tự chọn) — khác hộp xin một mục có sẵn từ màn chặn.</summary>
    public bool LaHopChon => _chon;

    /// <summary>Con muốn đi đâu sau khi đóng hộp (null = về chỗ cũ): <see cref="SauNhan"/> | <see cref="SauHomNay"/>.</summary>
    public string? Sau { get; private set; }
    /// <summary>Đã gửi được lời xin (mục) — khay ghi nhớ để không tự gửi lặp.</summary>
    public event Action<string>? DaXin;

    public XinThemForm(string muc, string? ten, double? phutCon) : base(XinThemView.TieuDeCuaSo, UI.Px(380))
    {
        _muc = muc.Trim();
        _ten = TrayView.FriendlyAppName(muc, ten);
        _web = BlockedForm.LaTrangWeb(_muc);
        _phutCon = phutCon;
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => DonDep();
        VeXin();
    }

    /// <summary>#422 «Xin thêm app / web» (them-c0sycsos / them-u94tbp3x). <paramref name="web"/> + <paramref name="muc"/>: «Xin lại» điền sẵn trang / app vừa xin.</summary>
    public XinThemForm(double? phutCon, bool web = false, string? muc = null) : base(XinThemChonView.TieuDeCuaSo, UI.Px(420))
    {
        _chon = true;
        _muc = ""; _ten = "";
        _phutCon = phutCon;
        _theWeb = web;
        if (!string.IsNullOrWhiteSpace(muc)) { if (web) _diaChi.Text = muc.Trim(); else _appDienSan = muc.Trim(); }
        _diaChi.TextChanged += (_, _) => CapNhatNut();
        _diaChi.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter && _gui is { Enabled: true } g) { e.SuppressKeyPress = true; await GuiAsync(g); } };
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => DonDep();
        Shown += async (_, _) => await TaiAppAsync();
        _taiLai.Tick += async (_, _) => { _taiLai.Stop(); await TaiAppAsync(); };
        VeXin();
    }

    private void DonDep()
    {
        _poll.Dispose();
        _taiLai.Dispose();
        BoLuoi();
        if (_note.Parent == null) _note.Dispose();
        if (_diaChi.Parent == null) _diaChi.Dispose();
    }

    private void Xoa()
    {
        _note.Parent?.Controls.Remove(_note);
        _diaChi.Parent?.Controls.Remove(_diaChi);
        _khungLuoi?.Parent?.Controls.Remove(_khungLuoi);
        _gui = null;
        _dangChon = false;
        XoaHet();
    }

    /// <summary>them-bxw40sw9 (một mục có sẵn) / #422 them-c0sycsos · them-u94tbp3x (chế độ chọn).</summary>
    internal void VeXin()
    {
        if (_chon) { VeChon(); return; }
        _poll.Stop();
        Xoa();
        Text = XinThemView.TieuDeCuaSo;
        var dau = KhoiCon.Hang();
        dau.Margin = new Padding(0, 0, 0, UI.Px(10));
        var dong = KhoiXin.NutTron("✕", Close);   // Bàn: ✕ → Hôm nay (đóng hộp)
        dau.Controls.Add(dong);
        var v = KhoiApp.Vien(_web ? "web" : "game", 52);
        dau.Controls.Add(v);
        var cot = KhoiCon.Cot();
        var r = W - dong.Width - dong.Margin.Horizontal - v.Width - v.Margin.Horizontal;
        var t = UI.Text(XinThemView.Tieu(_ten), 15f, true, UI.Ink, r); t.Margin = new Padding(0, 0, 0, UI.Px(2));
        var p = UI.Text(XinThemView.Phu(_ten), 9.75f, false, UI.Muted, r); p.Margin = Padding.Empty;
        cot.Controls.Add(t); cot.Controls.Add(p);
        cot.Margin = new Padding(0, Math.Max(0, (v.Height - cot.PreferredSize.Height) / 2), 0, 0);
        dau.Controls.Add(cot);
        Flow.Controls.Add(dau);
        var nhan = UI.Text(XinThemView.BaMeChonNhom, 10.5f, true, Clay.Chu2, W); nhan.Margin = new Padding(0, 0, 0, UI.Px(6));
        Flow.Controls.Add(nhan);
        Flow.Controls.Add(KhoiCon.Chips(W,
            KhoiXin.Chip(XinThemView.NhomTinh, Clay.DiemSoft, Clay.DiemInk, "sao", kim: true),
            KhoiXin.Chip(XinThemView.NhomKhong, Clay.NgocSoft, Clay.NgocInk, "sach")));
        Flow.Controls.Add(ONhapClay.Boc(_note, W));
        var gui = KhoiCon.Nut(XinThemView.Nut(_ten), true, W, "tin");
        gui.Click += async (_, _) => await GuiAsync(gui);
        // quay lại từ «Đã gửi» khi lời xin còn chờ ⇒ không cho gửi trùng
        if (_daGui) { gui.Enabled = false; gui.Text = XinThemView.DangCho; }
        Flow.Controls.Add(gui);
        _msg = UI.Text("", 10f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        Xong();
    }

    private async Task GuiAsync(Button b)
    {
        if (_busy) return;
        string? kieu = null;
        var (mucCu, tenCu, webCu) = (_muc, _ten, _web);
        if (_chon)
        {
            // #422: lấy mục theo thẻ đang chọn; web kiểm cơ bản tại máy (có dấu chấm, không khoảng trắng) trước khi gửi
            if (_theWeb)
            {
                var web = XinThemChonView.ChuanWeb(_diaChi.Text);
                if (web == null) { if (_msg != null) { _msg.ForeColor = UI.Error; _msg.Text = XinThemChonView.WebSai; } return; }
                (_muc, _ten, _web, kieu) = (web, web, true, XinThemChonView.KieuWeb);
            }
            else
            {
                if (_appChon is not { } a) return;
                (_muc, _ten, _web, kieu) = (a.Muc, a.Ten, false, XinThemChonView.KieuApp);
            }
        }
        if (_muc.Length == 0) return;
        _busy = true; b.Enabled = false;
        if (_msg != null) _msg.Text = "";
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.XinDuyet, AppId = _muc, AppName = _ten, Note = XinVayView.LyDo(_note.Text), Kieu = kieu });
        _busy = false;
        if (r.Ok) DaXin?.Invoke(_muc);   // Con đóng hộp lúc đang gửi: lời xin vẫn đã gửi ⇒ khay vẫn phải biết (không tự gửi lặp)
        if (IsDisposed) return;
        if (!r.Ok)
        {
            // web_sai / quá nhiều lời xin chờ: hiện đúng câu máy chủ (dịch vụ chuyển nguyên văn)
            if (_msg != null) { _msg.ForeColor = UI.Error; _msg.Text = r.Error ?? "Chưa gửi được. Con thử lại nhé."; }
            if (_chon) { (_muc, _ten, _web) = (mucCu, tenCu, webCu); CapNhatNut(); } else b.Enabled = true;   // chưa gửi được ⇒ hộp không «đang xin» mục này
            return;
        }
        if (r.Status == "cho_mang")
        {
            Xoa();
            HopDaLuu.Ve(Flow, W, ManChanView.DaLuuTieu, XinThemView.DongDaLuu(_ten), int.TryParse(r.Message, out var n) ? n : 1, Close, ManChanView.VeHomNay);
            Xong();
            return;
        }
        _id = string.IsNullOrEmpty(r.Id) ? null : r.Id;
        _pollLoi.DatLai();
        _daGui = true;
        var kq = KetQuaXinView.Doc(r.KetQua?.KetQua, r.Status);
        if (kq != KetQuaXinView.Loai.Cho) { VeKetQua(kq, r.KetQua); return; }
        VeDaGui();
        if (!string.IsNullOrEmpty(_id)) _poll.Start();
    }

    // ---------------------------------------------------------------- #422 chế độ chọn

    /// <summary>them-c0sycsos (thẻ «App trên máy») / them-u94tbp3x (thẻ «Trang web»).</summary>
    private void VeChon()
    {
        _poll.Stop();
        Xoa();
        _dangChon = true;
        Text = XinThemChonView.TieuDeCuaSo;
        var dau = KhoiCon.Hang();
        dau.Margin = new Padding(0, 0, 0, UI.Px(10));
        var dong = KhoiXin.NutTron("✕", Close);   // Bàn: ✕ → Hôm nay (đóng hộp)
        dau.Controls.Add(dong);
        var v = KhoiApp.Vien("cong", 52);
        dau.Controls.Add(v);
        var cot = KhoiCon.Cot();
        var r = W - dong.Width - dong.Margin.Horizontal - v.Width - v.Margin.Horizontal;
        var t = UI.Text(XinThemChonView.Tieu, 15f, true, UI.Ink, r); t.Margin = new Padding(0, 0, 0, UI.Px(2));
        var p = UI.Text(XinThemChonView.Phu, 9.75f, false, UI.Muted, r); p.Margin = Padding.Empty;
        cot.Controls.Add(t); cot.Controls.Add(p);
        cot.Margin = new Padding(0, Math.Max(0, (v.Height - cot.PreferredSize.Height) / 2), 0, 0);
        dau.Controls.Add(cot);
        Flow.Controls.Add(dau);

        // hai thẻ — vùng bấm ≥ 44, cùng kiểu ô chọn của hộp xin vay (kem sẫm khi chọn)
        var the = KhoiCon.Hang();
        the.Margin = new Padding(0, 0, 0, UI.Px(10));
        foreach (var (web, chu, icon) in new[] { (false, XinThemChonView.TheApp, "laptop"), (true, XinThemChonView.TheWeb, "web") })
        {
            var o = new ClayRadio
            {
                Text = chu, TextAlign = ContentAlignment.MiddleCenter, Checked = web == _theWeb, UseMnemonic = false, Image = Anh3D.Icon(icon),
                Width = (W - UI.Px(8)) / 2, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold),
                Margin = new Padding(0, 0, web ? 0 : UI.Px(8), 0),
            };
            o.BackColor = o.Checked ? Clay.NgocSoft : UI.Card;
            o.ForeColor = o.Checked ? Clay.NgocInk : UI.Ink;
            var w = web;
            o.CheckedChanged += (_, _) => { if (o.Checked && _theWeb != w) { _theWeb = w; BeginInvoke(VeChon); } };
            the.Controls.Add(o);
        }
        Flow.Controls.Add(the);

        if (_theWeb)
        {
            Flow.Controls.Add(Nhan(XinThemChonView.DiaChiWeb));
            Flow.Controls.Add(ONhapClay.Boc(_diaChi, W));
            var goiY = UI.Text(XinThemChonView.GoiYWeb, 9.75f, false, UI.Muted, W); goiY.Margin = new Padding(0, UI.Px(2), 0, UI.Px(8));
            Flow.Controls.Add(goiY);
            Flow.Controls.Add(Nhan(XinThemChonView.LoiNhanChoBaMe));
        }
        else
        {
            Flow.Controls.Add(Nhan(XinThemChonView.AppDaCai));
            Flow.Controls.Add(VeLuoi());
        }
        Flow.Controls.Add(ONhapClay.Boc(_note, W));
        var nhan = UI.Text(XinThemView.BaMeChonNhom, 10.5f, true, Clay.Chu2, W); nhan.Margin = new Padding(0, UI.Px(4), 0, UI.Px(6));
        Flow.Controls.Add(nhan);
        Flow.Controls.Add(KhoiCon.Chips(W,
            KhoiXin.Chip(XinThemView.NhomTinh, Clay.DiemSoft, Clay.DiemInk, "sao", kim: true),
            KhoiXin.Chip(XinThemView.NhomKhong, Clay.NgocSoft, Clay.NgocInk, "sach")));
        var gui = KhoiCon.Nut(XinThemChonView.NutWeb, true, W, "tin");
        gui.Click += async (_, _) => await GuiAsync(gui);
        _gui = gui;
        Flow.Controls.Add(gui);
        _msg = UI.Text("", 10f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        CapNhatNut();
        Xong();
        if (_theWeb && IsHandleCreated) BeginInvoke(() => { if (!_diaChi.IsDisposed && _diaChi.Parent != null) _diaChi.Focus(); });
    }

    private Label Nhan(string chu)
    {
        var l = UI.Text(chu, 10.5f, true, Clay.Chu2, W);
        l.Margin = new Padding(0, 0, 0, UI.Px(6));
        return l;
    }

    /// <summary>Lưới app đã cài (3 cột, cuộn khi quá 3 hàng); chọn một app ⇒ nút «Xin Ba Mẹ thêm &lt;Tên&gt;». Dựng một lần, giữ lại qua các lần vẽ lại.</summary>
    private Control VeLuoi()
    {
        if (_khungLuoi is { IsDisposed: false } cu) return cu;
        var ds = _dsApp;   // «Xin lại» chỉ chọn sẵn khi khớp một app trong lần quét (tên hiển thị không phải định danh — không tự tạo ô)
        if (ds == null || ds.Count == 0)
        {
            var l = UI.Text(ds == null || !_daTaiApp ? XinThemChonView.DangDocApp : XinThemChonView.ChuaCoApp, 10.5f, false, UI.Muted, W);
            l.Margin = new Padding(0, 0, 0, UI.Px(10));
            return l;   // không giữ: lần tải sau vẽ lưới thật
        }
        if (_appChon != null && !ds.Any(a => string.Equals(a.Muc, _appChon.Muc, StringComparison.OrdinalIgnoreCase))) _appChon = null;
        if (_appChon == null && _appDienSan is { } dien2)
            _appChon = ds.FirstOrDefault(a => string.Equals(a.Muc, dien2, StringComparison.OrdinalIgnoreCase) || string.Equals(a.Ten, dien2, StringComparison.OrdinalIgnoreCase));
        const int soCot = 3;
        var gap = UI.Px(8);
        var cao = Clay.Si(44) + VeNut.LeBong.Vertical;
        var soHang = (ds.Count + soCot - 1) / soCot;
        var cuonDoc = soHang > 3;
        var rongLuoi = cuonDoc ? W - SystemInformation.VerticalScrollBarWidth : W;
        var rongO = (rongLuoi - gap * (soCot - 1)) / soCot;
        var luoi = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight, WrapContents = true, BackColor = UI.Paper, Margin = Padding.Empty, Padding = Padding.Empty,
            Width = rongLuoi, Height = soHang * (cao + gap),
        };
        luoi.SuspendLayout();
        for (int i = 0; i < ds.Count; i++)
        {
            var app = ds[i];
            var o = new ClayRadio
            {
                Text = app.Ten, TextAlign = ContentAlignment.MiddleCenter, UseMnemonic = false, AutoEllipsis = true,
                Checked = _appChon != null && string.Equals(app.Muc, _appChon.Muc, StringComparison.OrdinalIgnoreCase), Width = rongO, Height = cao, Font = UI.F(10.5f, FontStyle.Bold),
                Margin = new Padding(0, 0, i % soCot == soCot - 1 ? 0 : gap, gap),   // cột cuối không lề phải ⇒ lưới vừa khít bề rộng
            };
            o.BackColor = o.Checked ? Clay.NgocSoft : UI.Card;
            o.ForeColor = o.Checked ? Clay.NgocInk : UI.Ink;
            o.CheckedChanged += (_, _) =>
            {
                o.BackColor = o.Checked ? Clay.NgocSoft : UI.Card;
                o.ForeColor = o.Checked ? Clay.NgocInk : UI.Ink;
                if (!o.Checked) return;
                _appChon = app;
                if (_msg != null) _msg.Text = "";
                CapNhatNut();
            };
            luoi.Controls.Add(o);
        }
        luoi.ResumeLayout(false);
        // cao tối đa ~3,5 hàng (hàng thứ tư lộ một nửa ⇒ Con biết còn cuộn được); chỉ cuộn dọc
        var khung = new Panel
        {
            Width = W, Height = cuonDoc ? 3 * (cao + gap) + cao / 2 : luoi.Height, BackColor = UI.Paper,
            Margin = new Padding(0, 0, 0, UI.Px(4)),
        };
        khung.AutoScroll = cuonDoc;   // lưới rộng đúng phần trong (trừ thanh cuộn dọc) ⇒ không có thanh cuộn ngang
        khung.Controls.Add(luoi);
        _khungLuoi = khung;
        return khung;
    }

    /// <summary>Bỏ lưới đã dựng (danh sách app đổi / hộp đóng).</summary>
    private void BoLuoi()
    {
        if (_khungLuoi == null) return;
        _khungLuoi.Parent?.Controls.Remove(_khungLuoi);
        _khungLuoi.Dispose();
        _khungLuoi = null;
    }

    /// <summary>Hộp đang mở mà Con bấm «Xin thêm app / web» / «Xin lại» lần nữa: về hộp chọn, chuyển thẻ + điền sẵn (đang gửi thì thôi).</summary>
    public void DienSan(bool web, string? muc)
    {
        if (!_chon || _busy) return;
        if (!string.IsNullOrWhiteSpace(muc))
        {
            _theWeb = web;
            if (web) _diaChi.Text = muc.Trim();
            else
            {
                _appDienSan = muc.Trim();
                _appChon = null;
                BoLuoi();
            }
        }
        else if (_dangChon) return;   // đang ở hộp chọn, không có gì điền ⇒ giữ nguyên
        // đang ở màn kết quả (Đã gửi / Đã thêm / Chưa thêm) ⇒ về hộp chọn như nút ‹; lời xin còn chờ vẫn được theo dõi
        VeChon();
        if (_id != null) _poll.Start();
    }

    /// <summary>Chữ + trạng thái nút gửi theo thẻ / app đang chọn; lời xin vừa gửi còn chờ cho đúng mục này ⇒ «Đang chờ Ba Mẹ», không gửi trùng.</summary>
    private void CapNhatNut()
    {
        if (_gui is not { IsDisposed: false } g || !_dangChon) return;
        string? muc;
        if (_theWeb)
        {
            g.Text = XinThemChonView.NutWeb;
            muc = XinThemChonView.ChuanWeb(_diaChi.Text);
            g.Enabled = !_busy && _diaChi.Text.Trim().Length > 0;
        }
        else
        {
            g.Text = XinThemChonView.NutApp(_appChon?.Ten);
            muc = _appChon?.Muc;
            g.Enabled = !_busy && _appChon != null;
        }
        if (_daGui && muc != null && string.Equals(muc, _muc, StringComparison.OrdinalIgnoreCase)) { g.Enabled = false; g.Text = XinThemView.DangCho; }
    }

    private bool _mau;
    private int _lanHoi;

    /// <summary>Công cụ chụp màn: lưới app mẫu (không hỏi dịch vụ), chọn sẵn <paramref name="chon"/>, điền lời nhắn / địa chỉ mẫu.</summary>
    internal void DatMau(IEnumerable<AppTrenMay> ds, string? chon, string? loiNhan = null, string? diaChi = null)
    {
        _mau = true;
        BoLuoi();
        _dsApp = XinThemChonView.Loc(ds);
        _daTaiApp = true;
        _appChon = chon == null ? null : _dsApp.FirstOrDefault(a => a.Muc == chon);
        if (loiNhan != null) _note.Text = loiNhan;
        if (diaChi != null) _diaChi.Text = diaChi;
        VeChon();
    }

    /// <summary>Hỏi dịch vụ danh sách app đã cài (lần quét gần nhất). Dịch vụ cũ / lỗi ⇒ giữ danh sách cũ (thẻ web vẫn dùng được);
    /// chưa quét xong / rỗng ⇒ hỏi lại sau 10 giây khi hộp còn mở.</summary>
    private async Task TaiAppAsync()
    {
        if (_mau || IsDisposed) return;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.AppMay });
        if (_mau || IsDisposed) return;   // công cụ chụp màn đã đặt danh sách mẫu / hộp đã đóng
        List<AppTrenMay>? ds = null;
        if (r.Ok && !string.IsNullOrEmpty(r.Data))
            try { ds = JsonSerializer.Deserialize<List<AppTrenMay>>(r.Data, Json.Options); } catch (JsonException) { }
        var moi = XinThemChonView.Loc(ds);
        var cu = _dsApp;
        var dangQuet = r.Ok && r.Status == "chua_quet";
        if (r.Ok && (moi.Count > 0 || !dangQuet)) _dsApp = moi;
        else _dsApp ??= moi;
        // dịch vụ đang quét ⇒ «Đang đọc app…» và hỏi lại (tối đa ~5 phút); dịch vụ cũ / lỗi ⇒ thôi hỏi, hiện «Chưa đọc được…»
        var daTaiCu = _daTaiApp;
        var hoiTiep = dangQuet && _dsApp.Count == 0 && ++_lanHoi < 30;
        _daTaiApp = !hoiTiep;
        if (hoiTiep) _taiLai.Start();
        if (_busy) { if (!_taiLai.Enabled) _taiLai.Start(); return; }   // đang gửi ⇒ không bỏ lưới đang hiện, hỏi lại sau
        var doi = cu == null || cu.Count != _dsApp.Count || !cu.Select(a => a.Muc + "\u001f" + a.Ten).SequenceEqual(_dsApp.Select(a => a.Muc + "\u001f" + a.Ten));
        if (!doi && (daTaiCu == _daTaiApp || _dsApp.Count > 0)) return;   // nhãn «Đang đọc / Chưa đọc được» chỉ hiện khi danh sách rỗng
        BoLuoi();
        if (!_dangChon || _theWeb) return;
        VeChon();
    }

    /// <summary>them-6tn8aozf.</summary>
    internal void VeDaGui()
    {
        Xoa();
        Text = "AiiGrow · Đã gửi";
        Flow.Controls.Add(KhoiXin.DauRob("so-tay", W, () => { VeXin(); if (_id != null) _poll.Start(); },
            KhoiXin.Chu(XinThemView.DaGui, 15f, true, UI.Ink),
            KhoiXin.Chu(XinThemView.ConXin(_ten), 10.5f, true, UI.Ink),
            KhoiXin.Chip(XinThemView.DangCho, Clay.DiemSoft, Clay.Canh, "dongho", kim: true)));
        Flow.Controls.Add(UI.Text(XinThemView.TraLoiBaoNgay, 10.5f, false, UI.Muted, W));
        var tiep = KhoiCon.Nut(XinThemView.ChoiTiep(_phutCon), false, W, "dongho");
        tiep.Click += (_, _) => { if (SaoView.Phut(_phutCon) <= 0) Sau = SauHomNay; Close(); };
        Flow.Controls.Add(tiep);
        Xong();
    }

    private async Task PollAsync()
    {
        if (_id == null || _busy) return;
        _busy = true;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _id });
        _busy = false;
        if (IsDisposed) return;
        if (_pollLoi.Ghi(r))
        {
            // #686: máy chủ báo lời xin không còn vài lần liền (mất mạng không tính) ⇒ thôi chờ, mở lại nút gửi (máy chủ gộp lời xin trùng đang chờ);
            // Ba Mẹ trả lời sau đó thì tin «đã thêm / chưa thêm» của máy chủ vẫn báo Con
            _poll.Stop();
            _id = null;
            _daGui = false;
            _pollLoi.DatLai();
            VeXin();
            if (_msg != null) { _msg.ForeColor = UI.Muted; _msg.Text = TheoDoiXinView.ThoiCho; }
            return;
        }
        if (!r.Ok) return;
        var kq = KetQuaXinView.Doc(r.KetQua?.KetQua, r.Status);
        if (kq == KetQuaXinView.Loai.Cho) return;
        _poll.Stop();
        VeKetQua(kq, r.KetQua);
    }

    internal void VeKetQua(KetQuaXinView.Loai kq, RequestStatus? s)
    {
        _poll.Stop();
        _id = null;
        _daGui = false;
        switch (kq)
        {
            case KetQuaXinView.Loai.DaThem: VeDaThem(s, false); break;
            case KetQuaXinView.Loai.MoTam: VeDaThem(s, true); break;
            case KetQuaXinView.Loai.ChuaThem: VeChuaThem(s); break;
            default:
                VeXin();
                if (_msg != null) { _msg.ForeColor = UI.Warn; _msg.Text = XinMoView.ThongBao(TrayView.KetQuaXin.HetHan, _ten); }
                break;
        }
    }

    /// <summary>them-359v1pre (mở tạm: «Mẹ Lan cho mở 30 phút!»).</summary>
    /// <param name="moTam">Kết quả đã tính (<see cref="KetQuaXinView.Loai.MoTam"/>) — không đọc lại s.KetQua.</param>
    private void VeDaThem(RequestStatus? s, bool moTam)
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        var khong = s?.Nhom == "khong_tinh_phut";
        var biet = s?.Nhom is "khong_tinh_phut" or "tinh_phut";   // máy chủ không gửi nhóm ⇒ không đoán, không hiện chip nhóm
        var cot = new List<Control>
        {
            KhoiXin.Chip(moTam ? XinThemView.MoTam(s?.TenNguoiDuyet, s?.MoTam?.Phut ?? 0) : XinThemView.DaThem(s?.TenNguoiDuyet), Clay.NgocSoft, Clay.NgocInk, "tick"),
            KhoiXin.Chu(_ten, 22f, true, UI.GreenDark),
        };
        if (moTam) cot.Add(KhoiXin.Chu(KetQuaXinView.MoTamPhu(_ten, s?.MoTam?.Den), 10f, true, Clay.Chu2));
        else if (biet) cot.Add(KhoiXin.Chip(XinThemView.NhomDaThem(khong, _phutCon), khong ? Clay.NgocSoft : Clay.DiemSoft, khong ? Clay.NgocInk : Clay.DiemInk, khong ? "sach" : "sao", kim: !khong));
        Flow.Controls.Add(KhoiXin.DauRob("qua", W, null, cot.ToArray()));
        if (!string.IsNullOrWhiteSpace(s?.LoiNhan)) Flow.Controls.Add(KhoiXin.BongLoi(XinVayView.TenBaMe(s?.TenNguoiDuyet), s!.LoiNhan!, W));
        var mo = KhoiCon.Nut(XinThemView.Mo(_ten), true, W, "dongho");
        mo.Click += (_, _) => { MoMuc(); Close(); };
        Flow.Controls.Add(mo);
        Xong();
    }

    /// <summary>them-vkdikuo0.</summary>
    private void VeChuaThem(RequestStatus? s)
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        Flow.Controls.Add(KhoiCon.Dau("tin", KhoiCon.Mau.Trang, XinThemView.ChuaThem(_ten), XinThemView.ConPhut(_phutCon), W));
        Flow.Controls.Add(KhoiXin.BongLoi(XinVayView.TenBaMe(s?.TenNguoiDuyet), XinThemView.LoiChuaThem(_ten, s?.LoiNhan), W, ngoac: false));
        // Bàn: «Xin lại» → Tin nhắn (nhắn Ba Mẹ), «Về trang chính» → Hôm nay
        var lai = KhoiCon.Nut(XinThemView.XinLai, true, W, "tin");
        lai.Click += (_, _) => { Sau = SauNhan; Close(); };
        Flow.Controls.Add(lai);
        var ve = KhoiCon.Nut(XinThemView.VeTrangChinh, false, W);
        ve.Click += (_, _) => { Sau = SauHomNay; Close(); };
        Flow.Controls.Add(ve);
        Xong();
    }

    private void MoMuc() => BlockedForm.MoMuc(_muc, _web);
}
