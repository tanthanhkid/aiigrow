namespace AiiGrow.Core;

// Sổ sao 15/11 (#263–#266) + App & web (#262/#258) phía Con trên Windows — chữ và luật hiển thị theo design đã chốt
// (bàn aiigrow-figma: cmt-hom-nay, them-er4nxw6z «đang nợ», them-upgropiw «Mở hết», them-da3zy02w «còn 5 sao», cmt-khoa-het-gio-dem-nguoc,
// them-uqukvnas «Hết sao rồi», them-zxuekzer, them-xsmcu9jj / them-rgy15s87 «Xin Ba Mẹ cho vay sao», them-luui7gvq, them-fsif1cbl, them-zo8kohea,
// them-a7sh10qs «Sao dùng thế nào?», them-jj6fglkl / them-q9a3vr5r / them-0uw5wpyr «Ba Mẹ đã thêm», them-vkdikuo0 / them-fliq9312 «chưa thêm»).
// Luật: 1 sao = 1 phút app / web «Tính phút»; hết sao ⇒ app «Tính phút» khoá, «Không tính phút» vẫn mở; vay sao ⇒ số dư âm, sao nhiệm vụ trả nợ trước;
// không còn quỹ ngày, «đổi sao lấy giờ», «xin thêm giờ», «ngoại lệ», giờ ngủ, giờ học. Lớp THUẦN (không WinForms) để test.

/// <summary>Chữ về sao + phút chơi (mẫu thống nhất của brief: «còn 30 sao = 30 phút chơi», «⭐ −20 sao», «Đang nợ Ba Mẹ 20 sao · …»).</summary>
public static class SaoView
{
    /// <summary>Dấu trừ thật (U+2212) cho số âm.</summary>
    public const char Tru = '−';

    /// <summary>«18 sao» / «−15 sao».</summary>
    public static string SoDu(int sao) => sao < 0 ? $"{Tru}{-sao} sao" : $"{sao} sao";

    /// <summary>Phút còn chơi (làm tròn xuống, không âm).</summary>
    public static int Phut(double? phutCon) => phutCon is double p && p > 0 ? (int)Math.Floor(p + 1e-9) : 0;

    /// <summary>«còn 18 sao = 18 phút chơi»; hết ⇒ «hết sao · còn 0 phút chơi».</summary>
    public static string ConPhut(double? phutCon)
    {
        var p = Phut(phutCon);
        return p > 0 ? $"còn {p} sao = {p} phút chơi" : "hết sao · còn 0 phút chơi";
    }

    /// <summary>«Còn 18 sao = 18 phút» (dòng ngắn: khay, kết quả lời xin).</summary>
    public static string ConPhutNgan(double? phutCon) { var p = Phut(phutCon); return $"Còn {p} sao = {p} phút"; }

    /// <summary>«Đang nợ Ba Mẹ 15 sao · sao nhiệm vụ trả nợ trước»; không nợ ⇒ null.</summary>
    public static string? No(int no) => no > 0 ? $"Đang nợ Ba Mẹ {no} sao · {TraNoTruoc}" : null;

    /// <summary>Câu chung «sao nhiệm vụ trả nợ trước» (viết thường, nối sau dấu «·»); <see cref="TraNoTruocHoa"/> = đầu câu.</summary>
    public const string TraNoTruoc = "sao nhiệm vụ trả nợ trước";
    public const string TraNoTruocHoa = "Sao nhiệm vụ trả nợ trước";

    /// <summary>«Hôm nay đã chơi 42 phút · −42 sao» (+ «· mất mạng vẫn trừ»).</summary>
    public static string DaChoi(int phut, bool matMang = false)
        => $"Hôm nay đã chơi {Math.Max(0, phut)} phút · {Tru}{Math.Max(0, phut)} sao" + (matMang ? " · mất mạng vẫn trừ" : "");

