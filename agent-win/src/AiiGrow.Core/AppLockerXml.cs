using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace AiiGrow.Core;

public sealed class AppLockerOptions
{
    /// <summary>SID tài khoản Windows của con (luật chỉ áp cho SID này).</summary>
    public string ChildSid { get; set; } = "";
    /// <summary>Nhiều tài khoản (cài một chạm: mọi tài khoản không phải quản trị). Có ⇒ dùng thay <see cref="ChildSid"/>.</summary>
    public IReadOnlyList<string>? ChildSids { get; set; }
    public IReadOnlyList<string> Sids => ChildSids is { Count: > 0 } ? ChildSids : new[] { ChildSid };
    /// <summary>Tên file .exe được phép (mode "hoc").</summary>
    public IEnumerable<string> AllowedApps { get; set; } = Array.Empty<string>();
    /// <summary>Cho phép cả %PROGRAMFILES%. Mặc định tắt: nếu bật thì mọi app cài ở Program Files đều chạy được.</summary>
    public bool AllowProgramFiles { get; set; }
    /// <summary>Chặn thật «chặn theo lọc»: trình duyệt được chạy cho từng SID Con (tên trong <see cref="TrinhDuyetLoc.TatCa"/>) — chỉ khi luật web đang áp cho SID đó.</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<string>>? TrinhDuyetTheoSid { get; set; }
}

/// <summary>Một app bị chặn (trò chơi): chặn theo tên đường dẫn, và nếu có băm thì chặn cả theo băm SHA256 (đổi tên/di chuyển vẫn chặn).</summary>
public sealed record BlockedApp(string Exe, string? Sha256Hex = null, long? SizeBytes = null);

/// <summary>Tuỳ chọn cho chính sách DANH SÁCH CHẶN: cho chạy mọi thứ (Windows, Program Files…), chỉ Deny riêng các trò chơi cho SID của con.</summary>
public sealed class AppLockerBlockOptions
{
    public string ChildSid { get; set; } = "";
    public IEnumerable<BlockedApp> BlockedApps { get; set; } = Array.Empty<BlockedApp>();
}

