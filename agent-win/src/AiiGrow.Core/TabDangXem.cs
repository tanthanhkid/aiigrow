using System.Text.RegularExpressions;

namespace AiiGrow.Core;

// #771 (thuộc #763): THỜI GIAN WEB TÍNH THEO TAB ĐANG XEM. Trước đây số giây ở trang lấy từ cột visit_duration của lịch sử trình duyệt — tab mở sẵn
// (hoặc tab nền đang phát âm thanh) ăn hết giờ, tab đang xem (YouTube) lại chưa «đóng» lượt ghé nên không có dòng nào ⇒ xem YouTube miễn phí.
// Giờ khay báo thêm TIÊU ĐỀ cửa sổ tiền cảnh; khi tiền cảnh là trình duyệt, dịch vụ cộng giây vào tiêu đề tab đang chọn (mỗi nhịp, theo đồng hồ truyền vào),
// rồi quy tiêu đề ⇒ tên miền bằng lịch sử (urls.title). Cửa sổ thu nhỏ / tab nền / trình duyệt không ở tiền cảnh: không cộng gì.
// Phần THUẦN (không đọc đồng hồ, không đụng đĩa) — test được ngoài Windows.

public sealed class TabDangXem
{
    /// <summary>Họ Chromium mà lịch sử đọc được (ChromiumHistorySource): Chrome, Edge, Brave.</summary>
    public static readonly string[] TrinhDuyet = { "chrome.exe", "msedge.exe", "brave.exe" };

    private readonly object _khoa = new();
    private readonly Dictionary<(string Ngay, string TieuDe), double> _giay = new();   // CHỈ trong RAM: tiêu đề tab không bao giờ ghi đĩa
    private readonly Dictionary<(string Ngay, string Mien), double> _mien = new();     // tiêu đề đã quy được ⇒ tên miền + giây (phần duy nhất được lưu tệp)

    public static bool LaTrinhDuyet(string? appId) => appId != null && TrinhDuyet.Contains(appId.Trim().ToLowerInvariant());

    /// <summary>Tiêu đề cửa sổ trình duyệt ⇒ tiêu đề tab (bỏ đuôi « - Microsoft Edge» (kèm tên hồ sơ), «và N trang khác», số thông báo «(3) » đầu). Rỗng ⇒ "".</summary>
    public static string ChuanHoa(string? tieuDe)
    {
        var s = (tieuDe ?? "").Replace("​", "").Replace("‎", "").Trim();
        s = Regex.Replace(s, @"\s+(and \d+ more pages?|và \d+ trang khác).*$", "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"\s+[-–—]\s+(Microsoft\s*Edge|Google Chrome|Brave|Chromium)(\s+[-–—].*)?$", "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"^\(\d+\)\s+", "");
        return s.Trim();
    }

    /// <summary>Một nhịp: tiền cảnh là <paramref name="appId"/> với cửa sổ <paramref name="tieuDe"/>, đã trôi <paramref name="giay"/> giây. Không phải trình duyệt ⇒ bỏ.</summary>
    public void Ghi(string ngay, string? appId, string? tieuDe, double giay)
    {
        if (giay <= 0 || !LaTrinhDuyet(appId)) return;
        var t = ChuanHoa(tieuDe);
        if (t.Length == 0) return;
        lock (_khoa) { _giay[(ngay, t)] = (_giay.TryGetValue((ngay, t), out var c) ? c : 0) + giay; }
    }

    public Dictionary<(string Ngay, string TieuDe), double> ChupAnh()
    {
        lock (_khoa) return new Dictionary<(string, string), double>(_giay);
    }

    /// <summary>Nạp sổ theo TÊN MIỀN đã lưu tệp (lấy giá trị lớn hơn).</summary>
    public void Nap(IEnumerable<KeyValuePair<(string Ngay, string Mien), double>> cu)
    {
        lock (_khoa) foreach (var kv in cu) _mien[kv.Key] = Math.Max(_mien.TryGetValue(kv.Key, out var c) ? c : 0, kv.Value);
    }

    /// <summary>Quy các tiêu đề đang giữ trong RAM ra tên miền bằng lịch sử: tiêu đề quy được ⇒ cộng vào sổ tên miền rồi BỎ khỏi RAM (không cộng đôi);
    /// chưa quy được ⇒ giữ lại thử lần sau (trang mới chưa vào lịch sử).</summary>
    public void Chot(IEnumerable<WebVisit> visits)
    {
        List<string> tieu;
        lock (_khoa) { if (_giay.Count == 0) return; tieu = _giay.Keys.Select(k => k.TieuDe).Distinct().ToList(); }
        var quy = QuyTungTieuDe(tieu, visits);   // dựng từ điển tiêu đề NGOÀI khoá — không chặn nhịp đếm giờ
        lock (_khoa)
        {
            foreach (var k in _giay.Keys.ToList())
            {
                if (!quy.TryGetValue(k.TieuDe, out var mien)) continue;
                _mien[(k.Ngay, mien)] = (_mien.TryGetValue((k.Ngay, mien), out var c) ? c : 0) + _giay[k];
                _giay.Remove(k);
            }
        }
    }

