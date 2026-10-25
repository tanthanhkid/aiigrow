using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// DANH SÁCH APP ĐÃ CÀI THẬT trên máy Con (25/10): agent quét (registry Uninstall, lối tắt Start Menu, app Store của tài khoản Con) rồi gửi
// POST /api/device/ung-dung để Ba Mẹ chọn app thật mà chặn / cho phép — máy chủ không còn đoán tên exe. Phần THUẦN ở đây (lọc rác, gộp trùng,
// đọc .lnk, mã PNG, băm, phần đổi, đồng bộ + 409); đọc registry / tệp / PowerShell ở QuetAppWindows.cs.

/// <summary>Một app gửi lên máy chủ (JSON camelCase — hợp đồng «Danh sách app thật»).</summary>
public sealed class AppThat
{
    /// <summary>Duy nhất trong máy: «exe:» + đường dẫn exe chữ thường; Store: «appx:» + PackageFamilyName chữ thường.</summary>
    public string Khoa { get; set; } = "";
    /// <summary>Định danh để xếp / chặn — đúng thứ agent so khi thực thi: tên exe chữ thường, hoặc Name gói Store chữ thường (ProcessGuard.TenGoiStore).</summary>
    public string Muc { get; set; } = "";
    public string Ten { get; set; } = "";
    /// <summary>"registry" | "start" | "store".</summary>
    public string Nguon { get; set; } = "";
    public string? NhaPhatHanh { get; set; }
    public string? DuongDan { get; set; }
    public string? ThuMuc { get; set; }
    public string? PhienBan { get; set; }
    public string? Sha256 { get; set; }
    /// <summary>PNG base64 (không tiền tố data:), 96×96 (≥ 96 px), ≤ 64 KB. CHỈ gửi khi app mới / icon đổi / máy chủ báo thiếu (thieuIcon).</summary>
    public string? Icon { get; set; }
    /// <summary>SHA-256 hex (chữ thường) của byte PNG — luôn gửi khi có icon; máy chủ giữ ảnh cũ nếu trùng.</summary>
    public string? IconBam { get; set; }
}

/// <summary>Một khoá con của Uninstall (HKLM 64/32 hoặc HKU\&lt;SID Con&gt;).</summary>
public sealed record MucRegistry(string Ten, string? DisplayIcon, string? InstallLocation, string? PhienBan, string? Publisher,
    bool SystemComponent = false, string? ParentKeyName = null, string? ReleaseType = null);

/// <summary>Lối tắt Start Menu đã giải ra exe đích (Squirrel «Update.exe --processStart» đã đổi sang exe thật).</summary>
public sealed record MucShortcut(string Ten, string Target);

/// <summary>Gói Store / UWP của tài khoản Con (Get-AppxPackage -User &lt;SID&gt;), DisplayName đã giải ms-resource nếu được.</summary>
public sealed record MucAppx(string Name, string PackageFamilyName, string? DisplayName, string? PublisherDisplayName, string? Version,
    string? InstallLocation, bool IsFramework = false, bool IsResourcePackage = false, string? SignatureKind = null, bool NonRemovable = false,
    int SoApplication = 1, string? Logo = null);

/// <summary>App Win32 trước khi đọc tệp (băm, icon, chữ ký).</summary>
public sealed class UngVienApp
{
    public string DuongDan { get; set; } = "";
    public string Ten { get; set; } = "";
    public string Nguon { get; set; } = "";
    public string? NhaPhatHanh { get; set; }
    public string? PhienBan { get; set; }
    public string? ThuMuc { get; set; }
}

/// <summary>Đọc thông tin một tệp exe (bản Windows ở QuetAppWindows; test dùng bản giả).</summary>
public interface IThongTinTep
{
    string? Sha256(string duongDan);
    /// <summary>Icon THẬT của exe ⇒ PNG 96×96 base64.</summary>
    string? IconPng(string duongDan);
    /// <summary>CN chữ ký Authenticode (không kiểm chuỗi tin cậy — chỉ để hiển thị).</summary>
    string? NguoiKy(string duongDan);
    string? PhienBan(string duongDan);
}

public static class DanhSachApp
{
    public const int ToiDaApp = 1500;
    public const int ToiDaChu = 300;
    public const int ToiDaIconBase64 = 64 * 1024;
    /// <summary>Cạnh icon (px) — nét khi app Ba Mẹ hiện 40–48 pt @3x.</summary>
    public const int CanhIcon = 96;
    /// <summary>Tổng icon base64 tối đa trong một lần gửi — phần còn lại gửi ở lượt kế (giữ thân yêu cầu nhỏ, không vướng giới hạn thân của máy chủ).</summary>
    public const int TongIconToiDa = 3 * 1024 * 1024;

    // ------------------------------------------------------------------ lọc rác

