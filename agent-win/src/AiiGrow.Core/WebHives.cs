using System.Runtime.InteropServices;
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

    public WebPolicyHives(IWebHiveHost host) { _host = host; }

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

        var sids = (childSids ?? Array.Empty<string>()).Where(AppLockerXml.IsValidSid).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var dich = sids.Concat(_daGhiCho.Where(x => !sids.Contains(x, StringComparer.OrdinalIgnoreCase))).ToList();
        var chua = new List<string>();
        foreach (var sid in dich)
        {
            var muon = sids.Contains(sid, StringComparer.OrdinalIgnoreCase) ? p : null;
            var vt = WebPolicyApplier.VanTay(muon, maychuHost);
            var truoc = _daAp.TryGetValue(sid, out var t) ? t : default;
            var coTruoc = _daAp.ContainsKey(sid);
            // chỉ ghi lại khi đổi, hoặc (có luật) quá hạn ghi lại; «gỡ» đã gỡ rồi thì thôi
            if (coTruoc && truoc.VanTay == vt && (muon == null || now - truoc.Luc < GhiLaiSau)) continue;
            bool xong;
            try { xong = _host.VoiHive(sid, reg => new WebPolicyApplier(reg).Ap(muon, maychuHost)); }
            catch { xong = false; }
            if (!xong) { chua.Add(sid); continue; }
            var doiLanNay = coTruoc ? truoc.VanTay != vt : _daGhiCho.Contains(sid) || muon != null;
            _daAp[sid] = (vt, now);
            if (muon != null) _daGhiCho.Add(sid); else _daGhiCho.Remove(sid);
            if (doiLanNay) doi = true;
        }
        return new KetQuaWebHive(doi, goHklm, chua, loi);
    }
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
    private static void BatQuyen()
    {
        if (_daBatQuyen) return;
        try
        {
            if (!OpenProcessToken(System.Diagnostics.Process.GetCurrentProcess().Handle, 0x20 | 0x8, out var tok)) return;
            try
            {
                foreach (var ten in new[] { "SeBackupPrivilege", "SeRestorePrivilege" })
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

    public bool VoiHive(string sid, Action<IWebPolicyRegistry> fn)
    {
        if (!AppLockerXml.IsValidSid(sid)) return false;
        using (var users = RegistryKey.OpenBaseKey(RegistryHive.Users, RegistryView.Registry64))
        using (var k = users.OpenSubKey(sid, false))
            if (k != null) { fn(new WindowsWebPolicyRegistry(RegistryHive.Users, sid)); return true; }   // Con đang đăng nhập: hive đã nạp

        var tep = DuongNtUser(sid);
        if (tep == null) return false;
        BatQuyen();
        var ten = "AiiGrowTmp_" + sid;
        if (RegLoadKey(HkeyUsers, ten, tep) != 0) return false;   // đang bị khoá (Con vừa đăng nhập) ⇒ vòng sau thấy hive đã nạp
        try { fn(new WindowsWebPolicyRegistry(RegistryHive.Users, ten)); return true; }
        finally
        {
            GC.Collect(); GC.WaitForPendingFinalizers();
            for (int i = 0; i < 10; i++) { if (RegUnLoadKey(HkeyUsers, ten) == 0) break; Thread.Sleep(200); }
        }
    }
}
