using System.ComponentModel;
using System.Runtime.InteropServices;

namespace AiiGrow.Core;

/// <summary>
/// #739: bé mở Task Manager › End task AiiGrow.Tray ⇒ dịch vụ (SYSTEM) bật lại khay trong phiên đang ngồi trước máy. Trước đây khay tắt là tắt hẳn: dịch vụ vẫn
/// chặn app nhưng bé mất hộp giải thích và nút «Xin Ba Mẹ». Quyết định (thuần, test được) tách khỏi việc khởi động tiến trình.
/// </summary>
public sealed class KhayTuBatLai
{
    public static readonly TimeSpan ChoTruocKhiBat = TimeSpan.FromSeconds(20);  // chịu được khay đang khởi động (Run key chậm lúc đăng nhập) / cập nhật đè
    public static readonly TimeSpan CachNhauToiThieu = TimeSpan.FromSeconds(30); // khay chết liên tục ⇒ không bật dồn dập

    private DateTimeOffset? _matTu;
    private DateTimeOffset? _lanCuoi;

    /// <param name="coKhay">có tiến trình khay trong phiên đang ngồi trước máy.</param>
    /// <param name="coNguoiDung">phiên đó có người đăng nhập (không phải màn đăng nhập).</param>
    /// <param name="dangGo">đang gỡ AiiGrow ⇒ không bật lại.</param>
    /// <returns>true ⇒ nên bật khay NGAY (đã ghi mốc lần bật).</returns>
    public bool CanBat(DateTimeOffset now, bool coKhay, bool coNguoiDung, bool dangGo)
    {
        if (coKhay || !coNguoiDung || dangGo) { _matTu = null; return false; }
        _matTu ??= now;
        if (now - _matTu.Value < ChoTruocKhiBat) return false;
        if (_lanCuoi != null && now - _lanCuoi.Value < CachNhauToiThieu) return false;
        _lanCuoi = now;
        return true;
    }
}

/// <summary>Chạy một exe trong phiên người dùng từ dịch vụ SYSTEM (WTSQueryUserToken + CreateProcessAsUser).</summary>
public static class KhoiDongTrongPhien
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb; public string? lpReserved; public string? lpDesktop; public string? lpTitle;
        public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
        public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }

    [DllImport("wtsapi32.dll", SetLastError = true)] private static extern bool WTSQueryUserToken(uint sessionId, out IntPtr token);
    [DllImport("userenv.dll", SetLastError = true)] private static extern bool CreateEnvironmentBlock(out IntPtr env, IntPtr token, bool inherit);
    [DllImport("userenv.dll", SetLastError = true)] private static extern bool DestroyEnvironmentBlock(IntPtr env);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool CloseHandle(IntPtr h);
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CreateProcessAsUser(IntPtr token, string? app, string cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string? dir,
        ref STARTUPINFO si, out PROCESS_INFORMATION pi);

    private const uint CreateUnicodeEnvironment = 0x400, CreateNoWindow = 0;

    /// <summary>Chạy <paramref name="exe"/> trong phiên <paramref name="sessionId"/> bằng quyền chính người dùng đó. Ném lỗi có mã Win32 nếu thất bại.</summary>
    public static void Chay(int sessionId, string exe)
    {
        if (!WTSQueryUserToken((uint)sessionId, out var token)) throw new Win32Exception(Marshal.GetLastWin32Error(), "WTSQueryUserToken");
        IntPtr env = IntPtr.Zero;
        try
        {
            if (!CreateEnvironmentBlock(out env, token, false)) env = IntPtr.Zero;
            var si = new STARTUPINFO { cb = Marshal.SizeOf<STARTUPINFO>(), lpDesktop = @"winsta0\default" };
            if (!CreateProcessAsUser(token, null, "\"" + exe + "\"", IntPtr.Zero, IntPtr.Zero, false, CreateUnicodeEnvironment | CreateNoWindow, env,
                    Path.GetDirectoryName(exe), ref si, out var pi))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateProcessAsUser");
            CloseHandle(pi.hThread); CloseHandle(pi.hProcess);
        }
        finally
        {
            if (env != IntPtr.Zero) DestroyEnvironmentBlock(env);
            CloseHandle(token);
        }
    }
}
