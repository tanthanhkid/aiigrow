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
    private ChamPin? _cham;   // 4 chấm PIN của thẻ đang hiện — gõ / xoá một số chỉ vẽ lại chấm (#308)
    private Control? _chipKhoa, _nutBaMe;

    /// <summary>Bé đã vào / Ba Mẹ đã mở (dịch vụ trả trạng thái mới) — khay áp ngay, không chờ lượt hỏi 3 giây.</summary>
    public event Action<PipeResponse>? DaVao;

    /// <summary>Đang ở «Ba Mẹ nhập mã» mở từ màn khoá thường (hết giờ / giờ ngủ…) ⇒ không dựng lại thẻ thường đè lên.</summary>
    private bool DangNhapMaTuManKhoa => _ct.Buoc == BuocChonTen.BaMeMa && _ct.TuManKhoa;

    private void KhoiTaoChonTen()
    {
        KeyPreview = true;
        KeyDown += PhimChonTen;
        // đổi kích thước / DPI ⇒ dựng lại lưới tên (số cột, mức gọn, vị trí thẻ tính theo cỡ màn lúc dựng)
        Resize += (_, _) =>
        {
            if (!IsHandleCreated || ClientSize.Width <= 0 || ClientSize == _kichChonTen) return;
            // lưới tên: dựng lại theo số cột; thẻ PIN / chờ / quên PIN / Ba Mẹ nhập mã (#324): dựng lại theo chiều cao màn (bản gọn)
            var luoi = _chonTen && _ct.Buoc == BuocChonTen.ChonTen && _hs?.Con.Count > 0;
            var thePin = (_chonTen || DangNhapMaTuManKhoa) && _ct.Buoc != BuocChonTen.ChonTen;
            if (luoi || thePin) VeChonTen();
        };
        // chip «Máy đang khoá» (trên) + viên «Ba Mẹ dùng máy» (dưới) — chỉ ở bước lưới tên
        var chip = new ChipClay(ManChonTenView.ChipKhoaMay(ManChonTenView.TenMayThat()), Clay.A(240, Clay.NenSang), Clay.NgocInk, Anh3D.Icon("laptop")) { Font = UI.F(14f, FontStyle.Bold), Visible = false };
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
            var dauCu = ThayDoi.Bam(_hs, _hsLoi);
            _hs = hs ?? _hs;
            _hsLoi = hs == null ? (r.Error ?? ManChonTenView.ChuaCoDs) : null;
            var doi = ThayDoi.Bam(_hs, _hsLoi) != dauCu;
            // máy riêng (một bé): bỏ lưới tên và ô PIN, vào thẳng (PIN chỉ dành cho máy chung — #267)
            if (_chonTen && _ct.Buoc == BuocChonTen.ChonTen && _hs is { MayRieng: true, Con.Count: 1 } && _ct.Be == null)
            {
                ManChonTenView.ChonBe(_ct, _hs.Con[0], DateTimeOffset.Now);
                if (_ct.Buoc == BuocChonTen.NhapPin) { await GuiPinAsync(); return; }
                VeChonTen();
                return;
            }
            // #308: tải lại mỗi 60 giây mà danh sách tên y nguyên ⇒ KHÔNG dựng lại lưới tên (trước đây cả thẻ nháy mỗi phút)
            if (doi && _chonTen && _ct.Buoc == BuocChonTen.ChonTen) VeChonTen();
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
            case Keys.Back: e.Handled = e.SuppressKeyPress = true; XoaSo(); break;
            case Keys.Enter when _ct.Buoc == BuocChonTen.BaMeMa: e.Handled = e.SuppressKeyPress = true; _ = GuiMaAsync(); break;
            case Keys.Escape: e.Handled = e.SuppressKeyPress = true; Lui(); break;
        }
    }

    private void BamSo(char c)
    {
        var loi = _ct.Loi;
        if (ManChonTenView.GoSo(_ct, c)) { VeChonTen(); _ = GuiPinAsync(); return; }
        if (!ChamTaiCho(loi)) VeChonTen();
    }

    private void XoaSo()
    {
        var loi = _ct.Loi;
        ManChonTenView.Xoa(_ct);
        if (!ChamTaiCho(loi)) VeChonTen();
    }

    /// <summary>#308: gõ / xoá một số PIN mà thẻ không đổi gì khác ⇒ chỉ vẽ lại 4 chấm, không dựng lại cả thẻ mỗi phím.</summary>
    private bool ChamTaiCho(string? loiTruoc)
    {
        if (!ManChonTenView.ChiDoiCham(_ct.Buoc, loiTruoc, _ct.Loi) || _cham is not { IsDisposed: false } c) return false;
        var so = _ct.So.Length;
        var sai = _ct.ConLan is int n && n > 0 && so == 0;
        if (c.So == so && c.Sai == sai) return true;
        c.So = so;
        c.Sai = sai;
        c.Invalidate();
        return true;
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
        // #324 (video Đăng xuất, khung 18–24): máy riêng tự vào không PIN ⇒ không dựng thẻ «Nhập PIN» chỉ để chớp qua trong lúc chờ dịch vụ
        var mayRieng = _hs?.MayRieng ?? false;
        if (!mayRieng) VeChonTen();
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.DangNhapBe, Id = be.Id, Code = be.CoPin && !(_hs?.MayRieng ?? false) ? _ct.So : null });   // máy riêng: không PIN
        if (IsDisposed) return;
        ManChonTenView.KetQuaPin(_ct, r.Ok, r.Status, r.ConLan, r.ChoGiay, r.Error ?? r.Message, DateTimeOffset.Now);
        if (!(mayRieng && r.Ok)) VeChonTen();   // máy riêng vào được ⇒ khay đóng màn khoá ngay (DaVao), khỏi dựng thẻ PIN
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
        _chan.Text = _chonTen ? DangNhapView.ChanTrang(null, ManChonTenView.TenMayThat()) : _chan.Text;
        using var veMotLan = KhongNhay.DungVe(_center);   // #308
        _center.SuspendLayout();
        if (_khoi != null) { _center.Controls.Remove(_khoi); if (_count.Parent != null) _count.Parent.Controls.Remove(_count); _khoi.Dispose(); }
        _code = null; _demTamKhoa = null; _vong = null; _cham = null;
        _kichChonTen = ClientSize;
        _mucChonTen = 0;
        _kPin = CacMucPin[0];
        _center.AutoScrollPosition = Point.Empty;
        Control DungBuoc() => _ct.Buoc switch
        {
            BuocChonTen.NhapPin => ThePin(),
            BuocChonTen.TamKhoa => TheTamKhoa(),
            BuocChonTen.QuenPin => TheQuen(),
            BuocChonTen.BaMeMa => TheBaMe(),
            _ => TheChonTen(),
        };
        _khoi = DungBuoc();
        _center.Controls.Add(_khoi);
        _center.ResumeLayout(true);
        if (_ct.Buoc != BuocChonTen.ChonTen && ClientSize.Height > 0)
        {
            // #324 (ảnh 4–5: máy 1366×768 ở 125%): thẻ PIN 600 px cao ~790 px thiết kế — cao hơn màn ⇒ khung giữa hiện thanh cuộn, thẻ tràn đáy
            // và lúc dựng lại (tắt vẽ) Windows chép khối điểm ảnh cũ theo vị trí cuộn ⇒ mảng trắng / đen, bàn phím số lệch. Không vừa ⇒ dựng bản gọn.
            var cho = ClientSize.Height - UI.Px(40) - _chan.Height - UI.Px(24);   // trên: lề 40 · dưới: chừa dòng chân trang (GiuaKhoi giữ thẻ trên nó)
            for (int i = 1; _khoi.Height > cho && i < CacMucPin.Length; i++)
            {
                _kPin = CacMucPin[i];
                _center.SuspendLayout();
                _center.Controls.Remove(_khoi);
                _khoi.Dispose();
                _code = null; _demTamKhoa = null; _vong = null; _cham = null;
                _khoi = DungBuoc();
                _center.Controls.Add(_khoi);
                _center.ResumeLayout(true);
            }
        }
        if (_ct.Buoc == BuocChonTen.ChonTen && ClientSize.Height > 0)
        {
            // không vừa giữa đầu màn và nút «Ba Mẹ dùng máy» ⇒ dựng lại bản gọn (như màn khoá thường: cuộn sẽ lộ nền đen / đè nút)
            var nutCao = _nutBaMe?.Height ?? UI.Px(64);
            var choToiDa = ClientSize.Height - nutCao - UI.Px(96) - UI.Px(8) - UI.Px(60);
            while (_khoi.Height > choToiDa && _mucChonTen < CacMucChonTen.Length - 1)
            {
                _mucChonTen++;
                _center.SuspendLayout();
                _center.Controls.Remove(_khoi);
                _khoi.Dispose();
                _khoi = TheChonTen();
                _center.Controls.Add(_khoi);
                _center.ResumeLayout(true);
            }
        }
        GiuaKhoi();
        // thẻ cao tới sát chip «Máy đang khoá» (nhiều bé, màn thấp) ⇒ bỏ chip cho khỏi đè thẻ
        if (_chipKhoa != null && _chonTen && _ct.Buoc == BuocChonTen.ChonTen) _chipKhoa.Visible = _khoi.Top >= _chipKhoa.Bottom + UI.Px(8);
        DatGocChu();
        ActiveControl = null;   // phím số đi vào màn (KeyPreview), không vào nút đang có tiêu điểm — bỏ tiêu điểm, không cần control nhận được (an toàn trong khối tắt vẽ)
    }

    private (ClayFlow The, int W) The(int rong)
    {
        var the = TheMoi(Q(rong) + VeThe.LeBong.Horizontal, true);
        the.Padding = VeThe.Pad(Q(rong >= 700 ? 48 : 40), Q(rong >= 700 ? 32 : 22), Q(rong >= 700 ? 48 : 40), Q(28));
        return (the, Q(rong) + VeThe.LeBong.Horizontal - the.Padding.Horizontal);
    }

    private Control Giua(Control c, int w, int tren = 0)
    {
        // #324: control tự co (bàn phím số TableLayoutPanel, «Quên PIN?», viên «Máy sẽ nhớ con») chưa vào cha thì Width vẫn là cỡ mặc định (200)
        // ⇒ lề căn giữa tính sai, bàn phím / viên ghi lệch phải và tràn mép thẻ. Đặt đúng cỡ ưng ý trước khi tính lề.
        if (c.AutoSize) c.Size = c.PreferredSize;
        c.Margin = new Padding(Math.Max(0, (w - c.Width) / 2), Q(tren), 0, 0);
        return c;
    }

    /// <summary>#324: các mức thu nhỏ thẻ PIN / chờ 15 giây / quên PIN / Ba Mẹ nhập mã khi màn thấp (1366×768, 125–150%) — 1 = đúng Bàn.</summary>
    private static readonly float[] CacMucPin = { 1f, 0.84f, 0.72f, 0.6f, 0.5f };
    private float _kPin = 1f;
    /// <summary>px thiết kế × mức gọn × DPI.</summary>
    private int Q(int v) => UI.Px((int)Math.Round(v * _kPin));
    /// <summary>px thiết kế × mức gọn (cho hàm tự nhân DPI: KhoiCon.Nut, Rob, Vien).</summary>
    private int Qd(int v) => (int)Math.Round(v * _kPin);
    /// <summary>cỡ chữ × mức gọn (không nhỏ hơn 8pt).</summary>
    private float Qf(float pt) => Math.Max(8f, pt * _kPin);

    /// <summary>Nút «‹» ở GÓC thẻ (thiết kế .lui: cách mép trái / trên thẻ 24 px, tròn 52) — không chiếm hàng riêng trong dòng chảy:
    /// lề âm kéo nút về góc và trả lại đúng chiều cao nó chiếm, nên Grow / tên bé bên dưới vẫn bắt đầu ở đỉnh thẻ như HTML (nút nằm đè lên trên).</summary>
    private Control NutLui(ClayFlow the)
    {
        var rong = Q(52) + VeNut.LeBong.Horizontal;
        var cao = Q(52) + VeNut.LeBong.Vertical;
        var b = new ClayButton { Text = "‹", Font = UI.F(Qf(20f), FontStyle.Bold), ForeColor = Clay.NgocInk, BackColor = Clay.The, BoGoc = Q(26),
            Size = new Size(rong, cao), TabStop = false };
        var trai = Q(24) + VeThe.LeBong.Left - VeNut.LeBong.Left - the.Padding.Left;
        var tren = Q(24) + VeThe.LeBong.Top - VeNut.LeBong.Top - the.Padding.Top;
        b.Margin = new Padding(trai, tren, 0, -(tren + cao));
        b.Click += (_, _) => Lui();
        return b;
    }

    private VienTen Vien(HoSoBe be, int co)
    {
        var ds = _hs?.Con ?? new List<HoSoBe> { be };
        var i = Math.Max(0, ds.FindIndex(c => c.Id == be.Id));
        var chu = DangNhapView.ChuDauDs(ds.Select(c => c.Ten));
        return new VienTen { Chu = i < chu.Count ? chu[i] : DangNhapView.ChuDau(be.Ten), Mau = i, DangChon = true, Size = new Size(UI.Px(co), UI.Px(co)), Margin = Padding.Empty };
    }

    private Label ChuGiua(string text, float pt, bool dam, Color mau, int w, int tren)
    {
        var l = Chu(text, Qf(pt), dam, mau, w, true);
        l.Margin = new Padding(0, Q(tren), 0, 0);
        return l;
    }

    /// <summary>Ba mức cỡ của lưới tên (px thiết kế ở 100%): 0 = đúng Bàn 1920×1080; 1, 2 = bản gọn khi nhiều bé / màn thấp để cả thẻ vừa giữa chip đầu màn và nút «Ba Mẹ dùng máy».</summary>
    private sealed record MucChonTen(int Rong, int PadNgang, int PadTren, int PadDuoi, int Grow, float Tieu, float Phu, int OTen, int Khe, int KheHang,
        int CaoSao, int CaoKhong, int PadOTren, int Vien, float PtTen, int TenTren, float PtSao, int CaoChip, float PtChan1, float PtChan2, int TrenChan);

    private static readonly MucChonTen[] CacMucChonTen =
    {
        new(800, 48, 32, 28, 150, 31.5f, 16.5f, 240, 28, 26, 276, 236, 26, 120, 21f, 10, 12f, 34, 12f, 11.25f, 22),
        new(720, 40, 20, 18, 96, 28f, 14f, 200, 24, 22, 196, 160, 18, 84, 17f, 8, 11f, 30, 11f, 10.5f, 14),
        new(560, 28, 14, 12, 0, 22f, 12f, 132, 14, 16, 130, 102, 12, 48, 13f, 6, 9.5f, 26, 10f, 9.5f, 8),
    };
    private int _mucChonTen;
    private Size _kichChonTen;

    /// <summary>01 «Ai đang dùng máy?» — thẻ 800 (nở theo số cột khi cần), Grow 150, tiêu đề 42px, lưới thẻ tên 240×236 (viên chữ 120 + tên 28px); bản gọn theo <see cref="_mucChonTen"/>.</summary>
    private Control TheChonTen()
    {
        var m = CacMucChonTen[Math.Clamp(_mucChonTen, 0, CacMucChonTen.Length - 1)];
        var ds = _hs?.Con ?? new List<HoSoBe>();
        var le = VeThe.LeBong;
        var oRong = UI.Px(m.OTen);
        var khe = UI.Px(m.Khe);
        var padN = UI.Px(m.PadNgang);
        // bước giữa hai thẻ = rộng thẻ thật + khe thiết kế; lề bóng chỉ cộng MỘT lần ở biên khung (khe >= lề bóng nên hai ô kề nhau không chồng nhau)
        var rongMan = ClientSize.Width > 0 ? ClientSize.Width - UI.Px(48) : UI.Px(1100);
        var cot = Math.Max(1, Math.Min(Math.Max(1, ds.Count), (rongMan - 2 * padN - le.Horizontal + khe) / (oRong + khe)));
        var rongLuoi = cot * oRong + (cot - 1) * khe + le.Horizontal;
        var rongThe = Math.Max(UI.Px(m.Rong), rongLuoi + 2 * padN);   // px thật, chưa gồm lề bóng của thẻ
        var the = TheMoi(rongThe + le.Horizontal, true);
        the.Padding = VeThe.Pad(padN, UI.Px(m.PadTren), padN, UI.Px(m.PadDuoi));
        var w = rongThe + le.Horizontal - the.Padding.Horizontal;
        if (m.Grow > 0) the.Controls.Add(Giua(KhoiThietKe.Rob("rob-goc", m.Grow), w));
        the.Controls.Add(ChuGiua(ManChonTenView.TieuChon, m.Tieu, true, UI.Ink, w, m.Grow > 0 ? 10 : 0));
        the.Controls.Add(ChuGiua(ManChonTenView.DanhCho(ds.Select(c => c.Ten).ToList()) ?? ManChonTenView.PhuChon, m.Phu, false, UI.Muted, w, 6));
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
            // lưới đặt vị trí tay (không FlowLayoutPanel tự co): thẻ tên nằm HÀNG NGANG, hết chỗ mới xuống hàng, hàng cuối thiếu thì căn giữa.
            // Vị trí gán lúc dựng; màn dựng lại khi đổi kích thước / DPI (Resize ở KhoiTaoChonTen) nên không cần gắn lại.
            var coSao = ds.Any(c => c.Sao.HasValue);
            var oCaoBody = UI.Px(coSao ? m.CaoSao : m.CaoKhong);
            var oCao = oCaoBody + le.Vertical;
            var buocHang = oCaoBody + UI.Px(m.KheHang);   // khoảng cách hàng đúng thiết kế (không cộng lề bóng)
            var hang = (ds.Count + cot - 1) / cot;
            var tren = UI.Px(m.Grow > 0 ? 26 : 16);
            var luoi = new Panel { BackColor = Color.Transparent, Margin = Padding.Empty };
            luoi.Size = new Size(rongLuoi, tren + (hang - 1) * buocHang + oCao);
            var chu = DangNhapView.ChuDauDs(ds.Select(c => c.Ten));
            var buocCot = oRong + khe;
            for (int i = 0; i < ds.Count; i++)
            {
                var be = ds[i];
                var h = i / cot;
                var trongHang = h == hang - 1 ? ds.Count - h * cot : cot;
                var x = (i % cot) * buocCot + (cot - trongHang) * buocCot / 2;
                var o = new ClayFlow { FlowDirection = FlowDirection.TopDown, WrapContents = false, BoGoc = UI.Px(m.OTen >= 200 ? 32 : 24), Cursor = Cursors.Hand,
                    Size = new Size(oRong + le.Horizontal, oCao), Padding = VeThe.Pad(0, UI.Px(m.PadOTren), 0, 0),
                    Margin = Padding.Empty, Location = new Point(x, tren + h * buocHang) };
                var v = new VienTen { Chu = chu[i], Mau = i, Size = new Size(UI.Px(m.Vien), UI.Px(m.Vien)), Margin = new Padding((oRong - UI.Px(m.Vien)) / 2, 0, 0, 0), Cursor = Cursors.Hand };
                var t = Chu(be.Ten, m.PtTen, true, UI.Ink, oRong, true);
                t.Margin = new Padding(0, UI.Px(m.TenTren), 0, 0);
                t.Cursor = Cursors.Hand;
                o.Controls.Add(v); o.Controls.Add(t);
                void Bam(object? _, EventArgs __) => _ = ChonBeAsync(be);
                o.Click += Bam; v.Click += Bam; t.Click += Bam;
                // 15/11 (them-x8kmmyl5): sao từng bé — «18 sao» vàng / «−20 sao» cam (đang nợ)
                if (be.Sao is int sb)
                {
                    var chip = new ChipClay(SaoView.SoDu(sb), sb < 0 ? Clay.CanhSoft : Clay.DiemSoft, sb < 0 ? Clay.Canh : Clay.DiemInk, Anh3D.Icon("sao"), kim: sb >= 0) { Font = UI.F(m.PtSao, FontStyle.Bold), Cursor = Cursors.Hand };
                    // chip không rộng hơn thẻ (vd «−1.250 sao» ở 150%): co chữ dần cho vừa
                    var toiDa = oRong - UI.Px(8);
                    var pt = m.PtSao;
                    while (TextRenderer.MeasureText(chip.Text, chip.Font).Width + UI.Px(48) > toiDa && pt > 7f) { pt -= 0.5f; chip.Font = UI.F(pt, FontStyle.Bold); }
                    chip.Size = new Size(Math.Min(toiDa, TextRenderer.MeasureText(chip.Text, chip.Font).Width + UI.Px(48)), UI.Px(m.CaoChip));
                    chip.Margin = new Padding(Math.Max(0, (oRong - chip.Width) / 2), UI.Px(6), 0, 0);
                    chip.Click += Bam;
                    o.Controls.Add(chip);
                }
                luoi.Controls.Add(o);
            }
            the.Controls.Add(Giua(luoi, w));
        }
        if (_ct.Loi != null) the.Controls.Add(ChuGiua(_ct.Loi, 12f, true, Clay.Canh, w, 12));
        if (ds.Count > 0 && !(_hs?.MayRieng ?? false))
        {
            // them-x8kmmyl5: ô ấn lõm nền Clay.Lom, icon «?» + hai dòng (đậm / thường)
            the.Controls.Add(Giua(new OKhongThayTen(ManChonTenView.KhongThayTen, ManChonTenView.NhoBaMeThem, Qf(m.PtChan1 + 1f), Qf(m.PtChan2 + 0.5f), Anh3D.Icon("dau_hoi"), _kPin), w, m.TrenChan));
        }
        else the.Controls.Add(ChuGiua(ManChonTenView.GhiChon, m.PtChan2, false, UI.Muted, w, m.TrenChan));
        return the;
    }

    /// <summary>Viên + tên bé ở đầu các thẻ PIN (viên 120, tên 28px).</summary>
    private void DauBe(ClayFlow the, int w)
    {
        the.Controls.Add(NutLui(the));
        if (_ct.Be is not { } be) return;
        var v = Vien(be, Qd(120));
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
        var cham = new ChamPin { So = _ct.So.Length, Sai = sai && _ct.So.Length == 0, Size = new Size(Q(4 * 26 + 3 * 22), Q(30)) };
        _cham = cham;
        the.Controls.Add(Giua(cham, w, 18));
        if (_ct.Loi != null) the.Controls.Add(ChuGiua(_ct.Loi, 12f, true, Clay.Canh, w, 8));
        var pad = new TableLayoutPanel { ColumnCount = 3, RowCount = 4, AutoSize = true, BackColor = Color.Transparent, Margin = Padding.Empty };
        var phim = new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫" };
        foreach (var k in phim)
        {
            if (k.Length == 0) { pad.Controls.Add(new Panel { Size = new Size(Q(104), Q(60)), BackColor = Color.Transparent, Margin = new Padding(Q(8), Q(6), Q(8), Q(6)) }); continue; }
            var xoa = k == "⌫";
            var b = new ClayButton { Text = k, Font = UI.F(Qf(xoa ? 17f : 19.5f), FontStyle.Bold), ForeColor = xoa ? UI.Muted : UI.Ink, BackColor = Clay.The, BoGoc = Q(22),
                Kieu = xoa ? KieuClay.Phang : KieuClay.TuDong, TabStop = false, Enabled = !_ct.DangGui,
                Size = new Size(Q(104) + VeNut.LeBong.Horizontal, Q(60) + VeNut.LeBong.Vertical), Margin = new Padding(Q(5), Q(3), Q(5), Q(3)) };
            var kk = k;
            b.Click += (_, _) => { if (xoa) XoaSo(); else BamSo(kk[0]); };
            pad.Controls.Add(b);
        }
        pad.PerformLayout();
        the.Controls.Add(Giua(pad, w, 16));
        var quen = KhoiCon.LienKet(ManChonTenView.LinkQuen, null, () => { ManChonTenView.MoQuen(_ct); VeChonTen(); }, Qf(15f), Clay.KimInk);
        quen.PerformLayout();
        the.Controls.Add(Giua(quen, w, 6));
        if (!sai) the.Controls.Add(Giua(VienGhi(ManChonTenView.NhoMay, "tick", false, _kPin), w, 6));
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
        _vong = new VongDem { Phan = Math.Clamp(con / (float)DangNhapView.PinChoGiay, 0f, 1f), Size = new Size(Q(170), Q(170)) };
        _demTamKhoa = new Label { Text = $"{con / 60}:{con % 60:00}", Font = UI.F(Qf(34.5f), FontStyle.Bold), ForeColor = Clay.Canh, BackColor = Color.Transparent, AutoSize = false,
            TextAlign = ContentAlignment.BottomCenter, Bounds = new Rectangle(0, Q(30), Q(170), Q(66)) };
        var giay = new Label { Text = "giây", Font = UI.F(Qf(12.75f)), ForeColor = UI.Muted, BackColor = Color.Transparent, AutoSize = false, TextAlign = ContentAlignment.TopCenter,
            Bounds = new Rectangle(0, Q(98), Q(170), Q(26)) };
        _vong.Controls.Add(_demTamKhoa); _vong.Controls.Add(giay);
        the.Controls.Add(Giua(_vong, w, 22));
        var quen = KhoiCon.LienKet(ManChonTenView.LinkQuenNho, "nguoi", () => { ManChonTenView.MoQuen(_ct); VeChonTen(); }, Qf(15f), Clay.KimInk);
        quen.PerformLayout();
        the.Controls.Add(Giua(quen, w, 14));
        return the;
    }

    /// <summary>05 «Quên PIN rồi à?» — 3 bước Ba Mẹ đặt lại, «Báo Ba Mẹ giúp con», «Có PIN mới · nhập lại», «Chọn bé khác».</summary>
    private Control TheQuen()
    {
        var (the, w) = The(600);
        the.Controls.Add(NutLui(the));
        if (_kPin > 0.65f) the.Controls.Add(Giua(KhoiThietKe.Rob("rob-goc", Qd(150)), w));   // bản gọn nhất bỏ Grow (#324)
        the.Controls.Add(ChuGiua(ManChonTenView.TieuQuen, 31.5f, true, UI.Ink, w, 10));
        the.Controls.Add(ChuGiua(ManChonTenView.PhuQuen, 16.5f, false, UI.Muted, w, 6));
        var buoc = new[] { (1, ManChonTenView.Buoc1, "nha"), (2, ManChonTenView.Buoc2(_ct.Be?.Ten), (string?)null), (3, ManChonTenView.Buoc3, "khoa") };
        foreach (var (so, chu, icon) in buoc)
        {
            var hang = new ClayCard { Lom = true, BoGoc = Q(22), BackColor = Clay.Lom, Size = new Size(w, Q(64) + VeThe.LeBong.Vertical), Margin = new Padding(0, Q(so == 1 ? 20 : 10), 0, 0) };
            var tron = new VienTen { Chu = so.ToString(), Mau = -1, Size = new Size(Q(38), Q(38)), Location = new Point(VeThe.LeBong.Left + Q(18), VeThe.LeBong.Top + Q(13)) };
            var t = new Label { Text = chu, Font = UI.F(Qf(15f), FontStyle.Bold), ForeColor = UI.Ink, BackColor = Color.Transparent, AutoSize = true, UseMnemonic = false,
                Location = new Point(VeThe.LeBong.Left + Q(72), VeThe.LeBong.Top + Q(19)) };
            hang.Controls.Add(tron); hang.Controls.Add(t);
            Control phai = icon != null
                ? new ClayIcon { Size = new Size(Q(32), Q(32)), MauVien = Color.Transparent, Hinh = Anh3D.Icon(icon) }
                : _ct.Be is { } be ? Vien(be, Qd(38)) : new Panel();
            phai.Location = new Point(w - VeThe.LeBong.Right - Q(18) - phai.Width, VeThe.LeBong.Top + (Q(64) - phai.Height) / 2);
            hang.Controls.Add(phai);
            the.Controls.Add(hang);
        }
        var bao = VienGhi(_ct.DaBao ? ManChonTenView.DaBao : ManChonTenView.NutBao, _ct.DaBao ? "tick" : "tin", !_ct.DaBao, _kPin);
        if (!_ct.DaBao) { bao.Cursor = Cursors.Hand; bao.Click += (_, _) => _ = BaoBaMeAsync(); foreach (Control c in bao.Controls) { c.Cursor = Cursors.Hand; c.Click += (_, _) => _ = BaoBaMeAsync(); } }
        the.Controls.Add(Giua(bao, w, 14));
        if (_ct.Loi != null) the.Controls.Add(ChuGiua(_ct.Loi, 12f, true, Clay.Canh, w, 6));
        var moi = KhoiCon.Nut(ManChonTenView.NutCoPinMoi, true, w, "tick", Qd(64), Qf(16.5f));
        moi.Margin = new Padding(0, Q(16), 0, 0);
        moi.Click += (_, _) => { _ = TaiHoSoAsync(); if (_ct.Be is { } b) { ManChonTenView.ChonBe(_ct, _hs?.Con.FirstOrDefault(c => c.Id == b.Id) ?? b, DateTimeOffset.Now); _ct.ConLan = null; } VeChonTen(); };
        the.Controls.Add(moi);
        var khac = KhoiCon.Nut(ManChonTenView.NutChonKhac, false, w, "nguoi", Qd(64), Qf(16.5f));
        khac.Margin = new Padding(0, Q(12), 0, 0);
        khac.Click += (_, _) => { ManChonTenView.VeDau(_ct); VeChonTen(); };
        the.Controls.Add(khac);
        return the;
    }

    /// <summary>06 «Ba Mẹ nhập mã» — khiên 110, 6 ô (64×78), «Mã 6 số · đổi sau 10 phút · gõ bằng bàn phím», «Mở máy cho Ba Mẹ».</summary>
    private Control TheBaMe()
    {
        var (the, w) = The(600);
        the.Controls.Add(NutLui(the));
        the.Controls.Add(Giua(new ClayIcon { Size = new Size(Q(110), Q(110)), MauVien = Color.Transparent, Hinh = Anh3D.Icon("khien") }, w));
        the.Controls.Add(ChuGiua(ManChonTenView.TieuBaMe, 31.5f, true, UI.Ink, w, 10));
        the.Controls.Add(ChuGiua(ManChonTenView.PhuBaMe, 16.5f, false, UI.Muted, w, 6));
        var o = new OMa { Ma = _ct.So, Size = new Size(Q(6 * 64 + 5 * 12), Q(78)) };
        the.Controls.Add(Giua(o, w, 22));
        the.Controls.Add(ChuGiua(_ct.Loi ?? ManChonTenView.GhiMa, 11.25f, _ct.Loi != null, _ct.Loi != null ? Clay.Canh : UI.Muted, w, 12));
        the.Controls.Add(Giua(VienGhi(ManChonTenView.KhongTru, "dong_ho_cat", false, _kPin), w, 12));
        var mo = KhoiCon.Nut(_ct.DangGui ? "Đang mở…" : ManChonTenView.NutMo, true, w, "mo_khoa", Qd(64), Qf(16.5f));
        mo.Margin = new Padding(0, Q(16), 0, 0);
        mo.Enabled = _ct.So.Length == ManChonTenView.SoChuSoMa && !_ct.DangGui;
        mo.Click += (_, _) => _ = GuiMaAsync();
        the.Controls.Add(mo);
        return the;
    }

    /// <summary>Viên ghi chú bo tròn cao 44 (thiết kế «.ghi»): nền ngọc nhạt (hoặc cam) + icon 24 + chữ đậm 17px.</summary>
    internal static ClayFlow VienGhi(string chu, string icon, bool cam, float k = 1f)
    {
        int P(int n) => UI.Px((int)Math.Round(n * k));
        var v = new ClayFlow { FlowDirection = FlowDirection.LeftToRight, WrapContents = false, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, BoGoc = P(22),
            BackColor = cam ? Clay.CanhSoft : Clay.NgocSoft, Padding = VeThe.Pad(P(16), P(9), P(18), P(9)), Margin = Padding.Empty };
        v.Controls.Add(new ClayIcon { Size = new Size(P(26), P(26)), MauVien = Color.Transparent, Hinh = Anh3D.Icon(icon), Margin = new Padding(0, 0, P(8), 0) });
        var t = UI.Text(chu, Math.Max(8f, 12.75f * k), true, cam ? Clay.Canh : Clay.NgocInk, P(520));
        t.Margin = new Padding(0, P(3), 0, 0);
        v.Controls.Add(t);
        v.PerformLayout();
        return v;
    }
}

