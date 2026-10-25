using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>DNS gia đình đã đặt lúc cài (lưu trong cấu hình) — để gỡ đúng phần của mình khi gỡ AiiGrow.</summary>
public sealed class DnsGiaDinhDaDat
{
    /// <summary>IP resolver AiiGrow đã đặt cho các card mạng (kèm mẫu DoH).</summary>
    public List<string> Ipv4 { get; set; } = new();
    public string MauDoh { get; set; } = "";
    /// <summary>DNS tĩnh CŨ của từng card mạng (khoá = InterfaceGuid, giá trị = NameServer trong registry; rỗng = tự động qua DHCP).
    /// Gỡ ⇒ card nào còn đúng IP của AiiGrow thì trả lại giá trị này.</summary>
    public Dictionary<string, string> DnsCu { get; set; } = new();
    public DateTimeOffset Luc { get; set; }
}

/// <summary>Phần <c>windows</c> của <c>GET /api/device/ho-so-dns</c> (server/lib/ho-so-dns.ts › mauDohWindows).</summary>
public sealed class HoSoDnsWindows
{
    public string? MauDoh { get; set; }
    public List<string> Ipv4 { get; set; } = new();
}

/// <summary>Kết quả bước «DNS gia đình» của trình cài (chữ để ghi log).</summary>
public enum KetQuaDns { DaDat, KhongCoHoSo, KhongHoTro, Loi }

/// <summary>
/// DNS gia đình trên Windows (BANG-TINH-NANG-OS mục 10): trình cài lấy hồ sơ từ máy chủ (<c>GET /api/device/ho-so-dns</c>), đăng ký mẫu DoH cho IP resolver
/// (<c>Add-DnsClientDohServerAddress</c>, Windows 11 / Server 2022+) rồi đặt IP đó làm DNS cho các card mạng vật lý. Gỡ AiiGrow ⇒ trả DNS cũ của card + bỏ mẫu DoH.
/// Không đụng trình duyệt: Chrome / Edge của Con đã tắt DoH riêng bằng chính sách (WebGuard: DnsOverHttpsMode=off) ⇒ dùng DNS của Windows, luật chặn
/// URLBlocklist vẫn áp như cũ. Máy chủ chưa có IP resolver (NextDNS, chưa cấu hình) ⇒ bỏ qua, không đổi gì. Lớp THUẦN: dựng kịch bản PowerShell, đọc kết quả.
/// </summary>
public static class DnsGiaDinh
{
    public const string DuongHoSo = "api/device/ho-so-dns";
    private const string TienToCu = "DNSCU=";

