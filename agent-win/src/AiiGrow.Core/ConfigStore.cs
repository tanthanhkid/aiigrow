using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>
/// Lưu cấu hình + token máy ở %ProgramData%\AiiGrow\config.json, mã hoá DPAPI (LocalMachine),
/// thư mục chỉ SYSTEM/Administrators đọc được. Kèm Policy cuối để chạy khi mất mạng.
/// Mọi lần ghi trong tiến trình đi qua MỘT khoá tĩnh; ai cần «đọc – sửa – ghi» thì dùng <see cref="Update"/> / <see cref="UpdateIf"/>
/// (đọc bản trên đĩa ngay trong khoá) để không ghi đè phần worker khác vừa lưu. Mỗi lần ghi dùng tệp tạm riêng rồi thay tệp chính.
/// </summary>
public sealed class ConfigStore
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("AiiGrow.config.v1");
    private static readonly object WriteLock = new();
    /// <summary>Thư mục đã khoá ACL trong tiến trình này — icacls chỉ chạy một lần, không chạy mỗi lần lưu.</summary>
    private static readonly ConcurrentDictionary<string, bool> DaBaoVe = new(StringComparer.OrdinalIgnoreCase);

    private readonly Action<string>? _secureDir;
    private readonly Func<byte[], byte[]> _protect;
    private readonly Func<byte[], byte[]> _unprotect;

    public string FilePath { get; }

    public ConfigStore(string? path = null)
        : this(path ?? Paths.ConfigFile, Dpapi.Protect, Dpapi.Unprotect, path == null ? Paths.SecureDirectory : null) { }

    /// <summary>Cho test: đổi cách mã hoá và bỏ phần ACL (chạy được ngoài Windows).</summary>
    public ConfigStore(string path, Func<byte[], byte[]> protect, Func<byte[], byte[]> unprotect, Action<string>? secureDir = null)
    {
        FilePath = path;
        _protect = protect;
        _unprotect = unprotect;
        _secureDir = secureDir;
    }

    public DateTime LastWriteUtc => File.Exists(FilePath) ? File.GetLastWriteTimeUtc(FilePath) : DateTime.MinValue;

    public AgentConfig? Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return null;
            var enc = File.ReadAllBytes(FilePath);
            return JsonSerializer.Deserialize<AgentConfig>(_unprotect(enc), Json.Options);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>Ghi đè toàn bộ cấu hình (bộ cài, ghép máy). Worker đang chạy thì dùng <see cref="Update"/>.</summary>
    public void Save(AgentConfig cfg)
    {
        EnsureDir();
        lock (WriteLock) Write(cfg);
    }

    /// <summary>Đọc bản trên đĩa – sửa – ghi, nguyên khối. → bản đã ghi, hoặc null nếu chưa có / không đọc được cấu hình (khi đó không ghi gì).
    /// Lỗi ghi thì ném ra cho người gọi xử lý.</summary>
    public AgentConfig? Update(Action<AgentConfig> change) => UpdateIf(c => { change(c); return true; });

    /// <summary>Như <see cref="Update"/>, nhưng chỉ ghi khi <paramref name="change"/> trả true.</summary>
    public AgentConfig? UpdateIf(Func<AgentConfig, bool> change)
    {
        EnsureDir();
        lock (WriteLock)
        {
            var cfg = Load();
            if (cfg == null) return null;
            if (change(cfg)) Write(cfg);
            return cfg;
        }
    }

    public void Delete()
    {
        lock (WriteLock)
        {
            try { if (File.Exists(FilePath)) File.Delete(FilePath); } catch { }
        }
    }

    private void EnsureDir()
    {
        var dir = Path.GetDirectoryName(FilePath)!;
        if (_secureDir != null && (!Directory.Exists(dir) || DaBaoVe.TryAdd(dir, true)))
        {
            _secureDir(dir);
            DaBaoVe.TryAdd(dir, true);
        }
        else Directory.CreateDirectory(dir);
    }

    private void Write(AgentConfig cfg)
    {
        var enc = _protect(JsonSerializer.SerializeToUtf8Bytes(cfg, Json.Options));
        var tmp = $"{FilePath}.{Guid.NewGuid():N}.tmp";
        try
        {
            File.WriteAllBytes(tmp, enc);
            File.Move(tmp, FilePath, true);
        }
        catch
        {
            try { File.Delete(tmp); } catch { }
            throw;
        }
    }

    private static class Dpapi
    {
        public static byte[] Protect(byte[] b) => ProtectedData.Protect(b, Entropy, DataProtectionScope.LocalMachine);
        public static byte[] Unprotect(byte[] b) => ProtectedData.Unprotect(b, Entropy, DataProtectionScope.LocalMachine);
    }
}
