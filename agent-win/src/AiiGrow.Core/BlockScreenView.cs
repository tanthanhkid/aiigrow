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
    /// Nút «Dùng điểm để chơi» chỉ hiện khi đây là màn chặn giải trí mà điểm mở được (hết điểm / chưa phân loại)
    /// và máy chủ cho phép đổi điểm. Ngoài giờ / khoá: chỉ còn nút «Xin phép Ba Mẹ».
    /// </summary>
    public static bool CanUsePoints(string? reason, bool canExchangePoints)
        => canExchangePoints && reason is LockReasons.HetDiem or LockReasons.ChuaPhanLoai;

    public const string OfflineCodeLabel = "Mất mạng? Nhập mã của Ba Mẹ";

    /// <summary>Ô nhập mã mở offline: chỉ hiện khi máy đang mất mạng. Màn khoá hiện khi lý do khoá mã gỡ được
    /// (<see cref="MoTamOffline.MoDuocKhoa"/>: hết giờ, giờ ngủ, «Khoá ngay») — mất mạng thì mã là đường duy nhất mở máy.</summary>
    public static bool ShowOfflineCode(bool offline, bool lockScreen = false, string? lockReason = null)
        => offline && (!lockScreen || MoTamOffline.MoDuocKhoa(lockReason));

    public static BlockScreen For(string? appId, string? appName, string? reason, bool canExchangePoints)
    {
        var name = TrayView.FriendlyAppName(appId, appName);
        var usePoints = CanUsePoints(reason, canExchangePoints);
        return new BlockScreen(name, ReasonText(reason), usePoints, true, UsePointsLabel, AskParentLabel);
    }
}