    /// <summary>Đọc phần <c>windows</c> của hồ sơ; JSON lạ ⇒ null.</summary>
    public static HoSoDnsWindows? DocHoSo(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Object || !doc.RootElement.TryGetProperty("windows", out var w) || w.ValueKind != JsonValueKind.Object) return null;
            return w.Deserialize<HoSoDnsWindows>(Json.Options);
        }
        catch (JsonException) { return null; }
    }

    /// <summary>Hồ sơ dùng được: mẫu DoH https không có ký tự lạ + ít nhất một IPv4 hợp lệ (bỏ trùng, tối đa 4). null ⇒ không đặt gì.</summary>
    public static (List<string> Ipv4, string MauDoh)? KiemHoSo(HoSoDnsWindows? h)
    {
        var doh = (h?.MauDoh ?? "").Trim();
        if (!Uri.TryCreate(doh, UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps || doh.Any(c => char.IsWhiteSpace(c) || c is '\'' or '"' or '`' or '$' or ';')) return null;
        var ips = new List<string>();
        foreach (var x in h!.Ipv4 ?? new())
        {
            var t = (x ?? "").Trim();
            if (IPAddress.TryParse(t, out var ip) && ip.AddressFamily == AddressFamily.InterNetwork && ip.ToString() == t && !ips.Contains(t)) ips.Add(t);
        }
        return ips.Count == 0 ? null : (ips.Take(4).ToList(), doh);
    }

    private static string MangPs(IEnumerable<string> ds) => "@(" + string.Join(",", ds.Select(Shell.PsQuote)) + ")";

    // NameServer tĩnh của một card (registry Tcpip; rỗng = DHCP). Dấu phân cách: phẩy (Win10+) hoặc khoảng trắng.
    private const string HamNameServer =
        "function NS($g) { $k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\' + $g; " +
        "try { [string](Get-ItemPropertyValue -Path $k -Name NameServer -ErrorAction Stop) } catch { '' } }; ";

    /// <summary>Kịch bản đặt: ghi lại DNS tĩnh cũ từng card (in một dòng <c>DNSCU={json}</c>), đăng ký DoH cho từng IP, đặt IP cho mọi card vật lý.
    /// Windows không có lệnh DoH (Win 10) ⇒ in KHONG_HO_TRO, thoát 3, không đổi gì.</summary>
    public static string KichBanDat(IReadOnlyList<string> ipv4, string mauDoh)
    {
        var sb = new StringBuilder();
        sb.Append("if (-not (Get-Command Add-DnsClientDohServerAddress -ErrorAction SilentlyContinue)) { Write-Output 'KHONG_HO_TRO'; exit 3 }; ");
        sb.Append("$ips = ").Append(MangPs(ipv4)).Append("; $doh = ").Append(Shell.PsQuote(mauDoh)).Append("; ");
        sb.Append(HamNameServer);
        sb.Append("$cu = @{}; foreach ($a in @(Get-NetAdapter -Physical)) { $cu[[string]$a.InterfaceGuid] = NS ([string]$a.InterfaceGuid) }; ");
        sb.Append("Write-Output ('").Append(TienToCu).Append("' + (ConvertTo-Json -InputObject $cu -Compress)); ");
        sb.Append("foreach ($ip in $ips) { ");
        sb.Append("Get-DnsClientDohServerAddress -ServerAddress $ip -ErrorAction SilentlyContinue | Remove-DnsClientDohServerAddress -ErrorAction SilentlyContinue | Out-Null; ");
        sb.Append("Add-DnsClientDohServerAddress -ServerAddress $ip -DohTemplate $doh -AllowFallbackToUdp $False -AutoUpgrade $True | Out-Null }; ");
        sb.Append("Get-NetAdapter -Physical | Set-DnsClientServerAddress -ServerAddresses $ips; ");
        sb.Append("Clear-DnsClientCache");
        return sb.ToString();
    }

    /// <summary>Đọc DNS cũ từ kết quả kịch bản đặt, gộp với lần cài trước: card đang mang đúng IP của AiiGrow (cài lại) thì giữ giá trị cũ đã lưu
    /// (không có ⇒ coi là DHCP) — không bao giờ lưu IP của chính AiiGrow làm «DNS cũ».</summary>
    public static Dictionary<string, string> DocDnsCu(string? output, IReadOnlyList<string> ipv4, IReadOnlyDictionary<string, string>? truoc)
    {
        var kq = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var dong = (output ?? "").Split('\n').Select(x => x.Trim()).FirstOrDefault(x => x.StartsWith(TienToCu, StringComparison.Ordinal));
        if (dong != null)
        {
            try
            {
                using var doc = JsonDocument.Parse(dong[TienToCu.Length..]);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                    foreach (var p in doc.RootElement.EnumerateObject())
                        kq[p.Name] = p.Value.ValueKind == JsonValueKind.String ? p.Value.GetString() ?? "" : "";
            }
            catch (JsonException) { }
        }
        foreach (var k in kq.Keys.ToList())
            if (LaCuaAiiGrow(kq[k], ipv4)) kq[k] = truoc != null && truoc.TryGetValue(k, out var v) && !LaCuaAiiGrow(v, ipv4) ? v : "";
        return kq;
    }

    /// <summary>Danh sách NameServer (phẩy / khoảng trắng) đúng là các IP của AiiGrow.</summary>
    public static bool LaCuaAiiGrow(string? nameServer, IReadOnlyList<string> ipv4)
    {
        var ds = (nameServer ?? "").Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries);
        return ds.Length > 0 && ds.SequenceEqual(ipv4);
    }

    /// <summary>Kịch bản gỡ: card nào còn đúng IP của AiiGrow ⇒ trả DNS tĩnh cũ (hoặc về DHCP); bỏ mẫu DoH AiiGrow đã đăng ký (chỉ khi mẫu còn là của mình).
    /// Chạy lại an toàn; card đã bị đổi DNS tay thì giữ nguyên.</summary>
    public static string KichBanGo(DnsGiaDinhDaDat d)
    {
        var sb = new StringBuilder();
        sb.Append("$ips = ").Append(MangPs(d.Ipv4)).Append("; $doh = ").Append(Shell.PsQuote(d.MauDoh)).Append("; ");
        sb.Append("$cu = ConvertFrom-Json ").Append(Shell.PsQuote(JsonSerializer.Serialize(d.DnsCu))).Append("; ");
        sb.Append(HamNameServer);
        sb.Append("foreach ($a in @(Get-NetAdapter -Physical)) { $g = [string]$a.InterfaceGuid; ");
        sb.Append("$ns = @((NS $g) -split '[, ]' | Where-Object { $_ }); ");
        sb.Append("if (($ns -join ',') -eq ($ips -join ',')) { $old = [string]$cu.$g; ");
        sb.Append("if ($old) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses @($old -split '[, ]' | Where-Object { $_ }) } ");
        sb.Append("else { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses } } }; ");
        sb.Append("if (Get-Command Get-DnsClientDohServerAddress -ErrorAction SilentlyContinue) { foreach ($ip in $ips) { ");
        sb.Append("$x = Get-DnsClientDohServerAddress -ServerAddress $ip -ErrorAction SilentlyContinue; ");
        sb.Append("if ($x -and $x.DohTemplate -eq $doh) { Remove-DnsClientDohServerAddress -ServerAddress $ip | Out-Null } } }; ");
        sb.Append("Clear-DnsClientCache");
        return sb.ToString();
    }

    /// <summary>Bước «DNS gia đình» của trình cài: hỏi hồ sơ (<paramref name="layHoSo"/> = GET ho-so-dns bằng token máy), đặt, lưu vào cấu hình.
    /// Mọi lỗi chỉ ghi log — không chặn việc cài. <paramref name="chay"/> = chạy PowerShell (thay được trong test).</summary>
    public static async Task<(KetQuaDns Kq, string Chu)> DatKhiCaiAsync(ConfigStore store, Func<Task<string>> layHoSo, Func<string, ShellResult> chay)
    {
        string raw;
        try { raw = await layHoSo(); }
        catch (Exception e) { return (KetQuaDns.Loi, "Chưa lấy được hồ sơ DNS gia đình: " + e.Message); }
        var ok = KiemHoSo(DocHoSo(raw));
        if (ok == null) return (KetQuaDns.KhongCoHoSo, "Máy chủ chưa có DNS gia đình cho Windows — bỏ qua.");
        var (ips, doh) = ok.Value;
        var r = chay(KichBanDat(ips, doh));
        if (r.ExitCode == 3 || r.Output.Contains("KHONG_HO_TRO")) return (KetQuaDns.KhongHoTro, "Windows này chưa hỗ trợ DNS mã hoá (cần Windows 11) — bỏ qua.");
        // Lỗi giữa chừng vẫn lưu (mẫu DoH có thể đã đăng ký một phần) ⇒ gỡ cài dọn được. Kịch bản gỡ chạy lại an toàn.
        AgentConfig? cfg = null;
        try { cfg = store.Load(); } catch { }
        if (cfg != null)
        {
            var truoc = cfg.DnsGiaDinh?.DnsCu;
            cfg.DnsGiaDinh = new DnsGiaDinhDaDat { Ipv4 = ips, MauDoh = doh, DnsCu = DocDnsCu(r.Output, ips, truoc), Luc = DateTimeOffset.UtcNow };
            store.Save(cfg);
        }
        return r.Ok ? (KetQuaDns.DaDat, $"Đã đặt DNS gia đình ({string.Join(", ", ips)}).") : (KetQuaDns.Loi, "Đặt DNS gia đình lỗi: " + FileLog.ChePhanBiMat(r.Error.Trim()));
    }
}

/// <summary>Thực thi gỡ DNS gia đình (tách khỏi <see cref="ICleanupOps"/> để bản giả trong test không phải cài).</summary>
public interface IDnsCleanup
{
    /// <summary>Trả DNS cũ của card mạng + bỏ mẫu DoH AiiGrow đã đặt lúc cài (đọc <see cref="AgentConfig.DnsGiaDinh"/>). Không có gì đã đặt ⇒ không làm gì.</summary>
    void GoDnsGiaDinh();
}
