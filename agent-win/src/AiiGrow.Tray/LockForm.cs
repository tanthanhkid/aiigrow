using System.Drawing.Drawing2D;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Màn khoá toàn màn hình theo thiết kế chốt 05/11 (docs/thiet-ke-chot/con-het-gio 06–10, con-mat-mang 02–04), khung 1920×1080:
/// nền ngọc sâu, đồng hồ góc phải, MỘT thẻ đất sét ở giữa (Rob 170 · tiêu đề 44px · câu phụ · [đếm ngược] · [chip sao] · 2 nút lớn · liên kết chữ),
/// chân «AiiGrow · &lt;tên bé&gt; · máy do Ba Mẹ quản lý». 06/11: chưa ai đăng nhập ⇒ «Ai đang dùng máy?» (LockForm.ChonTen.cs); «Ba Mẹ dùng máy» ⇒ Ba Mẹ nhập mã.
///   • Sắp hết giờ (đếm ngược) / Hết giờ chơi: «Đổi 10 sao lấy 10 phút» · «Xin Ba Mẹ thêm giờ» (+ ngoại lệ, nhắn, Ba Mẹ dùng máy).
///   • Giờ ngủ / Ba Mẹ khoá: KHÔNG thêm giờ — chỉ «Xin Ba Mẹ mở ngoại lệ» (1 app hoặc cả máy, có hạn phút) · nhắn · Ba Mẹ dùng máy.
///   • Mất mạng: Rob ngủ bên trái «Mất mạng, luật vẫn vậy nhé!», thẻ trái-căn: lời xin lưu lại (có mạng tự gửi) + mã 6 số Ba Mẹ đọc + Win+L.
/// Nút chỉ báo ra ngoài (sự kiện) — khay mở hộp tương ứng; chữ / nút lấy từ lớp thuần <see cref="ManKhoaView"/>.
/// </summary>
internal sealed partial class LockForm : Form, IVeNenRieng   // nền gradient: nền đã nhớ của con phụ thuộc vị trí
{
    private readonly Label _gio = new() { AutoSize = true, ForeColor = Color.FromArgb(0xe6, 0xf2, 0xee), BackColor = Color.Transparent, Font = UI.F(21f, FontStyle.Bold) };
    private readonly Label _chan = new() { AutoSize = true, ForeColor = Color.FromArgb(0xc6, 0xdc, 0xd6), BackColor = Color.Transparent, Font = UI.F(12f) };
    private readonly Label _count = new() { AutoSize = true, ForeColor = UI.Green, BackColor = Color.Transparent, Font = UI.F(78f, FontStyle.Bold) };   // 104px — đọc được từ xa
    private readonly Panel _center = new() { Dock = DockStyle.Fill, BackColor = Color.Transparent, AutoScroll = true };
    private readonly System.Windows.Forms.Timer _dongHo = new() { Interval = 1000 };
    private Control? _khoi;
    private string _khoa = "";
    private bool _allowClose;
    private bool _locking;
    private OfflineCodePanel? _code;
    private DateTimeOffset? _matMangTu;
    /// <summary>Màn thấp (1366×768 / 1024×768 ở 150%): thẻ thiết kế cao hơn chỗ trống ⇒ dựng bản gọn (Rob nhỏ, chữ / nút nhỏ hơn) thay vì cuộn.</summary>
    private bool _gon;
    private ManKhoa? _m;

    /// <summary>Con bấm một nút trên màn khoá (mã <see cref="ManKhoaView"/>: doi_sao, xin_them_gio, xin_ngoai_le, nhan_ba_me). «Ba Mẹ dùng máy» màn tự xử lý (Win+L).</summary>
    public event Action<string>? Bam;

