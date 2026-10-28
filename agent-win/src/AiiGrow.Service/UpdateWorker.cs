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
        var cho = TimeSpan.FromMinutes(2);
        var hen = DateTimeOffset.UtcNow + cho;
        while (!ct.IsCancellationRequested)
        {
            var bayGio = DateTimeOffset.UtcNow;
            hen = TuCapNhat.KeTiep(hen, bayGio, cho);   // chỉ sửa khi đồng hồ bị lùi: hẹn không xa quá đúng khoảng chờ đã định
            if (bayGio >= hen)
            {
                try { cho = await KiemMotLuot(ct); }
                // chỉ dừng khi dịch vụ dừng: hết hạn của HttpClient/CancelAfter cũng là OperationCanceledException — lọt ra là BackgroundService
                // đổ và kéo cả dịch vụ (chặn app, lọc web) chết theo
                catch (Exception e) when (e is not OperationCanceledException || !ct.IsCancellationRequested)
                {
                    // chưa đọc được manifest (mạng chưa lên sau khi thức, máy chủ lỗi): thử lại sớm, không đợi trọn chu kỳ — chỉ tốn một GET nhỏ
                    _log.LogWarning("Tự cập nhật: {Loi}", e.Message);
                    cho = _chuKy < ThuLaiManifest ? _chuKy : ThuLaiManifest;
                }
                catch (OperationCanceledException) { break; }
                hen = DateTimeOffset.UtcNow + cho;
            }
            try { await Task.Delay(TimeSpan.FromMinutes(1), ct); } catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>Chu kỳ máy chủ đặt lần gần nhất đọc được manifest (mặc định 6 giờ).</summary>
    private TimeSpan _chuKy = TuCapNhat.ChuKyMacDinh;
    private static readonly TimeSpan ThuLaiManifest = TimeSpan.FromMinutes(15);
    /// <summary>Tải bộ cài (~182 MB) hỏng/đứt: chờ ít nhất 1 giờ mới tải lại — chu kỳ 15 phút không được biến thành vòng tải liên tục.</summary>
    private static readonly TimeSpan ThuLaiTai = TimeSpan.FromHours(1);
    /// <summary>Không nhận được byte nào trong ngần này ⇒ coi là mạng treo, bỏ lượt tải (không giới hạn tổng thời gian: mạng chậm vẫn tải xong).</summary>
    private static readonly TimeSpan HanDungTai = TimeSpan.FromMinutes(2);

    /// <returns>Thời gian chờ tới lượt kiểm sau.</returns>
    private async Task<TimeSpan> KiemMotLuot(CancellationToken ct)
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return ThuLaiManifest;   // vừa ghép máy thì lượt đầu tới sớm
        var hienTai = TuCapNhat.BanHienTai();

        // KHÔNG gắn token máy: manifest công khai, còn tệp cài tải từ Vercel Blob (ngoài máy chủ AiiGrow) — gửi Bearer theo là lộ token máy cho bên thứ ba.
        using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        var server = ApiClient.NormalizeServer(cfg.Server);
        BanMoi? m;
        using (var cts = CancellationTokenSource.CreateLinkedTokenSource(ct))
        {
            cts.CancelAfter(TimeSpan.FromSeconds(30));
            var json = await http.GetStringAsync(server + TuCapNhat.DuongManifest, cts.Token);
            m = JsonSerializer.Deserialize<BanMoi>(json);
        }
        if (m == null) return ThuLaiManifest;                       // thân lạ (null) — giữ chu kỳ cũ, không đè về 6 giờ
        _chuKy = TuCapNhat.ChuKyKiem(m.ChuKyKiemPhut);
        var lyDo = TuCapNhat.KiemManifest(m, server, hienTai);
        if (lyDo != null) { _log.LogDebug("Tự cập nhật: bỏ qua — {LyDo}", lyDo); return _chuKy; }
        if (DaThuGanDay(m.Version)) return _chuKy;

        Directory.CreateDirectory(ThuMuc);
        var tep = Path.Combine(ThuMuc, "AiiGrow-Setup-" + CapNhat.DocBan(m.Version)!.ToString(3) + ".exe");
        DonBoCaiCu(tep);
        var tam = tep + ".tai";
        _log.LogInformation("Tự cập nhật: tải bản {Ban} ({Url})", m.Version, m.Url);
        try { await TaiVe(http, m.Url, tam, ct); }
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            try { File.Delete(tam); } catch { }
            _log.LogWarning("Tự cập nhật: tải bản {Ban} lỗi ({Loi}) ⇒ thử lại sau {Gio}", m.Version, e.Message, ThuLaiTai);
            return _chuKy > ThuLaiTai ? _chuKy : ThuLaiTai;
        }

        if (!TuCapNhat.KhopSha256(tam, m.Sha256))
        {
            try { File.Delete(tam); } catch { }
            // có thể chỉ thoáng qua (Wi-Fi khách sạn trả trang đăng nhập) hoặc máy chủ sắp sửa sha: thử lại sau ≥1 giờ, không đốt 182 MB mỗi chu kỳ
            _log.LogWarning("Tự cập nhật: tệp tải về SAI sha256 ⇒ đã xoá, không chạy; thử lại sau {Gio}", ThuLaiTai);
            return _chuKy > ThuLaiTai ? _chuKy : ThuLaiTai;
        }
        File.Move(tam, tep, true);
        // ghi «đã thử» SAU khi tải đúng: tải đứt giữa chừng thì sau ThuLaiTai tải lại, không phải chờ 24 giờ
        GhiDaThu(m.Version);
        ChayBoCai(tep);
        _log.LogInformation("Tự cập nhật: đã giao bộ cài bản {Ban} chạy (--capnhat --im-lang)", m.Version);
        return _chuKy;
    }

    /// <summary>Tải về <paramref name="tam"/>; mỗi lần đọc phải nhận được dữ liệu trong <see cref="HanDungTai"/> (HttpClient.Timeout không phủ
    /// phần thân của stream ⇒ trước đây mạng treo giữa chừng là vòng kiểm đứng mãi).</summary>
    private static async Task TaiVe(HttpClient http, string url, string tam, CancellationToken ct)
    {
        using var han = CancellationTokenSource.CreateLinkedTokenSource(ct);
        han.CancelAfter(HanDungTai);
        using var res = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, han.Token);
        res.EnsureSuccessStatusCode();
        await using var vao = await res.Content.ReadAsStreamAsync(han.Token);
        await using var ra = File.Create(tam);
        var buf = new byte[81920];
        while (true)
        {
            han.CancelAfter(HanDungTai);
            var n = await vao.ReadAsync(buf, han.Token);
            if (n == 0) break;
            await ra.WriteAsync(buf.AsMemory(0, n), ct);
        }
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
