namespace AiiGrow.Core;

/// <summary>Một lời xin Con gửi lúc MẤT MẠNG (L11: «có mạng là AiiGrow tự gửi Ba Mẹ») — lưu trong config (DPAPI) để dịch vụ khởi động lại vẫn còn.</summary>
public sealed class LoiXinCho
{
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    /// <summary><see cref="LoaiXin.XinDuyet"/> (app / web lạ) | <see cref="LoaiXin.ThemGio"/> | <see cref="LoaiXin.NgoaiLe"/>.</summary>
    public string Loai { get; set; } = LoaiXin.ThemGio;
    /// <summary>App (.exe) / trang web (xin duyệt); app hoặc «ca_may» (ngoại lệ); app đang dùng (thêm giờ, có thể trống).</summary>
    public string? Muc { get; set; }
    public string? Ten { get; set; }
    public int Phut { get; set; }
    public string? LyDo { get; set; }
    public DateTimeOffset Luc { get; set; }
    /// <summary>Số lần gửi lỗi đường truyền khi đã có mạng (hết giờ chờ — máy chủ có thể đã nhận) ⇒ quá <see cref="HangXinCho.ThuToiDa"/> thì bỏ, không tạo lời xin trùng mãi.</summary>
    public int LanLoi { get; set; }
}

/// <summary>Kết quả gửi một lời xin chờ mạng.</summary>
public enum KetQuaGuiXin { DaGui, LoiMang, Bo }

/// <summary>
/// Hàng lời xin chờ có mạng. Thêm: trùng loại + mục ⇒ thay bản cũ (Con bấm lại không thành hai lời xin), tối đa <see cref="ToiDa"/>.
/// Gửi: theo thứ tự; lỗi mạng ⇒ dừng, giữ phần còn lại; máy chủ từ chối (4xx: quá nhiều lời xin, web cấm…) ⇒ bỏ lời xin đó (gửi lại cũng không được).
/// Lớp THUẦN (gửi qua delegate) để test.
/// </summary>
public sealed class HangXinCho
{
    public const int ToiDa = 20;
    public const int ThuToiDa = 3;
    /// <summary>Lời xin cũ hơn chừng này (mất mạng lâu) không gửi nữa — «thêm 20 phút» của 3 ngày trước không còn ý nghĩa với Ba Mẹ.</summary>
    public static readonly TimeSpan HetHan = TimeSpan.FromHours(12);
    public List<LoiXinCho> Items { get; set; } = new();

    public void Them(LoiXinCho x)
    {
        Items.RemoveAll(c => c.Loai == x.Loai && string.Equals(c.Muc ?? "", x.Muc ?? "", StringComparison.OrdinalIgnoreCase));
        Items.Add(x);
        while (Items.Count > ToiDa) Items.RemoveAt(0);
    }

    /// <summary>Gửi lần lượt; trả mã các lời xin đã xử lý xong (đã gửi, bỏ, quá hạn, lỗi quá <see cref="ThuToiDa"/> lần) để gỡ khỏi bản lưu;
    /// LoiThem = mã lời xin vừa lỗi đường truyền (bản lưu tăng <see cref="LoiXinCho.LanLoi"/>).</summary>
    public async Task<(List<string> Xong, string? LoiThem)> GuiAsync(Func<LoiXinCho, Task<KetQuaGuiXin>> gui, DateTimeOffset now)
    {
        var xong = new List<string>();
        string? loi = null;
        foreach (var x in Items.ToList())
        {
            if (x.Luc > now) x.Luc = now;   // đồng hồ máy bị lùi ⇒ tính từ bây giờ, không giữ mãi
            if (now - x.Luc > HetHan) { xong.Add(x.Ma); continue; }
            var kq = await gui(x);
            if (kq == KetQuaGuiXin.LoiMang)
            {
                x.LanLoi++;
                if (x.LanLoi >= ThuToiDa) { xong.Add(x.Ma); continue; }
                loi = x.Ma;
                break;
            }
            xong.Add(x.Ma);
        }
        Items.RemoveAll(x => xong.Contains(x.Ma));
        return (xong, loi);
    }

    /// <summary>Phân loại lỗi khi gửi: lỗi mạng / máy chủ 5xx ⇒ giữ lại; còn lại (4xx) ⇒ bỏ.</summary>
    public static KetQuaGuiXin PhanLoai(Exception e) => e switch
    {
        ApiException a => a.LaLoiDuongTruyen ? KetQuaGuiXin.LoiMang : KetQuaGuiXin.Bo,
        HttpRequestException or TimeoutException or TaskCanceledException or IOException => KetQuaGuiXin.LoiMang,
        _ => KetQuaGuiXin.Bo,
    };
}
