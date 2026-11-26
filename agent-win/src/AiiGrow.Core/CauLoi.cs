using System.Text.RegularExpressions;

namespace AiiGrow.Core;

/// <summary>
/// #688: câu lỗi cho Con / Ba Mẹ đứng trước máy — tiếng Việt, ngắn, nói phải làm gì. Không bao giờ hiện câu của .NET / hệ điều hành
/// (tiếng Anh, tên máy chủ, đường dẫn), mã lỗi thô («token_sai») hay mã HTTP. Chi tiết gốc chỉ đi vào log (InnerException).
/// </summary>
public static class CauLoi
{
    public const string MatMang = "Chưa kết nối được mạng — kiểm tra Wi-Fi rồi thử lại nhé.";
    public const string QuaHan = "Mạng chậm, chưa nhận được trả lời — thử lại sau ít phút nhé.";
    public const string DichVuChuaSan = "AiiGrow trên máy đang khởi động lại — đợi một chút rồi thử lại nhé.";
    public const string LoiTrongMay = "Có trục trặc trên máy — thử lại nhé. Vẫn lỗi thì nhờ Ba Mẹ khởi động lại máy.";

    /// <summary>Máy chủ trả lỗi KHÔNG kèm câu (`message`): câu theo loại mã, không nêu mã.</summary>
    public static string TheoMa(int status) => status switch
    {
        >= 500 => "Máy chủ AiiGrow đang bận — thử lại sau ít phút nhé.",
        408 => "Máy chủ AiiGrow đang bận — thử lại sau ít phút nhé.",
        401 or 403 => "Máy này cần Ba Mẹ ghép lại trong app Ba Mẹ.",
        413 => "Dữ liệu gửi đi quá lớn — thử lại sau nhé.",
        429 => "Bấm hơi nhanh — đợi một chút rồi thử lại nhé.",
        _ => "Chưa làm được — thử lại nhé. Vẫn lỗi thì nhờ Ba Mẹ cập nhật AiiGrow.",
    };

    // tên máy chủ có cổng (aiigrow.aiilab.vn:443), địa chỉ có giao thức, đường dẫn, tên ngoại lệ, mã lỗi thô (token_sai). Tên miền trang web trong câu máy chủ
    // («youtube.com chưa được mở») vẫn hiện được.
    private static readonly Regex KyThuat = new(
        @"://|\\|[A-Za-z]:\\|[a-z0-9-]+(\.[a-z0-9-]+)+:\d{2,5}|Exception|^[a-z0-9]+(_[a-z0-9]+)+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    /// <summary>Câu tiếng Anh của .NET / HĐH lẫn sau tiền tố tiếng Việt («…: The operation has timed out.»).</summary>
    private static readonly Regex TiengAnh = new(
        @"\b(timed out|no such host|object reference|error occurred|failed to|access (is |was )?denied|is denied|refused|unable to|cannot|could not|not found|instances? (are|is) busy|invalid start|operation was canceled)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>Câu có hiện được cho người dùng không: có chữ tiếng Việt (dấu), không tên máy chủ / đường dẫn / tên ngoại lệ / mã lỗi thô.</summary>
    public static bool HienDuoc(string? s)
    {
        var t = (s ?? "").Trim();
        if (t.Length == 0 || KyThuat.IsMatch(t) || TiengAnh.IsMatch(t)) return false;
        return t.Any(LaChuViet);   // câu .NET / HĐH tiếng Anh (hay tiếng Pháp / Đức của HĐH) không có chữ riêng của tiếng Việt
    }

    /// <summary>Chữ chỉ tiếng Việt có (ă â đ ê ô ơ ư, khối U+1EA0–U+1EF9 «ạ ả ấ…») — «é», «ü» của tiếng Pháp / Đức không tính.</summary>
    private static bool LaChuViet(char c) => "ăâđêôơưĂÂĐÊÔƠƯ".IndexOf(c) >= 0 || (c >= '\u1EA0' && c <= '\u1EF9');

    /// <summary><paramref name="s"/> nếu hiện được, không thì <paramref name="duPhong"/>.</summary>
    public static string AnToan(string? s, string duPhong) => HienDuoc(s) ? s!.Trim() : duPhong;

    /// <summary>Ngoại lệ ⇒ câu cho người dùng: câu tiếng Việt đã soạn sẵn (ApiException, lỗi tự ném) đi qua; câu .NET (JSON, null…) ⇒ câu chung.</summary>
    public static string Tu(Exception e) => AnToan(e.Message, LoiTrongMay);
}
