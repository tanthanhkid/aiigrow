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
