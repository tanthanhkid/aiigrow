using System.Text;

namespace AiiGrow.Core;

// AN TOÀN & GỠ CÀI ĐẶT (Thanh 22/10: «khi cần gỡ thì gỡ được, không muốn nó bị dính trong đó»). Phần THUẦN, test được ngoài Windows:
//   • CheDoHieuLuc — chế độ thật sự áp: máy chủ (Ba Mẹ chọn trên app) thắng CheDo cục bộ; máy mồ côi ⇒ luôn giám sát.
//   • MoCoi        — fail-open: token bị từ chối (401/403) liên tục > 6 giờ ⇒ về giám sát, gỡ luật, thôi áp Policy cuối.
//   • SystemCleanup.Run(ICleanupOps, …) — THỨ TỰ các bước gỡ (gỡ từ xa trong dịch vụ / gỡ tại máy bằng Setup); bước hệ thống nằm sau interface.
//   • LocalUninstall — Setup --uninstall: báo máy chủ «đã gỡ tại máy» TRƯỚC khi xoá token, rồi gỡ sạch.

/// <summary>Chọn chế độ hiệu lực. Không bao giờ trả giá trị ngoài <see cref="CheDoAgent.GiamSat"/> / <see cref="CheDoAgent.Chan"/>.</summary>
public static class CheDoHieuLuc
{
    /// <summary>Chuẩn hoá một giá trị chế độ; lạ / trống ⇒ null.</summary>
    public static string? Chuan(string? v)
    {
        var s = (v ?? "").Trim().ToLowerInvariant();
        return s == CheDoAgent.GiamSat || s == CheDoAgent.Chan ? s : null;
    }

    /// <param name="mayChu">dong-bo.windows.cheDo (null = máy chủ không gửi ⇒ Ba Mẹ chưa chọn, giữ cục bộ).</param>
    /// <param name="cucBo">AgentConfig.CheDo (lần chọn cuối của máy chủ đã lưu, hoặc Setup --che-do=).</param>
    /// <param name="moCoi">máy bị bỏ khỏi gia đình (token bị từ chối lâu) ⇒ luôn giám sát.</param>
    public static string Chon(string? mayChu, string? cucBo, bool moCoi)
    {
        if (moCoi) return CheDoAgent.GiamSat;
        return Chuan(mayChu) ?? Chuan(cucBo) ?? CheDoAgent.GiamSat;
    }

    public static bool LaChan(string? cheDo) => Chuan(cheDo) == CheDoAgent.Chan;

    /// <summary>Trạng thái khay khi KHÔNG chặn thật (giám sát / mồ côi): không màn khoá, không màn chặn app — chỉ ghi log ở dịch vụ.</summary>
    public static void ChoKhayGiamSat(TrayState s)
    {
        s.Locked = false;
        s.LockReason = null;
        s.LockGraceLeftSec = null;
    }
}

/// <summary>Fail-open khi máy bị bỏ rơi: token bị từ chối liên tục quá <see cref="Nguong"/> ⇒ coi là mồ côi. Trạng thái lưu trong cấu hình
/// (<see cref="AgentConfig.TuChoiTu"/>) để khởi động lại vẫn tính tiếp. Lỗi mạng KHÔNG tính (máy mất mạng vẫn chạy theo Policy cuối như cũ).</summary>
public static class MoCoi
{
    public const int GioNguong = 6;
    public static readonly TimeSpan Nguong = TimeSpan.FromHours(GioNguong);

    /// <summary>Máy chủ từ chối token (401/403). → true nếu cấu hình đổi (cần lưu).</summary>
    public static bool GhiTuChoi(AgentConfig c, DateTimeOffset now)
    {
        bool doi = false;
        // đồng hồ lùi (giờ máy chỉnh lại) ⇒ bắt đầu đếm lại từ bây giờ, không để mốc tương lai treo mãi
        if (c.TuChoiTu == null || c.TuChoiTu > now) { c.TuChoiTu = now; doi = true; }
        return ApDung(c, now) || doi;
    }

    /// <summary>Đồng bộ thành công ⇒ hết mồ côi. → true nếu cấu hình đổi.</summary>
    public static bool GhiThanhCong(AgentConfig c)
    {
        if (c.TuChoiTu == null) return false;
        c.TuChoiTu = null;
        return true;
    }

