using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using Microsoft.Win32;

namespace AiiGrow.Core;

// Luật web theo TÀI KHOẢN CON (issue #68, S1): trước 0.2.6 agent ghi chính sách trình duyệt vào HKLM ⇒ HKLM áp cho CẢ MÁY ⇒ Chrome của tài khoản
// Ba Mẹ cũng bị chặn («This page is blocked» mọi trang). Nay ghi vào hive của từng tài khoản Con (HKU\<SID>\SOFTWARE\Policies\…): Chrome / Edge /
// Brave / Cốc Cốc đều đọc chính sách theo người dùng (HKCU) như chính sách máy. Dịch vụ chạy SYSTEM nên ghi được cả hive CHƯA nạp (Con chưa đăng
// nhập): nạp tạm NTUSER.DAT (RegLoadKey, có SeRestore/SeBackupPrivilege), ghi, gỡ nạp. Chưa có hồ sơ (Con chưa từng đăng nhập) ⇒ thử lại mỗi vòng,
// áp ngay khi hồ sơ xuất hiện. Bản cũ để lại luật trong HKLM ⇒ gỡ sạch một lần khi dịch vụ khởi động (cả các giá trị có tên số ≥ 90001 + ba cờ).
// Phần THUẦN (quyết định ghi/gỡ hive nào, khi nào) test bằng IWebHiveHost giả; registry thật nằm ở WindowsWebHiveHost.

/// <summary>Cổng tới registry theo từng hive người dùng (tách để test bằng bản giả).</summary>
public interface IWebHiveHost
{
    /// <summary>Registry HKLM — CHỈ để gỡ luật bản cũ.</summary>
    IWebPolicyRegistry May { get; }
    /// <summary>Chạy <paramref name="fn"/> trên hive của <paramref name="sid"/> (đang nạp, hoặc nạp tạm rồi gỡ nạp). false = chưa có hive (Con chưa đăng nhập lần nào / không nạp được).</summary>
    bool VoiHive(string sid, Action<IWebPolicyRegistry> fn);
    /// <summary>Hive của <paramref name="sid"/> đang nạp (Con đang đăng nhập) — chỉ khi đó Con mới sửa được luật ⇒ mới cần ghi lại định kỳ.</summary>
    bool DangNap(string sid);
    /// <summary>Các hive đã ghi luật (SID → vân tay) lưu qua lần khởi động lại dịch vụ — không thì Con rời danh sách lúc dịch vụ tắt là luật kẹt lại.</summary>
    IReadOnlyDictionary<string, string> DocDaGhi();
    void LuuDaGhi(IReadOnlyDictionary<string, string> ds);
}

/// <summary>Kết quả một vòng <see cref="WebPolicyHives.Ap"/>.</summary>
public sealed record KetQuaWebHive(bool DaDoi, bool DaGoHklm, IReadOnlyList<string> ChuaCoHive, string? LoiGoHklm);

public sealed class WebPolicyHives
{
    /// <summary>Luật đang áp được ghi lại định kỳ (Con có thể tự xoá trong HKCU của mình) — không ghi lại mỗi vòng 30 giây.</summary>
    public static readonly TimeSpan GhiLaiSau = TimeSpan.FromMinutes(5);

    private readonly IWebHiveHost _host;
    private bool _hklmDaGo;
    private readonly Dictionary<string, (string VanTay, DateTimeOffset Luc)> _daAp = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _daGhiCho = new(StringComparer.OrdinalIgnoreCase);   // hive ta đã ghi luật (còn luật) — Con rời danh sách thì phải gỡ

    private bool _daDoc;
    private string? _daLuu;

    public WebPolicyHives(IWebHiveHost host) { _host = host; }

    private void DocLanDau()
    {
        if (_daDoc) return;
        _daDoc = true;
        try
        {
            foreach (var (sid, vt) in _host.DocDaGhi())
            {
                if (!AppLockerXml.IsValidSid(sid)) continue;
                _daAp[sid] = (vt, DateTimeOffset.MinValue);   // quá hạn ⇒ hive đang nạp được ghi lại một lần, KHÔNG báo «đổi» nếu luật không đổi
                _daGhiCho.Add(sid);
            }
        }
        catch { }
        _daLuu = ChuoiLuu();
    }

