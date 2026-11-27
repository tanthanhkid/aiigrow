using System.Runtime.InteropServices;
using AiiGrow.Core;

namespace AiiGrow.Setup;

/// <summary>#739: kiểm «tài khoản + mật khẩu Ba Mẹ» của bộ gỡ: đăng nhập được (LogonUser) VÀ là thành viên Administrators.</summary>
internal static class MatKhauQuanTri
{
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool LogonUser(string user, string? domain, string pass, int type, int provider, out IntPtr token);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr h);

    private const int LogonNetwork = 3, ProviderDefault = 0;

    public static bool Kiem(string taiKhoan, string matKhau)
    {
        // «MAY\\ten», «ten@mail» hoặc «ten» (tài khoản cục bộ)
        string user = taiKhoan, domain = ".";
        var i = taiKhoan.IndexOf('\\');
        if (i > 0) { domain = taiKhoan[..i]; user = taiKhoan[(i + 1)..]; }
        else if (taiKhoan.Contains('@')) domain = null!;
        if (!LogonUser(user, domain, matKhau, LogonNetwork, ProviderDefault, out var tk)) return false;
        CloseHandle(tk);
        return LaQuanTri(taiKhoan);
    }

    private static bool LaQuanTri(string taiKhoan)
    {
        var q = Shell.PsQuote(taiKhoan);
        var r = Shell.PowerShell(
            "$sid = (New-Object System.Security.Principal.NTAccount(" + q + ")).Translate([System.Security.Principal.SecurityIdentifier]).Value; " +
            "if ((Get-LocalGroupMember -SID S-1-5-32-544 | ForEach-Object { $_.SID.Value }) -contains $sid) { 'YES' } else { 'NO' }", 30000);
        return r.Ok && r.Output.Trim() == "YES";
    }
}
