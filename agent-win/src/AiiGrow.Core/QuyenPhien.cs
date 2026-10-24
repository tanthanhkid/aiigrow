namespace AiiGrow.Core;

/// <summary>
/// Lệnh khay nào được nhận từ phiên Windows nào (PipeServer). Thanh 22/10 ảnh máy thật: phiên đang dùng KHÔNG phải tài khoản Con chọn lúc cài
/// (đăng nhập tài khoản khác, hoặc cài đè giữ ChildUser cũ) ⇒ app to báo «Chỉ tài khoản của con dùng được phần này» + «Đang tải nhiệm vụ…» treo.
/// - Học viên (nhiệm vụ, nộp bài, điểm/quà, tin nhắn): KHÔNG chặn theo phiên — dữ liệu là của máy (token máy), máy chủ quyết.
/// - Xin thêm giờ / mở phiên chơi: phiên của Con, HOẶC phiên đang ngồi trước màn hình (console) dù ChildUser khác.
/// - Báo app tiền cảnh: chỉ phiên của Con (giữ như cũ — app của Ba Mẹ không tính vào giờ Con).
/// </summary>
public static class QuyenPhien
{
    public static bool LaPhienCon(int phienGoi, int phienCon) => phienCon < 0 || phienGoi == phienCon;

    /// <summary>Lệnh khay học viên: đọc (GET) mọi phiên; lệnh GHI (POST: nhận việc, nộp bài, đổi quà, trả lời lời khen) chỉ từ phiên Con hoặc phiên
    /// đang ngồi trước màn hình (Thanh 22/10). Tài khoản Con ĐANG có phiên (kể cả bị ngắt do «Chuyển người dùng») ⇒ chỉ đúng phiên đó: anh chị/khách
    /// đăng nhập tài khoản khác trước màn hình không tiêu điểm của Con. Con chưa đăng nhập (hoặc ChildUser cũ) ⇒ phiên trước màn hình; RDP/phiên nền thì không.</summary>
    public static bool DuocHocVien(string? method, int phienGoi, int phienCon, int phienManHinh)
    {
        if (!string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase)) return true;
        if (phienCon >= 0) return phienGoi == phienCon;
        return phienManHinh < 0 || phienGoi == phienManHinh;
    }

    /// <summary>Có người đăng nhập trước màn hình mà KHÔNG phải tài khoản Con (Con không đang dùng). Chưa biết tài khoản Con / màn đăng nhập trống ⇒ false.</summary>
    public static bool LaTaiKhoanKhac(string? taiKhoanManHinh, string? taiKhoanCon, bool conDangDung) =>
        !conDangDung && !string.IsNullOrWhiteSpace(taiKhoanManHinh) && !string.IsNullOrWhiteSpace(taiKhoanCon)
        && !string.Equals(taiKhoanManHinh.Trim(), taiKhoanCon.Trim(), StringComparison.OrdinalIgnoreCase);

    public static bool DuocXinHoacChoi(int phienGoi, int phienCon, int phienManHinh) =>
        LaPhienCon(phienGoi, phienCon) || (phienManHinh >= 0 && phienGoi == phienManHinh);

    /// <summary>BUG-007 (issue #68): khay (Run key của MỌI người dùng) chỉ nên chạy ở phiên tài khoản CON — phiên Ba Mẹ không có biểu tượng, màn chặn, thông báo.
    /// Quyết định theo tên tài khoản của phiên gọi: cấu hình có tài khoản Con ⇒ đúng tài khoản đó; cài một chạm (không chọn) ⇒ mọi tài khoản không phải quản trị.
    /// Không biết (chưa đọc được danh sách tài khoản, tên lạ) ⇒ true — thà hiện khay còn hơn mất khay của Con.</summary>
    public static bool KhayChayOPhien(string? taiKhoanPhien, string? childUserCauHinh, IEnumerable<LocalAccount>? taiKhoanMay)
    {
        if (string.IsNullOrWhiteSpace(taiKhoanPhien)) return true;
        var ten = taiKhoanPhien.Trim();
        if (!string.IsNullOrWhiteSpace(childUserCauHinh))
            return string.Equals(ten, childUserCauHinh.Trim(), StringComparison.OrdinalIgnoreCase);
        var a = taiKhoanMay?.FirstOrDefault(x => string.Equals(x.Name, ten, StringComparison.OrdinalIgnoreCase));
        if (a == null) return true;
        return !a.IsAdmin && !TaiKhoanCon.LaTaiKhoanHeThong(a);
    }
}
