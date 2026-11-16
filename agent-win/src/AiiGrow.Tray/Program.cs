using System.Runtime.InteropServices;
using AiiGrow.Core;

namespace AiiGrow.Tray;

internal static class Program
{
    [DllImport("user32.dll")] private static extern bool AllowSetForegroundWindow(int processId);

    [STAThread]
    private static void Main()
    {
        using var motBan = MotBanKhay.Nhan();
        if (!motBan.LaBanDau)
        {
            // #308: Con bấm AiiGrow (menu Start / biểu tượng) khi khay đang chạy ngầm ⇒ bản đang chạy mở app to. Bản này do Con bấm nên được quyền
            // đưa cửa sổ lên trước — nhường quyền đó cho đúng khay đang chạy (không thì Windows chỉ nháy nút trên thanh tác vụ), rồi thoát.
            foreach (var pid in MotBanKhay.KhayKhacCungPhien())
                try { AllowSetForegroundWindow(pid); } catch { }
            if (MotBanKhay.GoiBanDangChay()) return;
            // Không ai nhận: khay CŨ (trước #308, hoặc «AiiGrow.Tray.exe.cu-…» bộ cập nhật đổi tên) giữ mutex mà không nghe lời gọi ⇒ kết thúc nó,
            // bản này làm bản chính (Con bấm mở là có cửa sổ, và chạy luôn bản mới).
            MotBanKhay.KetThucKhayKhac();
            if (!motBan.GianhLai()) return;
            ApplicationConfiguration.Initialize();
            ChayKhay(motBan, moNgay: true);
            return;
        }
        ApplicationConfiguration.Initialize();
        ChayKhay(motBan, moNgay: false);
    }

    private static void ChayKhay(MotBanKhay motBan, bool moNgay)
    {
        var ctx = new TrayContext();
        // TrayContext đã tạo control (menu khay) ⇒ luồng này có WindowsFormsSynchronizationContext; lời gọi từ bản sau tới trên luồng nền ⇒ Post về luồng giao diện
        var ui = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
        motBan.KhiDuocGoi(() => ui.Post(_ => ctx.MoTuLanBamLai(), null));
        if (moNgay) ctx.MoTuLanBamLai();   // Con vừa bấm mở (thay khay cũ) ⇒ mở app khi đã biết phiên
        Application.Run(ctx);
    }
}
