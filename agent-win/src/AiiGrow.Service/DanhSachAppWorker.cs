using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Quét app đã cài THẬT (QuetAppWindows) và gửi POST /api/device/ung-dung (DanhSachApp.cs): lúc khởi động / vừa ghép xong, mỗi 30 phút,
/// và khi phản hồi dong-bo có `danhSachApp` đổi (Ba Mẹ bấm «Làm mới» ⇒ yeuCau mới ⇒ quét + gửi ĐỦ; bam máy chủ lệch bam đã gửi ⇒ gửi ĐỦ).
/// Chạy nền, không chặn vòng đồng bộ chính: tín hiệu đọc từ phản hồi dong-bo đã lưu (AgentConfig.LastPolicyJson). Lỗi mạng ⇒ thử lại sau 5 phút;
/// 404 (máy chủ chưa có route) ⇒ thôi gửi tới lần khởi động sau.</summary>
public sealed class DanhSachAppWorker : BackgroundService
{
    private readonly ILogger<DanhSachAppWorker> _log;
    private readonly AgentRuntime _rt;
    private readonly ThongTinTepWindows _tep = new();
    private List<AppThat>? _dsCuoi;
    private DateTimeOffset _quetLuc = DateTimeOffset.MinValue;
    private DateTimeOffset _thuLaiLuc = DateTimeOffset.MinValue;
    private TinHieuDanhSachApp? _tinHieuDaXuLy;
    private bool _tinHieuDaXem;
    private bool _thoi;   // 404 ⇒ máy chủ chưa có /ung-dung
    private string? _sidDaQuet;
    private bool _conIcon;   // còn icon máy chủ chưa có (vượt ngân sách / thieuIcon) ⇒ gửi tiếp ở nhịp sau
    private int _luotIcon;   // số lượt gửi tiếp icon liền nhau — máy chủ cứ báo thiếu mãi thì thôi tới chu kỳ 30 phút (không lặp 15 giây/lần)

    public DanhSachAppWorker(ILogger<DanhSachAppWorker> log, AgentRuntime rt) { _log = log; _rt = rt; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // để AgentWorker đọc tài khoản Con trước (ChildSids) — tối đa 3 phút, rồi quét cả khi chưa biết tài khoản Con
        try { await Task.Delay(TimeSpan.FromSeconds(40), ct); } catch (OperationCanceledException) { return; }
        for (int i = 0; i < 28 && _rt.ChildSids == null && !ct.IsCancellationRequested; i++)
            try { await Task.Delay(TimeSpan.FromSeconds(5), ct); } catch (OperationCanceledException) { return; }
        while (!ct.IsCancellationRequested && !_thoi)
        {
            try { await MotLuot(DateTimeOffset.UtcNow, ct); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogWarning("Gửi danh sách app lỗi (thử lại sau): {m}", e.Message); _thuLaiLuc = DateTimeOffset.UtcNow + LichDanhSachApp.ThuLaiSau; }
            try { await Task.Delay(TimeSpan.FromSeconds(15), ct); } catch (OperationCanceledException) { break; }
        }
    }

    private async Task MotLuot(DateTimeOffset now, CancellationToken ct)
    {
        var cfg = _rt.Config;
        if (cfg is not { Paired: true } || _rt.DangGo || _rt.TokenInvalid) return;
        var tin = TinHieuDanhSachApp.Doc(cfg.LastPolicyJson);
        var daGui = cfg.DanhSachApp;
        var vic = LichDanhSachApp.Xet(now, _quetLuc, _thuLaiLuc, tin, _tinHieuDaXem ? _tinHieuDaXuLy : null, _tinHieuDaXem, daGui);
        var sidNay = string.Join(",", _rt.ChildSids ?? Array.Empty<string>());
        // tài khoản Con vừa đọc được / đổi ⇒ quét lại (app Store, HKU, lối tắt trong hồ sơ Con)
        if (vic == null && _dsCuoi != null && sidNay != _sidDaQuet && now >= _thuLaiLuc) vic = (true, false);
        if (vic == null && _dsCuoi != null && _conIcon && _luotIcon < 20 && now >= _thuLaiLuc) { vic = (false, false); _luotIcon++; }
        else if (vic != null) _luotIcon = 0;
        if (vic == null) return;
        var (quetLai, epDu) = vic.Value;
        if (quetLai || _dsCuoi == null)
        {
            var sids = _rt.ChildSids ?? Array.Empty<string>();
            var t0 = Environment.TickCount64;
            var ds = await Task.Run(() => QuetAppWindows.Quet(sids, _tep, m => _log.LogDebug("Quét app: {m}", m)), ct);
            _dsCuoi = ds;
            _sidDaQuet = string.Join(",", sids);
            _quetLuc = now;
            _log.LogDebug("Đã quét {n} app ({ms} ms, {s} tài khoản Con)", ds.Count, Environment.TickCount64 - t0, sids.Count);
        }
        try
        {
            using var api = new UngDungClient(cfg.Server, cfg.Token);
            var dong = new DongBoDanhSachApp(api, new KhoDanhSachApp(_rt.Store));
            var (kieu, _) = await dong.GuiAsync(_dsCuoi!, epDu, ct);
            _conIcon = dong.ConIconChoGui;
            if (kieu != KieuGuiApp.KhongDoi) _log.LogInformation("Đã gửi danh sách app ({kieu}): {n} app", kieu == KieuGuiApp.Du ? "đủ" : "phần đổi", _dsCuoi!.Count);
            _tinHieuDaXuLy = tin; _tinHieuDaXem = true;
            // yêu cầu «Làm mới» đã xử lý ⇒ lưu (khởi động lại không quét/gửi đủ lại vì cùng một yêu cầu)
            if (tin?.YeuCau != null && tin.YeuCau != daGui?.YeuCau)
                try { _rt.Store.Update(c => (c.DanhSachApp ??= new()).YeuCau = tin.YeuCau); } catch { }
        }
        catch (ApiException e) when (e.StatusCode == 404)
        {
            _thoi = true;
            _log.LogInformation("Máy chủ chưa có /api/device/ung-dung (404) — thôi gửi danh sách app tới lần khởi động sau");
        }
    }
}
