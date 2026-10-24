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
    /// <summary>AiiGrow 0.2.4: phiên chơi bằng điểm đang chạy (dong-bo.windows.playSessionId) — chỉ có khi agent đang cho chạy app chơi.
    /// Dùng khi MẤT MẠNG (BRD 6.7, <see cref="PhienOffline"/>): đếm phút chơi, vượt <see cref="PlayOfflineMinutes"/> ⇒ tự bỏ app chơi.</summary>
    [JsonConverter(typeof(FlexStringConverter))]
    public string? PlaySessionId { get; set; }
    /// <summary>Mục của phiên, chữ thường: tên .exe, hoặc tên miền khi <see cref="PlayWeb"/>.</summary>
    public string? PlayApp { get; set; }
    /// <summary>Phiên web ⇒ app chơi là trình duyệt (<see cref="PhienOffline.TrinhDuyet"/>).</summary>
    public bool PlayWeb { get; set; }
    /// <summary>Số phút tối đa được chơi tiếp khi mất mạng (máy chủ tính từ phút còn lại của phiên, số dư, phút thưởng, giá phiên).</summary>
    public double? PlayOfflineMinutes { get; set; }
    /// <summary>0.2.6: app / trang Giải trí Ba Mẹ đã xếp (chữ thường: .exe hoặc tên miền) — Rob cho Con chọn khi bấm «Chơi bằng điểm» (máy chủ: windows.playChoices).</summary>
    public List<string> PlayChoices { get; set; } = new();
}

public sealed record UsageEntry(string Day, string AppId, string AppName, int Minutes);

/// <summary>Trạng thái bảo vệ do tác tử gửi kèm mỗi lần sync (máy chủ lưu JSON này).</summary>
public sealed class AgentStatus
{
    public string Agent { get; set; } = "windows";
    /// <summary>Bản agent đang chạy (AssemblyVersion, Directory.Build.props) — máy chủ hiện ở app Ba Mẹ (server/lib/ban-agent.ts › banMayBao).</summary>
    public string Version { get; set; } = TuCapNhat.BanHienTai().ToString(3);
    public string Mode { get; set; } = Modes.TuDo;
    public bool AppLockerApplied { get; set; }
    public bool TrayAlive { get; set; }
    public bool ChildSessionActive { get; set; }
    public bool Offline { get; set; }
    /// <summary>AiiGrow: chế độ THẬT SỰ đang áp trên máy («giam-sat» | «chan») — máy chủ hiển thị đúng sự thật cho Ba Mẹ.</summary>
    public string CheDo { get; set; } = CheDoAgent.GiamSat;
    /// <summary>AiiGrow: token bị từ chối lâu ⇒ đã thôi chặn (fail-open). Máy chủ thường không nhận được trường này (token sai) — để ghi log.</summary>
    public bool MoCoi { get; set; }
    /// <summary>AiiGrow: các «quyền bảo vệ» agent đang có (true) / còn thiếu (false) — máy chủ tính «Mức bảo vệ» trên app Ba Mẹ từ đây (server/lib/gia-dinh.ts › chiTietBaoVe).
    /// Khoá: dichVu (dịch vụ chạy — luôn true khi đang gửi), khay (khay chạy khi Con đang đăng nhập), chanThat (Ba Mẹ/ cấu hình đã bật «chan»),
    /// appLocker (luật AppLocker đã áp — chỉ báo khi cần: chế độ chặn + mode «hoc»). Thiếu khoá = không áp dụng.</summary>
    public Dictionary<string, bool> Quyen { get; set; } = new();
    /// <summary>AiiGrow: người trước màn hình đang dùng tài khoản Windows KHÁC tài khoản Con (lúc đó không chặn, không đếm giờ).</summary>
    public bool PhienKhac { get; set; }
    /// <summary>AiiGrow 0.2.4: số giây Con chơi THẬT phiên <see cref="PlaySessionId"/> (app chơi — trình duyệt nếu phiên web — ở nền trước,
    /// màn hình mở; <see cref="TienCanhChoi"/>) kể từ lần đồng bộ thành công trước, đếm bằng đồng hồ đơn điệu. Máy chủ tính đúng chừng đó
    /// (server/lib/phien-windows.ts); 0 ⇒ tạm dừng. LUÔN gửi (kể cả 0) — vắng trường nghĩa là agent cũ (0.2.0–0.2.3).</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public double PlaySeconds { get; set; }
    /// <summary>Phiên mà <see cref="PlaySeconds"/> thuộc về (Policy.PlaySessionId đang giữ); null = Policy không có phiên.</summary>
    public string? PlaySessionId { get; set; }
    /// <summary>0.2.6 (BUG-005): ghi chú bảo vệ cho Ba Mẹ — vd «Win Home: chặn bằng cách đóng app». null = không có gì đặc biệt.</summary>
    public string? GhiChuBaoVe { get; set; }
}

