using AiiGrow.Core;

namespace AiiGrow.Setup;

/// <summary>Trình cài 3 bước (theo thiết kế tre-win-1..3): quyền quản trị, tài khoản của con, bố mẹ quét mã QR (mã 6 số dự phòng).</summary>
internal sealed class SetupForm : Form
{
    private static readonly Color Green = Color.FromArgb(0x15, 0x80, 0x3d);
    private readonly FlowLayoutPanel _body = new()
    {
        Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
        Padding = new Padding(30, 24, 30, 10), AutoScroll = true,
    };
    private readonly Panel _footer = new() { Dock = DockStyle.Bottom, Height = 70 };
    private List<LocalAccount> _accounts = new();
    private LocalAccount? _child;
    private string _server = Environment.GetEnvironmentVariable("AIIGROW_SERVER") ?? ReadServerFile();

    public SetupForm()
    {
        Text = "Cài đặt AiiGrow";
        Font = new Font("Segoe UI", 11f);
        ClientSize = new Size(680, 600);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.White;
        Controls.Add(_body);
        Controls.Add(_footer);
        Step1();
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

    private Label T(string text, float pt = 11f, bool bold = false, Color? c = null)
        => new()
        {
            Text = text, AutoSize = true, MaximumSize = new Size(610, 0),
            Font = new Font("Segoe UI", pt, bold ? FontStyle.Bold : FontStyle.Regular),
            ForeColor = c ?? Color.FromArgb(0x1f, 0x29, 0x24), Margin = new Padding(0, 0, 0, 12),
        };

    private Button B(string text, bool primary = true, int w = 240)
    {
        var b = new Button
        {
            Text = text, Width = w, Height = 46, FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 11.5f, FontStyle.Bold), Cursor = Cursors.Hand,
            BackColor = primary ? Green : Color.White, ForeColor = primary ? Color.White : Green,
            UseVisualStyleBackColor = false,
        };
        b.FlatAppearance.BorderColor = Green;
        return b;
    }

    private void Reset(int n, string title)
    {
        _body.Controls.Clear();
        _footer.Controls.Clear();
        _body.Controls.Add(T($"Bước {n}/3", 10.5f, true, Green));
        _body.Controls.Add(T(title, 19f, true));
    }

    private void Footer(Button b)
    {
        b.Anchor = AnchorStyles.Right | AnchorStyles.Top;
        b.Location = new Point(_footer.Width - b.Width - 30, 12);
        _footer.Controls.Add(b);
    }

    private void Step1()
    {
        Reset(1, "Cài AiiGrow lên laptop này");
        _body.Controls.Add(T("Windows hỏi mật khẩu quản trị là mật khẩu của bố mẹ, không phải của con. Đây là bước duy nhất phải gõ mật khẩu."));
        if (Installer.IsAdmin())
        {
            _body.Controls.Add(T("Đang chạy với quyền quản trị.", 11f, true, Green));
            _body.Controls.Add(T("AiiGrow sẽ cài một dịch vụ hệ thống, đổi tài khoản của con thành tài khoản thường, và hiện biểu tượng AiiGrow ở khay để con luôn biết máy đang được quản lý."));
            var next = B("Tiếp tục");
            next.Click += (_, _) => Step2();
            Footer(next);
        }
        else
        {
            _body.Controls.Add(T("Chưa có quyền quản trị. Hãy bấm chuột phải vào bộ cài và chọn Chạy với tư cách quản trị viên.", 11f, true, Color.FromArgb(0xb4, 0x23, 0x18)));
            var close = B("Đóng", false);
            close.Click += (_, _) => Close();
            Footer(close);
        }
    }

    private async void Step2()
    {
        Reset(2, "Tài khoản nào là của con?");
        _body.Controls.Add(T("Đang đọc danh sách tài khoản…"));
        try { _accounts = await Task.Run(Accounts.List); }
        catch (Exception e) { Reset(2, "Tài khoản nào là của con?"); _body.Controls.Add(T(e.Message, 11f, false, Color.Firebrick)); return; }

        Reset(2, "Tài khoản nào là của con?");
        _body.Controls.Add(T("Chọn tài khoản của con. Nếu đang là Quản trị viên, bộ cài sẽ chuyển sang tài khoản thường (con không dừng được dịch vụ, không đổi được giờ máy)."));
        var next = B("Dùng tài khoản này");
        next.Enabled = false;
        _child = null;
        foreach (var a in _accounts)
        {
            var rb = new RadioButton
            {
                AutoSize = true, MaximumSize = new Size(600, 0), Margin = new Padding(0, 0, 0, 10),
                Text = a.Name + (a.IsAdmin ? "   (Quản trị viên, sẽ thành tài khoản thường)" : "   (tài khoản thường)"),
                Font = new Font("Segoe UI", 12f),
            };
            rb.CheckedChanged += (_, _) => { if (rb.Checked) { _child = a; next.Enabled = true; } };
            _body.Controls.Add(rb);
        }
        var create = B("Tạo tài khoản mới cho con", false, 300);
        create.Click += (_, _) => CreateAccount();
        _body.Controls.Add(create);
        next.Click += (_, _) => TryStep3();
        Footer(next);
    }

