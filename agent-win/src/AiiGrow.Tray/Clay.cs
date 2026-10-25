using System.ComponentModel;
using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

namespace AiiGrow.ClayUi;

// Ngôn ngữ thiết kế «Clay gương» (docs/THIET-KE-CLAY.md, mẫu docs/clay/clay-a-goc-guong.css) dịch sang GDI+ cho WinForms.
// Tệp này KHÔNG phụ thuộc lớp nào của Tray ⇒ bộ cài (AiiGrow.Setup) link dùng chung (<Compile Include … Link>).
//   Chất liệu: khối bo lớn, bóng kép (bóng ngoài mềm lệch xuống + viền sáng trong ở mép trên + tối nhẹ mép dưới), men bóng:
//   nút tối/ngọc có mảng men trắng nửa trên cắt sắc ở ~26%, khối sáng có dải sáng cong sát mép trên.
//   Chuyển động «vui» + «ánh men»: nhấn = bẹp (scale .96/.92, 110ms), thả = lò xo (k 420, c 14, m 1 ≈ 420ms, vượt ~8%),
//   kèm vệt men lướt chéo 105° 420ms. Tắt hiệu ứng động của Windows (SPI_GETCLIENTAREAANIMATION) ⇒ không scale, không vệt.

/// <summary>Token màu + hàm vẽ dùng chung.</summary>
internal static class Clay
{
    private static Color H(int rgb) => Color.FromArgb(255, (rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff);

    public static readonly Color Nen = H(0xecebe7);        // nền trang
    public static readonly Color NenSang = H(0xf4f4f2);    // nền app (mau.ts)
    public static readonly Color The = H(0xf7f6f3);        // khối/thẻ
    public static readonly Color Lom = H(0xe9e8e3);        // lòng chảo ấn lõm
    public static readonly Color Chu = H(0x0f1312);
    public static readonly Color Chu2 = H(0x3a403d);
    public static readonly Color Chu3 = H(0x565c59);       // chữ phụ: 5,7:1 trên Nen
    public static readonly Color Ngoc = H(0x0f6b5c);       // chữ trắng trên Ngoc 6,4:1
    public static readonly Color NgocDam = H(0x08463d);
    public static readonly Color NgocInk = H(0x0a5246);
    public static readonly Color NgocSoft = H(0xdcebe6);
    public static readonly Color ThanChi = H(0x2e3533);
    public static readonly Color ThanChiDam = H(0x121615);
    public static readonly Color Diem = H(0xf5b70a);
    public static readonly Color DiemInk = H(0x6e4300);     // trên DiemSoft 7,6:1
    public static readonly Color DiemSoft = H(0xfbecc0);
    public static readonly Color Canh = H(0x8a3c0c);
    public static readonly Color CanhSoft = H(0xf9e7d2);
    public static readonly Color Loi = H(0xb42318);
    public static readonly Color LoiSoft = H(0xfef0ee);
    public static readonly Color LamSoft = H(0xe1e9fb);
    public static readonly Color TimSoft = H(0xe7e5f8);
    public static readonly Color Bong = H(0x1c201e);        // màu bóng đổ

    // ---------------------------------------------------------------- DPI, chuyển động

    private static float? _scale;
    /// <summary>Hệ số DPI hệ thống (96 dpi = 1). App khai SystemAware.</summary>
    public static float Scale
    {
        get
        {
            if (_scale is { } v) return v;
            try { using var g = Graphics.FromHwnd(IntPtr.Zero); _scale = g.DpiX / 96f; }
            catch { _scale = 1f; }
            return _scale.Value;
        }
    }

    public static float S(float v) => v * Scale;
    public static int Si(int v) => (int)Math.Round(v * Scale);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SystemParametersInfo(uint uiAction, uint uiParam, out bool pvParam, uint fWinIni);
    private const uint SPI_GETCLIENTAREAANIMATION = 0x1042;

    private static bool? _giam;
    private static bool _ngheDoi;

    /// <summary>Windows «Hiệu ứng hoạt hình» tắt (Cài đặt › Trợ năng › Hiệu ứng hình ảnh) ⇒ giảm chuyển động: chỉ đổi sáng/tối, không scale, không vệt.
    /// Đọc SPI một lần rồi nhớ; đọc lại khi Windows báo đổi tuỳ chọn (UserPreferenceChanged) — không gọi SPI mỗi khung hình.</summary>
    public static bool GiamChuyenDong()
    {
        if (_giam is { } v) return v;
        if (!_ngheDoi)
        {
            _ngheDoi = true;
            try { Microsoft.Win32.SystemEvents.UserPreferenceChanged += (_, _) => _giam = null; } catch { }
        }
        bool giam = false;
        try { if (SystemParametersInfo(SPI_GETCLIENTAREAANIMATION, 0, out var bat, 0)) giam = !bat; }
        catch { }
        _giam = giam;
        return giam;
    }

    /// <summary>Lò xo dưới tắt (giống withSpring / loXo trong docs/clay/M-vui.js): vị trí chuẩn hoá 0→1 tại t giây, vận tốc đầu 0.</summary>
    public static double LoXo(double k, double c, double m, double t)
    {
        var w = Math.Sqrt(k / m);
        var z = c / (2 * Math.Sqrt(k * m));
        if (z >= 1) return 1 - Math.Exp(-w * t) * (1 + w * t);
        var wd = w * Math.Sqrt(1 - z * z);
        return 1 - Math.Exp(-z * w * t) * (Math.Cos(wd * t) + z * w / wd * Math.Sin(wd * t));
    }

    public static float EaseOut(float p) => 1 - (1 - p) * (1 - p) * (1 - p);

    // ---------------------------------------------------------------- màu

    public static float DoSang(Color c) => (0.299f * c.R + 0.587f * c.G + 0.114f * c.B) / 255f;
    public static bool LaToi(Color c) => c.A > 0 && DoSang(c) < 0.55f;

    public static Color Tron(Color a, Color b, float t)
    {
        t = Math.Clamp(t, 0f, 1f);
        return Color.FromArgb(
            (int)Math.Round(a.A + (b.A - a.A) * t), (int)Math.Round(a.R + (b.R - a.R) * t),
            (int)Math.Round(a.G + (b.G - a.G) * t), (int)Math.Round(a.B + (b.B - a.B) * t));
    }

    public static Color A(int alpha, Color c) => Color.FromArgb(Math.Clamp(alpha, 0, 255), c.R, c.G, c.B);

    // ---------------------------------------------------------------- hình

    public static GraphicsPath Bo(RectangleF r, float k)
    {
        var p = new GraphicsPath();
        k = Math.Max(0.5f, Math.Min(k, Math.Min(r.Width, r.Height) / 2f));
        var d = k * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    /// <summary>Bóng mềm: nhiều lớp alpha nở dần (giả blur) lệch xuống <paramref name="lechY"/>.</summary>
    public static void BongMem(Graphics g, RectangleF r, float k, float lechY, float mo, float co, int alpha, Color? mau = null)
    {
        const int n = 7;
        var c = mau ?? Bong;
        var lop = Math.Max(1, alpha / n);
        for (int i = 0; i < n; i++)
        {
            var no = co + mo * (i + 1) / n;
            var rr = RectangleF.Inflate(r, no, no);
            rr.Offset(0, lechY);
            if (rr.Width <= 1 || rr.Height <= 1) continue;
            using var p = Bo(rr, k + no);
            using var b = new SolidBrush(A(lop, c));
            g.FillPath(b, p);
        }
    }

    /// <summary>Bóng kép cỡ nút (lề bóng nhỏ ~6px).</summary>
    public static void BongNut(Graphics g, RectangleF r, float k, Color? mau = null)
    {
        BongMem(g, r, k, S(3.5f), S(4f), S(-1.5f), 90, mau);
        BongMem(g, r, k, S(1.2f), S(1.5f), S(-0.5f), 45, mau);
    }

    /// <summary>Bóng kép cỡ thẻ (lề bóng ~12px dưới).</summary>
    public static void BongThe(Graphics g, RectangleF r, float k)
    {
        BongMem(g, r, k, S(7f), S(9f), S(-5f), 80);
        BongMem(g, r, k, S(2.5f), S(3f), S(-2f), 50);
    }

    /// <summary>Khối sáng (đất sét sứ trắng): nền + men trắng phía trên, tối nhẹ phía dưới, dải sáng cong sát mép trên, viền sáng trong.</summary>
    public static void KhoiSang(Graphics g, RectangleF r, float k, Color nen, bool daiCong = true)
    {
        using var p = Bo(r, k);
        using (var b = new SolidBrush(nen)) g.FillPath(b, p);
        var st = g.Save();
        g.SetClip(p, CombineMode.Intersect);
        using (var lg = new LinearGradientBrush(new RectangleF(r.X, r.Y - 1, r.Width, r.Height + 2), Color.White, Color.White, 90f))
        {
            lg.InterpolationColors = new ColorBlend
            {
                Colors = new[] { A(235, Color.White), A(0, Color.White), A(0, Bong), A(16, Bong), A(30, Bong) },
                Positions = new[] { 0f, 0.3f, 0.55f, 0.85f, 1f },
            };
            g.FillRectangle(lg, r.X, r.Y - 1, r.Width, r.Height + 2);
        }
        if (daiCong && r.Width > S(40))
        {
            // dải men trắng cong sát mép trên (radial-gradient 46% 18px at 50% 3px)
            var cao = Math.Min(S(20), r.Height * 0.35f);
            var e = new RectangleF(r.X + r.Width * 0.08f, r.Y - cao * 0.55f, r.Width * 0.84f, cao * 1.5f);
            using var ep = new GraphicsPath();
            ep.AddEllipse(e);
            using var pg = new PathGradientBrush(ep)
            {
                CenterColor = A(230, Color.White),
                SurroundColors = new[] { A(0, Color.White) },
                FocusScales = new PointF(0.55f, 0.3f),
            };
            g.FillEllipse(pg, e);
        }
        VienTrong(g, r, k, A(255, Color.White), A(26, Bong));
        g.Restore(st);
    }

    /// <summary>Khối tối/màu (kẹo bọc đường): gradient đậm dần + mảng men trắng nửa trên cắt sắc + ánh dưới + viền sáng trong.</summary>
    public static void KhoiBong(Graphics g, RectangleF r, float k, Color nen)
    {
        using var p = Bo(r, k);
        var tren = Tron(nen, Color.White, 0.07f);
        var duoi = Tron(nen, Color.Black, 0.42f);
        using (var lg = new LinearGradientBrush(new RectangleF(r.X, r.Y - 1, r.Width, r.Height + 2), tren, duoi, 90f))
            g.FillPath(lg, p);
        var st = g.Save();
        g.SetClip(p, CombineMode.Intersect);
        // ánh phản chiếu đáy (radial 60% 40% at 50% 105%)
        var e = new RectangleF(r.X + r.Width * 0.1f, r.Bottom - r.Height * 0.45f, r.Width * 0.8f, r.Height * 0.9f);
        using (var ep = new GraphicsPath())
        {
            ep.AddEllipse(e);
            using var pg = new PathGradientBrush(ep) { CenterColor = A(85, Tron(nen, Color.White, 0.55f)), SurroundColors = new[] { A(0, nen) } };
            g.FillEllipse(pg, e);
        }
        // mảng men trắng nửa trên, cắt sắc ở 26%
        var cao = r.Height * 0.26f;
        using (var mg = new LinearGradientBrush(new RectangleF(r.X, r.Y - 1, r.Width, cao + 2), A(84, Color.White), A(22, Color.White), 90f))
            g.FillRectangle(mg, r.X, r.Y, r.Width, cao);
        VienTrong(g, r, k, A(120, Color.White), A(95, Color.Black));
        g.Restore(st);
    }

    /// <summary>Lòng chảo ấn lõm (lomIn): nền lõm, bóng trong ở mép trên, viền sáng ở đáy.</summary>
    public static void KhoiLom(Graphics g, RectangleF r, float k, Color nen)
    {
        using var p = Bo(r, k);
        using (var b = new SolidBrush(nen)) g.FillPath(b, p);
        var st = g.Save();
        g.SetClip(p, CombineMode.Intersect);
        var cao = Math.Min(S(10), r.Height / 2);
        using (var lg = new LinearGradientBrush(new RectangleF(r.X, r.Y - 1, r.Width, cao + 2), A(40, Bong), A(0, Bong), 90f))
            g.FillRectangle(lg, r.X, r.Y, r.Width, cao);
        using (var pen = new Pen(A(240, Color.White), S(1.5f)))
        {
            var rr = r; rr.Offset(0, -S(1.2f));
            using var pp = Bo(rr, k);
            g.SetClip(new RectangleF(r.X, r.Y + r.Height * 0.6f, r.Width, r.Height), CombineMode.Intersect);
            g.DrawPath(pen, pp);
        }
        g.Restore(st);
    }

    /// <summary>Viền sáng trong ở nửa trên (inset 0 1.5px trắng) + tối nhẹ nửa dưới. Gọi khi đã clip theo khối.</summary>
    private static void VienTrong(Graphics g, RectangleF r, float k, Color sang, Color toi)
    {
        var st = g.Save();
        using (var pen = new Pen(sang, S(1.6f)))
        {
            var rr = r; rr.Offset(0, S(1.1f));
            using var pp = Bo(rr, k);
            g.SetClip(new RectangleF(r.X, r.Y, r.Width, r.Height * 0.45f), CombineMode.Intersect);
            g.DrawPath(pen, pp);
        }
        g.Restore(st);
        st = g.Save();
        using (var pen = new Pen(toi, S(2.2f)))
        {
            var rr = r; rr.Offset(0, -S(1.4f));
            using var pp = Bo(rr, k);
            g.SetClip(new RectangleF(r.X, r.Y + r.Height * 0.6f, r.Width, r.Height), CombineMode.Intersect);
            g.DrawPath(pen, pp);
        }
        g.Restore(st);
    }

    /// <summary>Vệt men lướt chéo 105° (tiến độ 0→1) trong khối.</summary>
    public static void VetMen(Graphics g, RectangleF r, float k, float tien, bool toi)
    {
        if (tien < 0 || tien >= 1) return;
        using var p = Bo(r, k);
        var st = g.Save();
        g.SetClip(p, CombineMode.Intersect);
        var rong = Math.Max(S(24), r.Width * 0.28f);
        var nghieng = r.Height * 0.27f;     // tan(15°)
        var x0 = r.X - rong - nghieng + (r.Width + 2 * rong + 2 * nghieng) * tien;
        var poly = new[]
        {
            new PointF(x0 + nghieng, r.Y), new PointF(x0 + nghieng + rong, r.Y),
            new PointF(x0 + rong, r.Bottom), new PointF(x0, r.Bottom),
        };
        using var lg = new LinearGradientBrush(new RectangleF(x0, r.Y, rong + nghieng, r.Height), Color.White, Color.White, 0f)
        {
            InterpolationColors = new ColorBlend
            {
                Colors = new[] { A(0, Color.White), A(toi ? 30 : 25, Color.White), A(toi ? 150 : 235, Color.White), A(toi ? 40 : 110, Color.White), A(0, Color.White) },
                Positions = new[] { 0f, 0.3f, 0.5f, 0.62f, 1f },
            },
        };
        g.FillPolygon(lg, poly);
        g.Restore(st);
    }

    /// <summary>Viên clay tròn chứa icon (bt): nền soft, men trắng trên, bóng nhỏ.</summary>
    public static void VienTron(Graphics g, RectangleF r, Color nen, Image? hinh, float tiLeHinh = 0.62f, bool bong = true)
    {
        if (bong) BongNut(g, r, r.Width / 2);
        using (var b = new SolidBrush(nen)) g.FillEllipse(b, r);
        using (var ep = new GraphicsPath())
        {
            var e = new RectangleF(r.X + r.Width * 0.18f, r.Y + r.Height * 0.02f, r.Width * 0.64f, r.Height * 0.5f);
            ep.AddEllipse(e);
            using var pg = new PathGradientBrush(ep) { CenterColor = A(235, Color.White), SurroundColors = new[] { A(0, Color.White) } };
            g.FillEllipse(pg, e);
        }
        using (var pen = new Pen(A(28, Bong), S(1.5f)))
            g.DrawArc(pen, RectangleF.Inflate(r, -S(1f), -S(1f)), 20, 140);
        if (hinh != null) VeHinh(g, r, hinh, tiLeHinh);
    }

    public static void VeHinh(Graphics g, RectangleF khung, Image hinh, float tiLe)
    {
        var w = khung.Width * tiLe;
        var h = khung.Height * tiLe;
        var im = g.InterpolationMode;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.DrawImage(hinh, khung.X + (khung.Width - w) / 2, khung.Y + (khung.Height - h) / 2, w, h);
        g.InterpolationMode = im;
    }

    public static void ChatLuong(Graphics g)
    {
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
    }

    /// <summary>Vẽ nền của control cha vào vùng của <paramref name="c"/> (như BackColor trong suốt) — để góc bo và bóng nằm trên nền thật.</summary>
    public static void VeNenCha(Control c, PaintEventArgs e, Action<Control, PaintEventArgs> paintBg, Action<Control, PaintEventArgs> paint)
    {
        var cha = c.Parent;
        if (cha == null) { e.Graphics.Clear(c.BackColor.A == 255 ? c.BackColor : SystemColors.Control); return; }
        var st = e.Graphics.Save();
        e.Graphics.TranslateTransform(-c.Left, -c.Top);
        var vung = new Rectangle(c.Left, c.Top, c.Width, c.Height);
        var pe = new PaintEventArgs(e.Graphics, vung);   // không Dispose: Graphics là của e
        paintBg(cha, pe);
        paint(cha, pe);
        e.Graphics.Restore(st);
    }
}

/// <summary>
/// Ảnh nền của cha (và nền riêng của control, vd thân thẻ) vẽ MỘT lần vào bitmap rồi chỉ chép ra mỗi lần vẽ — khung hình chuyển động, chữ trong suốt,
/// di chuột không phải vẽ lại cả chuỗi tổ tiên với hàng chục lớp bóng. Bỏ ảnh khi control đổi cỡ/chỗ/cha/màu, hoặc khi cha bị vẽ lại đúng vùng đó.
/// </summary>
internal sealed class NenCache : IDisposable
{
    private readonly Control _c;
    private readonly Action<Control, PaintEventArgs> _bg, _fg;
    private readonly Action<Graphics>? _rieng;
    private Control? _cha;
    private Bitmap? _bmp;
    private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<Control, NenCache> DangKy = new();

    /// <summary>Bỏ ảnh nền đã nhớ của <paramref name="goc"/> và MỌI con cháu (thẻ đổi cỡ ⇒ thân thẻ vẽ lại ⇒ nền dưới nút/chữ đổi theo).</summary>
    public static void BoCaCay(Control goc)
    {
        if (DangKy.TryGetValue(goc, out var n)) n.Bo(null, EventArgs.Empty);
        foreach (Control con in goc.Controls) BoCaCay(con);
    }

    /// <summary>Nền cha phụ thuộc vị trí (tổ tiên đặc gần nhất tự vẽ: thẻ Clay, gradient)? Không ⇒ dời chỗ (cuộn) không phải vẽ lại.</summary>
    private bool NenTheoViTri()
    {
        for (var p = _c.Parent; p != null; p = p.Parent)
        {
            if (p is IVeNenRieng) return true;
            if (p.BackColor.A == 255 && p.BackgroundImage == null) return false;
        }
        return true;
    }

    public NenCache(Control c, Action<Control, PaintEventArgs> paintBg, Action<Control, PaintEventArgs> paint, Action<Graphics>? rieng = null)
    {
        _c = c; _bg = paintBg; _fg = paint; _rieng = rieng;
        DangKy.AddOrUpdate(c, this);
        c.Resize += Bo;
        c.Move += (_, _) => { if (NenTheoViTri()) Bo(null, EventArgs.Empty); };   // thân thẻ (_rieng) không phụ thuộc vị trí ⇒ cuộn trên nền đặc không dựng lại
        c.BackColorChanged += Bo;
        c.ParentChanged += (_, _) => { NoiCha(); Bo(null, EventArgs.Empty); };
        NoiCha();
    }

    private void NoiCha()
    {
        if (_cha != null) _cha.Invalidated -= ChaVeLai;
        _cha = _c.Parent;
        if (_cha != null) _cha.Invalidated += ChaVeLai;
    }

    private void ChaVeLai(object? s, InvalidateEventArgs e)
    {
        if (e.InvalidRect.IntersectsWith(_c.Bounds)) Bo(null, EventArgs.Empty);
    }

    /// <summary>Bỏ ảnh đã nhớ (vd control đổi trạng thái làm đổi nền riêng).</summary>
    public void Bo(object? s, EventArgs e) { _bmp?.Dispose(); _bmp = null; }

    public void Ve(PaintEventArgs e)
    {
        int w = _c.Width, h = _c.Height;
        if (w <= 0 || h <= 0) return;
        if (_bmp == null || _bmp.Width != w || _bmp.Height != h)
        {
            _bmp?.Dispose();
            _bmp = new Bitmap(w, h, System.Drawing.Imaging.PixelFormat.Format32bppPArgb);
            using var g = Graphics.FromImage(_bmp);
            var pe = new PaintEventArgs(g, new Rectangle(0, 0, w, h));
            Clay.VeNenCha(_c, pe, _bg, _fg);
            _rieng?.Invoke(g);
        }
        e.Graphics.DrawImage(_bmp, new Rectangle(0, 0, w, h));
    }

    public void Dispose()
    {
        DangKy.Remove(_c);
        if (_cha != null) _cha.Invalidated -= ChaVeLai;
        _cha = null;
        _bmp?.Dispose();
        _bmp = null;
    }
}

/// <summary>Bộ đếm chuyển động nhấn: bẹp → nảy lò xo + vệt men. Timer ~60 fps chỉ chạy khi đang có chuyển động.</summary>
internal sealed class NhanNay : IDisposable
{
    private readonly Control _c;
    private System.Windows.Forms.Timer? _t;
    private readonly Stopwatch _sw = Stopwatch.StartNew();
    private int _pha;                 // 0 đứng, 1 ép, 2 thả
    private double _bd, _quet0 = -1;
    private float _tuX = 1, _tuY = 1;

    public float X { get; private set; } = 1;
    public float Y { get; private set; } = 1;
    /// <summary>Tiến độ vệt men 0→1; −1 = không có.</summary>
    public float Quet { get; private set; } = -1;
    public bool DangNhan { get; private set; }

    public NhanNay(Control c) => _c = c;

    public void Ep()
    {
        DangNhan = true;
        if (Clay.GiamChuyenDong()) { _c.Invalidate(); return; }
        _tuX = X; _tuY = Y; _pha = 1; _bd = _sw.Elapsed.TotalMilliseconds;
        Chay();
    }

    public void Tha(bool quet = true)
    {
        if (!DangNhan && _pha == 0 && !quet) return;
        DangNhan = false;
        if (Clay.GiamChuyenDong()) { X = Y = 1; Quet = -1; _pha = 0; _c.Invalidate(); return; }
        _tuX = X; _tuY = Y; _pha = 2; _bd = _sw.Elapsed.TotalMilliseconds;
        if (quet) _quet0 = _bd;
        Chay();
    }

    /// <summary>Chỉ chạy vệt men (vd khối vừa hiện, bấm bằng phím).</summary>
    public void LuotMen()
    {
        if (Clay.GiamChuyenDong()) return;
        _quet0 = _sw.Elapsed.TotalMilliseconds;
        Chay();
    }

    private void Chay()
    {
        if (_c.IsDisposed) return;
        if (_t == null)
        {
            _t = new System.Windows.Forms.Timer { Interval = 16 };
            _t.Tick += (_, _) => Nhip();
        }
        if (!_t.Enabled) _t.Start();
        Nhip();
    }

    private void Nhip()
    {
        if (_c.IsDisposed) { _t?.Stop(); return; }
        var bay = _sw.Elapsed.TotalMilliseconds;
        bool con = false;
        if (_pha == 1)
        {
            var p = (float)Math.Min(1, (bay - _bd) / 110.0);
            var e = Clay.EaseOut(p);
            X = _tuX + (0.96f - _tuX) * e;
            Y = _tuY + (0.92f - _tuY) * e;
            con = p < 1;
        }
        else if (_pha == 2)
        {
            var t = bay - _bd;
            if (t >= 420) { X = Y = 1; _pha = 0; }
            else
            {
                var p = (float)Clay.LoXo(420, 14, 1, t / 1000.0);
                X = _tuX + (1 - _tuX) * p;
                Y = _tuY + (1 - _tuY) * p;
                con = true;
            }
        }
        if (_quet0 >= 0)
        {
            var q = (bay - _quet0) / 420.0;
            if (q >= 1) { Quet = -1; _quet0 = -1; }
            else { Quet = Clay.EaseOut((float)q); con = true; }
        }
        _c.Invalidate();
        if (!con) _t?.Stop();
    }

    public void Dispose()
    {
        _t?.Stop();
        _t?.Dispose();
        _t = null;
    }
}

/// <summary>Kiểu khối của nút.</summary>
internal enum KieuClay
{
    /// <summary>Theo BackColor: tối ⇒ kẹo bọc đường, sáng ⇒ đất sét sứ.</summary>
    TuDong,
    /// <summary>Không có khối khi đứng yên (mục điều hướng chưa chọn); di chuột thì hiện khối sáng mờ.</summary>
    Phang,
    /// <summary>Lòng chảo ấn lõm (mục điều hướng đang chọn).</summary>
    Lom,
}

/// <summary>Phần vẽ chung cho ClayButton / ClayRadio.</summary>
internal static class VeNut
{
    public static Padding LeBong => new(Clay.Si(3), Clay.Si(1), Clay.Si(3), Clay.Si(6));

    public static void Ve(ButtonBase b, PaintEventArgs e, NhanNay nn, bool hover, KieuClay kieu, float bo, bool focusCue)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var le = LeBong;
        var than = new RectangleF(le.Left, le.Top, b.Width - le.Horizontal, b.Height - le.Vertical);
        if (than.Width < 4 || than.Height < 4) return;
        var k = bo > 0 ? bo : Math.Min(Clay.S(20), than.Height / 2);
        var nen = b.BackColor.A == 0 ? Clay.The : b.BackColor;
        var toi = Clay.LaToi(nen);

        var st = g.Save();
        var cx = than.X + than.Width / 2; var cy = than.Y + than.Height / 2;
        g.TranslateTransform(cx, cy);
        g.ScaleTransform(nn.X, nn.Y);
        g.TranslateTransform(-cx, -cy);

        if (kieu == KieuClay.Phang)
        {
            if (hover || nn.DangNhan)
                using (var p = Clay.Bo(than, k))
                using (var br = new SolidBrush(Clay.A(nn.DangNhan ? 120 : 80, Color.White)))
                    g.FillPath(br, p);
        }
        else if (kieu == KieuClay.Lom)
            Clay.KhoiLom(g, than, k, nen);
        else
        {
            Clay.BongNut(g, than, k, toi ? Clay.Tron(nen, Color.Black, 0.5f) : null);
            if (toi) Clay.KhoiBong(g, than, k, nen); else Clay.KhoiSang(g, than, k, nen, than.Width > Clay.S(80));
            if (hover && b.Enabled)
                using (var p = Clay.Bo(than, k))
                using (var br = new SolidBrush(Clay.A(toi ? 22 : 60, Color.White)))
                    g.FillPath(br, p);
            if (nn.DangNhan && Clay.GiamChuyenDong())
                using (var p = Clay.Bo(than, k))
                using (var br = new SolidBrush(Clay.A(28, Color.Black)))
                    g.FillPath(br, p);
            Clay.VetMen(g, than, k, nn.Quet, toi);
        }

        // chữ + icon
        var mauChu = b.ForeColor;
        if (!b.Enabled) mauChu = Clay.Tron(mauChu, nen, 0.45f);
        var noi = new RectangleF(than.X + b.Padding.Left + Clay.S(8), than.Y, than.Width - b.Padding.Horizontal - Clay.S(16), than.Height);
        var hinh = b.Image;
        var coHinh = Math.Min(Clay.S(24), than.Height * 0.56f);
        using var sf = new StringFormat(StringFormatFlags.LineLimit)
        {
            LineAlignment = StringAlignment.Center,
            Trimming = StringTrimming.EllipsisCharacter,
            HotkeyPrefix = b.UseMnemonic ? System.Drawing.Text.HotkeyPrefix.Hide : System.Drawing.Text.HotkeyPrefix.None,
        };
        var trai = b.TextAlign is ContentAlignment.MiddleLeft or ContentAlignment.TopLeft or ContentAlignment.BottomLeft;
        var phai = b.TextAlign is ContentAlignment.MiddleRight or ContentAlignment.TopRight or ContentAlignment.BottomRight;
        // nhãn giữa: các dòng (chữ dài rớt dòng) căn giữa nhau, không lệch trái trong khối
        var giua = !trai && !phai && hinh == null;
        if (giua) sf.Alignment = StringAlignment.Center;
        var co = g.MeasureString(b.Text, b.Font, (int)Math.Max(1, noi.Width - (hinh != null ? coHinh + Clay.S(8) : 0)), sf);
        var tong = co.Width + (hinh != null ? coHinh + Clay.S(8) : 0);
        var x = trai ? noi.X : phai ? noi.Right - tong : noi.X + (noi.Width - tong) / 2;
        if (hinh != null)
        {
            var hr = new RectangleF(x, noi.Y + (noi.Height - coHinh) / 2, coHinh, coHinh);
            if (b.Enabled) Clay.VeHinh(g, hr, hinh, 1f);
            else
            {
                using var ia = new System.Drawing.Imaging.ImageAttributes();
                ia.SetColorMatrix(new System.Drawing.Imaging.ColorMatrix { Matrix33 = 0.45f });
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.DrawImage(hinh, Rectangle.Round(hr), 0, 0, hinh.Width, hinh.Height, GraphicsUnit.Pixel, ia);
            }
            x += coHinh + Clay.S(8);
        }
        using (var br = new SolidBrush(mauChu))
            g.DrawString(b.Text, b.Font, br, giua ? noi : new RectangleF(x, noi.Y, Math.Max(1, noi.Right - x), noi.Height), sf);

        // vòng tiêu điểm bàn phím (không dựa vào màu riêng)
        if (b.Focused && focusCue && b.Enabled)
        {
            var fr = RectangleF.Inflate(than, -Clay.S(3), -Clay.S(3));
            using var p = Clay.Bo(fr, Math.Max(2, k - Clay.S(3)));
            using var pen = new Pen(toi ? Clay.A(230, Color.White) : Clay.Ngoc, Clay.S(2f)) { DashStyle = DashStyle.Solid };
            g.DrawPath(pen, p);
        }
        g.Restore(st);
    }
}

/// <summary>Nút Clay: vẽ thay hoàn toàn Button (giữ Click, Enabled, Text, Image, BackColor/ForeColor của chỗ gọi).</summary>
internal class ClayButton : Button
{
    private readonly NhanNay _nn;
    private readonly NenCache _nen;
    private bool _hover;
    private KieuClay _kieu = KieuClay.TuDong;

    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public KieuClay Kieu { get => _kieu; set { _kieu = value; Invalidate(); } }

