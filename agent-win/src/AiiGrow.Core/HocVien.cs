using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// Ứng dụng khay của HỌC VIÊN — hai chiều với Ba Mẹ (máy chủ: server/lib/hoc-vien.ts, /api/device/hoc-vien/*).
// Con nhận việc → làm → nộp → xem điểm / quà → nhận thông báo. Mọi luật (tần suất, thời gian tối thiểu, ảnh trùng, trừ điểm, tồn kho)
// do MÁY CHỦ quyết; khay chỉ hiện và gửi. Lớp này thuần (không WinForms) để test được.

/// <summary>Một nhiệm vụ trong «Việc của Con». <see cref="TrangThai"/>: san_sang | dang_lam | can_bo_sung | du_hom_nay | du_tuan.</summary>
public sealed class HvNhiemVu
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string MoTa { get; set; } = "";
    public string Nhom { get; set; } = "khac";
    public int Diem { get; set; }
    /// <summary>anh | video | ghi_am | van_ban | tu_dong.</summary>
    public string BangChung { get; set; } = "anh";
    public string Kieu { get; set; } = "thuong";
    public DateTimeOffset? Han { get; set; }
    public int PhutToiThieu { get; set; }
    public string TrangThai { get; set; } = "san_sang";
    /// <summary>Id lượt đang làm / cần bổ sung (null nếu chưa bắt đầu).</summary>
    public string? Luot { get; set; }
    public int DangCho { get; set; }
    public bool GiaoRieng { get; set; }
    /// <summary>Lý do Ba Mẹ nhờ bổ sung (chỉ khi <c>can_bo_sung</c>).</summary>
    public string? LyDo { get; set; }
}

public sealed class HvLuot
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    /// <summary>cho_duyet | duoc_duyet | tu_choi | can_bo_sung.</summary>
    public string TrangThai { get; set; } = "";
    public int? Diem { get; set; }
    public string? LyDo { get; set; }
    public string? LoiKhen { get; set; }
    public DateTimeOffset? Luc { get; set; }
}

public sealed class HvLoiKhen
{
    public string Id { get; set; } = "";
    public string NoiDung { get; set; } = "";
    public string? PhanHoi { get; set; }
    public DateTimeOffset? Luc { get; set; }
}

public sealed class HvPhieu
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public int Diem { get; set; }
}

public sealed class HvCapDo
{
    public int Cap { get; set; } = 1;
    public int DiemCapSau { get; set; }
    public int ConThieu { get; set; }
}

public sealed class HvCon
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
}

/// <summary>GET hoc-vien/tong-quan.</summary>
public sealed class HvTongQuan
{
    public HvCon Con { get; set; } = new();
    public int SoDu { get; set; }
    public int TongKiem { get; set; }
    public HvCapDo CapDo { get; set; } = new();
    public int DiemChoDuyet { get; set; }
    public List<HvNhiemVu> NhiemVu { get; set; } = new();
    public List<HvLuot> Gan { get; set; } = new();
    public List<HvLoiKhen> LoiKhen { get; set; } = new();
    public List<HvPhieu> PhieuCho { get; set; } = new();
}

public sealed class HvQua
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string Loai { get; set; } = "qua";
    public int Diem { get; set; }
    public bool Du { get; set; }
    public int ConThieu { get; set; }
    public bool ChiCuoiTuan { get; set; }
}

/// <summary>GET hoc-vien/cua-hang.</summary>
public sealed class HvCuaHang
{
    public int SoDu { get; set; }
    public List<HvQua> Qua { get; set; } = new();
}

public sealed class HvTin
{
    public string Id { get; set; } = "";
    public string Loai { get; set; } = "";
    public string Tieu { get; set; } = "";
    public string Noi { get; set; } = "";
    public DateTimeOffset? Luc { get; set; }
}

/// <summary>GET hoc-vien/tin?sau=…</summary>
public sealed class HvTinDs
{
    public List<HvTin> Ds { get; set; } = new();
    public DateTimeOffset? Bay { get; set; }
}

