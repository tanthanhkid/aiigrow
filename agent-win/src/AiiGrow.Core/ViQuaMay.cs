using System.Collections;
using System.Globalization;
using QRCoder;

namespace AiiGrow.Core;

// «Ví quà» của bé đang đăng nhập trên máy — GET api/device/vi-qua (V1, docs/API.md). Khoá camelCase. Chỉ đọc; đổi quà vẫn qua POST hoc-vien/doi/{id}.
// Dùng cho «Sao & quà» (bảng giá + điều kiện) và «Quà của con» (chờ trao, đã trao, voucher có ảnh QR, huy hiệu).

public sealed class ViQuaCon
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string? Avatar { get; set; }
}

public sealed class ViQuaDieuKien
{
    public bool ChiCuoiTuan { get; set; }
    public int? ToiDaThang { get; set; }
    public int DaDoiThang { get; set; }
    public int? TonKho { get; set; }
}

/// <summary>Quà bảng giá ÁP CHO bé: đủ sao + hợp lệ (điều kiện) ⇒ <see cref="DoiDuoc"/>.</summary>
public sealed class ViQuaQua
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string Loai { get; set; } = "";
    public int Sao { get; set; }
    public string? Hinh { get; set; }
    public string? MoTa { get; set; }
    public int? MenhGia { get; set; }
    public bool LaVoucher { get; set; }
    public bool Du { get; set; }
    public int ConThieu { get; set; }
    public DateTimeOffset? ChoTraoTu { get; set; }
    public ViQuaDieuKien DieuKien { get; set; } = new();
    public bool ConHopLe { get; set; } = true;
    /// <summary>chi_cuoi_tuan | du_thang | null.</summary>
    public string? LyDoKhong { get; set; }
    public bool DoiDuoc { get; set; }
}

public sealed class ViQuaPhieuCho
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string Loai { get; set; } = "";
    public int Sao { get; set; }
    public DateTimeOffset? DoiLuc { get; set; }
}

/// <summary>Voucher AiiCafe đi kèm quà đã trao — <see cref="Qr"/> chỉ có khi còn dùng được (null ⇒ không vẽ mã).</summary>
public sealed class ViQuaVoucher
{
    public string? Ten { get; set; }
    public string Ma { get; set; } = "";
    public string? Qr { get; set; }
    public int? MenhGia { get; set; }
    /// <summary>da_phat_hanh | da_dung | het_han.</summary>
    public string TrangThai { get; set; } = "";
    public DateTimeOffset? HetHan { get; set; }
    public int? ConNgay { get; set; }
    public DateTimeOffset? DungLuc { get; set; }
}

public sealed class ViQuaDaTrao
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string Loai { get; set; } = "";
    public int Sao { get; set; }
    public DateTimeOffset? TraoLuc { get; set; }
    public ViQuaVoucher? Voucher { get; set; }
}

public sealed class ViQuaHuyHieu
{
    public string Ma { get; set; } = "";
    public string Ten { get; set; } = "";
    public string MoTa { get; set; } = "";
    public DateTimeOffset? DatLuc { get; set; }
}

/// <summary>GET api/device/vi-qua.</summary>
public sealed class ViQuaMay
{
    public ViQuaCon Con { get; set; } = new();
    public int Sao { get; set; }
    public int SaoGiu { get; set; }
    public List<ViQuaQua> Qua { get; set; } = new();
    public List<ViQuaPhieuCho> PhieuCho { get; set; } = new();
    public List<ViQuaDaTrao> DaTrao { get; set; } = new();
    public List<ViQuaVoucher> Voucher { get; set; } = new();
    public List<ViQuaHuyHieu> HuyHieu { get; set; } = new();
}

public static class ViQuaMayView
{
    /// <summary>Đường gọi qua dịch vụ (PipeCmd.HocVien) — máy chủ: <c>api/device/vi-qua</c>.</summary>
    public const string Duong = "vi-qua";

    public static string Tien(int n) => n.ToString("#,0", CultureInfo.InvariantCulture).Replace(',', '.') + "đ";

    public static string TenVoucher(ViQuaVoucher v) =>
        !string.IsNullOrWhiteSpace(v.Ten) ? (v.Ten!.StartsWith("Voucher", StringComparison.OrdinalIgnoreCase) ? v.Ten! : "Voucher " + v.Ten)
        : v.MenhGia is int m && m > 0 ? $"Voucher AiiCafe {m / 1000}k" : "Voucher AiiCafe";

