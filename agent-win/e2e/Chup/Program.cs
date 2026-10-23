using System.Drawing.Imaging;
using System.Reflection;
using AiiGrow.Core;

namespace AiiGrow.Chup;

/// <summary>Chạy TrayContext THẬT của AiiGrow.Tray trong tiến trình này (nói chuyện với dịch vụ AiiGrow đã cài qua named pipe) rồi chụp từng cửa sổ.</summary>
internal static class Program
{
    private static string _out = ".";
    private static int _n;
    private static Assembly _tray = null!;
    private const BindingFlags All = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;

    [STAThread]
    private static int Main(string[] args)
    {
        _out = args.Length > 0 ? args[0] : ".";
        _n = args.Length > 1 && int.TryParse(args[1], out var s) ? s : 20;
        Directory.CreateDirectory(_out);
        ApplicationConfiguration.Initialize();
        _tray = Assembly.Load("AiiGrow.Tray");
        var ctx = (ApplicationContext)Activator.CreateInstance(_tray.GetType("AiiGrow.Tray.TrayContext", true)!)!;
        var t = new System.Windows.Forms.Timer { Interval = 200 };
        t.Tick += async (_, _) =>
        {
            t.Stop();
            try { await Kich(ctx); }
            catch (Exception e) { File.AppendAllText(Path.Combine(_out, "loi.txt"), e + Environment.NewLine); }
            Application.Exit();
        };
        t.Start();
        Application.Run(ctx);
        return 0;
    }

    private static object Field(object o, string ten) => o.GetType().GetField(ten, All)!.GetValue(o)!;
    private static Task Cho(int ms) => Task.Delay(ms);

