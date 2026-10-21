using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>
/// Lưu cấu hình + token máy ở %ProgramData%\AiiGrow\config.json, mã hoá DPAPI (LocalMachine),
/// thư mục chỉ SYSTEM/Administrators đọc được. Kèm Policy cuối để chạy khi mất mạng.
/// </summary>
public sealed class ConfigStore
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("AiiGrow.config.v1");
    private readonly bool _secureDir;

    public string FilePath { get; }

    public ConfigStore(string? path = null)
    {
        if (path == null) { FilePath = Paths.ConfigFile; _secureDir = true; }
        else { FilePath = path; }
    }

    public DateTime LastWriteUtc => File.Exists(FilePath) ? File.GetLastWriteTimeUtc(FilePath) : DateTime.MinValue;

    public AgentConfig? Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return null;
            var enc = File.ReadAllBytes(FilePath);
            var plain = ProtectedData.Unprotect(enc, Entropy, DataProtectionScope.LocalMachine);
            return JsonSerializer.Deserialize<AgentConfig>(plain, Json.Options);
        }
        catch
        {
            return null;
        }
    }

    public void Save(AgentConfig cfg)
    {
        var dir = Path.GetDirectoryName(FilePath)!;
        if (_secureDir) Paths.SecureDirectory(dir); else Directory.CreateDirectory(dir);
        var plain = JsonSerializer.SerializeToUtf8Bytes(cfg, Json.Options);
        var enc = ProtectedData.Protect(plain, Entropy, DataProtectionScope.LocalMachine);
        var tmp = FilePath + ".tmp";
        File.WriteAllBytes(tmp, enc);
        File.Move(tmp, FilePath, true);
    }

    public void Delete()
    {
        try { if (File.Exists(FilePath)) File.Delete(FilePath); } catch { }
    }
}
