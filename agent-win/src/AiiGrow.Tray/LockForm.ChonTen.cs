using System.Drawing.Drawing2D;
using System.Text.Json;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Màn khoá «Ai đang dùng máy?» theo thiết kế chốt 06/11 (docs/thiet-ke-chot/con-ngay-thuong 01–06; L13): một tài khoản Windows dùng chung,
/// AiiGrow nhận từng bé bằng chọn tên + PIN 4 số. Cùng nền ngọc sâu, đồng hồ, chân trang như màn khoá thường; MỘT thẻ đất sét ở giữa:
///   01 lưới tên các bé (chip «Máy đang khoá» trên, viên «Ba Mẹ dùng máy» dưới) · 02/03 PIN (4 chấm + bàn phím số, «Chưa đúng · còn N lần thử»)
///   · 04 «Sai 5 lần rồi» đếm 15 giây · 05 «Quên PIN rồi à?» (3 bước Ba Mẹ đặt lại + «Báo Ba Mẹ giúp con») · 06 «Ba Mẹ nhập mã» (6 ô, gõ bằng bàn phím).
/// Mọi quyết định do dịch vụ / máy chủ (lệnh pipe ho-so, dang-nhap-be, quen-pin, ba-me-mo); chuyển bước theo lớp thuần <see cref="ManChonTenView"/>.
/// </summary>
internal sealed partial class LockForm
{
    private readonly ManChonTenState _ct = new();
    private HoSoMay? _hs;
    private string? _hsLoi;
    private bool _chonTen;          // dịch vụ báo chưa ai đăng nhập (LockReason chon_ten)
    private bool _mayRieng;
    private DateTimeOffset _hsLuc = DateTimeOffset.MinValue;
    private bool _dangTaiHs;
    private Label? _demTamKhoa;
    private VongDem? _vong;
    private Control? _chipKhoa, _nutBaMe;

    /// <summary>Bé đã vào / Ba Mẹ đã mở (dịch vụ trả trạng thái mới) — khay áp ngay, không chờ lượt hỏi 3 giây.</summary>
    public event Action<PipeResponse>? DaVao;

    /// <summary>Đang ở «Ba Mẹ nhập mã» mở từ màn khoá thường (hết giờ / giờ ngủ…) ⇒ không dựng lại thẻ thường đè lên.</summary>
    private bool DangNhapMaTuManKhoa => _ct.Buoc == BuocChonTen.BaMeMa && _ct.TuManKhoa;

    private void KhoiTaoChonTen()
    {
        KeyPreview = true;
        KeyDown += PhimChonTen;
        // chip «Máy đang khoá» (trên) + viên «Ba Mẹ dùng máy» (dưới) — chỉ ở bước lưới tên
        var chip = new ChipClay(ManChonTenView.ChipKhoa, Color.FromArgb(240, 255, 255, 255), Clay.NgocInk, Anh3D.Icon("khoa")) { Font = UI.F(14f, FontStyle.Bold), Visible = false };
        chip.Size = new Size(TextRenderer.MeasureText(chip.Text, chip.Font).Width + UI.Px(70), UI.Px(48));
        _chipKhoa = chip;
        Controls.Add(chip);
        var bm = UI.Btn(ManChonTenView.NutBaMe, false, UI.Px(260), null);
        bm.Image = Anh3D.Icon("nguoi");
        bm.Font = UI.F(14f, FontStyle.Bold);
        bm.Height = UI.Px(52) + VeNut.LeBong.Vertical;
        bm.Width = TextRenderer.MeasureText(bm.Text, bm.Font).Width + UI.Px(90);
        bm.Visible = false;
        bm.Click += (_, _) => MoBaMeNhapMa(tuManKhoa: false);
        _nutBaMe = bm;
        Controls.Add(bm);
        chip.BringToFront(); bm.BringToFront();
    }

    private void DatGocChonTen()
    {
        if (_chipKhoa != null) _chipKhoa.Location = new Point((ClientSize.Width - _chipKhoa.Width) / 2, UI.Px(70));
        if (_nutBaMe != null) _nutBaMe.Location = new Point((ClientSize.Width - _nutBaMe.Width) / 2, ClientSize.Height - _nutBaMe.Height - UI.Px(96));
    }

    /// <summary>Áp trạng thái dịch vụ cho phần chọn tên. → true = màn đang vẽ phần chọn tên (Apply dừng ở đây).</summary>
    private bool ApChonTen(TrayState s)
    {
        var chonTen = s.LockReason == LockReasons.ChonTen;
        _mayRieng = s.MayRieng;
        if (chonTen != _chonTen)
        {
            _chonTen = chonTen;
            ManChonTenView.VeDau(_ct);
            _khoa = "";
            if (chonTen) { _ = TaiHoSoAsync(); VeChonTen(); }
        }
        if (!chonTen) { HienGocChonTen(false); return false; }
        if ((DateTimeOffset.Now - _hsLuc).TotalSeconds > 60 && _ct.Buoc == BuocChonTen.ChonTen) _ = TaiHoSoAsync();
        return true;
    }

