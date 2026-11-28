using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AiiGrow.Core;

// App của Con trên Windows theo thiết kế đã chốt (con-ngay-thuong, con-xin — bản 15/11): Hôm nay · Nhiệm vụ · Sao & quà · Tin nhắn,
// nộp bài (ảnh / ghi âm / viết / bấm Xong) và các màn kết quả. Con 9 tuổi: ít chữ, chỉ «sao» (1 sao = 1 phút chơi — SoSao.cs), «Ba Mẹ».
// Lớp THUẦN (không WinForms) để test. Máy chủ quyết mọi luật (server/lib/so-sao.ts, nhiem-vu.ts, phan-thuong.ts).

/// <summary>15/11: GET hoc-vien/sao — sổ sao của bé đang dùng máy (docs/API.md «Sổ sao 15/11»).</summary>
public sealed class HvSao
{
    public int Sao { get; set; }
    public int No { get; set; }
    public double PhutCon { get; set; }
    public bool HetSao { get; set; }
    public List<int> MucVay { get; set; } = new();
    public int VayMacDinh { get; set; } = XinVayView.MacDinh;
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

/// <summary>Một dòng việc trên màn Nhiệm vụ / thẻ Hôm nay.</summary>
/// <param name="Nhom">cho_duyet | chua_lam | lam_lai | tu_cham.</param>
/// <param name="Nut">Chữ nút (null = không nút, chỉ nhãn «Chờ duyệt»).</param>
public sealed record ViecCon(string Nhom, string Ten, string Phu, int Sao, string Icon, string? Nut, HvNhiemVu? NhiemVu, string? LoiNhan = null);

/// <summary>Kết quả Ba Mẹ trả lời, đọc từ tin (hoc-vien/tin) để bật màn kết quả: duyệt · nhờ làm lại · trao quà · đã thêm / chưa thêm app, web.</summary>
/// <param name="Loai">duyet | lam_lai | trao_qua | da_them | chua_them | cho_vay | chua_vay.</param>
/// <param name="Nhom">da_them: tinh_phut | khong_tinh_phut.</param>
/// <param name="Nguoi">Người trả lời («Mẹ Lan»), đọc từ tiêu đề tin.</param>
public sealed record KetQuaTin(string Loai, string Ten, int? Sao, int? Phut, string? LoiNhan, string? Nhom = null, string? Nguoi = null);

public static class AppConView
{
    /// <summary>«Mở Học với AiiRob» — trang học của AiiRob (chưa có trang riêng đang chạy: aiilab.vn/aiirob trả 404, aiirob.aiilab.vn bị tắt ⇒ về trang chủ AiiLab, curl 200).</summary>
    public const string AiiRobUrl = "https://aiilab.vn";

    private static readonly string[] Thu = { "Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy" };

    public static string Chao(string? ten) => string.IsNullOrWhiteSpace(ten) ? "Xin chào!" : $"Chào {ten.Trim()}!";

    /// <summary>«Thứ Ba · 19:30».</summary>
    public static string NgayGio(DateTime now) => $"{Thu[(int)now.DayOfWeek]} · {now:HH:mm}";

    public static string Sao(int sao) => SaoView.SoDu(sao);

    // ------------------------------------------------------------------ nhiệm vụ

    private static readonly Dictionary<string, string> TenBo = new()
    {
        ["tu_lap"] = "Tự lập", ["viec_nha"] = "Phụ việc nhà", ["hoc_tap"] = "Học tập", ["khoe_manh"] = "Khoẻ mạnh",
    };

