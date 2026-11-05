using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AiiGrow.Core;

// App của Con trên Windows theo thiết kế đã chốt 05/11 (docs/thiet-ke-chot/con-ngay-thuong, con-xin): Hôm nay · Nhiệm vụ · Sao & quà · Tin nhắn,
// hộp «Thêm giờ chơi» (Dùng sao / Xin Ba Mẹ), nộp bài (ảnh / ghi âm / viết / bấm Xong) và các màn kết quả. Con 9 tuổi: ít chữ, chỉ «sao»
// (10 sao = 10 phút), «Ba Mẹ». Lớp THUẦN (không WinForms) để test. Máy chủ quyết mọi luật (server/lib/quy-gio.ts, nhiem-vu.ts, phan-thuong.ts).

/// <summary>Giờ ngủ / giờ học «HH:mm» (Policy windows.gioNgu / gioHoc, tong-quan.quy.gioNgu).</summary>
public sealed class KhungGio
{
    public string Tu { get; set; } = "";
    public string Den { get; set; } = "";
    /// <summary>Giờ học: các thứ áp dụng (0 = Chủ nhật … 6 = Thứ Bảy); giờ ngủ: rỗng = mọi ngày.</summary>
    public List<int> Thu { get; set; } = new();
}

public sealed class HvTyLe
{
    public int Sao { get; set; } = 10;
    public int Phut { get; set; } = 10;
}

public sealed class HvDoiSaoCau
{
    public bool Bat { get; set; } = true;
    public int ToiDaNgay { get; set; } = 30;
    public int ConDoiDuoc { get; set; } = 30;
}

/// <summary>Quỹ giờ chơi hôm nay (tong-quan.quy / GET quy › quy): «còn 18 phút (42/60)» = ConPhut (DaDung / TongPhut).</summary>
public sealed class HvQuy
{
    public double ConPhut { get; set; }
    public double DaDung { get; set; }
    public double TongPhut { get; set; }
    public double QuyNgayPhut { get; set; }
    public double ThemPhut { get; set; }
    public bool DangNgu { get; set; }
    public bool DangHoc { get; set; }
    public bool Khoa { get; set; }
    public KhungGio? GioNgu { get; set; }
    public KhungGio? GioHoc { get; set; }
    public HvTyLe TyLe { get; set; } = new();
    public HvDoiSaoCau DoiSao { get; set; } = new();
    public bool ChoXinThem { get; set; } = true;
}

/// <summary>GET hoc-vien/quy.</summary>
public sealed class HvQuyDs
{
    public HvQuy Quy { get; set; } = new();
    public int Sao { get; set; }
    public int PhutDoiDuoc { get; set; }
}

/// <summary>POST hoc-vien/doi-sao {phut}.</summary>
public sealed class HvDoiSaoKq
{
    public int Phut { get; set; }
    public int Sao { get; set; }
    public int SoDu { get; set; }
    public double ConPhut { get; set; }
}

/// <summary>Một việc của GET hoc-vien/nhiem-vu?tuCham=1 (chữ snake_case như màn Con) — khay chỉ lấy việc AiiRob tự chấm.</summary>
public sealed class HvNvDong
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public int Diem { get; set; }
    public int? Sao { get; set; }
    public string? Hinh { get; set; }
    public string? Bo { get; set; }
    [JsonPropertyName("tu_cham")] public bool TuCham { get; set; }
    [JsonPropertyName("trang_thai_con")] public string TrangThaiCon { get; set; } = "san_sang";
    public int SoSao => Sao ?? Diem;
}

public sealed class HvNvDs
{
    public List<HvNvDong> Ds { get; set; } = new();
}

public sealed class HvQuaDaTrao
{
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public int Diem { get; set; }
    [JsonPropertyName("xu_ly_luc")] public DateTimeOffset? XuLyLuc { get; set; }
}

/// <summary>GET hoc-vien/vi-qua (05/11 «Quà của con»).</summary>
public sealed class HvViQua
{
    public List<HvQuaDaTrao> DaTrao { get; set; } = new();
}

/// <summary>Một dòng việc trên màn Nhiệm vụ / thẻ Hôm nay.</summary>
/// <param name="Nhom">cho_duyet | chua_lam | lam_lai | tu_cham.</param>
/// <param name="Nut">Chữ nút (null = không nút, chỉ nhãn «Chờ duyệt»).</param>
public sealed record ViecCon(string Nhom, string Ten, string Phu, int Sao, string Icon, string? Nut, HvNhiemVu? NhiemVu, string? LoiNhan = null);