    private static readonly System.Text.RegularExpressions.Regex KbRegex = new(@"\bKB\d{6,8}\b",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <summary>Mục Uninstall không phải app người dùng mở: thành phần hệ thống, bản con của gói khác, bản cập nhật / KB.</summary>
    public static bool LaRacRegistry(MucRegistry m)
    {
        if (string.IsNullOrWhiteSpace(m.Ten)) return true;
        if (m.SystemComponent) return true;
        if (!string.IsNullOrWhiteSpace(m.ParentKeyName)) return true;
        var rt = (m.ReleaseType ?? "").Trim();
        if (rt.Length > 0 && (rt.Contains("Update", StringComparison.OrdinalIgnoreCase) || rt.Contains("Hotfix", StringComparison.OrdinalIgnoreCase)
            || rt.Contains("Service Pack", StringComparison.OrdinalIgnoreCase))) return true;
        return KbRegex.IsMatch(m.Ten);
    }

    /// <summary>Tên tệp là trình gỡ / cài / cập nhật / báo lỗi — không phải exe giao diện của app.</summary>
    public static bool LaTrinhPhu(string tenTep)
    {
        var n = tenTep.ToLowerInvariant();
        if (!n.EndsWith(".exe")) return true;
        if (n.StartsWith("unins") || n.Contains("uninstall") || n.StartsWith("uninst")) return true;
        if (n.StartsWith("vc_redist") || n.StartsWith("vcredist") || n.StartsWith("dotnet-") || n.StartsWith("windowsdesktop-runtime")) return true;
        if (n.Contains("crashpad") || n.Contains("crashreport") || n.Contains("crashhandler") || n.Contains("bugreport")) return true;
        return n is "setup.exe" or "install.exe" or "installer.exe" or "update.exe" or "updater.exe" or "maintenancetool.exe"
            or "notification_helper.exe" or "elevation_service.exe" or "squirrel.exe" or "msiexec.exe" or "rundll32.exe";
    }

    /// <summary>Exe trong DisplayIcon («"C:\a\app.exe",0» ⇒ C:\a\app.exe); .ico / .dll ⇒ null.</summary>
    public static string? ExeTuDisplayIcon(string? icon)
    {
        if (string.IsNullOrWhiteSpace(icon)) return null;
        var s = icon.Trim();
        if (s.StartsWith('"'))
        {
            var j = s.IndexOf('"', 1);
            s = j > 0 ? s[1..j] : s.Trim('"');
        }
        else
        {
            var phay = s.LastIndexOf(',');
            if (phay > 0 && int.TryParse(s[(phay + 1)..].Trim(), out _)) s = s[..phay];
        }
        s = s.Trim().Trim('"').Replace('/', '\\');
        return s.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && LaDuongTuyetDoi(s) ? s : null;
    }

    public static bool LaDuongTuyetDoi(string p) =>
        p.Length > 3 && char.IsAsciiLetter(p[0]) && p[1] == ':' && p[2] == '\\' && !p.Contains("..") && p.IndexOf(':', 2) < 0;

    public static string ChuanThuMuc(string? d)
    {
        var s = (d ?? "").Trim().Trim('"').Replace('/', '\\');
        while (s.Length > 3 && s.EndsWith('\\')) s = s[..^1];
        return s;
    }

    public static string TenTep(string p)
    {
        var i = p.LastIndexOfAny(new[] { '\\', '/' });
        return i < 0 ? p : p[(i + 1)..];
    }

    public static string? ThuMucCua(string p)
    {
        var i = p.LastIndexOfAny(new[] { '\\', '/' });
        return i <= 0 ? null : p[..i];
    }

    public static bool Trong(string duong, string thuMuc) =>
        thuMuc.Length > 0 && duong.StartsWith(thuMuc.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase);

    /// <summary>Exe không đưa vào danh sách: thành phần Windows (trừ app người dùng mở được như notepad / cmd / mspaint), AiiGrow / Defender /
    /// Common Files, bộ cài trong Package Cache / Windows\Installer, exe trong gói Store (Store quét riêng).</summary>
    public static bool BoQua(string exe, string? winDir, IEnumerable<string> safeDirs)
    {
        if (!LaDuongTuyetDoi(exe)) return true;
        if (ProcessGuard.TrongWindows(ThuMucCua(exe), winDir))
            return !(ProcessGuard.UngDungTrongWindows.Contains(TenTep(exe)) && ProcessGuard.TrongWindowsChiQuanTri(exe, winDir));
        foreach (var d in safeDirs) if (!string.IsNullOrEmpty(d) && Trong(exe, d)) return true;
        if (exe.Contains(@"\Package Cache\", StringComparison.OrdinalIgnoreCase)) return true;
        if (exe.Contains(@"\WindowsApps\", StringComparison.OrdinalIgnoreCase)) return true;
        return TenTep(exe).StartsWith("AiiGrow.", StringComparison.OrdinalIgnoreCase);
    }

    // ------------------------------------------------------------------ Squirrel (Discord, Teams cũ, Slack…): lối tắt trỏ Update.exe --processStart X.exe

    /// <summary>Tên exe trong «--processStart X.exe» / «--processStart "X.exe"»; không có ⇒ null.</summary>
    public static string? SquirrelProcessStart(string? args)
    {
        if (string.IsNullOrWhiteSpace(args)) return null;
        var m = System.Text.RegularExpressions.Regex.Match(args, "--processStart\\s+(\"([^\"]+)\"|(\\S+))", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (!m.Success) return null;
        var t = (m.Groups[2].Success ? m.Groups[2].Value : m.Groups[3].Value).Trim();
        return t.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && t.IndexOfAny(new[] { '\\', '/' }) < 0 ? t : null;
    }

    /// <summary>Thư mục «app-&lt;bản&gt;» mới nhất (so theo bản số).</summary>
    public static string? ChonAppSquirrel(IEnumerable<string> thuMucCon)
    {
        string? tot = null; Version? ban = null;
        foreach (var d in thuMucCon)
        {
            var ten = TenTep(d.TrimEnd('\\', '/'));
            if (!ten.StartsWith("app-", StringComparison.OrdinalIgnoreCase)) continue;
            if (!Version.TryParse(ten[4..].Split('-')[0], out var v)) continue;
            if (ban == null || v > ban) { ban = v; tot = d; }
        }
        return tot;
    }

    // ------------------------------------------------------------------ gộp registry + lối tắt

    /// <param name="tonTai">Tệp có thật không.</param>
    /// <param name="exeTrong">Các exe ngay trong một thư mục (không đệ quy).</param>
    public static List<UngVienApp> Gop(IEnumerable<MucRegistry> registry, IEnumerable<MucShortcut> shortcuts, Func<string, bool> tonTai,
        Func<string, IReadOnlyList<string>> exeTrong, string? winDir, IEnumerable<string> safeDirs)
    {
        var safe = safeDirs.ToList();
        var theoExe = new Dictionary<string, UngVienApp>(StringComparer.OrdinalIgnoreCase);
        bool DungDuoc(string? exe) => exe != null && !LaTrinhPhu(TenTep(exe)) && !BoQua(exe, winDir, safe) && tonTai(exe);

        // lối tắt trước (tên thân thuộc với Con), sắp theo tên ⇒ kết quả tất định
        foreach (var s in shortcuts.OrderBy(x => x.Ten, StringComparer.OrdinalIgnoreCase).ThenBy(x => x.Target, StringComparer.OrdinalIgnoreCase))
        {
            var exe = s.Target.Trim().Trim('"').Replace('/', '\\');
            if (!DungDuoc(exe) || theoExe.ContainsKey(exe)) continue;
            var ten = s.Ten.Trim();
            if (ten.Length == 0 || ten.Contains("uninstall", StringComparison.OrdinalIgnoreCase) || ten.StartsWith("Gỡ ", StringComparison.OrdinalIgnoreCase)) continue;
            theoExe[exe] = new UngVienApp { DuongDan = exe, Ten = ten, Nguon = "start" };
        }

        foreach (var r in registry.Where(x => !LaRacRegistry(x)).OrderBy(x => x.Ten, StringComparer.OrdinalIgnoreCase))
        {
            var thuMuc = ChuanThuMuc(r.InstallLocation);
            if (thuMuc.Length > 0 && !ChanAppThat.ThuMucHopLe(thuMuc, winDir)) thuMuc = "";   // C:\, Program Files… không dùng để ghép / chặn
            var exe = ExeTuDisplayIcon(r.DisplayIcon);
            if (!DungDuoc(exe)) exe = null;
            void Ghep(UngVienApp a, bool doiTen)
            {
                if (doiTen) a.Ten = r.Ten.Trim();
                a.Nguon = "registry";
                a.NhaPhatHanh ??= Rong(r.Publisher);
                a.PhienBan ??= Rong(r.PhienBan);
                if (thuMuc.Length > 0 && Trong(a.DuongDan, thuMuc)) a.ThuMuc ??= thuMuc;
            }
            if (exe != null && theoExe.TryGetValue(exe, out var co)) { Ghep(co, true); continue; }
            if (thuMuc.Length > 0)
            {
                var trongThuMuc = theoExe.Values.Where(a => Trong(a.DuongDan, thuMuc)).ToList();
                if (trongThuMuc.Count > 0)
                {
                    foreach (var a in trongThuMuc) Ghep(a, trongThuMuc.Count == 1);
                    continue;
                }
            }
            if (exe == null && thuMuc.Length > 0)
            {
                IReadOnlyList<string> ds;
                try { ds = exeTrong(thuMuc); } catch { ds = Array.Empty<string>(); }
                var dung = ds.Where(DungDuoc).ToList();
                if (dung.Count == 1) exe = dung[0];
                else if (dung.Count > 1)
                {
                    // nhiều exe: chọn cái trùng tên app («Notepad++» ⇒ notepad++.exe) — không đoán bừa
                    var khoa = BoKyTu(r.Ten);
                    var hop = dung.Where(e => khoa.Length >= 3 && (khoa.StartsWith(BoKyTu(Path.GetFileNameWithoutExtension(TenTep(e))), StringComparison.Ordinal)
                        && BoKyTu(Path.GetFileNameWithoutExtension(TenTep(e))).Length >= 3)).ToList();
                    if (hop.Count == 1) exe = hop[0];
                }
            }
            if (exe == null) continue;   // runtime / thư viện không có exe giao diện
            if (theoExe.TryGetValue(exe, out var co2)) { Ghep(co2, true); continue; }
            var moi = new UngVienApp { DuongDan = exe, Ten = r.Ten.Trim(), Nguon = "registry" };
            theoExe[exe] = moi;
            Ghep(moi, false);
        }
        var ketQua = theoExe.Values.OrderBy(a => a.DuongDan, StringComparer.OrdinalIgnoreCase).ToList();
        foreach (var a in ketQua) a.ThuMuc ??= ThuMucCua(a.DuongDan);
        // thư mục chứa exe của app KHÁC trong danh sách (Office: Word + Excel cùng root\Office16) ⇒ không gửi thuMuc: chặn Word không được chặn cả Excel
        foreach (var a in ketQua)
            if (a.ThuMuc != null && ketQua.Any(b => !ReferenceEquals(a, b) && Trong(b.DuongDan, a.ThuMuc))) a.ThuMuc = null;
        return ketQua;
    }

    private static string BoKyTu(string s) => new(s.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
    private static string? Rong(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    /// <summary>Ứng viên Win32 ⇒ AppThat (đọc băm / icon / chữ ký qua <paramref name="tep"/>; lỗi đọc thì bỏ trường đó, app vẫn gửi).</summary>
    public static List<AppThat> HoanThien(IEnumerable<UngVienApp> ds, IThongTinTep tep, string? winDir)
    {
        var kq = new List<AppThat>();
        foreach (var a in ds)
        {
            string? T(Func<string?> f) { try { return f(); } catch { return null; } }
            var thuMuc = a.ThuMuc != null && ChanAppThat.ThuMucHopLe(a.ThuMuc, winDir) ? ChuanThuMuc(a.ThuMuc) : null;
            kq.Add(new AppThat
            {
                Khoa = "exe:" + a.DuongDan.ToLowerInvariant(),
                Muc = TenTep(a.DuongDan).ToLowerInvariant(),
                Ten = a.Ten,
                Nguon = a.Nguon,
                NhaPhatHanh = T(() => tep.NguoiKy(a.DuongDan)) ?? a.NhaPhatHanh,
                DuongDan = a.DuongDan,
                ThuMuc = thuMuc,
                PhienBan = a.PhienBan ?? T(() => tep.PhienBan(a.DuongDan)),
                Sha256 = T(() => tep.Sha256(a.DuongDan))?.ToLowerInvariant(),
                Icon = T(() => tep.IconPng(a.DuongDan)),
            });
        }
        return kq;
    }

    /// <summary>Gói Store ⇒ AppThat: bỏ Framework / Resource / gói hệ thống (ProcessGuard.GoiStoreHeThong), gói không có Application, gói ký «System»
    /// không gỡ được. Gộp trùng theo PackageFamilyName (nhiều tài khoản Con).</summary>
    public static List<AppThat> TuAppx(IEnumerable<MucAppx> ds, Func<MucAppx, string?>? icon = null)
    {
        var kq = new Dictionary<string, AppThat>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in ds)
        {
            if (string.IsNullOrWhiteSpace(p.Name) || string.IsNullOrWhiteSpace(p.PackageFamilyName)) continue;
            if (p.IsFramework || p.IsResourcePackage || p.SoApplication <= 0) continue;
            var ten = p.Name.Trim().ToLowerInvariant();
            if (ProcessGuard.LaGoiStoreHeThong(ten)) continue;
            if (string.Equals(p.SignatureKind, "System", StringComparison.OrdinalIgnoreCase) && p.NonRemovable) continue;
            if (ten.StartsWith("microsoft.windows.", StringComparison.Ordinal) && string.Equals(p.SignatureKind, "System", StringComparison.OrdinalIgnoreCase)) continue;
            var khoa = "appx:" + p.PackageFamilyName.Trim().ToLowerInvariant();
            if (kq.ContainsKey(khoa)) continue;
            var hien = p.DisplayName;
            if (string.IsNullOrWhiteSpace(hien) || hien.StartsWith("ms-resource:", StringComparison.OrdinalIgnoreCase)) hien = TenDepTuGoi(p.Name);
            string? ic = null;
            if (icon != null) { try { ic = icon(p); } catch { } }
            kq[khoa] = new AppThat
            {
                Khoa = khoa, Muc = ten, Ten = hien!.Trim(), Nguon = "store",
                NhaPhatHanh = Rong(p.PublisherDisplayName), PhienBan = Rong(p.Version), Icon = ic,
            };
        }
        return kq.Values.ToList();
    }

    /// <summary>Chọn tệp logo app Store THẬT từ manifest (THUẦN): các biến thể «&lt;gốc&gt;.scale-N.png», «.targetsize-N[_altform-…].png», «&lt;gốc&gt;.png»
    /// trong cùng thư mục; bỏ contrast-black/white; chọn cái LỚN NHẤT (theo cạnh PNG) mà base64 ≤ 64 KB, ưu tiên ≥ 96 px; Square44x44Logo trước,
    /// không có thì Square150x150Logo. <paramref name="tep"/>: (tên tệp, rộng, cao, số byte) trong thư mục logo.</summary>
    public static string? ChonLogoAppx(IEnumerable<string> gocLogo, IEnumerable<(string Ten, int W, int H, long Byte)> tep)
    {
        var ds = tep.ToList();
        foreach (var goc in gocLogo)
        {
            if (string.IsNullOrWhiteSpace(goc)) continue;
            var ten = TenTep(goc.Replace('/', '\\'));
            var dau = ten.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? ten[..^4] : ten;
            var hop = ds.Where(f => f.Ten.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
                    && (f.Ten.Equals(dau + ".png", StringComparison.OrdinalIgnoreCase) || f.Ten.StartsWith(dau + ".", StringComparison.OrdinalIgnoreCase))
                    && !f.Ten.Contains("contrast-", StringComparison.OrdinalIgnoreCase)
                    && f.W > 0 && f.H > 0 && (f.Byte + 2) / 3 * 4 <= ToiDaIconBase64)
                .OrderByDescending(f => Math.Min(f.W, f.H))
                .ThenByDescending(f => f.Ten.Contains("altform-unplated", StringComparison.OrdinalIgnoreCase))
                .ThenBy(f => f.Ten, StringComparer.OrdinalIgnoreCase).ToList();
            if (hop.Count > 0) return hop[0].Ten;
        }
        return null;
    }

    /// <summary>«Microsoft.MinecraftUWP» ⇒ «MinecraftUWP» (khi không giải được DisplayName).</summary>
    public static string TenDepTuGoi(string name)
    {
        var t = name.Trim();
        var i = t.IndexOf('.');
        return i > 0 && i < t.Length - 1 ? t[(i + 1)..] : t;
    }

    /// <summary>Đọc JSON từ PowerShell Get-AppxPackage (mảng hoặc một đối tượng).</summary>
    public static List<MucAppx> DocAppxJson(string? json)
    {
        var kq = new List<MucAppx>();
        if (string.IsNullOrWhiteSpace(json)) return kq;
        using var doc = JsonDocument.Parse(json.Trim());
        var items = doc.RootElement.ValueKind == JsonValueKind.Array ? doc.RootElement.EnumerateArray().ToList() : new List<JsonElement> { doc.RootElement };
        foreach (var e in items)
        {
            if (e.ValueKind != JsonValueKind.Object) continue;
            string? S(string n) => e.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
            bool B(string n) => e.TryGetProperty(n, out var v) && (v.ValueKind == JsonValueKind.True || (v.ValueKind == JsonValueKind.Number && v.GetInt32() != 0));
            int I(string n) => e.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var x) ? x : 0;
            kq.Add(new MucAppx(S("Name") ?? "", S("PackageFamilyName") ?? "", S("DisplayName"), S("PublisherDisplayName"), S("Version"),
                S("InstallLocation"), B("IsFramework"), B("IsResourcePackage"), S("SignatureKind"), B("NonRemovable"), I("SoApplication"), S("Logo")));
        }
        return kq;
    }

    // ------------------------------------------------------------------ chuẩn hoá, băm, phần đổi

    /// <summary>Cắt chữ ≤ 300, bỏ icon &gt; 64 KB / không phải PNG (tính iconBam), bỏ app thiếu khoa/muc/tên, khoa trùng giữ cái đầu, sắp theo khoa, tối đa 1500.</summary>
    public static List<AppThat> ChuanHoa(IEnumerable<AppThat> ds)
    {
        static string? C(string? s) => s == null ? null : (s.Length > ToiDaChu ? s[..ToiDaChu] : s);
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var kq = new List<AppThat>();
        foreach (var a in ds)
        {
            var khoa = (a.Khoa ?? "").Trim().ToLowerInvariant();
            var muc = (a.Muc ?? "").Trim().ToLowerInvariant();
            var ten = (a.Ten ?? "").Trim();
            if (khoa.Length == 0 || muc.Length == 0 || ten.Length == 0 || !seen.Add(khoa)) continue;
            kq.Add(new AppThat
            {
                Khoa = khoa, Muc = C(muc)!, Ten = C(ten)!, Nguon = a.Nguon, NhaPhatHanh = C(Rong(a.NhaPhatHanh)), DuongDan = a.DuongDan, ThuMuc = a.ThuMuc,
                PhienBan = C(Rong(a.PhienBan)), Sha256 = Rong(a.Sha256)?.ToLowerInvariant(),
                Icon = a.Icon is { Length: > 0 and <= ToiDaIconBase64 } ? a.Icon : null,
            });
            var moi = kq[^1];
            moi.IconBam = moi.Icon == null ? null : BamIcon(moi.Icon);
            if (moi.IconBam == null) moi.Icon = null;
        }
        return kq.OrderBy(a => a.Khoa, StringComparer.Ordinal).Take(ToiDaApp).ToList();
    }

    /// <summary>SHA-256 hex chữ thường của byte PNG (base64 hỏng / không phải PNG ⇒ null).</summary>
    public static string? BamIcon(string base64)
    {
        try
        {
            var b = Convert.FromBase64String(base64);
            return Png.KichThuoc(b) == null ? null : Hex(SHA256.HashData(b));
        }
        catch (FormatException) { return null; }
    }

    private static string Hex(byte[] b) => Convert.ToHexString(b).ToLowerInvariant();
    private static string Sha(string s) => Hex(SHA256.HashData(Encoding.UTF8.GetBytes(s)));

    /// <summary>Vân tay một app: đổi bất kỳ trường nào (icon tính theo iconBam, không theo byte) ⇒ vân tay đổi.</summary>
    public static string VanTay(AppThat a) =>
        Sha(string.Join("\u001f", a.Khoa, a.Muc, a.Ten, a.Nguon, a.NhaPhatHanh ?? "", a.DuongDan ?? "", a.ThuMuc ?? "", a.PhienBan ?? "",
            a.Sha256 ?? "", a.IconBam ?? ""))[..32];

    /// <summary>Bam cả danh sách (tất định, không phụ thuộc thứ tự vào): SHA-256 hex của «khoa vân-tay» đã sắp theo khoa.</summary>
    public static string TinhBam(IEnumerable<AppThat> ds) =>
        Sha(string.Join("\n", ds.Select(a => a.Khoa + " " + VanTay(a)).OrderBy(x => x, StringComparer.Ordinal)));

    public static Dictionary<string, string> BangVanTay(IEnumerable<AppThat> ds)
    {
        var d = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var a in ds) d[a.Khoa] = VanTay(a);
        return d;
    }

    /// <summary>Phần đổi so với lần gửi trước: them = app mới hoặc đổi; bo = khoa đã gỡ.</summary>
    public static (List<AppThat> Them, List<string> Bo) PhanDoi(IReadOnlyList<AppThat> ds, IReadOnlyDictionary<string, string> truoc)
    {
        var them = ds.Where(a => !truoc.TryGetValue(a.Khoa, out var vt) || vt != VanTay(a)).ToList();
        var co = new HashSet<string>(ds.Select(a => a.Khoa), StringComparer.Ordinal);
        var bo = truoc.Keys.Where(k => !co.Contains(k)).OrderBy(k => k, StringComparer.Ordinal).ToList();
        return (them, bo);
    }
}

// ------------------------------------------------------------------ đọc tệp .lnk (MS-SHLLINK) — thuần, không COM (dịch vụ SYSTEM, test trên Mac)

public sealed record LoiTat(string? Target, string? Arguments, string? EnvTarget);

public static class DocLnk
{
    private const int HasLinkTargetIdList = 0x1, HasLinkInfo = 0x2, HasName = 0x4, HasRelativePath = 0x8, HasWorkingDir = 0x10,
        HasArguments = 0x20, HasIconLocation = 0x40, IsUnicode = 0x80;

    /// <summary>Đích (LinkInfo LocalBasePath + CommonPathSuffix), đối số, và đích dạng biến môi trường (EnvironmentVariableDataBlock). Lỗi ⇒ null.</summary>
    public static LoiTat? Doc(byte[] b)
    {
        try
        {
            if (b.Length < 0x4C || BitConverter.ToInt32(b, 0) != 0x4C) return null;
            int flags = BitConverter.ToInt32(b, 0x14);
            int pos = 0x4C;
            if ((flags & HasLinkTargetIdList) != 0) pos += 2 + BitConverter.ToUInt16(b, pos);
            string? target = null;
            if ((flags & HasLinkInfo) != 0)
            {
                int start = pos;
                int size = BitConverter.ToInt32(b, start);
                int hdr = BitConverter.ToInt32(b, start + 4);
                int liFlags = BitConverter.ToInt32(b, start + 8);
                if ((liFlags & 1) != 0)   // VolumeIDAndLocalBasePath
                {
                    string? basePath = null, suffix = null;
                    if (hdr >= 0x24)
                    {
                        int ou = BitConverter.ToInt32(b, start + 0x1C), su = BitConverter.ToInt32(b, start + 0x20);
                        if (ou > 0) basePath = ChuoiUnicode0(b, start + ou);
                        if (su > 0) suffix = ChuoiUnicode0(b, start + su);
                    }
                    if (basePath == null) basePath = ChuoiAnsi0(b, start + BitConverter.ToInt32(b, start + 0x10));
                    suffix ??= ChuoiAnsi0(b, start + BitConverter.ToInt32(b, start + 0x18));
                    if (!string.IsNullOrEmpty(basePath))
                        target = string.IsNullOrEmpty(suffix) ? basePath : basePath.TrimEnd('\\') + "\\" + suffix;
                }
                pos = start + size;
            }
            bool uni = (flags & IsUnicode) != 0;
            string? DocChuoi()
            {
                int n = BitConverter.ToUInt16(b, pos); pos += 2;
                var s = uni ? Encoding.Unicode.GetString(b, pos, n * 2) : Encoding.Latin1.GetString(b, pos, n);
                pos += uni ? n * 2 : n;
                return s;
            }
            string? args = null;
            if ((flags & HasName) != 0) DocChuoi();
            if ((flags & HasRelativePath) != 0) DocChuoi();
            if ((flags & HasWorkingDir) != 0) DocChuoi();
            if ((flags & HasArguments) != 0) args = DocChuoi();
            if ((flags & HasIconLocation) != 0) DocChuoi();
            // ExtraData: tìm EnvironmentVariableDataBlock (0xA0000001)
            string? env = null;
            while (pos + 8 <= b.Length)
            {
                int bs = BitConverter.ToInt32(b, pos);
                if (bs < 4) break;
                uint sig = BitConverter.ToUInt32(b, pos + 4);
                if (sig == 0xA0000001 && bs >= 0x314) env = ChuoiUnicode0(b, pos + 8 + 260);
                pos += bs;
            }
            return new LoiTat(target, args, string.IsNullOrWhiteSpace(env) ? null : env);
        }
        catch { return null; }
    }

    private static string ChuoiAnsi0(byte[] b, int i)
    {
        int j = i; while (j < b.Length && b[j] != 0) j++;
        return Encoding.Latin1.GetString(b, i, j - i);
    }

    private static string ChuoiUnicode0(byte[] b, int i)
    {
        int j = i; while (j + 1 < b.Length && (b[j] != 0 || b[j + 1] != 0)) j += 2;
        return Encoding.Unicode.GetString(b, i, j - i);
    }

    /// <summary>Mở rộng biến môi trường trong đích lối tắt theo HỒ SƠ CON (dịch vụ chạy SYSTEM — Environment.ExpandEnvironmentVariables ra hồ sơ SYSTEM).</summary>
    public static string MoRongTheoHoSo(string s, string? hoSo, Func<string, string?> bienMay)
    {
        return System.Text.RegularExpressions.Regex.Replace(s, "%([^%]+)%", m =>
        {
            var ten = m.Groups[1].Value.ToUpperInvariant();
            if (hoSo != null)
            {
                if (ten == "USERPROFILE") return hoSo;
                if (ten == "LOCALAPPDATA") return hoSo + @"\AppData\Local";
                if (ten == "APPDATA") return hoSo + @"\AppData\Roaming";
            }
            else if (ten is "USERPROFILE" or "LOCALAPPDATA" or "APPDATA") return m.Value;   // để nguyên ⇒ không phải đường tuyệt đối ⇒ bỏ
            return bienMay(m.Groups[1].Value) ?? m.Value;
        });
    }
}

// ------------------------------------------------------------------ mã PNG (RGBA 8 bit) — không cần System.Drawing

public static class Png
{
    private static readonly uint[] Crc = TaoBangCrc();

    private static uint[] TaoBangCrc()
    {
        var t = new uint[256];
        for (uint n = 0; n < 256; n++)
        {
            uint c = n;
            for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320u ^ (c >> 1) : c >> 1;
            t[n] = c;
        }
        return t;
    }

    private static uint TinhCrc(byte[] b, int off, int len)
    {
        uint c = 0xFFFFFFFFu;
        for (int i = off; i < off + len; i++) c = Crc[(c ^ b[i]) & 0xFF] ^ (c >> 8);
        return c ^ 0xFFFFFFFFu;
    }

    /// <summary>Ảnh BGRA (hàng trên cùng trước) ⇒ PNG RGBA.</summary>
    public static byte[] MaHoa(int w, int h, byte[] bgra)
    {
        if (w <= 0 || h <= 0 || bgra.Length < w * h * 4) throw new ArgumentException("kích thước ảnh sai");
        var raw = new byte[h * (w * 4 + 1)];
        for (int y = 0; y < h; y++)
        {
            int o = y * (w * 4 + 1);
            raw[o] = 0;
            for (int x = 0; x < w; x++)
            {
                int s = (y * w + x) * 4, d = o + 1 + x * 4;
                raw[d] = bgra[s + 2]; raw[d + 1] = bgra[s + 1]; raw[d + 2] = bgra[s]; raw[d + 3] = bgra[s + 3];
            }
        }
        byte[] nen;
        using (var ms = new MemoryStream())
        {
            using (var z = new ZLibStream(ms, CompressionLevel.SmallestSize, true)) z.Write(raw, 0, raw.Length);
            nen = ms.ToArray();
        }
        using var outp = new MemoryStream();
        outp.Write(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A });
        var ihdr = new byte[13];
        GhiBE(ihdr, 0, (uint)w); GhiBE(ihdr, 4, (uint)h);
        ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
        Khuc(outp, "IHDR", ihdr);
        Khuc(outp, "IDAT", nen);
        Khuc(outp, "IEND", Array.Empty<byte>());
        return outp.ToArray();
    }

    private static void GhiBE(byte[] b, int o, uint v) { b[o] = (byte)(v >> 24); b[o + 1] = (byte)(v >> 16); b[o + 2] = (byte)(v >> 8); b[o + 3] = (byte)v; }

    private static void Khuc(Stream s, string loai, byte[] data)
    {
        var len = new byte[4]; GhiBE(len, 0, (uint)data.Length); s.Write(len);
        var buf = new byte[4 + data.Length];
        Encoding.ASCII.GetBytes(loai, 0, 4, buf, 0);
        Buffer.BlockCopy(data, 0, buf, 4, data.Length);
        s.Write(buf);
        var crc = new byte[4]; GhiBE(crc, 0, TinhCrc(buf, 0, buf.Length)); s.Write(crc);
    }

    /// <summary>Rộng × cao từ IHDR; không phải PNG ⇒ null.</summary>
    public static (int W, int H)? KichThuoc(byte[] png)
    {
        if (png.Length < 24 || png[0] != 0x89 || png[1] != 0x50 || png[2] != 0x4E || png[3] != 0x47) return null;
        int Be(int o) => (png[o] << 24) | (png[o + 1] << 16) | (png[o + 2] << 8) | png[o + 3];
        return (Be(16), Be(20));
    }

    /// <summary>Icon BGRA không có kênh alpha (icon cũ: alpha toàn 0) ⇒ lấy alpha từ mặt nạ (mặt nạ đen = điểm hiện).</summary>
    public static void ApMatNa(byte[] bgra, byte[]? matNaBgra)
    {
        bool coAlpha = false;
        for (int i = 3; i < bgra.Length; i += 4) if (bgra[i] != 0) { coAlpha = true; break; }
        if (coAlpha) return;
        for (int i = 0; i + 3 < bgra.Length; i += 4)
            bgra[i + 3] = matNaBgra == null || (i + 2 < matNaBgra.Length && matNaBgra[i] == 0 && matNaBgra[i + 1] == 0 && matNaBgra[i + 2] == 0) ? (byte)255 : (byte)0;
    }
}

// ------------------------------------------------------------------ tín hiệu máy chủ + gửi lên (đủ / phần đổi / 409)

/// <summary>`danhSachApp` ở gốc phản hồi dong-bo: bam máy chủ đang giữ, yêu cầu «Làm mới» của Ba Mẹ.</summary>
public sealed record TinHieuDanhSachApp(string? Bam, string? YeuCau)
{
    /// <summary>Đọc từ phản hồi dong-bo thô; vắng trường (máy chủ cũ) ⇒ null.</summary>
    public static TinHieuDanhSachApp? Doc(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Object || !doc.RootElement.TryGetProperty("danhSachApp", out var d) || d.ValueKind != JsonValueKind.Object) return null;
            string? S(string n) => d.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.String && v.GetString() is { Length: > 0 } s ? s : null;
            return new TinHieuDanhSachApp(S("bam"), S("yeuCau"));
        }
        catch (JsonException) { return null; }
    }
}

/// <summary>Bam + yêu cầu «Làm mới» đã xử lý — lưu trong AgentConfig.DanhSachApp.</summary>
public sealed class DanhSachAppDaGui
{
    public string? Bam { get; set; }
    public string? YeuCau { get; set; }
    public DateTimeOffset? Luc { get; set; }
}

/// <summary>Nơi lưu lần gửi được trước: bam + vân tay từng app (để tính phần đổi). Không có vân tay ⇒ chỉ gửi đủ.</summary>
public interface IKhoDanhSachApp
{
    /// <summary>Bam + vân tay từng app lần gửi được trước, và iconBam máy chủ ĐÃ CÓ ảnh theo từng khoa (để chỉ gửi icon khi mới / đổi / thiếu).</summary>
    (string? Bam, IReadOnlyDictionary<string, string>? VanTay, IReadOnlyDictionary<string, string>? IconDaCo) Doc();
    void Luu(string bam, IReadOnlyDictionary<string, string> vanTay, IReadOnlyDictionary<string, string> iconDaCo);
}

public interface IUngDungApi
{
    /// <summary>POST /api/device/ung-dung → thân phản hồi 200 (có thể có thieuIcon). Lỗi HTTP ⇒ ApiException (409 can_gui_du, 404 máy chủ cũ…).</summary>
    Task<string> GuiAsync(object body, CancellationToken ct);
}

public enum KieuGuiApp { KhongDoi, PhanDoi, Du }

public sealed class DongBoDanhSachApp
{
    private readonly IUngDungApi _api;
    private readonly IKhoDanhSachApp _kho;
    public DongBoDanhSachApp(IUngDungApi api, IKhoDanhSachApp kho) { _api = api; _kho = kho; }

    /// <summary>Lần này gửi gì (THUẦN): ép đủ ⇒ đủ; bam không đổi và không còn icon chờ gửi ⇒ không gửi; có bam + vân tay lần trước ⇒ phần đổi;
    /// còn lại ⇒ đủ.</summary>
    public static KieuGuiApp Chon(string bamMoi, string? bamTruoc, bool coVanTay, bool epDu, bool conIcon = false) =>
        epDu ? KieuGuiApp.Du
        : bamTruoc == bamMoi && !conIcon ? KieuGuiApp.KhongDoi
        : bamTruoc != null && coVanTay ? KieuGuiApp.PhanDoi : KieuGuiApp.Du;

    /// <summary>App cần gửi kèm byte icon: có icon mà máy chủ chưa có đúng iconBam đó.</summary>
    public static bool CanIcon(AppThat a, IReadOnlyDictionary<string, string>? daCo) =>
        a.Icon != null && a.IconBam != null && (daCo == null || !daCo.TryGetValue(a.Khoa, out var b) || b != a.IconBam);

    /// <summary>Bản gửi đi của danh sách: icon chỉ cho app <see cref="CanIcon"/>, trong ngân sách <see cref="DanhSachApp.TongIconToiDa"/>; app khác chỉ iconBam.
    /// → (bản gửi, khoa đã kèm icon).</summary>
    public static (List<AppThat> Gui, HashSet<string> KemIcon) BanGui(IEnumerable<AppThat> ds, IReadOnlyDictionary<string, string>? daCo)
    {
        long tong = 0;
        var kem = new HashSet<string>(StringComparer.Ordinal);
        var gui = new List<AppThat>();
        foreach (var a in ds)
        {
            var b = new AppThat
            {
                Khoa = a.Khoa, Muc = a.Muc, Ten = a.Ten, Nguon = a.Nguon, NhaPhatHanh = a.NhaPhatHanh, DuongDan = a.DuongDan, ThuMuc = a.ThuMuc,
                PhienBan = a.PhienBan, Sha256 = a.Sha256, IconBam = a.IconBam,
            };
            if (CanIcon(a, daCo) && tong + a.Icon!.Length <= DanhSachApp.TongIconToiDa) { b.Icon = a.Icon; tong += a.Icon.Length; kem.Add(a.Khoa); }
            gui.Add(b);
        }
        return (gui, kem);
    }

    /// <summary>`thieuIcon` trong phản hồi 200: khoa có iconBam mà máy chủ chưa có ảnh.</summary>
    public static HashSet<string> DocThieuIcon(string? raw)
    {
        var kq = new HashSet<string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(raw)) return kq;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("thieuIcon", out var t) && t.ValueKind == JsonValueKind.Array)
                foreach (var x in t.EnumerateArray()) if (x.ValueKind == JsonValueKind.String && x.GetString() is { Length: > 0 } k) kq.Add(k);
        }
        catch (JsonException) { }
        return kq;
    }

    /// <summary>Còn app có icon mà máy chủ chưa có (vượt ngân sách lượt trước / máy chủ báo thiếu) ⇒ worker gửi tiếp sớm.</summary>
    public bool ConIconChoGui { get; private set; }

    /// <summary>Gửi danh sách (đã <see cref="DanhSachApp.ChuanHoa"/>). 409 can_gui_du khi gửi phần đổi ⇒ gửi lại ĐỦ ngay. → kiểu đã gửi + bam.</summary>
    public async Task<(KieuGuiApp Kieu, string Bam)> GuiAsync(IReadOnlyList<AppThat> ds, bool epDu, CancellationToken ct)
    {
        var bam = DanhSachApp.TinhBam(ds);
        var vt = DanhSachApp.BangVanTay(ds);
        var (bamTruoc, vtTruoc, iconTruoc) = _kho.Doc();
        var daCo = new Dictionary<string, string>(StringComparer.Ordinal);
        if (iconTruoc != null) foreach (var kv in iconTruoc) daCo[kv.Key] = kv.Value;
        var kieu = Chon(bam, bamTruoc, vtTruoc != null, epDu, ds.Any(a => CanIcon(a, daCo)));
        ConIconChoGui = false;
        if (kieu == KieuGuiApp.KhongDoi) return (kieu, bam);

        void Xong(string raw, HashSet<string> kemIcon, IEnumerable<AppThat> phamVi)
        {
            var thieu = DocThieuIcon(raw);
            foreach (var a in phamVi)
                if (kemIcon.Contains(a.Khoa) && !thieu.Contains(a.Khoa)) daCo[a.Khoa] = a.IconBam!;
            foreach (var k in thieu) daCo.Remove(k);   // máy chủ chưa có ảnh (kể cả app không nằm trong lần gửi này) ⇒ lượt sau gửi kèm icon
            var co = new HashSet<string>(ds.Select(a => a.Khoa), StringComparer.Ordinal);
            foreach (var k in daCo.Keys.Where(k => !co.Contains(k)).ToList()) daCo.Remove(k);
            _kho.Luu(bam, vt, daCo);
            ConIconChoGui = ds.Any(a => CanIcon(a, daCo));
        }

        if (kieu == KieuGuiApp.PhanDoi)
        {
            var (doi, bo) = DanhSachApp.PhanDoi(ds, vtTruoc!);
            // them = app mới / đổi + app còn chờ gửi icon (máy chủ báo thiếu, hoặc lượt trước vượt ngân sách)
            var khoaDoi = new HashSet<string>(doi.Select(a => a.Khoa), StringComparer.Ordinal);
            var phamVi = ds.Where(a => khoaDoi.Contains(a.Khoa) || CanIcon(a, daCo)).ToList();
            var (them, kem) = BanGui(phamVi, daCo);
            try
            {
                var raw = await _api.GuiAsync(new { du = false, bamTruoc, bam, them, bo }, ct);
                Xong(raw, kem, phamVi);
                return (kieu, bam);
            }
            catch (ApiException e) when (e.StatusCode == 409) { /* máy chủ giữ bam khác ⇒ gửi đủ ngay dưới đây */ }
        }
        // gửi đủ: icon chỉ kèm cho app máy chủ chưa có (theo iconBam đã ghi nhận), phần còn lại máy chủ giữ ảnh cũ / báo thieuIcon
        var (gui, kemDu) = BanGui(ds, daCo);
        var rawDu = await _api.GuiAsync(new { du = true, bam, ds = gui }, ct);
        Xong(rawDu, kemDu, ds);
        return (KieuGuiApp.Du, bam);
    }
}

