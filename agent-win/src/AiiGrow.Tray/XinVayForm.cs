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
    public const string SauXinMo = "xin_mo", SauNhan = "nhan", SauNhiemVu = "nhiem_vu";

    private HvSao? _sao;
    private int _soSao = XinVayView.MacDinh;
    private readonly TextBox _note = new() { Font = UI.F(11f), MaxLength = XinMoView.LoiNhanToiDa, ForeColor = UI.Ink, PlaceholderText = XinVayView.GoiYNhan };
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 3000 };
    private readonly bool _saoDung;
    private string? _pendingId;
    private int _soDaXin;
    private bool _busy;
    private Label? _msg;

    /// <summary>Số hộp đang mở — khay không bật thêm màn kết quả khi hộp này đang tự báo.</summary>
    public static int DangMo;

    public string? Sau { get; private set; }
    /// <summary>Lời xin vay còn «chờ» lúc Con đóng hộp (null = không có).</summary>
    public string? ChoId => _pendingId;
    public int SoDaXin => _soDaXin;

    /// <param name="saoDung">Mở thẳng «Sao dùng thế nào?».</param>
    /// <param name="taiNgay">false = không hỏi dịch vụ (công cụ chụp màn dựng thẳng từng bước).</param>
    public XinVayForm(bool saoDung = false, bool taiNgay = true) : base(saoDung ? SaoDungView.TieuDe : XinVayView.TieuDe, UI.Px(380))
    {
        _saoDung = saoDung;
        _poll.Tick += async (_, _) => await PollAsync();
        Interlocked.Increment(ref DangMo);
        FormClosed += (_, _) => { Interlocked.Decrement(ref DangMo); _poll.Dispose(); if (_note.Parent == null) _note.Dispose(); };
        if (taiNgay) Shown += async (_, _) => await TaiAsync();
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
        if (_pendingId == null) VeDau();
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
        Flow.Controls.Add(KhoiCon.Dau("sao", KhoiCon.Mau.Vang, XinVayView.Tieu, XinVayView.Phu(_sao?.PhutCon), W));
        Flow.Controls.Add(KhoiApp.NhanMuc(XinVayView.ConXinVay, W));
        var chips = new List<Control>();
        foreach (var n in Muc)
        {
            var r = new ClayRadio
            {
                Text = $"{n} sao", TextAlign = ContentAlignment.MiddleCenter, Checked = n == _soSao, UseMnemonic = false,
                Width = (W - UI.Px(16)) / 3, Height = Clay.Si(44) + VeNut.LeBong.Vertical, Font = UI.F(11.5f, FontStyle.Bold), Margin = new Padding(0, 0, UI.Px(8), 0),
            };
            var nn = n;
            r.CheckedChanged += (_, _) => { if (r.Checked && _soSao != nn) { _soSao = nn; BeginInvoke(VeXin); } };
            r.BackColor = r.Checked ? Clay.NgocSoft : UI.Card;
            r.ForeColor = r.Checked ? Clay.NgocInk : UI.Ink;
            chips.Add(r);
        }
        Flow.Controls.Add(KhoiCon.Chips(W + UI.Px(8), chips.ToArray()));
        Flow.Controls.Add(ONhapClay.Boc(_note, W));
        var gui = KhoiCon.Nut(XinVayView.Nut(_soSao), true, W, "tin");
        gui.Click += async (_, _) => await XinAsync(gui);
        Flow.Controls.Add(gui);
        var lk = KhoiCon.Hang();
        var trai = KhoiCon.LienKet(XinVayView.VayTraTheNao, "dau_hoi", VeSaoDung);
        trai.Margin = new Padding(0, 0, UI.Px(40), 0);
        lk.Controls.Add(trai);
        lk.Controls.Add(KhoiCon.LienKet(XinVayView.XinThemApp, "khoa", () => { Sau = SauXinMo; Close(); }));
        Flow.Controls.Add(lk);
        _msg = UI.Text("", 10.5f, true, UI.Error, W);
        Flow.Controls.Add(_msg);
        Xong();
    }

    private async Task XinAsync(Button b)
    {
        if (_busy) return;
        _busy = true; b.Enabled = false;
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
        Flow.Controls.Add(KhoiCon.Dau("gui", KhoiCon.Mau.Ngoc, XinVayView.DaGui, XinVayView.ConXin(_soDaXin > 0 ? _soDaXin : _soSao), W));
        Flow.Controls.Add(KhoiCon.Chips(W, KhoiApp.ChipCho(XinVayView.DangCho)));
        Flow.Controls.Add(UI.Text(XinVayView.TraLoiBaoNgay, 11f, false, UI.Muted, W));
        var lam = KhoiCon.Nut(XinVayView.LamNhiemVuTrongLucCho, true, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        Xong();
    }

    /// <summary>them-a86wn24i: mất mạng ⇒ «Đã lưu lời xin vay sao · Chờ có mạng (1)».</summary>
    private void VeDaLuu(int n)
    {
        Xoa();
        Text = "AiiGrow";
        HopDaLuu.Ve(Flow, W, XinVayView.DaLuu, XinVayView.Nut(_soDaXin), n, Close, XinVayView.VeHomNay);
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
        Flow.Controls.Add(KhoiCon.Dau("phao_hoa", KhoiCon.Mau.Ngoc, XinVayView.ChoVayTieu(nguoi), null, W));
        Flow.Controls.Add(KhoiCon.Chips(W, KhoiApp.ChipSao(XinVayView.ChoVayChip(soSao))));
        if (sao != null) Flow.Controls.Add(UI.Text(SaoView.ConPhut(sao.PhutCon), 12f, true, Clay.DiemInk, W));
        Flow.Controls.Add(UI.Text(XinVayView.ChoVayDong(soSao, sao?.No ?? soSao), 10.5f, false, Clay.Canh, W));
        if (!string.IsNullOrWhiteSpace(loiNhan)) Flow.Controls.Add(KhoiCon.DongIcon("tin", $"{XinVayView.TenBaMe(nguoi)} · «{loiNhan!.Trim()}»", W, false));
        var tiep = KhoiCon.Nut(XinVayView.ChoiTiep(sao?.PhutCon ?? soSao), true, W, "game");
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
        Flow.Controls.Add(KhoiCon.Dau("khoa", KhoiCon.Mau.Cam, XinVayView.ChuaChoTieu, XinVayView.ChuaChoPhu(SaoView.Phut(sao?.PhutCon)), W));
        if (!string.IsNullOrWhiteSpace(loiNhan)) Flow.Controls.Add(KhoiCon.DongIcon("tin", $"{XinVayView.TenBaMe(nguoi)} · «{loiNhan!.Trim()}»", W, false));
        var lam = KhoiCon.Nut(XinVayView.LamNhiemVuKiemSao, true, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        var nhan = KhoiCon.Nut(XinVayView.NhanBaMe, false, W, "tin");
        nhan.Click += (_, _) => { Sau = SauNhan; Close(); };
        Flow.Controls.Add(nhan);
        Flow.Controls.Add(KhoiCon.LienKet(XinVayView.VeHomNay, "nha", Close));
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
        the.Controls.Add(KhoiApp.DauThe("sao", SaoDungView.ConDangCo, _sao != null ? SaoView.SoDu(_sao.Sao) : "…", Clay.DiemInk, 22f, r, Clay.DiemInk, Clay.DiemSoft));
        if (_sao != null) the.Controls.Add(UI.Text(SaoDungView.BangPhut(_sao.PhutCon), 11f, true, Clay.DiemInk, r));
        if (_sao != null && SaoView.No(_sao.No) is { } no) the.Controls.Add(UI.Text(no, 10f, true, Clay.Canh, r));
        Flow.Controls.Add(the);
        foreach (var (icon, tieu, phu) in SaoDungView.Dong(AppDs.AppTinh, AppDs.AppKhong))
        {
            var d = KhoiCon.DongIcon(icon, tieu, W);
            Flow.Controls.Add(d);
            var p = UI.Text(phu, 10f, false, UI.Muted, W); p.Margin = new Padding(UI.Px(30), 0, 0, UI.Px(6));
            Flow.Controls.Add(p);
        }
        var lam = KhoiCon.Nut(SaoDungView.LamNhiemVu, true, W, "tick");
        lam.Click += (_, _) => { Sau = SauNhiemVu; Close(); };
        Flow.Controls.Add(lam);
        Flow.Controls.Add(KhoiCon.LienKet(SaoDungView.XinVay, "gui", VeXin));
        Xong();
    }

    /// <summary>Tên app «Tính phút» / «Không tính phút» khay đang biết (TrayContext đặt từ trạng thái dịch vụ) — câu «Roblox, YouTube Kids · Từ điển không tính phút».</summary>
    internal static class AppDs
    {
        public static IReadOnlyList<string> AppTinh = Array.Empty<string>();
        public static IReadOnlyList<string> AppKhong = Array.Empty<string>();
    }
}