public sealed class HvNopKq
{
    /// <summary>cho_duyet | duoc_duyet (nhiệm vụ tự duyệt).</summary>
    public string TrangThai { get; set; } = "";
    public bool NghiTrung { get; set; }
}

public sealed class HvDoiKq
{
    public string Phieu { get; set; } = "";
    /// <summary>cho_trao | cho_xac_nhan | da_phat_hanh.</summary>
    public string TrangThai { get; set; } = "";
    public HvVoucher? Voucher { get; set; }
}

public sealed class HvVoucher
{
    public string Ma { get; set; } = "";
    public DateTimeOffset? HetHan { get; set; }
}

/// <summary>Phản hồi <c>{ok: true}</c> của máy chủ.</summary>
public sealed class HvDongY
{
    public bool Ok { get; set; }
}

public sealed class HvBatDauKq
{
    public string Luot { get; set; } = "";
}

/// <summary>Chữ hiển thị + quy tắc nhỏ của màn «Nhiệm vụ & quà».</summary>
/// <summary>App to: một mục chưa có dữ liệu thì đang ở ca nào — chưa ghép / đang tải / lỗi (hiện lý do + «Thử lại», không treo «Đang tải…»).</summary>
public enum TaiHocVien { ChuaGhep, DangTai, Loi, Xong }

public static class HocVienView
{
    public static TaiHocVien TrangThaiTai(bool paired, bool coDuLieu, string? loi) =>
        !paired ? TaiHocVien.ChuaGhep : coDuLieu ? TaiHocVien.Xong : string.IsNullOrWhiteSpace(loi) ? TaiHocVien.DangTai : TaiHocVien.Loi;

