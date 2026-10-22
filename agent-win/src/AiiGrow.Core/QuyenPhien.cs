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

    public static bool DuocXinHoacChoi(int phienGoi, int phienCon, int phienManHinh) =>
        LaPhienCon(phienGoi, phienCon) || (phienManHinh >= 0 && phienGoi == phienManHinh);
}
