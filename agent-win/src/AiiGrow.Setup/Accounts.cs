using System.Text.RegularExpressions;
using AiiGrow.Core;

namespace AiiGrow.Setup;

internal static class Accounts
{
    private static readonly Regex NameRegex = new(@"^[A-Za-z0-9._-]{1,20}$", RegexOptions.Compiled);
    public static bool IsValidName(string? n) => !string.IsNullOrEmpty(n) && NameRegex.IsMatch(n);

    public static List<LocalAccount> List() => TaiKhoanCon.DocMay();

    /// <summary>Tạo tài khoản Standard mới (mật khẩu truyền qua biến môi trường, không lên dòng lệnh). Trả SID.</summary>
    public static string CreateStandard(string name, string password)
    {
        if (!IsValidName(name)) throw new ArgumentException("Tên tài khoản chỉ gồm chữ, số, dấu . _ - (tối đa 20 ký tự)");
        var q = Shell.PsQuote(name);
        var r = Shell.PowerShell(
            "$pw = ConvertTo-SecureString $env:AIIG_PW -AsPlainText -Force; " +
            $"New-LocalUser -Name {q} -Password $pw -PasswordNeverExpires -AccountNeverExpires | Out-Null; " +
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
