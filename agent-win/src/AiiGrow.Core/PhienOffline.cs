using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

/// <summary>
/// Phút chơi khi MẤT MẠNG (BRD 6.7, agent 0.2.4) — lớp THUẦN, lưu trong <see cref="AgentConfig.PhienOffline"/> (dịch vụ khởi động lại vẫn giữ).
/// Máy chủ vẫn là sổ sách và quyết định; agent chỉ:
///   1. Đếm giây (đồng hồ ĐƠN ĐIỆU do người gọi truyền vào — Con chỉnh giờ máy không ăn gian) khi đang mất mạng, Policy cuối có phiên chơi
///      (<see cref="Policy.PlaySessionId"/>), Con đang đăng nhập và app chơi ở nền trước (trình duyệt nếu <see cref="Policy.PlayWeb"/>).
///      Màn hình khoá (khay báo tiền cảnh rỗng) / app khác ⇒ không đếm. Khay chết (không báo tiền cảnh) ⇒ VẪN đếm (Con tắt khay không ngừng được đồng hồ).
///   2. Vượt <see cref="Policy.PlayOfflineMinutes"/> ⇒ <see cref="HetHan"/>: bỏ app chơi (và trình duyệt nếu phiên web) khỏi allowedApps hiệu lực
///      (<see cref="ApDung"/> — AppLocker + ProcessEnforcer như luồng thường), coi như phiên đã hết.
///   3. Có mạng lại ⇒ gửi <c>POST api/device/phien/bu</c> TRƯỚC dong-bo (<see cref="GuiBu"/>), <see cref="Ma"/> một lần (gửi lại không trừ đôi).
/// </summary>
public sealed class PhienOffline
{
    /// <summary>Trình duyệt cho phiên web — GIỐNG server/lib/agent-windows.ts › TRINH_DUYET.</summary>
    public static readonly string[] TrinhDuyet = { "chrome.exe", "msedge.exe", "brave.exe" };
    /// <summary>Ghi đĩa mỗi lượt đếm thêm chừng này giây (mất tối đa ~30 giây khi tắt máy đột ngột).</summary>
    public const int GhiMoiGiay = 30;

    /// <summary>Mã gửi bù một lần (sinh khi bắt đầu đoạn offline, lưu bền ⇒ gửi lại idempotent).</summary>
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    public string PhienId { get; set; } = "";
    public string Muc { get; set; } = "";
    public bool Web { get; set; }
    /// <summary>Ngưỡng phút chơi offline (Policy.PlayOfflineMinutes lúc bắt đầu đoạn).</summary>
    public double GioiHanPhut { get; set; }
    public double GiayChoi { get; set; }
    public bool HetHan { get; set; }
    /// <summary>Giờ máy lúc bắt đầu / lần cuối đếm (chỉ để máy chủ ghi; máy chủ tự kẹp theo đồng hồ của nó).</summary>
    public DateTimeOffset? BatDau { get; set; }
    public DateTimeOffset? KetThuc { get; set; }

    [JsonIgnore] public double PhutChoi => Math.Round(GiayChoi / 60.0, 1);
    /// <summary>Có gì để gửi bù: đã chơi, hoặc đã vượt ngưỡng (báo máy chủ đóng phiên).</summary>
    [JsonIgnore] public bool CanGui => PhienId.Length > 0 && (GiayChoi > 0 || HetHan);

    public static bool LaAppChoi(Policy p, string? appId)
    {
        if (string.IsNullOrEmpty(appId) || p.PlayApp == null) return false;
        var a = appId.Trim().ToLowerInvariant();
        return p.PlayWeb ? TrinhDuyet.Contains(a) : a == p.PlayApp;
    }

    /// <summary>
    /// Một vòng thực thi. <paramref name="doan"/> là đoạn đang có (null = chưa có); trả về đoạn sau vòng này (có thể mới tạo).
    /// <paramref name="giayDonDieu"/> = giây trôi theo đồng hồ đơn điệu từ vòng trước. → <c>Luu</c> = nên ghi đĩa ngay (đoạn mới / vừa hết hạn / mỗi 30 giây).
    /// </summary>
    public static (PhienOffline? Doan, bool Luu) Dem(PhienOffline? doan, Policy? p, bool offline, bool conDangNhap,
        string? fgId, bool fgTuoi, double giayDonDieu, DateTimeOffset now)
    {
        if (!offline || p?.PlaySessionId == null || p.PlayApp == null) return (doan, false);
        bool luu = false;
        if (doan == null || doan.PhienId != p.PlaySessionId)
        {
            // đoạn cũ của phiên khác chưa gửi được thì giữ phiên mới (Policy cuối là sự thật mới nhất); phút của đoạn cũ bỏ (máy chủ đã chốt phiên đó)
            var gioi = Math.Max(0, p.PlayOfflineMinutes ?? 0);
            doan = new PhienOffline { PhienId = p.PlaySessionId, Muc = p.PlayApp, Web = p.PlayWeb, GioiHanPhut = gioi, HetHan = gioi <= 0 };
            luu = true;
        }
        if (doan.HetHan || !conDangNhap || !(giayDonDieu > 0)) return (doan, luu);
        // khay tươi: chỉ đếm khi tiền cảnh là app chơi ("" = màn hình khoá; app khác = tạm dừng). Khay chết ⇒ vẫn đếm.
        if (fgTuoi && !LaAppChoi(p, fgId)) return (doan, luu);
        var truoc = doan.GiayChoi;
        doan.GiayChoi += Math.Min(giayDonDieu, 60);
        doan.BatDau ??= now.ToUniversalTime();
        doan.KetThuc = now.ToUniversalTime();
        if (doan.GiayChoi >= doan.GioiHanPhut * 60) { doan.HetHan = true; return (doan, true); }
        return (doan, luu || (int)(truoc / GhiMoiGiay) != (int)(doan.GiayChoi / GhiMoiGiay));
    }

