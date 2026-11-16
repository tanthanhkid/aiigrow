using AiiGrow.Core;
using AiiGrow.Tray;

namespace AiiGrow.Tests;

/// <summary>#308: màn hình chớp / mở trang chậm / bấm mở AiiGrow không lên — phần logic tách được.</summary>
public class KhongNhayTests
{
    // ------------------------------------------------------------ chạy một bản: bản sau gọi bản đang chạy hiện cửa sổ

    private static (string Mutex, string SuKien) Ten()
    {
        var g = Guid.NewGuid().ToString("N");
        return (@"Local\AiiGrowTest.Mutex." + g, @"Local\AiiGrowTest.SuKien." + g);
    }

    [Fact]
    public void BanSau_KhongPhaiBanDau_VaBaoDuocBanDangChay()
    {
        var (m, e) = Ten();
        using var dau = MotBanKhay.Nhan(m, e);
        Assert.True(dau.LaBanDau);
        using var daGoi = new ManualResetEventSlim(false);
        dau.KhiDuocGoi(() => daGoi.Set());

        // bản thứ hai chạy trên luồng khác (mutex thuộc luồng giữ nó)
        bool? sauLaDau = null, baoDuoc = null;
        var t = new Thread(() =>
        {
            using var sau = MotBanKhay.Nhan(m, e);
            sauLaDau = sau.LaBanDau;
            if (!sau.LaBanDau) baoDuoc = MotBanKhay.GoiBanDangChay(e, 1000);
        });
        t.Start();
        Assert.True(t.Join(5000));
        Assert.False(sauLaDau);
        Assert.True(baoDuoc);
        Assert.True(daGoi.Wait(5000), "bản đang chạy phải nhận lời gọi hiện cửa sổ");
    }

    [Fact]
    public void GoiNhieuLan_MoiLanDeuToi()
    {
        var (m, e) = Ten();
        using var dau = MotBanKhay.Nhan(m, e);
        var dem = 0;
        using var lan2 = new SemaphoreSlim(0);
        dau.KhiDuocGoi(() => { Interlocked.Increment(ref dem); lan2.Release(); });
        Assert.True(MotBanKhay.GoiBanDangChay(e, 500));
        Assert.True(lan2.Wait(5000));
        Assert.True(MotBanKhay.GoiBanDangChay(e, 500));
        Assert.True(lan2.Wait(5000));
        Assert.Equal(2, Volatile.Read(ref dem));
    }

    [Fact]
    public void KhongCoBanNaoChay_GoiTraFalse_KhongTreo()
    {
        var (_, e) = Ten();
        var sw = System.Diagnostics.Stopwatch.StartNew();
        Assert.False(MotBanKhay.GoiBanDangChay(e, 300));
        Assert.True(sw.ElapsedMilliseconds < 3000);
    }

    [Fact]
    public void BanDauDong_BanMoiLaiLaBanDau()
    {
        var (m, e) = Ten();
        using (var dau = MotBanKhay.Nhan(m, e)) Assert.True(dau.LaBanDau);
        using var lai = MotBanKhay.Nhan(m, e);
        Assert.True(lai.LaBanDau);
    }

    // ------------------------------------------------------------ màn khoá giữ trên cùng không gây nháy

    [Fact]
    public void ManKhoa_ChiKeoLenKhiTieuDiemOTienTrinhKhac()
    {
        Assert.True(GiuTrenCung.CanKeoLen(choDong: false, soFormCon: 0, coFormCuaMinhDangActive: false, foregroundLaCuaMinh: false));
        Assert.False(GiuTrenCung.CanKeoLen(false, 0, false, foregroundLaCuaMinh: true));    // đang ở cửa sổ của khay (app to, hộp nhập mã)
        Assert.False(GiuTrenCung.CanKeoLen(false, 0, coFormCuaMinhDangActive: true, false));
        Assert.False(GiuTrenCung.CanKeoLen(false, soFormCon: 1, false, false));            // hộp con đang mở
        Assert.False(GiuTrenCung.CanKeoLen(choDong: true, 0, false, false));
    }

