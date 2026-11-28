using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text.Json;

namespace AiiGrow.Core;

/// <summary>Nguồn của một tài khoản cục bộ: mật khẩu nằm ở máy, hoặc liên kết tài khoản Microsoft (mật khẩu trực tuyến).
/// Thành viên miền / Entra ID của nhóm Administrators không phải tài khoản cục bộ ⇒ không được liệt kê (coi là có bảo vệ).</summary>
public enum NguonTaiKhoan { CucBo, Microsoft }

/// <summary>Một tài khoản trên máy. <paramref name="Rid"/> = số cuối của SID (500 = Administrator dựng sẵn).
/// <paramref name="LaQuanTri"/> = thuộc nhóm Administrators (S-1-5-32-544), kể cả qua nhóm lồng.</summary>
public sealed record TaiKhoanQuanTri(string Ten, string TenHienThi, int Rid, bool DangBat, bool LaQuanTri, NguonTaiKhoan Nguon);

/// <summary>Kết quả thử đăng nhập mật khẩu trống của một tài khoản cục bộ.</summary>
public enum KiemMatKhau { Trong, CoMatKhau, KhongRo }

/// <summary>Một lượt kiểm đã làm (giữ trong bộ nhớ + lưu đĩa để dịch vụ khởi động lại không thử lại liền tay).</summary>
public sealed class LuotKiemQuanTri
{
    public KiemMatKhau KetQua { get; set; }
    public DateTimeOffset Luc { get; set; }
    /// <summary>Số lượt «chưa rõ» liền nhau đang giữ kết quả trước (quá <see cref="QuanTriTrong.GiuKhiChuaRo"/> ⇒ thôi giữ).</summary>
    public int ChuaRo { get; set; }
}

/// <summary>
/// #860: tài khoản quản trị nào trên máy chưa có lớp bảo vệ (mật khẩu trống) — bé vào thẳng tài khoản đó, hoặc bấm «Có» ở UAC, là vượt mọi lớp chặn.
/// Phần quyết định (danh sách tài khoản + kết quả kiểm từng tài khoản ⇒ danh sách trống, và khi nào được thử lại) là hàm thuần để test;
/// lời gọi Win32 nằm ở <see cref="QuanTriTrongMay"/>.
/// </summary>
/// <remarks>
/// Thử LogonUser với mật khẩu sai được tính MỘT lần nhập sai vào ngưỡng khoá tài khoản (Windows 11 mặc định 10 lần / 10 phút).
/// Vì vậy chỉ tài khoản đang TRỐNG mới được kiểm lại dày (<see cref="KiemLaiKhiTrong"/>: lượt đó đăng nhập thành công, không tính lần sai);
/// tài khoản đã có mật khẩu / chưa rõ thì cách <see cref="KiemLaiKhiCoMatKhau"/> mới thử lại, và mốc thử lưu đĩa nên dịch vụ khởi động lại
/// (cập nhật, lỗi lặp) không thử thêm.
/// </remarks>
public static class QuanTriTrong
{
    public static readonly TimeSpan KiemLaiKhiTrong = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan KiemLaiKhiCoMatKhau = TimeSpan.FromHours(6);

    public const int RidAdministrator = 500;
    /// <summary>Đang trống mà kiểm lại ra «chưa rõ» tối đa bấy nhiêu lượt liền vẫn giữ «trống» (lỗi thoáng qua); quá ⇒ ghi «chưa rõ», 6 giờ thử lại.</summary>
    public const int GiuKhiChuaRo = 3;

    /// <summary>Tài khoản cần thử mật khẩu: đang bật, thuộc Administrators, tài khoản cục bộ thuần.
    /// Tài khoản Microsoft (và miền / Entra — không có trong danh sách cục bộ) có mật khẩu trực tuyến (PIN, Windows Hello cũng là lớp bảo vệ) ⇒ không thử.
    /// Administrator dựng sẵn (RID 500) đi cùng luật này: tắt (mặc định) ⇒ bỏ qua, bật ⇒ kiểm.</summary>
    public static bool CanKiem(TaiKhoanQuanTri t) => t.DangBat && t.LaQuanTri && t.Nguon == NguonTaiKhoan.CucBo;