    /// <summary>Bán kính bo (px); 0 = tự (≈20, tối đa nửa chiều cao).</summary>
    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public float BoGoc { get; set; }

    public ClayButton()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                 | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
        FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0;
        UseVisualStyleBackColor = false;
        Cursor = Cursors.Hand;
        _nn = new NhanNay(this);
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint);
    }

    protected override void OnMouseEnter(EventArgs e) { _hover = true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { _hover = false; if (_nn.DangNhan) _nn.Tha(false); Invalidate(); base.OnMouseLeave(e); }
    protected override void OnMouseDown(MouseEventArgs e) { if (e.Button == MouseButtons.Left && Enabled) _nn.Ep(); base.OnMouseDown(e); }
    protected override void OnMouseUp(MouseEventArgs e) { if (e.Button == MouseButtons.Left && _nn.DangNhan) _nn.Tha(); base.OnMouseUp(e); }
    protected override void OnKeyUp(KeyEventArgs e) { if (e.KeyCode is Keys.Space or Keys.Enter) _nn.LuotMen(); base.OnKeyUp(e); }
    protected override void OnEnabledChanged(EventArgs e) { Invalidate(); base.OnEnabledChanged(e); }
    protected override void OnGotFocus(EventArgs e) { Invalidate(); base.OnGotFocus(e); }
    protected override void OnLostFocus(EventArgs e) { Invalidate(); base.OnLostFocus(e); }

    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    protected override void OnPaint(PaintEventArgs e)
    {
        VeNut.Ve(this, e, _nn, _hover, _kieu, BoGoc, ShowFocusCues);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _nn.Dispose(); _nen.Dispose(); }
        base.Dispose(disposing);
    }
}

