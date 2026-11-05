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
        await Mot("app-qua-cua-con", () => ManApp("app-qua-cua-con", MucApp.PhanQua, TrangThai(), true, quaCuaCon: true));
        await Mot("app-tin-nhan", () => ManApp("app-tin-nhan", MucApp.TinNhan, TrangThai(), true));
        await Mot("app-nhiem-vu-loi-tai", () => ManApp("app-nhiem-vu-loi-tai", MucApp.NhiemVu, TrangThai(), false,
            loiTai: "Không kết nối được máy chủ. Con kiểm tra Wi-Fi rồi bấm Thử lại nhé."));

        // Thiết kế chốt 05/11 (docs/thiet-ke-chot/con-bi-chan, con-mat-mang 12/14): app Ba Mẹ chặn → nút xin; app lạ → tự gửi → chờ → kết quả.
        await Mot("chan-app", () => ManChan("chan-app", "youtube.exe", "YouTube", null));
        await Mot("chan-da-gui", () => ManChan("chan-da-gui", "capcut.exe", "CapCut", "DaGui", tuGui: true));
        await Mot("chan-ba-me-cho", () => ManChan("chan-ba-me-cho", "capcut.exe", "CapCut", "Duoc"));
        await Mot("chan-ba-me-chua-cho", () => ManChan("chan-ba-me-chua-cho", "capcut.exe", "CapCut", "ChuaCho"));
        await Mot("chan-web-cam", () => ManChan("chan-web-cam", "y8-casino.com", "y8-casino.com", "WebCam", web: true));
        await Mot("chan-web-da-gui", () => ManChan("chan-web-da-gui", "y8.com", "y8.com", "DaGui", web: true));
        await Mot("chan-app-mat-mang", () => ManChan("chan-app-mat-mang", "capcut.exe", "CapCut", "MatMang"));
        await Mot("chan-da-luu-cho-mang", () => ManChan("chan-da-luu-cho-mang", "capcut.exe", "CapCut", "DaLuu"));

        await Mot("khoa-het-gio-dem-nguoc", () => ManKhoa("khoa-het-gio-dem-nguoc", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.HetGio; s.MinutesLeft = 0; s.LockGraceLeftSec = 45; })));
        await Mot("khoa-gio-ngu", () => ManKhoa("khoa-gio-ngu", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.Ngu; })));
        await Mot("khoa-ba-me-khoa", () => ManKhoa("khoa-ba-me-khoa", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.Khoa; })));
        await Mot("khoa-mat-mang", () => ManKhoa("khoa-mat-mang", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.HetGio; s.Offline = true; s.MinutesLeft = 0; })));
        await Mot("khoa-het-gio", () => ManKhoa("khoa-het-gio", TrangThai(s => { s.Locked = true; s.LockReason = LockReasons.HetGio; s.MinutesLeft = 0; s.LockGraceLeftSec = null; })));   // 0 ⇒ màn gọi LockWorkStation, khoá luôn máy chụp
        await Mot("ngoai-le-xin", () => ManHop("ngoai-le-xin", () => new NgoaiLeForm(TrangThai().AppDuocPhep)));
        await Mot("ngoai-le-cho", () => ManHop("ngoai-le-cho", () => { var f = new NgoaiLeForm(TrangThai().AppDuocPhep); DatTruong(f, "_lyDoGui", "Con chưa xong bài"); Goi(f, "VeCho"); return f; }));
        await Mot("ngoai-le-duoc", () => ManHop("ngoai-le-duoc", () => { var f = new NgoaiLeForm(TrangThai().AppDuocPhep); Goi(f, "VeDuoc"); return f; }));
        await Mot("ngoai-le-chua-cho", () => ManHop("ngoai-le-chua-cho", () => { var f = new NgoaiLeForm(TrangThai().AppDuocPhep); Goi(f, "VeChuaCho"); return f; }));
        await Mot("nhac-5-phut", () => ManHop("nhac-5-phut", () => new NhacGioForm(30, true)));
        await Mot("hoi-aiigrow", () => ManHop("hoi-aiigrow", () => new HoiAiiGrowForm()));
        await Mot("cap-nhat-khay-co-ban-moi", () => ManHop("cap-nhat-khay-co-ban-moi", () => { var f = new CapNhatKhayForm(kiemNgay: false); DatXong(f, "VeCoBanMoi", "0.2.10"); return f; }));
        await Mot("cap-nhat-khay-moi-nhat", () => ManHop("cap-nhat-khay-moi-nhat", () => { var f = new CapNhatKhayForm(kiemNgay: false); DatXong(f, "VeMoiNhat", "0.2.10"); return f; }));

        // Hộp «Thêm giờ chơi» (con-xin 02–08, 22–27): dựng thẳng từng bước bằng dữ liệu mẫu (không gọi dịch vụ)
        await Mot("them-gio-xin", () => ManHop("them-gio-xin", () => HopThemGio(false, f => ((TextBox)Lay(f, "_note")!).Text = "Con làm nốt bài với bạn ạ")));
        await Mot("them-gio-da-gui", () => ManHop("them-gio-da-gui", () => HopThemGio(false, f => { DatTruong(f, "_phutDaXin", 20); Goi(f, "Xoa"); Goi(f, "VeDaGui"); })));
        await Mot("them-gio-ba-me-cho", () => ManHop("them-gio-ba-me-cho", () => HopThemGio(false, f => { DatTruong(f, "_phutDaXin", 20); Goi(f, "VeDuoc"); })));
        await Mot("them-gio-chua-cho", () => ManHop("them-gio-chua-cho", () => HopThemGio(false, f => Goi(f, "VeChuaCho"))));
        await Mot("them-gio-dung-sao", () => ManHop("them-gio-dung-sao", () => HopThemGio(true, null)));
        await Mot("them-gio-chua-du-sao", () => ManHop("them-gio-chua-du-sao", () => HopThemGio(true, f => { DatTruong(f, "_phutDoi", 40); Goi(f, "VeChuaDuSao", 40); })));
        // Nộp bài (con-ngay-thuong 05 / 07 / 14)
        await Mot("nop-anh", () => ManHop("nop-anh", () => new NopBaiForm(NhiemVuMoi()[3])));
        await Mot("nop-ghi-am", () => ManHop("nop-ghi-am", () => new NopBaiForm(NhiemVuMoi()[1])));
        await Mot("nop-viet", () => ManHop("nop-viet", () =>
        {
            var f = new NopBaiForm(NhiemVuMoi()[1]);
            DatTruong(f, "_theViet", true);
            Goi(f, "Ve");
            ((TextBox)Lay(f, "_note")!).Text = "Con thích nhất Dế Mèn vì bạn ấy dũng cảm";
            return f;
        }));
        await Mot("nop-da-nop", () => ManHop("nop-da-nop", () => { var f = new NopBaiForm(NhiemVuMoi()[3]); Goi(f, "VeDaNop", new HvNopKq { TrangThai = "cho_duyet" }); return f; }));
        // Màn kết quả Ba Mẹ trả lời (con-ngay-thuong 09 / 11 / 26) + đổi quà (30 → 28) + Ba Mẹ dùng máy (18)
        await Mot("ket-qua-duyet", () => ManHop("ket-qua-duyet", () => new KetQuaHop("Nhiệm vụ").Dau("phao_hoa", KhoiCon.Mau.Vang, "Ba Mẹ duyệt rồi!", "Dọn phòng")
            .Chip("+10 sao", true, "30 → 40 sao").Loi("Ba Mẹ", "Phòng gọn quá, giỏi lắm con!").Nut("Xem sao & đổi quà", true, "sao", null).Nut("Làm việc tiếp theo", false, "tick", null)));
        await Mot("ket-qua-lam-lai", () => ManHop("ket-qua-lam-lai", () => new KetQuaHop("Nhiệm vụ").Dau("tro_lai", KhoiCon.Mau.Cam, "Ba Mẹ nhờ con làm lại", "Đọc sách 20 phút")
            .Loi("Ba Mẹ", "Con đọc to hơn chút nhé, Mẹ nghe chưa rõ.").Chip("+10 sao", true, "Chưa cộng sao · ghi lại để nhận").Nut("Ghi âm lại cho Ba Mẹ", true, "tai", null).LienKet("Để sau", null, null)));
        await Mot("ket-qua-trao-qua", () => ManHop("ket-qua-trao-qua", () => new KetQuaHop("Quà").Dau("qua", KhoiCon.Mau.Vang, "Ba Mẹ đã trao quà!", "Thêm 30 phút chơi")
            .Chip("+30 phút", false, "18 phút → 48 phút").Dong("Còn 0 sao · làm nhiệm vụ để có thêm", false, AiiGrow.ClayUi.Clay.DiemInk).Nut("Chơi tiếp", true, "game", null).LienKet("Xem quà của con", "qua", null)));
        await Mot("doi-qua", () => ManHop("doi-qua", () => new DoiQuaHop(CuaHang().Qua[1], 30)));
        await Mot("ba-me-dung-may", () => ManHop("ba-me-dung-may", () => new BaMeDungMayHop()));

        await Mot("khay-menu", ManMenuKhay);
        // Bóng báo khay («Còn 5 phút»…): runner Windows Server không hiện thông báo (đã thử, ảnh chỉ có màn nền) ⇒ không chụp được ở đây.

        // Bộ cài theo thiết kế chốt 05/11 (docs/thiet-ke-chot/con-cai-win): mỗi màn gọi thẳng hàm dựng màn (không đụng máy thật).
        await Mot("cai-1-chao", () => ManCai("cai-1-chao", _ => { }));
        await Mot("cai-2-dieu-khoan", () => ManCai("cai-2-dieu-khoan", f =>
        {
            Goi(f, "BuocDieuKhoan");
            foreach (var c in TatCa(f).OfType<CheckBox>()) c.Checked = true;
        }));
        await Mot("cai-3-chon-tai-khoan", () => ManCai("cai-3-chon-tai-khoan", f =>
        {
            DatTruong(f, "_accounts", TaiKhoanMau());
            DatTruong(f, "_child", ConMau());
            Goi(f, "HienTaiKhoan", 1);
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
            TatCa(f).OfType<TextBox>().First().Text = "482915";   // ô đầu nhận 6 số ⇒ tự dàn đủ 6 ô
        }));
        await Mot("cai-4-ma-ghep-thieu-so", () => ManCai("cai-4-ma-ghep-thieu-so", f =>
        {
            DatTruong(f, "_child", ConMau());
            Goi(f, "BuocGhep");
            TatCa(f).OfType<TextBox>().First().Text = "48291";
            TatCa(f).OfType<Button>().First(b => b.Text == "Ghép vào nhà").PerformClick();
        }));
        await Mot("cai-4-ma-sai-may-chu", () => ManCai("cai-4-ma-sai-may-chu", f =>
        {
            DatTruong(f, "_child", ConMau());
            Goi(f, "ManMaSai", new InstallOptions { Server = "http://127.0.0.1:9", Code = "482916", Child = ConMau() });
        }));
        await Mot("cai-4-link-tu-ghep", () => ManCai("cai-4-link-tu-ghep", f =>
        {
            DatTruong(f, "_child", ConMau());
            Goi(f, "BuocGhep");
        }, () => new SetupForm(new EnrollmentPackage { Server = "http://127.0.0.1:9", Token = "goi-mau" })));
        await Mot("cai-5-dang-cai", ManDangCai);
        await Mot("cai-5-mat-mang", () => ManCai("cai-5-mat-mang", f =>
            Goi(f, "ManMatMang", new InstallOptions
            {
                Server = "http://127.0.0.1:9", Code = "482915", Child = ConMau(),
                Pair = new PairResult { DeviceId = "may1", Token = "t", ChildName = "Minh Khôi" },
            })));
        await Mot("cai-6-xong", () => ManCai("cai-6-xong", f => Goi(f, "BuocXong", ConMau(), "Minh Khôi")));
        await Mot("cap-nhat", () => ManHop("cap-nhat", () => new CapNhatForm(new PhatHienCai(CheDoBoCai.CapNhat, new Version(0, 2, 9), new Version(0, 2, 10)))));
        await Mot("cap-nhat-da-moi-nhat", () => ManHop("cap-nhat-da-moi-nhat", () => new CapNhatForm(new PhatHienCai(CheDoBoCai.DaMoiNhat, new Version(0, 2, 10), new Version(0, 2, 10)))));
    }

    // =========================================================== các màn

    private static async Task ManApp(string ten, MucApp muc, TrayState s, bool coDuLieu, KetNoiInfo? kn = null, string? loiTai = null, bool quaCuaCon = false)
    {
        var f = new AppForm();
        DatTruong(f, "_busy", true);   // chặn RefreshAsync (gọi dịch vụ qua named pipe) — dữ liệu mẫu đặt thẳng vào trường
        if (coDuLieu)
        {
            DatTruong(f, "_tq", TongQuan());
            DatTruong(f, "_ch", CuaHang());
            DatTruong(f, "_tin", Tin());
            DatTruong(f, "_tuCham", new List<HvNvDong> { new() { Id = "t9", Ten = "Học 1 bài với AiiRob", Diem = 20, Sao = 20, TuCham = true, Bo = "tu_lap" } });
            DatTruong(f, "_viQua", new HvViQua { DaTrao = new() { new() { Id = "r1", Ten = "Xem phim cả nhà", Diem = 40, XuLyLuc = DateTimeOffset.Now.AddDays(-10) } } });
        }
        if (quaCuaCon) DatTruong(f, "_xemQuaCuaCon", true);
        DatTruong(f, "_loiTai", loiTai);
        f.TinMoi = muc == MucApp.TinNhan ? 0 : 2;
        DatCuaSo(f, new Size(UI.Px(1000), UI.Px(680)), laClient: true);
        f.Apply(s, DateTimeOffset.Now, kn ?? KetNoiView.Chon(true, s));
        f.ShowFront(muc);
        await Cho(1500);
        Chup(f, ten);
        f.Dispose();
    }

    /// <summary>Hộp chặn ở một bước (tên enum BlockedForm.Buoc; null = bước đầu của app Ba Mẹ chặn). Không gửi gì: dựng thẳng bước bằng phản chiếu.</summary>
    private static async Task ManChan(string ten, string appId, string appName, string? buoc, bool tuGui = false, bool web = false)
    {
        var f = new BlockedForm(appId, appName, boiBaMe: true, offline: buoc == "MatMang", TrangThai().AppDuocPhep, web);
        if (tuGui) DatTruong(f, "_tuGui", true);
        DatTruong(f, "_choMang", 2);
        if (buoc != null && buoc != "MatMang")
        {
            var kieu = typeof(BlockedForm).GetNestedType("Buoc", Moi)!;
            Goi(f, "Ve", Enum.Parse(kieu, buoc));
        }
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
        var f = new LockForm();
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

    /// <summary>Hộp cập nhật: bỏ lượt hỏi dịch vụ (không có ở máy chụp), dựng thẳng một bước.</summary>
    private static void DatXong(Form f, string buoc, string ban)
    {
        Goi(f, "XoaHet");
        Goi(f, buoc, ban);
        Goi(f, "Xong");
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

    /// <summary>Hộp «Thêm giờ chơi» với dữ liệu mẫu (30 sao, còn 18 phút) — không chờ lượt tải từ dịch vụ.</summary>
    private static RequestForm HopThemGio(bool dungSao, Action<RequestForm>? buoc)
    {
        var f = new RequestForm(true, dungSao: dungSao);
        DatTruong(f, "_quy", QuyMau());
        DatTruong(f, "_sao", 30);
        Goi(f, "VeTab");
        buoc?.Invoke(f);
        return f;
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

    private static async Task ManCai(string ten, Action<SetupForm> buoc, Func<SetupForm>? tao = null)
    {
        var f = tao?.Invoke() ?? new SetupForm();
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

    /// <summary>Bước «Cài»: máy chủ giả trên 127.0.0.1 nhận lời ghép nhưng chưa trả lời (chụp «Đang cài…»), rồi trả lỗi 410 «mã hết hạn» như máy chủ thật (màn «Mã ghép đã hết hạn»)
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
            Chup(f, "cai-5-ma-het-han");   // 410 ma_het_han ⇒ màn «Mã ghép đã hết hạn»
        }
        finally { nghe.Stop(); }
    }

    // =========================================================== dữ liệu mẫu

    private static TrayState TrangThai(Action<TrayState>? sua = null)
    {
        var s = new TrayState
        {
            Paired = true, ChildName = "Bảo Anh", Mode = Modes.Hoc, CanExchangePoints = true,
            QuyConPhut = 18, QuyTongPhut = 60, QuyDaDung = 42, NguLuc = "21:30",
            DungTheoApp = new List<DungApp> { new() { AppId = "robloxplayerbeta.exe", Ten = "Roblox", Phut = 30 }, new() { AppId = "youtubekids.exe", Ten = "YouTube Kids", Phut = 12 }, new() { AppId = "tudien.exe", Ten = "Từ điển", Phut = 8 } },
            LastSyncAt = DateTimeOffset.Now.AddMinutes(-1), CheDo = CheDoAgent.Chan,
            PlayChoices = new List<string> { "robloxplayerbeta.exe", "minecraft.exe", "youtube.com" },
            // thiết kế chốt 05/11: con mẫu có 30 sao, quỹ 60 phút, ngủ 21:30 → mở lại 6:30, 4 app được phép
            Sao = 30, QuyPhut = 60, MoLaiLuc = "6:30",
            AppDuocPhep = new List<string> { "hocvoiairob.exe", "tudien.exe", "robloxplayerbeta.exe", "youtubekids.exe" },
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

    /// <summary>Nhiệm vụ bộ Tự lập của thiết kế chốt (con-ngay-thuong 03).</summary>
    private static List<HvNhiemVu> NhiemVuMoi() => new()
    {
        new() { Id = "a1", Ten = "Dọn phòng", MoTa = "Chụp cả căn phòng cho Ba Mẹ xem", Diem = 10, Sao = 10, BangChung = "anh", TrangThai = "du_hom_nay", DangCho = 1, Hinh = "choi", Bo = "tu_lap" },
        new() { Id = "a2", Ten = "Đọc sách 20 phút", MoTa = "Đọc to cho Ba Mẹ nghe nhé", Diem = 10, Sao = 10, BangChung = "ghi_am", TrangThai = "dang_lam", Luot = "l2", Hinh = "sach", Bo = "tu_lap" },
        new() { Id = "a3", Ten = "Tự đánh răng", Diem = 10, Sao = 10, BangChung = "xong", TrangThai = "san_sang", LapLai = "hang_ngay", Hinh = "ban_chai", Bo = "tu_lap" },
        new() { Id = "a4", Ten = "Tự xếp cặp", MoTa = "Chụp cặp sách đã soạn", Diem = 10, Sao = 10, BangChung = "anh", TrangThai = "dang_lam", Luot = "l4", GioNhac = "21:00", Hinh = "cap", Bo = "tu_lap" },
        new() { Id = "a5", Ten = "Tưới cây", Diem = 10, Sao = 10, BangChung = "anh", TrangThai = "can_bo_sung", Luot = "l5", LamLai = true, LoiNhan = "Ảnh hơi tối, con chụp lại giúp Mẹ nhé", Hinh = "cay", Bo = "tu_lap" },
    };

    private static HvQuy QuyMau() => new()
    {
        ConPhut = 18, DaDung = 42, TongPhut = 60, QuyNgayPhut = 60, GioNgu = new KhungGio { Tu = "21:30", Den = "06:30" },
        DoiSao = new HvDoiSaoCau { Bat = true, ToiDaNgay = 30, ConDoiDuoc = 30 },
    };

    private static HvTongQuan TongQuan() => new()
    {
        Con = new HvCon { Id = "con1", Ten = "Bảo Anh" },
        SoDu = 30, Sao = 30, SaoChoDuyet = 20, TongKiem = 1280, DiemChoDuyet = 20, Quy = QuyMau(),
        CapDo = new HvCapDo { Cap = 3, DiemCapSau = 400, ConThieu = 60 },
        NhiemVu = NhiemVuMoi(),
        Gan = new()
        {
            new() { Id = "g0", Ten = "Dọn phòng", TrangThai = "cho_duyet", Luc = DateTimeOffset.Now.AddMinutes(-50) },
            new() { Id = "g1", Ten = "Gấp quần áo", TrangThai = "duoc_duyet", Diem = 15, LoiKhen = "Gấp gọn lắm, cảm ơn con!", Luc = DateTimeOffset.Now.AddHours(-2) },
            new() { Id = "g2", Ten = "Rửa bát sau bữa tối", TrangThai = "cho_duyet", Luc = DateTimeOffset.Now.AddMinutes(-30) },
            new() { Id = "g3", Ten = "Đánh răng trước khi ngủ", TrangThai = "tu_choi", LyDo = "Ba Mẹ chưa thấy ảnh, con nộp lại tối nay nhé", Luc = DateTimeOffset.Now.AddDays(-1) },
        },
        LoiKhen = new()
        {
            new() { Id = "k1", NoiDung = "Phòng con gọn ghê! Mẹ xem ảnh rồi nhé.", Luc = DateTimeOffset.Now.AddMinutes(-45) },
            new() { Id = "k2", NoiDung = "Cuối tuần này cả nhà mình đi công viên Tao Đàn nhé.", PhanHoi = "Con yêu Ba Mẹ", Luc = DateTimeOffset.Now.AddDays(-1) },
        },
        PhieuCho = new() { new() { Id = "p1", Ten = "Đi ăn kem", Diem = 50, Luc = DateTimeOffset.Now.AddDays(-1) } },
    };

    private static HvCuaHang CuaHang() => new()
    {
        SoDu = 30, Sao = 30,
        Qua = new()
        {
            new() { Id = "q1", Ten = "Đi ăn kem", Diem = 50, ChoTraoTu = DateTimeOffset.Now.AddDays(-1) },
            new() { Id = "q2", Ten = "Thêm 30 phút chơi", Loai = "phut", Phut = 30, Diem = 30, Du = true },
            new() { Id = "q3", Ten = "Xem phim cả nhà", Diem = 40, ConThieu = 10 },
            new() { Id = "q4", Ten = "Đồ chơi nhỏ", Diem = 100, ConThieu = 70 },
        },
    };

    private static HvTinDs Tin() => new()
    {
        Ds = new()
        {
            new() { Id = "t1", Loai = "nhiem_vu_moi", Tieu = "Nhiệm vụ mới: Dọn góc học tập", Noi = "«Dọn góc học tập» · 15 sao", Luc = DateTimeOffset.Now.AddMinutes(-10) },
            new() { Id = "t2", Loai = "duyet_nhiem_vu", Tieu = "Ba Mẹ đã duyệt «Gấp quần áo»", Noi = "«Gấp quần áo» · +15 sao", Luc = DateTimeOffset.Now.AddHours(-2) },
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