    private void HienGocChonTen(bool hien)
    {
        if (_chipKhoa != null) _chipKhoa.Visible = hien;
        if (_nutBaMe != null) _nutBaMe.Visible = hien;
    }

    /// <summary>«Ba Mẹ dùng máy» — từ lưới tên hoặc từ màn khoá thường (hết giờ, giờ ngủ, Ba Mẹ khoá).</summary>
    private void MoBaMeNhapMa(bool tuManKhoa)
    {
        ManChonTenView.MoBaMe(_ct, tuManKhoa && !_chonTen);
        VeChonTen();
    }

    private async Task TaiHoSoAsync()
    {
        if (_dangTaiHs) return;
        _dangTaiHs = true;
        _hsLuc = DateTimeOffset.Now;
        try
        {
            var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.HoSo });
            if (IsDisposed) return;
            HoSoMay? hs = null;
            if (r.Ok && !string.IsNullOrEmpty(r.Data)) { try { hs = JsonSerializer.Deserialize<HoSoMay>(r.Data, Json.Options); } catch (JsonException) { } }
            _hs = hs ?? _hs;
            _hsLoi = hs == null ? (r.Error ?? ManChonTenView.ChuaCoDs) : null;
            // máy riêng (một bé): bỏ lưới tên, vào thẳng ô PIN (vẫn hỏi PIN khi mở khoá — L13)
            if (_chonTen && _ct.Buoc == BuocChonTen.ChonTen && _hs is { MayRieng: true, Con.Count: 1 } && _ct.Be == null)
            {
                if (ManChonTenView.ChonBe(_ct, _hs.Con[0], DateTimeOffset.Now)) { await GuiPinAsync(); return; }
                VeChonTen();
                return;
            }
            if (_chonTen && _ct.Buoc == BuocChonTen.ChonTen) VeChonTen();
        }
        finally { _dangTaiHs = false; }
    }

    /// <summary>Mỗi giây (đồng hồ màn khoá): đếm ngược «Sai 5 lần rồi», hết thì về ô PIN.</summary>
    private void NhipChonTen()
    {
        if (_ct.Buoc != BuocChonTen.TamKhoa) return;
        var now = DateTimeOffset.Now;
        if (ManChonTenView.Tick(_ct, now)) { VeChonTen(); return; }
        var con = ManChonTenView.ConGiay(_ct, now);
        if (_demTamKhoa != null) _demTamKhoa.Text = $"{con / 60}:{con % 60:00}";
        if (_vong != null) { _vong.Phan = Math.Clamp(con / (float)DangNhapView.PinChoGiay, 0f, 1f); _vong.Invalidate(); }
    }

    private void PhimChonTen(object? sender, KeyEventArgs e)
    {
        if (!_chonTen && !DangNhapMaTuManKhoa) return;
        if (OwnedForms.Length > 0) return;
        char? so = e.KeyCode switch
        {
            >= Keys.D0 and <= Keys.D9 when !e.Shift => (char)('0' + (e.KeyCode - Keys.D0)),
            >= Keys.NumPad0 and <= Keys.NumPad9 => (char)('0' + (e.KeyCode - Keys.NumPad0)),
            _ => null,
        };
        if (so is char c) { e.Handled = e.SuppressKeyPress = true; BamSo(c); return; }
        switch (e.KeyCode)
        {
            case Keys.Back: e.Handled = e.SuppressKeyPress = true; ManChonTenView.Xoa(_ct); VeChonTen(); break;
            case Keys.Enter when _ct.Buoc == BuocChonTen.BaMeMa: e.Handled = e.SuppressKeyPress = true; _ = GuiMaAsync(); break;
            case Keys.Escape: e.Handled = e.SuppressKeyPress = true; Lui(); break;
        }
    }

    private void BamSo(char c)
    {
        if (ManChonTenView.GoSo(_ct, c)) { VeChonTen(); _ = GuiPinAsync(); return; }
        VeChonTen();
    }

    private void Lui()
    {
        if (!ManChonTenView.Lui(_ct)) { _khoa = ""; VeChonTen(); return; }   // từ màn khoá thường ⇒ vẽ lại thẻ thường ở lượt Apply kế
        VeChonTen();
    }

    private async Task ChonBeAsync(HoSoBe be)
    {
        if (_ct.DangGui) return;
        if (ManChonTenView.ChonBe(_ct, be, DateTimeOffset.Now)) { VeChonTen(); await GuiPinAsync(); return; }
        VeChonTen();
    }

    private async Task GuiPinAsync()
    {
        if (_ct.Be is not { } be || _ct.DangGui) return;
        _ct.DangGui = true;
        VeChonTen();
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.DangNhapBe, Id = be.Id, Code = be.CoPin ? _ct.So : null });
        if (IsDisposed) return;
        ManChonTenView.KetQuaPin(_ct, r.Ok, r.Status, r.ConLan, r.ChoGiay, r.Error ?? r.Message, DateTimeOffset.Now);
        VeChonTen();
        if (r.Ok) DaVao?.Invoke(r);
    }

    private async Task GuiMaAsync()
    {
        if (_ct.DangGui || _ct.So.Length != ManChonTenView.SoChuSoMa) return;
        _ct.DangGui = true;
        VeChonTen();
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.BaMeMo, Code = _ct.So });
        if (IsDisposed) return;
        ManChonTenView.KetQuaMa(_ct, r.Ok, r.Status, r.ConLan, r.ChoGiay, r.Error ?? r.Message);
        if (r.Ok) _khoa = "";
        VeChonTen();
        if (r.Ok) DaVao?.Invoke(r);
    }

    private async Task BaoBaMeAsync()
    {
        if (_ct.Be is not { } be || _ct.DangGui) return;
        _ct.DangGui = true;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.QuenPin, Id = be.Id });
        if (IsDisposed) return;
        _ct.DangGui = false;
        _ct.DaBao = r.Ok;
        _ct.Loi = r.Ok ? null : r.Error ?? "Chưa báo được. Con thử lại nhé.";
        VeChonTen();
    }

    // ------------------------------------------------------------------ dựng thẻ

    /// <summary>Vẽ lại thẻ theo bước hiện tại (hoặc trả về thẻ thường khi đã rời phần chọn tên).</summary>
    private void VeChonTen()
    {
        if (!_chonTen && !DangNhapMaTuManKhoa)
        {
            HienGocChonTen(false);
            if (_m != null) { _khoa = ""; Dung(_m); }
            return;
        }
        HienGocChonTen(_chonTen && _ct.Buoc == BuocChonTen.ChonTen);
        _chan.Text = _chonTen ? DangNhapView.ChanTrang(null) : _chan.Text;
        _center.SuspendLayout();
        if (_khoi != null) { _center.Controls.Remove(_khoi); if (_count.Parent != null) _count.Parent.Controls.Remove(_count); _khoi.Dispose(); }
        _code = null; _demTamKhoa = null; _vong = null;
        _khoi = _ct.Buoc switch
        {
            BuocChonTen.NhapPin => ThePin(),
            BuocChonTen.TamKhoa => TheTamKhoa(),
            BuocChonTen.QuenPin => TheQuen(),
            BuocChonTen.BaMeMa => TheBaMe(),
            _ => TheChonTen(),
        };
        _center.Controls.Add(_khoi);
        _center.ResumeLayout(true);
        GiuaKhoi();
        DatGocChu();
        ActiveControl = null;   // phím số đi vào màn (KeyPreview), không vào nút đang có tiêu điểm
    }

    private (ClayFlow The, int W) The(int rong)
    {
        var the = TheMoi(UI.Px(rong) + VeThe.LeBong.Horizontal, true);
        the.Padding = VeThe.Pad(UI.Px(rong >= 700 ? 48 : 40), UI.Px(rong >= 700 ? 32 : 22), UI.Px(rong >= 700 ? 48 : 40), UI.Px(28));
        return (the, UI.Px(rong) + VeThe.LeBong.Horizontal - the.Padding.Horizontal);
    }

    private static Control Giua(Control c, int w, int tren = 0)
    {
        c.Margin = new Padding(Math.Max(0, (w - c.Width) / 2), UI.Px(tren), 0, 0);
        return c;
    }

    /// <summary>Nút «‹» ở GÓC thẻ (thiết kế .lui: cách mép trái / trên thẻ 24 px, tròn 52) — không chiếm hàng riêng trong dòng chảy:
    /// lề âm kéo nút về góc và trả lại đúng chiều cao nó chiếm, nên Rob / tên bé bên dưới vẫn bắt đầu ở đỉnh thẻ như HTML (nút nằm đè lên trên).</summary>
    private Control NutLui(ClayFlow the)
    {
        var rong = UI.Px(52) + VeNut.LeBong.Horizontal;
        var cao = UI.Px(52) + VeNut.LeBong.Vertical;
        var b = new ClayButton { Text = "‹", Font = UI.F(20f, FontStyle.Bold), ForeColor = Clay.NgocInk, BackColor = Clay.The, BoGoc = UI.Px(26),
            Size = new Size(rong, cao), TabStop = false };
        var trai = UI.Px(24) + VeThe.LeBong.Left - VeNut.LeBong.Left - the.Padding.Left;
        var tren = UI.Px(24) + VeThe.LeBong.Top - VeNut.LeBong.Top - the.Padding.Top;
        b.Margin = new Padding(trai, tren, 0, -(tren + cao));
        b.Click += (_, _) => Lui();
        return b;
    }

    private VienTen Vien(HoSoBe be, int co)
    {
        var ds = _hs?.Con ?? new List<HoSoBe> { be };
        var i = Math.Max(0, ds.FindIndex(c => c.Id == be.Id));
        var chu = DangNhapView.ChuDauDs(ds.Select(c => c.Ten));
        return new VienTen { Chu = i < chu.Count ? chu[i] : DangNhapView.ChuDau(be.Ten), Mau = i, Size = new Size(UI.Px(co), UI.Px(co)), Margin = Padding.Empty };
    }

    private Label ChuGiua(string text, float pt, bool dam, Color mau, int w, int tren)
    {
        var l = Chu(text, pt, dam, mau, w, true);
        l.Margin = new Padding(0, UI.Px(tren), 0, 0);
        return l;
    }

    /// <summary>01 «Ai đang dùng máy?» — thẻ 800, Rob 150, tiêu đề 42px, lưới thẻ tên 240×236 (viên chữ 120 + tên 28px).</summary>
    private Control TheChonTen()
    {
        var (the, w) = The(800);
        the.Controls.Add(Giua(KhoiThietKe.Rob("rob-goc", 150), w));
        the.Controls.Add(ChuGiua(ManChonTenView.TieuChon, 31.5f, true, UI.Ink, w, 10));
        the.Controls.Add(ChuGiua(ManChonTenView.PhuChon, 16.5f, false, UI.Muted, w, 6));
        var ds = _hs?.Con ?? new List<HoSoBe>();
        if (ds.Count == 0)
        {
            the.Controls.Add(ChuGiua(_hs == null && _hsLoi == null ? "Đang tải tên các bé…" : _hsLoi ?? "Ba Mẹ chưa thêm con nào trong app.", 13f, false, UI.Muted, w, 26));
            if (_hs == null && _hsLoi != null)
            {
                var thu = KhoiCon.Nut("Thử lại", false, UI.Px(240), "lap", 52, 14f);
                thu.Click += (_, _) => _ = TaiHoSoAsync();
                the.Controls.Add(Giua(thu, w, 12));
            }
        }
        else
        {
            var luoi = new FlowLayoutPanel { AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, WrapContents = true, BackColor = Color.Transparent,
                MaximumSize = new Size(w, 0), Margin = Padding.Empty };
            var chu = DangNhapView.ChuDauDs(ds.Select(c => c.Ten));
            for (int i = 0; i < ds.Count; i++)
            {
                var be = ds[i];
                var o = new ClayFlow { FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(32), Cursor = Cursors.Hand,
                    Size = new Size(UI.Px(240) + VeThe.LeBong.Horizontal, UI.Px(236) + VeThe.LeBong.Vertical), Padding = VeThe.Pad(0, UI.Px(32), 0, 0),
                    Margin = new Padding(UI.Px(i == 0 ? 0 : 14), UI.Px(26), UI.Px(14), 0) };
                var v = new VienTen { Chu = chu[i], Mau = i, Size = new Size(UI.Px(120), UI.Px(120)), Margin = new Padding((UI.Px(240) - UI.Px(120)) / 2, 0, 0, 0), Cursor = Cursors.Hand };
                var t = Chu(be.Ten, 21f, true, UI.Ink, UI.Px(240), true);
                t.Margin = new Padding(0, UI.Px(10), 0, 0);
                t.Cursor = Cursors.Hand;
                o.Controls.Add(v); o.Controls.Add(t);
                void Bam(object? _, EventArgs __) => _ = ChonBeAsync(be);
                o.Click += Bam; v.Click += Bam; t.Click += Bam;
                luoi.Controls.Add(o);
            }
            luoi.PerformLayout();
            the.Controls.Add(Giua(luoi, w));
        }
        if (_ct.Loi != null) the.Controls.Add(ChuGiua(_ct.Loi, 12f, true, Clay.Canh, w, 12));
        the.Controls.Add(ChuGiua(ManChonTenView.GhiChon, 11.25f, false, UI.Muted, w, 22));
        return the;
    }

    /// <summary>Viên + tên bé ở đầu các thẻ PIN (viên 120, tên 28px).</summary>
    private void DauBe(ClayFlow the, int w)
    {
        the.Controls.Add(NutLui(the));
        if (_ct.Be is not { } be) return;
        var v = Vien(be, 120);
        the.Controls.Add(Giua(v, w));
        the.Controls.Add(ChuGiua(be.Ten, 21f, true, UI.Ink, w, 10));
    }

    /// <summary>02 / 03 «Nhập PIN 4 số» — 4 chấm, bàn phím 3×4 (104×60), «Quên PIN?», «Máy sẽ nhớ con».</summary>
    private Control ThePin()
    {
        var (the, w) = The(600);
        DauBe(the, w);
        var sai = _ct.ConLan is int n && n > 0;
        the.Controls.Add(ChuGiua(sai ? ManChonTenView.ChuaDung(_ct.ConLan!.Value) : ManChonTenView.PhuPin, 16.5f, sai, sai ? Clay.Loi : UI.Muted, w, 6));
        var cham = new ChamPin { So = _ct.So.Length, Sai = sai && _ct.So.Length == 0, Size = new Size(UI.Px(4 * 26 + 3 * 22), UI.Px(30)) };
        the.Controls.Add(Giua(cham, w, 18));
        if (_ct.Loi != null) the.Controls.Add(ChuGiua(_ct.Loi, 12f, true, Clay.Canh, w, 8));
        var pad = new TableLayoutPanel { ColumnCount = 3, RowCount = 4, AutoSize = true, BackColor = Color.Transparent, Margin = Padding.Empty };
        var phim = new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫" };
        foreach (var k in phim)
        {
            if (k.Length == 0) { pad.Controls.Add(new Panel { Size = new Size(UI.Px(104), UI.Px(60)), BackColor = Color.Transparent, Margin = new Padding(UI.Px(8), UI.Px(6), UI.Px(8), UI.Px(6)) }); continue; }
            var xoa = k == "⌫";
            var b = new ClayButton { Text = k, Font = UI.F(xoa ? 17f : 19.5f, FontStyle.Bold), ForeColor = xoa ? UI.Muted : UI.Ink, BackColor = Clay.The, BoGoc = UI.Px(22),
                Kieu = xoa ? KieuClay.Phang : KieuClay.TuDong, TabStop = false, Enabled = !_ct.DangGui,
                Size = new Size(UI.Px(104) + VeNut.LeBong.Horizontal, UI.Px(60) + VeNut.LeBong.Vertical), Margin = new Padding(UI.Px(5), UI.Px(3), UI.Px(5), UI.Px(3)) };
            var kk = k;
            b.Click += (_, _) => { if (xoa) { ManChonTenView.Xoa(_ct); VeChonTen(); } else BamSo(kk[0]); };
            pad.Controls.Add(b);
        }
        pad.PerformLayout();
        the.Controls.Add(Giua(pad, w, 16));
        var quen = KhoiCon.LienKet(ManChonTenView.LinkQuen, null, () => { ManChonTenView.MoQuen(_ct); VeChonTen(); }, 15f, Color.FromArgb(0x19, 0x65, 0x59));
        quen.PerformLayout();
        the.Controls.Add(Giua(quen, w, 6));
        if (!sai) the.Controls.Add(Giua(VienGhi(ManChonTenView.NhoMay, "tick", false), w, 6));
        return the;
    }

    /// <summary>04 «Sai 5 lần rồi» — vòng đếm 170 (cam), «Quên PIN? Nhờ Ba Mẹ».</summary>
    private Control TheTamKhoa()
    {
        var (the, w) = The(600);
        DauBe(the, w);
        the.Controls.Add(ChuGiua(ManChonTenView.TieuTamKhoa, 31.5f, true, UI.Ink, w, 14));
        the.Controls.Add(ChuGiua(ManChonTenView.PhuTamKhoa, 16.5f, false, UI.Muted, w, 6));
        var con = ManChonTenView.ConGiay(_ct, DateTimeOffset.Now);
        _vong = new VongDem { Phan = Math.Clamp(con / (float)DangNhapView.PinChoGiay, 0f, 1f), Size = new Size(UI.Px(170), UI.Px(170)) };
        _demTamKhoa = new Label { Text = $"{con / 60}:{con % 60:00}", Font = UI.F(34.5f, FontStyle.Bold), ForeColor = Clay.Canh, BackColor = Color.Transparent, AutoSize = false,
            TextAlign = ContentAlignment.BottomCenter, Bounds = new Rectangle(0, UI.Px(30), UI.Px(170), UI.Px(66)) };
        var giay = new Label { Text = "giây", Font = UI.F(12.75f), ForeColor = UI.Muted, BackColor = Color.Transparent, AutoSize = false, TextAlign = ContentAlignment.TopCenter,
            Bounds = new Rectangle(0, UI.Px(98), UI.Px(170), UI.Px(26)) };
        _vong.Controls.Add(_demTamKhoa); _vong.Controls.Add(giay);
        the.Controls.Add(Giua(_vong, w, 22));
        var quen = KhoiCon.LienKet(ManChonTenView.LinkQuenNho, "nguoi", () => { ManChonTenView.MoQuen(_ct); VeChonTen(); }, 15f, Color.FromArgb(0x19, 0x65, 0x59));
        quen.PerformLayout();
        the.Controls.Add(Giua(quen, w, 14));
        return the;
    }

    /// <summary>05 «Quên PIN rồi à?» — 3 bước Ba Mẹ đặt lại, «Báo Ba Mẹ giúp con», «Có PIN mới · nhập lại», «Chọn bé khác».</summary>
    private Control TheQuen()
    {
        var (the, w) = The(600);
        the.Controls.Add(NutLui(the));
        the.Controls.Add(Giua(KhoiThietKe.Rob("rob-goc", 150), w));
        the.Controls.Add(ChuGiua(ManChonTenView.TieuQuen, 31.5f, true, UI.Ink, w, 10));
        the.Controls.Add(ChuGiua(ManChonTenView.PhuQuen, 16.5f, false, UI.Muted, w, 6));
        var buoc = new[] { (1, ManChonTenView.Buoc1, "nha"), (2, ManChonTenView.Buoc2(_ct.Be?.Ten), (string?)null), (3, ManChonTenView.Buoc3, "khoa") };
        foreach (var (so, chu, icon) in buoc)
        {
            var hang = new ClayCard { Lom = true, BoGoc = UI.Px(22), BackColor = Clay.Lom, Size = new Size(w, UI.Px(64) + VeThe.LeBong.Vertical), Margin = new Padding(0, UI.Px(so == 1 ? 20 : 10), 0, 0) };
            var tron = new VienTen { Chu = so.ToString(), Mau = -1, Size = new Size(UI.Px(38), UI.Px(38)), Location = new Point(VeThe.LeBong.Left + UI.Px(18), VeThe.LeBong.Top + UI.Px(13)) };
            var t = new Label { Text = chu, Font = UI.F(15f, FontStyle.Bold), ForeColor = UI.Ink, BackColor = Color.Transparent, AutoSize = true, UseMnemonic = false,
                Location = new Point(VeThe.LeBong.Left + UI.Px(72), VeThe.LeBong.Top + UI.Px(19)) };
            hang.Controls.Add(tron); hang.Controls.Add(t);
            Control phai = icon != null
                ? new ClayIcon { Size = new Size(UI.Px(32), UI.Px(32)), MauVien = Color.Transparent, Hinh = Anh3D.Icon(icon) }
                : _ct.Be is { } be ? Vien(be, 38) : new Panel();
            phai.Location = new Point(w - VeThe.LeBong.Right - UI.Px(18) - phai.Width, VeThe.LeBong.Top + (UI.Px(64) - phai.Height) / 2);
            hang.Controls.Add(phai);
            the.Controls.Add(hang);
        }
        var bao = VienGhi(_ct.DaBao ? ManChonTenView.DaBao : ManChonTenView.NutBao, _ct.DaBao ? "tick" : "tin", !_ct.DaBao);
        if (!_ct.DaBao) { bao.Cursor = Cursors.Hand; bao.Click += (_, _) => _ = BaoBaMeAsync(); foreach (Control c in bao.Controls) { c.Cursor = Cursors.Hand; c.Click += (_, _) => _ = BaoBaMeAsync(); } }
        the.Controls.Add(Giua(bao, w, 14));
        if (_ct.Loi != null) the.Controls.Add(ChuGiua(_ct.Loi, 12f, true, Clay.Canh, w, 6));
        var moi = KhoiCon.Nut(ManChonTenView.NutCoPinMoi, true, w, "tick", 64, 16.5f);
        moi.Margin = new Padding(0, UI.Px(16), 0, 0);
        moi.Click += (_, _) => { _ = TaiHoSoAsync(); if (_ct.Be is { } b) { ManChonTenView.ChonBe(_ct, _hs?.Con.FirstOrDefault(c => c.Id == b.Id) ?? b, DateTimeOffset.Now); _ct.ConLan = null; } VeChonTen(); };
        the.Controls.Add(moi);
        var khac = KhoiCon.Nut(ManChonTenView.NutChonKhac, false, w, "nguoi", 64, 16.5f);
        khac.Margin = new Padding(0, UI.Px(12), 0, 0);
        khac.Click += (_, _) => { ManChonTenView.VeDau(_ct); VeChonTen(); };
        the.Controls.Add(khac);
        return the;
    }

    /// <summary>06 «Ba Mẹ nhập mã» — khiên 110, 6 ô (64×78), «Mã 6 số · đổi sau 10 phút · gõ bằng bàn phím», «Mở máy cho Ba Mẹ».</summary>
    private Control TheBaMe()
    {
        var (the, w) = The(600);
        the.Controls.Add(NutLui(the));
        the.Controls.Add(Giua(new ClayIcon { Size = new Size(UI.Px(110), UI.Px(110)), MauVien = Color.Transparent, Hinh = Anh3D.Icon("khien") }, w));
        the.Controls.Add(ChuGiua(ManChonTenView.TieuBaMe, 31.5f, true, UI.Ink, w, 10));
        the.Controls.Add(ChuGiua(ManChonTenView.PhuBaMe, 16.5f, false, UI.Muted, w, 6));
        var o = new OMa { Ma = _ct.So, Size = new Size(UI.Px(6 * 64 + 5 * 12), UI.Px(78)) };
        the.Controls.Add(Giua(o, w, 22));
        the.Controls.Add(ChuGiua(_ct.Loi ?? ManChonTenView.GhiMa, 11.25f, _ct.Loi != null, _ct.Loi != null ? Clay.Canh : UI.Muted, w, 12));
        the.Controls.Add(Giua(VienGhi(ManChonTenView.KhongTru, "dong_ho_cat", false), w, 12));
        var mo = KhoiCon.Nut(_ct.DangGui ? "Đang mở…" : ManChonTenView.NutMo, true, w, "mo_khoa", 64, 16.5f);
        mo.Margin = new Padding(0, UI.Px(16), 0, 0);
        mo.Enabled = _ct.So.Length == ManChonTenView.SoChuSoMa && !_ct.DangGui;
        mo.Click += (_, _) => _ = GuiMaAsync();
        the.Controls.Add(mo);
        return the;
    }

    /// <summary>Viên ghi chú bo tròn cao 44 (thiết kế «.ghi»): nền ngọc nhạt (hoặc cam) + icon 24 + chữ đậm 17px.</summary>
    private static ClayFlow VienGhi(string chu, string icon, bool cam)
    {
        var v = new ClayFlow { FlowDirection = FlowDirection.LeftToRight, WrapContents = false, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, BoGoc = UI.Px(22),
            BackColor = cam ? Clay.CanhSoft : Clay.NgocSoft, Padding = VeThe.Pad(UI.Px(16), UI.Px(9), UI.Px(18), UI.Px(9)), Margin = Padding.Empty };
        v.Controls.Add(new ClayIcon { Size = new Size(UI.Px(26), UI.Px(26)), MauVien = Color.Transparent, Hinh = Anh3D.Icon(icon), Margin = new Padding(0, 0, UI.Px(8), 0) });
        var t = UI.Text(chu, 12.75f, true, cam ? Clay.Canh : Clay.NgocInk, UI.Px(520));
        t.Margin = new Padding(0, UI.Px(3), 0, 0);
        v.Controls.Add(t);
        v.PerformLayout();
        return v;
    }
}

