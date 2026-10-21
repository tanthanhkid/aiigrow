namespace AiiGrow.Core;

/// <summary>Chữ hiển thị trên tray (tách khỏi WinForms để test được).</summary>
public static class TrayView
{
    public static string ModeLabel(string? mode) => mode switch
    {
        Modes.Hoc => "Chỉ app học",
        Modes.Khoa => "Đang khoá",
        _ => "Tự do",
    };

    public static string LockTitle(string? reason) => reason switch
    {
        LockReasons.HetGio => "Hết giờ dùng máy hôm nay",
        LockReasons.Ngu => "Đến giờ nghỉ rồi",
        _ => "Máy đang được Ba Mẹ khoá",
    };

    public static string LockHint(string? reason) => reason switch
    {
        LockReasons.HetGio => "Lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian.",
        LockReasons.Ngu => "Máy sẽ mở lại khi hết giờ nghỉ. Cần gấp thì xin Ba Mẹ.",
        _ => "Con có thể nhắn xin Ba Mẹ mở máy.",
    };

    public static string FormatClock(double seconds)
    {
        var s = (int)Math.Max(0, Math.Ceiling(seconds));
        int h = s / 3600, m = s % 3600 / 60, sec = s % 60;
        return h > 0 ? $"{h}:{m:00}:{sec:00}" : $"{m}:{sec:00}";
    }

    /// <summary>Số lớn + dòng chú thích + số giây còn lại (null nếu không giới hạn).</summary>
    public static (string Big, string Caption, double? RemainingSec) Describe(TrayState s, DateTimeOffset receivedAt, DateTimeOffset now)
    {
        if (s.GrantEndsAt.HasValue && s.GrantEndsAt.Value > now)
        {
            var rem = (s.GrantEndsAt.Value - now).TotalSeconds;
            return (FormatClock(rem), "đang được Ba Mẹ thêm giờ", rem);
        }
        if (s.MinutesLeft.HasValue)
        {
            var rem = Math.Max(0, s.MinutesLeft.Value * 60.0 - (now - receivedAt).TotalSeconds);
            return (FormatClock(rem), "còn hôm nay", rem);
        }
        return ("Không giới hạn", "", null);
    }

    public static string Tooltip(TrayState s, DateTimeOffset receivedAt, DateTimeOffset now)
    {
        if (s.Locked) return "AiiGrow đang bật · máy đang khoá";
        var d = Describe(s, receivedAt, now);
        var text = d.RemainingSec.HasValue
            ? "AiiGrow đang bật · còn " + (int)Math.Ceiling(d.RemainingSec.Value / 60.0) + " phút"
            : "AiiGrow đang bật · không giới hạn giờ";
        return text.Length > 120 ? text[..120] : text;
    }

    public static string FriendlyAppName(string? appId, string? appName)
    {
        if (!string.IsNullOrWhiteSpace(appName)) return appName!;
        var n = (appId ?? "").Trim();
        if (n.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) n = n[..^4];
        if (n.Length == 0) return "App này";
        return char.ToUpperInvariant(n[0]) + n[1..];
    }
}

/// <summary>Chữ riêng AiiGrow trên khay / màn chặn (tách khỏi WinForms để test).</summary>
public static class GrowText
{
    public static string FunKhoa(string? lyDo) => lyDo switch
    {
        "ba_me_khoa" => "Ba Mẹ đang tạm khoá giờ chơi",
        "gio_may_sai" => "Giờ máy không đúng, hãy nhờ Ba Mẹ chỉnh lại",
        "gio_ngu" => "Đến giờ ngủ rồi — mai chơi tiếp nhé",
        "ngoai_khung" => "Bây giờ chưa phải giờ chơi",
        _ => "",
    };

    /// <summary>Dòng tiêu đề màn chặn.</summary>
    public static string BlockTitle(string name, bool fun) => fun ? name + " cần dùng điểm để chơi" : name + " chưa được Ba Mẹ cho phép";

    public static string BlockHint(bool fun, string? funKhoa) =>
        fun && string.IsNullOrEmpty(funKhoa) ? "Con có thể dùng điểm để chơi, hoặc xin phép Ba Mẹ." :
        fun ? FunKhoa(funKhoa) + ". Con có thể xin phép Ba Mẹ." :
        "Con có thể xin phép Ba Mẹ mở ứng dụng này.";

    /// <summary>Câu xác nhận trước khi trừ điểm: giá + số phút tối đa.</summary>
    public static string XacNhan(string name, XetPhien x)
    {
        var gia = x.GiaPhanNghin / 1000.0;
        var giaChu = gia == Math.Floor(gia) ? ((int)gia).ToString() : gia.ToString("0.#", System.Globalization.CultureInfo.GetCultureInfo("vi-VN"));
        return $"{name}: {giaChu} điểm/phút. Con có {x.SoDu} điểm, chơi được tối đa {x.PhutToiDa} phút." +
               (x.Offline ? " (Đang không có mạng — chỉ dùng số điểm đã đồng bộ.)" : "");
    }

    public static string Ended(string? lyDo) => lyDo switch
    {
        "het_diem" => "Hết điểm rồi — làm nhiệm vụ để có thêm điểm nhé",
        "het_thoi_gian" => "Hết phiên chơi rồi. Nghỉ chút nhé!",
        "con_dung" => "Con đã dừng sớm, điểm còn lại vẫn giữ nguyên",
        "khong_hoat_dong" => "Phiên chơi tự đóng vì con không chơi nữa",
        "gio_ngu" => "Đến giờ ngủ rồi — phiên chơi đã đóng",
        "het_khung" or "ngoai_khung" => "Hết khung giờ chơi — phiên đã đóng",
        "ba_me_khoa" => "Ba Mẹ vừa tạm khoá giờ chơi",
        "gio_may_sai" => "Giờ máy không đúng — phiên đã đóng",
        _ => "Phiên chơi đã kết thúc",
    };
}
