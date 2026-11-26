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
    /// <summary>«Dùng sao để chơi»: dịch vụ gọi phien/xet → phien/mo rồi trả kết quả cho màn chặn.</summary>
    public const string Play = "play";
    /// <summary>Con gõ mã mở offline Ba Mẹ đọc (<see cref="PipeRequest.Code"/>); dịch vụ tự kiểm, không cần máy chủ.</summary>
    public const string MaOffline = "ma-offline";
    /// <summary>Khay học viên (nhiệm vụ / phần quà / thông báo): dịch vụ chuyển <see cref="PipeRequest.Method"/> + <see cref="PipeRequest.Path"/>
    /// tới <c>api/device/hoc-vien/…</c> (chỉ đường trong <see cref="HocVienPaths"/>) bằng token máy, trả JSON nguyên văn ở <see cref="PipeResponse.Data"/>.</summary>
    public const string HocVien = "hoc-vien";
    /// <summary>«Thử kết nối lại»: bảo dịch vụ đồng bộ với máy chủ ngay (không chờ nhịp sau). Trả trạng thái hiện tại.</summary>
    public const string SyncNow = "sync-now";
    /// <summary>0.2.6: Grow hỏi «đổi được bao nhiêu phút» — dịch vụ gọi phien/xet cho <see cref="PipeRequest.AppId"/> (hoặc mục Giải trí đầu tiên) và trả số phút ở
    /// <see cref="PipeResponse.PlayMinutes"/> (không trả số sao).</summary>
    public const string PlayInfo = "play-info";
    /// <summary>Thiết kế 05/11: «Xin Ba Mẹ mở …» app / web lạ (<see cref="PipeRequest.AppId"/> = mục, <see cref="PipeRequest.AppName"/> = tên, Note = lời nhắn).
    /// Trả <see cref="PipeResponse.Status"/>: cho | duoc | tu_choi | cho_mang (mất mạng — đã lưu, có mạng tự gửi).</summary>
    public const string XinDuyet = "xin-duyet";
    /// <summary>#422: danh sách app đã cài trên máy (lần quét gần nhất của DanhSachAppWorker) cho lưới «App trên máy» của hộp «Xin thêm app / web» —
    /// <see cref="PipeResponse.Data"/> = JSON mảng <see cref="AppTrenMay"/> (mục + tên, không icon). Chưa quét xong ⇒ Ok, Data = "[]".</summary>
    public const string AppMay = "app-may";
    /// <summary>«Kiểm tra cập nhật» từ khay: dịch vụ hỏi manifest máy chủ ⇒ <see cref="PipeResponse.Message"/> = bản mới (null = đã mới nhất),
    /// <see cref="PipeResponse.Status"/> = bản đang chạy.</summary>
    public const string KiemCapNhat = "kiem-cap-nhat";
    /// <summary>«Cập nhật để sửa lỗi»: dịch vụ chạy lượt tự cập nhật ngay (tải, kiểm sha256, chạy bộ cài --capnhat --im-lang).</summary>
    public const string CapNhatNgay = "cap-nhat-ngay";
    // ---- 06/11 (L13): máy dùng chung — chọn tên + PIN, quên PIN, Ba Mẹ nhập mã, đổi bé / khoá lại (dịch vụ gọi /api/device/* bằng token máy;
    //      mất mạng ⇒ tự kiểm PIN / mã tại máy). Trả lỗi ở Status (pin_sai | pin_tam_khoa | can_pin | khong_thay | ma_sai | ma_tam_khoa | ma_da_dung | …)
    //      kèm ConLan / ChoGiay; HoSo trả danh sách bé ở Data (JSON HoSoMay, không có vân PIN).
    public const string HoSo = "ho-so";
    /// <summary>Id = id bé, Code = PIN (trống khi bé chưa có PIN).</summary>
    public const string DangNhapBe = "dang-nhap-be";
    /// <summary>Id = id bé ⇒ «Báo Ba Mẹ giúp con».</summary>
    public const string QuenPin = "quen-pin";
    /// <summary>Code = mã mở máy 6 số Ba Mẹ gõ ⇒ «Ba Mẹ đang dùng máy».</summary>
    public const string BaMeMo = "ba-me-mo";
    /// <summary>«Đổi người / Đăng xuất» của bé.</summary>
    public const string DangXuat = "dang-xuat";
    /// <summary>«Khoá lại» của Ba Mẹ.</summary>
    public const string KhoaLai = "khoa-lai";
    /// <summary>14/11 (con-ngay-thuong 24 — FR-01.05): Con bấm «Thoát AiiGrow…» ⇒ dịch vụ báo Ba Mẹ ngay (sự kiện con_muon_thoat, mất mạng thì vào hàng đợi).
    /// Trả Status = da_bao | cho_mang. Tắt / gỡ chỉ được khi Ba Mẹ gõ mã 6 số (<see cref="BaMeMo"/>).</summary>
    public const string BaoThoat = "bao-thoat";
}

