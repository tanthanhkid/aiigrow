using System.Diagnostics;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// Phần riêng AiiGrow: phiên chơi bằng điểm. Máy chủ là sổ sách (nhịp «đang chơi» mỗi phút); agent đếm cục bộ để cảnh báo 5'/1' và
// để chạy tiếp khi mất mạng — khi đó chỉ được dùng tối đa số điểm đã đồng bộ (BRD 6.7), rồi gửi bù (phien/bu) khi có mạng lại.

/// <summary>Đồng hồ đơn điệu (Con không đổi được) + giờ hệ thống (Con đổi được). Tách ra để test.</summary>
public interface IClock
{
    DateTimeOffset SystemUtc { get; }
    TimeSpan Mono { get; }
}

public sealed class SystemClock : IClock
{
    private readonly Stopwatch _sw = Stopwatch.StartNew();
    public DateTimeOffset SystemUtc => DateTimeOffset.UtcNow;
    public TimeSpan Mono => _sw.Elapsed;
}

/// <summary>Giờ tin được = serverTime lần đồng bộ cuối + thời gian đơn điệu đã trôi. Chưa đồng bộ ⇒ giờ hệ thống.</summary>
public sealed class TrustedClock
{
    private readonly IClock _c;
    private DateTimeOffset? _server;
    private TimeSpan _at;
    public TrustedClock(IClock c) { _c = c; }
    public void Anchor(DateTimeOffset serverTime) { _server = serverTime; _at = _c.Mono; }
    public bool Anchored => _server.HasValue;
    public DateTimeOffset Now => _server.HasValue ? _server.Value + (_c.Mono - _at) : _c.SystemUtc;
    /// <summary>Giờ hệ thống − giờ tin được (giây).</summary>
    public double SkewSeconds => (_c.SystemUtc - Now).TotalSeconds;
}

public static class Lich
{
    public static int Phut(string hhmm) { var p = hhmm.Split(':'); return int.Parse(p[0]) * 60 + int.Parse(p[1]); }

    /// <summary>Khung [tu, den), qua nửa đêm vẫn đúng — giống server/lib/gio.ts trongKhung.</summary>
    public static bool TrongKhung(int phut, Khung k)
    {
        int a = Phut(k.Tu), b = Phut(k.Den);
        return a <= b ? phut >= a && phut < b : phut >= a || phut < b;
    }

    public static TimeZoneInfo Tz(string? id)
    {
        if (!string.IsNullOrWhiteSpace(id))
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { }
            if (TimeZoneInfo.TryConvertIanaIdToWindowsId(id, out var w)) { try { return TimeZoneInfo.FindSystemTimeZoneById(w); } catch { } }
        }
        return TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
    }

    public static DateTime Local(DateTimeOffset utc, string? tz) => TimeZoneInfo.ConvertTime(utc, Tz(tz)).DateTime;

    /// <summary>null = trong giờ chơi; "gio_ngu" | "ngoai_khung".</summary>
    public static string? LyDo(LichChoi l, DateTimeOffset utc, string? tz)
    {
        var t = Local(utc, tz);
        int phut = t.Hour * 60 + t.Minute;
        try
        {
            if (l.Ngu != null && TrongKhung(phut, l.Ngu)) return "gio_ngu";
            var ds = t.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? l.CuoiTuan : l.NgayThuong;
            return ds.Any(k => TrongKhung(phut, k)) ? null : "ngoai_khung";
        }
        catch (FormatException) { return null; }
    }
}

public sealed class XetPhien
{
    public bool Duoc { get; set; }
    public string? LyDo { get; set; }
    public string? Cau { get; set; }
    public int PhutToiDa { get; set; }
    public int GiaPhanNghin { get; set; }
    public int SoDu { get; set; }
    public string? NghiDen { get; set; }
    [JsonIgnore] public bool Offline { get; set; }
}

public sealed class KetNhip
{
    public string TrangThai { get; set; } = "";
    public double PhutDung { get; set; }
    public int ConPhut { get; set; }
    public int DiemTru { get; set; }
    public int SoDu { get; set; }
    public int? CanhBao { get; set; }
    public string? LyDoKet { get; set; }
    public string? NghiDen { get; set; }
}

/// <summary>Phiên chơi trên máy này. <see cref="Id"/> null = mở khi mất mạng (máy chủ chưa biết, sẽ ghi khi gửi bù).</summary>
public sealed class PlaySession
{
    public string? Id { get; set; }
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    public string Muc { get; set; } = "";
    public int GiaPhanNghin { get; set; } = 1000;
    public double ConGiay { get; set; }
    /// <summary>Giây chơi chưa được máy chủ ghi sổ (lúc mất mạng) — gửi bằng phien/bu.</summary>
    public double OfflineGiay { get; set; }
    public double IdleGiay { get; set; }
    public DateTimeOffset BatDau { get; set; }
    public bool Warn5 { get; set; }
    public bool Warn1 { get; set; }

