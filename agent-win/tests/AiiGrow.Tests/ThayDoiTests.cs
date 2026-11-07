using AiiGrow.Core;
using AiiGrow.Tray;

namespace AiiGrow.Tests;

/// <summary>Dấu vân tay dữ liệu app Con: y nguyên ⇒ không dựng lại nội dung; đổi một chữ ⇒ dựng lại.</summary>
public class ThayDoiTests
{
    private static HvTinDs Tin(string nd) => new() { Ds = new() { new HvTin { Noi = nd } } };

    [Fact]
    public void DuLieuGiongNhau_CungDau_DuHaiDoiTuongKhac()
        => Assert.Equal(ThayDoi.Bam(Tin("a"), null, "x"), ThayDoi.Bam(Tin("a"), null, "x"));

    [Fact]
    public void DoiNoiDung_KhacDau()
        => Assert.NotEqual(ThayDoi.Bam(Tin("a")), ThayDoi.Bam(Tin("b")));

    [Fact]
    public void ThuTuVaNullCoNghia()
    {
        Assert.NotEqual(ThayDoi.Bam(Tin("a"), null), ThayDoi.Bam(null, Tin("a")));
        Assert.NotEqual(ThayDoi.Bam(null, null), ThayDoi.Bam((object?)null));
    }
}
