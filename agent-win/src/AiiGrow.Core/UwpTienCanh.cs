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
    /// ⇒ tiền cảnh là một app UWP / Store. Nếu một app Store «Tính phút» (<paramref name="tinhPhut"/>) đang chạy trong phiên Con thì quy phút về app đó
    /// (an toàn trước: lỗi nhận diện cửa sổ không làm đồng hồ ngừng). CHỈ xét tiến trình của gói Store (đường dẫn WindowsApps, hoặc exe của gói ngoài
    /// WindowsApps — <paramref name="exeGoi"/>): app Win32 chạy nền (Roblox thu nhỏ) không bị tính thay. Không có ⇒ null (giữ nguyên tiền cảnh).
    /// <paramref name="mucChinh"/>: muc bí danh → muc chính (#690).</summary>
    public static string? QuyHostVeAppTinhPhut(IEnumerable<string> tinhPhut, IEnumerable<string> duongDan,
        IReadOnlyDictionary<string, string>? mucChinh = null, IReadOnlyDictionary<string, string>? exeGoi = null)
    {
        var dangChay = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var d in duongDan)
        {
            if (string.IsNullOrWhiteSpace(d)) continue;
            var goi = ProcessGuard.TenGoiStore(d);
            if (goi == null && exeGoi != null) exeGoi.TryGetValue(DanhSachApp.TenTep(d.Replace('/', '\\')), out goi);
            if (string.IsNullOrEmpty(goi)) continue;
            dangChay.Add(mucChinh != null && mucChinh.TryGetValue(goi, out var chinh) ? chinh : goi);
        }
        foreach (var m in tinhPhut) if (!string.IsNullOrEmpty(m) && dangChay.Contains(m)) return m.ToLowerInvariant();
        return null;
    }
}
