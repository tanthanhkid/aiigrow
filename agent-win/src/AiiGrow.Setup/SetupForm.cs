using System.Drawing.Drawing2D;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Setup;

/// <summary>
/// Bộ cài theo thiết kế chốt 05/11 (docs/thiet-ke-chot/con-cai-win, 12 màn): Ba Mẹ chạy trên máy của con, mỗi màn một việc, câu ngắn nói với Ba Mẹ,
/// icon 3D + Grow thay chữ, nút chính nói rõ kết quả. Khung 723×672 (theo DPI). Luồng: 1 Chào → 2 Đồng ý → 3 Tài khoản (có sẵn / tạo mới /
/// «chỉ 1 tài khoản quản trị») → 4 Ghép máy (mã 6 số hạn 10 phút — dự phòng; mở từ link Ba Mẹ gửi thì tự ghép) → 5 Cài (lỗi: mã sai / mã hết hạn /
/// mất mạng) → Xong. Toạ độ trong mã = toạ độ px của HTML thiết kế (đã trừ thanh tiêu đề 30px), nhân DPI qua Clay.Si.
/// </summary>
internal sealed class SetupForm : Form
{
    // Token màu «Clay gương» (CapNhatSetup.cs dùng chung — giữ tên).
    internal static readonly Color Chinh = Clay.Ngoc;
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
        Font = PhongChu.Tao(11f);
        ClientSize = new Size(S(721), S(640));
        var wa = Screen.PrimaryScreen!.WorkingArea;   // màn nhỏ / 150%+: không cao hơn vùng làm việc (thân cuộn được)
        if (Height > wa.Height) Height = wa.Height;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Nen;
        _body.AutoScroll = true;
        _chan.Paint += (_, e) => { using var p = new Pen(Clay.Tron(Clay.Lom, Clay.Bong, 0.3f)); e.Graphics.DrawLine(p, 0, 0, _chan.Width, 0); };
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
                // Bàn E (#426): đã xong = navy; đang ở = vàng kim viền navy 1,5; chưa tới = rãnh lõm kem
                var vien = new RectangleF(x, y, S(36), S(8));
                using var path = Clay.Bo(vien, Clay.S(4));
                if (i < Buoc) { using var b = new SolidBrush(Clay.Chu); g.FillPath(b, path); }
                else if (i == Buoc)
                {
                    Clay.ToKim(g, path, vien);
                    using var pen = new Pen(Clay.Chu, Clay.S(1.5f));
                    using var pv = Clay.Bo(RectangleF.Inflate(vien, -Clay.S(0.75f), -Clay.S(0.75f)), Clay.S(3.25f));
                    g.DrawPath(pen, pv);
                }
                else
                {
                    using var b = new SolidBrush(Clay.Lom); g.FillPath(b, path);
                    using var pen = new Pen(Clay.A(70, Clay.Bong), Clay.S(1f));
                    var st = g.Save(); g.SetClip(path, CombineMode.Intersect);
                    { using var pb = Clay.Bo(new RectangleF(x + Clay.S(0.5f), y + Clay.S(0.5f), S(36), S(8)), Clay.S(4)); g.DrawPath(pen, pb); }
                    g.Restore(st);
                }
                x += S(42);
            }
            // #324: TextRenderer (GDI) mặc định BỎ phép dời gốc của Graphics. Nền này còn được vẽ lại vào ảnh nền đã nhớ của thẻ / chữ trong suốt
            // (Clay.VeNenCha dời gốc theo vị trí con) ⇒ không giữ phép dời thì chữ «Bước n/5 · …» rơi vào toạ độ của CON: mẩu chữ «B», «ư» lòi ra
            // ở lề bóng góc phải trên các thẻ (bước 2 «AiiGrow có / không», bước 4 thẻ điện thoại + «Mở bộ cài từ link…»).
            using var fontBuoc = PhongChu.Tao(10f, FontStyle.Bold);
            TextRenderer.DrawText(g, ChuBuoc, fontBuoc, new Point((int)x + S(2), (int)y - S(5)), Clay.NgocInk,
                TextFormatFlags.PreserveGraphicsTranslateTransform | TextFormatFlags.PreserveGraphicsClipping);
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

    internal enum KieuChip { Lom, Navy, Khong }

    /// <summary>Viên chữ bo tròn của Bàn E: «Lom» = rãnh lõm kem (mã dùng được 10 phút), «Navy» = navy chữ vàng kim (AiiGrow có), «Khong» = lõm, chữ nâu đỏ, dấu ✕ đỏ (AiiGrow không).</summary>
    private sealed class Chip : VeTay
    {
        public KieuChip Kieu = KieuChip.Lom;
        public Image? Hinh;
        public string Chu = "";
        private static readonly Color DoCanh = Color.FromArgb(0xA2, 0x41, 0x2C);
        protected override void Ve(Graphics g)
        {
            var r = new RectangleF(0, 0, Width - 1, Height - 1);
            using (var p = Clay.Bo(r, Height / 2f))
            {
                if (Kieu == KieuChip.Navy) { using var b = new SolidBrush(Clay.Chu); g.FillPath(b, p); }
                else Clay.KhoiLom(g, r, Height / 2f, Clay.Lom);
            }
            int x = S(14);
            if (Kieu == KieuChip.Khong)
            {
                var o = new RectangleF(x - Clay.S(1), (Height - S(20)) / 2f, S(20), S(20));
                using (var b = new SolidBrush(DoCanh)) g.FillEllipse(b, o);
                using var pen = new Pen(Color.White, Clay.S(1.8f)) { StartCap = LineCap.Round, EndCap = LineCap.Round };
                var c = o.X + o.Width / 2; var d = o.Width * 0.2f; var cy = o.Y + o.Height / 2;
                g.DrawLine(pen, c - d, cy - d, c + d, cy + d); g.DrawLine(pen, c + d, cy - d, c - d, cy + d);
                x += S(26);
            }
            else if (Hinh != null) { var k = S(26); g.DrawImage(Hinh, x - S(4), (Height - k) / 2f, k, k); x += S(24); }
            TextRenderer.DrawText(g, Chu, PhongChu.Tao(10f, FontStyle.Bold), new Rectangle(x, 0, Width - x, Height),
                Kieu == KieuChip.Navy ? Clay.Kim : Kieu == KieuChip.Khong ? DoCanh : Clay.Chu,
                TextFormatFlags.VerticalCenter | TextFormatFlags.Left | TextFormatFlags.NoPadding);
        }
        public void CoTheoChu()
        {
            using var f = PhongChu.Tao(10f, FontStyle.Bold);
            Width = S(14) + (Hinh != null || Kieu == KieuChip.Khong ? S(Kieu == KieuChip.Khong ? 26 : 24) : 0) + TextRenderer.MeasureText(Chu, f, Size.Empty, TextFormatFlags.NoPadding).Width + S(16);
        }
    }

    /// <summary>Ô tick «Tôi là người lớn…» theo bàn: vuông 26 bo 8, chọn = nền ngọc + tick trắng; bấm cả chữ; phím cách đổi.</summary>
    internal sealed class OTichDongY : Control
    {
        private bool _chon;
        public event EventHandler? CheckedChanged;
        public bool Checked { get => _chon; set { if (_chon == value) return; _chon = value; Invalidate(); CheckedChanged?.Invoke(this, EventArgs.Empty); } }
        public OTichDongY()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor | ControlStyles.Selectable, true);
            BackColor = Color.Transparent; TabStop = true; Cursor = Cursors.Hand;
            Font = PhongChu.Tao(12f, FontStyle.Bold);
            AccessibleRole = AccessibleRole.CheckButton;
        }
        protected override void OnTextChanged(EventArgs e)
        {
            base.OnTextChanged(e);
            Size = new Size(S(38) + TextRenderer.MeasureText(Text, Font, Size.Empty, TextFormatFlags.NoPadding).Width + S(4), S(30));
            Invalidate();
        }
        protected override void OnClick(EventArgs e) { base.OnClick(e); Focus(); Checked = !Checked; }
        protected override void OnKeyDown(KeyEventArgs e) { if (e.KeyCode == Keys.Space) { Checked = !Checked; e.Handled = true; } base.OnKeyDown(e); }
        protected override void OnGotFocus(EventArgs e) { base.OnGotFocus(e); Invalidate(); }
        protected override void OnLostFocus(EventArgs e) { base.OnLostFocus(e); Invalidate(); }
        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            Clay.ChatLuong(g);
            var o = new RectangleF(S(1), (Height - S(26)) / 2f, S(26), S(26));
            using (var p = Clay.Bo(o, S(8)))
            {
                if (_chon) { using var b = new SolidBrush(Clay.Ngoc); g.FillPath(b, p); }
                else
                {
                    using var b = new SolidBrush(Clay.NenSang); g.FillPath(b, p);
                    using var pen = new Pen(Clay.Chu3, S(2)); g.DrawPath(pen, p);
                }
            }
            if (_chon)
            {
                using var pen = new Pen(Color.White, Clay.S(2.4f)) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round };
                g.DrawLines(pen, new[] { new PointF(o.X + o.Width * .18f, o.Y + o.Height * .53f), new PointF(o.X + o.Width * .39f, o.Y + o.Height * .74f), new PointF(o.X + o.Width * .82f, o.Y + o.Height * .28f) });
            }
            if (Focused) { using var pen = new Pen(Clay.Ngoc, S(2)) { DashStyle = DashStyle.Dot }; g.DrawRectangle(pen, 0, 0, Width - 1, Height - 1); }
            TextRenderer.DrawText(g, Text, Font, new Rectangle(S(38), 0, Width - S(38), Height), Chu, TextFormatFlags.VerticalCenter | TextFormatFlags.Left | TextFormatFlags.NoPadding);
        }
    }

    /// <summary>Ô «Tự vào, không mật khẩu» (màn Tạo tài khoản) theo Bàn E: khối navy bo 16, dấu tick vàng kim, chữ vàng kim đậm.</summary>
    private sealed class ChipTuVao : VeTay
    {
        protected override void Ve(Graphics g)
        {
            var r = new RectangleF(0, 0, Width - 1, Height - 1);
            using (var p = Clay.Bo(r, S(16))) using (var b = new SolidBrush(Clay.Chu)) g.FillPath(b, p);
            if (Net("tick_kim") is { } ic) g.DrawImage(ic, S(14), (Height - S(36)) / 2f, S(36), S(36));
            TextRenderer.DrawText(g, "Tự vào, không mật khẩu", PhongChu.Tao(12f, FontStyle.Bold), new Rectangle(S(52), 0, Width - S(52), Height), Clay.Kim,
                TextFormatFlags.VerticalCenter | TextFormatFlags.Left | TextFormatFlags.NoPadding);
        }
    }

    /// <summary>Điện thoại Ba Mẹ minh hoạ (màn Ghép máy): AiiGrow › Cả nhà › Ghép thêm máy hiện mã 6 số, «Dùng được 10 phút».</summary>
    private sealed class DienThoai : VeTay
    {
        protected override void Ve(Graphics g)
        {
            var vo = new RectangleF(0, 0, S(140), S(236));
            using (var p = Clay.Bo(vo, Clay.S(26))) using (var b = new SolidBrush(Clay.Chu)) g.FillPath(b, p);
            var man = new RectangleF(S(6), S(6), S(128), S(224));
            using (var p = Clay.Bo(man, Clay.S(21)))
            using (var b = new LinearGradientBrush(man, Clay.NenSang, Clay.Nen, 90f)) g.FillPath(b, p);
            using (var p = Clay.Bo(new RectangleF(S(52), S(13), S(36), S(8)), Clay.S(4))) using (var b = new SolidBrush(Clay.Chu)) g.FillPath(b, p);
            if (Anh3D.Rob("cho") is { } rob)
            {
                var k = S(60) / (float)Math.Max(rob.Width, rob.Height);
                g.DrawImage(rob, S(70) - rob.Width * k / 2, S(32), rob.Width * k, rob.Height * k);
            }
            var o = new Rectangle(S(6), 0, S(128), 0);
            void Giua(string t, int y, int h, float pt, FontStyle st, Color c) =>
                TextRenderer.DrawText(g, t, PhongChu.Tao(pt, st), new Rectangle(o.X, y, o.Width, h), c, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            Giua("Mã ghép máy", S(104), S(16), 8.25f, FontStyle.Bold, Clay.Chu2);
            Giua("• • •  • • •", S(122), S(28), 15f, FontStyle.Bold, Clay.Chu);   // minh hoạ — mã thật nằm trên điện thoại của Ba Mẹ
            var chip = new RectangleF(S(20), S(162), S(100), S(24));
            using (var p = Clay.Bo(chip, Clay.S(12))) using (var b = new SolidBrush(Clay.Chu)) g.FillPath(b, p);   // Bàn E: navy, chữ vàng kim
            TextRenderer.DrawText(g, "Dùng được 10 phút", PhongChu.Tao(7.75f, FontStyle.Bold), Rectangle.Round(chip), Clay.Kim,
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
                using (var b = new SolidBrush(Clay.Chu)) g.FillEllipse(b, r);   // Bàn E: navy + dấu tick vàng kim
                using var pen = new Pen(Clay.Kim, Clay.S(2.5f)) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round };
                g.DrawLines(pen, new[] { new PointF(r.X + r.Width * .27f, r.Y + r.Height * .52f), new PointF(r.X + r.Width * .44f, r.Y + r.Height * .68f), new PointF(r.X + r.Width * .74f, r.Y + r.Height * .35f) });
            }
            else if (_tt == 1)
            {
                using var pen = new Pen(Clay.KimVien, Clay.S(2.5f));   // đang làm: vành vàng kim
                g.DrawEllipse(pen, RectangleF.Inflate(r, -Clay.S(1.25f), -Clay.S(1.25f)));
            }
            else Clay.KhoiLom(g, r, r.Width / 2f, Clay.Lom);   // chưa tới: viên lõm kem
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
            Clay.ToKim(g, pf, f);   // vàng kim 135° trên rãnh lõm (thay teal→navy cũ)
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
            Font = PhongChu.Tao(pt, dam ? FontStyle.Bold : st), Location = ToaDo(cha, x, y),
            MaximumSize = new Size(rong > 0 ? S(rong) : S(700 - x), 0),
        };
        cha.Controls.Add(l);
        return l;
    }

    /// <summary>Chữ trong hộp cao <paramref name="cao"/> (toạ độ thiết kế), căn giữa dọc như CSS flex — chữ dài xuống 2 dòng thì lên cao hơn.</summary>
    private Label XGiua(Control cha, int x, int y, int cao, string text, Kieu k, int rong)
    {
        var l = X(cha, x, y, text, k, rong);
        // đo một lần bằng TextRenderer (cùng bộ vẽ với Label, giới hạn rộng như MaximumSize), tính bằng pixel so với S(cao) — không chia S(1) làm tròn nên không lệch ở DPI lẻ.
        // Form chạy SystemAware (csproj) ⇒ DPI cố định từ lúc mở, không cần tự cập nhật khi đổi DPI giữa chừng.
        var h = TextRenderer.MeasureText(text, l.Font, new Size(S(rong), int.MaxValue), TextFormatFlags.WordBreak | TextFormatFlags.NoPrefix).Height;
        var p = ToaDo(cha, x, y);
        l.Location = new Point(p.X, p.Y + Math.Max(0, (S(cao) - h) / 2));
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
            BoGoc = Clay.S(28), BackColor = nen ?? Clay.The, Tag = new Point(x, y),
            Location = new Point(p.X - lb.Left, p.Y - lb.Top), Size = new Size(S(w) + lb.Horizontal, S(h) + lb.Vertical),
        };
        if (chon)
            c.Paint += (_, e) =>
            {
                Clay.ChatLuong(e.Graphics);
                var r = new RectangleF(lb.Left + Clay.S(1f), lb.Top + Clay.S(1f), S(w) - Clay.S(2f), S(h) - Clay.S(2f));
                using var path = Clay.Bo(r, Clay.S(27));
                using var pen = new Pen(Clay.KimVien, Clay.S(2f));   // Bàn E: viền vàng kim 2px
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
    private static readonly Dictionary<string, Image?> _net = new();
    /// <summary>Icon nét navy (Bàn E #426, bộ Phosphor tay vẽ theo HTML thiết kế), nhúng «iconnet.&lt;tên&gt;.png». Thiếu ⇒ null.</summary>
    internal static Image? Net(string ten)
    {
        lock (_net)
        {
            if (_net.TryGetValue(ten, out var c)) return c;
            Image? img = null;
            try
            {
                using var st = typeof(SetupForm).Assembly.GetManifestResourceStream("iconnet." + ten + ".png");
                if (st != null) { using var raw = Image.FromStream(st); img = new Bitmap(raw); }
            }
            catch { }
            return _net[ten] = img;
        }
    }

    private static ClayIcon Vien(Control cha, int x, int y, string icon, int co = 56, string? mau = null)
    {
        // ClayIcon vẽ viên tròn đường kính (cạnh − 12px) ⇒ control rộng hơn viên 12px, lệch −6/−4 cho khớp vị trí thiết kế.
        var v = new ClayIcon
        {
            Size = new Size(S(co + 12), S(co + 12)), Hinh = Net(icon) ?? Anh3D.Icon(icon),
            MauVien = Clay.The,   // Bàn E: mọi viên icon là kem nổi, icon nét navy (không còn viên ngọc / cam)
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
            Text = text, Size = new Size(S(w) + lb.Horizontal, S(48) + lb.Vertical), Font = PhongChu.Tao(12f, FontStyle.Bold),
            BackColor = chinh ? Chinh : Clay.The, ForeColor = Chu, LaChinh = chinh,   // chính: thân vàng kim, chữ navy
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
    // bàn: «‹ Quay lại» (mũi tên trái trước chữ); «Để sau» không có mũi tên
    private ClayButton NutLui(Action bam, string text = "Quay lại")
    {
        var b = NutChan(text, 36, 132, false, bam);
        if (text == "Quay lại") b.Image = ChevronTrai();   // bàn: icon mũi tên mảnh trước chữ, không dùng ký tự ‹
        return b;
    }

    private static Image? _chevron;
    /// <summary>Mũi tên trái mảnh (bàn: phosphor caret-left, nét bo tròn) — vẽ bằng GDI+ màu chữ.</summary>
    private static Image ChevronTrai()
    {
        if (_chevron != null) return _chevron;
        const int n = 96;
        var bm = new Bitmap(n, n);
        using (var g = Graphics.FromImage(bm))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using var pen = new Pen(Chu, n * 0.082f) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round };
            g.DrawLines(pen, new[] { new PointF(n * 0.62f, n * 0.2f), new PointF(n * 0.34f, n * 0.5f), new PointF(n * 0.62f, n * 0.8f) });
        }
        return _chevron = bm;
    }

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
        Vien(_body, 282, 232, "lich", mau: "ngoc"); X(_body, 354, 238, "Ba Mẹ đặt luật chơi bằng sao", Kieu.B); X(_body, 354, 262, "ngay trên điện thoại", Kieu.S);
        Vien(_body, 282, 306, "sao", mau: "ngoc"); X(_body, 354, 312, "Làm việc tốt, nhận sao", Kieu.B); X(_body, 354, 336, "1 sao = 1 phút chơi", Kieu.S);
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
        ChipTai(co, 56, 146, "AiiGrow có", KieuChip.Navy, "tick_kim");
        foreach (var (y, icon, chu) in new[] { (196, "dong_ho_cat", "Đếm phút con dùng app, web"), (260, "khoa", "Chỉ mở app, web Ba Mẹ cho phép"), (324, "chuong", "Báo khi con xin app mới") })
        { Vien(co, 56, y, icon, 44, "ngoc"); XGiua(co, 112, y, 44, chu, Kieu.B, 226); }
        var khong = The(372, 128, 315, 262);
        ChipTai(khong, 392, 146, "AiiGrow không", KieuChip.Khong);
        foreach (var (y, icon, chu) in new[] { (196, "camera", "Không chụp màn hình"), (260, "tin", "Không đọc tin nhắn"), (324, "x", "Không ghi phím con gõ") })
        { Vien(khong, 392, y, icon, 44, "cam"); XGiua(khong, 448, y, 44, chu, Kieu.B, 226); }
        X(_body, 38, 410, "Gỡ AiiGrow lúc nào cũng được, cần mật khẩu máy của Ba Mẹ.", Kieu.P);
        // bàn: ô vuông bo 8 nền ngọc có dấu tick trắng + chữ đậm bên phải
        var cb = new OTichDongY { Text = "Tôi là người lớn trong nhà và đồng ý cài AiiGrow", Checked = _dongY, Location = ToaDo(_body, 36, 460) };
        _body.Controls.Add(cb);
        NutLui(BuocChao);
        var tiep = NutChinh("Đồng ý, chọn tài khoản", 260, BuocTaiKhoan);
        tiep.Enabled = _dongY;
        cb.CheckedChanged += (_, _) => { _dongY = cb.Checked; tiep.Enabled = cb.Checked; };
    }

    private Chip ChipTai(Control cha, int x, int y, string chu, KieuChip kieu, string? icon = null)
    {
        var c = new Chip { Chu = chu, Kieu = kieu, Hinh = icon == null ? null : Net(icon), Height = S(32), Location = ToaDo(cha, x, y) };
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
        X(_body, 36, 72, "Các con mở máy bằng tài khoản nào?", Kieu.H);
        X(_body, 38, 112, "Đang đọc các tài khoản trên máy…", Kieu.P);
        try { _accounts = await Task.Run(Accounts.List); }
        catch (Exception e)
        {
            Man(3, "Tài khoản");
            X(_body, 36, 72, "Các con mở máy bằng tài khoản nào?", Kieu.H);
            Program.WriteLog("Đọc tài khoản lỗi: " + CauLoiCai.Log(e));
            X(_body, 38, 112, CauLoiCai.Tu(e, CauLoiCai.DocTaiKhoan), Kieu.P, 650, Loi);   // #689
            NutLui(BuocDieuKhoan);
            NutChinh("Thử lại", 160, BuocTaiKhoan);
            return;
        }
        var toi = SidDangDung();
        // Gợi ý: máy đã có tài khoản giới hạn (không phải tài khoản đang dùng) ⇒ chắc là của con; không thì tạo mới.
        var coSan = _accounts.FirstOrDefault(a => !a.IsAdmin && a.Sid != toi);
        HienTaiKhoan(coSan != null ? 1 : 2);
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
        X(_body, 36, 72, "Các con mở máy bằng tài khoản nào?", Kieu.H);
        // 06/11 (L13 — con-cai-win 03): MỘT tài khoản Windows giới hạn dùng chung, AiiGrow nhận từng bé bằng tên + PIN
        X(_body, 38, 112, "Các con dùng chung 1 tài khoản trên máy này. Mỗi bé chọn tên của mình khi mở máy.", Kieu.P);
        // Tài khoản đang dùng (người cài — Ba Mẹ) lên cuối, mờ, không chọn được.
        var ds = _accounts.OrderBy(a => a.Sid == toi).ThenBy(a => a.IsAdmin).ToList();
        var cao = 96 + Math.Max(1, ds.Count) * 52 + 14;
        var the = The(36, 152, 651, cao, chon: true);
        Vien(the, 56, 170, "nguoi", mau: "ngoc");
        X(the, 128, 176, "Các con đã có tài khoản chung", Kieu.B);
        X(the, 128, 200, "Không cần mỗi bé một tài khoản Windows", Kieu.S);
        // #854: tài khoản mang tên cấm («con») chỉ vào được hồ sơ tạm ⇒ không chọn được, không chọn sẵn
        if (_child != null && (_child.Sid == toi || ds.All(a => a.Sid != _child.Sid) || TenThietBi.LaTenCam(_child.Name))) _child = null;
        if (_child == null) _child = ds.FirstOrDefault(a => !a.IsAdmin && a.Sid != toi && !TenThietBi.LaTenCam(a.Name));   // #777 B5: chọn sẵn tài khoản có sẵn của con
        ClayButton? tiep = null;
        var hang = new List<(ClayCard The, LocalAccount Tk, Label Ten, Label Phu)>();
        void VeChon()
        {
            foreach (var (h, a, ten, phu) in hang)
            {
                // Bàn E (#426): hàng đang chọn = viên navy, tên vàng kim, mô tả kem; chưa chọn = rãnh lõm kem
                var chon = _child?.Sid == a.Sid;
                h.Lom = !chon;
                h.BackColor = chon ? Clay.Chu : Clay.Lom;
                ten.ForeColor = chon ? Clay.Kim : Chu;
                phu.ForeColor = chon ? Clay.NenSang : Clay.Chu3;
                h.VeLaiNen();
            }
            if (tiep != null)
            {
                tiep.Enabled = _child != null;
                tiep.Text = _child != null ? "Dùng tài khoản " + _child.Name : "Chọn tài khoản chung";
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
                if (chon)
                {
                    using var pen = new Pen(Clay.Kim, Clay.S(2));
                    e.Graphics.DrawEllipse(pen, RectangleF.Inflate(r, -Clay.S(1), -Clay.S(1)));
                    using var b = new SolidBrush(Clay.Kim);
                    e.Graphics.FillEllipse(b, RectangleF.Inflate(r, -Clay.S(5), -Clay.S(5)));
                }
                else Clay.KhoiLom(e.Graphics, r, r.Width / 2f, Clay.Lom);
            };
            h.Controls.Add(cham);
            var cam = !la && TenThietBi.LaTenCam(a.Name);
            var ten = X(h, 102, y + 10, a.Name, Kieu.B, 0, la || cam ? Clay.Chu3 : Chu);
            var phu = la ? "bạn đang dùng · toàn quyền, không chọn cho con"
                : cam ? "tên hệ thống giữ riêng · chỉ vào hồ sơ tạm, hãy tạo tài khoản mới"
                : a.IsAdmin ? "tài khoản Ba Mẹ · sẽ chuyển thành tài khoản cho con" : "sẽ là tài khoản chung của các con";
            var lbPhu = X(h, 102 + (int)Math.Ceiling(ten.PreferredWidth / Clay.Scale) + 14, y + 11, phu, Kieu.S, 0, Clay.Chu3);
            if (!la && !cam)
            {
                BamDuoc(h, () => { _child = a; VeChon(); foreach (var (hh, _, _, _) in hang) hh.Invalidate(true); });
                hang.Add((h, a, ten, lbPhu));
            }
        }
        var yTao = 152 + cao + 20;
        var tao = The(36, yTao, 651, 90, bam: () => TaoMoi());
        Vien(tao, 56, yTao + 17, "cong");
        X(tao, 128, yTao + 23, "Chưa có, tạo 1 tài khoản chung cho các con", Kieu.B);
        X(tao, 128, yTao + 47, "Không chắc thì chọn cái này, an toàn nhất", Kieu.S);
        NutLui(BuocDieuKhoan);
        tiep = NutChinh("Chọn tài khoản chung", 250, () => { if (_child != null) KiemTaiKhoan(_child); });
        VeChon();
    }

    private void TaoMoi()
    {
        Man(3, "Tài khoản");
        X(_body, 36, 72, "Các con mở máy bằng tài khoản nào?", Kieu.H);
        var co = The(36, 122, 651, 72, bam: () => ChonCoSan());
        Vien(co, 56, 136, "nguoi", 44);
        X(co, 116, 147, "Các con đã có tài khoản chung", Kieu.B);
        var the = The(36, 212, 651, 300, chon: true);
        Vien(the, 56, 230, "cong", mau: "ngoc");
        // 06/11 (L13 — con-cai-win 04): 1 tài khoản chung «con», không mật khẩu Windows (các bé vào bằng tên + PIN của AiiGrow)
        X(the, 128, 236, "Tạo 1 tài khoản chung cho các con", Kieu.B);
        X(the, 128, 260, "Tài khoản của Ba Mẹ giữ nguyên · mỗi bé chọn tên của mình khi mở máy", Kieu.S);
        X(the, 58, 304, "Tên đăng nhập", Kieu.S, 0, Chu2, dam: true);
        X(the, 372, 304, "Đăng nhập Windows", Kieu.S, 0, Chu2, dam: true);
        var ten = new TextBox { Font = PhongChu.Tao(12.75f), MaxLength = 20, Text = TenTaiKhoanChung() };
        {
            var vo = ONhapClay.Boc(ten, S(296));
            var p = ToaDo(the, 56, 326);
            vo.Location = new Point(p.X - VeThe.LeBong.Left, p.Y - VeThe.LeBong.Top);
            the.Controls.Add(vo);
            // bàn: «Đăng nhập Windows» là chip trắng có dấu tick xanh «Tự vào, không mật khẩu» (không phải ô nhập)
            the.Controls.Add(new ChipTuVao { Size = new Size(S(297), S(50)), Location = ToaDo(the, 370, 326) });
        }
        var goiY = X(the, 58, 388, "Mở máy là vào thẳng tài khoản Con · không hỏi mật khẩu Windows.", Kieu.S, 600);
        // Dải cam: máy chỉ có một tài khoản (toàn quyền) và đang là của các con ⇒ màn giải thích.
        var dai = The(56, 426, 611, 64, nen: Clay.Lom, bam: () => ManChiMotAdmin(), cha: the);
        dai.BoGoc = Clay.S(20);
        dai.Lom = true;   // Bàn E: dải lõm kem, chữ nâu đỏ
        Vien(dai, 66, 436, "canh_bao", 44, "cam");
        X(dai, 124, 447, "Máy chỉ có 1 tài khoản, đang là của các con? ›", Kieu.B, 0, Color.FromArgb(0xA2, 0x41, 0x2C));
        NutLui(() => ChonCoSan());
        ClayButton? tiep = null;
        void DoiNhan() { if (tiep != null) tiep.Text = Accounts.IsValidName(ten.Text.Trim()) ? "Tạo tài khoản " + TenHien(ten.Text.Trim()) : "Tạo tài khoản"; }
        tiep = NutChinh("Tạo tài khoản", 250, async () =>
        {
            var n = ten.Text.Trim();
            void Loi_(string c) { goiY.Text = c; goiY.ForeColor = Loi; goiY.Font = PhongChu.Tao(10f, FontStyle.Bold); }
            if (Accounts.LaTenThietBi(n)) { Loi_(CauLoiCai.TenCam(n)); return; }
            if (!Accounts.IsValidName(n)) { Loi_("Tên chỉ gồm chữ không dấu, số, dấu . _ - (tối đa 20 ký tự). Ví dụ: treem"); return; }
            if (_accounts.Any(a => a.Name.Equals(n, StringComparison.OrdinalIgnoreCase))) { Loi_($"Máy đã có tài khoản «{n}». Đặt tên khác, hoặc chọn «Các con đã có tài khoản chung»."); return; }
            tiep!.Enabled = false;
            try
            {
                var pw = "";   // không mật khẩu Windows: các bé chọn tên + PIN trên màn khoá AiiGrow
                var sid = await Task.Run(() => Accounts.CreateStandard(n, pw));
                _child = new LocalAccount(n, sid, false);
                BuocGhep();
            }
            catch (Exception e) { Program.WriteLog("Tạo tài khoản lỗi: " + CauLoiCai.Log(e)); Loi_(CauLoiCai.Tu(e, CauLoiCai.TaoTaiKhoan)); tiep.Enabled = true; }
        });
        ten.TextChanged += (_, _) => DoiNhan();
        DoiNhan();
        ten.Focus();
    }

    /// <summary>Chọn tài khoản toàn quyền cho con: máy còn tài khoản toàn quyền khác ⇒ hỏi lại rồi đi tiếp; không còn ⇒ màn «Máy cần thêm tài khoản cho Ba Mẹ».</summary>
    private void KiemTaiKhoan(LocalAccount con)
    {
        if (!con.IsAdmin) { BuocGhep(); return; }
        var khac = _accounts.Count(a => a.IsAdmin && a.Sid != con.Sid);
        if (khac > 0)
        {
            if (HopThoai.Hien($"Đổi «{con.Name}» thành tài khoản giới hạn? Con vẫn mở máy, học, chơi như cũ — chỉ không tự gỡ AiiGrow được (gỡ cần Ba Mẹ).",
                    "Cài AiiGrow", hoi: true) == DialogResult.Yes)
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
        X(the, 344, 292, "Tạo 1 tài khoản chung mới cho các con.", Kieu.S, 330);
        X(the, 344, 310, $"«{ten}» giữ làm tài khoản của Ba Mẹ.", Kieu.S, 330);
        X(_body, 254, 384, $"Muốn giữ «{ten}» cho con: tạo trước 1 tài khoản toàn quyền cho Ba Mẹ trong Cài đặt Windows › Tài khoản, rồi chạy lại bộ cài.", Kieu.S, 430);
        NutLui(() => ChonCoSan());
        NutChinh("Tạo tài khoản chung cho các con", 300, TaoMoi);
    }

    // ================================================================ 4. Ghép máy

    /// <summary>Ô mã 6 ô số (lòng chảo 52×64): gõ / dán «482 017» tự dàn đủ 6 ô; Backspace ở ô trống lùi về ô trước.</summary>
    private sealed class OMa6 : Panel
    {
        private readonly TextBox[] _o = new TextBox[6];
        private readonly ClayCard[] _vo = new ClayCard[6];
        private bool _sai;
        private bool _dang;
        public event Action? Doi;
        public OMa6()
        {
            BackColor = Color.Transparent;
            var lb = VeThe.LeBong;
            for (int i = 0; i < 6; i++)
            {
                var o = new TextBox { Font = PhongChu.Tao(21f, FontStyle.Bold), TextAlign = HorizontalAlignment.Center, MaxLength = 7 };
                var vo = ONhapClay.Boc(o, S(52));
                // Boc ép TextBox rộng ≥ Si(40) trong khi thân ô chỉ S(52) − 2×14 ⇒ ô chữ (nền lòng chảo) thò qua mép phải thân (#426): thu lại cho nằm trọn, căn giữa
                o.Width = S(52) - 2 * S(8);
                o.Left = lb.Left + (S(52) - o.Width) / 2;
                vo.Location = new Point(S(i * 60), 0);
                Controls.Add(vo);
                _o[i] = o; _vo[i] = vo;
                vo.Paint += (_, e) =>
                {
                    if (!_sai) return;
                    Clay.ChatLuong(e.Graphics);   // Bàn E: mã sai ⇒ viền đỏ 2px quanh từng ô
                    using var path = Clay.Bo(new RectangleF(lb.Left + Clay.S(1f), lb.Top + Clay.S(1f), vo.Width - lb.Horizontal - Clay.S(2f), vo.Height - lb.Vertical - Clay.S(2f)), Clay.S(15));
                    using var pen = new Pen(Clay.Loi, Clay.S(2f));
                    e.Graphics.DrawPath(pen, path);
                };
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
        public bool Sai { set { _sai = value; foreach (var o in _o) o.ForeColor = Clay.Chu; foreach (var v in _vo) v.Invalidate(true); } }
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
        var b = X(dt, 36, 420, "AiiGrow › Cả nhà › Ghép thêm máy", Kieu.S);
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
            ChipTai(_body, 316, 236, "Ghép vào nhà trong app Ba Mẹ", KieuChip.Lom, "tick");
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
        var chip = ChipTai(_body, 316, 262, "Mã dùng được 10 phút", KieuChip.Lom, "dong_ho_cat");
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
            BuocCai(new InstallOptions { Server = _goi?.Server ?? _server, Code = o.Ma, Child = child });   // mở từ link Ba Mẹ gửi ⇒ mã 6 số thuộc đúng máy chủ trong gói
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
        Vien(_body, 312, 256, "canh_bao_do", 24).MauVien = Color.Transparent;
        X(_body, 346, 264, "Mã chưa đúng. Xem lại 6 số nhé.", Kieu.B, 340, Loi);
        X(_body, 318, 310, "So từng số với mã trên điện thoại Ba Mẹ.", Kieu.P, 370);
        var the = The(316, 372, 371, 94);
        Vien(the, 334, 397, "dong_ho_cat", 44, "ngoc");
        X(the, 392, 394, "Xin Ba Mẹ mã mới trên điện thoại", Kieu.B, 280);
        X(the, 392, 420, "AiiGrow › Cả nhà › Ghép thêm máy", Kieu.S, 280);
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
        var chan = new Label { AutoSize = true, Text = "Cài xong, AiiGrow tự sang bước cuối.", Font = PhongChu.Tao(11.25f), ForeColor = Chu2, Location = new Point(S(36), S(27)), BackColor = Color.Transparent };
        _chan.Controls.Add(chan);
        void Buoc(int i)
        {
            dau[i].TrangThai = 2;
            dong[i].ForeColor = Chu; dong[i].Font = PhongChu.Tao(11.25f);
            if (i == 0) dong[0].Text = "Đã ghép vào nhà" + (string.IsNullOrWhiteSpace(o.Pair?.ChildName) ? "" : " · hồ sơ " + o.Pair!.ChildName);
            if (i == 2) dong[2].Text = "Đã cài AiiGrow";
            if (i + 1 < 4) { dau[i + 1].TrangThai = 1; dong[i + 1].ForeColor = Clay.NgocInk; dong[i + 1].Font = PhongChu.Tao(11.25f, FontStyle.Bold); }
            thanh.PhanTram = (i + 1) / 4f;
        }
        _dangCai = true;
        try
        {
            await Installer.RunAsync(o, (i, _) => BeginInvoke(() => { if (!IsDisposed) Buoc(i); }));
            _dangCai = false;
            if (IsDisposed) return;
            var tenHoSo = o.Pair?.ChildName;
            var mayRieng = o.Pair is { DungChung: false } && !string.IsNullOrWhiteSpace(o.Pair.ChildName);
            // #862: sau ghép + cài — tài khoản quản trị nào còn trống mật khẩu ⇒ màn đặt mật khẩu trước màn Xong
            await KiemQuanTriTrong(child, () => BuocXong(child, tenHoSo, mayRieng));
        }
        catch (Exception e)
        {
            _dangCai = false;
            if (IsDisposed) return;
            Program.WriteLog("Cài lỗi: " + CauLoiCai.Log(e));
            switch (LoiGhep.Phan(e, daGhep: o.Pair != null))
            {
                case LoaiLoiGhep.MaSai when o.Package == null: ManMaSai(o); break;
                case LoaiLoiGhep.MaSai:
                case LoaiLoiGhep.HetHan: ManHetHan(o); break;
                case LoaiLoiGhep.MatMang: ManMatMang(o); break;
                default: ManLoiKhac(o, CauLoiCai.Tu(e)); break;   // #689: không in chữ .NET / đường dẫn
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
            ? "Link Ba Mẹ gửi đã hết hạn hoặc đã dùng. Trên điện thoại Ba Mẹ, vào Cả nhà › Ghép thêm máy để lấy mã mới rồi gõ ở đây."
            : $"Mã {LoiGhep.Hien(o.Code)} chỉ dùng được 10 phút. Trên điện thoại Ba Mẹ, vào Cả nhà › Ghép thêm máy để lấy mã mới rồi gõ lại.", Kieu.P, 417);
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

    // ================================================================ 5b. Mật khẩu tài khoản quản trị (#862)

    /// <summary>Dò tài khoản quản trị cục bộ còn trống mật khẩu (trừ tài khoản của bé). Có ⇒ màn đặt mật khẩu; không có / dò lỗi ⇒ đi tiếp <paramref name="sau"/>.</summary>
    private async Task KiemQuanTriTrong(LocalAccount child, Action sau)
    {
        List<TaiKhoanQuanTri> ds;
        try { ds = await Task.Run(() => DatMatKhauQuanTri.CanDat(QuanTriTrongMay.DocMay(), child.Name, QuanTriTrongMay.KiemTrong)); }
        catch (Exception e) { Program.WriteLog("Dò tài khoản quản trị trống mật khẩu lỗi: " + CauLoiCai.Log(e)); ds = new(); }
        if (IsDisposed) return;
        if (ds.Count == 0) { sau(); return; }
        Program.WriteLog($"Tài khoản quản trị chưa có mật khẩu: {ds.Count}");
        ManMatKhauQuanTri(ds, sau, true, new List<string>(), null);
    }

    /// <summary>«Đặt mật khẩu cho tài khoản quản trị»: hai ô gõ (hiện/ẩn, độ mạnh), đặt chung một mật khẩu hoặc từng tài khoản, hoặc «Tự đặt sau».
    /// <paramref name="ds"/> = tài khoản còn trống; <paramref name="daDat"/> = tên đã đặt xong ở lượt trước; <paramref name="bao"/> = câu lỗi lượt trước.</summary>
    private void ManMatKhauQuanTri(List<TaiKhoanQuanTri> ds, Action sau, bool dungChung, List<string> daDat, string? bao)
    {
        Man(5, "Bảo vệ máy");
        var nhieu = ds.Count > 1;
        var dat = dungChung || !nhieu ? ds : ds.Take(1).ToList();
        X(_body, 36, 72, "Đặt mật khẩu cho tài khoản quản trị", Kieu.H);
        X(_body, 36, 116, "Tài khoản quản trị chưa có mật khẩu thì bé tự vào được tài khoản đó và gỡ được AiiGrow.", Kieu.P, 651);
        var theTk = The(36, 164, 651, 72);
        Vien(theTk, 56, 178, "khoa", 44, "cam");
        X(theTk, 116, 176, !nhieu ? "Tài khoản cần đặt mật khẩu"
            : dungChung ? $"Đặt chung một mật khẩu cho {ds.Count} tài khoản"
            : $"Đang đặt cho «{DatMatKhauQuanTri.TenHien(ds[0])}» · còn {ds.Count - 1} tài khoản sau", Kieu.B, 550);
        X(theTk, 116, 200, string.Join(" · ", ds.Select(DatMatKhauQuanTri.TenHien)), Kieu.S, 550);
        var y0 = 260;
        if (nhieu)
        {
            var cb = new OTichDongY { Text = $"Dùng chung một mật khẩu cho cả {ds.Count} tài khoản", Checked = dungChung, Location = ToaDo(_body, 36, 252) };
            _body.Controls.Add(cb);
            // vẽ lại màn sau khi sự kiện của ô tích chạy xong (không huỷ control đang xử lý chính sự kiện của nó)
            cb.CheckedChanged += (_, _) => BeginInvoke(() => { if (!IsDisposed) ManMatKhauQuanTri(ds, sau, cb.Checked, daDat, null); });
            y0 = 296;
        }
        var the = The(36, y0, 651, 220);
        X(the, 58, y0 + 18, "Mật khẩu mới", Kieu.S, 0, Chu2, dam: true);
        X(the, 372, y0 + 18, "Gõ lại lần nữa", Kieu.S, 0, Chu2, dam: true);
        TextBox O(int x)
        {
            var o = new TextBox { Font = PhongChu.Tao(12.75f), UseSystemPasswordChar = true, MaxLength = DatMatKhauQuanTri.DaiToiDa };
            var vo = ONhapClay.Boc(o, S(296));
            var p = ToaDo(the, x, y0 + 40);
            vo.Location = new Point(p.X - VeThe.LeBong.Left, p.Y - VeThe.LeBong.Top);
            the.Controls.Add(vo);
            return o;
        }
        var mk = O(56);
        var lai = O(370);
        Label? hien = null;
        hien = Lien(the, 58, y0 + 106, "Hiện mật khẩu", () =>
        {
            var an = !mk.UseSystemPasswordChar;
            mk.UseSystemPasswordChar = lai.UseSystemPasswordChar = an;
            hien!.Text = an ? "Hiện mật khẩu" : "Ẩn mật khẩu";
        }, Clay.NgocInk);
        var manh = X(the, 372, y0 + 106, "", Kieu.S, 300, dam: true);
        X(the, 58, y0 + 136, "AiiGrow không lưu và không gửi mật khẩu này lên máy chủ. Ba Mẹ nhớ kỹ hoặc ghi lại ở chỗ an toàn nhé.", Kieu.S, 600);
        var trangThai = X(the, 58, y0 + 180, "", Kieu.S, 600, dam: true);
        void Bao(string c, Color mau) { trangThai.Text = c; trangThai.ForeColor = mau; }
        if (bao != null) Bao(bao, Loi);
        else if (daDat.Count > 0) Bao("Đã đặt mật khẩu cho " + string.Join(", ", daDat.Select(t => $"«{t}»")) + ".", Clay.NgocInk);
        void DoiManh()
        {
            var d = DatMatKhauQuanTri.DoManh(mk.Text);
            manh.Text = d == DoManhMatKhau.Trong ? "" : "Độ mạnh: " + DatMatKhauQuanTri.ChuDoManh(d);
            manh.ForeColor = d switch { DoManhMatKhau.Yeu => Loi, DoManhMatKhau.Vua => Clay.Canh, _ => Clay.NgocInk };
        }
        mk.TextChanged += (_, _) => DoiManh();
        var tuDat = NutChan("Tự đặt sau", 36, 160, false, () => ManTuDatSau(ds, sau, daDat));
        ClayButton? nut = null;
        nut = NutChinh(dat.Count > 1 ? "Đặt mật khẩu cho cả " + dat.Count : "Đặt mật khẩu", 260, async () =>
        {
            if (DatMatKhauQuanTri.Loi(mk.Text, lai.Text) is { } loi) { Bao(loi, Loi); return; }
            nut!.Enabled = tuDat.Enabled = false;
            Bao("Đang đặt mật khẩu…", Chu2);
            var pw = mk.Text;
            // mật khẩu chỉ ở trong bộ nhớ: không ghi log, xoá khỏi ô ngay khi đã lấy
            mk.Text = lai.Text = "";
            var kq = await Task.Run(() => dat.Select(t => (t, rc: MatKhauQuanTri.Dat(t.Ten, pw))).ToList());
            pw = "";
            foreach (var (t, rc) in kq) Program.WriteLog($"Đặt mật khẩu tài khoản quản trị «{t.Ten}»: {(rc == 0 ? "xong" : "lỗi " + rc)}");
            if (IsDisposed) return;
            var moi = daDat.Concat(kq.Where(x => x.rc == 0).Select(x => DatMatKhauQuanTri.TenHien(x.t))).ToList();
            var conLai = ds.Where(t => !kq.Any(x => x.rc == 0 && ReferenceEquals(x.t, t))).ToList();
            if (conLai.Count == 0) { ManDaDatMatKhau(moi, sau); return; }
            var hong = kq.Where(x => x.rc != 0).Select(x => DatMatKhauQuanTri.CauLoiDat(DatMatKhauQuanTri.TenHien(x.t), x.rc)).ToList();
            ManMatKhauQuanTri(conLai, sau, dungChung, moi, hong.Count > 0 ? string.Join("\n", hong) : null);
        });
        mk.Focus();
    }

    /// <summary>Đã đặt xong mật khẩu cho mọi tài khoản quản trị trống.</summary>
    private void ManDaDatMatKhau(List<string> daDat, Action sau)
    {
        Man(5, "Bảo vệ máy");
        Rob("xong", 24, 96, 220, 290);
        X(_body, 270, 90, "Đã đặt mật khẩu", Kieu.H);
        X(_body, 270, 134, "Từ giờ vào " + string.Join(", ", daDat.Select(t => $"«{t}»")) + " phải gõ mật khẩu Ba Mẹ vừa đặt. Bé không tự vào hay gỡ AiiGrow được nữa.", Kieu.P, 417);
        var the = The(270, 236, 417, 96);
        Vien(the, 290, 256, "khoa", mau: "ngoc");
        X(the, 362, 262, "Nhớ mật khẩu này nhé", Kieu.B, 310);
        X(the, 362, 286, "AiiGrow không lưu, không lấy lại được", Kieu.S, 310);
        NutChinh("Tiếp tục", 200, sau);
    }

    /// <summary>«Tự đặt sau»: hướng dẫn từng bước trong Cài đặt Windows rồi đi tiếp cài đặt.</summary>
    private void ManTuDatSau(List<TaiKhoanQuanTri> ds, Action sau, List<string> daDat)
    {
        Man(5, "Bảo vệ máy");
        X(_body, 36, 72, "Ba Mẹ tự đặt mật khẩu sau", Kieu.H);
        X(_body, 36, 116, "Đăng nhập lần lượt từng tài khoản dưới đây rồi làm theo 4 bước:", Kieu.P, 651);
        X(_body, 36, 144, string.Join(" · ", ds.Select(DatMatKhauQuanTri.TenHien)), Kieu.B, 651);
        var the = The(36, 190, 651, 260);
        foreach (var (i, chu) in new[]
                 {
                     (0, "Bấm Start › Cài đặt (Settings)"),
                     (1, "Tài khoản (Accounts) › Tùy chọn đăng nhập (Sign-in options)"),
                     (2, "Mật khẩu (Password) › Thêm (Add)"),
                     (3, "Gõ mật khẩu mới 2 lần › Tiếp (Next) › Xong (Finish)"),
                 })
        {
            var y = 208 + i * 58;
            var so = XGiua(the, 58, y, 40, (i + 1).ToString(), Kieu.B, 30);
            so.ForeColor = Clay.NgocInk;
            XGiua(the, 96, y, 40, chu, Kieu.B, 570);
        }
        X(_body, 38, 470, "Chưa đặt thì bé vẫn có thể vào các tài khoản này và gỡ AiiGrow.", Kieu.S, 650, Loi, dam: true);
        NutLui(() => ManMatKhauQuanTri(ds, sau, true, daDat, null));
        NutChinh("Tiếp tục cài", 220, sau);
    }

    private void BuocXong(LocalAccount child, string? tenHoSo = null, bool mayRieng = false)
    {
        // 06/11 (L13 — con-cai-win 12): máy dùng chung cho cả nhà — cài xong máy chuyển sang tài khoản Con và khoá lại, các bé chọn tên + PIN
        Man(6, "Xong", daiNgoc: true);
        MoKhaySauCai();   // #777 B11: cài xong app tự mở
        var ten = string.IsNullOrWhiteSpace(tenHoSo) ? "con" : tenHoSo!;   // mayRieng chỉ khi có tên (nơi gọi đã chặn), «con» là dự phòng không để null lọt vào chuỗi
        Rob("xong", 24, 84, 250, 330);
        var ph = new ClayIcon { Size = new Size(S(56), S(56)), MauVien = Color.Transparent, Hinh = Net("phao_hoa") ?? Anh3D.Icon("phao_hoa"), Location = ToaDo(_body, 206, 84) };
        _body.Controls.Add(ph);
        // #267: máy riêng một bé không nói «cả nhà» / «mỗi bé chọn tên + PIN»; máy cả nhà giữ nguyên
        X(_body, 290, 80, mayRieng ? "Máy của " + ten + "\nđã sẵn sàng!" : "Máy đã sẵn sàng\ncho cả nhà!", Kieu.H30, 400);
        X(_body, 290, 164, mayRieng ? "Con mở máy là vào thẳng." : "Mỗi bé vào máy bằng tên + PIN 4 số.", Kieu.P, 400);
        foreach (var (y, icon, tieu, phu) in new[]
                 {
                     (206, "lich", mayRieng ? "Sao chơi tính cho " + ten : "Phút chơi tính theo từng bé", "Điện thoại + máy tính trừ chung"),
                     (284, "nguoi", mayRieng ? "Máy riêng của con" : string.IsNullOrWhiteSpace(tenHoSo) ? "Mỗi bé một tên trên màn khoá" : tenHoSo!, mayRieng ? "Chỉ " + ten + " dùng máy này" : "PIN do Ba Mẹ đặt trong app"),
                     (362, "khoa", "Mở app, web theo danh sách Ba Mẹ", "App mới thì bấm xin Ba Mẹ"),
                 })
        {
            var the = The(290, y, 397, 68);
            Vien(the, 302, y + 6, icon, mau: "ngoc");
            X(the, 374, y + 12, tieu, Kieu.B, 300);
            X(the, 374, y + 36, phu, Kieu.S, 300);
        }
        X(_body, 36, 556, mayRieng ? $"Máy chuyển sang tài khoản {TenHien(child.Name)} và khoá lại." : $"Máy chuyển sang tài khoản {TenHien(child.Name)} và khoá lại: các con chọn tên để vào.", Kieu.S, 650);
        X(_body, 36, 500, "AiiGrow đã mở sẵn: biểu tượng nằm cạnh đồng hồ. Nếu không thấy, bấm mũi tên ^ rồi kéo biểu tượng ra để ghim.", Kieu.S, 650);
        NutLui(Close, "Để sau");
        // #70 §1: chuyển người dùng (khoá phiên), KHÔNG đăng xuất — Ba Mẹ không mất việc đang mở. Vào tài khoản Con ⇒ AiiGrow hiện «Ai đang dùng máy?».
        NutChinh(mayRieng ? "Khoá máy" : "Mở màn chọn tên", mayRieng ? 200 : 250, () => LockWorkStation());
    }

    /// <summary>#777 B11: mở khay AiiGrow ngay cho phiên đang cài (explorer.exe ⇒ chạy không nâng quyền như người dùng). Đã chạy rồi thì thôi; lỗi không chặn.</summary>
    private static void MoKhaySauCai()
    {
        try
        {
            var tray = Path.Combine(Paths.InstallDir, Paths.TrayExeName);
            if (File.Exists(tray) && System.Diagnostics.Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)).Length == 0)
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("explorer.exe", "\"" + tray + "\"") { UseShellExecute = false })?.Dispose();
        }
        catch { /* không mở được thì Ba Mẹ mở từ menu Start */ }
    }

    /// <summary>Tên gợi ý cho tài khoản chung: «treem» (đã có thì «treem2», «treem3»…). #739: KHÔNG dùng «con» — CON là tên thiết bị Windows cấm, không có C:\Users\con.</summary>
    private string TenTaiKhoanChung()
    {
        for (int i = 1; i < 50; i++)
        {
            var n = i == 1 ? "treem" : "treem" + i;
            if (!_accounts.Any(a => a.Name.Equals(n, StringComparison.OrdinalIgnoreCase))) return n;
        }
        return "treem";
    }

    /// <summary>«con» ⇒ «Con» (cách thiết kế gọi tài khoản chung).</summary>
    private static string TenHien(string n) => n.Length > 0 ? char.ToUpperInvariant(n[0]) + n[1..] : n;

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (_dangCai && e.CloseReason == CloseReason.UserClosing)
        {
            HopThoai.Hien("AiiGrow đang cài, đợi chút nhé — xong sẽ báo.", "Cài AiiGrow");
            e.Cancel = true;
            return;
        }
        base.OnFormClosing(e);
    }
}
