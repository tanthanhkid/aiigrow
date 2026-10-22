using System.Reflection;

namespace AiiGrow.Setup;

/// <summary>
/// Bộ cài MỘT FILE: AiiGrow.Service.exe + AiiGrow.Tray.exe nằm trong chính AiiGrow-Setup.exe dưới dạng tài nguyên nhúng
/// (LogicalName «goi/&lt;tên&gt;», xem AiiGrow.Setup.csproj — build bằng agent-win/build-mot-file.sh). Bộ cài cũ dạng zip (exe nằm cạnh
/// bộ cài) vẫn chạy: tệp cạnh bộ cài được ưu tiên.
/// </summary>
internal static class Goi
{
    private static string Ten(string tep) => "goi/" + tep;

    public static bool Co(string tep) =>
        File.Exists(Path.Combine(AppContext.BaseDirectory, tep)) ||
        Assembly.GetExecutingAssembly().GetManifestResourceInfo(Ten(tep)) != null;

    /// <summary>Chép <paramref name="tep"/> tới <paramref name="dich"/> (cạnh bộ cài trước, không có thì giải từ tài nguyên nhúng). → false nếu không có ở đâu cả.</summary>
    public static bool ChepRa(string tep, string dich)
    {
        var canh = Path.Combine(AppContext.BaseDirectory, tep);
        if (File.Exists(canh))
        {
            File.Copy(canh, dich, true);
            return true;
        }
        using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(Ten(tep));
        if (s == null) return false;
        var tam = dich + ".moi";
        using (var f = File.Create(tam)) s.CopyTo(f);
        File.Move(tam, dich, true);
        return true;
    }
}
