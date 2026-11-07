namespace AiiGrow.Core;

/// <summary>Các bước của màn khoá «Ai đang dùng máy?» (docs/thiet-ke-chot/con-ngay-thuong 01–06).</summary>
public enum BuocChonTen
{
    /// <summary>01 «Ai đang dùng máy?» — lưới tên các bé.</summary>
    ChonTen,
    /// <summary>02 / 03 «Nhập PIN 4 số» (sai ⇒ «Chưa đúng · còn N lần thử»).</summary>
    NhapPin,
    /// <summary>04 «Sai 5 lần rồi» — đếm 15 giây.</summary>
    TamKhoa,
    /// <summary>05 «Quên PIN rồi à?».</summary>
    QuenPin,
    /// <summary>06 «Ba Mẹ nhập mã».</summary>
    BaMeMa,
}

/// <summary>Trạng thái màn chọn tên (lớp thuần — khay vẽ theo, test được).</summary>
public sealed class ManChonTenState
{
    public BuocChonTen Buoc { get; set; } = BuocChonTen.ChonTen;
    public HoSoBe? Be { get; set; }
    /// <summary>Số đang gõ: PIN (4) ở bước NhapPin, mã (6) ở bước BaMeMa.</summary>
    public string So { get; set; } = "";
    public int? ConLan { get; set; }
    public DateTimeOffset? ChoDen { get; set; }
    /// <summary>Câu báo dưới ô số (lỗi mạng, mã sai…).</summary>
    public string? Loi { get; set; }
    /// <summary>Đã bấm «Báo Ba Mẹ giúp con» (bước QuenPin).</summary>
    public bool DaBao { get; set; }
    /// <summary>BaMeMa mở từ màn khoá thường (hết giờ / giờ ngủ…) ⇒ «‹» quay về màn đó, không về lưới tên.</summary>
    public bool TuManKhoa { get; set; }
    public bool DangGui { get; set; }
}

/// <summary>Chữ + chuyển bước của màn chọn tên / PIN / Ba Mẹ nhập mã (con-ngay-thuong 01–07).</summary>
public static class ManChonTenView
{
    public const string ChipKhoa = "Máy đang khoá";
    public const string NutBaMe = "Ba Mẹ dùng máy";
    public const string TieuChon = "Ai đang dùng máy?";
    public const string PhuChon = "Bấm vào tên của con nhé.";
    public const string GhiChon = "Chưa ai vào thì máy chỉ mở màn này.";
    public const string ChuaCoDs = "Chưa tải được tên các bé. Nối mạng rồi thử lại, hoặc nhờ Ba Mẹ mở máy.";
    public const string PhuPin = "Nhập PIN 4 số";
    public const string NhoMay = "Máy sẽ nhớ con — lần sau mở là vào luôn";
    public const string LinkQuen = "Quên PIN?";
    public const string TieuTamKhoa = "Sai 5 lần rồi";
    public const string PhuTamKhoa = "Hít thở chậm nào. Chờ một chút rồi thử lại nhé.";
    public const string LinkQuenNho = "Quên PIN? Nhờ Ba Mẹ";
    public const string TieuQuen = "Quên PIN rồi à?";
    public const string PhuQuen = "Không sao! Nhờ Ba Mẹ đặt PIN mới nhé.";
    public const string Buoc1 = "Ba Mẹ mở AiiGrow trên điện thoại";
    public const string Buoc3 = "Bấm «PIN · Đặt lại»";
    public const string NutBao = "Báo Ba Mẹ giúp con";
    public const string DaBao = "Đã báo Ba Mẹ";
    public const string NutCoPinMoi = "Có PIN mới · nhập lại";
    public const string NutChonKhac = "Chọn bé khác";
    public const string TieuBaMe = "Ba Mẹ nhập mã";
    public const string PhuBaMe = "Mở app AiiGrow của Ba Mẹ → Mã mở máy";
    public const string GhiMa = "Mã 6 số · đổi sau 10 phút · gõ bằng bàn phím";
    public const string KhongTru = "Ba Mẹ dùng thì không trừ giờ của con";
    public const string NutMo = "Mở máy cho Ba Mẹ";
    public const string ChuaDatPin = "Ba Mẹ chưa đặt PIN cho con — nhờ Ba Mẹ đặt trong app nhé.";
    public const int SoChuSoMa = 6;

    public static string Buoc2(string? ten) => "Vào hồ sơ " + (string.IsNullOrWhiteSpace(ten) ? "của con" : ten.Trim());
    public static string ChuaDung(int conLan) => $"Chưa đúng · còn {conLan} lần thử";
    public static string Dem(int giay) => $"{giay / 60}:{giay % 60:00} giây";

    public static void VeDau(ManChonTenState st)
    {
        st.Buoc = BuocChonTen.ChonTen; st.Be = null; st.So = ""; st.ConLan = null; st.ChoDen = null; st.Loi = null; st.DaBao = false; st.TuManKhoa = false; st.DangGui = false;
    }

    /// <summary>Bé chạm tên. → true = bé chưa có PIN, vào thẳng (khay gửi đăng nhập ngay, không qua bàn phím).</summary>
    public static bool ChonBe(ManChonTenState st, HoSoBe be, DateTimeOffset now)
    {
        st.Be = be; st.So = ""; st.ConLan = null; st.Loi = null; st.DaBao = false;
        if (be.KhoaDen is { } k && k > now) { st.Buoc = BuocChonTen.TamKhoa; st.ChoDen = k; return false; }
        st.ChoDen = null;
        st.Buoc = BuocChonTen.NhapPin;
        return !be.CoPin;
    }

