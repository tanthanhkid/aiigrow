using System.Runtime.InteropServices;
using System.Text;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Nghi 11/11: Con ở «Mở hết» (dong-bo.windows.moHet) ⇒ gỡ dòng chặn 0.0.0.0 / :: trong tệp hosts do phần mềm khác đặt (Core/HostsChan.cs),
/// sao lưu tệp cũ vào %ProgramData%\AiiGrow\hosts-sao-luu, xoá bộ nhớ đệm DNS, báo sự kiện go_chan_hosts (Ba Mẹ nhận cảnh báo «thông tin»).
/// Kiểm mỗi 60 giây (phần mềm khác ghi lại thì gỡ lại). Không «Mở hết», máy chưa ghép, đang gỡ AiiGrow ⇒ không đụng hosts.
/// Bản sao lưu là đường quay lại: chép đè về C:\Windows\System32\drivers\etc\hosts (khi Con không còn «Mở hết», không thì bị gỡ lại).</summary>
public sealed class HostsWorker : BackgroundService
{
    private readonly ILogger<HostsWorker> _log;
    private readonly AgentRuntime? _rt;
    private readonly ConfigStore _store = new();
    private readonly string _tep;
    private string? _daBaoLoi;

    /// <summary>Latin1: đọc / ghi đúng từng byte (hosts thường là ANSI / ASCII, có thể có chú thích tiếng Việt UTF-8) ⇒ dòng giữ lại không đổi một byte.</summary>
    private static readonly Encoding MaByte = Encoding.Latin1;

    public HostsWorker(ILogger<HostsWorker> log, AgentRuntime? rt = null, string? tepHosts = null)
    {
        _log = log;
        _rt = rt;
        _tep = tepHosts ?? Path.Combine(Environment.SystemDirectory, "drivers", "etc", "hosts");
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Yield();
        while (!ct.IsCancellationRequested)
        {
            try { MotVong(); }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                if (e.Message != _daBaoLoi) { _daBaoLoi = e.Message; _log.LogWarning("Gỡ chặn trong tệp hosts lỗi (thử lại sau 60 giây): {m}", e.Message); }
            }
            try { await Task.Delay(TimeSpan.FromSeconds(60), ct); } catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>Một lượt: trả số dòng đã gỡ (0 = không đổi gì).</summary>
    public int MotVong()
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true } || _rt?.DangGo == true) return 0;
        if (!HostsChan.LaMoHet(cfg.LastPolicyJson)) return 0;
        if (!File.Exists(_tep)) return 0;
        var kq = HostsChan.Loc(File.ReadAllText(_tep, MaByte));
        if (kq.SoDong == 0) return 0;

        var thuMuc = Path.Combine(Paths.DataDir, "hosts-sao-luu");
        Directory.CreateDirectory(thuMuc);
        var saoLuu = Path.Combine(thuMuc, $"hosts-{DateTime.Now:yyyyMMdd-HHmmss}");
        File.Copy(_tep, saoLuu, true);
        var thuocTinh = File.GetAttributes(_tep);
        if (thuocTinh.HasFlag(FileAttributes.ReadOnly)) File.SetAttributes(_tep, thuocTinh & ~FileAttributes.ReadOnly);
        try { File.WriteAllText(_tep, kq.NoiDungMoi, MaByte); }
        finally { if (thuocTinh.HasFlag(FileAttributes.ReadOnly)) File.SetAttributes(_tep, thuocTinh); }
        try { DnsFlushResolverCache(); } catch { }   // không xoá được đệm thì Windows tự hết hạn sau vài phút

        _daBaoLoi = null;
        _log.LogWarning("Con «Mở hết»: đã gỡ {n} dòng chặn trong tệp hosts do phần mềm khác đặt ({ds}) — sao lưu {s}",
            kq.SoDong, string.Join(", ", kq.TenMien.Take(20)), saoLuu);
        try
        {
            _store.Update(c => c.Queue.Add(new SuKien
            {
                Loai = "go_chan_hosts",
                ChiTiet = new()
                {
                    ["soDong"] = kq.SoDong.ToString(),
                    ["tenMien"] = string.Join(", ", kq.TenMien.Take(20)) + (kq.TenMien.Count > 20 ? $" … (+{kq.TenMien.Count - 20})" : ""),
                    ["saoLuu"] = saoLuu,
                },
            }));
        }
        catch (Exception e) { _log.LogDebug("Ghi sự kiện go_chan_hosts lỗi: {e}", e.Message); }
        return kq.SoDong;
    }

    [DllImport("dnsapi.dll", EntryPoint = "DnsFlushResolverCache")]
    private static extern bool DnsFlushResolverCache();
}
