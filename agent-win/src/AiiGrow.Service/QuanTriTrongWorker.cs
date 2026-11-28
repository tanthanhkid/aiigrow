using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// #860: mỗi 5 phút đọc tài khoản quản trị của máy (rẻ, không thử đăng nhập) và tính danh sách tài khoản quản trị chưa có mật khẩu
/// (QuanTriTrong.cs) ⇒ <see cref="AgentRuntime.QuanTriTrong"/> (status.quanTriTrong của dong-bo + TrayState cho khay).
/// Thử mật khẩu trống chỉ khi tới hạn (QuanTriTrong.DenHanKiem: tài khoản đang trống 5 phút/lần — không tính lần sai; đã có mật khẩu 6 giờ/lần),
/// mốc thử lưu ở C:\ProgramData\AiiGrow\quan-tri-trong.json ⇒ dịch vụ khởi động lại không thử thêm, không đẩy tài khoản Ba Mẹ tới ngưỡng khoá.
/// </summary>
public sealed class QuanTriTrongWorker : BackgroundService
{
    private static readonly TimeSpan Nhip = TimeSpan.FromMinutes(5);
    private readonly ILogger<QuanTriTrongWorker> _log;
    private readonly AgentRuntime _rt;
    private Dictionary<string, LuotKiemQuanTri>? _so;

    public QuanTriTrongWorker(ILogger<QuanTriTrongWorker> log, AgentRuntime rt) { _log = log; _rt = rt; }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!OperatingSystem.IsWindows()) return;
        try { await Task.Delay(TimeSpan.FromSeconds(20), ct); } catch (OperationCanceledException) { return; }
        while (!ct.IsCancellationRequested)
        {
            try { MotLuot(DateTimeOffset.UtcNow); }
            catch (Exception e) { _log.LogWarning("Kiểm tài khoản quản trị chưa có mật khẩu lỗi (thử lại sau): {m}", e.Message); }
            try { await Task.Delay(Nhip, ct); } catch (OperationCanceledException) { break; }
        }
    }

    private void MotLuot(DateTimeOffset now)
    {
        _so ??= QuanTriTrong.DocSo(File.Exists(QuanTriTrongMay.SoKiemFile) ? File.ReadAllText(QuanTriTrongMay.SoKiemFile) : null);
        var truocJson = QuanTriTrong.GhiSo(_so);
        var ds = QuanTriTrongMay.DocMay();
        var moi = QuanTriTrong.Tinh(ds, _so, QuanTriTrongMay.KiemTrong, now);
        var sauJson = QuanTriTrong.GhiSo(_so);
        if (sauJson != truocJson) LuuSo(sauJson);

        var cu = _rt.QuanTriTrong;
        _rt.QuanTriTrong = moi;
        if (cu == null || !cu.SequenceEqual(moi, StringComparer.Ordinal))
        {
            // tên tài khoản là dữ liệu máy Ba Mẹ — log cục bộ ghi số lượng, không ghi tên
            _log.LogInformation("Tài khoản quản trị chưa có mật khẩu: {n}", moi.Count);
            if (cu != null) _rt.RequestSyncSoon();   // đổi ⇒ báo máy chủ ngay (lượt đầu đi theo nhịp đồng bộ thường)
        }
    }

    private void LuuSo(string json)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            var tam = QuanTriTrongMay.SoKiemFile + ".tmp";
            File.WriteAllText(tam, json);
            File.Move(tam, QuanTriTrongMay.SoKiemFile, overwrite: true);
        }
        catch (Exception e) { _log.LogWarning("Không lưu được sổ kiểm tài khoản quản trị: {m}", e.Message); }
    }
}
