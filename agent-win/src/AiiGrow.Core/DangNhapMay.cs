using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiiGrow.Core;

// Thiết kế chốt 06/11 (docs/KE-HOACH-KHOP-THIET-KE-0611.md L13 — docs/thiet-ke-chot/con-ngay-thuong 01–08, con-cai-win 03/04/12):
// MỘT tài khoản Windows giới hạn dùng chung cho các bé; AiiGrow nhận từng bé bằng «chọn tên + PIN 4 số».
//   • Máy khoá («Ai đang dùng máy?») ⇒ chạm tên ⇒ PIN. Sai 5 lần ⇒ chờ 15 giây. «Quên PIN» ⇒ báo Ba Mẹ đặt lại. Bé chưa có PIN ⇒ vào thẳng.
//   • «Ba Mẹ dùng máy» ⇒ Ba Mẹ nhập mã mở máy của máy này (cùng mã khi mất mạng, 15/30/60 phút nằm trong mã) ⇒ «Ba Mẹ đang dùng máy»:
//     máy mở hết, không tính giờ con, «Khoá lại» ⇒ về màn chọn tên.
//   • «Đổi bé / Đăng xuất» ⇒ về màn chọn tên. Giờ, sao, nhiệm vụ tính theo bé đang đăng nhập (máy chủ: devices.con_dang_dung — docs/API.md mục «S3»).
// Máy chỉ gán một bé (máy riêng) vẫn hỏi PIN khi máy khoá. Mất mạng: máy tự kiểm PIN bằng «vân PIN» (HMAC-SHA256 bằng bí mật mã offline) và
// tự kiểm mã Ba Mẹ (TOTP, thử biến thể 60 → 30 → 15 phút); có mạng lại thì báo máy chủ.
// Lớp THUẦN (test được): trạng thái ai đang dùng máy lưu ở AgentConfig.DangNhap; dịch vụ (AgentRuntime / NguoiDungMay) chỉ gọi vào đây.

/// <summary>Ai đang dùng máy (dong-bo.nguoiDung.loai).</summary>
public static class LoaiNguoiDung
{
    public const string Con = "con";
    public const string BaMe = "ba_me";
    public const string Chua = "chua";
}

/// <summary>Một bé trong «Ai đang dùng máy?» (GET /api/device/ho-so › con[]).</summary>
public sealed class HoSoBe
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string? Avatar { get; set; }
    public bool CoPin { get; set; }
    /// <summary>HMAC-SHA256(khoá = bí mật mã offline của máy, «&lt;id&gt;:&lt;PIN&gt;») hex — để máy tự kiểm PIN lúc mất mạng. KHÔNG gửi sang khay.</summary>
    public string? VanPin { get; set; }
    public DateTimeOffset? KhoaDen { get; set; }
    public int? ChoGiay { get; set; }
}

public sealed class HoSoDangDung
{
    [JsonConverter(typeof(FlexStringConverter))]
    public string Id { get; set; } = "";
    public string Ten { get; set; } = "";
    public string? Avatar { get; set; }
    public DateTimeOffset? Tu { get; set; }
}

public sealed class HoSoBaMe
{
    public DateTimeOffset Den { get; set; }
    public DateTimeOffset? Tu { get; set; }
}

/// <summary>GET /api/device/ho-so — «Ai đang dùng máy?».</summary>
public sealed class HoSoMay
{
    public List<HoSoBe> Con { get; set; } = new();
    public bool MayRieng { get; set; }
    public HoSoDangDung? DangDung { get; set; }
    public HoSoBaMe? BaMeDung { get; set; }
    public int PinSaiToiDa { get; set; } = DangNhapView.PinSaiToiDa;
    public int PinChoGiay { get; set; } = DangNhapView.PinChoGiay;

    /// <summary>Bản gửi sang khay: bỏ vân PIN (khay là tiến trình của Con).</summary>
    public HoSoMay ChoKhay() => new()
    {
        Con = Con.Select(c => new HoSoBe { Id = c.Id, Ten = c.Ten, Avatar = c.Avatar, CoPin = c.CoPin, KhoaDen = c.KhoaDen, ChoGiay = c.ChoGiay }).ToList(),
        MayRieng = MayRieng, DangDung = DangDung, BaMeDung = BaMeDung, PinSaiToiDa = PinSaiToiDa, PinChoGiay = PinChoGiay,
    };
}

