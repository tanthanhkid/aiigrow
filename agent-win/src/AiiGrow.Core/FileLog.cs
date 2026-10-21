using System.Collections.Concurrent;
using System.Text;
using Microsoft.Extensions.Logging;

namespace AiiGrow.Core;

// Nhật ký agent ra tệp + hàng đợi gửi lên máy chủ (POST /api/device/log) để Ba Mẹ / AiiLab đọc từ xa.
//   C:\ProgramData\AiiGrow\logs\agent-yyyyMMdd.log — mỗi ngày một tệp, giữ GiuNgay ngày, mỗi tệp tối đa ToiDaByte (quá thì dừng ghi tới hôm sau).
// Không bao giờ ghi token / mật khẩu: dòng nào khớp mẫu bí mật bị che trước khi ghi (ChePhanBiMat).

public sealed record DongLog(DateTimeOffset Luc, string Muc, string Nguon, string NoiDung);

public sealed class FileLog
{
    public const int GiuNgay = 7;
    public const long ToiDaByte = 5 * 1024 * 1024;
    public const int HangDoiToiDa = 2000;

    private readonly string _dir;
    private readonly Func<DateTimeOffset> _now;
    private readonly object _khoa = new();
    private readonly ConcurrentQueue<DongLog> _choGui = new();
    private string? _ngayDonDep;

    public FileLog(string dir, Func<DateTimeOffset>? now = null) { _dir = dir; _now = now ?? (() => DateTimeOffset.Now); }

    public string Dir => _dir;
    public string TepHomNay => Path.Combine(_dir, $"agent-{_now():yyyyMMdd}.log");

    public void Ghi(string muc, string nguon, string noiDung)
    {
        var d = new DongLog(_now(), muc, nguon, ChePhanBiMat(noiDung));
        _choGui.Enqueue(d);
        while (_choGui.Count > HangDoiToiDa && _choGui.TryDequeue(out _)) { }   // mất mạng lâu: giữ phần mới nhất
        lock (_khoa)
        {
            try
            {
                Directory.CreateDirectory(_dir);
                var tep = TepHomNay;
                if (File.Exists(tep) && new FileInfo(tep).Length > ToiDaByte) return;
                File.AppendAllText(tep, $"{d.Luc:yyyy-MM-dd HH:mm:ss.fff zzz} [{d.Muc}] {d.Nguon}: {d.NoiDung}{Environment.NewLine}", Encoding.UTF8);
                DonDep();
            }
            catch (IOException) { /* đĩa đầy / tệp bị khoá: bỏ qua, vẫn còn hàng đợi gửi máy chủ */ }
            catch (UnauthorizedAccessException) { }
        }
    }

    /// <summary>Lấy tối đa n dòng chờ gửi (lấy ra khỏi hàng đợi). Gửi lỗi thì gọi TraLai.</summary>
    public List<DongLog> LayDeGui(int n = 200)
    {
        var ds = new List<DongLog>();
        while (ds.Count < n && _choGui.TryDequeue(out var d)) ds.Add(d);
        return ds;
    }

    public void TraLai(IEnumerable<DongLog> ds) { foreach (var d in ds) _choGui.Enqueue(d); }

    public int ChoGui => _choGui.Count;

    private void DonDep()
    {
        var hom = _now().ToString("yyyyMMdd");
        if (_ngayDonDep == hom) return;
        _ngayDonDep = hom;
        var han = _now().AddDays(-GiuNgay).ToString("yyyyMMdd");
        foreach (var f in Directory.GetFiles(_dir, "agent-*.log"))
        {
            var ngay = Path.GetFileNameWithoutExtension(f)["agent-".Length..];
            if (string.CompareOrdinal(ngay, han) < 0) { try { File.Delete(f); } catch (IOException) { } }
        }
    }

    private static readonly System.Text.RegularExpressions.Regex BiMat = new(
        @"(?i)(bearer\s+|token[""']?\s*[:=]\s*[""']?|matkhau[""']?\s*[:=]\s*[""']?|password[""']?\s*[:=]\s*[""']?)[^\s""',}]+",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    public static string ChePhanBiMat(string s) => BiMat.Replace(s ?? "", m => m.Groups[1].Value + "***");
}

/// <summary>ILoggerProvider ghi mọi log của dịch vụ vào FileLog (Information trở lên).</summary>
public sealed class FileLogProvider : ILoggerProvider
{
    private readonly FileLog _log;
    public FileLogProvider(FileLog log) { _log = log; }
    public ILogger CreateLogger(string categoryName) => new L(_log, categoryName.Split('.').Last());
    public void Dispose() { }

    private sealed class L : ILogger
    {
        private readonly FileLog _log; private readonly string _nguon;
        public L(FileLog log, string nguon) { _log = log; _nguon = nguon; }
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => level >= LogLevel.Information;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? ex, Func<TState, Exception?, string> fmt)
        {
            if (!IsEnabled(level)) return;
            var muc = level switch { LogLevel.Warning => "canh", LogLevel.Error or LogLevel.Critical => "loi", _ => "tin" };
            _log.Ghi(muc, _nguon, fmt(state, ex) + (ex is null ? "" : $" | {ex.GetType().Name}: {ex.Message}"));
        }
    }
}