/// <summary>POST /api/device/ung-dung (Bearer token thiết bị).</summary>
public sealed class UngDungClient : IUngDungApi, IDisposable
{
    private readonly HttpClient _http;
    public UngDungClient(string server, string token, HttpMessageHandler? handler = null)
    {
        _http = DeviceHttp.New(server, token, handler);
        _http.Timeout = TimeSpan.FromSeconds(90);   // danh sách vài trăm app kèm icon có thể vài trăm KB
    }

    public Task<string> GuiAsync(object body, CancellationToken ct) => DeviceHttp.SendAsync(_http, HttpMethod.Post, "api/device/ung-dung", body, ct);

    public void Dispose() => _http.Dispose();
}

/// <summary>Lịch quyết định (thuần): → null = không làm gì; (quét lại?, ép gửi đủ?).</summary>
public static class LichDanhSachApp
{
    public static readonly TimeSpan ChuKy = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan ThuLaiSau = TimeSpan.FromMinutes(5);

    public static (bool QuetLai, bool EpDu)? Xet(DateTimeOffset now, DateTimeOffset quetLuc, DateTimeOffset thuLaiLuc, TinHieuDanhSachApp? tin,
        TinHieuDanhSachApp? daXuLy, bool daXem, DanhSachAppDaGui? daGui)
    {
        if (now < thuLaiLuc) return null;
        bool quet = now - quetLuc >= ChuKy, epDu = false;
        // tín hiệu mới (khác lần đã xử lý) — tín hiệu cũ còn nằm trong phản hồi dong-bo trước khi máy chủ thấy lần gửi mới thì bỏ qua
        if (tin != null && (!daXem || tin != daXuLy))
        {
            if (tin.YeuCau != null && tin.YeuCau != daGui?.YeuCau) { quet = true; epDu = true; }
            else if (tin.Bam == null || tin.Bam != daGui?.Bam) epDu = true;
        }
        return quet || epDu ? (quet, epDu) : null;
    }
}

