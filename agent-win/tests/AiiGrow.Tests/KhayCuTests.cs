using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#418: khay cũ «AiiGrow.Tray.exe.cu-xxxxxxxx» sau cập nhật bị tính là app Con dùng («app mới chờ Ba Mẹ xếp», trừ sao).</summary>
public class KhayCuTests
{
    [Theory]
    [InlineData("aiigrow.tray.exe.cu-623a59b6.exe", true)]   // định danh khay báo: ProcessName «AiiGrow.Tray.exe.cu-623a59b6» + «.exe»
    [InlineData("AiiGrow.Tray.exe.cu-623A59B6", true)]
    [InlineData("aiigrow.tray.exe", true)]
    [InlineData("aiigrow.kid.exe", true)]
    [InlineData("aiigrow.service.exe", true)]
    [InlineData("aiigrow.setup.exe.cu-0a1b2c3d.exe", true)]
    [InlineData(" AiiGrow.Tray.exe ", true)]
    [InlineData("aiigrow.game.exe", false)]                   // đổi tên game thành «AiiGrow.*» không thoát đếm phút
    [InlineData("aiigrow.tray.exe.cu-.exe", false)]
    [InlineData("aiigrow.tray.exe.cu-roblox.exe", false)]
    [InlineData("robloxplayerbeta.exe", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void NhanDienAppCuaAiiGrow(string? id, bool la) => Assert.Equal(la, AppAiiGrow.La(id));

    [Fact]
    public void ChuanHoa_KhayCuGopVeKhay_AppKhacGiuNguyen()
    {
        Assert.Equal((AppAiiGrow.Khay, AppAiiGrow.Ten), AppAiiGrow.ChuanHoa("aiigrow.tray.exe.cu-623a59b6.exe", "AiiGrow.Tray.exe.cu-623a59b6"));
        Assert.Equal(("robloxplayerbeta.exe", "Roblox"), AppAiiGrow.ChuanHoa("robloxplayerbeta.exe", "Roblox"));
        Assert.Equal(("", (string?)null), AppAiiGrow.ChuanHoa("", null));   // «không có cửa sổ» (màn hình khoá) giữ rỗng
    }

    [Theory]
    [InlineData("AiiGrow.Tray.exe.cu-623a59b6", true)]
    [InlineData("aiigrow.tray.exe.cu-623a59b6", true)]
    [InlineData("AiiGrow.Tray", false)]
    [InlineData("AiiGrow.Service", false)]
    public void NhanDienKhayCu(string ten, bool la) => Assert.Equal(la, MotBanKhay.LaKhayCu(ten));
}
