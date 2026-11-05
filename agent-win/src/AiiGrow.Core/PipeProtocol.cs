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
    /// <summary>«Thử kết nối lại»: bảo dịch vụ đồng bộ với máy chủ ngay (không chờ nhịp sau). Trả trạng thái hiện tại.</summary>
    public const string SyncNow = "sync-now";
    /// <summary>0.2.6: Rob hỏi «đổi được bao nhiêu phút» — dịch vụ gọi phien/xet cho <see cref="PipeRequest.AppId"/> (hoặc mục Giải trí đầu tiên) và trả số phút ở
    /// <see cref="PipeResponse.PlayMinutes"/> (không trả số điểm).</summary>
    public const string PlayInfo = "play-info";
    /// <summary>Thiết kế 05/11: «Xin Ba Mẹ mở …» app / web lạ (<see cref="PipeRequest.AppId"/> = mục, <see cref="PipeRequest.AppName"/> = tên, Note = lời nhắn).
    /// Trả <see cref="PipeResponse.Status"/>: cho | duoc | tu_choi | web_cam (web luôn chặn) | cho_mang (mất mạng — đã lưu, có mạng tự gửi).</summary>
    public const string XinDuyet = "xin-duyet";
    /// <summary>«Kiểm tra cập nhật» từ khay: dịch vụ hỏi manifest máy chủ ⇒ <see cref="PipeResponse.Message"/> = bản mới (null = đã mới nhất),
    /// <see cref="PipeResponse.Status"/> = bản đang chạy.</summary>
    public const string KiemCapNhat = "kiem-cap-nhat";
    /// <summary>«Cập nhật để sửa lỗi»: dịch vụ chạy lượt tự cập nhật ngay (tải, kiểm sha256, chạy bộ cài --capnhat --im-lang).</summary>
    public const string CapNhatNgay = "cap-nhat-ngay";
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
    /// <summary>Lần đồng bộ thành công gần nhất với máy chủ (null = chưa lần nào từ lúc dịch vụ chạy).</summary>
    public DateTimeOffset? LastSyncAt { get; set; }
    /// <summary>Từ lúc nào dịch vụ không tới được máy chủ (null = đang tới được).</summary>
    public DateTimeOffset? OfflineSince { get; set; }
    /// <summary>Máy chủ từ chối token (401 token_sai): máy đã bị gỡ khỏi gia đình hoặc cần ghép lại.</summary>
    public bool TokenRejected { get; set; }
    /// <summary>0.2.6: tăng mỗi lần dịch vụ đổi / gỡ luật web trong hive của Con. Khay (chạy trong phiên Con) thấy đổi ⇒ gọi RefreshPolicyEx(user) để trình duyệt
    /// đọc lại ngay và nhắc «mở lại trình duyệt nếu luật mới chưa áp» (dịch vụ SYSTEM không làm mới được chính sách của người dùng khác).</summary>
    public int WebRev { get; set; }
    /// <summary>0.2.6: các app / trang Giải trí Ba Mẹ đã xếp (chữ thường) — Rob liệt kê cho nút «Chơi bằng điểm» (máy chủ: windows.playChoices).</summary>
    public List<string> PlayChoices { get; set; } = new();
    /// <summary>0.2.6 (BUG-007): khay đang chạy trong phiên của tài khoản Con? false ⇒ khay (phiên Ba Mẹ / tài khoản quản trị) tự thoát, không hiện biểu tượng / màn chặn.
    /// Mặc định true (dịch vụ cũ không gửi ⇒ như trước).</summary>
    public bool PhienCon { get; set; } = true;
    /// <summary>25/10: phút đã dùng HÔM NAY theo app (dịch vụ đếm — <see cref="UsageTracker.DungHomNay"/>), nhiều nhất trước. Thẻ «Đã dùng hôm nay» ở app to.</summary>
    public List<DungApp> DungTheoApp { get; set; } = new();
    /// <summary>05/11: app vừa bị đóng là app Ba Mẹ ĐẶT «Chặn» (blockedApps) — màn chặn chỉ hiện nút xin; false = app lạ ⇒ khay tự gửi lời xin duyệt.</summary>
    public bool BlockedBoiBaMe { get; set; }
    /// <summary>05/11: app học Ba Mẹ cho phép (Policy.LearningApps, chữ thường .exe) — màn chặn «Con đang dùng được N app», chọn app khi xin ngoại lệ.</summary>
    public List<string> AppDuocPhep { get; set; } = new();
    /// <summary>05/11 (L11): số lời xin Con gửi lúc mất mạng còn chờ có mạng để gửi.</summary>
    public int XinChoMang { get; set; }
    /// <summary>05/11 (L1): số sao của Con (dong-bo.windows.sao — S1). null = máy chủ chưa gửi ⇒ khay không ghi số.</summary>
    public int? Sao { get; set; }
    /// <summary>05/11 (L2): quỹ phút chơi hôm nay (dong-bo.windows.quyPhut — S1). null = chưa có.</summary>
    public int? QuyPhut { get; set; }
    /// <summary>05/11: giờ máy mở lại sau giờ ngủ «HH:mm» (dong-bo.windows.moLaiLuc — S1). null = chưa có.</summary>
    public string? MoLaiLuc { get; set; }
    /// <summary>05/11: phút chơi còn lại hôm nay, đã trừ phần đếm tại máy (QuyTaiCho) — «Giờ chơi còn lại 18 phút». null = máy chủ cũ.</summary>
    public double? QuyConPhut { get; set; }
    public double? QuyTongPhut { get; set; }
    /// <summary>Đã chơi hôm nay (máy chủ + phần đếm tại máy).</summary>
    public double? QuyDaDung { get; set; }
    public bool DangGioHoc { get; set; }
    /// <summary>Ngoại lệ cả máy đang mở tới lúc này (null = không).</summary>
    public DateTimeOffset? NgoaiLeDen { get; set; }
    /// <summary>Giờ ngủ «HH:mm» bắt đầu (dòng «ngủ lúc 21:30»). null = chưa đặt.</summary>
    public string? NguLuc { get; set; }
}

public sealed class PipeRequest
{
    public string Cmd { get; set; } = PipeCmd.State;
    public string? AppId { get; set; }
    public string? AppName { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.Request"/>: <see cref="LoaiXin"/> — them_gio (mặc định) | doi_diem | mo_web | cai_app.
    /// Hai loại «mở»: giá trị (địa chỉ trang / tên app) ở <see cref="AppId"/>, tên hiển thị ở <see cref="AppName"/>.</summary>
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
    /// <summary>Lệnh <see cref="PipeCmd.PlayInfo"/>: số phút chơi tối đa đổi được bằng điểm hiện có (null = chưa biết).</summary>
    public int? PlayMinutes { get; set; }
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
