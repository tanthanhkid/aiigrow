using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Áp / gỡ luật AppLocker của AiiGrow bằng PowerShell (Set-AppLockerPolicy), bật AppIDSvc.</summary>
public sealed class AppLockerController
{
    private readonly ILogger<AppLockerController> _log;
    private string? _lastKey;
    private DateTimeOffset _nextTry = DateTimeOffset.MinValue;
    private int _docLoi;      // số lần đọc chính sách lỗi liên tiếp khi gỡ
    private bool _daBaoKhongSid;   // cảnh báo «không có tài khoản Con» một lần, không mỗi nhịp

    public AppLockerController(ILogger<AppLockerController> log) { _log = log; }

    public bool Applied { get; private set; }

    private bool? _khaDung;
    private bool? _khaDungTam;
    private long _khaDungTamDen;
    /// <summary>AppLocker dùng được trên máy này không (BUG-005: Windows Home không có). Đọc một lần, nhớ cả đời dịch vụ.</summary>
    public bool KhaDung
    {
        get
        {
            if (_khaDung is { } v) return v;
            // lần kiểm trước chưa chắc (PowerShell lỗi/chậm) ⇒ dùng tạm kết quả đó 10 phút, không chạy PowerShell (≤30 giây) hai lần mỗi nhịp (review #75)
            if (_khaDungTam is { } t && Environment.TickCount64 < _khaDungTamDen) return t;
            var ed = AppLockerKhaDung.DocEditionId();
            bool? cmdlet = null;
            if (!AppLockerKhaDung.LaBanHome(ed))
            {
                var r = Shell.PowerShell("if (Get-Command Get-AppLockerPolicy -ErrorAction SilentlyContinue) { 'co' } else { 'khong' }", 30000);
                if (r.Ok) cmdlet = !r.Output.Contains("khong");
            }
            var (kq, chac) = AppLockerKhaDung.Chot(ed, cmdlet);
            // chắc chắn (Home / có cmdlet) ⇒ nhớ suốt đời dịch vụ; chưa chắc ⇒ dùng tạm 10 phút, không chạy PowerShell (≤30 giây) hai lần mỗi nhịp;
            // «không thấy cmdlet» trên bản không phải Home ⇒ vẫn coi là dùng được để còn gỡ luật đã áp (review #75)
            if (chac) _khaDung = kq;
            else { _khaDungTam = kq; _khaDungTamDen = Environment.TickCount64 + 10 * 60 * 1000; }
            if (!kq) _log.LogWarning("Máy không có AppLocker (EditionID «{ed}») — tắt AppLocker, chặn bằng cách đóng app ngoài danh sách. {g}", ed ?? "?", AppLockerKhaDung.CauGhiChu);
            else if (!chac) _log.LogWarning("Chưa thấy cmdlet AppLocker (EditionID «{ed}», cmdlet {c}) — vẫn thử áp/gỡ, kiểm lại sau 10 phút", ed ?? "?", cmdlet);
            return kq;
        }
    }

    /// <summary>Đưa AppLocker về đúng trạng thái mong muốn. Trả true nếu luật AiiGrow đang có hiệu lực.</summary>
    public bool Reconcile(bool wantApply, IReadOnlyList<string> sids, IEnumerable<string> apps)
    {
        if (!KhaDung) { Applied = false; return false; }   // Win Home: không áp, không gỡ, không log mỗi nhịp
        var list = apps.Select(AppLockerXml.NormalizeExe).Where(a => a != null).Select(a => a!).OrderBy(a => a).ToList();
        var ds = sids.Where(AppLockerXml.IsValidSid).ToList();
        var want = wantApply && ds.Count > 0;
        if (ds.Count > 0) _daBaoKhongSid = false;
        if (wantApply && ds.Count == 0 && !_daBaoKhongSid)
        {
            _daBaoKhongSid = true;
            _log.LogWarning("Chặn thật: máy không có tài khoản Con nào (không có tài khoản không phải quản trị) — chưa áp được AppLocker");
        }
        var key = want ? string.Join(";", ds) + "|" + string.Join(",", list) : "off";
        if (key == _lastKey) return Applied;
        if (DateTimeOffset.UtcNow < _nextTry) return Applied;

        bool ok = want ? Apply(ds, list) : Remove();
        if (ok) { _lastKey = key; Applied = want; }
        else _nextTry = DateTimeOffset.UtcNow.AddSeconds(60);
        return Applied;
    }