    /// <param name="canExchange">giữ chữ ký cũ cho chỗ gọi; nút đổi sao theo <see cref="TrayState.CanExchangePoints"/> lúc <see cref="Apply"/>.</param>
    public LockForm(bool canExchange = false)
    {
        AiiGrow.ClayUi.Clay.KhongMnemonic(this);
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;
        TopMost = true;
        ShowInTaskbar = false;
        BackColor = UI.GreenDark;
        DoubleBuffered = true;
        Text = "AiiGrow";

        _center.Resize += (_, _) => GiuaKhoi();
        Controls.Add(_center);
        _gio.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        Controls.Add(_gio);
        _gio.BringToFront();
        Controls.Add(_chan);
        _chan.BringToFront();
        Resize += (_, _) => DatGocChu();
        _dongHo.Tick += (_, _) => { _gio.Text = DateTime.Now.ToString("HH:mm"); DatGocChu(); NhipChonTen(); };
        _dongHo.Start();
        _gio.Text = DateTime.Now.ToString("HH:mm");

        // Giữ cửa sổ ở trên cùng, nhưng con vẫn mở được hộp xin giờ / ngoại lệ / tin nhắn.
        var keep = new System.Windows.Forms.Timer { Interval = 2000 };
        keep.Tick += (_, _) => { if (!_allowClose && OwnedForms.Length == 0 && Form.ActiveForm == null) { TopMost = true; Activate(); } };
        keep.Start();
        FormClosing += (_, e) => { if (!_allowClose) e.Cancel = true; };
        KhoiTaoChonTen();
        FormClosed += (_, _) => { keep.Dispose(); _dongHo.Dispose(); };
    }

    private void DatGocChu()
    {
        _gio.Location = new Point(ClientSize.Width - _gio.Width - UI.Px(40), UI.Px(28));
        _chan.Location = new Point(UI.Px(24), ClientSize.Height - _chan.Height - UI.Px(20));
        DatGocChonTen();
    }

    private void GiuaKhoi()
    {
        if (_khoi == null) return;
        _khoi.Location = new Point(Math.Max(0, (_center.Width - _khoi.Width) / 2), Math.Max(UI.Px(60), (_center.Height - _khoi.Height) / 2 - UI.Px(10)));
    }

    /// <summary>Nền tối ngọc sâu: gradient dọc + quầng sáng mềm sau thẻ (thiết kế: radial rgba(95,201,178,.275) ở 960,459).</summary>
    protected override void OnPaintBackground(PaintEventArgs e) => VeNenRieng(e.Graphics, true);

    public void VeNenRieng(Graphics g, bool ngoaiCung)
    {
        var r = ClientRectangle;
        if (r.Width <= 0 || r.Height <= 0) return;
        using (var lg = new LinearGradientBrush(r, Color.FromArgb(0x13, 0x4a, 0x41), Color.FromArgb(0x07, 0x24, 0x20), 90f))
            g.FillRectangle(lg, r);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        var q = new RectangleF(r.Width * 0.2f, r.Height * 0.05f, r.Width * 0.6f, r.Height * 0.75f);
        using var qp = new GraphicsPath();
        qp.AddEllipse(q);
        using var pg = new PathGradientBrush(qp) { CenterColor = Color.FromArgb(70, 0x5f, 0xc9, 0xb2), SurroundColors = new[] { Color.FromArgb(0, 0x13, 0x4a, 0x41) } };
        g.FillEllipse(pg, q);
    }

    public void Apply(TrayState s)
    {
        bool dem = s.LockGraceLeftSec is > 0;
        _matMangTu = s.OfflineSince;
        // 06/11 (L13): chưa ai đăng nhập ⇒ «Ai đang dùng máy?» (chọn tên + PIN / Ba Mẹ nhập mã) — LockForm.ChonTen.cs
        if (ApChonTen(s)) return;
        var m = ManKhoaView.For(s.LockReason, s.LockGraceLeftSec, s.ChildName, s.Sao, s.QuyPhut, s.MoLaiLuc, s.CanExchangePoints,
            s.Offline && MoTamOffline.MoDuocKhoa(s.LockReason), doiBe: s.NguoiDung == LoaiNguoiDung.Con && !s.MayRieng);
        var khoa = string.Join("|", m.Tieu, m.Phu, m.Phu2, m.DemNguoc, m.SaoDong, m.MatMang, string.Join(",", m.Nut.Select(n => n.Ma + n.Chu)), s.ChildName);
        if (khoa != _khoa && !DangNhapMaTuManKhoa)
        {
            _khoa = khoa;
            _chan.Text = ManKhoaView.ChanTrang(s.ChildName);
            Dung(m);
        }
        if (s.LockGraceLeftSec.HasValue) _count.Text = TrayView.FormatClock(s.LockGraceLeftSec.Value);
        if (s.LockGraceLeftSec == 0 && !_locking)
        {
            _locking = true;
            UI.LockWorkStation();
        }
        else if (dem) _locking = false;
    }

