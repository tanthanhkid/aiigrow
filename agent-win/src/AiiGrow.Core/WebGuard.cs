using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace AiiGrow.Core;

// LỌC WEB theo tên miền bằng chính sách quản lý của trình duyệt (Chrome / Edge / Brave): ghi HKLM\SOFTWARE\Policies\<hãng>\<trình duyệt>\
// URLBlocklist + URLAllowlist (+ tắt chế độ ẩn danh / xoá lịch sử / khách để Con không lách). Máy chủ quyết định mọi thứ: danh sách nằm ở
// `dong-bo.windows.web` = {cheDo: mo|chi_cho_phep, chan[], cho[]} (server/lib/web.ts); agent chỉ áp.
//   • CHỈ áp khi chế độ hiệu lực là «chan» (Ba Mẹ chọn «Chặn thật»). Giám sát / máy mồ côi / đang gỡ / Con mở tạm bằng mã offline ⇒ GỠ hết.
//   • Chỉ đụng giá trị CỦA AIIGROW: tên số ≥ 90000 trong hai danh sách (mục Ba Mẹ/IT đặt sẵn tên 1,2,3… giữ nguyên) + ba cờ DWORD bên dưới.
//   • Gỡ AiiGrow (từ xa / tại máy / tác vụ dọn tách rời) đều xoá chính sách này (xem IWebCleanup + KichBanGoChinhSach).
// Phần THUẦN (parse, lập kế hoạch, áp qua IWebPolicyRegistry) test được ngoài Windows; ghi registry thật nằm ở WindowsWebPolicyRegistry.

/// <summary>Chính sách web máy chủ gửi (dong-bo.windows.web).</summary>
public sealed class WebPolicy
{
    public const string Mo = "mo";
    public const string ChiChoPhep = "chi_cho_phep";
    public string CheDo { get; set; } = Mo;
    public List<string> Chan { get; set; } = new();
    public List<string> Cho { get; set; } = new();

    private static readonly Regex TenMien = new(@"^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$", RegexOptions.Compiled);

    /// <summary>Chuẩn hoá một mục: chữ thường, bỏ «*.» / «.» đầu, phải là tên miền có dấu chấm. Sai ⇒ null.</summary>
    public static string? Sach(string? s)
    {
        var t = (s ?? "").Trim().ToLowerInvariant();
        while (t.StartsWith("*.") || t.StartsWith(".")) t = t.TrimStart('*').TrimStart('.');
        return t.Length is > 3 and <= 100 && t.Contains('.') && TenMien.IsMatch(t) && !t.Contains("..") ? t : null;
    }

    private static List<string> SachDs(JsonElement e)
    {
        var ds = new SortedSet<string>(StringComparer.Ordinal);
        if (e.ValueKind == JsonValueKind.Array)
            foreach (var x in e.EnumerateArray())
                if (x.ValueKind == JsonValueKind.String && Sach(x.GetString()) is { } t) ds.Add(t);
        return ds.ToList();
    }

    /// <summary>Đọc từ JSON đồng bộ cuối (AgentConfig.LastPolicyJson = cả phản hồi dong-bo: windows.web) hoặc từ chính khối windows. Không có ⇒ null.</summary>
    public static WebPolicy? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;
            JsonElement web = default;
            bool thay = false;
            if (root.TryGetProperty("windows", out var win) && win.ValueKind == JsonValueKind.Object && win.TryGetProperty("web", out var w1)) { web = w1; thay = true; }
            else if (root.TryGetProperty("web", out var w2)) { web = w2; thay = true; }
            if (!thay || web.ValueKind != JsonValueKind.Object) return null;
            var p = new WebPolicy();
            if (web.TryGetProperty("cheDo", out var c) && c.ValueKind == JsonValueKind.String && c.GetString() == ChiChoPhep) p.CheDo = ChiChoPhep;
            if (web.TryGetProperty("chan", out var ch)) p.Chan = SachDs(ch);
            if (web.TryGetProperty("cho", out var cho)) p.Cho = SachDs(cho);
            return p;
        }
        catch (JsonException) { return null; }
    }
}

/// <summary>Hằng số chính sách trình duyệt + dựng kế hoạch ghi.</summary>
public static class WebPolicyKeys
{
    /// <summary>Tên giá trị danh sách của AiiGrow bắt đầu từ đây (90001, 90002…) — không đụng 1,2,3… của người khác.</summary>
    public const int ChiSoDau = 90000;
    public const int TranMuc = 900;   // Chrome giới hạn 1000 mục mỗi danh sách
    public const string DsChan = "URLBlocklist";
    public const string DsCho = "URLAllowlist";

    public sealed record TrinhDuyet(string Ten, string Khoa, string CoAn);
    public static readonly TrinhDuyet[] TatCa =
    {
        new("Chrome", @"SOFTWARE\Policies\Google\Chrome", "IncognitoModeAvailability"),
        new("Edge", @"SOFTWARE\Policies\Microsoft\Edge", "InPrivateModeAvailability"),
        new("Brave", @"SOFTWARE\Policies\BraveSoftware\Brave", "IncognitoModeAvailability"),
    };