/// <summary>Kết quả Ba Mẹ trả lời, đọc từ tin (hoc-vien/tin) để bật màn kết quả: duyệt · nhờ làm lại · trao quà · cho thêm giờ.</summary>
/// <param name="Loai">duyet | lam_lai | trao_qua | them_gio.</param>
public sealed record KetQuaTin(string Loai, string Ten, int? Sao, int? Phut, string? LoiNhan);

public static class AppConView
{
    /// <summary>«Mở Học với AiiRob» — trang học của AiiRob (Câu mở: chưa có địa chỉ chính thức; mặc định trang AiiLab).</summary>
    public const string AiiRobUrl = "https://aiilab.vn/aiirob";

    private static readonly string[] Thu = { "Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy" };

    public static string Chao(string? ten) => string.IsNullOrWhiteSpace(ten) ? "Xin chào!" : $"Chào {ten.Trim()}!";

    /// <summary>«Thứ Ba · 19:30».</summary>
    public static string NgayGio(DateTime now) => $"{Thu[(int)now.DayOfWeek]} · {now:HH:mm}";

    public static string Phut(double phut) => $"{Math.Max(0, (int)Math.Floor(phut))} phút";
    public static string Sao(int sao) => $"{sao} sao";

    /// <summary>«Đã chơi 42 / 60 phút».</summary>
    public static string DaChoi(double daDung, double tong) => $"Đã chơi {Math.Max(0, (int)Math.Round(daDung))} / {Math.Max(0, (int)Math.Round(tong))} phút";

    /// <summary>Phần đã chơi trên thanh (0–1).</summary>
    public static double TiLe(double daDung, double tong) => tong <= 0 ? 1 : Math.Clamp(daDung / tong, 0, 1);

