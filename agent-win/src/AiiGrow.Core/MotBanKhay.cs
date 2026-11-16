using System.Diagnostics;

namespace AiiGrow.Core;

/// <summary>
/// #308: khay AiiGrow chạy MỘT bản mỗi phiên Windows. Trước đây bản thứ hai (Con bấm biểu tượng AiiGrow / menu Start khi khay đang chạy ngầm,
/// hoặc khay cũ «.cu-xxxx» sau cập nhật còn giữ mutex) chỉ <c>return</c> ⇒ bấm mở mà không có cửa sổ nào hiện. Giờ bản thứ hai bật sự kiện có tên
/// <see cref="TenSuKien"/> rồi thoát; bản đang chạy chờ sự kiện đó và mở app to lên trước. Khay CŨ (trước bản này) không tạo sự kiện ⇒ bản mới
/// kết thúc khay cũ cùng phiên rồi tự làm bản chính (<see cref="GianhLai"/>).
/// Không đụng WinForms (khay tự chuyển về luồng giao diện) ⇒ có test.
/// </summary>
public sealed class MotBanKhay : IDisposable
{
    public const string TenMutex = @"Local\AiiGrow.Tray";
    public const string TenSuKien = @"Local\AiiGrow.Tray.HienCuaSo";
    /// <summary>Tên tiến trình khay: «AiiGrow.Tray» và khay cũ bộ cập nhật đổi tên «AiiGrow.Tray.exe.cu-xxxxxxxx».</summary>
    public const string TienToTienTrinh = "AiiGrow.Tray";

    private readonly Mutex? _mutex;
    private readonly string _tenSuKien;
    private EventWaitHandle? _suKien;
    private RegisteredWaitHandle? _cho;
    private bool _giuMutex;

    /// <summary>true = bản chính trong phiên (giữ mutex, nhận lời gọi hiện cửa sổ).</summary>
    public bool LaBanDau { get; private set; }

    private MotBanKhay(Mutex? mutex, bool dau, string tenSuKien)
    {
        _mutex = mutex;
        _giuMutex = dau && mutex != null;
        LaBanDau = dau;
        _tenSuKien = tenSuKien;
        if (dau) _suKien = TaoSuKien(tenSuKien);
    }

    /// <summary>Tạo sự kiện; lỗi (ACL lạ, tên bị chiếm…) ⇒ null: khay vẫn chạy, chỉ thiếu «bản sau gọi hiện cửa sổ».</summary>
    private static EventWaitHandle? TaoSuKien(string ten)
    {
        try { return new EventWaitHandle(false, EventResetMode.AutoReset, ten); }
        catch (Exception e) when (e is WaitHandleCannotBeOpenedException or UnauthorizedAccessException or IOException) { return null; }
    }

    /// <summary>Giành khoá chạy một bản. Bản đầu tạo luôn sự kiện (trước khi dựng giao diện) để bản sau mở được ngay.
    /// Không tạo / mở được mutex ⇒ chạy như bản chính (như khi chưa có khoá), không chết lúc khởi động.</summary>
    public static MotBanKhay Nhan(string tenMutex = TenMutex, string tenSuKien = TenSuKien)
    {
        Mutex? m;
        bool dau;
        try { m = new Mutex(true, tenMutex, out dau); }
        catch (Exception e) when (e is WaitHandleCannotBeOpenedException or UnauthorizedAccessException or IOException) { m = null; dau = true; }
        return new MotBanKhay(m, dau, tenSuKien);
    }

    /// <summary>Bản chính: mỗi lần bản sau gọi ⇒ chạy <paramref name="hien"/> (trên luồng nền — người gọi tự chuyển về luồng giao diện).</summary>
    public void KhiDuocGoi(Action hien)
    {
        if (!LaBanDau || _suKien == null || _cho != null) return;
        _cho = ThreadPool.RegisterWaitForSingleObject(_suKien, (_, _) => { try { hien(); } catch { } }, null, Timeout.Infinite, executeOnlyOnce: false);
    }

    /// <summary>Bản sau: báo bản đang chạy hiện cửa sổ. Bản đầu vừa khởi động chưa kịp tạo sự kiện ⇒ thử lại trong <paramref name="choMs"/>.
    /// → true nếu đã báo được; false = không có bản nào nhận (khay cũ trước #308, hoặc khay đang thoát).</summary>
    public static bool GoiBanDangChay(string tenSuKien = TenSuKien, int choMs = 3000)
    {
        var het = Environment.TickCount64 + Math.Max(0, choMs);
        while (true)
        {
            try
            {
                if (EventWaitHandle.TryOpenExisting(tenSuKien, out var e))
                {
                    using (e) return e.Set();
                }
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException or IOException or WaitHandleCannotBeOpenedException) { return false; }
            if (Environment.TickCount64 >= het) return false;
            Thread.Sleep(150);
        }
    }

