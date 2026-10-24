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
        bool doi = c.TuChoiTu != null || c.MatLienLacChayGiay != 0;
        c.TuChoiTu = null;
        c.MatLienLacChayGiay = 0;   // liên lạc được ⇒ đồng hồ đơn điệu đếm lại từ 0
        if (c.LienLacCuoi == null || c.LienLacCuoi > now || now - c.LienLacCuoi >= TimeSpan.FromHours(1)) { c.LienLacCuoi = now; doi = true; }
        return doi;
    }

    /// <summary>Token bị từ chối liên tục quá 6 giờ.</summary>
    public static bool TuChoiLau(AgentConfig? c, DateTimeOffset now) => c?.TuChoiTu is { } t && now >= t && now - t >= Nguong;
    /// <summary>Không đồng bộ được lần nào quá 14 ngày (mọi loại lỗi). Cần CẢ HAI đồng hồ: đồng hồ thật (<see cref="AgentConfig.LienLacCuoi"/>)
    /// VÀ thời gian chạy cộng dồn theo đồng hồ đơn điệu (<see cref="AgentConfig.MatLienLacChayGiay"/>) đều ≥ 14 ngày —
    /// chỉnh giờ máy (BIOS/UEFI) tới trước không đủ để mở chặn.</summary>
    /// <summary>Thời gian máy BẬT mà không liên lạc được (đồng hồ đơn điệu) cần đạt — 72 giờ: đủ chặn trò chỉnh lịch BIOS,
    /// nhưng máy chỉ bật vài giờ/ngày vẫn tự thả trong ~2–3 tuần khi máy chủ chết thật (Thanh 22/10: không được để máy kẹt).</summary>
    public static readonly TimeSpan NguongChayLienLac = TimeSpan.FromHours(72);

    public static bool MatLienLacLau(AgentConfig? c, DateTimeOffset now) =>
        c?.LienLacCuoi is { } t && now >= t && now - t >= NguongLienLac && c.MatLienLacChayGiay >= NguongChayLienLac.TotalSeconds;

    /// <summary>Trần mỗi lần cộng (giây): vòng thực thi ~5 giây/lần (+ thời gian đồng bộ). Một bước nhảy lớn giữa hai vòng
    /// (ngủ/ngủ đông, treo) bị cắt ở trần này ⇒ không thổi phồng được thời gian mất liên lạc.</summary>
    public const double TranMoiVongGiay = 30;

    /// <summary>Cộng thời gian chạy (đo bằng hiệu <see cref="Environment.TickCount64"/> giữa hai vòng, KHÔNG dùng đồng hồ thật) vào bộ đếm mất liên lạc.
    /// Âm / 0 ⇒ bỏ qua; quá <see cref="TranMoiVongGiay"/> ⇒ cắt. → true nếu cấu hình đổi.</summary>
    public static bool CongChay(AgentConfig c, double giay)
    {
        if (!(giay > 0)) return false;
        c.MatLienLacChayGiay += Math.Min(giay, TranMoiVongGiay);
        return true;
    }

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
    /// <summary>Lệnh PowerShell (chạy bằng quyền quản trị) gỡ TAY chỉ các luật AppLocker của AiiGrow (Name bắt đầu bằng «AiiGrow: »),
    /// giữ nguyên luật khác. Không cần tệp nào của AiiGrow (tác vụ dọn có thể đã xoá Setup.exe). Máy chủ (server/lib/may-con.ts) có bản giống hệt.</summary>
    public const string LenhGoTayAppLocker =
        "$p=[xml](Get-AppLockerPolicy -Local -Xml -ErrorAction Stop); " +
        "@($p.AppLockerPolicy.RuleCollection.ChildNodes | ?{ $_.Name -like 'AiiGrow: *' }) | %{ [void]$_.ParentNode.RemoveChild($_) }; " +
        "$f=\"$env:TEMP\\aiigrow-applocker.xml\"; $p.Save($f); Set-AppLockerPolicy -XmlPolicy $f -ErrorAction Stop";

    public const string CanhBaoAppLocker =
        "CHƯA gỡ được luật chặn (AppLocker) của AiiGrow — AiiGrow sẽ tự thử lại mỗi lần khởi động máy.\n" +
        "Gỡ tay ngay: trên máy Con mở PowerShell bằng quyền quản trị (Run as administrator) và chạy:\n  " + LenhGoTayAppLocker;

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
            // Trả quyền quản trị cho Con TRƯỚC cổng AppLocker: dịch vụ đã xoá, bước này độc lập + chạy lại được ⇒ gỡ luật hỏng
            // cũng KHÔNG để Con bị hạ quyền (tác vụ dọn tách rời còn mang SID để trả lại lần nữa làm lưới đỡ).
            kq.QuyenAdminTra = Buoc(log, "Trả quyền quản trị cho tài khoản Con", ops.TraQuyenQuanTri);
        }

        // Chính sách web của trình duyệt (URLBlocklist…): gỡ TRƯỚC cổng AppLocker — luật chặn web hỏng không được để Con kẹt.
        if (ops is IWebCleanup web) Buoc(log, "Gỡ chính sách chặn web của trình duyệt", web.GoChinhSachWeb);

        // CỔNG: gỡ luật AppLocker. Hỏng ⇒ dừng lại, chưa đụng config/dịch vụ; lần sau thử lại (gỡ tại máy: hẹn tác vụ tách rời cũng gỡ luật).
        kq.AppLockerGo = Buoc(log, "Gỡ luật AppLocker của AiiGrow", ops.GoAppLocker);
        if (!kq.AppLockerGo)
        {
            if (!tuDichVu) Buoc(log, "Hẹn dọn nốt (gồm gỡ luật AppLocker) sau khi dịch vụ thoát", ops.HenDonTachRoi);
            log.AppendLine(CanhBaoAppLocker);
            kq.Log = log.ToString();
            return kq;
        }

        // Dịch vụ tự gỡ: trả quyền SAU cổng (dịch vụ còn sống — chưa gỡ được luật thì máy vẫn được quản lý), TRƯỚC khi xoá cấu hình.
        if (tuDichVu) kq.QuyenAdminTra = Buoc(log, "Trả quyền quản trị cho tài khoản Con", ops.TraQuyenQuanTri);

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
        if (ops is IWebCleanup web) Buoc(log, "Gỡ chính sách chặn web của trình duyệt", web.GoChinhSachWeb);
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
    /// <param name="traQuyen">tài khoản đã bị hạ lúc cài (<see cref="AgentConfig.DaHaQuyen"/>) — tác vụ thêm lại vào nhóm mỗi lần chạy (lưới đỡ khi
    /// bộ gỡ chưa trả được quyền; đã là thành viên thì bỏ qua). Chỉ nhúng SID hợp lệ.</param>
    /// <summary>Nén gzip + base64 rồi bọc bằng vài dòng PowerShell giải nén chạy lại. Lý do: kịch bản đi qua HAI lớp -EncodedCommand (tham số tác vụ rồi lệnh đăng ký tác vụ),
    /// mỗi lớp nở ≈ 2,7 lần, mà dòng lệnh Windows tối đa ~32K ký tự — thêm phần gỡ luật web theo hive Con (0.2.6) làm e2e lỗi «The filename or extension is too long».</summary>
    public static string BocNen(string script)
    {
        using var ms = new MemoryStream();
        using (var gz = new System.IO.Compression.GZipStream(ms, System.IO.Compression.CompressionLevel.SmallestSize, true))
        {
            var b = Encoding.UTF8.GetBytes(script);
            gz.Write(b, 0, b.Length);
        }
        return "$m=New-Object IO.MemoryStream(,[Convert]::FromBase64String('" + Convert.ToBase64String(ms.ToArray()) + "'));" +
               "$z=New-Object IO.Compression.GzipStream($m,[IO.Compression.CompressionMode]::Decompress);" +
               "$r=New-Object IO.StreamReader($z,[Text.Encoding]::UTF8);Invoke-Expression $r.ReadToEnd()";
    }

    public static string KichBanDonTachRoi(string serviceName, string installDir, string dataDir, string uninstallKey, IEnumerable<QuyenDaHa>? traQuyen = null)
    {
        string Q(string s) => "'" + s.Replace("'", "''") + "'";
        var inst = Q(installDir); var data = Q(dataDir);
        var tien = Q(AppLockerXml.Prefix);
        var ds = (traQuyen ?? Enumerable.Empty<QuyenDaHa>())
            .Where(q => AppLockerXml.IsValidSid(q.Sid) && AppLockerXml.IsValidSid(q.Nhom))
            .Select(q => $"try {{ Add-LocalGroupMember -SID {Q(q.Nhom)} -Member {Q(q.Sid)} -ErrorAction Stop }} catch {{}}").Distinct().ToList();
        var traQuyenDong = ds.Count == 0 ? "# không có tài khoản nào bị hạ quyền" : string.Join("\n", ds);
        return string.Join("\n", new[]
        {
            "$ErrorActionPreference='SilentlyContinue'",
            // Lưới đỡ: trả quyền quản trị cho Con (chạy lại được — đã là thành viên thì lỗi MemberExists bị bỏ qua).
            traQuyenDong,
            $"$n={Q(serviceName)}",
            // chờ dịch vụ tự thoát (đang dọn AppLocker…) tối đa 3 phút rồi mới ép dừng
            "for($i=0;$i -lt 90;$i++){ $s=Get-Service -Name $n; if(-not $s -or $s.Status -eq 'Stopped'){break}; Start-Sleep -Seconds 2 }",
            "& sc.exe failure $n reset= 0 actions= '\"\"' | Out-Null",
            "& sc.exe config $n start= disabled | Out-Null",
            "Stop-Service -Name $n -Force",
            "Get-Process -Name 'AiiGrow.Service','AiiGrow.Tray' | Stop-Process -Force",
            "& sc.exe delete $n | Out-Null",
            // Lưới đỡ: gỡ chính sách chặn web của trình duyệt (chỉ giá trị của AiiGrow).
            WebGuard.KichBanGoChinhSach(),
            // Lưới đỡ: gỡ luật AppLocker của AiiGrow. $goLuat trả $true nếu SAU KHI gỡ không còn luật nào của mình.
            // Lỗi (kể cả lỗi không dừng) ⇒ $false: -ErrorAction Stop + coi chính sách $null là CHƯA sạch (không tự huỷ tác vụ nhầm).
            "function Remove-AiiAppLocker {",
            "  $ErrorActionPreference='Stop'",
            "  try {",
            "    [xml]$p = Get-AppLockerPolicy -Local -Xml -ErrorAction Stop",
            "    if ($null -eq $p -or $null -eq $p.DocumentElement -or $p.DocumentElement.LocalName -ne 'AppLockerPolicy') { return $false }",
            $"    $ds = @($p.DocumentElement.ChildNodes | ForEach-Object {{ $_.ChildNodes }} | Where-Object {{ $_ -is [Xml.XmlElement] -and $_.GetAttribute('Name').StartsWith({tien}) }})",
            "    if ($ds.Count -gt 0) { $ds | ForEach-Object { [void]$_.ParentNode.RemoveChild($_) }; $f = [IO.Path]::GetTempFileName(); $p.Save($f); Set-AppLockerPolicy -XmlPolicy $f -ErrorAction Stop; Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }",
            "    [xml]$c = Get-AppLockerPolicy -Local -Xml -ErrorAction Stop",
            "    if ($null -eq $c -or $null -eq $c.DocumentElement -or $c.DocumentElement.LocalName -ne 'AppLockerPolicy') { return $false }",
            $"    return @($c.DocumentElement.ChildNodes | ForEach-Object {{ $_.ChildNodes }} | Where-Object {{ $_ -is [Xml.XmlElement] -and $_.GetAttribute('Name').StartsWith({tien}) }}).Count -eq 0",
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

/// <summary>Cài lại đè lên máy đã cài: GIỮ bản ghi tài khoản đã bị hạ quyền (<see cref="AgentConfig.DaHaQuyen"/>) của lần cài trước.
/// Lúc cài lại, Con đã là tài khoản thường (IsAdmin=false) nên bộ cài không ghi lại được — ghi đè cấu hình mà bỏ danh sách cũ
/// thì gỡ sau này không còn gì để trả quyền.</summary>
public static class CaiLai
{
    /// <summary>Gộp (không trùng theo Sid + Nhóm) danh sách đã hạ quyền: cũ trước, mới sau. → <paramref name="moi"/>.</summary>
    public static AgentConfig GopDaHaQuyen(AgentConfig? cu, AgentConfig moi)
    {
        var ds = new List<QuyenDaHa>();
        foreach (var q in (cu?.DaHaQuyen ?? new()).Concat(moi.DaHaQuyen ?? new()))
            if (q != null && !string.IsNullOrEmpty(q.Sid) && !ds.Any(x => x.Sid == q.Sid && x.Nhom == q.Nhom)) ds.Add(q);
        moi.DaHaQuyen = ds;
        return moi;
    }

    /// <summary>Ghi cấu hình mới khi cài, giữ <see cref="AgentConfig.DaHaQuyen"/> cũ (cấu hình cũ hỏng / không đọc được ⇒ coi như không có).</summary>
    public static void GhiGiuQuyen(ConfigStore store, AgentConfig moi)
    {
        AgentConfig? cu = null;
        try { cu = store.Load(); } catch { }
        store.Save(GopDaHaQuyen(cu, moi));
    }

    /// <summary>Thêm một tài khoản vừa bị hạ quyền (không thêm trùng). → true nếu đổi.</summary>
    public static bool ThemDaHa(AgentConfig c, string sid, string nhom = "S-1-5-32-544")
    {
        if (c.DaHaQuyen.Any(x => x.Sid == sid && x.Nhom == nhom)) return false;
        c.DaHaQuyen.Add(new QuyenDaHa { Sid = sid, Nhom = nhom });
        return true;
    }
}
