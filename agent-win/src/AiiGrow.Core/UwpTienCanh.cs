namespace AiiGrow.Core;

/// <summary>#641: quy cửa sổ tiền cảnh của ApplicationFrameHost.exe về app UWP thật (Solitaire, Photos…). Lớp THUẦN, test được —
/// phần gọi Win32 nằm ở khay (UI.cs).</summary>
public static class UwpTienCanh
{
    public const string LopCoreWindow = "Windows.UI.Core.CoreWindow";

    /// <summary>Pid app thật trong số cửa sổ con / cửa sổ cùng tiêu đề: ưu tiên CoreWindow, không có thì cửa sổ đầu tiên khác pid host; 0 = không thấy.</summary>
    public static uint ChonPid(IEnumerable<(uint Pid, string Lop)> cuaSo, uint hostPid)
    {
        var kh = cuaSo.Where(c => c.Pid != 0 && c.Pid != hostPid).ToList();
        foreach (var c in kh) if (c.Lop == LopCoreWindow) return c.Pid;
        return kh.Count > 0 ? kh[0].Pid : 0;
    }

    /// <summary>Dự phòng cuối: khớp tiêu đề cửa sổ với tên mô tả / tên tiến trình của các tiến trình trong gói Store (không phân biệt hoa thường).
    /// Chỉ nhận khi đúng MỘT ứng viên khớp (tránh quy nhầm app).</summary>
    public static int? ChonTheoTieuDe(string? tieuDe, IEnumerable<(int Pid, string Mo)> ungVien)
    {
        var t = (tieuDe ?? "").Trim();
        if (t.Length < 3) return null;
        var khop = ungVien.Where(u => !string.IsNullOrWhiteSpace(u.Mo)
            && (t.Contains(u.Mo.Trim(), StringComparison.OrdinalIgnoreCase) || u.Mo.Trim().Contains(t, StringComparison.OrdinalIgnoreCase)))
            .Select(u => u.Pid).Distinct().ToList();
        return khop.Count == 1 ? khop[0] : null;
    }
}
