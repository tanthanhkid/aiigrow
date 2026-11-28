using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Trạng thái dùng chung giữa vòng sync và máy chủ named pipe.</summary>
public sealed class AgentRuntime
{
    private readonly object _gate = new();
    private readonly SemaphoreSlim _wake = new(0);
    private DateTime _cfgStamp = DateTime.MinValue;
    private bool _forceSync;

    private Policy? _policy;
    /// <summary>#302: lúc phút chơi tại máy chạm 0 vì giới hạn (chốt một lần cho mỗi Policy) — giờ «chơi tiếp lúc» không trôi theo mỗi lần dựng trạng thái.</summary>
    private (Policy Of, DateTimeOffset Luc)? _ghHetLuc;
    private DateTimeOffset _policyAt = DateTimeOffset.UtcNow;
    private double _usedSeconds;
    private bool _offline;
    private DateTimeOffset? _offlineSince;
    private DateTimeOffset? _lastSyncAt;
    private string? _fgId;
    private string? _fgName;
    /// <summary>#690: id khay báo TRƯỚC khi quy bí danh về muc chính (tên exe đang chạy thật — TienCanhChoi kiểm «đang chạy»).</summary>
    private string? _fgIdGoc;
    private DateTimeOffset _fgAt = DateTimeOffset.MinValue;
    private int _blockedSeq;
    private string? _blockedId;
    private string? _blockedName;
    private DateTimeOffset? _lockStartedAt;
    private int _lockGraceSec = 60;
    /// <summary>0.2.4: phút chơi khi mất mạng chưa gửi bù (bản trong bộ nhớ; ghi đĩa ở Config.PhienOffline).</summary>
    private PhienOffline? _phienOffline;
    /// <summary>#337: đoạn chơi offline của bé khác chờ gửi bù (ghi đĩa ở Config.PhienOfflineCho).</summary>
    private List<PhienOffline> _phienCho = new();
    /// <summary>0.2.4: giây chơi thật (lúc có mạng) chưa báo máy chủ — status.playSeconds; trừ đi phần đã gửi khi đồng bộ thành công.</summary>
    private double _playSec;
    private string? _playSecId;
    /// <summary>0.2.4 (P2-5): giây đã chơi phiên của Policy đang giữ (có mạng + offline) — về 0 khi có Policy mới.</summary>
    private DaChoiTheoPolicy _daChoi = new();
    /// <summary>15/11: giây Con đã chơi app «Tính phút» (Policy.AppTinhGio) tại máy kể từ Policy đang giữ — QuyTaiCho trừ vào sao (cả lúc mất mạng).</summary>
    private double _quyGiay;
    private double _quyChoGhi;
    /// <summary>15/11 (PR #277): bé mà Policy đang giữ thuộc về (bé đang dùng lúc đồng bộ; null = máy riêng / chưa biết) — <see cref="_quyGiay"/> là của bé này.</summary>
    private string? _policyBe;
    /// <summary>Máy chung: bé KHÁC vào máy sau lượt đồng bộ (thường lúc mất mạng) — giây «Tính phút» đếm riêng theo bé, số dư lấy từ ho-so (không dùng sổ bé trước).</summary>
    private Dictionary<string, double> _giayBe = new();
    /// <summary>#337: giây dùng máy (trừ app học) theo bé KHÁC bé của Policy — MinutesLeft của gói luật bé đó không trừ phần bé trước đã dùng.</summary>
    private Dictionary<string, double> _usedBe = new();
    /// <summary>#337: gói luật đã đọc theo bé (khoá = id bé; so Raw để biết gói mới).</summary>
    private readonly Dictionary<string, (string Raw, Policy? P)> _goiDoc = new();
    /// <summary>15/11: giây chơi app «Tính phút» lúc máy mở bằng mã offline của Ba Mẹ (không trừ sao) chưa báo máy chủ, THEO BÉ (khoá rỗng = không rõ) — dong-bo `boiMaCon`.</summary>
    private Dictionary<string, double> _boiMaGiay = new();
    private Dictionary<string, double> _boiMaHomNay = new();
    private DateTime _boiMaNgay;

    public ConfigStore Store { get; } = new();
    public AgentConfig? Config { get; private set; }
    public UsageTracker Usage { get; } = new();
    public bool AppLockerApplied { get; set; }
    /// <summary>BUG-005: AppLocker dùng được trên máy này (false = Windows Home ⇒ chỉ chặn bằng cách đóng app). Worker đặt mỗi vòng.</summary>
    public volatile bool AppLockerKhaDung = true;
    /// <summary>Trình duyệt có danh sách web cả máy của IT (WebGuardWorker) ⇒ luật web AiiGrow không có hiệu lực ở đó — báo Ba Mẹ.</summary>
    public volatile string? GhiChuWeb;
    /// <summary>0.2.6: SID tài khoản Con (AgentWorker tính mỗi vòng; null = chưa đọc được) — WebGuardWorker ghi luật web vào hive những SID này.</summary>
    public volatile IReadOnlyList<string>? ChildSids;
    /// <summary>0.2.6: danh sách tài khoản Windows của máy (AgentWorker đọc mỗi ~2 phút; null = chưa đọc được) — khay hỏi «phiên này có phải của Con không».</summary>
    public volatile IReadOnlyList<LocalAccount>? TaiKhoanMay;
    private int _webRev;
    /// <summary>0.2.6: tăng khi luật web trong hive của Con đổi/gỡ — khay thấy đổi thì làm mới chính sách trình duyệt trong phiên Con.</summary>
    public int WebRev => Volatile.Read(ref _webRev);
    public void WebDaDoi() => Interlocked.Increment(ref _webRev);
    /// <summary>#822: danh sách web chặn / cho phép luật đang áp (WebGuardWorker đặt mỗi vòng; null = không áp luật web) — khay báo bé khi Ba Mẹ thêm web.</summary>
    public volatile IReadOnlyList<string>? WebChanDangAp, WebChoDangAp;
    /// <summary>#741: luật web đang áp là «Theo danh sách» (chi_cho_phep: trình duyệt chặn «*» trừ WebCho + máy chủ) và tên máy chủ AiiGrow được cho.</summary>
    public volatile bool WebChiChoPhepDangAp;
    public volatile string? WebMayChuDangAp;
    public int ChildSessionId { get; set; } = -1;
    /// <summary>16/11 (#307): mục → tên hiển thị theo lần quét danh sách app gần nhất (DanhSachAppWorker) — khay hiện «Từ điển», không «Tudien».</summary>
    public volatile IReadOnlyDictionary<string, string>? TenAppMay;
    /// <summary>Muc → mọi muc cùng app đã gộp (#630): luật chặn áp lên tất cả.</summary>
    public volatile IReadOnlyDictionary<string, string[]>? BiDanhMuc;
    /// <summary>#690: muc bí danh → muc chính (muc máy chủ biết) — phút của app mở bằng exe bí danh tính đúng app Ba Mẹ đã xếp.</summary>
    public volatile IReadOnlyDictionary<string, string>? MucChinh;

    /// <summary>#690: đặt bí danh từ nhóm muc (lượt quét app hoặc cấu hình đã lưu).</summary>
    public void DatNhomMuc(IReadOnlyList<List<string>>? nhom)
    {
        BiDanhMuc = DanhSachApp.BangBiDanh(nhom);
        MucChinh = DanhSachApp.BangMucChinh(nhom);
    }

    /// <summary>#695: gói Store cài ngoài WindowsApps ([muc gói, thư mục cài, exe…]) — Cho phép / Chặn theo thư mục cài.</summary>
    public volatile IReadOnlyList<IReadOnlyList<string>>? GoiNgoai;
    /// <summary>#695: exe của gói ngoài WindowsApps → muc gói (khay chỉ báo tên exe ở tiền cảnh).</summary>
    public volatile IReadOnlyDictionary<string, string>? ExeGoi;

    public void DatGoiNgoai(IReadOnlyList<List<string>>? goi)
    {
        GoiNgoai = goi?.Select(g => (IReadOnlyList<string>)g.ToList()).ToList();
        ExeGoi = GoiNgoaiWindowsApps.ExeVeGoi(goi);
    }

    /// <summary>#693: tên exe app đã cài ở chỗ khác Desktop / Downloads (null = chưa quét lần nào — mọi exe ở chỗ thả tệp không được nhận theo tên).</summary>
    public volatile ISet<string>? TenDaCai;
    /// <summary>#727: thư mục cài đã quét (null = chưa quét lần nào ⇒ chưa chặn theo chỗ thả tệp).</summary>
    public volatile IReadOnlyList<string>? ThuMucDaCai;
    public volatile IReadOnlyList<string>? ThuMucTheoTen;
    /// <summary>#422: app đã cài theo lần quét gần nhất (mục + tên) — lưới «App trên máy» của hộp «Xin thêm app / web» (PipeCmd.AppMay). null = chưa quét.</summary>
    public volatile IReadOnlyList<AppTrenMay>? AppMay;
    /// <summary>05/11 (L11): bài nộp lúc mất mạng đang chờ gửi (BaiChoMang, mỗi bài một tệp). PipeServer / AgentWorker cập nhật số đếm.</summary>
    public BaiChoMang BaiCho { get; } = new(BaiChoMang.ThuMucMacDinh);
    public volatile int SoBaiCho = -1;

