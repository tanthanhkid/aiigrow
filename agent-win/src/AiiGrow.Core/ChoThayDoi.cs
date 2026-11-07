using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>Kết quả `GET api/device/cho-thay-doi?ver=N` (server/lib/cho-thay-doi.ts): máy chủ giữ yêu cầu ≤ ~25 giây, trả ngay khi Ba Mẹ đổi gì.</summary>
public sealed record KetQuaCho(long PhienBan, bool Doi, bool QuaTai);

/// <summary>Logic thuần của vòng «chờ thay đổi» (P1 07/11) — tách khỏi mạng để test: đọc phản hồi + tính thời gian chờ lại.</summary>
public static class ChoThayDoi
{
    /// <summary>Đọc `{phienBanThayDoi, doi, quaTai?}`; thiếu / hỏng ⇒ null (máy chủ cũ không có đường này ⇒ 404 xử lý ở nơi gọi).</summary>
    public static KetQuaCho? Doc(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            var r = doc.RootElement;
            if (r.ValueKind != JsonValueKind.Object || !r.TryGetProperty("phienBanThayDoi", out var v) || v.ValueKind != JsonValueKind.Number || !v.TryGetInt64(out var n)) return null;
            bool B(string k) => r.TryGetProperty(k, out var x) && x.ValueKind == JsonValueKind.True;
            return new KetQuaCho(n, B("doi"), B("quaTai"));
        }
        catch (JsonException) { return null; }
    }

    /// <summary>Thời gian chờ trước lần hỏi kế: lỗi ⇒ lùi dần 2, 4, 8, 16, 30 giây (trần 30); máy chủ quá tải / trả về nhanh mà không đổi gì ⇒ 5 giây
    /// (khỏi vòng lặp dồn dập); còn lại (đã giữ đủ lâu, hoặc vừa có thay đổi) ⇒ hỏi lại ngay.</summary>
    public static TimeSpan ChoLai(int loiLienTiep, KetQuaCho? kq, TimeSpan daCho)
    {
        if (loiLienTiep > 0) return TimeSpan.FromSeconds(Math.Min(30, 1 << Math.Min(loiLienTiep, 5)));
        if (kq is { QuaTai: true }) return TimeSpan.FromSeconds(5);
        if (kq is { Doi: false } && daCho < TimeSpan.FromSeconds(2)) return TimeSpan.FromSeconds(5);
        return TimeSpan.Zero;
    }
}