/// <summary>Khối «ai đang dùng máy» trong phản hồi dong-bo / nhip: {loai: con, con: {id, ten, coPin}} | {loai: ba_me, den} | {loai: chua}.</summary>
public sealed class NguoiDungMayChu
{
    public string Loai { get; set; } = LoaiNguoiDung.Chua;
    public NguoiDungCon? Con { get; set; }
    public DateTimeOffset? Den { get; set; }

    public sealed class NguoiDungCon
    {
        [JsonConverter(typeof(FlexStringConverter))]
        public string Id { get; set; } = "";
        public string Ten { get; set; } = "";
        public bool CoPin { get; set; }
    }

    /// <summary>Đọc `nguoiDung` (+ `baMeDung` ở gốc) từ phản hồi dong-bo. Máy chủ cũ (không có khối này) ⇒ null.</summary>
    public static NguoiDungMayChu? Doc(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;
            if (!doc.RootElement.TryGetProperty("nguoiDung", out var nd) || nd.ValueKind != JsonValueKind.Object) return null;
            var r = JsonSerializer.Deserialize<NguoiDungMayChu>(nd.GetRawText(), Json.Options);
            if (r == null) return null;
            r.Loai = (r.Loai ?? "").Trim().ToLowerInvariant();
            if (r.Loai is not (LoaiNguoiDung.Con or LoaiNguoiDung.BaMe or LoaiNguoiDung.Chua)) return null;
            if (r.Loai == LoaiNguoiDung.Con && string.IsNullOrEmpty(r.Con?.Id)) return null;
            if (r.Loai == LoaiNguoiDung.BaMe && r.Den == null
                && doc.RootElement.TryGetProperty("baMeDung", out var bm) && bm.ValueKind == JsonValueKind.Object
                && bm.TryGetProperty("den", out var den) && den.TryGetDateTimeOffset(out var d)) r.Den = d;
            return r;
        }
        catch (JsonException) { return null; }
    }
}

/// <summary>Bé đăng nhập lúc MẤT MẠNG (máy tự kiểm PIN) — có mạng thì gửi dang-nhap-be để máy chủ biết bé nào đang dùng (giờ, sao tính đúng bé).
/// PIN nằm trong cấu hình DPAPI (chỉ SYSTEM / quản trị đọc) tới khi máy chủ xác nhận rồi xoá.</summary>
public sealed class DangNhapCho
{
    public string ConId { get; set; } = "";
    public string? Pin { get; set; }
    public DateTimeOffset Luc { get; set; }
}

/// <summary>Ai đang dùng máy — lưu trong <see cref="AgentConfig.DangNhap"/> (khởi động lại vẫn giữ: «Máy sẽ nhớ con — lần sau mở là vào luôn»).</summary>
public sealed class DangNhapMay
{
    public string Loai { get; set; } = LoaiNguoiDung.Chua;
    public string? ConId { get; set; }
    public string? TenCon { get; set; }
    public string? Avatar { get; set; }
    public DateTimeOffset? Tu { get; set; }
    /// <summary>«Ba Mẹ đang dùng máy» tới lúc này.</summary>
    public DateTimeOffset? BaMeDen { get; set; }
    /// <summary>Ba Mẹ mở bằng mã lúc mất mạng (máy chủ chưa biết) ⇒ có mạng lại vẫn giữ tới hạn.</summary>
    public bool BaMeOffline { get; set; }
    public DangNhapCho? ChoMang { get; set; }
    /// <summary>Đăng xuất / Khoá lại chưa báo được máy chủ (mất mạng, hoặc chờ lượt đồng bộ gửi nốt phút dùng của bé vừa ra) ⇒ lần đồng bộ được tới gửi.</summary>
    public bool CanBaoRoi { get; set; }
    /// <summary>Lần đổi người tại máy gần nhất — phản hồi dong-bo GỬI TRƯỚC lúc này là cũ, không áp «ai đang dùng» của nó.</summary>
    public DateTimeOffset? DoiLuc { get; set; }
    /// <summary>Danh sách bé lần hỏi ho-so gần nhất (kèm vân PIN) — để màn chọn tên chạy cả khi mất mạng.</summary>
    public HoSoMay? HoSo { get; set; }
    public DateTimeOffset? HoSoLuc { get; set; }
    /// <summary>Lượt sai PIN lúc mất mạng theo bé (máy tự đếm 5 lần / 15 giây như máy chủ).</summary>
    public Dictionary<string, List<DateTimeOffset>> SaiPin { get; set; } = new();
}

