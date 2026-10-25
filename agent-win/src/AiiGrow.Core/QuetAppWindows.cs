using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace AiiGrow.Core;

/// <summary>Quét app đã cài THẬT trên máy Windows (dịch vụ chạy SYSTEM). Phần quyết định (lọc rác, gộp trùng, đọc .lnk) ở DanhSachApp.cs.
/// Nguồn: Uninstall HKLM 64/32 + HKU\&lt;SID Con&gt; (CHỈ khi hive Con đang nạp — không nạp tạm NTUSER.DAT mỗi 30 phút: nạp đúng lúc Con đăng nhập
/// ⇒ Windows cấp hồ sơ tạm, review #75; app cài riêng cho Con vẫn thấy qua lối tắt Start Menu trong hồ sơ Con), lối tắt Start Menu (ProgramData
/// + hồ sơ Con) và màn hình nền (Public + Con), app Store của tài khoản Con (Get-AppxPackage -User &lt;SID&gt;).</summary>
public static class QuetAppWindows
{
    private const string KhoaUninstall = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall";

    /// <param name="sids">SID tài khoản Con (rỗng ⇒ chỉ phần cả máy).</param>
    /// <param name="loi">Ghi lỗi từng nguồn (không chặn cả lượt quét).</param>
    public static List<AppThat> Quet(IReadOnlyList<string> sids, IThongTinTep tep, Action<string>? loi = null)
    {
        var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        var safe = ProcessGuard.DefaultSafeDirs();
        var hoSo = sids.Where(AppLockerXml.IsValidSid).Select(s => (Sid: s, Dir: ThuMucHoSo(s))).ToList();

        var reg = new List<MucRegistry>();
        try
        {
            using (var k64 = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64)) reg.AddRange(DocUninstall(k64));
            using (var k32 = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry32)) reg.AddRange(DocUninstall(k32));
        }
        catch (Exception e) { loi?.Invoke("registry HKLM: " + e.Message); }
        foreach (var (sid, _) in hoSo)
        {
            try
            {
                if (!new WindowsWebHiveHost().DangNap(sid)) continue;
                using var users = RegistryKey.OpenBaseKey(RegistryHive.Users, RegistryView.Registry64);
                using var u = users.OpenSubKey(sid, false);
                if (u != null) reg.AddRange(DocUninstall(u));
            }
            catch (Exception e) { loi?.Invoke("registry HKU Con: " + e.Message); }
        }

        var sc = new List<MucShortcut>();
        var thuMucLnk = new List<(string Dir, string? HoSo, bool DeQuy)>
        {
            (Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms), null, true),
            (Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory), null, false),
        };
        foreach (var (_, dir) in hoSo)
            if (dir != null)
            {
                thuMucLnk.Add((Path.Combine(dir, @"AppData\Roaming\Microsoft\Windows\Start Menu\Programs"), dir, true));
                thuMucLnk.Add((Path.Combine(dir, "Desktop"), dir, false));
            }
        foreach (var (dir, hs, deQuy) in thuMucLnk)
        {
            if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir)) continue;
            try
            {
                var opt = new EnumerationOptions { RecurseSubdirectories = deQuy, IgnoreInaccessible = true, MaxRecursionDepth = 6 };
                foreach (var f in Directory.EnumerateFiles(dir, "*.lnk", opt).Take(3000))
                {
                    var t = GiaiLoiTat(f, hs);
                    if (t != null) sc.Add(new MucShortcut(Path.GetFileNameWithoutExtension(f), t));
                }
            }
            catch (Exception e) { loi?.Invoke("lối tắt " + dir + ": " + e.Message); }
        }

        var ung = DanhSachApp.Gop(reg, sc, File.Exists, ExeTrong, winDir, safe);
        var kq = DanhSachApp.HoanThien(ung, tep, winDir);
        try { kq.AddRange(DanhSachApp.TuAppx(DocAppx(hoSo.Select(x => x.Sid).ToList(), loi), IconAppx)); }
        catch (Exception e) { loi?.Invoke("app Store: " + e.Message); }
        return DanhSachApp.ChuanHoa(kq);
    }

    private static IReadOnlyList<string> ExeTrong(string dir)
    {
        if (!Directory.Exists(dir)) return Array.Empty<string>();
        return Directory.EnumerateFiles(dir, "*.exe", new EnumerationOptions { IgnoreInaccessible = true }).Take(200).ToList();
    }

    public static string? ThuMucHoSo(string sid)
    {
        try
        {
            using var k = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\" + sid);
            var d = k?.GetValue("ProfileImagePath") as string;
            if (string.IsNullOrWhiteSpace(d)) return null;
            d = Environment.ExpandEnvironmentVariables(d);
            return Directory.Exists(d) ? d : null;
        }
        catch { return null; }
    }

    private static List<MucRegistry> DocUninstall(RegistryKey goc)
    {
        var kq = new List<MucRegistry>();
        using var u = goc.OpenSubKey(KhoaUninstall, false);
        if (u == null) return kq;
        foreach (var ten in u.GetSubKeyNames())
        {
            try
            {
                using var k = u.OpenSubKey(ten, false);
                if (k == null) continue;
                string? S(string n) => k.GetValue(n) is string s && s.Trim().Length > 0 ? s.Trim() : null;
                var sys = k.GetValue("SystemComponent") is int v && v != 0;
                kq.Add(new MucRegistry(S("DisplayName") ?? "", S("DisplayIcon"), S("InstallLocation"), S("DisplayVersion"), S("Publisher"),
                    sys, S("ParentKeyName"), S("ReleaseType")));
            }
            catch { }
        }
        return kq;
    }

    /// <summary>Đích exe của lối tắt (null nếu không phải exe / lối tắt MSI «quảng cáo»). Biến môi trường theo hồ sơ Con; Squirrel ⇒ exe thật.</summary>
    public static string? GiaiLoiTat(string tepLnk, string? hoSo)
    {
        byte[] b;
        try { var fi = new FileInfo(tepLnk); if (fi.Length > 1 << 20) return null; b = File.ReadAllBytes(tepLnk); } catch { return null; }
        var l = DocLnk.Doc(b);
        if (l == null) return null;
        var t = l.Target;
        if ((t == null || !File.Exists(t)) && l.EnvTarget != null)
            t = DocLnk.MoRongTheoHoSo(l.EnvTarget, hoSo, Environment.GetEnvironmentVariable);
        if (t == null || !t.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) return null;
        if (DanhSachApp.TenTep(t).Equals("update.exe", StringComparison.OrdinalIgnoreCase) && DanhSachApp.SquirrelProcessStart(l.Arguments) is { } ten)
        {
            try
            {
                var dir = DanhSachApp.ThuMucCua(t);
                if (dir != null && Directory.Exists(dir) && DanhSachApp.ChonAppSquirrel(Directory.GetDirectories(dir)) is { } app && File.Exists(Path.Combine(app, ten)))
                    return Path.Combine(app, ten);
                if (dir != null && File.Exists(Path.Combine(dir, ten))) return Path.Combine(dir, ten);
            }
            catch { }
            return null;
        }
        return t;
    }

    /// <summary>Gói Store chính của từng tài khoản Con — đọc AppxManifest.xml (tên hiển thị, nhà phát hành, ứng dụng hiện trong danh sách, logo 44×44).</summary>
    private static List<MucAppx> DocAppx(IReadOnlyList<string> sids, Action<string>? loi)
    {
        if (sids.Count == 0) return new();
        var dsSid = string.Join(",", sids.Select(Shell.PsQuote));
        var ps = "$kq = New-Object System.Collections.ArrayList; " +
            "foreach ($sid in @(" + dsSid + ")) { try { foreach ($p in @(Get-AppxPackage -User $sid -PackageTypeFilter Main)) { " +
            "$dn = $null; $pd = $null; $logo = $null; $n = 0; " +
            "try { $x = [xml](Get-Content -LiteralPath (Join-Path $p.InstallLocation 'AppxManifest.xml') -Raw -Encoding UTF8); " +
            "$dn = [string]$x.Package.Properties.DisplayName; $pd = [string]$x.Package.Properties.PublisherDisplayName; " +
            "foreach ($a in @($x.Package.Applications.Application)) { $ve = $a.VisualElements; if ($ve -and $ve.AppListEntry -ne 'none') { $n++; if (-not $logo) { $logo = [string]$ve.Square44x44Logo + '|' + [string]$ve.Square150x150Logo } } } } catch { } " +
            "if ($dn -like 'ms-resource:*') { $r = $dn.Substring(12); if ($r.StartsWith('//')) { $u = 'ms-resource:' + $r } elseif ($r.StartsWith('/')) { $u = 'ms-resource://' + $p.Name + $r } else { $u = 'ms-resource://' + $p.Name + '/resources/' + $r }; $dn = 'ms-resource:@{' + $p.PackageFullName + '?' + $u + '}' } " +
            "[void]$kq.Add([pscustomobject]@{ Name = $p.Name; PackageFamilyName = $p.PackageFamilyName; DisplayName = $dn; PublisherDisplayName = $pd; " +
            "Version = [string]$p.Version; InstallLocation = $p.InstallLocation; IsFramework = [bool]$p.IsFramework; IsResourcePackage = [bool]$p.IsResourcePackage; " +
            "SignatureKind = [string]$p.SignatureKind; NonRemovable = [bool]$p.NonRemovable; SoApplication = $n; Logo = $logo }) } } catch { } }; " +
            "ConvertTo-Json -InputObject @($kq) -Compress -Depth 3";
        var r = Shell.PowerShell(ps, 180000);
        if (!r.Ok) { loi?.Invoke("Get-AppxPackage: " + r.Error); return new(); }
        var ds = DanhSachApp.DocAppxJson(r.Output);
        // DisplayName dạng ms-resource ⇒ giải bằng SHLoadIndirectString (tệp resources.pri của gói); không được thì DanhSachApp dùng tên gói
        return ds.Select(p => p.DisplayName is { } dn && dn.StartsWith("ms-resource:@{", StringComparison.Ordinal)
            ? p with { DisplayName = ChuoiGianTiep(dn["ms-resource:".Length..]) ?? ChuoiGianTiep(dn["ms-resource:".Length..].Replace("/resources/", "/Resources/")) ?? "ms-resource:" }
            : p).ToList();
    }

    [DllImport("shlwapi.dll", CharSet = CharSet.Unicode)]
    private static extern int SHLoadIndirectString(string src, System.Text.StringBuilder outBuf, int cch, IntPtr reserved);

    private static string? ChuoiGianTiep(string src)
    {
        try
        {
            var sb = new System.Text.StringBuilder(512);
            return SHLoadIndirectString(src, sb, sb.Capacity, IntPtr.Zero) == 0 && sb.Length > 0 && !sb.ToString().StartsWith("ms-resource:") ? sb.ToString() : null;
        }
        catch { return null; }
    }

    /// <summary>Logo THẬT của gói Store (Square44x44Logo, không có thì Square150x150Logo trong AppxManifest): biến thể scale / targetsize lớn nhất
    /// mà base64 ≤ 64 KB (DanhSachApp.ChonLogoAppx). Gửi nguyên tệp PNG (đã ≥ 96 px ở các scale lớn — không cần đổi cỡ).</summary>
    private static string? IconAppx(MucAppx p)
    {
        if (string.IsNullOrWhiteSpace(p.Logo) || string.IsNullOrWhiteSpace(p.InstallLocation)) return null;
        foreach (var rel in p.Logo.Split('|', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Replace('/', '\\')))
        {
            var dir = Path.GetDirectoryName(Path.Combine(p.InstallLocation, rel));
            if (dir == null || !Directory.Exists(dir)) continue;
            var tep = new List<(string, int, int, long)>();
            foreach (var f in Directory.EnumerateFiles(dir, Path.GetFileNameWithoutExtension(rel) + "*.png"))
            {
                try
                {
                    var fi = new FileInfo(f);
                    if (fi.Length > DanhSachApp.ToiDaIconBase64) continue;
                    var dau = new byte[24];
                    using (var s = File.OpenRead(f)) if (s.Read(dau, 0, 24) < 24) continue;
                    if (Png.KichThuoc(dau) is { } k) tep.Add((fi.Name, k.W, k.H, fi.Length));
                }
                catch { }
            }
            if (DanhSachApp.ChonLogoAppx(new[] { rel }, tep) is { } chon)
                try { return Convert.ToBase64String(File.ReadAllBytes(Path.Combine(dir, chon))); } catch { }
        }
        return null;
    }
}

