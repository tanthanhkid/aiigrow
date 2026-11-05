using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Bộ cài (thiết kế chốt 05/11 con-cai-win): lỗi ghép ⇒ đúng màn (mã sai / mã hết hạn / mất mạng / khác) + chuẩn hoá mã 6 số.</summary>
public class LoiGhepTests
{
    [Theory]
    [InlineData(404, "ma_sai", LoaiLoiGhep.MaSai)]
    [InlineData(404, null, LoaiLoiGhep.MaSai)]
    [InlineData(410, "ma_het_han", LoaiLoiGhep.HetHan)]
    [InlineData(409, "ma_da_dung", LoaiLoiGhep.HetHan)]
    [InlineData(410, null, LoaiLoiGhep.HetHan)]
    [InlineData(409, "sai_nen_tang", LoaiLoiGhep.Khac)]
    [InlineData(502, null, LoaiLoiGhep.MatMang)]
    public void MaMayChu(int st, string? code, LoaiLoiGhep mong)
        => Assert.Equal(mong, LoiGhep.Phan(new ApiException("x", st, null, code)));

    [Fact]
    public void KhongToiMayChu_LaMatMang()
    {
        Assert.Equal(LoaiLoiGhep.MatMang, LoiGhep.Phan(new ApiException("Không kết nối được máy chủ", null, new HttpRequestException("refused"))));
        Assert.Equal(LoaiLoiGhep.MatMang, LoiGhep.Phan(new HttpRequestException("dns")));
        Assert.Equal(LoaiLoiGhep.MatMang, LoiGhep.Phan(new ApiException("Máy chủ không trả lời kịp", null, new TimeoutException())));
        // lỗi không mã của chính client (thân lạ, thiếu token, gói hỏng) ⇒ không bảo «kiểm Wi-Fi»
        Assert.Equal(LoaiLoiGhep.Khac, LoiGhep.Phan(new ApiException("Máy chủ không trả token")));
        Assert.Equal(LoaiLoiGhep.Khac, LoiGhep.Phan(new ApiException("Máy chủ trả dữ liệu không đúng định dạng", null, new System.Text.Json.JsonException())));
        Assert.Equal(LoaiLoiGhep.MatMang, LoiGhep.Phan(new InvalidOperationException("bọc", new TaskCanceledException())));
    }

    [Fact]
    public void DaGhep_MaKhongConLienQuan()
    {
        Assert.Equal(LoaiLoiGhep.Khac, LoiGhep.Phan(new ApiException("x", 404, null, "ma_sai"), daGhep: true));
        Assert.Equal(LoaiLoiGhep.Khac, LoiGhep.Phan(new InvalidOperationException("Không cài được dịch vụ"), daGhep: true));
        Assert.Equal(LoaiLoiGhep.MatMang, LoiGhep.Phan(new HttpRequestException("x"), daGhep: true));
    }

    [Theory]
    [InlineData("482 017", "482017", null)]
    [InlineData("48-20-17x9", "482017", null)]
    [InlineData("48201", "48201", "Còn thiếu 1 số. Mã có đúng 6 số.")]
    [InlineData("", "", "Gõ 6 số trên điện thoại Ba Mẹ nhé.")]
    public void ChuanMa(string vao, string ma, string? thieu)
    {
        Assert.Equal(ma, LoiGhep.ChuanMa(vao));
        Assert.Equal(thieu, LoiGhep.CauThieu(vao));
    }

    [Fact]
    public void HienMa() => Assert.Equal("482 017", LoiGhep.Hien("482017"));
}
