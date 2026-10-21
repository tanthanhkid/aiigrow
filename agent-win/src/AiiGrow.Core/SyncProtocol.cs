using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// Hợp đồng đồng bộ dịch vụ ↔ máy chủ cho PHẦN NÀY (heartbeat + lệnh gỡ từ xa). Không đụng phần Policy chi tiết (khung giờ, Fun list…)
// đang chờ — chỉ đọc các trường cần: nextCheckSec và lenh. Lệch hợp đồng ⇒ ghi PR.
//   POST /api/device/dong-bo  → { ..., nextCheckSec, lenh: [{ id, loai }] }   (loai "go" = gỡ máy khỏi gia đình)
//   POST /api/device/lenh/:id/xong                                            (agent báo đã thực thi xong)
//   POST /api/device/su-kien  { ds: [{ ma, loai, luc, chiTiet }] }           (hàng đợi offline, mã một lần)

public sealed class Lenh
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public string Loai { get; set; } = "";
}

public sealed class SyncResult
{
    public int NextCheckSec { get; set; } = 300;
    public List<Lenh> Lenh { get; set; } = new();
    /// <summary>JSON thô để phần Policy (đang chờ) đọc tiếp sau này.</summary>
    public string Raw { get; set; } = "";

    public Lenh? LenhGo => Lenh.FirstOrDefault(l => l.Loai == "go");

    public static SyncResult Parse(string raw)
    {
        var r = new SyncResult { Raw = raw };
        try
        {
            using var doc = JsonDocument.Parse(raw);
            var e = doc.RootElement;
            if (e.ValueKind != JsonValueKind.Object) return r;
            if (e.TryGetProperty("nextCheckSec", out var n) && n.TryGetInt32(out var v) && v > 0) r.NextCheckSec = Math.Clamp(v, 15, 900);
            if (e.TryGetProperty("lenh", out var l) && l.ValueKind == JsonValueKind.Array)
                foreach (var it in l.EnumerateArray())
                {
                    var cmd = it.Deserialize<Lenh>(Json.Options);
                    if (cmd != null && !string.IsNullOrEmpty(cmd.Id) && !string.IsNullOrEmpty(cmd.Loai)) r.Lenh.Add(cmd);
                }
        }
        catch (JsonException) { /* giữ mặc định; vòng sync sau thử lại */ }
        return r;
    }
}

/// <summary>Một sự kiện gửi lên /api/device/su-kien. `Ma` một lần ⇒ gửi lại không ghi trùng (server/lib/may-con.ts).</summary>
public sealed class SuKien
{
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    public string Loai { get; set; } = "";
    public DateTimeOffset Luc { get; set; } = DateTimeOffset.UtcNow;
    public Dictionary<string, string>? ChiTiet { get; set; }
}

/// <summary>Mục trong hàng đợi offline (JSON đã tuần tự hoá để không phụ thuộc kiểu khi lưu đĩa).</summary>
public sealed class QueuedEvent
{
    public string Ma { get; set; } = "";
    public string Json { get; set; } = "";
    public DateTimeOffset Tao { get; set; }
}

/// <summary>API dịch vụ cần cho heartbeat + gỡ từ xa (tách interface để test bằng bản giả).</summary>
public interface IHeartbeatApi
{
    Task<SyncResult> SyncAsync(object status, string clientTime, CancellationToken ct = default);
    Task AckLenhAsync(string id, CancellationToken ct = default);
    Task SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default);
}

/// <summary>Hàng đợi sự kiện khi mất mạng; có mạng lại thì gửi theo lô. Đầy thì bỏ mục cũ nhất.</summary>
public sealed class OfflineQueue
{
    public const int Max = 500;
    public List<QueuedEvent> Items { get; set; } = new();

    public void Add(SuKien e)
    {
        if (Items.Any(x => x.Ma == e.Ma)) return;
        Items.Add(new QueuedEvent { Ma = e.Ma, Json = JsonSerializer.Serialize(e, Json.Options), Tao = e.Luc });
        while (Items.Count > Max) Items.RemoveAt(0);
    }

    /// <summary>Gửi hết. Lỗi mạng ⇒ dừng, giữ phần còn lại cho lần sau. → số mục đã gửi.</summary>
    public async Task<int> FlushAsync(IHeartbeatApi api, CancellationToken ct = default)
    {
        int n = 0;
        while (Items.Count > 0 && !ct.IsCancellationRequested)
        {
            var batch = Items.Take(50).ToList();
            var ds = batch.Select(x => JsonSerializer.Deserialize<SuKien>(x.Json, Json.Options)!).ToList();
            try { await api.SuKienAsync(ds, ct); }
            catch (ApiException) { break; }
            Items.RemoveRange(0, batch.Count);
            n += batch.Count;
        }
        return n;
    }
}
