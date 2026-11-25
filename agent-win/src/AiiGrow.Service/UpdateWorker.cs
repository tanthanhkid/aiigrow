using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// TỰ CẬP NHẬT (Thanh 22/10: «từ phiên bản này trở đi, nó sẽ tự động download phiên bản mới»). Lúc khởi động (+2 phút) rồi theo chu kỳ máy chủ đặt (chuKyKiemPhut, mặc định 6 giờ, tính theo giờ thật):
/// GET /api/agent/ban-moi → bản mới hơn ⇒ tải AiiGrow-Setup.exe về ProgramData\AiiGrow\cap-nhat, KIỂM sha256 + chữ ký Authenticode người ký ghim trong agent (KyBoCai, sai ⇒ xoá, bỏ qua) rồi chạy
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
                    // đã bắt đầu tải (lỗi ở bước sau: kiểm sha, đổi tên tệp bị khoá…) thì giãn như tải hỏng, không tải lại 182 MB mỗi chu kỳ
                    cho = _dangTai ? (_chuKy > ThuLaiTai ? _chuKy : ThuLaiTai) : (_chuKy < ThuLaiManifest ? _chuKy : ThuLaiManifest);
                }
                catch (OperationCanceledException) { break; }
                hen = DateTimeOffset.UtcNow + cho;
            }
            try { await Danh.WaitAsync(TimeSpan.FromMinutes(1), ct); } catch (OperationCanceledException) { break; }
            if (Interlocked.Exchange(ref _kiemNgay, 0) == 1) hen = DateTimeOffset.UtcNow;   // bản đã thử trong 24 giờ vẫn bỏ qua (DaThuGanDay) — không lặp cài lỗi
        }
    }

    /// <summary>Chu kỳ máy chủ đặt lần gần nhất đọc được manifest (mặc định 6 giờ).</summary>
    private TimeSpan _chuKy = TuCapNhat.ChuKyMacDinh;

    // 05/11: khay «Kiểm tra cập nhật › Cập nhật để sửa lỗi» (PipeCmd.CapNhatNgay) ⇒ chạy lượt kiểm + tải + cài ngay, không chờ chu kỳ.
    private static readonly SemaphoreSlim Danh = new(0, 1);
    private static int _kiemNgay;

    public static void KiemNgay()
    {
        Interlocked.Exchange(ref _kiemNgay, 1);
        try { if (Danh.CurrentCount == 0) Danh.Release(); } catch (SemaphoreFullException) { }
    }

    /// <summary>Hỏi manifest máy chủ: có bản mới hơn bản đang chạy (và hợp lệ để tự cập nhật) ⇒ trả số bản «0.2.10»; không ⇒ null.</summary>
    public static async Task<string?> KiemBanMoiAsync(string serverCfg, CancellationToken ct)
    {
        using var http = HttpDungChung.TaoClient(han: TimeSpan.FromSeconds(20));
        var server = ApiClient.NormalizeServer(serverCfg);
        var json = await http.GetStringAsync(server + TuCapNhat.DuongManifest, ct);
        var m = JsonSerializer.Deserialize<BanMoi>(json);
        if (m == null || TuCapNhat.KiemManifest(m, server, TuCapNhat.BanHienTai()) != null) return null;
        // bản đã thử cài trong 24 giờ (lỗi) thì lượt cập nhật ngay cũng bỏ qua (DaThuGanDay) ⇒ đừng mời Con bấm cập nhật vô ích
        if (DaThuGanDay(m.Version)) return null;
        return CapNhat.DocBan(m.Version)?.ToString(3);
    }
    private static readonly TimeSpan ThuLaiManifest = TimeSpan.FromMinutes(15);
    /// <summary>Tải bộ cài (~182 MB) hỏng/đứt: chờ ít nhất 1 giờ mới tải lại — chu kỳ 15 phút không được biến thành vòng tải liên tục.</summary>
    private static readonly TimeSpan ThuLaiTai = TimeSpan.FromHours(1);
    /// <summary>Không nhận được byte nào trong ngần này ⇒ coi là mạng treo, bỏ lượt tải (không giới hạn tổng thời gian: mạng chậm vẫn tải xong).</summary>
    private static readonly TimeSpan HanDungTai = TimeSpan.FromMinutes(2);
    /// <summary>Trần tổng một lượt tải (mạng nhỏ giọt vài byte mỗi phút không giữ vòng kiểm mãi).</summary>
    private static readonly TimeSpan HanTongTai = TimeSpan.FromHours(3);
    /// <summary>Tải xong mà sai sha256: tải lại sau ≥6 giờ (như nhịp cũ) — đủ để máy chủ sửa sha, không đốt 182 MB mỗi giờ.</summary>
    private static readonly TimeSpan ThuLaiSaiSha = TimeSpan.FromHours(6);
    private bool _dangTai;

    /// <returns>Thời gian chờ tới lượt kiểm sau.</returns>
    private async Task<TimeSpan> KiemMotLuot(CancellationToken ct)
    {
        _dangTai = false;
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return ThuLaiManifest;   // vừa ghép máy thì lượt đầu tới sớm
        var hienTai = TuCapNhat.BanHienTai();

        // KHÔNG gắn token máy: manifest công khai, còn tệp cài tải từ máy chủ AiiGrow — gửi Bearer theo là lộ token máy cho bên thứ ba.
        using var http = HttpDungChung.TaoClient(han: Timeout.InfiniteTimeSpan);
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
        if (lyDo != null)
        {
            // #639: «đã là bản mới nhất» là bình thường (Debug); mọi lý do khác (URL/host/sha lạ…) là máy kẹt bản cũ — phải thấy trong log
            if (CapNhat.DocBan(m.Version) is { } mb && mb > hienTai) _log.LogWarning("Tự cập nhật: máy chủ phát {Moi} (máy {Cu}) nhưng bỏ qua — {LyDo} (máy chủ {Server}, url {Url})", m.Version, hienTai.ToString(3), lyDo, server, m.Url);
            else _log.LogDebug("Tự cập nhật: bỏ qua — {LyDo}", lyDo);
            return _chuKy;
        }
        if (DaThuGanDay(m.Version)) { _log.LogInformation("Tự cập nhật: bản {Ban} đã thử trong 24 giờ qua — chờ, hoặc bấm «Cập nhật ngay» sau khi hết hạn", m.Version); return _chuKy; }

        if (KyBoCai.GhimSaiDang(KyBoCai.ThumbprintGhim))
        {
            // lỗi cấu hình của chính agent — biết trước khi tải, không tải 182 MB rồi mới bỏ
            _log.LogError("Tự cập nhật: danh sách ghim chứng chỉ trong agent (KyBoCai.ThumbprintGhim) có mục không phải băm SHA-256 ⇒ không cập nhật");
            return _chuKy;
        }

        Directory.CreateDirectory(ThuMuc);
        var tep = Path.Combine(ThuMuc, "AiiGrow-Setup-" + CapNhat.DocBan(m.Version)!.ToString(3) + ".exe");
        DonBoCaiCu(tep);
        // Lượt trước đã tải đúng sha nhưng chưa kiểm xong chữ ký (ChuaKiemDuoc) ⇒ dùng lại tệp, không tải lại 182 MB.
        // Thư mục dữ liệu chỉ SYSTEM + Administrators ghi được (Paths.SecureDirectory); sha vẫn kiểm lại.
        if (KiemKyDangChay is { IsCompleted: false }) return ThuLaiManifest;   // lượt kiểm chữ ký cũ còn giữ tệp — chờ nó xong
        var daCo = File.Exists(tep) && TuCapNhat.KhopSha256(tep, m.Sha256);
        if (!daCo)
        {
            var tam = tep + ".tai";
            _log.LogInformation("Tự cập nhật: có bản {Ban} (máy {Cu}) ⇒ tải ({Url})", m.Version, hienTai.ToString(3), m.Url);
            _dangTai = true;
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
                _log.LogWarning("Tự cập nhật: tệp tải về SAI sha256 ⇒ đã xoá, không chạy; thử lại sau {Gio}", ThuLaiSaiSha);
                return _chuKy > ThuLaiSaiSha ? _chuKy : ThuLaiSaiSha;
            }
            // Kiểm trên tệp đã đổi về đuôi .exe (WinVerifyTrust chọn SIP theo tệp; đuôi .tai lạ thì kiểm PE không chắc).
            File.Move(tam, tep, true);
        }
        else _log.LogInformation("Tự cập nhật: dùng lại bộ cài bản {Ban} đã tải (khớp sha256)", m.Version);

        // #549: sha256 đến từ chính manifest của máy chủ ⇒ chỉ chống tải hỏng. Chữ ký Authenticode của người ký ghim trong agent mới chặn được
        // máy chủ/Release bị chiếm trỏ sang exe độc (chạy bằng SYSTEM). Sai chữ ký ⇒ xoá, không chạy.
        var ky = await KiemKy(tep, ct);
        switch (ky)
        {
            case KetQuaKyBoCai.SaiChuKy:
            case KetQuaKyBoCai.GhimSaiDang:
                XoaBoCaiChuaKiem(tep);
                GhiDaThu(m.Version);   // bỏ hẳn bản này 24 giờ (DaThuGanDay): «Cập nhật ngay» trên khay không tải lại 182 MB mỗi lần bấm
                _log.LogError("Tự cập nhật: bộ cài bản {Ban} KHÔNG có chữ ký Authenticode hợp lệ của AiiGrow ({Kq}) ⇒ đã xoá, không chạy; bỏ qua bản này 24 giờ", m.Version, ky);
                return _chuKy;
            case KetQuaKyBoCai.ChuaKiemDuoc:
                // giữ tệp (đúng sha, đúng người ký ghim): lượt sau chỉ kiểm lại chữ ký, không tải lại
                _log.LogWarning("Tự cập nhật: chưa kiểm xong chữ ký bộ cài bản {Ban} (mạng/CRL-OCSP/chuỗi chứng chỉ) ⇒ không chạy lượt này, thử lại sau {Gio}", m.Version, ThuLaiTai);
                return _chuKy > ThuLaiTai ? _chuKy : ThuLaiTai;
            case KetQuaKyBoCai.ChuaGhim:
                _log.LogWarning("Tự cập nhật: agent chưa ghim chứng chỉ ký bộ cài ⇒ chỉ kiểm sha256 (bản {Ban})", m.Version);
                break;
        }
        // ghi «đã thử» SAU khi tải đúng: tải đứt giữa chừng thì sau ThuLaiTai tải lại, không phải chờ 24 giờ
        GhiDaThu(m.Version);
        ChayBoCai(tep);
        _log.LogInformation("Tự cập nhật: đã giao bộ cài bản {Ban} chạy (--capnhat --im-lang)", m.Version);
        return _chuKy;
    }

    /// <summary>Tải về <paramref name="tam"/>; mỗi lần đọc phải nhận được dữ liệu trong <see cref="HanDungTai"/> (HttpClient.Timeout không phủ
    /// phần thân của stream ⇒ trước đây mạng treo giữa chừng là vòng kiểm đứng mãi); cả lượt tối đa <see cref="HanTongTai"/>.</summary>
    private static async Task TaiVe(HttpClient http, string url, string tam, CancellationToken ct)
    {
        using var tong = CancellationTokenSource.CreateLinkedTokenSource(ct);
        tong.CancelAfter(HanTongTai);
        using var han = CancellationTokenSource.CreateLinkedTokenSource(tong.Token);
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

    private static readonly TimeSpan HanKiemKy = TimeSpan.FromMinutes(3);
    /// <summary>Lượt WinVerifyTrust đang chạy (quá hạn thì bỏ chờ nhưng luồng vẫn chạy tiếp) — không chồng lượt mới lên cùng tệp.</summary>
    private static Task<KetQuaKyBoCai>? KiemKyDangChay;

    /// <summary>WinVerifyTrust có mạng (tải chứng chỉ, CRL/OCSP) không nhận CancellationToken: chạy ngoài luồng, trần 3 phút để dừng dịch vụ không bị treo.</summary>
    private static async Task<KetQuaKyBoCai> KiemKy(string tep, CancellationToken ct)
    {
        if (KiemKyDangChay is { IsCompleted: false }) return KetQuaKyBoCai.ChuaKiemDuoc;
        var t = KiemKyDangChay = Task.Run(() => KyBoCai.Kiem(tep), CancellationToken.None);
        try { return await t.WaitAsync(HanKiemKy, ct); }
        catch (TimeoutException) { return KetQuaKyBoCai.ChuaKiemDuoc; }
    }

    /// <summary>Xoá bộ cài không qua kiểm chữ ký; xoá không được (AV/indexer giữ tệp) thì ghi log — DonBoCaiCu dọn ở lượt sau.</summary>
    private void XoaBoCaiChuaKiem(string tep)
    {
        try { File.Delete(tep); }
        catch (Exception e) { _log.LogWarning("Tự cập nhật: chưa xoá được bộ cài không qua kiểm chữ ký {Tep}: {Loi}", tep, e.Message); }
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
            return d.Length == 2 && d[0] == ban && DateTimeOffset.TryParse(d[1], out var luc) && DateTimeOffset.UtcNow - luc is var tuoi && tuoi >= TimeSpan.Zero && tuoi < TimeSpan.FromHours(24);   // đồng hồ bị lùi ⇒ coi như chưa thử
        }
        catch { return false; }
    }

    private static void GhiDaThu(string ban)
    {
        Directory.CreateDirectory(ThuMuc);
        File.WriteAllText(TepDaThu, ban + "|" + DateTimeOffset.UtcNow.ToString("o"), new UTF8Encoding(false));
    }
}