/// <summary>Lần gửi được trước: bam (+ yêu cầu đã xử lý) trong AgentConfig.DanhSachApp; vân tay từng app ở ProgramData\AiiGrow\ds-app.txt
/// (dòng đầu = bam; lệch bam trong cấu hình ⇒ coi như không có ⇒ gửi đủ).</summary>
public sealed class KhoDanhSachApp : IKhoDanhSachApp
{
    private readonly ConfigStore _store;
    private readonly string _tep;
    public KhoDanhSachApp(ConfigStore store, string? tep = null) { _store = store; _tep = tep ?? Path.Combine(Paths.DataDir, "ds-app.txt"); }

    /// <summary>Dòng: «khoa vân-tay iconBam-máy-chủ-đã-có|-».</summary>
    public (string? Bam, IReadOnlyDictionary<string, string>? VanTay, IReadOnlyDictionary<string, string>? IconDaCo) Doc()
    {
        var bam = _store.Load()?.DanhSachApp?.Bam;
        if (bam == null) return (null, null, null);
        try
        {
            if (!File.Exists(_tep)) return (bam, null, null);
            var dong = File.ReadAllLines(_tep);
            if (dong.Length == 0 || dong[0].Trim() != bam) return (bam, null, null);
            var d = new Dictionary<string, string>(StringComparer.Ordinal);
            var ic = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var l in dong.Skip(1))
            {
                var j = l.LastIndexOf(' ');
                if (j <= 0) continue;
                var i = l.LastIndexOf(' ', j - 1);
                if (i <= 0) continue;
                var khoa = l[..i];
                d[khoa] = l[(i + 1)..j];
                var icb = l[(j + 1)..];
                if (icb != "-") ic[khoa] = icb;
            }
            return (bam, d, ic);
        }
        catch { return (bam, null, null); }
    }

    public void Luu(string bam, IReadOnlyDictionary<string, string> vanTay, IReadOnlyDictionary<string, string> iconDaCo)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_tep)!);
            var tam = _tep + ".tmp";
            File.WriteAllLines(tam, new[] { bam }.Concat(vanTay.OrderBy(x => x.Key, StringComparer.Ordinal)
                .Select(x => x.Key + " " + x.Value + " " + (iconDaCo.TryGetValue(x.Key, out var ib) ? ib : "-"))));
            File.Move(tam, _tep, true);
        }
        catch { }   // không lưu được vân tay ⇒ lần sau gửi đủ
        _store.Update(c => { c.DanhSachApp ??= new(); c.DanhSachApp.Bam = bam; c.DanhSachApp.Luc = DateTimeOffset.UtcNow; });
    }
}
