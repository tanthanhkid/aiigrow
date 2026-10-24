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

    /// <summary>Kết luận: không phải Home và cmdlet Get-AppLockerPolicy có ⇒ dùng được. <paramref name="coCmdlet"/> null = chưa kiểm được ⇒ không loại trừ.</summary>
    public static bool Tinh(string? editionId, bool? coCmdlet) => !LaBanHome(editionId) && coCmdlet != false;

    /// <summary>Số lần liền «không thấy cmdlet» (bản không phải Home) mới kết luận máy không có AppLocker.</summary>
    public const int SoLanKhongChac = 3;

    /// <summary>THUẦN — chốt một lần kiểm: (dùng được?, chắc chắn?). Home ⇒ (false, chắc). Có cmdlet ⇒ (true, chắc). Bản khác mà không thấy cmdlet:
    /// có thể do module nạp lỗi nhất thời ⇒ VẪN coi là dùng được (để Reconcile còn gỡ luật đã áp khi chuyển Giám sát) cho tới khi
    /// <see cref="SoLanKhongChac"/> lần liền đều «không» (review #75). Kiểm lỗi (null) ⇒ (true, chưa chắc).</summary>
    public static (bool DungDuoc, bool ChacChan) Chot(string? editionId, bool? coCmdlet, int soLanKhongLien)
    {
        if (LaBanHome(editionId)) return (false, true);
        if (coCmdlet == true) return (true, true);
        // nhiều lần liền «không» ⇒ coi như không có, nhưng KHÔNG chốt suốt đời (vẫn kiểm lại mỗi 10 phút): module về lại thì Reconcile còn gỡ được luật đã áp
        if (coCmdlet == false && soLanKhongLien >= SoLanKhongChac) return (false, false);
        return (true, false);
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