    private string ChuoiLuu() => string.Join("\n", _daGhiCho.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).Select(x => x + " " + _daAp[x].VanTay));

    /// <param name="p">null ⇒ gỡ hết (giám sát / mồ côi / đang gỡ…).</param>
    /// <param name="childSids">SID tài khoản Con (null = chưa đọc được ⇒ chỉ gỡ ở các hive đã ghi).</param>
    public KetQuaWebHive Ap(WebPolicy? p, string? maychuHost, IEnumerable<string>? childSids, DateTimeOffset now)
    {
        bool doi = false, goHklm = false;
        string? loi = null;
        if (!_hklmDaGo)
        {
            try { new WebPolicyApplier(_host.May).GoTatCa(); _hklmDaGo = true; goHklm = true; }
            catch (Exception e) { loi = e.Message; }   // vòng sau thử lại
        }

        DocLanDau();
        // chưa đọc được tài khoản Con (null) mà đang cần CHẶN ⇒ giữ nguyên luật đang có (như AppLocker), không gỡ nhầm; cần GỠ thì vẫn gỡ ở các hive đã ghi
        if (childSids == null && p != null) return new KetQuaWebHive(false, goHklm, Array.Empty<string>(), loi);
        var sids = (childSids ?? Array.Empty<string>()).Where(AppLockerXml.IsValidSid).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var dich = sids.Concat(_daGhiCho.Where(x => !sids.Contains(x, StringComparer.OrdinalIgnoreCase))).ToList();
        var chua = new List<string>();
        foreach (var sid in dich)
        {
            var muon = sids.Contains(sid, StringComparer.OrdinalIgnoreCase) ? p : null;
            var vt = WebPolicyApplier.VanTay(muon, maychuHost);
            var truoc = _daAp.TryGetValue(sid, out var t) ? t : default;
            var coTruoc = _daAp.ContainsKey(sid);
            // chỉ ghi lại khi đổi, hoặc (có luật) quá hạn ghi lại VÀ hive đang nạp; «gỡ» đã gỡ rồi thì thôi. Hive chưa nạp (Con chưa đăng nhập) thì Con
            // không sửa được ⇒ không nạp tạm NTUSER.DAT mỗi 5 phút (nạp đúng lúc Con đăng nhập ⇒ Windows cấp hồ sơ tạm — review #75)
            if (coTruoc && truoc.VanTay == vt && (muon == null || now - truoc.Luc < GhiLaiSau || !DangNapAnToan(sid))) continue;
            bool xong;
            try { xong = _host.VoiHive(sid, reg => new WebPolicyApplier(reg).Ap(muon, maychuHost)); }
            catch { xong = false; }
            if (!xong) { chua.Add(sid); continue; }
            var doiLanNay = coTruoc ? truoc.VanTay != vt : _daGhiCho.Contains(sid) || muon != null;
            _daAp[sid] = (vt, now);
            if (muon != null) _daGhiCho.Add(sid); else _daGhiCho.Remove(sid);
            if (doiLanNay) doi = true;
        }
        var luu = ChuoiLuu();
        if (luu != _daLuu)
        {
            try { _host.LuuDaGhi(_daGhiCho.ToDictionary(x => x, x => _daAp[x].VanTay, StringComparer.OrdinalIgnoreCase)); _daLuu = luu; }
            catch { }   // vòng sau thử lưu lại
        }
        return new KetQuaWebHive(doi, goHklm, chua, loi);
    }

    private bool DangNapAnToan(string sid) { try { return _host.DangNap(sid); } catch { return false; } }
}

/// <summary>Registry thật theo hive người dùng. Chạy bằng SYSTEM / Administrator.</summary>
public sealed class WindowsWebHiveHost : IWebHiveHost
{
    private static readonly IntPtr HkeyUsers = new(unchecked((int)0x80000003));

