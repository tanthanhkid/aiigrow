using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// Phần riêng AiiGrow: hàng đợi gửi bù khi mất mạng (sự kiện + phút chơi offline). Mỗi mục có `ma` một lần ⇒ máy chủ không ghi trùng
// khi agent gửi lại (server/lib/may-con.ts nhanSuKien / buPhien). Lưu trong AgentConfig (DPAPI máy, thư mục chỉ SYSTEM/Admin).

/// <summary>POST /api/device/su-kien — loại theo danh sách máy chủ nhận (lech_gio, thu_go, dung_dich_vu, khay_tat, chan_app, chan_cai_dat…).</summary>
public sealed class SuKien
{
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    public string Loai { get; set; } = "";
    public DateTimeOffset Luc { get; set; }
    public Dictionary<string, string>? ChiTiet { get; set; }
}

/// <summary>POST /api/device/phien/bu — bù phút chơi khi mất mạng.</summary>
public sealed class BuBody
{
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    public string? Id { get; set; }
    public string Muc { get; set; } = "";
    public double Phut { get; set; }
    public DateTimeOffset? BatDau { get; set; }
    public bool KetThuc { get; set; }
}

public sealed class QueueItem
{
    public string Ma { get; set; } = "";
    /// <summary>"bu" | "su_kien".</summary>
    public string Kind { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTimeOffset Tao { get; set; }
}

public sealed class OfflineQueue
{
    public const int Max = 500;
    public List<QueueItem> Items { get; set; } = new();

    public void Add(SuKien e) => Push(new QueueItem { Ma = e.Ma, Kind = "su_kien", Body = JsonSerializer.Serialize(e, Json.Options), Tao = e.Luc });
    public void Add(BuBody b) => Push(new QueueItem { Ma = b.Ma, Kind = "bu", Body = JsonSerializer.Serialize(b, Json.Options), Tao = b.BatDau ?? DateTimeOffset.UtcNow });

    private void Push(QueueItem i)
    {
        if (Items.Any(x => x.Ma == i.Ma)) return;
        Items.Add(i);
        // đầy: bỏ sự kiện cũ nhất trước, giữ phút chơi (liên quan điểm)
        while (Items.Count > Max)
        {
            var old = Items.FirstOrDefault(x => x.Kind == "su_kien") ?? Items[0];
            Items.Remove(old);
        }
    }

    /// <summary>Gửi theo thứ tự. Lỗi mạng ⇒ dừng, giữ phần còn lại. Máy chủ từ chối mục (4xx) ⇒ bỏ mục đó (không kẹt mãi). → số mục đã gửi.</summary>
    public async Task<int> FlushAsync(IAgentApi api, CancellationToken ct = default)
    {
        int n = 0;
        while (Items.Count > 0)
        {
            var it = Items[0];
            try
            {
                if (it.Kind == "bu") await api.BuAsync(JsonSerializer.Deserialize<BuBody>(it.Body, Json.Options)!, ct);
                else await api.SuKienAsync(new[] { JsonSerializer.Deserialize<SuKien>(it.Body, Json.Options)! }, ct);
            }
            catch (ApiException e) when (e.IsNetwork || e.IsUnauthorized) { break; }
            catch (ApiException) { /* bị từ chối: bỏ */ }
            Items.RemoveAt(0);
            n++;
        }
        return n;
    }
}

public sealed class MoPhienResult
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public int PhutToiDa { get; set; }
    public int GiaPhanNghin { get; set; }
    public int SoDu { get; set; }
}

public sealed class BuResult
{
    public double Phut { get; set; }
    public int DiemTru { get; set; }
    public int SoDu { get; set; }
    public bool LapLai { get; set; }
}

public sealed class PhienWeb
{
    public string PhienCon { get; set; } = "";
    public DateTimeOffset? Het { get; set; }
}

public sealed class YeuCauResult
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    [JsonPropertyName("trang_thai")]
    public string TrangThai { get; set; } = "";
}

/// <summary>API thiết bị AiiGrow — interface để test lớp phiên/hàng đợi bằng bản giả.</summary>
public interface IAgentApi
{
    Task<(DevicePolicy Policy, string Raw)> SyncAsync(object status, string clientTime, IReadOnlyList<GrowUsage> usage, CancellationToken ct = default);
    Task<XetPhien> XetAsync(string muc, bool gioMaySai, CancellationToken ct = default);
    Task<MoPhienResult> MoAsync(string muc, bool gioMaySai, CancellationToken ct = default);
    Task<KetNhip> NhipAsync(string id, bool dangDung, CancellationToken ct = default);
    Task DungAsync(string id, CancellationToken ct = default);
    Task<BuResult> BuAsync(BuBody body, CancellationToken ct = default);
    Task<int> SuKienAsync(IReadOnlyList<SuKien> ds, CancellationToken ct = default);
    Task<YeuCauResult> YeuCauAsync(string loai, int? phut, string? giaTri, string lyDo, CancellationToken ct = default);
    Task<PhienWeb> PhienWebAsync(CancellationToken ct = default);
}

/// <summary>Phút dùng gửi kèm dong-bo: TỔNG của ngày theo mục (máy chủ ghi greatest ⇒ gửi lại không cộng đôi).</summary>
public sealed record GrowUsage(string Muc, int Phut, string Day);