/// <summary>Trạng thái dịch vụ gửi cho tray (15/11: có số sao — sao = phút chơi, Con thấy số dư của mình).</summary>
public sealed class TrayState
{
    public bool Paired { get; set; }
    public string ChildName { get; set; } = "";
    public string Mode { get; set; } = Modes.TuDo;
    public bool Locked { get; set; }
    public string? LockReason { get; set; }
    /// <summary>16/11 (#307, cmt-khoa-ba-me-khoa): lúc máy bắt đầu khoá vì Ba Mẹ «Khoá ngay» (null = không khoá / không biết) — «Ba Mẹ khoá lúc 19:30.».</summary>
    public DateTimeOffset? KhoaLuc { get; set; }
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
    /// <summary>#307: lúc bắt đầu lượt mở tạm bằng mã (thời lượng thật của mã = đến − từ).</summary>
    public DateTimeOffset? MoOfflineTu { get; set; }
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
    /// <summary>0.2.6: các app / trang Giải trí Ba Mẹ đã xếp (chữ thường) — Grow liệt kê cho nút «Chơi bằng sao» (máy chủ: windows.playChoices).</summary>
    public List<string> PlayChoices { get; set; } = new();
    /// <summary>0.2.6 (BUG-007): khay đang chạy trong phiên của tài khoản Con? false ⇒ khay (phiên Ba Mẹ / tài khoản quản trị) tự thoát, không hiện biểu tượng / màn chặn.
    /// Mặc định true (dịch vụ cũ không gửi ⇒ như trước).</summary>
    public bool PhienCon { get; set; } = true;
    /// <summary>25/10: phút đã dùng HÔM NAY theo app (dịch vụ đếm — <see cref="UsageTracker.DungHomNay"/>), nhiều nhất trước. Thẻ «Đã dùng hôm nay» ở app to.</summary>
    public List<DungApp> DungTheoApp { get; set; } = new();
    /// <summary>05/11: app vừa bị đóng là app Ba Mẹ ĐẶT «Chặn» (blockedApps) — màn chặn chỉ hiện nút xin; false = app lạ ⇒ khay tự gửi lời xin duyệt.</summary>
    public bool BlockedBoiBaMe { get; set; }
    /// <summary>App «Không tính phút» Ba Mẹ cho phép (Policy.LearningApps, chữ thường .exe) — màn chặn «danh sách của con», «Từ điển vẫn mở».</summary>
    public List<string> AppDuocPhep { get; set; } = new();
    /// <summary>05/11 (L11): số lời xin Con gửi lúc mất mạng còn chờ có mạng để gửi.</summary>
    public int XinChoMang { get; set; }
    /// <summary>#684: lời xin lưu lúc mất mạng bị bỏ chưa tới Ba Mẹ (24 giờ gần nhất) — khay báo Con mỗi mục một lần.</summary>
    public List<LoiXinCho> XinBo { get; set; } = new();
    /// <summary>15/11: số dư sao Con thấy (ÂM khi nợ), đã trừ phần đếm tại máy. null = máy chủ chưa gửi ⇒ khay không ghi số.</summary>
    public int? Sao { get; set; }
    /// <summary>15/11: số sao đang nợ Ba Mẹ (0 = không nợ; null = máy chủ cũ).</summary>
    public int? No { get; set; }
    /// <summary>15/11: phút «Tính phút» còn chơi = sao tiêu được, đã trừ phần đếm tại máy (QuyTaiCho). 0 = hết sao. null = máy chủ cũ / chưa chọn bé.</summary>
    public double? QuyConPhut { get; set; }
    /// <summary>15/11 (#262): Con đang «Mở hết» (không chặn, không trừ sao).</summary>
    public bool MoHet { get; set; }
    /// <summary>16/11 (#302): app «Tính phút» khoá vì giới hạn (không phải hết sao) — «het_gio_ngay» | «dang_nghi» | null.</summary>
    public string? GioiHanLyDo { get; set; }
    /// <summary>16/11 (#302): «HH:MM» hết nghỉ (khi <see cref="GioiHanLyDo"/> = dang_nghi).</summary>
    public string? GioiHanGio { get; set; }
    /// <summary>16/11 (#302): câu sẵn của máy chủ («Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé»).</summary>
    public string? GioiHanCau { get; set; }
    /// <summary>16/11 (#302): phút còn bị giới hạn chặn trước số sao (sắp tới giờ nghỉ / hết giờ hôm nay, không phải sắp hết sao).</summary>
    public bool GioiHanChan { get; set; }
    /// <summary>16/11 (#302): giới hạn chặn trước là LƯỢT (sắp nghỉ) — false = giới hạn NGÀY (sắp hết giờ hôm nay).</summary>
    public bool GioiHanChanLuot { get; set; }
    /// <summary>15/11: mục «Tính phút» Ba Mẹ đã xếp (app .exe / tên miền) — «Roblox, YouTube Kids đang khoá», nhắc «hết sao là Roblox đóng».</summary>
    public List<string> AppTinhPhut { get; set; } = new();
    /// <summary>15/11: app tiền cảnh (lượt báo gần nhất của khay) là app «Tính phút» đang trừ sao ⇒ nhắc 5 sao / đếm ngược hết sao.</summary>
    public bool DangChoiTinhPhut { get; set; }
    /// <summary>15/11 (PR #277): phút «Tính phút» hôm nay lúc máy mở bằng mã của Ba Mẹ (không trừ sao) — bỏ khỏi «Hôm nay đã chơi N phút · −N sao».</summary>
    public int PhutBoiMaHomNay { get; set; }
    /// <summary>Tên đẹp app tiền cảnh khi <see cref="DangChoiTinhPhut"/> («Roblox»).</summary>
    public string? AppDangChoi { get; set; }
    /// <summary>05/11 (L11): số bài nộp lúc mất mạng đang chờ có mạng để tự gửi (BaiChoMang).</summary>
    public int BaiChoMang { get; set; }
    // ---- 06/11 (L13): ai đang dùng máy
    /// <summary>con | ba_me | chua (<see cref="LoaiNguoiDung"/>). chua ⇒ màn khoá «Ai đang dùng máy?» (LockReason chon_ten).</summary>
    public string NguoiDung { get; set; } = LoaiNguoiDung.Con;
    public string? BeId { get; set; }
    public string? BeTen { get; set; }
    /// <summary>«Ba Mẹ đang dùng máy» tới lúc này (null = không).</summary>
    public DateTimeOffset? BaMeDen { get; set; }
    /// <summary>Máy chỉ gán một bé (không có «Đổi người»).</summary>
    public bool MayRieng { get; set; }
    /// <summary>16/11 (#307): tên hiển thị (dịch vụ đã giải theo danh sách app máy) của <see cref="AppDuocPhep"/> / <see cref="AppTinhPhut"/>, cùng thứ tự —
    /// khay hiện đúng tên này («Từ điển», «YouTube Kids»), không tự tra tên, không hiện tên tiến trình. Rỗng = dịch vụ cũ (khay dùng mục).</summary>
    public List<string> TenAppDuocPhep { get; set; } = new();
    public List<string> TenAppTinhPhut { get; set; } = new();
}

