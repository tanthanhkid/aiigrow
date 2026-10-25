using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace AiiGrow.Core;

// «CHẶN THEO LỌC» (Thanh 25/10): ở Chặn thật, trình duyệt AiiGrow LỌC WEB ĐƯỢC (chính sách Chromium trong hive của Con — WebGuard.cs) được CHẠY,
// web thì lọc theo danh sách Ba Mẹ; trước đây chrome.exe / msedge.exe bị AppLocker chặn như app chưa xếp loại.
//   • An toàn trước: chỉ thả trình duyệt cho tài khoản Con mà luật web ĐANG có trong hive (WebPolicyHives.Ap → DaApCho), và trình duyệt đó không bị
//     danh sách web cả máy (HKLM) của IT đè. Chưa đồng bộ / ghi hive lỗi / Con chưa có hồ sơ / mở tạm offline / Giám sát ⇒ không thả (vẫn chặn).
//   • Nhận diện: AppLocker — chữ ký (nhà phát hành + sản phẩm) HOẶC thư mục cài cả máy trong Program Files (chỉ quản trị ghi); đóng app dự phòng
//     (ProcessEnforcer, Win Home) — thư mục cài cả máy, hoặc bản cài theo người dùng (AppData\Local) có chữ ký Authenticode hợp lệ đúng nhà phát hành.
//   • Firefox / Opera / trình duyệt lạ / bản Chromium không ký: KHÔNG có trong danh sách ⇒ vẫn bị chặn như app chưa xếp loại (Firefox đọc chính sách
//     riêng, Opera bỏ qua chính sách doanh nghiệp — AiiGrow chưa lọc được).

/// <summary>Một trình duyệt AiiGrow lọc web được. <see cref="Ten"/> trùng <see cref="WebPolicyKeys.TrinhDuyet.Ten"/> (để khớp HklmDe).</summary>
/// <param name="ThuMuc">Thư mục cài cả máy, tính từ Program Files / Program Files (x86).</param>
/// <param name="NhaPhatHanh">Tên nhà phát hành theo cú pháp AppLocker (O=…, L=…, S=…, C=… chữ hoa) — null = không thả theo chữ ký (chỉ theo thư mục cài cả máy).</param>
/// <param name="SanPham">ProductName chữ hoa (AppLocker / FileVersionInfo) — LUÔN ghim: nhà phát hành ký cả thứ khác (Google Play Games, updater, VPN helper…).</param>
/// <param name="ToChuc">Giá trị O= trong chủ thể chứng chỉ (kiểm chữ ký bản cài theo người dùng).</param>
/// <param name="ThuMucNguoiDung">Thư mục cài theo người dùng, tính từ %LOCALAPPDATA% (null = không nhận bản cài theo người dùng).</param>
public sealed record TrinhDuyetDaBiet(string Ten, string ThuMuc, string? NhaPhatHanh, string? SanPham, string? ToChuc, string? ThuMucNguoiDung);

public static class TrinhDuyetLoc
{
    public static readonly TrinhDuyetDaBiet[] TatCa =
    {
        new("Chrome", @"Google\Chrome\Application", "O=GOOGLE LLC, L=MOUNTAIN VIEW, S=CALIFORNIA, C=US", "GOOGLE CHROME", "Google LLC", @"Google\Chrome\Application"),
        new("Edge", @"Microsoft\Edge\Application", "O=MICROSOFT CORPORATION, L=REDMOND, S=WASHINGTON, C=US", "MICROSOFT EDGE", "Microsoft Corporation", null),
        // Brave / Cốc Cốc: chưa kiểm được ProductName của bản thật trên máy Windows ⇒ KHÔNG thả theo chữ ký (nhà phát hành + sản phẩm «*» = mọi exe họ ký,
        // ở mọi thư mục Con ghi được); chỉ bản cài cả máy trong Program Files. Bản cài theo người dùng vẫn bị chặn (an toàn trước).
        new("Brave", @"BraveSoftware\Brave-Browser\Application", null, null, null, null),
        new("CocCoc", @"CocCoc\Browser\Application", null, null, null, null),
    };

    public static TrinhDuyetDaBiet? Tim(string ten) => TatCa.FirstOrDefault(t => t.Ten.Equals(ten, StringComparison.OrdinalIgnoreCase));

    /// <summary>THUẦN: trình duyệt được chạy cho từng tài khoản Con. Không có chính sách web (<paramref name="p"/> null: Giám sát, mở tạm, chưa đồng bộ…)
    /// ⇒ rỗng. Chỉ SID có luật web đang áp (<paramref name="daApCho"/>); trình duyệt bị HKLM của IT đè (<paramref name="hklmDe"/>) thì không.</summary>
    public static Dictionary<string, IReadOnlyList<string>> TheoSid(WebPolicy? p, IEnumerable<string>? daApCho, IEnumerable<string>? hklmDe)
    {
        var kq = new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase);
        if (p == null || daApCho == null) return kq;
        var de = new HashSet<string>(hklmDe ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        var ten = TatCa.Select(t => t.Ten).Where(t => !de.Contains(t)).ToList();
        if (ten.Count == 0) return kq;
        foreach (var sid in daApCho.Where(AppLockerXml.IsValidSid)) kq[sid] = ten;
        return kq;
    }

