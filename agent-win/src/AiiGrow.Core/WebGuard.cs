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

    /// <summary>Cờ CHUỖI AiiGrow đặt trong chế độ chặn (chỉ ở hive Con — bản cũ không ghi HKLM nên KHÔNG dùng làm dấu bản cũ):
    /// tắt DNS-over-HTTPS của trình duyệt ⇒ trình duyệt hỏi DNS qua hệ thống (lọc DNS/hosts của máy, nếu có, không bị vượt). URLBlocklist
    /// không phụ thuộc DNS nên DoH/proxy/VPN không lách được danh sách web; cờ này là lớp đỡ thêm.</summary>
    public static IReadOnlyList<(string Ten, string GiaTri)> CoChuoi(TrinhDuyet t) => new[] { ("DnsOverHttpsMode", "off") };

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
        // «*» (chặn mọi trang) CHỈ thuộc chế độ «chỉ cho phép»; p.Chan đã qua WebPolicy.Sach (loại «*» và mục không có dấu chấm). Lỗi «chặn mọi trang»
        // ở tài khoản Ba Mẹ (#68 S1) là do luật ghi vào HKLM — đã sửa bằng ghi theo hive Con (WebHives.cs), không phải ở đây.
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
    /// <summary>Số giá trị CỦA AIIGROW đã thật sự xoá qua cổng này (để biết lần gỡ HKLM có gỡ gì không).</summary>
    int SoMucDaXoa => 0;
    /// <summary>Danh sách <paramref name="khoaDs"/> có mục của AiiGrow (tên &gt; 90000).</summary>
    bool CoMucCuaTa(string khoaDs) => false;
    /// <summary>Danh sách <paramref name="khoaDs"/> có mục do người khác đặt (IT / Ba Mẹ).</summary>
    bool CoMucNguoiKhac(string khoaDs) => false;
    /// <summary>Đọc DWORD (null = không có).</summary>
    int? DocDword(string khoa, string ten) => null;
    /// <summary>Ghi giá trị chuỗi (REG_SZ). Gỡ dùng <see cref="GoDword"/> (xoá giá trị theo tên, mọi kiểu).</summary>
    void DatChuoi(string khoa, string ten, string giaTri) { }
    /// <summary>Gỡ giá trị chuỗi CHỈ khi nó đúng là giá trị AiiGrow đặt (DnsOverHttpsMode=secure của IT / Ba Mẹ giữ nguyên).</summary>
    void GoChuoiNeu(string khoa, string ten, string giaTri) => GoDword(khoa, ten);
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
        return VanTay(p?.CheDo, chan, cho);
    }

    /// <summary>Vân tay từ danh sách đã lập (<paramref name="cheDo"/> null = gỡ).</summary>
    public static string VanTay(string? cheDo, IReadOnlyList<string> chan, IReadOnlyList<string> cho)
    {
        var dau = cheDo == null ? "gỡ" : string.Join("\n", new[] { cheDo }.Concat(chan).Append("|").Concat(cho));
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dau)));
    }

    /// <summary>Áp <paramref name="p"/> (null ⇒ gỡ hết). → true nếu đã ghi registry lần này.</summary>
    public bool Ap(WebPolicy? p, string? maychuHost)
    {
        var (chan, cho) = p == null ? (new List<string>(), new List<string>()) : WebPolicyKeys.Lap(p, maychuHost);
        var vt = VanTay(p?.CheDo, chan, cho);   // lập danh sách MỘT lần, vân tay tính từ chính danh sách sẽ ghi
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
                foreach (var (ten, gt) in WebPolicyKeys.CoChuoi(t))
                {
                    if (p == null) _reg.GoChuoiNeu(t.Khoa, ten, gt); else _reg.DatChuoi(t.Khoa, ten, gt);
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

    /// <summary>Gỡ luật bản cũ (≤0.2.5) trong HKLM. Danh sách: chỉ mục của AiiGrow. Ba cờ DWORD không phân biệt được ai đặt ⇒ CHỈ gỡ khi có dấu
    /// AiiGrow từng áp ở HKLM: còn mục danh sách của AiiGrow, hoặc ĐỦ ba cờ đúng giá trị AiiGrow ở CẢ BỐN trình duyệt (dấu riêng của bản cũ — IT không
    /// đặt cho Brave + Cốc Cốc cùng lúc như thế). Không có dấu (cài mới, hoặc bản cũ đã gỡ) ⇒ cờ là của IT / Ba Mẹ — giữ nguyên (review #75).</summary>
    public void GoHklmCu()
    {
        var coDau = WebPolicyKeys.TatCa.Any(t => _reg.CoMucCuaTa(t.Khoa + "\\" + WebPolicyKeys.DsChan) || _reg.CoMucCuaTa(t.Khoa + "\\" + WebPolicyKeys.DsCho))
            || WebPolicyKeys.TatCa.All(t => WebPolicyKeys.Co(t).All(c => _reg.DocDword(t.Khoa, c.Ten) == c.GiaTri));
        foreach (var t in WebPolicyKeys.TatCa)
        {
            _reg.DatDanhSach(t.Khoa + "\\" + WebPolicyKeys.DsChan, Array.Empty<string>());
            _reg.DatDanhSach(t.Khoa + "\\" + WebPolicyKeys.DsCho, Array.Empty<string>());
            if (coDau) foreach (var (ten, _) in WebPolicyKeys.Co(t)) _reg.GoDword(t.Khoa, ten);
            _reg.GoKhoaNeuTrong(t.Khoa);
        }
        _daAp = null;
    }

    /// <summary>Trình duyệt có danh sách web CẢ MÁY (HKLM) do IT / Ba Mẹ đặt: Chrome / Edge không gộp danh sách máy với danh sách người dùng — danh sách
    /// máy thắng, luật AiiGrow trong hive Con bị bỏ qua ⇒ phải báo Ba Mẹ (review #75).</summary>
    public List<string> TrinhDuyetBiHklmDe() =>
        WebPolicyKeys.TatCa.Where(t => _reg.CoMucNguoiKhac(t.Khoa + "\\" + WebPolicyKeys.DsChan) || _reg.CoMucNguoiKhac(t.Khoa + "\\" + WebPolicyKeys.DsCho))
            .Select(t => t.Ten).ToList();
}

/// <summary>Ghi registry thật (64-bit) vào HKLM (chỉ để GỠ luật bản cũ) hoặc một hive người dùng đã nạp (HKU\<SID> hoặc hive nạp tạm).
/// Chạy bằng SYSTEM (dịch vụ) hoặc Administrator (bộ gỡ).</summary>
public sealed class WindowsWebPolicyRegistry : IWebPolicyRegistry
{
    private readonly RegistryHive _hive;
    private readonly string? _goc;   // null = chính hive (HKLM); khác null = khoá con của HKU (SID hoặc tên hive nạp tạm)
    private readonly string? _sidCon;   // hive người dùng: SID chủ hive ⇒ khoá chính sách ta tạo chỉ cho người đó ĐỌC (AclChinhSach)
    private readonly HashSet<string> _daKhoa = new(StringComparer.OrdinalIgnoreCase);   // khoá đã dò/khoá chặt trong lượt ghi này

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

    /// <summary>RefreshPolicyEx(force) — <paramref name="may"/> = chính sách máy (dịch vụ SYSTEM), false = chính sách của NGƯỜI DÙNG đang chạy tiến trình (khay ở phiên Con).
    /// Một chỗ khai báo P/Invoke cho cả dịch vụ và khay.</summary>
    public static bool LamMoiChinhSach(bool may) => RefreshPolicyEx(may, RP_FORCE);

    /// <summary>Báo trình duyệt đọc lại chính sách NGAY. Chrome / Edge / Cốc Cốc chỉ đọc lại registry khi nhận tín hiệu Group Policy
    /// (RegisterGPNotification) hoặc theo chu kỳ dài — ghi registry xong mà không báo thì tải lại trang vẫn vào được, phải tắt hẳn trình duyệt
    /// (Thanh thử YouTube 24/10). RefreshPolicyEx chạy xử lý chính sách cục bộ (cả máy không vào domain) rồi phát tín hiệu đó; không được thì gpupdate.
    /// → mô tả cách đã báo (để ghi log).</summary>
    public static string BaoTrinhDuyetDocLai()
    {
        // chỉ tín hiệu MÁY: dịch vụ chạy SYSTEM, RefreshPolicyEx(false) chỉ làm mới cho chính SYSTEM (review #65)
        try { if (LamMoiChinhSach(true)) return "RefreshPolicyEx"; }
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
        // GHI ĐÈ tại chỗ rồi mới xoá phần thừa — không xoá sạch rồi ghi lại (trình duyệt đọc giữa chừng thấy danh sách rỗng ⇒ hở chặn), giá trị y hệt thì không ghi (review #75)
        var ten = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < muc.Count; i++)
        {
            var n = (WebPolicyKeys.ChiSoDau + 1 + i).ToString();
            ten.Add(n);
            if (!string.Equals(k.GetValue(n) as string, muc[i], StringComparison.Ordinal) || k.GetValueKind(n) != RegistryValueKind.String)
                k.SetValue(n, muc[i], RegistryValueKind.String);
        }
        foreach (var n in k.GetValueNames()) if (WebPolicyKeys.LaCuaTa(n) && !ten.Contains(n)) k.DeleteValue(n, false);
    }

    public bool CoMucCuaTa(string khoaDs) => DemMuc(khoaDs, true);
    public bool CoMucNguoiKhac(string khoaDs) => DemMuc(khoaDs, false);

    private bool DemMuc(string khoaDs, bool cuaTa)
    {
        using var b = RegistryKey.OpenBaseKey(_hive, RegistryView.Registry64);
        using var g = _goc == null ? null : b.OpenSubKey(_goc, false);   // đóng cả khoá gốc hive tạm — còn handle thì gỡ nạp hỏng
        if (_goc != null && g == null) return false;
        using var k = (g ?? b).OpenSubKey(khoaDs, false);
        return k != null && k.GetValueNames().Any(n => n.Length > 0 && WebPolicyKeys.LaCuaTa(n) == cuaTa);
    }

    public int? DocDword(string khoa, string ten)
    {
        using var b = RegistryKey.OpenBaseKey(_hive, RegistryView.Registry64);
        using var g = _goc == null ? null : b.OpenSubKey(_goc, false);
        if (_goc != null && g == null) return null;
        using var k = (g ?? b).OpenSubKey(khoa, false);
        return k?.GetValue(ten) is int v ? v : null;
    }

    public void DatDword(string khoa, string ten, int giaTri)
    {
        using var hklm = Hklm();
        using var k = TaoKhoa(hklm, khoa);
        k.SetValue(ten, giaTri, RegistryValueKind.DWord);
    }

    public void DatChuoi(string khoa, string ten, string giaTri)
    {
        using var hklm = Hklm();
        using var k = TaoKhoa(hklm, khoa);
        if (!string.Equals(k.GetValue(ten) as string, giaTri, StringComparison.Ordinal) || k.GetValueKind(ten) != RegistryValueKind.String)
            k.SetValue(ten, giaTri, RegistryValueKind.String);
    }

    public void GoChuoiNeu(string khoa, string ten, string giaTri)
    {
        using var hklm = Hklm();
        using var k = hklm.OpenSubKey(khoa, true);
        if (k?.GetValue(ten) is string v && string.Equals(v, giaTri, StringComparison.OrdinalIgnoreCase)) { k.DeleteValue(ten, false); SoMucDaXoa++; }
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
        // HKLM: chỉ gỡ phần bản cũ để lại (cờ DWORD chỉ khi còn dấu AiiGrow — cờ của IT giữ nguyên); lỗi (IT khoá ACL…) không chặn việc gỡ ở hive từng tài khoản
        try { var may = host.May; new WebPolicyApplier(may).GoHklmCu(); co = may.SoMucDaXoa > 0; } catch { }
        // CHỈ hive đã ghi luật (web-hives.txt) hoặc đang nạp (đăng nhập — gỡ không cần nạp tạm): không nạp tạm NTUSER.DAT của mọi hồ sơ (kể cả Ba Mẹ)
        // khi gỡ — ai đăng nhập đúng lúc đó sẽ vào hồ sơ tạm; tác vụ dọn tách rời vẫn quét mọi hồ sơ một lần làm lưới đỡ (review #75)
        var daGhi = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try { foreach (var (sid, vt) in host.DocDaGhi()) if (!vt.StartsWith(WebPolicyHives.TienToSach, StringComparison.Ordinal)) daGhi.Add(sid); } catch { }
        foreach (var sid in WindowsWebHiveHost.TatCaHoSo())
        {
            try
            {
                if (!daGhi.Contains(sid) && !host.DangNap(sid)) continue;
                // «có gỡ gì» theo số mục thật sự xoá — không phải «mở được hive» (không báo trình duyệt vô ích)
                host.VoiHive(sid, reg => { new WebPolicyApplier(reg).GoTatCa(); if (reg.SoMucDaXoa > 0) co = true; });
            }
            catch { }
        }
        WindowsWebHiveHost.GoNapKet();
        // gỡ xong cũng báo trình duyệt — không thì Chrome đang mở vẫn chặn tới khi tắt hẳn (review #65)
        if (co) WindowsWebPolicyRegistry.BaoTrinhDuyetDocLai();
    }

    /// <summary>Mốc «đã dọn luật web ở hive mọi hồ sơ» của tác vụ dọn tách rời (xoá khi tác vụ tự huỷ).</summary>
    public const string MocDonWeb = @"HKLM:\SOFTWARE\AiiGrowDonWeb";

    /// <summary>Đoạn PowerShell tương đương, nhúng vào tác vụ dọn tách rời (SYSTEM) làm lưới đỡ khi dịch vụ không gỡ được.
    /// Chỉ xoá giá trị của AiiGrow (tên số &gt; 90000 + ba cờ DWORD), giữ nguyên mục người khác đặt.</summary>
    public static string KichBanGoChinhSach()
    {
        // Gọn: một hàm Go-Web chạy cho HKLM (bản cũ) rồi từng hive hồ sơ — kịch bản đi qua -EncodedCommand trong tham số tác vụ (giới hạn ~32K ký tự), không lặp danh sách.
        var wb = string.Join(",", WebPolicyKeys.TatCa.Select(t => "'" + t.Khoa + "'"));
        var dw = string.Join(",", WebPolicyKeys.TatCa.SelectMany(t => WebPolicyKeys.Co(t).Select(c => "'" + t.Khoa + "|" + c.Ten + "|" + c.GiaTri + "'")).Distinct());
        var ws = string.Join(",", WebPolicyKeys.TatCa.SelectMany(t => WebPolicyKeys.CoChuoi(t).Select(c => "'" + t.Khoa + "|" + c.Ten + "|" + c.GiaTri + "'")).Distinct());
        return string.Join("\n", new[]
        {
            "$wb=@(" + wb + ")",
            "$wd=@(" + dw + ")",
            "$ws=@(" + ws + ")",
            // $chiKhiCoDau: HKLM — ba cờ DWORD chỉ gỡ khi còn mục 9000x của AiiGrow (dấu bản cũ đã ghi HKLM); không thì cờ là của IT, giữ (review #75)
            "function Go-Web($g, [bool]$chiKhiCoDau){",
            "  $dau=$false",
            "  foreach($b in $wb){",
            "    foreach($l in '" + WebPolicyKeys.DsChan + "','" + WebPolicyKeys.DsCho + "'){",
            "      $k=\"$g\\$b\\$l\"",
            "      if(Test-Path -LiteralPath $k){",
            "        foreach($n in @((Get-Item -LiteralPath $k).GetValueNames() | Where-Object { $_ -match '^\\d+$' -and [int64]$_ -gt " + WebPolicyKeys.ChiSoDau + " })){ $dau=$true; Remove-ItemProperty -LiteralPath $k -Name $n }",
            "        if(@((Get-Item -LiteralPath $k).GetValueNames()).Count -eq 0){ Remove-Item -LiteralPath $k -Force }",
            "      }",
            "    }",
            "  }",
            // dấu thứ hai như GoHklmCu bên C#: đủ cả ba cờ ĐÚNG giá trị AiiGrow ở mọi trình duyệt (bản cũ chặn trống danh sách vẫn ghi cờ)
            "  if($chiKhiCoDau -and -not $dau){ $du=$true; foreach($d in $wd){ $p=$d.Split('|'); $k=\"$g\\\" + $p[0]; $v=(Get-ItemProperty -LiteralPath $k -ErrorAction SilentlyContinue).($p[1]); if($null -eq $v -or [int64]$v -ne [int64]$p[2]){ $du=$false; break } }; $dau=$du }",
            // cờ chuỗi (DnsOverHttpsMode) chỉ có ở hive Con — HKLM không bao giờ có của AiiGrow; chỉ gỡ khi đúng giá trị AiiGrow đặt (của IT giữ nguyên)
            "  if(-not $chiKhiCoDau){ foreach($d in $ws){ $p=$d.Split('|'); $k=\"$g\\\" + $p[0]; if((Get-ItemProperty -LiteralPath $k -ErrorAction SilentlyContinue).($p[1]) -eq $p[2]){ Remove-ItemProperty -LiteralPath $k -Name $p[1] -ErrorAction SilentlyContinue } } }",
            "  if(-not $chiKhiCoDau -or $dau){ foreach($d in $wd){ $p=$d.Split('|'); $k=\"$g\\\" + $p[0]; if(Test-Path -LiteralPath $k){ Remove-ItemProperty -LiteralPath $k -Name $p[1] } } }",
            "  foreach($b in $wb){ $k=\"$g\\$b\"; if((Test-Path -LiteralPath $k) -and @((Get-Item -LiteralPath $k).GetValueNames()).Count -eq 0 -and @(Get-ChildItem -LiteralPath $k).Count -eq 0){ Remove-Item -LiteralPath $k -Force } }",
            "}",
            "Go-Web 'HKLM:' $true",
            // hive tạm còn kẹt (dịch vụ AiiGrowTmp_ / lần chạy trước AiiGrowGo_) ⇒ gỡ nạp trước: kẹt thì tài khoản đó đăng nhập vào hồ sơ tạm
            "foreach($t in @(Get-ChildItem -LiteralPath 'Registry::HKEY_USERS' -ErrorAction SilentlyContinue | ForEach-Object { $_.PSChildName } | Where-Object { $_ -like 'AiiGrowTmp_*' -or $_ -like 'AiiGrowGo_*' })){ [gc]::Collect(); reg.exe unload \"HKU\\$t\" 2>$null | Out-Null }",
            // 0.2.6: luật web nằm trong hive từng tài khoản (HKU\\<SID>) — duyệt mọi hồ sơ (đang nạp, hoặc nạp tạm NTUSER.DAT), gỡ cùng các giá trị trên
            "$pl='HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList'",
            // CHỈ MỘT LẦN: tác vụ chạy lại mỗi lần khởi động tới khi tự huỷ — nạp NTUSER.DAT mọi hồ sơ mỗi lần khởi động thì ai đăng nhập đúng lúc
            // sẽ vào hồ sơ tạm (review #75). Xong lượt đầu ⇒ đặt mốc; tác vụ tự huỷ thì xoá mốc.
            // mốc mang mã của LẦN GỠ NÀY: mốc sót từ lần gỡ trước (cài lại rồi gỡ lại) không tắt lượt dọn hive
            "$moc='" + MocDonWeb + "'; $id='" + Guid.NewGuid().ToString("N") + "'",
            "if((Get-ItemProperty -LiteralPath $moc -ErrorAction SilentlyContinue).Id -ne $id){",
            "$ok=$true",
            "foreach($s in @(Get-ChildItem -LiteralPath $pl -ErrorAction SilentlyContinue | ForEach-Object { $_.PSChildName } | Where-Object { $_ -match '^S-1-(5-21|12-1)-[0-9-]+$' } )){",   // không nhận «….bak» (hồ sơ tạm cũ) — như LaSidNguoiDung bên C#
            "  $goc=\"Registry::HKEY_USERS\\$s\"; $nap=$false",
            "  if(-not (Test-Path -LiteralPath $goc)){",
            "    $d=(Get-ItemProperty -LiteralPath \"$pl\\$s\" -ErrorAction SilentlyContinue).ProfileImagePath; if(-not $d){ continue }",
            "    $f=[Environment]::ExpandEnvironmentVariables($d)+'\\NTUSER.DAT'; if(-not (Test-Path -LiteralPath $f)){ continue }",
            // tên tạm riêng mỗi SID: một hive gỡ nạp hỏng không chặn các hồ sơ sau; gỡ nạp thử lại tới 10 lần (handle của Get-Item còn mở)
            "    $t=\"AiiGrowGo_$s\"; reg.exe load \"HKU\\$t\" $f | Out-Null; if($LASTEXITCODE -ne 0){ $ok=$false; continue }",
            "    $goc=\"Registry::HKEY_USERS\\$t\"; $nap=$true",
            "  }",
            "  Go-Web $goc $false",
            "  if($nap){ $go=$false; for($i=0;$i -lt 10;$i++){ [gc]::Collect(); [gc]::WaitForPendingFinalizers(); reg.exe unload \"HKU\\$t\" 2>$null | Out-Null; if($LASTEXITCODE -eq 0){ $go=$true; break }; Start-Sleep -Milliseconds 300 }; if(-not $go){ $ok=$false } }",
            "}",
            // CHỈ đặt mốc khi mọi hồ sơ đã dọn được (nạp / gỡ nạp hỏng ⇒ lần khởi động sau thử lại)
            // hỏng ⇒ đếm lần; 5 lần khởi động vẫn hỏng (hồ sơ hư) ⇒ thôi, không nạp hive mọi hồ sơ mỗi lần khởi động mãi
            "if(-not (Test-Path -LiteralPath $moc)){ New-Item -Path $moc | Out-Null }",
            "if(-not $ok){ $n=1+[int](Get-ItemProperty -LiteralPath $moc).\"Lan$id\"; Set-ItemProperty -LiteralPath $moc -Name \"Lan$id\" -Value $n; if($n -ge 5){ $ok=$true } }",
            "if($ok){ Set-ItemProperty -LiteralPath $moc -Name Id -Value $id }",
            "}",
            // tác vụ dọn CHỈ tự huỷ khi lượt dọn hive đã xong ($webSach) — không thì luật web + cờ còn kẹt trong hồ sơ Con mãi (review #75)
            "$webSach = ((Get-ItemProperty -LiteralPath $moc -ErrorAction SilentlyContinue).Id -eq $id)",
            // báo trình duyệt đang mở đọc lại chính sách (không thì vẫn chặn tới khi tắt hẳn)
            "try { gpupdate.exe /target:computer /force | Out-Null } catch { }",
        });
    }
}
