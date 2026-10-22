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
            return Uninstall(silent);

        // Công tắc chế độ (Ba Mẹ chạy, cần quyền admin — manifest đã xin): AiiGrow.Setup.exe --che-do=chan | --che-do=giam-sat
        var cheDo = args.FirstOrDefault(x => x.StartsWith("--che-do=", StringComparison.OrdinalIgnoreCase));
        if (cheDo != null) return DoiCheDo(cheDo["--che-do=".Length..], silent);

        // CÀI MỘT CHẠM: token máy chủ nhúng sẵn trong bộ cài (tham số / biến môi trường / đuôi tệp / tên tệp) ⇒ cài thẳng, không nhập gì.
        if (EnrollmentReader.TryRead(args, out var pkg))
            return OneTouch(pkg, silent);

        if (silent)
        {
            WriteLog("Không tìm thấy token ghép máy trong bộ cài (/silent cần token nhúng sẵn).");
            return 2;
        }

        // Không có token nhúng ⇒ luồng cài có giao diện (chọn tài khoản, QR / mã số).
        Application.Run(new SetupForm());
        return 0;
    }

    private static int OneTouch(EnrollmentPackage pkg, bool silent)
    {
        try
        {
            void Log(string m) => WriteLog(m);
            Task.Run(() => Installer.RunOneTouchAsync(pkg, new EnrollClient(), Log)).GetAwaiter().GetResult();
            if (!silent) MessageBox.Show("Đã cài AiiGrow lên máy này.", "AiiGrow", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 0;
        }
        catch (Exception e)
        {
            WriteLog("Cài lỗi: " + e.Message);
            if (!silent) MessageBox.Show("Chưa cài được: " + e.Message, "AiiGrow", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return 3;
        }
    }

    private static int DoiCheDo(string moi, bool silent)
    {
        var (ok, cau) = CheDoSwitch.Doi(new ConfigStore(), moi);
        WriteLog(cau);
        if (ok) Shell.Run("sc.exe", new[] { "stop", Paths.ServiceName }, 30000);   // SCM tự bật lại (recovery) ⇒ dịch vụ đọc chế độ mới
        if (!silent) MessageBox.Show(cau, "AiiGrow", MessageBoxButtons.OK, ok ? MessageBoxIcon.Information : MessageBoxIcon.Warning);
        return ok ? 0 : 4;
    }

    private static int Uninstall(bool silent)
    {
        if (!silent && MessageBox.Show("Gỡ AiiGrow khỏi máy này?", "AiiGrow", MessageBoxButtons.YesNo) != DialogResult.Yes)
            return 0;
        var kq = Task.Run(Installer.UninstallAsync).GetAwaiter().GetResult();
        WriteLog(kq.Log);
        // Chưa gỡ được luật chặn (AppLocker) ⇒ BÁO LỖI RÕ RÀNG, KHÔNG coi là thành công: máy Con vẫn còn luật chặn nếu bỏ qua.
        if (!kq.AppLockerGo)
        {
            if (!silent) MessageBox.Show(kq.Log, "AiiGrow — CHƯA gỡ xong", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 5;
        }
        if (!kq.QuyenAdminTra)
        {
            if (!silent) MessageBox.Show(kq.Log + "\n\nLƯU Ý: chưa trả lại được quyền quản trị cho tài khoản của Con — hãy thêm tay vào nhóm Administrators.",
                "AiiGrow — đã gỡ, còn một việc", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return 6;
        }
        if (!silent) MessageBox.Show(kq.Log, "AiiGrow", MessageBoxButtons.OK, MessageBoxIcon.Information);
        return 0;
    }

    private static void WriteLog(string m)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            File.AppendAllText(Path.Combine(Paths.DataDir, "install.log"), $"{DateTimeOffset.Now:o}  {m}{Environment.NewLine}");
        }
        catch { }
    }
}