/// <summary>Đọc băm / icon / chữ ký / phiên bản của exe trên Windows, có bộ nhớ đệm theo (đường dẫn, cỡ, giờ sửa).</summary>
public sealed class ThongTinTepWindows : IThongTinTep
{
    private readonly BamTepCache _bam;
    private readonly Dictionary<string, (long Len, DateTime Mtime, string? Icon, string? Ky)> _d = new(StringComparer.OrdinalIgnoreCase);

    public ThongTinTepWindows(BamTepCache? bam = null) { _bam = bam ?? BamTepCache.Chung; }

    public string? Sha256(string duongDan) => _bam.Bam(duongDan);

    private (string? Icon, string? Ky) Doc(string p)
    {
        var fi = new FileInfo(p);
        if (!fi.Exists) return (null, null);
        lock (_d) if (_d.TryGetValue(p, out var c) && c.Len == fi.Length && c.Mtime == fi.LastWriteTimeUtc) return (c.Icon, c.Ky);
        string? icon = null, ky = null;
        try { icon = IconExe.PngBase64(p) ?? IconExe.PngMacDinh(); } catch { }
        try
        {
#pragma warning disable SYSLIB0057
            using var cert = new System.Security.Cryptography.X509Certificates.X509Certificate2(
                System.Security.Cryptography.X509Certificates.X509Certificate.CreateFromSignedFile(p));
#pragma warning restore SYSLIB0057
            ky = cert.GetNameInfo(System.Security.Cryptography.X509Certificates.X509NameType.SimpleName, false);
            if (string.IsNullOrWhiteSpace(ky)) ky = null;
        }
        catch { }   // không ký ⇒ dùng Publisher của registry
        lock (_d) { if (_d.Count > 4000) _d.Clear(); _d[p] = (fi.Length, fi.LastWriteTimeUtc, icon, ky); }
        return (icon, ky);
    }

