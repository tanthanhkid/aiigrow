using AiiGrow.Tray;

namespace AiiGrow.Tests;

/// <summary>Khay tự chạy lại sau cập nhật: chỉ khi exe ở đường dẫn cũ đã là tệp khác và đã chép xong (đứng yên qua 2 lần kiểm).</summary>
public class TheoDoiExeTests
{
    private static readonly TheoDoiExe.Dau Cu = new(100, new DateTime(2026, 11, 11, 9, 0, 0, DateTimeKind.Utc));
    private static readonly TheoDoiExe.Dau Moi = new(120, new DateTime(2026, 11, 14, 9, 0, 0, DateTimeKind.Utc));

    private static (TheoDoiExe t, Action<TheoDoiExe.Dau?> dat) Tao(TheoDoiExe.Dau? goc)
    {
        var nay = goc;
        return (new TheoDoiExe(@"C:\AiiGrow.Tray.exe", _ => nay), d => nay = d);
    }

    [Fact]
    public void KhongDoi_KhongChayLai()
    {
        var (t, _) = Tao(Cu);
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaKhacGoc());
    }

    [Fact]
    public void BanMoi_ChoDungYenMotNhipRoiMoiChayLai()
    {
        var (t, dat) = Tao(Cu);
        dat(Moi);
        Assert.False(t.DaCoBanMoi());   // vừa thấy đổi: chờ thêm một nhịp
        Assert.True(t.DaCoBanMoi());    // vẫn y vậy: chép xong
        Assert.True(t.DaKhacGoc());
    }

    [Fact]
    public void TepVang_DangChepDo_KhongChayLai()
    {
        var (t, dat) = Tao(Cu);
        dat(null);
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaKhacGoc());
    }

    [Fact]
    public void TepDangLon_ChiChayLaiKhiDungYen()
    {
        var (t, dat) = Tao(Cu);
        dat(Moi with { Dai = 50 });
        Assert.False(t.DaCoBanMoi());
        dat(Moi);
        Assert.False(t.DaCoBanMoi());
        Assert.True(t.DaCoBanMoi());
    }

    [Fact]
    public void CapNhatHong_TraExeCuVe_KhongChayLai()
    {
        var (t, dat) = Tao(Cu);
        dat(Moi);
        Assert.False(t.DaCoBanMoi());
        dat(Cu);
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaCoBanMoi());
    }

    [Fact]
    public void KhongBietDauGoc_KhongDoan()
    {
        var (t, dat) = Tao(null);
        dat(Moi);
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaCoBanMoi());
        Assert.False(t.DaKhacGoc());
    }

    [Fact]
    public void DocDia_TepThat()
    {
        var f = Path.GetTempFileName();
        try
        {
            File.WriteAllText(f, "abc");
            Assert.Equal(3, TheoDoiExe.DocDia(f)!.Value.Dai);
            Assert.Null(TheoDoiExe.DocDia(f + ".khong-co"));
        }
        finally { File.Delete(f); }
    }
}