    [Fact]
    public void TopMost_ChiDatKhiDoi()
    {
        Assert.False(GiuTrenCung.CanDatTopMost(dangTopMost: true, muon: true));
        Assert.False(GiuTrenCung.CanDatTopMost(false, false));
        Assert.True(GiuTrenCung.CanDatTopMost(false, true));
        Assert.True(GiuTrenCung.CanDatTopMost(true, false));
    }

    // ------------------------------------------------------------ chính sách trình duyệt: chỉ ghi khi đổi

    [Fact]
    public void Dword_GiongHet_KhongGhiLai()
    {
        Assert.False(WindowsWebPolicyRegistry.CanGhiDword(1, 1));
        Assert.False(WindowsWebPolicyRegistry.CanGhiDword(0, 0));
        Assert.True(WindowsWebPolicyRegistry.CanGhiDword(null, 1));     // chưa có
        Assert.True(WindowsWebPolicyRegistry.CanGhiDword(2, 1));        // khác giá trị
        Assert.True(WindowsWebPolicyRegistry.CanGhiDword("1", 1));      // REG_SZ «1» — Chrome đọc sai kiểu ⇒ ghi lại DWORD
        Assert.True(WindowsWebPolicyRegistry.CanGhiDword(1L, 1));       // REG_QWORD
    }

    [Fact]
    public void Dword_GhiThatVaoHkcu_LanHaiKhongDoiGioSua()
    {
        // ghi DWORD thật vào một khoá tạm HKCU: lần hai cùng giá trị không được ghi (giờ sửa khoá không đổi ⇒ trình duyệt không nạp lại chính sách)
        var goc = @"Software\AiiGrowTest\" + Guid.NewGuid().ToString("N");
        var reg = new WindowsWebPolicyRegistry(Microsoft.Win32.RegistryHive.CurrentUser, null);
        try
        {
            reg.DatDword(goc, "IncognitoModeAvailability", 1);
            var t1 = GioSua(goc);
            Thread.Sleep(50);
            reg.DatDword(goc, "IncognitoModeAvailability", 1);
            Assert.Equal(t1, GioSua(goc));
            Assert.Equal(1, reg.DocDword(goc, "IncognitoModeAvailability"));
            reg.DatDword(goc, "IncognitoModeAvailability", 2);
            Assert.Equal(2, reg.DocDword(goc, "IncognitoModeAvailability"));
        }
        finally
        {
            try { Microsoft.Win32.Registry.CurrentUser.DeleteSubKeyTree(@"Software\AiiGrowTest", false); } catch { }
        }
    }

    [System.Runtime.InteropServices.DllImport("advapi32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
    private static extern int RegQueryInfoKey(Microsoft.Win32.SafeHandles.SafeRegistryHandle hKey, IntPtr cls, IntPtr lpcClass, IntPtr reserved,
        IntPtr subKeys, IntPtr maxSubKeyLen, IntPtr maxClassLen, IntPtr values, IntPtr maxValueNameLen, IntPtr maxValueLen, IntPtr secDesc, out long lastWrite);

    private static long GioSua(string khoa)
    {
        using var k = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(khoa)!;
        Assert.Equal(0, RegQueryInfoKey(k.Handle, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, out var t));
        return t;
    }

    // ------------------------------------------------------------ app to: dữ liệu y nguyên thì không dựng lại (đã có ThayDoiTests) — danh sách tên màn khoá

    [Fact]
    public void DanhSachTen_TaiLaiYNguyen_CungDau()
    {
        HoSoMay Hs() => new() { MayRieng = false, Con = new() { new() { Id = "a", Ten = "Phát" }, new() { Id = "b", Ten = "Na" } } };
        Assert.Equal(ThayDoi.Bam(Hs(), null), ThayDoi.Bam(Hs(), null));
        var khac = Hs(); khac.Con[1].Ten = "Bin";
        Assert.NotEqual(ThayDoi.Bam(Hs(), null), ThayDoi.Bam(khac, null));
    }
}