    private int DemBaiCho() { try { return BaiCho.Dem(); } catch { return 0; } }

    private (IReadOnlyDictionary<string, IReadOnlyList<string>> Ds, long Tick) _trinhDuyet = (new Dictionary<string, IReadOnlyList<string>>(), long.MinValue);
    /// <summary>Kết quả hơn 3 phút không được WebGuardWorker làm mới (worker kẹt) ⇒ coi như chưa lọc được: thôi thả trình duyệt (an toàn trước).</summary>
    public const long TrinhDuyetHetHanMs = 3 * 60 * 1000;

    /// <summary>«Chặn theo lọc» (WebGuardWorker, mỗi vòng 30 giây): SID Con → trình duyệt được chạy vì luật web đang áp trong hive của SID đó.</summary>
    public void DatTrinhDuyetLoc(IReadOnlyDictionary<string, IReadOnlyList<string>> ds)
    {
        lock (_gate) _trinhDuyet = (ds, Environment.TickCount64);
    }

    /// <summary>Trình duyệt được chạy theo SID ở Chặn thật (TrinhDuyetLoc). Rỗng khi: kết quả cũ quá hạn, hoặc phiên chơi WEB đã hết phút chơi
    /// khi mất mạng (như trước: trình duyệt bị thu lại tới khi có mạng — trang của phiên còn trong danh sách «cho» tới lần đồng bộ sau).</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<string>> TrinhDuyetLoc()
    {
        lock (_gate)
        {
            var rong = new Dictionary<string, IReadOnlyList<string>>();
            if (_trinhDuyet.Tick == long.MinValue || Environment.TickCount64 - _trinhDuyet.Tick > TrinhDuyetHetHanMs) return rong;
            if (_policy is { PlayWeb: true, PlaySessionId: { } id } && _phienOffline is { HetHan: true } d && d.PhienId == id) return rong;
            return _trinhDuyet.Ds;
        }
    }

    public void LoadConfig()
    {
        lock (_gate)
        {
            Config = Store.Load();
            _cfgStamp = Store.LastWriteUtc;
            // #690: bí danh của lần quét trước — có ngay sau khởi động lại (lượt quét đầu chỉ chạy sau 40 giây – 3 phút)
            if (BiDanhMuc == null && Config?.NhomMucApp is { Count: > 0 } nhom) DatNhomMuc(nhom);
            if (TenDaCai == null && Config?.TenExeDaCai is { } tdc) TenDaCai = new HashSet<string>(tdc, StringComparer.OrdinalIgnoreCase);
            if (ThuMucDaCai == null && Config?.ThuMucDaCai is { } tmc) ThuMucDaCai = tmc.ToArray();
            if (ThuMucTheoTen == null && Config?.ThuMucTheoTen is { } ttt) ThuMucTheoTen = ttt.ToArray();
            if (GoiNgoai == null && Config?.GoiNgoaiApp is { } gn) DatGoiNgoai(gn);
            // Máy mồ côi (token bị từ chối quá MoCoi.Nguong) ⇒ KHÔNG nạp lại Policy cuối (không áp luật cũ sau khởi động lại).
            // LastPolicyJson là CẢ phản hồi dong-bo ⇒ lấy phần `windows` (LayWindows nhận cả dạng phẳng cũ) — không thì mất mạng + khởi động lại nạp «tự do» rỗng.
            if (_policy == null && !MoCoi.La(Config, DateTimeOffset.UtcNow) && PolicyParser.TryParse(Config?.LastPolicyJson ?? "", out var p) && p != null)
            {
                p.CheDo = DangNhapView.CheDoMayChung(p.CheDo, Config?.LastPolicyJson);
                _policy = p;
                NgayGiaDinh.DangKy(p.Tz, p.TzPhut);
                Usage.Tz = p.Tz;   // #703
                _policyAt = Config?.LastPolicyAt ?? DateTimeOffset.UtcNow;
            }
            _cheDo = AiiGrow.Core.CheDoHieuLuc.Chon(_policy?.CheDo, Config?.CheDo, MoCoi.La(Config, DateTimeOffset.UtcNow));
            // quỹ đã đếm cho đúng Policy đang giữ (dịch vụ khởi động lại lúc mất mạng vẫn trừ đúng)
            if (Config?.QuyDem is { } qd)
            {
                if (_policy != null && qd.PolicyAt == _policyAt)
                {
                    if (qd.Giay > _quyGiay) _quyGiay = qd.Giay;
                    _policyBe ??= qd.PolicyBe;
                    foreach (var (k, v) in qd.GiayBe) if (!_giayBe.TryGetValue(k, out var c0) || v > c0) _giayBe[k] = v;
                }
                // phút mở bằng mã chưa báo: giữ qua khởi động lại (không gắn với Policy — có mạng lại mới gửi)
                foreach (var (k, v) in qd.BoiMa) if (!_boiMaGiay.TryGetValue(k, out var c1) || v > c1) _boiMaGiay[k] = v;
                if (qd.BoiMaNgay != default && (_boiMaNgay == default || qd.BoiMaNgay == _boiMaNgay))
                {
                    _boiMaNgay = qd.BoiMaNgay;
                    foreach (var (k, v) in qd.BoiMaHomNay) if (!_boiMaHomNay.TryGetValue(k, out var c2) || v > c2) _boiMaHomNay[k] = v;
                }
            }
            // nạp lại khi worker khác ghi cấu hình: bản trong bộ nhớ có thể mới hơn bản trên đĩa (đĩa ghi 30 giây/lần)
            _phienOffline = PhienOffline.Chon(_phienOffline, Config?.PhienOffline);
            if (_phienCho.Count == 0 && Config?.PhienOfflineCho is { Count: > 0 } pc) _phienCho = pc.Select(x => x.Sao()).ToList();
            if (Config?.DaChoi is { } dc && (dc.PhienId != _daChoi.PhienId || dc.Giay > _daChoi.Giay)
                && (_daChoi.PhienId.Length == 0 || dc.PhienId == _daChoi.PhienId))
                _daChoi = new DaChoiTheoPolicy { PhienId = dc.PhienId, Giay = dc.Giay };
        }
    }

    public void ReloadIfChanged()
    {
        if (Store.LastWriteUtc != _cfgStamp) LoadConfig();
    }

    public bool TokenInvalid { get; set; }

    /// <summary>Đang thực thi lệnh gỡ từ xa ⇒ vòng thực thi đứng yên (không áp lại AppLocker trong lúc gỡ).</summary>
    public volatile bool DangGo;

    private string _cheDo = CheDoAgent.GiamSat;
    /// <summary>Chế độ đang áp (lần tính gần nhất ở <see cref="TinhCheDo"/>).</summary>
    public string CheDoHieuLuc { get { lock (_gate) return _cheDo; } }

    /// <summary>Máy chủ (Ba Mẹ chọn) thắng cấu hình cục bộ; mồ côi ⇒ giám sát. Gọi mỗi vòng thực thi.</summary>
    public string TinhCheDo(DateTimeOffset now)
    {
        lock (_gate)
        {
            _cheDo = AiiGrow.Core.CheDoHieuLuc.Chon(_policy?.CheDo, Config?.CheDo, MoCoi.La(Config, now));
            return _cheDo;
        }
    }

    /// <summary>Máy chủ từ chối token (401/403). Lưu mốc lần đầu; quá ngưỡng ⇒ fail-open (bỏ Policy cuối, về giám sát).</summary>
    public void GhiTuChoi(DateTimeOffset now)
    {
        lock (_gate)
        {
            TokenInvalid = true;
            AgentConfig? moi = null;
            try { moi = Store.UpdateIf(c => MoCoi.GhiTuChoi(c, now)); } catch { }
            if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
            else if (Config != null) MoCoi.GhiTuChoi(Config, now);
            BoPolicyNeuMoCoi(now);
        }
    }

    private long? _tickTruoc;
    private double _chayChoGhi;

    /// <summary>Gọi MỖI vòng thực thi với <see cref="Environment.TickCount64"/>: cộng thời gian chạy (đồng hồ đơn điệu, trần
    /// <see cref="MoCoi.TranMoiVongGiay"/>/vòng) vào bộ đếm mất liên lạc — fail-open 14 ngày cần cả bộ đếm này, không chỉ đồng hồ thật.
    /// Giữ trong bộ nhớ, ghi đĩa ~5 phút/lần (mất tối đa vài phút khi tắt máy đột ngột ⇒ chỉ làm fail-open muộn hơn, không sớm hơn).</summary>
    public void GhiNhipChay(long tickMs)
    {
        lock (_gate)
        {
            var truoc = _tickTruoc;
            _tickTruoc = tickMs;
            if (truoc == null || Config == null) return;
            double giay = (tickMs - truoc.Value) / 1000.0;
            if (!(giay > 0)) return;
            giay = Math.Min(giay, MoCoi.TranMoiVongGiay);
            MoCoi.CongChay(Config, giay);
            _chayChoGhi += giay;
            if (_chayChoGhi < 300) return;
            var cho = _chayChoGhi;
            _chayChoGhi = 0;
            AgentConfig? moi = null;
            try { moi = Store.Update(c => c.MatLienLacChayGiay += cho); } catch { }
            if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
        }
    }

