using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Khung hộp nhỏ chung của khay (thiết kế chốt 05/11): nền giấy, một cột nội dung, cỡ theo nội dung.</summary>
internal abstract class HopKhayCoBan : Form
{
    protected readonly FlowLayoutPanel Flow;
    protected readonly int W;

    protected HopKhayCoBan(string tieuDe, int rong)
    {
        AiiGrow.ClayUi.Clay.KhongMnemonic(this);
        W = rong;
        Text = tieuDe;
        Icon = UI.AppIcon();
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true; ShowInTaskbar = false;
        BackColor = UI.Paper;
        AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;
        Flow = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(20), UI.Px(16), UI.Px(20), UI.Px(14)), Margin = Padding.Empty, BackColor = UI.Paper,
        };
        Controls.Add(Flow);
    }

    protected void XoaHet()
    {
        Flow.SuspendLayout();
        foreach (Control c in Flow.Controls.Cast<Control>().ToList()) { Flow.Controls.Remove(c); c.Dispose(); }
    }

    protected void Xong() => Flow.ResumeLayout(true);
}

/// <summary>Hộp báo một dòng (icon 3D + tiêu đề + câu phụ + nút Đóng) — dùng trên màn khoá thay bóng báo (bị ẩn khi màn khoá toàn màn hình).</summary>
internal sealed class HopThongBao : HopKhayCoBan
{
    private readonly bool _khongCuopPhim;

    /// <param name="chuNut">null = «Về màn khoá» (hộp trên màn khoá); #822: hộp báo bé đổi trạng thái dùng «Đã hiểu».</param>
    /// <param name="khongCuopPhim">true = hiện không giành phím của game / bài đang làm.</param>
    /// <param name="tuDongDong">Hộp không giành phím tự đóng sau chừng này (mặc định 30 giây).</param>
    public HopThongBao(string icon, string tieu, string phu, string? chuNut = null, bool khongCuopPhim = false, TimeSpan? tuDongDong = null) : base("AiiGrow", UI.Px(340))
    {
        _khongCuopPhim = khongCuopPhim;
        Flow.Controls.Add(KhoiCon.Dau(icon, icon == "tick" ? KhoiCon.Mau.Ngoc : KhoiCon.Mau.Cam, tieu, phu, W));
        var ok = KhoiCon.Nut(chuNut ?? ManKhoaView.VeManKhoa, false, W, chuNut == null ? "khoa" : "tick");
        ok.Click += (_, _) => Close();
        Flow.Controls.Add(ok);
        CancelButton = ok;
        if (khongCuopPhim)
        {
            // không giành phím nên Esc không tới được: tự đóng (mặc định 30 giây), không để hộp cũ chồng lên game / bài đang làm.
            // #823: hộp «Ba Mẹ khoá / mở máy» ở lâu hơn (bé không nhìn đúng lúc là mất); hộp mới vẫn thay hộp cũ, không chồng
            var tat = new System.Windows.Forms.Timer { Interval = (int)(tuDongDong ?? TimeSpan.FromSeconds(30)).TotalMilliseconds };
            tat.Tick += (_, _) => { tat.Stop(); if (!IsDisposed) Close(); };
            Shown += (_, _) => tat.Start();
            FormClosed += (_, _) => tat.Dispose();
        }
    }

    protected override bool ShowWithoutActivation => _khongCuopPhim;
}

/// <summary>Nhắc «Còn 5 sao = 5 phút chơi» góc phải dưới (them-da3zy02w): Làm nhiệm vụ kiếm sao / Xin Ba Mẹ cho vay sao. Tự tắt sau 30 giây.</summary>
internal sealed class NhacSaoForm : HopKhayCoBan
{
    public event Action? LamNhiemVu;
    public event Action? XinVay;

