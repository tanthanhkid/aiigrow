using System.Runtime.InteropServices;

namespace AiiGrow.Tray;

/// <summary>
/// #308 (video máy Con 16/11, khung 28–31): app to dựng lại nội dung (gỡ hết control rồi tạo mới) ⇒ vùng nội dung trắng xoá rồi hiện lại từng thẻ.
/// <see cref="DungVe"/> tắt vẽ (WM_SETREDRAW) cả cây control trong lúc dựng, xong bật lại và vẽ MỘT lượt ⇒ Con chỉ thấy màn cũ đổi thẳng sang màn mới.
/// Chỉ dùng trên control CON (panel), không trên cửa sổ cấp cao (WM_SETREDRAW tắt WS_VISIBLE của cửa sổ đó).
/// </summary>
internal static class KhongNhay
{
    private const int WmSetRedraw = 0x000B;
    private const uint RdwInvalidate = 0x0001, RdwErase = 0x0004, RdwAllChildren = 0x0080, RdwUpdateNow = 0x0100, RdwFrame = 0x0400;

    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern bool RedrawWindow(IntPtr hWnd, IntPtr rcUpdate, IntPtr hrgnUpdate, uint flags);

    /// <summary>using (KhongNhay.DungVe(panel)) { …gỡ / thêm control… } — control chưa có handle / đang ẩn thì không làm gì.</summary>
    public static IDisposable DungVe(Control c) => new Khoa(c);

    private sealed class Khoa : IDisposable
    {
        private Control? _c;

        public Khoa(Control c)
        {
            if (!c.IsHandleCreated || !c.Visible) return;
            _c = c;
            SendMessage(c.Handle, WmSetRedraw, IntPtr.Zero, IntPtr.Zero);
        }

        public void Dispose()
        {
            var c = _c;
            _c = null;
            if (c == null || c.IsDisposed || !c.IsHandleCreated) return;
            SendMessage(c.Handle, WmSetRedraw, (IntPtr)1, IntPtr.Zero);
            RedrawWindow(c.Handle, IntPtr.Zero, IntPtr.Zero, RdwErase | RdwFrame | RdwInvalidate | RdwAllChildren | RdwUpdateNow);
        }
    }
}
