using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// P1 (07/11): «Ba Mẹ bấm ⇒ máy Con áp trong ≤5 giây». Giữ MỘT long-poll liên tục tới `api/device/cho-thay-doi`; máy chủ trả ngay khi Ba Mẹ đổi gì
/// (khoá máy, chế độ chặn, chặn app/web, duyệt/từ chối xin, giờ…) ⇒ gọi <see cref="AgentRuntime.RequestSyncSoon"/> ⇒ AgentWorker đồng bộ + áp ngay vòng đó.
/// Vòng đồng bộ theo nextCheckSec của AgentWorker VẪN chạy làm dự phòng (mạng chặn kết nối dài, máy chủ cũ…). Lỗi ⇒ lùi dần 2–30 giây; 404 (máy chủ cũ) ⇒ 5 phút.
/// </summary>
public sealed class ChoThayDoiWorker : BackgroundService
{
    private readonly ILogger<ChoThayDoiWorker> _log;
    private readonly AgentRuntime _rt;

    public ChoThayDoiWorker(ILogger<ChoThayDoiWorker> log, AgentRuntime rt) { _log = log; _rt = rt; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        long? ver = null;
        string? gocCu = null, tokenCu = null;
        int loi = 0;
        ApiClient? api = null;
        while (!ct.IsCancellationRequested)
        {
            TimeSpan cho = TimeSpan.Zero;
            try
            {
                var cfg = _rt.Config;
                if (cfg is not { Paired: true } || _rt.DangGo) { ver = null; await Task.Delay(TimeSpan.FromSeconds(5), ct); continue; }
                if (api == null || cfg.Server != gocCu || cfg.Token != tokenCu) { api?.Dispose(); api = new ApiClient(cfg.Server, cfg.Token, timeoutGiay: 40); ver = null; gocCu = cfg.Server; tokenCu = cfg.Token; }   // ghép lại ⇒ client + mốc mới (giữ kết nối giữa các lượt)
                var t0 = DateTimeOffset.UtcNow;
                var kq = await api.ChoThayDoiAsync(ver, ct);
                loi = 0;
                if (ver != null && kq.Doi)
                {
                    _log.LogInformation("Ba Mẹ vừa đổi gì đó (phiên bản {v}) — đồng bộ ngay", kq.PhienBan);
                    _rt.RequestSyncSoon();
                }
                ver = kq.PhienBan;
                cho = ChoThayDoi.ChoLai(0, kq, DateTimeOffset.UtcNow - t0);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception e)
            {
                loi++;
                if (e is ApiException { StatusCode: 404 }) { cho = TimeSpan.FromMinutes(5); loi = 0; _log.LogDebug("Máy chủ chưa có cho-thay-doi — chỉ dùng vòng đồng bộ định kỳ"); }
                else { cho = ChoThayDoi.ChoLai(loi, null, TimeSpan.Zero); _log.LogDebug("Chờ thay đổi lỗi ({m}) — thử lại sau {s}s", e.Message, (int)cho.TotalSeconds); }
            }
            if (cho > TimeSpan.Zero) { try { await Task.Delay(cho, ct); } catch (OperationCanceledException) { break; } }
        }
    }
}