    /// <summary>Kiểm mồ côi (kể cả khi chỉ HeartbeatWorker ghi mốc). → true nếu đang mồ côi.</summary>
    public bool KiemMoCoi(DateTimeOffset now)
    {
        lock (_gate)
        {
            if (!MoCoi.La(Config, now)) return false;
            if (Config!.LastPolicyJson != null || Config.CheDo != CheDoAgent.GiamSat)
            {
                AgentConfig? moi = null;
                try { moi = Store.UpdateIf(c => MoCoi.ApDung(c, now)); } catch { }
                if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
                else MoCoi.ApDung(Config, now);
            }
            BoPolicyNeuMoCoi(now);
            return true;
        }
    }

    private void BoPolicyNeuMoCoi(DateTimeOffset now)
    {
        if (!MoCoi.La(Config, now)) return;
        _policy = null;          // không áp Policy cuối nữa: không khoá giờ ngủ, không allowlist cũ
        _usedSeconds = 0;
        _lockStartedAt = null;
    }

    /// <summary>Đổi khi phần dong-bo ẢNH HƯỞNG số phút đổi điểm đổi (bật/tắt đổi điểm, mục Giải trí, chế độ, cửa sổ mở, phiên chơi) — PipeServer bỏ số
    /// phút PlayInfo đã nhớ. KHÔNG so cả JSON thô: serverTime đổi mỗi lần đồng bộ ⇒ bộ nhớ đệm vô dụng (review #75).</summary>
    public int PolicyRev { get; private set; }

    private DateTimeOffset? _syncCuoi;
    private int _nhipSyncSec = 300;
    private SyncResult? _syncCoLenhGo;

    /// <summary>#558: AgentWorker vừa đồng bộ xong trong vòng 1,5 nhịp ⇒ HeartbeatWorker bỏ lượt dong-bo của mình (trước đây hai vòng cùng gọi ⇒ gấp đôi tải máy chủ).</summary>
    public bool VuaDongBo(DateTimeOffset nowUtc)
    {
        lock (_gate) return _syncCuoi is { } t && (nowUtc - t).TotalSeconds < Math.Clamp(_nhipSyncSec, 15, 900) * 1.5;
    }

    /// <summary>Lấy (và xoá) kết quả đồng bộ có lệnh «go» mà AgentWorker nhận được.</summary>
    public SyncResult? LayLenhGoCho()
    {
        lock (_gate) { var r = _syncCoLenhGo; _syncCoLenhGo = null; return r; }
    }
    private string? _vtDoiDiem;

    private static string VanTayDoiDiem(Policy p) =>
        string.Join("|", p.CanExchangePoints, p.Mode, p.GrantEndsAt?.ToUnixTimeSeconds(), p.PlaySessionId, string.Join(",", p.PlayChoices));

    public void SetPolicy(Policy p, string raw)
    {
        // 06/11 (L13): «giam-sat» của máy chung chưa có bé ⇒ vẫn chặn (màn chọn tên); chỉ lệnh gỡ mới thả
        p.CheDo = DangNhapView.CheDoMayChung(p.CheDo, raw);
        lock (_gate)
        {
            var vtDoiDiem = VanTayDoiDiem(p);
            if (!string.Equals(vtDoiDiem, _vtDoiDiem, StringComparison.Ordinal)) { _vtDoiDiem = vtDoiDiem; PolicyRev++; }
            _policy = p;
            NgayGiaDinh.DangKy(p.Tz, p.TzPhut);
            Usage.Tz = p.Tz;   // #703: ngày dùng theo múi giờ gia đình
            _policyAt = DateTimeOffset.UtcNow;
            _syncCuoi = _policyAt;
            _nhipSyncSec = p.NextCheckSec;
            // #558: lệnh «go» trong lượt đồng bộ của AgentWorker để HeartbeatWorker thực thi, khỏi gọi dong-bo lần hai.
            var sr = SyncResult.Parse(raw);
            _syncCoLenhGo = sr.LenhGo != null ? sr : null;   // lượt đồng bộ mới không còn «go» ⇒ bỏ bản cũ
            _usedSeconds = 0;
            _quyGiay = 0; _quyChoGhi = 0;   // số sao mới của máy chủ đã trừ phần đã chơi (usage gửi cùng lượt đồng bộ)
            _giayBe = new();
            _usedBe = new();
            // Policy (sao, danh sách) là của bé máy chủ đang thấy dùng máy — bé đăng nhập lúc mất mạng được báo TRƯỚC dong-bo (NguoiDungMay.TruocDongBoAsync)
            _policyBe = BeHienTai();
            // #433 A8: giây lẻ app «Tính phút» chưa gửi (dưới 1 phút / dòng — lần đồng bộ sau mới gửi) chưa nằm trong số sao vừa nhận ⇒ đếm sẵn vào quỹ,
            // không thì mỗi lần đồng bộ bé được chơi thêm tới 59 giây và hết sao khoá chậm một nhịp.
            if (!MoTamDangMo(DateTimeOffset.Now)) _quyGiay = Usage.GiayChuaGui(DateTimeOffset.Now, app => QuyTaiCho.TinhGio(p, app), _policyBe);
            _offline = false;
            _offlineSince = null;
            _lastSyncAt = DateTimeOffset.Now;
            TokenInvalid = false;
            _chayChoGhi = 0;   // liên lạc được ⇒ bộ đếm mất liên lạc về 0 (GhiThanhCong)
            BoDoanRong();
            _daChoi = new DaChoiTheoPolicy { PhienId = p.PlaySessionId ?? "" };   // Policy mới ⇒ ngưỡng offline mới đã tính phần đã chơi
            if (Config != null)
            {
                var at = _policyAt;
                void Ap(AgentConfig c)
                {
                    c.LastPolicyJson = raw;
                    c.LastPolicyAt = at;
                    c.DaChoi = null;
                    c.QuyDem = BanQuyDem(at);
                    // Đồng bộ được ⇒ hết mồ côi + ghi mốc liên lạc (fail-open 14 ngày tính từ đây). Ba Mẹ đã chọn chế độ ⇒ giá trị máy chủ thắng, lưu lại cho lúc mất mạng.
                    MoCoi.GhiThanhCong(c, at);
                    if (p.CheDo != null) c.CheDo = p.CheDo;
                    // Giữ lại bí mật mã offline (máy chủ chỉ gửi khi có) để còn kiểm mã lúc mất mạng.
                    if (!string.IsNullOrEmpty(p.MaOfflineBiMat)) c.MaOfflineBiMat = p.MaOfflineBiMat;
                    // Có mạng lại: mã offline chỉ dành cho lúc mất mạng ⇒ kết thúc lượt mở, Policy online của Ba Mẹ quyết.
                    MoTamOffline.KetThucKhiCoMang(c, at);
                }
                AgentConfig? moi = null;
                try { moi = Store.Update(Ap); } catch { }
                if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
                else Ap(Config); // không lưu được: vẫn kết thúc lượt mở trong bộ nhớ (lần đồng bộ sau lưu lại)
            }
        }
    }

    /// <summary>Mục «Chơi bằng điểm» hiện tại — đọc thẳng Policy (không dựng cả TrayState dưới khoá cho mỗi PlayInfo).</summary>
    public IReadOnlyList<string> PlayChoices { get { lock (_gate) return _policy?.PlayChoices.ToList() ?? new List<string>(); } }

    /// <summary>Policy để THỰC THI (AppLocker + đóng app): Policy cuối, trừ app chơi khi đoạn chơi offline đã vượt ngưỡng (<see cref="PhienOffline.ApDung"/>).</summary>
    public Policy? CurrentPolicy { get { lock (_gate) return ThucThi(DateTimeOffset.Now); } }

    /// <summary>Bé đang dùng máy (đã đăng nhập bằng tên + PIN) — null = máy riêng / Ba Mẹ / chưa ai. Gọi trong khoá.</summary>
    private string? BeHienTai() => Config?.DangNhap is { Loai: LoaiNguoiDung.Con, ConId: { Length: > 0 } c } ? c : null;

