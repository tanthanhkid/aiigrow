namespace AiiGrow.Core;

/// <summary>Một lời xin Con gửi lúc MẤT MẠNG (L11: «có mạng là AiiGrow tự gửi Ba Mẹ») — lưu trong config (DPAPI) để dịch vụ khởi động lại vẫn còn.</summary>
public sealed class LoiXinCho
{
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    /// <summary><see cref="LoaiXin.XinDuyet"/> (app / web ngoài danh sách) | <see cref="LoaiXin.VaySao"/> (số sao ở <see cref="Phut"/>).
    /// Lời xin loại cũ còn trong cấu hình (them_gio / ngoai_le của bản trước 15/11) ⇒ dịch vụ bỏ, không gửi.</summary>
    public string Loai { get; set; } = LoaiXin.VaySao;
    /// <summary>App (.exe) / trang web (xin duyệt); trống (vay sao).</summary>
    public string? Muc { get; set; }
    public string? Ten { get; set; }
    public int Phut { get; set; }
    public string? LyDo { get; set; }
    /// <summary>#422: lời xin duyệt từ hộp «Xin thêm app / web» — «app» | «web» (null = lời xin cũ / màn chặn tự gửi ⇒ máy chủ tự đoán).</summary>
    public string? Kieu { get; set; }
    public DateTimeOffset Luc { get; set; }
    /// <summary>Số lần gửi lỗi đường truyền khi đã có mạng (hết giờ chờ — máy chủ có thể đã nhận) ⇒ quá <see cref="HangXinCho.ThuToiDa"/> thì bỏ, không tạo lời xin trùng mãi.</summary>
    public int LanLoi { get; set; }
    /// <summary>#684: bé đang dùng máy lúc xin (máy dùng chung) — lời xin bị bỏ chỉ báo đúng bé này. null = không rõ (lời xin cũ / máy không đăng nhập theo bé).</summary>
    public string? BeId { get; set; }
}

/// <summary>Kết quả gửi một lời xin chờ mạng. <see cref="TamHoan"/> (#684): máy chủ bảo «chậm lại» (408 / 429 bam_don) — chắc chắn CHƯA nhận,
/// giữ nguyên lời xin (không tính lần lỗi), dừng lượt này, gửi tiếp lượt đồng bộ sau.</summary>
public enum KetQuaGuiXin { DaGui, LoiMang, Bo, TamHoan }

