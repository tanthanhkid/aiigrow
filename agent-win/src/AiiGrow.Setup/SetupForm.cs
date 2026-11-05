using System.Drawing.Drawing2D;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Setup;

/// <summary>
/// Bộ cài theo thiết kế chốt 05/11 (docs/thiet-ke-chot/con-cai-win, 12 màn): Ba Mẹ chạy trên máy của con, mỗi màn một việc, câu ngắn nói với Ba Mẹ,
/// icon 3D + Rob thay chữ, nút chính nói rõ kết quả. Khung 723×672 (theo DPI). Luồng: 1 Chào → 2 Đồng ý → 3 Tài khoản (có sẵn / tạo mới /
/// «chỉ 1 tài khoản quản trị») → 4 Ghép máy (mã 6 số hạn 10 phút — dự phòng; mở từ link Ba Mẹ gửi thì tự ghép) → 5 Cài (lỗi: mã sai / mã hết hạn /
/// mất mạng) → Xong. Toạ độ trong mã = toạ độ px của HTML thiết kế (đã trừ thanh tiêu đề 30px), nhân DPI qua Clay.Si.
/// </summary>
internal sealed class SetupForm : Form
{
    // Token màu «Clay gương» (CapNhatSetup.cs dùng chung — giữ tên).
    internal static readonly Color Chinh = Clay.Ngoc;
    internal static readonly Color ChinhSoft = Clay.NgocSoft;
    internal static readonly Color Chu = Clay.Chu;
    internal static readonly Color Chu2 = Clay.Chu2;
    internal static readonly Color Loi = Clay.Loi;
    internal static readonly Color Nen = Clay.Nen;
    private const string MayChuMacDinh = "https://aiigrow.aiilab.vn";
    private const int TongBuoc = 5;
    private static int S(int v) => Clay.Si(v);

    [System.Runtime.InteropServices.DllImport("user32.dll")] private static extern bool LockWorkStation();

    private readonly NenCai _body = new() { Dock = DockStyle.Fill };
    private readonly Panel _chan = new() { Dock = DockStyle.Bottom, Height = S(76), BackColor = Clay.The };
    private List<LocalAccount> _accounts = new();
    private LocalAccount? _child;
    private bool _dongY;
    private readonly string _server = (Environment.GetEnvironmentVariable("AIIGROW_SERVER") is { Length: > 0 } e ? e : ReadServerFile()) is { Length: > 0 } s ? s : MayChuMacDinh;
    /// <summary>Gói ghép nhúng trong bộ cài (mở từ link Ba Mẹ gửi — L8) ⇒ bước 4 tự ghép, không gõ mã. null = ghép bằng mã 6 số.</summary>
    private readonly EnrollmentPackage? _goi;
    /// <summary>Ba Mẹ bấm «Gõ mã 6 số thay vì link» ⇒ bỏ gói, ghép bằng mã.</summary>
    private bool _dungMa;
    private bool _dangCai;

    public SetupForm(EnrollmentPackage? goi = null)
    {
        Clay.KhongMnemonic(this);
        _goi = goi is { Valid: true } ? goi : null;
        Text = "Cài AiiGrow";
        using (var ic = typeof(SetupForm).Assembly.GetManifestResourceStream("aiigrow.ico")) if (ic != null) Icon = new Icon(ic);
        Font = new Font("Segoe UI", 11f);
        ClientSize = new Size(S(721), S(640));
        var wa = Screen.PrimaryScreen!.WorkingArea;   // màn nhỏ / 150%+: không cao hơn vùng làm việc (thân cuộn được)
        if (Height > wa.Height) Height = wa.Height;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Nen;
        _body.AutoScroll = true;
        _chan.Paint += (_, e) => { using var p = new Pen(Color.FromArgb(0xe0, 0xdf, 0xda)); e.Graphics.DrawLine(p, 0, 0, _chan.Width, 0); };
        Controls.Add(_body);
        Controls.Add(_chan);
        BuocChao();
    }

    private static string ReadServerFile()
    {
        try
        {
            var f = Path.Combine(AppContext.BaseDirectory, "server.txt");
            return File.Exists(f) ? File.ReadAllText(f).Trim() : "";
        }
        catch { return ""; }
    }

    private bool DungGoi => _goi != null && !_dungMa;
    private string TenCon => _child?.Name is { Length: > 0 } n ? n : "con";

    // ================================================================ khung + khối dựng (toạ độ thiết kế)

