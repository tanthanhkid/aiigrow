namespace AiiGrow.Core;

/// <summary>#822: ảnh chụp phần trạng thái làm khay quyết định «có báo bé hay không». Giá trị thuần, không đồng hồ.</summary>
/// <param name="Khoa">Máy đang khoá (dịch vụ đã áp).</param>
/// <param name="LyDoKhoa">Lý do khoá (<see cref="LockReasons"/>).</param>
/// <param name="HetGio">Lý do giới hạn chơi (<see cref="GioiHanMay"/>: het_gio_ngay | dang_nghi) hoặc null.</param>
/// <param name="GioNghiDen">«HH:MM» hết nghỉ khi đang nghỉ.</param>
/// <param name="WebChan">Trang web Ba Mẹ chặn (null = dịch vụ chưa biết / không áp luật web lúc này).</param>
/// <param name="WebCho">Trang web Ba Mẹ cho phép (null = như trên).</param>
/// <param name="MoDenGio">#823: «HH:MM» hết hạn khi Ba Mẹ đang mở có hạn (mở khẩn cấp / thêm giờ); null = không mở có hạn.</param>
public sealed record TrangThaiBaoBe(bool Khoa, string? LyDoKhoa, string? HetGio, string? GioNghiDen, IReadOnlyCollection<string>? WebChan, IReadOnlyCollection<string>? WebCho, string? MoDenGio = null)
{
    public static TrangThaiBaoBe Tu(TrayState s, DateTimeOffset? now = null)
        => new(s.Locked, s.LockReason, s.GioiHanLyDo, s.GioiHanGio, s.WebChan, s.WebCho, s.Mode == Modes.TuDo ? MoCoHan.GioHet(s.GrantEndsAt, now ?? DateTimeOffset.Now) : null);
}

/// <summary>#823: Ba Mẹ mở khẩn cấp / thêm giờ = mode tu_do + hạn (GrantEndsAt). Lớp thuần: chữ báo bé và chữ trong app khi đang mở.</summary>
public static class MoCoHan
{
    /// <summary>«HH:MM» giờ máy của hạn mở nếu còn hạn, ngược lại null.</summary>
    public static string? GioHet(DateTimeOffset? hetHan, DateTimeOffset now)
        => hetHan is { } h && h > now ? h.ToLocalTime().ToString("HH:mm") : null;

    public static bool Dang(DateTimeOffset? hetHan, DateTimeOffset now) => hetHan is { } h && h > now;

    /// <summary>Trạng thái khay: đang mở có hạn thật sự (mode tu_do — mode hoc có hạn vẫn chặn app «Tính phút»).</summary>
    public static bool Dang(TrayState s, DateTimeOffset now) => s.Mode == Modes.TuDo && Dang(s.GrantEndsAt, now);

    public static BaoBe BaoMo(string gio) => new("mo_khoa", "Ba Mẹ vừa mở máy cho con", $"Con chơi và học thoải mái tới {gio} nhé.", ChongLapBao.BaMeMo);
    public static BaoBe BaoHet() => new("dong_ho_cat", "Hết giờ Ba Mẹ mở rồi", "Máy trở lại như mọi hôm. Con xem lại giờ chơi trong AiiGrow nhé.");

    /// <summary>Dòng trong thẻ Sao khi đang mở: thay «Hết sao để chơi · … đang khoá» (app «Tính phút» đang chơi được).</summary>
    public static string DongDangMo(string gio) => $"Ba Mẹ đang mở máy · chơi thoải mái tới {gio}";
}

/// <summary>Một hộp báo: icon 3D, tiêu đề, câu phụ. <paramref name="Nhom"/>: việc Ba Mẹ vừa làm (khoá / mở) — cùng việc tới từ hai đường chỉ báo một lần
/// (<see cref="ChongLapBao"/>), hộp ở lâu hơn để bé kịp thấy; null = hộp khác (giờ ngủ, hết giờ, web).</summary>
public sealed record BaoBe(string Icon, string Tieu, string Phu, string? Nhom = null);

/// <summary>#822: bé chỉ được báo khi trạng thái ĐỔI theo hướng ảnh hưởng bé — máy chuyển sang khoá, vừa hết giờ chơi, Ba Mẹ thêm web.
/// Không báo lặp mỗi lần đồng bộ; lượt đầu (chưa có trạng thái trước) chỉ lấy mốc, không báo.</summary>
public static class BaoBeDoiTrangThai
{
    public const int WebToiDa = 3;

