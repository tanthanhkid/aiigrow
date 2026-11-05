namespace AiiGrow.ClayUi;

/// <summary>
/// Ảnh của thiết kế đã chốt 05/11 (docs/thiet-ke-chot/con-*): icon 3D (Fluent Emoji 3D, MIT — Assets/icon3d/NGUON.md, cùng bộ với app Ba Mẹ
/// mobile/assets/icon3d) và Rob (Assets/mascot). Nhúng trong exe (LogicalName «icon3d.&lt;tên&gt;.png», «mascot.&lt;tên&gt;.png») — dùng chung khay + bộ cài
/// (AiiGrow.Setup.csproj link tệp này). Thiếu tài nguyên ⇒ null, giao diện vẫn chạy (chỉ thiếu hình).
/// </summary>
internal static class Anh3D
{
    private static readonly Dictionary<string, Image?> Nho = new();

    /// <summary>Icon 3D theo tên thiết kế (khoa, sao, tin, gui, mo_khoa, dong_ho_cat…).</summary>
    public static Image? Icon(string ten) => Lay("icon3d." + ten + ".png");

    /// <summary>Rob theo tên (rob-goc, cho, xong, chi, nghi, ngu, so-tay, trong-loi, qua).</summary>
    public static Image? Rob(string ten) => Lay("mascot." + ten + ".png");

    private static Image? Lay(string res)
    {
        lock (Nho)
        {
            if (Nho.TryGetValue(res, out var c)) return c;
            Image? img = null;
            try
            {
                using var st = typeof(Anh3D).Assembly.GetManifestResourceStream(res);
                if (st != null) { using var raw = Image.FromStream(st); img = new Bitmap(raw); }
            }
            catch (Exception e) { System.Diagnostics.Debug.WriteLine(e); }
            return Nho[res] = img;
        }
    }
}

/// <summary>Khối dựng lặp lại trong mọi màn thiết kế 05/11: viên icon 3D + hai dòng chữ (đậm + phụ), Rob đứng, dòng chữ có độ rộng tối đa.</summary>
internal static class KhoiThietKe
{
    /// <summary>Viên tròn 3D cỡ <paramref name="co"/> (px 96 dpi) chứa icon; <paramref name="ngoc"/> = viên ngọc nhạt (mục đang nói tới).</summary>
    public static ClayIcon Vien(string icon, int co = 56, bool ngoc = false) => new()
    {
        Size = new Size(Clay.Si(co), Clay.Si(co)), MauVien = ngoc ? Clay.NgocSoft : Clay.The, Hinh = Anh3D.Icon(icon),
        Margin = new Padding(0, 0, Clay.Si(14), 0),
    };

    public static Label Chu(string text, float pt, bool dam, Color mau, int rong) => new()
    {
        Text = text, AutoSize = true, UseMnemonic = false, MaximumSize = new Size(rong, 0),
        Font = new Font("Segoe UI", pt, dam ? FontStyle.Bold : FontStyle.Regular), ForeColor = mau, BackColor = Color.Transparent,
        Margin = new Padding(0, 0, 0, Clay.Si(2)),
    };

    /// <summary>Hàng «icon 3D · tiêu đề đậm / dòng phụ» (màn Chào, Đồng ý, Xong của bộ cài; thẻ trên màn chặn / khoá).</summary>
    public static FlowLayoutPanel Dong(string icon, string tieu, string? phu, int rong, bool ngoc = false, int coIcon = 56, float ptTieu = 12f)
    {
        var hang = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.LeftToRight, WrapContents = false,
            BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, Clay.Si(10)),
        };
        var v = Vien(icon, coIcon, ngoc);
        hang.Controls.Add(v);
        var cot = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            BackColor = Color.Transparent, Margin = new Padding(0, phu == null ? Clay.Si(coIcon / 2 - 12) : Clay.Si(coIcon / 2 - 22), 0, 0),
        };
        var r = Math.Max(Clay.Si(120), rong - v.Width - v.Margin.Horizontal);
        cot.Controls.Add(Chu(tieu, ptTieu, true, Clay.Chu, r));
        if (phu != null) cot.Controls.Add(Chu(phu, 10f, false, Clay.Chu3, r));
        hang.Controls.Add(cot);
        return hang;
    }

    /// <summary>Rob đứng (ảnh trong suốt, không viên) cao <paramref name="cao"/> px 96 dpi, giữ tỉ lệ ảnh.</summary>
    public static HinhRob Rob(string ten, int cao)
    {
        var img = Anh3D.Rob(ten);
        var rong = img == null ? cao : (int)Math.Round(cao * img.Width / (double)img.Height);
        return new HinhRob { Size = new Size(Clay.Si(rong), Clay.Si(cao)), Hinh = img, Margin = Padding.Empty };
    }
}

/// <summary>Ảnh Rob giữ tỉ lệ, nền là nền thật của cha (thẻ Clay vẽ tay) — như ClayIcon nhưng không kéo méo ảnh đứng.</summary>
internal sealed class HinhRob : Control
{
    private readonly NenCache _nen;
    private Image? _hinh;

    [System.ComponentModel.Browsable(false), System.ComponentModel.DesignerSerializationVisibility(System.ComponentModel.DesignerSerializationVisibility.Hidden)]
    public Image? Hinh { get => _hinh; set { _hinh = value; Invalidate(); } }

    public HinhRob()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                 | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
        TabStop = false;
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint);
    }

    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    protected override void OnPaint(PaintEventArgs e)
    {
        if (_hinh == null || Width <= 0 || Height <= 0) return;
        var k = Math.Min(Width / (float)_hinh.Width, Height / (float)_hinh.Height);
        float w = _hinh.Width * k, h = _hinh.Height * k;
        var g = e.Graphics;
        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        g.DrawImage(_hinh, (Width - w) / 2, Height - h, w, h);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _nen.Dispose();
        base.Dispose(disposing);
    }
}