    /// <summary>Policy hiệu lực: đoạn offline của ĐÚNG phiên đang trong Policy đã hết hạn ⇒ bỏ app chơi (và trình duyệt nếu phiên web) khỏi
    /// allowedApps — trừ app Ba Mẹ đã xếp Học tập. Không đổi gì ⇒ trả lại chính <paramref name="p"/>.</summary>
    public static Policy ApDung(Policy p, PhienOffline? doan)
    {
        if (doan is not { HetHan: true } || p.PlaySessionId == null || doan.PhienId != p.PlaySessionId) return p;
        var bo = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (!p.PlayWeb && p.PlayApp != null && p.PlayApp.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) bo.Add(p.PlayApp);
        if (p.PlayWeb) foreach (var t in TrinhDuyet) bo.Add(t);
        bo.ExceptWith(p.LearningApps);
        if (bo.Count == 0 || !p.AllowedApps.Any(bo.Contains)) return p;
        var c = JsonSerializer.Deserialize<Policy>(JsonSerializer.Serialize(p, Json.Options), Json.Options)!;
        c.AllowedApps = p.AllowedApps.Where(a => !bo.Contains(a)).ToList();
        return c;
    }

    /// <summary>Thân <c>POST api/device/phien/bu</c> (server/lib/may-con.ts › BuVao). <c>ketThuc</c> = true ⇒ máy chủ đóng phiên.</summary>
    public object TaoBu() => new { ma = Ma, id = PhienId, muc = Muc, phut = PhutChoi, batDau = BatDau, ketThuc = HetHan };

    /// <summary>Chọn bản giữ khi nạp lại cấu hình từ đĩa: cùng mã ⇒ bản đếm được nhiều hơn (đĩa ghi 30 giây/lần); khác ⇒ bản trong bộ nhớ (mới hơn).</summary>
    public static PhienOffline? Chon(PhienOffline? boNho, PhienOffline? dia)
    {
        if (boNho == null) return dia;
        if (dia == null || dia.Ma != boNho.Ma) return boNho;
        return dia.GiayChoi > boNho.GiayChoi || (dia.HetHan && !boNho.HetHan) ? dia : boNho;
    }

    public PhienOffline Sao() => JsonSerializer.Deserialize<PhienOffline>(JsonSerializer.Serialize(this, Json.Options), Json.Options)!;
}

public enum KetQuaBu
{
    /// <summary>Không có gì để gửi.</summary>
    KhongCo,
    /// <summary>Máy chủ đã nhận (kể cả «lapLai» — mã đã nhận trước đó) ⇒ xoá đoạn.</summary>
    DaGui,
    /// <summary>Lỗi mạng / máy chủ 5xx / 401–403 / 408 / 429 ⇒ giữ, gửi lại lần sau.</summary>
    GiuLai,
    /// <summary>Lỗi 4xx vĩnh viễn (phiên không thấy, dữ liệu sai) ⇒ bỏ, ghi log.</summary>
    Bo,
}

/// <summary>Gửi bù phút chơi offline TRƯỚC lần dong-bo (nhịp cuối trên máy chủ còn cũ ⇒ máy chủ đo được thời gian thật đã trôi).</summary>
public static class GuiBu
{
    public static bool LaLoiVinhVien(ApiException e) => e.StatusCode is >= 400 and < 500 and not (401 or 403 or 408 or 429);

    public static async Task<(KetQuaBu Kq, ApiException? Loi)> GuiAsync(ApiClient api, PhienOffline? doan, CancellationToken ct = default)
    {
        if (doan is not { CanGui: true }) return (KetQuaBu.KhongCo, null);
        try { await api.BuPhienAsync(doan.TaoBu(), ct); return (KetQuaBu.DaGui, null); }
        catch (ApiException e) { return (LaLoiVinhVien(e) ? KetQuaBu.Bo : KetQuaBu.GiuLai, e); }
    }

    /// <summary>Một lượt đồng bộ của vòng thực thi: gửi bù (nếu có) rồi dong-bo. <paramref name="sauBu"/> chạy NGAY sau bước gửi bù
    /// (kể cả khi dong-bo lỗi sau đó) để người gọi xoá / giữ đoạn.</summary>
    public static async Task<(Policy Policy, string Raw)> DongBoAsync(ApiClient api, PhienOffline? doan, Action<KetQuaBu, ApiException?> sauBu,
        AgentStatus status, IReadOnlyList<UsageEntry> usage, CancellationToken ct = default)
    {
        var (kq, loi) = await GuiAsync(api, doan, ct);
        sauBu(kq, loi);
        return await api.SyncAsync(status, usage, ct);
    }
}
