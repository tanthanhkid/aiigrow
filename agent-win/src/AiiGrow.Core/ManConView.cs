namespace AiiGrow.Core;

// Chữ + luật hiển thị của các màn Con trên Windows theo thiết kế đã chốt 05/11 (docs/thiet-ke-chot/con-bi-chan, con-het-gio, con-mat-mang).
// Lớp THUẦN (không WinForms) để test. Luật chung: «sao» (không «điểm»), «Ba Mẹ», mỗi màn một việc, nút nói rõ kết quả, không dùng sao để mở app (L4).

/// <summary>Màn «app chưa được mở» (con-bi-chan 04–10, 16–22; mất mạng: con-mat-mang 12, 14).</summary>
public static class ManChanView
{
    public static string TieuDe(string ten) => ten + " chưa được mở";
    public const string Phu = "Máy chỉ mở app Ba Mẹ cho phép";
    public static string DangDung(int soApp) => $"Con đang dùng được {soApp} app:";
    public static string NutXin(string ten) => "Xin Ba Mẹ mở " + ten;
    public const string VeHomNay = "Về Hôm nay";
    public const string Dong = "Đóng";
    /// <summary>Tối đa số app lạ khay tự gửi lời xin trong một phiên khay — quá thì chỉ hiện nút (không tiêu hết hạn mức lời xin của Con).</summary>
    public const int TuGuiToiDa = 5;

    /// <summary>App lạ (không phải app Ba Mẹ đã đặt «Chặn») ⇒ AiiGrow TỰ gửi lời xin Ba Mẹ duyệt (L4: «app mới tự gửi xin → chờ → kết quả»).
    /// App Ba Mẹ đã chặn ⇒ chỉ hiện nút «Xin Ba Mẹ mở …» (Con tự quyết có xin không). Công cụ Windows, app không rõ tên, mất mạng ⇒ không tự gửi.
    /// <paramref name="daXin"/> = lời xin cho app này đã gửi trong phiên khay (không gửi lặp khi Con mở lại liên tục).</summary>
    public static bool TuGui(string? appId, bool boiBaMe, bool offline, bool daXin = false)
        => !boiBaMe && !offline && !daXin && BlockScreenView.CanAskOpen(appId);

    /// <summary>Có nút «Xin Ba Mẹ mở …» không (công cụ Windows như cmd, taskmgr… thì không).</summary>
    public static bool CoNutXin(string? appId) => BlockScreenView.CanAskOpen(appId);

    public const string DangXem = "Ba Mẹ đang xem nhé!";
    public const string TraLoiLaBiet = "Ba Mẹ trả lời là con biết ngay.";
    public const string DangCho = "Đang chờ duyệt";
    public static string ChuaMoDuoc(string ten) => ten + " chưa mở được";

    public static (string Tieu, string Phu) DaGui(string ten, bool web, bool tuGui, DateTimeOffset luc) => web
        ? ("Đã gửi xin mở " + ten, $"Trang mới · gửi lúc {luc:HH:mm}")
        : ("Đã gửi Ba Mẹ duyệt " + ten, (tuGui ? "App mới" : "App chưa được phép") + $" · gửi lúc {luc:HH:mm}");

    /// <summary>Ba Mẹ đã cho (tiêu đề, giờ duyệt, câu vui, câu phụ, nút).</summary>
    public static (string Tieu, string Luc, string Vui, string? Phu, string Nut) Duoc(string ten, bool web, DateTimeOffset luc) => web
        ? ("Ba Mẹ đã mở " + ten, $"Ba Mẹ duyệt lúc {luc:HH:mm}", $"Con vào {ten} được rồi!", null, "Mở " + ten)
        : ("Ba Mẹ đã cho " + ten, $"Ba Mẹ duyệt lúc {luc:HH:mm}", $"Giờ con mở {ten} được rồi!", "Lần sau không cần xin nữa.", "Mở " + ten);

    public const string TinhGioChoi = "Tính vào giờ chơi";

