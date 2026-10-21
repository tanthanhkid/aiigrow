namespace AiiGrow.Core;

/// <summary>Cộng dồn phút dùng theo (ngày, app) trong tiến trình dịch vụ: máy chủ AiiGrow ghi usage bằng greatest(…), nên mỗi lần đồng bộ
/// gửi TỔNG của ngày. Dịch vụ khởi động lại ⇒ đếm lại từ 0 trong ngày; máy chủ giữ số lớn hơn nên không mất phút đã ghi.</summary>
public sealed class UsageTotals
{
    public static readonly UsageTotals Shared = new();
    private readonly Dictionary<(string Day, string App), (string Name, int Minutes)> _tong = new();
    private readonly object _khoa = new();

    /// <summary>Cộng phần tăng vào tổng; trả tổng của các ngày vừa có phần tăng (giữ tối đa 3 ngày gần nhất).</summary>
    public List<UsageEntry> Add(IReadOnlyList<UsageEntry> tang)
    {
        lock (_khoa)
        {
            foreach (var u in tang)
            {
                var k = (u.Day, u.AppId.ToLowerInvariant());
                var cu = _tong.TryGetValue(k, out var v) ? v.Minutes : 0;
                _tong[k] = (u.AppName, cu + u.Minutes);
            }
            var ngay = _tong.Keys.Select(k => k.Day).Distinct().OrderByDescending(d => d, StringComparer.Ordinal).Take(3).ToHashSet();
            foreach (var k in _tong.Keys.Where(k => !ngay.Contains(k.Day)).ToList()) _tong.Remove(k);
            var co = tang.Select(u => u.Day).ToHashSet();
            return _tong.Where(x => co.Contains(x.Key.Day)).Select(x => new UsageEntry(x.Key.Day, x.Key.App, x.Value.Name, x.Value.Minutes)).ToList();
        }
    }
}
