using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// CẬP NHẬT ĐÈ + TỰ CẬP NHẬT (Thanh 22/10: «máy đã cài sẵn rồi thì tải lại phải tự động cập nhật đè vô … đừng bắt kết nối lại»;
// «từ phiên bản này trở đi, nó sẽ tự động download phiên bản mới»). Lớp thuần ở đây để test; thao tác thật trên Windows nằm ở
// AiiGrow.Setup (chép tệp, dịch vụ) và AiiGrow.Service (UpdateWorker tải bản mới).

public enum CheDoBoCai { CaiMoi, CapNhat, DaMoiNhat }

public sealed record PhatHienCai(CheDoBoCai CheDo, Version? BanDangCai, Version BanMoi);

public static class CapNhat
{
    /// <summary>Máy «đã cài» = dịch vụ AiiGrow tồn tại + cấu hình có Token và Server (đã ghép). Thiếu một trong hai ⇒ cài mới (ghép lại).</summary>
    public static bool DaCai(bool coDichVu, AgentConfig? cfg) =>
        coDichVu && cfg != null && !string.IsNullOrWhiteSpace(cfg.Token) && !string.IsNullOrWhiteSpace(cfg.Server);

    /// <summary>«0.2.0», «0.2.0.0», «v0.2», «0.2.0+abc» ⇒ Version ba phần (0.2.0). Không đọc được ⇒ null.</summary>
    public static Version? DocBan(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var t = s.Trim().TrimStart('v', 'V');
        var cat = t.IndexOfAny(new[] { '+', '-', ' ' });
        if (cat >= 0) t = t[..cat];
        if (!Version.TryParse(t.Contains('.') ? t : t + ".0", out var v)) return null;
        return new Version(v.Major, Math.Max(v.Minor, 0), Math.Max(v.Build, 0));
    }

    public static PhatHienCai PhatHien(bool coDichVu, AgentConfig? cfg, string? banDangCai, string banMoi)
    {
        var moi = DocBan(banMoi) ?? new Version(0, 0, 0);
        var cu = DocBan(banDangCai);
        if (!DaCai(coDichVu, cfg)) return new(CheDoBoCai.CaiMoi, cu, moi);
        // Bản rất cũ không ghi được số bản ⇒ coi là cũ hơn ⇒ cập nhật (không bắt ghép lại).
        return cu == null || cu < moi ? new(CheDoBoCai.CapNhat, cu, moi) : new(CheDoBoCai.DaMoiNhat, cu, moi);
    }

    public static string Hien(Version? v) => v == null ? "cũ" : v.ToString(3);
}

/// <summary>Thao tác thật khi cập nhật (Windows). Tách interface để test luồng sao lưu / khôi phục.</summary>
public interface ICapNhatOps
{
    void DungDichVuVaKhay();
    /// <summary>Chép Service/Tray/Setup bản mới vào <paramref name="thuMucCai"/>.</summary>
    void ChepTepMoi(string thuMucCai);
    void ChayDichVuVaKhay();
    bool DichVuDangChay();
    void GhiPhienBan(string thuMucCai, string ban);
    /// <summary>Tắt «SCM tự khởi động lại dịch vụ khi lỗi» trong lúc chép/khôi phục (kẻo SCM bật exe giữa chừng, khoá tệp).</summary>
    void TatTuKhoiDong() { }
    /// <summary>Bật lại tự khởi động lại (restart/5000/restart/5000/restart/30000) — gọi ở MỌI đường ra.</summary>
    void BatTuKhoiDong() { }
}

public sealed record KetQuaCapNhat(bool Ok, bool DaKhoiPhuc, string Log);

