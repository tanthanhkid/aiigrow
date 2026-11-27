using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace AiiGrow.Core;

/// <summary>#739: tên thiết bị DOS mà Windows cấm làm tên tệp/thư mục (kể cả có đuôi: «con.x» cũng cấm). Tài khoản mang tên này không có được
/// C:\Users\&lt;tên&gt; ⇒ «We can't sign in to your account», hồ sơ tạm mỗi lần khởi động.</summary>
public static class TenThietBi
{
    private static readonly Regex Cam = new(@"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool LaTenCam(string? ten)
    {
        var t = (ten ?? "").Trim().TrimEnd('.', ' ');
        return t.Length > 0 && Cam.IsMatch(t);
    }
}

/// <summary>Dựng hồ sơ người dùng ngay (userenv!CreateProfile) để biết sớm hồ sơ có tạo được không.</summary>
public static class HoSoWindows
{
    [DllImport("userenv.dll", CharSet = CharSet.Unicode)]
    private static extern int CreateProfile(string pszUserSid, string pszUserName, [Out] System.Text.StringBuilder pszProfilePath, uint cchProfilePath);

    private const int DaTonTai = unchecked((int)0x800700B7);   // HRESULT_FROM_WIN32(ERROR_ALREADY_EXISTS) — hồ sơ có rồi là tốt

    /// <returns>null = có hồ sơ; khác = chữ lỗi (chỉ ghi nhật ký).</returns>
    public static string? Dung(string sid, string ten, out string duong)
    {
        var sb = new System.Text.StringBuilder(260);
        duong = "";
        if (TenThietBi.LaTenCam(ten)) return "tên thiết bị bị cấm";
        try
        {
            var hr = CreateProfile(sid, ten, sb, (uint)sb.Capacity);
            if (hr != 0 && hr != DaTonTai) return "HRESULT 0x" + hr.ToString("X8");
            if (hr == DaTonTai) return null;   // hồ sơ đã có (CreateProfile không điền đường dẫn) — tên đã qua kiểm tên cấm ở trên
            duong = sb.ToString();
            return !string.IsNullOrEmpty(duong) && Directory.Exists(duong) ? null : "thư mục hồ sơ không có: " + duong;
        }
        catch (Exception e) { return e.GetType().Name + ": " + e.Message; }
    }
}