/// <summary>
/// Hàng lời xin chờ có mạng. Thêm: trùng loại + mục ⇒ thay bản cũ (Con bấm lại không thành hai lời xin), tối đa <see cref="ToiDa"/>.
/// Gửi: theo thứ tự; lỗi mạng ⇒ dừng, giữ phần còn lại; 408 / 429 ⇒ dừng, giữ nguyên; máy chủ từ chối (4xx khác: web cấm…) ⇒ bỏ lời xin đó
/// (gửi lại cũng không được). #684: mọi lời xin bị bỏ khi chưa tới Ba Mẹ (từ chối, quá hạn, lỗi quá số lần) nằm trong <see cref="BiBo"/> để báo Con.
/// Lớp THUẦN (gửi qua delegate) để test.
/// </summary>
public sealed class HangXinCho
{
    public const int ToiDa = 20;
    public const int ThuToiDa = 3;
    /// <summary>Lời xin cũ hơn chừng này (mất mạng lâu) không gửi nữa — «xin vay 15 sao» của 3 ngày trước không còn ý nghĩa với Ba Mẹ.</summary>
    public static readonly TimeSpan HetHan = TimeSpan.FromHours(12);
    public List<LoiXinCho> Items { get; set; } = new();
    /// <summary>Lời xin bị bỏ ở lượt <see cref="GuiAsync"/> vừa chạy (không lưu) — dịch vụ chép sang <see cref="XinBoDs"/> để khay báo Con.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public List<LoiXinCho> BiBo { get; } = new();

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
        BiBo.Clear();
        foreach (var x in Items.ToList())
        {
            if (x.Luc > now) x.Luc = now;   // đồng hồ máy bị lùi ⇒ tính từ bây giờ, không giữ mãi
            if (now - x.Luc > HetHan) { xong.Add(x.Ma); BaoBo(x); continue; }
            var kq = await gui(x);
            if (kq == KetQuaGuiXin.TamHoan) break;
            if (kq == KetQuaGuiXin.LoiMang)
            {
                x.LanLoi++;
                if (x.LanLoi >= ThuToiDa) { xong.Add(x.Ma); BaoBo(x); continue; }
                loi = x.Ma;
                break;
            }
            xong.Add(x.Ma);
            if (kq == KetQuaGuiXin.Bo) BaoBo(x);
        }
        Items.RemoveAll(x => xong.Contains(x.Ma));
        return (xong, loi);
    }

    /// <summary>Chỉ lời xin Con còn xin được (vay sao / xin duyệt) mới báo; loại cũ (them_gio / ngoai_le, bỏ từ 15/11) bỏ im lặng.</summary>
    private void BaoBo(LoiXinCho x)
    {
        if (x.Loai == LoaiXin.VaySao || x.Loai == LoaiXin.XinDuyet && !(string.IsNullOrWhiteSpace(x.Ten) && string.IsNullOrWhiteSpace(x.Muc))) BiBo.Add(x);
    }

    /// <summary>Phân loại lỗi khi gửi: lỗi mạng / máy chủ 5xx ⇒ giữ lại (tính lần); 408 / 429 ⇒ tạm hoãn (giữ, không tính lần);
    /// 401 / 403 không phải token sai (token đang xoay, tường lửa mạng khách sạn) ⇒ như lỗi mạng; còn lại (4xx, token sai) ⇒ bỏ.</summary>
    public static KetQuaGuiXin PhanLoai(Exception e) => e switch
    {
        ApiException a when a.LaLoiDuongTruyen => KetQuaGuiXin.LoiMang,
        ApiException { StatusCode: 408 } or ApiException { StatusCode: 429, Code: null or "" or "bam_don" } => KetQuaGuiXin.TamHoan,
        ApiException { StatusCode: 429 } => KetQuaGuiXin.LoiMang,   // 429 khác (khoá lâu): tính lần như lỗi mạng ⇒ quá ThuToiDa thì bỏ + báo Con, không chặn đầu hàng 12 giờ
        ApiException { LaTokenSai: true } => KetQuaGuiXin.Bo,
        ApiException { StatusCode: 401 or 403 } => KetQuaGuiXin.LoiMang,
        ApiException => KetQuaGuiXin.Bo,
        HttpRequestException or TimeoutException or TaskCanceledException or IOException => KetQuaGuiXin.LoiMang,
        _ => KetQuaGuiXin.Bo,
    };
}

/// <summary>#684: lời xin chờ mạng đã bị bỏ mà chưa tới Ba Mẹ — lưu trong config để khay (kể cả khay khởi động lại) báo Con «con xin lại nhé».
/// Giữ tối đa <see cref="ToiDa"/> mục, mỗi mục <see cref="Han"/>.</summary>
public sealed class XinBoDs
{
    public const int ToiDa = 10;
    public static readonly TimeSpan Han = TimeSpan.FromHours(24);
    public List<LoiXinCho> Items { get; set; } = new();

    /// <summary>Thêm các lời xin vừa bị bỏ (Luc đổi thành lúc bỏ — tính hạn báo), dọn mục quá hạn.</summary>
    public void Them(IEnumerable<LoiXinCho> ds, DateTimeOffset now)
    {
        foreach (var x in ds)
            if (Items.All(i => i.Ma != x.Ma))
                Items.Add(new LoiXinCho { Ma = x.Ma, Loai = x.Loai, Muc = x.Muc, Ten = x.Ten, Phut = x.Phut, Kieu = x.Kieu, BeId = x.BeId, Luc = now });
        Items.RemoveAll(i => now - i.Luc > Han || i.Luc > now + Han);
        while (Items.Count > ToiDa) Items.RemoveAt(0);
    }

    public List<LoiXinCho> ConHan(DateTimeOffset now) => Items.Where(i => now - i.Luc <= Han).ToList();
}

/// <summary>Chữ khay báo Con khi lời xin lưu lúc mất mạng không tới được Ba Mẹ (#684).</summary>
public static class XinBoView
{
    public const string Tieu = "Lời xin chưa tới Ba Mẹ";

    public static string Cau(LoiXinCho x) => x.Loai == LoaiXin.VaySao
        ? $"Lời xin vay {x.Phut} sao lúc mất mạng chưa gửi được tới Ba Mẹ. Con xin lại nhé."
        : $"Lời xin mở «{(string.IsNullOrWhiteSpace(x.Ten) ? x.Muc : x.Ten)}» lúc mất mạng chưa gửi được tới Ba Mẹ. Con xin lại nhé.";
}
