using System.Drawing.Drawing2D;
using AiiGrow.Core;

namespace AiiGrow.Setup;

/// <summary>
/// Trình cài từng bước kiểu cài game (Thanh 22/10: «một file install duy nhất … mở lên rồi hướng dẫn người ta làm từ từ»):
/// Chào → Điều khoản ngắn → Tài khoản của Con → Ghép máy (một ô mã 6 số — cách ghép duy nhất, Thanh 22/10 bỏ QR) → Cài (thanh tiến độ) → Xong.
/// Nút Quay lại / Tiếp ở chân, thanh tiến độ các bước ở đầu. Lời viết cho Ba Mẹ không rành máy (không «Quản trị viên», «Standard»).
/// </summary>
internal sealed class SetupForm : Form
{
    // Token màu của app AiiGrow (mobile/src/lib/mau.ts): chữ trắng trên Chinh 5,2:1; ChinhInk trên trắng ≥ 4,5:1.
    internal static readonly Color Chinh = Color.FromArgb(0x0b, 0x7a, 0x6e);
    internal static readonly Color ChinhSoft = Color.FromArgb(0xe3, 0xf5, 0xf0);
    internal static readonly Color Chu = Color.FromArgb(0x1f, 0x2a, 0x2a);
    internal static readonly Color Chu2 = Color.FromArgb(0x4a, 0x55, 0x55);
    internal static readonly Color Vien = Color.FromArgb(0xd9, 0xe2, 0xdf);
    internal static readonly Color Loi = Color.FromArgb(0xb4, 0x23, 0x18);
    internal static readonly Color Nen = Color.FromArgb(0xfb, 0xf8, 0xf2);
    private const string MayChuMacDinh = "https://aiigrow.aiilab.vn";
    private const int TongBuoc = 5;
    private const int Rong = 640;

    private readonly Label _buocChu = new() { AutoSize = true, Font = new Font("Segoe UI", 10f, FontStyle.Bold), ForeColor = Chinh, Location = new Point(32, 18) };
    private readonly ProgressBar _buocThanh = new() { Location = new Point(32, 44), Size = new Size(Rong, 6), Minimum = 0, Maximum = TongBuoc, Style = ProgressBarStyle.Continuous };
    private readonly FlowLayoutPanel _body = new()
    {
        Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
        Padding = new Padding(32, 8, 24, 10), AutoScroll = true, BackColor = Nen,
    };
    private readonly Panel _dau = new() { Dock = DockStyle.Top, Height = 60, BackColor = Nen };
    private readonly Panel _chan = new() { Dock = DockStyle.Bottom, Height = 76, BackColor = Color.White };
    private List<LocalAccount> _accounts = new();
    private LocalAccount? _child;
    private bool _dongY;
    private string _server = (Environment.GetEnvironmentVariable("AIIGROW_SERVER") is { Length: > 0 } e ? e : ReadServerFile()) is { Length: > 0 } s ? s : MayChuMacDinh;
    private bool _dangCai;

    public SetupForm()
    {
        Text = "Cài AiiGrow";
        Font = new Font("Segoe UI", 11f);
        ClientSize = new Size(Rong + 64, 640);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Nen;
        _dau.Controls.Add(_buocChu);
        _dau.Controls.Add(_buocThanh);
        _chan.Paint += (_, e) => e.Graphics.DrawLine(new Pen(Vien), 0, 0, _chan.Width, 0);
        Controls.Add(_body);
        Controls.Add(_dau);
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

    // ---------------------------------------------------------------- khung chung

    private Label T(string text, float pt = 11f, bool bold = false, Color? c = null, int rong = Rong)
        => new()
        {
            Text = text, AutoSize = true, MaximumSize = new Size(rong, 0),
            Font = new Font("Segoe UI", pt, bold ? FontStyle.Bold : FontStyle.Regular),
            ForeColor = c ?? Chu, Margin = new Padding(0, 0, 0, 12), BackColor = Color.Transparent,
        };

    private static Button B(string text, bool chinh = true, int w = 200)
    {
        var b = new Button
        {
            Text = text, Width = w, Height = 46, FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 11.5f, FontStyle.Bold), Cursor = Cursors.Hand,
            BackColor = chinh ? Chinh : Color.White, ForeColor = chinh ? Color.White : Chinh,
            UseVisualStyleBackColor = false,
        };
        b.FlatAppearance.BorderColor = Chinh;
        b.FlatAppearance.BorderSize = chinh ? 0 : 1;
        return b;
    }