    // ------------------------------------------------------------------ dựng

    private void Dung(ManKhoa m)
    {
        _center.SuspendLayout();
        if (_khoi != null) { _center.Controls.Remove(_khoi); if (_count.Parent != null) _count.Parent.Controls.Remove(_count); _khoi.Dispose(); }
        var giuMa = _code?.MaDangGo;   // Ba Mẹ đang đọc mã cho Con gõ mà thẻ dựng lại ⇒ không mất số đã gõ
        _code = null;
        _m = m;
        _gon = false;
        _khoi = m.MatMang ? DungMatMang(m) : DungThuong(m);
        _center.Controls.Add(_khoi);
        _center.ResumeLayout(true);
        if (!m.MatMang && _center.ClientSize.Height > 0 && _khoi.Height > _center.ClientSize.Height - UI.Px(16))
        {
            // không vừa ⇒ dựng lại bản gọn (cuộn trên màn khoá dễ lộ nền đen + giấu nút dưới cùng)
            _center.SuspendLayout();
            _center.Controls.Remove(_khoi);
            if (_count.Parent != null) _count.Parent.Controls.Remove(_count);
            _khoi.Dispose();
            _gon = true;
            _khoi = DungThuong(m);
            _center.Controls.Add(_khoi);
            _center.ResumeLayout(true);
        }
        if (_code != null && !string.IsNullOrEmpty(giuMa)) _code.MaDangGo = giuMa;
        GiuaKhoi();
        DatGocChu();
    }