    /// <summary>Policy + giây đã đếm CỦA BÉ ĐANG DÙNG. #337: bé khác bé của Policy (máy chung, đổi bé lúc mất mạng) ⇒ luật của đúng bé đó từ gói
    /// ho-so?offline=1 (<see cref="LuatTheoBe.ChoBe"/>); không có gói ⇒ khoá «Cần có mạng». Sổ đếm sao / giây dùng riêng theo bé. Gọi trong khoá.</summary>
    private (Policy P, double Giay) PolicyChoBe()
    {
        var be = BeHienTai();
        if (_policy == null || be == null || be == _policyBe) return (_policy!, _quyGiay);
        var hs = Config?.DangNhap?.HoSo;
        var mayRieng = hs?.MayRieng ?? Config?.DungChung == false;
        GoiLuatBe? goi = null;
        Config?.GoiLuatBe.TryGetValue(be, out goi);
        var goiP = DocGoi(be, goi);
        // có mạng mà chưa có gói ⇒ luật hiện có (lượt dong-bo ngay sau mang luật của bé); chỉ khoá «Cần có mạng» khi mất mạng thật
        var p = LuatTheoBe.ChoBe(_policy, _policyBe, be, mayRieng, goiP, goi?.Luc, hs?.Con.FirstOrDefault(c => c.Id == be),
            Config?.DangNhap?.HoSoMayChuLuc, _offline);
        if (p == null) return (_policy, _quyGiay);
        // gói của bé: phần đã đếm trên gói lúc bé rời máy (LuatTheoBe.CatBeRoi) + phần đếm từ lúc bé quay lại
        return (p, (goiP != null ? goi!.GiayDaDem : 0) + (_giayBe.TryGetValue(be, out var g) ? g : 0));
    }

    /// <summary>Gói luật đã đọc của bé (đọc lại khi gói đổi). Gọi trong khoá.</summary>
    private Policy? DocGoi(string be, GoiLuatBe? goi)
    {
        if (goi == null) { _goiDoc.Remove(be); return null; }
        if (_goiDoc.TryGetValue(be, out var c) && c.Raw == goi.Raw) return c.P;
        var p = LuatTheoBe.Doc(goi);
        _goiDoc[be] = (goi.Raw, p);
        return p;
    }

    /// <summary>Giây đã dùng máy kể từ Policy cuối CỦA BÉ ĐANG DÙNG (MinutesLeft). Gọi trong khoá.</summary>
    private double DungChoBe()
    {
        var be = BeHienTai();
        if (be == null || be == _policyBe) return _usedSeconds;
        var daDem = Config?.GoiLuatBe.TryGetValue(be, out var goi) == true ? goi.DungGiay : 0;
        return daDem + (_usedBe.TryGetValue(be, out var g) ? g : 0);
    }

    /// <summary>Policy đã áp phiên chơi offline + sao đếm tại máy (QuyTaiCho) cho bé đang dùng. Gọi trong khoá.</summary>
    private Policy? ThucThi(DateTimeOffset now)
    {
        if (_policy == null) return null;
        var (p, giay) = PolicyChoBe();
        return QuyTaiCho.ApDung(PhienOffline.ApDung(p, _phienOffline), giay, MoTamDangMo(now));
    }

    /// <summary>15/11 (PR #277): phút «Tính phút» dùng lúc mở bằng mã chưa báo, THEO BÉ (làm tròn xuống; Con null = không rõ bé) — dong-bo `boiMaCon`.</summary>
    public List<(string? Con, int Phut)> BoiMaTheoBe()
    {
        lock (_gate)
            return _boiMaGiay.Select(x => (Con: x.Key.Length > 0 ? x.Key : null, Phut: (int)Math.Floor(x.Value / 60.0))).Where(x => x.Phut > 0).ToList();
    }

    /// <summary>Đồng bộ thành công đã mang các phút này ⇒ trừ đi (phần lẻ giữ cho lần sau).</summary>
    public void DaGuiBoiMa(IEnumerable<(string? Con, int Phut)> daGui)
    {
        lock (_gate)
        {
            var doi = false;
            foreach (var (con, phut) in daGui)
            {
                var k = con ?? string.Empty;
                if (!_boiMaGiay.TryGetValue(k, out var g)) continue;
                g -= phut * 60.0;
                if (g <= 0.5) _boiMaGiay.Remove(k); else _boiMaGiay[k] = g;
                doi = true;
            }
            if (doi) LuuQuy();
        }
    }

    /// <summary>Phút mở bằng mã hôm nay của bé (không trừ sao) — khay bỏ khỏi «Hôm nay đã chơi N phút · −N sao».</summary>
    private int PhutBoiMaHomNay(DateTimeOffset now, string? be)
        => _boiMaNgay == NgayGiaDinh.Ngay(now.ToLocalTime(), Usage.Tz) && _boiMaHomNay.TryGetValue(be ?? string.Empty, out var g) ? (int)Math.Floor(g / 60.0) : 0;

    private QuyDaDem BanQuyDem(DateTimeOffset policyAt) => new()
    {
        PolicyAt = policyAt, Giay = _quyGiay, PolicyBe = _policyBe, GiayBe = new(_giayBe), BoiMa = new(_boiMaGiay),
        BoiMaHomNay = new(_boiMaHomNay), BoiMaNgay = _boiMaNgay,
    };

    /// <summary>0.2.4 (BRD 4.4 / 6.7): mỗi vòng thực thi — «đang chơi thật» (<see cref="TienCanhChoi"/>), cộng giây vào status.playSeconds
    /// (lúc có mạng) + số giây đã chơi theo Policy, đếm phút chơi khi mất mạng (đồng hồ đơn điệu), lưu khi cần.</summary>
    /// <param name="manHinhKhoa">WTS: phiên Con đang khoá (null = không đọc được).</param>
    /// <param name="tienTrinhCon">Tên exe đang chạy trong phiên Con (null = không đọc được).</param>
    public void DemChoi(DateTimeOffset now, double giayDonDieu, bool conDangNhap, bool? manHinhKhoa, IReadOnlyCollection<string>? tienTrinhCon)
    {
        lock (_gate)
        {
            // #337: phiên chơi của BÉ ĐANG DÙNG (máy chung đổi bé lúc mất mạng ⇒ gói luật bé đó), đoạn offline ghi kèm bé
            var p = _policy == null ? null : PolicyChoBe().P;
            var beDem = BeHienTai();
            var tuoi = (DateTimeOffset.UtcNow - _fgAt).TotalSeconds < 20;
            // #690: tiền cảnh là exe bí danh đang chạy thật ⇒ muc chính (đã quy ở SetForeground) cũng coi là đang chạy
            if (tienTrinhCon != null && !string.IsNullOrEmpty(_fgId) && _fgIdGoc != _fgId && tienTrinhCon.Contains(_fgIdGoc ?? ""))
                tienTrinhCon = new HashSet<string>(tienTrinhCon.Append(_fgId!.ToLowerInvariant()), StringComparer.OrdinalIgnoreCase);
            bool dangChoi = conDangNhap && TienCanhChoi.DangChoi(p, _fgId, tuoi, manHinhKhoa, tienTrinhCon);
            var id = p?.PlaySessionId;
            if (_playSecId != id) { _playSecId = id; _playSec = 0; }
            if (_daChoi.PhienId != (id ?? "")) _daChoi = new DaChoiTheoPolicy { PhienId = id ?? "" };
            var daTruoc = _daChoi.Giay;
            var truocHet = _phienOffline?.HetHan == true;
            var doiBe = false;
            if (_offline) (_phienOffline, doiBe) = PhienOffline.DoiBe(_phienOffline, _phienCho, p, beDem);
            var (doan, luu) = PhienOffline.Dem(_phienOffline, p, _offline, dangChoi, giayDonDieu, daTruoc, now, MoTamDangMo(now), beDem);
            _phienOffline = doan;
            var g = dangChoi && id != null && giayDonDieu > 0 ? Math.Min(giayDonDieu, 60) : 0;
            if (g > 0)
            {
                if (!_offline) _playSec += g;
                _daChoi.Giay += g;
            }
            luu |= (int)(daTruoc / PhienOffline.GhiMoiGiay) != (int)(_daChoi.Giay / PhienOffline.GhiMoiGiay);
            if (doan != null && doan.HetHan && !truocHet) PhienOfflineHetHan = true;
            if (luu || doiBe) LuuPhienOffline();
        }
    }

    /// <summary>Đồng bộ thành công với status đã gửi ⇒ trừ số giây đã báo (giây đếm trong lúc gửi để lần sau). Lỗi ⇒ không gọi (giữ nguyên, như Usage).</summary>
    public void DaGuiGiayChoi(AgentStatus daGui)
    {
        lock (_gate)
            if (daGui.PlaySessionId == _playSecId) _playSec = Math.Max(0, _playSec - daGui.PlaySeconds);
    }

    /// <summary>Vừa vượt ngưỡng chơi offline (worker đọc để ghi log một lần).</summary>
    public bool PhienOfflineHetHan { get; set; }

    /// <summary>Bản sao đoạn chơi offline cần gửi bù (null = không có gì).</summary>
    public PhienOffline? DoanCanBu() { lock (_gate) return _phienOffline is { CanGui: true } d ? d.Sao() : null; }

    /// <summary>Kết quả gửi bù: đã gửi / bỏ (4xx vĩnh viễn) ⇒ xoá đoạn đúng mã (đoạn mới hơn giữ nguyên); giữ lại ⇒ không đổi.</summary>
    public void GhiKetQuaBu(PhienOffline? daGui, KetQuaBu kq)
    {
        if (daGui == null || kq is not (KetQuaBu.DaGui or KetQuaBu.Bo)) return;
        lock (_gate)
        {
            if (_phienOffline?.Ma == daGui.Ma) _phienOffline = null;
            else if (_phienCho.RemoveAll(x => x.Ma == daGui.Ma) == 0) return;
            LuuPhienOffline();
        }
    }

