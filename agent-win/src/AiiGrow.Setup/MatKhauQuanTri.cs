using System.Runtime.InteropServices;
using System.Security.Principal;

namespace AiiGrow.Setup;

/// <summary>#739: kiểm «tài khoản + mật khẩu Ba Mẹ» của bộ gỡ: đăng nhập được (LogonUser) VÀ token đó thuộc nhóm Administrators
/// (đọc từ chính token đăng nhập ⇒ tính cả nhóm lồng, không vấp SID mồ côi trong nhóm).</summary>
internal static class MatKhauQuanTri
{
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool LogonUser(string user, string? domain, string pass, int type, int provider, out IntPtr token);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr h);

    private const int LogonNetwork = 3, ProviderDefault = 0;

    public static bool Kiem(string taiKhoan, string matKhau)
    {
        // «MAY\ten», «.\ten», «ten@mail» (UPN) hoặc «ten» (tài khoản cục bộ)
        string user = taiKhoan.Trim(), domain = ".";
        var i = user.IndexOf('\\');
        if (i > 0) { domain = user[..i]; user = user[(i + 1)..]; }
        else if (user.Contains('@')) domain = null!;
        if (!LogonUser(user, domain, matKhau, LogonNetwork, ProviderDefault, out var tk)) return false;
        try
        {
            using var id = new WindowsIdentity(tk);
            // Groups gồm cả nhóm «deny-only» của token đã lọc UAC (quản trị cục bộ ≠ Administrator dựng sẵn đăng nhập mạng ra token lọc) ⇒ IsInRole sẽ sai.
            var quanTri = new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null);
            return id.Groups?.Any(g => g.Equals(quanTri)) == true;
        }
        finally { CloseHandle(tk); }
    }

    // ---- #862: đặt mật khẩu cho tài khoản quản trị cục bộ đang trống ----

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct USER_INFO_1003 { public string usri1003_password; }
    [DllImport("netapi32.dll", CharSet = CharSet.Unicode)]
    private static extern int NetUserSetInfo(string? server, string user, int level, ref USER_INFO_1003 buf, out int parmErr);
    [DllImport("netapi32.dll", CharSet = CharSet.Unicode)]
    private static extern int NetUserChangePassword(string? domain, string user, string oldPass, string newPass);

    private const int ErrorAccessDenied = 5, ErrorAccountRestriction = 1327;

    /// <summary>Đặt mật khẩu mới cho tài khoản cục bộ đang trống mật khẩu ⇒ 0 = xong, khác = mã lỗi (DatMatKhauQuanTri.CauLoiDat).
    /// Thử ĐỔI (mật khẩu cũ trống) trước: đổi giữ được khoá DPAPI của tài khoản (mật khẩu đã lưu trong trình duyệt, Wi-Fi…).
    /// Chỉ khi Windows chặn đổi từ mật khẩu trống (chính sách «mật khẩu trống chỉ đăng nhập tại máy» ⇒ 1327 / 5) VÀ tài khoản vẫn còn trống
    /// (<paramref name="conTrong"/>) thì bộ cài — đang chạy quyền quản trị — mới đặt hộ bằng NetUserSetInfo level 1003. Mật khẩu cũ không trống
    /// (86: Ba Mẹ vừa tự đặt) ⇒ KHÔNG ghi đè. Mật khẩu chỉ nằm trong bộ nhớ, không ghi log.</summary>
    public static int Dat(string taiKhoan, string matKhau, Func<bool> conTrong)
    {
        var rc = NetUserChangePassword(Environment.MachineName, taiKhoan, "", matKhau);   // máy này (null = miền đăng nhập của người đang chạy)
        if (rc is not (ErrorAccountRestriction or ErrorAccessDenied)) return rc;
        if (!conTrong()) return rc;
        var info = new USER_INFO_1003 { usri1003_password = matKhau };
        return NetUserSetInfo(null, taiKhoan, 1003, ref info, out _);
    }
}
