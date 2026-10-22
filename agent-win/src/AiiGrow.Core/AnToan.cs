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

/// <summary>Fail-open khi máy bị bỏ rơi. HAI mốc, cái nào tới trước thì coi là mồ côi (về giám sát, gỡ luật, bỏ Policy cuối):
///   • <see cref="GioNguong"/> (6 giờ): máy chủ TỪ CHỐI token liên tục (401 token_sai — máy đã bị gỡ khỏi gia đình). 403 lạ / lỗi mạng KHÔNG tính.
///   • <see cref="NgayMatLienLac"/> (14 ngày): KHÔNG đồng bộ được lần nào (MỌI loại lỗi — máy chủ sập, tên miền hết hạn…). Tính từ <see cref="AgentConfig.LienLacCuoi"/>.
/// Trạng thái lưu trong cấu hình nên khởi động lại vẫn tính tiếp. Đồng bộ lại được ⇒ hết mồ côi, chạy bình thường trở lại.</summary>
public static class MoCoi
{
    public const int GioNguong = 6;
    public static readonly TimeSpan Nguong = TimeSpan.FromHours(GioNguong);
    public const int NgayMatLienLac = 14;
    public static readonly TimeSpan NguongLienLac = TimeSpan.FromDays(NgayMatLienLac);

    /// <summary>Máy chủ từ chối token (401 token_sai). → true nếu cấu hình đổi (cần lưu).</summary>
    public static bool GhiTuChoi(AgentConfig c, DateTimeOffset now)
    {
        bool doi = false;
        // đồng hồ lùi (giờ máy chỉnh lại) ⇒ bắt đầu đếm lại từ bây giờ, không để mốc tương lai treo mãi
        if (c.TuChoiTu == null || c.TuChoiTu > now) { c.TuChoiTu = now; doi = true; }
        return ApDung(c, now) || doi;
    }

    /// <summary>Đồng bộ thành công ⇒ hết mồ côi (xoá mốc từ chối) và ghi mốc liên lạc (tối đa ~1 giờ/lần để đỡ ghi đĩa). → true nếu cấu hình đổi.</summary>
    public static bool GhiThanhCong(AgentConfig c, DateTimeOffset now)
    {
        bool doi = c.TuChoiTu != null;
        c.TuChoiTu = null;
        if (c.LienLacCuoi == null || c.LienLacCuoi > now || now - c.LienLacCuoi >= TimeSpan.FromHours(1)) { c.LienLacCuoi = now; doi = true; }
        return doi;
    }

    /// <summary>Token bị từ chối liên tục quá 6 giờ.</summary>
    public static bool TuChoiLau(AgentConfig? c, DateTimeOffset now) => c?.TuChoiTu is { } t && now >= t && now - t >= Nguong;
    /// <summary>Không đồng bộ được lần nào quá 14 ngày (mọi loại lỗi).</summary>
    public static bool MatLienLacLau(AgentConfig? c, DateTimeOffset now) => c?.LienLacCuoi is { } t && now >= t && now - t >= NguongLienLac;

    public static bool La(AgentConfig? c, DateTimeOffset now) => TuChoiLau(c, now) || MatLienLacLau(c, now);

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

    public const string CauKhay = "AiiGrow tạm thôi chặn vì đã lâu không nhận được chỉ dẫn từ máy chủ. Khi có mạng và máy chủ nhận lại, AiiGrow chạy bình thường. Muốn gỡ hẳn: Cài đặt › Ứng dụng › AiiGrow.";
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
    /// <summary>Gỡ các luật AppLocker của AiiGrow (Name bắt đầu bằng «AiiGrow: »). Lỗi ⇒ NÉM (bước cổng, không được nuốt).</summary>
    void GoAppLocker();
    /// <summary>Trả lại quyền quản trị cho các tài khoản đã bị hạ lúc cài (đọc <see cref="AgentConfig.DaHaQuyen"/>). Lỗi ⇒ NÉM.</summary>
    void TraQuyenQuanTri();
    void GoKhay();
    void GoThongBaoDangNhap();
    void GoMucUngDung();
    /// <summary>Xoá cấu hình (token) — sau bước này không còn báo được máy chủ.</summary>
    void XoaCauHinh();
    /// <summary>Xoá thư mục cài + dữ liệu. → true nếu đã xoá hết.</summary>
    bool XoaThuMuc();
}

/// <summary>Kết quả gỡ. <see cref="AppLockerGo"/> = đã gỡ xong luật của mình (cổng — chưa xong thì KHÔNG đụng config/dịch vụ). </summary>
public sealed class KetQuaGo
{
    public string Log { get; set; } = "";
    public bool AppLockerGo { get; set; }
    public bool QuyenAdminTra { get; set; } = true;
    public bool Xong { get; set; }
}

