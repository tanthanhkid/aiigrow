namespace AiiGrow.Core;

/// <summary>
/// «Xin thêm YouTube» (Bàn con-xin 16/11, #307: them-bxw40sw9 → them-6tn8aozf «Đã gửi» → them-359v1pre «Mẹ Lan đã thêm!» / them-vkdikuo0 «chưa thêm»).
/// Con tự xin Ba Mẹ thêm một app / trang chưa có trong danh sách (#258): Ba Mẹ chọn nhóm «Tính phút» / «Không tính phút» khi duyệt — chip trên hộp
/// chỉ cho Con biết hai nhóm, Con không chọn. Lời nhắn không bắt buộc (máy chủ cắt 100 ký tự). Lớp THUẦN để test.
/// </summary>
public static class XinThemView
{
    public const string TieuDeCuaSo = "AiiGrow · Xin thêm app";
    public static string Tieu(string ten) => "Xin thêm " + ten;
    public static string Phu(string ten) => ten + " chưa có trong danh sách của con";
    public const string BaMeChonNhom = "Ba Mẹ sẽ chọn nhóm";
    public const string NhomTinh = "Tính phút · 1 sao = 1 phút";
    public const string NhomKhong = "Không tính phút";
    public const string GoiYNhan = "Nhắn Ba Mẹ: con cần dùng để làm gì ạ";
    public static string Nut(string ten) => "Xin Ba Mẹ thêm " + ten;

    // Đã gửi (them-6tn8aozf)
    public const string DaGui = "Đã gửi Ba Mẹ!";
    public static string ConXin(string ten) => "Con xin thêm " + ten;
    public const string DangCho = "Đang chờ Ba Mẹ";
    public const string TraLoiBaoNgay = "Ba Mẹ trả lời là máy báo con ngay.";
    /// <summary>«Chơi tiếp · còn 18 sao = 18 phút»; hết sao ⇒ «Về Hôm nay».</summary>
    public static string ChoiTiep(double? phutCon) { var p = SaoView.Phut(phutCon); return p > 0 ? $"Chơi tiếp · còn {p} sao = {p} phút" : "Về Hôm nay"; }

    // Ba Mẹ đã thêm (them-359v1pre)
    public static string DaThem(string? nguoi) => XinVayView.TenBaMe(nguoi) + " đã thêm!";
    /// <summary>«Tính phút · 18 sao = 18 phút» / «Không tính phút · không trừ sao».</summary>
    public static string NhomDaThem(bool khongTinh, double? phutCon)
    {
        if (khongTinh) return "Không tính phút · không trừ sao";
        var p = SaoView.Phut(phutCon);
        return $"Tính phút · {p} sao = {p} phút";
    }
    public static string Mo(string ten) => "Mở " + ten;
    public static string MoTam(string? nguoi, int phut) => $"{XinVayView.TenBaMe(nguoi)} cho mở {phut} phút!";

    // Ba Mẹ chưa thêm (them-vkdikuo0)
    public static string ChuaThem(string ten) => "Ba Mẹ chưa thêm " + ten;
    public static string ConPhut(double? phutCon) { var p = SaoView.Phut(phutCon); return $"Con còn {p} sao = {p} phút chơi"; }
    /// <summary>Bong bóng: «Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé!» + lời nhắn của Ba Mẹ (nếu có).</summary>
    public static string LoiChuaThem(string ten, string? loiNhan)
        => $"Ba Mẹ chưa thêm {ten} lúc này. Con xin lại sau được nhé!" + (string.IsNullOrWhiteSpace(loiNhan) ? "" : " " + loiNhan!.Trim());
    public const string XinLai = "Xin lại";
    public const string VeTrangChinh = "Về trang chính";
}
