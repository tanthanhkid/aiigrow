using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Mỗi 5 phút đọc lịch sử trình duyệt của Con và gửi TỔNG theo (ngày, tên miền) lên máy chủ (POST web/lich-su).
/// Chạy ở cả hai chế độ (Giám sát và Chặn thật) — ghi lịch sử không chặn gì cả. Lỗi mạng: lần sau gửi lại (tổng, không cộng đôi).</summary>
public sealed class WebHistoryWorker : BackgroundService
{
    public static readonly TimeSpan Nhip = TimeSpan.FromMinutes(5);
    private readonly ILogger<WebHistoryWorker> _log;
    private readonly ConfigStore _store = new();
    private readonly ChromiumHistorySource _src = new();
    private string? _daGui;   // dấu vân tay lần gửi thành công cuối: không đổi ⇒ khỏi gửi lại

    private readonly AgentRuntime? _rt;
    private bool _daNap;

    public WebHistoryWorker(ILogger<WebHistoryWorker> log, AgentRuntime? rt = null) { _log = log; _rt = rt; }

    private static string TepTab => Path.Combine(Paths.DataDir, "tab-xem.json");

    /// <summary>#771: sổ giây theo TÊN MIỀN giữ qua khởi động lại dịch vụ (máy chủ lấy giá trị lớn hơn nên mất sổ chỉ làm số hôm nay đứng chờ, không tăng ảo).
    /// Tiêu đề tab KHÔNG ghi đĩa — chỉ tên miền đã quy + số giây; tiêu đề chưa quy được nằm trong RAM.</summary>
    private void NapSo()
    {
        if (_daNap || _rt == null) return;
        _daNap = true;
        try
        {
            if (!File.Exists(TepTab)) return;
            var ds = System.Text.Json.JsonSerializer.Deserialize<List<DongTab>>(File.ReadAllText(TepTab)) ?? new();
            _rt.TabXem.Nap(ds.Select(d => new KeyValuePair<(string, string), double>((d.Ngay, d.TenMien), d.Giay)));
        }
        catch { /* tệp hỏng: bắt đầu lại sổ */ }
    }

    private string? _daLuu;

    private void LuuSo(IReadOnlyDictionary<(string Ngay, string Mien), double> snap)
    {
        try
        {
            var noiDung = System.Text.Json.JsonSerializer.Serialize(snap.Select(kv => new DongTab(kv.Key.Ngay, kv.Key.Mien, kv.Value)).ToList());
            if (noiDung == _daLuu) return;   // không đổi ⇒ khỏi ghi đĩa
            _daLuu = noiDung;
            Directory.CreateDirectory(Paths.DataDir);
            File.WriteAllText(TepTab, noiDung);
        }
        catch { }
    }

    private sealed record DongTab(string Ngay, string TenMien, double Giay);

    public async Task MotLuot(CancellationToken ct)
    {
        var cfg = _store.Load();
        if (cfg is not { Paired: true }) return;
        var hoSo = ChromiumHistorySource.HoSoCanDoc(cfg);
        if (hoSo.Count == 0) return;
        string? host = null;
        try { host = new Uri(ApiClient.NormalizeServer(cfg.Server)).Host; } catch { }
        var tz = PolicyParser.TryParse(cfg.LastPolicyJson, out var pol) ? pol?.Tz : null;   // #703
        NgayGiaDinh.DangKy(tz, pol?.TzPhut);
        var visits = _src.Doc(hoSo, WebHistory.MocDoc(DateTimeOffset.Now));
        Dictionary<(string Ngay, string Mien), double>? giayTab = null;
        HashSet<string>? ngayTheoDoi = null;
        if (_rt != null)
        {
            NapSo();
            _rt.TabXem.DonCu(NgayGiaDinh.Cua(DateTimeOffset.Now.AddDays(-3), tz));
            _rt.TabXem.Chot(visits);
            giayTab = _rt.TabXem.GiayTheoMien();
            ngayTheoDoi = _rt.TabXem.NgayDaGhi();
            LuuSo(giayTab);
        }
        var ds = WebHistory.TongHop(visits, host is null ? null : WebDomain.GocTuHost(host), tz, giayTab, ngayTheoDoi);
        if (ds.Count == 0) return;
        var vt = string.Join("\n", ds.Select(x => $"{x.Ngay}|{x.TenMien}|{x.SoLan}|{x.Giay}"));
        if (vt == _daGui) return;
        using var c = new WebHistoryClient(cfg.Server, cfg.Token);
        foreach (var lo in ds.Chunk(400)) await c.GuiAsync(lo, ct);
        _daGui = vt;
        _log.LogInformation("Đã gửi lịch sử web: {n} dòng (tên miền × ngày)", ds.Count);
    }
}