    /// <summary>Cờ DWORD (tên → giá trị) AiiGrow đặt trong chế độ chặn: không ẩn danh, không xoá lịch sử, không chế độ khách ⇒ lịch sử web luôn đủ.</summary>
    public static IReadOnlyList<(string Ten, int GiaTri)> Co(TrinhDuyet t) => new[]
    {
        (t.CoAn, 1), ("AllowDeletingBrowserHistory", 0), ("BrowserGuestModeEnabled", 0),
    };

    public static bool LaCuaTa(string tenGiaTri) => int.TryParse(tenGiaTri, out var n) && n > ChiSoDau;

    /// <summary>Mục pattern trình duyệt hiểu: tên miền (gồm tên miền con), «*» = tất cả; scheme nội bộ để giao diện trình duyệt không vỡ.</summary>
    public static (List<string> Chan, List<string> Cho) Lap(WebPolicy p, string? maychuHost)
    {
        var chan = new List<string>();
        var cho = new List<string>();
        if (p.CheDo == WebPolicy.ChiChoPhep)
        {
            chan.Add("*");
            cho.AddRange(new[] { "chrome://*", "edge://*", "brave://*" });
            if (WebPolicy.Sach(maychuHost) is { } h) cho.Add(h);
        }
        chan.AddRange(p.Chan);
        cho.AddRange(p.Cho);
        return (chan.Distinct().Take(TranMuc).ToList(), cho.Distinct().Take(TranMuc).ToList());
    }
}

/// <summary>Cổng registry (tách để test bằng bản giả).</summary>
public interface IWebPolicyRegistry
{
    /// <summary>Thay mọi mục CỦA AIIGROW trong danh sách bằng <paramref name="muc"/>; rỗng ⇒ gỡ mục của mình (xoá khoá nếu trống).</summary>
    void DatDanhSach(string khoaDs, IReadOnlyList<string> muc);
    void DatDword(string khoa, string ten, int giaTri);
    void GoDword(string khoa, string ten);
    /// <summary>Xoá khoá nếu không còn giá trị / khoá con nào.</summary>
    void GoKhoaNeuTrong(string khoa);
}

public sealed class WebPolicyApplier
{
    private readonly IWebPolicyRegistry _reg;
    private string? _daAp;   // dấu vân tay lần ghi cuối ⇒ không ghi registry lại khi chưa đổi

    public WebPolicyApplier(IWebPolicyRegistry reg) { _reg = reg; }

    /// <summary>Áp <paramref name="p"/> (null ⇒ gỡ hết). → true nếu đã ghi registry lần này.</summary>
    public bool Ap(WebPolicy? p, string? maychuHost)
    {
        var (chan, cho) = p == null ? (new List<string>(), new List<string>()) : WebPolicyKeys.Lap(p, maychuHost);
        var dau = p == null ? "gỡ" : string.Join("\n", new[] { p.CheDo }.Concat(chan).Append("|").Concat(cho));
        var vt = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dau)));
        if (vt == _daAp) return false;
        try
        {
            foreach (var t in WebPolicyKeys.TatCa)
            {
                _reg.DatDanhSach(t.Khoa + "\\" + WebPolicyKeys.DsChan, chan);
                _reg.DatDanhSach(t.Khoa + "\\" + WebPolicyKeys.DsCho, cho);
                foreach (var (ten, gt) in WebPolicyKeys.Co(t))
                {
                    if (p == null) _reg.GoDword(t.Khoa, ten); else _reg.DatDword(t.Khoa, ten, gt);
                }
                if (p == null) _reg.GoKhoaNeuTrong(t.Khoa);
            }
        }
        catch { _daAp = null; throw; }   // lần sau thử lại
        _daAp = vt;
        return true;
    }

    /// <summary>Gỡ hết (giám sát, mồ côi, gỡ AiiGrow).</summary>
    public bool GoTatCa() => Ap(null, null);
}

