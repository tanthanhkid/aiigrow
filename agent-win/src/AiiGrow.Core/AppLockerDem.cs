using System.Xml.Linq;

namespace AiiGrow.Core;

/// <summary>
/// Tệp đệm AppLocker cũ (<c>%WINDIR%\System32\AppLocker\*</c>). Máy từng cài bản cũ, gỡ rồi cài lại: chính sách hiệu lực đã RỖNG
/// (<c>Get-AppLockerPolicy -Effective -Xml</c> chỉ còn <c>&lt;AppLockerPolicy Version="1" /&gt;</c>) nhưng tệp đệm vẫn còn (vd <c>Exe.AppLocker</c> 3220 byte) ⇒
/// Windows vẫn coi Exe đang áp mà nhóm Appx không có luật ⇒ chặn mọi gói Store (Start, Search) với mọi tài khoản, khởi động lại cũng không hết.
/// Xoá thư mục đệm rồi nạp lại thì Start mở lại. CHỈ dọn khi chính sách không còn luật nào và không nhóm nào còn bật — máy có quản trị đặt luật riêng thì không đụng.
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

    /// <summary>Số tệp còn trong thư mục đệm (tính cả thư mục con).</summary>
    public static int SoTepDem(string? thuMuc = null)
    {
        try
        {
            var t = thuMuc ?? ThuMucMacDinh;
            return Directory.Exists(t) ? Directory.EnumerateFiles(t, "*", SearchOption.AllDirectories).Count() : 0;
        }
        catch { return 0; }
    }

    /// <summary>Cần dọn: chính sách đọc được và rỗng, mà thư mục đệm còn tệp. <paramref name="docLoi"/> ⇒ không đụng.</summary>
    public static bool CanDon(bool docLoi, string? xml, string? thuMuc = null) => !docLoi && ChinhSachRong(xml) && SoTepDem(thuMuc) > 0;

    /// <summary>Xoá nội dung thư mục đệm (giữ lại chính thư mục). Trả số tệp đã xoá; tệp bị khoá thì bỏ qua (lần sau dọn nốt).</summary>
    public static int Xoa(string? thuMuc = null)
    {
        var t = thuMuc ?? ThuMucMacDinh;
        var da = 0;
        if (!Directory.Exists(t)) return 0;
        foreach (var f in Directory.EnumerateFiles(t, "*", SearchOption.AllDirectories).ToList())
        {
            try { File.SetAttributes(f, FileAttributes.Normal); File.Delete(f); da++; } catch { }
        }
        foreach (var sub in Directory.EnumerateDirectories(t).ToList())
        {
            try { Directory.Delete(sub, true); } catch { }
        }
        return da;
    }

    /// <summary>Dọn thật trên máy: dừng AppIDSvc (nó giữ tệp), lấy quyền thư mục nếu cần, xoá đệm, bật lại AppIDSvc để nạp chính sách rỗng.
    /// Trả số tệp đã xoá (0 = không có gì để xoá hoặc bị khoá hết).</summary>
    public static int DonTrenMay()
    {
        Shell.PowerShell("try { Stop-Service -Name AppIDSvc -Force -ErrorAction Stop } catch {}", 60000);
        var n = Xoa();
        if (SoTepDem() > 0)
        {
            // thư mục thuộc TrustedInstaller / quyền hẹp ⇒ lấy quyền quản trị rồi xoá lại
            var t = ThuMucMacDinh;
            Shell.Run("takeown.exe", new[] { "/f", t, "/r", "/d", "y" }, 60000);
            Shell.Run("icacls.exe", new[] { t, "/grant", "*S-1-5-32-544:(OI)(CI)F", "/t", "/c" }, 60000);
            n += Xoa();
        }
        Shell.PowerShell("try { Set-Service -Name AppIDSvc -StartupType Automatic } catch {}; try { Start-Service -Name AppIDSvc } catch {}", 60000);
        return n;
    }

    /// <summary>Đoạn PowerShell cho tác vụ dọn tách rời (SYSTEM): định nghĩa hàm <c>Remove-AiiAppLockerDem</c> (người gọi chạy nó) — chỉ xoá khi chính sách cục bộ rỗng hoàn toàn. Cùng điều kiện với <see cref="CanDon"/>.</summary>
    public static string KichBanPs() => string.Join("\n", new[]
    {
        "function Remove-AiiAppLockerDem {",
        "  try {",
        "    $t = Join-Path $env:WINDIR 'System32\\AppLocker'",
        "    if (-not (Test-Path -LiteralPath $t)) { return }",
        "    [xml]$p = Get-AppLockerPolicy -Local -Xml -ErrorAction Stop",
        "    if ($null -eq $p -or $null -eq $p.DocumentElement -or $p.DocumentElement.LocalName -ne 'AppLockerPolicy') { return }",
        "    $dung = @($p.DocumentElement.ChildNodes | Where-Object { $_ -is [Xml.XmlElement] -and $_.LocalName -eq 'RuleCollection' } | Where-Object { $_.GetAttribute('EnforcementMode') -in 'Enabled','AuditOnly' -or @($_.ChildNodes | Where-Object { $_ -is [Xml.XmlElement] -and $_.LocalName.EndsWith('Rule') }).Count -gt 0 })",
        "    if ($dung.Count -gt 0) { return }",
        "    Stop-Service -Name AppIDSvc -Force -ErrorAction SilentlyContinue",
        "    Remove-Item -LiteralPath (Join-Path $t '*') -Recurse -Force -ErrorAction SilentlyContinue",
        "    if (@(Get-ChildItem -LiteralPath $t -Recurse -Force -ErrorAction SilentlyContinue).Count -gt 0) { & takeown.exe /f $t /r /d y | Out-Null; & icacls.exe $t /grant '*S-1-5-32-544:(OI)(CI)F' /t /c | Out-Null; Remove-Item -LiteralPath (Join-Path $t '*') -Recurse -Force -ErrorAction SilentlyContinue }",
        "    Start-Service -Name AppIDSvc -ErrorAction SilentlyContinue",
        "  } catch {}",
        "}",
    });
}