/// <summary>Viên tròn chữ cái đầu tên bé (thiết kế «.av»): gradient cam / xanh / ngọc / tím theo thứ tự bé, viền trắng, bóng mềm.
/// <see cref="Mau"/> = -1 ⇒ viên số bước (ngọc đặc, không viền).</summary>
internal sealed class VienTen : Control
{
    private static readonly (Color Tren, Color Duoi)[] Bang =
    {
        (Color.FromArgb(0xf8, 0xbd, 0x78), Color.FromArgb(0xe8, 0x91, 0x3a)),
        (Color.FromArgb(0x8f, 0xbd, 0xf0), Color.FromArgb(0x4f, 0x8f, 0xd6)),
        (Color.FromArgb(0x7f, 0xd1, 0xb9), Color.FromArgb(0x2f, 0x9a, 0x7f)),
        (Color.FromArgb(0xc4, 0xa8, 0xf0), Color.FromArgb(0x8a, 0x66, 0xd6)),
        (Color.FromArgb(0xf5, 0x9f, 0xb5), Color.FromArgb(0xd9, 0x5b, 0x7d)),
    };

    public string Chu { get; set; } = "";
    public int Mau { get; set; }

    public VienTen()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var vien = Mau < 0 ? 0f : Math.Max(2f, Width / 24f);
        var bong = Mau < 0 ? 0f : Math.Max(2f, Width / 20f);
        var r = new RectangleF(bong / 2, 0, Width - bong - 1, Height - bong - 1);
        if (bong > 0)
            using (var b = new SolidBrush(Color.FromArgb(50, 30, 30, 20))) g.FillEllipse(b, new RectangleF(r.X, r.Y + bong, r.Width, r.Height));
        if (vien > 0) using (var w = new SolidBrush(Color.White)) g.FillEllipse(w, r);
        var tron = RectangleF.Inflate(r, -vien, -vien);
        if (tron.Width < 2) return;
        if (Mau < 0) using (var b = new SolidBrush(Clay.Ngoc)) g.FillEllipse(b, tron);
        else
        {
            var (t, d) = Bang[Mau % Bang.Length];
            using var lg = new LinearGradientBrush(tron, t, d, 90f);
            g.FillEllipse(lg, tron);
        }
        // cỡ chữ theo cỡ viên ở 96 dpi (thiết kế: viên 120 ⇒ chữ 54px ≈ 40pt), để UI.F tự theo DPI như mọi chữ khác
        using var f = UI.F(Math.Max(6f, Height / Math.Max(0.5f, Clay.Scale) * (Mau < 0 ? 0.27f : 0.33f)), FontStyle.Bold);
        TextRenderer.DrawText(g, Chu, f, Rectangle.Round(tron), Color.White, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
    }
}

