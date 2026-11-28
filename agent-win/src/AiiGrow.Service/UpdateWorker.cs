using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// TỰ CẬP NHẬT (Thanh 22/10: «từ phiên bản này trở đi, nó sẽ tự động download phiên bản mới»). Lúc khởi động (+2 phút) rồi theo chu kỳ máy chủ đặt (chuKyKiemPhut, mặc định 6 giờ, tính theo giờ thật):
/// GET /api/agent/ban-moi → bản mới hơn ⇒ tải AiiGrow-Setup.exe về ProgramData\AiiGrow\cap-nhat, KIỂM sha256 + chữ ký Authenticode người ký ghim trong agent (KyBoCai, sai ⇒ xoá, bỏ qua) rồi chạy
/// «AiiGrow-Setup.exe --capnhat --im-lang» qua một tác vụ Task Scheduler (SYSTEM) tách rời — bộ cài sẽ dừng chính dịch vụ này.
/// Bộ cài giữ nguyên config/token/AppLocker, lỗi thì tự khôi phục bản cũ. #683: thử lại cùng bản nghỉ tăng dần 1 giờ → 4 giờ → 24 giờ
/// (LuatThuCapNhat); bộ cài lỗi / khôi phục bản cũ ⇒ báo máy chủ «cap_nhat_loi» (Ba Mẹ thấy cảnh báo) + Sentry.
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
                    // đã bắt đầu tải/giao bộ cài mà lỗi (kiểm sha, đổi tên tệp, không giao được bộ cài…) ⇒ máy kẹt bản cũ, lên Sentry (#687); chỉ đọc manifest lỗi (mạng) thì giữ Warning
                    if (_dangTai) _log.LogError("Tự cập nhật: lỗi sau khi bắt đầu tải: {Loi}", e.Message);
                    else _log.LogWarning("Tự cập nhật: {Loi}", e.Message);
                    // đã bắt đầu tải (lỗi ở bước sau: kiểm sha, đổi tên tệp bị khoá…) thì giãn như tải hỏng, không tải lại 182 MB mỗi chu kỳ
                    cho = _dangTai ? (_chuKy > ThuLaiTai ? _chuKy : ThuLaiTai) : (_chuKy < ThuLaiManifest ? _chuKy : ThuLaiManifest);
                }
                catch (OperationCanceledException) { break; }
                hen = DateTimeOffset.UtcNow + cho;
            }
            try { await Danh.WaitAsync(TimeSpan.FromMinutes(1), ct); } catch (OperationCanceledException) { break; }
            // «Cập nhật ngay» bỏ qua thời gian nghỉ thử lại (chỉ chờ bộ cài lượt trước chạy xong; bộ cài sai chữ ký vẫn chặn 24 giờ) — #683
            if (Interlocked.Exchange(ref _kiemNgay, 0) == 1) { hen = DateTimeOffset.UtcNow; _epHoi = true; }
        }
    }

    /// <summary>Chu kỳ máy chủ đặt lần gần nhất đọc được manifest (mặc định 6 giờ).</summary>
    private TimeSpan _chuKy = TuCapNhat.ChuKyMacDinh;
    /// <summary>Lượt kiểm này do Con/Ba Mẹ bấm «Cập nhật ngay».</summary>
    private bool _epHoi;
    private static readonly DateTimeOffset DichVuBatDau = DateTimeOffset.UtcNow;
    private string? _daBaoHong;

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
        // bộ cài lượt trước còn đang chạy / bản bị chặn cứng (sai chữ ký) thì «Cập nhật ngay» cũng bỏ qua ⇒ đừng mời Con bấm vô ích
        var daThu = DocDaThu();
        var now = DateTimeOffset.UtcNow;
        var hienTai = TuCapNhat.BanHienTai();
        if (LuatThuCapNhat.DangNghi(daThu, m.Version, now, epHoi: true, boCaiDaXong: LuatThuCapNhat.LanTruocHong(daThu, m.Version, hienTai, now, DichVuBatDau))) return null;
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
        var epHoi = _epHoi;
        _epHoi = false;
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
            if (CapNhat.DocBan(m.Version) is { } mb && mb > hienTai) _log.LogError("Tự cập nhật: máy chủ phát {Moi} (máy {Cu}) nhưng bỏ qua — {LyDo} (máy chủ {Server}, url {Url})", m.Version, hienTai.ToString(3), lyDo, server, m.Url);
            else _log.LogDebug("Tự cập nhật: bỏ qua — {LyDo}", lyDo);
            return _chuKy;
        }
        var daThu = DocDaThu();
        var bayGio = DateTimeOffset.UtcNow;
        var hong = LuatThuCapNhat.LanTruocHong(daThu, m.Version, hienTai, bayGio, DichVuBatDau);
        if (hong && _daBaoHong != daThu!.Ghi())
        {
            _daBaoHong = daThu.Ghi();          // mỗi lần thử hỏng báo một lần (vòng kiểm 15 phút không dội Sentry)
            // #683: bộ cài lượt trước đã chạy xong mà máy vẫn bản cũ (lỗi chép tệp / khôi phục bản cũ) ⇒ Sentry; hỏng lặp lại ⇒ báo Ba Mẹ (mỗi bản một lần)
            // #854: kèm chẩn đoán (tác vụ + install.log từ lúc giao) — install.log chỉ nằm trên máy Con, trước đây không ai đọc được từ xa
            _log.LogError("Tự cập nhật: lần thử thứ {Lan} lên bản {Ban} không thành (máy vẫn {Cu}); thử lại sau {Nghi}. Tác vụ: {TacVu}. install.log: {Log}",
                daThu.SoLan, m.Version, hienTai.ToString(3), LuatThuCapNhat.Nghi(daThu.SoLan), DocTacVu(), DocInstallLog(daThu.Luc));
            if (LuatThuCapNhat.NenBaoBaMe(daThu.SoLan)) BaoLoi(m.Version, hienTai, daThu.SoLan, "bo_cai_loi");
        }
        if (LuatThuCapNhat.DangNghi(daThu, m.Version, bayGio, epHoi, boCaiDaXong: hong))
        {
            _log.LogInformation("Tự cập nhật: bản {Ban} đã thử {Lan} lần, lần cuối {Luc:o} — chờ hết thời gian nghỉ (hoặc bấm «Cập nhật ngay»)", m.Version, daThu!.SoLan, daThu.Luc);
            var con = LuatThuCapNhat.ConNghi(daThu!, bayGio);         // thức đúng lúc hết nghỉ, không đợi trọn chu kỳ 6 giờ
            return _chuKy < con ? _chuKy : con;
        }

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
                _log.LogError("Tự cập nhật: tải bản {Ban} lỗi ({Loi}) ⇒ thử lại sau {Gio}", m.Version, e.Message, ThuLaiTai);
                return _chuKy > ThuLaiTai ? _chuKy : ThuLaiTai;
            }

            if (!TuCapNhat.KhopSha256(tam, m.Sha256))
            {
                try { File.Delete(tam); } catch { }
                // có thể chỉ thoáng qua (Wi-Fi khách sạn trả trang đăng nhập) hoặc máy chủ sắp sửa sha: thử lại sau ≥1 giờ, không đốt 182 MB mỗi chu kỳ
                _log.LogError("Tự cập nhật: tệp tải về SAI sha256 ⇒ đã xoá, không chạy; thử lại sau {Gio}", ThuLaiSaiSha);
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
                GhiDaThu(daThu, m.Version, chanCung: true);   // bỏ hẳn bản này 24 giờ: «Cập nhật ngay» trên khay không tải lại 182 MB mỗi lần bấm
                _log.LogError("Tự cập nhật: bộ cài bản {Ban} KHÔNG có chữ ký Authenticode hợp lệ của AiiGrow ({Kq}) ⇒ đã xoá, không chạy; bỏ qua bản này 24 giờ", m.Version, ky);
                return _chuKy;
            case KetQuaKyBoCai.ChuaKiemDuoc:
                // giữ tệp (đúng sha, đúng người ký ghim): lượt sau chỉ kiểm lại chữ ký, không tải lại
                _log.LogError("Tự cập nhật: chưa kiểm xong chữ ký bộ cài bản {Ban} (mạng/CRL-OCSP/chuỗi chứng chỉ) ⇒ không chạy lượt này, thử lại sau {Gio}", m.Version, ThuLaiTai);
                return _chuKy > ThuLaiTai ? _chuKy : ThuLaiTai;
            case KetQuaKyBoCai.ChuaGhim:
                _log.LogWarning("Tự cập nhật: agent chưa ghim chứng chỉ ký bộ cài ⇒ chỉ kiểm sha256 (bản {Ban})", m.Version);
                break;
        }
        // ghi «đã thử» SAU khi tải đúng: tải đứt giữa chừng thì sau ThuLaiTai tải lại. Ghi TRƯỚC khi giao (bộ cài dừng dịch vụ này ngay);
        // giao lỗi ⇒ vẫn tính một lần (nghỉ 1 giờ rồi thử lại — #683, trước đây 24 giờ) + báo Ba Mẹ
        var lan = GhiDaThu(daThu, m.Version);
        _dangTai = false;   // đã tải xong: giao lỗi thì lượt kiểm kế tới sớm (ThuLaiManifest), không giãn như tải hỏng
        try { ChayBoCai(tep); }
        catch (Exception e)
        {
            _log.LogError("Tự cập nhật: không giao được bộ cài bản {Ban} (lần {Lan}): {Loi}", m.Version, lan.SoLan, e.Message);   // Sentry (#706)
            _daBaoHong = lan.Ghi();
            BaoLoi(m.Version, hienTai, lan.SoLan, "khong_giao_duoc");
            throw new InvalidOperationException($"{e.Message} (lần {lan.SoLan}, thử lại sau {LuatThuCapNhat.Nghi(lan.SoLan)})", e);
        }
        _log.LogInformation("Tự cập nhật: đã giao bộ cài bản {Ban} chạy (--capnhat --im-lang)", m.Version);
        // bộ cài thành công thì dịch vụ bị dừng / thay bản; còn chạy tới lượt sau là bộ cài không chạy / lỗi mà không dừng dịch vụ ⇒ kiểm lại sau
        // thời gian nghỉ (1 giờ), không đợi trọn chu kỳ 6 giờ
        return _chuKy < LuatThuCapNhat.Nghi(lan.SoLan) ? _chuKy : LuatThuCapNhat.Nghi(lan.SoLan);
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
    /// <remarks>#854: lượt trước còn treo (tác vụ «Đang chạy») thì Task Scheduler BỎ QUA lần chạy mới (MultipleInstances mặc định IgnoreNew) —
    /// Start-ScheduledTask vẫn báo thành công, máy kẹt bản cũ mà không ai biết. Chỉ giao khi lượt trước đã quá thời gian nghỉ (≥ 1 giờ, xa hơn
    /// ExecutionTimeLimit 30 phút) ⇒ dừng tác vụ cũ + bộ cài cũ còn sót trong thư mục cap-nhat rồi mới đăng ký lại.</remarks>
    private void ChayBoCai(string tep)
    {
        DungBoCaiCu();
        var tn = Shell.PsQuote(TenTacVu);
        var r = Shell.PowerShell(
            // chỉ dừng lượt cũ đã chạy quá ExecutionTimeLimit (treo) — lượt vừa giao (bấm «Cập nhật ngay» liền tay) để yên
            $"try {{ $c = Get-ScheduledTask -TaskName {tn} -ErrorAction Stop; if ($c.State -eq 'Running' -and ((Get-Date) - ($c | Get-ScheduledTaskInfo).LastRunTime).TotalMinutes -ge {(int)LuatThuCapNhat.ChoBoCai.TotalMinutes}) {{ Stop-ScheduledTask -TaskName {tn} }} }} catch {{}}; " +
            $"$a = New-ScheduledTaskAction -Execute {Shell.PsQuote(tep)} -Argument '--capnhat --im-lang'; " +
            "$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30); " +
            $"Register-ScheduledTask -TaskName {tn} -Action $a -Settings $s -User 'SYSTEM' -RunLevel Highest -Force | Out-Null; " +
            $"Start-ScheduledTask -TaskName {tn}", 60000);
        if (!r.Ok) throw new InvalidOperationException("không giao được bộ cài: " + r.Error);
    }

    /// <summary>Bộ cài tự cập nhật lượt trước còn chạy (treo) từ thư mục cap-nhat ⇒ kết thúc, ghi log (để biết có treo).</summary>
    private void DungBoCaiCu()
    {
        foreach (var p in System.Diagnostics.Process.GetProcesses())
        {
            using (p)
            {
                try
                {
                    // tệp bộ cài tự cập nhật luôn tên «AiiGrow-Setup-<bản>.exe» trong ProgramData\AiiGrow\cap-nhat (bộ cài Ba Mẹ tự mở không đụng tới)
                    if (!p.ProcessName.StartsWith("AiiGrow-Setup-", StringComparison.OrdinalIgnoreCase)) continue;
                    var duong = p.MainModule?.FileName;
                    if (duong == null || !Path.GetFullPath(duong).StartsWith(Path.GetFullPath(ThuMuc) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) continue;
                    if (DateTime.Now - p.StartTime < LuatThuCapNhat.ChoBoCai) continue;   // còn trong hạn chạy: có thể đang chép dở, không giết
                    _log.LogError("Tự cập nhật: bộ cài lượt trước còn chạy từ {Luc:o} ({Tep}) — treo ⇒ kết thúc trước khi giao bản mới. install.log: {Log}",
                        p.StartTime, Path.GetFileName(duong), DocInstallLog(p.StartTime));
                    p.Kill(entireProcessTree: true);
                }
                catch (Exception e) { _log.LogWarning("Tự cập nhật: chưa dừng được bộ cài cũ: {Loi}", e.Message); }
            }
        }
    }

    /// <summary>Trạng thái tác vụ AiiGrowCapNhat (State, LastRunTime, LastTaskResult) — một dòng cho log chẩn đoán.</summary>
    private static string DocTacVu()
    {
        try
        {
            var tn = Shell.PsQuote(TenTacVu);
            var r = Shell.PowerShell(
                $"$t = Get-ScheduledTask -TaskName {tn} -ErrorAction Stop; $i = $t | Get-ScheduledTaskInfo; " +
                "'{0} · chạy lúc {1:o} · mã {2}' -f $t.State, $i.LastRunTime, $i.LastTaskResult", 30000);
            return r.Ok ? r.Output.Trim() : "không đọc được (" + r.Error.Trim() + ")";
        }
        catch (Exception e) { return "không đọc được (" + e.Message + ")"; }
    }

    /// <summary>Các dòng install.log bộ cài ghi từ lúc giao (ChanDoanCapNhat.DongSau).</summary>
    private static string DocInstallLog(DateTimeOffset tu)
    {
        try
        {
            var tep = Path.Combine(Paths.DataDir, "install.log");
            if (!File.Exists(tep)) return "không có install.log";
            using var f = new FileStream(tep, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            if (f.Length > 256 * 1024) f.Seek(-256 * 1024, SeekOrigin.End);   // chỉ phần cuối — install.log cộng dồn mãi
            using var r = new StreamReader(f, Encoding.UTF8);
            var dong = r.ReadToEnd().Split('\n');
            return ChanDoanCapNhat.DongSau(dong.Select(d => d.TrimEnd('\r')), tu);
        }
        catch (Exception e) { return "không đọc được install.log (" + e.Message + ")"; }
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

    private static LanThuCapNhat? DocDaThu()
    {
        try { return File.Exists(TepDaThu) ? LanThuCapNhat.Doc(File.ReadAllText(TepDaThu)) : null; }
        catch { return null; }
    }

    private static LanThuCapNhat GhiDaThu(LanThuCapNhat? cu, string ban, bool chanCung = false)
    {
        var moi = LuatThuCapNhat.LanMoi(cu, ban, DateTimeOffset.UtcNow, chanCung);
        Directory.CreateDirectory(ThuMuc);
        File.WriteAllText(TepDaThu, moi.Ghi(), new UTF8Encoding(false));
        return moi;
    }

    /// <summary>Xếp sự kiện «cap_nhat_loi» vào hàng gửi máy chủ (nhịp kế gửi) — Ba Mẹ thấy máy chưa lên bản mới. Lỗi ghi hàng không chặn cập nhật.</summary>
    private void BaoLoi(string ban, Version hienTai, int soLan, string lyDo)
    {
        try { _store.Update(c => c.Queue.Add(LuatThuCapNhat.SuKienLoi(ban, hienTai, soLan, lyDo))); }
        catch (Exception e) { _log.LogWarning("Tự cập nhật: chưa xếp được sự kiện cap_nhat_loi: {Loi}", e.Message); }
    }
}
