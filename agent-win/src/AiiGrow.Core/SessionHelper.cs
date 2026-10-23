using System.Runtime.InteropServices;

namespace AiiGrow.Core;

public sealed record ChildSession(int SessionId, bool Active);

/// <summary>Tìm phiên đăng nhập của tài khoản con và ngắt phiên (WTS).</summary>
public static class SessionHelper
{
    private const int WTSUserName = 5;
    private const int WTSActive = 0;

    [StructLayout(LayoutKind.Sequential)]
    private struct WTS_SESSION_INFO
    {
        public int SessionId;
        public IntPtr pWinStationName;
        public int State;
    }

    [DllImport("wtsapi32.dll", EntryPoint = "WTSEnumerateSessionsW", SetLastError = true)]
    private static extern bool WTSEnumerateSessions(IntPtr hServer, int reserved, int version, out IntPtr ppSessionInfo, out int pCount);

    [DllImport("wtsapi32.dll")]
    private static extern void WTSFreeMemory(IntPtr pMemory);

    [DllImport("wtsapi32.dll", EntryPoint = "WTSQuerySessionInformationW", SetLastError = true)]
    private static extern bool WTSQuerySessionInformation(IntPtr hServer, int sessionId, int infoClass, out IntPtr buffer, out int bytesReturned);

    [DllImport("wtsapi32.dll", SetLastError = true)]
    private static extern bool WTSDisconnectSession(IntPtr hServer, int sessionId, bool wait);

    [DllImport("wtsapi32.dll", SetLastError = true)]
    private static extern bool WTSLogoffSession(IntPtr hServer, int sessionId, bool wait);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetNamedPipeClientSessionId(IntPtr pipe, out uint clientSessionId);

    [DllImport("kernel32.dll")]
    private static extern uint WTSGetActiveConsoleSessionId();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetNamedPipeClientProcessId(IntPtr pipe, out uint clientProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);

    [DllImport("kernel32.dll", EntryPoint = "QueryFullProcessImageNameW", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, System.Text.StringBuilder name, ref uint size);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr h);

    private const int WTSSessionInfoEx = 25;
    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    /// <summary>Phiên <paramref name="sessionId"/> đang KHOÁ màn hình không (WTSINFOEX_LEVEL1.SessionFlags: WTS_SESSIONSTATE_LOCK = 0,
    /// UNLOCK = 1 trên Windows 10+). Không đọc được / giá trị lạ ⇒ null (người gọi coi là «không rõ»).</summary>
    public static bool? IsLocked(int sessionId)
    {
        if (sessionId < 0) return null;
        try
        {
            if (!WTSQuerySessionInformation(IntPtr.Zero, sessionId, WTSSessionInfoEx, out var buf, out var n)) return null;
            try
            {
                // WTSINFOEXW { DWORD Level; WTSINFOEX_LEVEL_W Data } — Data căn 8 byte (có LARGE_INTEGER) ⇒ offset 8; SessionFlags là trường thứ ba ⇒ 8 + 8.
                if (n < 20 || Marshal.ReadInt32(buf, 0) != 1) return null;
                return Marshal.ReadInt32(buf, 16) switch { 0 => true, 1 => false, _ => null };
            }
            finally { WTSFreeMemory(buf); }
        }
        catch { return null; }
    }

    /// <summary>Đường dẫn đầy đủ exe của tiến trình khách named pipe (null nếu không đọc được).</summary>
    public static string? PipeClientImage(IntPtr pipeHandle)
    {
        try
        {
            if (!GetNamedPipeClientProcessId(pipeHandle, out var pid)) return null;
            var h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if (h == IntPtr.Zero) return null;
            try
            {
                var sb = new System.Text.StringBuilder(1024);
                uint size = (uint)sb.Capacity;
                return QueryFullProcessImageName(h, 0, sb, ref size) ? sb.ToString(0, (int)size) : null;
            }
            finally { CloseHandle(h); }
        }
        catch { return null; }
    }

    /// <summary>Phiên đang gắn với màn hình/bàn phím thật (người đang ngồi trước máy); -1 nếu không có.</summary>
    public static int ActiveConsoleSession()
    {
        try { var id = WTSGetActiveConsoleSessionId(); return id == 0xFFFFFFFF ? -1 : (int)id; }
        catch { return -1; }
    }

    /// <summary>Tài khoản đang đăng nhập ở phiên trước màn hình ("" = màn đăng nhập/khoá chưa ai, hoặc không đọc được).</summary>
    public static string ConsoleUser()
    {
        var s = ActiveConsoleSession();
        if (s <= 0) return "";
        try { return QueryString(s, WTSUserName); } catch { return ""; }
    }

    /// <summary>Phiên của tài khoản <paramref name="userName"/> (ưu tiên phiên đang Active), null nếu chưa đăng nhập.</summary>
    public static ChildSession? Find(string userName)
    {
        if (string.IsNullOrWhiteSpace(userName)) return null;
        if (!WTSEnumerateSessions(IntPtr.Zero, 0, 1, out var ptr, out var count)) return null;
        ChildSession? best = null;
        try
        {
            int size = Marshal.SizeOf<WTS_SESSION_INFO>();
            for (int i = 0; i < count; i++)
            {
                var info = Marshal.PtrToStructure<WTS_SESSION_INFO>(IntPtr.Add(ptr, i * size));
                if (info.SessionId == 0) continue;
                var user = QueryString(info.SessionId, WTSUserName);
                if (!string.Equals(user, userName, StringComparison.OrdinalIgnoreCase)) continue;
                var s = new ChildSession(info.SessionId, info.State == WTSActive);
                if (best == null || (s.Active && !best.Active)) best = s;
            }
        }
        finally
        {
            WTSFreeMemory(ptr);
        }
        return best;
    }

    private static string QueryString(int sessionId, int infoClass)
    {
        if (!WTSQuerySessionInformation(IntPtr.Zero, sessionId, infoClass, out var buf, out _)) return "";
        try { return Marshal.PtrToStringUni(buf) ?? ""; }
        finally { WTSFreeMemory(buf); }
    }

    /// <summary>Ngắt phiên (không đóng app đang mở; con quay lại màn đăng nhập).</summary>
    public static bool Disconnect(int sessionId) => WTSDisconnectSession(IntPtr.Zero, sessionId, false);

    public static bool Logoff(int sessionId) => WTSLogoffSession(IntPtr.Zero, sessionId, false);

    public static int PipeClientSession(IntPtr pipeHandle)
        => GetNamedPipeClientSessionId(pipeHandle, out var id) ? (int)id : -1;
}
