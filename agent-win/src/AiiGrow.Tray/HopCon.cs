using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Hộp kết quả của app Con (thiết kế chốt 05/11: con-xin 04/06/08/25/27, con-ngay-thuong 07/09/11/12/26/28): đầu hộp (icon 3D + tiêu đề),
/// chip lớn (+10 sao / +20 phút), dòng chữ, lời nhắn của Ba Mẹ, các nút nói rõ kết quả. Dựng kiểu chuỗi: <c>new KetQuaHop(…).Dau(…).Chip(…).Nut(…)</c>.
/// </summary>
internal sealed class KetQuaHop : HopKhayCoBan
{
    public KetQuaHop(string tieuCuaSo) : base("AiiGrow · " + tieuCuaSo, UI.Px(425)) { }

    public KetQuaHop Dau(string icon, KhoiCon.Mau mau, string tieu, string? phu = null)
    {
        Flow.Controls.Add(KhoiCon.Dau(icon, mau, tieu, phu, W));
        return this;
    }

    /// <summary>Chip lớn: «+10 sao» (vàng) / «+20 phút» (ngọc) + dòng bên cạnh («30 → 40 sao»).</summary>
    public KetQuaHop Chip(string chu, bool vang, string? canh = null)
    {
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(10));
        var c = vang ? KhoiApp.ChipSao(chu) : new ChipClay(chu, Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon("dongho"));
        c.Font = UI.F(13f, FontStyle.Bold);
        c.Size = new Size(c.Width + UI.Px(16), UI.Px(38));
        hang.Controls.Add(c);
        if (canh != null)
        {
            var l = UI.Text(canh, 13f, true, vang ? Clay.DiemInk : Clay.NgocInk, W - c.Width - UI.Px(20));
            l.Margin = new Padding(UI.Px(8), UI.Px(9), 0, 0);
            hang.Controls.Add(l);
        }
        Flow.Controls.Add(hang);
        return this;
    }

    public KetQuaHop Dong(string chu, bool dam = false, Color? mau = null)
    {
        var l = UI.Text(chu, 11f, dam, mau ?? UI.Muted, W);
        l.Margin = new Padding(0, 0, 0, UI.Px(8));
        Flow.Controls.Add(l);
        return this;
    }

    public KetQuaHop DongIcon(string icon, string chu)
    {
        Flow.Controls.Add(KhoiCon.DongIcon(icon, chu, W));
        return this;
    }

    /// <summary>Lời nhắn của Ba Mẹ: thẻ «Mẹ Lan · «…»».</summary>
    public KetQuaHop Loi(string nguoi, string? cau)
    {
        if (string.IsNullOrWhiteSpace(cau)) return this;
        var the = KhoiApp.The(W + VeThe.LeBong.Horizontal, le: 14);
        the.Margin = new Padding(0, 0, 0, UI.Px(8));
        var r = KhoiApp.TrongThe(W + VeThe.LeBong.Horizontal, 14);
        var a = UI.Text(nguoi, 10.5f, true, Clay.NgocInk, r); a.Margin = new Padding(0, 0, 0, UI.Px(2));
        var b = UI.Text("«" + cau.Trim().Trim('«', '»') + "»", 11.5f, false, Clay.Chu2, r);
        the.Controls.Add(a); the.Controls.Add(b);
        Flow.Controls.Add(the);
        return this;
    }

    public KetQuaHop Nut(string chu, bool chinh, string? icon, Action? bam)
    {
        var b = KhoiCon.Nut(chu, chinh, W, icon);
        b.Click += (_, _) => { Close(); bam?.Invoke(); };
        Flow.Controls.Add(b);
        return this;
    }

    public KetQuaHop LienKet(string chu, string? icon, Action? bam)
    {
        Flow.Controls.Add(KhoiCon.LienKet(chu, icon, () => { Close(); bam?.Invoke(); }));
        return this;
    }

    /// <summary>Dòng chữ nhỏ canh giữa ở cuối hộp.</summary>
    public KetQuaHop Chan(string chu)
    {
        var l = UI.Text(chu, 10f, false, UI.Muted, W);
        l.Margin = new Padding(0, UI.Px(4), 0, 0);
        Flow.Controls.Add(l);
        return this;
    }
}

