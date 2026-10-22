using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

/// <summary>Cấu hình JSON dùng chung (camelCase, chịu được chú thích và dấu phẩy thừa).</summary>
public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}

/// <summary>Cho phép id là chuỗi hoặc số trong JSON của máy chủ.</summary>
public sealed class FlexStringConverter : JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.String: return reader.GetString();
            case JsonTokenType.Number: return reader.GetInt64().ToString();
            case JsonTokenType.Null: return null;
            default: throw new JsonException("id phải là chuỗi hoặc số");
        }
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}

public static class Modes
{
    public const string Khoa = "khoa";
    public const string Hoc = "hoc";
    public const string TuDo = "tu_do";
}

public static class LockReasons
{
    public const string Khoa = "khoa";
    public const string Ngu = "ngu";
    public const string HetGio = "het_gio";
    /// <summary>Màn chặn giải trí: hết điểm để mở phiên chơi.</summary>
    public const string HetDiem = "het_diem";
    /// <summary>Màn chặn giải trí: app chưa được Ba Mẹ phân loại nên chưa cho mở.</summary>
    public const string ChuaPhanLoai = "chua_phan_loai";
}

/// <summary>Policy do máy chủ tính sẵn (PLAN.md mục 3). Tác tử chỉ áp và nhớ bản cuối.</summary>
public sealed class Policy
{
    public DateTimeOffset? ServerTime { get; set; }
    public string ChildName { get; set; } = "";
    public string Mode { get; set; } = Modes.TuDo;
    public bool Locked { get; set; }
    public string? LockReason { get; set; }
    public List<string> AllowedApps { get; set; } = new();
    public List<string> LearningApps { get; set; } = new();
    public int? MinutesLeft { get; set; }
    public DateTimeOffset? GrantEndsAt { get; set; }
    public int NextCheckSec { get; set; } = 30;
    public bool CanExchangePoints { get; set; }
    /// <summary>AiiGrow: bí mật mã mở offline (MaOffline.cs) — máy chủ cấp qua dong-bo.windows khi còn mạng; agent lưu để tự kiểm mã lúc mất mạng.</summary>
    public string? MaOfflineBiMat { get; set; }
    /// <summary>AiiGrow: chế độ Ba Mẹ chọn trên app (dong-bo.windows.cheDo) — «giam-sat» | «chan»; null = Ba Mẹ chưa chọn (giữ chế độ cục bộ).
    /// Có giá trị thì THẮNG <see cref="AgentConfig.CheDo"/> (xem <see cref="CheDoHieuLuc"/>). Đang có lệnh gỡ ⇒ máy chủ luôn gửi giam-sat.</summary>
    public string? CheDo { get; set; }
}

public sealed record UsageEntry(string Day, string AppId, string AppName, int Minutes);

/// <summary>Trạng thái bảo vệ do tác tử gửi kèm mỗi lần sync (máy chủ lưu JSON này).</summary>
public sealed class AgentStatus
{
    public string Agent { get; set; } = "windows";
    public string Version { get; set; } = "0.1.0";
    public string Mode { get; set; } = Modes.TuDo;
    public bool AppLockerApplied { get; set; }
    public bool TrayAlive { get; set; }
    public bool ChildSessionActive { get; set; }
    public bool Offline { get; set; }
    /// <summary>AiiGrow: chế độ THẬT SỰ đang áp trên máy («giam-sat» | «chan») — máy chủ hiển thị đúng sự thật cho Ba Mẹ.</summary>
    public string CheDo { get; set; } = CheDoAgent.GiamSat;
    /// <summary>AiiGrow: token bị từ chối lâu ⇒ đã thôi chặn (fail-open). Máy chủ thường không nhận được trường này (token sai) — để ghi log.</summary>
    public bool MoCoi { get; set; }
}

/// <summary>Mã QR ghép máy (POST /api/device/ghep-qr). Máy con hiện <see cref="Qr"/>, giữ <see cref="Bi"/> để hỏi kết quả — Bi không nằm trong QR.</summary>
public sealed class QrPair
{
    public string Ma { get; set; } = "";
    public string Bi { get; set; } = "";
    public string Link { get; set; } = "";
    public string Het { get; set; } = "";
    public List<string> Qr { get; set; } = new();
}

/// <summary>POST /api/device/ghep-qr/hoi {ma, bi} — "cho" | "het" | "xong" (kèm token, chỉ trả một lần).</summary>
public sealed class QrState
{
    public string TrangThai { get; set; } = "";
    [JsonConverter(typeof(FlexStringConverter))]
    public string? DeviceId { get; set; }
    public string? Token { get; set; }
    public string? ChildName { get; set; }
    public string? Server { get; set; }
}

public sealed class PairResult
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string DeviceId { get; set; } = "";
    public string Token { get; set; } = "";
    public string ChildName { get; set; } = "";
    public string? Server { get; set; }
    /// <summary>AiiGrow (thêm): máy dùng chung (Con chọn hồ sơ + PIN).</summary>
    public bool DungChung { get; set; }
}

