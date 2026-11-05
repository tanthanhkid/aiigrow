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
    public List<LoiXinCho> Items { get; set; } = new();

    public void Them(LoiXinCho x)
    {
        Items.RemoveAll(c => c.Loai == x.Loai && string.Equals(c.Muc ?? "", x.Muc ?? "", StringComparison.OrdinalIgnoreCase));
        Items.Add(x);
        while (Items.Count > ToiDa) Items.RemoveAt(0);
    }

    /// <summary>Gửi lần lượt; trả mã các lời xin đã xử lý xong (đã gửi hoặc bỏ) để gỡ khỏi bản lưu.</summary>
    public async Task<List<string>> GuiAsync(Func<LoiXinCho, Task<KetQuaGuiXin>> gui)
    {
        var xong = new List<string>();
        foreach (var x in Items.ToList())
        {
            var kq = await gui(x);
            if (kq == KetQuaGuiXin.LoiMang) break;
            xong.Add(x.Ma);
        }
        Items.RemoveAll(x => xong.Contains(x.Ma));
        return xong;
    }

    /// <summary>Phân loại lỗi khi gửi: lỗi mạng / máy chủ 5xx ⇒ giữ lại; còn lại (4xx) ⇒ bỏ.</summary>
    public static KetQuaGuiXin PhanLoai(Exception e) => e is ApiException { IsNetwork: false } ? KetQuaGuiXin.Bo : KetQuaGuiXin.LoiMang;
}
