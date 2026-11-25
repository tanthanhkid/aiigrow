namespace AiiGrow.Core;

// Chữ + luật hiển thị của các màn Con trên Windows theo thiết kế đã chốt (bàn aiigrow-figma: con-bi-chan, con-het-gio, con-mat-mang — bản 15/11).
// Lớp THUẦN (không WinForms) để test. Luật chung: «sao» (không «điểm»), «Ba Mẹ», mỗi màn một việc, nút nói rõ kết quả, không dùng sao để mở app (L4).

/// <summary>Màn «app chưa được mở» (con-bi-chan 04–10, 16–22; mất mạng: con-mat-mang 12, 14).</summary>
public static class ManChanView
{
    // 15/11 (#262, them-vc4dmaei / them-dnm1pzqs): «Theo danh sách» = danh sách trắng — app / trang ngoài danh sách chưa mở, Con xin Ba Mẹ THÊM.
    public static string TieuDe(string ten) => ten + " chưa được thêm";
    public const string Phu = "Chưa có trong danh sách của con";
    public const string ChuThichDs = "Danh sách · xanh: không tính phút · vàng: tính phút";
    public static string DangDung(int soApp) => ChuThichDs;
    public static string NutXin(string ten) => "Xin Ba Mẹ thêm " + ten;
    public const string WebTieu = "Trang này chưa có trong danh sách";
    public const string WebVui1 = "Con xin Ba Mẹ mở nhé!";
    public const string WebVui2 = "Ba Mẹ sẽ thấy lời xin của con ngay.";
    public const string WebNutXin = "Xin Ba Mẹ mở";
    public const string VeTrangChinh = "Về trang chính";
    public const string VeHomNay = "Về Hôm nay";
    public const string Dong = "Đóng";
    /// <summary>Tối đa số app lạ khay tự gửi lời xin trong một phiên khay — quá thì chỉ hiện nút (không tiêu hết hạn mức lời xin của Con).</summary>
    public const int TuGuiToiDa = 5;

    /// <summary>#621: KHÔNG tự gửi lời xin nữa — tiến trình nền của Windows (Mail sync hxtsr, Ảnh…) bị đóng cũng bắn «Con đang xin» khi bé không bấm gì.
    /// Mọi app bị đóng chỉ hiện nút «Xin Ba Mẹ mở …»; lời xin chỉ đi khi Con bấm nút. Giữ chữ ký để các chỗ gọi không đổi.</summary>
    public static bool TuGui(string? appId, bool boiBaMe, bool offline, bool daXin = false) => false;

    /// <summary>#668: tiến trình Windows / dịch vụ đi kèm tự chạy ngầm trong phiên Con (OneDrive đồng bộ, Xbox Identity Provider…) — Con không mở, không có gì để xin.
    /// KHÔNG miễn chặn (chỗ nằm của chúng tài khoản chuẩn ghi được, như OneDrive ở %LocalAppData%): luật chặn / ghi nhận giữ nguyên, chỉ không bật bảng.</summary>
    public static readonly HashSet<string> TienTrinhChayNgam = new(StringComparer.OrdinalIgnoreCase)
    {
        "onedrive.exe", "onedrivestandaloneupdater.exe", "onedriveupdater.exe", "filecoauth.exe", "filesyncconfig.exe", "filesyncshell64.exe",
        "xboxidp.exe", "xboxpcapp.exe", "xboxappservices.exe", "gamebarpresencewriter.exe",
    };

    /// <summary>#642 / #668: có hiện bảng «chưa được thêm» cho tiến trình này không. Tiến trình nền của Windows / Xbox Game Bar (gamebarftserver…) và tiến trình
    /// chạy ngầm đi kèm (OneDrive, Xboxidp…) không phải việc Con làm ⇒ không bật bảng (không phủ màn hình, không có gì để xin). appId trống ⇒ vẫn hiện (không rõ là gì thì không nuốt).</summary>
    public static bool CoHienBang(string? appId)
    {
        if (string.IsNullOrWhiteSpace(appId)) return true;
        var t = appId.Trim();
        var exe = t.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? t : t + ".exe";
        return !ProcessGuard.TienTrinhHeThongPhien.Contains(exe) && !TienTrinhChayNgam.Contains(exe);
    }

    /// <summary>#668: mô tả ngắn app bằng chữ bé hiểu (tên không .exe, không phân biệt hoa thường). null = không có mô tả.</summary>
    public static string? MoTaApp(string? appId)
    {
        var n = (appId ?? "").Trim();
        if (n.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) n = n[..^4];
        return MoTa.TryGetValue(n, out var m) ? m : null;
    }

