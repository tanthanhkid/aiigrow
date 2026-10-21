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

    private static int Uninstall(bool silent)
    {
        if (!silent && MessageBox.Show("Gỡ AiiGrow khỏi máy này?", "AiiGrow", MessageBoxButtons.YesNo) != DialogResult.Yes)
            return 0;
        var log = Installer.Uninstall();
        WriteLog(log);
        if (!silent) MessageBox.Show(log, "AiiGrow");
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
