using AiiGrow.ClayUi;

namespace AiiGrow.Tray;

/// <summary>
/// Khối dựng của app Con (thiết kế chốt 05/11, docs/thiet-ke-chot/con-ngay-thuong — CSS «.the», «.ic3», «.thanh», «.sao», «.b»):
/// thẻ Clay rộng cố định, viên icon 3D 52, thanh tiến độ, chip sao vàng, dòng việc (icon · tên + dòng phụ · chip / nút bên phải).
/// Dùng chung cho AppForm và các hộp của Con (RequestForm, NopBaiForm, HopCon).
/// </summary>
internal static class KhoiApp
{
    /// <summary>Thẻ Clay xếp dọc, rộng đúng <paramref name="rong"/> (đã gồm lề bóng), cao theo nội dung. <paramref name="vang"/> = thẻ sao (nền vàng).</summary>
    public static ClayFlow The(int rong, bool vang = false, int le = 20)
    {
        var lb = VeThe.LeBong;
        return new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Width = rong, MinimumSize = new Size(rong, 0), MaximumSize = new Size(rong, 0),
            BackColor = vang ? Clay.DiemSoft : Clay.The, BoGoc = UI.Px(28),
            Padding = VeThe.Pad(UI.Px(le), UI.Px(16), UI.Px(le), UI.Px(8)), Margin = new Padding(0, 0, UI.Px(8), UI.Px(6)),
        };
    }

    /// <summary>Bề rộng chữ bên trong thẻ <see cref="The"/>.</summary>
    public static int TrongThe(int rong, int le = 20) => rong - VeThe.LeBong.Horizontal - 2 * UI.Px(le) - UI.Px(2);

    /// <summary>Viên icon 3D (thiết kế «.ic3» 52 px; «.ico» 48 px viên kem trong hộp).</summary>
    public static ClayIcon Vien(string icon, int co = 52, Color? mau = null) => new()
    {
        Size = new Size(UI.Px(co), UI.Px(co)), MauVien = mau ?? Clay.The, Hinh = Anh3D.Icon(icon), Margin = new Padding(0, 0, UI.Px(12), 0),
    };

    /// <summary>Hàng: viên icon + cột (dòng nhỏ trên, dòng to dưới) — thẻ «Giờ chơi còn lại / 18 phút», «Sao của con / 30 sao».</summary>
    public static FlowLayoutPanel DauThe(string icon, string nho, string to, Color mauTo, float ptTo, int rong, Color? mauNho = null, Color? mauVien = null)
    {
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(6));
        var v = Vien(icon, 52, mauVien);
        hang.Controls.Add(v);
        var cot = KhoiCon.Cot();
        var r = rong - v.Width - v.Margin.Horizontal;
        var a = UI.Text(nho, 12f, false, mauNho ?? UI.Muted, r); a.Margin = new Padding(0, UI.Px(2), 0, 0);
        var b = UI.Text(to, ptTo, true, mauTo, r); b.Margin = Padding.Empty;
        cot.Controls.Add(a); cot.Controls.Add(b);
        hang.Controls.Add(cot);
        return hang;
    }

    /// <summary>Chip sao vàng «+10 sao» / «50 sao» (thiết kế «.sao»).</summary>
    public static ChipClay ChipSao(string chu) => new(chu, Clay.DiemSoft, Clay.DiemInk, Anh3D.Icon("sao"));

    /// <summary>Chip «Chờ duyệt» (cam, chấm chờ) / «Đã nhận» (ngọc).</summary>
    public static ChipClay ChipCho(string chu) => new(chu, Clay.CanhSoft, Clay.Canh, null, chamCho: true);
    public static ChipClay ChipNgoc(string chu) => new(chu, Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon("tick"));

    /// <summary>Nút gọn vừa chữ (thiết kế «.b.nho» cao 44): rộng theo chữ + icon.</summary>
    public static Button NutGon(string chu, bool chinh, string? icon = null, int than = 44, float pt = 11.5f)
    {
        var f = UI.F(pt, FontStyle.Bold);
        var w = TextRenderer.MeasureText(chu, f).Width + UI.Px(icon != null ? 64 : 40) + VeNut.LeBong.Horizontal;
        var b = KhoiCon.Nut(chu, chinh, w, icon, than, pt);
        b.Margin = new Padding(UI.Px(6), 0, 0, 0);
        return b;
    }

    /// <summary>Dòng một việc / một quà (thiết kế màn Nhiệm vụ, Sao & quà): icon 48 · tên (đậm) + dòng phụ · phần bên phải (chip, nút). Cao cố định.</summary>
    public static ClayCard Dong(int rong, string icon, string ten, string phu, Color? mauPhu, params Control[] phai)
    {
        var lb = VeThe.LeBong;
        var the = new ClayCard
        {
            Width = rong, Height = UI.Px(72) + lb.Vertical, BoGoc = UI.Px(24), BackColor = Clay.The,
            Padding = VeThe.Pad(UI.Px(14), UI.Px(4), UI.Px(14), UI.Px(4)), Margin = new Padding(0, 0, 0, UI.Px(4)),
        };
        var bang = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 3, RowCount = 1, BackColor = Color.Transparent, Margin = Padding.Empty };
        bang.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        bang.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        bang.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        bang.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        var v = Vien(icon, 48);
        v.Anchor = AnchorStyles.Left;
        bang.Controls.Add(v, 0, 0);
        var chu = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent, Margin = Padding.Empty };
        var a = new Label
        {
            Text = ten, Dock = DockStyle.Top, Height = UI.Px(26), AutoEllipsis = true, UseMnemonic = false, BackColor = Color.Transparent,
            Font = UI.F(13f, FontStyle.Bold), ForeColor = UI.Ink, TextAlign = ContentAlignment.BottomLeft,
        };
        var b = new Label
        {
            Text = phu, Dock = DockStyle.Top, Height = UI.Px(22), AutoEllipsis = true, UseMnemonic = false, BackColor = Color.Transparent,
            Font = UI.F(10.5f), ForeColor = mauPhu ?? UI.Muted, TextAlign = ContentAlignment.TopLeft,
        };
        chu.Controls.Add(b); chu.Controls.Add(a);   // Dock Top: thêm sau nằm trên
        chu.Padding = new Padding(0, UI.Px(8), 0, 0);
        bang.Controls.Add(chu, 1, 0);
        var ben = KhoiCon.Hang();
        ben.Anchor = AnchorStyles.Right;
        foreach (var c in phai)
        {
            if (c is ChipClay) c.Margin = new Padding(UI.Px(6), UI.Px(9), 0, 0);
            ben.Controls.Add(c);
        }
        bang.Controls.Add(ben, 2, 0);
        the.Controls.Add(bang);
        return the;
    }

    /// <summary>Nhãn mục (thiết kế «Chờ Ba Mẹ duyệt (2)», «Chưa làm (3)»).</summary>
    public static Label NhanMuc(string chu, int rong)
    {
        var l = UI.Text(chu, 12.5f, true, Clay.Chu2, rong);
        l.Margin = new Padding(UI.Px(4), UI.Px(10), 0, UI.Px(6));
        return l;
    }
}

/// <summary>Thanh tiến độ lõm (thiết kế «.thanh»: rãnh ngọc nhạt, phần đã chơi ngọc đậm, cao 14).</summary>
internal sealed class ThanhTienDo : Control
{
    private double _tiLe;
    public double TiLe { get => _tiLe; set { _tiLe = Math.Clamp(value, 0, 1); Invalidate(); } }

    public ThanhTienDo()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer
                 | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
        Height = UI.Px(14);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var r = new RectangleF(0, 0, Width - 1, Height - 1);
        using (var p = Clay.Bo(r, r.Height / 2))
        using (var b = new SolidBrush(Clay.NgocSoft)) g.FillPath(b, p);
        if (_tiLe <= 0) return;
        var w = Math.Max(r.Height, (float)(r.Width * _tiLe));
        using var p2 = Clay.Bo(new RectangleF(0, 0, w, r.Height), r.Height / 2);
        using var b2 = new SolidBrush(Clay.Ngoc);
        g.FillPath(b2, p2);
    }
}