/// <summary>POST dang-nhap-be.</summary>
public sealed class DangNhapBeKq
{
    public HoSoDangDung? Con { get; set; }
    public bool CoPin { get; set; }
    public bool CanDatPin { get; set; }
}

public sealed class QuenPinKq
{
    public bool DaGui { get; set; }
    public bool LapLai { get; set; }
}

public sealed class BaMeMoKq
{
    public HoSoBaMe? BaMeDung { get; set; }
    public int Phut { get; set; }
}

/// <summary>Việc dịch vụ cần làm sau khi áp «ai đang dùng» của máy chủ.</summary>
public enum ViecSauDongBo { KhongCo, BaoRoi }

/// <summary>Kết quả thử PIN tại máy (mất mạng).</summary>
public enum KetQuaPinOffline { Dung, Sai, TamKhoa, KhongKiemDuoc }

public static class DangNhapView
{
    public const int PinSaiToiDa = 5;
    public const int PinChoGiay = 15;
    public const int SoChuSoPin = 4;
    /// <summary>Lượt sai cũ hơn chừng này không cộng dồn (như máy chủ pin-be.ts).</summary>
    public static readonly TimeSpan SaiCuBo = TimeSpan.FromMinutes(15);

    /// <summary>Ai đang dùng máy lúc <paramref name="now"/>: Ba Mẹ hết hạn ⇒ chưa ai.</summary>
    public static string HienTai(DangNhapMay? d, DateTimeOffset now)
    {
        if (d == null) return LoaiNguoiDung.Chua;
        if (d.Loai == LoaiNguoiDung.BaMe) return d.BaMeDen is { } den && den > now ? LoaiNguoiDung.BaMe : LoaiNguoiDung.Chua;
        if (d.Loai == LoaiNguoiDung.Con && !string.IsNullOrEmpty(d.ConId)) return LoaiNguoiDung.Con;
        return LoaiNguoiDung.Chua;
    }

    public static bool BaMeDangDung(DangNhapMay? d, DateTimeOffset now) => HienTai(d, now) == LoaiNguoiDung.BaMe;

    /// <summary>Áp «ai đang dùng máy» lên kết quả Policy:
    ///   • Ba Mẹ đang dùng ⇒ mở hết (không khoá, không danh sách app, không đếm giờ) tới hạn;
    ///   • chưa ai ⇒ khoá «chọn tên» (vẫn giữ danh sách app — sau màn khoá không chạy được gì khác);
    ///   • bé đang dùng ⇒ giữ nguyên (Policy của bé).</summary>
    public static EffectivePolicy ApDung(EffectivePolicy eff, DangNhapMay? d, DateTimeOffset now)
    {
        switch (HienTai(d, now))
        {
            case LoaiNguoiDung.BaMe:
                return eff with { Locked = false, LockReason = null, MinutesLeft = null, GrantEndsAt = d!.BaMeDen, AppLockerWanted = false };
            case LoaiNguoiDung.Chua:
                return eff with { Locked = true, LockReason = LockReasons.ChonTen, MinutesLeft = null, GrantEndsAt = null, AppLockerWanted = true };
            default:
                return eff;
        }
    }

