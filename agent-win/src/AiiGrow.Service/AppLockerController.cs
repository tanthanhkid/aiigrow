using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Áp / gỡ luật AppLocker của AiiGrow bằng PowerShell (Set-AppLockerPolicy), bật AppIDSvc.</summary>
public sealed class AppLockerController
{
    private readonly ILogger<AppLockerController> _log;
    private string? _lastKey;
    private DateTimeOffset _nextTry = DateTimeOffset.MinValue;
    private int _docLoi;      // số lần đọc chính sách lỗi liên tiếp khi gỡ

    public AppLockerController(ILogger<AppLockerController> log) { _log = log; }

    public bool Applied { get; private set; }

    /// <summary>Đưa AppLocker về đúng trạng thái mong muốn. Trả true nếu luật AiiGrow đang có hiệu lực.</summary>
    public bool Reconcile(bool wantApply, string childSid, IEnumerable<string> apps)
    {
        var list = apps.Select(AppLockerXml.NormalizeExe).Where(a => a != null).Select(a => a!).OrderBy(a => a).ToList();
        var want = wantApply && AppLockerXml.IsValidSid(childSid);
        var key = want ? childSid + "|" + string.Join(",", list) : "off";
        if (key == _lastKey) return Applied;
        if (DateTimeOffset.UtcNow < _nextTry) return Applied;

        bool ok = want ? Apply(childSid, list) : Remove();
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

    private bool Apply(string sid, List<string> apps)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            var xml = AppLockerXml.Merge(ReadExisting(), new AppLockerOptions { ChildSid = sid, AllowedApps = apps });
            var file = Path.Combine(Paths.DataDir, "applocker-aii.xml");
            File.WriteAllText(file, xml, new System.Text.UTF8Encoding(false));
            var set = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(file));
            if (!set.Ok) { _log.LogError("Set-AppLockerPolicy lỗi: {e}", set.Error); return false; }
            EnsureAppIdSvc();
            _log.LogInformation("Đã áp AppLocker cho SID {sid} với {n} app", sid, apps.Count);
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