    /// <summary>Khoá lưu lượt kiểm: RID + tên (đổi tên / xoá rồi tạo lại ⇒ tính là tài khoản mới, kiểm ngay).</summary>
    public static string Khoa(TaiKhoanQuanTri t) => t.Rid + ":" + t.Ten.ToLowerInvariant();

    /// <summary>Đã tới lúc thử lại tài khoản này chưa (null = chưa kiểm lần nào).</summary>
    public static bool DenHanKiem(LuotKiemQuanTri? truoc, DateTimeOffset now)
    {
        if (truoc == null) return true;
        if (truoc.Luc > now) return false;   // đồng hồ máy lùi ⇒ CHƯA tới hạn (Tinh đặt lại mốc = now) — đổi giờ không làm thử dày
        var han = truoc.KetQua == KiemMatKhau.Trong ? KiemLaiKhiTrong : KiemLaiKhiCoMatKhau;
        return now - truoc.Luc >= han;
    }

    /// <summary>Mã lỗi LogonUser (mật khẩu trống, LOGON32_LOGON_NETWORK) ⇒ kết quả. <paramref name="ok"/> = LogonUser trả true.</summary>
    public static KiemMatKhau TuLogonUser(bool ok, int loi) => ok ? KiemMatKhau.Trong : loi switch
    {
        1327 => KiemMatKhau.Trong,      // ERROR_ACCOUNT_RESTRICTION: chính sách LimitBlankPasswordUse — mật khẩu trống ĐÚNG nhưng cấm đăng nhập mạng
        1330 => KiemMatKhau.Trong,      // ERROR_PASSWORD_EXPIRED: mật khẩu (trống) đúng, đã hết hạn
        1907 => KiemMatKhau.Trong,      // ERROR_PASSWORD_MUST_CHANGE: mật khẩu (trống) đúng, phải đổi ở lần đăng nhập tới
        1385 => KiemMatKhau.Trong,      // ERROR_LOGON_TYPE_NOT_GRANTED: quyền đăng nhập kiểm SAU khi mật khẩu đúng
        1326 => KiemMatKhau.CoMatKhau,  // ERROR_LOGON_FAILURE: sai mật khẩu ⇒ có mật khẩu
        _ => KiemMatKhau.KhongRo,       // 1331 tắt, 1909 bị khoá, 1793 hết hạn tài khoản, lỗi khác ⇒ không báo (tránh báo nhầm)
    };

    /// <summary>
    /// Một lượt: tài khoản cần kiểm mà tới hạn thì gọi <paramref name="kiem"/> (thử đăng nhập), còn lại dùng kết quả cũ trong <paramref name="soKiem"/>.
    /// Sửa <paramref name="soKiem"/> tại chỗ (thêm lượt mới; tài khoản không còn cần kiểm chỉ bỏ khi lượt cũ đã hết hạn — tắt/bật lại hay rời nhóm
    /// thoáng qua không làm mất mốc chống thử dày). → tên hiển thị các tài khoản quản trị trống, sắp xếp (mỗi tài khoản một dòng, kể cả trùng tên hiển thị).
    /// <paramref name="doi"/> = sổ đã đổi (cần lưu).
    /// </summary>
    public static List<string> Tinh(IEnumerable<TaiKhoanQuanTri> ds, IDictionary<string, LuotKiemQuanTri> soKiem,
        Func<TaiKhoanQuanTri, KiemMatKhau> kiem, DateTimeOffset now) => Tinh(ds, soKiem, kiem, now, out _);

