using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;
using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Nộp bài một nhiệm vụ (thiết kế chốt 05/11, con-ngay-thuong 05 / 07 / 14; L9): theo cách báo xong Ba Mẹ chọn —
///   • ảnh: tối đa 3 ảnh (Chụp ảnh mở app Camera của Windows · Chọn ảnh có sẵn), nén ≤ 300 KB/ảnh, viết thêm nếu cần;
///   • ghi âm: hai thẻ «Ghi âm | Viết» — ghi bằng micro của máy (WAV 8 kHz, ≤ 4 phút ≈ ≤ 2 MB như máy chủ cho), nghe lại, ghi lại;
///   • viết: vài câu kể lại; • bấm Xong: không cần bằng chứng.
/// Nộp xong ⇒ «Đã nộp cho Ba Mẹ · Chờ Ba Mẹ xem…» (việc tự duyệt ⇒ «+N sao»). Máy chủ quyết mọi luật (lib/nhiem-vu.ts › nop).
/// </summary>
internal sealed class NopBaiForm : HopKhayCoBan
{
    private const int AnhToiDa = 3;
    private readonly HvNhiemVu _nv;
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = 500, ForeColor = UI.Ink, Multiline = true, Height = UI.Px(56) };
    private readonly List<byte[]> _anh = new();
    private readonly GhiAm _ghi = new();
    private readonly System.Windows.Forms.Timer _dongHo = new() { Interval = 500 };
    private byte[]? _ghiAm;
    private TimeSpan _doDai;
    private bool _theViet;
    private bool _busy;
    private Label? _msg, _gio;

    /// <summary>Kết quả sau khi nộp (null nếu chưa nộp).</summary>
    public HvNopKq? Ket { get; private set; }

    public NopBaiForm(HvNhiemVu nv) : base("AiiGrow · Nộp bài", UI.Px(425))
    {
        _nv = nv;
        _theViet = nv.BangChung is "van_ban" or "viet";
        Text = "AiiGrow · " + TieuCuaSo();
        _note.PlaceholderText = nv.BangChung is "van_ban" or "viet" ? "Con viết vài câu kể lại nhé" : "Viết cho Ba Mẹ (nếu cần)";
        _dongHo.Tick += (_, _) => { if (_gio != null && _ghi.DangGhi) { _gio.Text = DongHo(_ghi.DaGhi); if (_ghi.DaGhi >= GhiAm.ToiDa) DungGhi(); } };
        FormClosed += (_, _) => { _dongHo.Dispose(); _ghi.Dispose(); _goiY.Dispose(); if (_note.Parent == null) _note.Dispose(); };
        Ve();
    }

    private string TieuCuaSo() => _nv.BangChung switch
    {
        "ghi_am" => "Nộp ghi âm", "van_ban" or "viet" => "Nộp bài viết", "xong" => "Báo xong", _ => "Nộp ảnh",
    };

    private static string DongHo(TimeSpan t) => $"{(int)t.TotalMinutes:00}:{t.Seconds:00}";

    private readonly ToolTip _goiY = new();

    private void Xoa()
    {
        _note.Parent?.Controls.Remove(_note);
        foreach (var pb in Flow.Controls.OfType<FlowLayoutPanel>().SelectMany(h => h.Controls.OfType<PictureBox>())) { pb.Image?.Dispose(); pb.Image = null; }
        XoaHet();
    }

    // =========================================================== vẽ

    private void Ve()
    {
        Xoa();
        Flow.Controls.Add(KhoiCon.LienKet("‹ Nhiệm vụ", null, Close));
        // đầu: icon kem 48 · tên + dòng gợi ý · chip +sao
        var dau = new TableLayoutPanel { ColumnCount = 2, RowCount = 1, Width = W, Height = UI.Px(60), BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, UI.Px(10)) };
        dau.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        dau.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        var trai = KhoiCon.Dau(AppConView.IconViec(_nv.Hinh, _nv.BangChung, _nv.Ten), KhoiCon.Mau.Cam, _nv.Ten, GoiY(), W - UI.Px(110));
        trai.Margin = Padding.Empty;
        dau.Controls.Add(trai, 0, 0);
        var sao = KhoiApp.ChipSao($"+{_nv.SoSao} sao"); sao.Anchor = AnchorStyles.Right;
        dau.Controls.Add(sao, 1, 0);
        Flow.Controls.Add(dau);
        if (_nv.TrangThai == "can_bo_sung")
        {
            var loi = string.IsNullOrWhiteSpace(_nv.LoiNhan) ? _nv.LyDo : _nv.LoiNhan;
            if (!string.IsNullOrWhiteSpace(loi)) Flow.Controls.Add(KhoiCon.DongIcon("tin", "Ba Mẹ nhắn: «" + loi!.Trim() + "»", W, true, Clay.Canh));
        }

        switch (_nv.BangChung)
        {
            case "ghi_am": VeGhiAm(); break;
            case "van_ban": case "viet": VeViet(true); break;
            case "xong": VeXong(); break;
            default: VeAnh(); break;
        }
        _msg = UI.Text("", 10.5f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        Xong();
    }

    private string GoiY()
    {
        if (!string.IsNullOrWhiteSpace(_nv.MoTa)) return _nv.MoTa.Trim();
        return _nv.BangChung switch
        {
            "ghi_am" => "Đọc to cho Ba Mẹ nghe nhé", "van_ban" or "viet" => "Con viết vài câu kể lại nhé", "xong" => "Làm xong thì bấm Xong nhé",
            _ => "Chụp ảnh cho Ba Mẹ xem",
        };
    }

    private void ThemONhan(string nhan)
    {
        var l = UI.Text(nhan, 10.5f, true, Clay.Chu2, W); l.Margin = new Padding(0, UI.Px(4), 0, UI.Px(4));
        Flow.Controls.Add(l);
        var o = ONhapClay.Boc(_note, W);
        if (_note.Multiline) o.Height = Math.Max(o.Height, _note.Height + UI.Px(22) + VeThe.LeBong.Vertical);   // ô viết nhiều dòng: lòng chảo cao theo ô
        Flow.Controls.Add(o);
    }

    private void NutNop(string chu)
    {
        var b = KhoiCon.Nut(chu, true, W, "gui");
        b.Click += async (_, _) => await NopAsync(b);
        Flow.Controls.Add(b);
        Flow.Controls.Add(UI.Text($"Ba Mẹ duyệt xong là con được +{_nv.SoSao} sao", 10f, false, UI.Muted, W));
    }

    // ---------------------------------------------------------------- ảnh (con-ngay-thuong 14)

    private void VeAnh()
    {
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(10));
        var o = (W - UI.Px(24)) / 3;
        for (int i = 0; i < _anh.Count; i++)
        {
            var pb = new PictureBox
            {
                Size = new Size(o, UI.Px(100)), SizeMode = PictureBoxSizeMode.Zoom, BackColor = Clay.Lom, Margin = new Padding(0, 0, UI.Px(12), 0),
                Cursor = Cursors.Hand,
            };
            using (var ms = new MemoryStream(_anh[i]))
            using (var goc = Image.FromStream(ms))
            {
                var (w, h) = AnhBangChung.Fit(goc.Width, goc.Height, UI.Px(200));   // ảnh nhỏ cho ô xem trước, không giữ bản 1280 px
                pb.Image = new Bitmap(goc, w, h);
            }
            var chiSo = i;
            pb.Click += (_, _) => { _anh.RemoveAt(chiSo); Ve(); };   // bấm ảnh = bỏ ảnh đó
            _goiY.SetToolTip(pb, "Bấm để bỏ ảnh này");
            hang.Controls.Add(pb);
        }
        if (_anh.Count < AnhToiDa)
        {
            var them = KhoiCon.Nut("+", false, o, null, 92, 22f);
            them.Margin = Padding.Empty;
            them.Click += (_, _) => ChonAnh();
            hang.Controls.Add(them);
        }
        Flow.Controls.Add(hang);
        var nut = KhoiCon.Hang();
        nut.Margin = new Padding(0, 0, 0, UI.Px(6));
        var chup = KhoiCon.Nut("Chụp ảnh", false, (W - UI.Px(12)) / 2, "camera");
        chup.Margin = new Padding(0, 0, UI.Px(12), 0);
        chup.Click += (_, _) => MoCamera();
        var chon = KhoiCon.Nut("Chọn ảnh có sẵn", false, (W - UI.Px(12)) / 2, "laptop");
        chon.Margin = Padding.Empty;
        chon.Click += (_, _) => ChonAnh();
        nut.Controls.Add(chup); nut.Controls.Add(chon);
        Flow.Controls.Add(nut);
        ThemONhan("Viết cho Ba Mẹ (nếu cần)");
        NutNop(_anh.Count > 0 ? $"Nộp {_anh.Count} ảnh cho Ba Mẹ" : "Nộp ảnh cho Ba Mẹ");
    }

    /// <summary>Mở app Camera của Windows; chụp xong Con bấm «Chọn ảnh có sẵn» (ảnh nằm ở Ảnh › Camera Roll).</summary>
    private void MoCamera()
    {
        try { Process.Start(new ProcessStartInfo("microsoft.windows.camera:") { UseShellExecute = true }); Bao("Chụp xong con bấm «Chọn ảnh có sẵn» nhé.", false); }
        catch { Bao("Máy này chưa mở được Camera. Con chọn ảnh có sẵn nhé.", true); }
    }

    private void ChonAnh()
    {
        var cuon = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "Camera Roll");
        using var dlg = new OpenFileDialog
        {
            Title = "Chọn ảnh cho Ba Mẹ", Multiselect = true,
            Filter = "Ảnh (*.jpg;*.jpeg;*.png;*.webp;*.bmp)|*.jpg;*.jpeg;*.png;*.webp;*.bmp",
            InitialDirectory = Directory.Exists(cuon) ? cuon : Environment.GetFolderPath(Environment.SpecialFolder.MyPictures),
        };
        if (dlg.ShowDialog(this) != DialogResult.OK) return;
        var loi = false;
        foreach (var f in dlg.FileNames.Take(AnhToiDa - _anh.Count))
        {
            try { _anh.Add(ToJpeg(f)); }
            catch { loi = true; }
        }
        Ve();
        if (loi) Bao("Có ảnh chưa đọc được. Con chọn ảnh khác nhé.", true);
    }

    /// <summary>Thu nhỏ (cạnh dài ≤ 1280) rồi nén JPEG, giảm chất lượng dần tới khi ≤ 300 KB.</summary>
    private static byte[] ToJpeg(string path)
    {
        using var src = Image.FromFile(path);
        var (w, h) = AnhBangChung.Fit(src.Width, src.Height);
        using var bmp = new Bitmap(w, h);
        using (var g = Graphics.FromImage(bmp))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.Clear(Color.White);
            g.DrawImage(src, 0, 0, w, h);
        }
        var codec = ImageCodecInfo.GetImageEncoders().First(c => c.FormatID == ImageFormat.Jpeg.Guid);
        byte[] last = Array.Empty<byte>();
        foreach (var quality in new long[] { 82, 70, 58, 46, 35 })
        {
            using var ms = new MemoryStream();
            using var ep = new EncoderParameters(1);
            ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
            bmp.Save(ms, codec, ep);
            last = ms.ToArray();
            if (last.Length <= AnhBangChung.MaxByte) break;
        }
        return last;
    }

    // ---------------------------------------------------------------- ghi âm / viết (con-ngay-thuong 05)

    private void VeGhiAm()
    {
        var tab = KhoiCon.Hang();
        tab.Margin = new Padding(0, 0, 0, UI.Px(10));
        foreach (var (viet, chu, icon) in new[] { (false, "Ghi âm", "tai"), (true, "Viết", "but") })
        {
            var r = new ClayRadio
            {
                Text = chu, TextAlign = ContentAlignment.MiddleCenter, Checked = viet == _theViet, UseMnemonic = false,
                Width = (W - UI.Px(8)) / 2, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold),
                Margin = new Padding(0, 0, UI.Px(8), 0), Image = Anh3D.Icon(icon), TextImageRelation = TextImageRelation.ImageBeforeText,
            };
            r.BackColor = r.Checked ? UI.Green : UI.Card;
            r.ForeColor = r.Checked ? Color.White : UI.Ink;
            var v = viet;
            r.CheckedChanged += (_, _) => { if (r.Checked && _theViet != v && !_ghi.DangGhi) { _theViet = v; BeginInvoke(Ve); } };
            tab.Controls.Add(r);
        }
        Flow.Controls.Add(tab);
        if (_theViet) { VeViet(false); return; }

        var the = KhoiApp.The(W + VeThe.LeBong.Horizontal, le: 16);
        the.Margin = new Padding(0, 0, 0, UI.Px(8));
        var r2 = KhoiApp.TrongThe(W + VeThe.LeBong.Horizontal, 16);
        _gio = UI.Text(_ghi.DangGhi ? DongHo(_ghi.DaGhi) : _ghiAm != null ? DongHo(_doDai) : "00:00", 26f, true, _ghi.DangGhi ? Clay.Loi : UI.Ink, r2);
        _gio.Margin = Padding.Empty;
        the.Controls.Add(_gio);
        the.Controls.Add(UI.Text(_ghi.DangGhi ? "Đang ghi… đọc to rõ nhé" : _ghiAm != null ? "Đã ghi xong · nghe lại được" : $"Bấm ghi rồi đọc to (tối đa {(int)GhiAm.ToiDa.TotalMinutes} phút)",
            10.5f, false, UI.Muted, r2));
        var hang = KhoiCon.Hang();
        if (_ghi.DangGhi)
        {
            var dung = KhoiApp.NutGon("Dừng ghi", true, "x");
            dung.Margin = Padding.Empty;
            dung.Click += (_, _) => DungGhi();
            hang.Controls.Add(dung);
        }
        else
        {
            var ghi = KhoiApp.NutGon(_ghiAm == null ? "Bắt đầu ghi" : "Ghi lại", _ghiAm == null, "tai");
            ghi.Margin = Padding.Empty;
            ghi.Click += (_, _) => BatDauGhi();
            hang.Controls.Add(ghi);
            if (_ghiAm != null)
            {
                var nghe = KhoiApp.NutGon("Nghe lại", false, "chuong");
                nghe.Click += (_, _) => NgheLai();
                hang.Controls.Add(nghe);
            }
        }
        the.Controls.Add(hang);
        Flow.Controls.Add(the);
        ThemONhan("Viết thêm (nếu cần)");
        NutNop("Nộp ghi âm cho Ba Mẹ");
    }

    private void VeViet(bool batBuoc)
    {
        _note.Height = UI.Px(batBuoc || _theViet ? 110 : 56);
        ThemONhan(batBuoc || _theViet ? "Con viết kể lại cho Ba Mẹ" : "Viết thêm (nếu cần)");
        NutNop("Nộp bài viết cho Ba Mẹ");
    }

    private void VeXong()
    {
        Flow.Controls.Add(UI.Text("Con làm xong việc này chưa?", 12f, true, UI.Ink, W));
        var b = KhoiCon.Nut("Xong rồi! Báo Ba Mẹ", true, W, "tick");
        b.Click += async (_, _) => await NopAsync(b);
        Flow.Controls.Add(b);
        Flow.Controls.Add(UI.Text($"Ba Mẹ duyệt xong là con được +{_nv.SoSao} sao", 10f, false, UI.Muted, W));
    }

    private void BatDauGhi()
    {
        _ghiAm = null;
        if (!_ghi.BatDau()) { Ve(); Bao("Máy chưa ghi âm được. Con kiểm tra micro, hoặc chuyển sang «Viết» nhé.", true); return; }
        _dongHo.Start();
        Ve();
    }

    private void DungGhi()
    {
        _dongHo.Stop();
        var tep = Path.Combine(Path.GetTempPath(), $"aiigrow-ghi-am-{Guid.NewGuid():N}.wav");
        _doDai = _ghi.DaGhi;
        var ok = _ghi.Dung(tep);
        try { _ghiAm = ok && File.Exists(tep) ? File.ReadAllBytes(tep) : null; } catch { _ghiAm = null; }
        finally { try { File.Delete(tep); } catch { } }   // không để giọng Con nằm lại trong thư mục tạm
        Ve();
        if (_ghiAm == null) Bao("Chưa lưu được ghi âm. Con ghi lại nhé.", true);
        else if (_ghiAm.Length > GhiAm.ByteToiDa)
        {
            // máy ghi bỏ qua định dạng nhỏ ⇒ giữ phần đầu cho vừa trần 2 MB, không bỏ cả bản ghi Con vừa đọc
            var cat = WavCat.CatToi(_ghiAm, GhiAm.ByteToiDa);
            if (cat == null) { _ghiAm = null; Ve(); Bao("Ghi âm dài quá. Con ghi ngắn hơn nhé.", true); }
            else
            {
                _doDai = TimeSpan.FromTicks((long)(_doDai.Ticks * (cat.Length / (double)_ghiAm.Length)));
                _ghiAm = cat;
                Ve();
                Bao($"Ghi âm hơi dài — AiiGrow giữ {DongHo(_doDai)} đầu cho Ba Mẹ nghe.", false);
            }
        }
    }

    private void NgheLai()
    {
        if (_ghiAm == null) return;
        try { using var ms = new MemoryStream(_ghiAm); using var sp = new System.Media.SoundPlayer(ms); sp.Play(); }
        catch { Bao("Chưa phát được ghi âm.", true); }
    }

    // =========================================================== nộp

    private void Bao(string s, bool loi)
    {
        if (_msg == null) return;
        _msg.ForeColor = loi ? UI.Error : Clay.NgocInk;
        _msg.Text = s;
    }

    private async Task NopAsync(Button b)
    {
        if (_busy || _ghi.DangGhi) return;
        var note = _note.Text.Trim();
        var canViet = _nv.BangChung is "van_ban" or "viet" || (_nv.BangChung == "ghi_am" && _theViet);
        if (canViet && note.Length < 3) { Bao("Con viết vài câu rồi nộp nhé.", true); return; }
        if (_nv.BangChung == "anh" && _anh.Count == 0) { Bao("Con chọn ít nhất một ảnh rồi nộp nhé.", true); return; }
        if (_nv.BangChung == "ghi_am" && !_theViet && _ghiAm == null && note.Length < 3) { Bao("Con ghi âm (hoặc chuyển sang «Viết») rồi nộp nhé.", true); return; }
        if (string.IsNullOrEmpty(_nv.Luot)) { Bao("Chưa nhận được việc. Con thử lại nhé.", true); return; }
        _busy = true;
        b.Enabled = false;
        Bao("Đang gửi…", false);
        var body = new Dictionary<string, object> { ["ghiChu"] = note };
        if (_anh.Count > 0) body["anh"] = _anh.Select(a => new { mime = "image/jpeg", base64 = Convert.ToBase64String(a) }).ToArray();
        if (_ghiAm != null && !_theViet) body["ghiAm"] = new { mime = "audio/wav", base64 = Convert.ToBase64String(_ghiAm) };
        var (kq, loi) = await HvApi.PostAsync<HvNopKq>($"hoc-vien/luot/{_nv.Luot}/nop", body);
        _busy = false;
        if (IsDisposed) return;
        if (kq == null) { Bao(loi ?? "Chưa nộp được. Con thử lại nhé.", true); b.Enabled = true; return; }
        Ket = kq;
        DialogResult = DialogResult.None;
        VeDaNop(kq);
    }

    /// <summary>con-ngay-thuong 07: «Đã nộp cho Ba Mẹ · Chờ Ba Mẹ xem…» (việc tự cộng sao ⇒ «Xong rồi! +N sao»).</summary>
    private void VeDaNop(HvNopKq kq)
    {
        Xoa();
        Text = "AiiGrow · Nhiệm vụ";
        var tuDuyet = kq.TrangThai == "duoc_duyet";
        var choMang = kq.TrangThai == "cho_mang";   // mất mạng: dịch vụ đã lưu bài, có mạng tự gửi (L11)
        Flow.Controls.Add(KhoiCon.Dau(tuDuyet ? "phao_hoa" : choMang ? "wifi" : "gui", tuDuyet ? KhoiCon.Mau.Vang : choMang ? KhoiCon.Mau.Cam : KhoiCon.Mau.Ngoc,
            tuDuyet ? "Xong rồi!" : choMang ? "Đã lưu bài của con" : "Đã nộp cho Ba Mẹ",
            tuDuyet ? "Sao đã vào ví của con" : choMang ? "Có mạng là AiiGrow gửi Ba Mẹ ngay. Không cần nộp lại đâu." : "Chờ Ba Mẹ xem…", W));
        var phu = _nv.BangChung switch
        {
            "ghi_am" => _ghiAm != null && !_theViet ? "ghi âm " + DongHo(_doDai) : "bài viết",
            "van_ban" or "viet" => "bài viết", "xong" => "đã bấm Xong", _ => $"{_anh.Count} ảnh",
        };
        Flow.Controls.Add(KhoiApp.Dong(W + VeThe.LeBong.Horizontal, AppConView.IconViec(_nv.Hinh, _nv.BangChung, _nv.Ten), _nv.Ten, phu, null,
            tuDuyet ? KhoiApp.ChipSao($"+{_nv.SoSao} sao") : KhoiApp.ChipCho(choMang ? "Chờ có mạng" : "Chờ duyệt")));
        if (kq.NghiTrung) Flow.Controls.Add(UI.Text("Ảnh này giống ảnh con từng nộp, Ba Mẹ sẽ xem kỹ nhé.", 10.5f, true, Clay.Canh, W));
        var ve = KhoiCon.Nut("Về danh sách nhiệm vụ", true, W, "tick");
        ve.Click += (_, _) => { DialogResult = DialogResult.OK; Close(); };
        Flow.Controls.Add(ve);
        FormClosing += (_, _) => DialogResult = DialogResult.OK;   // đóng bằng nút X cũng báo đã nộp ⇒ app tải lại
        Xong();
    }
}