    private void CreateAccount()
    {
        using var dlg = new Form
        {
            Text = "Tạo tài khoản cho con", ClientSize = new Size(420, 230), StartPosition = FormStartPosition.CenterParent,
            FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false, Font = Font,
        };
        var name = new TextBox { Left = 20, Top = 40, Width = 380 };
        var pw = new TextBox { Left = 20, Top = 100, Width = 380, UseSystemPasswordChar = true };
        var ok = B("Tạo", true, 120); ok.Left = 280; ok.Top = 160;
        dlg.Controls.AddRange(new Control[]
        {
            new Label { Text = "Tên tài khoản (không dấu)", Left = 20, Top = 14, AutoSize = true }, name,
            new Label { Text = "Mật khẩu cho con", Left = 20, Top = 74, AutoSize = true }, pw, ok,
        });
        ok.Click += (_, _) =>
        {
            try
            {
                if (pw.Text.Length < 4) throw new ArgumentException("Mật khẩu ít nhất 4 ký tự");
                var sid = Accounts.CreateStandard(name.Text.Trim(), pw.Text);
                dlg.Tag = new LocalAccount(name.Text.Trim(), sid, false);
                dlg.DialogResult = DialogResult.OK;
            }
            catch (Exception e) { MessageBox.Show(e.Message, "AiiGrow"); }
        };
        if (dlg.ShowDialog(this) == DialogResult.OK && dlg.Tag is LocalAccount acc)
        {
            _child = acc;
            Step3();
        }
    }