    private static readonly Dictionary<string, string> MoTa = new(StringComparer.OrdinalIgnoreCase)
    {
        ["onedrive"] = "chỗ lưu file của Windows",
        ["msedge"] = "trình duyệt web của Windows",
        ["notepad"] = "chỗ gõ chữ đơn giản",
        ["calculatorapp"] = "máy tính bấm số",
        ["mspaint"] = "chỗ vẽ tranh của Windows",
        ["teams"] = "chỗ gọi và nhắn tin họp nhóm",
        ["outlook"] = "chỗ đọc và gửi thư",
    };

    /// <summary>#668: lời bảng chặn cho bé — «Con vừa mở OneDrive (chỗ lưu file của Windows). Ba Mẹ chưa cho mở app này. Con cần dùng thì bấm Xin Ba Mẹ nhé.»</summary>
    public static string LoiChan(string ten, string? moTa) =>
        $"Con vừa mở {ten}" + (string.IsNullOrWhiteSpace(moTa) ? "" : $" ({moTa.Trim()})") + ". Ba Mẹ chưa cho mở app này. Con cần dùng thì bấm Xin Ba Mẹ nhé.";

    /// <summary>#642: kết quả gọi gửi lời xin → bước kế. Chỉ khi dịch vụ NHẬN (ok) mới sang «Đã gửi»; lỗi ⇒ về màn có nút xin + câu lỗi (đóng được: nút, Esc, bấm nền).</summary>
    public static (bool DaGui, string? Loi) KetQuaGui(bool ok, string? loi) =>
        ok ? (true, null) : (false, string.IsNullOrWhiteSpace(loi) ? ChuaGuiDuoc : loi);
    public const string ChuaGuiDuoc = "Chưa gửi được. Con thử lại nhé.";

    /// <summary>Có nút «Xin Ba Mẹ mở …» không (công cụ Windows như cmd, taskmgr… thì không).</summary>
    public static bool CoNutXin(string? appId) => BlockScreenView.CanAskOpen(appId);

    public const string DangXem = "Ba Mẹ đang xem nhé!";
    public const string TraLoiLaBiet = "Ba Mẹ trả lời là con biết ngay.";
    public const string DangCho = "Đang chờ duyệt";
    public static string ChuaMoDuoc(string ten) => ten + " chưa mở được";

    public static (string Tieu, string Phu) DaGui(string ten, bool web, bool tuGui, DateTimeOffset luc) => web
        ? ("Đã gửi xin mở " + ten, $"Trang mới · gửi lúc {luc:HH:mm}")
        : ("Đã gửi Ba Mẹ duyệt " + ten, (tuGui ? "App mới cài" : "Chưa có trong danh sách") + $" · gửi lúc {luc:HH:mm}");

    /// <summary>Ba Mẹ đã cho (tiêu đề, giờ duyệt, câu vui, câu phụ, nút).</summary>
    public static (string Tieu, string Luc, string Vui, string? Phu, string Nut) Duoc(string ten, bool web, DateTimeOffset luc) => web
        ? ("Ba Mẹ đã mở " + ten, $"Ba Mẹ duyệt lúc {luc:HH:mm}", $"Con vào {ten} được rồi!", null, "Mở " + ten)
        : ("Ba Mẹ đã cho " + ten, $"Ba Mẹ duyệt lúc {luc:HH:mm}", $"Giờ con mở {ten} được rồi!", "Lần sau không cần xin nữa.", "Mở " + ten);


    public static (string Tieu, string Luc, string VanKhoa) ChuaCho(string ten, bool web, DateTimeOffset luc) =>
        (web ? "Ba Mẹ chưa mở " + ten : "Ba Mẹ chưa cho " + ten, $"Ba Mẹ trả lời lúc {luc:HH:mm}", ten + " vẫn khoá trên máy này");

    public const string NhanBaMe = "Nhắn Ba Mẹ";

    // Mất mạng (con-mat-mang 12, 14): vẫn chặn; lời xin lưu lại, có mạng tự gửi; Ba Mẹ ở cạnh thì đọc mã 6 số.
    public static string MatMangTieu(string ten) => ten + " chưa có trong danh sách";
    public const string MatMangPhu = "Mất mạng vẫn dùng danh sách cũ nhé.";
    public const string CoMangLaGui = "Có mạng là gửi Ba Mẹ ngay.";
    public const string BaMeOCanh = "Ba Mẹ ở cạnh? Nhờ đọc mã 6 số";
    public const string MoApp = "Mở app";
    public const string DaLuuTieu = "Đã lưu lời xin của con";
    public const string DaLuuPhu = "Có mạng là AiiGrow gửi Ba Mẹ ngay.";
    public static string ChoCoMang(int n) => $"Chờ có mạng ({Math.Max(1, n)})";
    public const string KhongCanGuiLai = "Không cần bấm gửi lại đâu.";
}

