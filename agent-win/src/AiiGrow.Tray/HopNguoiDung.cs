using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

// Thiết kế chốt 06/11 (L13 — docs/thiet-ke-chot/con-ngay-thuong 06–08): máy dùng chung, ai đang dùng máy.

/// <summary>«Đổi bé / Đăng xuất» (con-ngay-thuong 08): viên chữ + tên bé + «● Đang dùng máy này», hai nút Đổi bé · Đăng xuất, «Ở lại».</summary>
internal sealed class DoiBeHop : HopKhayCoBan
{
    /// <summary>true = «Đổi bé», false = «Đăng xuất» (cả hai ⇒ máy về «Ai đang dùng máy?»); null = Ở lại.</summary>
    public bool? Chon { get; private set; }

    public DoiBeHop(string tenBe, bool mayRieng) : base("AiiGrow", UI.Px(400))
    {
        var v = new VienTen { Chu = DangNhapView.ChuDau(tenBe), Size = new Size(UI.Px(72), UI.Px(72)) };
        v.Margin = new Padding((W - v.Width) / 2, UI.Px(6), 0, 0);
        Flow.Controls.Add(v);
        Flow.Controls.Add(Giua(UI.Text(string.IsNullOrWhiteSpace(tenBe) ? "Con" : tenBe, 15f, true, UI.Ink, W), 8));
        Flow.Controls.Add(Giua(UI.Text("● Đang dùng máy này", 10.5f, true, Clay.NgocInk, W), 2));
        var hai = KhoiCon.Hang();
        hai.Margin = new Padding(0, UI.Px(18), 0, 0);
        var rong = mayRieng ? W : (W - UI.Px(12)) / 2;
        if (!mayRieng)
        {
            var doi = KhoiCon.Nut("Đổi bé", false, rong, "nguoi", 56, 12f);
            doi.Margin = new Padding(0, 0, UI.Px(12), 0);
            doi.Click += (_, _) => { Chon = true; Close(); };
            hai.Controls.Add(doi);
        }
        var ra = KhoiCon.Nut("Đăng xuất", false, rong, "khoa", 56, 12f);
        ra.Margin = Padding.Empty;
        ra.Click += (_, _) => { Chon = false; Close(); };
        hai.Controls.Add(ra);
        Flow.Controls.Add(hai);
        var ghi = UI.Text("Đăng xuất thì máy khoá lại.\nVào lại bằng tên + PIN.", 10.5f, false, UI.Muted, W);
        Flow.Controls.Add(Giua(ghi, 10));
        var o = KhoiCon.Nut("Ở lại", true, W, "nha", 48, 12f);
        o.Margin = new Padding(0, UI.Px(12), 0, 0);
        o.Click += (_, _) => Close();
        Flow.Controls.Add(o);
        Xong();
    }

    private Label Giua(Label l, int tren)
    {
        l.AutoSize = false; l.Width = W; l.TextAlign = ContentAlignment.TopCenter;
        l.Height = TextRenderer.MeasureText(l.Text, l.Font, new Size(W, 0), TextFormatFlags.WordBreak).Height + UI.Px(4);
        l.Margin = new Padding(0, UI.Px(tren), 0, 0);
        return l;
    }
}

/// <summary>«Ba Mẹ dùng máy» từ app của Con (con-ngay-thuong 06): Ba Mẹ gõ mã mở máy 6 số ⇒ «Ba Mẹ đang dùng máy» (không trừ giờ của con).</summary>
internal sealed class BaMeMaHop : HopKhayCoBan
{
    private readonly TextBox _o = new() { Font = UI.F(20f, FontStyle.Bold), MaxLength = 6, TextAlign = HorizontalAlignment.Center, ShortcutsEnabled = true };
    private readonly Label _loi;
    private readonly Button _mo;
    private bool _busy;

    /// <summary>Đã mở (dịch vụ trả trạng thái mới — khay áp ngay).</summary>
    public PipeResponse? KetQua { get; private set; }

    public BaMeMaHop() : base("AiiGrow · Ba Mẹ dùng máy", UI.Px(425))
    {
        Flow.Controls.Add(KhoiCon.Dau("khien", KhoiCon.Mau.Ngoc, ManChonTenView.TieuBaMe, ManChonTenView.PhuBaMe, W));
        Flow.Controls.Add(ONhapClay.Boc(_o, W, new Padding(0, 0, 0, UI.Px(8))));
        _loi = UI.Text(ManChonTenView.GhiMa, 10.5f, false, UI.Muted, W);
        Flow.Controls.Add(_loi);
        Flow.Controls.Add(KhoiCon.DongIcon("dong_ho_cat", ManChonTenView.KhongTru, W, true, Clay.NgocInk));
        _mo = KhoiCon.Nut(ManChonTenView.NutMo, true, W, "mo_khoa");
        _mo.Enabled = false;
        _mo.Click += async (_, _) => await GuiAsync();
        Flow.Controls.Add(_mo);
        var de = KhoiCon.Nut("Để sau", false, W, null);
        de.Click += (_, _) => Close();
        Flow.Controls.Add(de);
        _o.KeyPress += (_, e) => { if (!char.IsControl(e.KeyChar) && !char.IsDigit(e.KeyChar)) e.Handled = true; };
        _o.TextChanged += (_, _) => _mo.Enabled = !_busy && new string(_o.Text.Where(char.IsDigit).ToArray()).Length == MaOffline.SoChuSo;
        _o.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter && _mo.Enabled) { e.SuppressKeyPress = true; await GuiAsync(); } };
        Shown += (_, _) => _o.Focus();
        Xong();
    }

    private async Task GuiAsync()
    {
        if (_busy) return;
        _busy = true; _mo.Enabled = false; _mo.Text = "Đang mở…";
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.BaMeMo, Code = _o.Text });
        _busy = false;
        if (IsDisposed) return;
        if (r.Ok) { KetQua = r; Close(); return; }
        var st = new ManChonTenState { Buoc = BuocChonTen.BaMeMa };
        ManChonTenView.KetQuaMa(st, false, r.Status, r.ConLan, r.ChoGiay, r.Error ?? r.Message);
        _loi.Text = st.Loi;
        _loi.ForeColor = Clay.Canh;
        _loi.Font = UI.F(10.5f, FontStyle.Bold);
        _o.Text = "";
        _mo.Text = ManChonTenView.NutMo;
        _o.Focus();
    }
}