/// <summary>Nút chọn (RadioButton dạng nút) theo Clay: đang chọn thì BackColor đậm (chỗ gọi đặt) ⇒ kẹo bọc đường.</summary>
internal class ClayRadio : RadioButton
{
    private readonly NhanNay _nn;
    private readonly NenCache _nen;
    private bool _hover;

    public ClayRadio()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                 | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
        Appearance = Appearance.Button;
        FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0;
        UseVisualStyleBackColor = false;
        Cursor = Cursors.Hand;
        _nn = new NhanNay(this);
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint);
    }

    protected override void OnMouseEnter(EventArgs e) { _hover = true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { _hover = false; if (_nn.DangNhan) _nn.Tha(false); Invalidate(); base.OnMouseLeave(e); }
    protected override void OnMouseDown(MouseEventArgs e) { if (e.Button == MouseButtons.Left && Enabled) _nn.Ep(); base.OnMouseDown(e); }
    protected override void OnMouseUp(MouseEventArgs e) { if (e.Button == MouseButtons.Left && _nn.DangNhan) _nn.Tha(); base.OnMouseUp(e); }
    protected override void OnCheckedChanged(EventArgs e) { Invalidate(); base.OnCheckedChanged(e); }
    protected override void OnGotFocus(EventArgs e) { Invalidate(); base.OnGotFocus(e); }
    protected override void OnLostFocus(EventArgs e) { Invalidate(); base.OnLostFocus(e); }

    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    protected override void OnPaint(PaintEventArgs e)
    {
        VeNut.Ve(this, e, _nn, _hover, KieuClay.TuDong, 0, ShowFocusCues);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _nn.Dispose(); _nen.Dispose(); }
        base.Dispose(disposing);
    }
}