/// <summary>Một nút trên màn khoá. <see cref="Ma"/>: nhan_ba_me | ba_me_dung_may | doi_be | xin_vay | lam_nhiem_vu.
/// <see cref="Chinh"/> = nút lớn xanh (ngoài «Làm nhiệm vụ» / «Xin vay» vốn luôn lớn) — #307: «Nhắn Ba Mẹ» khi Ba Mẹ khoá máy.</summary>
public sealed record NutKhoa(string Ma, string Chu, string Icon, bool Chinh = false);

/// <summary>#307: mốc «Ba Mẹ khoá lúc …» — giữ mốc cũ khi vẫn khoá, lấy <paramref name="now"/> khi vừa khoá, bỏ khi đã mở.</summary>
public static class KhoaLucMay
{
    public static DateTimeOffset? Cap(DateTimeOffset? cu, bool baMeKhoa, DateTimeOffset now) => baMeKhoa ? cu ?? now : null;
}

/// <summary>Nội dung màn khoá toàn màn hình (cmt-khoa-ba-me-khoa, cmt-khoa-mat-mang) và màn «Hết sao» (<see cref="HetSaoView"/>).</summary>
public sealed record ManKhoa(string Rob, string Tieu, string Phu, string? Phu2, bool DemNguoc, string? SaoDong, IReadOnlyList<NutKhoa> Nut, bool MatMang);

/// <summary>Màn khoá: 15/11 chỉ còn «Ba Mẹ đang khoá máy» (Ba Mẹ khoá ngay) và màn mất mạng — không còn giờ ngủ, hết giờ chơi, ngoại lệ
/// (hết sao KHÔNG khoá máy: <see cref="HetSaoView"/>). Lý do cũ «ngu» / «het_gio» (máy chủ cũ) hiện như Ba Mẹ khoá.</summary>
public static class ManKhoaView
{
    public const string NhanBaMe = "nhan_ba_me", BaMeDungMay = "ba_me_dung_may", XinVay = "xin_vay";
    /// <summary>06/11 (L13): «Đổi người» (máy dùng chung) ⇒ đăng xuất, về «Ai đang dùng máy?».</summary>
    public const string DoiBe = "doi_be";

    /// <summary>06/11: «AiiGrow · Bảo Anh · máy do Ba Mẹ quản lý».</summary>
    public static string ChanTrang(string tenCon, string? tenMay = null) => DangNhapView.ChanTrang(tenCon, tenMay);

    /// <summary>Máy dùng chung có bé đang dùng (them-uqukvnas): «AiiGrow · Bảo Anh đang dùng · máy do Ba Mẹ quản lý».</summary>
    public static string ChanTrang(string tenCon, bool dangDung, string? tenMay = null) => dangDung && !string.IsNullOrWhiteSpace(tenCon)
        ? "AiiGrow · " + tenCon.Trim() + " đang dùng · máy do Ba Mẹ quản lý" : DangNhapView.ChanTrang(tenCon, tenMay);

    /// <summary>«Ba Mẹ khoá lúc 19:30.» (cmt-khoa-ba-me-khoa) — null khi không biết lúc khoá.</summary>
    public static string? KhoaLucCau(DateTimeOffset? luc) => luc is { } l ? $"Ba Mẹ khoá lúc {l.ToLocalTime():HH:mm}." : null;