    public static (string Tieu, string Luc, string VanKhoa) ChuaCho(string ten, bool web, DateTimeOffset luc) =>
        (web ? "Ba Mẹ chưa mở " + ten : "Ba Mẹ chưa cho " + ten, $"Ba Mẹ trả lời lúc {luc:HH:mm}", ten + " vẫn khoá trên máy này");

    public const string NhanBaMe = "Nhắn Ba Mẹ";

    // Web cờ bạc / người lớn: luôn chặn, không xin được (máy chủ trả 409 web_cam — con-bi-chan 16).
    public const string WebCamTieu = "Trang này luôn bị chặn";
    public const string WebCamPhu = "Trang cờ bạc, trang người lớn";
    public const string WebCamVui1 = "Trang này không hợp với con.";
    public const string WebCamVui2 = "Mình chơi trò khác vui hơn nhé!";
    public const string WebCamMoiMay = "Chặn trên mọi máy, không xin mở được";

    // Mất mạng (con-mat-mang 12, 14): vẫn chặn; lời xin lưu lại, có mạng tự gửi; Ba Mẹ ở cạnh thì đọc mã 6 số.
    public static string MatMangTieu(string ten) => ten + " chưa được phép";
    public const string MatMangPhu = "Mất mạng vẫn chặn như cũ nhé.";
    public const string CoMangLaGui = "Có mạng là gửi Ba Mẹ ngay.";
    public const string BaMeOCanh = "Ba Mẹ ở cạnh? Nhờ đọc mã 6 số";
    public const string MoApp = "Mở app";
    public const string DaLuuTieu = "Đã lưu lời xin của con";
    public const string DaLuuPhu = "Có mạng là AiiGrow gửi Ba Mẹ ngay.";
    public static string ChoCoMang(int n) => $"Chờ có mạng ({Math.Max(1, n)})";
    public const string KhongCanGuiLai = "Không cần bấm gửi lại đâu.";
}

/// <summary>Một nút trên màn khoá. <see cref="Ma"/>: doi_sao | xin_them_gio | xin_ngoai_le | nhan_ba_me | ba_me_dung_may.</summary>
public sealed record NutKhoa(string Ma, string Chu, string Icon);

/// <summary>Nội dung màn khoá toàn màn hình (con-het-gio 06–10, con-mat-mang 02).</summary>
public sealed record ManKhoa(string Rob, string Tieu, string Phu, string? Phu2, bool DemNguoc, string? SaoDong, IReadOnlyList<NutKhoa> Nut, bool MatMang);

public static class ManKhoaView
{
    public const string DoiSao = "doi_sao", XinThemGio = "xin_them_gio", XinNgoaiLe = "xin_ngoai_le", NhanBaMe = "nhan_ba_me", BaMeDungMay = "ba_me_dung_may";

    /// <summary>10 sao = 10 phút (L1) — nút đổi nhanh trên màn khoá / nhắc 5 phút.</summary>
    public const string NutDoiSao = "Đổi 10 sao lấy 10 phút";

    public static string ChanTrang(string tenCon) =>
        "AiiGrow · " + (string.IsNullOrWhiteSpace(tenCon) ? "Máy của con" : "Máy của " + tenCon) + " · máy do Ba Mẹ quản lý";

