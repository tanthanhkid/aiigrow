using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>Cộng dồn phút dùng theo (ngày, app, bé): máy chủ AiiGrow ghi usage bằng greatest(…) và trừ sao phần TỔNG tăng thêm, nên mỗi lần đồng bộ
/// gửi TỔNG của ngày.
/// #433 A1: phút rút khỏi bộ đếm giây (<see cref="UsageTracker.Drain"/>) vào thẳng tổng — gửi lỗi thì KHÔNG trả lại bộ đếm (trước đây trả lại mà tổng đã
/// cộng ⇒ mỗi lần thử lại cộng đôi, có mạng lại bé bị trừ sạch sao). Lần sau gửi lại đúng tổng (máy chủ greatest ⇒ gửi lặp không trừ thêm).
/// #433 A2: tổng lưu ra tệp (<see cref="DungTep"/>) ⇒ dịch vụ khởi động lại / cập nhật vẫn đếm tiếp từ số cũ, không về 0 (trước đây máy chủ giữ số
/// lớn ⇒ không trừ sao tới khi vượt số cũ = tắt/bật máy là chơi miễn phí).</summary>
public sealed class UsageTotals
{
    public static readonly UsageTotals Shared = new();
    private readonly Dictionary<(string Day, string App, string Con), Dong> _tong = new();
    private readonly object _khoa = new();
    private string? _tep;
    private string? _may;

    private sealed class Dong
    {
        public string Name { get; set; } = "";
        public int Minutes { get; set; }
        /// <summary>Tổng máy chủ đã nhận (lần gửi thành công gần nhất).</summary>
        public int DaGui { get; set; }
        /// <summary>#433 A3: lần cuối app được tính dùng (giờ máy).</summary>
        public DateTimeOffset? CuoiLuc { get; set; }
    }

    private sealed class TepTong
    {
        public string? May { get; set; }
        public List<DongTep> Dong { get; set; } = new();
    }

    private sealed class DongTep
    {
        public string Day { get; set; } = "";
        public string App { get; set; } = "";
        public string? Con { get; set; }
        public string Name { get; set; } = "";
        public int Minutes { get; set; }
        public int DaGui { get; set; }
        public DateTimeOffset? CuoiLuc { get; set; }
    }

    /// <summary>Lưu tổng ở <paramref name="tep"/> (dịch vụ: %ProgramData%\AiiGrow\phut-da-dem.json) và nạp số đã lưu. Tệp hỏng / không đọc được ⇒ bắt đầu từ
    /// số đang có trong bộ nhớ (máy chủ vẫn giữ số lớn bằng greatest, chỉ là như trước #433).</summary>
    public void DungTep(string tep)
    {
        lock (_khoa)
        {
            _tep = tep;
            try
            {
                if (!File.Exists(tep)) return;
                var d = JsonSerializer.Deserialize<TepTong>(File.ReadAllText(tep), Json.Options);
                if (d == null) return;
                _may ??= d.May;
                var boAiiGrow = false;
                foreach (var x in d.Dong ?? new())
                {
                    if (x == null || string.IsNullOrEmpty(x.Day) || string.IsNullOrEmpty(x.App)) continue;
                    // #780: bản cũ từng đếm chính khay («aiigrow.tray.exe 23 phút») — bỏ dòng app của AiiGrow khi nạp, ghi lại tệp sạch.
                    // (Phút mới không lọc ở đây: AgentWorker đã bỏ khay thật theo thư mục cài; máy chủ cũng không ghi dòng AiiGrow.)
                    if (AppAiiGrow.La(x.App)) { boAiiGrow = true; continue; }
                    var k = (x.Day, x.App.ToLowerInvariant(), x.Con ?? "");
                    var cu = _tong.TryGetValue(k, out var v) ? v : null;
                    // bộ nhớ đã đếm thêm trước khi nạp (hiếm) ⇒ cộng phần trong bộ nhớ lên số đã lưu
                    _tong[k] = new Dong { Name = x.Name, Minutes = Math.Max(0, x.Minutes) + (cu?.Minutes ?? 0), DaGui = Math.Max(0, Math.Max(x.DaGui, cu?.DaGui ?? 0)), CuoiLuc = Muon(x.CuoiLuc, cu?.CuoiLuc) };
                }
                Tia();
                if (boAiiGrow) Luu();
            }
            catch (Exception) { }   // tệp hỏng kiểu nào cũng không được làm dịch vụ chết lúc khởi động
        }
    }

