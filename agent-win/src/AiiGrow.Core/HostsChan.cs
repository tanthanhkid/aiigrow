namespace AiiGrow.Core;

/// <summary>Nghi 11/11: Con ở «Mở hết» mà máy vẫn báo «Không thể truy cập trang web này» với YouTube / TikTok / Roblox — tệp hosts
/// (C:\Windows\System32\drivers\etc\hosts) có dòng chặn kiểu <c>0.0.0.0 youtube.com</c> / <c>:: youtube.com</c> do phần mềm khác đặt
/// (AiiGrow Windows KHÔNG ghi hosts). «Mở hết» = không chặn gì ngoài web luôn chặn ⇒ <see cref="Loc"/> bỏ đúng các dòng chặn đó.
/// CHỈ bỏ dòng trỏ về địa chỉ «không đi đâu» (0.0.0.0, ::) — giữ nguyên 127.0.0.1 / ::1 (localhost, tên miền dev), dòng Tailscale
/// (100.x … *.ts.net), dòng trỏ IP thật, chú thích, dòng trống. Lớp THUẦN (chuỗi vào → chuỗi ra) — HostsWorker lo đọc / ghi tệp.</summary>
public static class HostsChan
{
    /// <summary>Kết quả lọc: nội dung mới (giữ nguyên xuống dòng của các dòng còn lại), số dòng đã bỏ, tên miền đã bỏ (chữ thường, không lặp).</summary>
    public sealed record KetQua(string NoiDungMoi, int SoDong, IReadOnlyList<string> TenMien);

    /// <summary>Địa chỉ «chặn» — trỏ tên miền về đây thì trình duyệt báo không truy cập được.</summary>
    private static readonly HashSet<string> IpChan = new(StringComparer.OrdinalIgnoreCase) { "0.0.0.0", "::", "0:0:0:0:0:0:0:0" };

    public static KetQua Loc(string noiDung)
    {
        var giu = new List<string>();
        var ten = new List<string>();
        var so = 0;
        foreach (var dong in noiDung.Split('\n'))
        {
            if (!LaDongChan(dong.TrimEnd('\r'), out var ds)) { giu.Add(dong); continue; }
            so++;
            foreach (var t in ds) if (!ten.Contains(t)) ten.Add(t);
        }
        return new KetQua(so == 0 ? noiDung : string.Join('\n', giu), so, ten);
    }

    /// <summary>Dòng <c>0.0.0.0 a.com b.com # chú thích</c> ⇒ true + [a.com, b.com]. Dòng có localhost (vd «0.0.0.0 localhost») ⇒ giữ.</summary>
    public static bool LaDongChan(string dong, out string[] tenMien)
    {
        tenMien = Array.Empty<string>();
        var h = dong.IndexOf('#');
        var phan = (h >= 0 ? dong[..h] : dong).Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        if (phan.Length < 2 || !IpChan.Contains(phan[0])) return false;
        var ds = phan.Skip(1).Select(x => x.TrimEnd('.').ToLowerInvariant()).ToArray();
        if (ds.Any(x => x is "localhost" or "" || x.EndsWith(".localhost", StringComparison.Ordinal))) return false;
        tenMien = ds;
        return true;
    }
}