    /// <summary>Đếm <paramref name="dt"/> giây. → cảnh báo 5 / 1 (mỗi mốc một lần) hoặc null.</summary>
    public int? Tick(double dt, bool dangDung, bool offline)
    {
        if (dt <= 0) return null;
        if (!dangDung) { IdleGiay += dt; return null; }
        IdleGiay = 0;
        ConGiay = Math.Max(0, ConGiay - dt);
        if (offline) OfflineGiay += dt;
        if (ConGiay <= 60 && ConGiay > 0 && !Warn1) { Warn1 = Warn5 = true; return 1; }
        if (ConGiay <= 300 && ConGiay > 60 && !Warn5) { Warn5 = true; return 5; }
        return null;
    }

    /// <summary>Máy chủ trả nhịp: tin số phút còn lại của máy chủ khi ít hơn bản đếm cục bộ.</summary>
    public void Apply(KetNhip k)
    {
        ConGiay = Math.Min(ConGiay, Math.Max(0, k.ConPhut) * 60.0);
        OfflineGiay = 0;
    }

    public BuBody ToBu(bool ketThuc) => new()
    {
        Ma = Guid.NewGuid().ToString("N"), Id = Id, Muc = Muc, Phut = Math.Round(OfflineGiay / 60.0, 1), BatDau = BatDau, KetThuc = ketThuc,
    };
}

public static class PlayRules
{
    /// <summary>Lý do Fun list đang bị khoá (không mở phiên, đóng phiên đang chạy), null = được chơi.</summary>
    public static string? FunKhoa(DevicePolicy d, DateTimeOffset trustedNow, bool gioMaySai)
    {
        if (d.KhoaNgay) return "ba_me_khoa";
        if (gioMaySai) return "gio_may_sai";
        return Lich.LyDo(d.Lich, trustedNow, d.Tz);
    }

    /// <summary>Lệch giờ: online tin máy chủ; offline tự so giờ hệ thống với giờ tin được.</summary>
    public static bool GioMaySai(DevicePolicy d, TrustedClock c, bool offline)
        => d.GioMaySai || (offline && c.Anchored && Math.Abs(c.SkewSeconds) > d.LechGioPhut * 60);

    /// <summary>Xét «Dùng điểm để chơi?» khi mất mạng: chỉ dùng tối đa số điểm đã đồng bộ, trừ phần đã dùng offline.</summary>
    public static XetPhien XetOffline(DevicePolicy d, string muc, double offlinePhanNghin, DateTimeOffset trustedNow, bool gioMaySai)
    {
        var l = d.LuatCua(muc);
        if (l == null || l.Loai != LoaiMuc.GiaiTri) return new() { Duoc = false, LyDo = l?.Loai == LoaiMuc.Chan ? "bi_chan" : "chua_phan_loai", Offline = true };
        var khoa = FunKhoa(d, trustedNow, gioMaySai);
        if (khoa != null) return new() { Duoc = false, LyDo = khoa, Offline = true };
        int gia = Math.Max(0, l.GiaPhanNghin ?? 1000);
        double con = d.SoDu * 1000.0 - offlinePhanNghin;
        int phut = gia == 0 ? d.PhienToiDa : (int)Math.Floor(con / gia);
        phut = Math.Min(phut, d.PhienToiDa);
        if (phut < 1) return new() { Duoc = false, LyDo = "het_diem", SoDu = (int)Math.Max(0, Math.Floor(con / 1000)), Offline = true };
        return new() { Duoc = true, PhutToiDa = phut, GiaPhanNghin = gia, SoDu = (int)Math.Floor(con / 1000), Offline = true };
    }
}

/// <summary>Địa chỉ khung Kid (WebView2) — màn Con web. Mặc định <c>{server}/app/tre</c>, phiên Con qua <c>?phien=</c> (từ phien-web).</summary>
public static class KidUrl
{
    public static string Base(string server, string? kidUrl)
        => string.IsNullOrWhiteSpace(kidUrl) ? ApiClient.NormalizeServer(server) + "/app/tre" : kidUrl.Trim().TrimEnd('/');

    public static string Build(string server, string? kidUrl, string man, string phien, IDictionary<string, string?>? q = null)
    {
        var b = Base(server, kidUrl);
        var path = string.IsNullOrWhiteSpace(man) ? "" : "/" + Uri.EscapeDataString(man.Trim('/')).Replace("%2F", "/");
        var parts = new List<string> { "phien=" + Uri.EscapeDataString(phien) };
        if (q != null) foreach (var kv in q) if (!string.IsNullOrEmpty(kv.Value)) parts.Add(Uri.EscapeDataString(kv.Key) + "=" + Uri.EscapeDataString(kv.Value!));
        return b + path + "?" + string.Join("&", parts);
    }
}
