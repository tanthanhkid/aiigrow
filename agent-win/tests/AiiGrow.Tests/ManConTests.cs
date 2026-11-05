using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

/// <summary>Màn Con Windows theo thiết kế chốt 05/11 (docs/thiet-ke-chot/con-bi-chan, con-het-gio, con-mat-mang).</summary>
public class ManConTests
{
    private static readonly DateTimeOffset Luc = new(2026, 11, 3, 19, 30, 0, TimeSpan.FromHours(7));

    [Fact]
    public void ManChan_AppLa_TuGui_AppBaMeChan_ChiCoNut()
    {
        Assert.True(ManChanView.TuGui("capcut.exe", boiBaMe: false, offline: false));
        Assert.False(ManChanView.TuGui("youtube.exe", boiBaMe: true, offline: false));     // Ba Mẹ đã đặt Chặn ⇒ Con tự bấm xin
        Assert.True(ManChanView.CoNutXin("youtube.exe"));
        Assert.False(ManChanView.TuGui("capcut.exe", false, offline: true));               // mất mạng ⇒ không tự gửi
        Assert.False(ManChanView.TuGui("capcut.exe", false, false, daXin: true));          // đã xin trong phiên khay ⇒ không gửi lặp
        Assert.False(ManChanView.TuGui("cmd.exe", false, false));                          // công cụ Windows
        Assert.False(ManChanView.CoNutXin("taskmgr"));
    }

    [Fact]
    public void ManChan_Chu_DungThietKe()
    {
        Assert.Equal("YouTube chưa được mở", ManChanView.TieuDe("YouTube"));
        Assert.Equal("Xin Ba Mẹ mở YouTube", ManChanView.NutXin("YouTube"));
        Assert.Equal("Con đang dùng được 4 app:", ManChanView.DangDung(4));
        Assert.Equal(("Đã gửi Ba Mẹ duyệt CapCut", "App mới · gửi lúc 19:30"), ManChanView.DaGui("CapCut", false, true, Luc));
        Assert.Equal(("Đã gửi xin mở y8.com", "Trang mới · gửi lúc 19:30"), ManChanView.DaGui("y8.com", true, false, Luc));
        Assert.Equal("Ba Mẹ đã cho CapCut", ManChanView.Duoc("CapCut", false, Luc).Tieu);
        Assert.Equal("Ba Mẹ chưa mở y8.com", ManChanView.ChuaCho("y8.com", true, Luc).Tieu);
        Assert.Equal("Chờ có mạng (2)", ManChanView.ChoCoMang(2));
    }

    [Fact]
    public void ManKhoa_HetGio_DemNguoc_RoiHetGio()
    {
        var dem = ManKhoaView.For(LockReasons.HetGio, 45, "Bảo Anh", 30, 60, null, doiSaoDuoc: true, offline: false);
        Assert.True(dem.DemNguoc);
        Assert.Equal("Sắp hết giờ chơi", dem.Tieu);
        Assert.Equal("Con có 30 sao", dem.SaoDong);
        Assert.Equal(new[] { ManKhoaView.DoiSao, ManKhoaView.XinThemGio, ManKhoaView.BaMeDungMay }, dem.Nut.Select(n => n.Ma));

        var het = ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", 30, 60, null, true, false);
        Assert.False(het.DemNguoc);
        Assert.Equal("Hết giờ chơi hôm nay", het.Tieu);
        Assert.Equal("Con đã chơi đủ 60 / 60 phút. Giỏi lắm!", het.Phu);
        Assert.Equal(new[] { ManKhoaView.DoiSao, ManKhoaView.XinThemGio, ManKhoaView.XinNgoaiLe, ManKhoaView.NhanBaMe, ManKhoaView.BaMeDungMay }, het.Nut.Select(n => n.Ma));
    }

