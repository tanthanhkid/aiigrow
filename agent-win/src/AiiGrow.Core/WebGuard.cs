using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace AiiGrow.Core;

// LỌC WEB theo tên miền bằng chính sách quản lý của trình duyệt (Chrome / Edge / Brave / Cốc Cốc): ghi SOFTWARE\Policies\<hãng>\<trình duyệt>\
// trong hive CỦA TÀI KHOẢN CON (HKU\<SID Con>, 0.2.6 — issue #68/S1: ghi HKLM thì chặn cả tài khoản Ba Mẹ), KHÔNG ghi HKLM nữa
// (bản cũ ghi HKLM ⇒ <see cref="WebPolicyHives"/> gỡ sạch khi nâng cấp). URLBlocklist + URLAllowlist (+ tắt chế độ ẩn danh / xoá lịch sử / khách để Con không lách). Máy chủ quyết định mọi thứ: danh sách nằm ở
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
    /// <summary>Mục trong <see cref="Cho"/> chỉ mở nhờ cửa sổ «mở» có hạn (máy chủ: windows.web.choKhiMo) và hạn đó (windows.grantEndsAt).</summary>
    public List<string> ChoKhiMo { get; set; } = new();
    public DateTimeOffset? MoDen { get; set; }

    /// <summary>Hết hạn «mở» mà chưa đồng bộ lại được (mất mạng) ⇒ trang Giải trí chỉ mở nhờ cửa sổ đó bị chặn lại, như AppLocker tự thu theo GrantEndsAt.</summary>
    public WebPolicy HetMo(DateTimeOffset now)
    {
        if (MoDen is { } den && now >= den && ChoKhiMo.Count > 0)
        {
            var bo = new HashSet<string>(ChoKhiMo, StringComparer.Ordinal);
            Cho = Cho.Where(x => !bo.Contains(x)).ToList();
            Chan = new SortedSet<string>(Chan.Concat(ChoKhiMo), StringComparer.Ordinal).ToList();
            ChoKhiMo = new();
        }
        return this;
    }

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
            JsonElement web = default, khoi = root;
            bool thay = false;
            if (root.TryGetProperty("windows", out var win) && win.ValueKind == JsonValueKind.Object && win.TryGetProperty("web", out var w1)) { web = w1; khoi = win; thay = true; }
            else if (root.TryGetProperty("web", out var w2)) { web = w2; thay = true; }
            if (!thay || web.ValueKind != JsonValueKind.Object) return null;
            var p = new WebPolicy();
            if (web.TryGetProperty("cheDo", out var c) && c.ValueKind == JsonValueKind.String && c.GetString() == ChiChoPhep) p.CheDo = ChiChoPhep;
            if (web.TryGetProperty("chan", out var ch)) p.Chan = SachDs(ch);
            if (web.TryGetProperty("cho", out var cho)) p.Cho = SachDs(cho);
            if (web.TryGetProperty("choKhiMo", out var km)) p.ChoKhiMo = SachDs(km);
            if (khoi.TryGetProperty("grantEndsAt", out var g) && g.ValueKind == JsonValueKind.String && DateTimeOffset.TryParse(g.GetString(), out var den)) p.MoDen = den;
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
        // Cốc Cốc (Chromium, phổ biến ở VN) đọc cùng bộ chính sách Chromium ở khoá riêng — thiếu thì Con mở YouTube bằng Cốc Cốc là lọt (24/10).
        new("CocCoc", @"SOFTWARE\Policies\CocCoc\Browser", "IncognitoModeAvailability"),
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
            cho.AddRange(new[] { "chrome://*", "edge://*", "brave://*", "coccoc://*" });
            if (WebPolicy.Sach(maychuHost) is { } h) cho.Add(h);
        }
        // «*» (chặn mọi trang) CHỈ thuộc chế độ «chỉ cho phép» do Ba Mẹ bật; chế độ «mở» chỉ chặn đúng các tên miền trong danh sách (Sach đã loại «*»).
        chan.AddRange(p.Chan.Where(x => p.CheDo == WebPolicy.ChiChoPhep || (x != "*" && x.Contains('.'))));
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
    /// <summary>Số giá trị CỦA AIIGROW đã thật sự xoá qua cổng này (để biết lần gỡ HKLM có gỡ gì không).</summary>
    int SoMucDaXoa => 0;
}

