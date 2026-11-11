using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace AiiGrow.Core;

/// <summary>Định danh máy gửi kèm lúc ghép (`maMay`) — 11/11 «hai nhà một máy»: máy chủ thấy cùng maMay ở bản ghi cũ ⇒ thu hồi bản cũ
/// (server/lib/gia-dinh.ts › ghepMayGd). = SHA-256 hex (chữ thường) của MachineGuid + muối "aiigrow"; KHÔNG gửi MachineGuid thô.
/// Đọc lỗi ⇒ null (không gửi — máy chủ giữ hành vi cũ).</summary>
public static class MaMay
{
    public const string Muoi = "aiigrow";

    /// <summary>Băm một định danh thô (tách riêng để test).</summary>
    public static string? Bam(string? tho)
    {
        var s = (tho ?? "").Trim();
        if (s.Length == 0) return null;
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(s + Muoi))).ToLowerInvariant();
    }

    /// <summary>maMay của máy này, null nếu không đọc được MachineGuid.</summary>
    public static string? Doc()
    {
        try
        {
            // View 64-bit: tiến trình 32-bit đọc nhánh WOW6432Node không có MachineGuid.
            using var k = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64)
                .OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            return Bam(k?.GetValue("MachineGuid") as string);
        }
        catch { return null; }
    }
}