/// <summary>Vẽ thẻ Clay cho Panel / FlowLayoutPanel: góc bo lớn, bóng kép, dải sáng cong mép trên.</summary>
internal static class VeThe
{
    /// <summary>Lề dành cho bóng quanh thân thẻ (đã tính DPI). Padding của thẻ phải cộng lề này (<see cref="Pad"/>).</summary>
    public static Padding LeBong => new(Clay.Si(6), Clay.Si(3), Clay.Si(6), Clay.Si(12));

    /// <summary>Padding nội dung (px ở 96 dpi, đã nhân DPI ở chỗ gọi nếu cần) cộng lề bóng.</summary>
    public static Padding Pad(int trai, int tren, int phai, int duoi)
    {
        var l = LeBong;
        return new Padding(trai + l.Left, tren + l.Top, phai + l.Right, duoi + l.Bottom);
    }

    public static void Ve(Control c, Graphics g, float bo, bool lom)
    {
        Clay.ChatLuong(g);
        var l = LeBong;
        var than = new RectangleF(l.Left, l.Top, c.Width - l.Horizontal, c.Height - l.Vertical);
        if (than.Width < 4 || than.Height < 4) return;
        var k = Math.Min(bo > 0 ? bo : Clay.S(28), Math.Min(than.Width, than.Height) / 2);
        var nen = c.BackColor.A == 0 ? Clay.The : c.BackColor;
        if (lom) { Clay.KhoiLom(g, than, k, nen); return; }
        Clay.BongThe(g, than, k);
        Clay.KhoiSang(g, than, k, nen);
    }
}