    public static bool La(AgentConfig? c, DateTimeOffset now) => c?.TuChoiTu is { } t && now >= t && now - t >= Nguong;

    /// <summary>Đã mồ côi ⇒ ghi hẳn vào cấu hình: chế độ giám sát + bỏ Policy cuối (khởi động lại cũng không áp lại luật cũ). → true nếu đổi.</summary>
    public static bool ApDung(AgentConfig c, DateTimeOffset now)
    {
        if (!La(c, now)) return false;
        bool doi = c.CheDo != CheDoAgent.GiamSat || c.LastPolicyJson != null || c.LastPolicyAt != null;
        c.CheDo = CheDoAgent.GiamSat;
        c.LastPolicyJson = null;
        c.LastPolicyAt = null;
        return doi;
    }

    public const string CauKhay = "Máy đã bị bỏ khỏi gia đình nên AiiGrow không chặn gì nữa. Ba Mẹ gỡ hẳn ở Cài đặt › Ứng dụng › AiiGrow.";
}

/// <summary>Các thao tác hệ thống khi gỡ (Windows: <see cref="WindowsCleanupOps"/>). Mỗi thao tác phải chịu được việc chạy lại (đã gỡ rồi thì thôi).</summary>
public interface ICleanupOps
{
    /// <summary>Tắt khôi phục của SCM (sc failure … actions= "" + failureflag 0) và đặt start= disabled ⇒ dịch vụ thoát rồi không bị bật lại.</summary>
    void TatKhoiPhucDichVu();
    /// <summary>Dừng + xoá dịch vụ ngay (chỉ dùng từ BỘ GỠ bên ngoài, không bao giờ từ trong chính dịch vụ).</summary>
    void DungVaXoaDichVu();
    /// <summary>Hẹn một tác vụ TÁCH RỜI (Task Scheduler, SYSTEM): chờ dịch vụ thoát ⇒ sc delete ⇒ xoá thư mục ⇒ tự xoá tác vụ. Chạy ngay + lúc khởi động.</summary>
    void HenDonTachRoi();
    void GoAppLocker();
    void GoKhay();
    void GoThongBaoDangNhap();
    void GoMucUngDung();
    /// <summary>Xoá cấu hình (token) — sau bước này không còn báo được máy chủ.</summary>
    void XoaCauHinh();
    /// <summary>Xoá thư mục cài + dữ liệu. → true nếu đã xoá hết.</summary>
    bool XoaThuMuc();
}

public static partial class SystemCleanup
{
    /// <summary>
    /// Gỡ sạch, theo thứ tự an toàn. Mỗi bước bọc riêng (bước này lỗi vẫn làm bước sau) ⇒ chạy lại bao nhiêu lần cũng được.
    /// <paramref name="tuDichVu"/> = true: chính dịch vụ tự gỡ (lệnh «go») — KHÔNG Stop-Service chính mình (huỷ giữa chừng / SCM bật lại);
    /// thay vào đó tắt khôi phục + start=disabled, hẹn tác vụ tách rời dọn nốt sau khi dịch vụ thoát.
    /// </summary>
    public static string Run(ICleanupOps ops, bool tuDichVu)
    {
        var log = new StringBuilder();
        void Buoc(string ten, Action a)
        {
            try { a(); log.AppendLine("✓ " + ten); }
            catch (Exception e) { log.AppendLine("✗ " + ten + ": " + e.Message); }
        }

        // 1. Trước hết: SCM không được bật lại dịch vụ (dù gỡ hỏng giữa chừng).
        Buoc("Tắt tự khởi động lại của dịch vụ", ops.TatKhoiPhucDichVu);
        if (tuDichVu)
            Buoc("Hẹn dọn nốt sau khi dịch vụ dừng", ops.HenDonTachRoi);   // hẹn sớm: lỡ dịch vụ chết ở bước sau vẫn được dọn
        else
            Buoc("Dừng và xoá dịch vụ", ops.DungVaXoaDichVu);              // dịch vụ đã dừng ⇒ không còn ai áp lại luật AppLocker
        Buoc("Gỡ luật AppLocker của AiiGrow", ops.GoAppLocker);
        Buoc("Gỡ khay tự chạy", ops.GoKhay);
        Buoc("Gỡ thông báo đăng nhập", ops.GoThongBaoDangNhap);
        Buoc("Gỡ mục AiiGrow trong Cài đặt › Ứng dụng", ops.GoMucUngDung);
        Buoc("Xoá cấu hình và token", ops.XoaCauHinh);
        if (!tuDichVu)
        {
            bool het = false;
            Buoc("Xoá tệp cài và dữ liệu", () => het = ops.XoaThuMuc());
            if (!het) Buoc("Hẹn xoá nốt tệp còn lại", ops.HenDonTachRoi);
        }
        log.AppendLine("Tài khoản của Con vẫn là tài khoản thường; nâng quyền lại nếu cần.");
        return log.ToString();
    }

