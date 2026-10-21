using System.Text;
using System.Text.Json;

namespace AiiGrow.Core;

// Cài MỘT CHẠM: token ghép máy được NHÚNG SẴN trong file tải do máy chủ sinh (không bắt người cài nhập URL hay mã tay).
// Gói nhúng = JSON { server, token } mã hoá base64url. Đọc theo thứ tự: tham số dòng lệnh → biến môi trường → đuôi tệp đính kèm
// (trailer) → tên tệp. Mọi hàm giải mã đều THUẦN (không I/O) để test.

public sealed class EnrollmentPackage
{
    public string Server { get; set; } = "";
    /// <summary>Token ghép gói cài (một lần, do máy chủ sinh). KHÁC token thiết bị nhận lại sau khi ghép.</summary>
    public string Token { get; set; } = "";

    public bool Valid => !string.IsNullOrWhiteSpace(Server) && !string.IsNullOrWhiteSpace(Token);

    /// <summary>Mã hoá để máy chủ nhúng vào tên tệp / trailer (base64url của JSON). Dùng ở tài liệu + test đối chiếu.</summary>
    public string Encode()
        => Base64Url.Encode(JsonSerializer.SerializeToUtf8Bytes(new { server = Server, token = Token }, Json.Options));

    public static bool TryDecode(string? s, out EnrollmentPackage pkg)
    {
        pkg = new EnrollmentPackage();
        if (string.IsNullOrWhiteSpace(s)) return false;
        var raw = s.Trim();
        // Dạng thân thiện: "token@server" (vd abc123@https://aiigrow.vn) — tiện khi đặt tên tệp tay.
        if (raw.Contains('@') && !LooksBase64(raw))
        {
            var i = raw.IndexOf('@');
            pkg.Token = raw[..i].Trim();
            pkg.Server = raw[(i + 1)..].Trim();
            return pkg.Valid;
        }
        try
        {
            using var doc = JsonDocument.Parse(Base64Url.DecodeBytes(raw));
            var r = doc.RootElement;
            pkg.Server = Str(r, "server");
            pkg.Token = Str(r, "token");
            return pkg.Valid;
        }
        catch { return false; }
    }

    private static string Str(JsonElement e, string n) => e.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
    private static bool LooksBase64(string s) => s.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '=');
}

/// <summary>Đọc gói nhúng từ môi trường thực (tham số, biến môi trường, trailer tệp, tên tệp).</summary>
public static class EnrollmentReader
{
    public const string EnvVar = "AIIGROW_ENROLL";
    // Trailer: &lt;json&gt; &lt;4 byte độ dài little-endian&gt; &lt;magic&gt; ở cuối tệp .exe/.msi (máy chủ nối thêm sau khi build).
    public static readonly byte[] Magic = Encoding.ASCII.GetBytes("AIIGROW-ENROLL1");

    /// <summary>Lấy chuỗi gói từ tham số dòng lệnh: <c>--enroll=&lt;x&gt;</c> hoặc <c>/enroll:&lt;x&gt;</c>.</summary>
    public static string? FromArgs(IEnumerable<string> args)
    {
        foreach (var a in args)
        {
            if (a.StartsWith("--enroll=", StringComparison.OrdinalIgnoreCase)) return a["--enroll=".Length..];
            if (a.StartsWith("/enroll:", StringComparison.OrdinalIgnoreCase)) return a["/enroll:".Length..];
        }
        return null;
    }

    /// <summary>Tên tệp kiểu <c>AiiGrow-Setup.enroll-&lt;x&gt;.exe</c> ⇒ trả <c>&lt;x&gt;</c>.</summary>
    public static string? FromFileName(string? path)
    {
        var name = Path.GetFileNameWithoutExtension(path ?? "");
        const string mark = ".enroll-";
        var i = name.IndexOf(mark, StringComparison.OrdinalIgnoreCase);
        return i >= 0 ? name[(i + mark.Length)..] : null;
    }

    /// <summary>Đọc trailer ở cuối mảng byte tệp cài (thuần, để test). null nếu không có.</summary>
    public static string? FromTrailer(byte[] bytes)
    {
        if (bytes.Length < Magic.Length + 4) return null;
        var tail = bytes.AsSpan(bytes.Length - Magic.Length);
        if (!tail.SequenceEqual(Magic)) return null;
        int lenPos = bytes.Length - Magic.Length - 4;
        int len = bytes[lenPos] | (bytes[lenPos + 1] << 8) | (bytes[lenPos + 2] << 16) | (bytes[lenPos + 3] << 24);
        if (len <= 0 || len > lenPos) return null;
        return Encoding.UTF8.GetString(bytes, lenPos - len, len);
    }

    /// <summary>Nối trailer vào nội dung tệp cài — tham chiếu cho máy chủ (và test).</summary>
    public static byte[] AppendTrailer(byte[] exe, EnrollmentPackage pkg)
    {
        var payload = Encoding.UTF8.GetBytes(pkg.Encode());
        var len = BitConverter.GetBytes(payload.Length);
        return exe.Concat(payload).Concat(len).Concat(Magic).ToArray();
    }

    /// <summary>Tìm gói nhúng từ mọi nguồn. <paramref name="exePath"/> mặc định là bộ cài đang chạy.</summary>
    public static bool TryRead(IEnumerable<string> args, out EnrollmentPackage pkg, string? exePath = null, Func<string, byte[]>? readFile = null)
    {
        pkg = new EnrollmentPackage();
        exePath ??= Environment.ProcessPath;
        readFile ??= File.ReadAllBytes;
        var candidates = new List<string?>
        {
            FromArgs(args),
            Environment.GetEnvironmentVariable(EnvVar),
        };
        if (exePath != null)
        {
            try { candidates.Add(FromTrailer(readFile(exePath))); } catch { }
            candidates.Add(FromFileName(exePath));
        }
        foreach (var c in candidates)
            if (EnrollmentPackage.TryDecode(c, out pkg)) return true;
        return false;
    }
}

public static class Base64Url
{
    public static string Encode(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static byte[] DecodeBytes(string s)
    {
        var t = s.Replace('-', '+').Replace('_', '/');
        switch (t.Length % 4) { case 2: t += "=="; break; case 3: t += "="; break; }
        return Convert.FromBase64String(t);
    }
}
