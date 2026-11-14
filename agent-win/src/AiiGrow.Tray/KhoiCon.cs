using System.Drawing.Drawing2D;
using AiiGrow.ClayUi;

namespace AiiGrow.Tray;

/// <summary>
/// Khối dựng của các hộp Con theo thiết kế chốt 05/11 (docs/thiet-ke-chot/con-bi-chan, con-het-gio, con-mat-mang — CSS «#hop»):
/// đầu hộp (viên icon 3D + tiêu đề 20px + dòng phụ), Grow + bong bóng nói, chip (đang chờ / chưa mở được), dòng icon nhỏ + chữ, nút có icon 3D, liên kết chữ.
/// </summary>
internal static class KhoiCon
{
    /// <summary>Màu viên icon theo thiết kế: ngoc (đã gửi / được), cam (bị khoá / chưa cho), vang (sao), trắng.</summary>
    public enum Mau { Trang, Ngoc, Cam, Vang }

    private static Color MauVien(Mau m) => m switch
    {
        Mau.Ngoc => Clay.NgocSoft, Mau.Cam => Clay.CanhSoft, Mau.Vang => Clay.DiemSoft, _ => Clay.The,
    };

    /// <summary>Đầu hộp: viên 56 + tiêu đề đậm 20px + dòng phụ 13px (thiết kế «.dau»).</summary>
    public static FlowLayoutPanel Dau(string icon, Mau mau, string tieu, string? phu, int rong)
    {
        var hang = Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(12));
        var v = new ClayIcon { Size = new Size(UI.Px(56), UI.Px(56)), MauVien = MauVien(mau), Hinh = Anh3D.Icon(icon), Margin = new Padding(0, 0, UI.Px(12), 0) };
        hang.Controls.Add(v);
        var cot = Cot();
        var r = rong - v.Width - v.Margin.Horizontal;
        var t = UI.Text(tieu, 15f, true, UI.Ink, r); t.Margin = new Padding(0, 0, 0, UI.Px(2));
        cot.Controls.Add(t);
        if (phu != null) { var p = UI.Text(phu, 9.75f, false, UI.Muted, r); p.Margin = Padding.Empty; cot.Controls.Add(p); }
        // canh giữa theo chiều cao viên
        cot.Margin = new Padding(0, Math.Max(0, (v.Height - cot.PreferredSize.Height) / 2), 0, 0);
        hang.Controls.Add(cot);
        return hang;
    }

    /// <summary>Grow (84 px) + bong bóng nói: câu đậm + dòng nhỏ (thiết kế «.rob .bong»).</summary>
    public static FlowLayoutPanel RobNoi(string rob, string cau, string? nho, int rong)
    {
        var hang = Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(12));
        var h = KhoiThietKe.Rob(rob, 84);
        h.Margin = new Padding(0, 0, UI.Px(10), 0);
        hang.Controls.Add(h);
        var r = rong - h.Width - h.Margin.Horizontal;
        var bong = new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(20),
            Padding = VeThe.Pad(UI.Px(14), UI.Px(10), UI.Px(14), UI.Px(10)), MinimumSize = new Size(r, 0), MaximumSize = new Size(r, 0),
        };
        var rc = r - bong.Padding.Horizontal;
        var a = UI.Text(cau, 10.5f, true, UI.Ink, rc); a.Margin = Padding.Empty;
        bong.Controls.Add(a);
        if (nho != null) { var b = UI.Text(nho, 9.4f, false, UI.Muted, rc); b.Margin = new Padding(0, UI.Px(3), 0, 0); bong.Controls.Add(b); }
        bong.Margin = new Padding(0, Math.Max(0, (h.Height - bong.PreferredSize.Height) / 2), 0, 0);
        hang.Controls.Add(bong);
        return hang;
    }

    /// <summary>Dòng icon nhỏ (24) + chữ (thiết kế «.the» một dòng: «Tính vào giờ chơi», «CapCut vẫn khoá trên máy này»).</summary>
    public static FlowLayoutPanel DongIcon(string icon, string chu, int rong, bool dam = true, Color? mau = null)
    {
        var hang = Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(8));
        var v = new ClayIcon { Size = new Size(UI.Px(40), UI.Px(40)), MauVien = Clay.The, Hinh = Anh3D.Icon(icon), Margin = new Padding(0, 0, UI.Px(10), 0) };
        hang.Controls.Add(v);
        var t = UI.Text(chu, 10.5f, dam, mau ?? UI.Ink, rong - v.Width - v.Margin.Horizontal);
        t.Margin = new Padding(0, Math.Max(0, (v.Height - t.PreferredHeight) / 2), 0, 0);
        hang.Controls.Add(t);
        return hang;
    }

    /// <summary>Hàng chip có xuống dòng (thiết kế «.chips»).</summary>
    public static FlowLayoutPanel Chips(int rong, params Control[] chips)
    {
        var f = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.LeftToRight, WrapContents = true,
            BackColor = Color.Transparent, MaximumSize = new Size(rong, 0), Margin = new Padding(0, 0, 0, UI.Px(12)),
        };
        foreach (var c in chips) f.Controls.Add(c);
        return f;
    }

    /// <summary>Nút Clay rộng hết hộp, có icon 3D (thiết kế «.nut chinh / .nut phu», cao 48).</summary>
    public static Button Nut(string chu, bool chinh, int rong, string? icon = null, int than = 48, float pt = 12f)
    {
        var b = UI.Btn(chu, chinh, rong);
        b.Height = UI.Px(than) + VeNut.LeBong.Vertical;
        b.Font = UI.F(pt, FontStyle.Bold);
        if (icon != null) b.Image = Anh3D.Icon(icon);
        b.Margin = new Padding(0, 0, 0, UI.Px(6));
        return b;
    }

    /// <summary>Liên kết chữ đậm (thiết kế «.lk»): icon 3D nhỏ + chữ ngọc, bấm được, vùng bấm ≥44.</summary>
    public static FlowLayoutPanel LienKet(string chu, string? icon, Action bam, float pt = 10.5f, Color? mau = null)
    {
        var hang = Hang();
        hang.Cursor = Cursors.Hand;
        hang.MinimumSize = new Size(0, UI.Px(44));
        hang.Margin = new Padding(0, 0, UI.Px(16), 0);
        var co = (int)Math.Round(pt * 1.75f);
        if (icon != null)
        {
            var v = new ClayIcon { Size = new Size(UI.Px(co + 6), UI.Px(co + 6)), MauVien = Color.Transparent, Hinh = Anh3D.Icon(icon), Margin = new Padding(0, UI.Px(8), UI.Px(4), 0), Cursor = Cursors.Hand };
            v.Click += (_, _) => bam();
            hang.Controls.Add(v);
        }
        var t = UI.Text(chu, pt, true, mau ?? Clay.NgocInk, UI.Px(520));
        t.Margin = new Padding(0, UI.Px(co / 2), 0, 0);
        t.Cursor = Cursors.Hand;
        t.Click += (_, _) => bam();
        hang.Controls.Add(t);
        hang.Click += (_, _) => bam();
        return hang;
    }

    public static FlowLayoutPanel Hang() => new()
    {
        AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.LeftToRight, WrapContents = false,
        BackColor = Color.Transparent, Margin = Padding.Empty,
    };

    public static FlowLayoutPanel Cot() => new()
    {
        AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
        BackColor = Color.Transparent, Margin = Padding.Empty,
    };

    /// <summary>Đặt hộp vào góc phải dưới vùng làm việc (nhắc 5 phút).</summary>
    public static void GocPhaiDuoi(Form f)
    {
        var wa = Screen.PrimaryScreen!.WorkingArea;
        f.Location = new Point(wa.Right - f.Width - UI.Px(12), wa.Bottom - f.Height - UI.Px(12));
    }
}