/// <summary>«Ba Mẹ dùng máy?» (con-ngay-thuong 18): khoá nhanh Win + L rồi đăng nhập tài khoản của Ba Mẹ; giờ của Con không bị trừ.</summary>
internal sealed class BaMeDungMayHop : HopKhayCoBan
{
    public BaMeDungMayHop() : base("AiiGrow", UI.Px(425))
    {
        Flow.Controls.Add(KhoiCon.Dau("khoa", KhoiCon.Mau.Trang, "Ba Mẹ dùng máy?", "Khoá nhanh, rồi đăng nhập của Ba Mẹ.", W));
        var phim = KhoiCon.Hang();
        phim.Margin = new Padding(0, 0, 0, UI.Px(12));
        foreach (var (chu, i) in new[] { ("Win", 0), ("+", 1), ("L", 2) })
        {
            if (i == 1) { var c = UI.Text("+", 16f, true, UI.Muted, UI.Px(40)); c.Margin = new Padding(UI.Px(4), UI.Px(10), UI.Px(4), 0); phim.Controls.Add(c); continue; }
            var k = new ChipClay(chu, Clay.The, UI.Ink) { Font = UI.F(15f, FontStyle.Bold) };
            k.Size = new Size(Math.Max(UI.Px(64), k.Width + UI.Px(12)), UI.Px(48));
            phim.Controls.Add(k);
        }
        Flow.Controls.Add(phim);
        Flow.Controls.Add(KhoiCon.DongIcon("khoa", "1. Khoá máy — bấm cùng lúc 2 phím", W));
        Flow.Controls.Add(KhoiCon.DongIcon("nguoi", "2. Chọn tài khoản của Ba Mẹ — đăng nhập như thường ngày", W));
        var l = UI.Text("Giờ của con không bị trừ khi Ba Mẹ dùng.", 10.5f, true, Clay.NgocInk, W);
        l.Margin = new Padding(0, UI.Px(4), 0, UI.Px(10));
        Flow.Controls.Add(l);
        var ve = KhoiCon.Nut("Về Hôm nay", true, W, "nha");
        ve.Click += (_, _) => Close();
        Flow.Controls.Add(ve);
    }
}

/// <summary>«Đổi quà bằng sao» (con-ngay-thuong 30 → 28): xác nhận gửi Ba Mẹ → «Đã gửi Ba Mẹ · chờ Ba Mẹ trao quà».</summary>
internal sealed class DoiQuaHop : HopKhayCoBan
{
    private readonly HvQua _qua;
    private readonly int _sao;
    private readonly Label _loi;
    private bool _busy;

    /// <summary>Đổi xong (để app tải lại «Sao & quà»).</summary>
    public event Action? DaDoi;
    /// <summary>«Làm thêm sao» ⇒ mở mục Nhiệm vụ.</summary>
    public event Action? LamThemSao;

    public DoiQuaHop(HvQua qua, int sao) : base("AiiGrow · Đổi quà", UI.Px(425))
    {
        _qua = qua; _sao = sao;
        _loi = UI.Text("", 10.5f, true, UI.Error, W);
        VeXacNhan();
    }

    private void VeXacNhan()
    {
        XoaHet();
        Flow.Controls.Add(KhoiCon.LienKet("‹ Sao & quà", null, Close));
        Flow.Controls.Add(KhoiCon.Dau(AppConView.IconQua(_qua), KhoiCon.Mau.Vang, _qua.Ten, null, W));
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(10));
        hang.Controls.Add(KhoiApp.ChipSao(AppConView.Sao(_sao)));
        var mui = UI.Text("→", 14f, true, UI.Muted, UI.Px(40)); mui.Margin = new Padding(UI.Px(6), UI.Px(2), UI.Px(6), 0);
        hang.Controls.Add(mui);
        var con = UI.Text("còn " + AppConView.Sao(Math.Max(0, _sao - _qua.SoSao)), 12f, true, Clay.DiemInk, UI.Px(160)); con.Margin = new Padding(0, UI.Px(4), 0, 0);
        hang.Controls.Add(con);
        Flow.Controls.Add(hang);
        Flow.Controls.Add(UI.Text("Ba Mẹ trao quà thì mới trừ sao", 10.5f, false, UI.Muted, W));
        var gui = KhoiCon.Nut($"Gửi Ba Mẹ: đổi {_qua.SoSao} sao", true, W, "gui");
        gui.Click += async (_, _) => await GuiAsync(gui);
        Flow.Controls.Add(gui);
        var khac = KhoiCon.Nut("Chọn quà khác", false, W, "qua");
        khac.Click += (_, _) => Close();
        Flow.Controls.Add(khac);
        Flow.Controls.Add(KhoiCon.LienKet("Làm thêm sao", "tick", () => { Close(); LamThemSao?.Invoke(); }));
        Flow.Controls.Add(_loi);
        Xong();
    }

    private async Task GuiAsync(Button b)
    {
        if (_busy) return;
        _busy = true; b.Enabled = false; _loi.Text = "";
        var (kq, loi) = await HvApi.PostAsync<HvDoiKq>($"hoc-vien/doi/{_qua.Id}");
        _busy = false;
        if (IsDisposed) return;
        if (kq == null) { _loi.Text = loi ?? "Chưa gửi được. Con thử lại nhé."; b.Enabled = true; return; }
        DaDoi?.Invoke();
        XoaHet();
        Flow.Controls.Add(KhoiCon.Dau("gui", KhoiCon.Mau.Ngoc, "Đã gửi Ba Mẹ", "Chờ Ba Mẹ trao quà…", W));
        Flow.Controls.Add(KhoiApp.Dong(W + VeThe.LeBong.Horizontal, AppConView.IconQua(_qua), _qua.Ten, "Chờ Ba Mẹ trao", null, KhoiApp.ChipSao(AppConView.Sao(_qua.SoSao))));
        var ve = KhoiCon.Nut("Về Sao & quà", true, W, "sao");
        ve.Click += (_, _) => Close();
        Flow.Controls.Add(ve);
        Flow.Controls.Add(UI.Text(_qua.Phut is > 0 ? $"Ba Mẹ trao xong là con có thêm {_qua.Phut} phút" : "Ba Mẹ trao xong là máy báo con ngay", 10f, false, UI.Muted, W));
        Xong();
    }
}
