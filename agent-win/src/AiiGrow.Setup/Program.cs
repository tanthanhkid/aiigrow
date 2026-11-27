using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Setup;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        bool silent = args.Any(a => a.Equals("/silent", StringComparison.OrdinalIgnoreCase) || a.Equals("--silent", StringComparison.OrdinalIgnoreCase));

        if (args.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase) || a.Equals("/uninstall", StringComparison.OrdinalIgnoreCase)))
            return Uninstall(silent, args);

        // Công tắc chế độ (Ba Mẹ chạy, cần quyền admin — manifest đã xin): AiiGrow.Setup.exe --che-do=chan | --che-do=giam-sat
        var cheDo = args.FirstOrDefault(x => x.StartsWith("--che-do=", StringComparison.OrdinalIgnoreCase));
        if (cheDo != null) return DoiCheDo(cheDo["--che-do=".Length..], silent);

        // MÁY ĐÃ CÀI (dịch vụ + config có token) ⇒ CẬP NHẬT ĐÈ, không ghép lại (Thanh 22/10). «--sua» bỏ qua để mở trình cài đầy đủ.
        // Dịch vụ tự cập nhật gọi: AiiGrow-Setup.exe --capnhat --im-lang (chạy SYSTEM, không giao diện).
        bool imLang = silent || CoCo(args, "im-lang");
        if (!CoCo(args, "sua"))
        {
            var ph = CapNhatSetup.PhatHien();
            if (ph.CheDo != CheDoBoCai.CaiMoi) return CapNhatDe(ph, imLang);
            if (CoCo(args, "capnhat") && imLang)
            {
                WriteLog("--capnhat: máy chưa cài/ghép AiiGrow ⇒ không có gì để cập nhật.");
                return 2;
            }
        }

        // Gói ghép nhúng sẵn trong bộ cài (tham số / biến môi trường / đuôi tệp / tên tệp — link Ba Mẹ gửi, L8 thiết kế 05/11):
        // --silent ⇒ CÀI MỘT CHẠM như cũ (không giao diện); có giao diện ⇒ trình cài vẫn chọn tài khoản của con, bước Ghép máy tự ghép bằng gói (không gõ mã).
        var coGoi = EnrollmentReader.TryRead(args, out var pkg);
        if (coGoi && silent)
            return OneTouch(pkg, silent);

        if (silent)
        {
            WriteLog("Không tìm thấy token ghép máy trong bộ cài (/silent cần token nhúng sẵn).");
            return 2;
        }

        // Luồng cài có giao diện (chọn tài khoản; ghép bằng gói nếu có, không thì mã 6 số).
        Application.Run(new SetupForm(coGoi ? pkg : null));
        return 0;
    }

    private static bool CoCo(string[] args, string ten) =>
        args.Any(a => a.Equals("--" + ten, StringComparison.OrdinalIgnoreCase) || a.Equals("/" + ten, StringComparison.OrdinalIgnoreCase));

    private static int CapNhatDe(PhatHienCai ph, bool imLang)
    {
        if (imLang)
        {
            if (ph.CheDo == CheDoBoCai.DaMoiNhat)
            {
                WriteLog($"Cập nhật im lặng: đã là bản mới nhất ({CapNhat.Hien(ph.BanDangCai)}).");
                return 0;
            }
            var kq = CapNhatSetup.Chay(imLang: true);
            WriteLog($"Cập nhật im lặng {CapNhat.Hien(ph.BanDangCai)} → {CapNhat.Hien(ph.BanMoi)}: {kq.Log}");
            return kq.Ok ? 0 : kq.DaKhoiPhuc ? 7 : 8;
        }
        var f = new CapNhatForm(ph);
        Application.Run(f);
        if (f.MuonSua) Application.Run(new SetupForm());
        return 0;
    }

    private static int OneTouch(EnrollmentPackage pkg, bool silent)
    {
        try
        {
            void Log(string m) => WriteLog(m);
            Task.Run(() => Installer.RunOneTouchAsync(pkg, new EnrollClient(), Log)).GetAwaiter().GetResult();
            if (!silent) HopThoai.Hien("Đã cài AiiGrow lên máy này.", "AiiGrow");
            return 0;
        }
        catch (Exception e)
        {
            WriteLog("Cài lỗi: " + CauLoiCai.Log(e));
            if (!silent) HopThoai.Hien("Chưa cài được. " + CauLoiCai.Tu(e), "AiiGrow", loi: true);   // #689
            return 3;
        }
    }

    private static int DoiCheDo(string moi, bool silent)
    {
        var (ok, cau) = CheDoSwitch.Doi(new ConfigStore(), moi);
        WriteLog(cau);
        if (ok) Shell.Run("sc.exe", new[] { "stop", Paths.ServiceName }, 30000);   // SCM tự bật lại (recovery) ⇒ dịch vụ đọc chế độ mới
        if (!silent) HopThoai.Hien(cau, "AiiGrow", loi: !ok);
        return ok ? 0 : 4;
    }

    private static bool _baMeHuy;

    /// <summary>Hỏi Ba Mẹ (tối đa 5 lần). Im lặng: mã qua «--ma=123456». → true = được gỡ.</summary>
    private static bool CongGoBaMe(bool silent, string[] args)
    {
        var store = new ConfigStore();
        var cfg = store.Load();
        // Tệp cấu hình CÓ mà không đọc được (khoá/hỏng) ⇒ không biết máy đã ghép chưa: KHÔNG coi là chưa ghép (không để mở cổng bằng cách làm hỏng tệp).
        if (cfg == null && File.Exists(Paths.ConfigFile))
        {
            WriteLog("Gỡ bị chặn: có tệp cấu hình nhưng không đọc được.");
            if (!silent) HopThoai.Hien("Chưa đọc được cấu hình AiiGrow nên chưa xác nhận được Ba Mẹ. Khởi động lại máy rồi thử lại.", "AiiGrow", loi: true);
            return false;
        }
        if (!CongGo.CanHoi(cfg)) return true;
        if (silent)
        {
            var ma = args.FirstOrDefault(a => a.StartsWith("--ma=", StringComparison.OrdinalIgnoreCase))?["--ma=".Length..];
            var kq0 = CongGo.Kiem(cfg, ma, null, null, DateTimeOffset.Now, MatKhauQuanTri.Kiem);
            if (kq0 != CongGo.KetQua.Duoc)
            {
                WriteLog("Gỡ im lặng bị từ chối: " + (kq0 == CongGo.KetQua.Sai ? CongGo.CauSai : CongGo.CauYeuCau));
                Thread.Sleep(3000);   // chậm dò mã qua chạy lặp
            }
            return kq0 == CongGo.KetQua.Duoc;
        }
        string? loi = null;
        for (int lan = 0; lan < 5; lan++)
        {
            var d = HopGoCanBaMe.Hoi(loi);
            if (d == null) { _baMeHuy = true; return false; }
            var kq = CongGo.Kiem(cfg, d.Ma, d.TaiKhoan, d.MatKhau, DateTimeOffset.Now, MatKhauQuanTri.Kiem);
            if (kq == CongGo.KetQua.Duoc) return true;
            loi = kq == CongGo.KetQua.Sai ? CongGo.CauSai : CongGo.CauYeuCau;
            if (kq == CongGo.KetQua.Sai) Thread.Sleep(1500);   // chậm dò mã / mật khẩu
        }
        HopThoai.Hien("Nhập sai quá nhiều lần. Chạy lại bộ gỡ khi có Ba Mẹ.", "AiiGrow", loi: true);
        return false;
    }

    private static int Uninstall(bool silent, string[] args)
    {
        // #739: gỡ tại máy phải có Ba Mẹ (mã mở máy / mật khẩu quản trị) — bé không tự gỡ được qua Start › Uninstall.
        if (!CongGoBaMe(silent, args)) return _baMeHuy ? 0 : 9;   // Ba Mẹ bấm «Không gỡ» = huỷ, không phải lỗi
        if (!silent && HopThoai.Hien("Gỡ AiiGrow khỏi máy này?", "AiiGrow", hoi: true) != DialogResult.Yes)
            return 0;
        var kq = Task.Run(Installer.UninstallAsync).GetAwaiter().GetResult();
        WriteLog(kq.Log);
        // Chưa gỡ được luật chặn (AppLocker) ⇒ BÁO LỖI RÕ RÀNG, KHÔNG coi là thành công: máy Con vẫn còn luật chặn nếu bỏ qua.
        if (!kq.AppLockerGo)
        {
            if (!silent) HopThoai.Hien(kq.Log, "AiiGrow — CHƯA gỡ xong", loi: true);
            return 5;
        }
        if (!kq.QuyenAdminTra)
        {
            if (!silent) HopThoai.Hien(kq.Log + "\n\nLƯU Ý: chưa trả lại được quyền quản trị cho tài khoản của Con — hãy thêm tay vào nhóm Administrators.",
                "AiiGrow — đã gỡ, còn một việc", loi: true);
            return 6;
        }
        if (!silent) HopThoai.Hien(kq.Log, "AiiGrow");
        return 0;
    }

    internal static void WriteLog(string m)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            File.AppendAllText(Path.Combine(Paths.DataDir, "install.log"), $"{DateTimeOffset.Now:o}  {m}{Environment.NewLine}");
        }
        catch { }
    }
}