    /// <summary>«Bộ Tự lập · 5 việc» (bộ nhiều việc nhất); không có bộ ⇒ «5 việc hôm nay».</summary>
    public static string BoViec(IEnumerable<string?> bo, int soViec)
    {
        var chinh = bo.Where(b => !string.IsNullOrWhiteSpace(b)).GroupBy(b => b!).OrderByDescending(g => g.Count()).FirstOrDefault()?.Key;
        var ten = chinh == null ? null : TenBo.TryGetValue(chinh, out var t) ? t : chinh.StartsWith("khac:") ? chinh[5..] : chinh;   // «khac:<tên>» = mục Ba Mẹ tự đặt (#302)
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

    // ------------------------------------------------------------------ 06/11 (L14) quà bảng giá

    /// <summary>Nhãn nhỏ cạnh tên quà (con-ngay-thuong 23): voucher «Mã QR», «Chỉ cuối tuần», tồn kho ít «Còn 1 bộ». Không có ⇒ null.</summary>
    public static string? NhanQua(HvQua q) =>
        q.Loai == "voucher" || q.MenhGia is > 0 ? "Mã QR"
        : q.ChiCuoiTuan ? "Chỉ cuối tuần"
        : q.TonKho is int t && t > 0 && t <= 3 ? $"Còn {t} bộ"
        : null;

    /// <summary>Dòng phụ quà trong «Quà con đổi được»: «Đủ sao rồi!» / «Còn thiếu 20 sao» (không lẫn trạng thái chờ trao — mục riêng ở trên).</summary>
    public static (string Chu, bool Du) TrangThaiDoi(HvQua q, int sao)
    {
        var thieu = q.SoSao - sao;
        return thieu <= 0 ? ("Đủ sao rồi!", true) : ($"Còn thiếu {thieu} sao", false);
    }

    /// <summary>Dòng phụ quà đang chờ trao: «Đang giữ 50 sao · chờ Ba Mẹ trao».</summary>
    /// <summary>#757: máy chủ trừ sao NGAY khi Con đổi (web cũng hiện đã trừ) ⇒ không ghi «trao mới trừ»; Ba Mẹ từ chối thì hoàn.</summary>
    public static string DangGiu(int sao, bool ngan = false) => ngan ? $"Đã trừ {sao} sao · Ba Mẹ từ chối thì hoàn" : $"Đã trừ {sao} sao · chờ Ba Mẹ trao";

    /// <summary>#757: luật đổi quà một câu (mục «Đổi quà», hộp xác nhận).</summary>
    public const string LuatDoiQua = "Đổi là trừ sao ngay · Ba Mẹ từ chối thì hoàn sao cho con";

    /// <summary>#759: «Ba Mẹ duyệt rồi!» — «0 → 51 sao»: số dư Con thấy kẹp ≥ 0 (như web); trước = sau − sao cộng, không âm (sao âm do chơi lố phút / nợ không hiện).</summary>
    public static string TruocSau(int sau, int them) => $"{Math.Max(0, sau - them)} → {sau} sao";

    /// <summary>Hộp đổi quà: <paramref name="dungDuoc"/> = sao TIÊU ĐƯỢC (gồm sao Ba Mẹ cho vay chưa tiêu — không phải số dư «sao», âm khi nợ).
    /// «Con dùng được 30 sao · còn thiếu 20 sao» (chưa đủ) hoặc null (đủ — hiện «30 sao → còn 0 sao»).</summary>
    public static string? ThieuSao(HvQua q, int dungDuoc) => dungDuoc >= q.SoSao ? null : $"{DungDuoc(dungDuoc)} · còn thiếu {q.SoSao - Math.Max(0, dungDuoc)} sao";

    /// <summary>#315: «Con dùng được 30 sao» — sao tiêu được để đổi quà / chơi, gồm sao vay chưa tiêu.</summary>
    public static string DungDuoc(int dungDuoc) => $"Con dùng được {Math.Max(0, dungDuoc)} sao";

    /// <summary>#315: sao TIÊU ĐƯỢC của tong-quan — `soDu` (≥ 0, gồm sao vay chưa tiêu; máy chủ đổi quà kiểm theo đúng số này).
    /// KHÔNG dùng `sao` (= tiêu được − nợ): Ba Mẹ cho vay N sao thì `sao` đứng yên ⇒ trước đây hộp đổi quà báo «còn thiếu» mãi.</summary>
    public static int SaoDungDuoc(HvTongQuan tq) => Math.Max(0, tq.SoDu);

    public static string IconQua(HvQua q) => q.Phut is > 0 || q.Loai == "phut" ? "dongho" : q.Ten.ToLowerInvariant() switch
    {
        var t when t.Contains("kem") => "coc",
        var t when t.Contains("aiicafe") || t.Contains("voucher") => "the_qua",
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
    private static readonly Regex ChoVayRe = new(@"^(.+?) cho vay (\d+) sao$", RegexOptions.Compiled);
    private static readonly Regex ChuaVayRe = new(@"^(.+?) chưa cho vay sao$", RegexOptions.Compiled);
    private static readonly Regex DaThemRe = new(@"^(.+?) đã thêm (.+)$", RegexOptions.Compiled);
    private static readonly Regex ChuaThemRe = new(@"^(.+?) chưa thêm (.+?)(?: lúc này)?$", RegexOptions.Compiled);

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
            // 15/11 (#258): «Mẹ Lan đã thêm Roblox» / «Nhóm «Tính phút» · 1 sao = 1 phút · «lời nhắn»» · «Mẹ Lan chưa thêm Roblox lúc này»
            case "dong_y_yeu_cau":
            {
                var m2 = DaThemRe.Match(t.Tieu ?? "");
                if (!m2.Success) return null;
                var khong = noi.Contains("Không tính phút");
                var loi = TenTrongNgoac.Matches(noi).Select(x => x.Groups[1].Value).FirstOrDefault(x => x is not ("Tính phút" or "Không tính phút"));
                return new KetQuaTin("da_them", m2.Groups[2].Value.Trim(), null, null, loi, khong ? "khong_tinh_phut" : "tinh_phut", m2.Groups[1].Value.Trim());
            }
            // 15/11 (PR #277): kết quả lời xin vay — «Mẹ Lan cho vay 15 sao» / «Mẹ Lan chưa cho vay sao» · «lý do»
            case "cho_vay":
            {
                var m4 = ChoVayRe.Match(t.Tieu ?? "");
                return m4.Success && int.TryParse(m4.Groups[2].Value, out var nv) ? new KetQuaTin("cho_vay", "", nv, null, null, null, m4.Groups[1].Value.Trim()) : null;
            }
            case "tu_choi_yeu_cau":
            {
                var m5 = ChuaVayRe.Match(t.Tieu ?? "");
                if (!m5.Success) return null;
                var loi = TenTrongNgoac.Match(noi) is { Success: true } lm ? lm.Groups[1].Value : null;
                return new KetQuaTin("chua_vay", "", null, null, loi, null, m5.Groups[1].Value.Trim());
            }
            case "bo_qua_yeu_cau":
            {
                var m3 = ChuaThemRe.Match(t.Tieu ?? "");
                return m3.Success ? new KetQuaTin("chua_them", m3.Groups[2].Value.Trim(), null, null, null, null, m3.Groups[1].Value.Trim()) : null;
            }
            default:
                return null;
        }
    }

    /// <summary>Trong một lượt tin mới: kết quả MỚI NHẤT cần bật màn (một màn một lượt).</summary>
    public static KetQuaTin? ChonKetQua(IEnumerable<HvTin> moi)
        => moi.OrderByDescending(t => t.Luc ?? DateTimeOffset.MinValue).Select(DocTin).FirstOrDefault(k => k != null);
}
