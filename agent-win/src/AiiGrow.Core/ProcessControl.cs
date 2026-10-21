namespace AiiGrow.Core;

/// <summary>Một tiến trình đang chạy trong phiên của con (ảnh chụp để quyết định có đóng hay không).</summary>
public sealed record RunningProc(int Id, string Path);

/// <summary>
/// Cổng tới hệ điều hành để liệt kê và đóng tiến trình của con. Tách interface để lớp quyết định (<see cref="ProcessEnforcer"/>)
/// test được bằng bản giả — mọi thao tác hệ thống thật nằm trong bản Windows (dịch vụ), không trong lõi.
/// </summary>
public interface IProcessControl
{
    /// <summary>Các tiến trình đang chạy trong phiên của con, kèm đường dẫn file chạy.</summary>
    IEnumerable<RunningProc> ListChildProcesses(int sessionId);
    /// <summary>Đóng một tiến trình theo Id. Trả true nếu đã đóng.</summary>
    bool Close(int processId);
}

/// <summary>
/// Lớp THUẦN quyết định đóng tiến trình nào trong phiên của con (dự phòng khi AppLocker chưa áp hoặc app đã chạy từ trước).
/// Không đụng hệ thống: chỉ hỏi <see cref="IProcessControl"/>. Giữ app được phép, helper cùng thư mục app được phép, và thư mục hệ thống.
/// </summary>
public static class ProcessEnforcer
{
    /// <summary>Đóng các tiến trình ngoài danh sách cho phép. Trả về tên các exe đã đóng (chữ thường).
    /// <paramref name="dryRun"/> = chế độ giám sát: CHỈ liệt kê tên exe SẼ bị đóng, KHÔNG thật sự đóng (để thử an toàn).</summary>
    public static IReadOnlyList<string> Enforce(IProcessControl control, int sessionId, IEnumerable<string> allowedApps,
        IEnumerable<string>? safeDirs = null, bool dryRun = false)
    {
        var procs = control.ListChildProcesses(sessionId)
            .Where(p => !string.IsNullOrWhiteSpace(p.Path))
            .ToList();
        var allowed = new HashSet<string>(allowedApps.Select(a => a.ToLowerInvariant()), StringComparer.OrdinalIgnoreCase);
        var safe = (safeDirs ?? ProcessGuard.DefaultSafeDirs()).ToList();

        // Thư mục của các app được phép đang chạy: helper cùng thư mục thì không đóng.
        var allowedDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in procs)
        {
            if (!allowed.Contains(FileName(p.Path))) continue;
            var d = DirName(p.Path);
            if (d != null) allowedDirs.Add(d);
        }

        var closed = new List<string>();
        foreach (var p in procs)
        {
            if (!ProcessGuard.ShouldClose(p.Path, allowed, allowedDirs, safe)) continue;
            if (dryRun) { closed.Add(FileName(p.Path).ToLowerInvariant()); continue; }
            if (control.Close(p.Id)) closed.Add(FileName(p.Path).ToLowerInvariant());
        }
        return closed;
    }

    private static string FileName(string p)
    {
        var i = p.LastIndexOfAny(new[] { '\\', '/' });
        return i < 0 ? p : p[(i + 1)..];
    }

    private static string? DirName(string p)
    {
        var i = p.LastIndexOfAny(new[] { '\\', '/' });
        return i <= 0 ? null : p[..i];
    }
}
