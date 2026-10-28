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
    /// <param name="trinhDuyet">«Chặn theo lọc»: SID → trình duyệt được chạy (TrinhDuyetLoc) — chỉ những SID luật web đang áp.</param>
    /// <param name="chan">25/10: app Ba Mẹ đặt «Chặn» (Policy.BlockedApps) — có ⇒ thêm luật Deny cho SID Con ở MỌI mode (kể cả khi không «chỉ app học»).</param>
    public bool Reconcile(bool wantApply, IReadOnlyList<string> sids, IEnumerable<string> apps, IReadOnlyDictionary<string, IReadOnlyList<string>>? trinhDuyet = null,
        IReadOnlyList<AppBiChan>? chan = null)
    {
        if (!KhaDung) { Applied = false; return false; }   // Win Home: không áp, không gỡ, không log mỗi nhịp
        // 28/10: lần đầu sau khi dịch vụ khởi động (vd ngay sau khi tự cập nhật) — chữa máy bản cũ để lại Exe bật + Appx rỗng (Start đơ),
        // TRƯỚC khi áp/gỡ (áp/gỡ của bản này cũng tự sửa, nhưng khi đó không còn biết máy từng hỏng để báo «da-sua-appx»)
        if (!_daKiemAppx) _daKiemAppx = KiemSuaAppx("khởi động") != null;
        var list = apps.Select(AppLockerXml.NormalizeExe).Where(a => a != null).Select(a => a!).OrderBy(a => a).ToList();
        var ds = sids.Where(AppLockerXml.IsValidSid).ToList();
        var luatChan = chan is { Count: > 0 } ? ChanAppThat.LuatAppLocker(chan, Environment.GetFolderPath(Environment.SpecialFolder.Windows), ProcessGuard.DefaultSafeDirs(), BamAppLocker) : new List<LuatChanApp>();
        var want = (wantApply || luatChan.Count > 0) && ds.Count > 0;
        if (ds.Count > 0) _daBaoKhongSid = false;
        if (wantApply && ds.Count == 0 && !_daBaoKhongSid)
        {
            _daBaoKhongSid = true;
            _log.LogWarning("Chặn thật: máy không có tài khoản Con nào (không có tài khoản không phải quản trị) — chưa áp được AppLocker");
        }
        var td = want && trinhDuyet != null
            ? ds.Where(trinhDuyet.ContainsKey).ToDictionary(s => s, s => (IReadOnlyList<string>)trinhDuyet[s].OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList(), StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase);
        var key = want ? string.Join(";", ds) + "|" + (wantApply ? string.Join(",", list) : "-") + "|" + ChanAppThat.VanTay(luatChan) + "|" + string.Join(";", td.OrderBy(x => x.Key).Select(x => x.Key + "=" + string.Join(",", x.Value))) : "off";
        if (key == _lastKey) return Applied;
        if (DateTimeOffset.UtcNow < _nextTry) return Applied;

        bool ok = want ? Apply(ds, list, td, wantApply, luatChan) : Remove();
        if (ok && want) KiemSuaAppx("áp Chặn thật");   // kiểm lại chính sách thật sau khi áp: Exe bật thì Appx phải có luật cho phép
        if (ok) { _lastKey = key; Applied = want; }
        else _nextTry = DateTimeOffset.UtcNow.AddSeconds(60);
        return Applied;
    }

    private bool _daKiemAppx;

    /// <summary>Đọc chính sách AppLocker thật; Exe bật mà Appx rỗng ⇒ gộp luật Appx mặc định (Set-AppLockerPolicy -Merge), khởi động lại tiến trình
    /// Start / Search để Windows nạp lại, ghi log «da-sua-appx» + sự kiện da_sua_appx lên máy chủ. Trả null khi đọc lỗi (thử lại ở nhịp sau),
    /// false khi chính sách ổn, true khi vừa sửa.</summary>
    private bool? KiemSuaAppx(string luc)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            var cu = ReadExisting(out var loi);
            if (loi) return null;
            if (!AppLockerXml.ThieuAppx(cu)) return false;
            var file = Path.Combine(Paths.DataDir, "applocker-appx.xml");
            File.WriteAllText(file, AppLockerXml.SuaAppx(cu!), new System.Text.UTF8Encoding(false));
            var set = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(file));
            if (!set.Ok) { _log.LogError("da-sua-appx LỖI: không ghi được luật Appx ({luc}): {e}", luc, set.Error); return null; }
            var n = KhoiDongLaiShell();
            _log.LogWarning("da-sua-appx: AppLocker chặn Exe mà thiếu luật Appx (Start/Search của Windows bị chặn) — đã thêm luật cho mọi gói có chữ ký ({luc}), khởi động lại {n} tiến trình Start/Search", luc, n);
            try
            {
                new ConfigStore().Update(c => c.Queue.Add(new SuKien
                {
                    Loai = "da_sua_appx",
                    ChiTiet = new() { ["may"] = Environment.MachineName, ["luc"] = luc, ["ban"] = TuCapNhat.BanHienTai().ToString(3) },
                }));
            }
            catch (Exception e) { _log.LogDebug("Ghi sự kiện da_sua_appx lỗi: {e}", e.Message); }
            return true;
        }
        catch (Exception e)
        {
            _log.LogError(e, "da-sua-appx LỖI ({luc})", luc);
            return null;
        }
    }

    /// <summary>Đóng tiến trình shell dạng gói ở mọi phiên — Windows tự mở lại ngay, lần này qua luật Appx mới. Không đụng explorer.</summary>
    private static int KhoiDongLaiShell()
    {
        var n = 0;
        foreach (var ten in new[] { "StartMenuExperienceHost", "SearchHost", "SearchApp", "ShellExperienceHost", "TextInputHost" })
            foreach (var p in System.Diagnostics.Process.GetProcessesByName(ten))
            {
                try { p.Kill(); n++; } catch { }
                finally { p.Dispose(); }
            }
        return n;
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

    private bool Apply(List<string> sids, List<string> apps, IReadOnlyDictionary<string, IReadOnlyList<string>> trinhDuyet, bool hoc = true, List<LuatChanApp>? chan = null)
    {
        try
        {
            Directory.CreateDirectory(Paths.DataDir);
            // Đọc lỗi ⇒ chưa ghi (Merge(null) đè mất luật AppLocker sẵn có của quản trị), Reconcile thử lại sau 60 giây;
            // lỗi DocLoiToiDa lần liền ⇒ coi như máy chưa có chính sách, ghi như trước
            var cu = ReadExisting(out var loiDoc);
            _docLoi = loiDoc ? _docLoi + 1 : 0;
            if (loiDoc && _docLoi < AppLockerXml.DocLoiToiDa) return false;
            var opt = new AppLockerOptions { ChildSids = sids, AllowedApps = apps, TrinhDuyetTheoSid = trinhDuyet };
            var xml = chan is { Count: > 0 } ? AppLockerXml.MergeChanApp(cu, sids, chan, hoc ? opt : null) : AppLockerXml.Merge(cu, opt);
            var file = Path.Combine(Paths.DataDir, "applocker-aii.xml");
            File.WriteAllText(file, xml, new System.Text.UTF8Encoding(false));
            var set = Shell.PowerShell("Set-AppLockerPolicy -XmlPolicy " + Shell.PsQuote(file));
            if (!set.Ok) { _log.LogError("Set-AppLockerPolicy lỗi: {e}", set.Error); return false; }
            EnsureAppIdSvc();
            _docLoi = 0;
            _log.LogInformation("Đã áp AppLocker cho {soTk} tài khoản với {n} app; trình duyệt (web lọc) cho {td} tài khoản{chan}", sids.Count, hoc ? apps.Count : 0, trinhDuyet.Count, chan is { Count: > 0 } ? $", {chan.Count} luật chặn app" : "");
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

    private readonly Dictionary<string, (long Len, DateTime Mtime, (string, long, string)? Kq, long HetLuc)> _bamAl = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _dangBamAl = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Băm AppLocker của tệp (Get-AppLockerFileInformation ⇒ New-AppLockerPolicy -RuleType Hash: băm Authenticode SHA256 mà AppLocker so,
    /// KHÔNG phải SHA-256 phẳng của tệp). Chưa có ⇒ đọc ở luồng nền (PowerShell vài giây/tệp không chặn vòng thực thi — review #126), trả null lần này:
    /// luật đường dẫn áp ngay, luật băm thêm ở nhịp sau (vân tay luật đổi ⇒ ghi lại). Lỗi ⇒ thử lại sau 10 phút. Tệp không có ⇒ null.</summary>
    private (string Data, long Length, string SourceFile)? BamAppLocker(string path)
    {
        var fi = new FileInfo(path);
        if (!fi.Exists) return null;
        lock (_bamAl)
        {
            if (_bamAl.TryGetValue(path, out var c) && c.Len == fi.Length && c.Mtime == fi.LastWriteTimeUtc && (c.Kq != null || Environment.TickCount64 < c.HetLuc))
                return c.Kq;
            if (!_dangBamAl.Add(path)) return null;
        }
        Task.Run(() =>
        {
            (string, long, string)? kq = null;
            try
            {
                var r = Shell.PowerShell("Get-AppLockerFileInformation -Path " + Shell.PsQuote(path) + " | New-AppLockerPolicy -RuleType Hash -User Everyone -Xml", 60000);
                if (r.Ok)
                {
                    var fh = System.Xml.Linq.XDocument.Parse(r.Output.Trim()).Descendants("FileHash").FirstOrDefault();
                    if (fh != null && long.TryParse((string?)fh.Attribute("SourceFileLength"), out var len))
                        kq = ((string?)fh.Attribute("Data") ?? "", len, (string?)fh.Attribute("SourceFileName") ?? Path.GetFileName(path));
                }
                else _log.LogDebug("Đọc băm AppLocker của {p} lỗi: {e}", path, r.Error);
            }
            catch (Exception e) { _log.LogDebug("Đọc băm AppLocker của {p} lỗi: {e}", path, e.Message); }
            finally
            {
                lock (_bamAl)
                {
                    _bamAl[path] = (fi.Length, fi.LastWriteTimeUtc, kq, Environment.TickCount64 + 10 * 60 * 1000);
                    _dangBamAl.Remove(path);
                }
            }
        });
        return null;
    }

    private static void EnsureAppIdSvc()
    {
        Shell.PowerShell("try { Set-Service -Name AppIDSvc -StartupType Automatic } catch {}; try { Start-Service -Name AppIDSvc } catch {}", 60000);
    }
}
