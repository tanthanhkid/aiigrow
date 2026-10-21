using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace AiiGrow.Core;

public sealed class AppLockerOptions
{
    /// <summary>SID tài khoản Windows của con (luật chỉ áp cho SID này).</summary>
    public string ChildSid { get; set; } = "";
    /// <summary>Tên file .exe được phép (mode "hoc").</summary>
    public IEnumerable<string> AllowedApps { get; set; } = Array.Empty<string>();
    /// <summary>Cho phép cả %PROGRAMFILES%. Mặc định tắt: nếu bật thì mọi app cài ở Program Files đều chạy được.</summary>
    public bool AllowProgramFiles { get; set; }
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

    public static string Merge(string? existingXml, AppLockerOptions o)
    {
        if (!IsValidSid(o.ChildSid)) throw new ArgumentException("SID không hợp lệ: " + o.ChildSid);
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
        yield return Rule("Chỉ app học cho tài khoản của con", o.ChildSid, "Deny", "*", exceptions);
    }

    private static XElement Rule(string name, string sid, string action, string path, IEnumerable<string>? exceptions)
    {
        var full = Prefix + name;
        var el = new XElement("FilePathRule",
            new XAttribute("Id", StableGuid(full + "|" + sid).ToString()),
            new XAttribute("Name", full),
            new XAttribute("Description", "Do AiiGrow tạo. Tự gỡ khi rời chế độ Chỉ app học."),
            new XAttribute("UserOrGroupSid", sid),
            new XAttribute("Action", action),
            new XElement("Conditions", new XElement("FilePathCondition", new XAttribute("Path", path))));
        var ex = exceptions?.ToList();
        if (ex is { Count: > 0 })
            el.Add(new XElement("Exceptions", ex.Select(e => new XElement("FilePathCondition", new XAttribute("Path", e)))));
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