public sealed class RequestResult
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public string Status { get; set; } = "";
}

public sealed class RequestStatus
{
    public string Status { get; set; } = "";
    public DateTimeOffset? GrantEndsAt { get; set; }
}

/// <summary>Kết quả xét trước «Dùng điểm để chơi?» (POST phien/xet). KHÔNG mang số điểm/số dư sang khay — chỉ "được / không" + câu nhắc.</summary>
public sealed class PlayCheck
{
    public bool Duoc { get; set; }
    public string? LyDo { get; set; }
    /// <summary>Câu hiển thị cho con (do máy chủ soạn).</summary>
    public string? Cau { get; set; }
}

/// <summary>Kết quả mở phiên chơi (POST phien/mo).</summary>
public sealed class PlayOpen
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string? Id { get; set; }
    public string TrangThai { get; set; } = "";
    public int? ConPhut { get; set; }
}

/// <summary>Chế độ chạy agent trên máy con. Mặc định GIÁM SÁT để phụ huynh tự thử mà không bị khoá nhầm máy.</summary>
public static class CheDoAgent
{
    /// <summary>Chỉ ghi log việc SẼ chặn/khoá, không áp thật (mặc định).</summary>
    public const string GiamSat = "giam-sat";
    /// <summary>Áp thật: AppLocker + đóng app ngoài danh sách + khoá ngoài giờ.</summary>
    public const string Chan = "chan";
}

public sealed class AgentConfig
{
    public string Server { get; set; } = "";
    public string DeviceId { get; set; } = "";
    public string Token { get; set; } = "";
    public string ChildName { get; set; } = "";
    /// <summary>Tên tài khoản Windows của con (không kèm tên máy).</summary>
    public string ChildUser { get; set; } = "";
    public string ChildSid { get; set; } = "";
    public string? LastPolicyJson { get; set; }
    public DateTimeOffset? LastPolicyAt { get; set; }
    /// <summary>AiiGrow (thêm): máy dùng chung (Con chọn hồ sơ + PIN khi vào).</summary>
    public bool DungChung { get; set; }
    /// <summary>AiiGrow (thêm): chế độ chạy của agent trên máy con.
    /// <see cref="CheDoAgent.GiamSat"/> (mặc định) = chỉ GHI LOG việc SẼ chặn/khoá, KHÔNG áp AppLocker, KHÔNG đóng app, KHÔNG ngắt phiên — để phụ huynh thử an toàn.
    /// <see cref="CheDoAgent.Chan"/> = áp thật (AppLocker + đóng app ngoài danh sách + khoá ngoài giờ).</summary>
    public string CheDo { get; set; } = CheDoAgent.GiamSat;
    /// <summary>AiiGrow (thêm): hàng đợi sự kiện gửi bù khi mất mạng.</summary>
    public OfflineQueue Queue { get; set; } = new();
    /// <summary>AiiGrow (thêm): bí mật mã mở offline, lưu lại từ Policy để còn dùng khi mất mạng (xem <see cref="Policy.MaOfflineBiMat"/>).</summary>
    public string? MaOfflineBiMat { get; set; }
    /// <summary>AiiGrow (thêm): trạng thái «mở tạm bằng mã offline» (hạn mở, mã đã dùng, lượt sai) — lưu để dịch vụ khởi động lại vẫn giữ.</summary>
    public MoTamOffline MoTamOffline { get; set; } = new();
    /// <summary>AiiGrow (thêm): lần ĐẦU máy chủ từ chối token (401 token_sai) trong chuỗi liên tục; null = đang ổn. Quá <see cref="MoCoi.Nguong"/> ⇒ fail-open.</summary>
    public DateTimeOffset? TuChoiTu { get; set; }
    /// <summary>AiiGrow (thêm): lần CUỐI đồng bộ thành công với máy chủ (ghi mốc ~1 giờ/lần). Không liên lạc được quá
    /// <see cref="MoCoi.NguongLienLac"/> (14 ngày, mọi loại lỗi) ⇒ fail-open dài hạn: về giám sát, gỡ luật. Đặt lúc cài, cập nhật mỗi lần sync được.</summary>
    public DateTimeOffset? LienLacCuoi { get; set; }
    /// <summary>AiiGrow (thêm): các tài khoản Windows đã bị HẠ quyền lúc cài (để TRẢ LẠI khi gỡ — không để «dính» mất quyền admin).</summary>
    public List<QuyenDaHa> DaHaQuyen { get; set; } = new();

    [JsonIgnore]
    public bool Paired => !string.IsNullOrEmpty(Token) && !string.IsNullOrEmpty(Server);
}

/// <summary>Một tài khoản đã bị hạ quyền lúc cài: SID tài khoản + SID nhóm đã bị gỡ khỏi (để thêm lại khi gỡ AiiGrow).</summary>
public sealed class QuyenDaHa
{
    public string Sid { get; set; } = "";
    /// <summary>SID nhóm đã bị gỡ khỏi. Mặc định Administrators (S-1-5-32-544).</summary>
    public string Nhom { get; set; } = "S-1-5-32-544";
}
