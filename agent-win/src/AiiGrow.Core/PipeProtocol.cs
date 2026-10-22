using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace AiiGrow.Core;

public static class PipeNames
{
    public const string Tray = "AiiGrow.Tray";
}

public static class PipeCmd
{
    public const string State = "state";
    public const string Foreground = "fg";
    public const string Request = "request";
    public const string Status = "status";
    /// <summary>«Dùng điểm để chơi»: dịch vụ gọi phien/xet → phien/mo rồi trả kết quả cho màn chặn.</summary>
    public const string Play = "play";
    /// <summary>Con gõ mã mở offline Ba Mẹ đọc (<see cref="PipeRequest.Code"/>); dịch vụ tự kiểm, không cần máy chủ.</summary>
    public const string MaOffline = "ma-offline";
    /// <summary>Khay học viên (nhiệm vụ / phần quà / thông báo): dịch vụ chuyển <see cref="PipeRequest.Method"/> + <see cref="PipeRequest.Path"/>
    /// tới <c>api/device/hoc-vien/…</c> (chỉ đường trong <see cref="HocVienPaths"/>) bằng token máy, trả JSON nguyên văn ở <see cref="PipeResponse.Data"/>.</summary>
    public const string HocVien = "hoc-vien";
}

/// <summary>Trạng thái dịch vụ gửi cho tray. KHÔNG chứa số điểm; chỉ cờ có nút Đổi điểm hay không.</summary>
public sealed class TrayState
{
    public bool Paired { get; set; }
    public string ChildName { get; set; } = "";
    public string Mode { get; set; } = Modes.TuDo;
    public bool Locked { get; set; }
    public string? LockReason { get; set; }
    public double? MinutesLeft { get; set; }
    public DateTimeOffset? GrantEndsAt { get; set; }
    public bool CanExchangePoints { get; set; }
    public bool Offline { get; set; }
    public int BlockedSeq { get; set; }
    public string? BlockedAppId { get; set; }
    public string? BlockedAppName { get; set; }
    public int? LockGraceLeftSec { get; set; }
    /// <summary>Đang mở tạm bằng mã offline của Ba Mẹ tới lúc này (null = không).</summary>
    public DateTimeOffset? MoOfflineDen { get; set; }
    /// <summary>Chế độ đang áp («giam-sat» = không khoá, không chặn — chỉ ghi lại).</summary>
    public string CheDo { get; set; } = CheDoAgent.GiamSat;
    /// <summary>Máy đã bị bỏ khỏi gia đình (token bị từ chối lâu) ⇒ AiiGrow thôi chặn; khay hiện câu hướng dẫn gỡ.</summary>
    public bool MoCoi { get; set; }
}

public sealed class PipeRequest
{
    public string Cmd { get; set; } = PipeCmd.State;
    public string? AppId { get; set; }
    public string? AppName { get; set; }
    public string? Kind { get; set; }
    public int Minutes { get; set; }
    public string? Note { get; set; }
    public string? Id { get; set; }
    /// <summary>Mã mở offline 6 số (lệnh <see cref="PipeCmd.MaOffline"/>).</summary>
    public string? Code { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.HocVien"/>: GET | POST.</summary>
    public string? Method { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.HocVien"/>: đường bắt đầu bằng <c>hoc-vien/</c> (kèm query nếu có).</summary>
    public string? Path { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.HocVien"/>: thân JSON (chuỗi) cho POST.</summary>
    public string? Body { get; set; }
}

public sealed class PipeResponse
{
    public bool Ok { get; set; }
    public string? Error { get; set; }
    public TrayState? State { get; set; }
    public string? Id { get; set; }
    public string? Status { get; set; }
    public DateTimeOffset? GrantEndsAt { get; set; }
    /// <summary>Câu nhắc do máy chủ trả (ví dụ kết quả «Dùng điểm để chơi»). Không chứa số điểm.</summary>
    public string? Message { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.HocVien"/>: thân JSON máy chủ trả (nguyên văn).</summary>
    public string? Data { get; set; }
}

/// <summary>Client named pipe cho tray: mỗi lệnh một kết nối, một dòng JSON hỏi, một dòng JSON đáp.</summary>
public static class PipeClient
{
    public static async Task<PipeResponse> CallAsync(PipeRequest req, CancellationToken ct = default)
    {
        try
        {
            using var pipe = new NamedPipeClientStream(".", PipeNames.Tray, PipeDirection.InOut, PipeOptions.Asynchronous);
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(25));
            await pipe.ConnectAsync(3000, cts.Token);
            var enc = new UTF8Encoding(false);
            using var w = new StreamWriter(pipe, enc, 4096, leaveOpen: true) { AutoFlush = true };
            using var r = new StreamReader(pipe, enc, false, 4096, leaveOpen: true);
            await w.WriteLineAsync(JsonSerializer.Serialize(req, Json.Options));
            var line = await r.ReadLineAsync(cts.Token);
            if (string.IsNullOrEmpty(line)) return new PipeResponse { Ok = false, Error = "Dịch vụ không trả lời" };
            return JsonSerializer.Deserialize<PipeResponse>(line, Json.Options)
                   ?? new PipeResponse { Ok = false, Error = "Dịch vụ trả dữ liệu rỗng" };
        }
        catch (Exception e)
        {
            return new PipeResponse { Ok = false, Error = "Chưa nối được dịch vụ AiiGrow: " + e.Message };
        }
    }
}
