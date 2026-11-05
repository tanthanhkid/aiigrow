using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Xin Ba Mẹ mở ngoại lệ» (thiết kế chốt 05/11, con-het-gio 12–19; L3): giờ ngủ / Ba Mẹ khoá / hết giờ không thêm giờ được —
/// Con chọn MỘT app học hoặc «Cả máy», số phút (−/+), lý do (chip hoặc tự viết) ⇒ gửi (POST yeu-cau loai ngoai_le) ⇒ «Đã gửi Ba Mẹ · Chờ Ba Mẹ xem…»
/// ⇒ «Ba Mẹ cho mở N phút» / «Ba Mẹ chưa cho lúc này». Không trừ giờ chơi, không trừ sao. Mất mạng ⇒ lời xin lưu lại, có mạng tự gửi.
/// </summary>
internal sealed class NgoaiLeForm : Form
{
    private readonly List<(string Ma, string Ten)> _luaChon;
    private readonly FlowLayoutPanel _flow;
    private readonly Label _msg;
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private readonly int _w = UI.Px(382);
    private string _ma;
    private int _phut = NgoaiLeView.PhutMacDinh;
    private string? _lyDoChon = NgoaiLeView.LyDoNhanh[0];
    private TextBox? _tuViet;
    private string? _id;
    private string _lyDoGui = "";
    private bool _busy, _dong;

    /// <summary>Con bấm «Nhắn lại Ba Mẹ» — khay mở mục Tin nhắn.</summary>
    public event Action? NhanBaMe;