/// <summary>Chip bo tròn cao 30 (thiết kế «.chip»): nền nhạt + chữ đậm 13px, có thể có chấm cam «đang chờ» hoặc icon 3D 18px.</summary>
internal sealed class ChipClay : Control
{
    private readonly NenCache _nen;
    public Image? Hinh { get; set; }
    public bool ChamCho { get; set; }

    public ChipClay(string chu, Color nen, Color mauChu, Image? hinh = null, bool chamCho = false)
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                 | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
        Text = chu; Hinh = hinh; ChamCho = chamCho;
        MauNen = nen; ForeColor = mauChu;
        Font = UI.F(9.75f, FontStyle.Bold);
        _nen = new NenCache(this, InvokePaintBackground, InvokePaint);
        Margin = new Padding(0, 0, UI.Px(6), UI.Px(6));
        DoCo();
    }

    public Color MauNen { get; set; }

    private int TruocChu => ChamCho ? UI.Px(14) : Hinh != null ? UI.Px(24) : 0;

    private void DoCo()
    {
        var w = TextRenderer.MeasureText(Text, Font).Width;
        Size = new Size(UI.Px(12) + TruocChu + w + UI.Px(10), UI.Px(30));
    }

    protected override void OnTextChanged(EventArgs e) { base.OnTextChanged(e); DoCo(); Invalidate(); }
    protected override void OnPaintBackground(PaintEventArgs e) => _nen.Ve(e);

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var r = new RectangleF(0, 0, Width - 1, Height - 1);
        using (var p = Clay.Bo(r, r.Height / 2))
        using (var b = new SolidBrush(MauNen)) g.FillPath(b, p);
        var x = (float)UI.Px(12);
        if (ChamCho)
        {
            using var b = new SolidBrush(Color.FromArgb(0xe8, 0x89, 0x0c));
            g.FillEllipse(b, x, (Height - UI.Px(8)) / 2f, UI.Px(8), UI.Px(8));
        }
        else if (Hinh != null) Clay.VeHinh(g, new RectangleF(x, (Height - UI.Px(18)) / 2f, UI.Px(18), UI.Px(18)), Hinh, 1f);
        TextRenderer.DrawText(g, Text, Font, new Rectangle((int)x + TruocChu, 0, Width - (int)x - TruocChu, Height), ForeColor,
            TextFormatFlags.VerticalCenter | TextFormatFlags.Left | TextFormatFlags.NoPadding | TextFormatFlags.SingleLine);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _nen.Dispose();
        base.Dispose(disposing);
    }
}

/// <summary>Lớp phủ tối (thiết kế «#phu» rgba(8,14,12,.55)) sau hộp chặn — đóng cùng hộp. Không chặn bàn phím của hộp, không hiện trên taskbar.</summary>
internal sealed class ManPhu : Form
{
    public ManPhu()
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.FromArgb(8, 14, 12);
        Opacity = 0.55;
        TopMost = true;
        Bounds = Screen.PrimaryScreen!.Bounds;
        Text = "AiiGrow";
    }

    protected override bool ShowWithoutActivation => true;
}
