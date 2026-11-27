using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>#686: lời xin vay khay đang theo dõi (chờ Ba Mẹ trả lời) — lưu tệp của người dùng để khay khởi động lại (đăng xuất / bản mới) vẫn
/// hỏi tiếp và báo Con kết quả. <see cref="BeId"/> = bé đã xin (máy dùng chung: bé khác vào máy thì bỏ).</summary>
public sealed record VayDangCho(string Id, int SoSao, DateTimeOffset Luc, string? BeId)
{
    /// <summary>Lời xin vay hết hạn phía máy chủ sau chừng này — quá thì thôi theo dõi.</summary>
    public static readonly TimeSpan Han = TimeSpan.FromHours(24);

    public bool ConHan(DateTimeOffset now) => now - Luc <= Han && Luc <= now + TimeSpan.FromMinutes(5);

    public string Ghi() => JsonSerializer.Serialize(this, Json.Options);

    public static VayDangCho? Doc(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        try { return JsonSerializer.Deserialize<VayDangCho>(s, Json.Options) is { Id.Length: > 0 } v ? v : null; }
        catch (JsonException) { return null; }
    }
}

/// <summary>#727 (#686): lời xin app / web khay đang theo dõi — lưu tệp như <see cref="VayDangCho"/> để khay khởi động lại vẫn hỏi tiếp và báo Con kết quả.</summary>
public sealed record XinAppWebDangCho(string Id, string Ten, string Muc, DateTimeOffset Luc, string? BeId)
{
    public bool ConHan(DateTimeOffset now) => now - Luc <= VayDangCho.Han && Luc <= now + TimeSpan.FromMinutes(5);
}

/// <summary>#727: danh sách lời xin app / web đang chờ, lưu tệp (tối đa <see cref="ToiDa"/>; trùng id thay; quá hạn bỏ). THUẦN theo đường dẫn tệp để test.</summary>
public static class XinAppWebCho
{
    public const int ToiDa = 10;

    public static List<XinAppWebDangCho> Doc(string tep, DateTimeOffset now)
    {
        try
        {
            if (!File.Exists(tep)) return new();
            var ds = JsonSerializer.Deserialize<List<XinAppWebDangCho>>(File.ReadAllText(tep), Json.Options) ?? new();
            return ds.Where(x => !string.IsNullOrEmpty(x?.Id) && x.ConHan(now)).ToList();
        }
        catch (Exception e) when (e is JsonException or IOException or UnauthorizedAccessException) { return new(); }
    }

    private static void Ghi(string tep, List<XinAppWebDangCho> ds)
    {
        try
        {
            if (ds.Count == 0) { if (File.Exists(tep)) File.Delete(tep); return; }
            Directory.CreateDirectory(Path.GetDirectoryName(tep)!);
            File.WriteAllText(tep, JsonSerializer.Serialize(ds, Json.Options));
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
    }

    public static void Them(string tep, XinAppWebDangCho x, DateTimeOffset now)
    {
        var ds = Doc(tep, now);
        ds.RemoveAll(i => i.Id == x.Id);
        ds.Add(x);
        while (ds.Count > ToiDa) ds.RemoveAt(0);
        Ghi(tep, ds);
    }

    public static void Xoa(string tep, string id, DateTimeOffset now)
    {
        var ds = Doc(tep, now);
        if (ds.RemoveAll(i => i.Id == id) > 0 || File.Exists(tep)) Ghi(tep, ds);
    }
}

/// <summary>#686: đếm lần hỏi trạng thái lời xin lỗi LIÊN TIẾP kiểu «không còn» (id không còn, 404…) — quá <see cref="ToiDa"/> thì thôi hỏi
/// (trước đây hỏi mãi, hộp «Đang chờ» đứng mãi và nút gửi bị khoá). Hỏi được một lần là đếm lại từ đầu; mất mạng không tính (chờ có mạng hỏi tiếp).</summary>
public sealed class DemLoiHoi
{
    public int ToiDa { get; }
    public int Lan { get; private set; }
    public DemLoiHoi(int toiDa) { ToiDa = toiDa; }

    /// <returns>true ⇒ đã lỗi đủ <see cref="ToiDa"/> lần liên tiếp, nên thôi hỏi.</returns>
    public bool Ghi(bool ok)
    {
        Lan = ok ? 0 : Lan + 1;
        return Lan >= ToiDa;
    }

    /// <summary>Theo một lần hỏi Status: được ⇒ đếm lại; lỗi tạm (mất mạng, 5xx) ⇒ giữ nguyên số đếm; lỗi «không còn» ⇒ tính.</summary>
    public bool Ghi(PipeResponse r) => r.Ok ? Ghi(true) : r.KhongCon ? Ghi(false) : false;

    public void DatLai() => Lan = 0;
}

public static class TheoDoiXinView
{
    /// <summary>Hộp «Xin thêm app / web» thôi chờ (không hỏi được trạng thái) — câu báo Con; nút gửi mở lại.</summary>
    public const string ThoiCho = "Chưa xem được Ba Mẹ đã trả lời chưa. Ba Mẹ trả lời thì AiiGrow sẽ báo con.";
}
