using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

/// <summary>#307 «Xin thêm …» (Bàn con-xin them-bxw40sw9 → them-6tn8aozf → them-359v1pre / them-vkdikuo0).</summary>
public class XinThemTests
{
    [Fact]
    public void Chu_TheoBan()
    {
        Assert.Equal("Xin thêm YouTube", XinThemView.Tieu("YouTube"));
        Assert.Equal("YouTube chưa có trong danh sách của con", XinThemView.Phu("YouTube"));
        Assert.Equal("Xin Ba Mẹ thêm YouTube", XinThemView.Nut("YouTube"));
        Assert.Equal("Con xin thêm YouTube", XinThemView.ConXin("YouTube"));
        Assert.Equal("Xin thêm YouTube", XinThemView.DongDaLuu("YouTube"));
        Assert.Equal("Mẹ Lan đã thêm!", XinThemView.DaThem("Mẹ Lan"));
        Assert.Equal("Ba Mẹ đã thêm!", XinThemView.DaThem(null));
        Assert.Equal("Ba Mẹ chưa thêm YouTube", XinThemView.ChuaThem("YouTube"));
    }

    [Fact]
    public void ChoiTiep_VaNhom_TheoSoSao()
    {
        Assert.Equal("Chơi tiếp · còn 18 sao = 18 phút", XinThemView.ChoiTiep(18.4));
        Assert.Equal("Về Hôm nay", XinThemView.ChoiTiep(0));
        Assert.Equal("Tính phút · 18 sao = 18 phút", XinThemView.NhomDaThem(false, 18));
        Assert.Equal("Không tính phút · không trừ sao", XinThemView.NhomDaThem(true, 18));
        Assert.Equal("Con còn 0 sao = 0 phút chơi", XinThemView.ConPhut(null));
    }

    [Fact]
    public void LoiChuaThem_GhepLoiNhanBaMe()
    {
        Assert.Equal("Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé!", XinThemView.LoiChuaThem("YouTube", null));
        Assert.Equal("Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé! Con xem YouTube Kids trước nha.",
            XinThemView.LoiChuaThem("YouTube", "  Con xem YouTube Kids trước nha. "));
    }
}
