using System.Runtime.InteropServices;
using AiiGrow.Core;

namespace AiiGrow.Tray;

internal static class Program
{
    private const int AsfwAny = -1;
    [DllImport("user32.dll")] private static extern bool AllowSetForegroundWindow(int processId);

    [STAThread]
    private static void Main()
    {
        using var motBan = MotBanKhay.Nhan();
        if (!motBan.LaBanDau)
        {
            // #308: Con bấm AiiGrow (menu Start / biểu tượng) khi khay đang chạy ngầm ⇒ bản đang chạy mở app to. Bản này do Con bấm nên được quyền
            // đưa cửa sổ lên trước — nhường quyền đó cho bản đang chạy (không thì Windows chỉ nháy nút trên thanh tác vụ), rồi thoát.
            try { AllowSetForegroundWindow(AsfwAny); } catch { }
            MotBanKhay.GoiBanDangChay();
            return;
        }
        ApplicationConfiguration.Initialize();
        var ctx = new TrayContext();
        // TrayContext đã tạo control (menu khay) ⇒ luồng này có WindowsFormsSynchronizationContext; lời gọi từ bản sau tới trên luồng nền ⇒ Post về luồng giao diện
        var ui = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
        motBan.KhiDuocGoi(() => ui.Post(_ => ctx.MoTuLanBamLai(), null));
        Application.Run(ctx);
    }
}
