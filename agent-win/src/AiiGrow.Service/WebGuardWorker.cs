using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Áp danh sách chặn / cho phép web của máy chủ vào chính sách Chrome / Edge / Brave / Cốc Cốc TRONG HIVE TÀI KHOẢN CON (HKU\<SID Con>) — xem Core/WebHives.cs.
/// 0.2.6: không còn ghi HKLM (HKLM áp cho cả máy ⇒ chặn cả tài khoản Ba Mẹ — issue #68/S1); luật cũ trong HKLM được gỡ sạch một lần khi khởi động.
/// Chỉ ở chế độ «Chặn thật». Giám sát, máy mồ côi, đang gỡ, Con đang mở tạm bằng mã offline, hoặc máy chưa ghép ⇒ GỠ hết chính sách của AiiGrow.
/// Đọc Policy cuối đã lưu (AgentConfig.LastPolicyJson) nên mất mạng vẫn giữ nguyên luật. Đổi/gỡ luật ⇒ tăng <see cref="AgentRuntime.WebRev"/> để khay của Con
/// làm mới chính sách trình duyệt (dịch vụ SYSTEM không làm mới được chính sách của người dùng khác).</summary>
public sealed class WebGuardWorker : BackgroundService
{
    private readonly ILogger<WebGuardWorker> _log;
    private readonly AgentRuntime? _rt;
    private readonly ConfigStore _store = new();
    private readonly WebPolicyHives _hives;
    private readonly bool _baoDocLai;
    private string? _daBaoHive;
    private string? _daBaoLoi;
    private string? _daBaoLoiHklm;
    private string? _daBaoDe;
    private string? _daBaoTrinhDuyet;

