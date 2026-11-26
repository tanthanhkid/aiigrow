using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#683: tự cập nhật lỗi một lần không được kẹt bản cũ 24 giờ; «Cập nhật ngay» thử lại được; lỗi báo máy chủ.</summary>
public class LuatThuCapNhatTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 26, 8, 0, 0, TimeSpan.Zero);
    private static readonly Version Cu = new(0, 2, 33);

    [Fact]
    public void DocGhi_TepCuHaiTruong_LaMotLan()
    {
        var cu = LanThuCapNhat.Doc("0.2.34|" + T0.ToString("o"));
        Assert.NotNull(cu);
        Assert.Equal(("0.2.34", 1, false), (cu!.Ban, cu.SoLan, cu.ChanCung));
        Assert.Equal(T0, cu.Luc);
        var moi = new LanThuCapNhat("0.2.34", T0, 3, true);
        Assert.Equal(moi, LanThuCapNhat.Doc(moi.Ghi()));
        Assert.Null(LanThuCapNhat.Doc(""));
        Assert.Null(LanThuCapNhat.Doc("rac"));
    }

    [Fact]
    public void LoiMotLan_ThuLaiSauMotGio_KhongPhai24Gio()
    {
        var lan1 = LuatThuCapNhat.LanMoi(null, "0.2.34", T0);
        Assert.Equal(1, lan1.SoLan);
        Assert.True(LuatThuCapNhat.DangNghi(lan1, "0.2.34", T0.AddMinutes(59)));
        Assert.False(LuatThuCapNhat.DangNghi(lan1, "0.2.34", T0.AddMinutes(61)));     // trước đây: chặn tới T0 + 24 giờ
        var lan2 = LuatThuCapNhat.LanMoi(lan1, "0.2.34", T0.AddHours(1));
        Assert.Equal(2, lan2.SoLan);
        Assert.True(LuatThuCapNhat.DangNghi(lan2, "0.2.34", T0.AddHours(4)));
        Assert.False(LuatThuCapNhat.DangNghi(lan2, "0.2.34", T0.AddHours(5.1)));
        var lan3 = LuatThuCapNhat.LanMoi(lan2, "0.2.34", T0.AddHours(6));
        Assert.True(LuatThuCapNhat.DangNghi(lan3, "0.2.34", T0.AddHours(29)));
        Assert.False(LuatThuCapNhat.DangNghi(lan3, "0.2.34", T0.AddHours(31)));
        // bản khác ⇒ đếm lại từ đầu, không bị nghỉ
        Assert.False(LuatThuCapNhat.DangNghi(lan3, "0.2.35", T0.AddHours(7)));
        Assert.Equal(1, LuatThuCapNhat.LanMoi(lan3, "0.2.35", T0).SoLan);
        // đồng hồ bị lùi ⇒ coi như chưa thử
        Assert.False(LuatThuCapNhat.DangNghi(lan1, "0.2.34", T0.AddMinutes(-5)));
    }

    [Fact]
    public void CapNhatNgay_ChiChoBoCaiLuotTruoc_SaiChuKyVanChan24Gio()
    {
        var lan3 = new LanThuCapNhat("0.2.34", T0, 3, false);
        Assert.True(LuatThuCapNhat.DangNghi(lan3, "0.2.34", T0.AddMinutes(20), epHoi: true));     // bộ cài lượt trước có thể còn chạy
        Assert.False(LuatThuCapNhat.DangNghi(lan3, "0.2.34", T0.AddMinutes(31), epHoi: true));    // trước đây: «Cập nhật ngay» không làm gì 24 giờ
        var saiKy = LuatThuCapNhat.LanMoi(null, "0.2.34", T0, chanCung: true);
        Assert.True(LuatThuCapNhat.DangNghi(saiKy, "0.2.34", T0.AddHours(23), epHoi: true));
        Assert.False(LuatThuCapNhat.DangNghi(saiKy, "0.2.34", T0.AddHours(25), epHoi: true));
    }

    [Fact]
    public void LanTruocHong_KhiBoCaiXongMaVanBanCu()
    {
        var t = new LanThuCapNhat("0.2.34", T0, 1, false);
        Assert.False(LuatThuCapNhat.LanTruocHong(t, "0.2.34", Cu, T0.AddMinutes(10), T0.AddMinutes(-60)));   // bộ cài có thể còn chạy
        Assert.True(LuatThuCapNhat.LanTruocHong(t, "0.2.34", Cu, T0.AddMinutes(10), T0.AddMinutes(5)));      // dịch vụ đã khởi động lại sau lúc giao
        Assert.True(LuatThuCapNhat.LanTruocHong(t, "0.2.34", Cu, T0.AddMinutes(31), T0.AddMinutes(-60)));
        Assert.False(LuatThuCapNhat.LanTruocHong(t, "0.2.34", new Version(0, 2, 34), T0.AddHours(2), T0.AddMinutes(5)));   // đã lên bản mới
        Assert.False(LuatThuCapNhat.LanTruocHong(t, "0.2.35", Cu, T0.AddHours(2), T0.AddMinutes(5)));                        // bản khác
        Assert.False(LuatThuCapNhat.LanTruocHong(t with { ChanCung = true }, "0.2.34", Cu, T0.AddHours(2), T0.AddMinutes(5)));
    }

    [Fact]
    public void SuKienLoi_MoiBanMotMa()
    {
        var a = LuatThuCapNhat.SuKienLoi("0.2.34", Cu, 1, "bo_cai_loi");
        var b = LuatThuCapNhat.SuKienLoi("0.2.34", Cu, 2, "khong_giao_duoc");
        Assert.Equal("cap_nhat_loi", a.Loai);
        Assert.Equal(a.Ma, b.Ma);
        Assert.Equal("0.2.33", a.ChiTiet!["dangChay"]);
        Assert.Equal("bo_cai_loi", a.ChiTiet["lyDo"]);
    }
}
