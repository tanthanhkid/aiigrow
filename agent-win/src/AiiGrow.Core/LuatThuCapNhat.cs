using System.Globalization;

namespace AiiGrow.Core;

/// <summary>Một lần giao bộ cài tự cập nhật (ProgramData\AiiGrow\cap-nhat\da-thu.txt): bản, lúc giao, số lần đã thử bản này, có bị chặn cứng
/// 24 giờ không (bộ cài sai chữ ký). Dạng tệp «ban|luc|soLan|chan»; tệp cũ «ban|luc» đọc thành một lần, không chặn cứng.</summary>
public sealed record LanThuCapNhat(string Ban, DateTimeOffset Luc, int SoLan, bool ChanCung)
{
    public string Ghi() => $"{Ban}|{Luc.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture)}|{SoLan}|{(ChanCung ? 1 : 0)}";

    public static LanThuCapNhat? Doc(string? s)
    {
        var d = (s ?? "").Trim().Split('|');
        if (d.Length < 2 || d[0].Length == 0 || !DateTimeOffset.TryParse(d[1], CultureInfo.InvariantCulture, DateTimeStyles.None, out var luc)) return null;
        var soLan = d.Length > 2 && int.TryParse(d[2], out var n) && n > 0 ? n : 1;
        return new LanThuCapNhat(d[0], luc, soLan, d.Length > 3 && d[3] == "1");
    }
}

/// <summary>#683: luật thử lại tự cập nhật Windows. Trước đây ghi «đã thử» rồi chặn 24 giờ mọi lượt (kể cả «Cập nhật ngay») — một lỗi thoáng qua
/// (Task Scheduler bận, phần mềm diệt virus giữ tệp ⇒ bộ cài khôi phục bản cũ) làm máy kẹt bản cũ cả ngày mà không ai biết. Nay: nghỉ tăng dần
/// 1 giờ → 4 giờ → 24 giờ theo số lần đã thử cùng bản; «Cập nhật ngay» chỉ chờ bộ cài lượt trước chạy xong (ChoBoCai); chỉ bộ cài sai chữ ký mới
/// chặn cứng 24 giờ. Lần thử trước được coi là HỎNG khi máy vẫn ở bản cũ mà bộ cài đã chạy xong (quá ChoBoCai, hoặc dịch vụ đã khởi động lại
/// sau lúc giao — bộ cài dừng dịch vụ rồi khôi phục).</summary>
public static class LuatThuCapNhat
{
    /// <summary>Trần thời gian tác vụ bộ cài (ExecutionTimeLimit 30 phút) — trong khoảng này lần thử trước có thể còn đang chạy.</summary>
    public static readonly TimeSpan ChoBoCai = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan ChanCung = TimeSpan.FromHours(24);

    public static TimeSpan Nghi(int soLan) => soLan <= 1 ? TimeSpan.FromHours(1) : soLan == 2 ? TimeSpan.FromHours(4) : TimeSpan.FromHours(24);

    /// <summary>Bản <paramref name="ban"/> đang trong thời gian nghỉ ⇒ không giao bộ cài lượt này. Đồng hồ bị lùi (tuổi âm) ⇒ coi như chưa thử.</summary>
    public static bool DangNghi(LanThuCapNhat? t, string ban, DateTimeOffset now, bool epHoi = false)
    {
        if (t == null || t.Ban != ban) return false;
        var tuoi = now - t.Luc;
        if (tuoi < TimeSpan.Zero) return false;
        if (t.ChanCung) return tuoi < ChanCung;
        return tuoi < (epHoi ? ChoBoCai : Nghi(t.SoLan));
    }

    /// <summary>Bản ghi cho lần giao mới: cùng bản ⇒ cộng số lần; bản khác ⇒ lần 1.</summary>
    public static LanThuCapNhat LanMoi(LanThuCapNhat? cu, string ban, DateTimeOffset now, bool chanCung = false)
        => new(ban, now, cu?.Ban == ban ? cu.SoLan + 1 : 1, chanCung);

    /// <summary>Lần giao trước của <paramref name="ban"/> đã chạy xong mà máy vẫn chưa lên bản đó ⇒ cập nhật hỏng (bộ cài lỗi / khôi phục bản cũ).</summary>
    public static bool LanTruocHong(LanThuCapNhat? t, string ban, Version hienTai, DateTimeOffset now, DateTimeOffset dichVuBatDau)
    {
        if (t == null || t.Ban != ban || t.ChanCung || CapNhat.DocBan(ban) is not { } b || b <= hienTai) return false;
        return now - t.Luc >= ChoBoCai || dichVuBatDau > t.Luc;
    }

    /// <summary>Sự kiện «cập nhật lỗi» gửi máy chủ (Ba Mẹ thấy cảnh báo). Mã theo bản ⇒ mỗi bản báo Ba Mẹ một lần (máy chủ bỏ mã trùng), các lần
    /// thử lại sau chỉ ghi log.</summary>
    public static SuKien SuKienLoi(string ban, Version hienTai, int soLan, string lyDo) => new()
    {
        Ma = $"cap_nhat_loi:{ban}",
        Loai = "cap_nhat_loi",
        ChiTiet = new() { ["ban"] = ban, ["dangChay"] = hienTai.ToString(3), ["lan"] = soLan.ToString(CultureInfo.InvariantCulture), ["lyDo"] = lyDo },
    };
}
