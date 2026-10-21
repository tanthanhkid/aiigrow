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
    // AiiGrow (thêm): phiên chơi bằng điểm, xin phép Ba Mẹ, khung Kid
    public const string Xet = "xet";
    public const string Mo = "mo";
    public const string Dung = "dung";
    public const string XinPhep = "xin";
    public const string Kid = "kid";
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

    // ---- AiiGrow (thêm). Khác AiiControl: Con được thấy số điểm của mình (bảng quy tắc công khai, BRD FR-06.05). ----
    public int SoDu { get; set; }
    public bool GioMaySai { get; set; }
    /// <summary>Lý do Fun list đang khoá: ba_me_khoa | gio_may_sai | gio_ngu | ngoai_khung (null = được chơi).</summary>
    public string? FunKhoa { get; set; }
    /// <summary>App vừa bị chặn có thuộc Fun list không (⇒ màn chặn có nút «Dùng điểm để chơi»).</summary>
    public bool BlockedIsFun { get; set; }
    public string? PlayApp { get; set; }
    public double? PlaySecLeft { get; set; }
    public int WarnSeq { get; set; }
    public int WarnMinutes { get; set; }
    public int EndedSeq { get; set; }
    public string? EndedReason { get; set; }
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
}

public sealed class PipeResponse
{
    public bool Ok { get; set; }
    public string? Error { get; set; }
    public TrayState? State { get; set; }
    public string? Id { get; set; }
    public string? Status { get; set; }
    public DateTimeOffset? GrantEndsAt { get; set; }
    // AiiGrow (thêm)
    public XetPhien? Xet { get; set; }
    public string? Url { get; set; }
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