    /// <summary>Ngoại lệ AppLocker cho các trình duyệt <paramref name="ten"/>: thư mục cài cả máy (%PROGRAMFILES% của AppLocker gồm cả Program Files (x86))
    /// + chữ ký nhà phát hành/sản phẩm (mọi bản cài, kể cả AppData của Con — bản đổi tên/không ký không khớp).</summary>
    public static IEnumerable<XElement> NgoaiLeAppLocker(IEnumerable<string> ten)
    {
        // thứ tự như XML AppLocker Windows xuất: mọi FilePathCondition trước, rồi FilePublisherCondition
        var ds = ten.Select(Tim).Where(t => t != null).Select(t => t!).DistinctBy(t => t.Ten).ToList();
        foreach (var t in ds) yield return new XElement("FilePathCondition", new XAttribute("Path", @"%PROGRAMFILES%\" + t.ThuMuc + @"\*"));
        foreach (var t in ds.Where(t => t.NhaPhatHanh != null && t.SanPham != null))
            yield return new XElement("FilePublisherCondition",
                new XAttribute("PublisherName", t.NhaPhatHanh), new XAttribute("ProductName", t.SanPham), new XAttribute("BinaryName", "*"),
                new XElement("BinaryVersionRange", new XAttribute("LowSection", "*"), new XAttribute("HighSection", "*")));
    }

    private static readonly Regex AppDataLocal = new(@"^[A-Za-z]:\\Users\\[^\\]+\\AppData\\Local\\", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>THUẦN: <paramref name="exePath"/> là một trình duyệt trong <paramref name="ten"/>? Thư mục cài cả máy ⇒ có; bản cài theo người dùng
    /// (C:\Users\&lt;tên&gt;\AppData\Local\…) ⇒ chỉ khi <paramref name="kiemKy"/> xác nhận chữ ký thật (Con ghi được thư mục đó).</summary>
    public static bool ChoChay(string? exePath, IEnumerable<string>? ten, IEnumerable<string> programFiles, Func<string, TrinhDuyetDaBiet, bool>? kiemKy)
    {
        if (string.IsNullOrWhiteSpace(exePath) || ten == null || exePath.Length < 4) return false;
        var p = exePath.Replace('/', '\\');
        if (p.Contains("..") || p.IndexOf(':', 2) >= 0) return false;   // «..», luồng dữ liệu phụ (a:b)
        foreach (var t in ten.Select(Tim).Where(t => t != null).Select(t => t!))
        {
            foreach (var pf in programFiles.Where(x => !string.IsNullOrWhiteSpace(x)))
                if (p.StartsWith(pf.TrimEnd('\\') + "\\" + t.ThuMuc + "\\", StringComparison.OrdinalIgnoreCase)) return true;
            if (t.ThuMucNguoiDung == null || kiemKy == null) continue;
            var m = AppDataLocal.Match(p);
            if (m.Success && p.Substring(m.Length).StartsWith(t.ThuMucNguoiDung + "\\", StringComparison.OrdinalIgnoreCase))
            {
                try { if (kiemKy(p, t)) return true; } catch { }
            }
        }
        return false;
    }

    /// <summary>Program Files + Program Files (x86) của máy này (không đổi suốt đời dịch vụ — đọc một lần).</summary>
    public static IReadOnlyList<string> ThuMucProgramFiles() => _pf ??= DocProgramFiles();
    private static IReadOnlyList<string>? _pf;
    private static List<string> DocProgramFiles() => new[]
    {
        Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
        Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
    }.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

    /// <summary>THUẦN: chủ thể chứng chỉ có O= đúng tổ chức không («CN=Google LLC, O=Google LLC, L=…» ⇒ O = «Google LLC»; O có dấu phẩy được bọc ngoặc kép).</summary>
    public static bool DungToChuc(string? chuThe, string toChuc)
    {
        if (string.IsNullOrEmpty(chuThe)) return false;
        foreach (Match m in Regex.Matches(chuThe, "(?:^|,\\s*)O=(\"(?<q>[^\"]*)\"|(?<v>[^,]*(?:,\\s*(?:Inc|LLC|Ltd)\\.?)?))", RegexOptions.CultureInvariant))
        {
            var v = (m.Groups["q"].Success ? m.Groups["q"].Value : m.Groups["v"].Value).Trim();
            if (v.Equals(toChuc, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }
}

/// <summary>Kiểm chữ ký Authenticode của bản cài theo người dùng (WinVerifyTrust + O= của người ký), nhớ theo (đường, cỡ, giờ sửa) — vòng đóng app chạy 5 giây/lần.</summary>
public sealed class KiemKyTrinhDuyet
{
    // Con sở hữu thư mục AppData: cỡ + giờ sửa giả được (SetFileTime) ⇒ nhớ theo BĂM nội dung; băm lại sau tối đa 30 giây (tráo tệp bị phát hiện ở lượt kế).
    private readonly Dictionary<string, (string Bam, long Tick, bool Ok)> _nho = new(StringComparer.OrdinalIgnoreCase);
    private const long BamLaiSauMs = 30_000;

    public bool Kiem(string path, TrinhDuyetDaBiet t)
    {
        if (t.ToChuc == null || t.SanPham == null || t.ThuMucNguoiDung == null) return false;
        var khoa = path + "|" + t.Ten;
        var bay = Environment.TickCount64;
        lock (_nho)
            if (_nho.TryGetValue(khoa, out var c) && bay - c.Tick < BamLaiSauMs) return c.Ok;
        string bam;
        try { using var f = File.OpenRead(path); bam = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(f)); }
        catch { return false; }
        lock (_nho)
            if (_nho.TryGetValue(khoa, out var c) && c.Bam == bam) { _nho[khoa] = (bam, bay, c.Ok); return c.Ok; }
        var ok = ChuKyHopLe(path) && TrinhDuyetLoc.DungToChuc(NguoiKy(path), t.ToChuc) && DungSanPham(path, t.SanPham);
        lock (_nho) { if (_nho.Count > 200) _nho.Clear(); _nho[khoa] = (bam, bay, ok); }
        return ok;
    }

    private static bool DungSanPham(string path, string sanPham)
    {
        try { return string.Equals(System.Diagnostics.FileVersionInfo.GetVersionInfo(path).ProductName?.Trim(), sanPham, StringComparison.OrdinalIgnoreCase); }
        catch { return false; }
    }

    private static string? NguoiKy(string path)
    {
#pragma warning disable SYSLIB0057
        try { using var c = System.Security.Cryptography.X509Certificates.X509Certificate.CreateFromSignedFile(path); return c.Subject; }
#pragma warning restore SYSLIB0057
        catch { return null; }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WinTrustFileInfo
    {
        public uint cbStruct; [MarshalAs(UnmanagedType.LPWStr)] public string pcwszFilePath; public IntPtr hFile; public IntPtr pgKnownSubject;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct WinTrustData
    {
        public uint cbStruct; public IntPtr pPolicyCallbackData; public IntPtr pSIPClientData; public uint dwUIChoice; public uint fdwRevocationChecks;
        public uint dwUnionChoice; public IntPtr pFile; public uint dwStateAction; public IntPtr hWVTStateData; public IntPtr pwszURLReference;
        public uint dwProvFlags; public uint dwUIContext; public IntPtr pSignatureSettings;
    }

    [DllImport("wintrust.dll", CharSet = CharSet.Unicode)]
    private static extern int WinVerifyTrust(IntPtr hwnd, [MarshalAs(UnmanagedType.LPStruct)] Guid action, ref WinTrustData data);

    private static readonly Guid GenericVerifyV2 = new("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");

    /// <summary>Chữ ký Authenticode hợp lệ, chuỗi tới gốc tin cậy (không kiểm thu hồi qua mạng — vòng đóng app không chờ mạng).</summary>
    public static bool ChuKyHopLe(string path)
    {
        if (!OperatingSystem.IsWindows()) return false;
        var fi = new WinTrustFileInfo { cbStruct = (uint)Marshal.SizeOf<WinTrustFileInfo>(), pcwszFilePath = path };
        var pFi = Marshal.AllocHGlobal(Marshal.SizeOf<WinTrustFileInfo>());
        try
        {
            Marshal.StructureToPtr(fi, pFi, false);
            var d = new WinTrustData
            {
                cbStruct = (uint)Marshal.SizeOf<WinTrustData>(), dwUIChoice = 2 /* WTD_UI_NONE */, fdwRevocationChecks = 0 /* WTD_REVOKE_NONE */,
                dwUnionChoice = 1 /* WTD_CHOICE_FILE */, pFile = pFi, dwStateAction = 0, dwProvFlags = 0x1000 /* WTD_CACHE_ONLY_URL_RETRIEVAL */,
            };
            return WinVerifyTrust(new IntPtr(-1) /* INVALID_HANDLE_VALUE: không UI */, GenericVerifyV2, ref d) == 0;
        }
        catch { return false; }
        finally { Marshal.DestroyStructure<WinTrustFileInfo>(pFi); Marshal.FreeHGlobal(pFi); }
    }
}
