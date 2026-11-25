using AiiGrow.Core;
using Microsoft.Win32;

namespace AiiGrow.Tray;

/// <summary>Báo nhẹ «AiiGrow đã cập nhật lên bản X» sau khi tự cập nhật, mỗi tài khoản một lần.
/// #639: so bản khay ĐANG CHẠY với bản khay đã báo lần trước ở HKCU (BanDaThay) — không phụ thuộc bộ cài kịp ghi «BanVuaCapNhat» (HKLM)
/// trước khi khay tự chạy lại: khay chạy lại ngay khi chép xong, trước bước ghi số bản ⇒ trước đây lời báo trượt mất.</summary>
internal static class BaoCapNhat
{
    internal static string? CanBao(string? dangChay, string? daThay, string? vuaCapNhat, string? daBao)
    {
        var cur = CapNhat.DocBan(dangChay);
        if (cur == null) return null;
        var truoc = CapNhat.DocBan(daThay);
        if (truoc != null && cur > truoc) return cur.ToString(3);
        var vua = CapNhat.DocBan(vuaCapNhat);
        if (vua != null && vua == cur && CapNhat.DocBan(daBao) != vua) return vua.ToString(3);
        return null;
    }

    public static void NeuVuaCapNhat(NotifyIcon ni)
    {
        try
        {
            var dang = TuCapNhat.BanHienTai().ToString(3);
            using var k = Registry.LocalMachine.OpenSubKey(AppsEntry.Key);
            using var u = Registry.CurrentUser.CreateSubKey(@"Software\AiiGrow");
            var ban = CanBao(dang, u.GetValue("BanDaThay") as string, k?.GetValue("BanVuaCapNhat") as string, u.GetValue("DaBaoCapNhat") as string);
            if (ban != null)
            {
                u.SetValue("DaBaoCapNhat", ban);
                ni.ShowBalloonTip(5000, "AiiGrow đã cập nhật lên bản " + ban, "Mọi cài đặt của Ba Mẹ giữ nguyên.", ToolTipIcon.None);
            }
            u.SetValue("BanDaThay", dang);   // ghi SAU khi báo: báo lỗi thì lần mở khay sau còn báo lại
        }
        catch { }
    }
}