    /// <summary>#699: phút đã chơi hôm nay khay hiện = số máy chủ <paramref name="phutMayChu"/> (sổ sao, mọi máy) + phút vừa trừ tại máy kể từ lần đồng bộ
    /// (phút còn máy chủ gửi − phút còn tại máy, cùng cách làm tròn với <see cref="SoDuTaiMay"/> ⇒ «−N sao» khớp số dư đang hiện). null ⇒ null.</summary>
    public static int? DaChoiTaiMay(int? phutMayChu, double? phutConMayChu, double? phutConTaiMay)
    {
        if (phutMayChu is not int p) return null;
        if (phutConMayChu is not double a || phutConTaiMay is not double b) return Math.Max(0, p);
        return Math.Max(0, p) + Math.Max(0, Phut(a) - Phut(b));
    }

    /// <summary>Phút «Tính phút» đã trừ sao hôm nay: chỉ app trong <paramref name="appTinhPhut"/>, bỏ phần dùng lúc máy mở bằng mã (không trừ sao).</summary>
    public static int PhutTinh(IEnumerable<DungApp> ds, IEnumerable<string>? appTinhPhut, int phutBoiMa = 0)
    {
        var tinh = new HashSet<string>(appTinhPhut ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        return Math.Max(0, ds.Where(x => tinh.Contains(x.AppId)).Sum(x => Math.Max(0, x.Phut)) - Math.Max(0, phutBoiMa));
    }

    /// <summary>#810: dòng «đã dùng hôm nay theo app» của khay = mục ĐÃ TRỪ SAO theo sổ máy chủ (mọi máy, cả web — cùng «Đã dùng gì» của Ba Mẹ)
    /// + app «Không tính phút» đếm tại máy. Máy chủ cũ / Policy không phải của hôm nay (<paramref name="mayChu"/> null) ⇒ đếm tại máy như trước.</summary>
    public static List<DungApp> DungTheoMayChu(IReadOnlyList<DungApp>? mayChu, IEnumerable<DungApp> taiMay, IEnumerable<string>? appKhongTinh)
    {
        if (mayChu is null) return taiMay.ToList();
        var hoc = new HashSet<string>(appKhongTinh ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        return mayChu.Where(x => x.Phut > 0).Concat(taiMay.Where(x => x.Phut > 0 && hoc.Contains(x.AppId))).ToList();
    }

    /// <summary>«Roblox 30 phút · YouTube Kids 12 phút · Từ điển không tính phút» — app «Tính phút» trước, tối đa 3 mục.</summary>
    public static string DungTheoApp(IEnumerable<DungApp> ds, IEnumerable<string>? appKhongTinh)
    {
        var hoc = new HashSet<string>(appKhongTinh ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        var tinh = ds.Where(x => x.Phut > 0 && !hoc.Contains(x.AppId) && x.AppId != UsageTracker.KhongRo).Select(x => $"{x.Ten} {x.Phut} phút");
        var khong = ds.Where(x => x.Phut > 0 && hoc.Contains(x.AppId)).Select(x => $"{x.Ten} không tính phút");
        return string.Join(" · ", tinh.Take(2).Concat(khong.Take(1)).Concat(tinh.Skip(2)).Take(3));
    }

    /// <summary>Tên đẹp của tối đa <paramref name="toiDa"/> mục (app .exe / tên miền), nối «, ».</summary>
    public static string TenMuc(IEnumerable<string>? muc, int toiDa = 2)
        => string.Join(", ", (muc ?? Array.Empty<string>()).Where(m => !string.IsNullOrWhiteSpace(m)).Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(toiDa).Select(m => TrayView.FriendlyAppName(m, null)));

    /// <summary>«Hết sao để chơi · Roblox, YouTube Kids đang khoá».</summary>
    public static string HetSaoKhoa(IEnumerable<string>? appTinhPhut)
    {
        var t = TenMuc(appTinhPhut);
        return t.Length > 0 ? $"Hết sao để chơi · {t} đang khoá" : "Hết sao để chơi · app «Tính phút» đang khoá";
    }

    /// <summary>«Từ điển, Học với AiiRob vẫn mở · không tính phút».</summary>
    public static string VanMo(IEnumerable<string>? appKhongTinh)
    {
        var t = TenMuc(appKhongTinh);
        return t.Length > 0 ? $"{t} vẫn mở · không tính phút" : "App «Không tính phút» vẫn mở";
    }

    /// <summary>#641: thẻ «Chờ Ba Mẹ duyệt» chỉ hiện khi có sao chờ (> 0) hoặc chưa tải xong (null ⇒ «…»); «+0 sao» thì bỏ.</summary>
    public static bool CoTheChoDuyet(int? choDuyet) => choDuyet is null or > 0;

    /// <summary>Thẻ «Chờ Ba Mẹ duyệt»: «Duyệt xong +20 sao (đang nợ thì trả nợ trước)» / đang nợ: «Trả nợ 15 sao trước · con còn 5 sao».</summary>
    public static string ChoDuyet(int choDuyet, int no)
    {
        if (no <= 0 || choDuyet <= 0) return $"Duyệt xong +{Math.Max(0, choDuyet)} sao (đang nợ thì trả nợ trước)";
        var tra = Math.Min(no, choDuyet);
        return choDuyet > no ? $"Trả nợ {tra} sao trước · con còn {choDuyet - no} sao" : $"Trả nợ {tra} sao · còn nợ {no - tra} sao";
    }

    /// <summary>Số dư hiện tại sau phần đếm tại máy: số dư máy chủ trừ số phút «Tính phút» đã chơi từ lúc đồng bộ (dừng ở lúc hết sao — máy chủ không tự ghi nợ).</summary>
    public static int? SoDuTaiMay(int? saoMayChu, double? phutConMayChu, double? phutConTaiMay)
    {
        if (saoMayChu is not int s) return null;
        if (phutConMayChu is not double a || phutConTaiMay is not double b) return s;
        // cùng cách làm tròn với «còn N sao = N phút» (Phut = làm tròn xuống) ⇒ số dư và số phút không lệch nhau 1
        return s - Math.Max(0, Phut(a) - Phut(b));
    }

    // «Mở hết» (them-upgropiw)
    public const string MoHetNhan = "Hôm nay Ba Mẹ để chế độ";
    public const string MoHetTieu = "Mở hết";
    public const string MoHetChip = "Mở hết · không tính phút";
    public const string MoHetPhu = "App, web mở tự do · chơi không trừ sao";
    public static string MoHetSao(int sao) => $"Sao chỉ để đổi quà · con đang có {SoDu(sao)}";
    public const string NutDoiQua = "Đổi quà bằng sao";

    public const string NhanSao = "Sao để chơi · 1 sao = 1 phút";
    public const string NhanSaoNo = "Sao của con · 1 sao = 1 phút";
    public const string SaoDungTheNao = "Sao dùng thế nào?";
    public const string NutXinVay = "Xin Ba Mẹ cho vay sao";
    public const string ChoBaMeDuyet = "Chờ Ba Mẹ duyệt";
}

/// <summary>«Xin Ba Mẹ cho vay sao» (them-xsmcu9jj, them-rgy15s87) → «Đã gửi» (them-luui7gvq) → «cho vay rồi» (them-fsif1cbl) / «chưa cho» (them-zo8kohea).</summary>
public static class XinVayView
{
    public static readonly int[] Muc = { 10, 15, 30 };
    public const int MacDinh = 15, ToiDa = 1000;
    public static int Kep(int soSao) => Math.Clamp(soSao, 1, ToiDa);

    public const string TieuDe = "AiiGrow · Xin vay sao";
    public const string Tieu = "Xin Ba Mẹ cho vay sao";
    /// <summary>Dòng phụ: hết sao ⇒ «Con hết sao rồi · 1 sao = 1 phút chơi»; còn ⇒ «Con còn 18 sao · 1 sao = 1 phút chơi».</summary>
    public static string Phu(double? phutCon) => SaoView.Phut(phutCon) > 0 ? $"Con còn {SaoView.Phut(phutCon)} sao · 1 sao = 1 phút chơi" : "Con hết sao rồi · 1 sao = 1 phút chơi";
    /// <summary>Mở từ popup «Hết sao rồi» (them-rgy15s87): «Chọn số sao con muốn vay · 1 sao = 1 phút».</summary>
    public const string PhuChon = "Chọn số sao con muốn vay · 1 sao = 1 phút";
    public const string ConXinVay = "Con xin vay";
    public const string GoiYNhan = "Nhắn Ba Mẹ: con làm nốt bài với bạn ạ";
    public static string Nut(int soSao) => $"Xin Ba Mẹ cho vay {soSao} sao";
    public const string VayTraTheNao = "Vay rồi trả thế nào? ›";
    public const string XinThemApp = "Xin thêm app / web ›";   // #422: mở cùng hộp «Xin thêm app / web» với Hôm nay / menu khay
    /// <summary>Lý do gửi kèm (không bắt buộc).</summary>
    public static string? LyDo(string? nhan) { var t = nhan?.Trim(); return string.IsNullOrEmpty(t) ? null : t.Length > 100 ? t[..100] : t; }

    // Đã gửi
    public const string DaGui = "Đã gửi Ba Mẹ!";
    public static string ConXin(int soSao) => $"Con xin vay {soSao} sao";
    public const string DangCho = "Đang chờ Ba Mẹ";
    public const string TraLoiBaoNgay = "Ba Mẹ trả lời là máy báo con ngay.";
    public const string LamNhiemVuTrongLucCho = "Làm nhiệm vụ trong lúc chờ";

    // Ba Mẹ cho vay
    public static string ChoVayTieu(string? ten) => $"{TenBaMe(ten)} cho vay rồi!";
    public static string ChoVayChip(int soSao) => $"+{soSao} sao";
    public static string ChoVayDong(int soSao, int no) => $"Ba Mẹ cho vay {soSao} sao · Con đang nợ {Math.Max(soSao, no)} sao";
    public static string ChoiTiep(double? phutCon) => SaoView.Phut(phutCon) > 0 ? $"Chơi tiếp {SaoView.Phut(phutCon)} phút" : "Chơi tiếp";

    // Ba Mẹ chưa cho
    public const string ChuaChoTieu = "Ba Mẹ chưa cho vay sao";
    public static string ChuaChoPhu(int sao) => $"Con còn {SaoView.SoDu(Math.Max(0, sao))} · làm nhiệm vụ để có sao";
    public const string LamNhiemVuKiemSao = "Làm nhiệm vụ kiếm sao";
    public const string NhanBaMe = "Nhắn Ba Mẹ";
    public const string VeHomNay = "Về Hôm nay";

    // Mất mạng (them-a86wn24i, them-dsrf5ift)
    public const string DaLuu = "Đã lưu lời xin vay sao";
    public const string DaLuuPhu = "Có mạng là AiiGrow tự gửi Ba Mẹ.";
    public const string CoMangLaGui = "Có mạng là gửi ngay";

    public static string TenBaMe(string? ten) => string.IsNullOrWhiteSpace(ten) ? "Ba Mẹ" : ten.Trim();
}

/// <summary>«Sao dùng thế nào?» (them-a7sh10qs): 1 sao = 1 phút, hết sao khoá, vay, trả nợ.</summary>
public static class SaoDungView
{
    public const string TieuDe = "AiiGrow · Sao dùng thế nào?";
    public const string ConDangCo = "Con đang có";
    public static string BangPhut(double? phutCon) => $"= {SaoView.Phut(phutCon)} phút chơi";
    public static (string Icon, string Tieu, string Phu)[] Dong(IEnumerable<string>? appTinh, IEnumerable<string>? appKhong)
    {
        var tinh = SaoView.TenMuc(appTinh); var khong = SaoView.TenMuc(appKhong); var khong1 = SaoView.TenMuc(appKhong, 1);
        return new[]
        {
            ("game", "Chơi app «Tính phút»: 1 phút trừ 1 sao", (tinh.Length > 0 ? tinh : "Game, video") + (khong1.Length > 0 ? $" · {khong1} không tính phút" : "")),
            ("khoa", "Hết sao thì app «Tính phút» khoá", khong.Length > 0 ? $"{khong} vẫn mở" : "App «Không tính phút» vẫn mở"),
            ("gui", "Cần thêm? Xin Ba Mẹ cho vay sao", "Vay thì nợ · sao nhiệm vụ trả nợ trước"),
        };
    }
    public const string LamNhiemVu = "Làm nhiệm vụ kiếm sao";
    public const string XinVay = "Xin Ba Mẹ cho vay sao ›";
}

/// <summary>Nhắc «Còn 5 sao = 5 phút chơi» góc phải dưới (them-da3zy02w) — khi app «Tính phút» đang chơi và sao còn ≤ 5.</summary>
public static class NhacSaoView
{
    public const int Moc = 5;
    public static string Tieu(int con) => $"Còn {Math.Max(0, con)} sao = {Math.Max(0, con)} phút chơi";
    public static string Phu(string? app) => "Lưu bài nhé · hết sao là " + (string.IsNullOrWhiteSpace(app) ? "app «Tính phút»" : app) + " đóng";
    public const string LamNhiemVu = "Làm nhiệm vụ kiếm sao";
    public const string XinVay = "Xin Ba Mẹ cho vay sao";

    /// <summary>Vừa xuống mốc nhắc (lần đầu ≤ 5 sao, còn &gt; 1 sao) trong lúc chơi app «Tính phút».</summary>
    public static bool NenNhac(double? phutCon, bool dangChoiTinhPhut, bool daNhac)
        => dangChoiTinhPhut && !daNhac && phutCon is double p && p <= Moc && p > 1;
}

/// <summary>Màn «Sắp hết sao rồi» (đếm ngược, cmt-khoa-het-gio-dem-nguoc) → «Hết sao rồi» (them-uqukvnas) — toàn màn hình nhưng KHÔNG khoá máy:
/// app «Tính phút» đóng, «Không tính phút» vẫn mở. Popup «Hết sao rồi · Roblox sắp đóng» (them-zxuekzer) khi Con mở app «Tính phút» lúc 0 sao.</summary>
public static class HetSaoView
{
    public const string LamNhiemVu = "lam_nhiem_vu", XinVay = "xin_vay", NhanBaMe = "nhan_ba_me", DoiBe = "doi_be", BaMeMo = "ba_me_dung_may";

    /// <summary>Còn ≤ 1 phút và đang chơi app «Tính phút» ⇒ đếm ngược toàn màn hình.</summary>
    public static bool DemNguoc(double? phutCon, bool dangChoiTinhPhut) => dangChoiTinhPhut && phutCon is double p && p > 0 && p <= 1;

    /// <param name="giayCon">&gt; 0 ⇒ «Sắp hết sao rồi» (đếm ngược); null / 0 ⇒ «Hết sao rồi».</param>
    /// <param name="doiBe">Máy dùng chung có bé đang dùng ⇒ «Đổi người» + «Ba Mẹ mở máy».</param>
    public static ManKhoa For(int? giayCon, string? appDangChoi, IEnumerable<string>? appKhongTinh, bool doiBe)
    {
        var app = string.IsNullOrWhiteSpace(appDangChoi) ? "app «Tính phút»" : appDangChoi!;
        var nut = new List<NutKhoa>
        {
            new(LamNhiemVu, giayCon is > 0 ? "Làm nhiệm vụ kiếm sao" : "Làm nhiệm vụ", "tick"),
            new(XinVay, "Xin Ba Mẹ cho vay sao", "gui"),
        };
        if (giayCon is > 0)
        {
            nut.Add(new(BaMeMo, "Ba Mẹ dùng máy", "khoa"));
            return new ManKhoa("chi", "Sắp hết sao rồi", $"Lưu bài đang làm nhé. Hết sao, {app} đóng sau", null, true, "Còn 1 sao = 1 phút chơi", nut, false);
        }
        nut.Add(new(NhanBaMe, "Nhắn Ba Mẹ", "tin"));
        if (doiBe) nut.Add(new(DoiBe, "Đổi người", "nguoi"));
        nut.Add(new(BaMeMo, doiBe ? "Ba Mẹ mở máy" : "Ba Mẹ dùng máy", "khoa"));
        return new ManKhoa("nghi", "Hết sao rồi", "App «Tính phút» tạm khoá nhé.", SaoView.VanMo(appKhongTinh), false, "Con còn 0 sao · 1 sao = 1 phút chơi", nut, false);
    }

    /// <summary>16/11 (#302): app «Tính phút» khoá vì GIỚI HẠN (còn sao) — «Nghỉ một chút · chơi tiếp lúc HH:MM» / «Hôm nay chơi đủ rồi».
    /// Không «Làm nhiệm vụ» (sao không mở được); vẫn «Xin Ba Mẹ cho vay sao» (Ba Mẹ cho vay ⇒ thêm giờ hôm nay, hết nghỉ). null = không phải giới hạn.
    /// Bàn thiết kế chưa có màn này — dựng theo màn «Hết sao rồi».</summary>
    public static ManKhoa? ForGioiHan(string? lyDo, string? gio, string? cau, IEnumerable<string>? appKhongTinh, bool doiBe)
    {
        if (lyDo is not (GioiHanMay.DangNghi or GioiHanMay.HetGioNgay)) return null;
        var nut = new List<NutKhoa> { new(XinVay, "Xin Ba Mẹ cho vay sao", "gui"), new(NhanBaMe, "Nhắn Ba Mẹ", "tin") };
        if (doiBe) nut.Add(new(DoiBe, "Đổi người", "nguoi"));
        nut.Add(new(BaMeMo, doiBe ? "Ba Mẹ mở máy" : "Ba Mẹ dùng máy", "khoa"));
        return lyDo == GioiHanMay.DangNghi
            ? new ManKhoa("nghi", "Nghỉ một chút", CauNghi(gio), SaoView.VanMo(appKhongTinh), false, "Lúc nghỉ không trừ sao", nut, false)
            : new ManKhoa("nghi", "Hôm nay chơi đủ rồi", string.IsNullOrWhiteSpace(cau) ? "Mai chơi tiếp nhé" : cau!, SaoView.VanMo(appKhongTinh), false, "Ba Mẹ đặt giờ chơi tối đa mỗi ngày", nut, false);
    }

    /// <summary>«Nghỉ một chút · chơi tiếp lúc 16:30».</summary>
    public static string CauNghi(string? gio) => $"Nghỉ một chút · chơi tiếp lúc {(string.IsNullOrWhiteSpace(gio) ? "lát nữa" : gio)}";

    /// <summary>16/11 (#302): đếm ngược phút cuối khi giới hạn chặn trước số sao — «Sắp hết giờ chơi» thay «Sắp hết sao rồi».
    /// <paramref name="luot"/>: lượt chặn trước (sắp nghỉ) / false = giới hạn ngày (hết hôm nay). Giữ «Đổi người» + chip app vẫn mở như màn hết sao.</summary>
    public static ManKhoa ForSapHetGio(int giayCon, string? appDangChoi, bool luot, IEnumerable<string>? appKhongTinh, bool doiBe)
    {
        var app = string.IsNullOrWhiteSpace(appDangChoi) ? "app «Tính phút»" : appDangChoi!;
        var nut = new List<NutKhoa> { new(XinVay, "Xin Ba Mẹ cho vay sao", "gui") };
        if (doiBe) nut.Add(new(DoiBe, "Đổi người", "nguoi"));
        nut.Add(new(BaMeMo, doiBe ? "Ba Mẹ mở máy" : "Ba Mẹ dùng máy", "khoa"));
        return new ManKhoa("chi", "Sắp hết giờ chơi", $"Lưu bài đang làm nhé. {app} đóng sau", SaoView.VanMo(appKhongTinh), true,
            luot ? "Hết lượt thì nghỉ một chút nhé" : "Hôm nay chơi đủ giờ rồi · mai chơi tiếp nhé", nut, false);
    }

    // Popup trên desktop (them-zxuekzer)
    public const string PopTieu = "Hết sao rồi";
    public static string PopPhu(string app) => $"Con dùng hết sao · {app} sắp đóng";
    public const string PopSao = "Con còn 0 sao";
    public const string PopDong = "1 sao = 1 phút chơi · làm nhiệm vụ để có sao";

    /// <summary>16/11 (#302): popup khi Con mở app «Tính phút» lúc đang nghỉ / đã chơi đủ hôm nay (còn sao). null = không phải giới hạn.</summary>
    public static (string Tieu, string Phu, string Dong)? PopGioiHan(string? lyDo, string? gio, string? cau, string app) => lyDo switch
    {
        GioiHanMay.DangNghi => ("Nghỉ một chút", $"{app} tạm đóng · chơi tiếp lúc {(string.IsNullOrWhiteSpace(gio) ? "lát nữa" : gio)}", "Lúc nghỉ không trừ sao"),
        GioiHanMay.HetGioNgay => ("Hôm nay chơi đủ rồi", string.IsNullOrWhiteSpace(cau) ? "Mai chơi tiếp nhé" : cau!, "Ba Mẹ cho thêm thì chơi tiếp được"),
        _ => null,
    };
}

/// <summary>Kết quả lời xin thêm app / web vào danh sách (#258): «Ba Mẹ đã thêm CapCut · Nhóm «Tính phút»» / «Không tính phút · không trừ sao» /
/// «Ba Mẹ cho mở 30 phút» / «Ba Mẹ chưa thêm CapCut · Xin lại».</summary>
public static class KetQuaXinView
{
    public enum Loai { Cho, DaThem, MoTam, ChuaThem, HetHan }

    /// <summary>Đọc kết quả: máy chủ mới trả `ketQua`; máy chủ cũ chỉ có `status` (duoc / tu_choi / cho).</summary>
    public static Loai Doc(string? ketQua, string? status) => ketQua switch
    {
        "da_them" => Loai.DaThem,
        "mo_tam" => Loai.MoTam,
        "chua_them" => Loai.ChuaThem,
        "het_han" or "huy" => Loai.HetHan,
        "cho" => Loai.Cho,
        _ => TrayView.XinGio(status) switch
        {
            TrayView.KetQuaXin.Duoc => Loai.DaThem,
            TrayView.KetQuaXin.TuChoi => Loai.ChuaThem,
            TrayView.KetQuaXin.HetHan => Loai.HetHan,
            _ => Loai.Cho,
        },
    };

    public static string DaThemTieu(string ten) => $"Ba Mẹ đã thêm {ten}";
    public static string DaThemLuc(string? nguoi, DateTimeOffset luc, bool web) => $"{XinVayView.TenBaMe(nguoi)} thêm {(web ? "" : "vào danh sách ")}lúc {luc.ToLocalTime():HH:mm}";
    public static string DaThemVui(string ten, bool khongTinh, bool web) =>
        khongTinh ? $"Con vào {ten} thoải mái nhé!" : web ? $"Con vào {ten} được rồi!" : $"Giờ con mở {ten} được rồi!";
    public const string LanSau = "Lần sau không cần xin nữa.";
    public static string Nhom(bool khongTinh, bool web) => khongTinh ? "Nhóm «Không tính phút»" : web ? "Nhóm «Tính phút» · 1 sao = 1 phút" : "Nhóm «Tính phút»";
    public static string NhomPhu(bool khongTinh, double? phutCon) => khongTinh ? "Không trừ sao" : SaoView.ConPhutNgan(phutCon);
    public static string Mo(string ten) => "Mở " + ten;

    public static string MoTamTieu(int phut) => $"Ba Mẹ cho mở {phut} phút";
    public static string MoTamPhu(string ten, DateTimeOffset? den) => den is { } d ? $"{ten} mở đến {d.ToLocalTime():HH:mm} · chưa vào danh sách" : $"{ten} mở tạm · chưa vào danh sách";

    public static string ChuaThemTieu(string ten) => $"Ba Mẹ chưa thêm {ten}";
    public static string ChuaThemLuc(string? nguoi, DateTimeOffset luc) => $"{XinVayView.TenBaMe(nguoi)} trả lời lúc {luc.ToLocalTime():HH:mm}";
    public static string ChuaThemCau(string ten) => $"Ba Mẹ chưa thêm {ten} lúc này.";
    public const string XinLaiSau = "Con xin lại sau được nhé!";
    public const string XinLai = "Xin lại";
    public const string VeTrangChinh = "Về trang chính";
}