    /// <summary>Bé chạm tên + PIN đúng (máy chủ hoặc máy tự kiểm) ⇒ bé đang dùng.</summary>
    public static void VaoCon(DangNhapMay d, string id, string? ten, string? avatar, DateTimeOffset now, DangNhapCho? choMang = null)
    {
        d.Loai = LoaiNguoiDung.Con;
        d.ConId = id; d.TenCon = ten; d.Avatar = avatar; d.Tu = now;
        d.BaMeDen = null; d.BaMeOffline = false;
        d.ChoMang = choMang;
        d.CanBaoRoi = false;
        d.DoiLuc = now;
        d.SaiPin.Remove(id);
    }

    /// <summary>«Ba Mẹ đang dùng máy» tới <paramref name="den"/> (bé đang dùng bị đăng xuất).</summary>
    public static void VaoBaMe(DangNhapMay d, DateTimeOffset den, bool offline, DateTimeOffset now)
    {
        d.Loai = LoaiNguoiDung.BaMe;
        d.BaMeDen = den; d.BaMeOffline = offline;
        d.ConId = null; d.TenCon = null; d.Avatar = null; d.Tu = now;
        d.ChoMang = null;
        d.CanBaoRoi = false;
        d.DoiLuc = now;
    }

    /// <summary>«Đổi bé / Đăng xuất» hoặc «Khoá lại» ⇒ về màn chọn tên. <paramref name="baoMayChu"/> = còn phải báo máy chủ (dang-xuat / khoa-lai).</summary>
    public static void Roi(DangNhapMay d, DateTimeOffset now, bool baoMayChu)
    {
        var coPhien = d.Loai == LoaiNguoiDung.Con && d.ChoMang == null || d.Loai == LoaiNguoiDung.BaMe && !d.BaMeOffline;
        d.Loai = LoaiNguoiDung.Chua;
        d.ConId = null; d.TenCon = null; d.Avatar = null; d.Tu = null;
        d.BaMeDen = null; d.BaMeOffline = false;
        d.ChoMang = null;
        d.CanBaoRoi = baoMayChu && (coPhien || d.CanBaoRoi);
        d.DoiLuc = now;
    }

    /// <summary>Áp «ai đang dùng» máy chủ trả trong dong-bo. Máy là nơi bé / Ba Mẹ thao tác nên trạng thái TẠI MÁY thắng; máy chủ chỉ:
    ///   • «chưa ai» ⇒ bé hết phiên (12 giờ) — về màn chọn tên;
    ///   • «Ba Mẹ» ⇒ nhận hạn Ba Mẹ dùng;
    ///   • còn ghi một bé trong khi máy đã đăng xuất ⇒ phải báo lại máy chủ (<see cref="ViecSauDongBo.BaoRoi"/>).
    /// Bỏ qua khi phản hồi gửi đi trước lần đổi người tại máy, khi còn đăng nhập / đăng xuất chưa báo được.</summary>
    /// <param name="guiLuc">Lúc gửi dong-bo.</param>
    /// <param name="mayRieng">Máy chỉ gán một bé: máy chủ luôn ghi bé đó ⇒ «chưa ai» tại máy là do PIN, không báo lại.</param>
    public static (bool DaDoi, ViecSauDongBo Viec) NhanTuMayChu(DangNhapMay d, NguoiDungMayChu? nd, DateTimeOffset guiLuc, bool mayRieng, DateTimeOffset now)
    {
        if (d.CanBaoRoi) return (false, ViecSauDongBo.BaoRoi);
        if (nd == null || d.ChoMang != null || d.DoiLuc is { } doi && doi > guiLuc) return (false, ViecSauDongBo.KhongCo);
        var tai = HienTai(d, now);
        switch (nd.Loai)
        {
            case LoaiNguoiDung.BaMe when nd.Den is { } den && den > now:
                if (tai == LoaiNguoiDung.BaMe && d.BaMeDen == den) return (false, ViecSauDongBo.KhongCo);
                if (tai == LoaiNguoiDung.BaMe && d.BaMeOffline && d.BaMeDen > den) return (false, ViecSauDongBo.KhongCo);
                VaoBaMe(d, den, false, now);
                d.DoiLuc = guiLuc;
                return (true, ViecSauDongBo.KhongCo);
            case LoaiNguoiDung.Chua:
                if (tai != LoaiNguoiDung.Con) return (false, ViecSauDongBo.KhongCo);
                Roi(d, now, false);
                d.DoiLuc = guiLuc;
                return (true, ViecSauDongBo.KhongCo);
            case LoaiNguoiDung.Con:
                if (tai == LoaiNguoiDung.Con && nd.Con!.Id == d.ConId)
                {
                    if (!string.IsNullOrWhiteSpace(nd.Con.Ten) && nd.Con.Ten != d.TenCon) { d.TenCon = nd.Con.Ten; return (true, ViecSauDongBo.KhongCo); }
                    return (false, ViecSauDongBo.KhongCo);
                }
                // máy đã đăng xuất / Ba Mẹ dùng bằng mã lúc mất mạng mà máy chủ còn ghi bé ⇒ báo lại (máy dùng chung)
                var lech = tai == LoaiNguoiDung.Chua || tai == LoaiNguoiDung.BaMe && d.BaMeOffline;
                return (false, lech && !mayRieng ? ViecSauDongBo.BaoRoi : ViecSauDongBo.KhongCo);
            default:
                return (false, ViecSauDongBo.KhongCo);
        }
    }

