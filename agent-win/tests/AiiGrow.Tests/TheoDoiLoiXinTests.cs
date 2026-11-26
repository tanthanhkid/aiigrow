using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#686: theo dõi trả lời lời xin ở khay — bền qua khay khởi động lại, có hạn, có trần lỗi liên tiếp.</summary>
public class TheoDoiLoiXinTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 26, 9, 0, 0, TimeSpan.FromHours(7));

    [Fact]
    public void VayDangCho_GhiDoc_VaHan()
    {
        var v = new VayDangCho("yc-1", 15, T0, "be-1");
        Assert.Equal(v, VayDangCho.Doc(v.Ghi()));
        Assert.True(v.ConHan(T0.AddHours(23)));
        Assert.False(v.ConHan(T0.AddHours(25)));
        Assert.False(v.ConHan(T0.AddHours(-1)));          // đồng hồ lùi xa ⇒ không tin
        Assert.Null(VayDangCho.Doc(""));
        Assert.Null(VayDangCho.Doc("{rac"));
        Assert.Null(VayDangCho.Doc("""{"id":"","soSao":1}"""));
    }

    [Fact]
    public void DemLoiHoi_ThoiSauToiDaLanLienTiep_HoiDuocThiDemLai()
    {
        var d = new DemLoiHoi(3);
        Assert.False(d.Ghi(false));
        Assert.False(d.Ghi(false));
        Assert.False(d.Ghi(true));                         // hỏi được ⇒ đếm lại
        Assert.False(d.Ghi(false));
        Assert.False(d.Ghi(false));
        Assert.True(d.Ghi(false));
        d.DatLai();
        Assert.Equal(0, d.Lan);
    }
}
