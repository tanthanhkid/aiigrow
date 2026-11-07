using System.Net;
using AiiGrow.Core;

namespace AiiGrow.Tests;

// P1 (07/11): vòng «chờ thay đổi» — đọc phản hồi, lùi dần khi lỗi, gọi đúng đường + ver.
public class ChoThayDoiTests
{
    private sealed class Gia : HttpMessageHandler
    {
        public string? Url; public HttpStatusCode Ma = HttpStatusCode.OK; public string Than = """{"phienBanThayDoi":7,"doi":true}""";
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
        {
            Url = r.RequestUri!.PathAndQuery;
            return Task.FromResult(new HttpResponseMessage(Ma) { Content = new StringContent(Than) });
        }
    }

    [Fact]
    public void Doc_DuTruong_VaThieuThiNull()
    {
        var k = ChoThayDoi.Doc("""{"phienBanThayDoi":12,"doi":true}""");
        Assert.Equal(new KetQuaCho(12, true, false), k);
        Assert.True(ChoThayDoi.Doc("""{"phienBanThayDoi":3,"doi":false,"quaTai":true}""")!.QuaTai);
        Assert.Null(ChoThayDoi.Doc("""{"doi":true}"""));
        Assert.Null(ChoThayDoi.Doc("khong phai json"));
    }

    [Theory]
    [InlineData(1, 2)] [InlineData(2, 4)] [InlineData(3, 8)] [InlineData(4, 16)] [InlineData(5, 30)] [InlineData(9, 30)]
    public void ChoLai_LoiThiLuiDan(int loi, int giay) => Assert.Equal(TimeSpan.FromSeconds(giay), ChoThayDoi.ChoLai(loi, null, TimeSpan.Zero));

    [Fact]
    public void ChoLai_DoiThiHoiLaiNgay_KhongDoiMaTraNhanhThiNghi()
    {
        Assert.Equal(TimeSpan.Zero, ChoThayDoi.ChoLai(0, new KetQuaCho(2, true, false), TimeSpan.FromMilliseconds(100)));      // có thay đổi ⇒ vòng lại ngay
        Assert.Equal(TimeSpan.Zero, ChoThayDoi.ChoLai(0, new KetQuaCho(2, false, false), TimeSpan.FromSeconds(25)));           // giữ đủ lâu, hết hạn ⇒ vòng lại ngay
        Assert.Equal(TimeSpan.FromSeconds(5), ChoThayDoi.ChoLai(0, new KetQuaCho(2, false, false), TimeSpan.FromMilliseconds(300)));   // trả nhanh không đổi ⇒ nghỉ 5 giây
        Assert.Equal(TimeSpan.FromSeconds(5), ChoThayDoi.ChoLai(0, new KetQuaCho(2, false, true), TimeSpan.FromSeconds(30)));    // quá tải ⇒ lùi
    }

    [Fact]
    public async Task ChoThayDoiAsync_GoiDungDuongVaVer()
    {
        var h = new Gia();
        using var api = new ApiClient("https://aiigrow.example", "tok", h, timeoutGiay: 40);
        var k = await api.ChoThayDoiAsync(6);
        Assert.Equal("/api/device/cho-thay-doi?ver=6", h.Url);
        Assert.Equal(new KetQuaCho(7, true, false), k);
        await api.ChoThayDoiAsync(null);
        Assert.Equal("/api/device/cho-thay-doi", h.Url);
        h.Ma = HttpStatusCode.NotFound; h.Than = """{"error":"khong_co_duong","message":"x"}""";
        var e = await Assert.ThrowsAsync<ApiException>(() => api.ChoThayDoiAsync(1));
        Assert.Equal(404, e.StatusCode);
    }
}