    /// <param name="khoaLuc">«Mẹ Lan khoá lúc 19:30.» khi biết (null = không ghi).</param>
    /// <param name="hetSao">Mất mạng mà Con đang hết sao ⇒ thẻ «Hết sao rồi» + «Xin Ba Mẹ cho vay sao» (lưu, có mạng tự gửi) + mã 6 số (cmt-khoa-mat-mang).</param>
    public static ManKhoa For(string? lyDo, string tenCon, bool offline, string? khoaLuc = null, bool hetSao = false)
    {
        var nut = new List<NutKhoa>();
        if (lyDo == LockReasons.CanMang)
        {
            // #337: máy chung, bé vào lúc mất mạng mà máy chưa có luật của bé ⇒ khoá tới khi có mạng; bé khác còn «Đổi người»
            nut.Add(new NutKhoa(DoiBe, "Đổi người", "nguoi"));
            return new ManKhoa("ngu", CanMangTieu(tenCon), CanMangPhu, null, false, null, nut, offline);
        }
        if (offline)
        {
            if (hetSao)
            {
                nut.Add(new NutKhoa(XinVay, "Xin Ba Mẹ cho vay sao", "gui"));
                return new ManKhoa("ngu", "Hết sao rồi", "Con còn 0 sao · app «Tính phút» tạm khoá.", "Có mạng là AiiGrow gửi Ba Mẹ ngay.", false, null, nut, true);
            }
            return new ManKhoa("ngu", "Ba Mẹ đang khoá máy", "Mở lại là máy báo con ngay", null, false, null, nut, true);
        }
        // #307 cmt-khoa-ba-me-khoa: Ba Mẹ «Khoá ngay» ⇒ «Nhắn Ba Mẹ» là nút chính; lý do cũ (ngu / het_gio) giữ liên kết chữ
        nut.Add(new NutKhoa(NhanBaMe, "Nhắn Ba Mẹ", "tin", lyDo == LockReasons.Khoa));
        nut.Add(new NutKhoa(BaMeDungMay, "Ba Mẹ dùng máy", "khoa"));
        return new ManKhoa("cho", "Ba Mẹ đang khoá máy", khoaLuc ?? "Mở lại là máy báo con ngay", khoaLuc != null ? "Mở lại là máy báo con ngay" : null, false, null, nut, false);
    }

    /// <summary>#337: «Cần có mạng để mở máy cho Bảo Minh».</summary>
    public static string CanMangTieu(string? tenCon) => string.IsNullOrWhiteSpace(tenCon) ? "Cần có mạng để mở máy" : "Cần có mạng để mở máy cho " + tenCon.Trim();
    public const string CanMangPhu = "Máy chưa có luật của con — nhờ Ba Mẹ nhập mã, hoặc nối mạng lại nhé.";

    // Mất mạng (cmt-khoa-mat-mang, them-dsrf5ift)
    public const string MatMangDau = "Mất mạng, luật vẫn vậy nhé!";
    public static string MatMangChip(DateTimeOffset luc) => $"● Mất mạng · {luc:HH:mm}";
    public const string BaMeOCanh = "Ba Mẹ ở cạnh con?";
    public const string DocMa = "Nhờ Ba Mẹ đọc mã 6 số trong app AiiGrow.";
    public const string MoBangMa = "Mở máy bằng mã của Ba Mẹ";
    public const string WinL = "Ba Mẹ cần dùng máy? Bấm Win + L";
    public const string MaSai = "Mã chưa đúng. Nhờ Ba Mẹ đọc lại nhé.";
    public const string VeManKhoa = "Về màn khoá";
    /// <summary>Chân màn khoá lúc mất mạng (cmt-khoa-mat-mang).</summary>
    public const string ChanMatMang = "AiiGrow · máy này do Ba Mẹ quản lý";
}

/// <summary>«Kiểm tra cập nhật» từ khay (con-mat-mang 17, 19).</summary>
public static class CapNhatKhayView
{
    public const string CoBanMoiTieu = "AiiGrow tìm ra cách sửa rồi!";
    public static string CoBanMoiPhu(string ban) => $"Có bản mới {ban} sửa lỗi này.";
    public const string GiuNguyen = "Phút chơi, sao và luật giữ nguyên.";
    public const string MotPhut = "Mất khoảng 1 phút, không cần ghép lại.";
    public const string NutCapNhat = "Cập nhật để sửa lỗi";
    public const string DeSau = "Để sau";
    public const string DangTieu = "Đang cập nhật AiiGrow…";
    public const string DangPhu = "Mất khoảng 1 phút · đừng tắt máy nhé. AiiGrow tự chạy lại.";
    public const string MoiNhatTieu = "AiiGrow đã là bản mới nhất";
    public static string MoiNhatPhu(string ban) => $"Bản {ban} · mới nhất";
    public const string NhuCu = "Phút chơi, sao và luật vẫn như cũ.";
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
        ("thu_lai", "wifi", "Mất mạng?", "Máy vẫn trừ sao đúng luật"),
        ("ma_mo", "khoa", "Máy bị khoá?", "Xin Ba Mẹ mã mở máy"),
        ("bat_lai", "canh_bao", "AiiGrow báo lỗi?", "Bấm «Bật lại AiiGrow»"),
        ("cap_nhat", "banhrang", "Cần cập nhật?", "Bấm cập nhật, chờ 1 phút"),
    };
    public const string Tieu = "Hỏi AiiGrow";
    public const string Phu = "Con đang gặp gì? Bấm vào thẻ nhé";
    public const string GoiBaMe = "Gọi Ba Mẹ giúp";
    public const string MaMoCau = "Nhờ Ba Mẹ mở app AiiGrow trên điện thoại, đọc mã 6 số cho con gõ vào màn khoá.";
}
