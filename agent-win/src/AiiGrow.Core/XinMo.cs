namespace AiiGrow.Core;

/// <summary>Loại lời xin khay gửi dịch vụ (<see cref="PipeRequest.Kind"/>). Hai loại «mở» khớp <c>requests.loai</c> của máy chủ (server/lib/yeu-cau.ts).</summary>
public static class LoaiXin
{
    public const string ThemGio = "them_gio";
    public const string DoiDiem = "doi_diem";
    /// <summary>Xin mở một trang web (giá trị = địa chỉ / tên miền).</summary>
    public const string MoWeb = "mo_web";
    /// <summary>Xin mở / cài một app (giá trị = tên exe hoặc tên app).</summary>
    public const string CaiApp = "cai_app";

    public static bool LaXinMo(string? kind) => kind is MoWeb or CaiApp;
}

/// <summary>«Xin mở trang hoặc app» (như <c>XinMoView</c> của agent-mac): chữ + kiểm đầu vào. Lớp THUẦN để test. Máy chủ vẫn chuẩn hoá lại
/// (<c>chuanMuc</c>: bỏ «https://», «www.», đường dẫn) và quyết định; khay chỉ chặn ô trống / quá dài.</summary>
public static class XinMoView
{
    public const int MucToiDa = 200;
    public const int LoiNhanToiDa = 100;   // máy chủ cắt lyDo ở 100 ký tự

    /// <summary>Hai lựa chọn (giá trị gửi đi, nhãn chip).</summary>
    public static readonly (string Loai, string Nhan)[] Loai = { (LoaiXin.MoWeb, "Trang web"), (LoaiXin.CaiApp, "App") };

    public static string GoiY(string loai) => loai == LoaiXin.MoWeb ? "Địa chỉ trang, ví dụ youtube.com" : "Tên app, ví dụ Minecraft";

    /// <summary>Giá trị gửi máy chủ: bỏ khoảng trắng hai đầu, gộp khoảng trắng giữa (tên app gõ tay); null ⇒ chưa gõ gì / quá dài.</summary>
    public static string? ChuanMuc(string? muc)
    {
        var t = string.Join(' ', (muc ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return t.Length is 0 or > MucToiDa ? null : t;
    }

    /// <summary>Lý do gửi kèm (máy chủ bắt buộc có lý do): lời nhắn của Con, không có thì câu mặc định.</summary>
    public static string LyDo(string? loiNhan, string muc)
    {
        var t = (loiNhan ?? "").Trim();
        if (t.Length == 0) t = "Con xin mở " + muc;
        return t.Length <= LoiNhanToiDa ? t : t[..LoiNhanToiDa];
    }

    /// <summary>Câu báo theo trạng thái lời xin (cùng bộ trạng thái với xin thêm giờ — <see cref="TrayView.XinGio"/>).</summary>
    public static string ThongBao(TrayView.KetQuaXin kq, string ten) => kq switch
    {
        TrayView.KetQuaXin.Duoc => $"Ba Mẹ đã cho mở «{ten}». Con thử mở lại nhé!",
        TrayView.KetQuaXin.TuChoi => $"Ba Mẹ chưa đồng ý mở «{ten}» lần này.",
        TrayView.KetQuaXin.HetHan => "Lời xin đã hết hạn hoặc bị huỷ. Con gửi lại nhé.",
        _ => "Đã gửi cho Ba Mẹ. Đang chờ Ba Mẹ trả lời…",
    };
}

/// <summary>Một dòng «đã dùng hôm nay theo app» (dịch vụ gửi khay trong <see cref="TrayState.DungTheoApp"/>).</summary>
public sealed class DungApp
{
    public string AppId { get; set; } = "";
    public string Ten { get; set; } = "";
    public int Phut { get; set; }
}

public static class DungAppView
{
    /// <summary>«45 phút», «1 giờ», «1 giờ 5 phút»; dưới 1 phút ⇒ «chưa tới 1 phút».</summary>
    public static string ThoiLuong(int phut)
    {
        if (phut <= 0) return "chưa tới 1 phút";
        int h = phut / 60, m = phut % 60;
        return h == 0 ? $"{m} phút" : m == 0 ? $"{h} giờ" : $"{h} giờ {m} phút";
    }

    /// <summary>Tổng phút của danh sách (dòng tổng trên thẻ).</summary>
    public static int Tong(IEnumerable<DungApp> ds) => ds.Sum(x => Math.Max(0, x.Phut));
}