    /// <summary>Cộng phần tăng vào tổng (và lưu tệp); trả tổng của các ngày vừa có phần tăng (giữ tối đa 3 ngày gần nhất).</summary>
    public List<UsageEntry> Add(IReadOnlyList<UsageEntry> tang)
    {
        lock (_khoa)
        {
            foreach (var u in tang)
            {
                if (u.Minutes <= 0) continue;
                var k = (u.Day, u.AppId.ToLowerInvariant(), u.Con ?? "");
                if (!_tong.TryGetValue(k, out var v)) _tong[k] = v = new Dong();
                v.Name = u.AppName;
                v.Minutes += u.Minutes;
                v.CuoiLuc = Muon(v.CuoiLuc, u.CuoiLuc);
            }
            // đồng hồ từng chạy nhanh rồi được chỉnh lại: dòng «tương lai» trong tệp sẽ đẩy ngày hôm nay ra khỏi 3 ngày giữ lại ⇒ bỏ
            var moiNhat = tang.Select(u => u.Day).DefaultIfEmpty("").Max(StringComparer.Ordinal) ?? "";
            if (moiNhat.Length > 0)
                foreach (var k in _tong.Keys.Where(k => string.CompareOrdinal(k.Day, moiNhat) > 0).ToList()) _tong.Remove(k);
            Tia();
            if (tang.Count > 0) Luu();
            var co = tang.Select(u => u.Day).ToHashSet();
            return _tong.Where(x => co.Contains(x.Key.Day)).Select(x => Ra(x.Key, x.Value)).ToList();
        }
    }

    /// <summary>Gắn tổng với id máy hiện tại. Khác máy đã lưu ⇒ bỏ số cũ. Gọi TRƯỚC <see cref="Add"/> phút mới rút ra — gọi sau thì lần
    /// đồng bộ đầu sau khi ghép lại mất luôn phút vừa đếm.</summary>
    public void ChoMay(string? may)
    {
        if (string.IsNullOrEmpty(may)) return;
        lock (_khoa)
        {
            if (_may != null && _may != may) _tong.Clear();
            if (_may != may) { _may = may; Luu(); }
        }
    }

    /// <summary>Các dòng có tổng mới hơn số máy chủ đã nhận — gửi kèm lần đồng bộ này. <paramref name="may"/> = id máy hiện tại: khác máy đã lưu
    /// (ghép lại máy với gia đình khác / bản ghi máy mới) ⇒ bỏ số cũ (máy chủ của bản ghi mới chưa có gì, gửi số cũ là trừ sao oan).</summary>
    public List<UsageEntry> CanGui(string? may = null)
    {
        lock (_khoa)
        {
            ChoMay(may);
            return _tong.Where(x => x.Value.Minutes > x.Value.DaGui).Select(x => Ra(x.Key, x.Value)).ToList();
        }
    }

    /// <summary>Máy chủ đã nhận <paramref name="daGui"/> (lần đồng bộ thành công) ⇒ không gửi lại các tổng đó. Không ghi tệp riêng cho việc này
    /// (lần <see cref="Add"/> sau ghi kèm): khởi động lại trước đó chỉ gửi lại tổng cũ — máy chủ greatest, không trừ thêm.</summary>
    public void DaGui(IEnumerable<UsageEntry> daGui)
    {
        lock (_khoa)
            foreach (var u in daGui)
                if (_tong.TryGetValue((u.Day, u.AppId.ToLowerInvariant(), u.Con ?? ""), out var v) && u.Minutes > v.DaGui) v.DaGui = u.Minutes;
    }

    private static UsageEntry Ra((string Day, string App, string Con) k, Dong v)
        => new(k.Day, k.App, v.Name, v.Minutes, k.Con.Length > 0 ? k.Con : null, v.CuoiLuc);

    private static DateTimeOffset? Muon(DateTimeOffset? a, DateTimeOffset? b) => a == null ? b : b == null ? a : (a > b ? a : b);

    /// <summary>Chỉ giữ 3 ngày gần nhất. Gọi trong khoá.</summary>
    private void Tia()
    {
        var ngay = _tong.Keys.Select(k => k.Day).Distinct().OrderByDescending(d => d, StringComparer.Ordinal).Take(3).ToHashSet();
        foreach (var k in _tong.Keys.Where(k => !ngay.Contains(k.Day)).ToList()) _tong.Remove(k);
    }

    /// <summary>Ghi tệp (tạm rồi đổi tên — mất điện giữa chừng không để tệp dở). Lỗi ⇒ bỏ qua (lần sau ghi lại). Gọi trong khoá.</summary>
    private void Luu()
    {
        if (_tep == null) return;
        try
        {
            var d = new TepTong
            {
                May = _may,
                Dong = _tong.Select(x => new DongTep { Day = x.Key.Day, App = x.Key.App, Con = x.Key.Con.Length > 0 ? x.Key.Con : null, Name = x.Value.Name, Minutes = x.Value.Minutes, DaGui = x.Value.DaGui, CuoiLuc = x.Value.CuoiLuc }).ToList(),
            };
            var dir = Path.GetDirectoryName(_tep);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            var tam = _tep + ".tmp";
            File.WriteAllText(tam, JsonSerializer.Serialize(d, Json.Options));
            File.Move(tam, _tep, true);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
    }
}
