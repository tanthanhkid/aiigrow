using System.Runtime.InteropServices;
using AiiGrow.Core;

namespace AiiGrow.Tray;

internal static class Program
{
    [DllImport("user32.dll")] private static extern bool AllowSetForegroundWindow(int processId);

    /// <summary>Khay cũ tự chạy lại bằng bản mới sau cập nhật (TheoDoiExe): «--chay-lai [Mục]» ⇒ chờ khay cũ thoát rồi mới bật; có Mục ⇒ mở lại app ở mục đó.</summary>
    internal const string ThamSoChayLai = "--chay-lai";

    [STAThread]
    private static void Main(string[] args)
    {
        var chayLai = args.Length > 0 && args[0] == ThamSoChayLai;
        MucApp? moLai = chayLai && args.Length > 1 && Enum.TryParse<MucApp>(args[1], out var m) ? m : null;
        using var motBan = MotBanKhay.Nhan();
        if (!motBan.LaBanDau)
        {
            if (chayLai)
            {
                // Khay cũ vừa bật bản này rồi đang thoát ⇒ KHÔNG gọi nó hiện cửa sổ (nó sẽ nhận rồi thoát luôn); chờ nó nhả khoá, tối đa 30 giây.
                if (!motBan.GianhLai(30_000))
                {
                    // #418: khay cũ không thoát sau 30 giây (treo lúc đóng) ⇒ kết thúc nó rồi làm bản chính — không để khay cũ chạy tiếp
                    MotBanKhay.KetThucKhayKhac();
                    if (!motBan.GianhLai()) return;
                }
                ApplicationConfiguration.Initialize();
                ChayKhay(motBan, moNgay: false, moLai);
                return;
            }
            // #308: Con bấm AiiGrow (menu Start / biểu tượng) khi khay đang chạy ngầm ⇒ bản đang chạy mở app to. Bản này do Con bấm nên được quyền
            // đưa cửa sổ lên trước — nhường quyền đó cho đúng khay đang chạy (không thì Windows chỉ nháy nút trên thanh tác vụ), rồi thoát.
            // #418: còn khay CŨ «AiiGrow.Tray.exe.cu-…» (cập nhật đổi tên; khay trước #251 không tự chạy lại) ⇒ KHÔNG giao cho nó mở cửa sổ
            // (nó chạy bản cũ mãi tới lần đăng nhập sau): kết thúc các khay khác, bản này (exe mới) làm bản chính.
            var khayCu = MotBanKhay.KhayKhacCungPhien(chiKhayCu: true).Count > 0;
            if (!khayCu)
            {
                foreach (var pid in MotBanKhay.KhayKhacCungPhien())
                    try { AllowSetForegroundWindow(pid); } catch { }
                if (MotBanKhay.GoiBanDangChay()) return;
            }
            // Không ai nhận: khay CŨ (trước #308, hoặc «AiiGrow.Tray.exe.cu-…» bộ cập nhật đổi tên) giữ mutex mà không nghe lời gọi ⇒ kết thúc nó,
            // bản này làm bản chính (Con bấm mở là có cửa sổ, và chạy luôn bản mới).
            MotBanKhay.KetThucKhayKhac();
            if (!motBan.GianhLai()) return;
            ApplicationConfiguration.Initialize();
            ChayKhay(motBan, moNgay: true, null);
            return;
        }
        ApplicationConfiguration.Initialize();
        ChayKhay(motBan, moNgay: false, moLai);
    }

    private static void ChayKhay(MotBanKhay motBan, bool moNgay, MucApp? moLai)
    {
        var ctx = new TrayContext(moLai);
        // TrayContext đã tạo control (menu khay) ⇒ luồng này có WindowsFormsSynchronizationContext; lời gọi từ bản sau tới trên luồng nền ⇒ Post về luồng giao diện
        var ui = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
        motBan.KhiDuocGoi(() => ui.Post(_ => ctx.MoTuLanBamLai(), null));
        if (moNgay) ctx.MoTuLanBamLai();   // Con vừa bấm mở (thay khay cũ) ⇒ mở app khi đã biết phiên
        Application.Run(ctx);
    }
}