/// <summary>Ghi registry thật (HKLM 64-bit). Chạy bằng SYSTEM (dịch vụ) hoặc Administrator (bộ gỡ).</summary>
public sealed class WindowsWebPolicyRegistry : IWebPolicyRegistry
{
    private static RegistryKey Hklm() => RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64);

    private static bool XoaMucCuaTa(RegistryKey k)
    {
        foreach (var n in k.GetValueNames()) if (WebPolicyKeys.LaCuaTa(n)) k.DeleteValue(n, false);
        return k.GetValueNames().Length == 0 && k.SubKeyCount == 0;
    }

    public void DatDanhSach(string khoaDs, IReadOnlyList<string> muc)
    {
        using var hklm = Hklm();
        if (muc.Count == 0)
        {
            bool trong;
            using (var k0 = hklm.OpenSubKey(khoaDs, true))
            {
                if (k0 == null) return;
                trong = XoaMucCuaTa(k0);
            }
            if (trong) hklm.DeleteSubKey(khoaDs, false);
            return;
        }
        using var k = hklm.CreateSubKey(khoaDs, true);
        XoaMucCuaTa(k);
        for (int i = 0; i < muc.Count; i++) k.SetValue((WebPolicyKeys.ChiSoDau + 1 + i).ToString(), muc[i], RegistryValueKind.String);
    }

    public void DatDword(string khoa, string ten, int giaTri)
    {
        using var hklm = Hklm();
        using var k = hklm.CreateSubKey(khoa, true);
        k.SetValue(ten, giaTri, RegistryValueKind.DWord);
    }

    public void GoDword(string khoa, string ten)
    {
        using var hklm = Hklm();
        using var k = hklm.OpenSubKey(khoa, true);
        k?.DeleteValue(ten, false);
    }

    public void GoKhoaNeuTrong(string khoa)
    {
        using var hklm = Hklm();
        bool trong;
        using (var k = hklm.OpenSubKey(khoa, false))
        {
            if (k == null) return;
            trong = k.GetValueNames().Length == 0 && k.SubKeyCount == 0;
        }
        if (trong) hklm.DeleteSubKey(khoa, false);
    }
}

/// <summary>Bước gỡ chính sách web trong luồng gỡ AiiGrow (ICleanupOps không có thì bỏ qua — bản giả trong test).</summary>
public interface IWebCleanup
{
    void GoChinhSachWeb();
}

public static class WebGuard
{
    /// <summary>Quyết định THUẦN cần áp gì từ cấu hình đã lưu: null ⇒ gỡ hết. Chỉ chặn khi chế độ hiệu lực là «chan» (máy chủ thắng cục bộ, mồ côi ⇒ giám sát),
    /// không đang gỡ, và Con không đang mở tạm bằng mã offline Ba Mẹ đọc.</summary>
    public static WebPolicy? CanAp(AgentConfig? cfg, bool dangGo, DateTimeOffset now)
    {
        if (cfg is not { Paired: true } || dangGo) return null;
        var moCoi = MoCoi.La(cfg, now);
        if (moCoi || !CheDoHieuLuc.LaChan(CheDoHieuLuc.Chon(null, cfg.CheDo, moCoi))) return null;
        if (cfg.MoTamOffline?.IsUnlocked(now) == true) return null;
        return WebPolicy.Parse(cfg.LastPolicyJson);
    }

    /// <summary>Gỡ chính sách web của AiiGrow khỏi registry (chạy lại bao nhiêu lần cũng được).</summary>
    public static void GoChinhSach() => new WebPolicyApplier(new WindowsWebPolicyRegistry()).GoTatCa();

    /// <summary>Đoạn PowerShell tương đương, nhúng vào tác vụ dọn tách rời (SYSTEM) làm lưới đỡ khi dịch vụ không gỡ được.
    /// Chỉ xoá giá trị của AiiGrow (tên số &gt; 90000 + ba cờ DWORD), giữ nguyên mục người khác đặt.</summary>
    public static string KichBanGoChinhSach()
    {
        var dw = string.Join(",", WebPolicyKeys.TatCa.SelectMany(t => WebPolicyKeys.Co(t).Select(c => "'" + t.Khoa + "|" + c.Ten + "'")).Distinct());
        return string.Join("\n", new[]
        {
            "foreach($b in " + string.Join(",", WebPolicyKeys.TatCa.Select(t => "'" + t.Khoa + "'")) + "){",
            "  foreach($l in '" + WebPolicyKeys.DsChan + "','" + WebPolicyKeys.DsCho + "'){",
            "    $k=\"HKLM:\\$b\\$l\"",
            "    if(Test-Path -LiteralPath $k){",
            "      (Get-Item -LiteralPath $k).GetValueNames() | Where-Object { $_ -match '^\\d+$' -and [int64]$_ -gt " + WebPolicyKeys.ChiSoDau + " } | ForEach-Object { Remove-ItemProperty -LiteralPath $k -Name $_ }",
            "      if(@((Get-Item -LiteralPath $k).GetValueNames()).Count -eq 0){ Remove-Item -LiteralPath $k -Force }",
            "    }",
            "  }",
            "}",
            "foreach($d in " + dw + "){ $p=$d.Split('|'); $k=\"HKLM:\\\" + $p[0]; if(Test-Path -LiteralPath $k){ Remove-ItemProperty -LiteralPath $k -Name $p[1] } }",
            "foreach($b in " + string.Join(",", WebPolicyKeys.TatCa.Select(t => "'" + t.Khoa + "'")) + "){ $k=\"HKLM:\\$b\"; if((Test-Path -LiteralPath $k) -and @((Get-Item -LiteralPath $k).GetValueNames()).Count -eq 0 -and @(Get-ChildItem -LiteralPath $k).Count -eq 0){ Remove-Item -LiteralPath $k -Force } }",
        });
    }
}