    [DllImport("advapi32.dll", CharSet = CharSet.Unicode)] private static extern int RegLoadKey(IntPtr hKey, string subKey, string file);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode)] private static extern int RegUnLoadKey(IntPtr hKey, string subKey);
    [DllImport("advapi32.dll", SetLastError = true)] private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] private static extern bool LookupPrivilegeValue(string? system, string name, out long luid);
    [DllImport("advapi32.dll", SetLastError = true)] private static extern bool AdjustTokenPrivileges(IntPtr token, bool disableAll, ref TokenPrivileges np, int len, IntPtr prev, IntPtr retLen);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr h);

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    private struct TokenPrivileges { public int Count; public long Luid; public int Attr; }

    public IWebPolicyRegistry May => new WindowsWebPolicyRegistry();

    private static bool _daBatQuyen;
    internal static void BatQuyen()
    {
        if (_daBatQuyen) return;
        try
        {
            if (!OpenProcessToken(System.Diagnostics.Process.GetCurrentProcess().Handle, 0x20 | 0x8, out var tok)) return;
            try
            {
                foreach (var ten in new[] { "SeBackupPrivilege", "SeRestorePrivilege", "SeTakeOwnershipPrivilege" })
                {
                    if (!LookupPrivilegeValue(null, ten, out var luid)) continue;
                    var tp = new TokenPrivileges { Count = 1, Luid = luid, Attr = 2 /* SE_PRIVILEGE_ENABLED */ };
                    AdjustTokenPrivileges(tok, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero);
                }
            }
            finally { CloseHandle(tok); }
            _daBatQuyen = true;
        }
        catch { }
    }

    /// <summary>Đường NTUSER.DAT của hồ sơ (null = hồ sơ chưa có).</summary>
    public static string? DuongNtUser(string sid)
    {
        try
        {
            using var k = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\" + sid);
            var d = k?.GetValue("ProfileImagePath") as string;
            if (string.IsNullOrWhiteSpace(d)) return null;
            var f = Path.Combine(Environment.ExpandEnvironmentVariables(d), "NTUSER.DAT");
            return File.Exists(f) ? f : null;
        }
        catch { return null; }
    }

    /// <summary>SID các hồ sơ người dùng trên máy (tài khoản cục bộ / miền, S-1-5-21-…) — cho bộ gỡ dọn mọi hive.</summary>
    public static List<string> TatCaHoSo()
    {
        var ds = new List<string>();
        try
        {
            using var k = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList");
            if (k != null) ds.AddRange(k.GetSubKeyNames().Where(n => n.StartsWith("S-1-5-21-", StringComparison.Ordinal) && AppLockerXml.IsValidSid(n)));
        }
        catch { }
        return ds;
    }

    private static string TepDaGhi => Path.Combine(Paths.DataDir, "web-hives.txt");

    public IReadOnlyDictionary<string, string> DocDaGhi()
    {
        var ds = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(TepDaGhi)) return ds;
        foreach (var dong in File.ReadAllLines(TepDaGhi))
        {
            var ph = dong.Split(' ', 2, StringSplitOptions.TrimEntries);
            if (ph.Length == 2 && AppLockerXml.IsValidSid(ph[0])) ds[ph[0]] = ph[1];
        }
        return ds;
    }

    public void LuuDaGhi(IReadOnlyDictionary<string, string> ds)
    {
        Directory.CreateDirectory(Paths.DataDir);
        var tam = TepDaGhi + ".tmp";
        File.WriteAllLines(tam, ds.Select(kv => kv.Key + " " + kv.Value));
        File.Move(tam, TepDaGhi, true);
    }

    public bool DangNap(string sid)
    {
        if (!AppLockerXml.IsValidSid(sid)) return false;
        using var users = RegistryKey.OpenBaseKey(RegistryHive.Users, RegistryView.Registry64);
        using var k = users.OpenSubKey(sid, false);
        return k != null;
    }

    public bool VoiHive(string sid, Action<IWebPolicyRegistry> fn)
    {
        if (!AppLockerXml.IsValidSid(sid)) return false;
        using (var users = RegistryKey.OpenBaseKey(RegistryHive.Users, RegistryView.Registry64))
        using (var k = users.OpenSubKey(sid, false))
            if (k != null) { fn(new WindowsWebPolicyRegistry(RegistryHive.Users, sid, sid)); return true; }   // Con đang đăng nhập: hive đã nạp

        var tep = DuongNtUser(sid);
        if (tep == null) return false;
        BatQuyen();
        var ten = "AiiGrowTmp_" + sid;
        // lần trước gỡ nạp hỏng (còn handle) ⇒ hive kẹt ở tên tạm, Con đăng nhập sẽ bị hồ sơ tạm: gỡ nạp trước khi nạp lại
        using (var users = RegistryKey.OpenBaseKey(RegistryHive.Users, RegistryView.Registry64))
        using (var cu = users.OpenSubKey(ten, false))
            if (cu != null) { cu.Close(); GC.Collect(); GC.WaitForPendingFinalizers(); RegUnLoadKey(HkeyUsers, ten); }
        if (RegLoadKey(HkeyUsers, ten, tep) != 0) return false;   // đang bị khoá (Con vừa đăng nhập) ⇒ vòng sau thấy hive đã nạp
        try { fn(new WindowsWebPolicyRegistry(RegistryHive.Users, ten, sid)); return true; }
        finally
        {
            GC.Collect(); GC.WaitForPendingFinalizers();
            for (int i = 0; i < 10; i++) { if (RegUnLoadKey(HkeyUsers, ten) == 0) break; Thread.Sleep(200); }
        }
    }
}