/// <summary>4 chấm PIN (thiết kế «.o4»): lõm xám khi trống, ngọc khi đã gõ, đỏ cam khi vừa sai.</summary>
internal sealed class ChamPin : Control
{
    public int So { get; set; }
    public bool Sai { get; set; }
    public int Tong { get; set; } = DangNhapView.SoChuSoPin;

    public ChamPin()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        float d = UI.Px(26), gap = UI.Px(22);
        for (int i = 0; i < Tong; i++)
        {
            var r = new RectangleF(i * (d + gap), (Height - d) / 2f, d, d);
            Color tren, duoi;
            if (Sai) { tren = Color.FromArgb(0xf0, 0x8a, 0x5a); duoi = Color.FromArgb(0xb4, 0x23, 0x18); }
            else if (i < So) { tren = Color.FromArgb(0x2a, 0x8f, 0x7c); duoi = Color.FromArgb(0x0a, 0x52, 0x46); }
            else { tren = Color.FromArgb(0xd8, 0xd7, 0xd2); duoi = Clay.Lom; }
            using var lg = new LinearGradientBrush(r, tren, duoi, 90f);
            g.FillEllipse(lg, r);
        }
    }
}

/// <summary>6 ô mã Ba Mẹ (thiết kế «.o6m»): ô lõm 64×78, số đậm 36px, ô đang gõ viền ngọc.</summary>
internal sealed class OMa : Control
{
    public string Ma { get; set; } = "";