    private string? ReadExisting() => ReadExisting(out _);

    /// <param name="loi">true = KHÔNG đọc được (PowerShell lỗi/hết giờ, không đọc được tệp) — khác với «đọc được, chưa có chính sách».</param>
    private string? ReadExisting(out bool loi)
    {
        loi = false;
        var tmp = Path.Combine(Paths.DataDir, "applocker-current.xml");
        var r = Shell.PowerShell("Get-AppLockerPolicy -Local -Xml | Out-File -Encoding utf8 -FilePath " + Shell.PsQuote(tmp));
        if (!r.Ok) { _log.LogWarning("Đọc AppLocker hiện tại lỗi: {e}", r.Error); loi = true; return null; }
        try { return File.ReadAllText(tmp); } catch { loi = true; return null; }
    }

    private bool Apply(List<string> sids, List<string> apps)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            // Đọc lỗi ⇒ chưa ghi (Merge(null) đè mất luật AppLocker sẵn có của quản trị), Reconcile thử lại sau 60 giây;
            // lỗi DocLoiToiDa lần liền ⇒ coi như máy chưa có chính sách, ghi như trước
            var cu = ReadExisting(out var loiDoc);
            _docLoi = loiDoc ? _docLoi + 1 : 0;
            if (loiDoc && _docLoi < AppLockerXml.DocLoiToiDa) return false;
            var xml = AppLockerXml.Merge(cu, new AppLockerOptions { ChildSids = sids, AllowedApps = apps });
            var file = Path.Combine(Paths.DataDir, "applocker-aii.xml");
            File.WriteAllText(file, xml, new System.Text.UTF8Encoding(false));
            var set = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(file));
            if (!set.Ok) { _log.LogError("Set-AppLockerPolicy lỗi: {e}", set.Error); return false; }
            EnsureAppIdSvc();
            _docLoi = 0;
            _log.LogInformation("Đã áp AppLocker cho {soTk} tài khoản với {n} app", sids.Count, apps.Count);
            return true;
        }
        catch (Exception e)
        {
            _log.LogError(e, "Áp AppLocker lỗi");
            return false;
        }
    }

    private bool Remove()
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            var existing = ReadExisting(out var loi);
            _docLoi = loi ? _docLoi + 1 : 0;
            switch (AppLockerXml.XetGo(loi, existing, _docLoi))
            {
                case AppLockerXml.BuocGo.ThuLai: return false;     // Reconcile hẹn thử lại sau 60 giây
                case AppLockerXml.BuocGo.Xong:
                    if (loi) _log.LogWarning("Đọc AppLocker lỗi {n} lần liền — coi như máy không có AppLocker, thôi gỡ", _docLoi);
                    _docLoi = 0;   // lần gỡ sau đếm lại từ đầu, không bỏ cuộc ngay ở lần đọc lỗi đầu tiên
                    return true;
            }
            var file = Path.Combine(Paths.DataDir, "applocker-aii.xml");
            File.WriteAllText(file, AppLockerXml.RemoveOurs(existing!), new System.Text.UTF8Encoding(false));
            var set = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(file));
            if (!set.Ok) { _log.LogError("Gỡ AppLocker lỗi: {e}", set.Error); return false; }
            _log.LogInformation("Đã gỡ luật AppLocker của AiiGrow");
            return true;
        }
        catch (Exception e)
        {
            _log.LogError(e, "Gỡ AppLocker lỗi");
            return false;
        }
    }

    private static void EnsureAppIdSvc()
    {
        Shell.PowerShell("try { Set-Service -Name AppIDSvc -StartupType Automatic } catch {}; try { Start-Service -Name AppIDSvc } catch {}", 60000);
    }
}