/// <summary>
/// Sinh/gộp/gỡ chính sách AppLocker. Mọi luật của AiiGrow có Name bắt đầu bằng <see cref="Prefix"/>
/// để gỡ sạch khi rời chế độ học mà không đụng luật của người khác.
/// Cách làm: luật Allow cho Everyone mọi đường dẫn (người dùng khác không bị ảnh hưởng) + luật Deny
/// riêng SID của con cho mọi đường dẫn, trừ ngoại lệ: thư mục Windows, thư mục AiiGrow và allowedApps.
/// </summary>
public static class AppLockerXml
{
    public const string Prefix = "AiiGrow: ";
    private static readonly string[] CollectionTypes = { "Appx", "Dll", "Exe", "Msi", "Script" };
    private static readonly Regex SidRegex = new(@"^S-1-\d+(-\d+)+$", RegexOptions.Compiled);
    private static readonly Regex ExeRegex = new(@"^[A-Za-z0-9][A-Za-z0-9 ._()+\-]{0,100}\.exe$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>Các đường dẫn hệ thống luôn được chạy cho con.</summary>
    public static readonly string[] SystemExceptions =
    {
        @"%WINDIR%\*",
        @"%PROGRAMFILES%\AiiGrow\*",
        @"%PROGRAMFILES%\Windows Defender\*",
        @"%PROGRAMFILES%\Common Files\*",
    };

    public static bool IsValidSid(string? sid) => !string.IsNullOrEmpty(sid) && SidRegex.IsMatch(sid);

    /// <summary>Chuẩn hoá tên exe (chữ thường); trả null nếu không an toàn (có dấu \ / " * ...).</summary>
    public static string? NormalizeExe(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var t = name.Trim();
        if (t.Contains("..")) return null;
        return ExeRegex.IsMatch(t) ? t.ToLowerInvariant() : null;
    }

    public static string Build(AppLockerOptions o) => Merge(null, o);

    private static readonly Regex HexRegex = new("^[0-9a-fA-F]{64}$", RegexOptions.Compiled);

    /// <summary>Băm SHA256 + độ dài của một file (dùng để sinh luật chặn theo băm cho dry-run / khi áp thật).</summary>
    public static (string Sha256Hex, long SizeBytes) HashOf(string path)
    {
        using var s = File.OpenRead(path);
        var hash = System.Security.Cryptography.SHA256.HashData(s);
        return (Convert.ToHexString(hash), s.Length);
    }

    /// <summary>
    /// Chính sách DANH SÁCH CHẶN (cho mode tự do có chặn trò chơi): cho mọi người chạy (Windows, Program Files… đều chạy),
    /// chỉ thêm luật Deny riêng SID của con cho từng trò chơi — theo đường dẫn <c>*\ten.exe</c> và, nếu có băm, cả theo băm SHA256.
    /// Gộp vào chính sách sẵn có, không đụng luật của người khác.
    /// </summary>
    public static string BuildBlockList(AppLockerBlockOptions o) => MergeBlockList(null, o);

    public static string MergeBlockList(string? existingXml, AppLockerBlockOptions o)
    {
        if (!IsValidSid(o.ChildSid)) throw new ArgumentException("SID không hợp lệ: " + o.ChildSid);
        var doc = Parse(existingXml);
        StripOurs(doc);
        var exe = Collection(doc, "Exe");
        foreach (var r in BlockListRules(o)) exe.Add(r);
        exe.SetAttributeValue("EnforcementMode", "Enabled");
        return doc.ToString();
    }

    private static IEnumerable<XElement> BlockListRules(AppLockerBlockOptions o)
    {
        // Nền: cho mọi người dùng chạy mọi đường dẫn — Windows và Program Files vì thế đều chạy được.
        yield return Rule("Cho phép mọi người dùng (nền)", "S-1-1-0", "Allow", "*", null);
        // Luật cho phép TƯỜNG MINH Windows / Program Files cho tài khoản của con (rõ ý định; Deny bên dưới vẫn thắng cho từng trò chơi).
        yield return Rule("Cho phép Windows cho con", o.ChildSid, "Allow", @"%WINDIR%\*", null);
        yield return Rule("Cho phép Program Files cho con", o.ChildSid, "Allow", @"%PROGRAMFILES%\*", null);

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var b in o.BlockedApps)
        {
            var n = NormalizeExe(b.Exe);
            if (n == null || !seen.Add(n)) continue;
            yield return Rule("Chặn trò chơi " + n + " (đường dẫn)", o.ChildSid, "Deny", @"*\" + n, null);
            if (!string.IsNullOrWhiteSpace(b.Sha256Hex) && HexRegex.IsMatch(b.Sha256Hex!) && b.SizeBytes is > 0)
                yield return HashRule("Chặn trò chơi " + n + " (băm)", o.ChildSid, n, b.Sha256Hex!, b.SizeBytes!.Value);
        }
    }

    private static XElement HashRule(string name, string sid, string sourceFile, string sha256Hex, long size)
    {
        var full = Prefix + name;
        return new XElement("FileHashRule",
            new XAttribute("Id", StableGuid(full + "|" + sid).ToString()),
            new XAttribute("Name", full),
            new XAttribute("Description", "Do AiiGrow tạo. Chặn theo băm nên đổi tên/di chuyển vẫn chặn."),
            new XAttribute("UserOrGroupSid", sid),
            new XAttribute("Action", "Deny"),
            new XElement("Conditions",
                new XElement("FileHashCondition",
                    new XElement("FileHash",
                        new XAttribute("Type", "SHA256"),
                        new XAttribute("Data", "0x" + sha256Hex.ToUpperInvariant()),
                        new XAttribute("SourceFileName", sourceFile),
                        new XAttribute("SourceFileLength", size)))));
    }

    /// <summary>25/10 — chặn app thật (ChanAppThat.cs): gộp luật Deny theo đường dẫn / thư mục / băm cho từng SID Con vào chính sách sẵn có.
    /// <paramref name="hoc"/> có ⇒ kèm chính sách «chỉ app học» (Deny * trừ ngoại lệ — Deny riêng app bị chặn vẫn thắng); null ⇒ nền
    /// «cho mọi người chạy mọi đường dẫn» (mode tu_do) + chỉ Deny app bị chặn. Gỡ sạch luật "AiiGrow: " cũ trước khi thêm (như Merge).</summary>
    public static string MergeChanApp(string? existingXml, IReadOnlyList<string> sids, IEnumerable<LuatChanApp> chan, AppLockerOptions? hoc)
    {
        foreach (var sid in sids)
            if (!IsValidSid(sid)) throw new ArgumentException("SID không hợp lệ: " + sid);
        var doc = Parse(existingXml);
        StripOurs(doc);
        var exe = Collection(doc, "Exe");
        if (hoc != null) foreach (var r in OurRules(new AppLockerOptions { ChildSids = sids, AllowedApps = hoc.AllowedApps, AllowProgramFiles = hoc.AllowProgramFiles, TrinhDuyetTheoSid = hoc.TrinhDuyetTheoSid })) exe.Add(r);
        else exe.Add(Rule("Cho phép mọi người dùng (nền)", "S-1-1-0", "Allow", "*", null));
        var ds = chan.ToList();
        foreach (var sid in sids)
            foreach (var l in ds)
            {
                if (l.Path != null) exe.Add(Rule("Chặn app " + l.Ten + " [" + l.Path + "]", sid, "Deny", l.Path, null));
                else if (l.HashData != null && l.HashLength is > 0)
                    exe.Add(HashRule("Chặn app " + l.Ten + " [" + l.HashData + "]", sid, l.SourceFile ?? "app.exe", l.HashData.StartsWith("0x") ? l.HashData[2..] : l.HashData, l.HashLength.Value));
            }
        exe.SetAttributeValue("EnforcementMode", "Enabled");
        return doc.ToString();
    }

    public static string Merge(string? existingXml, AppLockerOptions o)
    {
        foreach (var sid in o.Sids)
            if (!IsValidSid(sid)) throw new ArgumentException("SID không hợp lệ: " + sid);
        var doc = Parse(existingXml);
        StripOurs(doc);
        var exe = Collection(doc, "Exe");
        foreach (var r in OurRules(o)) exe.Add(r);
        exe.SetAttributeValue("EnforcementMode", "Enabled");
        return doc.ToString();
    }

    public static string RemoveOurs(string? existingXml)
    {
        var doc = Parse(existingXml);
        StripOurs(doc);
        foreach (var c in doc.Root!.Elements("RuleCollection"))
            if (!c.Elements().Any()) c.SetAttributeValue("EnforcementMode", "NotConfigured");
        return doc.ToString();
    }

    public enum BuocGo { ThuLai, Xong, CanGhi }

    /// <summary>Số lần đọc chính sách lỗi liên tiếp thì thôi coi «đã gỡ» (Windows Home không có AppLocker: đọc lỗi mãi, cũng không có luật nào).</summary>
    public const int DocLoiToiDa = 5;

    /// <summary>Gỡ luật AiiGrow: đọc chính sách LỖI ⇒ thử lại (không coi là đã gỡ — luật cũ có thể còn); đọc được mà không có luật AiiGrow ⇒ xong; có ⇒ ghi bản đã bỏ.</summary>
    public static BuocGo XetGo(bool docLoi, string? xml, int soLanDocLoi) =>
        docLoi ? (soLanDocLoi >= DocLoiToiDa ? BuocGo.Xong : BuocGo.ThuLai)
               : ContainsOurs(xml) ? BuocGo.CanGhi : BuocGo.Xong;

    public static bool ContainsOurs(string? xml)
    {
        if (string.IsNullOrWhiteSpace(xml)) return false;
        try
        {
            return XDocument.Parse(xml).Descendants()
                .Any(e => ((string?)e.Attribute("Name"))?.StartsWith(Prefix, StringComparison.Ordinal) == true);
        }
        catch { return false; }
    }

    private static IEnumerable<XElement> OurRules(AppLockerOptions o)
    {
        yield return Rule("Cho phép mọi người dùng (nền)", "S-1-1-0", "Allow", "*", null);

        var exceptions = new List<string>(SystemExceptions);
        if (o.AllowProgramFiles) exceptions.Add(@"%PROGRAMFILES%\*");
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var a in o.AllowedApps)
        {
            var n = NormalizeExe(a);
            if (n != null && seen.Add(n)) exceptions.Add(@"*\" + n);
        }
        foreach (var sid in o.Sids)
        {
            var td = o.TrinhDuyetTheoSid != null && o.TrinhDuyetTheoSid.TryGetValue(sid, out var t) ? t : null;
            yield return Rule("Chỉ app học cho tài khoản của con", sid, "Deny", "*", exceptions, td is { Count: > 0 } ? TrinhDuyetLoc.NgoaiLeAppLocker(td) : null);
        }
    }

    private static XElement Rule(string name, string sid, string action, string path, IEnumerable<string>? exceptions, IEnumerable<XElement>? ngoaiLeThem = null)
    {
        var full = Prefix + name;
        var el = new XElement("FilePathRule",
            new XAttribute("Id", StableGuid(full + "|" + sid).ToString()),
            new XAttribute("Name", full),
            new XAttribute("Description", "Do AiiGrow tạo. Tự gỡ khi rời chế độ Chỉ app học."),
            new XAttribute("UserOrGroupSid", sid),
            new XAttribute("Action", action),
            new XElement("Conditions", new XElement("FilePathCondition", new XAttribute("Path", path))));
        var ex = (exceptions ?? Array.Empty<string>()).Select(e => new XElement("FilePathCondition", new XAttribute("Path", e))).Concat(ngoaiLeThem ?? Array.Empty<XElement>()).ToList();
        if (ex.Count > 0) el.Add(new XElement("Exceptions", ex));
        return el;
    }

    private static Guid StableGuid(string seed) => new(MD5.HashData(Encoding.UTF8.GetBytes(seed)));

    private static XDocument Parse(string? xml)
    {
        XDocument doc;
        if (string.IsNullOrWhiteSpace(xml))
            doc = new XDocument(new XElement("AppLockerPolicy", new XAttribute("Version", "1")));
        else
            doc = XDocument.Parse(xml);
        if (doc.Root == null || doc.Root.Name.LocalName != "AppLockerPolicy")
            throw new ArgumentException("Không phải XML AppLockerPolicy");
        foreach (var t in CollectionTypes)
            if (!doc.Root.Elements("RuleCollection").Any(c => (string?)c.Attribute("Type") == t))
                doc.Root.Add(new XElement("RuleCollection", new XAttribute("Type", t), new XAttribute("EnforcementMode", "NotConfigured")));
        var ordered = doc.Root.Elements("RuleCollection")
            .OrderBy(c => (string?)c.Attribute("Type") ?? "", StringComparer.Ordinal).ToList();
        doc.Root.Elements("RuleCollection").Remove();
        doc.Root.Add(ordered);
        return doc;
    }

    private static XElement Collection(XDocument doc, string type)
        => doc.Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == type);

    private static void StripOurs(XDocument doc)
    {
        foreach (var c in doc.Root!.Elements("RuleCollection"))
            c.Elements().Where(e => ((string?)e.Attribute("Name"))?.StartsWith(Prefix, StringComparison.Ordinal) == true).Remove();
    }
}
