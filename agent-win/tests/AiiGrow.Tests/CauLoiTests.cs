using System.Net;
using System.Text;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#688: câu lỗi .NET / HĐH (tiếng Anh, tên máy chủ), mã lỗi thô, mã HTTP không lọt ra màn Con.</summary>
public class CauLoiTests
{
    private sealed class Hong : HttpMessageHandler
    {
        public Exception? Nem;
        public HttpStatusCode Status = HttpStatusCode.OK;
        public string Reply = "{}";
        public string Kieu = "application/json";
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
            => Nem != null ? throw Nem : Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(Reply, Encoding.UTF8, Kieu) });
    }

    private static Task<string> Goi(Hong h) => DeviceHttp.SendAsync(DeviceHttp.New("https://aiigrow.aiilab.vn", "tk", h), HttpMethod.Get, "/api/device/x", null, default);

    [Fact]
    public async Task MatMang_CauTiengViet_KhongTenMayChu()
    {
        var ex = await Assert.ThrowsAsync<ApiException>(() => Goi(new Hong { Nem = new HttpRequestException("No such host is known. (aiigrow.aiilab.vn:443)") }));
        Assert.Equal(CauLoi.MatMang, ex.Message);
        Assert.IsType<HttpRequestException>(ex.InnerException);   // chi tiết gốc vẫn còn cho log
        Assert.True(ex.LaLoiDuongTruyen);
    }

    [Theory]
    [InlineData(502, "<html>Bad Gateway</html>", "text/html", "Máy chủ AiiGrow đang bận — thử lại sau ít phút nhé.")]
    [InlineData(429, "", "text/plain", "Bấm hơi nhanh — đợi một chút rồi thử lại nhé.")]
    [InlineData(400, """{"error":"ma_het_han"}""", "application/json", "Chưa làm được — thử lại nhé. Vẫn lỗi thì nhờ Ba Mẹ cập nhật AiiGrow.")]
    [InlineData(409, """{"error":"ma_da_dung","message":"Mã này đã dùng rồi"}""", "application/json", "Mã này đã dùng rồi")]
    public async Task MayChuLoi_KhongMaTho(int st, string than, string kieu, string mong)
    {
        var ex = await Assert.ThrowsAsync<ApiException>(() => Goi(new Hong { Status = (HttpStatusCode)st, Reply = than, Kieu = kieu }));
        Assert.Equal(mong, ex.Message);
        Assert.Equal(st, ex.StatusCode);
    }

    [Theory]
    [InlineData("Không kết nối được máy chủ: No such host is known. (aiigrow.aiilab.vn:443)")]
    [InlineData("Chưa nối được dịch vụ AiiGrow: The operation has timed out.")]
    [InlineData("All pipe instances are busy.")]
    [InlineData("token_sai")]
    [InlineData("Access to the path 'C:\\Program Files\\AiiGrow\\x.exe' is denied.")]
    [InlineData("Object reference not set to an instance of an object.")]
    [InlineData(null)]
    public void CauLoiMa_KhongHienCauKyThuat(string? loi)
        => Assert.Equal("Chưa mở được. Thử lại nhé.", ManChonTenView.CauLoiMa(null, null, null, loi));

    [Theory]
    [InlineData("Mã chưa đúng — xem lại trong app Ba Mẹ nhé.")]
    [InlineData("youtube.com chưa có trong danh sách")]
    [InlineData(CauLoi.MatMang)]
    public void CauTiengViet_DiQuaNguyenVen(string cau) => Assert.True(CauLoi.HienDuoc(cau));

    [Fact]
    public void NgoaiLeKhac_CauChung()
    {
        Assert.Equal(CauLoi.LoiTrongMay, CauLoi.Tu(new NullReferenceException()));
        Assert.Equal(CauLoi.LoiTrongMay, CauLoi.Tu(new System.Text.Json.JsonException("'x' is an invalid start of a value.")));
        Assert.Equal("Hôm nay đã đủ", CauLoi.Tu(new ApiException("Hôm nay đã đủ", 409)));
    }
}