    public static List<string> Tinh(IEnumerable<TaiKhoanQuanTri> ds, IDictionary<string, LuotKiemQuanTri> soKiem,
        Func<TaiKhoanQuanTri, KiemMatKhau> kiem, DateTimeOffset now, out bool doi)
    {
        doi = false;
        var trong = new List<string>();
        var conDung = new HashSet<string>(StringComparer.Ordinal);
        foreach (var t in ds)
        {
            if (!CanKiem(t)) continue;
            var k = Khoa(t);
            conDung.Add(k);
            soKiem.TryGetValue(k, out var truoc);
            if (truoc != null && truoc.Luc > now) { truoc.Luc = now; doi = true; }
            if (DenHanKiem(truoc, now))
            {
                var kq = kiem(t);
                // chưa rõ (lỗi thoáng qua, tài khoản đang bị khoá…) ⇒ giữ kết quả trước: đang trống thì vẫn báo trống và thử lại sau 5 phút,
                // không báo «đã ổn» nhầm; chưa từng kiểm thì chờ 6 giờ (không thử dày tài khoản đang có chuyện)
                var chuaRo = 0;
                if (kq == KiemMatKhau.KhongRo && truoc != null && truoc.KetQua != KiemMatKhau.KhongRo && truoc.ChuaRo < GiuKhiChuaRo)
                { kq = truoc.KetQua; chuaRo = truoc.ChuaRo + 1; }
                soKiem[k] = truoc = new LuotKiemQuanTri { KetQua = kq, Luc = now, ChuaRo = chuaRo };
                doi = true;
            }
            if (truoc!.KetQua == KiemMatKhau.Trong) trong.Add(string.IsNullOrWhiteSpace(t.TenHienThi) ? t.Ten : t.TenHienThi.Trim());
        }
        foreach (var k in soKiem.Where(x => !conDung.Contains(x.Key) && DenHanKiem(x.Value, now)).Select(x => x.Key).ToList()) { soKiem.Remove(k); doi = true; }
        return trong.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
    }

    // ---- sổ kiểm trên đĩa (C:\ProgramData\AiiGrow, chỉ SYSTEM + Administrators đọc) ----

    public static Dictionary<string, LuotKiemQuanTri> DocSo(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<Dictionary<string, LuotKiemQuanTri>>(json, Json.Options) ?? new(); }
        catch (JsonException) { return new(); }
    }

    public static string GhiSo(IDictionary<string, LuotKiemQuanTri> so) => JsonSerializer.Serialize(so, Json.Options);
}

/// <summary>Đọc tài khoản quản trị + thử mật khẩu trống bằng Win32 (chỉ chạy trên Windows, dịch vụ LocalSystem).</summary>
public static class QuanTriTrongMay
{
    public static string SoKiemFile => Path.Combine(Paths.DataDir, "quan-tri-trong.json");

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct USER_INFO_20 { public string usri20_name; public string usri20_full_name; public string usri20_comment; public uint usri20_flags; public uint usri20_user_id; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct USER_INFO_24 { [MarshalAs(UnmanagedType.Bool)] public bool usri24_internet_identity; public uint usri24_flags; public string usri24_internet_provider_name; public string usri24_internet_principal_name; public IntPtr usri24_user_sid; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct LOCALGROUP_USERS_INFO_0 { public string lgrui0_name; }

    [DllImport("netapi32.dll", CharSet = CharSet.Unicode)]
    private static extern int NetUserEnum(string? server, int level, int filter, out IntPtr buf, int prefMax, out int read, out int total, ref int resume);
    [DllImport("netapi32.dll", CharSet = CharSet.Unicode)]
    private static extern int NetUserGetInfo(string? server, string user, int level, out IntPtr buf);
    [DllImport("netapi32.dll", CharSet = CharSet.Unicode)]
    private static extern int NetUserGetLocalGroups(string? server, string user, int level, int flags, out IntPtr buf, int prefMax, out int read, out int total);
    [DllImport("netapi32.dll")]
    private static extern int NetApiBufferFree(IntPtr buf);
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool LogonUser(string user, string domain, string pass, int type, int provider, out IntPtr token);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr h);

    private const int FilterNormalAccount = 2, MaxPreferred = -1, ErrorMoreData = 234, LgIncludeIndirect = 1, NerrUserNotFound = 2221;
    private const uint UfAccountDisable = 0x2;
    private const int LogonNetwork = 3, ProviderDefault = 0;

    /// <summary>Mọi tài khoản cục bộ thường trên máy, kèm cờ quản trị (nhóm lồng tính qua LG_INCLUDE_INDIRECT) và tài khoản Microsoft hay không.
    /// Thành viên miền / Entra ID của nhóm Administrators không phải tài khoản cục bộ ⇒ không có trong danh sách (đã có mật khẩu trực tuyến).
    /// Lỗi đọc danh sách ⇒ ném (không coi là «không có ai»).</summary>
    public static List<TaiKhoanQuanTri> DocMay()
    {
        var tenNhom = new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null).Translate(typeof(NTAccount)).Value.Split('\\')[^1];
        var ds = new List<TaiKhoanQuanTri>();
        int resume = 0, rc;
        do
        {
            rc = NetUserEnum(null, 20, FilterNormalAccount, out var buf, MaxPreferred, out var read, out _, ref resume);
            try
            {
                if (rc != 0 && rc != ErrorMoreData) throw new InvalidOperationException("NetUserEnum lỗi " + rc);
                var size = Marshal.SizeOf<USER_INFO_20>();
                for (int i = 0; i < read; i++)
                {
                    var u = Marshal.PtrToStructure<USER_INFO_20>(buf + i * size);
                    var bat = (u.usri20_flags & UfAccountDisable) == 0;
                    if (!bat) { ds.Add(new TaiKhoanQuanTri(u.usri20_name, u.usri20_full_name ?? "", (int)u.usri20_user_id, false, false, NguonTaiKhoan.CucBo)); continue; }
                    // tài khoản tắt không đọc nhóm / nguồn (lỗi ở tài khoản hệ thống không liên quan không làm hỏng cả lượt)
                    var qt = LaQuanTri(u.usri20_name, tenNhom);
                    if (qt == null) continue;   // vừa bị xoá giữa hai lời gọi
                    var nguon = qt == true ? Nguon(u.usri20_name) : NguonTaiKhoan.CucBo;
                    if (nguon == null) continue;
                    ds.Add(new TaiKhoanQuanTri(u.usri20_name, u.usri20_full_name ?? "", (int)u.usri20_user_id, true, qt.Value, nguon.Value));
                }
            }
            finally { if (buf != IntPtr.Zero) NetApiBufferFree(buf); }
        } while (rc == ErrorMoreData);
        return ds;
    }