    public static T? Parse<T>(string? raw) where T : class
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try { return JsonSerializer.Deserialize<T>(raw, Json.Options); }
        catch (JsonException) { return null; }
    }

    /// <summary>«Còn 2 giờ», «Hạn hôm nay 21:00», «Còn 3 ngày», «Đã hết hạn». Null ⇒ không có hạn.</summary>
    public static string? HanText(DateTimeOffset? han, DateTimeOffset now)
    {
        if (han == null) return null;
        var left = han.Value - now;
        if (left <= TimeSpan.Zero) return "Đã hết hạn";
        if (left.TotalMinutes < 60) return $"Còn {Math.Max(1, (int)Math.Ceiling(left.TotalMinutes))} phút";
        if (left.TotalHours < 24) return $"Còn {(int)Math.Floor(left.TotalHours)} giờ";
        return $"Còn {(int)Math.Floor(left.TotalDays)} ngày";
    }

    public static string TrangThaiText(string? trangThai) => trangThai switch
    {
        "dang_lam" => "Đang làm",
        "can_bo_sung" => "Ba Mẹ nhờ bổ sung",
        "du_hom_nay" => "Hôm nay đã đủ",
        "du_tuan" => "Tuần này đã đủ",
        "cho_duyet" => "Chờ Ba Mẹ duyệt",
        "duoc_duyet" => "Đã được duyệt",
        "tu_choi" => "Chưa được duyệt",
        _ => "Sẵn sàng",
    };

    /// <summary>Nhãn nút hành động của một nhiệm vụ; null ⇒ không có nút (hết lượt hôm nay/tuần này).</summary>
    public static string? NutText(HvNhiemVu v) => v.TrangThai switch
    {
        "dang_lam" => v.BangChung == "tu_dong" ? null : "Nộp bài",
        "can_bo_sung" => "Nộp lại",
        "san_sang" => v.BangChung == "tu_dong" ? null : "Nhận việc",
        _ => null,
    };

    /// <summary>Có cần Con viết vài câu / chụp ảnh khi nộp không (khớp luật máy chủ: lib/nhiem-vu.ts nop()).</summary>
    public static bool CanAnh(HvNhiemVu v) => v.BangChung == "anh";
    public static bool CanChu(HvNhiemVu v) => v.BangChung == "van_ban";

    /// <summary>Việc cần Con làm ngay xếp trước: cần bổ sung → đang làm → sẵn sàng (hạn gần trước) → đã đủ lượt.</summary>
    public static List<HvNhiemVu> SapXep(IEnumerable<HvNhiemVu> ds)
    {
        static int Hang(HvNhiemVu v) => v.TrangThai switch { "can_bo_sung" => 0, "dang_lam" => 1, "san_sang" => 2, _ => 3 };
        return ds.OrderBy(Hang).ThenBy(v => v.Han ?? DateTimeOffset.MaxValue).ThenByDescending(v => v.Diem).ToList();
    }

    /// <summary>Số việc Con còn có thể làm (sẵn sàng / đang làm / cần bổ sung).</summary>
    public static int SoViecMo(HvTongQuan t) => t.NhiemVu.Count(v => v.TrangThai is "san_sang" or "dang_lam" or "can_bo_sung");

    public static string CapText(HvCapDo c) => c.ConThieu > 0 ? $"Cấp {c.Cap} · còn {c.ConThieu} điểm lên cấp" : $"Cấp {c.Cap}";

    public static string QuaTrangThai(HvQua q)
        => q.Du ? "Đủ điểm" : $"Còn thiếu {q.ConThieu} điểm";

    public static string DoiThongBao(HvDoiKq r, string tenQua) => r.TrangThai switch
    {
        "da_phat_hanh" => r.Voucher != null ? $"Đã đổi «{tenQua}». Mã phiếu: {r.Voucher.Ma}" : $"Đã đổi «{tenQua}».",
        "cho_xac_nhan" => $"Đã đổi «{tenQua}». Đang chờ Ba Mẹ xác nhận.",
        _ => $"Đã đổi «{tenQua}». Nhờ Ba Mẹ trao quà cho con nhé!",
    };

    public static string NopThongBao(HvNopKq r) => r.TrangThai switch
    {
        "duoc_duyet" => "Xong rồi! Điểm đã được cộng.",
        _ => r.NghiTrung ? "Đã nộp. Ảnh này giống ảnh con từng nộp, Ba Mẹ sẽ xem kỹ nhé." : "Đã nộp cho Ba Mẹ. Chờ Ba Mẹ duyệt nhé!",
    };

    /// <summary>Gộp nhiều tin mới thành MỘT toast: (tiêu đề, nội dung). Ít nhất một tin.</summary>
    public static (string Tieu, string Noi) ToastText(IReadOnlyList<HvTin> moi)
    {
        if (moi.Count == 1) return (Cat(moi[0].Tieu, 60), Cat(moi[0].Noi, 180));
        var dau = moi.Take(3).Select(t => t.Tieu).Distinct();
        return ($"Có {moi.Count} tin mới", Cat(string.Join(" · ", dau), 180));
    }

    /// <summary>Bấm vào toast ⇒ mở app to đúng mục: tin về nhiệm vụ → Nhiệm vụ, quà / huy hiệu → Phần quà, lời khen → Tin nhắn;
    /// nhiều loại lẫn nhau ⇒ Tin nhắn (hộp thư liệt kê hết).</summary>
    public static MucApp MucChoTin(IReadOnlyList<HvTin> moi)
    {
        static MucApp? Muc(string loai) => loai switch
        {
            "giao_nhiem_vu" or "nhiem_vu_moi" or "duyet_nhiem_vu" or "tu_duyet_nhiem_vu" or "tu_choi_nhiem_vu" or "can_bo_sung" => MucApp.NhiemVu,
            "xac_nhan_qua" or "huy_qua" or "huy_hieu" => MucApp.PhanQua,
            _ => MucApp.TinNhan,
        };
        var ds = moi.Select(t => Muc(t.Loai)!.Value).Distinct().ToList();
        return ds.Count == 1 ? ds[0] : MucApp.TinNhan;
    }

    private static string Cat(string s, int max) => s.Length <= max ? s : s[..(max - 1)] + "…";
}