/// <summary>«Ba Mẹ đang dùng máy» (con-ngay-thuong 07): hộp nổi góc phải dưới — «Không trừ giờ của con», «Khoá lại» ⇒ máy về màn chọn tên.
/// Thu nhỏ (×) thì còn viên trên đầu màn hình + mục khay «Khoá lại».</summary>
internal sealed class BaMeDungForm : HopKhayCoBan
{
    private readonly Label _con;
    public event Action? KhoaLai;

    public BaMeDungForm() : base("AiiGrow · Ba Mẹ đang dùng máy", UI.Px(340))
    {
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        Flow.Controls.Add(KhoiCon.Dau("nguoi", KhoiCon.Mau.Ngoc, "Ba Mẹ đang dùng máy", null, W));
        Flow.Controls.Add(KhoiCon.Chips(W, new ChipClay(ManChonTenView.KhongTru.Replace("Ba Mẹ dùng thì không", "Không"), Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon("dong_ho_cat"))
            { Font = UI.F(10.5f, FontStyle.Bold), Height = UI.Px(30), Width = UI.Px(220) }));
        Flow.Controls.Add(UI.Text("Máy mở hết cho Ba Mẹ. Xong việc thì bấm «Khoá lại» — máy về màn chọn tên.", 10.5f, false, UI.Muted, W));
        _con = UI.Text("", 10f, true, Clay.NgocInk, W);
        Flow.Controls.Add(_con);
        var k = KhoiCon.Nut("Khoá lại", true, W, "khoa");
        k.Click += (_, _) => KhoaLai?.Invoke();
        Flow.Controls.Add(k);
        Xong();
        Load += (_, _) => KhoiCon.GocPhaiDuoi(this);
    }

    /// <summary>Không cướp phím của Ba Mẹ khi hộp hiện lại.</summary>
    protected override bool ShowWithoutActivation => true;

    public void Den(DateTimeOffset den) => _con.Text = DangNhapView.DangDungBaMe(den, DateTimeOffset.Now);
}

/// <summary>Viên trên đầu màn hình «Ba Mẹ đang dùng · không trừ giờ của con» (con-ngay-thuong 07) — không nhận chuột / phím.</summary>
internal sealed class BaMeVienForm : Form
{
    private const int WsExNoActivate = 0x08000000, WsExTransparent = 0x20, WsExToolWindow = 0x80;

    public BaMeVienForm()
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.FromArgb(0x0a, 0x52, 0x46);
        var chu = "Ba Mẹ đang dùng · không trừ giờ của con";
        var f = UI.F(12.75f, FontStyle.Bold);
        var w = TextRenderer.MeasureText(chu, f).Width + UI.Px(70);
        Size = new Size(w, UI.Px(44));
        var icon = new PictureBox { Image = Anh3D.Icon("nguoi"), SizeMode = PictureBoxSizeMode.Zoom, Bounds = new Rectangle(UI.Px(18), UI.Px(10), UI.Px(24), UI.Px(24)), BackColor = Color.Transparent };
        var l = new Label { Text = chu, Font = f, ForeColor = Color.White, BackColor = Color.Transparent, AutoSize = false, UseMnemonic = false,
            TextAlign = ContentAlignment.MiddleLeft, Bounds = new Rectangle(UI.Px(50), 0, w - UI.Px(56), Height) };
        Controls.Add(icon); Controls.Add(l);
        Region = Region.FromHrgn(TaoBo(Width, Height, Height));
        Load += (_, _) =>
        {
            var wa = Screen.PrimaryScreen!.WorkingArea;
            Location = new Point(wa.Left + (wa.Width - Width) / 2, wa.Top + UI.Px(24));
        };
    }

    protected override bool ShowWithoutActivation => true;

    protected override CreateParams CreateParams
    {
        get { var cp = base.CreateParams; cp.ExStyle |= WsExNoActivate | WsExTransparent | WsExToolWindow; return cp; }
    }

    [System.Runtime.InteropServices.DllImport("gdi32.dll")]
    private static extern IntPtr CreateRoundRectRgn(int l, int t, int r, int b, int w, int h);

    private static IntPtr TaoBo(int w, int h, int bo) => CreateRoundRectRgn(0, 0, w + 1, h + 1, bo, bo);
}