public static partial class SystemCleanup
{
    public const string CanhBaoAppLocker =
        "CHƯA gỡ được luật chặn (AppLocker) của AiiGrow — KHÔNG gỡ tiếp để máy Con không bị kẹt luật chặn.\n" +
        "Hãy chạy lại bước gỡ (còn mạng thì thử lại tự động), hoặc trên máy Con mở PowerShell quyền quản trị và chạy:\n" +
        "  \"C:\\Program Files\\AiiGrow\\AiiGrow.Setup.exe\" --uninstall";

    private static bool Buoc(StringBuilder log, string ten, Action a)
    {
        try { a(); log.AppendLine("✓ " + ten); return true; }
        catch (Exception e) { log.AppendLine("✗ " + ten + ": " + e.Message); return false; }
    }

    /// <summary>
    /// Gỡ sạch, theo thứ tự an toàn, GỠ LUẬT APPLOCKER là CỔNG: chưa gỡ được luật của mình thì KHÔNG xoá config / dịch vụ (để Con không kẹt luật chặn vĩnh viễn).
    /// <paramref name="tuDichVu"/> = true: chính dịch vụ tự gỡ (lệnh «go») — KHÔNG Stop-Service chính mình (huỷ giữa chừng / SCM bật lại);
    /// vòng thực thi đã đứng yên (DangGo) nên gỡ AppLocker trước rồi mới hẹn tác vụ tách rời dọn nốt sau khi dịch vụ thoát.
    /// Mỗi bước bọc riêng ⇒ chạy lại bao nhiêu lần cũng được.
    /// </summary>
    public static KetQuaGo Run(ICleanupOps ops, bool tuDichVu)
    {
        var log = new StringBuilder();
        var kq = new KetQuaGo();

        if (!tuDichVu)
        {
            // Gỡ tại máy: dịch vụ còn chạy ⇒ tắt khôi phục + dừng/xoá dịch vụ TRƯỚC khi gỡ luật (kẻo nó áp lại luật ngay sau khi gỡ).
            Buoc(log, "Tắt tự khởi động lại của dịch vụ", ops.TatKhoiPhucDichVu);
            Buoc(log, "Dừng và xoá dịch vụ", ops.DungVaXoaDichVu);
        }

        // CỔNG: gỡ luật AppLocker. Hỏng ⇒ dừng lại, chưa đụng config/dịch vụ; lần sau thử lại (gỡ tại máy: hẹn tác vụ tách rời cũng gỡ luật).
        kq.AppLockerGo = Buoc(log, "Gỡ luật AppLocker của AiiGrow", ops.GoAppLocker);
        if (!kq.AppLockerGo)
        {
            if (!tuDichVu) Buoc(log, "Hẹn dọn nốt (gồm gỡ luật AppLocker) sau khi dịch vụ thoát", ops.HenDonTachRoi);
            log.AppendLine(CanhBaoAppLocker);
            kq.Log = log.ToString();
            return kq;
        }

        // Trả quyền quản trị cho Con TRƯỚC khi xoá cấu hình (cần đọc DaHaQuyen trong cấu hình).
        kq.QuyenAdminTra = Buoc(log, "Trả quyền quản trị cho tài khoản Con", ops.TraQuyenQuanTri);

        if (tuDichVu)
        {
            // Dịch vụ tự gỡ: tắt khôi phục của SCM rồi hẹn tác vụ tách rời dọn dịch vụ + tệp sau khi dịch vụ thoát (không tự Stop-Service chính mình).
            Buoc(log, "Tắt tự khởi động lại của dịch vụ", ops.TatKhoiPhucDichVu);
            Buoc(log, "Hẹn dọn nốt sau khi dịch vụ dừng", ops.HenDonTachRoi);
        }
        Buoc(log, "Gỡ khay tự chạy", ops.GoKhay);
        Buoc(log, "Gỡ thông báo đăng nhập", ops.GoThongBaoDangNhap);
        Buoc(log, "Gỡ mục AiiGrow trong Cài đặt › Ứng dụng", ops.GoMucUngDung);
        Buoc(log, "Xoá cấu hình và token", ops.XoaCauHinh);
        if (!tuDichVu)
        {
            bool het = false;
            Buoc(log, "Xoá tệp cài và dữ liệu", () => het = ops.XoaThuMuc());
            if (!het) Buoc(log, "Hẹn xoá nốt tệp còn lại", ops.HenDonTachRoi);
        }
        kq.Xong = true;
        kq.Log = log.ToString();
        return kq;
    }

    /// <summary>Dọn phần CÒN LẠI khi dịch vụ tự gỡ, SAU khi đã gỡ AppLocker + trả quyền admin + ack (CommandProcessor làm riêng để báo đúng lúc).</summary>
    public static string DonPhanConLai(ICleanupOps ops)
    {
        var log = new StringBuilder();
        Buoc(log, "Tắt tự khởi động lại của dịch vụ", ops.TatKhoiPhucDichVu);
        Buoc(log, "Hẹn dọn nốt sau khi dịch vụ dừng", ops.HenDonTachRoi);
        Buoc(log, "Gỡ khay tự chạy", ops.GoKhay);
        Buoc(log, "Gỡ thông báo đăng nhập", ops.GoThongBaoDangNhap);
        Buoc(log, "Gỡ mục AiiGrow trong Cài đặt › Ứng dụng", ops.GoMucUngDung);
        Buoc(log, "Xoá cấu hình và token", ops.XoaCauHinh);
        return log.ToString();
    }