    /// <summary>Nền thân: màu Nen + (màn Xong) dải ngọc nhạt phía trên + thanh 5 bước. Là IVeNenRieng để chữ / thẻ trong suốt thấy đúng nền.</summary>
    private sealed class NenCai : Panel, IVeNenRieng
    {
        public int Buoc;           // 1..5; 6 = Xong (đủ 5 viên)
        public string ChuBuoc = "";
        public bool DaiNgoc;
        public NenCai()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            BackColor = Clay.Nen;
        }
        protected override void OnPaintBackground(PaintEventArgs e) => VeNenRieng(e.Graphics, true);
        public void VeNenRieng(Graphics g, bool ngoaiCung)
        {
            g.Clear(Clay.Nen);
            var oy = AutoScrollPosition.Y;
            if (DaiNgoc)
            {
                var r = new Rectangle(0, oy, Width, S(380));
                using var lg = new LinearGradientBrush(r, Clay.NgocSoft, Clay.Nen, 90f);
                g.FillRectangle(lg, r);
            }
            Clay.ChatLuong(g);
            float x = S(36), y = oy + S(14);
            for (int i = 1; i <= TongBuoc; i++)
            {
                using var path = Clay.Bo(new RectangleF(x, y, S(36), S(8)), Clay.S(4));
                using var b = new SolidBrush(i <= Buoc ? Clay.Ngoc : Color.FromArgb(0xdc, 0xdb, 0xd6));
                g.FillPath(b, path);
                x += S(42);
            }
            TextRenderer.DrawText(g, ChuBuoc, new Font("Segoe UI", 10f, FontStyle.Bold), new Point((int)x + S(2), (int)y - S(5)), Clay.NgocInk, Color.Transparent);
        }
    }

    /// <summary>Control tự vẽ trên nền thật của cha (thẻ Clay) — chip, điện thoại mẫu, dấu tick, thanh tiến độ.</summary>
    private abstract class VeTay : Control
    {
        private readonly NenCache _nen;
        protected VeTay()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                     | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            TabStop = false;
            _nen = new NenCache(this, InvokePaintBackground, InvokePaint);
        }
        protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);
        protected override void OnPaint(PaintEventArgs e) { Clay.ChatLuong(e.Graphics); Ve(e.Graphics); }
        protected abstract void Ve(Graphics g);
        protected override void Dispose(bool disposing) { if (disposing) _nen.Dispose(); base.Dispose(disposing); }
    }

    /// <summary>Viên chữ bo tròn (chip «Mã dùng được 10 phút», «AiiGrow có / không»).</summary>
    private sealed class Chip : VeTay
    {
        public Color Nen2 = Clay.NgocSoft, Mau = Clay.NgocInk;
        public Image? Hinh;
        public string Chu = "";
        protected override void Ve(Graphics g)
        {
            using (var p = Clay.Bo(new RectangleF(0, 0, Width - 1, Height - 1), Height / 2f))
            using (var b = new SolidBrush(Nen2)) g.FillPath(b, p);
            int x = S(14);
            if (Hinh != null) { g.DrawImage(Hinh, x, (Height - S(20)) / 2, S(20), S(20)); x += S(26); }
            TextRenderer.DrawText(g, Chu, new Font("Segoe UI", 10f, FontStyle.Bold), new Rectangle(x, 0, Width - x, Height), Mau,
                TextFormatFlags.VerticalCenter | TextFormatFlags.Left | TextFormatFlags.NoPadding);
        }
        public void CoTheoChu()
        {
            using var f = new Font("Segoe UI", 10f, FontStyle.Bold);
            Width = S(14) + (Hinh != null ? S(26) : 0) + TextRenderer.MeasureText(Chu, f, Size.Empty, TextFormatFlags.NoPadding).Width + S(16);
        }
    }

    /// <summary>Điện thoại Ba Mẹ minh hoạ (màn Ghép máy): AiiGrow › Ghép máy hiện mã 6 số, «Dùng được 10 phút».</summary>
    private sealed class DienThoai : VeTay
    {
        protected override void Ve(Graphics g)
        {
            var vo = new RectangleF(0, 0, S(140), S(236));
            using (var p = Clay.Bo(vo, Clay.S(26))) using (var b = new SolidBrush(Color.FromArgb(0x1b, 0x1f, 0x1e))) g.FillPath(b, p);
            var man = new RectangleF(S(6), S(6), S(128), S(224));
            using (var p = Clay.Bo(man, Clay.S(21)))
            using (var b = new LinearGradientBrush(man, Color.FromArgb(0xe3, 0xef, 0xeb), Color.FromArgb(0xf4, 0xf4, 0xf2), 90f)) g.FillPath(b, p);
            using (var p = Clay.Bo(new RectangleF(S(52), S(13), S(36), S(8)), Clay.S(4))) using (var b = new SolidBrush(Color.FromArgb(0x1b, 0x1f, 0x1e))) g.FillPath(b, p);
            if (Anh3D.Rob("cho") is { } rob)
            {
                var k = S(60) / (float)Math.Max(rob.Width, rob.Height);
                g.DrawImage(rob, S(70) - rob.Width * k / 2, S(32), rob.Width * k, rob.Height * k);
            }
            var o = new Rectangle(S(6), 0, S(128), 0);
            void Giua(string t, int y, int h, float pt, FontStyle st, Color c) =>
                TextRenderer.DrawText(g, t, new Font("Segoe UI", pt, st), new Rectangle(o.X, y, o.Width, h), c, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            Giua("Mã ghép máy", S(104), S(16), 8.25f, FontStyle.Bold, Clay.Chu2);
            Giua("• • •  • • •", S(122), S(28), 15f, FontStyle.Bold, Clay.Chu);   // minh hoạ — mã thật nằm trên điện thoại của Ba Mẹ
            var chip = new RectangleF(S(20), S(162), S(100), S(24));
            using (var p = Clay.Bo(chip, Clay.S(12))) using (var b = new SolidBrush(Clay.NgocSoft)) g.FillPath(b, p);
            TextRenderer.DrawText(g, "Dùng được 10 phút", new Font("Segoe UI", 7.75f, FontStyle.Bold), Rectangle.Round(chip), Clay.NgocInk,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    /// <summary>Dấu trạng thái một dòng ở màn Đang cài: 0 chưa, 1 đang làm, 2 xong.</summary>
    private sealed class DauTick : VeTay
    {
        private int _tt;
        public int TrangThai { get => _tt; set { _tt = value; Invalidate(); } }
        protected override void Ve(Graphics g)
        {
            var r = new RectangleF(Clay.S(1), Clay.S(1), Width - Clay.S(2), Height - Clay.S(2));
            if (_tt == 2)
            {
                using (var b = new SolidBrush(Clay.Ngoc)) g.FillEllipse(b, r);
                using var pen = new Pen(Color.White, Clay.S(2.5f)) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round };
                g.DrawLines(pen, new[] { new PointF(r.X + r.Width * .27f, r.Y + r.Height * .52f), new PointF(r.X + r.Width * .44f, r.Y + r.Height * .68f), new PointF(r.X + r.Width * .74f, r.Y + r.Height * .35f) });
            }
            else if (_tt == 1)
            {
                using (var b = new SolidBrush(Clay.NgocSoft)) g.FillEllipse(b, r);
                using var pen = new Pen(Clay.Ngoc, Clay.S(2.5f));
                g.DrawArc(pen, RectangleF.Inflate(r, -Clay.S(3), -Clay.S(3)), -90, 250);
            }
            else using (var b = new SolidBrush(Color.FromArgb(0xdc, 0xdb, 0xd6))) g.FillEllipse(b, r);
        }
    }

    /// <summary>Thanh tiến độ lòng chảo (màn Đang cài).</summary>
    private sealed class ThanhTienDo : VeTay
    {
        private float _p;
        public float PhanTram { get => _p; set { _p = Math.Clamp(value, 0, 1); Invalidate(); } }
        protected override void Ve(Graphics g)
        {
            var r = new RectangleF(0, 0, Width - 1, Height - 1);
            using (var p = Clay.Bo(r, Height / 2f)) using (var b = new SolidBrush(Clay.Lom)) g.FillPath(b, p);
            if (_p <= 0) return;
            var f = new RectangleF(0, 0, Math.Max(Height, (Width - 1) * _p), Height - 1);
            using var pf = Clay.Bo(f, Height / 2f);
            using var lg = new LinearGradientBrush(f, Color.FromArgb(0x1c, 0x7d, 0x6c), Clay.NgocInk, 90f);
            g.FillPath(lg, pf);
        }
    }

    /// <summary>Gốc toạ độ thiết kế của một cha: thân màn = (0, 30) (thanh tiêu đề HTML); thẻ = (x, y) thiết kế của nó (lưu ở Tag).</summary>
    private static Point ToaDo(Control cha, int x, int y)
    {
        var g = cha.Tag is Point p ? p : new Point(0, 30);
        var lb = cha is ClayCard ? VeThe.LeBong : Padding.Empty;
        return new Point(S(x - g.X) + lb.Left, S(y - g.Y) + lb.Top);
    }

    private enum Kieu { H, H28, H30, P, S, B }

    /// <summary>Chữ đặt tại toạ độ thiết kế (x, y) — kiểu h 26px đậm / p 15px / s 13,5px / b 16px đậm như CSS thiết kế.</summary>
    private Label X(Control cha, int x, int y, string text, Kieu k, int rong = 0, Color? mau = null, bool dam = false)
    {
        var (pt, st, c) = k switch
        {
            Kieu.H => (19.5f, FontStyle.Bold, Chu),
            Kieu.H28 => (21f, FontStyle.Bold, Chu),
            Kieu.H30 => (22.5f, FontStyle.Bold, Chu),
            Kieu.P => (11.25f, FontStyle.Regular, Chu2),
            Kieu.S => (10f, FontStyle.Regular, Clay.Chu3),
            _ => (12f, FontStyle.Bold, Chu),
        };
        var l = new Label
        {
            Text = text, AutoSize = true, UseMnemonic = false, BackColor = Color.Transparent, ForeColor = mau ?? c,
            Font = new Font("Segoe UI", pt, dam ? FontStyle.Bold : st), Location = ToaDo(cha, x, y),
            MaximumSize = new Size(rong > 0 ? S(rong) : S(700 - x), 0),
        };
        cha.Controls.Add(l);
        return l;
    }

    /// <summary>Thẻ Clay tại toạ độ thiết kế; <paramref name="chon"/> = thẻ đang chọn (nền ngọc nhạt + viền ngọc 2,5).</summary>
    private ClayCard The(int x, int y, int w, int h, bool chon = false, Color? nen = null, Action? bam = null, Control? cha = null)
    {
        var lb = VeThe.LeBong;
        cha ??= _body;
        var p = ToaDo(cha, x, y);
        var c = new ClayCard
        {
            BoGoc = Clay.S(28), BackColor = nen ?? (chon ? Clay.NgocSoft : Clay.The), Tag = new Point(x, y),
            Location = new Point(p.X - lb.Left, p.Y - lb.Top), Size = new Size(S(w) + lb.Horizontal, S(h) + lb.Vertical),
        };
        if (chon)
            c.Paint += (_, e) =>
            {
                Clay.ChatLuong(e.Graphics);
                var r = new RectangleF(lb.Left + Clay.S(1.25f), lb.Top + Clay.S(1.25f), S(w) - Clay.S(2.5f), S(h) - Clay.S(2.5f));
                using var path = Clay.Bo(r, Clay.S(27));
                using var pen = new Pen(Chinh, Clay.S(2.5f));
                e.Graphics.DrawPath(pen, path);
            };
        if (bam != null) BamDuoc(c, bam);
        cha.Controls.Add(c);
        return c;
    }

    /// <summary>Cả thẻ (và mọi con trong nó, thêm sau cũng vậy) bấm được.</summary>
    private static void BamDuoc(Control c, Action bam)
    {
        c.Cursor = Cursors.Hand;
        c.Click += (_, _) => bam();
        c.ControlAdded += (_, e) => { if (e.Control is not TextBox and not ButtonBase) BamDuoc(e.Control!, bam); };
        foreach (Control con in c.Controls) if (con is not TextBox and not ButtonBase) BamDuoc(con, bam);
    }

    /// <summary>Viên icon 3D (bt 56 / nho 44) tại toạ độ thiết kế; <paramref name="mau"/>: «ngoc» | «cam» | null (sứ).</summary>
    private static ClayIcon Vien(Control cha, int x, int y, string icon, int co = 56, string? mau = null)
    {
        // ClayIcon vẽ viên tròn đường kính (cạnh − 12px) ⇒ control rộng hơn viên 12px, lệch −6/−4 cho khớp vị trí thiết kế.
        var v = new ClayIcon
        {
            Size = new Size(S(co + 12), S(co + 12)), Hinh = Anh3D.Icon(icon),
            MauVien = mau == "ngoc" ? Clay.NgocSoft : mau == "cam" ? Clay.CanhSoft : Clay.The,
        };
        var p = ToaDo(cha, x, y);
        v.Location = new Point(p.X - S(6), p.Y - S(4));
        cha.Controls.Add(v);
        return v;
    }

    private void Rob(string ten, int x, int y, int w, int h)
        => _body.Controls.Add(new HinhRob { Hinh = Anh3D.Rob(ten), Location = ToaDo(_body, x, y), Size = new Size(S(w), S(h)) });

    private Label Lien(Control cha, int x, int y, string text, Action bam, Color? mau = null)
    {
        var l = X(cha, x, y, text, Kieu.S, 0, mau ?? Clay.Canh, dam: true);
        l.Cursor = Cursors.Hand;
        l.Click += (_, _) => bam();
        return l;
    }

    private static ClayButton Nut(string text, bool chinh, int w)
    {
        var lb = VeNut.LeBong;
        return new ClayButton
        {
            Text = text, Size = new Size(S(w) + lb.Horizontal, S(48) + lb.Vertical), Font = new Font("Segoe UI", 12f, FontStyle.Bold),
            BackColor = chinh ? Chinh : Clay.The, ForeColor = chinh ? Color.White : Chu,
        };
    }

    /// <summary>Nút ở chân (cao 48, đỉnh 14) tại x thiết kế.</summary>
    private ClayButton NutChan(string text, int x, int w, bool chinh, Action bam)
    {
        var b = Nut(text, chinh, w);
        var lb = VeNut.LeBong;
        b.Location = new Point(S(x) - lb.Left, S(14) - lb.Top);
        b.Click += (_, _) => bam();
        _chan.Controls.Add(b);
        return b;
    }

    /// <summary>Nút chính: lề phải 34px như thiết kế (left = 687 − w).</summary>
    private ClayButton NutChinh(string text, int w, Action bam) => NutChan(text, 687 - w, w, true, bam);
    private ClayButton NutLui(Action bam, string text = "Quay lại") => NutChan(text, 36, 132, false, bam);

    /// <summary>Sang một màn: xoá thân + chân, đặt thanh bước.</summary>
    private void Man(int buoc, string ten, bool daiNgoc = false)
    {
        _body.SuspendLayout();
        foreach (Control c in _body.Controls.Cast<Control>().ToList()) { _body.Controls.Remove(c); c.Dispose(); }
        foreach (Control c in _chan.Controls.Cast<Control>().ToList()) { _chan.Controls.Remove(c); c.Dispose(); }
        _body.AutoScrollPosition = Point.Empty;
        _body.Buoc = buoc;
        _body.ChuBuoc = buoc > TongBuoc ? ten : $"Bước {buoc}/{TongBuoc} · {ten}";
        _body.DaiNgoc = daiNgoc;
        _body.ResumeLayout();
        _body.Invalidate();
    }

    // ================================================================ 1. Chào

    private void BuocChao()
    {
        Man(1, "Chào");
        Rob("chi", 24, 96, 240, 320);
        X(_body, 282, 100, "Cài AiiGrow lên\n" + (_child != null ? "máy của " + _child.Name : "máy tính của con"), Kieu.H28);
        X(_body, 282, 180, "Khoảng 2 phút · Ba Mẹ chỉ cần bấm theo", Kieu.P);
        Vien(_body, 282, 232, "lich", mau: "ngoc"); X(_body, 354, 238, "Ba Mẹ đặt giờ chơi", Kieu.B); X(_body, 354, 262, "ngay trên điện thoại", Kieu.S);
        Vien(_body, 282, 306, "sao", mau: "ngoc"); X(_body, 354, 312, "Làm việc tốt, nhận sao", Kieu.B); X(_body, 354, 336, "10 sao = 10 phút chơi", Kieu.S);
        Vien(_body, 282, 380, "mat", mau: "ngoc"); X(_body, 354, 386, "Con luôn thấy AiiGrow", Kieu.B); X(_body, 354, 410, "Không có gì giấu con", Kieu.S);
        if (Installer.IsAdmin())
            NutChinh("Bắt đầu cài", 220, BuocDieuKhoan);
        else
        {
            // Bộ cài cần quyền quản trị (manifest đã xin; chạy kiểu khác thì báo cách mở lại).
            X(_body, 282, 460, "Bộ cài chưa có quyền cài đặt. Đóng cửa sổ này, bấm chuột phải vào AiiGrow-Setup.exe › «Run as administrator», rồi gõ mật khẩu máy của Ba Mẹ.",
                Kieu.S, 405, Loi, dam: true);
            NutChinh("Đóng", 160, Close);
        }
    }

    // ================================================================ 2. Đồng ý

    private void BuocDieuKhoan()
    {
        Man(2, "Đồng ý");
        X(_body, 36, 72, "AiiGrow làm gì trên máy này?", Kieu.H);
        var co = The(36, 128, 315, 262);
        ChipTai(co, 56, 146, "AiiGrow có", Clay.NgocSoft, Clay.NgocInk, "tick");
        foreach (var (y, icon, chu) in new[] { (196, "dong_ho_cat", "Đếm phút con dùng app, web"), (260, "khoa", "Chỉ mở app Ba Mẹ cho phép"), (324, "chuong", "Báo khi con xin app mới") })
        { Vien(co, 56, y, icon, 44, "ngoc"); X(co, 112, y + 11, chu, Kieu.B, 230); }
        var khong = The(372, 128, 315, 262);
        ChipTai(khong, 392, 146, "AiiGrow không", Clay.CanhSoft, Clay.Canh, "x");
        foreach (var (y, icon, chu) in new[] { (196, "camera", "Không chụp màn hình"), (260, "tin", "Không đọc tin nhắn"), (324, "x", "Không ghi phím con gõ") })
        { Vien(khong, 392, y, icon, 44, "cam"); X(khong, 448, y + 11, chu, Kieu.B, 230); }
        X(_body, 38, 410, "Gỡ AiiGrow lúc nào cũng được, cần mật khẩu máy của Ba Mẹ.", Kieu.P);
        var cb = new CheckBox
        {
            Text = "Tôi là người lớn trong nhà và đồng ý cài AiiGrow", AutoSize = true, UseMnemonic = false, Checked = _dongY,
            Font = new Font("Segoe UI", 12f, FontStyle.Bold), ForeColor = Chu, BackColor = Color.Transparent, Location = ToaDo(_body, 36, 460),
        };
        _body.Controls.Add(cb);
        NutLui(BuocChao);
        var tiep = NutChinh("Đồng ý, chọn tài khoản", 260, BuocTaiKhoan);
        tiep.Enabled = _dongY;
        cb.CheckedChanged += (_, _) => { _dongY = cb.Checked; tiep.Enabled = cb.Checked; };
    }

    private Chip ChipTai(Control cha, int x, int y, string chu, Color nen, Color mau, string? icon = null)
    {
        var c = new Chip { Chu = chu, Nen2 = nen, Mau = mau, Hinh = icon == null ? null : Anh3D.Icon(icon), Height = S(32), Location = ToaDo(cha, x, y) };
        c.CoTheoChu();
        cha.Controls.Add(c);
        return c;
    }

    // ================================================================ 3. Tài khoản của con

    private static string? SidDangDung()
    {
        try { using var id = System.Security.Principal.WindowsIdentity.GetCurrent(); return id.User?.Value; } catch { return null; }
    }

    private async void BuocTaiKhoan()
    {
        Man(3, "Tài khoản");
        X(_body, 36, 72, "Con mở máy bằng tài khoản nào?", Kieu.H);
        X(_body, 38, 112, "Đang đọc các tài khoản trên máy…", Kieu.P);
        try { _accounts = await Task.Run(Accounts.List); }
        catch (Exception e)
        {
            Man(3, "Tài khoản");
            X(_body, 36, 72, "Con mở máy bằng tài khoản nào?", Kieu.H);
            X(_body, 38, 112, "Chưa đọc được các tài khoản trên máy: " + e.Message, Kieu.P, 650, Loi);
            NutLui(BuocDieuKhoan);
            NutChinh("Thử lại", 160, BuocTaiKhoan);
            return;
        }
        var toi = SidDangDung();
        // Gợi ý: máy đã có tài khoản giới hạn (không phải tài khoản đang dùng) ⇒ chắc là của con; không thì tạo mới.
        HienTaiKhoan(_accounts.Any(a => !a.IsAdmin && a.Sid != toi) ? 1 : 2);
    }

    /// <summary><paramref name="cach"/> 1 = con đã có tài khoản riêng (danh sách), 2 = tạo tài khoản mới.</summary>
    private void HienTaiKhoan(int cach)
    {
        if (cach == 1) ChonCoSan(); else TaoMoi();
    }

    private void ChonCoSan()
    {
        Man(3, "Tài khoản");
        var toi = SidDangDung();
        X(_body, 36, 72, "Con mở máy bằng tài khoản nào?", Kieu.H);
        X(_body, 38, 112, "Tài khoản của con sẽ là loại giới hạn: con không tự gỡ AiiGrow được.", Kieu.P);
        // Tài khoản đang dùng (người cài — Ba Mẹ) lên cuối, mờ, không chọn được.
        var ds = _accounts.OrderBy(a => a.Sid == toi).ThenBy(a => a.IsAdmin).ToList();
        var cao = 96 + Math.Max(1, ds.Count) * 52 + 14;
        var the = The(36, 152, 651, cao, chon: true);
        Vien(the, 56, 170, "nguoi", mau: "ngoc");
        X(the, 128, 176, "Con đã có tài khoản riêng", Kieu.B);
        X(the, 128, 200, "Tên con bấm vào khi mở máy", Kieu.S);
        if (_child != null && (_child.Sid == toi || ds.All(a => a.Sid != _child.Sid))) _child = null;
        ClayButton? tiep = null;
        var hang = new List<(ClayCard The, LocalAccount Tk)>();
        void VeChon()
        {
            foreach (var (h, a) in hang)
            {
                var chon = _child?.Sid == a.Sid;
                h.Lom = !chon;
                h.BackColor = chon ? Color.White : Clay.Lom;
                h.VeLaiNen();
            }
            if (tiep != null)
            {
                tiep.Enabled = _child != null;
                tiep.Text = _child != null ? "Dùng tài khoản " + _child.Name : "Chọn tài khoản của con";
            }
        }
        if (ds.Count == 0) X(the, 58, 252, "Máy chưa có tài khoản nào khác. Chọn «tạo tài khoản mới» bên dưới.", Kieu.S, 600);
        for (int i = 0; i < ds.Count; i++)
        {
            var a = ds[i];
            var la = a.Sid == toi;
            var y = 248 + i * 52;
            var lb = VeThe.LeBong;
            var p = ToaDo(the, 56, y);
            var h = new ClayCard
            {
                Lom = true, BoGoc = Clay.S(20), BackColor = Clay.Lom, Tag = new Point(56, y),
                Location = new Point(p.X - lb.Left, p.Y - lb.Top), Size = new Size(S(611) + lb.Horizontal, S(40) + lb.Vertical),
            };
            the.Controls.Add(h);
            var cham = new Label { AutoSize = false, Size = new Size(S(18), S(18)), Location = ToaDo(h, 72, y + 11), BackColor = Color.Transparent };
            cham.Paint += (_, e) =>
            {
                Clay.ChatLuong(e.Graphics);
                var r = new RectangleF(Clay.S(1), Clay.S(1), cham.Width - Clay.S(2), cham.Height - Clay.S(2));
                var chon = _child?.Sid == a.Sid;
                using (var b = new SolidBrush(Color.White)) e.Graphics.FillEllipse(b, r);
                using var pen = new Pen(chon ? Chinh : Color.FromArgb(0xa9, 0xac, 0xa9), chon ? Clay.S(5) : Clay.S(2));
                e.Graphics.DrawEllipse(pen, RectangleF.Inflate(r, -pen.Width / 2, -pen.Width / 2));
            };
            h.Controls.Add(cham);
            var ten = X(h, 102, y + 10, a.Name, Kieu.B, 0, la ? Clay.Chu3 : Chu);
            var phu = la ? "bạn đang dùng · toàn quyền, không chọn cho con"
                : a.IsAdmin ? "toàn quyền · sẽ đổi sang loại giới hạn" : "sẽ là loại giới hạn";
            X(h, 102 + (int)Math.Ceiling(ten.PreferredWidth / Clay.Scale) + 14, y + 11, phu, Kieu.S, 0, la ? Clay.Chu3 : Clay.NgocInk);
            if (!la)
            {
                BamDuoc(h, () => { _child = a; VeChon(); foreach (var (hh, _) in hang) hh.Invalidate(true); });
                hang.Add((h, a));
            }
        }
        var yTao = 152 + cao + 20;
        var tao = The(36, yTao, 651, 90, bam: () => TaoMoi());
        Vien(tao, 56, yTao + 17, "cong");
        X(tao, 128, yTao + 23, "Chưa có, tạo tài khoản mới cho con", Kieu.B);
        X(tao, 128, yTao + 47, "Không chắc thì chọn cái này, an toàn nhất", Kieu.S);
        NutLui(BuocDieuKhoan);
        tiep = NutChinh("Chọn tài khoản của con", 250, () => { if (_child != null) KiemTaiKhoan(_child); });
        VeChon();
    }

    private void TaoMoi()
    {
        Man(3, "Tài khoản");
        X(_body, 36, 72, "Con mở máy bằng tài khoản nào?", Kieu.H);
        var co = The(36, 122, 651, 72, bam: () => ChonCoSan());
        Vien(co, 56, 136, "nguoi", 44);
        X(co, 116, 147, "Con đã có tài khoản riêng", Kieu.B);
        var the = The(36, 212, 651, 300, chon: true);
        Vien(the, 56, 230, "cong", mau: "ngoc");
        X(the, 128, 236, "Tạo tài khoản mới cho con", Kieu.B);
        X(the, 128, 260, "Tài khoản của Ba Mẹ giữ nguyên", Kieu.S);
        X(the, 58, 304, "Tên đăng nhập", Kieu.S, 0, Chu2, dam: true);
        X(the, 372, 304, "Mật khẩu khi mở máy", Kieu.S, 0, Chu2, dam: true);
        var ten = new TextBox { Font = new Font("Segoe UI", 12.75f), MaxLength = 20 };
        var mk = new TextBox { Font = new Font("Segoe UI", 12.75f), UseSystemPasswordChar = true };
        foreach (var (o, x, w) in new[] { (ten, 56, 296), (mk, 370, 297) })
        {
            var vo = ONhapClay.Boc(o, S(w));
            var p = ToaDo(the, x, 326);
            vo.Location = new Point(p.X - VeThe.LeBong.Left, p.Y - VeThe.LeBong.Top);
            the.Controls.Add(vo);
        }
        var goiY = X(the, 58, 388, "Gõ không dấu · mật khẩu ít nhất 4 ký tự, Ba Mẹ ghi lại giúp con.", Kieu.S, 600);
        // Dải cam: máy chỉ có một tài khoản (toàn quyền) và đang là của con ⇒ màn giải thích.
        var dai = The(56, 426, 611, 64, nen: Clay.CanhSoft, bam: () => ManChiMotAdmin(), cha: the);
        dai.BoGoc = Clay.S(20);
        Vien(dai, 66, 436, "canh_bao", 44, "cam");
        X(dai, 124, 447, "Máy chỉ có 1 tài khoản, đang là của con? ›", Kieu.B, 0, Clay.Canh);
        NutLui(() => ChonCoSan());
        ClayButton? tiep = null;
        void DoiNhan() { if (tiep != null) tiep.Text = Accounts.IsValidName(ten.Text.Trim()) ? "Tạo tài khoản " + ten.Text.Trim() : "Tạo tài khoản"; }
        tiep = NutChinh("Tạo tài khoản", 250, async () =>
        {
            var n = ten.Text.Trim();
            void Loi_(string c) { goiY.Text = c; goiY.ForeColor = Loi; goiY.Font = new Font("Segoe UI", 10f, FontStyle.Bold); }
            if (!Accounts.IsValidName(n)) { Loi_("Tên chỉ gồm chữ không dấu, số, dấu . _ - (tối đa 20 ký tự). Ví dụ: baoanh"); return; }
            if (_accounts.Any(a => a.Name.Equals(n, StringComparison.OrdinalIgnoreCase))) { Loi_($"Máy đã có tài khoản «{n}». Đặt tên khác, hoặc chọn «Con đã có tài khoản riêng»."); return; }
            if (mk.Text.Length < 4) { Loi_("Mật khẩu cần ít nhất 4 ký tự."); return; }
            tiep!.Enabled = false;
            try
            {
                var pw = mk.Text;
                var sid = await Task.Run(() => Accounts.CreateStandard(n, pw));
                _child = new LocalAccount(n, sid, false);
                BuocGhep();
            }
            catch (Exception e) { Loi_("Chưa tạo được tài khoản: " + e.Message); tiep.Enabled = true; }
        });
        ten.TextChanged += (_, _) => DoiNhan();
        ten.Focus();
    }

    /// <summary>Chọn tài khoản toàn quyền cho con: máy còn tài khoản toàn quyền khác ⇒ hỏi lại rồi đi tiếp; không còn ⇒ màn «Máy cần thêm tài khoản cho Ba Mẹ».</summary>
    private void KiemTaiKhoan(LocalAccount con)
    {
        if (!con.IsAdmin) { BuocGhep(); return; }
        var khac = _accounts.Count(a => a.IsAdmin && a.Sid != con.Sid);
        if (khac > 0)
        {
            if (MessageBox.Show($"Đổi «{con.Name}» thành tài khoản giới hạn? Con vẫn mở máy, học, chơi như cũ — chỉ không tự gỡ AiiGrow được. Gỡ AiiGrow thì trả lại như cũ.",
                    "Cài AiiGrow", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                BuocGhep();
            return;
        }
        ManChiMotAdmin(con);
    }

    /// <summary>Máy chỉ có MỘT tài khoản toàn quyền (thường là tài khoản con đang dùng) ⇒ không hạ được; khuyên tạo tài khoản mới cho con.</summary>
    private void ManChiMotAdmin(LocalAccount? con = null)
    {
        Man(3, "Tài khoản");
        var ten = con?.Name ?? (_accounts.Where(a => a.IsAdmin).ToList() is { Count: 1 } mot ? mot[0].Name
            : _accounts.FirstOrDefault(a => a.Sid == SidDangDung())?.Name ?? "tài khoản đang dùng");
        Rob("trong-loi", 24, 96, 210, 290);
        X(_body, 252, 84, "Máy cần thêm tài khoản\ncho Ba Mẹ", Kieu.H);
        X(_body, 252, 160, $"Máy chỉ có 1 tài khoản toàn quyền là «{ten}». Đổi nó sang giới hạn thì không ai gỡ hay chỉnh AiiGrow được nữa.", Kieu.P, 430);
        var the = The(252, 244, 435, 116, chon: true);
        Vien(the, 272, 262, "lap_lanh", mau: "ngoc");
        X(the, 344, 268, "Cách dễ nhất", Kieu.B);
        X(the, 344, 292, "Tạo tài khoản mới cho con.", Kieu.S, 330);
        X(the, 344, 310, $"«{ten}» giữ làm tài khoản của Ba Mẹ.", Kieu.S, 330);
        X(_body, 254, 384, $"Muốn giữ «{ten}» cho con: tạo trước 1 tài khoản toàn quyền cho Ba Mẹ trong Cài đặt Windows › Tài khoản, rồi chạy lại bộ cài.", Kieu.S, 430);
        NutLui(() => ChonCoSan());
        NutChinh("Tạo tài khoản mới cho con", 300, TaoMoi);
    }

    // ================================================================ 4. Ghép máy

    /// <summary>Ô mã 6 ô số (lòng chảo 52×64): gõ / dán «482 017» tự dàn đủ 6 ô; Backspace ở ô trống lùi về ô trước.</summary>
    private sealed class OMa6 : Panel
    {
        private readonly TextBox[] _o = new TextBox[6];
        private bool _dang;
        public event Action? Doi;
        public OMa6()
        {
            BackColor = Color.Transparent;
            var lb = VeThe.LeBong;
            for (int i = 0; i < 6; i++)
            {
                var o = new TextBox { Font = new Font("Segoe UI", 21f, FontStyle.Bold), TextAlign = HorizontalAlignment.Center, MaxLength = 7 };
                var vo = ONhapClay.Boc(o, S(52));
                vo.Location = new Point(S(i * 60), 0);
                Controls.Add(vo);
                _o[i] = o;
                var k = i;
                o.KeyPress += (_, e) => { if (!char.IsDigit(e.KeyChar) && !char.IsControl(e.KeyChar)) e.Handled = true; };
                o.KeyDown += (_, e) => { if (e.KeyCode == Keys.Back && o.TextLength == 0 && k > 0) { _o[k - 1].Text = ""; _o[k - 1].Focus(); e.SuppressKeyPress = true; } };
                o.TextChanged += (_, _) => GoVao(k);
                if (i == 5) { Width = vo.Right; Height = vo.Height; }
            }
        }
        private void GoVao(int k)
        {
            if (_dang) return;
            var t = LoiGhep.ChuanMa(_o[k].Text);
            if (t.Length > 1) { Ma = Ma[..k] + t; return; }   // dán / gõ nhanh ⇒ dàn sang các ô sau
            _dang = true;
            if (_o[k].Text != t) _o[k].Text = t;
            _dang = false;
            if (t.Length == 1 && k < 5) _o[k + 1].Focus();
            Doi?.Invoke();
        }
        public string Ma
        {
            get => string.Concat(_o.Select(o => LoiGhep.ChuanMa(o.Text)));
            set
            {
                var m = LoiGhep.ChuanMa(value);
                _dang = true;
                for (int i = 0; i < 6; i++) _o[i].Text = i < m.Length ? m[i].ToString() : "";
                _dang = false;
                _o[Math.Min(m.Length, 5)].Focus();
                Doi?.Invoke();
            }
        }
        public bool Sai { set { foreach (var o in _o) o.ForeColor = value ? Clay.Loi : Clay.Chu; } }
        public void VaoO() => _o[Math.Min(Ma.Length, 5)].Focus();
    }

    /// <summary>Khung chung bước 4: tiêu đề + thẻ điện thoại Ba Mẹ minh hoạ bên trái.</summary>
    private void KhungGhep(string tieu)
    {
        Man(4, "Ghép máy");
        X(_body, 36, 72, tieu, Kieu.H);
        var dt = The(36, 126, 256, 340);
        var ve = new DienThoai { Size = new Size(S(141), S(237)), Location = ToaDo(dt, 94, 146) };
        dt.Controls.Add(ve);
        var a = X(dt, 36, 396, "Điện thoại Ba Mẹ", Kieu.B);
        var b = X(dt, 36, 420, "AiiGrow › Ghép máy", Kieu.S);
        foreach (var l in new[] { a, b }) { l.AutoSize = false; l.Size = new Size(S(256), l.PreferredHeight); l.TextAlign = ContentAlignment.TopCenter; }
    }

    /// <summary>Bước 4. Có gói từ link Ba Mẹ gửi ⇒ tự ghép (một nút); không ⇒ gõ mã 6 số (hạn 10 phút).</summary>
    private void BuocGhep()
    {
        var child = _child!;
        if (DungGoi)
        {
            KhungGhep("Máy tự ghép bằng link Ba Mẹ gửi");
            Vien(_body, 318, 146, "lap", mau: "ngoc");
            X(_body, 390, 152, "Bộ cài này mở từ link Ba Mẹ gửi", Kieu.B, 300);
            X(_body, 390, 176, "Không cần gõ mã. Bấm «Ghép và cài» là xong.", Kieu.S, 300);
            ChipTai(_body, 316, 236, "Ghép vào nhà trong app Ba Mẹ", Clay.NgocSoft, Clay.NgocInk, "tick");
            X(_body, 318, 290, $"Tài khoản {child.Name} sẽ là loại giới hạn.", Kieu.P, 370);
            var theLink = The(316, 372, 371, 94);
            Vien(theLink, 334, 397, "dong_ho_cat", 44, "ngoc");
            X(theLink, 392, 394, "Link hết hạn hoặc lỗi?", Kieu.B, 280);
            Lien(theLink, 392, 420, "Gõ mã 6 số thay vì link ›", () => { _dungMa = true; BuocGhep(); }, Clay.NgocInk);
            NutLui(() => ChonCoSan());
            NutChinh("Ghép và cài", 240, () => BuocCai(new InstallOptions { Server = _goi!.Server, Package = _goi, Child = child }));
            return;
        }
        KhungGhep("Gõ mã 6 số trên điện thoại Ba Mẹ");
        X(_body, 318, 146, "Mã ghép", Kieu.B);
        var o = new OMa6 { Location = ToaDo(_body, 316, 176) };
        o.Location = new Point(o.Left - VeThe.LeBong.Left, o.Top - VeThe.LeBong.Top);
        _body.Controls.Add(o);
        var chip = ChipTai(_body, 316, 262, "Mã dùng được 10 phút", Clay.NgocSoft, Clay.NgocInk, "dong_ho_cat");
        var loi = X(_body, 346, 264, "", Kieu.B, 340, Loi);
        loi.Visible = false;
        X(_body, 318, 310, "Ghép xong, máy vào nhà mình trong app Ba Mẹ.", Kieu.P, 370);
        var the = The(316, 372, 371, 94);
        Vien(the, 334, 397, "lap", 44, "ngoc");
        X(the, 392, 394, "Mở bộ cài từ link Ba Mẹ gửi?", Kieu.B, 280);
        X(the, 392, 420, "Máy tự ghép, không cần gõ mã.", Kieu.S, 280);
        if (_goi != null) Lien(_body, 318, 338, "Dùng link Ba Mẹ gửi ›", () => { _dungMa = false; BuocGhep(); }, Clay.NgocInk);
        NutLui(() => ChonCoSan());
        void Gui()
        {
            if (LoiGhep.CauThieu(o.Ma) is { } thieu)
            {
                chip.Visible = false; loi.Visible = true; loi.Text = "⚠  " + thieu;
                o.VaoO();
                return;
            }
            BuocCai(new InstallOptions { Server = _server, Code = o.Ma, Child = child });
        }
        NutChinh("Ghép vào nhà", 240, Gui);
        o.Doi += () => { if (loi.Visible) { loi.Visible = false; chip.Visible = true; } };
        o.VaoO();
    }

    /// <summary>Máy chủ báo mã không đúng (404 ma_sai) — chưa cài gì.</summary>
    private void ManMaSai(InstallOptions o)
    {
        KhungGhep("Gõ mã 6 số trên điện thoại Ba Mẹ");
        X(_body, 318, 146, "Mã ghép", Kieu.B);
        var oma = new OMa6 { Location = ToaDo(_body, 316, 176) };
        oma.Location = new Point(oma.Left - VeThe.LeBong.Left, oma.Top - VeThe.LeBong.Top);
        _body.Controls.Add(oma);
        oma.Ma = o.Code;
        oma.Sai = true;
        oma.Enabled = false;
        Vien(_body, 312, 256, "canh_bao", 24);
        X(_body, 346, 264, "Mã chưa đúng. Xem lại 6 số nhé.", Kieu.B, 340, Loi);
        X(_body, 318, 310, "So từng số với mã trên điện thoại Ba Mẹ.", Kieu.P, 370);
        var the = The(316, 372, 371, 94);
        Vien(the, 334, 397, "dong_ho_cat", 44, "ngoc");
        X(the, 392, 394, "Xin Ba Mẹ mã mới trên điện thoại", Kieu.B, 280);
        X(the, 392, 420, "AiiGrow › Ghép máy › Lấy mã mới", Kieu.S, 280);
        NutChinh("Gõ lại mã", 220, () => { _dungMa = true; BuocGhep(); });
    }

    // ================================================================ 5. Cài + lỗi + Xong

    private async void BuocCai(InstallOptions o)
    {
        var child = o.Child;
        Man(5, "Cài");
        Rob("cho", 24, 96, 220, 300);
        X(_body, 270, 90, "Đang cài AiiGrow…", Kieu.H);
        X(_body, 270, 130, "Còn khoảng 1 phút · đừng tắt máy nhé", Kieu.P);
        var thanh = new ThanhTienDo { Size = new Size(S(417), S(18)), Location = ToaDo(_body, 270, 174), PhanTram = 0.04f };
        _body.Controls.Add(thanh);
        var chu = new[] { "Ghép vào nhà", $"Tài khoản {child.Name}: loại giới hạn", "Đang cài AiiGrow", "Gắn AiiGrow cạnh đồng hồ" };
        var dau = new DauTick[4];
        var dong = new Label[4];
        for (int i = 0; i < 4; i++)
        {
            var y = 222 + i * 46;
            dau[i] = new DauTick { Size = new Size(S(26), S(26)), Location = ToaDo(_body, 270, y), TrangThai = i == 0 ? 1 : 0 };
            _body.Controls.Add(dau[i]);
            dong[i] = X(_body, 308, y + 2, chu[i], Kieu.P, 380, i == 0 ? Clay.NgocInk : Clay.Chu3, dam: i == 0);
        }
        var chan = new Label { AutoSize = true, Text = "Cài xong, AiiGrow tự sang bước cuối.", Font = new Font("Segoe UI", 11.25f), ForeColor = Chu2, Location = new Point(S(36), S(27)), BackColor = Color.Transparent };
        _chan.Controls.Add(chan);
        void Buoc(int i)
        {
            dau[i].TrangThai = 2;
            dong[i].ForeColor = Chu; dong[i].Font = new Font("Segoe UI", 11.25f);
            if (i == 0) dong[0].Text = "Đã ghép vào nhà" + (string.IsNullOrWhiteSpace(o.Pair?.ChildName) ? "" : " · hồ sơ " + o.Pair!.ChildName);
            if (i == 2) dong[2].Text = "Đã cài AiiGrow";
            if (i + 1 < 4) { dau[i + 1].TrangThai = 1; dong[i + 1].ForeColor = Clay.NgocInk; dong[i + 1].Font = new Font("Segoe UI", 11.25f, FontStyle.Bold); }
            thanh.PhanTram = (i + 1) / 4f;
        }
        _dangCai = true;
        try
        {
            await Installer.RunAsync(o, (i, _) => BeginInvoke(() => { if (!IsDisposed) Buoc(i); }));
            _dangCai = false;
            if (IsDisposed) return;
            BuocXong(child, o.Pair?.ChildName);
        }
        catch (Exception e)
        {
            _dangCai = false;
            if (IsDisposed) return;
            Program.WriteLog("Cài lỗi: " + e.Message);
            switch (LoiGhep.Phan(e, daGhep: o.Pair != null))
            {
                case LoaiLoiGhep.MaSai when o.Package == null: ManMaSai(o); break;
                case LoaiLoiGhep.MaSai:
                case LoaiLoiGhep.HetHan: ManHetHan(o); break;
                case LoaiLoiGhep.MatMang: ManMatMang(o); break;
                default: ManLoiKhac(o, e.Message); break;
            }
        }
    }

    /// <summary>Mã 6 số quá 10 phút / đã dùng (410 ma_het_han, 409 ma_da_dung), hoặc link Ba Mẹ gửi hết hạn — chưa cài gì.</summary>
    private void ManHetHan(InstallOptions o)
    {
        Man(5, "Cài");
        Rob("trong-loi", 24, 96, 220, 300);
        var link = o.Package != null;
        X(_body, 270, 90, link ? "Link ghép đã hết hạn" : "Mã ghép đã hết hạn", Kieu.H);
        X(_body, 270, 134, link
            ? "Link Ba Mẹ gửi đã hết hạn hoặc đã dùng. Trên điện thoại Ba Mẹ, bấm «Ghép máy» để lấy mã mới rồi gõ ở đây."
            : $"Mã {LoiGhep.Hien(o.Code)} chỉ dùng được 10 phút. Trên điện thoại Ba Mẹ, bấm «Lấy mã mới» rồi gõ lại.", Kieu.P, 417);
        var the = The(270, 218, 417, 96);
        Vien(the, 290, 238, "dong_ho_cat", mau: "cam");
        X(the, 362, 244, "Chưa cài gì lên máy", Kieu.B, 310);
        X(the, 362, 268, $"Tài khoản {o.Child.Name} vẫn giữ nguyên", Kieu.S, 310);
        NutLui(() => { _dungMa = true; BuocGhep(); });
        NutChinh("Gõ mã mới", 230, () => { _dungMa = true; BuocGhep(); });
    }

    /// <summary>Không tới được máy chủ. Đã ghép rồi (lỗi ở bước sau) ⇒ «Thử lại» dùng lại kết quả ghép (InstallOptions.Pair), không ghép lần hai.</summary>
    private void ManMatMang(InstallOptions o)
    {
        Man(5, "Cài");
        Rob("trong-loi", 24, 96, 220, 300);
        X(_body, 270, 90, "Máy chưa vào được mạng", Kieu.H);
        X(_body, 270, 134, "Bật lại Wi-Fi rồi bấm «Thử lại». Phần đã cài vẫn được giữ.", Kieu.P, 417);
        var wifi = The(270, 204, 417, 96);
        Vien(wifi, 290, 224, "wifi", mau: "ngoc");
        X(wifi, 362, 230, "Kiểm Wi-Fi", Kieu.B, 310);
        X(wifi, 362, 254, "Bấm Wi-Fi cạnh đồng hồ › chọn mạng nhà", Kieu.S, 310);
        var the = The(270, 316, 417, 96);
        if (o.Pair != null)
        {
            Vien(the, 290, 336, "tick", mau: "cam");
            X(the, 362, 342, "Đã ghép vào nhà", Kieu.B, 310);
            X(the, 362, 366, "Không cần gõ lại mã", Kieu.S, 310);
        }
        else
        {
            Vien(the, 290, 336, "dong_ho_cat", mau: "cam");
            X(the, 362, 342, "Chưa ghép, chưa cài gì", Kieu.B, 310);
            X(the, 362, 366, o.Package != null ? "Có mạng là máy tự ghép" : "Mã còn hạn thì không cần gõ lại", Kieu.S, 310);
        }
        NutChinh("Thử lại", 220, () => BuocCai(o));
    }

    /// <summary>Lỗi khác (sai loại máy, chưa cài được dịch vụ…): nói câu lỗi, cho Thử lại / Quay lại.</summary>
    private void ManLoiKhac(InstallOptions o, string cau)
    {
        Man(5, "Cài");
        Rob("trong-loi", 24, 96, 220, 300);
        X(_body, 270, 90, "Chưa cài xong", Kieu.H);
        X(_body, 270, 134, cau, Kieu.P, 417);
        var the = The(270, 248, 417, 96);
        Vien(the, 290, 268, "dau_hoi", mau: "cam");
        X(the, 362, 274, "Thử lại một lần nữa", Kieu.B, 310);
        X(the, 362, 298, "Vẫn lỗi? Tải lại bộ cài ở aiigrow.aiilab.vn/tai", Kieu.S, 310);
        NutLui(BuocGhep);
        NutChinh("Thử lại", 220, () => BuocCai(o));
    }

    private void BuocXong(LocalAccount child, string? tenHoSo = null)
    {
        Man(6, "Xong", daiNgoc: true);
        var ten = string.IsNullOrWhiteSpace(tenHoSo) ? child.Name : tenHoSo!;
        Rob("xong", 24, 84, 250, 330);
        var ph = new ClayIcon { Size = new Size(S(56), S(56)), MauVien = Color.Transparent, Hinh = Anh3D.Icon("phao_hoa"), Location = ToaDo(_body, 206, 84) };
        _body.Controls.Add(ph);
        X(_body, 290, 80, "Máy đã sẵn sàng,\n" + ten + "!", Kieu.H30, 400);
        X(_body, 290, 164, "AiiGrow ở cạnh đồng hồ, góc phải màn hình.", Kieu.P, 400);
        foreach (var (y, icon, tieu, phu) in new[]
                 {
                     (206, "lich", "Giờ chơi mỗi ngày do Ba Mẹ đặt", "Đổi ngay trên điện thoại Ba Mẹ"),
                     (284, "sao", "Làm việc tốt, nhận sao", "10 sao = 10 phút chơi"),
                     (362, "khoa", "Chỉ mở app Ba Mẹ cho phép", "App mới thì bấm xin Ba Mẹ"),
                 })
        {
            var the = The(290, y, 397, 68);
            Vien(the, 302, y + 6, icon, mau: "ngoc");
            X(the, 374, y + 12, tieu, Kieu.B, 300);
            X(the, 374, y + 36, phu, Kieu.S, 300);
        }
        X(_body, 36, 556, $"Máy chuyển sang tài khoản {child.Name}. Việc Ba Mẹ đang mở vẫn giữ nguyên.", Kieu.S, 650);
        NutLui(Close, "Để sau");
        // #70 §1: chuyển người dùng (khoá phiên), KHÔNG đăng xuất — Ba Mẹ không mất việc đang mở. Ở màn khoá chọn tài khoản của con.
        NutChinh("Vào máy của " + ten, 250, () => LockWorkStation());
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (_dangCai && e.CloseReason == CloseReason.UserClosing)
        {
            MessageBox.Show("AiiGrow đang cài, đợi chút nhé — xong sẽ báo.", "Cài AiiGrow", MessageBoxButtons.OK, MessageBoxIcon.Information);
            e.Cancel = true;
            return;
        }
        base.OnFormClosing(e);
    }
}
