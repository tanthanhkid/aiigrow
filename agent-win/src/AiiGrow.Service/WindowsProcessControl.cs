using System.Diagnostics;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// Bản Windows của <see cref="IProcessControl"/>: liệt kê tiến trình trong phiên của con và đóng theo Id.
/// Đây là lớp DUY NHẤT chạm tiến trình thật — mọi quyết định đóng nằm ở lớp thuần <see cref="ProcessEnforcer"/> (test bằng bản giả).
/// </summary>
public sealed class WindowsProcessControl : IProcessControl
{
    public IEnumerable<RunningProc> ListChildProcesses(int sessionId)
    {
        foreach (var p in Process.GetProcesses())
        {
            string? path = null;
            int id = 0;
            try
            {
                if (p.SessionId == sessionId) { path = p.MainModule?.FileName; id = p.Id; }
            }
            catch { }
            finally { p.Dispose(); }
            if (!string.IsNullOrEmpty(path)) yield return new RunningProc(id, path!);
        }
    }

    public bool Close(int processId)
    {
        try
        {
            using var p = Process.GetProcessById(processId);
            p.Kill();
            return true;
        }
        catch { return false; }
    }
}