/// <summary>ACL khoá chính sách trong hive người dùng (HKU\<SID>\SOFTWARE\Policies\…). Windows mặc định để SOFTWARE\Policies của HKCU chỉ
/// SYSTEM / Administrators ghi, người dùng chỉ đọc — khoá con thừa kế. Nhưng hive có thể thiếu SOFTWARE\Policies (tạo mới thì thừa kế SOFTWARE:
/// Con TOÀN QUYỀN ⇒ tự xoá luật chặn web) hoặc ai đó đã nới ACL. Nên sau khi ghi, dò từng khoá trên đường SOFTWARE\Policies → khoá luật:
/// chưa an toàn thì đặt ACL bảo vệ (SYSTEM + Administrators toàn quyền, Con + ALL APPLICATION PACKAGES chỉ đọc, chủ = Administrators).</summary>
public static class AclChinhSach
{
    public const string HeThong = "S-1-5-18", QuanTri = "S-1-5-32-544";
    private const RegistryRights QuyenGhi = RegistryRights.SetValue | RegistryRights.CreateSubKey | RegistryRights.CreateLink | RegistryRights.Delete
        | RegistryRights.ChangePermissions | RegistryRights.TakeOwnership | (RegistryRights)0x50000000 /* GENERIC_WRITE | GENERIC_ALL */;

    /// <summary>THUẦN: ACL an toàn ⇔ chủ là SYSTEM/Administrators và không quy tắc CHO PHÉP nào trao quyền ghi cho ai khác
    /// (CREATOR OWNER bỏ qua: chỉ áp cho người tạo khoá con — mà khoá con do SYSTEM tạo).</summary>
    public static bool AnToan(string? chu, IEnumerable<(string Sid, RegistryRights Quyen, bool ChoPhep)> quyTac)
    {
        if (chu != HeThong && chu != QuanTri) return false;
        return !quyTac.Any(q => q.ChoPhep && q.Sid is not (HeThong or QuanTri or "S-1-3-0") && (q.Quyen & QuyenGhi) != 0);
    }

    /// <summary>THUẦN: các khoá cần khoá chặt — từ SOFTWARE\Policies tới <paramref name="khoa"/> (khoá ngoài SOFTWARE\Policies ⇒ không có).</summary>
    public static List<string> DuongCanKhoa(string khoa)
    {
        const string goc = @"SOFTWARE\Policies";
        var ds = new List<string>();
        if (!khoa.Equals(goc, StringComparison.OrdinalIgnoreCase) && !khoa.StartsWith(goc + "\\", StringComparison.OrdinalIgnoreCase)) return ds;
        var cur = goc;
        ds.Add(cur);
        foreach (var phan in khoa.Substring(goc.Length).Split('\\', StringSplitOptions.RemoveEmptyEntries)) { cur += "\\" + phan; ds.Add(cur); }
        return ds;
    }

    /// <summary>Dò và khoá chặt đường tới <paramref name="khoa"/> trong hive gốc <paramref name="goc"/>. Cố gắng hết sức: lỗi không chặn việc ghi luật.</summary>
    public static void KhoaChat(RegistryKey goc, string khoa, string sidCon)
    {
        foreach (var duong in DuongCanKhoa(khoa))
        {
            try
            {
                using var k = goc.OpenSubKey(duong, RegistryKeyPermissionCheck.ReadWriteSubTree,
                    RegistryRights.ReadPermissions | RegistryRights.ChangePermissions | RegistryRights.TakeOwnership);
                if (k == null) continue;
                var acl = k.GetAccessControl(AccessControlSections.Access | AccessControlSections.Owner);
                var chu = (acl.GetOwner(typeof(SecurityIdentifier)) as SecurityIdentifier)?.Value;
                var qt = acl.GetAccessRules(true, true, typeof(SecurityIdentifier)).Cast<RegistryAccessRule>()
                    .Select(r => (((SecurityIdentifier)r.IdentityReference).Value, r.RegistryRights, r.AccessControlType == AccessControlType.Allow));
                if (AnToan(chu, qt)) continue;
                WindowsWebHiveHost.BatQuyen();
                var moi = new RegistrySecurity();
                moi.SetAccessRuleProtection(true, false);
                moi.SetOwner(new SecurityIdentifier(QuanTri));
                const InheritanceFlags ke = InheritanceFlags.ContainerInherit;
                moi.AddAccessRule(new RegistryAccessRule(new SecurityIdentifier(HeThong), RegistryRights.FullControl, ke, PropagationFlags.None, AccessControlType.Allow));
                moi.AddAccessRule(new RegistryAccessRule(new SecurityIdentifier(QuanTri), RegistryRights.FullControl, ke, PropagationFlags.None, AccessControlType.Allow));
                moi.AddAccessRule(new RegistryAccessRule(new SecurityIdentifier(sidCon), RegistryRights.ReadKey, ke, PropagationFlags.None, AccessControlType.Allow));
                moi.AddAccessRule(new RegistryAccessRule(new SecurityIdentifier("S-1-15-2-1"), RegistryRights.ReadKey, ke, PropagationFlags.None, AccessControlType.Allow));
                k.SetAccessControl(moi);
            }
            catch { }
        }
    }
}
