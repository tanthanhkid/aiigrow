namespace AiiGrow.Core;

/// <summary>#641: quy cửa sổ tiền cảnh của ApplicationFrameHost.exe về app UWP thật (Solitaire, Photos…). Lớp THUẦN, test được —
/// phần gọi Win32 nằm ở khay (UI.cs).</summary>
public static class UwpTienCanh
{
    public const string LopCoreWindow = "Windows.UI.Core.CoreWindow";

    /// <summary>Pid của cửa sổ CoreWindow thuộc tiến trình khác host (0 = không thấy). Chỉ nhận đúng lớp CoreWindow — cửa sổ khác cùng tiêu đề
    /// (Explorer, trình duyệt…) không được quy nhầm thành app.</summary>
    public static uint ChonPid(IEnumerable<(uint Pid, string Lop)> cuaSo, uint hostPid)
    {
        foreach (var c in cuaSo) if (c.Lop == LopCoreWindow && c.Pid != 0 && c.Pid != hostPid) return c.Pid;
        return 0;
    }

    /// <summary>Tên tiến trình host của app UWP (cửa sổ khung).</summary>
    public const string Host = "applicationframehost.exe";

    /// <summary>#696: khay không quy được cửa sổ ApplicationFrameHost về app thật (CoreWindow không thấy — app treo, toàn màn hình, đổi tiêu đề)
    /// ⇒ tiền cảnh là app UWP nào đó. Nếu một app «Tính phút» (<paramref name="tinhPhut"/>) đang chạy trong phiên Con thì quy phút về app đó
    /// (an toàn trước: lỗi nhận diện cửa sổ không làm đồng hồ ngừng). Không có ⇒ null (giữ nguyên tiền cảnh).
    /// <paramref name="duongDan"/>: đường dẫn exe các tiến trình của phiên; <paramref name="mucChinh"/>: exe bí danh → muc chính (#690/#695).</summary>
    public static string? QuyHostVeAppTinhPhut(IEnumerable<string> tinhPhut, IEnumerable<string> duongDan, IReadOnlyDictionary<string, string>? mucChinh = null)
    {
        var dangChay = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var d in duongDan)
        {
            if (string.IsNullOrWhiteSpace(d)) continue;
            var id = ProcessGuard.TenGoiStore(d) ?? DanhSachApp.TenTep(d.Replace('/', '\\')).ToLowerInvariant();
            if (id.Length == 0 || string.Equals(id, Host, StringComparison.OrdinalIgnoreCase)) continue;
            dangChay.Add(mucChinh != null && mucChinh.TryGetValue(id, out var chinh) ? chinh : id);
        }
        foreach (var m in tinhPhut) if (!string.IsNullOrEmpty(m) && dangChay.Contains(m)) return m.ToLowerInvariant();
        return null;
    }
}