    /// <summary>Ngay trước khi gửi dang-xuat báo bù (đã giữ khoá đổi người): còn cần báo không — bé / Ba Mẹ vừa vào trong lúc đồng bộ ⇒ thôi.</summary>
    public static bool CanBaoRoiSau(DangNhapMay d, DateTimeOffset now)
        => d.CanBaoRoi || HienTai(d, now) == LoaiNguoiDung.Chua || d.Loai == LoaiNguoiDung.BaMe && d.BaMeOffline;

    /// <summary>Máy chủ gửi «giam-sat» cho máy dùng chung CHƯA có bé (server lenh-may.ts › cheDoGuiMay) — từ 05/11 máy luôn chặn thật, nên khi đó agent
    /// vẫn chặn (màn chọn tên + danh sách app); chỉ «giam-sat» vì đang có lệnh gỡ (`lenh` loai go) mới thả. → chế độ nên áp.</summary>
    public static string? CheDoMayChung(string? cheDoMayChu, string? raw)
    {
        if (cheDoMayChu != CheDoAgent.GiamSat || string.IsNullOrEmpty(raw)) return cheDoMayChu;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Object || !doc.RootElement.TryGetProperty("nguoiDung", out _)) return cheDoMayChu;   // máy chủ cũ: giữ nguyên
            if (doc.RootElement.TryGetProperty("lenh", out var l) && l.ValueKind == JsonValueKind.Array
                && l.EnumerateArray().Any(x => x.ValueKind == JsonValueKind.Object && x.TryGetProperty("loai", out var lo) && lo.ValueKind == JsonValueKind.String && lo.GetString() == "go"))
                return cheDoMayChu;
            return CheDoAgent.Chan;
        }
        catch (JsonException) { return cheDoMayChu; }
    }

    // ------------------------------------------------------------------ PIN lúc mất mạng

    /// <summary>Vân PIN như máy chủ (pin-be.ts › vanPin): HMAC-SHA256(khoá UTF-8 = bí mật, «&lt;id&gt;:&lt;PIN&gt;») hex chữ thường.</summary>
    public static string VanPin(string biMat, string conId, string pin)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(biMat));
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(conId + ":" + pin))).ToLowerInvariant();
    }

    public static bool PinHopLe(string? pin) => pin is { Length: SoChuSoPin } && pin.All(c => c is >= '0' and <= '9');

    /// <summary>Giây còn phải chờ trước khi thử PIN tiếp (0 = thử được) — sai đủ 5 lần ⇒ chờ 15 giây kể từ lần sai cuối.</summary>
    public static int ChoGiay(DangNhapMay d, string conId, DateTimeOffset now)
    {
        if (!d.SaiPin.TryGetValue(conId, out var ds)) return 0;
        ds.RemoveAll(t => now - t > SaiCuBo);
        if (ds.Count < PinSaiToiDa) return 0;
        var den = ds.Max().AddSeconds(PinChoGiay);
        if (den <= now) { ds.Clear(); return 0; }
        return Math.Max(1, (int)Math.Ceiling((den - now).TotalSeconds));
    }

    /// <summary>Máy tự kiểm PIN (mất mạng). <paramref name="conLan"/> = số lần thử còn lại sau lượt sai; <paramref name="cho"/> = giây chờ khi tạm khoá.</summary>
    public static KetQuaPinOffline ThuPinOffline(DangNhapMay d, HoSoBe be, string? biMat, string? pin, DateTimeOffset now, out int conLan, out int cho)
    {
        conLan = PinSaiToiDa; cho = 0;
        if ((cho = ChoGiay(d, be.Id, now)) > 0) return KetQuaPinOffline.TamKhoa;
        if (!be.CoPin) return KetQuaPinOffline.Dung;
        if (string.IsNullOrEmpty(biMat) || string.IsNullOrEmpty(be.VanPin)) return KetQuaPinOffline.KhongKiemDuoc;
        var sach = (pin ?? "").Trim();
        var dung = PinHopLe(sach) && CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(VanPin(biMat, be.Id, sach)), Encoding.ASCII.GetBytes(be.VanPin.Trim().ToLowerInvariant()));
        if (dung) { d.SaiPin.Remove(be.Id); return KetQuaPinOffline.Dung; }
        if (!d.SaiPin.TryGetValue(be.Id, out var ds)) d.SaiPin[be.Id] = ds = new();
        ds.Add(now);
        conLan = Math.Max(0, PinSaiToiDa - ds.Count);
        if (conLan == 0) { cho = PinChoGiay; return KetQuaPinOffline.TamKhoa; }
        return KetQuaPinOffline.Sai;
    }

    /// <summary>Cần hỏi lại ho-so: chưa có danh sách, đang ở màn chọn tên mà lần hỏi trước cũ hơn 2 phút, hoặc cũ hơn 30 phút.
    /// <paramref name="hoiLuc"/> = lần hỏi gần nhất trong bộ nhớ dịch vụ (null ⇒ theo lúc danh sách được lưu).</summary>
    public static bool CanHoiHoSo(DangNhapMay d, DateTimeOffset now, DateTimeOffset? hoiLuc = null)
        => d.HoSo == null || (hoiLuc ?? d.HoSoLuc) is not { } l || now - l > TimeSpan.FromMinutes(HienTai(d, now) == LoaiNguoiDung.Chua ? 2 : 30) || l > now.AddMinutes(1);

    // ------------------------------------------------------------------ chữ trên màn

    public static string ChanTrang(string? tenCon) => string.IsNullOrWhiteSpace(tenCon)
        ? "AiiGrow · Máy tính của cả nhà · máy do Ba Mẹ quản lý"
        : "AiiGrow · " + tenCon.Trim() + " · máy do Ba Mẹ quản lý";

    /// <summary>Chữ cái đầu trên viên ảnh bé («Bảo Anh» ⇒ «B», «Bảo Minh» ⇒ «M» khi trùng chữ đầu với bé trước).</summary>
    public static string ChuDau(string ten, IEnumerable<string>? daDung = null)
    {
        var tu = (ten ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (tu.Length == 0) return "?";
        var dung = daDung?.ToHashSet(StringComparer.OrdinalIgnoreCase) ?? new HashSet<string>();
        var dau = tu[0][..1].ToUpperInvariant();
        if (!dung.Contains(dau) || tu.Length == 1) return dau;
        return tu[^1][..1].ToUpperInvariant();
    }

    /// <summary>Chữ đầu cho cả danh sách (bé sau trùng chữ đầu bé trước thì lấy chữ cuối tên — «Bảo Anh» B · «Bảo Minh» M).</summary>
    public static List<string> ChuDauDs(IEnumerable<string> tenDs)
    {
        var ra = new List<string>();
        foreach (var t in tenDs) ra.Add(ChuDau(t, ra));
        return ra;
    }

    public static string DangDungBaMe(DateTimeOffset den, DateTimeOffset now)
    {
        var phut = Math.Max(1, (int)Math.Ceiling((den - now).TotalMinutes));
        return $"Còn {phut} phút · tới {den.ToLocalTime():HH:mm}";
    }
}
