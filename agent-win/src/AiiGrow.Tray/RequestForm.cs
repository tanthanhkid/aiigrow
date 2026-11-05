using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Hộp «Thêm giờ chơi» của Con (thiết kế chốt 05/11, con-xin 02–08 / 22–27; L2 L3): hai thẻ
///   • «Dùng sao»: đổi sao lấy phút (chip 15 / 30 / 60 + nút −/+), 10 sao = 10 phút → POST hoc-vien/doi-sao → «Đã đổi» / «Chưa đủ sao»;
///   • «Xin Ba Mẹ»: chọn 10 / 20 / 30 phút + lời nhắn (không bắt buộc) → dịch vụ gửi yeu-cau them_gio → «Đã gửi» → chờ → «Ba Mẹ cho» / «chưa cho».
/// Giờ ngủ / Ba Mẹ khoá / giờ học: không thêm giờ (chỉ xin ngoại lệ ở màn khoá). Số sao, quỹ, tỷ lệ đọc từ hoc-vien/quy — máy chủ quyết.
/// Sau khi đóng, <see cref="Sau"/> cho khay biết Con muốn đi đâu tiếp (xin mở app / nhắn Ba Mẹ / làm nhiệm vụ).
/// </summary>
internal sealed class RequestForm : HopKhayCoBan
{
    public const string SauXinMo = "xin_mo", SauNhan = "nhan", SauNhiemVu = "nhiem_vu";