    /// <summary>«Roblox 30 phút · YouTube Kids 12 phút · Từ điển không tính giờ» — app tính giờ trước, tối đa 3 mục; app Học ⇒ «không tính giờ».</summary>
    public static string DungTheoApp(IEnumerable<DungApp> ds, IEnumerable<string>? appHoc)
    {
        var hoc = new HashSet<string>(appHoc ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        var tinh = ds.Where(x => x.Phut > 0 && !hoc.Contains(x.AppId) && x.AppId != UsageTracker.KhongRo).Select(x => $"{x.Ten} {x.Phut} phút");
        var khong = ds.Where(x => x.Phut > 0 && hoc.Contains(x.AppId)).Select(x => $"{x.Ten} không tính giờ");
        return string.Join(" · ", tinh.Take(2).Concat(khong.Take(1)).Concat(tinh.Skip(2)).Take(3));
    }

    /// <summary>«10 sao = 10 phút chơi».</summary>
    public static string TyLe(HvTyLe? t) => $"{t?.Sao ?? 10} sao = {t?.Phut ?? 10} phút chơi";

    /// <summary>«Đổi 10 sao lấy 10 phút» (tỷ lệ do Ba Mẹ đặt).</summary>
    public static string NutDoiSao(HvTyLe? t) => $"Đổi {t?.Sao ?? 10} sao lấy {t?.Phut ?? 10} phút";

    /// <summary>Số sao cần để đổi <paramref name="phut"/> phút (làm tròn lên, như máy chủ saoChoPhut).</summary>
    public static int SaoChoPhut(int phut, HvTyLe? t)
    {
        var p = Math.Max(1, t?.Phut ?? 10);
        var s = Math.Max(1, t?.Sao ?? 10);
        return (int)Math.Ceiling(phut * (double)s / p);
    }

    /// <summary>Số phút đổi được nhiều nhất lúc này: theo sao hiện có và phần còn đổi được hôm nay.</summary>
    public static int PhutDoiToiDa(int sao, HvQuy? q)
    {
        var t = q?.TyLe ?? new HvTyLe();
        var theoSao = (int)Math.Floor(sao * (double)Math.Max(1, t.Phut) / Math.Max(1, t.Sao));
        return Math.Max(0, Math.Min(theoSao, q?.DoiSao.ConDoiDuoc ?? theoSao));
    }

    /// <summary>Đang giờ ngủ / Ba Mẹ khoá / giờ học ⇒ không thêm giờ (chỉ xin ngoại lệ — màn khoá của W2).</summary>
    public static bool KhongThemGio(HvQuy? q) => q != null && (q.DangNgu || q.Khoa || q.DangHoc);

    // ------------------------------------------------------------------ nhiệm vụ

    private static readonly Dictionary<string, string> TenBo = new()
    {
        ["tu_lap"] = "Tự lập", ["viec_nha"] = "Phụ việc nhà", ["hoc_tap"] = "Học tập", ["khoe_manh"] = "Khoẻ mạnh",
    };

    /// <summary>«Bộ Tự lập · 5 việc» (bộ nhiều việc nhất); không có bộ ⇒ «5 việc hôm nay».</summary>
    public static string BoViec(IEnumerable<string?> bo, int soViec)
    {
        var chinh = bo.Where(b => !string.IsNullOrWhiteSpace(b)).GroupBy(b => b!).OrderByDescending(g => g.Count()).FirstOrDefault()?.Key;
        var ten = chinh == null ? null : TenBo.TryGetValue(chinh, out var t) ? t : chinh;
        return ten == null ? $"{soViec} việc hôm nay" : $"Bộ {ten} · {soViec} việc";
    }

    /// <summary>Icon 3D của một việc theo mã hình / bằng chứng / tên.</summary>
    public static string IconViec(string? hinh, string? bangChung, string ten, bool tuCham = false)
    {
        if (tuCham || bangChung == "tu_dong") return "may_tinh";
        var h = (hinh ?? "").ToLowerInvariant();
        var t = ten.ToLowerInvariant();
        if (h is "sach" || t.Contains("đọc") || bangChung == "ghi_am") return "sach";
        if (h is "choi" or "lau" || t.Contains("dọn") || t.Contains("lau")) return "lau";
        if (h is "cap" or "mu" || t.Contains("cặp")) return "mu";
        if (h is "ban_chai" || t.Contains("răng")) return "tick";
        if (h is "cay") return "nha";
        if (h is "bat") return "coc";
        return "tick";
    }

    /// <summary>Chữ nút theo cách báo xong: ảnh ⇒ «Nộp ảnh», ghi âm ⇒ «Nộp ghi âm», viết ⇒ «Viết bài», bấm Xong ⇒ «Xong rồi».</summary>
    public static string NutNop(string? bangChung) => bangChung switch
    {
        "ghi_am" => "Nộp ghi âm",
        "van_ban" or "viet" => "Viết bài",
        "xong" => "Xong rồi",
        _ => "Nộp ảnh",
    };

    private static string GoiYNop(string? bangChung) => bangChung switch
    {
        "ghi_am" => "ghi âm cho Ba Mẹ nghe",
        "van_ban" or "viet" => "viết vài câu",
        "xong" => "làm xong bấm Xong",
        _ => "chụp 1 ảnh",
    };

    /// <summary>Dòng phụ của việc chưa làm: «Trước 21:00 · chụp 1 ảnh».</summary>
    public static string PhuChuaLam(HvNhiemVu v)
    {
        var dau = !string.IsNullOrWhiteSpace(v.GioNhac) ? "Trước " + v.GioNhac : v.LapLai switch
        {
            "hang_ngay" => "Mỗi ngày", "ngay_thuong" => "Thứ 2 – Thứ 6", "cuoi_tuan" => "Cuối tuần", _ => null,
        };
        return dau == null ? Hoa(GoiYNop(v.BangChung)) : $"{dau} · {GoiYNop(v.BangChung)}";
    }

    private static string Hoa(string s) => s.Length == 0 ? s : char.ToUpperInvariant(s[0]) + s[1..];

    private static string BangChungGan(string? bangChung) => bangChung switch
    {
        "ghi_am" => "Ghi âm", "van_ban" or "viet" => "Bài viết", "xong" => "Đã bấm Xong", _ => "Ảnh",
    };

    /// <summary>Chia việc của Con: Ba Mẹ nhờ làm lại → Chờ Ba Mẹ duyệt → Chưa làm (kể cả «Học với AiiRob» tự chấm).</summary>
    public static List<ViecCon> DanhSach(HvTongQuan tq, IEnumerable<HvNvDong>? tuCham)
    {
        var ra = new List<ViecCon>();
        var theoTen = tq.NhiemVu.GroupBy(v => v.Ten).ToDictionary(g => g.Key, g => g.First());
        foreach (var v in tq.NhiemVu.Where(v => v.TrangThai == "can_bo_sung"))
            ra.Add(new ViecCon("lam_lai", v.Ten, "Ba Mẹ nhờ con làm lại", v.SoSao, IconViec(v.Hinh, v.BangChung, v.Ten),
                v.BangChung == "ghi_am" ? "Ghi âm lại" : v.BangChung is "van_ban" or "viet" ? "Viết lại" : v.BangChung == "xong" ? "Làm lại" : "Chụp lại ảnh",
                v, string.IsNullOrWhiteSpace(v.LoiNhan) ? v.LyDo : v.LoiNhan));
        foreach (var g in tq.Gan.Where(g => g.TrangThai == "cho_duyet"))
        {
            theoTen.TryGetValue(g.Ten, out var v);
            var nop = g.Luc is { } l ? $" · nộp {l.ToLocalTime():HH:mm}" : "";
            ra.Add(new ViecCon("cho_duyet", g.Ten, BangChungGan(v?.BangChung) + nop, v?.SoSao ?? g.Diem ?? 0, IconViec(v?.Hinh, v?.BangChung, g.Ten), null, v));
        }
        foreach (var v in tq.NhiemVu.Where(v => v.TrangThai is "san_sang" or "dang_lam" && v.BangChung != "tu_dong"))
            ra.Add(new ViecCon("chua_lam", v.Ten, PhuChuaLam(v), v.SoSao, IconViec(v.Hinh, v.BangChung, v.Ten), NutNop(v.BangChung), v));
        foreach (var t in (tuCham ?? Array.Empty<HvNvDong>()).Where(t => t.TuCham && t.TrangThaiCon is "san_sang" or "dang_lam"))
            ra.Add(new ViecCon("tu_cham", t.Ten, "Tự chấm trong app", t.SoSao, "may_tinh", "Mở Học với AiiRob", null));
        return ra;
    }

    /// <summary>Thẻ Hôm nay: «2 chờ Ba Mẹ duyệt · 3 chưa làm» (+ «1 làm lại»); hết việc ⇒ câu khen.</summary>
    public static string TomTatViec(IReadOnlyList<ViecCon> ds)
    {
        int cho = ds.Count(x => x.Nhom == "cho_duyet"), chua = ds.Count(x => x.Nhom is "chua_lam" or "tu_cham"), lai = ds.Count(x => x.Nhom == "lam_lai");
        if (cho + chua + lai == 0) return "Hôm nay con làm hết rồi!";
        var p = new List<string>();
        if (lai > 0) p.Add($"{lai} làm lại");
        if (cho > 0) p.Add($"{cho} chờ Ba Mẹ duyệt");
        if (chua > 0) p.Add($"{chua} chưa làm");
        return string.Join(" · ", p);
    }

    /// <summary>«Đang có 30 sao · chờ thêm 20 sao».</summary>
    public static string ChanNhiemVu(int sao, int choDuyet) => choDuyet > 0 ? $"Đang có {sao} sao · chờ thêm {choDuyet} sao" : $"Đang có {sao} sao";

    // ------------------------------------------------------------------ quà

    /// <summary>«hôm qua», «hôm nay 19:35», «26/10».</summary>
    public static string LucNgan(DateTimeOffset luc, DateTimeOffset now)
    {
        var a = luc.ToLocalTime().Date; var b = now.ToLocalTime().Date;
        if (a == b) return "hôm nay " + luc.ToLocalTime().ToString("HH:mm");
        if (a == b.AddDays(-1)) return "hôm qua";
        return luc.ToLocalTime().ToString("dd/MM");
    }

    /// <summary>Trạng thái một quà trên «Sao & quà»: chờ trao / đủ sao / còn thiếu.</summary>
    public static (string Chu, bool Du, bool ChoTrao) TrangThaiQua(HvQua q, int sao, DateTimeOffset now)
    {
        if (q.ChoTraoTu is { } t) return ($"Đã đổi {LucNgan(t, now)} · chờ Ba Mẹ trao", false, true);
        var thieu = q.SoSao - sao;
        return thieu <= 0 ? ("Đủ sao rồi!", true, false) : ($"Còn thiếu {thieu} sao", false, false);
    }

    public static string IconQua(HvQua q) => q.Phut is > 0 || q.Loai == "phut" ? "dongho" : q.Ten.ToLowerInvariant() switch
    {
        var t when t.Contains("kem") => "coc",
        var t when t.Contains("phim") => "the_qua",
        _ => "qua",
    };

    // ------------------------------------------------------------------ tin nhắn

    /// <summary>Câu trả lời nhanh cho tin của Ba Mẹ (máy chủ cắt ≤ 60 ký tự).</summary>
    public static readonly string[] TraLoiNhanh = { "Dạ con nhớ rồi", "Con cảm ơn ạ", "Con yêu cả nhà" };
    public const int TraLoiToiDa = 60;

    /// <summary>Tin của Ba Mẹ chưa được Con trả lời gần nhất (Con «tự nhắn» = trả lời tin này).</summary>
    public static HvLoiKhen? TinChoTraLoi(IEnumerable<HvLoiKhen> ds) => ds.Where(l => string.IsNullOrWhiteSpace(l.PhanHoi)).OrderByDescending(l => l.Luc ?? DateTimeOffset.MinValue).FirstOrDefault();

    public static string CatTraLoi(string s)
    {
        var t = (s ?? "").Trim();
        if (t.Length <= TraLoiToiDa) return t;
        var n = char.IsHighSurrogate(t[TraLoiToiDa - 1]) ? TraLoiToiDa - 1 : TraLoiToiDa;
        return t[..n];
    }

    // ------------------------------------------------------------------ kết quả Ba Mẹ trả lời (tin)

    private static readonly Regex TenTrongNgoac = new("«([^»]+)»", RegexOptions.Compiled);
    private static readonly Regex SoSaoRe = new(@"\+(\d+)\s*sao", RegexOptions.Compiled);
    private static readonly Regex SoPhutRe = new(@"\+(\d+)\s*phút", RegexOptions.Compiled);

    /// <summary>Đọc một tin thành kết quả cần bật màn (null = tin không cần màn kết quả).</summary>
    public static KetQuaTin? DocTin(HvTin t)
    {
        var noi = t.Noi ?? "";
        string? ten = TenTrongNgoac.Match(noi) is { Success: true } m ? m.Groups[1].Value : null;
        int? sao = SoSaoRe.Match(noi) is { Success: true } s && int.TryParse(s.Groups[1].Value, out var ns) ? ns : null;
        int? phut = SoPhutRe.Match(noi) is { Success: true } p && int.TryParse(p.Groups[1].Value, out var np) ? np : null;
        switch (t.Loai)
        {
            case "duyet_nhiem_vu":   // tu_duyet_nhiem_vu: khay đã báo «Xong rồi! +N sao» lúc nộp — không bật lại «Ba Mẹ duyệt rồi!»
                return ten == null ? null : new KetQuaTin("duyet", ten, sao, null, null);
            case "lam_lai_nhiem_vu":
            case "can_bo_sung":
            {
                if (ten == null) return null;
                var i = noi.IndexOf('»');
                var loi = i >= 0 && i + 1 < noi.Length ? noi[(i + 1)..].Trim().TrimStart('·').Trim() : null;
                return new KetQuaTin("lam_lai", ten, null, null, string.IsNullOrWhiteSpace(loi) ? null : loi);
            }
            case "xac_nhan_qua":
            {
                var tenQua = noi.Split('·')[0].Trim();
                return tenQua.Length == 0 ? null : new KetQuaTin("trao_qua", tenQua, null, phut, null);
            }
            case "them_gio":
                return phut is > 0 ? new KetQuaTin("them_gio", "", null, phut, null) : null;
            default:
                return null;
        }
    }

    /// <summary>Trong một lượt tin mới: kết quả MỚI NHẤT cần bật màn (một màn một lượt).</summary>
    public static KetQuaTin? ChonKetQua(IEnumerable<HvTin> moi)
        => moi.OrderByDescending(t => t.Luc ?? DateTimeOffset.MinValue).Select(DocTin).FirstOrDefault(k => k != null);

    // ------------------------------------------------------------------ hộp Thêm giờ chơi

    /// <summary>Tab «Dùng sao»: chip phút nhanh.</summary>
    public static readonly int[] PhutDungSao = { 15, 30, 60 };
    /// <summary>Tab «Xin Ba Mẹ»: chip phút (thiết kế con-xin 02: 10 / 20 / 30).</summary>
    public static readonly int[] PhutXin = { 10, 20, 30 };
    public const int BuocDoi = 5;

    /// <summary>«Còn 20 sao · giờ chơi thành 28 phút».</summary>
    public static string SauKhiDoi(int sao, int phut, double conPhut, HvTyLe? t)
        => $"Còn {Math.Max(0, sao - SaoChoPhut(phut, t))} sao · giờ chơi thành {Phut(conPhut + phut)}";
}
