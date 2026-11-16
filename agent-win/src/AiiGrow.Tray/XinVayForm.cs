using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Xin Ba Mẹ cho vay sao» (bàn thiết kế 15/11: them-xsmcu9jj · them-rgy15s87 → them-luui7gvq «Đã gửi» → them-fsif1cbl «cho vay rồi» / them-zo8kohea «chưa cho»;
/// mất mạng: them-a86wn24i «Đã lưu lời xin vay sao»). Chip 10 / 15 / 30 sao (mặc định 15) + lời nhắn (không bắt buộc) → dịch vụ gửi `yeu-cau {loai: vay_sao}`.
/// Cùng hộp có «Sao dùng thế nào?» (them-a7sh10qs). Số sao đọc từ hoc-vien/sao — máy chủ quyết. Thay hộp «Thêm giờ chơi» cũ (đổi sao lấy giờ / xin thêm giờ).
/// Sau khi đóng, <see cref="Sau"/> cho khay biết Con muốn đi đâu tiếp; <see cref="ChoId"/> = lời xin còn chờ khi Con đóng hộp (khay tự theo dõi kết quả).
/// </summary>
internal sealed class XinVayForm : HopKhayCoBan
{
    public const string SauXinMo = "xin_mo", SauNhan = "nhan", SauNhiemVu = "nhiem_vu", SauHetSao = "het_sao";

    private HvSao? _sao;
    private int _soSao = XinVayView.MacDinh;
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = XinMoView.LoiNhanToiDa, ForeColor = UI.Ink, PlaceholderText = XinVayView.GoiYNhan };
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private readonly bool _saoDung;
    /// <summary>#307 them-rgy15s87: mở từ popup «Hết sao rồi» — «‹» quay lại popup, dòng phụ «Chọn số sao…», không «Xin thêm app ›», chip chọn tô đặc.</summary>
    private readonly bool _tuHetSao;
    private string? _pendingId;
    private int _soDaXin;
    private DateTimeOffset? _luuLuc;   // lúc lưu lời xin (mất mạng)
    private bool _busy;
    /// <summary>Con đã bấm / gõ gì trên hộp ⇒ lượt tải số sao về muộn chỉ cập nhật dữ liệu, KHÔNG vẽ lại màn (không kéo Con về màn đầu, không mất tiêu điểm).</summary>
    private bool _daThaoTac;
    private Label? _msg;

    /// <summary>Số hộp đang mở — khay không bật thêm màn kết quả khi hộp này đang tự báo.</summary>
    public static int DangMo;

    public string? Sau { get; private set; }
    /// <summary>Lời xin vay còn «chờ» lúc Con đóng hộp (null = không có).</summary>
    public string? ChoId => _pendingId;
    public int SoDaXin => _soDaXin;

    /// <param name="saoDung">Mở thẳng «Sao dùng thế nào?».</param>
    /// <param name="taiNgay">false = không hỏi dịch vụ (công cụ chụp màn dựng thẳng từng bước).</param>
    public XinVayForm(bool saoDung = false, bool taiNgay = true, bool tuHetSao = false) : base(saoDung ? SaoDungView.TieuDe : XinVayView.TieuDe, UI.Px(380))
    {
        _saoDung = saoDung;
        _tuHetSao = tuHetSao;
        _poll.Tick += async (_, _) => await PollAsync();
        Interlocked.Increment(ref DangMo);
        FormClosed += (_, _) => { Interlocked.Decrement(ref DangMo); _poll.Dispose(); if (_note.Parent == null) _note.Dispose(); };
        if (taiNgay) Shown += async (_, _) => await TaiAsync();
        _note.TextChanged += (_, _) => _daThaoTac = true;
        VeDau();
    }

    private void Xoa()
    {
        _note.Parent?.Controls.Remove(_note);
        XoaHet();
    }

    private async Task TaiAsync()
    {
        var (r, _) = await HvApi.GetAsync<HvSao>("hoc-vien/sao");
        if (IsDisposed) return;
        if (r != null) { _sao = r; if (r.MucVay.Count > 0 && !r.MucVay.Contains(_soSao)) _soSao = r.VayMacDinh; }
        if (_pendingId == null && !_daThaoTac) VeDau();
    }

    /// <summary>Công cụ chụp màn: dựng với số liệu mẫu.</summary>
    internal void DatMau(HvSao sao, int soSao = XinVayView.MacDinh) { _sao = sao; _soSao = soSao; VeDau(); }

    private void VeDau() { if (_saoDung) VeSaoDung(); else VeXin(); }

    private int[] Muc => _sao is { MucVay.Count: > 0 } s ? s.MucVay.ToArray() : XinVayView.Muc;

    // ---------------------------------------------------------------- Xin vay (them-xsmcu9jj)

    private void VeXin()
    {
        _poll.Stop();
        Xoa();
        Text = XinVayView.TieuDe;
        if (_tuHetSao)
        {
            var dau = KhoiCon.Hang();
            var lui = KhoiXin.NutTron("‹", () => { Sau = SauHetSao; Close(); });
            dau.Controls.Add(lui);
            dau.Controls.Add(KhoiCon.Dau("sao", KhoiCon.Mau.Vang, XinVayView.Tieu, XinVayView.PhuChon, W - lui.Width - lui.Margin.Horizontal));
            Flow.Controls.Add(dau);
        }
        else
        {
            Flow.Controls.Add(KhoiCon.Dau("sao", KhoiCon.Mau.Vang, XinVayView.Tieu, XinVayView.Phu(_sao?.PhutCon), W));
            Flow.Controls.Add(KhoiApp.NhanMuc(XinVayView.ConXinVay, W));
        }
        var chips = new List<Control>();
        foreach (var n in Muc)
        {
            var r = new ClayRadio
            {
                Text = $"{n} sao", TextAlign = ContentAlignment.MiddleCenter, Checked = n == _soSao, UseMnemonic = false,
                Width = (W - UI.Px(16)) / 3, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold), Margin = new Padding(0, 0, UI.Px(8), 0),
            };
            var nn = n;
            r.CheckedChanged += (_, _) => { if (r.Checked && _soSao != nn) { _daThaoTac = true; _soSao = nn; BeginInvoke(VeXin); } };
            r.BackColor = r.Checked ? (_tuHetSao ? UI.Green : Clay.NgocSoft) : UI.Card;
            r.ForeColor = r.Checked ? (_tuHetSao ? Color.White : Clay.NgocInk) : UI.Ink;
            chips.Add(r);
        }
        Flow.Controls.Add(KhoiCon.Chips(W + UI.Px(8), chips.ToArray()));
        Flow.Controls.Add(ONhapClay.Boc(_note, W));
        var gui = KhoiCon.Nut(XinVayView.Nut(_soSao), true, W, "tin");
        gui.Click += async (_, _) => await XinAsync(gui);
        Flow.Controls.Add(gui);
        var lk = KhoiCon.Hang();
        var trai = KhoiCon.LienKet(XinVayView.VayTraTheNao, "dau_hoi", () => { _daThaoTac = true; VeSaoDung(); });
        trai.Margin = new Padding(0, 0, UI.Px(40), 0);
        lk.Controls.Add(trai);
        if (!_tuHetSao) lk.Controls.Add(KhoiCon.LienKet(XinVayView.XinThemApp, "khoa", () => { Sau = SauXinMo; Close(); }));
        Flow.Controls.Add(lk);
        _msg = UI.Text("", 10.5f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        Xong();
    }

    private async Task XinAsync(Button b)
    {
        if (_busy) return;
        _busy = true; b.Enabled = false; _daThaoTac = true;
        if (_msg != null) _msg.Text = "";
        var res = await PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.Request, Kind = LoaiXin.VaySao, Minutes = _soSao, Note = XinVayView.LyDo(_note.Text) });
        _busy = false;
        if (IsDisposed) return;
        if (!res.Ok)
        {
            if (_msg != null) _msg.Text = res.Error ?? "Chưa gửi được. Con thử lại nhé.";
            b.Enabled = true;
            return;
        }
        _soDaXin = _soSao;
        if (res.Status == "cho_mang") { VeDaLuu(int.TryParse(res.Message, out var n) ? n : 1); return; }
        if (TrayView.XinGio(res.Status) == TrayView.KetQuaXin.Duoc) { await VeDuocAsync(null); return; }
        _pendingId = res.Id;
        VeDaGui();
        _poll.Start();
    }

    /// <summary>them-luui7gvq: «Đã gửi Ba Mẹ! · Con xin vay 15 sao · Đang chờ Ba Mẹ».</summary>
    internal void VeDaGui()
    {
        Xoa();
        Text = "AiiGrow · Đã gửi";
        // Bàn them-luui7gvq: «‹» về hộp xin vay · Grow cầm sổ · «Đã gửi Ba Mẹ!» · «Con xin vay 15 sao» · chip vàng «Đang chờ Ba Mẹ» · nút phụ
        Flow.Controls.Add(KhoiXin.DauRob("so-tay", W, () => { VeXin(); if (_pendingId != null) _poll.Start(); },
            KhoiXin.Chu(XinVayView.DaGui, 15f, true, UI.Ink),
            KhoiXin.Chu(XinVayView.ConXin(_soDaXin > 0 ? _soDaXin : _soSao), 10.5f, true, UI.Ink),
            KhoiXin.Chip(XinVayView.DangCho, Clay.DiemSoft, Clay.Canh, "dongho")));
        Flow.Controls.Add(UI.Text(XinVayView.TraLoiBaoNgay, 10.5f, false, UI.Muted, W));
        var lam = KhoiCon.Nut(XinVayView.LamNhiemVuTrongLucCho, false, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        Xong();
    }

    /// <summary>them-a86wn24i: mất mạng ⇒ «Đã lưu lời xin vay sao · Chờ có mạng (1)».</summary>
    private void VeDaLuu(int n)
    {
        Xoa();
        Text = "AiiGrow";
        _luuLuc ??= DateTimeOffset.Now;
        HopDaLuu.Ve(Flow, W, XinVayView.DaLuu, XinVayView.Nut(_soDaXin), n, Close, XinVayView.VeHomNay, luc: _luuLuc);
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
            case TrayView.KetQuaXin.Duoc: _poll.Stop(); _pendingId = null; await VeDuocAsync(res.KetQua); break;
            case TrayView.KetQuaXin.TuChoi: _poll.Stop(); _pendingId = null; await VeChuaChoAsync(res.KetQua); break;
            case TrayView.KetQuaXin.HetHan:
                _poll.Stop(); _pendingId = null;
                VeXin();
                if (_msg != null) _msg.Text = "Lời xin đã hết hạn hoặc bị huỷ. Con gửi lại nhé.";
                break;
        }
    }

    private async Task<HvSao?> SaoMoiAsync()
    {
        _ = PipeClient.CallAsync(new PipeRequest { Cmd = PipeCmd.SyncNow });   // sao mới ⇒ app «Tính phút» được thả ngay, không chờ nhịp sau
        var (r, _) = await HvApi.GetAsync<HvSao>("hoc-vien/sao");
        return r;
    }

    /// <summary>them-fsif1cbl: «Mẹ Lan cho vay rồi! · +15 sao · còn 15 sao = 15 phút chơi · Ba Mẹ cho vay 15 sao · Con đang nợ 15 sao».</summary>
    private async Task VeDuocAsync(RequestStatus? kq)
    {
        var moi = await SaoMoiAsync();
        if (IsDisposed) return;
        VeDuoc(kq?.TenNguoiDuyet, kq?.LoiNhan, _soDaXin, moi ?? _sao);
    }

    internal void VeDuoc(string? nguoi, string? loiNhan, int soSao, HvSao? sao)
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        // Bàn them-fsif1cbl: Grow cầm quà · chip «Mẹ Lan cho vay rồi!» · «+15 sao» lớn · chip «còn 15 sao = 15 phút chơi» · dòng nợ · bong bóng lời Mẹ
        var cot = new List<Control>
        {
            KhoiXin.Chip(XinVayView.ChoVayTieu(nguoi), Clay.NgocSoft, Clay.NgocInk, "tick"),
            KhoiXin.Chu(XinVayView.ChoVayChip(soSao), 24f, true, Clay.DiemInk),
        };
        if (sao != null) cot.Add(KhoiXin.Chip(SaoView.ConPhut(sao.PhutCon), Clay.DiemSoft, Clay.DiemInk, "sao"));
        Flow.Controls.Add(KhoiXin.DauRob("qua", W, null, cot.ToArray()));
        Flow.Controls.Add(UI.Text(XinVayView.ChoVayDong(soSao, sao?.No ?? soSao), 10.5f, true, Clay.Canh, W));
        if (!string.IsNullOrWhiteSpace(loiNhan)) Flow.Controls.Add(KhoiXin.BongLoi(XinVayView.TenBaMe(nguoi), loiNhan!, W));
        var tiep = KhoiCon.Nut(XinVayView.ChoiTiep(sao?.PhutCon ?? soSao), true, W, "dongho");
        tiep.Click += (_, _) => Close();
        Flow.Controls.Add(tiep);
        Xong();
    }

    /// <summary>them-zo8kohea: «Ba Mẹ chưa cho vay sao · Con còn 0 sao · làm nhiệm vụ để có sao».</summary>
    private async Task VeChuaChoAsync(RequestStatus? kq)
    {
        var (r, _) = await HvApi.GetAsync<HvSao>("hoc-vien/sao");
        if (IsDisposed) return;
        VeChuaCho(kq?.TenNguoiDuyet, kq?.LoiNhan, r ?? _sao);
    }

    internal void VeChuaCho(string? nguoi, string? loiNhan, HvSao? sao)
    {
        Xoa();
        Text = "AiiGrow · Ba Mẹ trả lời";
        // Bàn them-zo8kohea: viên bong bóng chat · bong bóng lời Mẹ · «Làm nhiệm vụ kiếm sao» · hai nút ngang «Nhắn Ba Mẹ | Về Hôm nay»
        Flow.Controls.Add(KhoiCon.Dau("tin", KhoiCon.Mau.Trang, XinVayView.ChuaChoTieu, XinVayView.ChuaChoPhu(SaoView.Phut(sao?.PhutCon)), W));
        if (!string.IsNullOrWhiteSpace(loiNhan)) Flow.Controls.Add(KhoiXin.BongLoi(XinVayView.TenBaMe(nguoi), loiNhan!, W));
        var lam = KhoiCon.Nut(XinVayView.LamNhiemVuKiemSao, true, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        Flow.Controls.Add(KhoiXin.HaiNut(W, (XinVayView.NhanBaMe, "tin", () => { Sau = SauNhan; Close(); }), (XinVayView.VeHomNay, null, Close)));
        Xong();
    }

    // ---------------------------------------------------------------- Sao dùng thế nào? (them-a7sh10qs)

    private void VeSaoDung()
    {
        _poll.Stop();
        Xoa();
        Text = SaoDungView.TieuDe;
        var the = KhoiApp.The(W + VeThe.LeBong.Horizontal, vang: true, le: 16);
        the.Margin = new Padding(0, 0, 0, UI.Px(10));
        var r = KhoiApp.TrongThe(W + VeThe.LeBong.Horizontal, 16);
        // Bàn them-a7sh10qs: «Con đang có / 18 sao» bên trái, «= 18 phút chơi» cùng hàng bên phải
        var hangSo = KhoiCon.Hang();
        var dauSo = KhoiApp.DauThe("sao", SaoDungView.ConDangCo, _sao != null ? SaoView.SoDu(_sao.Sao) : "…", Clay.DiemInk, 22f, r * 3 / 5, Clay.DiemInk, Clay.DiemSoft);
        hangSo.Controls.Add(dauSo);
        if (_sao != null)
        {
            var bang = UI.Text(SaoDungView.BangPhut(_sao.PhutCon), 11f, true, Clay.DiemInk, r * 2 / 5);
            bang.Margin = new Padding(UI.Px(4), Math.Max(0, (dauSo.PreferredSize.Height - bang.PreferredHeight) / 2), 0, 0);
            hangSo.Controls.Add(bang);
        }
        the.Controls.Add(hangSo);
        if (_sao != null && SaoView.No(_sao.No) is { } no) the.Controls.Add(UI.Text(no, 10f, true, Clay.Canh, r));
        Flow.Controls.Add(the);
        foreach (var (icon, tieu, phu) in SaoDungView.Dong(AppDs.AppTinh, AppDs.AppKhong))
            Flow.Controls.Add(KhoiThietKe.Dong(icon, tieu, phu, W, false, 40, 10.5f));
        var lam = KhoiCon.Nut(SaoDungView.LamNhiemVu, true, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        Flow.Controls.Add(KhoiCon.LienKet(SaoDungView.XinVay, "gui", () => { _daThaoTac = true; VeXin(); }));
        Xong();
    }

    /// <summary>Tên app «Tính phút» / «Không tính phút» khay đang biết (TrayContext đặt từ trạng thái dịch vụ) — câu «Roblox, YouTube Kids · Từ điển không tính phút».</summary>
    internal static class AppDs
    {
        public static IReadOnlyList<string> AppTinh = Array.Empty<string>();
        public static IReadOnlyList<string> AppKhong = Array.Empty<string>();
    }
}