    private static void Chup(string ten, Rectangle? vung = null)
    {
        try
        {
            var man = SystemInformation.VirtualScreen;
            var r = vung ?? man;
            r.Intersect(man);
            if (r.Width < 10 || r.Height < 10) return;
            using var bmp = new Bitmap(r.Width, r.Height);
            using (var g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            bmp.Save(Path.Combine(_out, $"{_n++:00}-{ten}.png"), ImageFormat.Png);
        }
        catch (Exception e) { File.AppendAllText(Path.Combine(_out, "loi.txt"), $"chụp {ten}: {e.Message}{Environment.NewLine}"); }
    }

    private static async Task Hien(string ten, Form f, int cho = 1500, bool toanMan = false)
    {
        f.Show();
        f.Activate();
        await Cho(cho);
        Chup(ten, toanMan ? null : f.Bounds);
    }

    private static IEnumerable<Button> Nut(Control c)
    {
        foreach (Control x in c.Controls)
        {
            if (x is Button b) yield return b;
            foreach (var y in Nut(x)) yield return y;
        }
    }

    private static object Tao(string kieu, params object?[] ts) => Activator.CreateInstance(_tray.GetType("AiiGrow.Tray." + kieu, true)!, ts)!;

    private static async Task Kich(object ctx)
    {
        var man = Screen.PrimaryScreen!.Bounds;
        File.WriteAllText(Path.Combine(_out, "man-hinh.txt"), $"{man.Width}x{man.Height} dpi={new Bitmap(1, 1).HorizontalResolution}");

        // 1) Bóng báo đầu tiên của khay («AiiGrow đang bật») + thanh tác vụ
        await Cho(4000);
        Chup("khay-bong-bao-dang-bat");
        await Cho(2500);

        // 2) Menu chuột phải của biểu tượng khay (đúng ContextMenuStrip của NotifyIcon)
        var ni = (NotifyIcon)Field(ctx, "_ni");
        var menu = ni.ContextMenuStrip!;
        menu.Show(new Point(man.Right - 20 - 300, man.Bottom - 60 - 230));
        await Cho(900);
        Chup("khay-menu", Rectangle.Inflate(menu.Bounds, 12, 12));
        menu.Close();
        await Cho(300);

        // 3) Cửa sổ app to: bốn mục (OpenApp thật)
        var open = ctx.GetType().GetMethod("OpenApp", All)!;
        foreach (var (muc, ten) in new[] { (MucApp.HomNay, "app-hom-nay"), (MucApp.NhiemVu, "app-nhiem-vu"), (MucApp.PhanQua, "app-phan-qua-diem"), (MucApp.TinNhan, "app-tin-nhan") })
        {
            open.Invoke(ctx, new object[] { muc, false });
            await Cho(6000);
            var app = (Form)Field(ctx, "_app");
            Chup(ten, app.Bounds);
        }
        // 3b) App to ở các trạng thái khác (TrayState do harness đặt: runner không có phiên Con để dịch vụ tự tạo ra), dừng hai đồng hồ của khay để không bị ghi đè
        ((System.Windows.Forms.Timer)Field(ctx, "_timer")).Stop();
        ((System.Windows.Forms.Timer)Field(ctx, "_hvTimer")).Stop();
        {
            var app = (Form)Field(ctx, "_app");
            var apply = app.GetType().GetMethod("Apply")!;
            var now = DateTimeOffset.Now;
            var cac = new (string Ten, TrayState St, bool DichVu)[]
            {
                ("app-con-25-phut-che-do-hoc", new TrayState { Paired = true, ChildName = "Bin", Mode = Modes.Hoc, MinutesLeft = 25, LastSyncAt = now, CanExchangePoints = true }, true),
                ("app-ba-me-them-gio-30-phut", new TrayState { Paired = true, ChildName = "Bin", Mode = Modes.TuDo, GrantEndsAt = now.AddMinutes(30), LastSyncAt = now, CanExchangePoints = true }, true),
                ("app-mat-ket-noi-may-chu", new TrayState { Paired = true, ChildName = "Bin", Mode = Modes.TuDo, Offline = true, OfflineSince = now.AddMinutes(-12), LastSyncAt = now.AddMinutes(-12) }, true),
                ("app-may-chua-ghep", new TrayState { Paired = false, ChildName = "Bin" }, true),
                ("app-dich-vu-khong-chay", new TrayState(), false),
            };
            foreach (var (ten, st, dv) in cac)
            {
                app.GetType().GetMethod("ShowFront")!.Invoke(app, new object?[] { MucApp.HomNay });
                await Cho(2500);
                apply.Invoke(app, new object?[] { st, DateTimeOffset.Now, KetNoiView.Chon(dv, dv ? st : null) });
                await Cho(1500);
                Chup(ten, app.Bounds);
            }
            app.Hide();
        }
        // 3c) Bóng báo của khay (Toast thật)
        var toast = ctx.GetType().GetMethod("Toast", All)!;
        foreach (var (tieu, noi, ten) in new[]
                 {
                     ("Còn 5 phút", "Lưu bài đang làm nhé. Cần thêm giờ thì bấm Xin thêm thời gian.", "bong-bao-con-5-phut"),
                     ("Còn 1 phút", "Máy sắp khoá. Lưu bài ngay nhé.", "bong-bao-con-1-phut"),
                     ("Nhiệm vụ mới", "Ba Mẹ vừa giao thêm một việc cho Con. Nhấn vào đây để xem.", "bong-bao-nhiem-vu-moi"),
                 })
        {
            toast.Invoke(ctx, new object[] { 8000, tieu, noi, ToolTipIcon.Info, MucApp.HomNay });
            await Cho(3000);
            Chup(ten);
            await Cho(1500);
        }

        // 4) Màn chặn «Dùng điểm để chơi» (BlockedForm) — vài lý do
        foreach (var (appId, app, lyDo, doi, ten) in new[]
                 {
                     ("roblox", "Roblox", LockReasons.ChuaPhanLoai, true, "chan-chua-phan-loai-dung-diem"),
                     ("roblox", "Roblox", LockReasons.HetGio, true, "chan-het-gio-dung-diem"),
                     ("roblox", "Roblox", LockReasons.HetDiem, true, "chan-het-diem"),
                     ("chrome", "Google Chrome", LockReasons.Ngu, false, "chan-gio-ngu-khong-doi-diem"),
                 })
        {
            var f = (Form)Tao("BlockedForm", appId, app, lyDo, doi, false);
            await Hien(ten, f);
            f.Close();
        }
        // bấm thật «Dùng điểm để chơi» ở màn chặn: dịch vụ trả lời thật (harness không phải khay đã cài nên bị từ chối — chụp câu trả lời)
        {
            var f = (Form)Tao("BlockedForm", "roblox", "Roblox", LockReasons.ChuaPhanLoai, true, false);
            f.Show(); f.Activate(); await Cho(800);
            var nut = Nut(f).FirstOrDefault(b => b.Text.Contains("điểm", StringComparison.OrdinalIgnoreCase));
            nut?.PerformClick();
            await Cho(3500);
            Chup("chan-sau-khi-bam-dung-diem", f.Bounds);
            f.Close();
        }
        {
            var f = (Form)Tao("BlockedForm", "roblox", "Roblox", LockReasons.ChuaPhanLoai, true, true);   // mất mạng ⇒ ô mã mở offline
            await Hien("chan-mat-mang-ma-offline", f);
            f.Close();
        }

        // 5) Xin thêm thời gian
        {
            var f = (Form)Tao("RequestForm", true, "roblox", "Roblox");
            await Hien("xin-them-thoi-gian", f);
            var gui = Nut(f).FirstOrDefault(b => b.Text == "Xin bố mẹ");
            gui?.PerformClick();
            await Cho(4000);
            Chup("xin-them-thoi-gian-da-gui", f.Bounds);
            f.Close();
        }

        // 6) Nộp bài
        foreach (var (bc, ten) in new[] { ("anh", "nop-bai-anh"), ("van_ban", "nop-bai-van-ban") })
        {
            var nv = new HvNhiemVu { Id = "x", Ten = "Dọn góc học tập", MoTa = "Xếp sách vở, lau bàn học gọn gàng rồi chụp ảnh cho Ba Mẹ.", Diem = 20, BangChung = bc, TrangThai = "san_sang" };
            var f = (Form)Tao("NopBaiForm", nv);
            await Hien(ten, f);
            f.Close();
        }

        // 7) Màn khoá toàn màn hình (LockForm thật; trạng thái do harness đặt vì runner không có phiên đăng nhập của Con)
        foreach (var (lyDo, giay, off, ten) in new[]
                 {
                     (LockReasons.HetGio, (int?)45, false, "khoa-het-gio-dem-nguoc"),
                     (LockReasons.Ngu, (int?)null, false, "khoa-gio-ngu"),
                     (LockReasons.Khoa, (int?)null, false, "khoa-ba-me-khoa-ngay"),
                     (LockReasons.HetGio, (int?)null, true, "khoa-mat-mang-ma-offline"),
                 })
        {
            var f = (Form)Tao("LockForm", true);
            var st = new TrayState { Paired = true, Locked = true, LockReason = lyDo, LockGraceLeftSec = giay, Offline = off, CanExchangePoints = true, ChildName = "Bin" };
            f.GetType().GetMethod("Apply")!.Invoke(f, new object[] { st });
            await Hien(ten, f, 1500, true);
            f.GetType().GetMethod("CloseForReal")!.Invoke(f, null);
            await Cho(500);
        }
    }
}
