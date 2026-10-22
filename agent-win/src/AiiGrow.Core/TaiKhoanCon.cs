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
        return ds.Where(a => !a.IsAdmin && AppLockerXml.IsValidSid(a.Sid) && !LaTaiKhoanHeThong(a)).Select(a => a.Sid)
                 .Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(s => s, StringComparer.Ordinal).ToList();
    }

    /// <summary>Administrator/Guest/DefaultAccount/WDAGUtilityAccount (RID 500–504) và defaultuser0 (OOBE) — không phải người dùng thật.</summary>
    public static bool LaTaiKhoanHeThong(LocalAccount a)
    {
        if (string.Equals(a.Name, "defaultuser0", StringComparison.OrdinalIgnoreCase)) return true;
        var cuoi = a.Sid.LastIndexOf('-');
        return cuoi > 0 && int.TryParse(a.Sid[(cuoi + 1)..], out var rid) && rid is >= 500 and <= 504;
    }

    public static string ChonUser(string? cfgUser, string? consoleUser, IEnumerable<LocalAccount> ds)
    {
        if (!string.IsNullOrWhiteSpace(cfgUser)) return cfgUser!;
        if (string.IsNullOrWhiteSpace(consoleUser)) return "";
        return ds.Any(a => !a.IsAdmin && !LaTaiKhoanHeThong(a) && string.Equals(a.Name, consoleUser, StringComparison.OrdinalIgnoreCase)) ? consoleUser! : "";
    }

    /// <summary>Tài khoản cục bộ đang bật + có phải quản trị (Administrators) không. Chỉ chạy trên Windows; lỗi ⇒ ném (KHÔNG coi là danh sách rỗng).</summary>
    /// <remarks>Thành viên nhóm quản trị đọc bằng ADSI, không dùng Get-LocalGroupMember: lệnh đó lỗi 1789 khi nhóm có SID mồ côi / AzureAD
    /// (review #54) ⇒ máy đó không bao giờ được chặn. Tên nhóm lấy theo SID S-1-5-32-544 (Windows tiếng khác không tên «Administrators»).</remarks>
    public static List<LocalAccount> DocMay()
    {
        var r = Shell.PowerShell(
            "$ten = (New-Object Security.Principal.SecurityIdentifier 'S-1-5-32-544').Translate([Security.Principal.NTAccount]).Value.Split('\\')[-1]; " +
            "$g = [ADSI](\"WinNT://./$ten,group\"); " +
            "$admins = @($g.Invoke('Members') | ForEach-Object { try { [Security.Principal.SecurityIdentifier]::new([byte[]]$_.GetType().InvokeMember('objectSid', 'GetProperty', $null, $_, $null), 0).Value } catch { } }); " +
            // mọi thành viên đều không đọc được (PowerShell ConstrainedLanguage…) ⇒ LỖI, không coi là «không ai quản trị» (sẽ chặn nhầm Ba Mẹ)
            "if ($admins.Count -eq 0) { throw 'không đọc được thành viên nhóm quản trị' }; " +
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
