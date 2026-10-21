using AiiGrow.Core;

namespace AiiGrow.Tests;

public class MaOfflineTests
{
    // Mốc cố định dùng chung với server/lib/ma-offline.test.ts (counter 5666666).
    private static readonly DateTimeOffset Moc = DateTimeOffset.FromUnixTimeMilliseconds(1_700_000_000_000);

    [Fact]
    public void Vector_TrungVoiMayChu()
    {
        // Máy chủ (TS) cho ra "781646" với cùng bí mật + mốc → agent (C#) PHẢI ra đúng số này.
        Assert.Equal("781646", MaOffline.Ma("test-secret-aiigrow", Moc));
    }

    [Fact]
    public void Kiem_DungMaCuaChinhMoc()
    {
        const string s = "bi-mat-mot-may-nao-do";
        Assert.True(MaOffline.Kiem(s, MaOffline.Ma(s, Moc), Moc));
    }

    [Fact]
    public void Kiem_DungSai_MaBuocTruocVanChapNhan()
    {
        const string s = "bi-mat-mot-may-nao-do";
        var sau = Moc.AddSeconds(MaOffline.BuocGiay);
        Assert.True(MaOffline.Kiem(s, MaOffline.Ma(s, Moc), sau));
    }

    [Fact]
    public void Kiem_Cach2Buoc_HetHieuLuc()
    {
        const string s = "bi-mat-mot-may-nao-do";
        var xa = Moc.AddSeconds(MaOffline.BuocGiay * 3);
        Assert.False(MaOffline.Kiem(s, MaOffline.Ma(s, Moc), xa));
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("12345")]
    [InlineData("1234567")]
    public void Kiem_MaSaiDinhDang_Tra_False(string ma)
        => Assert.False(MaOffline.Kiem("bi-mat", ma, Moc));

    [Fact]
    public void Kiem_BiMatRong_Tra_False()
        => Assert.False(MaOffline.Kiem(null, "781646", Moc));
}
