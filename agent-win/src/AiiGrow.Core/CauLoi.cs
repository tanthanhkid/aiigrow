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
        401 or 403 => "Máy này cần Ba Mẹ ghép lại trong app Ba Mẹ.",
        429 => "Bấm hơi nhanh — đợi một chút rồi thử lại nhé.",
        _ => "Chưa làm được — thử lại nhé. Vẫn lỗi thì nhờ Ba Mẹ cập nhật AiiGrow.",
    };

    // tên máy chủ có cổng (aiigrow.aiilab.vn:443) / tên miền máy chủ AiiGrow, đường dẫn, tên ngoại lệ, mã lỗi thô (token_sai). Tên miền trang web trong câu máy chủ
    // («youtube.com chưa được mở») vẫn hiện được.
    private static readonly Regex KyThuat = new(
        @"://|\\|[A-Za-z]:\\|[a-z0-9-]+(\.[a-z0-9-]+)+:\d{2,5}|aiilab\.vn|Exception|^[a-z0-9]+(_[a-z0-9]+)+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    /// <summary>Câu tiếng Anh của .NET / HĐH lẫn sau tiền tố tiếng Việt («…: The operation has timed out.»).</summary>
    private static readonly Regex TiengAnh = new(
        @"\b(the|is|are|was|has|have|of|error|occurred|failed|denied|timed|known|request|access|cannot|could|because|instance|instances|operation|busy|refused|unable|while|sending)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>Câu có hiện được cho người dùng không: có chữ tiếng Việt (dấu), không tên máy chủ / đường dẫn / tên ngoại lệ / mã lỗi thô.</summary>
    public static bool HienDuoc(string? s)
    {
        var t = (s ?? "").Trim();
        if (t.Length == 0 || KyThuat.IsMatch(t) || TiengAnh.IsMatch(t)) return false;
        return t.Any(c => c > 127);   // câu .NET / HĐH tiếng Anh không có dấu
    }

    /// <summary><paramref name="s"/> nếu hiện được, không thì <paramref name="duPhong"/>.</summary>
    public static string AnToan(string? s, string duPhong) => HienDuoc(s) ? s!.Trim() : duPhong;

    /// <summary>Ngoại lệ ⇒ câu cho người dùng: câu tiếng Việt đã soạn sẵn (ApiException, lỗi tự ném) đi qua; câu .NET (JSON, null…) ⇒ câu chung.</summary>
    public static string Tu(Exception e) => AnToan(e.Message, LoiTrongMay);
}