/// <summary>
/// Cập nhật đè: dừng dịch vụ + khay → SAO LƯU thư mục cài → chép bản mới → chạy lại → kiểm dịch vụ chạy → ghi số bản (mục Ứng dụng).
/// KHÔNG đụng thư mục dữ liệu (config/token, tài khoản Con, luật AppLocker nằm ở ProgramData / chính sách Windows) ⇒ không ghép lại.
/// Lỗi giữa chừng ⇒ chép bản sao lưu trở lại + chạy lại dịch vụ cũ, để máy không mất bảo vệ.
/// </summary>
public static class CapNhatMay
{
    /// <summary>Bộ cài một tệp có exe nhúng ⇒ luôn dùng nhúng; tệp nằm cạnh bộ cài chỉ khi không nhúng (gói zip cũ).</summary>
    public static bool DungTepCanh(bool coNhung, bool coCanh) => !coNhung && coCanh;

    public static string ThuMucSaoLuu(string thuMucCai) => thuMucCai.TrimEnd('\\', '/') + ".sao-luu";

    /// <param name="chep">Chép một tệp (thử nghiệm thay được để giả tệp bị khoá); mặc định File.Copy đè.</param>
    public static KetQuaCapNhat Chay(string thuMucCai, string ban, ICapNhatOps ops, Action<string, string>? chep = null)
    {
        chep ??= (a, b) => File.Copy(a, b, true);
        try { ops.TatTuKhoiDong(); } catch { }
        try { return ChayTrong(thuMucCai, ban, ops, chep); }
        finally { try { ops.BatTuKhoiDong(); } catch { } }
    }

    private static KetQuaCapNhat ChayTrong(string thuMucCai, string ban, ICapNhatOps ops, Action<string, string> chep)
    {
        var log = new List<string>();
        var saoLuu = ThuMucSaoLuu(thuMucCai);
        try
        {
            if (Directory.Exists(saoLuu)) Directory.Delete(saoLuu, true);
            ops.DungDichVuVaKhay();
            ChepThuMuc(thuMucCai, saoLuu, chep);
            log.Add("Đã sao lưu bản đang cài.");
        }
        catch (Exception e)
        {
            // Chưa đụng tệp nào ⇒ chỉ cần chạy lại bản cũ.
            try { ops.ChayDichVuVaKhay(); } catch { }
            return new(false, false, "Chưa cập nhật được (không sao lưu được bản cũ): " + e.Message);
        }

        try
        {
            ops.ChepTepMoi(thuMucCai);
            ops.ChayDichVuVaKhay();
            if (!ops.DichVuDangChay()) throw new InvalidOperationException("dịch vụ bản mới không chạy");
            ops.GhiPhienBan(thuMucCai, ban);
            try { Directory.Delete(saoLuu, true); } catch { }
            log.Add("Đã cập nhật lên bản " + ban + ".");
            return new(true, false, string.Join(" ", log));
        }
        catch (Exception e)
        {
            log.Add("Cập nhật lỗi: " + e.Message + ".");
            try
            {
                try { ops.DungDichVuVaKhay(); } catch { }
                // khôi phục: bỏ qua tệp đích GIỐNG HỆT bản sao lưu (chưa bị đè — vd tệp đang bị phần mềm diệt virus giữ, chính là
                // tệp làm bước chép bản mới lỗi; CI e2e KB8 22/10) và chép tiếp các tệp khác thay vì dừng ở tệp lỗi đầu tiên
                ChepThuMuc(saoLuu, thuMucCai, chep, khoiPhuc: true);
                ops.ChayDichVuVaKhay();
                log.Add("Đã khôi phục bản cũ — máy vẫn được bảo vệ.");
                return new(false, true, string.Join(" ", log));
            }
            catch (Exception e2)
            {
                log.Add("KHÔNG khôi phục được bản cũ: " + e2.Message + ". Bản sao lưu ở " + saoLuu + ".");
                // vẫn cố chạy dịch vụ (bản nào đang nằm trong thư mục cài) — dịch vụ đứng là máy mất bảo vệ hẳn
                try { ops.ChayDichVuVaKhay(); } catch { }
                return new(false, false, string.Join(" ", log));
            }
        }
    }