/// <summary>Control tự vẽ nền phụ thuộc vị trí (thẻ Clay, nền gradient) — con dời chỗ trong nó thì phải vẽ lại nền đã nhớ.</summary>
internal interface IVeNenRieng { }

/// <summary>Thẻ Clay (Panel). Con bên trong nên để BackColor trong suốt để thấy men.</summary>
internal class ClayCard : Panel, IVeNenRieng
{
    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public float BoGoc { get; set; }
    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public bool Lom { get; set; }

    private readonly NenCache _nen;

    public ClayCard()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        BackColor = Clay.The;
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint, g => VeThe.Ve(this, g, BoGoc, Lom));
    }

    /// <summary>Nền (cha + thân thẻ) nhớ trong bitmap: chữ trong suốt bên trong không vẽ lại bóng mỗi lần.</summary>
    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    /// <summary>Thẻ đổi cỡ/màu ⇒ thân thẻ đổi ⇒ bỏ nền đã nhớ của mọi con cháu (nút, icon trong thẻ).</summary>
    protected override void OnSizeChanged(EventArgs e) { NenCache.BoCaCay(this); base.OnSizeChanged(e); }
    protected override void OnBackColorChanged(EventArgs e) { NenCache.BoCaCay(this); base.OnBackColorChanged(e); }

    /// <summary>Đổi thứ ảnh hưởng tới thân thẻ (bo, lõm, trạng thái chọn…) ⇒ gọi để vẽ lại nền.</summary>
    public void VeLaiNen() { _nen.Bo(null, EventArgs.Empty); Invalidate(true); }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _nen.Dispose();
        base.Dispose(disposing);
    }
}