    private readonly bool _canExchange;
    private bool _tabSao;
    private HvQuy? _quy;
    private int _sao;
    private int _phutXin = 20, _phutDoi = 10;
    private string? _loiTai;
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = XinMoView.LoiNhanToiDa, ForeColor = UI.Ink, PlaceholderText = "Nhắn Ba Mẹ: con làm nốt bài với bạn ạ" };
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private string? _pendingId;
    private int _phutDaXin;
    private bool _busy;
    private Label? _msg;

    /// <summary>Việc Con chọn làm tiếp sau khi đóng hộp: <see cref="SauXinMo"/> | <see cref="SauNhan"/> | <see cref="SauNhiemVu"/> | null.</summary>
    public string? Sau { get; private set; }

    /// <param name="canExchange">Cờ cũ của dịch vụ (đổi điểm) — thẻ «Dùng sao» vẫn hiện, máy chủ quyết (doiSao.bat).</param>
    /// <param name="dungSao">Mở sẵn thẻ «Dùng sao» (nút «Đổi 10 sao lấy 10 phút»).</param>
    public RequestForm(bool canExchange, string? appId = null, string? appName = null, bool dungSao = false) : base("AiiGrow · Thêm giờ chơi", UI.Px(425))
    {
        _canExchange = canExchange;
        _tabSao = dungSao;
        _poll.Tick += async (_, _) => await PollAsync();
        FormClosed += (_, _) => { _poll.Dispose(); if (_note.Parent == null) _note.Dispose(); };
        Shown += async (_, _) => await TaiAsync();
        VeDangTai();
    }

    /// <summary>Xoá nội dung hộp nhưng GIỮ ô lời nhắn (XoaHet huỷ mọi control con — ô nhắn dùng lại khi vẽ lại thẻ).</summary>
    private void Xoa()
    {
        _note.Parent?.Controls.Remove(_note);
        XoaHet();
    }

    // =========================================================== tải

    private void VeDangTai()
    {
        Xoa();
        Flow.Controls.Add(KhoiCon.Dau("dong_ho_cat", KhoiCon.Mau.Trang, "Thêm giờ chơi", "Đang tải…", W));
        Xong();
    }

    private async Task TaiAsync()
    {
        var (r, loi) = await HvApi.GetAsync<HvQuyDs>("hoc-vien/quy");
        if (IsDisposed) return;
        if (r != null) { _quy = r.Quy; _sao = r.Sao; _loiTai = null; }
        else _loiTai = loi;
        _phutDoi = Math.Clamp(_phutDoi, AppConView.BuocDoi, Math.Max(AppConView.BuocDoi, _quy?.DoiSao.ConDoiDuoc ?? 30));
        VeTab();
    }

    // =========================================================== hai thẻ

    private FlowLayoutPanel HangTab()
    {
        var hang = KhoiCon.Hang();
        hang.Margin = new Padding(0, 0, 0, UI.Px(12));
        foreach (var (sao, chu) in new[] { (true, "Dùng sao"), (false, "Xin Ba Mẹ") })
        {
            var r = new ClayRadio
            {
                Text = chu, TextAlign = ContentAlignment.MiddleCenter, Checked = sao == _tabSao, UseMnemonic = false,
                Width = (W - UI.Px(8)) / 2, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold),
                Margin = new Padding(0, 0, UI.Px(8), 0), Image = Anh3D.Icon(sao ? "sao" : "gui"), TextImageRelation = TextImageRelation.ImageBeforeText,
            };
            r.BackColor = r.Checked ? UI.Green : UI.Card;
            r.ForeColor = r.Checked ? Color.White : UI.Ink;
            var s = sao;
            r.CheckedChanged += (_, _) => { if (r.Checked && _tabSao != s) { _tabSao = s; BeginInvoke(VeTab); } };
            hang.Controls.Add(r);
        }
        return hang;
    }

    private void VeTab()
    {
        _poll.Stop();
        Xoa();
        Text = _tabSao ? "AiiGrow · Đổi sao lấy giờ" : "AiiGrow · Xin thêm giờ";
        Flow.Controls.Add(HangTab());
        if (_quy != null && AppConView.KhongThemGio(_quy))
        {
            var cau = _quy.Khoa ? "Ba Mẹ đang khoá máy" : _quy.DangNgu ? "Đến giờ ngủ rồi" : "Đang giờ học";
            Flow.Controls.Add(KhoiCon.Dau("trang_ngu", KhoiCon.Mau.Cam, cau, "Lúc này không thêm giờ được. Con xin Ba Mẹ mở ngoại lệ ở màn khoá nhé.", W));
            var dong = KhoiCon.Nut("Đóng", false, W);
            dong.Click += (_, _) => Close();
            Flow.Controls.Add(dong);
        }
        else if (_tabSao) VeDungSao();
        else VeXin();
        if (_loiTai != null) Flow.Controls.Add(UI.Text("Chưa tải được số sao: " + _loiTai, 10f, false, UI.Error, W));
        _msg = UI.Text("", 10.5f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        Xong();
    }

    private double ConPhut => _quy?.ConPhut ?? 0;

    // ---------------------------------------------------------------- Xin Ba Mẹ (con-xin 02)

    private void VeXin()
    {
        Flow.Controls.Add(KhoiCon.Dau("dong_ho_cat", KhoiCon.Mau.Trang, "Xin Ba Mẹ thêm giờ", _quy == null ? null : "Giờ chơi còn " + AppConView.Phut(ConPhut), W));
        if (_quy is { ChoXinThem: false })
        {
            Flow.Controls.Add(UI.Text("Ba Mẹ chưa bật xin thêm giờ. Con đổi sao lấy giờ nhé.", 11f, true, Clay.Canh, W));
            Flow.Controls.Add(KhoiCon.LienKet("Đổi sao lấy giờ ›", "sao", () => { _tabSao = true; VeTab(); }));
            return;
        }
        Flow.Controls.Add(KhoiApp.NhanMuc("Con xin thêm", W));
        var chips = new List<Control>();
        foreach (var p in AppConView.PhutXin)
        {
            var r = new ClayRadio
            {
                Text = AppConView.Phut(p), TextAlign = ContentAlignment.MiddleCenter, Checked = p == _phutXin, UseMnemonic = false,
                Width = (W - UI.Px(16)) / 3, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold), Margin = new Padding(0, 0, UI.Px(8), 0),
            };
            var pp = p;
            r.CheckedChanged += (_, _) => { if (r.Checked) { _phutXin = pp; BeginInvoke(VeTab); } };
            r.BackColor = r.Checked ? UI.Green : UI.Card;
            r.ForeColor = r.Checked ? Color.White : UI.Ink;
            chips.Add(r);
        }
        Flow.Controls.Add(KhoiCon.Chips(W + UI.Px(8), chips.ToArray()));
        Flow.Controls.Add(ONhapClay.Boc(_note, W));
        var gui = KhoiCon.Nut($"Xin Ba Mẹ thêm {_phutXin} phút", true, W, "gui");
        gui.Click += async (_, _) => await XinAsync(gui);
        Flow.Controls.Add(gui);
        var lk = KhoiCon.Hang();
        lk.Controls.Add(KhoiCon.LienKet("Đổi sao lấy giờ ›", "sao", () => { _tabSao = true; VeTab(); }));
        lk.Controls.Add(KhoiCon.LienKet("Xin mở app ›", "web", () => { Sau = SauXinMo; Close(); }));
        Flow.Controls.Add(lk);
    }

    private async Task XinAsync(Button b)
    {
        if (_busy) return;
        _busy = true; b.Enabled = false;
        if (_msg != null) _msg.Text = "";
        var res = await PipeClient.CallAsync(new PipeRequest
        {
            Cmd = PipeCmd.Request, Kind = LoaiXin.ThemGio, Minutes = _phutXin,
            Note = string.IsNullOrWhiteSpace(_note.Text) ? $"Con xin thêm {_phutXin} phút chơi" : _note.Text.Trim(),
        });
        _busy = false;
        if (IsDisposed) return;
        if (!res.Ok)
        {
            if (_msg != null) _msg.Text = res.Error ?? "Chưa gửi được. Con thử lại nhé.";
            b.Enabled = true;
            return;
        }
        _phutDaXin = _phutXin;
        if (TrayView.XinGio(res.Status) == TrayView.KetQuaXin.Duoc) { VeDuoc(); return; }
        _pendingId = res.Id;
        VeDaGui();
        _poll.Start();
    }

    /// <summary>con-xin 04: «Đã gửi Ba Mẹ! · Đang chờ Ba Mẹ».</summary>
    private void VeDaGui()
    {
        Xoa();
        Text = "AiiGrow · Đã gửi";
        Flow.Controls.Add(KhoiCon.Dau("gui", KhoiCon.Mau.Ngoc, "Đã gửi Ba Mẹ!", $"Con xin thêm {_phutDaXin} phút", W));
        Flow.Controls.Add(KhoiCon.Chips(W, KhoiApp.ChipCho("Đang chờ Ba Mẹ")));
        Flow.Controls.Add(UI.Text("Ba Mẹ trả lời là máy báo con ngay.", 11f, false, UI.Muted, W));
        var tiep = KhoiCon.Nut(ConPhut >= 1 ? $"Chơi tiếp {AppConView.Phut(ConPhut)} còn lại" : "Đóng", true, W, "game");
        tiep.Click += (_, _) => Close();
        Flow.Controls.Add(tiep);
        Xong();
    }

    private async Task PollAsync()
    {
        if (_pendingId == null || _busy) return;
        _busy = true;
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Status, Id = _pendingId });
        _busy = false;
        if (IsDisposed || !res.Ok) return;
        switch (TrayView.XinGio(res.Status))
        {
            case TrayView.KetQuaXin.Duoc: _poll.Stop(); _pendingId = null; VeDuoc(); break;
            case TrayView.KetQuaXin.TuChoi: _poll.Stop(); _pendingId = null; VeChuaCho(); break;
            case TrayView.KetQuaXin.HetHan:
                _poll.Stop(); _pendingId = null;
                VeTab();
                if (_msg != null) _msg.Text = "Lời xin đã hết hạn hoặc bị huỷ. Con gửi lại nhé.";
                break;
        }
    }

    /// <summary>con-xin 06: «Ba Mẹ cho rồi! +20 phút · Giờ chơi còn 38 phút».</summary>
    private void VeDuoc()
    {
        _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });   // quỹ mới ⇒ app chơi được thả ngay, không chờ nhịp sau
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        var con = ConPhut + _phutDaXin;
        Flow.Controls.Add(KhoiCon.Dau("phao_hoa", KhoiCon.Mau.Ngoc, "Ba Mẹ cho rồi!", null, W));
        var c = new ChipClay($"+{_phutDaXin} phút", Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon("dongho")) { Font = UI.F(13f, FontStyle.Bold) };
        c.Size = new Size(c.Width + UI.Px(16), UI.Px(38));
        Flow.Controls.Add(KhoiCon.Chips(W, c));
        Flow.Controls.Add(UI.Text("Giờ chơi còn " + AppConView.Phut(con), 12f, true, Clay.NgocInk, W));
        var tiep = KhoiCon.Nut($"Chơi tiếp {AppConView.Phut(con)}", true, W, "game");
        tiep.Click += (_, _) => Close();
        Flow.Controls.Add(tiep);
        Xong();
    }

    /// <summary>con-xin 08: «Ba Mẹ chưa cho thêm giờ · Hôm nay còn 18 phút».</summary>
    private void VeChuaCho()
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        Flow.Controls.Add(KhoiCon.Dau("khoa", KhoiCon.Mau.Cam, "Ba Mẹ chưa cho thêm giờ", "Hôm nay còn " + AppConView.Phut(ConPhut), W));
        if (_quy?.DoiSao.Bat != false && _sao >= AppConView.SaoChoPhut(10, _quy?.TyLe))
        {
            var doi = KhoiCon.Nut(AppConView.NutDoiSao(_quy?.TyLe), true, W, "sao");
            doi.Click += (_, _) => { _tabSao = true; VeTab(); };
            Flow.Controls.Add(doi);
        }
        var nhan = KhoiCon.Nut("Nhắn Ba Mẹ", false, W, "tin");
        nhan.Click += (_, _) => { Sau = SauNhan; Close(); };
        Flow.Controls.Add(nhan);
        Flow.Controls.Add(KhoiCon.LienKet("Về Hôm nay", "nha", Close));
        Xong();
    }

    // ---------------------------------------------------------------- Dùng sao (con-xin 22)

    private void VeDungSao()
    {
        var tyLe = _quy?.TyLe;
        var the = KhoiApp.The(W + VeThe.LeBong.Horizontal, vang: true, le: 16);
        the.Margin = new Padding(0, 0, 0, UI.Px(10));
        var r = KhoiApp.TrongThe(W + VeThe.LeBong.Horizontal, 16);
        the.Controls.Add(KhoiApp.DauThe("sao", "Con đang có", AppConView.Sao(_sao), Clay.DiemInk, 22f, r, Clay.DiemInk, Clay.DiemSoft));
        the.Controls.Add(UI.Text(AppConView.TyLe(tyLe).Replace(" chơi", ""), 10.5f, true, Clay.DiemInk, r));
        Flow.Controls.Add(the);
        if (_quy is { DoiSao.Bat: false } || (!_canExchange && _quy == null))
        {
            Flow.Controls.Add(UI.Text("Ba Mẹ chưa bật đổi sao lấy giờ. Con xin Ba Mẹ thêm giờ nhé.", 11f, true, Clay.Canh, W));
            Flow.Controls.Add(KhoiCon.LienKet("Xin Ba Mẹ thêm giờ ›", "dong_ho_cat", () => { _tabSao = false; VeTab(); }));
            return;
        }
        var toiDa = Math.Max(AppConView.BuocDoi, _quy?.DoiSao.ConDoiDuoc ?? 60);
        if (_quy is { DoiSao.ConDoiDuoc: <= 0 })
        {
            Flow.Controls.Add(UI.Text($"Hôm nay con đã đổi đủ {_quy.DoiSao.ToiDaNgay} phút rồi.", 11f, true, Clay.Canh, W));
            Flow.Controls.Add(KhoiCon.LienKet("Xin Ba Mẹ thêm giờ ›", "dong_ho_cat", () => { _tabSao = false; VeTab(); }));
            return;
        }
        Flow.Controls.Add(KhoiApp.NhanMuc("Con đổi", W));
        // nút −/+ và số phút ở giữa (thiết kế «.step»)
        var buoc = new TableLayoutPanel { ColumnCount = 3, RowCount = 1, Width = W, Height = UI.Px(64), BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, UI.Px(6)) };
        buoc.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, UI.Px(64)));
        buoc.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        buoc.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, UI.Px(64)));
        var tru = KhoiCon.Nut("−", false, UI.Px(56), null, 52, 18f);
        var cong = KhoiCon.Nut("+", false, UI.Px(56), null, 52, 18f);
        var giua = KhoiCon.Cot();
        giua.Anchor = AnchorStyles.None;
        var so = UI.Text(AppConView.Phut(_phutDoi), 18f, true, UI.Ink, W); so.Margin = Padding.Empty;
        var tru2 = UI.Text($"trừ {AppConView.SaoChoPhut(_phutDoi, tyLe)} sao", 10f, false, UI.Muted, W); tru2.Margin = Padding.Empty;
        giua.Controls.Add(so); giua.Controls.Add(tru2);
        tru.Enabled = _phutDoi > AppConView.BuocDoi;
        cong.Enabled = _phutDoi < toiDa;
        tru.Click += (_, _) => { _phutDoi = Math.Max(AppConView.BuocDoi, _phutDoi - AppConView.BuocDoi); VeTab(); };
        cong.Click += (_, _) => { _phutDoi = Math.Min(toiDa, _phutDoi + AppConView.BuocDoi); VeTab(); };
        buoc.Controls.Add(tru, 0, 0); buoc.Controls.Add(giua, 1, 0); buoc.Controls.Add(cong, 2, 0);
        Flow.Controls.Add(buoc);
        var chips = new List<Control>();
        foreach (var p in AppConView.PhutDungSao.Where(p => p <= toiDa))
        {
            var c = KhoiApp.NutGon(AppConView.Phut(p), false, null, 40, 10.5f);
            c.Margin = new Padding(0, 0, UI.Px(8), 0);
            var pp = p;
            c.Click += (_, _) => { _phutDoi = pp; VeTab(); };
            chips.Add(c);
        }
        if (chips.Count > 0) Flow.Controls.Add(KhoiCon.Chips(W + UI.Px(8), chips.ToArray()));
        Flow.Controls.Add(UI.Text(AppConView.SauKhiDoi(_sao, _phutDoi, ConPhut, tyLe), 11f, false, UI.Muted, W));
        var doi = KhoiCon.Nut($"Đổi {AppConView.SaoChoPhut(_phutDoi, tyLe)} sao lấy {_phutDoi} phút", true, W, "sao");
        doi.Click += async (_, _) => await DoiAsync(doi);
        Flow.Controls.Add(doi);
        Flow.Controls.Add(KhoiCon.LienKet("Xin Ba Mẹ thêm giờ ›", "dong_ho_cat", () => { _tabSao = false; VeTab(); }));
    }

    private async Task DoiAsync(Button b)
    {
        if (_busy) return;
        var can = AppConView.SaoChoPhut(_phutDoi, _quy?.TyLe);
        if (_quy != null && _sao < can) { VeChuaDuSao(can); return; }
        _busy = true; b.Enabled = false;
        if (_msg != null) _msg.Text = "";
        var (kq, loi) = await HvApi.PostAsync<HvDoiSaoKq>("hoc-vien/doi-sao", new { phut = _phutDoi });
        _busy = false;
        if (IsDisposed) return;
        if (kq == null)
        {
            if (loi != null && loi.Contains("thiếu")) { VeChuaDuSao(can); return; }
            if (_msg != null) _msg.Text = loi ?? "Chưa đổi được. Con thử lại nhé.";
            b.Enabled = true;
            return;
        }
        _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });   // quỹ tăng ⇒ app chơi được thả ngay
        Xoa();
        Text = "AiiGrow · Đã đổi sao";
        var con = Math.Max(kq.ConPhut, ConPhut + kq.Phut);
        Flow.Controls.Add(KhoiCon.Dau("sao", KhoiCon.Mau.Vang, $"Đã đổi {kq.Sao} sao", null, W));
        var c = new ChipClay($"+{kq.Phut} phút", Clay.NgocSoft, Clay.NgocInk, Anh3D.Icon("dongho")) { Font = UI.F(13f, FontStyle.Bold) };
        c.Size = new Size(c.Width + UI.Px(16), UI.Px(38));
        Flow.Controls.Add(KhoiCon.Chips(W, c));
        Flow.Controls.Add(UI.Text("Giờ chơi còn " + AppConView.Phut(con), 12f, true, Clay.NgocInk, W));
        Flow.Controls.Add(UI.Text("Con còn " + AppConView.Sao(kq.SoDu), 11f, false, Clay.DiemInk, W));
        var tiep = KhoiCon.Nut($"Chơi tiếp {AppConView.Phut(con)}", true, W, "game");
        tiep.Click += (_, _) => Close();
        Flow.Controls.Add(tiep);
        Flow.Controls.Add(KhoiCon.LienKet("Làm nhiệm vụ lấy thêm sao ›", "tick", () => { Sau = SauNhiemVu; Close(); }));
        Xong();
    }

    /// <summary>con-xin 27: «Chưa đủ sao · Đổi 40 phút cần 40 sao · 30 / 40 sao · Còn thiếu 10 sao».</summary>
    private void VeChuaDuSao(int can)
    {
        Xoa();
        Text = "AiiGrow · Đổi sao lấy giờ";
        Flow.Controls.Add(KhoiCon.Dau("sao", KhoiCon.Mau.Vang, "Chưa đủ sao", $"Đổi {_phutDoi} phút cần {can} sao", W));
        Flow.Controls.Add(KhoiCon.Chips(W, KhoiApp.ChipSao($"{_sao} / {can} sao")));
        Flow.Controls.Add(UI.Text($"Còn thiếu {Math.Max(0, can - _sao)} sao", 12f, true, Clay.Canh, W));
        var lam = KhoiCon.Nut("Làm nhiệm vụ lấy thêm sao", true, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        var it = KhoiCon.Nut("Chọn ít phút hơn", false, W, "tru");
        it.Click += (_, _) => { _phutDoi = Math.Max(AppConView.BuocDoi, AppConView.PhutDoiToiDa(_sao, _quy) / AppConView.BuocDoi * AppConView.BuocDoi); VeTab(); };
        Flow.Controls.Add(it);
        Flow.Controls.Add(KhoiCon.LienKet("Xin Ba Mẹ thêm giờ ›", "dong_ho_cat", () => { _tabSao = false; VeTab(); }));
        Xong();
    }
}