    /// <summary>Đọc nhóm lỗi ⇒ ném (cả lượt lỗi, giữ kết quả cũ) — KHÔNG coi là «không phải quản trị» (sẽ báo «đã ổn» nhầm).</summary>
    private static bool? LaQuanTri(string user, string tenNhom)
    {
        var rc = NetUserGetLocalGroups(null, user, 0, LgIncludeIndirect, out var buf, MaxPreferred, out var read, out _);
        try
        {
            if (rc == NerrUserNotFound) return null;
            if (rc != 0) throw new InvalidOperationException("NetUserGetLocalGroups lỗi " + rc);
            var size = Marshal.SizeOf<LOCALGROUP_USERS_INFO_0>();
            for (int i = 0; i < read; i++)
                if (string.Equals(Marshal.PtrToStructure<LOCALGROUP_USERS_INFO_0>(buf + i * size).lgrui0_name, tenNhom, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }
        finally { if (buf != IntPtr.Zero) NetApiBufferFree(buf); }
    }

    /// <summary>USER_INFO_24.usri24_internet_identity = tài khoản cục bộ liên kết tài khoản Microsoft. Đọc lỗi ⇒ ném (không thử mật khẩu
    /// một tài khoản có thể là tài khoản Microsoft; cả lượt giữ kết quả cũ); tài khoản vừa bị xoá ⇒ null.</summary>
    private static NguonTaiKhoan? Nguon(string user)
    {
        var rc = NetUserGetInfo(null, user, 24, out var buf);
        try
        {
            if (rc == NerrUserNotFound) return null;
            if (rc != 0) throw new InvalidOperationException("NetUserGetInfo(24) lỗi " + rc);
            return Marshal.PtrToStructure<USER_INFO_24>(buf).usri24_internet_identity ? NguonTaiKhoan.Microsoft : NguonTaiKhoan.CucBo;
        }
        finally { if (buf != IntPtr.Zero) NetApiBufferFree(buf); }
    }

    /// <summary>Thử đăng nhập mạng với mật khẩu trống (không tạo phiên, không hiện gì). Sai ⇒ tính MỘT lần nhập sai — gọi thưa (QuanTriTrong.DenHanKiem).</summary>
    public static KiemMatKhau KiemTrong(TaiKhoanQuanTri t)
    {
        var ok = LogonUser(t.Ten, ".", "", LogonNetwork, ProviderDefault, out var tk);
        var loi = ok ? 0 : Marshal.GetLastWin32Error();
        if (ok) CloseHandle(tk);
        return QuanTriTrong.TuLogonUser(ok, loi);
    }
}
