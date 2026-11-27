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
}