    public static void MoBaMe(ManChonTenState st, bool tuManKhoa)
    {
        st.Buoc = BuocChonTen.BaMeMa; st.So = ""; st.Loi = null; st.ConLan = null; st.TuManKhoa = tuManKhoa;
    }

    public static void MoQuen(ManChonTenState st)
    {
        st.Buoc = BuocChonTen.QuenPin; st.So = ""; st.Loi = null; st.DaBao = false;
    }

    /// <summary>«‹» — PIN / quên PIN / tạm khoá ⇒ lưới tên; Ba Mẹ nhập mã ⇒ lưới tên (hoặc màn khoá thường nếu mở từ đó — trả false để khay đóng lớp này).</summary>
    public static bool Lui(ManChonTenState st)
    {
        if (st.Buoc == BuocChonTen.BaMeMa && st.TuManKhoa) { VeDau(st); return false; }
        if (st.Buoc == BuocChonTen.QuenPin && st.Be != null) { st.Buoc = BuocChonTen.NhapPin; st.So = ""; st.Loi = null; return true; }
        VeDau(st);
        return true;
    }

    /// <summary>Gõ một chữ số (bàn phím số trên màn hoặc bàn phím thật). → true khi đủ số (PIN 4 / mã 6) ⇒ khay gửi.</summary>
    public static bool GoSo(ManChonTenState st, char c)
    {
        if (st.DangGui || c is < '0' or > '9') return false;
        var toiDa = st.Buoc switch { BuocChonTen.NhapPin => DangNhapView.SoChuSoPin, BuocChonTen.BaMeMa => SoChuSoMa, _ => 0 };
        if (toiDa == 0 || st.So.Length >= toiDa) return false;
        if (st.So.Length == 0) st.Loi = null;
        st.So += c;
        return st.So.Length == toiDa && st.Buoc == BuocChonTen.NhapPin;   // mã Ba Mẹ: bấm «Mở máy cho Ba Mẹ» (hoặc Enter)
    }

    public static void Xoa(ManChonTenState st)
    {
        if (st.So.Length > 0) st.So = st.So[..^1];
    }

    /// <summary>Hết 15 giây ⇒ về nhập lại PIN.</summary>
    public static bool Tick(ManChonTenState st, DateTimeOffset now)
    {
        if (st.Buoc != BuocChonTen.TamKhoa || st.ChoDen is not { } d || d > now) return false;
        st.Buoc = BuocChonTen.NhapPin; st.ChoDen = null; st.ConLan = null; st.So = ""; st.Loi = null;
        return true;
    }

    public static int ConGiay(ManChonTenState st, DateTimeOffset now)
        => st.ChoDen is { } d ? Math.Max(0, (int)Math.Ceiling((d - now).TotalSeconds)) : 0;

    /// <summary>Kết quả gửi PIN (lệnh pipe dang-nhap-be). ok ⇒ máy vào bé (dịch vụ mở khoá ở lượt hỏi sau) — màn về đầu.</summary>
    public static void KetQuaPin(ManChonTenState st, bool ok, string? status, int? conLan, int? choGiay, string? loi, DateTimeOffset now)
    {
        st.DangGui = false;
        if (ok) { var be = st.Be; VeDau(st); st.Be = be; return; }
        st.So = "";
        switch (status)
        {
            case "pin_sai":
                st.ConLan = conLan ?? st.ConLan; st.Loi = null; break;
            case "pin_tam_khoa":
                st.Buoc = BuocChonTen.TamKhoa; st.ChoDen = now.AddSeconds(Math.Max(1, choGiay ?? DangNhapView.PinChoGiay)); st.ConLan = null; st.Loi = null; break;
            case "can_pin":
                st.Buoc = BuocChonTen.NhapPin; if (st.Be != null) st.Be.CoPin = true; st.Loi = null; break;
            case "khong_thay":
                VeDau(st); st.Loi = loi ?? "Không thấy tên này trên máy — chọn lại nhé."; break;
            default:
                st.Loi = string.IsNullOrWhiteSpace(loi) ? "Chưa vào được. Con thử lại nhé." : loi; break;
        }
    }

    /// <summary>Kết quả gửi mã Ba Mẹ (lệnh pipe ba-me-mo).</summary>
    public static void KetQuaMa(ManChonTenState st, bool ok, string? status, int? conLan, int? choGiay, string? loi)
    {
        st.DangGui = false;
        if (ok) { VeDau(st); return; }
        st.So = "";
        st.Loi = status switch
        {
            "ma_sai" => conLan is int n ? $"Mã chưa đúng · còn {n} lần thử" : "Mã chưa đúng — xem lại trong app Ba Mẹ nhé.",
            "ma_tam_khoa" => $"Nhập sai nhiều lần — đợi {Math.Max(1, ((choGiay ?? 600) + 59) / 60)} phút rồi thử lại.",
            "ma_da_dung" => "Mã này đã dùng rồi — mở app Ba Mẹ lấy mã mới.",
            _ => string.IsNullOrWhiteSpace(loi) ? "Chưa mở được. Thử lại nhé." : loi,
        };
    }
}