/// <summary>Ghi âm bằng MCI của Windows (winmm, không cần thư viện ngoài): WAV PCM 8 kHz 8 bit một kênh (8 KB/giây) ⇒ 4 phút ≈ 1,9 MB,
/// vừa trần 2 MB của máy chủ. Gọi trên luồng giao diện.</summary>
internal sealed class GhiAm : IDisposable
{
    public static readonly TimeSpan ToiDa = TimeSpan.FromMinutes(4);
    public const int ByteToiDa = 2 * 1024 * 1024;
    private const string Ten = "aiigrowghiam";
    private readonly Stopwatch _sw = new();

    [DllImport("winmm.dll", CharSet = CharSet.Unicode)]
    private static extern int mciSendString(string lenh, StringBuilder? traVe, int dai, IntPtr goiLai);

    public bool DangGhi { get; private set; }
    public TimeSpan DaGhi => _sw.Elapsed;

    private static int Gui(string lenh)
    {
        try { return mciSendString(lenh, null, 0, IntPtr.Zero); } catch { return -1; }
    }

    public bool BatDau()
    {
        Dong();
        if (Gui($"open new type waveaudio alias {Ten}") != 0) return false;
        // định dạng nhỏ (máy không nhận thì giữ mặc định — DungGhi kiểm cỡ tệp)
        Gui($"set {Ten} format tag pcm");
        Gui($"set {Ten} channels 1 samplespersec 8000 bitspersample 8 bytespersec 8000 alignment 1");
        if (Gui($"record {Ten}") != 0) { Dong(); return false; }
        DangGhi = true;
        _sw.Restart();
        return true;
    }

    public bool Dung(string tep)
    {
        if (!DangGhi) return false;
        _sw.Stop();
        DangGhi = false;
        Gui($"stop {Ten}");
        try { if (File.Exists(tep)) File.Delete(tep); } catch { }
        var ok = Gui($"save {Ten} \"{tep}\"") == 0;
        Dong();
        return ok;
    }

    private static void Dong() => Gui($"close {Ten}");

    public void Dispose()
    {
        if (DangGhi) { Gui($"stop {Ten}"); DangGhi = false; }
        Dong();
    }
}