    public const string TenTacVuDon = "AiiGrow-Dontay";

    /// <summary>Kịch bản PowerShell cho tác vụ dọn tách rời (SYSTEM). Chạy lại an toàn: thiếu thứ gì thì bỏ qua.
    /// GỠ LUẬT APPLOCKER của AiiGrow (Name bắt đầu bằng «AiiGrow: ») như một LƯỚI ĐỠ, và CHỈ tự xoá tác vụ khi không còn luật nào của mình
    /// VÀ đã xoá hết tệp — không để Con kẹt luật chặn kể cả khi dịch vụ gỡ luật thất bại.</summary>
    public static string KichBanDonTachRoi(string serviceName, string installDir, string dataDir, string uninstallKey)
    {
        string Q(string s) => "'" + s.Replace("'", "''") + "'";
        var inst = Q(installDir); var data = Q(dataDir);
        var tien = Q(AppLockerXml.Prefix);
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
            // Lưới đỡ: gỡ luật AppLocker của AiiGrow. $goLuat trả $true nếu SAU KHI gỡ không còn luật nào của mình.
            "function Remove-AiiAppLocker {",
            "  try {",
            "    [xml]$p = Get-AppLockerPolicy -Local -Xml",
            $"    $ds = @($p.AppLockerPolicy.RuleCollection.ChildNodes | Where-Object {{ $_.Name -and $_.Name.StartsWith({tien}) }})",
            "    if ($ds.Count -gt 0) { $ds | ForEach-Object { [void]$_.ParentNode.RemoveChild($_) }; $f = [IO.Path]::GetTempFileName(); $p.Save($f); Set-AppLockerPolicy -XmlPolicy $f; Remove-Item -LiteralPath $f -Force }",
            "    [xml]$c = Get-AppLockerPolicy -Local -Xml",
            $"    return @($c.AppLockerPolicy.RuleCollection.ChildNodes | Where-Object {{ $_.Name -and $_.Name.StartsWith({tien}) }}).Count -eq 0",
            "  } catch { return $false }",
            "}",
            // thử tới 15 lần (AppIDSvc có thể chưa sẵn ngay sau khởi động), rồi đi tiếp
            "$luatSach=$false; for($i=0;$i -lt 15;$i++){ $luatSach = Remove-AiiAppLocker; if($luatSach){break}; Start-Sleep -Seconds 4 }",
            $"Remove-Item -LiteralPath {Q("HKLM:\\" + uninstallKey)} -Recurse -Force",
            $"$tepSach=$false; for($i=0;$i -lt 150;$i++){{ Remove-Item -LiteralPath {inst} -Recurse -Force; Remove-Item -LiteralPath {data} -Recurse -Force; " +
            $"$tepSach = -not (Test-Path -LiteralPath {inst}) -and -not (Test-Path -LiteralPath {data}); if($tepSach){{break}}; Start-Sleep -Seconds 2 }}",
            // CHỈ tự huỷ tác vụ khi đã gỡ hết luật của mình VÀ xoá hết tệp; còn luật thì giữ tác vụ để lần khởi động sau thử lại.
            $"if($luatSach -and $tepSach){{ Unregister-ScheduledTask -TaskName {Q(TenTacVuDon)} -Confirm:$false }}",
        });
    }
}

/// <summary>Gỡ tại máy (AiiGrow.Setup.exe --uninstall, gọi từ Cài đặt › Ứng dụng hoặc PowerShell quyền quản trị).</summary>
public static class LocalUninstall
{
    /// <param name="baoMayChu">POST /api/device/da-go bằng token máy (máy rời gia đình ngay, Ba Mẹ không phải chờ 7 ngày).</param>
    /// <returns>Kết quả: <see cref="KetQuaGo.AppLockerGo"/> = gỡ được luật chặn (người gỡ cần biết để KHÔNG tưởng là xong khi luật còn),
    /// <see cref="KetQuaGo.QuyenAdminTra"/> = đã trả quyền admin cho Con.</returns>
    public static async Task<KetQuaGo> RunAsync(ConfigStore store, Func<AgentConfig, CancellationToken, Task> baoMayChu, ICleanupOps ops)
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
        // Chỉ xoá token SAU khi đã báo (bước XoaCauHinh nằm trong SystemCleanup.Run); báo máy chủ xong rồi mới đụng hệ thống.
        var kq = SystemCleanup.Run(ops, tuDichVu: false);
        kq.Log = log.ToString() + kq.Log;
        return kq;
    }
}
