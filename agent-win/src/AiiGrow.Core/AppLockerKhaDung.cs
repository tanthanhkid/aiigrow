using Microsoft.Win32;

namespace AiiGrow.Core;

/// <summary>BUG-005 (issue #68): Windows Home KHÔNG có AppLocker — Set-AppLockerPolicy lỗi mỗi 60 giây, log đầy, Ba Mẹ thấy «bảo vệ một phần».
/// Nhận ra lúc chạy (EditionID «Core…» hoặc không có cmdlet) ⇒ tắt <c>AppLockerController</c>, chỉ chặn bằng cách đóng app ngoài danh sách
/// (<see cref="ProcessEnforcer"/>), báo trạng thái lên máy chủ bằng <see cref="CauGhiChu"/>.</summary>
public static class AppLockerKhaDung
{
    public const string CauGhiChu = "Win Home: chặn bằng cách đóng app";

    /// <summary>EditionID của Windows Home: Core, CoreN, CoreSingleLanguage, CoreCountrySpecific. Không đọc được ⇒ false (coi như có thể dùng; cmdlet kiểm tiếp).</summary>
    public static bool LaBanHome(string? editionId) =>
        !string.IsNullOrWhiteSpace(editionId) && editionId.Trim().StartsWith("Core", StringComparison.OrdinalIgnoreCase);

    /// <summary>THUẦN — chốt một lần kiểm: (dùng được?, chắc chắn?). CHỈ bản Home mới là «không có AppLocker» (chắc). Có cmdlet ⇒ (true, chắc).
    /// Bản khác mà không thấy cmdlet / kiểm lỗi: module nạp lỗi nhất thời ⇒ VẪN coi là dùng được (Reconcile còn gỡ luật đã áp khi chuyển Giám sát, quyền
    /// appLocker báo đúng là thiếu khi áp hỏng, không gắn nhầm ghi chú «Win Home») — kiểm lại sau 10 phút (review #75).</summary>
    public static (bool DungDuoc, bool ChacChan) Chot(string? editionId, bool? coCmdlet)
    {
        if (LaBanHome(editionId)) return (false, true);
        return (true, coCmdlet == true);
    }

    public static string? DocEditionId()
    {
        try
        {
            using var k = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
            return k?.GetValue("EditionID") as string;
        }
        catch { return null; }
    }
}
