using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// 14/11 «Con định tắt/gỡ AiiGrow (Windows)» (docs/thiet-ke-chot/con-ngay-thuong 24 them-8ae0e45r — FR-01.05), mở từ menu khay «Thoát AiiGrow…»:
/// nền phủ tối + thẻ giữa màn hình: khiên 110 · «Cần mã của Ba Mẹ» · «Tắt hoặc gỡ AiiGrow phải có Ba Mẹ đồng ý» · 6 ô mã · «Mã 6 số trong app AiiGrow của Ba Mẹ»
/// · viên «Ba Mẹ đã nhận thông báo» · «Thôi, quay lại». Mở hộp là báo Ba Mẹ (pipe bao-thoat). Gõ đủ 6 số ⇒ ba-me-mo: đúng ⇒ «Ba Mẹ đang dùng máy»
/// (AiiGrow thôi giới hạn tới hạn của mã) — khay KHÔNG tự thoát / tự gỡ; gỡ hẳn vẫn cần mật khẩu quản trị của Ba Mẹ (Cài đặt › Ứng dụng).
/// Chữ lấy từ lớp thuần <see cref="ThoatView"/>.
/// </summary>
internal sealed class ThoatForm : HopKhayCoBan
{
    private string _so = "";
    private string? _loi;
    private bool? _baoOk;
    private string? _baoStatus;
    private bool _dangGui;
    private ManPhu? _phu;

    /// <summary>Ba Mẹ gõ đúng mã — trạng thái mới từ dịch vụ (khay áp ngay, không chờ lượt hỏi 3 giây).</summary>
    public event Action<PipeResponse>? DaMo;

    /// <param name="baoNgay">false = không gọi dịch vụ (công cụ chụp màn dựng thẳng).</param>
    public ThoatForm(bool baoNgay = true) : base("AiiGrow", UI.Px(560))
    {
        Flow.Padding = new Padding(UI.Px(40), UI.Px(28), UI.Px(40), UI.Px(24));
        KeyPreview = true;
        KeyDown += Phim;
        Load += (_, _) => { try { _phu = new ManPhu(); _phu.Show(); BringToFront(); Activate(); } catch { _phu = null; } };
        FormClosed += (_, _) => { try { _phu?.Close(); _phu?.Dispose(); } catch { } };
        Ve();
        if (baoNgay) Shown += async (_, _) => await BaoAsync();
    }

    private async Task BaoAsync()
    {
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.BaoThoat });
        if (IsDisposed) return;
        _baoOk = r.Ok; _baoStatus = r.Status;
        Ve();
    }

    private void Phim(object? sender, KeyEventArgs e)
    {
        char? so = e.KeyCode switch
        {
            >= Keys.D0 and <= Keys.D9 when !e.Shift => (char)('0' + (e.KeyCode - Keys.D0)),
            >= Keys.NumPad0 and <= Keys.NumPad9 => (char)('0' + (e.KeyCode - Keys.NumPad0)),
            _ => null,
        };
        if (so is char c)
        {
            e.Handled = e.SuppressKeyPress = true;
            if (_dangGui || _so.Length >= ManChonTenView.SoChuSoMa) return;
            _so += c; _loi = null;
            Ve();
            if (_so.Length == ManChonTenView.SoChuSoMa) _ = GuiMaAsync();
            return;
        }
        switch (e.KeyCode)
        {
            case Keys.Back when !_dangGui && _so.Length > 0: e.Handled = e.SuppressKeyPress = true; _so = _so[..^1]; Ve(); break;
            case Keys.Escape: e.Handled = e.SuppressKeyPress = true; Close(); break;
        }
    }

    private async Task GuiMaAsync()
    {
        if (_dangGui || _so.Length != ManChonTenView.SoChuSoMa) return;
        _dangGui = true;
        Ve();
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.BaMeMo, Code = _so });
        if (IsDisposed) return;
        _dangGui = false;
        if (r.Ok) { DaMo?.Invoke(r); Close(); return; }
        _so = "";
        _loi = ManChonTenView.CauLoiMa(r.Status, r.ConLan, r.ChoGiay, r.Error ?? r.Message);
        Ve();
    }

    private void Ve()
    {
        XoaHet();
        var w = W;
        Flow.Controls.Add(Giua(new ClayIcon { Size = new Size(UI.Px(110), UI.Px(110)), MauVien = Color.Transparent, Hinh = Anh3D.Icon("khien") }, w));
        Flow.Controls.Add(ChuGiua(ThoatView.Tieu, 31.5f, true, UI.Ink, w, 10));
        Flow.Controls.Add(ChuGiua(ThoatView.Phu, 16.5f, false, UI.Muted, w, 6));
        Flow.Controls.Add(Giua(new OMa { Ma = _so, Size = new Size(UI.Px(6 * 64 + 5 * 12), UI.Px(78)) }, w, 22));
        Flow.Controls.Add(ChuGiua(_dangGui ? "Đang kiểm mã…" : _loi ?? ThoatView.GhiMa, 11.25f, _loi != null, _loi != null ? Clay.Canh : UI.Muted, w, 12));
        var (chu, icon, cam) = ThoatView.ChipBao(_baoOk, _baoStatus);
        Flow.Controls.Add(Giua(LockForm.VienGhi(chu, icon, cam), w, 14));
        var quay = KhoiCon.Nut(ThoatView.Quay, false, w, "nha", 64, 16.5f);
        quay.Margin = new Padding(0, UI.Px(24), 0, 0);
        quay.Click += (_, _) => Close();
        Flow.Controls.Add(quay);
        CancelButton = quay;
        Xong();
        ActiveControl = null;   // phím số vào hộp (KeyPreview), không vào nút đang có tiêu điểm
    }

    private static Control Giua(Control c, int w, int tren = 0)
    {
        c.Margin = new Padding(Math.Max(0, (w - c.Width) / 2), UI.Px(tren), 0, 0);
        return c;
    }

    private static Label ChuGiua(string text, float pt, bool dam, Color mau, int w, int tren)
    {
        var l = UI.Text(text, pt, dam, mau, w);
        l.TextAlign = ContentAlignment.MiddleCenter;
        l.AutoSize = false;
        l.Size = new Size(w, TextRenderer.MeasureText(text, l.Font, new Size(w, 0), TextFormatFlags.WordBreak).Height + UI.Px(4));
        l.Margin = new Padding(0, UI.Px(tren), 0, 0);
        return l;
    }
}