    public OMa()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        float w = UI.Px(64), gap = UI.Px(12), h = Math.Min(Height - 1, UI.Px(78)), bo = UI.Px(20);
        using var f = UI.F(27f, FontStyle.Bold);
        for (int i = 0; i < ManChonTenView.SoChuSoMa; i++)
        {
            var r = new RectangleF(i * (w + gap), 0, w, h);
            using var p = Clay.Bo(r, bo);
            using (var b = new SolidBrush(Clay.Lom)) g.FillPath(b, p);
            if (i == Ma.Length) using (var pen = new Pen(Clay.Ngoc, UI.Px(3))) g.DrawPath(pen, p);
            if (i < Ma.Length)
                TextRenderer.DrawText(g, Ma[i].ToString(), f, Rectangle.Round(r), UI.Ink, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
        }
    }
}

/// <summary>Vòng đếm 15 giây (thiết kế «.dem»): vành cam theo phần còn lại, lòng sứ lõm; chữ đặt bằng Label con.</summary>
internal sealed class VongDem : Control
{
    public float Phan { get; set; } = 1f;

    public VongDem()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var r = new RectangleF(1, 1, Width - 3, Height - 3);
        using (var b = new SolidBrush(Color.FromArgb(0xec, 0xeb, 0xe7))) g.FillEllipse(b, r);
        using (var b = new SolidBrush(Color.FromArgb(0xe8, 0x89, 0x0c))) g.FillPie(b, r.X, r.Y, r.Width, r.Height, -90f, 360f * Math.Clamp(Phan, 0f, 1f));
        var trong = RectangleF.Inflate(r, -Width * 15f / 170f, -Height * 15f / 170f);
        using (var b = new SolidBrush(Clay.The)) g.FillEllipse(b, trong);
    }
}
