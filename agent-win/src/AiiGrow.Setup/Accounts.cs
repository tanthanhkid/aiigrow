using System.Text.RegularExpressions;
using AiiGrow.Core;

namespace AiiGrow.Setup;

internal static class Accounts
{
    private static readonly Regex NameRegex = new(@"^[A-Za-z0-9._-]{1,20}$", RegexOptions.Compiled);
    public static bool IsValidName(string? n) => !string.IsNullOrEmpty(n) && NameRegex.IsMatch(n);

    public static List<LocalAccount> List() => TaiKhoanCon.DocMay();

    /// <summary>Tạo tài khoản Standard mới (mật khẩu truyền qua biến môi trường, không lên dòng lệnh). Trả SID.</summary>
    /// <param name="password">Rỗng ⇒ tài khoản KHÔNG mật khẩu (06/11 L13: tài khoản chung của các bé — AiiGrow nhận bé bằng tên + PIN trên màn khoá).</param>
    public static string CreateStandard(string name, string password)
    {
        if (!IsValidName(name)) throw new ArgumentException("Tên tài khoản chỉ gồm chữ, số, dấu . _ - (tối đa 20 ký tự)");
        var q = Shell.PsQuote(name);
        var tao = string.IsNullOrEmpty(password)
            // -NoPassword có thể để cờ «phải đổi mật khẩu lần đầu» ⇒ tắt hẳn bằng net user (không yêu cầu mật khẩu, không bắt đổi lúc đăng nhập)
            ? $"New-LocalUser -Name {q} -NoPassword -AccountNeverExpires | Out-Null; " +
              // không để mật khẩu (rỗng) hết hạn sau 42 ngày; lỗi phần này không chặn cài (tài khoản đã tạo — chạy lại sẽ báo trùng tên)
              $"try {{ Set-LocalUser -Name {q} -PasswordNeverExpires $true }} catch {{}}; " +
              $"& net.exe user {q} /passwordreq:no /logonpasswordchg:no 2>$null | Out-Null; "
            : "$pw = ConvertTo-SecureString $env:AIIG_PW -AsPlainText -Force; " +
              $"New-LocalUser -Name {q} -Password $pw -PasswordNeverExpires -AccountNeverExpires | Out-Null; ";
        var r = Shell.PowerShell(
            tao +
            $"try {{ Add-LocalGroupMember -SID S-1-5-32-545 -Member {q} }} catch {{}}; " +
            $"(Get-LocalUser -Name {q}).SID.Value",
            60000, new Dictionary<string, string> { ["AIIG_PW"] = password });
        if (!r.Ok) throw new InvalidOperationException("Không tạo được tài khoản: " + r.Error);
        return r.Output.Trim();
    }

    /// <summary>Hạ tài khoản từ Administrators xuống Users (Standard).</summary>
    public static void Demote(string sid)
    {
        if (!AppLockerXml.IsValidSid(sid)) throw new ArgumentException("SID không hợp lệ");
        var q = Shell.PsQuote(sid);
        var r = Shell.PowerShell(
            $"try {{ Add-LocalGroupMember -SID S-1-5-32-545 -Member {q} }} catch {{}}; " +
            $"Remove-LocalGroupMember -SID S-1-5-32-544 -Member {q}");
        if (!r.Ok) throw new InvalidOperationException("Không hạ được quyền quản trị: " + r.Error);
    }
}