    [Fact]
    public void ManKhoa_KhongDuSao_HoacMayChuKhongCho_KhongCoNutDoiSao()
    {
        Assert.DoesNotContain(ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", 5, 60, null, true, false).Nut, n => n.Ma == ManKhoaView.DoiSao);
        Assert.DoesNotContain(ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", 30, 60, null, false, false).Nut, n => n.Ma == ManKhoaView.DoiSao);
        // máy chủ chưa gửi số sao (S1) ⇒ vẫn cho đổi nếu máy chủ cho đổi, không ghi số sao
        var chuaBiet = ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", null, null, null, true, false);
        Assert.Contains(chuaBiet.Nut, n => n.Ma == ManKhoaView.DoiSao);
        Assert.Null(chuaBiet.SaoDong);
        Assert.Equal("Con đã chơi đủ giờ hôm nay. Giỏi lắm!", chuaBiet.Phu);
    }

    [Theory]
    [InlineData(LockReasons.Ngu, "Đến giờ ngủ rồi")]
    [InlineData(LockReasons.Khoa, "Ba Mẹ đang khoá máy")]
    public void ManKhoa_GioNgu_BaMeKhoa_ChiXinNgoaiLe_KhongThemGio(string lyDo, string tieu)
    {
        var m = ManKhoaView.For(lyDo, null, "Bảo Anh", 30, 60, "6:30", true, false);
        Assert.Equal(tieu, m.Tieu);
        Assert.Equal(new[] { ManKhoaView.XinNgoaiLe, ManKhoaView.NhanBaMe, ManKhoaView.BaMeDungMay }, m.Nut.Select(n => n.Ma));
        Assert.DoesNotContain(m.Nut, n => n.Ma is ManKhoaView.DoiSao or ManKhoaView.XinThemGio);
    }

    [Fact]
    public void ManKhoa_GioNgu_GioMoLai()
    {
        Assert.Equal("Máy mở lại lúc 6:30 sáng mai.", ManKhoaView.For(LockReasons.Ngu, null, "Bảo Anh", null, null, "6:30", false, false).Phu);
        Assert.Equal("Máy mở lại sáng mai.", ManKhoaView.For(LockReasons.Ngu, null, "Bảo Anh", null, null, null, false, false).Phu);
        Assert.Equal("Chúc Bảo Anh ngủ ngon!", ManKhoaView.For(LockReasons.Ngu, null, "Bảo Anh", null, null, null, false, false).Phu2);
    }

    [Fact]
    public void ManKhoa_MatMang_VanGiuLuat_LoiXinLuuLai()
    {
        var m = ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", 30, 60, null, true, offline: true);
        Assert.True(m.MatMang);
        Assert.Equal("Hết giờ chơi hôm nay", m.Tieu);
        Assert.Equal(new[] { ManKhoaView.XinThemGio }, m.Nut.Select(n => n.Ma));      // không đổi sao (cần máy chủ)
        Assert.Equal(new[] { ManKhoaView.XinNgoaiLe }, ManKhoaView.For(LockReasons.Ngu, null, "Bảo Anh", 30, 60, null, true, true).Nut.Select(n => n.Ma));
    }

    [Fact]
    public void NgoaiLe_Phut_Kep_Va_LuaChon()
    {
        Assert.Equal(20, NgoaiLeView.Tang(15));
        Assert.Equal(10, NgoaiLeView.Giam(15));
        Assert.Equal(NgoaiLeView.PhutMin, NgoaiLeView.Giam(NgoaiLeView.PhutMin));
        Assert.Equal(NgoaiLeView.PhutMax, NgoaiLeView.Tang(NgoaiLeView.PhutMax));
        Assert.Equal("Gửi Ba Mẹ: mở 15 phút", NgoaiLeView.NutGui(15));
        var ds = NgoaiLeView.LuaChon(new[] { "hocvoiairob.exe", "tudien.exe", "khac.exe" });
        Assert.Equal(3, ds.Count);                                   // tối đa 2 app + «Cả máy»
        Assert.Equal((NgoaiLeView.CaMay, "Cả máy"), ds[^1]);
        Assert.Single(NgoaiLeView.LuaChon(null));
        Assert.Equal("Chỉ mở Từ điển, đến 21:45", NgoaiLeView.DuocChiMo("tudien.exe", "Từ điển", Luc.AddMinutes(135)));
        Assert.Equal("Mở cả máy, đến 21:45", NgoaiLeView.DuocChiMo(NgoaiLeView.CaMay, "Cả máy", Luc.AddMinutes(135)));
    }

    [Fact]
    public void NgoaiLe_LyDo_TuVietThang_TrongCoCauMacDinh()
    {
        Assert.Equal("Con chưa xong bài", NgoaiLeView.LyDo("Con chưa xong bài", null));
        Assert.Equal("Thi vẽ", NgoaiLeView.LyDo("Mai nộp cô", " Thi vẽ "));
        Assert.Equal("Con xin Ba Mẹ mở ngoại lệ", NgoaiLeView.LyDo(null, " "));
        Assert.Equal(100, NgoaiLeView.LyDo(new string('a', 300), null).Length);
    }

    [Fact]
    public void NhacGio_SaoChiHienKhiBiet()
    {
        Assert.Equal("Lưu bài đang làm nhé · con có 30 sao", NhacGioView.Phu(30));
        Assert.Equal("Lưu bài đang làm nhé", NhacGioView.Phu(null));
    }

    [Fact]
    public async Task HangXinCho_ThemTrung_Thay_GuiDungKhiMatMang()
    {
        var h = new HangXinCho();
        h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "capcut.exe", Luc = DateTimeOffset.Now });
        h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "CAPCUT.EXE", Luc = DateTimeOffset.Now });   // Con bấm lại ⇒ không thành hai lời xin
        h.Them(new LoiXinCho { Loai = LoaiXin.ThemGio, Phut = 20 });
        h.Them(new LoiXinCho { Loai = LoaiXin.NgoaiLe, Muc = "ca_may", Phut = 15 });
        Assert.Equal(3, h.Items.Count);

        int goi = 0;
        var xong = await h.GuiAsync(x => Task.FromResult(++goi switch { 1 => KetQuaGuiXin.DaGui, 2 => KetQuaGuiXin.LoiMang, _ => KetQuaGuiXin.DaGui }));
        Assert.Single(xong);                    // lời xin thứ 2 lỗi mạng ⇒ dừng, giữ lại 2 lời xin sau
        Assert.Equal(2, h.Items.Count);
        Assert.Equal(LoaiXin.ThemGio, h.Items[0].Loai);

        xong = await h.GuiAsync(x => Task.FromResult(KetQuaGuiXin.Bo));   // máy chủ từ chối ⇒ bỏ hết, không gửi lại
        Assert.Equal(2, xong.Count);
        Assert.Empty(h.Items);
    }

    [Fact]
    public void HangXinCho_GioiHan_VaPhanLoaiLoi()
    {
        var h = new HangXinCho();
        for (int i = 0; i < HangXinCho.ToiDa + 5; i++) h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = $"app{i}.exe" });
        Assert.Equal(HangXinCho.ToiDa, h.Items.Count);
        Assert.Equal("app5.exe", h.Items[0].Muc);
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new ApiException("mạng")));
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new ApiException("5xx", 503)));
        Assert.Equal(KetQuaGuiXin.Bo, HangXinCho.PhanLoai(new ApiException("nhiều", 429, code: "qua_nhieu_cho")));
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new TaskCanceledException()));
    }
}
