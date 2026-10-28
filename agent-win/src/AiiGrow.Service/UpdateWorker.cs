using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// TỰ CẬP NHẬT (Thanh 22/10: «từ phiên bản này trở đi, nó sẽ tự động download phiên bản mới»). Lúc khởi động (+2 phút) rồi theo chu kỳ máy chủ đặt (chuKyKiemPhut, mặc định 6 giờ, tính theo giờ thật):
/// GET /api/agent/ban-moi → bản mới hơn ⇒ tải AiiGrow-Setup.exe về ProgramData\AiiGrow\cap-nhat, KIỂM sha256 (sai ⇒ xoá, bỏ qua) rồi chạy
/// «AiiGrow-Setup.exe --capnhat --im-lang» qua một tác vụ Task Scheduler (SYSTEM) tách rời — bộ cài sẽ dừng chính dịch vụ này.
/// Bộ cài giữ nguyên config/token/AppLocker, lỗi thì tự khôi phục bản cũ. Một bản thử tối đa một lần mỗi 24 giờ.
/// </summary>
public sealed class UpdateWorker : BackgroundService
{
    private const string TenTacVu = "AiiGrowCapNhat";
    private readonly ConfigStore _store = new();
    private readonly ILogger<UpdateWorker> _log;

    public UpdateWorker(ILogger<UpdateWorker> log) { _log = log; }

    private static string ThuMuc => Path.Combine(Paths.DataDir, "cap-nhat");

    /// <remarks>0.2.12 (28/10, máy ThinkPad kẹt 0.2.5 suốt 4 ngày): KHÔNG chờ bằng Task.Delay(6 giờ) — đồng hồ hẹn giờ của .NET trên Windows
    /// không chạy khi máy ngủ / ngủ đông (Fast Startup tắt máy cũng là ngủ đông, dịch vụ không khởi động lại), laptop cả ngày chỉ thức vài giờ
    /// ⇒ mấy ngày không kiểm lần nào. Nay thức dậy mỗi phút, so GIỜ THẬT với lần hẹn; chu kỳ do máy chủ đặt (chuKyKiemPhut).</remarks>
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _ = Task.Run(BatLaiTuKhoiDong);   // không chặn dịch vụ khởi động (sc.exe tối đa 30 giây/lệnh)
        var chuKy = TuCapNhat.ChuKyMacDinh;
        var hen = DateTimeOffset.UtcNow.AddMinutes(2);
        while (!ct.IsCancellationRequested)
        {
            var bayGio = DateTimeOffset.UtcNow;
            hen = TuCapNhat.KeTiep(hen, bayGio, chuKy);
            if (bayGio >= hen)
            {
                try { chuKy = await KiemMotLuot(ct) ?? chuKy; }
                catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Tự cập nhật: {Loi}", e.Message); }
                hen = DateTimeOffset.UtcNow + chuKy;
            }
            try { await Task.Delay(TimeSpan.FromMinutes(1), ct); } catch (OperationCanceledException) { break; }
        }
    }

    /// <returns>Chu kỳ máy chủ đặt (null = chưa đọc được manifest).</returns>
    private async Task<TimeSpan?> KiemMotLuot(CancellationToken ct)
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return null;
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
        var chuKy = TuCapNhat.ChuKyKiem(m?.ChuKyKiemPhut);
        var lyDo = TuCapNhat.KiemManifest(m, server, hienTai);
        if (lyDo != null) { _log.LogDebug("Tự cập nhật: bỏ qua — {LyDo}", lyDo); return chuKy; }
        if (DaThuGanDay(m!.Version)) return chuKy;

        Directory.CreateDirectory(ThuMuc);
        var tep = Path.Combine(ThuMuc, "AiiGrow-Setup-" + CapNhat.DocBan(m.Version)!.ToString(3) + ".exe");
        DonBoCaiCu(tep);
        var tam = tep + ".tai";
        _log.LogInformation("Tự cập nhật: tải bản {Ban} ({Url})", m.Version, m.Url);
        // HttpClient.Timeout không phủ phần thân của GetStreamAsync ⇒ mạng treo giữa chừng là vòng kiểm đứng mãi: giới hạn cả lượt tải 30 phút
        using (var hanTai = CancellationTokenSource.CreateLinkedTokenSource(ct))
        {
            hanTai.CancelAfter(TimeSpan.FromMinutes(30));
            await using var vao = await http.GetStreamAsync(m.Url, hanTai.Token);
            await using var ra = File.Create(tam);
            await vao.CopyToAsync(ra, hanTai.Token);
        }

        if (!TuCapNhat.KhopSha256(tam, m.Sha256))
        {
            try { File.Delete(tam); } catch { }
            _log.LogWarning("Tự cập nhật: tệp tải về SAI sha256 ⇒ đã xoá, không chạy");
            return chuKy;
        }
        File.Move(tam, tep, true);
        // ghi «đã thử» SAU khi tải đúng: tải hỏng/đứt giữa chừng thì lượt 6 giờ sau tải lại, không phải chờ 24 giờ
        GhiDaThu(m.Version);
        ChayBoCai(tep);
        _log.LogInformation("Tự cập nhật: đã giao bộ cài bản {Ban} chạy (--capnhat --im-lang)", m.Version);
        return chuKy;
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

    /// <summary>Bộ cài cập nhật tắt «tự chạy lại khi lỗi» trong lúc chép; bị giết giữa chừng (mất điện, quá 30 phút) thì không bật lại được ⇒
    /// mỗi lần dịch vụ khởi động tự bật lại (SYSTEM có quyền sc.exe trên chính dịch vụ).</summary>
    private void BatLaiTuKhoiDong()
    {
        try
        {
            var a = Shell.Run("sc.exe", new[] { "failure", Paths.ServiceName }.Concat(CapNhatMay.DoiSoBatTuKhoiDong), 30000);
            var b = Shell.Run("sc.exe", new[] { "failureflag", Paths.ServiceName, "1" }, 30000);
            if (!a.Ok || !b.Ok) _log.LogWarning("Bật tự chạy lại dịch vụ lỗi: {Loi}", a.Ok ? b.Error : a.Error);
        }
        catch (Exception e) { _log.LogWarning("Bật tự chạy lại dịch vụ lỗi: {Loi}", e.Message); }
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
