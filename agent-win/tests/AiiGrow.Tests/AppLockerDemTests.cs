using AiiGrow.Core;

namespace AiiGrow.Tests;

// #537: tệp đệm AppLocker cũ làm nút Start khoá dù chính sách rỗng — chỉ dọn khi chính sách KHÔNG còn luật nào.
public class AppLockerDemTests
{
    private const string Rong = "<AppLockerPolicy Version=\"1\" />";
    private const string RongCoNhom = "<AppLockerPolicy Version=\"1\"><RuleCollection Type=\"Exe\" EnforcementMode=\"NotConfigured\" /><RuleCollection Type=\"Appx\" EnforcementMode=\"NotConfigured\" /></AppLockerPolicy>";
    private const string LuatQuanTri = "<AppLockerPolicy Version=\"1\"><RuleCollection Type=\"Exe\" EnforcementMode=\"Enabled\"><FilePathRule Id=\"a\" Name=\"IT chặn\" UserOrGroupSid=\"S-1-1-0\" Action=\"Deny\"><Conditions><FilePathCondition Path=\"*\" /></Conditions></FilePathRule></RuleCollection></AppLockerPolicy>";
    private const string BatKhongLuat = "<AppLockerPolicy Version=\"1\"><RuleCollection Type=\"Exe\" EnforcementMode=\"Enabled\" /></AppLockerPolicy>";

    private static string TmpDir(params (string ten, int byteN)[] tep)
    {
        var d = Path.Combine(Path.GetTempPath(), "aii-dem-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        foreach (var (ten, n) in tep) File.WriteAllBytes(Path.Combine(d, ten), new byte[n]);
        return d;
    }

    [Theory]
    [InlineData(Rong, true)]
    [InlineData(RongCoNhom, true)]
    [InlineData(LuatQuanTri, false)]
    [InlineData(BatKhongLuat, false)]   // Exe đang bật: không phải việc của mình
    [InlineData("", false)]
    [InlineData("không phải xml", false)]
    [InlineData("<Khac />", false)]
    public void ChinhSachRong_ChiKhiKhongConLuatVaKhongNhomNaoBat(string xml, bool mong) => Assert.Equal(mong, AppLockerDem.ChinhSachRong(xml));

    [Fact]
    public void ChinhSachRong_BoQuaPhanMoRong()
    {
        var x = "<AppLockerPolicy Version=\"1\"><RuleCollectionExtensions><ThresholdExtensions /></RuleCollectionExtensions></AppLockerPolicy>";
        Assert.True(AppLockerDem.ChinhSachRong(x));
    }

    [Fact]
    public void CanDon_ChiKhiChinhSachRongVaDemConTep_DocLoiThiKhongDung()
    {
        var co = TmpDir(("Exe.AppLocker", 3220));
        var khong = TmpDir();
        try
        {
            Assert.True(AppLockerDem.CanDon(false, Rong, co));
            Assert.False(AppLockerDem.CanDon(false, Rong, khong));                 // đệm sạch
            File.WriteAllText(Path.Combine(khong, "AppCache.dat"), "x");
            Assert.False(AppLockerDem.CanDon(false, Rong, khong));                 // chỉ có tệp khác của Windows (máy khoẻ) ⇒ không đụng
            Assert.False(AppLockerDem.CanDon(false, Rong, co + "-khong-co"));      // không có thư mục (Win Home)
            Assert.False(AppLockerDem.CanDon(false, LuatQuanTri, co));             // quản trị có luật ⇒ không đụng
            Assert.False(AppLockerDem.CanDon(true, Rong, co));                     // đọc chính sách lỗi ⇒ không đụng
            Assert.False(AppLockerDem.CanDon(false, null, co));
        }
        finally { Directory.Delete(co, true); Directory.Delete(khong, true); }
    }

    [Fact]
    public void Xoa_ChiXoaTepDemChinhSach_GiuTepKhac()
    {
        var d = TmpDir(("Exe.AppLocker", 3220), ("Appx.AppLocker", 10), ("AppCache.dat", 5));
        try
        {
            Assert.Equal(2, AppLockerDem.Xoa(d));
            Assert.True(File.Exists(Path.Combine(d, "AppCache.dat")));   // tệp khác của Windows không đụng
            Assert.Equal(0, AppLockerDem.SoTepDem(d));
            Assert.Equal(0, AppLockerDem.Xoa(d));   // chạy lại an toàn
        }
        finally { Directory.Delete(d, true); }
    }

    // Bộ gỡ từ xa/tại máy: tác vụ dọn tách rời xoá đệm sau khi luật của mình đã sạch, chỉ khi chính sách rỗng hoàn toàn.
    [Fact]
    public void KichBanDon_DonDemChiSauKhiSachLuatVaChiKhiChinhSachRong()
    {
        var k = SystemCleanup.KichBanDonTachRoi("AiiGrowService", @"C:\P", @"C:\D", AppsEntry.Key);
        Assert.Contains("function Remove-AiiAppLockerDem", k);
        Assert.Contains(@"System32\AppLocker", k);
        Assert.Contains("Get-AppLockerPolicy -Effective -Xml", k);
        Assert.Contains("-Filter '*.AppLocker'", k);
        Assert.Contains("EnforcementMode') -in 'Enabled','AuditOnly'", k);
        Assert.True(k.IndexOf("$luatSach=$false") < k.IndexOf("if($luatSach){ Remove-AiiAppLockerDem }"));
        Assert.True(k.IndexOf("if($luatSach){ Remove-AiiAppLockerDem }") < k.IndexOf("Remove-Item -LiteralPath 'HKLM:"));
        // không chiếm quyền thư mục hệ thống
        Assert.DoesNotContain("takeown", k);
    }
}
