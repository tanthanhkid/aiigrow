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

/// <summary>#686: đếm lần hỏi trạng thái lời xin lỗi LIÊN TIẾP (id không còn, dịch vụ cũ, 404…) — quá <see cref="ToiDa"/> thì thôi hỏi
/// (trước đây hỏi mãi, hộp «Đang chờ» đứng mãi và nút gửi bị khoá). Hỏi được một lần là đếm lại từ đầu.</summary>
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

    public void DatLai() => Lan = 0;
}

public static class TheoDoiXinView
{
    /// <summary>Hộp «Xin thêm app / web» thôi chờ (không hỏi được trạng thái) — câu báo Con; nút gửi mở lại.</summary>
    public const string ThoiCho = "Chưa xem được Ba Mẹ đã trả lời chưa. Ba Mẹ trả lời thì AiiGrow sẽ báo con.";
}