    /// <param name="graceLeft">Giây đếm ngược trước khi khoá (dịch vụ); &gt;0 ⇒ màn «Sắp hết giờ chơi».</param>
    /// <param name="sao">Số sao của Con (null = máy chủ chưa gửi — S1).</param>
    /// <param name="quyPhut">Quỹ phút chơi hôm nay (null = chưa có — S1).</param>
    /// <param name="moLaiLuc">Giờ máy mở lại sau giờ ngủ «HH:mm» (null = chưa có).</param>
    /// <param name="doiSaoDuoc">Máy chủ cho đổi sao lấy phút (Policy.CanExchangePoints).</param>
    public static ManKhoa For(string? lyDo, int? graceLeft, string tenCon, int? sao, int? quyPhut, string? moLaiLuc, bool doiSaoDuoc, bool offline)
    {
        var ten = string.IsNullOrWhiteSpace(tenCon) ? "con" : tenCon.Trim();
        var saoDong = sao is { } s ? $"Con có {s} sao" : null;
        var doi = doiSaoDuoc && (sao is null || sao >= 10);
        var nut = new List<NutKhoa>();
        void Them(string ma, string chu, string icon) => nut.Add(new NutKhoa(ma, chu, icon));

        if (offline)
        {
            // Mất mạng: luật vẫn giữ, chỉ còn lời xin (lưu, có mạng tự gửi) + mã 6 số Ba Mẹ đọc + Win+L.
            var (tieu, phu) = lyDo switch
            {
                LockReasons.Ngu => ("Đến giờ ngủ rồi", MoLai(moLaiLuc)),
                LockReasons.Khoa => ("Ba Mẹ đang khoá máy", "Mở lại là máy báo con ngay"),
                _ => ("Hết giờ chơi hôm nay", (quyPhut is { } q ? $"Đã chơi {q} / {q} phút. " : "") + "Lưu bài đang làm nhé."),
            };
            if (lyDo is LockReasons.Ngu or LockReasons.Khoa) Them(XinNgoaiLe, "Xin Ba Mẹ mở ngoại lệ", "mo_khoa");
            else Them(XinThemGio, "Xin Ba Mẹ thêm giờ", "gui");
            return new ManKhoa("ngu", tieu, phu, "Có mạng là AiiGrow gửi Ba Mẹ ngay.", false, null, nut, true);
        }

        switch (lyDo)
        {
            case LockReasons.Ngu:
                Them(XinNgoaiLe, "Xin Ba Mẹ mở ngoại lệ", "mo_khoa");
                Them(NhanBaMe, "Nhắn Ba Mẹ", "tin");
                Them(BaMeDungMay, "Ba Mẹ dùng máy", "khoa");
                return new ManKhoa("ngu", "Đến giờ ngủ rồi", MoLai(moLaiLuc), $"Chúc {ten} ngủ ngon!", false, null, nut, false);
            case LockReasons.Khoa:
                Them(XinNgoaiLe, "Xin Ba Mẹ mở ngoại lệ", "mo_khoa");
                Them(NhanBaMe, "Nhắn Ba Mẹ", "tin");
                Them(BaMeDungMay, "Ba Mẹ dùng máy", "khoa");
                return new ManKhoa("cho", "Ba Mẹ đang khoá máy", "Mở lại là máy báo con ngay", null, false, null, nut, false);
            default:
                if (doi) Them(DoiSao, NutDoiSao, "sao");
                Them(XinThemGio, "Xin Ba Mẹ thêm giờ", "gui");
                if (graceLeft is > 0)
                {
                    Them(BaMeDungMay, "Ba Mẹ dùng máy", "khoa");
                    return new ManKhoa("chi", "Sắp hết giờ chơi", "Lưu bài đang làm nhé. Máy khoá sau", null, true, saoDong, nut, false);
                }
                Them(XinNgoaiLe, "Xin mở ngoại lệ", "mo_khoa");
                Them(NhanBaMe, "Nhắn Ba Mẹ", "tin");
                Them(BaMeDungMay, "Ba Mẹ dùng máy", "khoa");
                var da = quyPhut is { } qp ? $"Con đã chơi đủ {qp} / {qp} phút. Giỏi lắm!" : "Con đã chơi đủ giờ hôm nay. Giỏi lắm!";
                return new ManKhoa("nghi", "Hết giờ chơi hôm nay", da, null, false, saoDong, nut, false);
        }
    }

    /// <summary>«06:30» ⇒ «6:30» (cách thiết kế ghi giờ); «00:30» giữ; trống ⇒ null.</summary>
    public static string? GioGon(string? hhmm)
    {
        var t = hhmm?.Trim();
        if (string.IsNullOrEmpty(t)) return null;
        return t.Length == 5 && t[0] == '0' && t[1] != '0' ? t[1..] : t;
    }