    private ClayFlow TheMoi(int rong, bool giua)
    {
        var the = new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, BoGoc = UI.Px(36), WrapContents = false, FlowDirection = FlowDirection.TopDown,
            Padding = VeThe.Pad(UI.Px(giua ? 56 : 52), UI.Px(36), UI.Px(giua ? 56 : 52), UI.Px(32)),
        };
        var w = rong - the.Padding.Horizontal;
        the.MinimumSize = new Size(rong, 0);
        the.MaximumSize = new Size(rong, 0);
        the.Tag = w;
        return the;
    }

    private static Label Chu(string text, float pt, bool dam, Color mau, int rong, bool giua)
    {
        var l = UI.Text(text, pt, dam, mau, rong);
        if (giua) { l.AutoSize = false; l.Width = rong; l.TextAlign = ContentAlignment.TopCenter; l.Height = TextRenderer.MeasureText(text, l.Font, new Size(rong, 0), TextFormatFlags.WordBreak).Height + UI.Px(4); }
        return l;
    }

    /// <summary>Thẻ giữa 600 px (con-het-gio 06–10).</summary>
    private Control DungThuong(ManKhoa m)
    {
        var the = TheMoi(UI.Px(600) + VeThe.LeBong.Horizontal, true);
        if (_gon) the.Padding = VeThe.Pad(UI.Px(40), UI.Px(18), UI.Px(40), UI.Px(14));
        int w = (int)the.Tag!;
        if (_gon) w = UI.Px(600) + VeThe.LeBong.Horizontal - the.Padding.Horizontal;
        var rob = KhoiThietKe.Rob(m.Rob, _gon ? 80 : 170);
        rob.Margin = new Padding((w - rob.Width) / 2, 0, 0, 0);
        the.Controls.Add(rob);
        var td = Chu(m.Tieu, _gon ? 22f : 33f, true, UI.Ink, w, true); td.Margin = new Padding(0, UI.Px(_gon ? 4 : 14), 0, 0);
        the.Controls.Add(td);
        var ph = Chu(m.Phu, _gon ? 13f : 17f, false, UI.Muted, w, true); ph.Margin = new Padding(0, UI.Px(6), 0, 0);
        the.Controls.Add(ph);
        if (m.Phu2 != null) { var p2 = Chu(m.Phu2, _gon ? 13f : 17f, false, UI.Muted, w, true); p2.Margin = new Padding(0, UI.Px(2), 0, 0); the.Controls.Add(p2); }
        if (m.DemNguoc)
        {
            _count.Font = UI.F(_gon ? 44f : 78f, FontStyle.Bold);
            _count.AutoSize = false; _count.Width = w; _count.Height = UI.Px(_gon ? 64 : 112); _count.TextAlign = ContentAlignment.MiddleCenter;
            _count.Margin = new Padding(0, UI.Px(8), 0, 0);
            the.Controls.Add(_count);
        }
        if (m.SaoDong != null)
        {
            var sao = new ChipClay(m.SaoDong, Clay.DiemSoft, Clay.DiemInk, Anh3D.Icon("sao")) { Font = UI.F(13.5f, FontStyle.Bold) };
            sao.Height = UI.Px(40);
            sao.Width = TextRenderer.MeasureText(m.SaoDong, sao.Font).Width + UI.Px(56);
            sao.Margin = new Padding((w - sao.Width) / 2, UI.Px(_gon ? 6 : 14), 0, 0);
            the.Controls.Add(sao);
        }
        // Hai nút lớn (cao 64, chữ 22px) rồi hàng liên kết chữ.
        var lon = m.Nut.Where(n => n.Ma is ManKhoaView.DoiSao or ManKhoaView.XinThemGio).ToList();
        if (lon.Count == 0 && m.Nut.FirstOrDefault(n => n.Ma == ManKhoaView.XinNgoaiLe) is { } nl) lon.Add(nl);   // giờ ngủ / Ba Mẹ khoá: ngoại lệ là nút chính
        for (int i = 0; i < lon.Count; i++)
        {
            var n = lon[i];
            var b = KhoiCon.Nut(n.Chu, i == 0, w, n.Icon, _gon ? 48 : 64, _gon ? 13f : 16.5f);
            b.Margin = new Padding(0, UI.Px(_gon ? (i == 0 ? 10 : 6) : (i == 0 ? 28 : 16)), 0, 0);
            b.Click += (_, _) => Bam?.Invoke(n.Ma);
            the.Controls.Add(b);
        }
        var con = m.Nut.Where(n => !lon.Contains(n)).ToList();
        // hàng 2 (chữ xám): «Đổi bé · Ba Mẹ mở máy» (con-het-gio 07) / «Ba Mẹ dùng máy»
        static bool HangHai(NutKhoa n) => n.Ma is ManKhoaView.BaMeDungMay or ManKhoaView.DoiBe;
        var xanh = con.Where(n => !HangHai(n)).ToList();
        if (xanh.Count > 0) the.Controls.Add(HangLienKet(xanh, w, UI.Px(14)));
        if (con.Any(HangHai)) the.Controls.Add(HangLienKet(con.Where(HangHai).ToList(), w, UI.Px(2)));
        return the;
    }

    private FlowLayoutPanel HangLienKet(List<NutKhoa> ds, int w, int tren)
    {
        var hang = KhoiCon.Hang();
        foreach (var n in ds)
        {
            var mau = n.Ma is ManKhoaView.BaMeDungMay or ManKhoaView.DoiBe ? Clay.Chu2 : Color.FromArgb(0x19, 0x65, 0x59);
            var lk = KhoiCon.LienKet(n.Chu, n.Icon, () => BamNut(n.Ma), _gon ? 11.5f : 15f, mau);
            lk.Margin = new Padding(UI.Px(20), 0, UI.Px(20), 0);
            hang.Controls.Add(lk);
        }
        var rong = hang.PreferredSize.Width;
        hang.Margin = new Padding(Math.Max(0, (w - rong) / 2), tren, 0, 0);
        return hang;
    }

    private void BamNut(string ma)
    {
        // 06/11 (L13): «Ba Mẹ dùng máy» ⇒ Ba Mẹ nhập mã mở máy ngay trên màn khoá (con-ngay-thuong 06) — không còn Win+L
        if (ma == ManKhoaView.BaMeDungMay) { MoBaMeNhapMa(tuManKhoa: true); return; }
        Bam?.Invoke(ma);
    }

    /// <summary>Mất mạng (con-mat-mang 02): Rob ngủ + bong bóng bên trái, thẻ 640 trái-căn bên phải.</summary>
    private Control DungMatMang(ManKhoa m)
    {
        var hang = KhoiCon.Hang();
        var trai = KhoiCon.Cot();
        var bong = new ClayFlow { AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, BoGoc = UI.Px(24), Padding = VeThe.Pad(UI.Px(20), UI.Px(12), UI.Px(20), UI.Px(12)) };
        var cb = UI.Text(ManKhoaView.MatMangDau, 15f, true, UI.Ink, UI.Px(360)); cb.Margin = Padding.Empty;
        bong.Controls.Add(cb);
        bong.Margin = new Padding(UI.Px(10), UI.Px(150), 0, 0);
        trai.Controls.Add(bong);
        var rob = KhoiThietKe.Rob("ngu", 420);
        trai.Controls.Add(rob);
        trai.Margin = new Padding(0, 0, UI.Px(30), 0);
        hang.Controls.Add(trai);

        var the = TheMoi(UI.Px(640) + VeThe.LeBong.Horizontal, false);
        int w = (int)the.Tag!;
        var dau = KhoiCon.Hang();
        var dia = new ClayIcon { Size = new Size(UI.Px(96), UI.Px(96)), MauVien = Clay.The, Hinh = Anh3D.Icon("khoa"), Margin = Padding.Empty };
        dau.Controls.Add(dia);
        var chip = new ChipClay(ManKhoaView.MatMangChip((_matMangTu ?? DateTimeOffset.Now).ToLocalTime()), Clay.CanhSoft, Clay.Canh) { Font = UI.F(12f, FontStyle.Bold) };
        chip.Height = UI.Px(36);
        chip.Width = TextRenderer.MeasureText(chip.Text, chip.Font).Width + UI.Px(34);
        chip.Margin = new Padding(Math.Max(0, w - dia.Width - chip.Width), UI.Px(30), 0, 0);
        dau.Controls.Add(chip);
        the.Controls.Add(dau);
        var td = UI.Text(m.Tieu, 31.5f, true, UI.Ink, w); td.Margin = new Padding(0, UI.Px(16), 0, 0);
        the.Controls.Add(td);
        var ph = UI.Text(m.Phu, 15.75f, false, UI.Muted, w); ph.Margin = new Padding(0, UI.Px(4), 0, UI.Px(12));
        the.Controls.Add(ph);
        foreach (var n in m.Nut)
        {
            var b = KhoiCon.Nut(n.Chu, true, w, n.Icon, 56, 15f);
            b.Click += (_, _) => Bam?.Invoke(n.Ma);
            the.Controls.Add(b);
        }
        if (m.Phu2 != null) the.Controls.Add(UI.Text(m.Phu2, 12.75f, false, UI.Muted, w));
        the.Controls.Add(new Panel { Height = 1, Width = w, BackColor = Color.FromArgb(0xdc, 0xdb, 0xd6), Margin = new Padding(0, UI.Px(10), 0, UI.Px(16)) });
        _code = new OfflineCodePanel(w, UI.Ink, UI.Muted, ManKhoaView.BaMeOCanh, ManKhoaView.DocMa, ManKhoaView.MoBangMa, 15f);
        the.Controls.Add(_code);
        var winL = UI.Text(ManKhoaView.WinL, 12f, false, UI.Muted, w); winL.Margin = new Padding(0, UI.Px(12), 0, 0);
        the.Controls.Add(winL);
        hang.Controls.Add(the);
        return hang;
    }

    public void CloseForReal()
    {
        _allowClose = true;
        Close();
    }
}
