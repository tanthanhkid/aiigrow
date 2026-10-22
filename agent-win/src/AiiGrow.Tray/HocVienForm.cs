using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// «Nhiệm vụ &amp; phần quà» của HỌC VIÊN: nhận việc Ba Mẹ giao, làm + nộp bài, xem điểm / cấp, đổi quà, đọc tin và nhắn lại Ba Mẹ.
/// Hai chiều với app Ba Mẹ (Ba Mẹ giao + duyệt + đặt quà). Mọi quyết định do máy chủ; form chỉ hiện và gửi (qua dịch vụ, named pipe).
/// </summary>
internal sealed class HocVienForm : Form
{
    private readonly Label _hello = UI.Text("", 13f, true, null, 480);
    private readonly Label _points = UI.Text("", 26f, true, UI.Green, 480);
    private readonly Label _level = UI.Text("", 10.5f, false, UI.Muted, 480);
    private readonly Label _msg = UI.Text("", 10.5f, true, UI.Green, 500);
    private readonly TabControl _tabs = new() { Dock = DockStyle.Fill, Font = UI.F(10.5f) };
    private readonly FlowLayoutPanel _viec = Page(), _qua = Page(), _tin = Page();
    private bool _busy;

    /// <summary>Đã tải xong tổng quan (để khay cập nhật dòng tóm tắt).</summary>
    public event Action<HvTongQuan>? Loaded;