/// <summary>Viên tròn chữ cái đầu tên bé (phong cách E «Ánh kim»: «.be.on .av»): lòng màu RIÊNG từng bé (bảng 5 tông ngọc trai sẫm hài hoà E, theo thứ tự bé),
/// viền vàng kim mảnh (dày hơn khi <see cref="DangChon"/>), chữ vàng kim nhạt, bóng mềm. Chữ/lòng ≥ 4,8:1 ở điểm sáng nhất của mọi màu.
/// <see cref="Mau"/> = -1 ⇒ viên số bước (navy đặc, không viền, chữ kem).</summary>
internal sealed class VienTen : Control
{
    // E: avatar bé mọi bé đều navy (gradient tâm ThanChi → Chu) chữ vàng kim, vòng vàng kim — không còn màu riêng từng bé (lỗi G5)
    private static readonly (Color Tren, Color Duoi)[] Bang = { (Clay.ThanChi, Clay.Chu) };

    public string Chu { get; set; } = "";
    public int Mau { get; set; }
    /// <summary>Bé đang chọn (thẻ PIN): vòng vàng kim dày hơn, vẫn giữ màu riêng.</summary>
    public bool DangChon { get; set; }

    public VienTen()
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        Clay.ChatLuong(g);
        var vien = Mau < 0 ? 0f : Math.Max(2f, Width / 24f) * (DangChon ? 1.7f : 1f);
        var bong = Mau < 0 ? 0f : Math.Max(2f, Width / 20f);
        var r = new RectangleF(bong / 2, 0, Width - bong - 1, Height - bong - 1);
        if (bong > 0)
            using (var b = new SolidBrush(Clay.A(70, Clay.Bong))) g.FillEllipse(b, new RectangleF(r.X + bong / 3, r.Y + bong, r.Width, r.Height));
        if (vien > 0)
            using (var pv = new GraphicsPath())
            {
                pv.AddEllipse(r);
                Clay.ToKim(g, pv, r);
            }
        var tron = RectangleF.Inflate(r, -vien, -vien);
        if (tron.Width < 2) return;
        if (Mau < 0) using (var b = new SolidBrush(Clay.Ngoc)) g.FillEllipse(b, tron);
        else
        {
            // radial-gradient(circle at 35% 30%, sáng, tối 70%) theo màu của bé
            var (mt, md) = Bang[Mau % Bang.Length];
            using var pt = new GraphicsPath();
            pt.AddEllipse(tron);
            using var pg = new PathGradientBrush(pt)
            {
                CenterPoint = new PointF(tron.X + tron.Width * 0.35f, tron.Y + tron.Height * 0.3f),
                CenterColor = mt, SurroundColors = new[] { md },
            };
            g.FillEllipse(pg, tron);
        }
        // cỡ chữ theo cỡ viên ở 96 dpi (thiết kế: viên 120 ⇒ chữ 54px ≈ 40pt), để UI.F tự theo DPI như mọi chữ khác
        using var f = UI.F(Math.Max(6f, Height / Math.Max(0.5f, Clay.Scale) * (Mau < 0 ? 0.27f : 0.33f)), FontStyle.Bold);
        TextRenderer.DrawText(g, Chu, f, Rectangle.Round(tron), Mau < 0 ? Clay.NenSang : Clay.KimSang, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
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
        // #324: chấm 26 · khe 22 (px thiết kế) chia theo bề rộng thật — thẻ PIN bản gọn thu nhỏ control thì chấm thu theo, không mất chấm thứ 4
        var don = Width / (Tong * 26f + Math.Max(0, Tong - 1) * 22f);
        float d = Math.Min(26f * don, Height), gap = 22f * don;
        for (int i = 0; i < Tong; i++)
        {
            var r = new RectangleF(i * (d + gap), (Height - d) / 2f, d, d);
            Color tren, duoi;
            if (Sai) { tren = Color.FromArgb(0xf0, 0x8a, 0x5a); duoi = Color.FromArgb(0xb4, 0x23, 0x18); }
            else if (i < So) { tren = Clay.ThanChi; duoi = Clay.Ngoc; }
            else { tren = Clay.Tron(Clay.Lom, Clay.Bong, 0.18f); duoi = Clay.Lom; }
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
        // #324: ô 64×78 · khe 12 (px thiết kế) theo bề rộng thật — thẻ «Ba Mẹ nhập mã» bản gọn thu nhỏ control thì 6 ô thu theo, không tràn
        var k = Width / (float)UI.Px(6 * 64 + 5 * 12);
        float w = UI.Px(64) * k, gap = UI.Px(12) * k, h = Math.Min(Height - 1, UI.Px(78) * k), bo = UI.Px(20) * k;
        using var f = UI.F(Math.Max(8f, 27f * k), FontStyle.Bold);
        for (int i = 0; i < ManChonTenView.SoChuSoMa; i++)
        {
            var r = new RectangleF(i * (w + gap), 0, w, h);
            using var p = Clay.Bo(r, bo);
            using (var b = new SolidBrush(Clay.Lom)) g.FillPath(b, p);
            if (i == Ma.Length) using (var pen = new Pen(Clay.Ngoc, UI.Px(3) * k)) g.DrawPath(pen, p);
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
        using (var b = new SolidBrush(Clay.Lom)) g.FillEllipse(b, r);
        using (var b = new SolidBrush(Clay.KimDam)) g.FillPie(b, r.X, r.Y, r.Width, r.Height, -90f, 360f * Math.Clamp(Phan, 0f, 1f));
        var trong = RectangleF.Inflate(r, -Width * 15f / 170f, -Height * 15f / 170f);
        using (var b = new SolidBrush(Clay.The)) g.FillEllipse(b, trong);
    }
}


/// <summary>Ô «Không thấy tên con?» (them-x8kmmyl5 .khong): nền lõm (Clay.Lom) bo 24 ấn lõm, icon «?» 40, dòng đậm + dòng phụ.</summary>
internal sealed class OKhongThayTen : Control
{
    private readonly string _t1, _t2;
    private readonly Font _f1, _f2;
    private readonly Image? _icon;
    private readonly float _k;

    public OKhongThayTen(string t1, string t2, float pt1, float pt2, Image? icon, float k)
    {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
        BackColor = Color.Transparent; TabStop = false;
        _t1 = t1; _t2 = t2; _icon = icon; _k = k;
        _f1 = UI.F(pt1, FontStyle.Bold); _f2 = UI.F(pt2, FontStyle.Regular);
        var w1 = TextRenderer.MeasureText(t1, _f1, new Size(int.MaxValue, int.MaxValue), TextFormatFlags.NoPadding).Width;
        var w2 = TextRenderer.MeasureText(t2, _f2, new Size(int.MaxValue, int.MaxValue), TextFormatFlags.NoPadding).Width;
        var h1 = _f1.Height; var h2 = _f2.Height;
        Size = new Size(P(14) + P(40) + P(14) + Math.Max(w1, w2) + P(22), Math.Max(P(12) * 2 + h1 + h2, P(64)));
    }

    private int P(int v) => UI.Px((int)Math.Round(v * _k));

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        var r = new RectangleF(0.5f, 0.5f, Width - 2, Height - 2);
        using (var path = Clay.Bo(r, Height / 2f > P(24) ? P(24) : Height / 2f))
        {
            using (var b = new SolidBrush(Clay.Lom)) g.FillPath(b, path);
            using var pen = new Pen(Clay.A(70, Clay.Bong), Math.Max(1f, UI.Px(2) / 1f));
            var old = g.Clip;
            g.SetClip(new RectangleF(0, 0, Width, Math.Max(2, Height / 4)), CombineMode.Intersect);
            g.DrawPath(pen, path);   // viền tối mỏng ở mép trên = bóng ấn lõm
            g.Clip = old;
            using var sang = new Pen(Clay.BongSang, Math.Max(1f, UI.Px(1)));
            g.SetClip(new RectangleF(0, Height * 3 / 4f, Width, Height / 4f), CombineMode.Intersect);
            g.DrawPath(sang, path);
            g.ResetClip();
        }
        var ic = P(40);
        if (_icon != null) { g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.DrawImage(_icon, new Rectangle(P(14), (Height - ic) / 2, ic, ic)); }
        var x = P(14) + ic + P(14);
        var h = _f1.Height + _f2.Height;
        var y = (Height - h) / 2;
        const TextFormatFlags f = TextFormatFlags.NoPadding | TextFormatFlags.Left | TextFormatFlags.NoPrefix;
        TextRenderer.DrawText(g, _t1, _f1, new Point(x, y), Clay.Chu, f);
        TextRenderer.DrawText(g, _t2, _f2, new Point(x, y + _f1.Height), Clay.Chu3, f);
    }

    protected override void Dispose(bool disposing) { if (disposing) { _f1.Dispose(); _f2.Dispose(); } base.Dispose(disposing); }
}