    private void TryStep3()
    {
        if (_child == null) return;
        if (_child.IsAdmin)
        {
            var others = _accounts.Count(a => a.IsAdmin && a.Sid != _child.Sid);
            if (others == 0)
            {
                MessageBox.Show("Máy chỉ có một tài khoản quản trị. Hãy tạo tài khoản quản trị riêng cho bố mẹ (Settings > Accounts > Other users) rồi chạy lại bộ cài.",
                    "AiiGrow", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (MessageBox.Show($"Chuyển {_child.Name} từ Quản trị viên sang tài khoản thường?", "AiiGrow", MessageBoxButtons.YesNo) != DialogResult.Yes)
                return;
        }
        Step3();
    }

    private static readonly string[] StepLabels = { "Ghép máy với bố mẹ", "{0} là tài khoản thường", "Dịch vụ AiiGrow đang chạy", "Biểu tượng AiiGrow + thông báo khi đăng nhập" };
    private CancellationTokenSource? _qrCts;

    /// <summary>Vẽ ma trận QR ("0"/"1" mỗi hàng) thành ảnh: ô đen trên nền trắng, viền 4 ô.</summary>
    private static Bitmap QrBitmap(IReadOnlyList<string> rows, int size)
    {
        int n = rows.Count, q = 4, w = n + q * 2;
        var bmp = new Bitmap(size, size);
        using var g = Graphics.FromImage(bmp);
        g.Clear(Color.White);
        float cell = size / (float)w;
        using var ink = new SolidBrush(Color.FromArgb(0x1c, 0x1d, 0x21));
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
                if (rows[y][x] == '1') g.FillRectangle(ink, (x + q) * cell, (y + q) * cell, cell + 0.5f, cell + 0.5f);
        return bmp;
    }

    /// <summary>Bước 3: hiện mã QR, bố mẹ quét bằng app phụ huynh là ghép xong rồi cài luôn. Mã 6 số chỉ là dự phòng (camera hỏng).</summary>
    private void Step3()
    {
        var child = _child!;
        _qrCts?.Cancel();
        _qrCts = new CancellationTokenSource();
        var ct = _qrCts.Token;
        Reset(3, "Bố mẹ quét mã để ghép máy");
        _body.Controls.Add(T("Mở app AiiGrow trên điện thoại bố mẹ → Thêm thiết bị của con → quét mã này. Không cần nhập gì."));
        var pic = new PictureBox { Width = 260, Height = 260, SizeMode = PictureBoxSizeMode.Zoom, Margin = new Padding(0, 0, 0, 8), BackColor = Color.White };
        _body.Controls.Add(pic);
        var status = T("Đang tạo mã…", 11f, true, Green);
        _body.Controls.Add(status);
        var fallback = new LinkLabel { Text = "Camera điện thoại hỏng? Nhập mã 6 số", AutoSize = true, Margin = new Padding(0, 4, 0, 12), LinkColor = Green };
        fallback.LinkClicked += (_, _) => { _qrCts?.Cancel(); Step3Code(); };
        _body.Controls.Add(fallback);
        var retry = B("Tạo mã mới", false);
        retry.Click += (_, _) => Step3();

        async Task Loop()
        {
            if (string.IsNullOrWhiteSpace(_server)) { status.ForeColor = Color.Firebrick; status.Text = "Thiếu địa chỉ máy chủ — dùng mã 6 số."; return; }
            for (int lan = 0; lan < 6 && !ct.IsCancellationRequested; lan++)
            {
                QrPair m;
                try { m = await ApiClient.CreateQrAsync(_server, Environment.MachineName, ct); }
                catch (Exception e) when (!ct.IsCancellationRequested)
                {
                    status.ForeColor = Color.Firebrick; status.Text = "Chưa tạo được mã: " + e.Message; Footer(retry); return;
                }
                pic.Image?.Dispose();
                pic.Image = QrBitmap(m.Qr, 520);
                status.ForeColor = Green; status.Text = "Đang chờ bố mẹ quét… (mã đổi sau 5 phút)";
                while (!ct.IsCancellationRequested)
                {
                    try { await Task.Delay(2000, ct); } catch (OperationCanceledException) { return; }
                    PairResult? r;
                    try { r = await ApiClient.PollQrAsync(_server, m, ct); }
                    catch (QrExpiredException) { break; }
                    catch (ApiException e) when (e.StatusCode != null) { status.ForeColor = Color.Firebrick; status.Text = "Chưa ghép được: " + e.Message; Footer(retry); return; }
                    catch (Exception) when (!ct.IsCancellationRequested) { continue; } // rớt mạng thoáng qua
                    if (r != null) { Install(child, new InstallOptions { Server = _server, Paired = r, Child = child }); return; }
                }
            }
            if (!ct.IsCancellationRequested) { status.ForeColor = Color.Firebrick; status.Text = "Mã đã hết hạn."; Footer(retry); }
        }
        _ = Loop();
    }

    /// <summary>Dự phòng: nhập mã 6 số bố mẹ tạo trong app (Thêm thiết bị của con → Dùng mã số → Windows).</summary>
    private void Step3Code()
    {
        var child = _child!;
        Reset(3, "Nhập mã trên điện thoại bố mẹ");
        _body.Controls.Add(T("App bố mẹ → Thêm thiết bị của con → Dùng mã số → Windows. Mã 6 số hết hạn sau 15 phút."));
        var code = new TextBox { Width = 260, MaxLength = 6, Font = new Font("Segoe UI", 26f, FontStyle.Bold), TextAlign = HorizontalAlignment.Center, Margin = new Padding(0, 0, 0, 12) };
        _body.Controls.Add(code);
        _body.Controls.Add(T("Địa chỉ máy chủ AiiGrow", 10.5f));
        var server = new TextBox { Width = 420, Text = _server, Margin = new Padding(0, 0, 0, 14) };
        _body.Controls.Add(server);
        var back = new LinkLabel { Text = "Quay lại quét mã QR", AutoSize = true, Margin = new Padding(0, 0, 0, 12), LinkColor = Green };
        back.LinkClicked += (_, _) => Step3();
        _body.Controls.Add(back);
        var status = T("", 11f, true, Color.Firebrick);
        _body.Controls.Add(status);
        var go = B("Ghép và cài đặt");
        go.Click += (_, _) =>
        {
            if (code.Text.Trim().Length != 6 || !code.Text.Trim().All(char.IsDigit)) { status.Text = "Mã ghép gồm đúng 6 số."; return; }
            if (string.IsNullOrWhiteSpace(server.Text)) { status.Text = "Nhập địa chỉ máy chủ."; return; }
            _server = server.Text.Trim();
            Install(child, new InstallOptions { Server = _server, Code = code.Text.Trim(), Child = child });
        };
        Footer(go);
    }

    /// <summary>Chạy các bước cài và hiện tiến độ từng bước.</summary>
    private async void Install(LocalAccount child, InstallOptions o)
    {
        Reset(3, "Đang cài AiiGrow");
        var labels = StepLabels.Select(l => string.Format(l, child.Name)).ToArray();
        var ticks = labels.Select(l => T("○  " + l, 11f)).ToArray();
        foreach (var t in ticks) { t.Margin = new Padding(0, 0, 0, 4); _body.Controls.Add(t); }
        _body.Controls.Add(T($"Chế độ Chỉ app học (AppLocker) sẽ tự áp cho riêng {child.Name} khi bố mẹ bật trong app.", 10.5f, false, Color.FromArgb(0x5f, 0x66, 0x60)));
        var status = T("Đang cài…", 11f, true, Green);
        _body.Controls.Add(status);
        try
        {
            await Installer.RunAsync(o, (i, err) => BeginInvoke(() => ticks[i].Text = "✔  " + labels[i]));
            status.Text = "Xong. Đăng xuất để con vào máy.";
            var done = B("Xong — đăng xuất");
            done.Click += (_, _) => System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("shutdown.exe", "/l") { CreateNoWindow = true, UseShellExecute = false });
            Footer(done);
        }
        catch (Exception e)
        {
            status.ForeColor = Color.Firebrick;
            status.Text = "Chưa cài được: " + e.Message;
            var again = B("Thử lại", false);
            again.Click += (_, _) => Step3();
            Footer(again);
        }
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        _qrCts?.Cancel();
        base.OnFormClosed(e);
    }
}
