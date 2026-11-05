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

/// <summary>Nhắc «Còn 5 phút chơi» góc phải dưới (con-het-gio 05, 400×236): đổi 10 sao lấy 10 phút / xin Ba Mẹ thêm giờ. Tự tắt sau 30 giây.</summary>
internal sealed class NhacGioForm : HopKhayCoBan
{
    public event Action? DoiSao;
    public event Action? XinThemGio;

    public NhacGioForm(int? sao, bool doiSaoDuoc) : base("AiiGrow · bây giờ", UI.Px(368))
    {
        StartPosition = FormStartPosition.Manual;
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        Flow.Padding = new Padding(UI.Px(16), UI.Px(10), UI.Px(16), UI.Px(10));
        Flow.Controls.Add(KhoiCon.Dau("dong_ho_cat", KhoiCon.Mau.Trang, NhacGioView.Tieu, NhacGioView.Phu(sao), W));
        if (doiSaoDuoc && (sao is null or >= 10))
        {
            var doi = KhoiCon.Nut(ManKhoaView.NutDoiSao, true, W, "sao");
            doi.Click += (_, _) => { DoiSao?.Invoke(); Close(); };
            Flow.Controls.Add(doi);
        }
        var xin = KhoiCon.Nut(NhacGioView.XinThemGio, !doiSaoDuoc, W, "gui");
        xin.Click += (_, _) => { XinThemGio?.Invoke(); Close(); };
        Flow.Controls.Add(xin);
        Load += (_, _) => KhoiCon.GocPhaiDuoi(this);
        var tat = new System.Windows.Forms.Timer { Interval = 30_000 };
        tat.Tick += (_, _) => { tat.Stop(); if (!IsDisposed) Close(); };
        Shown += (_, _) => tat.Start();
        FormClosed += (_, _) => tat.Dispose();
    }

    protected override bool ShowWithoutActivation => true;   // không cướp phím của game / bài Con đang làm
}

/// <summary>«Hỏi AiiGrow» (con-mat-mang 10): mỗi thẻ một lỗi hay gặp + cách sửa; cuối «Gọi Ba Mẹ giúp».</summary>
internal sealed class HoiAiiGrowForm : HopKhayCoBan
{
    /// <summary>Mã hành động <see cref="HoiAiiGrowView.The"/> (thu_lai | ma_mo | bat_lai | cap_nhat) hoặc «goi_ba_me».</summary>
    public event Action<string>? Chon;

    public HoiAiiGrowForm() : base("AiiGrow · Hỏi AiiGrow", UI.Px(388))
    {
        Flow.Controls.Add(KhoiCon.Dau("dau_hoi", KhoiCon.Mau.Ngoc, HoiAiiGrowView.Tieu, HoiAiiGrowView.Phu, W));
        var luoi = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.LeftToRight, WrapContents = true,
            BackColor = Color.Transparent, MaximumSize = new Size(W + UI.Px(4), 0), Margin = new Padding(0, 0, 0, UI.Px(6)),
        };
        var rongThe = (W - UI.Px(8)) / 2;
        foreach (var (ma, icon, tieu, phu) in HoiAiiGrowView.The)
        {
            var the = new ClayFlow
            {
                FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(20), Cursor = Cursors.Hand,
                Size = new Size(rongThe, UI.Px(118)), Padding = VeThe.Pad(UI.Px(12), UI.Px(10), UI.Px(12), UI.Px(8)), Margin = new Padding(0, 0, UI.Px(8), UI.Px(8)),
            };
            var v = KhoiThietKe.Vien(icon, 40); v.Margin = new Padding(0, 0, 0, UI.Px(4));
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
            Flow.Controls.Add(KhoiCon.Dau("canh_bao", KhoiCon.Mau.Cam, CapNhatKhayView.KhongKiemDuoc, r.Error, W));
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
        Flow.Controls.Add(KhoiCon.DongIcon("khien", CapNhatKhayView.GiuNguyen, W));
        Flow.Controls.Add(UI.Text(CapNhatKhayView.MotPhut, 9.75f, false, UI.Muted, W));
        var cap = KhoiCon.Nut(CapNhatKhayView.NutCapNhat, true, W, "tai");
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
        Flow.Controls.Add(cap);
        var sau = KhoiCon.Nut(CapNhatKhayView.DeSau, false, W);
        sau.Click += (_, _) => Close();
        Flow.Controls.Add(sau);
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