/// <summary>Theo dõi tin đã báo để khay chỉ hiện toast cho tin MỚI. Lần hỏi đầu chỉ ghi nhớ (không bật toast cho tin cũ).
/// Máy chủ lùi mốc 5 phút nên cùng một tin có thể về nhiều lần ⇒ lọc theo <see cref="HvTin.Id"/>.</summary>
public sealed class TinTracker
{
    private readonly HashSet<string> _seen = new();
    private readonly Queue<string> _order = new();
    private const int Max = 300;

    public bool DaCoLanDau { get; private set; }
    /// <summary>Mốc <c>sau</c> cho lần hỏi kế (= <c>bay</c> máy chủ trả; null ⇒ hỏi 7 ngày gần nhất).</summary>
    public DateTimeOffset? Moc { get; private set; }

    /// <summary>Nhận kết quả một lần hỏi → danh sách tin mới nên báo (rỗng ở lần đầu).</summary>
    public List<HvTin> Nhan(HvTinDs r)
    {
        var moi = new List<HvTin>();
        foreach (var t in r.Ds.OrderBy(x => x.Luc ?? DateTimeOffset.MinValue))
        {
            if (string.IsNullOrEmpty(t.Id) || !_seen.Add(t.Id)) continue;
            _order.Enqueue(t.Id);
            if (_order.Count > Max) _seen.Remove(_order.Dequeue());
            moi.Add(t);
        }
        if (r.Bay != null) Moc = r.Bay;
        var lanDau = !DaCoLanDau;
        DaCoLanDau = true;
        return lanDau ? new List<HvTin>() : moi;
    }
}

/// <summary>Đường được phép đi từ khay qua dịch vụ tới <c>api/device/…</c>. Khay là tiến trình của Con ⇒ chỉ cho đúng các đường học viên,
/// KHÔNG cho gọi đường tuỳ ý (khoá, gỡ, chính sách…) bằng token máy.</summary>
public static class HocVienPaths
{
    public const string Goc = "hoc-vien/";

    public static bool Allowed(string? method, string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return false;
        var m = (method ?? "").ToUpperInvariant();
        var q = path.IndexOf('?');
        var query = q >= 0 ? path[(q + 1)..] : "";
        var p = q >= 0 ? path[..q] : path;
        if ((m != "GET" && query.Length > 0) || !p.StartsWith(Goc, StringComparison.Ordinal) || query.Contains("..") || p.Contains("..")) return false;
        var s = p[Goc.Length..].Split('/');
        if (s.Any(x => x.Length == 0 || !x.All(c => char.IsLetterOrDigit(c) || c is '-' or '_'))) return false;
        return (m, s.Length) switch
        {
            ("GET", 1) => s[0] is "tong-quan" or "tin" or "cua-hang",
            ("POST", 2) => s[0] == "doi",
            ("POST", 3) => (s[0] == "nhiem-vu" && s[2] == "bat-dau") || (s[0] == "luot" && s[2] == "nop") || (s[0] == "loi-khen" && s[2] == "phan-hoi"),
            _ => false,
        };
    }
}

/// <summary>Co ảnh bằng chứng cho vừa trần máy chủ (≤ 400 KB sau giải base64; khay nén về ≤ 300 KB).</summary>
public static class AnhBangChung
{
    public const int MaxCanh = 1280;
    public const int MaxByte = 300 * 1024;

    /// <summary>Kích thước mới giữ tỉ lệ, cạnh dài ≤ <paramref name="maxCanh"/>; không phóng to.</summary>
    public static (int W, int H) Fit(int w, int h, int maxCanh = MaxCanh)
    {
        if (w <= 0 || h <= 0) return (1, 1);
        var dai = Math.Max(w, h);
        if (dai <= maxCanh) return (w, h);
        var k = (double)maxCanh / dai;
        return (Math.Max(1, (int)Math.Round(w * k)), Math.Max(1, (int)Math.Round(h * k)));
    }
}
