using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>
/// 06/11 (L13 — docs/API.md mục «S3»): máy dùng chung — chọn tên + PIN, quên PIN, Ba Mẹ nhập mã, đổi bé / khoá lại.
/// Khay (phiên Con) gọi qua named pipe; dịch vụ gọi /api/device/* bằng token máy. Mất mạng ⇒ tự kiểm PIN (vân PIN) / mã Ba Mẹ (TOTP 60/30/15 phút)
/// tại máy; có mạng lại thì báo máy chủ trước lượt dong-bo (<see cref="TruocDongBoAsync"/>) và sửa lệch sau lượt đó (<see cref="SauDongBoAsync"/>).
/// Trạng thái + quyết định thuần ở <see cref="DangNhapView"/> (Core, có test).
/// </summary>
public sealed class NguoiDungMay
{
    private readonly AgentRuntime _rt;
    private readonly ILogger _log;

    public NguoiDungMay(AgentRuntime rt, ILogger log) { _rt = rt; _log = log; }

    private static PipeResponse Loi(string? ma, string cau, int? conLan = null, int? choGiay = null)
        => new() { Ok = false, Status = ma, Error = cau, Message = cau, ConLan = conLan, ChoGiay = choGiay };

    private static bool LaMatMang(Exception e) => e is ApiException a ? a.LaLoiDuongTruyen : e is HttpRequestException or TimeoutException or IOException;

    private ApiClient? Api()
    {
        var cfg = _rt.Config;
        return cfg is { Paired: true } ? new ApiClient(cfg.Server, cfg.Token) : null;
    }

    private string HoSoChoKhay(HoSoMay hs) => JsonSerializer.Serialize(hs.ChoKhay(), Json.Options);

    /// <summary>«Ai đang dùng máy?» — hỏi máy chủ (lưu lại cho lúc mất mạng); mất mạng ⇒ danh sách đã lưu.</summary>
    public async Task<PipeResponse> HoSoAsync(CancellationToken ct)
    {
        using var api = Api();
        if (api == null) return Loi("chua_ghep", "Máy chưa ghép với Ba Mẹ");
        try
        {
            var hs = await api.HoSoAsync(ct);
            LuuHoSo(hs);
            return new PipeResponse { Ok = true, Status = "ok", Data = HoSoChoKhay(hs) };
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            var cu = _rt.DangNhap().HoSo;
            if (cu != null) return new PipeResponse { Ok = true, Status = "cache", Data = HoSoChoKhay(cu) };
            _log.LogWarning("Chưa lấy được danh sách bé (ho-so): {m}", e.Message);
            return Loi(LaMatMang(e) ? "mat_mang" : "loi", ManChonTenView.ChuaCoDs);
        }
    }

    private void LuuHoSo(HoSoMay hs)
    {
        var luc = DateTimeOffset.Now;
        _rt.CapNhatDangNhap(d => { d.HoSo = hs; d.HoSoLuc = luc; return true; });
    }

