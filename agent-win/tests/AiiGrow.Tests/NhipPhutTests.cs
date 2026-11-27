using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#744 — đếm phút «Tính phút» ở dịch vụ: mỗi phút tròn đồng bộ ngay, hết sao chặn trong phút đó, nhắc còn 5 phút, giới hạn ngày / nghỉ.
/// Mọi mốc giờ truyền vào (không đọc đồng hồ thật).</summary>
public class NhipPhutTests
{
    private static Policy Luat(double conPhut)
        => PolicyParser.Parse("{\"mode\":\"hoc\",\"locked\":false,\"allowedApps\":[\"explorer.exe\",\"roblox.exe\"],\"quyConPhut\":" + conPhut.ToString(System.Globalization.CultureInfo.InvariantCulture)
            + ",\"appTinhGio\":[\"roblox.exe\"],\"sao\":" + (int)conPhut + "}");

    /// <summary>Mô phỏng vòng lặp dịch vụ: mỗi 5 giây cộng 5 giây «Tính phút»; trả (số lần đồng bộ ngay, giây lúc app bị bỏ khỏi danh sách được phép hoặc -1).</summary>
    private static (int DongBo, int GiayChan) ChayDen(Policy p, int tongPhut, bool tinhPhut = true)
    {
        var nhip = new NhipPhut();
        int dongBo = 0, giayChan = -1, daDem = 0;
        for (int t = 5; t <= tongPhut * 60; t += 5)
        {
            if (giayChan >= 0) break;                      // đã chặn: app «Tính phút» không chạy nữa
            if (!tinhPhut) continue;
            daDem += 5;
            if (nhip.Cong(5)) dongBo++;
            if (!QuyTaiCho.ApDung(p, daDem).AllowedApps.Contains("roblox.exe")) giayChan = t;
        }
        return (dongBo, giayChan);
    }

    [Fact]
    public void MoiPhutTron_DongBoNgay()
    {
        var n = new NhipPhut();
        for (int i = 0; i < 11; i++) Assert.False(n.Cong(5));   // 55 giây
        Assert.True(n.Cong(5));                                  // giây thứ 60
        for (int i = 0; i < 11; i++) Assert.False(n.Cong(5));
        Assert.True(n.Cong(5));
        Assert.False(n.Cong(0));
        Assert.False(n.Cong(-3));
    }

    [Fact]
    public void XemSauPhut_SauLanDongBo_MotLanMoiPhut()
    {
        var (dongBo, _) = ChayDen(Luat(60), 6);
        Assert.Equal(6, dongBo);
    }

    [Fact]
    public void HetSao_ChanTrongDungPhutDo()
    {
        var p = Luat(9);
        var (_, giayChan) = ChayDen(p, 20);
        Assert.Equal(9 * 60, giayChan);                         // đúng giây thứ 540 — không chờ nhịp đồng bộ sau
        Assert.Equal(0, QuyTaiCho.ConPhut(p, 9 * 60));
        Assert.True(QuyTaiCho.ConPhut(p, 9 * 60 - 5) > 0);
    }

    [Fact]
    public void GioiHan60PhutMotNgay_MayChuKepSao_ChanSauPhutThu60()
    {
        // máy chủ đã kẹp quyConPhut theo «tối đa 60 phút / ngày»: còn 60 phút ⇒ chặn đúng ở phút 60, không sớm hơn
        var (dongBo, giayChan) = ChayDen(Luat(60), 90);
        Assert.Equal(60 * 60, giayChan);
        Assert.Equal(60, dongBo);                               // 60 lần đồng bộ, lần cuối báo máy chủ phút thứ 60 ⇒ máy chủ ghi «đủ 60 phút»
    }

    [Fact]
    public void NghiSau30PhutChoiLien_LuotKepLaConLuot_ChanOPhutThu30()
    {
        // máy chủ kẹp quyConPhut = conLuot (30): hết lượt ⇒ chặn ngay ở phút 30 rồi máy chủ trả «đang nghỉ» ở lần đồng bộ ngay phút đó
        var (dongBo, giayChan) = ChayDen(Luat(30), 45);
        Assert.Equal(30 * 60, giayChan);
        Assert.Equal(30, dongBo);
    }

    [Fact]
    public void KhongPhaiAppTinhPhut_KhongDongBoTheoPhut()
    {
        var (dongBo, giayChan) = ChayDen(Luat(5), 10, tinhPhut: false);
        Assert.Equal(0, dongBo);
        Assert.Equal(-1, giayChan);
    }

    [Fact]
    public void NhacConNamPhut_ChiKhiDangChoiTinhPhut()
    {
        Assert.False(NhacSaoView.NenNhac(5.5, true, false));
        Assert.True(NhacSaoView.NenNhac(5.0, true, false));
        Assert.True(NhacSaoView.NenNhac(4.2, true, false));
        Assert.False(NhacSaoView.NenNhac(4.2, true, true));     // đã nhắc rồi
        Assert.False(NhacSaoView.NenNhac(4.2, false, false));   // không chơi app «Tính phút»
    }

    [Fact]
    public void Web_TrinhDuyetOTienCanh_GuiMoiPhut_KhongThiNamPhut()
    {
        var tab = new TabDangXem();
        double truoc = 0;
        tab.Ghi("2026-11-28", "chrome.exe", "YouTube - Google Chrome", 60);
        Assert.Equal(NhipWeb.Nhanh, NhipWeb.Chon(truoc, tab.TongGiayGhi));
        truoc = tab.TongGiayGhi;
        Assert.Equal(NhipWeb.Cham, NhipWeb.Chon(truoc, tab.TongGiayGhi));   // phút sau không ghi gì (thu nhỏ / đóng trình duyệt)
        tab.Ghi("2026-11-28", "notepad.exe", "x", 60);                       // không phải trình duyệt ⇒ không tăng
        Assert.Equal(truoc, tab.TongGiayGhi);
    }
}