    public string? IconPng(string duongDan) => Doc(duongDan).Icon;
    public string? NguoiKy(string duongDan) => Doc(duongDan).Ky;

    public string? PhienBan(string duongDan)
    {
        var v = FileVersionInfo.GetVersionInfo(duongDan);
        var s = (v.ProductVersion ?? v.FileVersion ?? "").Trim();
        return s.Length == 0 ? null : s;
    }
}

/// <summary>Icon 96×96 của exe ⇒ PNG base64 bằng Win32 (PrivateExtractIcons + GetDIBits) — không cần System.Drawing.</summary>
internal static class IconExe
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern uint PrivateExtractIcons(string file, int index, int cx, int cy, IntPtr[] icons, uint[]? ids, uint n, uint flags);
    [DllImport("user32.dll")] private static extern bool DestroyIcon(IntPtr h);
    [DllImport("user32.dll")] private static extern bool GetIconInfo(IntPtr h, out IconInfo info);
    [DllImport("gdi32.dll")] private static extern bool DeleteObject(IntPtr h);
    [DllImport("gdi32.dll")] private static extern IntPtr CreateCompatibleDC(IntPtr h);
    [DllImport("gdi32.dll")] private static extern bool DeleteDC(IntPtr h);
    [DllImport("gdi32.dll")] private static extern int GetDIBits(IntPtr hdc, IntPtr hbm, uint start, uint lines, byte[] bits, ref BitmapInfo bmi, uint usage);

    [StructLayout(LayoutKind.Sequential)]
    private struct IconInfo { public bool FIcon; public int X; public int Y; public IntPtr Mask; public IntPtr Color; }

    [StructLayout(LayoutKind.Sequential)]
    private struct BitmapInfo
    {
        public uint Size; public int Width; public int Height; public ushort Planes; public ushort BitCount; public uint Compression; public uint SizeImage;
        public int XPels; public int YPels; public uint ClrUsed; public uint ClrImportant;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 256)] public uint[] Colors;
    }

    private const int N = DanhSachApp.CanhIcon;

    private static string? _macDinh;

    /// <summary>Exe không có icon nhúng ⇒ icon «ứng dụng» chung của Windows (shell32.dll #3) — mọi app đều có icon.</summary>
    public static string? PngMacDinh() =>
        _macDinh ??= PngBase64(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "shell32.dll"), 2);

    /// <summary>PrivateExtractIcons cỡ 96: Windows lấy ảnh nhúng gần nhất (thường 256 / 128 / 48) và co giãn về 96×96.</summary>
    public static string? PngBase64(string exe, int index = 0)
    {
        var h = new IntPtr[1];
        if (PrivateExtractIcons(exe, index, N, N, h, null, 1, 0) == 0 || h[0] == IntPtr.Zero) return null;
        try
        {
            if (!GetIconInfo(h[0], out var ii)) return null;
            var dc = CreateCompatibleDC(IntPtr.Zero);
            try
            {
                if (ii.Color == IntPtr.Zero) return null;   // icon đơn sắc cũ — bỏ
                var mau = Bits(dc, ii.Color);
                if (mau == null) return null;
                Png.ApMatNa(mau, ii.Mask != IntPtr.Zero ? Bits(dc, ii.Mask) : null);
                var b64 = Convert.ToBase64String(Png.MaHoa(N, N, mau));
                return b64.Length <= DanhSachApp.ToiDaIconBase64 ? b64 : null;
            }
            finally
            {
                DeleteDC(dc);
                if (ii.Color != IntPtr.Zero) DeleteObject(ii.Color);
                if (ii.Mask != IntPtr.Zero) DeleteObject(ii.Mask);
            }
        }
        finally { DestroyIcon(h[0]); }
    }

    private static byte[]? Bits(IntPtr dc, IntPtr bmp)
    {
        var bi = new BitmapInfo { Size = 40, Width = N, Height = -N, Planes = 1, BitCount = 32, Compression = 0, Colors = new uint[256] };
        var buf = new byte[N * N * 4];
        return GetDIBits(dc, bmp, 0, N, buf, ref bi, 0) == N ? buf : null;
    }
}
