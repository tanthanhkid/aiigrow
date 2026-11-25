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
}