    /// <summary>Còn dùng được = máy chủ trả <c>qr</c> và chưa quá hạn (đồng hồ máy chỉ để chặn voucher vừa quá hạn giữa hai lượt tải).</summary>
    public static bool DungDuoc(ViQuaVoucher v, DateTimeOffset now)
        => v.TrangThai == "da_phat_hanh" && !string.IsNullOrWhiteSpace(v.Qr) && (v.HetHan == null || v.HetHan > now);

    /// <summary>«Còn 49 ngày» / «Hết hạn hôm nay».</summary>
    public static string ConNgay(ViQuaVoucher v, DateTimeOffset now)
    {
        var n = v.ConNgay ?? (v.HetHan is { } h ? (int)Math.Floor((h - now).TotalDays) : 0);
        return n <= 0 ? "Hết hạn hôm nay" : $"Còn {n} ngày";
    }

    /// <summary>Dòng phụ voucher đang dùng được: «Mã AG… · hạn 25/12».</summary>
    public static string PhuVoucher(ViQuaVoucher v) =>
        $"Mã {v.Ma}" + (v.HetHan is { } h ? " · hạn " + h.ToLocalTime().ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) : "");

    public static string TrangThaiCu(ViQuaVoucher v) => v.TrangThai == "da_dung" ? "Đã dùng" : "Hết hạn";

    /// <summary>Lý do quà chưa đổi được dù đủ sao (điều kiện của Ba Mẹ).</summary>
    public static string? LyDoKhong(ViQuaQua q) => q.LyDoKhong switch
    {
        "chi_cuoi_tuan" => "Quà này chỉ đổi vào cuối tuần",
        "du_thang" => q.DieuKien.ToiDaThang is int t ? $"Tháng này con đổi đủ {t} lần rồi" : "Tháng này con đổi đủ rồi",
        _ => q.ConHopLe ? null : "Chưa đổi được lúc này",
    };

    /// <summary>Dòng phụ quà trong «Quà con đổi được»: lý do điều kiện (nếu có) → đã đổi, chờ trao → «Đủ sao rồi!» / «Còn thiếu N sao».</summary>
    public static (string Chu, bool Du) TrangThaiDoi(ViQuaQua q)
    {
        if (q.ChoTraoTu != null) return ("Con đã chọn, chờ Ba Mẹ trao", false);
        if (q.Du && LyDoKhong(q) is { } ly) return (ly, false);
        return q.Du ? ("Đủ sao rồi!", q.DoiDuoc) : ($"Còn thiếu {Math.Max(0, q.ConThieu)} sao", false);
    }

    /// <summary>Huy hiệu mới nhất trước.</summary>
    public static List<ViQuaHuyHieu> HuyHieuMoiTruoc(IEnumerable<ViQuaHuyHieu> ds) => ds.OrderByDescending(h => h.DatLuc ?? DateTimeOffset.MinValue).ToList();

    /// <summary>Voucher «đã nhận» cho danh sách: còn dùng được hết (hạn gần trước), rồi tối đa <paramref name="cu"/> phiếu đã dùng / hết hạn.</summary>
    public static List<ViQuaVoucher> SapXepVoucher(IEnumerable<ViQuaVoucher> ds, DateTimeOffset now, int cu = 3)
    {
        var l = ds.ToList();
        var dung = l.Where(v => DungDuoc(v, now)).OrderBy(v => v.HetHan ?? DateTimeOffset.MaxValue);
        return dung.Concat(l.Where(v => !DungDuoc(v, now)).Take(cu)).ToList();
    }
}

/// <summary>Mã QR của voucher (QRCoder, MIT): ma trận ô đen/trắng, khay tự vẽ (không dùng bộ vẽ của thư viện). Ma trận đã gồm lề trắng 4 ô quanh mã (QRCoder mặc định).</summary>
public static class MaQr
{
    public static bool[,] MaTran(string noiDung)
    {
        using var gen = new QRCodeGenerator();
        using var data = gen.CreateQrCode(noiDung, QRCodeGenerator.ECCLevel.M);
        List<BitArray> m = data.ModuleMatrix;
        var n = m.Count;
        var kq = new bool[n, n];
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++) kq[y, x] = m[y][x];
        return kq;
    }
}
