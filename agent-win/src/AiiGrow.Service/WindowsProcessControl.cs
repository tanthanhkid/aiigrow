using System.Diagnostics;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// Bản Windows của <see cref="IProcessControl"/>: liệt kê tiến trình trong phiên của con và đóng theo Id.
/// Đây là lớp DUY NHẤT chạm tiến trình thật — mọi quyết định đóng nằm ở lớp thuần <see cref="ProcessEnforcer"/> (test bằng bản giả).
/// </summary>
public sealed class WindowsProcessControl : IProcessControl
{
    private List<string> _khongDoc = new();
    /// <summary>#698: tên tiến trình trong phiên Con KHÔNG đọc được đường dẫn ở lượt liệt kê gần nhất (luật không xét được — AgentWorker ghi nhật ký).
    /// Lấy một lần: gọi xong là rỗng (lượt sau không liệt kê thì không báo lại danh sách cũ).</summary>
    public IReadOnlyList<string> LayKhongDocDuoc()
    {
        var ds = _khongDoc;
        _khongDoc = new();
        return ds;
    }
    /// <summary>#698: lý do lần <see cref="Close"/> GẦN NHẤT thất bại vì Windows từ chối (thiếu quyền, tiến trình được bảo vệ…); null = lần gần nhất
    /// không phải bị từ chối (tiến trình đã tự thoát trước khi đóng).</summary>
    public string? LoiDongCuoi { get; private set; }

    public IEnumerable<RunningProc> ListChildProcesses(int sessionId)
    {
        var khongDoc = new List<string>();
        _khongDoc = khongDoc;
        foreach (var p in Process.GetProcesses())
        {
            string? path = null;
            int id = 0;
            string? ten = null;
            try
            {
                // KHÔNG dùng Process.MainModule (đọc cả danh sách module — tốn CPU, lỗi với tiến trình 32-bit / được bảo vệ):
                // QueryFullProcessImageName(PROCESS_QUERY_LIMITED_INFORMATION). Không đọc được ⇒ BỎ QUA (như trước): ProcessEnforcer cần đường
                // dẫn đầy đủ để giữ app trong thư mục hệ thống — tên trần sẽ bị coi là ngoài thư mục an toàn.
                if (p.SessionId == sessionId)
                {
                    id = p.Id; path = SessionHelper.ImagePath(id);
                    if (string.IsNullOrEmpty(path)) { try { ten = p.ProcessName; } catch { ten = null; } }   // vừa thoát ⇒ ProcessName lỗi, không ghi
                }
            }
            catch { }
            finally { p.Dispose(); }
            if (!string.IsNullOrEmpty(path)) yield return new RunningProc(id, path!);
            else if (ten != null) khongDoc.Add(ten.ToLowerInvariant());
        }
    }

    /// <summary>Tên exe (chữ thường) đang chạy trong phiên — cho «đang chơi thật» (TienCanhChoi). Chỉ đọc ProcessName (rẻ, không mở tiến trình).</summary>
    public static HashSet<string> TenTrongPhien(int sessionId)
    {
        var s = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in Process.GetProcesses())
        {
            try { if (p.SessionId == sessionId) s.Add(p.ProcessName.ToLowerInvariant() + ".exe"); }
            catch { }
            finally { p.Dispose(); }
        }
        return s;
    }

    public bool Close(int processId)
    {
        LoiDongCuoi = null;
        try
        {
            using var p = Process.GetProcessById(processId);
            p.Kill();
            return true;
        }
        catch (ArgumentException) { return false; }            // đã thoát trước khi đóng (GetProcessById) — không phải bị từ chối
        catch (InvalidOperationException) { return false; }    // thoát giữa chừng
        catch (Exception e) { LoiDongCuoi = e.Message; return false; }
    }
}