    public Dictionary<(string Ngay, string Mien), double> GiayTheoMien()
    {
        lock (_khoa) return new Dictionary<(string, string), double>(_mien);
    }

    /// <summary>Ngày đã có dữ liệu tab (đã quy hoặc còn chờ quy).</summary>
    public HashSet<string> NgayDaGhi()
    {
        lock (_khoa) return _giay.Keys.Select(k => k.Ngay).Concat(_mien.Keys.Select(k => k.Ngay)).ToHashSet();
    }

    /// <summary>Bỏ ngày cũ hơn <paramref name="giuTu"/> (yyyy-MM-dd, so chuỗi) — sổ không phình mãi.</summary>
    public void DonCu(string giuTu)
    {
        lock (_khoa)
        {
            foreach (var k in _giay.Keys.Where(k => string.CompareOrdinal(k.Ngay, giuTu) < 0).ToList()) _giay.Remove(k);
            foreach (var k in _mien.Keys.Where(k => string.CompareOrdinal(k.Ngay, giuTu) < 0).ToList()) _mien.Remove(k);
        }
    }

    /// <summary>Các ngày đã có giây tab trong sổ.</summary>
    public HashSet<string> NgayDaGhi(IReadOnlyDictionary<(string Ngay, string TieuDe), double> snap) => snap.Keys.Select(k => k.Ngay).ToHashSet();

    /// <summary>Quy giây theo tiêu đề ⇒ giây theo (ngày, tên miền) nhờ lịch sử: tiêu đề KHỚP ĐÚNG tiêu đề một lượt ghé (lấy lượt GẦN NHẤT). Tiêu đề còn đuôi
    /// lạ (« - Personal», « - [InPrivate]», tên hồ sơ) ⇒ cắt dần từng đoạn « - » cuối rồi thử lại; không khớp tiền tố lỏng (tránh gán «Google» cho mọi trang).
    /// Không quy được (trang mới chưa vào lịch sử, trang nội bộ, InPrivate) ⇒ bỏ.</summary>
    public static Dictionary<(string Ngay, string Mien), double> QuyTenMien(IReadOnlyDictionary<(string Ngay, string TieuDe), double> giay, IEnumerable<WebVisit> visits)
    {
        var quy = QuyTungTieuDe(giay.Keys.Select(k => k.TieuDe).Distinct(), visits);
        var kq = new Dictionary<(string, string), double>();
        foreach (var ((ngay, tieu), s) in giay)
        {
            if (!quy.TryGetValue(tieu, out var mien)) continue;
            kq[(ngay, mien)] = (kq.TryGetValue((ngay, mien), out var c) ? c : 0) + s;
        }
        return kq;
    }

    /// <summary>Tiêu đề tab ⇒ tên miền (chỉ những tiêu đề quy được).</summary>
    public static Dictionary<string, string> QuyTungTieuDe(IEnumerable<string> tieuDe, IEnumerable<WebVisit> visits)
    {
        var theoTieuDe = new Dictionary<string, (string Mien, DateTimeOffset Luc)>(StringComparer.OrdinalIgnoreCase);
        foreach (var v in visits)
        {
            if (string.IsNullOrWhiteSpace(v.TieuDe)) continue;
            var mien = WebDomain.Goc(v.Url);
            if (mien == null) continue;
            var t = ChuanHoa(v.TieuDe);
            if (t.Length == 0) continue;
            if (!theoTieuDe.TryGetValue(t, out var cu) || v.Luc > cu.Luc) theoTieuDe[t] = (mien, v.Luc);
        }
        var kq = new Dictionary<string, string>();
        foreach (var tieu in tieuDe)
        {
            string? mien = null;
            for (var t = tieu; t.Length > 0 && mien == null;)
            {
                if (theoTieuDe.TryGetValue(t, out var m)) { mien = m.Mien; break; }
                var cat = t.LastIndexOf(" - ", StringComparison.Ordinal);
                t = cat > 0 ? t[..cat].TrimEnd() : "";
            }
            if (mien != null) kq[tieu] = mien;
        }
        return kq;
    }
}
