using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// Phần riêng AiiGrow. Máy chủ AiiGrow trả Policy dạng mới (POST /api/device/dong-bo, server/lib/may-con.ts): Allowlist hệ thống, luật
// gia đình (học / Fun list có giá điểm/phút / chặn), khung giờ, giờ ngủ, số dư, phiên đang chạy. Lớp thực thi chép từ AiiControl
// (AppLocker + đóng app ngoài danh sách) giữ nguyên: GrowPolicyMapper đổi Policy mới sang Policy nội bộ «chỉ app được phép» —
// app Fun list chỉ nằm trong danh sách được phép khi đang có phiên chơi bằng điểm.

public sealed class Khung
{
    public string Tu { get; set; } = "";
    public string Den { get; set; } = "";
}

public sealed class LichChoi
{
    public List<Khung> NgayThuong { get; set; } = new();
    public List<Khung> CuoiTuan { get; set; } = new();
    public Khung? Ngu { get; set; }
}

public sealed class LuatMuc
{
    public string Muc { get; set; } = "";
    /// <summary>hoc | giai_tri | chan.</summary>
    public string Loai { get; set; } = "";
    public string? Nhom { get; set; }
    /// <summary>Giá phần nghìn điểm/phút (1000 = 1 điểm/phút); chỉ mục Fun list.</summary>
    public int? GiaPhanNghin { get; set; }
}

public sealed class ConDangDung
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string Nhom { get; set; } = "";
}

public sealed class PhienMayChu
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public string Muc { get; set; } = "";
    public int ConPhut { get; set; }
}

/// <summary>Policy máy chủ AiiGrow (docs/API.md, /api/device/dong-bo).</summary>
public sealed class DevicePolicy
{
    public DateTimeOffset? ServerTime { get; set; }
    public int NextCheckSec { get; set; } = 300;
    public bool GioMaySai { get; set; }
    public ConDangDung? Con { get; set; }
    public bool CanChonCon { get; set; }
    public List<string> AllowlistHeThong { get; set; } = new();
    public List<LuatMuc> Luat { get; set; } = new();
    public LichChoi Lich { get; set; } = new();
    public bool KhoaNgay { get; set; }
    public int SoDu { get; set; }
    public PhienMayChu? Phien { get; set; }
    public string Tz { get; set; } = "Asia/Ho_Chi_Minh";
    public int LechGioPhut { get; set; } = 10;
    public int PhienToiDa { get; set; } = 30;

    public static DevicePolicy Parse(string json)
    {
        DevicePolicy? p;
        try { p = JsonSerializer.Deserialize<DevicePolicy>(json, Json.Options); }
        catch (JsonException e) { throw new PolicyException("Policy không đúng JSON: " + e.Message); }
        if (p?.ServerTime == null) throw new PolicyException("Policy thiếu serverTime");
        p.AllowlistHeThong = p.AllowlistHeThong.Select(Muc.Norm).Where(s => s.Length > 0).Distinct().ToList();
        foreach (var l in p.Luat) { l.Muc = Muc.Norm(l.Muc); l.Loai = (l.Loai ?? "").Trim().ToLowerInvariant(); }
        p.Luat = p.Luat.Where(l => l.Muc.Length > 0 && l.Loai is LoaiMuc.Hoc or LoaiMuc.GiaiTri or LoaiMuc.Chan).ToList();
        p.NextCheckSec = p.NextCheckSec <= 0 ? 300 : Math.Clamp(p.NextCheckSec, 15, 900);
        p.LechGioPhut = p.LechGioPhut <= 0 ? 10 : p.LechGioPhut;
        p.PhienToiDa = p.PhienToiDa <= 0 ? 30 : p.PhienToiDa;
        p.SoDu = Math.Max(0, p.SoDu);
        p.Lich ??= new LichChoi();
        return p;
    }

    public static bool TryParse(string? json, out DevicePolicy? p)
    {
        p = null;
        if (string.IsNullOrWhiteSpace(json)) return false;
        try { p = Parse(json); return true; } catch (PolicyException) { return false; }
    }

    public LuatMuc? LuatCua(string exe) { var m = Muc.Norm(exe); return Luat.FirstOrDefault(l => l.Muc == m); }
    public bool LaFun(string exe) => LuatCua(exe)?.Loai == LoaiMuc.GiaiTri;
    public IEnumerable<string> FunList => Luat.Where(l => l.Loai == LoaiMuc.GiaiTri).Select(l => l.Muc);
}

public static class LoaiMuc
{
    public const string Hoc = "hoc";
    public const string GiaiTri = "giai_tri";
    public const string Chan = "chan";
}

