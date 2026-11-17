using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Xin thêm YouTube» theo Bàn con-xin (16/11, #307): them-bxw40sw9 (hai chip nhóm Ba Mẹ sẽ chọn + ô «Nhắn Ba Mẹ» + «Xin Ba Mẹ thêm YouTube»)
/// → them-6tn8aozf «Đã gửi Ba Mẹ! · Con xin thêm YouTube · Đang chờ Ba Mẹ» → them-359v1pre «Mẹ Lan đã thêm! · YouTube · Tính phút · 18 sao = 18 phút»
/// / them-vkdikuo0 «Ba Mẹ chưa thêm YouTube». Mở từ màn «… chưa được thêm» (them-vc4dmaei, nút «Xin Ba Mẹ thêm …»).
/// Gửi qua dịch vụ (PipeCmd.XinDuyet, như BlockedForm) — máy chủ xếp nhóm khi Ba Mẹ duyệt; mất mạng ⇒ lưu, có mạng tự gửi.
/// </summary>
internal sealed class XinThemForm : HopKhayCoBan
{
    public const string SauNhan = "nhan", SauHomNay = "hom_nay";

    private readonly string _muc;
    private readonly string _ten;
    private readonly bool _web;
    private readonly double? _phutCon;
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = XinMoView.LoiNhanToiDa, ForeColor = UI.Ink, PlaceholderText = XinThemView.GoiYNhan };
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private string? _id;
    /// <summary>Đã gửi lời xin (máy chủ nhận / đang chờ) — chặn gửi trùng kể cả khi máy chủ không trả id.</summary>
    private bool _daGui;
    private bool _busy;
    private Label? _msg;

    /// <summary>Tên app đang xin (đã giải) — khay chỉ chặn popup kết quả của đúng lời xin này.</summary>
    public string Ten => _ten;

    /// <summary>Mục đang xin (exe / tên miền) — khay không mở thêm màn chặn cho đúng mục này khi hộp đang mở.</summary>
    public string Muc => _muc;

    /// <summary>Con muốn đi đâu sau khi đóng hộp (null = về chỗ cũ): <see cref="SauNhan"/> | <see cref="SauHomNay"/>.</summary>
    public string? Sau { get; private set; }
    /// <summary>Đã gửi được lời xin (mục) — khay ghi nhớ để không tự gửi lặp.</summary>
    public event Action<string>? DaXin;

    public XinThemForm(string muc, string? ten, double? phutCon) : base(XinThemView.TieuDeCuaSo, UI.Px(380))
    {
        _muc = muc.Trim();
        _ten = TrayView.FriendlyAppName(muc, ten);
        _web = BlockedForm.LaTrangWeb(_muc);
        _phutCon = phutCon;
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => { _poll.Dispose(); if (_note.Parent == null) _note.Dispose(); };
        VeXin();
    }

    private void Xoa()
    {
        _note.Parent?.Controls.Remove(_note);
        XoaHet();
    }

    /// <summary>them-bxw40sw9.</summary>
    internal void VeXin()
    {
        _poll.Stop();
        Xoa();
        Text = XinThemView.TieuDeCuaSo;
        var dau = KhoiCon.Hang();
        dau.Margin = new Padding(0, 0, 0, UI.Px(10));
        var dong = KhoiXin.NutTron("✕", Close);   // Bàn: ✕ → Hôm nay (đóng hộp)
        dau.Controls.Add(dong);
        var v = KhoiApp.Vien(_web ? "web" : "game", 52);
        dau.Controls.Add(v);
        var cot = KhoiCon.Cot();
        var r = W - dong.Width - dong.Margin.Horizontal - v.Width - v.Margin.Horizontal;
        var t = UI.Text(XinThemView.Tieu(_ten), 15f, true, UI.Ink, r); t.Margin = new Padding(0, 0, 0, UI.Px(2));
        var p = UI.Text(XinThemView.Phu(_ten), 9.75f, false, UI.Muted, r); p.Margin = Padding.Empty;
        cot.Controls.Add(t); cot.Controls.Add(p);
        cot.Margin = new Padding(0, Math.Max(0, (v.Height - cot.PreferredSize.Height) / 2), 0, 0);
        dau.Controls.Add(cot);
        Flow.Controls.Add(dau);
        var nhan = UI.Text(XinThemView.BaMeChonNhom, 10.5f, true, Clay.Chu2, W); nhan.Margin = new Padding(0, 0, 0, UI.Px(6));
        Flow.Controls.Add(nhan);
        Flow.Controls.Add(KhoiCon.Chips(W,
            KhoiXin.Chip(XinThemView.NhomTinh, Clay.DiemSoft, Clay.DiemInk, "sao", kim: true),
            KhoiXin.Chip(XinThemView.NhomKhong, Clay.NgocSoft, Clay.NgocInk, "sach")));
        Flow.Controls.Add(ONhapClay.Boc(_note, W));
        var gui = KhoiCon.Nut(XinThemView.Nut(_ten), true, W, "tin");
        gui.Click += async (_, _) => await GuiAsync(gui);
        // quay lại từ «Đã gửi» khi lời xin còn chờ ⇒ không cho gửi trùng
        if (_daGui) { gui.Enabled = false; gui.Text = XinThemView.DangCho; }
        Flow.Controls.Add(gui);
        _msg = UI.Text("", 10f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        Xong();
    }

    private async Task GuiAsync(Button b)
    {
        if (_busy || _muc.Length == 0) return;
        _busy = true; b.Enabled = false;
        if (_msg != null) _msg.Text = "";
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.XinDuyet, AppId = _muc, AppName = _ten, Note = XinVayView.LyDo(_note.Text) });
        _busy = false;
        if (r.Ok) DaXin?.Invoke(_muc);   // Con đóng hộp lúc đang gửi: lời xin vẫn đã gửi ⇒ khay vẫn phải biết (không tự gửi lặp)
        if (IsDisposed) return;
        if (!r.Ok)
        {
            if (_msg != null) _msg.Text = r.Error ?? "Chưa gửi được. Con thử lại nhé.";
            b.Enabled = true;
            return;
        }
        if (r.Status == "cho_mang")
        {
            Xoa();
            HopDaLuu.Ve(Flow, W, ManChanView.DaLuuTieu, XinThemView.DongDaLuu(_ten), int.TryParse(r.Message, out var n) ? n : 1, Close, ManChanView.VeHomNay);
            Xong();
            return;
        }
        _id = string.IsNullOrEmpty(r.Id) ? null : r.Id;
        _daGui = true;
        var kq = KetQuaXinView.Doc(r.KetQua?.KetQua, r.Status);
        if (kq != KetQuaXinView.Loai.Cho) { VeKetQua(kq, r.KetQua); return; }
        VeDaGui();
        if (!string.IsNullOrEmpty(_id)) _poll.Start();
    }

    /// <summary>them-6tn8aozf.</summary>
    internal void VeDaGui()
    {
        Xoa();
        Text = "AiiGrow · Đã gửi";
        Flow.Controls.Add(KhoiXin.DauRob("so-tay", W, () => { VeXin(); if (_id != null) _poll.Start(); },
            KhoiXin.Chu(XinThemView.DaGui, 15f, true, UI.Ink),
            KhoiXin.Chu(XinThemView.ConXin(_ten), 10.5f, true, UI.Ink),
            KhoiXin.Chip(XinThemView.DangCho, Clay.DiemSoft, Clay.Canh, "dongho", kim: true)));
        Flow.Controls.Add(UI.Text(XinThemView.TraLoiBaoNgay, 10.5f, false, UI.Muted, W));
        var tiep = KhoiCon.Nut(XinThemView.ChoiTiep(_phutCon), false, W, "dongho");
        tiep.Click += (_, _) => { if (SaoView.Phut(_phutCon) <= 0) Sau = SauHomNay; Close(); };
        Flow.Controls.Add(tiep);
        Xong();
    }

    private async Task PollAsync()
    {
        if (_id == null || _busy) return;
        _busy = true;
        var r = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _id });
        _busy = false;
        if (!r.Ok || IsDisposed) return;
        var kq = KetQuaXinView.Doc(r.KetQua?.KetQua, r.Status);
        if (kq == KetQuaXinView.Loai.Cho) return;
        _poll.Stop();
        VeKetQua(kq, r.KetQua);
    }

    internal void VeKetQua(KetQuaXinView.Loai kq, RequestStatus? s)
    {
        _poll.Stop();
        _id = null;
        _daGui = false;
        switch (kq)
        {
            case KetQuaXinView.Loai.DaThem: VeDaThem(s, false); break;
            case KetQuaXinView.Loai.MoTam: VeDaThem(s, true); break;
            case KetQuaXinView.Loai.ChuaThem: VeChuaThem(s); break;
            default:
                VeXin();
                if (_msg != null) { _msg.ForeColor = UI.Warn; _msg.Text = XinMoView.ThongBao(TrayView.KetQuaXin.HetHan, _ten); }
                break;
        }
    }

    /// <summary>them-359v1pre (mở tạm: «Mẹ Lan cho mở 30 phút!»).</summary>
    /// <param name="moTam">Kết quả đã tính (<see cref="KetQuaXinView.Loai.MoTam"/>) — không đọc lại s.KetQua.</param>
    private void VeDaThem(RequestStatus? s, bool moTam)
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        var khong = s?.Nhom == "khong_tinh_phut";
        var biet = s?.Nhom is "khong_tinh_phut" or "tinh_phut";   // máy chủ không gửi nhóm ⇒ không đoán, không hiện chip nhóm
        var cot = new List<Control>
        {
            KhoiXin.Chip(moTam ? XinThemView.MoTam(s?.TenNguoiDuyet, s?.MoTam?.Phut ?? 0) : XinThemView.DaThem(s?.TenNguoiDuyet), Clay.NgocSoft, Clay.NgocInk, "tick"),
            KhoiXin.Chu(_ten, 22f, true, UI.GreenDark),
        };
        if (moTam) cot.Add(KhoiXin.Chu(KetQuaXinView.MoTamPhu(_ten, s?.MoTam?.Den), 10f, true, Clay.Chu2));
        else if (biet) cot.Add(KhoiXin.Chip(XinThemView.NhomDaThem(khong, _phutCon), khong ? Clay.NgocSoft : Clay.DiemSoft, khong ? Clay.NgocInk : Clay.DiemInk, khong ? "sach" : "sao", kim: !khong));
        Flow.Controls.Add(KhoiXin.DauRob("qua", W, null, cot.ToArray()));
        if (!string.IsNullOrWhiteSpace(s?.LoiNhan)) Flow.Controls.Add(KhoiXin.BongLoi(XinVayView.TenBaMe(s?.TenNguoiDuyet), s!.LoiNhan!, W));
        var mo = KhoiCon.Nut(XinThemView.Mo(_ten), true, W, "dongho");
        mo.Click += (_, _) => { MoMuc(); Close(); };
        Flow.Controls.Add(mo);
        Xong();
    }

    /// <summary>them-vkdikuo0.</summary>
    private void VeChuaThem(RequestStatus? s)
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        Flow.Controls.Add(KhoiCon.Dau("tin", KhoiCon.Mau.Trang, XinThemView.ChuaThem(_ten), XinThemView.ConPhut(_phutCon), W));
        Flow.Controls.Add(KhoiXin.BongLoi(XinVayView.TenBaMe(s?.TenNguoiDuyet), XinThemView.LoiChuaThem(_ten, s?.LoiNhan), W, ngoac: false));
        // Bàn: «Xin lại» → Tin nhắn (nhắn Ba Mẹ), «Về trang chính» → Hôm nay
        var lai = KhoiCon.Nut(XinThemView.XinLai, true, W, "tin");
        lai.Click += (_, _) => { Sau = SauNhan; Close(); };
        Flow.Controls.Add(lai);
        var ve = KhoiCon.Nut(XinThemView.VeTrangChinh, false, W);
        ve.Click += (_, _) => { Sau = SauHomNay; Close(); };
        Flow.Controls.Add(ve);
        Xong();
    }

    private void MoMuc() => BlockedForm.MoMuc(_muc, _web);
}