public sealed class PipeRequest
{
    public string Cmd { get; set; } = PipeCmd.State;
    public string? AppId { get; set; }
    public string? AppName { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.Request"/>: <see cref="LoaiXin"/> — vay_sao (số sao ở <see cref="Minutes"/>, lời nhắn ở <see cref="Note"/>) | mo_web | cai_app.
    /// Hai loại «mở»: giá trị (địa chỉ trang / tên app) ở <see cref="AppId"/>, tên hiển thị ở <see cref="AppName"/>.</summary>
    public string? Kind { get; set; }
    /// <summary>#422 lệnh <see cref="PipeCmd.XinDuyet"/>: «app» | «web» — thẻ Con chọn ở hộp «Xin thêm app / web» (null = máy chủ tự đoán, như màn chặn).</summary>
    public string? Kieu { get; set; }
    public int Minutes { get; set; }
    public string? Note { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.Status"/>: id lời xin. Lệnh Request vay_sao: id quà muốn đổi (vay để đổi quà), trống = vay để chơi.</summary>
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
    /// <summary>#686: Status — lời xin không hỏi được nữa (máy chủ trả 4xx / chưa ghép), khác lỗi tạm (mất mạng, 5xx).</summary>
    public bool KhongCon { get; set; }
    public TrayState? State { get; set; }
    public string? Id { get; set; }
    public string? Status { get; set; }
    public DateTimeOffset? GrantEndsAt { get; set; }
    /// <summary>15/11 lệnh <see cref="PipeCmd.Status"/>: kết quả đầy đủ của lời xin (ketQua, nhóm, người duyệt, lời nhắn, mở tạm).</summary>
    public RequestStatus? KetQua { get; set; }
    /// <summary>Câu nhắc do máy chủ trả (ví dụ kết quả «Dùng sao để chơi»). Không chứa số sao.</summary>
    public string? Message { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.HocVien"/>: thân JSON máy chủ trả (nguyên văn).</summary>
    public string? Data { get; set; }
    /// <summary>Lệnh <see cref="PipeCmd.PlayInfo"/>: số phút chơi tối đa đổi được bằng điểm hiện có (null = chưa biết).</summary>
    public int? PlayMinutes { get; set; }
    /// <summary>06/11: PIN / mã sai ⇒ còn bao nhiêu lần thử.</summary>
    public int? ConLan { get; set; }
    /// <summary>06/11: sai đủ lần ⇒ chờ bao nhiêu giây.</summary>
    public int? ChoGiay { get; set; }
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
            System.Diagnostics.Trace.WriteLine($"PipeClient {req.Cmd}: {e}");   // chi tiết cho chẩn đoán (lệch bản, ống bận); khay chỉ nhận câu tiếng Việt
            return new PipeResponse { Ok = false, Error = CauLoi.DichVuChuaSan };   // #688: không hiện «All pipe instances are busy.»
        }
    }
}