    /// <param name="appHoc">App học Ba Mẹ cho phép (TrayState.AppDuocPhep) — tối đa 2 cái + «Cả máy».</param>
    public NgoaiLeForm(IEnumerable<string>? appHoc)
    {
        AiiGrow.ClayUi.Clay.KhongMnemonic(this);
        _luaChon = NgoaiLeView.LuaChon(appHoc);
        _ma = _luaChon[0].Ma;
        Text = "AiiGrow · Xin mở ngoại lệ";
        Icon = UI.AppIcon();
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true; ShowInTaskbar = false;
        BackColor = UI.Paper;
        AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;
        _flow = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(22), UI.Px(14), UI.Px(22), UI.Px(14)), Margin = Padding.Empty, BackColor = UI.Paper,
        };
        _msg = UI.Text("", 10f, false, UI.Error, _w);
        Controls.Add(_flow);
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => { _dong = true; _poll.Stop(); _poll.Dispose(); };
        VeHoi();
    }

    private string TenChon => _luaChon.First(x => x.Ma == _ma).Ten;

    private void XoaHet()
    {
        _flow.SuspendLayout();
        foreach (Control c in _flow.Controls.Cast<Control>().ToList()) { _flow.Controls.Remove(c); if (c != _msg) c.Dispose(); }
        _msg.Text = "";
        _tuViet = null;
    }

    private void Xong() { _flow.Controls.Add(_msg); _flow.ResumeLayout(true); }

    private ClayRadio Chip(string chu, bool chon, int rong, Action bam, Image? hinh = null)
    {
        var r = new ClayRadio
        {
            Text = chu, TextAlign = ContentAlignment.MiddleCenter, AutoCheck = false, Checked = chon,
            Width = rong, Height = UI.Px(44) + VeNut.LeBong.Vertical, Font = UI.F(10.5f, FontStyle.Bold),
            BackColor = chon ? UI.Green : UI.Card, ForeColor = chon ? Color.White : UI.Ink, Margin = new Padding(0, 0, UI.Px(8), 0), Image = hinh,
        };
        r.Click += (_, _) => bam();
        return r;
    }

    // ------------------------------------------------------------------ 1. hỏi

    private void VeHoi()
    {
        var giuChu = _tuViet?.Text;   // dựng lại khi bấm chip / −+ : giữ chữ Con đang tự viết
        XoaHet();
        _flow.Controls.Add(KhoiCon.Dau("mo_khoa", KhoiCon.Mau.Ngoc, NgoaiLeView.Tieu, NgoaiLeView.Phu, _w));
        // Con cần mở gì? — chip app (≤2) + «Cả máy»
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(8));
        var rongChip = (_w - UI.Px(8) * (_luaChon.Count - 1)) / _luaChon.Count;
        foreach (var (ma, ten) in _luaChon)
            hang.Controls.Add(Chip(ten, ma == _ma, rongChip, () => { _ma = ma; VeHoi(); }, ma == NgoaiLeView.CaMay ? null : Anh3D.Icon("sach")));
        hang.Controls[^1].Margin = Padding.Empty;
        _flow.Controls.Add(hang);

        _flow.Controls.Add(Nhan(NgoaiLeView.MoBaoLau));
        var buoc = KhoiCon.Hang();
        buoc.Margin = new Padding(0, 0, 0, UI.Px(8));
        var tru = Chip("−", false, UI.Px(56), () => { _phut = NgoaiLeView.Giam(_phut); VeHoi(); });
        var so = new ClayCard { Lom = true, BoGoc = UI.Px(20), Width = _w - UI.Px(56) * 2 - UI.Px(16), Height = UI.Px(44) + VeThe.LeBong.Vertical, Margin = new Padding(0, 0, UI.Px(8), 0) };
        var soChu = new Label { Text = NgoaiLeView.Phut(_phut), Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, Font = UI.F(13f, FontStyle.Bold), ForeColor = UI.Ink, BackColor = Color.Transparent };
        so.Controls.Add(soChu);
        var cong = Chip("+", false, UI.Px(56), () => { _phut = NgoaiLeView.Tang(_phut); VeHoi(); });
        cong.Margin = Padding.Empty;
        buoc.Controls.Add(tru); buoc.Controls.Add(so); buoc.Controls.Add(cong);
        _flow.Controls.Add(buoc);

        _flow.Controls.Add(Nhan(NgoaiLeView.ViSao));
        var goi = KhoiCon.Hang();
        goi.Margin = new Padding(0, 0, 0, UI.Px(8));
        var tuViet = _lyDoChon == null;
        foreach (var l in NgoaiLeView.LyDoNhanh)
            goi.Controls.Add(Chip(l, !tuViet && _lyDoChon == l, l.Length > 12 ? UI.Px(150) : UI.Px(108), () => { _lyDoChon = l; VeHoi(); }));
        var tv = Chip(NgoaiLeView.TuViet, tuViet, _w - UI.Px(150) - UI.Px(108) - UI.Px(16), () => { _lyDoChon = null; VeHoi(); });
        tv.Margin = Padding.Empty;
        goi.Controls.Add(tv);
        _flow.Controls.Add(goi);
        if (tuViet)
        {
            _tuViet = new TextBox { Font = UI.F(11f), MaxLength = 100, ForeColor = UI.Ink, PlaceholderText = "Con cần mở để làm gì?", Text = giuChu ?? "" };
            _flow.Controls.Add(ONhapClay.Boc(_tuViet, _w));
        }
        var gui = KhoiCon.Nut(NgoaiLeView.NutGui(_phut), true, _w, "gui");
        gui.Margin = new Padding(0, UI.Px(6), 0, UI.Px(4));
        gui.Click += async (_, _) => await GuiAsync();
        _flow.Controls.Add(gui);
        AcceptButton = gui;
        var kt = UI.Text(NgoaiLeView.KhongTru, 9.75f, false, UI.Muted, _w);
        kt.AutoSize = false; kt.Width = _w; kt.Height = UI.Px(22); kt.TextAlign = ContentAlignment.MiddleCenter;
        _flow.Controls.Add(kt);
        Xong();
        _tuViet?.Focus();
    }

    private Label Nhan(string chu)
    {
        var l = UI.Text(chu, 10f, true, Clay.Chu2, _w);
        l.Margin = new Padding(0, UI.Px(4), 0, UI.Px(4));
        return l;
    }

    // ------------------------------------------------------------------ 2. gửi + chờ

    private async Task GuiAsync()
    {
        if (_busy) return;
        _busy = true;
        _lyDoGui = NgoaiLeView.LyDo(_lyDoChon, _tuViet?.Text);
        _msg.ForeColor = UI.Green; _msg.Text = "Đang gửi…";
        var r = await PipeClient.CallAsync(new PipeRequest
        {
            Cmd = PipeCmd.Request, Kind = LoaiXin.NgoaiLe, Minutes = _phut, AppId = _ma, AppName = TenChon, Note = _lyDoGui,
        });
        _busy = false;
        if (_dong || IsDisposed) return;
        if (!r.Ok) { _msg.ForeColor = UI.Error; _msg.Text = r.Error ?? "Chưa gửi được. Con thử lại nhé."; return; }
        if (r.Status == "cho_mang") { VeDaLuu(int.TryParse(r.Message, out var n) ? n : 1); return; }
        var kq = TrayView.XinGio(r.Status);
        if (kq == TrayView.KetQuaXin.Duoc) { VeDuoc(); return; }
        if (kq == TrayView.KetQuaXin.TuChoi) { VeChuaCho(); return; }
        if (kq == TrayView.KetQuaXin.HetHan) { HetHan(); return; }
        _id = r.Id;
        VeCho();
        if (!string.IsNullOrEmpty(_id)) _poll.Start();
    }

    private async Task PollAsync()
    {
        if (_id == null || _busy || _dong) return;
        _busy = true;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _id });
        _busy = false;
        if (!r.Ok || _dong || IsDisposed) return;
        var kq = TrayView.XinGio(r.Status);
        if (kq == TrayView.KetQuaXin.Cho) return;
        _poll.Stop();
        if (kq == TrayView.KetQuaXin.HetHan) HetHan();
        else if (kq == TrayView.KetQuaXin.Duoc) VeDuoc(); else VeChuaCho();
    }

    /// <summary>Hết hạn / bị huỷ khi Ba Mẹ chưa trả lời ⇒ không nói «chưa cho»: về màn hỏi để Con gửi lại.</summary>
    private void HetHan()
    {
        _id = null;
        VeHoi();
        _msg.ForeColor = UI.Warn;
        _msg.Text = XinMoView.ThongBao(TrayView.KetQuaXin.HetHan, "");
    }

    private void VeCho()
    {
        XoaHet();
        _flow.Controls.Add(KhoiCon.Dau("dong_ho_cat", KhoiCon.Mau.Ngoc, NgoaiLeView.DaGui, NgoaiLeView.ChoXem, _w));
        _flow.Controls.Add(KhoiCon.RobNoi("cho", NgoaiLeView.DongCho(TenChon, _phut), "«" + _lyDoGui + "»", _w));
        var ve = KhoiCon.Nut(NgoaiLeView.VeManKhoaCho, false, _w, "tro_lai");
        ve.Click += (_, _) => Close();   // lời xin vẫn chờ ở máy chủ; Ba Mẹ cho thì lần đồng bộ sau máy tự mở
        _flow.Controls.Add(ve);
        Xong();
    }

    private void VeDuoc()
    {
        XoaHet();
        var den = DateTimeOffset.Now.AddMinutes(_phut);
        _flow.Controls.Add(KhoiCon.Dau("tick", KhoiCon.Mau.Ngoc, NgoaiLeView.DuocTieu(_phut), null, _w));
        _flow.Controls.Add(KhoiCon.RobNoi("xong", NgoaiLeView.DuocChiMo(_ma, TenChon, den), NgoaiLeView.TuKhoaLai, _w));
        var mo = KhoiCon.Nut(NgoaiLeView.NutMo(_ma, TenChon), true, _w, _ma == NgoaiLeView.CaMay ? "mo_khoa" : "sach");
        mo.Click += (_, _) => Close();
        _flow.Controls.Add(mo);
        var nhac = UI.Text(NgoaiLeView.NhacLuuBai, 9.75f, false, UI.Muted, _w);
        _flow.Controls.Add(nhac);
        Xong();
    }

    private void VeChuaCho()
    {
        XoaHet();
        _flow.Controls.Add(KhoiCon.Dau("khien", KhoiCon.Mau.Cam, NgoaiLeView.ChuaChoTieu, NgoaiLeView.ChuaChoPhu, _w));
        _flow.Controls.Add(KhoiCon.RobNoi("nghi", "Ba Mẹ đã xem lời xin của con.", "Con nhắn Ba Mẹ nếu cần nhé.", _w));
        var nhan = KhoiCon.Nut(NgoaiLeView.NhanLai, true, _w, "tin");
        nhan.Click += (_, _) => { NhanBaMe?.Invoke(); Close(); };
        _flow.Controls.Add(nhan);
        var ve = KhoiCon.Nut(ManKhoaView.VeManKhoa, false, _w, "tro_lai");
        ve.Click += (_, _) => Close();
        _flow.Controls.Add(ve);
        Xong();
    }

    private void VeDaLuu(int n)
    {
        XoaHet();
        HopDaLuu.Ve(_flow, _w, ManChanView.DaLuuTieu, NgoaiLeView.DongCho(TenChon, _phut), n, Close, ManKhoaView.VeManKhoa);
        Xong();
    }
}

