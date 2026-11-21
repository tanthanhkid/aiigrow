using System.Xml.Linq;

namespace AiiGrow.Core;

/// <summary>
/// Tệp đệm AppLocker cũ (<c>%WINDIR%\System32\AppLocker\*</c>). Máy từng cài bản cũ, gỡ rồi cài lại: chính sách hiệu lực đã RỖNG
/// (<c>Get-AppLockerPolicy -Effective -Xml</c> chỉ còn <c>&lt;AppLockerPolicy Version="1" /&gt;</c>) nhưng tệp đệm vẫn còn (vd <c>Exe.AppLocker</c> 3220 byte) ⇒
/// Windows vẫn coi Exe đang áp mà nhóm Appx không có luật ⇒ chặn mọi gói Store (Start, Search) với mọi tài khoản, khởi động lại cũng không hết.
/// Xoá các tệp đệm chính sách rồi nạp lại thì Start mở lại. CHỈ dọn khi chính sách không còn luật nào và không nhóm nào còn bật — máy có quản trị đặt luật riêng thì không đụng.
/// </summary>
public static class AppLockerDem
{
    public static string ThuMucMacDinh => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "System32", "AppLocker");

    /// <summary>Chính sách đọc được, KHÔNG còn luật nào (mọi nhóm) và không nhóm nào đang Enabled / AuditOnly. Không đọc được / không phải XML AppLocker ⇒ false.</summary>
    public static bool ChinhSachRong(string? xml)
    {
        if (string.IsNullOrWhiteSpace(xml)) return false;
        XDocument d;
        try { d = XDocument.Parse(xml); } catch { return false; }
        if (d.Root is not { } root || root.Name.LocalName != "AppLockerPolicy") return false;
        foreach (var c in root.Elements().Where(e => e.Name.LocalName == "RuleCollection"))
        {
            var mode = (string?)c.Attribute("EnforcementMode");
            if (mode is "Enabled" or "AuditOnly") return false;
            if (c.Elements().Any(e => e.Name.LocalName.EndsWith("Rule", StringComparison.Ordinal))) return false;
        }
        return true;
    }

    /// <summary>Tệp đệm chính sách đã biên dịch: <c>Exe.AppLocker</c>, <c>Appx.AppLocker</c>… Máy khoẻ mà chính sách rỗng thì không có tệp này
    /// (thư mục có thể còn tệp khác của Windows, vd AppCache.dat — không đụng).</summary>
    public const string MauTepDem = "*.AppLocker";

    private static IEnumerable<string> TepDem(string t) => Directory.Exists(t) ? Directory.EnumerateFiles(t, MauTepDem, SearchOption.TopDirectoryOnly) : Enumerable.Empty<string>();

    /// <summary>Số tệp đệm chính sách (<see cref="MauTepDem"/>) còn trong thư mục.</summary>
    public static int SoTepDem(string? thuMuc = null)
    {
        try { return TepDem(thuMuc ?? ThuMucMacDinh).Count(); }
        catch { return 0; }
    }

    /// <summary>Đọc chính sách HIỆU LỰC (cục bộ + GPO miền — đệm phục vụ bản này, không riêng bản cục bộ). <paramref name="loi"/> = không đọc được.</summary>
    public static string? DocHieuLuc(out bool loi)
    {
        loi = true;
        var r = Shell.PowerShell("Get-AppLockerPolicy -Effective -Xml", 60000);
        if (!r.Ok) return null;
        loi = false;
        return r.Output;
    }

    /// <summary>Cần dọn: chính sách hiệu lực đọc được và rỗng, mà đệm chính sách còn tệp. <paramref name="docLoi"/> ⇒ không đụng.</summary>
    public static bool CanDon(bool docLoi, string? xml, string? thuMuc = null) => !docLoi && ChinhSachRong(xml) && SoTepDem(thuMuc) > 0;

    /// <summary>Xoá các tệp đệm chính sách. Trả số tệp đã xoá; tệp bị khoá thì bỏ qua (lần khởi động sau dọn nốt).</summary>
    public static int Xoa(string? thuMuc = null)
    {
        var da = 0;
        try
        {
            foreach (var f in TepDem(thuMuc ?? ThuMucMacDinh).ToList())
            {
                try { File.SetAttributes(f, FileAttributes.Normal); File.Delete(f); da++; } catch { }
            }
        }
        catch { }
        return da;
    }

    /// <summary>Dọn thật trên máy: AppIDSvc giữ tệp ⇒ dừng nếu đang chạy, xoá đệm, chạy lại đúng như trước (không đổi kiểu khởi động). Trả số tệp đã xoá.</summary>
    public static int DonTrenMay()
    {
        var r = Shell.PowerShell("$s = Get-Service -Name AppIDSvc -ErrorAction SilentlyContinue; if ($s -and $s.Status -eq 'Running') { Stop-Service -Name AppIDSvc -Force -ErrorAction SilentlyContinue; 'chay' }", 60000);
        var dangChay = r.Ok && r.Output.Contains("chay");
        try { return Xoa(); }
        finally { if (dangChay) Shell.PowerShell("try { Start-Service -Name AppIDSvc } catch {}", 60000); }
    }

    /// <summary>Đoạn PowerShell cho tác vụ dọn tách rời (SYSTEM): định nghĩa hàm <c>Remove-AiiAppLockerDem</c> (người gọi chạy nó) — chỉ xoá khi chính sách cục bộ rỗng hoàn toàn. Cùng điều kiện với <see cref="CanDon"/>.</summary>
    public static string KichBanPs() => string.Join("\n", new[]
    {
        "function Remove-AiiAppLockerDem {",
        "  try {",
        "    $t = Join-Path $env:WINDIR 'System32\\AppLocker'",
        "    if (-not (Test-Path -LiteralPath $t)) { return }",
        "    $tep = @(Get-ChildItem -LiteralPath $t -Filter '*.AppLocker' -File -ErrorAction SilentlyContinue)",
        "    if ($tep.Count -eq 0) { return }",
        "    [xml]$p = Get-AppLockerPolicy -Effective -Xml -ErrorAction Stop",
        "    if ($null -eq $p -or $null -eq $p.DocumentElement -or $p.DocumentElement.LocalName -ne 'AppLockerPolicy') { return }",
        "    $dung = @($p.DocumentElement.ChildNodes | Where-Object { $_ -is [Xml.XmlElement] -and $_.LocalName -eq 'RuleCollection' } | Where-Object { $_.GetAttribute('EnforcementMode') -in 'Enabled','AuditOnly' -or @($_.ChildNodes | Where-Object { $_ -is [Xml.XmlElement] -and $_.LocalName.EndsWith('Rule') }).Count -gt 0 })",
        "    if ($dung.Count -gt 0) { return }",
        "    $s = Get-Service -Name AppIDSvc -ErrorAction SilentlyContinue",
        "    $chay = $s -and $s.Status -eq 'Running'",
        "    if ($chay) { Stop-Service -Name AppIDSvc -Force -ErrorAction SilentlyContinue }",
        "    try { $tep | Remove-Item -Force -ErrorAction SilentlyContinue } finally { if ($chay) { Start-Service -Name AppIDSvc -ErrorAction SilentlyContinue } }",
        "  } catch {}",
        "}",
    });
}