    /// <summary>Bản sau mà không ai nhận lời gọi (khay cũ trước #308 / khay «.cu-» sau cập nhật giữ mutex): chờ mutex được nhả (người gọi đã kết thúc
    /// khay cũ) rồi làm bản chính. → true nếu đã thành bản chính.</summary>
    public bool GianhLai(int choMs = 5000)
    {
        if (LaBanDau) return true;
        if (_mutex == null) return false;
        bool duoc;
        try { duoc = _mutex.WaitOne(Math.Max(0, choMs)); }
        catch (AbandonedMutexException) { duoc = true; }   // khay cũ bị kết thúc khi đang giữ ⇒ mutex thuộc về ta
        if (!duoc) return false;
        _giuMutex = true;
        LaBanDau = true;
        _suKien = TaoSuKien(_tenSuKien);
        return true;
    }

    /// <summary>Khay cùng phiên khác chính mình (kể cả khay cũ đổi tên «.cu-»).</summary>
    public static bool LaKhayKhac(string tenTienTrinh, int phien, int pid, int phienMinh, int pidMinh)
        => pid != pidMinh && phien == phienMinh && tenTienTrinh.StartsWith(TienToTienTrinh, StringComparison.OrdinalIgnoreCase);

    /// <summary>PID các khay khác trong phiên này.</summary>
    public static List<int> KhayKhacCungPhien()
    {
        var ra = new List<int>();
        using var minh = Process.GetCurrentProcess();
        foreach (var p in Process.GetProcesses())
        {
            using (p)
            {
                try { if (LaKhayKhac(p.ProcessName, p.SessionId, p.Id, minh.SessionId, minh.Id)) ra.Add(p.Id); }
                catch { }   // tiến trình vừa thoát / không đọc được
            }
        }
        return ra;
    }

    /// <summary>Kết thúc các khay khác cùng phiên (khay cũ không nhận lời gọi). Cùng tài khoản nên có quyền.</summary>
    public static void KetThucKhayKhac()
    {
        foreach (var id in KhayKhacCungPhien())
        {
            try { using var p = Process.GetProcessById(id); p.Kill(); p.WaitForExit(3000); }
            catch { }
        }
    }

    public void Dispose()
    {
        _cho?.Unregister(null);
        _cho = null;
        _suKien?.Dispose();
        if (_giuMutex) { try { _mutex!.ReleaseMutex(); } catch (ApplicationException) { } }
        _mutex?.Dispose();
    }
}

/// <summary>
/// #308: màn khoá giữ trên cùng mà KHÔNG gây nháy. Bản cũ cứ 2 giây <c>TopMost = true</c> + <c>Activate()</c> — kéo tiêu điểm khỏi thanh tác vụ /
/// bàn phím ảo / hộp hệ thống mỗi nhịp. Giờ: mỗi nhịp tái khẳng định HWND_TOPMOST bằng SetWindowPos KHÔNG kích hoạt, KHÔNG vẽ lại (cửa sổ «luôn
/// trên cùng» khác — Task Manager, game, PiP — không đè được màn khoá); chỉ Activate khi tiêu điểm THẬT ở tiến trình khác.
/// </summary>
public static class GiuTrenCung
{
    /// <param name="choDong">Form đang được phép đóng (đang đóng thật).</param>
    /// <param name="soFormCon">Số hộp con đang mở (xin giờ, nhập mã…) — đang mở thì để yên cho Con dùng hộp.</param>
    /// <param name="coFormCuaMinhDangActive">Một form của khay đang có tiêu điểm.</param>
    /// <param name="foregroundLaCuaMinh">Cửa sổ tiền cảnh thuộc chính tiến trình khay.</param>
    public static bool CanKeoLen(bool choDong, int soFormCon, bool coFormCuaMinhDangActive, bool foregroundLaCuaMinh)
        => !choDong && soFormCon == 0 && !coFormCuaMinhDangActive && !foregroundLaCuaMinh;

    /// <summary>Tái khẳng định thứ tự TOPMOST (không kích hoạt) mỗi nhịp — trừ khi form đang đóng hoặc hộp con đang mở (hộp con phải nằm trên).</summary>
    public static bool CanKhangDinhTopMost(bool choDong, int soFormCon) => !choDong && soFormCon == 0;

    /// <summary>Chỉ đặt TopMost khi đổi (đặt lại cùng giá trị vẫn gọi SetWindowPos ⇒ sắp lại thứ tự cửa sổ).</summary>
    public static bool CanDatTopMost(bool dangTopMost, bool muon) => dangTopMost != muon;
}