    /// <summary>Bé chạm tên + PIN. Có mạng ⇒ máy chủ kiểm (đếm sai 5 lần / 15 giây ở máy chủ); mất mạng ⇒ máy tự kiểm bằng vân PIN đã lưu.</summary>
    public async Task<PipeResponse> DangNhapBeAsync(string? conId, string? pin, CancellationToken ct)
    {
        var now = DateTimeOffset.Now;
        conId = (conId ?? "").Trim();
        pin = string.IsNullOrWhiteSpace(pin) ? null : pin.Trim();
        if (conId.Length == 0) return Loi("khong_thay", "Chọn tên của con nhé.");
        if (pin != null && !DangNhapView.PinHopLe(pin)) return Loi("pin_sai_dang", "PIN gồm đúng 4 chữ số.");
        var be = _rt.DangNhap().HoSo?.Con.FirstOrDefault(c => c.Id == conId);
        using var api = Api();
        if (api == null) return Loi("chua_ghep", "Máy chưa ghép với Ba Mẹ");
        try
        {
            var kq = await api.DangNhapBeAsync(conId, pin, ct);
            _rt.CapNhatDangNhap(d => { DangNhapView.VaoCon(d, conId, kq.Con?.Ten ?? be?.Ten, kq.Con?.Avatar ?? be?.Avatar, now); return true; });
            _log.LogInformation("Bé {ten} vào máy (PIN {pin})", kq.Con?.Ten ?? be?.Ten, kq.CoPin ? "có" : "chưa đặt");
            _rt.RequestSyncSoon();   // Policy / quỹ / sao của bé này
            return new PipeResponse { Ok = true, Status = kq.CanDatPin ? "can_dat_pin" : "ok", Message = kq.CanDatPin ? ManChonTenView.ChuaDatPin : null };
        }
        catch (ApiException e) when (!e.LaLoiDuongTruyen && e.StatusCode is >= 400 and < 500)
        {
            return Loi(e.Code, e.Message, e.SoPhu("conLan"), e.SoPhu("choGiay"));
        }
        catch (Exception e) when (e is not OperationCanceledException && LaMatMang(e))
        {
            if (be == null) return Loi("mat_mang", "Chưa có mạng — máy chưa nhớ tên này. Nhờ Ba Mẹ mở máy nhé.");
            var biMat = _rt.Config?.MaOfflineBiMat;
            var kq = KetQuaPinOffline.KhongKiemDuoc;
            int conLan = 0, cho = 0;
            _rt.CapNhatDangNhap(d =>
            {
                kq = DangNhapView.ThuPinOffline(d, be, biMat, pin, now, out conLan, out cho);
                if (kq == KetQuaPinOffline.Dung)
                    DangNhapView.VaoCon(d, be.Id, be.Ten, be.Avatar, now, new DangNhapCho { ConId = be.Id, Pin = be.CoPin ? pin : null, Luc = now });
                return true;
            });
            _log.LogInformation("Mất mạng: thử PIN tại máy cho {ten} — {kq}", be.Ten, kq);
            return kq switch
            {
                KetQuaPinOffline.Dung => new PipeResponse { Ok = true, Status = "ok" },
                KetQuaPinOffline.Sai => Loi("pin_sai", ManChonTenView.ChuaDung(conLan), conLan),
                KetQuaPinOffline.TamKhoa => Loi("pin_tam_khoa", ManChonTenView.TieuTamKhoa, null, cho),
                _ when be.CoPin && string.IsNullOrEmpty(pin) => Loi("can_pin", ManChonTenView.PhuPin),
                _ => Loi("mat_mang", "Chưa có mạng — máy chưa nhớ PIN của con. Nhờ Ba Mẹ mở máy nhé."),
            };
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            return Loi("loi", e.Message);
        }
    }

    /// <summary>«Báo Ba Mẹ giúp con» (quên PIN).</summary>
    public async Task<PipeResponse> QuenPinAsync(string? conId, CancellationToken ct)
    {
        using var api = Api();
        if (api == null) return Loi("chua_ghep", "Máy chưa ghép với Ba Mẹ");
        try
        {
            var kq = await api.QuenPinAsync((conId ?? "").Trim(), ct);
            return new PipeResponse { Ok = true, Status = kq.LapLai ? "lap_lai" : "da_gui" };
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            return LaMatMang(e) ? Loi("mat_mang", "Chưa có mạng — con nhờ Ba Mẹ trực tiếp nhé.") : Loi((e as ApiException)?.Code, e.Message);
        }
    }

    /// <summary>«Ba Mẹ nhập mã» — mã mở máy 6 số của máy này. Có mạng ⇒ máy chủ (sai 5 lần ⇒ chờ 10 phút, mỗi mã một lượt); mất mạng ⇒ máy tự kiểm.</summary>
    public async Task<PipeResponse> BaMeMoAsync(string? ma, CancellationToken ct)
    {
        var now = DateTimeOffset.Now;
        var sach = new string((ma ?? "").Where(char.IsDigit).ToArray());
        if (sach.Length != MaOffline.SoChuSo) return Loi("ma_sai", "Mã có 6 số.");
        using var api = Api();
        if (api == null) return Loi("chua_ghep", "Máy chưa ghép với Ba Mẹ");
        try
        {
            var kq = await api.BaMeMoAsync(sach, ct);
            var den = kq.BaMeDung?.Den ?? now.AddMinutes(Math.Clamp(kq.Phut, 5, 120));
            _rt.CapNhatDangNhap(d => { DangNhapView.VaoBaMe(d, den, false, now); return true; });
            _log.LogInformation("Ba Mẹ mở máy bằng mã: {phut} phút (tới {den:HH:mm})", kq.Phut, den.ToLocalTime());
            _rt.RequestSyncSoon();
            return new PipeResponse { Ok = true, Status = "ok", Message = $"Ba Mẹ dùng máy tới {den.ToLocalTime():HH:mm}." };
        }
        catch (ApiException e) when (!e.LaLoiDuongTruyen && e.StatusCode is >= 400 and < 500)
        {
            return Loi(e.Code, e.Message, e.SoPhu("conLan"), e.SoPhu("choGiay"));
        }
        catch (Exception e) when (e is not OperationCanceledException && LaMatMang(e))
        {
            var (ok, cau) = _rt.TryMaOffline(sach, now, choBaMe: true);
            _log.LogInformation("Mất mạng: Ba Mẹ nhập mã tại máy — {kq}", ok ? "mở" : cau);
            return ok ? new PipeResponse { Ok = true, Status = "ok", Message = cau } : Loi("ma_sai", cau);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            return Loi("loi", e.Message);
        }
    }