    /// <summary>Lý do khoá mà bé thật sự bị khoá lại (không tính «Ai đang dùng máy?», đòi mạng, màn chặn giải trí).</summary>
    public static bool LaKhoaBaoDuoc(string? lyDo) => lyDo is LockReasons.Khoa or LockReasons.Ngu or LockReasons.HetGio;

    /// <summary>Mốc kế tiếp: web null (không biết) giữ nguyên mốc cũ để Ba Mẹ mở máy xong quay lại không bị coi là «thêm cả danh sách».</summary>
    public static TrangThaiBaoBe GiuMoc(TrangThaiBaoBe? truoc, TrangThaiBaoBe nay)
        => truoc == null ? nay : nay with { WebChan = nay.WebChan ?? truoc.WebChan, WebCho = nay.WebCho ?? truoc.WebCho };

    public static IReadOnlyList<BaoBe> Xet(TrangThaiBaoBe? truoc, TrangThaiBaoBe nay)
    {
        var ds = new List<BaoBe>();
        if (truoc == null) return ds;

        if (nay.Khoa && LaKhoaBaoDuoc(nay.LyDoKhoa) && (!truoc.Khoa || !LaKhoaBaoDuoc(truoc.LyDoKhoa))) ds.Add(KhoaMay(nay.LyDoKhoa));

        // «hết giờ chơi» chỉ khi vào trạng thái giới hạn mới (hoặc đổi từ nghỉ sang hết giờ ngày), đang khoá máy thì màn khoá đã nói rồi
        if (!nay.Khoa && nay.HetGio is GioiHanMay.HetGioNgay or GioiHanMay.DangNghi && nay.HetGio != truoc.HetGio)
            ds.Add(HetGioChoi(nay.HetGio, nay.GioNghiDen));

        // #823: Ba Mẹ mở khẩn cấp bật / hết hạn
        if (nay.MoDenGio != null && truoc.MoDenGio == null) ds.Add(MoCoHan.BaoMo(nay.MoDenGio));
        else if (nay.MoDenGio == null && truoc.MoDenGio != null && !nay.Khoa) ds.Add(MoCoHan.BaoHet());

        if (ThemWeb(truoc, nay) is { } web) ds.Add(web);
        return ds;
    }

    public static BaoBe KhoaMay(string? lyDo) => lyDo switch
    {
        LockReasons.Ngu => new BaoBe("khoa", "Đến giờ ngủ rồi", "Máy nghỉ tới sáng. Con ngủ ngon nhé."),
        LockReasons.HetGio => new BaoBe("khoa", "Hết giờ dùng máy rồi", "Khi tới lượt tiếp theo máy sẽ mở lại."),
        _ => new BaoBe("khoa", "Ba Mẹ vừa khoá máy", "Khi Ba Mẹ mở máy, con học và chơi tiếp nhé.", ChongLapBao.BaMeKhoa),
    };

    public static BaoBe HetGioChoi(string? lyDo, string? gioNghiDen) => lyDo == GioiHanMay.DangNghi
        ? new BaoBe("dong_ho_cat", "Nghỉ một chút nhé", string.IsNullOrWhiteSpace(gioNghiDen) ? "Con nghỉ một lúc rồi chơi tiếp nhé." : $"Con chơi tiếp lúc {gioNghiDen}.")
        : new BaoBe("dong_ho_cat", "Hôm nay chơi đủ giờ rồi", "Mai con chơi tiếp nhé.");

    private static BaoBe? ThemWeb(TrangThaiBaoBe truoc, TrangThaiBaoBe nay)
    {
        if (truoc.WebChan == null || truoc.WebCho == null || nay.WebChan == null || nay.WebCho == null) return null;
        var choTruoc = new HashSet<string>(truoc.WebCho, StringComparer.OrdinalIgnoreCase);
        var chanTruoc = new HashSet<string>(truoc.WebChan, StringComparer.OrdinalIgnoreCase);
        // mục từ «cho» sang «chặn» là cửa sổ «mở» hết hạn, không phải Ba Mẹ thêm
        var chanMoi = nay.WebChan.Where(x => !chanTruoc.Contains(x) && !choTruoc.Contains(x)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.Ordinal).ToList();
        var choMoi = nay.WebCho.Where(x => !choTruoc.Contains(x) && !chanTruoc.Contains(x)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.Ordinal).ToList();
        if (chanMoi.Count == 0 && choMoi.Count == 0) return null;
        if (chanMoi.Count > 0)
            return new BaoBe("web", "Ba Mẹ vừa chặn thêm web", Liet(chanMoi) + ". Con mở lại trình duyệt nếu trang chưa đổi nhé.");
        return new BaoBe("web", "Ba Mẹ vừa cho phép thêm web", Liet(choMoi) + ". Con mở lại trình duyệt nếu trang chưa vào được nhé.");
    }