/// <summary>Thẻ Clay xếp dọc/ngang (FlowLayoutPanel).</summary>
internal class ClayFlow : FlowLayoutPanel, IVeNenRieng
{
    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public float BoGoc { get; set; }

    private readonly NenCache _nen;

    public ClayFlow()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        BackColor = Clay.The;
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint, g => VeThe.Ve(this, g, BoGoc, false));
    }

    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    /// <summary>Thẻ đổi cỡ/màu ⇒ thân thẻ đổi ⇒ bỏ nền đã nhớ của mọi con cháu (nút, icon trong thẻ).</summary>
    protected override void OnSizeChanged(EventArgs e) { NenCache.BoCaCay(this); base.OnSizeChanged(e); }
    protected override void OnBackColorChanged(EventArgs e) { NenCache.BoCaCay(this); base.OnBackColorChanged(e); }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _nen.Dispose();
        base.Dispose(disposing);
    }
}

/// <summary>Viên clay tròn chứa icon Fluent 3D. <see cref="DongSap"/> = ổ khoá «đóng sập» (M-vui: KHOÁ MÁY 380ms).</summary>
internal sealed class ClayIcon : Control
{
    private readonly NenCache _nen;
    private Image? _hinh, _dich;   // _dich = ảnh đích của lượt đóng sập đang chạy (null = không chạy)
    private System.Windows.Forms.Timer? _t;
    private readonly Stopwatch _sw = new();
    private float _dy, _sx = 1, _sy = 1;

    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public Image? Hinh { get => _dich ?? _hinh; set { if (_dich != null) _dich = value; else _hinh = value; Invalidate(); } }

