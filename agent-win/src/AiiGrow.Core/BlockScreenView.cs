namespace AiiGrow.Core;

/// <summary>
/// Nội dung màn chặn giải trí: tên app, lý do, và hai nút. Lớp THUẦN (không WinForms) để test được.
/// Nút chỉ GỬI yêu cầu lên máy chủ; mọi quyết định (cho chơi / cho thêm giờ) do máy chủ trả về.
/// </summary>
public sealed record BlockScreen(
    string AppName,
    string Reason,
    bool ShowUsePoints,
    bool ShowAskParent,
    string UsePointsLabel,
    string AskParentLabel);

public static class BlockScreenView
{
    public const string UsePointsLabel = "Dùng điểm để chơi";
    public const string AskParentLabel = "Xin phép Ba Mẹ";

    /// <summary>Lý do hiển thị cho con, theo mã lý do từ dịch vụ.</summary>
    public static string ReasonText(string? reason) => reason switch
    {
        LockReasons.HetGio => "Ngoài giờ dùng máy hôm nay",
        LockReasons.Ngu => "Đang trong giờ nghỉ",
        LockReasons.HetDiem => "Hết điểm chơi hôm nay",
        LockReasons.ChuaPhanLoai => "App này chưa được Ba Mẹ phân loại",
        LockReasons.Khoa => "Máy đang được Ba Mẹ khoá",
        _ => "Chưa được Ba Mẹ cho mở",
    };

    /// <summary>
    /// Nút «Dùng điểm để chơi» luôn hiện khi máy chủ cho phép đổi điểm (BUG-006) — trừ khi Ba Mẹ khoá máy.
    /// Ngoài giờ / giờ ngủ: máy chủ (phien/xet) quyết định và trả lời bằng lời; màn chặn chỉ hiển thị câu đó.
    /// </summary>
    /// <param name="appId">App vừa bị chặn: công cụ của Windows (cmd, taskmgr…) không bao giờ là app Giải trí ⇒ không mời «dùng điểm» (phien/xet luôn từ chối).</param>
    /// <param name="offline">Mất mạng ⇒ phien/xet không gọi được ⇒ không mời.</param>
    public static bool CanUsePoints(string? reason, bool canExchangePoints, string? appId = null, bool offline = false)
        => canExchangePoints && reason != LockReasons.Khoa && !offline
           && !(appId != null && ProcessGuard.UngDungTrongWindows.Contains(appId.Trim().EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? appId.Trim() : appId.Trim() + ".exe"));

    public const string OfflineCodeLabel = "Mất mạng? Nhập mã của Ba Mẹ";

    /// <summary>Ô nhập mã mở offline: chỉ hiện khi máy đang mất mạng. Màn khoá hiện khi lý do khoá mã gỡ được
    /// (<see cref="MoTamOffline.MoDuocKhoa"/>: hết giờ, giờ ngủ, «Khoá ngay») — mất mạng thì mã là đường duy nhất mở máy.</summary>
    public static bool ShowOfflineCode(bool offline, bool lockScreen = false, string? lockReason = null)
        => offline && (!lockScreen || MoTamOffline.MoDuocKhoa(lockReason));

    public static BlockScreen For(string? appId, string? appName, string? reason, bool canExchangePoints, bool offline = false)
    {
        var name = TrayView.FriendlyAppName(appId, appName);
        var usePoints = CanUsePoints(reason, canExchangePoints, appId, offline);
        return new BlockScreen(name, ReasonText(reason), usePoints, true, UsePointsLabel, AskParentLabel);
    }
}