    /// <summary>#337: bản sao các đoạn của bé khác chờ gửi bù (gửi trước dong-bo, cùng luật <see cref="GuiBu"/>).</summary>
    public List<PhienOffline> DoanChoBu() { lock (_gate) return _phienCho.Where(x => x.CanGui).Select(x => x.Sao()).ToList(); }

    /// <summary>Có mạng (đồng bộ được) mà đoạn không có gì để gửi ⇒ bỏ đoạn rỗng.</summary>
    private void BoDoanRong()
    {
        var bo = _phienCho.RemoveAll(x => !x.CanGui) > 0;
        if (_phienOffline is { CanGui: false }) { _phienOffline = null; bo = true; }
        if (bo) LuuPhienOffline();
    }

    private void LuuPhienOffline()
    {
        var sao = _phienOffline?.Sao();
        var cho = _phienCho.Select(x => x.Sao()).ToList();
        AgentConfig? moi = null;
        var dc = _daChoi.Giay > 0 ? new DaChoiTheoPolicy { PhienId = _daChoi.PhienId, Giay = _daChoi.Giay } : null;
        try { moi = Store.Update(c => { c.PhienOffline = sao; c.DaChoi = dc; c.PhienOfflineCho = cho; }); } catch { }
        if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
        else if (Config != null) { Config.PhienOffline = sao; Config.DaChoi = dc; Config.PhienOfflineCho = cho; }
    }

    public void SetOffline(bool v)
    {
        lock (_gate)
        {
            if (v && !_offline) _offlineSince = DateTimeOffset.Now;
            if (!v) _offlineSince = null;
            _offline = v;
        }
    }

    /// <summary>Kết quả thăm dò nhẹ máy chủ (mỗi ~15 giây, <see cref="ApiClient.PingAsync"/>): không tới được ⇒ báo offline ngay (khay đổi biểu tượng
    /// trong ≤30 giây thay vì chờ nhịp đồng bộ sau, có thể 5–10 phút); tới lại được mà đang offline ⇒ đồng bộ ngay để hết cờ.</summary>
    public void GhiThamDo(bool toiDuoc)
    {
        if (!toiDuoc) { SetOffline(true); return; }
        bool canDongBo;
        lock (_gate) canDongBo = _offline && !TokenInvalid;   // token bị từ chối thì đồng bộ lại cũng vô ích: để nhịp thường quyết
        if (canDongBo) RequestSyncSoon();
    }

    public EffectivePolicy? Evaluate(DateTimeOffset now)
    {
        lock (_gate)
        {
            var p = ThucThi(now);
            if (p == null) return null;
            var eff = MoTamOffline.ApDung(PolicyEvaluator.Evaluate(p, now, DungChoBe()), MoTamDangMo(now));
            return DangNhapCoHieuLuc(now) ? DangNhapView.ApDung(eff, Config?.DangNhap, now) : eff;
        }
    }

    // ================================================================ 06/11 (L13): ai đang dùng máy (chọn tên + PIN, Ba Mẹ nhập mã)

    /// <summary>con | ba_me | chua lúc <paramref name="now"/>.</summary>
    public string NguoiDung(DateTimeOffset now) { lock (_gate) return DangNhapCoHieuLuc(now) ? DangNhapView.HienTai(Config?.DangNhap, now) : LoaiNguoiDung.Con; }

    /// <summary>Chọn tên + PIN áp khi máy chặn thật («giam-sat» của máy chung chưa có bé đã đổi thành chặn ở <see cref="DangNhapView.CheDoMayChung"/>).
    /// Máy mồ côi / đang gỡ / giám sát vì lệnh gỡ ⇒ bỏ hẳn (coi như bé đang dùng, không kẹt màn chọn tên). Gọi trong khoá.</summary>
    private bool DangNhapCoHieuLuc(DateTimeOffset now) => !DangGo && AiiGrow.Core.CheDoHieuLuc.LaChan(_cheDo) && !MoCoi.La(Config, now);

    private long _hoSoHoiTick = long.MinValue;
    /// <summary>Lần hỏi ho-so gần nhất (chỉ trong bộ nhớ — không ghi cấu hình mỗi lần hỏi). Đọc / ghi nguyên tử (pipe + vòng đồng bộ).</summary>
    public DateTimeOffset? HoSoHoiLuc
    {
        get { var t = Interlocked.Read(ref _hoSoHoiTick); return t == long.MinValue ? null : new DateTimeOffset(t, TimeSpan.Zero); }
        set => Interlocked.Exchange(ref _hoSoHoiTick, value?.UtcTicks ?? long.MinValue);
    }

    /// <summary>Một việc đổi người với máy chủ một lúc (dang-nhap-be / ba-me-mo ↔ dang-xuat báo bù) — dang-xuat đến sau không đá bé vừa vào.</summary>
    public SemaphoreSlim KhoaDoiNguoi { get; } = new(1, 1);

    /// <summary>Bản sao trạng thái đăng nhập (đọc ngoài khoá).</summary>
    public DangNhapMay DangNhap()
    {
        lock (_gate)
        {
            var d = Config?.DangNhap ?? new DangNhapMay();
            return JsonSerializer.Deserialize<DangNhapMay>(JsonSerializer.Serialize(d, Json.Options), Json.Options) ?? new DangNhapMay();
        }
    }

    /// <summary>Đọc – sửa – ghi trạng thái đăng nhập trong khoá của ConfigStore (<paramref name="f"/> trả true = có đổi ⇒ ghi). Ghi lỗi ⇒ vẫn đổi bản trong bộ nhớ.
    /// Đổi người dùng ⇒ quỹ đếm tại máy của bé trước không áp cho bé sau.</summary>
    public bool CapNhatDangNhap(Func<DangNhapMay, bool> f)
    {
        lock (_gate)
        {
            var truoc = Config?.DangNhap is { } d0 ? (d0.Loai, d0.ConId) : (LoaiNguoiDung.Chua, null);
            bool doi = false;
            AgentConfig? moi = null;
            try { moi = Store.UpdateIf(c => { c.DangNhap ??= new DangNhapMay(); doi = f(c.DangNhap); return doi; }); } catch { moi = null; }
            if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
            else if (Config != null) { Config.DangNhap ??= new DangNhapMay(); doi = f(Config.DangNhap); }
            var sau = Config?.DangNhap is { } d1 ? (d1.Loai, d1.ConId) : (LoaiNguoiDung.Chua, null);
            // #337: bé rời máy ⇒ cất luật + phần đã đếm mới nhất của bé vào gói của bé (quay lại lúc mất mạng không dùng gói ho-so cũ)
            if (truoc.Loai == LoaiNguoiDung.Con && truoc.ConId is { Length: > 0 } roi && sau != truoc) CatBeRoi(roi);
            // KHÔNG đặt lại quỹ đếm tại máy khi đổi người: lúc mất mạng Policy đang giữ vẫn là bản cũ ⇒ đăng xuất / vào lại không được thêm giờ;
            // có mạng, lượt đồng bộ ngay sau (RequestSyncSoon) mang Policy + quỹ của bé mới và đặt lại bộ đếm (SetPolicy).
            if (sau != truoc) _lockStartedAt = null;
            return doi;
        }
    }

    /// <summary>#337: tách gói luật theo bé khỏi ho-so vừa tải (bỏ <see cref="HoSoBe.Offline"/> khỏi <paramref name="hs"/>) và lưu vào cấu hình
    /// (DPAPI, sống qua khởi động lại) — chỉ ghi khi gói đổi.</summary>
    /// <param name="thay">false ⇒ chỉ thêm gói còn thiếu (<see cref="LuatTheoBe.Gop"/>).</param>
    public void LuuGoiLuat(HoSoMay hs, DateTimeOffset luc, bool thay = true)
    {
        lock (_gate)
        {
            var thu = new Dictionary<string, GoiLuatBe>(Config?.GoiLuatBe ?? new());
            var doi = LuatTheoBe.Gop(thu, hs, luc, thay);
            LuatTheoBe.BoGoi(hs);
            if (!doi) return;
            AgentConfig? moi = null;
            try { moi = Store.Update(c => c.GoiLuatBe = new Dictionary<string, GoiLuatBe>(thu)); } catch { moi = null; }
            if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
            else if (Config != null) Config.GoiLuatBe = thu;
        }
    }