    /// <summary>Màu viên (soft); trong suốt ⇒ chỉ vẽ hình, không có viên.</summary>
    [Browsable(false), DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public Color MauVien { get; set; } = Clay.The;

    public ClayIcon()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                 | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
        TabStop = false;
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint);
    }

    /// <summary>Nhấc lên (hình <paramref name="truoc"/>), đập xuống đổi sang hình hiện tại, nảy nhẹ rồi yên. Giảm chuyển động ⇒ hiện luôn hình cuối.</summary>
    public void DongSap(Image? truoc)
    {
        if (Clay.GiamChuyenDong() || IsDisposed) return;
        _t?.Stop();
        _dich ??= _hinh;            // gọi lại giữa chừng: giữ ảnh đích cũ, không lấy nhầm ảnh tạm
        if (truoc != null) _hinh = truoc;
        _sw.Restart();
        if (_t == null)
        {
            _t = new System.Windows.Forms.Timer { Interval = 16 };
            _t.Tick += (_, _) => Nhip();
        }
        _t.Start();
        Nhip();
    }

    private void Nhip()
    {
        if (IsDisposed) { _t?.Stop(); return; }
        var t = (float)_sw.Elapsed.TotalMilliseconds;
        // keyframes: 0 nhấc −9px scale 1.3 → 200ms đập +2px scale .85/1.1 → 290ms 1.08/.94 → 380ms 1
        static float L(float a, float b, float p) => a + (b - a) * p;
        var h = Height / 64f;
        if (t < 200)
        {
            var p = t / 200f; var e = p * p;   // rơi nhanh dần
            _dy = L(-9 * h, 2 * h, e); _sx = L(1.3f, 0.85f, e); _sy = L(1.3f, 1.1f, e);
        }
        else if (t < 290)
        {
            if (_dich != null) _hinh = _dich;
            var p = Clay.EaseOut((t - 200) / 90f);
            _dy = L(2 * h, 0, p); _sx = L(0.85f, 1.08f, p); _sy = L(1.1f, 0.94f, p);
        }
        else if (t < 380)
        {
            var p = Clay.EaseOut((t - 290) / 90f);
            _dy = 0; _sx = L(1.08f, 1, p); _sy = L(0.94f, 1, p);
        }
        else
        {
            _dy = 0; _sx = _sy = 1;
            if (_dich != null) { _hinh = _dich; _dich = null; }
            _t?.Stop();
        }
        Invalidate();
    }

    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var le = Clay.S(4);
        var d = Math.Min(Width, Height) - le * 2 - Clay.S(4);
        var r = new RectangleF((Width - d) / 2f, le, d, d);
        var coVien = MauVien.A > 0;
        if (coVien) Clay.VienTron(g, r, MauVien, null);
        if (_hinh == null) return;
        var st = g.Save();
        var cx = r.X + r.Width / 2; var cy = r.Y + r.Height / 2;
        g.TranslateTransform(cx, cy + _dy);
        g.ScaleTransform(_sx, _sy);
        g.TranslateTransform(-cx, -cy);
        Clay.VeHinh(g, r, _hinh, coVien ? 0.62f : 1f);
        g.Restore(st);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { _t?.Stop(); _t?.Dispose(); _t = null; _nen.Dispose(); }
        base.Dispose(disposing);
    }
}