    public NhacSaoForm(int conSao, string? app) : base("AiiGrow · bây giờ", UI.Px(368))
    {
        StartPosition = FormStartPosition.Manual;
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        Flow.Padding = new Padding(UI.Px(16), UI.Px(10), UI.Px(16), UI.Px(10));
        Flow.Controls.Add(KhoiCon.Dau("dong_ho_cat", KhoiCon.Mau.Vang, NhacSaoView.Tieu(conSao), NhacSaoView.Phu(app), W));
        var lam = KhoiCon.Nut(NhacSaoView.LamNhiemVu, true, W, "tick");
        lam.Click += (_, _) => { LamNhiemVu?.Invoke(); Close(); };
        Flow.Controls.Add(lam);
        var xin = KhoiCon.Nut(NhacSaoView.XinVay, false, W, "gui");
        xin.Click += (_, _) => { XinVay?.Invoke(); Close(); };
        Flow.Controls.Add(xin);
        Load += (_, _) => KhoiCon.GocPhaiDuoi(this);
        var tat = new System.Windows.Forms.Timer { Interval = 30_000 };
        tat.Tick += (_, _) => { tat.Stop(); if (!IsDisposed) Close(); };
        Shown += (_, _) => tat.Start();
        FormClosed += (_, _) => tat.Dispose();
    }

    protected override bool ShowWithoutActivation => true;   // không cướp phím của game / bài Con đang làm
}

/// <summary>Nội dung «Đã lưu lời xin» lúc mất mạng (them-a86wn24i, them-dsrf5ift, them-rn7iaunn) — dùng chung cho màn khoá, hộp xin vay.</summary>
internal static class HopDaLuu
{
    /// <param name="lui">#307 them-rn7iaunn: «‹ Lùi» về màn trước cạnh nút chính (null = không có).</param>
    /// <param name="luc">Lúc LƯU lời xin («vừa xong · HH:mm») — null = bây giờ (vừa lưu).</param>
    /// <param name="iconNut">Icon nút chính («nha» Về Hôm nay / «khoa» Về màn khoá).</param>
    public static void Ve(FlowLayoutPanel flow, int w, string tieu, string dong, int choMang, Action ve, string chuNut, string icon = "gui", Action? lui = null, string? phu = null,
        DateTimeOffset? luc = null, string iconNut = "nha")
    {
        // Bàn them-a86wn24i / them-dsrf5ift / them-rn7iaunn: tiêu đề ngọc · thẻ trắng «Chờ có mạng (n)» + dòng lời xin (vừa xong · HH:mm) · nút chính
        var dau = KhoiCon.Dau("tick", KhoiCon.Mau.Ngoc, tieu, phu ?? XinVayView.DaLuuPhu, w);
        foreach (Control c in dau.Controls) if (c is FlowLayoutPanel cot && cot.Controls.Count > 0) cot.Controls[0].ForeColor = Clay.NgocInk;
        flow.Controls.Add(dau);
        flow.Controls.Add(TheCho(w, choMang, icon, dong, $"vừa xong · {(luc ?? DateTimeOffset.Now).ToLocalTime():HH:mm}"));
        flow.Controls.Add(UI.Text(ManChanView.KhongCanGuiLai, 9.75f, false, UI.Muted, w));
        var hang = KhoiCon.Hang();
        var b = KhoiCon.Nut(chuNut, true, lui != null ? w * 2 / 3 : w, iconNut);
        b.Click += (_, _) => ve();
        hang.Controls.Add(b);
        if (lui != null)
        {
            var l = KhoiCon.LienKet("‹ Lùi", null, lui);
            l.Margin = new Padding(UI.Px(14), 0, 0, 0);
            hang.Controls.Add(l);
        }
        flow.Controls.Add(hang);
    }

    /// <summary>Thẻ trắng [«Chờ có mạng (n)»] + một dòng (icon · tiêu đề đậm / dòng phụ). <paramref name="choMang"/> null = không có dòng «Chờ có mạng».</summary>
    public static ClayFlow TheCho(int w, int? choMang, string icon, string tieu, string phu)
    {
        var the = new ClayFlow
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(18),
            BackColor = Clay.NenSang, Padding = VeThe.Pad(UI.Px(14), UI.Px(10), UI.Px(14), UI.Px(8)),
            MinimumSize = new Size(w, 0), MaximumSize = new Size(w, 0), Margin = new Padding(0, 0, 0, UI.Px(10)),
        };
        var r = w - the.Padding.Horizontal - UI.Px(2);
        if (choMang is int c)
        {
            var n = UI.Text(ManChanView.ChoCoMang(c), 10.5f, true, Clay.Canh, r); n.Margin = new Padding(0, 0, 0, UI.Px(6));
            the.Controls.Add(n);
        }
        the.Controls.Add(KhoiThietKe.Dong(icon, tieu, phu, r, false, 32, 10.5f));
        return the;
    }

    /// <summary>Hộp riêng (màn khoá mất mạng › «Xin Ba Mẹ cho vay sao»).</summary>
    public static Form Hop(string tieu, string dong, int choMang, string chuNut, string icon = "gui", string iconNut = "nha")
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
        Ve(flow, UI.Px(340), tieu, dong, choMang, f.Close, chuNut, icon, iconNut: iconNut);
        f.Controls.Add(flow);
        return f;
    }
}

