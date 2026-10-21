using System.Text;

namespace AiiGrow.Core;

/// <summary>Một bước trong luồng cài (dữ liệu thuần, không thực thi gì).</summary>
public sealed record InstallStep(string Id, string MoTa);

/// <summary>
/// KẾ HOẠCH CÀI — lớp THUẦN mô tả các bước trình cài sẽ làm, để test và để sinh "dry-run" (ghi file ra thư mục tạm, KHÔNG đụng máy).
/// Trình cài thật (AiiGrow.Setup) xin quyền quản trị MỘT lần qua app.manifest rồi chạy đúng các bước này.
/// Ở mốc này chỉ chạy dry-run: sinh XML AppLocker + bản kế hoạch vào thư mục tạm rồi kiểm bằng test; KHÔNG cài dịch vụ, KHÔNG áp AppLocker.
/// </summary>
public static class InstallPlan
{
    /// <summary>Thứ tự các bước cài một chạm (xin admin một lần ⇒ các bước bên dưới chạy với quyền đã có).</summary>
    public static IReadOnlyList<InstallStep> Steps() => new[]
    {
        new InstallStep("admin", "Xin quyền quản trị MỘT lần (app.manifest requireAdministrator)"),
        new InstallStep("enroll", "Ghép máy bằng token nhúng sẵn trong bộ cài (không nhập URL/mã tay); lưu cấu hình mã hoá DPAPI"),
        new InstallStep("copy", "Chép AiiGrow.Service.exe + AiiGrow.Tray.exe vào " + Paths.InstallDir),
        new InstallStep("service", "Tạo dịch vụ " + Paths.ServiceName + " chạy bằng tài khoản hệ thống (LocalSystem), khởi động cùng máy"),
        new InstallStep("recovery", "Đặt khôi phục dịch vụ (sc failure: restart/restart/restart) để SCM tự chạy lại khi lỗi"),
        new InstallStep("tray-notice", "Đặt Tray tự chạy (HKLM Run) + thông báo trước đăng nhập 'Máy được Ba Mẹ quản lý'"),
        new InstallStep("applocker", "Dựng AppLocker: sinh XML luật chặn/cho phép rồi áp khi dịch vụ chạy trên máy con"),
    };

    /// <summary>
    /// DRY-RUN: ghi bản kế hoạch (text) + XML AppLocker mẫu ra <paramref name="outDir"/> để kiểm bằng test. Không thực thi bước nào.
    /// Trả về đường dẫn hai file đã ghi.
    /// </summary>
    public static (string PlanFile, string AppLockerFile) DryRun(string outDir, AppLockerBlockOptions appLocker)
    {
        Directory.CreateDirectory(outDir);

        var sb = new StringBuilder();
        sb.AppendLine("# Kế hoạch cài AiiGrow (DRY-RUN — chưa chạy)");
        sb.AppendLine("# Trình cài xin quyền quản trị MỘT lần, rồi làm lần lượt:");
        int i = 1;
        foreach (var s in Steps()) sb.AppendLine($"{i++}. [{s.Id}] {s.MoTa}");
        var planFile = Path.Combine(outDir, "ke-hoach-cai.txt");
        File.WriteAllText(planFile, sb.ToString(), new UTF8Encoding(false));

        var xml = AppLockerXml.BuildBlockList(appLocker);
        var xmlFile = Path.Combine(outDir, "applocker-du-kien.xml");
        File.WriteAllText(xmlFile, xml, new UTF8Encoding(false));

        return (planFile, xmlFile);
    }
}
