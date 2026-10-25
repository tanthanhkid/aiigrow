using System.Diagnostics;
using System.Drawing.Imaging;
using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using AiiGrow.Core;
using AiiGrow.Setup;
using AiiGrow.Tray;

namespace AiiGrow.ChupMan;

/// <summary>
/// Công cụ chụp MỌI màn của agent Windows (khay + bộ cài) với dữ liệu mẫu tiếng Việt — KHÔNG nói chuyện với dịch vụ, máy chủ, tài khoản Windows thật:
/// mỗi Form được dựng trực tiếp, dữ liệu học viên đặt vào trường riêng của Form, các lệnh gửi dịch vụ bị chặn (AppForm._busy) hoặc tự hết giờ (named pipe không có).
/// Bộ cài: chỉ gọi các bước dựng giao diện; bước «Cài» trỏ tới một máy chủ giả trên 127.0.0.1 trả lỗi «mã hết hạn» ⇒ dừng TRƯỚC mọi thay đổi trên máy.
/// Dùng:  AiiGrow.ChupMan.exe --chup-man &lt;thư mục&gt; [--ti-le 1.5] [--rong 1920 --cao 1080]
/// </summary>
internal static class ChupMain
{
    private const BindingFlags Moi = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
    private static string _ra = ".";
    private static StreamWriter _log = StreamWriter.Null;
    private static int _loi;
    /// <summary>«Màn hình» giả định cho màn toàn màn hình (khoá) và cỡ cửa sổ app: mặc định 1920×1080.</summary>
    private static Size _man = new(1920, 1080);

