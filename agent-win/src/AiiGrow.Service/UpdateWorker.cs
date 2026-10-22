using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// TỰ CẬP NHẬT (Thanh 22/10: «từ phiên bản này trở đi, nó sẽ tự động download phiên bản mới»). Lúc khởi động (+2 phút) rồi mỗi 6 giờ:
/// GET /api/agent/ban-moi → bản mới hơn ⇒ tải AiiGrow-Setup.exe về ProgramData\AiiGrow\cap-nhat, KIỂM sha256 (sai ⇒ xoá, bỏ qua) rồi chạy
/// «AiiGrow-Setup.exe --capnhat --im-lang» qua một tác vụ Task Scheduler (SYSTEM) tách rời — bộ cài sẽ dừng chính dịch vụ này.
/// Bộ cài giữ nguyên config/token/AppLocker, lỗi thì tự khôi phục bản cũ. Một bản thử tối đa một lần mỗi 24 giờ.
/// </summary>
public sealed class UpdateWorker : BackgroundService
{
    private const string TenTacVu = "AiiGrowCapNhat";
    private static readonly TimeSpan Nhip = TimeSpan.FromHours(6);
    private readonly ConfigStore _store = new();
    private readonly ILogger<UpdateWorker> _log;

    public UpdateWorker(ILogger<UpdateWorker> log) { _log = log; }

    private static string ThuMuc => Path.Combine(Paths.DataDir, "cap-nhat");

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try { await Task.Delay(TimeSpan.FromMinutes(2), ct); } catch (OperationCanceledException) { return; }
        while (!ct.IsCancellationRequested)
        {
            try { await KiemMotLuot(ct); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Tự cập nhật: {Loi}", e.Message); }
            try { await Task.Delay(Nhip, ct); } catch (OperationCanceledException) { break; }
        }
    }

    private async Task KiemMotLuot(CancellationToken ct)
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return;
        var hienTai = TuCapNhat.BanHienTai();

        // KHÔNG gắn token máy: manifest công khai, còn tệp cài tải từ Vercel Blob (ngoài máy chủ AiiGrow) — gửi Bearer theo là lộ token máy cho bên thứ ba.
        using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
        var server = ApiClient.NormalizeServer(cfg.Server);
        BanMoi? m;
        using (var cts = CancellationTokenSource.CreateLinkedTokenSource(ct))
        {
            cts.CancelAfter(TimeSpan.FromSeconds(30));
            var json = await http.GetStringAsync(server + TuCapNhat.DuongManifest, cts.Token);
            m = JsonSerializer.Deserialize<BanMoi>(json);
        }
        var lyDo = TuCapNhat.KiemManifest(m, server, hienTai);
        if (lyDo != null) { _log.LogDebug("Tự cập nhật: bỏ qua — {LyDo}", lyDo); return; }
        if (DaThuGanDay(m!.Version)) return;

        Directory.CreateDirectory(ThuMuc);
        var tep = Path.Combine(ThuMuc, "AiiGrow-Setup-" + CapNhat.DocBan(m.Version)!.ToString(3) + ".exe");
        DonBoCaiCu(tep);
        var tam = tep + ".tai";
        _log.LogInformation("Tự cập nhật: tải bản {Ban} ({Url})", m.Version, m.Url);
        await using (var vao = await http.GetStreamAsync(m.Url, ct))
        await using (var ra = File.Create(tam))
            await vao.CopyToAsync(ra, ct);

        if (!TuCapNhat.KhopSha256(tam, m.Sha256))
        {
            try { File.Delete(tam); } catch { }
            _log.LogWarning("Tự cập nhật: tệp tải về SAI sha256 ⇒ đã xoá, không chạy");
            return;
        }
        File.Move(tam, tep, true);
        // ghi «đã thử» SAU khi tải đúng: tải hỏng/đứt giữa chừng thì lượt 6 giờ sau tải lại, không phải chờ 24 giờ
        GhiDaThu(m.Version);
        ChayBoCai(tep);
        _log.LogInformation("Tự cập nhật: đã giao bộ cài bản {Ban} chạy (--capnhat --im-lang)", m.Version);
    }

    /// <summary>Chạy bộ cài bằng tác vụ SYSTEM tách rời: dịch vụ bị bộ cài dừng không kéo bộ cài chết theo.</summary>
    private static void ChayBoCai(string tep)
    {
        var tn = Shell.PsQuote(TenTacVu);
        var r = Shell.PowerShell(
            $"$a = New-ScheduledTaskAction -Execute {Shell.PsQuote(tep)} -Argument '--capnhat --im-lang'; " +
            "$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30); " +
            $"Register-ScheduledTask -TaskName {tn} -Action $a -Settings $s -User 'SYSTEM' -RunLevel Highest -Force | Out-Null; " +
            $"Start-ScheduledTask -TaskName {tn}", 60000);
        if (!r.Ok) throw new InvalidOperationException("không giao được bộ cài: " + r.Error);
    }

    /// <summary>Xoá bộ cài các bản khác (~182 MB mỗi tệp) và tệp tải dở — chỉ giữ bản sắp chạy.</summary>
    private static void DonBoCaiCu(string giu)
    {
        try
        {
            foreach (var f in Directory.GetFiles(ThuMuc, "AiiGrow-Setup-*"))
                if (!string.Equals(f, giu, StringComparison.OrdinalIgnoreCase)) try { File.Delete(f); } catch { }
        }
        catch { }
    }

    private static string TepDaThu => Path.Combine(ThuMuc, "da-thu.txt");

    private static bool DaThuGanDay(string ban)
    {
        try
        {
            if (!File.Exists(TepDaThu)) return false;
            var d = File.ReadAllText(TepDaThu).Split('|');
            return d.Length == 2 && d[0] == ban && DateTimeOffset.TryParse(d[1], out var luc) && DateTimeOffset.UtcNow - luc < TimeSpan.FromHours(24);
        }
        catch { return false; }
    }

    private static void GhiDaThu(string ban)
    {
        Directory.CreateDirectory(ThuMuc);
        File.WriteAllText(TepDaThu, ban + "|" + DateTimeOffset.UtcNow.ToString("o"), new UTF8Encoding(false));
    }
}
