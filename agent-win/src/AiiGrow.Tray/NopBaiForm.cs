using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>Nộp bài cho một nhiệm vụ: viết vài câu và/hoặc chọn ảnh bằng chứng (nén ≤ 300 KB), gửi lên máy chủ để Ba Mẹ duyệt.</summary>
internal sealed class NopBaiForm : Form
{
    private readonly HvNhiemVu _nv;
    private readonly TextBox _note = new() { Multiline = true, Height = UI.Px(90), Width = UI.Px(400), Font = UI.F(11f), MaxLength = 500, BorderStyle = BorderStyle.FixedSingle };
    private readonly Button _pick = UI.Btn("Chọn ảnh…", false, UI.Px(400), "desktop_computer");
    private readonly Label _file = UI.Text("", 10f, false, UI.Muted, UI.Px(400));
    private readonly Button _send = UI.Btn("Nộp cho Ba Mẹ", true, UI.Px(400), "memo");
    private readonly Label _msg = UI.Text("", 10.5f, true, UI.Green, UI.Px(400));
    private string? _anhBase64;
    private bool _busy;

    /// <summary>Kết quả sau khi nộp (null nếu chưa nộp).</summary>
    public HvNopKq? Ket { get; private set; }

    public NopBaiForm(HvNhiemVu nv)
    {

        AiiGrow.ClayUi.Clay.KhongMnemonic(this);   // «&» trong chữ (Phần quà & điểm) hiện đúng, không thành phím tắt
        _nv = nv;
        Text = "AiiGrow · Nộp bài";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        BackColor = UI.Paper;
        ClientSize = new Size(UI.Px(440) + SystemInformation.VerticalScrollBarWidth + UI.Px(6), UI.Px(490));   // chừa thanh cuộn dọc + lề nút ⇒ không cuộn ngang

        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(20), UI.Px(16), UI.Px(20), UI.Px(10)), AutoScroll = true,
        };
        flow.Controls.Add(UI.Text(nv.Ten, 14f, true, null, UI.Px(400)));
        if (!string.IsNullOrWhiteSpace(nv.MoTa)) flow.Controls.Add(UI.Text(nv.MoTa, 10.5f, false, UI.Muted, UI.Px(400)));
        if (nv.TrangThai == "can_bo_sung" && !string.IsNullOrWhiteSpace(nv.LyDo))
            flow.Controls.Add(UI.Text("Ba Mẹ nhắn: " + nv.LyDo, 10.5f, true, UI.Warn, UI.Px(400)));
        flow.Controls.Add(UI.Text(HocVienView.CanChu(nv) ? "Con viết vài câu kể lại nhé" : "Ghi chú cho Ba Mẹ (không bắt buộc)", 10.5f, false, UI.Muted, UI.Px(400)));
        flow.Controls.Add(_note);
        if (HocVienView.CanAnh(nv) || nv.TrangThai == "can_bo_sung")
        {
            flow.Controls.Add(_pick);
            flow.Controls.Add(_file);
        }
        flow.Controls.Add(_send);
        flow.Controls.Add(_msg);
        Controls.Add(flow);

        _pick.Click += (_, _) => PickImage();
        _send.Click += async (_, _) => await SendAsync();
    }

    private void PickImage()
    {
        using var dlg = new OpenFileDialog
        {
            Title = "Chọn ảnh bằng chứng",
            Filter = "Ảnh (*.jpg;*.jpeg;*.png;*.webp;*.bmp)|*.jpg;*.jpeg;*.png;*.webp;*.bmp",
        };
        if (dlg.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            _anhBase64 = Convert.ToBase64String(ToJpeg(dlg.FileName));
            _file.Text = "Đã chọn: " + Path.GetFileName(dlg.FileName);
            _msg.Text = "";
        }
        catch
        {
            _anhBase64 = null;
            _file.Text = "";
            _msg.ForeColor = UI.Error;
            _msg.Text = "Ảnh này chưa đọc được. Con chọn ảnh khác nhé.";
        }
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
            ep.Param[0] = new EncoderParameter(Encoder.Quality, quality);
            bmp.Save(ms, codec, ep);
            last = ms.ToArray();
            if (last.Length <= AnhBangChung.MaxByte) break;
        }
        return last;
    }

    private async Task SendAsync()
    {
        if (_busy) return;
        var note = _note.Text.Trim();
        if (HocVienView.CanChu(_nv) && note.Length < 3) { Fail("Con viết vài câu rồi nộp nhé."); return; }
        if (HocVienView.CanAnh(_nv) && _anhBase64 == null && _nv.TrangThai != "can_bo_sung") { Fail("Con chọn một ảnh bằng chứng rồi nộp nhé."); return; }
        _busy = true;
        _send.Enabled = false;
        _msg.ForeColor = UI.Green;
        _msg.Text = "Đang gửi…";
        object body = _anhBase64 == null
            ? new { ghiChu = note }
            : new { ghiChu = note, anh = new[] { new { mime = "image/jpeg", base64 = _anhBase64 } } };
        var (kq, loi) = await HvApi.PostAsync<HvNopKq>($"hoc-vien/luot/{_nv.Luot}/nop", body);
        _busy = false;
        if (kq == null) { Fail(loi ?? "Chưa nộp được. Con thử lại nhé."); _send.Enabled = true; return; }
        Ket = kq;
        _msg.ForeColor = UI.Green;
        _msg.Text = HocVienView.NopThongBao(kq);
        var t = new System.Windows.Forms.Timer { Interval = 2200 };
        t.Tick += (_, _) => { t.Stop(); t.Dispose(); DialogResult = DialogResult.OK; Close(); };
        t.Start();
    }

    private void Fail(string s)
    {
        _msg.ForeColor = UI.Error;
        _msg.Text = s;
    }
}