/// <summary>Tính <see cref="AgentStatus.Quyen"/> từ trạng thái thật (thuần, test được).</summary>
public static class QuyenBaoVe
{
    /// <param name="phienKhac">Màn hình đang ở tài khoản Windows khác tài khoản Con ⇒ thêm khoá phienCon=false (máy chủ: «Máy đang dùng tài khoản khác»).</param>
    public static Dictionary<string, bool> Tinh(string cheDo, bool moCoi, string mode, bool appLockerApplied, bool trayAlive, bool childSessionActive, bool phienKhac = false, bool appLockerKhaDung = true)
    {
        bool chan = CheDoHieuLuc.LaChan(cheDo) && !moCoi;
        var q = new Dictionary<string, bool>
        {
            ["dichVu"] = true,
            // Khay chỉ chạy khi Con đang đăng nhập — Con chưa đăng nhập thì không tính là thiếu.
            ["khay"] = trayAlive || !childSessionActive,
            ["chanThat"] = chan,
        };
        // Win Home không có AppLocker: chặn bằng cách đóng app là cách bình thường của máy đó, không tính là «thiếu quyền» (BUG-005)
        if (chan && mode == Modes.Hoc && appLockerKhaDung) q["appLocker"] = appLockerApplied;
        if (phienKhac) q["phienCon"] = false;
        return q;
    }
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
    /// <summary>Máy chủ cũ chỉ trả «trang_thai» (không «status») cho POST yeu-cau.</summary>
    [JsonPropertyName("trang_thai")] public string TrangThai { get; set; } = "";
    [JsonIgnore] public string KetQua => Status.Length > 0 ? Status : TrangThai;
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
    /// <summary>Số phút tối đa mở được lúc này (phien/xet.phutToiDa) — Rob hiện «≈ X phút chơi». Số điểm KHÔNG sang khay.
    /// Số THỰC: máy chủ cộng phút thưởng (real) nên có thể lẻ (22.5) — int? thì đọc JSON lỗi ⇒ cả «Dùng điểm để chơi» hỏng (review #75).
    /// Hiển thị bằng <see cref="PhutHienThi"/>.</summary>
    public double? PhutToiDa { get; set; }
    /// <summary>Số phút làm tròn xuống để hiện cho Con (không hứa hơn máy chủ cho).</summary>
    public int? PhutHienThi => PhutToiDa is { } p ? (int)Math.Floor(p) : null;
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
    /// <summary>AiiGrow (thêm): thời gian dịch vụ CHẠY kể từ lần liên lạc cuối, cộng dồn theo đồng hồ đơn điệu (Environment.TickCount64, có trần mỗi vòng).
    /// Fail-open 14 ngày cần cả mốc này lẫn <see cref="LienLacCuoi"/> — chỉnh giờ máy tới trước không mở được chặn. Về 0 mỗi lần đồng bộ được.</summary>
    public double MatLienLacChayGiay { get; set; }
    /// <summary>AiiGrow (thêm): các tài khoản Windows đã bị HẠ quyền lúc cài (để TRẢ LẠI khi gỡ — không để «dính» mất quyền admin).</summary>
    public List<QuyenDaHa> DaHaQuyen { get; set; } = new();
    /// <summary>AiiGrow 0.2.4: phút chơi khi mất mạng chưa gửi bù (<see cref="PhienOffline"/>) — lưu để dịch vụ khởi động lại vẫn giữ (vẫn chặn app
    /// chơi đã vượt ngưỡng, vẫn gửi bù khi có mạng lại). null = không có gì.</summary>
    public PhienOffline? PhienOffline { get; set; }
    /// <summary>AiiGrow 0.2.4 (review PR #59, P2-5): số giây đã chơi phiên <see cref="Policy.PlaySessionId"/> tại máy kể từ khi nhận Policy đang
    /// giữ — về 0 khi có Policy mới. Ngưỡng đoạn offline mới = PlayOfflineMinutes − chừng này.</summary>
    public DaChoiTheoPolicy? DaChoi { get; set; }

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

/// <summary>Số giây đã chơi một phiên tại máy kể từ Policy đang giữ (<see cref="AgentConfig.DaChoi"/>).</summary>
public sealed class DaChoiTheoPolicy
{
    public string PhienId { get; set; } = "";
    public double Giay { get; set; }
}