    private static void ChepThuMuc(string tu, string toi, Action<string, string> chep, bool khoiPhuc = false)
    {
        Directory.CreateDirectory(toi);
        Exception? loiDau = null;
        foreach (var f in Directory.GetFiles(tu, "*", SearchOption.AllDirectories))
        {
            if (f.Contains(".cu-")) continue;               // tệp khay cũ đã đổi tên lần trước — không sao lưu/khôi phục
            var dich = Path.Combine(toi, Path.GetRelativePath(tu, f));
            Directory.CreateDirectory(Path.GetDirectoryName(dich)!);
            if (!khoiPhuc) { ChepDe(f, dich, chep); continue; }
            try { if (!GiongNhau(f, dich)) ChepDe(f, dich, chep); }
            catch (Exception e) { loiDau ??= e; }
        }
        if (loiDau != null) throw loiDau;
    }

    /// <summary>Cùng kích thước + cùng nội dung. Đọc chia sẻ ReadWrite|Delete: tệp đang chạy / bị giữ đọc vẫn so được.</summary>
    internal static bool GiongNhau(string a, string b)
    {
        if (!File.Exists(b)) return false;
        if (new FileInfo(a).Length != new FileInfo(b).Length) return false;
        try
        {
            using var fa = new FileStream(a, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            using var fb = new FileStream(b, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            return SHA256.HashData(fa).AsSpan().SequenceEqual(SHA256.HashData(fb));
        }
        catch (IOException) { return false; }
        catch (UnauthorizedAccessException) { return false; }
    }

    /// <summary>Đích đang bị khoá (khay đang chạy, exe SCM vừa bật) ⇒ Windows vẫn cho ĐỔI TÊN tệp đang chạy: đổi sang «.cu-…» rồi chép lại.</summary>
    public static void ChepDe(string tu, string dich, Action<string, string> chep)
    {
        try { chep(tu, dich); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            if (!File.Exists(dich)) throw;
            var cu = dich + ".cu-" + Guid.NewGuid().ToString("N")[..8];
            File.Move(dich, cu);
            try { chep(tu, dich); }
            catch
            {
                // chép lại vẫn lỗi (đầy đĩa…) ⇒ trả tên cũ, không để thư mục cài mất exe
                try { if (!File.Exists(dich)) File.Move(cu, dich); } catch { }
                throw;
            }
        }
    }

    /// <summary>Đối số sc.exe bật «tự chạy lại khi lỗi» cho dịch vụ — bộ cài bật lại sau cập nhật; dịch vụ tự bật lúc khởi động
    /// (bộ cài bị giết giữa chừng thì «finally» không chạy, cấu hình tắt còn nằm lại).</summary>
    public static readonly string[] DoiSoBatTuKhoiDong = { "reset=", "86400", "actions=", "restart/5000/restart/5000/restart/30000" };
}

/// <summary>GET /api/agent/ban-moi — bản bộ cài mới nhất máy chủ đang phát.</summary>
public sealed class BanMoi
{
    [JsonPropertyName("version")] public string Version { get; set; } = "";
    [JsonPropertyName("url")] public string Url { get; set; } = "";
    [JsonPropertyName("sha256")] public string Sha256 { get; set; } = "";
    /// <summary>0.2.12: chu kỳ hỏi bản mới (phút) do máy chủ đặt — <see cref="TuCapNhat.ChuKyKiem"/>.</summary>
    [JsonIgnore] public double? ChuKyKiemPhut { get; set; }
    /// <summary>Đọc dễ dãi (số, số thập phân, chuỗi số; giá trị lạ ⇒ bỏ qua): máy chủ ghi sai kiểu không được làm hỏng cả manifest —
    /// agent không đọc được manifest thì không bao giờ thấy bản sửa.</summary>
    [JsonPropertyName("chuKyKiemPhut")]
    public JsonElement? ChuKyKiemPhutTho
    {
        get => ChuKyKiemPhut is { } v ? JsonSerializer.SerializeToElement(v) : null;
        set => ChuKyKiemPhut = value is { } e ? e.ValueKind switch
        {
            JsonValueKind.Number when e.TryGetDouble(out var d) => d,
            JsonValueKind.String when double.TryParse(e.GetString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var d) => d,
            _ => null,
        } : null;
    }
}

public static class TuCapNhat
{
    public const string DuongManifest = "/api/agent/ban-moi";

    /// <summary>Chu kỳ mặc định khi máy chủ không gửi chuKyKiemPhut (hoặc không đọc được manifest).</summary>
    public static readonly TimeSpan ChuKyMacDinh = TimeSpan.FromHours(6);

    /// <summary>Chu kỳ hỏi bản mới: chuKyKiemPhut của máy chủ kẹp [5, 1440] phút; không có ⇒ 6 giờ.</summary>
    public static TimeSpan ChuKyKiem(double? phut) => phut is { } p && double.IsFinite(p) ? TimeSpan.FromMinutes(Math.Clamp(Math.Round(p), 5, 1440)) : ChuKyMacDinh;

    /// <summary>Lần kiểm kế tiếp theo GIỜ THẬT. Đồng hồ máy bị lùi (Con chỉnh giờ) ⇒ không để hẹn xa quá một chu kỳ tính từ bây giờ.</summary>
    public static DateTimeOffset KeTiep(DateTimeOffset hen, DateTimeOffset bayGio, TimeSpan chuKy) => hen > bayGio + chuKy ? bayGio + chuKy : hen;
    /// <summary>Bộ cài nằm trên Vercel Blob của AiiGrow (ngoài tên miền máy chủ).</summary>
    public const string DuoiBlob = ".public.blob.vercel-storage.com";

    /// <summary>
    /// Có nên tải bản này không. Chỉ nhận: bản MỚI HƠN bản đang chạy, URL https thuộc máy chủ AiiGrow (cùng host với <paramref name="server"/>)
    /// hoặc Vercel Blob, sha256 đủ 64 ký tự hex. → null nếu nên tải, còn lại là lý do bỏ qua.
    /// </summary>
    public static string? KiemManifest(BanMoi? m, string server, Version hienTai)
    {
        if (m == null) return "không có manifest";
        var moi = CapNhat.DocBan(m.Version);
        if (moi == null) return "số bản không hợp lệ";
        if (moi <= hienTai) return "đã là bản mới nhất";
        if (!Uri.TryCreate(m.Url, UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps) return "URL không phải https";
        var host = Uri.TryCreate(server, UriKind.Absolute, out var s) ? s.Host : "";
        var hopLe = (host.Length > 0 && u.Host.Equals(host, StringComparison.OrdinalIgnoreCase)) ||
                    u.Host.EndsWith(DuoiBlob, StringComparison.OrdinalIgnoreCase);
        if (!hopLe) return "URL không thuộc máy chủ AiiGrow";
        if (!LaSha256(m.Sha256)) return "sha256 không hợp lệ";
        return null;
    }

    public static bool LaSha256(string? s) => s is { Length: 64 } && s.All(Uri.IsHexDigit);

    /// <summary>Tệp tải về khớp sha256 của manifest (không phân biệt hoa/thường).</summary>
    public static bool KhopSha256(string tep, string sha256)
    {
        if (!LaSha256(sha256) || !File.Exists(tep)) return false;
        using var f = File.OpenRead(tep);
        var h = Convert.ToHexString(SHA256.HashData(f));
        return h.Equals(sha256, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Bản đang chạy của tiến trình (AssemblyVersion ba phần).</summary>
    public static Version BanHienTai() =>
        CapNhat.DocBan(typeof(TuCapNhat).Assembly.GetName().Version?.ToString(3)) ?? new Version(0, 0, 0);
}