    /// <summary>Sang một bước: tiêu đề + thanh tiến độ; chân có «Quay lại» (nếu có <paramref name="lui"/>) và nút chính.</summary>
    private void Man(int buoc, string ten, string tieu, Action? lui = null)
    {
        _body.Controls.Clear();
        _chan.Controls.Clear();
        _buocChu.Text = $"Bước {buoc}/{TongBuoc} · {ten}";
        _buocThanh.Value = buoc;
        _body.Controls.Add(T(tieu, 19f, true));
        if (lui != null)
        {
            var b = B("Quay lại", false, 130);
            b.Location = new Point(32, 15);
            b.Click += (_, _) => lui();
            _chan.Controls.Add(b);
        }
    }

    private Button Tiep(string chu, Action bam, int w = 220)
    {
        var b = B(chu, true, w);
        b.Location = new Point(_chan.Width - w - 32, 15);
        b.Anchor = AnchorStyles.Right | AnchorStyles.Top;
        b.Click += (_, _) => bam();
        _chan.Controls.Add(b);
        return b;
    }

    /// <summary>Dòng có dấu tick đầu (giống TickDong của app).</summary>
    private Label Tick(string chu, bool xong = true) => T((xong ? "✔   " : "○   ") + chu, 11f, false, xong ? Chu : Chu2);