public sealed class WebPolicyApplier
{
    private readonly IWebPolicyRegistry _reg;
    private string? _daAp;   // dấu vân tay lần ghi cuối ⇒ không ghi registry lại khi chưa đổi

    public WebPolicyApplier(IWebPolicyRegistry reg) { _reg = reg; }

    /// <summary>Dấu vân tay của điều sẽ ghi (null ⇒ «gỡ»).</summary>
    public static string VanTay(WebPolicy? p, string? maychuHost)
    {
        var (chan, cho) = p == null ? (new List<string>(), new List<string>()) : WebPolicyKeys.Lap(p, maychuHost);
        var dau = p == null ? "gỡ" : string.Join("\n", new[] { p.CheDo }.Concat(chan).Append("|").Concat(cho));
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dau)));
    }

    /// <summary>Áp <paramref name="p"/> (null ⇒ gỡ hết). → true nếu đã ghi registry lần này.</summary>
    public bool Ap(WebPolicy? p, string? maychuHost)
    {
        var (chan, cho) = p == null ? (new List<string>(), new List<string>()) : WebPolicyKeys.Lap(p, maychuHost);
        var vt = VanTay(p, maychuHost);
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

/// <summary>Ghi registry thật (64-bit) vào HKLM (chỉ để GỠ luật bản cũ) hoặc một hive người dùng đã nạp (HKU\<SID> hoặc hive nạp tạm).
/// Chạy bằng SYSTEM (dịch vụ) hoặc Administrator (bộ gỡ).</summary>
public sealed class WindowsWebPolicyRegistry : IWebPolicyRegistry
{
    private readonly RegistryHive _hive;
    private readonly string? _goc;   // null = chính hive (HKLM); khác null = khoá con của HKU (SID hoặc tên hive nạp tạm)
    private readonly string? _sidCon;
    private readonly HashSet<string> _daKhoa = new(StringComparer.OrdinalIgnoreCase);   // khoá đã dò/khoá chặt trong lượt này   // hive người dùng: SID chủ hive ⇒ khoá chính sách ta tạo chỉ cho người đó ĐỌC (AclChinhSach)

    public WindowsWebPolicyRegistry() : this(RegistryHive.LocalMachine, null) { }
    public WindowsWebPolicyRegistry(RegistryHive hive, string? goc, string? sidCon = null) { _hive = hive; _goc = goc; _sidCon = sidCon; }

    /// <summary>Tạo/mở khoá để ghi; trong hive người dùng thì khoá chặt ACL đường SOFTWARE\Policies\… (tài khoản chuẩn chỉ đọc).</summary>
    private RegistryKey TaoKhoa(RegistryKey goc, string khoa)
    {
        // khoá chặt TRƯỚC khi ghi (khoá Con tự tạo với ACL chỉ mình Con thì CreateSubKey của SYSTEM bị từ chối) và SAU (khoá vừa tạo);
        // mỗi khoá chỉ dò một lần cho mỗi lượt ghi hive (_daKhoa) — không đọc lại ACL cả đường cho từng giá trị
        if (_sidCon != null) AclChinhSach.KhoaChat(goc, khoa, _sidCon, _daKhoa);
        var k = goc.CreateSubKey(khoa, true);
        if (_sidCon != null) AclChinhSach.KhoaChat(goc, khoa, _sidCon, _daKhoa);
        return k;
    }

    [System.Runtime.InteropServices.DllImport("userenv.dll", SetLastError = true)]
    private static extern bool RefreshPolicyEx(bool bMachine, uint dwOptions);
    private const uint RP_FORCE = 1;

    /// <summary>Báo trình duyệt đọc lại chính sách NGAY. Chrome / Edge / Cốc Cốc chỉ đọc lại registry khi nhận tín hiệu Group Policy
    /// (RegisterGPNotification) hoặc theo chu kỳ dài — ghi registry xong mà không báo thì tải lại trang vẫn vào được, phải tắt hẳn trình duyệt
    /// (Thanh thử YouTube 24/10). RefreshPolicyEx chạy xử lý chính sách cục bộ (cả máy không vào domain) rồi phát tín hiệu đó; không được thì gpupdate.
    /// → mô tả cách đã báo (để ghi log).</summary>
    public static string BaoTrinhDuyetDocLai()
    {
        // chỉ tín hiệu MÁY: dịch vụ chạy SYSTEM, RefreshPolicyEx(false) chỉ làm mới cho chính SYSTEM (review #65)
        try { if (RefreshPolicyEx(true, RP_FORCE)) return "RefreshPolicyEx"; }
        catch { }
        try
        {
            // không chờ: gpupdate có thể chạy lâu, chặn vòng áp luật / khởi động dịch vụ (giới hạn 30 giây của Windows)
            using var p = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("gpupdate.exe", "/target:computer /force")
            { CreateNoWindow = true, UseShellExecute = false, WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden });
            return p != null ? "gpupdate (chạy nền)" : "không báo được: gpupdate không chạy";
        }
        catch (Exception e) { return "không báo được: " + e.Message; }
    }

    private RegistryKey Hklm()
    {
        var b = RegistryKey.OpenBaseKey(_hive, RegistryView.Registry64);
        if (_goc == null) return b;
        using (b) return b.OpenSubKey(_goc, true) ?? throw new IOException("Hive người dùng chưa nạp: " + _goc);
    }

    public int SoMucDaXoa { get; private set; }

    private bool XoaMucCuaTa(RegistryKey k, bool dem = true)
    {
        foreach (var n in k.GetValueNames()) if (WebPolicyKeys.LaCuaTa(n)) { k.DeleteValue(n, false); if (dem) SoMucDaXoa++; }
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
        using var k = TaoKhoa(hklm, khoaDs);
        XoaMucCuaTa(k, dem: false);   // thay bằng danh sách mới, không phải «gỡ»
        for (int i = 0; i < muc.Count; i++) k.SetValue((WebPolicyKeys.ChiSoDau + 1 + i).ToString(), muc[i], RegistryValueKind.String);
    }

    public void DatDword(string khoa, string ten, int giaTri)
    {
        using var hklm = Hklm();
        using var k = TaoKhoa(hklm, khoa);
        k.SetValue(ten, giaTri, RegistryValueKind.DWord);
    }

    public void GoDword(string khoa, string ten)
    {
        using var hklm = Hklm();
        using var k = hklm.OpenSubKey(khoa, true);
        if (k?.GetValue(ten) != null) { k.DeleteValue(ten, false); SoMucDaXoa++; }
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
        return WebPolicy.Parse(cfg.LastPolicyJson)?.HetMo(now);
    }

    /// <summary>Gỡ chính sách web của AiiGrow khỏi registry: HKLM (bản cũ) + hive MỌI hồ sơ người dùng trên máy (chạy lại bao nhiêu lần cũng được).</summary>
    public static void GoChinhSach()
    {
        var host = new WindowsWebHiveHost();
        bool co = false;
        try { co = new WebPolicyApplier(host.May).GoTatCa(); } catch { }   // HKLM lỗi (IT khoá ACL…) không được chặn việc gỡ ở hive từng tài khoản
        foreach (var sid in WindowsWebHiveHost.TatCaHoSo())
        {
            try { if (host.VoiHive(sid, reg => new WebPolicyApplier(reg).GoTatCa())) co = true; }
            catch { }
        }
        // gỡ xong cũng báo trình duyệt — không thì Chrome đang mở vẫn chặn tới khi tắt hẳn (review #65)
        if (co) WindowsWebPolicyRegistry.BaoTrinhDuyetDocLai();
    }

    /// <summary>Đoạn PowerShell tương đương, nhúng vào tác vụ dọn tách rời (SYSTEM) làm lưới đỡ khi dịch vụ không gỡ được.
    /// Chỉ xoá giá trị của AiiGrow (tên số &gt; 90000 + ba cờ DWORD), giữ nguyên mục người khác đặt.</summary>
    public static string KichBanGoChinhSach()
    {
        // Gọn: một hàm Go-Web chạy cho HKLM (bản cũ) rồi từng hive hồ sơ — kịch bản đi qua -EncodedCommand trong tham số tác vụ (giới hạn ~32K ký tự), không lặp danh sách.
        var wb = string.Join(",", WebPolicyKeys.TatCa.Select(t => "'" + t.Khoa + "'"));
        var dw = string.Join(",", WebPolicyKeys.TatCa.SelectMany(t => WebPolicyKeys.Co(t).Select(c => "'" + t.Khoa + "|" + c.Ten + "'")).Distinct());
        return string.Join("\n", new[]
        {
            "$wb=@(" + wb + ")",
            "$wd=@(" + dw + ")",
            "function Go-Web($g){",
            "  foreach($b in $wb){",
            "    foreach($l in '" + WebPolicyKeys.DsChan + "','" + WebPolicyKeys.DsCho + "'){",
            "      $k=\"$g\\$b\\$l\"",
            "      if(Test-Path -LiteralPath $k){",
            "        (Get-Item -LiteralPath $k).GetValueNames() | Where-Object { $_ -match '^\\d+$' -and [int64]$_ -gt " + WebPolicyKeys.ChiSoDau + " } | ForEach-Object { Remove-ItemProperty -LiteralPath $k -Name $_ }",
            "        if(@((Get-Item -LiteralPath $k).GetValueNames()).Count -eq 0){ Remove-Item -LiteralPath $k -Force }",
            "      }",
            "    }",
            "  }",
            "  foreach($d in $wd){ $p=$d.Split('|'); $k=\"$g\\\" + $p[0]; if(Test-Path -LiteralPath $k){ Remove-ItemProperty -LiteralPath $k -Name $p[1] } }",
            "  foreach($b in $wb){ $k=\"$g\\$b\"; if((Test-Path -LiteralPath $k) -and @((Get-Item -LiteralPath $k).GetValueNames()).Count -eq 0 -and @(Get-ChildItem -LiteralPath $k).Count -eq 0){ Remove-Item -LiteralPath $k -Force } }",
            "}",
            "Go-Web 'HKLM:'",
            // 0.2.6: luật web nằm trong hive từng tài khoản (HKU\\<SID>) — duyệt mọi hồ sơ (đang nạp, hoặc nạp tạm NTUSER.DAT), gỡ cùng các giá trị trên
            "$pl='HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList'",
            "foreach($s in @(Get-ChildItem -LiteralPath $pl -ErrorAction SilentlyContinue | ForEach-Object { $_.PSChildName } | Where-Object { $_ -like 'S-1-5-21-*' -or $_ -like 'S-1-12-1-*' })){",
            "  $goc=\"Registry::HKEY_USERS\\$s\"; $nap=$false",
            "  if(-not (Test-Path -LiteralPath $goc)){",
            "    $d=(Get-ItemProperty -LiteralPath \"$pl\\$s\" -ErrorAction SilentlyContinue).ProfileImagePath; if(-not $d){ continue }",
            "    $f=[Environment]::ExpandEnvironmentVariables($d)+'\\NTUSER.DAT'; if(-not (Test-Path -LiteralPath $f)){ continue }",
            // tên tạm riêng mỗi SID: một hive gỡ nạp hỏng không chặn các hồ sơ sau; gỡ nạp thử lại tới 10 lần (handle của Get-Item còn mở)
            "    $t=\"AiiGrowGo_$s\"; reg.exe load \"HKU\\$t\" $f | Out-Null; if($LASTEXITCODE -ne 0){ continue }",
            "    $goc=\"Registry::HKEY_USERS\\$t\"; $nap=$true",
            "  }",
            "  Go-Web $goc",
            "  if($nap){ for($i=0;$i -lt 10;$i++){ [gc]::Collect(); [gc]::WaitForPendingFinalizers(); reg.exe unload \"HKU\\$t\" 2>$null | Out-Null; if($LASTEXITCODE -eq 0){ break }; Start-Sleep -Milliseconds 300 } }",
            "}",
            // báo trình duyệt đang mở đọc lại chính sách (không thì vẫn chặn tới khi tắt hẳn)
            "try { gpupdate.exe /target:computer /force | Out-Null } catch { }",
        });
    }
}
