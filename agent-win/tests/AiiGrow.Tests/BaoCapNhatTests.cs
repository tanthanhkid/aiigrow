using AiiGrow.Tray;
using Xunit;

namespace AiiGrow.Tests;

public class BaoCapNhatTests
{
    [Fact] public void KhayBanMoiHonBanDaThay_Bao() => Assert.Equal("0.2.32", BaoCapNhat.CanBao("0.2.32", "0.2.31", null, null));
    [Fact] public void LanDauKhongCoBanTruoc_KhongBao() => Assert.Null(BaoCapNhat.CanBao("0.2.32", null, null, null));
    [Fact] public void CungBan_KhongBao() => Assert.Null(BaoCapNhat.CanBao("0.2.32", "0.2.32", "0.2.32", "0.2.32"));
    [Fact] public void BanVuaCapNhatChuaBao_Bao() => Assert.Equal("0.2.32", BaoCapNhat.CanBao("0.2.32", "0.2.32", "0.2.32", null));
    [Fact] public void BanHaCap_KhongBao() => Assert.Null(BaoCapNhat.CanBao("0.2.30", "0.2.31", null, null));
}