/// <summary>Nội dung «Đã lưu lời xin» lúc mất mạng (con-mat-mang 04, 14, 15) — dùng chung cho màn khoá, ngoại lệ.</summary>
internal static class HopDaLuu
{
    public static void Ve(FlowLayoutPanel flow, int w, string tieu, string dong, int choMang, Action ve, string chuNut)
    {
        flow.Controls.Add(KhoiCon.Dau("tick", KhoiCon.Mau.Ngoc, tieu, ManKhoaView.DaLuuThemGioPhu, w));
        flow.Controls.Add(KhoiCon.Chips(w, new ChipClay(ManChanView.ChoCoMang(choMang), Clay.CanhSoft, Clay.Canh, chamCho: true)));
        flow.Controls.Add(KhoiCon.DongIcon("gui", dong + $" · vừa xong · {DateTime.Now:HH:mm}", w));
        flow.Controls.Add(UI.Text(ManChanView.KhongCanGuiLai, 9.75f, false, UI.Muted, w));
        var b = KhoiCon.Nut(chuNut, false, w, "khoa");
        b.Click += (_, _) => ve();
        flow.Controls.Add(b);
    }

    /// <summary>Hộp riêng (màn khoá mất mạng › «Xin Ba Mẹ thêm giờ»).</summary>
    public static Form Hop(string tieu, string dong, int choMang)
    {
        var f = new Form
        {
            Text = "AiiGrow", Icon = UI.AppIcon(), FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false,
            StartPosition = FormStartPosition.CenterScreen, TopMost = true, ShowInTaskbar = false, BackColor = UI.Paper,
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink,
        };
        AiiGrow.ClayUi.Clay.KhongMnemonic(f);
        var flow = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(24), UI.Px(18), UI.Px(24), UI.Px(14)), BackColor = UI.Paper,
        };
        Ve(flow, UI.Px(340), tieu, dong, choMang, f.Close, ManKhoaView.VeManKhoa);
        f.Controls.Add(flow);
        return f;
    }
}