/// <summary>«Hỏi AiiGrow» (con-mat-mang 10): mỗi thẻ một lỗi hay gặp + cách sửa; cuối «Gọi Ba Mẹ giúp».</summary>
internal sealed class HoiAiiGrowForm : HopKhayCoBan
{
    /// <summary>Mã hành động <see cref="HoiAiiGrowView.The"/> (thu_lai | ma_mo | bat_lai | cap_nhat) hoặc «goi_ba_me».</summary>
    public event Action<string>? Chon;

    public HoiAiiGrowForm() : base("AiiGrow · Hỏi AiiGrow", UI.Px(388))
    {
        // Bàn them-yzos9w9i: nút tròn «‹» (về màn «AiiGrow bị trục trặc») · đầu hộp · lưới 2 × 2 thẻ
        var dau = KhoiCon.Hang();
        var lui = KhoiCon.Nut("‹", false, UI.Px(40) + VeNut.LeBong.Horizontal, null, 36, 12f);
        lui.Margin = new Padding(0, UI.Px(8), UI.Px(8), 0);
        lui.Click += (_, _) => Close();
        dau.Controls.Add(lui);
        dau.Controls.Add(KhoiCon.Dau("dau_hoi", KhoiCon.Mau.Trang, HoiAiiGrowView.Tieu, HoiAiiGrowView.Phu, W - lui.Width - lui.Margin.Horizontal));
        Flow.Controls.Add(dau);
        var luoi = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.LeftToRight, WrapContents = true,
            // hai thẻ (rongThe + lề phải 8) mỗi hàng: tối đa W + 8 + chút dư — trước đây W + 4 làm thẻ thứ hai rớt dòng (lưới 1 cột)
            BackColor = Color.Transparent, MaximumSize = new Size(W + UI.Px(12), 0), Margin = new Padding(0, 0, 0, UI.Px(6)),
        };
        var rongThe = (W - UI.Px(8)) / 2;
        foreach (var (ma, icon, tieu, phu) in HoiAiiGrowView.The)
        {
            var the = new ClayFlow
            {
                FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(20), Cursor = Cursors.Hand,
                Size = new Size(rongThe, UI.Px(138)), Padding = VeThe.Pad(UI.Px(12), UI.Px(10), UI.Px(12), UI.Px(8)), Margin = new Padding(0, 0, UI.Px(8), UI.Px(8)),
            };
            var v = new ClayIcon { Size = new Size(UI.Px(40), UI.Px(40)), MauVien = Color.Transparent, Hinh = Anh3D.Icon(icon), Margin = new Padding(0, 0, 0, UI.Px(4)) };   // Bàn: icon 3D trơn, không viên
            var rc = rongThe - the.Padding.Horizontal;
            var a = UI.Text(tieu, 10.5f, true, UI.Ink, rc); a.Margin = Padding.Empty;
            var b = UI.Text(phu, 9.4f, false, UI.Muted, rc); b.Margin = Padding.Empty;
            the.Controls.Add(v); the.Controls.Add(a); the.Controls.Add(b);
            foreach (Control c in new Control[] { the, v, a, b }) c.Click += (_, _) => { Chon?.Invoke(ma); Close(); };
            luoi.Controls.Add(the);
        }
        Flow.Controls.Add(luoi);
        var goi = KhoiCon.Nut(HoiAiiGrowView.GoiBaMe, true, W, "tin");
        goi.Click += (_, _) => { Chon?.Invoke("goi_ba_me"); Close(); };
        Flow.Controls.Add(goi);
    }
}

