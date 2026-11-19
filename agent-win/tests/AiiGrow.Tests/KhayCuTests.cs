using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#418: khay cũ «AiiGrow.Tray.exe.cu-xxxxxxxx» sau cập nhật bị tính là app Con dùng («app mới chờ Ba Mẹ xếp», trừ sao).</summary>
public class KhayCuTests
{
    private const string Cai = @"C:\Program Files\AiiGrow";

    [Theory]
    [InlineData("aiigrow.tray.exe.cu-623a59b6.exe", true)]   // định danh khay báo: ProcessName «AiiGrow.Tray.exe.cu-623a59b6» + «.exe»
    [InlineData("AiiGrow.Tray.exe.cu-623A59B6.exe", true)]
    [InlineData("aiigrow.tray.exe", true)]
    [InlineData("aiigrow.kid.exe", true)]
    [InlineData(" AiiGrow.Tray.exe ", true)]
    [InlineData("aiigrow.tray.exe.cu-623a59b6", false)]      // cùng mẫu máy chủ (luat-app.ts › laAppAiiGrow)
    [InlineData("aiigrow.tray", false)]
    [InlineData("aiigrow.tray.exe.exe", false)]
    [InlineData("aiigrow.setup.exe", false)]
    [InlineData("aiigrow.game.exe", false)]
    [InlineData("aiigrow.tray.exe.cu-.exe", false)]
    [InlineData("aiigrow.tray.exe.cu-roblox.exe", false)]
    [InlineData("robloxplayerbeta.exe", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void NhanDienTenAppCuaAiiGrow(string? id, bool la) => Assert.Equal(la, AppAiiGrow.La(id));

    [Theory]
    [InlineData(@"C:\Program Files\AiiGrow\AiiGrow.Tray.exe", "aiigrow.tray.exe")]
    [InlineData(@"C:\Program Files\AiiGrow\AiiGrow.Tray.exe.cu-623a59b6", "aiigrow.tray.exe.cu-623a59b6.exe")]
    [InlineData(@"C:\Games\Roblox.EXE", "roblox.exe")]
    public void DinhDanhNhuKhayBao(string duong, string id) => Assert.Equal(id, AppAiiGrow.DinhDanh(duong));

    [Fact]
    public void ChiGopKhiTepChayTuThuMucCai()
    {
        var ds = new[]
        {
            new RunningProc(1, @"C:\Program Files\AiiGrow\AiiGrow.Tray.exe.cu-623a59b6"),
            new RunningProc(2, @"C:\Program Files\AiiGrow\AiiGrow.Tray.exe"),
            new RunningProc(3, @"C:\Users\be\Desktop\AiiGrow.Tray.exe.cu-1a2b3c4d"),   // game chép ra Desktop, đổi tên giống khay cũ
            new RunningProc(4, @"C:\Program Files\AiiGrow\sub\AiiGrow.Kid.exe"),
        };
        Assert.True(AppAiiGrow.ChayTuThuMucCai("aiigrow.tray.exe.cu-623a59b6.exe", ds, Cai + @"\"));
        Assert.True(AppAiiGrow.ChayTuThuMucCai("AiiGrow.Tray.exe", ds, Cai));
        Assert.False(AppAiiGrow.ChayTuThuMucCai("aiigrow.tray.exe.cu-1a2b3c4d.exe", ds, Cai));
        Assert.False(AppAiiGrow.ChayTuThuMucCai("aiigrow.kid.exe", ds, Cai));             // thư mục con: không nhận
        Assert.False(AppAiiGrow.ChayTuThuMucCai("aiigrow.tray.exe", ds, ""));
    }

    [Theory]
    [InlineData("AiiGrow.Tray.exe.cu-623a59b6", true)]
    [InlineData("aiigrow.tray.exe.cu-623a59b6", true)]
    [InlineData("AiiGrow.Tray", false)]
    [InlineData("AiiGrow.Service", false)]
    public void NhanDienKhayCu(string ten, bool la) => Assert.Equal(la, MotBanKhay.LaKhayCu(ten));
}
