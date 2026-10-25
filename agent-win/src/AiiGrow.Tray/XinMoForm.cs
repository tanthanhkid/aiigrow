using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Xin mở trang hoặc app» — như <c>XinMoView</c> của agent-mac: chọn Trang web / App, ghi địa chỉ hoặc tên, nhắn Ba Mẹ (không bắt buộc), gửi
/// (dịch vụ → POST yeu-cau loai mo_web | cai_app) rồi chờ Ba Mẹ trả lời. Ba Mẹ đồng ý ⇒ máy chủ đặt luật cho mục đó, nhịp sau luật mới về máy.
/// Mở từ menu khay, từ app to (Hôm nay) và từ màn chặn app (điền sẵn app vừa bị chặn).
/// </summary>
internal sealed class XinMoForm : Form
{
    private readonly ClayRadio[] _chip = new ClayRadio[XinMoView.Loai.Length];
    private readonly ClayIcon _icon = new() { MauVien = Clay.LamSoft };
    private readonly TextBox _muc = new() { Font = UI.F(12f), MaxLength = XinMoView.MucToiDa, ForeColor = UI.Ink };
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = XinMoView.LoiNhanToiDa, ForeColor = UI.Ink, PlaceholderText = "Con cần mở để làm gì?" };
    private readonly Button _send = UI.Btn("Xin Ba Mẹ", true, UI.Px(380), "speech_balloon");
    private readonly Label _msg = UI.Text("", 11f, true, UI.Green, UI.Px(380));
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private string? _pendingId, _tenCho;
    private bool _busy;

    /// <param name="loai"><see cref="LoaiXin.MoWeb"/> hoặc <see cref="LoaiXin.CaiApp"/>.</param>
    /// <param name="muc">Điền sẵn (màn chặn: định danh app vừa bị đóng, ví dụ roblox.exe — Ba Mẹ duyệt là đúng app đó).</param>
    public XinMoForm(string loai = LoaiXin.MoWeb, string? muc = null)
    {
        Text = "AiiGrow · Xin mở trang hoặc app";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        BackColor = UI.Paper;
        AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;   // nút / ô nhập Clay cao theo DPI ⇒ cửa sổ theo nội dung, không cắt đáy

        var w = UI.Px(380);
        var flow = new FlowLayoutPanel
        {
            AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(UI.Px(20), UI.Px(16), UI.Px(20), UI.Px(12)), Margin = Padding.Empty,
        };
        var dau = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = false, BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, 6) };
        _icon.Size = new Size(UI.Px(48), UI.Px(48));
        _icon.Margin = new Padding(0, 0, UI.Px(10), 0);
        dau.Controls.Add(_icon);
        var tieu = UI.Text("Con muốn mở gì?", 16f, true, null, w - UI.Px(60));
        tieu.Margin = new Padding(0, UI.Px(10), 0, 0);
        dau.Controls.Add(tieu);
        flow.Controls.Add(dau);

        // Hai chip kẹo (vùng bấm ≥44) thay segmented — cùng kiểu chip phút của «Xin thêm giờ».
        var row = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, Margin = new Padding(0, 0, 0, 6), BackColor = Color.Transparent };
        for (int i = 0; i < _chip.Length; i++)
        {
            _chip[i] = new ClayRadio
            {
                Text = XinMoView.Loai[i].Nhan, TextAlign = ContentAlignment.MiddleCenter, Tag = XinMoView.Loai[i].Loai,
                Width = Clay.Si(140), Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold),
                Checked = XinMoView.Loai[i].Loai == (loai == LoaiXin.CaiApp ? LoaiXin.CaiApp : LoaiXin.MoWeb), Margin = new Padding(0, 0, 8, 0),
            };
            _chip[i].CheckedChanged += (_, _) => DoiLoai();
            row.Controls.Add(_chip[i]);
        }
        flow.Controls.Add(row);
        flow.Controls.Add(ONhapClay.Boc(_muc, w));
        flow.Controls.Add(UI.Text("Nhắn Ba Mẹ (không bắt buộc)", 10.5f, false, UI.Muted, w));
        flow.Controls.Add(ONhapClay.Boc(_note, w));
        flow.Controls.Add(new Label { Height = 4, Width = 10 });
        flow.Controls.Add(_send);
        flow.Controls.Add(_msg);
        Controls.Add(flow);

        if (!string.IsNullOrWhiteSpace(muc)) _muc.Text = muc.Trim();
        _muc.TextChanged += (_, _) => CapNhatNut();
        _muc.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; await SendAsync(); } };
        _send.Click += async (_, _) => await SendAsync();
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => _poll.Dispose();
        DoiLoai();
    }

    private string Loai => _chip.FirstOrDefault(c => c.Checked)?.Tag as string ?? LoaiXin.MoWeb;

    private void DoiLoai()
    {
        foreach (var r in _chip)
        {
            r.BackColor = r.Checked ? UI.Green : UI.Card;
            r.ForeColor = r.Checked ? Color.White : UI.Ink;
        }
        var web = Loai == LoaiXin.MoWeb;
        var cu = _icon.Hinh;
        _icon.MauVien = web ? Clay.LamSoft : Clay.TimSoft;
        _icon.Hinh = UI.Fluent(web ? "globe_with_meridians" : "puzzle_piece");
        if (cu != null && cu != _icon.Hinh) _icon.DongSap(cu);
        _muc.PlaceholderText = XinMoView.GoiY(Loai);
        CapNhatNut();
    }

    private void CapNhatNut() => _send.Enabled = !_busy && _pendingId == null && XinMoView.ChuanMuc(_muc.Text) != null;

    private async Task SendAsync()
    {
        var muc = XinMoView.ChuanMuc(_muc.Text);
        if (_busy || _pendingId != null || muc == null) return;
        _busy = true;
        CapNhatNut();
        _msg.ForeColor = UI.Green;
        _msg.Text = "Đang gửi…";
        var res = await PipeClient.CallAsync(new PipeRequest
        {
            Cmd = PipeCmd.Request, Kind = Loai, AppId = muc, AppName = muc,
            Note = string.IsNullOrWhiteSpace(_note.Text) ? null : _note.Text.Trim(),
        });
        _busy = false;
        if (IsDisposed) return;
        if (!res.Ok)
        {
            _msg.ForeColor = UI.Error;
            _msg.Text = res.Error ?? "Chưa gửi được. Con thử lại nhé.";
            CapNhatNut();
            return;
        }
        _tenCho = muc;
        var kq = TrayView.XinGio(res.Status);
        _msg.Text = XinMoView.ThongBao(kq, muc);
        if (kq == TrayView.KetQuaXin.Cho && !string.IsNullOrEmpty(res.Id)) { _pendingId = res.Id; _poll.Start(); }
        CapNhatNut();
    }

    private async Task PollAsync()
    {
        if (_pendingId == null || _busy) return;
        _busy = true;
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _pendingId });
        _busy = false;
        if (!res.Ok || IsDisposed) return;
        var kq = TrayView.XinGio(res.Status);
        if (kq == TrayView.KetQuaXin.Cho) return;
        _poll.Stop();
        _pendingId = null;
        _msg.ForeColor = kq == TrayView.KetQuaXin.Duoc ? UI.Green : UI.Warn;
        _msg.Text = XinMoView.ThongBao(kq, _tenCho ?? "");
        CapNhatNut();
    }
}
