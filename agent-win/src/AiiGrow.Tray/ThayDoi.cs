using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tray;

/// <summary>
/// Dấu vân tay dữ liệu màn app Con: tải lại định kỳ (60 giây, mỗi lần mở app, mỗi tin mới) mà dữ liệu y nguyên thì KHÔNG dựng lại cả nội dung
/// (Controls.Clear + tạo mới hàng chục control + ảnh QR) — dựng lại là nguồn giật chính của app Con trên Windows (07/11).
/// Thuần logic, không đụng WinForms ⇒ có test.
/// </summary>
internal static class ThayDoi
{
    /// <summary>Băm nội dung JSON của các phần dữ liệu (null cũng tính, thứ tự có nghĩa).</summary>
    public static string Bam(params object?[] phan)
    {
        var sb = new StringBuilder();
        foreach (var p in phan ?? new object?[] { null })
        {
            sb.Append(p is string s ? s : JsonSerializer.Serialize(p, Json.Options)).Append('\u001f');
        }
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString())));
    }
}