    /// <summary>«Đổi bé / Đăng xuất» / «Khoá lại»: máy về màn chọn tên NGAY; báo máy chủ ở lượt đồng bộ kế (≤5 giây) — lượt đó gửi nốt phút dùng của bé
    /// vừa ra trước khi máy chủ thả bé (<see cref="SauDongBoAsync"/>). Mất mạng ⇒ báo khi có mạng.</summary>
    public PipeResponse Roi(bool khoaLai)
    {
        var now = DateTimeOffset.Now;
        var truoc = _rt.NguoiDung(now);
        _rt.CapNhatDangNhap(d => { DangNhapView.Roi(d, now, baoMayChu: true); return true; });
        _log.LogInformation("{ai} — máy về màn chọn tên", khoaLai ? "Ba Mẹ khoá lại" : truoc == LoaiNguoiDung.Con ? "Bé đăng xuất" : "Đăng xuất");
        _rt.RequestSyncSoon();
        return new PipeResponse { Ok = true, Status = "ok" };
    }

    /// <summary>Trước lượt dong-bo: bé đăng nhập lúc mất mạng ⇒ báo máy chủ (giờ, sao tính đúng bé). PIN Ba Mẹ vừa đổi (máy chủ từ chối) ⇒ bé ra màn chọn tên.</summary>
    public async Task TruocDongBoAsync(ApiClient api, CancellationToken ct)
    {
        var d = _rt.DangNhap();
        if (d.ChoMang is not { } cho || d.Loai != LoaiNguoiDung.Con || d.ConId != cho.ConId) return;
        try
        {
            await api.DangNhapBeAsync(cho.ConId, cho.Pin, ct);
            _rt.CapNhatDangNhap(x => { if (x.ChoMang?.ConId != cho.ConId) return false; x.ChoMang = null; return true; });
            _log.LogInformation("Có mạng: đã báo máy chủ bé {ten} đang dùng máy (vào lúc mất mạng)", d.TenCon);
        }
        catch (ApiException e) when (!e.LaLoiDuongTruyen && e.StatusCode is >= 400 and < 500 && !e.LaTokenSai)
        {
            _log.LogWarning("Có mạng: máy chủ không nhận lượt vào của {ten} lúc mất mạng ({m}) — về màn chọn tên", d.TenCon, e.Message);
            _rt.CapNhatDangNhap(x => { if (x.ChoMang?.ConId != cho.ConId) return false; DangNhapView.Roi(x, DateTimeOffset.Now, baoMayChu: false); return true; });
        }
        catch (Exception e) when (e is not OperationCanceledException) { _log.LogDebug("Báo bé vào máy lỗi, để lần sau: {m}", e.Message); }
    }

    /// <summary>Sau lượt dong-bo thành công: áp «ai đang dùng» của máy chủ, báo đăng xuất còn treo, làm mới danh sách bé (vân PIN cho lúc mất mạng).</summary>
    public async Task SauDongBoAsync(ApiClient api, string raw, DateTimeOffset guiLuc, CancellationToken ct)
    {
        var now = DateTimeOffset.Now;
        var nd = NguoiDungMayChu.Doc(raw);
        var viec = ViecSauDongBo.KhongCo;
        var mayRieng = _rt.MayRieng;
        _rt.CapNhatDangNhap(d =>
        {
            var (doi, v) = DangNhapView.NhanTuMayChu(d, nd, guiLuc, mayRieng, now);
            viec = v;
            return doi;
        });
        if (viec == ViecSauDongBo.BaoRoi)
        {
            try
            {
                await api.RoiMayAsync(khoaLai: false, ct);
                _rt.CapNhatDangNhap(d => { if (!d.CanBaoRoi) return false; d.CanBaoRoi = false; return true; });
                _log.LogInformation("Đã báo máy chủ: máy về màn chọn tên");
            }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogDebug("Báo đăng xuất lỗi, để lần sau: {m}", e.Message); }
        }
        if (DangNhapView.CanHoiHoSo(_rt.DangNhap(), now))
        {
            try { LuuHoSo(await api.HoSoAsync(ct)); }
            catch (Exception e) when (e is not OperationCanceledException) { _log.LogDebug("Làm mới danh sách bé lỗi: {m}", e.Message); }
        }
    }
}