    private static string Liet(List<string> ds)
        => ds.Count <= WebToiDa ? string.Join(", ", ds) : string.Join(", ", ds.Take(WebToiDa)) + $" và {ds.Count - WebToiDa} trang khác";
}

/// <summary>#822 / #823: tin máy chủ «Ba Mẹ đã khoá máy» / «Ba Mẹ mở máy cho con đến hh:mm» (hoc-vien/tin — cùng đường với tin duyệt, cho vay…) ⇒ hộp AiiGrow.
/// Đường này không phụ thuộc khay có thấy trạng thái đổi hay không (khay vừa bật lại, bé đang mở app to…). Cùng việc từ hai đường chỉ báo một lần (<see cref="ChongLapBao"/>).</summary>
public static class BaoTuTin
{
    /// <summary>Tin khoá chỉ hiện hộp khi máy đang khoá thật; tin mở khi máy đang mở có hạn thật (<see cref="MoCoHan.Dang(TrayState, DateTimeOffset)"/> —
    /// mở khẩn cấp không gỡ giờ ngủ / khoá ngay, mode «hoc» vẫn chặn app «Tính phút»).</summary>
    public static bool KhopTrangThai(string? nhom, TrayState s, DateTimeOffset now) => nhom switch
    {
        ChongLapBao.BaMeKhoa => s.Locked,
        ChongLapBao.BaMeMo => !s.Locked && MoCoHan.Dang(s, now),
        _ => true,
    };

    /// <summary>Hộp nhóm <paramref name="nhom"/> đang mở nhưng máy đã đổi (khoá → mở / hết mở, Ba Mẹ «Khoá lại ngay») ⇒ chữ trên hộp đã sai.</summary>
    public static bool HopDaSai(string? nhom, TrayState s, DateTimeOffset now) => nhom != null && !KhopTrangThai(nhom, s, now);

    public static BaoBe? Tu(HvTin t) => t.Loai switch
    {
        "khoa_ngay" or "khoa_may" => new BaoBe("khoa", t.Tieu, t.Noi, ChongLapBao.BaMeKhoa),
        "mo_khan_cap" => new BaoBe("mo_khoa", t.Tieu, t.Noi, ChongLapBao.BaMeMo),
        _ => null,
    };

    /// <summary>Tin mới nhất cần hộp (danh sách máy chủ xếp mới trước) hoặc null.</summary>
    public static BaoBe? MoiNhat(IEnumerable<HvTin> moi) => moi.OrderByDescending(t => t.Luc ?? DateTimeOffset.MinValue).Select(Tu).FirstOrDefault(b => b != null);

    /// <summary>Tin chỉ để bóng báo (không có hộp riêng).</summary>
    public static List<HvTin> ConLai(IEnumerable<HvTin> moi) => moi.Where(t => Tu(t) == null).ToList();
}

/// <summary>#822 / #823: cùng một việc Ba Mẹ làm (khoá máy / mở máy) tới từ trạng thái dịch vụ VÀ từ tin máy chủ — chỉ một hộp trong <see cref="Cua"/>.
/// Tin máy chủ mang giờ («Máy mở lại lúc 08:53», «đến 09:40») ⇒ luôn được hiện, THAY hộp chung của đường trạng thái (hộp mới đóng hộp cũ — không chồng);
/// đường trạng thái tới sau tin thì thôi. Hộp không có nhóm (giờ ngủ, hết giờ, web) không bị chặn. Giá trị thuần, mốc giờ truyền vào.</summary>
public sealed class ChongLapBao
{
    public const string BaMeKhoa = "ba_me_khoa";
    public const string BaMeMo = "ba_me_mo";
    public static readonly TimeSpan Cua = TimeSpan.FromMinutes(3);
    private readonly Dictionary<string, DateTimeOffset> _da = new();

    /// <summary>true = nên hiện (và ghi nhận). <paramref name="tuTin"/> = hộp từ tin máy chủ (đủ giờ) ⇒ luôn hiện.</summary>
    public bool NenHien(BaoBe b, DateTimeOffset now, bool tuTin = false)
    {
        if (b.Nhom == null) return true;
        if (!tuTin && _da.TryGetValue(b.Nhom, out var luc) && now - luc < Cua && now >= luc) return false;
        _da[b.Nhom] = now;
        return true;
    }
}