/// <summary>«Kiểm tra cập nhật» (con-mat-mang 17, 19): hỏi dịch vụ ⇒ có bản mới (Cập nhật để sửa lỗi / Để sau) hoặc đã là bản mới nhất.</summary>
internal sealed class CapNhatKhayForm : HopKhayCoBan
{
    public event Action? VeHomNay;

    /// <param name="kiemNgay">false = không hỏi dịch vụ (công cụ chụp màn dựng thẳng từng bước).</param>
    public CapNhatKhayForm(bool kiemNgay = true) : base("AiiGrow · Cập nhật", UI.Px(388))
    {
        VeDangKiem();
        if (kiemNgay) Shown += async (_, _) => await KiemAsync();
    }

    private void VeDangKiem()
    {
        XoaHet();
        Flow.Controls.Add(KhoiCon.Dau("tai", KhoiCon.Mau.Ngoc, CapNhatKhayView.DangKiem, null, W));
        Xong();
    }

    private async Task KiemAsync()
    {
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.KiemCapNhat });
        if (IsDisposed) return;
        XoaHet();
        if (!r.Ok)
        {
            Flow.Controls.Add(KhoiCon.Dau("canh_bao", KhoiCon.Mau.Cam, CapNhatKhayView.KhongKiemDuoc, CauLoi.HienDuoc(r.Error) ? r.Error : null, W));   // #688
            var dong = KhoiCon.Nut("Đóng", false, W);
            dong.Click += (_, _) => Close();
            Flow.Controls.Add(dong);
        }
        else if (!string.IsNullOrEmpty(r.Message)) VeCoBanMoi(r.Message!);
        else VeMoiNhat(r.Status ?? TuCapNhat.BanHienTai().ToString(3));
        Xong();
    }

    private void VeCoBanMoi(string ban)
    {
        Flow.Controls.Add(KhoiCon.Dau("tai", KhoiCon.Mau.Ngoc, CapNhatKhayView.CoBanMoiTieu, CapNhatKhayView.CoBanMoiPhu(ban), W));
        // Bàn them-yx0id8do: thẻ trắng (khiên · «Phút chơi, sao và luật giữ nguyên.» / «Mất khoảng 1 phút…») · hai nút ngang
        var the = HopDaLuu.TheCho(W, null, "khien", CapNhatKhayView.GiuNguyen, CapNhatKhayView.MotPhut);
        Flow.Controls.Add(the);
        var hai = KhoiCon.Hang();
        var cap = KhoiCon.Nut(CapNhatKhayView.NutCapNhat, true, W * 3 / 5, "tai");
        cap.Margin = new Padding(0, 0, UI.Px(10), 0);
        cap.Click += async (_, _) =>
        {
            cap.Enabled = false;
            await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.CapNhatNgay });
            if (IsDisposed) return;
            XoaHet();
            Flow.Controls.Add(KhoiCon.Dau("tai", KhoiCon.Mau.Ngoc, CapNhatKhayView.DangTieu, CapNhatKhayView.DangPhu, W));
            Flow.Controls.Add(KhoiCon.RobNoi("cho", CapNhatKhayView.GiuNguyen, null, W));
            var ok = KhoiCon.Nut("Đóng", false, W);
            ok.Click += (_, _) => Close();
            Flow.Controls.Add(ok);
            Xong();
        };
        hai.Controls.Add(cap);
        var sau = KhoiCon.Nut(CapNhatKhayView.DeSau, false, W - W * 3 / 5 - UI.Px(10));
        sau.Margin = Padding.Empty;
        sau.Click += (_, _) => Close();
        hai.Controls.Add(sau);
        Flow.Controls.Add(hai);
    }

    private void VeMoiNhat(string ban)
    {
        Flow.Controls.Add(KhoiCon.RobNoi("xong", CapNhatKhayView.MoiNhatTieu, CapNhatKhayView.MoiNhatPhu(ban), W));
        Flow.Controls.Add(UI.Text(CapNhatKhayView.NhuCu, 10f, false, UI.Muted, W));
        Flow.Controls.Add(UI.Text(CapNhatKhayView.OKhay, 10f, true, Clay.NgocInk, W));
        var ve = KhoiCon.Nut(CapNhatKhayView.VeHomNay, true, W, "nha");
        ve.Click += (_, _) => { VeHomNay?.Invoke(); Close(); };
        Flow.Controls.Add(ve);
    }
}