    /// <summary>Thẻ lựa chọn lớn: tiêu đề đậm + câu «Chọn cái này nếu…»; viền xanh khi được chọn.</summary>
    private sealed class The : Panel
    {
        public bool Chon { get => _chon; set { _chon = value; Invalidate(); } }
        private bool _chon;
        public The() { DoubleBuffered = true; BackColor = Color.White; Cursor = Cursors.Hand; Padding = new Padding(18, 14, 18, 14); }
        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var path = new GraphicsPath();
            var r = new Rectangle(1, 1, Width - 3, Height - 3);
            const int k = 14;
            path.AddArc(r.X, r.Y, k, k, 180, 90); path.AddArc(r.Right - k, r.Y, k, k, 270, 90);
            path.AddArc(r.Right - k, r.Bottom - k, k, k, 0, 90); path.AddArc(r.X, r.Bottom - k, k, k, 90, 90); path.CloseFigure();
            using var pen = new Pen(_chon ? Chinh : Vien, _chon ? 2.5f : 1.5f);
            e.Graphics.DrawPath(pen, path);
        }
    }

    private The TheChon(string tieu, string khi, Action bam)
    {
        var the = new The { Width = Rong, Margin = new Padding(0, 0, 0, 10) };
        var t1 = T(tieu, 12.5f, true, Chu, Rong - 40); t1.Location = new Point(18, 14); t1.Margin = Padding.Empty;
        var t2 = T(khi, 10.5f, false, Chu2, Rong - 40); t2.Location = new Point(18, 14 + t1.PreferredHeight + 4); t2.Margin = Padding.Empty;
        the.Controls.Add(t1); the.Controls.Add(t2);
        the.Height = t2.Top + t2.PreferredHeight + 14;
        foreach (Control c in new Control[] { the, t1, t2 }) c.Click += (_, _) => bam();
        return the;
    }

    // ---------------------------------------------------------------- 1. Chào

    private void BuocChao()
    {
        Man(1, "Chào Ba Mẹ", "Cài AiiGrow lên máy của Con");
        _body.Controls.Add(T("Mất khoảng 2 phút. AiiGrow hướng dẫn từng bước, Ba Mẹ chỉ cần bấm Tiếp."));
        _body.Controls.Add(Tick("Ba Mẹ đặt giờ chơi, giờ học, giờ ngủ ngay trên điện thoại"));
        _body.Controls.Add(Tick("Con làm việc tốt → được điểm → đổi phút chơi trò chơi, phiếu quà"));
        _body.Controls.Add(Tick("Con luôn thấy biểu tượng AiiGrow ở góc màn hình — không có gì giấu Con"));
        _body.Controls.Add(T("Chuẩn bị: điện thoại có app AiiGrow (vào aiigrow.aiilab.vn nếu chưa có) để lấy mã ghép máy 6 số.", 10.5f, false, Chu2));
        if (Installer.IsAdmin())
            Tiep("Bắt đầu", BuocDieuKhoan);
        else
        {
            _body.Controls.Add(T("Bộ cài chưa có quyền cài đặt. Đóng cửa sổ này, bấm chuột phải vào AiiGrow-Setup.exe → «Run as administrator» (Chạy với tư cách quản trị viên), rồi gõ mật khẩu máy của Ba Mẹ.",
                11f, true, Loi));
            Tiep("Đóng", Close, 140);
        }
    }

    // ---------------------------------------------------------------- 2. Điều khoản ngắn

    private void BuocDieuKhoan()
    {
        Man(2, "Điều khoản", "Trước khi cài, Ba Mẹ đọc nhanh", BuocChao);
        _body.Controls.Add(Tick("AiiGrow ghi tên app, trang web và số phút Con dùng máy để Ba Mẹ xem. Chỉ gia đình mình xem được."));
        _body.Controls.Add(Tick("Không chụp màn hình, không đọc tin nhắn, không ghi bàn phím của Con."));
        _body.Controls.Add(Tick("Mặc định chỉ giám sát (ghi nhận, không khoá). Ba Mẹ bật «chặn thật» khi cần, ngay trong app."));
        _body.Controls.Add(Tick("Gỡ được bất cứ lúc nào: Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt, cần mật khẩu máy của Ba Mẹ."));
        var co = new CheckBox
        {
            Text = "Tôi là Ba/Mẹ (hoặc người giám hộ) của Con và đồng ý cài AiiGrow lên máy này",
            AutoSize = true, MaximumSize = new Size(Rong, 0), Font = new Font("Segoe UI", 11f, FontStyle.Bold), ForeColor = Chu,
            Checked = _dongY, Margin = new Padding(0, 8, 0, 8),
        };
        _body.Controls.Add(co);
        var tiep = Tiep("Tiếp", BuocTaiKhoan);
        tiep.Enabled = _dongY;
        co.CheckedChanged += (_, _) => { _dongY = co.Checked; tiep.Enabled = co.Checked; };
    }

    // ---------------------------------------------------------------- 3. Tài khoản của Con

    private static string? SidDangDung()
    {
        try { using var id = System.Security.Principal.WindowsIdentity.GetCurrent(); return id.User?.Value; } catch { return null; }
    }

    private async void BuocTaiKhoan()
    {
        Man(3, "Tài khoản của Con", "Con mở máy bằng tài khoản nào?", BuocDieuKhoan);
        _body.Controls.Add(T("Đang đọc các tài khoản trên máy…"));
        try { _accounts = await Task.Run(Accounts.List); }
        catch (Exception e)
        {
            Man(3, "Tài khoản của Con", "Con mở máy bằng tài khoản nào?", BuocDieuKhoan);
            _body.Controls.Add(T("Chưa đọc được các tài khoản trên máy: " + e.Message, 11f, false, Loi));
            Tiep("Thử lại", BuocTaiKhoan, 140);
            return;
        }
        var toi = SidDangDung();
        var coSan = _accounts.Where(a => !a.IsAdmin && a.Sid != toi).ToList();
        // Gợi ý mặc định: máy đã có tài khoản giới hạn (không phải tài khoản đang dùng) ⇒ chắc là của Con; không thì tạo mới.
        HienTaiKhoan(coSan.Count > 0 ? 1 : 2);
    }

    /// <summary>Hai lựa chọn dạng thẻ lớn; <paramref name="cach"/> 1 = Con đã có tài khoản riêng, 2 = tạo mới.</summary>
    private void HienTaiKhoan(int cach)
    {
        Man(3, "Tài khoản của Con", "Con mở máy bằng tài khoản nào?", BuocDieuKhoan);
        _body.Controls.Add(T("Tài khoản Windows là tên đăng nhập khi mở máy. Con nên có tài khoản riêng để AiiGrow quản lý giờ chơi của Con mà không ảnh hưởng tài khoản của Ba Mẹ."));
        var t1 = TheChon("Con đã có tài khoản riêng trên máy này",
            "Chọn cái này nếu khi mở máy, Con bấm vào tên của Con (khác tên của Ba Mẹ) để vào.", () => HienTaiKhoan(1));
        var t2 = TheChon("Máy chưa có tài khoản riêng cho Con",
            "Chọn cái này nếu cả nhà dùng chung một tài khoản, hoặc Con đang dùng tài khoản của Ba Mẹ. AiiGrow tạo tài khoản mới cho Con, tài khoản của Ba Mẹ giữ nguyên.",
            () => HienTaiKhoan(2));
        t1.Chon = cach == 1; t2.Chon = cach == 2;
        _body.Controls.Add(t1);
        _body.Controls.Add(t2);
        _body.Controls.Add(T("Không chắc? Chọn «Máy chưa có tài khoản riêng cho Con» — an toàn nhất.", 10.5f, false, Chu2));
        if (cach == 1) ChonCoSan(); else TaoMoi();
    }

    private void ChonCoSan()
    {
        var toi = SidDangDung();
        _body.Controls.Add(T("Chọn tài khoản của Con:", 11f, true));
        _body.Controls.Add(T("Tài khoản của Con phải là loại giới hạn: Con không tự tắt hay gỡ AiiGrow, không chỉnh giờ máy được. Nếu Con đang dùng loại toàn quyền, AiiGrow đổi sang giới hạn — gỡ AiiGrow thì trả lại như cũ.",
            10.5f, false, Chu2));
        _child = null;
        var tiep = Tiep("Tiếp", () => { if (_child != null) KiemTaiKhoan(_child); });
        tiep.Enabled = false;
        foreach (var a in _accounts)
        {
            var loai = a.IsAdmin ? "Toàn quyền — kiểu tài khoản của Ba Mẹ" : "Giới hạn — kiểu tài khoản của Con";
            var rb = new RadioButton
            {
                AutoSize = true, MaximumSize = new Size(Rong, 0), Margin = new Padding(4, 0, 0, 10), Font = new Font("Segoe UI", 12f), ForeColor = Chu,
                Text = a.Name + (a.Sid == toi ? "  (bạn đang dùng)" : "") + "\n" + loai,
            };
            rb.CheckedChanged += (_, _) => { if (rb.Checked) { _child = a; tiep.Enabled = true; } };
            _body.Controls.Add(rb);
        }
    }

    private void TaoMoi()
    {
        _body.Controls.Add(T("Tên đăng nhập của Con — gõ không dấu, không khoảng trắng, ví dụ: bin", 11f, true));
        var ten = new TextBox { Width = 320, Font = new Font("Segoe UI", 13f), MaxLength = 20, Margin = new Padding(0, 0, 0, 12) };
        _body.Controls.Add(ten);
        _body.Controls.Add(T("Mật khẩu Con gõ khi mở máy — ít nhất 4 ký tự. Ba Mẹ ghi lại giúp Con nhớ.", 11f, true));
        var mk = new TextBox { Width = 320, Font = new Font("Segoe UI", 13f), UseSystemPasswordChar = true, Margin = new Padding(0, 0, 0, 8) };
        _body.Controls.Add(mk);
        var loi = T("", 11f, true, Loi);
        _body.Controls.Add(loi);
        _body.Controls.Add(T("Tài khoản mới là loại giới hạn: Con không tự tắt hay gỡ AiiGrow được.", 10.5f, false, Chu2));
        Button? tiep = null;
        tiep = Tiep("Tạo tài khoản", async () =>
        {
            var n = ten.Text.Trim();
            if (!Accounts.IsValidName(n)) { loi.Text = "Tên chỉ gồm chữ không dấu, số, dấu . _ - (tối đa 20 ký tự). Ví dụ: bin"; return; }
            if (_accounts.Any(a => a.Name.Equals(n, StringComparison.OrdinalIgnoreCase))) { loi.Text = $"Máy đã có tài khoản «{n}». Đặt tên khác, hoặc chọn «Con đã có tài khoản riêng»."; return; }
            if (mk.Text.Length < 4) { loi.Text = "Mật khẩu cần ít nhất 4 ký tự."; return; }
            tiep!.Enabled = false; loi.Text = "";
            try
            {
                var pw = mk.Text;
                var sid = await Task.Run(() => Accounts.CreateStandard(n, pw));
                _child = new LocalAccount(n, sid, false);
                BuocGhep();
            }
            catch (Exception e) { loi.Text = "Chưa tạo được tài khoản: " + e.Message; tiep.Enabled = true; }
        });
    }

    /// <summary>Con chọn tài khoản toàn quyền: máy còn tài khoản toàn quyền khác ⇒ xác nhận rồi đi tiếp; không còn ⇒ giải thích từng bước.</summary>
    private void KiemTaiKhoan(LocalAccount con)
    {
        if (!con.IsAdmin) { BuocGhep(); return; }
        var khac = _accounts.Count(a => a.IsAdmin && a.Sid != con.Sid);
        if (khac > 0)
        {
            if (MessageBox.Show($"Đổi «{con.Name}» thành tài khoản giới hạn? Con vẫn mở máy, học, chơi như cũ — chỉ không tự tắt được AiiGrow. Gỡ AiiGrow thì trả lại như cũ.",
                    "AiiGrow", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                BuocGhep();
            return;
        }
        Man(3, "Tài khoản của Con", "Máy cần một tài khoản riêng của Ba Mẹ", () => HienTaiKhoan(1));
        _body.Controls.Add(T($"Máy này chỉ có MỘT tài khoản toàn quyền, chính là «{con.Name}». Nếu đổi nó thành giới hạn, máy không còn ai cài đặt hay gỡ AiiGrow được nữa — nên AiiGrow không đổi."));
        _body.Controls.Add(T("Cách dễ nhất (khuyên dùng):", 12f, true));
        _body.Controls.Add(T("Bấm «Quay lại» → chọn «Máy chưa có tài khoản riêng cho Con» → AiiGrow tạo tài khoản mới cho Con. Tài khoản «" + con.Name + "» giữ làm tài khoản của Ba Mẹ."));
        _body.Controls.Add(T("Nếu muốn Con giữ tài khoản «" + con.Name + "», tạo trước một tài khoản toàn quyền cho Ba Mẹ:", 12f, true));
        foreach (var (i, b) in new[]
                 {
                     "Bấm nút Start (logo Windows) → Settings (Cài đặt, hình bánh răng).",
                     "Chọn Accounts (Tài khoản) → Other users (Người dùng khác) → Add account (Thêm tài khoản).",
                     "Bấm «I don't have this person's sign-in information», rồi «Add a user without a Microsoft account».",
                     "Đặt tên cho Ba Mẹ (vd: bame) và mật khẩu → Next.",
                     "Bấm vào tài khoản vừa tạo → Change account type (Đổi loại tài khoản) → chọn Administrator → OK.",
                     "Chạy lại AiiGrow-Setup.exe, đến bước này chọn «" + con.Name + "» cho Con.",
                 }.Select((b, i) => (i + 1, b)))
            _body.Controls.Add(T($"{i}.  {b}", 11f, false, Chu));
        Tiep("Quay lại chọn", () => HienTaiKhoan(2), 200);
    }

    // ---------------------------------------------------------------- 4. Ghép máy

    /// <summary>Mã 6 số Ba Mẹ lấy trong app (bước «Ghép máy» khi đăng ký, hoặc Hồ sơ Con › Ghép thêm máy) — cách ghép duy nhất.</summary>
    private void BuocGhep()
    {
        var child = _child!;
        Man(4, "Ghép máy", $"Nhập mã ghép máy cho {child.Name}", BuocTaiKhoan);   // quay lại: đọc lại danh sách (tài khoản vừa tạo hiện trong đó)
        _body.Controls.Add(T("Trên điện thoại của Ba Mẹ, mở app AiiGrow → bước «Ghép máy» (hoặc Hồ sơ Con › Ghép thêm máy). App hiện mã 6 số — gõ vào ô dưới. Mã hết hạn sau 15 phút."));
        var ma = new TextBox
        {
            Width = 260, MaxLength = 6, Font = new Font("Segoe UI", 26f, FontStyle.Bold), TextAlign = HorizontalAlignment.Center,
            Margin = new Padding(0, 4, 0, 12),
        };
        _body.Controls.Add(ma);
        var loi = T("", 11f, true, Loi);
        _body.Controls.Add(loi);
        Tiep("Ghép và cài đặt", () =>
        {
            var m = ma.Text.Trim();
            if (m.Length != 6 || !m.All(char.IsDigit)) { loi.Text = "Mã ghép gồm đúng 6 chữ số."; return; }
            BuocCai(new InstallOptions { Server = _server, Code = m, Child = child });
        });
        ma.Focus();
    }

    // ---------------------------------------------------------------- 5. Cài + Xong

    private static readonly string[] StepLabels = { "Ghép máy với điện thoại của Ba Mẹ", "Tài khoản {0} là loại giới hạn", "Cài dịch vụ AiiGrow", "Biểu tượng AiiGrow + lời chào khi mở máy" };

    private async void BuocCai(InstallOptions o)
    {
        var child = o.Child;
        Man(5, "Cài đặt", "Đang cài AiiGrow…");
        var thanh = new ProgressBar { Width = Rong, Height = 14, Maximum = StepLabels.Length, Style = ProgressBarStyle.Continuous, Margin = new Padding(0, 4, 0, 16) };
        _body.Controls.Add(thanh);
        var labels = StepLabels.Select(l => string.Format(l, child.Name)).ToArray();
        var ticks = labels.Select(l => Tick(l, false)).ToArray();
        foreach (var t in ticks) { t.Margin = new Padding(0, 0, 0, 6); _body.Controls.Add(t); }
        var status = T("Đừng tắt máy trong lúc cài.", 11f, true, Chinh);
        _body.Controls.Add(status);
        _dangCai = true;
        try
        {
            await Installer.RunAsync(o, (i, _) => BeginInvoke(() => { ticks[i].Text = "✔   " + labels[i]; ticks[i].ForeColor = Chu; thanh.Value = i + 1; }));
            _dangCai = false;
            BuocXong(child);
        }
        catch (Exception e)
        {
            _dangCai = false;
            status.ForeColor = Loi;
            status.Text = "Chưa cài được: " + e.Message;
            var b = B("Quay lại", false, 130);
            b.Location = new Point(32, 15);
            b.Click += (_, _) => BuocGhep();
            _chan.Controls.Add(b);
            Tiep("Thử lại", () => BuocCai(o), 140);
        }
    }

    private void BuocXong(LocalAccount child)
    {
        Man(5, "Xong", "Xong rồi! AiiGrow đã ở trên máy");
        _buocThanh.Value = TongBuoc;
        _body.Controls.Add(Tick("Máy đã ghép với điện thoại của Ba Mẹ — xem ngay trong app AiiGrow"));
        _body.Controls.Add(Tick($"Tài khoản {child.Name} của Con là loại giới hạn"));
        _body.Controls.Add(Tick("Biểu tượng AiiGrow nằm ở góc phải thanh tác vụ và trong menu Start"));
        _body.Controls.Add(T($"Bước cuối: đăng xuất để {child.Name} vào máy bằng tài khoản của mình. Muốn gỡ: Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt.", 11f, false, Chu2));
        var sau = B("Để sau", false, 130);
        sau.Location = new Point(32, 15);
        sau.Click += (_, _) => Close();
        _chan.Controls.Add(sau);
        Tiep("Đăng xuất để Con vào máy", () =>
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("shutdown.exe", "/l") { CreateNoWindow = true, UseShellExecute = false }), 260);
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (_dangCai && e.CloseReason == CloseReason.UserClosing)
        {
            MessageBox.Show("AiiGrow đang cài, đợi chút nhé — xong sẽ báo.", "AiiGrow", MessageBoxButtons.OK, MessageBoxIcon.Information);
            e.Cancel = true;
            return;
        }
        base.OnFormClosing(e);
    }
}
