namespace AiiGrow.Core;

/// <summary>
/// 0.2.4 — «Con đang chơi thật» cho phiên chơi bằng điểm (BRD 4.4 / 6.7). Lớp THUẦN (test được); dịch vụ đưa vào các tín hiệu đã đọc.
/// Chống giả mạo (review PR #59, P2-3): khay chạy trong phiên của Con nên Con / app khác có thể giả lời báo của khay — vì vậy:
///   • lời báo tiền cảnh chỉ nhận từ đúng exe khay đã cài (PipeServer + <see cref="KhayThat"/>);
///   • tiền cảnh RỖNG («không có cửa sổ») chỉ được tin khi WTS xác nhận phiên Con đang KHOÁ (<paramref name="manHinhKhoa"/> = true);
///   • app tiền cảnh khay báo phải là tiến trình ĐANG CHẠY thật trong phiên Con.
/// Không xác minh được ⇒ «không rõ» ⇒ vẫn tính nếu app chơi đang chạy (Con không ngừng được đồng hồ bằng cách giả lời báo / tắt khay).
/// </summary>
public static class TienCanhChoi
{
    /// <param name="p">Policy đang giữ (phải có phiên: PlaySessionId + PlayApp).</param>
    /// <param name="fgId">App tiền cảnh khay báo ("" = không có cửa sổ).</param>
    /// <param name="fgTuoi">Khay báo trong 20 giây qua.</param>
    /// <param name="manHinhKhoa">WTS SessionFlags của phiên Con: true = khoá, false = mở, null = không đọc được.</param>
    /// <param name="tienTrinhCon">Tên exe (chữ thường) đang chạy trong phiên Con; null = không đọc được.</param>
    public static bool DangChoi(Policy? p, string? fgId, bool fgTuoi, bool? manHinhKhoa, IReadOnlyCollection<string>? tienTrinhCon)
    {
        if (p?.PlaySessionId == null || p.PlayApp == null) return false;
        if (manHinhKhoa == true) return false;                                   // khoá màn hình đã xác minh
        bool Chay(string exe) => tienTrinhCon == null || tienTrinhCon.Contains(exe.Trim().ToLowerInvariant());
        bool appChoiChay = p.PlayWeb ? PhienOffline.TrinhDuyet.Any(Chay) : Chay(p.PlayApp);
        if (fgTuoi && !string.IsNullOrWhiteSpace(fgId) && Chay(fgId))
            return PhienOffline.LaAppChoi(p, fgId);                                // tiền cảnh đã xác minh có thật
        return appChoiChay;                                                        // "" chưa xác minh khoá / app không chạy / khay chết ⇒ không rõ
    }

    /// <summary>Tên exe chữ thường từ danh sách tiến trình.</summary>
    public static HashSet<string> TenExe(IEnumerable<RunningProc> ds)
    {
        var s = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in ds)
        {
            var ten = r.Path.Replace('\\', '/');
            var i = ten.LastIndexOf('/');
            s.Add((i >= 0 ? ten[(i + 1)..] : ten).ToLowerInvariant());
        }
        return s;
    }
}

/// <summary>Kiểm khách của named pipe là đúng exe khay đã cài (cùng thư mục với dịch vụ) — review PR #59, P2-3(a).</summary>
public static class KhayThat
{
    public static bool La(string? anhKhach, string duongKhay)
    {
        if (string.IsNullOrWhiteSpace(anhKhach) || string.IsNullOrWhiteSpace(duongKhay)) return false;
        try { return string.Equals(Path.GetFullPath(anhKhach.Trim()), Path.GetFullPath(duongKhay), StringComparison.OrdinalIgnoreCase); }
        catch { return false; }
    }
}