    private static string MoLai(string? luc) => luc is { Length: > 0 } ? $"Máy mở lại lúc {luc} sáng mai." : "Máy mở lại sáng mai.";

    // Mất mạng (con-mat-mang 02–04)
    public const string MatMangDau = "Mất mạng, luật vẫn vậy nhé!";
    public static string MatMangChip(DateTimeOffset luc) => $"● Mất mạng · {luc:HH:mm}";
    public const string BaMeOCanh = "Ba Mẹ ở cạnh con?";
    public const string DocMa = "Nhờ Ba Mẹ đọc mã 6 số trong app AiiGrow.";
    public const string MoBangMa = "Mở máy bằng mã của Ba Mẹ";
    public const string WinL = "Ba Mẹ cần dùng máy? Bấm Win + L";
    public const string MaSai = "Mã chưa đúng. Nhờ Ba Mẹ đọc lại nhé.";
    public const string DaLuuThemGio = "Đã lưu lời xin thêm giờ";
    public const string DaLuuThemGioPhu = "Có mạng là AiiGrow tự gửi Ba Mẹ.";
    public const string VeManKhoa = "Về màn khoá";
}

/// <summary>«Xin Ba Mẹ mở ngoại lệ» khi giờ ngủ / Ba Mẹ khoá / hết giờ (con-het-gio 12–19, L3): mở MỘT app hoặc cả máy, có hạn phút.</summary>
public static class NgoaiLeView
{
    public const string CaMay = "ca_may";
    /// <summary>Tối đa 60 = mặc định máy chủ <c>ngoai_le_toi_da_phut</c> (S1); máy chủ vẫn kẹp theo cấu hình Ba Mẹ.</summary>
    public const int PhutMacDinh = 15, PhutMin = 5, PhutMax = 60, Buoc = 5;
    public static readonly string[] LyDoNhanh = { "Con chưa xong bài", "Mai nộp cô" };
    public const string TuViet = "Tự viết…";

    public const string Tieu = "Con cần mở gì?";
    public const string Phu = "Ba Mẹ đồng ý thì máy mới mở";
    public const string MoBaoLau = "Mở bao lâu?";
    public const string ViSao = "Vì sao con cần?";
    public const string KhongTru = "Không trừ giờ chơi, không trừ sao";
    public static string NutGui(int phut) => $"Gửi Ba Mẹ: mở {phut} phút";
    public static string Phut(int phut) => phut + " phút";

    public static int Tang(int phut) => Math.Min(PhutMax, Kep(phut) + Buoc);
    public static int Giam(int phut) => Math.Max(PhutMin, Kep(phut) - Buoc);
    public static int Kep(int phut) => Math.Clamp(phut, PhutMin, PhutMax);

    /// <summary>Lựa chọn mở: tối đa 2 app học Ba Mẹ cho phép (chữ thường .exe) + «Cả máy».</summary>
    public static List<(string Ma, string Ten)> LuaChon(IEnumerable<string>? appHoc)
    {
        var ds = (appHoc ?? Enumerable.Empty<string>())
            .Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Take(2)
            .Select(a => (a, TrayView.FriendlyAppName(a, null))).ToList();
        ds.Add((CaMay, "Cả máy"));
        return ds;
    }

    /// <summary>Lý do gửi kèm: chip đã chọn hoặc chữ Con tự viết; trống ⇒ câu mặc định (máy chủ bắt buộc có lý do cho ngoại lệ).</summary>
    public static string LyDo(string? chon, string? tuViet)
    {
        var t = (string.IsNullOrWhiteSpace(tuViet) ? chon : tuViet)?.Trim();
        if (string.IsNullOrEmpty(t)) t = "Con xin Ba Mẹ mở ngoại lệ";
        return t.Length > 100 ? t[..100] : t;
    }

    public const string DaGui = "Đã gửi Ba Mẹ";
    public const string ChoXem = "Chờ Ba Mẹ xem…";
    public static string DongCho(string ten, int phut) => $"{ten} · {phut} phút";
    public const string VeManKhoaCho = "Về màn khoá chờ Ba Mẹ";

