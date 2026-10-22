namespace AiiGrow.Core;

public static class Paths
{
    public const string ServiceName = "AiiGrowService";
    public const string ServiceDisplayName = "AiiGrow (quản lý thời gian dùng máy)";
    public const string TrayRunValue = "AiiGrowTray";
    public const string ServiceExeName = "AiiGrow.Service.exe";
    public const string TrayExeName = "AiiGrow.Tray.exe";
    /// <summary>Bộ cài/gỡ — chép vào thư mục cài để Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt gọi «--uninstall».</summary>
    public const string SetupExeName = "AiiGrow.Setup.exe";

    public static string DataDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "AiiGrow");

    public static string ConfigFile => Path.Combine(DataDir, "config.json");

    public static string InstallDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "AiiGrow");

    /// <summary>Chỉ SYSTEM và Administrators được đọc/ghi thư mục dữ liệu (chứa token máy).</summary>
    public static void SecureDirectory(string dir)
    {
        Directory.CreateDirectory(dir);
        Shell.Run("icacls.exe", new[] { dir, "/inheritance:r", "/grant:r", "*S-1-5-18:(OI)(CI)F", "*S-1-5-32-544:(OI)(CI)F" }, 30000);
    }
}