    public WebGuardWorker(ILogger<WebGuardWorker> log, AgentRuntime? rt = null, WebPolicyHives? hives = null)
    {
        _log = log;
        _rt = rt;
        _hives = hives ?? new WebPolicyHives(new WindowsWebHiveHost());
        _baoDocLai = hives == null;   // bản giả trong test không đụng Group Policy thật
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Yield();   // vòng đầu không chạy đồng bộ trong lúc host khởi động
        while (!ct.IsCancellationRequested)
        {
            try { MotVong(DateTimeOffset.UtcNow); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Áp chính sách web lỗi (thử lại sau): {m}", e.Message); }
            try { await Task.Delay(TimeSpan.FromSeconds(30), ct); } catch (OperationCanceledException) { break; }
        }
    }

    public void MotVong(DateTimeOffset now)
    {
        var cfg = _store.Load();
        var p = WebGuard.CanAp(cfg, _rt?.DangGo == true, now);
        string? host = null;
        try { if (cfg is { Paired: true }) host = new Uri(ApiClient.NormalizeServer(cfg.Server)).Host; } catch { }
        var kq = _hives.Ap(p, host, _rt?.ChildSids, now);
        // «chặn theo lọc»: trình duyệt chỉ được chạy cho tài khoản Con mà luật web đang có trong hive (AgentWorker đưa vào AppLocker + vòng đóng app)
        var td = TrinhDuyetLoc.TheoSid(p, kq.DaApCho, kq.HklmKhongTha);
        var tdChuoi = string.Join("; ", td.OrderBy(x => x.Key).Select(x => x.Key + ": " + string.Join(",", x.Value)));
        if (tdChuoi != _daBaoTrinhDuyet)
        {
            _daBaoTrinhDuyet = tdChuoi;
            if (p != null && td.Count > 0) _log.LogInformation("Chặn thật: trình duyệt được chạy (web lọc theo danh sách) — {ds}", tdChuoi);
            else if (p != null) _log.LogInformation("Chặn thật: chưa thả trình duyệt (luật web chưa áp được cho tài khoản Con, hoặc danh sách web cả máy HKLM đè: {hk})",
                string.Join(",", kq.HklmKhongTha));
        }
        _rt?.DatTrinhDuyetLoc(td);
        var canBao = false;   // báo trình duyệt đọc lại chính sách MỘT lần cuối lượt (RefreshPolicyEx force xử lý lại cả chính sách máy)
        if (kq.HklmDaGoRong.Count > 0)
        {
            // Chrome / Edge đọc khoá danh sách RỖNG ở HKLM thành chính sách máy «danh sách trống», thắng danh sách của Con (e2e 4.17, 0.2.9)
            _log.LogInformation("Đã gỡ khoá danh sách web RỖNG ở HKLM (chính sách máy «danh sách trống» đè luật web của Con): {ds}", string.Join(", ", kq.HklmDaGoRong));
            canBao = true;
        }
        if (kq.DaGoHklm)
        {
            _log.LogInformation("Đã gỡ luật web cũ trong HKLM (bản trước 0.2.6 ghi cả máy) — tài khoản Ba Mẹ không còn bị chặn");
            canBao = true;
        }
        // lỗi lặp lại (IT khoá ACL HKLM) chỉ log khi đổi — không 120 dòng/giờ
        if (kq.LoiGoHklm != _daBaoLoiHklm)
        {
            _daBaoLoiHklm = kq.LoiGoHklm;
            if (kq.LoiGoHklm != null) _log.LogWarning("Gỡ luật web cũ trong HKLM lỗi (thử lại mỗi 30 giây): {m}", kq.LoiGoHklm);
        }
        var de = string.Join(", ", kq.HklmDe);
        if (de != _daBaoDe)
        {
            _daBaoDe = de;
            if (_rt != null) _rt.GhiChuWeb = de.Length > 0 ? $"{de}: IT đặt danh sách web cho cả máy — luật web AiiGrow không có hiệu lực" : null;
            if (de.Length > 0) _log.LogWarning("{b} có URLBlocklist/URLAllowlist cả máy (HKLM) do người khác đặt — Chrome/Edge không gộp với danh sách theo tài khoản, luật web AiiGrow bị bỏ qua", de);
        }
        if (kq.DaDoi)
        {
            _log.LogInformation(p == null ? "Đã gỡ chính sách web của AiiGrow khỏi tài khoản Con" : "Đã áp chính sách web cho tài khoản Con: chế độ {c}, chặn {a}, cho phép {b}", p?.CheDo, p?.Chan.Count, p?.Cho.Count);
            if (kq.DoiChoConHienTai) _rt?.WebDaDoi();   // khay (phiên Con) làm mới chính sách trình duyệt + nhắc mở lại trình duyệt
            // lưới đỡ khi khay không chạy: tín hiệu chính sách MÁY cũng làm Chrome / Edge đọc lại cả HKCU (review #65/#75)
            canBao = true;
        }
        if (canBao && _baoDocLai) _log.LogInformation("Báo trình duyệt đọc lại chính sách: {c}", WindowsWebPolicyRegistry.BaoTrinhDuyetDocLai());
        var loiHive = string.Join("; ", kq.LoiHive ?? Array.Empty<string>());
        if (loiHive != _daBaoLoi)
        {
            _daBaoLoi = loiHive;
            if (loiHive.Length > 0) _log.LogWarning("Ghi luật web vào hive tài khoản Con lỗi (thử lại mỗi 30 giây): {loi}", loiHive);
        }
        // chưa có hồ sơ của Con (chưa đăng nhập lần nào) ⇒ chưa áp được; ghi log một lần cho mỗi tập SID
        var chua = string.Join(",", kq.ChuaCoHive);
        if (chua != _daBaoHive)
        {
            _daBaoHive = chua;
            if (chua.Length > 0) _log.LogInformation("Luật web chưa áp được cho {sid}: hồ sơ Windows chưa có / đang bị khoá — thử lại mỗi 30 giây, áp ngay khi Con đăng nhập", chua);
        }
    }
}