    /// <summary>Bé <paramref name="be"/> vừa rời máy: luật + giây đã đếm của bé vào gói của bé (<see cref="LuatTheoBe.CatBeRoi"/>). Gọi trong khoá.</summary>
    private void CatBeRoi(string be)
    {
        if (_policy == null || Config == null || MayRieng) return;   // lock _gate lồng nhau được (Monitor vào lại)
        var thu = new Dictionary<string, GoiLuatBe>();
        foreach (var (k, v) in Config.GoiLuatBe)
            thu[k] = new GoiLuatBe { Raw = v.Raw, Luc = v.Luc, Bam = v.Bam, GiayDaDem = v.GiayDaDem, DungGiay = v.DungGiay };
        var doi = LuatTheoBe.CatBeRoi(thu, be, _policyBe, Config.LastPolicyJson, _policy.ServerTime, _quyGiay, _usedSeconds,
            _giayBe.TryGetValue(be, out var gb) ? gb : 0, _usedBe.TryGetValue(be, out var ub) ? ub : 0);
        if (!doi) return;
        if (be != _policyBe) { _giayBe.Remove(be); _usedBe.Remove(be); }   // đã chuyển vào gói
        AgentConfig? moi = null;
        try { moi = Store.Update(c => { c.GoiLuatBe = thu; c.QuyDem = BanQuyDem(_policyAt); }); } catch { moi = null; }
        if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
        else Config.GoiLuatBe = thu;
    }

    /// <summary>Máy chỉ gán một bé (ho-so.mayRieng; chưa hỏi được ⇒ theo lúc ghép).</summary>
    public bool MayRieng { get { lock (_gate) return Config?.DangNhap?.HoSo?.MayRieng ?? Config?.DungChung == false; } }

    private bool MoTamDangMo(DateTimeOffset now) => Config?.MoTamOffline?.IsUnlocked(now) == true;

    /// <summary>
    /// Con gõ mã mở offline Ba Mẹ đọc. Kiểm ngay trên máy bằng bí mật đã lưu (Config.MaOfflineBiMat), không cần máy chủ.
    /// Mở được ⇒ lưu hạn mở + ghi sự kiện «mo_ma_offline» vào hàng đợi offline; sai đủ ngưỡng ⇒ sự kiện «sai_ma_offline».
    /// </summary>
    /// <param name="choBaMe">06/11 (L13): «Ba Mẹ nhập mã» lúc mất mạng ⇒ mã đúng thì «Ba Mẹ đang dùng máy» (đúng số phút trong mã), không phải mở tạm cho Con.</param>
    /// <summary>#307: kết quả lượt kiểm mã gần nhất (null = chưa kiểm được) — khay chỉ ghi «Mã chưa đúng» khi đúng là <see cref="KetQuaMoOffline.Sai"/>.</summary>
    public KetQuaMoOffline? KetQuaMaCuoi { get; private set; }

    public (bool Ok, string Message) TryMaOffline(string? code, DateTimeOffset now, bool choBaMe = false)
    {
        lock (_gate)
        {
            if (Config is not { Paired: true }) return (false, "Máy chưa ghép với Ba Mẹ");
            const string chuaLuu = "Chưa lưu được, thử lại";
            var nho = Config.MoTamOffline?.WrongAt.ToList() ?? new();
            var kq = KetQuaMoOffline.Sai;
            var cau = "";
            bool daKiem = false;
            AgentConfig? moi = null;
            try
            {
                // Đọc – kiểm – ghi trên bản ở đĩa, trong khoá của ConfigStore ⇒ HeartbeatWorker không ghi đè được lượt mở / lượt sai.
                moi = Store.UpdateIf(c =>
                {
                    c.MoTamOffline ??= new MoTamOffline();
                    var st = c.MoTamOffline;
                    // lượt sai chỉ còn trong bộ nhớ (lần lưu trước lỗi) vẫn tính
                    foreach (var t in nho) if (!st.WrongAt.Contains(t)) st.WrongAt.Add(t);
                    st.WrongAt.Sort();
                    kq = st.TryUnlock(c.MaOfflineBiMat, code, now);
                    cau = st.Cau(kq, now);
                    daKiem = true;
                    var may = Environment.MachineName;
                    if (kq == KetQuaMoOffline.DaMo)
                    {
                        c.Queue.Add(new SuKien
                        {
                            Loai = "mo_ma_offline", Luc = now.ToUniversalTime(),
                            ChiTiet = new() { ["may"] = may, ["phut"] = ((int)Math.Round((st.UnlockUntil!.Value - now).TotalMinutes)).ToString(), ["den"] = st.UnlockUntil!.Value.ToUniversalTime().ToString("o"),
                                ["baMe"] = choBaMe ? "1" : "0" },
                        });
                        if (choBaMe)
                        {
                            // Ba Mẹ dùng máy: không phải lượt «mở tạm» của Con (có mạng không cắt ngang) — giữ mã đã dùng để không dùng lại
                            var den = st.UnlockUntil!.Value;
                            st.UnlockUntil = now;
                            c.DangNhap ??= new DangNhapMay();
                            DangNhapView.VaoBaMe(c.DangNhap, den, true, now);
                            cau = $"Ba Mẹ dùng máy tới {den.ToLocalTime():HH:mm}.";
                        }
                    }
                    else if (kq == KetQuaMoOffline.Sai && st.WaitSeconds(now) > 0)
                        c.Queue.Add(new SuKien
                        {
                            Loai = "sai_ma_offline", Luc = now.ToUniversalTime(),
                            ChiTiet = new() { ["may"] = may, ["soLan"] = MoTamOffline.SaiToiDa.ToString(), ["phut"] = MoTamOffline.CuaSoSaiPhut.ToString() },
                        });
                    return kq is KetQuaMoOffline.DaMo or KetQuaMoOffline.Sai;
                });
            }
            catch { moi = null; }
            KetQuaMaCuoi = daKiem ? kq : null;

            // Không đọc được cấu hình trên đĩa ⇒ chưa kiểm mã (không ai dò được khi giới hạn lượt sai không lưu được).
            if (!daKiem) return (false, chuaLuu);
            if (moi == null)
            {
                // Kiểm rồi nhưng lưu lỗi: mã đúng thì KHÔNG mở (để Con gõ lại, mã vẫn dùng được); mã sai thì vẫn nhớ lượt sai trong bộ nhớ.
                if (kq == KetQuaMoOffline.DaMo) return (false, chuaLuu);
                if (kq == KetQuaMoOffline.Sai) (Config.MoTamOffline ??= new MoTamOffline()).WrongAt.Add(now);
                return (false, cau);
            }
            Config = moi;
            _cfgStamp = Store.LastWriteUtc;
            if (choBaMe && kq == KetQuaMoOffline.DaMo) _lockStartedAt = null;
            return (kq == KetQuaMoOffline.DaMo || (kq == KetQuaMoOffline.DangMo && !choBaMe), cau);
        }
    }

    /// <param name="con">15/11 (#267): bé đang dùng máy — phút ghi theo bé (`usage[].con`), «Đổi người» thì lượt đồng bộ sau chốt phút bé trước.</param>
    public void CountUsage(DateTimeOffset now, string appId, string appName, double seconds, string? con = null)
    {
        Usage.Add(now, appId, appName, seconds, con);
        lock (_gate)
        {
            // #337: luật của bé đang dùng (máy chung đổi bé lúc mất mạng ⇒ gói luật bé đó); sổ đếm riêng theo bé
            Policy? pBe = _policy == null ? null : PolicyChoBe().P;
            var khac = con != null && pBe != null && !ReferenceEquals(pBe, _policy);   // đang theo luật riêng của bé khác bé của Policy
            bool learning = pBe?.LearningApps.Contains(appId.ToLowerInvariant()) == true;
            if (!learning)
            {
                if (khac) _usedBe[con!] = (_usedBe.TryGetValue(con!, out var u) ? u : 0) + seconds;
                else _usedSeconds += seconds;
            }
            if (seconds <= 0 || _policy == null) return;
            // mở bằng mã của Ba Mẹ: không trừ sao — đếm riêng theo bé để máy chủ bỏ khỏi phút tính sao (boiMaCon / phutBoiMa)
            if (MoTamDangMo(now))
            {
                if (!LaTinhPhut(appId, pBe)) return;
                var k = con ?? string.Empty;
                _boiMaGiay[k] = (_boiMaGiay.TryGetValue(k, out var g0) ? g0 : 0) + seconds;
                var ngay = NgayGiaDinh.Ngay(now.ToLocalTime(), Usage.Tz);   // #703: cùng ngày gia đình với dòng dùng
                if (ngay != _boiMaNgay) { _boiMaNgay = ngay; _boiMaHomNay = new(); }
                _boiMaHomNay[k] = (_boiMaHomNay.TryGetValue(k, out var g1) ? g1 : 0) + seconds;
            }
            else
            {
                if (!QuyTaiCho.TinhGio(pBe, appId)) return;
                // máy chung: bé khác bé của Policy ⇒ đếm vào sổ riêng của bé đó (không trừ vào số dư bé trước)
                if (khac) _giayBe[con!] = (_giayBe.TryGetValue(con!, out var g2) ? g2 : 0) + seconds;
                else _quyGiay += seconds;
            }
            _quyChoGhi += seconds;
            if (_quyChoGhi >= 60) LuuQuy();
            // #744: mỗi phút tròn «Tính phút» của bé đang theo Policy ⇒ đẩy phút lên máy chủ ngay (sau LuuQuy; bé khác / mở bằng mã không tính)
            if (!khac && _nhipPhut.Cong(seconds)) RequestSyncSoon();
        }
    }