    public const string TenTacVuDon = "AiiGrow-Dontay";

    /// <summary>Kịch bản PowerShell cho tác vụ dọn tách rời. Chạy lại an toàn: thiếu thứ gì thì bỏ qua; xoá xong hết mới tự xoá tác vụ.</summary>
    public static string KichBanDonTachRoi(string serviceName, string installDir, string dataDir, string uninstallKey)
    {
        string Q(string s) => "'" + s.Replace("'", "''") + "'";
        var inst = Q(installDir); var data = Q(dataDir);
        return string.Join("\n", new[]
        {
            "$ErrorActionPreference='SilentlyContinue'",
            $"$n={Q(serviceName)}",
            // chờ dịch vụ tự thoát (đang dọn AppLocker…) tối đa 3 phút rồi mới ép dừng
            "for($i=0;$i -lt 90;$i++){ $s=Get-Service -Name $n; if(-not $s -or $s.Status -eq 'Stopped'){break}; Start-Sleep -Seconds 2 }",
            "& sc.exe failure $n reset= 0 actions= '\"\"' | Out-Null",
            "& sc.exe config $n start= disabled | Out-Null",
            "Stop-Service -Name $n -Force",
            "Get-Process -Name 'AiiGrow.Service','AiiGrow.Tray' | Stop-Process -Force",
            "& sc.exe delete $n | Out-Null",
            $"Remove-Item -LiteralPath {Q("HKLM:\\" + uninstallKey)} -Recurse -Force",
            $"for($i=0;$i -lt 150;$i++){{ Remove-Item -LiteralPath {inst} -Recurse -Force; Remove-Item -LiteralPath {data} -Recurse -Force; " +
            $"if(-not (Test-Path -LiteralPath {inst}) -and -not (Test-Path -LiteralPath {data})){{break}}; Start-Sleep -Seconds 2 }}",
            $"if(-not (Test-Path -LiteralPath {inst}) -and -not (Test-Path -LiteralPath {data})){{ Unregister-ScheduledTask -TaskName {Q(TenTacVuDon)} -Confirm:$false }}",
        });
    }
}

/// <summary>Gỡ tại máy (AiiGrow.Setup.exe --uninstall, gọi từ Cài đặt › Ứng dụng hoặc PowerShell quyền quản trị).</summary>
public static class LocalUninstall
{
    /// <param name="baoMayChu">POST /api/device/da-go bằng token máy (máy rời gia đình ngay, Ba Mẹ không phải chờ 7 ngày).</param>
    public static async Task<string> RunAsync(ConfigStore store, Func<AgentConfig, CancellationToken, Task> baoMayChu, ICleanupOps ops)
    {
        var log = new StringBuilder();
        var cfg = store.Load();
        if (cfg is { Paired: true })
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
                await baoMayChu(cfg, cts.Token);
                log.AppendLine("✓ Đã báo máy chủ: máy rời gia đình trên app Ba Mẹ.");
            }
            catch (ApiException e) when (e.IsUnauthorized)
            {
                log.AppendLine("✓ Máy đã không còn trong gia đình trên app Ba Mẹ.");
            }
            catch (Exception e)
            {
                log.AppendLine("! Chưa báo được máy chủ (" + e.Message + "). Trên app Ba Mẹ: máy › Gỡ AiiGrow, rồi «Xoá hẳn» khi được phép.");
            }
        }
        // Chỉ xoá token SAU khi đã báo (bước XoaCauHinh nằm trong SystemCleanup.Run).
        log.Append(SystemCleanup.Run(ops, tuDichVu: false));
        return log.ToString();
    }
}