    public HocVienForm()
    {
        Text = "AiiGrow · Nhiệm vụ & phần quà";
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = UI.Paper;
        ClientSize = new Size(540, 700);
        Icon = UI.MakeIcon();

        var head = new FlowLayoutPanel
        {
            Dock = DockStyle.Top, Height = 132, FlowDirection = FlowDirection.TopDown, WrapContents = false,
            Padding = new Padding(20, 12, 20, 0),
        };
        head.Controls.Add(_hello);
        head.Controls.Add(_points);
        head.Controls.Add(_level);
        head.Controls.Add(_msg);

        AddTab("Việc của con", _viec);
        AddTab("Phần quà", _qua);
        AddTab("Tin nhắn", _tin);
        Controls.Add(_tabs);
        Controls.Add(head);

        // Đóng cửa sổ chỉ ẩn đi (khay vẫn chạy); mở lại thì tải mới.
        FormClosing += (_, e) => { if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); } };
        VisibleChanged += async (_, _) => { if (Visible) await RefreshAsync(); };
    }

    private void AddTab(string title, Control page)
    {
        var tp = new TabPage(title) { BackColor = UI.Paper, Padding = new Padding(4) };
        tp.Controls.Add(page);
        _tabs.TabPages.Add(tp);
    }

    private static FlowLayoutPanel Page() => new()
    {
        Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true,
        Padding = new Padding(8, 8, 8, 8), BackColor = UI.Paper,
    };

    /// <summary>Mở cửa sổ (nếu đang ẩn) và tải mới.</summary>
    public void ShowFront()
    {
        if (!Visible) Show(); else _ = RefreshAsync();
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
        Activate();
    }

    public async Task RefreshAsync()
    {
        if (_busy) return;
        _busy = true;
        try
        {
            Say("Đang tải…", false);
            var (tq, loi) = await HvApi.GetAsync<HvTongQuan>("hoc-vien/tong-quan");
            if (tq == null) { Say(loi ?? "Chưa tải được. Con thử lại nhé.", true); return; }
            Loaded?.Invoke(tq);
            RenderHead(tq);
            RenderViec(tq);
            RenderTinNhan(tq, null);
            Say("", false);

            var (ch, _) = await HvApi.GetAsync<HvCuaHang>("hoc-vien/cua-hang");
            RenderQua(tq, ch);
            var (tin, _) = await HvApi.GetAsync<HvTinDs>("hoc-vien/tin");
            if (tin != null) RenderTinNhan(tq, tin);
        }
        finally { _busy = false; }
    }

    private void Say(string s, bool error)
    {
        _msg.ForeColor = error ? Color.FromArgb(0xb9, 0x1c, 0x1c) : UI.Green;
        _msg.Text = s;
    }

    private void RenderHead(HvTongQuan t)
    {
        _hello.Text = string.IsNullOrWhiteSpace(t.Con.Ten) ? "Xin chào!" : $"Chào {t.Con.Ten}!";
        _points.Text = $"{t.SoDu} điểm";
        _level.Text = HocVienView.CapText(t.CapDo) + (t.DiemChoDuyet > 0 ? $" · {t.DiemChoDuyet} điểm đang chờ Ba Mẹ duyệt" : "");
    }

    // ---------------------------------------------------------------- Việc của con

    private void RenderViec(HvTongQuan t)
    {
        _viec.SuspendLayout();
        _viec.Controls.Clear();
        var ds = HocVienView.SapXep(t.NhiemVu);
        if (ds.Count == 0) _viec.Controls.Add(UI.Text("Chưa có nhiệm vụ nào. Khi Ba Mẹ giao việc, con sẽ thấy ở đây và nhận thông báo.", 11f, false, UI.Muted, 470));
        foreach (var v in ds) _viec.Controls.Add(ViecCard(v));

        var cho = t.Gan.Where(g => g.TrangThai is "cho_duyet" or "tu_choi" or "duoc_duyet").Take(8).ToList();
        if (cho.Count > 0)
        {
            _viec.Controls.Add(UI.Text("Gần đây", 12f, true, null, 470));
            foreach (var g in cho) _viec.Controls.Add(LuotCard(g));
        }
        _viec.ResumeLayout();
    }

    private Control ViecCard(HvNhiemVu v)
    {
        var card = Card();
        card.Controls.Add(UI.Text($"{v.Ten}   ·   +{v.Diem} điểm", 12f, true, null, 440));
        if (!string.IsNullOrWhiteSpace(v.MoTa)) card.Controls.Add(UI.Text(v.MoTa, 10.5f, false, UI.Muted, 440));
        var han = HocVienView.HanText(v.Han, DateTimeOffset.Now);
        var dong = new List<string> { HocVienView.TrangThaiText(v.TrangThai) };
        if (han != null) dong.Add(han);
        if (v.DangCho > 0) dong.Add($"{v.DangCho} bài chờ duyệt");
        if (v.GiaoRieng) dong.Add("Ba Mẹ giao riêng");
        card.Controls.Add(UI.Text(string.Join("  ·  ", dong), 10f, false, v.TrangThai == "can_bo_sung" ? Color.FromArgb(0xb4, 0x53, 0x09) : UI.Muted, 440));
        if (v.TrangThai == "can_bo_sung" && !string.IsNullOrWhiteSpace(v.LyDo))
            card.Controls.Add(UI.Text("Ba Mẹ nhắn: " + v.LyDo, 10.5f, true, Color.FromArgb(0xb4, 0x53, 0x09), 440));
        if (v.PhutToiThieu > 0 && v.TrangThai is "san_sang" or "dang_lam")
            card.Controls.Add(UI.Text($"Làm ít nhất {v.PhutToiThieu} phút rồi mới nộp được.", 10f, false, UI.Muted, 440));
        var nut = HocVienView.NutText(v);
        if (nut != null)
        {
            var b = UI.Btn(nut, v.TrangThai == "san_sang", 200);
            b.Height = 38;
            b.Click += async (_, _) => await ViecAsync(v, b);
            card.Controls.Add(b);
        }
        return card;
    }

    private static Control LuotCard(HvLuot g)
    {
        var card = Card();
        var diem = g.TrangThai == "duoc_duyet" && g.Diem.HasValue ? $"   ·   +{g.Diem} điểm" : "";
        card.Controls.Add(UI.Text(g.Ten + diem, 11f, true, null, 440));
        var s = HocVienView.TrangThaiText(g.TrangThai);
        if (!string.IsNullOrWhiteSpace(g.LyDo)) s += " · " + g.LyDo;
        card.Controls.Add(UI.Text(s, 10f, false, g.TrangThai == "tu_choi" ? Color.FromArgb(0xb9, 0x1c, 0x1c) : UI.Muted, 440));
        if (!string.IsNullOrWhiteSpace(g.LoiKhen)) card.Controls.Add(UI.Text("Ba Mẹ: " + g.LoiKhen, 10.5f, false, UI.Green, 440));
        return card;
    }

    private async Task ViecAsync(HvNhiemVu v, Button b)
    {
        if (_busy) return;
        if (v.TrangThai == "san_sang")
        {
            b.Enabled = false;
            _busy = true;
            Say("Đang nhận việc…", false);
            var (kq, loi) = await HvApi.PostAsync<HvBatDauKq>($"hoc-vien/nhiem-vu/{v.Id}/bat-dau");
            _busy = false;
            if (kq == null) { Say(loi ?? "Chưa nhận được việc. Con thử lại nhé.", true); b.Enabled = true; return; }
            await RefreshAsync();
            Say($"Con đã nhận «{v.Ten}». Làm xong thì bấm Nộp bài nhé!", false);
            return;
        }
        if (string.IsNullOrEmpty(v.Luot)) { Say("Con bấm Nhận việc trước nhé.", true); return; }
        using var f = new NopBaiForm(v);
        if (f.ShowDialog(this) == DialogResult.OK)
        {
            await RefreshAsync();
            if (f.Ket != null) Say(HocVienView.NopThongBao(f.Ket), false);
        }
    }

    // ---------------------------------------------------------------- Phần quà

    private void RenderQua(HvTongQuan t, HvCuaHang? ch)
    {
        _qua.SuspendLayout();
        _qua.Controls.Clear();
        _qua.Controls.Add(UI.Text($"Con đang có {t.SoDu} điểm", 12f, true, UI.Green, 470));
        foreach (var p in t.PhieuCho)
        {
            var c = Card();
            c.Controls.Add(UI.Text($"{p.Ten}   ·   {p.Diem} điểm", 11f, true, null, 440));
            c.Controls.Add(UI.Text("Đã đổi, đang chờ Ba Mẹ trao quà cho con.", 10f, false, UI.Muted, 440));
            _qua.Controls.Add(c);
        }
        if (ch == null || ch.Qua.Count == 0)
            _qua.Controls.Add(UI.Text(ch == null ? "Chưa tải được danh sách quà." : "Ba Mẹ chưa đặt phần quà nào. Con cứ làm nhiệm vụ để tích điểm nhé!", 11f, false, UI.Muted, 470));
        else
            foreach (var q in ch.Qua) _qua.Controls.Add(QuaCard(q));
        _qua.ResumeLayout();
    }

    private Control QuaCard(HvQua q)
    {
        var card = Card();
        card.Controls.Add(UI.Text($"{q.Ten}   ·   {q.Diem} điểm", 12f, true, null, 440));
        var s = HocVienView.QuaTrangThai(q) + (q.ChiCuoiTuan ? " · chỉ đổi vào cuối tuần" : "");
        card.Controls.Add(UI.Text(s, 10f, false, q.Du ? UI.Green : UI.Muted, 440));
        var b = UI.Btn("Đổi quà", q.Du, 200);
        b.Height = 38;
        b.Enabled = q.Du;
        b.Click += async (_, _) => await DoiAsync(q, b);
        card.Controls.Add(b);
        return card;
    }

    private async Task DoiAsync(HvQua q, Button b)
    {
        if (_busy) return;
        if (MessageBox.Show(this, $"Đổi «{q.Ten}» với {q.Diem} điểm nhé?", "AiiGrow", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        b.Enabled = false;
        _busy = true;
        Say("Đang đổi quà…", false);
        var (kq, loi) = await HvApi.PostAsync<HvDoiKq>($"hoc-vien/doi/{q.Id}");
        _busy = false;
        if (kq == null) { Say(loi ?? "Chưa đổi được. Con thử lại nhé.", true); b.Enabled = true; return; }
        await RefreshAsync();
        Say(HocVienView.DoiThongBao(kq, q.Ten), false);
    }

    // ---------------------------------------------------------------- Tin nhắn

    private void RenderTinNhan(HvTongQuan t, HvTinDs? tin)
    {
        _tin.SuspendLayout();
        _tin.Controls.Clear();
        if (t.LoiKhen.Count > 0) _tin.Controls.Add(UI.Text("Ba Mẹ nhắn con", 12f, true, null, 470));
        foreach (var l in t.LoiKhen) _tin.Controls.Add(LoiKhenCard(l));
        if (tin != null && tin.Ds.Count > 0)
        {
            _tin.Controls.Add(UI.Text("Thông báo gần đây", 12f, true, null, 470));
            foreach (var x in tin.Ds.Take(20))
            {
                var c = Card();
                c.Controls.Add(UI.Text(x.Tieu, 11f, true, null, 440));
                if (!string.IsNullOrWhiteSpace(x.Noi)) c.Controls.Add(UI.Text(x.Noi, 10.5f, false, UI.Muted, 440));
                if (x.Luc != null) c.Controls.Add(UI.Text(x.Luc.Value.ToLocalTime().ToString("HH:mm dd/MM"), 9.5f, false, UI.Muted, 440));
                _tin.Controls.Add(c);
            }
        }
        if (_tin.Controls.Count == 0) _tin.Controls.Add(UI.Text("Chưa có tin nhắn nào.", 11f, false, UI.Muted, 470));
        _tin.ResumeLayout();
    }

    private Control LoiKhenCard(HvLoiKhen l)
    {
        var card = Card();
        card.Controls.Add(UI.Text("Ba Mẹ: " + l.NoiDung, 11f, true, UI.Green, 440));
        if (!string.IsNullOrWhiteSpace(l.PhanHoi))
        {
            card.Controls.Add(UI.Text("Con: " + l.PhanHoi, 10.5f, false, null, 440));
            return card;
        }
        var row = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = true, Width = 440, Margin = new Padding(0) };
        foreach (var s in new[] { "Con cảm ơn ạ", "Con sẽ cố gắng", "Con yêu Ba Mẹ" })
        {
            var b = UI.Btn(s, false, 135);
            b.Height = 34;
            b.Font = UI.F(9.5f, FontStyle.Bold);
            b.Margin = new Padding(0, 0, 6, 4);
            var ch = s;
            b.Click += async (_, _) => await TraLoiAsync(l, ch);
            row.Controls.Add(b);
        }
        card.Controls.Add(row);
        return card;
    }

    private async Task TraLoiAsync(HvLoiKhen l, string noi)
    {
        if (_busy) return;
        _busy = true;
        Say("Đang gửi…", false);
        var (kq, loi) = await HvApi.PostAsync<HvDongY>($"hoc-vien/loi-khen/{l.Id}/phan-hoi", new { phanHoi = noi });
        _busy = false;
        if (kq == null) { Say(loi ?? "Chưa gửi được. Con thử lại nhé.", true); return; }
        await RefreshAsync();
        Say("Đã nhắn lại Ba Mẹ.", false);
    }

    private static FlowLayoutPanel Card() => new()
    {
        AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, FlowDirection = FlowDirection.TopDown, WrapContents = false,
        Width = 470, MinimumSize = new Size(470, 0), BackColor = Color.White, BorderStyle = BorderStyle.FixedSingle,
        Padding = new Padding(12, 10, 12, 6), Margin = new Padding(0, 0, 0, 8),
    };
}