    [STAThread]
    private static int Main(string[] args)
    {
        string? ra = null;
        float k = 1f;
        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--chup-man" when i + 1 < args.Length: ra = args[++i]; break;
                case "--ti-le" when i + 1 < args.Length: k = float.Parse(args[++i], CultureInfo.InvariantCulture); break;
                case "--rong" when i + 1 < args.Length: _man.Width = int.Parse(args[++i], CultureInfo.InvariantCulture); break;
                case "--cao" when i + 1 < args.Length: _man.Height = int.Parse(args[++i], CultureInfo.InvariantCulture); break;
            }
        }
        if (ra == null)
        {
            Console.Error.WriteLine("Dùng: AiiGrow.ChupMan.exe --chup-man <thư mục> [--ti-le 1.5]");
            return 2;
        }
        _ra = Path.GetFullPath(ra);
        Directory.CreateDirectory(_ra);
        _log = new StreamWriter(Path.Combine(_ra, "chup.log"), false, new UTF8Encoding(false)) { AutoFlush = true };
        ChupDpi.K = k;

        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetDefaultFont(new Font("Segoe UI", 9f * k));   // phông mặc định của control không đặt Font — cũng theo hệ số
        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
        Application.ThreadException += (_, e) => { _loi++; Log("LỖI (ThreadException): " + e.Exception); };

        Log($"tỉ lệ giả lập {k:0.##} · Clay.Scale {AiiGrow.ClayUi.Clay.Scale:0.##} · màn thật {Screen.PrimaryScreen!.Bounds.Size} · màn giả định {_man} · DPI hệ thống {DpiHeThong()}");

        var t = new System.Windows.Forms.Timer { Interval = 100 };
        t.Tick += async (_, _) =>
        {
            t.Stop();
            try { await ChayHet(); }
            catch (Exception e) { _loi++; Log("LỖI: " + e); }
            Log($"xong · {_loi} lỗi");
            Application.ExitThread();
        };
        t.Start();
        Application.Run();
        _log.Dispose();
        return _loi == 0 ? 0 : 1;
    }

    private static async Task ChayHet()
    {
        await Mot("app-hom-nay", () => ManApp("app-hom-nay", MucApp.HomNay, TrangThai(), true));
        await Mot("app-hom-nay-mat-mang", () => ManApp("app-hom-nay-mat-mang", MucApp.HomNay,
            TrangThai(s => { s.Offline = true; s.OfflineSince = DateTimeOffset.Now.AddMinutes(-25); }), true));
        await Mot("app-hom-nay-dich-vu-tat", () => ManApp("app-hom-nay-dich-vu-tat", MucApp.HomNay, TrangThai(), true, kn: KetNoiView.Chon(false, null)));
        await Mot("app-hom-nay-mo-bang-ma", () => ManApp("app-hom-nay-mo-bang-ma", MucApp.HomNay,
            TrangThai(s => { s.MinutesLeft = null; s.MoOfflineDen = DateTimeOffset.Now.AddMinutes(55); s.Offline = true; s.OfflineSince = DateTimeOffset.Now.AddHours(-2); }), true));
        await Mot("app-nhiem-vu", () => ManApp("app-nhiem-vu", MucApp.NhiemVu, TrangThai(), true));
        await Mot("app-phan-qua", () => ManApp("app-phan-qua", MucApp.PhanQua, TrangThai(), true));
        await Mot("app-tin-nhan", () => ManApp("app-tin-nhan", MucApp.TinNhan, TrangThai(), true));
        await Mot("app-vi-qua", () => ManApp("app-vi-qua", MucApp.ViQua, TrangThai(), true));
        await Mot("app-nhiem-vu-loi-tai", () => ManApp("app-nhiem-vu-loi-tai", MucApp.NhiemVu, TrangThai(), false,
            loiTai: "Không kết nối được máy chủ. Con kiểm tra Wi-Fi rồi bấm Thử lại nhé."));

        await Mot("chan-app", () => ManChan("chan-app", "robloxplayerbeta.exe", "Roblox", LockReasons.ChuaPhanLoai, true, false));
        await Mot("chan-app-het-diem", () => ManChan("chan-app-het-diem", "minecraft.exe", "Minecraft Launcher", LockReasons.HetDiem, true, false));
        await Mot("chan-app-mat-mang", () => ManChan("chan-app-mat-mang", "robloxplayerbeta.exe", "Roblox", LockReasons.ChuaPhanLoai, true, true));

        await Mot("khoa-het-gio-dem-nguoc", () => ManKhoa("khoa-het-gio-dem-nguoc", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.HetGio; s.MinutesLeft = 0; s.LockGraceLeftSec = 45; })));
        await Mot("khoa-gio-ngu", () => ManKhoa("khoa-gio-ngu", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.Ngu; })));
        await Mot("khoa-ba-me-khoa", () => ManKhoa("khoa-ba-me-khoa", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.Khoa; })));
        await Mot("khoa-mat-mang", () => ManKhoa("khoa-mat-mang", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.HetGio; s.Offline = true; s.MinutesLeft = 0; })));

        await Mot("xin-them-gio", () => ManHop("xin-them-gio", () =>
        {
            var f = new RequestForm(true);
            ((TextBox)Lay(f, "_note")!).Text = "Con đang làm dở bài thuyết trình nhóm môn Khoa học, xin Ba Mẹ thêm 1 giờ ạ.";
            return f;
        }));
        await Mot("xin-them-gio-tu-man-chan", () => ManHop("xin-them-gio-tu-man-chan", () => new RequestForm(true, "robloxplayerbeta.exe", "Roblox")));
        await Mot("nop-bai-viet", () => ManHop("nop-bai-viet", () =>
        {
            var f = new NopBaiForm(NhiemVu()[0]);
            ((TextBox)Lay(f, "_note")!).Text = "Con thích nhất Dế Mèn vì bạn ấy dũng cảm, biết nhận lỗi sau khi trêu chị Cốc làm Dế Choắt bị hại.";
            return f;
        }));
        await Mot("nop-bai-anh-bo-sung", () => ManHop("nop-bai-anh-bo-sung", () =>
        {
            var f = new NopBaiForm(NhiemVu()[3]);
            ((Label)Lay(f, "_file")!).Text = "Đã chọn: tuoi-cay-ban-cong-chup-lai.jpg";
            return f;
        }));
        await Mot("choi-bang-diem", ManChoiBangDiem);

        await Mot("khay-menu", ManMenuKhay);
        // Bóng báo khay («Còn 5 phút»…): runner Windows Server không hiện thông báo (đã thử, ảnh chỉ có màn nền) ⇒ không chụp được ở đây.

        await Mot("cai-1-chao", () => ManCai("cai-1-chao", _ => { }));
        await Mot("cai-2-dieu-khoan", () => ManCai("cai-2-dieu-khoan", f =>
        {
            Goi(f, "BuocDieuKhoan");
            foreach (var c in TatCa(f).OfType<CheckBox>()) c.Checked = true;
        }));
        await Mot("cai-3-chon-tai-khoan", () => ManCai("cai-3-chon-tai-khoan", f =>
        {
            DatTruong(f, "_accounts", TaiKhoanMau());
            Goi(f, "HienTaiKhoan", 1);
            foreach (var r in TatCa(f).OfType<RadioButton>()) if (r.Text.StartsWith("minhkhoi", StringComparison.Ordinal)) r.Checked = true;
        }));
        await Mot("cai-3-tao-tai-khoan", () => ManCai("cai-3-tao-tai-khoan", f =>
        {
            DatTruong(f, "_accounts", TaiKhoanMau());
            Goi(f, "HienTaiKhoan", 2);
            var o = TatCa(f).OfType<TextBox>().ToList();
            if (o.Count > 0) o[0].Text = "minhkhoi";
            if (o.Count > 1) o[1].Text = "khoi2016";
        }));
        await Mot("cai-3-chi-mot-tai-khoan-quan-tri", () => ManCai("cai-3-chi-mot-tai-khoan-quan-tri", f =>
        {
            var toi = new LocalAccount("Minh Khoi", SidToi(), true);
            DatTruong(f, "_accounts", new List<LocalAccount> { toi });
            Goi(f, "KiemTaiKhoan", toi);
        }));
        await Mot("cai-4-ma-ghep", () => ManCai("cai-4-ma-ghep", f =>
        {
            DatTruong(f, "_child", ConMau());
            Goi(f, "BuocGhep");
            TatCa(f).OfType<TextBox>().First().Text = "482915";
        }));
        await Mot("cai-4-ma-ghep-sai", () => ManCai("cai-4-ma-ghep-sai", f =>
        {
            DatTruong(f, "_child", ConMau());
            Goi(f, "BuocGhep");
            TatCa(f).OfType<TextBox>().First().Text = "48291";
            TatCa(f).OfType<Button>().First(b => b.Text == "Ghép và cài đặt").PerformClick();
        }));
        await Mot("cai-5-dang-cai", ManDangCai);
        await Mot("cai-6-xong", () => ManCai("cai-6-xong", f => Goi(f, "BuocXong", ConMau())));
        await Mot("cap-nhat", () => ManHop("cap-nhat", () => new CapNhatForm(new PhatHienCai(CheDoBoCai.CapNhat, new Version(0, 2, 9), new Version(0, 2, 10)))));
        await Mot("cap-nhat-da-moi-nhat", () => ManHop("cap-nhat-da-moi-nhat", () => new CapNhatForm(new PhatHienCai(CheDoBoCai.DaMoiNhat, new Version(0, 2, 10), new Version(0, 2, 10)))));
    }

    // =========================================================== các màn

    private static async Task ManApp(string ten, MucApp muc, TrayState s, bool coDuLieu, KetNoiInfo? kn = null, string? loiTai = null)
    {
        var f = new AppForm();
        DatTruong(f, "_busy", true);   // chặn RefreshAsync (gọi dịch vụ qua named pipe) — dữ liệu mẫu đặt thẳng vào trường
        if (coDuLieu)
        {
            DatTruong(f, "_tq", TongQuan());
            DatTruong(f, "_ch", CuaHang());
            DatTruong(f, "_tin", Tin());
            DatTruong(f, "_vi", HocVienView.Parse<HvViQua>("""
                {"voucher":[{"ma":"AC-7K2P9Q","menh_gia":50000,"trang_thai":"da_phat_hanh","het_han":"2026-12-20T00:00:00Z"},
                            {"ma":"AC-3M8D1X","menh_gia":20000,"trang_thai":"da_dung","het_han":"2026-11-01T00:00:00Z","dung_luc":"2026-10-20T03:00:00Z"}],
                 "phieu":[{"id":"p1","ten":"Một buổi xem phim cùng Ba","loai":"qua","diem":200,"trang_thai":"giu","created_at":"2026-10-24T03:00:00Z"}]}
                """));
            DatTruong(f, "_tt", HocVienView.Parse<HvThanhTich>("""
                {"chuoiNgay":4,"tongKiem":540,"capDo":{"cap":3,"diemCapSau":600,"conThieu":60},"huyHieu":[
                 {"ma":"khoi_dau","ten":"Khởi đầu","mo_ta":"Nhiệm vụ đầu tiên được duyệt","dat":true,"datLuc":"2026-10-01T00:00:00Z"},
                 {"ma":"mot_sach","ten":"Mọt sách","mo_ta":"10 nhiệm vụ học tập","dat":true,"datLuc":"2026-10-12T00:00:00Z"},
                 {"ma":"tay_dam_dang","ten":"Tay đảm đang","mo_ta":"10 việc nhà","dat":false},
                 {"ma":"chuoi_7","ten":"7 ngày liền","mo_ta":"Có nhiệm vụ được duyệt 7 ngày liền","dat":false},
                 {"ma":"cap_5","ten":"Cây non","mo_ta":"Lên cấp 5","dat":false}]}
                """));
            DatTruong(f, "_qt", HocVienView.Parse<HvQuyTac>("""
                {"lich":{"ngayThuong":[{"tu":"17:00","den":"20:00"}],"cuoiTuan":[{"tu":"08:00","den":"11:00"},{"tu":"15:00","den":"20:00"}],"ngu":{"tu":"21:30","den":"06:30"}},
                 "tranNgay":120,"phienToiDa":45,"nghiGiua":15,"giaPhut":{"game":1,"video_ngan":1.5,"mxh":2,"phim_gd":0}}
                """));
            DatTruong(f, "_phutChoi", (int?)18);
            DatTruong(f, "_phutChoiCua", s.PlayChoices.FirstOrDefault());
        }
        DatTruong(f, "_loiTai", loiTai);
        f.TinMoi = muc == MucApp.TinNhan ? 0 : 2;
        DatCuaSo(f, new Size(UI.Px(1000), UI.Px(680)), laClient: true);
        f.Apply(s, DateTimeOffset.Now, kn ?? KetNoiView.Chon(true, s));
        f.ShowFront(muc);
        await Cho(1500);
        Chup(f, ten);
        f.Dispose();
    }

    private static async Task ManChan(string ten, string appId, string appName, string lyDo, bool doiDiem, bool matMang)
    {
        var f = new BlockedForm(appId, appName, lyDo, doiDiem, matMang);
        try
        {
            f.Show();
            await Cho(1200);
            Chup(f, ten);
        }
        finally { f.Dispose(); }
    }

    private static async Task ManKhoa(string ten, TrayState s)
    {
        var f = new LockForm(s.CanExchangePoints);
        f.WindowState = FormWindowState.Normal;   // phóng to theo «màn giả định», không theo màn runner
        DatCuaSo(f, _man, laClient: false);
        try
        {
            f.Show();          // đúng thứ tự TrayContext.HandleLock: Show rồi mới Apply
            f.Apply(s);
            await Cho(2200);   // chờ hiệu ứng ổ khoá «đóng sập»
            Chup(f, ten);
        }
        finally { f.CloseForReal(); f.Dispose(); }   // lỗi giữa chừng: màn khoá TopMost không được ở lại che các ảnh sau
    }

    private static async Task ManHop(string ten, Func<Form> tao)
    {
        var f = tao();
        f.StartPosition = FormStartPosition.Manual;
        f.Location = new Point(40, 40);
        try
        {
            f.Show();
            await Cho(1000);
            Chup(f, ten);
        }
        finally { f.Dispose(); }
    }

    private static async Task ManChoiBangDiem()
    {
        var s = TrangThai();
        var f = new ChoiBangDiemForm(s.PlayChoices);
        f.StartPosition = FormStartPosition.Manual;
        f.Location = new Point(40, 40);
        f.Show();
        await Cho(4000);   // HoiPhutAsync hỏi dịch vụ (không có ⇒ hết giờ 3 giây) — xong mới ghi số phút mẫu lên nút
        var nut = (List<Button>)Lay(f, "_nut")!;
        int[] phut = { 18, 18, 12 };
        for (int i = 0; i < nut.Count; i++)
            nut[i].Text = $"Chơi {TrayView.FriendlyAppName(s.PlayChoices[i], null)} · ≈ {phut[Math.Min(i, phut.Length - 1)]} phút";
        await Cho(300);
        Chup(f, "choi-bang-diem");
        f.Dispose();
    }

    private static async Task ManMenuKhay()
    {
        var ctx = new TrayContext();
        ((System.Windows.Forms.Timer)Lay(ctx, "_timer")!).Stop();
        ((System.Windows.Forms.Timer)Lay(ctx, "_hvTimer")!).Stop();
        ((ToolStripMenuItem)Lay(ctx, "_statusItem")!).Text = KetNoiView.Chon(true, TrangThai()).Dong;
        var ni = (NotifyIcon)Lay(ctx, "_ni")!;
        var menu = ni.ContextMenuStrip!;
        var wa = Screen.PrimaryScreen!.WorkingArea;
        menu.Show(new Point(wa.Right - 40, wa.Bottom - 10), ToolStripDropDownDirection.AboveLeft);
        await Cho(800);
        Chup(menu, "khay-menu");
        menu.Close();
        await Cho(3500);   // lượt hỏi dịch vụ đầu tiên của TrayContext hết giờ rồi mới huỷ
        ctx.Dispose();
    }

    private static async Task ManCai(string ten, Action<SetupForm> buoc)
    {
        var f = new SetupForm();
        f.StartPosition = FormStartPosition.Manual;
        f.Location = new Point(40, 40);
        try
        {
            f.Show();
            await Cho(300);
            buoc(f);
            await Cho(1000);
            Chup(f, ten);
        }
        finally { f.Dispose(); }
    }

    /// <summary>Bước «Cài»: máy chủ giả trên 127.0.0.1 nhận lời ghép nhưng chưa trả lời (chụp «Đang cài…»), rồi trả lỗi 410 «mã hết hạn» như máy chủ thật
    /// (server/lib/gia-dinh.ts) ⇒ Installer.RunAsync dừng ở bước ghép, TRƯỚC khi ghi cấu hình / hạ quyền / cài dịch vụ.</summary>
    private static async Task ManDangCai()
    {
        var nghe = new TcpListener(IPAddress.Loopback, 0);
        nghe.Start();
        try
        {
            var port = ((IPEndPoint)nghe.LocalEndpoint).Port;
            var ketNoi = nghe.AcceptTcpClientAsync();
            using var f = new SetupForm();   // lỗi / hết giờ chờ ⇒ cửa sổ «Đang cài…» TopMost không ở lại che ảnh sau
            f.StartPosition = FormStartPosition.Manual;
            f.Location = new Point(40, 40);
            f.Show();
            await Cho(300);
            var con = ConMau();
            DatTruong(f, "_child", con);
            Goi(f, "BuocCai", new InstallOptions { Server = $"http://127.0.0.1:{port}", Code = "482915", Child = con });
            await Cho(1500);
            Chup(f, "cai-5-dang-cai");

            var c = await ketNoi.WaitAsync(TimeSpan.FromSeconds(10));
            using (c)
            {
                var st = c.GetStream();
                var buf = new byte[16384];
                st.ReadTimeout = 500;
                try { while (st.Read(buf, 0, buf.Length) > 0 && c.Available > 0) { } } catch (IOException) { }
                var than = Encoding.UTF8.GetBytes("{\"error\":\"ma_het_han\",\"message\":\"Mã đã hết hạn — xin Ba Mẹ mã mới\"}");
                var dau = Encoding.ASCII.GetBytes($"HTTP/1.1 410 Gone\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {than.Length}\r\nConnection: close\r\n\r\n");
                st.Write(dau);
                st.Write(than);
                st.Flush();
                await Cho(1500);
            }
            Chup(f, "cai-5-loi-ghep");
        }
        finally { nghe.Stop(); }
    }

    // =========================================================== dữ liệu mẫu

    private static TrayState TrangThai(Action<TrayState>? sua = null)
    {
        var s = new TrayState
        {
            Paired = true, ChildName = "Minh Khôi", Mode = Modes.TuDo, MinutesLeft = 47.5, CanExchangePoints = true,
            LastSyncAt = DateTimeOffset.Now.AddMinutes(-1), CheDo = CheDoAgent.Chan,
            PlayChoices = new List<string> { "robloxplayerbeta.exe", "minecraft.exe", "youtube.com" },
        };
        sua?.Invoke(s);
        return s;
    }

    private static List<HvNhiemVu> NhiemVu() => new()
    {
        new() { Id = "nv1", Ten = "Đọc 20 trang «Dế Mèn phiêu lưu ký»", MoTa = "Đọc xong kể lại cho Ba Mẹ nghe nhân vật con thích nhất và vì sao.",
            Diem = 30, BangChung = "van_ban", TrangThai = "dang_lam", Luot = "l1", Han = DateTimeOffset.Now.AddHours(5), PhutToiThieu = 20 },
        new() { Id = "nv2", Ten = "Dọn góc học tập", MoTa = "Xếp sách vở gọn gàng, lau bàn, chụp một tấm ảnh gửi Ba Mẹ.",
            Diem = 15, BangChung = "anh", TrangThai = "san_sang", Han = DateTimeOffset.Now.AddDays(1) },
        new() { Id = "nv3", Ten = "Luyện 30 phút tiếng Anh trên Duolingo", Diem = 25, BangChung = "tu_dong", TrangThai = "san_sang", GiaoRieng = true },
        new() { Id = "nv4", Ten = "Tưới cây ngoài ban công", MoTa = "Tưới đủ năm chậu, nhớ tưới cả chậu hoa giấy ở góc.", Diem = 10, BangChung = "anh",
            TrangThai = "can_bo_sung", Luot = "l2", LyDo = "Ảnh hơi mờ, con chụp lại giúp Ba Mẹ nhé — chụp cả năm chậu cây." },
        new() { Id = "nv5", Ten = "Làm bài tập Toán trang 45–46", Diem = 20, BangChung = "anh", TrangThai = "du_hom_nay", DangCho = 1 },
    };

    private static HvTongQuan TongQuan() => new()
    {
        Con = new HvCon { Id = "con1", Ten = "Minh Khôi" },
        SoDu = 340, TongKiem = 1280, DiemChoDuyet = 20,
        CapDo = new HvCapDo { Cap = 3, DiemCapSau = 400, ConThieu = 60 },
        NhiemVu = NhiemVu(),
        Gan = new()
        {
            new() { Id = "g1", Ten = "Gấp quần áo", TrangThai = "duoc_duyet", Diem = 15, LoiKhen = "Gấp gọn lắm, cảm ơn con!", Luc = DateTimeOffset.Now.AddHours(-2) },
            new() { Id = "g2", Ten = "Rửa bát sau bữa tối", TrangThai = "cho_duyet", Luc = DateTimeOffset.Now.AddMinutes(-30) },
            new() { Id = "g3", Ten = "Đánh răng trước khi ngủ", TrangThai = "tu_choi", LyDo = "Ba Mẹ chưa thấy ảnh, con nộp lại tối nay nhé", Luc = DateTimeOffset.Now.AddDays(-1) },
        },
        LoiKhen = new()
        {
            new() { Id = "k1", NoiDung = "Hôm nay con đọc sách rất chăm, Ba Mẹ tự hào về con!", Luc = DateTimeOffset.Now.AddHours(-1) },
            new() { Id = "k2", NoiDung = "Cuối tuần này cả nhà mình đi công viên Tao Đàn nhé.", PhanHoi = "Con yêu Ba Mẹ", Luc = DateTimeOffset.Now.AddDays(-1) },
        },
        PhieuCho = new() { new() { Id = "p1", Ten = "Một buổi xem phim cùng Ba", Diem = 200 } },
    };

    private static HvCuaHang CuaHang() => new()
    {
        SoDu = 340,
        Qua = new()
        {
            new() { Id = "q1", Ten = "Thêm 30 phút chơi Minecraft", Diem = 120, Du = true },
            new() { Id = "q2", Ten = "Một cây kem ốc quế", Diem = 80, Du = true, ChiCuoiTuan = true },
            new() { Id = "q3", Ten = "Bộ LEGO Creator 3-in-1 «Ngôi nhà bên bờ biển» — quà sinh nhật lớn, tích dần nhé", Diem = 1500, Du = false, ConThieu = 1160 },
        },
    };

    private static HvTinDs Tin() => new()
    {
        Ds = new()
        {
            new() { Id = "t1", Loai = "nhiem_vu_moi", Tieu = "Nhiệm vụ mới: Dọn góc học tập", Noi = "Ba Mẹ vừa giao việc mới · +15 điểm", Luc = DateTimeOffset.Now.AddMinutes(-10) },
            new() { Id = "t2", Loai = "duyet_nhiem_vu", Tieu = "Ba Mẹ đã duyệt «Gấp quần áo»", Noi = "+15 điểm. Gấp gọn lắm, cảm ơn con!", Luc = DateTimeOffset.Now.AddHours(-2) },
            new() { Id = "t3", Loai = "can_bo_sung", Tieu = "Ba Mẹ nhờ bổ sung «Tưới cây ngoài ban công»", Noi = "Ảnh hơi mờ, con chụp lại giúp Ba Mẹ nhé — chụp cả năm chậu cây.", Luc = DateTimeOffset.Now.AddHours(-3) },
        },
    };

    private static string SidToi()
    {
        try { using var id = System.Security.Principal.WindowsIdentity.GetCurrent(); return id.User?.Value ?? "S-1-5-21-0-0-0-1000"; }
        catch { return "S-1-5-21-0-0-0-1000"; }
    }

    private static List<LocalAccount> TaiKhoanMau() => new()
    {
        new("BaMe", SidToi(), true),
        new("minhkhoi", "S-1-5-21-1111111111-2222222222-3333333333-1002", false),
        new("Khach", "S-1-5-21-1111111111-2222222222-3333333333-1003", false),
    };

    private static LocalAccount ConMau() => new("minhkhoi", "S-1-5-21-1111111111-2222222222-3333333333-1002", false);

    // =========================================================== chụp

    private static async Task Mot(string ten, Func<Task> lam)
    {
        try { await lam(); }
        catch (Exception e) { _loi++; Log($"LỖI {ten}: {e}"); }
    }

    private static Task Cho(int ms) => Task.Delay(ms);

    /// <summary>Đặt cửa sổ ở góc trái trên và cỡ theo «màn giả định» (cho phép to hơn màn runner — PrintWindow chụp cả phần ngoài màn).</summary>
    private static void DatCuaSo(Form f, Size co, bool laClient)
    {
        f.StartPosition = FormStartPosition.Manual;
        f.MaximumSize = new Size(10000, 10000);
        f.Location = Point.Empty;
        if (laClient) f.ClientSize = co; else f.Size = co;
    }

    /// <summary>Chụp đúng những gì Windows hiện trên màn (CopyFromScreen theo khung DWM, cửa sổ nổi trên cùng) khi cửa sổ nằm trọn trong màn;
    /// to hơn màn ⇒ PrintWindow(PW_RENDERFULLCONTENT) vào bitmap 24 bit. (PrintWindow vẽ sai nền đã nhớ của nút Clay — chỉ dùng khi bắt buộc.)</summary>
    private static void Chup(Control c, string ten)
    {
        // Không gọi Refresh/Invalidate: ảnh phải giống hệt lúc Con thấy (vẽ lại cưỡng bức làm đổi nền đã nhớ của nút Clay).
        if (c is Form f && !f.TopMost) { f.TopMost = true; }
        for (int i = 0; i < 6; i++) { Application.DoEvents(); Thread.Sleep(50); }
        var khung = KhungManHinh(c.Handle);
        var man = SystemInformation.VirtualScreen;
        Bitmap? bmp = null;
        var cach = "CopyFromScreen";
        try
        {
            if (man.Contains(khung))
            {
                bmp = new Bitmap(khung.Width, khung.Height, PixelFormat.Format24bppRgb);
                using var g = Graphics.FromImage(bmp);
                g.CopyFromScreen(khung.Location, Point.Empty, khung.Size);
            }
            else
            {
                cach = "PrintWindow (cửa sổ to hơn màn)";
                bmp = ChupPrintWindow(c.Handle);
            }
            if (bmp == null || DonSac(bmp))
            {
                bmp?.Dispose();
                cach = "DrawToBitmap";
                bmp = new Bitmap(Math.Max(1, c.Width), Math.Max(1, c.Height));
                c.DrawToBitmap(bmp, new Rectangle(Point.Empty, c.Size));
            }
            Luu(bmp, ten, cach);
        }
        finally { bmp?.Dispose(); }
    }

    /// <summary>Khung cửa sổ trên màn (toạ độ màn), bỏ viền trong suốt Windows 10/11.</summary>
    private static Rectangle KhungManHinh(IntPtr h)
    {
        if (DwmGetWindowAttribute(h, 9, out var e, Marshal.SizeOf<RECT>()) == 0 && e.Right > e.Left)
            return Rectangle.FromLTRB(e.Left, e.Top, e.Right, e.Bottom);
        GetWindowRect(h, out var w);
        return Rectangle.FromLTRB(w.Left, w.Top, w.Right, w.Bottom);
    }

    private static void Luu(Bitmap bmp, string ten, string cach)
    {
        var duong = Path.Combine(_ra, ten + ".png");
        bmp.Save(duong, ImageFormat.Png);
        var trang = DonSac(bmp);
        var den = TiLeDen(bmp);
        // Nền Clay vẽ hỏng (bitmap nền chưa khởi tạo) ra KHỐI ĐEN THUẦN quanh nút — giao diện AiiGrow không có màu đen thuần (chữ đậm nhất #0f1312).
        var khoiDen = den > NguongDen;
        if (trang || khoiDen) _loi++;
        Log($"{(trang ? "LỖI ảnh một màu" : khoiDen ? $"LỖI khối đen {den:P1}" : "ok")} {ten}.png {bmp.Width}x{bmp.Height} ({cach}) đen {den:P2}");
    }

    /// <summary>Ngưỡng tỉ lệ điểm ảnh đen thuần (R,G,B ≤ 8) — quá ngưỡng là có khối đen (nền nút / thẻ vẽ hỏng).</summary>
    private const double NguongDen = 0.005;

    /// <summary>Tỉ lệ điểm ảnh đen thuần, lấy mẫu mỗi 3 px (bỏ 1 px viền cửa sổ).</summary>
    private static double TiLeDen(Bitmap b)
    {
        long n = 0, den = 0;
        for (int y = 1; y < b.Height - 1; y += 3)
            for (int x = 1; x < b.Width - 1; x += 3)
            {
                var c = b.GetPixel(x, y);
                n++;
                if (c.R <= 8 && c.G <= 8 && c.B <= 8) den++;
            }
        return n == 0 ? 0 : (double)den / n;
    }

    /// <summary>Ảnh gần như một màu (trắng/đen/vỡ) — lấy mẫu lưới 24×24.</summary>
    private static bool DonSac(Bitmap b)
    {
        var mau = new HashSet<int>();
        for (int y = 0; y < 24; y++)
            for (int x = 0; x < 24; x++)
                mau.Add(b.GetPixel(Math.Min(b.Width - 1, x * b.Width / 24 + 1), Math.Min(b.Height - 1, y * b.Height / 24 + 1)).ToArgb());
        return mau.Count < 3;
    }

    [StructLayout(LayoutKind.Sequential)] private struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] private static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);
    [DllImport("user32.dll")] private static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] private static extern int ReleaseDC(IntPtr h, IntPtr dc);
    [DllImport("gdi32.dll")] private static extern int GetDeviceCaps(IntPtr dc, int i);

    private static string DpiHeThong()
    {
        var dc = GetDC(IntPtr.Zero);
        try { return GetDeviceCaps(dc, 88).ToString(CultureInfo.InvariantCulture); }   // LOGPIXELSX
        finally { ReleaseDC(IntPtr.Zero, dc); }
    }

    /// <summary>PrintWindow(PW_RENDERFULLCONTENT) cả cửa sổ (kể cả phần nằm ngoài màn), cắt bỏ viền trong suốt Windows 10/11 theo DWMWA_EXTENDED_FRAME_BOUNDS.</summary>
    private static Bitmap? ChupPrintWindow(IntPtr h)
    {
        if (!GetWindowRect(h, out var w)) return null;
        int rw = w.Right - w.Left, rh = w.Bottom - w.Top;
        if (rw < 4 || rh < 4) return null;
        using var full = new Bitmap(rw, rh, PixelFormat.Format24bppRgb);
        using (var g = Graphics.FromImage(full))
        {
            var dc = g.GetHdc();
            try { if (!PrintWindow(h, dc, 2)) return null; }
            finally { g.ReleaseHdc(dc); }
        }
        var cat = new Rectangle(0, 0, rw, rh);
        if (DwmGetWindowAttribute(h, 9, out var e, Marshal.SizeOf<RECT>()) == 0)
        {
            var r = Rectangle.FromLTRB(e.Left - w.Left, e.Top - w.Top, e.Right - w.Left, e.Bottom - w.Top);
            r.Intersect(cat);
            if (r.Width > 4 && r.Height > 4) cat = r;
        }
        return full.Clone(cat, PixelFormat.Format24bppRgb);
    }

    // =========================================================== phản chiếu (trường / bước riêng của Form)

    private static object? Lay(object o, string ten) => TimTruong(o.GetType(), ten).GetValue(o);

    private static void DatTruong(object o, string ten, object? v) => TimTruong(o.GetType(), ten).SetValue(o, v);

    private static FieldInfo TimTruong(Type t, string ten)
        => t.GetField(ten, Moi) ?? throw new MissingFieldException(t.Name, ten);

    private static object? Goi(object o, string ten, params object?[] a)
    {
        var m = o.GetType().GetMethods(Moi).FirstOrDefault(x => x.Name == ten && x.GetParameters().Length == a.Length)
                ?? throw new MissingMethodException(o.GetType().Name, ten);
        return m.Invoke(o, a);
    }

    private static IEnumerable<Control> TatCa(Control goc)
    {
        foreach (Control c in goc.Controls)
        {
            yield return c;
            foreach (var con in TatCa(c)) yield return con;
        }
    }

    private static void Log(string m)
    {
        var dong = $"[{DateTime.Now:HH:mm:ss}] {m}";
        Console.WriteLine(dong);
        try { _log.WriteLine(dong); } catch { }
        Debug.WriteLine(dong);
    }
}
