namespace AiiGrow.Core;

/// <summary>#744 (thuộc #737): mỗi PHÚT TRÒN «Tính phút» đã đếm ⇒ dịch vụ đồng bộ NGAY (đẩy phút lên máy chủ, nhận sao / giới hạn ngày / nghỉ mới),
/// không đợi nhịp đồng bộ dài (NextCheckSec có thể vài phút). Lớp THUẦN: chỉ cộng giây truyền vào, không đọc đồng hồ.</summary>
public sealed class NhipPhut
{
    private double _du;

    /// <summary>Cộng <paramref name="giay"/> giây «Tính phút»; true khi vừa đủ thêm một phút tròn (nhiều phút một lúc vẫn chỉ báo một lần).</summary>
    public bool Cong(double giay)
    {
        if (giay <= 0) return false;
        _du += giay;
        if (_du < 60) return false;
        _du %= 60;
        return true;
    }
}

/// <summary>#744: nhịp gửi lịch sử web (giây theo tên miền → máy chủ trừ sao web). Trình duyệt đang ở tiền cảnh (sổ giây tab tăng) ⇒ mỗi phút; không ⇒ 5 phút.</summary>
public static class NhipWeb
{
    public static readonly TimeSpan Cham = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan Nhanh = TimeSpan.FromMinutes(1);

    /// <param name="tongTruoc">Tổng giây tab đã ghi ở lượt trước.</param>
    /// <param name="tongNay">Tổng giây tab đã ghi bây giờ.</param>
    public static TimeSpan Chon(double tongTruoc, double tongNay) => tongNay > tongTruoc ? Nhanh : Cham;
}
