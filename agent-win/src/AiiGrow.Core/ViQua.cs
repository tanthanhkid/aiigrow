using System.Collections;
using System.Globalization;
using System.Text.Json.Serialization;
using QRCoder;

namespace AiiGrow.Core;

// Mục «Ví quà & huy hiệu» của app to (BANG-TINH-NANG-OS mục 15): ví quà (phiếu QR AiiCafe), huy hiệu + cấp, bảng quy tắc của nhà —
// cùng dữ liệu màn Con web /tre (vi-qua, huy-hieu, quy-tac) qua GET api/device/hoc-vien/{vi-qua, thanh-tich, quy-tac}. Chỉ đọc.

public sealed class HvVoucherVi
{
    public string Ma { get; set; } = "";
    [JsonPropertyName("menh_gia")] public int MenhGia { get; set; }
    /// <summary>da_phat_hanh (dùng được) | cho_xac_nhan | da_dung | het_han | thu_hoi.</summary>
    [JsonPropertyName("trang_thai")] public string TrangThai { get; set; } = "";
    [JsonPropertyName("het_han")] public DateTimeOffset? HetHan { get; set; }
    [JsonPropertyName("dung_luc")] public DateTimeOffset? DungLuc { get; set; }
}

public sealed class HvPhieuVi
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    /// <summary>voucher (chờ Ba Mẹ xác nhận) | qua | dac_quyen… (chờ Ba Mẹ trao).</summary>
    public string Loai { get; set; } = "";
    public int Diem { get; set; }
    [JsonPropertyName("created_at")] public DateTimeOffset? Luc { get; set; }
}

/// <summary>GET hoc-vien/vi-qua.</summary>
public sealed class HvViQua
{
    public List<HvVoucherVi> Voucher { get; set; } = new();
    public List<HvPhieuVi> Phieu { get; set; } = new();
}

public sealed class HvHuyHieu
{
    public string Ma { get; set; } = "";
    public string Ten { get; set; } = "";
    [JsonPropertyName("mo_ta")] public string MoTa { get; set; } = "";
    public bool Dat { get; set; }
    public DateTimeOffset? DatLuc { get; set; }
}

/// <summary>GET hoc-vien/thanh-tich.</summary>
public sealed class HvThanhTich
{
    public int ChuoiNgay { get; set; }
    public int TongKiem { get; set; }
    public HvCapDo CapDo { get; set; } = new();
    public List<HvHuyHieu> HuyHieu { get; set; } = new();
}

public sealed class HvKhung
{
    public string Tu { get; set; } = "";
    public string Den { get; set; } = "";
}

public sealed class HvLich
{
    public List<HvKhung> NgayThuong { get; set; } = new();
    public List<HvKhung> CuoiTuan { get; set; } = new();
    public HvKhung Ngu { get; set; } = new();
}

public sealed class HvGiaPhut
{
    public double Game { get; set; }
    [JsonPropertyName("video_ngan")] public double VideoNgan { get; set; }
    public double Mxh { get; set; }
    [JsonPropertyName("phim_gd")] public double PhimGd { get; set; }
}

/// <summary>GET hoc-vien/quy-tac (bảng quy tắc công khai, FR-06.05).</summary>
public sealed class HvQuyTac
{
    public HvLich Lich { get; set; } = new();
    public int TranNgay { get; set; }
    public int PhienToiDa { get; set; }
    public int NghiGiua { get; set; }
    public HvGiaPhut GiaPhut { get; set; } = new();
}

public static class ViQuaView
{
    private static readonly string[] TenCapDs = { "Hạt giống", "Nảy mầm", "Lá non", "Mầm xanh", "Cây non", "Cây lớn", "Ra hoa", "Kết trái", "Cổ thụ", "Rừng xanh" };

    /// <summary>Tên cấp như màn Con web (huy-hieu.tsx).</summary>
    public static string TenCap(int cap) => TenCapDs[Math.Clamp(cap, 1, TenCapDs.Length) - 1];

    /// <summary>50000 ⇒ «50.000đ».</summary>
    public static string Tien(int n) => n.ToString("#,0", CultureInfo.InvariantCulture).Replace(',', '.') + "đ";

    public static string Ngay(DateTimeOffset? t) => t is { } x ? x.ToLocalTime().ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) : "";

    /// <summary>Phiếu đang dùng được (QR) — còn hạn.</summary>
    public static List<HvVoucherVi> DungDuoc(HvViQua v, DateTimeOffset now)
        => v.Voucher.Where(x => x.TrangThai == "da_phat_hanh" && (x.HetHan == null || x.HetHan > now)).ToList();

    /// <summary>Dòng phụ của phiếu đã dùng / hết hạn / thu hồi (phiếu chờ xác nhận nằm ở danh sách «chờ»).</summary>
    public static string? TrangThaiCu(HvVoucherVi v) => v.TrangThai switch
    {
        "da_dung" => "Đã dùng " + Ngay(v.DungLuc),
        "het_han" => "Hết hạn " + Ngay(v.HetHan),
        "thu_hoi" => "Đã thu hồi",
        _ => null,
    };

    public static string PhieuCho(HvPhieuVi p) => p.Loai == "voucher" ? "Chờ Ba Mẹ xác nhận" : "Chờ Ba Mẹ trao";

    public static string Khung(IEnumerable<HvKhung> ds)
    {
        var s = string.Join(", ", ds.Select(k => $"{k.Tu}–{k.Den}"));
        return s.Length == 0 ? "không có" : s;
    }

    /// <summary>0,5 điểm/phút; 0 ⇒ «Không trừ điểm».</summary>
    public static string Gia(double diemPhut) => diemPhut <= 0 ? "Không trừ điểm" : diemPhut.ToString("0.##", CultureInfo.InvariantCulture).Replace('.', ',') + " điểm/phút";

    /// <summary>Tiến độ lên cấp (0–1), cùng công thức màn Con web: điểm mốc cấp trước = 100·(cap−1)·cap/2.</summary>
    public static double TienDo(HvThanhTich t)
    {
        var cap = Math.Max(1, t.CapDo.Cap);
        var truoc = 100.0 * (cap - 1) * cap / 2;
        return t.CapDo.DiemCapSau > truoc ? Math.Clamp((t.TongKiem - truoc) / (t.CapDo.DiemCapSau - truoc), 0, 1) : 0;
    }

    /// <summary>Huy hiệu đã đạt trước, rồi chưa đạt.</summary>
    public static List<HvHuyHieu> SapXep(IEnumerable<HvHuyHieu> ds) => ds.OrderByDescending(h => h.Dat).ToList();
}

/// <summary>Mã QR của phiếu quà (thư viện QRCoder, MIT): ma trận ô đen/trắng, khay tự vẽ. Đã gồm lề trắng 4 ô quanh mã.</summary>
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