public static class Muc
{
    /// <summary>Định danh app = tên tệp .exe chữ thường (cùng cách máy chủ chuanMuc).</summary>
    public static string Norm(string? s)
    {
        var t = (s ?? "").Trim().ToLowerInvariant();
        var i = t.LastIndexOfAny(new[] { '\\', '/' });
        if (i >= 0 && t.EndsWith(".exe")) t = t[(i + 1)..];
        return t.Length > 200 ? t[..200] : t;
    }
}

/// <summary>Đổi Policy AiiGrow sang Policy nội bộ của lớp thực thi chép từ AiiControl.</summary>
public static class GrowPolicyMapper
{
    /// <summary>App luôn được mở (khay, khung Kid của AiiGrow).</summary>
    public static readonly string[] OwnApps = { "aiigrow.tray.exe", "aiigrow.kid.exe", "aiigrow.setup.exe" };

    /// <param name="phienMuc">Mục Fun list đang có phiên chơi trên máy này (null = không).</param>
    /// <param name="conPhut">Phút còn lại của phiên (hiện ở khay).</param>
    public static Policy ToPolicy(DevicePolicy d, string? phienMuc, double? conPhut, bool funKhoa)
    {
        var allowed = new List<string>(OwnApps);
        allowed.AddRange(d.AllowlistHeThong.Where(a => a.EndsWith(".exe")));
        allowed.AddRange(d.Luat.Where(l => l.Loai == LoaiMuc.Hoc).Select(l => l.Muc));
        if (phienMuc != null && !funKhoa && d.LaFun(phienMuc)) allowed.Add(Muc.Norm(phienMuc));
        return new Policy
        {
            ServerTime = d.ServerTime,
            ChildName = d.Con?.Ten ?? "",
            // AiiGrow luôn là «chỉ app được phép»: chưa phân loại ⇒ chặn, gợi ý Xin phép Ba Mẹ (luat-app.ts). Không khoá cả máy.
            Mode = Modes.Hoc,
            Locked = false,
            AllowedApps = allowed,
            LearningApps = d.Luat.Where(l => l.Loai == LoaiMuc.Hoc).Select(l => l.Muc).Concat(d.AllowlistHeThong).ToList(),
            MinutesLeft = phienMuc != null && conPhut.HasValue ? (int)Math.Ceiling(Math.Max(0, conPhut.Value)) : null,
            NextCheckSec = d.Phien != null || phienMuc != null ? 60 : d.NextCheckSec,
            CanExchangePoints = d.FunList.Any(),
        };
    }

    /// <summary>Danh sách cho AppLocker: mọi app được phép + cả Fun list (để mở được khi có phiên; ngoài phiên lớp dự phòng đóng app).</summary>
    public static List<string> AppLockerApps(DevicePolicy d)
        => OwnApps.Concat(d.AllowlistHeThong.Where(a => a.EndsWith(".exe")))
            .Concat(d.Luat.Where(l => l.Loai is LoaiMuc.Hoc or LoaiMuc.GiaiTri).Select(l => l.Muc)).Distinct().ToList();
}

/// <summary>Đổi phút đếm theo lượt (UsageTracker chép từ AiiControl) sang TỔNG theo ngày mà máy chủ AiiGrow cần (greatest).</summary>
public static class UsageTotals
{
    public static void Merge(Dictionary<string, int> totals, IEnumerable<UsageEntry> drained)
    {
        foreach (var e in drained)
        {
            var k = e.Day + "|" + Muc.Norm(e.AppId);
            totals[k] = (totals.TryGetValue(k, out var v) ? v : 0) + e.Minutes;
        }
    }

    public static List<GrowUsage> Export(Dictionary<string, int> totals)
        => totals.Select(kv => (P: kv.Key.Split('|', 2), kv.Value)).Where(x => x.P.Length == 2 && x.Value > 0)
            .Select(x => new GrowUsage(x.P[1], x.Value, x.P[0])).OrderBy(u => u.Day).ThenBy(u => u.Muc).ToList();

    /// <summary>Giữ 3 ngày gần nhất (máy chủ đã nhận các ngày cũ hơn).</summary>
    public static void Prune(Dictionary<string, int> totals, string today)
    {
        var min = DateTime.ParseExact(today, "yyyy-MM-dd", null).AddDays(-2).ToString("yyyy-MM-dd");
        foreach (var k in totals.Keys.Where(k => string.CompareOrdinal(k.Split('|')[0], min) < 0).ToList()) totals.Remove(k);
    }
}