    public static string DuocTieu(int phut) => $"Ba Mẹ cho mở {phut} phút";
    public static string DuocChiMo(string ma, string ten, DateTimeOffset den) =>
        ma == CaMay ? $"Mở cả máy, đến {den:HH:mm}" : $"Chỉ mở {ten}, đến {den:HH:mm}";
    public const string TuKhoaLai = "Hết giờ máy tự khoá lại";
    public static string NutMo(string ma, string ten) => ma == CaMay ? "Vào máy" : "Mở " + ten;
    public const string NhacLuuBai = "Còn 5 phút máy nhắc con lưu bài";

    public const string ChuaChoTieu = "Ba Mẹ chưa cho lúc này";
    public const string ChuaChoPhu = "Ba Mẹ đã xem và trả lời con";
    public const string NhanLai = "Nhắn lại Ba Mẹ";
}

/// <summary>Nhắc «Còn 5 phút chơi» góc phải màn hình (con-het-gio 05).</summary>
public static class NhacGioView
{
    public const string Tieu = "Còn 5 phút chơi";
    public static string Phu(int? sao) => "Lưu bài đang làm nhé" + (sao is { } s ? $" · con có {s} sao" : "");
    public const string XinThemGio = "Xin Ba Mẹ thêm giờ";
}

/// <summary>«Kiểm tra cập nhật» từ khay (con-mat-mang 17, 19).</summary>
public static class CapNhatKhayView
{
    public const string CoBanMoiTieu = "AiiGrow tìm ra cách sửa rồi!";
    public static string CoBanMoiPhu(string ban) => $"Có bản mới {ban} sửa lỗi này.";
    public const string GiuNguyen = "Giờ chơi, sao và luật giữ nguyên.";
    public const string MotPhut = "Mất khoảng 1 phút, không cần ghép lại.";
    public const string NutCapNhat = "Cập nhật để sửa lỗi";
    public const string DeSau = "Để sau";
    public const string DangTieu = "Đang cập nhật AiiGrow…";
    public const string DangPhu = "Mất khoảng 1 phút · đừng tắt máy nhé. AiiGrow tự chạy lại.";
    public const string MoiNhatTieu = "AiiGrow đã là bản mới nhất";
    public static string MoiNhatPhu(string ban) => $"Bản {ban} · mới nhất";
    public const string NhuCu = "Giờ chơi, sao và luật vẫn như cũ.";
    public const string OKhay = "AiiGrow ở khay góc phải ›";
    public const string VeHomNay = "Về Hôm nay";
    public const string DangKiem = "Đang kiểm bản mới…";
    public const string KhongKiemDuoc = "Chưa kiểm được. Con thử lại khi có mạng nhé.";
}

/// <summary>«Hỏi AiiGrow» — tự tìm lỗi (con-mat-mang 10): mỗi thẻ một tình huống + cách xử lý.</summary>
public static class HoiAiiGrowView
{
    /// <summary>Thẻ: mã hành động (thu_lai | ma_mo | bat_lai | cap_nhat), icon 3D, tiêu đề, dòng phụ.</summary>
    public static readonly (string Ma, string Icon, string Tieu, string Phu)[] The =
    {
        ("thu_lai", "wifi", "Mất mạng?", "Máy vẫn giữ giờ chơi"),
        ("ma_mo", "khoa", "Máy bị khoá?", "Xin Ba Mẹ mã mở máy"),
        ("bat_lai", "canh_bao", "AiiGrow báo lỗi?", "Bấm «Bật lại AiiGrow»"),
        ("cap_nhat", "banhrang", "Cần cập nhật?", "Bấm cập nhật, chờ 1 phút"),
    };
    public const string Tieu = "Hỏi AiiGrow";
    public const string Phu = "Con đang gặp gì? Bấm vào thẻ nhé";
    public const string GoiBaMe = "Gọi Ba Mẹ giúp";
    public const string MaMoCau = "Nhờ Ba Mẹ mở app AiiGrow trên điện thoại, đọc mã 6 số cho con gõ vào màn khoá.";
}
