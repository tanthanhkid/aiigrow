namespace AiiGrow.Core;

/// <summary>
/// #308: khay AiiGrow chạy MỘT bản mỗi phiên Windows. Trước đây bản thứ hai (Con bấm biểu tượng AiiGrow / menu Start khi khay đang chạy ngầm,
/// hoặc khay cũ «.cu-xxxx» sau cập nhật còn giữ mutex) chỉ <c>return</c> ⇒ bấm mở mà không có cửa sổ nào hiện. Giờ bản thứ hai bật sự kiện có tên
/// <see cref="TenSuKien"/> rồi thoát; bản đang chạy chờ sự kiện đó và mở app to lên trước.
/// Không đụng WinForms (khay tự chuyển về luồng giao diện) ⇒ có test.
/// </summary>
public sealed class MotBanKhay : IDisposable
{
    public const string TenMutex = @"Local\AiiGrow.Tray";
    public const string TenSuKien = @"Local\AiiGrow.Tray.HienCuaSo";

    private readonly Mutex _mutex;
    private readonly EventWaitHandle? _suKien;
    private RegisteredWaitHandle? _cho;

    /// <summary>true = bản đầu tiên trong phiên (giữ mutex, nhận lời gọi hiện cửa sổ).</summary>
    public bool LaBanDau { get; }

    private MotBanKhay(Mutex mutex, bool dau, EventWaitHandle? suKien)
    {
        _mutex = mutex;
        LaBanDau = dau;
        _suKien = suKien;
    }

    /// <summary>Giành khoá chạy một bản. Bản đầu tạo luôn sự kiện (trước khi dựng giao diện) để bản sau mở được ngay.</summary>
    public static MotBanKhay Nhan(string tenMutex = TenMutex, string tenSuKien = TenSuKien)
    {
        var m = new Mutex(true, tenMutex, out var dau);
        EventWaitHandle? e = null;
        if (dau) e = new EventWaitHandle(false, EventResetMode.AutoReset, tenSuKien);
        return new MotBanKhay(m, dau, e);
    }

    /// <summary>Bản đầu: mỗi lần bản sau gọi ⇒ chạy <paramref name="hien"/> (trên luồng nền — người gọi tự chuyển về luồng giao diện).</summary>
    public void KhiDuocGoi(Action hien)
    {
        if (!LaBanDau || _suKien == null || _cho != null) return;
        _cho = ThreadPool.RegisterWaitForSingleObject(_suKien, (_, _) => { try { hien(); } catch { } }, null, Timeout.Infinite, executeOnlyOnce: false);
    }

    /// <summary>Bản sau: báo bản đang chạy hiện cửa sổ. Bản đầu vừa khởi động chưa kịp tạo sự kiện ⇒ thử lại trong <paramref name="choMs"/>.
    /// → true nếu đã báo được.</summary>
    public static bool GoiBanDangChay(string tenSuKien = TenSuKien, int choMs = 3000)
    {
        var het = Environment.TickCount64 + Math.Max(0, choMs);
        while (true)
        {
            if (EventWaitHandle.TryOpenExisting(tenSuKien, out var e))
            {
                using (e) return e.Set();
            }
            if (Environment.TickCount64 >= het) return false;
            Thread.Sleep(150);
        }
    }

    public void Dispose()
    {
        _cho?.Unregister(null);
        _cho = null;
        _suKien?.Dispose();
        if (LaBanDau) { try { _mutex.ReleaseMutex(); } catch (ApplicationException) { } }
        _mutex.Dispose();
    }
}

/// <summary>
/// #308: màn khoá giữ trên cùng mà KHÔNG gây nháy. Bản cũ cứ 2 giây đặt lại <c>TopMost = true</c> (SetWindowPos lại thứ tự cửa sổ) + <c>Activate()</c>
/// — kéo tiêu điểm khỏi thanh tác vụ / bàn phím ảo / hộp hệ thống mỗi nhịp. Giờ chỉ kéo lên khi tiêu điểm THẬT nằm ở tiến trình khác.
/// </summary>
public static class GiuTrenCung
{
    /// <param name="choDong">Form đang được phép đóng (đang đóng thật).</param>
    /// <param name="soFormCon">Số hộp con đang mở (xin giờ, nhập mã…) — đang mở thì để yên cho Con dùng hộp.</param>
    /// <param name="coFormCuaMinhDangActive">Một form của khay đang có tiêu điểm.</param>
    /// <param name="foregroundLaCuaMinh">Cửa sổ tiền cảnh thuộc chính tiến trình khay.</param>
    public static bool CanKeoLen(bool choDong, int soFormCon, bool coFormCuaMinhDangActive, bool foregroundLaCuaMinh)
        => !choDong && soFormCon == 0 && !coFormCuaMinhDangActive && !foregroundLaCuaMinh;

    /// <summary>Chỉ đặt TopMost khi chưa đặt (đặt lại cùng giá trị vẫn gọi SetWindowPos ⇒ sắp lại thứ tự cửa sổ).</summary>
    public static bool CanDatTopMost(bool dangTopMost, bool muon) => dangTopMost != muon;
}
