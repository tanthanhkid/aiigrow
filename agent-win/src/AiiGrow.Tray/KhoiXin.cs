using AiiGrow.ClayUi;

namespace AiiGrow.Tray;

/// <summary>
/// Khối dựng các hộp xin của Con theo Bàn thiết kế (16/11, #307 — con-xin, con-bi-chan): nút «‹» tròn quay lại, đầu hộp có Grow + cột chữ / chip,
/// bong bóng lời Ba Mẹ (thẻ trắng: tên + lời nhắn), hai nút phụ nằm ngang.
/// </summary>
internal static class KhoiXin
{
    /// <summary>Nút tròn «‹» (hoặc «✕») đầu hộp — quay lại màn trước theo data-toi của Bàn.</summary>
    public static Button NutTron(string chu, Action bam)
    {
        var b = KhoiCon.Nut(chu, false, UI.Px(40) + VeNut.LeBong.Horizontal, null, 36, 12f);
        b.Margin = new Padding(0, UI.Px(4), UI.Px(8), 0);
        b.Click += (_, _) => bam();
        return b;
    }

    /// <summary>Đầu hộp có Grow (them-luui7gvq, them-fsif1cbl, them-6tn8aozf, them-359v1pre): [‹] · Grow cao 100 · cột <paramref name="cot"/>.</summary>
    public static FlowLayoutPanel DauRob(string rob, int rong, Action? lui, params Control[] cot)
    {
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(10));
        var conLai = rong;
        if (lui != null)
        {
            var n = NutTron("‹", lui);
            hang.Controls.Add(n);
            conLai -= n.Width + n.Margin.Horizontal;
        }
        var h = KhoiThietKe.Rob(rob, 100);
        h.Margin = new Padding(0, 0, UI.Px(12), 0);
        hang.Controls.Add(h);
        conLai -= h.Width + h.Margin.Horizontal;
        var c = KhoiCon.Cot();
        foreach (var x in cot)
        {
            if (x is Label l) l.MaximumSize = new Size(Math.Max(UI.Px(120), conLai), 0);
            c.Controls.Add(x);
        }
        c.Margin = new Padding(0, Math.Max(0, (h.Height - c.PreferredSize.Height) / 2), 0, 0);
        hang.Controls.Add(c);
        return hang;
    }

    /// <summary>Chữ trong cột đầu hộp (lề dưới nhỏ).</summary>
    public static Label Chu(string chu, float pt, bool dam, Color mau)
    {
        var l = UI.Text(chu, pt, dam, mau, UI.Px(240));
        l.Margin = new Padding(0, 0, 0, UI.Px(4));
        return l;
    }

    /// <summary>Chip có icon 3D (vàng «Đang chờ Ba Mẹ», ngọc «Mẹ Lan đã thêm!»).</summary>
    public static ChipClay Chip(string chu, Color nen, Color mau, string? icon)
    {
        var c = new ChipClay(chu, nen, mau, icon != null ? Anh3D.Icon(icon) : null) { Font = UI.F(9.5f, FontStyle.Bold) };
        c.Size = new Size(TextRenderer.MeasureText(chu, c.Font).Width + UI.Px(icon != null ? 42 : 24), UI.Px(32));
        c.Margin = new Padding(0, 0, 0, UI.Px(4));
        return c;
    }

    /// <summary>Bong bóng lời Ba Mẹ: thẻ trắng — tên (ngọc, đậm nhỏ) + lời nhắn.</summary>
    public static ClayFlow BongLoi(string ten, string loi, int rong, bool ngoac = true)
    {
        var b = new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(18),
            BackColor = Color.White, Padding = VeThe.Pad(UI.Px(14), UI.Px(8), UI.Px(14), UI.Px(8)),
            MinimumSize = new Size(rong, 0), MaximumSize = new Size(rong, 0), Margin = new Padding(0, 0, 0, UI.Px(10)),
        };
        var rc = rong - b.Padding.Horizontal - UI.Px(2);
        var a = UI.Text(ten, 9.5f, true, Clay.NgocInk, rc); a.Margin = Padding.Empty;
        b.Controls.Add(a);
        var c = UI.Text(ngoac ? "«" + loi.Trim() + "»" : loi.Trim(), 10.5f, false, UI.Ink, rc); c.Margin = new Padding(0, UI.Px(2), 0, 0);
        b.Controls.Add(c);
        return b;
    }

    /// <summary>Hai nút phụ ngang nhau (them-zo8kohea «Nhắn Ba Mẹ | Về Hôm nay»).</summary>
    public static FlowLayoutPanel HaiNut(int rong, (string Chu, string? Icon, Action Bam) a, (string Chu, string? Icon, Action Bam) b)
    {
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(6));
        var nua = (rong - UI.Px(10)) / 2;
        var x = KhoiCon.Nut(a.Chu, false, nua, a.Icon, 44, 11f);
        x.Margin = new Padding(0, 0, UI.Px(10), 0);
        x.Click += (_, _) => a.Bam();
        var y = KhoiCon.Nut(b.Chu, false, nua, b.Icon, 44, 11f);
        y.Margin = Padding.Empty;
        y.Click += (_, _) => b.Bam();
        hang.Controls.Add(x);
        hang.Controls.Add(y);
        return hang;
    }
}
