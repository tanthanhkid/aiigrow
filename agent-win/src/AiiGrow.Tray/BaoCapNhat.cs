using AiiGrow.Core;
using Microsoft.Win32;

namespace AiiGrow.Tray;

/// <summary>Báo nhẹ «AiiGrow đã cập nhật lên bản X» sau khi tự cập nhật: bộ cài ghi «BanVuaCapNhat» vào mục Ứng dụng (HKLM) ⇒ mỗi tài khoản báo một lần.</summary>
internal static class BaoCapNhat
{
    public static void NeuVuaCapNhat(NotifyIcon ni)
    {
        try
        {
            using var k = Registry.LocalMachine.OpenSubKey(AppsEntry.Key);
            if (k?.GetValue("BanVuaCapNhat") is not string ban || ban.Length == 0) return;
            using var u = Registry.CurrentUser.CreateSubKey(@"Software\AiiGrow");
            if (u.GetValue("DaBaoCapNhat") as string == ban) return;
            u.SetValue("DaBaoCapNhat", ban);
            ni.ShowBalloonTip(5000, "AiiGrow đã cập nhật lên bản " + ban, "Mọi cài đặt của Ba Mẹ giữ nguyên.", ToolTipIcon.Info);
        }
        catch { }
    }
}
