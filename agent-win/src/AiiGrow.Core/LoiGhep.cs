namespace AiiGrow.Core;

/// <summary>Bộ cài: lỗi lúc ghép / cài thuộc màn nào của thiết kế chốt 05/11 (docs/thiet-ke-chot/con-cai-win).</summary>
public enum LoaiLoiGhep
{
    /// <summary>Máy chủ: 404 ma_sai ⇒ màn «Mã chưa đúng. Xem lại 6 số nhé.»</summary>
    MaSai,
    /// <summary>Máy chủ: 410 ma_het_han, 409 ma_da_dung ⇒ màn «Mã ghép đã hết hạn».</summary>
    HetHan,
    /// <summary>Không tới được máy chủ (mất mạng / hết giờ / máy chủ 5xx) ⇒ màn «Máy chưa vào được mạng».</summary>
    MatMang,
    /// <summary>Lỗi khác (sai loại máy, không cài được dịch vụ…) ⇒ giữ màn Đang cài, hiện câu lỗi + Thử lại.</summary>
    Khac,
}

/// <summary>Phân loại lỗi ghép máy + chuẩn hoá mã 6 số (lớp THUẦN để test).</summary>
public static class LoiGhep
{
    public const int SoChuSo = 6;

    /// <param name="daGhep">Đã ghép xong (lỗi ở bước sau): mã không còn liên quan ⇒ không bao giờ là MaSai / HetHan.</param>
    public static LoaiLoiGhep Phan(Exception e, bool daGhep = false)
    {
        for (var x = e; x != null; x = x.InnerException)
        {
            if (x is ApiException a)
            {
                if (!daGhep)
                {
                    if (a.Code == "ma_sai" || (a.Code == null && a.StatusCode == 404)) return LoaiLoiGhep.MaSai;
                    if (a.Code is "ma_het_han" or "ma_da_dung" || (a.Code == null && a.StatusCode == 410)) return LoaiLoiGhep.HetHan;
                }
                return a.IsNetwork ? LoaiLoiGhep.MatMang : LoaiLoiGhep.Khac;
            }
            if (x is HttpRequestException or TaskCanceledException or TimeoutException or System.Net.Sockets.SocketException) return LoaiLoiGhep.MatMang;
        }
        return LoaiLoiGhep.Khac;
    }

    /// <summary>Chỉ giữ chữ số (Ba Mẹ đọc «482 017» có dấu cách / gạch), tối đa 6.</summary>
    public static string ChuanMa(string? s)
    {
        var so = new string((s ?? "").Where(char.IsAsciiDigit).ToArray());
        return so.Length > SoChuSo ? so[..SoChuSo] : so;
    }

    /// <summary>Câu báo khi mã chưa đủ 6 số; null = đủ.</summary>
    public static string? CauThieu(string? s)
    {
        var n = ChuanMa(s).Length;
        if (n == SoChuSo) return null;
        if (n == 0) return "Gõ 6 số trên điện thoại Ba Mẹ nhé.";
        return $"Còn thiếu {SoChuSo - n} số. Mã có đúng {SoChuSo} số.";
    }

    /// <summary>«482017» ⇒ «482 017» (như app Ba Mẹ hiện).</summary>
    public static string Hien(string? ma)
    {
        var m = ChuanMa(ma);
        return m.Length == SoChuSo ? m[..3] + " " + m[3..] : m;
    }
}