/// <summary>Menu khay theo Clay: nền thẻ sáng, mục được trỏ là viên bo tròn ngọc nhạt.</summary>
internal sealed class ClayMenuRenderer : ToolStripProfessionalRenderer
{
    public ClayMenuRenderer() : base(new MauMenu()) { RoundedEdges = true; }

    protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
    {
        if (!e.Item.Selected || !e.Item.Enabled) return;
        Clay.ChatLuong(e.Graphics);
        var r = new RectangleF(Clay.S(4), Clay.S(1), e.Item.Width - Clay.S(8), e.Item.Height - Clay.S(2));
        using var p = Clay.Bo(r, Clay.S(9));
        using var b = new SolidBrush(Clay.NgocSoft);
        e.Graphics.FillPath(b, p);
    }

    protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
    {
        e.TextColor = e.Item.Enabled ? (e.Item.Selected ? Clay.NgocInk : Clay.Chu) : Clay.Chu3;
        base.OnRenderItemText(e);
    }

    private sealed class MauMenu : ProfessionalColorTable
    {
        public override Color ToolStripDropDownBackground => Clay.The;
        public override Color ImageMarginGradientBegin => Clay.The;
        public override Color ImageMarginGradientMiddle => Clay.The;
        public override Color ImageMarginGradientEnd => Clay.The;
        public override Color MenuBorder => Clay.Tron(Clay.Lom, Clay.Bong, 0.12f);
        public override Color SeparatorDark => Clay.Lom;
        public override Color SeparatorLight => Color.White;
        public override Color MenuItemSelected => Clay.NgocSoft;
        public override Color MenuItemBorder => Clay.NgocSoft;
    }
}

/// <summary>Ô nhập Clay: TextBox không viền đặt trong lòng chảo ấn lõm (ClayCard Lom), thân cao ≥ 44 (theo DPI) — vùng bấm đủ,
/// chữ cách mép ngang 14, nằm dưới dải bóng trong (10) của lòng chảo. Đang gõ ⇒ lòng chảo ngả ngọc nhạt (thấy rõ ô đang focus).
/// Bấm vào lòng chảo ngoài chữ cũng vào ô. Dùng chung cho khay và bộ cài. ClayCard luôn chừa lề bóng (VeThe.LeBong, theo DPI) quanh thân
/// như mọi thẻ Clay khác ⇒ <paramref name="le"/> là Margin cộng THÊM ngoài lề đó (thường để trống: lề bóng dưới ~12 đã là khoảng cách dòng).</summary>
internal static class ONhapClay
{
    /// <summary>Chiều cao thân lòng chảo cho một TextBox (đã bỏ viền).</summary>
    public static int Than(TextBox o) => Math.Max(Clay.Si(44), o.PreferredHeight + Clay.Si(20));

    public static ClayCard Boc(TextBox o, int rong, Padding? le = null)
    {
        var lb = VeThe.LeBong;
        o.BorderStyle = BorderStyle.None;
        o.BackColor = Clay.Lom;
        o.Margin = Padding.Empty;
        var ngang = Clay.Si(14);
        o.Width = Math.Max(Clay.Si(40), rong - 2 * ngang);
        var than = Than(o);
        var m = le ?? Padding.Empty;
        var vo = new ClayCard
        {
            Lom = true, BoGoc = Clay.S(16), BackColor = Clay.Lom, Cursor = Cursors.IBeam,
            Width = rong + lb.Horizontal, Height = than + lb.Vertical,
            Margin = m,
        };
        o.Location = new Point(lb.Left + ngang, lb.Top + Math.Max(Clay.Si(10), (than - o.Height) / 2));
        vo.Controls.Add(o);
        vo.Click += (_, _) => o.Focus();
        // Màu suy từ (Enabled, Focused) mỗi lần — không phụ thuộc thứ tự Enter/Leave/EnabledChanged.
        // Đang gõ ⇒ ngọc nhạt; bị khoá (đang kiểm mã…) ⇒ sứ, không còn con trỏ gõ chữ; còn lại ⇒ lòng chảo.
        void Ve()
        {
            var mau = !o.Enabled ? Clay.The : o.Focused ? Clay.NgocSoft : Clay.Lom;
            vo.Cursor = o.Enabled ? Cursors.IBeam : Cursors.Default;
            if (vo.BackColor != mau) { vo.BackColor = mau; o.BackColor = mau; }
        }
        o.Enter += (_, _) => Ve();
        o.Leave += (_, _) => Ve();
        o.EnabledChanged += (_, _) => Ve();
        return vo;
    }
}
