namespace AiiGrow.Core;

/// <summary>#777 B4: bộ cài không còn đòi quyền quản trị từ manifest (tài khoản thường bấm vào thì Windows hỏi mật khẩu rồi im lặng).
/// Tự kiểm: đã nâng quyền ⇒ chạy; tài khoản quản trị nhưng chưa nâng (UAC) ⇒ tự xin nâng quyền; tài khoản thường ⇒ báo «cần tài khoản Ba Mẹ».</summary>
public enum HuongChayBoCai { Chay, TuNangQuyen, CanTaiKhoanBaMe }

public static class QuyenBoCai
{
    /// <summary>Giá trị TOKEN_ELEVATION_TYPE: 1 = Default (tài khoản thường, hoặc UAC tắt), 2 = Full (đã nâng), 3 = Limited (quản trị, token đã lọc UAC).</summary>
    public const int NangDayDu = 2, DaLoc = 3;

    public static HuongChayBoCai Quyet(bool laQuanTri, int loaiNangQuyen)
    {
        if (laQuanTri) return HuongChayBoCai.Chay;           // đã nâng quyền (hoặc SYSTEM của dịch vụ tự cập nhật)
        if (loaiNangQuyen == DaLoc) return HuongChayBoCai.TuNangQuyen;
        return HuongChayBoCai.CanTaiKhoanBaMe;
    }

    public const string TieuDeCanBaMe = "Cần tài khoản của Ba Mẹ";
    public const string ChuCanBaMe = "Bộ cài AiiGrow phải chạy bằng tài khoản của Ba Mẹ (tài khoản quản trị Windows). Tài khoản này không đủ quyền.\n\nHãy đăng nhập Windows bằng tài khoản của Ba Mẹ, hoặc bấm chuột phải vào bộ cài › Chạy với quyền quản trị viên rồi nhập mật khẩu Ba Mẹ.";
}