    private readonly NhipPhut _nhipPhut = new();

    private bool LaTinhPhut(string appId, Policy? p = null) => appId == UsageTracker.KhongRo || QuyTaiCho.MucTinhPhut(p ?? _policy).Contains(appId, StringComparer.OrdinalIgnoreCase);

    /// <summary>Ghi giây sao đã đếm (~1 phút/lần). Gọi trong khoá.</summary>
    private void LuuQuy()
    {
        _quyChoGhi = 0;
        var qd = BanQuyDem(_policyAt);
        AgentConfig? moi = null;
        try { moi = Store.Update(c => c.QuyDem = qd); } catch { }
        if (moi != null) { Config = moi; _cfgStamp = Store.LastWriteUtc; }
        else if (Config != null) Config.QuyDem = qd;
    }

    public void SetForeground(string? appId, string? appName, string? tieuDe = null)
    {
        // #690: exe bí danh của app đã gộp (bản Store / bản cài) ⇒ muc chính máy chủ biết — phút, «đang chơi», phiên chơi, Tính phút cùng một app
        var goc = appId;
        if (appId != null && ExeGoi is { } eg && eg.TryGetValue(appId, out var goi)) appId = goi;   // #695: exe của gói ngoài WindowsApps
        if (appId != null && MucChinh is { } mc && mc.TryGetValue(appId, out var chinh)) appId = chinh;
        lock (_gate) { _fgId = appId ?? ""; _fgIdGoc = goc ?? ""; _fgName = appName; _fgTieuDe = tieuDe; _fgAt = DateTimeOffset.UtcNow; }
    }

    /// <summary>App «Tính phút» trong luật của bé đang dùng (#696: quy tiền cảnh ApplicationFrameHost không rõ app về app đang chạy).</summary>
    public IReadOnlyList<string> AppTinhGioBe()
    {
        lock (_gate) return _policy == null ? Array.Empty<string>() : PolicyChoBe().P.AppTinhGio.ToList();
    }

    private string? _fgTieuDe;
    /// <summary>#771: tab trình duyệt đang xem — hàng đợi giây theo tiêu đề.</summary>
    public readonly TabDangXem TabXem = new();

    /// <summary>#771: (exe gốc, tiêu đề cửa sổ) tiền cảnh khay báo gần nhất.</summary>
    public (string? Exe, string? TieuDe) GetTabTienCanh()
    {
        lock (_gate) return (_fgIdGoc, _fgTieuDe);
    }

    /// <summary>Fresh = tray còn sống (báo trong 20 giây qua).</summary>
    public (string? Id, string? Name, bool Fresh) GetForeground(DateTimeOffset now)
    {
        lock (_gate) return (_fgId, _fgName, (now - _fgAt).TotalSeconds < 20);
    }

    /// <param name="boiBaMe">App bị đóng vì Ba Mẹ đặt «Chặn» (blockedApps); false = app lạ ngoài danh sách được phép (khay tự gửi lời xin duyệt).</param>
    public void RecordBlocked(string appId, string appName, bool boiBaMe = false)
    {
        lock (_gate) { _blockedSeq++; _blockedId = appId; _blockedName = appName; _blockedBoiBaMe = boiBaMe; }
    }

    private bool _blockedBoiBaMe;

    /// <summary>Nạp bản cấu hình vừa ghi (pipe lưu lời xin chờ mạng) để vòng chính không đọc lại tệp.</summary>
    public void NapLaiConfig(AgentConfig c)
    {
        lock (_gate) { Config = c; _cfgStamp = Store.LastWriteUtc; }
    }

    private DateTimeOffset? _khoaTu;
    private bool _khoaTuDaDoc;
    private static string TepKhoaTu => Path.Combine(Paths.DataDir, "khoa-tu.txt");

    /// <summary>#307 (cmt-khoa-ba-me-khoa): lúc máy nhận lệnh «Khoá ngay» của Ba Mẹ — giữ nguyên tới khi Ba Mẹ mở (không theo phiên Windows / đổi người /
    /// khởi động lại dịch vụ: lưu tệp). Máy chủ chưa gửi mốc khoá ⇒ đây là lần đầu máy thấy lệnh. Gọi trong <c>_gate</c>.</summary>
    private DateTimeOffset? KhoaLuc(bool baMeKhoa, DateTimeOffset now)
    {
        if (!_khoaTuDaDoc)
        {
            _khoaTuDaDoc = true;
            try { if (File.Exists(TepKhoaTu) && DateTimeOffset.TryParse(File.ReadAllText(TepKhoaTu).Trim(), System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d)) _khoaTu = d; }
            catch { /* không đọc được ⇒ coi như chưa có */ }
        }
        var moi = KhoaLucMay.Cap(_khoaTu, baMeKhoa, now);
        if (moi != _khoaTu)
        {
            _khoaTu = moi;
            try { if (moi is { } m) File.WriteAllText(TepKhoaTu, m.ToString("o")); else if (File.Exists(TepKhoaTu)) File.Delete(TepKhoaTu); }
            catch { /* chỉ để hiện giờ khoá — lỗi ghi không ảnh hưởng khoá */ }
        }
        return _khoaTu;
    }

    public void SetLock(bool locked, string? reason, DateTimeOffset now, bool sessionActive)
    {
        lock (_gate)
        {
            // màn «Ai đang dùng máy?» không đếm ngược, không ngắt phiên Windows (các bé chọn tên ngay trên màn này)
            // #337: «Cần có mạng» (bé chưa có luật lúc mất mạng) cũng không ngắt phiên — bé khác còn «Đổi người», Ba Mẹ nhập mã ngay trên màn
            if (!locked || !sessionActive || reason is LockReasons.ChonTen or LockReasons.CanMang) { _lockStartedAt = null; return; }
            if (_lockStartedAt == null) { _lockStartedAt = now; _lockGraceSec = DangNhapMacDinh.GiayChoNgat(now, _ngatCuoi); }   // chốt lúc bắt đầu khoá, không đổi giữa chừng
        }
    }

    private DateTimeOffset? _ngatCuoi;
    /// <summary>Ghi lúc vừa ngắt phiên của bé (khoá hết hạn chờ) — lần vào lại ngay sau đó được chờ lâu hơn, không bị đăng xuất liền (#778).</summary>
    public void GhiNgatPhien(DateTimeOffset now) { lock (_gate) _ngatCuoi = now; }

    public bool LockGraceExpired(DateTimeOffset now)
    {
        lock (_gate) return _lockStartedAt.HasValue && (now - _lockStartedAt.Value).TotalSeconds >= _lockGraceSec;
    }

