using System.Text.Json;

namespace AiiGrow.Core;

public sealed record LocalAccount(string Name, string Sid, bool IsAdmin);

/// <summary>
/// Tài khoản Windows mà luật của Con áp vào. Cài có chọn tài khoản ⇒ đúng tài khoản đó (ChildUser/ChildSid trong cấu hình).
/// Cài một chạm (không chọn tài khoản — CI e2e 22/10: «0 luật AiiGrow; childSid «»», máy không bao giờ bị chặn) ⇒ MỌI tài khoản
/// không phải quản trị (đúng như app Ba Mẹ mô tả), phiên Con = phiên trước màn hình nếu tài khoản đó không phải quản trị.
/// </summary>
public static class TaiKhoanCon
{
    public static IReadOnlyList<string> ChonSids(string? cfgSid, IEnumerable<LocalAccount> ds)
    {
        if (AppLockerXml.IsValidSid(cfgSid)) return new[] { cfgSid! };
        return ds.Where(a => !a.IsAdmin && AppLockerXml.IsValidSid(a.Sid)).Select(a => a.Sid)
                 .Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(s => s, StringComparer.Ordinal).ToList();
    }

    public static string ChonUser(string? cfgUser, string? consoleUser, IEnumerable<LocalAccount> ds)
    {
        if (!string.IsNullOrWhiteSpace(cfgUser)) return cfgUser!;
        if (string.IsNullOrWhiteSpace(consoleUser)) return "";
        return ds.Any(a => !a.IsAdmin && string.Equals(a.Name, consoleUser, StringComparison.OrdinalIgnoreCase)) ? consoleUser! : "";
    }

    /// <summary>Tài khoản cục bộ đang bật + có phải quản trị (Administrators) không. Chỉ chạy trên Windows.</summary>
    public static List<LocalAccount> DocMay()
    {
        var r = Shell.PowerShell(
            "$admins = @(Get-LocalGroupMember -SID S-1-5-32-544 | ForEach-Object { $_.SID.Value }); " +
            "$l = @(Get-LocalUser | Where-Object { $_.Enabled } | ForEach-Object { [pscustomobject]@{ Name=$_.Name; Sid=$_.SID.Value; IsAdmin=($admins -contains $_.SID.Value) } }); " +
            "ConvertTo-Json -InputObject $l -Compress");
        if (!r.Ok) throw new InvalidOperationException("Không đọc được danh sách tài khoản: " + r.Error);
        return DocJson(r.Output);
    }

    public static List<LocalAccount> DocJson(string json)
    {
        var res = new List<LocalAccount>();
        if (string.IsNullOrWhiteSpace(json)) return res;
        using var doc = JsonDocument.Parse(json.Trim());
        var items = doc.RootElement.ValueKind == JsonValueKind.Array
            ? doc.RootElement.EnumerateArray().ToList()
            : new List<JsonElement> { doc.RootElement };
        foreach (var e in items)
        {
            if (e.ValueKind != JsonValueKind.Object) continue;
            res.Add(new LocalAccount(
                e.GetProperty("Name").GetString() ?? "",
                e.GetProperty("Sid").GetString() ?? "",
                e.GetProperty("IsAdmin").GetBoolean()));
        }
        return res;
    }
}
