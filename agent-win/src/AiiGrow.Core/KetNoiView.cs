namespace AiiGrow.Core;

/// <summary>Khay đang ở trạng thái kết nối nào (quyết định biểu tượng + câu hiển thị).</summary>
public enum KetNoi
{
    /// <summary>Dịch vụ chạy, máy chủ tới được.</summary>
    DaKetNoi,
    /// <summary>Khay không gọi được dịch vụ AiiGrow qua named pipe.</summary>
    DichVuKhongChay,
    /// <summary>Dịch vụ chạy nhưng không tới được máy chủ (mất mạng / máy chủ lỗi).</summary>
    MatKetNoi,
    /// <summary>Máy chưa ghép, bị gỡ khỏi gia đình hoặc máy chủ từ chối token (401).</summary>
    ChuaGhep,
}

/// <summary>Kết quả chọn trạng thái: loại, câu cho tooltip khay, câu ngắn cho thanh bên / menu, và câu hướng dẫn xử lý.</summary>
public sealed record KetNoiInfo(KetNoi Loai, string Tooltip, string Dong, string Huong)
{
    /// <summary>Biểu tượng khay «đã kết nối» (mascot màu) chỉ khi đúng là đã kết nối; còn lại dùng biểu tượng xám + chấm đỏ.</summary>
    public bool DungIconKetNoi => Loai == KetNoi.DaKetNoi;
    public bool Bao => Loai != KetNoi.DaKetNoi;
}

/// <summary>
/// Chọn trạng thái kết nối cho khay (lớp THUẦN, không WinForms, để test). Ưu tiên:
/// (a) khay không gọi được dịch vụ ⇒ DichVuKhongChay; (c) máy chưa ghép / bị gỡ / token bị từ chối ⇒ ChuaGhep;
/// (b) dịch vụ không tới máy chủ ⇒ MatKetNoi; còn lại ⇒ DaKetNoi.
/// </summary>
public static class KetNoiView
{
    /// <summary>#307 them-g4d1cfk1: dòng trạng thái đầu menu khay — «● Đã kết nối · còn 18 sao = 18 phút» (biết số sao, không «Mở hết»).</summary>
    public static string DongMenu(KetNoiInfo info, TrayState? s)
    {
        var dong = "● " + info.Dong;
        if (info.Loai == KetNoi.DaKetNoi && s is { MoHet: false, QuyConPhut: double p })
        {
            // số sao THẬT (âm khi nợ) và phút chơi được tính riêng
            var phut = SaoView.Phut(p);
            dong += s.Sao is int sao ? (sao >= 0 ? $" · còn {SaoView.SoDu(sao)} = {phut} phút" : $" · {SaoView.SoDu(sao)} · còn {phut} phút") : $" · còn {phut} phút";
        }
        return dong;
    }

    // Chữ theo thiết kế chốt 05/11 (con-mat-mang 01, 08, 21): câu ngắn trấn an — mất mạng / AiiGrow lỗi vẫn tính giờ, vẫn chặn.
    public const string DichVuKhongChayDong = "AiiGrow đang lỗi";
    public const string ChuaGhepDong = "Máy chưa ghép — mở AiiGrow-Setup để ghép lại";

    /// <param name="dichVuTraLoi">Lần gọi named pipe gần nhất tới dịch vụ có trả lời không.</param>
    /// <param name="s">Trạng thái dịch vụ trả về (null nếu chưa có).</param>
    public static KetNoiInfo Chon(bool dichVuTraLoi, TrayState? s)
    {
        if (!dichVuTraLoi || s == null)
            return new KetNoiInfo(KetNoi.DichVuKhongChay, "AiiGrow · " + DichVuKhongChayDong, DichVuKhongChayDong,
                "AiiGrow bị trục trặc. Không sao, máy vẫn giữ luật cũ.");

        if (!s.Paired || s.MoCoi || s.TokenRejected)
            return new KetNoiInfo(KetNoi.ChuaGhep, "AiiGrow · " + ChuaGhepDong, ChuaGhepDong,
                "Nhờ Ba Mẹ mở AiiGrow-Setup trên máy này để ghép lại.");

        if (s.Offline)
        {
            var tu = s.OfflineSince is { } t ? " · " + t.ToLocalTime().ToString("HH:mm") : "";
            var dong = "Mất mạng" + tu;
            return new KetNoiInfo(KetNoi.MatKetNoi, "AiiGrow · " + dong + " — máy vẫn trừ sao đúng luật", dong,
                "Mất mạng rồi, không sao đâu! Máy vẫn trừ sao và giữ luật như cũ.");
        }

        var luc = s.LastSyncAt is { } l ? " · đồng bộ lúc " + l.ToLocalTime().ToString("HH:mm") : "";
        return new KetNoiInfo(KetNoi.DaKetNoi, "AiiGrow · Đã kết nối" + luc, "Đã kết nối", "");
    }

    /// <summary>Chữ tooltip khay (NotifyIcon.Text, tối đa 127 ký tự): câu trạng thái, thêm dòng «còn N phút» khi đã kết nối và có giới hạn giờ.</summary>
    public static string Tooltip(KetNoiInfo info, TrayState? s, DateTimeOffset receivedAt, DateTimeOffset now)
    {
        var text = info.Tooltip;
        if (s is { Paired: true, Locked: false, MoCoi: false } && info.Loai is KetNoi.DaKetNoi or KetNoi.MatKetNoi)
        {
            var d = TrayView.Describe(s, receivedAt, now);
            if (d.RemainingSec.HasValue)
                text += "\nCòn " + (int)Math.Ceiling(d.RemainingSec.Value / 60.0) + " phút";
        }
        return text.Length > 127 ? text[..127] : text;
    }
}

/// <summary>Mục trong cửa sổ app to của Con.</summary>
public enum MucApp { HomNay, NhiemVu, PhanQua, TinNhan }

/// <summary>Chọn ảnh mascot theo ngữ cảnh (tên tệp trong Assets/mascot, không đuôi). Thuần để test.</summary>
public static class MascotView
{
    public static string Chon(MucApp muc, KetNoi ketNoi, bool xongHetViec)
    {
        // #307 (cmt-hom-nay-mat-mang, cmt-hom-nay-dich-vu-tat): thanh bên vẫn Grow thường — Grow «trục trặc» nằm trong thẻ của màn
        return muc switch
        {
            MucApp.NhiemVu => xongHetViec ? "xong" : "so-tay",
            MucApp.PhanQua => "qua",
            MucApp.TinNhan => "chi",
            _ => xongHetViec ? "xong" : "rob-goc",
        };
    }

    /// <summary>Tất cả tên mascot có thể trả về (để kiểm đủ tài nguyên nhúng).</summary>
    public static readonly string[] TatCa = { "rob-goc", "so-tay", "xong", "qua", "chi", "trong-loi" };
}