    public TrayState BuildState(DateTimeOffset now)
    {
        lock (_gate)
        {
            var s = new TrayState
            {
                Paired = Config?.Paired == true, Offline = _offline, CheDo = _cheDo, MoCoi = MoCoi.La(Config, now),
                OfflineSince = _offlineSince, LastSyncAt = _lastSyncAt, TokenRejected = TokenInvalid, WebRev = WebRev,
                WebChan = WebChanDangAp?.ToList(), WebCho = WebChoDangAp?.ToList(),
                TrangChan = TabDangXem.LaTrinhDuyet(_fgIdGoc) && (now - _fgAt).TotalSeconds < 20
                    ? TrangChanWeb.TimMien(_fgTieuDe, WebChanDangAp, WebChoDangAp, WebChiChoPhepDangAp, WebMayChuDangAp) : null,
                XinChoMang = Config?.XinCho.Items.Count ?? 0,
                XinBo = Config?.XinBo.ConHan(now) ?? new(),
                BaiChoMang = Math.Max(0, SoBaiCho < 0 ? (SoBaiCho = DemBaiCho()) : SoBaiCho),
            };
            if (_policy == null) return s;
            bool moTam = MoTamDangMo(now);
            var tt = ThucThi(now)!;
            var dn = Config?.DangNhap;
            var coDn = DangNhapCoHieuLuc(now);
            // máy chung: luật / số dư / đếm của BÉ ĐANG DÙNG (#337: đổi bé lúc mất mạng ⇒ gói luật bé đó, không dùng luật / sổ bé trước)
            var (pBe, giayBe) = PolicyChoBe();
            var effChinhSach = PolicyEvaluator.Evaluate(tt, now, DungChoBe());
            var eff0 = MoTamOffline.ApDung(effChinhSach, moTam);
            var eff = coDn ? DangNhapView.ApDung(eff0, dn, now) : eff0;
            if (moTam) { s.MoOfflineDen = Config!.MoTamOffline.UnlockUntil; s.MoOfflineTu = Config.MoTamOffline.UnlockFrom; }
            s.ChildName = string.IsNullOrEmpty(_policy.ChildName) ? (Config?.ChildName ?? "") : _policy.ChildName;
            // 06/11 (L13): ai đang dùng máy — tên trên màn là bé đang đăng nhập (Policy có thể còn của lượt đồng bộ trước)
            s.NguoiDung = coDn ? DangNhapView.HienTai(dn, now) : LoaiNguoiDung.Con;
            s.MayRieng = dn?.HoSo?.MayRieng ?? Config?.DungChung == false;
            if (s.NguoiDung == LoaiNguoiDung.Con) { s.BeId = dn!.ConId; s.BeTen = dn.TenCon; if (!string.IsNullOrWhiteSpace(dn.TenCon)) s.ChildName = dn.TenCon!; }
            else if (s.NguoiDung == LoaiNguoiDung.BaMe) s.BaMeDen = dn!.BaMeDen;
            s.Mode = tt.Mode;
            s.Locked = eff.Locked;
            s.LockReason = eff.LockReason;
            // #307: mốc theo lệnh khoá của CHÍNH SÁCH (trước mở tạm bằng mã — mở tạm không xoá mốc); chỉ gửi khi màn đang là «Ba Mẹ khoá» (cùng nguồn LockReason)
            var khoaLuc = KhoaLuc(effChinhSach.Locked && effChinhSach.LockReason == LockReasons.Khoa, now);
            s.KhoaLuc = s.Locked && s.LockReason == LockReasons.Khoa ? khoaLuc : null;
            s.MinutesLeft = eff.MinutesLeft;
            s.GrantEndsAt = eff.GrantEndsAt;
            s.CanExchangePoints = pBe.CanExchangePoints;
            s.PlayChoices = pBe.PlayChoices.ToList();
            s.BlockedSeq = _blockedSeq;
            s.BlockedAppId = _blockedId;
            s.BlockedAppName = _blockedName;
            s.BlockedBoiBaMe = _blockedBoiBaMe;
            s.AppDuocPhep = pBe.LearningApps.ToList();
            // 15/11 sổ sao: phút còn chơi (= sao tiêu được) + số dư đã trừ phần đếm tại máy; nợ; «Mở hết»; app «Tính phút» đang ở tiền cảnh
            s.MoHet = CheDoCon.La(pBe);
            s.QuyConPhut = s.MoHet ? null : QuyTaiCho.ConPhut(pBe, giayBe);
            var saoGoc = pBe.SoSao?.Sao ?? pBe.Sao;
            s.Sao = s.MoHet ? saoGoc : SaoView.SoDuTaiMay(saoGoc, pBe.QuyConPhut, s.QuyConPhut);
            s.No = pBe.SoSao?.No;
            // #302: khoá vì giới hạn ngày / đang nghỉ (còn sao) ⇒ màn khoá nói đúng lý do, không «Hết sao rồi»
            var gh = s.MoHet ? null : pBe.GioiHan;
            // hết giới hạn ngày THẮNG hết sao (có sao hôm nay cũng không chơi được); đang nghỉ chỉ khi còn sao thật
            s.GioiHanLyDo = gh?.ApDung != true ? null : gh.LyDoKhoa == GioiHanMay.HetGioNgay || pBe.SoSao?.SaoTieuDuoc is > 0 ? gh.LyDoKhoa : null;
            s.GioiHanGio = s.GioiHanLyDo == GioiHanMay.DangNghi ? gh!.NghiDenGio : null;
            s.GioiHanCau = s.GioiHanLyDo != null ? gh!.Cau : null;
            s.GioiHanChan = gh?.ApDung == true && gh.PhutToiDa is double ptd && pBe.SoSao?.SaoTieuDuoc is double stt && ptd < stt;
            s.GioiHanChanLuot = s.GioiHanChan && gh!.LuotChanTruoc;
            // phút đếm tại máy vừa hết mà giới hạn chặn trước số sao (chưa tới lượt đồng bộ) ⇒ đoán lý do để màn khoá nói đúng ngay;
            // lúc hết chốt MỘT lần cho Policy này (đồng bộ mới thay Policy ⇒ chốt lại / máy chủ đã tính lý do thật)
            if (s.GioiHanLyDo == null && s.GioiHanChan && s.QuyConPhut is <= 0)
            {
                if (_ghHetLuc?.Of != _policy) _ghHetLuc = (_policy, now);
                if (gh!.DoanKhiHet(_ghHetLuc!.Value.Luc) is { } doan)
                    (s.GioiHanLyDo, s.GioiHanGio, s.GioiHanCau) = (doan.LyDo, doan.Gio, doan.Cau);
            }
            s.PhutBoiMaHomNay = PhutBoiMaHomNay(now, s.NguoiDung == LoaiNguoiDung.Con ? s.BeId : null);
            // #699: «Hôm nay đã chơi» theo sổ sao máy chủ (mọi máy, cả web, không mất khi dịch vụ khởi động lại) + phần vừa đếm tại máy.
            // Chỉ khi Policy là của chính bé này (máy chung đổi bé ⇒ gói có thể cũ) và lấy trong hôm nay; không thì null ⇒ khay đếm tại máy như cũ.
            s.PhutChoiHomNay = ReferenceEquals(pBe, _policy) && NgayGiaDinh.Ngay(_policyAt.ToLocalTime(), Usage.Tz) == NgayGiaDinh.Ngay(now.ToLocalTime(), Usage.Tz)
                ? SaoView.DaChoiTaiMay(pBe.SoSao?.PhutChoiHomNay, s.MoHet ? null : pBe.QuyConPhut, s.QuyConPhut) : null;
            s.AppTinhPhut = QuyTaiCho.MucTinhPhut(pBe).ToList();
            var fgTuoi = (DateTimeOffset.UtcNow - _fgAt).TotalSeconds < 20;
            s.DangChoiTinhPhut = !s.MoHet && !moTam && fgTuoi && !string.IsNullOrEmpty(_fgId) && LaTinhPhut(_fgId!, pBe) && _fgId != UsageTracker.KhongRo;
            s.AppDangChoi = s.DangChoiTinhPhut ? TrayView.FriendlyAppName(_fgId, _fgName, TenAppMay) : null;
            s.DungTheoApp = Usage.DungHomNay(now, con: s.NguoiDung == LoaiNguoiDung.Con && !s.MayRieng ? s.BeId : null);
            // #307: dịch vụ giải tên hiển thị (danh sách app máy) — khay hiện đúng tên này, không tra bảng
            var tenMay = TenAppMay;
            s.TenAppDuocPhep = s.AppDuocPhep.Select(m => TrayView.FriendlyAppName(m, null, tenMay)).ToList();
            s.TenAppTinhPhut = s.AppTinhPhut.Select(m => TrayView.FriendlyAppName(m, null, tenMay)).ToList();
            if (!string.IsNullOrEmpty(s.BlockedAppId)) s.BlockedAppName = TrayView.FriendlyAppName(s.BlockedAppId, s.BlockedAppName, tenMay);
            if (eff.Locked && _lockStartedAt.HasValue)
                s.LockGraceLeftSec = (int)Math.Max(0, Math.Ceiling(_lockGraceSec - (now - _lockStartedAt.Value).TotalSeconds));
            // Giám sát (hoặc mồ côi): KHÔNG hiện màn khoá toàn màn hình — chỉ ghi lại ở dịch vụ.
            if (!AiiGrow.Core.CheDoHieuLuc.LaChan(_cheDo)) AiiGrow.Core.CheDoHieuLuc.ChoKhayGiamSat(s);
            return s;
        }
    }

    public void RequestSyncSoon()
    {
        lock (_gate) _forceSync = true;
        if (_wake.CurrentCount == 0) _wake.Release();
    }

    public bool TakeForceSync()
    {
        lock (_gate) { var v = _forceSync; _forceSync = false; return v; }
    }

    public async Task WaitAsync(TimeSpan t, CancellationToken ct)
    {
        try { await _wake.WaitAsync(t, ct); } catch (OperationCanceledException) { }
    }

    public AgentStatus BuildStatus(bool childActive)
    {
        var now = DateTimeOffset.UtcNow;
        lock (_gate)
        {
            var mode = _policy?.Mode ?? Modes.TuDo;
            var tray = (now - _fgAt).TotalSeconds < 20;
            var moCoi = MoCoi.La(Config, now);
            var phienKhac = QuyenPhien.LaTaiKhoanKhac(SessionHelper.ConsoleUser(), Config?.ChildUser, childActive);
            return new AgentStatus
            {
                Mode = mode,
                AppLockerApplied = AppLockerApplied,
                TrayAlive = tray,
                ChildSessionActive = childActive,
                Offline = _offline,
                CheDo = _cheDo,
                MoCoi = moCoi,
                PhienKhac = phienKhac,
                // 0.2.4: giây chơi thật của phiên từ lần đồng bộ thành công trước (máy chủ: lib/phien-windows.ts).
                PlaySeconds = Math.Round(_playSec, 1),
                PlaySessionId = _playSecId,
                Quyen = QuyenBaoVe.Tinh(_cheDo, moCoi, mode, AppLockerApplied, tray, childActive, phienKhac, AppLockerKhaDung),
                GhiChuBaoVe = string.Join("; ", new[] { AppLockerKhaDung ? null : AiiGrow.Core.AppLockerKhaDung.CauGhiChu, GhiChuWeb }.Where(x => !string.IsNullOrEmpty(x))) is { Length: > 0 } g ? g : null,
            };
        }
    }
}
